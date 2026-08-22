// Мелкость фактуры: какую картинку пользователя вообще можно увеличивать.
//
// Не путать с [busyness.mjs] рядом: та меряет размах яркости в клетке размером
// с иконку и отвечает на вопрос «потеряется ли иконка на обложке». Здесь вопрос
// другой — «вернёт ли увеличитель эту фактуру или размажет её», и меряется
// поэтому не размах в окне, а доля пикселей с заметным переходом к соседу.
//
// Что на самом деле предсказывает провал — не пропорция и не кратность.
//
// Голоса Чарли по пятнадцати картинкам: прошли ботинки, арка, лицо, платье,
// пальто, рисунок, ночная платформа; провалились долина, мох у реки, водопад,
// цветущий склон в тумане и кожаная куртка с золотыми подвесками. Куртку тянуть
// надо было МЕНЬШЕ всех (×3.47), и она всё равно провалилась, а ботинки при
// ×4.22 прошли. Значит дело в мелкости фактуры: листву и гравировку увеличитель
// вернуть не может, он их размазывает, а гладкую кожу и градиент — может.
//
// Здесь это измеряется, а не утверждается: считаем «занятость» той полосы,
// что попадёт на экран, и смотрим, разделяет ли число две кучи.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const sharp = createRequire('/home/charlie/repos/Upscaler/')('sharp');

const PIX = '/home/charlie/Pictures';
const [W, H] = [1440, 3120];

// picture → (файл, вердикт Чарли). yes = хоть один вариант отмечен.
const SET = [
  ['b1 pagoda, drawn',      '48c94fae21696452acd469d6fd655d12.jpg', 'yes'],
  ['b2 grey coat',          '994f60e94df91b9cd9180a7af98055a5.jpg', 'yes'],
  ['b4 moodboard + text',   'download.png', 'yes'],
  ['b5 subway at night',    'tumblr_4d4ea5f2f1138fc56b801b3c6b803433_c065152f_540.jpg', 'yes'],
  ['b6 pink slip dress',    'tumblr_d63549dc055dbf77c6f0deeea6daab94_1dbd8416_1280.jpg', 'yes'],
  ['b8 face',               'bfc8913b-2ae7-4f1d-a633-20be3376c8a9.jpeg', 'yes'],
  ['w5 dark arch',          'horizontal.jpg', 'yes'],
  ['w6 boots (=b3)',        'bb498ccf97421e44dee843cbe6c3a5bc.jpg', 'yes'],
  ['b7 green valley',       'tumblr_02ca27a3ea8b435a9b9435a25907a1f5_06ecfcee_640.png', 'no'],
  ['w1 blossom in mist',    '44d2d000b13edb8acbd7fde2cfe76889.jpg', 'no'],
  ['w2 mossy river',        'd8b8cad42df21c39a72aeb68d7646050.jpg', 'no'],
  ['w3 waterfall in pines', 'daf1c4d1775c6670a55c434bbadd8442.jpg', 'no'],
  ['w4 leather + charms',   'tumblr_5e0502fbcce4e846adceffd5cf1d1643_136afd36_1280.jpg', 'no']
];

// Полоса 9:19.5 из середины — только она и попадёт на экран.
async function slice(file) {
  const m = await sharp(file).metadata();
  const w = Math.min(m.width, Math.round(m.height * W / H));
  const h = Math.min(m.height, Math.round(w * H / W));
  const buf = await sharp(file).extract({ left: Math.round((m.width - w) / 2), top: Math.round((m.height - h) / 2), width: w, height: h })
    .greyscale().raw().toBuffer();
  return { buf, w, h, src: `${m.width}×${m.height}`, ar: m.width / m.height, need: W / w };
}

// «Занятость»: доля пикселей, где сосед отличается заметно. Мелкая листва даёт
// такие переходы на КАЖДОМ пикселе, гладкая кожа — только по краям предметов.
function busy(buf, w, h, thr = 12) {
  let n = 0, tot = 0, sum = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const g = Math.abs(buf[i] - buf[i + 1]) + Math.abs(buf[i] - buf[i + w]);
      sum += g; tot++;
      if (g > thr) n++;
    }
  }
  return { frac: n / tot, mean: sum / tot };
}

const rows = [];
for (const [name, file, label] of SET) {
  const s = await slice(path.join(PIX, file));
  const b = busy(s.buf, s.w, s.h);
  rows.push({ name, label, src: s.src, ar: +s.ar.toFixed(2), need: +s.need.toFixed(2), busy: +(b.frac * 100).toFixed(1), grad: +b.mean.toFixed(1) });
}
rows.sort((a, b) => a.busy - b.busy);

console.log('picture                  verdict  source      wide  stretch  busy%  grad');
for (const r of rows)
  console.log(`${r.name.padEnd(24)} ${r.label.padEnd(7)} ${r.src.padEnd(11)} ${String(r.ar).padEnd(5)} ×${String(r.need).padEnd(6)} ${String(r.busy).padStart(5)} ${String(r.grad).padStart(5)}`);

// Порог ищем сами и честно печатаем обе кучи ошибок.
let best = null;
for (const t of rows.map((r) => r.busy)) {
  const tp = rows.filter((r) => r.busy <= t && r.label === 'yes').length;
  const fp = rows.filter((r) => r.busy <= t && r.label === 'no').length;
  const fn = rows.filter((r) => r.busy > t && r.label === 'yes').length;
  const prec = tp / (tp + fp || 1), rec = tp / (tp + fn || 1), f1 = 2 * prec * rec / (prec + rec || 1);
  if (!best || f1 > best.f1) best = { t, tp, fp, fn, prec, rec, f1 };
}
console.log(`\nrule: accept when busy% <= ${best.t}`);
console.log(`  precision ${(best.prec * 100).toFixed(0)}%  recall ${(best.rec * 100).toFixed(0)}%  (${rows.filter(r=>r.label==='yes').length} yes / ${rows.filter(r=>r.label==='no').length} no)`);
console.log('  wrongly accepted:', rows.filter((r) => r.busy <= best.t && r.label === 'no').map((r) => r.name).join(', ') || 'none');
console.log('  wrongly rejected:', rows.filter((r) => r.busy > best.t && r.label === 'yes').map((r) => r.name).join(', ') || 'none');

// Для сравнения: то, что предлагалось вместо этого.
for (const [what, get] of [['aspect (portrait only)', (r) => r.ar], ['stretch needed', (r) => r.need]]) {
  let b2 = null;
  for (const t of rows.map(get)) {
    const tp = rows.filter((r) => get(r) <= t && r.label === 'yes').length;
    const fp = rows.filter((r) => get(r) <= t && r.label === 'no').length;
    const fn = rows.filter((r) => get(r) > t && r.label === 'yes').length;
    const prec = tp / (tp + fp || 1), rec = tp / (tp + fn || 1), f1 = 2 * prec * rec / (prec + rec || 1);
    if (!b2 || f1 > b2.f1) b2 = { t, prec, rec, f1 };
  }
  console.log(`\nbest possible by ${what}: <= ${b2.t} → precision ${(b2.prec * 100).toFixed(0)}% recall ${(b2.rec * 100).toFixed(0)}%`);
}
