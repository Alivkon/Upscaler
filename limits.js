import { randomUUID } from 'node:crypto';

// Кто и сколько раз может звать платный маршрут.
//
// Отдельный файл, а не строчка в `server.js`: у счёта своя причина
// существовать. Каждый вызов `/api/upscale` уходит в Replicate и стоит денег,
// а маршрут открыт всякому, кто откроет консоль браузера. До сих пор его
// защищал только `HOST=127.0.0.1`, и с публикацией эта защита кончается.
//
// Ворот трое, и они отвечают на три разных вопроса.
//
// «Гость» — куки. Один браузер: пять картинок в час. Куки, а не адрес, потому
// что за одним адресом сидит целый офис или целая мобильная сота, и считать
// их одним посетителем значит наказать девятерых за десятого.
//
// «Адрес» — `req.ip`. Куки стираются в два щелчка, и без второго счётчика
// первый не значит ничего. Десять в сутки с адреса — это потолок для того,
// кто чистит куки между попытками, и он заведомо выше, чем нужно человеку.
//
// «Сервер» — общий счётчик. Первые двое делят расход по-честному, но полсотни
// новых гостей — это полсотни оплаченных вызовов, и границы счёта из них не
// выходит. Пятьдесят в сутки на всех — и есть та граница. Число выбрано под
// платного Replicate; со своей моделью на своей машине причина его существования
// пропадает (TODO.md).
//
// Всё это живёт в памяти и обнуляется при перезапуске: суточный потолок
// после деплоя выдаёт следующую сотню. Выбрано сознательно — файла со
// счётчиками нет, записи на каждый вызов нет, состояния, за которым надо
// следить, нет. Цена известна: перезапуск открывает кран. Когда это начнёт
// стоить заметных денег, счётчик «сервера» переедет в файл, остальные два
// могут остаться здесь.
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const COOKIE = 'visitor';
const A_YEAR = 365 * 24 * 60 * 60;

const RULES = {
  visitor: {
    allowed: 5,
    window: HOUR,
    refusal: when => `Five images an hour from one browser is the limit. The form opens again in ${when}.`
  },
  address: {
    allowed: 10,
    window: DAY,
    refusal: when => `Ten images a day from one connection is the limit. Try again in ${when}.`
  },
  server: {
    // Числа гостя и адреса названы в отказе словами, а это — нет, и нарочно:
    // общий потолок будет двигаться (50 на время, пока за каждый вызов платим
    // мы), а посетителю он всё равно ничего не подсказывает — сколько именно
    // осталось на всех, от него не зависит. Так число живёт в одном месте.
    allowed: 50,
    window: DAY,
    refusal: when => `The images this site makes in a day have all been made. Try again in ${when}.`
  }
};

// Отметки времени по ключу, отдельной картой на каждые ворота. Значение —
// массив: считаем скользящим окном, а не сутками от полуночи, потому что
// от полуночи сутки начинаются в часовом поясе сервера, а посетитель живёт
// в своём и увидел бы, что лимит снялся посреди дня или не снялся к утру.
//
// Отметка — объект `{ at }`, а не голое число: место занимается до того, как
// стало известно, дойдёт ли запрос до Replicate, и снять потом надо именно
// свою отметку. В одну миллисекунду попадает сколько угодно запросов,
// и по времени они друг от друга неотличимы.
const marks = { visitor: new Map(), address: new Map(), server: new Map() };

// Карта адресов растёт от каждого нового посетителя и сама ничего не забывает:
// без уборки это утечка, медленная ровно настолько, чтобы её не заметить.
// Убираем не по расписанию, а когда карта разрослась, — на витрине без
// посетителей уборщик не должен просыпаться вовсе.
const CROWDED = 1000;

function sweep(bucket, window, now) {
  for (const [key, times] of bucket) {
    const fresh = times.filter(mark => mark.at > now - window);
    if (fresh.length) bucket.set(key, fresh);
    else bucket.delete(key);
  }
}

function recent(rule, key, now) {
  const bucket = marks[rule];
  if (bucket.size > CROWDED) sweep(bucket, RULES[rule].window, now);
  return (bucket.get(key) || []).filter(mark => mark.at > now - RULES[rule].window);
}

// Через сколько освободится место: окно, отсчитанное от самой старой из
// отметок, которые ещё в нём держатся.
function freeAt(rule, times) {
  return times[0].at + RULES[rule].window;
}

// Занять место в ведре и вернуть способ отдать его обратно. Отдать можно
// дважды: второй раз отметки уже нет и снимать нечего.
function hold(rule, key, now) {
  const mark = { at: now };
  marks[rule].set(key, [...recent(rule, key, now), mark]);
  return () => {
    const times = marks[rule].get(key);
    if (!times) return;
    const left = times.filter(other => other !== mark);
    if (left.length) marks[rule].set(key, left);
    else marks[rule].delete(key);
  };
}

// «40 minutes», «6 hours» — текст для посетителя, а не число секунд.
// Округление всегда вверх: сказать «через минуту» и ответить отказом
// через минуту — хуже, чем сказать «через две».
function inWords(ms) {
  const minutes = Math.ceil(ms / MINUTE);
  if (minutes <= 1) return 'a minute';
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.ceil(minutes / 60);
  return hours === 1 ? 'an hour' : `${hours} hours`;
}

// Опознавательный знак браузера. Не подписан: подделать его стоит ровно
// столько же, сколько стереть, — а стёртые куки ловит счётчик адреса.
// Подпись потребовала бы секрета в окружении и не добавила бы к этому ничего.
function visitorOf(req, res) {
  const jar = req.headers.cookie || '';
  const found = jar
    .split(';')
    .map(pair => pair.trim())
    .find(pair => pair.startsWith(`${COOKIE}=`));
  if (found) return found.slice(COOKIE.length + 1);
  const id = randomUUID();
  res.cookie(COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.protocol === 'https',
    maxAge: A_YEAR * 1000
  });
  return id;
}

// Разрешение на один вызов. Либо `refusal` — готовый ответ посетителю, либо
// пара расписок: `spend` — «деньги ушли», `release` — «до Replicate не дошли».
//
// Место занимается в тот же миг, что и проверяется, — иначе ворот нет вовсе.
// Между вопросом и списанием у сервера лежит `await` (`readLongestSide`),
// а значит сотня запросов, отправленных из консоли браузера одним циклом
// без `await`, успевает спросить все сто раз прежде, чем отметится первый:
// каждый читает пустой счётчик и каждый проходит. Ровно этого посетителя
// файл и сторожит, так что проверка и занятие места обязаны быть одним
// действием, без `await` между ними.
//
// Считать при этом нужно вызовы Replicate, а не попытки: приславший файл
// не того формата до Replicate не доходит и платить за него не должен —
// иначе десять опечаток съедали бы суточную долю адреса, ничего не стоив.
// Поэтому место не списывается, а бронируется: `release` возвращает его,
// если до вызова так и не дошло. Звать `release` обязан вызывающий, из
// `finally`, — после `spend` он ничего не делает.
//
// Занятое место никогда не превышает нормы, и `freeAt` выше поэтому всегда
// называет честный срок: отметок в ведре не может стать больше, чем `allowed`.
export function upscaleAllowance(req, res) {
  const now = Date.now();
  const keys = [
    ['visitor', visitorOf(req, res)],
    ['address', req.ip || 'unknown'],
    ['server', 'all']
  ];
  const held = [];
  const undo = () => {
    for (const free of held) free();
  };
  for (const [rule, key] of keys) {
    const times = recent(rule, key, now);
    if (times.length >= RULES[rule].allowed) {
      // Первые ворота пропустили, эти — нет: занятое у первых надо вернуть,
      // иначе отказ на общем потолке съедал бы норму гостя.
      undo();
      const wait = freeAt(rule, times) - now;
      return { refusal: RULES[rule].refusal(inWords(wait)), retryAfter: Math.ceil(wait / 1000) };
    }
    held.push(hold(rule, key, now));
  }
  let spent = false;
  return {
    spend() {
      spent = true;
    },
    release() {
      if (!spent) undo();
    }
  };
}
