// Журнал из файлов — в записи, заходы и работы витрины. Отсюда берёт данные
// сводка (`journal-rollup.mjs`), и разделены они по шву: здесь знают устройство
// журнала — сколько в строке столбцов, что такое заход, какой файл какой работе
// принадлежит; там знают, о чём спрашивают, и печатают ответ. Вместе это
// перевалило за ориентир в 400 строк (AGENTS.md), и резать пришлось именно
// здесь: вопросы к журналу будут прибывать, а правила чтения — те же.
import fs from 'node:fs/promises';
import path from 'node:path';
import { COLUMNS } from '../journal.js';
import { galleryItems } from '../gallery.js';

// Реферер с чужого сайта. Свой — это переход внутри витрины, и он отвечает
// на другой вопрос, чем «откуда пришли»; прочерк — что реферера не было вовсе.
export const foreign = ref =>
  ref !== '-' && !ref.startsWith('tessarum') && !ref.startsWith('127.0.0.1') && !ref.startsWith('localhost');

// Ссылку, вставленную в iMessage, Apple разворачивает в превью и страницу
// для него берёт сама, под заголовком с тремя именами сразу — такого нет ни
// у настоящего Facebook, ни у Twitter. Тот же сборщик стоит за превью
// в Заметках, Почте и в шапке меню «Поделиться», которое могли и закрыть,
// так что это «ссылка была в превью Apple», а не «отправили».
export const appleShare = record =>
  record.kind === 'page' && record.ua.includes('facebookexternalhit/1.1 Facebot Twitterbot/1.0');

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

export async function readDays(DIRECTORY, DAYS) {
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
// говорит имя поля, а не измерение файла: `scan` у работы заполнен тогда,
// когда страница отдаёт приглушённое, `dimmed` — когда страница отдаёт скан
// (gallery.js).
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
    walk(item, item.scan ? 'dim' : 'scan');
    if (item.scan) walk(item.scan, 'scan');
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
// Четыре признака, по убыванию надёжности. Назвался краулером — краулер,
// и спорить не о чем. Не взял ни одной удачной страницы и ни одного файла —
// стучался, а не смотрел. Забрал страницу и не забрал к ней ни файла — не
// браузер: браузер просит `styles.css` и карточки в ту же секунду, а качалка
// берёт разметку и уходит. Не прислал языка вовсе — признак слабый, сам по
// себе не судит.
//
// «Одни 404» появился позже остальных и закрывает дыру в правиле «молча»:
// оно считает только строки `page`, а сканер дырок в WordPress до страницы
// не доходит — стучится в `/wp-admin/install.php` и получает `miss`. Строк
// `page` у него ноль, признак не срабатывает, и в сводке он оказывался
// человеком: за неделю таких набиралось 64 из 188. Цена правила известна
// и мала: человек, у которого первым запросом ушёл `/favicon.ico` и который
// тут же закрыл вкладку, тоже попадёт в машины.
//
// «Без Sec-Fetch» — пятый, и держится он на том, что заголовок
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
function classify(lines) {
  const declared = lines.map(line => line.bot).find(bot => bot && bot !== '-' && bot !== 'noua');
  const pages = lines.filter(line => line.kind === 'page').length;
  const props = lines.filter(line => line.kind === 'asset' || line.kind === 'image').length;
  const noua = lines.some(line => line.bot === 'noua');
  const got = lines.some(
    line => (line.kind === 'page' && line.status < 400) || line.kind === 'asset' || line.kind === 'image'
  );
  if (declared) return { bot: true, why: declared.split(':')[0], fake: declared.endsWith(':fake') };
  // Картинки превью iMessage `journal.js` узнаёт с 26.09.2026; строки до
  // того записаны без метки, и узнавать их приходится здесь.
  if (lines.some(line => /networkingextension/i.test(line.ua))) return { bot: true, why: 'preview' };
  if (noua) return { bot: true, why: 'без заголовка' };
  if (lines.every(line => line.dest === 'none')) return { bot: true, why: 'без Sec-Fetch' };
  if (!got) return { bot: true, why: 'одни 404' };
  if (pages > 0 && props === 0) return { bot: true, why: 'молча' };
  return { bot: false, why: 'человек' };
}

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
