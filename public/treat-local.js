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

import { phoneWindow } from './frame.js';

// Два числа, задающие вкус двух остальных галочек. Оба — доли, а не пиксели:
// превью считается на тысяче пикселей по длинной стороне, а результат бывает
// и на четырёх тысячах, и эффект, заданный в пикселях, на них выглядел бы
// по-разному. Показанное перестало бы предсказывать полученное, то есть
// превью перестало бы быть превью.
//
// Обесцвечивания среди них нет и не было нужно: `ceil` в приглушении уже
// сажает потолок цвета, и на одной картинке две галочки давали почти одно
// и то же — 13.9 против 13.1 средней хромы при 23.8 у исходника. Вторая
// подпись под тем же действием читалась как два разных.
const BLUR_OF_SIDE = 0.0025; // радиус размытия как доля длинной стороны
const VIGNETTE_DEPTH = 0.12; // насколько темнее угол (было 0.24 — вдвое сильнее)

// Проём вырезается копированием на новый холст: `getImageData` по окну вернул бы
// те же пиксели, но дальше нужен именно холст — из него берётся файл.
function cropped(canvas, window) {
  const out = new OffscreenCanvas(window.width, window.height);
  out
    .getContext('2d')
    .drawImage(canvas, window.left, window.top, window.width, window.height, 0, 0, window.width, window.height);
  return out;
}

const whole = canvas => ({ left: 0, top: 0, width: canvas.width, height: canvas.height });

// Размытие. Считается фильтром контекста, то есть при рисовании, и потому
// требует нового холста: на месте размыть нельзя.
//
// Рисуется с запасом за краями. `filter: blur` считает то, чего за границей
// холста нет, прозрачностью, и без запаса шла бы светлая кайма шириной
// в радиус. Запас берётся растяжением на три радиуса — на картинке в 1440
// пикселей это чуть больше процента и незаметно, а кайму убирает целиком.
function blurred(canvas) {
  const out = new OffscreenCanvas(canvas.width, canvas.height);
  const ctx = out.getContext('2d');
  const radius = Math.max(1, Math.round(Math.max(canvas.width, canvas.height) * BLUR_OF_SIDE));
  ctx.filter = `blur(${radius}px)`;
  const pad = radius * 3;
  ctx.drawImage(canvas, -pad, -pad, canvas.width + pad * 2, canvas.height + pad * 2);
  return out;
}

// Виньетка — умножение на радиальный градиент. Эллипс, вписанный в кадр, а не
// круг: на телефонной пропорции круглая виньетка гасит верх и низ и вовсе
// не трогает бока, и читается это как затухание, а не как виньетка. Холст
// для этого сжимается по вертикали до квадрата, в котором круг и есть
// нужный эллипс.
//
// Затемнение растёт не линейно, а вчетверо круче к краю (`ease` в квадрате):
// у линейного видно, где градиент начался — по кадру идёт кольцо.
function vignetted(canvas) {
  const { width: w, height: h } = canvas;
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.scale(1, h / w);
  const shade = ctx.createRadialGradient(0, 0, 0, 0, 0, w * Math.SQRT1_2);
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const ease = t * t * (3 - 2 * t);
    const value = Math.round(255 * (1 - VIGNETTE_DEPTH * ease * ease));
    shade.addColorStop(t, `rgb(${value},${value},${value})`);
  }
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = shade;
  // В сжатом пространстве холст — квадрат со стороной w.
  ctx.fillRect(-w / 2, -w / 2, w, w);
  ctx.restore();
  return canvas;
}

// Кадр остаётся и здесь, хотя счёт его больше не просит: он режет до модели
// (`upscaleInBrowser`). Нужен он тому, у кого готовый холст уже на руках
// и кадра в нём нет, — превью и пути через сервер.
//
// Порядок не произволен. Кадр первым: пестрота, увод и потолки считаются по
// тому, что останется видно, — работа, у которой синее небо ушло за край,
// синей больше не является. Виньетка последней: она гасит углы готовой
// картинки, и посчитанное по ней приглушение сочло бы кадр темнее, чем он есть.
export function finishLocally(canvas, options = {}) {
  const { treat = false, crop = false, blur = false, vignette = false } = options;
  if (!treat && !crop && !blur && !vignette) return canvas;
  // Копия даже без кадра: дальше холст правится на месте, а пришедший сюда
  // принадлежит вызвавшему — превью считает по нему заново на каждую галочку.
  let framed = cropped(canvas, crop ? phoneWindow(canvas.width, canvas.height) : whole(canvas));
  if (treat) framed = dimmed(framed);
  if (blur) framed = blurred(framed);
  if (vignette) framed = vignetted(framed);
  return framed;
}

// Приглушение — правило `ceil` целиком, вместе с балансом, потолками
// и покраской; шаги здесь не повторены, они часть правила.
function dimmed(framed) {
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
