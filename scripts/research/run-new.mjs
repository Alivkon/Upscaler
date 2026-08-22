// Платная ветка для проверочного набора: те же тринадцать картинок, что считает
// браузер, но через Topaz Standard V2. Нужна не сама по себе, а чтобы было с чем
// сравнить бесплатную и проверить правило «занятость выше 30% — платить».
//
// Источник берётся из манифеста браузерной ветки, а не собирается заново: иначе
// платное и бесплатное сравнивались бы на разных картинках.
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
const sharp = createRequire('/home/charlie/repos/Upscaler/')('sharp');

const TOKEN = process.env.REPLICATE_API_TOKEN;
const SP = '/tmp/claude-1000/-home-charlie-repos-Upscaler/904c8c30-e059-4ad3-9f52-dd9dbb5f67e7/scratchpad';
const OUT = `${SP}/newset`;
const headers = { Authorization: `Bearer ${TOKEN}` };
const [W, H] = [1440, 3120];
const THRESHOLD = 30;   // проверяемое правило круга 11, а не снятая мера мелкости

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
    // 429 приходит пачкой, когда пускаешь много разом — ждём и повторяем
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
const man = JSON.parse(await fs.readFile(`${SP}/local/manifest-new.json`, 'utf8'));
const out = JSON.parse(await fs.readFile(`${OUT}/results.json`, 'utf8').catch(() => '{}'));
let spent = 0;

for (const p of man) {
  const id = p.id;
  if (out[id] && !out[id].error) { console.log(`  ${id} уже есть`); continue; }
  const src = `${SP}/local/${p.url}`;
  const rec = { id, file: p.file, src, usedBigger: p.usedBigger, source: `${p.w}×${p.h}`,
                busy: p.busy, need: p.need, pred: p.busy <= THRESHOLD ? 'free' : 'paid' };
  try {
    if (p.need <= 1.02) {                    // ширины уже хватает — модель не нужна
      await letterbox(await fs.readFile(src), `${OUT}/img/${id}.jpg`);
      rec.how = 'no model needed';
    } else {
      const u = await upload(await sharp(src).png().toBuffer(), id + '.png');
      const g = await topaz(u, p.need <= 2 ? '2x' : p.need <= 4 ? '4x' : '6x');
      await letterbox(g.buf, `${OUT}/img/${id}.jpg`);
      rec.how = 'topaz';
      rec.secs = g.secs;
      spent += 0.05;
    }
    rec.out = `${OUT}/img/${id}.jpg`;
    console.log(`  ${id} ${rec.source.padEnd(10)} занятость ${String(rec.busy).padStart(5)} → ${rec.pred.padEnd(5)} ×${p.need}  ${rec.how}`);
  } catch (e) { rec.error = e.message; console.log(`  ${id} УПАЛО ${e.message}`); }
  out[id] = rec;
  await fs.writeFile(`${OUT}/results.json`, JSON.stringify(out, null, 2));
}
console.log(`\nпотрачено около $${spent.toFixed(2)}`);
