# One copy per painting, at the screen's own size

21 August 2026.

> this is not the same: Albert Bierstadt - Thunderstorm in the Rocky Mountains /
> Bierstadt Albert By a Mountain Lake. okay, pick the smallest one that is big
> enough for an hdq+ screen for each and update /phone with them. what about
> files in the gallery that we recently added, did we miss anything there

## The false positive, and the fix

Charlie was right. Those are two different Bierstadts. Same painter, same
subject, same composition — a lake low, mountains behind, a bright sky — and
dHash cannot tell them apart, because squashed to 9×8 they genuinely **are** the
same shape.

dHash is now used only to **propose** candidates cheaply. Each candidate is then
settled at 64×64 grey by **correlation**, which is free of scale and offset, so a
varnished amber scan and a cleaned bright one of the same painting still agree.

A plain mean-difference was tried first and rejected: no threshold on it both
accepted *A Seaport at Sunset* (two real scans) and rejected the two Bierstadts.

Both known false pairs are now separated:

```
separated  Thunderstorm in the Rocky Mountains  ||  By a Mountain Lake
separated  A Panoramic Landscape at Dusk (Claude)  ||  View in Windsor Great Park (Wilson)
```

### There is still no clean line, and the note says so

```
same painting   0.982  0.986  0.998  0.999
different       0.694  0.713  0.960
```

At 0.975 the check rejects `HeadeMartinJohnsonSunlightAndShadow` against its own
4000 px twin at **0.973** — a pair already confirmed by eye. The band from about
0.96 to 0.99 holds both kinds.

So the threshold is deliberately **loose at 0.96**: it proposes, it does not
decide. All 47 groups were then looked at on `dupes.html`. A measure that cannot
separate two piles should be made to admit it rather than tuned until its
mistakes are merely invisible.

## Smallest that is big enough

For each group, `phone.mjs` takes the **smallest copy that still fills the
screen**, not the biggest. Between a 4000 px scan and a 12541 px one, both fill
the glass identically; the smaller is less to fetch and less to store. Only when
nothing in the group reaches the target does the biggest win.

**Target: 1080 px wide — FHD+ (1080×2340), the mainstream phone.** QHD+ was
considered and is not what the pool can feed:

```
HD+   720 px    267 of 628 works can fill it   (50 of Charlie's 83)
FHD+ 1080 px    164 of 628                     (38 of 83)
QHD+ 1440 px     88 of 628                     (20 of 83)
```

`TARGET=1440 node phone.mjs` switches it if Charlie wants QHD+ anyway.

## The bigger error this uncovered: the sheet was 640 px wide

`phone.html` had been reusing `pick/`'s crops, which are sized for a card in a
desktop grid. **A phone is 1080 or 1440 physical pixels across, so every work was
being upscaled by the browser before it was seen.** Everything looked soft —
including works whose source is 6000 px. That was not a judgement of the
painting, it was a judgement of the thumbnail, and some of Charlie's picks were
made through it.

`phone.mjs` now renders its own images at the target width.

```
47 paintings had copies · 52 redundant files dropped · 576 works shown
154 of 576 fill 1080 px · 422 fall short
```

**422 of 576 still cannot fill an FHD+ screen.** That is the pool's real state
and no rendering choice changes it; the captions now name the width when a work
falls short.

Four of Charlie's kept works pointed at a copy that is not the winner. Only two
are upgrades — the other two look identical at 1080 and are named separately,
because calling a sideways move an upgrade would be a lie.

## The gallery — asked the same two questions

**The plumbing is fine.** All 330 catalogue entries resolve to a plate on disk:
326 through the manifest, 4 through their `file` field, none dropped. The 99
entries with no `file` field are not broken — `file` is optional in
`verify-catalogue.mjs` and `gallery.js` reads the manifest first.

**One painting is published twice.**

```
vl-0260  3729×3876  The Buildings of the Asiatic Company, seen from St. Annæ Street
vl-0258  3726×3875  The Asiatic Company Buildings, Christianshavn
```

Two Wikimedia uploads of the same Hammershøi scan, three pixels apart, given two
slugs and two catalogue entries. Checked side by side: the same painting. Two
gallery pages competing for the same search, which for a gallery whose channel
is Google Images is worse than a wasted slot.

`vl-0003` / `vl-0007` also grouped and are **not** duplicates: two gradient
wallpapers, the same shape in different colours. The correlation runs on
greyscale, so colour is exactly what it cannot see. Named here because it is the
predictable blind spot of the method, not a surprise.

**Only one plate is genuinely under-rendered.** 25 published plates are smaller
than a source now on disk, but 24 of them are already at the 3840 px spec and
are complete. The exception:

```
vl-0065  plate 2540×3400  → source 4483×6000   Rest on the Flight into Egypt
```

3400 tall, from the older target, with a 6000 px source available.

## Files

- `/tmp/oils-preview/dupes.mjs` — dHash proposes, correlation confirms;
  `MIN_CORR=0.98 node dupes.mjs` to tighten.
- `/tmp/oils-preview/phone.mjs` → `phone.html` + `phone/` — its own render at
  `TARGET` px, one copy per painting.
- `/tmp/oils-preview/gallery-audit.mjs` → `gallery-audit.json` — the same two
  questions asked of the 330 published works.
