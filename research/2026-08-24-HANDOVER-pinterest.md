# Handover — Pinterest. 24 August 2026

Started from one question: pasting a `/w/` address into Pinterest answers
**«no suitable images»**. It ended with a button shipped, a domain half-claimed,
and two things still unexplained. Three of my theories died on the way; §6 lists
them so nobody spends the afternoon re-deriving them.

---

## 1. What is settled

**The pages are fine.** This was measured twice, not argued.

Pinterest's own filter was read out of `assets.pinterest.com/js/pinmarklet.js`.
A picture is thrown out when:

| rule | our worst case |
| --- | --- |
| `width < 90 \|\| height < 90` | 168 × 94 — passes |
| `width < 120 && height < 120` | passes |
| `width > 3 × height` | tallest is 9:19.5 — passes |
| `src` does not start with `http` | DOM `src` is always absolute — passes |

Run against the live work page: **14 of 15 pictures pass**. The one that fails is
the empty lightbox `<img>`, which is meant to be empty.

An outside fetch (Anthropic's datacenter, not this machine) reaches the site and
finds 12 image addresses. So the server is reachable and the markup is legible.

**The old endpoint works.** `pinterest.com/pin/create/button/?url=…` opens the
board picker on our pages with the picture already chosen. Only the newer
«Create Pin» builder, where a person pastes an address by hand, fails.

**And the builder is not broken in general.** Charlie pasted a Wikipedia address
into the same builder and it worked. That kills the comfortable explanation.
Whatever is wrong is specific to this domain.

## 2. What shipped today

Deployed, live, verified by `curl` against production:

- **«Pinterest» button on the work page**, beside Download. `savePin` in
  `pages.js` builds the old-endpoint address out of `slug`, the offered file and
  `alt`; `.btn--pin` in `styles.css` carries the size and the wrap.
- **`data-pin-media` / `data-pin-url`** on the plate, so a save takes the 4K file
  and not a copy out of `srcset`.
- **`<meta name="p:domain_verify">`** in the head of every page.

Two things of Charlie's rode along in the same deploy, both finished and both
passing `yarn verify`: the **Ctrl-V paste** on the intake (`public/intake.js`
plus the «Drop or paste» wording) and the **`titleParts`** split for museum
titles carrying two em-dashes.

`.env` got `SITE_ORIGIN=http://127.0.0.1:3000` for local work. It does not
deploy — `.env` is deliberately outside the rsync list.

### The button's shape

Download stays the filled button, Pinterest is the outlined one. No red, no
logo: the page is set as a museum label and a brand badge reads as an
advertisement in it. Measured, because both facts bit once:

- the label column lives between 280 and 380 px, and two buttons in a row want
  369 — so `.actions` wraps and Pinterest drops to full width below ~340;
- «PINTEREST» is a longer word than «DOWNLOAD», and at equal padding the
  secondary action came out **wider** than the primary (188 against 175).
  `12rem` padding puts it back: 185 and 177.

## 3. The domain is claimed only halfway

Pinterest settings → «Link to Pinterest» → Websites showed **nothing claimed**.
The claim dialog was opened and the token is now live in the head:

```html
<meta name="p:domain_verify" content="5d9476762f106685e0d233dc317fb09b" />
```

The token is **per account, not per site** — the same one was offered for
`semanticmatch.me`, which is what that dialog pre-fills instead of ours.

**Nobody has pressed «Claim your website» yet.** That is the next action, and it
had to wait for the tag to be live. Removing the tag later un-claims the domain,
which is why the reason sits next to it in `pages.js` instead of a bare hash.

Whether claiming fixes the builder is **a guess, not a finding**. It is the best
explanation left for a domain-specific failure — new domain, nothing ever pinned
from it, no crawler hits in the Traefik log — but it has not been tested.

## 4. Two things are wrong and unexplained

**The pin title is blank.** `og:title` is present and correct on the live page,
so the tag is not the problem. Pinterest only reads page metadata into a pin when
**Rich Pins** are switched on, and those must be applied for. Underneath that
sits a second wall: Rich Pins come in three kinds — Article, Product, Recipe —
and our pages declare `og:type="website"`, which is none of them.

My advice is to leave it. Calling a wallpaper page an Article to satisfy a schema
describes the page as something it is not, and buys one line of text on a pin
whose whole job is being a picture.

**The description may not be landing either, and this one matters.** Charlie
reported back «no description went in». If the `description` parameter is being
ignored, that is unexplained — it is documented, it is spelled correctly in the
markup, and it is the field Pinterest actually searches.

> **Read this before acting on it.** That sentence can be read two ways —
> «no, [the] description went in» or «no description went in». I did not get it
> clarified. Check a real pin before chasing a bug that may not exist.

## 5. What was added to TODO.md

| line | task |
| --- | --- |
| 533 | give `pin` its own text — `alt` is written for a screen reader, and Pinterest shows the first 75–100 characters of it in a grid |
| 546 | the button on the index card too — the material is there, the place for it is the open question |
| 734 | hold a finished intake picture for a few days, then delete it — see below |

The third one rests on a fact worth keeping: **Pinterest copies the picture into
its own CDN when the pin is saved.** That is why deleting a work does not remove
the pin — only the link through to us breaks. So a shared intake result needs
hosting *once*, not forever: put it down, hand over the address, delete it. The
pin survives.

Two costs are named there and neither is optional: the cleanup has to actually
exist (last time it did not, which is why `finishedImage` writes nothing to disk
today), and `LEGAL.md` rests its «no platform mechanisms needed» argument on
there being no uploaded file here at all. One file on disk ends that.

## 6. Theories that died

Recorded so they are not re-derived:

1. **Relative `src` in the markup.** Pinterest's code does reject sources that do
   not begin with `http`, and every `<img>` on the page was a root path. Absolute
   addresses were shipped; nothing changed. **Reverted.** The `.env` line in §2 is
   the only trace left.
2. **~40 MB of pictures per page timing out the scraper.** Every `src` points at
   a full-size file, 0.5–7.5 MB each. Plausible, **never tested**, and overtaken
   by §1 — the same pages scrape fine through the old endpoint.
3. **«The builder is broken for everyone.»** Disproved by Wikipedia (§1).

One measurement from the first of those is worth keeping anyway: because of
`srcset`, `naturalWidth` comes back **density-corrected**. Anything reading the
DOM sees our 4K plate as 353 × 627. It passes Pinterest's floor comfortably, but
any tool that ranks by size sees this collection as small.

## 7. Next actions, in order

1. Press **«Claim your website»** in the open Pinterest settings tab.
2. Paste a `/w/` address into the Create Pin builder again. Works → §3 was right
   and the case closes. Still «no suitable images» → the third theory is dead too
   and this is worth handing to Pinterest support rather than guessing a fourth.
3. Check a real saved pin for the description (§4) before treating it as a bug.
4. Leave Rich Pins alone unless the blank title starts to matter.

Unrelated, noticed in passing: Pinterest settings carries the error *«We no
longer have access to @42charlie2»* — the Instagram link has dropped. Untouched.

Also: the `node --watch server.js` on this machine is running but holding no
port. It needs a restart before `:3000` answers again.
