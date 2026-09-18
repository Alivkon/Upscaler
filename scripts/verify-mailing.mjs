// Проверка списка рассылки. Ставится рядом с `node --check mailing.js` по той
// же причине, по какой рядом с `limits.js` стоит проверка счётчика: синтаксис
// здесь ни о чём не говорит, а ломается всё молча и в сторону «записать».
// В файле лежат чужие почтовые адреса, и цена ошибки — не ошибка на экране,
// а строка, которой там быть не должно, или потерянный подписчик.
//
// Настоящих писем здесь нет и быть не может: рассылки пока не существует
// вовсе, проверяется разбор адреса и дозапись во временный каталог.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { isAddress, normalize, subscribers } from '../mailing.js';

const problems = [];
const complain = what => problems.push(what);

// Что считается адресом. Слева — то, что человек напечатал; справа — должно ли
// это лечь в файл. Строгой проверки адреса здесь нет нарочно (mailing.js):
// отсекается то, что сломает файл как таблицу, и явные опечатки.
const ADDRESSES = [
  ['charlie@example.com', true],
  ['  Charlie@Example.COM  ', true],
  ['first.last+tag@sub.example.co.uk', true],
  ['', false],
  ['charlie', false],
  ['charlie@example', false],
  ['charlie@@example.com', false],
  ['charlie@ example.com', false],
  ['two@example.com, three@example.com', false],
  ['charlie@example..com', false],
  ['name\tmore@example.com', false],
  ['name\nmore@example.com', false],
  ['<charlie@example.com>', false],
  [`${'a'.repeat(250)}@example.com`, false]
];

for (const [input, allowed] of ADDRESSES) {
  const verdict = isAddress(normalize(input));
  if (verdict !== allowed) {
    complain(`адрес ${JSON.stringify(input)}: ожидали ${allowed ? 'принять' : 'отклонить'}, вышло наоборот`);
  }
}

if (normalize('  Charlie@Example.COM  ') !== 'charlie@example.com') {
  complain('приведение адреса: пробелы и регистр должны сниматься');
}

// Дозапись. Каталог временный и уносится за собой: боевой лежит в `MAIL_DIR`,
// и проверка не должна знать о нём вовсе.
const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'tessarum-mail-'));
try {
  const list = subscribers(directory);
  const outcomes = [
    await list.add('charlie@example.com', 'collection'),
    await list.add('CHARLIE@example.com', 'page'),
    await list.add('not-an-address', 'page'),
    await list.add('second@example.com', 'wherever')
  ];
  const expected = ['saved', 'known', 'invalid', 'saved'];
  if (outcomes.join(' ') !== expected.join(' ')) {
    complain(`исходы записи: ожидали ${expected.join(' ')}, вышло ${outcomes.join(' ')}`);
  }

  // Одновременные нажатия. Очередь в `mailing.js` затем и заведена: без неё
  // два одинаковых адреса разминутся между проверкой на повтор и записью.
  const together = await Promise.all(Array.from({ length: 5 }, () => list.add('crowd@example.com', 'collection')));
  if (together.filter(outcome => outcome === 'saved').length !== 1) {
    complain(`пять одновременных подписок одного адреса дали ${together.join(' ')}`);
  }

  const lines = (await fs.readFile(path.join(directory, 'subscribers.tsv'), 'utf8'))
    .split('\n')
    .filter(line => line && !line.startsWith('#'));
  if (lines.length !== 3) complain(`строк в файле ${lines.length}, ожидали три`);
  for (const line of lines) {
    const columns = line.split('\t');
    if (columns.length !== 3) complain(`столбцов в строке ${columns.length}, ожидали три: ${JSON.stringify(line)}`);
    if (Number.isNaN(Date.parse(columns[0]))) complain(`время не читается: ${JSON.stringify(columns[0])}`);
  }
  // Неизвестное значение `from` в файл не попадает: столбец сверяется
  // со списком, иначе туда уехало бы что угодно из тела запроса.
  const sources = lines.map(line => line.split('\t')[2]);
  if (sources.join(' ') !== 'collection - collection') {
    complain(`столбец from: ожидали «collection - collection», вышло «${sources.join(' ')}»`);
  }

  // Память наполняется из файла, а не только из своих же записей: после
  // перезапуска сервер обязан знать, кто уже подписан.
  const afterRestart = subscribers(directory);
  if ((await afterRestart.add('charlie@example.com', 'page')) !== 'known') {
    complain('перечитанный файл не узнал уже записанный адрес');
  }
} finally {
  await fs.rm(directory, { recursive: true, force: true });
}

if (problems.length) {
  console.error('список рассылки:');
  for (const problem of problems) console.error(`  — ${problem}`);
  process.exit(1);
}
console.log(`список рассылки: ${ADDRESSES.length + 6} проверок пройдены`);
