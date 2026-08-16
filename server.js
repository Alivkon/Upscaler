import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import multer from 'multer';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = path.join(__dirname, 'images');
const STORAGE_DIR = path.resolve(__dirname, process.env.INTERNAL_IMAGE_STORAGE_DIR || 'images/storage');
const GALLERY_DIR = path.join(IMAGES_DIR, 'gallery');
const GENERATED_DIR = path.join(IMAGES_DIR, 'generated');
const SHARED_DIR = path.join(IMAGES_DIR, 'shared');
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

// Ошибка, текст которой предназначен посетителю. Всё остальное превращается
// в «Внутренняя ошибка сервера», чтобы наружу не попадали детали конфигурации.
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (_req, file, done) => done(null, ACCEPTED_TYPES.has(file.mimetype))
});

await Promise.all(
  [STORAGE_DIR, GALLERY_DIR, GENERATED_DIR, SHARED_DIR].map(directory => fs.mkdir(directory, { recursive: true }))
);
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(IMAGES_DIR, { fallthrough: false }));

function isImage(filename) {
  return IMAGE_EXTENSIONS.has(path.extname(filename).toLowerCase());
}

async function listImageFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const images = await Promise.all(
    entries
      .filter(entry => entry.isFile() && isImage(entry.name))
      .map(async entry => ({
        name: entry.name,
        modified: (await fs.stat(path.join(directory, entry.name))).mtimeMs
      }))
  );
  return images.sort((a, b) => b.modified - a.modified);
}

async function galleryItems() {
  const [shared, gallery] = await Promise.all([listImageFiles(SHARED_DIR), listImageFiles(GALLERY_DIR)]);
  return [
    ...shared.map(file => ({ ...file, source: 'shared', folder: 'shared' })),
    ...gallery.map(file => ({ ...file, source: 'llm', folder: 'gallery' }))
  ]
    .sort((a, b) => b.modified - a.modified)
    .slice(0, 10)
    .map(file => ({
      id: `${file.source}-${file.name}`,
      url: `/images/${file.folder}/${encodeURIComponent(file.name)}`,
      title: file.source === 'shared' ? 'Работа сообщества' : 'Новая LLM-генерация',
      source: file.source
    }));
}

async function addStorageImageToGallery() {
  const [storage, gallery] = await Promise.all([listImageFiles(STORAGE_DIR), listImageFiles(GALLERY_DIR)]);
  const existing = new Set(gallery.map(file => file.name.replace(/^llm-\d+-/, '')));
  const next = storage.find(file => !existing.has(file.name));
  if (!next) return null;
  const galleryName = `llm-${Date.now()}-${next.name}`;
  await fs.copyFile(path.join(STORAGE_DIR, next.name), path.join(GALLERY_DIR, galleryName));
  return galleryName;
}

const MODELS = {
  real_esrgan: {
    title: 'Real-ESRGAN',
    slug: 'real-esrgan',
    endpoint: 'models/nightmareai/real-esrgan/predictions',
    input: (image, _prompt, scale = 2) => ({ image, scale, face_enhance: false })
  },
  nano_banana: {
    title: 'Nano Banana',
    slug: 'nano-banana',
    endpoint: 'models/google/nano-banana/predictions',
    requiresPrompt: true,
    input: (image, prompt) => ({
      prompt,
      image_input: [image],
      aspect_ratio: 'match_input_image',
      output_format: 'jpg'
    })
  },
  nano_banana_pro: {
    title: 'Nano Banana Pro',
    slug: 'nano-banana-pro',
    endpoint: 'models/google/nano-banana-pro/predictions',
    requiresPrompt: true,
    input: (image, prompt, resolution) => ({
      prompt,
      image_input: [image],
      aspect_ratio: 'match_input_image',
      output_format: 'jpg',
      ...(resolution ? { resolution } : {})
    })
  }
};

function apiHeaders() {
  if (
    !process.env.REPLICATE_API_TOKEN ||
    process.env.REPLICATE_API_TOKEN === 'r8_replace_with_your_replicate_api_token'
  ) {
    throw new Error('Добавьте действительный REPLICATE_API_TOKEN в файл .env.');
  }
  return { Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}` };
}

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.code >= 400 || data.success === false) {
    throw new HttpError(
      502,
      data.detail || data.error || data.msg || data.message || `Replicate вернул HTTP ${response.status}`
    );
  }
  return data;
}

function asDataUrl(file) {
  return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
}

async function createPrediction(model, image, prompt, resolution) {
  const body = { input: model.input(image, prompt, resolution) };
  const response = await fetch(`https://api.replicate.com/v1/${model.endpoint}`, {
    method: 'POST',
    headers: { ...apiHeaders(), 'Content-Type': 'application/json', Prefer: 'wait=60', 'Cancel-After': '10m' },
    body: JSON.stringify(body)
  });
  const data = await parseResponse(response);
  if (!data.id) throw new HttpError(502, 'Replicate не вернул идентификатор задачи.');
  return data;
}

async function readLongestSide(file) {
  const metadata = await sharp(file.buffer).metadata();
  const longestSide = Math.max(metadata.width || 0, metadata.height || 0);
  if (!longestSide) throw new HttpError(400, 'Не удалось определить размеры исходного изображения.');
  return longestSide;
}

// Во что упирается длинная сторона результата: кратность исходнику или фиксированный размер.
function targetLongestSideFor(outputSize, sourceLongestSide) {
  if (outputSize === 'x2') return sourceLongestSide * 2;
  if (outputSize === 'x4') return sourceLongestSide * 4;
  return outputSize === '1k' ? 1024 : outputSize === '2k' ? 2048 : 4096;
}

// Real-ESRGAN принимает целочисленный множитель, поэтому для фиксированных
// размеров берём ближайший больший и обрезаем результат до нужной стороны.
function realEsrganScale(outputSize, sourceLongestSide, targetLongestSide) {
  if (outputSize === 'x2') return 2;
  if (outputSize === 'x4') return 4;
  return Math.min(10, Math.max(2, Math.ceil(targetLongestSide / sourceLongestSide)));
}

async function waitForResult(prediction) {
  const deadline = Date.now() + 10 * 60 * 1000;
  let task = prediction;
  while (Date.now() < deadline) {
    if (task.status === 'succeeded') {
      const url = Array.isArray(task.output) ? task.output[0] : task.output;
      if (!url) throw new HttpError(502, 'Задача завершилась, но ссылка на изображение отсутствует.');
      return url;
    }
    if (task.status === 'failed' || task.status === 'canceled')
      throw new HttpError(502, task.error || 'Апскейлинг не выполнен сервисом Replicate.');
    await new Promise(resolve => setTimeout(resolve, 2000));
    const response = await fetch(task.urls?.get || `https://api.replicate.com/v1/predictions/${task.id}`, {
      headers: apiHeaders()
    });
    task = await parseResponse(response);
  }
  throw new HttpError(504, 'Время ожидания результата истекло. Попробуйте ещё раз.');
}

async function saveResult(sourceUrl, file, { model, outputSize, targetLongestSide }) {
  const response = await fetch(sourceUrl, { headers: apiHeaders() });
  if (!response.ok) throw new HttpError(502, 'Не удалось скачать готовое изображение с Replicate.');
  const contentType = response.headers.get('content-type') || file.mimetype;
  if (!contentType.startsWith('image/'))
    throw new HttpError(502, 'Replicate вернул файл, который не является изображением.');
  const extension = contentType.includes('png') ? '.png' : contentType.includes('webp') ? '.webp' : '.jpg';
  const baseName =
    path.basename(file.originalname, path.extname(file.originalname)).replace(/[^a-zA-Z0-9_-]/g, '_') || 'photo';
  const filename = `${baseName}-${model.slug}-${outputSize}-${Date.now()}${extension}`;
  let output = Buffer.from(await response.arrayBuffer());
  if (targetLongestSide)
    output = await sharp(output).resize(targetLongestSide, targetLongestSide, { fit: 'inside' }).toBuffer();
  await fs.writeFile(path.join(GENERATED_DIR, filename), output);
  return filename;
}

app.post('/api/upscale', upload.single('photo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Выберите JPG, PNG или WebP размером до 10 МБ.' });
    const model = MODELS[req.body.model] || MODELS.real_esrgan;
    const selectedOutputSize = model === MODELS.real_esrgan ? req.body.output_size : req.body.portrait_output_size;
    const outputSize = ['x2', 'x4', '1k', '2k', '4k'].includes(selectedOutputSize) ? selectedOutputSize : 'x2';
    const prompt = typeof req.body.prompt === 'string' ? req.body.prompt.trim() : '';
    if (model.requiresPrompt && !prompt)
      return res.status(400).json({ error: 'Введите инструкцию для обработки портрета.' });
    const sourceLongestSide = await readLongestSide(req.file);
    const targetLongestSide = targetLongestSideFor(outputSize, sourceLongestSide);
    const scale =
      model === MODELS.real_esrgan ? realEsrganScale(outputSize, sourceLongestSide, targetLongestSide) : undefined;
    const nativeResolution =
      model === MODELS.nano_banana_pro && ['1k', '2k', '4k'].includes(outputSize)
        ? outputSize.toUpperCase()
        : undefined;
    const prediction = await createPrediction(model, asDataUrl(req.file), prompt, scale ?? nativeResolution);
    const resultUrl = await waitForResult(prediction);
    const filename = await saveResult(resultUrl, req.file, { model, outputSize, targetLongestSide });
    res.json({
      filename,
      url: `/images/generated/${encodeURIComponent(filename)}`,
      taskId: prediction.id,
      model: model.title
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/gallery', async (_req, res, next) => {
  try {
    res.json({ images: await galleryItems() });
  } catch (error) {
    next(error);
  }
});

app.post('/api/gallery/refresh', async (_req, res, next) => {
  try {
    await addStorageImageToGallery();
    res.json({ images: await galleryItems() });
  } catch (error) {
    next(error);
  }
});

app.post('/api/gallery/share/:filename', async (req, res, next) => {
  try {
    const filename = path.basename(req.params.filename);
    if (!isImage(filename)) return res.status(400).json({ error: 'Можно опубликовать только изображение.' });
    const source = path.join(GENERATED_DIR, filename);
    await fs.access(source);
    const target = path.join(SHARED_DIR, `shared-${Date.now()}-${filename}`);
    await fs.copyFile(source, target);
    res.json({ message: 'Изображение добавлено в начало коллекции.', images: await galleryItems() });
  } catch (error) {
    if (error.code === 'ENOENT') return res.status(404).json({ error: 'Изображение для публикации не найдено.' });
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ error: 'Допустимы JPG, PNG и WebP до 10 МБ.' });
  }
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.message });
  }
  // express.static с fallthrough: false отдаёт отсутствующий файл как ошибку со статусом 404.
  if (error?.status === 404 || error?.statusCode === 404) {
    return res.status(404).json({ error: 'Файл не найден.' });
  }
  console.error(error);
  res.status(500).json({ error: 'Внутренняя ошибка сервера.' });
});

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '127.0.0.1';
app.listen(port, host, () => console.log(`Replicate Image Upscaler: http://${host}:${port}`));
