#!/usr/bin/env python3
"""Authoritative domain availability via IANA RDAP bootstrap.

Resolves each TLD to its registry's own RDAP base URL from IANA's published
bootstrap file, so there is no guessing at server names. HTTP 404 from the
authoritative registry means the domain is not registered; HTTP 200 means it is.
"""
import json, sys, time, urllib.request, urllib.error

BOOT = "https://data.iana.org/rdap/dns.json"

def load_bootstrap():
    with urllib.request.urlopen(BOOT, timeout=30) as r:
        data = json.load(r)
    m = {}
    for tlds, urls in data["services"]:
        for t in tlds:
            m[t] = urls[0].rstrip("/")
    return m

def check(domain, table):
    tld = domain.rsplit(".", 1)[-1].lower()
    base = table.get(tld)
    if not base:
        return "NO-RDAP", ""
    url = f"{base}/domain/{domain}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0",
                                                   "Accept": "application/rdap+json"})
        with urllib.request.urlopen(req, timeout=20) as r:
            d = json.load(r)
        created = ""
        for ev in d.get("events", []):
            if ev.get("eventAction") == "registration":
                created = ev.get("eventDate", "")[:10]
        return "TAKEN", created
    except urllib.error.HTTPError as e:
        return ("FREE", "") if e.code == 404 else (f"HTTP{e.code}", "")
    except Exception as e:
        return f"ERR:{type(e).__name__}", ""

table = load_bootstrap()
print(f"# bootstrap loaded: {len(table)} TLDs\n", file=sys.stderr)
for d in (l.strip() for l in sys.stdin if l.strip()):
    r, extra = check(d, table)
    mark = {"FREE": "  ✅", "TAKEN": "  ❌"}.get(r, "  ❓")
    print(f"{mark} {d:<26} {r}{('  (reg ' + extra + ')') if extra else ''}", flush=True)
    time.sleep(0.8)
