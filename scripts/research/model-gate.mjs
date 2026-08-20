// Человек и рамка — моделью, а не правилом.
//
// ПОЧЕМУ. Две меры из четырёх упёрлись в потолок, и по разным причинам.
//
// Человек. Правило по названию ловит 320 работ, но названию верить нечем:
// «Fragment», «Untitled», «Panel» ничего не говорят. Пиксельные ворота — CLIP
// ViT-B/32 zero-shot — при пороге, выставленном на точность, теряют 31%
// фигур: 83 работы с людьми проходят внутрь. Понизить порог нельзя, там
// начинаются ложные отказы. Полоса из 151 работы размечена руками, и внутри
// неё CLIP — не шум (AUC 0.86), а всего лишь слабый градиент заметности.
//
// Рамка. `frame_gate.py` заявляет 99.0% полноты и 91.9% точности — числа
// воспроизведены. Но размечено 407 работ, и среди них **нет ни одной работы
// Артинститута или Кливленда**, то есть ровно того пула, к которому правило
// теперь применяется (947 отказов из 1451). Точность на этом пуле никем
// не мерена. Плюс на 200 px полнота падает до 96.6%.
//
// Объекты моделью НЕ заменяются: правило читает слова техники из карточки
// музея («ткань», «сосуд»), это не догадка по картинке, и Charlie считает его
// почти безошибочным. Заменять работающее правило вызовом за деньги незачем.
//
// ЧТО СПРАШИВАЕТСЯ. Один вызов на работу отвечает сразу на оба вопроса:
// картинка одна, а два вызова стоили бы вдвое. Формулировки взяты дословно
// из тех правил, по которым размечал Charlie, — иначе модель и метки отвечали
// бы на разные вопросы, и точность мерила бы расхождение формулировок.

// Работы, которые остаются, что бы модель ни ответила. Не «модель ошиблась» —
// Ямамба это горная ведьма, фигура на ней есть и модель права. Charlie сказал
// оставить (17.08.2026), и это кураторское решение, а не поправка к мере.
//
// Список сильнее всех ворот сразу, включая рамку: сказано «оставить», а не
// «оставить, если не найдётся паспарту». Если у работы из списка окажется
// поле, она попадёт в галерею с полем — тогда чинить надо снимок, а не ворота.
export const KEEP = {
  'aic-154667.jpg': 'Ямамба — Charlie оставил её при живой фигуре, 17.08.2026'
};

// Легенда та же, что в band-labels.json: иначе метки и ответы модели
// пришлось бы переводить друг в друга, и перевод стал бы отдельной ошибкой.
export const FIGURE = { NONE: 0, STAFFAGE: 1, SUBJECT: 2 };

export const PROMPT = `You are looking at a photograph of a single artwork from a museum collection.

Answer two questions about it.

1. FIGURE — is a human or humanlike figure depicted?
   Deities, saints, angels, demons, skeletons and carved or sculpted human
   figures all count. Animals do not. Judge the image, not any title.
     2 = a figure is the subject: a portrait, a group, a religious scene, a nude
     1 = a figure is present but incidental — staffage in a landscape, a tiny
         figure on a bridge, figures woven into a repeating pattern
     0 = no human figure at all

2. FRAME — is there a border around the artwork that is not part of the artwork?
   A mount or mat, a paper margin, a backing board, a studio backdrop the object
   was photographed against, or the frame itself. A painted border inside the
   composition is not a frame. Answer true or false.

Be literal. Report what you can see, not what the artwork is likely to contain.`;

// Qwen3-VL на Replicate схемы не принимает и отвечает свободным текстом,
// поэтому ему тот же вопрос задаётся коротко, а ответ разбирается по словам.
// Формулировки совпадают с PROMPT дословно — иначе разница между моделями
// оказалась бы разницей между промптами, и понять, кто лучше, стало бы нельзя.
const FIGURE_RULE = `Is a human or humanlike figure depicted? Deities, saints, angels, demons,
skeletons and carved or sculpted human figures count. Animals do not.
  SUBJECT = a figure is the subject: a portrait, a group, a religious scene, a nude
  TINY    = a figure is present but incidental: staffage in a landscape, a tiny figure
            on a bridge, figures woven into a repeating pattern
  NONE    = no human figure at all`;

const FRAME_RULE = `Is there a border around the artwork that is not part of the artwork?
A mount or mat, a paper margin, a backing board, a studio backdrop the object was
photographed against, or the frame itself. A painted border inside the composition
is not a frame.
  FRAME = there is such a border
  CLEAN = there is not`;

export const PROMPT_FIGURE = `${FIGURE_RULE}\n\nAnswer with exactly one word: SUBJECT, TINY or NONE.`;
export const PROMPT_FRAME = `${FRAME_RULE}\n\nAnswer with exactly one word: FRAME or CLEAN.`;
export const PROMPT_BOTH = `${FIGURE_RULE}\n\n${FRAME_RULE}\n\nAnswer with exactly two words: the figure word, then the frame word.`;

// Разбор свободного ответа. Неузнанное возвращается как null, а не как «нет»:
// молчание модели и её «людей тут нет» — разные события, и складывать их
// в одну кучу значит записать сбой в успех.
//
// Сырая строка сохраняется целиком, а не только разобранный ответ. Если
// сдвоенный вопрос окажется хуже раздельного, важно знать, чем именно: модель
// ответила неверно или сломала формат под двойной инструкцией. Разбор эти два
// случая склеивает, и без сырой строки различить их потом нечем.
export function parseWords(text) {
  const raw = String(text).trim();
  const up = raw.toUpperCase();
  const fig = /\bSUBJECT\b/.test(up) ? 2 : /\bTINY\b/.test(up) ? 1 : /\bNONE\b/.test(up) ? 0 : null;
  const frame = /\bFRAME\b/.test(up) ? true : /\bCLEAN\b/.test(up) ? false : null;
  return { figure: fig, frame, raw, why: raw.slice(0, 60) };
}

export const SCHEMA = {
  type: 'object',
  properties: {
    figure: { type: 'integer', enum: [0, 1, 2], description: '2 subject, 1 staffage, 0 none' },
    frame: { type: 'boolean', description: 'a mount, margin, backing or backdrop around the work' },
    why: { type: 'string', description: 'at most eight words' }
  },
  required: ['figure', 'frame', 'why']
};

// Прятать ли работу. Мнение о статисте отдельным ключом: вопрос «убирать ли
// статистов» Charlie ещё не решил, и 51 пример лежит у него на листе. По
// умолчанию — как ворота вели себя до модели: любая фигура прячет.
//
// `rule` — ответ frame_gate.py по той же работе, true/false/null. Без него
// ворота рамки остаются одной моделью, то есть той колонкой, которую Charlie
// не выбрал: принимать его молча значит тихо сменить решение.
export function hides(answer, file, { staffage = true, rule = null, hand = null } = {}) {
  if (KEEP[file]) return { human: false, frame: false, saw: [], sure: true, kept: KEEP[file] };
  const human = answer.figure === FIGURE.SUBJECT || (staffage && answer.figure === FIGURE.STAFFAGE);
  const seen = framed(rule, answer.frame, hand);
  return { human, frame: seen.framed, saw: seen.saw, sure: seen.sure, kept: null };
}

// Рамка — обоими воротами сразу, по «или»: прячем, если поле увидел хоть один.
//
// ПОЧЕМУ НЕ ЗАМЕНА. Правило и модель на всех 410 метках согласны только
// на 346 из 410 (84.4%). Ошибаются они по-разному, и это важнее, чем кто
// точнее поодиночке: замена выбросила бы вторую половину находок вместе
// со второй половиной ошибок. Замерено на тех же 410 метках, правило
// пересчитано заново, а не взято из его шапки:
//
//   правило                 точность 91.4%  полнота 98.7%   28 лишних ·  4 пропущено
//   модель                  точность 96.4%  полнота 88.7%   10 лишних · 34 пропущено
//   любой из двоих («или»)  точность 89.8%  полнота 99.3%   34 лишних ·  2 пропущено
//   оба сразу («и»)         точность 98.5%  полнота 88.0%    4 лишних · 36 пропущено
//
// Charlie выбрал «или» 17.08.2026. Цена ошибок несимметрична и записана
// в frame_gate.py: пропущенная рамка попадает в галерею и портит её, лишний
// отказ стоит одной работы из тысяч. «Или» ловит на 32 рамки больше модели
// ценой 24 зря выброшенных работ — по этой цене выгодно.
//
// Числа проверяются даром: `node .modelgate.mjs combine` считает по кэшу.
// `hand` — разметка глазом (frame-labels-charlie.json). Она бьёт оба автомата
// и не участвует в «или»: «или» существует затем, чтобы угадать ответ глаза,
// и складывать её с догадками значило бы позволить догадке отменить ответ.
// Первые четыре метки Charlie поставил 17.08.2026 — все четыре отменяют
// правило на европейской живописи маслом.
export function framed(rule, model, hand = null) {
  if (hand === true || hand === false) return { framed: hand, saw: ['глаз'], sure: true };
  // «Не знаю» и «нет поля» в одну кучу не складываются. Правила может не быть
  // (полный снимок не скачан), модель могла сломать формат — и тогда «рамки
  // нет» означало бы «никто не смотрел». Это видно по `sure`, а не молчанием.
  const answered = v => v === true || v === false;
  const saw = [];
  if (rule === true) saw.push('правило');
  if (model === true) saw.push('модель');
  return { framed: saw.length > 0, saw, sure: answered(rule) || answered(model) };
}

// Миниатюры в пуле лежат по 200 px, а рамке этого мало: на 200 px правило
// теряло втрое больше рамок, чем на 500. Полные снимки уже скачаны соседней
// сессией, так что смотреть надо на них.
export function fullPath(file, root) {
  const aic = /^aic-(\d+)\.jpg$/.exec(file);
  if (aic) return `${root}/aic/full/${aic[1]}.jpg`;
  const cle = /^c(\d{4})_(.+)\.jpg$/.exec(file);
  if (cle) return `${root}/cle/full/${cle[1]}.${cle[2].replace(/_/g, '.')}.jpg`;
  return null;
}

// Точность и полнота по двум спискам меток — печатаются обе, и обе кучи
// ошибок показываются целиком: одно число без второго всегда льстит.
export function score(pairs) {
  let tp = 0, fp = 0, fn = 0, tn = 0;
  const missed = [], extra = [];
  for (const p of pairs) {
    if (p.said && p.truth) tp++;
    else if (p.said && !p.truth) (fp++, extra.push(p));
    else if (!p.said && p.truth) (fn++, missed.push(p));
    else tn++;
  }
  return {
    n: pairs.length,
    precision: tp + fp ? tp / (tp + fp) : 1,
    recall: tp + fn ? tp / (tp + fn) : 1,
    tp, fp, fn, tn, missed, extra
  };
}
