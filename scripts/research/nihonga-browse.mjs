// Лист для просмотра: нихонга на Викискладе.
//
// Зачем. Четыре работы, про которые спросил Чарли (Кокэй, Тайкан, Фуко), пришли
// из ColBase, категория 300 «Japan — Modern paintings». Категория пройдена
// целиком (`colbase-funnel.mjs`), брать там больше нечего. Те же художники
// лежат на Викискладе, и там нет потолка в 3000 px — из-за которого японские
// работы приезжают апскейлом (research/2026-08-22-japanese-museums.md).
//
// Воронки здесь нет намеренно: лист показывает всё, что нашлось, отбор глазами.
//
// Имена латиницей и без макронов — так их пишут в названиях файлов на складе.
// Поиск по кавычкам, namespace 6 (файлы), только растр.

import { writeFileSync } from 'fs';

const OUT = 'research/nihonga-browse.html';
const UA = { 'User-Agent': 'tessarum-research/1.0 (samuel.faure.dev@gmail.com)' };
const API = 'https://commons.wikimedia.org/w/api.php?';

// Порог. Телефонная плита — 1440 × 3120, и по записи о японских музеях
// зазор до неё в 1,04× глазом не виден. Отсюда 2400: всё, что выше, лечится
// апскейлом внутри измеренного порога 1,7×; ниже — уже не витрина.
const MIN_SIDE = 2400;

const NAMES = [
  'Yokoyama Taikan', 'Kobayashi Kokei', 'Hishida Shunso', 'Shimomura Kanzan',
  'Imamura Shiko', 'Hayami Gyoshu', 'Kawai Gyokudo', 'Takeuchi Seiho',
  'Uemura Shoen', 'Kaburaki Kiyokata', 'Tomioka Tessai', 'Hashimoto Gaho',
  'Kano Hogai', 'Maeda Seison', 'Yasuda Yukihiko', 'Matsumoto Fuko',
  'Terasaki Kogyo', 'Araki Kanpo', 'Kono Bairei', 'Kobayashi Kiyochika',
];

// Не работы: подписи, печати, могилы, марки, снимки зданий и витрин.
const SKIP = /\b(signature|seal|grave|tomb|stamp|postage|monument|plaque|memorial|museum building|exhibition|photograph of|banknote|coin)\b/i;

async function api(params) {
  const url = API + new URLSearchParams({ format: 'json', action: 'query', ...params });
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch(url, { headers: UA });
    if (r.ok) return r.json();
    await new Promise(res => setTimeout(res, 500 * (attempt + 1)));
  }
  throw new Error(`commons api failed: ${url}`);
}

async function searchFiles(name) {
  const titles = [];
  let offset = 0;
  for (;;) {
    const d = await api({
      list: 'search', srsearch: `filetype:bitmap "${name}"`,
      srnamespace: '6', srlimit: '500', sroffset: String(offset), srprop: '',
    });
    titles.push(...d.query.search.map(x => x.title));
    const cont = d.continue?.sroffset;
    if (cont === undefined || titles.length >= 500) break;
    offset = cont;
  }
  return titles;
}

async function sizes(titles) {
  const out = [];
  for (let i = 0; i < titles.length; i += 25) {
    const d = await api({
      prop: 'imageinfo', titles: titles.slice(i, i + 25).join('|'),
      iiprop: 'size|url', iiurlwidth: '420',
    });
    for (const p of Object.values(d.query.pages)) {
      const ii = p.imageinfo?.[0];
      if (!ii) continue;
      out.push({
        title: p.title.replace(/^File:/, ''),
        w: ii.width, h: ii.height,
        thumb: ii.thumburl, page: ii.descriptionurl,
      });
    }
  }
  return out;
}

const seen = new Set();
const sections = [];
let kept = 0, cutSmall = 0, cutSkip = 0, cutDup = 0;

for (const name of NAMES) {
  process.stdout.write(`${name}… `);
  const titles = await searchFiles(name);
  const files = await sizes(titles);

  const works = [];
  for (const f of files) {
    if (seen.has(f.title)) { cutDup++; continue; }
    seen.add(f.title);
    if (SKIP.test(f.title)) { cutSkip++; continue; }
    if (Math.max(f.w, f.h) < MIN_SIDE) { cutSmall++; continue; }
    works.push(f);
  }
  works.sort((a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h));
  kept += works.length;
  console.log(`${files.length} files → ${works.length}`);
  if (works.length) sections.push({ name, works, found: files.length });
}

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

const body = sections.map(s => `<h2>${s.name} <small>${s.works.length} из ${s.found}</small></h2>
<div class="grid">
${s.works.map(card).join('\n')}
</div>`).join('\n<hr>\n');

const html = `<!doctype html>
<html lang="ru">
<head><meta charset="utf-8"><title>Нихонга на Викискладе</title>
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
<h1>Нихонга на Викискладе</h1>
<p>${kept} работ у ${sections.length} художников. Длинная сторона от ${MIN_SIDE} px,
отброшено мелких ${cutSmall}, не-работ ${cutSkip}, повторов ${cutDup}.
📱 — высота от 3120, 4K — длинная сторона от 3840. Потолка в 3000 px, как у ColBase, здесь нет.
Клик по картинке — страница файла на складе, там лицензия и полный размер.</p>
<p>Порядок разделов — как в списке имён, и два последних стоят последними нарочно:
у Байрэя и Киётики склад держит в основном гравюру и книжный лист, а не живопись,
и вдвоём они дают больше половины листа. Работы вроде тех четырёх — выше.</p>
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
console.log(`\nwrote ${OUT} — ${kept} works`);
