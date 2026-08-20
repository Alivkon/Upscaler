# Phone-first gallery — design

18 August 2026. The collection stops being a mixed archive and becomes a gallery
of dark, moody classical paintings cropped for phones. This doc records what
changes and why. Measurements behind the numbers are in this file; the selection
pipeline that feeds it is unchanged and lives in
[2026-08-18-pipeline.md](2026-08-18-pipeline.md).

Identity, decided in a parallel session on 18 Aug: **dark moody is the umbrella,
dark academia is a tag** applied only where it is true (warm-dark palette,
classical, interior or scholarly subject). Phone-first; desktop exists as a
passive download, never as the pitch.

---

## 1. What stays and what hides

241 catalogue entries → **164 shown**, 77 hidden.

| hidden | count | why |
| --- | --- | --- |
| ours (`origin: Tessarum`) | 59 | 24 generated + 5 scenes + 30 photographs. Not the identity any more. |
| Earth (Landsat/USGS) | 7 | Satellite imagery is not a painting. |
| untreated `-desktop` twins | 7 | vl-0229, 0233, 0235, 0237, 0239, 0244, 0249. |
| bright rejects | 4 | vl-0227, 0231, 0242, 0247. |

The twins need explaining, because the filenames lie. `-desktop` and `-iphone`
are **not two crops** — they are the same pixels, one treated and one not.
Measured on the 480px copies:

```
low-tide-...-desktop-5205x3840    luma 124.5   chroma 49.0
low-tide-...-iphone-5205x3840     luma  98.7   chroma 37.3
```

Identical dimensions, different treatment. So hiding the `-desktop` twin loses
nothing: the treated entry carries the same picture.

The four bright rejects are not pending work. The Brook, Gardener's House at
Antibes, Villas at Trouville and The Building of the Dam were rejected as phone
entries on 18 Aug for washing out under the treatment — that is why
`vl-0228/0232/0241/0243` are deleted and these four survive as desktop-only.
Under a phone-only gallery they hide rather than get treated.

**Mechanism: `"hidden": true` in the catalogue entry.** The entry stays in git,
the ref stays in `order.json`, the files stay on disk. `catalogueItems()` skips
hidden works for the grid, for "more in the collection" and for the sitemap;
`/w/<slug>` still serves, with `<meta name="robots" content="noindex">`.

Serving rather than 404ing is deliberate. The asset worth protecting is the
**URL**, not the index state — ranking is not banked and released, and a page
that is noindexed and later restored re-enters on the same footing. Keeping the
page up means nothing breaks for anyone holding a link, and Google de-indexes
cleanly instead of accumulating soft-404s. The `slug` must not change, which is
already a rule (`works.js`).

## 2. Resolution: a re-download problem, not an upscale problem

The bar is **3120 px** of vertical resolution after cropping to 9:19.5.

The weak works are weak because they came from Cleveland's `_print` derivative,
capped at 3400 on the long side. Cleveland also serves `_full.tif`, uncapped.
Querying their API for all 148 Cleveland works in the collection:

| | count | |
| --- | --- | --- |
| already clear 3120 | 87 | nothing to do |
| fixed by re-downloading at full size | 57 | 12.5 GB of TIF |
| still short at full size | 4 | |

The gap is not marginal. `Scenes from the Tale of Genji` is 3400×1513 as a print
and **21566×9599** as a TIF; `Peonies` is **27511×13641**. Re-downloading all 148
rather than only the 57 would be 27.5 GB.

**There is no lighter file to fetch.** Cleveland publishes exactly three
derivatives — `web` (~900px), `print` (3400 cap), `full.tif` — and no IIIF host
exists (`iiif.clevelandart.org` does not resolve), so a 3840px JPEG cannot be
requested. The TIF never lands on disk though: `wallpaper-gen/museum.mjs`
already streams it, decodes in memory, caps the **short** side at 3840 and
writes q98 4:4:4 JPEG. Measured penalty 0.1 dB PSNR; ~120 MB TIF → ~50 MB JPEG.
The cost is their bandwidth during the pull, not our storage.

The four that stay short — vl-0166 (1733×1536, nothing bigger exists), vl-0058
(2683), vl-0057 (2790) and vl-0236 (Villerville, 6105×2841, already treated) —
go to Topaz. **Not yet:** curation will remove a lot of works first, and paying
to upscale something about to be cut is waste.

The 16 non-Cleveland works (SMK, Getty, Pittsburgh, Berlin) have not been
checked for a larger master. Separate job.

## 3. Treatment

Flat dim **×0.80** plus `whole` desaturation at per-work strength
(`wholeStrength`) — the settings picked on 17 Aug, implemented in
`scripts/research/dimming.mjs` and `scripts/research/desaturate.mjs`, recorded
in `.treatset.mjs`. Order matters and is already right: colour first, then
luminance, so the dimming decides its strength from the pixels that will
actually ship.

8 of the 164 already carry it (the treated recent entries). **156 do not.**
Applying it twice would compound, so the catalogue gains a
`"treatment": "dim80-desat-whole"` field marking what a plate has had. The batch
job processes anything lacking the field, which also makes the rule visible to
the next reader instead of living in a session's memory.

The treatment is a `wallpaper-gen` job, not a site job: the site does not
measure or rewrite image files (AGENTS.md). It learns what happened from the
new plates and the `treatment` field.

## 4. Crops

Three crops per work plus the untouched treated plate:

| file | ratio | used for |
| --- | --- | --- |
| phone | 9:19.5 | work-page frame, main Download |
| tall | 9:16 | gallery tile |
| wide | 16:9 | desktop, passive |
| original | as painted | "choose your own crop" |

All four are real files, all four are listed in the image sitemap, and all four
appear as real `<img>` tags on the work page. Sitemap-only images rank weakly
without a page giving them context, so the ones we care about get markup too.

Real crop files rather than CSS cropping, because Google Images indexes the file
behind `<img src>` — an `object-fit: cover` tile still shows Google a landscape
picture on a "phone wallpaper" query, which is the exact query this gallery is
built to win.

**Crop geometry is undecided.** `.cropsheet.mjs` renders all 164 works both ways
— centre and sharp's `attention` — with the treatment applied, to
`~/upscaler-review/crop-compare.html`. Attention chose something other than the
centre on 161 of 164, so the two are genuinely different proposals and the
choice is by eye.

One caveat carried over from `wallpaper-gen/museum.mjs`, which says in capitals
that nothing is cropped and gives a good reason: the viewer knows their screen
and we do not. That still holds — which is why the **plate stays uncropped and
downloadable**. The crop is an offer, not a replacement.

## 5. Pages

**Gallery.** Uniform 9:16 tiles, the real crop file as `src`. The caption
changes: `<h3>` was `origin · ref` ("France · vl-0227") and becomes the painting
title and artist, which is what people search. The spec line keeps the
dimensions, drops "JPEG" — every file is a JPEG, so the word carries no
information — and puts the ref in its place.

**Work page.** The frame shows the 9:19.5 crop; Download hands over that file.
Under the buttons and terms, a small uncropped original — treated, so it matches
what the page has been showing — with a line offering it to anyone who would
rather crop it themselves. The 9:16 and 16:9 files sit alongside it as small
indexable links.

**Restore.** Two checkboxes, both off by default: apply the dark filter, and
crop to 9:19.5. The consent line goes; nothing replaces it. It said "Nothing is
published without your consent", which describes a publishing flow that is
closed, and any replacement would be a privacy claim we would then have to keep
true.

## 6. Order of work

Curation gates most of this, so the two halves run at different times.

**Now, unblocked** — everything on the site: the `hidden` flag and its effect on
grid, sitemap and robots; the caption changes; the tile shape; the work-page
layout; the restore checkboxes.

**After curation** — everything touching image files: the 12.5 GB re-download,
the treatment run over 156 works, crop generation, the Topaz job on the four
short ones. Cutting works first means not paying to process them.
