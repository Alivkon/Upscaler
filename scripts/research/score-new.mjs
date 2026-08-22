// Счёт проверочного круга и, главное, проверка правила «занятость выше 30% —
// платить». Предсказание лежит в router-prediction.json и записано ДО показа.
//
// Правило считается по тем картинкам, где выбор вообще имел значение: где хотя
// бы один способ прошёл. Там, где не прошёл никто, платить или не платить —
// не вопрос правила.
import fs from 'node:fs/promises';

const SP = '/tmp/claude-1000/-home-charlie-repos-Upscaler/904c8c30-e059-4ad3-9f52-dd9dbb5f67e7/scratchpad';
const TICKS = `m03#PP m03#QQ m04#QQ m04#PP m05#PP m05#QQ m06#QQ m09#QQ m10#PP m10#QQ m11#QQ m16#QQ m16#PP m17#QQ`.split(/\s+/);

const man = JSON.parse(await fs.readFile(`${SP}/local/manifest-new.json`, 'utf8'));
const pred = JSON.parse(await fs.readFile(`${SP}/local/router-prediction.json`, 'utf8'));
const set = new Set(TICKS);
const rows = JSON.parse(JSON.stringify(man)).filter((p) => p.need > 1.02).map((p) => {
  const free = set.has(`${p.id}#PP`);      // ClearRealityV1 в браузере, $0
  const paid = set.has(`${p.id}#QQ`);      // Topaz Standard V2, $0.05
  const route = pred.predict.find((r) => r.id === p.id).route;
  const kind = !free && !paid ? 'никто'
    : free && route === 'free' ? 'верно: бесплатно и хватило'
    : free && route === 'paid' ? 'лишний пятак: бесплатно бы хватило'
    : !free && paid && route === 'paid' ? 'верно: заплатили и помогло'
    : !free && paid && route === 'free' ? 'ПРОМАХ: отдали бесплатное, а оно мягкое'
    : 'прочее';
  return { ...p, free, paid, route, kind };
});

console.log('id   занятость  правило   бесплатно  платно   итог');
for (const r of rows)
  console.log(`${r.id}  ${String(r.busy).padStart(5)}%    ${r.route.padEnd(6)}  ${(r.free ? '✓' : '·').padStart(6)}     ${(r.paid ? '✓' : '·').padStart(4)}    ${r.kind}`);

const n = rows.length;
console.log(`\nвсего под модель: ${n}`);
console.log(`  Topaz $0.05      ${rows.filter((r) => r.paid).length} / ${n}`);
console.log(`  бесплатно в браузере ${rows.filter((r) => r.free).length} / ${n}`);
console.log(`  не взял никто    ${rows.filter((r) => r.kind === 'никто').length}`);

const dec = rows.filter((r) => r.kind !== 'никто');
const tally = {};
for (const r of dec) tally[r.kind] = (tally[r.kind] || 0) + 1;
console.log(`\nправило на ${dec.length} картинках, где выбор имел значение:`);
for (const [k, v] of Object.entries(tally)) console.log(`  ${v}  ${k}`);

const good = dec.filter((r) => r.kind.startsWith('верно')).length;
console.log(`  ⇒ ${good} из ${dec.length} = ${Math.round(good / dec.length * 100)}%`);

// С чем сравнивать: всегда платить и никогда не платить, на тех же картинках.
const cost = (r) => (r.route === 'paid' ? 0.05 : 0);
const shipsBad = (r) => (r.route === 'free' ? !r.free : !r.paid);
console.log(`\n                       хороших обоев   потрачено`);
console.log(`  всегда платить       ${dec.filter((r) => r.paid).length} из ${dec.length}          $${(dec.length * 0.05).toFixed(2)}`);
console.log(`  никогда не платить   ${dec.filter((r) => r.free).length} из ${dec.length}          $0.00`);
console.log(`  правило (30%)        ${dec.filter((r) => !shipsBad(r)).length} из ${dec.length}          $${dec.reduce((s, r) => s + cost(r), 0).toFixed(2)}`);

const passed = dec.filter((r) => r.free).map((r) => r.busy);
const failed = dec.filter((r) => !r.free).map((r) => r.busy);
const mean = (a) => (a.reduce((s, v) => s + v, 0) / a.length).toFixed(1);
console.log(`\nзанятость там, где бесплатной ХВАТИЛО:  ${mean(passed)}%  (${passed.join(', ')})`);
console.log(`занятость там, где НЕ хватило:          ${mean(failed)}%  (${failed.join(', ')})`);
