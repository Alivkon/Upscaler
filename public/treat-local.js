// Галочки «приглушить» и «кадр под телефон», посчитанные в браузере.
//
// Правила не переписаны, а прочитаны из тех же файлов, что читает сервер:
// `/rules/ceilings.mjs` — это `scripts/research/`, открытое наружу поимённо
// в server.js. Копия правил здесь означала бы, что витрина и приёмка со
// временем разъедутся молча, а разойтись эти два ответа не должны: галочка
// на сервере и галочка в браузере — одна и та же галочка.
//
// Само правило — `ceil`, и весь его порядок (баланс, потолки, покраска) лежит
// в `treatCeil`, а не переписан здесь: шаги — часть правила, и вторая их запись
// разъехалась бы с первой. Здесь остаётся только кадр, и он первым — пестрота,
// увод и потолки считаются тогда по тому, что увидят; работа, у которой синее
// небо ушло за край, синей больше не является.
import { treatCeil } from '/rules/ceilings.mjs';

// Пропорция та же, что у коллекции: 9:19.5 — самая узкая из ходовых.
const PHONE_RATIO = 9 / 19.5;

export function phoneWindow(width, height) {
  const wide = width / height > PHONE_RATIO;
  const w = wide ? Math.round(height * PHONE_RATIO) : width;
  const h = wide ? height : Math.round(width / PHONE_RATIO);
  return { left: Math.round((width - w) / 2), top: Math.round((height - h) / 2), width: w, height: h };
}

// Проём вырезается копированием на новый холст: `getImageData` по окну вернул бы
// те же пиксели, но дальше нужен именно холст — из него берётся файл.
function cropped(canvas, window) {
  const out = new OffscreenCanvas(window.width, window.height);
  out
    .getContext('2d')
    .drawImage(canvas, window.left, window.top, window.width, window.height, 0, 0, window.width, window.height);
  return out;
}

export function finishLocally(canvas, { treat = false, crop = false } = {}) {
  if (!treat && !crop) return canvas;
  const framed = crop ? cropped(canvas, phoneWindow(canvas.width, canvas.height)) : canvas;
  if (!treat) return framed;

  const ctx = framed.getContext('2d');
  const image = ctx.getImageData(0, 0, framed.width, framed.height);
  // Правила считают по трём каналам подряд, как sharp с `removeAlpha`,
  // а холст держит четыре. Прозрачности здесь взяться неоткуда — модель
  // возвращает три канала, — поэтому альфа просто выбрасывается и ставится
  // обратно единицей.
  const rgb = new Uint8Array((image.data.length / 4) * 3);
  for (let i = 0, j = 0; i < image.data.length; i += 4, j += 3) {
    rgb[j] = image.data[i];
    rgb[j + 1] = image.data[i + 1];
    rgb[j + 2] = image.data[i + 2];
  }
  const { pixels } = treatCeil(rgb, framed.width, framed.height);
  for (let i = 0, j = 0; i < image.data.length; i += 4, j += 3) {
    image.data[i] = pixels[j];
    image.data[i + 1] = pixels[j + 1];
    image.data[i + 2] = pixels[j + 2];
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return framed;
}
