// Спросить у Кливленда, что похоже на любимые работы Charlie.
//
// ЧТО ЭТО. У открытого API музея есть недокументированная в обычном смысле
// возможность (Appendix E): POST /api/artworks с файлом вместо запроса —
// поиск по изображению. Это тот самый недостающий взгляд, о котором сказано
// в research/2026-08-20-finding-more-like-the-favourites.md: наши двенадцать
// мер видят, КАК картина освещена, и не видят, ЧТО на ней. CLIP на этой
// машине не стоит; у музея он уже есть.
//
// ЧЕГО ЭТО НЕ УМЕЕТ. Ищет только внутри Кливленда (~14 600 записей в нашем
// обходе, 3944 картины). Для wikimedia-любимцев ответ всё равно кливлендский —
// это не «найди этот же файл», а «что в нашем собрании на него похоже».
//
// ЧТО СЧИТАЕТСЯ. Кандидат тем весомее, чем к БОЛЬШЕМУ числу любимых работ он
// вышел и чем выше в каждом списке. Одна любимая работа, вытянувшая одного
// соседа, — это ничего; три разные, сошедшиеся на одном холсте, — это уже что-то.
//
// СОСТОЯНИЕ 22.08.2026: маршрут отвечает 500 на любой корректный файл, включая
// собственную картинку музея. Проза — research/2026-08-22-cleveland-by-eye.md.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const ROOT = '/home/charlie/repos/Upscaler';
const require_ = createRequire(ROOT + '/');
const HARVEST = process.env.HOME + '/tessarum-harvest/browse-all';
const POOL = process.env.POOL || '/tmp/oils-preview';
const API = 'https://openaccess-api.clevelandart.org/api/artworks';

const args = process.argv.slice(2);
const has = (f) => args.includes(f);

// ---- кто такие «любимые» ----
// Три места, где они записаны, плюс Ниоба. Тот же список, что и у коробки
// 20.08 — включая орхидею: там её убрал прямой запрет Charlie расширять
// коробку, здесь никакая граница не двигается, и её взгляд тоже вопрос.
async function favourites() {
  const over = require_(ROOT + '/research/handpicked-overrules.json');
  const refs = require_(ROOT + '/research/references.json');
  const out = new Map();
  const add = (ref, title, from) => {
    if (!ref) return;
    if (out.has(ref)) out.get(ref).from.push(from);
    else out.set(ref, { ref, title, from: [from] });
  };
  for (const w of over.keep) add(w.ref, w.title, 'overrules');
  for (const w of refs.works) add(w.ref, w.title, 'references');
  for (const w of refs.also_named) add(w.ref, w.title, 'also_named');
  add('vl-0324', "The Destruction of Niobe's Children", 'niobe');
  // Дельароша «Offering to the God Pan» из references.json нет ни в каталоге,
  // ни в обходе, ни в пуле — он и раньше выпадал из всех измерений (20.08).
  return [...out.values()];
}

// ---- у каждой работы должен быть файл целой картины ----
// Порядок не случаен: у кливлендских работ в обходе лежит ЦЕЛАЯ картина,
// а images/plates — это уже обрезанный под телефон кадр. Спрашивать по кадру
// значит спрашивать про другую картину.
// Две работы, чей целый холст лежит не там, где его ищут правила ниже:
// каталог знает их как wikimedia/SMK, а не как Кливленд, и в пуле они
// записаны под другим ключом. Названы поимённо, чтобы догадка не выглядела
// правилом.
const ALIASES = {
  'vl-0324': POOL + '/wm-richard-wilson-the-destruction-of-niobe-s-children-g.jpg',
  'vl-0178': process.env.HOME + '/tessarum-harvest/smk2/thumbs/huysum-KMS441.jpg',
};

let manifest, index, catalogue;
async function surface(fav) {
  index ??= require_(HARVEST + '/index.json');
  manifest ??= require_(POOL + '/manifest.json');
  catalogue ??= await catalogueRefs();

  if (ALIASES[fav.ref] && await exists(ALIASES[fav.ref]))
    return { file: ALIASES[fav.ref], surface: 'alias', acc: null };

  const acc = catalogue.get(fav.ref)?.acc;
  if (acc && index[acc]) return { file: path.join(HARVEST, index[acc].file), surface: 'harvest', acc };

  const m = manifest[fav.ref];
  if (m?.thumb_local && await exists(m.thumb_local)) return { file: m.thumb_local, surface: 'pool', acc: accOf(fav.ref) };

  const plate = catalogue.get(fav.ref)?.file;
  if (plate) {
    const small = plate.replace(/-\d+x\d+\.jpg$/, '-960x');
    const dir = path.join(ROOT, 'images', path.dirname(plate));
    const hit = (await fs.readdir(dir)).find((f) => f.startsWith(path.basename(small)));
    if (hit) return { file: path.join(dir, hit), surface: 'plate(crop)', acc: accOf(fav.ref) };
  }
  return null;
}
const accOf = (ref) => (ref.startsWith('cle-') ? ref.slice(4) : null);
const exists = (f) => fs.access(f).then(() => true, () => false);

async function catalogueRefs() {
  const map = new Map();
  for (const f of await fs.readdir(path.join(ROOT, 'catalogue'))) {
    if (!f.startsWith('vl-')) continue;
    const j = JSON.parse(await fs.readFile(path.join(ROOT, 'catalogue', f), 'utf8'));
    const credit = j.provenance?.credit || '';
    const acc = /Cleveland Museum of Art,\s*([\d.]+)/.exec(credit)?.[1] || null;
    map.set(j.ref, { acc, file: j.file, title: j.title });
  }
  return map;
}

// ---- один вопрос музею ----
async function ask(file, { tries = 3 } = {}) {
  const buf = await fs.readFile(file);
  const q = has('--all') ? '' : '?type=Painting&cc0=1';
  for (let n = 1; n <= tries; n++) {
    const fd = new FormData();
    fd.append('file', new Blob([buf], { type: 'image/jpeg' }), path.basename(file));
    const r = await fetch(API + q, { method: 'POST', body: fd });
    if (r.ok) return (await r.json()).data || [];
    const body = (await r.text()).slice(0, 200);
    if (n === tries) return { error: `${r.status} ${body}` };
    await new Promise((s) => setTimeout(s, 1500 * n));
  }
}

// ---- проба: маршрут вообще жив? ----
// Собственная картинка музея — единственный вход, за который отвечает не мы.
// Если и она даёт 500, дальше идти незачем и вина не наша.
async function probe() {
  const r = await fetch('https://openaccess-cdn.clevelandart.org/1979.57/1979.57_web.jpg');
  const buf = Buffer.from(await r.arrayBuffer());
  const tmp = '/tmp/cle-probe.jpg';
  await fs.writeFile(tmp, buf);
  const got = await ask(tmp, { tries: 1 });
  if (got.error) { console.log('маршрут не отвечает:', got.error); process.exit(1); }
  const first = got[0];
  console.log(`жив: ${got.length} ответов, первый — ${first?.accession_number} ${first?.title}`);
  console.log(first?.accession_number === '1979.57' ? 'и это сама работа — поиск узнаёт себя' : 'но себя он не узнал — читать с осторожностью');
}

async function main() {
  if (has('--probe')) return probe();

  const favs = await favourites();

  // --files: что именно будет отправлено, без единого вызова.
  if (has('--files')) {
    for (const fav of favs) {
      const s = await surface(fav);
      console.log(`${fav.ref.padEnd(56)} ${(s?.surface || 'НЕТ ФАЙЛА').padEnd(12)} ${s ? path.basename(s.file) : fav.title}`);
    }
    return;
  }
  const seen = new Set(require_(ROOT + '/research/harvest-state.json').seen.refs);
  const cat = await catalogueRefs();
  const mine = new Set([...cat.values()].map((v) => v.acc).filter(Boolean));

  const asked = [], missing = [], errors = [];
  const hits = new Map();

  for (const fav of favs) {
    const s = await surface(fav);
    if (!s) { missing.push(fav); continue; }
    const got = await ask(s.file);
    if (got.error) { errors.push({ ...fav, error: got.error }); continue; }
    asked.push({ ...fav, ...s, n: got.length });
    got.forEach((a, rank) => {
      const acc = a.accession_number;
      if (!acc || acc === s.acc) return;               // сама работа — не находка
      const rec = hits.get(acc) || { acc, title: a.title, creator: a.creators?.[0]?.description || '',
        type: a.type, url: a.url, image: a.images?.web?.url, near: [] };
      rec.near.push({ ref: fav.ref, title: fav.title, rank });
      hits.set(acc, rec);
    });
    process.stderr.write(`${fav.ref} ${s.surface} → ${got.length}\n`);
    await new Promise((s) => setTimeout(s, 400));
  }

  // Вес: сколько разных любимых работ сошлись, и как высоко.
  const ranked = [...hits.values()].map((r) => ({
    ...r,
    votes: r.near.length,
    score: +r.near.reduce((a, h) => a + 1 / (1 + h.rank), 0).toFixed(3),
    known: mine.has(r.acc) ? 'в каталоге' : seen.has('cle-' + r.acc) ? 'уже показан' : 'новое',
  })).sort((a, b) => b.votes - a.votes || b.score - a.score);

  const out = { asked: asked.length, missing, errors, favourites: asked, candidates: ranked };
  await fs.writeFile(ROOT + '/research/cle-similar.json', JSON.stringify(out, null, 1));

  console.log(`\nспрошено ${asked.length} из ${favs.length}; без файла ${missing.length}; ошибок ${errors.length}`);
  const fresh = ranked.filter((r) => r.known === 'новое');
  console.log(`кандидатов ${ranked.length}, из них новых ${fresh.length}\n`);
  for (const r of fresh.slice(0, 40)) {
    console.log(`${String(r.votes).padStart(2)} ${String(r.score).padStart(6)}  ${r.acc.padEnd(11)} ${(r.creator || '—').slice(0, 28).padEnd(28)} ${(r.title || '').slice(0, 46)}`);
    console.log(`                 ← ${r.near.map((h) => h.title.slice(0, 28)).join(', ')}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
