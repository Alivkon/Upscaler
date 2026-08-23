#!/usr/bin/env node
// Лист для обмера физического багета: research/crop-ruler.html
//
// Показывается ПЛИТА ЦЕЛИКОМ, а не кадр. Раньше сюда шли миниатюры из
// `images/crops/` — то есть уже вырезанный проём, у которого рамки по бокам
// нет: на горизонтальной работе телефонный кадр съедает больше половины
// ширины, и мерить там было нечего. Заодно расходился и масштаб: ширина
// бралась от плиты, а картинка была от кадра, и всякое снятое число врало.
//
// Плита в манифесте лежит УЖЕ ОБРЕЗАННОЙ: `trim` снимается до записи. Значит
// число, снятое здесь у работы, которую уже резали, — это добавка к тому, что
// снято раньше, а в `museum-works.json` идёт сумма. Она и кладётся в список.
//
//   node scripts/research/crop-ruler.mjs               вся витрина
//   node scripts/research/crop-ruler.mjs --only=vl-0352,vl-0356
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CATALOGUE = path.join(ROOT, 'catalogue');
const PLATES = path.join(ROOT, 'images/plates');
const MANIFEST_DIR = path.join(ROOT, 'images/manifest');
const GEN = process.env.WALLPAPER_GEN || '/home/charlie/repos/wallpaper-gen';

// Ширина картинки на листе. На 480 px багет в 30 плитных пикселей рисуется
// четырьмя точками — его не видно и в него не попасть курсором. На 960 их
// восемь, и край читается.
const THUMB = 960;

const onlyArg = process.argv.find(a => a.startsWith('--only='));
const onlyRefs = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const OUT = path.join(ROOT, onlyRefs ? 'research/crop-ruler-only.html' : 'research/crop-ruler.html');

function parseDims(filename) {
  const m = filename.match(/(\d+)x(\d+)\.jpg$/);
  return m ? { w: parseInt(m[1]), h: parseInt(m[2]) } : null;
}

// Запасной путь для работ, которых в манифесте нет: угадать по именам файлов.
// Кадры отсеиваются по суффиксу — иначе сюда снова приедет вырезанный проём.
function plateCopies(slug, plateFiles) {
  return plateFiles
    .filter(f =>
      (f.startsWith(slug + '-') || f.startsWith(slug + '.')) &&
      !f.includes('-phone-') && !f.includes('-tall-') && !f.includes('-wide-'))
    .map(f => ({ file: 'plates/' + f, ...parseDims(f) }))
    .filter(c => c.w);
}

const manifest = fs
  .readdirSync(MANIFEST_DIR)
  .filter(name => name.endsWith('.json'))
  .flatMap(name => {
    const parsed = JSON.parse(fs.readFileSync(path.join(MANIFEST_DIR, name), 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  });
const made = Object.fromEntries(manifest.map(entry => [entry.ref, entry]));

// Уже снятое поле живёт только в списке работ генератора: в манифест `trim` не
// пишется. Без него лист у резаной работы показал бы «top 0», хотя сверху уже
// снято 79, и в файл уехало бы число вместо суммы.
const WORKS = path.join(GEN, 'museum-works.json');
const trims = fs.existsSync(WORKS)
  ? Object.fromEntries(
      JSON.parse(fs.readFileSync(WORKS, 'utf8'))
        .filter(w => w.trim)
        .map(w => [w.ref, w.trim]))
  : {};

const catalogueFiles = fs.readdirSync(CATALOGUE).filter(f => /^vl-\d+\.json$/.test(f));
const entries = catalogueFiles.map(f => JSON.parse(fs.readFileSync(path.join(CATALOGUE, f), 'utf8')));
const visible = entries.filter(e => !e.hidden && (!onlyRefs || onlyRefs.has(e.ref)));

const plateFiles = fs.readdirSync(PLATES);

const images = visible.map(e => {
  const entry = made[e.ref];
  const steps = entry
    ? [entry, ...(entry.copies || [])].map(c => ({ file: c.file, w: c.width, h: c.height }))
    : plateCopies(e.slug, plateFiles);
  if (!steps.length) return null;

  // Ближайшая к THUMB копия, но не мельче: увеличенная миниатюра мылит край,
  // а по мылу край багета не поставишь.
  const bigEnough = steps.filter(c => c.w >= THUMB);
  const thumb = (bigEnough.length ? bigEnough : steps)
    .reduce((best, c) => (Math.abs(c.w - THUMB) < Math.abs(best.w - THUMB) ? c : best));

  const fullDims = entry
    ? { w: entry.width, h: entry.height }
    : steps.reduce((best, c) => (c.w * c.h > best.w * best.h ? c : best));

  const t = trims[e.ref] || null;
  return {
    ref: e.ref,
    title: e.title,
    thumb: thumb.file,
    thumbW: Math.min(thumb.w, THUMB),
    thumbH: Math.round(thumb.h * (Math.min(thumb.w, THUMB) / thumb.w)),
    fullW: fullDims.w,
    fullH: fullDims.h,
    trim: t ? { top: t.top || 0, bottom: t.bottom || 0, left: t.left || 0, right: t.right || 0 } : null
  };
}).filter(Boolean);

const IMAGES_JSON = JSON.stringify(images);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Crop Ruler — Gallery Frame Inspector</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #1a1a1a;
    color: #ccc;
    font: 13px/1.4 'Courier New', monospace;
    padding: 24px;
  }
  h1 {
    color: #888;
    font-size: 13px;
    font-weight: normal;
    margin-bottom: 8px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
  .note {
    color: #555;
    font-size: 11px;
    margin-bottom: 32px;
  }
  .grid {
    display: flex;
    flex-wrap: wrap;
    gap: 48px;
  }
  .card {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .card-label {
    display: flex;
    gap: 12px;
    align-items: baseline;
  }
  .card-ref {
    color: #666;
    font-size: 11px;
    flex-shrink: 0;
  }
  .card-title {
    color: #aaa;
    font-size: 11px;
    max-width: 480px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .card-scale {
    color: #555;
    font-size: 10px;
    margin-left: auto;
    flex-shrink: 0;
  }
  .card-trim {
    color: #7a6;
    font-size: 10px;
    flex-shrink: 0;
  }
  .ruler-area {
    display: inline-grid;
    gap: 0;
  }
  .corner { background: #232323; }
  canvas.ruler {
    display: block;
    image-rendering: pixelated;
  }
  .img-wrap {
    position: relative;
    cursor: crosshair;
  }
  .img-wrap img {
    display: block;
  }
  canvas.overlay {
    position: absolute;
    top: 0; left: 0;
    pointer-events: none;
  }
  .crosshair-label {
    position: fixed;
    background: rgba(0,0,0,0.82);
    color: #fff;
    font: 11px 'Courier New', monospace;
    padding: 3px 7px;
    border-radius: 3px;
    pointer-events: none;
    display: none;
    white-space: nowrap;
    z-index: 9999;
    transform: translate(14px, -50%);
  }
  #crop-list {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #111;
    border: 1px solid #333;
    border-radius: 4px;
    padding: 10px 12px;
    min-width: 240px;
    max-width: 360px;
    max-height: 320px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    z-index: 9998;
    font-size: 11px;
  }
  #crop-list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #555;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid #2a2a2a;
    padding-bottom: 6px;
    margin-bottom: 2px;
  }
  #crop-list-header button {
    background: #222;
    border: 1px solid #333;
    color: #888;
    font: 10px 'Courier New', monospace;
    padding: 2px 8px;
    border-radius: 2px;
    cursor: pointer;
  }
  #crop-list-header button:hover { color: #ccc; border-color: #555; }
  #crop-list-entries {
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 3px;
    flex: 1;
  }
  .crop-entry {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #aaa;
    gap: 8px;
  }
  .crop-entry .entry-ref { color: #666; flex-shrink: 0; }
  .crop-entry .entry-val { color: #ddd; }
  .crop-entry .entry-sum { color: #7a6; }
  .crop-entry .entry-del {
    color: #444;
    cursor: pointer;
    flex-shrink: 0;
    font-size: 13px;
    line-height: 1;
  }
  .crop-entry .entry-del:hover { color: #888; }
</style>
</head>
<body>

<h1>Crop Ruler</h1>
<p class="note">The whole plate, not the crop. Hover near an edge — the label shows the distance from it in full-res plate pixels. Plates already trimmed show <span style="color:#7a6">cut&nbsp;top&nbsp;79</span> next to the title, and what you click is added to it: the list records the total that goes into <code>museum-works.json</code>. Server must be running at localhost:3000.</p>

<div class="grid" id="grid"></div>

<div id="crop-list">
  <div id="crop-list-header">
    <span>clicks</span>
    <div style="display:flex;gap:6px">
      <button id="btn-copy">copy</button>
      <button id="btn-clear">clear</button>
    </div>
  </div>
  <div id="crop-list-entries"><span style="color:#333;font-size:10px">click an edge to record it</span></div>
</div>

<script>
const IMAGES = ${IMAGES_JSON};

const RULER_SIZE = 28;
const RULER_BG = '#232323';
const RULER_FG = '#555';
const RULER_LABEL = '#888';
const RULER_MAJOR = '#666';

function drawHRuler(canvas, w) {
  canvas.width = w;
  canvas.height = RULER_SIZE;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = RULER_BG;
  ctx.fillRect(0, 0, w, RULER_SIZE);
  ctx.font = '9px Courier New';
  for (let x = 0; x <= w; x++) {
    let tickH = 0;
    if (x % 100 === 0) tickH = 10;
    else if (x % 50 === 0) tickH = 7;
    else if (x % 10 === 0) tickH = 4;
    if (tickH > 0) {
      ctx.strokeStyle = x % 100 === 0 ? RULER_MAJOR : RULER_FG;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 0.5, RULER_SIZE);
      ctx.lineTo(x + 0.5, RULER_SIZE - tickH);
      ctx.stroke();
    }
    if (x > 0 && x % 100 === 0) {
      ctx.fillStyle = RULER_LABEL;
      ctx.textAlign = 'center';
      ctx.fillText(String(x), x, RULER_SIZE - 12);
    }
  }
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, RULER_SIZE - 0.5);
  ctx.lineTo(w, RULER_SIZE - 0.5);
  ctx.stroke();
}

function drawVRuler(canvas, h, side) {
  canvas.width = RULER_SIZE;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = RULER_BG;
  ctx.fillRect(0, 0, RULER_SIZE, h);
  ctx.font = '9px Courier New';
  for (let y = 0; y <= h; y++) {
    let tickW = 0;
    if (y % 100 === 0) tickW = 10;
    else if (y % 50 === 0) tickW = 7;
    else if (y % 10 === 0) tickW = 4;
    if (tickW > 0) {
      ctx.strokeStyle = y % 100 === 0 ? RULER_MAJOR : RULER_FG;
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (side === 'right') {
        ctx.moveTo(0, y + 0.5); ctx.lineTo(tickW, y + 0.5);
      } else {
        ctx.moveTo(RULER_SIZE, y + 0.5); ctx.lineTo(RULER_SIZE - tickW, y + 0.5);
      }
      ctx.stroke();
    }
    if (y > 0 && y % 100 === 0) {
      ctx.save();
      ctx.translate(side === 'right' ? 12 : RULER_SIZE - 12, y);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillStyle = RULER_LABEL;
      ctx.fillText(String(y), 0, 4);
      ctx.restore();
    }
  }
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 1;
  ctx.beginPath();
  const edgeX = side === 'right' ? 0.5 : RULER_SIZE - 0.5;
  ctx.moveTo(edgeX, 0);
  ctx.lineTo(edgeX, h);
  ctx.stroke();
}

function redrawHRulerWithMark(canvas, w, mark) {
  drawHRuler(canvas, w);
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = 'rgba(255,80,80,0.9)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(mark + 0.5, RULER_SIZE);
  ctx.lineTo(mark + 0.5, 0);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,80,80,0.9)';
  ctx.font = 'bold 9px Courier New';
  ctx.textAlign = mark > w - 30 ? 'right' : 'left';
  ctx.fillText(String(mark), mark + (mark > w - 30 ? -2 : 2), 10);
}

function redrawVRulerWithMark(canvas, h, side, mark) {
  drawVRuler(canvas, h, side);
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = 'rgba(255,80,80,0.9)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, mark + 0.5);
  ctx.lineTo(RULER_SIZE, mark + 0.5);
  ctx.stroke();
  ctx.save();
  ctx.translate(side === 'right' ? 12 : RULER_SIZE - 12, mark);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,80,80,0.9)';
  ctx.font = 'bold 9px Courier New';
  ctx.fillText(String(mark), 0, 4);
  ctx.restore();
}

const xhLabel = document.createElement('div');
xhLabel.className = 'crosshair-label';
document.body.appendChild(xhLabel);

// Click-to-list
const entries = [];
const listEl = document.getElementById('crop-list-entries');

function renderList() {
  if (entries.length === 0) {
    listEl.innerHTML = '<span style="color:#333;font-size:10px">click an edge to record it</span>';
    return;
  }
  listEl.innerHTML = '';
  entries.forEach((e, i) => {
    const row = document.createElement('div');
    row.className = 'crop-entry';
    const sum = e.total !== e.px ? \` <span class="entry-sum">+\${e.total - e.px} = \${e.total}</span>\` : '';
    row.innerHTML = \`<span class="entry-ref">\${e.ref}</span><span class="entry-val">\${e.side} \${e.px}px\${sum}</span><span class="entry-del" data-i="\${i}">×</span>\`;
    listEl.appendChild(row);
  });
}

listEl.addEventListener('click', e => {
  const i = e.target.dataset.i;
  if (i !== undefined) { entries.splice(Number(i), 1); renderList(); }
});

document.getElementById('btn-clear').addEventListener('click', () => { entries.length = 0; renderList(); });
document.getElementById('btn-copy').addEventListener('click', () => {
  const text = entries.map(e => \`\${e.ref}  \${e.side}  \${e.total}\`).join('\\n');
  navigator.clipboard.writeText(text).catch(() => prompt('Copy this:', text));
});

// В список идёт СУММА: плита уже обрезана, а снятое сейчас — добавка к ней,
// тогда как trim в museum-works.json отсчитывается от целого листа.
function recordCrop(ref, side, px, cut) {
  entries.push({ ref, side, px, total: px + (cut || 0) });
  renderList();
  listEl.parentElement.scrollTop = 99999;
}

function makeCard(img) {
  const W = img.thumbW;
  const H = img.thumbH;
  const scaleX = img.fullW ? img.fullW / W : null;
  const scaleY = img.fullH ? img.fullH / H : null;
  const scaleStr = scaleX ? \`×\${scaleX.toFixed(2)} / ×\${scaleY.toFixed(2)}\` : '? / ?';

  const card = document.createElement('div');
  card.className = 'card';

  const label = document.createElement('div');
  label.className = 'card-label';
  const ref = document.createElement('span');
  ref.className = 'card-ref';
  ref.textContent = img.ref;
  const title = document.createElement('span');
  title.className = 'card-title';
  title.textContent = img.title;
  title.title = img.title;
  const scale = document.createElement('span');
  scale.className = 'card-scale';
  scale.textContent = scaleStr;
  label.append(ref, title, scale);

  // Что уже снято. Без этой строчки резаная работа выглядит как нетронутая,
  // и снятое здесь число ушло бы в файл вместо суммы.
  if (img.trim) {
    const cut = document.createElement('span');
    cut.className = 'card-trim';
    cut.textContent = 'cut ' + ['top', 'bottom', 'left', 'right']
      .filter(side => img.trim[side]).map(side => \`\${side} \${img.trim[side]}\`).join(' · ');
    label.append(cut);
  }

  const area = document.createElement('div');
  area.className = 'ruler-area';
  area.style.gridTemplateColumns = \`\${RULER_SIZE}px \${W}px \${RULER_SIZE}px\`;
  area.style.gridTemplateRows = \`\${RULER_SIZE}px \${H}px \${RULER_SIZE}px\`;

  const corner = () => { const d = document.createElement('div'); d.className = 'corner'; return d; };
  const hTop = document.createElement('canvas'); hTop.className = 'ruler';
  const hBot = document.createElement('canvas'); hBot.className = 'ruler';
  const vLeft = document.createElement('canvas'); vLeft.className = 'ruler';
  const vRight = document.createElement('canvas'); vRight.className = 'ruler';

  const imgWrap = document.createElement('div');
  imgWrap.className = 'img-wrap';
  imgWrap.style.width = W + 'px';
  imgWrap.style.height = H + 'px';

  const image = document.createElement('img');
  image.src = \`http://localhost:3000/images/\${img.thumb}\`;
  image.width = W;
  image.height = H;
  image.alt = img.title;
  image.loading = 'lazy';

  const overlay = document.createElement('canvas');
  overlay.className = 'overlay';
  overlay.width = W;
  overlay.height = H;

  imgWrap.append(image, overlay);
  area.append(corner(), hTop, corner(), vLeft, imgWrap, vRight, corner(), hBot, corner());
  card.append(label, area);

  function drawRulers() {
    drawHRuler(hTop, W);
    drawHRuler(hBot, W);
    drawVRuler(vLeft, H, 'left');
    drawVRuler(vRight, H, 'right');
  }
  image.addEventListener('load', drawRulers);
  if (image.complete) drawRulers();

  imgWrap.addEventListener('mousemove', (e) => {
    const rect = imgWrap.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);

    const fromLeft   = scaleX ? Math.round(x * scaleX) : null;
    const fromRight  = scaleX ? Math.round((W - x) * scaleX) : null;
    const fromTop    = scaleY ? Math.round(y * scaleY) : null;
    const fromBottom = scaleY ? Math.round((H - y) * scaleY) : null;

    const hSide = fromLeft !== null
      ? (fromLeft <= fromRight ? \`left \${fromLeft}px\` : \`right \${fromRight}px\`)
      : '?';
    const vSide = fromTop !== null
      ? (fromTop <= fromBottom ? \`top \${fromTop}px\` : \`bottom \${fromBottom}px\`)
      : '?';

    xhLabel.textContent = \`\${vSide}  ·  \${hSide}\`;
    xhLabel.style.display = 'block';
    xhLabel.style.left = e.clientX + 'px';
    xhLabel.style.top = e.clientY + 'px';

    const ctx = overlay.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,80,80,0.7)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke();
    ctx.setLineDash([]);

    redrawHRulerWithMark(hTop, W, x);
    redrawVRulerWithMark(vLeft, H, 'left', y);
  });

  imgWrap.addEventListener('mouseleave', () => {
    xhLabel.style.display = 'none';
    overlay.getContext('2d').clearRect(0, 0, W, H);
    drawRulers();
  });

  imgWrap.addEventListener('click', (e) => {
    const rect = imgWrap.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    const dLeft   = scaleX ? Math.round(x * scaleX) : null;
    const dRight  = scaleX ? Math.round((W - x) * scaleX) : null;
    const dTop    = scaleY ? Math.round(y * scaleY) : null;
    const dBottom = scaleY ? Math.round((H - y) * scaleY) : null;
    // pick the single nearest edge
    const candidates = [
      dTop    !== null ? { side: 'top',    px: dTop }    : null,
      dBottom !== null ? { side: 'bottom', px: dBottom } : null,
      dLeft   !== null ? { side: 'left',   px: dLeft }   : null,
      dRight  !== null ? { side: 'right',  px: dRight }  : null,
    ].filter(Boolean);
    if (!candidates.length) return;
    const best = candidates.reduce((a, b) => a.px < b.px ? a : b);
    recordCrop(img.ref, best.side, best.px, img.trim ? img.trim[best.side] : 0);
  });

  return card;
}

const grid = document.getElementById('grid');
for (const img of IMAGES) grid.appendChild(makeCard(img));
</script>
</body>
</html>`;

fs.writeFileSync(OUT, html);
console.log(`Written ${images.length} images → ${OUT}`);
