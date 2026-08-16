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
const DESCRIPTION =
  'Vertical phone wallpapers at full resolution, free to download, no sign-up. ' +
  'Restore your own image up to 4× its size.';

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

// Карточка указателя. Ссылок на работу две: изображение и номер. Номер несёт
// текст ссылки, а изображение — единственное, на что посетитель целится.
//
// `--ratio` проставлен здесь, а не по загрузке файла: размеры работы известны
// из каталога, и проём принимает её пропорции ещё до того, как что-то
// загрузилось. Иначе указатель прыгал бы по мере загрузки картинок.
function card(item) {
  const ratio = `${item.width} / ${item.height}`;
  return `<figure class="item">
          <div class="record">
            <a class="record__image" href="/w/${escape(item.slug)}" style="--ratio: ${ratio}" tabindex="-1">
              <img src="${escape(item.url)}" alt="${escape(item.alt)}" width="${item.width}" height="${item.height}" loading="lazy" />
            </a>
          </div>
          <figcaption class="caption">
            <h3 class="caption__title"><a href="/w/${escape(item.slug)}">${escape(item.ref)}</a></h3>
            <p class="caption__spec">${specLine([formatDims(item.width, item.height), formatType(item.url)])}</p>
            <a class="link" href="${escape(item.url)}" download>Download</a>
          </figcaption>
        </figure>`;
}

const grid = items => `<div class="collection">\n        ${items.map(card).join('\n        ')}\n      </div>`;

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
    title: `${SITE_NAME} — phone wallpapers at full resolution${suffix}`,
    description: DESCRIPTION,
    canonical: `${origin}${page > 1 ? `/page/${page}` : '/'}`,
    body: `
      <p class="heading">The collection</p>
      ${grid(items)}
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

const imageObject = (item, origin) => ({
  '@context': 'https://schema.org',
  '@type': 'ImageObject',
  name: item.title,
  description: item.alt,
  contentUrl: `${origin}${item.url}`,
  width: String(item.width),
  height: String(item.height),
  encodingFormat: `image/${formatType(item.url).toLowerCase()}`,
  // Теги пока нигде не образуют страниц: на двенадцати работах вышло бы пять
  // списков по две работы, а тонкие страницы-списки не просто не ранжируются,
  // они вредят. Здесь они всё же читаются — иначе поле было бы мёртвым.
  ...(item.tags.length ? { keywords: item.tags.join(', ') } : {}),
  identifier: item.ref,
  creditText: SITE_NAME,
  creator: { '@type': 'Organization', name: SITE_NAME },
  ...licenseFields(item, origin)
});

export function workPage({ item, others, origin }) {
  const size = formatDims(item.width, item.height);
  const restored = item.from ? `Restored from ${formatDims(...item.from)}` : '';
  // Держать и щёлкать — один жест, поэтому увеличение и сравнение на одном
  // элементе не уживаются: где есть «до», изображение показывает «до»;
  // где нет — открывается во весь экран. Обработчики вешает work.js, а вот
  // роль и доступное имя приходят с сервера: до загрузки скрипта проём уже
  // должен объявлять себя тем, чем он окажется.
  const frame = item.before
    ? 'class="record__image has-work is-comparable" role="button" tabindex="0" ' +
      'aria-label="Hold to see this work before restoration"'
    : 'class="record__image has-work record__image--zoom"';
  return layout({
    current: 'collection',
    title: `${item.title}, ${size}`,
    description: `${item.alt}. ${size}, ${formatType(item.url)}, ${formatBytes(item.bytes)}.${restored ? ` ${restored}.` : ''} Free download, no sign-up.`,
    canonical: `${origin}/w/${item.slug}`,
    image: `${origin}${item.url}`,
    ld: imageObject(item, origin),
    script: '/work.js',
    body: `
      <div class="plate">
        <figure class="record record--plate">
          <div ${frame} id="work-frame">
            <img id="work-picture" src="${escape(item.url)}" alt="${escape(item.alt)}" width="${item.width}" height="${item.height}" />
            ${item.before ? `<img class="before" id="work-before" src="${escape(item.before)}" alt="" aria-hidden="true" />` : ''}
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
export function sitemap({ items, pageCount, origin }) {
  const urls = [
    `${origin}/`,
    ...Array.from({ length: pageCount - 1 }, (_, index) => `${origin}/page/${index + 2}`),
    ...items.map(item => `${origin}/w/${item.slug}`),
    `${origin}/restore`,
    `${origin}/license`
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url><loc>${escape(url)}</loc></url>`).join('\n')}
</urlset>
`;
}

export const robots = ({ origin }) => `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`;
