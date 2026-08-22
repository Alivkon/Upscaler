// Увеличение у посетителя, а не у нас: та же работа, которую делал Replicate за
// пять центов, считается видеокартой того, кто принёс картинку. Нам она не
// стоит ничего, ждать очереди не надо, и файл никуда не уезжает.
//
// Что показал опыт 22.08 (research/2026-08-22-the-upscaler-bakeoff.md):
// модель на 1.9 МБ берёт от трети до двух третей картинок против платного
// Topaz, а модели в 15 и 35 раз тяжелее берут меньше. Вес модели — не про
// качество, поэтому здесь стоит самая лёгкая.
//
// Ставится всё это лениво: галерее рантайм не нужен, а он весит 6 МБ в
// сжатом виде. Первый запуск качает его и модель, дальше — из кэша браузера.
//
// Адрес рантайма собирается с версией (`/vendor/ort/1.27.0/…`), потому что
// кэшируется он на год как неизменяемый: без версии в адресе это обещание
// неверно (server.js). Саму версию ставит сервер в `<meta>` — читать её здесь
// из копии значило бы завести вторую запись рядом с package.json.
const VENDOR = '/vendor/ort';
const RUNTIME = 'ort.webgpu.min.mjs';
const MODEL = '/models/4x-ClearRealityV1.onnx';

// Плитка и поля. 192 — не удобство, а память: картинка целиком в модель не
// лезет, а поля в 16 пикселей закрывают шов между плитками. Модель умеет
// только ×4, поэтому крупнее просят через уменьшение готового.
const TILE = 192;
const OV = 16;
const SCALE = 4;
// Дальше этого холст не растёт: у Canvas есть предел стороны, а память
// кончается раньше предела. Просьба «×4» от большого исходника упирается
// сюда, и это честнее, чем упасть на середине.
const MAX_SIDE = 8192;
// Второй потолок — на площадь, и опаснее он. У Safari холст ограничен
// 16 777 216 пикселями (у Chrome и Firefox — в разы больше), а сторона в 8192
// разрешает вчетверо больше этого. Беда не в самом пределе, а в том, как
// Safari его держит: превышение не бросает исключения, рисование просто
// становится пустой операцией. `convertToBlob` отдаёт пустую картинку, ловить
// нечего, и посетитель скачивает белый лист, ничего об этом не узнав.
//
// Число одно на все браузеры, а не по самому щедрому: строка на странице
// обязана назвать размер до того, как холст создан, то есть до того, как
// предел вообще можно проверить.
const MAX_AREA = 16_777_216;

// Стороны холста округляются, и обе — вверх; из-за этого площадь перескакивает
// потолок на сотые доли процента там, где корень давал ровно по нему. Предел
// у Safari точный, лишний пиксель уже означает пустой холст, поэтому проверка
// идёт по тем самым числам, которыми холст потом и создаётся.
const fits = (width, height, ratio) => Math.round(width * ratio) * Math.round(height * ratio) <= MAX_AREA;

// Во что упирается длинная сторона результата: просьба, потолок стороны,
// потолок площади и предел самой модели. Считает это отсюда и кнопка на
// странице — раньше у неё был свой расчёт, и он отставал от здешнего.
export function resultLongestSide(outputSize, width, height) {
  const longest = Math.max(width, height);
  const byArea = Math.floor(longest * Math.sqrt(MAX_AREA / (width * height)));
  let target = Math.min(targetLongestSideFor(outputSize, longest), MAX_SIDE, longest * SCALE, byArea);
  while (target > 1 && !fits(width, height, target / longest)) target--;
  return target;
}

// Проверка вместо веры в число: у какого-нибудь браузера предел окажется ниже
// нашего, и молчаливый отказ рисовать выглядит как удавшаяся работа. Ставим
// точку в дальнем углу и читаем её обратно — если холст велик, точки там нет.
export const TOO_BIG = 'This picture is too large for your browser to enlarge.';

function usable(ctx, w, h) {
  ctx.fillStyle = '#fff';
  ctx.fillRect(w - 1, h - 1, 1, 1);
  const drawn = ctx.getImageData(w - 1, h - 1, 1, 1).data[3] === 255;
  ctx.clearRect(w - 1, h - 1, 1, 1);
  return drawn;
}

let sessionPromise = null;

// Рантайм грузится один раз на страницу и остаётся в памяти вместе с моделью:
// второй файл в той же вкладке считается уже без задержки на загрузку.
async function session() {
  if (sessionPromise) return sessionPromise;
  sessionPromise = (async () => {
    const version = document.querySelector('meta[name="ort-version"]')?.content;
    if (!version) throw new Error('The page did not say which runtime to load.');
    const base = `${VENDOR}/${version}/`;
    const ort = await import(base + RUNTIME);
    // Путь абсолютный: относительный считался бы от самого модуля, который
    // лежит там же, и получилось бы /vendor/ort/1.27.0/vendor/ort/1.27.0/…
    ort.env.wasm.wasmPaths = base;
    // Многопоточный WASM требует SharedArrayBuffer, а он живёт только на
    // странице с заголовками COOP/COEP. Их здесь нет, поэтому запасной путь
    // считает в один поток — медленно, но считает.
    ort.env.wasm.numThreads = globalThis.crossOriginIsolated ? navigator.hardwareConcurrency || 4 : 1;
    // Списком, а не одним: выданный адаптер ещё не значит, что сессия на нём
    // соберётся — на Mesa и в Firefox шейдер компилируется не всегда. С одним
    // элементом такая осечка отменяла бы счёт в браузере целиком там, где
    // wasm посчитал бы медленно, но посчитал.
    const providers = (await gpu()) ? ['webgpu', 'wasm'] : ['wasm'];
    // enableMemPattern выключен намеренно: с ним WebGPU пытается
    // переиспользовать буфер входа под выход и падает «Shape mismatch
    // attempting to re-use buffer» — это одна и та же плитка до и после ×4.
    const sess = await ort.InferenceSession.create(MODEL, {
      executionProviders: providers,
      enableMemPattern: false
    });
    return { ort, sess, provider: providers[0], in: sess.inputNames[0], out: sess.outputNames[0] };
  })();
  // Неудача не запоминается. Обещание присваивается до того, как оно
  // разрешится, и одна оборванная загрузка рантайма без этого отравляла бы
  // вкладку до перезагрузки: каждый следующий файл в ней отказывался бы
  // считаться мгновенно и молча.
  sessionPromise.catch(() => {
    sessionPromise = null;
  });
  return sessionPromise;
}

// `navigator.gpu` есть и там, где видеокарты не дают: Brave отвечает на вопрос
// о поддержке да, а адаптера не выдаёт. Спрашивать надо адаптер.
async function gpu() {
  try {
    return navigator.gpu ? Boolean(await navigator.gpu.requestAdapter()) : false;
  } catch {
    return false;
  }
}

export async function localUpscaleAvailable() {
  return (
    typeof OffscreenCanvas === 'function' && typeof createImageBitmap === 'function' && 'WebAssembly' in globalThis
  );
}

// Кадр добивается до целого числа плиток повтором крайнего пикселя, а не
// чёрным: чёрная кромка внутри плитки — это край, которого в картинке нет,
// и модель дорисовала бы по нему контур.
function padded(img) {
  const w = img.width;
  const h = img.height;
  const pw = Math.ceil(w / TILE) * TILE;
  const ph = Math.ceil(h / TILE) * TILE;
  const full = new OffscreenCanvas(pw + 2 * OV, ph + 2 * OV);
  const x = full.getContext('2d', { willReadFrequently: true });
  // Этот холст строится по исходнику, а не по результату, и потолок площади
  // его не касается: сжатый JPEG в 10 МБ разворачивается и в 48 мегапикселей.
  if (!usable(x, full.width, full.height)) throw new Error(TOO_BIG);
  x.drawImage(img, OV, OV);
  x.drawImage(full, OV + w - 1, OV, 1, h, OV + w, OV, full.width - (OV + w), h);
  x.drawImage(full, 0, OV + h - 1, full.width, 1, 0, OV + h, full.width, full.height - (OV + h));
  x.drawImage(full, 0, OV, full.width, 1, 0, 0, full.width, OV);
  x.drawImage(full, OV, 0, 1, full.height, 0, 0, OV, full.height);
  return { ctx: x, pw, ph };
}

const byte = v => (v <= 0 ? 0 : v >= 1 ? 255 : (v * 255 + 0.5) | 0);

async function runTile(rt, pixels) {
  const n = pixels.width * pixels.height;
  const f = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    f[i] = pixels.data[i * 4] / 255;
    f[n + i] = pixels.data[i * 4 + 1] / 255;
    f[2 * n + i] = pixels.data[i * 4 + 2] / 255;
  }
  const result = await rt.sess.run({
    [rt.in]: new rt.ort.Tensor('float32', f, [1, 3, pixels.height, pixels.width])
  });
  return result[rt.out];
}

// Сколько раз просят увеличить. Правила те же, что у сервера
// (`targetLongestSideFor`), чтобы «×2» означало одно и то же на обоих путях.
export function targetLongestSideFor(outputSize, sourceLongestSide) {
  if (outputSize === 'x2') return sourceLongestSide * 2;
  if (outputSize === 'x4') return sourceLongestSide * 4;
  return outputSize === '2k' ? 2048 : 4096;
}

/**
 * Считает картинку целиком и возвращает готовый холст.
 * Готовое пишется сразу в нужном размере, а не в ×4 с последующим уменьшением:
 * промежуточный холст на 64 мегапикселя — это четверть гигабайта памяти,
 * и телефон на нём кончается.
 */
export async function upscaleInBrowser(file, { outputSize = 'x2', onProgress } = {}) {
  const img = await createImageBitmap(file);
  const source = { width: img.width, height: img.height };
  const longest = Math.max(img.width, img.height);
  const factor = resultLongestSide(outputSize, img.width, img.height) / longest;

  // Холсты проверяются до рантайма: если браузер их не потянет, качать ради
  // этого шесть мегабайт незачем.
  const { ctx, pw, ph } = padded(img);
  const out = new OffscreenCanvas(Math.round(img.width * factor), Math.round(img.height * factor));
  const octx = out.getContext('2d');
  if (!usable(octx, out.width, out.height)) throw new Error(TOO_BIG);

  const rt = await session();
  const total = (pw / TILE) * (ph / TILE);
  let done = 0;
  const started = performance.now();

  for (let y = 0; y < ph; y += TILE) {
    for (let x = 0; x < pw; x += TILE) {
      const tile = await runTile(rt, ctx.getImageData(x, y, TILE + 2 * OV, TILE + 2 * OV));
      // В картинку идёт только то, что попало в настоящий кадр: добивка
      // справа и снизу служебная.
      const cw = Math.min(TILE, img.width - x);
      const ch = Math.min(TILE, img.height - y);
      done++;
      if (cw > 0 && ch > 0) {
        const [ow, oh] = [tile.dims[3], tile.dims[2]];
        const margin = OV * SCALE;
        const plane = ow * oh;
        const piece = new ImageData(cw * SCALE, ch * SCALE);
        for (let yy = 0; yy < ch * SCALE; yy++)
          for (let xx = 0; xx < cw * SCALE; xx++) {
            const si = (yy + margin) * ow + (xx + margin);
            const di = (yy * cw * SCALE + xx) * 4;
            piece.data[di] = byte(tile.data[si]);
            piece.data[di + 1] = byte(tile.data[plane + si]);
            piece.data[di + 2] = byte(tile.data[2 * plane + si]);
            piece.data[di + 3] = 255;
          }
        // Соседние плитки кладутся по округлённым краям, а не по округлённому
        // размеру: иначе между ними остаётся пустая полоска в пиксель.
        const left = Math.round(x * factor);
        const top = Math.round(y * factor);
        const right = Math.round((x + cw) * factor);
        const bottom = Math.round((y + ch) * factor);
        octx.drawImage(await createImageBitmap(piece), left, top, right - left, bottom - top);
      }
      if (onProgress) {
        const each = (performance.now() - started) / done;
        onProgress({ done, total, secondsLeft: Math.round((each * (total - done)) / 1000) });
      }
    }
  }
  img.close();
  return { canvas: out, source, provider: rt.provider, seconds: (performance.now() - started) / 1000 };
}
