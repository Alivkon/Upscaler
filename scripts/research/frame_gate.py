#!/usr/bin/env python3
"""Есть ли вокруг работы поле — паспарту, подложка, бумажное поле, фотофон.

Одна функция наружу: framed(path) -> True/False. Ничего не обрезает и ничего
не пишет: работа с полем просто не берётся. Зависимости — numpy и Pillow.

    from frame_gate import framed
    if framed("1915.534.jpg"):
        continue                       # мимо

ЧТО ЭТО СТОИТ. Проверено на 407 работах, размеченных Charlie глазами
(коллекция, спутниковые листы USGS, датский музей SMK — последний в настройке
не участвовал):

    ловит рамок          99.0 %   (3 из 297 проходят)
    точность             91.9 %   (26 чистых работ из 110 выброшены зря)
    коллекция           100 % / 80.0 %   (полнота / точность)
    незнакомый музей     90.0 % / 73.3 %

Одна работа — около 0.4 с на ядро (уменьшение до 1000 px и четыре стороны).
Это не мгновенно: гонять пачкой в фоне, а не по нажатию.

РАЗМЕР ВХОДА. Все пороги — доли стороны, поэтому напрашивается, что подавать
можно что угодно. Нельзя: ниже 500 px полнота падает, и падает в дорогую
сторону. Те же 407 работ, тот же модуль, разница только в уменьшении входа:

    1000 px   полнота 99.0 %   точность 91.9 %    проходит  3
     500 px   полнота 99.3 %   точность 90.8 %    проходит  2
     350 px   полнота 98.3 %   точность 89.8 %    проходит  5
     200 px   полнота 96.6 %   точность 90.3 %    проходит 10

Причина не в сглаживании, а в арифметике: девять работ, теряющихся между 1000
и 200, имеют поле медианной глубины 0.007 стороны — на 200 px это ПОЛТОРА
ПИКСЕЛЯ. Мерить там нечего. У остальных рамок поле вдвое с лишним глубже.
Значит, кормить не меньше 500 px по длинной стороне; на превью в 200 px
результат недействителен. Замерено дважды, независимо, числа сошлись.

Ошибка при этом ОДНОСТОРОННЯЯ. Напрашивается, что на полутора пикселях правило
начинает и срабатывать наугад, — нет: на 200 px из 24 срабатываний тоньше трёх
пикселей верны 22. Теряются промахи, а не появляются ложные отказы. Полоса
тонкая, доля рамок в размеченном наборе высокая (297 из 407), так что число
шаткое, — но пугаться тонких срабатываний оснований нет.

Цена ошибок несимметрична и правило настроено под это: пропущенная рамка
попадает в галерею и портит её, лишний отказ стоит одной работы из тысяч.
На незнакомом музее ждать 90–95 % полноты, не 99.

ЧЕГО ОНО НЕ УМЕЕТ. Оно отвечает на вопрос «есть ли поле», а не «годится ли
работа». Лоскут ткани на студийном фоне ловится, лоскут ткани без фона —
пройдёт, хотя обоями не станет. Одноцветность и створки — отдельные ворота.

КАК ЭТО РАБОТАЕТ. С каждой из четырёх сторон ищется полоса, у которой:
    1. цвет отличается от работы (ступенька > 0.05),
    2. глубина не меньше 0.3 % стороны — иначе это край снимка, а не поле,
    3. полоса одинакова ВДОЛЬ края, от угла до угла (подложка — да, тёмная
       колоннада на картине — нет: между колоннами небо),
и есть хотя бы одно доказательство, что это поле, а не часть картины:
    a. граница проведена как линия во всю ширину, или
    b. полоса ровная до тысячной, или
    c. полоса ОДНОГО ЦВЕТА — так выглядит студийный фон, у которого нет ни
       прямой границы (край предмета рван), ни ровности (на фоне градиент).
Хватает одной стороны. Стороны могут не совпадать по тону.

Пороги трогать не глядя нельзя: (a) и (b) держат точность — без них из 110
чистых работ выбрасывается 92 вместо 26. Проверять изменения командой
    python3 frame_gate.py --check
(нужны labels.json, measured.json, batch.json из соседней папки).
"""
import os
import pathlib
import sys

import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None

LONG = 1000            # на чём меряем; больше не точнее, только медленнее
MAX_INSET = 0.30       # глубже полосу не ищем
STEP_MIN = 0.05        # насколько поле должно отличаться по цвету от работы
REJECT_MIN = 0.003     # тоньше — не поле, а край снимка
REJECT_LINE = 0.35     # граница как проведённая линия во всю ширину
REJECT_FLAT = 0.001    # или полоса ровная до тысячной — фотография такой не бывает
REJECT_ALONG = 0.03    # и полоса одинакова ВДОЛЬ края
REJECT_SPREAD = 0.07   # или полоса одного цвета: студийный фон под лоскутом


# ── как читается файл ────────────────────────────────────────────────────────

def load(path):
    """Уменьшенная копия в [0,1]. Всё меряется в долях стороны, поэтому числа
    значат одно и то же для листа в 800 px и для плиты в 12000 px."""
    im = Image.open(path).convert("RGB")
    im.thumbnail((LONG, LONG), Image.LANCZOS)
    return np.asarray(im, dtype=np.float32) / 255.0


# ── подсчёты по краю ─────────────────────────────────────────────────────────

def _line_profile(grey, axis):
    """Насколько каждый столбец (или ряд) похож на проведённую линию.

    Не сила перепада, а его постоянство: край картины внутри рамы даёт перепад
    почти в каждой строке, а ветка дерева — в десятке.
    """
    if axis == 1:
        d = np.abs(grey[:, 2:] - grey[:, :-2])
    else:
        d = np.abs(grey[2:, :] - grey[:-2, :]).T
    thr = max(0.05, float(np.percentile(d, 92)))
    return (d > thr).mean(axis=0)


def _sides(a):
    return (("top", a), ("bottom", a[::-1]),
            ("left", a.transpose(1, 0, 2)), ("right", a.transpose(1, 0, 2)[::-1]))


def _candidates(arr):
    """Где с этого края могло бы кончаться поле — два способа, оба неполные.

    По разрыву: профиль медианного цвета строк и место, где он прыгает. Строки
    сравниваются через три, а не соседние: край листа на снимке бывает мягкий,
    переход размазан на десяток строк.

    По пробегу: докуда цвет держится около цвета крайних строк. Ловит ровное
    поле без резкой границы, зато уезжает в картину на пейзаже.

    Выбирает между кандидатами ступенька по цвету.
    """
    span = arr.shape[0]
    lim = max(4, int(span * MAX_INSET))
    M = np.median(arr[:lim + 16], axis=1)
    K = np.ones(3) / 3
    M = np.stack([np.convolve(M[:, c], K, "same") for c in range(3)], 1)
    out = set()
    if len(M) > 10:
        d = np.abs(M[6:] - M[:-6]).max(axis=1)[:lim]
        if len(d) > 3 and d[2:].max() >= 0.02:
            out.add(int(np.argmax(d[2:])) + 5)
    base = np.median(arr[:3].reshape(-1, 3), axis=0)
    n = 0
    for i in range(lim):
        if np.abs(np.median(arr[i], axis=0) - base).max() > 0.075:
            break
        n = i + 1
    if n >= 2:
        out.add(n)
    return span, sorted(x for x in out if 2 <= x < lim)


def _ragged(arr, sm, lim):
    """Докуда поле заходит в работу, если мерить каждый столбец отдельно.

    Лист на подложке лежит криво и рван по краю. Берётся высокий процентиль, а
    не максимум: один тёмный столбец — соринка, а не край. Столбцы, где поле
    идёт до конца, из счёта выкидываются: это углы рамки, иначе чёрная плашка
    насчитывает себе треть стороны и вся рамка уходит в отвал.
    """
    dev = np.abs(arr[:lim] - sm).max(axis=2)
    hit = np.argmax(dev > 0.075, axis=0).astype(np.float32)
    live = dev.max(axis=0) > 0.075
    if live.sum() < max(8, 0.25 * len(live)):
        return 0.0
    return float(np.percentile(hit[live], 75))


# ── ответ ────────────────────────────────────────────────────────────────────

def examine(src):
    """Кто именно сработал: сторона, глубина, доказательство. Для галочки в
    интерфейсе достаточно framed(), это — чтобы было что показать в подсказке
    и по чему спорить, когда отказ окажется неверным."""
    a = load(src) if isinstance(src, (str, pathlib.Path)) else src
    grey = a.mean(axis=2)
    prof_c, prof_r = _line_profile(grey, 1), _line_profile(grey, 0)
    profs = {"top": prof_r, "bottom": prof_r[::-1],
             "left": prof_c, "right": prof_c[::-1]}
    for name, arr in _sides(a):
        prof = profs[name]
        span, cands = _candidates(arr)
        lim = max(4, int(span * MAX_INSET))
        for n in cands:
            strip, inside = arr[:n], arr[n:n + max(n, 12)]
            if len(inside) < 4:
                continue
            sm = np.median(strip.reshape(-1, 3), axis=0)
            step = float(np.abs(sm - np.median(inside.reshape(-1, 3),
                                               axis=0)).max())
            if step <= STEP_MIN:
                continue
            cut = min(max(n, _ragged(arr, sm, lim)), n + 0.01 * span)
            if cut / span <= REJECT_MIN:
                continue
            g = strip.mean(axis=2)
            colmed = np.median(g, axis=0)
            if float(np.median(np.abs(colmed - np.median(colmed)))) > REJECT_ALONG:
                continue
            line = float(prof[max(0, n - 3):n + 3].max()) if n < len(prof) else 0.0
            gs = float(np.abs(np.diff(np.median(g, axis=1))).mean())
            spread = float(np.percentile(g, 90) - np.percentile(g, 10))
            if line >= REJECT_LINE:
                why = "граница проведена как линия"
            elif gs <= REJECT_FLAT:
                why = "полоса ровная до тысячной"
            elif spread <= REJECT_SPREAD:
                why = "полоса одного цвета — студийный фон"
            else:
                continue
            return dict(framed=True, side=name, depth=round(cut / span, 4),
                        step=round(step, 3), why=why)
    return dict(framed=False, side=None, depth=0.0, step=0.0, why="")


def framed(src):
    """Есть ли вокруг работы поле. src — путь к файлу или массив HxWx3 в [0,1]."""
    return examine(src)["framed"]


# ── проверка и запуск руками ─────────────────────────────────────────────────

DATA = pathlib.Path(os.environ.get("FRAME_GATE_DATA",
                                   "/home/charlie/tessarum-harvest"))


def _check():
    """Прогон по размеченным работам: числа в шапке должны воспроизвестись.

    Разметка — данные, а не код, и в репозитории её нет: labels.json лежит
    рядом с урожаем. Путь берётся из FRAME_GATE_DATA, по умолчанию — папка
    урожая; если файлы окажутся рядом с модулем, берутся они.
    """
    import json
    here = pathlib.Path(__file__).parent
    root = here if (here / "labels.json").exists() else DATA
    try:
        labels = json.load(open(root / "labels.json"))["labels"]
        meas = {r["ref"]: r for r in json.load(open(root / "measured.json"))}
        for r in meas.values():
            r["path"] = str(pathlib.Path("/home/charlie/repos/wallpaper-gen/"
                                         "sources") / f"{r['ref']}.jpg")
        meas.update({r["ref"]: r for r in json.load(open(root / "batch.json"))})
    except FileNotFoundError as e:
        sys.exit(f"нет размеченных данных в {root}: {e}\n"
                 f"положить рядом или указать FRAME_GATE_DATA")
    # Считать только на тех, до кого ворота вообще доходят: одноцветные и
    # створчатые отсеиваются раньше, на них правило про рамку не применяется.
    refs = [r for r in labels if r in meas
            and meas[r]["tf"] >= 0.020 and meas[r]["seams"] < 3]
    tp = fp = fn = tn = 0
    for i, r in enumerate(sorted(refs), 1):
        got = framed(meas[r]["path"])
        want = labels[r] == 1
        tp += got and want
        fp += got and not want
        fn += want and not got
        tn += not got and not want
        if i % 50 == 0:
            print(f"  {i}/{len(refs)}", file=sys.stderr, flush=True)
    print(f"{len(refs)} работ: с рамкой {tp + fn}, чистых {fp + tn}")
    print(f"полнота  {tp / max(1, tp + fn):.1%}  (проходит рамок: {fn})")
    print(f"точность {tp / max(1, tp + fp):.1%}  (лишних отказов: {fp})")


def main(argv):
    if argv and argv[0] == "--check":
        return _check()
    if not argv:
        return print(__doc__)
    for p in argv:
        d = examine(p)
        mark = "РАМКА" if d["framed"] else "  —  "
        note = f'{d["side"]} {d["depth"]:.3f} · {d["why"]}' if d["framed"] else ""
        print(f"{mark}  {pathlib.Path(p).name:36} {note}")


if __name__ == "__main__":
    main(sys.argv[1:])
