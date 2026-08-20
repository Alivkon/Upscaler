# Oils preview: artist fetch and HTML previews

18 August 2026. Research session — finding candidate artists for the gallery,
building two HTML previews served locally at http://localhost:7723.

---

## What was built

Two HTML files in `/tmp/oils-preview/`, served by `python3 -m http.server 7723`:

**`index.html`** — all 717 works from 27 artists, unfiltered, dark theme,
images shown as-is. Click any card to open the source museum page.

**`dark.html`** — pipeline-filtered survivors (410 pass, 307 removed),
real `desaturate.mjs` (whole mode) and `dimming.mjs` applied to the 294 local
thumbnails. CSS has no artificial filter — images are the real processed output.

---

## Artists fetched

Sources: Cleveland Museum of Art open API (CC0) and Wikimedia Commons (PD-Art).

| Artist | Source | Notes |
|---|---|---|
| Vilhelm Hammershøi | CLE + Wikimedia (SMK) | |
| Caspar David Friedrich | Wikimedia | German museums, not CC0 API |
| Arnold Böcklin | CLE + Wikimedia | |
| Jan van Huysum | Wikimedia (Rijksmuseum / Mauritshuis) | |
| William Harnett | CLE + Wikimedia | |
| Emanuel de Witte | CLE + Wikimedia | |
| Giovanni Paolo Panini | CLE + Wikimedia | |
| Claude-Joseph & Horace Vernet | CLE + Wikimedia | |
| Jean-Victor Bertin | CLE + Wikimedia | |
| Gustave Courbet | CLE + Wikimedia | |
| Eugène Delacroix | CLE + Wikimedia | |
| John Martin | CLE + Wikimedia | |
| Albert Bierstadt | CLE + Wikimedia | |
| Thomas Gainsborough | CLE + Wikimedia | |
| Otto Marseus van Schrieck | Wikimedia | |
| Fitz Henry Lane | CLE + Wikimedia | |
| Martin Johnson Heade | CLE + Wikimedia | |
| Sanford Gifford | CLE + Wikimedia | |
| John Frederick Kensett | CLE + Wikimedia | |
| Francis Danby | Wikimedia | |
| Joseph Wright of Derby | Wikimedia | |
| George Romney | Wikimedia | |
| George Morland | Wikimedia | |
| Utagawa Hiroshige | Wikimedia | woodblock prints, medium set to 'woodblock print in colors' |
| Katsushika Hokusai | Wikimedia | woodblock prints |
| Tsukioka Yoshitoshi | Wikimedia | woodblock prints |
| Hiroshi Yoshida | Wikimedia | woodblock prints |

Total manifest: 717 works. Thumbnails downloaded where possible (Wikimedia rate-limits;
many Wikimedia works load from remote URLs in the browser rather than local files).

---

## Filters applied in dark.html — and what is wrong

dark.html applies a partial and incorrect pipeline. Do not use it as a ground truth
for what the gallery would actually show.

**Applied correctly:**
- monochrome-filter — medium text, matches `monochrome-filter.mjs`
- object-filter — medium + title keywords, matches `object-filter.mjs`
- frame_gate.py — pixel rule on local thumbnails (400px; script recommends ≥500px)
- desaturate.mjs — whole mode, real script, FLATTEST=0.35
- dimming.mjs — real script, THRESHOLD=145, per-image tilt

**Not applied / wrong:**

| Missing | Effect |
|---|---|
| Name filter uses regex only, not actual `name-filter.mjs` (dictionary + author corpus) | Portraits without keyword titles slip through — "Marguerite-Juliette Pierret", numbered Gainsborough files, etc. |
| No model-gate (Qwen people check) | Portraits the name filter misses stay in |
| No model-gate (Qwen frame check) | frame_gate false positives on oil paintings not caught; framed works not cropped and rechecked |
| No frame crop + recheck | All 156 frame-rejected works are discarded outright; production pipeline would recover some via crop |
| No busyness filter | Luma-busy works (dense patterns, embroidery) pass through |
| No numerical box | No luma median, warmth, colour p95 outside sepia, or aspect ratio thresholds |

The full correct pipeline is in `research/2026-08-18-pipeline.md`.

---

## Frame count breakdown

```
Total:           717
Monochrome:        0  removed  (woodblock prints have 'colors' in medium — correct)
Object/textile:    0  removed
Portrait (regex): 151 removed
Framed:          156 removed   (frame_gate.py only, no Qwen, no crop)
Pass:            410
  with local thumb: 294        (processed with real desat+dim)
  Wikimedia URL only: 116      (shown via remote URL, no processing applied)
```
