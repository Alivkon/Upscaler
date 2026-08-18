"""Build a gallery showing every frame crop applied to the full-size museum image.

Sorted worst-first by how much background is still visible after cropping,
so problem cases are at the top rather than buried.

Input:  crop_boxes.json  (from frame_crop.py)
        verdicts.json    (in upscaler-review/)
Output: gallery.html + final/   (thumbnails alongside the page)
        final.json               (machine-readable per-work scores)
"""
import io, json, re, threading, time, urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import numpy as np
from PIL import Image

REPO = Path(__file__).parent.parent
ROOT = Path.home() / "upscaler-review"
BOXES = REPO / "scripts" / "crop_boxes.json"
OUT_DIR = REPO / "scripts" / "final"
OUT_DIR.mkdir(exist_ok=True)

HDR = {"User-Agent": "Mozilla/5.0",
       "AIC-User-Agent": "upscaler-research (samuel.faure.dev@gmail.com)"}
TOL = 26
STRIP = 0.04   # fraction of side to sample when scoring background

lock, done_count = threading.Lock(), [0]


def _get(url, timeout=90) -> bytes:
    return urllib.request.urlopen(
        urllib.request.Request(url, headers=HDR), timeout=timeout
    ).read()


def _full_url(row: dict) -> str | None:
    if row["s"] == "A":
        m = re.search(r"/artworks/(\d+)", row.get("url") or "")
        if not m:
            return None
        d = json.loads(_get(f"https://api.artic.edu/api/v1/artworks/{m.group(1)}?fields=image_id"))
        iid = (d.get("data") or {}).get("image_id")
        return f"https://www.artic.edu/iiif/2/{iid}/full/1200,/0/default.jpg" if iid else None
    d = json.loads(_get(
        f"https://openaccess-api.clevelandart.org/api/artworks/"
        f"?accession_number={row['a']}&limit=1"
    ))
    da = d.get("data") or []
    images = (da[0].get("images") or {}) if da else {}
    for k in ("web", "print", "full"):
        if images.get(k, {}).get("url"):
            return images[k]["url"]
    return None


def _score(img_arr: np.ndarray, bg: np.ndarray) -> float:
    a = img_arr.astype(np.int16)
    ch, cw = a.shape[:2]
    t, s = max(2, int(ch * STRIP)), max(2, int(cw * STRIP))
    return max(
        float((np.abs(e.reshape(-1, 3) - bg).max(axis=1) <= TOL).mean())
        for e in (a[:t], a[-t:], a[:, :s], a[:, -s:])
    )


def _backdrop(img_arr: np.ndarray) -> np.ndarray:
    a = img_arr
    ring = np.concatenate([
        a[:3].reshape(-1, 3), a[-3:].reshape(-1, 3),
        a[:, :3].reshape(-1, 3), a[:, -3:].reshape(-1, 3),
    ])
    return np.median(ring, axis=0)


def process(f, row, box_rec, total):
    try:
        url = _full_url(row)
        if not url:
            return None
        orig = Image.open(io.BytesIO(_get(url))).convert("RGB")
    except Exception:
        return None

    W, H = orig.size
    x0, y0, x1, y1 = box_rec["box"]
    cut = orig.crop((int(x0 * W / 1000), int(y0 * H / 1000),
                     int(x1 * W / 1000), int(y1 * H / 1000)))
    if min(cut.size) < 40:
        return None

    thumb = np.asarray(Image.open(ROOT / "thumbs" / f).convert("RGB"))
    bg = _backdrop(thumb.astype(np.int16))
    score = _score(np.asarray(cut.resize((160, 160))), bg)

    base = f.rsplit(".", 1)[0]
    for img, suffix in ((orig, "_a"), (cut, "_b")):
        t = img.copy()
        t.thumbnail((420, 420), Image.LANCZOS)
        t.save(OUT_DIR / f"{base}{suffix}.jpg", quality=85)

    with lock:
        done_count[0] += 1
        if done_count[0] % 25 == 0:
            print(f"  {done_count[0]}/{total}", flush=True)

    return {"f": f, "base": base, "t": box_rec["t"], "s": row["s"],
            "trim": box_rec["trim"], "left": round(score, 3)}


def main():
    verdicts = {r["f"]: r for r in json.load(open(ROOT / "verdicts.json"))}
    boxes = json.load(open(BOXES))

    args = [(f, verdicts[f], boxes[f], len(boxes))
            for f in boxes if f in verdicts]

    t0 = time.time()
    with ThreadPoolExecutor(max_workers=5) as ex:
        results = [g for g in ex.map(lambda a: process(*a), args) if g]

    results.sort(key=lambda g: -g["left"])
    json.dump(results, open(REPO / "scripts" / "final.json", "w"), indent=1)

    bad = sum(1 for g in results if g["left"] > 0.5)
    parts = [
        "<title>frame crop gallery</title>",
        "<h1>Frame crops, worst first</h1>",
        f"<p>{len(results)} works. Left is the museum photo, right is the crop. "
        f"Score is how much background remains (0 = clean). "
        f"{bad} still have a bad edge.</p>",
    ]
    for g in results:
        parts.append(
            f"<h3>{g['t'][:72]} "
            f"<small>[background left: {g['left']:.2f} &middot; "
            f"trim {g['trim'][0]}/{g['trim'][1]}/{g['trim'][2]}/{g['trim'][3]}%]</small></h3>"
            f'<table border=1 cellpadding=4><tr>'
            f'<td><img src="final/{g["base"]}_a.jpg" width=270></td>'
            f'<td><img src="final/{g["base"]}_b.jpg" width=270></td>'
            f'</tr></table>'
        )
    (REPO / "scripts" / "gallery.html").write_text("\n".join(parts))
    print(f"\n{len(results)} rendered in {time.time() - t0:.0f}s, {bad} still bad")


if __name__ == "__main__":
    main()
