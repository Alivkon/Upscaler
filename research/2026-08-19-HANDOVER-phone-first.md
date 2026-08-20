# Handover — phone-first gallery, 19 August 2026

Written before compaction. The design this session produced is
[2026-08-18-phone-first-gallery.md](2026-08-18-phone-first-gallery.md); read that
first. Here is only what is needed to continue: what was decided, what was
measured, what is still open, and the traps that cost time.

---

## 1. What Charlie asked

One message, taken apart:

1. Strategy changes to **phone wallpapers only**, dark / dark academia / gothic.
2. Keep only works that work vertically. Horizontal is fine if the vertical
   resolution after cropping is reasonable for most phones; if not, list them
   for upscaling — **museum works only**.
3. Hide, not delete, "ours". Remove Earth.
4. Apply the desat/dark filter to all remaining works, but not twice — the
   recent ones already have it. Hide their unedited `-desktop` copies.
5. Gallery shows every picture cropped to one vertical size.
6. Work page: the frame shows the crop; under the buttons and text on the right,
   a small original with a line about downloading it and choosing your own crop.
7. Restore page: a dark-filter checkbox (off by default) and a crop checkbox.
   Drop "Nothing is published without your consent."
8. Gallery caption: painting title and artist instead of country, keep the id,
   and put the id where "JPEG" was.

Later in the session he added: explain how `attention` works, look for a better
model, and update the crop statement in `museum.mjs`.

## 2. Decided

| | |
| --- | --- |
| vertical bar | **3120 px** after cropping to 9:19.5 |
| main Download | the **cropped phone file**, with the uncropped plate offered beside it |
| gallery tile | **9:16**, and a **real crop file**, not `object-fit: cover` |
| crop set | 9:19.5 + 9:16 + 16:9 + the original, all in the image sitemap |
| restore crop | fixed **9:19.5** |
| privacy line | **dropped entirely**, nothing replaces it |
| the 4 works short even at full size | upscale with Topaz — **not now**, curation first |
| UI | palette and typography stay as they are; only the listed changes |

**Crop geometry is Charlie's to pick by hand**, once the final set of pictures is
chosen. Do not pick it for him. His standing preference as of 18 Aug was
`entropy`; the VLM column arrived after that and he has not ruled on it.

**One assumption not explicitly confirmed:** hidden works serve with
`<meta robots="noindex">` rather than 404ing. Reasoning is in the design doc
(the URL is the asset, the site is days old, nothing to lose either way). He
asked the SEO question, got the answer, and did not object — but did not say yes.

## 3. Measured

Everything below is measurement from this session, not estimate.

**Collection.** 241 catalogue entries → **164 shown**, 77 hidden: 59 ours
(`origin: Tessarum` — 24 generated, 5 scenes, 30 photographs), 7 Earth, 7
untreated `-desktop` twins, 4 bright rejects.

**Resolution.** Of the 164: 87 already clear 3120; **57 are fixed by
re-downloading Cleveland's `_full.tif`** (12.5 GB); 4 stay short; 16 are
non-Cleveland (SMK, Getty, Pittsburgh, Berlin) and **have not been checked** for
a larger master. Re-downloading all 148 Cleveland works would be 27.5 GB.

The gap is large because `_print` is capped at 3400 on the long side:
`Scenes from the Tale of Genji` is 3400×1513 as a print and **21566×9599** as a
TIF. There is **no lighter file to fetch** — Cleveland publishes only `web`,
`print` and `full.tif`, and no IIIF host exists (`iiif.clevelandart.org` does not
resolve). `wallpaper-gen/museum.mjs` already streams the TIF and caches q98 JPEG
without the TIF touching disk, at a measured 0.1 dB PSNR cost.

Still short at full size: `vl-0166` (1733×1536, nothing bigger exists),
`vl-0058` (2683), `vl-0057` (2790), `vl-0236` (Villerville, 6105×2841, already
treated).

**Treatment.** 8 of the 164 have it, **156 do not**. Settings are flat dim ×0.80
plus `whole` desaturation at per-work strength.

**Crop boxes (paid, done, cached).** qwen3-vl-8b over all 164: **$0.142**, 128
SUBJECT, 36 SCENE, 0 unparsed. Of the 128 subjects, 76 fit whole inside a 9:19.5
window and 52 get clipped — but most of the clipped are diffuse things (`bamboo`,
`flowering branch`, `sailing ships`) where clipping is correct. Only **six** are
both clipped and have a head, i.e. can actually be decapitated:

```
vl-0144  72%  woman         Tsubasa of Ōgiya
vl-0035  75%  nude figure   In the Waves
vl-0066  71%  lion          Lion on the Watch     ← Gérôme, mane pushed off the left edge
vl-0145  86%  woman         New Year's Scene
vl-0051  35%  two falcons   Peregrine Falcons
vl-0224  61%  lion          Lion
```

Six is cheaper to override by hand than to fix with a second prompt. The repo
already has that pattern — `frame-labels-charlie.json`, where a hand label beats
the rule.

## 4. Repo state

Nothing committed. New in `Upscaler` **this session only**:

- `.cropbox.mjs` — asks the model for the subject box. Caches to
  `~/upscaler-review/crop-boxes-subject.json` keyed `1024|v2|<ref>`. **Re-running
  costs nothing while the cache is there; deleting it costs $0.14.**
- `.cropsheet.mjs` — the four-column comparison sheet. Reads the box cache, never
  calls the model.
- `research/2026-08-18-phone-first-gallery.md` — the design.
- `research/2026-08-19-HANDOVER-phone-first.md` — this file.

**No site code has been touched.** `pages.js`, `gallery.js`, `server.js`,
`public/` and the catalogue are exactly as the previous session left them.
`yarn verify` passes.

In `wallpaper-gen`: `museum.mjs` — the `NOTHING IS CROPPED` paragraph rewritten
to `THE PLATE IS NOT CROPPED`, distinguishing the plate (still uncropped, still
the master) from the crops the site now offers. `yarn verify` passes there too.

Outside git, in `~/upscaler-review/`:

- `crop-compare.html` + `crop-compare/` — 20 MB, four crops × 164 works.
- `crop-boxes-subject.json` — the paid boxes.
- `cleveland-full-sizes.json` — full-TIF dimensions and byte sizes for all 164,
  so the re-download plan does not need 164 more API calls.

## 5. Open, in order

Curation gates the image half. **Cutting works first means not paying to process
them** — that is why the Topaz job is deferred.

1. **Charlie picks the final set of pictures**, then the crop rule by hand.
2. Site work, all unblocked and independent of the above: the `hidden` flag and
   its effect on grid, sitemap and robots; the caption change; 9:16 tiles; the
   work-page layout; the two restore checkboxes; drop the consent line.
3. Check the 16 non-Cleveland works for a larger master.
4. Re-download the 57, treat the 156, generate the crops, then Topaz the
   near-misses that survived curation.

## 6. Traps

**`-desktop` and `-iphone` are not two crops.** They are the same pixels, one
treated and one not — identical dimensions. Measured:
`low-tide-…-desktop-5205x3840` luma 124.5 / chroma 49.0 versus
`low-tide-…-iphone-5205x3840` luma 98.7 / chroma 37.3. Anyone reading the
filenames as crop variants will draw wrong conclusions about the whole batch.

**sharp keeps only the last `resize` in a pipeline.** `resize(crop).resize(size)`
silently drops the crop, and the first version of the comparison sheet produced
164 identical pairs that looked plausible. Either fold the ratio into one
`resize`, or use `extract` then `resize`.

**`attention` centres the window on a single peak pixel.** Verified on a
synthetic — a white square at x=300 gives a window centred at 299, at x=900 gives
899, at x=100 gives 139 (clamped). It has no representation of the subject's
extent, which is exactly why it cuts heads off. Colour is *not* the cause:
stripping colour moved the focal point by more than 20% of the diagonal on only
7 of 164 works, so it is edge energy, and on a painting that peaks on
calligraphy, seals and foliage texture.

**Example strings in a VLM prompt get parroted.** The first box prompt ended with
`{"kind":"SCENE","name":"river valley"}` and four different paintings came back
"river valley", including a Winslow Homer seascape. Replacing the literal with a
`<placeholder>` shape fixed it. The cache key carries `v2` for this reason —
bump it when the prompt changes, or old answers silently mix with new.

**`wallpaper-gen` checks `museum.mjs` formatting** in its own `yarn verify`. Edit
the header comment and you will break it; `yarn format` there fixes it.

**`vl-0227` and its three siblings are not pending work.** The Brook, Gardener's
House at Antibes, Villas at Trouville and The Building of the Dam were rejected
as phone entries on 18 Aug for washing out under the treatment — that is why
`vl-0228/0232/0241/0243` are deleted. Do not "finish" them by applying the filter.
