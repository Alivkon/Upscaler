# Исправление 404 Google Upscaler

## Цель и решение

Проверить и устранить HTTP 404 при запуске Google Upscaler через Replicate.

Для Google Upscaler был выбран вызов по опубликованной версии модели через общий endpoint `POST /v1/predictions`. Это исключило проблему маршрута приложения, но не устранило внешний сбой провайдера; окончательное защитное изменение зафиксировано в документе `2026-08-15-google-upscaler-provider-404.md`.

## Изменения

- `server.js`: у конфигурации `google` заменён `endpoint` на публичный идентификатор версии `cea869a892f010576b7965457511a08c7534d4992f1250a46499f36ec681fcd1`.
- `server.js`: параметры остались без изменений: изображение, увеличение `x2`, качество JPEG `90`.

## Проверки и ограничения

- Выполнен `yarn test` (`node --check server.js`) — успешно.
- Платный запрос к Replicate не выполнялся: для него требуется токен и он создаёт оплачиваемую задачу.
- Фактическая проверка показала 404 в Google Vertex AI: `imagen-4.0-upscale-preview:predict` вызывается из проекта Replicate. Это не ошибка маршрута приложения.

## Источники

- [Replicate: Google Upscaler API](https://replicate.com/google/upscaler/api)
- [Replicate: HTTP API](https://replicate.com/docs/reference/http)
