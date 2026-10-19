// Первое движение руки: мышь сдвинулась, палец коснулся, колесо, клавиша.
// Журнал видит запросы, а запросы машина в костюме браузера делает так же,
// как человек: 15.10.2026 сканер прошёл в люди пятью «устройствами» за
// 20 секунд. Двигать мышью ему незачем, поэтому одна пустая запись
// `/api/note/hand` на страницу отделяет тех, у кого была рука.
//
// Прокрутки в списке нет нарочно: браузер сам возвращает её при переходе
// «назад», и событие приходит без человека. Чужой скрипт может вызвать
// событие и сам, но тогда `isTrusted` у него ложь.
//
// Доска с 19.10.2026 считает людьми только тех, у кого была рука
// (`confirmed` в `scripts/journal-read.mjs`).
//
// Вкладка, пролежавшая в фоне полчаса, слушает руку заново. Заход в журнале —
// на сутки и адрес, а страница живёт дольше: 19.10.2026 гость открыл вкладку,
// оставшуюся со вчера, и три с половиной минуты листал витрину. Страницу
// телефон не перезапрашивал, руку она отправила ещё вчера, и на доске
// человека не стало. Полчаса, а не каждое возвращение: переключение вкладок
// туда и обратно — тот же визит, и записи сверх одной на страницу съедали бы
// ведро `hand` в `limits.js` у всех за тем же адресом.
import { report } from './note.js';

const AWAY = 30 * 60 * 1000;

const EVENTS = ['pointermove', 'pointerdown', 'wheel', 'touchstart', 'keydown'];

function felt(event) {
  if (!event.isTrusted) return;
  for (const name of EVENTS) removeEventListener(name, felt, true);
  report('hand');
}

function listen() {
  for (const name of EVENTS) addEventListener(name, felt, { capture: true, passive: true });
}

listen();
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') hiddenAt = Date.now();
  else if (Date.now() - hiddenAt > AWAY) listen();
});
