# Четвёртая тема: ancient ruins

20 сентября 2026

## Цель

Добавить четвёртую тематическую страницу — античные руины — тем же способом,
каким сделаны три прежние: одна запись в `COLLECTIONS` (`collections.js`),
всё остальное (маршрут, ряд ссылок под сеткой указателя, строка на странице
работы, карта сайта, проверка `yarn verify`) появляется из неё само.

## Решения

**Слово — `ancient ruins`, адрес `/collection/ancient-ruins`.** Спрос померен
косвенно (`research/2026-09-20-collection-demand.md`): у WallpaperAccess две
почти равные страницы, «Ancient Ruins» на 44 и «Roman Ruins» на 43; прямых
чисел по запросам не даёт ни один источник. Взято более широкое из двух,
потому что половина подборки — не Рим: воображённый город Коула, храм
Уилсона, аркадская копия. Слово обязано отвечать за все двенадцать работ.

Слабость спроса не довод против: по COLLECTIONS.md выбирают не по свободе
выдачи, а по честности слова, и страница на 7 обоев уже стояла в выдаче выше
склада на 288. Отдельно в пользу темы то, что на складах под этим словом лежит
почти сплошь фотография настоящих руин — живопись там другое предложение,
а не двухсотый повтор.

**Пересечение с dark academia — восемь работ из двенадцати.** Решение Charlie:
это допустимо. Тот же довод записан у `moody-landscape`, вышедшей
с одиннадцатью общими из четырнадцати: тема отвечает на другой запрос, общие
картинки ранжируются страницей работы, которой тема не владеет.

**Двенадцать работ, страница длиннее десяти тоже допустима** — решение Charlie.

**Тире в видимом тексте нет ни одного.** У `dark-academia` и `moody-landscape`
оно стоит в `title`, но правка 24.08 у `nihonga` уже заменила его двоеточием;
взят этот образец. Вопросительных форм и рекламных слов в тексте нет.

## Двенадцать работ

Список из `research/2026-09-20-collection-candidates.md`, раздел 3:
семь «sure» и пять «maybe», все двенадцать. Проверено против `galleryItems()`:
ни одна не `hidden`, у всех есть файлы и кадр 9:16 (`crops.phone`/`crops.tall`).

| ref | работа | автор | год | музей | кадр 9:16 |
| --- | --- | --- | --- | --- | --- |
| vl-0036 | Interior of the Pantheon, Rome | Giovanni Paolo Panini | 1747 | Cleveland | 1913 × 3400 |
| vl-0060 | Ruins of an Ancient City | John Martin | c. 1810–20 | Cleveland | 2160 × 3840 |
| vl-0064 | The Waterfalls at Tivoli | Claude-Joseph Vernet | 1737 | Cleveland | 2152 × 3825 |
| vl-0067 | An Aqueduct Near a Fortress | Jean-Victor Bertin | 1807 | Cleveland | 2160 × 3840 |
| vl-0226 | Ruin by the Sea | Arnold Böcklin | 1881 | Cleveland | 2940 × 5227 |
| vl-0261 | Roman Landscape | Arnold Böcklin | 1852 | Wikimedia Commons | 2104 × 3740 |
| vl-0301 | Landscape with a Column and Figure | Claude Lorrain | 1650 | Wikimedia Commons | 2160 × 3840 |
| vl-0336 | View of Tivoli: the Cascatelle… | Richard Wilson | 1752 | Wikimedia Commons | 2027 × 3603 |
| vl-0386 | Meleager and Atalanta | Richard Wilson | c. 1770 | Wikimedia Commons | 2160 × 3840 |
| vl-0460 | The Course of Empire: Destruction | Thomas Cole | 1836 | New-York Historical Society | 2139 × 3802 |
| vl-0463 | The Architect's Dream | Thomas Cole | 1840 | Toledo | 2160 × 3840 |
| vl-0464 | Dream of Arcadia (копия) | после Thomas Cole | c. 1863 | Indianapolis | 2003 × 3560 |

«Maybe» — пять: vl-0226, vl-0386, vl-0460, vl-0463, vl-0464. У них руина
выведена из соседних слов записи, а не названа прямо.

Порядок в списке — по возрастанию `ref`, чтобы править его руками. На саму
страницу он не влияет: развеска берётся из `catalogue/order.json`, как
и на указателе.

## Текст

Числа в абзацах не вписаны, а посчитаны `measure()` по тем же работам, что
стоят под ними, — 12 и 6.

- `title` — `Ancient ruins phone wallpapers: free, no account`
- `heading` — `Ancient ruins collection`
- `description` (138 знаков, под порогом обрезки в 155) — `Ancient ruins phone
  wallpaper from museum paintings: the Pantheon, Tivoli, temples and fallen
  cities. Up to 2160 × 3840, free, no account.`
- `note` — `12 museum paintings chosen as ancient ruins phone wallpapers: the
  Pantheon and a Roman aqueduct, temples and broken columns, the waterfalls at
  Tivoli, whole cities left in ruin. Painted between 1650 and 1881, from the
  Cleveland Museum of Art and other public collections.`
- `terms` — как у трёх прежних тем, слово в слово.

Что чем проверено:

- **«chosen as», а не «paintings of»** — у vl-0261 руины нет вовсе, это римский
  пейзаж с грозой. Утверждение о каждой работе было бы неправдой, утверждение
  об отборе правдиво. Тот же приём, что у dark academia с 12.09.
- **Перечисление по весу** (правило COLLECTIONS.md про «dim rooms»): храмы
  и колонны — четыре работы, разрушенные города — три, Тиволи — две, акведук
  один, и он поэтому в единственном числе.
- **1650 и 1881** — самая ранняя (vl-0301) и самая поздняя (vl-0226) даты
  из двенадцати записей.
- **Назван один музей, а не два.** Кливленд держит пять работ из двенадцати;
  у Толидо, Индианаполиса и Нью-Йоркского исторического по одной, четыре
  работы пришли с Wikimedia Commons, а это не музей. Второе имя пришлось бы
  выбирать из равных, то есть наугад.
- **Имён художников нет** по той же причине: Уилсон, Коул и Бёклин стоят
  по две работы каждый.
- **Первая фраза стоит отдельным ответом** на «где взять картину с римскими
  руинами как обои на телефон»: счёт, чем это является, что на картинах.

## Файлы

`collections.js` — одна новая запись в `COLLECTIONS`, больше ничего.
`pages.js`, `server.js`, `gallery.js` не тронуты: страница, ссылка в ряду тем,
строка на странице работы и запись в карте сайта появляются из записи сами.

## Проверки

`yarn verify` — код 0:

```
каталог: 410 записей, 410 адресов, порядок задан
темы: nihonga — 16, moody-landscape — 14, dark-academia — 43, ancient-ruins — 12
журнал запросов: четырнадцать проверок пройдены
счётчик вызовов: восемь проверок пройдены
список рассылки: 20 проверок пройдены
уход тона по каналам, уровней: у модели  -5.95  -2.98  -3.98 | после пересадки  -0.05   0.04   0.01
пересадка тона: тон вернулся, профиль на месте
Checking formatting...
All matched files use Prettier code style!
```

Сервер на `PORT=3196`, проверено `curl`ом:

```
status /collection/ancient-ruins: 200
<title>Ancient ruins phone wallpapers: free, no account</title>
<meta name="description" content="Ancient ruins phone wallpaper from museum paintings: the Pantheon, Tivoli, temples and fallen cities. Up to 2160 × 3840, free, no account."
<h1 class="topic__title">Ancient ruins collection</h1>
<p class="topic__note">12 museum paintings chosen as ancient ruins phone wallpapers: the Pantheon and a Roman aqueduct, temples and broken columns, the waterfalls at Tivoli, whole cities left in ruin. Painted between 1650 and 1881, from the Cleveland Museum of Art and other public collections.</p>
<p class="topic__terms">All 12 are phone wallpapers at 9:16, 6 of them at 2160 × 3840 or larger. Free to download and set as your background, no account needed.</p>
ссылок на работы: 12
```

Ряд тем под сеткой указателя:

```
<a href="/collection/nihonga">Nihonga collection</a>
<a href="/collection/moody-landscape">Moody landscape collection</a>
<a href="/collection/dark-academia">Dark academia collection</a>
<a href="/collection/ancient-ruins">Ancient ruins collection</a>
```

Карта сайта:

```
<loc>…/collection/nihonga</loc>
<loc>…/collection/moody-landscape</loc>
<loc>…/collection/dark-academia</loc>
<loc>…/collection/ancient-ruins</loc>
```

Три прежние темы на месте и не изменились:

```
nihonga: 200, работ 16
moody-landscape: 200, работ 14
dark-academia: 200, работ 43
```

Строка на странице работы (`/w/cole-architect-s-dream-…`):
`More ancient ruins phone wallpapers →`.

Тире в видимом тексте темы: `grep -c "—"` по строкам `title`, `heading`,
`term`, `description`, `note`, `terms` — 0.

## Ограничения

- Пять работ из двенадцати отмечены по тексту записи, а не глазами: лист
  с галочками Charlie смотрит отдельно. Снятое снимается прямо из `refs`
  в `collections.js`, числа в абзацах пересчитаются сами.
- Спрос слаб и померен косвенно — наличием страницы у складов, не числом
  запросов. Прямых чисел не даёт ни один бесплатный источник.
- Не закоммичено и не выложено.

## Закрыто в тот же день, 20 сентября 2026

Страница снята и запись `ancient-ruins` убрана из `collections.js` целиком,
не закомментирована: она никогда не была закоммичена, и история в git её
не хранит.

Причина — тот самый лист с галочками, который назван выше в «Ограничениях».
Charlie прошёл по всем 158 живым работам глазами (`.theme-sheet-all.html`,
результат — `research/2026-09-20-theme-picks-charlie.txt`) и оставил под
словом «руины» четыре работы: **vl-0399, vl-0060, vl-0460, vl-0226**. Из
двенадцати, набранных здесь по тексту записей, его отбор подтвердил три
(vl-0060, vl-0460, vl-0226) и добавил одну (vl-0399); остальные девять
руинами не оказались. Это ровно та ошибка, о которой предупреждал раздел
«Ограничения»: пять работ были отмечены по соседним словам в записи, а на
деле промахнулся и текстовый отбор целиком.

Четыре работы на тему — мало, и решение не выкладывать страницу принял
Charlie. Слово при этом не отвергнуто: если руин в коллекции станет больше,
запись собирается заново по этому же файлу.
