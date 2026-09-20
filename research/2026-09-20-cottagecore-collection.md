# Четвёртая тема: cottagecore

20 сентября 2026

## Цель

Поставить четвёртую тематическую страницу одной записью в `COLLECTIONS`
(`collections.js`), как сделаны три прежние: маршрут, ряд ссылок под сеткой
указателя, строка «More … phone wallpapers» на странице работы, карта сайта
и проверка `yarn verify` появляются из неё сами.

Заодно закрыть `ancient-ruins` — черновую пятую запись, не дожившую до
коммита.

## Решения

**Слово — `cottagecore`, адрес `/collection/cottagecore`.** По замеру спроса
(`research/2026-09-20-collection-demand.md`) это самая сильная из новых тем:
у wallpapers.com 600+ работ против 300+ у dark academia, то есть категория
больше той, что уже привела сюда посетителей из ChatGPT. Доказательство
косвенное — чисел по запросам не публикует ни один бесплатный источник, —
но косвенное одинаково для всех тем, и по нему эта первая.

**Состав — отбор Charlie глазами, и только он.** Он прошёл по всем 158 живым
работам на `.theme-sheet-all.html` и отметил 26
(`research/2026-09-20-theme-picks-charlie.txt`). Машинный тег по тексту
каталога в состав не входит вовсе, и не случайно: он ошибался крупно.
По light academia текстовый отбор нашёл 4 cottagecore там, где Charlie на тех
же плитках увидел в основном cottagecore; по руинам из двенадцати текстовых
работ руинами оказалась одна. Каталог называет vl-0047 «dark moody American
painting», а на кадре овцы на лугу и мальчик в траве.

**`ancient-ruins` снята целиком.** Черновая запись на 12 работ набиралась
по тексту записей; отбор Charlie оставил под этим словом четыре — vl-0399,
vl-0060, vl-0460, vl-0226. Четыре на тему мало, и решение не выкладывать
принял он. Запись удалена из `collections.js` без закомментированного
остатка: закоммичена она не была, и хранить её в виде мёртвого кода незачем.
Разбор дописан отдельным разделом в `research/2026-09-20-ancient-ruins-collection.md`
и его html-близнеце; сами файлы оставлены — это исторические записи.

**Light academia отложена.** У неё 19 отметок, они сохранены в том же
`research/2026-09-20-theme-picks-charlie.txt`; Charlie счёл подборку слишком
тонкой и страницу делать не велел. Спрос по замеру у слова есть, но слабее,
чем у cottagecore («некоторый» против «сильного»). Слово не отвергнуто:
записи хватит, чтобы собрать тему позже.

**Абзац написан по картинкам.** Открыты телефонные кадры всех 26 работ
(`images/crops`, разрешение — тем же путём, что у `.themesheet-all.mjs`:
манифест → скан или плита → `crops.phone`). Перечисление в абзаце — по весу
увиденного, а не по словам каталога:

- пастбища со скотом — 5 работ: vl-0047 (овцы и мальчик в траве), vl-0375
  (овцы и козы под дубами), vl-0308 (коровы и козы в броде), vl-0301
  (отдыхающие под деревом, корова), vl-0376 (мальчик с козами над озером);
- птицы и цветы вблизи — 5: vl-0026, vl-0027 (гнездо среди шиповника),
  vl-0028, vl-0032 (цветок банана с бабочкой), vl-0440 (одуванчики,
  маргаритки, божья коровка);
- зелёные берега и опушки — самая большая группа: vl-0281, vl-0353, vl-0265,
  vl-0064, vl-0240, vl-0086, vl-0053, vl-0297 и другие;
- мельница одна, vl-0299, и в абзаце она в единственном числе.

Постройки при этом есть ещё у двух работ (vl-0038 — фахверковая церковь,
vl-0280 — аббатство на склоне), но «cottage» из них не выходит, и в абзац
они не попали.

**«Chosen as», а не «paintings of».** У vl-0063 и vl-0236 нет ни овец,
ни цветов: это открытая равнина под тяжёлым небом. Утверждение о каждой
работе было бы неправдой, утверждение об отборе правдиво. Тот же оборот
стоит у dark academia.

**Числа замером, не руками.** `count` и `full` приходят из `measure` по тем
же работам, которые показывает сетка. Годы — крайние из `provenance.date`
тех же 26 refs: 1640 (vl-0065, «early 1640s») и 1871 (vl-0297). У vl-0280,
vl-0281 и vl-0440 даты в записи нет вовсе, и оборот «painted between»
это выдерживает: он называет промежуток, а не утверждает, что дата известна
у каждой.

**Музей назван один.** Кливленд стоит в `credit` у 10 работ из 26; следом
University of Pittsburgh с тремя одюбоновскими листами одной книги,
а у остальных в `credit` — Wikimedia Commons, то есть источник файла,
а не держатель. Второе имя пришлось бы брать наугад.

**Тире в видимом тексте нет ни одного**, вопросительных форм и рекламных
слов тоже. В `title` вместо тире двоеточие — образец `nihonga`.

## Двадцать шесть работ

Проверено против `galleryItems()` — тем же путём, каким работы попадают
на страницу: ни одна не `hidden`, у всех есть файл и телефонный кадр.
Разошедшихся нет, все 26 живые.

| ref | работа | автор | год | музей |
| --- | --- | --- | --- | --- |
| vl-0026 | The Birds of America, plate 118 | John James Audubon | 1827–1838 | University of Pittsburgh |
| vl-0028 | The Birds of America, plate 138 | John James Audubon | 1827–1838 | University of Pittsburgh |
| vl-0032 | Metamorphosis insectorum Surinamensium | Maria Sibylla Merian | 1705 | — |
| vl-0027 | The Birds of America, plate 137 | John James Audubon | 1827–1838 | University of Pittsburgh |
| vl-0376 | Gebirgssee | Arnold Böcklin | 1846 | Wikimedia Commons |
| vl-0236 | Villerville Seen from Le Ratier | Charles François Daubigny | 1855 | Cleveland |
| vl-0375 | Jacob with Laban and his Daughters | Claude Lorrain | 1676 | Wikimedia Commons |
| vl-0297 | Sunlight and Shadow: The Newbury Marshes | Martin Johnson Heade | 1871 | Wikimedia Commons |
| vl-0265 | The Summer (Landscape with couple) | Caspar David Friedrich | 1807 | Wikimedia Commons |
| vl-0298 | Rocky Landscape with Two Men on a Horse | George Morland | 1791 | Wikimedia Commons |
| vl-0280 | Italian Landscape: The Abbey and the Monks | Jean-Victor Bertin | нет | Wikimedia Commons |
| vl-0319 | Dover | Richard Wilson | 1746 | Wikimedia Commons |
| vl-0064 | The Waterfalls at Tivoli | Claude-Joseph Vernet | 1737 | Cleveland |
| vl-0240 | Rocky, Wooded Landscape with a Dell and Weir | Thomas Gainsborough | c. 1782–1783 | Cleveland |
| vl-0047 | Durham, Connecticut | George Inness | 1858 | Cleveland |
| vl-0299 | The Old Water Mill | George Morland | 1790 | Wikimedia Commons |
| vl-0063 | Landscape Near Paris | Georges Michel | c. 1840 | Cleveland |
| vl-0281 | River Landscape | Jean-Victor Bertin | нет | Wikimedia Commons |
| vl-0065 | Rest on the Flight into Egypt | Claude Lorrain | early 1640s | Cleveland |
| vl-0308 | Landscape with the Voyage of Jacob | Claude Lorrain | 1677 | Wikimedia Commons |
| vl-0301 | Landscape with a Column and Figure | Claude Lorrain | 1650 | Wikimedia Commons |
| vl-0038 | Landscape with a Church by a Torrent | Jacob van Ruisdael | c. 1670 | Cleveland |
| vl-0086 | Landscape with Hunters | Jan Wijnants | c. 1660–80 | Cleveland |
| vl-0440 | Still Life with Dandelion | Otto Didrik Ottesen | нет | Wikimedia Commons |
| vl-0353 | A Forest with Apollo and Daphne | Jean-Victor Bertin | 1810 | Cleveland |
| vl-0053 | In the Woods | George Inness | 1866 | Cleveland |

Пересечения: с dark academia — vl-0064, vl-0240, vl-0280, vl-0298, vl-0308,
vl-0319, vl-0353, vl-0375, vl-0038; с moody landscape — vl-0063, vl-0064,
vl-0086, vl-0240, vl-0308, vl-0353. Допустимо и записано у самих тем: тема
отвечает на другой запрос, а картинка ранжируется страницей работы, которой
ни одна тема не владеет.

## Изменённые файлы

- `collections.js` — снята запись `ancient-ruins`, добавлена `cottagecore`;
- `research/2026-09-20-ancient-ruins-collection.md` и `.html` — дописан
  раздел о том, что страница закрыта в тот же день;
- `research/2026-09-20-cottagecore-collection.md` и `.html` — эта запись.

## Проверки

`yarn verify`, код 0:

```
каталог: 410 записей, 410 адресов, порядок задан
темы: nihonga — 16, moody-landscape — 14, dark-academia — 43, cottagecore — 26
журнал запросов: четырнадцать проверок пройдены
счётчик вызовов: восемь проверок пройдены
список рассылки: 20 проверок пройдены
All matched files use Prettier code style!
```

Сервер на запасном порту 3195, `/collection/cottagecore` — 200:

```
<title>Cottagecore phone wallpapers: free, no account</title>
<meta name="description" content="Cottagecore phone wallpaper from museum paintings: sheep in meadows, wildflowers, green river banks, a water mill. Up to 2160 × 3840, free, no account.">
<h1 class="topic__title">Cottagecore collection</h1>
<p class="topic__note">26 museum paintings chosen as cottagecore phone wallpapers: sheep grazing in meadows, birds and wildflowers drawn close up, green river banks and a thatched water mill. Painted between 1640 and 1871, from the Cleveland Museum of Art and other public collections.</p>
<p class="topic__terms">All 26 are phone wallpapers at 9:16, 14 of them at 2160 × 3840 or larger. Free to download and set as your background, no account needed.</p>
плиток в сетке: 26
```

Длина `description` — 151 знак, укладывается в обрезку около 155.

Снятые адреса отвечают 404:

```
/collection/ancient-ruins   404
/collection/light-academia  404
```

Ряд тем на указателе — четыре ссылки, и те же четыре в карте сайта:

```
/collection/cottagecore
/collection/dark-academia
/collection/moody-landscape
/collection/nihonga
```

Три прежние темы на месте, счёт не изменился:

```
nihonga: 200, работ 16
moody-landscape: 200, работ 14
dark-academia: 200, работ 43
```

Строка на странице работы (`/w/durham-connecticut-american-painting-desktop-wallpaper`):
«More cottagecore phone wallpapers →».

Тире в видимом тексте темы (`title`, `heading`, `term`, `description`,
`note`, `terms`): 0. Вопросительных знаков: 0.

## Ограничения

- Спрос померен косвенно: размером категории у складов, а не числом запросов.
  Прямых чисел не даёт ни один бесплатный источник, и это то же ограничение,
  под которым выходили три прежние темы.
- Слово «cottagecore» — анахронизм для картины 1640 года, и абзац это
  учитывает оборотом «chosen as»: он говорит об отборе, а не о работах.
- Абзац написан по телефонным кадрам, то есть по вырезкам; целую плиту
  кадр не всегда представляет полностью.
- Не закоммичено и не выложено: у Charlie незавершённая работа в `pages.js`,
  `gallery.js`, `public/dimmed.js` и `scripts/shipping-list.mjs`, выкладка
  на боевую машину до её окончания не идёт.
