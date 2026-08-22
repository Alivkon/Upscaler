# What Charlie liked, and why the ties were not broken

22 August 2026. The answers from the `/edits` sheet built over the gallery
(`pick-edit-v2`), and the change they forced on the generator.

## The shape of it

```
117  ticks
 76  works        37 on the site · 39 built but waiting for a page
 41  works with exactly one version ticked
 35  works with several
```

Recorded work by work in `research/chosen-edits-v2.json`. It is a different list
from `chosen-edits.json`, which holds the pool round of 21 August under pool
refs — the two must not be merged.

## The tie was not a tie

Ticking several versions is not a contradiction: the sheet asks for a tick on
every version that works. The previous round resolved those works by frequency —
whichever version Charlie reached for most across the whole sheet won. That rule
could not be used again, because it inverted:

```
last round   ceil 22 · snap 17 · bal 6 · app 6 · orig 4 · niobe 3
this round   orig 35 · ceil 29 · snap 22 · bal 18 · app 11 · niobe 2
```

`orig` went from last place to first. Applied, it would have turned vl-0069
(orig, bal, snap, ceil) and every other `ceil,orig` pair into an untreated
plate — a decision about how the gallery looks, arrived at by an accident of
counting. So the 35 were put back to Charlie, and the answer was:

> if several are picked then i want all the versions!

Which retires the question rather than answering it. A work does not owe the
gallery one version. **117 ticks now mean 117 plates**, and the collection goes
from 267 plates to 308.

## One painting is still one page

The version is not a second work. Same painting, same painter, same accession
number, same search query — split across two URLs, the two pages compete for one
result. That is precisely what makes vl-0258 and vl-0260 (one Hammershøi, two
uploads, two pages) a bug with a TODO against it, and it would be perverse to
introduce forty-one more on purpose.

So versions live on the work's own page, as files beside it:

- The **first** ticked version is the main one. It keeps the plain filename, so
  no published URL moved and nothing lost what image search knows about it; it
  stands in the page's opening and is the one `ImageObject` the markup declares.
- The rest are written as `<name>-<treatment>-<w>x<h>.jpg`, listed in the
  manifest under `variants`, and shown in a second row under the crop
  alternates, headed **Other versions**.
- What the row offers is each version's **phone crop** — the same thing the
  page's Download button gives, so "the same picture, darker" is true of shape
  as well as light.
- The sitemap names those phone crops too, and nothing else of the variant: the
  map should only promise files that have a page around them.

Crops and versions are deliberately two rows, not one. A crop answers *what
shape*; a version answers *what light*. Six tiles in a single row would make
`16:9` and `Dimmed` look like answers to the same question.

The internal names do not reach the visitor. `ceil`, `snap`, `niobe` name the
settings they were chosen with, which tells a stranger nothing:

```
none                 As scanned
bal                  Colour balanced
snap                 Muted
dim80-desat-whole    Muted, stronger
ceil                 Dimmed
niobe                Dimmed, soft highlights
```

Those labels are a first pass and are the easiest thing here to change — they
live in one map in `pages.js`.

## What the generator had to grow

`treatment` now takes a list as well as a string, and the master is decoded once
per work rather than once per version — decoding is the expensive step and the
treatments differ only in what they do to pixels that are already unpacked.

`niobe` is implemented for the first time. It was left out on 21 August because
nothing published had asked for it; vl-0139 is ticked `niobe` alone, so it had
to exist. It is the ceilings plus a shoulder on the highlights: everything below
luma 60 is untouched, everything above is pulled towards the knee until the
tonal spread of the phone crop is 19 or less. On vl-0139 that lands at ×0.904.
Where a painting's whole spread already sits below the knee the shoulder has
nothing to grip, and the rule says so instead of pretending.

The shoulder is written so that it is an identity for every rule without a knee:
`knee` defaults to 255 and the value being shouldered can never exceed 255. That
is not an argument, it is checked — see below.

## The witness moved again, and this time somewhere it cannot be voted off

The sha256 pin on `dim80-desat-whole` has now been dislodged twice for the same
reason: the work holding it was later given a different treatment. vl-0240 went
to `ceil` on the 21st, vl-0025 to `bal` on the 22nd. A witness that can be
re-treated is not a witness.

It is now vl-0029 (Audubon, Black-throated Blue Warbler), taken from the 191
works that have never been on a judging sheet at all. Rebuilt after all of the
above, its plate is `dd8015e8d104d66384df8f50857e4ddda879fa4d5f42fd3c3399cf398d87763b`
— byte-for-byte what it was before, which is the proof that the shoulder,
the multi-version loop and the filename change left the old rule alone.

Both earlier pins are kept in `presets.json` as history.
