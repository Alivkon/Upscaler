# Candidate themed collection pages: counts against the 158 live works

Method: read every live work's catalogue record (`catalogue/*.json`: title, alt,
tags, provenance) and assigned it by what the text says. "Sure" = the text
names the thing (season word, storm, moonlight, ruin, flower, snow, angel).
"Maybe" = inferred from adjacent wording (a tag, a painter known for a style,
a detail buried in a longer alt) without the theme word itself.

Live = catalogue work, not `hidden: true`, has files (`gallery.js` /
`works.js`). Measured with a scratch script against `galleryItems()`:
158 live works, 252 hidden, 0 works in the catalogue that are neither hidden
nor live — every non-hidden catalogue entry already has files. So **"not yet
live" is 0 for every theme below**; there is nothing sitting in the catalogue
waiting only on production for any of these ten themes.

For brightness (theme 2, light academia) the `treatment` field in
`../wallpaper-gen/museum-works.json` was checked as a secondary signal, per
instruction. It turned out not to separate "light academia" from "dark
academia" the way the ceiling number suggests: works tagged `ceil` (a
brightness cap on the source, because it started out brighter than the dim
rule expects) are dominated by paintings already titled "dark academia" on
their own page (Claude Lorrain forests, Bertin valleys, Cleveland vanitas
still lifes) — `ceil` describes how bright the *source scan* was before
darkening, not how the *displayed, dimmed* wallpaper reads. So this table
classifies theme 2 by text (warm/blue-sky/sunlit language, classical
architecture, pastoral figures), not by `treatment`, and says so per work.

## Counts

| # | Theme | Live sure | Live maybe | Live total | Not yet live | Clears 12? |
|---|---|---|---|---|---|---|
| 1 | Fall / autumn | 4 | 4 | 8 | 0 | No |
| 2 | Light academia | 5 | 11 | 16 | 0 | Only with most of the "maybe" pile, and 9 of the 16 already sit in dark academia |
| 3 | Ancient ruins / Rome | 7 | 5 | 12 | 0 | Barely, and 8 of the 12 already sit in dark academia |
| 4 | Dark floral still life | 16 | 1 | 17 | 0 | Yes |
| 5 | Stormy sea | 9 | 1 | 10 | 0 | No |
| 5b | (storms on land, separate pool) | ~14 | — | ~14 | 0 | Not this theme's count; see note |
| 6 | Moonlight and night | 7 | 2 | 9 | 0 | No |
| 7 | Winter / snow | 6 | 2 | 8 | 0 | No |
| 8 | Cottagecore | 2 | 2 | 4 | 0 | No, not close |
| 9 | Renaissance aesthetic | 0 | 0 | 0 | 0 | No, nothing in the collection fits |
| 10 | Angelcore | 2 | 0 | 2 | 0 | No, not close |

## 1. Fall / autumn

Sure (the alt names the season or its colour in a landscape):
- vl-0086 · Landscape with Hunters · Jan Wijnants · c. 1660-80 · sure ("dark autumn trees, warm golden light")
- vl-0358 · An October Day in the White Mountains · John Frederick Kensett · 1854 · sure ("autumn scrub in red and gold")
- vl-0045 · Mount Washington, New Hampshire · Jasper F. Cropsey · 1870 · sure ("autumn river flanked by crimson and gold trees")
- vl-0057 · View near Newport · John Frederick Kensett · 1860s · sure ("rocky New England shoreline with autumn trees")

Maybe:
- vl-0219 · Bamboo in Four Seasons: Autumn · Unknown (China) · 1279-1368 · maybe (titled "Autumn" as one season of a set, but the visible painting is ink bamboo with no seasonal colour)
- vl-0371 · Maple Viewing · Wang Yin · Qing, 19th century · maybe (title implies momijigari/maple-viewing, machine-written alt gives no colour)
- vl-0047 · Durham, Connecticut · George Inness · 1858 · maybe ("russet leaves" but a green meadow, storm clouds massing — mixed, and it's a dark-moody piece)
- vl-0444 · Still Life with Melons and Grapes · Otto Didrik Ottesen · 1851 · maybe (a fruit-harvest still life, not landscape foliage)

Well under 12 either way.

## 2. Light academia

Classified by text (warm, sunlit, blue sky, classical architecture, pastoral
figures), not by `treatment` — see the note above on why `ceil` doesn't track
this.

Sure:
- vl-0036 · Interior of the Pantheon, Rome · Giovanni Paolo Panini · 1747 · sure ("warm amber columns and niches", oculus open to blue sky) — also in dark academia
- vl-0301 · Landscape with a Column and Figure · Claude Lorrain · 1650 · sure ("warm classical landscape")
- vl-0381 · Italian Landscape · Jean-Victor Bertin · 1812 · sure ("hill town of pale stone houses...under a deep blue sky")
- vl-0382 · Landscape, Site of Greece · Jean-Victor Bertin · 1812 · sure ("clear blue sky", "small white-robed figures")
- vl-0375 · Jacob with Laban and his Daughters · Claude Lorrain · 1676 · sure (pastoral, robed shepherd figures, hazy warm light) — also in dark academia

Maybe (mostly Claude Lorrain / Bertin / Vernet / Wilson pastoral landscapes
that the site's own dark-academia pick list already claims, or works with
some warm detail buried in an otherwise not-obviously-light description):
- vl-0280 · Italian Landscape: The Abbey and the Monks · Jean-Victor Bertin · undated · maybe — in dark academia
- vl-0308 · Landscape with the Voyage of Jacob · Claude Lorrain · 1677 · maybe — in dark academia
- vl-0279 · Landscape (wooded meadow) · Jean-Victor Bertin · 1804 · maybe — in dark academia
- vl-0281 · River Landscape · Jean-Victor Bertin · undated · maybe
- vl-0064 · The Waterfalls at Tivoli · Claude-Joseph Vernet · 1737 · maybe (ancient ruins mentioned, but "dark green pool") — in dark academia
- vl-0067 · An Aqueduct Near a Fortress · Jean-Victor Bertin · 1807 · maybe — in dark academia
- vl-0353 · A Forest with Apollo and Daphne · Jean-Victor Bertin · 1810 · maybe ("warm green light") — in dark academia
- vl-0065 · Rest on the Flight into Egypt · Claude Lorrain · early 1640s · maybe ("peachy sky", but "tall dark trees") — in dark academia
- vl-0336 · View of Tivoli: the Cascatelle and the Villa of Maecenas · Richard Wilson · 1752 · maybe (villa named, but "pale sky") — in dark academia
- vl-0083 · Egypt and Nubia, Volume I · Louis Haghe · 1846 · maybe ("warm sandy tones", but Egyptian antiquity, not Italian/classical academia)
- vl-0046 · Natural Bridge, Sorrento · William Stanley Haseltine · 1856 · maybe (Mediterranean bay, hazy, not clearly bright)

**Overlap flag:** 9 of these 16 (2 sure, 7 maybe) are already refs in the
dark-academia page's list. A light-academia page built mostly from this pool
would repeat over half of dark academia's own paintings under a contradictory
label — several are literally titled "...dark academia..." on their own page.
Only 7 of the 16 (vl-0036, vl-0301, vl-0381, vl-0382, vl-0046, vl-0083, and
vl-0064 counts once) are not already in dark academia, and only 4 of those 7
are "sure." Weak candidate as it stands.

## 3. Ancient ruins / Rome

Sure (named ruin, aqueduct, Roman/Tivoli/Pantheon explicitly):
- vl-0036 · Interior of the Pantheon, Rome · Giovanni Paolo Panini · 1747 · sure — in dark academia
- vl-0067 · An Aqueduct Near a Fortress · Jean-Victor Bertin · 1807 · sure ("Roman stone aqueduct") — in dark academia
- vl-0301 · Landscape with a Column and Figure · Claude Lorrain · 1650 · sure (ruined column)
- vl-0060 · Ruins of an Ancient City · John Martin · c. 1810-20 · sure — in dark academia
- vl-0261 · Roman Landscape · Arnold Böcklin · 1852 · sure (titled "Roman") — in dark academia
- vl-0336 · View of Tivoli: the Cascatelle and the Villa of Maecenas · Richard Wilson · 1752 · sure (Tivoli named) — in dark academia
- vl-0064 · The Waterfalls at Tivoli · Claude-Joseph Vernet · 1737 · sure (Tivoli named, "ancient ruins" in alt) — in dark academia

Maybe:
- vl-0226 · Ruin by the Sea · Arnold Böcklin · 1881 · maybe (an architectural ruin, but not specifically Roman/classical) — in dark academia
- vl-0386 · Meleager and Atalanta · Richard Wilson · c. 1770 · maybe ("a pale temple on the cliff")
- vl-0464 · Dream of Arcadia (copy) · after Thomas Cole · c. 1863 · maybe ("marble temple", classical pastoral capriccio)
- vl-0463 · The Architect's Dream · Thomas Cole · 1840 · maybe (an imagined city of classical monuments, capriccio)
- vl-0460 · The Course of Empire: Destruction · Thomas Cole · 1836 · maybe (a headless marble colossus over a sacked ancient city — apocalyptic, not a calm ruin view)

Excluded as off-theme despite matching "ruins": vl-0399 The Ruins of Holyrood
Chapel (Louis Daguerre, 1824) is a Scottish Gothic abbey ruin, not Roman/
classical — belongs with moonlight, not this theme. vl-0083 Egypt and Nubia
is ancient but Egyptian, not Roman/campagna.

**Overlap flag:** 8 of these 12 (6 of 7 sure, 2 of 5 maybe) are already in
dark academia. This is the weakest of the four themes that reach 12: strip
out the dark-academia refs and only vl-0301, vl-0386, vl-0464, vl-0463 are
new. A ruins/Rome page built now would be roughly two-thirds a repeat of
dark academia's own list.

## 4. Dark floral still life

Sure (a flower named in the alt, on a dark ground, in the Dutch/Danish
still-life tradition):
- vl-0216 · Apple Blossoms · Martin Johnson Heade · 1873 · sure — in dark academia
- vl-0253 · Flowers in an Urn · Jan van Huysum · 1720 · sure — in dark academia
- vl-0457 · Arrangement with a Colourful Bouquet in a Vase · Otto Didrik Ottesen · undated · sure
- vl-0446 · Bouquet with Dedication to Lucile Grahn · Otto Didrik Ottesen · 1844 · sure
- vl-0178 · Vase of Flowers · Jan van Huysum · 1700-1749 · sure — in dark academia
- vl-0451 · Still Life with Roses and Strawberries · Otto Didrik Ottesen · undated · sure
- vl-0452 · Roses and Myrtles · Otto Didrik Ottesen · 1876 · sure
- vl-0221 · Spring Flowers · Claude Monet · 1864 · sure — in dark academia
- vl-0275 · Still life with flowers and fruit · Jan van Huysum · 1721 · sure — in dark academia
- vl-0252 · Vase of Flowers · Jan van Huysum · 1722 · sure — in dark academia
- vl-0380 · Glass Vase with Flowers · Jan van Huysum · 1731-1732 · sure
- vl-0356 · Orchid Blossoms · Martin Johnson Heade · 1873 · sure — in dark academia
- vl-0440 · Still Life with Dandelion · Otto Didrik Ottesen · undated · sure
- vl-0343 · Fruit Piece · Jan van Huysum · 1722 · sure (roses alongside the fruit)
- vl-0455 · A Rose in the Soldier's Buttonhole · Otto Didrik Ottesen · 1884 · sure (a single rose, but dark ground and explicit)
- vl-0385 · Forest Floor Still-Life · Otto Marseus van Schrieck · undated · sure ("white cow parsley, a blue morning glory and a red-streaked tulip against near-black undergrowth") — in dark academia

Maybe:
- vl-0453 · Fruit Piece with a Goldfinch · Otto Didrik Ottesen · 1855 · maybe (one morning-glory flower, mostly a fruit-and-bird piece)

**Overlap:** 8 of 17 are also in dark academia, similar ratio to the other
themes, but this theme clears 12 on sure alone (16), so the overlap matters
less — even the 9 not already in dark academia (vl-0457, vl-0446, vl-0451,
vl-0452, vl-0380, vl-0440, vl-0343, vl-0455, vl-0453) is close to a full page
by itself. Strongest candidate of the ten.

## 5. Stormy sea

Sure (a storm plus open sea/ship, named explicitly):
- vl-0476 · Storm on the Sea of Azov · Ivan Aivazovsky · 1887 · sure
- vl-0474 · Storm at Cape Aya · Ivan Aivazovsky · 1899 · sure
- vl-0418 · Combat du Cap Lézard · Théodore Gudin · 1839 · sure (naval battle in a storm)
- vl-0412 · Sea in Stormy Weather · Théodore Gudin · 1844 · sure
- vl-0468 · The Ninth Wave · Ivan Aivazovsky · 1850 · sure (shipwreck survivors)
- vl-0407 · Captain Aubert Saving the Crew of the Lydia · Théodore Gudin · 1830 · sure ("stormy night sea")
- vl-0475 · Waves on the High Seas · Ivan Aivazovsky · 1898 · sure
- vl-0467 · Storm at Sea · Ivan Aivazovsky · 1873 · sure
- vl-0226 · Ruin by the Sea · Arnold Böcklin · 1881 · sure ("dark stormy sea") — in dark academia

Maybe:
- vl-0408 · View of a Rocky Coast by Moonlight · Théodore Gudin · 1830-1880 · maybe (a beached wreck and sea mist, but calm/moonlit, not a storm)

9 sure + 1 maybe = 10. Short of 12.

**Storms on land (a separate pool, not counted above):** roughly 14 more
works name a storm but are on land or mountains, not at sea — vl-0291 Rocky
Mountain Sheep, vl-0038 Landscape with a Church by a Torrent, vl-0043 Storm in
the Mountains, vl-0417 Mont Saint-Michel sous l'orage, vl-0377 Before a
Thunderstorm, vl-0324 The Destruction of the Children of Niobe, vl-0390
Mountain Village after Storm, among others. Not classified sure/maybe here
since it's not one of the ten requested themes; flagging it because a future
"storms" page (land + sea combined) would clear 12 comfortably where "stormy
sea" alone does not.

## 6. Moonlight and night

Sure:
- vl-0355 · Mount Vesuvius at Midnight · Albert Bierstadt · 1868 · sure — in dark academia
- vl-0399 · The Ruins of Holyrood Chapel · Louis Daguerre · 1824 · sure ("moonlit gothic ruins")
- vl-0408 · View of a Rocky Coast by Moonlight · Théodore Gudin · 1830-1880 · sure
- vl-0393 · Bivouac at Yingkou · Kobayashi Kiyochika · 1895 · sure ("fine yellow snow flecks across a grey night")
- vl-0407 · Captain Aubert Saving the Crew of the Lydia · Théodore Gudin · 1830 · sure ("moonlight breaking through dark clouds")
- vl-0472 · Death · Maxmilián Pirner · 1886-1893 · sure ("pale moonlit sky")
- vl-0373 · Fisherman's Cottage · Harald Oscar Sohlberg · 1906 · sure ("deep blue dusk")

Maybe:
- vl-0385 · Forest Floor Still-Life · Otto Marseus van Schrieck · undated · maybe (moths in flight imply night, but it's a daylit-readable still life, not a night scene) — in dark academia
- vl-0376 · Gebirgssee · Arnold Böcklin · 1846 · maybe ("pale evening sky" — dusk, not full night)

7 sure + 2 maybe = 9. Short of 12.

## 7. Winter / snow

Sure (snow or "winter" named as the subject, not a background detail):
- vl-0230 · Panoramic View of the Alps, Les Dents du Midi · Gustave Courbet · 1877 · sure ("snow along the ridge")
- vl-0393 · Bivouac at Yingkou · Kobayashi Kiyochika · 1895 · sure ("falling snow")
- vl-0387 · From the Old Christiansborg · Vilhelm Hammershøi · 1892 · sure ("flat winter light")
- vl-0389 · River Sky in Evening Snow · Yokoyama Taikan · 1912 · sure (snow slope, titled "Snow")
- vl-0473 · Road from Mleta to Gudauri · Ivan Aivazovsky · 1868 · sure ("snow-covered Caucasus peaks")
- vl-0397 · Alpes japonaises · Yamamoto Shunkyo · 20th century · sure ("snow-streaked mountain ridge")

Maybe:
- vl-0355 · Mount Vesuvius at Midnight · Albert Bierstadt · 1868 · maybe (snow on the volcano's slope is a minor detail, subject is the eruption at night) — in dark academia
- vl-0045 · Mount Washington, New Hampshire · Jasper F. Cropsey · 1870 · maybe (a snow-capped peak far in the distance, subject is the autumn foreground)

6 sure + 2 maybe = 8. Short of 12, and too early in the year to matter yet
per the brief ("for later in the year").

## 8. Cottagecore

Sure (pastoral/farm daylight scene, not tagged dark/moody):
- vl-0299 · The Old Water Mill · George Morland · 1790 · sure (thatched mill, farmyard animals, "broken cloud")
- vl-0375 · Jacob with Laban and his Daughters · Claude Lorrain · 1676 · sure (shepherd, sheep, goat, pastoral) — in dark academia

Maybe:
- vl-0297 · Sunlight and Shadow: The Newbury Marshes · Martin Johnson Heade · 1871 · maybe (a haystack and low sun, but marshland, not garden/cottage)
- vl-0376 · Gebirgssee · Arnold Böcklin · 1846 · maybe (a boy with goats at a lake, gentle but at dusk, not full daylight)

Genuinely thin: the collection is dominated by Cleveland-museum dark-academia
landscapes, Dutch still lifes, Japanese ink paintings, and Hudson River
School wilderness — almost no bright genre scenes of rural daily life. 4
total, not close to 12.

## 9. Renaissance aesthetic

No live work is dated 1400-1600 (checked every `provenance.date` for a year
or century string in that range: zero matches), and none of the
mythological/religious subject paintings in the collection (Apollo and
Daphne, the Expulsion, the Voyage of Jacob) are painted in a Renaissance
style — they're 17th-to-19th-century Claude Lorrain/Bertin/Thomas Cole
classical-landscape and Hudson River School work, centuries later and a
different visual language. Zero candidates, sure or maybe.

## 10. Angelcore

Only two works mention an angel at all, and neither is a Rococo/Baroque
heavenly scene:
- vl-0065 · Rest on the Flight into Egypt · Claude Lorrain · early 1640s · sure (a kneeling angel in a landscape) — in dark academia
- vl-0466 · The Voyage of Life: Old Age · Thomas Cole · 1842 · sure (a glowing angel pointing toward a break in the clouds)

No cherubs, putti, or ceiling-painting heavenly scenes found anywhere in the
live set. 2 total, not close to 12.

## Summary

Dark floral still life clears 12 today on sure matches alone (16) and is the
only unambiguous yes. Ancient ruins/Rome technically clears 12 (7 sure + 5
maybe) but two-thirds of that list already belongs to dark academia, so it's
a weak, mostly-repeat page as it stands. Light academia reaches 16 total only
by counting 11 maybes, and more than half of those are also dark-academia
refs with contradictory on-page titles — not ready. Stormy sea (10), moonlight
and night (9), fall/autumn (8), and winter/snow (8) are all within reach but
short, closest first. Cottagecore (4), Renaissance aesthetic (0), and
angelcore (2) are not close at all — the collection simply doesn't contain
that material yet.
