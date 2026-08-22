# The treatment stopped being unconditional

21 August 2026.

> but it's not the edited versions i liked that are in the gallery!
> …
> yeah lets not apply filter by default, lets edit pics manually

Until today `wallpaper-gen/museum.mjs` said, in capitals, that the dark
treatment was unconditional: every plate desaturated by how gaudy it was and
dimmed a flat ×0.80, no work exempt. The argument was that a dark gallery cannot
hold an untreated work without it sitting there as a bright hole.

It was a good argument and it lost to evidence. Six versions of each of 79
paintings were put in front of Charlie on `/edits`, and of the twenty-one works
he ruled on that are actually published, **the unconditional rule was chosen by
none**: thirteen wanted the ceilings, six the 17.08 snapshot, two the white
balance alone. A default nobody picks is not a default.

So: **the default is now `none`, and the treatment is a field on the work.**

---

## What changed

`wallpaper-gen/museum-works.json` — every work carries `treatment`. Twenty-one
of them name what Charlie chose; the other 246 name `dim80-desat-whole`, which
is what they were already published with. Nothing is applied because the
pipeline feels like it; every plate states its own answer.

`wallpaper-gen/treatment.mjs` — four rules beside the old one:

```
none    nothing
bal     grey-anchor white balance, half strength
snap    balance · desaturate whole 55% · dim ×0.80
ceil    balance · desaturate whole 55% · dim ×0.80 · colour ≤18 · brightness ≤65
```

`wallpaper-gen/museum.mjs` — `--only vl-0230,vl-0240` rebuilds named works and
**merges** them into the manifest instead of replacing it. Without that, a
per-work treatment would mean rebuilding 267 works to change three, an hour of
decoding to rewrite 264 files identically.

## The part that mattered: what was approved was not measured the way the pipeline measures

This was the real risk, and it is the reason a naive "just add a treatment
field" would have shipped the wrong pictures under the right names.

On `/edits` every version was solved **on the 9:19.5 phone crop**, at a 180 px
probe, **over a grey-anchor white balance**. The pipeline solved on the whole
plate and had never heard of the balance. Both differences move the answer:

- A ceiling read from the plate is read from pixels the phone frame throws away.
  A painting whose bright sky is cropped out is not a bright painting any more,
  and dimming it for that sky dims it for nobody.
- The balance is baked into all five treated versions on the sheet. Solve
  without it and the numbers drift; ship without it and the picture drifts,
  ceilings or no ceilings.

So the new path does what the sheet did: read the cast on the whole work at
200 px, balance, cut the phone window with the work's own `crop` rule, reduce to
180 px, solve the two ceilings to a fixed point in three passes, then paint the
**whole** plate — the crops come out of it, and a crop treated separately would
not match the painting shown under it on the page.

## Checks

**The old path is untouched, and provably so.** vl-0025 rebuilt through
`dim80-desat-whole` came out byte-identical:

```
ba9c0b7269e48d81a1fbf017eacebe6f48aa26f6c044dc7975e0de1422a019ec  before
ba9c0b7269e48d81a1fbf017eacebe6f48aa26f6c044dc7975e0de1422a019ec  after
```

That is not a formality. The old loop rounds *inside*, before multiplying by the
dim; the sheet's loop does not round at all. Sharing one loop would have moved
every one of the 246 plates by a level, including the one pinned by sha256 in
`treatment.mjs`. Two loops, each with a reason.

**The new path lands where the sheet landed.** All 21 works, the sheet's
solved multipliers against the pipeline's:

```
ref       edit   sheet colour/bright   pipeline colour/bright
vl-0067   ceil   1    / 0.73           1     / 0.715
vl-0174   snap   1    / 0.8            1     / 0.8
vl-0226   ceil   0.71 / 0.8            0.757 / 0.8
vl-0230   ceil   0.7  / 0.59           0.695 / 0.583
vl-0240   ceil   1    / 0.63           1     / 0.624
vl-0251   bal    1    / 1              1     / 1
vl-0253   snap   0.93 / 0.8            0.932 / 0.8
vl-0254   ceil   0.45 / 0.8            0.45  / 0.8
vl-0256   ceil   1    / 0.6            1     / 0.593
vl-0259   ceil   1    / 0.52           1     / 0.495
vl-0265   ceil   0.72 / 0.52           0.725 / 0.521
vl-0275   ceil   0.85 / 0.8            0.844 / 0.8
vl-0279   ceil   0.57 / 0.76           0.571 / 0.756
vl-0280   ceil   0.88 / 0.61           0.869 / 0.605
vl-0281   ceil   0.85 / 0.7            0.854 / 0.692
vl-0291   snap   1    / 0.8            1     / 0.8
vl-0297   snap   0.72 / 0.8            0.719 / 0.8
vl-0298   ceil   1    / 0.63           1     / 0.623
vl-0308   snap   0.67 / 0.8            0.653 / 0.8
vl-0353   snap   1    / 0.8            1     / 0.8
vl-0354   bal    1    / 1              1     / 1
```

The white-balance gains agree to the same two decimals throughout.

**Where the two still differ, and why it is not a fault.** The largest gaps —
vl-0226 at 0.71 against 0.757, vl-0259 at 0.52 against 0.495 — are works the
sheet solved on the pool's copy while the gallery holds a larger scan, and the
probe reaches it down a different ladder of resizes. The rule chosen is the same
rule; the number it solves to moves by a few percent because the pixels it reads
are not the same pixels. Claiming otherwise would need the pool copy published,
which would be the tail wagging the painting.

## Two open questions closed by the same move

**"55% or 65%?"** — the screenshot said 55, the shipped code said 65, and the
two had been arguing since 17.08. The answer turns out not to be a number.
Every work Charlie chose a desaturation for chose **55**; 65 survives only on
the 246 works nobody has ruled on. They are no longer two records of one
setting, they are two settings with different names and different users.

**"Are the ceilings worth building in?"** — they are built in, for the thirteen
works that asked for them and no others. The brightness ceiling is as aggressive
as the earlier measurement said: it takes vl-0259 to ×0.495 and vl-0256 to
×0.593, well past the flat ×0.80. That was visible on the sheet before it was
chosen, which is the whole reason it can be shipped now.

## Two smaller consequences

**`max-age` went from a year to an hour** (`server.js`). A year with `immutable`
rests on the file under that name never changing. A hand-chosen treatment means
a plate is rebuilt under the same name exactly when the choice changes, so the
year would hide the edit from the person making it. There are no visitors yet,
so there is no cache worth paying for. When the editing stops, it goes back.

**"The treatment the collection carries"** — the line under the intake checkbox
— is now "the treatment *most of* the collection carries". 246 of 267 is not
"the collection", and the page had better not say it is.

## What this does not do

- **`app` and `niobe` are not implemented.** No published work chose either, and
  a rule nobody uses is a rule nobody has checked. The sheet still renders both;
  if a work ever picks one, that is when the pipeline learns it.
- **The sixteen short works are untouched.** They fail the resolution floor and
  their chosen edits are recorded in `research/chosen-edits.json` waiting for a
  bigger copy — see `2026-08-21-what-charlie-ticked.md`.
- **No new picture was invented.** Twenty-one plates were rebuilt with the
  setting their painting was given; the other 246 were left exactly as they were
  and are byte-identical to what they were this morning.
