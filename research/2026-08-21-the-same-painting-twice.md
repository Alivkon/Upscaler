# The same painting is in the pool up to four times

21 August 2026.

> i dont get it there is a 5k file on wikipedia for Heade - Sunlight and Shadow

Charlie was right, and the check that said otherwise was the wrong check.

**58 paintings are in the pool more than once — 129 files, 71 of them redundant.
In 8 cases Charlie kept a smaller copy while a bigger one sat unmarked further
down the same sheet.** The worst: a Heade kept at **709×323** whose twin in the
same pool is **12541×5626**.

## Why the earlier pass missed it

`originals.mjs` asked Commons, for every work under 1600 px: *is this file
bigger than the copy we hold?* For `HeadeMartinJohnsonSunlightAndShadow.jpg` the
answer was honestly no — 709×323 **is** the original.

The question it never asked is *whether Commons holds a different file of the
same painting*. It does:

```
12541×5626   Martin Johnson Heade - Sunlight and Shadow- The Newbury Marshes - Google Art Project
 4000×1826   Martin Johnson Heade, Sunlight and Shadow - The Newbury Marshes, c. 1871
  709×323    HeadeMartinJohnsonSunlightAndShadow
```

And the pool already held **all three**, as three separate works.

The lesson generalises past this bug: *"is this file the best version of itself"*
and *"is this the best file of this painting"* are different questions, and only
the second one is about the gallery.

## Titles cannot find this

The three names above share no usable substring. No string rule joins them and
still keeps genuinely different paintings apart — the Wikimedia naming ranges
from `Claude Lorrain 010` to `Worship of the Golden Calf - Claude Gellée, called
Le Lorrain`.

So compare the **pictures**. `dupes.mjs` uses dHash: squash to 9×8 grey, and for
each row record whether each pixel is brighter than the one to its right. Those
64 bits describe the shape of the image and almost nothing about its size,
exposure or JPEG quality — which is exactly what differs between two scans of one
painting. Aspect ratios must also agree to within 6%, because two paintings by
one hand in one style can score close on shape alone.

## The threshold is a judgement, and it is not clean

```
distance, bits:  0:10  1:6  2:8  3:4  4:4  5:14  6:5  7:7  8:14  9:17
                10:25 11:48 12:75 13:157 14:225 15:451 16:677 …
```

**There is no gap.** The count climbs steadily from 10 bits onward, so the cut at
10 is a choice, not a discovery. It therefore cannot be trusted blind, and
`dupes.html` shows every group side by side.

Checked by eye, it does produce false groups. The clearest:

```
2820×2045   A Panoramic Landscape at Dusk with Rustic Dancers — Claude Lorrain
1200×910    View in Windsor Great Park — Richard Wilson
 500×367    Lorrain uffizi
```

Three **different** paintings that share a composition — trees left, open sky,
figures low. Wilson painted in Claude's manner on purpose, so this is the exact
failure to expect from a shape-only measure.

**All 8 of the actionable groups were checked one at a time and all 8 are
genuine.** That is the claim this note stands behind; the other 50 groups are
published for the eye and nothing has been merged.

## The 8 that change a decision

```
  keep  12541×5626  crop 640   Heade - Sunlight and Shadow, The Newbury Marshes
  drop    709×323   crop 149   HeadeMartinJohnsonSunlightAndShadow

  keep   3352×1748  crop 640   Heade - Summer Showers - Google Art Project
  drop    768×390   crop 180   Brooklyn Museum - Summer Showers

  keep   4000×5247  crop 640   Jan van Huysum - Stilleven met bloemen en vruchten
  drop   1684×2221  crop 640   Jan van Huysum 001

  keep   2752×2068  crop 640   Pastoral Landscape — Claude Lorrain, Timken Museum
  drop   1024×790   crop 365   Claude Lorrain - Pastoral Landscape, 1646-47

  keep   4000×3329  crop 640   Courbet - The Cliff at Étretat (Cleveland)
  drop   3400×2829  crop 640   The Cliff at Étretat

  keep   3456×4000  crop 640   Emanuel de Witte - Interior of a Church (Cleveland)
  drop   2938×3400  crop 640   Interior of a Church

  keep   1500×977   crop 451   John Martin - The Eve of the Deluge - RCIN
  drop   1500×977   crop 451   John Martin - The Eve of the Deluge - WGA14146

  keep   3729×3876  crop 640   Hammershøi - The Buildings of the Asiatic Company
  drop   3726×3875  crop 640   Hammershøi, Asiatisk Compagnis bygninger
```

The last three are ties or near-ties and change nothing visible. The first four
are the ones that matter, and the first two are dramatic.

## What was done about it

`pick.html` now **marks** duplicates and never merges them:

- a green badge, *biggest of N copies*;
- a red badge, *a smaller copy — 12541×5626 exists*;
- a filter, **hide smaller copies (71)**.

The filter deliberately **keeps showing a smaller copy that is already ticked**,
so switching it on can never hide a decision Charlie has made.

Nothing is deleted and no selection was changed. Given the false groups above,
an automatic merge would quietly drop real paintings, and the sheet exists so
that a person decides.

## What this leaves open

- **The 8 swaps are Charlie's call**, not the script's.
- **The other 50 groups have never been looked at.** They cost nothing today —
  both copies are in the pool and either can be picked — but they inflate the
  628 and waste eye-time.
- **The same search should run outward, not just inward.** For the 25 kept works
  whose phone crop is under 450 px, the question is not "is there a twin in the
  pool" but "is there a better file anywhere on Commons", which is the Heade
  discovery generalised. That is a search per painting and it is not written.

## Files

- `/tmp/oils-preview/dupes.mjs` → `dupes.json` — hashing, grouping, the report.
  `node dupes.mjs 12` runs it at a different threshold.
- `/tmp/oils-preview/dupesheet.mjs` → `dupes.html` — all 58 groups for the eye,
  the ones with a decision at stake first.
