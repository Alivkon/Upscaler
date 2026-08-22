// Второй набор — тот, которого правило ещё не видело. Всё как в make-manifest.mjs
// (крупнее копия, если нашлась; иначе исходник), плюс сразу считается занятость:
// доля пикселей, где сосед отличается больше чем на 12 ступеней яркости, в полосе
// 9:19.5 из середины — ровно так, как её считал measure-detail.mjs.
//
// Занятость считается ДО того, как что-либо увеличено, и записывается в манифест:
// иначе «предсказание» будет подгонкой задним числом.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const sharp = createRequire('/home/charlie/repos/Upscaler/')('sharp');

const DIR = '/home/charlie/Pictures/upscale-test/new';
const HERE = new URL('.', import.meta.url).pathname;
const [W, H] = [1440, 3120];

function busy(buf, w, h, thr = 12) {
  let n = 0, tot = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    if (Math.abs(buf[i] - buf[i + 1]) + Math.abs(buf[i] - buf[i + w]) > thr) n++;
    tot++;
  }
  return n / tot;
}

async function slice(file) {
  const m = await sharp(file).metadata();
  const w = Math.min(m.width, Math.round(m.height * W / H));
  const h = Math.min(m.height, Math.round(w * H / W));
  const buf = await sharp(file).extract({ left: Math.round((m.width - w) / 2), top: Math.round((m.height - h) / 2), width: w, height: h })
    .greyscale().raw().toBuffer();
  return busy(buf, w, h);
}

const files = (await fs.readdir(DIR)).filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f)).sort();
await fs.mkdir(path.join(HERE, 'src'), { recursive: true });
const man = [];
for (const [i, f] of files.entries()) {
  const id = 'm' + String(i + 1).padStart(2, '0');
  const bigger = path.join(DIR, 'bigger', f);
  const src = await fs.access(bigger).then(() => bigger, () => path.join(DIR, f));
  const m = await sharp(src).metadata();
  const ext = path.extname(src).toLowerCase();
  await fs.copyFile(src, path.join(HERE, 'src', id + ext));
  man.push({ id, file: f, url: `src/${id}${ext}`, w: m.width, h: m.height,
             need: +(W / m.width).toFixed(2), usedBigger: src === bigger,
             busy: +((await slice(src)) * 100).toFixed(1) });
}
await fs.writeFile(path.join(HERE, 'manifest-new.json'), JSON.stringify(man, null, 2));
console.log('id   размер        нужно  занятость  копия крупнее');
for (const r of man)
  console.log(`${r.id} ${(r.w + '×' + r.h).padEnd(12)} ×${String(r.need).padEnd(6)} ${String(r.busy).padStart(5)}%   ${r.usedBigger ? 'да' : ''}`);
