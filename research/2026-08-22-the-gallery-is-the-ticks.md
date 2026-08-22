# The gallery is the ticks

22 August 2026. The showcase was hung to match the `/edits` answers: what was
not ticked came down, what was ticked and had no page went up. Afterwards the
site shows **76 works and 117 plates** — the same 117 that were ticked, one
plate per tick, nothing else.

```
before   115 live · 215 put away · 330 records
after     76 live · 254 put away · 330 records
          78 taken down · 39 hung
```

## Nothing came down unjudged

"Not ticked" is only an answer if the painting was actually looked at. Of the
78 live works that carried no tick, every one had been on a sheet:

```
71  were on the /edits sheet of 22.08 and got no tick
 7  were on the pool sheet of 21.08 and got no tick — which is why the
    second sheet left them out
 0  were never judged
```

The sheet is also known to have been read past its live half. `gedits.mjs`
sorts live works to the front and unanswered ones ahead of answered ones, so
the 108 live works came first and the 150 waiting-for-a-page ones after. There
are ticks on 39 of the latter, so the reading went through the whole live block
and out the other side. That is what makes the silence on those 71 a refusal
rather than a stopping point.

## Taking a work down does not take it away

`hidden: true` is filtered on the way out, in `server.js`, not on the way in.
Three surfaces lose the work — the grid, the "more from the collection" strip
and the sitemap — and the page gets `noindex`. **The address keeps answering
200.** All 78 were checked after the change and none of them 404s.

That distinction is the whole point of the field: coming off the showcase and
leaving the collection are different events, and a URL that has been in the
world should not start returning nothing because taste changed. What is real,
and should be said plainly: 78 pages leave the sitemap and ask to be dropped
from the index. For a gallery whose channel is Google Images, that is the cost
of the decision, and it is paid the moment the sitemap is fetched.

## What went up

The 39 that were ticked but had no page were already built — plates, two
copies, three crops, and the extra versions from the same day's work. Hanging
them was a matter of dropping one key.

One thing had to be repaired first. A published record names its file, and all
115 live records did; among the hidden ones **16 named a plate that no longer
existed at that size**, because the Cleveland masters were re-fetched at full
resolution after the record was written. `vl-0042` still said 3400×1857 where
the manifest had 7030×3840. The page would have rendered correctly either way —
the manifest wins whenever it has the work, and `file` is only the fallback for
hand-made entries — but shipping a record that misstates its own file is how
the two repositories drift apart. Fixed to what the manifest says.

Twenty-seven records that were *already* live carry no `file` at all (they were
written after the field stopped being filled in). Those were left alone: adding
the field would have been twenty-seven more places to keep in step, for a
fallback that is never reached.

## What is now standing

```
none                35    ceil     29    bal      18
snap                22    app      11    niobe     2
                                         ────────────
                                         117 plates on 76 works
```

Forty-one of those are second and third versions of a painting, shown on that
painting's own page under **Other versions**. The showcase counts 76 cards, not
117 — one painting, one page, as decided the same day.

## Two things the hanging exposed

**The order is now the wrong order.** `catalogue/order.json` was arranged for a
collection four times this size, where works by one painter were separated by
other people's. With those removed, the like now sits together: the site opens
with four van Huysum flower pieces in a row, then two Hammershøis. Of the 76,
seven are van Huysum, five Bertin, five Audubon. The hanging was not touched —
it is taste, not a conclusion — but it needs re-doing.

**Eleven works on the showcase are built from the 3400-capped Cleveland copy.**
Before today none of them were published, which is why the re-download was
filed as unhurried. They are now the only live works whose long side stops
exactly at 3400: vl-0037, vl-0038, vl-0043, vl-0065, vl-0069, vl-0083, vl-0084,
vl-0087, vl-0139, vl-0142, vl-0151. No 4K desktop crop can come out of them.

Also live and short of the phone floor of 1320×2868: vl-0057 (1288×2790) and
vl-0236 (1311×2841).
