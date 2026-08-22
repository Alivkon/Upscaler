// Лист круга 11: платный Topaz против трёх бесплатных, которые считались прямо
// в браузере на видеокарте. Буквы новые — KK LL MM NN; те же буквы на каждой
// картинке, значит галочка снова голос.
//
// Порядок букв на каждой картинке сдвигается на единицу: при четырёх вариантах
// и постоянном порядке первый вариант получает лишние голоса просто за то, что
// его видят первым. Буква привязана к способу, так что счёт от сдвига не портится.
import fs from 'node:fs/promises';

const SP = '/tmp/claude-1000/-home-charlie-repos-Upscaler/904c8c30-e059-4ad3-9f52-dd9dbb5f67e7/scratchpad';
const L = `${SP}/local/out`;

const KEY = {
  KK: { what: 'realplksr, браузер', dir: `${L}/realplksr-x4_webgpu`, price: 0 },
  LL: { what: 'Topaz Standard V2, сервер', dir: `${SP}/holdout2/img`, price: 0.05 },
  MM: { what: 'ClearRealityV1, браузер', dir: `${L}/clearreality-x4-fix_webgpu`, price: 0 },
  NN: { what: 'Real-ESRGAN, браузер', dir: `${L}/realesrgan-x4-fix_webgpu`, price: 0 }
};
const LETTERS = Object.keys(KEY);

// Что на картинках — смотрено глазами по контактному листу. Имя файла не
// говорит ничего, на этом уже обжигались в круге 5.
const WHAT = {
  n01: 'misty forest slope', n02: 'koi and lotus', n03: 'cluttered desk',
  n04: 'white outfit, black bag', n05: 'silver tea table', n06: 'painted pink mountains',
  n07: 'black sleeve, red patch', n08: 'winged figure', n09: 'blue room',
  n10: 'sheer top', n11: 'purple satin', n12: 'blonde in a car', n13: 'dark bedroom',
  n14: 'grey town from above', n15: 'knife on a tray', n16: 'neon street at night',
  n17: 'hand, painted nails', n18: 'pink velvet coat', n19: 'anime print'
};

const man = JSON.parse(await fs.readFile(`${SP}/local/manifest.json`, 'utf8'));
await fs.rm(`${SP}/bakeoff/local`, { recursive: true, force: true });
await fs.mkdir(`${SP}/bakeoff/local`, { recursive: true });

const items = [];
for (const [i, p] of man.entries()) {
  if (p.need <= 1.02) continue;              // модель не нужна вовсе — сравнивать нечего
  const have = [];
  for (const letter of LETTERS) {
    const src = `${KEY[letter].dir}/${p.id}.jpg`;
    if (!await fs.access(src).then(() => true, () => false)) continue;
    await fs.copyFile(src, `${SP}/bakeoff/local/${p.id}-${letter}.jpg`);
    have.push(letter);
  }
  if (have.length < 2) { console.log(`  ${p.id}: только ${have.join(',') || 'ничего'} — пропуск`); continue; }
  const shift = items.length % have.length;  // сдвиг порядка, см. шапку
  items.push({ ...p, what: WHAT[p.id] || p.id, have: [...have.slice(shift), ...have.slice(0, shift)] });
}

const slides = items.map((it, wi) => it.have.map((letter, li) => `<section class="s${li === 0 ? ' first' : ''}" data-key="${it.id}#${letter}">
  <img data-crop="local/${it.id}-${letter}.jpg" alt="" decoding="async">
  <div class="tag"><b>${letter}</b> ${it.what} <i>${it.w}×${it.h} → ×${it.need}</i></div>
  <div class="cap"><b>${it.what}</b><span>${it.w}×${it.h} · picture ${wi + 1} of ${items.length}</span></div>
  <button class="tick" aria-label="sharp enough"></button>
</section>`).join('')).join('');

const shell = await fs.readFile(`${SP}/bakeoff/phone.html`, 'utf8');
const html = shell
  .replace(/<main id="feed">[\s\S]*?<\/main>/, `<main id="feed">${slides}</main>`)
  .replace('<title>which upscale — phone</title>', '<title>free in your browser vs paid</title>')
  .replace(/pick-upscale-seen-v1/g, 'pick-local-seen-v1')
  .replace(/pick-upscale-v1/g, 'pick-local-v1')
  .replace(/<h3><span id="k2">0<\/span>[^<]*<\/h3>/, `<h3><span id="k2">0</span> ticked over ${items.length} pictures</h3>`)
  .replace(/<p class="note">[\s\S]*?<span id="diag">/, `<p class="note">Same question as last time: <b>is this sharp enough</b> — you picked the pictures, so the subject is already yours.
    Four versions of each, four letters, same letters everywhere. One of them costs 5 cents a picture and three of them cost nothing at all.
    Black above and below is the picture ending, not a fault. 1:1 shows real pixels.<br>
    <span id="diag">`);
await fs.writeFile(`${SP}/bakeoff/local.html`, html);
await fs.writeFile(`${SP}/local/KEY.json`, JSON.stringify({ byLetter: KEY }, null, 2));
console.log(`local.html: ${items.length} pictures × ${LETTERS.length} = ${items.reduce((n, i) => n + i.have.length, 0)} slides`);
