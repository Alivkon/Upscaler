// Прототип: у загруженного файла спросить, нет ли его самого — но крупнее.
//
// ПОЧЕМУ ЭТО РАБОТАЕТ БЕЗ ССЫЛКИ. Браузер сохраняет файл под именем, которое дал
// хост, а у Pinterest, Twitter и Reddit имя — это адрес: хэш пина, ключ медиа,
// id поста. Из имени собирается ссылка на самую крупную копию.
//
// ЧЕГО ЭТО НЕ УМЕЕТ. Если имя переписано («IMG_2035.jpg», «скачанное (3).jpg»),
// метод не говорит ничего — это «неизвестно», а не «крупнее нет».
//
// ПРОВЕРКА ОБЯЗАТЕЛЬНА. Хост по чужому хэшу может отдать другую картинку или
// заглушку, поэтому кандидат принимается, только если он ТА ЖЕ картинка:
// та же пропорция ±3% и совпадающий перцептивный хэш.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const sharp = createRequire('/home/charlie/repos/Upscaler/')('sharp');

const UA = { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36' };
const EXT = ['jpg', 'png', 'webp', 'gif'];

// ---- откуда пришёл файл: по имени ----
export function candidates(name) {
  const base = path.basename(name);
  const stem = base.replace(/\.[a-z0-9]+$/i, '');
  const out = [];

  // Pinterest: имя файла — 32 шестнадцатеричных знака, путь строится из первых шести.
  const pin = stem.match(/^([0-9a-f]{32})$/i);
  if (pin) {
    const h = pin[1];
    for (const e of EXT) out.push({ host: 'pinterest', size: 'originals',
      url: `https://i.pinimg.com/originals/${h.slice(0, 2)}/${h.slice(2, 4)}/${h.slice(4, 6)}/${h}.${e}` });
    for (const s of ['1200x', '736x']) for (const e of ['jpg', 'png'])
      out.push({ host: 'pinterest', size: s,
        url: `https://i.pinimg.com/${s}/${h.slice(0, 2)}/${h.slice(2, 4)}/${h.slice(4, 6)}/${h}.${e}` });
  }

  // Twitter/X: ключ медиа — 15 знаков base64url, размер задаётся параметром name.
  const tw = stem.match(/^([A-Za-z0-9_-]{15})$/);
  if (tw) for (const s of ['orig', '4096x4096', 'large'])
    out.push({ host: 'twitter', size: s, url: `https://pbs.twimg.com/media/${tw[1]}?format=jpg&name=${s}` });

  // Reddit: «название-поста-v0-<id>.webp» — id и есть адрес на i.redd.it.
  const rd = stem.match(/(?:^|-)(?:v0-)?([a-z0-9]{13,})$/i);
  if (rd) {
    for (const e of EXT) out.push({ host: 'reddit', size: 'i.redd.it', url: `https://i.redd.it/${rd[1]}.${e}` });
    for (const e of EXT) out.push({ host: 'reddit', size: 'preview', url: `https://preview.redd.it/${rd[1]}.${e}?width=4096` });
  }

  // Imgur: у превью к id приписана буква размера — её надо снять.
  const im = stem.match(/^([A-Za-z0-9]{7})[bhlmst]?$/);
  if (im) for (const e of EXT) out.push({ host: 'imgur', size: 'full', url: `https://i.imgur.com/${im[1]}.${e}` });

  // Wikimedia: в адресе миниатюры лежит адрес оригинала.
  if (/\/thumb\//.test(name)) out.push({ host: 'wikimedia', size: 'original',
    url: name.replace('/thumb/', '/').replace(/\/[^/]*$/, '') });

  return out;
}

// Перцептивный хэш: та ли это картинка вообще. 64 бита разностей яркости.
async function dhash(buf) {
  const { data } = await sharp(buf).greyscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });
  let bits = '';
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += data[y * 9 + x] < data[y * 9 + x + 1] ? '1' : '0';
  return bits;
}
const distance = (a, b) => [...a].reduce((n, c, i) => n + (c !== b[i] ? 1 : 0), 0);

async function tryUrl(url) {
  try {
    const r = await fetch(url, { headers: UA, redirect: 'follow' });
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    const m = await sharp(buf).metadata();
    if (!m.width) return null;
    return { buf, width: m.width, height: m.height, bytes: buf.length };
  } catch { return null; }
}

export async function findBigger(file, { verbose = true } = {}) {
  const mine = await sharp(file).metadata();
  const myHash = await dhash(await fs.readFile(file));
  const myAR = mine.width / mine.height;
  const tried = [];
  let best = null;

  for (const c of candidates(file)) {
    const got = await tryUrl(c.url);
    if (!got) { tried.push({ ...c, verdict: 'no answer' }); continue; }
    const ar = got.width / got.height;
    if (Math.abs(ar - myAR) / myAR > 0.03) { tried.push({ ...c, verdict: `other shape ${got.width}×${got.height}` }); continue; }
    const d = distance(myHash, await dhash(got.buf));
    if (d > 10) { tried.push({ ...c, verdict: `other picture (hash ${d})` }); continue; }
    const gain = got.width / mine.width;
    tried.push({ ...c, verdict: `${got.width}×${got.height} · ×${gain.toFixed(2)} · hash ${d}` });
    if (gain > 1.01 && (!best || got.width > best.width)) best = { ...c, ...got, gain, hash: d };
  }

  if (verbose) {
    console.log(`\n${path.basename(file)}  ${mine.width}×${mine.height}`);
    if (!tried.length) console.log('  имя ничего не говорит об источнике — «неизвестно», а не «крупнее нет»');
    for (const t of tried) console.log(`  ${t.host}/${t.size}`.padEnd(28), t.verdict);
    console.log(best ? `  ⇒ крупнее: ${best.width}×${best.height} (×${best.gain.toFixed(2)}) ${best.url}`
                     : '  ⇒ крупнее не нашлось');
  }
  return { source: mine, best, tried };
}

// CLI: node findoriginal.mjs <файл|папка> ...
const args = process.argv.slice(2);
if (args.length) {
  const files = [];
  for (const a of args) {
    const st = await fs.stat(a);
    if (st.isDirectory()) for (const f of await fs.readdir(a)) {
      if (/\.(jpe?g|png|webp|gif)$/i.test(f)) files.push(path.join(a, f));
    } else files.push(a);
  }
  let won = 0, saved = [];
  for (const f of files) {
    const r = await findBigger(f);
    if (r.best) {
      won++;
      const out = `${path.dirname(f)}/bigger/${path.basename(f)}`;
      await fs.mkdir(path.dirname(out), { recursive: true });
      await fs.writeFile(out, r.best.buf);
      saved.push(`${path.basename(f)} → ${r.best.width}×${r.best.height}`);
    }
  }
  console.log(`\n${won} of ${files.length} had a bigger copy`);
  for (const s of saved) console.log('  ' + s);
}
