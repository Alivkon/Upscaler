# Страницы для обхода: художники, страны, традиции, сюжеты

23.09.2026. Замысел, не реализация: код не тронут, кроме `<title>` указателя.
Обсуждено с Charlie по шагам, каждое решение ниже принято им.

## Цель

Понять, чем WallpaperCave берёт выдачу, и решить, сколько страниц сайт может
завести под поисковые фразы, не став фермой и не испортив тихий вид.

## Что измерено

**Выдача (поиск инструмента, США, не Google; частотность не мерена).**
На `classical paintings wallpapers`, `dark academia painting wallpaper`,
`oil painting phone wallpaper 4k`, `renaissance painting wallpaper iphone`
десятка целиком из складов: WallpaperCave, WallpaperAccess, wallpapers.com,
WallpaperSafari, WallpaperBat, плюс Pinterest, Etsy, стоки. У WallpaperCave
на одну тему по странице на каждую формулировку: `renaissance-iphone-wallpapers`
и `renaissance-art-wallpapers`, по 40 картинок, один загрузчик (штатный
`caveman`), ноль слов текста. Узкие слова слабее: на `vanitas painting
wallpaper` и `hudson river school wallpaper iphone` обойной страницы нет вовсе
(Etsy, Getty, Википедия, магазины постеров).

**Search Console, 23.09.**

| что | результат |
|---|---|
| показы с 01.08 | картинки 26, веб 22, переходов 0 |
| неделя 14–20.09 | картинки 0, веб 1 |
| `/` | в индексе, последний обход 30.08 |
| четыре темы `/collection/*` | «URL is unknown to Google» все четыре |
| работы, выборка 16 из 158 | в индексе 2, неизвестны 14 |
| карта сайта в Search Console | не была отправлена; Charlie отправил 23.09, Google скачал через 2 с, ошибок 0, 166 страниц и 948 картинок |

Интерфейс после отправки показывал «Couldn't fetch»; API в ту же минуту
отдавал `downloaded`, `errors 0`. Это задержка отображения, не отказ.

Узкое место сейчас не конкуренция, а обнаружение: Google не знает
большинства страниц.

**Подсказки Google** (`suggestqueries`, en-US; признак, что фразу набирают,
без чисел):

| есть обойное намерение | нет или чужое значение |
|---|---|
| Aivazovsky, Thomas Cole (с phone, iphone, 4k) | Kalf, Ottesen, Bertin, van Huysum, Gudin, Taikan |
| Bierstadt, Lorrain, Hammershøi, Audubon | `vanitas wallpaper`: персонаж Kingdom Hearts |
| Hudson River School, Dutch Golden Age, Dutch still life, Romanticism | `still life wallpaper`: Opeth, BIGBANG |
| landscape, flower (с iphone), still life, seascape painting | American, Danish, British painting |
| japanese painting / art (phone, iphone, 4k) | |
| french, dutch, russian, english painting: только голое `wallpaper` | |
| `dutch flower painting wallpaper` подсказка дописывает сама | |
| chinese, impressionist painting: сильно, но работ у нас 3 и около 1 | |

Самый частый у нас художник (Кальф, 11 работ) спроса не имеет вовсе.

## Решения

**Почему не как WallpaperCave.** Правило Google о дорвеях (spam policies,
«Doorway abuse»): «Creating substantially similar pages that are closer to
search results than a clearly defined, browseable hierarchy». Под него
подпадает страница на каждую формулировку, а не страница на каждую группу
работ. Одна страница и так ранжируется на все формулировки одного намерения.
Скрытость ссылок в правило не входит; прежнее «спрятанная страница = дорвей»
было ошибкой и снято в разговоре.

**Четыре вида страниц.**

| вид | как набирается | адрес | сейчас |
|---|---|---|---|
| художник | сам, из каталога, от 4 работ | `/artists/<имя>` | около 13 |
| страна | сам, по `origin`, от 4 работ; пропуск, если все работы одного художника | `/collection/<страна>-painting` | American 28, Dutch 28, Japanese 28, French 27, Danish 16, British 12; Russian (6, все Айвазовский) пропущен |
| традиция | список, выбран | `/collection/<имя>` | Hudson River School 20, Dutch Golden Age 20, Nihonga 16 |
| сюжет и настроение | список, выбран глазами | `/collection/<имя>` | сюжеты: landscape, flowers, still life, seascape (не отобраны); настроения: 3 темы как есть |

Правило разделения: факт набирает страницу сам, вкус выбирает человек.
Традиции исключение: их выбрал субагент по истории искусства, по поручению
Charlie (ниже).

**Порог 4 работы.** Страница из одной-двух работ повторяет страницу работы.
Счёт при этом не ранжирует (COLLECTIONS.md: 7 работ стояли выше склада на 288).

**Англия называется British.** Пять из двенадцати у Уилсона, он валлиец.
Названия стран (Netherlands → Dutch) лежат маленькой таблицей.

**Nihonga остаётся** традицией рядом с Japanese painting: адрес живой (самая
частая входная страница, 84 просмотра с 13.09, в основном iPhone без
реферера), определение слова никто, кроме нас, не даёт, а общие работы
ранжированию не мешают (COLLECTIONS.md, «Пересечение»).

**Пересечения, посчитанные.** Все 20 работ Hudson River School стоят
в American painting (28), все 20 Dutch Golden Age в Dutch painting (28).
По правилу COLLECTIONS.md это допустимо: имена разные и каждое верно.

**Dutch flower painting отложен.** Голландских цветов на витрине: 6 ван Хёйсума
и 1 Марсеус ван Схрик. Страница вышла бы страницей ван Хёйсума плюс одна
работа. Задача на добычу записана в `TODO.md` со списком художников.

**Страница художника.** `title` «Thomas Cole paintings as phone wallpapers»,
`h1` «Thomas Cole», затем этикетка «Thomas Cole (1801–1848), American painter»
(сверяется с Wikidata) и измеренная фраза: сколько работ, годы, музеи.
Биография не нужна: её не процитируют, она есть в Википедии. Этикетка нужна
для различения тёзок (Richard Wilson, Thomas Cole) и посетителю.

**Указатель.** Над сеткой ничего не меняется. Строка под сеткой становится
блоком с подписями:

```
Traditions   Hudson River School · Dutch Golden Age · Nihonga
Countries    American · British · Danish · Dutch · French · Japanese
Subjects     Landscape · Flowers · Still life · Seascape
Moods        Dark academia · Moody landscape · Cottagecore
Artists      Aivazovsky · Audubon · … · Wilson · All artists
```

Слово «collection» из подписей ссылок уходит (двенадцать раз подряд это шум),
заголовки самих страниц остаются. Художники по фамилии, по алфавиту;
«All artists» ведёт на `/artists` со всеми 76 именами и счётом, ссылки только
у тех, у кого есть страница. Рассылка, стоявшая справа от строки, уходит под
блок или встаёт рядом с его верхом.

**Страница работы.** Имя в подписи становится ссылкой, если у художника есть
страница. «More in the collection» становится «More by Thomas Cole». Строки
«More … phone wallpapers →» по одной на тему заменяются одной:
«In Hudson River School · Landscape · Moody landscape».

**Данные.** Файл художников по образцу `collections.js`: имя, адрес, этикетка,
все написания из `provenance.creator`. Это сводит «Yokoyama Taikan»
с «Yokoyama Taikan (1868-1958)» и не засчитывает «After Thomas Cole»
в работы Коула. `yarn verify` падает, если художник дорос до 4 работ,
а записи нет. Числа на страницах считаются из работ, как у тем сейчас.

## Выбор традиций

`research/hudson-river-school-collection-picks.json` и
`research/dutch-golden-age-collection-picks.json`, по 20 работ, все живые
(проверено по карте сайта). В каждом файле правило, причина по каждой работе
и спорные исключения.

- Hudson River School: Коул 6 (с копией Dream of Arcadia около 1863),
  Бирштадт 3, Кенсетт 2, Хазелтайн 2, Иннесс 2, Черч, Кропси, Гиффорд,
  Хед (Newbury Marshes), Данкансон. Вне: Rocky Mountain Sheep 1884, цветы Хеда.
- Dutch Golden Age: Кальф 12 (с мастерской копией), Марсеус ван Схрик 2,
  ван Бейерен, Рёйсдал, Вейнантс, де Витте, ван Алст, де Ринг. Вне: все шесть
  ван Хёйсума (XVIII век), Корте 1701 (легче всего вернуть), Мериан 1705.

## Что нашлось в каталоге попутно

- Даты-диапазоны жизни вместо даты картины (SMK): vl-0176, vl-0177, vl-0178.
- Нет даты: vl-0385, vl-0439, vl-0447, vl-0454.
- «Wikimedia Commons» вместо владельца у частных работ с аукционов:
  vl-0385, vl-0439, vl-0454.
- Теги: у Корте vl-0087 «bird» на картине с крыжовником; у vl-0037 «still»
  и «life» раздельно; «museum» (153) и «painting» (147) как страницы
  бесполезны.
- Годы жизни в имени у части японских художников.

## Сделано

- `pages.js:716`: `<title>` указателя `Tessarum, classical paintings as phone
  and 4K wallpapers` (было `…, phone and 4K desktop wallpapers at full
  resolution`). Nihonga и гравюры «classical» не вполне, Charlie счёл это
  допустимым. Проверено на локальном сервере, `yarn verify` 0. Не выложено.
- `TODO.md`: добыть голландские цветы и сделать страницу.

## Порядок работ

1. Художники, страны, блок под сеткой, ссылки на странице работы.
2. Традиции: записи из двух файлов выбора.
3. Сюжеты: листы отбора; перед этим проверить фразы в Keyword Planner.
4. Request indexing в Search Console для новых страниц.

## Ограничения

- Выдача снята поиском инструмента, не Google, из США, один раз.
- Подсказки Google показывают, что фразу набирают, но не сколько раз.
  Частотность может дать Keyword Planner (нужен вход Charlie).
- Пока Google не обходит внутренние страницы, новые страницы тоже будут
  стоять незамеченными; эффект мерить не раньше, чем через несколько недель
  после отправки карты.

## Источники

- Google, spam policies: https://developers.google.com/search/docs/essentials/spam-policies
- https://wallpapercave.com/renaissance-iphone-wallpapers,
  https://wallpapercave.com/renaissance-art-wallpapers
