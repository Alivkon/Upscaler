// Проверка страниц для обхода. Ломается здесь молча и в сторону «страницы нет»:
// художник дорос до своей страницы, а записи о нём нет, — и страница просто
// не появилась; написание имени в каталоге сменилось — и работы ушли от
// художника без единой ошибки. Разбор — research/2026-09-23-browse-pages.md.
import { ARTISTS, MIN_WORKS, artistOf, displayName } from '../artists.js';
import fs from 'node:fs/promises';
import { COLLECTIONS } from '../collections.js';
import { COUNTRIES, artistIndex, browse, everyPage, leadingNames, pageAt, pagesWith, rows } from '../browse.js';
import { accession } from '../public/record.js';
import { CATALOGUE_DIR, workFile } from '../works.js';

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
expect(
  'копия после Коула',
  artistOf(work('c', 'After Thomas Cole (unidentified copyist)', 'America', 'unknown')),
  null
);
expect('не записанный художник', artistOf(work('d', 'Claude Monet')), null);
expect('имя записанного', displayName(work('e', 'Yokoyama Taikan (1868-1958)')), 'Yokoyama Taikan');
expect('годы снимаются с незаписанного', displayName(work('f', 'Kobayashi Kokei (1883-1957)')), 'Kobayashi Kokei');
expect('годы с вопросом', displayName(work('g', 'Kaji Tameya (?-1894)')), 'Kaji Tameya');
expect('порог', MIN_WORKS, 4);

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
expect(
  'строка «In» без художника',
  pagesWith(sample, fixture[0]).map(page => page.path),
  ['/collection/american-painting']
);
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
const records = await Promise.all(
  names.map(async name => JSON.parse(await fs.readFile(workFile(name.slice(0, -5)), 'utf8')))
);
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
  if (!['tradition', 'mood'].includes(topic.kind))
    complain(`collections.js/${topic.slug}: kind не tradition и не mood`);
  if (!topic.name) complain(`collections.js/${topic.slug}: нет name`);
}
const paths = everyPage(real).map(page => page.path);
if (new Set(paths).size !== paths.length) complain('две страницы с одним адресом');
for (const page of everyPage(real)) {
  if (page.title.length > 65) complain(`${page.path}: title ${page.title.length} знаков, выдача обрежет`);
  if (page.description.length > 160) complain(`${page.path}: description ${page.description.length} знаков`);
}

if (problems.length) {
  for (const problem of problems) console.error(`  ${problem}`);
  console.error(`\nобход: ${problems.length} проблем`);
  process.exit(1);
}
console.log(
  `обход: художников ${real.artists.length}, стран ${real.countries.length}, тем и традиций ${real.collections.length}`
);
