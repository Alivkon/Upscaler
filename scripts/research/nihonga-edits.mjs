// nihonga-edits.mjs — обработки для отобранного с Викисклада.
//
// Зеркало gedits.mjs, а НЕ colbase-edits.mjs: у второго шесть версий на работу
// и виньетки нет вовсе — он старше 23.08, когда виньетка стала обработкой
// генератора. Двенадцать версий: шесть правок и у каждой двойник с углами.
//
//   node nihonga-edits.mjs
//   TARGET=1440 node nihonga-edits.mjs    ширина слайда (по умолчанию 1080)
//   FORCE=1 node nihonga-edits.mjs        перерисовать всё
//   OUT=/куда-нибудь node nihonga-edits.mjs
//
// Список — то, что Чарли отметил на research/nihonga-browse.html 24.08 из 781
// работы. Отмечено четырнадцать, здесь десять.
//
// Порог считается по кадру, а не по файлу: окно 9:19.5 из широкой работы
// берётся во всю высоту, значит у горизонтали решает высота, у вертикали —
// ширина. Отсюда «6680 × 3568 проходит, а 5114 × 2357 нет».
//
// Восемь берут плиту 1440 × 3120 своими пикселями. Две — «Yuujin-yochiari»
// (1,04×) и «Уходящая весна» Кавая Гёкудо (1,32×) — не берут, и добавлены
// Чарли поимённо. Отказ идёт не по «меньше плиты», а по MAX_UP: 1,7× — порог
// видимости апскейла, измеренный в research/2026-08-22-japanese-museums.md.
// Ниже него глаз разницы не находит, выше — находит. Растянутые плиты помечены
// в подписи слайда, чтобы это не терялось из виду.
import fs from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { feedCss, feedJs, copyJs } from './feedui.mjs';

const require = createRequire(import.meta.url);
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = process.env.OUT || `${process.env.HOME}/tessarum-harvest/nihonga`;
// Имя папки живёт в одной переменной нарочно: путь в разметке слайда и путь,
// по которому пишутся картинки, разъехались один раз (в разметке остался
// colbase-edits от зеркала) — страница открылась, все шестьдесят картинок
// отдали 404, и выглядело это как чёрный экран без единой ошибки на виду.
const SHOTS_DIR = 'nihonga-edits';
const SHOTS = `${OUT}/${SHOTS_DIR}`;
const CACHE = `${OUT}/nihonga-edits.json`;
const PAGE = `${OUT}/edits.html`;
const sharp = require(`${R}/node_modules/sharp`);

const API = 'https://commons.wikimedia.org/w/api.php';
const FH = { 'User-Agent': 'tessarum-research/1.0 (samuel.faure.dev@gmail.com)' };
const TARGET = Number(process.env.TARGET) || 1080;
const PHONE = 9 / 19.5;
const SHORT_SIDE = 3840;
// Порог видимости апскейла. Выше него работу не берём даже поимённо.
const MAX_UP = 1.7;
const PROBE_W = 180;
const WB = 0.5;
const WB_CAST = 200;

const URLS = [
  'https://commons.wikimedia.org/wiki/File:Yokoyama_Taikan_-_Towing_a_Boat_-_Google_Art_Project.jpg',
  'https://commons.wikimedia.org/wiki/File:8_Famous_Sights_of_Xiao_%26_Xiang_Rivers_by_Yokoyama_Taikan_(TNM)_-_River_Sky_in_Evening_Snow.jpg',
  'https://commons.wikimedia.org/wiki/File:8_Famous_Sights_of_Xiao_%26_Xiang_Rivers_by_Yokoyama_Taikan_(TNM)_-_Mountain_Village_after_Storm.jpg',
  'https://commons.wikimedia.org/wiki/File:Yoroboshi_by_Shimomura_Kanzan_(Tokyo_National_Museum).jpg',
  'https://commons.wikimedia.org/wiki/File:Kanzano_shimomura,_appezzamento_di_zucche_(paravent1),_1910_ca._08.jpg',
  'https://commons.wikimedia.org/wiki/File:De_kou_trotserend,_zetten_onze_troepen_bivak_op_te_Yingkou._Eiko_no_genkan_o_okashite_waga_gun_roei_o_haru_no_zu_(titel_op_object),_RP-P-1989-177.jpg',
  'https://commons.wikimedia.org/wiki/File:1881_fire_in_Japanese_art_-_De_vuurzee_gezien_vanuit_de_wijk_Hisamatsu_Hisamatsucho_yori_miru_shukka_(titel_op_object),_RP-P-1988-281_(cropped).jpg',
  'https://commons.wikimedia.org/wiki/File:Japanese_soldiers_in_1895_art_-_De_kou_trotserend,_zetten_onze_troepen_bivak_op_te_Yingkou._Eiko_no_genkan_o_okashite_waga_gun_roei_o_haru_no_zu_(titel_op_object),_RP-P-1989-177_(cropped).jpg',
  // Ниже плиты, взяты поимённо: 1,04× и 1,32×.
  'https://commons.wikimedia.org/wiki/File:Yuujin-yochiari_02.jpg',
  'https://commons.wikimedia.org/wiki/File:Parting_Spring_by_Kawai_Gyokudo_(National_Museum_of_Modern_Art,_Tokyo)_R.jpg',
];

function parseUrl(url) {
  const m = url.match(/\/wiki\/(File:.+)$/);
  if (!m) throw new Error(`cannot parse: ${url}`);
  return { title: decodeURIComponent(m[1]).replace(/_/g, ' ') };
}

// Викисклад нормализует заголовки (подчёркивания в пробелы) и отвечает картой
// по нормализованному имени, а не по тому, что послали. Спрашиваем по одному —
// работ восемь, экономить нечего, зато не надо сопоставлять ответ с запросом.
async function fetchItem(title) {
  const q = new URLSearchParams({
    format: 'json', action: 'query', titles: title,
    prop: 'imageinfo', iiprop: 'size|url|extmetadata',
    iiextmetadatafilter: 'LicenseShortName|Artist|ObjectName|DateTimeOriginal',
  });
  const res = await fetch(`${API}?${q}`, { headers: FH });
  if (!res.ok) throw new Error(`API ${res.status} for ${title}`);
  const page = Object.values((await res.json()).query.pages)[0];
  const ii = page.imageinfo?.[0];
  if (!ii) throw new Error(`no imageinfo for ${title}`);
  return { ii, meta: ii.extmetadata ?? {} };
}

const plain = v => String(v ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

function mainImageUrl(item) {
  return item.ii.url;
}

// Порог телефонной плиты, считается по кадру 9:19.5, а не по файлу.
function phoneCrop(w, h) {
  return w / h > PHONE
    ? { w: Math.round(h * PHONE), h }
    : { w, h: Math.round(w / PHONE) };
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

// Виньетка идёт ВТОРЫМ ВАРИАНТОМ К КАЖДОЙ ПРАВКЕ, а не седьмой обработкой.
// Она ничего не решает о цвете и свете — она гасит углы того, что уже решено,
// — и вопрос про неё звучит «эта версия с углами или без», а не «эта или та».
// Поэтому пара стоит подряд: правка и она же с виньеткой.
//
// Пара есть и у оригинала. Довод против был — виньетка на нетронутой картинке
// читается как дефект печати; 23.08 Charlie: «can even vignet the originals
// not only edited versions». Разбор в research/2026-08-23-upscaling-the-backlog.md.
//
// Глубина взята из `public/treat-local.js` — ОДНО ЧИСЛО НА ОБА КОНЦА. Лист,
// показывающий не ту виньетку, которую наложит приложение, ничего не решает;
// если число там поменяется, оно должно поменяться и здесь. Сверено 24.08.
const VIGNETTE_DEPTH = 0.12;
const VERSIONS = EDITS.flatMap(e => [
  e,
  { ...e, id: `${e.id}-vig`, short: `${e.short}+vig`, name: `${e.name} · vignette`, vig: true },
]);

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

// Виньетка: умножение на радиальный градиент. Перенос `vignetted()` из
// public/treat-local.js на сырые пиксели — там холст сжимается по вертикали
// и по нему рисуется круг, здесь то же самое считается прямо: вписанный
// в кадр ЭЛЛИПС, а не круг. На телефонной пропорции круг гасил бы верх и низ
// и не трогал бока, и читалось бы это как затухание, а не как виньетка.
//
// Затемнение растёт вчетверо круче к краю (`ease` в квадрате): у линейного
// видно, где градиент начался, — по кадру идёт кольцо.
function vignette(px, w, h) {
  const out = Buffer.from(px);
  const cx = w / 2, cy = h / 2;
  const radius = w * Math.SQRT1_2;
  const squash = w / h;
  for (let y = 0; y < h; y++) {
    const dy = (y + 0.5 - cy) * squash;
    for (let x = 0; x < w; x++) {
      const dx = x + 0.5 - cx;
      const t = Math.min(1, Math.hypot(dx, dy) / radius);
      const ease = t * t * (3 - 2 * t);
      const f = 1 - VIGNETTE_DEPTH * ease * ease;
      const i = (y * w + x) * 3;
      out[i] = clamp(px[i] * f);
      out[i + 1] = clamp(px[i + 1] * f);
      out[i + 2] = clamp(px[i + 2] * f);
    }
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

  // Не Math.min с шириной кадра: две работы ниже плиты берутся поимённо,
  // и им нужна именно растяжка до TARGET, а не слайд поменьше остальных.
  const outW = TARGET;
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

// Номер впереди не для красоты: два вида «8 Famous Sights» расходятся только
// в хвосте имени файла, и без него срез в 60 знаков даёт им один и тот же ref —
// второй молча затирает картинки первого.
for (const [i, url] of URLS.entries()) {
  const { title } = parseUrl(url);
  const slug = title.replace(/^File:/, '').replace(/\.[a-z]+$/i, '')
    .replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 56);
  const ref = `${String(i + 1).padStart(2, '0')}-${slug}`;

  if (done.has(ref) && VERSIONS.every(e => existsSync(`${SHOTS}/${ref}-${e.id}.jpg`))) {
    rows.push(done.get(ref));
    process.stderr.write(`  ${ref} (cached)\n`);
    continue;
  }

  process.stderr.write(`  ${ref}… `);
  try {
    const item = await fetchItem(title);
    const crop = phoneCrop(item.ii.width, item.ii.height);
    const up = Math.max(1, 1440 / crop.w, 3120 / crop.h);
    if (up > MAX_UP) {
      throw new Error(`needs ${up.toFixed(2)}× — over the ${MAX_UP}× visibility threshold `
        + `(${item.ii.width}×${item.ii.height} → crop ${crop.w}×${crop.h})`);
    }

    const imgUrl = mainImageUrl(item);
    const res = await fetch(imgUrl, { headers: FH });
    if (!res.ok) throw new Error(`image ${res.status}`);
    const imgBuf = Buffer.from(await res.arrayBuffer());

    const c = await frameOf(imgBuf);
    const share = hueStats(c.probe).share;
    const q = quartiles(c.probe);
    const versions = [];

    for (const e of VERSIONS) {
      const base = e.wb ? c.balanced.data : c.plain.data;
      const set = solveFor(e, c.probe, share, q);
      const painted = set ? paintPx(base, set) : base;
      // Виньетка ПОСЛЕДНЕЙ и по копии: без набора `painted` — это сам базовый
      // буфер, и правка на месте испортила бы соседние версии.
      const px = e.vig ? vignette(painted, c.outW, c.outH) : painted;
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

    rows.push({
      ref, title, page: url,
      name: plain(item.meta.ObjectName?.value) || title.replace(/^File:/, ''),
      artist: plain(item.meta.Artist?.value),
      date: plain(item.meta.DateTimeOriginal?.value),
      licence: plain(item.meta.LicenseShortName?.value),
      full: `${item.ii.width}×${item.ii.height}`,
      size: c.size,
      up: Number(up.toFixed(2)),
      versions,
    });
    process.stderr.write(`done (${c.size})\n`);
  } catch (err) {
    failed++;
    process.stderr.write(`FAILED: ${err.message}\n`);
  }
}

await fs.writeFile(CACHE, JSON.stringify({ target: TARGET, edits: VERSIONS, works: rows }, null, 1));
console.log(`${rows.length} works · ${failed} failed`);

// -------------------------------------------------------------------- HTML
const esc = s => String(s ?? '').replace(/[&<>"]/g, ch =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));


const slides = rows.flatMap((w, wi) => w.versions.map((v, vi) =>
  `<section class="s${vi === 0 ? ' first' : ''}" data-key="${esc(w.ref)}#${v.id}">
  <img data-crop="${SHOTS_DIR}/${w.ref}-${v.id}.jpg" alt="" decoding="async">
  <div class="tag"><b>${vi+1}/${w.versions.length}</b> ${esc(v.name)} <i>${
    v.colour < 0.995 || v.bright < 0.995
      ? `colour ×${v.colour} · bright ×${v.bright}${v.squash !== null ? ` · squash ×${v.squash}` : ''}`
      : v.gain && Math.min(...v.gain) < 0.995 ? `cast pulled ${v.gain.join(' / ')}`
      : vi ? 'unchanged' : ''}</i>${
    v.squash !== null && v.squash < 0.05 ? '<u>highlights flattened — Niobe’s spread is out of reach here</u>' : ''}</div>
  <div class="cap"><b>${esc(String(w.name).slice(0, 60)) || '(untitled)'}</b>
    <span>${esc(w.artist).slice(0, 48)}${w.date ? ' · ' + esc(w.date) : ''} · ${esc(w.full)} · ${esc(w.licence)}
    · ${w.up > 1.005 ? `<b style="color:#e0a05a">×${w.up} stretched</b>` : 'native'}
    · work ${wi+1} of ${rows.length}
    · <a href="${esc(w.page)}" target="_blank" style="color:#aaa">commons ↗</a></span></div>
  <button class="tick" aria-label="this edit works"></button>
</section>`)).join('');

const KEY = 'pick-edit-nihonga';

const html = `<meta charset="utf-8"><title>which edit — nihonga from Commons</title>
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
    placeholder="Yokoyama-Taikan-Towing-a-Boat#ceil lines land here"></textarea>
  <div class="row">
    <button id="copy">copy</button>
    <button id="labels">titles: off</button>
    <button id="jump">jump to first unseen</button>
    <button id="close">close</button>
  </div>
  <p class="note">${rows.length} works picked off nihonga-browse.html × ${VERSIONS.length} versions
    (six edits, each with a vignette twin — the twin follows its edit),
    ${TARGET} px wide. ${rows.filter(w => w.up > 1.005).length} of them are stretched to reach
    1440 × 3120 — the caption says by how much; the rest are native.
    Nothing is stretched past ${MAX_UP}×, the measured visibility threshold.
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

// Разметка ссылается на файлы относительно страницы. Проверяем, что первая
// ссылка ведёт в существующий файл, — иначе лист открывается чёрным.
const firstRef = html.match(/data-crop="([^"]+)"/)?.[1];
if (firstRef && !existsSync(`${OUT}/${firstRef}`)) {
  throw new Error(`page points at ${firstRef}, which is not under ${OUT}`);
}

console.log(PAGE);
