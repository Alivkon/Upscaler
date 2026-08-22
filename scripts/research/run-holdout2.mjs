// Настоящая проверка меры: девятнадцать картинок, которые Чарли сам выбрал как
// обои, из них восемнадцать стоячих, и — впервые — десять выше порога.
//
// Порядок ровно тот, что пошёл бы в продукт:
//   1) бесплатно поискать копию крупнее по имени файла (findoriginal.mjs);
//   2) померить занятость ТОГО, что реально пойдёт в модель;
//   3) если ширины уже хватает — не звать модель вовсе;
//   4) иначе Topaz Standard V2, картинку целиком.
//
// Предсказание записывается ДО показа. Вопрос на листе изменён: не «оставил бы
// это на телефоне» (там отвечает вкус к сюжету, и прошлый круг на этом сгорел),
// а «достаточно ли резко» — сюжет Чарли выбрал сам, значит вкус уже учтён.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const sharp = createRequire('/home/charlie/repos/Upscaler/')('sharp');

const TOKEN = process.env.REPLICATE_API_TOKEN;
const SP = '/tmp/claude-1000/-home-charlie-repos-Upscaler/904c8c30-e059-4ad3-9f52-dd9dbb5f67e7/scratchpad';
const OUT = `${SP}/holdout2`;
const DIR = '/home/charlie/Pictures/upscale-test';
const headers = { Authorization: `Bearer ${TOKEN}` };
const [W, H] = [1440, 3120];
const THRESHOLD = 22;

async function busyOf(file) {
  const m = await sharp(file).metadata();
  const w = Math.min(m.width, Math.round(m.height * W / H));
  const h = Math.min(m.height, Math.round(w * H / W));
  const b = await sharp(file).extract({ left: Math.round((m.width - w) / 2), top: Math.round((m.height - h) / 2), width: w, height: h })
    .greyscale().raw().toBuffer();
  let n = 0, t = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    if (Math.abs(b[i] - b[i + 1]) + Math.abs(b[i] - b[i + w]) > 12) n++;
    t++;
  }
  return { busy: n / t * 100, width: m.width, height: m.height };
}

async function upload(buf, name) {
  const fd = new FormData();
  fd.append('content', new Blob([buf], { type: 'image/png' }), name);
  const r = await fetch('https://api.replicate.com/v1/files', { method: 'POST', headers, body: fd });
  const d = await r.json();
  if (!d.urls?.get) throw new Error('upload failed');
  return d.urls.get;
}

async function topaz(url, factor) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch('https://api.replicate.com/v1/models/topazlabs/image-upscale/predictions', {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'wait=60' },
      body: JSON.stringify({ input: { image: url, enhance_model: 'Standard V2', output_format: 'png', upscale_factor: factor } })
    });
    let d = await r.json();
    // 429 приходит пачкой, когда пускаешь девятнадцать разом — ждём и повторяем
    if (!d.id) {
      if (/throttl/i.test(JSON.stringify(d))) { await new Promise((s) => setTimeout(s, 20000 * (attempt + 1))); continue; }
      throw new Error(JSON.stringify(d).slice(0, 150));
    }
    while (!['succeeded', 'failed', 'canceled'].includes(d.status)) {
      await new Promise((s) => setTimeout(s, 3000));
      d = await (await fetch(d.urls.get, { headers })).json();
    }
    if (d.status !== 'succeeded') throw new Error(`${d.status}: ${String(d.error).slice(0, 110)}`);
    const o = Array.isArray(d.output) ? d.output[0] : d.output;
    return { buf: Buffer.from(await (await fetch(typeof o === 'string' ? o : o.url, { headers })).arrayBuffer()), secs: d.metrics?.predict_time };
  }
  throw new Error('throttled four times');
}

const letterbox = async (buf, dest) => {
  const s = await sharp(buf).resize({ width: W, height: H, fit: 'inside', kernel: 'lanczos3' }).toBuffer();
  await sharp({ create: { width: W, height: H, channels: 3, background: '#000' } })
    .composite([{ input: s, gravity: 'centre' }]).jpeg({ quality: 92 }).toFile(dest);
};

await fs.mkdir(`${OUT}/img`, { recursive: true });
const files = (await fs.readdir(DIR)).filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f)).sort();
const out = {};
let spent = 0;

for (const [i, f] of files.entries()) {
  const id = 'n' + String(i + 1).padStart(2, '0');
  const bigger = path.join(DIR, 'bigger', f);
  const src = await fs.access(bigger).then(() => bigger, () => path.join(DIR, f));
  const usedBigger = src === bigger;
  const b = await busyOf(src);
  const need = W / b.width;
  const pred = b.busy <= THRESHOLD ? 'accept' : 'reject';
  const rec = { id, file: f, src, usedBigger, source: `${b.width}×${b.height}`, busy: +b.busy.toFixed(1), need: +need.toFixed(2), pred };
  try {
    if (need <= 1.02) {                    // ширины уже хватает — модель не нужна
      await letterbox(await fs.readFile(src), `${OUT}/img/${id}.jpg`);
      rec.how = 'no model needed';
      rec.out = `${OUT}/img/${id}.jpg`;
    } else {
      const u = await upload(await sharp(src).png().toBuffer(), id + '.png');
      const g = await topaz(u, need <= 2 ? '2x' : need <= 4 ? '4x' : '6x');
      await letterbox(g.buf, `${OUT}/img/${id}.jpg`);
      rec.how = 'topaz';
      rec.secs = g.secs;
      rec.out = `${OUT}/img/${id}.jpg`;
      spent += 0.05;
    }
    console.log(`  ${id} ${rec.source.padEnd(10)} busy ${String(rec.busy).padStart(5)} → ${pred.padEnd(6)} ×${rec.need}  ${rec.how}${usedBigger ? '  (bigger copy)' : ''}`);
  } catch (e) { rec.error = e.message; console.log(`  ${id} FAILED ${e.message}`); }
  out[id] = rec;
  await fs.writeFile(`${OUT}/results.json`, JSON.stringify(out, null, 2));
}
console.log(`\nspent about $${spent.toFixed(2)}`);
console.log('predicted accept:', Object.values(out).filter((r) => r.pred === 'accept').map((r) => r.id).join(' '));
console.log('predicted reject:', Object.values(out).filter((r) => r.pred === 'reject').map((r) => r.id).join(' '));
