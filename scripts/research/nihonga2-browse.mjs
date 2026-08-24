// Лист для просмотра: нихонга на Викискладе, обход по категориям.
//
// Зачем второй лист. Первый (`nihonga-browse.mjs`) искал имя художника
// СТРОКОЙ В ИМЕНИ ФАЙЛА по двадцати именам. Дерево категорий он не обходил
// вовсе, и файл `Kaze by Kitano Tsunetomi.jpg`, лежащий в `Category:Nihonga`,
// был ему невидим. Вдобавок склад заводит этих людей под макронами
// (`Kanō Hōgai`, `Hishida Shunsō`, `Takeuchi Seihō`), а список имён был без них.
//
// Замер разницы — `research/2026-08-24-nihonga-collection.md`: обход категорий
// даёт 941 файл, 230 проходят плиту, и 155 из них прежним поиском недостижимы.
//
// Воронки здесь нет намеренно, как и в первом листе: отбор глазами.

import { writeFileSync, readFileSync, readdirSync } from 'fs';
import path from 'path';

const OUT = 'research/nihonga2-browse.html';
const UA = { 'User-Agent': 'tessarum-research/1.0 (samuel.faure.dev@gmail.com)' };
const API = 'https://commons.wikimedia.org/w/api.php?';

// Порог — телефонная плита, и считается он ПО КАДРУ, а не по файлу: окно 9:19.5
// берётся у горизонтали во всю высоту, значит там решает высота, а у вертикали
// ширина. Отсюда странное на вид «6680 × 3568 проходит, а 5114 × 2357 нет».
const PLATE = { w: 1440, h: 3120 };
const RATIO = PLATE.w / PLATE.h;

// Имена категорий — как их пишет склад, с макронами. Собраны поиском
// по namespace 14; варианты вида `Gyokudō Kawai` (имя вперёд) — тоже склада,
// а не опечатка.
const CATS = [
  'Nihonga',
  'Yokoyama Taikan', 'Shimomura Kanzan', 'Kobayashi Kokei', 'Hishida Shunsō',
  'Kanō Hōgai', 'Hashimoto Gahō', 'Takeuchi Seihō', 'Uemura Shōen',
  'Gyokudō Kawai', 'Seison Maeda', 'Gyoshū Hayami', 'Hayami Gyoshū',
  'Imamura Shikō', 'Yukihiko Yasuda', 'Kaburaki Kiyokata', 'Tomioka Tessai',
  'Suzuki Shōnen', 'Noguchi Shōhin', 'Watanabe Seitei', 'Imao Keinen',
  'Kawabata Gyokushō', 'Ogata Gekkō', 'Yamamoto Shunkyo', 'Kikuchi Hōbun',
  'Tsuchida Bakusen', 'Ito Shinsui', 'Terasaki Kogyo', 'Araki Kampo',
  'Matsumoto Fūko', 'Tsuji Kakō', 'Nishimura Goun', 'Murakami Kagaku',
  'Heihachiro Fukuda', 'Araki Jippo',
  'Paintings by Hishida Shunsō', 'Paintings by Uemura Shōen',
  'Paintings by Suzuki Shōnen',
];

// Двадцать имён первого листа. Всё, что ими находится, Чарли уже видел
// 24.08 — показывать второй раз незачем. Сверка идёт по имени файла без
// макронов, ровно так же, как искал первый лист.
const OLD_NAMES = [
  'Yokoyama Taikan', 'Kobayashi Kokei', 'Hishida Shunso', 'Shimomura Kanzan',
  'Imamura Shiko', 'Hayami Gyoshu', 'Kawai Gyokudo', 'Takeuchi Seiho',
  'Uemura Shoen', 'Kaburaki Kiyokata', 'Tomioka Tessai', 'Hashimoto Gaho',
  'Kano Hogai', 'Maeda Seison', 'Yasuda Yukihiko', 'Matsumoto Fuko',
  'Terasaki Kogyo', 'Araki Kanpo', 'Kono Bairei', 'Kobayashi Kiyochika',
];

// Не работы: подписи, печати, могилы, марки, снимки зданий. Список тот же,
// что в первом листе, плюс то, что тянет ИМЕННО обход категорий: pdf-сканы
// Национальной парламентской библиотеки, лаковые предметы Рейксмузеума
// (`AK-MAK`, `AK-RAK`) и ширмы школы Кано с Гэндзи — Эдо, не нихонга.
const SKIP =
  /\b(signature|seal|grave|tomb|stamp|postage|monument|plaque|memorial|museum building|exhibition|photograph of|banknote|coin|book cover|title page)\b/i;
const NOT_NIHONGA = /\.pdf$|AK-MAK|AK-RAK|netsuke|lacquer|inro|Genji folding screen|Kano School/i;

const strip = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

async function api(params) {
  const url = API + new URLSearchParams({ format: 'json', action: 'query', ...params });
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (r.ok) return r.json();
    } catch {
      /* сеть моргнула — та же пауза, что и на не-200 */
    }
    await new Promise(res => setTimeout(res, 600 * (attempt + 1)));
  }
  throw new Error(`commons api failed: ${url}`);
}

// Обход на одну ступень вглубь. Глубже не ходим намеренно: у `Category:Nihonga`
// подкатегории второго уровня уводят в живопись вообще, и лист распухает тем,
// что к теме отношения не имеет.
const found = new Map(); // title -> category
async function walk(cat, depth) {
  let cont = null;
  for (;;) {
    const d = await api({
      list: 'categorymembers', cmtitle: `Category:${cat}`,
      cmtype: 'file|subcat', cmlimit: '500', ...(cont ? { cmcontinue: cont } : {}),
    });
    for (const m of d.query?.categorymembers ?? []) {
      if (m.ns === 6) {
        if (!found.has(m.title)) found.set(m.title, cat);
      } else if (m.ns === 14 && depth > 0) {
        await walk(m.title.replace('Category:', ''), depth - 1);
      }
    }
    cont = d.continue?.cmcontinue;
    if (!cont) break;
  }
}

async function sizes(titles) {
  const out = [];
  for (let i = 0; i < titles.length; i += 25) {
    const d = await api({
      prop: 'imageinfo', titles: titles.slice(i, i + 25).join('|'),
      iiprop: 'size|url|extmetadata', iiurlwidth: '420',
    });
    for (const p of Object.values(d.query?.pages ?? {})) {
      const ii = p.imageinfo?.[0];
      if (!ii?.width) continue;
      out.push({
        title: p.title.replace(/^File:/, ''),
        w: ii.width, h: ii.height,
        thumb: ii.thumburl, page: ii.descriptionurl,
        lic: ii.extmetadata?.LicenseShortName?.value ?? '?',
        cat: found.get(p.title),
      });
    }
  }
  return out;
}

// Что уже стоит на витрине. Работы каталога с Викисклада сверяются по адресу
// страницы файла: `provenance.page` у них — та самая ссылка, которую отдаёт
// `descriptionurl`.
function inCatalogue() {
  const dir = 'catalogue';
  const pages = new Set();
  for (const f of readdirSync(dir)) {
    if (!f.startsWith('vl-')) continue;
    const d = JSON.parse(readFileSync(path.join(dir, f), 'utf8'));
    const p = d.provenance?.page;
    if (p?.includes('commons.wikimedia.org')) pages.add(decodeURI(p));
  }
  return pages;
}

console.log(`обход ${CATS.length} категорий…`);
for (const c of CATS) await walk(c, 1);
console.log(`файлов найдено: ${found.size}`);

const files = await sizes([...found.keys()]);
console.log(`обмерено: ${files.length}`);

const have = inCatalogue();
const cut = { small: 0, skip: 0, notNihonga: 0, old: 0, already: 0, badLicense: 0 };
const works = [];
for (const f of files) {
  if (SKIP.test(f.title)) { cut.skip++; continue; }
  if (NOT_NIHONGA.test(f.title)) { cut.notNihonga++; continue; }
  // Кадр: у горизонтали режется ширина при полной высоте, у вертикали наоборот.
  const passes = f.w / f.h >= RATIO ? f.h >= PLATE.h : f.w >= PLATE.w;
  if (!passes) { cut.small++; continue; }
  // CC BY-SA в `LICENSES` (`works.js`) нет вовсе: «поделись так же» тянет
  // условие на саму витрину. Отсеиваем здесь, а не глазами на листе.
  if (/BY-SA/i.test(f.lic)) { cut.badLicense++; continue; }
  if (have.has(decodeURI(f.page))) { cut.already++; continue; }
  if (OLD_NAMES.some(n => strip(f.title).toLowerCase().includes(n.toLowerCase()))) {
    cut.old++;
    continue;
  }
  works.push(f);
}

const byCat = new Map();
for (const w of works) {
  if (!byCat.has(w.cat)) byCat.set(w.cat, []);
  byCat.get(w.cat).push(w);
}
const sections = [...byCat.entries()]
  .map(([name, list]) => ({
    name,
    works: list.sort((a, b) => b.w * b.h - a.w * a.h),
  }))
  .sort((a, b) => b.works.length - a.works.length);

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function card(f) {
  const long = Math.max(f.w, f.h);
  const phone = f.h >= PLATE.h ? ' · 📱' : '';
  const desk = long >= 3840 ? ' · 4K' : '';
  return `<figure>
  <label><input type="checkbox" class="pick" value="${esc(f.page)}"> ${f.w} × ${f.h}${phone}${desk} <span class="lic">${esc(f.lic)}</span></label>
  <a href="${esc(f.page)}" target="_blank" rel="noreferrer"><img loading="lazy" src="${esc(f.thumb)}" alt=""></a>
  <figcaption>${esc(f.title.replace(/\.[a-z]+$/i, ''))}</figcaption>
</figure>`;
}

const body = sections
  .map(s => `<h2>${esc(s.name)} <small>${s.works.length}</small></h2>
<div class="grid">
${s.works.map(card).join('\n')}
</div>`)
  .join('\n<hr>\n');

const html = `<!doctype html>
<html lang="ru">
<head><meta charset="utf-8"><title>Нихонга: обход по категориям</title>
<style>
  body { font-family: sans-serif; padding: 16px; max-width: 1600px; margin: 0 auto; }
  .grid { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-start; }
  figure { margin: 0; width: 420px; }
  figure img { max-width: 420px; max-height: 560px; display: block; background: #f2f2f2; }
  figcaption { font-size: .8em; color: #666; max-width: 420px; }
  label { display: block; font-size: .85em; cursor: pointer; }
  .lic { color: #999; }
  h2 small { font-weight: normal; color: #888; }
  #bar { position: sticky; top: 0; background: #fff; border-bottom: 1px solid #ccc; padding: 8px 0; z-index: 10; }
  #box { width: 100%; height: 80px; font-family: monospace; font-size: 12px; }
</style>
</head>
<body>
<div id="bar">
  <b>Отобрано (<span id="count">0</span>):</b>
  <button id="clear" type="button">снять все</button><br>
  <textarea id="box" readonly placeholder="отмечайте работы — ссылки соберутся сюда"></textarea>
</div>
<h1>Нихонга: обход по категориям</h1>
<p>${works.length} работ у ${sections.length} категорий. Порог — телефонная плита
${PLATE.w} × ${PLATE.h}, и считается он <b>по кадру</b>: у горизонтали решает высота,
у вертикали ширина. 📱 — высота от ${PLATE.h}, 4K — длинная сторона от 3840.
Клик по картинке — страница файла на складе, там лицензия и полный размер.</p>
<p>Отброшено: ${cut.small} мельче плиты, ${cut.skip} не-работ, ${cut.notNihonga} не нихонга
(pdf, лак Рейксмузеума, ширмы Эдо), ${cut.badLicense} под CC BY-SA,
${cut.already} уже на витрине и <b>${cut.old} показанных прежним листом</b>.</p>
<p><b>Осторожно со снимками в залах</b> (<code>At Kyoto 2024 …</code> и подобные):
работы настоящие, но сняты в музее, и блик с трапецией там вероятны. Отсеять их
может только глаз — по имени файла они не ловятся.</p>
<p>Отметки живут в <code>localStorage</code> под ключом <code>pick-nihonga2</code>:
сотня работ не переживает перезагрузку страницы, и это уже проверено на dark academia.</p>
${body}
<script>
const KEY = 'pick-nihonga2';
const box = document.getElementById('box'), count = document.getElementById('count');
const picked = new Set(JSON.parse(localStorage.getItem(KEY) || '[]'));

function render() {
  const list = [...picked];
  box.value = list.join('\\n');
  count.textContent = list.length;
  localStorage.setItem(KEY, JSON.stringify(list));
}
for (const cb of document.querySelectorAll('.pick')) cb.checked = picked.has(cb.value);
document.addEventListener('change', e => {
  if (!e.target.classList.contains('pick')) return;
  if (e.target.checked) picked.add(e.target.value); else picked.delete(e.target.value);
  render();
});
document.getElementById('clear').addEventListener('click', () => {
  picked.clear();
  for (const cb of document.querySelectorAll('.pick')) cb.checked = false;
  render();
});
render();
</script>
</body>
</html>`;

writeFileSync(OUT, html);
console.log(`\nотброшено: ${JSON.stringify(cut)}`);
console.log(`wrote ${OUT} — ${works.length} работ, ${sections.length} разделов`);
