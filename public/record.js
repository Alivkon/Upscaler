// Одна запись коллекции: её номер, характеристики и карточка на витрине.
// Этим словарём пользуются все три страницы, поэтому он лежит отдельно.

// Название продукта ещё не выбрано (research/2026-08-16-HANDOVER.md, пункт 1).
// «Vellum» — рабочее имя из прототипов; инвентарный префикс от него же,
// поэтому меняются они вместе и только здесь.
export const ACCESSION_PREFIX = 'VL·';
// Цифрового тире (U+2012) в гарнитуре нет: оно молча подставлялось системным
// шрифтом, то есть третья гарнитура просачивалась на страницу по одному глифу.
// Пустой номер набран коротким тире (U+2013), которое в гарнитуре есть.
export const BLANK_ACCESSION = `${ACCESSION_PREFIX}––––`;

// Витрина различает кураторские работы и присланные посетителями. На карточке
// этой метки нет: строка характеристик там шириной в колонку, и четвёртый
// элемент переносится, оставляя точку-разделитель висеть в конце строки.
// Происхождение показано на странице работы, где место есть.
export const SOURCES = { llm: 'LLM', shared: 'Сообщество' };

export const formatDims = (width, height) => `${width} × ${height}`;
export const formatBytes = bytes =>
  bytes >= 1e6 ? `${(bytes / 1e6).toFixed(1).replace('.', ',')} МБ` : `${Math.round(bytes / 1e3)} КБ`;

// Формат берётся из типа файла, когда он известен, и из расширения — когда нет.
export function formatType(name, type) {
  const extension = (type ? type.split('/')[1] : name.split('.').pop()) || '';
  return extension.toLowerCase() === 'jpg' ? 'JPEG' : extension.toUpperCase();
}

// Номер выводится из имени файла, а не из позиции в списке: витрина
// переставляется при каждом пополнении, а номер — опознавательный признак
// работы, и меняться под ней он не должен.
//
// Если номер уже стоит в имени — так называет файлы `scripts/render-plates.mjs`
// (`vl-0007-1170x2532.png`), — берётся он. У файлов, пришедших с обработки,
// номера в имени нет, и он получается свёрткой всего имени.
export function accession(id) {
  const named = /vl-(\d{4})/i.exec(id);
  if (named) return ACCESSION_PREFIX + named[1];
  let number = 0;
  for (const character of id) number = (number * 31 + character.codePointAt(0)) % 10000;
  return ACCESSION_PREFIX + String(number).padStart(4, '0');
}

// Адрес работы — её номер: номер и есть опознавательный признак записи,
// поэтому больше ничего в адресе не нужно.
export const workRef = id => `vl-${accession(id).slice(ACCESSION_PREFIX.length)}`;

// Первый элемент строки — разрешение, и он остаётся самым светлым: это
// единственный факт, которого не даёт превью в поиске, и причина клика.
export function specLine(target, parts) {
  const shown = parts.filter(Boolean);
  target.replaceChildren(
    ...shown.map((text, index) => {
      const span = document.createElement('span');
      // «Изображения пока нет» — не характеристика, поэтому в одиночку не светлеет
      if (index === 0 && shown.length > 1) span.className = 'lead';
      span.textContent = text;
      return span;
    })
  );
}

export function button(text, className, onClick) {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = className;
  element.textContent = text;
  if (onClick) element.addEventListener('click', onClick);
  return element;
}

// Карточка витрины. Ведёт на страницу работы: адрес лежит в `data-ref`,
// а обрабатывается клик один раз на всю страницу — в app.js.
export function entry(item) {
  const figure = document.createElement('figure');
  figure.className = 'item';
  figure.dataset.ref = workRef(item.id);
  figure.innerHTML =
    '<div class="record"><div class="record__image"><img loading="lazy" /></div></div>' +
    `<figcaption class="caption"><h3 class="caption__title">${accession(item.id)}</h3>` +
    '<p class="caption__spec"></p><a class="link" download>Скачать</a></figcaption>';
  const picture = figure.querySelector('img');
  picture.src = item.url;
  picture.alt = item.title;
  figure.querySelector('.link').href = item.url;
  // Размер измеряется у настоящего файла: индекс витрины его не хранит,
  // а придумывать нечего. Вся строка собирается по загрузке, чтобы
  // разрешение не появлялось после остальных характеристик.
  //
  // Оттуда же берутся пропорции проёма: паспарту вокруг работы одинаковое
  // у всех записей, а окно — в её собственных пропорциях (см. styles.css).
  picture.addEventListener('load', () => {
    figure.style.setProperty('--ratio', `${picture.naturalWidth} / ${picture.naturalHeight}`);
    specLine(figure.querySelector('.caption__spec'), [
      formatDims(picture.naturalWidth, picture.naturalHeight),
      formatType(item.url)
    ]);
  });
  return figure;
}
