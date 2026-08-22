# The 3400 cap, and why the big TIFFs kept dying

22 August 2026.

> scenes from the tale of genji - its not big enough for my phone is it?

It was not: the phone crop was **698 × 1513**, against a floor of 1320 × 2868.
Not the painting's fault. Cleveland's `_print.jpg` is capped at 3400 on the
**long** side, and Genji is a screen painting at 2.25 : 1, so the cap landed on
the width and left 1513 px of height — and height is the only thing that binds a
9 : 19.5 crop.

All thirty Cleveland works in the collection were built that way. Nine fell under
the floor; the other twenty-one cleared it only because they are vertical, so the
cap fell on their height instead.

The real scan is 21566 × 9599. Eight of the nine are now rebuilt from it:

```
             was            now             plate
vl-0132   778×1686      1772×3840       7745×3840
vl-0134  1054×2284      1772×3840       5716×3840
vl-0135   698×1513      1772×3840       8627×3840   ← Genji
vl-0136   735×1593      1772×3840       8194×3840
vl-0137   727×1576      1772×3840       8280×3840
vl-0149   735×1593      1772×3840       8197×3840
vl-0164  1293×2802      3015×6533       3015×7926
vl-0165  1115×2416      1640×3553       1640×5000
vl-0166   709×1536      709×1536        1733×1536   ← cannot be fixed
```

vl-0166's `_full.tif` **is** 1733 × 1536. That is everything Cleveland has, so
it will never make a phone wallpaper. It is not a download away; it is out.

4.3 GB fetched, and the caption on the sheet now says `full master` instead of
`3400 copy` for those eight.

## Why the download kept failing silently

The first three attempts died with **exit 143 and not one line of output** —
SIGTERM, no stack, no message. That is the OOM killer, and it is the worst kind
of failure to read because the process never gets to say anything.

The arithmetic: `_full.tif` for the peony screen is 1.1 GB on the wire. It was
being fetched into a Buffer (1.1 GB), handed to sharp, decoded (27511 × 13641 × 3
= **1.1 GB of pixels**), and re-encoded into another buffer. Three to four
gigabytes for one work, on a machine with four available — most of the 30 GB is
held by a browser, Steam, and the 8 GB tmpfs that `/tmp` actually is.

`museum.mjs` now streams a TIFF response straight to a temp file and reads it
back with `sequentialRead`, so libvips works in strips and holds a window rather
than the whole painting. The temp file lands on the 600 GB disk instead of in the
memory there isn't. Everything else still goes through a buffer — those are
megabytes.

Worth noting for the next reader: `sequentialRead` is not an optimisation here,
it is the difference between working and being killed without a message.

## What is still on the 3400 copy

Twenty-two works: the remaining twenty-one Cleveland verticals plus vl-0166,
which has nowhere else to go. The twenty-one clear the phone floor, so nothing is
broken — but their **plates** are capped at 3400, which means no 4K desktop crop
and no headroom. About 3.4 GB to finish the block. None of them are published, so
it is not urgent, and it is a decision rather than a step.

Nothing live is affected. All 115 published works were checked against the floor:
none is built from a 3400 preview, one (vl-0236, 1311 × 2841) is 27 px under the
keep floor from its own full scan because the painting is wide, and four sit
between the keep floor and the 1440 × 3200 target.
