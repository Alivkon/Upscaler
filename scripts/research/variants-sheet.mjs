// Лист вариантов кадра: работа, записанная на листе кадрировки несколько раз,
// дала несколько окон, а в `museum-works.json` уехало первое. Правило «первая
// строка — v1» решает, что применить, но не утверждает, что применённое лучше:
// на листе перебирают, а не исправляют. Здесь варианты стоят рядом вырезанными,
// и видно, какой из них про картину, а какой про пустой угол.
//
//   node scripts/research/variants-sheet.mjs            # все работы с вариантами
//   node scripts/research/variants-sheet.mjs vl-0412    # только эти
//
// Варианты читаются из `research/to-crop-positions.md` — колонка `variant`,
// галочка стоит у применённого. Окна режутся из выпущенной плиты, а не из
// мастера: сравнивать надо то, что выйдет.
//
// Окно берётся `tall` (9:16), а не `phone` (9:19.5), хотя правило у них одно
// и то же число: `tall` — это кадр, который стоит на витрине и в проёме
// страницы работы (`tile` и `offered` в `pages.js`), то есть тот, по которому
// кадр и выбирают. Телефонное окно уже, и показанное им — не то, что увидят.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '../..');
const OUT = path.join(ROOT, 'research/variants');
const only = new Set(process.argv.slice(2).flatMap(a => a.split(',')));

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'images/manifest/museum.json'), 'utf8'));
const sheet = fs.readFileSync(path.join(ROOT, 'research/to-crop-positions.md'), 'utf8');

const byRef = {};
for (const line of sheet.split('\n')) {
  if (!/^\| vl-/.test(line)) continue;
  const cell = line.split('|').map(s => s.trim());
  const [, ref, position, variant, applied] = cell;
  if (!variant) continue; // строка без варианта — работа записана один раз
  (byRef[ref] ||= []).push({ position, variant, applied: applied === '✓' });
}

const refs = Object.keys(byRef)
  .filter(ref => byRef[ref].length > 1)
  .filter(ref => !only.size || only.has(ref));

// `center` и `top N` — не горизонтальные сдвиги; окно для них стоит там же,
// где его ставит генератор, и резать его здесь было бы выдумкой.
const leftOf = position => {
  const m = /^left (\d+)px$/.exec(position);
  return m ? Number(m[1]) : null;
};

fs.mkdirSync(OUT, { recursive: true });
const cards = [];
for (const ref of refs) {
  const entry = manifest.find(e => e.ref === ref);
  if (!entry) {
    console.log(`${ref} — нет в манифесте, пропущен`);
    continue;
  }
  const plate = path.join(ROOT, 'images', entry.file);
  const window = entry.crops?.tall;
  if (!window) {
    console.log(`${ref} — нет кадра 9:16, пропущен`);
    continue;
  }
  const shots = [];
  for (const v of byRef[ref]) {
    const left = leftOf(v.position);
    if (left === null) {
      shots.push({ ...v, file: null });
      continue;
    }
    // Окно, упёртое в правый край, лист записывает как есть; шире плиты
    // не вырежешь, поэтому позиция прижимается — ровно так же поступает
    // генератор, и картинка совпадает с выпущенной.
    const x = Math.min(left, entry.width - window.width);
    const file = `${ref}-${v.variant}.jpg`;
    await sharp(plate)
      .extract({ left: x, top: 0, width: window.width, height: entry.height })
      .resize({ height: 760 })
      .jpeg({ quality: 86 })
      .toFile(path.join(OUT, file));
    shots.push({ ...v, file, clamped: x !== left });
  }
  cards.push({ ref, shots, size: `${entry.width}×${entry.height}`, window: `${window.width}×${window.height}` });
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const html = `<!doctype html>
<meta charset="utf-8">
<title>Варианты кадра</title>
<h1>Варианты кадра</h1>
<p>Работа записана на листе кадрировки несколько раз. Применён тот, у кого
галочка, — это первая запись, а не лучшая. Остальные лежали без дела.
<hr>
${cards
  .map(
    c => `<h2>${c.ref}</h2>
<p>плита ${c.size}, окно ${c.window}
${c.shots
  .map(s =>
    s.file
      ? `<figure><img src="variants/${esc(s.file)}"><figcaption>${s.variant} · ${esc(s.position)}${s.applied ? ' · <b>применён</b>' : ''}${s.clamped ? ' · прижат к правому краю' : ''}</figcaption></figure>`
      : `<p>${s.variant} · ${esc(s.position)} — не горизонтальный сдвиг, окно не вырезано`,
  )
  .join('\n')}
<hr>`,
  )
  .join('\n')}
`;
fs.writeFileSync(path.join(ROOT, 'research/variants.html'), html);
console.log(`работ ${cards.length}, окон ${cards.reduce((n, c) => n + c.shots.filter(s => s.file).length, 0)} → research/variants.html`);
