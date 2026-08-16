#!/usr/bin/env python3
"""Google Trends comparison: average relative interest per keyword.
Usage: trends.py <geo> <timeframe> <kw1> [kw2 ...]   (max 5 keywords)
"""
import json, sys, urllib.parse, urllib.request, http.cookiejar, time

geo, timeframe = sys.argv[1], sys.argv[2]
kws = sys.argv[3:]

cj = http.cookiejar.CookieJar()
op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
op.addheaders = [("User-Agent", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36"),
                 ("Accept-Language", "en-US,en;q=0.9")]
op.open("https://trends.google.com/trends/?geo=" + geo, timeout=15)

def strip(raw):
    return json.loads(raw[raw.index("{"):])

req = {"comparisonItem": [{"keyword": k, "geo": geo, "time": timeframe} for k in kws],
       "category": 0, "property": ""}
u = ("https://trends.google.com/trends/api/explore?hl=en-US&tz=0&req="
     + urllib.parse.quote(json.dumps(req)) + "&geo=" + geo)
data = strip(op.open(u, timeout=20).read().decode("utf-8", "replace"))

w = next(x for x in data["widgets"] if x["id"] == "TIMESERIES")
time.sleep(1)
u2 = ("https://trends.google.com/trends/api/widgetdata/multiline?hl=en-US&tz=0&req="
      + urllib.parse.quote(json.dumps(w["request"])) + "&token=" + w["token"] + "&geo=" + geo)
series = strip(op.open(u2, timeout=20).read().decode("utf-8", "replace"))

rows = series["default"]["timelineData"]
n = len(kws)
sums = [0] * n
for r in rows:
    for i, v in enumerate(r["value"][:n]):
        sums[i] += v
print(f"--- geo={geo or 'WORLD'} timeframe={timeframe} ({len(rows)} points) ---")
for k, s in sorted(zip(kws, sums), key=lambda x: -x[1]):
    avg = s / max(len(rows), 1)
    bar = "#" * int(avg / 2)
    print(f"{avg:6.1f}  {bar:<50} {k}")
