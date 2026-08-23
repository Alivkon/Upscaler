// gedits.mjs — the same painting under all six settings, one per screen.
//
// "update /edits.html with those that are currently on the gallery but i didn't
//  look at on mobile. hide those i looked at and didn't tick"
//
// The first sheet (`edits.mjs`, /tmp only) was built out of the selection pool:
// 79 candidates, most of them never published. This one is built out of what is
// actually on the site — `wallpaper-gen/museum-works.json` — because the
// question had changed. It was no longer "which of these candidates is worth
// keeping" but "the gallery is up, which treatment does each painting want".
//
// THE SOURCE IS THE MASTER, NOT THE PLATE. A plate in `images/plates` has
// already been treated; running a treatment over it would show a version nobody
// can ship. `wallpaper-gen/sources/<ref>.jpg` is the untouched scan, which is
// also what the generator reads, so what is judged here is what would be built.
//
// AND IT MEASURES THE WAY THE GENERATOR MEASURES. Short side to 3840, grey
// balance over the whole work, the phone window placed by the work's own `crop`
// rule, the ceilings solved on a 180 px probe of that window. Those are the same
// steps as `wallpaper-gen/museum.mjs`, deliberately: the point of the sheet is
// that a tick can be published unchanged.
//
// ЛИСТ БЕРЁТ И ПРОСТУЮ ПАПКУ, А НЕ ТОЛЬКО ВИТРИНУ, И ЭТО НЕ УДОБСТВО. Вопрос
// «какая обработка идёт этой картине» возникает раньше публикации: работу
// апскейлят, и до того, как она попадёт в `museum-works.json` и в каталог, о ней
// уже надо что-то решить. Без папочного входа это решение принималось бы либо
// на глаз в один заход, либо ценой заведения работы в витрину ради пробы — то
// есть публикация шла бы впереди суждения.
//
// В папочном режиме нет ни правила кадра, ни метаданных, ни очереди «живые
// вперёд»: их неоткуда взять. Проём встаёт по центру — то же умолчание, что и
// в `treatment.js` для присланных картинок: «середина — единственное место,
// о котором можно что-то утверждать, не посмотрев». Всё остальное — те же шесть
// версий, те же пресеты, те же потолки, тот же лист.
//
//   node gedits.mjs                    витрина: museum-works.json + sources/
//   FOLDER=/путь/к/картинкам node gedits.mjs   любые файлы, ничего заводить не надо
//   TARGET=1440 node gedits.mjs        ширина слайда (умолчание 1080)
//   LIMIT=20 node gedits.mjs           попробовать на двадцати работах
//   ONLY=vl-0135,… node gedits.mjs     только эти работы (витрина)
//   FORCE=1 node gedits.mjs            перерисовать всё, не брать с прошлого прогона
//   OUT=/tmp/куда node gedits.mjs      куда положить лист и кадры
import fs from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { feedCss, feedJs, copyJs } from './feedui.mjs';

const require = createRequire(import.meta.url);
// Корень репозитория берётся от самого файла, а не строкой: скрипт лежит внутри
// репозитория, и путь к нему репозиторий знает лучше, чем автор.
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const G = process.env.WALLPAPER_GEN || '/home/charlie/repos/wallpaper-gen';
const OUT = process.env.OUT || '/tmp/oils-preview';
const FOLDER = process.env.FOLDER || '';
// Папочный лист пишется РЯДОМ с витринным, а не поверх него: у них разные
// работы, разные ключи галочек и разный срок жизни, и прогон по трём новым
// картинкам не должен стирать лист на двести двадцать семь.
const MODE = FOLDER ? 'new' : 'gedits';
const SHOTS = `${OUT}/${MODE}`;
const CACHE = `${OUT}/${MODE}.json`;
const PAGE = `${OUT}/${FOLDER ? 'new.html' : 'edits.html'}`;
const sharp = require(`${R}/node_modules/sharp`);

// ЗНАЧЕНИЯ ПРИХОДЯТ ИЗ РЕПОЗИТОРИЯ, А НЕ ОТСЮДА. Каждая настройка, которую
// просили сохранить, лежит в research/presets.json; скрипт только умеет их
// применять. Скрипт со своими числами — это шестая копия, которая однажды
// разойдётся с остальными пятью.
const P = JSON.parse(await fs.readFile(`${R}/research/presets.json`, 'utf8'));
const preset = id => P.presets.find(p => p.id === id) ?? (() => { throw new Error(`no preset "${id}"`); })();

const PHONE = 9 / 19.5;
const SHORT_SIDE = 3840;   // the generator's cap, so the probe reads the same pixels
const TARGET = Number(process.env.TARGET) || 1080;
const PROBE = 180;
const WB = preset('balance').values.strength;
const WB_CAST = preset('balance').values.cast_read_at_px;
const LIMIT = Number(process.env.LIMIT) || Infinity;
const ONLY = new Set((process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean));

const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const shoulder = (v, knee, s) => (v <= knee ? v : knee + (v - knee) * s);
const clamp = v => (v < 0 ? 0 : v > 255 ? 255 : v);

const snap = preset('snapshot').values, app = preset('app').values;
const ceil = preset('ceilings').values, niobe = preset('niobe').values;
const EDITS = [
  { id: 'orig', short: 'orig', wb: false, name: 'original' },
  { id: 'bal', short: 'bal', wb: true, name: `balance only · ${WB * 100}%` },
  { id: 'snap', short: 'snap', wb: true, poly: true,
    t: snap.desaturate.strength, dim: snap.dim.amount,
    name: `snapshot 17.08 · ${snap.desaturate.strength * 100}% · ×${snap.dim.amount}` },
  { id: 'app', short: 'app', wb: true, poly: true,
    t: app.desaturate.strength, dim: app.dim.amount,
    name: 'the app · dim80-desat-whole' },
  { id: 'ceil', short: 'ceil', wb: true, poly: true,
    t: ceil.on_top_of.desaturate_strength, dim: ceil.on_top_of.dim,
    capC: ceil.colour_max, capL: ceil.brightness_max,
    name: `ceilings 19.08 · colour ${ceil.colour_max} · bright ${ceil.brightness_max}` },
  { id: 'niobe', short: 'niobe', wb: true, poly: true,
    t: niobe.desaturate_strength, dim: niobe.dim,
    capC: niobe.colour_max, capL: niobe.brightness_max,
    knee: niobe.knee, hiAmt: niobe.squash_flat, capS: niobe.spread_max,
    name: 'like Niobe · ceilings + shoulder' },
];

// Виньетка идёт ВТОРЫМ ВАРИАНТОМ К ПРИГЛУШЁННЫМ, а не седьмой обработкой.
// Она ничего не решает о цвете и свете — она гасит углы того, что уже решено,
// — и вопрос про неё звучит «эта версия с углами или без», а не «эта или та».
// Поэтому пара стоит подряд: приглушение и оно же с виньеткой.
//
// ПАРА ЕСТЬ У КАЖДОЙ ВЕРСИИ, ВКЛЮЧАЯ ОРИГИНАЛ. Сначала пары давались только
// приглушённым — довод был, что виньетка на нетронутой картинке читается как
// дефект печати: углы темнее середины, а больше не изменилось ничего. Довод
// остался, но 23.08 Charlie сказал «can even vignet the originals not only
// edited versions», и довод, который не показали глазу, — это догадка, а не
// вывод. Дороже он стоит ровно два слайда на работу.
//
// Глубина взята из `public/treat-local.js` — ОДНО ЧИСЛО НА ОБА КОНЦА. Лист,
// показывающий не ту виньетку, которую наложит приложение, ничего не решает;
// если число там поменяется, оно должно поменяться и здесь.
const VIGNETTE_DEPTH = 0.12;
const VERSIONS = EDITS.flatMap(e => [
  e,
  { ...e, id: `${e.id}-vig`, short: `${e.short}+vig`, name: `${e.name} · vignette`, vig: true }
]);

// ------------------------------------------------------- who goes on the sheet
const IMAGE = /\.(jpe?g|png|webp|tiff?)$/i;

// Папка: работой считается файл. Ref — имя без расширения, приведённое к тому,
// что можно положить в имя кадра и в ключ галочки; столкновения разводятся
// номером, потому что две разные картины под одним ключом — это одна галочка
// на двоих.
async function fromFolder(dir) {
  const files = (await fs.readdir(dir)).filter(f => IMAGE.test(f)).sort();
  if (!files.length) throw new Error(`в ${dir} нет картинок (${IMAGE})`);
  const taken = new Set();
  return files.map(f => {
    const stem = f.replace(IMAGE, '');
    let ref = stem.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'work';
    if (taken.has(ref)) { let n = 2; while (taken.has(`${ref}-${n}`)) n++; ref = `${ref}-${n}`; }
    taken.add(ref);
    return { ref, name: stem, file: path.join(dir, f) };
  });
}

// WHAT COUNTS AS "ALREADY LOOKED AT" IS DECIDED BY THE CONCLUSIVE KEYS ONLY —
// source page and accession number. A title match is not a join: "Pastoral
// Landscape" is four different Claudes. The asymmetry is on purpose. Showing a
// painting twice costs one swipe; hiding one that was never judged costs it
// silently and forever, so anything unproven goes on the sheet.
const dec = u => { try { return decodeURIComponent(String(u || '')); } catch { return String(u || ''); } };
const page = u => dec(u).toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/[_+]/g, ' ')
  .replace(/[^a-z0-9]+/g, ' ').trim();
const acc = s => (String(s || '').match(/\b\d{4}\.\d+[a-z]?\b/) || [])[0] || null;

const readJson = async (file, fallback) =>
  (existsSync(file) ? JSON.parse(await fs.readFile(file, 'utf8')) : fallback);

async function fromGallery() {
  const works = JSON.parse(await fs.readFile(`${G}/museum-works.json`, 'utf8'));
  const gallery = new Map(works.map(w => [w.ref, w]));
  const cat = new Map();
  for (const f of (await fs.readdir(`${R}/catalogue`)).filter(f => /^vl-\d+\.json$/.test(f))) {
    const c = JSON.parse(await fs.readFile(`${R}/catalogue/${f}`, 'utf8'));
    if (gallery.has(c.ref)) cat.set(c.ref, c);
  }

  const byPage = new Map(), byAcc = new Map();
  for (const c of cat.values()) {
    const p = page(c.provenance?.page);
    if (p) byPage.set(p, c.ref);
    const a = acc(c.provenance?.credit) || acc(c.provenance?.page);
    if (a) byAcc.set(a, c.ref);
  }

  // Пул живёт во временном каталоге и однажды исчезнет вместе с /tmp. Тогда
  // «уже смотрел» становится пустым — и лист показывает всё. Это та же
  // асимметрия, что выше: лишний свайп дешевле молча спрятанной работы.
  const old = await readJson(`${OUT}/edits.json`, { works: [] });
  const poolManifest = await readJson(`${OUT}/manifest.json`, {});
  const reviewed = new Set();
  for (const r of old.works) {
    const src = poolManifest[r.ref];
    const hit = byPage.get(page(src?.page)) ?? byAcc.get(acc(r.ref) ?? acc(src?.page));
    if (hit) reviewed.add(hit);
  }

  // The ticks carried over. They are keyed by pool ref in `pick-edit-v1` and this
  // sheet is keyed by catalogue ref, so the page seeds a key of its own from here
  // rather than asking Charlie to tick twenty-one paintings again.
  const chosen = JSON.parse(await fs.readFile(`${R}/research/chosen-edits-v2.json`, 'utf8'));
  const ticked = new Map(chosen.works.filter(w => gallery.has(w.ref)).map(w => [w.ref, w.ticked]));
  // Засев — все галочки по умолчанию, иначе узкий лист на чистом телефоне
  // записал бы свои восемь в localStorage и стёр остальное.
  // Исключение: режим ONLY на отдельном порту — у него свой origin, стирать
  // некого, поэтому засев фильтруется до тех работ, что реально на листе.
  const seed = ONLY.size
    ? chosen.works.filter(w => ONLY.has(w.ref)).flatMap(w => w.ticked.map(e => `${w.ref}#${e}`))
    : chosen.works.flatMap(w => w.ticked.map(e => `${w.ref}#${e}`));

  // ЧТО СТОИТ НА САЙТЕ, А ЧТО ПРОСТО СОБРАНО. Из 330 записей каталога 215 несут
  // `hidden: true` — плита у них есть, страницы нет. `museum-works.json` про это
  // не знает, поэтому «витрина» по нему — 267 работ, а живых 115. Лист показывает
  // и те, и другие, но живые идут первыми и подписаны: обработка нужна и тем, что
  // ждут публикации, а вот очередь у них разная.
  const isLive = ref => cat.get(ref) && cat.get(ref).hidden !== true;

  // ИСТОЧНИК: мастер, а если его нет — урезанная копия музея. У тридцати
  // кливлендских работ полный мастер это TIFF на 0.5–1.1 ГБ, двадцать три
  // гигабайта на все; `_print.jpg` с потолком 3400 весит шесть мегабайт и для
  // суждения глазом на 1080 px этого достаточно. Лежит ОТДЕЛЬНО от `sources/`:
  // положить урезанную копию туда значило бы, что генератор однажды выпустит
  // работу с неё, ничего об этом не сказав.
  const sourceOf = w => {
    const master = `${G}/sources/${w.ref}.jpg`;
    if (existsSync(master)) return { file: master, capped: false };
    const print = `${OUT}/prints/${w.ref}.jpg`;
    if (existsSync(print)) return { file: print, capped: true };
    return null;
  };

  for (const ref of ONLY) if (!gallery.has(ref)) throw new Error(`ONLY ${ref}: такой работы нет в museum-works.json`);

  const missing = [];
  const shown = [];
  for (const w of works) {
    if (ONLY.size && !ONLY.has(w.ref)) continue;
    if (!ONLY.size && reviewed.has(w.ref) && !ticked.has(w.ref)) continue; // смотрел и не отметил
    const src = sourceOf(w);
    if (!src) { missing.push(w.ref); continue; }
    shown.push({ ...w, src, live: isLive(w.ref) });
  }
  // Живые вперёд, а внутри каждой половины — те, у кого ответа ещё нет. Отмеченные
  // последние: у них ответ есть, и смысл этого прохода в тех, у кого его нет.
  const rank = w => (w.live ? 0 : 2) + (ticked.has(w.ref) ? 1 : 0);
  shown.sort((a, b) => rank(a) - rank(b));

  console.log(`в museum-works ${works.length} · на сайте ${works.filter(w => isLive(w.ref)).length}` +
    ` · смотрел и не отметил ${works.filter(w => reviewed.has(w.ref) && !ticked.has(w.ref)).length}` +
    ` · без источника ${missing.length}`);
  if (missing.length) console.log(`  без источника: ${missing.join(' ')}`);
  return { shown, cat, ticked, seed };
}

const { shown, cat, ticked, seed: SEED } = FOLDER
  ? {
      shown: (await fromFolder(FOLDER))
        .filter(w => !ONLY.size || ONLY.has(w.ref))
        // `live` здесь значит «на листе нет второй половины»: очереди из живых
        // и ждущих публикации у папки не бывает, и красить её нечем.
        .map(w => ({ ref: w.ref, name: w.name, crop: undefined, treatment: null,
                     src: { file: w.file, capped: false }, live: true })),
      cat: new Map(), ticked: new Map(), seed: []
    }
  : await fromGallery();

const queue = shown.slice(0, LIMIT === Infinity ? undefined : LIMIT);
const live = queue.filter(w => w.live).length;
if (FOLDER) console.log(`в ${FOLDER} — ${shown.length} картинок`);
console.log(`на листе ${queue.length}${FOLDER ? '' : ` (${live} живых, ${queue.length - live} ждут публикации)`}` +
  ` × ${VERSIONS.length} = ${queue.length * VERSIONS.length} слайдов` +
  `${FOLDER ? '' : ` · с урезанной копии ${queue.filter(w => w.src.capped).length}`}`);

await fs.mkdir(SHOTS, { recursive: true });

// --------------------------------------------------- measure, solve, apply
function measure(px, k, knee, s, b) {
  let sr = 0, sg = 0, sb = 0, sc = 0, n = 0;
  for (let i = 0; i < px.length; i += 3) {
    const L = lum(px[i], px[i + 1], px[i + 2]);
    const r = clamp(shoulder(L + (px[i] - L) * k, knee, s) * b);
    const g = clamp(shoulder(L + (px[i + 1] - L) * k, knee, s) * b);
    const bl = clamp(shoulder(L + (px[i + 2] - L) * k, knee, s) * b);
    sr += r; sg += g; sb += bl;
    sc += Math.max(r, g, bl) - Math.min(r, g, bl);
    n++;
  }
  return { rgb: [sr / n, sg / n, sb / n], chroma: sc / n };
}

function quartiles(px) {
  const h = new Uint32Array(256);
  let n = 0;
  for (let i = 0; i < px.length; i += 3) { h[Math.min(255, Math.round(lum(px[i], px[i + 1], px[i + 2])))]++; n++; }
  const at = p => { let a = 0; for (let v = 0; v < 256; v++) { a += h[v]; if (a >= n * p) return v; } return 255; };
  return [at(0.25), at(0.75)];
}

// ПОТОЛКИ РЕШАЮТСЯ, А НЕ СТАВЯТСЯ. «Ни одна работа не цветнее 18» — это не
// положение ползунка, а свой множитель для каждой работы; та, что и так под 18,
// не трогается вовсе. Три прохода, потому что снятый цвет меняет яркость, по
// которой читается второй потолок, и наоборот.
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
      const flat = measure(px, kBase, knee, s, 1).chroma * b;
      k = flat <= e.capC ? kBase : kBase * e.capC / Math.max(flat, 0.001);
    }
    if (e.capS != null) {
      s = (below + above * hiFlat) * b <= e.capS || above <= 0
        ? hiFlat
        : Math.max(0, Math.min(hiFlat, (e.capS / b - below) / above));
    }
    if (e.capL) {
      const L = lum(...measure(px, k, knee, s, 1).rgb);
      b = Math.min(e.dim ?? 1, e.capL / Math.max(L, 0.001));
    }
  }
  return { k, knee, s, b };
}

function paint(px, set) {
  const out = Buffer.allocUnsafe(px.length);
  const { k, knee, s, b } = set;
  for (let i = 0; i < px.length; i += 3) {
    const L = lum(px[i], px[i + 1], px[i + 2]);
    out[i] = clamp(shoulder(L + (px[i] - L) * k, knee, s) * b);
    out[i + 1] = clamp(shoulder(L + (px[i + 1] - L) * k, knee, s) * b);
    out[i + 2] = clamp(shoulder(L + (px[i + 2] - L) * k, knee, s) * b);
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
  // Радиус в сжатом пространстве — половина диагонали квадрата со стороной w,
  // то есть градиент доходит ровно до углов кадра.
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
// Геометрия кадра — генераторская, потому что судят здесь именно тот кадр,
// который генератор построит. Без `wallpaper-gen` под рукой остаётся середина:
// витринному режиму она всё равно не поможет (там и работ взять неоткуда), а
// папочный только её и знает.
const { RATIOS, placement, windowSize } = existsSync(`${G}/treatment.mjs`)
  ? await import(`${G}/treatment.mjs`)
  : {
      RATIOS: { phone: PHONE },
      placement: () => ({ position: 'centre' }),
      windowSize: (ratio, width, height) => (width / height > ratio
        ? { width: Math.round(height * ratio), height }
        : { width, height: Math.round(width / ratio) })
    };

// The phone window out of the master, taken exactly as the generator takes it.
async function frameOf(work) {
  const sized = sharp(await fs.readFile(work.src.file), { limitInputPixels: false })
    .resize(SHORT_SIDE, SHORT_SIDE, { fit: 'outside', withoutEnlargement: true });
  const { data, info } = await sized.removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const raw = { width: info.width, height: info.height, channels: 3 };

  const thumb = await sharp(data, { raw }).resize(WB_CAST, WB_CAST, { fit: 'inside' }).raw().toBuffer();
  const cast = greyCast(thumb);
  const gain = cast ? gainsAt(cast.gain, WB) : [1, 1, 1];

  const box = windowSize(RATIOS.phone, raw.width, raw.height);
  const spot = placement(work.crop, RATIOS.phone, raw.width, raw.height);
  const cut = src => spot.window
    ? sharp(src, { raw }).extract(spot.window)
    : sharp(src, { raw }).resize(box.width, box.height, { fit: 'cover', position: spot.position });

  const balancedFull = await sharp(data, { raw }).linear(gain, [0, 0, 0]).raw().toBuffer();
  // Solved on the full-size window, shown at 1080: the same two numbers the
  // generator will solve, not numbers from a preview.
  const { data: bigCrop, info: ci } = await cut(balancedFull).raw().toBuffer({ resolveWithObject: true });
  const cropRaw = { width: ci.width, height: ci.height, channels: 3 };
  const probe = await sharp(bigCrop, { raw: cropRaw }).resize(PROBE, null).raw().toBuffer();

  const outW = Math.min(TARGET, ci.width);
  const outH = Math.round(outW / PHONE);
  const show = async buf => (await sharp(buf, { raw: cropRaw }).resize(outW, outH, { fit: 'fill' })
    .raw().toBuffer({ resolveWithObject: true }));
  const balanced = await show(bigCrop);
  const plainBig = await cut(data).raw().toBuffer();
  const plain = await show(plainBig);
  return { plain, balanced, probe, gain, size: `${ci.width}×${ci.height}`, outW, outH };
}

// ------------------------------------------------------------------ render
// РИСУЕТСЯ ТОЛЬКО ТО, ЧЕГО ЕЩЁ НЕТ. Двести двадцать семь работ это час, и
// пересчитывать их ради тридцати новых или ради другого порядка на странице
// значит платить час за перестановку строк. `FORCE=1` перерисовывает всё.
//
// В ПАПОЧНОМ РЕЖИМЕ КЭША НЕТ. Ref там — имя файла, и одно и то же имя завтра
// может оказаться другой картинкой: взятый с прошлого прогона кадр показал бы
// не ту работу и не те числа. Папка на пробу — это единицы файлов, минуты
// работы; кэш здесь экономит минуту и стоит доверия к листу.
const previous = await readJson(CACHE, { works: [] }).then(j => j.works ?? []);
const done = process.env.FORCE || FOLDER ? new Map() : new Map(previous.map(r => [r.ref, r]));
const rows = [];
let failed = 0;
let reused = 0;

for (const w of queue) {
  const already = done.get(w.ref);
  // …КРОМЕ ТОГО, ЧТО РИСОВАЛОСЬ С ДРУГОГО ИСТОЧНИКА. Прошлый прогон брал у
  // кливлендских работ урезанную копию 3400; там, где с тех пор лёг полный
  // мастер, старый кадр показывает не ту картинку и не те числа.
  if (already && already.capped && !w.src.capped) done.delete(w.ref);
  if (done.has(w.ref) && existsSync(`${SHOTS}/${w.ref}-${VERSIONS.at(-1).id}.jpg`)) {
    rows.push({ ...already, now: w.treatment, live: w.live, capped: w.src.capped, was: ticked.get(w.ref) ?? null });
    reused++;
    continue;
  }
  try {
    const c = await frameOf(w);
    const share = hueStats(c.probe).share;
    const q = quartiles(c.probe);
    const versions = [];
    for (const e of VERSIONS) {
      const base = e.wb ? c.balanced.data : c.plain.data;
      const set = solveFor(e, c.probe, share, q);
      const painted = set ? paint(base, set) : base;
      // Виньетка ПОСЛЕДНЕЙ и по копии: `paint` без набора возвращает сам
      // базовый буфер, и правка на месте испортила бы соседние версии.
      const px = e.vig ? vignette(painted, c.outW, c.outH) : painted;
      await sharp(px, { raw: { width: c.outW, height: c.outH, channels: 3 } })
        .jpeg({ quality: 86, chromaSubsampling: '4:4:4', mozjpeg: true })
        .toFile(`${SHOTS}/${w.ref}-${e.id}.jpg`);
      versions.push({
        id: e.id, name: e.name, short: e.short,
        colour: set ? Number(set.k.toFixed(2)) : 1,
        bright: set ? Number(set.b.toFixed(2)) : 1,
        squash: set && set.knee < 255 ? Number(set.s.toFixed(2)) : null,
        gain: e.wb ? c.gain.map(g => Number(g.toFixed(3))) : null,
      });
    }
    const meta = cat.get(w.ref);
    rows.push({
      ref: w.ref, name: w.name, now: w.treatment, size: c.size,
      live: w.live, capped: w.src.capped,
      artist: meta?.provenance?.creator ?? '', title: meta?.provenance?.work ?? w.name,
      date: meta?.provenance?.date ?? '', was: ticked.get(w.ref) ?? null, versions
    });
  } catch (err) {
    failed++;
    console.log(`  не вышло ${w.ref}: ${err.message}`);
  }
  process.stderr.write(`\r  ${rows.length}/${queue.length}`);
}
process.stderr.write(`\r  ${rows.length} работ${reused ? ` · ${reused} взято с прошлого прогона` : ''}\n`);
console.log(`${rows.length * VERSIONS.length} картинок · ${failed} не вышло`);
if (!rows.length) throw new Error('нечего показывать');

const moves = v => v.colour < 0.995 || v.bright < 0.995 || (v.gain && Math.min(...v.gain) < 0.995);
for (const e of VERSIONS.slice(1)) {
  const v = rows.map(r => r.versions.find(x => x.id === e.id));
  console.log(`  ${e.short.padEnd(6)} трогает ${String(v.filter(moves).length).padStart(3)} из ${rows.length}` +
    ` · цвет ×${(v.reduce((a, x) => a + x.colour, 0) / v.length).toFixed(2)}` +
    ` · свет ×${(v.reduce((a, x) => a + x.bright, 0) / v.length).toFixed(2)}`);
}

// Узкий прогон ВЛИВАЕТСЯ в кэш, а не заменяет его: страница — восемь работ,
// но нарисованные двести пятьдесят никуда не делись, и стереть их запись
// значило бы заплатить час за следующий полный лист.
const kept = ONLY.size ? previous.filter(r => !rows.some(x => x.ref === r.ref)) : [];
await fs.writeFile(CACHE, JSON.stringify({ target: TARGET, edits: VERSIONS, works: [...kept, ...rows] }, null, 1));

// --------------------------------------------------------------------- page
const esc = s => String(s ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

const slides = rows.flatMap((w, wi) => w.versions.map((v, vi) => `<section class="s${vi === 0 ? ' first' : ''}${w.live ? '' : ' off'}" data-key="${esc(w.ref)}#${v.id}">
  <img data-crop="${MODE}/${w.ref}-${v.id}.jpg" alt="" decoding="async">
  <div class="tag"><b>${vi + 1}/${w.versions.length}</b> ${esc(v.name)}${
    v.id === w.now ? ' <em>← стоит сейчас</em>' : ''} <i>${
    v.colour < 0.995 || v.bright < 0.995
      ? `colour ×${v.colour} · bright ×${v.bright}${v.squash !== null ? ` · squash ×${v.squash}` : ''}`
      : v.gain && Math.min(...v.gain) < 0.995 ? `cast pulled ${v.gain.join(' / ')}`
      : vi ? 'unchanged' : ''}</i>${
    v.squash !== null && v.squash < 0.05 ? '<u>highlights flattened — Niobe’s spread is out of reach here</u>' : ''}</div>
  <div class="cap"><b>${esc(String(w.title).slice(0, 60)) || '(untitled)'}</b>
    <span>${esc(w.artist)}${w.date ? ' · ' + esc(w.date) : ''} · ${esc(w.size)} · work ${wi + 1} of ${rows.length}${
      w.live ? '' : ' · not published yet'}${w.capped ? ' · 3400 copy' : ''}${
      w.was ? ` · ticked ${esc(w.was.join(', '))} before` : ''}</span></div>
  <button class="tick" aria-label="this edit works"></button>
</section>`)).join('');

const onPage = SEED.filter(k => rows.some(w => w.ref === k.split('#')[0]));
// Ключ галочек СВОЙ У КАЖДОГО ЛИСТА. `pick-edit-v1` держит ссылки пула
// (wm-…, cle-…), витринный лист говорит ссылками каталога, а папочный — именами
// файлов; смешать их значит сделать нечитаемыми все три.
const KEY = FOLDER ? 'pick-edit-new' : 'pick-edit-v2';

const html = `<meta charset="utf-8"><title>which edit — ${FOLDER ? 'new pictures' : 'the gallery'}</title>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,maximum-scale=1">
<meta name="theme-color" content="#000">
<style>
 :root { color-scheme: dark; --accent:#9ecbff }
 * { -webkit-tap-highlight-color:transparent }
 html, body { margin:0; background:#000; color:#eee; font:13px/1.4 system-ui,sans-serif;
              overscroll-behavior-y:none }
${feedCss}
 /* Hairline down the left edge of each work's first slide, so a thumb can see
    where one painting ends. Amber instead of blue once the live works run out:
    everything past that point is built but has no page yet. */
 .s.first::before { content:''; position:absolute; left:0; top:0; bottom:0; width:3px;
                    background:var(--accent); opacity:.85 }
 .s.first.off::before { background:#e0a05a }
 .tag { position:absolute; left:0; right:0; top:0; padding:calc(8px + env(safe-area-inset-top)) 14px 10px;
        background:linear-gradient(#000d,#000a 55%,transparent); font-size:12px; color:#ddd;
        pointer-events:none }
 .tag b { color:#fff; font-variant-numeric:tabular-nums; margin-right:6px }
 .tag i { color:#8b8b8b; font-style:normal; font-variant-numeric:tabular-nums }
 .tag em { color:var(--accent); font-style:normal }
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
    placeholder="${FOLDER ? 'sunset-over-the-lake' : 'vl-0230'}#ceil lines land here — paste a list back in to restore it"></textarea>
  <div class="row">
    <button id="copy">copy</button>
    <button id="labels">titles: off</button>
    <button id="jump">jump to first unseen</button>
    <button id="close">close</button>
  </div>
  <p class="note">${rows.length} works × ${EDITS.length} versions, ${TARGET} px wide, keyed by ${
    FOLDER ? 'file name' : 'catalogue ref'}.
    ${FOLDER
      ? 'None of these is in the collection yet — the window is centred, because no crop rule exists for them.'
      : rows.some(w => w.live)
        ? `The first ${rows.filter(w => w.live).length} are live on the site (blue edge); the rest are built but have no page yet (amber edge).`
        : 'None of these has a page yet (amber edge) — they are built and waiting.'}
    ${SEED.length ? `Your ${SEED.length} earlier ticks are kept; ${onPage.length} of them land on this page.` : ''}
    Tick every version that works — several is fine, none is an answer too.<br>
    <span id="diag"></span></p>
</dialog>

<script>
const KEY = ${JSON.stringify(KEY)};
const SEED = ${JSON.stringify(SEED)};
const el = id => document.getElementById(id);
const slides = [...document.querySelectorAll('.s')];
let chosen = new Set();
try { chosen = new Set(JSON.parse(localStorage.getItem(KEY) || 'null') || SEED); } catch { chosen = new Set(SEED); }

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
console.log(`\n${PAGE}`);
