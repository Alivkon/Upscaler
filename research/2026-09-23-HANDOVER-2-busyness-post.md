# Handover 2: the busyness fix and the post. 23 September 2026 (evening)

Follows `research/2026-09-23-HANDOVER-browse-pages-and-busyness.md` (read that first for the
branch, the uncommitted `/choosing` page and Charlie's preferences). Since then: the icon
rounds found a better busyness measure, and the post was rewritten around it.
**Charlie has notes on the post's narrative; he gives them next.** Nothing below is
committed, deployed or wired into the app.

## 1. Charlie's decisions this session

- Host the post on tessarum.com as a blog-style page, "cuter, with arrows"; the goal is
  to be cited by LLMs for "Which famous paintings work as phone wallpapers".
- Fix the measure first so Almond Blossom reads as busy (done, §2).
- Mention iOS and Android label and clock colour briefly (done, §4, sourced).
- **"Let's not update in the app yet, let's write the post first."** So
  `scripts/research/busyness.mjs`, `detail-gate.mjs`, `clock-band.mjs`, `/choosing` and
  `pages.js` are untouched. The post describes a measure the site does not run yet.
- Rating rule he asked about, now on the sheet: judge busyness only; a label lost because
  the background is light and flat (white on white) does not count.

## 2. The measure: icon rounds 1 and 2

Full write-up: `research/2026-09-23-icon-round.md` (both rounds, tables, limits).
Labels + key + all measures: `research/2026-09-23-icon-round-labels.json` (48) and
`research/2026-09-23-icon-round-2-labels.json` (12). Both untracked, not committed.

- Round 1 (https://claude.ai/artifact/FqLJhHkNgXXVW5b56GMrhb, db capability, answers
  also saved there): 48 blind tiles, iPhone-style home screen drawn at the measured
  geometry, mostly where measures disagree. Charlie: 15 easy, 13 borderline, 20 lost,
  "approximate, hard to judge white ones".
- Old rule (p90−p10 median > 63) missed 7 of 20 lost (both Almond strips, two
  Sunflowers, vl-0151 bamboo, vl-0447, vl-0177). Its line was far too high.
- Winner: **edge>16 p75**. In each of the 24 icon spots (same geometry as `busyness.mjs`),
  the share of pixels whose luma jumps by more than 16 (of 255) to the next pixel
  right or below (forward differences, hypot), at 200 px wide; score = 75th percentile
  over the 24 spots (`pct` with JS rounding). All 20 lost ≥ 21.6; one easy over it
  (vl-0045, 24.3). Chosen on the same labels, so optimistic.
- Round 2 (https://claude.ai/artifact/5xAokYMxhUsaSfpw4UdcV3): 12 unlabelled works of ours.
  None of the 8 over the line marked easy (3 lost, 5 borderline); under: 1 easy, 3 borderline.
  Charlie: "even more approximate".
- Reading adopted in the post: **under 20 calm, 20 to 25 borderline, over 25 busy.**
  Collection: 102 / 27 / 29 of 158.
- vl-0151 (bamboo, light silk) was checked by eye: thin dark leaves, a real thin-detail
  case, label kept.
- Pending decision (asked, answered "post first"): switch `busyness.mjs` to this measure
  and move `detail-gate.mjs` and `clock-band.mjs` with it so there is one score.

## 3. Numbers used in the post (edge>16 p75, 9:19.5 strips, 21 steps)

| painting | centre | calmest strip (at) | range | verdict |
|---|---|---|---|---|
| Monet, Impression, Sunrise | 6.9 | 1.4 (100%) | 1.4–7.0 | calm |
| Van Gogh, Almond Blossom | 48.0 | 29.8 (95%) | 29.8–48.3 | busy (old score called @100 calm at 24.7) |
| Van Gogh, Sunflowers | 33.3 | 28.1 (95%) | 28.1–36.2 | busy, eye: best strip borderline |
| Klimt, The Kiss | 47.8 | 33.2 (100%) | 33.2–50.5 | busy, eye: borderline |
| Hokusai, The Great Wave | 46.5 | 36.3 (90%) | 36.3–58.1 | busy, eye: @85 borderline |
| Van Gogh, The Starry Night | 59.3 | 54.7 (15%) | 54.7–62.9 | busy, eye: lost |

Ours: calmest vl-0391 0, vl-0366 Taikan Fuji 0.1, vl-0384 and vl-0175 Hammershøi 0.1/0.5,
Aivazovsky vl-0467/0476/0473 under 1.1. Busiest vl-0030 Haeckel 74, vl-0371 54.7,
vl-0398 52.6, vl-0221 **Monet Spring Flowers 49.7** (used in the post: calm is this Monet,
not Monet in general). Crops changed from 9:16 (first draft) to 9:19.5, so old numbers
(Great Wave 115 etc.) no longer apply.

## 4. Platform facts (sourced, used in the post)

- Android: `WallpaperColors.HINT_SUPPORTS_DARK_TEXT` is set only when mean luminance
  > 0.70 (`persist.wallpapercolors.threshold`, default 70) and dark pixels (contrast
  with black < 5.5) ≤ 5% (`max_dark_area`, default 5). Javadoc: "A launcher may set its
  text color to black if this flag is specified." AOSP Launcher3 has a `DarkText` theme
  (workspace text #212121) driven by `supportsDarkText()`. Source:
  https://android.googlesource.com/platform/frameworks/base/+/refs/heads/master/core/java/android/app/WallpaperColors.java
  Samsung and other launchers not checked.
- iPhone: lock screen clock font and colour are user-selectable
  (https://support.apple.com/guide/iphone/create-a-custom-lock-screen-iph4d0e6c351/ios).
  Home screen: Apple's guide offers Dark / Clear / Tinted icons and Large icons, which
  hide the app names (https://support.apple.com/guide/iphone/customize-apps-and-widgets-on-the-home-screen-iph385473442/ios).
  Apple documents **no** label-colour setting. How iOS picks label colour is **not**
  sourced (forums contradict each other), so the post doesn't claim it.

## 5. The post

Draft: https://claude.ai/artifact/NsLrqWhDiYxHiPofRLsSrL, Version 2 (private).
Title "Which famous paintings work as phone wallpapers?". Voice "we". No em dashes.
Visual: site's Sometype Mono and grey mat, Kalam handwriting and one pink (#ff5c93 dark,
#d0245f light) for arrows, notes and the edge highlight; light and dark themes.

Order of sections as built:
1. Answer paragraph (pink rule): only Monet has a calm part; Starry Night and Almond busy
   anywhere; best strips of Wave, Kiss, Sunflowers borderline.
2. Hero SVG: Starry Night centre vs Monet centre, home screens, arrows "labels vanish in
   the swirls" / "icons sit on haze".
3. Tessarum intro: paintings cut by hand; 9:19.5 strip; 4 × 6 icons.
4. "First try: brightness spread" (steps; August's 8 works → 63), Almond SVG with notes
   "first score: 24.7 means calm" / "our eye: the labels get lost in the branches",
   why (spread measures how far apart, not how often; percentiles drop thin lines),
   close-up of spot row 4 col 2 (42 × 36 px, spread 19.7, edges 21.5%) raw vs pink.
5. "Second try: count the edges" (steps), the 48-crop test, two number-line charts
   (old score line 63; new score lines 20 and 25, band), round 2 sentence, rough-marks caveat.
6. "Six famous paintings": table (centre, calmest, chip) + grid of six calmest strips.
7. The Starry Night; The Great Wave (busy / centre / calm strips, woodblock outlines);
   Monet (strokes close in brightness; Spring Flowers 49.7).
8. "Brightness is a separate question": Android rule, iPhone clock/labels, Dimmed switch.
9. "Our own collection": 102 / 27 / 29, calmest names, Haeckel 74 "because we liked them",
   three strips (vl-0366, vl-0175, vl-0030).
10. "The code": `busyness.py` minus `__main__`; JS gives same numbers on same pixels.
11. "What the score doesn't say"; credits.

Open questions put to Charlie (no answer yet): publish the "29 busy of ours" section?
Address on tessarum.com (proposed `/which-famous-paintings-work-as-wallpapers`)?
Then move into `pages.js` as a real server-rendered page (needs deploy before posting
anywhere that links to it). HN / subreddit plan as in handover 1 §5.

## 6. Files (all untracked, in `.busyness-post/`)

- `measures.mjs`: all candidate measures (p9010, p9802, edge8/12/16; med and p75).
- `pool.mjs` → scratchpad `iconround/pool.json`: 284 candidates (158 ours from the
  960 px scan copies, 6 × 21 famous strips at 9:19.5); asserts p9010 equals `busyness.mjs`.
- `homescreen.mjs`: the drawn home screen (24 icons, labels), `homeScreen(W, H)`.
- `iconround.mjs` + `iconround.html`: the blind sheet builder (`node iconround.mjs <pool>
  <outdir> [ids.txt]`; seed 923 for round 1, 924 when an ids file is given).
- `evaluate.mjs`: AUC, best splits, per-tile table; writes the labels JSON to research/.
- `post/busyness.py`: Python port, `spread` (old) and `edges` (new), `strips` at 9:19.5.
- `post/same.mjs`: JS and Python agree on 7 strips (identical to 0.1).
- `post/figures.mjs` → `post/figures.json`: images and numbers.
- `post/build.mjs` → scratchpad `post/which-paintings-work-as-wallpapers.html`: the page
  (text lives in build.mjs). Rebuild:
  ```
  S=/tmp/claude-1000/-home-charlie-repos-Upscaler/100cbeb9-f9a3-4600-9dce-bcaa405c9402/scratchpad
  cd .busyness-post && node post/figures.mjs $S/iconround/pool.json ../research/2026-09-23-icon-round-labels.json post/figures.json
  node post/build.mjs post/figures.json $S/post/which-paintings-work-as-wallpapers.html
  ```
  then republish to the artifact URL above. The scratchpad does not survive the session:
  `pool.json` is rebuilt by `node pool.mjs <out>` (takes a minute); the round keys are in
  the two research labels files.
- Old `post/template.html`, `figures.py`, `figures.json` from the first draft: superseded
  by build.mjs / figures.mjs (figures.json was overwritten by the new one).

## 7. Still open (carried)

From handover 1: `/choosing` text replacement (its measurement sentences should now
describe the edge score, once Charlie agrees to adopt it), footer/terms link labels,
Van Gogh line, portraits line, meta description; commit the uncommitted browse work and
both handovers; final branch review; "Реализация" section; deploy with consent;
Keyword Planner; Romanticism tradition; catalogue fixes.
