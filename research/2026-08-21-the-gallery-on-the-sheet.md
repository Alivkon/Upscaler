# The sheet now shows the gallery, not the pool

21 August 2026.

> update /edits.html with those that are currently on the gallery but i didn't
> look at on mobile. hide those i looked at and didn't tick

The first `/edits` sheet was cut out of the **selection pool** — 79 candidates,
most of them never published. That was the right question at the time ("which of
these is worth keeping"). The question has changed: the gallery is up, the
treatment is now a property of the work, and what is wanted is a pass over the
267 paintings that are actually on the site.

`gedits.mjs` → `edits.html`. The old sheet is kept as `edits-pool.html`.

---

## "227? are you sure they're all online now?" — no, and that was the bug

`museum-works.json` is what has been **built**, not what is **published**. Of the
330 entries in the catalogue, **215 carry `hidden: true`** — plate on disk, no
page on the site. The live index links 115 works and the sitemap lists the same
115, all of them museum works.

So "the gallery" is 115 paintings, not 267, and the first cut of this sheet was
counting built works as published ones. The sheet now says which is which
instead of guessing: live works come first with a blue edge, works waiting on a
page come after with an amber one. Both need a treatment; only one has a queue.

## Who is on it

```
267  built (wallpaper-gen/museum-works.json) — of which 115 are live
  9  looked at and not ticked   → hidden (7 of them live)
258  on the sheet               → 108 live + 150 waiting on a page
                                  1548 slides at 1080 px
```

The 23 already ticked sit at the end of each half, pre-ticked with the setting
they were given, because they already have an answer and the point of this pass
is the paintings that have none. Two of them — vl-0060 and vl-0064 — are the
Cleveland works whose ticks are waiting on a bigger copy rather than a decision.

What the five settings do to these 258, for comparison with the 79 of the pool:

```
bal     touches 232 of 258 · colour ×1.00 · bright ×1.00
snap    touches 258 of 258 · colour ×0.94 · bright ×0.80
app     touches 258 of 258 · colour ×0.92 · bright ×0.80
ceil    touches 258 of 258 · colour ×0.87 · bright ×0.59
niobe   touches 258 of 258 · colour ×0.91 · bright ×0.69
```

The brightness ceiling is even more aggressive here than on the pool — ×0.59
average against ×0.66 — because the gallery holds engravings on cream paper,
which are bright by construction and have the furthest to fall.

## What counts as "already looked at"

Only the conclusive keys: the source page URL and the museum accession number.
A title match is not a join — Claude Lorrain painted four "Pastoral Landscape"s
and the pool holds three separate scans of them.

Of the 79 works on the old sheet, **30 join to a built work**; the other 49 are
pool candidates that were never published. 21 of those 30 were ticked, so 9 are
hidden. (The pre-ticked count on the sheet is 23, not 21: vl-0060 and vl-0064
were ticked through a scan the automatic keys do not reach, and were hand-matched
when the ticks were first read.)

**The asymmetry is deliberate.** Eleven more pool works have a plausible title
match to something in the gallery — a van Huysum flower piece, a de Witte church
interior, Courbet's Valley of Ornans, Wilson's Tivoli. Unproven, so they stay on
the sheet. Showing a painting a second time costs one swipe. Hiding one that was
never actually judged costs it silently and forever.

## The source is the master, and it is measured the way the generator measures

Two things that would have made the sheet lie:

**Not the plate.** A file in `images/plates` has already been treated. Running a
treatment over it would show a version that cannot be built — the treatment
applied twice. `wallpaper-gen/sources/<ref>.jpg` is the untouched scan, and it
is what the generator reads.

**The same steps, in the same order.** Short side to 3840, grey balance read on
the whole work at 200 px, the phone window placed by the work's own `crop` rule,
the two ceilings solved on a 180 px probe of that window at full size. That is
`museum.mjs` as it stands after today's change, so a tick can be published
without re-deciding anything. The slide labelled `← стоит сейчас` marks whatever
the work carries today, so the comparison includes the status quo.

## The Japanese and Korean works, and a number worth checking

The thirty Cleveland works (vl-0132 … vl-0157, vl-0163 … vl-0166) plus vl-0252
had no cached master. Fetching the real masters was quoted at "about 3 GB" on a
guess. Measured, it is **23 GB**: these are `_full.tif` scans of 0.5 to 1.1 GB
each — the peony screen alone is 1,125,851,342 bytes.

The `_print.jpg` derivative is 6 MB, capped at 3400 on the long side, and all 31
came to **76 MB**. At 1080 px that is indistinguishable for judging a treatment,
and a few percent off on the solved multipliers. So the sheet takes those.

**They live in `prints/`, not in `sources/`.** Putting a capped derivative where
the generator looks for masters would mean a work quietly published from the
3400 copy one day — which is precisely the fault vl-0060 and vl-0064 already
have. The slides say `3400 copy` in the caption so the source is never a guess.

None of these 31 are live on the site; they are on the sheet because they were
asked for by name, not because they are in the gallery.

## A key of its own, again

The old sheet writes `pick-edit-v1` and its entries are pool refs
(`wm-…`, `cle-…`). This one speaks catalogue refs (`vl-0230#ceil`), so it writes
**`pick-edit-v2`** and seeds it from `research/chosen-edits.json`. Mixing the two
would leave both unreadable, and this project has already lost one selection to
exactly that.
