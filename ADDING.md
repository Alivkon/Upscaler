# Как добавить изображение в галерею

## Шаги

1. Положить файл в `images/plates/`
2. Создать `catalogue/vl-XXXX.json` — следующий номер по порядку
3. Добавить `"vl-XXXX"` в `catalogue/order.json` — куда угодно, место всё равно решит следующий шаг
4. `node scripts/shuffle-order.mjs` — перемешать развеску, чтобы партия не встала на витрине кучей
5. `yarn verify`

## Своя фотография

```json
{
  "ref": "vl-XXXX",
  "slug": "foggy-harbour-boats-iphone-wallpaper",
  "title": "Small boats moored in a foggy harbour town",
  "alt": "Vertical iPhone background photo: small wooden boats in fog, muted greens and greys, hills dissolving into haze",
  "tags": ["fog", "boats", "grey"],
  "origin": "Tessarum",
  "added": "2026-08-18",
  "file": "plates/foggy-harbour-boats-iphone-wallpaper.jpg"
}
```

Горизонтальное фото — `desktop-wallpaper` вместо `iphone-wallpaper` в slug. **Только в slug.** Страница отдаёт телефонный кадр (`pages.js`, `offered`), и слово «desktop» в заголовке или alt пообещало бы файл, которого по кнопке не дают. Своё место у него есть — подписи к 16:9 и к нетронутой плите в `alternates`, и там оно проставляется само.

**slug** — поисковые слова + `iphone-wallpaper` или `desktop-wallpaper`. Не менять после публикации (постоянный URL).

**title** — виден только в Google, не на сайте. Устроен как `Имя — хвост`: имя встаёт в `<h1>`, хвост живёт в `<title>` и написан для выдачи. У фотографии имени нет — весь заголовок и есть описание, без тире.

**alt** — главный сигнал для Google Images и то, что Pinterest забирает в описание пина. Конкретно: цвета, атмосфера, что видно. Начинать с `Vertical iPhone background photo:`.

## Музейная работа

```json
{
  "ref": "vl-XXXX",
  "slug": "in-the-waves-seascape-iphone-wallpaper",
  "title": "In the Waves — dark moody seascape phone wallpaper",
  "alt": "Dark moody vertical iPhone background from a painting: churning dark green waves rising past the frame, a bather's shoulders in the trough, loose heavy brushwork",
  "tags": ["seascape", "green", "painting"],
  "origin": "France",
  "license": "cc0",
  "added": "2026-08-18",
  "file": "plates/in-the-waves-seascape-iphone-wallpaper.jpg",
  "provenance": {
    "creator": "Paul Gauguin",
    "date": "1889",
    "work": "In the Waves (Dans les Vagues)",
    "credit": "Cleveland Museum of Art, 1978.63",
    "page": "https://www.clevelandart.org/art/1978.63"
  }
}
```

**provenance** — обязательны `creator` и `page` (ссылка на источник). Остальное (`date`, `work`, `credit`) — если известно.

**license** — `cc0`, `public-domain` или `cc-by`; список заведён в `LICENSES` (`works.js`), чужое значение `scripts/verify-catalogue.mjs` не пропустит. Условие есть только у `cc-by`: подпись обязательна, и надо сказать, что работа изменена, — сказано на `/license#cc-by` один раз за всю витрину, поэтому карточке добавлять нечего. Кадрирование и приглушение — это и есть изменение.

**alt** — описывать что видно на картине, не музейные данные. Название, автор и дата уже стоят в `provenance` и сами приезжают в заголовок страницы; повторённые в alt, они занимают единственное поле, где сказано, как работа выглядит, и краулер не узнаёт о ней ничего. Так были испорчены vl-0230 и vl-0236 — alt пересказывал этикетку. Писать по кадру: открыть 960 px копию телефонного кадра из `images/crops/` и описать её.

**origin** — страна художника, не музея.

Национальность — в хвост заголовка, а не только в alt: `Japanese`, `Korean`, `Chinese`. Она сама по себе запрос, а в alt её находит только тот, кто уже пришёл.

## Музейная работа: пайплайн до каталога

Каталог — последний шаг. До него плита и кадры генерируются из источника скриптом в `wallpaper-gen`.

**Источник** — файл-мастер ложится в `~/repos/wallpaper-gen/sources/<ref>.jpg`. TIFF только для Кливленда, где он есть; остальное — JPEG с сайта. Если полного мастера нет, `gedits.mjs` сам скачивает урезанную копию для суждения.

**Обработка** — прогнать через лист выбора:

```
cd ~/repos/Upscaler/scripts/research
ONLY=vl-0352,vl-0355 OUT=/tmp/oils-preview-new FORCE=1 node gedits.mjs
python3 -m http.server 7724 --bind 0.0.0.0 --directory /tmp/oils-preview-new
# → http://192.168.178.20:7724/edits.html
```

Шесть версий на экран, листать и тикать. После — записать в `museum-works.json`:

```json
{ "ref": "vl-0356", "treatment": "bal" }
```

Имена: `none` (оригинал), `bal`, `snap`, `app`, `ceil`, `niobe`. Несколько — массивом: `["bal", "ceil"]`.

Результат сессии записывается в `research/chosen-edits-v2.json` — это история решений. Работы, которые были на листе, но не отмечены, пишутся туда явно с `"ticked": []` — иначе они пропадают из истории и снова появятся на следующем листе. Пустой тик — не пропуск, а решение: «смотрел, не подошло».

**Рамка** — если у плиты физическая рамка, срезать перед кадрированием. Только рукой: автоматический резак снят 23.08, он оставлял рамку на каждой третьей работе. Обмер — `research/crop-ruler.html` (`node scripts/research/crop-ruler.mjs`), там показана целая плита и рулетка по всем четырём сторонам. Порядок целиком: `research/how-to-crop-frames.md`.

```json
"trim": { "top": 79, "bottom": 50 }
```

Числа — от целого уменьшенного листа. У работы, которую уже резали, лист показывает `cut top 79` рядом с названием, а снятое поверх складывается с ним: в файл идёт сумма, её же отдаёт кнопка `copy`.

**Если у работы уже есть `crop`, срезать рамку слева или сверху нельзя молча.**
Кадр записан в пикселях плиты ПОСЛЕ `trim`: сняли ещё 40 слева — начало отсчёта
уехало на 40, и то же число указывает на другое место картины. Из каждого
`left` вычесть, сколько добавилось слева, из каждого `top` — сколько сверху,
и поправить строку в `to-crop-positions.md` / `to-crop-desktop.md`. Справа и
снизу отсчёт не трогают. 23.08 так переехали 15 записей из 30.

**Кадр** — по умолчанию телефонный кадр встаёт по центру. Если сюжет смещён — выбрать позицию в `research/crop-positioner.html`, записать в `research/to-crop-positions.md` и добавить в `museum-works.json`:

```json
"crop": { "left": 744 }
```

Пиксели — в координатах плиты после `trim`. Если кадр не трогали — записать `center` в `to-crop-positions.md`: отсутствие записи неотличимо от «не смотрел».

Так записанное правило ставит все три кадра сразу. Если десктопный кадр надо сдвинуть отдельно — правило на кадр:

```json
"crop": { "phone": { "left": 903 }, "wide": { "top": 2912 } }
```

Ключи — имена кадров (`phone`, `tall`, `wide`), и опечатка в имени роняет сборку, а не уезжает молча в середину. `tall` своего правила не просит и берёт телефонное. Десктопные позиции — в `research/to-crop-desktop.md`.

После сборки — `node scripts/research/verify-frames.mjs [refs]`: вырезает проём из плиты по записанному правилу и сравнивает с выпущенным кадром. Уехавший кадр не роняет сборку и не виден в размерах.

Лист кадрировки собирается заново: `node scripts/research/crop-positioner.mjs` — вся витрина, `--unseen` — только те, о ком в `to-crop-positions.md` строки ещё нет, `--desktop` — кадр 16:9 у тех, чей десктопный кадр витрина показывает (`research/to-crop-desktop.md`). Проём открывается там, где кадр стоит сейчас.

**Сборка** — после того, как treatment / trim / crop выставлены:

```
cd ~/repos/wallpaper-gen && node museum.mjs --only vl-0356
```

Скрипт обновляет плиту, кадры и `Upscaler/images/manifest/museum.json`. Вывод подтверждает размеры и применение trim. Кадры сразу доступны на `:3000`.

**На витрину** — создать `catalogue/vl-XXXX.json` (пример выше), добавить ref в `catalogue/order.json`, запустить `node scripts/shuffle-order.mjs` и `yarn verify`. После этого работа появляется в галерее.

## Два слова и два места

У работы два индексируемых поля, и посетитель их рядом не видит. Слова в них разные, и это не разнобой, а покрытие:

| поле | куда попадает | слово |
| --- | --- | --- |
| хвост `title` | `<title>`, `og:title` | `wallpaper` |
| `alt` | `<img alt>`, `<meta description>` | `background` |

`wallpaper` выигрывает у `background` в Google (`phone wallpaper` 12.1 против `phone background` 10.6), но словарь Pinterest — `background`, а alt — это то, что Pinterest забирает в пин. `vertical` открывает alt всегда: это отдельный запрос, и кадр 9:19.5 действительно вертикальный.

Разбор — `research/2026-08-22-dark-academia-in-the-copy.md`.

## Тёмная или нет

`dark academia` и `dark moody` ставятся по числу, не по впечатлению: на светящемся экране почти всё кажется темнее, чем выйдет миниатюрой в выдаче.

```
node scripts/mood.mjs vl-0251
node scripts/mood.mjs images/plates/новая-работа.jpg
```

Порог — медианная luma **78**, потолок восьми опорных работ Чарли. Выше — никакого слова: четыре таблицы Одюбона стоят на 203–233, и обещание не сошлось бы с превью.

Ниже порога — `dark academia`, если палитра тёплая **и** сюжет классический, интерьер или учёный (натюрморт, руины, храм, естественнонаучная таблица). Иначе `dark moody` — так помечены японские свитки, Курбе, американские романтики. Зонт — `dark moody`, `dark academia` — уточнение, и ставится только там, где оно правда (`research/2026-08-18-phone-first-gallery.md`).

**Хвост заголовка не собирать из тегов.** `tags[0] + tags[1]` дал vl-0087 хвост `dark bird phone wallpaper` — птицы в работе нет, `bird` был вторым тегом.

**tags на поиск не влияют.** Единственное их место — `keywords` в JSON-LD (`pages.js`); ни `<meta name="keywords">`, ни `keywords` в schema.org поиском не используются. Класть туда ключевые слова — делать вид, что работаешь.
