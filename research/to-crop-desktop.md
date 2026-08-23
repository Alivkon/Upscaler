# Crop positions (desktop frame)

Offset in plate pixels for the **16:9 desktop crop window** — the frame `gallery.js`
publishes when it passes `DESKTOP_GATE` (1920 × 1080). Recorded in
`research/crop-positioner-desktop.html` (`node scripts/research/crop-positioner.mjs --desktop`).

Same coordinates as `to-crop-positions.md`: plate pixels after `trim`, the window's
own left/top edge. A blank row is one nobody has looked at yet. `variant` is only
filled where a work has several records; the first is the one applied.

Applied through `crop.wide` in `museum-works.json` — one rule per frame, see ADDING.md.


Пиксели считаются от плиты ПОСЛЕ `trim`. Если у работы позже срезали рамку
слева или сверху, начало отсчёта уехало, и записанное число сдвигается на
столько же: 23.08 так переписаны 15 строк. Само место на картине то же.

| ref     | crop          | variant | applied |
|---------|---------------|---------|---------|
| vl-0025 | top 2912px    |         | ✓       |
| vl-0026 | top 2452px    |         | ✓       |
| vl-0027 | top 1319px    |         | ✓       |
| vl-0028 | top 372px     |         | ✓       |
| vl-0030 | top 450px     |         | ✓       |
| vl-0032 | top 1230px    |         | ✓       |
| vl-0036 | top 1612px    |         | ✓       |
| vl-0037 | top 678px     |         | ✓       |
| vl-0038 | top 602px     |         | ✓       |
| vl-0042 | left 241px    |         | ✓       |
| vl-0043 | top 1465px    |         | ✓       |
| vl-0045 | top 109px     |         | ✓       |
| vl-0046 | top 321px     |         | ✓       |
| vl-0047 | top 36px      |         | ✓       |
| vl-0051 | top 656px     |         | ✓       |
| vl-0052 | top 286px     |         | ✓       |
| vl-0053 | top 1819px    |         | ✓       |
| vl-0054 | top 156px     |         | ✓       |
| vl-0057 | left 41px     |         | ✓       |
| vl-0060 | top 1154px    |         | ✓       |
| vl-0063 | top 412px     |         | ✓       |
| vl-0066 | top 413px     |         | ✓       |
| vl-0065 | top 1877px    |         | ✓       |
| vl-0064 | top 439px     |         | ✓       |
| vl-0067 | top 1195px    |         | ✓       |
| vl-0068 | top 3602px    | v1      | ✓       |
| vl-0068 | top 21px      | v2      |         |
| vl-0083 | top 1548px    |         | ✓       |
| vl-0084 | top 761px     |         | ✓       |
| vl-0086 | top 719px     |         | ✓       |
| vl-0087 | top 0px       | v1      | ✓       |
| vl-0087 | top 1113px    | v2      |         |
| vl-0139 | top 348px     |         | ✓       |
| vl-0142 | top 285px     |         | ✓       |
| vl-0151 | top 1677px    |         | ✓       |
| vl-0157 | top 2370px    |         | ✓       |
| vl-0164 | top 1695px    |         | ✓       |
| vl-0174 | top 320px     |         | ✓       |
| vl-0175 | top 413px     |         | ✓       |
| vl-0176 | top 1592px    |         | ✓       |
| vl-0177 | top 1008px    |         | ✓       |
| vl-0178 | top 1271px    |         | ✓       |
| vl-0179 | top 397px     |         | ✓       |
| vl-0216 | top 560px     |         | ✓       |
| vl-0219 | top 2053px    |         | ✓       |
| vl-0221 | top 2145px    |         | ✓       |
| vl-0226 | top 512px     |         | ✓       |
| vl-0230 | top 403px     |         | ✓       |
| vl-0236 | left 525px    |         | ✓       |
| vl-0240 | top 511px     |         | ✓       |
| vl-0251 | top 365px     |         | ✓       |
| vl-0252 | top 136px     |         | ✓       |
| vl-0253 | top 1169px    |         | ✓       |
| vl-0254 | top 1984px    |         | ✓       |
| vl-0256 | top 1895px    |         | ✓       |
| vl-0259 | top 599px     |         | ✓       |
| vl-0261 | top 1683px    |         | ✓       |
| vl-0265 | top 564px     |         | ✓       |
| vl-0275 | top 184px     |         | ✓       |
| vl-0279 | top 326px     |         | ✓       |
| vl-0280 | top 513px     |         | ✓       |
| vl-0281 | top 1148px    |         | ✓       |
| vl-0291 | top 0px       |         | ✓       |
| vl-0297 | left 1747px   |         | ✓       |
| vl-0298 | top 1121px    |         | ✓       |
| vl-0299 | top 955px     |         | ✓       |
| vl-0301 | top 809px     |         | ✓       |
| vl-0308 | top 504px     |         | ✓       |
| vl-0318 | top 0px       |         | ✓       |
| vl-0319 | top 526px     |         | ✓       |
| vl-0324 | top 827px     |         | ✓       |
| vl-0336 | top 660px     |         | ✓       |
| vl-0343 | top 472px     |         | ✓       |
| vl-0349 | top 1273px    |         | ✓       |
| vl-0350 | top 107px     |         | ✓       |
| vl-0352 | top 857px     |         | ✓       |
| vl-0353 | top 1164px    |         | ✓       |
| vl-0354 | top 544px     |         | ✓       |
| vl-0355 | top 299px     |         | ✓       |
| vl-0356 | top 560px     |         | ✓       |
| vl-0357 | left 1324px   |         | ✓       |
| vl-0358 | top 271px     |         | ✓       |
| vl-0361 | top 225px     |         | ✓       |
| vl-0362 | top 144px     |         | ✓       |
| vl-0363 | top 1569px    |         | ✓       |
| vl-0366 | top 559px     |         | ✓       |
| vl-0369 | top 1031px    |         | ✓       |
| vl-0372 | top 0px       |         | ✓       |
| vl-0373 | top 1533px    |         | ✓       |
| vl-0374 | top 0px       | v1      | ✓       |
| vl-0374 | top 834px     | v2      |         |
| vl-0375 | top 698px     |         | ✓       |
| vl-0376 | top 253px     |         | ✓       |
