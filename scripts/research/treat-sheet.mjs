// Лист на три плитки: скан · dim · ceil.
//
// Правило новой работе не выбирают — без поля `treatment` она выходит `dim`,
// умолчанием витрины (12.09.2026, `research/2026-09-12-one-dim-rule.md`). Лист
// нужен для другого случая: работа уже вышла, и результат не нравится. Тогда
// у поля есть ровно три значения, и три колонки листа — это они: оставить скан
// (`none`), умолчание (`dim`), оно же плюс потолок яркости (`ceil`). Лист на
// двенадцать версий, который тут был раньше (удалён 12.09.2026), спрашивал
// про правила, которых больше нет.
//
// РИСУЕТСЯ ИЗ МАСТЕРА И МЕРЯЕТСЯ КАК ГЕНЕРАТОР. Плита в `images/plates` уже
// обработана, и правило поверх неё показало бы версию, которую нельзя выпустить.
// Мастер — тот же файл, который читает генератор; кадр ставится правилом работы,
// увод читается на 200 px по целой работе, потолки решаются на пробе 180 px
// ТЕЛЕФОННОГО кадра, а красится `tall`-окно — это шаги `wallpaper-gen/museum.mjs`
// и порядок у них неслучайный. Смысл листа в том, что выбранное на нём выйдет
// ровно таким.
//
// ПОЭТОМУ ЖЕ СНИМАЕТСЯ `trim` — багет, который у 39 из 117 живых работ обведён
// вокруг картины. Генератор режет его первым, до баланса и потолков, и все
// правила кадра (`crop.left`, `crop.top`) заданы в пикселях УЖЕ обрезанного
// листа. Лист, который этого не делает, ошибается трижды: показывает поле
// с музейным штампом, ставит окно не в те координаты и решает правило по
// пикселям багета. Числа `trim` — в масштабе генератора (короткая сторона
// 3840), здесь их надо привести к рабочему размеру.
//
// Лист по всем живым работам — это ~117 строк по три плитки, около 9 МБ
// в одном файле: base64 распухает на треть, и открывать его лучше с диска,
// а не слать почтой.
//
//   node scripts/research/treat-sheet.mjs --only vl-0291,vl-0084,vl-0366
//   node scripts/research/treat-sheet.mjs                    # все живые работы
//   node scripts/research/treat-sheet.mjs --out /tmp/s.html  # куда положить лист
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { reduce, solve, paint, DIM, CEIL, BALANCE, CAST_AT, PROBE } from './ceilings.mjs';
import { applied } from './dimming.mjs';
import { greyCast, gainsAt } from './grey-balance.mjs';
import { RATIOS, windowSize, placement, frameCrop } from '../../../wallpaper-gen/treatment.mjs';

// Корень репозитория берётся от самого файла, а не строкой: скрипт лежит внутри
// репозитория, и путь к нему репозиторий знает лучше, чем автор. `G` — тот же
// соседний репозиторий, что и в импорте выше, только как каталог на диске:
// оттуда читаются мастера и `museum-works.json`.
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const G = path.resolve(R, '../wallpaper-gen');

const WIDTH = 400; // ширина плитки; лист смотрят с экрана, не печатают
const HEIGHT = Math.round(WIDTH / RATIOS.tall);
const GEN_SHORT = 3840; // потолок короткой стороны у генератора: правила кадра заданы в этих пикселях
const WORK_SHORT = 1600; // хватает на плитку в 400 px, а декодировать впятеро дешевле

const args = process.argv.slice(2);
const argOf = name => {
  const i = args.indexOf(name);
  return i < 0 ? '' : args[i + 1] || '';
};
const only = new Set(
  argOf('--only')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
);
// Умолчание — дотфайл в корне репозитория: так лежат все листы, которых нет
// в git. Свой путь считается от рабочего каталога, а не от корня.
const out = argOf('--out');
const OUT = out ? path.resolve(out) : path.join(R, '.treat-sheet.html');

const works = new Map(JSON.parse(fs.readFileSync(`${G}/museum-works.json`)).map(w => [w.ref, w]));
const order = JSON.parse(fs.readFileSync(`${R}/catalogue/order.json`));
const live = order
  .map(ref => {
    try {
      return JSON.parse(fs.readFileSync(`${R}/catalogue/${ref}.json`));
    } catch {
      return null;
    }
  })
  .filter(c => c && !c.hidden && works.has(c.ref));
const chosen = only.size ? live.filter(c => only.has(c.ref)) : live;
for (const ref of only) if (!chosen.some(c => c.ref === ref)) console.log(`  ${ref}: не живая работа или нет в museum-works.json`);

const sourceOf = w => (w.upscaled ? `${G}/upscaled/${w.ref}.jpg` : `${G}/sources/${w.ref}.jpg`);

// Короткая сторона под потолок `cap`, без увеличения — так уменьшает генератор.
const capped = (w, h, cap) => {
  const f = Math.min(1, cap / Math.min(w, h));
  return { width: Math.round(w * f), height: Math.round(h * f) };
};

// Четыре поля багета, приведённые к нужному масштабу. В `museum-works.json` они
// записаны в пикселях листа генератора, и на рабочем размере их надо ужать
// во столько же раз, во сколько ужат сам лист.
const trimAt = (trim, scale) => ({
  left: Math.round((trim.left || 0) * scale),
  top: Math.round((trim.top || 0) * scale),
  right: Math.round((trim.right || 0) * scale),
  bottom: Math.round((trim.bottom || 0) * scale)
});

// Лист генератора после обрезки — та рамка, внутри которой `placement` считает
// своё окно.
function trimmedBox(trim, box) {
  if (!trim) return box;
  const t = trimAt(trim, 1);
  return { width: box.width - t.left - t.right, height: box.height - t.top - t.bottom };
}

// Багет, снятый с сырых пикселей. Построчным копированием, а не через sharp:
// это вырезка из буфера, и лишний круг декодирования ей не нужен.
function cutTrim(trim, data, raw, scale) {
  if (!trim) return { data, raw };
  const t = trimAt(trim, scale);
  const width = Math.max(1, raw.width - t.left - t.right);
  const height = Math.max(1, raw.height - t.top - t.bottom);
  const out = new Uint8Array(width * height * 3);
  for (let y = 0; y < height; y++) {
    const from = ((y + t.top) * raw.width + t.left) * 3;
    out.set(data.subarray(from, from + width * 3), y * width * 3);
  }
  return { data: out, raw: { width, height, channels: 3 } };
}

// Окно в масштабе генератора, приведённое к рабочей картинке. Возвращает либо
// окно в пикселях, либо `position` для sharp — как и `placement`.
function frame(rule, ratio, gen, work) {
  const spot = placement(rule, ratio, gen.width, gen.height);
  const size = windowSize(ratio, work.width, work.height);
  if (!spot.window) return { position: spot.position, ...size };
  const f = work.width / gen.width;
  return {
    window: {
      left: Math.min(Math.max(Math.round(spot.window.left * f), 0), work.width - size.width),
      top: Math.min(Math.max(Math.round(spot.window.top * f), 0), work.height - size.height),
      width: size.width,
      height: size.height
    }
  };
}

const cut = (data, raw, fr) =>
  fr.window
    ? sharp(data, { raw }).extract(fr.window)
    : sharp(data, { raw }).resize(fr.width, fr.height, { fit: 'cover', position: fr.position });

const tile = (data, raw) =>
  sharp(data, { raw })
    .resize(WIDTH, HEIGHT, { fit: 'fill' })
    .jpeg({ quality: 78, chromaSubsampling: '4:2:0', mozjpeg: true })
    .toBuffer();

async function render(c) {
  const w = works.get(c.ref);
  const src = sharp(sourceOf(w), { limitInputPixels: false });
  const meta = await src.metadata();
  const whole = capped(meta.width, meta.height, GEN_SHORT);
  const full = await src
    .resize(WORK_SHORT, WORK_SHORT, { fit: 'outside', withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  // Багет снимается первым — в обоих масштабах сразу. В рабочем, потому что
  // дальше по этим пикселям считают баланс и потолки; в генераторном, потому
  // что правило кадра отсчитывается от обрезанного листа, и окно, поставленное
  // по необрезанному, уехало бы на ширину поля.
  const fullRaw = { width: full.info.width, height: full.info.height, channels: 3 };
  const { data, raw } = cutTrim(w.trim, full.data, fullRaw, fullRaw.width / whole.width);
  const gen = trimmedBox(w.trim, whole);

  // Баланс по серому — по целой работе: увод у сканов общий, и мерить его по
  // кадру значило бы получить у двух кадров одной работы два разных увода.
  const cast = greyCast(reduce(data, raw.width, raw.height, CAST_AT).pixels);
  const gains = cast ? gainsAt(cast.gain, BALANCE) : [1, 1, 1];
  const balanced = applied(data, gains);

  const phone = frame(frameCrop(w.crop, 'phone'), RATIOS.phone, gen, raw);
  const probeCrop = await cut(balanced, raw, phone).raw().toBuffer({ resolveWithObject: true });
  const probe = reduce(probeCrop.data, probeCrop.info.width, probeCrop.info.height, PROBE).pixels;

  const tall = frame(frameCrop(w.crop, 'tall'), RATIOS.tall, gen, raw);
  const tallCrop = await cut(balanced, raw, tall).raw().toBuffer({ resolveWithObject: true });
  const tallRaw = { width: tallCrop.info.width, height: tallCrop.info.height, channels: 3 };
  // Плитка несёт свою подпись и свои числа с собой: три отдельных списка —
  // картинки, названия правил, решения — держались бы в одном порядке только
  // по договорённости, а разъехавшись, подписали бы картинку чужим правилом.
  const tiles = [{ label: 'scan', data: await tile(await cut(data, raw, tall).raw().toBuffer(), tallRaw) }];
  for (const [label, rule] of [
    ['dim', DIM],
    ['ceil', CEIL]
  ]) {
    const set = solve(rule, probe);
    tiles.push({
      label,
      data: await tile(paint(tallCrop.data, set), tallRaw),
      // Числа под плиткой видно сразу: у тёмной работы потолок яркости ничего
      // не делает, и `ceil` выходит той же картинкой, что `dim`. Без чисел это
      // читается как «две одинаковые плитки», то есть как ошибка листа.
      note: `цвет ×${set.k.toFixed(2)} · свет ×${set.b.toFixed(2)}`
    });
  }

  return {
    ref: c.ref,
    title: c.provenance?.work || c.title,
    artist: c.provenance?.creator || '',
    now: String(w.treatment ?? 'dim'),
    tiles: tiles.map(t => ({ ...t, data: t.data.toString('base64') })),
    bytes: tiles.reduce((a, t) => a + t.data.length, 0)
  };
}

const rows = [];
let done = 0;
for (const c of chosen) {
  try {
    rows.push(await render(c));
  } catch (err) {
    // Сначала перевод строки: счётчик стоит без него, и ошибка легла бы
    // поверх счётчика. И в stderr, а не в stdout: это не итог прогона.
    process.stderr.write(`\n  ${c.ref}: ${err.message}\n`);
  }
  // Круги, а не набранные строки, — иначе упавшая работа не сдвинет счётчик
  // и прогон будет выглядеть остановившимся.
  process.stderr.write(`\r  ${++done}/${chosen.length}`);
}
process.stderr.write('\n');
console.log(`${rows.length} работ · ${(rows.reduce((a, r) => a + r.bytes, 0) / 1e6).toFixed(1)} МБ плиток`);

// ------------------------------------------------------------------- лист
const esc = s => String(s ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);

const sheet = rows
  .map(
    r => `<section>
  <h2>${esc(r.ref)} · ${esc(r.title)}<span>${esc(r.artist)}</span><b>${esc(r.now)}</b></h2>
  <div class="three">
${r.tiles
  .map(
    t => `    <figure><img src="data:image/jpeg;base64,${t.data}" alt="" decoding="async" loading="lazy">
      <figcaption>${t.label}${t.note ? `<i>${t.note}</i>` : ''}</figcaption></figure>`
  )
  .join('\n')}
  </div>
</section>`
  )
  .join('\n');

fs.writeFileSync(
  OUT,
  `<!DOCTYPE html>
<meta charset="utf-8">
<title>Scan · dim · ceil</title>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0c0b0a">
<style>
  :root { --bg: #0c0b0a; --line: #2a2723; --fg: #edeae3; --fg-dim: #8e8b84; --accent: #c9a45c }
  html, body { margin: 0; background: var(--bg); color: var(--fg);
    font: 14px/1.4 system-ui, -apple-system, sans-serif }
  body { padding: 18px 14px 40px }
  h1 { font: 600 15px/1 system-ui, sans-serif; margin: 0 0 18px }
  h1 span { color: var(--fg-dim); font-weight: 400 }
  section { margin: 0 0 26px }
  h2 { display: flex; flex-wrap: wrap; align-items: baseline; gap: 10px; margin: 0 0 8px;
    font: 500 15px/1.3 ui-serif, Georgia, serif }
  h2 span { color: var(--fg-dim); font: 13px system-ui, sans-serif }
  h2 b { margin-left: auto; color: var(--accent); font: 600 12px system-ui, sans-serif;
    border: 1px solid var(--line); border-radius: 999px; padding: 2px 9px }
  .three { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; max-width: 1260px }
  figure { margin: 0 }
  figure img { width: 100%; aspect-ratio: 9 / 16; object-fit: cover; display: block;
    background: #000; border-radius: 3px }
  figcaption { padding-top: 5px; color: var(--fg-dim); font-size: 12px;
    font-variant-numeric: tabular-nums }
  figcaption i { display: block; font-style: normal; opacity: .75 }
</style>

<h1>Scan · dim · ceil <span>— ${rows.length} works</span></h1>
${sheet}
`
);
console.log(OUT.startsWith(R + path.sep) ? path.relative(R, OUT) : OUT);
