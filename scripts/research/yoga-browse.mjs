// Лист для просмотра: ёга — японская живопись маслом, Мэйдзи и Тайсё.
//
// Зачем. Чарли указал на vl-0362 (Хасимото Гахо, «Torpedoes») и vl-0364
// (Рагуза Тама, «Eros and Psyche»). У обеих в ColBase одно и то же поле
// hinshitu_keijo — «Oil on canvas», и одна категория 300. Общее у них не сюжет,
// а техника: масло на холсте, западная выучка, Мэйдзи. Это ёга.
//
// Категория 300 была пройдена целиком (`colbase-funnel.mjs`), и в записи
// nihonga-browse.mjs стоит «брать там больше нечего». Это верно про категорию,
// но не про технику: если просеять весь ColBase по hinshitu_keijo, масляных
// работ Мэйдзи и Тайсё находится 199, и 138 из них лежат ВНЕ категории 300 —
// почти все в Мемориальном зале Куроды (ключи KU-a*). Воронка туда не заходила.
//
// Потолок ColBase в 3000 px никуда не делся. Поэтому вторая половина листа —
// те же художники на Викискладе, где потолка нет: 4000+ px там обычное дело.
//
// Воронки нет намеренно: лист показывает всё, отбор глазами.

import { writeFileSync, readFileSync, readdirSync } from 'fs';

const OUT = 'research/yoga-browse.html';
const UA = { 'User-Agent': 'tessarum-research/1.0 (samuel.faure.dev@gmail.com)' };
const CB = 'https://colbase.nich.go.jp/colbaseapi/v2';
const CBH = { 'x-api-key': 'aaa', 'User-Agent': 'Mozilla/5.0' };
const WM = 'https://commons.wikimedia.org/w/api.php?';

// Порог — как в nihonga-browse.mjs: телефонная плита 1440 × 3120, зазор
// в 1,04× глазом не виден, всё что выше 2400 лечится апскейлом внутри
// измеренного порога 1,7×.
const MIN_SIDE = 2400;

// Имена латиницей и без макронов — так их пишут в названиях файлов на складе.
const NAMES = [
  'Kuroda Seiki', 'Aoki Shigeru', 'Nakamura Tsune', 'Saeki Yuzo',
  'Fujishima Takeji', 'Asai Chu', 'Takahashi Yuichi', 'Mitsutani Kunishiro',
  'Yorozu Tetsugoro', 'Kishida Ryusei', 'Okada Saburosuke', 'Yamamoto Hosui',
  'Wada Eisaku', 'Harada Naojiro', 'Kawamura Kiyoo', 'Kanokogi Takeshiro',
  'Koyama Shotaro', 'Kume Keiichiro', 'Umehara Ryuzaburo', 'Yasui Sotaro',
  'Goseda Yoshimatsu', 'Nagahara Kotaro',
];

// Не работы: подписи, печати, могилы, марки, снимки зданий и витрин.
// Фильтр написан под имена файлов Викисклада и только к ним применяется —
// у ColBase заголовки другого рода, там он ловил бы не то.
const SKIP = /\b(signature|seal|grave|tomb|stamp|postage|monument|plaque|memorial|museum building|exhibition|photograph of|banknote|coin)\b/i;

const cbJson = async u => (await fetch(u, { headers: CBH })).json();

async function wmApi(params) {
  const url = WM + new URLSearchParams({ format: 'json', action: 'query', ...params });
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch(url, { headers: UA });
    if (r.ok) return r.json();
    await new Promise(res => setTimeout(res, 500 * (attempt + 1)));
  }
  throw new Error(`commons api failed: ${url}`);
}

// --- ColBase: просеиваем весь каталог по полю техники ---------------------

// Размер листинга отдаёт только миниатюру, поэтому длинную сторону читаем
// из заголовка SOF самого JPEG — первых 256 КБ хватает.
function sof(buf) {
  let i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1];
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) {
      return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}

async function pool(fn, n, jobs) {
  let i = 0;
  const run = async () => { while (i < jobs.length) await fn(jobs[i++]); };
  await Promise.all(Array.from({ length: n }, run));
}

async function colbaseOils() {
  const first = await cbJson(`${CB}/collection_items?locale=en&page=1`);
  const pages = Math.ceil(first.resultset.count / first.resultset.limit);
  const all = [...first.results];
  await pool(async p => {
    try {
      const d = await cbJson(`${CB}/collection_items?locale=en&page=${p}`);
      all.push(...d.results);
    } catch { /* пропускаем битую страницу */ }
  }, 8, Array.from({ length: pages - 1 }, (_, k) => k + 2));
  console.log(`ColBase: ${all.length} предметов всего`);

  const oils = all.filter(x =>
    x.thumbnail_url &&
    /\boil\b/i.test(x.hinshitu_keijo || '') &&
    /Meiji|Taish/i.test(x.jidai_seiki || ''));
  console.log(`ColBase: масло Мэйдзи/Тайсё — ${oils.length}`);

  // Категория 300 уже просмотрена целиком, её не повторяем.
  const c300 = new Set();
  for (let p = 1; p <= 5; p++) {
    const d = await cbJson(`${CB}/collection_items?locale=en&page=${p}&category_ids=300`);
    for (const r of d.results) c300.add(r.organization_path_name + '/' + r.organization_item_key);
  }

  // И то, что уже лежит в каталоге.
  const inCatalogue = new Set();
  for (const f of readdirSync('catalogue')) {
    const page = JSON.parse(readFileSync(`catalogue/${f}`, 'utf8')).provenance?.page || '';
    const m = page.match(/collection_items\/([^/]+)\/([^?]+)/);
    if (m) inCatalogue.add(m[1] + '/' + decodeURIComponent(m[2]));
  }

  const fresh = oils.filter(x => {
    const id = x.organization_path_name + '/' + x.organization_item_key;
    return !c300.has(id) && !inCatalogue.has(id);
  });
  console.log(`ColBase: вне категории 300 и вне каталога — ${fresh.length}`);

  const out = [];
  await pool(async it => {
    const url = it.thumbnail_url.replace('/image/thumbnail/', '/image/original/');
    let d = null;
    try {
      const r = await fetch(url, { headers: { ...CBH, Range: 'bytes=0-262143' } });
      d = sof(Buffer.from(await r.arrayBuffer()));
    } catch { /* размер не прочли — работа выпадет по порогу */ }
    if (!d || Math.max(d.w, d.h) < MIN_SIDE) return;
    out.push({
      title: `${it.title} — ${(it.sakusha || '').replace(/^By /, '')}`,
      w: d.w, h: d.h, thumb: it.thumbnail_url,
      page: `https://colbase.nich.go.jp/collection_items/${it.organization_path_name}/${encodeURIComponent(it.organization_item_key)}?locale=en`,
    });
  }, 8, fresh);
  out.sort((a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h));
  console.log(`ColBase: годных по порогу — ${out.length}`);
  return out;
}

// --- Викисклад: те же художники, без потолка ------------------------------

async function commonsWorks() {
  const seen = new Set();
  const sections = [];
  let cutSmall = 0, cutSkip = 0, cutDup = 0;

  for (const name of NAMES) {
    process.stdout.write(`${name}… `);
    const d = await wmApi({
      list: 'search', srsearch: `filetype:bitmap "${name}"`,
      srnamespace: '6', srlimit: '200', srprop: '',
    });
    const titles = d.query.search.map(x => x.title);

    const files = [];
    for (let i = 0; i < titles.length; i += 25) {
      const e = await wmApi({
        prop: 'imageinfo', titles: titles.slice(i, i + 25).join('|'),
        iiprop: 'size|url', iiurlwidth: '420',
      });
      for (const p of Object.values(e.query.pages)) {
        const ii = p.imageinfo?.[0];
        if (!ii) continue;
        files.push({
          title: p.title.replace(/^File:/, ''),
          w: ii.width, h: ii.height, thumb: ii.thumburl, page: ii.descriptionurl,
        });
      }
    }

    const works = [];
    for (const f of files) {
      if (seen.has(f.title)) { cutDup++; continue; }
      seen.add(f.title);
      if (SKIP.test(f.title)) { cutSkip++; continue; }
      if (Math.max(f.w, f.h) < MIN_SIDE) { cutSmall++; continue; }
      works.push(f);
    }
    works.sort((a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h));
    console.log(`${files.length} файлов → ${works.length}`);
    if (works.length) sections.push({ name, works, found: files.length });
  }
  return { sections, cutSmall, cutSkip, cutDup };
}

// --- лист ------------------------------------------------------------------

function card(f) {
  const long = Math.max(f.w, f.h);
  const phone = f.h >= 3120 ? ' · 📱' : '';
  const desk = long >= 3840 ? ' · 4K' : '';
  return `<figure>
  <label><input type="checkbox" class="pick" data-url="${f.page}"> ${f.w} × ${f.h}${phone}${desk}</label>
  <a href="${f.page}" target="_blank" rel="noreferrer"><img loading="lazy" src="${f.thumb}" alt=""></a>
  <figcaption>${f.title.replace(/\.[a-z]+$/i, '')}</figcaption>
</figure>`;
}

const cb = await colbaseOils();
const { sections, cutSmall, cutSkip, cutDup } = await commonsWorks();
const wmKept = sections.reduce((n, s) => n + s.works.length, 0);

const body = [
  `<h2>ColBase — масло Мэйдзи и Тайсё вне категории 300 <small>${cb.length}</small></h2>
<div class="grid">
${cb.map(card).join('\n')}
</div>`,
  ...sections.map(s => `<h2>Викисклад — ${s.name} <small>${s.works.length} из ${s.found}</small></h2>
<div class="grid">
${s.works.map(card).join('\n')}
</div>`),
].join('\n<hr>\n');

const html = `<!doctype html>
<html lang="ru">
<head><meta charset="utf-8"><title>Ёга: японское масло</title>
<style>
  body { font-family: sans-serif; padding: 16px; max-width: 1600px; margin: 0 auto; }
  .grid { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-start; }
  figure { margin: 0; width: 420px; }
  figure img { max-width: 420px; max-height: 560px; display: block; background: #f2f2f2; }
  figcaption { font-size: .8em; color: #666; max-width: 420px; }
  label { display: block; font-size: .85em; cursor: pointer; }
  h2 small { font-weight: normal; color: #888; }
  #bar { position: sticky; top: 0; background: #fff; border-bottom: 1px solid #ccc; padding: 8px 0; z-index: 10; }
  #box { width: 100%; height: 80px; font-family: monospace; font-size: 12px; }
</style>
</head>
<body>
<div id="bar">
  <b>Отобрано (<span id="count">0</span>):</b><br>
  <textarea id="box" readonly placeholder="отмечайте работы — ссылки соберутся сюда"></textarea>
</div>
<h1>Ёга: японское масло</h1>
<p>У vl-0362 и vl-0364 общее — не сюжет, а техника: «Oil on canvas», Мэйдзи,
западная выучка. Это ёга. Лист собран по технике, а не по категории.</p>
<p>Первый раздел — ColBase, ${cb.length} масляных работ Мэйдзи и Тайсё, которых
нет ни в категории 300 (её просмотрели целиком в августе), ни в каталоге.
Почти все — Мемориальный зал Куроды. Потолок в 3000 px там прежний.</p>
<p>Дальше — те же художники на Викискладе: ${wmKept} работ у ${sections.length} имён,
длинная сторона от ${MIN_SIDE} px, отброшено мелких ${cutSmall}, не-работ ${cutSkip},
повторов ${cutDup}. Потолка здесь нет — 4K попадается часто.</p>
<p>📱 — высота от 3120, 4K — длинная сторона от 3840.
Клик по картинке — страница работы, там лицензия и полный размер.</p>
${body}
<script>
const box = document.getElementById('box'), count = document.getElementById('count');
document.addEventListener('change', e => {
  if (!e.target.classList.contains('pick')) return;
  const picked = [...document.querySelectorAll('.pick:checked')].map(cb => cb.dataset.url);
  box.value = picked.join('\\n');
  count.textContent = picked.length;
});
</script>
</body>
</html>`;

writeFileSync(OUT, html);
console.log(`\nwrote ${OUT} — ColBase ${cb.length} + Викисклад ${wmKept}`);
