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
const REQUIRED = ['ref', 'slug', 'title', 'alt', 'added'];
const OPTIONAL = ['tags', 'license', 'source'];

const problems = [];
const complain = (where, what) => problems.push(`${where}: ${what}`);

const text = value => typeof value === 'string' && value.trim().length > 0;

// Происхождение музейной работы. Читатель страницы имеет право проверить, что
// мы не выдумали ни музей, ни автора, поэтому `page` обязателен: без адреса
// первоисточника остальные поля — просто наши слова.
function checkSource(where, source) {
  if (typeof source !== 'object' || source === null || Array.isArray(source)) {
    return complain(where, '`source` должен быть объектом');
  }
  if (!text(source.holder)) complain(where, '`source.holder` пуст — чьё это собрание');
  if (!text(source.page)) complain(where, '`source.page` пуст — где это проверить');
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
  if ('source' in work) checkSource(where, work.source);
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
