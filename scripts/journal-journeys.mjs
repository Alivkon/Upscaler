// Заход как рассказ: что человек открыл, докуда долистал, что раскрыл
// и что унёс — по порядку, строка за строкой.
//
//   node scripts/journal-journeys.mjs [--days 7] [--dir log] [--day 2026-09-17] [--all]
//
// ЗАЧЕМ ОТДЕЛЬНО ОТ СВОДКИ. `journal-rollup.mjs` отвечает на вопросы «сколько»
// и «что чаще»; она складывает заходы в кучи и тем самым стирает порядок.
// А порядок — это единственное, из чего видно, почему унесли: пришёл ли человек
// по ссылке и сразу забрал первую карточку, или листал указатель десять минут
// и ушёл ни с чем. Числа сводки показывают, что происходит; здешние рассказы —
// почему. Чтение, заходы и привязка файлов к работам берутся из общего
// `journal-read.mjs`, и второго правила «что такое заход» здесь нет.
//
// ЭТО РЕКОНСТРУКЦИЯ, А НЕ ЗАПИСЬ ЭКРАНА. Сервер видит запросы, а не глаза.
// Три места, где рассказ заведомо беднее правды, и знать про них нужно каждому,
// кто будет по нему что-то решать:
//
//   — Карточка, уже лежащая в кэше браузера, второй раз не запрашивается.
//     Поэтому «смотрел указатель: N карточек» — это нижняя граница, и на
//     втором заходе в тот же день она почти всегда занижена.
//   — Карточки грузятся лениво и не по порядку, так что «дальняя N-я»
//     говорит, докуда докрутили, а промежуток между запросами — сколько
//     на этом месте задержались. Диапазон «с какой по какую» смысла не имеет
//     и потому не печатается.
//   — Уход со страницы не записывается никак. Последняя строка захода — это
//     последнее, что человек попросил, а не то, на чём он закончил смотреть.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deviceOf, foreign, imageIndex, ownVisit, readDays, taken, visitsOf } from './journal-read.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const at = args.indexOf(`--${name}`);
  return at < 0 ? fallback : args[at + 1];
};
const DAYS = Number(option('days', 7));
const DIRECTORY = path.resolve(ROOT, option('dir', process.env.LOG_DIR || 'log'));
const DAY = option('day', null);
const ALL = args.includes('--all');

// ── кого не показываем ─────────────────────────────────────────

// Два сита сверх `classify()`. Каждое — не «подозрительный», а доказанный
// не-человек или свой; сомнительных отсеивать здесь нельзя, ради них рассказ
// и читают. Сканеров, стучащихся в `/wp-admin/install.php`, среди людей уже
// нет: их забирает признак «одни 404» в `classify()`, и второго такого
// правила здесь быть не должно.
//
// Заголовок Googlebot Smartphone без слова `Googlebot`: тот самый
// `Nexus 5X Build/MMB29P`, которым Google представляется мобильным
// краулером. Настоящий телефон Nexus 5X вышел в 2015-м и до Chrome 152
// не доживёт, а этот приходит с тремя разными `visit` в одну секунду.
// Проверить обратным DNS нечего — адреса мы не храним, — поэтому судим
// по заголовку, и это единственное здешнее правило, которое когда-нибудь
// придётся пересмотреть.
const spoofed = visit => /Nexus 5X Build\/MMB29P/.test(visit.lines[0].ua);

// ── печать ─────────────────────────────────────────────────────

const seconds = time => Date.parse(time) / 1000;
const clock = time => time.slice(11, 19);
const span = length => (length < 90 ? `${length} с` : `${Math.round(length / 60)} мин`);

// Имя для человека, а не для адресной строки: подборка называется подборкой,
// а из имени работы уходит `-iphone-wallpaper` — он есть у каждой второй
// и в списке только мешает.
const title = url =>
  url.startsWith('/collection/')
    ? `подборку ${url.slice('/collection/'.length)}`
    : url.replace('/w/', '').replace(/-(iphone|desktop)-wallpaper$/, '');

// Строки захода в шаги. Карточки указателя копятся в один шаг, пока их
// не прервёт что-то другое: иначе тридцать запросов лениво подгруженных
// превью займут тридцать строк и похоронят под собой единственное скачивание.
function steps(visit, byUrl, total) {
  const out = [];
  let cards = null;
  const flush = () => {
    if (!cards) return;
    const held = Math.max(1, Math.round(seconds(cards.last) - seconds(cards.at)));
    out.push(
      `${clock(cards.at)}  листал указатель: ${cards.count} карточек, дальняя ${cards.deepest + 1}-я из ${total}, ${span(held)}`
    );
    cards = null;
  };
  for (const line of visit.lines) {
    const known = byUrl.get(line.path);
    if (line.kind === 'page' && line.status < 400) {
      flush();
      out.push(`${clock(line.time)}  открыл ${title(line.path)}`);
    } else if (line.kind === 'miss') {
      flush();
      out.push(`${clock(line.time)}  ${line.status} на ${line.path}`);
    } else if (taken(line)) {
      // Раньше карточек: карточку, открытую в новой вкладке, тоже унесли.
      flush();
      const what = known ? `${title('/w/' + known.slug)} (${known.frame})` : line.path;
      out.push(`${clock(line.time)}  УНЁС ${what}`);
    } else if (line.kind === 'image' && (line.dest === 'document' || line.dest === 'empty')) {
      // Хотел унести, но не получил целиком: 206 (просмотрщик iOS берёт
      // кусками) или ошибка. В «унёс» не идёт, но и пропадать не должно.
      flush();
      const what = known ? `${title('/w/' + known.slug)} (${known.frame})` : line.path;
      out.push(`${clock(line.time)}  пытался унести ${what}: ${line.status}`);
    } else if (line.kind === 'image' && known && !known.full) {
      if (!cards) cards = { at: line.time, deepest: -1, count: 0 };
      cards.deepest = Math.max(cards.deepest, known.position);
      cards.count++;
      cards.last = line.time;
    } else if (line.kind === 'image' && known?.full && line.dest === 'image') {
      flush();
      out.push(`${clock(line.time)}  раскрыл во весь экран ${title('/w/' + known.slug)}`);
    }
  }
  flush();
  return out;
}

function head(visit, number) {
  const first = visit.lines[0];
  const country = visit.lines.map(line => line.country).find(code => code && code !== '-') || '??';
  const came = visit.lines.map(line => line.ref).find(foreign);
  const length = Math.round(seconds(visit.lines.at(-1).time) - seconds(first.time));
  return [
    `── ${number}.  ${first.day} ${first.time.slice(11, 16)}Z`,
    country,
    deviceOf(first.ua),
    span(length),
    came ? `пришёл с ${came.split('/')[0]}` : null
  ]
    .filter(Boolean)
    .join(' · ');
}

// ── что показываем ─────────────────────────────────────────────

const { records } = await readDays(DIRECTORY, DAYS, DAY);
const { byUrl, total } = await imageIndex();

const dropped = { 'подделка Nexus 5X': 0, свои: 0, 'нечего рассказать': 0 };
const people = [];
for (const visit of visitsOf(records)) {
  if (visit.bot) continue;
  if (spoofed(visit)) dropped['подделка Nexus 5X']++;
  // Своё — по куке хозяина, как в сводке. Прежнее правило, «настольный из DE»,
  // 15.10.2026 спрятало как своего гостя из Германии. Строки до 21.09.2026
  // столбца `source` не несут, и свои заходы за те дни показываются как чужие.
  else if (!ALL && ownVisit(visit)) dropped['свои']++;
  else people.push(visit);
}

people.sort((a, b) => a.lines[0].time.localeCompare(b.lines[0].time));

// Заход, у которого не набралось ни шага, — это строки, которые печатать
// нечем: один `styles.css`, один отброшенный запрос. Считаем и не показываем:
// рассказ без событий читателя только сбивает.
let told = 0;
for (const visit of people) {
  const story = steps(visit, byUrl, total);
  if (!story.length) {
    dropped['нечего рассказать']++;
    continue;
  }
  console.log(head(visit, ++told));
  for (const step of story) console.log(`   ${step}`);
  console.log('');
}

console.log(`Заходов людей ${people.length}${DAY ? ` за ${DAY}` : ''}, рассказано ${told}`);
console.log(
  `Отброшено${DAY ? ` за ${DAY}` : ' за всё окно'}: ${Object.entries(dropped)
    .map(([name, count]) => `${name} ${count}`)
    .join(', ')}`
);
