# Dark academia in the copy

22 August 2026.

> we wanted to capitalize on dark academia and dark moody wallpaper/background
> (pinterest ppl say background as we established) where we can — not all
> pictures match but many do — where can we add it

## Two slots, not one choice

The first proposal split the vocabulary by picture — some works "wallpaper",
some "background" — and Charlie rejected it on sight: *"isn't it weird to have
wallpaper for some pics and background for others?"* It is. The split that
works is by **slot**, because every work already has two indexed text fields
that no visitor ever sees side by side:

| field | rendered into | word |
| --- | --- | --- |
| `title` tail | `<title>`, `og:title`, schema `name` | wallpaper |
| `alt` | `<img alt>`, `<meta description>`, schema `description` | background |

The tail after the em-dash never appears on the page (`pages.js:636` splits it
off; the name becomes the `<h1>`). So the tail is pure search copy and the alt
is the description a scraper takes — Pinterest pulls alt into the pin. Every
work now carries both words, and the rule is uniform, so nothing reads as
arbitrary.

Six tokens land on each dark work across the two fields: *dark academia ·
vertical · iPhone · background · phone · wallpaper.*

**"vertical" was absent from the entire site.** Charlie's own query is
`dark academia phone background vertical`, and the site had the word in zero
titles and zero alts. It opens every alt now, and it is honest there: the file
the Download button hands over is the 9:19.5 crop.

## Who gets to claim it

Not by eye. Median luma and warmth `(R−B)/luma` measured on the shipped phone
crop of all 76 visible works, downsampled to 200 px — the same fields
`research/references.json` uses.

| | count | |
| --- | --- | --- |
| dark academia | 30 | luma ≤ 78 **and** warm-dark, classical / interior / scholarly |
| dark moody | 15 | luma ≤ 78, everything else |
| no claim | 31 | luma > 78 |

The cut is 78 because that is the ceiling of Charlie's eight reference works
(`luma [43,78]`), and the measure that separates the works he calls too bright
is luma, not cap. The bright side is not marginal: the four Audubon plates sit
at **203–233**, Merian at 184, Tiger in Wind at 201. Calling those moody would
be a lie a visitor catches in the thumbnail.

The academia/moody line follows `2026-08-18-phone-first-gallery.md:9` — dark
moody is the umbrella, dark academia is the tag applied only where it is true.
Japanese scrolls, the Courbet Alps, the Soutine rayfish and the American
romantics are dark but not academia; the Huysum still lifes, the Lorrain and
Bertin classical landscapes, both Hammershøi interiors, the gothic nave and the
Haeckel plate are.

## Where "desktop" went

16 works still said `— … desktop wallpaper` in the title, left over from before
the phone-first turn. `offered = item => item.crops?.phone || item`
(`pages.js:226`): the `<h1>`, the frame and the Download button all hand over
the phone crop, so those titles named a file the page does not offer — the
bounce that `2026-08-21-saying-what-the-site-does.md:96` refused to risk.

Charlie's rule: *desktop can stay on desktop versions and no-crop versions that
have horizontal aspect ratio.* All 16 plates are horizontal (1.14–1.83) and all
16 have a 16:9 crop, so the word moves into `alternates` where it is true — the
16:9 tile always, the uncropped plate when `width > height`. Titles say phone.

## Three defects, same cause

`title` tails were generated as `tags[0] + " " + tags[1]` on some entries, and
alts on two entries were never written at all.

- **vl-0087** *Gooseberries on a Table* — tail read `dark bird phone wallpaper`.
  There is no bird in it; `bird` is `tags[1]`.
- **vl-0230** Courbet, **vl-0236** Daubigny — alt was the title, artist and date
  repeated back. Nothing for an image crawler to read. Rewritten off the phone
  crops.
- **vl-0240** Gainsborough — alt did not use the `from a …:` shape the other 75
  share, so the rewrite doubled it. Written by hand.

## Nationality was only in the alt

Asked directly: do the Japanese works say so? Five of eight said it in the
title, three said it only mid-alt (vl-0164, vl-0068, vl-0069), and **vl-0151
Bamboo said "Korean" nowhere at all** — title read `bright forest landscape`,
alt read "East Asian", and the word lived only in a tag. Lifted into the title
for all five, plus vl-0219 (Chinese).

## Tags do nothing

Proposed putting "background" in `tags`, and that was wrong. `tags` renders in
exactly one place — `pages.js:421`, as `keywords` inside the JSON-LD. Google
has ignored `<meta name="keywords">` since 2009 and documents no ranking or
discovery use of schema.org `keywords` either. Nobody finds a picture by them.
They are internal metadata that happens to be serialised, and adding a keyword
there is doing nothing while feeling like something.

## Open

- `iphone` vs `phone` is still unresolved (28.9 vs 12.1,
  `2026-08-21-saying-what-the-site-does.md:92`). It is now hedged rather than
  decided: alts say iPhone, titles say phone. That is coverage, not an answer.
- Other tag-derived tails are thin but not false — `dark gold` (vl-0177),
  `bright sky` for a tiger (vl-0068, replaced), `still river` (vl-0281). Only
  the false one was fixed.
- The 31 bright works carry no mood word. If the gallery is meant to be dark
  throughout, the question is whether they belong in it, not what to call them.
