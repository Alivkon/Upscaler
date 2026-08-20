# Handover — a bigger copy beats a bigger model. 19 August 2026, midday

Third handover of the day. The first two are
[2026-08-19-HANDOVER-phone-first.md](2026-08-19-HANDOVER-phone-first.md) (the
measurements) and
[2026-08-19-HANDOVER-phone-first-build.md](2026-08-19-HANDOVER-phone-first-build.md)
(the build). Read this one for what the collection is made of now; read that one
for how the crops and the treatment work, which has not changed.

---

## 1. What Charlie decided

| | |
| --- | --- |
| everything before the 18 Aug harvest | **hidden** — it was fetched at the wrong size |
| the funnel's «survived everything» | **add it**, but only what can actually ship |
| CC BY | **usable** — «we give attribution», and we do |
| CC BY-SA | left out (see §4) |
| the treatment as it stands | **approved**, and pinned to one picture (§3) |

## 2. The collection today

**330 entries, 115 shown, 215 hidden.** The shown half is 19 works from the
18 August Cleveland harvest and 96 added today.

Everything added on 16 August is hidden. Not because it is bad: 126 of those are
Cleveland works fetched as `_print`, capped at 3400 on the long side, and 60 of
them cannot cut a 3120-tall phone crop. The `added` field separates the eras
cleanly and the ref numbers happen to agree, so no new field was invented for
this — see the table in §5.

## 3. The treatment is now pinned to a picture

Charlie said he liked what the current settings did to Gainsborough's «Rocky,
Wooded Landscape with a Dell and Weir» (**vl-0240**, Cleveland 1984.59). That is
the only plate with a named verdict on it, so the header of
`wallpaper-gen/treatment.mjs` now records the settings *and the sha256 of both
the master and the plate they produced*.

**The hashes are the point.** After changing the numbers, run the generator on
vl-0240 alone and compare. Same hash → the edit never reached the picture he
approved. Different → it did, and somebody has to look before the change stands.
`Upscaler/treatment.js` carries a pointer to the same note, because the algorithm
exists twice and must stay identical.

## 4. What was added, and what was thrown out on the way

99 works, refs **vl-0251 – vl-0358**: 92 from Wikimedia Commons, 7 new from
Cleveland. The generator has since run over all 267: 99 masters downloaded, no
museum refused, `images/manifest/museum.json` rewritten. The site reads the
manifest per request, so the shelf shows 115 works with no restart, every one of
them with files on disk.

**The funnel's 628 survivors were mostly unusable, and the reason matters.** The
funnel judged 400–500 px thumbnails; it never asked how big the file behind the
thumbnail is. Asking Commons for all 607 originals: median phone crop **1100 px**,
and only 92 clear 3120. That is the same failure that hid 134 works this morning,
arriving from the other direction.

**Then a bigger copy was found for some of them, and that is the useful part.**
Commons files carry `P6243` — «digital representation of» — pointing at the
Wikidata item for the painting. Every photograph of one canvas shares that
Q-number whatever the filename says. Joining on it, filtering to candidates
within 3% of our aspect ratio, over the 515 short works:

| | |
| --- | --- |
| carry `P6243`, joinable | 371 |
| **no statement — nothing is known about these** | **144** |
| a bigger same-ratio copy exists | 66, over 59 paintings |
| **crossing 3120 on that alone** | **30 findings, 27 paintings** |

Harnett's Munich Still Life went 486 → 6587. Courbet's Valley of Ornans
420 → 3796. Free pixels, no model, no museum that can refuse.

**Three string-matching attempts were thrown away before this worked**, and the
next person should not repeat them. Title similarity matched seven different
Bierstadts to one Art Institute artwork and matched «Jan van Huysum 001» to a
portrait *of* van Huysum. The Met returned nothing because Incapsula was serving
a challenge page, not because nothing was there. SMK returned nothing because its
search does not include image fields unless asked. A join on a key, or nothing.

**The join swaps the photograph, not the file size — 11 works need eyes.**
`P6243` says «this is the same canvas», and nothing more. The replacement is a
different shoot: different lighting, different colour balance, sometimes the
canvas edge left in. Refs **vl-0340 – vl-0350** are the eleven that were swapped,
and `<scratchpad>/swaps.html` shows each.

**There is no old-versus-new choice here, and reading the sheet as one is a
mistake** — the first version of that sheet invited it and was rebuilt. Every one
of the eleven originals fell short of 3120; that is why they were swapped.
Harnett's was **600×486**, Courbet's Valley of Ornans **600×420**. The question
per work is «take this scan, or drop the work», not «which scan is better».
The matching trap: a 400 px preview enlarged next to a 900 px one looks like a
bad photograph rather than a small one. Judge a scan at its own size, alone.

Judged that way, all eleven are sound and **only vl-0341 has a defect** — the
canvas edge on four sides and a strip of stretcher along the bottom, which the
frame-trim scripts handle. What is left is fit, not quality: **vl-0342**
(Hammershøi) is a clean, probably colour-accurate scan of a pale grey building,
and pale grey is not what this collection is; **vl-0348** (Bierstadt, Lander's
Peak) is sharp but a bright blue sky over a meadow of small figures.

**The crop matters more than the scan on the wide ones.** The phone frame takes
28% of the canvas width on vl-0348 and vl-0350, 32% on vl-0345, 35–38% on
vl-0340, vl-0341 and vl-0347. With `centre` still the placeholder, those are
cropped by default rather than by choice.

**The credit pointed at the file we did not download.** All 11 swapped entries
had kept the `page` of the scan the funnel found, and had inherited that file's
licence as well. Both are now taken from the replacement itself. All eleven turn
out to be public domain, so the labels happened to be right — but nothing had
checked, and a CC BY-SA replacement would have shipped wearing «public domain».
Anything that swaps a source must re-read the licence and the credit from the
file it actually took.

**Five files were dropped after looking at them**, and the ratio filter had
passed all five: vl-0271 photographed in its gold frame on a gallery wall,
vl-0303 and vl-0351 octagonal canvases scanned on white, vl-0337 and vl-0339
pencil drawings on pink mounts with the museum label in shot. Aspect ratio is a
cheap discriminator and not a sufficient one — look at the contact sheet.

**Three portraits are in but hidden** (vl-0257, vl-0273, vl-0344). TODO item 1
says portraits stay off the shelf; that is Charlie's rule, applied, not a new
opinion. One field returns them.

**CC BY is now a real licence type.** `works.js` carries `cc-by` and
`/license#cc-by` states the three things the licence asks: name the author, link
the licence, say it was changed — and it *was* changed, every plate is darkened,
desaturated and cropped. One work uses it today (vl-0264). **CC BY-SA is still
excluded and not for the same reason**: share-alike would force our download out
under CC BY-SA as well, so those works cannot wear the terms the rest wear.

## 4a. The bar: keep at 2868, hunt to 3200

Charlie set this on 20 August, and it is two numbers doing two different jobs.

| | | |
| --- | --- | --- |
| **floor — keep the work** | **1320×2868** | iPhone 17/16 Pro Max |
| **target — go looking for a bigger copy** | **1440×3200** | Galaxy S26 Ultra, QHD+ 20:9 |

3200 is the top of what is sold: nothing mainstream goes above QHD+ in 2026, and
the phones that did (Sony's 4K Xperias, 1644×3840) are discontinued. Aiming at
3840 would drop 32 of the 115 shown works to chase hardware nobody makes.

**A work between the two numbers is kept, not dropped** — it is a reason to go
looking, not to hide it. Three of the five below 3200 miss by 4, 17 and 45 px.

**Only height ever binds.** A 9:19.5 crop is shallower than a 20:9 screen, so
filling a taller screen means matching height and the width comes out surplus —
1477 against 1440 needed on an S26 Ultra, 1772 against 1644 on a 21:9 Xperia.
One number to check, not two.

What the hunt turned up for the five below 3200:

| ref | crop | outcome |
| --- | --- | --- |
| vl-0252 van Huysum | 3155 → **5042** | **taken** — Google Art Project scan, 7129×9359, richer and sharper |
| vl-0346 Friedrich | 3196 | the bigger candidate is a gallery snapshot, gold frame in shot, glare — **rejected** |
| vl-0332 Wilson | 3143 | Commons holds exactly one copy, and it is a Met file — blocked behind Incapsula |
| vl-0236 Daubigny | 2841 | below the floor too, by 27 px; Cleveland has nothing bigger |
| vl-0238 Heade | 3183 | Cleveland `full.tif` already, nothing bigger exists |

**vl-0252's licence changed with the file** — the old Getty scan was CC0, the
replacement is public domain. The label was corrected. This is the second time
in two days that swapping a source moved the licence, and nothing checks it
automatically.

## 5. Where the collection came from

| block | refs | entries | shown | source |
| --- | --- | --- | --- | --- |
| pre-museum era | vl-0001 – vl-0034 | 34 | 2 | LLM/community, Pittsburgh, Getty, Berlin |
| first Cleveland harvest | vl-0035 – vl-0166 | 126 | 0 | Cleveland `_print` — **all hidden, all capped** |
| other museums | vl-0167 – vl-0179 | 13 | 0 | USGS EROS, SMK |
| more pre-museum | vl-0180 – vl-0214 | 35 | 0 | no credit |
| second Cleveland harvest | vl-0215 – vl-0250 | 23 | 19 | Cleveland `full.tif` |
| **this batch** | vl-0251 – vl-0358 | 99 | 96 | Commons + 7 Cleveland |

## 6. Open, in order

1. **Three decisions on the eleven swapped scans** (§4), sheet at
   `<scratchpad>/swaps.html`. vl-0341 needs the frame trim run on it before it
   ships. vl-0342 and vl-0348 are sound scans that may not suit the collection —
   a pale grey building and a bright blue sky. The other eight need nothing.
2. **vl-0236 cannot make a phone wallpaper.** Daubigny's «Villerville seen from
   Le Ratier» is 6105×2841 — a 2.15∶1 panorama, so its phone crop is 1311×2841
   and falls 279 px short of 3120. It is the only work on the shelf that does.
   Its slug says `iphone-wallpaper`. Hide it, or accept a short one.
3. **Get the rest by finding copies, not by upscaling.** The live list is
   [TODO.md](../TODO.md), next to the Topaz entry. Three leads, in order of
   value: 144 works with no `P6243` (unknown, not «no»); the museum APIs that
   were never really asked (Met, Chicago, SMK, NGA, Rijksmuseum,
   Nationalmuseum); and — do not bother — Art UK (88), Web Gallery of Art (31),
   Yorck Project (17) and «own work» (20), which are fixed-size archives and
   have nothing bigger by construction.
4. **Run the same join over the works that already pass.** Nobody has asked
   whether the 92 that cleared 3120 have a better copy too. More headroom is
   worth less than a rescue, but the query is already written
   (`<scratchpad>/wmsdc.mjs`).
5. **The `_print` → `_full.tif` re-download** is now the only route by which any
   of the 126 hidden Cleveland works can come back: 12.5 GB, 128 masters, and
   `sources/<ref>.jpg` must be deleted first because the cache key does not
   notice a changed URL.
6. **Topaz, last.** $32.60 buys all 451 reachable works, but the median needed
   factor is 3.36× and 121 need 6× — a 500-px scan asked to become 3120 is
   drawing brushwork, not restoring it. The defensible slice is the 150 that
   need only 2×: **$11.40**. Tariff: $0.05 per output up to 24 MP, $0.10 to 48.
7. **Charlie picks the final set, then the crop per work.** Unchanged.
   `centre` is still the placeholder and `.cropsheet.mjs` renders all four.

## 7. Traps

**Everything in §5 of the previous handover still applies** — the duplicated
treatment algorithm, in-place plate replacement, `sharp` keeping only the last
`resize`, `attention` cutting heads off, vl-0227 and its three siblings not being
pending work, `.cropbox.mjs`'s paid cache, and `wallpaper-gen` checking its own
formatting.

**`SHORT_SIDE = 3840` caps the short side of every plate**, so a phone crop can
never exceed 3840 however big the master is. Crop heights quoted from source
sizes are pre-cap numbers. This does not affect the ≥3120 test — capping to 3840
leaves a passing work passing — but it does mean the extra pixels in a 9530 px
scan buy nothing beyond the cap.

**Two of our own works turned out to be the same painting more than once.**
Among the 371 joinable short works, 23 paintings appeared twice or more —
28 redundant files — and three collisions were caught against the existing
catalogue during this batch. The catalogue's own duplicates were removed
yesterday. Nothing in either pipeline joins on the artwork's identity, so this
will recur with the next harvest unless `P6243` is recorded at intake.

**Title similarity is not identity.** Written out in §4 because it cost three
attempts. Two works by one painter share most of their significant words.

**A museum that stops answering does not say so in a way a script notices.**
The Met served an Incapsula HTML challenge with a 200-ish shape; parsing it as
JSON threw, and a `catch` turned that into «no match». Any sweep over museum APIs
needs to tell «refused» apart from «nothing found», or it will report a clean
null result that is entirely an artefact.

## 8. Repo state

**Nothing is committed in either repository.**

`Upscaler` — modified: `pages.js` (the CC BY section on `/license`), `works.js`
(`cc-by` in `LICENSES`), `treatment.js` (pointer to the pinned version),
`TODO.md` (the new «find copies before upscaling» task), `public/styles.css`,
`server.js`, `AGENTS.md`, `catalogue/order.json` (330 refs, new ones first), and
**134 catalogue entries hidden** plus **99 new catalogue files**
(`vl-0251` – `vl-0358`).

`wallpaper-gen` — modified: `museum-works.json` (168 → 267), `museum.mjs`,
`package.json`. New: `treatment.mjs`, with the pinned-version note in its header.

Outside git: the working files for this session are in the session scratchpad —
`wm-sizes.json` (all 607 Commons originals), `wm-qall.json` (449 Wikidata ids),
`wm-sdc-better.json` (the 66 bigger copies), `add-all.json` (the batch as built),
`described.js` (the alt texts, hand-written from contact sheets), and the scripts
that produced them: `wmsize.mjs`, `wmsdc.mjs`, `qall.mjs`, `meta.mjs`,
`assemble.mjs`. `~/upscaler-review/` and `/tmp/oils-preview/` are unchanged and
still hold the funnel's own working set.
