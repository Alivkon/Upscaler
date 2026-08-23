import sharp from 'sharp';
import { monochrome } from './monochrome-filter.mjs';
import { writeFileSync } from 'fs';

const B = 'https://colbase.nich.go.jp/colbaseapi/v2';
const H = { 'x-api-key': 'aaa', 'User-Agent': 'Mozilla/5.0' };
const OUT = 'research/colbase-funnel.html';

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

const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

async function measure(url) {
  const res = await fetch(url, {headers: H});
  const raw = Buffer.from(await res.arrayBuffer());
  const { data, info } = await sharp(raw)
    .resize(200, null, { fit: 'inside' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const warms = [];
  for (let i = 0; i < data.length; i += 3) {
    const l = luma(data[i], data[i+1], data[i+2]);
    warms.push((data[i] - data[i+2]) / Math.max(l, 1));
  }
  warms.sort((a, b) => a - b);
  const warm = warms[warms.length >> 1];
  // re-encode thumbnail as jpeg for embedding
  const thumb = await sharp(raw).resize(540, null, { fit: 'inside' }).jpeg({ quality: 75 }).toBuffer();
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

  process.stdout.write(`  measuring… `);
  let done = 0;
  const measured = await pool(items, async (it) => {
    try {
      const m = await measure(it.thumbnail_url);
      done++; if (done % 20 === 0) process.stdout.write(`${done}… `);
      return { it, ...m, mono: monochrome(it.hinshitu_keijo) };
    } catch(e) { return null; }
  });
  console.log('done');

  const valid = measured.filter(Boolean);
  const survivors = valid.filter(m => m.warm >= WARM_MIN && m.warm <= WARM_MAX && !m.mono);
  const warmFail = valid.filter(m => m.warm < WARM_MIN || m.warm > WARM_MAX).length;
  const monoFail = valid.filter(m => m.mono).length;

  console.log(`  ${valid.length} → ${survivors.length} survivors (warm cut ${warmFail}, mono cut ${monoFail})`);
  allSections.push({ label: cat.label, survivors, total: valid.length, warmFail, monoFail });
}

let globalIdx = 0;
function renderSection({ label, survivors, total, warmFail, monoFail }) {
  const cards = survivors.map(m => {
    const id = `cb-${globalIdx++}`;
    const era = m.it.jidai_seiki || '—';
    const href = itemUrl(m.it);
    return `<div style="display:flex;flex-direction:column;gap:4px">
  <label style="cursor:pointer"><input type="checkbox" class="pick" data-url="${href}"> ${era}</label>
  <a href="${href}" target="_blank"><img src="${m.dataUri}" style="max-width:540px;max-height:540px;display:block"></a>
  <div style="font-size:0.8em;color:#666">w ${m.warm.toFixed(2)}</div>
</div>`;
  }).join('\n');

  return `<h2>${label}</h2>
<p>${survivors.length}/${total} passed &nbsp;·&nbsp; warm cut ${warmFail} &nbsp;·&nbsp; mono cut ${monoFail}</p>
<div style="display:flex;flex-wrap:wrap;gap:16px">
${cards}
</div>`;
}

const sections = allSections.map(renderSection).join('\n<hr>\n');

const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>ColBase funnel</title>
<style>
  body { font-family: sans-serif; padding: 16px; }
  #picked-box { width: 100%; height: 80px; font-family: monospace; font-size: 12px; }
  #picked-bar { position: sticky; top: 0; background: #fff; border-bottom: 1px solid #ccc; padding: 8px 0; z-index: 10; }
</style>
</head>
<body>
<div id="picked-bar">
  <b>Picked (<span id="count">0</span>):</b><br>
  <textarea id="picked-box" readonly placeholder="check images below to collect URLs here"></textarea>
</div>
<h1>ColBase — warm / mono filter</h1>
<p>warm ∈ [−1.1, 0.47], not monochrome. Busy filter removed.</p>
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
