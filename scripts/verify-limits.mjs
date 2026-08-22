// Проверка счётчика вызовов. Ставится рядом с `node --check limits.js`
// по той же причине, по какой рядом с `works.js` стоит проверка каталога:
// синтаксис здесь ни о чём не говорит, а ломается всё молча и в сторону
// «пропускать». Ошибка в этих воротах не роняет сервер — она просто открывает
// платный маршрут, и заметить это можно будет по счёту от Replicate.
//
// Настоящих вызовов здесь нет и быть не может: проверяется чистая арифметика
// окон, а `upscaleAllowance` до Replicate не доходит вовсе.
//
// Часы подменяются: окна — час и сутки, и ждать их по-настоящему нельзя.
// Подмена же разводит случаи между собой — сутки вперёд, и все три ведра пусты.
import { upscaleAllowance } from '../limits.js';

const HOUR = 60 * 60 * 1000;
let clock = Date.parse('2026-08-22T09:00:00Z');
Date.now = () => clock;
const travel = hours => (clock += hours * HOUR);

const problems = [];
const complain = what => problems.push(what);

// Посетитель: браузер с куками, которые он и хранит между запросами.
//
// Три способа позвать ворота — ровно те три, что бывают у сервера. `start` —
// запрос в работе: место занято, дошёл он до Replicate или нет, ещё неизвестно.
// `ask` — запрос, который не дошёл: сервер зовёт `release` из `finally`.
// `upscale` — дошёл и заплатил.
function visitor(ip = '203.0.113.1') {
  const jar = {};
  const start = () => {
    const req = {
      ip,
      protocol: 'http',
      headers: {
        cookie: Object.entries(jar)
          .map(([name, value]) => `${name}=${value}`)
          .join('; ')
      }
    };
    const res = { cookie: (name, value) => (jar[name] = value) };
    return upscaleAllowance(req, res);
  };
  return {
    ip,
    start,
    ask() {
      const allowance = start();
      allowance.release?.();
      return allowance;
    },
    // Обычный путь: спросили и потратили.
    upscale() {
      const allowance = start();
      allowance.spend?.();
      allowance.release?.();
      return allowance;
    },
    jar
  };
}

const refusedBy = (allowance, words) => Boolean(allowance.refusal) && allowance.refusal.includes(words);

// 1. Пять в час с браузера, шестой — отказ.
{
  const guest = visitor();
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    if (guest.upscale().refusal) complain(`попытка ${attempt} из пяти отказана, а должна пройти`);
  }
  const sixth = guest.upscale();
  if (!refusedBy(sixth, 'Five images an hour')) complain(`шестая за час прошла: ${sixth.refusal ?? 'без отказа'}`);
  if (!(sixth.retryAfter > 0 && sixth.retryAfter <= 3600)) complain(`Retry-After вне часа: ${sixth.retryAfter}`);
}

// 2. Час прошёл — окно освободилось.
travel(1);
{
  const guest = visitor('203.0.113.2');
  for (let attempt = 0; attempt < 5; attempt += 1) guest.upscale();
  travel(1);
  if (guest.upscale().refusal) complain('через час после пяти вызовов браузер всё ещё заперт');
}

// 3. Спросить — не значит потратить: платим за вызовы Replicate, а не
// за попытки, и отклонённый файл до счётчика доходить не должен.
travel(25);
{
  const guest = visitor('203.0.113.3');
  for (let attempt = 0; attempt < 20; attempt += 1) guest.ask();
  if (guest.ask().refusal) complain('двадцать вопросов без списания заперли браузер');
}

// 4. Куки стёрли — держит адрес: десять в сутки, одиннадцатый отказан.
travel(25);
{
  const address = '203.0.113.4';
  for (let browser = 0; browser < 10; browser += 1) {
    const guest = visitor(address);
    if (guest.upscale().refusal) complain(`браузер ${browser + 1} с адреса отказан, а должен пройти`);
  }
  const eleventh = visitor(address).upscale();
  if (!refusedBy(eleventh, 'Ten images a day'))
    complain(`одиннадцатый с адреса прошёл: ${eleventh.refusal ?? 'без отказа'}`);
}

// 5. Куки заводятся, когда их нет, и не переписываются, когда есть.
travel(25);
{
  const guest = visitor('203.0.113.5');
  guest.upscale();
  const first = guest.jar.visitor;
  if (!first) complain('куки посетителю не выдана');
  guest.upscale();
  if (guest.jar.visitor !== first) complain('куки переписана на втором вызове');
}

// 6. Пятьдесят в сутки на всех: разные браузеры с разных адресов упираются
// в общий потолок. Считаем от нуля — сутки вперёд обнулили и его.
travel(25);
{
  const CEILING = 50;
  let refusal = null;
  let passed = 0;
  for (let guest = 0; guest < CEILING + 20 && !refusal; guest += 1) {
    const allowance = visitor(`198.51.100.${guest}`).upscale();
    if (allowance.refusal) refusal = allowance;
    else passed += 1;
  }
  if (passed !== CEILING) complain(`общий потолок сработал на ${passed}, а не на ${CEILING}`);
  if (!refusedBy(refusal ?? {}, 'images this site makes in a day'))
    complain(`${CEILING + 1}-й прошёл: ${refusal?.refusal ?? 'без отказа'}`);
}

// 7. Сто запросов, начатых одновременно, — тот самый цикл `fetch` без `await`
// из консоли браузера. Пока место занималось перед самым вызовом Replicate,
// а не в момент проверки, проходили все сто: каждый читал счётчик, в котором
// ещё никто не отметился. Проходят пятеро — норма гостя.
travel(25);
{
  const guest = visitor('203.0.113.7');
  const started = [];
  for (let attempt = 0; attempt < 100; attempt += 1) started.push(guest.start());
  const passed = started.filter(allowance => !allowance.refusal);
  if (passed.length !== 5) complain(`одновременно с браузера прошли ${passed.length}, а не 5`);
  // Брошенные запросы возвращают место: сто отказов не должны стоить гостю
  // ничего, а пятеро прошедших до Replicate не дошли.
  for (const allowance of passed) allowance.release();
  if (guest.upscale().refusal) complain('незавершённые запросы не вернули место');
}

// 8. То же для общего потолка: сотня разных браузеров с разных адресов,
// начавших одновременно. Полсотни — и есть та граница, которая стоит денег.
travel(25);
{
  const started = [];
  for (let guest = 0; guest < 100; guest += 1) started.push(visitor(`198.51.100.${guest}`).start());
  const passed = started.filter(allowance => !allowance.refusal);
  if (passed.length !== 50) complain(`одновременно на сайте прошли ${passed.length}, а не 50`);
}

if (problems.length) {
  console.error(`счётчик вызовов: ${problems.length} ошибок`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
console.log('счётчик вызовов: восемь проверок пройдены');
