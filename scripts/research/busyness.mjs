// Пестрота по яркости: обо что теряется сама иконка.
//
// Приглушение (dimming.mjs) решает задачу подписи: белый текст читается, пока
// фон под ним тёмный. Обесцвечивание (desaturate.mjs) решает задачу цвета:
// иконке не с чем контрастировать, если под ней лежат три разных тона.
// Ни то, ни другое не решает третью задачу, и она обнаружилась на «Altar
// Frontal»: малиновая вышивка по кремовому льну.
//
// У той работы доля тона 0.994 — тон действительно один, малиновый, просто
// светлый и тёмный. Мера пестроты цвета права и молчит. А иконка на ней
// теряется, потому что рисунок — решётка с размахом яркости в 143 ступени
// на восьми пикселях.
//
// И обесцвечивание тут бессильно не «слабо», а тождественно: оно сохраняет
// яркость пикселя буквально, luma(L + (x−L)k) = L. Полное обесцвечивание
// «Altar Frontal» меняет местный размах со 177.5 на 177.4. Значит, эту
// задачу нельзя решить цветом вообще — только отказом от работы.
//
// Отсюда мера: не «сколько тут разных цветов», а «насколько прыгает яркость
// на клочке размером с иконку».
//
// Окно — не произвольное. Дом меряется той же сеткой 4×6, что и подписи,
// и внутри ячейки берётся след иконки: по ширине центральная часть, по высоте
// от 20% до 70% ячейки — выше подписи, которая живёт на 74–92%. Мерить
// свободным квадратом в 8 px было бы мерить не то: на миниатюре в 200 px
// иконка занимает не восемь пикселей, а тридцать.
//
// Внутри следа берётся не размах, а расстояние между 10-м и 90-м процентилем
// яркости. Размах ловит одну пылинку и врёт; процентили описывают фон.
//
// Число работы — медиана по двадцати четырём следам: «каково здесь обычно».
// Максимум тоже возвращается: одна невозможная ячейка — это другой разговор,
// и иногда важный, но правилом по ней резать нельзя, её может занимать
// осмысленный тёмный угол.

const COLS = 4;
const ROWS = 6;
const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

// След иконки внутри ячейки, по долям ячейки.
const ICON_TOP = 0.2;
const ICON_BOTTOM = 0.7;
const ICON_HALFWIDTH = 2.4; // та же доля ширины, что у подписи в dimming.mjs

const pct = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))];

// Разброс яркости в одном следе иконки.
function spread(data, width, height, col, row) {
  const cx = ((col + 0.5) * width) / COLS;
  const cell = height / ROWS;
  const top = (row * height) / ROWS;
  const x0 = Math.max(0, Math.round(cx - width / COLS / ICON_HALFWIDTH));
  const x1 = Math.min(width, Math.round(cx + width / COLS / ICON_HALFWIDTH));
  const y0 = Math.max(0, Math.round(top + cell * ICON_TOP));
  const y1 = Math.min(height, Math.round(top + cell * ICON_BOTTOM));
  const vals = [];
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      const i = (y * width + x) * 3;
      vals.push(luma(data[i], data[i + 1], data[i + 2]));
    }
  if (vals.length < 4) return 0;
  vals.sort((a, b) => a - b);
  return pct(vals, 0.9) - pct(vals, 0.1);
}

// Пестрота работы: медиана и максимум по двадцати четырём следам.
export function busyness(data, width, height) {
  const all = [];
  for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) all.push(spread(data, width, height, col, row));
  const sorted = [...all].sort((a, b) => a - b);
  const mid = sorted.length / 2;
  return {
    busy: Number((((sorted[mid - 1] + sorted[mid]) / 2) || 0).toFixed(1)),
    worst: Number(sorted[sorted.length - 1].toFixed(1)),
    cells: all.map(v => Number(v.toFixed(1)))
  };
}
