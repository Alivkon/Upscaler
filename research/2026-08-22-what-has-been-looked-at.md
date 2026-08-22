# What has been looked at

22 August 2026.

> save somewhere so this doesn't repeat, to keep track on hard drive what i've
> seen, the status of harvest in general … what i remember is we were looking at
> samples, and we looked at two i think, so there should be a bunch more

Charlie's memory is right, and the gap is bigger than "a bunch". Numbers in
`harvest-state.json` beside this file; that is the one to update, this is why.

## First: the record was in /tmp

Every sheet ever shown — `funnel.html`, `pick.html`, `dark.html`, `edits.html`,
`edits-pool.html` — and every roster behind them lived in `/tmp/oils-preview`.
Not a copy. The only one. Six weeks of judgement, one reboot from gone, and the
session that went looking for it started by concluding it *was* gone.

Copied to `~/upscaler-review/seen/` on 22.08. **No sheet goes in `/tmp` again.**

## What has been shown

| sheet | roster | shown | works |
| --- | --- | --- | --- |
| `funnel.html` | `favbox.json` | 19.08 | 1193 |
| `pick.html` | `pick.json` | 20.08 | 628 |
| `dark.html` | `darkworks.json` | 18.08 | 628 |
| `edits-pool.html` | `gedits.json` | 22.08 | 258 |
| `edits.html` | `edits.json` | 21.08 | 79 |

Union across all of them: **1451 distinct works**. And the composition is the
finding:

```
wikimedia   1154
other        258
cleveland     39
```

Thirty-nine. Every wide sheet was fed from Wikimedia.

## What has not

`~/tessarum-harvest/browse-all` holds a full crawl of Cleveland — 14,614
records, of which 10,670 are prints and **3,944 are paintings**. Against those
3,944, counting a work as touched if it reached any sheet *or* is in the
catalogue:

```
3,944 paintings          3,822 never touched
  970 western              889 never touched
```

```
France 306 · America 208 · Italy 148 · Netherlands 67 · England 36
Germany 34 · Flanders 32 · Spain 22 · Austria 14 · Russia 9 · rest 13
```

So the register the gallery is actually built in — dark European and American
oils — has **889 Cleveland paintings that have never been on a sheet**, against
a gallery of 76. The other ~2,950 are Indian miniatures and East Asian scrolls,
a different register and mostly light-ground.

The 156 Cleveland works already in the catalogue got there by another route —
only 105 of them appear in `browse-all` at all, and the sheets carry 39. There
is no roster on disk for whatever path that was.

## What this does not say

**Untouched is not unfiltered.** The chain in `2026-08-19-harvest-filter.md`
cut 3,944 candidates to a 628-work sheet in its Wikimedia pass — about 84% —
and the hardest gate is Qwen on people, which a museum's oil holdings fail
constantly. 889 untouched paintings is not 889 candidates.

**Untouched is not unseen-by-anyone.** Some fraction may have been shown on a
sheet whose roster did not survive, or rejected by a filter before any sheet
existed. 39 is what the surviving rosters prove, not what happened.

**Cleveland is one source.** `aic`, `met`, `smk`, `smk2`, `smk3`, `cle`, `eaa`
sit beside `browse-all` in the harvest and were not counted here.

## Keeping it true

`harvest-state.json` carries the sheet list, the union of refs shown, and the
untouched counts. After any new sheet: add it to `sheets`, add its refs to
`seen`. The counts are then recomputable and the next session does not have to
excavate transcripts to learn what was already judged.

The thing worth protecting is the *refusals*. A tick is recorded in
`chosen-edits*.json`; a work looked at and passed over leaves no trace except
its presence on a roster. Lose the roster and the refusal reads as an oversight
— which is exactly the mistake this session made twice, once proposing to
un-hide 47 works Charlie had refused the day before.
