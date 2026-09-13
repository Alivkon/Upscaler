// Downsized copies of every gallery work, sized for the Tumblr dash: sharp
// enough to look good in a feed, short of an actual phone wallpaper so a
// viewer who wants the real resolution has to click through to the work page.
//
// Uses the edited file (`crops.phone`, the `dim`/`ceil`/`none` main version),
// never `scan` — the untreated alternate is not what ships on the gallery.
//
// Запуск: node scripts/for-tumblr.mjs
import fs from 'node:fs/promises';
import sharp from 'sharp';

const WIDTH = 900;
const OUT_DIR = 'images/for-tumblr';

const catalogue = new Map();
for (const file of await fs.readdir('catalogue')) {
  if (!/^vl-\d{4}\.json$/.test(file)) continue;
  const w = JSON.parse(await fs.readFile(`catalogue/${file}`, 'utf8'));
  catalogue.set(w.ref, w);
}

const manifest = new Map();
for (const file of await fs.readdir('images/manifest')) {
  for (const e of JSON.parse(await fs.readFile(`images/manifest/${file}`, 'utf8'))) {
    manifest.set(e.ref, e);
  }
}

await fs.mkdir(OUT_DIR, { recursive: true });

const order = JSON.parse(await fs.readFile('catalogue/order.json', 'utf8'));

let made = 0,
  skippedHidden = 0,
  skippedNoFile = 0;
const index = [];
for (const ref of order) {
  const work = catalogue.get(ref);
  if (!work) continue;
  if (work.hidden) {
    skippedHidden++;
    continue;
  }
  const entry = manifest.get(ref);
  const phone = entry?.crops?.phone;
  if (!phone) {
    skippedNoFile++;
    continue;
  }
  const src = `images/${phone.file}`;
  try {
    await fs.access(src);
  } catch {
    skippedNoFile++;
    continue;
  }
  const outFile = `${OUT_DIR}/${ref}-${work.slug}.jpg`;
  const img = sharp(src);
  const meta = await img.metadata();
  const height = Math.round((meta.height / meta.width) * WIDTH);
  await img.resize(WIDTH, height).jpeg({ quality: 84, mozjpeg: true }).toFile(outFile);
  made++;
  index.push({
    ref,
    slug: work.slug,
    title: work.title,
    alt: work.alt,
    tags: work.tags,
    pin: work.pin,
    provenance: work.provenance || null,
    treatment: entry.treatment || null,
    file: `${ref}-${work.slug}.jpg`,
    width: WIDTH,
    height,
    url: `https://tessarum.com/w/${work.slug}`
  });
}

await fs.writeFile(`${OUT_DIR}/index.json`, JSON.stringify(index, null, 2));
console.log(`made ${made}, skipped hidden ${skippedHidden}, skipped no file ${skippedNoFile}`);
