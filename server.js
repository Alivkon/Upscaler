import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import compression from 'compression';
import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { IMAGES_DIR, ADJACENT, ensureImageDirectories, galleryItems, isImage } from './gallery.js';
import { upscaleAllowance } from './limits.js';
import { collectionPage, errorPage, intakePage, licensePage, missingPage, robots, sitemap, workPage } from './pages.js';
import { finish, phoneWindow } from './treatment.js';
import { serverLongestSide } from './public/frame.js';
import { MODEL as MODEL_FILE, WEIGHED } from './public/model-files.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Канонический адрес. Умолчание — настоящий домен, а не локальный сервер:
// забытая переменная окружения на боевой машине увела бы canonical, og:url,
// карту сайта и `license` для значка «Licensable» на 127.0.0.1, то есть
// обесценила бы разом всё, ради чего страницы собираются на сервере.
// Для местной работы переменная задаётся в `.env`.
const SITE_ORIGIN = (process.env.SITE_ORIGIN || 'https://tessarum.com').replace(/\/$/, '');
// Предел ТЕЛА ЗАПРОСА, а не правило о картинках. Файл целиком лежит в памяти
// (`memoryStorage`), уезжает в Replicate строкой base64 — ещё треть сверху, —
// и сколько таких придёт разом, сервер не решает. Поэтому число здесь есть,
// но названо оно нашей памятью, а не чужой картинкой: в браузере, где считает
// машина посетителя, веса не спрашивают вовсе (public/intake.js).
//
// 64 МБ — втрое больше самой тяжёлой нашей плиты (20 МБ), то есть о свою же
// работу этот предел не спотыкается. Отказ по нему говорит про отправку нам,
// а не про формат: формат отсеивает `fileFilter`, и до сюда он не доходит.
const MAX_FILE_SIZE = 64 * 1024 * 1024;
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
// Кому верить, когда речь идёт об адресе посетителя. Счётчик в `limits.js`
// считает по `req.ip`, а за обратным прокси `req.ip` — это сам прокси, то есть
// один ключ на весь мир: десятый посетитель за сутки получил бы отказ из-за
// девяти чужих. Лечится доверием к `X-Forwarded-For`, но включать его наугад
// нельзя — заголовок ставит кто угодно, и доверие к нему без прокси впереди
// превращает счётчик адреса в счётчик по желанию посетителя. Поэтому решает
// тот, кто разворачивает: `TRUST_PROXY=1` — один прокси перед сервером,
// `loopback` — прокси на той же машине. Пусто — прокси нет.
const TRUST_PROXY = (process.env.TRUST_PROXY || '').trim();

// `true` для express значит «верить каждому хопу», то есть верить и тому
// `X-Forwarded-For`, который поставил сам посетитель, — чего эта переменная
// как раз и избегает. Но написавший `TRUST_PROXY=true` имел в виду «прокси
// есть», а не это, и читать его надо как `1`. Всё остальное разбирает express:
// `loopback`, `linklocal`, `uniquelocal`, список подсетей.
function trustProxySetting(value) {
  if (!value || /^(false|no|off)$/i.test(value)) return false;
  if (/^\d+$/.test(value)) return Number(value);
  if (/^(true|yes|on)$/i.test(value)) return 1;
  return value;
}

// express разбирает значение здесь же и на непонятное отвечает «invalid IP
// address: …» — сообщением, в котором не названы ни переменная, ни файл,
// хотя падает от него весь сервер и на старте. Называем сами.
try {
  app.set('trust proxy', trustProxySetting(TRUST_PROXY));
} catch (error) {
  throw new Error(
    `TRUST_PROXY=${TRUST_PROXY} — непонятное значение (${error.message}). Ожидается число, loopback или пусто; см. .env.example.`
  );
}
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
//
// СРОК — ЧАС, А НЕ ГОД, ПОКА ВИТРИНУ ПРАВЯТ. Год с `immutable` держится на том,
// что файл под этим именем никогда не сменится. С 21.08.2026 обработка стала
// свойством работы и выбирается глазом, то есть плита под тем же именем
// пересобирается ровно тогда, когда выбор поменяли, — и год означал бы, что
// правку не видит первым сам правящий. Посетителей у витрины пока нет, платить
// за их кэш нечем. Когда правки кончатся, здесь снова год: тогда цена
// перевешивает.
const IMMUTABLE_FOLDERS = new Set(['plates', 'crops', 'before', 'generated']);
const AN_HOUR = 60 * 60;

function setImageHeaders(res, file) {
  if (IMMUTABLE_FOLDERS.has(path.basename(path.dirname(file)))) {
    res.setHeader('Cache-Control', `public, max-age=${AN_HOUR}`);
  }
}

await ensureImageDirectories();
// Разметка собирается из шаблонных строк и потому повторяется сама в себе:
// страница работы сжимается с 13 668 до 2 411 байт. Изображения проходят мимо —
// `compression` смотрит на тип и JPEG не трогает.
app.use(compression());
app.use(express.static(path.join(__dirname, 'public')));
// Рантайм счёта в браузере: приёмка увеличивает картинку у самого посетителя,
// и ей нужен onnxruntime-web. Он лежит в node_modules и оттуда же отдаётся —
// копия в `public/` разошлась бы с package.json при первом же обновлении.
//
// Версия читается из package.json самого рантайма, а не из нашего: у нас
// записано «1.27.0», а поставлено то, что решил установщик.
const ORT_VERSION = JSON.parse(
  await fs.readFile(path.join(__dirname, 'node_modules/onnxruntime-web/package.json'), 'utf8')
).version;
// Сжатый рантайм весит около шести мегабайт и качается один раз, поэтому год
// с `immutable` здесь уместен — но только потому, что версия стоит в адресе.
// Раньше её там не было: файлы называются `ort.webgpu.min.mjs` и
// `ort-wasm-simd-threaded.jsep.wasm` и после обновления пакета сохраняют имена.
// Год `immutable` на таком имени означал бы, что вернувшийся посетитель ещё
// год считает старым рантаймом; а хуже того, js и wasm лежат в кэше по
// отдельности, и вымывание одного без другого ломает у ORT проверку сборки —
// счёт в браузере переставал бы работать без всякой возможности починить.
app.use(
  `/vendor/ort/${ORT_VERSION}`,
  express.static(path.join(__dirname, 'node_modules/onnxruntime-web/dist'), {
    setHeaders: res => res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  })
);
// Сколько весит то, что качается перед первой плиткой. Числа уезжают
// в разметку, потому что взять их в браузере неоткуда: `compression` жмёт
// эти файлы на лету, `Content-Length` в ответе нет вовсе, и качающий
// двадцать шесть мегабайт не может сказать, сколько осталось. Молчаливое
// ожидание читалось как поломка (public/intake.js).
//
// Не одно число, а список: wasm-файлов два, и какой из них спросят, решится
// уже в браузере — по тому, дал ли он адаптер видеокарты (model-files.js).
// Сервер поэтому взвешивает оба, а складывает нужные тот, кто их и качает.
//
// Считается один раз на старте и с собственного диска. Файла нет — нет
// и записи: приёмка тогда покажет работу без доли, но покажет.
const ORT_DIST = 'node_modules/onnxruntime-web/dist';
const LOAD_BYTES = Object.fromEntries(
  (
    await Promise.all(
      [...WEIGHED.map(name => [name, `${ORT_DIST}/${name}`]), [MODEL_FILE, `public${MODEL_FILE}`]].map(
        async ([name, file]) => [
          name,
          await fs.stat(path.join(__dirname, file)).then(
            i => i.size,
            () => 0
          )
        ]
      )
    )
  ).filter(([, size]) => size > 0)
);
// Правила обработки — те же файлы, что читает сервер. Приёмка считает галочки
// «приглушить» и «кадр под телефон» на стороне посетителя, и читать их она
// обязана отсюда: копия правил в `public/` означала бы, что витрина и приёмка
// со временем разъедутся молча. Открыты поимённо, а не каталогом: в
// `scripts/research/` лежит и то, чему наружу делать нечего.
const BROWSER_RULES = new Set(['ceilings.mjs', 'desaturate.mjs', 'dimming.mjs', 'grey-balance.mjs']);
app.get('/rules/:file', (req, res, next) => {
  if (!BROWSER_RULES.has(req.params.file)) return next(new HttpError(404, FILE_NOT_FOUND));
  res.sendFile(path.join(__dirname, 'scripts/research', req.params.file));
});
// Наружу отдаются только сами изображения: рядом с ними лежит индекс витрины,
// а пул вообще может оказаться каталогом вне проекта с чем угодно внутри.
app.use('/images', (req, _res, next) => next(isImage(req.path) ? undefined : new HttpError(404, FILE_NOT_FOUND)));
// Пул наружу не отдаётся никогда: там лежат файлы Depositphotos и Adobe Stock
// (LEGAL.md). Ни одна страница на них не ссылается — из коллекции пул убран
// (gallery.js), — но по умолчанию он лежит внутри `images/`, и без этой
// заглушки общий `express.static` ниже отдал бы любой файл пула тому, кто
// угадает имя. Заглушка стоит до него, потому что порядок здесь и решает.
app.use('/images/storage', (_req, _res, next) => next(new HttpError(404, FILE_NOT_FOUND)));
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
// Снятые с витрины работы отсеиваются здесь, в одном месте на все три
// поверхности: сетку, ленту «ещё из коллекции» и карту сайта. Не в
// `galleryItems()` — страница работы должна их находить: адрес продолжает
// отвечать, и в этом весь смысл поля (works.js, `hidden`). Фильтр на выдаче,
// а не на чтении: снять работу с показа и убрать её из коллекции — разные
// события, и одно не должно тянуть за собой другое.
const shown = items => items.filter(item => !item.hidden);

// Случайные `count` элементов, перемешиванием Фишера — Йетса до нужной длины.
// `sort(() => Math.random() - 0.5)` короче, но даёт не равномерную выборку:
// сравнение, отвечающее на один и тот же вопрос по-разному, ломает сортировку,
// и первые элементы остаются первыми чаще прочих — ровно та беда, от которой
// выборка и заводится.
const sample = (items, count) => {
  const pool = [...items];
  const take = Math.min(count, pool.length);
  for (let i = 0; i < take; i += 1) {
    const j = i + Math.floor(Math.random() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, take);
};

async function showCollection(_req, res, next) {
  try {
    html(res, 200, collectionPage({ items: shown(await galleryItems()), origin: SITE_ORIGIN }));
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
    // Соседи берутся только из показанных — в том числе на странице скрытой
    // работы: она сама с витрины снята, но вести с неё в коллекцию можно,
    // и вести стоит именно в ту коллекцию, которая есть.
    // Порядок — случайный, а не каталожный. Первые десять по каталогу на всех
    // 114 страницах одни и те же: каталог пополняется с конца, и с любой
    // работы уводили одни и те же соседи, а остальная коллекция снизу не
    // показывалась никогда. Случайная выборка показывает её всю и заодно
    // раскладывает внутренние ссылки по всем работам, а не по десяти.
    const others = sample(
      shown(items).filter(work => work !== item),
      ADJACENT
    );
    html(res, 200, workPage({ item, others, origin: SITE_ORIGIN }));
  } catch (error) {
    next(error);
  }
});

app.get('/restore', (_req, res) =>
  html(res, 200, intakePage({ origin: SITE_ORIGIN, runtime: ORT_VERSION, runtimeBytes: JSON.stringify(LOAD_BYTES) }))
);

app.get('/license', (_req, res) => html(res, 200, licensePage({ origin: SITE_ORIGIN })));

app.get('/robots.txt', (_req, res) => res.type('text/plain').send(robots({ origin: SITE_ORIGIN })));

app.get('/sitemap.xml', async (_req, res, next) => {
  try {
    const items = shown(await galleryItems());
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

const TOKEN_PLACEHOLDER = 'r8_replace_with_your_replicate_api_token';

// Есть ли чем платить — насколько это видно отсюда. Спрашивается до ворот
// счёта: без токена запрос не доходит до Replicate вовсе, а место в счётчике
// занимал бы наравне с настоящими.
function apiToken() {
  const token = process.env.REPLICATE_API_TOKEN;
  return !token || token === TOKEN_PLACEHOLDER ? null : token;
}

function apiHeaders() {
  const token = apiToken();
  if (!token) throw new Error('Добавьте действительный REPLICATE_API_TOKEN в файл .env.');
  return { Authorization: `Bearer ${token}` };
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

// Снимок с телефона лежит в файле горизонтально, а рядом с ним стоит пометка
// EXIF «повернуть». `metadata` отдаёт то, что лежит, а не то, что показывают,
// и `extract` режет тоже лежащее: телефонный кадр вырезался поперёк картины,
// а результат приезжал набок. Браузерный путь этой беды не знал —
// `createImageBitmap` пометку исполняет, — то есть два пути расходились
// на одном и том же файле, чего им нельзя.
//
// Поэтому пометка исполняется здесь и один раз, до всякого измерения: дальше
// и меряют, и режут уже поднятую картинку, а самой пометки в ней больше нет.
//
// Стороны читаются заново, а не переставляются: перестановка была бы второй
// записью правила EXIF, где первая уже есть у sharp.
//
// Цена — одно лишнее пересжатие, и только у файлов с пометкой: у остальных
// буфер уходит к Replicate тем же, каким пришёл. Дешевле не выходит — пометку
// нельзя исполнить, не переписав пиксели, а послать неисполненную значит
// послать картинку набок.
//
// Обе стороны, а не одна: порог витрины двусторонний, и короткая сторона
// решает не реже длинной (`targetLongestSideFor` в public/frame.js).
async function upright(file) {
  const {
    width = 0,
    height = 0,
    orientation = 1,
    format
  } = await sharp(file.buffer, {
    limitInputPixels: false
  }).metadata();
  if (!width || !height) throw new HttpError(400, 'The size of that image could not be read.');
  if (orientation <= 1) return { file, width, height };
  // Формат и качество называются вслух. Без них sharp пересжимает по своим
  // умолчаниям, а не по тому, как был сжат вход: JPEG q95 4:4:4 возвращался
  // как q80 4:2:0 и без ICC — 969 КБ шума превращались в 306 КБ. То есть файл
  // с пометкой EXIF терял половину цветовой чёткости ровно перед моделью,
  // которая нанята эту чёткость восстанавливать, — и платил за это только
  // телефонный портрет, ради которого функция и написана.
  //
  // 95 и 4:4:4, а не «как было»: настоящее качество входа sharp не сообщает,
  // и взять его неоткуда. Верх вилки дешевле промаха вниз — лишние килобайты
  // уезжают к Replicate и там же кончаются, а срезанная цветность не
  // возвращается ничем.
  //
  // PNG не назван: он и так без потерь, и умолчания ему не вредят.
  const rotated = sharp(file.buffer, { limitInputPixels: false }).rotate().keepIccProfile();
  const encoded =
    format === 'jpeg'
      ? rotated.jpeg({ quality: 95, chromaSubsampling: '4:4:4' })
      : format === 'webp'
        ? rotated.webp({ quality: 95 })
        : rotated;
  const { data, info } = await encoded.toBuffer({ resolveWithObject: true });
  return { file: { ...file, buffer: data }, width: info.width, height: info.height };
}

// Real-ESRGAN принимает целочисленный множитель, поэтому берём ближайший
// больший и обрезаем результат до нужной стороны.
function realEsrganScale(sourceLongestSide, targetLongestSide) {
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

// Готовое возвращается байтами в ответе и на диск не ложится.
//
// Клали его в `images/generated`, и адрес этого файла был единственным
// способом отдать результат. Цена была не в месте на диске: файл оставался
// там навсегда — уборки нет ни в коде, ни в cron, — а это чужая фотография,
// и хранить её нам незачем ни дня. Заодно исчезла та вилка, из-за которой
// скачанное и сохранённое расходились: размытие и виньетку сервер считать
// не умеет, браузер накладывал их поверх ответа, и у нас оставалась версия
// без них (research/2026-08-23-…).
//
// Обратная сторона названа: результат существует ровно один раз. Оборвётся
// ответ на середине — предсказание Replicate оплачено и потеряно, второй
// попытки по адресу больше нет.
async function finishedImage(sourceUrl, file, { targetLongestSide, treat }) {
  const response = await fetch(sourceUrl, { headers: apiHeaders() });
  if (!response.ok) throw new HttpError(502, 'The finished image could not be downloaded from Replicate.');
  const contentType = response.headers.get('content-type') || file.mimetype;
  if (!contentType.startsWith('image/')) throw new HttpError(502, 'Replicate returned a file that is not an image.');
  const extension = contentType.includes('png') ? '.png' : contentType.includes('webp') ? '.webp' : '.jpg';
  const baseName =
    path.basename(file.originalname, path.extname(file.originalname)).replace(/[^a-zA-Z0-9_-]/g, '_') || 'photo';
  const filename = `${baseName}-${MODEL.slug}-${Date.now()}${extension}`;
  let output = Buffer.from(await response.arrayBuffer());
  if (targetLongestSide)
    output = await sharp(output).resize(targetLongestSide, targetLongestSide, { fit: 'inside' }).toBuffer();
  // Обработка и кадр идут последними, уже по готовому размеру: приглушение
  // решает силу по пикселям, которые поедут на экран, а уменьшение после него
  // мерило бы не тот файл. Обе галочки выключены — без них `finish` возвращает
  // тот же буфер и ничего не пережимает.
  // Кадр уже вырезан — до Replicate; здесь остаётся только отделка.
  output = await finish(output, { treat });
  return { buffer: output, filename, contentType };
}

app.post('/api/upscale', upload.single('photo'), async (req, res, next) => {
  let allowance = null;
  try {
    if (!req.file) return res.status(400).json({ error: 'Choose a JPG, PNG or WebP.' });
    // Токен — до ворот счёта. Без него ни один запрос до Replicate не доходит,
    // но место в счётчике занимает каждый: полсотни таких заперли бы сайт
    // на сутки за вызовы, которых не было, и открыл бы его только перезапуск.
    if (!apiToken()) throw new HttpError(503, 'Upscaling is switched off right now.');
    // Счёт спрашивается до всякой работы; место занимается тем же вопросом
    // и возвращается ниже, в `finally`, если до Replicate так и не дошли —
    // платим за вызовы, а не за попытки (limits.js).
    allowance = upscaleAllowance(req, res);
    if (allowance.refusal) {
      res.setHeader('Retry-After', String(allowance.retryAfter));
      throw new HttpError(429, allowance.refusal);
    }
    // Галочки читаются строгим сравнением, а не на истинность: форма шлёт
    // строки, и `'false'` — истинная строка. Умолчание — «не трогать», и
    // ошибка разбора обязана падать в него, а не в «обработать».
    const treat = req.body.treat === 'true';
    const crop = req.body.crop === 'true';
    const { file, width, height } = await upright(req.file);
    // Кадр режется ДО отправки, как и в браузере (`upscaleInBrowser`).
    // Здесь у этого есть и своя цена: за пиксели, которые мы выбросим сразу
    // после, Replicate берёт наравне с остальными, а у широкой картинки их
    // две трети. Порог тоже назначается по тому, что останется, — иначе
    // готовому кадру до него не хватит.
    const window = crop ? phoneWindow(width, height) : null;
    const framed = window
      ? { ...file, buffer: await sharp(file.buffer, { limitInputPixels: false }).extract(window).toBuffer() }
      : file;
    const [framedWidth, framedHeight] = window ? [window.width, window.height] : [width, height];
    const targetLongestSide = serverLongestSide(framedWidth, framedHeight);
    const scale = realEsrganScale(Math.max(framedWidth, framedHeight), targetLongestSide);
    allowance.spend();
    const prediction = await createPrediction(asDataUrl(framed), scale);
    const resultUrl = await waitForResult(prediction);
    const made = await finishedImage(resultUrl, file, { targetLongestSide, treat });
    // Ответ — сама картинка, а не адрес картинки. Имя едет заголовком:
    // по нему берётся номер работы и им же называется скачанное, и собрано
    // оно из тех же частей, что и в браузерном пути (`localName`).
    // Внутри — только `[a-zA-Z0-9_-]`, точка и цифры времени, поэтому
    // кавычки в `filename=` экранировать нечего.
    res.setHeader('Content-Type', made.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${made.filename}"`);
    // Заголовок свой, потому что читает его скрипт, а не браузер: разбирать
    // `Content-Disposition` в JS значит писать разбор чужой грамматики ради
    // одного поля.
    res.setHeader('X-Filename', made.filename);
    res.setHeader('X-Model', MODEL.title);
    res.setHeader('X-Task-Id', prediction.id);
    // Хранить нечего, кэшировать нечего: адрес один на все работы.
    res.setHeader('Cache-Control', 'no-store');
    res.end(made.buffer);
  } catch (error) {
    next(error);
  } finally {
    // Занятое место возвращается всегда, когда деньги не ушли: отказ по
    // формату, нечитаемый файл, авария у Replicate. После `spend` — пусто.
    allowance?.release?.();
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
  html(res, 404, missingPage());
});

// То же правило и для аварии, а не только для ненайденного адреса. Раньше
// отсюда всегда уходил JSON, и посетитель, у которого не собралась страница
// работы, видел в окне браузера `{"error":"Server error."}`. Ответ был написан
// для `fetch` из приёмки — ему JSON и нужен, — но выбирать формат по тому,
// кто спрашивает, а не по тому, что случилось, умеет только `wantsJson`.
// Ненайденное остаётся ненайденным: 404 на странице — это `missingPage`,
// та же самая, что отвечает на неизвестный адрес выше. Иначе у сайта
// оказалось бы две разные страницы «не найдено» — смотря по тому, дошёл
// запрос до маршрута или споткнулся раньше на `express.static`.
const fail = (req, res, status, message) =>
  wantsJson(req)
    ? res.status(status).json({ error: message })
    : html(res, status, status === 404 ? missingPage() : errorPage({ status, message }));

app.use((error, req, res, next) => {
  // Ответ уже пошёл — дописывать в него нечего, и попытка обернётся вторым
  // падением поверх первого. Дальше разбирается express.
  if (res.headersSent) return next(error);
  if (error instanceof multer.MulterError) {
    return fail(req, res, 400, 'That file is too big to send us.');
  }
  if (error instanceof HttpError) {
    // Ответ посетителю сам по себе следа не оставляет: во время аварии
    // у Replicate в логе иначе не будет вообще ничего.
    if (error.status >= 500) console.error(error);
    return fail(req, res, error.status, error.message);
  }
  // express.static с fallthrough: false сообщает об отсутствующем файле статусом 404,
  // а о попытке выйти за пределы каталога — 403. И то и другое — ошибка запроса,
  // а не сервера; отвечаем одинаково, чтобы наружу не уходило, чем именно путь не понравился.
  const status = error?.status ?? error?.statusCode;
  if (status >= 400 && status < 500) {
    return fail(req, res, 404, FILE_NOT_FOUND);
  }
  console.error(error);
  // Текст один на оба формата и потому написан для человека: «Server error.»
  // на странице читается как обломок отладки, а лишнего он не говорит —
  // подробности аварии остаются в логе.
  fail(req, res, 500, 'Something went wrong on our side. Try again in a moment.');
});

// Витрина без токена работает целиком — своих вызовов к Replicate у неё нет,
// — поэтому старт продолжается, но молчать об этом нельзя: приёмка отвечает
// отказом, и без строчки в логе разбираться пришлось бы по 503.
if (!apiToken()) console.warn('REPLICATE_API_TOKEN не задан: витрина работает, приёмка отвечает 503.');

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';
app.listen(port, host, () => console.log(`Replicate Image Upscaler: http://${host}:${port}`));
