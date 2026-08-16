// Страница одной работы. По исследованию это и есть главная страница сайта:
// посетитель приходит на неё из Google Images, а не с витрины.

import { SOURCES, accession, entry, formatBytes, formatDims, formatType, specLine, workRef } from './record.js';
import { items } from './collection.js';
import { openLightbox } from './lightbox.js';

const els = {
  plate: document.querySelector('#work-plate'),
  frame: document.querySelector('#work-frame'),
  picture: document.querySelector('#work-picture'),
  before: document.querySelector('#work-before'),
  compare: document.querySelector('#work-compare'),
  terms: document.querySelector('#work-terms'),
  origin: document.querySelector('#work-origin'),
  ref: document.querySelector('#work-ref'),
  spec: document.querySelector('#work-spec'),
  download: document.querySelector('#work-download'),
  strip: document.querySelector('#work-adjacent'),
  stripSection: document.querySelector('#work-adjacent-section'),
  missing: document.querySelector('#work-missing'),
  ld: document.querySelector('#ld')
};

// Описание витрины, к которому надо вернуться, уходя со страницы работы.
const BASE = {
  title: document.title,
  description: document.querySelector('meta[name="description"]').content
};

// Замер идёт асинхронно, а по соседним работам можно щёлкать быстро —
// иначе на страницу попали бы характеристики предыдущей.
let token = 0;

function meta(attribute, value, content) {
  let tag = document.head.querySelector(`meta[${attribute}="${value}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, value);
    document.head.append(tag);
  }
  tag.content = content;
}

// Уходя со страницы работы, описание надо вернуть: иначе превью ссылки на
// витрину описывало бы последнюю открытую работу.
export function clearWork() {
  document.title = BASE.title;
  meta('name', 'description', BASE.description);
  meta('property', 'og:title', BASE.title);
  meta('property', 'og:description', BASE.description);
  els.ld.textContent = '';
}

// Ключевые слова живут здесь, где их читают поисковики и языковые модели,
// и не попадают в видимый текст: скрытый текст — это клоакинг.
function describe(item, width, height, from) {
  const size = formatDims(width, height);
  const ref = accession(item.id);
  // Происхождение попадает и в описание: «восстановлено из» — то, чего о
  // работе не видно по превью, и то же самое, что показывает кнопка «Было».
  const restored = from ? ` Восстановлено из ${from}.` : '';
  // Номер держит заголовок каждой страницы уникальным: названий у работ нет,
  // размеры повторяются, а почти одинаковые <title> — настоящая проблема.
  document.title = `Обои ${size} — ${ref} | Vellum`;
  meta('name', 'description', `Вертикальные обои ${size} в полном разрешении.${restored} Скачивание без регистрации.`);
  meta('property', 'og:title', `Обои ${size} — ${ref}`);
  meta('property', 'og:description', `${size}, полное разрешение, скачивание без регистрации.`);
  els.ld.textContent = JSON.stringify(
    {
      '@context': 'https://schema.org',
      '@type': 'ImageObject',
      name: `Обои ${size} (${ref})`,
      description: `Вертикальные обои ${size} в полном разрешении.${restored}`,
      width: String(width),
      height: String(height),
      encodingFormat: `image/${formatType(item.url).toLowerCase()}`,
      identifier: ref,
      creditText: 'Vellum'
    },
    null,
    2
  );
}

// Вес берётся у самого файла: индекс витрины его не хранит, а оценивать
// по размерам нечестно — сжатие у каждой работы своё.
async function weight(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const length = Number(response.headers.get('content-length'));
    return length ? formatBytes(length) : '';
  } catch {
    return '';
  }
}

function loaded(picture) {
  return new Promise(resolve => {
    if (picture.complete && picture.naturalWidth) return resolve();
    picture.onload = resolve;
    picture.onerror = resolve;
  });
}

// Размер, из которого работа восстановлена, измеряется у самого файла «до»,
// а не берётся из индекса: заявленное происхождение и показываемая картинка
// иначе могли бы разойтись, а сравнение держится именно на том, что не могут.
async function restoredFrom(item, mine) {
  if (!item.before) return '';
  await loaded(els.before);
  if (mine !== token || !els.before.naturalWidth) return '';
  return formatDims(els.before.naturalWidth, els.before.naturalHeight);
}

async function measure(item, mine) {
  await loaded(els.picture);
  const { naturalWidth: width, naturalHeight: height } = els.picture;
  if (mine !== token || !width) return;
  const bytes = await weight(item.url);
  if (mine !== token) return;
  specLine(els.spec, [formatDims(width, height), formatType(item.url), bytes, SOURCES[item.source]]);

  const from = await restoredFrom(item, mine);
  if (mine !== token) return;
  els.origin.textContent = from && `Восстановлено из ${from}`;
  els.origin.hidden = !from;
  describe(item, width, height, from);
}

// Сравнение есть не у всякой работы, и от этого зависит, что делает нажатие
// на изображение: держать и щёлкать — один и тот же жест, поэтому увеличение
// и сравнение на одном элементе не уживаются. Где есть «до», изображение
// показывает «до»; где нет — открывается во весь экран, как раньше.
let comparable = false;

function compare(on) {
  els.frame.classList.toggle('is-degraded', comparable && on);
  els.terms.classList.toggle('is-degraded-type', comparable && on);
}

export async function showWork(reference) {
  const mine = ++token;
  const list = await items().catch(() => []);
  if (mine !== token) return;
  const item = list.find(work => workRef(work.id) === reference);

  els.plate.hidden = !item;
  els.stripSection.hidden = !item;
  els.missing.hidden = Boolean(item);
  compare(false);
  els.origin.hidden = true;
  if (!item) return clearWork();

  els.ref.textContent = accession(item.id);
  els.picture.alt = item.title;
  els.picture.src = item.url;
  els.download.href = item.url;
  els.download.download = decodeURIComponent(item.url.split('/').pop());
  specLine(els.spec, []);

  comparable = Boolean(item.before);
  els.before.src = item.before || '';
  els.compare.hidden = !comparable;
  els.frame.classList.toggle('is-comparable', comparable);
  els.frame.classList.toggle('record__image--zoom', !comparable);
  // Доступное имя описывает работу, а не продаёт её: его читают вслух.
  for (const [name, value] of [
    ['aria-label', `${item.title}. Удерживайте, чтобы увидеть работу до реставрации.`],
    ['role', 'button'],
    ['tabindex', '0']
  ]) {
    if (comparable) els.frame.setAttribute(name, value);
    else els.frame.removeAttribute(name);
  }

  els.strip.replaceChildren(...list.filter(other => other !== item).map(entry));
  measure(item, mine);
}

els.frame.addEventListener('click', () => {
  if (!comparable && els.picture.src) openLightbox(els.picture.src, els.picture.alt);
});

// Держать можно и саму работу, и кнопку. Отпускание ловится вместе с уходом
// указателя за край: без `pointerleave` «до» осталось бы висеть на экране.
for (const element of [els.frame, els.compare]) {
  element.addEventListener('pointerdown', event => {
    if (!comparable) return;
    // Иначе нажатие протащило бы за собой выделение и перетаскивание картинки.
    // Отменять его там, где сравнивать не с чем, нельзя: click после этого
    // не наступит, и работа перестанет открываться во весь экран.
    event.preventDefault();
    compare(true);
  });
  for (const name of ['pointerup', 'pointercancel', 'pointerleave']) {
    element.addEventListener(name, () => compare(false));
  }
  element.addEventListener('keydown', event => {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    event.preventDefault();
    compare(true);
  });
  element.addEventListener('keyup', event => {
    if (event.key === ' ' || event.key === 'Enter') compare(false);
  });
  element.addEventListener('blur', () => compare(false));
}
