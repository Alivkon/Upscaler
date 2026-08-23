#!/usr/bin/env node
// Поиск остатков багета по краям выпущенных плит.
//
// ЭТО ЗАМЕР, А НЕ ПРИГОВОР. Правило видит ступеньку яркости у края и не знает,
// багет это или тёмный край композиции: на европейском масле такое путали и
// раньше (`research/2026-08-17-cleveland-frame-gate.md`). Автоматический резак
// сняли 23.08 именно за это. Здесь считается только «где посмотреть глазами»,
// а решает Charlie на листе `research/crop-ruler.html`.
//
// КАК СЧИТАЕТСЯ. По каждой стороне берётся средняя яркость вдоль полосы, но
// только по средним 60% перпендикуляра — углы и багет соседней стороны иначе
// тянут среднее на себя. Полка — медиана профиля на глубине от D до 2D, где
// D — 8% стороны. Ступенькой считается последний столбец у края, отходящий от
// полки больше чем на PORÓG. Ширина полосы — его номер плюс один.
//
//   node scripts/research/edge-bands.mjs            вся витрина
//   node scripts/research/edge-bands.mjs vl-0151    перечисление
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { readFileSync } from 'node:fs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const IMG = path.join(ROOT, 'images');
const only = process.argv[2] ? new Set(process.argv[2].split(',')) : null;
const GEN = process.env.WALLPAPER_GEN || '/home/charlie/repos/wallpaper-gen';
const trims = Object.fromEntries(
  JSON.parse(await fs.readFile(path.join(GEN, 'museum-works.json'), 'utf8'))
    .filter(w => w.trim).map(w => [w.ref, w.trim]));

// Порог в единицах яркости 0..255. Багет свитка на vl-0151 отходит от полки
// на 47; краска у края редко даёт больше 20 ровной полосой во всю сторону.
const STEP = 22;
// Считается по копии в 960 px: полоса в 46 плитных пикселей это 22 точки,
// ступенька видна с запасом, а полная плита декодируется в двадцать раз дольше.
const WORK = 960;

const entries = [];
for (const name of (await fs.readdir(path.join(IMG, 'manifest'))).filter(n => n.endsWith('.json'))) {
  const parsed = JSON.parse(await fs.readFile(path.join(IMG, 'manifest', name), 'utf8'));
  if (Array.isArray(parsed)) entries.push(...parsed);
}
const catalogue = Object.fromEntries(
  (await fs.readdir(path.join(ROOT, 'catalogue')))
    .filter(f => /^vl-\d+\.json$/.test(f))
    .map(f => JSON.parse(readFileSync(path.join(ROOT, 'catalogue', f), 'utf8')))
    .map(e => [e.ref, e]));

const median = xs => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

// Полоса ДОЛЖНА НАЧИНАТЬСЯ У САМОГО КРАЯ. Первая версия искала последнюю
// ступеньку на глубине и ловила небо и землю: у vl-0308 край и полка отличались
// на 4, а «полоса» вышла 266 px — это была граница composition в трети кадра.
function band(profile, depth, side) {
  const shelf = median(profile.slice(depth, depth * 2));
  if (Math.abs(profile[0] - shelf) <= STEP) return null;
  let i = 1;
  while (i < depth && Math.abs(profile[i] - shelf) > STEP) i++;
  if (i >= depth) return null;
  // Ширина. Багет вдоль стороны тонок; полоса шире двадцатой части — это
  // небо, земля или тень, и на прогоне 23.08 такие давали почти весь шум
  // (vl-0350 «полоса» 427 px, vl-0383 — 360).
  if (i > side / 20) return null;
  // Ступенька должна держаться, а не быть одним тёмным столбцом у среза.
  const mean = profile.slice(0, i).reduce((a, b) => a + b, 0) / i;
  if (Math.abs(mean - shelf) <= STEP) return null;
  return { width: i, shelf, edge: profile[0] };
}

// Полоса края в лист: 8% стороны на всю её длину, левая и правая повёрнуты
// в горизонталь, чтобы четыре стороны читались одним движением глаза.
const STRIP_LONG = 460, STRIP_DEEP = 36;
async function strip(file, side, W, H) {
  const box = {
    top:    { left: 0, top: 0, width: W, height: Math.round(H * 0.08) },
    bottom: { left: 0, top: H - Math.round(H * 0.08), width: W, height: Math.round(H * 0.08) },
    left:   { left: 0, top: 0, width: Math.round(W * 0.08), height: H },
    right:  { left: W - Math.round(W * 0.08), top: 0, width: Math.round(W * 0.08), height: H }
  }[side];
  // Поворот ВТОРЫМ проходом. В одном конвейере sharp поворачивает раньше,
  // чем режет, и коробка, посчитанная по неповёрнутой плите, вылетает за край.
  const cut = await sharp(file).extract(box).toBuffer();
  let img = sharp(cut);
  // Левую и правую кладём набок, срезом ВНИЗ — тогда у всех четырёх полос
  // край плиты снизу, и багет ищется на одной линии.
  if (side === 'left') img = img.rotate(90);
  if (side === 'right') img = img.rotate(-90);
  if (side === 'top') img = img.flip();
  const buf = await img.resize(STRIP_LONG, STRIP_DEEP, { fit: 'fill' }).jpeg({ quality: 72 }).toBuffer();
  return 'data:image/jpeg;base64,' + buf.toString('base64');
}

const rows = [];
const found = [];
for (const entry of entries) {
  if (only && !only.has(entry.ref)) continue;
  if (!only && catalogue[entry.ref]?.hidden) continue;
  const copy = [entry, ...(entry.copies || [])].reduce((best, c) =>
    Math.abs((c.width ?? c.width) - WORK) < Math.abs(best.width - WORK) ? c : best);
  const { data, info } = await sharp(path.join(IMG, copy.file)).greyscale().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const at = (x, y) => data[y * W + x];
  // средние 60% перпендикуляра
  const y0 = Math.round(H * 0.2), y1 = Math.round(H * 0.8);
  const x0 = Math.round(W * 0.2), x1 = Math.round(W * 0.8);
  const colMean = x => { let s = 0; for (let y = y0; y < y1; y++) s += at(x, y); return s / (y1 - y0); };
  const rowMean = y => { let s = 0; for (let x = x0; x < x1; x++) s += at(x, y); return s / (x1 - x0); };
  const dW = Math.max(6, Math.round(W * 0.08)), dH = Math.max(6, Math.round(H * 0.08));
  const scale = entry.width / W;
  const sides = {
    left:   band([...Array(dW * 2)].map((_, i) => colMean(i)), dW, W),
    right:  band([...Array(dW * 2)].map((_, i) => colMean(W - 1 - i)), dW, W),
    top:    band([...Array(dH * 2)].map((_, i) => rowMean(i)), dH, H),
    bottom: band([...Array(dH * 2)].map((_, i) => rowMean(H - 1 - i)), dH, H)
  };
  const flags = {};
  for (const [side, hit] of Object.entries(sides)) {
    if (!hit) continue;
    flags[side] = { px: Math.round(hit.width * scale), step: Math.round(Math.abs(hit.edge - hit.shelf)) };
    found.push({ ref: entry.ref, side, ...flags[side] });
  }
  const strips = {};
  for (const side of ['top', 'bottom', 'left', 'right']) strips[side] = await strip(path.join(IMG, copy.file), side, W, H);
  rows.push({ ref: entry.ref, title: catalogue[entry.ref]?.title || '', trim: trims[entry.ref] || null,
    size: entry.width + '×' + entry.height, flags, strips,
    worst: Math.max(0, ...Object.values(flags).map(f => f.step)) });
}

rows.sort((a, b) => b.worst - a.worst);
const SIDES = ['top', 'bottom', 'left', 'right'];
const card = r => `<div class="work${r.worst ? '' : ' quiet'}">
  <div class="head"><span class="ref">${r.ref}</span><span class="title">${r.title.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</span>
  <span class="size">${r.size}</span>${r.trim ? `<span class="cut">cut ${SIDES.filter(s => r.trim[s]).map(s => s + ' ' + r.trim[s]).join(' · ')}</span>` : ''}</div>
  <div class="strips">${SIDES.map(side => `<figure class="${r.flags[side] ? 'hit' : ''}">
    <img src="${r.strips[side]}" alt="${side}">
    <figcaption>${side}${r.flags[side] ? ` · полоса ~${r.flags[side].px}px, ступенька ${r.flags[side].step}` : ''}</figcaption>
  </figure>`).join('')}</div></div>`;

const html = `<!DOCTYPE html>
<html lang="ru"><head><meta charset="UTF-8"><title>Edge bands — что ещё в раме</title><style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#1a1a1a;color:#ccc;font:13px/1.5 'Courier New',monospace;padding:24px}
h1{color:#888;font-size:13px;font-weight:400;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px}
.note{color:#666;font-size:11px;max-width:760px;margin-bottom:28px}
.note b{color:#999;font-weight:400}
.work{margin-bottom:22px;padding-bottom:18px;border-bottom:1px solid #262626}
.work.quiet{opacity:.5}
.head{display:flex;gap:12px;align-items:baseline;margin-bottom:6px;font-size:11px}
.ref{color:#777}.title{color:#aaa;max-width:520px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.size{color:#555;margin-left:auto}.cut{color:#7a6}
.strips{display:grid;grid-template-columns:repeat(2,max-content);gap:8px 16px}
figure{display:flex;flex-direction:column;gap:3px}
figure img{display:block;border:1px solid #333;border-bottom-color:#666}
figure.hit img{border-color:#a55;border-bottom-color:#e77}
figcaption{color:#555;font-size:10px}
figure.hit figcaption{color:#c88}
</style></head><body>
<h1>Edge bands</h1>
<p class="note">Внешние 8% каждой стороны, во всю её длину. <b>Срез плиты — всегда снизу полосы</b>:
левая и правая положены набок, верхняя перевёрнута. Багет читается как ровная лента вдоль нижнего края.
Красным обведены стороны, где правило нашло ступеньку ярче ${STEP} — <b>это «посмотри сюда», а не «срежь столько»</b>:
на vl-0151 правило нашло 5 краёв из 7 и занизило ширину (28 против 48), а ложных тревог на 9 чистых краях не дало.
Одна работа — не выборка. Мерить и решать — на <b>crop-ruler.html</b>. Работы без находок внизу, приглушены.</p>
${rows.map(card).join('')}
</body></html>`;

const OUT = path.join(ROOT, only ? 'research/edge-bands-only.html' : 'research/edge-bands.html');
await fs.writeFile(OUT, html);
console.log(`${rows.length} работ · ступенька найдена у ${rows.filter(r => r.worst).length} · ${found.length} сторон`);
console.log(`→ ${OUT}  (${(html.length / 1e6).toFixed(1)} MB)`);
