// Каталог кураторских работ: всё, что о работе известно заранее.
//
// Здесь лежит и то, чем работа рисуется (палитра, высота свечения, размеры),
// и то, чем она описывается (адрес, заголовок, alt, теги). Раздельно эти два
// набора уже разъезжались: файлы `scripts/render-plates.mjs` называл по
// порядковому номеру, а страница ничего о работе не знала. Одна запись
// на работу, одно место — тогда переименование файла и текст на странице
// не могут разойтись.
//
// Тексты по-английски: см. `research/2026-08-16-indexable-collection.md`,
// раздел «Английский». Комментарии остаются на русском — их читаем мы.
//
// **`slug` не меняется после публикации.** Адрес — это всё, что работа
// накопила в поиске; изменённый slug означает новую страницу с нуля.
//
// `from` — размеры, с которых работа восстановлена: из них
// `scripts/render-plates.mjs` делает файл «до».

export const WORKS = [
  {
    ref: 'vl-0001',
    slug: 'dusk-ridge-dark-gradient-iphone-wallpaper',
    title: 'Dusk Ridge — dark gradient phone wallpaper',
    alt: 'Dark gradient phone wallpaper: layered ridgelines under a low glow, muted purple fading to clay',
    tags: ['gradient', 'dark', 'purple', 'minimalist', 'mountains'],
    dims: [1170, 2532],
    from: [564, 1220],
    stops: ['#2E3350', '#6E5A6B', '#C89B85', '#E8CBAE'],
    sun: 0.72
  },
  {
    ref: 'vl-0002',
    slug: 'cold-harbour-teal-gradient-iphone-wallpaper',
    title: 'Cold Harbour — teal gradient phone wallpaper',
    alt: 'Teal gradient phone wallpaper: cold slate ridgelines under a pale haze, near-black at the top',
    tags: ['gradient', 'dark', 'teal', 'minimalist', 'mountains'],
    dims: [1170, 2532],
    from: [640, 1385],
    stops: ['#10161C', '#1E3038', '#456068', '#8FA6A4'],
    sun: 0.34
  },
  {
    ref: 'vl-0003',
    slug: 'dune-light-warm-sand-iphone-wallpaper',
    title: 'Dune Light — warm sand gradient phone wallpaper',
    alt: 'Warm sand gradient phone wallpaper: soft dune ridges in taupe and cream lit from below',
    tags: ['gradient', 'warm', 'beige', 'minimalist', 'mountains'],
    dims: [1290, 2796],
    from: [736, 1595],
    stops: ['#2A2622', '#5C5147', '#9C8C79', '#E4D8C6'],
    sun: 0.61
  },
  {
    ref: 'vl-0004',
    slug: 'blue-hour-blue-gradient-iphone-wallpaper',
    title: 'Blue Hour — blue gradient phone wallpaper',
    alt: 'Blue gradient phone wallpaper: steel-blue ridgelines under a diffuse light, deep navy sky',
    tags: ['gradient', 'blue', 'dark', 'minimalist', 'mountains'],
    dims: [1170, 2532],
    from: [500, 1082],
    stops: ['#151B2B', '#2C3A55', '#5D6F8C', '#A9B6C4'],
    sun: 0.48
  },
  {
    ref: 'vl-0005',
    slug: 'ember-ridge-dark-orange-android-wallpaper',
    title: 'Ember Ridge — dark orange gradient phone wallpaper',
    alt: 'Dark orange gradient phone wallpaper: ember-lit ridgelines rising from near-black into rust',
    tags: ['gradient', 'dark', 'orange', 'minimalist', 'mountains'],
    dims: [1080, 2340],
    from: [564, 1222],
    stops: ['#1B1315', '#4A2225', '#8E4535', '#D68C5C'],
    sun: 0.66
  },
  {
    ref: 'vl-0006',
    slug: 'ash-grey-minimalist-iphone-wallpaper',
    title: 'Ash Grey — minimalist grey phone wallpaper',
    alt: 'Minimalist grey phone wallpaper: flat ash ridgelines under an overcast glow, no colour cast',
    tags: ['gradient', 'grey', 'dark', 'minimalist', 'mountains'],
    dims: [1170, 2532],
    from: [600, 1298],
    stops: ['#181A1D', '#31363B', '#5A6167', '#93999C'],
    sun: 0.28
  },
  {
    ref: 'vl-0007',
    slug: 'slate-wheat-gradient-iphone-wallpaper',
    title: 'Slate Wheat — grey and wheat gradient phone wallpaper',
    alt: 'Grey and wheat gradient phone wallpaper: cool slate ridgelines warming to pale wheat at the base',
    tags: ['gradient', 'grey', 'beige', 'minimalist', 'mountains'],
    dims: [1290, 2796],
    from: [564, 1222],
    stops: ['#20242B', '#4C5058', '#8A8377', '#D8C8AE'],
    sun: 0.55
  },
  {
    ref: 'vl-0008',
    slug: 'fern-dark-green-gradient-iphone-wallpaper',
    title: 'Fern Dark — dark green gradient phone wallpaper',
    alt: 'Dark green gradient phone wallpaper: fern-toned ridgelines under a muted light, deep forest sky',
    tags: ['gradient', 'dark', 'green', 'minimalist', 'mountains'],
    dims: [1170, 2532],
    from: [736, 1593],
    stops: ['#0E1712', '#1F3324', '#47613F', '#93A97C'],
    sun: 0.44
  },
  {
    ref: 'vl-0009',
    slug: 'violet-haze-muted-android-wallpaper',
    title: 'Violet Haze — muted violet gradient phone wallpaper',
    alt: 'Muted violet gradient phone wallpaper: hazy ridgelines in dusty lilac over a charcoal sky',
    tags: ['gradient', 'violet', 'dark', 'minimalist', 'mountains'],
    dims: [1080, 2340],
    from: [540, 1170],
    stops: ['#1C1B22', '#3A3646', '#6B6478', '#B0A6B4'],
    sun: 0.38
  },
  {
    ref: 'vl-0010',
    slug: 'plum-sunrise-gradient-iphone-wallpaper',
    title: 'Plum Sunrise — plum and peach gradient phone wallpaper',
    alt: 'Plum and peach gradient phone wallpaper: sunrise glow low behind ridgelines, plum sky above',
    tags: ['gradient', 'purple', 'warm', 'minimalist', 'mountains'],
    dims: [1290, 2796],
    from: [640, 1387],
    stops: ['#191722', '#3D3350', '#7E5F76', '#E0AE96'],
    sun: 0.69
  },
  {
    ref: 'vl-0011',
    slug: 'night-tide-deep-teal-iphone-wallpaper',
    title: 'Night Tide — deep teal gradient phone wallpaper',
    alt: 'Deep teal gradient phone wallpaper: cold ridgelines barely lit, almost black at the top edge',
    tags: ['gradient', 'dark', 'teal', 'minimalist', 'mountains'],
    dims: [1170, 2532],
    from: [564, 1220],
    stops: ['#0C1114', '#1D2A30', '#3E555C', '#7E9296'],
    sun: 0.31
  },
  {
    ref: 'vl-0012',
    slug: 'pale-slate-cool-grey-iphone-wallpaper',
    title: 'Pale Slate — cool grey gradient phone wallpaper',
    alt: 'Cool grey gradient phone wallpaper: pale slate ridgelines under an even light, silver at the base',
    tags: ['gradient', 'grey', 'minimalist', 'mountains'],
    dims: [1170, 2532],
    from: [500, 1082],
    stops: ['#22252B', '#474C57', '#7C828E', '#C6CBD2'],
    sun: 0.51
  }
];

// Имя файла складывается по одному правилу и в скрипте рендера, и на сервере:
// разойдись они — страница сослалась бы на несуществующий файл. Слова в имени
// не украшение: Google считает имя файла признаком, а `vl-0001-1170x2532.jpg`
// не говорит ни о чём.
export const plateFile = work => `${work.slug}-${work.dims[0]}x${work.dims[1]}.jpg`;
export const beforeFile = work => `${work.slug}.jpg`;

export const workBySlug = slug => WORKS.find(work => work.slug === slug);
