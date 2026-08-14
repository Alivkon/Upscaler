import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import multer from 'multer';

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
  topaz: {
    title: 'Topaz Image Upscale',
    endpoint: 'models/topazlabs/image-upscale/predictions',
    input: image => ({ image, enhance_model: 'Standard V2', output_format: 'jpg', upscale_factor: '2x', face_enhancement: false, subject_detection: 'None' })
  },
  google: {
    title: 'Google Upscaler',
    endpoint: 'models/google/upscaler/predictions',
    input: image => ({ image, upscale_factor: 'x2', compression_quality: 90 })
  },
  real_esrgan: {
    title: 'Real-ESRGAN',
    endpoint: 'models/nightmareai/real-esrgan/predictions',
    input: image => ({ image, scale: 2, face_enhance: false })
  },
  gfpgan: {
    title: 'GFPGAN',
    version: 'tencentarc/gfpgan:297a243ce8643961d52f745f9b6c8c1bd96850a51c92be5f43628a0d3e08321a',
    input: image => ({ img: image, scale: 2, version: 'v1.4' })
  },
  codeformer: {
    title: 'CodeFormer',
    version: 'sczhou/codeformer:cc4956dd26fa5a7185d5660cc9100fab1b8070a1d1654a8bb5eb6d443b020bb2',
    input: image => ({ image, upscale: 2, face_upsample: true, background_enhance: true, codeformer_fidelity: 0.7 })
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

async function createPrediction(model, image) {
  const body = { input: model.input(image) };
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

async function saveResult(sourceUrl, originalName, mimeType) {
  const response = await fetch(sourceUrl, { headers: apiHeaders() });
  if (!response.ok) throw new Error('Не удалось скачать готовое изображение с Replicate.');
  const contentType = response.headers.get('content-type') || mimeType;
  if (!contentType.startsWith('image/')) throw new Error('Replicate вернул файл, который не является изображением.');
  const extension = contentType.includes('png') ? '.png' : contentType.includes('webp') ? '.webp' : '.jpg';
  const baseName = path.basename(originalName, path.extname(originalName)).replace(/[^a-zA-Z0-9_-]/g, '_') || 'photo';
  const filename = `${baseName}-replicate-x2-${Date.now()}${extension}`;
  await fs.writeFile(path.join(OUTPUTS_DIR, filename), Buffer.from(await response.arrayBuffer()));
  return filename;
}

app.post('/api/upscale', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Выберите JPG, PNG или WebP размером до 10 МБ.' });
    const model = MODELS[req.body.model];
    if (!model) return res.status(400).json({ error: 'Выберите один из доступных методов обработки.' });
    const prediction = await createPrediction(model, asDataUrl(req.file));
    const resultUrl = await waitForResult(prediction);
    const filename = await saveResult(resultUrl, req.file.originalname, req.file.mimetype);
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
