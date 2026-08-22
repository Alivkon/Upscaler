// Обработка `ceil` — та, которую Charlie выбрал чаще всех остальных.
//
// 21.08.2026 на листе `/edits` каждая из 79 работ была показана шестью
// версиями, и отмечали ту, которая идёт картине. `ceil` собрала 22 отметки —
// больше любой другой, — и сейчас её несут 19 из 76 работ на витрине.
// Прежнее правило `dim80-desat-whole`, которым выпущены все неотмеченные
// работы, на витрине осталось у семи: разбор в
// `research/2026-08-21-treatment-per-work.md`.
//
// Правило целиком:
//
//   1. баланс по серому в половину силы (`grey-balance.mjs`);
//   2. обесцвечивание целиком силой 0.55 по пестроте (`desaturate.mjs`);
//   3. приглушение ×0.80;
//   4. два потолка: средняя цветность ≤18 и средняя яркость ≤65.
//
// Потолки — это МИНИМУМ, а не приведение к числу: работа, которая и так стоит
// ниже, остаётся со своей плоской настройкой. И они взаимозависимы — цветность
// читается после приглушения, приглушение после цветности, — поэтому решение
// сходится в три круга, а не вычисляется. Три круга, а не «до сходимости»:
// столько же делал лист, по которому выбирали.
//
// ЧИСЛА ПЕРЕПИСАНЫ ИЗ `wallpaper-gen/treatment.mjs`, И ЭТО ЧЕТВЁРТАЯ КОПИЯ
// РАСЧЁТА. Причина та же, по которой продублировано обесцвечивание (см. шапку
// того файла): репозитории ездят порознь, генератор обязан собираться на
// машине без сайта. Первоисточник самих настроек — `research/presets.json`;
// меняются они в обоих местах сразу.
//
// ОДНО ОТЛИЧИЕ ОТ ГЕНЕРАТОРА, И ОНО НАМЕРЕННОЕ. Генератор решает потолки по
// телефонному кадру, а красит целую плиту: со страницы работы смотрят через
// проём, а кадры режутся из плиты и обязаны совпасть с ней по цвету. В приёмке
// отдаётся ровно один файл — тот, что человек унесёт, — и меряется он по себе:
// поставил галочку кадра, решаем по кадру; не поставил — по всей картинке.
// Приглушать за пиксели, которых никто не увидит, здесь не за чем.
//
// ВТОРОЕ ОТЛИЧИЕ — ЦЕНА ЗА ТО, ЧТОБЫ ОБЕ ПОЛОВИНЫ ПРИЁМКИ СОВПАДАЛИ. Проба
// уменьшается `reduce()` — усреднением по клетке, — а не lanczos3 из sharp,
// потому что в браузере sharp'а нет, а два разных уменьшения дали бы две разные
// картинки на одной галочке. Расхождение с генератором замерено на всех 19
// работах, которые несут `ceil`: худшее по множителю цвета 0.044 (vl-0030),
// по яркости 0.004, а на самой картинке — не больше 2 из 255 у одного пикселя
// и 0.4 в среднем. Разбор: `research/2026-08-22-intake-treats-like-the-ticks.md`.
import { hueStats, polychromy } from './desaturate.mjs';
import { applied, clamp, luma, COLLECTION_DIM } from './dimming.mjs';
import { greyCast, gainsAt } from './grey-balance.mjs';

export const BALANCE = 0.5; // сила баланса по серому: «yeah most got better», 20.08
export const CAST_AT = 200; // на скольких пикселях читается увод
export const PROBE = 180; // ширина, на которой решаются потолки

// `t` — сколько цвета правило снимает у самой пёстрой работы, `dim` — плоский
// множитель яркости, `capC` и `capL` — потолки средней цветности и средней
// яркости, которые решаются под каждую картинку отдельно.
export const CEIL = { t: 0.55, dim: COLLECTION_DIM, capC: 18, capL: 65 };

/**
 * Проба: та же картинка шириной `outW`, каждый пиксель — среднее по своей
 * клетке. Решать потолки по полному размеру незачем — средние и доли на пробе
 * устойчивы, — а три круга по 68 мегапикселям стоят минуты.
 */
export function reduce(data, width, height, outW) {
  const w = Math.max(1, Math.min(outW, width));
  const h = Math.max(1, Math.round((height * w) / width));
  const out = new Uint8Array(w * h * 3);
  for (let y = 0; y < h; y++) {
    const y0 = Math.floor((y * height) / h);
    const y1 = Math.max(y0 + 1, Math.floor(((y + 1) * height) / h));
    for (let x = 0; x < w; x++) {
      const x0 = Math.floor((x * width) / w);
      const x1 = Math.max(x0 + 1, Math.floor(((x + 1) * width) / w));
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let yy = y0; yy < y1; yy++)
        for (let xx = x0; xx < x1; xx++) {
          const i = (yy * width + xx) * 3;
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          n++;
        }
      const o = (y * w + x) * 3;
      out[o] = Math.round(r / n);
      out[o + 1] = Math.round(g / n);
      out[o + 2] = Math.round(b / n);
    }
  }
  return { pixels: out, width: w, height: h };
}

// Средний цвет и средняя цветность пробы, пропущенной через кандидата. Одним
// проходом: потолки читают оба числа, и второй проход был бы вторым кругом
// ради красоты.
function measure(px, k, b) {
  let sr = 0;
  let sg = 0;
  let sb = 0;
  let sc = 0;
  let n = 0;
  for (let i = 0; i < px.length; i += 3) {
    const l = luma(px[i], px[i + 1], px[i + 2]);
    const r = clamp((l + (px[i] - l) * k) * b);
    const g = clamp((l + (px[i + 1] - l) * k) * b);
    const bl = clamp((l + (px[i + 2] - l) * k) * b);
    sr += r;
    sg += g;
    sb += bl;
    sc += Math.max(r, g, bl) - Math.min(r, g, bl);
    n++;
  }
  return { rgb: [sr / n, sg / n, sb / n], chroma: sc / n };
}

/** Множители цвета и яркости, решённые по пробе. */
export function solve(rule, probe) {
  const share = hueStats(probe).share;
  const kBase = 1 - (rule.t ?? 0) * polychromy(share);
  let k = kBase;
  let b = rule.dim ?? 1;
  for (let pass = 0; pass < 3; pass++) {
    if (rule.capC) {
      const chroma = measure(probe, kBase, 1).chroma * b;
      k = chroma <= rule.capC ? kBase : (kBase * rule.capC) / Math.max(chroma, 0.001);
    }
    if (rule.capL) {
      const l = luma(...measure(probe, k, 1).rgb);
      b = Math.min(rule.dim ?? 1, rule.capL / Math.max(l, 0.001));
    }
  }
  return { share: Number(share.toFixed(3)), k: Number(k.toFixed(3)), b: Number(b.toFixed(3)) };
}

/**
 * Накладывает решение на сырые RGB.
 *
 * Округления внутри нет, и это не небрежность: его не было на листе, по
 * которому выбирали настройку, а `desaturate.mjs` округляет — там оно стоит
 * с прежнего правила и сдвинуло бы все 246 плит, выпущенных им, включая
 * закреплённую по sha256. Поэтому цвет здесь считается своей строкой, а не
 * вызовом `desaturate`.
 */
export function paint(data, { k, b }) {
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i += 3) {
    const l = luma(data[i], data[i + 1], data[i + 2]);
    out[i] = clamp((l + (data[i] - l) * k) * b);
    out[i + 1] = clamp((l + (data[i + 1] - l) * k) * b);
    out[i + 2] = clamp((l + (data[i + 2] - l) * k) * b);
  }
  return out;
}

/**
 * Всё правило целиком, от сырых RGB до сырых RGB. Порядок шагов — часть
 * правила, поэтому он живёт здесь, а не переписывается на сервере и в браузере
 * по отдельности: разойдясь, две половины приёмки вернули бы разные картинки
 * на одну галочку.
 *
 * Увод читается на 200 px, а не на полном размере, по той же причине, что и
 * потолки: это среднее по пятой части пикселей, и проба его не портит.
 * `greyCast` возвращает `null`, когда бесцветного меньше 2% работы — это
 * «мерить не на чем», и тогда баланс просто не применяется.
 */
export function treatCeil(data, width, height, rule = CEIL) {
  const cast = greyCast(reduce(data, width, height, CAST_AT).pixels);
  const gains = cast ? gainsAt(cast.gain, BALANCE) : [1, 1, 1];
  const balanced = applied(data, gains);
  const probe = reduce(balanced, width, height, PROBE);
  const solution = solve(rule, probe.pixels);
  return { pixels: paint(balanced, solution), gains, solution };
}
