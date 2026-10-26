"""Pointer calibration: summary statistics of aimed mouse movements from the SapiMouse dataset.

Download the dataset yourself (https://www.ms.sapientia.ro/~manyi/sapimouse/sapimouse.html), unzip it outside any repo,
then run: python3 -I scripts/pointer-calibration.py /path/to/sapimouse > stats.json
It prints aggregates only (fits, percentiles); never commit the raw data.
"""
import csv, json, math, os, statistics as st, sys

ROOT = sys.argv[1]
PAUSE_MS = 150  # a gap or near-stillness this long separates movements
movements, rests = [], []


def resample(pts, step=10):
    """Uniform 10 ms samples by linear interpolation: [(t, x, y)]."""
    out, j = [], 0
    t = pts[0][0]
    while t <= pts[-1][0]:
        while j + 1 < len(pts) and pts[j + 1][0] < t:
            j += 1
        a, b = pts[j], pts[min(j + 1, len(pts) - 1)]
        q = 0 if b[0] == a[0] else (t - a[0]) / (b[0] - a[0])
        out.append((t, a[1] + (b[1] - a[1]) * q, a[2] + (b[2] - a[2]) * q))
        t += step
    return out


def analyse(seg, press):
    if len(seg) < 6:
        return None
    r = resample(seg)
    if len(r) < 6:
        return None
    sp = [0.0] + [math.dist(r[i][1:], r[i - 1][1:]) / 0.01 for i in range(1, len(r))]
    sp = [(sp[max(0, i - 1)] + sp[i] + sp[min(len(sp) - 1, i + 1)]) / 3 for i in range(len(sp))]
    x0, y0 = r[0][1], r[0][2]
    x1, y1 = press
    D = math.dist((x0, y0), (x1, y1))
    if D < 40:
        return None
    # Trim the still tail before the press so the duration is the movement itself.
    end = len(r) - 1
    while end > 2 and sp[end] < 30:
        end -= 1
    start = 0
    while start < end - 2 and sp[start] < 30:
        start += 1
    MT = (r[end][0] - r[start][0]) / 1000
    if not 0.08 <= MT <= 2.5:
        return None
    seg_sp = sp[start:end + 1]
    pk = max(range(len(seg_sp)), key=lambda i: seg_sp[i])
    vpk = seg_sp[pk]
    # End of the primary submovement: first speed minimum after the peak below 35% of it.
    prim = None
    for i in range(pk + 1, len(seg_sp) - 1):
        if seg_sp[i] < 0.35 * vpk and seg_sp[i] <= seg_sp[i - 1] and seg_sp[i] <= seg_sp[i + 1]:
            prim = i
            break
    # Corrections: later local maxima above 15% of the peak.
    corr = sum(1 for i in range(pk + 2, len(seg_sp) - 1) if seg_sp[i] > 0.15 * vpk and seg_sp[i] >= seg_sp[i - 1] and seg_sp[i] > seg_sp[i + 1])
    ux, uy = (x1 - x0) / D, (y1 - y0) / D
    lat = [(-(p[1] - x0) * uy + (p[2] - y0) * ux) for p in r[start:end + 1]]
    imax = max(range(len(lat)), key=lambda i: abs(lat[i]))
    out = {
        "D": D, "MT": MT, "vpk": vpk, "t2p": pk / max(1, len(seg_sp) - 1),
        "bend": lat[imax] / D, "bend_at": imax / max(1, len(lat) - 1), "dx": x1 - x0, "corr": corr,
    }
    if prim is not None:
        px, py = r[start + prim][1], r[start + prim][2]
        along = ((px - x0) * ux + (py - y0) * uy) / D
        side = (-(px - x0) * uy + (py - y0) * ux) / D
        out.update(prim_along=along, prim_side=side, prim_t=prim / max(1, len(seg_sp) - 1))
    return out


for dirpath, _, files in os.walk(ROOT):
    for name in files:
        if not name.endswith(".csv"):
            continue
        rows = []
        with open(os.path.join(dirpath, name)) as fh:
            for row in csv.DictReader(fh):
                try:
                    rows.append((int(row["client timestamp"]), row["button"], row["state"], int(row["x"]), int(row["y"])))
                except (ValueError, KeyError):
                    continue
        seg = []
        for t, button, state, x, y in rows:
            if state == "Move" and button == "NoButton":
                if seg and t - seg[-1][0] > PAUSE_MS:
                    gap = (t - seg[-1][0]) / 1000
                    if gap >= 0.5:
                        rests.append({"gap": gap})
                    seg = []
                seg.append((t, x, y))
            elif state == "Pressed":
                # Keep only the movement since the last pause (the aimed part).
                cut = len(seg) - 1
                while cut > 0 and seg[cut][0] - seg[cut - 1][0] <= PAUSE_MS:
                    cut -= 1
                m = analyse(seg[cut:], (x, y)) if seg else None
                if m:
                    movements.append(m)
                seg = []
            else:
                seg = []


def q(vals, ps=(10, 25, 50, 75, 90)):
    s = sorted(vals)
    return {f"p{p}": round(s[min(len(s) - 1, int(p / 100 * len(s)))], 3) for p in ps}


bins = [(40, 100), (100, 200), (200, 400), (400, 800), (800, 2000)]
by = {f"{a}-{b}px": [m for m in movements if a <= m["D"] < b] for a, b in bins}
# MT = a + b * log2(D / 40 + 1), least squares
xs = [math.log2(m["D"] / 40 + 1) for m in movements]
ys = [m["MT"] for m in movements]
mx, my = st.mean(xs), st.mean(ys)
b = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sum((x - mx) ** 2 for x in xs)
a = my - b * mx
# peak speed = k * D^p, log-log fit
lx = [math.log(m["D"]) for m in movements]
ly = [math.log(m["vpk"]) for m in movements]
mlx, mly = st.mean(lx), st.mean(ly)
p = sum((x - mlx) * (y - mly) for x, y in zip(lx, ly)) / sum((x - mlx) ** 2 for x in lx)
k = math.exp(mly - p * mlx)
prim = [m for m in movements if "prim_along" in m]
right = [m for m in movements if m["dx"] > 20]
left = [m for m in movements if m["dx"] < -20]
print(json.dumps({
    "movements": len(movements),
    "MT_fit": {"a": round(a, 3), "b": round(b, 3), "form": "MT = a + b*log2(D/40 + 1)"},
    "vpeak_fit": {"k": round(k, 2), "p": round(p, 3), "form": "vpeak = k * D^p (px/s)"},
    "by_distance": {key: {"n": len(v), "MT": q([m["MT"] for m in v]) if v else None, "vpk": q([m["vpk"] for m in v]) if v else None} for key, v in by.items()},
    "time_to_peak": q([m["t2p"] for m in movements]),
    "bend_abs": q([abs(m["bend"]) for m in movements]),
    "bend_at": q([m["bend_at"] for m in movements]),
    "bend_rightward_median": round(st.median([m["bend"] for m in right]), 4),
    "bend_leftward_median": round(st.median([m["bend"] for m in left]), 4),
    "primary_found_share": round(len(prim) / len(movements), 3),
    "primary_along": q([m["prim_along"] for m in prim]),
    "primary_side": q([m["prim_side"] for m in prim]),
    "primary_t": q([m["prim_t"] for m in prim]),
    "undershoot_share": round(sum(1 for m in prim if m["prim_along"] < 1) / len(prim), 3),
    "corrections": {str(c): sum(1 for m in movements if min(m["corr"], 3) == c) for c in range(4)},
    "rest_gaps_s": q([r["gap"] for r in rests]),
}, indent=1))
