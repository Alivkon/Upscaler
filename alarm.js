// Кому и когда сервер сам говорит, что увеличение легло.
//
// Отказ Modal посетитель переживает: та же кнопка отдаёт картинку в исходном
// размере (`withoutModel`), и сайт выглядит живым. Поэтому кончиться
// деньги могут неделями незаметно — строка в логе и цифра «выключено» на доске
// журнала видны только тому, кто их открыл. Письмо приходит само.
//
// Одно письмо в сутки, сколько бы отказов ни было: десятый подряд ничего
// не добавляет к первому, а сто писем за вечер — это фильтр «в спам». Сутки
// считаются в памяти, перезапуск их обнуляет; это лишнее письмо, не пропущенное.
//
// Когда увеличение снова заработало, приходит второе письмо, и сутки тишины
// кончаются вместе с аварией: следующий отказ — уже новая авария, и о ней
// пишется сразу. Письмо о возврате идёт только за ушедшим письмом об отказе:
// без первого второе ни о чём не говорит. Перезапуск посреди аварии второе
// письмо теряет — то же лишнее молчание, что и у суток выше.
//
// Через Resend, тем же ключом, что и рассылка (`scripts/newsletter-send.mjs`).
// Без `RESEND_API_KEY` или `ALARM_TO` молчит: на машине разработчика письма
// о своих же опытах не нужны.
const QUIET_MS = 24 * 60 * 60 * 1000;
const RETRY_MS = 60 * 60 * 1000;
// Ответ Modal бывает целой HTML-страницей ошибки; в письме нужно начало.
const REASON_CHARS = 500;
const FROM = 'Tessarum server <hello@tessarum.com>';

let lastSent = -Infinity;
// Когда ушло письмо об отказе, на который ещё не ответили письмом о возврате.
let downSince = null;

/**
 * Сообщить хозяину, что увеличение на сервере не работает. Никогда
 * не бросает: сбой почты не должен превращать отказ посетителю в пятисотую.
 */
export async function raiseAlarm(reason) {
  const key = (process.env.RESEND_API_KEY || '').trim();
  const to = (process.env.ALARM_TO || '').trim();
  if (!key || !to) return false;
  if (Date.now() - lastSent < QUIET_MS) return false;
  // Отмечается до отправки, а не после: два отказа в одну секунду иначе
  // отправили бы два письма.
  lastSent = Date.now();

  const text = [
    'Server upscaling just failed, so visitors can only get their picture at its original size.',
    '',
    `What the server saw: ${reason.slice(0, REASON_CHARS)}`,
    '',
    'If Modal says the workspace is out of credit, top it up in the Modal dashboard (Settings, Usage and billing).',
    'The full line is in the container log. You will get another email when it works again.',
    'If it is still down, the next alert comes no sooner than in 24 hours.'
  ].join('\n');
  if (await send(key, to, 'Tessarum: upscaling is down', text)) {
    downSince ??= Date.now();
    return true;
  }
  // Неушедшее письмо сутки тишины не открывает, но и не повторяется на каждом
  // отказе: сломанный ключ Resend иначе слал бы запрос на каждого посетителя.
  // Следующая попытка через час.
  lastSent = Date.now() - QUIET_MS + RETRY_MS;
  return false;
}

/**
 * Сообщить хозяину, что увеличение снова работает. Зовётся на каждом удачном
 * вызове и молчит, если письма об отказе не было. Тоже никогда не бросает.
 */
export async function clearAlarm() {
  if (downSince === null) return false;
  const since = downSince;
  downSince = null;
  lastSent = -Infinity;
  const key = (process.env.RESEND_API_KEY || '').trim();
  const to = (process.env.ALARM_TO || '').trim();
  if (!key || !to) return false;
  const minutes = Math.max(1, Math.round((Date.now() - since) / 60_000));
  const lasted = minutes < 120 ? `${minutes} min` : `${Math.round(minutes / 60)} h`;
  const text = [
    'Server upscaling works again: a visitor just got an enlarged picture.',
    '',
    `It was down for about ${lasted}, counted from the first alert.`
  ].join('\n');
  return send(key, to, 'Tessarum: upscaling is back', text);
}

async function send(key, to, subject, text) {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [to], subject, text }),
      signal: AbortSignal.timeout(10_000)
    });
    if (response.ok) return true;
    console.error(`alarm: письмо не ушло (${response.status}) ${await response.text()}`);
  } catch (error) {
    console.error(`alarm: письмо не ушло (${error.name}: ${error.message})`);
  }
  return false;
}
