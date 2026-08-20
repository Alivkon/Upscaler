# The harvest filter as it actually stands

19 August 2026. Charlie asked what the current filter is — "just sepia for the
box? what else, frames?". This is the chain as it runs today, with which parts
do work and which are decoration. Pipeline order is in
`2026-08-18-pipeline.md`; this records the *effective* filter, which is not the
same thing.

Reference set the thresholds answer to: `references.json`, eight paintings.

---

## The chain

| # | gate | cost | binds? |
|---|---|---|---|
| 1 | API query — work type at source | free | yes |
| 2 | Name filter — reject real-person portraits | free | yes |
| 3 | Object filter — textiles, vessels, furniture | free | yes |
| 4 | Download thumbs, ≥ 500 px | free | — |
| 5 | Numerical box — 7 measures | free | **only 3 of 7** |
| 6 | Monochrome filter — medium text | free | yes |
| 7 | `frame_gate.py` — pixel rule | free | yes |
| 8 | Qwen — people | paid | yes, hardest cut |
| 9 | Qwen — frame | paid | yes |
| 10 | Crop + recheck | free if cached | not run |
| 11 | Eye check | human | not run |
| 12 | Download masters | paid | finalists only |

## Step 5: three of its seven measures do anything

Solo rejections over the 278-work oils run (overlapping — a work outside two
ranges is counted twice):

```
warm  ≤ 0.47        44      the box's real work
busy  ≤ 70          37      second
off   [15, 180]     16      "sepia" — third, not first
luma  [20, 200]      7
cap   [1, 11]        5      ceiling only; the floor cannot fire
p95   [10, 170]      3
aspect [1, 2.8]      —      measured, never enforced
```

So: **warmth and busyness**, with the non-sepia colour measure third. Charlie's
guess that the box had become "just sepia" is close in spirit — most of it is
inert — but names the wrong survivor.

### The three that are inert or nearly so

- **`cap ≥ 1` cannot reject anything.** `cap` is `contrastWithWhite()`, whose
  range is exactly `[1, 21]`. The floor is the identity. Only the ceiling of 11
  fires, and it rejects works for being too *dark*. Detail in
  `2026-08-18-inert-caption-floor.md`.
- **`luma ≤ 200`, `p95 ≤ 170`, `off ≤ 180`** are the widened ends. Charlie,
  17 August: *"i thought i widened it almost completely except i think warm or
  sepia? the rest is only a box because that's the range you gave me!"* That is
  exactly what the numbers show — the snapshot box is one binding slider and six
  parked ones.
- **`aspect` is measured and reported but never applied.** It would reject 208 of
  278; the pool is landscape paintings and the crop that creates the orientation
  is step 10.

### Never applied at all

- **Year gate 1200…1960**, present in the 17.08 snapshot, absent from every box
  in code.
- **`luma_p95 ≤ 190`**, proposed 18 August after Carlsen's "Wood Interior" passed
  every field at median luma 163 while sitting at luma p95 189 — bright
  everywhere with no dark anchor. Never wired in.

## What to change, and what it costs

The eight references top out at **median luma 78**, and every work Charlie has
called too bright sits above it. Luma is the measure that separates them; `cap`
is not.

```
luma <= 78    hides 62 of 107   loses none of the eight   takes all 9 flagged works
luma <= 85    hides 46 of 107   loses none of the eight   takes 8 of 9  (.big.mjs's value)
luma <= 100   hides 31 of 107
luma <= 120   hides 20 of 107
```

`.big.mjs`'s `LUMA_MAX = 85` is the reference envelope rounded outward. It is the
one bound of that box worth taking; its `CAP_MIN = 3.05` is not, because it drops
Ruisdael (2.54) and Claude Lorrain (2.46) from the eight. The safe caption floor
is 2.46, and at 2.46 it catches only 3 of the 9 flagged works — which is why the
lever is luma.

Take the two bounds separately. `.big.mjs` as a package keeps only 3 of the
eight, and the full envelope of the eight passes just 7 of 107 — it is a taste
sample, not a specification.

## Frames — the answer to "what else, frames?"

Yes, twice, and the second is paid:

- **`frame_gate.py`** (step 7), a pixel rule: precision 91.4%, recall 98.7%. Needs
  ≥ 500 px — at 200 px recall falls to 96.6% because a shallow mat is a pixel and
  a half.
- **Qwen frame** (step 9), and the strategy depends on the medium. For **oil** it
  runs regardless of the pixel verdict and either signal rejects, because
  frame_gate misreads a painted niche or a dark canvas edge as a mat. For
  everything else frame_gate's "clean" is trusted and Qwen is only called on a
  "frame" verdict, which can overturn it.

On the 107-work oils run frame_gate took 7 and Qwen-frame took 0 — the people
gate is the expensive cut, at 71.

## What has no measured precision

Nothing here does. `refs.json` marks 12 works `R` against 737 `C`, and `C` means
*candidate*, not *rejected*. There are no negative labels anywhere in this
pipeline, so recall against the eight is the only quality any gate can be scored
on today. `frame_gate.py` is the exception — it has hand labels and both numbers.
