# Увеличение прямо в браузере пользователя

Опыт 22 августа 2026: может ли картинку увеличивать не сервер за деньги, а
видеокарта того, кто её принёс. Повод — расширение «Unblur Image», бесплатное
именно потому, что считает у себя, и боевая машина, у которой видеокарты нет
вовсе (2 vCPU, ни Vulkan, ни OpenCL).

## Как запустить

```sh
node make-manifest.mjs          # собрать список картинок и копии рядом со страницей
node serve.mjs                  # :8779 — раздаёт страницу, принимает результаты
node drive.mjs <модель> webgpu <плитка>
node make-sheet.mjs             # телефонный лист с буквами
```

Второй набор считается тем же кодом: `make-manifest-new.mjs` кладёт рядом
`manifest-new.json` (и сразу меряет занятость — до того, как что-либо посчитано),
`drive.mjs <модель> webgpu <плитка> new` гоняет его в отдельную папку
результатов, `make-sheet-new.mjs` собирает лист на две буквы. Разделяет наборы
параметр `set` у страницы.

`serve.mjs` нужен вместо `python -m http.server` по двум причинам: он принимает
POST с результатом и ставит заголовки COOP/COEP, без которых onnxruntime-web не
получает `SharedArrayBuffer` и запасной путь на WASM идёт в один поток.
Присланное сразу режется в обои и большой PNG выбрасывается — `/tmp` это tmpfs.

## Три ловушки, каждая стоила времени

1. **Brave не даёт WebGPU вовсе.** `navigator.gpu` есть, а `requestAdapter()`
   возвращает `null`. Поэтому `drive.mjs` поднимает отдельный хромиум с
   `--enable-unsafe-webgpu --enable-features=Vulkan --ozone-platform=x11`
   (с `--ozone-platform=wayland` Vulkan отключается, и GPU-процесс падает).
2. **Экспорт ONNX бывает кривой.** У Real-ESRGAN и ClearRealityV1 выход
   объявлен теми же символическими размерами, что вход. WASM терпит, WebGPU
   падает: `Shape mismatch attempting to re-use buffer {1,224,224,3} !=
   {1,896,896,3}`. Лечится `fix-onnx-output-shape.py`.
3. **Размер плитки задаёт не удобство, а модель.** У `realplksr` вход жёсткий
   256×256, поэтому плитка ровно 224 (+16 полей с каждой стороны), а кадр
   добивается повтором крайнего пикселя до целого числа плиток.

## Где брать модели

| файл | откуда | вес |
|---|---|---|
| `clearreality-x4` | `yuvraj108c/ComfyUI-Upscaler-Onnx` → `4x-ClearRealityV1.onnx` | **1.9 МБ** |
| `realplksr-x4` | `darktable-org/upscale-realplksr-onnx` → `onnx/model_x4.onnx` | 28 МБ |
| `realesrgan-x4` | `yuvraj108c/ComfyUI-Upscaler-Onnx` → `RealESRGAN_x4.onnx` | 68 МБ |

Вес здесь — не мелочь: его качает каждый пользователь.
