// Проверка правила, а не вкуса. Чарли предложил «брать только стоячие картинки».
// Правило дешёвое и, кажется, верное — но выведено из ОДНОЙ лежачей картинки.
// А самая любимая из восьми (ботинки, 4 голоса) сама шире, чем выше: 804×739.
// Значит дело может быть не в пропорции, а в том, что у долины кроп срезает
// composition, а у ботинок — пустой фон.
//
// Здесь по одному варианту на картинку (лучший из круга 5: вырезать полосу
// 9:19.5, потом растянуть). Вопрос двоичный: пошло бы это в обои или нет.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const sharp = createRequire('/home/charlie/repos/Upscaler/')('sharp');

const TOKEN = process.env.REPLICATE_API_TOKEN;
const SP = '/tmp/claude-1000/-home-charlie-repos-Upscaler/904c8c30-e059-4ad3-9f52-dd9dbb5f67e7/scratchpad';
const OUT = `${SP}/wide`;
const PIX = '/home/charlie/Pictures';
const headers = { Authorization: `Bearer ${TOKEN}` };
const [W, H] = [1440, 3120];

const PICS = [
  { id: 'w1', file: '44d2d000b13edb8acbd7fde2cfe76889.jpg', what: 'blossom in mist' },
  { id: 'w2', file: 'd8b8cad42df21c39a72aeb68d7646050.jpg', what: 'waterfall in pines' },
  { id: 'w3', file: 'daf1c4d1775c6670a55c434bbadd8442.jpg', what: 'river over rocks' },
  { id: 'w4', file: 'tumblr_5e0502fbcce4e846adceffd5cf1d1643_136afd36_1280.jpg', what: 'foggy trees, pink flowers' },
  { id: 'w5', file: 'horizontal.jpg', what: 'wide 16:9' },
  { id: 'w6', file: 'bb498ccf97421e44dee843cbe6c3a5bc.jpg', what: 'slouch boots (your favourite, cropped)' }
];

async function upload(buf, name) {
  const form = new FormData();
  form.append('content', new Blob([buf], { type: 'image/png' }), name);
  const r = await fetch('https://api.replicate.com/v1/files', { method: 'POST', headers, body: form });
  const d = await r.json();
  if (!d.urls?.get) throw new Error('upload failed');
  return d.urls.get;
}

async function topaz(url, factor) {
  const r = await fetch('https://api.replicate.com/v1/models/topazlabs/image-upscale/predictions', {
    method: 'POST', headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'wait=60' },
    body: JSON.stringify({ input: { image: url, enhance_model: 'Standard V2', output_format: 'png', upscale_factor: factor } })
  });
  let d = await r.json();
  if (!d.id) throw new Error(JSON.stringify(d).slice(0, 200));
  while (!['succeeded', 'failed', 'canceled'].includes(d.status)) {
    await new Promise((res) => setTimeout(res, 3000));
    d = await (await fetch(d.urls.get, { headers })).json();
  }
  if (d.status !== 'succeeded') throw new Error(`${d.status}: ${String(d.error).slice(0, 140)}`);
  const o = Array.isArray(d.output) ? d.output[0] : d.output;
  return Buffer.from(await (await fetch(typeof o === 'string' ? o : o.url, { headers })).arrayBuffer());
}

await fs.mkdir(`${OUT}/img`, { recursive: true });
const out = {};
await Promise.all(PICS.map(async (p) => {
  const src = path.join(PIX, p.file);
  const m = await sharp(src).metadata();
  // Полоса, которая реально попадёт на экран, и во сколько раз её тянуть.
  const w = Math.min(m.width, Math.round(m.height * W / H));
  const h = Math.min(m.height, Math.round(w * H / W));
  const need = W / w;
  const crop = await sharp(src).extract({ left: Math.round((m.width - w) / 2), top: Math.round((m.height - h) / 2), width: w, height: h }).png().toBuffer();
  try {
    const url = await upload(crop, p.id + '.png');
    const big = await topaz(url, need <= 2 ? '2x' : need <= 4 ? '4x' : '6x');
    await sharp(big).resize(W, H, { fit: 'cover', kernel: 'lanczos3' }).jpeg({ quality: 92 }).toFile(`${OUT}/img/${p.id}.jpg`);
    out[p.id] = { what: p.what, source: `${m.width}×${m.height}`, ar: +(m.width / m.height).toFixed(2), slice: `${w}×${h}`, need: +need.toFixed(2), file: `${OUT}/img/${p.id}.jpg` };
    console.log(`  ${p.id} ${p.what.padEnd(34)} ${m.width}×${m.height} → slice ${w}×${h} ×${need.toFixed(2)}`);
  } catch (e) { out[p.id] = { what: p.what, error: e.message }; console.log(`  ${p.id} FAILED ${e.message}`); }
}));
await fs.writeFile(`${OUT}/results.json`, JSON.stringify(out, null, 2));
console.log('wrote', `${OUT}/results.json`);
