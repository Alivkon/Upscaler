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
export const displayName = item => artistOf(item)?.name ?? item.provenance.creator.replace(/\s*\([^()]*\d{4}\)$/, '');
