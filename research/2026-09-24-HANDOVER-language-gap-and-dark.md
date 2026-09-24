# Handover: visitors, indexing, the language gap and "dark". 24 September 2026

Research session, no code changed. Branch `browse-pages`, whose earlier uncommitted work
(DEPLOYMENT.md, browse.js, collections.js, limits.js, pages.js, server.js and others) was
already there when this session started and was not touched.

**Nothing from this session is committed.** New untracked files:

- `research/2026-09-24-language-gap.md` + `.html` (the write-up, in Russian, grown in
  sections through the session; read it top to bottom, later sections correct earlier ones)
- `research/2026-09-24-language-gap.json` (all raw data: autocomplete, page-one domains,
  Trends, Yandex, Wordstat, Keyword Planner)
- this file

`yarn verify` passes (research/ is in `.prettierignore`).

## 1. Log questions answered (no write-up, chat only)

- Search Console snapshot (`log/prod/search-console.json`, window 15–21.09): 1 impression,
  1 click. The click is in the journal: 21.09 23:26Z, visit `19ab087a`, US, Safari
  (accepts jxl+heic), came from www.google.com after browsing `/collection/nihonga` 7 min
  earlier with no referrer. The 5 of our pages at positions 1–5 mean a brand search.
  Charlie's own traffic looks like DE + Chrome on Linux, so this was judged a real person.
- 24.09 09:11Z, visit `199e2683`, SG, "from Google": a bot. One request, `?source=reddit`
  (our Reddit tag) with a Google referrer, no Accept-Language, no images, dest `none`.
- New subject collections (landscape-painting, flower-painting, still-life-painting,
  ocean-painting, live evening 23.09): in the sitemap; Yandex and Ahrefs fetched all four
  within hours; **Googlebot and Bingbot had not visited any of them** as of the 24.09 pull.
  Googlebot fetches 0–6 of our pages most days (23 on 14.09). Suggested to Charlie:
  Search Console, URL Inspection, "Request indexing" on the four. Not done by us.
- Yandex brings no visitors (0 referrals in the whole journal); its crawler is fast
  because it listens to IndexNow.

## 2. Language gap: the question and the answer

Charlie asked whether some language has demand for painting wallpapers but weak supply,
so a translated version (folder `/xx/` + `hreflang`, same domain; no separate domain
needed) would get cheap traffic.

**Answer: no language is worth translating now. The bigger opportunity is English
"dark".** Keyword Planner (all locations, Sept 2025 – Aug 2026, ranges):

- `dark phone wallpaper` 10k–100k; `dark art wallpaper` 1k–10k (3-month change +900%);
  `dark academia wallpaper`, `van gogh wallpaper`, `art wallpaper iphone` 1k–10k each;
  `dark painting wallpaper`, `famous painting wallpaper`, `painting phone wallpaper` 100–1k.
- Every non-English painting-wallpaper query checked is 100–1k or less (ko, ja, es, pt,
  id, vi, ru-on-Google). `dark phone wallpaper` alone beats all of them combined.

Per language, what was found (details and tables in the write-up):

- **Vietnamese / Indonesian:** Google page one has almost no wallpaper sites (articles,
  phone-shop blogs, stock). I first called the demand "a different product" from the
  pastel pictures on page one; **Charlie pointed out that is supply, not demand.** A–z
  autocomplete showed demand is largely ours (vi: ~3/4 of painting branches, Van Gogh in
  12 variants, ink painting; id: ~half, incl. Raden Saleh, Mona Lisa, landscape). Volumes
  are small (100–1k per head term). Charlie also noted an LLM can check translation
  quality, which removes the "nobody reads the language" blocker.
- **Korean:** Google page one is blogs; **Naver Images is 27–28 of 30 Naver's own blogs and
  cafes**, outside sites can't get in. Google volume ~200–1,500/month total, estimated
  10–150 visits/month even on page one (click share is my assumption).
- **Russian:** Yandex Images page one is 21–26 of 30 Pinterest, mostly AI Van Gogh
  pastiches, so supply is weak; but Wordstat shows ~2–3k/month for all screen-painting
  phrasings (`обои картины` 9,340 is mostly hanging pictures on paper wallpaper). Charlie
  can proofread Russian himself. A `/ru/` test is cheap but low-yield.
- **de, fr, tr, it, pt, es, ja:** supply is dense, or the phrase means physical wallpaper
  (tr, fr leans prints; pl `tapeta` without `na telefon` is wall covering).
- **Van Gogh is the most searched artist in vi, id, ru and English, and the catalogue has
  none** (0 of 411 `catalogue/` files). Likely deliberate (Charlie prefers smooth surfaces
  over visible brushwork); flagged, not argued.

## 3. Dark in English: current state

- Every work page ships dimmed by default; the home description says "a dimmed version so
  icons stay readable", not "dark".
- Dark academia and Moody landscape collections exist.
- 9 of 158 `/w/` URLs contain "dark" in slug/title; the other 149 don't, even though
  most are shown dimmed.
- No page targets `dark phone wallpaper` / `dark art wallpaper` / `dark painting wallpaper`.

Obvious next step, **not started, needs Charlie's go**: a "Dark" collection. Per
Charlie's rule, membership comes from his picks on a tile sheet, never from catalogue text.

## 4. Tooling notes for the next agent

- Chrome extension blocks `search.naver.com`; `curl` with a browser UA works (parse
  `"source":"…"` in the HTML).
- Google Trends rate-limits after ~3 comparisons in a row: the chart stays blank. Two
  comparisons were captured; don't loop on it.
- Wordstat: Charlie logged into Yandex in Chrome this session. Pass the query in the URL
  (`wordstat.yandex.ru/?region=all&view=table&words=…`); typing Cyrillic into the box
  dropped the space.
- Keyword Planner: Charlie's Ads account 300-623-4571, no billing, ranges only. Running it
  auto-saved a plan "Plan from Sept 24, 2026" (no ads). Charlie was told; not deleted.
- Google autocomplete: `suggestqueries.google.com/complete/search?client=firefox&hl=&gl=`;
  keep ~1 request/second.

## 5. Open for Charlie

- Whether to build a Dark collection (and a tile sheet to pick it).
- Whether to try `/ru/` or `/vi/` on 10–15 works anyway (both cheap, both low-yield).
- Request indexing for the four new subject collections in Search Console.
- Commit the three research files (they are untracked; add by path, never `git add -A`).
