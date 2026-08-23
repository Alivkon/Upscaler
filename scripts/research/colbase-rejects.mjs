import sharp from 'sharp';
import { monochrome } from './monochrome-filter.mjs';
import { treatCeil } from './ceilings.mjs';
import { writeFileSync } from 'fs';

const B = 'https://colbase.nich.go.jp/colbaseapi/v2';
const H = { 'x-api-key': 'aaa', 'User-Agent': 'Mozilla/5.0' };
const OUT = 'research/colbase-rejects.html';

const WARM_MIN = -1.1, WARM_MAX = 0.47;

const CATS = [
  { id: 300, label: 'Japan — Modern paintings' },
  { id: 304, label: 'China — Landscapes' },
  { id: 306, label: 'China — Flowers and plants' },
];

async function fetchAll(catId) {
  const first = await (await fetch(`${B}/collection_items?locale=en&page=1&category_ids=${catId}`, {headers:H})).json();
  const pages = Math.ceil(first.resultset.count / first.resultset.limit);
  const items = [...first.results];
  for (let p = 2; p <= pages; p++) {
    const d = await (await fetch(`${B}/collection_items?locale=en&page=${p}&category_ids=${catId}`, {headers:H})).json();
    items.push(...d.results);
  }
  return items.filter(x => x.thumbnail_url);
}

const lumaOf = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

async function transform(url) {
  const res = await fetch(url, {headers: H});
  const raw = Buffer.from(await res.arrayBuffer());

  const { data, info } = await sharp(raw)
    .resize(540, null, { fit: 'inside' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // measure warm on original download
  const warms = [];
  for (let i = 0; i < data.length; i += 3) {
    const l = lumaOf(data[i], data[i+1], data[i+2]);
    warms.push((data[i] - data[i+2]) / Math.max(l, 1));
  }
  warms.sort((a, b) => a - b);
  const warm = warms[warms.length >> 1];

  // apply ceil treatment
  const { pixels } = treatCeil(data, info.width, info.height);

  // convert to grayscale
  const grey = new Uint8Array(pixels.length);
  for (let i = 0; i < pixels.length; i += 3) {
    const l = Math.round(lumaOf(pixels[i], pixels[i+1], pixels[i+2]));
    grey[i] = grey[i+1] = grey[i+2] = l;
  }

  const thumb = await sharp(grey, { raw: { width: info.width, height: info.height, channels: 3 } })
    .jpeg({ quality: 75 })
    .toBuffer();

  return { warm, dataUri: `data:image/jpeg;base64,${thumb.toString('base64')}` };
}

async function pool(items, fn, limit = 8) {
  const results = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) { const idx = i++; results[idx] = await fn(items[idx]); }
  }
  await Promise.all(Array.from({length: limit}, worker));
  return results;
}

function itemUrl(it) {
  return `https://colbase.nich.go.jp/collection_items/${it.organization_path_name}/${it.organization_item_key}?locale=en`;
}

const allSections = [];

for (const cat of CATS) {
  process.stdout.write(`fetching ${cat.label}… `);
  const items = await fetchAll(cat.id);
  console.log(`${items.length} with thumbnail`);

  // pre-screen: only rejected by warm or mono
  const rejects = items.filter(it => {
    const mono = monochrome(it.hinshitu_keijo);
    // warm we can't pre-screen without pixel data, so include all
    // mono we can pre-screen
    return mono; // we'll also add warm-rejects after measuring
  });
  // warm rejects need pixel measurement — process all and filter
  process.stdout.write(`  processing all for warm… `);
  let done = 0;
  const allMeasured = await pool(items, async (it) => {
    try {
      const m = await transform(it.thumbnail_url);
      done++; if (done % 20 === 0) process.stdout.write(`${done}… `);
      const mono = monochrome(it.hinshitu_keijo);
      const warmFail = m.warm < WARM_MIN || m.warm > WARM_MAX;
      if (!warmFail && !mono) return null; // it passed — skip
      return { it, ...m, mono, warmFail };
    } catch(e) { return null; }
  });
  console.log('done');

  const rejectItems = allMeasured.filter(Boolean);
  console.log(`  ${rejectItems.length} rejects (warm or mono)`);
  allSections.push({ label: cat.label, rejects: rejectItems });
}

let globalIdx = 0;
function renderSection({ label, rejects }) {
  const cards = rejects.map(m => {
    const id = `cb-${globalIdx++}`;
    const era = m.it.jidai_seiki || '—';
    const href = itemUrl(m.it);
    const why = [m.warmFail ? `warm ${m.warm.toFixed(2)}` : '', m.mono ? 'mono' : ''].filter(Boolean).join(', ');
    return `<div style="display:flex;flex-direction:column;gap:4px">
  <label style="cursor:pointer"><input type="checkbox" class="pick" data-url="${href}"> ${era}</label>
  <a href="${href}" target="_blank"><img src="${m.dataUri}" style="max-width:540px;max-height:540px;display:block"></a>
  <div style="font-size:0.8em;color:#888">${why}</div>
</div>`;
  }).join('\n');

  return `<h2>${label} (${rejects.length} rejects)</h2>
<div style="display:flex;flex-wrap:wrap;gap:16px">
${cards}
</div>`;
}

const sections = allSections.map(renderSection).join('\n<hr>\n');

const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>ColBase rejects</title>
<style>
  body { font-family: sans-serif; padding: 16px; background: #111; color: #ddd; }
  #picked-box { width: 100%; height: 80px; font-family: monospace; font-size: 12px; background: #222; color: #eee; }
  #picked-bar { position: sticky; top: 0; background: #111; border-bottom: 1px solid #333; padding: 8px 0; z-index: 10; }
  a { color: #aaa; }
  hr { border-color: #333; }
</style>
</head>
<body>
<div id="picked-bar">
  <b>Picked (<span id="count">0</span>):</b><br>
  <textarea id="picked-box" readonly placeholder="check images below to collect URLs here"></textarea>
</div>
<h1>ColBase — warm/mono rejects, dimmed + B&W</h1>
${sections}
<script>
const box = document.getElementById('picked-box');
const count = document.getElementById('count');
document.addEventListener('change', e => {
  if (!e.target.classList.contains('pick')) return;
  const checked = [...document.querySelectorAll('.pick:checked')].map(cb => cb.dataset.url);
  box.value = checked.join('\\n');
  count.textContent = checked.length;
});
</script>
</body>
</html>`;

writeFileSync(OUT, html);
console.log(`\nwrote ${OUT}`);
