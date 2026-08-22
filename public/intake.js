// Приёмка: один файл проходит через измерение, обработку и выдачу.

import { BLANK_ACCESSION, accession, button, formatBytes, formatDims, formatType, specLine } from './record.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const FILE_REQUIREMENTS = 'JPG, PNG and WebP up to 10 MB.';
// Размеры результата — те же, что принимает server.js.
const OUTPUT_SIZES = [
  ['x2', '×2'],
  ['x4', '×4'],
  ['2k', '2K'],
  ['4k', '4K']
];

const els = {
  frame: document.querySelector('#intake-frame'),
  picture: document.querySelector('#intake-picture'),
  ref: document.querySelector('#intake-ref'),
  spec: document.querySelector('#intake-spec'),
  actions: document.querySelector('#intake-actions'),
  file: document.querySelector('#intake-file'),
  terms: document.querySelector('#intake-terms'),
  note: document.querySelector('#intake-note'),
  share: document.querySelector('#intake-share'),
  shareNote: document.querySelector('#intake-share-note'),
  treat: document.querySelector('#intake-treat'),
  crop: document.querySelector('#intake-crop')
};
let received = null; // выбранный файл и его измеренные размеры
let restored = null; // готовая работа: имя файла и адрес
let outputSize = OUTPUT_SIZES[0][0];
let objectUrl = null;

const chooseFile = () => els.file.click();

// Галочки запираются, пока задача выполняется и пока готовый файл на экране:
// снятая после отправки, галочка описывала бы не тот файл, который показан,
// а нажатая на готовом — обещала бы переделку, которой не будет. Открывает
// их обратно выбор другого файла, то есть возврат в состояние «измерено».
// Приглушать строку отдельным классом не нужно: `.options__row:has(input:disabled)`
// в styles.css уже гасит её и убирает курсор-указатель.
const setOptions = enabled => {
  els.treat.disabled = !enabled;
  els.crop.disabled = !enabled;
};

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
      reject(new Error('That image could not be displayed.'));
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

// Телефонный кадр. Те же 9:19.5, что режет `treatment.js` на сервере; здесь
// число повторено, потому что строка «Result — …» обязана называть то, что
// придёт, а спросить об этом сервер до отправки нельзя.
const PHONE_RATIO = 9 / 19.5;

// Тот же расчёт, что в `targetLongestSideFor` из server.js: во что упирается
// длинная сторона результата. Короткая может разойтись с сервером на пиксель —
// там её округляет sharp.
//
// Кадр учитывается здесь же: галочка меняет не отделку, а размер файла,
// и строка условий, называющая размер до кадрирования, обещала бы не тот файл.
function resultSize(width, height) {
  const longest = Math.max(width, height);
  const target =
    outputSize === 'x2' ? longest * 2 : outputSize === 'x4' ? longest * 4 : outputSize === '2k' ? 2048 : 4096;
  const ratio = target / longest;
  const grown = [Math.round(width * ratio), Math.round(height * ratio)];
  if (!els.crop.checked) return grown;
  const [w, h] = grown;
  return w / h > PHONE_RATIO ? [Math.round(h * PHONE_RATIO), h] : [w, Math.round(w / PHONE_RATIO)];
}

// Выбор размера стоит в строке условий, а не в настройках: это свойство
// изготавливаемой работы и естественное место, где позже разойдётся цена.
function scaleSwitch() {
  const group = document.createElement('span');
  group.className = 'scale';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', 'Output size');
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

function renderEmpty() {
  // Номера здесь нет намеренно. Стоял `TS·––––` — тот же формат, что несут
  // работы коллекции (`TS·0205`), и на пустой приёмке он читался как слот,
  // ожидающий одну из наших работ: Чарли прочёл его именно так и решил, что
  // страница просит выбрать что-нибудь с витрины. Номер честен ровно с того
  // момента, когда файл готов и номер у него есть, — там он и появляется.
  els.ref.textContent = '';
  els.ref.classList.add('is-blank');
  specLine(els.spec, ['No picture yet']);
  els.actions.replaceChildren(button('Choose my picture', 'btn', chooseFile));
  // Строка условий во всех состояниях отвечает на один вопрос — что получится.
  // Выбран файл: «Result — 2880 × 3840». Не выбран: то же самое, но пока
  // о любом файле. Раньше здесь стояла подсказка про перетаскивание, и
  // страница, на которую ведут все ссылки «Restore your own image», ни словом
  // не говорила, что делает; узнать это можно было, только загрузив файл.
  // Подсказка ушла к остальным практическим сведениям, в примечание.
  els.terms.textContent = 'Your picture, enlarged up to 4×, big enough for a 1440 × 3120 phone screen';
  // «Nothing is published without your consent» отсюда убрано и ничем
  // не заменено. Фраза описывала публикацию, которой нет: маршрут закрыт
  // (LEGAL.md), галочка выключена, чужие файлы не выходят на витрину никогда.
  // Обещание о том, чего не происходит, — лишний повод задуматься, происходит
  // ли; а любая замена вроде «мы не храним ваши картинки» была бы обещанием
  // о приватности, которое пришлось бы потом держать.
  els.note.textContent = `Drop a file anywhere on the page. ${FILE_REQUIREMENTS}`;
  els.note.classList.remove('is-error');
  els.share.hidden = true;
  setOptions(true);
}

function renderMeasured() {
  const { file, width, height } = received;
  els.ref.textContent = BLANK_ACCESSION;
  els.ref.classList.add('is-blank');
  specLine(els.spec, [formatDims(width, height), formatType(file.name, file.type), formatBytes(file.size)]);
  // Кнопка называет то, что выйдет, а не то, что с картинкой сделают:
  // «Restore» держалось на слове, которого в значении «увеличить» не знают,
  // и на странице ему негде было объясниться. Размер стоит и в строке
  // условий — повтор нарочный: в строке это обещание, на кнопке — действие.
  //
  // Глагол при этом выведен, а не вписан. «2K» и «4K» — не кратности, а
  // absolute-размеры без нижнего порога (`targetLongestSideFor` в server.js),
  // и картинка 3000 × 4000, отправленная в 2K, вернётся **меньше**, чем
  // пришла. Кнопка со словом «Enlarge» сказала бы в этом случае неправду —
  // а размер рядом с ней тут же эту неправду и показывает.
  const result = resultSize(width, height);
  const verb = Math.max(...result) > Math.max(width, height) ? 'Enlarge' : 'Resize';
  els.actions.replaceChildren(
    button(`${verb} to ${formatDims(...result)}`, 'btn', restore),
    button('Choose another', 'btn btn--ghost', chooseFile)
  );
  els.terms.replaceChildren(`Result, ${formatDims(...result)} `, scaleSwitch());
  els.note.textContent = 'Free for now: payment and accounts come later.';
  els.note.classList.remove('is-error');
  els.share.hidden = true;
  setOptions(true);
}

function renderWorking() {
  els.frame.classList.add('is-working');
  const waiting = button('Working…', 'btn');
  waiting.disabled = true;
  els.actions.replaceChildren(waiting);
  // Переключатель размера убирается вместе с кнопкой: пока задача выполняется,
  // размер уже выбран, а нажатие на него перерисовало бы страницу в состояние
  // «измерено» — и с неё можно было бы отправить вторую задачу поверх первой.
  els.terms.textContent = `Result, ${formatDims(...resultSize(received.width, received.height))}`;
  els.note.textContent = 'Processing runs on the server and can take a few minutes.';
  els.note.classList.remove('is-error');
  setOptions(false);
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
  download.textContent = 'Download';
  els.actions.replaceChildren(download, button('Do another', 'btn btn--ghost', chooseFile));
  els.terms.textContent = `Source, ${formatDims(received.width, received.height)}`;
  // Скачивание ничем не закрыто: показан тот же файл полного разрешения,
  // который отдаёт кнопка. Гейтинг — признак ad-фермы.
  els.note.textContent = 'This page shows the full-resolution file, the same one you download.';
  els.note.classList.remove('is-error');
  els.shareNote.textContent = 'Not available at the moment: the work stays with you and is deleted after 30 days.';
  els.share.hidden = false;
  setOptions(false);
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
  body.append('treat', String(els.treat.checked));
  body.append('crop', String(els.crop.checked));
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
// Кадр меняет размер результата, а размер стоит в строке условий. Перерисовка
// только когда файл уже выбран: до этого называть нечего.
els.crop.addEventListener('change', () => received && renderMeasured());
els.frame.addEventListener('click', () => !received && chooseFile());
els.frame.addEventListener('keydown', event => {
  if (!received && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault();
    chooseFile();
  }
});

// Обработчика у флажка нет: публикация пользовательских загрузок закрыта, пока
// не пройден чек-лист из LEGAL.md, и включать её нечем. Строка на странице всё
// же остаётся — намерение видно, а обещание «пока недоступно» выполняется тем,
// что нажимать не на что. Отказывает и сам маршрут в server.js: «выключено» на
// одной разметке держаться не может.

// Файл принимает вся страница целиком: приёмка — это отдельный адрес, и
// перехватывать перетаскивание здесь больше не у кого.
let dragDepth = 0;
addEventListener('dragenter', event => {
  event.preventDefault();
  dragDepth++;
  document.body.classList.add('is-dragging');
});
addEventListener('dragover', event => event.preventDefault());
addEventListener('dragleave', () => {
  if (--dragDepth <= 0) document.body.classList.remove('is-dragging');
});
addEventListener('drop', event => {
  event.preventDefault();
  dragDepth = 0;
  document.body.classList.remove('is-dragging');
  receive(event.dataTransfer.files[0]);
});

// Пустая запись рисуется скриптом, а не приходит с сервера: номера у неё ещё
// нет, характеристик тоже, и всё, что тут есть, зависит от выбранного файла.
renderEmpty();
