# The shoulder: one slider replaces warmth and answers "make them like Niobe"

19 August 2026. Two requests from Charlie that turned out to be the same request.

> the warmth one doesn't really do what we want — it turns overly orange scans
> green which is not better
>
> maybe a slider to make all works more like niobe's children? what would that be

The answer to the second is: **lower the tonal spread**, and the control that does
that is a highlight shoulder. So the shoulder took the warmth slider's place on
`/dark` rather than being added beside it.

## Why warmth had to go, in numbers

The warmth slider cooled by taking red out — `[wR, 1, 1]` with `wR <= 1`. That
form was chosen deliberately on 19.08 so that cooling could never raise the blue
channel, because raising anything is forbidden. It obeys that rule perfectly and
is still wrong, because what is left when you take red out of an orange is green.

The three most orange works in the selection, as the slider cools them:

```
cool by     Heade, Marsh Scene      Wilson, Dolbadarn       de Witte, Baroque Church
   0        31°  orange             50°  yellow             54°  yellow
  10        36°  orange             59°  yellow             64°  yellow   ← R below G
  20        43°  orange             69°  yellow   ← R<G     74°  GREEN
  30        54°  yellow             80°  GREEN               83°  GREEN
  60       102°  GREEN             112°  GREEN              113°  GREEN
```

The de Witte is past yellow at a cooling of 20, which is a third of the slider's
travel. **There is no setting that fixes an orange scan**, because the operation
has no way to distinguish an orange scan from an orange painting and no way to
move one without moving it toward green. It was removed rather than retuned.

An orange scan is a real problem and this note does not solve it. It is a white
balance problem — the whole picture is tinted by the copy stand, not by the
painter — and a single channel multiplier is the wrong instrument for it.

## What "more like Niobe" means

From [2026-08-19-what-makes-niobe-good.md](2026-08-19-what-makes-niobe-good.md):
the one measure that separates The Destruction of Niobe's Children from the rest
of the selection, and that keeps separating it after controlling for darkness, is
**tonal spread** — the luma gap between the 25th and 75th percentile of the
picture. Niobe is at 21 on the 200 px plate and 25 on the crop `/dark` shows;
the pool median is 94.

A shoulder is what moves that number. Below a knee nothing changes; above it the
distance to the knee is multiplied by `s`:

```
f(v) = v                       for v <= knee
f(v) = knee + (v − knee)·s     for v >  knee
```

It lowers p75 and leaves p25 alone, which is lowering the spread. So "darken only
the highlights" and "make it more like Niobe" are one control, and the page now
has one control for both.

## The alternative already on the page does not work

Dimming scales every tone by the same factor, so it reaches a low spread only by
taking the shadows down with it. Measured on 91 crops:

```
                                  median spread   median brightness
untreated, flat treatment only           77              91
plain dim ×0.60                          58              69
plain dim ×0.40                          39              46
plain dim ×0.22                          21              25   ← reaches Niobe's spread
shoulder knee 60, squash 20%             19              54   ← and keeps the light
Niobe itself, flat treatment             20              51   ← the target
```

**Dimming can hit Niobe's tonal spread only at half Niobe's brightness.** The
shoulder hits it at Niobe's brightness, because it takes the light out of the part
of the picture that had too much and leaves the rest alone. That is the entire
argument for adding a control rather than moving an existing one.

## A ceiling, not a flat amount

The first version was a flat squash: the same `s` on every work. Measured, it
overshoots — it squashes the works that were already quiet, which is the same
mistake "even out" made in the other direction and which Charlie has already ruled
on once ("it's not the SAME level, it's the MAX level").

So the group follows the grammar the other two already use — a flat amount and
then a **ceiling solved per work**. The solve is closed form, because the spread
splits into a part below the knee that cannot move and a part above it that scales:

```
spread = (below + above·s) · b        →      s = (cap/b − below) / above
```

clamped to never exceed the flat amount, so the ceiling can only ever squash
further, never let a work back out.

Reading the installed filters back off the page afterwards:

```
20 works were already at or under the line — the shoulder leaves 20 of 20 untouched
```

## What the "make them like Niobe" button does

It sets the knee to 60, no flat squash at all, the spread ceiling to 20 — Niobe's
own spread after the flat dim — and Charlie's two ceilings from
[2026-08-19-the-two-ceilings-charlie-chose.md](2026-08-19-the-two-ceilings-charlie-chose.md),
colour 18 and brightness 65.

```
                     10th    50th    90th
tonal spread           19      20      22        Niobe itself: 20
brightness             38      59      65        Niobe itself: 51
colour                  2       —       7        Niobe itself:  6
captions unreadable     0 of 628
highlights blown        0 of 628
```

The whole selection lands on the picture Charlie pointed at. 597 works are brought
down to the line; **72 finish above it and cannot be helped**, because their tones
*below* the knee are already wider than 20 — the worst is at 44. A shoulder cannot
reach those; only a lower knee can, and the knee is a slider.

## What it cost to make the page non-linear

Everything on `/dark` rested on one sentence: every transform is linear, so a
filter matrix carries it and the mean of the output is the transform of the mean.
A shoulder is not linear — that is exactly why it can lower highlights without
touching shadows — so three things had to change.

1. **The filter is three primitives**, not one: colour matrix, then an
   `feComponentTransfer` table, then the dimming matrix. The table is sampled at
   65 equally spaced points, which rounds the kink at the knee off by under one
   level of 255.
2. **Each work carries 16 tone buckets**, each with its share of the picture and
   the average colour inside it. The shoulder goes through bucket by bucket and
   the buckets are re-averaged, which recovers the mean the linear case got free.
   `dark.html` grew from 1.1 MB to 1.6 MB; the five unread box measures that were
   riding along per work were dropped to pay part of that back.
3. **Each work carries its luma quartiles.** A shoulder is monotone, so the
   quartile of the output is the shoulder of the quartile — the reported tonal
   spread is exact rather than modelled.

Colour, brightness and caption contrast are summed over the buckets and the 24
cell averages, and a bucket that straddles the knee gets one answer where the
picture has two. Those three therefore read a shade bright while the shoulder is
in use. The page says so on itself rather than only here.

## How it was checked

`checksheet.mjs` runs `dark.html`'s own script against a stub DOM, then reads the
installed filter chain back off each of the 628 works and puts that work's own
mean colour through it — matrix, table, matrix — the way a browser would.
Re-deriving the maths in the checker would have tested a copy.

```
                                   brightness 10/50/90     raised
no treatment at all                   74  115  154         light 0, colour 0
the 17.08 snapshot                    60   92  123         light 0, colour 0
flat squash, no ceiling               59   75   88         light 0, colour 0
spread ceiling, no flat squash        48   59   74         light 0, colour 0
highlights flattened outright         48   48   48         light 0, colour 0
the "like Niobe" button               48   59   65         light 0, colour 0
```

Nothing is raised at any setting, and the largest deviation anywhere is 0.0000 —
the identity case is exact to the table's own quantisation. The rule Charlie set
on 19.08 still holds with a non-linear step in the chain.

## The panel had to shrink

Adding a third slider to a group broke the page. Charlie, 20.08: *"the header
covers all of the page, i can't see artworks — remove all the prose."* Every
slider carried a line explaining itself and the panel carried three paragraphs
under the buttons; together they were taller than a card, and the panel is
`position: sticky`, so that cost was paid on every screenful rather than only the
first. A page for looking at pictures that shows no pictures is not doing its job.

All of it is gone: eight hint lines, the pool readout, the "nothing can add"
guarantee and the cut line. What survives is four terse numeric readouts, one per
group — `19–22 · 597 down · 72 stuck`. Labels were cut to the shortest thing that
still names the control (`and no work with more tonal spread than` → `spread none
above`). The panel went from about 660 px to about 215 px and a full row of works
now sits on the first screen.

Nothing measured changed: `checksheet.mjs` reports the same numbers before and
after. What the deleted prose said lives here and in the comments in `sheet.mjs`,
where it costs no screen.

## What this does not do

- **The pipeline is untouched.** This is `/dark` only. `treatment.js`, the
  catalogue and the shipped plates know nothing about a shoulder.
- **It does not fix orange scans.** Removing the warmth slider removed a control
  that made them worse; it did not add one that makes them better.
- **The knee is a global tone, not a per-work one.** The 72 works it cannot reach
  are the evidence that a per-work knee might be the next thing worth measuring.

## Files

- `/tmp/oils-preview/highlights.mjs` — the shoulder-vs-dimming measurement.
- `/tmp/oils-preview/sheet.mjs` — the page.
- `/tmp/oils-preview/checksheet.mjs` — runs the page's script and reads the
  filters back.
