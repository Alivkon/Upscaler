// Проверка письма о том, что увеличение легло (`alarm.js`). Ломается оно
// молча и в сторону «не сказать»: сайт при этом жив, и узнать о поломке можно
// было бы только по пустому ящику в тот день, когда кончились деньги.
//
// Настоящих вызовов нет: `fetch` подменён, и Modal, и Resend здесь — заглушки.
// Часы тоже подменены, чтобы сутки тишины не ждать по-настоящему.
import sharp from 'sharp';

const HOUR = 60 * 60 * 1000;
let clock = Date.parse('2026-10-19T09:00:00Z');
Date.now = () => clock;
const travel = hours => (clock += hours * HOUR);

// Что отвечает каждая сторона и сколько писем ушло.
let modalStatus = 402;
let resendStatus = 200;
const letters = [];
globalThis.fetch = async (url, options) => {
  if (String(url).startsWith('https://api.resend.com/')) {
    letters.push(JSON.parse(options.body));
    return new Response('{}', { status: resendStatus });
  }
  if (modalStatus === 'timeout') throw new DOMException('The operation timed out.', 'TimeoutError');
  // Заголовки пришли, а картинка застряла на полпути.
  if (modalStatus === 'stalled') {
    const body = new ReadableStream({
      pull: () => Promise.reject(new DOMException('The operation timed out.', 'TimeoutError'))
    });
    return new Response(body, { status: 200 });
  }
  return new Response('workspace billing limit reached', { status: modalStatus });
};
// Строки отказов в логе здесь ожидаемы и только мешали бы читать вывод;
// всё прочее, вроде упавшего импорта, должно остаться видно.
const say = console.error;
console.error = (line, ...rest) => {
  if (!/^(upscaler|alarm): /.test(String(line))) say(line, ...rest);
};

process.env.UPSCALE_URL = 'https://test--upscale.modal.run';
process.env.UPSCALE_KEY = 'wk-test';
process.env.UPSCALE_SECRET = 'ws-test';
delete process.env.RESEND_API_KEY;
delete process.env.ALARM_TO;

const { enlarge } = await import('../upscaler.js');
const { raiseAlarm } = await import('../alarm.js');

const picture = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#808080' } })
  .jpeg()
  .toBuffer();
const call = () => enlarge(picture, { width: 8, height: 8, targetLongestSide: 32 }).catch(error => error);
// `raiseAlarm` из `upscaler.js` не ждут: посетитель не должен ждать почту.
// Здесь ждём, пока заглушка Resend успеет ответить.
const settle = () => new Promise(resolve => setTimeout(resolve, 0));

const problems = [];
const complain = what => problems.push(what);

// 1. Без ключа и адреса — молчание: так на машине разработчика.
await call();
await settle();
if (letters.length) complain('без RESEND_API_KEY и ALARM_TO письмо всё равно ушло');

process.env.RESEND_API_KEY = 're_test';
process.env.ALARM_TO = 'owner@example.com';

// 2. Кончились деньги: Modal отвечает отказом, посетитель получает 502,
// хозяину уходит одно письмо, и в нём слова самого Modal.
const refused = await call();
await settle();
if (refused.status !== 502) complain(`посетитель получил ${refused.status}, а не 502`);
if (letters.length !== 1) complain(`на первый отказ ушло ${letters.length} писем, а не одно`);
else {
  if (letters[0].to[0] !== 'owner@example.com') complain('письмо ушло не на ALARM_TO');
  if (!letters[0].text.includes('402: workspace billing limit')) complain('в письме нет ответа Modal');
}

// 3. Ещё девять отказов в тот же день — писем не прибавляется.
for (let i = 0; i < 9; i++) await call();
await settle();
if (letters.length !== 1) complain(`за день ушло ${letters.length} писем, а не одно`);

// 4. Через сутки отказ всё ещё идёт — письмо приходит снова.
travel(24);
await call();
await settle();
if (letters.length !== 2) complain(`через сутки писем ${letters.length}, а не два`);

// 5. Отказ по вине посетителя (слишком большой файл) хозяину не пишется.
travel(24);
modalStatus = 413;
await call();
await settle();
if (letters.length !== 2) complain('на 413 посетителя ушло письмо');

// 6. Ключ не тот (401) — пишется: исправлять это нам.
modalStatus = 401;
const locked = await call();
await settle();
if (locked.status !== 503) complain(`на 401 посетитель получил ${locked.status}, а не 503`);
if (letters.length !== 3) complain('на 401 письмо не ушло');

// 7. Resend не принял письмо — сутки тишины не наступают, но и на каждом
// отказе он не дёргается: следующая попытка через час.
travel(24);
resendStatus = 500;
await raiseAlarm('first');
resendStatus = 200;
if (await raiseAlarm('second')) complain('после неушедшего письма повтор ушёл сразу, без часа');
travel(1);
if (!(await raiseAlarm('third'))) complain('через час после неушедшего письма повтора нет');

// 8. Сервер без настройки на боевой — тоже поломка, о ней пишется.
travel(24);
delete process.env.UPSCALE_SECRET;
const before = letters.length;
await call();
await settle();
if (letters.length !== before + 1) complain('без UPSCALE_SECRET письмо не ушло');

// 9. Длинный ответ Modal (HTML-страница ошибки) в письмо целиком не идёт.
travel(24);
await raiseAlarm('x'.repeat(50_000));
if (letters.at(-1).text.length > 2000) complain(`письмо длиной ${letters.at(-1).text.length}, ответ не обрезан`);

// 10. Modal не ответил вовремя: посетитель получает 504, хозяину письмо.
travel(24);
process.env.UPSCALE_SECRET = 'ws-test';
modalStatus = 'timeout';
const hung = await call();
await settle();
if (hung.status !== 504) complain(`на таймаут посетитель получил ${hung.status}, а не 504`);
if (!letters.at(-1).text.includes('timed out')) complain('на таймаут письмо не ушло');

// 11. То же, но Modal замолчал посреди картинки: срок идёт и на чтение ответа.
travel(24);
modalStatus = 'stalled';
const lettersBefore = letters.length;
const stalled = await call();
await settle();
if (stalled.status !== 504) complain(`на застрявшую картинку посетитель получил ${stalled.status}, а не 504`);
if (letters.length !== lettersBefore + 1 || !letters.at(-1).text.includes('timed out'))
  complain('на застрявшую картинку письмо не ушло');

if (problems.length) {
  process.stderr.write(`письмо об отказе: ${problems.length} ошибок\n`);
  for (const problem of problems) process.stderr.write(`  ${problem}\n`);
  process.exit(1);
}
console.log('письмо об отказе: одиннадцать проверок пройдены');
