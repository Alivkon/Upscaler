# Auto white balance on a painting: possible, up to a point you can name

20 August 2026.

> is it possible to have 'auto' white and hue balance on a painting that is not a
> picture somehow? some clearly need it but idk if that's possible at all

**Short version: yes, and the version that works is to look only at the pixels the
painter meant to be grey.** It finds all three of the orange scans the warmth
slider could not fix, it leaves genuinely grey pictures alone at exactly zero, and
at half strength it turns one work of 599 green where the warmth slider turned a
church green at a third of its travel. What it cannot do — and no measurement of
the file can — is tell a yellowed varnish from golden light the painter put there.

## Why the old slider could not work and this can

The warmth slider was `[wR, 1, 1]` applied to every pixel, and
[2026-08-19-the-shoulder-replaces-warmth.md](2026-08-19-the-shoulder-replaces-warmth.md)
retired it because taking red out of an orange leaves green. The real defect was
not the matrix: it was that the slider looked at the **whole picture**, where a
sunset and a sepia scan are the same thing.

A cast and a colour differ in where they land. A scan cast lands on every pixel
including the ones that are supposed to be colourless. A painted orange lands on
the oranges and leaves the greys grey. So:

1. Take the least colourful fifth of the picture, ignoring anything below luma 30
   or above 225 — near-black and near-blown pixels lie about hue.
2. Ask what colour those pixels average to. If they are neutral, there is no cast.
3. If they are not, scale the channels so they become neutral.
4. **Normalise the gains so the largest is exactly 1**, so the correction only
   ever takes light out. The rule that nothing may be raised survives untouched,
   and the whole thing is one diagonal `feColorMatrix`.

A sunset keeps its sunset because the sky is not in the sample.

## It finds the right pictures

Across the 599 survivors with a plate:

```
                    chroma of the greys    agreement
 10th percentile             2               0.38
 25th                        3               0.58
 50th                        6               0.76
 75th                       10               0.91
 90th                       16               0.97
```

"Agreement" is how much the near-neutral pixels agree about *which way* they are
off — the mean resultant length of their hue angles, weighted by chroma. 1 means
every grey is off in the same direction, 0 means they cancel. It is the evidence
that there is a cast at all, separately from how big it is.

The top of the list is exactly the works the warmth note named as broken scans:

```
Emanuel de Witte — Interior of a Baroque Church  greys 115,119, 87  off 32 at 67°  agree 0.99  gain 0.75/0.73/1.00
Richard Wilson  — A Summer Evening, Dolbadarn    greys 179,177,147  off 32 at 56°  agree 0.96  gain 0.82/0.83/1.00
View of Niagara Falls                            greys 164,159,133  off 31 at 50°  agree 0.99  gain 0.81/0.84/1.00
MJ Heade — Hunters Resting, 1863                 greys 170,161,141  off 29 at 42°  agree 1.00  gain 0.83/0.87/1.00
Claude Lorrain 031                               greys 186,187,160  off 27 at 62°  agree 0.94  gain 0.86/0.85/1.00
Richard Wilson — Snowdon from Llyn Nantlle       greys  94, 96, 69  off 27 at 63°  agree 0.98  gain 0.73/0.72/1.00
MJ Heade — Marsh Scene, Two Cattle in a Field    greys  93, 77, 67  off 26 at 24°  agree 0.97  gain 0.72/0.86/1.00
```

All three works named on 19.08 are in the top seven of 599.

And the bottom of the list does nothing at all, which is the half that matters
more:

```
Hammershøi — The Painter Kristian Zahrtmann      greys  63, 63, 63  off  0  agree 0.08  gain 1.00/1.00/1.00
Hammershøi — The art historian Karl Madsen       greys  40, 40, 40  off  0  agree 0.00  gain 1.00/1.00/1.00
John Martin — Anges déchus, Pandemonium          greys  92, 92, 92  off  0  agree 0.05  gain 1.00/1.00/1.00
Claude Lorrain — Landscape with Nymph and Satyr  greys 167,168,168  off  0  agree 0.06  gain 1.00/1.00/1.00
Jan van Huysum 001                               greys  43, 45, 43  off  1  agree 0.61  gain 1.00/0.97/1.00
```

A correction that has to be switched off by hand is not automatic. This one
switches itself off.

## It is not `warm` under a new name

Correlation of the cast with the box's `warm`: **0.50**. Half the information is
shared, which is expected — a warm scan is warm — and half is not, which is the
half that separates a warm scan from a warm painting. If this had come out near
1 there would be nothing here.

## Where it goes wrong, and it is not fixable

At **full strength** the correction is too strong and it takes the gold out of
paintings that are meant to be gold. Claude Lorrain 031 goes from a golden
Italian afternoon to a cold blue-grey one; Snowdon goes blue; Heade's *Marsh
Scene* loses its pink sunset.

The reason is not a bug and cannot be tuned away. **In a painting lit by golden
light, the greys really are golden.** A stone wall under a Claude Lorrain sunset
reflects that sunset. The measure is doing exactly what it was designed to do and
the answer is still wrong, because "the greys of this picture are warm" is true of
a yellowed scan and of a sunset alike, and nothing in the file distinguishes them.
Claude Lorrain 031's greys agree at 0.94 — the same confidence as the broken de
Witte.

So the agreement number tells you a cast is *consistent*. It does not tell you
the cast is *foreign*. Nothing does.

## How far it is safe to go, measured

Counting works whose overall mean colour crosses into green (hue 75–170°), the
failure the warmth slider was retired for:

```
full strength   12 of 599 cross into green
half strength    1 of 599
```

and the hue shift at full strength, 10/50/90: **2° / 9° / 40°**.

Against the old slider, where de Witte's *Baroque Church* went 54° → 74° — past
yellow into green — at a cooling of 20 out of 60, this is a different class of
operation. **Half strength is the setting where it stops lying**, and that is a
taste number, not a derived one. It is a slider for the same reason the knee is.

## Kept, at half strength — and it is not a slider

Charlie, 20.08, after looking at `wb.html`: *"yeah most got better, lets save
it."* So it was built, and two decisions came with it.

**It lives in the repo, not in `/tmp`.** The measure is
`scripts/research/grey-balance.mjs`, next to `dimming.mjs` and `busyness.mjs`.
Both `/tmp` scripts now import it instead of carrying their own copy, and their
numbers are unchanged after the move. Everything else in this investigation was
in a directory that gets wiped.

**It is baked into the crop, not added to the panel.** This is the difference
between it and the three sliders. The shoulder, the dimming and the
desaturation are *treatments* — decisions about how a good picture should look on
a phone. The grey balance undoes a **fault in the copy**: a scan whose greys are
not grey. That belongs to the source. So `/dark` corrects each crop as it writes
it, and every number the page then measures and every picture it shows is of the
corrected work. The three sliders sit on top of it and did not change.

That also settles a technical question that a slider could not have survived. The
page's tonal spread is exact because a shoulder is monotone in luma, so the
quartile of the output is the shoulder of the quartile. A white balance is *not*
monotone in luma — it scales three channels differently, so how much a pixel
moves depends on its colour, not just its brightness. Stored quartiles cannot be
corrected live. Baking it in means the quartiles are measured from the corrected
pixels and stay exact.

**Half strength**, for the reason measured above. Full strength takes the gold
out of Claude Lorrain.

```
grey balance at 50%: 567 of 628 works corrected, 61 left exactly alone
                     light it removes, 10/50/90:  1% / 2% / 7%
```

Most corrections are tiny — the median work loses 2% of its light — which is what
a measure that switches itself off should look like. The cast is read off the
**whole work** at 200 px, not off the 9:19.5 crop: a crop that happens to be all
sky has no greys to ask.

Where it did something, the card says so — `greys were off 32` — as a receipt
rather than a live number, since the correction is already in the picture.

`checksheet.mjs` gained the matching check. The invariant cannot be read off the
filter chain any more, because the correction is not in it, so it is checked on
the gains:

```
grey balance: 567 of 628 crops corrected, 0 of them raise a channel
              (largest gain anywhere 1.0000, must be 1)
```

and the six settings still report `raised: light 0, colour 0` with a largest rise
of 0.0000, exactly as before.

## What this does not do

- **The pipeline is still untouched.** This is `/dark` and the shared module.
  `treatment.js`, the catalogue and the shipped plates know nothing about it, the
  same as the shoulder.
- **Two guards were not built.** An agreement floor is unnecessary today — works
  whose greys disagree already come out at gain `1.00` — and a floor on the gain
  is unnecessary at half strength, where the worst case removes 15% of the light
  rather than the 49% full strength would. Both become worth having if the
  strength ever goes up.
- **It is not a restoration.** Yellowed varnish is in the object, not the scan,
  and removing it is a decision about the painting rather than a correction of a
  copy. This note takes no position on that; it only points out that the measure
  cannot tell the two apart.
- **No hand labels.** Nobody has said which of the 599 have a cast, so there is no
  precision here, only the three works named on 19.08 landing where they should,
  and Charlie's eye on the sheet.

## Files

- `scripts/research/grey-balance.mjs` — the measure, in the repo.
- `/tmp/oils-preview/whitebalance.mjs` — the numbers above.
- `/tmp/oils-preview/wbsheet.mjs` → `wb.html` — all 599, before and after, biggest
  cast first, with a strength slider and two filters. This is the evidence and it
  is worth rebuilding if the strength is ever revisited.
- `/tmp/oils-preview/sheet.mjs` → `dark.html` — where it is applied.
- `/tmp/oils-preview/checksheet.mjs` — the invariant, including the gains.
