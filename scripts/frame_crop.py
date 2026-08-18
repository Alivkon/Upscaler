"""Ask Qwen3-VL for a crop box on every framed painting.

Scope: verdicts.json rows where frame=1 and name/mono/obj are all 0
and the human-figure pass returned NONE.

Checkpoints after every 20 results; re-running resumes from the checkpoint.

Output: crop_boxes.json  {filename: {t, raw, box, trim, flag}}
  box:  [x0, y0, x1, y1] in 0-1000 coordinates
  trim: [left%, top%, right%, bottom%]
  flag: None (good), "over" (crop > 35% on any side), "unparsed"
"""
import base64, io, json, re, threading, time, urllib.error, urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from PIL import Image

REPO = Path(__file__).parent.parent
ROOT = Path.home() / "upscaler-review"
OUT = REPO / "scripts" / "crop_boxes.json"

TOK = next(
    l.split("=", 1)[1].strip()
    for l in (REPO / ".env").read_text().splitlines()
    if l.startswith("REPLICATE_API_TOKEN=")
)
MODEL = "39e893666996acf464cff75688ad49ac95ef54e9f1c688fbc677330acc478e11"
PROMPT = (
    "Outline the position of the artwork itself, excluding any surrounding "
    "picture frame, mount, mat, case or plain background, and output its "
    "bounding box coordinates in JSON format."
)
MAXTRIM = 35  # reject boxes that eat more than this % on any side

lock, n = threading.Lock(), [0]


def _ask_replicate(image: Image.Image) -> str:
    buf = io.BytesIO()
    image.save(buf, "JPEG", quality=92)
    uri = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()
    body = json.dumps({
        "version": MODEL,
        "input": {"media": uri, "prompt": PROMPT, "max_new_tokens": 80, "temperature": 0.0},
    }).encode()
    for attempt in range(7):
        try:
            req = urllib.request.Request(
                "https://api.replicate.com/v1/predictions", data=body,
                headers={"Authorization": f"Bearer {TOK}",
                         "Content-Type": "application/json", "Prefer": "wait"})
            with urllib.request.urlopen(req, timeout=200) as resp:
                d = json.load(resp)
                if resp.headers.get("ratelimit-remaining") == "0":
                    time.sleep(float(resp.headers.get("ratelimit-reset", 10)) + 0.5)
            o = d.get("output")
            return ("".join(o) if isinstance(o, list) else (o or "")).strip()
        except urllib.error.HTTPError as e:
            if e.code in (429, 502, 503, 504) and attempt < 6:
                w = e.headers.get("retry-after") or e.headers.get("ratelimit-reset") or 8
                time.sleep(float(w) + 1 + attempt * 2)
                continue
            return f"HTTP{e.code}"
        except Exception as e:
            if attempt < 6:
                time.sleep(min(2 ** attempt, 30))
                continue
            return type(e).__name__
    return "RETRY"


def _parse(raw: str) -> dict:
    rec = {"raw": raw[:120], "box": None, "trim": None, "flag": None}
    m = re.search(r"\[\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\s*\]", raw)
    if not m:
        rec["flag"] = "unparsed"
        return rec
    x0, y0, x1, y1 = (int(v) for v in m.groups())
    if x1 <= x0 or y1 <= y0:
        rec["flag"] = "degenerate"
        return rec
    trim = [round(max(0.0, v), 1) for v in
            (x0 / 10, y0 / 10, (1000 - x1) / 10, (1000 - y1) / 10)]
    rec["box"] = [x0, y0, x1, y1]
    rec["trim"] = trim
    if max(trim) > MAXTRIM:
        rec["flag"] = "over"
    return rec


def work(r, done, todo_len):
    img = Image.open(ROOT / "thumbs" / r["f"]).convert("RGB")
    raw = _ask_replicate(img)
    rec = {"t": r["t"], **_parse(raw)}
    with lock:
        done[r["f"]] = rec
        n[0] += 1
        if n[0] % 20 == 0:
            json.dump(done, open(OUT, "w"))
            print(f"  {n[0]}/{todo_len}", flush=True)


def main():
    import time as _time
    from collections import Counter

    rows = json.load(open(ROOT / "verdicts.json"))
    vlm = json.load(open(REPO / "scripts" / "vlm_results.json"))
    todo_rows = [
        r for r in rows
        if r["frame"] == 1
        and all(r.get(g) == 0 for g in ("name", "mono", "obj"))
        and vlm.get(r["f"]) == "NONE"
    ]
    done = {}
    if OUT.exists():
        done = {k: v for k, v in json.load(open(OUT)).items() if v.get("box")}
    todo = [r for r in todo_rows if r["f"] not in done]
    print(f"scope {len(todo) + len(done)}, {len(done)} cached, {len(todo)} to fetch", flush=True)

    t0 = _time.time()
    with ThreadPoolExecutor(max_workers=8) as ex:
        list(ex.map(lambda r: work(r, done, len(todo)), todo))
    json.dump(done, open(OUT, "w"))
    print(f"\ndone in {_time.time() - t0:.0f}s")
    print("flags:", Counter(v["flag"] for v in done.values()))
    real = [v["trim"] for v in done.values() if v["trim"] and not v["flag"]]
    print(f"parsed {len(real)}   propose a real crop (>=3% somewhere): "
          f"{sum(1 for t in real if max(t) >= 3)}")


if __name__ == "__main__":
    main()
