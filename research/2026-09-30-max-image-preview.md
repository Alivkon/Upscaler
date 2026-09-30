# max-image-preview:large: большое превью в выдаче

30 сентября 2026

## Цель

Разрешить Google показывать картинки сайта крупно. Без директивы Google
вправе показать в выдаче маленькое превью, а крупные карточки в Discover
даёт только сайтам, разрешившим `large`. Для витрины обоев картинка и есть
то, по чему выбирают: мелкая миниатюра читается не как «большая на сайте»,
а как «эта хуже».

Пробел найден аудитом чужих скилов (`2026-09-28-seo-skills-audit.md`):
директиву не упоминает ни один из десяти, и у нас её тоже не было.

## Решения

- **На всех страницах, кроме снятых работ.** Снятые (`hidden: true`) несут
  `noindex, follow` как раньше: в выдаче их нет, превью им не нужно.
- **Мысль «маленькое превью заставит зайти за большим» отвергнута.** Google
  Картинки не показывают размеры файла, так что о большой версии говорит
  только заголовок страницы, а он уже несёт «4K · 2160 × 3840».
- Не проверено: насколько директива меняет вкладку «Картинки», а не только
  Discover. Документация Google однозначного ответа не даёт, поэтому ниже
  точка отсчёта для сравнения.

## Изменения

- `pages.js`, `layout()`: тег `<meta name="robots">` теперь стоит всегда;
  `noindex, follow` для снятых работ, `max-image-preview:large` для
  остальных. Комментарий над функцией объясняет почему.

## Проверки

- `yarn verify`: «All matched files use Prettier code style!», код 0.
- Перед выкладкой `rsync --dry-run --checksum --itemize-changes`: меняется
  только `pages.js`.
- `./scripts/deploy.sh`: контейнер `Up 26 seconds (healthy)`, `/`,
  `/robots.txt`, `/sitemap.xml` отвечают 200.
- Боевой сайт после выкладки (30.09.2026, 11:23 UTC):

  | страница | robots |
  |---|---|
  | `/` | `max-image-preview:large` |
  | `/w/landscape-near-paris-landscape-desktop-wallpaper` | `max-image-preview:large` |
  | `/collection/dark-academia` | `max-image-preview:large` |
  | `/w/dusk-ridge-dark-gradient-iphone-wallpaper` (снята) | `noindex, follow` |

## Точка отсчёта

Выкладка 30.09.2026. Сравнивать показы и переходы по картинкам (`yarn stats`,
часть «Google», `searchType: image`) до и после, не раньше чем через 3-4
недели: Google обходит сайт медленно (из 205 адресов карты сайта к 21.09
знал 73), и директива доходит до выдачи только с повторным обходом страницы.

Состояние до, выгрузка Search Console «Индексирование страниц» за 04-21.09:
36 проиндексировано, 37 нет (27 `noindex` у снятых работ, 3 переадресации,
7 «просканировано, не проиндексировано»), показов 0-4 в день.

## Источники

- Google Search Central, мета-теги robots, `max-image-preview`:
  https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag
- Google Discover, требование крупных картинок:
  https://developers.google.com/search/docs/appearance/google-discover
