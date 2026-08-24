// Проём: что в нём лежит и что в нём видно.
//
// Отделён от `intake.js` 24.08 вместе с `make.js`. Здесь и только здесь живут
// принесённый файл, его растр и измеренные размеры, три адреса `blob:` и метка
// очерёдности превью — то есть всё, что нужно закрывать руками и что молча
// течёт, если о нём забыть в одном из пяти мест. Страница про эти адреса
// не знает вовсе: она спрашивает, что принесли, и просит показать.
//
// Своих слов у проёма нет ни одного. Отказ уходит наверх исключением или
// ответом «не вышло», а называет его посетителю `intake.js` — там же, где
// лежат остальные фразы.

const els = {
  frame: document.querySelector('#intake-frame'),
  picture: document.querySelector('#intake-picture')
};

// Превью считается по уменьшенной копии, а не по исходнику: обработка идёт
// попиксельно, а щёлкать галочками будут подряд. Тысяча по длинной стороне —
// вдвое больше проёма на плотном экране, то есть больше, чем видно.
const PREVIEW_SIDE = 1000;
// Щелчки приходят быстрее, чем считается превью, и без метки на холсте
// оседало бы то, что досчиталось последним, а не то, что нажато последним.
let previewToken = 0;

// Три адреса, а не один: исходник нужен, чтобы вернуть картинку без обработки,
// когда сняли последнюю галочку, — то есть он живёт дольше любого превью.
let sourceUrl = null;
let previewUrl = null;
let resultUrl = null;

const forget = url => url && URL.revokeObjectURL(url);

// Что сейчас принесено: файл, его растр и измеренные размеры, или `null`.
// Растр держится всё время, пока файл выбран: каждая галочка пересчитывает
// превью с нуля, и раскодировать JPEG заново на каждый щелчок значило бы
// делать самую дорогую часть работы по четыре раза подряд.
//
// Отдаётся живой связкой, а не копией: `import { brought }` видит присвоения,
// сделанные здесь, и второй записи о том, что выбрано, на странице нет.
export let brought = null;

// Размеры того, что стоит в проёме сейчас. Замер, а не расчёт: показан
// настоящий файл, и спросить его размеры можно у него самого.
export const shownSize = () => [els.picture.naturalWidth, els.picture.naturalHeight];

// Изображение показывается по настоящему адресу — локальному для выбранного
// файла и для готовой работы, — поэтому размеры берутся замером, а не
// расчётом.
function show(source) {
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

// Принять файл: показать его, измерить и раскодировать. Отказ — исключением,
// и прежний выбор от него не страдает.
export async function receive(file) {
  // Прежний файл держится до тех пор, пока новый не прочитан целиком. Тип
  // у файла бывает верным, а сам он нечитаемым — оборванная закачка, битый
  // JPEG, — и страница, успевшая закрыть прежний растр, осталась бы в виде
  // «файл выбран» вокруг закрытого растра: `renderFailed` возвращает её
  // в «измерено», раз принесённое не пусто, и первая же галочка после этого
  // падала бы на `drawImage`. Отказ по типу в `intake.js` ведёт себя так же —
  // прежний выбор остаётся в силе, — и второй отказ обязан быть таким же.
  const url = URL.createObjectURL(file);
  let bitmap;
  try {
    await show(url);
    bitmap = await createImageBitmap(file);
  } catch (error) {
    URL.revokeObjectURL(url);
    // Проём успел показать нечитаемый файл или спрятаться вовсе, а выбран
    // по-прежнему прежний — он и возвращается на место.
    if (sourceUrl) await show(sourceUrl).catch(() => {});
    throw error;
  }
  const [width, height] = shownSize();
  forget(sourceUrl);
  forget(previewUrl);
  forget(resultUrl);
  brought?.bitmap.close();
  sourceUrl = url;
  previewUrl = resultUrl = null;
  brought = { file, bitmap, width, height };
  return brought;
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
// выбор файла и каждая галочка. Наружу он уходит не исключением, а ответом
// `false`: устаревшее превью отвечает `true` и молчит, потому что его картинку
// уже заменило следующее и жаловаться ему не на что.
export async function showChosen(effects) {
  const token = ++previewToken;
  try {
    if (!Object.values(effects).some(Boolean)) {
      await show(sourceUrl).catch(() => {});
      return true;
    }
    const { finishLocally } = await import('./treat-local.js');
    if (token !== previewToken) return true;
    const scale = Math.min(1, PREVIEW_SIDE / Math.max(brought.width, brought.height));
    const base = new OffscreenCanvas(
      Math.max(1, Math.round(brought.width * scale)),
      Math.max(1, Math.round(brought.height * scale))
    );
    const ctx = base.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(brought.bitmap, 0, 0, base.width, base.height);
    const blob = await finishLocally(base, effects).convertToBlob({ type: 'image/jpeg', quality: 0.92 });
    if (token !== previewToken) return true;
    forget(previewUrl);
    previewUrl = URL.createObjectURL(blob);
    await show(previewUrl).catch(() => {});
    return true;
  } catch (error) {
    // Причина — в консоль: спотыкаются здесь чужие браузеры, и узнать, на чём
    // именно, больше неоткуда.
    if (token !== previewToken) return true;
    console.warn('preview failed:', error);
    return false;
  }
}

// Поставить в проём готовую работу. Адрес возвращается наружу: по нему
// скачивают, и держит его страница, а закрывает — этот файл, следующим
// принятым файлом.
export async function showMade(blob) {
  forget(resultUrl);
  resultUrl = URL.createObjectURL(blob);
  await show(resultUrl);
  return resultUrl;
}
