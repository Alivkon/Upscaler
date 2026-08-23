// Приёмка: один файл проходит через измерение, обработку и выдачу.

import { button, formatDims } from './record.js';
// Только правила размера: сам счёт и его рантайм на шесть мегабайт грузятся
// по требованию, уже из `restoreLocally`.
import { TOO_BIG, resultLongestSide } from './upscale-local.js';
import { phoneWindow, serverLongestSide } from './frame.js';

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
// Формат спрашивается, вес — нет. Порог в 10 МБ стоял здесь с первого дня,
// когда путь был один и вёл на сервер; считает картинку теперь эта же машина,
// и никуда файл не едет — мегабайты не значат ничего. Упирается счёт в сторону
// и площадь холста (`MAX_SIDE` и `MAX_AREA` в upscale-local.js), и спотыкаться
// он должен об них: 10 МБ отказывали в самой тяжёлой из наших же плит (20 МБ)
// и при этом пропускали лёгкий файл, который холст не потянет.
const FILE_REQUIREMENTS = 'JPG, PNG and WebP.';

// Четыре галочки, которые видно сразу, и пятая, которую видно нельзя.
// Разделены они не по смыслу для посетителя, а по тому, чем считаются:
// эти четыре — холстом, за миллисекунды, поэтому на каждый щелчок страница
// пересчитывает картинку в проёме. Увеличение считает модель, минутами,
// и в этом списке его нет.
const EFFECTS = ['crop', 'treat', 'blur', 'vignette'];

const els = {
  frame: document.querySelector('#intake-frame'),
  picture: document.querySelector('#intake-picture'),
  choose: document.querySelector('#intake-choose'),
  actions: document.querySelector('#intake-actions'),
  file: document.querySelector('#intake-file'),
  growth: document.querySelector('#intake-growth'),
  note: document.querySelector('#intake-note'),
  options: document.querySelector('#intake-options'),
  enlarge: document.querySelector('#intake-enlarge'),
  terms: document.querySelector('#intake-terms'),
  privacy: document.querySelector('#intake-privacy'),
  about: document.querySelector('#intake-about'),
  ...Object.fromEntries(EFFECTS.map(name => [name, document.querySelector(`#intake-${name}`)]))
};

// Состояние галочек одним объектом — в том же виде, какой принимает
// `finishLocally`. Собирается оно с разметки, а не хранится рядом: вторая
// запись о том, что нажато, разошлась бы с первой молча.
const chosen = () => Object.fromEntries(EFFECTS.map(name => [name, els[name].checked]));
const anyEffect = () => EFFECTS.some(name => els[name].checked);

// Строка над кнопкой отвечает на вопрос «куда уедет мой файл», и ответов два,
// потому что путей два. Разметка приходит с первым (pages.js); второй ставится
// здесь, когда посетителю предложено посчитать у нас и когда так и посчитали.
// «Made», а не «Enlarged»: увеличение — одна из пяти галочек, и снявший её
// получает картинку, которую никто не увеличивал. Строка же обязана быть
// верной во всех случаях — она отвечает не про увеличение, а про то, чья
// машина считала. Отправка нам бывает только ради модели, и там слово
// остаётся своим.
const STAYS_HERE = 'Made in your own browser; your picture stays on your device.';
const SENT_TO_US = 'Enlarged on our server; your picture is sent to us.';

// Посетителю показывается наша фраза, а не текст исключения: «Failed to fetch
// dynamically imported module: http://…/treat-local.js» — сообщение для
// консоли, и в нём наш собственный адрес. Подробность остаётся в `console.warn`,
// а `TOO_BIG` приёмка пишет сама и потому показывает как есть: он объясняет
// причину, которой посетитель иначе не поймёт.
const LOCAL_FAILED = 'Your browser could not enlarge this picture.';
// Отказ без увеличения — это отказ холста, а не модели, и предлагать за него
// сервер не за чем: то же самое он сделает тем же кодом.
const FINISH_FAILED = 'Your browser could not apply these changes.';
// Начало всех строк о ходе работы. Стояло здесь «Working in your browser»,
// и читалось это не как «идёт сейчас», а как утверждение о том, где вообще
// считают, — тем более что двумя строками ниже стоит «Made in your own
// browser…» теми же словами. Глагол теперь называет предмет, а не место:
// место названо там, где ему и положено, в строке о приватности.
const WORKING = 'Making your wallpaper';
let received = null; // выбранный файл, его измеренные размеры и растр для превью
let restored = null; // готовая работа: имя файла и адрес
// Стоит ли сейчас на странице предложение посчитать у нас (`renderOffered`).
// Нужен он одному месту — неудачному превью, — и там объяснено, зачем.
let offered = false;
// Три адреса, а не один: исходник нужен, чтобы вернуть картинку без обработки,
// когда сняли последнюю галочку, — то есть он живёт дольше любого превью.
let sourceUrl = null;
let previewUrl = null;
let resultUrl = null;

// Превью считается по уменьшенной копии, а не по исходнику: обработка идёт
// попиксельно, а щёлкать галочками будут подряд. Тысяча по длинной стороне —
// вдвое больше проёма на плотном экране, то есть больше, чем видно.
const PREVIEW_SIDE = 1000;
// Щелчки приходят быстрее, чем считается превью, и без метки на холсте
// оседало бы то, что досчиталось последним, а не то, что нажато последним.
let previewToken = 0;

const forget = url => url && URL.revokeObjectURL(url);
const chooseFile = () => els.file.click();

// Галочки запираются, пока задача выполняется и пока готовый файл на экране:
// снятая после отправки, галочка описывала бы не тот файл, который показан,
// а нажатая на готовом — обещала бы переделку, которой не будет. Открывает
// их обратно выбор другого файла, то есть возврат в состояние «измерено».
// Приглушать строку отдельным классом не нужно: `.options__row:has(input:disabled)`
// в styles.css уже гасит её и убирает курсор-указатель.
const setOptions = enabled => {
  els.enlarge.disabled = !enabled;
  for (const name of EFFECTS) els[name].disabled = !enabled;
};

// Три положения страницы одним переключателем, чтобы они не могли наложиться:
// класс работы снимался в четырёх местах по отдельности, и стоило добавить
// пятое — оставался бы вечно бегущий блик поверх готовой картинки.
//
// «Готово» видно и без слов. Готовая работа отличалась от невыбранной только
// подписью в 12 px и словом на кнопке: картинка в проёме та же (увеличения
// в проёме и так не видно, а отделка была показана ещё до нажатия), кнопки
// на том же месте, колонка той же высоты. Работа кончилась, а страница
// об этом почти не сообщала.
//
// Сообщает теперь трижды и разными средствами: обвод паспарту, слово «ready»
// в подписи (renderFinished) и исчезающие абзацы. Обвод — тот же приём, каким
// плита отзывается на перетаскивание, только тоньше: 2 px против 3. Двум этим
// состояниям не пересечься — тащат файл на пустую приёмку, — а заводить ради
// готовности второй язык там, где уже есть один, незачем.
//
// Абзацы уходят на время работы и не возвращаются к готовой: объясняют они
// страницу тому, кто ещё не нажимал, и рядом со сделанным делом это просто
// шум под результатом. Возвращает их выбор другого файла.
//
// У готовой колонки убрано и всё остальное, что относится к невыполненной
// работе. Галочки: они описывают будущее («что сделать»), а сделанного уже
// не меняют — заперты они были и раньше, но заперты и не видны это разные
// вещи. Уходя, они поднимают Download к самой картинке. Строка о правах
// и о том, чья машина считала, — туда же: вопрос «куда уедет мой файл»
// задают до нажатия, а не после, и ответ на него для отправки к нам
// повторён в самой подписи готового («Enlarged on our server»). Подпись
// автору модели от этого не пропадает: она в подвале на каждой странице
// и здесь же во всех остальных состояниях (LEGAL.md, требование BY).
const setStage = stage => {
  els.frame.classList.toggle('is-working', stage === 'working');
  els.frame.classList.toggle('is-done', stage === 'done');
  els.note.classList.toggle('is-ready', stage === 'done');
  els.options.hidden = stage === 'done';
  els.terms.hidden = stage === 'done';
  els.about.hidden = stage === 'working' || stage === 'done';
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
  if (!ACCEPTED_TYPES.has(file.type)) return renderFailed(FILE_REQUIREMENTS);
  // Прежний файл держится до тех пор, пока новый не прочитан целиком. Тип
  // у файла бывает верным, а сам он нечитаемым — оборванная закачка, битый
  // JPEG, — и страница, успевшая закрыть прежний растр, осталась бы в виде
  // «файл выбран» вокруг закрытого растра: `renderFailed` возвращает её
  // в «измерено», раз `received` не пуст, и первая же галочка после этого
  // падала бы на `drawImage`. Отказ по типу строкой выше ведёт себя так же —
  // прежний выбор остаётся в силе, — и второй отказ обязан быть таким же.
  const url = URL.createObjectURL(file);
  let bitmap;
  try {
    await showPicture(url);
    // Растр держится всё время, пока файл выбран: каждая галочка пересчитывает
    // превью с нуля, и раскодировать JPEG заново на каждый щелчок значило бы
    // делать самую дорогую часть работы по четыре раза подряд.
    bitmap = await createImageBitmap(file);
  } catch (error) {
    URL.revokeObjectURL(url);
    renderFailed(error.message);
    // Проём успел показать нечитаемый файл или спрятаться вовсе, а выбран
    // по-прежнему прежний — он и возвращается на место.
    if (received) await showPicture(sourceUrl).catch(() => {});
    return;
  }
  forget(sourceUrl);
  forget(previewUrl);
  forget(resultUrl);
  received?.bitmap.close();
  sourceUrl = url;
  previewUrl = resultUrl = null;
  received = { file, bitmap, width: els.picture.naturalWidth, height: els.picture.naturalHeight };
  restored = null;
  renderMeasured();
  showChosen();
}

// Показывает в проёме то, что сейчас нажато. Без галочек — исходник как есть,
// без пересчёта: показать вместо него пережатую копию значило бы соврать о том,
// что делает страница, когда она не делает ничего.
//
// Увеличения в превью нет и быть не может: модель считает минутами, а щелчок
// обязан отвечать сразу. Поэтому показывается кадр в его собственном размере —
// то, что произойдёт с картинкой, но не то, насколько она вырастет. Об этом
// сказано в самой галочке (pages.js).
//
// Отказ ловится здесь, а не у зовущих: зовут её без `await` из двух мест —
// выбор файла и каждая галочка, — и любой отказ внутри уходил бы в
// необработанное отклонение. Видно это было бы как неработающая галочка:
// в проёме осталась бы прежняя картинка, и ни строчки о том, почему.
async function showChosen() {
  const token = ++previewToken;
  try {
    if (!anyEffect()) return await showPicture(sourceUrl).catch(() => {});
    const { finishLocally } = await import('./treat-local.js');
    if (token !== previewToken) return;
    const scale = Math.min(1, PREVIEW_SIDE / Math.max(received.width, received.height));
    const base = new OffscreenCanvas(
      Math.max(1, Math.round(received.width * scale)),
      Math.max(1, Math.round(received.height * scale))
    );
    const ctx = base.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(received.bitmap, 0, 0, base.width, base.height);
    const blob = await finishLocally(base, chosen()).convertToBlob({ type: 'image/jpeg', quality: 0.92 });
    if (token !== previewToken) return;
    forget(previewUrl);
    previewUrl = URL.createObjectURL(blob);
    await showPicture(previewUrl).catch(() => {});
  } catch (error) {
    // Причина — в консоль: спотыкаются здесь чужие браузеры, и узнать, на чём
    // именно, больше неоткуда. Устаревшее превью молчит: его картинку уже
    // заменило следующее, и жаловаться ему не на что.
    if (token !== previewToken) return;
    console.warn('preview failed:', error);
    // Предложение посчитать у нас переживает неудачное превью. `renderFailed`
    // пересобирает нижний ряд заново, и кнопка «Make it on our server»
    // исчезала бы ровно там, где она единственный выход: браузеру не далась
    // большая картинка, встало предложение, посетитель щёлкнул виньетку —
    // и превью не далось ему по той же нехватке памяти. На месте предложения
    // оказывалась «Make my wallpaper», то есть путь, который только что упал.
    //
    // Тем же `renderOffered`, а не сохранением кнопок: он и соберёт тот же ряд,
    // и скажет правду о случившемся — браузер не смог, а мы можем.
    if (offered) renderOffered(FINISH_FAILED);
    else renderFailed(FINISH_FAILED);
  }
}

// Сначала кадр, потом размер — тот же порядок, в котором работает и счёт
// (`upscaleInBrowser`). Обратный порядок здесь уже стоял: он растил картинку
// целиком, кадрировал готовое и оттого называл размер, до которого обрезанному
// кадру не хватало, — 4032 × 3024 с галочкой обещали 4K, а выходило 1701 × 3024.
const framedSource = () => {
  const { width, height } = received;
  if (!els.crop.checked) return { width, height };
  const window = phoneWindow(width, height);
  return { width: window.width, height: window.height };
};

// Во что развернётся кадр при данной длинной стороне.
function resultSize(width, height, target) {
  const ratio = target / Math.max(width, height);
  return [Math.round(width * ratio), Math.round(height * ratio)];
}

// Размеры у двух путей разные, и называть надо тот, который сейчас побежит.
// В браузере считает `upscale-local.js`, и правило берётся оттуда целиком,
// вместе с потолками стороны и площади: свой расчёт здесь уже был и отставал
// от здешнего — кнопка обещала 6424 × 8700 там, где выходило 6049 × 8192.
// У сервера потолок один — на сторону (`serverLongestSide` во frame.js);
// потолка площади у него нет, холста ведь тоже нет. Поэтому предложение
// посчитать у нас называет своё число, а не то же самое, и берёт его из того
// же файла, по которому сервер потом и считает.
const serverSize = () => {
  const { width, height } = framedSource();
  return resultSize(width, height, serverLongestSide(width, height));
};

// Вырастет ли картинка вообще. Порог — нижняя граница, и той, что уже
// переросла его, модель вернула бы ровно её же размер.
//
// Это не мелкая экономия, а самая частая дорога на сервер. Холст под большую
// картинку упирается в потолок площади (16.7 Мп у Safari) раньше, чем модель
// успевает начать, и до 23.08 выходило так: снимок 24 Мп с фотоаппарата
// проваливался в `TOO_BIG`, страница предлагала отправить фотографию нам,
// Replicate считал её за деньги — и возвращал тот же размер, с которого
// начали. Замер по восьми ходовым размерам: **каждый** случай `TOO_BIG`
// оказался «расти уже некуда», а с телефонным кадром `TOO_BIG` не случается
// вовсе — кадр режется до модели и уносит две трети площади.
//
// Цена решения названа: на большой картинке модель не пройдёт совсем, а она
// не только растит, но и восстанавливает детали. Галочка обещает размер
// («Increase size»), размера прибавить нечем — значит, и работы нет.
// Сравнение строгое, «больше», а не «иначе». Разница не теоретическая:
// у снимка 6000 × 4000 потолок площади сажает ответ модели до 5016 × 3344,
// то есть меньше принесённого. Пока считалось «иначе», страница обещала под
// галочкой «Increase size» уменьшение и шла его считать.
const growthNeeded = () => {
  const { width, height } = framedSource();
  return resultLongestSide(width, height) > Math.max(width, height);
};

// Позовём ли модель. Спрашивают об этом трижды — что делать, что написать
// на время работы и как назвать файл, — и ответ обязан быть один: имя со
// словом `4x-clearrealityv1` у файла, которого модель не касалась, — это
// неверная запись о том, как файл сделан.
const willEnlarge = () => els.enlarge.checked && growthNeeded();

// Что скажет подпись под галочкой увеличения. До выбора файла — одна
// оговорка: называть нечего. После — оба размера, свой и тот, что выйдет,
// потому что смысл галочки именно в разнице между ними. Кадр учтён: он
// меняет и то, из чего растят, и то, что получится.
function renderGrowth() {
  if (!received) return (els.growth.textContent = 'no preview');
  const { width, height } = framedSource();
  // «3840 × 2160 to 3840 × 2160» читается как поломка, хотя это верный ответ:
  // расти некуда. Сказано словами, а не двумя одинаковыми числами. Оговорки
  // про превью здесь уже нет — показывать нечего, потому что и делаться
  // ничего не будет.
  if (!growthNeeded()) return (els.growth.textContent = `${formatDims(width, height)}, already big enough`);
  const grown = resultSize(width, height, resultLongestSide(width, height));
  els.growth.textContent = `${formatDims(width, height)} (yours) to ${formatDims(...grown)}. No preview`;
}

function renderEmpty() {
  offered = false;
  els.choose.replaceChildren(button('Choose my picture', 'btn', chooseFile));
  // Нижнее место пусто: пока файла нет, делать нечего, и кнопка «Make my
  // wallpaper» под галочками обещала бы работу без предмета.
  els.actions.replaceChildren();
  renderGrowth();
  // «Nothing is published without your consent» отсюда убрано и ничем
  // не заменено. Фраза описывала публикацию, которой нет: маршрут закрыт
  // (LEGAL.md), галочка выключена, чужие файлы не выходят на витрину никогда.
  // Обещание о том, чего не происходит, — лишний повод задуматься, происходит
  // ли; а любая замена вроде «мы не храним ваши картинки» была бы обещанием
  // о приватности, которое пришлось бы потом держать.
  // Примечание молчит: перетаскивание и требования к файлу уже написаны
  // в самом проёме, и повторять их второй строкой не для чего. Требования
  // возвращаются сюда, когда файл им не подошёл (`renderFailed`).
  els.note.textContent = '';
  els.note.classList.remove('is-error');
  els.privacy.textContent = STAYS_HERE;
  setStage('empty');
  setOptions(true);
}

function renderMeasured() {
  offered = false;
  // Кнопка называет работу целиком, одними и теми же словами при любых
  // галочках. Стояли здесь «Enlarge to 2160 × 3840» и «Resize to …», и глагол
  // приходилось выводить: увеличение перестало быть тем, что страница делает,
  // и стало одной галочкой из четырёх, — а кнопка всё ещё называла его одно,
  // причём иногда неправду. Картинка, уже переросшая порог, не растёт вовсе;
  // с телефонным кадром она и вовсе выходит меньше, чем пришла.
  //
  // Размер с кнопки ушёл к той галочке, которая его меняет (`renderGrowth`):
  // отдельной строкой «Result, 2160 × 3840» он стоял между проёмом и делом
  // и объявлял то, чего посетитель ещё не просил.
  els.choose.replaceChildren();
  els.actions.replaceChildren(
    button('Make my wallpaper', 'btn', restore),
    button('Choose another', 'btn btn--ghost', chooseFile)
  );
  renderGrowth();
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
  setStage('measured');
  setOptions(true);
}

function renderWorking(note) {
  offered = false;
  setStage('working');
  const waiting = button('Working…', 'btn');
  waiting.disabled = true;
  els.actions.replaceChildren(waiting);
  // Выбор файла убирается на время счёта вместе с галочками и по той же
  // причине: сменить файл под работающей задачей значит получить результат
  // от одного файла на месте другого. Гасится и верхнее место — с выбранным
  // файлом оно и так пусто, но пустым его надо оставить и здесь.
  els.choose.replaceChildren();
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
  offered = true;
  setStage('measured');
  els.choose.replaceChildren();
  els.actions.replaceChildren(
    button('Make it on our server', 'btn', restoreOnServer),
    button('Choose another', 'btn btn--ghost', chooseFile)
  );
  els.note.textContent = `${reason} We can do it on our machines instead — that means sending your picture to us, and it comes back ${formatDims(...serverSize())}.`;
  els.note.classList.add('is-error');
  // Обещание над кнопкой перестаёт быть верным ровно здесь и потому меняется.
  els.privacy.textContent = SENT_TO_US;
  setOptions(true);
}

function renderFinished() {
  setStage('done');
  const download = document.createElement('a');
  download.className = 'btn';
  download.href = restored.url;
  download.download = restored.filename;
  download.textContent = 'Download';
  els.choose.replaceChildren();
  els.actions.replaceChildren(download, button('Do another', 'btn btn--ghost', chooseFile));
  // Скачивание ничем не закрыто: показан тот же файл полного разрешения,
  // который отдаёт кнопка. Гейтинг — признак ad-фермы.
  //
  // Строка начинается словом о том, что дело кончилось, и кончается теми же
  // словами, какими оно шло: «Making your wallpaper…» → «Your wallpaper is
  // ready». Раньше она начиналась размером — то есть числом, которое человек
  // на готовой работе и так видит, — и продолжалась обещанием «This page shows
  // the full-resolution file, the same one you download». Обещание сняли: оно
  // отвечало на подозрение, которого у пришедшего нет, а высказанное вслух
  // это подозрение и заводит. Проём и кнопка берут один и тот же blob, и
  // разойтись им нечем.
  //
  // Размер остаётся: это единственное место, где он называется у сделанного, —
  // строка характеристик убрана, а подпись под галочкой обещает будущее.
  // Замер, а не расчёт: показан настоящий файл, и спросить его размеры можно
  // у него самого.
  //
  // Где считали — сказано здесь же. Согласие на отправку спрашивается заранее
  // (`renderOffered`), но человек, вернувшийся к готовой работе, не обязан
  // помнить, что он тогда нажал.
  const made = formatDims(els.picture.naturalWidth, els.picture.naturalHeight);
  els.note.textContent =
    restored.provider === 'server'
      ? `Your wallpaper is ready, ${made}. Enlarged on our server.`
      : `Your wallpaper is ready, ${made}.`;
  els.privacy.textContent = restored.provider === 'server' ? SENT_TO_US : STAYS_HERE;
  els.note.classList.remove('is-error');
  setOptions(false);
}

// Авария возвращает страницу в предыдущее состояние и говорит, что случилось:
// заметна она светлотой, а не цветом — хроматического акцента здесь нет вообще.
function renderFailed(message) {
  if (received) renderMeasured();
  else renderEmpty();
  els.note.textContent = message;
  els.note.classList.add('is-error');
}

// Имя готового файла собирается так же, как на сервере (`saveResult`): из имени
// принесённого и названия модели. От него же берётся номер работы, поэтому
// формат обязан совпадать. Размер из имени ушёл вместе с выбором размера:
// он теперь один на все работы и ничего про эту не сказал бы.
//
// Модель в имени стоит только когда она и правда считала: имя — это запись
// о том, как файл сделан, и без увеличения модели в этой записи не место.
function localName(extension) {
  const base = received.file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_') || 'photo';
  const how = willEnlarge() ? '4x-clearrealityv1' : 'finished';
  return `${base}-${how}-${Date.now()}${extension}`;
}

// Формат сохраняется, как и на сервере: принесли PNG — вернётся PNG.
// Всё остальное отдаётся JPEG: четырёхкратный PNG с телефонной картинки
// весит десятки мегабайт, и это уже не «тот же файл, только крупнее».
//
// Тип приходит доводом, а не берётся у выбранного файла: на пути через сервер
// холст набран не из него, а из присланного нам ответа, и Real-ESRGAN отдаёт
// PNG на любой вход. По типу загруженного JPEG пережимался бы в JPEG и уезжал
// под серверным именем `.png` — байты одни, расширение другое.
//
// Расширение возвращается наружу по той же причине: серверное имя оставляет
// себе номер работы, но расширение обязано назвать то, что вышло.
function toFile(canvas, provider, sourceType = received.file.type) {
  const png = sourceType === 'image/png';
  const extension = png ? '.png' : '.jpg';
  return canvas
    .convertToBlob(png ? { type: 'image/png' } : { type: 'image/jpeg', quality: 0.94 })
    .then(blob => ({ blob, filename: localName(extension), extension, provider }));
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
    crop: els.crop.checked,
    // Три вида одного сообщения, по трём отрезкам работы. До первой плитки
    // доля скачанного — единственное, что вообще меняется: без неё строка
    // стояла молча, пока грузились двадцать семь мегабайт, и это читалось
    // как поломка.
    //
    // Между «100 %» и первой плиткой лежит третий отрезок, и он не короткий:
    // разбор трёх мегабайт рантайма, сборка сессии и компиляция шейдеров.
    // Пока о нём не говорили, счётчик замирал на сотне — а с тёплым кэшем
    // сотня появлялась сразу и стояла всё время, то есть счётчик показывал
    // ровно наоборот: «сделано» в самом начале.
    //
    // Слова простые и без предмета: «warming up», а не «starting the model».
    // Модель — наше внутреннее устройство, посетитель принёс картинку и ждёт
    // обои; знать, что внутри считает нейросеть, ему не нужно ни для чего.
    // Строка при этом обязана отличаться от предыдущей не только числом:
    // «getting ready, 100%» → «getting ready…» читалось бы тем же замиранием,
    // от которого её и завели.
    onProgress: ({ loaded, starting, done, total, secondsLeft }) => {
      if (starting) {
        els.note.textContent = `${WORKING}: warming up…`;
        return;
      }
      if (loaded !== undefined) {
        els.note.textContent = `${WORKING}: getting ready, ${Math.round(loaded * 100)}%.`;
        return;
      }
      const left = secondsLeft > 90 ? `${Math.round(secondsLeft / 60)} min` : `${secondsLeft}s`;
      els.note.textContent = `${WORKING}: ${done} of ${total} tiles, about ${left} left.`;
    }
  });
  // Кадр уже вырезан — до счёта; здесь остаётся только отделка.
  return toFile(finishLocally(canvas, { ...chosen(), crop: false }), provider);
}

// Увеличение снято — модель не зовут вовсе. Это не оптимизация: рантайм
// на шесть мегабайт и минуты счёта ради виньетки были бы платой за работу,
// которой не просили, а на слабой машине ещё и отказом там, где отказывать
// нечему. Отделка считается по исходному растру в полном разрешении, тем же
// `finishLocally`, что и превью, — то есть выйдет ровно показанное.
async function finishOnly() {
  const { finishLocally } = await import('./treat-local.js');
  const canvas = new OffscreenCanvas(received.width, received.height);
  canvas.getContext('2d').drawImage(received.bitmap, 0, 0);
  return toFile(finishLocally(canvas, chosen()), 'browser');
}

async function restore() {
  // Не «нажата ли галочка», а «есть ли что делать»: переросшую порог картинку
  // модель не трогает вовсе (`growthNeeded`), и путь у неё тот же, что у снятой
  // галочки, — отделка по исходному растру.
  const enlarging = willEnlarge();
  renderWorking(`${WORKING}…`);
  let made;
  try {
    made = enlarging ? await restoreLocally() : await finishOnly();
  } catch (error) {
    // Причина остаётся в консоли — это единственный способ узнать, на чём
    // именно спотыкаются чужие машины. Посетителю причина тоже нужна: без неё
    // предложение отправить файл нам выглядит как навязывание.
    console.warn('local finish failed:', error);
    if (!enlarging) return renderFailed(FINISH_FAILED);
    return renderOffered(error.message === TOO_BIG ? TOO_BIG : LOCAL_FAILED);
  }
  if (!made) return renderOffered('Your browser cannot enlarge pictures on its own.');
  try {
    forget(resultUrl);
    resultUrl = URL.createObjectURL(made.blob);
    restored = { filename: made.filename, url: resultUrl, provider: made.provider };
    await showPicture(resultUrl);
    renderFinished();
  } catch (error) {
    renderFailed(error.message);
  }
}

// Отправка нам — отдельная кнопка, а не запасной путь внутри `restore`:
// см. `renderOffered`.
//
// Кадр и приглушение сервер по-прежнему считает сам: правило у них общее
// (`ceil` из /rules/ceilings.mjs), и разойтись эти два ответа не могут.
// Остальных четырёх у него нет вовсе, и они накладываются здесь, на его
// ответ, — тем же `finishLocally`, что и в браузерном пути. Порядок при этом
// сохраняется: кадр и приглушение идут первыми в обоих случаях.
async function restoreOnServer() {
  els.privacy.textContent = SENT_TO_US;
  renderWorking('Working on our server.');
  try {
    const body = new FormData();
    body.append('photo', received.file);
    body.append('treat', String(els.treat.checked));
    body.append('crop', String(els.crop.checked));
    const response = await fetch('/api/upscale', { method: 'POST', body });
    // Ответ бывает двух видов: авария — по-прежнему JSON, удача — сама
    // картинка байтами. Адреса у неё нет: на нашем диске файл больше не
    // остаётся, и забрать его второй раз неоткуда (server.js). Отсюда и
    // исчезла вторая загрузка — раньше браузер скачивал у нас же то, что
    // сам только что прислал, чтобы наложить размытие и виньетку.
    if (!response.ok) throw new Error((await response.json()).error);
    let blob = await response.blob();
    // Имени может не быть: заголовок наш собственный и нестандартный, и
    // посредник, режущий незнакомые, оставит здесь пусто. Раньше это стоило бы
    // слова «null» у скачанного файла; с тех пор как расширение правится на
    // месте, пустое имя роняет весь путь в `catch` — то есть отказом накрывает
    // готовую работу, которая существует в одном экземпляре и уже оплачена.
    // Тогда имя собирается здесь, как в браузерном пути: номер работы в нём
    // свой, зато файл доезжает.
    let filename = response.headers.get('X-Filename') || localName(blob.type === 'image/png' ? '.png' : '.jpg');
    const extra = { ...chosen(), crop: false, treat: false };
    if (Object.values(extra).some(Boolean)) {
      const { finishLocally } = await import('./treat-local.js');
      const enlarged = await createImageBitmap(blob);
      const canvas = new OffscreenCanvas(enlarged.width, enlarged.height);
      canvas.getContext('2d').drawImage(enlarged, 0, 0);
      enlarged.close();
      // Формат берётся у присланных байтов, а не у выбранного файла: считал
      // не этот браузер, и что вернулось — известно только из ответа.
      const made = await toFile(finishLocally(canvas, extra), 'server', blob.type);
      blob = made.blob;
      // Расширение — от того, что вышло из пережатия; остальное имя серверное.
      filename = filename.replace(/\.[^.]+$/, made.extension);
    }
    forget(resultUrl);
    resultUrl = URL.createObjectURL(blob);
    // Имя остаётся серверным: по нему берётся номер работы, и меняться
    // от того, кто накладывал виньетку, он не должен.
    restored = { filename, url: resultUrl, provider: 'server' };
    await showPicture(restored.url);
    renderFinished();
  } catch (error) {
    renderFailed(error.message);
  }
}

els.file.addEventListener('change', () => receive(els.file.files[0]));
// Отделочные галочки меняют картинку в проёме. Кадр вдобавок меняет и то,
// из чего растят, — то есть подпись под увеличением. Перерисовка только когда
// файл уже выбран: до этого ни называть, ни показывать нечего.
for (const name of EFFECTS) {
  els[name].addEventListener('change', () => {
    if (!received) return;
    renderGrowth();
    showChosen();
  });
}
// У самого увеличения обработчика нет: подпись под ним обещает одно и то же
// независимо от того, нажато оно или снято, — это описание галочки, а не
// состояния. Картинку в проёме оно тоже не меняет; менять здесь нечего.
els.frame.addEventListener('click', () => !received && chooseFile());
els.frame.addEventListener('keydown', event => {
  if (!received && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault();
    chooseFile();
  }
});

// Флажка «Add to the collection» на странице больше нет. Он стоял выключенным
// и с оговоркой «Not available at the moment» — то есть занимал строку в
// колонке ради обещания на будущее, и показывался при этом ровно в одном
// состоянии: над готовой работой, где место дороже всего. Намерение живёт
// в LEGAL.md и в TODO, а не в неработающей галочке. Запрет от этого не
// ослаб: отказывает сам маршрут в server.js, и держался он не на разметке.

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
