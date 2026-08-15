# Добавление Nano Banana в Upscaler

## Цель и решение

Добавить в интерфейс четыре Google Nano Banana-модели Replicate и текстовую инструкцию для редактирования изображения.

Добавлены `google/nano-banana`, `google/nano-banana-pro`, `google/nano-banana-2` и `google/nano-banana-2-lite`. Для всех исходное изображение передаётся в `image_input`, а текст из формы — в `prompt`. У моделей Pro и Nano Banana 2 заданы стандартные разрешения `2K` и `1K`.

## Изменения

- `server.js`: добавлены четыре конфигурации моделей и формирование входа `prompt` + `image_input`.
- `server.js`: запрос Nano Banana без инструкции отклоняется с HTTP 400.
- `public/index.html`: добавлены карточки моделей, textarea с исходной инструкцией и его оформление: «Увеличь разрешение изображения в 2 раза, сохрани композицию и детали, не меняй содержание».

## Проверки и ограничения

- Схемы входных параметров прочитаны через API Replicate без создания задач или списания средств.
- Nano Banana — генеративные модели редактирования: даже с инструкцией сохранить содержание результат может отличаться от строгого пиксельного апскейла.
- Синтаксическая проверка должна быть выполнена после изменений.

## Источники

- [Nano Banana на Replicate](https://replicate.com/google/nano-banana)
- [Nano Banana 2 API на Replicate](https://replicate.com/google/nano-banana-2/api)
- [Nano Banana Pro API на Replicate](https://replicate.com/google/nano-banana-pro/api)
