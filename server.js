import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import compression from 'compression';
import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import {
  IMAGES_DIR,
  STORAGE_DIR,
  GENERATED_DIR,
  ADJACENT,
  ensureImageDirectories,
  galleryItems,
  isImage
} from './gallery.js';
import { collectionPage, intakePage, licensePage, missingPage, robots, sitemap, workPage } from './pages.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Канонический адрес. Умолчание — настоящий домен, а не локальный сервер:
// забытая переменная окружения на боевой машине увела бы canonical, og:url,
// карту сайта и `license` для значка «Licensable» на 127.0.0.1, то есть
// обесценила бы разом всё, ради чего страницы собираются на сервере.
// Для местной работы переменная задаётся в `.env`.
const SITE_ORIGIN = (process.env.SITE_ORIGIN || 'https://tessarum.com').replace(/\/$/, '');
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const FILE_NOT_FOUND = 'File not found.';

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

// Каталоги, файлы в которых после появления не меняются. Плашки и файлы «до»
// названы слугом и размерами, рендер детерминирован, а у опубликованной работы
// файл больше не правится (works.js). Имя результата апскейла содержит время
// и второй раз не возникает.
//
// Присланных посетителями `gallery` и `shared` здесь нет: их имена приходят
// снаружи, и одно и то же имя однажды может оказаться другим файлом. Они
// отдаются как раньше — с проверкой на каждый запрос.
//
// По умолчанию express.static ставит `max-age=0`, то есть указатель на десять
// работ спрашивает сервер о каждой картинке при каждом заходе.
const IMMUTABLE_FOLDERS = new Set(['plates', 'before', 'generated']);
const A_YEAR = 60 * 60 * 24 * 365;

function setImageHeaders(res, file) {
  if (IMMUTABLE_FOLDERS.has(path.basename(path.dirname(file)))) {
    res.setHeader('Cache-Control', `public, max-age=${A_YEAR}, immutable`);
  }
}

await ensureImageDirectories();
// Разметка собирается из шаблонных строк и потому повторяется сама в себе:
// страница работы сжимается с 13 668 до 2 411 байт. Изображения проходят мимо —
// `compression` смотрит на тип и JPEG не трогает.
app.use(compression());
app.use(express.static(path.join(__dirname, 'public')));
// Наружу отдаются только сами изображения: рядом с ними лежит индекс витрины,
// а пул вообще может оказаться каталогом вне проекта с чем угодно внутри.
app.use('/images', (req, _res, next) => next(isImage(req.path) ? undefined : new HttpError(404, FILE_NOT_FOUND)));
// Пул может лежать вне проекта (INTERNAL_IMAGE_STORAGE_DIR), поэтому он
// раздаётся отдельно и до общего маршрута — иначе `/images` ответит 404 первым.
app.use('/images/storage', express.static(STORAGE_DIR, { fallthrough: false }));
app.use('/images', express.static(IMAGES_DIR, { fallthrough: false, setHeaders: setImageHeaders }));

// ── страницы ───────────────────────────────────────────────────
// Каждая собирается на запрос из `galleryItems()`: разметка приходит готовой,
// потому что изображение индексируется по странице, на которой оно стоит,
// а собранную скриптом страницу Googlebot обходит вторым проходом и без
// гарантий по времени. Разбор — research/2026-08-16-indexable-collection.md.

const html = (res, status, body) => res.status(status).type('html').send(body);

// Указатель. Вся коллекция одной страницей: постраничность была и снята.
// Она делила один список между несколькими адресами, и посетитель видел
// первые десять работ — то есть, пока каталог пополнялся с конца, всегда
// одни и те же десять. Карточки ниже сгиба грузятся лениво, поэтому длина
// страницы стоит разметки, а не байтов.
async function showCollection(_req, res, next) {
  try {
    html(res, 200, collectionPage({ items: await galleryItems(), origin: SITE_ORIGIN }));
  } catch (error) {
    next(error);
  }
}

app.get('/', showCollection);
// Адреса страниц указателя существовали и могли быть кем-то сохранены.
// Отвечать им 404 — терять то, что они накопили; ведём на указатель.
app.get('/page/:page', (_req, res) => res.redirect(301, '/'));

app.get('/w/:slug', async (req, res, next) => {
  try {
    const items = await galleryItems();
    const item = items.find(work => work.slug === req.params.slug);
    if (!item) return next();
    const others = items.filter(work => work !== item).slice(0, ADJACENT);
    html(res, 200, workPage({ item, others, origin: SITE_ORIGIN }));
  } catch (error) {
    next(error);
  }
});

app.get('/restore', (_req, res) => html(res, 200, intakePage({ origin: SITE_ORIGIN })));

app.get('/license', (_req, res) => html(res, 200, licensePage({ origin: SITE_ORIGIN })));

app.get('/robots.txt', (_req, res) => res.type('text/plain').send(robots({ origin: SITE_ORIGIN })));

app.get('/sitemap.xml', async (_req, res, next) => {
  try {
    const items = await galleryItems();
    res.type('application/xml').send(sitemap({ items, origin: SITE_ORIGIN }));
  } catch (error) {
    next(error);
  }
});

// Строки, зависящие от модели, живут только здесь: эндпоинт для запроса
// и `slug` для имени файла результата.
const MODEL = {
  title: 'Real-ESRGAN',
  slug: 'real-esrgan',
  endpoint: 'models/nightmareai/real-esrgan/predictions'
};
// Размеры результата — те же, что предлагает страница.
const OUTPUT_SIZES = ['x2', 'x4', '2k', '4k'];

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
      data.detail || data.error || data.msg || data.message || `Replicate returned HTTP ${response.status}`
    );
  }
  return data;
}

function asDataUrl(file) {
  return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
}

async function createPrediction(image, scale) {
  const response = await fetch(`https://api.replicate.com/v1/${MODEL.endpoint}`, {
    method: 'POST',
    headers: { ...apiHeaders(), 'Content-Type': 'application/json', Prefer: 'wait=60', 'Cancel-After': '10m' },
    body: JSON.stringify({ input: { image, scale, face_enhance: false } })
  });
  const data = await parseResponse(response);
  if (!data.id) throw new HttpError(502, 'Replicate did not return a task id.');
  return data;
}

async function readLongestSide(file) {
  const metadata = await sharp(file.buffer).metadata();
  const longestSide = Math.max(metadata.width || 0, metadata.height || 0);
  if (!longestSide) throw new HttpError(400, 'The size of that image could not be read.');
  return longestSide;
}

// Во что упирается длинная сторона результата: кратность исходнику или фиксированный размер.
function targetLongestSideFor(outputSize, sourceLongestSide) {
  if (outputSize === 'x2') return sourceLongestSide * 2;
  if (outputSize === 'x4') return sourceLongestSide * 4;
  return outputSize === '2k' ? 2048 : 4096;
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
      if (!url) throw new HttpError(502, 'The task finished without an image.');
      return url;
    }
    if (task.status === 'failed' || task.status === 'canceled')
      throw new HttpError(502, task.error || 'Replicate did not complete the upscale.');
    await new Promise(resolve => setTimeout(resolve, 2000));
    const response = await fetch(task.urls?.get || `https://api.replicate.com/v1/predictions/${task.id}`, {
      headers: apiHeaders()
    });
    task = await parseResponse(response);
  }
  throw new HttpError(504, 'Timed out waiting for the result. Try again.');
}

async function saveResult(sourceUrl, file, { outputSize, targetLongestSide }) {
  const response = await fetch(sourceUrl, { headers: apiHeaders() });
  if (!response.ok) throw new HttpError(502, 'The finished image could not be downloaded from Replicate.');
  const contentType = response.headers.get('content-type') || file.mimetype;
  if (!contentType.startsWith('image/')) throw new HttpError(502, 'Replicate returned a file that is not an image.');
  const extension = contentType.includes('png') ? '.png' : contentType.includes('webp') ? '.webp' : '.jpg';
  const baseName =
    path.basename(file.originalname, path.extname(file.originalname)).replace(/[^a-zA-Z0-9_-]/g, '_') || 'photo';
  const filename = `${baseName}-${MODEL.slug}-${outputSize}-${Date.now()}${extension}`;
  let output = Buffer.from(await response.arrayBuffer());
  if (targetLongestSide)
    output = await sharp(output).resize(targetLongestSide, targetLongestSide, { fit: 'inside' }).toBuffer();
  await fs.writeFile(path.join(GENERATED_DIR, filename), output);
  return filename;
}

app.post('/api/upscale', upload.single('photo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Choose a JPG, PNG or WebP up to 10 MB.' });
    const outputSize = OUTPUT_SIZES.includes(req.body.output_size) ? req.body.output_size : 'x2';
    const sourceLongestSide = await readLongestSide(req.file);
    const targetLongestSide = targetLongestSideFor(outputSize, sourceLongestSide);
    const scale = realEsrganScale(outputSize, sourceLongestSide, targetLongestSide);
    const prediction = await createPrediction(asDataUrl(req.file), scale);
    const resultUrl = await waitForResult(prediction);
    const filename = await saveResult(resultUrl, req.file, { outputSize, targetLongestSide });
    res.json({
      filename,
      url: `/images/generated/${encodeURIComponent(filename)}`,
      taskId: prediction.id,
      model: MODEL.title
    });
  } catch (error) {
    next(error);
  }
});

// Публикация пользовательских загрузок закрыта. LEGAL.md обещает, что пока
// галочка выключена, чужие файлы не публикуются никогда, — а выключенная в
// разметке галочка такого обещания не даёт: маршрут виден из консоли браузера.
// Отказ стоит здесь, чтобы обещание было правдой; включать его вместе с
// галочкой и не раньше, чем пройден чек-лист из LEGAL.md.
// Сама публикация никуда не делась и лежит в `publishGeneratedImage`.
app.post('/api/gallery/share/:filename', (_req, res) =>
  res.status(403).json({ error: 'Adding works to the collection is not available at the moment.' })
);

// Ненайденный адрес. Посетителю нужна страница, а скрипту приёмки — JSON:
// отвечать разметкой на `fetch` значит показать в аварии кусок HTML.
const wantsJson = req => req.path.startsWith('/api/') || req.path.startsWith('/images/');

app.use((req, res) => {
  if (wantsJson(req)) return res.status(404).json({ error: FILE_NOT_FOUND });
  html(res, 404, missingPage({ origin: SITE_ORIGIN }));
});

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ error: 'JPG, PNG and WebP up to 10 MB.' });
  }
  if (error instanceof HttpError) {
    // Ответ посетителю сам по себе следа не оставляет: во время аварии
    // у Replicate в логе иначе не будет вообще ничего.
    if (error.status >= 500) console.error(error);
    return res.status(error.status).json({ error: error.message });
  }
  // express.static с fallthrough: false сообщает об отсутствующем файле статусом 404,
  // а о попытке выйти за пределы каталога — 403. И то и другое — ошибка запроса,
  // а не сервера; отвечаем одинаково, чтобы наружу не уходило, чем именно путь не понравился.
  const status = error?.status ?? error?.statusCode;
  if (status >= 400 && status < 500) {
    return res.status(404).json({ error: FILE_NOT_FOUND });
  }
  console.error(error);
  res.status(500).json({ error: 'Server error.' });
});

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '127.0.0.1';
app.listen(port, host, () => console.log(`Replicate Image Upscaler: http://${host}:${port}`));
