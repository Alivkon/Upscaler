# The intake checkbox was offering the treatment of the rejects

22 August 2026.

> i realize the checkbox on upload to edit the pic to match gallery pics is not
> true anymore, that filter is used by few images

It is not true any more, and the count says by how much. The checkbox applied
`dim80-desat-whole` and its caption said *"the treatment most of the collection
carries"*. Counting the manifests against the catalogue, with `hidden: true`
filtered out the way `server.js` filters it:

```
of the 76 works on the showcase        of the 254 works taken down
  none                25   33%           dim80-desat-whole  191
  ceil                19   25%           no plate / unbuilt  63
  bal                 14   18%
  snap                10   13%
  dim80-desat-whole    7    9%
  niobe                1
```

So the treatment behind the checkbox was on 7 of the 76 works a visitor can
see, and on 191 of the 254 that came down on 22.08. It looked like the house
style only because it is what the pipeline applied to everything nobody had
judged yet. **The checkbox was offering the treatment of the rejects.**

## Which one replaces it

`ceil` — balance, desaturate 55% by gaudiness, dim ×0.80, then hold mean chroma
under 18 and mean brightness under 65. It is the most-ticked of the six: on the
`/edits` sheet of 21.08, where every one of 79 paintings was shown in six
versions, the tally across all ticked versions was

```
ceil 22 · snap 17 · bal 6 · app 6 · orig 4 · niobe 3
```

and it is the most-used real treatment on the showcase today (19 works; the 25
that beat it asked for nothing at all).

The important property for the intake is that **`ceil` is a rule, not a hand-set
number**. Its 18 and 65 are ceilings solved per picture, from the picture, in
three passes. Nothing about it needs a curator's decision on the particular
work, so it can be run on a stranger's upload. `bal`, `snap` and `niobe` share
that property; `none` is the majority answer on the showcase but cannot be a
checkbox, because the checkbox already means "leave it alone" when unticked.

## What changed

`scripts/research/ceilings.mjs` — new. The rule end to end: probe reduction,
the three-pass solve, the paint, and `treatCeil()`, which is the *order* of the
steps. The order lives there rather than in the two callers on purpose — two
copies of a sequence drift as surely as two copies of a constant, and the two
callers are the server and the visitor's browser, which must not hand out two
different pictures for one checkbox.

`treatment.js`, `public/treat-local.js` — both now call `treatCeil` and nothing
else. `server.js` opens `ceilings.mjs` and `grey-balance.mjs` on `/rules/`, by
name, next to the two that were already there.

`pages.js` — the caption. "Darken and desaturate / The treatment most of the
collection carries" became "Dim it / White balance, then colour and brightness
capped". The claim is gone because there is nothing to claim: the showcase
carries six answers and the most common one is *nothing*. "Dim" is the word the
work page already uses for `ceil` in "Other versions" (`TREATMENT_NAMES`), so a
visitor who saw "Dimmed" under a painting meets the same word in the checkbox.

## The one place the intake departs from the generator, and its price

The generator solves the ceilings on the phone crop and paints the whole plate,
because the plate is the master the crops are cut from. The intake hands over
exactly one file, so it solves on that file: ticked the crop box, solve on the
crop; didn't, solve on the whole picture. Dimming for pixels nobody will see
would be dimming for nobody.

The second difference is a cost, not a choice. The probe is reduced by
averaging over cells (`reduce()`), not by sharp's lanczos3, because the browser
has no sharp and two reductions would mean two pictures on one checkbox. What
that costs, measured against the generator's own path on **all 19 works that
carry `ceil`** (`node .ceilcheck.mjs vl-0030 …`, raw pixels, before encoding):

```
max difference   2 of 255   (vl-0030; every other work ≤ 1)
mean difference  ≤ 0.383    (worst work, vl-0067)
solved colour    |Δk| ≤ 0.044 (vl-0030), otherwise ≤ 0.011
solved light     |Δb| ≤ 0.004
```

For scale, the JPEG the visitor actually downloads moves the same pixels about
twenty times further — max 37 of 255, mean 3.5 on five of those works. The
reduction is not what a visitor sees.

## Both halves of the intake agree

The server and the browser were fed the same 200×300 fixture, cropped to
9:19.5, and asked for the same treatment:

```
                gains                     solve                      centre px
server   0.9005, 0.952, 1   share 1 · k 0.428 · b 0.59   81, 48, 42
browser  0.9005, 0.952, 1   share 1 · k 0.428 · b 0.59   81, 48, 42
```

The solved numbers are identical, so the module loads and computes the same in
both places. What is left is the canvas: a `putImageData` → `getImageData`
round-trip in Chrome came back off by one on 178 bytes of 372,600 (0.05%, never
more than 1), and that noise carries into the output sum (41 of 8,124,880). It
is a browser fact, it predates this change, and it is far below the encoding.

## Known limits

- The intake offers one of six treatments. `bal`, `snap` and `niobe` are rules
  too and could be offered; whether a stranger wants a menu is a separate
  question and was not decided here.
- `dim80-desat-whole` is no longer reachable from the intake. Nothing on the
  site produces it any more; the 198 plates that carry it were built by the
  generator and are untouched.
- Checked with the raw pixels of works the collection already owns. Nobody has
  looked at `ceil` on a photograph or a screenshot — the sheet that chose it
  was 79 museum paintings.
