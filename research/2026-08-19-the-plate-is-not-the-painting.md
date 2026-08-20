# The plate is not the painting: a dropped colour profile under the whole box

19 August 2026. Found while measuring gallery works for
`research/handpicked-overrules.json`, not while looking for it.

## What happened

Ruin by the Sea, one of Charlie's eight reference works, reads

```
warm 0.466   on the 400 px plate in the harvest directory
warm 0.624   on the museum file the manifest says that plate came from
```

The box's one binding bound is `warm <= 0.47`. The same painting passes on one
surface and fails on the other.

## It is not the resize and not JPEG

Re-making a 400 px plate from the museum file reproduces the museum's numbers to
three decimals, at both 4:2:0 and 4:4:4:

```
vl-0226               warm    luma   p95   off    cap
museum file          0.621     47     73    70   6.32
re-made 400px 4:2:0  0.623     47     72    66   6.32
re-made 400px 4:4:4  0.623     46     73    68   6.33
the plate on disk    0.466     49     57    45   6.48   <- the odd one out
```

The difference is the **ICC profile**. The museum file carries one; the plate
carries none. The colour was never converted to sRGB, only relabelled — wide-gamut
numbers read as if they were sRGB, which comes out less saturated.

Split a 39-work Cleveland sample by whether the source carries a profile and the
whole effect lands on one side:

```
                             n    warm gap, plate vs museum, 10/50/90
source HAS a profile        24     −24.2%   −17.1%   −3.7%
source has no profile       15      −0.9%     0.0%   +0.4%
```

Zero of 39 Cleveland plates on disk carry a profile; 24 of the 39 sources do. The
same split appears on Wikimedia: in a 12-work sample, 5 sources carried a profile
and the three worst gaps (−14%, −22%, −29%) are all profiled sources, while the
unprofiled ones agree within 2%.

So this is not a Cleveland problem or a Wikimedia problem. It is the intake, and
it applies to whatever fraction of each source carries a profile — roughly 60% of
Cleveland and 40% of Wikimedia in these samples.

Which measures move, on the 39-work sample:

```
       plate − museum, median   median relative   lower on the plate
warm            −0.012              −4.7%             25/39
off             −3                  −5.6%             27/39
p95             −4                  −6.4%             35/39
luma             0                   0.0%              6/39
cap             +0.02               +0.4%             11/39
busy            −0.8                −1.9%             26/39
```

Brightness and caption contrast are untouched — they are luma, and the
misinterpretation is nearly luma-preserving. **It is a colour-only defect.** Every
colour bound in the box is affected and none of the brightness bounds are.

## Does it reach the gallery? No.

This was the first thing worth checking, because a duller shipped wallpaper is a
product defect and a duller research plate is only a measurement one.

The treatment is `saturate(k)` and a scalar dim. `warm = (R−B)/luma` is invariant
under the dim and scales by exactly `k` under the saturate, so dividing the
shipped plate's warm by a candidate source's warm recovers `k` — and `k` must lie
in [0.45, 1], because the treatment can only remove colour.

```
Interior of the Pantheon, 1974.39
  museum web file        warm 0.460
  harvest plate          warm 0.334
  SHIPPED gallery plate  warm 0.421

  implied k if it came from the museum file      0.916   plausible
  implied k if it came from a profile-stripped copy 1.263   impossible
```

**The shipped plates came from the correctly converted file.** `treatment.js` reads
its input with sharp, and sharp applies an embedded profile on read. Nothing that
ships is affected. The defect is confined to the research harvest — the surface
that decides what gets selected, not the surface anyone sees.

## So how much does it matter?

Three answers, in increasing order of seriousness.

**1. Verdict flips are rare.** In the 39-work sample, exactly one work crosses
`warm <= 0.47` when measured on the other surface, and none crosses `off >= 15`.
The error is one-directional — the plate reads cool, so the risk is works that
pass and should not, never the reverse. Counting the exposed band across the
current selection:

```
survivors with plate warm in [0.390, 0.470]     72 of 628
```

Those 72 are the ones a correction could move. At the sampled profile rates,
something like 30 of them would actually move. That is around 5% of the selection
— real, but not a reason to throw anything away.

**2. Two of Charlie's new picks are in that band.** John Martin 001 at warm 0.404
and the van Schrieck forest floor at 0.417 both pass with less room than the
correction is wide, so whether they really pass is not yet known. A third, the
van Huysum Blumenstück, is already decided the wrong way: it reads 0.335 on the
plate and **0.472 on its source**, which is over the ceiling. It passes today
because of the defect, not despite it.

**3. The bound itself is anchored to a mismeasurement, and this is the real
problem.** `2026-08-19-reference-sets.md` justifies the warm ceiling by saying it
"sits just above Ruin by the Sea at 0.465". That 0.465 is a profile-stripped
reading. On the museum's own file the work is at **0.624**. The ceiling does not
sit just above Charlie's reference work — it sits far below it, and would reject
it outright.

So the answer to "it's just 17%, can it cause larger issues" is: the percentage is
not the issue. The issue is that the one bound doing most of the box's rejecting
was placed against a number that is wrong, and the stated reason for putting it at
0.47 does not survive the correction.

There is a second, quieter version of the same problem. `references.json` records
`warm 0.465` for Ruin by the Sea — the plate reading — and `warm 0.419, off 89`
for the Pantheon, which matches neither the plate (0.334, off 19) nor the museum
web file (0.460, off 97) but the museum's **print** rendition. **The eight
reference works were not all measured on the same surface.** Their envelope is
therefore not a measurement of one thing.

## What has NOT been done

Nothing has been changed on the strength of this. No threshold moved, no plate
re-fetched, no reference value overwritten. In particular `references.json` is
untouched: overwriting a calibration number with a differently-sourced measurement
is how a reference set stops being one.

The options, cheapest first, all free:

1. **Re-fetch the 1193 plates converting to sRGB on the way in** and re-measure.
   Slow at a polite clock, costs nothing, and makes every column comparable.
   Sharp does the conversion by default on read — the fix is to not save an
   untagged intermediate.
2. **Re-measure the eight references on one surface** and rebuild the envelope.
   Eight files, minutes.
3. **Then, and only then, revisit `warm <= 0.47`.** It was already parked for a
   different reason Charlie gave — scans are often wrongly warm, and the measure
   cannot tell a warm painting from a warm scan. This adds a second reason to
   distrust the number and does not resolve the first.

## What I got wrong on the way here

I first reported this as a large systematic bias, on the strength of three works
that happened to be the tail. The median is −4.7%, not −17%; the −17% is the
median of the profiled subset only, and 15 of 39 files are unaffected entirely. I
also assumed JPEG chroma subsampling before testing it, and it was not that.

## Files

- `/tmp/oils-preview/iccprobe.mjs` — the 39-work comparison, writes `iccprobe.json`.
- `/tmp/oils-preview/gallerybox.mjs` — measures a gallery work against the box from
  the museum's own file.
