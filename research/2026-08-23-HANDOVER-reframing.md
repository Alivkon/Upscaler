# Handover — re-framing, and a `crop` rule per frame

23 August 2026. Started from *"let's wire in re-frame, we have them written down for
some works but it's not applied"* and ended with **67 phone frames and 90 desktop
frames placed by hand**, a positioner that opens on the frame you actually shipped,
and `crop` split so a desktop offset stops dragging the phone frame with it.

## What was actually missing on the first ask

Nothing in the code. `placement()` in `wallpaper-gen/treatment.mjs` already took
`{left, top}` in plate pixels, and `ADDING.md` already documented the contract.
`museum-works.json` carried the field on **exactly one work** (vl-0356) out of the
35 that `research/to-crop-positions.md` had positions for. The sheet had been filled
and never read back.

So the loop the whole day turned out to be four steps, and it is worth naming because
every round of it went the same way:

1. **look** — `research/crop-positioner*.html`, drag, click, copy
2. **record** — a row in `to-crop-positions.md` / `to-crop-desktop.md`
3. **wire** — `crop` in `~/repos/wallpaper-gen/museum-works.json`
4. **rebuild and verify** — `node museum.mjs --only …`, then a pixel check

## The verification, because it is reusable

Every batch was checked the same way: cut the window out of the **plate** at the
number in the sheet, cut the **shipped crop**, scale both to a thumbnail, take the
mean absolute difference per channel.

| what | worst seen |
|---|---|
| shipped phone crop vs plate extract at the recorded offset | **2.8** / 255 |
| shipped 16:9 crop vs plate extract at the recorded offset | **2.1** / 255 |
| a *centre* crop compared against the same recorded offset | **28.8** |

The gap between 2.8 and 28.8 is the whole test: JPEG noise lives around 2, being one
frame off lives around 30. Anything above ~4 is a real mismatch. This is what caught
nothing in the end, which is the point — it is cheap enough to run on all 90.

## The `crop` split

Desktop positions could not be applied at first: one `crop` field fed all three
frames, so a `top` measured on 16:9 would have moved the phone frame Charlie had
just approved. `crop` now takes either form:

```json
"crop": { "left": 744 }                                  // one rule, all three frames
"crop": { "phone": { "left": 903 }, "wide": { "top": 2912 } }
```

- resolved by `frameCrop(rule, kind)` in `treatment.mjs`, called at both sites in
  `museum.mjs` — the tone probe (phone) and the cut loop (per kind)
- **`tall` follows `phone`.** 9:16 is the same portrait intent, only wider, and it has
  never been measured by hand
- a stray key (`desktop`, `Wide`) **throws at load**. Silently centring a frame
  because of a typo is indistinguishable from "that's how it was wanted"
- the old form is untouched, so the 18 works that still carry it did not move

## Where things stand

- **296 works** in `museum-works.json`, all in the manifest
- **108 carry a crop**: 18 old-style, 90 per-frame
- **67 phone rules**, **90 desktop rules**
- `to-crop-positions.md` — 112 refs, 67 applied, 45 `center` (looked at, kept)
- `to-crop-desktop.md` — 90 refs, all applied
- **the unseen page is empty**: every work on the gallery has a phone verdict

## The positioner

`scripts/research/crop-positioner.mjs` grew three things:

```
node scripts/research/crop-positioner.mjs            # whole gallery, phone frame
node scripts/research/crop-positioner.mjs --unseen   # no row in to-crop-positions.md yet
node scripts/research/crop-positioner.mjs --desktop  # 16:9, only frames the gallery shows
```

`--desktop` mirrors `DESKTOP_GATE` from `gallery.js` (1920 × 1080) — 101 of the 109
works on the gallery clear it, and the 8 that don't are hidden on the site anyway, so
they are not asked about.

Every viewport now **opens where that frame stands today**, not at blind centre, and
`⊕` returns there. A `·moved` tag marks frames that sit off centre, per frame — a
work can be moved on phone and untouched on 16:9, and on a portrait plate the 16:9
window spans the full width and *cannot* move.

## Three traps, all of them paid for

**`--only=` does not parse.** `museum.mjs` reads its flag with
`args.includes('--only')`, so `--only=vl-0025,…` is not seen and the filter falls
through to *build everything*. It cost an hour of CPU and a full rebuild of 284
works. The space form works: `--only vl-0025,vl-0026`. Nothing broke — no dimension
changed, and vl-0371 got built for the first time as a side effect — but the flag is
still a silent footgun.

**The positioner read plate dimensions from the catalogue.** `catalogue/*.json`
carries a `file` field that is stale for **57 works** (an older build, a different
size). Recorded pixels are a fraction of plate width, so every number taken for those
works would have been off by the ratio between the two sizes. Dimensions and
thumbnails now come from `images/manifest/`, which is what the generator actually
wrote. The stale `file` fields are still there — the site prefers the manifest
(`gallery.js:318`), so they are a record, not a bug, but do not measure against them.

**The positioner had to learn the new `crop` shape.** It read `crop.left` directly,
so the moment `crop` became a map every per-frame work would have opened at centre —
showing the wrong frame while claiming to show the shipped one. It now carries its own
copy of `frameCrop`. **These two must stay in step**: the tool asks a question about
the picture the generator cuts, and a tool that models the cut differently asks about
a picture nobody will ever see.

## Left open

- **Eleven works never got a desktop record**: vl-0377 … vl-0387, the last row of
  the desktop page.
- **Multi-crop.** Charlie recorded several frames for some works and the standing
  instruction was *"just take the first one"*. `v1` is applied, `v2`/`v3` sit in the
  sheets unapplied, and nobody has decided what they become — separate slugs, a `-v2`
  suffix, or something else.
  Phone: vl-0060, vl-0179, vl-0240, vl-0291, vl-0359, vl-0377, vl-0381, vl-0382.
  Desktop: vl-0068, vl-0087, vl-0374.
- **Four desktop numbers sit 1–14 px past the edge** (vl-0057, vl-0060, vl-0261,
  vl-0297) — dragged to the stop. Recorded as given, clamped on cut.
- ~~vl-0371 has a catalogue entry but no row in `order.json`, so it does not show.~~
  **Settled since:** it is in `order.json` and live (phone crop 836 × 1811), and as of
  24.08 it is the only visible work with no row in `to-crop-positions.md` — 116 of 117
  have one. It sits on the 24.08 positioner sheet with vl-0397 and vl-0398.

## Files

`~/repos/wallpaper-gen` — `treatment.mjs` (`frameCrop`), `museum.mjs` (both call
sites, load-time check), `museum-works.json` (108 `crop` fields).

`~/repos/Upscaler` — `scripts/research/crop-positioner.mjs`,
`research/to-crop-positions.md`, `research/to-crop-desktop.md` (new), `ADDING.md`,
`TODO.md`, and the three generated `research/crop-positioner*.html`.


## Addendum, 24 August: the sheet did not open on a phone

`crop-positioner.mjs` wrote `http://localhost:3000/images/…` into every card, so the
plates only loaded on the machine that generated the file. From a phone `localhost` is
the phone, and all three sheets opened as empty outlines with working drag handles —
which looks like a styling bug, not a wrong host.

The frames are judged on a phone, so the sheet has to open on one. The host now comes
from the page itself and only the port stays fixed:

```js
imgEl.src = `http://${location.hostname || 'localhost'}:3000/images/${img.thumb}`;
```

Behaviour on localhost is unchanged. The header now prints the host it actually asked
(`plates from 192.168.178.20:3000`) so an empty sheet says where it was knocking
instead of looking broken.

The three generated `crop-positioner*.html` in `research/` predate this and still carry
the hardcoded host; they are regenerated by rerunning the script, and only
`crop-positioner-only.html` has been rebuilt so far.


## Addendum, 24 August: `verify-frames.mjs` checked one ref out of three

`ADDING.md` documents the tool as `verify-frames.mjs [refs]`, a list of arguments.
The code read `process.argv[2]` and split it on commas, so a space-separated call

```
node scripts/research/verify-frames.mjs vl-0371 vl-0397 vl-0398
```

verified **vl-0371 only**, counted 3 frames, and printed *«все кадры вырезаны там,
где записано»*. A clean pass over a third of what was asked, with nothing in the
output to say so — the count is there, but 3 looks right when you are not counting.

Both forms are accepted now (`argv.slice(2)`, then split on commas). The same call
became 9 frames — and immediately failed one, which is the point:

```
сверено 9 кадров · худшее расхождение 4.95 (vl-0398 wide)
не совпали с плитой — 1:
  vl-0398 wide — 4.9
```

That failure was real and is described in `to-crop-positions.md`: a phone offset
carried into the 16:9 frame by the shared `crop` form. Scoped to `phone`, all nine
pass at worst 3.72 — the residue is fine pine needles against pale sky, where
resampling to the 64 px probe costs more than flat paint does.

**A verifier that silently checks less than it was asked is worse than none:** it
spends the suspicion without doing the work. Two runs in this session reported
success over a single ref while claiming the batch.
