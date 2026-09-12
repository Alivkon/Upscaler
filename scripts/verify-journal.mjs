// Проверка журнала запросов. Ставится рядом с `node --check journal.js` по той
// же причине, по какой рядом с `limits.js` стоит проверка счётчика: синтаксис
// здесь не говорит ничего, а ломается всё молча и в сторону «записали не то».
// Ошибка тут не роняет сайт — она портит числа, по которым потом принимают
// решения, и заметить её можно будет через месяц, если вообще.
//
// Сервера здесь нет: `journal()` — обычная middleware, и ей довольно поддельных
// `req` и `res`. Файл пишется в каталог во временных, настоящий журнал не
// трогается.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { COLUMNS, journal } from '../journal.js';

const DIRECTORY = await fs.mkdtemp(path.join(os.tmpdir(), 'journal-'));
const write = journal(DIRECTORY);

const problems = [];
const complain = what => problems.push(what);

// Запрос, какой видит middleware. `after` — то, что успевает случиться с `req`
// между `next()` и концом ответа: express на время монтированного обработчика
// срезает с `req.url` префикс, и журнал обязан этого не заметить.
async function request({
  path: asked,
  ip = '203.0.113.7',
  headers = {},
  status = 200,
  type = 'text/html',
  after = null
}) {
  const lower = Object.fromEntries(Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value]));
  const req = { path: asked, ip, get: name => lower[name.toLowerCase()] };
  const res = Object.assign(new EventEmitter(), {
    statusCode: status,
    getHeader: name => (name.toLowerCase() === 'content-type' ? type : undefined)
  });
  await new Promise(done => write(req, res, done));
  if (after) req.path = after;
  res.emit('finish');
}

// Запись идёт через поток и через `await` на подтверждение краулера, то есть
// строка появляется не в тот же тик. Ждём её, а не угадываем задержку.
async function lines(expected) {
  const file = path.join(DIRECTORY, `${new Date().toISOString().slice(0, 10)}.tsv`);
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const text = await fs.readFile(file, 'utf8').catch(() => '');
    const found = text.split('\n').filter(Boolean);
    if (found.length >= expected)
      return found.map(line => Object.fromEntries(COLUMNS.map((column, at) => [column, line.split('\t')[at]])));
    await new Promise(wait => setTimeout(wait, 20));
  }
  complain(`строк в журнале меньше ${expected}`);
  return [];
}

const CHROME = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

// 1. Адрес запоминается на входе. Ровно та ошибка, которую поймал первый же
// заход настоящим браузером: `app.use('/images', …)` срезает префикс, ответ
// заканчивается внутри него, и прочитанный в `finish` `req.path` — это
// `/crops/…`. Каждая карточка витрины уходила в журнал как файл из `public/`.
await request({
  path: '/images/crops/a-dim-phone-240x520.jpg',
  headers: { 'user-agent': CHROME },
  type: 'image/jpeg',
  after: '/crops/a-dim-phone-240x520.jpg'
});
{
  const [line] = await lines(1);
  if (line?.path !== '/images/crops/a-dim-phone-240x520.jpg') complain(`адрес взят после ответа: ${line?.path}`);
  if (line?.kind !== 'image') complain(`вид запроса ${line?.kind}, а не image`);
}

// 2. Столбцов ровно столько, сколько объявлено, и пустых среди них нет:
// пустое поле сдвинуло бы разбор на единицу и молча испортило бы всю сводку.
{
  const [line] = await lines(1);
  for (const column of COLUMNS) if (!line?.[column]) complain(`пустой столбец ${column}`);
}

// 3. Заголовок с табуляцией не режет строку надвое. Заголовки ставит кто
// угодно, и одна строка журнала обязана оставаться одной записью.
await request({ path: '/', headers: { 'user-agent': `${CHROME}\tчужое\tполе`, referer: 'https://example.com/a\tb' } });
{
  const all = await lines(2);
  if (all.length !== 2) complain(`строк ${all.length}, а не 2 — заголовок разрезал запись`);
}

// 4. Один посетитель — один `visit`; другой браузер — другой. Считается
// из адреса и заголовка, и оба в строку не попадают.
await request({ path: '/license', ip: '203.0.113.7', headers: { 'user-agent': CHROME } });
await request({ path: '/license', ip: '198.51.100.2', headers: { 'user-agent': CHROME } });
{
  const all = await lines(4);
  // Сравниваются первая и третья: у второй заголовок нарочно другой.
  if (all[0].visit !== all[2].visit) complain('один и тот же посетитель получил разные visit');
  if (all[2].visit === all[3].visit) complain('разные адреса получили один visit');
}

// 5. Адреса посетителя в журнале нет ни в каком виде — на этом держится
// обещание про отсутствие баннера согласия.
{
  const text = await fs.readFile(path.join(DIRECTORY, `${new Date().toISOString().slice(0, 10)}.tsv`), 'utf8');
  for (const ip of ['203.0.113.7', '198.51.100.2']) if (text.includes(ip)) complain(`адрес ${ip} попал в журнал`);
}

// 6. Краулер, назвавшийся по имени, назван и в журнале; притворившийся гуглом
// не подтверждается обратным DNS с документационного адреса.
await request({
  path: '/',
  headers: { 'user-agent': 'Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)' }
});
await request({
  path: '/',
  ip: '198.51.100.9',
  headers: { 'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }
});
{
  const all = await lines(6);
  if (all[4].bot !== 'gptbot') complain(`gptbot назван как ${all[4].bot}`);
  if (all[5].bot === 'googlebot') complain('имя гугла принято на слово, без обратного DNS');
  if (!all[5].bot.startsWith('googlebot:')) complain(`гугл записан как ${all[5].bot}`);
}

// 7. Ненайденное — это `miss`, чем бы оно ни было: по этому столбцу ищут
// битые ссылки и чужие попытки.
await request({ path: '/wp-login.php', status: 404, headers: { 'user-agent': CHROME } });
{
  const all = await lines(7);
  if (all[6].kind !== 'miss') complain(`404 записан как ${all[6].kind}`);
}

// 8. Битый процент в адресе не роняет запись: такой запрос — сам по себе
// признак, и терять его незачем.
await request({ path: '/w/%E0%A4%A', status: 404, headers: { 'user-agent': CHROME } });
{
  const all = await lines(8);
  if (all.length !== 8) complain('запрос с битым адресом не записался');
}

await fs.rm(DIRECTORY, { recursive: true, force: true });

if (problems.length) {
  console.error(`журнал запросов: ${problems.length} ошибок`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
console.log('журнал запросов: восемь проверок пройдены');
