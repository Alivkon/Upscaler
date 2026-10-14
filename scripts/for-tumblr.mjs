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

// Two crops of one painting that share more than this much of their area
// look like the same picture twice in a post. Charlie set it on 14.10.2026
// after looking at the pairs: Morland's 62% was too alike, 42–44% were not.
const SIMILAR_MAX = 0.45;

// Where a crop sits on the scan comes from the manifest (`left`, `top`):
// the generator placed it and is the only one that knows its rules.
function shared(a, b) {
  const x = Math.max(0, Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left));
  const y = Math.max(0, Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top));
  return (x * y) / (a.width * a.height);
}

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

// What this run wrote. Everything else in OUT_DIR is removed at the end: a crop
// the similarity rule now drops, or a work since hidden, would otherwise sit
// there next to the files a post may use.
const written = new Set(['index.json']);

// The crop is cut from the copy at least twice the Tumblr width rather than
// the full-size file: the same 900 px after the resize, a quarter of the
// decoding. Not the 960 one: a q82 copy shrunk by 6% keeps its artefacts.
function cropSource(crop) {
  const copy = (crop.copies || []).filter(c => c.width >= 2 * WIDTH).sort((a, b) => a.width - b.width)[0];
  return `images/${(copy || crop).file}`;
}

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

const order = JSON.parse(await fs.readFile('catalogue/order.json', 'utf8'));

let made = 0,
  skippedHidden = 0,
  skippedNoFile = 0,
  skippedNoCrop = 0;
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
  if (!(await exists(src))) {
    skippedNoFile++;
    continue;
  }
  const outFile = `${OUT_DIR}/${ref}-${work.slug}.jpg`;
  const img = sharp(src);
  const meta = await img.metadata();
  const height = Math.round((meta.height / meta.width) * WIDTH);
  await img.resize(WIDTH, height).jpeg({ quality: 84, mozjpeg: true }).toFile(outFile);
  written.add(`${ref}-${work.slug}.jpg`);
  made++;
  // The scan's 9:16 crops at the same width, for posts that put a close-up
  // above the painting (14.10.2026). Same reason as the painting: good on
  // the dash, short of a wallpaper. The main crop first, then the work's other
  // recorded crops (`variants` in the manifest) that differ enough from the
  // ones before them. `shows` is how much of the painting a crop holds; the
  // posting skill decides from it whether to use the crops at all.
  const tall = [];
  const taken = [];
  // A crop without a position (placed by content) is kept and not compared.
  const candidates = [scan.crops?.tall, ...(scan.variants || []).map(variant => variant.tall)];
  for (const [i, tallSrc] of candidates.entries()) {
    if (!tallSrc) continue;
    const from = cropSource(tallSrc);
    if (!(await exists(from))) {
      skippedNoCrop++;
      continue;
    }
    const placed = tallSrc.left != null && tallSrc.top != null;
    if (placed && taken.some(other => shared(tallSrc, other) > SIMILAR_MAX)) continue;
    if (placed) taken.push(tallSrc);
    // The number is the crop's place in the generator's file names, so a
    // dropped variant leaves a gap (`-tall`, `-tall-3`) rather than renaming.
    const tallFile = `${ref}-${work.slug}-tall${i ? `-${i + 1}` : ''}.jpg`;
    const tallHeight = Math.round((tallSrc.height / tallSrc.width) * WIDTH);
    await sharp(from).resize(WIDTH, tallHeight).jpeg({ quality: 84, mozjpeg: true }).toFile(`${OUT_DIR}/${tallFile}`);
    written.add(tallFile);
    const shows = (tallSrc.width * tallSrc.height) / (scan.width * scan.height);
    tall.push({ file: tallFile, width: WIDTH, height: tallHeight, shows: Math.round(shows * 1000) / 1000 });
  }
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
    tall: tall.length ? tall : null,
    full: scan.width >= FULL_MIN_WIDTH ? { width: scan.width, height: scan.height } : null,
    url: `${SITE}/w/${work.slug}`,
    more: `${SITE}${morePath(work.slug)}`
  });
}

await fs.writeFile(`${OUT_DIR}/index.json`, JSON.stringify(index, null, 2));
let removed = 0;
for (const file of await fs.readdir(OUT_DIR)) {
  if (written.has(file)) continue;
  await fs.rm(`${OUT_DIR}/${file}`);
  removed++;
}
console.log(
  `made ${made}, skipped hidden ${skippedHidden}, skipped no file ${skippedNoFile}, ` +
    `crops missing ${skippedNoCrop}, removed ${removed}`
);
