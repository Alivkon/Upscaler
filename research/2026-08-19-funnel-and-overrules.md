# The funnel sheet, and what a Wikimedia file name costs

19 August 2026. Charlie asked for a page showing every work by the artists he
named, step by step through the filter, "in such a way where i can see clearly
if some of the filters are not doing their job and drop some good images".

---

## Not a bug: the filter is Cleveland's, the pool is not

I first wrote this section up as a misfiring gate. Charlie's correction, same
day: *"the gate thing is fine, the harvest is for cleveland optimized for their
titles, our process is slightly different."* That is the right reading and it is
the one to keep — what follows is a measurement of an input mismatch, not a
defect.

`name-filter.mjs` reads a title and answers whether it names a person. It was
built for the Cleveland harvest and measured at **100% precision on 350 hand
labels** of Cleveland titles, where a title is a title.

This pool is half Wikimedia, and Commons does not supply a title. It supplies a
file name, and a Commons file name begins with the painter:

```
Martin Johnson Heade - Two Hummingbirds and an Orchid (15722365285)
Albert Bierstadt - Among the Sierra Nevada, California
Hammershøi, Vilhelm - Amalienborg Plads - KMS1542
```

The filter reads *Martin Johnson Heade*, correctly concludes that a person is
named, and files a flower painting as a portrait. Measured on all 1193 works of
this pool:

```
dropped by the name filter          453
  of those, from Wikimedia          443
  of those, painter's own surname
  somewhere in the string           442
dropped on a cleaned title           94
comes back when the painter
is stripped out                     396     = 33% of the whole pool
```

The filter does exactly what it was built to do, on a string it was never built
to see. Everything downstream inherits the loss silently, because a work
rejected at step 2 is never measured, never shown, and never counted anywhere a
person would look — which is the reason to have this page at all.

**The hummingbirds Charlie asked to keep are in that pile**, and not for any
reason to do with the picture.

The funnel sheet therefore runs the gate on a cleaned title, and lists the 396
separately so the size of it is on the page rather than in a footnote. Stripping
the painter cannot admit a portrait: the sitter of a portrait is not the
painter, and a self-portrait says so in words that survive the strip.

**The cleanup needs the anchor trick.** The manifest's `artist` is a short label
— `de Witte`, `Harnett`, `van Huysum` — so removing only its tokens leaves the
forename standing: `Emanuel de Witte 007` cleans to `Emanuel`, which still reads
as a person, and five church interiors were lost that way on the first attempt.
The label is therefore used as an anchor: once a token is removed, capitalised
neighbours go with it and connectives (`van`, `de`, `von`) are stepped over,
which takes the whole signature in both orders a file name uses —
`Emanuel de Witte 007` and `Van Huysum, Jan - Vase with Flowers`. Hyphens
between letters become spaces first, or `Jean-Victor Bertin-Paysage` hides the
painter inside two tokens that match nothing. It cannot eat a title, because it
only grows outward from a token that is already the painter's; a Cleveland title
that never names its painter passes through untouched.

Thirty-seven works go the other way — they pass on the raw string and fail once
cleaned, because a place-name rule was shielding them. Included in the 94.

**What the 94 are.** Mostly right: Böcklin's *Bildnis von Friedrich Weber*, his
*Selbstbildnis*, *Paolo und Francesca*, *Eine Hirtin*, Friedrich's
*Gedächtnisbild für Johann Emanuel Bremer*. A few are the filter's own trouble
with place names rather than anything to do with the painter —
`Canadian Rockies`, `Corinth with Akrocorinth`, `Sparta-Ebene 1841` all read as
a pair of names. That is a handful out of 1193 and it is inside a component with
a measured score, so it was left alone.

**Nothing in the pipeline is changed.** The Cleveland harvest has no need of a
cleanup and does not get one; `pipeline2.mjs` and `.funnel.mjs` are untouched.
The `cleanTitle()` lives in the sheet, and it belongs in front of the gate only
for whichever leg of the process reads Wikimedia. Which leg that is, and whether
it is worth re-running, is Charlie's call.

## What each step actually drops, on a title the filter can read

Pool: 1193 works, 34 artists, Cleveland + Wikimedia. Order is the pipeline's own.
The name row is the same filter fed a cleaned title; on the raw Wikimedia file
name it takes 453 instead of 94. The box row is the snapshot box with busy at 75.

| step | entered | dropped | left |
|---|---|---|---|
| no plate on disk | 1193 | 0 | 1193 |
| name filter (cleaned title) | 1193 | 94 | 1099 |
| object filter | 1099 | 0 | 1099 |
| numerical box | 1099 | 388 | 711 |
| monochrome filter | 711 | 0 | 711 |
| frame_gate.py | 711 | 126 | 585 |
| model — people (staffage still rejecting) | 585 | 159 | 426 |
| model — frame | 426 | 0 | 426 |
| model not asked | 426 | 313 | **113** |

This is the chain as it stood before the four decisions below; the last three
rows changed and frame_gate is gone. The current staircase is in
"Four decisions off the funnel sheet".

Two steps drop nothing at all on this pool. The object filter and the monochrome
filter are looking for vessels, cloth and prints among 27 painters of oils; they
are not idle, they are simply pointed elsewhere.

`model not asked` is not a rejection. Those 313 reached the paid gate and stopped
there because no saved answer exists — the cache was filled by an earlier run
over a different set. They are shown as their own pile rather than as passes,
because a missing answer is not the answer "fine". Asking is about $0.001 each.

## The 109 missing plates, fetched

Charlie asked whether the works with no plate were worth another try. They were:
all 109 are Wikimedia, all 109 had a usable URL, and they were missing because
Commons rate-limited a download that went too fast. At 250 ms between requests
Commons answers 429; at 1200 ms with a retry it answers. `plates.mjs` fetched
**all 109**, 135 MB, free.

Where they ended up:

```
name filter        51    Romney, Gainsborough and Morland portraits — correct
numerical box      25
model — people     20
model not asked    11
frame_gate          2
survived            0
```

(counted before busy moved to 75 and before frame_gate was removed; the shape
does not change — none of the 109 reaches the survivors either way)

So none of them would have reached the gallery. That is not the same as not
having fetched them: "neither in nor out" was a hole in the count, and now every
one of the 1193 has a verdict or a named reason for not having one. Eleven are
still undecided because nobody has asked the model about them.

The re-fetch also removed the honest asterisk on the earlier funnel — the piles
below now cover the whole pool, not 91% of it.

**An asymmetry it introduced, since resolved.** These plates came in at up to
1600 px while the older ones are 400 px, and frame_gate reads a mat better at
1000 px than at 400 — so for one afternoon these 109 got a stricter frame check
than their neighbours. Removing frame_gate from this harvest ended that: nothing
left in the chain is sensitive to plate size, because everything else measures a
200 px copy.

## busy moved from 70 to 75

Charlie, 19 August: *"move busy to 75 — both in original harvest and dark
harvest."* Changed in all four places the box is written down: `.collections.mjs`
and `.funnel.mjs` (the Cleveland harvest) and `box.mjs` and `funnel.mjs` in
`/tmp/oils-preview` (this one). Nothing else in the box moved.

What it buys:

```
original harvest, 1451 works    664 → 710 pass the box    +46
this pool, 1193 works           box drops 423 → 388       +35 kept
                                survivors 109 → 113
```

64 works sit in the band between 70 and 75; 46 of them clear the rest of the box
as well, which is why the gain is 46 and not 64.

It does not reach Yoshida's *Evening in Nara* — one of the eleven Charlie picked
by hand. That plate measures busy 93.1, so no plausible move of this ceiling
admits it, and it stays an overrule.

## Four decisions off the funnel sheet

Charlie read the piles and changed three gates. Each is recorded where it was
made, in `/tmp/oils-preview/funnel.mjs` and `box.mjs`. **The Cleveland harvest is
untouched by all of them** — nothing said to change that leg.

**1. frame_gate.py is out of the dark harvest.** *"frame gate is mostly false
positives."* Its own header claims 91.4% precision, but that was measured on a
Cleveland-shaped set at 1000 px; here it ran at 400 px on paintings whose
painted niches and dark canvas edges it reads as mats. The model's frame answer
stays and is the one that was right — on this run it takes 1 work. The dead
`runFrameGate()` was deleted rather than left commented out.

Removing it takes away the last free filter between the box and the paid gate,
so every work the box passes now costs a model call if it is ever asked. `box.mjs`
prints that count before spending anything.

**2. Staffage is kept.** *"let's not drop 'person as staffage' as identified by
the model (we'll crop them out)."* Only `figure === subject` rejects now. A
shepherd three fields away is a detail of a landscape and the crop window is
chosen later anyway. The people gate goes from 159 rejections to 57, and the 102
staffage works are marked on the page so the ones needing a crop can be found.

**3. The unasked are kept, except from three painters.** *"keep all except
delacroixs, romneys, and gainsborough."* Those three are the portrait painters
in this pool, so an unasked work of theirs is far likelier to be a person than an
unasked Claude Lorrain. That step now drops 25 instead of 313.

This is a bet on the artist, not a look at the picture, and the page says so.
**407 of the 628 survivors have no model verdict at all** — they are kept because
nobody has looked, not because anyone approved them, and each one is marked.
Asking about all 407 would cost roughly $0.41 and would replace the guess with
an answer.

**4. Warmth stays parked.** *"scans are often wrongly too warm… let's keep it
parked for now and think about it later."* No change to `warm ≤ 0.47`, and the
observation is the reason to think twice: the measure cannot tell a warm painting
from a warm scan of a neutral one, so four of the eleven hand-kept works may be
arguing with the scanner rather than with the rule. Not resolved, deliberately.

Where that leaves the funnel:

| step | entered | dropped | left |
|---|---|---|---|
| no plate on disk | 1193 | 0 | 1193 |
| name filter | 1193 | 94 | 1099 |
| object filter | 1099 | 0 | 1099 |
| numerical box (busy 75) | 1099 | 388 | 711 |
| monochrome filter | 711 | 0 | 711 |
| model — people (subject only) | 711 | 57 | 654 |
| model — frame | 654 | 1 | 653 |
| never asked, and a portrait painter | 653 | 25 | **628** |

113 survivors became 628. Roughly: frame_gate off is +126, staffage kept is
+102, and the unasked rule is +288.

`dark.html` still shows the old 107. Re-running `box.mjs` under the new policy
would ask the model about every work the box passes, and that is a spending
decision.

## What `off` is

The box's least obvious column, and Charlie asked. Two of the seven measures
count colour, and they count different colour:

- **`p95`** — the 95th percentile of chroma over every pixel. How strong the
  colour is, of any hue.
- **`off`** — the same percentile, but only over pixels whose **hue falls
  outside the amber band, 15° to 75°**. Everything in that band is treated as
  sepia rather than as colour: browns, golds, warm varnish, candlelight, the
  ordinary tone of an old oil painting. So `off` is *how much colour there is
  that is not sepia* — blues, greens, pinks, cold greys.

The rule that makes it, verbatim from `.collections.mjs` and copied into both
funnels:

```js
if (h >= 15 && h <= 75) continue;   // amber band is sepia, not colour
off.push(c);
```

A varnished brown landscape can sit high on `p95` and low on `off`; a picture
with a blue sky scores on both. The box wants `off ∈ [15, 180]`, and only the
floor of 15 ever fires — it rejects works with almost no non-amber colour at
all. Hammershøi's *Interior. Artificial Light* is exactly that: `off = 12`, a
grey-brown room with nothing cool in it. Charlie kept it anyway, which is what
the overrules file is for.

The ceiling of 180 is one of the parked ends. `off` cannot reach it: chroma is a
byte difference, so 255 is its hard maximum and the observed 95th percentile
runs to about 120.

## One limit printed on the page, not hidden in this file

**The model has not looked at most of what survives.** 407 of the 628 survivors
have no saved answer — the cache was filled by an earlier run over a different
set, and they are kept under the artist rule rather than because anyone
approved them. Each is marked on the page. Nothing was asked fresh, so this page
cost nothing; asking about all 407 would be roughly $0.41.

The frame-size caveat that used to sit here is gone with frame_gate.

## What the box is throwing away by a hair

The sheet sorts each numeric pile by how far outside the range a work fell, so
near-misses come first. The first screen of the box's 388 rejections is:

```
warm 0.471   Bierstadt, Mountain Brook                    limit 0.47
warm 0.471   Claude Lorrain, Landschaft mit Apollon und Marsyas
warm 0.472   Claude Lorrain, A Classical Landscape with Figures
busy 70.1    Claude Lorrain, Coast Scene with Europa      limit 70
warm 0.473   Böcklin, Sacred Grove (1882)
warm 0.473   Caspar David Friedrich, Abend
warm 0.473   Claude Lorrain, Ulysses Received by the Daughters of Lycomedes
warm 0.474   van Schrieck, Pilze, Frosch und Grashüpfer
busy 70.2    Heade, White Brazilian Orchid
```

Böcklin's *Sacred Grove* is out by three thousandths of the warmth limit, and
Böcklin's *Ruin by the Sea* is one of Charlie's eight references. That is the
thing a count could never have shown.

## The overrules file

`research/handpicked-overrules.json` — works kept whatever the gates say.
Thirteen entries: Heade's *Two Hummingbirds and an Orchid*, Aizen Myōō as the
precedent Charlie named, and eleven picked straight off the funnel sheet on
19 August. It is the companion to `references.json`: that file is what
thresholds are calibrated to keep, this one is what they failed to keep and
Charlie kept anyway.

Each entry records the gate that actually dropped that work, measured on the run
he was looking at rather than guessed. Read together, the eleven fall into three
groups — and the grouping is the useful part, because it says which bound is
under the most pressure from his taste:

```
name filter, 4     Jacob with Laban and his Daughters   a biblical pair
                   Jugement de Pâris                    a person who is also a city
                   Meleager and Atalanta                two myth names joined by "and"
                   Snowdon from Llyn Nantlle            a Welsh mountain and a Welsh lake

warm ceiling, 4    Claude Lorrain, Tivoli               0.478   limit 0.47
                   Wilson, Italian River Landscape      0.481
                   Claude Lorrain, Lorraintivoli        0.601
                   John Martin, Le Pandémonium          0.617   a picture that is mostly fire

the dark end, 3    Hammershøi, Interior. Artificial Light   off 12 (floor 15), cap 13.91 (ceiling 11)
                   Harnett 001                              cap 14.36
                   Yoshida, Evening in Nara                 busy 93.1
```

Two of those groups are the same story told twice. The name filter is losing
mythological and Welsh place names — the same class of problem as the Wikimedia
file name, a dictionary meeting words it was not built for. And the warm ceiling
at 0.47 is under real pressure: two of the four miss it by less than 0.012,
while the reference set runs to 0.717. That is worth a look before anything else
in the box moves.

Writing the exception down is cheaper than moving the threshold. A luma ceiling
raised until the hummingbirds fit is a ceiling of 180, and at 180 it stops doing
anything at all.

Two things about the entries are honest guesses and are marked as such in the
file itself:

- **Aizen Myōō is an assumption.** Charlie said "that japanese painting with a
  kabuki person". `vl-0139` is the only Japanese work among his picks with a
  dramatic figure — a fierce red multi-armed deity on a lotus throne — and it is
  in the superseded twelve of `references.json`. If he meant another work, the
  entry says to replace it. It is also not in this harvest, so the funnel prints
  "overrule not in this pool" rather than passing over it in silence.
- **Three works on the sheet answer to "two hummingbirds" and an orchid.** The
  one recorded is the luma-180 plate — the one the conversation was about. The
  other two sit at luma 80 and 85 and were never at issue.

An overrule that matches nothing is a typo waiting to be believed, so the sheet
names every entry it could not find.

## The preview sheet, second version

Same page, four changes Charlie asked for.

**Text.** 17 px base instead of 13, body text at `#f2f2f2` instead of `#999`.
The explanatory paragraph is gone.

**Sliders.** Six sliders in one flat grid became four labelled blocks — Colour,
Brightness, Warmth, and the brightness cut — each with its own live readout on
the same line as its title, so a slider and the number it moves are never on
opposite sides of the panel. Every slider carries a plain sentence: *"0 — the
same cut for everyone · 100 — all end equally colourful"*. Track and thumb are
6 px and 20 px instead of 2 px and 11 px.

**Picture quality.** This was the real one. The plates are 400 px on the long
side; a 9:19.5 crop out of a landscape 400×333 is 154 px wide, and the sheet was
enlarging that to 288 and calling it the painting. `hires.mjs` fetches a bigger
file from the same open-access source — Cleveland's `_web.jpg`, and for Commons
the same thumbnail path with the width rewritten, falling back to the original
when a thumbnail that wide would be refused. **All 107 fetched, free.** Crops are
now made at up to 480 px and are never enlarged:

```
crop width, 10th / 50th / 90th percentile:  297 / 480 / 480 px   (was 288 for all, upscaled)
63 of 107 at the full 480 · 44 limited by their source
```

A soft card on the sheet now means a small source, not a soft painting.

## Every pile is behind a fold

Open, the page carries over 1500 cards and Chrome stops answering — measured,
twice, on this machine. Closed, nothing inside a `<details>` is laid out or
fetched until it is asked for, and the page opens instantly. It also matches how
the page is read: one pile at a time.

## Files

Working scripts, `/tmp/oils-preview/`, gone on reboot:

- `funnel.mjs` → `funnel.html` + `funnel/` (1193 thumbnails, 20 MB)
- `plates.mjs` → `plates/` (the 109 that the first harvest missed, 135 MB)
- `hires.mjs` → `hi/` (107 larger sources for the preview, 175 MB) + `hi.json`
- `sheet.mjs` → `dark.html` + `crop/` (107 phone crops, 15 MB)
- `box.mjs` — the harvest that actually calls the model and writes
  `survivors-box.json`. Carries the same two policy changes as `funnel.mjs`,
  and has **not** been re-run: doing so spends.

Served by `python3 -m http.server 7723` from that directory.

In the repo: `research/handpicked-overrules.json` and this file.
