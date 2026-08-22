# Asking Cleveland what looks like the favourites, and the 500 that stops it

22 August 2026.

> lets try this for the works already in our gallery — actually those that i
> added to favorites … Appendix E: Image Similarity Search

**Short version: the route is dead on Cleveland's side.** `POST /api/artworks`
answers `500 Internal Server Error` to every well-formed request, including the
museum's own published image of a work in its own collection. The run is built
and resolves all 34 favourites to a whole-work file; it needs one line of
Cleveland's server log, not one line of ours.

## The measurement

Every input that could be blamed on us, plus one that cannot:

```
input                                          field    result
1979.57_web.jpg — the museum's own file        file     500 Internal Server Error
harvest thumbnail, 294×400                     file     500
our plate, 960 px                              file     500
our plate, 240 px                              file     500
8×8 PNG                                        file     500
same, with ?limit=10 / trailing slash          file     500
same, with Origin + Referer of clevelandart.org file    500
no file at all                                 —        422 {"loc":["body","file"],"msg":"field required"}
GET /api/artworks?q=bocklin                    —        200, 1 result
```

The 422 is the important row. FastAPI validated the body and named `file` as the
missing field, so **the route exists, the field name is right, and the failure is
behind the validator**. The GET row says the service itself is up. Three probes
a minute apart gave the same 500, so it is not a blip we caught.

`https://openaccess-api.clevelandart.org/openapi.json` lists exactly one POST —
`post_artworks_with_file_api_artworks_post` — so there is no second route to try.
Worth recording from that spec for whenever it recovers: the POST takes **every
filter the GET takes** as a query parameter, `type`, `cc0`, `culture`, `artists`,
`medium` among them. So the ask can be narrowed to `?type=Painting&cc0=1` and the
prints — 10 670 of the 14 614 records in our own browse — never enter the answer.
That is what `cle-similar.mjs` sends.

## Why this is worth waiting for

[2026-08-20-finding-more-like-the-favourites.md](2026-08-20-finding-more-like-the-favourites.md)
closed on exactly this gap:

> **CLIP was not tried.** … would answer "what is in the picture" rather than
> "how is it lit", which is the half missing above.

Our distance measure ranks a hidden favourite at the 15th percentile, and the 25
works nearest a favourite were mostly portraits — Gainsborough, Romney, three
Hammershøi — because tonal spread and brightness cannot see a subject. The
museum's search is that missing half, already trained and already indexed over
the collection, with nothing to download. It is the cheapest way to answer the
half our numbers cannot.

## What is built and waiting

`scripts/research/cle-similar.mjs`.

**The favourites are the same 33 the box was drawn round**, plus Niobe, read live
from the three places they are written down — 29 in `handpicked-overrules.json`,
8 + 2 in `references.json`, `vl-0324` by name. The orchid is **in**: it was left
out on 20.08 because Charlie forbade widening a box on its behalf, and no
threshold moves here. Delaroche's *Offering to the God Pan* is still out, for the
same reason as in August: no catalogue ref, no file, reachable through none of
the three routes.

Every one of the 34 resolves to a picture of the **whole work**, never a phone
crop:

```
harvest  14   ~/tessarum-harvest/browse-all — the Cleveland works, whole
pool     18   /tmp/oils-preview/manifest.json — the wikimedia pool
alias     2   vl-0324 (Niobe) and vl-0178 (SMK KMS441), named by hand
```

The two aliases are written down as two names rather than a rule: the catalogue
files them under Wikimedia and SMK, so no Cleveland lookup finds them, and the
pool keys them by source filename. `--files` prints this table without making a
single call, which is how the list above was checked.

Asking by the shipped plate would be asking about a different picture — the
plates in `images/plates` are already cropped to 9:19.5 — so the crop is only
ever a last resort, and today nothing falls to it.

**Scoring is by agreement, not by rank.** A candidate is weighted by how many
*different* favourites reached it (`votes`), ties broken by `Σ 1/(1+rank)`. One
favourite pulling one neighbour is noise; three unrelated favourites landing on
the same canvas is the signal. Each candidate is labelled `в каталоге` /
`уже показан` / `новое` against `catalogue/` and the 1451 refs in
`research/harvest-state.json`, and the printed list shows only the new ones.

## What it will not do, even working

**Cleveland only.** The pool it searches is one museum, so for the 18 wikimedia
favourites the answer is not "find this file" but "what in our collection looks
like this". That is the intended question. It also means the yield is bounded by
what is left: **889 western oils in the browse that Charlie has never been shown**
([2026-08-22-what-has-been-looked-at.md](2026-08-22-what-has-been-looked-at.md)).
The search cannot enlarge that pile, only sort it.

**No precision.** As with the box and the distance, there are still no negative
labels anywhere. A ranking that puts liked works high may put plenty of unwanted
works high too, and the only honest test remains leave-one-out.

**Nothing is gated.** No threshold, no funnel, no catalogue file is touched. The
output is `research/cle-similar.json` and a printed list.

## To retry

```
node scripts/research/cle-similar.mjs --probe   # жив ли маршрут
node scripts/research/cle-similar.mjs           # 34 вопроса, ~15 с
```

`--probe` posts the museum's own image of *Ruin by the Sea* and checks whether
the answer's first row is `1979.57` — the search recognising itself. If it does
not recognise a work in its own collection from its own file, the ranking below
it is not worth reading either.

## Files

- `scripts/research/cle-similar.mjs` — the run, `--probe` and `--files`.
- `research/cle-similar.json` — not written yet; the route has never answered.
