# Страницы для обхода: план реализации, шаг 1

> **Для Claude:** обязательный навык: superpowers:executing-plans (или
> superpowers:subagent-driven-development), задача за задачей.

**Цель:** страницы художников и стран, набирающиеся сами из каталога; блок
с подписями под сеткой указателя; ссылки со страницы работы на художника
и на страницы, где она стоит; две традиции из готовых списков.

**Устройство:** новый `artists.js` (кто есть кто в каталоге и у кого есть
страница) и новый `browse.js` (какие страницы для обхода существуют при данном
наборе работ и как они перечислены). Страница художника и страницы стран
рисуются уже существующей `topicPage`: у каждой страницы появляется поле `path`.
Замысел и все решения: `research/2026-09-23-browse-pages.md`.

**Стек:** Node (ESM), Express, строковые шаблоны в `pages.js`. Тестов в обычном
смысле нет: проверки — скрипты `scripts/verify-*.mjs`, их запускает `yarn verify`.

---

## Перед началом

- Работать в ветке, не в worktree: картинки и манифест лежат в `images/`, их
  нет в git, и в worktree сервер покажет пустую коллекцию.
- В рабочем каталоге чужие незакоммиченные файлы (точечные `.*.mjs`, правки
  `TODO.md`, `research/social-posts.json`). **Никогда `git add -A`**, только
  пути по одному (AGENTS.md).
- Сервер: `yarn start` (перезапускает уже идущий), http://127.0.0.1:3000.
- Никаких вызовов модели: ни одна задача ниже до `/api/upscale` не доходит.

### Задача 0: ветка и то, что уже сделано

```bash
git switch -c browse-pages
git add pages.js research/2026-09-23-browse-pages.md research/2026-09-23-browse-pages.html \
  research/hudson-river-school-collection-picks.json research/dutch-golden-age-collection-picks.json \
  research/2026-09-23-browse-pages-plan.md research/2026-09-23-browse-pages-plan.html
git commit -m "Заголовок указателя называет живопись; замысел страниц для обхода

Главная не содержала слова painting ни в заголовке, ни в тексте, а запрос
classical paintings wallpapers набирают. Рядом замысел художников, стран
и традиций и два списка традиций, выбранных по истории искусства.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

`TODO.md` не добавлять: в нём правки Charlie вперемешку с нашей строкой.

---

### Задача 1: `artists.js`: кто есть кто

**Файлы:**
- Создать: `artists.js`
- Создать: `scripts/verify-browse.mjs`
- Изменить: `package.json` (`verify`, `format`)

**Шаг 1. Проверка, которая падает.** `scripts/verify-browse.mjs`:

```js
// Проверка страниц для обхода. Ломается здесь молча и в сторону «страницы нет»:
// художник дорос до своей страницы, а записи о нём нет, — и страница просто
// не появилась; написание имени в каталоге сменилось — и работы ушли от
// художника без единой ошибки. Разбор — research/2026-09-23-browse-pages.md.
import { ARTISTS, MIN_WORKS, artistOf, displayName } from '../artists.js';

const problems = [];
const complain = what => problems.push(what);
const expect = (what, actual, wanted) => {
  if (JSON.stringify(actual) !== JSON.stringify(wanted))
    complain(`${what}: ожидали ${JSON.stringify(wanted)}, вышло ${JSON.stringify(actual)}`);
};

// Работа в том виде, в каком её отдаёт галерея, но только с нужными полями.
const work = (ref, creator, origin = 'America', creatorKind) => ({
  ref,
  origin,
  provenance: { creator, ...(creatorKind ? { creatorKind } : {}) }
});

// Два написания одного человека сходятся, копия к нему не приписывается.
expect('Тайкан без годов', artistOf(work('a', 'Yokoyama Taikan'))?.slug, 'yokoyama-taikan');
expect('Тайкан с годами', artistOf(work('b', 'Yokoyama Taikan (1868-1958)'))?.slug, 'yokoyama-taikan');
expect('копия после Коула', artistOf(work('c', 'After Thomas Cole (unidentified copyist)', 'America', 'unknown')), null);
expect('не записанный художник', artistOf(work('d', 'Claude Monet')), null);
expect('имя записанного', displayName(work('e', 'Yokoyama Taikan (1868-1958)')), 'Yokoyama Taikan');
expect('годы снимаются с незаписанного', displayName(work('f', 'Kobayashi Kokei (1883-1957)')), 'Kobayashi Kokei');
expect('годы с вопросом', displayName(work('g', 'Kaji Tameya (?-1894)')), 'Kaji Tameya');
expect('порог', MIN_WORKS, 4);

if (problems.length) {
  for (const problem of problems) console.error(`  ${problem}`);
  console.error(`\nобход: ${problems.length} проблем`);
  process.exit(1);
}
console.log(`обход: художников записано ${ARTISTS.length}`);
```

**Шаг 2. Убедиться, что падает.**
`node scripts/verify-browse.mjs` → `Cannot find module '…/artists.js'`.

**Шаг 3. `artists.js`.**

```js
// Художники, у которых есть своя страница, и как их узнать в каталоге.
//
// Страница набирается сама, когда у художника MIN_WORKS показанных работ,
// но только если он записан здесь. Этикетку сверяют с Wikidata руками,
// и страница без проверенной этикетки хуже, чем никакой. Что художник дорос,
// а записи нет, ловит `yarn verify` (scripts/verify-browse.mjs).
//
// Почему 4. Страница из одной-двух работ повторяет страницу работы, а это
// дубль. Счёт сам по себе не ранжирует (COLLECTIONS.md: семь работ стояли выше
// склада на 288), так что выше порог поднимать незачем.
//
// `names` — все написания из `provenance.creator`. Каталог переносит строку
// из источника как есть, и один человек записан в нём по-разному: «Yokoyama
// Taikan» и «Yokoyama Taikan (1868-1958)». Копии («After Thomas Cole
// (unidentified copyist)») сюда нарочно не входят: это не его работа.
//
// `short` — подпись в строке художников под сеткой указателя, по ней же
// строка упорядочена. `made` — чем названы работы в абзаце и описании:
// у Одюбона гравюры, и «paintings» было бы неправдой.
//
// Этикетка: годы жизни, страна, род занятий, по описанию Wikidata (23.09.2026).
// Уилсону Wikidata даёт и 1713, и 1714; взят 1714, как в самом описании.
export const MIN_WORKS = 4;

export const ARTISTS = [
  {
    slug: 'ivan-aivazovsky',
    name: 'Ivan Aivazovsky',
    short: 'Aivazovsky',
    made: 'paintings',
    label: 'Ivan Aivazovsky (1817–1900), Russian marine painter',
    wikidata: 'Q181568',
    names: ['Ivan Aivazovsky']
  },
  {
    slug: 'john-james-audubon',
    name: 'John James Audubon',
    short: 'Audubon',
    made: 'prints',
    label: 'John James Audubon (1785–1851), American naturalist and painter',
    wikidata: 'Q182882',
    names: ['John James Audubon']
  },
  {
    slug: 'jean-victor-bertin',
    name: 'Jean-Victor Bertin',
    short: 'Bertin',
    made: 'paintings',
    label: 'Jean-Victor Bertin (1767–1842), French painter',
    wikidata: 'Q331884',
    names: ['Jean-Victor Bertin']
  },
  {
    slug: 'albert-bierstadt',
    name: 'Albert Bierstadt',
    short: 'Bierstadt',
    made: 'paintings',
    label: 'Albert Bierstadt (1830–1902), American painter',
    wikidata: 'Q77132',
    names: ['Albert Bierstadt']
  },
  {
    slug: 'thomas-cole',
    name: 'Thomas Cole',
    short: 'Cole',
    made: 'paintings',
    label: 'Thomas Cole (1801–1848), American painter',
    wikidata: 'Q334001',
    names: ['Thomas Cole']
  },
  {
    slug: 'theodore-gudin',
    name: 'Théodore Gudin',
    short: 'Gudin',
    made: 'paintings',
    label: 'Théodore Gudin (1802–1880), French painter',
    wikidata: 'Q555885',
    names: ['Théodore Gudin']
  },
  {
    slug: 'vilhelm-hammershoi',
    name: 'Vilhelm Hammershøi',
    short: 'Hammershøi',
    made: 'paintings',
    label: 'Vilhelm Hammershøi (1864–1916), Danish painter',
    wikidata: 'Q380706',
    names: ['Vilhelm Hammershøi']
  },
  {
    slug: 'willem-kalf',
    name: 'Willem Kalf',
    short: 'Kalf',
    made: 'paintings',
    label: 'Willem Kalf (1619–1693), Dutch painter',
    wikidata: 'Q28144',
    names: ['Willem Kalf']
  },
  {
    slug: 'claude-lorrain',
    name: 'Claude Lorrain',
    short: 'Lorrain',
    made: 'paintings',
    label: 'Claude Lorrain (1600–1682), French painter',
    wikidata: 'Q214074',
    names: ['Claude Lorrain']
  },
  {
    slug: 'otto-didrik-ottesen',
    name: 'Otto Didrik Ottesen',
    short: 'Ottesen',
    made: 'paintings',
    label: 'Otto Didrik Ottesen (1816–1892), Danish painter',
    wikidata: 'Q12329765',
    names: ['Otto Didrik Ottesen']
  },
  {
    slug: 'yokoyama-taikan',
    name: 'Yokoyama Taikan',
    short: 'Taikan',
    made: 'paintings',
    label: 'Yokoyama Taikan (1868–1958), Japanese painter',
    wikidata: 'Q2034441',
    names: ['Yokoyama Taikan', 'Yokoyama Taikan (1868-1958)']
  },
  {
    slug: 'jan-van-huysum',
    name: 'Jan van Huysum',
    short: 'van Huysum',
    made: 'paintings',
    label: 'Jan van Huysum (1682–1749), Dutch painter',
    wikidata: 'Q527869',
    names: ['Jan van Huysum']
  },
  {
    slug: 'richard-wilson',
    name: 'Richard Wilson',
    short: 'Wilson',
    made: 'paintings',
    label: 'Richard Wilson (1714–1782), Welsh landscape painter',
    wikidata: 'Q471387',
    names: ['Richard Wilson']
  }
];

const byName = new Map(ARTISTS.flatMap(artist => artist.names.map(name => [name, artist])));

export const artistOf = item => byName.get(item.provenance?.creator) ?? null;

// Имя для людей: у записанного — из записи, у остальных — строка каталога
// без годов жизни в скобках на конце («Kobayashi Kokei (1883-1957)»).
export const displayName = item =>
  artistOf(item)?.name ?? item.provenance.creator.replace(/\s*\([^()]*\d{4}\)$/, '');
```

**Шаг 4. `package.json`.** В `verify` после `node --check treatment.js`
дописать `&& node --check artists.js`, после `node scripts/verify-catalogue.mjs`
дописать `&& node scripts/verify-browse.mjs`; в оба списка prettier (в `verify`
и в `format`) дописать `artists.js`.

**Шаг 5. Прогнать.** `node scripts/verify-browse.mjs` → `обход: художников
записано 13`. Затем `yarn verify` → код 0.

**Шаг 6. Коммит.**

```bash
git add artists.js scripts/verify-browse.mjs package.json
git commit -m "Художники: одно имя на человека, копии не в счёт

Каталог переносит имя из источника как есть, и Тайкан записан двумя строками.
Страница художника должна считать его работы вместе и не брать копию после
Коула за Коула.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Задача 2: `browse.js`: какие страницы есть

**Файлы:**
- Создать: `browse.js`
- Изменить: `collections.js` (поля `kind` и `name` у четырёх тем; убрать
  `collectionBySlug`, когда его перестанет звать сервер, это задача 4)
- Изменить: `scripts/verify-browse.mjs`, `package.json`

**Шаг 1. Проверки, которые падают.** В `scripts/verify-browse.mjs` после
импортов из `artists.js` добавить импорт и перед итогом блок:

```js
import fs from 'node:fs/promises';
import { COLLECTIONS } from '../collections.js';
import { COUNTRIES, artistIndex, browse, everyPage, leadingNames, pageAt, pagesWith, rows } from '../browse.js';
import { accession } from '../public/record.js';
import { CATALOGUE_DIR, workFile } from '../works.js';
```

```js
// Правила на выдуманных работах: порог, один художник на страну, порядок строк.
const fixture = [
  ...['1', '2', '3', '4'].map(n => work(`c${n}`, 'Thomas Cole')),
  ...['1', '2', '3'].map(n => work(`b${n}`, 'Albert Bierstadt')),
  work('x1', 'After Thomas Cole (unidentified copyist)', 'America', 'unknown'),
  ...['1', '2', '3', '4', '5', '6'].map(n => work(`r${n}`, 'Ivan Aivazovsky', 'Russia'))
];
const sample = browse(fixture);
expect('Коул с четырьмя — страница', sample.artists.map(page => page.path).includes('/artists/thomas-cole'), true);
expect('Бирштадт с тремя — нет', sample.artists.map(page => page.path).includes('/artists/albert-bierstadt'), false);
expect('копия не в счёте Коула', pageAt(sample, '/artists/thomas-cole').items.length, 4);
expect('Америка: восемь работ, два художника', pageAt(sample, '/collection/american-painting')?.items.length, 8);
expect('Россия: один художник — страны нет', pageAt(sample, '/collection/russian-painting'), null);
expect('имена по весу, копия не названа', leadingNames(pageAt(sample, '/collection/american-painting').items), [
  'Thomas Cole',
  'Albert Bierstadt'
]);
expect('строка «In» без художника', pagesWith(sample, fixture[0]).map(page => page.path), ['/collection/american-painting']);
expect(
  'строки под сеткой',
  rows(sample).map(row => row.label),
  ['Traditions', 'Countries', 'Moods', 'Artists']
);
expect('последняя ссылка художников', rows(sample).at(-1).links.at(-1), { href: '/artists', text: 'All artists' });
expect(
  'указатель художников: все известные, с адресом только у страниц',
  artistIndex(sample, fixture).map(entry => [entry.name, entry.count, entry.path]),
  [
    ['Albert Bierstadt', 3, null],
    ['Ivan Aivazovsky', 6, '/artists/ivan-aivazovsky'],
    ['Thomas Cole', 4, '/artists/thomas-cole']
  ]
);

// То же на настоящем каталоге: показанные записи в том виде, в каком
// их считает browse. Картинок здесь нет: проверка о каталоге, не о файлах.
const names = (await fs.readdir(CATALOGUE_DIR)).filter(name => /^vl-\d+\.json$/.test(name));
const records = await Promise.all(names.map(async name => JSON.parse(await fs.readFile(workFile(name.slice(0, -5)), 'utf8'))));
const visible = records
  .filter(record => record.hidden !== true && record.provenance)
  .map(record => ({ ref: accession(record.ref), origin: record.origin, provenance: record.provenance }));
const real = browse(visible);

const everyName = ARTISTS.flatMap(artist => artist.names);
if (new Set(everyName).size !== everyName.length) complain('artists.js: одно написание у двух художников');
const creators = new Set(visible.map(item => item.provenance.creator));
for (const artist of ARTISTS) {
  for (const name of artist.names)
    if (!creators.has(name)) complain(`artists.js/${artist.slug}: написания «${name}» в каталоге нет`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(artist.slug)) complain(`artists.js/${artist.slug}: адрес не латиницей`);
  if (!/^Q\d+$/.test(artist.wikidata)) complain(`artists.js/${artist.slug}: wikidata не вида Q123`);
  if (!artist.label.startsWith(`${artist.name} (`)) complain(`artists.js/${artist.slug}: этикетка не с имени`);
  if (!real.artists.some(page => page.artist === artist))
    complain(`artists.js/${artist.slug}: меньше ${MIN_WORKS} показанных работ, страницы нет — запись лишняя`);
}
const counts = new Map();
for (const item of visible)
  if (item.provenance.creatorKind !== 'unknown' && !artistOf(item))
    counts.set(item.provenance.creator, (counts.get(item.provenance.creator) ?? 0) + 1);
for (const [creator, count] of counts)
  if (count >= MIN_WORKS) complain(`«${creator}»: ${count} работ — нужна запись в artists.js`);

for (const country of COUNTRIES)
  if (!real.countries.some(page => page.country === country))
    complain(`browse.js/${country.origin}: страницы не выходит — строка в COUNTRIES лишняя`);
const origins = new Map();
for (const item of visible) origins.set(item.origin, [...(origins.get(item.origin) ?? []), item]);
for (const [origin, items] of origins)
  if (
    origin !== 'Tessarum' &&
    items.length >= MIN_WORKS &&
    leadingNames(items).length > 1 &&
    !COUNTRIES.some(country => country.origin === origin)
  )
    complain(`${origin}: ${items.length} работ разных художников — нужна строка в COUNTRIES`);

for (const topic of COLLECTIONS) {
  if (!['tradition', 'mood'].includes(topic.kind)) complain(`collections.js/${topic.slug}: kind не tradition и не mood`);
  if (!topic.name) complain(`collections.js/${topic.slug}: нет name`);
}
const paths = everyPage(real).map(page => page.path);
if (new Set(paths).size !== paths.length) complain('две страницы с одним адресом');
for (const page of everyPage(real)) {
  if (page.title.length > 65) complain(`${page.path}: title ${page.title.length} знаков, выдача обрежет`);
  if (page.description.length > 160) complain(`${page.path}: description ${page.description.length} знаков`);
}
```

Итоговую строку заменить на:

```js
console.log(
  `обход: художников ${real.artists.length}, стран ${real.countries.length}, тем и традиций ${real.collections.length}`
);
```

**Шаг 2. Убедиться, что падает.** `node scripts/verify-browse.mjs` →
`Cannot find module '…/browse.js'`.

**Шаг 3. `collections.js`: `kind` и `name`.** В каждую из четырёх записей
`COLLECTIONS` после `slug` добавить два поля и комментарий над первой:

```js
    // `kind` — строка, в которой тема стоит под сеткой указателя: традиция
    // (школа или движение) или настроение (подборка глазами). `name` — её
    // подпись там и в строке «In …» на странице работы: слово «collection»,
    // повторённое двенадцать раз подряд, — шум, а заголовок самой страницы
    // (`heading`) его сохраняет.
    kind: 'tradition',
    name: 'Nihonga',
```

`moody-landscape`: `kind: 'mood', name: 'Moody landscape'`;
`dark-academia`: `kind: 'mood', name: 'Dark academia'`;
`cottagecore`: `kind: 'mood', name: 'Cottagecore'`.

**Шаг 4. `browse.js`.**

```js
// Страницы, по которым коллекцию обходят: темы и традиции (списки в
// collections.js), страны и художники (набираются сами из каталога). Здесь
// решается, какие из них существуют при данном наборе работ и как они
// перечислены; разметка — в pages.js. Разбор — research/2026-09-23-browse-pages.md.
//
// Правило разделения: факт набирает страницу сам, вкус выбирает человек.
// Откуда работа и кто её написал — факты, они в каталоге. Что работа
// «dark academia» — вкус, и это список.
import { ARTISTS, MIN_WORKS, artistOf, displayName } from './artists.js';
import { COLLECTIONS, worksOf } from './collections.js';

// Страна называется на странице прилагательным, а не именем из `origin`.
// Англия — British: пять из двенадцати работ у Уилсона, а он валлиец.
// России здесь нет: все шесть её работ — Айвазовский, и её страница была бы
// его страницей под другим именем.
export const COUNTRIES = [
  { origin: 'America', adjective: 'American' },
  { origin: 'Denmark', adjective: 'Danish' },
  { origin: 'England', adjective: 'British' },
  { origin: 'France', adjective: 'French' },
  { origin: 'Japan', adjective: 'Japanese' },
  { origin: 'Netherlands', adjective: 'Dutch' }
];

// Анонимы и копии («Unknown (Japan)», «After Thomas Cole») в каталоге
// помечены `creatorKind: 'unknown'`; называть их именем нельзя.
const named = item => item.provenance && item.provenance.creatorKind !== 'unknown';

// Имена по весу: кто чаще, тот первым; равные — по алфавиту, чтобы абзац
// не менялся от перезапуска к перезапуску.
export const leadingNames = items => {
  const counts = new Map();
  for (const item of items.filter(named)) counts.set(displayName(item), (counts.get(displayName(item)) ?? 0) + 1);
  return [...counts]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name]) => name);
};

const listed = names => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`);
const byNames = names => (names.length > 3 ? `${names.slice(0, 3).join(', ')} and others` : listed(names));

// Та же строка условий, что у тем (collections.js): числа из тех же работ.
const terms = ({ count, full }) =>
  `All ${count} are phone wallpapers, ${full} of them at 2160 × 3840 or larger. ` +
  'Free to download and set as your background, no account needed.';

// «Works», а не «paintings»: у Америки гравюры Одюбона, у Японии ксилографии
// Киётики. В `title` «painting» остаётся — это слово запроса.
function countryPage(country, items) {
  const names = leadingNames(items);
  const { adjective } = country;
  return {
    kind: 'country',
    country,
    path: `/collection/${adjective.toLowerCase()}-painting`,
    name: `${adjective} painting`,
    rowName: adjective,
    title: `${adjective} painting phone wallpapers: free, no account`,
    heading: `${adjective} painting`,
    description: `${adjective} painting as phone wallpaper, from public museum collections: ${listed(names.slice(0, 2))}. Free, no account.`,
    note: ({ count }) => `${count} ${adjective} works, chosen as phone wallpapers. By ${byNames(names)}.`,
    terms,
    items
  };
}

function artistPage(artist, items) {
  return {
    kind: 'artist',
    artist,
    path: `/artists/${artist.slug}`,
    name: artist.name,
    rowName: artist.short,
    // Без `made`: «Otto Didrik Ottesen paintings as phone wallpapers…» — 66 знаков,
    // выдача обрежет; а «thomas cole phone wallpaper» Google подсказывает дословно.
    title: `${artist.name} phone wallpapers: free, no account`,
    heading: artist.name,
    description: `${artist.label}. Free phone wallpapers from the ${artist.made}, no account.`,
    note: ({ count }) => `${artist.label}. ${count} ${artist.made}, chosen as phone wallpapers.`,
    terms,
    items
  };
}

// Всё, что есть для обхода при данном наборе показанных работ. Считается
// на каждый запрос: работ полторы сотни, и держать это в памяти значило бы
// следить, когда оно устарело.
export function browse(items) {
  return {
    collections: COLLECTIONS.map(topic => ({
      ...topic,
      path: `/collection/${topic.slug}`,
      rowName: topic.name,
      items: worksOf(topic, items)
    })),
    countries: COUNTRIES.map(country =>
      countryPage(
        country,
        items.filter(item => item.origin === country.origin)
      )
    ).filter(page => page.items.length >= MIN_WORKS && leadingNames(page.items).length > 1),
    artists: ARTISTS.map(artist =>
      artistPage(
        artist,
        items.filter(item => artistOf(item) === artist)
      )
    ).filter(page => page.items.length >= MIN_WORKS)
  };
}

export const everyPage = found => [...found.collections, ...found.countries, ...found.artists];
export const pageAt = (found, path) => everyPage(found).find(page => page.path === path) ?? null;

// Где стоит работа — для строки «In …» на её странице. Художника здесь нет:
// он назван ссылкой в подписи, и второй раз в той же подписи — повтор.
export const pagesWith = (found, item) =>
  [...found.collections, ...found.countries].filter(page => page.items.includes(item));
export const artistPageOf = (found, item) => found.artists.find(page => page.items.includes(item)) ?? null;

// Блок под сеткой указателя. Пустая строка не выводится: подпись без ссылок
// обещает раздел, которого нет. Строки «Subjects» пока нет вовсе — сюжетных
// подборок ещё не отобрано, и она появится вместе с ними.
export const rows = found =>
  [
    { label: 'Traditions', pages: found.collections.filter(page => page.kind === 'tradition') },
    { label: 'Countries', pages: found.countries },
    { label: 'Moods', pages: found.collections.filter(page => page.kind === 'mood') },
    { label: 'Artists', pages: [...found.artists, { path: '/artists', rowName: 'All artists' }] }
  ]
    .map(row => ({ label: row.label, links: row.pages.map(page => ({ href: page.path, text: page.rowName })) }))
    .filter(row => row.links.length);

// Указатель художников: все названные по имени, по алфавиту, со счётом.
// Адрес — только у тех, у кого есть страница; остальные стоят именем,
// и это показывает, что коллекция шире своих страниц.
export function artistIndex(found, items) {
  const entries = new Map();
  for (const item of items.filter(named)) {
    const name = displayName(item);
    const page = found.artists.find(candidate => candidate.artist === artistOf(item));
    const entry = entries.get(name) ?? { name, count: 0, path: page?.path ?? null };
    entry.count += 1;
    entries.set(name, entry);
  }
  return [...entries.values()].sort((a, b) => a.name.localeCompare(b.name));
}
```

**Шаг 5. `package.json`.** В `verify` дописать `&& node --check browse.js`,
в оба списка prettier — `browse.js`.

**Шаг 6. Прогнать.** `yarn format`, затем `node scripts/verify-browse.mjs`.
Ожидается: `обход: художников 13, стран 6, тем и традиций 4`. Если какая-то
проверка на настоящем каталоге жалуется — это находка, а не повод ослабить
проверку: прочитать, починить данные или сказать Charlie.
Затем `yarn verify` → код 0.

**Шаг 7. Коммит.**

```bash
git add browse.js collections.js scripts/verify-browse.mjs package.json
git commit -m "Какие страницы для обхода существуют: художники и страны от четырёх работ

Факт набирает страницу сам, вкус выбирает человек. Порог четыре: меньше —
страница повторяет страницу работы. Россия пропущена, её шесть работ — один
Айвазовский.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Задача 3: `pages.js`: разметка

**Файлы:** изменить `pages.js`, `public/styles.css`.

Проверка этой задачи — глазами и `curl` в задаче 4, после подключения
маршрутов: строковые шаблоны без сервера проверять не на чем.

**Шаг 1. Блок под сеткой.** Заменить `topicRow` (строка ~647) и `tailRow`:

```js
// Блок под сеткой указателя: строки с подписью, по строке на вид страниц
// (`rows` в browse.js). Подписи нужны, потому что ссылок стало около двадцати,
// и одной строкой без них это уже не оглавление, а облако тегов.
// Разделителей между ссылками нет, как не было: строка самая тихая на странице.
const browseRows = rows =>
  rows.length
    ? `<nav class="browse" aria-label="Browse the collection">${rows
        .map(
          row =>
            `<p class="browse__row"><span class="browse__label">${escape(row.label)}</span>${row.links
              .map(link => `<a href="${escape(link.href)}">${escape(link.text)}</a>`)
              .join('\n            ')}</p>`
        )
        .join('\n          ')}</nav>`
    : '';
```

```js
const tailRow = rows => `<div class="tail">${browseRows(rows)}${mailingForm}</div>`;
```

Комментарий над старым `topicRow` удалить вместе с ним; если в нём есть
причина, которая остаётся верной, перенести её в новый.

**Шаг 2. `collectionPage`.** Сигнатура `({ items, rows = [], origin })`,
в теле `${tailRow(rows)}`.

**Шаг 3. `topicPage`.** `canonical: \`${origin}${topic.path}\``. Больше
ничего: страница художника и страницы стран приходят тем же объектом
(`title`, `description`, `heading`, `note`, `terms`).

**Шаг 4. Строка «In …».** Заменить `inTopics` и его комментарий:

```js
// Где ещё стоит работа: традиции, страны, настроения — одной строкой.
// Было по строке «More … phone wallpapers →» на тему; у работы теперь бывает
// три-четыре страницы, и четыре строки выходов под одной работой спорили бы
// с кнопкой. Текст ссылки — имя страницы, слова запроса стоят у неё в `title`.
const inPages = pages =>
  pages.length
    ? `<p class="in-topic">In ${pages
        .map(page => `<a href="${escape(page.path)}">${escape(page.name)}</a>`)
        .join(' · ')}</p>`
    : '';
```

**Шаг 5. Имя художника ссылкой.** В `provenance(item, name)` добавить третий
довод и собрать `made` из экранированных частей:

```js
function provenance(item, name, artistPath) {
  if (!item.provenance) return '';
  const { creator, date, work, credit, page } = item.provenance;
  // Имя — ссылка, когда у художника есть страница; иначе текст, как было.
  const who = artistPath ? `<a href="${escape(artistPath)}">${escape(creator)}</a>` : escape(creator);
  const made = [who, date ? escape(date) : ''].filter(Boolean).join(', ');
  const held = [work === name ? '' : work, credit].filter(Boolean).join(' · ');
  const terms = item.license ? `${escape(item.license.name)} · ` : '';
  return `
            <p class="terms__line">${made}</p>
            ${held ? `<p class="terms__note">${escape(held)}</p>` : ''}
            <p class="terms__note">${terms}<a href="${escape(page)}">Source file</a></p>`;
}
```

Найти вызов (`grep -n "provenance(item" pages.js`) и передать `artist?.path`.

**Шаг 6. `workPage`.** Сигнатура `({ item, others, pages = [], artist = null, origin })`.
`artist` — **страница** художника из `browse` (у неё есть `path` и `name`),
а не запись из `ARTISTS`: у записи `path` нет, и ссылка в подписи молча
не появилась бы.
`${inTopics(topics)}` → `${inPages(pages)}`. Заголовок соседей:

```js
      ${others.length ? `<section class="adjacent"><h2 class="heading">${artist ? `More by ${escape(artist.name)}` : 'More in the collection'}</h2>${grid(others)}</section>` : ''}
```

**Шаг 7. Страница `/artists`.** Новая функция рядом с `topicPage`:

```js
// Указатель художников: все, кого можно назвать по имени, со счётом работ.
// Ссылка — у тех, у кого есть страница (browse.js, `artistIndex`); остальные
// стоят именем, как в указателе музея, где у художника может быть одна вещь.
export function artistsPage({ entries, origin }) {
  return layout({
    current: 'collection',
    title: `Artists in the ${SITE_NAME} collection`,
    description: `${entries.length} artists whose work is in the collection as free phone wallpapers, no account.`,
    canonical: `${origin}/artists`,
    body: `
      <div class="topic">
        <h1 class="topic__title">Artists</h1>
      </div>
      <ul class="artists">
        ${entries
          .map(
            entry =>
              `<li>${entry.path ? `<a href="${escape(entry.path)}">${escape(entry.name)}</a>` : escape(entry.name)} <span class="artists__count">${entry.count}</span></li>`
          )
          .join('\n        ')}
      </ul>
      <p class="topic__back">
        <a href="/">All ${SITE_NAME} wallpapers →</a>
      </p>
    `
  });
}
```

**Шаг 8. Карта сайта.** `sitemap({ items, pages = [], origin })`; строку
с `topics.map(...)` заменить на
`...pages.map(page => url(\`${origin}${page.path}\`, { lastmod: latestOf(page.items) })),`
и сразу за ней `url(\`${origin}/artists\`, { lastmod: latestOf(items) }),`.
Комментарий над строкой поправить: «Страницы для обхода: темы, традиции,
страны, художники».

**Шаг 9. Стили.** В `public/styles.css` рядом с `.tail`/`.topics`: правило
`.topics` удалить (класса больше нет), добавить:

```css
/* Блок под сеткой: подпись слева колонкой, ссылки справа с переносом.
   Подпись набрана тем же кеглем и цветом, но без подчёркивания: её не нажимают.
   На узком экране подпись встаёт над своей строкой. */
.browse {
  display: grid;
  gap: 10rem;
}
.browse__row {
  display: flex;
  flex-wrap: wrap;
  gap: 6rem 18rem;
  margin: 0;
}
.browse__label {
  flex: 0 0 110rem;
  color: var(--fg-faint);
}
@media (max-width: 600px) {
  .browse__label {
    flex-basis: 100%;
  }
}
.artists {
  columns: 16em;
  list-style: none;
  margin: 0;
  padding: 0 var(--gutter);
  font-size: 14rem;
  line-height: 1.9;
}
.artists a {
  text-decoration-color: var(--rule);
  text-underline-offset: 3px;
}
.artists__count {
  color: var(--fg-dim);
  font-size: 12rem;
}
```

`--fg-faint` у подписи — проверить контраст в задаче 4: в `styles.css`
сказано, что ниже `--fg-dim` можно только надписям, которые не читают.
Подпись читают; если на тёмном она теряется, взять `--fg-dim` и отличать
подпись только отсутствием подчёркивания.

**Шаг 10.** `yarn format`, `node --check pages.js`. Коммит — вместе
с задачей 4: без маршрутов страница не собирается.

---

### Задача 4: `server.js`: маршруты

**Файлы:** изменить `server.js`, `collections.js`.

**Шаг 0. Кто ещё зовёт старые сигнатуры.** Задача 3 поменяла доводы
`collectionPage`, `topicPage`, `workPage` и `sitemap`:

```bash
grep -rn "collectionPage\|topicPage\|workPage\|sitemap(" --include=*.js --include=*.mjs . | grep -v node_modules
```

Каждый вызов вне `server.js` (скрипты исследований, превью) перевести
на новые доводы или сказать Charlie, если скрипт чужой.

**Шаг 1. Импорт.** Строку `import { COLLECTIONS, collectionBySlug, worksOf } from './collections.js';`
заменить на `import { artistIndex, artistPageOf, browse, everyPage, pageAt, pagesWith, rows } from './browse.js';`
и добавить `artistsPage` в импорт из `./pages.js`. После правок `grep -n "COLLECTIONS\|worksOf\|collectionBySlug" server.js`
должен быть пуст. Если `collectionBySlug` больше нигде не зовут
(`grep -rn collectionBySlug --include=*.js --include=*.mjs . | grep -v node_modules`),
удалить его из `collections.js` вместе с комментарием (мёртвый код).

**Шаг 2. Указатель.**

```js
async function showCollection(_req, res, next) {
  try {
    const visible = shown(await galleryItems());
    html(res, 200, collectionPage({ items: visible, rows: rows(browse(visible)), origin: SITE_ORIGIN }));
  } catch (error) {
    next(error);
  }
}
```

**Шаг 3. `/collection/:slug`.** Тело: `const found = browse(shown(await galleryItems()));`
`const page = pageAt(found, \`/collection/${req.params.slug}\`);`
`if (!page) return next();` `html(res, 200, topicPage({ topic: page, items: page.items, origin: SITE_ORIGIN }));`
Комментарий о `next()` оставить: он про то же и верен.

**Шаг 4. Художники.** Сразу за ним:

```js
// Художники: указатель и страница на каждого, у кого MIN_WORKS показанных
// работ (browse.js). Неизвестное имя — в `next()`, по той же причине, что
// и у тем: адреса, которого мы не давали, не существует.
app.get('/artists', async (_req, res, next) => {
  try {
    const visible = shown(await galleryItems());
    html(res, 200, artistsPage({ entries: artistIndex(browse(visible), visible), origin: SITE_ORIGIN }));
  } catch (error) {
    next(error);
  }
});

app.get('/artists/:slug', async (req, res, next) => {
  try {
    const page = pageAt(browse(shown(await galleryItems())), `/artists/${req.params.slug}`);
    if (!page) return next();
    html(res, 200, topicPage({ topic: page, items: page.items, origin: SITE_ORIGIN }));
  } catch (error) {
    next(error);
  }
});
```

**Шаг 5. Страница работы.** В `/w/:slug` заменить сборку `others` и `topics`:

```js
    const visible = shown(items);
    const found = browse(visible);
    const artistPage = artistPageOf(found, item);
    // Соседи: сначала другие работы того же художника, если у него есть
    // страница, — подпись над сеткой тогда «More by …», и она должна быть
    // правдой. Добор до ADJACENT — случайный, как было, и по той же причине.
    const sameHand = artistPage ? sample(artistPage.items.filter(work => work !== item), ADJACENT) : [];
    const others = [
      ...sameHand,
      ...sample(
        visible.filter(work => work !== item && !sameHand.includes(work)),
        ADJACENT - sameHand.length
      )
    ];
    html(
      res,
      200,
      workPage({ item, others, pages: pagesWith(found, item), artist: artistPage, origin: SITE_ORIGIN })
    );
```

Старый комментарий о случайном порядке соседей оставить над этим блоком,
комментарий о темах заменить: «Где стоит работа — считается по показанным:
скрытую работу страница не покажет, и звать с её страницы туда нельзя».

**Шаг 6. Карта сайта.**

```js
async function sitemapXml() {
  const items = shown(await galleryItems());
  return sitemap({ items, pages: everyPage(browse(items)), origin: SITE_ORIGIN });
}
```

**Шаг 7. Проверить.** `yarn format && yarn verify` → код 0. `yarn start`, затем:

```bash
for p in / /artists /artists/thomas-cole /artists/yokoyama-taikan /collection/dutch-painting \
  /collection/japanese-painting /collection/british-painting /collection/nihonga \
  /collection/russian-painting /artists/claude-monet /artists/albert-bierstadt; do
  printf '%s %s\n' "$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:3000$p")" "$p"; done
```

Ожидается: 200 у всех, кроме `/collection/russian-painting` и
`/artists/claude-monet` (404). `/artists/albert-bierstadt` — 200 (четыре работы).

```bash
curl -s http://127.0.0.1:3000/artists/yokoyama-taikan | grep -c 'class="item'   # 5
curl -s http://127.0.0.1:3000/artists/thomas-cole | grep -o '<title>[^<]*'
curl -s http://127.0.0.1:3000/ | grep -o 'browse__label">[^<]*'                  # Traditions Countries Moods Artists
curl -s http://127.0.0.1:3000/sitemap.xml | grep -c '<loc>'                      # 166 + 6 стран + 13 художников + /artists = 186
curl -s http://127.0.0.1:3000/w/fruit-piece-huysum-iphone-wallpaper | grep -o 'href="/artists/[^"]*"\|More by [^<]*\|class="in-topic">.*'
```

Вставить в отчёт настоящий вывод, а не описание (AGENTS.md). Счётчик `class="item`
сверить с тем, как `card` называет карточку (`grep -n 'class="item' pages.js`),
и поправить команду, если класс другой.

**Шаг 8. Глазами.** Открыть `/`, `/artists`, `/artists/thomas-cole`,
`/collection/french-painting` и одну работу на 390 и на 1440 px (навык `run`
или claude-in-chrome, снимки). Смотреть: блок под сеткой не спорит с сеткой,
подписи читаются, рассылка встала справа от верха блока или под ним
и не налезла; абзац страны читается фразой; ссылка на художника в подписи
видна, но не кричит.

**Шаг 9. Коммит.**

```bash
git add pages.js server.js collections.js public/styles.css
git commit -m "Страницы художников и стран, блок с подписями под сеткой

Главная звала в четыре темы, и больше ни одна внутренняя страница никуда
не вела. Теперь каждая работа ссылается на художника и на страницы, где стоит,
а указатель — на всё это строками с подписями, чтобы двадцать ссылок читались
оглавлением, а не облаком тегов.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Задача 5: две традиции

**Файлы:** изменить `collections.js`.

Списки готовы: `research/hudson-river-school-collection-picks.json`,
`research/dutch-golden-age-collection-picks.json` (по 20 `ref`, причины
по каждой работе). Тексты — по COLLECTIONS.md; ниже черновик, **перед
коммитом показать Charlie**: абзац пишется ради дословной цитаты. Тире нет
ни в одной строке (правило Charlie).

**Шаг 1.** Добавить в `COLLECTIONS` после `nihonga` две записи; `refs` —
массив из файла выбора, как есть:

```js
  {
    slug: 'hudson-river-school',
    kind: 'tradition',
    name: 'Hudson River School',
    // Состав выбран не глазами, а по истории искусства: художник и годы,
    // не сюжет. Кто решал и почему по каждой работе, и кого оставили за
    // бортом (Rocky Mountain Sheep 1884, цветы Хеда) —
    // research/hudson-river-school-collection-picks.json.
    term: 'Hudson River School',
    title: 'Hudson River School phone wallpapers: free, no account',
    heading: 'Hudson River School',
    description:
      'Hudson River School phone wallpaper from American museum paintings: Thomas Cole, Albert Bierstadt, Kensett. Free, no account.',
    note: ({ count }) =>
      `${count} paintings of the Hudson River School, the American landscape painters of about ` +
      '1825 to 1880, chosen as phone wallpapers. By Thomas Cole, Albert Bierstadt, John Frederick ' +
      'Kensett and others, from public museum collections.',
    terms: ({ count, full }) =>
      `All ${count} are phone wallpapers, ${full} of them at 2160 × 3840 or larger. Free to ` +
      'download and set as your background, no account needed.',
    refs: [/* из research/hudson-river-school-collection-picks.json */]
  },
  {
    slug: 'dutch-golden-age',
    kind: 'tradition',
    name: 'Dutch Golden Age',
    // Выбран по истории искусства, до 1700 года. Ван Хёйсум (род. 1682)
    // сюда не входит, он живописец XVIII века; Корте 1701 — спорный, легче
    // всего вернуть. Разбор — research/dutch-golden-age-collection-picks.json.
    term: 'Dutch Golden Age',
    title: 'Dutch Golden Age phone wallpapers: free, no account',
    heading: 'Dutch Golden Age',
    description:
      'Dutch Golden Age painting as phone wallpaper: still life by Willem Kalf, landscape, church interiors. Free, no account.',
    note: ({ count }) =>
      `${count} paintings from the Dutch Golden Age, the seventeenth century of painting in the ` +
      'Dutch Republic, chosen as phone wallpapers. Mostly still life, by Willem Kalf, Otto Marseus ' +
      'van Schrieck and others, from public museum collections.',
    terms: ({ count, full }) =>
      `All ${count} are phone wallpapers, ${full} of them at 2160 × 3840 or larger. Free to ` +
      'download and set as your background, no account needed.',
    refs: [/* из research/dutch-golden-age-collection-picks.json */]
  },
```

Имена в абзацах — по весу, пересчитать по `provenance.creator` тех же `refs`
(COLLECTIONS.md, «Перечисление — по весу»): у Hudson River School Коул 5 (+1 копия),
Бирштадт 3, дальше по 2 у Кенсетта, Хазелтайна, Иннесса; у Dutch Golden Age
Кальф 11 (+1 копия), Марсеус 2, дальше по одной. Если счёт другой — поправить
имена. «Mostly still life» — проверить счётом: натюрмортов 17 из 20.

`term` — поле, которое читала `inTopics`. После задачи 3 его никто не читает:
`grep -n "\.term\b" *.js` — если пусто, удалить `term` у всех записей
и комментарий к нему (мёртвый код).

**Шаг 2.** `yarn format && yarn verify` → код 0, в выводе
`темы: nihonga — 16, hudson-river-school — 20, dutch-golden-age — 20, …`
и `обход: … тем и традиций 6`.

**Шаг 3.** `curl` обеих страниц: 200, в сетке по 20 карточек, строка
Traditions на главной — три ссылки. Абзац прочитать, сверяя каждое
утверждение с сеткой (COLLECTIONS.md, «Проверки»).

**Шаг 4. Коммит** (после одобрения текстов Charlie).

```bash
git add collections.js
git commit -m "Две традиции: Hudson River School и Dutch Golden Age

Оба слова Google дописывает к wallpaper сам, и под каждое у нас по двадцать
работ. Состав выбран по художнику и годам, а не по сюжету; разбор по каждой
работе лежит в research.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Задача 6: документы и журнал

**Файлы:** `AGENTS.md`, `COLLECTIONS.md`, `research/2026-09-23-browse-pages.md`
(не переписывать, а дописать раздел «Реализация» — файл сегодняшний).

- **AGENTS.md**, список швов: две строки.
  «`artists.js` — кто есть кто в каталоге: одно имя на человека, копии не в
  счёт, и у кого есть страница»;
  «`browse.js` — какие страницы для обхода существуют при данном наборе работ
  и как они перечислены: темы и традиции списком, страны и художники сами».
- **COLLECTIONS.md**, раздел «Ссылки»: ряд под сеткой стал блоком
  с подписями, подпись ссылки — `name`, а не `heading`; на странице работы
  одна строка «In …» вместо «More … phone wallpapers →». Добавить, что `kind`
  обязателен и решает строку.
- **research/2026-09-23-browse-pages.md**: раздел «Реализация»: файлы,
  настоящий вывод проверок из задачи 4 шаг 7, что не проверено и почему.
  Пересобрать `.html` той же командой, что в задаче 0 собирала первый.

```bash
git add AGENTS.md COLLECTIONS.md research/2026-09-23-browse-pages.md research/2026-09-23-browse-pages.html
git commit -m "Документы: швы artists.js и browse.js, ссылки тем по-новому

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Осознанно упрощено в первой версии

- **Абзац страны и художника короче правила.** COLLECTIONS.md просит 50–60
  слов с годами и музеями; здесь около двадцати: этикетка или счёт и имена.
  Годы из `provenance.date` не считаются нарочно: у части работ там годы жизни
  художника, а не картины (vl-0176, vl-0177, vl-0178), и вычисленное «painted
  between» было бы неправдой в тексте, написанном ради цитаты. Музеи тоже:
  у 53 работ в `credit` стоит «Wikimedia Commons». Дописать абзац — после
  починки дат и держателей. Записать это в «Ограничения» журнала (задача 6).
- **`/artists` по алфавиту имени, а не фамилии** («Albert Bierstadt» под A).
  Музеи сортируют по фамилии, но у японских имён фамилия первой, и правило
  сортировки пришлось бы задавать каждому из 76. Если Charlie захочет по
  фамилии — поле `sort` в записи и правило для остальных.

## После шага 1 (не в этом плане)

- Выкладка — `./scripts/deploy.sh`, только с согласия Charlie. IndexNow
  расскажет Bing о новых адресах сам: он читает ту же карту сайта.
- Search Console: Request indexing для `/artists`, двух традиций и шести стран.
- Шаг 3 замысла: сюжеты (landscape, flowers, still life, seascape) листами
  отбора; строка «Subjects» появляется вместе с первой из них.
- Ошибки каталога, найденные субагентом (даты-диапазоны у vl-0176, vl-0177,
  vl-0178 и др.): отдельной задачей, не здесь.
