# What the ticks came back saying

21 August 2026.

> add these to gallery, only those that pass the resolution threshold, those who
> don't add to upscale todo (only the original + write down the edit it needs)

58 ticks off the `/edits` sheet, 37 distinct paintings, each with the treatment
Charlie chose for it. The answer to "add these to the gallery" turned out to be
**there is nothing to add** — and that is the useful part, not a dodge.

Values: `research/chosen-edits.json`. Treatments themselves: `presets.json`.

---

## The threshold is not the one the sheet renders at

`/edits` renders 1080 px wide. That is a preview size, chosen so 474 slides fit
on a phone; it is not the gallery's bar. The gallery's floor is

```
keep    1320 × 2868      iPhone 17/16 Pro Max
target  1440 × 3200      Galaxy S26 Ultra, QHD+ 20:9
```

measured on the **height of the 9:19.5 crop**, because *"only height ever
binds"* — a 9:19.5 crop is shallower than a 20:9 screen, so one number decides
it (`2026-08-19-HANDOVER-bigger-copies-and-the-commons-batch.md:141-153`).
Judging these 37 at 1080 would have passed 26 of them. Judging them at the real
floor passes 21, and not the same 21.

**Measured on the best copy known, not the pool's.** Six of these are already
published from a bigger scan than the recent harvest found — Courbet's Alps are
4000×2856 in the pool and 5378×3840 on the site. Judging on the pool copy would
have sent works to Topaz that already exist at target resolution.

## The split

```
37 ticked
├── 21 pass the floor  — every one of them already in the gallery
└── 16 fall short      — 14 of them not in the catalogue at all
```

**Every single new painting he ticked is below the floor.** Not one of the 14 can
be published today; the shortest, Morland's *Before a Thunderstorm*, gives a
crop 897 px tall against a floor of 2868. The other two short ones are already
published and hidden: vl-0064 and vl-0060, both Cleveland, both short only
because the harvest took the 3400-capped `_print` derivative when a full file
exists. Those two are a download, not an upscale.

So the whole "add to gallery" half of the request resolves to: **the things that
qualify are already there.** What the ticks actually say about them is something
else — see below.

## Three of the 37 needed a human to match them

The catalogue is joined to the pool by source page URL and by accession number.
Both keys miss when the same painting is in the catalogue under a *different
source file*:

| ticked as | is | how it was missed |
|---|---|---|
| Tree Trunks, Arresødal near Frederiksværk | vl-0174 *Træstammer. Arresødal* | catalogue took SMK, harvest took Commons |
| Forstudie til "Solregn. Gentofte Sø" | vl-0259, same DEP693 | two Commons files, different names |

And one the other way, where a title match would have been wrong: Bertin's
*Italian Landscape (Le Paysage d'Italie)* is **not** *Paysage Italien: L'Abbaye
et Les Religieux* (vl-0280). Two different Italian landscapes by the same
painter. This is the same trap the `P6243` work already recorded — *"Jan van
Huysum 001"* is a portrait *of* van Huysum — and it is why title matching is a
candidate list for a human, never a join.

Tree Trunks matters: it is published at 1772×3840, comfortably over target. On
the pool copy it reads 2701 and would have gone to Topaz for nothing.

## Where several versions were ticked

Twelve works carry more than one. That is not a contradiction — the sheet asked
for every version that works. The tie is broken by his own hand: whichever of
the ticked versions he reached for most across all 37.

```
ceil 22 · snap 17 · bal 6 · app 6 · orig 4 · niobe 3
```

So *Landscape, From Lejre*, ticked on all five, resolves to `ceil`. Each work
records both the full set and which one the rule took, so overriding any of them
is a one-line edit rather than a re-derivation.

## The thing that actually blocks publishing

Of the 21 works that pass the floor, the treatment they ask for is:

```
ceil   12     the two ceilings, 18 and 65
snap    6     the 17.08 screenshot, desaturate 55%
bal     2     white balance only
app     0
```

**Not one asks for `dim80-desat-whole`** — the only treatment the generator can
make, and one it is documented to apply unconditionally: *"THE DARK TREATMENT IS
UNCONDITIONAL"* (`wallpaper-gen/museum.mjs:40`). All 21 are already published
with it. So these ticks are not an instruction to add anything; they are an
instruction to **re-treat**, and the pipeline has no way to be told which.

That also answers, by accident, the two decisions that have been sitting open
since 19.08 — *55 or 65* and *build the ceilings in or not*. The answer coming
back off the sheet is "both, per painting". Which is a bigger change than either
question assumed: the treatment stops being a property of the pipeline and
becomes a property of the work.

One consequence worth stating before anyone starts: published files are served
`immutable` for a year, so a re-treated work needs a **new filename**
(`AGENTS.md:138-145`). Re-treating 21 live works is 21 new slugs or a deliberate
break of that rule.

## What was done

- `research/chosen-edits.json` — all 37, with the chosen edit, the full tick set,
  the crop it can give, where that was measured, the verdict, and the source page
  so a bigger copy can be hunted without the pool.
- Two `TODO.md` entries: the 16 short works (bigger copy first, model second),
  and the per-work treatment that blocks the rest.
- Nothing was added to the catalogue, because nothing qualified.
