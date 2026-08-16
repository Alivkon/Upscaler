#!/usr/bin/env node
/**
 * Renders the procedurally generated plates from prototype-conservation.html
 * at real wallpaper resolution.
 *
 * The prototype paints them on a canvas at preview size. This is the same
 * generator rewritten against a raw RGBA buffer so it can run without a
 * browser and be encoded by sharp at each work's actual dimensions.
 *
 *   node scripts/render-plates.mjs [--out images/plates] [--before images/before] [--png]
 *
 * Runs at deploy: the catalogue is in git, the files are not, and the render
 * is deterministic, so this reproduces exactly what the site serves.
 *
 * Each work is written twice: the restored file at its full dimensions, and
 * the "before" it was restored from, at `work.from`. See renderBefore below.
 *
 * JPEG q92 4:4:4 is the shipped format, so it is what runs by default — a
 * default output the site does not serve would be a trap. `--png` adds the
 * lossless master beside it. Measurements behind the choice:
 * research/2026-08-16-indexable-collection.md, "Данные: формат файла".
 *
 * The random sequence is consumed in the same order as the canvas version,
 * and the ridgelines are sampled at w/160 regardless of size, so the shapes
 * match the preview — only grain and speckle density scale with resolution.
 */

import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { WORKS, beforeFile, plateFile } from '../works.js';

const rng = seed => {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
};

const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);

/** source-over of a straight-alpha colour onto one pixel of the buffer */
function blend(buf, i, r, g, b, a) {
  if (a <= 0) return;
  const inv = 1 - a;
  buf[i] = buf[i] * inv + r * a;
  buf[i + 1] = buf[i + 1] * inv + g * a;
  buf[i + 2] = buf[i + 2] * inv + b * a;
}

function paint(w, h, work, seedIndex, grain = 1) {
  const rand = rng(97 + seedIndex * 3803);
  const buf = new Float32Array(w * h * 3);
  const stops = work.stops.map(hex);

  // ── vertical gradient field ───────────────────────────────
  for (let y = 0; y < h; y++) {
    const t = (y + 0.5) / h;
    const seg = Math.min(stops.length - 2, Math.floor(t * (stops.length - 1)));
    const local = t * (stops.length - 1) - seg;
    const c0 = stops[seg];
    const c1 = stops[seg + 1];
    const r = lerp(c0[0], c1[0], local);
    const g = lerp(c0[1], c1[1], local);
    const b = lerp(c0[2], c1[2], local);
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      buf[i] = r;
      buf[i + 1] = g;
      buf[i + 2] = b;
    }
  }

  // ── soft luminous body, low on the frame ──────────────────
  const cx = w * (0.34 + rand() * 0.32);
  const cy = h * work.sun;
  const rad = Math.min(w, h) * (0.3 + rand() * 0.16);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / rad;
      if (d >= 1) continue;
      let r, g, b, a;
      if (d < 0.42) {
        const t = d / 0.42;
        r = lerp(255, 255, t);
        g = lerp(244, 238, t);
        b = lerp(226, 214, t);
        a = lerp(0.5, 0.16, t);
      } else {
        const t = (d - 0.42) / 0.58;
        r = 255;
        g = 238;
        b = 214;
        a = lerp(0.16, 0, t);
      }
      blend(buf, (y * w + x) * 3, r, g, b, a);
    }
  }

  // ── ridgelines ────────────────────────────────────────────
  // These exist to give the image fine detail: a pure gradient survives
  // downsampling almost intact, so without real edges the before/after
  // comparison in the prototype would prove nothing.
  const layers = 3;
  for (let L = 0; L < layers; L++) {
    const baseY = h * (0.52 + L * 0.13);
    const amp = h * (0.055 - L * 0.012);
    const step = Math.max(1, w / 160);

    const pts = [];
    let y = baseY;
    for (let x = 0; x <= w; x += step) {
      y += (rand() - 0.5) * amp * 0.42;
      y = y * 0.86 + baseY * 0.14; // pull back toward the base
      pts.push([x, y + Math.sin(x / (w / 5) + L) * amp * 0.3]);
    }

    const shade = 0.3 - L * 0.085;
    let seg = 0;
    for (let x = 0; x < w; x++) {
      const px = x + 0.5;
      while (seg < pts.length - 2 && pts[seg + 1][0] < px) seg++;
      const [x0, y0] = pts[seg];
      const [x1, y1] = pts[Math.min(seg + 1, pts.length - 1)];
      const t = x1 === x0 ? 0 : clamp01((px - x0) / (x1 - x0));
      const yc = lerp(y0, y1, t);
      const first = Math.max(0, Math.floor(yc));
      for (let j = first; j < h; j++) {
        // coverage of the pixel row [j, j+1) that falls below the curve
        const cov = clamp01(j + 1 - yc);
        blend(buf, (j * w + x) * 3, 12, 10, 14, shade * cov);
      }
    }
  }

  // ── fine speckle: the first thing lost at low resolution ──
  const specks = Math.round((w * h) / 5200);
  const s = Math.max(1, w / 700);
  for (let i = 0; i < specks; i++) {
    const sx = rand() * w;
    const sy = rand() * h * 0.5;
    const alpha = (rand() > 0.5 ? 0.5 : 0.22) * 0.5; // globalAlpha .5
    for (let y = Math.floor(sy); y < sy + s; y++) {
      if (y < 0 || y >= h) continue;
      const covY = Math.min(y + 1, sy + s) - Math.max(y, sy);
      for (let x = Math.floor(sx); x < sx + s; x++) {
        if (x < 0 || x >= w) continue;
        const covX = Math.min(x + 1, sx + s) - Math.max(x, sx);
        blend(buf, (y * w + x) * 3, 255, 250, 240, alpha * covX * covY);
      }
    }
  }

  // ── film grain ────────────────────────────────────────────
  const out = Buffer.allocUnsafe(w * h * 3);
  const amt = 15 * grain;
  for (let p = 0; p < w * h; p++) {
    const i = p * 3;
    const n = grain > 0.01 ? (rand() - 0.5) * amt : 0;
    out[i] = Math.max(0, Math.min(255, Math.round(buf[i] + n)));
    out[i + 1] = Math.max(0, Math.min(255, Math.round(buf[i + 1] + n)));
    out[i + 2] = Math.max(0, Math.min(255, Math.round(buf[i + 2] + n)));
  }
  return out;
}

const args = process.argv.slice(2);
const flag = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const outDir = path.resolve(flag('--out', 'images/plates'));
const beforeDir = path.resolve(flag('--before', 'images/before'));
const alsoPng = args.includes('--png');

await mkdir(outDir, { recursive: true });
await mkdir(beforeDir, { recursive: true });

/**
 * The same work as it looked before restoration — `work.from` is the size it
 * circulated at. Not a blur: the file has been through a real chain, exported
 * small and JPEG'd, reposted at some other size and JPEG'd again, so the
 * blocking and the ringing along the ridges are genuine artefacts rather than
 * an impression of them. Two generations, because generational loss is most
 * of why a picture saved off a feed looks the way it does.
 *
 * The first generation is rendered slightly larger so the second one lands
 * exactly on `work.from`: the page measures this file to state what the work
 * was restored from, and a measurement that disagrees with the claim would
 * make the comparison a sales pitch instead of a fact.
 *
 * Quality was mild at first — q72 then q66 — and that was wrong. Held against
 * the restored work in the frame, the two were indistinguishable: a smooth
 * gradient survives resampling almost intact, and at the size the page shows
 * it the difference measured 1.3 levels out of 255. Halving the dimensions
 * alone moved it to 1.6, which is still nothing.
 *
 * What makes a reposted file look reposted is not resolution, it is the
 * quantisation: banding across the sky and blocking along the ridges, both of
 * which survive being scaled back up. Hence q45 then q32, judged by eye at the
 * real size of the frame rather than by a difference metric — banding is
 * visible because it is coherent, not because it is large, and RMS misses it.
 * Lower than this the colour starts to shift green and it reads as a corrupt
 * file rather than a compressed one.
 */
async function renderBefore(image, work) {
  const [w, h] = work.from;
  const first = await image
    .clone()
    .resize(Math.round(w * 1.06), Math.round(h * 1.06))
    .jpeg({ quality: 45 })
    .toBuffer();
  const file = path.join(beforeDir, beforeFile(work));
  const { size } = await sharp(first).resize(w, h).jpeg({ quality: 32 }).toFile(file);
  return `${w}×${h} ${Math.round(size / 1e3)} KB`;
}

for (const [index, work] of WORKS.entries()) {
  const [w, h] = work.dims;
  const raw = paint(w, h, work, index);
  const image = sharp(raw, { raw: { width: w, height: h, channels: 3 } });

  const jpg = path.join(outDir, plateFile(work));
  const { size } = await image.clone().jpeg({ quality: 92, chromaSubsampling: '4:4:4' }).toFile(jpg);
  let line = `${path.relative(process.cwd(), jpg)}  ${(size / 1e6).toFixed(1)} MB`;

  if (alsoPng) {
    const png = jpg.replace(/\.jpg$/, '.png');
    const p = await image.clone().png({ compressionLevel: 9 }).toFile(png);
    line += `  ·  png ${(p.size / 1e6).toFixed(1)} MB`;
  }
  line += `  ·  before ${await renderBefore(image, work)}`;
  console.log(line);
}
