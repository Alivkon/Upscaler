# Handover — GEO, and what an assistant actually quotes

24 August 2026. Started from *"should we write an about page for GEO optimization"*
and ended with **no about page**, three topic pages specified down to the title tag,
five rejected tactics, and one appealing quality claim killed by measurement.

Nothing was built. Everything below is decided, measured, or explicitly discarded.
The full record is `research/2026-08-24-geo-topic-pages.md`; the task sits in
`TODO.md` under «Сайты вокруг проекта».

## The mechanism, because every tactic follows from it

An assistant answering *"where can I get 4k painting wallpaper"* does not crawl,
count, or verify anything. It reads text — and overwhelmingly it reads the
**destination site's own topic page**, not a roundup.

Proof, not inference: two separate answers repeated the phrase *"no sign-up, no
account, no watermark."* That is `wallpapers.com`'s own copy, 43 words sitting above
the image grid on `/museum`:

> Right now there are 824 Museum Wallpapers to go at… Everything here is free, with
> no account and no watermark.

Count included, verbatim. Whatever we want an assistant to say about us has to exist
as a plain sentence on our own page.

## Five tactics tried and dropped

Each was reasoned about first and then checked. Every one died on the check.

| tactic | why it failed |
|---|---|
| an About page | nobody asks an assistant about us |
| getting into "best free wallpaper sites" roundups | roundups barely appear on intent queries |
| pitching Public Domain Review / Open Culture / HN | no editorial result appeared in any answer set |
| a downloadable pack for mirrors | indirect, and a strong mirror can outrank us in Google Images on our own crops |
| image posts to wallpaper subreddits | a post leaves a title and a link — no quotable text. Good for humans, useless here |

The ordering matters as a warning: the first four were each recommended, then
withdrawn, in that order. Reasoning about retrieval was wrong four times running.
The queries are cheap. Run them first.

## Which terms are winnable

Big aggregators are strong where their counts are big — `museum` 824, `impressionist`
1000+, ukiyo-e held by four sites plus a 1,000-print app. Those are closed.

Where the query is phrased as an **aesthetic**, the same sites collapse: `classic art
iPhone` 43 images, `museum aesthetic` 57. On `dark academia iphone` no aggregator
ranks at all — the top free results are two personal blogs at 40 wallpapers each,
above them Etsy listings. Pinterest owns the top of four queries out of eight.

Free: **brown aesthetic**, **old money**, **moody landscape** (that last one captured
by interior wall-murals, so phone intent is unserved but may be small).
Closed: light academia (800+), cottagecore, autumn, vintage botanical, wabi-sabi,
minimalist Japanese (400+ / 2700+).

**Image count does not rank.** `galleryflair.com` ranks with seven wallpapers and
TechPP with 27, above AlphaCoders' 288. Counts get *quoted* but do not get you
*chosen*. Consequence: the collection is already large enough — no harvesting is
needed before this work starts.

## The collection is 107 works, not 350

359 records in `catalogue/`, 252 `hidden`. Hidden are Charlie's refusals, not stock.
All 107 have a phone crop at 2160 × 3840; 97 clear the 1920 × 1080 desktop gate.

Fillable: museum/painting 102/99 · 19th c. 46 · Cleveland 44 · landscape 41 · dark 24
· America 22 / France 21 / Japan 18 / Netherlands 15 · 18th c. 20 · amber 20 · gold 8
· japanese 15 · still life 6–7. Artists top out at 7, too thin for artist pages.

## The page, specified

```
/collection/oil-paintings          ← part of the collection, never a standalone
                                     "X wallpapers" page; that shape is the farm tell
<title>  Oil painting phone wallpapers — 2160 × 3840, free
<h1>     Oil paintings as phone wallpaper
<p>      [the note]
         [existing grid(items), cards unchanged]
```

The note, agreed wording:

> Ninety-nine oil paintings, cropped into phone wallpaper at 2160 × 3840. Landscapes,
> still lifes and interiors from the 17th to the 19th century, held by the Cleveland
> Museum of Art, the Tokyo National Museum and the SMK in Copenhagen. Every one is
> free to download and set as a background, with no account and no watermark, and
> each names the collection it came from.

Rules that produced it, each with a reason:

- **Title: terms first, brand last or gone.** `collectionPage` in `pages.js` leads
  with `Tessarum`; nobody searches that, and early words weigh more and survive
  truncation. No count in the title — it does not rank, and `[800+]` is the farm tell.
- **H1 carries the same terms.** Google substitutes the H1 into the result title; a
  bare "Oil paintings" would drop *phone wallpaper* exactly when it is needed. This is
  the same reasoning that removed the kicker from the index (`pages.js`,
  `collectionPage`) — there, to leave no substitution candidate at all.
- **The note is what gets quoted.** 50–60 words, short declarative sentences, count
  first, no ornament. Museum voice is fine; lyricism is not, because plain sentences
  carrying numbers and proper nouns are what a model lifts.
- **The count is computed, never typed.** It moves with every publish and every
  `hidden`, and it gets quoted verbatim.
- **Words in three places, doubled nowhere.** `wallpaper` in title, H1 and the note's
  first sentence. `background` already appears in 85 of 107 alt texts, so the page
  carries it dozens of times for free; the note says it once in a real sentence. Never
  "wallpapers and backgrounds" in a title — that is the Zedge / WallpaperAccess tell.
- **Work pages must link up to their topics, and topics go in `sitemap.xml`.** Without
  that nothing points at a new page and it is not crawled.
- A work appearing on several topic pages is fine. That is not the vl-0258 problem —
  those were two *work* pages sharing one picture; these are index pages.

## Build order

1. **oil / classical painting** — 99 of 107 works, so it is a title, a heading, a
   paragraph and a route, not a new gallery.
2. **one** of `dark academia` / `brown aesthetic` / `old money` / `moody landscape` —
   all four draw on the same ~40 dark/amber/gold works and would compete with each
   other in one result page. Two at the most.
3. **landscape paintings** — 41, distinct from "landscape", which everywhere means
   photographs.

## The negative result, so nobody re-derives it

The idea: curation selects calm pictures and crops are placed by hand, so our frames
should be quiet where the clock and widgets sit — a quality claim with a *measure*
behind it rather than an adjective.

First numbers looked like support. Clock zone (row 0 of the measure's 4×6 grid,
200 px) median **13.1** against **24.4** for the whole frame; top calmer than middle
in **83 of 107**.

Then the reference test, the same one `.busythumbs.mjs` runs. Six of Charlie's eight
calibration works are in the gallery, and five sit at the **70th–82nd percentile** of
clock-zone busyness — among the busiest tops in the collection. A cut at 25 passes one
of the six; a cut at 35 passes all six and 94 of 107 works with them. There is no
threshold that separates chosen from unchosen.

So the 78% is a property of painting — sky is at the top — not a trace of curation.
**Do not write the sentence**, in any fraction. Caveat in fairness to the eye, not the
claim: those eight were calibrated on review thumbnails and on whole-frame busyness,
so this says the eye selects for something else, not that it selects badly. What that
something is remains unmeasured.

Scripts: `.clockzone.mjs`, `.clockband.mjs`, `.clockrefs.mjs`, all uncommitted.

## What survives as the differentiator

Countable, true, and unwritable by a farm: **359 records, 107 shown** — three of every
four rejected — and 67 crops positioned by hand. Farms are incentivised the other way,
which is why their pages shout 824 and 1,500,000.

## Known limits

No keyword volume data — "demand exists" rests on Pinterest board density and Etsy
sellers, which is a proxy, not a number. Result pages were sampled once, from the US,
on 24.08.2026. Aesthetic-to-inventory fit was judged from tags, not by looking at the
pictures; that is Charlie's call. And it is untested whether a *quality* claim gets
quoted the way a factual paragraph does.

## Two claims that turned out to be false, and one belief

Written the same evening, after the pages were built.

**The quotable paragraph lied twice.** The note above the grid was drafted as
`Each is cropped by hand into phone wallpaper at 2160 × 3840` — the sentence
written specifically to be quoted verbatim by an assistant. Both halves were
wrong. 2160 × 3840 is the 9:16 frame of a 4K plate, and 24 of the 53 works have
no plate that big (the smallest frame is 1185 × 2106); hand-placed crops exist
for 31 of the 53, the rest are machine-centred. It now reads `Each is cut to
9:16 for a phone screen, 29 of them at 2160 × 3840 or larger`, and the 29 is
computed by `measure()` in `collections.js` from the same works the grid shows.
The rule that came out of it: **no number in the note is written by hand.** A
number that drifts inside a paragraph designed for verbatim quotation stops
being our mistake and becomes someone else's answer.

**Cannibalisation is folklore.** The research doc claimed two topic pages
drawing on the same works would compete in one result set and cost each other
ranking. There is no measurement behind that, here or anywhere we looked.
Google collapses near-duplicate *pages* competing for the *same query*; two
topics with different titles, headings and paragraphs are not that, and the
shared images rank through `/w/` work pages that no topic page owns. The doc is
corrected in place. The honest argument against a third topic is arithmetic:
`old money` would add six works, the other nineteen candidates already sit in
dark academia.
