---
name: post-next-wallpaper
description: Use when Charlie asks to post the next wallpaper (or "today's post") to Tumblr and/or Pinterest — picks the next un-posted gallery work, uploads a correctly-sized image, writes the caption/pin per the house style, and records it in research/social-posts.json.
---

# Post the next wallpaper to Tumblr / Pinterest

Posts **one** work per platform per invocation — this is a slow, one-a-day
drip, not a bulk upload. Never post more than one per platform in a single run
unless Charlie explicitly asks for more.

**It already runs on a schedule:** crontab fires `cron.sh` (next to this
file) at 02:00 Paris time, Monday to Friday, and the script then waits a
random 0–3 hours, so posts land between 20:00 and 23:00 New York — US evening,
when Tumblr's and Pinterest's feeds are busiest. Since 23.10.2026 one
Tumblr post in three goes out at 11:00–11:30 Berlin instead: on those days
(picked by the date in `cron.sh`) the night run posts Pinterest only and a
second crontab line, `cron.sh morning`, posts Tumblr. Output goes to `.social-post.log` in the repo root. So before a manual
run, check `social-posts.json` for an entry dated today. `DRY_RUN=1 cron.sh`
picks the next works without posting.

## 0. Refresh the Tumblr-sized copies

Another session may have rebaked plates since last time, so regenerate before
picking anything:

```
cd /home/charlie/repos/Upscaler && node scripts/for-tumblr.mjs
```

This (re)writes `images/for-tumblr/<ref>-<slug>.jpg` (900px wide, aspect
preserved) for every **non-hidden** catalogue work, using each work's
**whole painting as scanned**: the `scan` plate when the work has one (i.e.
`treatment` is `dim` or `ceil`), the plate itself for `treatment: "none"`,
whose plate is the scan. Not the phone crop and not the dimmed file: since
25.09.2026 Tumblr shows the painting, and the crops live on the work page.
It also writes `images/for-tumblr/index.json` (title, alt, tags, provenance,
tessarum URL per ref, plus `full` and `more` for the caption's two links,
see §3 step 3). It's deliberately undersized: big enough to look sharp
on a Tumblr dash card, short of an actual wallpaper, so a viewer who wants
the real file has to click through to the work page.
Pinterest posts use the full-size, **treated** `crops.phone` file instead
(see §4) — Tumblr shows the painting, Pinterest keeps matching what the
gallery ships.

## 1. Read what's already posted

`research/social-posts.json` has `tumblr: []` and `pinterest: []` arrays,
each entry `{ ref, slug, postedAt, ... }`. Read it before picking anything.

Known gaps in that file, from before it existed — don't let its absence of a
ref be read as "definitely unposted":
- **Tumblr** (`tessarum-blog`, blog URL `https://tessarum-blog.tumblr.com/`):
  vl-0083 (Egypt and Nubia) was posted before this tracker, at full plate
  size (the 900px-wide copy is the rule now, the landscape aspect is fine).
- **Pinterest** (account `oninfrared`, display name `grtnwdrknss`, profile
  `https://www.pinterest.com/oninfrared/`): the "Created" tab already held
  several tessarum pins before this tracker (at least vl-0067 "An Aqueduct
  Near a Fortress", a Hammershøi interior, a Kawanabe Fuji piece, a
  waterfall painting), mixed in with unrelated personal pins, made in the
  old style (title carrying "4K · W×H", description carrying "no sign-up").
  Not fully catalogued by ref. **Before picking a Pinterest work, check the
  live Created tab** (screenshot or `find`) as well as the JSON, so you don't
  duplicate one of these.

Every entry carries `crop` and `edit` (see §3 step 6, §4 step 10). Tumblr
history, filled in afterwards from dates and git: 12.09 whole plate, dimmed
(Charlie's eye); 13–18.09 phone crop, gallery's treated file; 21–25.09
phone crop, scan; from 26.09 whole painting, scan.

## 2. Pick the next work

Read `images/for-tumblr/index.json` — it's already in the site's shuffled
display order (`catalogue/order.json`), filtered to non-hidden works. Walk it
in order and pick the first `ref` that:
- has no entry in `social-posts.json`'s array for the platform you're
  posting to, **and**
- (Pinterest only) doesn't visibly already exist on the live Created tab.

On Tumblr a painting can also sit in a group post's `refs` (§3a). That
alone doesn't make it posted: take it if today's post would be a crop post
(§3: crop under 50%, or a scroll) and the group went out at least 14 days
ago. Otherwise skip it. A group painting never gets a plain single post:
two posts of the same whole painting are a repeat.

Don't hand-pick for "quality" — the point is steady, unglamorous coverage of
the whole gallery. Only skip a work if it's clearly unusable (e.g. missing
file).

## 3. Tumblr

Tumblr always gets the **whole scanned painting** (§0) — don't substitute
the phone crop or the gallery's dimmed version.

**When the crop is a real close-up, it goes above the painting (14.10.2026).**
How much of the painting the `tall` crop (9:16) shows is `tall[0].shows` in
`index.json` (crop area over scan area, written by
`scripts/for-tumblr.mjs`).

- **Under 50%:** post the `tall` crop(s) first, the whole painting last,
  each in its own photo block so they stack vertically.
- **50% or more:** whole painting only, as before. Charlie looked at Kalf's
  nautilus still life (66%) next to its crop and called them "too similar".
- **Narrower than 9:16** (`width / height < 0.5625`, the hanging scrolls,
  18 works on 14.10.2026): the `tall` crop **only**, no painting, whatever
  the percentage. Tumblr caps a picture's height at about 1700 px, so a
  3.5:1 scroll is served 471 px wide and stretched to the 540 px column:
  visibly soft (Maple Viewing, 14.10.2026). The whole scroll stays one
  click away behind `full size` in the caption.

The line sits in a natural gap. Of the 158 works in `index.json` on
14.10.2026, 77 are under 50%, 80 are at 60% or more, and one is in between.
Sunlight and Shadow (25%) and Before a Thunderstorm (40%) were the test
drafts he liked.

Use the `tall` crop, never `phone` (19.5:9): Charlie finds that one too
long for Tumblr. Upload `images/for-tumblr/<tall[i].file>`: the scan's crop at
900 px wide, like the painting. Not the full-size file in `images/crops/`:
Charlie wants every Tumblr picture good on the dash but slightly too small
to use as a wallpaper, so the real one is a click away (14.10.2026).

**Several saved crops.** Some works have more than one recorded crop
position (`research/to-crop-positions.md`, all kept on purpose, see its
header). Since 14.10.2026 the generator cuts them too (`variants` in
`wallpaper-gen/museum-works.json` and in the manifest, files
`…-tall-2-…`, `…-tall-3-…`), and `scripts/for-tumblr.mjs` lists them in
`tall`, which is a list: the main crop first, then the others that pass
the similarity rule. Post every crop in `tall`, in that order, then the
painting.

The rule (`SIMILAR_MAX` in the script): a crop is left out when it shares
**more than 45%** of its area with one already taken. Charlie set 45% on
14.10.2026 after looking at the pairs side by side: Morland's 62% were too
alike, and he moved the line down from a first 55%. On that day 16 works
have two crops (vl-0240 three); vl-0291, vl-0359, vl-0473 and vl-0475 lose
their second, Morland and Landscape Near Paris their third.

1. Open `https://www.tumblr.com/new/photo` in Chrome (logged-in session,
   blog `tessarum-blog` is the default target — confirm the composer header
   says `tessarum-blog`, not the personal account).
2. Upload the pictures, one photo block each, in the order above:
   - **painting only:** `images/for-tumblr/<file>` into the composer's
     first file input;
   - **crops, then painting:** each `images/for-tumblr/<tall[i].file>` in
     its own block, then the painting in a new block of its own, last.
     The painting never goes into the first input here: it would land
     above the crops;
   - **scroll:** the crops alone, each in its own block, no painting.

   The first picture goes into the composer's first file input. For each
   next one, click the empty line under the last image, then click
   `[aria-label="Add photo"]` with `javascript_tool` (calling `.click()`
   from a script opens no system file window; it adds an "Upload images"
   block), then `find` its file input and `file_upload` into it. Several
   files in one input land side by side in one row; one per block stacks
   them.

   Upload with `file_upload` straight from the repo path. If the tool refuses the path, copy the file
   into the session's scratchpad directory and upload it from there; `/tmp`
   paths outside the scratchpad are refused too. In the nightly run
   `$SCRATCHPAD` is not set and the repo path works (two test runs,
   10.10.2026).
3. Caption: one block of four lines, then a gap, then `more`. Two links,
   both lowercase:
   ```
   **Mount Vesuvius at Midnight**
   Albert Bierstadt, 1868
   Oil on canvas
   full size, 4780 × 3366

   more
   ```
   Title is `provenance.work` in bold (`ctrl+b` before typing, `ctrl+b`
   again after). Second line `${provenance.creator}, ${provenance.date}`;
   drop the year if there's no `date`. Third line is the medium, capitalised
   as a sentence ("Oil on canvas", "Ink and color on silk"). No museum name.
   The catalogue doesn't store the medium, so look it up for this one work
   from the source in `provenance.page`, open API first (Cleveland:
   `https://openaccess-api.clevelandart.org/api/artworks/<accession>` →
   `technique`; Wikimedia Commons: the file page's "Medium" row, and when
   the wikitext leaves it empty but names a `wikidata` id, that item's P186;
   SMK: `https://api.smk.dk/api/v1/art?object_number=<nr>` → `techniques`).
   One request, human pace (AGENTS.md, «Музеи и чужие сайты»). If it isn't
   stated, leave the line out rather than guess.

   Fourth line is `full size, ${full.width} × ${full.height}` from the
   work's `full` in `index.json` (the `×` sign, not the letter x), linked to
   `${url}?source=tumblr`, the painting's page. Don't work the numbers out
   yourself: they are the scan's size from the manifest. When `full` is
   `null` the site's file is barely bigger than the Tumblr copy, so leave
   the line out; the post then has only `more`.

   `more` is linked to `${more}?source=tumblr`. `index.json` has already
   chosen the page (`scripts/for-tumblr.mjs`): the painter's own page when
   it holds three works or more, otherwise a collection (tradition, then
   subject, then mood), otherwise the homepage. Use it as given, don't pick
   another. It says "more" and not the page's name on purpose (10.10.2026):
   Charlie clicked a bare "more" on someone else's post and wouldn't have
   clicked "Dark academia collection".

   The `?source=` tag is how `yarn stats` counts visits from the Tumblr
   app, which sends no referrer; don't drop it from either link.

   Typing. Lines inside the block are soft breaks: type the title,
   `Return`, then on each following line go `Home`, `BackSpace`,
   `shift+Return` so the four sit together; one plain `Return` before `more`
   gives the gap.

   Linking `more`: it is a paragraph of its own, so with the cursor in it
   press `Home`, then `shift+End`. Linking `full size, …`: it is the last
   line of a soft-broken block, and there `Home` can jump to the start of
   the whole block, which puts the link on all four lines (Sonnet's test
   run, 10.10.2026). So right after typing the line, select it backwards
   by its own length: `shift+Left` repeated once per character (22 for
   `full size, 5632 × 3840`). Either way, before opening the link box read
   `getSelection().toString()` with `javascript_tool` and go on only when
   it is exactly the line's text.

   Then press **`ctrl+k`** as a key press of its own: sent in the same call
   as the selection keys the box doesn't open, and the address you type
   replaces the line and turns into a link card. A `https://` input appears
   (it can render over the line above, but it's the text-link box); if it
   doesn't, click the chain icon in the small toolbar over the selection.
   Type the address and press Return. Don't click on a finished link to
   move the cursor, it opens the page; click to the right of the line.

   Verify with `javascript_tool` before posting, don't trust the screenshot
   alone: the composer has exactly these `<a>` elements, `full size, …`
   with the painting's address and `more` with the `more` address, both
   ending `?source=tumblr`, and no link card block.
4. Tags: `#add tags` field, comma-separated, no `#` prefix needed when
   typing (Tumblr adds it). Reuse a consistent core — `painting`, `art`,
   `art history`, `phone wallpaper`, `tessarum` — plus `dark academia` on **most**
   works: skip it only for plainly bright, cheerful pieces (sunny florals,
   light illustrations). Plus the medium in lower case when step 3 found
   one (`oil on canvas`, `watercolor`), plus 1–2 tags fitting *this* work's
   own `tags`/`alt` mood (`landscape painting`, `still life`, `japanese art`,
   `volcano`, whatever actually fits), plus **one niche, low-competition
   tag** most posts should carry — check candidates first by visiting
   `https://www.tumblr.com/tagged/<tag>` and reading what's already there:
   an empty or off-topic result is the niche opportunity Charlie wants
   (e.g. the specific painter's name, when nothing's posted under it yet).
   Skip a tag if the existing tagged content is unrelated to what a
   wallpaper searcher wants.

   Plus **every collection the work is in**, with its synonyms. Membership
   is the `refs` list of each entry in `COLLECTIONS` (`collections.js`):
   ```bash
   node --input-type=module -e 'import { COLLECTIONS } from "./collections.js";
   console.log(COLLECTIONS.filter(c => c.refs.includes("<ref>")).map(c => c.slug))'
   ```
   Tag the first column of this list as written, then its synonyms. Not
   the collection's `name`: `Landscape`, `Flowers`, `Ocean` would make the
   bare `landscape`, `flowers`, `ocean`, tags full of photographs, while
   a wallpaper searcher types `landscape painting`. Skip a tag the mood/subject
   step above already added. The list was drafted 14.10.2026 and not yet
   checked on Tumblr: the first time a synonym is used, open its
   `tagged/` page as above, and drop it from the list here if what's there
   is off-topic.

   | collection | synonyms |
   |---|---|
   | hudson river school | american romanticism, american landscape |
   | nihonga | japanese painting, japanese art |
   | dutch golden age | dutch painting, baroque |
   | landscape painting | |
   | flower painting | |
   | still life painting | still life |
   | ocean painting | seascape, marine painting |
   | moody landscape | moody aesthetic |
   | dark academia | |
   | dark floral | dark botanical |
   | cottagecore | cottage aesthetic |

   Charlie added `american romanticism` by hand to the 14.10 Bierstadt
   post, which missed `hudson river school` and `moody landscape`: that
   is where this rule comes from.
5. Click **Post now**. Confirm with a screenshot that it says "Posted to
   tessarum-blog", then verify on `https://www.tumblr.com/tessarum-blog` that
   the last picture is the one this section puts last: the whole painting,
   or for a scroll its last crop. If a picture that should be the whole
   painting shows a tall crop, the copies weren't refreshed — stop and
   check. Not the public
   `tessarum-blog.tumblr.com`: it runs a browser check that the automated
   Chrome fails, then answers "Rate limit exceeded" after a handful of page
   loads (30.09 and twice on 02.10). If the in-app view blocks too, stop and
   say so rather than retry.
6. Append to `research/social-posts.json`'s `tumblr` array: `ref`, `slug`,
   `postedAt` (today, ISO date), `file`, `crop`, `edit`, `medium` (or
   `null`), `tags`, and `more` (the address behind "more", without the
   `?source=` tag; posts before 10.10.2026 had one link, to the painting,
   and carry no `more`). `crop` is what part of the painting went up: `"whole"`
   for the painting alone, `"tall+whole"` for crop then painting (from
   14.10.2026; with several variants `"tall:v1,v2+whole"`), `"tall"` (or
   `"tall:v1,v2"`) for a scroll's crops alone, `"phone"` for the phone crop
   (13–25.09). `edit` is which version: `"scan"` now,
   or `"dim"` / `"ceil"` for the gallery's treated file. The `for-tumblr`
   file name is the same whichever it holds and gets rebuilt, so these two
   fields are the only record of what a post actually showed (§1).

## 3a. Tumblr group posts (2–3 paintings by one painter)

Charlie's call, 14.10.2026, after previews of school groups (rejected:
"doesn't super work") and Tumblr drafts of Kalf as three and as two:
occasionally a post shows **two or three paintings by the same painter**.
Three when the painter has them, two otherwise. He weighed running out of
paintings faster against the look and chose three: once a week is slow
enough, and new works keep arriving.

**When.** If none of the last six `tumblr` entries is a group, today is a
group day, and it replaces the single post. One post a day either way.
When no lead qualifies (below), post the single as usual; tomorrow is a
group day again. Don't loosen the shape rule or reuse a painter to make
one.

**Which ones.** Walk `index.json` in order, as in §2. The lead is the
first work with at least one partner: another work by the same
`provenance.creator` (skip `creatorKind: "unknown"`, anonymous and
"after …" copies), of the same orientation (all upright or all wide) and
a similar shape (aspect ratio within 25% of the lead's). Take the lead and
the next one or two partners in `index.json` order. Each painting must be
one of:

- **not posted yet.**
- **a crop post's painting**: posted as `tall+whole` (crop over painting,
  §3), at least 14 days ago. That post showed a close-up first, so a group
  with its whole painting is a different enough post.

So a painting gets at most two posts on Tumblr, a crop post and a group,
14 days apart in either order (§2 says when a group painting gets its crop
post). A painting that went out as a plain single post (`crop: "whole"`)
is **never** in a group, and a group painting never gets one: two posts of
the same whole painting are a repeat. Scrolls (§3) stay out of groups: the
whole scroll is soft at full column width, and worse beside another.

**How often per painter.** One group per painter. A second one later only
if the painter has more than three works in `index.json` (Kalf, Ottesen,
Hammershøi, Bertin, Cole…), and not in back-to-back group weeks.

**Layout.** Three at most. Wide and upright end up about the same length:
three wide stacked is roughly what three upright take as 2 + 1.
- **Upright:** all files into one file input. Two land side by side in one
  row; with three, Tumblr puts the first two in a row and the third full
  width below (the Kalf test). Upload the lead last, so it gets the big
  spot.
- **Wide:** one block each (§3 step 2), so they stack. Wide paintings
  uploaded together land in one row instead, at 268 px each for two (the
  Kensett test, 14.10.2026): too small. Tumblr won't stack them by itself.

**Caption.** First line bold `Two by <painter>` or `Three by <painter>`,
then one line per painting, `<title>, <date> · full size`, with
`full size` linked to that painting's `url` plus `?source=tumblr` (no
dimensions, they'd crowd the line). A gap, then `more` with
`?source=tumblr`. Files: each painting's `images/for-tumblr/<file>`, 900 px
wide, same as single posts.

`more` must lead to **more than the post already shows**. Don't copy the
lead's `more` from `index.json` blindly: it points to the painter's page
when that page holds 3 works (`MORE_MIN_WORKS` in
`scripts/for-tumblr.mjs`), which is 2 new paintings behind a single post
but 1 or none behind a group. Same standard as the single post, so: the
painter's page (`/artists/<slug>`) only if it holds **at least two works
that aren't in the post** (4+ for two, 5+ for three). Otherwise the
collection `morePath` would pick (tradition, then subject, then mood,
smallest first) that holds the lead, again with at least two works not in
the post; otherwise the homepage. Count the way the script does, with
`artistPageOf` and `found.collections` from `browse.js`.

**Tags:** the §3 step 4 core, the painter's name, and the collection tags
of every painting in the post (deduplicated).

**Record.** One entry: `refs: [<lead>, …]`, `slugs`, `crop: "group"`,
`edit: "scan"`, plus `postedAt`, `tags`, `more` as in §3 step 6.

## 4. Pinterest

Pinterest gets the **full-size** `crops.phone` file, not the undersized
Tumblr copy — look it up in `images/manifest/*.json` by ref
(`entry.crops.phone.file`, under `images/`) and copy that into the
scratchpad for upload.

1. Open `https://www.pinterest.com/pin-creation-tool/` (logged in as
   `oninfrared`). Wait for the form to render — it loads blank for a moment.
2. Upload the full-size phone crop via the file input.
3. **Title** — this is what Pinterest search matches first and the builder
   leaves blank by default, so always fill it by hand: work title, artist if
   it reads naturally, "phone wallpaper", and — on **most** works —
   append "dark academia phone background" (this account's core aesthetic
   hook). Judge fit per work: skip that phrase for pieces that plainly
   aren't dark/moody (bright florals, cheerful illustrations, etc.) — use
   judgment, don't force it. **No em dashes in the Pinterest title** — use a
   comma instead. Example:
   `Landscape Near Paris, Georges Michel, dark academia phone wallpaper`.
4. **Description** — since 27.10.2026 the same text on every pin, word for
   word (Charlie's wording):

   ```
   Download free at full size at tessarum.com. 150+ more classical painting backgrounds.
   ```

   The first sentence is the reason to click: Pinterest shrinks the pin.
   "Backgrounds" is Pinterest's word for these, "wallpaper" is Google's.
   The number has to stay true: the site had 156 works on 27.10.2026, so
   raise it to 200+ only once the home page count passes 200. The upscaler
   line was tried and dropped to keep it short. Don't add the title, "no sign-up", "4K" or pixel sizes:
   "4k" draws a different crowd on Pinterest (research/2026-08-16-HANDOVER.md).
   Don't mention "dimmed", because the pin is already the dimmed file, and
   don't mention a desktop version, because the page doesn't have one.
5. **Link** — `https://tessarum.com/w/<slug>?source=pinterest`. The tag is
   how `yarn stats` counts visits from the Pinterest app, which sends no
   referrer; don't drop it.
6. **Board** — `Art` (the only board on this account so far). If Charlie has
   since made topic-specific boards (see `TODO.md`, the five-board plan),
   check the board picker and use the closer match instead.
7. Tagged topics: optional, and Pinterest's autocomplete here is a generic
   alphabetical list, not a real search — don't force a match, it's fine to
   leave at 0.
8. Click **Publish**. A "Get the Pinterest browser extension" modal often
   follows — close it, don't install anything.
9. Verify on `https://www.pinterest.com/oninfrared/` (Created tab, sorted
   newest-first) that the new pin is there.
10. Append to `research/social-posts.json`'s `pinterest` array: `ref`,
    `slug`, `postedAt`, `board`, `title`, `file` (the full-size path used),
    `crop: "phone"`, and `edit`: the rule in the file name (`-dim-phone-` →
    `"dim"`, `-ceil-phone-` → `"ceil"`, `-none-phone-` → `"scan"`).

## 5. Commit the record

Once the entries are written, commit `research/social-posts.json` on its
own, naming the path so nothing else in the index rides along (AGENTS.md:
never `git add -A`):

```bash
git commit research/social-posts.json -m "Пост: <ref> в Tumblr / Pinterest"
```

Don't push. Left uncommitted, the record piled up for days (16–19.10.2026)
and was the one dirty file in every `git status`.

## 6. Report back

Tell Charlie, briefly: which work got posted where, the title/caption used,
and anything that looked off (e.g. a board that no longer matches, a tag
that turned out to be crowded/irrelevant on inspection).
