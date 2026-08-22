// Можно ли назвать работу тёмной. Правило числовое, потому что глаз на
// подсвеченном экране ошибается в одну сторону: почти всё кажется темнее,
// чем выйдет в выдаче миниатюрой рядом с чужими.
//
//     node scripts/mood.mjs vl-0251
//     node scripts/mood.mjs images/plates/что-нибудь.jpg
//
// Порог — 78, потолок восьми опорных работ Чарли (research/references.json,
// `luma [43,78]`). Меряется по тому файлу, который страница и отдаёт, — по
// телефонному кадру с уже наложенной обработкой, а не по плите из музея:
// обработка снимает свет, и работа, не прошедшая порог на исходнике, может
// пройти его после.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DARK = 78;
const MANIFESTS = ['museum', 'photos', 'scenes', 'tessarum'];

const median = values => values.sort((a, b) => a - b)[values.length >> 1];

// Меряется на 200 px — тот же размер, на котором снят опорный набор. Больше
// не даёт точности: медиана по кадру устойчива, а лишние пиксели только
// замедляют.
const measure = async file => {
  const { data, info } = await sharp(file)
    .resize(200, null, { fit: 'inside' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const luma = [];
  const warm = [];
  for (let i = 0; i < data.length; i += info.channels) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    luma.push(l);
    warm.push((r - b) / Math.max(l, 1));
  }
  return { luma: median(luma), warm: median(warm) };
};

// Ref — не файл: у работы четыре кадра и несколько копий каждого, и
// осмысленный из них ровно один. Путь принимается тоже, чтобы работу можно
// было померить до того, как она попала в каталог.
const resolve = arg => {
  if (!/^vl-\d{4}$/.test(arg)) return arg;
  const entry = MANIFESTS.flatMap(name => {
    const file = path.join(ROOT, 'images/manifest', `${name}.json`);
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
  }).find(work => work.ref === arg);
  if (!entry) throw new Error(`${arg} — нет в манифесте`);
  const shown = entry.crops?.phone || entry;
  const copy = (shown.copies || []).find(c => c.width >= 240 && c.width <= 480) || shown;
  return path.join(ROOT, 'images', copy.file);
};

const arg = process.argv[2];
if (!arg) {
  console.error('node scripts/mood.mjs <ref|файл>');
  process.exit(1);
}

const { luma, warm } = await measure(resolve(arg));
const dark = luma <= DARK;
console.log(`luma ${luma.toFixed(1)}   warm ${warm.toFixed(3)}   порог ${DARK}`);
console.log(
  dark
    ? 'тёмная. `dark academia`, если палитра тёплая и сюжет классический, интерьер\n' +
        'или учёный; иначе `dark moody`. Слово ставится в хвост заголовка и в начало alt.'
    : 'светлая. Ни `dark academia`, ни `dark moody` — обещание не сойдётся\n' + 'с миниатюрой в выдаче.'
);
