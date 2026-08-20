# Handover — phone-first, built. 19 August 2026, evening

Second handover of the day. The first,
[2026-08-19-HANDOVER-phone-first.md](2026-08-19-HANDOVER-phone-first.md), was
written before any code was touched and its section 5 «Open, in order» is now
mostly closed — read this file for what changed, that one only for the
measurements behind the decisions. The design is
[2026-08-18-phone-first-gallery.md](2026-08-18-phone-first-gallery.md); three of
its choices were overruled during the build and the corrections are in §3 below.

---

## 1. What Charlie decided this session

Asked whether anything was left to decide before implementing. Three answers:

| | |
| --- | --- |
| hidden works | **serve, with `noindex`** — not 404 |
| crop rule | **`centre` for now**; he picks per work among the four once the final set is chosen |
| the leftover visitor upload | **delete outright**, file and all — not hide |

The crop question is the one to remember: he does **not** want a rule chosen for
him. `centre` is a placeholder that claims nothing, and the machinery exists so
that a per-work choice is one field.

## 2. What is done

**The site half is finished and verified.** Every item of his original eight-part
message is implemented, `yarn verify` passes in both repositories, nothing is
committed anywhere.

- `"hidden": true` on 77 catalogue entries. `/w/<slug>` still answers 200 with
  `<meta name="robots" content="noindex, follow">`; the work is gone from the
  grid, from «More in the collection» and from the sitemap. Filtering happens in
  `server.js` (`shown()`), not in `galleryItems()` — the work page has to keep
  finding them. Measured: 241 entries, 164 shown, sitemap 167 URLs.
- Gallery caption is a museum label now: title as the link text, artist in
  italic underneath (`.caption__by`), then `1440 × 3120 · TS·0230`. «JPEG» is
  gone; every file is one, so the word was a column of nothing.
- Work page frames the 9:19.5 crop and Download hands over that file. Everything
  the page asserts — size, bytes, `og:image`, `ImageObject` — describes the crop,
  not the plate, because that is the file the visitor gets.
- Under the terms: the uncropped painting with the 9:16 and 16:9 crops beside it
  (`.alternates`), all three real `<img>` with distinct `alt`, plus the line
  offering the whole sheet to anyone who would rather crop it themselves.
- Restore page: two checkboxes, both off, wired through `/api/upscale` to
  `treatment.js`. The crop one rewrites the «Result — …» line live, because the
  checkbox changes the size of the file, not its finish.
- The consent line is gone from `public/intake.js` and nothing replaced it.
- `images/generated/GEQ57FnWoAAc4iY-real-esrgan-x2-1786885638138.png` deleted,
  `images/gallery.json` is now `[]`.

**The generator half is written and has run.** `wallpaper-gen/museum.mjs` now
applies the dark treatment to every plate and cuts three crops from it into
`images/crops/`. 163 works, exit 0, about 3.5 s each, nothing downloaded — every
master was already cached. Verified end to end on a running server: 156 of the
164 shown tiles come from a real 9:16 crop file, the work page frames the 9:19.5
one and Download hands it over, and the other three files sit under the terms.
Tile proportions measured across all 156: 0.5623–0.5628, i.e. 9:16 to within
integer rounding. `images/crops` is 718 MB, `images/plates` 832 MB.

Two things that measurement makes plain. **62 of the 156 phone crops are under
3120** — that is the `_print` cap of §4.3, not a fault in the cutting. And a
portrait painting has no wide crop worth the name: Standing Ksitigarbha's 16:9
comes out 1470 × 827. The file is honest and it is offered quietly, which is all
16:9 was ever meant to be here.

## 3. Three things in the design doc that turned out wrong

**The crop rule does not belong in the catalogue.** I put it there first and
then took it out. Composition is `wallpaper-gen`'s half of the split (AGENTS.md),
so the field lives in `museum-works.json` beside the master URL, and the site
learns what crops exist from the manifest. It takes `centre` / `attention` /
`entropy` or an explicit `[x0,y0,x1,y1]` box in fractions — so when Charlie picks
`vlm` for a work, the box gets **baked into the repository** instead of the site
depending on a paid cache in `~/upscaler-review`.

**The `treatment` catalogue field is unnecessary and was removed.** It existed to
stop the treatment being applied twice. It cannot be: plates are rebuilt from the
cached master on every run and the master is never touched. A marker guarding
against an impossible event is a marker that will one day be believed.

**The gallery was serving 497 MB of plates, and had been since the `file` field
was added to every entry.** `catalogueItems()` checked `work.file` *first*, so
for 156 of the 164 shown works the manifest branch stopped executing and every
`srcset` vanished. Nothing looks wrong on the page — the browser simply fetches a
5000 px plate for a 220 px tile. The manifest now takes priority and `file` is
the fallback it was written to be. 497 MB → 48 MB, and that 48 is the eight works
the generator has never seen.

## 4. Open, in order

1. **Eight works are outside the pipeline** — vl-0230, 0234, 0236, 0238, 0240,
   0245, 0246, 0250. They are the recent hand-treated ones: no master, no
   manifest entry, no crops, so their tiles are the wrong shape. Entries are
   prepared at `~/upscaler-review/museum-works-additions.json` — append to
   `wallpaper-gen/museum-works.json` and re-run. **This downloads 1.5 GB of TIFF
   from Cleveland** and gives seven of the eight a phone crop over 3120
   (vl-0236 Villerville stays at 2841 — it is one of the known four).
   Afterwards their catalogue `file` fields point at orphaned plates and should
   be updated or dropped. Until then their tiles fall back to the plate and are
   the wrong shape — including the first tile of the gallery, vl-0230.
2. **Charlie picks the final set, then the crop per work.** `.cropsheet.mjs`
   renders all four candidates; making it write choices straight into
   `museum-works.json` was offered and not yet built.
3. **The re-download is smaller than it looked.** It is not a project: 128 of the
   163 cached masters are Cleveland's `_print`, capped at 3400 on the long side.
   Change `_print` to `_full.tif` in `museum-works.json`, **delete those refs
   from `sources/`** (the cache key is `sources/<ref>.jpg` and does not notice a
   changed URL), re-run. Measured against
   `~/upscaler-review/cleveland-full-sizes.json`: 87 works clear a 3120 phone
   crop now, 144 would after, 12.5 GB, and the same four stay short — vl-0057
   (2790), vl-0058 (2683), vl-0166 (1536), vl-0236 (2841). This run confirms the
   shape of it from the other side: 62 of the 156 crops came out under 3120.
4. ~~Check the 16 non-Cleveland works for a larger master.~~ Done, 19 Aug,
   evening. Five Audubons, Tree Ferns, Banana Flower and Small Emperor Moth
   were removed from the collection instead. Of what remained, only two fall
   short and neither can be fixed by finding a better file: Berlin serves
   vl-0034 at 1200 × 859 against our 3837 × 2649 from Commons, and SMK's
   `info.json` gives vl-0179 as 3813 × 2947, exactly what we hold. Nasjonalmuseet
   has an Egedius of the same farm and year, but at 30.5 × 25.5 cm against
   SMK's 65 × 84 — a different painting, not a better scan.
5. Topaz the works that stay short — after curation, not before. Six now, not
   four: vl-0034 and vl-0179 joined the list for the reason above. The live
   list is in [TODO.md](../TODO.md), not here.

## 5. Traps

**The treatment algorithm exists twice and must stay identical.**
`Upscaler/treatment.js` (over `scripts/research/{dimming,desaturate}.mjs`) and
`wallpaper-gen/treatment.mjs`. The site needs it for the restore checkbox, the
generator for plates, and the two repositories travel separately — an import
across `../` would be a packaging lie. Verified byte-identical on 40 works
spanning the whole strength range (k from 0.35 to 0.989), zero differing pixels.
Change the numbers in one and the visitor's own picture comes back looking unlike
the collection. There is a note in both files and in AGENTS.md.

**In-place plate replacement was a deliberate call, and it expires.** AGENTS.md
says a published work's file never changes, because `/images/plates` is served
`immutable` for a year. Treated plates keep their old names (dimensions did not
change), so the run overwrote them. That is safe *only* because nothing is
deployed — no deploy config in the repo, no `SITE_ORIGIN` in `.env`. After
launch this rule binds again and a changed plate needs a changed name.

**`sharp` keeps only the last `resize` in a pipeline.** Still true, still silent.
`resize(crop).resize(size)` drops the crop and produces plausible identical
output. `extract` then `resize`, or fold the ratio into one call.

**`attention` centres the window on a single peak pixel** of an edge map and has
no notion of the subject having extent — which is why it cuts heads off. Six
works are at genuine risk if a strategy is ever applied blind: vl-0144, vl-0035,
vl-0066 (Gérôme's lion), vl-0145, vl-0051, vl-0224.

**`vl-0227` and its three siblings are not pending work.** The Brook, Gardener's
House at Antibes, Villas at Trouville and The Building of the Dam were rejected
as phone entries on 18 Aug for washing out under the treatment. They are hidden,
not unfinished. Do not «fix» them by applying the filter.

**`.cropbox.mjs`'s cache is money.** `~/upscaler-review/crop-boxes-subject.json`
cost $0.142 to produce. The script never calls the model when the cache is there;
delete it and it will.

**`wallpaper-gen` checks its own formatting in `yarn verify`.** Edit `museum.mjs`
or `treatment.mjs` and run `yarn format` there before committing.

## 6. Repo state

Nothing committed in either repository.

`Upscaler` — modified: `AGENTS.md`, `gallery.js`, `pages.js`, `server.js`,
`works.js`, `package.json`, `public/intake.js`, `public/styles.css`,
`scripts/verify-catalogue.mjs`, `images/gallery.json`, 77 catalogue entries
(plus `vl-0244`/`vl-0245`, whose titles carried a stray CRLF from the museum
record — stripped). New: `treatment.js`. `.cropsheet.mjs` and `.cropbox.mjs` no
longer carry a hand-copied list of hidden refs; they read the catalogue field.

`wallpaper-gen` — modified: `museum.mjs`, `package.json`. New: `treatment.mjs`.
(`museum-works.json` was already modified before this session.)

Outside git: `images/crops/` is new and large; `~/upscaler-review/` holds the
comparison sheet, the paid boxes and `cleveland-full-sizes.json`.
