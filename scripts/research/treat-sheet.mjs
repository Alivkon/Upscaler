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
// ПЛИТКА — ПРОЁМ, А НЕ КАРТИНКА. В плитке лежит вся плита целиком, а видно
// в ней окно 9:19.5 — тот самый телефонный кадр, который выйдет. Плиту внутри
// окна можно возить пальцем: рамка стоит, картина едет. Это второй вопрос того
// же взгляда — «как оно смотрится», — и разделять его с правилом обработки
// незачем: обе правки видно на одной картинке, и оба ответа собирает одно поле
// внизу. Кадр 9:16 (`tall`), который лист красил раньше, ушёл: правило `crop`
// у работы задано по телефонному окну (`frameCrop`), и показывать надо то окно,
// про которое спрашиваешь.
//
// Но кадр ЗДЕСЬ — прикидка, а не решение: окон у работы три, показано одно,
// и сравнить его не с чем. Хватает её ровно на вопрос этого листа — картина,
// у которой в телефонном окне нет ничего, не нужна ни с каким правилом.
// Кадр ставится следующим шагом, на `crop-positioner.mjs`, и поставленное там
// прикидку перекрывает.
//
// Цена — вес: окно 1080 px по ширине означает плиту в 4000 px, то есть в 2-3
// раза больше пикселей, чем у обрезанной плитки. Поэтому плитки лежат не в HTML
// строками base64, а файлами рядом с ним (`.treat-sheet/`), и браузер тянет их
// по мере прокрутки. Лист перестал быть одним файлом: носить его надо вместе
// с каталогом.
//
// На листе кнопки: у каждой работы выбирают одну из трёх плиток, а поле внизу
// собирает те, что расходятся с нынешним `treatment`, строками для копирования;
// сдвинутое окно приписывается к той же строке как `crop left … top …`
// в пикселях генератора — в тех же, в которых `crop` записан
// в `museum-works.json`. Новые картины — через `--only`: им не нужно быть
// живыми на сайте.
//
// С `--only` лист меняет и смысл галочки. Живая работа всегда выходит с каким-то
// правилом — снять её с витрины листом обработки нельзя, для этого есть `hidden`
// в каталоге, и мешать два механизма незачем. А у ещё не опубликованной работы
// «не отмечено ничего» — законный ответ: «глянул, картина не нужна». Поэтому
// в режиме `--only` галочки НЕ переключают друг друга по умолчанию на dim —
// пустая работа остаётся пустой, и это и есть отказ. У живой витрины умолчание
// прежнее: должна быть отмечена ровно одна плитка, и старт — на нынешнем правиле.
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

// 1080 — не печать, а телефонный экран: крупный Android рисует свои CSS-пиксели
// втрое, и 1080 физических px по короткой стороне почти всегда 1:1 с экраном,
// без домашнего апскейла браузера. На столе плитка всё равно ужимается вёрсткой
// (figure img { width: 100% }), так что десктопный вид от этого не меняется —
// меняется только вес файла.
const WIDTH = 1080;
const HEIGHT = Math.round(WIDTH / RATIOS.phone);
const GEN_SHORT = 3840; // потолок короткой стороны у генератора: правила кадра заданы в этих пикселях
const WORK_SHORT = 2800; // с запасом над HEIGHT (2340): без него узкое окно кадра мылится при увеличении до плитки
// Потолок на плитку. Плита шире окна во столько раз, во сколько она шире
// 9:19.5, и у пейзажа 2:1 это вчетверо: 5000 × 2340 — картинка, которую телефон
// разжимает в 47 МБ памяти и выбрасывает, не дорисовав. Потолок трогает только
// разрешение файла, не разметку: окно всё равно меряется долями ширины, и
// широкая плита просто выходит мягче.
const MAX_TILE = 7e6;

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
// `--only` — это всегда ещё не опубликованная партия: см. комментарий про
// галочки выше.
const SCREEN = only.size > 0;
// Умолчание — дотфайл в корне репозитория: так лежат все листы, которых нет
// в git. Свой путь считается от рабочего каталога, а не от корня.
const out = argOf('--out');
const OUT = out ? path.resolve(out) : path.join(R, '.treat-sheet.html');
// Каталог плиток — рядом с листом и назван по нему: `.treat-sheet.html` →
// `.treat-sheet/`. Два листа в одной папке не перепишут друг друга, а старые
// плитки удаляются целиком: работа, выпавшая из `--only`, оставила бы файл,
// на который никто не ссылается.
const TILES = OUT.replace(/\.html?$/i, '') + '/';
const TILE_HREF = path.basename(TILES.slice(0, -1)) + '/';

const works = new Map(JSON.parse(fs.readFileSync(`${G}/museum-works.json`)).map(w => [w.ref, w]));
const order = JSON.parse(fs.readFileSync(`${R}/catalogue/order.json`));
const card = ref => {
  try {
    return JSON.parse(fs.readFileSync(`${R}/catalogue/${ref}.json`));
  } catch {
    return null;
  }
};
const live = order.map(card).filter(c => c && !c.hidden && works.has(c.ref));
// С `--only` работа не обязана быть живой: лист нужен и новой картине, у которой
// ещё нет страницы или карточка стоит `hidden`, — правило выбирают до выхода,
// пока файл ещё не опубликован и его имя можно менять. Нужна только запись
// в `museum-works.json` и мастер; без карточки плитку подпишет `name`.
const chosen = only.size
  ? [...only].filter(ref => works.has(ref)).map(ref => card(ref) || { ref, title: works.get(ref).name })
  : live;
for (const ref of only) if (!works.has(ref)) console.log(`  ${ref}: нет в museum-works.json`);

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

// Плитка — вся плита, увеличенная так, чтобы окно вышло шириной WIDTH. Размер
// в разметке (`box`) и размер файла (`enc`) — разные числа: первый задаёт
// систему координат окна, второй урезан потолком MAX_TILE.
const tile = (data, raw, box) =>
  sharp(data, { raw })
    .resize(box.enc.width, box.enc.height, { fit: 'fill' })
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

  // Где окно стоит СЕЙЧАС, в пикселях рабочей картинки. У правила `{left, top}`
  // это само правило; у `attention` и `entropy` место выбирает libvips, и
  // спросить его можно только постфактум — sharp кладёт выбранный угол
  // в `cropOffset*` того же вызова, которым мерили пробу.
  const size = windowSize(RATIOS.phone, raw.width, raw.height);
  const at = phone.window
    ? { left: phone.window.left, top: phone.window.top, width: phone.window.width, height: phone.window.height }
    : phone.position === 'centre'
      ? { left: Math.round((raw.width - size.width) / 2), top: Math.round((raw.height - size.height) / 2), ...size }
      : { left: Math.abs(probeCrop.info.cropOffsetLeft || 0), top: Math.abs(probeCrop.info.cropOffsetTop || 0), ...size };

  // Система координат листа: окно — WIDTH × HEIGHT, плита — во столько же раз
  // больше, во сколько она больше окна. Файл при этом может быть мельче (MAX_TILE);
  // разметка про это не знает и мерить продолжает в координатах окна.
  const s = WIDTH / at.width;
  const box = { width: Math.round(raw.width * s), height: Math.round(raw.height * s) };
  const enc = Math.min(1, Math.sqrt(MAX_TILE / (box.width * box.height)));
  box.enc = { width: Math.round(box.width * enc), height: Math.round(box.height * enc) };

  // Плитка несёт свою подпись и свои числа с собой: три отдельных списка —
  // картинки, названия правил, решения — держались бы в одном порядке только
  // по договорённости, а разъехавшись, подписали бы картинку чужим правилом.
  const tiles = [{ label: 'scan', data: await tile(data, raw, box) }];
  for (const [label, rule] of [
    ['dim', DIM],
    ['ceil', CEIL]
  ]) {
    const set = solve(rule, probe);
    tiles.push({
      label,
      data: await tile(paint(balanced, set), raw, box),
      // Числа на плитке видно сразу: у тёмной работы потолок яркости ничего
      // не делает, и `ceil` выходит той же картинкой, что `dim`. Без чисел это
      // читается как «две одинаковые плитки», то есть как ошибка листа.
      note: `цвет ×${set.k.toFixed(2)} · свет ×${set.b.toFixed(2)}`
    });
  }

  for (const t of tiles) fs.writeFileSync(`${TILES}${c.ref}-${t.label}.jpg`, t.data);

  return {
    ref: c.ref,
    title: c.provenance?.work || c.title,
    artist: c.provenance?.creator || '',
    now: String(w.treatment ?? 'dim'),
    tiles: tiles.map(t => ({ label: t.label, note: t.note, src: `${TILE_HREF}${c.ref}-${t.label}.jpg` })),
    // Плита в координатах окна и место окна в них же — всё, что нужно разметке,
    // чтобы возить картину внутри рамки. `gen` переводит сдвиг обратно в пиксели
    // генератора: в них записан `crop`, и в них же лист его отдаёт.
    box: { width: box.width, height: box.height },
    at: { left: Math.round(at.left * s), top: Math.round(at.top * s) },
    gen: gen.width / box.width,
    bytes: tiles.reduce((a, t) => a + t.data.length, 0)
  };
}

fs.rmSync(TILES, { recursive: true, force: true });
fs.mkdirSync(TILES, { recursive: true });

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

// Плитка `scan` — это значение `none` поля: кнопка называет то, что попадёт
// в `museum-works.json`, а подпись над плиткой — то, что на ней нарисовано.
const valueOf = label => (label === 'scan' ? 'none' : label);

// Размеры плиты и место окна едут в разметке долями окна, а не пикселями файла:
// ширину плитке задаёт вёрстка, и пересчитывать её в JS значило бы ошибаться
// на каждом повороте экрана.
const sheet = rows
  .map(
    r => `<section data-ref="${esc(r.ref)}" data-now="${esc(r.now)}" data-bw="${r.box.width}" data-bh="${r.box.height}" data-px="${r.at.left}" data-py="${r.at.top}" data-gen="${r.gen.toFixed(6)}">
  <h2>${esc(r.ref)} · ${esc(r.title)}<span>${esc(r.artist)}</span><i class="pan"></i><button type="button" class="undo" title="вернуть окно на место">⊕</button><b>now ${esc(r.now)}</b></h2>
  <div class="three">
${r.tiles
  .map(
    t => `    <figure data-v="${valueOf(t.label)}"><div class="port"><img src="${esc(t.src)}" alt="" decoding="async" loading="lazy" draggable="false" style="width:${((r.box.width / WIDTH) * 100).toFixed(4)}%;height:${((r.box.height / HEIGHT) * 100).toFixed(4)}%"></div>
      <label class="check"><input type="checkbox" tabindex="-1">${valueOf(t.label)}</label>${t.note ? `<i class="note">${t.note}</i>` : ''}</figure>`
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
  h2 .pan { font: 400 11px ui-monospace, monospace; font-style: normal; color: var(--fg-dim);
    font-variant-numeric: tabular-nums }
  h2 .undo { display: none; background: none; border: 1px solid var(--line); border-radius: 999px;
    color: var(--fg-dim); font: 12px/1 system-ui, sans-serif; padding: 3px 8px; cursor: pointer }
  section.panned h2 .undo { display: block }
  section.panned h2 .pan { color: var(--accent) }
  .three { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; max-width: 1260px }
  @media (max-width: 700px) {
    .three { grid-template-columns: 1fr; max-width: 480px; margin: 0 auto; gap: 18px }
  }
  figure { margin: 0; position: relative; cursor: pointer }
  /* Проём: рамка стоит на месте, картина внутри ездит. Пропорция — телефонная,
     9:19.5, то есть ровно тот кадр, который выйдет. */
  .port { position: relative; overflow: hidden; aspect-ratio: 9 / 19.5; background: #000;
    border-radius: 3px; outline: 2px solid transparent; outline-offset: 2px;
    /* по вертикали пусть листается страница: плита шире окна, а не выше его,
       и вертикальный жест в проёме нужен реже, чем прокрутка длинного листа */
    touch-action: pan-y; cursor: grab }
  .port.grab { cursor: grabbing }
  .port img { position: absolute; left: 0; top: 0; display: block; user-select: none;
    -webkit-user-drag: none }
  figure.on .port { outline-color: var(--accent) }
  .check { position: absolute; top: 10px; right: 10px; display: inline-flex; align-items: center; gap: 7px;
    font: 600 13px system-ui, sans-serif; color: var(--fg); background: rgba(12,11,10,.72);
    backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    border: 1px solid rgba(255,255,255,.18); border-radius: 8px; padding: 6px 12px; cursor: pointer }
  .check input { pointer-events: none; margin: 0; width: 15px; height: 15px; accent-color: var(--accent) }
  figure.on .check { background: var(--accent); border-color: var(--accent); color: #0c0b0a }
  .note { position: absolute; left: 10px; bottom: 10px; display: block; font-style: normal; font-size: 11px;
    color: rgba(255,255,255,.8); background: rgba(12,11,10,.55); padding: 3px 8px; border-radius: 6px;
    font-variant-numeric: tabular-nums }
  section.moved h2 b { color: #0c0b0a; background: var(--accent); border-color: var(--accent) }
  #out { position: sticky; bottom: 0; margin: 0 -14px -40px; padding: 10px 14px calc(10px + env(safe-area-inset-bottom));
    background: #161412; border-top: 1px solid var(--line); display: grid; grid-template-columns: 1fr auto; gap: 8px }
  #out textarea { grid-row: 1 / 3; min-height: 64px; resize: vertical; background: #0c0b0a; color: var(--fg);
    border: 1px solid var(--line); border-radius: 8px; padding: 8px; font: 12px/1.4 ui-monospace, monospace }
  #out button { font: 600 13px system-ui, sans-serif; border-radius: 8px; padding: 8px 14px; cursor: pointer;
    background: var(--accent); border: 0; color: #0c0b0a }
  #out span { color: var(--fg-dim); font-size: 12px; text-align: center }
</style>

<h1>Scan · dim · ceil <span>— ${rows.length} works · ${SCREEN ? 'check the one you want · leave all three unchecked to drop the painting' : 'tap a tile to pick'} · drag inside a tile to move the crop</span></h1>
${sheet}
<div id="out">
  <textarea id="res" readonly placeholder="${SCREEN ? 'Kept works appear here as ref: treatment' : 'Picks that differ from the current treatment appear here'}"></textarea>
  <button type="button" id="copy">Copy</button>
  <span id="n">${SCREEN ? '0 kept' : '0 changed'}</span>
</div>
<script>
  const SCREEN = ${SCREEN ? 'true' : 'false'};
  const VIEW_W = ${WIDTH}, VIEW_H = ${HEIGHT};
  // Выбор держится в localStorage: лист на много работ за один присест не проходят,
  // и перезагрузка не должна стирать уже отмеченное. Сдвиг окна — там же и по той
  // же причине, но отдельным ключом: два разных ответа, и терять их врозь.
  const KEY = 'treat-sheet-picks' + (SCREEN ? '-screen' : '');
  const PAN_KEY = 'treat-sheet-pans' + (SCREEN ? '-screen' : '');
  let picks = {};
  let pans = {};
  try { picks = JSON.parse(localStorage.getItem(KEY)) || {}; } catch {}
  try { pans = JSON.parse(localStorage.getItem(PAN_KEY)) || {}; } catch {}
  const sections = [...document.querySelectorAll('section[data-ref]')];

  // ------------------------------------------------------------------ окно
  const clamp = (v, max) => Math.max(0, Math.min(Math.round(v), Math.round(max)));
  // Сколько плите есть куда ехать: ширина плиты минус ширина окна, в координатах
  // окна. Ноль — плита ровно в окно, возить нечего.
  const room = s => ({ x: Math.max(0, +s.dataset.bw - VIEW_W), y: Math.max(0, +s.dataset.bh - VIEW_H) });
  const home = s => ({ x: +s.dataset.px, y: +s.dataset.py });
  const panOf = s => pans[s.dataset.ref] || home(s);

  function paintPan(s) {
    const p = panOf(s), h = home(s), r = room(s);
    for (const img of s.querySelectorAll('.port img')) {
      img.style.left = (-p.x / VIEW_W * 100).toFixed(4) + '%';
      img.style.top = (-p.y / VIEW_H * 100).toFixed(4) + '%';
    }
    const moved = p.x !== h.x || p.y !== h.y;
    s.classList.toggle('panned', moved);
    const g = +s.dataset.gen;
    s.querySelector('h2 .pan').textContent =
      !r.x && !r.y ? '' : moved ? 'crop ' + Math.round(p.x * g) + ', ' + Math.round(p.y * g) : '';
  }

  function setPan(s, x, y) {
    const r = room(s), h = home(s);
    const p = { x: clamp(x, r.x), y: clamp(y, r.y) };
    if (p.x === h.x && p.y === h.y) delete pans[s.dataset.ref]; else pans[s.dataset.ref] = p;
    paintPan(s);
    draw();
  }

  // Возить можно за любую из трёх плиток — окно у них одно, и разъехаться они
  // не должны: три разных кадра сравнивать не с чем.
  let drag = null;
  document.addEventListener('pointerdown', e => {
    const port = e.target.closest('.port');
    if (!port) return;
    const s = port.closest('section'), p = panOf(s);
    drag = { s, port, x: e.clientX, y: e.clientY, px: p.x, py: p.y,
      k: VIEW_W / port.clientWidth, id: e.pointerId, moved: false };
    port.setPointerCapture(e.pointerId);
    port.classList.add('grab');
  });
  document.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = (drag.x - e.clientX) * drag.k, dy = (drag.y - e.clientY) * drag.k;
    if (Math.abs(dx) + Math.abs(dy) > 6) drag.moved = true;
    if (drag.moved) setPan(drag.s, drag.px + dx, drag.py + dy);
  });
  const endDrag = e => {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    drag.port.classList.remove('grab');
    // Тап без езды — это выбор плитки, и он уйдёт в обработчик click. Тап
    // с ездой — не выбор: без этой отметки каждое движение пальцем переключало
    // бы правило.
    moveGuard = drag.moved;
    drag = null;
  };
  let moveGuard = false;
  document.addEventListener('pointerup', endDrag);
  document.addEventListener('pointercancel', endDrag);

  document.addEventListener('click', e => {
    const undo = e.target.closest('.undo');
    if (undo) { const s = undo.closest('section'); delete pans[s.dataset.ref]; paintPan(s); draw(); }
  });

  function draw() {
    const lines = [];
    let kept = 0;
    for (const s of sections) {
      // В режиме отбора нет умолчания: ничего не отмечено — работа отказана,
      // а не «осталась как есть». В режиме витрины умолчание есть всегда —
      // это нынешнее правило, менять его молчанием нельзя.
      const v = SCREEN ? (picks[s.dataset.ref] ?? null) : (picks[s.dataset.ref] || s.dataset.now);
      for (const f of s.querySelectorAll('figure')) {
        const on = f.dataset.v === v;
        f.classList.toggle('on', on);
        f.querySelector('input').checked = on;
      }
      // Сдвиг окна приписывается к строке работы, а не собирается вторым
      // списком: это один ответ про одну картину, и разнести его по двум полям
      // значило бы дать им разъехаться при переносе в museum-works.json.
      const p = pans[s.dataset.ref];
      const g = +s.dataset.gen;
      const crop = p ? '  crop left ' + Math.round(p.x * g) + ' top ' + Math.round(p.y * g) : '';
      if (SCREEN) {
        const rejected = v === null;
        s.querySelector('h2 b').textContent = rejected ? 'not kept' : v;
        if (!rejected) { kept++; lines.push(s.dataset.ref + ': ' + v + crop); }
      } else {
        const moved = v !== s.dataset.now;
        s.classList.toggle('moved', moved);
        if (moved) lines.push(s.dataset.ref + ': ' + v + '  (was ' + s.dataset.now + ')' + crop);
        else if (crop) lines.push(s.dataset.ref + ':' + crop);
      }
    }
    document.getElementById('res').value = lines.join('\\n');
    document.getElementById('n').textContent = SCREEN ? (kept + ' kept · ' + (sections.length - kept) + ' not kept') : (lines.length + ' changed');
    try { localStorage.setItem(KEY, JSON.stringify(picks)); } catch {}
    try { localStorage.setItem(PAN_KEY, JSON.stringify(pans)); } catch {}
  }

  document.addEventListener('click', e => {
    if (moveGuard) { moveGuard = false; return; }
    const f = e.target.closest('figure[data-v]');
    if (!f) return;
    const s = f.closest('section');
    const now = SCREEN ? (picks[s.dataset.ref] ?? null) : (picks[s.dataset.ref] || s.dataset.now);
    if (f.dataset.v === now) {
      // Повторный тап снимает галочку. В режиме отбора это и есть отказ —
      // не «вернуться к умолчанию», умолчания тут нет.
      if (SCREEN) picks[s.dataset.ref] = null; else delete picks[s.dataset.ref];
    } else {
      picks[s.dataset.ref] = f.dataset.v;
    }
    draw();
  });

  document.getElementById('copy').addEventListener('click', async e => {
    const ta = document.getElementById('res');
    try { await navigator.clipboard.writeText(ta.value); }
    catch { ta.select(); document.execCommand('copy'); }
    e.target.textContent = 'Copied';
    setTimeout(() => (e.target.textContent = 'Copy'), 1200);
  });

  for (const s of sections) paintPan(s);
  draw();
</script>
`
);
console.log(OUT.startsWith(R + path.sep) ? path.relative(R, OUT) : OUT);
