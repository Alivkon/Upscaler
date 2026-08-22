# What the favourites share besides a box, and how to find more

20 August 2026.

> is there anything in common between my favorites besides the box? something to
> find more by?

**Short version: stop drawing a rectangle and measure distance instead.** The box
keeps 307 of 628 and cannot rank. Ranking the pool by distance to the nearest
favourite puts a hidden favourite at the **15th percentile** against a chance of
50 — and that is the honest, unfitted number. The measures that carry it are
tonal spread, colour and brightness, in that order.

The strongest *non-numeric* thing they share is the **artist**, and it is not the
two artists that appear most often.

## Artist is a real signal, and the counts hide it

```
artist                favourites   pool   share of that artist picked
  böcklin                    1        1     100.0%
  harnett                    1        2      50.0%
  vernet                     1        3      33.3%
  john martin                3       23      13.0%
  van schrieck               1        8      12.5%
  william harnett            1       12       8.3%
  jan van huysum             2       38       5.3%
  yoshida                    1       40       2.5%
  richard wilson             4      194       2.1%
  claude lorrain             5      248       2.0%
  gainsborough               1       51       2.0%
  bierstadt                  1       54       1.9%
  vilhelm hammershøi         1       74       1.4%
```

Read the last column, not the first. Claude Lorrain and Richard Wilson top the
count with 9 favourites between them, and they are the **least** picked artists on
the list — 2% each — because they are 442 of the 1193 works in the pool. Charlie
picks from them at the rate he picks from anybody.

**John Martin is the real one**: 3 favourites out of a pool of 23, six times the
rate of Lorrain. Van Schrieck and van Huysum are next. The single-work artists at
the top are too small to mean anything on their own, but they point the same way.

If the question is "where do I get more", the answer this table gives is: **more
John Martin, more van Schrieck, more van Huysum** — not more Lorrain, of which
there are already 248 in the pool and 5 picked.

## Date and shape say nothing

```
date   favourites 1633 / 1760 / 1868      pool 1636 / 1744 / 1845   (10/50/90)
shape  landscape 17 of 23 (74%)           pool 71% landscape
```

Both match the pool almost exactly. There is no period and no format here.

## The source table is a trap

```
wikimedia  17 of 23   (pool: 1154 of 1193)
cleveland   6 of 23   (pool:   39 of 1193)
```

That looks like Cleveland works get picked ten times as often. **It is not a
finding.** The six Cleveland works are gallery pictures that were chosen from a
different and much smaller pool months earlier, and they are in the favourites
list because they already shipped. They were never in competition with these
1193. Written down so nobody reads the ratio later and starts harvesting
Cleveland on the strength of it.

## Distance beats the box, measured

Hide one favourite. Rank the whole pool by distance to the nearest of the
remaining favourites, in units of the pool's own standard deviation on each
measure. See where the hidden work lands. **0% is first place, 50% is chance.**

```
                            median   in the nearest 5%   10%    25%
all 12 measures               15%          5/23         8/23   16/23
the box's original 6          18%          0/23         5/23   14/23
brightness + spread only      22%          5/23         9/23   13/23
luma alone                    38%          3/23         5/23    9/23
```

All four sets were written down before they were scored, so all four medians are
honest. **All 12 measures at a median of 15% is the number to quote.** Compare it
against the box, which keeps 44% of the pool and has no inside — a work is in or
out and there is nothing to sort by.

`luma` alone lands at 38%, barely better than chance. That is worth pausing on:
brightness is the measure that does nearly all of the *cutting*, and it is almost
useless for *ranking*. A gate and a search are different jobs.

## Which measures carry it

Adding measures one at a time, keeping whichever improves the median most:

```
  + iqr     → median 28%
  + p95     → median 18%
  + luma    → median  6%
  stopping: adding busy does not improve on 6%
```

**Tonal spread, then colour, then brightness — and then it stops at three.** The
other nine measures add nothing.

The 6% is **not** an honest estimate: this search chose its measures by looking at
the same 23 works it is then scored on, so it is an upper bound. What survives the
objection is the order and the stopping point, and both agree with everything
measured this month — `iqr` is the Niobe measure, and the pair `iqr` + `luma` is
the pair the two ceilings and the shoulder are built on.

## What it hands over

The 25 works closest to some favourite, favourites themselves excluded:

```
17 of the closest 25 were dropped by the chain
```

and a lot of those 17 are portraits — Gainsborough's *Philip Yorke I*, Romney's
*Mrs James Fletcher*, three Hammershøi portraits, Courbet's *Mme L…*, Delacroix's
*Don Juan*. **The distance sees how a picture is lit, not what is in it.** That is
not a defect to fix in the measure; it is what the name filter and the model gate
are already for. So the usable list is the same ranking restricted to survivors:

```
0.10 · Richard Wilson (possibly) — A White Monk
0.13 · Pembroke Castle and Landscape
0.14 · Otto Marseus van Schrieck (follower) — Forest floor still life
0.14 · Gustave Courbet — Le château de Chillon
0.15   After Francis Danby — The Opening of the Sixth Seal
0.15 · George Morland — Before a Thunderstorm
0.17 · Van Huysum — Vase with Flowers
0.17 · Claude Lorrain Barnes
0.19   Lorrain Cleveland
0.19 · Richard Wilson — Hadrian's Villa
0.20 · Panini — An architectural capriccio
0.20 · Bierstadt — Mountains (02)
0.21 · Richard Wilson 001
0.21   Heade — Orchids, Passion Flowers and Hummingbirds
0.22 · Bertin — Landscape, Site of Greece
```

(`·` means the box keeps it too.) Two of the fifteen are outside the box, which is
the other half of the argument: a rectangle drawn round two clusters both admits
the middle and clips the ends.

## Both are on `/dark`

Charlie asked for the box as well as the sort, to see whether either works at
all — which is the right answer to an argument made only on numbers. Two
checkboxes in the existing row, no new panel height:

- **only the favourites box** — hides the 321 works outside it, leaving 307.
- **nearest a favourite first** — reorders the grid by distance.

Works Charlie has already named are marked `★` in accent colour, so the order can
be read against them. That is the check the sheet makes possible and the numbers
above cannot: if his own picks were scattered through the order, the order would
not be measuring what it claims to.

The first twelve under nearest-first:

```
0.04 ★ Claude Lorrain — Paysage avec Jacob luttant avec l'Ange (Nuit)
0.10 ★ Mount Vesuvius at Midnight
0.10 ★ Otto Marseus van Schrieck — Forest floor still-life
0.10   Richard Wilson (possibly) — A White Monk
0.12 ★ John Martin 001
0.12 ★ Ruin by the Sea
0.13   Pembroke Castle and Landscape
0.14   Otto Marseus van Schrieck (follower) — Forest floor
0.14   Gustave Courbet — Le château de Chillon
0.15   After Francis Danby — The Opening of the Sixth Seal
0.15   George Morland — Before a Thunderstorm
0.17   Van Huysum — Vase with Flowers
```

Six of the first twelve are favourites out of the 11 favourites among the 628
survivors, and the works between them are the ones the measure is proposing.

The order is applied with the CSS `order` property rather than by moving nodes,
because every filter, readout and card on that page is addressed by its index in
`W`; reordering the DOM would mean rewriting all of it. The distance itself is a
build-time number on the untreated whole work, so no slider moves it, and each
card prints it as `like 0.14`.

The measures are `iqr`, `p95`, `luma` — **chosen as one per family rather than by
the search above.** `iqr`, `range` and `sd` are three names for the same quantity,
so taking all twelve would weight tonal spread three times. That the greedy search
independently picked these three and stopped is corroboration, not the reason.

The other lead is the artist table: John Martin at 13% and van Schrieck at 12.5%
are the two names the pool is thin on relative to how often they are picked.

## What this does not do

- **The pipeline is untouched.** The checkbox and the sort are `/dark` only;
  nothing is gated, nothing is dropped, and `treatment.js` and the catalogue know
  nothing about either.
- **23 works, no negative labels.** Seven favourites live outside the measured
  pool and are excluded from all the distance work. Nothing here has a precision,
  and a measure that ranks the liked works high may rank plenty of bad ones high
  too — the 17 portraits in the top 25 are exactly that, caught only because the
  chain had already labelled them.
- **The greedy set is fitted.** Quote 15%, not 6%.
- **CLIP was not tried.** `~/upscaler-review/embed.py` embeds the pool with CLIP
  ViT-B/32 and would answer "what is in the picture" rather than "how is it lit",
  which is the half missing above. Neither the model nor the embeddings are on
  this machine, so it would need a download first.

## Files

- `/tmp/oils-preview/favlike.mjs` — all of the above.
- `/tmp/oils-preview/favlike.json` — the chosen measures and the 200 nearest works.
- [2026-08-20-the-box-charlies-favourites-make.md](2026-08-20-the-box-charlies-favourites-make.md)
  — the box this replaces.
