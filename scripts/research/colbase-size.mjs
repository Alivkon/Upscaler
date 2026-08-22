const B = 'https://colbase.nich.go.jp/colbaseapi/v2';
const H = { 'x-api-key': 'aaa', 'User-Agent': 'Mozilla/5.0' };

function sof(buf) {
  let i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1];
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) {
      return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}

const first = await (await fetch(`${B}/collection_items?locale=en&page=1`, { headers: H })).json();
const total = first.resultset.count, limit = first.resultset.limit;
const pages = Math.ceil(total / limit);
console.log(`items ${total}, pages ${pages}`);

const picked = [];
const seen = new Set();
while (picked.length < 40) {
  const p = 1 + Math.floor(Math.random() * pages);
  if (seen.has(p)) continue;
  seen.add(p);
  const r = await (await fetch(`${B}/collection_items?locale=en&page=${p}`, { headers: H })).json();
  const withImg = r.results.filter(x => x.thumbnail_url);
  if (!withImg.length) continue;
  picked.push(withImg[Math.floor(Math.random() * withImg.length)]);
}

const rows = [];
for (const it of picked) {
  const url = it.thumbnail_url.replace('/image/thumbnail/', '/image/original/');
  try {
    const res = await fetch(url, { headers: { ...H, Range: 'bytes=0-262143' } });
    const buf = Buffer.from(await res.arrayBuffer());
    const d = sof(buf);
    if (!d) { rows.push({ bunrui: it.bunrui, long: null }); continue; }
    rows.push({ org: it.organization_path_name, bunrui: it.bunrui, w: d.w, h: d.h, long: Math.max(d.w, d.h) });
  } catch (e) { rows.push({ bunrui: it.bunrui, long: null, err: String(e).slice(0, 40) }); }
}
for (const r of rows) console.log(`${String(r.long).padStart(6)}  ${r.w}x${r.h}  ${r.org}  ${r.bunrui}`);
const longs = rows.map(r => r.long).filter(Boolean).sort((a, b) => a - b);
const q = p => longs[Math.floor((longs.length - 1) * p)];
console.log(`\nmeasured ${longs.length}/40  min ${longs[0]}  p25 ${q(0.25)}  median ${q(0.5)}  p75 ${q(0.75)}  max ${longs.at(-1)}`);
for (const t of [1920, 2560, 3000, 3840]) console.log(`>= ${t}: ${longs.filter(x => x >= t).length}`);
