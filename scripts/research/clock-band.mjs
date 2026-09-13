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
// — пустота: расстояние между 10-м и 90-м процентилями яркости внутри самой
// полосы. Небо, тень и стена дают единицы, ветка поперёк — десятки.
//
// Пустота — отсечка выбранная, а не найденная: обрыва в числах нет, список
// растёт плавно (≤ 8 даёт 24 работы, ≤ 12 — 29, ≤ 20 — 42). Восьмёрка взята
// потому, что это нижняя четверть витрины и дальше глазом уже видно, что через
// полосу что-то идёт. Порог 145 — наоборот, не наш: он из `dimming.mjs`, где
// означает 3.15:1 для белого.
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
const ICONS_MAX = 44;
export const FLAT_MAX = 8;

const pct = (sorted, q) => sorted[Math.round(q * (sorted.length - 1))];
const med = a => {
  const s = [...a].sort((x, y) => x - y);
  const m = s.length / 2;
  return (s[m - 1] + s[m]) / 2;
};

// Яркость и пустота одной полосы. Ширина 200 px — то же условие измерения, что
// у соседних мер: пестрота по яркости зависит от размера, и на полном кадре
// числа оказываются на другой шкале.
export function strip(data, width, height, [y0, y1]) {
  const vals = [];
  for (let y = Math.round(height * y0); y < Math.round(height * y1); y++)
    for (let x = Math.round(width * X0); x < Math.round(width * X1); x++) {
      const i = (y * width + x) * 3;
      vals.push(luma(data[i], data[i + 1], data[i + 2]));
    }
  vals.sort((a, b) => a - b);
  return { lum: Number(pct(vals, 0.9).toFixed(1)), flat: Number((pct(vals, 0.9) - pct(vals, 0.1)).toFixed(1)) };
}

// Полная мера работы по уже прочитанным пикселям кадра шириной 200 px.
export function clockBand(data, width, height) {
  const time = strip(data, width, height, TIME);
  const date = strip(data, width, height, DATE);
  const icons = Number(med(busyness(data, width, height).cells.slice(4, 20)).toFixed(1));
  return {
    lum: time.lum,
    flat: time.flat,
    dateLum: date.lum,
    icons,
    contrast: Number(contrastWithWhite(time.lum).toFixed(1)),
    empty: time.lum <= THRESHOLD && date.lum <= THRESHOLD && time.flat <= FLAT_MAX && icons <= ICONS_MAX
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
