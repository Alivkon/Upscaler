// Полоса часов: пусто ли то место, куда лягут цифры на экране блокировки.
//
// Рядом лежат две меры, и ни одна не отвечает на этот вопрос. `dimming.mjs`
// меряет подписи под иконками — тот же белый текст, но в другом месте кадра.
// `busyness.mjs` меряет, обо что теряется сама иконка, и для часов она врёт:
// у гравюры по чёрному пестрота огромная, а под самими цифрами чернота, и
// белое читается безупречно. Разбор — research/2026-09-12-both-screens.md.
//
// Правило оттуда отвечало на половину вопроса: «тонут ли часы» — яркость под
// цифрами против порога 145. Но читаться можно и поверх ветки. Вторая половина
// — пустота, и как её мерить, выяснилось не сразу.
//
// ПЕРВЫЙ ЗАХОД МЕРЯЛ РАЗМАХ ПО ВСЕЙ ПОЛОСЕ — расстояние между 10-м и 90-м
// процентилями яркости, — и был неправ. Полоса шириной в две трети кадра
// накрывает целое небо, а у неба есть склон: от горизонта к зениту яркость
// плавно едет, и размах выходит большой там, где глазом пусто. «Mount
// Washington» отвергалась с 8.8 при отсечке 8, имея под цифрами чистое небо.
//
// Мера поэтому местная, и это тот же довод, что в `busyness.mjs`: важно не
// «сколько всего в полосе», а «прыгает ли яркость на клочке размером с цифру».
// Полоса режется окнами 16×16 с шагом 8, в каждом берётся расстояние между
// 10-м и 90-м процентилями, и число работы — 90-й процентиль по окнам.
// Не медиана: ствол через цифры занимает четверть окон, и медиана его
// проглатывает. Не максимум: одно окно ловит соринку и врёт (та же причина,
// по которой `busyness.mjs` не режет по своему `worst`).
//
// Шестнадцать пикселей — не произвольно. Цифры набраны кеглем 0.235 ширины
// кадра, на копии в 200 px это 47 px высоты; 16 px — просвет внутри цифры,
// тот клочок, на фоне которого глаз читает штрих.
//
// Отсечка 18 ВЫБРАНА ПО МЕТКАМ, а не по квантилю витрины: 22 работы, у которых
// цифры лежат на небе, стене или ровной темноте, против 3, через которые идёт
// ствол, карниз или ветка. Метки и счёт — в research/2026-09-13-clock-band.md.
// Две кучи эта мера разделяет (пусто до 17.7, занято от 20.0), а размах по всей
// полосе — нет, он их перекрывает. Порог 145 — наоборот, не наш: он из
// `dimming.mjs`, где означает 3.15:1 для белого.
//
// Меряется то, что поедет на телефон, — `crops.phone` из манифеста, как он
// есть. Подставлять приглушённый кадр там, где в манифесте `-none-`, нельзя:
// у двенадцати работ приглушённого файла нет не по недосмотру, а по решению
// (поле `treatment`, см. AGENTS.md), и они уезжают такими. Померить их
// приглушёнными значит померить файл, которого не будет.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { busyness } from './busyness.mjs';
import { luma, THRESHOLD, contrastWithWhite } from './dimming.mjs';
import { cardName, cardCreator } from '../../pages.js';

const ROOT = new URL('../../', import.meta.url).pathname;

// Полоса цифр в долях кадра. Дата стоит выше и проверяется отдельно: она мельче,
// но лежит там, где у пейзажа начинается небо, и тонет раньше часов.
export const TIME = [0.135, 0.245];
export const DATE = [0.075, 0.12];
const X0 = 0.18;
const X1 = 0.82;

// Пестрота рядов 1–4 — домашний экран. Потолок 44 — из восьми эталонов Charlie,
// его держит «Vase of Flowers»; проверяется заодно, чтобы список не предлагал
// работу, годную только под часы.
export const ICONS_MAX = 44;
export const FLAT_MAX = 18;

// Окно местной меры и шаг между окнами, в пикселях копии шириной 200.
const WIN = 16;
const STEP = 8;

const pct = (sorted, q) => sorted[Math.round(q * (sorted.length - 1))];
const med = a => {
  const s = [...a].sort((x, y) => x - y);
  const m = s.length / 2;
  return (s[m - 1] + s[m]) / 2;
};

// Ширина 200 px — то же условие измерения, что у соседних мер: разброс яркости
// зависит от размера, и на полном кадре числа оказываются на другой шкале.
const box = (width, height, [y0, y1]) => [
  Math.round(width * X0),
  Math.round(height * y0),
  Math.round(width * X1),
  Math.round(height * y1)
];
const at = (data, width, x, y) => {
  const i = (y * width + x) * 3;
  return luma(data[i], data[i + 1], data[i + 2]);
};

// Яркость под белым текстом: 90-й процентиль по всей полосе. Здесь мера
// намеренно общая — тонет текст от светлого фона, где бы тот ни был.
export function strip(data, width, height, band) {
  const [x0, y0, x1, y1] = box(width, height, band);
  const vals = [];
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) vals.push(at(data, width, x, y));
  vals.sort((a, b) => a - b);
  return Number(pct(vals, 0.9).toFixed(1));
}

// Пустота полосы: 90-й процентиль местного разброса по окнам.
export function emptiness(data, width, height, band) {
  const [x0, y0, x1, y1] = box(width, height, band);
  const spreads = [];
  for (let y = y0; y + WIN <= y1; y += STEP)
    for (let x = x0; x + WIN <= x1; x += STEP) {
      const vals = [];
      for (let j = y; j < y + WIN; j++) for (let i = x; i < x + WIN; i++) vals.push(at(data, width, i, j));
      vals.sort((a, b) => a - b);
      spreads.push(pct(vals, 0.9) - pct(vals, 0.1));
    }
  spreads.sort((a, b) => a - b);
  return Number(pct(spreads, 0.9).toFixed(1));
}

// Полная мера работы по уже прочитанным пикселям кадра шириной 200 px.
export function clockBand(data, width, height) {
  const lum = strip(data, width, height, TIME);
  const dateLum = strip(data, width, height, DATE);
  const flat = emptiness(data, width, height, TIME);
  const icons = Number(med(busyness(data, width, height).cells.slice(4, 20)).toFixed(1));
  return {
    lum,
    flat,
    dateLum,
    icons,
    contrast: Number(contrastWithWhite(lum).toFixed(1)),
    empty: lum <= THRESHOLD && dateLum <= THRESHOLD && flat <= FLAT_MAX && icons <= ICONS_MAX
  };
}

// Витрина: видимые работы каталога, у которых в манифесте есть телефонная обрезка.
export async function measureGallery() {
  const names = (await fs.readdir(path.join(ROOT, 'catalogue'))).filter(f => /^vl-\d+\.json$/.test(f));
  const manifest = JSON.parse(await fs.readFile(path.join(ROOT, 'images/manifest/museum.json'), 'utf8'));
  const byRef = new Map((Array.isArray(manifest) ? manifest : Object.values(manifest)).map(e => [e.ref, e]));
  const rows = [];
  for (const name of names) {
    const work = JSON.parse(await fs.readFile(path.join(ROOT, 'catalogue', name), 'utf8'));
    if (work.hidden) continue;
    const file = byRef.get(work.ref)?.crops?.phone?.file;
    if (!file) continue;
    const { data, info } = await sharp(path.join(ROOT, 'images', file))
      .resize({ width: 200 })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    rows.push({
      ref: work.ref,
      slug: work.slug,
      // Название и автор берутся оттуда же, откуда их берёт карточка витрины.
      // Музейное `provenance.work` тут не годится: у части работ оно на языке
      // оригинала («Pragt-stilleben», «Interiør. Kunstigt lys»), и лист называл
      // бы работу не тем именем, под которым она стоит на сайте. Автор бывает
      // пустым, и это не пропуск: у работы с `creatorKind: "unknown"` витрина
      // держит строку пустой намеренно — «Unknown» не имя, а шум.
      work: cardName(work),
      creator: cardCreator(work),
      date: work.provenance?.date ?? '',
      file: path.basename(file),
      ...clockBand(data, info.width, info.height)
    });
  }
  return rows;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rows = await measureGallery();
  const empty = rows.filter(r => r.empty).sort((a, b) => a.lum - b.lum);
  const by = r => [r.creator, r.date].filter(Boolean).join(', ');
  const line = r =>
    `  ${String(r.contrast).padStart(5)}:1  ${String(r.flat).padStart(4)}  ${r.ref}  ` +
    `${r.work}${by(r) ? ` — ${by(r)}` : ''}`;
  console.log(`витрина: ${rows.length} видимых работ`);
  console.log(`полоса часов пуста у ${empty.length} (яркость ≤ ${THRESHOLD}, размах ≤ ${FLAT_MAX}, иконки ≤ ${ICONS_MAX})\n`);
  const dark = empty.filter(r => r.contrast >= 10);
  console.log(`тёмные — ${dark.length}, контраст с белым от 10:1:\n  контраст  размах  работа`);
  for (const r of dark) console.log(line(r));
  const pale = empty.filter(r => r.contrast < 10);
  console.log(`\nсветлые — ${pale.length}, полоса пуста, но светла:\n  контраст  размах  работа`);
  for (const r of pale) console.log(line(r));
}
