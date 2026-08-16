// Приёмка: один файл проходит через измерение, обработку и выдачу.

import { BLANK_ACCESSION, accession, button, formatBytes, formatDims, formatType, specLine } from './record.js';
import { show as showCollection } from './collection.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const FILE_REQUIREMENTS = 'Допустимы JPG, PNG и WebP до 10 МБ.';
// Размеры результата — те же, что принимает server.js.
const OUTPUT_SIZES = [
  ['x2', '×2'],
  ['x4', '×4'],
  ['2k', '2K'],
  ['4k', '4K']
];

const els = {
  view: document.querySelector('#intake-view'),
  frame: document.querySelector('#intake-frame'),
  picture: document.querySelector('#intake-picture'),
  ref: document.querySelector('#intake-ref'),
  spec: document.querySelector('#intake-spec'),
  actions: document.querySelector('#intake-actions'),
  file: document.querySelector('#intake-file'),
  terms: document.querySelector('#intake-terms'),
  note: document.querySelector('#intake-note'),
  share: document.querySelector('#intake-share'),
  publish: document.querySelector('#intake-publish'),
  shareNote: document.querySelector('#intake-share-note')
};
let received = null; // выбранный файл и его измеренные размеры
let restored = null; // готовая работа: имя файла и адрес
let outputSize = OUTPUT_SIZES[0][0];
let objectUrl = null;

const chooseFile = () => els.file.click();

// Изображение показывается по настоящему адресу — локальному для выбранного
// файла и серверному для готовой работы, — поэтому размеры берутся замером,
// а не расчётом.
function showPicture(source) {
  return new Promise((resolve, reject) => {
    els.picture.onload = () => {
      els.picture.hidden = false;
      els.frame.classList.add('has-work');
      // проём перестаёт быть кнопкой «выбрать»: в нём уже есть работа
      for (const attribute of ['role', 'tabindex', 'aria-label']) els.frame.removeAttribute(attribute);
      resolve();
    };
    els.picture.onerror = () => {
      els.picture.hidden = true;
      els.frame.classList.remove('has-work');
      reject(new Error('Не удалось показать изображение.'));
    };
    els.picture.src = source;
  });
}

async function receive(file) {
  if (!file) return;
  if (!ACCEPTED_TYPES.has(file.type) || file.size > MAX_FILE_SIZE) return renderFailed(FILE_REQUIREMENTS);
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(file);
  try {
    await showPicture(objectUrl);
  } catch (error) {
    return renderFailed(error.message);
  }
  received = { file, width: els.picture.naturalWidth, height: els.picture.naturalHeight };
  restored = null;
  renderMeasured();
}

// Тот же расчёт, что в `targetLongestSideFor` из server.js: во что упирается
// длинная сторона результата. Короткая может разойтись с сервером на пиксель —
// там её округляет sharp.
function resultSize(width, height) {
  const longest = Math.max(width, height);
  const target =
    outputSize === 'x2' ? longest * 2 : outputSize === 'x4' ? longest * 4 : outputSize === '2k' ? 2048 : 4096;
  const ratio = target / longest;
  return [Math.round(width * ratio), Math.round(height * ratio)];
}

// Выбор размера стоит в строке условий, а не в настройках: это свойство
// изготавливаемой работы и естественное место, где позже разойдётся цена.
function scaleSwitch() {
  const group = document.createElement('span');
  group.className = 'scale';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', 'Размер результата');
  for (const [value, label] of OUTPUT_SIZES) {
    const choice = button(label, '', () => {
      outputSize = value;
      renderMeasured();
    });
    choice.setAttribute('aria-pressed', String(value === outputSize));
    group.append(choice);
  }
  return group;
}

export function renderEmpty() {
  els.ref.textContent = BLANK_ACCESSION;
  els.ref.classList.add('is-blank');
  specLine(els.spec, ['Изображения пока нет']);
  els.actions.replaceChildren(button('Выбрать изображение', 'btn', chooseFile));
  els.terms.textContent = 'Перетащите файл в любое место страницы';
  els.note.textContent = `${FILE_REQUIREMENTS} Ничего не публикуется без вашего согласия.`;
  els.note.classList.remove('is-error');
  els.share.hidden = true;
}

function renderMeasured() {
  const { file, width, height } = received;
  els.ref.textContent = BLANK_ACCESSION;
  els.ref.classList.add('is-blank');
  specLine(els.spec, [formatDims(width, height), formatType(file.name, file.type), formatBytes(file.size)]);
  els.actions.replaceChildren(
    button('Реставрировать', 'btn', restore),
    button('Выбрать другое', 'btn btn--ghost', chooseFile)
  );
  els.terms.replaceChildren(`Результат — ${formatDims(...resultSize(width, height))} `, scaleSwitch());
  els.note.textContent = 'Пока бесплатно: оплата и аккаунты появятся позже.';
  els.note.classList.remove('is-error');
  els.share.hidden = true;
}

function renderWorking() {
  els.frame.classList.add('is-working');
  const waiting = button('Обработка…', 'btn');
  waiting.disabled = true;
  els.actions.replaceChildren(waiting);
  // Переключатель размера убирается вместе с кнопкой: пока задача выполняется,
  // размер уже выбран, а нажатие на него перерисовало бы страницу в состояние
  // «измерено» — и с неё можно было бы отправить вторую задачу поверх первой.
  els.terms.textContent = `Результат — ${formatDims(...resultSize(received.width, received.height))}`;
  els.note.textContent = 'Обработка идёт на сервере и может занять несколько минут.';
  els.note.classList.remove('is-error');
}

function renderFinished() {
  els.frame.classList.remove('is-working');
  // Номер тот же, который работа получит на витрине: их связывает имя файла.
  els.ref.textContent = accession(`generated/${restored.filename}`);
  els.ref.classList.remove('is-blank');
  specLine(els.spec, [formatDims(els.picture.naturalWidth, els.picture.naturalHeight), formatType(restored.url)]);
  const download = document.createElement('a');
  download.className = 'btn';
  download.href = restored.url;
  download.download = restored.filename;
  download.textContent = 'Скачать';
  els.actions.replaceChildren(download, button('Реставрировать ещё', 'btn btn--ghost', chooseFile));
  els.terms.textContent = `Исходник — ${formatDims(received.width, received.height)}`;
  // Скачивание ничем не закрыто: показан тот же файл полного разрешения,
  // который отдаёт кнопка. Гейтинг — признак ad-фермы.
  els.note.textContent = 'На странице показан файл полного разрешения — тот же, что скачивается.';
  els.note.classList.remove('is-error');
  els.publish.checked = false;
  els.publish.disabled = false;
  els.shareNote.textContent = 'Только если изображение ваше и вы вправе его публиковать.';
  els.share.hidden = false;
}

// Авария возвращает страницу в предыдущее состояние и говорит, что случилось:
// заметна она светлотой, а не цветом — хроматического акцента здесь нет вообще.
function renderFailed(message) {
  els.frame.classList.remove('is-working');
  if (received) renderMeasured();
  else renderEmpty();
  els.note.textContent = message;
  els.note.classList.add('is-error');
}

async function restore() {
  renderWorking();
  const body = new FormData();
  body.append('photo', received.file);
  body.append('output_size', outputSize);
  try {
    const response = await fetch('/api/upscale', { method: 'POST', body });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    restored = { filename: data.filename, url: data.url };
    await showPicture(data.url);
    renderFinished();
  } catch (error) {
    renderFailed(error.message);
  }
}

els.file.addEventListener('change', () => receive(els.file.files[0]));
els.frame.addEventListener('click', () => !received && chooseFile());
els.frame.addEventListener('keydown', event => {
  if (!received && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault();
    chooseFile();
  }
});

// Флажок выключен по умолчанию, и это делает настоящую работу: витрина остаётся
// кураторской, а не потоком пользовательских загрузок. Отменить публикацию
// нечем, поэтому после успеха флажок больше не трогается.
els.publish.addEventListener('change', async () => {
  if (!els.publish.checked || !restored) return;
  els.publish.disabled = true;
  try {
    const response = await fetch(`/api/gallery/share/${encodeURIComponent(restored.filename)}`, { method: 'POST' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    showCollection(data.images);
    els.shareNote.textContent = 'Работа встала первой в коллекции.';
  } catch (error) {
    els.publish.checked = false;
    els.publish.disabled = false;
    els.shareNote.textContent = error.message;
  }
});

// Файл принимает вся страница целиком, но только когда открыта приёмка:
// на витрине перехватывать перетаскивание не за чем.
let dragDepth = 0;
addEventListener('dragenter', event => {
  if (els.view.hidden) return;
  event.preventDefault();
  dragDepth++;
  document.body.classList.add('is-dragging');
});
addEventListener('dragover', event => {
  if (!els.view.hidden) event.preventDefault();
});
addEventListener('dragleave', () => {
  if (--dragDepth <= 0) document.body.classList.remove('is-dragging');
});
addEventListener('drop', event => {
  if (els.view.hidden) return;
  event.preventDefault();
  dragDepth = 0;
  document.body.classList.remove('is-dragging');
  receive(event.dataTransfer.files[0]);
});
