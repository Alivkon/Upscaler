// Проверка каталога. Заменяет `node --check works.js`: записи стали данными,
// и синтаксис JavaScript про них больше ничего не говорит.
//
// Проверяется то, что ломается молча. Опечатка в `titel` не уронит сервер —
// страница просто выйдет без заголовка; пропущенный в `order.json` файл
// не уронит ничего — работа просто не покажется. Дороже всех повторившийся
// `slug`: адрес после публикации не меняется, и обнаружить дубликат в тот
// момент, когда обе страницы уже в поиске, поздно.
//
// Сообщается всё найденное сразу, а не первая ошибка: каталог правят пачками,
// и чинить по одной строке за запуск — двадцать запусков.
import fs from 'node:fs/promises';
import path from 'node:path';
import { CATALOGUE_DIR, LICENSES, ORDER_FILE, REF_PATTERN, workFile } from '../works.js';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const CREATOR_KINDS = ['person', 'organization', 'unknown'];
const PROVENANCE = ['creator', 'creatorKind', 'date', 'work', 'credit', 'page'];
// `origin` обязателен, а не необязателен: заполнить его можно всегда — у чужой
// работы это страна, у своей `Tessarum`, — а карточка указателя называет его
// вслух, и работа без него вышла бы на витрину с пустым местом там, где
// у соседей написано откуда. Проверка нужна потому, что заметить это можно
// только глазами: пустая строка не роняет ни сервер, ни сборку.
const REQUIRED = ['ref', 'slug', 'title', 'alt', 'added', 'origin'];
const OPTIONAL = ['tags', 'license', 'provenance', 'file'];

const problems = [];
const complain = (where, what) => problems.push(`${where}: ${what}`);

const text = value => typeof value === 'string' && value.trim().length > 0;

// Происхождение чужой работы. Обязательны двое: автор и адрес, по которому
// сказанное можно проверить. Без автора страница молча приписывает гравюру
// нам — разметка `ImageObject` подставляет создателем сайт, — а без адреса
// остальные поля просто наши слова. `date`, `work` и `credit` необязательны:
// у листа из книги бывает не известно ничего, кроме автора.
function checkProvenance(where, provenance) {
  if (typeof provenance !== 'object' || provenance === null || Array.isArray(provenance)) {
    return complain(where, '`provenance` должен быть объектом');
  }
  if (!text(provenance.creator)) complain(where, '`provenance.creator` пуст — чья это работа');
  if (!text(provenance.page)) complain(where, '`provenance.page` пуст — где это проверить');
  // Лишние поля ловятся и здесь, а не только на верхнем уровне. Поле, которое
  // страница не читает, — это не пустяк: `anonymous: true` после переименования
  // в `creatorKind` выглядел бы как работающий признак, а разметка тем временем
  // объявляла бы «Unknown (Japan, Edo period)» живым человеком.
  for (const field of Object.keys(provenance)) {
    if (!PROVENANCE.includes(field)) complain(where, `лишнее поле \`provenance.${field}\``);
  }
  // Поле, а не разбор строки: имя автора — свободный текст, и «Unknown»,
  // «Anonymous», «Неизвестный мастер» пришлось бы перечислять. Одно поле
  // с тремя значениями, а не два флага: «человек», «организация» и «имени нет»
  // исключают друг друга, и парой булевых величин это выражается так, что
  // бывает истинно и то и другое сразу.
  if ('creatorKind' in provenance && !CREATOR_KINDS.includes(provenance.creatorKind)) {
    complain(
      where,
      `\`provenance.creatorKind\` = ${JSON.stringify(provenance.creatorKind)}, а бывает ${CREATOR_KINDS.join(', ')}`
    );
  }
}

function checkWork(ref, work) {
  const where = `${ref}.json`;
  if (typeof work !== 'object' || work === null || Array.isArray(work)) {
    return complain(where, 'запись должна быть объектом');
  }

  for (const field of REQUIRED) if (!text(work[field])) complain(where, `поле \`${field}\` пусто или не строка`);
  for (const field of Object.keys(work)) {
    if (!REQUIRED.includes(field) && !OPTIONAL.includes(field)) complain(where, `лишнее поле \`${field}\``);
  }

  if (work.ref !== ref) complain(where, `\`ref\` = ${JSON.stringify(work.ref)}, а файл называется ${ref}.json`);
  if (text(work.slug) && !SLUG_PATTERN.test(work.slug)) {
    complain(where, `\`slug\` = ${JSON.stringify(work.slug)}: только строчная латиница, цифры и дефис`);
  }
  if (text(work.added) && !DAY_PATTERN.test(work.added)) {
    complain(where, `\`added\` = ${JSON.stringify(work.added)}, а нужен ГГГГ-ММ-ДД`);
  }

  if ('tags' in work) {
    if (!Array.isArray(work.tags) || !work.tags.every(text)) complain(where, '`tags` — список непустых строк');
  }
  if ('license' in work && !(work.license in LICENSES)) {
    complain(where, `лицензия ${JSON.stringify(work.license)} не заведена в LICENSES (works.js)`);
  }
  if ('provenance' in work) checkProvenance(where, work.provenance);
}

const order = JSON.parse(await fs.readFile(ORDER_FILE, 'utf8'));
if (!Array.isArray(order)) {
  complain('order.json', 'должен быть массивом ссылок');
} else {
  const seen = new Set();
  for (const ref of order) {
    if (typeof ref !== 'string' || !REF_PATTERN.test(ref))
      complain('order.json', `недопустимый ref ${JSON.stringify(ref)}`);
    else if (seen.has(ref)) complain('order.json', `${ref} стоит в развеске дважды`);
    else seen.add(ref);
  }
}

const files = (await fs.readdir(CATALOGUE_DIR))
  .filter(name => name.endsWith('.json') && name !== path.basename(ORDER_FILE))
  .map(name => name.slice(0, -'.json'.length));

for (const ref of files)
  if (!REF_PATTERN.test(ref)) complain(`${ref}.json`, 'имя файла — это `ref`, а такого вида ref не бывает');

const hung = new Set(Array.isArray(order) ? order : []);
for (const ref of files)
  if (!hung.has(ref)) complain(`${ref}.json`, 'запись есть, а в order.json её нет — работа не покажется');
for (const ref of hung)
  if (!files.includes(ref)) complain('order.json', `${ref} висит в развеске, а записи ${ref}.json нет`);

const slugs = new Map();
for (const ref of files.filter(name => REF_PATTERN.test(name))) {
  let work;
  try {
    work = JSON.parse(await fs.readFile(workFile(ref), 'utf8'));
  } catch (error) {
    complain(`${ref}.json`, `не читается: ${error.message}`);
    continue;
  }
  checkWork(ref, work);
  if (text(work.slug)) {
    if (slugs.has(work.slug))
      complain(`${ref}.json`, `slug \`${work.slug}\` уже занят работой ${slugs.get(work.slug)}`);
    else slugs.set(work.slug, ref);
  }
}

if (problems.length) {
  for (const problem of problems) console.error(`  ${problem}`);
  console.error(`\nкаталог: ${problems.length} проблем в ${files.length} записях`);
  process.exit(1);
}
console.log(`каталог: ${files.length} записей, ${slugs.size} адресов, порядок задан`);
