// Что приёмка делает с чужой картинкой сверх увеличения: приглушает,
// обесцвечивает и кроит под телефон. Обе галочки выключены по умолчанию
// (`pages.js`), и это не осторожность, а определение работы приёмки:
// она возвращает принесённое крупнее, а не переделанным под вкус сайта.
//
// Настройки — те же, что несёт коллекция: приглушение ×0.80 и обесцвечивание
// `whole` силой по работе (`wholeStrength`). Тот, кто поставил галочку, просит
// не «сделайте потемнее», а «сделайте как у вас», и разойтись эти два ответа
// не должны. Сами правила лежат в `scripts/research/` и оттуда же берутся
// генератором коллекции: два набора настроек означали бы, что витрина
// и приёмка со временем разъедутся молча.
//
// Порядок — цвет, потом яркость. Приглушение решает силу по тем пикселям,
// которые поедут на экран; поставленное первым, оно мерило бы ещё цветную
// картинку и ослабляло себя зря.
//
// Кадр берётся ДО обработки, а не после. Так дешевле — обесцвечивание идёт
// по пикселям, и кадр их отбрасывает раньше, — но главное, что доля главного
// тона считается тогда по тому, что увидят. Работа, у которой синее небо
// уходит за край кадра, синей больше не является, и мерить её по отрезанному
// значило бы обесцветить по цвету, которого в файле не осталось.
//
// В коллекции порядок обратный — там кроят уже обработанную плиту, потому что
// плита отдаётся сама по себе и обязана быть обработанной целиком. Здесь
// отдаётся ровно один файл, и мерить его по себе же вернее.
//
// Настройки не просто текущие, а одобренные: 19.08.2026 Charlie назвал
// нравящейся ту «Rocky, Wooded Landscape with a Dell and Weir» (vl-0240),
// которую дали именно эти числа. Точка возврата описана в шапке
// `wallpaper-gen/treatment.mjs` — там же sha256 плиты и исходника, по которым
// правку можно проверить. Числа живут в `scripts/research/` и меняются сразу
// в обеих половинах; эта запись говорит, что менять их — значит менять
// картинку, которую человек выбрал, а не подкрутить параметр.
import sharp from 'sharp';
import { applied } from './scripts/research/dimming.mjs';
import { hueStats, desaturate } from './scripts/research/desaturate.mjs';

// Телефонный кадр коллекции. 9:19.5 — не пропорция конкретного телефона,
// а самая узкая из ходовых: кадр под неё заполняет и её, и всё, что шире,
// теряя по краям, а не оставляя поля. Кадр по 9:16 на экране 19.5 не сойдётся.
export const PHONE_RATIO = 9 / 19.5;

const DIM = 0.8;

// Проём вписывается в картинку целиком и ставится по центру: середина —
// единственное место, о котором можно что-то утверждать, не посмотрев.
// Правила поумнее (`attention`, `entropy`, коробка сюжета) в коллекции есть,
// и там их выбирают работе по одной, глазом; здесь смотреть некому — картинка
// чужая и видит её только тот, кто прислал.
export function phoneWindow(width, height) {
  const w = width / height > PHONE_RATIO ? Math.round(height * PHONE_RATIO) : width;
  const h = width / height > PHONE_RATIO ? height : Math.round(width / PHONE_RATIO);
  return { left: Math.round((width - w) / 2), top: Math.round((height - h) / 2), width: w, height: h };
}

// Формат сохраняется: приёмка вернула PNG — пусть PNG и останется. Смена
// формата на выходе означала бы, что галочка «потемнее» заодно пережала файл.
const formatOf = format => (format === 'png' ? 'png' : format === 'webp' ? 'webp' : 'jpeg');

export async function finish(buffer, { treat = false, crop = false } = {}) {
  if (!treat && !crop) return buffer;
  const source = sharp(buffer, { limitInputPixels: false });
  const { width, height, format, hasAlpha } = await source.metadata();
  if (!width || !height) return buffer;
  const out = formatOf(format);
  const window = crop ? phoneWindow(width, height) : null;
  const framed = () => {
    const next = sharp(buffer, { limitInputPixels: false });
    return window ? next.extract(window) : next;
  };
  if (!treat) return framed().toFormat(out).toBuffer();

  const { data, info } = await framed().removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const stats = hueStats(data);
  const muted = desaturate(Buffer.from(data), 'whole', stats);
  const pixels = applied(Buffer.from(muted.pixels), [DIM, DIM, DIM]);
  let treated = sharp(pixels, { raw: { width: info.width, height: info.height, channels: 3 } });
  // Прозрачность возвращается на место. Обработка идёт по трём каналам —
  // приглушать нечего там, где пикселя нет, — а `removeAlpha` не прячет
  // прозрачное, а заливает его чёрным: без этого шага логотип на прозрачном
  // фоне вернулся бы на чёрной плашке, и вина легла бы на галочку «потемнее».
  if (hasAlpha) {
    const alpha = await framed().extractChannel('alpha').raw().toBuffer();
    treated = treated.joinChannel(alpha, { raw: { width: info.width, height: info.height, channels: 1 } });
  }
  return treated.toFormat(out).toBuffer();
}
