// Приёмка: один файл проходит через измерение, обработку и выдачу.

import { BLANK_ACCESSION, accession, button, formatBytes, formatDims, formatType, specLine } from './record.js';
// Только правила размера: сам счёт и его рантайм на шесть мегабайт грузятся
// по требованию, уже из `restoreLocally`.
import { TOO_BIG, resultLongestSide, targetLongestSideFor } from './upscale-local.js';

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
  crop: document.querySelector('#intake-crop'),
  privacy: document.querySelector('#intake-privacy')
};

// Строка над кнопкой отвечает на вопрос «куда уедет мой файл», и ответов два,
// потому что путей два. Разметка приходит с первым (pages.js); второй ставится
// здесь, когда посетителю предложено посчитать у нас и когда так и посчитали.
const STAYS_HERE = 'Enlarged in your own browser; your picture stays on your device.';
const SENT_TO_US = 'Enlarged on our server; your picture is sent to us.';

// Посетителю показывается наша фраза, а не текст исключения: «Failed to fetch
// dynamically imported module: http://…/treat-local.js» — сообщение для
// консоли, и в нём наш собственный адрес. Подробность остаётся в `console.warn`,
// а `TOO_BIG` приёмка пишет сама и потому показывает как есть: он объясняет
// причину, которой посетитель иначе не поймёт.
const LOCAL_FAILED = 'Your browser could not enlarge this picture.';
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

// Во что развернётся картинка при данной длинной стороне. Кадр учитывается
// здесь же: галочка меняет не отделку, а размер файла, и строка условий,
// называющая размер до кадрирования, обещала бы не тот файл.
function resultSize(width, height, target) {
  const ratio = target / Math.max(width, height);
  const grown = [Math.round(width * ratio), Math.round(height * ratio)];
  if (!els.crop.checked) return grown;
  const [w, h] = grown;
  return w / h > PHONE_RATIO ? [Math.round(h * PHONE_RATIO), h] : [w, Math.round(w / PHONE_RATIO)];
}

// Размеры у двух путей разные, и называть надо тот, который сейчас побежит.
// В браузере считает `upscale-local.js`, и правило берётся оттуда целиком,
// вместе с потолками стороны и площади: свой расчёт здесь уже был и отставал
// от здешнего — кнопка обещала 6424 × 8700 там, где выходило 6049 × 8192.
// У сервера потолков нет вовсе (`targetLongestSideFor` в server.js), поэтому
// предложение посчитать у нас называет своё число, а не то же самое.
const localSize = () =>
  resultSize(received.width, received.height, resultLongestSide(outputSize, received.width, received.height));
const serverSize = () =>
  resultSize(
    received.width,
    received.height,
    targetLongestSideFor(outputSize, Math.max(received.width, received.height))
  );

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
  els.privacy.textContent = STAYS_HERE;
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
  const result = localSize();
  const verb = Math.max(...result) > Math.max(width, height) ? 'Enlarge' : 'Resize';
  els.actions.replaceChildren(
    button(`${verb} to ${formatDims(...result)}`, 'btn', restore),
    button('Choose another', 'btn btn--ghost', chooseFile)
  );
  els.terms.replaceChildren(`Result, ${formatDims(...result)} `, scaleSwitch());
  // Примечание здесь пустое. Раньше стояло «Free for now: payment and accounts
  // come later» — обещание платного будущего в тот момент, когда посетитель
  // смотрит на кнопку. Считает браузер посетителя, счёта за это нет, и цена
  // сейчас ничего не объясняет; а заодно фраза была единственным местом,
  // где сайт обещал будущее нарушение NC у модели (LEGAL.md).
  els.note.textContent = '';
  els.note.classList.remove('is-error');
  // Выбор другого файла возвращает и обещание: предыдущий мог уехать к нам,
  // этот пойдёт в браузер, как обычно.
  els.privacy.textContent = STAYS_HERE;
  els.share.hidden = true;
  setOptions(true);
}

function renderWorking(size, note) {
  els.frame.classList.add('is-working');
  const waiting = button('Working…', 'btn');
  waiting.disabled = true;
  els.actions.replaceChildren(waiting);
  // Переключатель размера убирается вместе с кнопкой: пока задача выполняется,
  // размер уже выбран, а нажатие на него перерисовало бы страницу в состояние
  // «измерено» — и с неё можно было бы отправить вторую задачу поверх первой.
  els.terms.textContent = `Result, ${formatDims(...size)}`;
  els.note.textContent = note;
  els.note.classList.remove('is-error');
  setOptions(false);
}

// Браузер не справился. Сервер справится, но для этого картинку надо отправить
// нам, а страница ровно над кнопкой обещает, что картинка остаётся на
// устройстве («Enlarged in your own browser…», pages.js). Раньше отправка шла
// сама собой из `catch`, и обещание становилось ложью в тот единственный
// момент, когда оно имело значение, — причём молча: посетитель видел готовый
// файл и ничего больше. Теперь решает он, и нажатием.
function renderOffered(reason) {
  els.frame.classList.remove('is-working');
  els.actions.replaceChildren(
    button(`Enlarge on our server to ${formatDims(...serverSize())}`, 'btn', restoreOnServer),
    button('Choose another', 'btn btn--ghost', chooseFile)
  );
  els.terms.replaceChildren(`Result, ${formatDims(...serverSize())} `, scaleSwitch());
  els.note.textContent = `${reason} We can do it on our machines instead — that means sending your picture to us, and it is deleted after 30 days.`;
  els.note.classList.add('is-error');
  // Обещание над кнопкой перестаёт быть верным ровно здесь и потому меняется.
  els.privacy.textContent = SENT_TO_US;
  els.share.hidden = true;
  setOptions(true);
}

function renderFinished() {
  els.frame.classList.remove('is-working');
  // Номер тот же, который работа получит на витрине: их связывает имя файла.
  els.ref.textContent = accession(`generated/${restored.filename}`);
  els.ref.classList.remove('is-blank');
  // Тип берётся из имени файла, а не из адреса: у посчитанного здесь адрес —
  // `blob:`, и расширения в нём нет вовсе. Имя есть у обоих путей.
  specLine(els.spec, [formatDims(els.picture.naturalWidth, els.picture.naturalHeight), formatType(restored.filename)]);
  const download = document.createElement('a');
  download.className = 'btn';
  download.href = restored.url;
  download.download = restored.filename;
  download.textContent = 'Download';
  els.actions.replaceChildren(download, button('Do another', 'btn btn--ghost', chooseFile));
  els.terms.textContent = `Source, ${formatDims(received.width, received.height)}`;
  // Скачивание ничем не закрыто: показан тот же файл полного разрешения,
  // который отдаёт кнопка. Гейтинг — признак ad-фермы.
  //
  // Где считали — сказано здесь же. Согласие на отправку спрашивается заранее
  // (`renderOffered`), но человек, вернувшийся к готовой работе, не обязан
  // помнить, что он тогда нажал.
  els.note.textContent =
    restored.provider === 'server'
      ? 'Enlarged on our server. This page shows the full-resolution file, the same one you download.'
      : 'This page shows the full-resolution file, the same one you download.';
  els.privacy.textContent = restored.provider === 'server' ? SENT_TO_US : STAYS_HERE;
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

// Имя готового файла собирается так же, как на сервере (`saveResult`): из имени
// принесённого, названия модели и выбранного размера. От него же берётся номер
// работы, поэтому формат обязан совпадать.
function localName(extension) {
  const base = received.file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_') || 'photo';
  return `${base}-4x-clearrealityv1-${outputSize}-${Date.now()}${extension}`;
}

// Считает картинку прямо здесь. Возвращает готовый файл или null, если браузер
// так не умеет, — тогда работа уходит на сервер, как раньше.
//
// Модули грузятся по требованию: рантайм счёта весит около шести мегабайт
// сжатым, и странице, на которую только зашли, он не нужен.
async function restoreLocally() {
  const [{ localUpscaleAvailable, upscaleInBrowser }, { finishLocally }] = await Promise.all([
    import('./upscale-local.js'),
    import('./treat-local.js')
  ]);
  if (!(await localUpscaleAvailable())) return null;

  const { canvas, provider } = await upscaleInBrowser(received.file, {
    outputSize,
    onProgress: ({ done, total, secondsLeft }) => {
      const left = secondsLeft > 90 ? `${Math.round(secondsLeft / 60)} min` : `${secondsLeft}s`;
      els.note.textContent = `Working in your browser — ${done} of ${total} tiles, about ${left} left.`;
    }
  });
  const finished = finishLocally(canvas, { treat: els.treat.checked, crop: els.crop.checked });
  // Формат сохраняется, как и на сервере: принесли PNG — вернётся PNG.
  // Всё остальное отдаётся JPEG: четырёхкратный PNG с телефонной картинки
  // весит десятки мегабайт, и это уже не «тот же файл, только крупнее».
  const png = received.file.type === 'image/png';
  const blob = await finished.convertToBlob(png ? { type: 'image/png' } : { type: 'image/jpeg', quality: 0.94 });
  return { blob, filename: localName(png ? '.png' : '.jpg'), provider };
}

async function restore() {
  // Первый счёт в этой вкладке качает модель и рантайм, дальше они в кэше.
  // Строка сразу же сменится на счётчик плиток из `restoreLocally`.
  renderWorking(localSize(), 'Working in your browser. The first picture also downloads the model.');
  let made;
  try {
    made = await restoreLocally();
  } catch (error) {
    // Причина остаётся в консоли — это единственный способ узнать, на чём
    // именно спотыкаются чужие машины. Посетителю причина тоже нужна: без неё
    // предложение отправить файл нам выглядит как навязывание.
    console.warn('local upscale failed:', error);
    return renderOffered(error.message === TOO_BIG ? TOO_BIG : LOCAL_FAILED);
  }
  if (!made) return renderOffered('Your browser cannot enlarge pictures on its own.');
  try {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(made.blob);
    restored = { filename: made.filename, url: objectUrl, provider: made.provider };
    await showPicture(objectUrl);
    renderFinished();
  } catch (error) {
    renderFailed(error.message);
  }
}

// Отправка нам — отдельная кнопка, а не запасной путь внутри `restore`:
// см. `renderOffered`.
async function restoreOnServer() {
  els.privacy.textContent = SENT_TO_US;
  renderWorking(serverSize(), 'Working on our server.');
  try {
    const body = new FormData();
    body.append('photo', received.file);
    body.append('output_size', outputSize);
    body.append('treat', String(els.treat.checked));
    body.append('crop', String(els.crop.checked));
    const response = await fetch('/api/upscale', { method: 'POST', body });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    restored = { filename: data.filename, url: data.url, provider: 'server' };
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
