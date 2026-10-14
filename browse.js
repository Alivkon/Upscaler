// Страницы, по которым коллекцию обходят: темы и традиции (списки в
// collections.js), страны и художники (набираются сами из каталога). Здесь
// решается, какие из них существуют при данном наборе работ и как они
// перечислены; разметка — в pages.js. Разбор — research/2026-09-23-browse-pages.md.
//
// Правило разделения: факт набирает страницу сам, вкус выбирает человек.
// Откуда работа и кто её написал — факты, они в каталоге. Что работа
// «dark academia» — вкус, и это список.
import { ARTISTS, MIN_WORKS, artistOf, displayName } from './artists.js';
import { COLLECTIONS, terms, worksOf } from './collections.js';

// Страна называется на странице прилагательным, а не именем из `origin`.
// Англия — British: пять из двенадцати работ у Уилсона, а он валлиец.
// России здесь нет: все шесть её работ — Айвазовский, и её страница была бы
// его страницей под другим именем. Порядок — по прилагательному: так строка
// стоит под сеткой указателя.
//
// `about` — то, что о стране сказано словами после счёта и имён (14.10.2026):
// чем её картины хороши как обои и где у них встают часы. Чисел в нём нет —
// число, вписанное руками, разъезжается со списком молча (pages.js, `topicPage`).
// Сверено по контактным листам и замеру полосы часов —
// research/2026-10-14-seo-hour.md: японские работы в основном высокие и сверху
// светлые; у Кальфа сверху чёрная стена, у ван Хёйсума и Одюбона сюжет до
// верхнего края; британские и французские приглушены по цвету, но не по
// контрасту — небо светлое, земля тёмная. У стран, чьё подмножество — своя
// традиция (Hudson, нихонга, Golden Age), ссылка туда, обратная — в абзаце
// традиции (collections.js): страницы пересекаются целиком, и связь между
// ними говорит Google, какая о чём. Страна пополняется сама, а абзац нет:
// после каждой новой работы он перечитывается (ADDING.md, шаг 5).
export const COUNTRIES = [
  {
    origin: 'America',
    adjective: 'American',
    about: [
      'Most are landscapes of the ',
      { href: '/collection/hudson-river-school', text: 'Hudson River School' },
      ", with open sky at the top for the clock. Thomas Cole's ",
      { href: '/w/cole-the-garden-eden-desktop-wallpaper', text: 'The Garden of Eden' },
      " frames the screen with trees down both sides. Audubon's birds mostly fill the page to the top " +
        'edge, so the clock lands on a bird. They give the clock no clear space, but they were too charming ' +
        'to leave out.'
    ]
  },
  {
    origin: 'England',
    adjective: 'British',
    about: [
      'Nearly all are wide landscapes in muted browns and olive greens, so app icons stand out against them ' +
        'on a home screen. Most have sky across the top, under the clock.'
    ]
  },
  {
    origin: 'Denmark',
    adjective: 'Danish',
    about: [
      'Ottesen painted flowers and fruit in bright colour on near-black backgrounds. Most of his still lifes ' +
        'have the colour at the bottom, and the top, where the clock is, stays dark. Hammershøi painted ' +
        'empty grey rooms, fields and the old Christiansborg palace, with plain wall or sky at the top.'
    ]
  },
  {
    origin: 'Netherlands',
    adjective: 'Dutch',
    about: [
      'Nearly all are dark. Kalf set his silver and fruit low on a black background, with nothing at the ' +
        "top where the clock goes. Van Huysum's bouquets fill the picture to the top edge, so the clock " +
        'sits on flowers. The seventeenth-century ones are also on a page of their own, ',
      { href: '/collection/dutch-golden-age', text: 'Dutch Golden Age' },
      '.'
    ]
  },
  {
    origin: 'France',
    adjective: 'French',
    about: [
      'Most are landscapes in muted browns and greens. Claude Lorrain and Bertin put tall trees at one side ' +
        'and leave the sky open at the top, behind the clock. Gudin painted the sea, mostly in storms.'
    ]
  },
  {
    origin: 'Japan',
    adjective: 'Japanese',
    about: [
      'Most are tall and narrow, so on a phone you see nearly all of each picture. Many have light silk or ' +
        'gold at the top, behind the clock. Set the clock colour to black, or download the dimmed ' +
        'version. The oldest are Buddhist paintings from the 1300s. In the Meiji years, after Japan opened ' +
        'to the West, some painters took up oil on canvas, among them Yamamoto Hosui, who painted ',
      { href: '/w/the-garden-of-eden-yamamoto-hosui-iphone-wallpaper', text: 'The Garden of Eden' },
      '. Others kept to mineral pigment and ink on silk, the style that came to be called ',
      { href: '/collection/nihonga', text: 'nihonga' },
      '.'
    ]
  }
];

// Анонимы и копии («Unknown (Japan)», «After Thomas Cole») в каталоге
// помечены `creatorKind: 'unknown'`; называть их именем нельзя.
const named = item => item.provenance && item.provenance.creatorKind !== 'unknown';

// Имена по весу: кто чаще, тот первым; равные — по алфавиту, чтобы абзац
// не менялся от перезапуска к перезапуску.
export const leadingNames = items => {
  const counts = new Map();
  for (const item of items.filter(named)) {
    const name = displayName(item);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name]) => name);
};

const listed = names => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`);
const byNames = names => (names.length > 3 ? `${names.slice(0, 3).join(', ')} and others` : listed(names));

// «Works», а не «paintings»: у Америки гравюры Одюбона, у Японии ксилографии
// Киётики. В `title` «painting» остаётся — это слово запроса.
//
// Страницы нет, если работ меньше MIN_COUNTRY_WORKS или художник у них один:
// тогда она повторяла бы его страницу под другим именем (см. Россию выше).
//
// Порог свой, а не художников (MIN_WORKS): до 24.09.2026 он был общий, и когда
// художникам его снизили до двух, стране он остался прежним. С двумя страница
// полагалась бы Германии, Норвегии и Китаю — по две-три работы двух
// художников (Геккель и Фридрих в одной стране), это совпадение, а не традиция.
export const MIN_COUNTRY_WORKS = 4;

function countryPage(country, items) {
  const names = leadingNames(items);
  if (items.length < MIN_COUNTRY_WORKS || names.length < 2) return null;
  const { adjective, about } = country;
  return {
    kind: 'country',
    country,
    path: `/collection/${adjective.toLowerCase()}-painting`,
    name: `${adjective} painting`,
    rowName: adjective,
    title: `${adjective} painting phone wallpapers: free, no account`,
    heading: `${adjective} painting`,
    description: `${adjective} painting as phone wallpaper, from public museum collections: ${listed(names.slice(0, 2))}. Free, no account.`,
    note: ({ count }) => [`${count} ${adjective} works, by ${byNames(names)}. `, ...about],
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
    note: ({ count }) => `${artist.label}. ${count} ${artist.made} in the collection.`,
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
    ).filter(Boolean),
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
// Страница художника ищется по художнику, а не по составу: скрытой работы
// в составе нет, но её автор от этого не меняется, и ссылка на него верна.
export const artistPageOf = (found, item) => found.artists.find(page => page.artist === artistOf(item)) ?? null;

// Блок под сеткой указателя. Пустая строка не выводится: подпись без ссылок
// обещает раздел, которого нет.
export const rows = found =>
  [
    { label: 'Artists', pages: [...found.artists, { path: '/artists', rowName: 'All artists' }] },
    { label: 'Countries', pages: found.countries },
    { label: 'Subjects', pages: found.collections.filter(page => page.kind === 'subject') },
    { label: 'Traditions', pages: found.collections.filter(page => page.kind === 'tradition') },
    { label: 'Moods', pages: found.collections.filter(page => page.kind === 'mood') }
  ]
    .map(row => ({
      label: row.label,
      // Счёт стоит у ссылки, как длительность у трека в списке альбома;
      // у «All artists» его нет — это не страница работ, а указатель.
      links: row.pages.map(page => ({ href: page.path, text: page.rowName, count: page.items?.length }))
    }))
    .filter(row => row.links.length);

// Указатель художников: все названные по имени, по алфавиту, со счётом.
// Адрес — страница художника, а у кого работа одна — сама работа: своей
// страницы у него нет (artists.js, MIN_WORKS), и вся его часть коллекции —
// она. Без адреса остаётся только тот, у кого работ две и больше, а записи
// нет, — это ловит `yarn verify`.
export function artistIndex(found, items) {
  const entries = new Map();
  for (const item of items.filter(named)) {
    const name = displayName(item);
    const entry = entries.get(name) ?? { name, count: 0, page: artistPageOf(found, item), work: item };
    entry.count += 1;
    entries.set(name, entry);
  }
  return [...entries.values()]
    .map(({ name, count, page, work }) => ({
      name,
      count,
      path: page?.path ?? (count === 1 ? `/w/${work.slug}` : null)
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
