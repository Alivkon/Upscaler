// Downsized copies of every gallery work, sized for the Tumblr dash: sharp
// enough to look good in a feed, short of an actual wallpaper so a viewer who
// wants the real resolution has to click through to the work page.
//
// Uses the whole painting as scanned (`scan` when the work has one, i.e.
// `treatment` `dim` or `ceil`; the plate itself for `treatment: "none"`, whose
// plate is the scan) — not the phone crop and not the dimmed file. Tumblr shows
// the painting; the crops are on the work page.
//
// The index also says where the caption's two links go (10.10.2026). `full` is
// the scan's size from the manifest, for the "full size, W × H" line; it is
// null when the scan is too small for that line to be worth a click. `more` is
// the page behind "more": the painter's own page when it holds enough works,
// otherwise the collection that reads most like "more by this painter":
// tradition, then subject, then mood. The homepage when there is none.
// A mood is our reading of the painting, and nothing in the caption prepares
// the viewer for it: Friedrich's "Summer" under "more" led to cottagecore.
//
// Запуск: node scripts/for-tumblr.mjs
import fs from 'node:fs/promises';
import sharp from 'sharp';
import { galleryItems } from '../gallery.js';
import { artistPageOf, browse } from '../browse.js';

const WIDTH = 900;
const OUT_DIR = 'images/for-tumblr';
const SITE = 'https://tessarum.com';
// Below this width the site's file is barely bigger than the Tumblr copy.
const FULL_MIN_WIDTH = 1200;
// An artist page of two works shows one other painting: thin for "more".
const MORE_MIN_WORKS = 3;
const MORE_KINDS = ['tradition', 'subject', 'mood'];

const shown = (await galleryItems()).filter(item => !item.hidden);
const found = browse(shown);

function morePath(slug) {
  const item = shown.find(candidate => candidate.slug === slug);
  if (!item) return '/';
  const artist = artistPageOf(found, item);
  if (artist && artist.items.length >= MORE_MIN_WORKS) return artist.path;
  const [collection] = found.collections
    .filter(page => page.items.includes(item))
    .sort((a, b) => MORE_KINDS.indexOf(a.kind) - MORE_KINDS.indexOf(b.kind) || a.items.length - b.items.length);
  return collection?.path ?? '/';
}

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
  const scan = entry?.scan || entry;
  if (!scan?.file) {
    skippedNoFile++;
    continue;
  }
  const src = `images/${scan.file}`;
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
    full: scan.width >= FULL_MIN_WIDTH ? { width: scan.width, height: scan.height } : null,
    url: `${SITE}/w/${work.slug}`,
    more: `${SITE}${morePath(work.slug)}`
  });
}

await fs.writeFile(`${OUT_DIR}/index.json`, JSON.stringify(index, null, 2));
console.log(`made ${made}, skipped hidden ${skippedHidden}, skipped no file ${skippedNoFile}`);
