# Выбор разрешения 2K и 4K для портретов

## Цель и решение

Добавить выбор разрешения результата для портретных Nano Banana-моделей.

Для Nano Banana Pro и Nano Banana 2 добавлены кнопки 2K и 4K. Значение передаётся в параметре `resolution` API Replicate. Обычная Nano Banana не поддерживает этот параметр, поэтому блок разрешения скрывается при её выборе.

## Изменения

- `public/index.html`: добавлены кнопки выбора 2K и 4K; модели с поддержкой разрешения отмечены в разметке.
- `public/app.js`: блок разрешения показывается только для поддерживающей модели.
- `server.js`: выбранное разрешение проверяется и передаётся в Nano Banana Pro или Nano Banana 2.

## Проверки и ограничения

- Схемы API Replicate подтверждают значения `1K`, `2K`, `4K` для Nano Banana Pro и Nano Banana 2. В интерфейсе доступны запрошенные 2K и 4K.
- Реальный запуск не выполнялся, поскольку он создаёт оплачиваемую задачу.

## Источники

- [Nano Banana Pro API на Replicate](https://replicate.com/google/nano-banana-pro/api)
- [Nano Banana 2 API на Replicate](https://replicate.com/google/nano-banana-2/api)
