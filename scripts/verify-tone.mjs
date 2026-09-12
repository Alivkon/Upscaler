// Проверка пересадки тона. Ставится рядом с `node --check upscaler.js` по той
// же причине, по какой рядом с `limits.js` стоит проверка счётчика: синтаксис
// здесь ни о чём не говорит, а ломается всё молча и незаметно — картинка
// выходит целой, просто не того цвета, и увидеть это можно только сравнив
// её с оригиналом.
//
// Настоящих вызовов здесь нет: видеокарта подменяется, и подменяется нарочно
// испорченной — она сдвигает тон ровно так, как его сдвигает настоящая модель
// (research/2026-09-12-round22-against-original.md). Пересадка обязана этот
// сдвиг снять; контрольная строка проверяет, что сдвиг вообще был, иначе
// проверка молчала бы и на выключенной пересадке.
import sharp from 'sharp';
import { enlarge } from '../upscaler.js';

const WIDTH = 160;
const HEIGHT = 120;
const SIDE = WIDTH * 4;
// Тот же сдвиг по каналам, что померен у нынешней модели.
const DRIFT = [-5.3, -2.5, -3.3];
// Мера «не похоже на оригинал» из `.fidelity.mjs`: низкие частоты, σ = 6.
const SIGMA = 6;

const problems = [];
const complain = what => problems.push(what);

// Картинка считается, а не берётся из `images/`: проверке нужны и крупная
// форма (её пересадка обязана вернуть), и мелочь (её обязана сохранить),
// а ещё повторяемость — на случайном шуме числа плясали бы от запуска
// к запуску. Профиль настоящий, не sRGB: ради него всё и затевалось.
const pixels = Buffer.alloc(WIDTH * HEIGHT * 3);
for (let y = 0; y < HEIGHT; y++) {
  for (let x = 0; x < WIDTH; x++) {
    const at = (y * WIDTH + x) * 3;
    const fine = (x + y) % 2 ? 26 : 0;
    pixels[at] = Math.min(255, 40 + x + fine);
    pixels[at + 1] = Math.min(255, 200 - y + fine);
    pixels[at + 2] = Math.min(255, 90 + ((x * y) % 97) + fine);
  }
}
const original = await sharp(pixels, { raw: { width: WIDTH, height: HEIGHT, channels: 3 } })
  .withIccProfile('p3')
  .jpeg({ quality: 95, chromaSubsampling: '4:4:4' })
  .toBuffer();
const profile = (await sharp(original).metadata()).icc;

// Подставная видеокарта: договор `service/upscale_modal.py` — тело запроса
// картинкой, ×4 в ответе, профиль переносится, — плюс сдвиг тона.
let raw;
process.env.UPSCALE_URL = 'http://127.0.0.1:0/tone';
process.env.UPSCALE_KEY = 'ключ';
process.env.UPSCALE_SECRET = 'секрет';
globalThis.fetch = async (_url, init) => {
  const sent = Buffer.from(init.body);
  const { width, height } = await sharp(sent).metadata();
  raw = await sharp(sent)
    .keepIccProfile()
    .resize(width * 4, height * 4, { kernel: 'lanczos3' })
    .linear([1, 1, 1], DRIFT)
    .jpeg({ quality: 95, chromaSubsampling: '4:4:4' })
    .toBuffer();
  return new Response(raw, {
    headers: { 'Content-Type': 'image/jpeg', 'X-Cold': '0', 'X-Infer-Secs': '0.1', 'X-Tiles': '4' }
  });
};

const result = await enlarge(original, { width: WIDTH, height: HEIGHT, targetLongestSide: SIDE });

// Низкие частоты — в системе координат профиля, поэтому `keepIccProfile`:
// без него sharp перевёл бы пиксели в sRGB, и сравнивались бы разные числа.
const low = async (image, width, height) => {
  const { data } = await sharp(image)
    .removeAlpha()
    .keepIccProfile()
    .resize(width, height, { fit: 'fill', kernel: 'lanczos3' })
    .blur(SIGMA)
    .raw()
    .toBuffer({ resolveWithObject: true });
  return data;
};
// Уход от оригинала: средний по каналам, в уровнях.
const drift = (got, want) => {
  const sum = [0, 0, 0];
  for (let i = 0; i < got.length; i++) sum[i % 3] += got[i] - want[i];
  return sum.map(value => (value * 3) / got.length);
};
const said = numbers => numbers.map(value => value.toFixed(2).padStart(6)).join(' ');

const got = await sharp(result.buffer).metadata();
if (got.width !== SIDE || got.height !== HEIGHT * 4)
  complain(`размер ${got.width}×${got.height}, ждали ${SIDE}×${HEIGHT * 4}`);

const want = await low(original, got.width, got.height);
const before = drift(await low(raw, got.width, got.height), want);
const after = drift(await low(result.buffer, got.width, got.height), want);
console.log(`уход тона по каналам, уровней: у модели ${said(before)} | после пересадки ${said(after)}`);
if (before.every(value => Math.abs(value) < 1)) complain('подставная модель тон не сдвинула — проверять нечего');
if (after.some(value => Math.abs(value) > 1)) complain(`после пересадки уход ${said(after)}, ждали меньше уровня`);

// Профиль: сырые буферы его не несут, и вернуть его должен `withProfile`.
if (!got.icc) complain('профиля на готовом файле нет');
else if (Buffer.compare(got.icc, profile) !== 0) complain('профиль на готовом файле не тот, что был на входе');

if (problems.length) {
  console.error(`\nпересадка тона: ${problems.length} расхождений`);
  for (const problem of problems) console.error(`  ✗ ${problem}`);
  process.exit(1);
}
console.log('пересадка тона: тон вернулся, профиль на месте');
