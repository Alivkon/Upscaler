# The box's caption floor cannot reject anything

18 August 2026. Charlie, looking at the sheet: the Heade hummingbirds passed a
brightness filter, and their pale ground darkens badly, the way the light-paper
prints did that we already rejected.

Both halves are right, and they are two different problems. The first has a
one-line answer. The second is the one `2026-08-17-dimming-for-icon-legibility.md`
already says cannot be measured, and re-asking it on 107 works does not change
that.

---

## The filter that should have caught it is switched off

`cap` in the numerical box is `contrastWithWhite(brightest caption cell)` on the
work dimmed by 0.8 — it *is* the brightness filter, and it is the right measure.
The snapshot box admits `cap` in `[1, 11]`.

```
contrastWithWhite(255) = 1.0000     pure white
contrastWithWhite(0)   = 21.0000    pure black
```

**`cap` can never leave `[1, 21]`, so a floor of `cap ≥ 1` is the identity.** It
rejects nothing and never could. Only the ceiling of 11 does any work, and it
rejects for being too *dark*. The five works the funnel logged under `cap` were
all rejected by that ceiling.

`.big.mjs` — the tighter harvest variant — sets `CAP_MIN = 3.05`, which is a real
threshold: contrast 3.05:1 needs the brightest caption cell at 147 or below.

"Two Hummingbirds and an Orchid" measures `cap 1.77`, `luma 180`. Against
`cap ≥ 1` and `luma ≤ 200` it passes both. Against `CAP_MIN 3.05` it dies, and so
does every work Charlie has pointed at:

| work | cap at ×0.80 |
|---|---|
| Heade, Two Hummingbirds and an Orchid | 1.77 |
| Kensett, Lake George (three versions) | 2.57 · 1.82 · 2.64 |

**`cap ≥ 3.05` rejects 47 of 107.** That is not a small trim — it is 44% of the
pool — but it is the pool telling the truth about itself, not a new opinion.

## The surface it is read on barely matters

Worth settling, because the sheet reads it somewhere new:

```
cap < 3 on the 9:19.5 crop     47 of 107
cap < 3 on the whole frame     44 of 107
box's own cap (200 px, frame)  47 of 107
```

Three surfaces, the same answer. The crop is not what makes the pool look bad,
and the earlier note's caution that crop and box numbers "are not
interchangeable" was wrong for `cap` specifically — it is corrected there.

## The pale ground does not separate, again

The second half of the complaint — that a big flat pale area goes dirty rather
than shaded — is not the same as illegibility, and it needs its own measure.
`2026-08-17-dimming-for-icon-legibility.md` tried two, the share of light
low-saturation pixels ("bare paper") and the width of the light histogram peak
("one big flat patch"), and found the ranges fully overlapping. That was 16
works, and it was asking whether the *tilt* was safe. This is a different
question on 107 works, so it was worth re-asking.

Share of pixels above luma 170 with chroma under 30, on the crop:

```
the 9 Heade flower-and-hummingbird works   10/50/90:   2.5  15.9  41.8
the other 98                               10/50/90:   0.0   2.3  25.0
```

Overlapping, and the top of the list settles it: the palest works in the pool are
Kensett's Lake George at 61%, Hammershøi at 48% and John Martin's Plains of
Heaven at 47% — lit scenes with bright water and sky, not paper. **The measure
finds bright, not flat-and-papery.** The old note's conclusion stands: the
difference is what is depicted, and that is a catalogue field, not a measurement.

It does not matter here, because it buys nothing over `cap`. Every work at the
top of the pale list is already below 3:1 — the pale ones are exactly the ones
with no dark cell to put a caption on. One threshold covers both complaints.

## The pool is not unusually bright — the shipped set is

```
median luma       10th / 50th / 90th
241 published plates      52 / 114 / 195
107 oils survivors        42 /  82 / 156
```

The candidates are *darker* than what is already published. Which fits: the
published set is where the works being removed for brightness still live.

## An unresolved discrepancy, flagged not fixed

`2026-08-17-flat-dimming.md` reports that plain ×0.80 leaves **0** works below
3:1 across a 1451-work pool. Direct measurement here gives 47 of 107, using
`cells()` and `contrastWithWhite()` from `dimming.mjs` unchanged, and the numbers
agree with the box's own `cap` column to two decimals. Both cannot describe the
same thing.

The published plates are not on this disk, so this could not be checked against
the shipped set. Worth resolving before `CAP_MIN` is turned on, because if the
shipped gallery really does contain works below 3:1, the threshold is a bigger
change than it looks.

The same note already reaches the conclusion Charlie arrived at independently:
one of his own samples gives 2.35:1 even at ×0.70, and *"works he likes are
sometimes so light that captions cannot be read at any reasonable dimming —
that is not about the rule, it is about not every work being suitable for a home
screen."* This is a selection threshold, not a treatment one.

## On the sheet

`hide caption under 3:1` on the preview sheet applies the cut live: 107 → 59 at
the snapshot settings. It recomputes with the sliders, so a deeper brightness
setting moves the count.
