import 'dotenv/config';
import crypto from 'node:crypto';
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

function apiHeaders() {
  if (!process.env.KIE_API_KEY || process.env.KIE_API_KEY === 'replace_with_your_kie_api_key') {
    throw new Error('Добавьте действительный KIE_API_KEY в файл .env.');
  }
  return { Authorization: `Bearer ${process.env.KIE_API_KEY}` };
}

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.code >= 400 || data.success === false) {
    throw new Error(data.msg || data.message || `Kie.ai вернул HTTP ${response.status}`);
  }
  return data;
}

async function uploadToKie(file) {
  const form = new FormData();
  form.append('file', new Blob([file.buffer], { type: file.mimetype }), file.originalname);
  form.append('uploadPath', 'images/user-uploads');
  form.append('fileName', `${crypto.randomUUID()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
  const response = await fetch('https://kieai.redpandaai.co/api/file-stream-upload', {
    method: 'POST', headers: apiHeaders(), body: form
  });
  const data = await parseResponse(response);
  const url = data.data?.downloadUrl || data.data?.fileUrl;
  if (!url) throw new Error('Kie.ai не вернул URL загруженного файла.');
  return url;
}

async function createUpscaleTask(imageUrl) {
  const response = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
    method: 'POST',
    headers: { ...apiHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'topaz/image-upscale', input: { image_url: imageUrl, upscale_factor: '2' } })
  });
  const data = await parseResponse(response);
  if (!data.data?.taskId) throw new Error('Kie.ai не вернул идентификатор задачи.');
  return data.data.taskId;
}

async function waitForResult(taskId) {
  const deadline = Date.now() + 10 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 2500));
    const response = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, {
      headers: apiHeaders()
    });
    const data = await parseResponse(response);
    const task = data.data || {};
    if (task.state === 'success') {
      const result = typeof task.resultJson === 'string' ? JSON.parse(task.resultJson) : task.resultJson;
      const url = result?.resultUrls?.[0] || result?.resultUrl || result?.output;
      if (!url) throw new Error('Задача завершилась, но ссылка на изображение отсутствует.');
      return url;
    }
    if (task.state === 'fail') throw new Error(task.failMsg || 'Апскейлинг не выполнен сервисом Kie.ai.');
  }
  throw new Error('Время ожидания результата истекло. Попробуйте ещё раз.');
}

async function saveResult(sourceUrl, originalName, mimeType) {
  const response = await fetch(sourceUrl);
  if (!response.ok) throw new Error('Не удалось скачать готовое изображение с Kie.ai.');
  const contentType = response.headers.get('content-type') || mimeType;
  const extension = contentType.includes('png') ? '.png' : contentType.includes('webp') ? '.webp' : '.jpg';
  const baseName = path.basename(originalName, path.extname(originalName)).replace(/[^a-zA-Z0-9_-]/g, '_') || 'photo';
  const filename = `${baseName}-topaz-x2-${Date.now()}${extension}`;
  await fs.writeFile(path.join(OUTPUTS_DIR, filename), Buffer.from(await response.arrayBuffer()));
  return filename;
}

app.post('/api/upscale', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Выберите JPG, PNG или WebP размером до 10 МБ.' });
    const uploadedUrl = await uploadToKie(req.file);
    const taskId = await createUpscaleTask(uploadedUrl);
    const resultUrl = await waitForResult(taskId);
    const filename = await saveResult(resultUrl, req.file.originalname, req.file.mimetype);
    res.json({ filename, url: `/outputs/${encodeURIComponent(filename)}`, taskId });
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
app.listen(port, host, () => console.log(`Topaz ×2 Upscaler: http://${host}:${port}`));
