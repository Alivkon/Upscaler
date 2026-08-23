const B = 'https://colbase.nich.go.jp/colbaseapi/v2';
const H = { 'x-api-key': 'aaa', 'User-Agent': 'Mozilla/5.0' };
const OUT = 'research/colbase-browse.html';

const CATS = [
  { id: 299, label: 'Japan — Ukiyo-e' },
  { id: 300, label: 'Japan — Modern paintings' },
  { id: 304, label: 'China — Landscapes' },
  { id: 306, label: 'China — Flowers and plants' },
];

async function fetchPage(catId, page) {
  const url = `${B}/collection_items?locale=en&page=${page}&category_ids=${catId}`;
  const r = await fetch(url, { headers: H });
  return r.json();
}

async function sample20(catId) {
  const first = await fetchPage(catId, 1);
  const total = first.resultset.count;
  const limit = first.resultset.limit;
  const pages = Math.ceil(total / limit);

  const works = [];
  const seenPages = new Set();
  let attempts = 0;

  const pool = first.results.filter(x => x.thumbnail_url);
  for (const it of pool) {
    if (works.length >= 100) break;
    works.push(it);
  }
  seenPages.add(1);

  while (works.length < 100 && attempts < 200) {
    attempts++;
    const p = 1 + Math.floor(Math.random() * pages);
    if (seenPages.has(p)) continue;
    seenPages.add(p);
    try {
      const d = await fetchPage(catId, p);
      const withImg = d.results.filter(x => x.thumbnail_url);
      for (const it of withImg) {
        if (works.length >= 100) break;
        works.push(it);
      }
    } catch (e) { /* skip bad page */ }
  }

  return works.slice(0, 100);
}

function itemUrl(it) {
  return `https://colbase.nich.go.jp/collection_items/${it.organization_path_name}/${it.organization_item_key}?locale=en`;
}

function renderSection({ label, works }) {
  const cards = works.map(it => {
    const thumb = it.thumbnail_url;
    const href = itemUrl(it);
    const era = it.jidai_seiki || '';
    return `<div>
  <a href="${href}" target="_blank"><img src="${thumb}" style="max-width:200px;max-height:200px;display:block"></a>
  <div>${era || '—'}</div>
</div>`;
  }).join('\n');

  return `<h2>${label} (${works.length})</h2>\n<div style="display:flex;flex-wrap:wrap;gap:16px">\n${cards}\n</div>`;
}

console.log('fetching…');
const sections = [];
for (const cat of CATS) {
  process.stdout.write(`  ${cat.label}… `);
  const works = await sample20(cat.id);
  console.log(`${works.length} works`);
  if (works.length) sections.push({ label: cat.label, works });
}

const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>ColBase paintings sample</title></head>
<body>
<h1>ColBase — Paintings, sketches, and prints</h1>
<p>20 random works per subcategory. Click image → ColBase page.</p>
${sections.map(renderSection).join('\n<hr>\n')}
</body>
</html>`;

import { writeFileSync } from 'fs';
writeFileSync(OUT, html);
console.log(`wrote ${OUT}`);
