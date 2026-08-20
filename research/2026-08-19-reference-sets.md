# Charlie's reference works: the first twelve, then the eight that replaced them

19 August 2026. Recovered from transcripts and from `~/upscaler-review/`, which
is outside the repo. Written down because these are the calibration set for every
numeric gate in the pipeline and they have existed only in a scratch directory
and in chat.

There are **two** sets and they are not the same. The second is the one to use.

---

## The set in force: eight, paintings only

Pasted by Charlie on 17 August at 14:00 with the instruction *"find a combination
that fits … as narrowly as possible"*. Six were in the reference strip of
`sliders.html`; two he added from the Matches list.

| ref | work | maker | luma | warm | p95 | off | cap |
|---|---|---|---|---|---|---|---|
| vl-0088 | Interior of a Church | Emanuel de Witte, c. 1680 | 73 | 0.284 | 38 | 45 | 4.69 |
| vl-0178 | Vase of Flowers | Jan van Huysum, 1700–1749 | 52 | 0.011 | 37 | 96 | 3.06 |
| vl-0036 | Interior of the Pantheon, Rome | Giovanni Paolo Panini, 1747 | 78 | 0.419 | 59 | 89 | 4.72 |
| vl-0053 | In the Woods | George Inness, 1866 | 43 | 0.717 | 48 | 63 | 10.68 |
| vl-0038 | Landscape with a Church by a Torrent | Jacob van Ruisdael, c. 1670 | 63 | 0.221 | 50 | 51 | 2.54 |
| vl-0065 | Rest on the Flight into Egypt | Claude Lorrain, early 1640s | 60 | 0.166 | 45 | 46 | 2.46 |
| — | Offering to the God Pan | Paul Delaroche, 1855 | 60 | 0.186 | 54 | 54 | 5.98 |
| vl-0226 | Ruin by the Sea | Arnold Böcklin, 1881 | 49 | 0.465 | 57 | 45 | 4.56 |

Their envelope:

```
warm [0.011, 0.717]   luma [43, 78]   off [45, 96]   p95 [37, 59]   cap [2.46, 10.68]
```

Two more he named on 17 August while rescuing them from the frame gate, calling
them "one of the best ones": **vl-0060 Ruins of an Ancient City** and vl-0036,
already above. On 18 August he asked after "ruins, pantheon" and four were
checked — vl-0036, vl-0226, vl-0060 and **vl-0064 The Waterfalls at Tivoli** —
but those four came from a `grep` for "ruin|pantheon", not from a stored list, so
treat them as a reminder that vl-0060 and vl-0064 belong in the set rather than
as a set of their own.

## The superseded set: twelve, half of them photographs

`~/upscaler-review/refs.json`, 14:11 on 17 August. The eight above plus
**vl-0031 Tree Ferns** (Haeckel, cap 1.12), **vl-0169 Earth's Aquarium** (USGS,
cap 3.41), **vl-0167 Vatnajokull Glacier Ice Cap** (USGS, cap 1.08),
**vl-0139 Aizen Myōō** (Japan, 1300s, warm 0.829), **vl-0204 Stone path through
a tunnel of green foliage** and **vl-0203 Snow falling over rooftops** (both
Charlie's own photographs, the second at luma 183, cap 1.12), minus Delaroche and
Böcklin.

The difference matters because the three works that sit at the floor of the
caption measure — Tree Ferns 1.12, Snow 1.12, Vatnajokull 1.08 — are all in the
twelve and none is in the eight. Any argument of the form "a caption floor cuts
his own favourites" that rests on those three is arguing from the superseded set.

## Which box ran on the gallery: the loose one, and after the fact

**The tighter box never selected anything that shipped.** `.big.mjs` was written
on 17 August for one background harvest over Cleveland plus the Art Institute,
writing to `~/upscaler-review/final-pool.json`. That file does not exist; the run
never landed.

The vl-0227–0243 batch went in on 18 August with **no box at all** — the intake
script had only `tint()` and `colour()` ported to Python, so step 5 was skipped.
Busyness was retro-fitted after Charlie asked, the rest of the box after he asked
again, and four works were pulled back out: van Beyeren's Silver Wine Jug
(`cap 11.38`), a Korean scroll (`warm 0.591`, `off 0`), Gifford's A Home in the
Wilderness (`warm 0.729`) and Johnson's Study, North Conway (`warm 0.540`).

Those values name the box. `warm 0.540` fails a ceiling of 0.47 and `cap 11.38`
fails a ceiling of 11 — both **snapshot** numbers; the tighter box has no cap
ceiling and a warm ceiling of 0.32. So: the snapshot box, applied retroactively,
after intake.

## Why the two boxes disagree

`.big.mjs` was fitted to **two** of the eight. Its own comment says so, and every
row of its threshold table in `2026-08-17-HANDOVER-dimming-and-selection.md`
cites Interior of a Church or Vase of Flowers and nothing else.

The snapshot box is not a fit at all. Charlie, 17 August 17:58: *"i thought i
widened it almost completely except i think warm or sepia? the rest is only a box
because that's the range you gave me!"* — and it shows. Its one binding bound is
`warm ≤ 0.47`, which sits just above Ruin by the Sea at 0.465.

```
                    keeps    loses
tighter (.big.mjs)  3 / 8    Pantheon, In the Woods, Ruin by the Sea (warm)
                             Ruisdael, Claude Lorrain (cap)
snapshot            7 / 8    In the Woods (warm)
```

## The useful answer: take the luma ceiling, not the cap floor

`2026-08-18-inert-caption-floor.md` recommended `CAP_MIN = 3.05` for the works
Charlie flagged as too bright. Against the eight that is the wrong lever:

```
cap >= 2.0    cuts   5 of 107   loses none of the eight
cap >= 2.46   cuts  21 of 107   loses none of the eight     <- the binding value
cap >= 2.8    cuts  34 of 107   loses Ruisdael, Claude Lorrain
cap >= 3.05   cuts  47 of 107   loses Ruisdael, Claude Lorrain
```

The safe floor is 2.46, set by Rest on the Flight into Egypt — and at 2.46 it
still misses most of what he pointed at. Only 3 of the 9 flagged works fall.

**Luma separates them cleanly and cap does not.** The eight top out at luma 78.
Every work Charlie has flagged is above it:

```
Kensett, Lake George      luma  82 · 93 · 120 · 124 · 152 · 174 · 177 · 178
Heade, Two Hummingbirds   luma 180
```

`.big.mjs`'s `LUMA_MAX = 85` is that envelope rounded outward. It cuts 46 of 107,
loses none of the eight, and takes eight of the nine flagged works — the ninth is
a Kensett at luma 82, which needs the envelope's own 78 to fall.

So the tighter box has one bound that is right for this complaint and one that is
wrong, and they should be taken separately rather than as a package.

The full envelope of the eight is far too tight to use as a gate — 7 of 107
survive it. It is a taste sample of eight works, not a specification.

## Limitations

- `refs.json` marks 12 `R` against 737 `C`, and `C` means *candidate*, not
  *rejected*. There are **no negative labels anywhere in this pipeline**, so no
  gate has a measured precision. Recall against the eight is all that can be
  computed.
- The eight are measured on 200 px thumbnails of whole works, the same surface as
  the box. The 107 oils numbers quoted here are the box's own column, so the two
  are comparable.
