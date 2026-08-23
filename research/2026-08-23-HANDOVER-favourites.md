# Handover — the favourites that never reached the gallery

23 August 2026. Started from one question — "we had some works in favorites … that
are not in the gallery now, why" — and ended with five works published, a vignette
on the edits sheet, and a four-day-old misidentification corrected.

## What the question turned out to be

**Three separate causes, not one.**

1. **A bulk sweep.** Commit `d47451c` (20.08) hid every work harvested before
   18 August, because they came down as `_print` capped at 3400 px and 60 of 134
   could not cut the 3120 frame. All 134 went, not just the 60. The next day
   `ea82cca` lowered the floor to 1320×2868 and wrote the rule down —
   «работа между числами остаётся на витрине» — but nobody un-hid the sweep.
   **249 works carry `hidden: true` today; measured off the files on disk, only 18
   fall below the floor, and 14 of those 18 are our own generated gradients.**

2. **Favourites that were never harvested.** The extended favourites list is not
   one file — `scripts/research/cle-similar.mjs:37` is the only thing that unions
   the three places it lives: `handpicked-overrules.json` → `keep`,
   `references.json` → `works` and `also_named`, plus Niobe `vl-0324`. Of the 34,
   fifteen had never been given a catalogue entry at all. The overrules file
   protects a work from the filters; it does not add it.

3. **A request that never landed in a file.** See below.

## The kabuki work — what went wrong and what it actually is

On 19.08 Charlie wrote *"maybe add it to handpicked-filter-overrules like that
japanese painting with a kabuki person"* — naming it as a precedent that already
existed. It did not. The session guessed `vl-0139` Aizen Myōō, wrote
`"identification": "ASSUMED"`, and the guess stood for four days.

The real request was **17.08 16:16**, the last clause of a long message about
model gates: *"keep yamamba when model kicks it out as a human, i like it."*

**`aic-154667` — Yamamba, from the series "One Hundred Noh Dramas
(Nōgaku hyakuban)", Tsukioka Kōgyo, Art Institute of Chicago.**

Why no keyword search found it: the word "kabuki" appears in exactly three
transcript files across every project, all of them this repo, all of them after
the fact. Searches for samurai / geisha / monk / demon / actor / ukiyo / Utagawa /
Hokusai / Hiroshige / bijin return nothing either. **He described it by its title,
and the title contains none of the words he later remembered it by.** What found
it in the end was reading every user message containing the word "add" before
19.08 07:45 — 36 of them.

Why it was not on the 377-work figure sheet built to find it: `verdicts.json`
scores it `fig: 0`. Only CLIP flags it, at **-0.003 against a threshold of
-0.032** — the least person-like work the people gate still throws out. That is
the rejection he was overriding.

`vl-0139`'s entry now says `identification: WRONG` and points at `aic-154667`.
The keep itself stands: he wants that painting too, only the label was mistaken.

## What changed in the repo

- **`research/handpicked-overrules.json`** — 29 → 31 entries. Added `aic-154667`
  Yamamba (with `asked: 2026-08-17` beside `added: 2026-08-23`, so the six-day gap
  stays visible) and `aic-152437` Fisherman's Cottage. New `batch_2026-08-23` note.
  `vl-0139`'s identification corrected.
- **`research/chosen-edits-favourites.json`** — NEW, the third such file
  (`chosen-edits.json` = the pool round, `-v2` = the gallery round). 21 works on the
  sheet, 13 ticks on 10 works. Each row carries the source size, the phone frame it
  yields, and whether that clears the floor.
- **`scripts/research/gedits.mjs`** — vignette pairs. `vignetted()` ported from
  `public/treat-local.js` onto raw pixels: inscribed ellipse, squared smoothstep,
  `VIGNETTE_DEPTH = 0.12`, the same number at both ends. Paired only with the four
  dimmed edits (`snap`, `app`, `ceil`, `niobe`) — `orig` and `bal` get no twin,
  because a vignette over an untouched picture reads as a printing fault. Tick keys
  are `<ref>#ceil-vig`. `EDITS` is still the six presets; `VERSIONS` is the ten that
  get rendered, and everything that counted `EDITS` now counts `VERSIONS`.
- **`wallpaper-gen/treatment.mjs`, `museum.mjs`** — the vignette, and a `-vig`
  twin of every rule derived from it rather than typed beside it. Applied per
  frame, after cutting (see open item 1).
- **Published** — `vl-0373` Fisherman's Cottage (`bal` + `none`), `vl-0374` Snowdon
  from Llyn Nantlle (`snap-vig` + `none`), `vl-0375` Jacob with Laban and his
  Daughters (`snap-vig`), and `vl-0036` → `snap`, `vl-0052` → `niobe`,
  `vl-0053` → `bal`, all three un-hidden. Plates generated, `order.json` updated,
  all six answer 200. **Six ticked works clear the floor and six are published;
  the four that do not are a TODO entry with the biggest scan found for each.**

## The rule for an empty tick, which is not the same in both files

Charlie, this session: *"i ignored ones already in the gallery so don't mark those
as 'looked at and rejected' / i meant only for those that are already in the
gallery, for the new ones not marked is rejection."*

- work **not yet in the gallery**, no tick → `ticked: []`, a refusal, as in `-v2`
- work **already in the gallery**, no tick → `ticked: null`, "not marked", ask again

On this sheet `null` never occurs: all three catalogue works were ticked. The field
is documented anyway, because the next sheet will mix both kinds.

**Yamamba is among the eleven rejections.** He was told, and said "leave it".

## Two mistakes made in this session, both worth not repeating

**The sheet was built on 400 px previews.** `/tmp/oils-preview` holds the funnel's
preview copies, not masters, and the first run upscaled all sixteen `wm-` works to
1080 wide. Charlie caught it on Laban — *"laban is super blurry"*. Sizes were never
measured before rendering. The fix was pulling the real Commons originals; the
lesson is that the preview pool is not a source.

**Nine already-decided works were put on the sheet.** Folder mode has no tick
history — it cannot see `chosen-edits-v2.json` — so works settled on 22.08 came back
as open questions. Charlie: *"wait why am i seeing cle-1949.541, i already ticked
them"*. Removed by hand. If the folder sheet is used again over gallery works, the
history has to be filtered in first.

## Open, in rough order of how much they cost

1. ~~**The vignette does not exist in `wallpaper-gen`.**~~ **Done, 23.08.**
   `vignette()` is in `treatment.mjs` beside the rest of the rules, and every
   rule now has a `-vig` twin generated from it — `none-vig` and `bal-vig`
   included, because Charlie said the originals are worth trying vignetted too.
   It is applied **after cutting, to each frame with that frame's own
   dimensions**, and separately to the plate: laid on the plate and cut
   afterwards it would give each crop a lopsided gradient rather than a
   vignette. So `vl-0375` Jacob with Laban is published (`snap-vig`, its only
   tick) and `vl-0374` Snowdon rebuilt as `snap-vig` + `none`. The site names
   the twins by deriving them too — `TREATMENT_NAMES` in `pages.js`,
   "Muted, darkened corners".
2. **231 hidden works clear the floor.** The sweep is still un-reversed. Three of
   the eight reference works — the set every numeric gate is calibrated against —
   were among them; `vl-0088` Interior of a Church is still hidden.
3. **Fisherman's Cottage has no cottage in its phone frame, and that stands.**
   Measured: the lit wall runs x 2085–2159 of the 2607-wide plate, and the
   centred phone window ends at 1996 — outside by 90 px. The gallery tile is the
   9:16 crop, which ends at 2147, so there the cottage sits in the last 60 px:
   that is the corner Charlie saw. Told about it he said to leave the framing
   and name the cottage in the description instead, and the `alt` now does.
   A crop rule would still be a one-liner (`crop: { left: 1222 }`) if the phone
   frame is ever meant to hold it.
4. **Le Pandémonium** — the 10714×7663 framed scan is pulled to
   `scratchpad/pandemonium-avec-cadre-3.jpg` (23 MB). Frame not removed yet. Once
   it is, the crop is 3537×7663 and it ships. This is the only one of the four
   undersized favourites that a bigger file can rescue: Great Day of His Wrath tops
   out at 3136×2023, Meleager and Atalanta at 3028×2398 (the 4000 px "Meleager en
   Atalanta" files on Commons are Rijksmuseum engravings by other hands), and the
   van Schrieck forest floor at 1705×2000. **That last figure was wrong here:
   it said 2118×2500, which is a different van Schrieck forest floor — same
   painter, same genre, another canvas. Checked by eye 23.08.** The other three
   were upscaled that day and published; see
   `research/2026-08-23-upscaling-the-backlog.md`.
5. **Six ticked works from 22.08 are still unapplied** — `vl-0139`, `vl-0084`,
   `vl-0043`, `vl-0060`, `vl-0064`, `vl-0175` all run `dim80-desat-whole` while
   something else is ticked. Separate backlog, untouched.
6. **`yarn verify` fails on two entries that are not from this work** —
   `vl-0371` missing from `order.json`, `vl-0361` with an empty
   `provenance.creator`. Both from today's ColBase batch in another session.

## Where things are

```
sheet          http://192.168.178.20:7725/new.html   (7723/7724 held by other sessions)
sheet sources  scratchpad/favs/                      21 files, real Commons originals
sheet output   /tmp/oils-preview-favs/{new.html,new.json,new/}
figure sheet   file:///home/charlie/upscaler-review/find-the-kabuki.html   377 Asian figures
pandemonium    scratchpad/pandemonium-avec-cadre-3.jpg
```

`scratchpad` is
`/tmp/claude-1000/-home-charlie-repos-Upscaler/aefb1fce-6310-4d1e-9842-a72b946f9c81/scratchpad`.

AIC serves images only to a real browser now: every path under `www.artic.edu`,
`/iiif/` included, returns 403 behind Cloudflare, with or without the
`AIC-User-Agent` header the harvest used on 17.08. `api.artic.edu` still answers
metadata. Their IIIF also caps delivery at 3000 px on the long side — the
7611×8758 in the Fisherman's Cottage record is the archival scan, not what they
hand out.
