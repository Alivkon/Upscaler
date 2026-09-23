# Handover: browse pages, the "how I choose" page, and a hole in the busyness score. 23 September 2026

Branch `browse-pages`. Nothing is deployed, pushed, or opened as a PR. The day built
artist, country, tradition and subject pages and a new menu under the grid (all
committed), started a page explaining how works are chosen (built, **not
committed, and its text in the code is out of date**), and ended by finding that
the busyness score cannot see thin detail. **The next step is a labelling sheet**
(§4) so the three candidate measures can be checked against Charlie's eye.

Design and decisions for the browse pages: `research/2026-09-23-browse-pages.md`
(its "Реализация" section covers steps 1–2). Plan: `research/2026-09-23-browse-pages-plan.md`.

---

## 1. Committed on `browse-pages` (main..HEAD)

```
a30362a  homepage <title> names painting; design doc; two tradition pick lists
20f6d74  artists.js: 13 artists, one name per person, copies not counted
f2c49eb  browse.js: which browse pages exist (artists and countries from 4 works)
4840cb0  verify-browse catches a second spelling of a registered artist
e3d26e8  artist and country pages, labelled block under the grid (routes, markup, CSS)
48051f4  "More by" only over the artist's works; countries/artists alphabetical
ac25a13  review fixes: "More by" capped at half of 10; artist link on hidden works
0c4af2f  two traditions: Hudson River School, Dutch Golden Age
a651746  docs: AGENTS.md seams, COLLECTIONS.md links, research "Реализация"
8f7b492  TODO.md: Charlie's accumulated edits + Dutch flowers item
8ac3b6c  menu under the grid rebuilt as an album track list (columns, counts right)
56d6897  HRS names American Romanticism; DGA says Dutch still life; Romanticism TODO
e9a2e25  four subjects: Landscape, Flowers, Still life, Ocean
```

What exists now (local server): 13 artist pages, 6 country pages (Russia skipped:
all Aivazovsky), 3 traditions, 4 subjects, 3 moods, `/artists` (66 names), the
track-list menu (Artists, Countries, Subjects, Traditions, Moods; six columns fit on
desktop at `max-width: 1200rem`), "In …" line and artist link on work pages. Sitemap
192 `<loc>` before the uncommitted work, 193 after. `yarn verify` exits 0.

Subjects were picked by eye: four Sonnet agents looked at all 158 whole paintings
(`research/2026-09-23-visual-subject-tags.json`), Charlie corrected them on
`.subject-sheet.html` (built by `.subjectsheet.mjs`, a copy of `.themesheet-all.mjs`)
and his final lists are `research/2026-09-23-subject-picks-charlie.txt`. He kept
vl-0253 out of Flowers and vl-0357 (Haverstraw Bay, a stretch of the Hudson) in
Ocean; both were raised with him and left as he picked.

The sea page is **Ocean** (`/collection/ocean-painting`), not Seascape: "ocean painting
wallpaper" gets completions toward wallpaper, "seascape painting wallpaper" only
toward the definition. "Seascapes" appears once in its paragraph as the second name.

## 2. Uncommitted in the working tree

`pages.js`, `server.js`, `browse.js`, `collections.js`, `.claude/skills/unslop/`
(and, not ours, `research/2026-09-20-indexnow.*`, `research/social-posts.json`,
which have been left out of every commit).

- **`/choosing` page** (`choosingPage` in `pages.js`, route in `server.js`, footer link
  "How I choose", sitemap entry, and "How I choose them" at the end of every topic
  page's terms line). Heade marsh (vl-0297) and Haeckel shells (vl-0030) are linked by
  ref through `accession()`; a hidden work falls back to plain text.
- **"chosen as phone wallpapers" removed** from every topic note except dark academia
  and cottagecore (there it carries the query word). Countries now read "27 French
  works, by …", artists "… 5 paintings in the collection." The 13.09 comment in
  `collections.js` about where the word "wallpaper" lives was rewritten to match.
- **`.claude/skills/unslop/SKILL.md`** copied from `learnfromx-marketing/content`
  at Charlie's request; applied to the page text.

**The `/choosing` text in the code is the old first-person version that Charlie said
"reads as a LinkedIn post".** Replace it before committing. Voice: **"we"**, not "I",
no name. Footer and terms links still say "How I choose" and need to follow. Latest
text Charlie approved as the base ("first version is good"), with the three fixes he
asked for applied:

> Every wallpaper here is a part of a painting, cut by hand to the shape of a phone screen.
>
> A good phone wallpaper needs a calm surface. Icons are hard to find against visible
> brushwork or dense detail, so the collection favours smooth, blended painting. When
> we select works, we measure how sharply the brightness changes where the icons fall.
> We lay a grid of 4 × 6 cells over the crop, the layout of a phone's home screen, and
> in the spot where each icon sits we measure how far the brightness spreads, leaving
> out the brightest and darkest tenth of the pixels so that a single speck doesn't
> count. A calm crop scores low, and a busy one is usually left out.
>
> We prefer dark works, with exceptions. Each work's page has a Dimmed switch that
> gives you a darker, less colourful version of the same painting, so the clock and
> icons stay easy to read.
>
> We leave out portraits. People appear, but mostly as small figures in a scene.
>
> Some works don't match any of these criteria, but we liked them, so we kept them anyway.

Open on that text:

- **Van Gogh line, agreed to add**, after "…dense detail": "That rules out many of the
  most famous paintings: the swirls of Van Gogh's *The Starry Night*, a favourite on
  wallpaper sites, are exactly what icons get lost in." (Holds under every measure, §3.)
- **The measurement sentences depend on §4.** If the measure changes, the description
  ("leaving out the brightest and darkest tenth") must change with it; do not ship a
  description of a measure we are replacing.
- **Portraits line.** Charlie wanted a reason ("faces are cognitively taxing"). What is
  backed: eye contact raises physiological arousal (Hietanen et al., ~2008–2011, much
  weaker for photos than live faces); nature pictures restore directed attention
  (Berman, Jonides & Kaplan 2008, Attention Restoration Theory). What is not backed:
  that a face wallpaper exhausts you by evening, or that people are affected without
  noticing. Offered line: "A face looking back at you keeps you slightly on alert, and
  looking at landscapes has been shown to rest your attention." Not decided. Verify the
  Berman reference before linking it.
- **Description** (meta) to use: "A painting works as a phone wallpaper when the part of
  it that fits the screen is calm enough for icons to sit on. How the works here are
  cropped and chosen." Charlie asked whether the answer must come first for search:
  it need not (Google and assistants pick passages; the description and the
  self-contained surface paragraph carry it), so the opening stays his option 2.
- Title stays the question: "What makes a painting a good phone wallpaper".

## 3. The busyness score cannot see thin detail

The score (`scripts/research/busyness.mjs`, 17.08): crop shrunk to 200 px wide, 4 × 6
home-screen grid, in each cell the icon's patch (central width, 20–70% of cell
height), brightness spread = 90th minus 10th percentile of luma (0–255), score = median
of the 24 patches. Charlie's 8 reference works in August all scored under 63, which
became the "too busy" line.

Measured on the live collection (Python port, same numbers as JS on identical pixels):
median 30.0, 148 of 158 under 63 (JS gives 147; the one-point gap is the resize
kernel). Busiest: Haeckel vl-0030 192, Audubon vl-0028/26/27 93–124, Merian vl-0032,
Shunkyo vl-0398.

Six famous paintings (Commons scans, 1920 px), every 9:16 strip in 21 steps:

| | centre | calmest strip |
|---|---|---|
| Monet, *Impression, Sunrise* | 19 | 18 |
| Van Gogh, *Almond Blossom* | 55 | 27 (right edge) |
| Hokusai, *The Great Wave* | 115 | 32 (right, with Fuji; busiest 165 at the curl) |
| Klimt, *The Kiss* | 71 | 46 |
| Van Gogh, *Sunflowers* | 65 | 51 |
| Van Gogh, *The Starry Night* | 72 | 69 (every strip 69–80) |

**Charlie looked at the Almond Blossom strip and said icons would not be visible
there. He is right.** The 10% trim throws away thin branches and small blossoms,
because they cover less than 10% of each patch. The same strip under stricter measures:

| | p90–p10 (current) | p98–p2 | edge share median (|grad| > 12) | edge share p75 |
|---|---|---|---|---|
| Almond, "calmest" strip | 27.4 | 79.6 | 21.1% | 33.8% |
| Great Wave, calmest | 32.2 | 66.1 | 4.8% | 44.8% |
| Monet | 17.8 | 27.1 | 0.4% | 4.1% |
| Starry Night, calmest | 69.5 | 105.8 | 55.2% | 58.7% |
| Taikan, Fuji above clouds (vl-0366) | 6.5 | 10.5 | 0.0% | 2.4% |
| Hammershøi interior (vl-0175) | 7.0 | 10.9 | 0.0% | 1.1% |
| Kalf (vl-0420) | 16.0 | 38.5 | 4.6% | 21.3% |
| Heade marsh (vl-0297) | 12.1 | 19.0 | 0.0% | 21.7% |
| Audubon (vl-0026) | 95.4 | 131.1 | 14.1% | 30.4% |
| Haeckel (vl-0030) | 192.3 | 227.0 | 69.2% | 75.7% |

Consequences: the Almond Blossom claim in the post is false; "148 of 158 calm" and the
picking-sheet slider rest on a measure with this blind spot. The Starry Night, Great
Wave and Monet findings hold under all three measures.

The 13.09 clock-band measure (`scripts/research/clock-band.mjs`, 16×16 windows, 90th
percentile over windows) is a different, local measure and was not re-checked.

## 4. Next step: the labelling sheet

Agreed with Charlie ("yeah"), not started. Per the standing rule for yes/no filters
(hand labels, precision and recall, both error piles shown):

1. ~40 strips with realistic icons drawn on them (not just outlines): works from the
   collection across the score range, the six famous paintings' centre and calmest
   strips, and near-misses (Almond, Kalf, Heade marsh, Audubon).
2. Charlie marks each "icons easy to see" yes/no. Buttons, a copy field, state in
   localStorage, like `.treat-sheet.html` and `.subject-sheet.html`. His eye decides;
   blind-round hygiene applies (no scores or names on the tiles; order shuffled).
3. Score the three candidates against his marks: current p90–p10, p98–p2, edge share
   (try median and p75 across patches, and a threshold or two for the gradient).
   Report precision/recall and show the misses of each.
4. Then: fix the measure in `scripts/research/busyness.mjs` if one wins, rewrite the
   `/choosing` measurement sentences, and rerun the post.

## 5. The post

"Which famous paintings work as phone wallpapers": https://claude.ai/artifact/NsLrqWhDiYxHiPofRLsSrL
(private; Charlie shares it from the page's Share menu). **Do not post it as it is**
(Almond Blossom section is wrong). Charlie's idea: a technical breakdown with Python for
Hacker News; wallpaper subreddits allow pictures only, so r/dataisbeautiful (needs a
chart, [OC]), r/Python or r/computervision, maybe r/ArtHistory. Better story after §4:
"my first measure said Almond Blossom was calm, my eye said no, here is why percentiles
hide thin lines, and the measure that agrees with a person."

Written in "I" (HN convention), though the site page is "we"; Charlie hasn't decided.
It links only to the Tessarum homepage: `/choosing` and the new pages exist only on
this branch, so deploy before posting if the post should send people there.

Files, all untracked in `.busyness-post/` (copied from the session scratchpad):

- `post/busyness.py`: the Python port (`busyness`, `strips`); `js_round` matches JS rounding.
- `post/figures.py` → `post/figures.json`: strips with the 24 icon patches outlined, as data URIs.
- `post/template.html` → `post/which-paintings-work-as-wallpapers.html`: the published page
  (numbers are filled in by the snippet in the session; `template.html` has `{{…}}` slots).
- `post/same.mjs`: proof that JS and Python give identical scores on identical pixels.
- `famous/`: the six Commons scans (public domain). `famous.mjs`: the JS version of the strip scan.
- `busy.mjs`, `thumbs.txt` (live phone crops), `plates.txt` (480 px whole plates).

## 6. Charlie's preferences learned today

- Site voice: **"we"** on the site; he tried "I" and came back to "we".
- No filler: "chosen as phone wallpapers" and "hold up on a phone" say nothing
  (saved to memory as `no-filler-in-copy`). Every line must say something checkable.
- Selection criteria are guidelines, not rules; he adds works he likes that break
  them. Never write "every work passes X".
- What he actually does: **crops by hand**, and takes any part of a painting that works,
  whatever the rest shows; he does **not** choose by subject. **Brushwork/busyness is
  the main rule.** Dark is a preference (people can set clock colour). No portraits is
  a preference. Clock space is not a criterion (many works lack it).
- Plain language in site copy; museum-label register, not LinkedIn. No em dashes.
- Alternative names go in once, as a true second name in a sentence, never a list.
- He wants the menu low-key, "like a list of songs on an album".

## 7. Withdrawn today (don't re-derive)

- "The subject survives a tall crop" as a criterion: false, he doesn't look at subject.
- "Room for the clock" as a criterion: not all works have it.
- Reasons invented for his preferences (faces "look back at you", dark "for white
  text"): removed; state them as preferences unless research supports them (§2).
- "Collection median 30 vs museum pool 52": not comparable (different images and
  pipelines); dropped.
- "Almond Blossom's right edge is calm": false by eye, and false under p98–p2 and edge share.
- First `/choosing` draft (headings, "This is the rule I hold to most"): rejected as a
  LinkedIn post; rewritten twice.

## 8. Still open from the plan

- Final whole-branch review (the skill's last step) not done; the plan's deviations
  ("More by" split, the cap, sort orders, menu redesign, subjects, `/choosing`) are in
  commits and in `research/2026-09-23-browse-pages.md` only partly (menu, subjects and
  `/choosing` are not yet in its "Реализация" section; append, don't rewrite).
- Deploy (`./scripts/deploy.sh`) only with Charlie's consent; then Request indexing in
  Search Console for `/artists`, traditions, countries, subjects, `/choosing`.
- Keyword Planner check (needs Charlie's login); Romanticism tradition (TODO.md).
- Catalogue fixes: lifetime ranges as dates (vl-0176/0177/0178), missing dates
  (vl-0385/0439/0447/0454), "Wikimedia Commons" as holder on 53 works, 47 works without
  `creatorKind` (treated as named; require the field in verify-catalogue).
