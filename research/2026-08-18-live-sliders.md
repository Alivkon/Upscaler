# Live sliders on the preview sheet

18 August 2026. The preview sheet no longer ships treated plates. It ships the
untreated crop and applies colour, temperature and brightness in the browser, so
the settings can be moved and the whole pool re-reads instantly. Records why that
is exact rather than approximate, how "equalise" is solved, and three numbers
about the current settings that only became visible once the pool could be
compared against itself.

Sheet: `/tmp/oils-preview/sheet.mjs` → `dark.html`. One bucket, no artist
sections. Crops are 9:19.5, centred.

---

## Why the browser can do this exactly

All three treatments are linear per-pixel transforms, and a linear per-pixel
transform is what a colour matrix is.

`desaturate.mjs` already argues half of it in its own header: pulling a pixel
towards its own luma by one multiplier is exactly CSS `saturate(k)`, agreeing
with the filter-effects matrix to within 1 of 255. The other half is the same
argument twice more — plain dimming is `applied(pixels,[b,b,b])` and the dimming
tilt is `applied(pixels,[r,g,b])`, both diagonal matrices. Compose the three and
one `feColorMatrix` per work carries the entire treatment.

**SVG filters interpolate in linearRGB by default and our libraries work on raw
sRGB bytes**, so every filter sets `color-interpolation-filters="sRGB"`. Without
it each slider reads about a stop off.

### Checked, not assumed

`verify.mjs` renders the node-library result for nine works spread across the
pool, and `verify.html` diffs it against the browser's output pixel by pixel at
the same settings:

```
worst disagreement over all works and channels: 5 of 255   (mean 0.62)
```

Three follow-ups locate all of it:

| probe | result | meaning |
|---|---|---|
| same JPEG decoded by sharp and by Chrome | mean 0.000, worst **0** | not a decoder difference |
| 256-step grey ramp through a pure ×0.8 matrix | 192/256 exact, worst **±1** | the filter path is right; no gamma error |
| node library vs a single matrix, both in node | mean 0.623, worst **4** | this is where it comes from |

The third line reproduces the browser's 0.623 exactly. The disagreement is the
library quantising to 8 bits between `desaturate()` and `applied()`; the browser
applies one matrix and rounds once. **The browser is the more accurate of the
two** — the extra levels are the library's intermediate rounding, not the page's.

## Equalise, and why it needed a fixed point

Each row has an amount and an equalise percentage. At 0% every work gets the
identical transform. At 100% every work is pushed onto the pool median for that
quantity, so a saturated work moves further than a muted one — which is what
"same saturation" has to mean when the works do not start level.

The blend is geometric, `k = k_flat · (target/actual)^e`, with the target defined
as the median of what the *flat* setting produces. That keeps the amount slider
meaning the same thing at any equalise level.

**The first version solved each row independently and it did not work.** At 100%
on all three the pool came out at chroma 7–18 instead of on one value. Brightness
multiplies chroma and R−B along with luma, so saturation solved before brightness
gets partly undone by it. Each row is therefore solved against the *final*
output, which makes the three mutually dependent, so the solve iterates to a
fixed point. It settles in two passes; three are taken. After that, equalise at
100% gives `sat 10–10 · lum 80–80 · R−B 9–9` across the 10th–90th percentile.

Two couplings are genuinely absent and are not iterated for: `saturate()` leaves
luma untouched by construction, and brightness is a scalar, so neither disturbs
the temperature solve.

Temperature is a per-channel multiply `[1+t, 1, 1−t]`, which shifts mean R−B by
`t·(R+B)`, so the amount needed is a division rather than a search. `t` is capped
at ±0.45.

## What the sheet reports live, and why it can

Luma is linear in R, G and B, and so is every transform above. So the mean of the
output is the transform of the mean, and 24 stored cell means are enough to
compute caption legibility at any slider position without re-rendering anything.

The cell geometry is copied from `cells()` in `dimming.mjs`, not re-invented: the
middle of each column, and the band from 74% to 92% of each cell's height, which
is where the caption sits rather than the icon. **An earlier version averaged
whole cells** and so was reading the icon's own brightness — it reported 42 works
under 3:1 where the real figure is 48.

Clipping is reported too, from a stored 99th percentile of the top channel.
A mean says nothing about what equalising does to highlights, and equalising
brightness pushes dark works up.

## Three things the pool says about the current settings

**Desaturating by polychromy makes the pool less uniform, not more.**

```
                          chroma 10th–90th
untreated                      16–46
snapshot 55% by polychromy      9–36
flat 55% on everything          6–17
```

The rule leaves 64 of 107 works untouched (hue share ≥ 0.9) and takes 55% off the
other 43. That is what it is for — it targets works whose colour competes with an
icon — but it means "do we desaturate everything equally" has the answer *no*,
and the spread it leaves is wider than doing nothing selective at all.

**Flat ×0.80 dimming leaves 48 of 107 works with a caption below 3:1.**

```
no dimming at all                      81 of 107 under 3:1
snapshot, plain ×0.80                  48 of 107
catalogue rule, strength solved per work    0 of 107
```

The snapshot setting and the shipped catalogue are two different policies, and
the difference is not small. `strengthFor()` dims each work until its brightest
caption cell reaches 145; a flat 0.80 dims every work the same amount and
therefore under-dims the bright ones. The sheet has both, as a checkbox, so they
can be looked at side by side.

**Equalising brightness upward clips.** At equalise 100% with the amount left at
0.80, 15 of 107 works blow their highlights — the dark works are being multiplied
up by more than two. Dropping the amount to 0.65 costs nothing visually and
takes it to 4, while also taking captions under 3:1 from 48 to 20.

## Limitations

- Chroma is tracked as `C·k·b`. The temperature step also moves chroma a little
  and that part is not carried, so the saturation readout drifts slightly at
  large temperature settings.
- The crop is the centre of the frame. Step 10 will pick a better window; until
  it runs, the centre is the honest default, not a claim about composition.
- Everything is measured on the 288×624 crop, not on the full plate. For `cap`
  this turns out not to matter — 47 works fall below 3:1 on the crop, 44 on the
  whole frame, 47 by the box's own 200 px column, so the caution first written
  here that the numbers "are not interchangeable" was wrong for that measure.
  See `2026-08-18-inert-caption-floor.md`. It has not been checked for the
  others.
- The pool medians move as the pool moves. Equalise targets are relative to
  whatever 107 works are on the sheet, not to an absolute level.
