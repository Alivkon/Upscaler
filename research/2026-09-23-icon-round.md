# Icon round: which busyness measure agrees with the eye. 23 September 2026

## Why

The busyness score (`scripts/research/busyness.mjs`, 17.08: median over the 24 icon
patches of luma p90−p10, "too busy" above 63) rated the right edge of Van Gogh's
*Almond Blossom* calm (24.7). Charlie looked and said icons would not be visible there.
The 10% trim drops thin branches because they cover less than a tenth of each patch.
Before changing the measure, candidates were scored against hand labels
(the rule in memory: yes/no filters get labels, precision and recall, both error piles).

## What was done

- `.busyness-post/measures.mjs` (untracked): the same 24 patches as `busyness.mjs`,
  five measures, each as median and as 75th percentile over the patches:
  p90−p10 (current), p98−p2, and the share of pixels whose luma gradient
  (forward differences at 200 px wide) exceeds 8, 12 or 16.
  The p90−p10 median is checked against `busyness.mjs` on every tile (identical).
- `.busyness-post/pool.mjs`: 284 candidates, the 158 live phone crops (scans, 960 px copy)
  and every 9:19.5 strip of six famous paintings (21 steps each).
- `.busyness-post/iconround.mjs` + `iconround.html`: blind sheet, 48 tiles,
  published privately as https://claude.ai/artifact/FqLJhHkNgXXVW5b56GMrhb (db capability).
  Each tile has an iPhone-style home screen drawn at the measured geometry (24 icons,
  white labels at 74–92% of the cell). Order shuffled by seed 923, no names or scores.
  Chosen mostly where the measures disagree: 12 of ours where the others rate it busier
  than p90−p10, 4 the other way, 11 anchors all call calm or busy, 3 named near-misses
  (Kalf vl-0420, Heade vl-0297, Audubon vl-0026), 15 famous strips (centre and calmest),
  3 spread by score. Scans throughout, undimmed.
- Question after Charlie asked what to rate: "Does the detail in the painting make the
  icons and labels hard to pick out? Judge busyness only. A label lost because the
  background is light and flat does not count."
- `.busyness-post/evaluate.mjs` → `research/2026-09-23-icon-round-labels.json`: key,
  labels, all measures and mean luma for each tile.

## Result

Labels: 15 easy, 13 borderline, 20 lost. Charlie: "approximate, hard to judge white ones".
Plain brightness separates lost from easy poorly (AUC 0.64), so the labels mostly
follow detail, not brightness.

| measure | AUC lost vs easy | best split (borderline left out) | false alarms | misses | collection flagged |
|---|---|---|---|---|---|
| p90−p10 median > 63 (current rule) | 0.93 | fixed at 63 | 0 | **7 of 20** | 11 / 158 |
| p90−p10 median | 0.93 | ≥ 18.5 | 4 | 1 | 125 / 158 |
| p98−p2 p75 | 0.98 | ≥ 96.5 | 2 | 0 | 59 / 158 |
| edge>12 p75 | 0.97 | ≥ 27.1 | 2 | 0 | 66 / 158 |
| **edge>16 p75** | **1.00** (299 of 300 pairs; vl-0045 easy at 24.3 is over the lowest lost, vl-0177 at 21.6) | **≥ 21.6** | **1** (vl-0045) | **0** | 46 / 158 |

The current rule misses Almond Blossom (both strips), Sunflowers (two strips) and three
of ours (vl-0151, vl-0447, vl-0177). Its ranking is not bad (AUC 0.93); the line of 63,
taken in August from 8 reference works, is far too high, and at any line low enough to
catch the thin detail it flags 125 of 158 works.

Best: **edge>16 p75**, the share of the icon spot where brightness jumps by more than 16
of 255 between neighbouring pixels, taken at the busiest quarter of the 24 spots.
Almond Blossom's right edge scores 30.8, over the line; Monet 6.9.

Where the three answers fall on edge>16 p75:

```
easy        0 0.1 0.5 0.5 2.4 3.2 4.4 5.8 6.9 7.6 8.3 10.3 19.8 20.7 24.3
borderline  4.2 11.3 15.7 16.3 18.1 18.6 21.9 22.9 22.9 31.5 33.2 42.3 49.7
lost        21.6 24.5 25.9 26.9 30.8 30.9 31.5 33.3 36.6 39 43.1 46.5 47.8 48 52.6 54.7 56.7 59.3 61.2 74
```

So two lines fit the three answers better than one: under about 20 calm, over about 25
busy, between is judged by eye.

The lost tile most likely to be about brightness, vl-0151 (bamboo, luma 174, p90−p10 12.6,
calmer than Monet by the old score), was looked at: thin black bamboo leaves on light silk.
It is thin detail, the case the old score misses, and the label stands.

Charlie's answers were saved by the page too (`answers` collection read back, t01, t02 match).

## Limits

- 48 labels, and the line was chosen on the same labels, so the numbers are optimistic.
  The top three measures differ by one or two tiles. Heade (20.7) and Kalf (19.8) sit just
  under the 21.6 line, both labelled easy.
- Labels are approximate by Charlie's own account, hardest on light tiles.
- With borderline counted as busy, every measure drops (edge>16 p75: AUC 0.94, P 0.91 R 0.97
  at ≥ 11.3). Borderline is a real middle, not noise to be assigned.
- `busyness.mjs` is not changed yet. 46 of Charlie's 158 works are over the new line;
  he keeps works that break guidelines, so that is a description, not a cull.
- Transfer check, pending: 46 of 158 is enriched-sample arithmetic until it is checked on
  works that were not labelled. Round 2 (https://claude.ai/artifact/5xAokYMxhUsaSfpw4UdcV3,
  seed 924): 12 unlabelled works, 8 over the line spread across it (vl-0454 21.6 …
  vl-0084 45.3) and 4 in the 12–21.6 band.

## Round 2: the line on works nobody labelled

Answers (Charlie: "even more approximate"), sorted by edge>16 p75. Labels and key in
`research/2026-09-23-icon-round-2-labels.json`.

```
12.1 borderline   14.5 easy         18.7 borderline   21.5 borderline
21.6 borderline   22.6 borderline   24.5 borderline   26.7 lost
28.5 borderline   33.2 lost         38.2 lost         45.3 borderline
```

None of the 8 over the line was called easy. 3 were lost, 5 borderline. The three lost
sit together at 26.7–38.2. On the collection the line marks "borderline or busier", not
"lost", which fits the two-line reading: over 25 busy (5 works: 3 lost, 2 borderline),
20–25 borderline (4 works: all borderline).

The collection under two lines: 102 under 20, 27 between 20 and 25, 29 over 25.

Famous paintings under edge>16 p75: only Monet has a calm strip (centre 6.9, calmest 1.4).
Every strip of Almond Blossom (calmest 29.8), The Great Wave (36.3), The Kiss (33.2),
Sunflowers (28.1) and The Starry Night (54.7) is over 25.
