# 2026-10-19: браузерной модели больше нет

## Цель

На отказ сервера приёмка предлагала «Enlarge in my browser» моделью
4x-ClearRealityV1. Charlie отверг её как шумную ещё 24.08
(`research/2026-08-24-the-model-he-picked-cannot-run-here.md`), лицензия у неё
CC BY-NC-SA, а в боевом журнале за 13.09–19.10 нет ни одной записи
`made/webgpu`, `made/wasm` или сцены `offered`: сервер не отказал ни разу,
и предложение не показывалось. Решение Charlie: убрать.

## Что убрано

- `public/upscale-local.js`, `public/model-files.js`,
  `public/models/4x-ClearRealityV1.onnx` (отдельным коммитом).
- `onnxruntime-web` из `package.json` и `yarn.lock`; в `server.js` раздача
  `/vendor/ort/<версия>` и вес файлов для полоски загрузки; в `pages.js`
  `<meta name="ort-version">` и `ort-bytes`.
- `public/intake.js`: `renderOffered`, `restoreInBrowser`, `localSize`,
  `LOCAL_FAILED`, флаг `offered`, `sayProgress` (плитки и доля скачанного были
  только у браузерной модели). На отказ сервера теперь `renderFailed`
  с его текстом.
- `public/make.js`: `inBrowser`. `public/note.js`: `webgpu`, `wasm` в `MAKER`
  и `offered` в `STAGE`. Доска: две строки `MADE`.
- `/license#model`: абзац про вторую модель, заголовок в единственном числе.
- LEGAL.md (уточнение в начале раздела, история оставлена), AGENTS.md
  (абзац о ветках и строка о `make.js`), TODO.md (семь пунктов про браузерную
  ветку закрыты).

## Что перенесено, а не удалено

- `MIN_SOURCE` (порог обоев, делённый на ×4; печатается на `/restore`) →
  `public/frame.js`, рядом с `serverLongestSide`. ×4 назван там одной
  константой `SCALE`.
- `usable` (проверка, что холст Safari не молча пуст) → `public/make.js`,
  единственный вызов в `withExtras`.

## Что видит посетитель при отказе

Текст сервера, например «The enlargement took too long. Try again in
a moment.», кнопки «Make my wallpaper» и «Choose another», галочки на месте.
Со снятым «Increase size» та же кнопка отдаёт кадр, приглушение и виньетку
в исходном размере.

## Проверки

- `yarn verify`: код 0.
- Локальный сервер: `/restore` и `/license` без `ort`, `onnx`, `ClearReality`;
  `/upscale-local.js` и `/model-files.js` отвечают 404.
- Chromium через playwright, `/api/upscale` подменён ответом 504 (настоящих
  вызовов Modal ноль): картинка 600 × 1000, галочка dim, увеличение.
  После отказа: «The enlargement took too long. Try again in a moment.»,
  кнопки «Make my wallpaper», «Choose another», галочки treat и enlarge
  остались. Сняли увеличение, нажали: «Your wallpaper is ready, 600 × 1000.»,
  файл `pic-finished-….jpg`, средний цвет 138 122 96 → 94 88 76 (dim
  наложен). Запросов к `upscale-local`, `model-files`, `/vendor/ort`,
  `/models/` не было.
- Выкладка: `deploy.sh` везёт `public/` с `--delete`, образ ставит пакеты
  по `yarn.lock`, так что на боевой машине файлы и рантайм уйдут сами.

## Не сделано

- `/license#model` называет серверную модель `4x-NMKD-Siax`, а с 25.08
  считает `4x_RealisticRescaler_100000_G` (`service/upscale_modal.py`).
  Лицензия та же (WTFPL), но имя и автор на странице не те. Не правилось.
