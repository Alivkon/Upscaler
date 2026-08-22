# The box Charlie's favourites make, and why it barely filters

20 August 2026.

> check favorites except the orchid, and filter pics that are within the same box
> as them

**Short version: the box keeps 307 of 628 survivors — half the selection — and it
is loose for a reason that will not go away by measuring harder.** The favourites
are two families of picture, not one, and a min–max box around two clusters
contains everything between them. The one thing it does cut hard is brightness.

## The favourites

Every work Charlie has named, from all three places they are written down:

- the 29 in `research/handpicked-overrules.json`,
- the eight in `research/references.json` plus the two named beside them,
- *The Destruction of Niobe's Children*, called a very good wallpaper on 19.08.

That is 33 distinct works. **Two Hummingbirds and an Orchid is left out** by
Charlie's instruction — it is the one he has already called a conscious
exception, and putting it in would widen the box on his behalf for a work he has
already agreed to keep by hand.

30 of the 33 could be measured. The three that could not have no copy of the
whole work anywhere on this machine: `vl-0084` La Tour St. Jacques, `vl-0166` The
Emperor's Attendance at the Horse Race, `vl-0043` Storm in the Mountains. The
Delaroche has no catalogue ref at all and is reached through none of the three
routes.

Everything is measured on the **200 px copy of the whole work** — the surface
every threshold in the box already stands on, not the shipped 9:19.5 plate. The
run refuses to continue unless it reproduces the funnel's own numbers on all 628
survivors, and it does.

## The box

```
measure        low     high   keeps of 628   keeps of 1193   who sets the low / high
luma          29      125            483             925   Interior. Artificial L / Jacob with Laban
warm      -0.063    0.825            608            1149   Paysage avec Jacob    / Aizen Myōō
p95           11      121            620            1109   Interior. Artificial L / Lorraintivoli
off           12      101            614            1073   Interior. Artificial L / Aizen Myōō
cap         1.98    14.36            563            1080   Jacob with Laban      / Harnett 001
busy         9.7     93.1            627            1116   Interior. Artificial L / Evening in Nara
iqr           15      133            497             997   Interior. Artificial L / Lorraintivoli
range         32      193            508             990   Interior. Artificial L / Lorraintivoli
sd          11.9     70.6            518            1029   Interior. Artificial L / Lorraintivoli
dark       0.047    0.978            597            1105   Evening in Nara        / Interior. Artificial L
ncol           4       91            560            1012   Interior. Artificial L / Lorraintivoli
nhue           2       10            620            1139   Aizen Myōō             / Paysage avec Jacob

all twelve at once: 307 of 628 survivors, 522 of 1193 in the whole pool
```

Read the last column first. **Every single bound keeps more than 80% of the
survivors on its own**, and eleven of the twelve keep more than 88%. The box is
not a filter; it is a description of a range that the selection already sits
inside.

## Two pictures write most of the box

Look at who sets the bounds. Hammershøi's *Interior. Artificial Light* sets the
low end of nine of the twelve measures. *Lorraintivoli* sets the high end of
five. Between them, two works out of thirty decide fourteen of the twenty-four
bounds — and they are at opposite ends of every one of them.

That is the two-family problem from
[2026-08-19-what-makes-niobe-good.md](2026-08-19-what-makes-niobe-good.md)
showing up again, in a second form. The handpicked works are night interiors and
daylight landscapes, and a rectangle drawn around both contains the whole middle
of the pool, which is neither.

## Only brightness does real work

Adding the bounds one at a time, tightest first:

```
  + luma    →  483 survivors left
  + iqr     →  385
  + ncol    →  348
  + range   →  331
  + warm    →  322
  + off     →  316
  + dark    →  311
  + nhue    →  309
  + p95     →  308
  + cap     →  307
  + busy    →  307      ← adds nothing
  + sd      →  307      ← adds nothing
```

`luma` alone does 145 of the 321 cuts. The three tonal-spread measures together
add another 100. The remaining eight measures, all seven of the box's original
ones among them, remove 32 works between them, and the last two remove none.

This is the same answer the two ceilings gave on 19.08 from the other direction:
**brightness is the measure that carries Charlie's taste, and almost nothing else
does.** The box's own bound is `luma [20, 200]`, which has never once bound.
Against the favourites the honest bound is `[29, 125]`.

## The honest recall

A min–max box keeps every work it was drawn around — that is arithmetic, not
evidence. The only usable test with no negative labels is to leave a favourite
out, build the box from the other 29, and see whether it comes back in.

```
  out: Aizen Myōō                        warm, off
  out: Jacob with Laban and his Daughters luma, cap
  out: Lorraintivoli                     p95, iqr, range, sd, ncol
  out: Interior. Artificial Light        luma, p95, off, busy, iqr, range, sd, dark, ncol
  out: Evening in Nara                   busy, dark
  out: William Michael Harnett 001       cap
  out: Paysage avec Jacob luttant        warm, nhue

  23 of 30 survive a box built without them — 77% leave-one-out recall
```

Seven favourites are each the only reason their own bound exists. A rule fitted to
this set would have missed them, which is the price of a set with this much
spread in it, and is why they are hand overrules rather than a threshold.

## What tightening costs

Give every bound to the *second* most extreme favourite instead of the first:

```
trimmed box: 156 of 628 survivors, 245 of 1193 — and it drops 7 favourites
```

Half the pool becomes a quarter. The seven it drops are the same seven the
leave-one-out found, which is the same fact said twice: those works are the box.

`luma` goes `[29, 125] → [31, 98]` and cuts to 351 on its own; `cap` goes
`[1.98, 14.36] → [2.63, 13.91]` and cuts to 363. Everything else stays wide.

## One thing found on the way: the recorded `cap` was never dimmed

`references.json` says its numbers were measured with `cap` "read off the work
already dimmed by 0.8". Measuring the same six files with today's code:

```
work                            luma      warm       p95      off       cap    cap undimmed
Interior of a Church          73→73  0.284→0.284   38→36    45→25   4.69→6.38      4.49
Vase of Flowers               52→52  0.011→0.014   37→32    96→73   3.06→4.60      3.10
Interior of the Pantheon      78→78  0.419→0.419   59→54    89→83   4.72→6.60      4.67
In the Woods                  43→43  0.717→0.716   48→46    63→55  10.68→12.82    10.62
Landscape with a Church       63→63  0.221→0.222   50→48    51→49   2.54→3.85      2.54
Rest on the Flight into Egypt 60→60  0.166→0.169   45→43    46→45   2.46→3.67      2.41
```

`luma` and `warm` reproduce exactly, so it is the same pixels. **The recorded
`cap` is the last column — the undimmed one.** Five of the six match it to within
0.05.

That matters because the box enforces `cap [1, 11]` on the *dimmed* number, and
`research/2026-08-19-reference-sets.md` reasons about a floor of 2.46 taken from
the undimmed one. On the box's own scale the eight references span **3.67 to
12.82**, not 2.46 to 10.68. It changes no verdict — `In the Woods` fails the
ceiling of 11 either way, which is already written down — but it means any future
argument of the form "the references bottom out at 2.46" is comparing two
different numbers.

`off` does not reconcile at all (45 → 25 on the de Witte) and is not explained
here. `references.json` has **not** been edited: overwriting a calibration value
is how a reference set stops being one.

## What this does not do

- **Nothing is changed.** No threshold moved, no gate added, no file in the
  pipeline touched. This is a measurement of a box, not the installation of one.
- **The 307 is not a shortlist.** It is what a loose box keeps, and roughly half
  of it will be works Charlie does not want; there are still no negative labels
  anywhere, so this has no measurable precision.
- **Three favourites are missing** and one of them, Storm in the Mountains, is a
  daylight landscape, which is the family that sets the high bounds. Its absence
  can only have made the box narrower than it should be.

## Files

- `/tmp/oils-preview/favbox.mjs` — the whole thing.
- `/tmp/oils-preview/favbox.json` — all 1193 works on the 200 px surface with both
  the box's measures and the tonal-spread ones.
- `/tmp/oils-preview/favbox-result.json` — the box, the 30 favourites, the 307.
