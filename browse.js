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
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name]) => name);
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
