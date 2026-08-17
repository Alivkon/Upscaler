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

const SITE_NAME = 'Tessarum';
// Сказано про оба вида работ: описание страницы попадает в выдачу,
// а «4k desktop wallpaper» спрашивают отдельно от «phone wallpaper».
const DESCRIPTION =
  'Phone wallpapers at 1440 × 3120, 4K desktop at 3840 × 2160, and engravings from open collections. ' +
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
// В самом `srcset` полного файла нет намеренно. Проёмы, в которых работа
// стоит, — ~200 px в карточке указателя и ~290 px на странице работы, —
// не выигрывают от 1440×3120 ни при какой плотности экрана, а стоит он
// 1,06 МБ против 26 КБ у копии. Десять карточек тянули 10,1 МБ картинок
// при 1,8 КБ разметки.
//
// Копий бывает несколько, и тогда браузер выбирает по `sizes` сам. Одна
// ступень обслуживает либо обычный экран, либо плотный, но не оба сразу:
// карточка в 220 px просит 220 px при DPR 1 и 660 px при DPR 3.
const shownWith = (copies, sizes) =>
  copies.length
    ? ` srcset="${copies.map(copy => `${escape(copy.url)} ${copy.width}w`).join(', ')}" sizes="${sizes}"`
    : '';

// Проём страницы работы задан **высотой**, а не шириной: рамка ростом
// `min(72vh, 620px)`, изображение внутри `height: 100%; width: auto`
// (`styles.css`, `.record--plate`). Ширина, которую займёт работа, поэтому
// зависит от её пропорции, и одним числом на всю коллекцию не выражается.
//
// Здесь она и считается. Раньше стояло `290px` — правда ровно до тех пор,
// пока коллекция состояла из телефонных плашек: 1440×3120 при высоте 562 px
// занимает 258 px. Экранная работа 3840×2160 занимает 996 px, и `290px`
// означали, что браузер честно скачивал копию в 480 px и растягивал её
// вчетверо. Отсюда и мыло: работа была не в фокусе, а в три с половиной раза
// меньше проёма, и «резко» становилось только по нажатию — во весь экран
// открывается сам файл, а не копия.
//
// Числа повторяют `styles.css` и обязаны меняться вместе с ним: высота рамки
// минус её поля сверху и снизу. Завышение безопасно — браузер возьмёт ступень
// крупнее и покажет резко; занижение — это и есть мыло.
const PLATE_HEIGHT = 562; // min(72vh, 620px) минус поля рамки
const PHONE_PLATE_HEIGHT = 322; // то же в раскладке одной колонкой, min(46vh, 380px)

const plateSizes = item => {
  const wide = Math.round((PLATE_HEIGHT * item.width) / item.height);
  const narrow = Math.round((PHONE_PLATE_HEIGHT * item.width) / item.height);
  return `(max-width: 860px) ${narrow}px, ${wide}px`;
};

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
  const shown = shownWith(item.copies, '(max-width: 520px) 90vw, 220px');
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

// Указатель — вся коллекция одной страницей. Постраничность была и снята:
// она показывала первые десять работ, то есть, пока каталог пополняется
// с конца, всегда одни и те же десять, а остальное пряталось за «Next»,
// куда не ходят. Длина страницы стоит разметки, а не байтов: всё, кроме
// первых карточек, грузится лениво.
export function collectionPage({ items, origin }) {
  return layout({
    current: 'collection',
    title: `${SITE_NAME} — phone and 4K desktop wallpapers at full resolution`,
    description: DESCRIPTION,
    canonical: `${origin}/`,
    // Превью для мессенджеров и соцсетей: без него ссылка на коллекцию идёт
    // голой строкой. Берём первую работу — она же и первое, что видит
    // открывший.
    image: items.length ? `${origin}${items[0].url}` : undefined,
    body: `
      <p class="heading">The collection</p>
      ${grid(items, EAGER_CARDS)}
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

// Кто работу сделал. У своих — сайт; у гравюры из открытого собрания — тот,
// кто её награвировал, и подставить сюда `Tessarum` значило бы приписать себе
// чужое авторство в машиночитаемом виде, где его прочтут не глядя. Крой
// авторства не создаёт: выбрать кадр и уменьшить — действие механическое.
//
// Кем именно — решает `creatorKind`, а не догадка по строке. Строка `creator`
// человекочитаемая, и одна и та же разметка соврала бы о ней трояко:
//
//   `unknown` — «Unknown (Japan, Edo period)». На странице это правда, а в
//   разметке `Person` по имени Unknown — утверждение, что такой человек был.
//   Поэтому `creator` не подставляется вовсе: из 144 чужих работ имя есть у 72.
//   `organization` — «U.S. Geological Survey». Имя известно, но это не человек,
//   и `Person` здесь — та же ошибка, что `creator: Tessarum` на гравюре Мериан,
//   только тише: неправда о том, кто именно, а не о том, кто вообще.
//   `person` — умолчание, потому что чаще всего автор всё-таки человек.
const CREATOR_TYPE = { person: 'Person', organization: 'Organization' };

const creatorFields = item => {
  if (!item.provenance) return { creator: { '@type': 'Organization', name: SITE_NAME }, creditText: SITE_NAME };
  const { creator, credit, date, page, creatorKind } = item.provenance;
  const type = CREATOR_TYPE[creatorKind || 'person'];
  return {
    ...(type ? { creator: { '@type': type, name: creator } } : {}),
    creditText: credit || creator,
    ...(date ? { dateCreated: date } : {}),
    isBasedOn: page
  };
};

// Одно изображение на страницу, поэтому и разметка одна. Раньше их было две:
// телефонный и экранный кадры делили страницу. Разобрано это из-за музейных
// работ, у которых кадр ровно один по устройству самой картины, — а раз
// у одних одна картинка на страницу, то у всех.
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
  ...creatorFields(item),
  ...licenseFields(item, origin)
});

// Что о чужой работе говорит её страница: кто автор, из какого собрания файл
// и на каких условиях он свободен. Это обещано на странице условий — «каждая
// такая работа называет автора, собрание и адрес, откуда пришла», — а обещание
// стоит ровно столько, сколько стоит его исполнение. Ссылка ведёт на страницу
// первоисточника, чтобы сказанное можно было проверить, не поверив нам на слово.
//
// У своих работ блока нет: автор у них один на всю коллекцию, и повторять его
// на каждой странице — шум.
function provenance(item) {
  if (!item.provenance) return '';
  const { creator, date, work, credit, page } = item.provenance;
  const made = [creator, date].filter(Boolean).join(', ');
  const held = [work, credit].filter(Boolean).join(' · ');
  const terms = item.license ? `${escape(item.license.name)} · ` : '';
  return `
            <p class="terms__line">${escape(made)}</p>
            ${held ? `<p class="terms__note">${escape(held)}</p>` : ''}
            <p class="terms__note">${terms}<a href="${escape(page)}">Source file</a></p>`;
}

// Работа «до» и стекло, под которым её сравнивают с тем, что вышло.
//
// СРАВНИВАТЬ ЦЕЛЫЕ КАДРЫ БЕССМЫСЛЕННО, И ЭТО АРИФМЕТИКА, А НЕ ВКУС. Проём
// ростом 562 px показывает работу с короткой стороной 3840 примерно в 1/6
// натуральной величины, а увеличивали её как раз в 3–6 раз (`from` у записей
// колеблется от 347×752 до 1440×1106). Проём, таким образом, ровно отменяет
// проделанное: «после», ужатое до 562 px, несёт столько же подробностей,
// сколько «до». Две картинки в этом масштабе обязаны совпасть, и кнопка,
// переключавшая их целиком, честно показывала отсутствие разницы, которой
// там и не могло быть. Разница живёт только при 1:1 — значит, на куске кадра.
//
// Стекло разрезано пополам и показывает ОДИН И ТОТ ЖЕ участок сцены из двух
// файлов: слева исходник, растянутый до размера работы, справа сама работа.
// Растягивает исходник браузер, и это не приём ради наглядности — именно это
// происходит с маленькой фотографией, поставленной на экран 4K. Сравнение
// поэтому показывает не лабораторный опыт, а применение.
//
// Сам файл «до» остаётся в разметке изображением: страница сравнивает два
// файла, и второй из них — такая же часть страницы, как первый. Показывает
// его стекло, фоном, поэтому изображение скрыто; но адрес знает сервер, и
// брать его скрипту неоткуда, кроме разметки. Заодно файл успевает загрузиться
// до того, как за него возьмутся.
const beforeFrame = item => `
            <img class="before" id="work-before" src="${escape(item.before)}" alt="" aria-hidden="true" fetchpriority="low" />
            <div class="loupe" id="work-loupe" aria-hidden="true">
              <span class="loupe__pane loupe__pane--after"></span>
              <span class="loupe__pane loupe__pane--before"></span>
            </div>`;

export function workPage({ item, others, origin }) {
  const size = formatDims(item.width, item.height);
  // «Restored from 750 × 741» — утверждение, и проверить его можно только под
  // стеклом. Поэтому подсказка стоит не у кнопки (кнопки и нет: жест живёт на
  // самой работе) и не отдельной строкой, а вплотную к утверждению, которое
  // ею и проверяют. Условие на `before`, а не на `from`: показывает стекло,
  // а размеры — только повод его открыть.
  const restored = item.from ? `Restored from ${formatDims(...item.from)}` : '';
  // Раньше держать и щёлкать считалось одним жестом, и работа со сравнением
  // за это платила: она не открывалась во весь экран вовсе. Стоило это дорого
  // и незаметно — таких работ 51 из 210, на остальных щелчок работал, и разница
  // читалась не как замысел, а как поломка на каждой четвёртой странице.
  //
  // Жесты разводятся не элементом, а временем: короткое нажатие без сдвига —
  // щелчок, всё остальное — «держат». Различает их work.js; сюда приходят
  // роль и доступное имя, потому что до загрузки скрипта проём уже должен
  // объявлять себя тем, чем окажется.
  const frame = item.before
    ? 'class="record__image has-work is-comparable" role="button" tabindex="0" ' +
      'aria-label="Click to view full size, hold to compare with the original"'
    : 'class="record__image has-work record__image--zoom"';
  // Проём работы задан высотой (`min(72vh, 620px)`), а ширина берётся из
  // пропорции: у телефонного кадра это около 290 px на большом экране
  // и примерно 70vw на телефоне.
  const shownPlate = shownWith(item.copies, plateSizes(item));
  return layout({
    current: 'collection',
    title: `${item.title}, ${size}`,
    description: `${item.alt}. ${size}, ${formatType(item.url)}, ${formatBytes(item.bytes)}.${restored ? ` ${restored}.` : ''} Free download, no sign-up.`,
    canonical: `${origin}/w/${item.slug}`,
    image: `${origin}${item.url}`,
    // Оба кадра объявлены разметкой: в поиск по картинкам попадает файл, а их
    // на странице два, и об экранном иначе не сказано ничего.
    ld: imageObject(item, origin),
    script: '/work.js',
    body: `
      <div class="plate">
        <figure class="record record--plate">
          <div ${frame} id="work-frame">
            <img id="work-picture" src="${escape(item.url)}"${shownPlate} alt="${escape(item.alt)}" width="${item.width}" height="${item.height}" fetchpriority="high" />
            ${item.before ? beforeFrame(item) : ''}
          </div>
        </figure>
        <div class="label">
          <div class="caption">
            <h1 class="caption__title">${escape(item.ref)}</h1>
            <p class="caption__spec">${specLine([size, formatType(item.url), formatBytes(item.bytes)])}</p>
            <div class="actions">
              <a class="btn" href="${escape(item.url)}" download="${escape(item.filename)}">Download</a>
            </div>
          </div>
          <div class="terms" id="work-terms">
            ${restored ? `<p class="terms__line">${restored}${item.before ? '<span class="terms__hint">Click for full size, hold to compare</span>' : ''}</p>` : ''}${provenance(item)}
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
    title: `The Tessarum License`,
    description: 'Tessarum works are free to use, personal and commercial, no attribution required.',
    canonical: `${origin}/license`,
    body: `
      <p class="heading">The Tessarum License</p>
      <div class="prose">
        <p class="prose__lead">
          Works drawn by our own generator come to you under the terms below. Take one, use it,
          change it, sell what you make with it. Two things only are off limits, and both are about
          the collection rather than the picture. Works from open collections are not ours to license
          at all — <a href="#public-domain">those are free of us entirely</a>.
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
            <strong>Republish the collection.</strong> Gathering Tessarum works into a gallery, an app
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
          Works drawn by Tessarum. They are generated by a program we wrote, from palettes and settings
          we chose, and the rights in them are ours to give away on these terms. Images sent in by
          visitors are not ours and we license nothing on their behalf; none are published at present.
        </p>

        <h2 id="public-domain">Works from open collections</h2>
        <p>
          The collection also holds engravings, drawings and paintings that are out of copyright, or
          whose holder has released the photograph of them under CC0. Those carry no terms from us.
          You may do anything with them that you could do with the original file, and nothing on this
          page restricts you.
        </p>
        <p>
          We claim nothing over them by having framed them. Choosing a crop and resizing it is a
          mechanical act and creates no new work, so the file you download is the holder's, not ours.
          Each such work names its author, its source collection and the page it came from, so the
          claim can be checked rather than taken on trust.
        </p>
        <p>
          Age alone is not what makes them free. An engraving from 1705 is out of copyright, but a
          photograph of that engraving can be a new work with a living owner — which is why the
          collection takes only files whose holder has said otherwise in as many words.
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
export function sitemap({ items, origin }) {
  // Даты сравниваются как строки: и `2026-08-16`, и полный ISO начинаются
  // с года, месяца и дня, поэтому порядок совпадает с хронологическим.
  const latestOf = list =>
    list
      .map(item => item.added)
      .filter(Boolean)
      .sort()
      .at(-1);
  // `images` — файл, который у страницы показан. Google берёт из карты именно
  // файлы, а не выводит их из страницы, так что не названный здесь остаётся
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

  const entries = [
    // Указатель один, и его `lastmod` — день последнего пополнения коллекции.
    url(`${origin}/`, { lastmod: latestOf(items) }),
    ...items.map(item =>
      url(`${origin}/w/${item.slug}`, {
        lastmod: item.added,
        images: [`${origin}${item.url}`]
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
