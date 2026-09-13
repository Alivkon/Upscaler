// Лист экрана блокировки: вся витрина с наложенными часами 9:41.
//
// Мера живёт рядом, в `clock-band.mjs`, и отвечает числом. Лист отвечает
// глазом, и нужен он потому, что число здесь не окончательное: «полоса пуста»
// — отсечка выбранная, а не найденная (разбор в
// research/2026-09-13-clock-band.md), и спорные случаи приходится смотреть.
// Смотреть надо на весь список, а не на прошедших: лист, показывающий только
// то, что прошло, не даёт увидеть, кого правило теряет зря.
//
// Порядок разделов поэтому такой: сначала прошедшие — тёмные, потом светлые,
// — затем все остальные, ближайшие к порогу первыми. У каждой отвергнутой
// написано, чем именно она не прошла, чтобы промах правила было видно сразу.
//
// РИСУЕТСЯ ИЗ ТОГО ЖЕ ФАЙЛА, ЧТО И МЕРЯЕТСЯ, — `crops.phone` из манифеста,
// то есть кадр, который поедет на телефон. Лист из мастера или из плиты
// показывал бы не то, что увидит посетитель: у двенадцати работ приглушённого
// файла нет по решению (`treatment: "none"`), и они уезжают светлыми.
//
// Часы нарисованы по геометрии локскрина iPhone в долях высоты кадра: дата
// на 0.105, цифры на 0.205, кегль 0.235 ширины. Те же доли, по которым
// `clock-band.mjs` берёт полосу, — иначе лист показывал бы одно, а мера
// считала другое.
//
// Лист по всем живым работам — 117 плиток, около восьми мегабайт в одном
// файле: base64 распухает на треть. Открывать с диска.
//
//   node scripts/research/clock-sheet.mjs                      # вся витрина
//   node scripts/research/clock-sheet.mjs --only vl-0052,vl-0066
//   node scripts/research/clock-sheet.mjs --out /tmp/clock.html
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { THRESHOLD } from './dimming.mjs';
import { measureGallery, FLAT_MAX, ICONS_MAX } from './clock-band.mjs';

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const WIDTH = 360; // ширина плитки; лист смотрят с экрана, не печатают
const RATIO = 3200 / 1477; // пропорции телефонного кадра витрины
const DARK = 10; // контраст с белым, выше которого работа «тёмная»

const arg = name => {
  const i = process.argv.indexOf(name);
  return i < 0 ? null : process.argv[i + 1];
};

// Часы поверх кадра. Дата стоит настоящая — лист смотрят в тот же день,
// и выдуманное число сбивает с толку сильнее, чем помогает.
function clockOverlay(height) {
  const y = f => Math.round(height * f);
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  return Buffer.from(
    `<svg width="${WIDTH}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <g fill="#ffffff" font-family="Helvetica, Arial, sans-serif" text-anchor="middle">
        <text x="${WIDTH / 2}" y="${y(0.105)}" font-size="${WIDTH * 0.042}" font-weight="500" opacity="0.95">${today}</text>
        <text x="${WIDTH / 2}" y="${y(0.205)}" font-size="${WIDTH * 0.235}" font-weight="300" letter-spacing="-2" opacity="0.97">9:41</text>
      </g>
    </svg>`
  );
}

// Чем работа не прошла. Пусто — прошла. Порядок причин от частой к редкой,
// и их может быть несколько: список должен говорить, что чинить.
const misses = r => {
  const out = [];
  if (r.lum > THRESHOLD) out.push(`часы тонут (яркость ${r.lum})`);
  if (r.dateLum > THRESHOLD) out.push(`дата тонет (яркость ${r.dateLum})`);
  if (r.flat > FLAT_MAX) out.push(`полоса занята (размах ${r.flat})`);
  if (r.icons > ICONS_MAX) out.push(`иконки тонут (пестрота ${r.icons})`);
  return out;
};

const esc = s =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const by = r => [r.creator, r.date].filter(Boolean).join(', ');

async function tile(r, height) {
  const buf = await sharp(path.join(R, 'images/crops', r.file))
    .resize(WIDTH, height, { fit: 'cover' })
    .composite([{ input: clockOverlay(height), top: 0, left: 0 }])
    .jpeg({ quality: 78 })
    .toBuffer();
  const why = misses(r);
  return `<figure>
<img src="data:image/jpeg;base64,${buf.toString('base64')}" alt="${esc(r.work)}">
<figcaption><b>${esc(r.work)}</b><br>
${by(r) ? esc(by(r)) + '<br>' : ''}
${r.ref} · контраст ${r.contrast}:1 · размах ${r.flat} · яркость ${r.lum} · иконки ${r.icons}
${why.length ? `<br><i>${esc(why.join('; '))}</i>` : ''}</figcaption>
</figure>
`;
}

async function section(title, note, rows, height) {
  if (!rows.length) return '';
  let html = `<h2>${esc(title)} — ${rows.length}</h2>\n<p>${note}</p>\n`;
  for (const r of rows) html += await tile(r, height);
  return html;
}

const only = arg('--only');
const out = arg('--out') ?? path.join(R, '.clock-sheet.html');
const height = Math.round(WIDTH * RATIO);

let rows = await measureGallery();
if (only) {
  const want = new Set(only.split(',').map(s => s.trim()));
  rows = rows.filter(r => want.has(r.ref));
}
const pass = rows.filter(r => r.empty).sort((a, b) => a.lum - b.lum);
// Отвергнутые — по тому, насколько далеко от порога, а не по числу причин:
// работа, перешагнувшая одну меру вдвое, дальше от списка, чем перешагнувшая
// две на волос. Мера расстояния одна на все четыре — во сколько раз превышен
// свой порог, — и берётся худшая.
const overshoot = r =>
  Math.max(r.lum / THRESHOLD, r.dateLum / THRESHOLD, r.flat / FLAT_MAX, r.icons / ICONS_MAX);
const rest = rows.filter(r => !r.empty).sort((a, b) => overshoot(a) - overshoot(b));

const html = `<!doctype html>
<meta charset="utf-8">
<title>Экран блокировки — вся витрина</title>
<style>figure { display: inline-block; width: ${WIDTH / 2}px; margin: 0 12px 20px 0; vertical-align: top }
img { width: ${WIDTH / 2}px; height: auto } figcaption { font: 12px/1.4 sans-serif } i { color: #a00 }</style>
<h1>Экран блокировки — вся витрина</h1>
<p>${rows.length} работ. Проходит ${pass.length}. Мера — <code>scripts/research/clock-band.mjs</code>:
яркость под цифрами и под датой ≤ ${THRESHOLD}, размах в полосе цифр ≤ ${FLAT_MAX},
пестрота иконок ≤ ${ICONS_MAX}. Часы наложены поверх того файла, что поедет на телефон.
Пересобрать — <code>node scripts/research/clock-sheet.mjs</code>.</p>
${await section('Подходят, тёмные', 'Часы лежат в черноте: контраст с белым от ' + DARK + ':1.', pass.filter(r => r.contrast >= DARK), height)}
${await section('Подходят, светлые', 'Полоса так же пуста, но светла — белое читается, и всё же это серое по серому.', pass.filter(r => r.contrast < DARK), height)}
${await section('Остальные', 'Ближайшие к порогу первыми; под каждой написано, чем не прошла.', rest, height)}
`;

await fs.writeFile(out, html);
console.log(`${rows.length} работ, проходит ${pass.length} → ${out} (${(Buffer.byteLength(html) / 1e6).toFixed(1)} МБ)`);
