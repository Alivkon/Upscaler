import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import multer from 'multer';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUTS_DIR = path.join(__dirname, 'outputs');
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (_req, file, done) => done(null, ACCEPTED_TYPES.has(file.mimetype))
});

await fs.mkdir(OUTPUTS_DIR, { recursive: true });
app.use(express.static(path.join(__dirname, 'public')));
app.use('/outputs', express.static(OUTPUTS_DIR, { fallthrough: false }));

const MODELS = {
  real_esrgan: {
    title: 'Real-ESRGAN',
    endpoint: 'models/nightmareai/real-esrgan/predictions',
    input: (image, _prompt, scale = 2) => ({ image, scale, face_enhance: false })
  },
  nano_banana: {
    title: 'Nano Banana',
    endpoint: 'models/google/nano-banana/predictions',
    requiresPrompt: true,
    input: (image, prompt) => ({ prompt, image_input: [image], aspect_ratio: 'match_input_image', output_format: 'jpg' })
  },
  nano_banana_pro: {
    title: 'Nano Banana Pro',
    endpoint: 'models/google/nano-banana-pro/predictions',
    requiresPrompt: true,
    input: (image, prompt, resolution) => ({ prompt, image_input: [image], aspect_ratio: 'match_input_image', output_format: 'jpg', ...(resolution ? { resolution } : {}) })
  }
};

function apiHeaders() {
  if (!process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_TOKEN === 'r8_replace_with_your_replicate_api_token') {
    throw new Error('Добавьте действительный REPLICATE_API_TOKEN в файл .env.');
  }
  return { Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}` };
}

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.code >= 400 || data.success === false) {
    throw new Error(data.detail || data.error || data.msg || data.message || `Replicate вернул HTTP ${response.status}`);
  }
  return data;
}

function asDataUrl(file) {
  return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
}

async function createPrediction(model, image, prompt, resolution) {
  const body = { input: model.input(image, prompt, resolution) };
  const endpoint = model.endpoint || 'predictions';
  if (model.version) body.version = model.version;
  const response = await fetch(`https://api.replicate.com/v1/${endpoint}`, {
    method: 'POST',
    headers: { ...apiHeaders(), 'Content-Type': 'application/json', Prefer: 'wait=60', 'Cancel-After': '10m' },
    body: JSON.stringify(body)
  });
  const data = await parseResponse(response);
  if (!data.id) throw new Error('Replicate не вернул идентификатор задачи.');
  return data;
}

async function getTargetLongestSide(file, outputSize) {
  const metadata = await sharp(file.buffer).metadata();
  const longestSide = Math.max(metadata.width || 0, metadata.height || 0);
  if (!longestSide) throw new Error('Не удалось определить размеры исходного изображения.');
  if (outputSize === 'x2') return longestSide * 2;
  if (outputSize === 'x4') return longestSide * 4;
  return outputSize === '1k' ? 1024 : outputSize === '2k' ? 2048 : 4096;
}

async function getRealEsrganOptions(file, outputSize) {
  if (outputSize === 'x2') return { scale: 2, targetLongestSide: null };
  if (outputSize === 'x4') return { scale: 4, targetLongestSide: null };
  const targetLongestSide = await getTargetLongestSide(file, outputSize);
  const metadata = await sharp(file.buffer).metadata();
  const longestSide = Math.max(metadata.width || 0, metadata.height || 0);
  return { scale: Math.min(10, Math.max(2, Math.ceil(targetLongestSide / longestSide))), targetLongestSide };
}

async function waitForResult(prediction) {
  const deadline = Date.now() + 10 * 60 * 1000;
  let task = prediction;
  while (Date.now() < deadline) {
    if (task.status === 'succeeded') {
      const url = Array.isArray(task.output) ? task.output[0] : task.output;
      if (!url) throw new Error('Задача завершилась, но ссылка на изображение отсутствует.');
      return url;
    }
    if (task.status === 'failed' || task.status === 'canceled') throw new Error(task.error || 'Апскейлинг не выполнен сервисом Replicate.');
    await new Promise(resolve => setTimeout(resolve, 2000));
    const response = await fetch(task.urls?.get || `https://api.replicate.com/v1/predictions/${task.id}`, { headers: apiHeaders() });
    task = await parseResponse(response);
  }
  throw new Error('Время ожидания результата истекло. Попробуйте ещё раз.');
}

async function saveResult(sourceUrl, originalName, mimeType, targetLongestSide = null, outputSize = 'x2') {
  const response = await fetch(sourceUrl, { headers: apiHeaders() });
  if (!response.ok) throw new Error('Не удалось скачать готовое изображение с Replicate.');
  const contentType = response.headers.get('content-type') || mimeType;
  if (!contentType.startsWith('image/')) throw new Error('Replicate вернул файл, который не является изображением.');
  const extension = contentType.includes('png') ? '.png' : contentType.includes('webp') ? '.webp' : '.jpg';
  const baseName = path.basename(originalName, path.extname(originalName)).replace(/[^a-zA-Z0-9_-]/g, '_') || 'photo';
  const filename = `${baseName}-real-esrgan-${outputSize}-${Date.now()}${extension}`;
  let output = Buffer.from(await response.arrayBuffer());
  if (targetLongestSide) output = await sharp(output).resize(targetLongestSide, targetLongestSide, { fit: 'inside' }).toBuffer();
  await fs.writeFile(path.join(OUTPUTS_DIR, filename), output);
  return filename;
}

app.post('/api/upscale', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Выберите JPG, PNG или WebP размером до 10 МБ.' });
    const model = MODELS[req.body.model] || MODELS.real_esrgan;
    const selectedOutputSize = model === MODELS.real_esrgan ? req.body.output_size : req.body.portrait_output_size;
    const outputSize = ['x2', 'x4', '1k', '2k', '4k'].includes(selectedOutputSize) ? selectedOutputSize : 'x2';
    const prompt = typeof req.body.prompt === 'string' ? req.body.prompt.trim() : '';
    if (model.requiresPrompt && !prompt) return res.status(400).json({ error: 'Введите инструкцию для обработки портрета.' });
    const realEsrganOptions = model === MODELS.real_esrgan ? await getRealEsrganOptions(req.file, outputSize) : null;
    const targetLongestSide = realEsrganOptions?.targetLongestSide ?? await getTargetLongestSide(req.file, outputSize);
    const nativeResolution = model === MODELS.nano_banana_pro && ['1k', '2k', '4k'].includes(outputSize) ? outputSize.toUpperCase() : undefined;
    const prediction = await createPrediction(model, asDataUrl(req.file), prompt, realEsrganOptions?.scale ?? nativeResolution);
    const resultUrl = await waitForResult(prediction);
    const filename = await saveResult(resultUrl, req.file.originalname, req.file.mimetype, targetLongestSide, outputSize);
    res.json({ filename, url: `/outputs/${encodeURIComponent(filename)}`, taskId: prediction.id, model: model.title });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Не удалось обработать изображение.' });
  }
});

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError || error?.message === 'Only images are allowed') {
    return res.status(400).json({ error: 'Допустимы JPG, PNG и WebP до 10 МБ.' });
  }
  res.status(500).json({ error: 'Внутренняя ошибка сервера.' });
});

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '127.0.0.1';
app.listen(port, host, () => console.log(`Replicate Image Upscaler: http://${host}:${port}`));
