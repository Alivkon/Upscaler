// Генератор растровых favicon (PNG) из той же геометрии, что и public/favicon.svg.
// Не требует внешних библиотек: использует встроенный zlib для кодирования PNG
// и суперсэмплинг для сглаживания краёв.
//
// Запуск: node scripts/gen-favicon.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PUBLIC = join(ROOT, 'public');

// ---- Цвета (фирменная палитра) ----
const INK = [23, 53, 46];
const WHITE = [255, 253, 250];
const LIME = [217, 242, 95];

// ---- Геометрия фигур (пространство 0..100) ----
const BG = { x: 2, y: 2, w: 96, h: 96, r: 24 };
const CARD = { x: 26, y: 26, w: 48, h: 48, r: 9 };
// «гора» — треугольник
const MTN = { ax: 32, ay: 69, bx: 48, by: 45, cx: 64, cy: 69 };
// «солнце»
const SUN = { cx: 57, cy: 39, r: 4.5 };
// углы-«расширение» (ломанные со скруглёнными концами)
const BRACKETS = [
  [{ x: 75, y: 19 }, { x: 75, y: 26 }, { x: 82, y: 26 }],
  [{ x: 25, y: 81 }, { x: 25, y: 74 }, { x: 18, y: 74 }],
];
const BRACKET_W = 4.5; // толщина линии

// ---- Математика ----
function rrInside(px, py, rr) {
  const cx = rr.x + rr.w / 2;
  const cy = rr.y + rr.h / 2;
  const hw = rr.w / 2 - rr.r;
  const hh = rr.h / 2 - rr.r;
  const dx = Math.abs(px - cx) - hw;
  const dy = Math.abs(py - cy) - hh;
  const d =
    Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - rr.r;
  return d <= 0;
}

function triSign(ax, ay, bx, by, cx, cy) {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
}
function triInside(px, py, t) {
  const d1 = triSign(px, py, t.ax, t.ay, t.bx, t.by);
  const d2 = triSign(px, py, t.bx, t.by, t.cx, t.cy);
  const d3 = triSign(px, py, t.cx, t.cy, t.ax, t.ay);
  const neg = d1 < 0 || d2 < 0 || d3 < 0;
  const pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
}

function segDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  let t = l2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}
function polylineDist(px, py, pts) {
  let min = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    min = Math.min(min, segDist(px, py, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y));
  }
  return min;
}
function bracketInside(px, py) {
  for (const pts of BRACKETS) {
    if (polylineDist(px, py, pts) <= BRACKET_W / 2) return true;
  }
  return false;
}

// Определяет цвет (RGBA) для одной точки в пространстве 0..100.
function colorAt(px, py) {
  if (bracketInside(px, py)) return [...LIME, 255];
  if (Math.hypot(px - SUN.cx, py - SUN.cy) <= SUN.r) return [...LIME, 255];
  if (triInside(px, py, MTN)) return [...LIME, 255];
  if (rrInside(px, py, CARD)) return [...WHITE, 255];
  if (rrInside(px, py, BG)) return [...INK, 255];
  return [0, 0, 0, 0]; // прозрачный фон вокруг скруглённого квадрата
}

// ---- Растеризация с суперсэмплингом ----
function render(size, ss = 4) {
  const buf = Buffer.alloc(size * size * 4);
  const hi = size * ss;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const px = ((x * ss + sx + 0.5) / hi) * 100;
          const py = ((y * ss + sy + 0.5) / hi) * 100;
          const c = colorAt(px, py);
          // assume premultiplied-free stacking of opaque color over alpha
          const ca = c[3] / 255;
          r += c[0] * ca;
          g += c[1] * ca;
          b += c[2] * ca;
          a += c[3];
        }
      }
      const n = ss * ss;
      const idx = (y * size + x) * 4;
      buf[idx] = Math.round(r / n);
      buf[idx + 1] = Math.round(g / n);
      buf[idx + 2] = Math.round(b / n);
      buf[idx + 3] = Math.round(a / n);
    }
  }
  return buf;
}

// ---- PNG-энкодер (RGBA8, filter 0, zlib) ----
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}
function pngEncode(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // scanlines with filter byte 0
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- Генерация файлов ----
const sizes = [
  { name: 'favicon-16.png', size: 16 },
  { name: 'favicon-32.png', size: 32 },
  { name: 'favicon-48.png', size: 48 },
  { name: 'apple-touch-icon.png', size: 180 },
];
mkdirSync(PUBLIC, { recursive: true });
for (const { name, size } of sizes) {
  const png = pngEncode(size, size, render(size));
  writeFileSync(join(PUBLIC, name), png);
  console.log(`ok ${name} (${size}x${size}, ${png.length} bytes)`);
}
console.log('done');
