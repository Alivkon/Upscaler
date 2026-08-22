# The picking sheet, and what full size showed about the frames

20 August 2026.

> make a new sheet, works in good resolution, both full version and cropped
> vertical, with a checkbox and a field to gather ids, so i can select ones i like
> manually, everything we have on dark now, don't apply any edit except the auto
> one. […] build the frames removed.

`pick.html` — all 628 survivors, each shown twice, carrying the grey balance and
nothing else, frames removed.

## What is on it

Each card is one work: the **whole picture** at up to 1100 px on the long side,
and next to it the **9:19.5 phone crop** at up to 640 px wide. Click either to see
it as large as the screen allows. A checkbox on the caption, and the ids of
everything ticked land in the field in the header, ready to copy.

Nothing is enlarged, and this is the sheet where that starts to bite:

```
whole work   width 10/50/90:  600 / 1100 / 1100 px   — 221 of 628 below full size
phone crop   width 10/50/90:  218 /  452 /  640 px   — 369 of 628 below full size
```

**More than half the pool cannot fill a 640 px-wide phone crop.** That is not a
fault of this sheet; it is the resolution the sources have, and a vertical slice
of a landscape is by definition a fraction of the file's width. Worth knowing
before a work is picked on the strength of a crop that is 218 px wide.

The selection survives a reload — it is kept in `localStorage` under
`pick-selection-v1`, as **refs and not indexes**, so it still means the same
pictures if the sheet is rebuilt in a different order. Pasting a list back into
the field re-ticks it, so a selection can be carried in and out by hand.

Two filters, each with one job: **only my picks**, for reviewing a selection at
the end, and **only de-framed**, for checking what the frame cut did.

## The correction

In `research/2026-08-20-cutting-the-frame-off.md` I wrote that the heaviest cut —
Courbet's *Landscape near Maizières*, 57% of the area — took its gilt frame off
cleanly on all four sides. **That is wrong.** At 1100 px the frame is plainly
still there. What the 57% removed was the museum wall around the frame.

I judged it at 560 px on `frames.html`, where a gilt frame two hundred source
pixels thick renders about fifteen pixels wide and reads as a border on the
image rather than as a frame in the photograph. The lesson is not about frames:
**a cut cannot be judged at a size where the thing being cut is invisible.**

## What the 35 actually look like at full size

Counted by eye on `pick.html` with **only de-framed** on:

```
23  clean            16 woodblock prints, Bierstadt, 3 Heade, 2 Claude Lorrain, 1 Wilson
 2  margin left on   Hokusai Lumber Yard, Yoshida Arashiyama — a strip of paper
10  frame left on    Hammershøi · both Friedrichs · Courbet · Claude Lorrain's
                     Ulysses · four of the six Richard Wilsons · Wilson's Minerva
                     Medica, where the pink mount survives
```

So the honest summary is the opposite way round from the one I gave:

> **The detector reliably removes the wall around a frame. It rarely removes the
> frame.** Where it works completely is the woodblock prints, whose margin is flat
> paper with a genuinely straight printed edge — 16 of 18 of them are clean.

Still true, and it is the thing that matters most: **nothing has been cut into a
painting.** Every failure is frame left on, never picture taken off.

## Why, in one sentence

The same cause named in the earlier note, now visible as the dominant one rather
than an occasional one: **a painting photographed at a slight angle has a frame
whose inner edge is not level with any row of pixels.** Look along the left side
of the Courbet at full size — the frame's inner edge slants several pixels across
the height. The detector asks "on what share of the columns is there a big step
at this exact row", and a slanted edge answers "a few percent" at every row.

The outer edge — frame against wall — is far more contrasty and often lands on a
crop boundary of the museum's own photograph, so it is the one that fires. Hence:
wall removed, frame kept.

The fix is to let the edge slope: search a small range of angles, take the best
straightness over all of them. That is not done here, because it changes the
images on a sheet that is about to be used, and because the current state is
the safe one.

## Files

- `/tmp/oils-preview/pick.mjs` → `pick.html` + `pick/<safe>-full.jpg`, `-tall.jpg`
  (1256 files, 193 MB). `node pick.mjs 40` builds a 40-work sheet for a quick look.
- `/tmp/oils-preview/pick.json` — per work: ref, artist, title, source size,
  rendered widths, and how many sides the frame came off.
