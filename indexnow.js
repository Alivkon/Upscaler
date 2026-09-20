// Кому сайт сам рассказывает о новых адресах — и о каких именно.
//
// ЗАЧЕМ. Google приходит сам, Bing — нет. За 13–20.09.2026 в журнале
// (`log/prod/*.tsv`) Bingbot взял `/robots.txt` дважды и `/` дважды, и больше
// ничего: ни одной страницы работы, ни одной темы. Краулеры OpenAI — то же
// самое плюс картинки; ChatGPT-User заходил на `/` 19 раз из девяти стран
// и внутрь не пошёл ни разу. Поиск ChatGPT опирается на индекс Bing, то есть
// помощник может назвать только парадную дверь. Карта сайта при этом цела —
// Bing её просто не читает. IndexNow — единственный способ сказать ему
// самому: POST со списком адресов, который Bing обещает принять.
//
// ОТКУДА СПИСОК. Из карты сайта, и только из неё: `announce` получает готовый
// XML и вынимает `<loc>`. Второе вычисление того же списка разошлось бы
// с картой на первой же правке `sitemap()` — и разошлось бы молча, потому что
// проверить их друг о друга негде. `<image:loc>` сюда не попадает: у IndexNow
// список адресов СТРАНИЦ, а закрывающий тег у картинки другой (`</image:loc>`),
// так что выражение их и не видит.
//
// ЧТО УЖЕ ОТПРАВЛЕНО — В ФАЙЛЕ, А НЕ В ПАМЯТИ. Иначе каждый перезапуск слал бы
// все 120 адресов заново, а IndexNow считает повторную отправку неизменившегося
// злоупотреблением. Файл лежит своим каталогом и своим томом — по той же
// причине, что у `mail/`: журнал режется по суткам и подметается через полгода,
// а этот список нужен ровно столько, сколько живёт сайт. Первый запуск шлёт
// всё, и это верно: для Bing эти адреса новые все до одного.
//
// ТОЛЬКО ПО ЯВНОЙ НАСТРОЙКЕ. Без `INDEXNOW_KEY` не отправляется ничего
// и не заводится ни файла, ни маршрута. Ключ не секрет — он лежит открытым
// текстом на самом сайте, — но переменная окружения здесь работает
// выключателем: на машине разработчика её нет, и рассказать Bing’у
// про `127.0.0.1` оттуда нельзя даже случайно.
//
// АВАРИЯ ТУТ НИЧЕГО НЕ ЛОМАЕТ. Отправка идёт после `listen`, её никто не ждёт,
// и любая беда — отказ сети, пятисотая, разорванное соединение — кончается
// строкой в логе. Файл при этом не трогается, и следующий старт пошлёт
// то же самое ещё раз.
import fsp from 'node:fs/promises';
import path from 'node:path';

const ENDPOINT = 'https://api.indexnow.org/indexnow';
const FILE = 'sent.tsv';
const HEADER = '# time\turl\n';
// Ключ уезжает в путь маршрута (`/<key>.txt`) и в тело запроса. Протокол
// разрешает буквы, цифры и дефис, 8–128 знаков; проверяем сами, потому что
// иначе строка из `.env` стала бы куском выражения маршрута.
const KEY_SHAPE = /^[a-zA-Z0-9-]{8,128}$/;
// Предел протокола на один POST. Коллекция до него не дорастёт скоро, но
// молчаливое усечение было бы хуже отправки в два захода: лишнее уедет
// при следующем старте, потому что в файл попадает только отправленное.
const MAX_URLS = 10000;
const TIMEOUT = 10_000;

const KEY = (process.env.INDEXNOW_KEY || '').trim();

// Настроен ли. Отдельной функцией, а не константой, потому что об этом
// спрашивает `server.js` до того, как завести маршрут ключа.
export const configured = () => KEY_SHAPE.test(KEY);

export const key = () => KEY;

// Адреса страниц из карты сайта. `<image:loc>` не совпадает ни открывающим
// тегом, ни закрывающим, и потому сюда не попадает.
export function locations(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
}

async function alreadySent(file) {
  try {
    const text = await fsp.readFile(file, 'utf8');
    const sent = new Set();
    for (const line of text.split('\n')) {
      if (!line || line.startsWith('#')) continue;
      const url = line.split('\t')[1];
      if (url) sent.add(url);
    }
    return sent;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return new Set();
  }
}

// Одна отправка. Успехом считается только 200 или 202: всё прочее значит,
// что Bing список не принял, и записывать его как отправленный нельзя —
// иначе новая работа не уедет уже никогда.
async function post(endpoint, body) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT)
  });
  if (response.status !== 200 && response.status !== 202) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
}

// `sitemapOf` — функция, а не готовая строка: собрать карту значит прочитать
// каталог и манифест, и упасть это может так же, как сама отправка. Внутри
// `try` оно потому, что старт сервера не должен зависеть ни от одного из двух.
// `endpoint` — не настройка, а шов для проверки: настоящий вызов к Bing
// из теста звать нельзя, и адрес подменяется заглушкой на 127.0.0.1.
export async function announce({ sitemapOf, origin, directory, endpoint = ENDPOINT }) {
  if (!configured()) return;
  // Адрес сайта настоящий, а не местный. Ключ — выключатель, но выключатель,
  // который можно щёлкнуть по ошибке: `.env` с боевой машины, скопированный
  // к себе, рассказал бы Bing’у про `http://127.0.0.1:3000`.
  if (!origin.startsWith('https://')) {
    console.warn(`IndexNow: SITE_ORIGIN=${origin} — не боевой адрес, отправки нет.`);
    return;
  }
  try {
    const file = path.join(directory, FILE);
    const sent = await alreadySent(file);
    const fresh = locations(await sitemapOf()).filter(url => !sent.has(url));
    if (!fresh.length) return;
    const batch = fresh.slice(0, MAX_URLS);
    const host = new URL(origin).host;
    await post(endpoint, { host, key: KEY, keyLocation: `${origin}/${KEY}.txt`, urlList: batch });
    const now = new Date().toISOString();
    await fsp.mkdir(directory, { recursive: true });
    // Шапка — один раз, при заведении файла: его однажды откроет глазами
    // человек, и гадать, что в каком столбце, дороже строки. `wx` и есть
    // «только если файла ещё нет».
    await fsp.writeFile(file, HEADER, { flag: 'wx' }).catch(problem => {
      if (problem.code !== 'EEXIST') throw problem;
    });
    await fsp.appendFile(file, batch.map(url => `${now}\t${url}\n`).join(''));
    console.log(`IndexNow: отправлено адресов — ${batch.length} из ${fresh.length} новых.`);
  } catch (error) {
    // Ни старт, ни запрос от этого не страдают: непринятый список уедет
    // при следующем перезапуске, потому что в файл он не попал.
    console.error(`IndexNow: ${error.message}`);
  }
}
