// Тематические страницы: часть коллекции, а не отдельный сайт обоев.
//
// Как собрать новую — COLLECTIONS.md: что включать в `title`, `description`
// и абзац, чего не включать и почему. Здесь — только то, из чего страница
// собрана; там — правила, по которым её пишут.
//
// Зачем они вообще. Ассистент с доступом к поиску на «намеренный» запрос
// («dark academia wallpaper iphone») почти не возвращает редакционных обзоров:
// в выдаче стоят собственные тематические страницы складов, и цитируется с них
// не список файлов, а абзац над сеткой — собственная проза сайта. Замер:
// research/2026-08-24-geo-topic-pages.md, там же дословная цитата, по которой
// это видно. Отсюда устройство страницы, и каждое решение здесь оттуда.
//
// **Адрес — `/collection/<тема>`.** Указатель остаётся коллекцией целиком,
// тема — её частью; так устроены сайты музеев. Отдельно стоящая страница
// «Dark Academia Wallpapers» выглядит фермой при любом оформлении, и никакая
// вёрстка этого не исправляет.
//
// **`title` — слова вперёд, имя сайта прочь.** У указателя обратный порядок
// (`pages.js`, `collectionPage`): `Tessarum, phone and 4K…`. Здесь он неверен —
// «Tessarum» никто не набирает, а ранние слова весят больше и переживают
// обрезку в выдаче. Счёта в заголовке нет: ранжированию он ничего не даёт,
// а скобки вида `[800+]` — примета фермы.
//
// **`h1` — имя раздела, а не повтор запроса.** Стоял «Dark academia as phone
// wallpaper», то есть теми же словами, что `title`. Заменён на «Dark academia
// collection» сознательно и с известной ценой: Google подменяет заголовок
// в выдаче примерно у половины страниц и кандидата берёт чаще всего из `h1`,
// так что при подмене строка в выдаче останется без слова «wallpaper» —
// на запросе про обои. Взамен страница перестаёт называть себя дважды одним
// и тем же и читается как раздел собрания, чем она и является.
//
// Само слово при этом не потеряно нигде, кроме этого случая: оно стоит
// в `title`, в адресе, в описании и в первой же фразе абзаца под заголовком.
//
// Тем же `heading` подписана ссылка в ряду тем под сеткой указателя. Было там
// отдельное поле `nav` с короткой подписью («Dark academia»), и снято 24.08:
// ссылка ведёт на раздел, и назвать её стоит так же, как называет себя сам
// раздел, — «Dark academia collection». Заодно ушла разноголосица форм,
// из-за которой ряд стоял во множественном («Moody landscapes»), а страница,
// куда он вёл, — в единственном.
//
// На указателе `h1` нет вовсе и по обратной причине — там подменять нечем,
// и это записано у `collectionPage`.
//
// **`note` — то, что цитируют.** 50–60 слов, короткие повествовательные
// предложения, счёт первым, дальше характер подборки, происхождение и условия.
// Не украшать: цитируется простая фраза с числами и именами собственными.
//
// Все числа в абзац приходят замером, ни одного вписанного руками. Стоило это
// двух неправд сразу: «each … at 2160 × 3840» держалось на том, что 2160 × 3840
// — размер кадра 9:16 у полной плиты, а плиты такого размера нет у 24 работ
// из 53 (самая малая 1185 × 2106), и «cropped by hand» — на том, что кадры
// ставились руками, а поставлены они у 31 из 53. Обе фразы стояли в абзаце,
// написанном ровно затем, чтобы его процитировали дословно.
//
// **Абзац — этикетка у картины, а не витрина магазина (12.09).** Стояло
// «with the dark academia vibe» и «no account and no watermark». Второе было
// взято у wallpapers.com — ту фразу дословно повторили два ответа ассистента,
// — и это язык склада, а не собрания; «free, no account» и так стоит
// в `title`. Первое хеджировало анахронизм: картина 1630 года — не «dark
// academia», а выбранная под него. Теперь «chosen for dark academia» —
// это правда об отборе (ручной лист, `research/dark-academia-picks.json`).
// Что даёт и что отнимает снятая фраза при цитировании, не померено: сайт
// в ответах ассистентов не появлялся ни разу, терять нечего.
//
// **Условия — под сеткой, этикетка — над ней (13.09).** Абзац был один и
// кончался фразой про формат, размер и «free to download … no account».
// Это не этикетка, а условия выдачи, и над картинами они читались как
// витрина магазина: первое, что видел пришедший, — что бесплатно и без
// регистрации, а не что за картины. Теперь это поле `terms`, и стоит оно
// после сетки, перед ссылкой на указатель: человек читает его, досмотрев
// картинки, — там, где у музейной этикетки стоят условия. Для цитирования
// оно на странице по-прежнему: замер 24.08 видел абзац над сеткой, но
// положение он не выделял, цитировалась простая фраза с числами и условиями,
// а сайт в ответах ассистентов до 12.09 не появлялся вовсе — терять нечего.
// Первый переход с chatgpt.com пришёл 13.09 именно на dark academia, ещё
// с единым абзацем; сравнить после разделения будет с чем.
//
// Счёт в `terms` повторён нарочно: ассистент, отвечающий «где взять
// бесплатно», возьмёт этот абзац один, и без «all 43» в нём число осталось
// бы в другом. Оба числа — по-прежнему замером, как и в `note`.
//
// Набран абзац тем же приглушённым цветом, что `note`, и на кегль меньше —
// и это предел. Google рендерит страницу и «скрытым» считает текст, которого
// человек не видит: display none, нулевой кегль, вынесенный за экран, цвета
// фона. Читаемый серый абзац — не это; но `--fg-dim` на `--ground` даёт
// контраст около 4,6 : 1, то есть темнее уже нельзя. Курсива нет: у Sometype
// Mono загружены только веса 400–500, наклон браузер синтезировал бы сам.
//
// **Слово «background» стоит в тексте нарочно.** На Pinterest ищут им, а не
// словом «wallpaper». «Your background», а не «a background»: там, где текст
// обращается к читателю, безличный артикль звучит инструкцией.
//
// **«Wallpaper» — в абзаце, а не только в заголовке.** Абзац переписывался
// дважды, и в первый раз слово из него выпало вместе с неправдой про размер:
// осталось «cut to 9:16 for a phone screen», где нужного слова нет вовсе.
// После разделения 13.09 слово держал в `note` оборот «chosen as … phone
// wallpapers». 23.09 он снят у всех тем, кроме dark academia и cottagecore
// (там в нём слово запроса): Charlie заметил, что оборот обещает причину
// выбора и не называет её. Слово теперь держит строка `terms` («All N are
// phone wallpapers») прямо под сеткой, плюс `title` и `description`.
//
// **Про кадр в абзаце не говорится.** Стояло «cut to 9:16», и это отвечало
// на вопрос, которого читатель не задавал: кадрирована работа или она такая
// и есть. Пусть остаётся неизвестным — на странице работы «Uncropped» стоит
// рядом с кадрами, и кто спросит, тот увидит.
//
// `dark academia`, `brown aesthetic`, `old money` и `moody landscape` тянут
// из одного пула примерно в 40 работ, и это не препятствие: тема — другой
// ответ на другой запрос, а не другой набор картинок. Стояло здесь, что
// страницы на один пул «спорят между собой в одной выдаче»; это поверье,
// и снято 24.08 — Google схлопывает почти-дубликаты, спорящие за ОДИН
// запрос, а у тем разные заголовки, абзацы и адреса.
//
// Состав каждой темы — ручной отбор, а не правило по тегам. Отбор идёт листом
// с галочками (`.dasheet.mjs` → `.dasheet.html`), результат ложится сюда, а
// разбор того, что и почему снято, — в `research/dark-academia-picks.json`.
// Правило по тегам пробовалось и не годится: предварительный отбор по предмету
// и темноте дал 44 работы, из которых Charlie оставил 36, снял 8 и добавил 17 —
// в основном пейзажи с погодой вместо натюрмортов. Правило, ошибающееся
// на трети, дешевле заменить списком, чем чинить.

import { accession } from './public/record.js';

// Работы перечислены `ref`-ами, а не slug-ами: slug — адрес страницы работы,
// и он живёт в каталоге; здесь нужна сама работа, чем бы её страница ни
// называлась. Порядок в теме берётся из `catalogue/order.json`, как и на
// указателе, — развеска решена там один раз.
export const COLLECTIONS = [
  {
    slug: 'nihonga',
    // `kind` — строка, в которой тема стоит под сеткой указателя: традиция
    // (школа или движение), сюжет (что изображено) или настроение (подборка
    // глазами). `name` — её
    // подпись там и в строке «In …» на странице работы: слово «collection»,
    // повторённое двенадцать раз подряд, — шум, а заголовок самой страницы
    // (`heading`) его сохраняет.
    kind: 'tradition',
    name: 'Nihonga',
    // Единственная тема, чьё слово читателю незнакомо. «Dark academia» и
    // «moody landscape» объясняют себя сами, «nihonga» — нет, и отсюда одно
    // отличие в абзаце: слот «характер подборки» занят определением, а не
    // прилагательными. Ассистенту, которого спросили «что такое nihonga»,
    // цитировать сейчас нечего — тег на wallpaperflare путает слово с
    // «nihongo», японским языком. Быть страницей, где и определение,
    // и сами файлы, — сильнее любого набора эпитетов.
    // Тире здесь нет ни в одной строке, и это правка по замечанию 24.08.
    // У прежних двух тем оно стоит в `title` и в абзаце; здесь вместо него
    // двоеточие и точка. Заодно снята фраза `kept up against Western oil`:
    // читалась она как «сопротивлялись маслу», а сказать надо было, что
    // техника продолжилась после того, как масло приехало.
    title: 'Nihonga phone wallpapers: free, no account',
    heading: 'Nihonga collection',
    description:
      'Nihonga phone wallpaper from Japanese museum paintings: mineral pigment and ink on silk, Meiji and Taishō. Up to 2160 × 3840, free, no account.',
    note: ({ count }) =>
      `${count} nihonga paintings. Nihonga means mineral pigment and ` +
      'ink on silk, the Japanese way of painting that continued after Western oil reached Meiji ' +
      'Japan. By Yokoyama Taikan, Kobayashi Kokei and Yamamoto Shunkyo, from the Tokyo National ' +
      'Museum and other public collections.',
    terms: ({ count, full }) =>
      `All ${count} are phone wallpapers, ${full} of them at 2160 × 3840 or larger. Free to ` +
      'download and set as your background, no account needed.',
    // Отбор здесь не глазами, а по технике, и это единственная тема, где так
    // можно. «Нихонга» — не период и не манера: это минеральная краска и тушь
    // по шёлку в отличие от привезённого масла, и музей пишет технику в поле
    // (`hinshitu_keijo` в ColBase, `technique` в Кливленде). Спрашивать глаз
    // не о чем — слово либо верно для работы, либо нет.
    //
    // Из двадцати двух японских работ 1880–1920-х снято восемь, все по технике:
    //
    // - масло на холсте, то есть ёга, обратная сторона того же раскола —
    //   vl-0361, vl-0362, vl-0363, vl-0364, vl-0369. Замерено по ColBase,
    //   не предположено: vl-0361 и vl-0363 выглядят нихонга и не являются им;
    // - ксилография Киётики — vl-0393, vl-0394, vl-0395. Гравюра режется
    //   резчиком и печатается печатником, это не живопись вовсе.
    //
    // Все восемь остаются на витрине и в других темах (vl-0363 стоит
    // в moody landscape). Тема — другой ответ на другой запрос, а не
    // приговор работе.
    //
    // vl-0392 — золотая ширма с вороном, дата и автор неизвестны. Оставлена:
    // абзац не утверждает про работы ни даты, ни авторства сверх трёх
    // названных имён, и проверять ему нечего.
    //
    // ТРИ ИМЕНИ В АБЗАЦЕ — ПО ВЕСУ, И ВЕС ПЕРЕСЧИТЫВАЕТСЯ ПРИ КАЖДОМ
    // ПОПОЛНЕНИИ. Стояло «Yokoyama Taikan, Kobayashi Kokei and Shimomura
    // Kanzan»; с приходом vl-0397 и vl-0398 Кандзан съехал на четвёртое
    // место с одной работой, а Ямамото Сюнкё встал на третье с двумя.
    // Это ровно та ошибка, о которой предупреждает COLLECTIONS.md на примере
    // «dim rooms»: за словом стояли две работы из 43, и шло оно первым.
    // Счёт — `node -e` по `provenance.creator` тех же refs, что ниже:
    // Тайкан 5, Кокэй 3, Сюнкё 2, дальше по одной.
    refs: [
      'vl-0157',
      'vl-0359',
      'vl-0360',
      'vl-0365',
      'vl-0366',
      'vl-0367',
      'vl-0368',
      'vl-0370',
      'vl-0388',
      'vl-0389',
      'vl-0390',
      'vl-0391',
      'vl-0392',
      'vl-0396',
      'vl-0397',
      'vl-0398'
    ]
  },
  {
    slug: 'hudson-river-school',
    kind: 'tradition',
    name: 'Hudson River School',
    // Состав выбран не глазами, а по истории искусства: художник и годы,
    // не сюжет. Кто решал, почему по каждой работе и кого оставили за бортом
    // (Rocky Mountain Sheep 1884, цветы Хеда) —
    // research/hudson-river-school-collection-picks.json.
    //
    // Годы в абзаце — крайние даты этих двадцати, сверенные по каталогу:
    // 1828 (Коул, два Эдема) и 1871 (Хед). Имена по весу: Коул 5 (и копия),
    // Бирштадт 3, дальше по 2 у Кенсетта, Хазелтайна, Иннесса. Кливленд —
    // 11 из 20; у двух держатель не назван («Wikimedia Commons»), поэтому
    // «most», а не «from museum collections».
    //
    // «American Romanticism» — второе имя той же школы, один раз и фразой:
    // «american romanticism painting» Google подсказывает сам, а «…wallpaper»
    // нет, то есть ищут термин, и абзац связывает с ним страницу. Романтизм
    // целиком (Фридрих, Тёрнер, Айвазовский) — другой запрос и другая
    // страница, не эта (TODO.md).
    title: 'Hudson River School phone wallpapers: free, no account',
    heading: 'Hudson River School collection',
    description:
      'Hudson River School phone wallpaper: Thomas Cole, Albert Bierstadt and other American landscape painters, 1828 to 1871. Free, no account.',
    note: ({ count }) =>
      `${count} paintings of the Hudson River School, the landscape painters of American ` +
      'Romanticism. Painted between 1828 and 1871, by Thomas ' +
      'Cole, Albert Bierstadt, John Frederick Kensett and others. Most are from the Cleveland ' +
      'Museum of Art.',
    terms: ({ count, full }) =>
      `All ${count} are phone wallpapers, ${full} of them at 2160 × 3840 or larger. Free to ` +
      'download and set as your background, no account needed.',
    refs: [
      'vl-0355',
      'vl-0354',
      'vl-0358',
      'vl-0461',
      'vl-0043',
      'vl-0046',
      'vl-0045',
      'vl-0465',
      'vl-0054',
      'vl-0297',
      'vl-0460',
      'vl-0350',
      'vl-0042',
      'vl-0053',
      'vl-0047',
      'vl-0057',
      'vl-0466',
      'vl-0463',
      'vl-0357',
      'vl-0464'
    ]
  },
  {
    slug: 'dutch-golden-age',
    kind: 'tradition',
    name: 'Dutch Golden Age',
    // Выбран по истории искусства, до 1700 года. Ван Хёйсум (род. 1682) сюда
    // не входит, он живописец XVIII века; Корте 1701 — спорный, легче всего
    // вернуть. Разбор — research/dutch-golden-age-collection-picks.json.
    //
    // Годов в абзаце нет нарочно: у трёх работ даты нет, у двух стоят годы
    // жизни художника (vl-0176, vl-0177). Натюрмортов 17 из 20 (с двумя
    // «лесными подстилками» Марсеуса), пейзажей два, церковь одна. Имена по
    // весу: Кальф 11 (и копия), Марсеус 2, дальше по одной. Музеи тоже по весу:
    // Кливленд 4, SMK 4, остальные по одной; у четырёх держатель не назван,
    // поэтому «other collections», а не «museums».
    title: 'Dutch Golden Age phone wallpapers: free, no account',
    heading: 'Dutch Golden Age collection',
    description:
      'Dutch Golden Age painting as phone wallpaper: still life by Willem Kalf, landscapes and a church interior. Free, no account.',
    note: ({ count }) =>
      `${count} paintings from the Dutch Golden Age, the seventeenth century of painting in the ` +
      'Dutch Republic. Mostly Dutch still life, by Willem Kalf, Otto Marseus ' +
      'van Schrieck and others, from the Cleveland Museum of Art, the National Gallery of Denmark ' +
      'and other collections.',
    terms: ({ count, full }) =>
      `All ${count} are phone wallpapers, ${full} of them at 2160 × 3840 or larger. Free to ` +
      'download and set as your background, no account needed.',
    refs: [
      'vl-0086',
      'vl-0038',
      'vl-0485',
      'vl-0445',
      'vl-0428',
      'vl-0349',
      'vl-0037',
      'vl-0176',
      'vl-0454',
      'vl-0420',
      'vl-0421',
      'vl-0437',
      'vl-0423',
      'vl-0177',
      'vl-0429',
      'vl-0442',
      'vl-0419',
      'vl-0385',
      'vl-0439',
      'vl-0447'
    ]
  },
  // Сюжеты. Состав выбран глазами, не текстом каталога: Sonnet посмотрел на
  // каждую живую работу целиком (research/2026-09-23-visual-subject-tags.json),
  // Charlie прошёл его подсказки на листе кадров (.subjectsheet.mjs) и поправил
  // по 3–5 работ в каждом сюжете; его выбор — research/2026-09-23-subject-picks-charlie.txt.
  // Имена, страны и музеи в абзацах — по весу, пересчитаны по этим refs.
  {
    slug: 'landscape-painting',
    kind: 'subject',
    name: 'Landscape',
    // Годы — крайние даты всех 69, сверенные по каталогу: Лоррен, начало
    // 1640-х (vl-0065), и Ямамото Сюнкё, 1933 (vl-0398); без даты две работы
    // Бертена (1767–1842), внутри рамки. Страны: Франция 20, Америка 16,
    // Англия 11, Япония 9. Имена: Бертен 7, Уилсон 5, Лоррен 5.
    title: 'Landscape painting phone wallpapers: free, no account',
    heading: 'Landscape painting',
    description:
      'Landscape painting as phone wallpaper: Jean-Victor Bertin, Richard Wilson, Claude Lorrain and the Hudson River School. Free, no account.',
    note: ({ count }) =>
      `${count} French, American, British and Japanese landscapes, ` +
      'painted between the 1640s and the 1930s. By Jean-Victor Bertin, Richard Wilson, Claude ' +
      'Lorrain and others, from the Cleveland Museum of Art and other collections.',
    terms: ({ count, full }) =>
      `All ${count} are phone wallpapers, ${full} of them at 2160 × 3840 or larger. Free to ` +
      'download and set as your background, no account needed.',
    refs: [
      'vl-0366',
      'vl-0390',
      'vl-0388',
      'vl-0389',
      'vl-0360',
      'vl-0398',
      'vl-0376',
      'vl-0336',
      'vl-0236',
      'vl-0375',
      'vl-0357',
      'vl-0408',
      'vl-0350',
      'vl-0384',
      'vl-0259',
      'vl-0297',
      'vl-0057',
      'vl-0265',
      'vl-0358',
      'vl-0069',
      'vl-0045',
      'vl-0298',
      'vl-0280',
      'vl-0371',
      'vl-0042',
      'vl-0230',
      'vl-0374',
      'vl-0354',
      'vl-0319',
      'vl-0465',
      'vl-0372',
      'vl-0064',
      'vl-0381',
      'vl-0240',
      'vl-0047',
      'vl-0386',
      'vl-0299',
      'vl-0063',
      'vl-0281',
      'vl-0473',
      'vl-0065',
      'vl-0308',
      'vl-0067',
      'vl-0318',
      'vl-0174',
      'vl-0301',
      'vl-0279',
      'vl-0461',
      'vl-0382',
      'vl-0038',
      'vl-0383',
      'vl-0054',
      'vl-0417',
      'vl-0179',
      'vl-0060',
      'vl-0377',
      'vl-0043',
      'vl-0352',
      'vl-0086',
      'vl-0378',
      'vl-0353',
      'vl-0397',
      'vl-0324',
      'vl-0355',
      'vl-0053',
      'vl-0369',
      'vl-0261',
      'vl-0464',
      'vl-0373'
    ]
  },
  {
    slug: 'flower-painting',
    kind: 'subject',
    name: 'Flowers',
    // Нидерланды 9 и Дания 8 из 26, отсюда «mostly Danish and Dutch». Имена:
    // Оттесен 8, ван Хёйсум 5, Одюбон 3 (птицы среди цветов — выбор Charlie).
    title: 'Flower painting phone wallpapers: free, no account',
    heading: 'Flower painting',
    description:
      'Flower painting as phone wallpaper: Otto Didrik Ottesen, Jan van Huysum, John James Audubon and others. Free, no account.',
    note: ({ count }) =>
      `${count} works with flowers as their subject. Mostly Danish ` +
      "and Dutch, by Otto Didrik Ottesen and Jan van Huysum, with Audubon's birds among blossoms " +
      'and Japanese painting.',
    terms: ({ count, full }) =>
      `All ${count} are phone wallpapers, ${full} of them at 2160 × 3840 or larger. Free to ` +
      'download and set as your background, no account needed.',
    refs: [
      'vl-0391',
      'vl-0026',
      'vl-0028',
      'vl-0032',
      'vl-0027',
      'vl-0364',
      'vl-0356',
      'vl-0380',
      'vl-0343',
      'vl-0216',
      'vl-0456',
      'vl-0178',
      'vl-0446',
      'vl-0440',
      'vl-0252',
      'vl-0275',
      'vl-0385',
      'vl-0177',
      'vl-0455',
      'vl-0453',
      'vl-0451',
      'vl-0221',
      'vl-0369',
      'vl-0176',
      'vl-0457',
      'vl-0452'
    ]
  },
  {
    slug: 'still-life-painting',
    kind: 'subject',
    name: 'Still life',
    // Нидерланды 24 из 35. Имена: Кальф 11 (с копией), Оттесен 7, ван Хёйсум 6.
    title: 'Still life painting phone wallpapers: free, no account',
    heading: 'Still life painting',
    description:
      'Still life painting as phone wallpaper: Willem Kalf, Otto Didrik Ottesen, Jan van Huysum and others. Free, no account.',
    note: ({ count }) =>
      `${count} still lifes. Mostly Dutch: silver, glass and fruit ` +
      'by Willem Kalf, flowers by Jan van Huysum. With Danish flower and fruit pieces by Otto ' +
      'Didrik Ottesen and others.',
    terms: ({ count, full }) =>
      `All ${count} are phone wallpapers, ${full} of them at 2160 × 3840 or larger. Free to ` +
      'download and set as your background, no account needed.',
    refs: [
      'vl-0030',
      'vl-0253',
      'vl-0447',
      'vl-0439',
      'vl-0380',
      'vl-0343',
      'vl-0216',
      'vl-0178',
      'vl-0446',
      'vl-0252',
      'vl-0275',
      'vl-0385',
      'vl-0177',
      'vl-0419',
      'vl-0455',
      'vl-0454',
      'vl-0453',
      'vl-0451',
      'vl-0221',
      'vl-0087',
      'vl-0052',
      'vl-0176',
      'vl-0037',
      'vl-0457',
      'vl-0423',
      'vl-0444',
      'vl-0452',
      'vl-0442',
      'vl-0421',
      'vl-0420',
      'vl-0429',
      'vl-0485',
      'vl-0428',
      'vl-0437',
      'vl-0445'
    ]
  },
  {
    slug: 'ocean-painting',
    kind: 'subject',
    name: 'Ocean',
    // «Ocean», а не «seascape»: «ocean painting wallpaper» Google дописывает
    // до ocean art, beach, waves, а «seascape painting wallpaper» — только до
    // «what is seascape painting». «Seascapes» стоит в абзаце вторым именем,
    // один раз. Страны: Франция, Япония, Россия, Америка по 5–6; музеи:
    // Кливленд 6, Токийский национальный 5. Имена: Айвазовский 5, Гюден 4.
    title: 'Ocean painting phone wallpapers: free, no account',
    heading: 'Ocean painting',
    description:
      'Ocean painting as phone wallpaper: storms at sea by Ivan Aivazovsky and Théodore Gudin, coasts and calm bays. Free, no account.',
    note: ({ count }) =>
      `${count} seascapes: storms, waves and ships at sea, coasts ` +
      'and calm bays. By Ivan Aivazovsky, Théodore Gudin and others, from the Cleveland Museum ' +
      'of Art, the Tokyo National Museum and other collections.',
    terms: ({ count, full }) =>
      `All ${count} are phone wallpapers, ${full} of them at 2160 × 3840 or larger. Free to ` +
      'download and set as your background, no account needed.',
    refs: [
      'vl-0362',
      'vl-0361',
      'vl-0476',
      'vl-0370',
      'vl-0364',
      'vl-0236',
      'vl-0357',
      'vl-0408',
      'vl-0057',
      'vl-0468',
      'vl-0474',
      'vl-0467',
      'vl-0466',
      'vl-0418',
      'vl-0475',
      'vl-0046',
      'vl-0407',
      'vl-0363',
      'vl-0054',
      'vl-0352',
      'vl-0412'
    ]
  },
  {
    slug: 'moody-landscape',
    kind: 'mood',
    name: 'Moody landscape',
    title: 'Moody landscape phone wallpapers — free, no account',
    heading: 'Moody landscape collection',
    description:
      'Moody landscape phone wallpaper from museum painting — storms, gloom and dark weather. Up to 2160 × 3840, free, no account.',
    note: ({ count }) =>
      `${count} landscape paintings with the weather in them: ` +
      'a thunderstorm coming on, Vesuvius at midnight, rain over the mountains, a ruin above a dark ' +
      'sea. Painted between 1660 and 1893, mostly from the Cleveland Museum of Art.',
    terms: ({ count, full }) =>
      `All ${count} are phone wallpapers at 9:16, ${full} of them at 2160 × 3840 or larger. Free to ` +
      'download and set as your background, no account needed.',
    // Работ мало и это нарочно: пейзажей в коллекции 79, но по-настоящему
    // сумрачных среди них четырнадцать, а страница из светлых пейзажей под
    // словом «moody» — обещание, которого сетка не выполняет. Счёт странице
    // не вредит: по замеру выдачи страница на 7 обоев стояла выше страницы
    // на 288, ранжирует совпадение заголовка, а не длина списка.
    //
    // Одиннадцать из четырнадцати стоят и в dark academia, и страница вышла
    // всё равно. Совпадают у тем картинки, не текст, а картинки ранжируются
    // страницей работы, которой ни одна тема не владеет.
    refs: [
      'vl-0226',
      'vl-0353',
      'vl-0355',
      'vl-0377',
      'vl-0086',
      'vl-0043',
      'vl-0324',
      'vl-0179',
      'vl-0363',
      'vl-0064',
      'vl-0240',
      'vl-0308',
      'vl-0063',
      'vl-0354'
    ]
  },
  {
    slug: 'dark-academia',
    kind: 'mood',
    name: 'Dark academia',
    title: 'Dark academia phone wallpapers — free, no account',
    heading: 'Dark academia collection',
    // Описание отвечает за строку под заголовком в выдаче. Оно короче `note`
    // и кончается на условиях: обрежут его примерно на 155 знаках, и то, что
    // стоит после, читатель не увидит.
    description:
      'Dark academia phone wallpaper from museum oil paintings — ruins, storms, forest gloom, still life. Up to 2160 × 3840, free, no account.',
    note: ({ count }) =>
      `${count} museum paintings chosen as dark academia phone wallpapers: ruins and antiquity, ` +
      'dark still life, storms and night. Painted between 1630 and 1909, from the Cleveland Museum ' +
      'of Art, the SMK in Copenhagen and other public collections.',
    terms: ({ count, full }) =>
      `All ${count} are phone wallpapers at 9:16, ${full} of them at 2160 × 3840 or larger. Free to ` +
      'download and set as your background, no account needed.',
    refs: [
      'vl-0052',
      'vl-0175',
      'vl-0176',
      'vl-0221',
      'vl-0261',
      'vl-0226',
      'vl-0177',
      'vl-0353',
      'vl-0275',
      'vl-0252',
      'vl-0087',
      'vl-0385',
      'vl-0355',
      'vl-0178',
      'vl-0377',
      'vl-0216',
      'vl-0043',
      'vl-0324',
      'vl-0036',
      'vl-0060',
      'vl-0253',
      'vl-0064',
      'vl-0280',
      'vl-0067',
      'vl-0349',
      'vl-0386',
      'vl-0038',
      'vl-0382',
      'vl-0318',
      'vl-0369',
      'vl-0363',
      'vl-0361',
      'vl-0279',
      'vl-0084',
      'vl-0240',
      'vl-0298',
      'vl-0308',
      'vl-0030',
      'vl-0356',
      'vl-0374',
      'vl-0319',
      'vl-0375',
      'vl-0336'
    ]
  },
  {
    slug: 'cottagecore',
    kind: 'mood',
    name: 'Cottagecore',
    // Самая сильная из новых тем по замеру спроса
    // (research/2026-09-20-collection-demand.md): у wallpapers.com 600+ работ
    // против 300+ у dark academia, то есть категория больше той, что уже
    // привела сюда посетителей из ChatGPT. Доказательство косвенное — чисел
    // по запросам не публикует никто, — но косвенное одинаково для всех тем,
    // а эта по нему первая.
    //
    // Лежит там при этом фотография домиков и рисованные кружки; живопись под
    // тем же словом — другое предложение, а не двухсотый повтор уже сказанного.
    //
    // Пересечение с dark academia и moody landscape есть (vl-0064, vl-0240,
    // vl-0308, vl-0353 и ещё несколько) и препятствием не является: тот же
    // довод, что у moody landscape выше — тема отвечает на другой запрос,
    // а картинки ранжируются страницей работы, которой ни одна тема не владеет.
    // Тире нет ни в одной строке, как у nihonga: в `title` и в абзаце
    // вместо него двоеточие и точка.
    title: 'Cottagecore phone wallpapers: free, no account',
    heading: 'Cottagecore collection',
    description:
      'Cottagecore phone wallpaper from museum paintings: sheep in meadows, wildflowers, green river banks. Up to 2160 × 3840, free, no account.',
    // Абзац написан по картинкам, а не по записям каталога: каталог называет
    // vl-0047 «dark moody American painting», а на кадре овцы на лугу и
    // мальчик в траве. Перечисление — по весу, и вес считан глазом по всем
    // 26 телефонным кадрам: пастбища со скотом (vl-0047, vl-0375, vl-0308,
    // vl-0301, vl-0376) — пять работ, птицы и цветы вблизи (vl-0026, vl-0027,
    // vl-0028, vl-0032, vl-0440) — пять, зелёные берега и опушки — самая
    // большая группа. Мельница в перечне не названа: Charlie убрал её
    // и слова «drawn close up» 20.09, фраза короче.
    //
    // «Chosen as», а не «paintings of»: у vl-0063 и vl-0236 нет ни овец,
    // ни цветов — это открытая равнина под тяжёлым небом, — и утверждение
    // о каждой работе было бы неправдой. Утверждение об отборе правдиво.
    note: ({ count }) =>
      `${count} museum paintings chosen as cottagecore phone wallpapers: sheep grazing in meadows, ` +
      'birds and wildflowers, green river banks. Painted ' +
      'between 1640 and 1871, from the Cleveland Museum of Art and other public collections.',
    // Годы — крайние из `provenance.date` тех же refs (vl-0065, «early 1640s»,
    // и vl-0297, 1871). У vl-0280, vl-0281 и vl-0440 даты в записи нет вовсе,
    // и «between» это выдерживает: фраза называет промежуток, а не утверждает,
    // что дата известна у каждой.
    //
    // Музей назван один, а не два, как у dark academia: Кливленд стоит
    // в `credit` у десяти работ из 26; следом «University of Pittsburgh» с тремя
    // одюбоновскими листами, а у остальных в `credit` стоит Wikimedia Commons,
    // то есть источник файла, а не держатель. Второе имя пришлось бы брать
    // либо у трёх листов одной книги, либо из имени файла на Викискладе.
    terms: ({ count, full }) =>
      `All ${count} are phone wallpapers at 9:16, ${full} of them at 2160 × 3840 or larger. Free to ` +
      'download and set as your background, no account needed.',
    // Порядок — тот, в котором Charlie отмечал работы на листе
    // (`.theme-sheet-all.html`, результат в
    // research/2026-09-20-theme-picks-charlie.txt), и он здесь ни на что
    // не влияет: на странице развеска приходит из `catalogue/order.json`.
    // Сохранён, чтобы список можно было сверить с листом строка в строку.
    //
    // Отбор — глазами и только глазами. Машинный тег по тексту каталога
    // разошёлся с глазом сильно: по light academia он нашёл 4 cottagecore
    // там, где Charlie на тех же плитках увидел в основном cottagecore
    // (research/2026-09-20-visual-theme-tags.md). Поэтому здесь стоит его
    // список, а не пересечение с тегами.
    refs: [
      'vl-0026',
      'vl-0028',
      'vl-0032',
      'vl-0027',
      'vl-0376',
      'vl-0236',
      'vl-0375',
      'vl-0297',
      'vl-0265',
      'vl-0298',
      'vl-0280',
      'vl-0319',
      'vl-0064',
      'vl-0240',
      'vl-0047',
      'vl-0299',
      'vl-0063',
      'vl-0281',
      'vl-0065',
      'vl-0308',
      'vl-0301',
      'vl-0038',
      'vl-0086',
      'vl-0440',
      'vl-0353',
      'vl-0053'
    ]
  }
];

// Работы темы в порядке указателя. Скрытые сюда не доходят: фильтр стоит
// на выдаче (`server.js`, `shown`), и список приходит уже без них — работа,
// снятая с витрины, не должна возвращаться на неё через тему.
//
// Отсутствующий `ref` молча пропускается, а не роняет страницу: список
// правится руками, и опечатка в нём стоит одной работы, а не всего адреса.
// Найти её можно `yarn verify` — `verify-catalogue.mjs` проверяет, что каждый
// `ref` темы есть в каталоге и показывается.
// `item.ref` на выходе галереи — инвентарный номер вида `TS·0373`, а не
// каталожный `vl-0373`: префикс идёт от имени сайта и живёт в `public/record.js`.
// Поэтому список переводится в номера тем же `accession`, а не разбирается
// обратно: обратной функции нет — `workRef` считает номер присланной работы
// хешем строки и на готовом номере даёт мусор.
// Что о теме можно сказать числом. Считается по тем же работам, которые тема
// показывает, и подставляется в абзац: число, посчитанное здесь, не может
// разойтись с сеткой под ним, а вписанное руками расходится молча и незаметно.
//
// `full` — сколько кадров темы дотягивают до 2160 × 3840, размера кадра 9:16
// у плиты в 4K. Общего размера у темы нет и быть не может: кадр режется от
// плиты, плиты у работ разные (в dark academia от 1185 × 2106 до 2940 × 5227),
// и любая фраза вида «each at 2160 × 3840» неправдива по построению. Счёт же
// правдив и проверяем — а проверяемое число ради того в абзаце и стоит.
export const PHONE_FRAME = { width: 2160, height: 3840 };

export const measure = items => {
  const frames = items.map(item => item.crops?.tall || item.crops?.phone || item);
  return {
    count: items.length,
    full: frames.filter(frame => frame.width >= PHONE_FRAME.width && frame.height >= PHONE_FRAME.height).length
  };
};

export const worksOf = (topic, items) => {
  const wanted = new Set(topic.refs.map(accession));
  return items.filter(item => wanted.has(item.ref));
};
