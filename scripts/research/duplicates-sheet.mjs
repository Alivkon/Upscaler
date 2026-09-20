// Лист дубликатов: одна картина, пришедшая несколькими файлами, — выбрать,
// какой остаётся. Показывает по каждому кандидату целую работу и кусок
// в масштабе 1:1 из одного и того же места картины: пиксели рядом честнее
// любого числа — лапласиан у мелкого скана бывает выше, потому что резкость
// накручена в самом файле.
//
//   node scripts/research/duplicates-sheet.mjs vl-0408,vl-0427 vl-0443,vl-0451
//
// Гнездо — один довод, работы через запятую. Куски кладутся в
// `research/duplicates/`, лист — `research/duplicates.html`.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '../..');
const GEN = path.resolve(ROOT, '../wallpaper-gen');
const OUT = path.join(ROOT, 'research/duplicates');

const nests = process.argv.slice(2).map(a => a.split(','));
if (!nests.length) throw new Error('назовите гнёзда: vl-0408,vl-0427');

const works = JSON.parse(fs.readFileSync(path.join(GEN, 'museum-works.json'), 'utf8'));
fs.mkdirSync(OUT, { recursive: true });

// Кусок берётся долей от стороны, а не в пикселях: у сканов одной картины
// разный размер, и одинаковый пиксельный квадрат показал бы разные места.
const BOX = 0.22;

const rows = [];
for (const nest of nests) {
  const cards = [];
  for (const ref of nest) {
    const w = works.find(x => x.ref === ref);
    if (!w) throw new Error(`${ref} — нет записи в museum-works.json`);
    const src = ['jpg', 'png', 'tif'].map(e => path.join(GEN, 'sources', `${ref}.${e}`)).find(fs.existsSync);
    if (!src) throw new Error(`${ref} — нет мастера в sources/`);
    const img = sharp(src, { limitInputPixels: false });
    const meta = await img.metadata();
    const side = Math.round(Math.min(meta.width, meta.height) * BOX);
    const left = Math.round((meta.width - side) / 2);
    const top = Math.round((meta.height - side) / 2);
    await sharp(src, { limitInputPixels: false })
      .extract({ left, top, width: side, height: side })
      .jpeg({ quality: 92 })
      .toFile(path.join(OUT, `${ref}-detail.jpg`));
    await sharp(src, { limitInputPixels: false })
      .resize({ width: 700 })
      .jpeg({ quality: 88 })
      .toFile(path.join(OUT, `${ref}-whole.jpg`));
    cards.push({
      ref,
      name: w.name,
      master: w.master,
      mpx: ((meta.width * meta.height) / 1e6).toFixed(1),
      size: meta.width + '×' + meta.height,
      bytes: (fs.statSync(src).size / 1e6).toFixed(1),
      crop: w.crop ? JSON.stringify(w.crop) : '—',
      detail: side,
    });
  }
  rows.push(cards);
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const body = rows
  .map(
    cards => `<h2>${esc(cards[0].name)}</h2>
<table border="1">
<tr><th>ref<th>пикселей<th>Мпикс<th>файл, МБ<th>кадр<th>источник
${cards.map(c => `<tr><td>${c.ref}<td>${c.size}<td>${c.mpx}<td>${c.bytes}<td>${esc(c.crop)}<td><a href="${esc(c.master)}">источник</a>`).join('\n')}
</table>
<h3>целиком</h3>
${cards.map(c => `<figure><img src="duplicates/${c.ref}-whole.jpg" width="700"><figcaption>${c.ref}</figcaption></figure>`).join('\n')}
<h3>середина, 1:1 — один и тот же кусок картины</h3>
${cards.map(c => `<figure><img src="duplicates/${c.ref}-detail.jpg"><figcaption>${c.ref}, ${c.detail}&times;${c.detail} пикселей мастера</figcaption></figure>`).join('\n')}
<hr>`,
  )
  .join('\n');

const html = `<!doctype html>
<meta charset="utf-8">
<title>Дубликаты</title>
<h1>Одна картина, несколько файлов</h1>
<p>Оставить нужно один. Куски внизу каждого гнезда вырезаны из одного
и того же места картины и показаны без уменьшения: во сколько раз один
кусок больше другого, во столько раз больше в нём и пикселей.
<hr>
${body}
`;
fs.writeFileSync(path.join(ROOT, 'research/duplicates.html'), html);
console.log(`гнёзд ${rows.length}, работ ${rows.flat().length} → research/duplicates.html`);
