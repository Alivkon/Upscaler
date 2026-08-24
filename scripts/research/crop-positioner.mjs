#!/usr/bin/env node
// Generates research/crop-positioner.html from the current catalogue.
// Each card shows the full plate image (480px thumbnail) in a draggable
// viewport matching the phone crop ratio, so you can pan to choose crop
// position and click to record it.
// Run: node scripts/research/crop-positioner.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CATALOGUE = path.join(ROOT, 'catalogue');
const PLATES = path.join(ROOT, 'images/plates');
const MANIFEST_DIR = path.join(ROOT, 'images/manifest');
const PHONE_SHEET = path.join(ROOT, 'research/to-crop-positions.md');

// Только те кадры 16:9, которые витрина показывает: `DESKTOP_GATE` в `gallery.js`
// прячет всё, что мельче. Мерка повторена, а не импортирована, потому что этот
// лист — черновик, а не сайт, и падать от чужого рефактора ему незачем.
const DESKTOP_GATE = { width: 1920, height: 1080 };

// Пропорции проёмов — те же, что режет `wallpaper-gen/treatment.mjs`.
const RATIOS = { phone: 9 / 19.5, tall: 9 / 16, wide: 16 / 9 };

// Самый большой проём такой пропорции, влезающий в плиту целиком.
const windowSize = (ratio, width, height) =>
  width / height > ratio ? { width: Math.round(height * ratio), height } : { width, height: Math.round(width / ratio) };

// Правило для одного кадра: `crop` бывает общим (`{left, top}`) и по кадрам
// (`{ phone: {...}, wide: {...} }`). Повторяет `frameCrop()` генератора — лист,
// не знающий про вторую форму, открывал бы сдвинутые работы по середине.
function frameCrop(rule, kind) {
  if (!rule || typeof rule !== 'object' || Array.isArray(rule)) return rule;
  if (!Object.keys(rule).some(key => key in RATIOS)) return rule;
  return rule[kind] ?? (kind === 'tall' ? rule.phone : null) ?? null;
}

// Где проём стоит СЕЙЧАС: правило `crop` из манифеста, недостающая ось — по
// середине. Ровно та же арифметика, что в `placement()` генератора, иначе лист
// открывался бы не на том кадре, который выпущен.
function placedAt(rule, ratio, width, height) {
  const box = windowSize(ratio, width, height);
  const clamp = (v, max) => Math.min(Math.max(v, 0), max);
  const object = rule && typeof rule === 'object' && !Array.isArray(rule);
  return {
    left: object && rule.left != null ? clamp(rule.left, width - box.width) : Math.round((width - box.width) / 2),
    top: object && rule.top != null ? clamp(rule.top, height - box.height) : Math.round((height - box.height) / 2)
  };
}

function parseDims(filename) {
  const m = filename.match(/(\d+)x(\d+)\.jpg$/);
  return m ? { w: parseInt(m[1]), h: parseInt(m[2]) } : null;
}

function findPlateThumb(slug, plateFiles, targetW) {
  // Find the plate thumbnail closest to targetW that is NOT a crop type (phone/tall/wide)
  const matches = plateFiles.filter(f =>
    (f.startsWith(slug + '-') || f.startsWith(slug + '.')) &&
    !f.includes('-phone-') && !f.includes('-tall-') && !f.includes('-wide-')
  );
  let best = null, bestDiff = Infinity;
  for (const f of matches) {
    const d = parseDims(f);
    if (!d) continue;
    const diff = Math.abs(d.w - targetW);
    if (diff < bestDiff) { bestDiff = diff; best = { file: 'plates/' + f, ...d }; }
  }
  return best;
}

function largestPlate(slug, plateFiles) {
  const matches = plateFiles.filter(f =>
    (f.startsWith(slug + '-') || f.startsWith(slug + '.')) &&
    !f.includes('-phone-') && !f.includes('-tall-') && !f.includes('-wide-')
  );
  let best = null, bestArea = 0;
  for (const f of matches) {
    const d = parseDims(f);
    if (d && d.w * d.h > bestArea) { bestArea = d.w * d.h; best = { file: 'plates/' + f, ...d }; }
  }
  return best;
}

// Листы:
//   (по умолчанию)   вся витрина, проём телефонный
//   --unseen         только те, о ком в `to-crop-positions.md` нет строки
//   --desktop        только те, чей кадр 16:9 витрина показывает
//   --only=vl-0001,… перечисление
//
// Размеры плиты берутся ИЗ МАНИФЕСТА, а не из поля `file` каталога. Каталог
// отстаёт: у полусотни работ там имя плиты прошлой сборки, и пиксели, снятые
// по нему, легли бы в лист неправильными — сдвиг считается долями от ширины.
const onlyArg = process.argv.find(a => a.startsWith('--only='));
const onlyRefs = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const desktop = process.argv.includes('--desktop');
const unseen = process.argv.includes('--unseen');
const OUT = path.join(
  ROOT,
  desktop ? 'research/crop-positioner-desktop.html'
    : unseen ? 'research/crop-positioner-unseen.html'
      : onlyRefs ? 'research/crop-positioner-only.html'
        : 'research/crop-positioner.html'
);

const manifest = fs
  .readdirSync(MANIFEST_DIR)
  .filter(name => name.endsWith('.json'))
  .flatMap(name => {
    const parsed = JSON.parse(fs.readFileSync(path.join(MANIFEST_DIR, name), 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  });
const made = Object.fromEntries(manifest.map(entry => [entry.ref, entry]));

// Развеска решает, что на витрине: запись без строки в `order.json` не
// показывается, и спрашивать про её кадр незачем.
const hung = new Set(JSON.parse(fs.readFileSync(path.join(CATALOGUE, 'order.json'), 'utf8')));
const seen = new Set(
  fs.existsSync(PHONE_SHEET)
    ? [...fs.readFileSync(PHONE_SHEET, 'utf8').matchAll(/^\|\s*(vl-\d+)/gm)].map(m => m[1])
    : []
);

const catalogueFiles = fs.readdirSync(CATALOGUE).filter(f => /^vl-\d+\.json$/.test(f));
const entries = catalogueFiles.map(f => JSON.parse(fs.readFileSync(path.join(CATALOGUE, f), 'utf8')));
const visible = entries.filter(e => {
  if (e.hidden) return false;
  if (onlyRefs) return onlyRefs.has(e.ref);
  if (!desktop && !unseen) return true;
  if (!hung.has(e.ref)) return false;
  if (unseen) return !seen.has(e.ref);
  const wide = made[e.ref]?.crops?.wide;
  return !!wide && wide.width >= DESKTOP_GATE.width && wide.height >= DESKTOP_GATE.height;
});

const plateFiles = fs.readdirSync(PLATES);

const images = visible.map(e => {
  const entry = made[e.ref];

  // Плита и её копии — из манифеста; он и есть список того, что сделано.
  // Без записи в манифесте остаётся старый способ: угадать по именам файлов.
  const steps = entry ? [entry, ...(entry.copies || [])].map(c => ({ file: c.file, w: c.width, h: c.height })) : null;
  const thumb = steps
    ? steps.reduce((best, c) => (Math.abs(c.w - 480) < Math.abs(best.w - 480) ? c : best))
    : findPlateThumb(e.slug, plateFiles, 480);
  if (!thumb) return null;

  const fullDims = entry
    ? { w: entry.width, h: entry.height }
    : (() => {
        const d = e.file ? parseDims(path.basename(e.file)) : null;
        if (d) return d;
        const p = largestPlate(e.slug, plateFiles);
        return p ? { w: p.w, h: p.h } : null;
      })();

  // Где кадры стоят сейчас — чтобы проём открывался на выпущенном месте, а не
  // в середине: половина витрины уже сдвинута, и «как есть» надо видеть до того,
  // как двигаешь.
  const now = fullDims
    ? Object.fromEntries(
        Object.entries(RATIOS).map(([kind, ratio]) => [
          kind,
          placedAt(frameCrop(entry?.crop, kind), ratio, fullDims.w, fullDims.h)
        ])
      )
    : null;

  // Сдвинут ли ИМЕННО ЭТОТ проём. Работа с полем `crop` не обязательно сдвинута
  // на всех трёх: у вертикальной плиты кадр 16:9 занимает всю ширину, двигаться
  // ему некуда, и «сдвинута» на десктопном листе было бы неправдой.
  const moved = now
    ? Object.fromEntries(
        Object.entries(RATIOS).map(([kind, ratio]) => {
          const centre = placedAt(null, ratio, fullDims.w, fullDims.h);
          return [kind, now[kind].left !== centre.left || now[kind].top !== centre.top];
        })
      )
    : null;

  const wide = entry?.crops?.wide;
  return {
    ref: e.ref,
    title: e.title,
    thumb: thumb.file,
    thumbW: thumb.w,
    thumbH: thumb.h,
    fullW: fullDims ? fullDims.w : null,
    fullH: fullDims ? fullDims.h : null,
    now,
    moved,
    desk: wide ? `${wide.width}×${wide.height}` : null
  };
}).filter(Boolean);

const IMAGES_JSON = JSON.stringify(images);

// Заголовок и проём по умолчанию — от листа. Десктопный открывается на 16:9:
// открывать его на телефонном значило бы спрашивать не про то, что показано.
const PAGE = desktop
  ? { title: 'Desktop Positioner', crop: 'wide', note: 'gallery works whose 16:9 frame passes ' + DESKTOP_GATE.width + '×' + DESKTOP_GATE.height }
  : unseen
    ? { title: 'Crop Positioner — unseen', crop: 'phone', note: 'gallery works with no row in to-crop-positions.md yet' }
    : { title: 'Crop Positioner', crop: 'phone', note: 'drag image to pan · click to record' };
const PAGE_JSON = JSON.stringify(PAGE);

// Crop-type viewport ratios (W:H)
// phone 9:19.5, tall 9:16, wide 16:9
const CROP_TYPES = JSON.stringify([
  { key: 'phone', label: 'phone', vw: 220, vh: 476 },   // 9:19.5
  { key: 'tall',  label: 'tall',  vw: 240, vh: 427 },   // 9:16
  { key: 'wide',  label: 'wide',  vw: 480, vh: 270 },   // 16:9
]);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${PAGE.title} — Pan to Frame</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #1a1a1a;
    color: #ccc;
    font: 13px/1.4 'Courier New', monospace;
    padding: 24px 24px 200px;
  }
  .top-bar {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 28px;
    flex-wrap: wrap;
  }
  h1 {
    color: #888;
    font-size: 13px;
    font-weight: normal;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
  .note { color: #555; font-size: 11px; }
  .crop-tabs {
    display: flex;
    gap: 4px;
  }
  .crop-tab {
    background: #222;
    border: 1px solid #333;
    color: #666;
    font: 11px 'Courier New', monospace;
    padding: 3px 10px;
    border-radius: 2px;
    cursor: pointer;
    letter-spacing: 0.03em;
  }
  .crop-tab.active { background: #2a2a2a; border-color: #555; color: #ccc; }
  .crop-tab:hover:not(.active) { color: #aaa; border-color: #444; }
  .grid {
    display: flex;
    flex-wrap: wrap;
    gap: 36px 40px;
    align-items: flex-start;
  }
  .card {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .card-label {
    display: flex;
    gap: 10px;
    align-items: baseline;
    max-width: 360px;
  }
  .card-ref { color: #666; font-size: 11px; flex-shrink: 0; }
  .card-title {
    color: #888;
    font-size: 10px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
  }
  .viewport {
    overflow: hidden;
    position: relative;
    cursor: grab;
    border: 1px solid #333;
    user-select: none;
    flex-shrink: 0;
  }
  .viewport.dragging { cursor: grabbing; }
  .viewport img {
    position: absolute;
    top: 0; left: 0;
    display: block;
    pointer-events: none;
    user-select: none;
    -webkit-user-drag: none;
    image-rendering: auto;
  }
  .viewport-frame {
    position: absolute;
    inset: 0;
    pointer-events: none;
    box-shadow: inset 0 0 0 1px rgba(255,80,80,0.3);
    z-index: 2;
  }
  .card-desk { color: #4a5a4a; font-size: 10px; flex-shrink: 0; }
  .card-placed { color: #6a5a3a; font-size: 10px; flex-shrink: 0; }
  .pos-label {
    color: #666;
    font-size: 10px;
    height: 14px;
    transition: color 0.1s;
  }
  .pos-label.has-pan { color: #aaa; }
  .btn-row {
    display: flex;
    gap: 4px;
  }
  .record-btn, .center-btn {
    background: #1e1e1e;
    border: 1px solid #2a2a2a;
    color: #555;
    font: 10px 'Courier New', monospace;
    padding: 3px 10px;
    border-radius: 2px;
    cursor: pointer;
    text-align: center;
    letter-spacing: 0.03em;
  }
  .record-btn { flex: 1; }
  .record-btn:hover, .center-btn:hover { border-color: #444; color: #aaa; }
  #crop-list {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #111;
    border: 1px solid #333;
    border-radius: 4px;
    padding: 10px 12px;
    min-width: 260px;
    max-width: 400px;
    max-height: 300px;
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
    gap: 6px;
    flex-shrink: 0;
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
    gap: 8px;
  }
  .entry-ref { color: #666; flex-shrink: 0; font-size: 10px; }
  .entry-val { color: #ddd; font-size: 10px; }
  .entry-del { color: #444; cursor: pointer; flex-shrink: 0; font-size: 13px; line-height: 1; }
  .entry-del:hover { color: #888; }
</style>
</head>
<body>

<div class="top-bar">
  <h1>${PAGE.title}</h1>
  <div class="crop-tabs" id="crop-tabs"></div>
  <span class="note">${images.length} works · ${PAGE.note} · drag to pan, click to record · plates from <span id="origin">:3000</span></span>
</div>

<div class="grid" id="grid"></div>

<div id="crop-list">
  <div id="crop-list-header">
    <span>recorded</span>
    <div style="display:flex;gap:6px">
      <button id="btn-copy">copy</button>
      <button id="btn-clear">clear</button>
    </div>
  </div>
  <div id="crop-list-entries"><span style="color:#333;font-size:10px">click a card to record position</span></div>
</div>

<script>
const IMAGES = ${IMAGES_JSON};
const CROP_TYPES = ${CROP_TYPES};
const PAGE = ${PAGE_JSON};

let activeCrop = CROP_TYPES.find(ct => ct.key === PAGE.crop) || CROP_TYPES[0];

// --- List ---
const entries = [];
const listEl = document.getElementById('crop-list-entries');

function renderList() {
  if (!entries.length) {
    listEl.innerHTML = '<span style="color:#333;font-size:10px">click a card to record position</span>';
    return;
  }
  listEl.innerHTML = '';
  entries.forEach((e, i) => {
    const row = document.createElement('div');
    row.className = 'crop-entry';
    row.innerHTML = \`<span class="entry-ref">\${e.ref}</span><span class="entry-val">\${e.pos}</span><span class="entry-del" data-i="\${i}">×</span>\`;
    listEl.appendChild(row);
  });
}

listEl.addEventListener('click', ev => {
  const i = ev.target.dataset.i;
  if (i !== undefined) { entries.splice(Number(i), 1); renderList(); }
});

document.getElementById('btn-clear').addEventListener('click', () => { entries.length = 0; renderList(); });
document.getElementById('btn-copy').addEventListener('click', () => {
  const text = entries.map(e => \`\${e.ref}  \${e.pos}\`).join('\\n');
  navigator.clipboard.writeText(text).catch(() => prompt('Copy:', text));
});

function recordPos(ref, posStr) {
  entries.push({ ref, pos: posStr });
  renderList();
  listEl.scrollTop = 99999;
}

// --- Crop type tabs ---
const tabsEl = document.getElementById('crop-tabs');
// Шапка называет хост, с которого приехали плиты. Не украшение: если витрина
// на :3000 не поднята или поднята на другой машине, карточки открываются
// пустыми рамками, и по надписи видно, куда лист стучался.
const PLATE_HOST = (location.hostname || 'localhost') + ':3000';
document.getElementById('origin').textContent = PLATE_HOST;

const cards = []; // {el, updateViewport} for rebuilding on tab switch

CROP_TYPES.forEach(ct => {
  const btn = document.createElement('button');
  btn.className = 'crop-tab' + (ct.key === activeCrop.key ? ' active' : '');
  btn.textContent = ct.label;
  btn.addEventListener('click', () => {
    activeCrop = ct;
    tabsEl.querySelectorAll('.crop-tab').forEach(b => b.classList.toggle('active', b.textContent === ct.label));
    cards.forEach(c => c.updateViewport(ct));
  });
  tabsEl.appendChild(btn);
});

// --- Card builder ---
function makeCard(img) {
  const card = document.createElement('div');
  card.className = 'card';

  const labelRow = document.createElement('div');
  labelRow.className = 'card-label';
  const refEl = document.createElement('span');
  refEl.className = 'card-ref';
  refEl.textContent = img.ref;
  const titleEl = document.createElement('span');
  titleEl.className = 'card-title';
  titleEl.textContent = img.title;
  titleEl.title = img.title;
  labelRow.append(refEl, titleEl);
  if (img.desk && PAGE.crop === 'wide') {
    const deskEl = document.createElement('span');
    deskEl.className = 'card-desk';
    deskEl.textContent = img.desk;
    labelRow.appendChild(deskEl);
  }
  const movedEl = document.createElement('span');
  movedEl.className = 'card-placed';
  movedEl.textContent = '·moved';
  movedEl.title = 'this frame already sits off centre';
  movedEl.style.display = 'none';
  labelRow.appendChild(movedEl);

  const viewport = document.createElement('div');
  viewport.className = 'viewport';

  const imgEl = document.createElement('img');
  // Хост берётся у самой страницы, а порт остаётся 3000. Стояло здесь
  // \`http://localhost:3000\` намертво, и лист был годен только на той машине,
  // где он собран: с телефона \`localhost\` — это сам телефон, и карточки
  // открывались пустыми рамками. Кадры смотрят с телефона, значит и лист
  // обязан открываться с телефона. Витрина слушает 0.0.0.0, так что по имени
  // хоста она отвечает и снаружи.
  imgEl.src = \`http://\${location.hostname || 'localhost'}:3000/images/\${img.thumb}\`;
  imgEl.alt = img.title;
  imgEl.loading = 'lazy';
  imgEl.draggable = false;

  const frameEl = document.createElement('div');
  frameEl.className = 'viewport-frame';

  viewport.append(imgEl, frameEl);

  const posLabel = document.createElement('div');
  posLabel.className = 'pos-label';

  const btnRow = document.createElement('div');
  btnRow.className = 'btn-row';
  const recBtn = document.createElement('button');
  recBtn.className = 'record-btn';
  recBtn.textContent = 'record';
  const centerBtn = document.createElement('button');
  centerBtn.className = 'center-btn';
  centerBtn.textContent = '⊕';
  centerBtn.title = 'recenter';
  btnRow.append(recBtn, centerBtn);

  card.append(labelRow, viewport, posLabel, btnRow);

  // Pan state
  let panX = 0, panY = 0;
  let maxPanX = 0, maxPanY = 0;
  let coverScale = 1;
  let vw = 0, vh = 0;

  function updateViewport(ct) {
    vw = ct.vw; vh = ct.vh;
    viewport.style.width = vw + 'px';
    viewport.style.height = vh + 'px';

    // Cover scale: fit img.thumbW × img.thumbH into vw × vh, always cover
    const sw = vw / img.thumbW;
    const sh = vh / img.thumbH;
    coverScale = Math.max(sw, sh);

    const dw = Math.round(img.thumbW * coverScale);
    const dh = Math.round(img.thumbH * coverScale);
    imgEl.style.width = dw + 'px';
    imgEl.style.height = dh + 'px';

    maxPanX = Math.max(0, dw - vw);
    maxPanY = Math.max(0, dh - vh);

    movedEl.style.display = img.moved && img.moved[ct.key] ? '' : 'none';

    // Проём открывается там, где он стоит сейчас, — и на первой отрисовке, и на
    // переключении вкладки. У нетронутой работы это середина; у сдвинутой лист
    // иначе показывал бы не тот кадр, который выпущен.
    const at = img.now ? img.now[ct.key] : null;
    if (at && img.fullW && img.fullH) {
      const toPanX = at.left * coverScale * (img.thumbW / img.fullW);
      const toPanY = at.top * coverScale * (img.thumbH / img.fullH);
      panX = Math.max(0, Math.min(Math.round(toPanX), maxPanX));
      panY = Math.max(0, Math.min(Math.round(toPanY), maxPanY));
    } else {
      panX = Math.round(maxPanX / 2);
      panY = Math.round(maxPanY / 2);
    }
    applyPan();
  }

  function applyPan() {
    imgEl.style.left = -panX + 'px';
    imgEl.style.top = -panY + 'px';
    updateLabel();
  }

  function updateLabel() {
    const platePanX = img.fullW ? Math.round(panX / coverScale * (img.fullW / img.thumbW)) : null;
    const platePanY = img.fullH ? Math.round(panY / coverScale * (img.fullH / img.thumbH)) : null;
    const plateMaxX = img.fullW ? Math.round(maxPanX / coverScale * (img.fullW / img.thumbW)) : null;
    const plateMaxY = img.fullH ? Math.round(maxPanY / coverScale * (img.fullH / img.thumbH)) : null;

    const hasPan = panX !== 0 || panY !== 0;
    posLabel.classList.toggle('has-pan', hasPan);

    const parts = [];
    if (plateMaxX > 0) parts.push('left ' + platePanX + 'px / ' + plateMaxX + 'px');
    if (plateMaxY > 0) parts.push('top ' + platePanY + 'px / ' + plateMaxY + 'px');
    posLabel.textContent = parts.length ? parts.join('  ·  ') : 'no room to pan';
  }

  function posString() {
    const platePanX = img.fullW ? Math.round(panX / coverScale * (img.fullW / img.thumbW)) : null;
    const platePanY = img.fullH ? Math.round(panY / coverScale * (img.fullH / img.thumbH)) : null;
    const parts = [];
    if (maxPanX > 0 && platePanX !== null) parts.push('left ' + platePanX + 'px');
    if (maxPanY > 0 && platePanY !== null) parts.push('top ' + platePanY + 'px');
    return parts.join('  ') || 'centered';
  }

  // Drag
  let dragging = false;
  let dragStartX, dragStartY, panStartX, panStartY;
  let moved = false;

  viewport.addEventListener('mousedown', e => {
    dragging = true;
    moved = false;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    panStartX = panX;
    panStartY = panY;
    viewport.classList.add('dragging');
    e.preventDefault();
  });

  window.addEventListener('mousemove', e => {
    if (!dragging) return;
    const dx = dragStartX - e.clientX;
    const dy = dragStartY - e.clientY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved = true;
    panX = Math.max(0, Math.min(panStartX + dx, maxPanX));
    panY = Math.max(0, Math.min(panStartY + dy, maxPanY));
    applyPan();
  });

  window.addEventListener('mouseup', e => {
    if (!dragging) return;
    dragging = false;
    viewport.classList.remove('dragging');
    if (!moved) {
      // click without drag → record
      recordPos(img.ref, posString());
    }
  });

  recBtn.addEventListener('click', () => recordPos(img.ref, posString()));
  // ⊕ возвращает проём на выпущенное место, а не в середину: у нетронутой
  // работы это одно и то же, у сдвинутой — нет.
  centerBtn.addEventListener('click', () => updateViewport(activeCrop));

  // Init with active crop type
  updateViewport(activeCrop);

  cards.push({ el: card, updateViewport });
  return card;
}

const grid = document.getElementById('grid');
for (const img of IMAGES) grid.appendChild(makeCard(img));
</script>
</body>
</html>`;

fs.writeFileSync(OUT, html);
console.log(`Written ${images.length} images → ${OUT}`);
