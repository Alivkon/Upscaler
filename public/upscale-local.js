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
import { GATE_LONG, GATE_SHORT, phoneWindow } from './frame.js';
import { MODEL, RUNTIME, RUNTIME_WASM } from './model-files.js';

const VENDOR = '/vendor/ort';

// Плитка и поля. 192 — не удобство, а память: картинка целиком в модель не
// лезет, а поля в 16 пикселей закрывают шов между плитками. Модель умеет
// только ×4, поэтому крупнее просят через уменьшение готового.
const TILE = 192;
const OV = 16;
const SCALE = 4;
// Самая маленькая картинка, из которой ещё выходят обои: порог, делённый на
// множитель модели. Меньше — и до 2160 × 3840 не дотянуться ничем, сколько
// ни проси. Строка на странице печатает эти два числа (`pages.js`), поэтому
// они выводятся, а не вписываются: сменится модель — сменится и совет.
export const MIN_SOURCE = { width: GATE_SHORT / SCALE, height: GATE_LONG / SCALE };
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
export function resultLongestSide(width, height) {
  const longest = Math.max(width, height);
  const byArea = Math.floor(longest * Math.sqrt(MAX_AREA / (width * height)));
  let target = Math.min(targetLongestSideFor(width, height), MAX_SIDE, longest * SCALE, byArea);
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

// Вес каждого из файлов, которые качает первая картинка. Приходит из
// разметки, потому что взять его из ответа нельзя: файлы отдаются сжатыми
// на лету, `Content-Length` в ответе нет вовсе, и браузер, качая двадцать
// шесть мегабайт, не может сказать, сколько осталось. Отсюда и брались
// минуты молчания, которые читались как поломка.
function weights() {
  try {
    return JSON.parse(document.querySelector('meta[name="ort-bytes"]')?.content || '{}');
  } catch {
    return {};
  }
}

// Качает всё нужное разом и считает байты. Тела рантайма и wasm выбрасываются:
// нужен не их текст, а тёплый кэш — оба отдаются на год как неизменяемые, и
// `import` с `InferenceSession` возьмут их уже оттуда. Модель, наоборот,
// возвращается байтами: сессия принимает и адрес, и буфер, а второй раз
// ходить за тем, что уже в руках, незачем.
//
// Доля считается от суммы весов ровно тех файлов, за которыми идём: wasm-ов
// два, качается один, и сложить оба значило бы застрять на половине.
// Не назван хоть один — доли нет вовсе, и это честнее приблизительной.
//
// Осечка не ломает счёт: не вышло посчитать — считаем без счётчика.
// Ради полоски загрузки отказывать в работе было бы смешно.
async function loadWithProgress(urls, onProgress) {
  const sizes = weights();
  const known = urls.map(({ weigh }) => sizes[weigh] || 0);
  const total = known.every(Boolean) ? known.reduce((sum, size) => sum + size, 0) : 0;
  let received = 0;
  const bodies = await Promise.all(
    urls.map(async ({ url, keep }) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${url} — ${response.status}`);
      const reader = response.body.getReader();
      const chunks = [];
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.length;
        if (keep) chunks.push(value);
        // Доля срезается по единице: вес считан на диске сервера, а пришедшее
        // меряется здесь, и разойтись они могут на любой мелочи. «103 %»
        // подорвало бы доверие к счётчику вернее, чем его отсутствие.
        if (total) onProgress(Math.min(1, received / total));
      }
      if (!keep) return null;
      const bytes = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
      let at = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, at);
        at += chunk.length;
      }
      return bytes;
    })
  );
  return bodies.find(Boolean);
}

// Рантайм грузится один раз на страницу и остаётся в памяти вместе с моделью:
// второй файл в той же вкладке считается уже без задержки на загрузку.
//
// Отчитывается это двумя разными сообщениями, потому что и отрезка тут два.
// Первый — загрузка, у неё есть доля. Второй — всё остальное: разбор трёх
// мегабайт рантайма, сборка сессии, компиляция шейдеров под WebGPU. Доли
// у него нет и быть не может, зато есть длительность, и немалая; молчал он
// ровно тем же молчанием, из-за которого завели счётчик.
async function session(report = () => {}) {
  if (sessionPromise) return sessionPromise;
  sessionPromise = (async () => {
    const version = document.querySelector('meta[name="ort-version"]')?.content;
    if (!version) throw new Error('The page did not say which runtime to load.');
    const base = `${VENDOR}/${version}/`;
    // Об адаптере спрашиваем до загрузки, а не после: от ответа зависит и
    // исполнитель, и то, какой из двух wasm-файлов пойдёт качаться. Спросив
    // после, пришлось бы гадать — и гадание стоило бы несколько мегабайт
    // чужого канала, скачанных впустую (замер 23.08: `jsep` качался, а
    // работал `asyncify`).
    const webgpu = await gpu();
    const wasm = webgpu ? RUNTIME_WASM.webgpu : RUNTIME_WASM.wasm;
    // Модель отсюда — байтами, если загрузка со счётчиком удалась; иначе
    // ниже сессия получит адрес и сходит за ней сама.
    const model = await loadWithProgress(
      [
        { url: base + RUNTIME, weigh: RUNTIME },
        { url: base + wasm, weigh: wasm },
        { url: MODEL, weigh: MODEL, keep: true }
      ],
      loaded => report({ loaded })
    ).catch(() => null);
    report({ starting: true });
    // Сборка сессии — самый длинный неразрывный кусок счёта, и разорвать его
    // изнутри нечем: компилирует wasm сам onnxruntime. Что можно — дать
    // строке «warming up…» нарисоваться до него, а не после.
    await breathe();
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
    const providers = webgpu ? ['webgpu', 'wasm'] : ['wasm'];
    // enableMemPattern выключен намеренно: с ним WebGPU пытается
    // переиспользовать буфер входа под выход и падает «Shape mismatch
    // attempting to re-use buffer» — это одна и та же плитка до и после ×4.
    const sess = await ort.InferenceSession.create(model || MODEL, {
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

// Отдать браузеру ход.
//
// Плитки считаются через `await`, и выглядит это так, будто страница между
// ними дышит. Она не дышит: `await` на уже готовом обещании — микрозадача,
// а между микрозадачами браузер не рисует и не слушает мышь. Замер 23.08 на
// картинке 600 × 900 (20 плиток): **одна задача на 22.2 с и ноль кадров**
// за всё время счёта. Отсюда и «Page unresponsive» с кнопкой Wait, и
// пропадавший счётчик плиток — текст ставился, но никогда не рисовался.
//
// Разрывает задачу переход в макрозадачу. Взят `MessageChannel`, а не
// `setTimeout`: в фоновой вкладке таймеры прижимают до одного в секунду,
// и счёт в свёрнутом окне пополз бы вдвое. Стоит это доли миллисекунды
// на плитку против секунды самого счёта.
//
// Настоящее лекарство — считать в Worker: тогда главный поток свободен весь,
// а не по разу в секунду. Это переезд `upscaleInBrowser` целиком, и он
// записан в TODO.
const breathe = () =>
  new Promise(resolve => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => resolve();
    channel.port2.postMessage(0);
  });

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

// Один размер на всё, и он не выдуман здесь: это тот самый порог, по которому
// витрина решает, что работа — телефонные обои (`gauge` в pages.js). Выбор из
// четырёх — ×2, ×4, 2K, 4K — стоял на странице, где спросить не у кого: «2K»
// и «4K» ничего не говорят про ЭТУ картинку, а «×4» называет кратность там,
// где человеку нужен размер.
//
// Условие на витрине двустороннее — длинная сторона от 3840 И короткая
// от 2160, — поэтому и здесь считается по обеим. Одной длинной не хватило бы:
// панораму 2:1, растянутую до 3840 по длинной, витрина в обои не берёт —
// короткая выходит 1920. Тогда ведёт короткая, и длинная перерастает 3840.
//
// Нижняя граница, а не точный размер: картинку, которая уже крупнее порога,
// уменьшать незачем — от неё просят обои, а не пережатие.
export function targetLongestSideFor(width, height) {
  const long = Math.max(width, height);
  const short = Math.min(width, height);
  // Вверх, а не к ближайшему: короткая сторона, округлённая вниз, выходит
  // 2159 и порог не проходит — то есть промах ровно в том, ради чего считаем.
  return Math.max(long, GATE_LONG, Math.ceil((long * GATE_SHORT) / short));
}

/**
 * Считает картинку целиком и возвращает готовый холст.
 * Готовое пишется сразу в нужном размере, а не в ×4 с последующим уменьшением:
 * промежуточный холст на 64 мегапикселя — это четверть гигабайта памяти,
 * и телефон на нём кончается.
 */
export async function upscaleInBrowser(file, { crop = false, onProgress } = {}) {
  const whole = await createImageBitmap(file);
  // Кадр режется ДО счёта, а не после. Три причины, и все три считаются:
  // модель иначе считает пиксели, которые тут же выбрасываются (у широкой
  // картинки это две трети плиток); холст под них упирается в потолок площади
  // раньше, чем кадр наберёт свои 3840 по высоте; и порог назначается по тем
  // сторонам, которые останутся, — считать его по необрезанным значило бы
  // обещать размер, до которого готовому кадру не хватит.
  const window = crop ? phoneWindow(whole.width, whole.height) : null;
  const img = window ? await createImageBitmap(file, window.left, window.top, window.width, window.height) : whole;
  if (window) whole.close();
  const source = { width: img.width, height: img.height };
  const longest = Math.max(img.width, img.height);
  const factor = resultLongestSide(img.width, img.height) / longest;

  // Холсты проверяются до рантайма: если браузер их не потянет, качать ради
  // этого шесть мегабайт незачем.
  const { ctx, pw, ph } = padded(img);
  const out = new OffscreenCanvas(Math.round(img.width * factor), Math.round(img.height * factor));
  const octx = out.getContext('2d');
  if (!usable(octx, out.width, out.height)) throw new Error(TOO_BIG);

  // Пока идёт загрузка, плиток ещё нет, и сказать о ходе работы можно только
  // долей скачанного. Все сообщения идут одним `onProgress` и различаются
  // тем, что в них есть: `loaded` на загрузке, `starting` на сборке сессии,
  // `done`/`total` на плитках.
  const rt = await session(onProgress);
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
      // Ход браузеру отдаётся после отчёта, а не до: иначе счётчик рисовался
      // бы на один тик позже того, что уже посчитано.
      await breathe();
    }
  }
  img.close();
  return { canvas: out, source, provider: rt.provider, seconds: (performance.now() - started) / 1000 };
}
