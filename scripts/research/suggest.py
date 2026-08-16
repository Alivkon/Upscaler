#!/usr/bin/env python3
"""Sweep Google autocomplete with proper URL encoding (handles Cyrillic)."""
import sys, json, urllib.parse, urllib.request, time

hl, gl, out = sys.argv[1], sys.argv[2], sys.argv[3]
seeds = sys.argv[4:]
alpha = [""] + list(" абвгдиклмнопрстуф") if hl == "ru" else [""] + list(" abcdefghilmnoprstuw4")

results = set()
for seed in seeds:
    for suf in alpha:
        q = seed + (suf if suf.startswith(" ") or suf == "" else " " + suf)
        url = ("https://suggestqueries.google.com/complete/search?client=firefox"
               f"&hl={hl}&gl={gl}&q={urllib.parse.quote(q)}")
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=10) as r:
                data = json.loads(r.read().decode("utf-8", "replace"))
            results.update(data[1])
        except Exception:
            pass
        time.sleep(0.05)

with open(out, "w", encoding="utf-8") as f:
    f.write("\n".join(sorted(results)))
print(len(results))
