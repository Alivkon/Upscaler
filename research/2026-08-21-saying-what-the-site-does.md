# Saying what the site does

21 August 2026.

> it's still a bit unclear that you can make your own wallpaper with our app,
> when pepople visit the home gallery page, and when people upload - e.g.
> TS.---- placeholder implies it's inviting to upload smth from our gallery,
> 'Restore' button is very unclear, button on restore page should the 'MY
> image' probably - check what else we should change to make it clear

## The finding

The code already knew. `pages.js:49`, written before this conversation:

> Restore — слово музейное, и в этом его ценность… Но в значении «увеличить»
> его не знает никто, а объяснено оно на сайте ровно в одном месте — в
> `<meta name="description">`, которую человек не видит.

Every symptom Charlie named is that comment coming true. The word was chosen
knowing the risk, the risk was written down, and the risk landed.

Where it leaks:

- **The offer sits below 115 cards.** `<p class="outro">` at `pages.js:321` is
  the only place the home page mentions upload. Someone arriving from Google
  Images never scrolls there.
- **The nav says `Restore`**, which reads as a section of the collection.
- **`TS·––––`** (`record.js:22`, shown at `intake.js:141`) is an accession
  number in the same format the collection's own works carry — `TS·0205`. On an
  empty upload page it reads as a slot waiting for one of *our* works. Charlie
  read it exactly that way.
- **The empty plate is silent.** `.record--plate .record__image`
  (`styles.css:338`) is the largest element on `/restore` and its only label is
  an invisible `aria-label="Choose an image"`.
- **The wallpaper feature is labelled in ratios.** The `Crop to phone` checkbox
  in `intakePage` is the thing that makes a wallpaper, and its fine print reads
  `9 : 19.5, centred`.

## Decided

The frame: stop naming the operation, name the visitor's situation. They don't
know they want upscaling. They know they saved a picture and it looks bad on
their screen. That sentence already exists on the site, once, buried after a
download — `pages.js:682`, "Have one that's too small to use?"

| Where | Now | Becomes |
|---|---|---|
| nav (`pages.js:95-96`) | `Restore` | `Make your own` |
| home, above the grid | — | `Saved a picture that's too small for your screen? Make it a wallpaper →` |
| home (`pages.js:321`) | `.outro` restore link | removed, the line above replaces it |
| `/restore` h1 | `Restore an image` | `Make your own wallpaper` |
| `/restore` terms | `Up to 4× the size, or straight to 2K and 4K` | `Your picture, enlarged up to 4× — big enough for a 1440 × 3120 phone or a 3840 × 2160 screen.` |
| empty plate | *(nothing visible)* | `Drop your picture here` / `JPG, PNG or WebP, up to 10 MB` |
| first button | `Choose an image` | `Choose my picture` |
| second button | `Restore` | `Enlarge to 2880 × 3840` |
| crop checkbox | `Crop to phone` / `9 : 19.5, centred` | `Fit my phone screen` / `1440 × 3120, centred` |
| `<meta description>` (`pages.js:25`) | `4K desktop at 3840 × 2160` | removed — see below |

`Make your own` only works as a nav item because it sits next to `Collection`.
The contrast does the explaining: the collection is ours, this makes yours.

**"my" and "picture" are load-bearing.** "My" is what separates the visitor's
file from the gallery's images — the confusion Charlie hit. "Picture" is the
word for a thing you saved off Pinterest; the site says "image" everywhere else
and keeps saying it in `<title>` and `<meta>`, which are indexed. Button labels
are not indexed. The split is the two jobs, not an inconsistency.

The crop checkbox stays **unchecked**. The reasoning already in `intakePage`
holds — returning someone's image altered without asking substitutes the site's
taste for theirs. It only needed to be legible.

## Rejected, and why

**Replacing "Restore" everywhere.** `Restored 5.2× from 750 × 741` stays on work
pages (`pages.js:610`). That is the one place on the site where the word is
shown in action rather than assumed, so it reads correctly there. Everything
*clickable* gets the plain word; the museum voice keeps the one line that earns
it.

**"background" over "wallpaper".** Checked against
`2026-08-16-keyword-research-naming.md:47`, which is titled *«wallpaper»
побеждает «background»*: `phone wallpaper` 12.1 vs `phone background` 10.6, and
`iphone wallpaper` 28.9 over both. The raw `background` 75.8 vs `wallpaper` 51.0
comparison in that same doc is explicitly marked unreliable — both words are
ambiguous (background check, wall coverings) and the ambiguity only clears once
a device qualifies them.

The Pinterest half is the part that survives (`2026-08-16-HANDOVER.md:89`):
Pinterest's taxonomy is "backgrounds", Google's is "wallpaper". So "background"
only in a line deliberately speaking Pinterest.

Left on the table: `iphone wallpaper` is **2.4×** `phone wallpaper`. The slugs
already use it (`…-forest-iphone-wallpaper`) while the titles say "phone
wallpaper". Not resolved here.

**Desktop in the visible copy.** All 115 shown works have a 16:9 crop —
`CROP_KINDS = ['phone', 'tall', 'wide']` (`gallery.js:215`), verified against
`images/crops`. The claim would be *true*. But `gallery.js:205` says why it is
invisible — «wide — 16:9, рабочий стол; лежит молча, спросят — есть» — and it
surfaces only in `alternates` on a work page. Someone arriving on "4k desktop
wallpaper" would land on a grid of phone crops and bounce, which is a worse
signal than not ranking.

Hence the `<meta description>` fix: it currently promises "4K desktop at
3840 × 2160" to the SERP, and that one **is** indexed.

**Changing `<h1>The collection</h1>`.** Considered at length, dropped. Three
arguments against, in order of weight:

1. The `<title>` already carries the search terms. The `<h1>` is a real but
   minor signal, and the home page is not where traffic arrives — Google Images
   → a work page is, and those have 115 titles and alt texts doing that job.
2. `.heading` is 11px, uppercase, `--fg-dim` (`styles.css:98-105`). It is an
   eyebrow, not a headline. It was never going to sell anything to a human, so
   it is low-value in both directions.
3. Keyword-shaped labels are the wallpaper-farm register, which repels the
   audience. Keywords belong in `<title>`; the visible page is identity.

Candidates that all read as trash in an 11px uppercase slot, recorded so they
are not proposed again: `Wallpapers at full resolution`, `Phone and desktop
wallpapers`, `Phone wallpapers from paintings`, `Paintings, cropped for a
phone`, `Paintings from open collections`, `Free wallpapers for phone and 4K
desktop`.

**"no sign-up" on the page.** Stays where it is, in `<meta description>`. It is
not a query anyone types, so it earns nothing from search — but in the SERP
snippet it is a real differentiator against sites that gate downloads at the
moment someone is choosing between blue links. Above the grid it would answer a
worry the visitor does not have yet. If a line ever needs the keyword, the
corpus says `download` (233 occurrences, `wallpaper download` 12.3), not
"no sign-up".

## Two things the build turned up

**The button verb cannot be a constant.** `Enlarge to 3072 × 4096` is a claim,
and `targetLongestSideFor` (`server.js:205-209`) has no floor under `2K`/`4K` —
they are absolute targets. A 3000 × 4000 source sent to 2K comes back at
1536 × 2048, i.e. **smaller**. A fixed "Enlarge" would have printed a falsehood
next to the number that disproves it. The verb is now derived from the
direction, and reads `Resize` in that one case. The vague old `Restore` could
not be wrong this way; that is the cost of a label that says something.

**The plate prompt does not fit a phone.** Measured, not guessed: the opening is
`min(46vh, 380px)` tall by `780 / 1690`, which is **164 px** wide on a 390 × 844
screen and **131 px** on a 390 × 667 one. `Drop your picture here` plus the file
line broke into five or six stub lines there — worse than the silence it
replaced. Under 860 px the prompt drops to two words, and they are different
words: `Tap to choose`. "Drop" is an instruction a touch screen cannot carry
out. The file requirements are not repeated in the opening because they already
sit under the button, where there is width for them.

## The pitch line became a frame

22 August. The sentence shipped, was looked at, and was wrong — first left, then
right-aligned, and still off. Charlie: *"still looks a bit off on our minimalist
gallery"*.

The diagnosis was not the alignment. The page has no sentences in it. Every
other piece of text is an 11–15px label — an accession number, a pair of
dimensions, a painter's name — and the hierarchy is built from lightness alone
(`styles.css`, opening comment). A two-line sentence at 15px in full `--fg` was
by construction the loudest thing above the grid, so it read as a banner in a
room designed not to have one. Right-aligning it made it tidier, not quieter.

It is now a card: one empty frame among the hundred and fifteen full ones, first
in the grid, built from the same mount, opening and label the site already
draws.

```
[ Make your own ]     ← inside the opening, where the painting would be
Your picture          ← where a painting's name goes
                      ← the byline slot, empty, holding the row
Up to 4× bigger       ← where the dimensions go
Start →               ← where Download goes
```

Nothing is asserted and nothing is louder than anything else. The frame explains
itself by standing in a row of frames that are occupied.

Details that mattered:

- **The opening is `--ground`, not `--card`.** `.collection .record__image`
  fills an empty opening with the light `--card`, but that is the placeholder
  for an image still loading; on a permanently empty frame it would have read as
  a card that failed to load, not as a frame with nothing in it.
- **Ratio is pinned to 9:16**, the same crop `tile(item)` gives every neighbour.
  Verified in the browser: openings and spec lines align to the pixel across the
  first row.
- **`fetchpriority="high"` still goes to the first painting**, not the frame —
  the frame has no image, so `eager`/`priority` indexing is untouched.
- **The label is dimmed** (`--fg-dim` on the title). A work that does not exist
  yet should not outshout the ones that do.
- **The words inside the opening must contain a verb.** The bare frame reads
  correctly but not immediately: a scanning eye sees a dark rectangle and learns
  it is an invitation only on reaching the label. `Yours here` was tried and
  failed for a different reason — Charlie read it as a promise to exhibit what
  he sent. An empty frame in a row of full ones means "something will hang
  here", so any *noun* inside it names the thing that will hang, and publishing
  visitors' files is exactly what `LEGAL.md` says never happens. Same class of
  error as `TS·––––` on the intake page, pointing the other way: there a guest
  concluded he should upload one of ours, here that his would join ours.

  `Make your own` names an action, and the slot stops reading as a vacancy. The
  words repeat the nav item on purpose — both lead to the same place. Measured
  at 72 px (the replacement is wider but still one line) against the 126 px
  opening of the narrow `minmax(140px, 1fr)` column.
- **The opening is `aria-hidden`.** The same words sit below in the label, and a
  screen reader that read both would announce two works instead of one. The
  browser's own underline had to be cleared too — it never showed while the
  anchor held nothing but an image.

Rejected alongside it: saying it in the heading's own register (11px dim
`MAKE YOUR OWN →` opposite `THE COLLECTION`) — quiet enough, but a third
printing of the same three words after the nav; and dropping the line entirely
to let the nav carry it, which gives up the above-the-fold explanation that was
the point.

## Open

- `iphone` vs `phone` across titles and slugs, given 28.9 vs 12.1.
- Whether `.heading` should stop being an eyebrow at all. That is a design
  change and would reopen the `<h1>` question on different terms.
- `TS·––––` still appears once a file is chosen, before it is processed. In that
  state it is defensible — the picture is on screen and the number is genuinely
  pending — but it is set in `clamp(23px, 3vw, 28px)` and is the largest thing
  on the label. Not looked at closely; only the empty state was in scope.
