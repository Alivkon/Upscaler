// Что о работе сказано словами. Одна запись — одна работа — одна страница.
//
// Здесь нет ничего о том, как работа сделана: ни палитры, ни света, ни
// размеров. Это уехало в соседний репозиторий `wallpaper-gen`, который рисует
// файлы и пишет рядом с ними `images/manifest.json`. Сайт соединяется с ним
// по `ref` и **сам имён файлов не складывает** — иначе два репозитория
// однажды разошлись бы, и страница сослалась бы на несуществующий файл.
//
// Порядок записей в этом массиве и есть порядок на указателе. Не по дате:
// коллекция — развеска, а не лента.
//
// **`slug` не меняется после публикации.** Адрес — это всё, что работа
// накопила в поиске; изменённый slug означает новую страницу с нуля.
// Живёт он именно здесь, а не у генератора: адрес страницы — дело сайта,
// имя файла — дело того, кто файл сделал, и совпадение слов в них удобно,
// но не обязательно.
//
// Телефонная и экранная работы — две записи, не одна с двумя кадрами.
// Раньше было иначе, и разобрано это из-за музейных работ: 16:9 и 9:19,5
// не могут оба сохранить половину холста, поэтому у картины кадр ровно один
// и какой именно — свойство картины. Пары остаются видны только глазу.
//
// Тексты по-английски: см. `research/2026-08-16-indexable-collection.md`,
// раздел «Английский». Комментарии остаются на русском — их читаем мы.
//
// `added` — день, когда работа вошла в коллекцию. Отсюда `lastmod` в карте
// сайта: время изменения файла не годится, рендер переписывает его при каждом
// запуске и объявлял бы неизменную работу изменившейся.

export const WORKS = [
  {
    ref: 'vl-0001',
    slug: 'dusk-ridge-dark-gradient-iphone-wallpaper',
    title: 'Dusk Ridge — dark gradient phone wallpaper',
    alt: 'Dark gradient phone wallpaper: layered ridgelines under a low glow, muted purple fading to clay',
    tags: ['gradient', 'dark', 'purple', 'minimalist', 'mountains'],
    added: '2026-08-16'
  },
  {
    ref: 'vl-0013',
    slug: 'dusk-ridge-dark-gradient-desktop-wallpaper',
    title: 'Dusk Ridge — dark gradient desktop wallpaper',
    alt: 'Dark gradient desktop wallpaper: layered ridgelines under a low glow, muted purple fading to clay',
    tags: ['gradient', 'dark', 'purple', 'minimalist', 'mountains'],
    added: '2026-08-16'
  },
  {
    ref: 'vl-0002',
    slug: 'cold-harbour-teal-gradient-iphone-wallpaper',
    title: 'Cold Harbour — teal gradient phone wallpaper',
    alt: 'Teal gradient phone wallpaper: cold slate ridgelines under a pale haze, near-black at the top',
    tags: ['gradient', 'dark', 'teal', 'minimalist', 'mountains'],
    added: '2026-08-16'
  },
  {
    ref: 'vl-0014',
    slug: 'cold-harbour-teal-gradient-desktop-wallpaper',
    title: 'Cold Harbour — teal gradient desktop wallpaper',
    alt: 'Teal gradient desktop wallpaper: cold slate ridgelines under a pale haze, near-black at the top',
    tags: ['gradient', 'dark', 'teal', 'minimalist', 'mountains'],
    added: '2026-08-16'
  },
  {
    ref: 'vl-0003',
    slug: 'dune-light-warm-sand-iphone-wallpaper',
    title: 'Dune Light — warm sand gradient phone wallpaper',
    alt: 'Warm sand gradient phone wallpaper: soft dune ridges in taupe and cream lit from below',
    tags: ['gradient', 'warm', 'beige', 'minimalist', 'mountains'],
    added: '2026-08-16'
  },
  {
    ref: 'vl-0015',
    slug: 'dune-light-warm-sand-desktop-wallpaper',
    title: 'Dune Light — warm sand gradient desktop wallpaper',
    alt: 'Warm sand gradient desktop wallpaper: soft dune ridges in taupe and cream lit from below',
    tags: ['gradient', 'warm', 'beige', 'minimalist', 'mountains'],
    added: '2026-08-16'
  },
  {
    ref: 'vl-0004',
    slug: 'blue-hour-blue-gradient-iphone-wallpaper',
    title: 'Blue Hour — blue gradient phone wallpaper',
    alt: 'Blue gradient phone wallpaper: steel-blue ridgelines under a diffuse light, deep navy sky',
    tags: ['gradient', 'blue', 'dark', 'minimalist', 'mountains'],
    added: '2026-08-16'
  },
  {
    ref: 'vl-0016',
    slug: 'blue-hour-blue-gradient-desktop-wallpaper',
    title: 'Blue Hour — blue gradient desktop wallpaper',
    alt: 'Blue gradient desktop wallpaper: steel-blue ridgelines under a diffuse light, deep navy sky',
    tags: ['gradient', 'blue', 'dark', 'minimalist', 'mountains'],
    added: '2026-08-16'
  },
  {
    ref: 'vl-0005',
    slug: 'ember-ridge-dark-orange-android-wallpaper',
    title: 'Ember Ridge — dark orange gradient phone wallpaper',
    alt: 'Dark orange gradient phone wallpaper: ember-lit ridgelines rising from near-black into rust',
    tags: ['gradient', 'dark', 'orange', 'minimalist', 'mountains'],
    added: '2026-08-16'
  },
  {
    ref: 'vl-0017',
    slug: 'ember-ridge-dark-orange-desktop-wallpaper',
    title: 'Ember Ridge — dark orange gradient desktop wallpaper',
    alt: 'Dark orange gradient desktop wallpaper: ember-lit ridgelines rising from near-black into rust',
    tags: ['gradient', 'dark', 'orange', 'minimalist', 'mountains'],
    added: '2026-08-16'
  },
  {
    ref: 'vl-0006',
    slug: 'ash-grey-minimalist-iphone-wallpaper',
    title: 'Ash Grey — minimalist grey phone wallpaper',
    alt: 'Minimalist grey phone wallpaper: flat ash ridgelines under an overcast glow, no colour cast',
    tags: ['gradient', 'grey', 'dark', 'minimalist', 'mountains'],
    added: '2026-08-16'
  },
  {
    ref: 'vl-0018',
    slug: 'ash-grey-minimalist-desktop-wallpaper',
    title: 'Ash Grey — minimalist grey desktop wallpaper',
    alt: 'Minimalist grey desktop wallpaper: flat ash ridgelines under an overcast glow, no colour cast',
    tags: ['gradient', 'grey', 'dark', 'minimalist', 'mountains'],
    added: '2026-08-16'
  },
  {
    ref: 'vl-0007',
    slug: 'slate-wheat-gradient-iphone-wallpaper',
    title: 'Slate Wheat — grey and wheat gradient phone wallpaper',
    alt: 'Grey and wheat gradient phone wallpaper: cool slate ridgelines warming to pale wheat at the base',
    tags: ['gradient', 'grey', 'beige', 'minimalist', 'mountains'],
    added: '2026-08-16'
  },
  {
    ref: 'vl-0019',
    slug: 'slate-wheat-gradient-desktop-wallpaper',
    title: 'Slate Wheat — grey and wheat gradient desktop wallpaper',
    alt: 'Grey and wheat gradient desktop wallpaper: cool slate ridgelines warming to pale wheat at the base',
    tags: ['gradient', 'grey', 'beige', 'minimalist', 'mountains'],
    added: '2026-08-16'
  },
  {
    ref: 'vl-0008',
    slug: 'fern-dark-green-gradient-iphone-wallpaper',
    title: 'Fern Dark — dark green gradient phone wallpaper',
    alt: 'Dark green gradient phone wallpaper: fern-toned ridgelines under a muted light, deep forest sky',
    tags: ['gradient', 'dark', 'green', 'minimalist', 'mountains'],
    added: '2026-08-16'
  },
  {
    ref: 'vl-0020',
    slug: 'fern-dark-green-gradient-desktop-wallpaper',
    title: 'Fern Dark — dark green gradient desktop wallpaper',
    alt: 'Dark green gradient desktop wallpaper: fern-toned ridgelines under a muted light, deep forest sky',
    tags: ['gradient', 'dark', 'green', 'minimalist', 'mountains'],
    added: '2026-08-16'
  },
  {
    ref: 'vl-0009',
    slug: 'violet-haze-muted-android-wallpaper',
    title: 'Violet Haze — muted violet gradient phone wallpaper',
    alt: 'Muted violet gradient phone wallpaper: hazy ridgelines in dusty lilac over a charcoal sky',
    tags: ['gradient', 'violet', 'dark', 'minimalist', 'mountains'],
    added: '2026-08-16'
  },
  {
    ref: 'vl-0021',
    slug: 'violet-haze-muted-desktop-wallpaper',
    title: 'Violet Haze — muted violet gradient desktop wallpaper',
    alt: 'Muted violet gradient desktop wallpaper: hazy ridgelines in dusty lilac over a charcoal sky',
    tags: ['gradient', 'violet', 'dark', 'minimalist', 'mountains'],
    added: '2026-08-16'
  },
  {
    ref: 'vl-0010',
    slug: 'plum-sunrise-gradient-iphone-wallpaper',
    title: 'Plum Sunrise — plum and peach gradient phone wallpaper',
    alt: 'Plum and peach gradient phone wallpaper: sunrise glow low behind ridgelines, plum sky above',
    tags: ['gradient', 'purple', 'warm', 'minimalist', 'mountains'],
    added: '2026-08-16'
  },
  {
    ref: 'vl-0022',
    slug: 'plum-sunrise-gradient-desktop-wallpaper',
    title: 'Plum Sunrise — plum and peach gradient desktop wallpaper',
    alt: 'Plum and peach gradient desktop wallpaper: sunrise glow low behind ridgelines, plum sky above',
    tags: ['gradient', 'purple', 'warm', 'minimalist', 'mountains'],
    added: '2026-08-16'
  },
  {
    ref: 'vl-0011',
    slug: 'night-tide-deep-teal-iphone-wallpaper',
    title: 'Night Tide — deep teal gradient phone wallpaper',
    alt: 'Deep teal gradient phone wallpaper: cold ridgelines barely lit, almost black at the top edge',
    tags: ['gradient', 'dark', 'teal', 'minimalist', 'mountains'],
    added: '2026-08-16'
  },
  {
    ref: 'vl-0023',
    slug: 'night-tide-deep-teal-desktop-wallpaper',
    title: 'Night Tide — deep teal gradient desktop wallpaper',
    alt: 'Deep teal gradient desktop wallpaper: cold ridgelines barely lit, almost black at the top edge',
    tags: ['gradient', 'dark', 'teal', 'minimalist', 'mountains'],
    added: '2026-08-16'
  },
  {
    ref: 'vl-0012',
    slug: 'pale-slate-cool-grey-iphone-wallpaper',
    title: 'Pale Slate — cool grey gradient phone wallpaper',
    alt: 'Cool grey gradient phone wallpaper: pale slate ridgelines under an even light, silver at the base',
    tags: ['gradient', 'grey', 'minimalist', 'mountains'],
    added: '2026-08-16'
  },
  {
    ref: 'vl-0024',
    slug: 'pale-slate-cool-grey-desktop-wallpaper',
    title: 'Pale Slate — cool grey gradient desktop wallpaper',
    alt: 'Cool grey gradient desktop wallpaper: pale slate ridgelines under an even light, silver at the base',
    tags: ['gradient', 'grey', 'minimalist', 'mountains'],
    added: '2026-08-16'
  }
];

// На каких условиях отдаётся работа. Условия — свойство работы, а не сайта:
// плашка нарисована нами, а картина из открытой коллекции музея придёт под
// CC0, и один адрес на обе не годится. Поэтому у записи есть поле `license`,
// а `DEFAULT_LICENSE` — то, что подставляется, пока его не задали.
//
// Сейчас запись здесь одна, потому что и работы пока все наши. Когда появится
// первая музейная, ей заводится `{ cc0: { … } }` и в её записи каталога —
// `license: 'cc0'`. Присланные посетителями работы не наши, и лицензии у них
// нет вовсе: `gallery.js` не подставляет им ничего.
export const DEFAULT_LICENSE = 'vellum';
export const LICENSES = {
  vellum: { path: '/license', name: 'Vellum License' }
};
