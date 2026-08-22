# Bigger sources: 35 works were being judged on scans a fraction of their size

20 August 2026.

> for the rest — first, check if we didn't recently obtained better scans,
> another chat earlier downloaded some better versions, use bigger ones if so.

**35 of the 628 had a much bigger source available. All 35 now use it.** The
pool's median long side went from 1254 px to 1576, and the works Charlie marked
good on 20.08 sit at a median of 2701.

## Where they came from

Three piles, and only one of them was a download by another session.

### 1. Cleveland masters already on disk — 7 works

An earlier session pulled the museum's `_full.tif` masters into
`~/tessarum-harvest/cle/plates` (39 files, 2.5 GB) and its 3400 px `_print.jpg`
renditions into `.../print` (60 files). The pool had been reading `_web.jpg` at
about 1200 px the whole time. Nothing to fetch — the files were here.

```
 893 → 5829   Ruin by the Sea
1263 → 5721   Point Judith, Rhode Island
1244 → 5378   Panoramic View of the Alps, Les Dents du Midi
 893 → 5139   Apple Blossoms
1166 → 5015   Rocky, Wooded Landscape with a Dell and Weir
 900 → 3400   Haverstraw Bay
1263 → 3400   View near Newport
```

### 2. Wikimedia TIFFs never fetched — 14 works, and this was a bug

`hires.mjs` upgrades a Commons thumbnail by swapping the width in the last path
segment: `500px-NAME.jpg` → `1600px-NAME.jpg`. A **TIFF-backed** file renders as
`lossy-page1-500px-NAME.tif.jpg`. The width is not at the start of that segment,
the rewrite silently did not match, and fourteen works stayed at 500 px.

They are not small files. They are museum masters:

```
500 → 10468   Claude Lorrain - Landscape with the Voyage of Jacob
500 →  7846   Hiroshige - Night Rain at the Azuma Shrine
500 →  7608   Hiroshige - Night Rain at Karasaki
500 →  7534   Hokusai - Fuji from Surugadai
500 →  7437   Hokusai - Lumber Yard
500 →  6930   Courbet - The Cliff at Étretat
500 →  6585   Richard Wilson - Landscape (Albright–Knox)
500 →  5973   Jean-Victor Bertin - Paysage Italien
500 →  5500   Gainsborough - Rocky, Wooded Landscape with a Dell and Weir
500 →  5500   Claude Lorrain - Italian Landscape
579 →  5000   Emanuel de Witte - Interior of a Church
500 →  3534   Landscape, From Lejre (Hammershøi)
500 →  3261   Claude Lorrain - Rest on the Flight into Egypt
500 →  3065   Landscape with a Shepherd and Shepherdess (Claude)
```

Six of the fourteen are works Charlie marked good. They were marked on the
strength of a 500 px scan.

**A wider thumbnail is not the fix.** Commons will not render one for these — the
thumbnailer refuses to scale a file that large on demand and answers 400 to
every width except the two already in its cache. Measured on the Hammershøi:

```
320→400  640→400  800→400  1024→400  1280→200  1920→200  2560→400  3534→400
```

So `upgrade.mjs` takes the **original file** instead, which has no thumbnailer in
front of it. The Hammershøi TIFF is 23 MB; a 300 MB cap stands guard for the
ones that are not.

### 3. Cleveland's open-access CDN — 14 more

The pool's `cle-` refs carry the accession number in the ref itself, so
`_print.jpg` at 3400 px is one string away on the same server the harvest
already uses. Every Cleveland work still under 3000 px answered 200 to a HEAD,
about 5 MB each. Eight of them are in Charlie's marked list, including *Interior
of a Church*, *Interior of the Pantheon*, and both Church nightscapes.

## What did NOT need fixing

Worth recording, because it is the reassuring half and it was the expensive
thing to check. `originals.mjs` asked the Commons API for the true size of all
**330** works in the pool under 1600 px:

> **For 316 of them we already hold the original file. Zero upgrades available.**

`hires.mjs` did its job everywhere except the TIFF path. The pool is not
generally under-fetched; it had one blind spot, and the blind spot happened to
contain the biggest files in it.

## The trap this created

`frames.json` stores its boxes in **source pixels**. A box measured on a 500 px
scan is still comfortably inside the bounds of a 4000 px one, so it passes every
sanity check in `pick.mjs` and crops a postage stamp out of the corner. Changing
a source therefore *requires* re-running `frames.mjs` before `pick.mjs`, and
`upgrade.mjs` says so on the way out rather than leaving it to be found on the
sheet.

Re-run on the new sources, the frame detector finds 33 works rather than 35 —
two of the 500 px hits were the scanner border of a thumbnail and are simply not
there in the master.

## Where it leaves the pool

```
                   long side 10/50/90
whole pool   before  612 / 1254 / 4425
             after   700 / 1576 / 4425

Charlie's 54  after   823 / 2701 / 4000     34 of them at 2000 px or more
```

Still small, in the marked 54: **13 under 1100 px.** These are not fixable the
same way — Commons holds the original already and it really is that size. The
only route left is a *different file of the same painting*, which is a search
and not a rewrite. Smallest are Martin's *Christ Stilleth the Tempest* at 600,
*Landscape (1677)* at 700, and two Hammershøis under 800.

## Files

- `/tmp/oils-preview/originals.mjs` → `commons-originals.json` — the API probe.
- `/tmp/oils-preview/upgrade.mjs` — all three piles; `--dry` says what it would
  do. Safe to run twice: it reads the size off the file on disk, so an upgraded
  work no longer qualifies.
- `/tmp/oils-preview/picked-good.json` — the 54 Charlie marked, with titles.
