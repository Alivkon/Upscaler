// Ошибка, текст которой предназначен посетителю. Всё остальное превращается
// в «Внутренняя ошибка сервера», чтобы наружу не попадали детали настройки
// (AGENTS.md, «Ошибки»).
//
// Отдельным файлом, а не в `server.js`, с тех пор как бросать её стало нужно
// и в `upscaler.js`: импорт оттуда из `server.js` замкнул бы круг — `server.js`
// уже импортирует `upscaler.js`.
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
