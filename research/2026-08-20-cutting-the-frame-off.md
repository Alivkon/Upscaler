# Cutting the frame off, without frame_gate.py

20 August 2026.

> can you also crop the frame out of framed ones? yourself, don't use deframe.
> actually first make a separate sheet with before and after removing frames.

> **Corrected the same day, at full size.** The eye check below was made on a
> 560 px sheet, where a gilt frame renders about fifteen pixels wide and does not
> read as a frame. At 1100 px on `pick.html` the Courbet still plainly has its
> frame, and so do nine other oil paintings. The reliable result is the woodblock
> prints. See `research/2026-08-20-the-picking-sheet.md`; the counts are there and
> the ones below are too kind.

**Short version: 35 of 628 works are cut, and looking at the worst of them, none
is cut wrongly. Several are cut only partly** — the detector finds two sides of a
frame and misses the other two. It errs by leaving frame on, never by eating
painting, which is the right direction for a first pass.

## Why not the row-mean method already written down

`TODO.md` records a method that worked on vl-0341: mean luma per row and per
column at full resolution, and the boundary is where the brightness settles onto
the painting's plateau. That works for a **canvas edge** — a pale strip of
unpainted linen, genuinely uniform along its whole length.

A frame is not uniform. It is carved, gilt, lit from one side, and often more
varied than the painting inside it. A mean says nothing about it.

## What a frame actually is, to a computer

The one thing a frame's inner edge has that nothing else in a photograph of a
painting has: **it is a straight line running the whole way across.** Content
makes edges too — a horizon, a wall, a column — but a horizon wanders by a few
pixels, so its step lands on different rows in different columns.

So the measure for each row `y` is not a mean and not a variance. It is:

> on what SHARE of the columns is the step from row `y` to row `y+1` large?

A frame edge scores near 1. A horizon scores low. That share is the whole
detector.

Two cues, both required:

1. a step of at least **26** levels of 255 across at least **55%** of the span;
2. the band being cut must **differ from the interior by at least 14** levels of
   mean luma.

The second exists to stop a dark sky at the top of a landscape reading as a
frame. A sky is the picture continuing; it matches the interior and is spared.

Three more rules, each of which was needed:

- **The innermost qualifying edge wins, not the strongest.** A frame usually shows
  two lines — the outer lip and the inner one — and cutting at the outer lip
  leaves the frame on.
- **A frame may not eat more than 30% of a side.** Above that the detector is
  reading the picture.
- **A frame is thick.** The first run over 120 works caught mostly 2–10 px of
  black scanner border, which is a perfectly straight edge and is not a frame.
  Anything thinner than **1.5%** of the side is left alone. Quietly shaving two
  pixels off every work in the pool would be a different and unasked-for change.

## What it found

```
35 of 628 works have an edge on at least one side
sides found:  0→593   1→9   2→10   3→7   4→9
area kept, 10/50/90:  80% / 92% / 98%
```

The heaviest cuts, and what they are:

```
57%  4 sides   Landscape near Maizières — Courbet          a gilt frame, whole
78%  4 sides   Musashino — Yoshida Hiroshi                 paper margin of a woodblock print
79%  4 sides   The Sumida River in the Mist — Yoshida      paper margin
80%  4 sides   Suzukawa — Yoshida                          paper margin
80%  4 sides   Golden Temple in Amritsar — Yoshida         paper margin
84%  2 sides   Ulysses Returns Chryseis                    a dark frame, two sides of it
85%  2 sides   Ida Hammershøi with a Teacup                a dark frame, two sides of it
91%  1 side    Temple of Minerva Medica — Wilson           the label strip under a drawing
```

Half of everything cut is a **Japanese woodblock print**, where the "frame" is the
paper margin around the printed block. That is the right thing to remove for a
wallpaper and it is worth knowing it is what the detector mostly does.

## Where it stops short

Checked by eye, the four most aggressive cuts:

- **Courbet, Landscape near Maizières** — ~~the gilt frame comes off cleanly on all
  four sides. Correct.~~ **Wrong.** What came off is the museum wall around the
  frame; the frame itself is untouched. Only visible above 560 px.
- **Ulysses Returns Chryseis** — left and right come off; top and bottom stay.
- **Ida Hammershøi with a Teacup** — bottom and left come off; top and right stay.
- **Wilson, Temple of Minerva Medica** — only the label strip at the bottom goes.
  The pink paper mount around the drawing survives.

The pattern is one failure, not four: **a frame photographed at a slight angle
has no straight row.** Its inner edge drifts a pixel or two across the width, so
the share of columns with a big step at any single row never reaches 55%. The two
sides that do get cut are the two that happen to lie square to the camera.

That is fixable — allow the edge to slope, or search over a small range of
angles — and it is not fixed here, because the cost of getting it wrong is eating
into a painting and this sheet has not been judged yet.

## The sheet

`frames.html`. Two piles:

- **cut** — before and after, side by side, **biggest cut first**, so a wrong cut
  is at the top where it will be seen rather than buried;
- **left alone** — all 593 of them as thumbnails, so a frame the detector *missed*
  can be found. A sheet of hits only looks identical whether the detector finds
  every frame or one in ten.

Both halves carry the grey balance and nothing else, so the two images in a pair
differ by the crop alone.

## What this does not do

- **Nothing is cropped anywhere else.** `frames.json` holds the boxes; no plate,
  no catalogue entry and no crop on `/dark` uses them.
- **`frame_gate.py` is untouched and unused here.** That script answers "does this
  work have a frame", which is a gate, and a gate throws the work away. This keeps
  the work and removes the frame. The two do not share code and should not.
- **No hand labels.** Nobody has marked which of the 628 are framed, so there is
  no precision or recall here — only the sheet, and the fact that the eight
  heaviest cuts were checked one at a time.

## Files

- `/tmp/oils-preview/frames.mjs` — the detector; `node frames.mjs <ref>` prints one
  work's straightness profile for all four sides.
- `/tmp/oils-preview/framesheet2.mjs` → `frames.html` — the sheet. Named for the
  `.framesheet.mjs` already in the repo root, which is a different sheet about a
  different question.
- `/tmp/oils-preview/frames.json` — per work: sides found, cut in working pixels,
  the box in source pixels, the share of area kept.
