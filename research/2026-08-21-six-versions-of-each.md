# Six versions of each, so the setting can be chosen per painting

21 August 2026.

> edit each pic with all five, and insert them into the selection, so it's like
> original, edited, edited, edited, edited, edited, original 2, edited 2 … so i
> choose which edit works for each pic or several

Until now a setting was chosen once and applied to everything. This sheet asks
the smaller question instead: **for this painting, which of the settings we have
saved is the right one?** 79 works × 6 versions = 474 slides, one per screen.

Sheet: `/tmp/oils-preview/edits.mjs` → `edits.html`, `edits/`.

---

## There are five saved settings, not six

Four were asked for by name in chat, the fifth is what the app ships — but two of
those are the same thing:

| when | what was said | what it is |
|---|---|---|
| 17.08 16:16 | *"check screenshot in Pictures - these settings seem to work"* | desaturate `whole` 55%, dim plain ×0.80 |
| 19.08 09:34 | *"the current version of desat-darken pipe is the one that produced Rocky, Wooded Landscape"* | **a pin, not a setting** |
| 19.08 10:17 | *"no work more colorful than 18, and no work brighter than 65"* | two ceilings, solved per work |
| 20.08 10:54 | *"yeah most got better, lets save it"* | grey-anchor white balance, half strength |

`wallpaper-gen/treatment.mjs` has **one commit** and still carries the sha256 of
the plate that pin names, so the pinned version *is* what the app runs today. The
pin and "what the app does now" are one row. That leaves five: balance alone, the
snapshot, the app, the ceilings, and the ceilings with the shoulder that was
built for them — plus the untouched crop in front, which is what makes the other
five judgeable at all.

## The ceilings are solved, not set

"No work more colourful than 18" is not a slider position. It is a different
multiplier for every work, and a work already under 18 is not touched. Colour is
read after the dim and the dim is read after the colour, so the two are mutually
dependent and the solve runs to a fixed point — three passes, the same as
`sheet.mjs`. Every ceiling is a **minimum**: it can take more out, never put any
back.

Measured on the 9:19.5 crop, not the painting. A work whose bright sky is cropped
away is not a bright work any more, and dimming it by the whole frame's
brightness would dim it for pixels nobody will see.

Cross-check that the numbers are the sheet's and not new ones: Niobe's own tonal
spread comes out at **24**, ceiling **19** after the flat dim — the same 19
`dark.html` carries.

## What each setting actually does to these 79

```
bal     touches 74 of 79 · colour ×1.00 · bright ×1.00
snap    touches 79 of 79 · colour ×0.84 · bright ×0.80
app     touches 79 of 79 · colour ×0.81 · bright ×0.80
ceil    touches 79 of 79 · colour ×0.81 · bright ×0.66
niobe   touches 79 of 79 · colour ×0.83 · bright ×0.78
```

**The snapshot and the app differ on 38 works and are identical on 41.** The gap
between 55% and 65% only exists for polychrome works; a work above hue share 0.9
is untouched by either, so the disagreement between the screenshot and the
shipped code is real but narrower than "every plate is drained harder".

**The brightness ceiling is the aggressive one.** 65 bites on **53 of 79**,
pulling the average dim from ×0.80 to ×0.66. That is a much larger change than
anything the colour ceiling does — it bites on 16.

## The shoulder cannot reach Niobe, and says so

`like Niobe` sets the spread ceiling to Niobe's own 19. **24 of 79 works cannot
get there at all**: the squash bottoms out at 0 and every pixel above luma 60
lands on one level. A van Huysum still life is bright flowers on near-black, its
spread is several times Niobe's, and no shoulder brings that down — it only
flattens the flowers into featureless shapes.

This is the setting reaching its limit, not the render failing. `sheet.mjs`
already counts this case as `stuck`; it just never had to be looked at. The slide
now says so in its own caption rather than looking broken, and 5 works at the
other end come through with the squash untouched at 1.

Worth stating plainly: **the ceilings were written down but never built into the
pipeline** (`TODO.md`), so this is the first time they have been seen applied to
a whole selection.

## Choices the sheet makes

- **The selection, not the whole feed.** 79 works, from the 83 kept — 8 kept refs
  whose duplicate group is represented by another copy are followed to the copy
  that wins, which merges four pairs. `ALL=1` renders the whole 576-work feed
  instead; that is 3456 slides and nobody finishes that.
- **A key of its own.** `pick-edit-v1`, holding `ref#edit` pairs. `pick.html` and
  `phone.html` share `pick-selection-v1` and it holds bare refs; writing pairs
  into it would corrupt the selection. That has already cost this project one
  set of ticks once.
- **The setting's name is always on screen.** Everything else hides behind a tap.
  A version you cannot name is a version you cannot choose.
- **One buffer, six versions.** The crop is cut, framed off and balanced once;
  only the setting differs between the six files. Nothing but the treatment can
  account for a difference the eye sees.

## Limitations

- The settings are solved on a 180 px probe and applied at 1080. Quartiles and
  mean chroma are stable at that size, but a work with a small bright detail may
  solve slightly differently than it would at full size.
- `bal` reports the cast it pulled, not a multiplier, because white balance is
  not part of the solve. Without that it read "unchanged" while plainly changing
  the picture.
- Both `orig` and `bal` exist because the balance is now baked into every other
  version. If the balance is wrong for a work, all five edits inherit it, and
  the only way to see that is to compare slides 1 and 2.
