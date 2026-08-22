// Лист проверочного круга: только два способа — бесплатный в браузере и платный
// на сервере. Буквы PP и QQ, раньше не встречались. Порядок на каждой картинке
// меняется местами, чтобы первое место не собирало голоса само по себе.
//
// Картинки — те тринадцать из папки new, которым модель вообще нужна. Три
// (m08, m12, m14) уже пришли достаточно широкими после поиска копии крупнее,
// сравнивать там нечего.
import fs from 'node:fs/promises';

const SP = '/tmp/claude-1000/-home-charlie-repos-Upscaler/904c8c30-e059-4ad3-9f52-dd9dbb5f67e7/scratchpad';

const KEY = {
  PP: { what: 'ClearRealityV1, браузер', dir: `${SP}/local/out/clearreality-x4-fix_webgpu_new`, price: 0 },
  QQ: { what: 'Topaz Standard V2, сервер', dir: `${SP}/newset/img`, price: 0.05 }
};
const LETTERS = Object.keys(KEY);

// Что на картинках — смотрено глазами по контактному листу.
const WHAT = {
  m01: 'japanese room, painted mural', m02: 'cabinet in a pale room', m03: 'crane on a painted scroll',
  m04: 'gold ring, blue stone', m05: 'gold star ring', m06: 'white shirt, black trousers',
  m07: 'black drape, gold chains', m09: 'sunroom with chandelier', m10: 'green pillow with lace',
  m11: 'crumpled olive linen', m13: 'grey outfit, wisteria', m16: 'olive coat on a street',
  m17: 'black sleeve, hand strap'
};

const man = JSON.parse(await fs.readFile(`${SP}/local/manifest-new.json`, 'utf8'));
await fs.rm(`${SP}/bakeoff/newset`, { recursive: true, force: true });
await fs.mkdir(`${SP}/bakeoff/newset`, { recursive: true });

const items = [];
for (const p of man) {
  if (p.need <= 1.02) continue;
  const have = [];
  for (const letter of LETTERS) {
    const src = `${KEY[letter].dir}/${p.id}.jpg`;
    if (!await fs.access(src).then(() => true, () => false)) continue;
    await fs.copyFile(src, `${SP}/bakeoff/newset/${p.id}-${letter}.jpg`);
    have.push(letter);
  }
  if (have.length < 2) { console.log(`  ${p.id}: только ${have.join(',') || 'ничего'} — пропуск`); continue; }
  const shift = items.length % have.length;
  items.push({ ...p, what: WHAT[p.id] || p.id, have: [...have.slice(shift), ...have.slice(0, shift)] });
}

const slides = items.map((it, wi) => it.have.map((letter, li) => `<section class="s${li === 0 ? ' first' : ''}" data-key="${it.id}#${letter}">
  <img data-crop="newset/${it.id}-${letter}.jpg" alt="" decoding="async">
  <div class="tag"><b>${letter}</b> ${it.what} <i>${it.w}×${it.h} → ×${it.need}</i></div>
  <div class="cap"><b>${it.what}</b><span>${it.w}×${it.h} · picture ${wi + 1} of ${items.length}</span></div>
  <button class="tick" aria-label="sharp enough"></button>
</section>`).join('')).join('');

const shell = await fs.readFile(`${SP}/bakeoff/phone.html`, 'utf8');
const html = shell
  .replace(/<main id="feed">[\s\S]*?<\/main>/, `<main id="feed">${slides}</main>`)
  .replace('<title>which upscale — phone</title>', '<title>free vs paid — new pictures</title>')
  .replace(/pick-upscale-seen-v1/g, 'pick-new-seen-v1')
  .replace(/pick-upscale-v1/g, 'pick-new-v1')
  .replace(/<h3><span id="k2">0<\/span>[^<]*<\/h3>/, `<h3><span id="k2">0</span> ticked over ${items.length} pictures</h3>`)
  .replace(/<p class="note">[\s\S]*?<span id="diag">/, `<p class="note">Same question: <b>is this sharp enough</b>. New pictures this time — nothing here was used to build the rule being tested.
    Two versions of each, two letters, same letters everywhere; which comes first swaps from picture to picture.
    One of them costs 5 cents, the other nothing at all. Black above and below is the picture ending, not a fault. 1:1 shows real pixels.<br>
    <span id="diag">`);
await fs.writeFile(`${SP}/bakeoff/new.html`, html);
await fs.writeFile(`${SP}/newset/KEY.json`, JSON.stringify({ byLetter: KEY }, null, 2));
console.log(`new.html: ${items.length} картинок × ${LETTERS.length} = ${items.reduce((n, i) => n + i.have.length, 0)} слайдов`);
