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
import dns from 'node:dns/promises';
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
  body = 'ok',
  after = null
}) {
  const lower = Object.fromEntries(Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value]));
  const req = { path: asked, ip, get: name => lower[name.toLowerCase()] };
  // `write` и `end` подделке нужны настоящие: вес ответа журнал считает по
  // ним, а не по заголовку, и ответ без этих двух методов мерил бы не то,
  // что происходит на сайте.
  const res = Object.assign(new EventEmitter(), {
    statusCode: status,
    getHeader: name => (name.toLowerCase() === 'content-type' ? type : undefined),
    write: () => true,
    end: () => true
  });
  await new Promise(done => write(req, res, done));
  if (after) req.path = after;
  res.write(body);
  res.end();
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

// 9. Подтверждение краулера привязано к паре «адрес и имя», а не к одному
// адресу. Адреса переходят из рук в руки, и один и тот же адрес приходит
// с разными словами о себе; вывод, сделанный про одно имя, не должен
// достаться другому. `bot` — один из двух столбцов, где записан вывод, а не
// сырое поле (второй — `country`): переспросить его через месяц уже нельзя.
//
// DNS здесь подменён, а не спрошен: настоящий ответ зависит от того, чей
// адрес сегодня чей, и проверка, которая ходит в сеть, однажды покраснеет
// не потому, что сломался код. Подменяется объект `node:dns/promises` —
// тот же самый, что импортирует `journal.js`.
const BING = '198.51.100.44';
const HOST = 'msnbot-198-51-100-44.search.msn.com';
const real = { reverse: dns.reverse, resolve: dns.resolve, resolve6: dns.resolve6 };
dns.reverse = async address => (address === BING ? [HOST] : real.reverse(address));
dns.resolve = async host => (host === HOST ? [BING] : real.resolve(host));

// Сначала бинг — он подтверждается: имя узла ведёт обратно на тот же адрес.
await request({
  path: '/',
  ip: BING,
  headers: { 'user-agent': 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)' }
});
// Строка бинга дожидается записи до второго запроса, и это не аккуратность,
// а условие проверки: кэш заполняется в конце ответа, и два запроса, пущенные
// разом, оба сходят в DNS сами — подмены вывода тогда не случится и на
// сломанном коде. Краулер так и ходит: запрос за запросом.
{
  const all = await lines(9);
  if (all[8].bot !== 'bingbot:ok') complain(`подтверждённый бинг записан как ${all[8].bot}`);
}
// Затем гугл с того же адреса — и он подтвердиться не может: имя узла
// бинговское, гугловскому образцу оно не отвечает.
await request({
  path: '/',
  ip: BING,
  headers: { 'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }
});
{
  const all = await lines(10);
  if (all[9].bot !== 'googlebot:fake') complain(`гугл с чужого подтверждения записан как ${all[9].bot}`);
}

// 10. Вес ответа записан, и записан в байтах. Столбец берётся из того, что
// ушло в сокет, а не из `content-length`: перед журналом стоит `compression`,
// и на сжатой странице этого заголовка уже нет — прочерк стоял у каждой
// страницы, то есть у всего, ради чего столбец заводили.
//
// Тело нарочно кириллическое: в utf-8 это два байта на знак, и проверка
// отличает вес от длины строки.
{
  const body = 'страница';
  await request({ path: '/license', headers: { 'user-agent': CHROME }, body });
  const all = await lines(11);
  const expected = String(Buffer.byteLength(body));
  if (all[10].bytes !== expected) complain(`вес ответа ${all[10].bytes}, а не ${expected}`);
}

// 11. Краулер по IPv6 подтверждается. Имя узла у него обычно несёт обе записи,
// A и AAAA; спрашивать A с откатом на AAAA «когда A пуст» — значит для такого
// имени не спросить шестёрку никогда и записать настоящий обход как подлог.
// Вывод при этом получается не пустой, а обратный правде.
{
  const SIX = '2001:db8::42';
  const HOST6 = 'crawl-2001-db8--42.googlebot.com';
  dns.reverse = async address => (address === SIX ? [HOST6] : real.reverse(address));
  dns.resolve = async host => (host === HOST6 ? ['203.0.113.200'] : real.resolve(host));
  dns.resolve6 = async host => (host === HOST6 ? [SIX] : real.resolve6(host));
  await request({
    path: '/',
    ip: SIX,
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }
  });
  const all = await lines(12);
  if (all[11].bot !== 'googlebot:ok') complain(`гугл по IPv6 записан как ${all[11].bot}`);
}
Object.assign(dns, real);

// 12. Форматы картинок берутся из `Accept` и пишутся коротко. Столбец заведён
// ради одного решения — платит ли за себя перекладывание кадров в AVIF, —
// и если он молчит на запросе картинки, решение будет принято по пустому месту.
// У документа в `Accept` картинок нет, и там обязан стоять прочерк: иначе
// доля AVIF считалась бы от всех запросов подряд.
{
  await request({
    path: '/images/crops/a-dim-phone-240x520.jpg',
    headers: { 'user-agent': CHROME, accept: 'image/avif,image/webp,image/apng,*/*;q=0.8' },
    type: 'image/jpeg'
  });
  await request({ path: '/', headers: { 'user-agent': CHROME, accept: 'text/html,application/xhtml+xml' } });
  const all = await lines(14);
  if (all[12].formats !== 'avif,webp') complain(`форматы картинки записаны как ${all[12].formats}`);
  if (all[13].formats !== '-') complain(`у документа в форматах ${all[13].formats}, а не прочерк`);
}

// 13. Строка, записанная до появления столбца, читается сводкой и сегодня.
// Проверка стоит здесь, у журнала, хотя читает её `journal-read.mjs`: обещание
// общее у писателя с читателем, и держится оно на том, что `ua` последний,
// а новый столбец дописан перед ним. Прежний разбор отбрасывал короткую строку
// целиком — первый же новый столбец стёр бы из всех сводок все прошлые дни,
// молча и без единой ошибки на экране. Журнал заново не собрать.
//
// Форм теперь три, и проверяются все три, а не последняя: 12 столбцов писал
// сервер до 13.09, 13 — между выкладкой формата́ми и выкладкой странами, 14 —
// сегодняшний. Один файл дня содержит две формы сразу, если сервер перезапускали
// посреди суток; 13.09.2026 так и вышло, и это не редкий случай, а обычный день
// выкладки. Сдвиг на единицу здесь означал бы, что в столбце страны лежит
// заголовок браузера, — и заметить это по самим числам нельзя.
{
  const OLD = await fs.mkdtemp(path.join(os.tmpdir(), 'journal-old-'));
  const ua = 'Mozilla/5.0 (старый день)';
  const values = {
    time: '2026-09-01T10:00:00Z',
    visit: 'abcd1234',
    kind: 'page',
    status: '200',
    ms: '1.0',
    bytes: '123',
    dest: 'document',
    path: '/',
    ref: '-',
    lang: 'en',
    bot: '-',
    formats: 'avif,webp',
    country: 'DE',
    ua
  };
  // Каждая форма — свой день, чтобы записи не слились в один заход и порядок
  // чтения был предсказуем.
  const shapes = [
    ['2026-09-01', ['formats', 'country'], 12],
    ['2026-09-02', ['country'], 13],
    ['2026-09-03', [], 14]
  ];
  for (const [day, missing, width] of shapes) {
    const columns = COLUMNS.filter(column => !missing.includes(column));
    if (columns.length !== width) complain(`форма ${day}: столбцов ${columns.length}, а не ${width}`);
    await fs.writeFile(path.join(OLD, `${day}.tsv`), columns.map(column => values[column]).join('\t') + '\n');
  }
  const { readDays } = await import('./journal-read.mjs');
  const { records } = await readDays(OLD, 7);
  if (records.length !== shapes.length) complain(`строк прочитано ${records.length}, а не ${shapes.length}`);
  for (const [at, [day, missing]] of shapes.entries()) {
    const record = records[at];
    if (!record) continue;
    // `ua` последний в любой форме — на этом держится весь разбор.
    if (record.ua !== ua) complain(`${day}: заголовок браузера прочитан как ${record.ua}`);
    // Ведущие столбцы лежат по порядку от начала и сдвинуться не могут.
    if (record.bot !== '-' || record.lang !== 'en' || record.path !== '/')
      complain(`${day}: столбцы перед новыми сдвинулись`);
    // Чего в форме не было — прочерк, отличимый от значения.
    for (const column of missing)
      if (record[column] !== '-') complain(`${day}: у отсутствовавшего столбца ${column} значение ${record[column]}`);
    for (const column of ['formats', 'country'])
      if (!missing.includes(column) && record[column] !== values[column])
        complain(`${day}: столбец ${column} прочитан как ${record[column]}`);
  }
  await fs.rm(OLD, { recursive: true, force: true });
}

// 14. Страна считается из адреса — и адрес при этом в файл не попадает.
// Столбец заводится ради вопроса «откуда пришли», на который ни `lang`,
// ни реферер не отвечают; но заводится он на том же условии, что и весь
// журнал, и условие проверяется здесь, а не подразумевается.
//
// Частный адрес обязан дать прочерк, а не страну: с `127.0.0.1` ходит
// healthcheck контейнера каждые тридцать секунд (`docker-compose.yml`),
// и страна у него была бы выдумкой, которая в сводке весит как настоящий заход.
{
  const BERLIN = '80.153.1.1';
  await request({ path: '/', ip: BERLIN, headers: { 'user-agent': CHROME } });
  await request({ path: '/', ip: '127.0.0.1', headers: { 'user-agent': CHROME } });
  const all = await lines(16);
  if (all[14]?.country !== 'DE') complain(`страна немецкого адреса записана как ${all[14]?.country}`);
  if (all[15]?.country !== '-') complain(`у частного адреса страна ${all[15]?.country}, а не прочерк`);
  const text = await fs.readFile(path.join(DIRECTORY, `${new Date().toISOString().slice(0, 10)}.tsv`), 'utf8');
  if (text.includes(BERLIN)) complain(`адрес ${BERLIN} попал в журнал вместе со страной`);
}

await fs.rm(DIRECTORY, { recursive: true, force: true });

if (problems.length) {
  console.error(`журнал запросов: ${problems.length} ошибок`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
console.log('журнал запросов: четырнадцать проверок пройдены');
