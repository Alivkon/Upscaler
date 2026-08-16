// Где лежат изображения и что из них показано на витрине.
//
// Витрина описана явным списком `images/gallery.json`: порядок записей в файле
// и есть порядок карточек на странице. Файлы при этом не копируются — запись
// ссылается на уже существующий файл в одном из известных каталогов.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const IMAGES_DIR = path.join(__dirname, 'images');
export const STORAGE_DIR = path.resolve(__dirname, process.env.INTERNAL_IMAGE_STORAGE_DIR || 'images/storage');
export const GENERATED_DIR = path.join(IMAGES_DIR, 'generated');

const GALLERY_DIR = path.join(IMAGES_DIR, 'gallery');
const SHARED_DIR = path.join(IMAGES_DIR, 'shared');
const GALLERY_INDEX_FILE = path.join(IMAGES_DIR, 'gallery.json');
const GALLERY_SIZE = 10;
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

// Каталоги, на которые может ссылаться запись индекса. Заодно ограничивает
// список допустимых путей: всё, чего здесь нет, индекс показать не сможет.
// `gallery` и `shared` остались только для чтения — новые записи туда не пишутся,
// но у работающих установок там лежат уже опубликованные работы.
const GALLERY_FOLDERS = {
  storage: STORAGE_DIR,
  gallery: GALLERY_DIR,
  generated: GENERATED_DIR,
  shared: SHARED_DIR
};

export function isImage(filename) {
  return IMAGE_EXTENSIONS.has(path.extname(filename).toLowerCase());
}

export async function ensureImageDirectories() {
  await Promise.all(Object.values(GALLERY_FOLDERS).map(directory => fs.mkdir(directory, { recursive: true })));
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

export async function galleryItems() {
  const entries = await readGalleryIndex();
  const items = [];
  for (const entry of entries) {
    if (items.length === GALLERY_SIZE) break;
    const filePath = resolveEntryPath(entry.file);
    if (!filePath || !(await fs.stat(filePath).catch(() => null))) continue;
    items.push({
      id: entry.file,
      url: `/images/${entry.file.split('/').map(encodeURIComponent).join('/')}`,
      title: entry.source === 'shared' ? 'Работа сообщества' : 'Новая LLM-генерация',
      source: entry.source
    });
  }
  return items;
}

// Что из пула уже показывалось. До индекса продвижение было копированием
// в `gallery` с префиксом `llm-<время>-`, поэтому такие записи тоже считаются
// показанным исходником — иначе после переноса пул пошёл бы по второму кругу.
function shownStorageNames(entries) {
  const shown = new Set();
  for (const entry of entries) {
    shown.add(entry.file);
    if (entry.file.startsWith('gallery/')) {
      shown.add(`storage/${entry.file.slice('gallery/'.length).replace(/^llm-\d+-/, '')}`);
    }
  }
  return shown;
}

export async function promoteNextStorageImage() {
  const storage = await listImageFiles(STORAGE_DIR);
  return updateGalleryIndex(entries => {
    const shown = shownStorageNames(entries);
    const next = storage.find(file => !shown.has(`storage/${file.name}`));
    if (!next) return null;
    return [{ file: `storage/${next.name}`, source: 'llm', added: new Date().toISOString() }, ...entries];
  });
}

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
