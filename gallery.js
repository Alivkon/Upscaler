// Где лежат изображения и что из них показано в коллекции.
//
// Источников два, и сливаются они здесь. Кураторские работы описаны словами
// в `catalogue/`, а их файлы делает соседний репозиторий `wallpaper-gen`
// и перечисляет в `images/manifest/`; соединяются две половины по `ref`.
// Присланные посетителями работы описаны списком `images/gallery.json`:
// порядок записей в файле и есть их порядок на странице. Файлы при этом
// не копируются — запись ссылается на уже существующий файл в одном
// из известных каталогов.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { DEFAULT_LICENSE, LICENSES, loadWorks } from './works.js';
// Номер работы и её адрес считаются одинаково на сервере и в браузере: то же
// правило применяет приёмка к готовому файлу, и разойтись они не должны.
import { accession, workRef } from './public/record.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const IMAGES_DIR = path.join(__dirname, 'images');
export const STORAGE_DIR = path.resolve(__dirname, process.env.INTERNAL_IMAGE_STORAGE_DIR || 'images/storage');
export const GENERATED_DIR = path.join(IMAGES_DIR, 'generated');

const GALLERY_DIR = path.join(IMAGES_DIR, 'gallery');
const SHARED_DIR = path.join(IMAGES_DIR, 'shared');
// Кураторские работы: сюда пишет `wallpaper-gen`.
const PLATES_DIR = path.join(IMAGES_DIR, 'plates');
// Работа до реставрации. Лежит отдельно, потому что это не экспонат: показать
// её можно только рядом с самой работой, и в коллекцию она не попадает.
const BEFORE_DIR = path.join(IMAGES_DIR, 'before');
const GALLERY_INDEX_FILE = path.join(IMAGES_DIR, 'gallery.json');
// Что о своих файлах сообщает их изготовитель. Пишется туда же, куда картинки,
// и путешествует вместе с ними: без картинок манифест не значит ничего.
//
// Каталог, а не файл: изготовителей несколько. `wallpaper-gen` рисует плашки,
// он же кроит музейные сканы, и однажды добавится третий. Каждый владеет ровно
// одним файлом и переписывает только его — общий файл они затирали бы по
// очереди, и последний запуск оставлял бы от коллекции свою десятую часть.
const MANIFEST_DIR = path.join(IMAGES_DIR, 'manifest');
// Сколько соседних работ показать внизу страницы работы. Не размер указателя:
// указатель показывает всё. Это лента «ещё из коллекции», и она ограничена,
// потому что стоит ниже сгиба и соревнуется за внимание с самой работой.
export const ADJACENT = 10;
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

// Каталоги, на которые может ссылаться запись индекса. Заодно ограничивает
// список допустимых путей: всё, чего здесь нет, индекс показать не сможет.
// `gallery` и `shared` остались только для чтения — новые записи туда не пишутся,
// но у работающих установок там лежат уже опубликованные работы.
//
// Пула `storage` здесь нет намеренно: там лежат файлы Depositphotos и Adobe
// Stock, публиковать которые нельзя никогда (LEGAL.md). Пока он был в списке,
// индекс мог на них сослаться, а `promoteNextStorageImage` подставлял их
// в коллекцию сам, раз в пять минут.
const GALLERY_FOLDERS = {
  gallery: GALLERY_DIR,
  generated: GENERATED_DIR,
  shared: SHARED_DIR,
  plates: PLATES_DIR,
  before: BEFORE_DIR
};

const imageUrl = file => `/images/${file.split('/').map(encodeURIComponent).join('/')}`;

export function isImage(filename) {
  return IMAGE_EXTENSIONS.has(path.extname(filename).toLowerCase());
}

export async function ensureImageDirectories() {
  const directories = [...Object.values(GALLERY_FOLDERS), STORAGE_DIR];
  await Promise.all(directories.map(directory => fs.mkdir(directory, { recursive: true })));
}

async function listImageFiles(directory) {
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
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

// Запись индекса — это `<каталог>/<файл>`. Возвращает null, если каталог
// неизвестен или в пути есть что-то кроме имени файла: индекс редактируется
// руками, и он не должен уметь выдать произвольный файл с диска.
function resolveEntryPath(entryFile) {
  const separator = entryFile.indexOf('/');
  if (separator < 0) return null;
  const directory = GALLERY_FOLDERS[entryFile.slice(0, separator)];
  const name = entryFile.slice(separator + 1);
  if (!directory || !name || name.includes('/') || !isImage(name)) return null;
  return path.join(directory, name);
}

// Переход со старой схемы: до появления индекса витрина строилась из содержимого
// каталогов по времени изменения файла. Пока файла индекса нет, повторяем тот
// порядок, который посетитель видит прямо сейчас; на диск он попадёт при первом
// изменении витрины и дальше уже никуда не уплывёт.
async function buildIndexFromDisk() {
  const found = [];
  for (const [folder, source] of [
    ['gallery', 'llm'],
    ['shared', 'shared']
  ]) {
    for (const file of await listImageFiles(GALLERY_FOLDERS[folder])) {
      found.push({ file: `${folder}/${file.name}`, source, modified: file.modified });
    }
  }
  return found
    .sort((a, b) => b.modified - a.modified)
    .map(({ file, source, modified }) => ({ file, source, added: new Date(modified).toISOString() }));
}

// Чтение ничего не пишет: запись идёт только через `updateGalleryIndex`, иначе
// перенос со старой схемы мог бы затереть одновременное изменение витрины.
async function readGalleryIndex() {
  let parsed;
  try {
    parsed = JSON.parse(await fs.readFile(GALLERY_INDEX_FILE, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return buildIndexFromDisk();
  }
  // Индекс правится руками: строка без `file` не должна ронять всю витрину.
  return Array.isArray(parsed) ? parsed.filter(entry => typeof entry?.file === 'string') : [];
}

// Изменения идут по очереди: два одновременных запроса, прочитавшие индекс
// до записи, иначе затрут работу друг друга. `change` возвращает новый список
// или null, если менять нечего.
let galleryIndexQueue = Promise.resolve();
function updateGalleryIndex(change) {
  const done = galleryIndexQueue.then(async () => {
    const entries = await readGalleryIndex();
    const next = change(entries);
    if (!next) return null;
    await fs.writeFile(GALLERY_INDEX_FILE, JSON.stringify(next, null, 2));
    return next;
  });
  galleryIndexQueue = done.catch(() => {});
  return done;
}

// Необязательное поле `before` записи индекса: работа до реставрации. Есть она
// не у всех — у присланного посетителем исходника не остаётся вовсе (загрузка
// живёт в памяти, см. `multer.memoryStorage` в server.js), — поэтому страница
// работы предлагает сравнение только там, где сравнивать действительно с чем.
async function beforeUrl(entry) {
  if (typeof entry.before !== 'string') return null;
  const filePath = resolveEntryPath(entry.before);
  if (!filePath || !(await fs.stat(filePath).catch(() => null))) return null;
  return imageUrl(entry.before);
}

// Манифест — то, что о файлах сообщает их изготовитель: какие файлы сделаны,
// с какими настоящими размерами и какие у каждого есть копия для показа
// и файл «до». Пишет его `wallpaper-gen`, по файлу на изготовителя.
//
// Сайт имён файлов не складывает и размеров не измеряет. Складывал бы —
// два репозитория однажды разошлись бы в правилах, и страница сослалась бы
// на несуществующий файл. Измерял бы — заявил бы размер, которого у файла
// нет: работа не всегда выходит той, какой её просили, музейный скан
// кончается там, где кончается скан музея.
//
// Манифестов может не быть вовсе: в свежей копии `images/` пуст, пока
// не отработал генератор. Тогда кураторских работ на сайте просто нет —
// страница с изображением, которого нет, хуже отсутствующей страницы.
async function readManifest() {
  let names;
  try {
    names = await fs.readdir(MANIFEST_DIR);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  const parts = await Promise.all(
    names
      .filter(name => name.endsWith('.json'))
      .map(async name => JSON.parse(await fs.readFile(path.join(MANIFEST_DIR, name), 'utf8')))
  );
  return parts.filter(Array.isArray).flat();
}

// Файл из манифеста существует не всегда: манифест мог пережить каталог
// картинок. Проверяем перед тем, как обещать адрес.
const madeFile = async entry => (entry && (await fs.stat(path.join(IMAGES_DIR, entry.file)).catch(() => null))) || null;

// Кадры, которые генератор режет из плиты. Плита при этом остаётся целой
// и по-прежнему отдаётся: кроит их машина, а знает своё устройство только
// тот, кто скачивает.
//
//   phone — 9:19.5, проём страницы работы и то, что отдаёт Download
//   tall  — 9:16, карточка указателя
//   wide  — 16:9, рабочий стол; лежит молча, спросят — есть
//
// Кадры настоящими файлами, а не `object-fit: cover`: в поиск по картинкам
// попадает файл из `src`, а не то, каким его показал CSS. Обрезанная стилями
// горизонтальная картина приходит в выдачу горизонтальной — то есть ровно
// не тем, по какому запросу коллекция и собрана.
//
// Кадра может не быть: генератор доходит до работы не сразу, а работа
// с отсутствующим кадром должна показываться плитой, а не пропадать
// с витрины. Поэтому каждый проверяется на диске отдельно.
const CROP_KINDS = ['phone', 'tall', 'wide'];

async function cropsOf(entry) {
  const found = {};
  for (const kind of CROP_KINDS) {
    const crop = entry?.crops?.[kind];
    if (!(await madeFile(crop))) continue;
    const copies = [];
    for (const copy of crop.copies || []) {
      if (await madeFile(copy)) copies.push({ url: imageUrl(copy.file), width: copy.width, height: copy.height });
    }
    found[kind] = {
      url: imageUrl(crop.file),
      filename: path.basename(crop.file),
      width: crop.width,
      height: crop.height,
      bytes: crop.bytes,
      copies
    };
  }
  return found;
}

// Та же картина, обработанная иначе. Появились 22.08.2026: на листе `/edits`
// у 35 работ из 76 отмечено несколько версий сразу, и ответ Charlie был «if
// several are picked then i want all the versions» — то есть выбирать между
// ними не надо, надо выпустить все.
//
// СТРАНИЦА ОСТАЁТСЯ ОДНА. Версия — это не отдельная работа: у неё та же
// картина, тот же художник, тот же музейный номер и тот же запрос в поиске.
// Разведи их по двум адресам, и витрина начнёт соревноваться сама с собой за
// одну выдачу — ровно то, чем уже плохи два Хаммерсхёя (vl-0258 и vl-0260).
// Поэтому версии живут на странице главной как файлы рядом.
//
// Кадры у версии те же три, и берутся они так же: файла может не быть, если
// генератор до него не дошёл, и тогда версия молчит, а не роняет страницу.
async function versionsOf(entry) {
  const found = [];
  for (const variant of entry?.variants || []) {
    if (!(await madeFile(variant))) continue;
    found.push({
      treatment: variant.treatment,
      url: imageUrl(variant.file),
      filename: path.basename(variant.file),
      width: variant.width,
      height: variant.height,
      bytes: variant.bytes,
      crops: await cropsOf(variant)
    });
  }
  return found;
}

// Кураторские работы. Порядок — каталога, а не манифеста: манифест про файлы,
// а порядок на указателе — про развеску.
//
// Откуда берутся сведения о файле — и в каком порядке.
//
// СНАЧАЛА МАНИФЕСТ. Он знает не только размеры, но и копии для показа, файл
// «до» и кадры; сам файл не знает ничего, кроме себя. Порядок был обратный —
// поле `file` появилось у одной работы, а потом его проставили всем разом,
// и ветка манифеста перестала выполняться вовсе. Заметить это глазом нельзя:
// страница выглядит правильной, просто в `src` встаёт плита, а `srcset`
// не выходит совсем. Стоило это 156 работ из 164 показанных и 497 МБ картинок
// на указателе вместо десятков килобайт — измерено.
//
// Поле `file` осталось запасным путём и работает: по нему живут 8 недавних
// работ, добавленных руками до того, как до них дошёл генератор. Такая запись
// описывает один файл и только его — ни копий, ни кадров у неё нет, — поэтому
// размеры приходится мерить, и это единственное место, где сайт картинку
// измеряет. Правило «сайт картинок не мерит» (AGENTS.md) тем и держится,
// что путь этот запасной: как только генератор доходит до работы, она уходит
// на манифест и мерить её перестают.
async function catalogueItems() {
  const made = new Map((await readManifest()).map(entry => [entry.ref, entry]));
  const items = [];
  for (const work of await loadWorks()) {
    let file, width, height, bytes, copies, before, crops, versions;
    const plate = made.get(work.ref);
    if (await madeFile(plate)) {
      const beforeEntry = (await madeFile(plate.before)) && plate.before;
      const plateCopies = [];
      for (const copy of plate.copies || []) if (await madeFile(copy)) plateCopies.push(copy);
      file = plate.file;
      width = plate.width;
      height = plate.height;
      bytes = plate.bytes;
      copies = plateCopies.map(copy => ({ url: imageUrl(copy.file), width: copy.width, height: copy.height }));
      before = beforeEntry ? imageUrl(beforeEntry.file) : null;
      crops = await cropsOf(plate);
      versions = await versionsOf(plate);
    } else if (typeof work.file === 'string') {
      const filePath = resolveEntryPath(work.file);
      const stat = filePath && (await fs.stat(filePath).catch(() => null));
      if (!stat) continue;
      const meta = await sharp(filePath)
        .metadata()
        .catch(() => ({}));
      if (!meta.width || !meta.height) continue;
      file = work.file;
      width = meta.width;
      height = meta.height;
      bytes = stat.size;
      copies = [];
      before = null;
      crops = {};
      versions = [];
    } else {
      continue;
    }
    items.push({
      ref: accession(work.ref),
      slug: work.slug,
      url: imageUrl(file),
      filename: path.basename(file),
      title: work.title,
      alt: work.alt,
      // Пустой список, а не `undefined`: в каталоге поле необязательно
      // (verify-catalogue.mjs), а страница работы читает у него длину. Работа
      // без тегов роняла бы `/w/<slug>` в 500, и проверка каталога этого
      // не видит — она о содержимом записи, а не о форме работы на выходе.
      tags: work.tags || [],
      // Откуда работа: страна у чужой, `Tessarum` у своей. Выводится не из
      // тегов на лету, а лежит полем в каталоге — теги для этого не годятся:
      // `japan` и `japanese` там до сих пор разные, и одна и та же страна
      // называлась бы на карточках по-разному.
      origin: work.origin,
      // Снята ли работа с витрины. Решает это каталог, а не отсутствие файла:
      // работа без файла просто не показывается и это авария, а скрытая —
      // решение, и оно записано словом.
      hidden: work.hidden === true,
      width,
      height,
      bytes,
      // Чем страница работу показывает. Отдаёт она всё равно `url`: копии
      // существуют только ради проёма, в котором работа стоит, и в разметке
      // объявлены лишь как варианты `srcset`.
      copies,
      // Кадры под телефон, указатель и рабочий стол. Пустой объект, а не
      // `undefined`: страница спрашивает у него кадр по имени, и работа,
      // до которой генератор ещё не дошёл, роняла бы `/w/<slug>` в 500.
      crops,
      // Та же картина в других обработках. Пустой список у почти всех: версий
      // несколько только там, где на листе отметили несколько.
      versions,
      // Чем обработана та версия, что стоит в проёме. Нужна странице только
      // затем, чтобы назвать её вслух рядом с остальными: список «ещё версии»
      // без имени показанной — это выбор из трёх, где четвёртый не назван.
      treatment: plate?.treatment || null,
      // День, когда работа вошла в коллекцию, — для `lastmod` в карте сайта.
      // Берётся из каталога, а не из `mtime` файла: рендер детерминирован,
      // но переписывает файл при каждом запуске.
      added: work.added || null,
      // Работа до реставрации и размеры, с которых она восстановлена. Размеры
      // взяты из самого файла «до», а не из настроек: страница утверждает ими
      // факт, и утверждать она должна измеренное.
      before,
      from: null,
      license: LICENSES[work.license || DEFAULT_LICENSE],
      // Откуда работа взялась, если взялась не у нас. Есть только у чужих:
      // у своих создатель — сайт, и повторять это в каждой записи незачем.
      provenance: work.provenance || null,
      source: 'tessarum'
    });
  }
  return items;
}

// Присланные работы. Заголовок и `alt` им пишет машина: посетитель не станет
// писать ни того, ни другого, а страница без них — пустая для поиска. Текст
// механический и потому слабый, но он не врёт и не требует ничьей работы.
// Пополнения тут больше не будет, пока публикация закрыта (LEGAL.md).
async function uploadedItems() {
  const entries = await readGalleryIndex();
  const items = [];
  for (const entry of entries) {
    const filePath = resolveEntryPath(entry.file);
    const stat = filePath && (await fs.stat(filePath).catch(() => null));
    if (!stat) continue;
    const { width = 0, height = 0 } = await sharp(filePath)
      .metadata()
      .catch(() => ({}));
    if (!width || !height) continue;
    items.push({
      ref: accession(entry.file),
      slug: workRef(entry.file),
      url: imageUrl(entry.file),
      filename: path.basename(entry.file),
      // Размеры сюда не входят: их дописывает страница, как и заголовкам
      // из каталога, — иначе они встанут в `<title>` дважды.
      title: 'Restored wallpaper',
      alt: `Restored wallpaper at ${width} × ${height}`,
      tags: [],
      // Присланную работу не прячут, а не публикуют: список закрыт, и всё,
      // что в нём есть, в нём есть намеренно. Поле стоит ради одинаковой формы
      // записи — страница спрашивает его у всех, не разбирая происхождения.
      hidden: false,
      // Кадров нет: их режет генератор из плиты, а присланный файл лежит таким,
      // каким пришёл. Версий по той же причине: обработку выбирают работе, а
      // присланный файл не наш, чтобы его обрабатывать.
      crops: {},
      versions: [],
      width,
      height,
      bytes: stat.size,
      // Копий для показа у присланной работы нет: рендер её не делал, а файл
      // лежит такой, каким пришёл. Страница покажет сам файл.
      copies: [],
      // У записей индекса дата стоит с самого начала — её пишет публикация.
      added: typeof entry.added === 'string' ? entry.added : null,
      // Второго кадра у присланной работы нет: перерисовать её нечем, она
      // не наша и рисовалась не нами.
      desktop: null,
      before: await beforeUrl(entry),
      from: null,
      // Лицензии нет: работа не наша, и условий на неё мы назначить не можем.
      license: null,
      provenance: null,
      source: entry.source === 'shared' ? 'shared' : 'llm'
    });
  }
  return items;
}

// Каталог идёт первым: это то, за что мы отвечаем сами и ради чего заведена
// коллекция. Присланные работы — закрытый список позади него, и ничего
// не вытесняют: постраничность у указателя, а не окно на десять мест.
export async function galleryItems() {
  return [...(await catalogueItems()), ...(await uploadedItems())];
}

// Вызывать сейчас некому: маршрут публикации в server.js отказывает, пока не
// пройден чек-лист из LEGAL.md. Функция оставлена целой, чтобы включение было
// снятием отказа, а не восстановлением по памяти того, как индекс пополняется.
//
// Бросает ошибку с `code: 'ENOENT'`, если публиковать нечего.
export async function publishGeneratedImage(filename) {
  await fs.access(path.join(GENERATED_DIR, filename));
  const entryFile = `generated/${filename}`;
  return updateGalleryIndex(entries =>
    entries.some(entry => entry.file === entryFile)
      ? null
      : [{ file: entryFile, source: 'shared', added: new Date().toISOString() }, ...entries]
  );
}
