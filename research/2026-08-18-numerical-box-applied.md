# Numerical box applied to the oils-preview pool

18 August 2026. The oils-preview pool went through the full pipeline of
`2026-08-18-pipeline.md`, including step 5, which had never actually run. Three
artists were added to the pool. Records what the box removed and three bugs it
exposed.

---

## Where the box actually lives

Step 5 is described in `2026-08-18-pipeline.md` but its thresholds are not in that
document, nor anywhere in `scripts/`. They are in two untracked scripts at the repo
root, and the two do not agree:

| | source | thresholds |
|---|---|---|
| `.big.mjs:8` | relaxed until the handpicked samples passed with margin | `LUMA_MAX=85 WARM_MAX=0.32 CAP_MIN=3.05 P95_MIN=35 OFF_MIN=40` |
| `.collections.mjs:25`, `.funnel.mjs:18` | "коробка со снимка Charlie", 17.08.2026 | `warm [-1.1,0.47] luma [20,200] off [15,180] p95 [10,170] cap [1,11] busy [0,70] aspect [1,2.8]` |

The snapshot box was used here: `.funnel.mjs` is the whole selection in order, and
`.collections.mjs` states the two carry the same numbers. `.big.mjs` is a one-sided,
tighter variant from a harvest run.

**Two measuring conditions travel with the numbers and cannot be dropped.**
Measurement is on a copy resized to **200 px**, and caption contrast is read off the
work already dimmed by **0.8**. `.collections.mjs` gives the reason for 200 px:
collections arrived at different sizes (Met ~600 px, Cleveland ~830, AIC and SMK
1000) and busyness by luma is sensitive to size, so measuring as-is would compare
collections by photograph resolution. Every threshold on the selection sheet stands
at 200 px.

This matters more than it sounds. An earlier pass in this session ran busyness on
full-size thumbnails against a `BUSY_MAX` of 120, which is not the same scale as
`busy ≤ 70` at 200 px, so it rejected almost nothing.

**Calibrate against the reference works, not against what has shipped.** Before
finding these files, the threshold was estimated from the luma of the 241 published
plates; that suggested a cutoff near 120–180, because the published set still
contains works being removed for being too bright (`grasshopper-on-pomegranate` at
238, the Audubon plates at 221–236). Shipped output is not the reference set.

---

## Aspect is measured but not enforced

`aspect [1, 2.8]` rejects 208 of 278 — it demands portrait orientation, and the pool
is landscape-orientation paintings. Cropping to phone shape is step 10 and has not
run. Enforcing an orientation gate before the crop that creates the orientation would
reject the pool for failing a test it has not been given yet. Reported per work in
`dark.html`, not applied.

---

## Result

```
278 survivors in
 −91  numerical box (warm 44 · busy 37 · off 16 · luma 7 · cap 5 · p95 3, overlapping)
 − 7  frame_gate
 −71  Qwen, people
 − 0  Qwen, frame
 − 2  verdict unreadable
=107 survivors
```

Counts per measure are solo effects: a work outside two ranges is counted twice.

Added to the pool from Wikimedia Commons, public domain only: Claude Lorrain,
Richard Wilson, Carl Rottmann — 476 works fetched, 406 after the metadata filters,
65 reaching Qwen, 4 surviving (3 Rottmann, 1 Wilson). Claude Lorrain finished with
none: his surviving landscapes carry figures, which is what step 8 is for.

---

## Three bugs the run exposed

**A blind work was passing every gate it could not be measured by.** 93 survivors had
no downloaded image; busyness, frame_gate and the box all silently skipped them and
they stayed in. This is the failure `.funnel.mjs` already warns about in its own
comment — a skipped measurement is the absence of an answer, not the answer "fine".
All 93 were downloaded (2 lanes, 350 ms gap; 6 lanes gets rate-limited by Wikimedia).

**An off-vocabulary Qwen reply was read as a pass.** `parseWords` recognises
SUBJECT / TINY / NONE and returns `figure: null` for anything else. Qwen answered
`HUMAN CLEAN` for two Hammershøi portraits and `DEITIES FRAME` for one more work;
`null` is neither 1 nor 2, so the reject rule missed it and two portraits reached the
sheet. `figure === null` is now a reject. Three of 425 cached answers are
off-vocabulary — all three name a person, so none is a false reject.

**`desaturate.mjs` and `dimming.mjs` are libraries, not CLIs.** Invoking them as
`node desaturate.mjs in out` writes nothing and exits 0, so the treatment step was a
no-op and 56 of 109 works were shown untreated next to treated ones. They are now
called in process, in the order `.desatthumbs.mjs` sets out: colour first, then
brightness — dimming solves its strength from the pixels that will be shown, and the
tilt returns chroma to the image that resulted, so deciding either from the
pre-desaturated pixels would hand back exactly what desaturation removed. 107 of 107
treated, 35 of them already legible enough that dimming was skipped.

---

## The dimming tilt turned works red; it is off for this sheet

Van Schrieck's `Still-life with Plants and Reptiles` came out rust-red on the sheet
while the source is a neutral dark green-brown. Desaturation was not the cause — it
barely touched the work (`k = 0.985`, mean R−B 15.3 → 15.2). The dimming tilt was:

```
tilt          = [1.3054, 0.9263, 0.8310]   clamped: true
final factors = [1.1226, 0.7966, 0.7146]   red multiplied up, blue pushed down
mean R−B        15.2 → 33.3                plain dimming, no tilt: 13.1
```

Across the 72 survivors that get dimmed at all, the tilt hits its limit on 15 and at
least doubles the warmth of 12. The largest: Lane's `Boston Harbor` 49.8 → 94.9,
Heade's `Marsh Scene` 60.2 → 97.2.

This is the failure mode `2026-08-17-dimming-for-icon-legibility.md` already records.
The tilt was tuned on Audubon paper — an object on a blank sheet — and that note
states plainly that good and bad cases could not be separated numerically (three
measures were tried; the ranges fully overlap), because the difference is whether the
work is a lit scene or an object on paper. Van Schrieck's forest floor and Lane's
harbour are lit scenes.

**The tilt is free to switch off.** That same note observes that legibility never
depends on the gain, since the tilt is normalised by luma. Measured here over the 72:
caption contrast falls below 3:1 for **zero** works with the tilt and **zero** without
it. It was therefore removed from the treatment for this sheet — a colour shift that
buys no legibility. No per-work rule is attempted, because the note establishes that
one cannot be measured. One line in `box.mjs` restores it.

## Known limitations

- The box thresholds are one person's slider positions from 17.08.2026, recorded as
  "the sliders at which selection seems to work". They have no precision/recall
  against hand labels, and this run does not add any.
- Two artist names appear twice in the pool with different spellings
  (`Böcklin` / `Arnold Böcklin`, `van Huysum` / `Jan van Huysum`), so their works are
  split across two sections on the sheet.
- Qwen's NONE class was measured at 75–87.5% precision on 16 works
  (`2026-08-18-eye-check-of-the-22.md`); the 107 survivors are still subject to the
  step 11 eye check.
- Step 10, crop and recheck, has not run on the 7 frame_gate rejects.

## Files

Working scripts are in `/tmp/oils-preview/`, outside the repository:
`fetch_new.mjs` (Commons fetch + free filters), `dl_all.mjs` (image for every
survivor), `box.mjs` (steps 5, 7, 8, 9, treatment, sheet). Sheet at
`/tmp/oils-preview/dark.html`.
