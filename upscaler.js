// Кто увеличивает картинку, когда её считаем мы, а не браузер посетителя.
//
// До 24.08 это был Replicate: чужая модель, чужая цена, пять центов за вызов.
// Теперь — своя модель на чужой видеокарте, взятой на секунды: `4x_NMKD-Siax_200k`
// на Modal, $0.0044 за картинку вместе с холодным стартом. Обработчик лежит
// в `service/upscale_modal.py` и едет туда отдельно от сайта — командой
// `modal deploy`, а не `scripts/deploy.sh`.
//
// Почему именно эта модель: её выбрал вслепую сам заказчик, поставив девять
// версий одной картинки обоями на рабочий стол по одной за раз, и поставил
// её выше платного Topaz. Лицензия WTFPL — без «некоммерчески» и без
// share-alike, в отличие от модели, которая считает в браузере
// (research/2026-08-24-the-model-he-picked-cannot-run-here.md).
import sharp from 'sharp';
import { HttpError } from './http-error.js';
import { resultSize } from './public/frame.js';

// Строки, зависящие от модели, живут только здесь (AGENTS.md): имя для
// заголовка ответа и `slug` для имени скачанного файла.
export const MODEL = {
  title: '4x-NMKD-Siax',
  slug: 'siax'
};

// Потолок входа, тот же, что назван в обработчике. Здесь он стоит второй раз,
// потому что отвечает на другой вопрос: там — «что эндпоинт согласен принять»,
// здесь — «до чего мы уменьшаем, чтобы вопрос не встал». Разойдись они, и
// первым узнает об этом посетитель — отказом 413 на готовой работе.
//
// 4.2 Мп это около ста плиток и около пятидесяти секунд на T4. Дороже —
// не запрещено, а просто не нужно: картинки крупнее приходят уже такими,
// которым расти некуда, и приёмка увеличение для них не предлагает вовсе
// (`grows` в public/intake.js).
const MAX_PIXELS = 4_200_000;
const MAX_SIDE = 2048;

// Дольше, чем контейнеру отпущено на счёт (120 с в `@app.cls`), и намеренно:
// про вызов, который не уложился, должен рассказывать тот, кто считал, —
// у него в ответе причина, а здесь была бы только оборванная связь.
const WAIT_MS = 150_000;

const url = () => (process.env.UPSCALE_URL || '').trim();

// Ключ и секрет заводятся один раз в панели Modal (Settings → Proxy Auth
// Tokens) и проверяются на краю, до контейнера: открытый адрес, который
// кто-то нашёл, — это счёт за холодные старты ради чужих запросов.
function headers() {
  return {
    'Modal-Key': process.env.UPSCALE_KEY || '',
    'Modal-Secret': process.env.UPSCALE_SECRET || '',
    'Content-Type': 'application/octet-stream'
  };
}

// Есть ли куда звать — насколько это видно отсюда. Спрашивается до ворот
// счёта в `limits.js`: без настройки запрос никуда не уходит, но место
// в суточном счётчике занимал бы наравне с настоящими.
export const configured = () => Boolean(url() && process.env.UPSCALE_KEY && process.env.UPSCALE_SECRET);

// Уменьшение ПЕРЕД счётом, а не после. Модель считает по плиткам, и цена
// вызова — это площадь входа; за пиксели, которые мы выбросим сразу после,
// платится наравне с остальными. Уменьшаем только по потолкам эндпоинта,
// а не до «сколько нужно для ×4»: то, что он выбрал вслепую, считалось
// с исходного разрешения, и кормить модель заранее ужатой картинкой значит
// показывать не ту работу, которую он одобрил.
async function shrunkToFit(buffer, width, height) {
  const byArea = Math.sqrt(MAX_PIXELS / (width * height));
  const bySide = MAX_SIDE / Math.max(width, height);
  const ratio = Math.min(1, byArea, bySide);
  if (ratio === 1) return buffer;
  return sharp(buffer, { limitInputPixels: false })
    .resize(Math.round(width * ratio), Math.round(height * ratio), { kernel: 'lanczos3' })
    .jpeg({ quality: 95, chromaSubsampling: '4:4:4' })
    .toBuffer();
}

/**
 * Считает картинку у нас и возвращает готовые байты.
 *
 * Отдаётся jpeg независимо от того, что прислали: у результата до семнадцати
 * мегапикселей, и png такого размера — это десятки мегабайт по проводу
 * за разницу, которой на фотографии нет. Тем же q95 4:4:4 собирался лист,
 * на котором модель и выбирали.
 */
export async function enlarge(buffer, { width, height, targetLongestSide }) {
  if (!configured()) throw new HttpError(503, 'Upscaling is switched off right now.');
  const sent = await shrunkToFit(buffer, width, height);

  let response;
  try {
    response = await fetch(url(), {
      method: 'POST',
      headers: headers(),
      body: sent,
      signal: AbortSignal.timeout(WAIT_MS)
    });
  } catch (error) {
    // Связь оборвалась или вышло время. Наружу — «попробуйте ещё раз»:
    // посетителю нечего делать с именем нашего поставщика видеокарт.
    throw new HttpError(504, 'The enlargement took too long. Try again in a moment.');
  }

  if (!response.ok) throw await refusal(response);

  const grown = Buffer.from(await response.arrayBuffer());
  // Обе стороны названы поимённо, а не «вписать в квадрат»: пропорция берётся
  // у исходника, тем же `resultSize`, каким страница назвала размер до
  // отправки. Вписыванием вторая сторона выводилась бы из пропорции того, что
  // вернула модель, — а она на округлении ужатого входа уезжает на пиксель.
  //
  // `fill` вместо `cover` по той же причине: разница пропорций тут доли
  // пикселя, и обрезать ради неё край картинки не за что.
  const [outWidth, outHeight] = resultSize(width, height, targetLongestSide);
  const output = await sharp(grown, { limitInputPixels: false })
    .resize(outWidth, outHeight, { fit: 'fill', kernel: 'lanczos3' })
    .jpeg({ quality: 95, chromaSubsampling: '4:4:4' })
    .toBuffer();

  return {
    buffer: output,
    contentType: 'image/jpeg',
    // Не отладка: за холодный старт платим отдельно, и без этих чисел цена
    // вызова известна только из панели Modal.
    cold: response.headers.get('X-Cold') === '1',
    seconds: Number(response.headers.get('X-Infer-Secs') || 0),
    tiles: Number(response.headers.get('X-Tiles') || 0),
    provider: response.headers.get('X-Provider') || 'unknown'
  };
}

// Чужой отказ переводится в наш. Тексты разные не для красоты: 413 посетитель
// может исправить сам, 401 исправляем мы и молча, а разница между ними наружу
// уходить не должна.
async function refusal(response) {
  const said = await response.text().catch(() => '');
  if (response.status === 413) return new HttpError(400, 'That picture is too large for us to enlarge.');
  if (response.status === 400) return new HttpError(400, 'That file could not be read as an image.');
  if (response.status === 401 || response.status === 403) {
    // Ключ не тот или протух. Посетителю это выглядит как выключенное
    // увеличение — так оно для него и есть; настоящая причина в логе.
    console.error(`upscaler: доступ закрыт (${response.status}) ${said}`);
    return new HttpError(503, 'Upscaling is switched off right now.');
  }
  return new HttpError(502, 'The enlargement did not finish. Try again in a moment.');
}
