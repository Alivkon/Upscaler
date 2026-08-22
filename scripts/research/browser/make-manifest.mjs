// Тот же набор и тот же выбор источника, что в run-holdout2.mjs: если бесплатная
// копия крупнее нашлась — берём её, иначе исходный файл. Иначе местный счёт
// будет сравниваться с Topaz на разных картинках.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const sharp = createRequire('/home/charlie/repos/Upscaler/')('sharp');

const DIR = '/home/charlie/Pictures/upscale-test';
const HERE = new URL('.', import.meta.url).pathname;
const [W, H] = [1440, 3120];

const files = (await fs.readdir(DIR)).filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f)).sort();
await fs.mkdir(path.join(HERE, 'src'), { recursive: true });
const man = [];
for (const [i, f] of files.entries()) {
  const id = 'n' + String(i + 1).padStart(2, '0');
  const bigger = path.join(DIR, 'bigger', f);
  const src = await fs.access(bigger).then(() => bigger, () => path.join(DIR, f));
  const m = await sharp(src).metadata();
  await fs.copyFile(src, path.join(HERE, 'src', id + path.extname(src)));
  man.push({ id, url: `src/${id}${path.extname(src)}`, w: m.width, h: m.height,
             need: +(W / m.width).toFixed(2), usedBigger: src === bigger });
}
await fs.writeFile(path.join(HERE, 'manifest.json'), JSON.stringify(man, null, 2));
for (const r of man) console.log(`${r.id} ${String(r.w).padStart(5)}×${String(r.h).padEnd(5)} need ×${r.need}${r.usedBigger ? '  (bigger copy)' : ''}`);
