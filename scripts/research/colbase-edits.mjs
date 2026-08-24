// colbase-edits.mjs — the same six treatment versions, for ColBase candidates.
// Mirrors gedits.mjs but reads from ColBase instead of museum-works.json.
//
// УСТАРЕЛ КАК ОБРАЗЕЦ, 24.08. Шесть версий здесь — не полный набор: 23.08
// виньетка стала обработкой генератора, и с тех пор на работу идёт
// двенадцать версий — каждая правка и её двойник с углами. Этот файл
// сохранён как есть, потому что по нему уже отбирали, но лист, склонированный
// с него, выйдет без виньеток и это заметят только на телефоне.
// Клонировать: `gedits.mjs`. Готовое зеркало для внешнего источника:
// `nihonga-edits.mjs`.
//
//   node colbase-edits.mjs
//   TARGET=1440 node colbase-edits.mjs    slide width (default 1080)
//   FORCE=1 node colbase-edits.mjs        redraw everything
//   OUT=/tmp/somewhere node colbase-edits.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { feedCss, feedJs, copyJs } from './feedui.mjs';

const require = createRequire(import.meta.url);
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = process.env.OUT || '/tmp/oils-preview';
const SHOTS = `${OUT}/colbase-edits`;
const CACHE = `${OUT}/colbase-edits.json`;
const PAGE = `${OUT}/colbase-edits.html`;
const sharp = require(`${R}/node_modules/sharp`);

const API = 'https://colbase.nich.go.jp/colbaseapi/v2';
const FH = { 'x-api-key': 'aaa', 'User-Agent': 'Mozilla/5.0' };
const TARGET = Number(process.env.TARGET) || 1080;
const PHONE = 9 / 19.5;
const SHORT_SIDE = 3840;
const PROBE_W = 180;
const WB = 0.5;
const WB_CAST = 200;

const URLS = [
  'https://colbase.nich.go.jp/collection_items/tnm/A-311',
  'https://colbase.nich.go.jp/collection_items/tnm/A-860',
  'https://colbase.nich.go.jp/collection_items/tnm/A-10094',
  'https://colbase.nich.go.jp/collection_items/tnm/A-10938',
  'https://colbase.nich.go.jp/collection_items/tnm/A-10528',
  'https://colbase.nich.go.jp/collection_items/tnm/A-11316',
  'https://colbase.nich.go.jp/collection_items/tnm/A-11322',
  'https://colbase.nich.go.jp/collection_items/tnm/A-10547',
  'https://colbase.nich.go.jp/collection_items/tnm/A-11249',
  'https://colbase.nich.go.jp/collection_items/tnm/A-368',
  'https://colbase.nich.go.jp/collection_items/tnm/A-10533',
  'https://colbase.nich.go.jp/collection_items/tnm/A-12201',
  'https://colbase.nich.go.jp/collection_items/tnm/A-155',
  'https://colbase.nich.go.jp/collection_items/tnm/A-1252',
  'https://colbase.nich.go.jp/collection_items/tnm/A-307',
  'https://colbase.nich.go.jp/collection_items/tnm/A-10548',
  'https://colbase.nich.go.jp/collection_items/tnm/A-11234',
  'https://colbase.nich.go.jp/collection_items/tnm/A-10545',
  'https://colbase.nich.go.jp/collection_items/kyohaku/A甲751',
  'https://colbase.nich.go.jp/collection_items/kyohaku/A甲217',
  'https://colbase.nich.go.jp/collection_items/kyohaku/A甲206',
  'https://colbase.nich.go.jp/collection_items/kyohaku/A甲174',
  'https://colbase.nich.go.jp/collection_items/kyohaku/A甲772',
  'https://colbase.nich.go.jp/collection_items/kyohaku/A甲591',
  'https://colbase.nich.go.jp/collection_items/kyohaku/A甲1322',
  'https://colbase.nich.go.jp/collection_items/kyohaku/A甲789',
  'https://colbase.nich.go.jp/collection_items/kyohaku/A甲44',
  'https://colbase.nich.go.jp/collection_items/kyohaku/A甲787',
];

function parseUrl(url) {
  const m = url.match(/\/collection_items\/([^/?]+)\/([^/?]+)/);
  if (!m) throw new Error(`cannot parse: ${url}`);
  return { org: m[1], key: decodeURIComponent(m[2]) };
}

async function fetchItem(org, key) {
  const url = `${API}/collection_items/${org}/${encodeURIComponent(key)}?locale=en`;
  const res = await fetch(url, { headers: FH });
  if (!res.ok) throw new Error(`API ${res.status} for ${org}/${key}`);
  return res.json();
}

function mainImageUrl(item) {
  const main = item.image_files?.find(f => f.main) ?? item.image_files?.[0];
  if (main?.url) return main.url;
  if (item.thumbnail_url) return item.thumbnail_url.replace('/image/thumbnail/', '/image/original/');
  throw new Error('no image url in response');
}

// ------------------------------------------------ treatment math (from gedits.mjs)
const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const shoulder = (v, knee, s) => (v <= knee ? v : knee + (v - knee) * s);
const clamp = v => (v < 0 ? 0 : v > 255 ? 255 : v);

const EDITS = [
  { id: 'orig', short: 'orig', wb: false, name: 'original' },
  { id: 'bal',  short: 'bal',  wb: true,  name: 'balance only · 50%' },
  { id: 'snap', short: 'snap', wb: true, poly: true,
    t: 0.55, dim: 0.8, name: 'snapshot 17.08 · 55% · ×0.8' },
  { id: 'app',  short: 'app',  wb: true, poly: true,
    t: 0.65, dim: 0.8, name: 'dim80-desat-whole' },
  { id: 'ceil', short: 'ceil', wb: true, poly: true,
    t: 0.55, dim: 0.8, capC: 18, capL: 65,
    name: 'ceilings 19.08 · colour 18 · bright 65' },
  { id: 'niobe', short: 'niobe', wb: true, poly: true,
    t: 0.55, dim: 0.8, capC: 18, capL: 65, knee: 60, hiAmt: 1.0, capS: 19,
    name: 'like Niobe · ceilings + shoulder' },
];

function measurePx(px, k, knee, s, b) {
  let sr = 0, sg = 0, sb = 0, sc = 0, n = 0;
  for (let i = 0; i < px.length; i += 3) {
    const L = lum(px[i], px[i+1], px[i+2]);
    const r  = clamp(shoulder(L + (px[i]   - L) * k, knee, s) * b);
    const g  = clamp(shoulder(L + (px[i+1] - L) * k, knee, s) * b);
    const bl = clamp(shoulder(L + (px[i+2] - L) * k, knee, s) * b);
    sr += r; sg += g; sb += bl;
    sc += Math.max(r, g, bl) - Math.min(r, g, bl);
    n++;
  }
  return { rgb: [sr/n, sg/n, sb/n], chroma: sc/n };
}

function quartiles(px) {
  const h = new Uint32Array(256);
  let n = 0;
  for (let i = 0; i < px.length; i += 3) {
    h[Math.min(255, Math.round(lum(px[i], px[i+1], px[i+2])))]++;
    n++;
  }
  const at = p => { let a = 0; for (let v = 0; v < 256; v++) { a += h[v]; if (a >= n * p) return v; } return 255; };
  return [at(0.25), at(0.75)];
}

function solveFor(e, px, share, q) {
  if (!e.t && !e.capC) return null;
  const kBase = 1 - (e.t ?? 0) * (e.poly ? polychromy(share) : 1);
  const knee = e.knee ?? 255, hiFlat = e.hiAmt ?? 1;
  let k = kBase, s = hiFlat, b = e.dim ?? 1;
  const [q25, q75] = q;
  const below = Math.min(q75, knee) - Math.min(q25, knee);
  const above = Math.max(q75 - knee, 0) - Math.max(q25 - knee, 0);
  for (let pass = 0; pass < 3; pass++) {
    if (e.capC) {
      const flat = measurePx(px, kBase, knee, s, 1).chroma * b;
      k = flat <= e.capC ? kBase : kBase * e.capC / Math.max(flat, 0.001);
    }
    if (e.capS != null) {
      s = (below + above * hiFlat) * b <= e.capS || above <= 0
        ? hiFlat
        : Math.max(0, Math.min(hiFlat, (e.capS / b - below) / above));
    }
    if (e.capL) {
      const L = lum(...measurePx(px, k, knee, s, 1).rgb);
      b = Math.min(e.dim ?? 1, e.capL / Math.max(L, 0.001));
    }
  }
  return { k, knee, s, b };
}

function paintPx(px, set) {
  const out = Buffer.allocUnsafe(px.length);
  const { k, knee, s, b } = set;
  for (let i = 0; i < px.length; i += 3) {
    const L = lum(px[i], px[i+1], px[i+2]);
    out[i]   = clamp(shoulder(L + (px[i]   - L) * k, knee, s) * b);
    out[i+1] = clamp(shoulder(L + (px[i+1] - L) * k, knee, s) * b);
    out[i+2] = clamp(shoulder(L + (px[i+2] - L) * k, knee, s) * b);
  }
  return out;
}

const { hueStats, polychromy } = await import(`${R}/scripts/research/desaturate.mjs`);
const { greyCast, gainsAt } = await import(`${R}/scripts/research/grey-balance.mjs`);

async function frameOf(imgBuf) {
  const sized = sharp(imgBuf, { limitInputPixels: false })
    .resize(SHORT_SIDE, SHORT_SIDE, { fit: 'outside', withoutEnlargement: true });
  const { data, info } = await sized.removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const raw = { width: info.width, height: info.height, channels: 3 };

  const wbBuf = await sharp(data, { raw }).resize(WB_CAST, WB_CAST, { fit: 'inside' }).raw().toBuffer();
  const cast = greyCast(wbBuf);
  const gain = cast ? gainsAt(cast.gain, WB) : [1, 1, 1];

  // Centered phone window
  const w = info.width / info.height > PHONE
    ? Math.round(info.height * PHONE)
    : info.width;
  const h = info.width / info.height > PHONE
    ? info.height
    : Math.round(info.width / PHONE);
  const extract = {
    left: Math.round((info.width  - w) / 2),
    top:  Math.round((info.height - h) / 2),
    width: w, height: h,
  };

  const balancedFull = await sharp(data, { raw }).linear(gain, [0, 0, 0]).raw().toBuffer();
  const { data: bigCrop, info: ci } = await sharp(balancedFull, { raw })
    .extract(extract).raw().toBuffer({ resolveWithObject: true });
  const cropRaw = { width: ci.width, height: ci.height, channels: 3 };
  const probe = await sharp(bigCrop, { raw: cropRaw }).resize(PROBE_W, null).raw().toBuffer();

  const outW = Math.min(TARGET, ci.width);
  const outH = Math.round(outW / PHONE);
  const toShow = async buf =>
    (await sharp(buf, { raw: cropRaw }).resize(outW, outH, { fit: 'fill' })
      .raw().toBuffer({ resolveWithObject: true }));
  const balanced = await toShow(bigCrop);
  const plainCrop = await sharp(data, { raw }).extract(extract).raw().toBuffer();
  const plain = await toShow(plainCrop);
  return { plain, balanced, probe, gain, size: `${ci.width}×${ci.height}`, outW, outH };
}

// ------------------------------------------------------------ fetch and process
await fs.mkdir(SHOTS, { recursive: true });

const readJson = async (file, fallback) =>
  (existsSync(file) ? JSON.parse(await fs.readFile(file, 'utf8')) : fallback);
const previous = await readJson(CACHE, { works: [] }).then(j => j.works ?? []);
const done = process.env.FORCE ? new Map() : new Map(previous.map(r => [r.ref, r]));

const rows = [];
let failed = 0;

for (const url of URLS) {
  const { org, key } = parseUrl(url);
  const ref = `${org}-${key.replace(/[^a-z0-9]/gi, '-')}`;

  if (done.has(ref) && EDITS.every(e => existsSync(`${SHOTS}/${ref}-${e.id}.jpg`))) {
    rows.push(done.get(ref));
    process.stderr.write(`  ${ref} (cached)\n`);
    continue;
  }

  process.stderr.write(`  ${ref}… `);
  try {
    const item = await fetchItem(org, key);
    const imgUrl = mainImageUrl(item);
    const res = await fetch(imgUrl, { headers: FH });
    if (!res.ok) throw new Error(`image ${res.status}`);
    const imgBuf = Buffer.from(await res.arrayBuffer());

    const c = await frameOf(imgBuf);
    const share = hueStats(c.probe).share;
    const q = quartiles(c.probe);
    const versions = [];

    for (const e of EDITS) {
      const base = e.wb ? c.balanced.data : c.plain.data;
      const set = solveFor(e, c.probe, share, q);
      const px = set ? paintPx(base, set) : base;
      await sharp(px, { raw: { width: c.outW, height: c.outH, channels: 3 } })
        .jpeg({ quality: 86, chromaSubsampling: '4:4:4', mozjpeg: true })
        .toFile(`${SHOTS}/${ref}-${e.id}.jpg`);
      versions.push({
        id: e.id, name: e.name, short: e.short,
        colour: set ? Number(set.k.toFixed(2)) : 1,
        bright:  set ? Number(set.b.toFixed(2)) : 1,
        squash:  set && set.knee < 255 ? Number(set.s.toFixed(2)) : null,
        gain: e.wb ? c.gain.map(g => Number(g.toFixed(3))) : null,
      });
    }

    const title = item.title || key;
    const artist = item.sakusha || '';
    const date = item.jidai_seiki || '';
    rows.push({ ref, org, key, title, artist, date, size: c.size, versions });
    process.stderr.write(`done (${c.size})\n`);
  } catch (err) {
    failed++;
    process.stderr.write(`FAILED: ${err.message}\n`);
  }
}

await fs.writeFile(CACHE, JSON.stringify({ target: TARGET, edits: EDITS, works: rows }, null, 1));
console.log(`${rows.length} works · ${failed} failed`);

// -------------------------------------------------------------------- HTML
const esc = s => String(s ?? '').replace(/[&<>"]/g, ch =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

const colbaseUrl = (org, key) =>
  `https://colbase.nich.go.jp/collection_items/${org}/${encodeURIComponent(key)}?locale=en`;

const slides = rows.flatMap((w, wi) => w.versions.map((v, vi) =>
  `<section class="s${vi === 0 ? ' first' : ''}" data-key="${esc(w.ref)}#${v.id}">
  <img data-crop="colbase-edits/${w.ref}-${v.id}.jpg" alt="" decoding="async">
  <div class="tag"><b>${vi+1}/${w.versions.length}</b> ${esc(v.name)} <i>${
    v.colour < 0.995 || v.bright < 0.995
      ? `colour ×${v.colour} · bright ×${v.bright}${v.squash !== null ? ` · squash ×${v.squash}` : ''}`
      : v.gain && Math.min(...v.gain) < 0.995 ? `cast pulled ${v.gain.join(' / ')}`
      : vi ? 'unchanged' : ''}</i>${
    v.squash !== null && v.squash < 0.05 ? '<u>highlights flattened — Niobe’s spread is out of reach here</u>' : ''}</div>
  <div class="cap"><b>${esc(String(w.title).slice(0, 60)) || '(untitled)'}</b>
    <span>${esc(w.artist)}${w.date ? ' · ' + esc(w.date) : ''} · ${esc(w.size)} · work ${wi+1} of ${rows.length}
    · <a href="${colbaseUrl(w.org, w.key)}" target="_blank" style="color:#aaa">colbase ↗</a></span></div>
  <button class="tick" aria-label="this edit works"></button>
</section>`)).join('');

const KEY = 'pick-edit-colbase';

const html = `<meta charset="utf-8"><title>which edit — ColBase candidates</title>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,maximum-scale=1">
<meta name="theme-color" content="#000">
<style>
 :root { color-scheme: dark; --accent:#9ecbff }
 * { -webkit-tap-highlight-color:transparent }
 html, body { margin:0; background:#000; color:#eee; font:13px/1.4 system-ui,sans-serif;
              overscroll-behavior-y:none }
${feedCss}
 .s.first::before { content:''; position:absolute; left:0; top:0; bottom:0; width:3px;
                    background:var(--accent); opacity:.85 }
 .tag { position:absolute; left:0; right:0; top:0; padding:calc(8px + env(safe-area-inset-top)) 14px 10px;
        background:linear-gradient(#000d,#000a 55%,transparent); font-size:12px; color:#ddd;
        pointer-events:none }
 .tag b { color:#fff; font-variant-numeric:tabular-nums; margin-right:6px }
 .tag i { color:#8b8b8b; font-style:normal; font-variant-numeric:tabular-nums }
 .tag u { display:block; margin-top:3px; color:#e0a05a; text-decoration:none }
 .cap { position:absolute; left:0; right:0; bottom:0; padding:14px 76px 14px 16px;
        padding-bottom:calc(14px + env(safe-area-inset-bottom));
        background:linear-gradient(transparent,#000c 38%,#000e);
        opacity:0; transition:opacity .18s; pointer-events:none }
 .s.open .cap, body.labels .cap { opacity:1 }
 .cap b { display:block; font-weight:600; font-size:14px }
 .cap span { display:block; color:#aaa; font-variant-numeric:tabular-nums; margin-top:2px }
 .tick { position:absolute; right:14px; bottom:calc(16px + env(safe-area-inset-bottom));
         width:58px; height:58px; border-radius:50%; border:2px solid #fff9;
         background:#000a; box-shadow:0 2px 12px #0009; cursor:pointer; padding:0 }
 .tick::after { content:''; position:absolute; inset:0; display:block;
                background:no-repeat center/26px url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23fff' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 12l6 6L20 6'/%3E%3C/svg%3E");
                opacity:.55 }
 .s.on .tick { background:var(--accent); border-color:#fff }
 .s.on .tick::after { opacity:1; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='3.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 12l6 6L20 6'/%3E%3C/svg%3E") }
 header { position:fixed; bottom:calc(18px + env(safe-area-inset-bottom)); left:14px; z-index:5;
          display:flex; gap:8px; align-items:center; pointer-events:none }
 header * { pointer-events:auto }
 header button, #n { background:#000a; color:#eee;
                 border:1px solid #fff3; border-radius:14px; padding:7px 12px; font:12px system-ui;
                 font-variant-numeric:tabular-nums }
 dialog { border:0; border-radius:14px; padding:16px; background:#151515; color:#ddd;
          width:min(92vw,460px); max-height:80dvh }
 dialog::backdrop { background:#000c }
 dialog h3 { margin:0 0 10px; font-size:14px }
 #ids { width:100%; box-sizing:border-box; height:190px; background:#000; color:var(--accent);
        border:1px solid #333; border-radius:8px; padding:8px;
        font:12px/1.35 ui-monospace,monospace; white-space:pre }
 .row { display:flex; gap:8px; margin-top:10px; flex-wrap:wrap }
 .row button { flex:1 1 auto; background:#222; color:#ddd; border:1px solid #444;
               border-radius:8px; padding:9px; font:13px system-ui }
 .note { color:#888; font-size:11px; margin-top:8px; line-height:1.4 }
</style>

<header><span id="n">1</span><button id="menu">list</button></header>

<main id="feed">${slides}</main>

<dialog id="panel">
  <h3><span id="k2">0</span> edits ticked over ${rows.length} works</h3>
  <textarea id="ids" spellcheck="false" autocapitalize="off" autocorrect="off"
    placeholder="tnm-A-311#ceil lines land here"></textarea>
  <div class="row">
    <button id="copy">copy</button>
    <button id="labels">titles: off</button>
    <button id="jump">jump to first unseen</button>
    <button id="close">close</button>
  </div>
  <p class="note">${rows.length} ColBase works × ${EDITS.length} versions, ${TARGET} px wide.
    Window is centred — no crop rule for these yet.<br>
    <span id="diag"></span></p>
</dialog>

<script>
const KEY = ${JSON.stringify(KEY)};
const el = id => document.getElementById(id);
const slides = [...document.querySelectorAll('.s')];
let chosen = new Set();
try { chosen = new Set(JSON.parse(localStorage.getItem(KEY) || 'null') || []); } catch {}

const ids = el('ids');
function save() {
  localStorage.setItem(KEY, JSON.stringify([...chosen]));
  ids.value = [...chosen].join('\\n');
  el('k2').textContent = chosen.size;
}
function paint() {
  slides.forEach(s => s.classList.toggle('on', chosen.has(s.dataset.key)));
  save();
}
document.addEventListener('click', e => {
  const t = e.target.closest('.tick');
  if (t) {
    const s = t.closest('.s'), key = s.dataset.key;
    if (chosen.has(key)) chosen.delete(key); else chosen.add(key);
    s.classList.toggle('on', chosen.has(key));
    save();
    return;
  }
  const s = e.target.closest('.s');
  if (s && e.target.closest('main') && !flicking()) s.classList.toggle('open');
});

${feedJs({ seenKey: `${KEY}-seen`, label: "el('n').textContent = (i + 1) + '/' + slides.length;" })}

el('menu').addEventListener('click', () => { diag(); el('panel').showModal(); });
el('close').addEventListener('click', () => el('panel').close());
${copyJs}
el('labels').addEventListener('click', () => {
  const on = document.body.classList.toggle('labels');
  el('labels').textContent = 'titles: ' + (on ? 'on' : 'off');
});
el('jump').addEventListener('click', () => {
  el('panel').close();
  goTo(Math.min(seen, slides.length - 1));
});
ids.addEventListener('input', () => {
  chosen = new Set(ids.value.split(/[\\s,]+/).filter(Boolean));
  localStorage.setItem(KEY, JSON.stringify([...chosen]));
  paint();
});
paint();
el('n').textContent = '1/' + slides.length;
</script>`;

await fs.writeFile(PAGE, html);
console.log(PAGE);
