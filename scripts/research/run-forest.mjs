// Круг 6: одна картинка, на которой проиграли ВСЕ — туманный лес 640×480.
//
// Дело не в модели. Картинка лежачая, а экран стоячий: чтобы заполнить
// 1440×3120, из неё надо вырезать полосу 9:19.5 — а это всего 222×480 пикселей
// оригинала, то есть тянуть надо ×6.5, а не ×2.25. Отсюда и «недостаточно чётко».
//
// Поэтому здесь проверяется не «кто лучше увеличивает», а ЧЕМ ЗАПОЛНИТЬ ЭКРАН:
// резать до увеличения, резать после, тянуть в два приёма или дорисовать бока.
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
const sharp = createRequire('/home/charlie/repos/Upscaler/')('sharp');

const TOKEN = process.env.REPLICATE_API_TOKEN;
const SP = '/tmp/claude-1000/-home-charlie-repos-Upscaler/904c8c30-e059-4ad3-9f52-dd9dbb5f67e7/scratchpad';
const OUT = `${SP}/forest`;
const SRC = '/home/charlie/Pictures/tumblr_02ca27a3ea8b435a9b9435a25907a1f5_06ecfcee_640.png';
const headers = { Authorization: `Bearer ${TOKEN}` };
const [W, H] = [1440, 3120];

const CLARITY = 'dfad41707589d68ecdccd1dfa600d55a208f9310748e44bfe35b4a6291453d5e';

async function upload(buf, name) {
  const form = new FormData();
  form.append('content', new Blob([buf], { type: 'image/png' }), name);
  const r = await fetch('https://api.replicate.com/v1/files', { method: 'POST', headers, body: form });
  const d = await r.json();
  if (!d.urls?.get) throw new Error('upload failed');
  return d.urls.get;
}

async function run(m, input) {
  const url = m.version ? 'https://api.replicate.com/v1/predictions'
                        : `https://api.replicate.com/v1/models/${m.model}/predictions`;
  const body = m.version ? { version: m.version, input } : { input };
  const r = await fetch(url, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'wait=60' }, body: JSON.stringify(body) });
  let d = await r.json();
  if (!d.id) throw new Error(JSON.stringify(d).slice(0, 200));
  while (!['succeeded', 'failed', 'canceled'].includes(d.status)) {
    await new Promise((res) => setTimeout(res, 3000));
    d = await (await fetch(d.urls.get, { headers })).json();
  }
  if (d.status !== 'succeeded') throw new Error(`${d.status}: ${String(d.error).slice(0, 140)}`);
  const o = Array.isArray(d.output) ? d.output[0] : d.output;
  return { buf: Buffer.from(await (await fetch(typeof o === 'string' ? o : o.url, { headers })).arrayBuffer()), secs: d.metrics?.predict_time };
}

const topaz = (u, f) => run({ model: 'topazlabs/image-upscale' },
  { image: u, enhance_model: 'Standard V2', output_format: 'png', upscale_factor: f });
const clarity = (u, s) => run({ version: CLARITY },
  { image: u, scale_factor: s, creativity: 0.35, resemblance: 0.6, output_format: 'png' });
const nano = (u, prompt, ar) => run({ model: 'google/nano-banana-pro' },
  { prompt, image_input: [u], resolution: '4K', aspect_ratio: ar, output_format: 'jpg' });

// Полоса 9:19.5 из середины — то, что реально попадёт на экран.
async function cropPhone(buf) {
  const m = await sharp(buf).metadata();
  const w = Math.min(m.width, Math.round(m.height * W / H));
  const h = Math.min(m.height, Math.round(w * H / W));
  return sharp(buf).extract({ left: Math.round((m.width - w) / 2), top: Math.round((m.height - h) / 2), width: w, height: h }).png().toBuffer();
}
const fill = (buf, dest) => sharp(buf).resize(W, H, { fit: 'cover', kernel: 'lanczos3' }).jpeg({ quality: 92 }).toFile(dest);
const letterbox = async (buf, dest) => {
  const s = await sharp(buf).resize({ width: W, height: H, fit: 'inside', kernel: 'lanczos3' }).toBuffer();
  await sharp({ create: { width: W, height: H, channels: 3, background: '#000' } })
    .composite([{ input: s, gravity: 'centre' }]).jpeg({ quality: 92 }).toFile(dest);
};

await fs.mkdir(`${OUT}/img`, { recursive: true });
const src = await sharp(SRC).png().toBuffer();
const meta = await sharp(src).metadata();
const cropped = await cropPhone(src);
const cm = await sharp(cropped).metadata();
console.log(`source ${meta.width}×${meta.height}; phone slice ${cm.width}×${cm.height} → needs ×${(W / cm.width).toFixed(2)}`);

const urlWhole = await upload(src, 'forest.png');
const urlCrop = await upload(cropped, 'forest-crop.png');

const VARIANTS = {
  // Режем сначала: модель тратит все силы на ту полосу, что видно.
  'crop-topaz6': async () => fill((await topaz(urlCrop, '6x')).buf, `${OUT}/img/crop-topaz6.jpg`),
  'crop-clarity4': async () => fill((await clarity(urlCrop, 4)).buf, `${OUT}/img/crop-clarity4.jpg`),
  // Режем потом: модель видит всю картину, но половину работы выбрасываем.
  'topaz4-crop': async () => fill(await cropPhone((await topaz(urlWhole, '4x')).buf), `${OUT}/img/topaz4-crop.jpg`),
  // В два приёма: сначала вытянуть, потом добрать по вырезанной полосе.
  'two-pass': async () => {
    const big = await cropPhone((await topaz(urlWhole, '4x')).buf);
    const u = await upload(big, 'forest-2p.png');
    return fill((await clarity(u, 2)).buf, `${OUT}/img/two-pass.jpg`);
  },
  // Не резать вовсе, а дорисовать бока до стоячего кадра — это уже не апскейл.
  'outpaint': async () => {
    const g = await nano(urlWhole,
      'Extend this photograph vertically into a tall 9:16 portrait wallpaper. Keep the existing ' +
      'image untouched in the middle and continue the same misty forest scene naturally above and below. ' +
      'Match the light, fog, colour and grain exactly. Do not change or restyle what is already there.', '9:16');
    return fill(g.buf, `${OUT}/img/outpaint.jpg`);
  },
  // Якорь: как оно выглядело в прошлом круге — целиком, с чёрными полями.
  'whole-topaz': async () => letterbox((await topaz(urlWhole, '4x')).buf, `${OUT}/img/whole-topaz.jpg`)
};

const done = {};
await Promise.all(Object.entries(VARIANTS).map(async ([id, fn]) => {
  const t0 = Date.now();
  try { await fn(); done[id] = { file: `${OUT}/img/${id}.jpg` }; console.log(`  ${id.padEnd(14)} ok ${Math.round((Date.now() - t0) / 1000)}s`); }
  catch (e) { done[id] = { error: e.message }; console.log(`  ${id.padEnd(14)} FAILED: ${e.message}`); }
}));
await fs.writeFile(`${OUT}/results.json`, JSON.stringify({ source: `${meta.width}×${meta.height}`, slice: `${cm.width}×${cm.height}`, done }, null, 2));
console.log('wrote', `${OUT}/results.json`);
