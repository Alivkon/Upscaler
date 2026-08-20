# Two ceilings and a drop: colour 18, brightness 65

19 August 2026. Charlie set these on `/dark` and asked for them to be written down
rather than built. **Nothing in the pipeline has been changed.** This note records
what the numbers mean, what they cost, and the one question that has to be answered
before anyone implements them.

**Decided, later the same day.** Shown the cost below — the drop keeps 92 works of
628 — Charlie chose to pay it: *"i think we need to pay the expensive price, esp if
taste pics confirm it - the orchid is a conscious exception"*. So the 85% cut is
the decision, and Two Hummingbirds and an Orchid stays by hand rather than by
widening the gate. It is already in `research/handpicked-overrules.json`, and
`funnel.mjs` applies overrules after every gate, so it survives this one without
anything being changed for it. The reasoning below is what the decision was made
against; it has not been edited to agree with the outcome.

## The settings

```
no work more colourful than   18
no work brighter than         65
and drop anything brighter than 65 rather than dimming it down
```

## What surface those numbers live on

They are the two numbers printed on every card on `/dark`, and that surface is not
the one the box uses. It matters, because the same painting carries different
numbers on each:

```
                 the box (funnel.mjs)          the /dark card
picture          200 px copy of the whole work  the 9:19.5 crop
colour           p95 of per-pixel chroma        MEAN chroma, after treatment
brightness       median per-pixel luma          luma of the MEAN RGB, after treatment
```

"After treatment" is what makes 18 and 65 readable at all: on `/dark` the flat
settings are take-out-55%-of-the-colour and darken-to-×0.80, so the card shows
`chroma · 0.45 · 0.80` and `luma · 0.80`. Niobe's crop is chroma 15.3 and luma 64
untreated, which is why its card reads **colour 6 · bright 51**.

The 628 survivors on that surface:

```
                 10      50      90     max
crop luma        74     115     154     197
  × 0.80         60      92     123     158
crop chroma      18      30      47      71
  × 0.45 × 0.80   6      11      17      26
```

## What each one costs

**Colour 18 is a gentle ceiling.** At the flat settings 587 of 628 works are
already under it; it reaches down and touches 41. The ceiling slider's own default
was 11, so 18 is *looser* than what the page was already doing.

**Brightness 65 is not gentle.** Only 92 of 628 are already under it. As a ceiling
it pulls 536 works down — every one of them dimmed harder than the flat 0.80 to
get there. As a **drop** it deletes those 536 and leaves 92.

```
                              keeps
colour  <= 18   (ceiling)     587 untouched, 41 pulled down
bright  <= 65   (ceiling)      92 untouched, 536 pulled down
bright  <= 65   (drop)         92 of 628   — 15% of the selection
```

That is the number worth pausing on. The drop is an 85% cut, and it is a cut on
top of a chain that already went 1193 → 628.

## Does it agree with what Charlie actually picks?

Seven of the handpicked works in `handpicked-overrules.json` are on the sheet, so
they can be checked against both numbers on the right surface:

```
Mount Vesuvius at Midnight                bright  43 ok   colour  7 ok
Claude Lorrain — Paysage avec Jacob       bright  43 ok   colour  3 ok
Jan van Huysum (zugeschrieben) —          bright  43 ok   colour 10 ok
  Blumenstück
John Martin 001                           bright  43 ok   colour 11 ok
Otto Marseus van Schrieck — Forest floor  bright  45 ok   colour  9 ok
Jan van Huysum 001                        bright  45 ok   colour  8 ok
Two Hummingbirds and an Orchid            bright 141 DROP colour 13 ok
```

**6 of 7 on brightness, 7 of 7 on colour.** The one casualty is Two Hummingbirds
and an Orchid, and it is the outlier on nearly every other measure too — it is the
only daylight picture in that group. The Destruction of Niobe's Children, which
Charlie called a very good wallpaper on the same day, sits at bright 51 · colour 6
and passes both comfortably.

So the numbers are calibrated to his taste, and the price is known and named:
the drop costs the hummingbirds and any other bright picture he has liked.

## The one thing that has to be decided first

**"Brighter than 65" — measured before or after the flat dim?** The card shows the
treated number, so the natural reading is *after*. But the sentence can be read
the other way, and the two readings are not close:

```
drop on the treated number  (luma × 0.80 > 65)   keeps 92 of 628
drop on the untreated crop  (luma > 65)          keeps 38 of 628
```

38 works is not a gallery. This note assumes the treated reading throughout, and
that assumption should be confirmed before anything is built.

A second, smaller question: a ceiling and a drop at the same value on the same
axis cannot both bind — once the bright works are gone, nothing is left for the
ceiling to pull down. Either the drop replaces the brightness ceiling entirely, or
the two thresholds are meant to be different numbers.

## Why a brightness gate is the right shape, independent of the value

The box measures `luma` and its bounds are `[20, 200]`, which is no ceiling at all
— 200 is above the brightest work in the pool. Meanwhile darkness is the single
strongest thing Charlie's handpicked works have in common: across 18 of them their
median sits at the 93rd percentile of the survivors for share-of-picture-below-64,
and at the 4th percentile for median luma. The measurement is in
[2026-08-19-what-makes-niobe-good.md](2026-08-19-what-makes-niobe-good.md).

So this is not a new axis. It is turning on a gate that has been measured and left
open the whole time.

## Status

Written down, not built. `sheet.mjs`, `funnel.mjs` and the box are untouched, and
the ceilings on `/dark` still hold their computed defaults (colour 11, brightness
92). The open task is in [TODO.md](../TODO.md).
