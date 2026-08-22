// Одна модель на всём, что мы трогали за день: годится ли Clarity как
// единственная. У неё 4 голоса из 8 против 5 у Topaz — но втрое дешевле,
// и она единственная, кто не спотыкался о размер.
//
// Восемь стоячих у неё уже посчитаны в круге 5 (целиком, с полями). Здесь
// добираются пять лежачих — тем же приёмом, что и в круге 7 (вырезать полосу
// 9:19.5, потом растянуть), иначе сравнивать их с Topaz будет нечестно.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const sharp = createRequire('/home/charlie/repos/Upscaler/')('sharp');

const TOKEN = process.env.REPLICATE_API_TOKEN;
const SP = '/tmp/claude-1000/-home-charlie-repos-Upscaler/904c8c30-e059-4ad3-9f52-dd9dbb5f67e7/scratchpad';
const OUT = `${SP}/clarity-all`;
const PIX = '/home/charlie/Pictures';
const headers = { Authorization: `Bearer ${TOKEN}` };
const [W, H] = [1440, 3120];
const VERSION = 'dfad41707589d68ecdccd1dfa600d55a208f9310748e44bfe35b4a6291453d5e';

const WIDES = [
  { id: 'w1', file: '44d2d000b13edb8acbd7fde2cfe76889.jpg', what: 'blossom in mist' },
  { id: 'w2', file: 'd8b8cad42df21c39a72aeb68d7646050.jpg', what: 'mossy river' },
  { id: 'w3', file: 'daf1c4d1775c6670a55c434bbadd8442.jpg', what: 'waterfall in pines' },
  { id: 'w4', file: 'tumblr_5e0502fbcce4e846adceffd5cf1d1643_136afd36_1280.jpg', what: 'leather + gold charms' },
  { id: 'w5', file: 'horizontal.jpg', what: 'dark arch' }
];

async function upload(buf, name) {
  const form = new FormData();
  form.append('content', new Blob([buf], { type: 'image/png' }), name);
  const r = await fetch('https://api.replicate.com/v1/files', { method: 'POST', headers, body: form });
  const d = await r.json();
  if (!d.urls?.get) throw new Error('upload failed');
  return d.urls.get;
}

async function clarity(url, scale) {
  const r = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST', headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'wait=60' },
    body: JSON.stringify({ version: VERSION, input: { image: url, scale_factor: scale, creativity: 0.35, resemblance: 0.6, output_format: 'png' } })
  });
  let d = await r.json();
  if (!d.id) throw new Error(JSON.stringify(d).slice(0, 200));
  while (!['succeeded', 'failed', 'canceled'].includes(d.status)) {
    await new Promise((res) => setTimeout(res, 3000));
    d = await (await fetch(d.urls.get, { headers })).json();
  }
  if (d.status !== 'succeeded') throw new Error(`${d.status}: ${String(d.error).slice(0, 120)}`);
  const o = Array.isArray(d.output) ? d.output[0] : d.output;
  return { buf: Buffer.from(await (await fetch(typeof o === 'string' ? o : o.url, { headers })).arrayBuffer()), secs: d.metrics?.predict_time };
}

await fs.mkdir(`${OUT}/img`, { recursive: true });
const out = {};
await Promise.all(WIDES.map(async (p) => {
  const src = path.join(PIX, p.file);
  const m = await sharp(src).metadata();
  const w = Math.min(m.width, Math.round(m.height * W / H));
  const h = Math.min(m.height, Math.round(w * H / W));
  const need = W / w;
  const crop = await sharp(src).extract({ left: Math.round((m.width - w) / 2), top: Math.round((m.height - h) / 2), width: w, height: h }).png().toBuffer();
  try {
    const url = await upload(crop, p.id + '-crop.png');
    const g = await clarity(url, Math.min(4, Math.max(2, Math.ceil(need))));
    await sharp(g.buf).resize(W, H, { fit: 'cover', kernel: 'lanczos3' }).jpeg({ quality: 92 }).toFile(`${OUT}/img/${p.id}.jpg`);
    out[p.id] = { what: p.what, source: `${m.width}×${m.height}`, need: +need.toFixed(2), file: `${OUT}/img/${p.id}.jpg`, secs: g.secs };
    console.log(`  ${p.id} ${p.what.padEnd(22)} ${m.width}×${m.height} → ×${need.toFixed(2)}  ${g.secs?.toFixed(1)}s`);
  } catch (e) { out[p.id] = { what: p.what, error: e.message }; console.log(`  ${p.id} FAILED ${e.message}`); }
}));
await fs.writeFile(`${OUT}/results.json`, JSON.stringify(out, null, 2));
console.log('wrote', `${OUT}/results.json`);
