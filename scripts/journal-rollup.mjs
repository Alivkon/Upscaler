// Сводка по журналу запросов. Журнал пишет признаки (`journal.js`), выводы
// делаются здесь — и потому переделываются на тех же данных, сколько угодно раз.
//
//   node scripts/journal-rollup.mjs [--days 7] [--dir log] [--sample 10]
//
// `--sample` печатает случайные заходы целиком, чтобы разметить их рукой:
// правило «бот или человек» — это правило «да/нет», и без ручных ярлыков
// его точность и полнота неизвестны, а от него зависит каждое число выше.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COLUMNS } from '../journal.js';
import { galleryItems } from '../gallery.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const at = args.indexOf(`--${name}`);
  return at < 0 ? fallback : args[at + 1];
};
const DAYS = Number(option('days', 7));
const DIRECTORY = path.resolve(ROOT, option('dir', process.env.LOG_DIR || 'log'));
const SAMPLE = Number(option('sample', 0));

// ── чтение ─────────────────────────────────────────────────────

async function readDays() {
  let names;
  try {
    names = (await fs.readdir(DIRECTORY)).filter(name => name.endsWith('.tsv')).sort();
  } catch {
    console.error(`журнала нет: ${DIRECTORY}`);
    process.exit(1);
  }
  const wanted = names.slice(-DAYS);
  const records = [];
  for (const name of wanted) {
    const text = await fs.readFile(path.join(DIRECTORY, name), 'utf8');
    for (const line of text.split('\n')) {
      if (!line) continue;
      const parts = line.split('\t');
      if (parts.length < COLUMNS.length) continue;
      const record = Object.fromEntries(COLUMNS.map((column, at) => [column, parts[at]]));
      // Хвост заголовка браузера мог содержать табуляцию — собираем обратно.
      if (parts.length > COLUMNS.length) record.ua = parts.slice(COLUMNS.length - 1).join(' ');
      record.day = name.slice(0, 10);
      record.key = `${record.day}/${record.visit}`;
      record.ms = Number(record.ms);
      record.status = Number(record.status);
      records.push(record);
    }
  }
  return { records, days: wanted.map(name => name.slice(0, 10)) };
}

// ── что за файл спросили ───────────────────────────────────────

// Адрес картинки → работа, кадр и место на указателе. Считается из той же
// `galleryItems()`, из которой собирается сама витрина: второй список имён
// файлов разошёлся бы с первым молча (AGENTS.md).
async function imageIndex() {
  const shown = (await galleryItems()).filter(item => !item.hidden);
  const byUrl = new Map();
  shown.forEach((item, position) => {
    const put = (url, frame, full) => byUrl.set(decodeURI(url), { slug: item.slug, frame, full, position });
    put(item.url, 'plate', true);
    for (const copy of item.copies) put(copy.url, 'plate', false);
    for (const [frame, cut] of Object.entries(item.crops || {})) {
      if (!cut) continue;
      put(cut.url, frame, true);
      for (const copy of cut.copies || []) put(copy.url, frame, false);
    }
    if (item.scan) put(item.scan.url, 'scan', true);
  });
  return { byUrl, total: shown.length };
}

// ── кто приходил ───────────────────────────────────────────────

// Заход — это все строки одного `visit` за день. Правило грубое и заведомо
// неточное; его и проверяют `--sample` и ручные ярлыки.
//
// Три признака, по убыванию надёжности. Назвался краулером — краулер, и спорить
// не о чем. Забрал страницу и не забрал к ней ни файла — не браузер: браузер
// просит `styles.css` и карточки в ту же секунду, а качалка берёт разметку
// и уходит. Не прислал языка вовсе — признак слабый, сам по себе не судит.
function classify(lines) {
  const declared = lines.map(line => line.bot).find(bot => bot && bot !== '-' && bot !== 'noua');
  const pages = lines.filter(line => line.kind === 'page').length;
  const props = lines.filter(line => line.kind === 'asset' || line.kind === 'image').length;
  const noua = lines.some(line => line.bot === 'noua');
  if (declared) return { bot: true, why: declared.split(':')[0], fake: declared.endsWith(':fake') };
  if (noua) return { bot: true, why: 'без заголовка' };
  if (pages > 0 && props === 0) return { bot: true, why: 'молча' };
  return { bot: false, why: 'человек' };
}

function visitsOf(records) {
  const groups = new Map();
  for (const record of records) {
    if (!groups.has(record.key)) groups.set(record.key, []);
    groups.get(record.key).push(record);
  }
  return [...groups].map(([key, lines]) => ({ key, lines, ...classify(lines) }));
}

// ── печать ─────────────────────────────────────────────────────

const rank = (counts, limit = 10) => [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);

function tally(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return counts;
}

function table(rows, title) {
  console.log(`\n${title}`);
  if (!rows.length) return console.log('  —');
  const width = Math.max(...rows.map(([name]) => String(name).length));
  for (const [name, value] of rows) console.log(`  ${String(name).padEnd(width)}  ${value}`);
}

const percentile = (numbers, share) =>
  numbers.length
    ? numbers.slice().sort((a, b) => a - b)[Math.min(numbers.length - 1, Math.floor(numbers.length * share))]
    : 0;

// ── сводка ─────────────────────────────────────────────────────

const { records, days } = await readDays();
if (!records.length) {
  console.log(`журнал пуст: ${DIRECTORY}`);
  process.exit(0);
}
const { byUrl, total } = await imageIndex();
const visits = visitsOf(records);
const people = visits.filter(visit => !visit.bot);
const bots = visits.filter(visit => visit.bot);
// Множество, а не поиск по списку на каждую строку: заходов тысячи, строк
// десятки тысяч, и на месяце это перебор в миллиарды сравнений — сводка
// выглядела бы зависшей.
const humanKeys = new Set(people.map(visit => visit.key));
const human = records.filter(record => humanKeys.has(record.key));

console.log(`Журнал: ${days[0]} … ${days.at(-1)} (${days.length} дн.), строк ${records.length}`);

const humanPages = human.filter(record => record.kind === 'page' && record.status < 400).length;
console.log(
  `\nЗаходов ${visits.length}: людей ${people.length}, машин ${bots.length}. ` +
    `Страниц у людей ${humanPages}, на заход ${(humanPages / (people.length || 1)).toFixed(1)}`
);

table(rank(tally(bots.map(visit => visit.why))), 'Машины: кто (заходов)');
const fakes = bots.filter(visit => visit.fake);
if (fakes.length) console.log(`  из них не подтвердились обратным DNS: ${fakes.length}`);

table(
  rank(tally(human.filter(record => record.kind === 'page' && record.status < 400).map(record => record.path))),
  'Что смотрели (страниц)'
);

// Свой реферер — это переход внутри сайта, и он отвечает на другой вопрос,
// чем «откуда пришли». Поэтому разделены.
const outside = human.filter(
  record =>
    record.kind === 'page' &&
    record.ref !== '-' &&
    !record.ref.startsWith('tessarum') &&
    !record.ref.startsWith('127.0.0.1') &&
    !record.ref.startsWith('localhost')
);
table(rank(tally(outside.map(record => record.ref.split('/')[0]))), 'Откуда пришли (переходов)');

// ── глубина по указателю ───────────────────────────────────────

// Карточки указателя помечены `loading="lazy"`: браузер просит их по мере
// прокрутки, и самая дальняя запрошенная карточка — это то, докуда посетитель
// дошёл. Прокрутка мерится без единой строки на клиенте.
//
// Но откладывает браузер не всегда, и 12.09.2026 это померено дважды, с
// противоположным исходом. Chrome под управлением расширения, на чистой
// загрузке и при `scrollY === 0`, запросил все 117 карточек в ту же секунду,
// что и страницу: полностраничный снимок разворачивает окно на всю высоту,
// и откладывать становится нечего — то есть измеряющий инструмент испортил
// измерение. Настоящий заход руками в том же журнале выглядит иначе: 101
// карточка указателя, пришедшая пачками по 3–10 штук за пятьдесят секунд.
//
// Поэтому глубина не утверждается, а проверяется по самим данным, заходу
// на заход: пришли карточки одним залпом со страницей — мерить нечем и число
// было бы выдумкой; растянулись во времени — откладывание работает, и глубина
// осмысленна. Правило переживёт и смену поведения браузеров.
const indexVisits = [];
for (const visit of people) {
  // Карточка — картинка, у которой реферер сам указатель. Не «страница есть
  // в этом же заходе»: страница могла прийти из кэша браузера и до сервера
  // не дойти вовсе, а карточки — дойти.
  const cards = visit.lines
    .filter(line => line.kind === 'image' && /\/$/.test(line.ref) && byUrl.has(line.path))
    .map(line => ({ at: Date.parse(line.time), position: byUrl.get(line.path).position }));
  if (!cards.length) continue;
  const opened = Math.min(...cards.map(card => card.at));
  indexVisits.push({
    cards: cards.length,
    spread: Math.max(...cards.map(card => card.at)) - opened,
    depth: Math.max(...cards.map(card => card.position)) + 1
  });
}

if (indexVisits.length) {
  // Залп — всё в пределах секунды. Секунда, а не ноль, потому что время
  // в журнале с точностью до секунды и есть.
  const burst = indexVisits.filter(visit => visit.spread <= 1000);
  const spread = indexVisits.filter(visit => visit.spread > 1000);
  const cards = Math.round(indexVisits.reduce((sum, visit) => sum + visit.cards, 0) / indexVisits.length);
  console.log(`\nУказатель: ${indexVisits.length} заходов, карточек на заход ${cards} из ${total}`);
  if (burst.length) console.log(`  одним залпом со страницей: ${burst.length} — у этих прокрутку мерить нечем`);
  if (spread.length) {
    const depths = spread.map(visit => visit.depth).sort((a, b) => a - b);
    console.log(
      `  прокрутка видна у ${spread.length}: медиана ${percentile(depths, 0.5)}-я карточка, четверть дошла дальше ${percentile(depths, 0.75)}-й`
    );
    // Кэш карточек живёт час (`setImageHeaders`): второй заход в тот же час
    // не просит ни одной и сюда не попадает. Недосчёт, а не переучёт.
  }
} else {
  console.log('\nУказатель: заходов с карточками нет');
}

// ── что уносили ────────────────────────────────────────────────

const takes = human.filter(
  record => record.kind === 'image' && record.dest !== 'image' && (record.status === 200 || record.status === 304)
);
const shows = human.filter(
  record => record.kind === 'image' && record.dest === 'image' && byUrl.get(record.path)?.full
);
console.log(`\nУнесли ${takes.length} файлов; открыли во весь экран ${shows.length}`);
table(rank(tally(takes.map(record => byUrl.get(record.path)?.frame ?? 'не из витрины'))), 'Что уносили: кадр');
table(rank(tally(takes.map(record => byUrl.get(record.path)?.slug ?? record.path))), 'Что уносили: работа');
table(rank(tally(takes.map(record => record.dest))), 'Чем брали (Sec-Fetch-Dest)');

// ── чего не нашли и сколько ждали ──────────────────────────────

table(rank(tally(records.filter(record => record.kind === 'miss').map(record => record.path))), 'Чего не нашли (404)');

for (const [name, folder] of [
  ['плиты', '/images/plates/'],
  ['кадры', '/images/crops/']
]) {
  const times = human
    .filter(record => record.path.startsWith(folder) && record.status === 200)
    .map(record => record.ms);
  if (!times.length) continue;
  console.log(
    `\n${name}: ${times.length} отдач, ` +
      `p50 ${percentile(times, 0.5).toFixed(0)} мс, p75 ${percentile(times, 0.75).toFixed(0)} мс, p95 ${percentile(times, 0.95).toFixed(0)} мс`
  );
}

// ── образец для ручной разметки ────────────────────────────────

if (SAMPLE > 0) {
  console.log(`\n── ${SAMPLE} заходов для ручной разметки ──`);
  // Тасуется по Фишеру — Йетсу, а не `sort(() => Math.random() - 0.5)`.
  // Тот сравнитель непоследователен, и перемешиванием не является: почти все
  // элементы остаются близко к своим местам. Список идёт в порядке файла,
  // от старого дня к новому, — то есть в размеченный рукой образец попадали
  // бы в основном самые ранние заходы окна. От этого образца зависят точность
  // и полнота правила «бот или человек», а перекос в нём по самим числам
  // не виден.
  const picked = visits.slice();
  for (let at = picked.length - 1; at > 0; at -= 1) {
    const swap = Math.floor(Math.random() * (at + 1));
    [picked[at], picked[swap]] = [picked[swap], picked[at]];
  }
  picked.length = Math.min(SAMPLE, picked.length);
  for (const visit of picked) {
    const first = visit.lines[0];
    console.log(`\n${visit.key} — правило говорит «${visit.bot ? visit.why : 'человек'}», строк ${visit.lines.length}`);
    console.log(`  язык ${first.lang}, браузер ${first.ua.slice(0, 90)}`);
    for (const line of visit.lines.slice(0, 12))
      console.log(`  ${line.time.slice(11)} ${line.kind} ${line.status} ${line.path.slice(0, 70)}`);
    if (visit.lines.length > 12) console.log(`  … ещё ${visit.lines.length - 12}`);
  }
}
