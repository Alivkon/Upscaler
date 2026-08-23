# Crop positions (phone frame)

Offset in plate pixels for the phone crop window. `variant` only filled for images with multiple crops.
`center` = looked at, kept the default center crop.

Applied through `crop` in `museum-works.json` — see ADDING.md. The offset places all three
frames, not the phone one alone: `tall` and `wide` are cut from the same window rule and
clamp to the plate edge. Works with several variants have only `v1` applied.


Пиксели считаются от плиты ПОСЛЕ `trim`. Если у работы позже срезали рамку
слева или сверху, начало отсчёта уехало, и записанное число сдвигается на
столько же: 23.08 так переписаны 15 строк. Само место на картине то же.

| ref     | crop          | variant | applied |
|---------|---------------|---------|---------|
| vl-0025 | left 903px    |         | ✓       |
| vl-0026 | left 0px      |         | ✓       |
| vl-0027 | left 624px    |         | ✓       |
| vl-0028 | left 746px   |         | ✓       |
| vl-0030 | center        |         |         |
| vl-0032 | center        |         |         |
| vl-0037 | center        |         |         |
| vl-0038 | center        |         |         |
| vl-0042 | left 1092px   |         | ✓       |
| vl-0043 | center        |         |         |
| vl-0045 | left 1315px   |         | ✓       |
| vl-0046 | left 2115px   |         | ✓       |
| vl-0047 | left 710px    |         | ✓       |
| vl-0051 | left 1588px   |         | ✓       |
| vl-0054 | center        |         |         |
| vl-0057 | left 1214px   |         | ✓       |
| vl-0060 | left 0px      | v1      | ✓       |
| vl-0060 | left 1816px   | v2      |         |
| vl-0063 | center        |         |         |
| vl-0064 | center        |         |         |
| vl-0065 | center        |         |         |
| vl-0066 | center        |         |         |
| vl-0067 | center        |         |         |
| vl-0068 | top 0px       |         | ✓       |
| vl-0069 | center        |         |         |
| vl-0083 | center        |         |         |
| vl-0084 | center        |         |         |
| vl-0086 | center        |         |         |
| vl-0087 | left 743px    |         | ✓       |
| vl-0139 | center        |         |         |
| vl-0142 | center        |         |         |
| vl-0151 | left 496px    |         | ✓       |
| vl-0157 | top 882px     |         | ✓       |
| vl-0164 | center        |         |         |
| vl-0174 | center        |         |         |
| vl-0175 | center        |         |         |
| vl-0176 | center        |         |         |
| vl-0177 | center        |         |         |
| vl-0178 | center        |         |         |
| vl-0179 | left 2452px   | v1      | ✓       |
| vl-0179 | left 1226px   | v2      |         |
| vl-0215 | center        |         |         |
| vl-0216 | left 122px    |         | ✓       |
| vl-0219 | center        |         |         |
| vl-0220 | center        |         |         |
| vl-0221 | left 0px      |         | ✓       |
| vl-0222 | center        |         |         |
| vl-0226 | center        |         |         |
| vl-0230 | center        |         |         |
| vl-0236 | center        |         |         |
| vl-0240 | left 3239px   | v1      | ✓       |
| vl-0240 | left 1624px   | v2      |         |
| vl-0240 | left 0px      | v3      |         |
| vl-0251 | center        |         |         |
| vl-0252 | center        |         |         |
| vl-0253 | center        |         |         |
| vl-0254 | center        |         |         |
| vl-0256 | left 1667px   |         | ✓       |
| vl-0259 | left 1173px   |         | ✓       |
| vl-0261 | left 1423px   |         | ✓       |
| vl-0265 | left 2120px   |         | ✓       |
| vl-0275 | center        |         |         |
| vl-0279 | left 1771px   |         | ✓       |
| vl-0280 | center        |         |         |
| vl-0281 | center        |         |         |
| vl-0291 | left 0px      | v1      | ✓       |
| vl-0291 | left 74px     | v2      |         |
| vl-0297 | left 3262px   |         | ✓       |
| vl-0298 | left 2337px   |         | ✓       |
| vl-0299 | center        |         |         |
| vl-0301 | left 3403px   |         | ✓       |
| vl-0308 | center        |         |         |
| vl-0318 | center        |         |         |
| vl-0319 | center        |         |         |
| vl-0336 | left 1598px   |         | ✓       |
| vl-0343 | center        |         |         |
| vl-0349 | center        |         |         |
| vl-0350 | center        |         |         |
| vl-0353 | left 2042px   |         | ✓       |
| vl-0354 | center        |         |         |
| vl-0352 | left 1426px   |         | ✓       |
| vl-0355 | left 1902px   |         | ✓       |
| vl-0356 | left 704px    |         | ✓       |
| vl-0357 | left 6385px   |         | ✓       |
| vl-0358 | left 1756px   |         | ✓       |
| vl-0036 | left 671px    |         | ✓       |
| vl-0052 | left 2363px   |         | ✓       |
| vl-0053 | left 486px    |         | ✓       |
| vl-0324 | left 1356px   |         | ✓       |
| vl-0359 | top 413px     | v1      | ✓       |
| vl-0359 | top 0px       | v2      |         |
| vl-0360 | top 113px     |         | ✓       |
| vl-0361 | left 0px      |         | ✓       |
| vl-0362 | left 1294px   |         | ✓       |
| vl-0363 | left 96px    |         | ✓       |
| vl-0364 | left 93px    |         | ✓       |
| vl-0365 | top 161px     |         | ✓       |
| vl-0366 | left 390px    |         | ✓       |
| vl-0367 | left 0px      |         | ✓       |
| vl-0368 | left 202px    |         | ✓       |
| vl-0369 | left 163px    |         | ✓       |
| vl-0370 | top 101px     |         | ✓       |
| vl-0372 | left 296px    |         | ✓       |
| vl-0373 | left 1222px   |         | ✓       |
| vl-0374 | left 1809px   |         | ✓       |
| vl-0375 | left 1196px   |         | ✓       |
| vl-0376 | left 1825px   |         | ✓       |
| vl-0377 | left 2672px   | v1      | ✓       |
| vl-0377 | left 120px    | v2      |         |
| vl-0377 | left 1905px   | v3      |         |
| vl-0378 | left 1307px   |         | ✓       |
| vl-0379 | left 1287px   |         | ✓       |
| vl-0380 | left 424px    |         | ✓       |
| vl-0381 | left 1969px   | v1      | ✓       |
| vl-0381 | left 0px      | v2      |         |
| vl-0382 | left 2221px   | v1      | ✓       |
| vl-0382 | left 3892px   | v2      |         |
| vl-0383 | left 2092px   |         | ✓       |
| vl-0384 | left 2248px   |         | ✓       |
| vl-0385 | left 706px    |         | ✓       |
| vl-0386 | left 1960px   |         | ✓       |
| vl-0387 | left 1534px   |         | ✓       |
