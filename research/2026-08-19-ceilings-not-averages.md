# Ceilings, not averages — and nothing on the sheet may add

19 August 2026. Prompted by Charlie looking at the "even out" sliders on `/dark`
and saying they were not what he asked for.

> even out sliders on /dark are not correct, that's not what i meant, it should
> never brighten or lighten images, we get to the same level of darkness by
> setting some level — okay it's not SAME level it's max level of brightness, so
> super dark stay where they are, and bright ones approach the X level of
> darkness. and slider controls X

and, separately:

> for color brightness and warmth, the right value is 1, nothing ever becomes
> warmer or brighter or more colored than the original

Both sentences say the same thing from two directions. The sheet is allowed to
take away; it is not allowed to give back.

## What "even out" was doing, and why it was wrong

The equalise sliders solved each work onto the **pool median** of its quantity.
At 100% every work came out at the same brightness — which means the dark half of
the pool was *multiplied up* to get there. On a wallpaper sheet that is exactly
backwards: a dark painting is not a defect to be corrected, it is the thing the
gallery is selecting for. The slider was fixing the wrong end.

It was also mathematically capable of anything. `b = dim · (median/luma)^e` has no
ceiling in it; a work at luma 20 with a pool median of 92 got a multiplier of 3.7.

## What replaced it

Each of the three quantities now has two sliders:

| | flat | ceiling |
| --- | --- | --- |
| Colour | take out 0–100% | and no work more colourful than X |
| Brightness | darken everything to ×0.30–×1.00 | and no work brighter than X |
| Warmth | cool everything by 0–60 | and no work warmer than X |

The ceiling is a `min` and nothing else. A work already under X leaves the solve
with its multiplier untouched — not nudged, not scaled, **identical**. A work
above X is divided down until it lands on X. That is Charlie's sentence
implemented literally: super dark stay where they are, bright ones come down to X,
and the slider is X.

Measured on the pool, brightness ceiling at three positions, five works sampled
across the whole luma range:

```
untreated luma    38.7   39.1   115.3   185.6   197.2
ceiling off       30.9   31.3    92.3   148.5   157.7    (flat x0.80 only)
ceiling 60        30.9   31.3    60.0    60.0    60.0    <- the two dark ones
ceiling 30        30.0   30.0    30.0    30.0    30.0       are untouched
```

## Nothing may add

Every knob is capped at 1 and every solve is a minimum:

- **colour** — `satAmt` removes; the ceiling can only remove more. `k ≤ kBase ≤ 1`.
- **brightness** — the flat slider now tops out at **×1.00** instead of ×1.20, and
  the ceiling can only lower it further. `b ≤ dim ≤ 1`.
- **warmth** — the shift slider is now **cool only**, 0 to 60, no warm half.

Warmth also changed *mechanism*, which matters more than the range. It used to be
`[1+t, 1, 1−t]`: cooling by that matrix multiplies **blue by more than 1**, so
every cooling step brightened the blue channel. It is now `[wR, 1, 1]` with
`wR ≤ 1` — cooling takes red out instead of putting blue in, and no channel is
ever multiplied above 1. R−B reaches a target by setting `R' = target + B`, so it
is still a division rather than a search.

### Verified rather than asserted

The invariant was checked in the page, by reading the `feColorMatrix` actually
installed on each of the 628 works, applying it to that work's mean RGB, and
comparing against the untreated value. Across five slider settings, from
everything-off to every-ceiling-at-the-floor:

```
                            max luma gain   max warmth gain   max colour gain
everything off                      0.000             0.000            0.0000
defaults                           -7.733            25.065           -0.8611
all ceilings hard down            -33.667            26.580           -1.0000
max flat cuts                     -27.067            32.930           -1.1508
mid                                -5.122            -5.350           -0.3951
```

Luma and colour never gain, under any setting. Warmth appears to.

### The warmth "gain" is colour removal, and it is on the page

`saturate(k)` scales R−B by exactly k. For a painting with a **blue cast**, R−B is
negative, so scaling it by k < 1 moves it *toward zero* — which the R−B measure
reads as a rise. Nothing was warmed; a blue cast was taken out, which is what the
colour slider is for.

Counted at the defaults:

```
works with a blue cast (R < B)                46 of 628
works whose R−B rose                          46          <- exactly the same 46
of those, works ending on the warm side of 0   0
```

Worst four: Westminster Bridge −32.9 → −7.9, Rottmann's Sikyon −27.5 → −6.1,
Claude Lorrain's harbour −19.6 → −5.7, the Jacob landscape −21.5 → −7.7. All still
cold, none crossing neutral. (Those counts were taken on the 400 px crops; on the
larger sources the same test gives 45, the same picture.)

This is **not** corrected, and the reason is worth stating: correcting it would
mean taking red back out of a work that has just had its colour removed, i.e.
re-bluing a painting to protect a number. The page reports the count live instead,
under the readout, in words. Both figures are recomputed on every slider move, so
if a setting ever does push a work onto the warm side of neutral, the line says so
rather than staying true by luck.

## The sheet now shows the whole selection

`/dark` read `survivors-box.json` — the 107 works `box.mjs` left on 18 August,
under a policy three of Charlie's four gate decisions have since replaced. It now
reads `survivors-funnel.json`, written by `funnel.mjs` at the end of its own chain:
**628 works**, the same list the funnel page's "survived everything" section shows.
One chain decides what "survived" means and one file records it, so the two pages
cannot drift.

Two things came with them:

- The **flag** each work carries out of the funnel is shown on its card —
  `figure to crop out` for the 102 staffage works, `no model verdict` for the 407
  nobody has asked about. A preview sheet that showed all 628 as approved would be
  misrepresenting two thirds of them.
- The **brightness cut** ("hide the bright ones") now starts at 200, i.e. **off**.
  At its old default of 85 the page would have opened with 403 of the 628 hidden,
  which is not a sensible first look at a selection that was just widened.

The header line — *Dark preview — 107 works, 9:19.5 crops, every setting applied
live* — is gone, at Charlie's request. The work count still appears in the readout
under the panel, so nothing was lost with it.

## Larger sources for all 628

`hires.mjs` was pointed at the new survivor list and re-run. It is idempotent —
anything already in `hi/` is kept — so the 107 already fetched cost nothing and
only the new works were downloaded, one at a time with a 1500 ms pause, free from
both museums.

```
521 fetched · 107 already there · 0 unavailable — 628 of 628, 1.1 GB
```

Not one work failed, which is worth recording: at 1500 ms Commons never rate-limited
the run, and the thumbnail-width rewrite with a fallback to the original upload
covered every URL in the pool.

What it bought, measured on the same 628 works before and after:

```
crop width, 10/50/90     before   127 / 175 / 480 px      70 of 628 at the full 480
                          after   222 / 458 / 480 px     297 of 628 at the full 480
```

331 crops are still under 480 px. Those are works whose original upload is itself
small — the crop is made at whatever the file can give and is **not** enlarged, so
a soft card on this sheet still means a small source rather than a soft painting.

## Files

- `/tmp/oils-preview/sheet.mjs` — the sheet. Ceilings, cool-only warmth, ×1.00 roof.
- `/tmp/oils-preview/funnel.mjs` — now also writes `survivors-funnel.json`.
- `/tmp/oils-preview/hires.mjs` — reads that file instead of `survivors-box.json`.
- Both pages are served by `python3 -m http.server 7723` from that directory.
