// Лист для просмотра: кюха — «старая школа» японского масла.
//
// Зачем. Лист yoga-browse.html Чарли забраковал: «гладкие и минималистичные»
// работы, которые он выбрал, а там почти везде импрессионистский мазок.
// Он прав, и вот в чём была ошибка.
//
// Японское масло раскалывается надвое в 1893 году, когда Курода Сэйки вернулся
// из Франции с пленэром. Дальше две партии спорят двадцать лет:
//
//   кюха (旧派, «старая школа»), она же яни-ха (脂派, «смоляная школа» —
//   дразнили за коричневые лаковые поверхности): Кобу Бидзюцу Гакко,
//   выучка Фонтанези, Мэйдзи Бидзюцукай 1889 года. Кладка слитная, мазка
//   не видно, рисунок жёсткий, фон — большое ровное тональное поле.
//
//   синпа (新派) / мурасаки-ха (紫派, «лиловая школа»): Курода, Кумэ,
//   Хакубакай 1896 года. Пленэр, лиловые тени, мазок виден.
//
// vl-0362 и vl-0364 — обе кюха. Гахо писал маслом в годы Кобу Бидзюцу Гакко,
// Рагуза Тама училась в Палермо у итальянских академистов. А yoga-browse
// на две трети состоял из мурасаки-ха: один Курода дал 131 работу. Отобрана
// была техника (масло), но не манера — а Чарли выбрал именно манеру.
//
// Мерой это не ловится. Мера «занятости» из detail-gate.mjs (доля пикселей
// с заметным переходом к соседу) на эталонах даёт 12.9 у Гахо и 27.4 у Рагузы,
// а у «Lakeside» Куроды — 12.8. То есть градиентная статистика не отличает
// слитную кладку от мелкой детали: у Рагузы в подоле и ласточках деталь
// частая, но мазка не видно. Поэтому здесь отбор по школе и глазами.
//
// Сюда же взяты Фонтанези и Уоргман — учителя, не японцы, но та же манера,
// и ёфуга (洋風га) эпохи Эдо: Сиба Кокан, Аодо Дэндзэн, Одано Наотакэ.
// Ёфуга гладкая до предела, но на Викискладе от неё лежат в основном гравюра,
// карты и ширмы — поэтому фильтр ниже жёстче, чем в nihonga-browse.

import { writeFileSync } from 'fs';

const OUT = 'research/kyuha-browse.html';
const UA = { 'User-Agent': 'tessarum-research/1.0 (samuel.faure.dev@gmail.com)' };
const API = 'https://commons.wikimedia.org/w/api.php?';

// Порог тот же, что в nihonga-browse.mjs: телефонная плита 1440 × 3120,
// всё выше 2400 лечится апскейлом внутри измеренного порога 1,7×.
const MIN_SIDE = 2400;

// Ширмы и свитки на телефон не встают. Отсекаем по пропорции: всё, что шире
// двух к одному, — не кадр, а панорама. Это снимает большую часть ёфуга.
const MAX_RATIO = 2.0;

// Имена и латиницей, и кандзи: на складе файлы подписаны и так, и так.
const SCHOOLS = [
  {
    school: 'Кюха — Кобу Бидзюцу Гакко и Мэйдзи Бидзюцукай',
    names: [
      ['Takahashi Yuichi', '高橋由一'], ['Goseda Horyu', '五姓田芳柳'],
      ['Goseda Yoshimatsu', '五姓田義松'], ['Yamamoto Hosui', '山本芳翠'],
      ['Harada Naojiro', '原田直次郎'], ['Hyakutake Kaneyuki', '百武兼行'],
      ['Ando Nakataro', '安藤仲太郎'], ['Honda Kinkichiro', '本多錦吉郎'],
      ['Koyama Shotaro', '小山正太郎'], ['Matsuoka Hisashi', '松岡寿'],
      ['Soyama Sachihiko', '曾山幸彦'], ['Kawakami Togai', '川上冬崖'],
      ['Kunisawa Shinkuro', '国沢新九郎'], ['Kawamura Kiyoo', '川村清雄'],
    ],
  },
  {
    school: 'Учителя',
    names: [['Antonio Fontanesi', ''], ['Charles Wirgman', '']],
  },
  {
    school: 'Рагуза Тама и Хасимото Гахо',
    names: [['Kiyohara Tama', 'ラグーザ玉'], ['Hashimoto Gaho', '橋本雅邦']],
  },
  {
    school: 'Ёфуга — западная манера эпохи Эдо',
    names: [
      ['Odano Naotake', '小田野直武'], ['Satake Shozan', '佐竹曙山'],
      ['Aodo Denzen', '亜欧堂田善'],
      // Сиба Кокан отсюда убран намеренно. По имени склад отдаёт 142 файла,
      // и живописи среди них единицы: остальное — «Тиккю дзэндзу» (карта мира)
      // из Библиотеки Конгресса, полистный «Гадзу сайютан» из Рейксмузея,
      // медные гравюры «Мимэгури-но кэй». Фильтр по имени тут бессилен — файлы
      // подписаны инвентарным номером, а не сюжетом, и отличить лист гравюры
      // от снимка картины по названию нельзя. Его живопись есть, но лежит
      // в музеях Кобэ и Акиты, а не на складе.
    ],
  },
];

// Не работы. К именам файлов Викисклада и только к ним: у ColBase заголовки
// другого рода, там этот фильтр ловил бы не то.
//
// Против nihonga-browse список длиннее на два разряда. Гравюра и карты — из-за
// ёфуга, где живописи на складе меньше, чем печати. Снимки — из-за Ёкоямы
// Мацусабуро, он был фотографом раньше, чем живописцем, и половина его файлов
// на складе это дагеротипы и виды с высоты.
const SKIP = new RegExp([
  'signature', 'seal', 'grave', 'tomb', 'stamp', 'postage', 'monument',
  'plaque', 'memorial', 'museum building', 'exhibition', 'photograph of',
  'banknote', 'coin',
  'woodblock', 'woodcut', 'print', 'nishiki', 'ukiyo', 'map of', 'chart',
  'calligraphy', 'letter', 'manuscript', 'book', 'page', 'diagram',
  'daguerreotype', 'ambrotype', 'photo', 'portrait photograph',
  'frame', 'box', 'label', 'copperplate', 'etching', 'engraving',
].map(s => `\\b${s}\\b`).join('|'), 'i');

// Второй фильтр, и он про другое. Первый читает слова; эти файлы слов не несут:
// «MET 2007 49 340 a 006», «LCCN2008660855», «NDL1309901», «RP-P-1956-648»,
// «btv1b105408221 (44 of 55)». Имя из инвентарного номера — признак не сюжета,
// а происхождения: так называют полистную оцифровку печатных собраний. Живопись
// в музейных файлах подписана словами, потому что снимок делали ради работы.
//
// Без него ёфуга давала 117 «работ» Сиба Кокана — и все до одной страницы книг,
// карты и гравюрные листы Библиотеки Конгресса, Рейксмузея и МЕТ.
// Третий фильтр, и он про имя, а не про файл. Фонтанези и Уоргман — не японцы,
// и их имена живут за пределами живописи: в Реджо-нель-Эмилии есть Пьяцца
// Фонтанези с памятником, а Уоргман издавал в Иокогаме журнал «The Japan Punch».
// Поиск по имени приносит снимки площади и полосы журнала вперемешку с работами.
// Отсюда список отказов, написанный ровно под эти два имени.
const NOT_ART = /\b(piazza|monumento|punch|photographic copy|fotoreproductie|ILN|CH-NB|grafiken)\b/i;

const SCAN_ID = /(MET|LCCN|NDL|LOC|RP-P|btv1b|bpt6k)[\s_-]?\d|\d{6,}|\(\d+ of \d+\)/i;

async function api(params) {
  const url = API + new URLSearchParams({ format: 'json', action: 'query', ...params });
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch(url, { headers: UA });
    if (r.ok) return r.json();
    await new Promise(res => setTimeout(res, 500 * (attempt + 1)));
  }
  throw new Error(`commons api failed: ${url}`);
}

const seen = new Set();
let cutSmall = 0, cutSkip = 0, cutWide = 0, cutDup = 0;

async function gather(rom, jp) {
  const titles = [];
  for (const term of [rom, jp].filter(Boolean)) {
    const d = await api({
      list: 'search', srsearch: `filetype:bitmap "${term}"`,
      srnamespace: '6', srlimit: '200', srprop: '',
    });
    titles.push(...(d.query?.search || []).map(x => x.title));
  }
  const uniq = [];
  for (const t of new Set(titles)) {
    if (seen.has(t)) { cutDup++; continue; }
    seen.add(t);
    uniq.push(t);
  }

  const files = [];
  for (let i = 0; i < uniq.length; i += 25) {
    const e = await api({
      prop: 'imageinfo', titles: uniq.slice(i, i + 25).join('|'),
      iiprop: 'size|url', iiurlwidth: '420',
    });
    for (const p of Object.values(e.query?.pages || {})) {
      const ii = p.imageinfo?.[0];
      if (!ii) continue;
      files.push({
        title: p.title.replace(/^File:/, ''),
        w: ii.width, h: ii.height, thumb: ii.thumburl, page: ii.descriptionurl,
      });
    }
  }

  const works = [];
  for (const f of files) {
    if (SKIP.test(f.title) || SCAN_ID.test(f.title) || NOT_ART.test(f.title)) { cutSkip++; continue; }
    if (Math.max(f.w, f.h) < MIN_SIDE) { cutSmall++; continue; }
    if (f.w / f.h > MAX_RATIO) { cutWide++; continue; }
    works.push(f);
  }
  works.sort((a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h));
  return { works, found: files.length };
}

const groups = [];
for (const g of SCHOOLS) {
  const sections = [];
  for (const [rom, jp] of g.names) {
    process.stdout.write(`${rom}… `);
    const { works, found } = await gather(rom, jp);
    console.log(`${found} файлов → ${works.length}`);
    if (works.length) sections.push({ name: rom + (jp ? ` / ${jp}` : ''), works, found });
  }
  if (sections.length) groups.push({ school: g.school, sections });
}

function card(f) {
  const long = Math.max(f.w, f.h);
  const phone = f.h >= 3120 ? ' · 📱' : '';
  const desk = long >= 3840 ? ' · 4K' : '';
  return `<figure>
  <label><input type="checkbox" class="pick" data-url="${f.page}"> ${f.w} × ${f.h}${phone}${desk}</label>
  <a href="${f.page}" target="_blank" rel="noreferrer"><img loading="lazy" src="${f.thumb}" alt=""></a>
  <figcaption>${f.title.replace(/\.[a-z]+$/i, '')}</figcaption>
</figure>`;
}

const kept = groups.reduce((n, g) => n + g.sections.reduce((m, s) => m + s.works.length, 0), 0);

const body = groups.map(g => `<h1 class="school">${g.school}</h1>
${g.sections.map(s => `<h2>${s.name} <small>${s.works.length} из ${s.found}</small></h2>
<div class="grid">
${s.works.map(card).join('\n')}
</div>`).join('\n<hr>\n')}`).join('\n');

const html = `<!doctype html>
<html lang="ru">
<head><meta charset="utf-8"><title>Кюха: старая школа японского масла</title>
<style>
  body { font-family: sans-serif; padding: 16px; max-width: 1600px; margin: 0 auto; }
  .grid { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-start; }
  figure { margin: 0; width: 420px; }
  figure img { max-width: 420px; max-height: 560px; display: block; background: #f2f2f2; }
  figcaption { font-size: .8em; color: #666; max-width: 420px; }
  label { display: block; font-size: .85em; cursor: pointer; }
  h1.school { margin-top: 48px; padding-top: 16px; border-top: 3px solid #333; }
  h2 small { font-weight: normal; color: #888; }
  #bar { position: sticky; top: 0; background: #fff; border-bottom: 1px solid #ccc; padding: 8px 0; z-index: 10; }
  #box { width: 100%; height: 80px; font-family: monospace; font-size: 12px; }
  .anchors { display: flex; gap: 16px; background: #f7f7f7; padding: 12px; }
  .anchors img { max-height: 300px; }
</style>
</head>
<body>
<div id="bar">
  <b>Отобрано (<span id="count">0</span>):</b><br>
  <textarea id="box" readonly placeholder="отмечайте работы — ссылки соберутся сюда"></textarea>
</div>
<h1>Кюха: старая школа японского масла</h1>

<div class="anchors">
  <figure><img src="https://colbase.nich.go.jp/media/tnm/A-10938/image/slideshow_s/A-10938_C0096955.jpg" alt="">
    <figcaption>vl-0362 — Хасимото Гахо</figcaption></figure>
  <figure><img src="https://colbase.nich.go.jp/media/tnm/A-11322/image/slideshow_s/A-11322_C0050822.jpg" alt="">
    <figcaption>vl-0364 — Рагуза Тама</figcaption></figure>
</div>

<p>Обе выбранные работы — кюха, «старая школа»: слитная кладка, мазка не видно,
рисунок жёсткий, фон — большое ровное поле. В 1893 году Курода Сэйки привёз
из Франции пленэр, и дальше японское масло идёт двумя партиями. Прошлый лист
(yoga-browse.html) отбирал по технике — «масло» — и на две трети оказался
лиловой школой, с мазком. Здесь отбор по манере.</p>

<p>${kept} работ, длинная сторона от ${MIN_SIDE} px. Отброшено: мелких ${cutSmall},
не-живописи ${cutSkip}, панорам шире ${MAX_RATIO}:1 — ${cutWide}, повторов ${cutDup}.
📱 — высота от 3120, 4K — длинная сторона от 3840.</p>

<p>Последний раздел, ёфуга эпохи Эдо, гладок сильнее всех, но на складе от него
лежит в основном гравюра и ширмы; после фильтра остаётся немного.</p>
${body}
<script>
const box = document.getElementById('box'), count = document.getElementById('count');
document.addEventListener('change', e => {
  if (!e.target.classList.contains('pick')) return;
  const picked = [...document.querySelectorAll('.pick:checked')].map(cb => cb.dataset.url);
  box.value = picked.join('\\n');
  count.textContent = picked.length;
});
</script>
</body>
</html>`;

writeFileSync(OUT, html);
console.log(`\nwrote ${OUT} — ${kept} работ`);
