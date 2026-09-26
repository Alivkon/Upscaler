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
import 'dotenv/config';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { appleShare, deviceOf, foreign, imageIndex, readDays, visitsOf } from './journal-read.mjs';
import { TYPES, searchReport } from './search-console.mjs';

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

// Снимок Search Console лежит рядом с журналом и берётся тем же `--pull`.
// Не ответил Google — доска собирается с прошлым снимком: у него своя дата
// на странице, и выдать старое за свежее он не может.
const GOOGLE = path.join(DIRECTORY, 'search-console.json');
if (PULL) {
  const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT;
  if (!keyFile) {
    console.log('Search Console пропущена: в .env нет GOOGLE_SERVICE_ACCOUNT (как завести — .env.example)');
  } else {
    try {
      fs.writeFileSync(GOOGLE, JSON.stringify(await searchReport(keyFile), null, 2));
      console.log(`Search Console → ${path.relative(ROOT, GOOGLE)}`);
    } catch (error) {
      console.error(`Search Console не получена, на доске прошлый снимок: ${error.message}`);
    }
  }
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
// Ссылка с меткой `?source=reddit` узнаётся и без реферера: метку пишет
// журнал (`sourceOf` в `journal.js`).
const REDDIT = /(^|\.)reddit\.com|(^|\.)redd\.it/i;
const fromReddit = people.filter(visit => visit.lines.some(line => REDDIT.test(line.ref) || line.source === 'reddit'));
const coldEntries = [];
for (const visit of people) {
  const seen = visit.lines.filter(line => line.kind === 'page' && line.status < 400);
  if (seen.length) coldEntries.push({ ref: seen[0].ref, first: seen[0].path, pages: seen.length });
}
const noRef = coldEntries.filter(entry => entry.ref === '-').length;

// Превью Apple — по всем заходам, а не по людям: сборщик Apple машина,
// хоть и позванная человеком. Единица — страница в заходе: та же ссылка,
// вставленная дважды за минуту, приходит двумя строками, а превью у неё одно.
const shared = [
  ...new Set(visits.flatMap(visit => visit.lines.filter(appleShare).map(line => `${visit.key} ${line.path}`)))
].map(key => key.split(' ')[1]);
const alone = coldEntries.filter(entry => entry.pages === 1).length;

// Перезапуск сервера посреди дня виден по составу столбцов. Соль `visit`
// живёт в памяти процесса (`journal.js`) и не переживает перезапуск: тот же
// посетитель после него получает другой хэш и считается вторым заходом.
// Промолчать об этом нельзя — число заходов в такой день завышено, и завышено
// невидимо. Признак косвенный (столбец добавляют не каждый перезапуск), зато
// не требует ничего, кроме самого журнала, и в день выкладки срабатывает.
function mixed(day) {
  const file = path.join(DIRECTORY, `${day}.tsv`);
  const text = fs.readFileSync(file, 'utf8');
  const shapes = new Set(
    text
      .split('\n')
      .filter(Boolean)
      .map(line => line.split('\t').length)
  );
  return shapes.size > 1;
}

const rank = (counts, limit = 8) => [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
function tally(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return counts;
}

// Restore — платный маршрут, и потолков у него три (`RULES` в `limits.js`):
// пять в час с браузера, десять в сутки с адреса, пятьдесят в сутки на всех.
// Всплеск из одной ссылки упирается в последний, и после него каждый пришедший
// получает 429, а витрина при этом выглядит живой — узнать об отказах можно
// только отсюда. Считаются все запросы, а не только люди: потолок тратит
// любой, кто дошёл. Какой из трёх потолков сработал, журнал не пишет —
// у строки есть код ответа, а не правило, которое его дало.
const upscales = records.filter(record => record.kind === 'api' && record.path.startsWith('/api/upscale'));
const refused = upscales.filter(record => record.status === 429).length;
const OUTCOMES = { 200: 'сделано', 429: 'отказ по потолку', 503: 'выключено', 400: 'не тот файл' };
const outcomes = rank(tally(upscales.map(record => OUTCOMES[record.status] ?? `код ${record.status}`)));

const misses = rank(tally(records.filter(record => record.kind === 'miss').map(record => record.path)));

// Отдано — по всем строкам, потому что канал тратят и машины. Число это нижняя
// граница, и граница известной природы: оборванная загрузка строки не оставляет
// вовсе — `res.on('finish')` в `journal.js` на оборванном ответе не срабатывает.
// Проверено 13.09.2026: файл в 15 МБ, отданный целиком, записан, а тот же файл,
// оборванный на 102 КБ, — нет.
const sent = list => list.reduce((sum, record) => sum + (Number(record.bytes) || 0), 0);
const size = bytes =>
  bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(2)} ГБ` : `${(bytes / 1024 ** 2).toFixed(1)} МБ`;
const traffic = [
  ['всего', size(sent(records))],
  ['картинки', size(sent(records.filter(record => record.kind === 'image')))],
  ['страницы', size(sent(records.filter(record => record.kind === 'page')))],
  ['из всего — машинам', size(sent(records.filter(record => !humanKeys.has(record.key))))]
];

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

// Google — отдельной частью под журналом и со своими датами. Сутки у Search
// Console отстают на три дня, у журнала — нет, так что одно слово «неделя»
// у них значит разные дни: числа стоят рядом, но не складываются и не делятся
// друг на друга.
let google = null;
try {
  google = JSON.parse(fs.readFileSync(GOOGLE, 'utf8'));
} catch {
  // Снимка нет — ключ не заведён или доска собрана без `--pull`. Часть Google
  // тогда говорит об этом сама, а не исчезает молча.
}

const SEARCH = { image: 'в картинках', web: 'в вебе' };
const at = row => (row?.impressions ? row.position.toFixed(1) : '—');
const seen = row => `${row.impressions} пок. · ${row.clicks} пер. · поз. ${at(row)}`;
const byShows = rows =>
  [...rows]
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 8)
    .map(row => [row.keys[0], seen(row)]);

function googlePart() {
  if (!google) {
    return (
      '<h1 class="part">Google</h1><p class="fresh">Снимка Search Console нет. ' +
      'Нужен ключ сервисного аккаунта в <code>GOOGLE_SERVICE_ACCOUNT</code>, как завести — <code>.env.example</code>; ' +
      'берётся он при <code>yarn stats</code>.</p>'
    );
  }
  const { from, to } = google.window;
  const totals = TYPES.map(type => {
    const total = google[type].total;
    return number(
      total?.impressions ?? 0,
      `показов ${SEARCH[type]}`,
      `переходов ${total?.clicks ?? 0}, позиция ${at(total)}`
    );
  }).join('');
  // Дни без показов Google не присылает вовсе, поэтому ряд дат строится
  // из окна, а не из ответа: пропавший день должен читаться нулём.
  const dates = [];
  for (let day = new Date(from); day <= new Date(to); day.setUTCDate(day.getUTCDate() + 1)) {
    dates.push(day.toISOString().slice(0, 10));
  }
  const shows = (type, date) => google[type].byDay.find(row => row.keys[0] === date)?.impressions ?? 0;
  const perDay = dates.map(date => [date, TYPES.map(type => `${SEARCH[type]} ${shows(type, date)}`).join(' · ')]);
  const pathOf = rows => byShows(rows).map(([url, value]) => [new URL(url).pathname, value]);
  return `<h1 class="part">Google <span>${safe(from)} … ${safe(to)}</span></h1>
<p class="fresh">Search Console, снимок на ${safe(new Date(google.fetched).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }))}. Сутки Google отстают на три дня, поэтому окно здесь своё, а не как у журнала выше. Позиция — средняя строка выдачи, 1 — первая.</p>
<div class="row">${totals}</div>
${table('Показы по дням', perDay)}
${TYPES.map(
  type =>
    table(
      `Запросы ${SEARCH[type]}`,
      byShows(google[type].byQuery),
      'Редкие запросы Google не называет, поэтому здесь показов меньше, чем в итоге.'
    ) + table(`Страницы ${SEARCH[type]}`, pathOf(google[type].byPage))
).join('\n')}`;
}

const page = `<!doctype html>
<html lang="ru">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Журнал — ${safe(window)}</title>
<style>
  body { font: 15px/1.5 system-ui, sans-serif; max-width: 46rem; margin: 0 auto; padding: 2rem 1rem 4rem; color: #1a1a1a; }
  h1 { font-size: 1.1rem; font-weight: 600; margin: 0; }
  h1 span { font-weight: 400; color: #777; }
  h1.part { margin-top: 3rem; padding-top: 1.5rem; border-top: 2px solid #1a1a1a; }
  .fresh { font-size: .8rem; color: #777; margin: .25rem 0 0; }
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
  .warn { font-size: .8rem; color: #8a6d3b; background: #fcf8e3; border: 1px solid #f3e6c4; padding: .5rem .7rem; margin-top: 1rem; }
  footer { margin-top: 2.5rem; border-top: 1px solid #eee; padding-top: .75rem; }
</style>
<h1>Журнал <span>${safe(window)}</span></h1>
<p class="fresh">Снимок на ${safe(new Date().toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }))} — сама страница не обновляется. Свежие числа: <code>yarn stats</code> в терминале.</p>

<div class="row">
  ${number(people.length, 'заходов людей', `машин ${visits.length - people.length}`)}
  ${number(pages.length, 'страниц', `${(pages.length / (people.length || 1)).toFixed(1)} на заход`)}
  ${number(fromReddit.length, 'с Reddit', `без реферера ${noRef}`)}
  ${number(takes.length, 'унесли файлов', `ушли с первой же ${alone} из ${coldEntries.length}`)}
  ${number(shared.length, 'превью Apple')}
</div>

${
  mixed(last)
    ? '<p class="warn">В этот день менялся состав столбцов журнала — сервер перезапускали. ' +
      'Соль <code>visit</code> перезапуск не переживает, поэтому посетитель, заходивший до и после, ' +
      'посчитан здесь дважды: заходов не больше, чем показано, а меньше.</p>'
    : ''
}

${
  refused
    ? `<p class="warn">Restore отказал по потолку ${refused} раз — посетители упёрлись в лимит. ` +
      'Какой из трёх потолков, журнал не пишет; числа — <code>RULES</code> в <code>limits.js</code>.</p>'
    : ''
}

<h2>Заходы по часам, ${safe(last)} (местное время)</h2>
<div class="clock">${clock}</div>

${table(
  'Из каких стран',
  // Страна берётся у захода, а не у строки: заход — это один посетитель,
  // и считать его столько раз, сколько он попросил картинок, значит мерить
  // не людей, а страницы. Прочерк назван словами: у строк, записанных до
  // появления столбца, страны нет и быть не может, и в таблице это должно
  // читаться как «нечем ответить», а не как маленькая страна.
  rank(tally(people.map(visit => (visit.lines[0].country === '-' ? 'не определилась' : visit.lines[0].country)))),
  'Считается из адреса в памяти запроса; сам адрес в журнал не попадает.'
)}
${table(
  'Откуда пришли',
  rank(tally(pages.filter(record => foreign(record.ref)).map(record => record.ref))),
  'Чужой реферер у страницы. Переходы внутри витрины сюда не идут.'
)}
${table(
  'По метке ссылки',
  // Заход, а не строка: метка стоит только на первой странице, по которой
  // пришли, и дальше по витрине не тянется.
  rank(tally(people.map(visit => visit.lines.find(line => line.source !== '-')?.source).filter(Boolean))),
  'Наши ссылки с ?source= — Reddit, Tumblr, Pinterest. Видна и тогда, когда приложение не прислало реферер.'
)}
${table('Что смотрели', rank(tally(pages.map(record => record.path))))}
${table('Что унесли', rank(tally(takes.map(nameOf))))}
${table(
  'Превью Apple',
  rank(tally(shared)),
  'Страница, которую Apple взял для превью ссылки: iMessage, Заметки, Почта и шапка меню «Поделиться», даже если его закрыли. Значит «ссылка была в превью», а не «отправили».'
)}
${table(
  'Restore — /api/upscale',
  outcomes,
  'Все запросы, не только люди. Потолок на всех — 50 в сутки, и счётчик сервера обнуляется при перезапуске.'
)}
${table('Чем смотрели', rank(tally(people.map(visit => deviceOf(visit.lines[0].ua)))))}
${table(
  'Чего не нашли (404)',
  misses,
  'Все запросы. Пробы вроде /wp-login.php — машины; опечатка в ссылке из комментария похожа на путь работы.'
)}
${table('Отдано', traffic, 'Нижняя граница: оборванная загрузка строки в журнале не оставляет.')}

${googlePart()}

<footer>
  Строк ${records.length}, из них у людей ${human.length}. Боты отброшены правилом из
  <code>journal-read.mjs</code>; проверять его — <code>journal-rollup.mjs --sample 10</code>.
</footer>
</html>
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, page);
console.log(`доска: ${OUT}`);
console.log(
  `  люди ${people.length}, страниц ${pages.length}, с Reddit ${fromReddit.length}, унесли ${takes.length}, отказов Restore ${refused}`
);

if (flag('open')) {
  try {
    execFileSync('xdg-open', [OUT], { stdio: 'ignore' });
  } catch {
    // Открывалки может не быть — на сервере или в голой системе. Путь напечатан
    // строкой выше, и этого достаточно; падать из-за этого нечестно.
  }
}
