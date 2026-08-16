// Каталог кураторских работ: всё, что о работе известно заранее.
//
// Здесь лежит и то, чем работа рисуется (палитра, высота свечения), и то, чем
// она описывается (адрес, заголовок, alt, теги). Раздельно эти два
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
// Размеров кадра в записи нет: работа выходит в двух кадрах, общих для всех
// работ, — они в `RENDITIONS` ниже.
//
// `from` — размеры, с которых работа восстановлена: из них
// `scripts/render-plates.mjs` делает файл «до». Кратность восстановления
// у каждой работы своя (от 3,2× до 4,7×) и при смене кадра сохранена:
// это то, что страница про работу утверждает.
//
// `added` — день, когда работа вошла в коллекцию. Отсюда берётся `lastmod`
// в карте сайта: время изменения файла не годится, потому что рендер
// переписывает его при каждом запуске и объявлял бы неизменную работу
// изменившейся. Порядок на указателе задаёт порядок записей в этом массиве,
// а не дата: коллекция — развеска, а не лента.
//
// Отсюда же следует, что **у опубликованной работы файл больше не меняется**:
// изображения отдаются с годовым кэшем (server.js), и правка настроек рендера
// до уже вышедшей работы не дойдёт. Новые настройки — для новых работ.

export const WORKS = [
  {
    ref: 'vl-0001',
    slug: 'dusk-ridge-dark-gradient-iphone-wallpaper',
    title: 'Dusk Ridge — dark gradient phone wallpaper',
    alt: 'Dark gradient phone wallpaper: layered ridgelines under a low glow, muted purple fading to clay',
    tags: ['gradient', 'dark', 'purple', 'minimalist', 'mountains'],
    added: '2026-08-16',
    from: [347, 752],
    stops: ['#2E3350', '#6E5A6B', '#C89B85', '#E8CBAE'],
    sun: 0.72
  },
  {
    ref: 'vl-0002',
    slug: 'cold-harbour-teal-gradient-iphone-wallpaper',
    title: 'Cold Harbour — teal gradient phone wallpaper',
    alt: 'Teal gradient phone wallpaper: cold slate ridgelines under a pale haze, near-black at the top',
    tags: ['gradient', 'dark', 'teal', 'minimalist', 'mountains'],
    added: '2026-08-16',
    from: [394, 854],
    stops: ['#10161C', '#1E3038', '#456068', '#8FA6A4'],
    sun: 0.34
  },
  {
    ref: 'vl-0003',
    slug: 'dune-light-warm-sand-iphone-wallpaper',
    title: 'Dune Light — warm sand gradient phone wallpaper',
    alt: 'Warm sand gradient phone wallpaper: soft dune ridges in taupe and cream lit from below',
    tags: ['gradient', 'warm', 'beige', 'minimalist', 'mountains'],
    added: '2026-08-16',
    from: [411, 891],
    stops: ['#2A2622', '#5C5147', '#9C8C79', '#E4D8C6'],
    sun: 0.61
  },
  {
    ref: 'vl-0004',
    slug: 'blue-hour-blue-gradient-iphone-wallpaper',
    title: 'Blue Hour — blue gradient phone wallpaper',
    alt: 'Blue gradient phone wallpaper: steel-blue ridgelines under a diffuse light, deep navy sky',
    tags: ['gradient', 'blue', 'dark', 'minimalist', 'mountains'],
    added: '2026-08-16',
    from: [308, 667],
    stops: ['#151B2B', '#2C3A55', '#5D6F8C', '#A9B6C4'],
    sun: 0.48
  },
  {
    ref: 'vl-0005',
    slug: 'ember-ridge-dark-orange-android-wallpaper',
    title: 'Ember Ridge — dark orange gradient phone wallpaper',
    alt: 'Dark orange gradient phone wallpaper: ember-lit ridgelines rising from near-black into rust',
    tags: ['gradient', 'dark', 'orange', 'minimalist', 'mountains'],
    added: '2026-08-16',
    from: [376, 815],
    stops: ['#1B1315', '#4A2225', '#8E4535', '#D68C5C'],
    sun: 0.66
  },
  {
    ref: 'vl-0006',
    slug: 'ash-grey-minimalist-iphone-wallpaper',
    title: 'Ash Grey — minimalist grey phone wallpaper',
    alt: 'Minimalist grey phone wallpaper: flat ash ridgelines under an overcast glow, no colour cast',
    tags: ['gradient', 'grey', 'dark', 'minimalist', 'mountains'],
    added: '2026-08-16',
    from: [369, 800],
    stops: ['#181A1D', '#31363B', '#5A6167', '#93999C'],
    sun: 0.28
  },
  {
    ref: 'vl-0007',
    slug: 'slate-wheat-gradient-iphone-wallpaper',
    title: 'Slate Wheat — grey and wheat gradient phone wallpaper',
    alt: 'Grey and wheat gradient phone wallpaper: cool slate ridgelines warming to pale wheat at the base',
    tags: ['gradient', 'grey', 'beige', 'minimalist', 'mountains'],
    added: '2026-08-16',
    from: [315, 683],
    stops: ['#20242B', '#4C5058', '#8A8377', '#D8C8AE'],
    sun: 0.55
  },
  {
    ref: 'vl-0008',
    slug: 'fern-dark-green-gradient-iphone-wallpaper',
    title: 'Fern Dark — dark green gradient phone wallpaper',
    alt: 'Dark green gradient phone wallpaper: fern-toned ridgelines under a muted light, deep forest sky',
    tags: ['gradient', 'dark', 'green', 'minimalist', 'mountains'],
    added: '2026-08-16',
    from: [453, 982],
    stops: ['#0E1712', '#1F3324', '#47613F', '#93A97C'],
    sun: 0.44
  },
  {
    ref: 'vl-0009',
    slug: 'violet-haze-muted-android-wallpaper',
    title: 'Violet Haze — muted violet gradient phone wallpaper',
    alt: 'Muted violet gradient phone wallpaper: hazy ridgelines in dusty lilac over a charcoal sky',
    tags: ['gradient', 'violet', 'dark', 'minimalist', 'mountains'],
    added: '2026-08-16',
    from: [360, 780],
    stops: ['#1C1B22', '#3A3646', '#6B6478', '#B0A6B4'],
    sun: 0.38
  },
  {
    ref: 'vl-0010',
    slug: 'plum-sunrise-gradient-iphone-wallpaper',
    title: 'Plum Sunrise — plum and peach gradient phone wallpaper',
    alt: 'Plum and peach gradient phone wallpaper: sunrise glow low behind ridgelines, plum sky above',
    tags: ['gradient', 'purple', 'warm', 'minimalist', 'mountains'],
    added: '2026-08-16',
    from: [357, 774],
    stops: ['#191722', '#3D3350', '#7E5F76', '#E0AE96'],
    sun: 0.69
  },
  {
    ref: 'vl-0011',
    slug: 'night-tide-deep-teal-iphone-wallpaper',
    title: 'Night Tide — deep teal gradient phone wallpaper',
    alt: 'Deep teal gradient phone wallpaper: cold ridgelines barely lit, almost black at the top edge',
    tags: ['gradient', 'dark', 'teal', 'minimalist', 'mountains'],
    added: '2026-08-16',
    from: [347, 752],
    stops: ['#0C1114', '#1D2A30', '#3E555C', '#7E9296'],
    sun: 0.31
  },
  {
    ref: 'vl-0012',
    slug: 'pale-slate-cool-grey-iphone-wallpaper',
    title: 'Pale Slate — cool grey gradient phone wallpaper',
    alt: 'Cool grey gradient phone wallpaper: pale slate ridgelines under an even light, silver at the base',
    tags: ['gradient', 'grey', 'minimalist', 'mountains'],
    added: '2026-08-16',
    from: [308, 667],
    stops: ['#22252B', '#474C57', '#7C828E', '#C6CBD2'],
    sun: 0.51
  }
];

// На каких условиях отдаётся работа. Условия — свойство работы, а не сайта:
// плашка нарисована нами, а картина из открытой коллекции музея придёт под
// CC0, и один адрес на обе не годится. Поэтому у записи есть поле `license`,
// а `DEFAULT_LICENSE` — то, что подставляется, пока его не задали.
//
// Сейчас запись здесь одна, потому что и работ пока двенадцать и все наши.
// Когда появится первая музейная, ей заводится `{ cc0: { … } }` и в её записи
// каталога — `license: 'cc0'`. Присланные посетителями работы не наши, и
// лицензии у них нет вовсе: `gallery.js` не подставляет им ничего.
export const DEFAULT_LICENSE = 'vellum';
export const LICENSES = {
  vellum: { path: '/license', name: 'Vellum License' }
};

// Кадры, в которых выходит каждая работа. Размеры общие для всех работ, а не
// свойство записи: раньше у каждой были свои (1080, 1170, 1290 в ширину), но
// это были три размера одной и той же пропорции 19,5:9 — разнообразие в цифрах
// и ничего в кадре.
//
// 1440×3120 — панель самого крупного телефона, который сейчас выпускают
// (Galaxy S24/S25 Ultra). 1320×2868 у iPhone 16 Pro Max и 1344×2992
// у Pixel 9 Pro XL укладываются внутрь с небольшим уменьшением, а обои,
// которых экрану не хватило, растягиваются — это видно.
//
// 3840×2160 — тот же кадр для монитора. Не растянутый: композиция считается
// от пропорции кадра, см. `COMPOSITIONS` в scripts/render-plates.mjs.
//
// `preview` — размер уменьшенной копии, которой страница кадр показывает
// (см. `previewFile` ниже). Он есть не у всякого кадра: у телефонного его
// пока нет, и такой кадр показывается собой, как показывался всегда.
// `preview` — размеры копии, которой страница показывает кадр. Полный файл
// при этом никуда не девается: он в `src`, в разметке для поиска и под кнопкой
// «Download», — но показывать его нельзя. Телефонный кадр стоит в карточке
// указателя шириной ~200 px и в проёме работы шириной ~290 px; 1440×3120 —
// это в полсотни раз больше пикселей, чем в карточку помещается, и 1,06 МБ
// на каждую из десяти.
//
// 720 покрывает оба проёма с запасом на плотный экран: карточку при DPR 3
// (600 px) и работу при DPR 2 (580 px). Копия весит 26 КБ вместо 1,06 МБ.
export const RENDITIONS = [
  { key: 'phone', dims: [1440, 3120], preview: [720, 1560] },
  { key: 'desktop', dims: [3840, 2160], preview: [1600, 900] }
];
// Имя файла складывается по одному правилу и в скрипте рендера, и на сервере:
// разойдись они — страница сослалась бы на несуществующий файл. Слова в имени
// не украшение: Google считает имя файла признаком, а `vl-0001-1170x2532.jpg`
// не говорит ни о чём.
//
// По той же причине в имени экранного файла стоит `desktop-wallpaper`:
// `…-iphone-wallpaper-3840x2160.jpg` говорил бы о файле для монитора неправду.
// Адрес работы при этом не меняется — `slug` остаётся тем, чем был.
const stemOf = (work, rendition) =>
  rendition.key === 'phone' ? work.slug : work.slug.replace(/(iphone|android)-wallpaper$/, 'desktop-wallpaper');

export const plateFile = (work, rendition) => {
  const [width, height] = rendition.dims;
  return `${stemOf(work, rendition)}-${width}x${height}.jpg`;
};

// Файл, который страница отдаёт, и картинка, которой она его показывает, —
// не одно и то же. Экранный кадр весит 2 МБ, а стоит в колонке шириной самое
// большее 1080 px: на телефоне это 2 МБ ради картинки в 430 px. Поэтому рядом
// с ним лежит уменьшенная копия для показа, а сам 4K остаётся и в `src`,
// и в `srcset` — им работа объявлена поиску, и подменять его нельзя.
//
// 1600×900 у экранного кадра — с запасом на плотный экран: колонка в 1080 px
// при DPR 1 и телефон в 430 px при DPR 3 обе укладываются, а на DPR 2 браузер
// возьмёт сам 4K.
//
// Имя копии складывается тем же правилом, что и имя кадра: то же основание,
// свои размеры. Второй схемы имён нет — плашка, «до» и копия для показа лежат
// в одном каталоге, и по имени должно быть видно, что это одна работа.
export const previewFile = (work, rendition) =>
  rendition.preview && `${stemOf(work, rendition)}-${rendition.preview[0]}x${rendition.preview[1]}.jpg`;

// Тексты работы написаны про телефонный кадр: «phone wallpaper» стоит и
// в заголовке, и в `alt`. Экранный кадр — та же работа на другом экране,
// и заводить ей вторые заголовок и alt значит завести два описания одной вещи,
// которые однажды разойдутся. Поэтому слово подставляется здесь — и это же
// обязывает писать в каталоге именно «phone wallpaper».
export const desktopText = text => text.replace('phone wallpaper', 'desktop wallpaper');
export const beforeFile = work => `${work.slug}.jpg`;

export const workBySlug = slug => WORKS.find(work => work.slug === slug);
