// Где лежат изображения и что из них показано в коллекции.
//
// Источников два, и сливаются они здесь. Кураторские работы описаны каталогом
// `works.js`, который лежит в git; файлы к ним детерминированно отрисовывает
// `scripts/render-plates.mjs`. Присланные посетителями работы описаны списком
// `images/gallery.json`: порядок записей в файле и есть их порядок на странице.
// Файлы при этом не копируются — запись ссылается на уже существующий файл
// в одном из известных каталогов.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { DEFAULT_LICENSE, LICENSES, WORKS, beforeFile, plateFile } from './works.js';
// Номер работы и её адрес считаются одинаково на сервере и в браузере: то же
// правило применяет приёмка к готовому файлу, и разойтись они не должны.
import { accession, workRef } from './public/record.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const IMAGES_DIR = path.join(__dirname, 'images');
export const STORAGE_DIR = path.resolve(__dirname, process.env.INTERNAL_IMAGE_STORAGE_DIR || 'images/storage');
export const GENERATED_DIR = path.join(IMAGES_DIR, 'generated');

const GALLERY_DIR = path.join(IMAGES_DIR, 'gallery');
const SHARED_DIR = path.join(IMAGES_DIR, 'shared');
// Кураторские работы: сюда пишет `scripts/render-plates.mjs`.
const PLATES_DIR = path.join(IMAGES_DIR, 'plates');
// Работа до реставрации. Лежит отдельно, потому что это не экспонат: показать
// её можно только рядом с самой работой, и в коллекцию она не попадает.
const BEFORE_DIR = path.join(IMAGES_DIR, 'before');
const GALLERY_INDEX_FILE = path.join(IMAGES_DIR, 'gallery.json');
// Размер страницы указателя, а не размер коллекции: из коллекции ничего
// не уходит. Адрес, переставший существовать, теряет всё, что накопил
// в поиске, — а накопить его и есть цель (research/2026-08-16-indexable-collection.md).
export const PAGE_SIZE = 10;
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

// Кураторские работы. Отрисованного файла может не быть — в свежей копии
// репозитория `images/` пуст, — и такая работа просто не показывается: страница
// с изображением, которого нет, хуже отсутствующей страницы.
async function catalogueItems() {
  const items = [];
  for (const work of WORKS) {
    const file = `plates/${plateFile(work)}`;
    const stat = await fs.stat(path.join(PLATES_DIR, plateFile(work))).catch(() => null);
    if (!stat) continue;
    const hasBefore = await fs.stat(path.join(BEFORE_DIR, beforeFile(work))).catch(() => null);
    items.push({
      ref: accession(work.ref),
      slug: work.slug,
      url: imageUrl(file),
      filename: plateFile(work),
      title: work.title,
      alt: work.alt,
      tags: work.tags,
      width: work.dims[0],
      height: work.dims[1],
      bytes: stat.size,
      before: hasBefore ? imageUrl(`before/${beforeFile(work)}`) : null,
      from: hasBefore ? work.from : null,
      license: LICENSES[work.license || DEFAULT_LICENSE],
      source: 'vellum'
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
      width,
      height,
      bytes: stat.size,
      before: await beforeUrl(entry),
      from: null,
      // Лицензии нет: работа не наша, и условий на неё мы назначить не можем.
      license: null,
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
