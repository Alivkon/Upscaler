// Документы, которые отдаёт сервер: указатель коллекции, страница работы,
// приёмка и обходная поверхность (`sitemap.xml`, `robots.txt`).
//
// Почему разметка собирается здесь, а не в браузере: изображение индексируется
// по странице, на которой оно стоит, и Googlebot исполняет JavaScript вторым
// проходом без гарантий по времени. Страница, собранная скриптом, ненадёжно
// попадает в Google Images — то есть весь смысл коллекции.
//
// Почему на лету, а не сборкой в файлы: правило «`public/` — исходник, а не
// результат сборки» из AGENTS.md описывает положение дел, а не запрещает его
// менять, поэтому решение выведено заново. Статическая генерация выигрывает
// у неизменного набора документов и проигрывает в тот момент, когда публикация
// идёт через сайт: шаг сборки превратил бы каждую публикацию в передеплой.
// Разбор: research/2026-08-16-indexable-collection.md, «Отрисовка на лету».
//
// Тексты по-английски — там же, раздел «Английский». Приёмка тоже: сайт
// с двумя языками в шапке выглядит недоделанным, а не заботливым.

import { formatBytes, formatDims, formatType } from './public/record.js';

const SITE_NAME = 'Vellum';
// Указатель показывает телефонный кадр, но у каждой работы есть и экранный,
// 3840×2160, — и сказано об этом здесь: описание страницы попадает в выдачу,
// а «4k desktop wallpaper» спрашивают отдельно от «phone wallpaper».
const DESCRIPTION =
  'Vertical phone wallpapers at 1440 × 3120, each with a 4K desktop version. ' +
  'Free to download, no sign-up. Restore your own image up to 4× its size.';

// Единственное место, где текст становится разметкой. Имена присланных файлов
// попадают на страницу, а они приходят снаружи.
const escape = value =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const specLine = parts =>
  parts
    .filter(Boolean)
    .map((text, index) => `<span${index === 0 ? ' class="lead"' : ''}>${escape(text)}</span>`)
    .join('');

// Ссылка «Реставрировать своё» стоит после скачивания, а не перед ним:
// пришедший из поиска картинок хочет готовую картинку, и закрыть её гейтом
// значит потерять индексацию, то есть весь актив.
const restoreLink = '<a class="link" href="/restore">Restore your own image</a>';

function layout({ title, description, canonical, image, body, ld, script, current }) {
  const nav = [
    ['/', 'Collection', current !== 'restore'],
    ['/restore', 'Restore', current === 'restore']
  ];
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escape(title)}</title>
    <meta name="description" content="${escape(description)}" />
    <link rel="canonical" href="${escape(canonical)}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:title" content="${escape(title)}" />
    <meta property="og:description" content="${escape(description)}" />
    <meta property="og:url" content="${escape(canonical)}" />
    ${image ? `<meta property="og:image" content="${escape(image)}" />` : ''}
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Sometype+Mono:wght@400..500&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/styles.css" />
    ${ld ? `<script type="application/ld+json">${JSON.stringify(ld, null, 2)}</script>` : ''}
  </head>
  <body>
    <header class="masthead">
      <div class="masthead__mark">${SITE_NAME}</div>
      <nav class="masthead__nav">
        ${nav.map(([href, label, on]) => `<a href="${href}"${on ? ' aria-current="page"' : ''}>${label}</a>`).join('\n        ')}
      </nav>
    </header>
    <main>${body}</main>
    <div class="lightbox" id="lightbox" hidden>
      <button class="lightbox__close" id="lightbox-close" type="button" aria-label="Close">×</button>
      <img class="lightbox__image" id="lightbox-image" alt="" />
    </div>
    <footer class="colophon">
      <span>${SITE_NAME}</span>
      <a href="/license">License</a>
    </footer>
    ${script ? `<script type="module" src="${script}"></script>` : ''}
  </body>
</html>
`;
}

// Сколько карточек грузится сразу. Ленивая загрузка изображения, видного без
// прокрутки, откладывает LCP ровно той страницы, которую мы хотим ранжировать:
// браузер узнаёт о картинке только после раскладки. Сколько карточек в первом
// ряду — зависит от ширины экрана (сетка `repeat(auto-fill, minmax(200px, 1fr))`),
// поэтому берём безусловно четыре: на широком экране это и есть первый ряд,
// на узком три лишние догрузятся чуть раньше, чем понадобятся.
//
// `fetchpriority="high"` — только первой: приоритет имеет смысл, пока он
// у немногих. Проставленный всем четырём, он ставит их в очередь со стилями
// и шрифтом и замедляет ту самую первую.
const EAGER_CARDS = 4;

// Чем показывается кадр, в отличие от того, чем он отдаётся.
//
// Полный файл остаётся в `src`: им работа объявлена поиску, он же стоит
// в `contentUrl` и в карте сайта, его отдаёт «Download», его открывает
// лайтбокс, и он достаётся браузеру, который `srcset` не понимает.
//
// В самом `srcset` полного файла нет намеренно. Проёмы, в которых стоит
// телефонный кадр, — ~200 px в карточке указателя и ~290 px на странице
// работы, — не выигрывают от 1440×3120 ни при какой плотности экрана,
// а стоит он 1,06 МБ против 26 КБ у копии. Десять карточек тянули 10,1 МБ
// картинок при 1,8 КБ разметки.
//
// Отличие от экранного кадра, где 4K в `srcset` есть: там проём шириной
// до 1080 px, и на плотном экране полный файл действительно виден.
const shownWith = (preview, sizes) =>
  preview ? ` srcset="${escape(preview.url)} ${preview.width}w" sizes="${sizes}"` : '';

// Карточка указателя. Ссылок на работу две: изображение и номер. Номер несёт
// текст ссылки, а изображение — единственное, на что посетитель целится.
//
// `--ratio` проставлен здесь, а не по загрузке файла: размеры работы известны
// из каталога, и проём принимает её пропорции ещё до того, как что-то
// загрузилось. Иначе указатель прыгал бы по мере загрузки картинок.
function card(item, { eager = false, priority = false } = {}) {
  const ratio = `${item.width} / ${item.height}`;
  const loading = ` loading="${eager ? 'eager' : 'lazy'}"${priority ? ' fetchpriority="high"' : ''}`;
  // Сетка — `repeat(auto-fill, minmax(200px, 1fr))`: на телефоне это одна
  // колонка почти во всю ширину, дальше карточка держится около 200–220 px.
  const shown = shownWith(item.preview, '(max-width: 520px) 90vw, 220px');
  return `<figure class="item">
          <div class="record">
            <a class="record__image" href="/w/${escape(item.slug)}" style="--ratio: ${ratio}" tabindex="-1">
              <img src="${escape(item.url)}"${shown} alt="${escape(item.alt)}" width="${item.width}" height="${item.height}"${loading} />
            </a>
          </div>
          <figcaption class="caption">
            <h3 class="caption__title"><a href="/w/${escape(item.slug)}">${escape(item.ref)}</a></h3>
            <p class="caption__spec">${specLine([formatDims(item.width, item.height), formatType(item.url)])}</p>
            <a class="link" href="${escape(item.url)}" download>Download</a>
          </figcaption>
        </figure>`;
}

// `eager` — сколько первых карточек грузить сразу. По умолчанию ни одной:
// сетка «ещё из коллекции» на странице работы стоит ниже сгиба, и торопить
// её значит отнимать канал у самой работы.
const grid = (items, eager = 0) =>
  `<div class="collection">\n        ${items
    .map((item, index) => card(item, { eager: index < eager, priority: eager > 0 && index === 0 }))
    .join('\n        ')}\n      </div>`;

// Постраничность: `/` — первая страница, дальше `/page/2`. У первой страницы
// второго адреса нет, иначе один и тот же список лежал бы по двум адресам.
function pager(page, pageCount) {
  if (pageCount < 2) return '';
  const href = number => (number === 1 ? '/' : `/page/${number}`);
  const link = (number, label) =>
    number >= 1 && number <= pageCount ? `<a class="link" href="${href(number)}">${label}</a>` : '';
  return `<nav class="pages" aria-label="Pages">
        ${link(page - 1, 'Previous')}
        <span>Page ${page} of ${pageCount}</span>
        ${link(page + 1, 'Next')}
      </nav>`;
}

export function collectionPage({ items, page, pageCount, origin }) {
  const suffix = page > 1 ? ` — page ${page}` : '';
  return layout({
    current: 'collection',
    title: `${SITE_NAME} — phone and 4K desktop wallpapers at full resolution${suffix}`,
    description: DESCRIPTION,
    canonical: `${origin}${page > 1 ? `/page/${page}` : '/'}`,
    // Превью для мессенджеров и соцсетей: без него ссылка на коллекцию идёт
    // голой строкой. Берём первую работу страницы — она же и первое, что
    // видит открывший.
    image: items.length ? `${origin}${items[0].url}` : undefined,
    body: `
      <p class="heading">The collection</p>
      ${grid(items, EAGER_CARDS)}
      ${pager(page, pageCount)}
      <p class="outro">${restoreLink}</p>
    `
  });
}

// Разметка `ImageObject` даёт Google Images конкретные размеры и подпись,
// а вместе с `license` — значок «Licensable» рядом с результатом. Обязательно
// из двух полей только `license`; `acquireLicensePage` ведёт на саму страницу
// работы, потому что получают файл именно там, а не на странице условий.
//
// Полей нет у присланных работ: лицензии у них нет, а выдумать её нельзя.
const licenseFields = (item, origin) =>
  item.license ? { license: `${origin}${item.license.path}`, acquireLicensePage: `${origin}/w/${item.slug}` } : {};

// `picture` — кадр работы: сама запись (телефонный) или `item.desktop`
// (экранный). Инвентарный номер у обоих один: это одна работа в двух кадрах,
// а не две работы, и разные номера сказали бы обратное.
const imageObject = (item, picture, origin) => ({
  '@context': 'https://schema.org',
  '@type': 'ImageObject',
  name: picture.title,
  description: picture.alt,
  contentUrl: `${origin}${picture.url}`,
  width: String(picture.width),
  height: String(picture.height),
  encodingFormat: `image/${formatType(picture.url).toLowerCase()}`,
  // Теги пока нигде не образуют страниц: на двенадцати работах вышло бы пять
  // списков по две работы, а тонкие страницы-списки не просто не ранжируются,
  // они вредят. Здесь они всё же читаются — иначе поле было бы мёртвым.
  ...(item.tags.length ? { keywords: item.tags.join(', ') } : {}),
  identifier: item.ref,
  creditText: SITE_NAME,
  creator: { '@type': 'Organization', name: SITE_NAME },
  ...licenseFields(item, origin)
});

// Второй кадр той же работы — под первым, отдельным блоком со своей кнопкой.
// Он не превью и не вариант размера: это тот же вид, посчитанный заново под
// пропорцию монитора, и потому показан целиком, а не полоской.
//
// Стоит он ниже работы и грузится лениво: пришедший из поиска пришёл за
// телефонным кадром, и торопить экранный значит отнимать канал у того,
// ради чего страница открыта.
//
// Показан он уменьшенной копией, а скачивается полным: в разметке кадр стоит
// в колонке шириной самое большее 1080 px, и телефон, дотянувший до этого
// блока, иначе выкачивал бы 2 МБ ради картинки в 430 px. В `src` при этом
// остаётся сам 4K — им работа объявлена поиску, и подменять его нельзя;
// выбор делает `srcset`, а `src` достаётся браузеру, который его не понимает.
function wideFrame(desktop) {
  if (!desktop) return '';
  const spec = specLine([
    formatDims(desktop.width, desktop.height),
    formatType(desktop.url),
    formatBytes(desktop.bytes)
  ]);
  const responsive = desktop.preview
    ? ` srcset="${escape(desktop.preview.url)} ${desktop.preview.width}w, ${escape(desktop.url)} ${desktop.width}w"` +
      // Ширина проёма: до 1160 px — колонка за вычетом полей, дальше упирается
      // в 1080 px (`.record--wide` в styles.css).
      ' sizes="(max-width: 1160px) 92vw, 1080px"'
    : '';
  return `<section class="wide">
        <p class="heading">4K desktop wallpaper</p>
        <figure class="record record--wide">
          <div class="record__image has-work record__image--zoom" id="wide-frame">
            <img id="wide-picture" src="${escape(desktop.url)}"${responsive} alt="${escape(desktop.alt)}"
              width="${desktop.width}" height="${desktop.height}" loading="lazy" />
          </div>
        </figure>
        <div class="caption">
          <p class="caption__spec">${spec}</p>
          <a class="btn" href="${escape(desktop.url)}" download="${escape(desktop.filename)}">Download 4K</a>
        </div>
      </section>`;
}

export function workPage({ item, others, origin }) {
  const size = formatDims(item.width, item.height);
  const restored = item.from ? `Restored from ${formatDims(...item.from)}` : '';
  const alsoDesktop = item.desktop
    ? ` Also as a ${formatDims(item.desktop.width, item.desktop.height)} desktop wallpaper.`
    : '';
  // Держать и щёлкать — один жест, поэтому увеличение и сравнение на одном
  // элементе не уживаются: где есть «до», изображение показывает «до»;
  // где нет — открывается во весь экран. Обработчики вешает work.js, а вот
  // роль и доступное имя приходят с сервера: до загрузки скрипта проём уже
  // должен объявлять себя тем, чем он окажется.
  const frame = item.before
    ? 'class="record__image has-work is-comparable" role="button" tabindex="0" ' +
      'aria-label="Hold to see this work before restoration"'
    : 'class="record__image has-work record__image--zoom"';
  // Проём работы задан высотой (`min(72vh, 620px)`), а ширина берётся из
  // пропорции: у телефонного кадра это около 290 px на большом экране
  // и примерно 70vw на телефоне.
  const shownPlate = shownWith(item.preview, '(max-width: 860px) 70vw, 290px');
  return layout({
    current: 'collection',
    title: `${item.title}, ${size}`,
    description: `${item.alt}. ${size}, ${formatType(item.url)}, ${formatBytes(item.bytes)}.${restored ? ` ${restored}.` : ''}${alsoDesktop} Free download, no sign-up.`,
    canonical: `${origin}/w/${item.slug}`,
    image: `${origin}${item.url}`,
    // Оба кадра объявлены разметкой: в поиск по картинкам попадает файл, а их
    // на странице два, и об экранном иначе не сказано ничего.
    ld: item.desktop
      ? [imageObject(item, item, origin), imageObject(item, item.desktop, origin)]
      : imageObject(item, item, origin),
    script: '/work.js',
    body: `
      <div class="plate">
        <figure class="record record--plate">
          <div ${frame} id="work-frame">
            <img id="work-picture" src="${escape(item.url)}"${shownPlate} alt="${escape(item.alt)}" width="${item.width}" height="${item.height}" fetchpriority="high" />
            ${item.before ? `<img class="before" id="work-before" src="${escape(item.before)}" alt="" aria-hidden="true" fetchpriority="low" />` : ''}
          </div>
        </figure>
        <div class="label">
          <div class="caption">
            <h1 class="caption__title">${escape(item.ref)}</h1>
            <p class="caption__spec">${specLine([size, formatType(item.url), formatBytes(item.bytes)])}</p>
            <div class="actions">
              <a class="btn" href="${escape(item.url)}" download="${escape(item.filename)}">Download</a>
              ${item.before ? '<button class="btn btn--ghost" type="button" id="work-compare">Before</button>' : ''}
            </div>
          </div>
          <div class="terms" id="work-terms">
            ${restored ? `<p class="terms__line">${restored}</p>` : ''}
            <p class="terms__cta">${restoreLink}</p>
          </div>
        </div>
      </div>
      ${wideFrame(item.desktop)}
      ${others.length ? `<section class="adjacent"><p class="heading">More in the collection</p>${grid(others)}</section>` : ''}
    `
  });
}

// Приёмка остаётся инструментом на клиенте: индексировать в ней нечего, а её
// содержимое зависит от выбранного файла, которого у сервера нет.
export function intakePage({ origin }) {
  return layout({
    current: 'restore',
    title: `Restore an image — ${SITE_NAME}`,
    description: 'Upscale your own image up to 4× its size, or to 2K and 4K. JPG, PNG and WebP up to 10 MB.',
    canonical: `${origin}/restore`,
    script: '/intake.js',
    body: `
      <div class="plate">
        <figure class="record record--plate">
          <div class="record__image" id="intake-frame" role="button" tabindex="0" aria-label="Choose an image">
            <img id="intake-picture" alt="" hidden />
          </div>
        </figure>
        <div class="label">
          <div class="caption">
            <h1 class="caption__title is-blank" id="intake-ref"></h1>
            <p class="caption__spec" id="intake-spec"></p>
            <div class="actions" id="intake-actions"></div>
            <input class="visually-hidden" type="file" id="intake-file" accept="image/jpeg,image/png,image/webp" />
          </div>
          <div class="terms">
            <p class="terms__line" id="intake-terms"></p>
            <p class="terms__note" id="intake-note"></p>
          </div>
          <!-- Галочка выключена в разметке, а не состоянием: пока публикация
               закрыта, включать её нечем (LEGAL.md, раздел «Сейчас»). -->
          <div class="share" id="intake-share" hidden>
            <label class="share__row">
              <input type="checkbox" id="intake-publish" disabled />
              <span class="share__box" aria-hidden="true"></span>
              <span class="share__text"
                >Add to the collection
                <span class="share__fine" id="intake-share-note"></span>
              </span>
            </label>
          </div>
        </div>
      </div>
    `
  });
}

// Условия, на которых отдаются наши работы. Страница нужна не только людям:
// без неё в Google Images не появляется значок «Licensable», а для него
// обязательно поле `license` со ссылкой на описание условий.
//
// Запрет один, и он ровно про то, чем сайт живёт: коллекция как набор,
// который находят поиском. Тот же запрет — у Unsplash, Pexels и Pixabay,
// и по той же причине.
export function licensePage({ origin }) {
  return layout({
    current: 'collection',
    title: `The Vellum License`,
    description: 'Vellum works are free to use, personal and commercial, no attribution required.',
    canonical: `${origin}/license`,
    body: `
      <p class="heading">The Vellum License</p>
      <div class="prose">
        <p class="prose__lead">
          Every work in this collection is drawn by our own generator. Take it, use it, change it,
          sell what you make with it. Two things only are off limits, and both are about the
          collection rather than the picture.
        </p>

        <h2>You can</h2>
        <ul>
          <li>Download and use the files free of charge, for personal and commercial purposes alike.</li>
          <li>Set them as wallpaper, put them in a design, ship them inside something you sell.</li>
          <li>Crop, recolour and modify them however you like.</li>
          <li>Do all of the above without asking us and without crediting us.</li>
        </ul>

        <h2>You cannot</h2>
        <ul>
          <li>
            <strong>Republish the collection.</strong> Gathering Vellum works into a gallery, an app
            or a stock library that does what this site does is not permitted, whether free or paid.
          </li>
          <li>
            <strong>Sell a file unchanged.</strong> Selling a work as it stands — as a download,
            a print, or on an object whose value is the picture itself — is not permitted.
            Modify it meaningfully and what you made is yours to sell.
          </li>
        </ul>

        <h2>What this covers</h2>
        <p>
          Works published by Vellum, which is every work in the collection today. Images sent in by
          visitors are not ours and we license nothing on their behalf; none are published at present.
        </p>
        <p>
          The works are generated by a program we wrote, from palettes and settings we chose,
          and the rights in them are ours to give away on these terms.
        </p>

        <h2>The ordinary small print</h2>
        <p>
          The files are provided as they are, with no warranty of any kind. We may set different
          terms for works published later; doing so takes nothing away from what you have already
          downloaded, which stays under the terms it carried at the time.
        </p>
      </div>
      <p class="outro">${restoreLink}</p>
    `
  });
}

export function missingPage({ origin }) {
  return layout({
    current: 'collection',
    title: `Not found — ${SITE_NAME}`,
    description: DESCRIPTION,
    canonical: `${origin}/`,
    body: `
      <p class="heading">Not found</p>
      <p class="notice">There is no such work in the collection.</p>
      <p class="outro"><a class="link" href="/">Back to the collection</a></p>
    `
  });
}

// Карта и robots строятся из того же `SITE_ORIGIN`, поэтому верны в день
// появления домена и безвредны до него.
//
// Сверх списка адресов карта несёт две вещи.
//
// `lastmod` — чтобы обход возвращался к изменившемуся, а не ко всему подряд.
// Стоит он только там, где дата действительно известна: у работы это день,
// когда она вошла в коллекцию, у страницы указателя — самая поздняя дата
// на этой самой странице. У `/restore` и `/license` даты нет, и выдумывать
// её нельзя — Google перестаёт учитывать `lastmod` по всему сайту, если
// однажды застал его неверным.
//
// `<image:image>` — весь канал коллекции это поиск по картинкам, а список
// адресов страниц называет изображения лишь косвенно. Изображения объявлены
// у страницы работы (оба её кадра) и не продублированы у указателя: страница
// работы и есть то место, куда мы хотим привести пришедшего из поиска.
export function sitemap({ items, pageSize, origin }) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  // Даты сравниваются как строки: и `2026-08-16`, и полный ISO начинаются
  // с года, месяца и дня, поэтому порядок совпадает с хронологическим.
  const latestOf = list =>
    list
      .map(item => item.added)
      .filter(Boolean)
      .sort()
      .at(-1);
  // `images` — сколько кадров у страницы: у работы их два, телефонный
  // и экранный, и объявлены оба. Google берёт из карты именно файлы, а не
  // выводит их из страницы, так что не названный здесь кадр остаётся
  // ненайденным до тех пор, пока обход не дойдёт до самой страницы.
  const url = (loc, { lastmod, images = [] } = {}) =>
    [
      '  <url>',
      `    <loc>${escape(loc)}</loc>`,
      lastmod ? `    <lastmod>${escape(lastmod)}</lastmod>` : '',
      ...images.map(image => `    <image:image><image:loc>${escape(image)}</image:loc></image:image>`),
      '  </url>'
    ]
      .filter(Boolean)
      .join('\n');

  const pageUrl = number => {
    const shown = items.slice((number - 1) * pageSize, number * pageSize);
    return url(`${origin}${number === 1 ? '/' : `/page/${number}`}`, { lastmod: latestOf(shown) });
  };
  const entries = [
    ...Array.from({ length: pageCount }, (_, index) => pageUrl(index + 1)),
    ...items.map(item =>
      url(`${origin}/w/${item.slug}`, {
        lastmod: item.added,
        images: [`${origin}${item.url}`, item.desktop && `${origin}${item.desktop.url}`].filter(Boolean)
      })
    ),
    url(`${origin}/restore`),
    url(`${origin}/license`)
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${entries.join('\n')}
</urlset>
`;
}

export const robots = ({ origin }) => `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`;
