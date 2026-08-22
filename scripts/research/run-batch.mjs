// Круг 5: не «какая модель лучше на этой картинке», а КАКАЯ ЧАЩЕ ВСЕГО.
// Восемь картинок разного рода — рисунок, ткань, платье, коллаж с мелким
// текстом, ночной портрет, туманный лес, ботинки, лицо — и один и тот же
// набор способов на каждой. Победитель определяется счётом, а не вкусом
// к одной картинке: на трёх картинках выигрывал то один, то другой.
//
// Целиком, без кропа: кадр 9:19.5, снятый ДО увеличения, срезал слова.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const sharp = createRequire('/home/charlie/repos/Upscaler/')('sharp');

const TOKEN = process.env.REPLICATE_API_TOKEN;
const SP = '/tmp/claude-1000/-home-charlie-repos-Upscaler/904c8c30-e059-4ad3-9f52-dd9dbb5f67e7/scratchpad';
const OUT = `${SP}/batch`;
const PIX = '/home/charlie/Pictures';
const headers = { Authorization: `Bearer ${TOKEN}` };
const SCREEN = [1440, 3120];

const PHOTOS = [
  { id: 'b1', file: '48c94fae21696452acd469d6fd655d12.jpg', what: 'pagoda waterfall (drawn)' },
  { id: 'b2', file: '994f60e94df91b9cd9180a7af98055a5.jpg', what: 'grey draped coat' },
  { id: 'b3', file: 'bb498ccf97421e44dee843cbe6c3a5bc.jpg', what: 'slouch boots' },
  { id: 'b4', file: 'download.png', what: 'green moodboard (small text)' },
  { id: 'b5', file: 'tumblr_4d4ea5f2f1138fc56b801b3c6b803433_c065152f_540.jpg', what: 'pink slip dress' },
  { id: 'b6', file: 'tumblr_d63549dc055dbf77c6f0deeea6daab94_1dbd8416_1280.jpg', what: 'subway platform, night' },
  { id: 'b7', file: 'tumblr_02ca27a3ea8b435a9b9435a25907a1f5_06ecfcee_640.png', what: 'misty forest tree' },
  { id: 'b8', file: 'bfc8913b-2ae7-4f1d-a633-20be3376c8a9.jpeg', what: 'face, indoor light' }
];

const NANO_PROMPT = 'Upscale this exact image to high resolution. Keep every element, ' +
  'colour and composition exactly as it is — do not add, remove, move or restyle anything. ' +
  'Recover fine detail and texture, remove JPEG compression artefacts and blur.';

const METHODS = {
  lanczos: { local: true },
  esrgan: { model: 'nightmareai/real-esrgan',
            input: (u, need) => ({ image: u, scale: need <= 2 ? 2 : 4, face_enhance: false }) },
  clarity: { version: 'dfad41707589d68ecdccd1dfa600d55a208f9310748e44bfe35b4a6291453d5e',
             input: (u, need) => ({ image: u, scale_factor: Math.min(4, Math.max(2, Math.ceil(need))),
                                    creativity: 0.35, resemblance: 0.6, output_format: 'png' }) },
  topaz: { model: 'topazlabs/image-upscale',
           input: (u, need) => ({ image: u, enhance_model: 'Standard V2', output_format: 'png',
                                  upscale_factor: need <= 2 ? '2x' : need <= 4 ? '4x' : '6x' }) },
  nano: { model: 'google/nano-banana-pro',
          input: (u) => ({ prompt: NANO_PROMPT, image_input: [u], resolution: '4K',
                           aspect_ratio: 'match_input_image', output_format: 'jpg' }) }
};

async function upload(buf, name) {
  const form = new FormData();
  form.append('content', new Blob([buf], { type: 'image/png' }), name);
  const r = await fetch('https://api.replicate.com/v1/files', { method: 'POST', headers, body: form });
  const d = await r.json();
  if (!d.urls?.get) throw new Error('upload failed: ' + JSON.stringify(d).slice(0, 160));
  return d.urls.get;
}

async function run(m, input) {
  const url = m.version ? 'https://api.replicate.com/v1/predictions'
                        : `https://api.replicate.com/v1/models/${m.model}/predictions`;
  const body = m.version ? { version: m.version, input } : { input };
  const r = await fetch(url, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'wait=60' }, body: JSON.stringify(body) });
  let d = await r.json();
  if (!d.id) throw new Error(JSON.stringify(d).slice(0, 220));
  while (!['succeeded', 'failed', 'canceled'].includes(d.status)) {
    await new Promise((res) => setTimeout(res, 3000));
    d = await (await fetch(d.urls.get, { headers })).json();
  }
  if (d.status !== 'succeeded') throw new Error(`${d.status}: ${String(d.error).slice(0, 160)}`);
  const o = Array.isArray(d.output) ? d.output[0] : d.output;
  return { url: typeof o === 'string' ? o : o.url, secs: d.metrics?.predict_time };
}

// Один и тот же кадр для всех: вписать по ширине телефона, чёрное сверху/снизу.
async function frame(buf, dest) {
  const scaled = await sharp(buf).resize({ width: SCREEN[0], height: SCREEN[1], fit: 'inside', kernel: 'lanczos3' }).toBuffer();
  await sharp({ create: { width: SCREEN[0], height: SCREEN[1], channels: 3, background: '#000' } })
    .composite([{ input: scaled, gravity: 'centre' }]).jpeg({ quality: 92 }).toFile(dest);
}

await fs.mkdir(`${OUT}/img`, { recursive: true });
const results = {};

for (const p of PHOTOS) {
  const src = path.join(PIX, p.file);
  const m = await sharp(src).metadata();
  const need = SCREEN[0] / m.width;
  const buf0 = await sharp(src).png().toBuffer();
  const url = await upload(buf0, p.id + '.png');
  console.log(`\n== ${p.id} ${p.what} ${m.width}×${m.height}, need ×${need.toFixed(2)} ==`);
  results[p.id] = { file: p.file, what: p.what, source: `${m.width}×${m.height}`, need: +need.toFixed(2), variants: {} };

  await Promise.all(Object.entries(METHODS).map(async ([id, meth]) => {
    const t0 = Date.now();
    const dest = `${OUT}/img/${p.id}-${id}.jpg`;
    try {
      if (meth.local) {
        await frame(buf0, dest);
        results[p.id].variants[id] = { file: dest, raw: `${m.width}×${m.height}`, secs: 0 };
        console.log(`  ${id.padEnd(9)} local`);
        return;
      }
      const got = await run(meth, meth.input(url, need));
      const buf = Buffer.from(await (await fetch(got.url, { headers })).arrayBuffer());
      const gm = await sharp(buf).metadata();
      await frame(buf, dest);
      results[p.id].variants[id] = { file: dest, raw: `${gm.width}×${gm.height}`, secs: got.secs };
      console.log(`  ${id.padEnd(9)} ${gm.width}×${gm.height}  ${Math.round((Date.now() - t0) / 1000)}s`);
    } catch (e) {
      console.log(`  ${id.padEnd(9)} FAILED: ${e.message}`);
      results[p.id].variants[id] = { error: e.message };
    }
  }));
  await fs.writeFile(`${OUT}/results.json`, JSON.stringify(results, null, 2));
}
console.log('\nwrote', `${OUT}/results.json`);
