# GEO copy proposals: what a ChatGPT answer could quote

20 сентября 2026

Заявка: логи показывают, что ChatGPT приходит и забирает только `/` — то есть
единственная страница, которую ассистент может процитировать, это указатель.
Это черновик предложений по тексту, не правка кода: `pages.js`, `collections.js`
и `public/*` не тронуты, ниже только формулировки и адрес места, куда каждая
могла бы встать.

Метод тот же, что в `research/2026-08-24-geo-topic-pages.md`: цитируется простая
повествовательная фраза с числами и именами собственными, а не список карточек.
Ничего не придумано сверх того, что подтверждает сайт: поля каталога проверены
по `catalogue/vl-0216.json` (провенанс: `creator`, `date`, `work`, `credit`,
`page`; поле `license`), а формулировки — по живым страницам
(`curl https://tessarum.com/`, `/collection/dark-academia`, `/license`,
`/w/apple-blossoms-still-life-iphone-wallpaper`).

## 1. Главная страница — одна цитируемая фраза

Место: `collectionPage()` в `pages.js` (671–699). Здесь сознательное решение
не ставить `h1` и абзац над сеткой — расписано в комментарии над функцией:
заголовок отдан `<title>`, а лишняя подпись отняла бы у Google Images
единственного кандидата на подмену заголовка в выдаче. Это решение НЕ противоречит
цитируемой фразе для ChatGPT: `<title>` и meta `description` (`DESCRIPTION`,
строки 25–28) читаются ассистентом при обходе страницы точно так же, как видимый
текст, — это то, что стоит поменять, не добавляя видимого абзаца.

**Рекомендую**: переписать `DESCRIPTION` (используется и `collectionPage`, и
как основа для тайтла) на цитируемое предложение:

> Real museum oil paintings — not AI-generated — as free phone wallpapers, cropped
> for the screen, with a dimmed version that won't glare in the dark. No account,
> no watermark.

Почему: отвечает сразу на три запроса из списка («not AI-generated»,
«no signup no watermark», «for OLED/dark mode» через «won't glare in the dark»)
одним предложением, и не требует спора с решением про `h1`/heading-order.

Вариант 2 (короче, ближе к текущему стилю `DESCRIPTION`):

> 117 museum oil paintings as free phone wallpapers — real paintings, not
> AI-generated, cropped to fit the screen. Free, no account, no watermark.

Вариант 3, если решено всё же добавить видимый текст (значит отменить решение
«без `h1` и абзаца» — тронуть придётся сам `collectionPage`, не только копию):

> A collection of real museum paintings — not AI-generated — turned into phone
> wallpapers. Free, no account, cropped for the screen, with a dimmed version
> for the dark.

Отдаю предпочтение варианту 1 (в `DESCRIPTION`): он ничего не ломает в разметке
и решает задачу ровно там, где её решает ассистент — при чтении `<head>`.

## 2. «Dimmed» — одна фраза, объясняющая галочку

Место: сама галочка — `dimmedBox()` в `pages.js` (400–413), сейчас несёт только
слово «Dimmed» (`options__text`) без пояснения; используется в `topicPage`
(строка 764) и `workPage` (строка 1251). Рядом с чекбоксом однословной подписи
достаточно для управления, но не для цитаты — предложение нужно отдельной
строкой, не внутри `<label>`.

**Рекомендую**: короткая подпись рядом с галочкой (напр. `<p class="dimmed-note">`
после `dimmedBox()`, тем же приглушённым стилем, что `terms`/`note` в
`collections.js`):

> Dimmed shows the painting darkened and desaturated, so it won't glare on
> a dark screen; switch it off to see the plain scan.

Вариант 2 (короче, под чекбокс как caption, если места на строку нет):

> Darkened and desaturated for a dark screen — switch off to see the scan.

Почему вариант 1 первый: отвечает буквально на «wallpaper that isn't too
bright at night / for OLED», а не только описывает механику UI; вариант 2 —
для тесных мест (плитка под галочкой на `workPage`, где рядом уже стоят
`Download`/`Pinterest`).

## 3. «Not AI» — где сказать и как

Три места, где утверждение и уместно, и проверяемо:

- **Главная** — см. пункт 1 (`DESCRIPTION` в `pages.js`), сокращённая форма
  «not AI-generated» рядом с «real museum oil paintings».
- **`/license`** — `licensePage()` в `pages.js` (1571+), первый абзац
  («Nearly everything in this collection comes from an open collection…»).
  Здесь можно сказать длиннее и точнее, разведя две вещи, которые площадка уже
  разводит: картины — сканы музейных работ, обработка (кроп, приглушение) —
  механическая, без генерации; а увеличение своей картинки — отдельная модель
  (upscaling, не генеративная), и об этом ниже нельзя молчать, потому что
  страница про неё и так рассказывает.
- **Тематические страницы** (`dark-academia`, `moody-landscape`, `nihonga`) —
  текст живёт в `collections.js`, не в `pages.js` (см. комментарий над
  `topicPage`). Отдельного «not AI»-предложения туда добавлять не советую:
  `note()` уже называет картины «museum paintings», годы и музеи — это и есть
  доказательство подлинности без прямого отрицания. Прямое «not AI-generated»
  в 50–60-словном `note` вытеснило бы число или происхождение — то, что там
  цитируется. Формулировка для home/license решает эту задачу лучше, чем
  повтор на каждой теме.

**Рекомендую** (для `/license`, встык с первым абзацем `Works from open
collections`):

> These are scans of real paintings and drawings held by museums, not
> AI-generated images; cropping and darkening them for a phone screen is
> ordinary image processing, done the same way on every file.

Вариант 2 (короче, для верхней сводки страницы, рядом с «Nearly everything…»):

> The paintings themselves are museum scans, not AI-generated — nothing here
> is invented by a model.

Важно: не писать «no AI anywhere on this site» — секция «The models that
enlarge your picture» тут же на этой странице объясняет, что энлардж своей
картинки идёт через `4x-NMKD-Siax`, нейросеть-апскейлер. Формулировки выше
это не нарушают: они про картины, не про инструмент.

Предпочитаю вариант 1 на `/license`: он explicitно отделяет «что нарисовано»
(музей) от «что сделано с файлом» (механическая обработка) — ровно то
разграничение, которого просит бриф, и оно дословно согласуется с тем, что
страница `/license` уже утверждает про кроп и ресайз чуть ниже («Choosing a
crop and resizing it is a mechanical act and creates no new work»).

## 4. `/license` — «можно ли использовать как обои легально»

Место: `licensePage()`, `pages.js` (1571+), в начало секции «Works from open
collections» или отдельной вводной строкой перед ней. Страница уже говорит это
по частям (public domain / CC0 / CC BY, «you may do anything with them that you
could do with the original file»), но нет одного составного предложения-ответа.

**Рекомендую**:

> Most paintings here are public domain or released under CC0 by the museum
> that holds them, so using one as your phone wallpaper needs no permission
> and no credit; a few are CC BY and only ask that you keep the artist's name
> with the file.

Почему: три факта страницы (public domain/CC0 — свободно; CC BY — с атрибуцией;
ничего сверх этого не требуется) собраны в одно проверяемое предложение,
ничего не добавляет к тому, что страница уже обещает.

Вариант 2 (короче, ближе к разговорному «is this legal»):

> Yes: the paintings are public domain or CC0/CC BY from the museums that hold
> them, and using one as wallpaper is free and needs no permission beyond
> crediting the CC BY few.

Вариант 3 (нейтральнее, без «Yes:», раз в проекте не любят форму вопрос-ответ,
см. `no-question-forms-for-copy`):

> Using a painting from this collection as your wallpaper is free and needs no
> permission — most are public domain or CC0, and the CC BY few only ask to
> keep the artist's name with the file.

Предпочитаю вариант 3: отвечает буквально на «can I legally use this as my
wallpaper», без вопросно-ответной формы и без «Yes:», которое звучит как ответ
на вопрос, которого на странице нет.

## 5. Страница работы — одно предложение из полей записи

Место: `workPage()`, `pages.js` (1044+). Поля, которые реально существуют
и уже читаются функцией: `name`/`titleParts(item)` (имя работы), `bylineFor(item)`
(автор), `provenance.date`, `provenance.credit` (музей + номер), `file.width`/
`file.height`/`gauge` (размер, с «4K ·» когда применимо). Проверено по
`catalogue/vl-0216.json` — поля `provenance.creator`, `provenance.date`,
`provenance.credit`, никаких выдуманных сверх этого.

Видимого абзаца под работой уже нет намеренно (решение 23.08, коммент над
`terms`: «человек пришёл за картинкой… не обязан по дороге узнавать, что тут
ещё умеют»), так что цитируемое предложение логичнее держать там, где страница
уже говорит для ассистента, а не для человека — в meta `description` (сборка
на строке ~1215):

```
`${item.alt}. ${gauge}, ${formatType(file.url)}, ${formatBytes(file.bytes)}.${restored ? ` ${restored}.` : ''} Free download, no sign-up.`
```

**Рекомендую** добавить в начало этой строки (перед `item.alt`, который сейчас
служебный: «Dimmed vertical iPhone background from a painting: …») составное
предложение по шаблону:

> `<Title> by <Artist>, painted in <year>, from <Museum>, as a free <w>×<h>
> phone wallpaper.`

Пример на «Apple Blossoms»:

> Apple Blossoms by Martin Johnson Heade, painted in 1873, from the Cleveland
> Museum of Art, as a free 2518 × 4477 phone wallpaper.

Вариант 2 (без «Museum», если провенанс без явного слова «Museum» в `credit` —
у части записей `credit` не музей, а архив/библиотека, так что слово точнее
брать не буквой «Museum», а самим `credit` как есть):

> `<Title> by <Artist> (<year>), a free <w>×<h> phone wallpaper from <credit>.`

Пример:

> Apple Blossoms by Martin Johnson Heade (1873), a free 2518 × 4477 phone
> wallpaper from Cleveland Museum of Art, 1915.687.

Предпочитаю вариант 2: `credit` — то самое поле, которое `provenance()` уже
печатает на странице (`terms__note`), и вариант не добавляет слова «Museum»
там, где источник им может не быть (например, частная коллекция или архив).
Работы без имени (`named` = false, у тридцати фотографий без `-` в заголовке)
это предложение не получают вовсе — как и сейчас: у них нет `name`, и шаблон
неприменим без выдумывания.

## Итог

Ничего в `pages.js`, `collections.js` или `public/*` не изменено — только этот
файл. Рекомендованные варианты (для правки, если Charlie одобрит):

1. Главная — переписать `DESCRIPTION` в `pages.js` (вариант 1).
2. «Dimmed» — подпись рядом с `dimmedBox()` (вариант 1).
3. «Not AI» — добавить на `/license`, не трогать `collections.js` (вариант 1).
4. `/license` легальность — вводное предложение перед «Works from open
   collections» (вариант 3).
5. Страница работы — дополнить meta `description` в `workPage()` шаблоном
   по `credit` (вариант 2).
