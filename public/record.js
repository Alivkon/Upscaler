// Словарь одной записи коллекции: её номер, адрес и характеристики.
//
// Пользуются им обе стороны. Сервер зовёт `accession` и `workRef`, собирая
// страницы (`gallery.js`), браузер — их же и `specLine` с `button`, собирая
// приёмку. Считать номер работы по-разному на сервере и в браузере нельзя:
// приёмка показывает будущий номер готового файла, и он должен совпасть
// с тем, который эта же работа получит в коллекции.
//
// DOM здесь трогается только внутри функций, поэтому файл грузится и в Node.

// Инвентарный префикс идёт от имени продукта и меняется вместе с ним —
// и только здесь. «VL·» осталось от рабочего имени Vellum; сайт называется
// Tessarum, и номер на карточке должен читаться как его номер.
//
// Сам `ref` в каталоге по-прежнему `vl-0007`: он ничей не адрес и никому
// не показан, а переименование его стоило бы согласования двух репозиториев
// и сотни с лишним записей, готовых в соседней сессии.
export const ACCESSION_PREFIX = 'TS·';
// Цифрового тире (U+2012) в гарнитуре нет: оно молча подставлялось системным
// шрифтом, то есть третья гарнитура просачивалась на страницу по одному глифу.
// Пустой номер набран коротким тире (U+2013), которое в гарнитуре есть.
export const BLANK_ACCESSION = `${ACCESSION_PREFIX}––––`;

export const formatDims = (width, height) => `${width} × ${height}`;
export const formatBytes = bytes => (bytes >= 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${Math.round(bytes / 1e3)} KB`);

// Формат берётся из типа файла, когда он известен, и из расширения — когда нет.
export function formatType(name, type) {
  const extension = (type ? type.split('/')[1] : name.split('.').pop()) || '';
  return extension.toLowerCase() === 'jpg' ? 'JPEG' : extension.toUpperCase();
}

// Номер выводится из имени файла, а не из позиции в списке: коллекция
// пополняется, а номер — опознавательный признак работы, и меняться под ней
// он не должен.
//
// У кураторских работ номер прописан в каталоге (`ref` в works.js) и стоит
// прямо в строке: `vl-0007`. У файлов, пришедших с обработки, номера нет,
// и он получается свёрткой всего имени.
export function accession(id) {
  const named = /vl-(\d{4})/i.exec(id);
  if (named) return ACCESSION_PREFIX + named[1];
  let number = 0;
  for (const character of id) number = (number * 31 + character.codePointAt(0)) % 10000;
  return ACCESSION_PREFIX + String(number).padStart(4, '0');
}

// Адрес присланной работы — её номер: описать её больше нечем, названия у неё
// нет. У кураторских работ адрес свой, со словами, и лежит в каталоге: имя
// в адресе Google считает признаком, а `vl-0007` не говорит ни о чём.
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
