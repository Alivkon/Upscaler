// Какие файлы коллекции нужны боевой машине. Печатает по имени в строке,
// путь — от `images/`; читается это `rsync --files-from`.
//
// Список, а не «скопировать `images/` целиком», по двум причинам. Первая —
// объём: на машине разработчика в `plates/` и `crops/` лежит вдвое больше
// файлов, чем показано, — черновики, отвергнутые кадры, промежуточные размеры.
// Вторая важнее: `express.static` отдаёт из `images/` что угодно по прямому
// адресу, без ссылки со страницы. Всё, что приехало на сервер, — опубликовано,
// даже если ни одна страница на это не ссылается.
//
// Скрытые работы (`hidden`) в список входят. Скрытая работа снята с витрины,
// но `/w/<slug>` по-прежнему отвечает (works.js), и без файлов эта страница
// вышла бы с битыми картинками — хуже, чем не показывать её вовсе.
//
// Имён файлов здесь не складывают: всё берётся из манифеста, который пишет
// `wallpaper-gen` рядом с картинками (AGENTS.md, «Изображения и файлы»).
// Сложили бы — однажды отправили бы список имён, которых на диске нет,
// и rsync смолчал бы о половине коллекции.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadWorks } from '../works.js';

const IMAGES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'images');
const MANIFEST_DIR = path.join(IMAGES_DIR, 'manifest');

// Запись манифеста описывает дерево: сама плита, её уменьшенные копии, кадры
// под каждое устройство со своими копиями и версии обработки. Все они —
// отдельные файлы, и на странице встречается любой из них.
function collect(node, into) {
  if (!node) return;
  if (node.file) into.add(node.file);
  for (const copy of node.copies || []) if (copy.file) into.add(copy.file);
  for (const crop of Object.values(node.crops || {})) collect(crop, into);
  for (const version of node.versions || []) collect(version, into);
}

const manifests = new Map();
for (const name of await fs.readdir(MANIFEST_DIR)) {
  if (path.extname(name) !== '.json') continue;
  for (const entry of JSON.parse(await fs.readFile(path.join(MANIFEST_DIR, name), 'utf8'))) {
    manifests.set(entry.ref, entry);
  }
}

const files = new Set();
const orphans = [];
for (const work of await loadWorks()) {
  const entry = manifests.get(work.ref);
  // Работа без манифеста — не ошибка: запись могли завести раньше картинки.
  // Но сказать об этом нужно, иначе она уедет на сервер молча и не покажется.
  if (!entry) {
    orphans.push(work.ref);
    if (work.file) files.add(work.file);
    continue;
  }
  collect(entry, files);
  if (work.before) files.add(work.before);
}

// Манифест едет целиком: без него сервер не знает ни размеров, ни кадров,
// а весит он мегабайты против гигабайтов картинок.
for (const name of await fs.readdir(MANIFEST_DIR)) {
  if (path.extname(name) === '.json') files.add(`manifest/${name}`);
}

const missing = [];
for (const file of files) {
  try {
    await fs.stat(path.join(IMAGES_DIR, file));
  } catch {
    missing.push(file);
  }
}

for (const file of [...files].filter(file => !missing.includes(file)).sort()) {
  console.log(file);
}

// Жалобы — в stderr, чтобы не попасть в список, который читает rsync.
if (orphans.length) console.error(`без манифеста: ${orphans.join(', ')}`);
if (missing.length)
  console.error(`манифест ссылается на отсутствующие файлы (${missing.length}):\n${missing.join('\n')}`);
