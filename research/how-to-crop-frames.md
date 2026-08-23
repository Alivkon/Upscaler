# How to crop frames

Physical frame borders show up as dark or coloured bands at the edges of the plate.
This removes them so the crop window doesn't eat into painted canvas.

**By hand only.** The automatic detector was retired on 23 August 2026: it found
the wall around a frame reliably and the frame itself rarely, and on a picture
shot slightly off-square it found nothing at all — 10 of 33 oil paintings it
"cut" still had their frames. It never touched a plate; `frames.json` stayed a
draft. Why it didn't work: `research/2026-08-20-cutting-the-frame-off.md` and
`research/2026-08-20-the-picking-sheet.md`.

## 1. Measure

Open the frame ruler:

```
file:///home/charlie/repos/Upscaler/research/crop-ruler.html
```

Or regenerate it (picks up new works):

```
node scripts/research/crop-ruler.mjs
```

The card shows the **whole plate**, 960 px wide, with a ruler on each side.
Hover near an edge — the label next to the cursor shows the distance from that
edge in full-res plate pixels. Click to record it to the list panel
(bottom-right). The tool snaps to whichever of the four edges is nearest.

To inspect only specific works:

```
node scripts/research/crop-ruler.mjs --only=vl-0352,vl-0356
# writes research/crop-ruler-only.html
```

### Where to look first

```
node scripts/research/edge-bands.mjs      → research/edge-bands.html
```

The outer 8% of all four sides of every plate, laid flat with the plate's cut
edge always along the bottom of the strip. A frame reads as an even ribbon
running the length of that edge. It also marks sides where a brightness step
sits at the edge — **treat those marks as noise until the strip agrees with
them.** On the 23 August run it flagged 41 works of 107, and the top-ranked ones
were skies and shadows, not frames. The strips are the point; the marks only
decide the order.

Ground truth exists for exactly one work. On vl-0151's four rebuild states the
rule found 5 framed sides of 7, understated every width (28 where the answer was
48), and raised no false alarm on 9 clean sides. One work is not a sample.

## 2. Record

Write measurements into `research/to-crop-frames.md`:

| ref     | top | bottom | left | right | applied |
|---------|-----|--------|------|-------|---------|
| vl-0356 |  79 |     50 |      |       |         |

Leave `applied` blank until rebuilt.

## 3. Apply

Edit `~/repos/wallpaper-gen/museum-works.json` — add a `trim` field to the work:

```json
{ "ref": "vl-0356", ..., "trim": { "top": 79, "bottom": 50 } }
```

Only include the sides that have a frame; missing sides default to 0.

**If the work already has a `crop`, move it.** Crop offsets are plate pixels
*after* trim, so taking 40 more off the left slides the recorded framing 40 px
across the picture. Subtract the added left from every `left`, the added top
from every `top`, and correct the row in `to-crop-positions.md` /
`to-crop-desktop.md`. Right and bottom don't move the origin. On 23 August this
caught 15 framings out of 30 works — the largest was vl-0028, 272 px.

**Check the desktop gate before you commit to a number.** Trimming shrinks the
plate, and the 16:9 window shrinks with it; under 1920 × 1080 `gallery.js` stops
publishing the desktop wallpaper entirely.

## 4. Rebuild

```
cd ~/repos/wallpaper-gen
node museum.mjs --only vl-0356
```

Space, not `--only=`: the equals form is not parsed and rebuilds everything.

The script prints the new plate dimensions; confirm the trim was applied
(e.g. `3486×4322 → 3486×4193` for top 79 + bottom 50 = 129 px removed).

## 5. Check the frames still land where they were chosen

```
node scripts/research/verify-frames.mjs vl-0356
node scripts/research/verify-frames.mjs            # all of it, ~3 min
```

It cuts each window out of the rebuilt plate at the recorded offset and compares
it to the crop on disk. Under 4 is JPEG noise; a framing that slid reads about 30.
Sizes alone will not catch this — only the picture will.

## 6. Mark applied

Tick the `applied` column in `to-crop-frames.md`.

---

## Notes

- `trim` runs on the treated plate (after resize, before crop). Pixels are
  full-res plate pixels, not thumbnail pixels.
- **A plate you have already trimmed is shown already trimmed** — the shipped
  plate is what the ruler loads. A work with a trim carries a green `cut top 79`
  next to its title, and what you click on it is a *further* cut. The list adds
  the two and shows `top 40 +79 = 119`; `copy` gives the total, and the total is
  what goes into `museum-works.json`, because `trim` is measured from the whole
  resized sheet.
- The ruler reads plate sizes from `images/manifest/`, not from the catalogue's
  `file` field — the catalogue lags a rebuild, and a wrong width scales every
  measured pixel wrong.
- `crop-ruler.html` loads images from `localhost:3000` — the server must be
  running.
- For the phone crop position (separate from frame removal) see
  `to-crop-positions.md` and `crop-positioner.html`.
