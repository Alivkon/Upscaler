// Журнал из файлов — в записи, заходы и работы витрины. Отсюда берёт данные
// сводка (`journal-rollup.mjs`), и разделены они по шву: здесь знают устройство
// журнала — сколько в строке столбцов, что такое заход, какой файл какой работе
// принадлежит; там знают, о чём спрашивают, и печатают ответ. Вместе это
// перевалило за ориентир в 400 строк (AGENTS.md), и резать пришлось именно
// здесь: вопросы к журналу будут прибывать, а правила чтения — те же.
import fs from 'node:fs/promises';
import path from 'node:path';
import { COLUMNS, claimedBy } from '../journal.js';
import { galleryItems } from '../gallery.js';

// Реферер с чужого сайта. Свой — это переход внутри витрины, и он отвечает
// на другой вопрос, чем «откуда пришли»; прочерк — что реферера не было вовсе.
export const foreign = ref =>
  ref !== '-' && !ref.startsWith('tessarum') && !ref.startsWith('127.0.0.1') && !ref.startsWith('localhost');

// ── чтение ─────────────────────────────────────────────────────

// Строка из файла в запись. Читается не «по числу столбцов», и это не
// придирка: прежний разбор отбрасывал строку, в которой полей меньше, чем
// в нынешних `COLUMNS`, — то есть первый же новый столбец молча стёр бы из
// всех сводок все дни, записанные до него. Журнал — единственное, что нельзя
// собрать заново, и терять его из-за собственной правки нельзя.
//
// Держится на двух правилах. `ua` всегда последний — и делить строку по
// табуляции безопасно, потому что `field()` в `journal.js` вырезает табуляцию
// из каждого значения, так что внутрь поля она не попадает. Новый столбец
// дописывается перед `ua`, и тогда у старой, короткой строки ведущие поля
// ложатся по порядку от начала, а те, которых в файле ещё не было, становятся
// прочерком — отличимым от значения.
function recordOf(parts) {
  const record = {};
  const head = COLUMNS.slice(0, -1);
  head.forEach((column, at) => (record[column] = at < parts.length - 1 ? parts[at] : '-'));
  record.ua = parts.at(-1);
  return record;
}

// `DAY` — один день по имени вместо последних `DAYS`: рассказ о заходах
// спрашивают и о дне, давно выпавшем из недели.
export async function readDays(DIRECTORY, DAYS, DAY = null) {
  let names;
  try {
    // Только дни: рядом с ними лежат и другие таблицы (`subscribed.tsv`).
    names = (await fs.readdir(DIRECTORY)).filter(name => /^\d{4}-\d{2}-\d{2}\.tsv$/.test(name)).sort();
  } catch {
    console.error(`журнала нет: ${DIRECTORY}`);
    process.exit(1);
  }
  const wanted = DAY ? names.filter(name => name.startsWith(DAY)) : names.slice(-DAYS);
  const records = [];
  for (const name of wanted) {
    const text = await fs.readFile(path.join(DIRECTORY, name), 'utf8');
    for (const line of text.split('\n')) {
      if (!line) continue;
      const parts = line.split('\t');
      if (parts.length < 3) continue;
      const record = recordOf(parts);
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
// У работы ДВЕ ВЕРСИИ, и обе устроены одинаково: плита, её копии, кадры,
// копии кадров (`versionOf` в gallery.js). Поэтому обход один и зовётся
// дважды. Раньше от второй версии индексировался один верхнеуровневый адрес
// плиты, а её копии и кадры — нет: 2197 адресов из 2366 не опознавались,
// и строки журнала о них не приписывались ни к какой работе.
//
// `frame` отвечает «какой кадр», `version` — «какая из двух»: вопросы разные,
// и одно поле на оба отвечало бы половиной правды. Какая версия перед нами,
// говорит имя поля, а не измерение файла: главный файл работы — скан,
// приглушённый лежит полем `dimmed` (`catalogueItems` в gallery.js, с 14.10.2026).
export async function imageIndex() {
  const shown = (await galleryItems()).filter(item => !item.hidden);
  const byUrl = new Map();
  shown.forEach((item, position) => {
    const put = (url, frame, full, version) =>
      byUrl.set(decodeURI(url), { slug: item.slug, frame, full, version, position });
    const walk = (entry, version) => {
      put(entry.url, 'plate', true, version);
      for (const copy of entry.copies || []) put(copy.url, 'plate', false, version);
      for (const [frame, cut] of Object.entries(entry.crops || {})) {
        if (!cut) continue;
        put(cut.url, frame, true, version);
        for (const copy of cut.copies || []) put(copy.url, frame, false, version);
      }
    };
    walk(item, 'scan');
    if (item.dimmed) walk(item.dimmed, 'dim');
  });
  // `slugs` — показанные работы в порядке витрины: по нему считается, что
  // из них обошли краулеры, а что не видел ни один.
  return { byUrl, total: shown.length, slugs: shown.map(item => item.slug) };
}

// ── кто приходил ───────────────────────────────────────────────

// Заход — это все строки одного `visit` за день. Правило грубое и заведомо
// неточное; его и проверяют `--sample` и ручные ярлыки.
//
// Восемь признаков, и решает первый сработавший: заход, пойманный двумя,
// получает ярлык того, что стоит выше. Назвался краулером: краулер, и спорить
// не о чем. Не прислал заголовка браузера вовсе: тоже. Не взял ни одной
// удачной страницы и ни одного файла: стучался, а не смотрел. Забрал страницу
// и не забрал к ней ни файла: не браузер, потому что браузер просит
// `styles.css` и карточки в ту же секунду, а качалка берёт разметку и уходит.
// Четыре последних, «без Sec-Fetch», «старше заголовка», «одни файлы» и
// «без картинок», ниже.
//
// Назвавшимся считается и строка, где `bot` прочерк, но заголовок узнаёт
// `claimedBy`: имя попало в список позже, чем строка в журнал. Так
// пересчитались картинки превью iMessage, записанные до 26.09.2026.
//
// «Одни 404» появился позже остальных и закрывает дыру в правиле «молча»:
// оно считает только строки `page`, а сканер дырок в WordPress до страницы
// не доходит — стучится в `/wp-admin/install.php` и получает `miss`. Строк
// `page` у него ноль, признак не срабатывает, и в сводке он оказывался
// человеком: за неделю таких набиралось 64 из 188. Цена правила известна
// и мала: человек, у которого первым запросом ушёл `/favicon.ico` и который
// тут же закрыл вкладку, тоже попадёт в машины.
//
// «Без Sec-Fetch» держится на том, что заголовок
// `Sec-Fetch-Dest` браузер ставит сам, на каждый запрос: Chrome с 2020 года,
// Firefox с 2021-го, Safari с 16.4. Заход, в котором его нет ни на одной
// строке, браузером не был. Правило закрыло качалку 24.09: 51 заход по
// картинке, один заголовок Chrome 145, язык zh-CN, реферер `tessarum.com/`
// и каждый раз новая страна — BG, BR, CO, ET, SE, VN; каждый шёл в людях
// и «уносил файл». За 13.09–26.09 правило перевело в машины 113 заходов из
// 358, и глазами пройдены все: кроме качалки, это `tessarum-research`,
// `fasthttp`, `okhttp`, `GoogleOther`, Dataprovider, рендер Google под
// видом Nexus 5X, сборщики иконок у Apple и запросы к `/robots.txt` и
// `/sitemap.xml`. Похожих на браузер среди них нет. Сравнение строгое, с
// `'none'`: так `journal.js` пишет отсутствие заголовка, а прочерк — это
// строка, записанная до появления столбца, и она ничего не доказывает.
//
// Стоит он ниже остальных, кроме «одних файлов» и «без картинок», потому что ловит и тех, кого уже поймали признаки выше:
// за 13.09–26.09 заголовка не было ни разу в 456 заходах, и 343 из них
// уже были «одни 404» или «молча». Стоя выше, он переименовал бы их, и таблица
// «Машины: кто» перестала бы показывать сканеры и качалки разметки отдельно.
//
// Safari и всё, что на iPhone, до 16.4 заголовка не ставят вовсе, и такой
// заход правило не судит. Граница снизу, 15: на iOS 15 остались iPhone 6s,
// 7 и первый SE, а 16.0–16.3 бывает у того, кто не обновлялся. Всё, что
// старше, в 2026-м уже не телефон, а подпись: за тот же месяц это семь
// заходов «Safari 8» на OS X 10.10, и каждый только за `/robots.txt`.
const withoutFetchMetadata = ua => {
  const claimed = claimedVersion(ua);
  return claimed?.engine === 'safari' && (claimed.major === 15 || (claimed.major === 16 && claimed.minor < 4));
};

// Какую версию движка браузер называет. Один разбор на оба правила о
// `Sec-Fetch-Dest`: «без Sec-Fetch» и «старше заголовка». Всё, что на iPhone,
// — WebKit той версии, что и iOS, как бы браузер ни назывался.
//
// Переупакованные браузеры не судятся: у них число после `Chrome/` бывает
// замороженным, а движок новее. Так делает UC Browser (`Chrome/78` у
// нынешних сборок), и в нашем журнале за месяц таких не было ни одного;
// Samsung, Yandex и Opera были, все с Chrome 115 и новее, но
// список держит и их — цена пропуска здесь меньше цены ложного бота.
const REPACKED =
  /UCBrowser|UBrowser|Puffin|Opera Mini|OPR\/|YaBrowser|SamsungBrowser|MiuiBrowser|QQBrowser|MicroMessenger|Quark|baiduboxapp/;

function claimedVersion(ua) {
  let found;
  if ((found = ua.match(/(?:iPhone|iPad|iPod).*? OS (\d+)_(\d+)/)))
    return { engine: 'safari', major: +found[1], minor: +found[2] };
  if (REPACKED.test(ua)) return null;
  if ((found = ua.match(/(?:Chrome|CriOS)\/(\d+)/))) return { engine: 'chrome', major: +found[1], minor: 0 };
  if ((found = ua.match(/Firefox\/(\d+)/))) return { engine: 'firefox', major: +found[1], minor: 0 };
  if ((found = ua.match(/Version\/(\d+)\.(\d+).*Safari/)))
    return { engine: 'safari', major: +found[1], minor: +found[2] };
  return null;
}

// «Старше заголовка»: то же правило с другой стороны. Браузер, который назвался
// версией без `Sec-Fetch-Dest`, а заголовок прислал, назвался чужим именем.
// Это современный Chrome в костюме старого телефона. За 14.09–15.10 правило
// поймало 8 заходов из 350 «людей», и все восемь машины: пять раз
// `iPhone13,2; U; CPU iPhone OS 14_0` из PL (31 карточка за 3 секунды, каждый
// раз одна и та же), iOS 13 с zh-CN за 2 секунды и пара «iOS 10 + Android 7
// с Chrome 59» в одну секунду 15.10.
//
// С какой версии заголовок шлют: Chrome с 80 (76–79 слали только `Site`
// и `Mode`), Firefox с 90, Safari с 16.4.
const DEST_SINCE = { chrome: [80, 0], firefox: [90, 0], safari: [16, 4] };

const claimedOlder = ua => {
  const claimed = claimedVersion(ua);
  if (!claimed) return false;
  const [major, minor] = DEST_SINCE[claimed.engine];
  return claimed.major < major || (claimed.major === major && claimed.minor < minor);
};

const olderThanItsHeaders = lines =>
  claimedOlder(lines[0].ua) && lines.some(line => line.dest !== 'none' && line.dest !== '-');

// «Качалка файлов»: брал картинки адресом, как документ, и ни разу не попросил
// того, из чего браузер строит страницу, — ни карточки, ни скрипта, ни стиля.
// Sec-Fetch у такого на месте и заголовок браузерный, так что правила выше его
// не видят: 08.10.2026 один Firefox 148 из 26 стран забрал 727 файлов за
// 98 заходов, и сводка за неделю показала 187 человек и 822 унесённых файла
// вместо 58 и 21.
//
// Размечено рукой всё, что было: 270 заходов с файлом-документом за
// 13.09–10.10. Из 199 пойманных машин 192 (тот Firefox, 62 захода Chrome 146
// из SG с языком zh-CN, один «Pixel 6» с 21 файлом), шесть оставлены людьми
// оговоркой ниже, и один спорный: iPhone со страницей и файлом в одну секунду.
// Из 71 непойманного машин ноль: у всех десятки карточек и скриптов рядом.
//
// Оговорка — файл, открытый с чужого сайта. Это ровно тот заход, ради которого
// витрина стоит: человек нажал на картинку в выдаче Google или в посте и видит
// один файл без страницы. Реферер подделывается, и шесть таких заходов 16.09
// (`www.google.com/search`, шесть разных версий Chrome за час) похожи на
// подделку; но потерять настоящий приход из поиска дороже, чем пересчитать их.
const fetchedOnlyFiles = lines => {
  const files = lines.filter(line => line.kind === 'image' && line.dest === 'document');
  if (!files.length || files.some(line => foreign(line.ref))) return false;
  return !lines.some(line => ['image', 'script', 'style', 'empty', 'font'].includes(line.dest));
};

// «Без картинок»: открыл страницу, на которой стоят картинки, взял к ней хоть
// какой-то файл (стиль, скрипт, `/favicon.svg`), а ни одной картинки
// не попросил. Первый экран работы, темы или художника — это картинки,
// и браузер просит их в ту же секунду, что и `styles.css`. Правило «молча»
// такого не видит, потому что файлы к странице есть.
//
// Закрыло качалку 13.10.2026: язык zh-CN, страна каждый раз новая (CN, SG, HK,
// MX, US, BR), одна страница раз в восемь минут круглые сутки. За два дня
// 71 заход шёл в людях. Попутно ушли в машины утренняя проверка `/` с Linux,
// которая берёт только `/favicon.svg`, и обход тем и художников с Linux Chrome
// 30.09 и 02.10 без единой карточки.
//
// Ошибка известна и принята. Картинки витрины браузер держит час, а `styles.css`
// переспрашивает каждый раз (`setImageHeaders` в `server.js`). Человек,
// вернувшийся в течение часа, но уже другим `visit` — после полуночи UTC или
// с другого адреса, — принесёт страницу и стиль без картинок и уйдёт в машины.
// Внутри одного `visit` этого не бывает: первая загрузка картинки взяла.
//
// Картинка, ответившая 404, — это `miss`, а не `image`, и считается тоже:
// человек её попросил, а то, что файла нет, — поломка сайта, не признак бота.
//
// Страницы без картинок правило не судит: на `/restore` человек приходит со
// своим файлом и витрины не грузит, `/artists`, `/license` и `/mailing-list` —
// текст. Только 200: переадресация отдаёт html, но картинок на ней нет.
const PICTURE_PAGE = /^\/($|w\/|collection\/|artists\/.)/i;

const askedForPicture = line => line.kind === 'image' || (line.kind === 'miss' && line.path.startsWith('/images/'));

const sawNoPictures = lines =>
  lines.some(line => line.kind === 'page' && line.status === 200 && PICTURE_PAGE.test(line.path)) &&
  !lines.some(askedForPicture);

function classify(lines) {
  const declared = lines
    .map(line => (line.bot === '-' ? claimedBy(line.ua) : line.bot))
    .find(bot => bot && bot !== '-' && bot !== 'noua');
  const pages = lines.filter(line => line.kind === 'page').length;
  const props = lines.filter(line => line.kind === 'asset' || line.kind === 'image').length;
  const noua = lines.some(line => line.bot === 'noua');
  const got = lines.some(
    line => (line.kind === 'page' && line.status < 400) || line.kind === 'asset' || line.kind === 'image'
  );
  if (declared) return { bot: true, why: declared.split(':')[0], fake: declared.endsWith(':fake') };
  if (noua) return { bot: true, why: 'без заголовка' };
  if (!got) return { bot: true, why: 'одни 404' };
  if (pages > 0 && props === 0) return { bot: true, why: 'молча' };
  if (lines.every(line => line.dest === 'none') && !withoutFetchMetadata(lines[0].ua))
    return { bot: true, why: 'без Sec-Fetch' };
  if (olderThanItsHeaders(lines)) return { bot: true, why: 'старше заголовка' };
  if (fetchedOnlyFiles(lines)) return { bot: true, why: 'одни файлы' };
  if (sawNoPictures(lines)) return { bot: true, why: 'без картинок' };
  return { bot: false, why: 'человек' };
}

// Унёс файл: картинку попросили не как картинку на странице, а документом
// (открыл адрес, нажал Download) или скриптом (`empty`, кнопка через fetch).
// Прочерк и `none` не в счёт: так приходит и показанная картинка у Safari
// до 16.4, и строка до появления столбца, и различить их нечем. За месяц
// у людей это 3 строки из 415.
export const taken = line =>
  line.kind === 'image' &&
  (line.dest === 'document' || line.dest === 'empty') &&
  (line.status === 200 || line.status === 304);

// Свой заход — тот, где журнал узнал куку хозяина (`markOwner` в `journal.js`).
// Это не бот и не посетитель: в счёт людей он не идёт ни на доске, ни в сводке.
export const ownVisit = visit => visit.lines.some(line => line.source === 'me');

export function visitsOf(records) {
  const groups = new Map();
  for (const record of records) {
    if (!groups.has(record.key)) groups.set(record.key, []);
    groups.get(record.key).push(record);
  }
  return [...groups].map(([key, lines]) => ({ key, lines, ...classify(lines) }));
}

// Вид устройства. Взять его больше негде: адрес посетителя в журнал не
// попадает, Client Hints мы не просим, и остаётся заголовок браузера — то есть
// слово браузера о себе. Оно бывает ложью: iPad в режиме «полной версии»
// называется Macintosh и уходит в настольные. Это недосчёт планшетов,
// а не переучёт телефонов, и знать о нём достаточно.
//
// Телефоны разделены по семье не ради полноты списка, а потому что кнопка
// Download на них ведёт себя по-разному: у Safari на iOS `<a download>`
// исторически не сохраняет файл, а открывает его. Если уносят только с
// Android, смотреть надо туда, а не в витрину.
//
// Cloudflare эту же разбивку показывает — но только по тем, у кого сработал
// маяк, то есть без всех, кто с блокировщиком. Здесь считаются все.
export function deviceOf(ua) {
  if (/iPhone|iPod/i.test(ua)) return 'телефон iOS';
  if (/iPad|Tablet|Android(?!.*Mobile)/i.test(ua)) return 'планшет';
  if (/Android|Mobile/i.test(ua)) return 'телефон';
  return 'настольный';
}
