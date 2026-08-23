// Что качает первая картинка. Список один на двоих: файлы берёт браузер
// (`upscale-local.js`), а вес их называет сервер (`server.js` — он их видит
// у себя на диске). Разойдись эти два места, и счётчик загрузки считал бы
// долю не от того.
//
// Wasm-файлов два, и качается ровно один. Какой — решает не наш код, а
// onnxruntime, и решает по исполнителю: с WebGPU он берёт сборку `jsep`,
// без неё, простым wasm, — `asyncify`. Разница не косметическая: 26 МБ
// против 24, и скачанный не тот — это несколько мегабайт впустую по чужому
// каналу. Поэтому имя выбирается тем же вопросом об адаптере, каким
// выбирается исполнитель.
export const RUNTIME = 'ort.webgpu.min.mjs';
export const RUNTIME_WASM = {
  webgpu: 'ort-wasm-simd-threaded.jsep.wasm',
  wasm: 'ort-wasm-simd-threaded.asyncify.wasm'
};
export const MODEL = '/models/4x-ClearRealityV1.onnx';

// Всё, чей вес сервер обязан назвать: оба варианта wasm, потому что заранее
// он не знает, какой из них спросят.
export const WEIGHED = [RUNTIME, RUNTIME_WASM.webgpu, RUNTIME_WASM.wasm];
