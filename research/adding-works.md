# Adding museum works

Full path from a list of ColBase URLs to seeing works on localhost:3000.

---

## Step 1 — Decide treatments from the edits page

Run `scripts/research/colbase-edits.mjs` with the ColBase URLs hardcoded in its `URLS` array:

```
cd scripts/research && node colbase-edits.mjs
```

Serves the result at `:7723`. Open on phone, tick the treatments you want per work.
The tick labels (`orig`, `bal`, `snap`, `app`, `ceil`, `niobe`) are the edits-sheet names — see the mapping table below before writing the entries.

---

## Step 2 — Write two files per work

### museum-works.json (`wallpaper-gen/museum-works.json`)

```json
{
  "ref": "vl-0359",
  "name": "carp-aizawa-bunseki-iphone-wallpaper",
  "treatment": "none",
  "master": "https://colbase.nich.go.jp/media/tnm/A-311/image/A-311_E0045454.jpg"
}
```

- `name` — plate filename slug, no path, no extension
- `master` — direct image URL (from `image_files[0].url` in the individual API response — see ColBase section below)
- `treatment` — string if one version, array if multiple (most-processed first)

### catalogue entry (`catalogue/vl-NNNN.json`)

```json
{
  "ref": "vl-0359",
  "slug": "carp-aizawa-bunseki-iphone-wallpaper",
  "title": "Carp — Aizawa Bunseki — Meiji period, 19th century phone wallpaper",
  "alt": "Japan painting phone wallpaper: Carp by Aizawa Bunseki, Meiji period, 19th century",
  "tags": ["painting", "museum", "japanese"],
  "origin": "Japan",
  "license": "cc-by",
  "provenance": {
    "creator": "Aizawa Bunseki",
    "date": "Meiji period, 19th century",
    "work": "Carp",
    "credit": "Tokyo National Museum",
    "page": "https://colbase.nich.go.jp/collection_items/tnm/A-311?locale=en"
  },
  "added": "2026-08-23"
}
```

No `hidden` field = live. `hidden: true` = refusal (he looked and said no). Never set it on new works you're adding.

### Next ref

```
ls catalogue/ | grep -v order | sort -t- -k2 -n | tail -1
```

Increment from there.

---

## Step 3 — Generate the plates

```
cd /home/charlie/repos/wallpaper-gen
node museum.mjs --only vl-0359,vl-0360,vl-0361
```

Run one at a time or in small batches — ColBase rate-limits image downloads and returns transient 404s under load. A 4-second gap between refs is safe. If a ref fails mid-run, re-run the same `--only` command; sources already downloaded are cached in `sources/` and skipped.

The generator writes plates to `../Upscaler/images/plates/` and merges the new entries into `../Upscaler/images/manifest/museum.json`. If the process crashes before finishing, the manifest is not updated — only successfully completed refs land in it. Run `--only` again for the missing ones.

---

## Step 4 — Add to order.json

```
catalogue/order.json
```

This file controls what the gallery serves. Works not listed here are invisible regardless of whether plates and catalogue entries exist.

Prepend new refs at the top (newest-first):

```json
[
  "vl-0372",
  "vl-0371",
  "vl-0359",
  "vl-0324",
  ...
```

No server restart needed — `galleryItems()` reads on every request.

---

## Treatment IDs

The edits sheet uses different names than museum-works:

| edits sheet | museum-works        |
|-------------|---------------------|
| `orig`      | `none`              |
| `bal`       | `bal`               |
| `snap`      | `snap`              |
| `app`       | `dim80-desat-whole` |
| `ceil`      | `ceil`              |
| `niobe`     | `niobe`             |

A tick ending in `-vig` means the same treatment with the vignette — corners
darkened by 12 % on an inscribed ellipse. Every rule has that twin, so
`snap-vig` on the sheet is `snap-vig` in `museum-works.json`, and `app-vig` is
`dim80-desat-whole-vig`. The generator lays it on each frame separately, using
that frame's own dimensions, so the phone crop is vignetted about its own
centre and not about the plate's.

## Multiple ticks = treatment array, not multiple refs

When a work is ticked on multiple treatments, put them all in a single entry as a treatment array — **not** separate refs. One ref per artwork. The generator produces multiple plates from the array; variants appear as "Other versions" on the same page.

```json
"treatment": ["snap", "bal", "none"]
```

First element is the primary (main page image). Order: most-processed first.

Creating separate refs for the same artwork gives it competing search pages — vl-0258 and vl-0260 are already a known problem from this.

---

## ColBase specifics

- License: `cc-by` (Japanese Government Standard Terms v2.0)
- Credit: `"Tokyo National Museum"` (tnm) or `"Kyoto National Museum"` (kyohaku)
- Full image URL: from `image_files[0].url` in the individual API response:
  ```
  curl -H 'x-api-key: aaa' 'https://colbase.nich.go.jp/colbaseapi/v2/collection_items/tnm/A-311?locale=en'
  ```
- Keys with Japanese characters (kyohaku): use literal characters in code, `encodeURIComponent` before putting in a URL — e.g. `A甲751` → `A%E7%94%B2751`
- No auth needed on image URLs; only the metadata API needs `x-api-key: aaa`
- Origin: TNM works → `"Japan"`, Kyohaku works → `"China"`
