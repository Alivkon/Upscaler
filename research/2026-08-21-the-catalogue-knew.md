# The catalogue knew where the good files were

21 August 2026.

> and we don't have any of the missing ones in the main app gallery?

We did. **12 of the 422 works that cannot fill a phone screen are already
published in the gallery**, several of them enormous. The worst case:

```
Gustave Courbet — The Valley of Ornans
  in the pool     600×420    a 194 px phone crop
  in the gallery  5400×3796
```

Charlie had kept that one. He was judging a painting we have published at nine
times the width.

## Why the pool and the gallery disagree

They were filled by different passes from the same museums, and **only the
catalogue wrote down where it got each picture.** Every entry carries
`provenance.page` and `provenance.credit`:

```
vl-0345  Wikimedia Commons              commons.wikimedia.org/wiki/File:Gustave Courbet - The Valley of Ornans…
vl-0174  SMK, National Gallery, KMS8010 open.smk.dk/artwork/image/KMS8010
vl-0354  Cleveland Museum of Art, 1922.684
```

That is **330 verified sources that nothing in the pool has ever read.** The
harvest kept a thumbnail URL; the catalogue kept the provenance. Only one of
those survives being asked for a bigger file.

Matched by picture, not by name — the same two-stage test as `dupes.mjs` — since
the catalogue calls it *The Valley of Ornans* and the harvest calls it
*Gustave Courbet 045*.

## Three routes, one per credit

- **Wikimedia** — `provenance.page` is a `File:` page; ask the API, take the original.
- **Cleveland** — `provenance.credit` carries the accession; `_full.tif` on the
  open-access CDN, falling back to `_print.jpg`.
- **SMK** — the object number; `api.smk.dk` returns `image_native`, the museum's
  own full-size JPEG. KMS8010 is 7217×4873.

## What came back

**11 of 12 recovered** (the twelfth already had the best file). Phone crop width,
against the 1080 px target:

```
★  194 → 1080   600×420    → 4000×2812   Courbet — The Valley of Ornans
★  295 → 1080   956×640    → 4000×2701   Hammershøi — Tree Trunks, Arresødal
   583 → 1080  1000×1263   → 3145×4000   de Witte — Interior of a Protestant Church
   737 → 1080  1953×1597   → 4000×3257   Courbet — Landscape with Rocky Cliffs
   738 → 1080  1200×1598   → 2884×3843   Hammershøi — The Art Historian Karl Madsen
★ 1063 → 1080  3400×2303   → 4000×2709   Bierstadt — Mount Starr King, Yosemite
  1016 → 1080  3400×2201   → 4000×2590   Kensett — An October Day in the White Mountains
   876 → 1030  3400×1897   → 4000×2232   Kensett — View near Newport
   738 →  869  3400×1600   → 4000×1882   Gifford — Haverstraw Bay
```

Seven now fill an FHD+ screen that could not before. Three still fall short
because the painting is wide — a 9:19.5 slice of a panorama is a narrow slice
however big the file.

The sheet went from **154 to 161 of 576** filling 1080. A small number, and it
should be said plainly: this fixed twelve works, not the four hundred.

## Two mistakes worth recording

**A 320 MB TIF took a work down with it.** `recover.mjs` chose Cleveland's
`_full.tif`, hit the 300 MB cap at download time, and gave up — while the 5 MB
`_print.jpg` sat right behind it and is plenty for a 4000 px target. The size
check now happens when the route is *chosen*, not when it is *used*, so an
oversized master falls through to the next rendition instead of failing the work.

**A cleanup deleted a working file.** Staging two plates for a visual check, I
copied them into `/tmp/oils-preview` and tidied up with `rm -f *asiatic*.jpg`.
The pool's own thumbnail for the Hammershøi is
`wm-vilhelm-hammersh-i---the-buildings-of-the-asiatic-.jpg` and matched the
glob. The work then failed its grey-balance read and silently left the pool —
628 became 627, and the only visible sign was a count. Restored from
`thumb_url`, which the manifest still had. A wildcard delete in a directory that
is also a data store is not a cleanup.

## What is still open

- **The other 410 short works have not been asked this question.** These 12 were
  found because they happen to be published already. The same three routes could
  be pointed at the whole catalogue, and the Commons route at any painting whose
  Commons page can be found from its title — which is the real generalisation and
  is not written.
- **The gallery's own sources are not stored.** `images/manifest/*.json` records
  the plate and its treatment, never the file it was made from. Every recovery
  here went back over the network for something that once sat on this disk.

## Files

- `/tmp/oils-preview/short-vs-gallery.mjs` → `short-vs-gallery.json` — which
  short works are already published, matched by picture.
- `/tmp/oils-preview/recover.mjs` — the three routes; `--dry` to look first.
