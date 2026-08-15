# Ограничение Google Upscaler из-за ошибки провайдера

## Цель и решение

Исключить повторные неуспешные задачи Google Upscaler после получения диагностического сообщения Replicate.

Запуск модели завершался с `404 Not Found` на стороне Google Vertex AI: `imagen-4.0-upscale-preview:predict` в проекте Replicate. Это внешний сбой маршрутизации или доступа провайдера, не ошибка HTTP-маршрута приложения. Поэтому Google Upscaler временно отключён, а пользователю предлагаются работающие модели.

## Изменения

- `server.js`: Google Upscaler отмечен недоступным; запрос, сформированный вручную, получает HTTP 503 и понятное сообщение вместо запуска падающей задачи.
- `public/index.html`: выбор Google Upscaler заблокирован и объясняет причину.

## Проверки и ограничения

- Проверка синтаксиса `yarn test` будет выполнена после изменения.
- Для возвращения Google Upscaler требуется исправление интеграции на стороне Replicate либо отдельная прямая интеграция с Google Cloud/Vertex AI с учётными данными пользователя.

## Источники

- [Google Cloud: Imagen 4.0 Upscale Preview](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/4-0-upscale)
- [Google Cloud: Upscale images with Imagen](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/image/upscale-image)
