// Сводка по журналу запросов. Журнал пишет признаки (`journal.js`), выводы
// делаются здесь — и потому переделываются на тех же данных, сколько угодно раз.
// Чтение, заходы и привязка файлов к работам живут в `journal-read.mjs`.
//
//   node scripts/journal-rollup.mjs [--days 7] [--dir log] [--sample 10]
//
// `--sample` печатает случайные заходы целиком, чтобы разметить их рукой:
// правило «бот или человек» — это правило «да/нет», и без ручных ярлыков
// его точность и полнота неизвестны, а от него зависит каждое число выше.
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
const DAYS = Number(option('days', 7));
const DIRECTORY = path.resolve(ROOT, option('dir', process.env.LOG_DIR || 'log'));
const SAMPLE = Number(option('sample', 0));

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

const { records, days } = await readDays(DIRECTORY, DAYS);
if (!records.length) {
  console.log(`журнал пуст: ${DIRECTORY}`);
  process.exit(0);
}
const { byUrl, total, slugs } = await imageIndex();
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

// Заход — одно устройство, поэтому берётся первая строка захода, а не все.
table(rank(tally(people.map(visit => deviceOf(visit.lines[0].ua)))), 'Чем смотрели (заходов)');

table(
  rank(tally(human.filter(record => record.kind === 'page' && record.status < 400).map(record => record.path))),
  'Что смотрели (страниц)'
);

const outside = human.filter(record => record.kind === 'page' && foreign(record.ref));
table(rank(tally(outside.map(record => record.ref.split('/')[0]))), 'Откуда пришли (переходов)');

// ── с чего начинали и ушли ли сразу ────────────────────────────

// Страницы наглухо не кэшируются: `res.send` ставит ETag (`server.js`, `html`),
// и повторный показ приходит на сервер как 304. Значит, в заходе видны все
// страницы, а не только первая, и «ушёл с первой же» — измерение, а не догадка.
// Заходы без страницы вовсе сюда не идут: это прямая ссылка на файл, у неё
// ни входа, ни ухода нет.
const entries = [];
for (const visit of people) {
  // Порядок строк в заходе — порядок записи, то есть времени: журнал пишется
  // дописыванием в файл дня, и первая страница захода лежит первой.
  const pages = visit.lines.filter(line => line.kind === 'page' && line.status < 400);
  if (pages.length) entries.push({ first: pages[0].path, pages: pages.length });
}
if (entries.length) {
  const alone = entries.filter(entry => entry.pages === 1).length;
  const share = Math.round((100 * alone) / entries.length);
  console.log(`\nВход: ${entries.length} заходов со страницей, ушли с первой же ${alone} (${share} %)`);
  table(rank(tally(entries.map(entry => entry.first))), 'С чего начинали (заходов)');
}

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
// Кадр и версия — два вопроса, и таблицы поэтому две. Стояли они в одной,
// пока от второй версии индексировался один адрес: строки `scan` и `dim`
// были там про плиту, а про кадры второй версии не было ничего.
table(rank(tally(takes.map(record => byUrl.get(record.path)?.version ?? 'не из витрины'))), 'Что уносили: версия');
table(rank(tally(takes.map(record => byUrl.get(record.path)?.slug ?? record.path))), 'Что уносили: работа');
table(rank(tally(takes.map(record => deviceOf(record.ua)))), 'Что уносили: устройство');
table(rank(tally(takes.map(record => record.dest))), 'Чем брали (Sec-Fetch-Dest)');

// ── путь работы: показали, разглядывали, унесли ─────────────────

// Три числа на работу, каждое из своего рода строк: страница — `page`,
// разглядывание — мастер-файл, пришедший картинкой (лайтбокс), унос — тот же
// файл, пришедший не картинкой (кнопка). Работа, которую смотрят и не уносят,
// — это тот отбор, которого не даёт ни один слепой круг: здесь выбирают
// посторонние и ногами. Числа будут крошечными месяцами; смотреть на них
// стоит рядом, а не каждое по себе.
const funnel = new Map();
const bump = (slug, column) => {
  if (!slug) return;
  if (!funnel.has(slug)) funnel.set(slug, { views: 0, shows: 0, takes: 0 });
  funnel.get(slug)[column]++;
};
for (const record of human) {
  if (record.kind === 'page' && record.status < 400 && record.path.startsWith('/w/'))
    bump(record.path.slice(3), 'views');
}
for (const record of shows) bump(byUrl.get(record.path)?.slug, 'shows');
for (const record of takes) bump(byUrl.get(record.path)?.slug, 'takes');

const walked = [...funnel].sort((a, b) => b[1].views - a[1].views || b[1].takes - a[1].takes).slice(0, 10);
table(
  walked.map(([slug, counts]) => [slug, `${counts.views} → ${counts.shows} → ${counts.takes}`]),
  'Путь работы: страница → во весь экран → унесли'
);

// ── какие форматы картинок просят ──────────────────────────────

// Доля AVIF решает, платит ли за себя перекладывание кадров: берут почти все —
// экономия на каждом заходе; берёт половина — придётся держать два набора
// файлов, и тогда дешевле не трогать.
//
// Прочерк значит два разных «нет»: либо день записан до появления столбца,
// либо браузер современных форматов не назвал вовсе. Разделить их нечем,
// поэтому они считаются отдельной строкой, а не растворяются в процентах.
const pictures = human.filter(record => record.kind === 'image');
const named = pictures.filter(record => record.formats !== '-');
table(rank(tally(named.map(record => record.formats))), `Форматы, которые просят (из ${pictures.length} запросов)`);
if (pictures.length > named.length)
  console.log(`  без столбца или без современных форматов: ${pictures.length - named.length}`);

// ── наши картинки на чужих страницах ───────────────────────────

// У картинки реферер — это страница, в которую она вставлена. Чужой реферер
// значит, что файл показывают не у нас: для витрины, которой нужно, чтобы её
// находили, это канал, а не только кража. Считаются все, а не только люди:
// вставляют и роботы.
const embeds = records.filter(record => record.kind === 'image' && foreign(record.ref));
table(rank(tally(embeds.map(record => record.ref))), 'Наши картинки на чужих страницах (запросов)');

// ── что обошли краулеры ────────────────────────────────────────

// Search Console отвечает на это медленно и не целиком, а журнал — точно:
// какие страницы работ краулер действительно забирал. Считается по имени из
// столбца `bot`, подтверждённым и нет одинаково: кто ходил — это имя, а подлог
// стоит отдельной строкой выше.
const crawl = new Map();
for (const visit of bots) {
  for (const line of visit.lines) {
    if (line.kind !== 'page' || line.status >= 400 || !line.path.startsWith('/w/')) continue;
    if (!crawl.has(visit.why)) crawl.set(visit.why, new Set());
    crawl.get(visit.why).add(line.path.slice(3));
  }
}
table(
  [...crawl]
    .map(([name, seen]) => [name, seen.size])
    .sort((a, b) => b[1] - a[1])
    .map(([name, size]) => [name, `${size} из ${slugs.length}`]),
  `Страниц работ обошли (витрина — ${slugs.length})`
);
const untouched = slugs.filter(slug => ![...crawl.values()].some(seen => seen.has(slug)));
if (untouched.length) console.log(`  не забирал никто: ${untouched.length}, первая — ${untouched[0]}`);

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
