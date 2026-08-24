// Как делается работа: три способа получить готовый файл — и ни одного слова
// о странице. Ни `document`, ни `els`, ни `render*` здесь нет и быть не должно:
// у этого файла единственная чужая сторона — наш маршрут `/api/upscale` и две
// модели, — и меряется он тем, что происходит с картинкой, а не тем, что видно
// в колонке.
//
// Отделён от `intake.js` 24.08, когда ветки поменялись местами и приёмка
// доросла до восьмисот строк. Шов прошёл здесь, потому что состояния страницы
// («что показано») и ход работы («что считается») ломаются от разных правок
// и разными способами.
//
// Все три берут `job` — всё, что нужно знать о принесённом файле, и ничего
// сверх:
//
//   file, bitmap, width, height — принесённое (`opening.brought`);
//   effects — что нажато, в том же виде, какой принимает `finishLocally`;
//   name(extension, how) — как назвать готовое (`localName` в intake.js);
//   onProgress — куда сообщать о ходе счёта; слова складывает зовущий.
//
// Возвращают все три одинаковое: `{ blob, filename, extension, provider }`.
// Отказ — исключением, и текст его предназначен посетителю только у сервера;
// у остальных он для консоли, а посетителю зовущий скажет своими словами.

// Формат сохраняется, как и на сервере: принесли PNG — вернётся PNG.
// Всё остальное отдаётся JPEG: четырёхкратный PNG с телефонной картинки
// весит десятки мегабайт, и это уже не «тот же файл, только крупнее».
//
// Тип приходит доводом, а не берётся у выбранного файла: на пути через сервер
// холст набран не из него, а из присланного нам ответа, и модель отдаёт
// не обязательно то же, что принесли. По типу загруженного JPEG пережимался бы
// в JPEG и уезжал под серверным именем `.png` — байты одни, расширение другое.
//
// Расширение возвращается наружу по той же причине: серверное имя оставляет
// себе номер работы, но расширение обязано назвать то, что вышло.
function toFile(job, canvas, provider, sourceType = job.file.type) {
  const png = sourceType === 'image/png';
  const extension = png ? '.png' : '.jpg';
  return canvas
    .convertToBlob(png ? { type: 'image/png' } : { type: 'image/jpeg', quality: 0.94 })
    .then(blob => ({ blob, filename: job.name(extension), extension, provider }));
}

// Увеличение снято — модель не зовут вовсе. Это не оптимизация: рантайм
// на шесть мегабайт и минуты счёта ради виньетки были бы платой за работу,
// которой не просили, а на слабой машине ещё и отказом там, где отказывать
// нечему. Отделка считается по исходному растру в полном разрешении, тем же
// `finishLocally`, что и превью, — то есть выйдет ровно показанное.
export async function withoutModel(job) {
  const { finishLocally } = await import('./treat-local.js');
  const canvas = new OffscreenCanvas(job.width, job.height);
  canvas.getContext('2d').drawImage(job.bitmap, 0, 0);
  return toFile(job, finishLocally(canvas, job.effects), 'browser');
}

// Считает картинку прямо здесь. Возвращает готовый файл или null, если браузер
// так не умеет.
//
// Модули грузятся по требованию: рантайм счёта весит около шести мегабайт
// сжатым, и странице, на которую только зашли, он не нужен. С 24.08 они
// не грузятся почти никогда — сюда приходят только те, кому отказал сервер.
export async function inBrowser(job) {
  const [{ localUpscaleAvailable, upscaleInBrowser }, { finishLocally }] = await Promise.all([
    import('./upscale-local.js'),
    import('./treat-local.js')
  ]);
  if (!(await localUpscaleAvailable())) return null;

  // Кадр режется до счёта, а не после: модель считает по площади, и вырезанный
  // заранее телефонный кадр уносит две трети работы.
  const { canvas, provider } = await upscaleInBrowser(job.file, { crop: job.effects.crop, onProgress: job.onProgress });
  // Кадр уже вырезан — здесь остаётся только отделка.
  return toFile(job, finishLocally(canvas, { ...job.effects, crop: false }), provider);
}

// Главный путь: наша модель на чужой видеокарте. Согласие спрошено не здесь —
// строка над кнопкой отвечает на «куда уедет мой файл» с той секунды, как
// нажата галочка (`renderPrivacy` в intake.js).
//
// Кадр и приглушение сервер считает сам: правило у них общее (`ceil`
// из /rules/ceilings.mjs), и разойтись эти два ответа не могут. Остальных
// четырёх у него нет вовсе, и они накладываются здесь, на его ответ, — тем же
// `finishLocally`, что и в браузерном пути. Порядок при этом сохраняется:
// кадр и приглушение идут первыми в обоих случаях.
export async function onServer(job) {
  return withExtras(job, await askServer(job));
}

// Текст отказа. Наш ответ — json с полем `error`, и написан он для посетителя
// (`HttpError` в server.js); но перед сервером стоит прокси, а серверный путь
// с 24.08 — путь по умолчанию, и своё «502» после ста пятидесяти секунд прокси
// отдаёт разметкой. Разбор такой страницы падает `SyntaxError`, и посетитель
// прочитал бы в предложении посчитать в браузере про неожиданный «<».
// Поэтому чужое и пустое заменяются здесь одной общей фразой: сказать
// «не вышло» мы вправе, пересказать чужую аварию — уже нет.
async function refusalText(response) {
  const said = await response.json().catch(() => null);
  return said?.error || 'The enlargement did not finish. Try again in a moment.';
}

async function askServer(job) {
  const body = new FormData();
  body.append('photo', job.file);
  body.append('treat', String(job.effects.treat));
  body.append('crop', String(job.effects.crop));
  const response = await fetch('/api/upscale', { method: 'POST', body });
  // Ответ бывает двух видов: авария — по-прежнему JSON, удача — сама
  // картинка байтами. Адреса у неё нет: на нашем диске файл больше не
  // остаётся, и забрать его второй раз неоткуда (server.js). Отсюда и
  // исчезла вторая загрузка — раньше браузер скачивал у нас же то, что
  // сам только что прислал, чтобы наложить размытие и виньетку.
  //
  // Наш текст отказа идёт наружу как есть: он написан для посетителя
  // (`HttpError` в server.js), и пересказывать его своими словами значило бы
  // потерять «через сколько откроется» у отказа по счётчику. Чужой —
  // не идёт вовсе (`refusalText`).
  if (!response.ok) throw new Error(await refusalText(response));
  const blob = await response.blob();
  // Имени может не быть: заголовок наш собственный и нестандартный, и
  // посредник, режущий незнакомые, оставит здесь пусто. Раньше это стоило бы
  // слова «null» у скачанного файла; с тех пор как расширение правится на
  // месте, пустое имя роняет весь путь в `catch` — то есть отказом накрывает
  // готовую работу, которая существует в одном экземпляре и уже оплачена.
  // Тогда имя собирается здесь, как в браузерном пути: номер работы в нём
  // свой, зато файл доезжает.
  //
  // Модель в имени берётся из ответа, а не из здешней записи о том, какая
  // она: считал не этот браузер, и назвать его модель у файла, которого она
  // не касалась, — та же неверная запись, что и наоборот. Срезан и этот
  // заголовок — остаётся слово без имени: сказать «увеличено» мы вправе,
  // назвать чем — уже нет.
  const extension = blob.type === 'image/png' ? '.png' : '.jpg';
  const filename =
    response.headers.get('X-Filename') ||
    job.name(extension, (response.headers.get('X-Model') || 'enlarged').toLowerCase());
  return { blob, filename, extension, provider: 'server' };
}

// Четыре галочки, которых у сервера нет, — поверх его ответа.
async function withExtras(job, sent) {
  const extra = { ...job.effects, crop: false, treat: false };
  if (!Object.values(extra).some(Boolean)) return sent;
  const { finishLocally } = await import('./treat-local.js');
  const { usable } = await import('./upscale-local.js');
  const enlarged = await createImageBitmap(sent.blob);
  const canvas = new OffscreenCanvas(enlarged.width, enlarged.height);
  const ctx = canvas.getContext('2d');
  // Тот же вопрос и та же проверка, что у браузерной ветки: холст сверх
  // предела ничего не рисует и молча отдаёт пустое, а у сервера потолка
  // площади нет вовсе — панорама возвращается почти семнадцатимегапиксельной,
  // и на iOS это уже сверх. Отказом такое накрывать не за что: работа
  // существует в одном экземпляре и уже оплачена, и обои без виньетки лучше,
  // чем пустой файл вместо обоев.
  if (!usable(ctx, enlarged.width, enlarged.height)) {
    enlarged.close();
    return sent;
  }
  ctx.drawImage(enlarged, 0, 0);
  enlarged.close();
  // Формат берётся у присланных байтов, а не у выбранного файла: считал
  // не этот браузер, и что вернулось — известно только из ответа.
  const made = await toFile(job, finishLocally(canvas, extra), 'server', sent.blob.type);
  // Имя остаётся серверным: по нему берётся номер работы, и меняться
  // от того, кто накладывал виньетку, он не должен. Расширение — от того,
  // что вышло из пережатия.
  return { ...made, filename: sent.filename.replace(/\.[^.]+$/, made.extension) };
}
