import sharp from 'sharp';
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const OUT = process.argv[2];
mkdirSync(OUT, { recursive: true });

const BAR_W = 1440, BAR_H = 3120;              // телефонная плита витрины
// 3120 — контроль без потери разрешения: то же сжатие, тот же путь, но кадр
// уже в размер плиты. Разница между 3120 и 3000 — это и есть спорные 120 px.
// 900 — контроль с другой стороны: потеря, которую видно наверняка.
const LADDER = [3120, 3000, 2600, 2200, 1800, 900];
const SIDE = 520;

const WORKS = [
  ['nakakuni', 'images/crops/minamoto-no-nakakuni-visits-lady-kogo-japanese-painting-iphone-wallpaper-phone-3535x7659.jpg'],
  ['puppies', 'images/crops/puppies-sparrows-and-chrysanthemums-bright-floral-iphone-wallpaper-phone-3237x7013.jpg'],
  ['pavilion', 'images/crops/landscape-with-a-pavilion-landscape-iphone-wallpaper-phone-3589x7776.jpg']
];

// `stats()` считает по входному файлу и не видит `extract()` в конвейере,
// поэтому квадрат сперва вырезается в буфер, и только он идёт в замер.
async function busiest(file, side) {
  const { width, height } = await sharp(file).metadata();
  const step = Math.floor(side / 2);
  let best = { sd: -1, left: 0, top: 0 };
  for (let top = 0; top + side <= height; top += step) {
    for (let left = 0; left + side <= width; left += step) {
      const buf = await sharp(file).extract({ left, top, width: side, height: side }).greyscale().raw().toBuffer();
      let s = 0, ss = 0;
      for (const v of buf) { s += v; ss += v * v; }
      const n = buf.length, sd = Math.sqrt(ss / n - (s / n) ** 2);
      if (sd > best.sd) best = { sd, left, top };
    }
  }
  return best;
}

const metric = (a, b) => {
  const grab = (f, re) => {
    const r = execFileSync('sh', ['-c',
      `ffmpeg -v info -i '${a}' -i '${b}' -lavfi ${f} -f null - 2>&1 | tail -3`], { encoding: 'utf8' });
    const m = r.match(re);
    return m ? Number(m[1]) : NaN;
  };
  return { ssim: grab('ssim', /All:([0-9.]+)/), psnr: grab('psnr', /average:([0-9.]+)/) };
};

for (const [name, src] of WORKS) {
  const ref = await sharp(src).resize(BAR_W, BAR_H, { kernel: 'lanczos3' }).jpeg({ quality: 92 }).toBuffer();
  await sharp(ref).png().toFile(`${OUT}/${name}-ref.png`);
  const b = await busiest(`${OUT}/${name}-ref.png`, SIDE);
  const cut = (file, tag) => sharp(file).extract({ left: b.left, top: b.top, width: SIDE, height: SIDE })
    .png().toFile(`${OUT}/${name}-detail-${tag}.png`);
  await cut(`${OUT}/${name}-ref.png`, 'ref');

  const rows = [];
  for (const H of LADDER) {
    const W = Math.round(H * BAR_W / BAR_H);
    const museum = await sharp(src).resize(W, H, { kernel: 'lanczos3' }).jpeg({ quality: 90 }).toBuffer();
    const up = await sharp(museum).resize(BAR_W, BAR_H, { kernel: 'lanczos3' }).jpeg({ quality: 92 }).toBuffer();
    await sharp(up).png().toFile(`${OUT}/${name}-${H}.png`);
    await cut(`${OUT}/${name}-${H}.png`, H);
    const whole = metric(`${OUT}/${name}-ref.png`, `${OUT}/${name}-${H}.png`);
    const detail = metric(`${OUT}/${name}-detail-ref.png`, `${OUT}/${name}-detail-${H}.png`);
    rows.push({ H, W, '×': (BAR_H / H).toFixed(2), ssim: whole.ssim.toFixed(4), psnr: whole.psnr.toFixed(1),
      'ssim куска': detail.ssim.toFixed(4), 'psnr куска': detail.psnr.toFixed(1) });
  }
  console.log(`\n${name}  кусок ${b.left},${b.top} sd=${b.sd.toFixed(1)}`);
  console.table(rows);
}
