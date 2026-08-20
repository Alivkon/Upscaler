// Приглушение работы до тех пор, пока подписи под иконками не станут читаться.
//
// Задача не художественная, а измеримая: белая подпись на домашнем экране
// читается, пока фон под ней достаточно тёмный. Всё остальное в этом файле —
// следствие попыток приглушить фон так, чтобы работа при этом осталась собой.
//
// Запуск (картинки и манифест в репозитории не лежат, см. AGENTS.md):
//   node scripts/research/dim-for-icons.mjs отчёт.html [план.json]
//   node scripts/research/dim-for-icons.mjs свод.html --gains 1,1.6,2.5 --refs vl-0025,vl-0203
//
// `--gains` даёт по колонке на усиление наклона и нужен для подбора; без него
// считается один вариант — тот, что стоит в TILT_PER_STOP.
import fs from 'node:fs/promises';
import sharp from 'sharp';
import { THRESHOLD, TILT_PER_STOP, TILT_LIMIT, contrastWithWhite, tiltFor, cells, applied, strengthFor } from './dimming.mjs';

const THUMB = 200;

const flags = {};
const positional = [];
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) flags[argv[i].slice(2)] = argv[++i];
  else positional.push(argv[i]);
}
const [OUT, PLAN = null] = positional;
// Колонки отчёта. `auto` — правило, привязанное к глубине приглушения; число —
// усиление, заданное прямо и одинаковое для всех работ. Второе нужно потому,
// что правило `1 + k·глубина` ниже единицы не опускается ни при каком k,
// а единица — это уже полный наклон к цвету бумаги. Ось от серого к охре
// начинается в нуле, и обойти её правилом нельзя.
const GAINS = (flags.gains ?? 'auto').split(',').map(v => (v === 'auto' ? 'auto' : Number(v)));
const ONLY = flags.refs?.split(',') ?? null;
if (!OUT) {
  console.error('нужен путь для отчёта: node scripts/research/dim-for-icons.mjs отчёт.html');
  process.exit(1);
}

const catalogue = new Map();
for (const file of await fs.readdir('catalogue')) {
  if (!/^vl-\d{4}\.json$/.test(file)) continue;
  const w = JSON.parse(await fs.readFile(`catalogue/${file}`, 'utf8'));
  catalogue.set(w.ref, w);
}
// Только портретные файлы: подписи под иконками — вопрос домашнего экрана
// телефона, на рабочем столе иконок несколько штук и стоят они в углу.
const entries = [];
for (const name of await fs.readdir('images/manifest'))
  for (const e of JSON.parse(await fs.readFile(`images/manifest/${name}`, 'utf8')))
    if (e.width < e.height && (!ONLY || ONLY.includes(e.ref))) entries.push(e);
entries.sort((a, b) => a.ref.localeCompare(b.ref));

const rows = [];
for (const [index, entry] of entries.entries()) {
  const file = `images/${entry.file}`;
  try {
    await fs.access(file);
  } catch {
    continue;
  }
  const { data, info } = await sharp(file)
    .resize(THUMB, null, { fit: 'inside' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Сила решается сначала и без наклона — наклон нормирован по яркости и её
  // не двигает, так что порядок честный, — а уже по ней считается, насколько
  // наклонять.
  const { worst, strength } = strengthFor(data, info.width, info.height);

  const jpeg = async pixels =>
    (
      await sharp(pixels, { raw: { width: info.width, height: info.height, channels: 3 } })
        .jpeg({ quality: 68 })
        .toBuffer()
    ).toString('base64');

  const variants = [];
  if (strength !== null)
    for (const gain of GAINS) {
      const effective = gain === 'auto' ? 1 + TILT_PER_STOP * (1 - strength) : gain;
      const { tilt, mean, raw, clamped } = tiltFor(data, effective);
      const factors = tilt.map(v => v * strength);
      const pixels = applied(data, factors);
      const got = cells(pixels, info.width, info.height);
      variants.push({
        gain,
        effective,
        tilt,
        factors,
        mean,
        raw,
        clamped,
        worst: contrastWithWhite(Math.max(...got)),
        failing: got.filter(v => contrastWithWhite(v) < 3).length,
        uri: await jpeg(pixels)
      });
    }

  const work = catalogue.get(entry.ref);
  rows.push({
    ref: entry.ref,
    title: work?.title ?? entry.ref,
    origin: work?.origin ?? '',
    strength,
    before: contrastWithWhite(worst),
    beforeUri: await jpeg(data),
    variants
  });
  if ((index + 1) % 25 === 0) console.log(`  ${index + 1}/${entries.length}`);
}

const treated = rows.filter(r => r.strength !== null);
console.log(`\nработ ${rows.length} | приглушено ${treated.length} | без изменений ${rows.length - treated.length}`);
for (const gain of GAINS) {
  const v = treated.map(r => r.variants.find(x => x.gain === gain));
  console.log(
    `  усиление ${gain}: ниже 3:1 осталось ${v.filter(x => x.failing > 0).length}, ` +
      `наклон упёрся в предел у ${v.filter(x => x.clamped).length}, ` +
      `в тёплое ${v.filter(x => x.tilt[0] > x.tilt[2]).length}`
  );
}

// Разметка нарочно голая: смотреть надо на картинки, а не на страницу.
const num = v => v.toFixed(2);
const html = `<meta charset="utf-8">
<title>Dimming for icon legibility</title>
<h1>Dimming for icon legibility</h1>
<p>Each row: the work as published, then one column per tilt gain. Strength is
solved from the brightest of 24 caption-sized patches; the tilt direction comes
from the colour of the work's own lighter half. Works already legible show no
treated column.</p>
<p>${rows.length} works &middot; ${treated.length} treated &middot; gains ${GAINS.join(', ')}</p>
<hr>
${rows
  .map(
    r => `<h3>${r.ref} &mdash; ${r.title} ${r.origin ? `(${r.origin})` : ''}</h3>
<p>${
      r.strength === null
        ? `left alone &mdash; worst caption ${r.before.toFixed(1)}:1`
        : `&times;${r.strength} &middot; ${r.before.toFixed(1)}:1 before`
    }</p>
<table cellpadding="4"><tr>
<td valign="top">as published<br><img src="data:image/jpeg;base64,${r.beforeUri}" width="${THUMB}"></td>
${r.variants
  .map(
    v => `<td valign="top">tilt ${v.gain === 'auto' ? `auto (${v.effective.toFixed(2)})` : v.gain}${v.clamped ? ' clamped' : ''}<br>
filter ${v.factors.map(num).join(' ')}<br>
&rarr; ${v.worst.toFixed(1)}:1, ${v.failing}/24 failing<br>
<img src="data:image/jpeg;base64,${v.uri}" width="${THUMB}"></td>`
  )
  .join('\n')}
</tr></table>
<hr>`
  )
  .join('\n')}
`;
await fs.writeFile(OUT, html);

if (PLAN)
  await fs.writeFile(
    PLAN,
    `${JSON.stringify(
      {
        threshold: THRESHOLD,
        limit: TILT_LIMIT,
        gains: GAINS,
        works: rows.map(r => ({
          ref: r.ref,
          strength: r.strength,
          variants: r.variants.map(v => ({ gain: v.gain, tilt: v.tilt.map(x => Number(x.toFixed(3))), clamped: v.clamped }))
        }))
      },
      null,
      2
    )}\n`
  );
console.log(OUT);
