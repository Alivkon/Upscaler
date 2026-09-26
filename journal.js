// Что сервер записывает о запросе — и чего он о нём не записывает.
//
// Отдельный файл, а не строчки в `server.js`, по той же причине, по какой
// отдельно живёт `limits.js`: у записи своя причина существовать и свои
// правила, а `server.js` и без того вырос за ориентир в 400 строк (AGENTS.md).
//
// ЗАЧЕМ. Маяк Cloudflare считает загруженные страницы и только их, и вдобавок
// режется блокировщиком — в браузере самого Charlie он не срабатывает вовсе,
// то есть все его числа это нижняя граница неизвестной высоты
// (research/2026-09-12-HANDOVER-analytics.md). Запрос к серверу вырезать
// нельзя: без него не будет и картинки. Поэтому считает сервер.
//
// БЕЗ БАННЕРА. Согласия требует запись на устройство посетителя — куки,
// localStorage, отпечаток. Здесь на устройство не пишется ничего, и читать
// оттуда нечего. Адрес посетителя в файл не попадает ни разу: из него
// и заголовка браузера считается `visit` — восемь знаков хэша с солью,
// которая рождается в памяти при старте и никуда не сохраняется. Соль
// не пережила перезапуск — прежние `visit` не восстановимы никем, включая нас.
// Цена известна и принята: выкладка посреди дня разрежет одного посетителя
// на двух.
//
// ЖУРНАЛ ПИШЕТ, СВОДКА РЕШАЕТ. В строке лежат признаки, а не выводы: `dest`
// как пришёл, заголовок браузера целиком, реферер целиком. Правило «бот или
// человек» ошибётся на первых же днях, и переписывать его придётся по данным,
// которые уже собраны, — а вывод, запечённый в строку, переписать нельзя.
// Тот же довод, что и у `Sec-Fetch-Dest` раньше в `server.js`: значение
// пишется как есть, а не сводится к «да/нет».
//
// Исключений ровно два, и причина у них одна — `bot` и `country`. Подтверждение
// краулера идёт через обратный DNS, страна — через поиск по базе, и обоим нужен
// адрес, которого мы не храним. Проверить потом будет нечем, поэтому эти два
// вывода делаются на месте. Третьего такого столбца быть не должно: каждый из
// них — это решение, принятое навсегда, тогда как признак можно перечитать.
import { createHash, randomBytes } from 'node:crypto';
import dns from 'node:dns/promises';
import geoip from 'geoip-country';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

// Столбцы. Разделитель — табуляция, потому что журнал читают двумя способами:
// глазами через `grep` и сводкой через `split('\t')`. JSON на строку был бы
// удобнее второму и неудобен первому, а первый случается чаще.
//
// НОВЫЙ СТОЛБЕЦ ДОПИСЫВАЕТСЯ ПЕРЕД `ua`, и это не вкусовщина. Файлы прошлых
// дней переписать нельзя, и у них столбцов меньше; сводка читает старую строку
// тем, что ведущие поля лежат по порядку от начала, а `ua` — последний
// (`scripts/journal-rollup.mjs`, `recordOf`). Столбец, вставленный в середину,
// сдвинет у старых строк всё, что после него, и каждое значение в сводке
// окажется не своим — без единой ошибки на экране.
export const COLUMNS = [
  'time',
  'visit',
  'kind',
  'status',
  'ms',
  'bytes',
  'dest',
  'path',
  'ref',
  'lang',
  'bot',
  'formats',
  'country',
  'source',
  'ua'
];

// Сколько дней держим. Личного в файлах нет, поэтому срок выбран не законом,
// а местом: на общей машине своп выключен и диск чужой. Полгода закрывают
// вопрос «а как было летом» и не дают журналу расти без края.
const KEEP_DAYS = 180;

// Соль живёт в памяти процесса и не пишется никуда. Смена дня подмешивается
// отдельно: один и тот же посетитель завтра получает другой `visit`, и склеить
// его вчерашний заход с сегодняшним нельзя даже нам.
const SALT = randomBytes(32);

const dayOf = time => time.toISOString().slice(0, 10);

function visitOf(ip, ua, day) {
  return createHash('sha256')
    .update(SALT)
    .update(day)
    .update(ip || '')
    .update(ua || '')
    .digest('hex')
    .slice(0, 8);
}

// Краулеры, которые называют себя сами. Список не полон и полным не будет:
// внизу стоит общее правило, и незнакомый паук попадёт в `bot` без имени.
// Порядок важен — общее правило последнее.
//
// Третий столбец — чем подтверждается имя. Гуглом и Бингом притворяются чаще
// всего, и у обоих есть опубликованные имена узлов; у остальных проверять
// нечем, и слово остаётся словом.
const CRAWLERS = [
  [/googlebot|google-inspectiontool|storebot-google|google-extended/i, 'googlebot', /\.google(bot)?\.com$/],
  [/bingbot|adidxbot|msnbot/i, 'bingbot', /\.search\.msn\.com$/],
  [/gptbot|oai-searchbot|chatgpt-user/i, 'gptbot', null],
  [/claudebot|claude-web|anthropic-ai/i, 'claudebot', null],
  [/perplexitybot/i, 'perplexitybot', null],
  [/applebot/i, 'applebot', null],
  [/yandexbot|yandeximages/i, 'yandexbot', null],
  [/duckduckbot/i, 'duckduckbot', null],
  [/baiduspider/i, 'baiduspider', null],
  [/ahrefsbot|semrushbot|mj12bot|dotbot|dataforseobot|petalbot|bytespider|amazonbot/i, 'seobot', null],
  // `NetworkingExtension` — iMessage: превью ссылки забирает страницу под
  // именем facebookexternalhit, а картинки к ней отдельным запросом, где
  // слова «bot» нет. Без этого одна отправленная ссылка — «человек унёс 4 файла».
  [
    /facebookexternalhit|twitterbot|slackbot|telegrambot|discordbot|whatsapp|pinterest|redditbot|networkingextension/i,
    'preview',
    null
  ],
  [/bot|crawler|spider|scraper|curl|wget|python-requests|node-fetch|httpx|axios|go-http-client/i, 'bot', null]
];

// Подтверждение кэшируется на пару «адрес и имя»: краулер приходит сотнями
// запросов подряд, и спрашивать DNS на каждый — это сотни лишних ожиданий
// ради одного и того же ответа. Потолок — чтобы обход с тысячи адресов
// не съел память.
const verdicts = new Map();
const VERDICT_LIMIT = 2000;

// Обратный DNS с прямым подтверждением — так проверять велит и сам Google.
// Обратной записи верить нельзя: её ставит владелец адреса, то есть кто угодно.
// Подтверждение в том, что найденное имя ведёт обратно на тот же адрес.
async function confirm(ip, name, hostPattern) {
  if (!ip) return 'unchecked';
  // В ключе и адрес, и имя, потому что проверяется не адрес, а их пара.
  // С ключом из одного адреса подтверждённый гуглов узел, назвавшийся
  // в следующем запросе бингом, ушёл бы в журнал как `bingbot:ok` — вывод,
  // которого никто не делал, в столбце, который потом не переспросишь:
  // адрес к тому времени уже чужой, а строка осталась.
  const key = `${ip} ${name}`;
  const known = verdicts.get(key);
  if (known) return known;
  let verdict = 'fake';
  try {
    const names = await dns.reverse(ip);
    const host = names.find(candidate => hostPattern.test(candidate));
    if (host) {
      // Спрашиваются обе семьи адресов, а не A с откатом на AAAA. Краулер,
      // пришедший по IPv6, чаще всего живёт на имени, у которого есть и A:
      // откат тогда не срабатывает, шестёрка не спрашивается вовсе, и
      // настоящий гугл уходит в журнал как `fake` — вывод наизнанку.
      const [back, back6] = await Promise.all([dns.resolve(host).catch(() => []), dns.resolve6(host).catch(() => [])]);
      verdict = [...back, ...back6].includes(ip) ? 'ok' : 'fake';
    }
  } catch {
    // Адреса без обратной записи — обычное дело у притворяющихся, но бывает
    // и у настоящих сетей. Отдельное слово, чтобы сводка не считала это
    // доказанным подлогом.
    verdict = 'nodns';
  }
  if (verdicts.size >= VERDICT_LIMIT) verdicts.clear();
  verdicts.set(key, verdict);
  return verdict;
}

// Страна посетителя — второй и последний столбец, в котором лежит вывод,
// а не признак. Довод тот же, что у `bot`, и другого здесь быть не может:
// страну считают из адреса, а адреса мы не храним — переспросить потом будет
// нечем. Поэтому вывод делается на месте, в памяти, и в файл уходит только он.
//
// Обещание про отсутствие баннера согласия от этого не меняется. На устройство
// посетителя по-прежнему не пишется ничего, и сам адрес в файл не попадает
// ни разу: `geoip.lookup` получает его из памяти запроса и возвращает две
// буквы. Две буквы — это не устройство и не человек; в них не опознать никого,
// кто приходил, и склеить их с чем-либо нельзя.
//
// База лежит в пакете и обновляется вместе с ним — сети на запрос не нужно.
// Стоит она 17,7 МБ резидентной памяти (померено: `rss` до и после импорта),
// и это тот расход, о котором стоит знать: на машине двенадцать контейнеров
// и выключенный своп, а потолок контейнера — 3 ГБ (`docker-compose.yml`).
// Пакет взят country-only намеренно: тот же список с городами весит 115 МБ
// распакованными, а города здесь не спрашивает никто.
//
// Прочерк значит «не определилась», и значит это сразу три разных случая:
// адрес частный (свой же healthcheck ходит с `127.0.0.1`), адрес из
// документационной сети, или в базе его нет. Разделять их нечем, и сводка
// обязана считать прочерк отдельной строкой, а не растворять его в процентах.
function countryOf(ip) {
  if (!ip) return '-';
  try {
    return geoip.lookup(ip)?.country || '-';
  } catch {
    // Битый адрес в `req.ip` роняет поиск, а не должен ронять запись: строка
    // журнала ценнее одного столбца в ней.
    return '-';
  }
}

// Имя краулера, которое решается по одному заголовку, без адреса. Сводка
// перечитывает им строки, записанные до того, как имя попало в `CRAWLERS`:
// адрес для этого не нужен, и старые дни пересчитываются сами. Имя, которое
// подтверждается адресом, так не узнать — его нет, и ответ тогда `null`.
export function claimedBy(ua) {
  const found = CRAWLERS.find(([pattern]) => pattern.test(ua));
  return found && !found[2] ? found[1] : null;
}

async function botOf(ua, ip) {
  if (!ua) return 'noua';
  for (const [pattern, name, hostPattern] of CRAWLERS) {
    if (!pattern.test(ua)) continue;
    if (!hostPattern) return name;
    return `${name}:${await confirm(ip, name, hostPattern)}`;
  }
  return '-';
}

// Какие форматы картинок браузер согласен взять. Пишется не весь `Accept`:
// у картинки он выглядит как `image/avif,image/webp,image/apng,*/*;q=0.8` —
// сорок знаков в каждой строке, а строк с картинками в журнале больше, чем
// всех остальных вместе. Остаётся то, ради чего столбец заводится: ответит ли
// AVIF за себя, если переложить в него кадры. Веса `q` отбрасываются, порядок
// заголовка сохраняется — это не вывод из признака, а тот же признак короче.
//
// У запроса страницы в `Accept` картинок нет вовсе, и там останется прочерк.
// Ветки для этого не нужно: прочерк и есть верный ответ — документ о форматах
// картинок не сообщает ничего.
const FORMATS = /image\/(avif|webp|jxl|heic)/g;

const formatsOf = accept =>
  [...new Set(String(accept || '').match(FORMATS) || [])].map(name => name.slice(6)).join(',');

// Поле, в котором не должно быть ни табуляции, ни перевода строки: одна строка
// журнала — одна запись, и чужой заголовок не должен уметь её разрезать.
const field = value => {
  const text = String(value ?? '').replace(/[\t\r\n]+/g, ' ');
  return text.length ? text : '-';
};

// Реферер без запроса и без хвоста. Запрос у поисковых переходов не значит
// ничего, а у наших собственных ссылок его и нет; зато он раздувает строку
// и таскает за собой чужие метки кампаний.
function refOf(value) {
  if (!value) return '-';
  try {
    const url = new URL(value);
    return `${url.host}${url.pathname}`;
  } catch {
    return field(value);
  }
}

// Метка из нашей собственной ссылки: `?source=reddit`. Реферер её не
// заменяет — приложение Reddit его не шлёт, и такой переход неотличим от
// набранного руками. Остальной запрос не пишется по той же причине, что
// и у `refOf`, а сама метка берётся, только если похожа на нашу: адрес
// набирает кто угодно, и произвольный текст в журнал попадать не должен.
function sourceOf(query) {
  const value = query?.source;
  return typeof value === 'string' && /^[a-z0-9-]{1,32}$/.test(value) ? value : '-';
}

// Вид запроса — четыре слова, и все четыре видны из ответа, а не угаданы.
// Тоньше не режем: страница это или карточка указателя, решает сводка по
// рефереру, и решать это здесь значило бы учить журнал устройству витрины.
function kindOf(pathname, res) {
  if (res.statusCode === 404) return 'miss';
  if (pathname.startsWith('/images/')) return 'image';
  if (pathname.startsWith('/api/')) return 'api';
  return String(res.getHeader('content-type') || '').includes('text/html') ? 'page' : 'asset';
}

// Файл на день. Поток держится открытым: запись на каждый запрос через
// `appendFile` — это открыть и закрыть файл столько же раз.
function dayWriter(directory) {
  let open = null;
  return day => {
    if (open?.day === day) return open.stream;
    open?.stream.end();
    fs.mkdirSync(directory, { recursive: true });
    const stream = fs.createWriteStream(path.join(directory, `${day}.tsv`), { flags: 'a' });
    // Падать из-за журнала сервер не должен: диск кончился или том не
    // подмонтирован — это потеря статистики, а не сайта.
    stream.on('error', error => console.error(`журнал: ${error.message}`));
    open = { day, stream };
    sweep(directory, day);
    return stream;
  };
}

// Старое подметается при смене дня, а не по расписанию: другого события,
// которое случается ровно раз в сутки и уже есть, здесь нет.
function sweep(directory, day) {
  const edge = new Date(`${day}T00:00:00Z`);
  edge.setUTCDate(edge.getUTCDate() - KEEP_DAYS);
  const oldest = dayOf(edge);
  fsp
    .readdir(directory)
    .then(names =>
      Promise.all(
        names
          .filter(name => name.endsWith('.tsv') && name.slice(0, 10) < oldest)
          .map(name => fsp.unlink(path.join(directory, name)))
      )
    )
    .catch(error => console.error(`журнал: ${error.message}`));
}

// Строка пишется после ответа, а не до: до него неизвестны ни код, ни вес,
// ни время. Время в строке при этом — начало запроса, чтобы файл оставался
// в порядке событий, хотя подтверждение краулера и уводит саму запись
// в асинхронность.
//
// АДРЕС ЗАПОМИНАЕТСЯ НА ВХОДЕ, и это не предосторожность, а необходимость:
// `app.use('/images', …)` на время своей работы срезает с `req.url` то, на что
// смонтирован, а ответ заканчивается внутри него. Прочитанный в `finish`
// `req.path` — это `/crops/…` вместо `/images/crops/…`, то есть каждая карточка
// витрины уходила в журнал как файл из `public/`. Поймано на первом же заходе
// настоящим браузером.
export function journal(directory) {
  const writer = dayWriter(directory);
  return (req, res, next) => {
    const started = process.hrtime.bigint();
    const time = new Date();
    const asked = req.path;
    let decoded = asked;
    try {
      decoded = decodeURI(asked);
    } catch {
      // Битый процент в адресе — сам по себе признак, и терять из-за него
      // строку незачем.
    }
    // Вес ответа считается здесь, а не читается из `content-length`: заголовок
    // на сжатом ответе снимает сам `compression`, и в столбце у каждой
    // страницы стоял прочерк — число было только у картинок, которые
    // не сжимаются. Столбец выглядел измерением, которого нет.
    //
    // Считается то, что ушло в сокет, то есть уже сжатое: это и есть вес,
    // который заплатил посетитель. Держится это на порядке в `server.js`:
    // журнал поставлен выше `compression`, и потому его обёртка вызывается
    // последней — после упаковки, а не до неё.
    let weight = 0;
    const count = (chunk, encoding) => {
      if (chunk) weight += Buffer.byteLength(chunk, typeof encoding === 'string' ? encoding : undefined);
    };
    const wrote = res.write;
    const ended = res.end;
    res.write = function (chunk, encoding, callback) {
      count(chunk, encoding);
      return wrote.call(this, chunk, encoding, callback);
    };
    // `res.end(callback)` — законная форма вызова, и в ней первым идёт не тело.
    res.end = function (chunk, encoding, callback) {
      if (typeof chunk !== 'function') count(chunk, encoding);
      return ended.call(this, chunk, encoding, callback);
    };

    res.on('finish', async () => {
      try {
        const ua = req.get('user-agent');
        const day = dayOf(time);
        const line = [
          time.toISOString().slice(0, 19) + 'Z',
          visitOf(req.ip, ua, day),
          kindOf(asked, res),
          res.statusCode,
          (Number(process.hrtime.bigint() - started) / 1e6).toFixed(1),
          weight,
          req.get('sec-fetch-dest') ?? 'none',
          decoded,
          refOf(req.get('referer')),
          (req.get('accept-language') || '-').split(',')[0],
          await botOf(ua, req.ip),
          formatsOf(req.get('accept')),
          countryOf(req.ip),
          sourceOf(req.query),
          ua
        ];
        writer(day).write(line.map(field).join('\t') + '\n');
      } catch (error) {
        console.error(`журнал: ${error.message}`);
      }
    });
    next();
  };
}
