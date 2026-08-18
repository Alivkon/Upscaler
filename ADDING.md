# Как добавить изображение в галерею

## Шаги

1. Положить файл в `images/plates/`
2. Создать `catalogue/vl-XXXX.json` — следующий номер по порядку
3. Добавить `"vl-XXXX"` в самое начало `catalogue/order.json` — начало = первым в галерее
4. `yarn verify`

## Своя фотография

```json
{
  "ref": "vl-XXXX",
  "slug": "foggy-harbour-boats-iphone-wallpaper",
  "title": "Small boats moored in a foggy harbour town",
  "alt": "iPhone wallpaper photo: small wooden boats in fog, muted greens and greys, hills dissolving into haze",
  "tags": ["fog", "boats", "grey"],
  "origin": "Tessarum",
  "added": "2026-08-18",
  "file": "plates/foggy-harbour-boats-iphone-wallpaper.jpg"
}
```

Горизонтальное фото — `desktop-wallpaper` вместо `iphone-wallpaper` в slug и alt.

**slug** — поисковые слова + `iphone-wallpaper` или `desktop-wallpaper`. Не менять после публикации (постоянный URL).

**title** — виден только в Google, не на сайте. Без шаблона — просто что на фото.

**alt** — главный сигнал для Google Images. Конкретно: цвета, атмосфера, что видно. Начинать с `iPhone wallpaper photo:` или `desktop wallpaper photo:`.

## Музейная работа

```json
{
  "ref": "vl-XXXX",
  "slug": "in-the-waves-seascape-iphone-wallpaper",
  "title": "In the Waves — seascape iPhone wallpaper",
  "alt": "iPhone wallpaper from a painting: churning dark green waves, loose brushwork, Gauguin 1889",
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

**alt** — описывать что видно на картине, не музейные данные (они уже в provenance).

**origin** — страна художника, не музея.
