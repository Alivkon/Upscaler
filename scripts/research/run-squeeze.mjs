// Мысль Чарли: раз Real-ESRGAN не берёт больше ~2 Мп — ужать до предела и
// отдать ему ужатое. Он в двадцать пять раз дешевле Topaz и на равных с ним
// по голосам, так что ради этого стоит потерять немного пикселей.
//
// Проверяются обе половины мысли:
//   1) спасает ли ужатие те две картинки, на которых он падал (b4, b6);
//   2) сколько ужатие стоит там, где он и так справлялся (b8) — для этого
//      рядом кладётся его же родной результат без ужатия.
//
// Предел взят не из сообщения об ошибке. Там названо 2 096 704 пикселя, но b6
// при 2 073 600 всё равно упал по памяти видеокарты. Берём 1.2 Мп — размер,
// на котором он в круге 5 отработал (b8, 962×1280).
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const sharp = createRequire('/home/charlie/repos/Upscaler/')('sharp');

const TOKEN = process.env.REPLICATE_API_TOKEN;
const SP = '/tmp/claude-1000/-home-charlie-repos-Upscaler/904c8c30-e059-4ad3-9f52-dd9dbb5f67e7/scratchpad';
const OUT = `${SP}/squeeze`;
const PIX = '/home/charlie/Pictures';
const headers = { Authorization: `Bearer ${TOKEN}` };
const [W, H] = [1440, 3120];
const CAP = 1_200_000;

const PICS = [
  { id: 'b4', file: 'download.png', what: 'green moodboard (small text)' },
  { id: 'b6', file: 'tumblr_d63549dc055dbf77c6f0deeea6daab94_1dbd8416_1280.jpg', what: 'pink slip dress' },
  { id: 'b8', file: 'bfc8913b-2ae7-4f1d-a633-20be3376c8a9.jpeg', what: 'face, indoor light' }
];

async function upload(buf, name) {
  const form = new FormData();
  form.append('content', new Blob([buf], { type: 'image/png' }), name);
  const r = await fetch('https://api.replicate.com/v1/files', { method: 'POST', headers, body: form });
  const d = await r.json();
  if (!d.urls?.get) throw new Error('upload failed');
  return d.urls.get;
}

async function esrgan(url, scale) {
  const r = await fetch('https://api.replicate.com/v1/models/nightmareai/real-esrgan/predictions', {
    method: 'POST', headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'wait=60' },
    body: JSON.stringify({ input: { image: url, scale, face_enhance: false } })
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

const letterbox = async (buf, dest) => {
  const s = await sharp(buf).resize({ width: W, height: H, fit: 'inside', kernel: 'lanczos3' }).toBuffer();
  await sharp({ create: { width: W, height: H, channels: 3, background: '#000' } })
    .composite([{ input: s, gravity: 'centre' }]).jpeg({ quality: 92 }).toFile(dest);
};

await fs.mkdir(`${OUT}/img`, { recursive: true });
const out = {};
for (const p of PICS) {
  const src = path.join(PIX, p.file);
  const m = await sharp(src).metadata();
  const px = m.width * m.height;
  const k = Math.min(1, Math.sqrt(CAP / px));
  const sw = Math.round(m.width * k), sh = Math.round(m.height * k);
  const small = await sharp(src).resize(sw, sh, { kernel: 'lanczos3' }).png().toBuffer();
  console.log(`\n== ${p.id} ${m.width}×${m.height} (${(px / 1e6).toFixed(2)} Mp) → squeezed ${sw}×${sh} (${(sw * sh / 1e6).toFixed(2)} Mp), then ×2 ==`);
  out[p.id] = { what: p.what, source: `${m.width}×${m.height}`, mp: +(px / 1e6).toFixed(2), squeezed: `${sw}×${sh}` };
  try {
    const u = await upload(small, `${p.id}-sq.png`);
    const g = await esrgan(u, 2);
    const gm = await sharp(g.buf).metadata();
    await letterbox(g.buf, `${OUT}/img/${p.id}-squeezed.jpg`);
    out[p.id].squeezedResult = { file: `${OUT}/img/${p.id}-squeezed.jpg`, raw: `${gm.width}×${gm.height}`, secs: g.secs };
    console.log(`  squeezed→esrgan  ${gm.width}×${gm.height}  ${g.secs?.toFixed(1)}s`);
  } catch (e) { out[p.id].squeezedResult = { error: e.message }; console.log('  squeezed→esrgan FAILED:', e.message); }
}
await fs.writeFile(`${OUT}/results.json`, JSON.stringify(out, null, 2));
console.log('\nwrote', `${OUT}/results.json`);
