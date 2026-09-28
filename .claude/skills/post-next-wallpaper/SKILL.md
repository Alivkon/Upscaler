---
name: post-next-wallpaper
description: Use when Charlie asks to post the next wallpaper (or "today's post") to Tumblr and/or Pinterest — picks the next un-posted gallery work, uploads a correctly-sized image, writes the caption/pin per the house style, and records it in research/social-posts.json.
---

# Post the next wallpaper to Tumblr / Pinterest

Posts **one** work per platform per invocation — this is a slow, one-a-day
drip, not a bulk upload. Never post more than one per platform in a single run
unless Charlie explicitly asks for more.

**It already runs on a schedule:** crontab fires `cron.sh` (next to this
file) at 03:07 Paris time, Monday to Friday — US evening, when Tumblr's feed is
busiest. Output goes to `.social-post.log` in the repo root. So before a manual
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
tessarum URL per ref). It's deliberately undersized: big enough to look sharp
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

Don't hand-pick for "quality" — the point is steady, unglamorous coverage of
the whole gallery. Only skip a work if it's clearly unusable (e.g. missing
file).

## 3. Tumblr

Tumblr always gets the **whole scanned painting** (§0) — don't substitute
the phone crop or the gallery's dimmed version.

1. Open `https://www.tumblr.com/new/photo` in Chrome (logged-in session,
   blog `tessarum-blog` is the default target — confirm the composer header
   says `tessarum-blog`, not the personal account).
2. Upload `images/for-tumblr/<ref>-<slug>.jpg`. The `file_upload` tool only
   accepts paths under the scratchpad or an already-shared folder — copy the
   file there first if needed:
   ```
   cp images/for-tumblr/<file> "$SCRATCHPAD/for-tumblr/<file>"
   ```
3. Caption: three short lines, plain text (not a link), then a blank line
   and the link:
   ```
   **Mount Vesuvius at Midnight**
   Albert Bierstadt, 1868
   Oil on canvas

   Tessarum
   ```
   Title is `provenance.work` in bold (`ctrl+b` before typing, `ctrl+b`
   again after). Second line `${provenance.creator}, ${provenance.date}`;
   drop the year if there's no `date`. Third line is the medium, capitalised
   as a sentence ("Oil on canvas", "Ink and color on silk"). No museum name.
   The catalogue doesn't store the medium, so look it up for this one work
   from the source in `provenance.page`, open API first (Cleveland:
   `https://openaccess-api.clevelandart.org/api/artworks/<accession>` →
   `technique`; Wikimedia Commons: the file page's "Medium" row; SMK:
   `https://api.smk.dk/api/v1/art?object_number=<nr>` → `techniques`). One
   request, human pace (AGENTS.md, «Музеи и чужие сайты»). If it isn't
   stated, leave the line out rather than guess.
   Lines inside the block are soft breaks: type the title, `Return`, then
   on each following line go `Home`, `BackSpace`, `shift+Return` so the
   three sit together; one plain `Return` before `Tessarum` gives the gap.
   Then double-click `Tessarum`, press **`ctrl+k`** — a `https://` input
   appears (it can render near the top of the image, but it's the text-link
   popup) — type `https://tessarum.com/w/<slug>?source=tumblr` and press
   Return. The `?source=` tag is how `yarn stats` counts visits from the
   Tumblr app, which sends no referrer; don't drop it. Verify with
   `javascript_tool` that the composer has exactly one `<a>` with text
   `Tessarum` and the right `href` before posting — don't trust the
   screenshot alone.
4. Tags: `#add tags` field, comma-separated, no `#` prefix needed when
   typing (Tumblr adds it). Reuse a consistent core — `painting`, `art`,
   `art history`, `phone wallpaper` — plus `dark academia` on **most**
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
5. Click **Post now**. Confirm with a screenshot that it says "Posted to
   tessarum-blog", then verify on `https://tessarum-blog.tumblr.com/` that
   the post shows the whole painting, not a tall phone crop (if it's the
   crop, the copies weren't refreshed — stop and check).
6. Append to `research/social-posts.json`'s `tumblr` array: `ref`, `slug`,
   `postedAt` (today, ISO date), `file`, `crop`, `edit`, `medium` (or
   `null`), `tags`. `crop` is what part of the painting went up: `"whole"`
   now, `"phone"` for the phone crop. `edit` is which version: `"scan"` now,
   or `"dim"` / `"ceil"` for the gallery's treated file. The `for-tumblr`
   file name is the same whichever it holds and gets rebuilt, so these two
   fields are the only record of what a post actually showed (§1).

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
4. **Description** — leave it **empty** by default. Never repeat the title
   in it. Never write "no sign-up" (the catalogue's own `pin` field says
   this — don't reuse that field's text verbatim here). Never mention
   resolution or "4K".
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

## 5. Report back

Tell Charlie, briefly: which work got posted where, the title/caption used,
and anything that looked off (e.g. a board that no longer matches, a tag
that turned out to be crowded/irrelevant on inspection).
