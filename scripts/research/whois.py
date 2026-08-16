#!/usr/bin/env python3
"""Query the authoritative whois server per TLD over port 43.

Precedence matters: presence of a real registration record ("Domain Name:" /
"Creation Date:") is definitive proof the domain is TAKEN, and must be checked
BEFORE any "available"-style markers, because that word appears in the legal
boilerplate of registered-domain responses too.
"""
import socket, sys, time

SERVERS = {
    "com": "whois.verisign-grs.com", "net": "whois.verisign-grs.com",
    "org": "whois.pir.org", "gallery": "whois.nic.gallery",
    "art": "whois.nic.art", "studio": "whois.nic.studio",
    "pics": "whois.nic.pics", "photos": "whois.nic.photos",
    "photo": "whois.nic.photo", "xyz": "whois.nic.xyz",
    "space": "whois.nic.space", "ink": "whois.nic.ink",
    "io": "whois.nic.io", "sh": "whois.nic.sh",
}
NOT_FOUND = ("no match for", "not found", "no data found", "no entries found",
             "domain not found", "does not exist", "status: free")

def query(domain):
    tld = domain.rsplit(".", 1)[-1]
    srv = SERVERS.get(tld)
    if not srv:
        return "NO-SERVER", ""
    try:
        s = socket.create_connection((srv, 43), timeout=15)
        s.sendall((domain + "\r\n").encode())
        buf = b""
        while True:
            c = s.recv(4096)
            if not c:
                break
            buf += c
        s.close()
    except Exception as e:
        return f"ERR:{type(e).__name__}", ""

    txt = buf.decode("utf-8", "replace")
    low = txt.lower()
    # 1. Definitive registration evidence wins.
    if "domain name:" in low or "creation date:" in low or "registrar:" in low:
        created = ""
        for line in txt.splitlines():
            if line.lower().startswith("creation date:"):
                created = line.split(":", 1)[1].strip()[:10]
        return "TAKEN", created
    # 2. Only then, explicit not-found markers.
    if any(m in low for m in NOT_FOUND):
        return "FREE", ""
    return "UNCLEAR", ""

for d in (l.strip() for l in sys.stdin if l.strip()):
    r, extra = query(d)
    mark = {"FREE": "  ✅", "TAKEN": "  ❌"}.get(r, "  ❓")
    print(f"{mark} {d:<26} {r}{('  (reg ' + extra + ')') if extra else ''}", flush=True)
    time.sleep(1.2)
