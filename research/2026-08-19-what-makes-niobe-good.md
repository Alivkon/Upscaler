# What makes The Destruction of Niobe's Children a good wallpaper

19 August 2026. Charlie called Richard Wilson's *The Destruction of Niobe's
Children* a very good wallpaper and guessed the reason was "low dynamic range plus
not a lot of n of colours". This checks both halves.

**Short version: the first half holds and the second does not.** Low tonal spread
is real, survives a control for darkness, and is not something the box measures.
Few colours is true of this one picture and of nothing else Charlie has picked.

## How it was tested

One liked picture cannot validate a measure — anything is at some extreme if you
look for one. The test used here is: *does a measure that puts Niobe at the top
also put the works Charlie handpicked at the top?*

The 29 entries in `research/handpicked-overrules.json` are the only hand labels in
this project. 18 of them have a plate in the harvest directory, so they can be
measured on the same 200 px surface as the 628 survivors and ranked against them.
There are no negative labels — `references.json` says so outright — so nothing
below is a precision.

Candidate measures, all read off the same buffer the box uses:

```
range  luma p95 − p5            dynamic range, ends included
sd     standard deviation of luma
iqr    luma p75 − p25           dynamic range of the middle half
dark   share of pixels below luma 64
ncol   how many 16-per-channel colour bins cover 90% of the picture
nhue   how many 15° hue families cover 90% of the chroma
```

## Niobe against the 628 survivors

```
measure  Niobe   its %ile   survivors 10/50/90
iqr         21      1%        37    97   148
ncol        16      1%        27    56    93
off         16      2%        20    37    81
sd          26      3%      32.8  55.5  74.6
busy      15.9      3%        22  40.3  64.9
range       80      4%       101   162   204
p95         32      5%        37    63    93
luma        56     16%        49    91   154
nhue         3     19%         2     4     7
dark     0.683     94%     0.099 0.351 0.593
cap       7.17     97%      1.97  2.84  5.28
```

Charlie's instinct was right about the picture. It is in the bottom 1% of the
selection on both halves of what he named. It is also the third-quietest and near
the top for caption contrast.

## But only one half generalises

Ranking all 18 handpicked works the same way. A measure that describes what
Charlie likes should push all of them to one end; 50% is chance.

```
measure     n   median %ile   min–max %ile   Niobe %ile
dark       18          93%         5–100%          94%
cap         7          96%          3–98%          97%
luma        7           4%          1–97%          16%
nhue       18          19%          0–99%          19%
iqr        18          23%          0–78%           1%
sd         18          26%          0–83%           3%
range      18          27%          0–91%           4%
ncol       18          28%          0–97%           1%
p95         7          42%          0–64%           5%
```

`ncol` has a median at the 28th percentile and a spread from the 0th to the 97th.
It puts Niobe first and then scatters everything else across the whole range. **The
colour-count half of the guess is a fact about this painting, not about Charlie's
taste.**

`iqr` looks better but its spread is nearly as wide, and the reason is visible in
the list: the handpicked works are two families, not one.

```
night scenes        Interior. Artificial Light  iqr 15   Le Pandémonium   iqr 27
                    Harnett 001                 iqr 16   John Martin 001  iqr 44
daylight landscapes Meleager and Atalanta       iqr 63   Snowdon          iqr 124
                    Italian River Landscape     iqr 115  Lorraintivoli    iqr 133
```

`iqr` separates his picks; it does not unify them.

## Darkness is what unifies them — and it is already measured

`dark` is the only measure where all 18 sit at one end, median at the 93rd
percentile. But `dark` correlates −0.84 with `luma`, which the box already
measures. Its bounds are `[20, 200]`, and 200 is above the brightest work in the
pool, so the ceiling has never once bound. **The strongest thing Charlie's picks
have in common is a gate that exists and is switched off.**

That is the same gate he asked for on the same day —
[2026-08-19-the-two-ceilings-charlie-chose.md](2026-08-19-the-two-ceilings-charlie-chose.md).

## Low tonal spread is not just darkness

Worth checking, because a dark picture has less room to spread. Restricting to the
150 survivors with `luma <= 65` and re-ranking inside that group:

```
                    the six handpicked, %ile within the dark group      Niobe
iqr                 10  21  31  15  12   1                                3%
range                7  24  14   7  17  15                                7%
cap                 91  78  85  86  89  73                               87%
ncol                31  90  39  35  60  10                                3%
busy                19  79  41  23  88   7                                2%
```

Among works that are already as dark, the handpicked ones are still all in the
bottom third on tonal spread, and Niobe is in the bottom 3%. **Low dynamic range
carries information darkness does not.** `ncol` scatters again, in a second
independent test.

## What it is close to

`cap` — the contrast a white caption gets against the brightest of the 24
home-screen cells — correlates −0.68 with `iqr`. That is not a coincidence: a
picture whose middle half of tones is compressed has no bright patch for a caption
to fight. Handpicked median `cap` is 6.73 against a survivor median of 2.84.

So the wallpaper virtue Charlie is responding to is probably already half-captured
by `cap`, from the other direction, and `cap`'s bounds `[1, 11]` also never bind.

## What came of it

Tonal spread turned into a control. Charlie asked the same day for a slider that
darkens only the highlights and, separately, for one that makes every work "more
like Niobe's children" — and those are the same slider, because a highlight
shoulder lowers p75 and leaves p25 alone, which is lowering the spread. Plain
dimming cannot substitute: it reaches Niobe's spread only at half Niobe's
brightness. Measured, built on `/dark`, and written up in
[2026-08-19-the-shoulder-replaces-warmth.md](2026-08-19-the-shoulder-replaces-warmth.md).

The colour-count half of the guess was not built into anything, which is the right
outcome for a measure that failed both of its tests.

## Caveats worth keeping

- **18 hand labels, 7 of them inside the survivor list.** Every number above is on
  that sample.
- **No negative labels at all.** Nothing here is a precision, and a measure that
  ranks the liked works high may rank plenty of bad ones high too.
- **The retrieval lifts are skewed.** Cutting the survivors to the lowest 10% by
  `iqr` catches 5 of the 7 handpicked survivors — a 7.1× lift — but 6 of those 7
  are night scenes, so a measure that merely likes darkness scores well there for
  the wrong reason. The rank table above is the number to trust; the lift is not.
- **Nothing was changed.** No threshold moved, no new measure entered the box.

## Files

- `/tmp/oils-preview/measures.mjs` — the candidate measures.
- `/tmp/oils-preview/quantify.mjs` — all 628 survivors, writes `quantify.json`.
- `/tmp/oils-preview/quantify2.mjs` — the 18 handpicked, the rank table, retrieval.
