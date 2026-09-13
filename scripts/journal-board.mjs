// Доска журнала: то же, что печатает `journal-rollup.mjs`, но одной страницей,
// на которую можно смотреть весь день, не вчитываясь. Заведена под конкретный
// вопрос — «сработала ли ссылка, выложенная наружу», — и отвечает на него
// четырьмя числами вверху и полосами по часам под ними: всплеск после выкладки
// видно глазом, а таблицы под ним говорят, откуда пришли и что унесли.
//
//   node scripts/journal-board.mjs --pull --open     # боевой журнал
//   node scripts/journal-board.mjs --days 7          # то, что уже лежит рядом
//
// Отдельный файл, а не флаг `--html` у сводки: сводка отвечает на два десятка
// вопросов и печатается в терминал, где длина ничего не стоит. Здесь вопрос
// один, и цена другая — всё, что не помещается на экран за один взгляд,
// мешает. Правила чтения журнала общие и лежат в `journal-read.mjs`.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deviceOf, foreign, imageIndex, readDays, visitsOf } from './journal-read.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const at = args.indexOf(`--${name}`);
  return at < 0 ? fallback : args[at + 1];
};
const flag = name => args.includes(`--${name}`);

const PULL = flag('pull');
const DAYS = Number(option('days', 1));
// Боевой журнал приезжает в свой каталог, а не поверх `log/`: рядом лежат дни
// разработки, где реферер — `localhost`, а посетитель — сам разработчик.
// Смешать их значит посчитать себя за пришедшего с Reddit.
const DIRECTORY = path.resolve(ROOT, option('dir', PULL ? 'log/prod' : process.env.LOG_DIR || 'log'));
const OUT = path.resolve(ROOT, option('out', 'log/board.html'));
const SOURCE = option('from', 'root@145.223.96.83:/opt/apps/upscaler/log/');

if (PULL) {
  fs.mkdirSync(DIRECTORY, { recursive: true });
  console.log(`журнал с боевой машины → ${path.relative(ROOT, DIRECTORY)}`);
  execFileSync('rsync', ['-az', SOURCE, `${DIRECTORY}/`], { stdio: 'inherit' });
}

// ── счёт ───────────────────────────────────────────────────────

const { records, days } = await readDays(DIRECTORY, DAYS);
if (!records.length) {
  console.log(`журнал пуст: ${DIRECTORY}`);
  process.exit(0);
}

// Указатель файлов витрины — чтобы называть работу именем, а не адресом файла.
// Без картинок на диске (журнал притянут, а коллекция нет) доска обязана
// собраться всё равно: тогда в таблице уноса останутся пути.
let byUrl = new Map();
try {
  ({ byUrl } = await imageIndex());
} catch (error) {
  console.error(`витрина не прочлась, работы будут названы путями: ${error.message}`);
}

const visits = visitsOf(records);
const people = visits.filter(visit => !visit.bot);
const humanKeys = new Set(people.map(visit => visit.key));
const human = records.filter(record => humanKeys.has(record.key));

const pages = human.filter(record => record.kind === 'page' && record.status < 400);
const takes = human.filter(
  record => record.kind === 'image' && record.dest !== 'image' && (record.status === 200 || record.status === 304)
);

// Ссылка, выложенная наружу, узнаётся по реферу. Но узнаётся не всегда:
// из приложения Reddit переход приходит без реферера вовсе, и такой заход
// неотличим от набранного руками. Поэтому рядом с числом «с Reddit» на доске
// всегда стоит число «без реферера» — вместе они и есть граница правды.
const REDDIT = /(^|\.)reddit\.com|(^|\.)redd\.it/i;
const fromReddit = people.filter(visit => visit.lines.some(line => REDDIT.test(line.ref)));
const coldEntries = [];
for (const visit of people) {
  const seen = visit.lines.filter(line => line.kind === 'page' && line.status < 400);
  if (seen.length) coldEntries.push({ ref: seen[0].ref, first: seen[0].path, pages: seen.length });
}
const noRef = coldEntries.filter(entry => entry.ref === '-').length;
const alone = coldEntries.filter(entry => entry.pages === 1).length;

const rank = (counts, limit = 8) => [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
function tally(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return counts;
}

// Часы последнего дня, в местном времени того, кто смотрит: журнал пишется
// в UTC, а вопрос «когда пошёл народ» задаётся про свои часы на стене.
// Заход относится к часу своей первой строки, а не каждой.
const last = days.at(-1);
const hours = new Array(24).fill(0);
for (const visit of people) {
  if (!visit.key.startsWith(last)) continue;
  hours[new Date(visit.lines[0].time).getHours()] += 1;
}

// ── страница ───────────────────────────────────────────────────

const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
// Экранируется всё без исключения: реферер, путь и заголовок браузера пишет
// в журнал посторонний, и `field()` в `journal.js` вырезает из них только
// табуляцию с переводом строки — угловые скобки доходят сюда как есть.
const safe = value => String(value).replace(/[&<>"]/g, character => ENTITIES[character]);

const number = (value, label, note = '') =>
  `<div class="n"><b>${value}</b><span>${safe(label)}</span>${note ? `<i>${safe(note)}</i>` : ''}</div>`;

function table(title, rows, note = '') {
  const body = rows.length
    ? rows.map(([name, value]) => `<tr><td>${safe(name)}</td><td>${safe(value)}</td></tr>`).join('')
    : '<tr><td colspan="2">—</td></tr>';
  return `<section><h2>${safe(title)}</h2><table>${body}</table>${note ? `<p>${safe(note)}</p>` : ''}</section>`;
}

const peak = Math.max(1, ...hours);
const clock = hours
  .map(
    (value, hour) =>
      `<div class="h"><div class="bar" style="height:${Math.round((100 * value) / peak)}%"></div>` +
      `<span>${value || ''}</span><small>${hour}</small></div>`
  )
  .join('');

// Имя работы, а если файла нет в указателе витрины — хотя бы имя файла.
// Второе случается штатно: журнал притянут с боевой машины, а коллекция рядом
// своя, и набор кадров у них расходится. Полный путь в таблице занимал бы
// строку целиком ради приставки, одинаковой у всех.
const nameOf = record => byUrl.get(record.path)?.slug ?? path.basename(record.path);
const window = days.length === 1 ? days[0] : `${days[0]} … ${days.at(-1)}`;

const page = `<!doctype html>
<html lang="ru">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Журнал — ${safe(window)}</title>
<style>
  body { font: 15px/1.5 system-ui, sans-serif; max-width: 46rem; margin: 0 auto; padding: 2rem 1rem 4rem; color: #1a1a1a; }
  h1 { font-size: 1.1rem; font-weight: 600; margin: 0; }
  h1 span { font-weight: 400; color: #777; }
  h2 { font-size: .8rem; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: #777; margin: 2rem 0 .5rem; }
  .row { display: flex; flex-wrap: wrap; gap: 1.5rem; margin-top: 1.25rem; }
  .n { min-width: 6rem; }
  .n b { display: block; font-size: 2rem; font-weight: 600; line-height: 1.1; }
  .n span { font-size: .85rem; color: #555; }
  .n i { display: block; font-size: .75rem; font-style: normal; color: #999; }
  .clock { display: flex; align-items: flex-end; gap: 2px; height: 7rem; margin-top: .5rem; }
  .h { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; height: 100%; }
  .bar { width: 100%; background: #1a1a1a; min-height: 1px; }
  .h span { font-size: .7rem; color: #555; order: -1; }
  .h small { font-size: .65rem; color: #aaa; padding-top: .25rem; }
  table { border-collapse: collapse; width: 100%; }
  td { border-top: 1px solid #eee; padding: .35rem 0; vertical-align: top; }
  td:last-child { text-align: right; color: #555; white-space: nowrap; padding-left: 1rem; }
  section p, footer { font-size: .8rem; color: #999; margin: .5rem 0 0; }
  footer { margin-top: 2.5rem; border-top: 1px solid #eee; padding-top: .75rem; }
</style>
<h1>Журнал <span>${safe(window)}</span></h1>

<div class="row">
  ${number(people.length, 'заходов людей', `машин ${visits.length - people.length}`)}
  ${number(pages.length, 'страниц', `${(pages.length / (people.length || 1)).toFixed(1)} на заход`)}
  ${number(fromReddit.length, 'с Reddit', `без реферера ${noRef}`)}
  ${number(takes.length, 'унесли файлов', `ушли с первой же ${alone} из ${coldEntries.length}`)}
</div>

<h2>Заходы по часам, ${safe(last)} (местное время)</h2>
<div class="clock">${clock}</div>

${table(
  'Откуда пришли',
  rank(tally(pages.filter(record => foreign(record.ref)).map(record => record.ref))),
  'Чужой реферер у страницы. Переходы внутри витрины сюда не идут.'
)}
${table('Что смотрели', rank(tally(pages.map(record => record.path))))}
${table('Что унесли', rank(tally(takes.map(nameOf))))}
${table('Чем смотрели', rank(tally(people.map(visit => deviceOf(visit.lines[0].ua)))))}

<footer>
  Строк ${records.length}, из них у людей ${human.length}. Боты отброшены правилом из
  <code>journal-read.mjs</code>; проверять его — <code>journal-rollup.mjs --sample 10</code>.
  Собрано ${safe(new Date().toISOString().slice(0, 16).replace('T', ' '))} UTC — страница не обновляется сама.
</footer>
</html>
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, page);
console.log(`доска: ${OUT}`);
console.log(`  люди ${people.length}, страниц ${pages.length}, с Reddit ${fromReddit.length}, унесли ${takes.length}`);

if (flag('open')) {
  try {
    execFileSync('xdg-open', [OUT], { stdio: 'ignore' });
  } catch {
    // Открывалки может не быть — на сервере или в голой системе. Путь напечатан
    // строкой выше, и этого достаточно; падать из-за этого нечестно.
  }
}
