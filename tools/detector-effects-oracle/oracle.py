#!/usr/bin/env python3
"""Independent oracle for Prompt 211 (DETECTOR_EFFECTS.md, thresholds.json).

numpy 1.26 and scipy 1.13 only; no Gravitas code. It recomputes, from the stated
definitions, what the kernel must reproduce:
  response   the tanh nonlinearity and its linear limits (scipy.optimize.brentq)
  poisson    expectations and tails of the clipped, compressed charge (scipy.stats.poisson)
  tracks     the deposit of straight tracks on the pixel grid (slab clipping per pixel)
  bleed      the column bleeding algorithm, re-implemented from the stated text
  sampling   pixel-integrated Gaussian peak fractions and proportional-aperture fractions (scipy.special.erf)
  cosmic     (with --frame) an own implementation of van Dokkum's L.A.Cosmic on a pinned frame

usage: oracle.py OUT.json [--frame cr-frame.json]
"""
import json, sys, math
import numpy as np
from scipy.optimize import brentq
from scipy.special import erf
from scipy.stats import poisson
from scipy import ndimage

SEED = 211
FW = 50000.0
GAIN = 1.5
READ = 8.0
BIAS = 500.0


def f(e, k, fw=FW):
    e = np.asarray(e, dtype=float)
    w = fw - k
    return np.where(e <= k, e, k + w * np.tanh((e - k) / w))


def limit(k, d, fw=FW):
    g = lambda e: 1.0 - float(f(e, k, fw)) / e - d
    if g(fw) < 0:
        return None
    return brentq(g, k * (1 + 1e-12), fw, xtol=1e-12, rtol=1e-14, maxiter=500)


def response():
    out = {"fullWell": FW, "knees": {}}
    for kf in (0.5, 0.8, 0.95):
        k = kf * FW
        es = np.linspace(0, FW, 40)
        out["knees"][str(kf)] = {
            "e": es.tolist(),
            "f": f(es, k).tolist(),
            "atFullWell": float(f(FW, k)),
            "limits": {str(d): limit(k, d) for d in (0.001, 0.01, 0.05)},
        }
    return out


def poisson_tables():
    rows = []
    for lev in (0.5, 0.9, 1.0, 1.3, 0.3, 0.7, 0.85, 0.95):
        lam = lev * FW
        hi = int(lam + 14 * math.sqrt(lam)) + 10
        x = np.arange(0, hi)
        p = poisson.pmf(x, lam)
        # the sum is complete to 1e-15
        m = np.minimum(x, FW)
        row = {"level": lev, "lambda": lam, "mass": float(p.sum())}
        row["clipMean"] = float((p * m).sum())
        row["clipVar"] = float((p * m * m).sum() - row["clipMean"] ** 2)
        row["tail"] = float(poisson.sf(FW - 1, lam))
        for kf in (0.8,):
            k = kf * FW
            fm = f(m, k)
            row["nlMean"] = float((p * fm).sum())
            row["nlVar"] = float((p * fm * fm).sum() - row["nlMean"] ** 2)
        rows.append(row)
    return {"gain": GAIN, "readNoise": READ, "bias": BIAS, "rows": rows}


def track_deposit(tr, W, H, dedx=1200.0, thick=1.0, cap=40.0):
    th = tr["theta"]
    L = min(thick * math.tan(th), cap)
    c, s = math.cos(tr["phi"]), math.sin(tr["phi"])
    x0, y0 = tr["x"], tr["y"]
    out = {}
    if L < 1e-9:
        i, j = math.floor(x0 + 0.5), math.floor(y0 + 0.5)
        if 0 <= i < W and 0 <= j < H:
            out[(i, j)] = dedx * thick / math.cos(th)
        return out
    x1, y1 = x0 + L * c, y0 + L * s
    i0, i1 = math.floor(min(x0, x1) + 0.5) - 1, math.floor(max(x0, x1) + 0.5) + 1
    j0, j1 = math.floor(min(y0, y1) + 0.5) - 1, math.floor(max(y0, y1) + 0.5) + 1
    for i in range(max(0, i0), min(W - 1, i1) + 1):
        for j in range(max(0, j0), min(H - 1, j1) + 1):
            lo, hi = 0.0, 1.0
            ok = True
            for p0, d, a, b in ((x0, x1 - x0, i - 0.5, i + 0.5), (y0, y1 - y0, j - 0.5, j + 0.5)):
                if abs(d) < 1e-15:
                    if not (a <= p0 <= b):
                        ok = False
                    continue
                t1, t2 = (a - p0) / d, (b - p0) / d
                if t1 > t2:
                    t1, t2 = t2, t1
                lo, hi = max(lo, t1), min(hi, t2)
            if ok and hi > lo:
                out[(i, j)] = dedx * (hi - lo) * L / math.sin(th)
    return out


TRACKS = [
    {"x": 10.3, "y": 12.7, "phi": 0.7, "theta": 1.2},
    {"x": 16.0, "y": 16.0, "phi": 2.0, "theta": 1.5},
    {"x": 5.2, "y": 9.0, "phi": 0.0, "theta": 1.3},
    {"x": 20.0, "y": 3.3, "phi": math.pi / 2, "theta": 1.4},
    {"x": 7.4, "y": 22.6, "phi": 1.0, "theta": 0.5},
    {"x": -4.0, "y": 10.0, "phi": 0.1, "theta": 1.45},
    {"x": 14.0, "y": 60.0, "phi": -math.pi / 2 + 0.2, "theta": 1.5},
    {"x": 40.5, "y": 40.5, "phi": 0.8, "theta": 1.4},
    {"x": 2.0, "y": 2.0, "phi": math.pi + 0.3, "theta": 1.3},
    {"x": 2.0, "y": 24.4, "phi": 0.05, "theta": 1.55},
    {"x": 10.5, "y": 10.5, "phi": math.pi / 4, "theta": 1.0},
    {"x": 30.4, "y": 40.0, "phi": -math.pi / 2, "theta": 1.2},
]


def tracks():
    W = H = 48
    res = []
    for tr in TRACKS:
        d = track_deposit(tr, W, H)
        # the track's total, were the frame unbounded
        big = track_deposit(tr, 400, 400) if False else None
        res.append({**tr, "deposits": [[i, j, e] for (i, j), e in sorted(d.items())],
                    "sum": sum(d.values()),
                    "full": 1200.0 * min(math.tan(tr["theta"]), 40.0) / math.sin(tr["theta"])})
    return {"width": W, "height": H, "dedx": 1200.0, "thickness": 1.0, "cap": 40.0, "tracks": res}


def bleed_column(q, fw, cap):
    q = [float(v) for v in q]
    n = len(q)
    lost = 0.0
    touched = [False] * n
    # runs of pixels above the full well, in order of increasing row (recomputed after each run)
    y = 0
    while y < n:
        if q[y] > fw:
            a = y
            while y + 1 < n and q[y + 1] > fw:
                y += 1
            b = y
            E = sum(q[i] - fw for i in range(a, b + 1))
            for i in range(a, b + 1):
                q[i] = fw
            half = E / 2.0
            for step, start in ((-1, a - 1), (1, b + 1)):
                rem, p, cnt = half, start, 0
                while rem > 0 and cnt < cap and 0 <= p < n:
                    take = min(max(0.0, fw - q[p]), rem)
                    if take > 0:
                        q[p] += take
                        touched[p] = True
                    rem -= take
                    cnt += 1
                    p += step
                lost += rem
        y += 1
    return q, lost, touched


def bleed():
    rng = np.random.default_rng(SEED)
    cases = []
    for k in range(20):
        H = 64
        sky = float(rng.uniform(20, 3000))
        q = rng.poisson(sky, H).astype(float)
        for _ in range(int(rng.integers(1, 4))):
            c = int(rng.integers(6, H - 6))
            w = int(rng.integers(1, 4))
            for i in range(c, c + w):
                q[i] = FW + float(rng.uniform(100, 60000))
        cap = int(rng.choice([4, 10, 64]))
        after, lost, touched = bleed_column(q, FW, cap)
        cases.append({"before": q.tolist(), "cap": cap, "after": after, "lost": lost,
                      "touched": [i for i, t in enumerate(touched) if t]})
    return {"fullWell": FW, "cases": cases}


def sampling():
    GRID, RATIO = 21, 1.5
    out = {"grid": GRID, "ratio": RATIO, "rows": []}
    for fwhm in (1.0, 1.2, 2.0, 2.8, 4.0):
        s = fwhm / (2 * math.sqrt(2 * math.log(2)))
        r = RATIO * fwhm
        half = int(math.ceil(r)) + 3
        px = np.arange(-half, half + 1)

        def F(c):
            return 0.5 * (erf((px + 0.5 - c) / (s * math.sqrt(2))) - erf((px - 0.5 - c) / (s * math.sqrt(2))))

        peaks, aps = [], []
        ph = (np.arange(GRID) + 0.5) / GRID - 0.5
        for a in ph:
            fx = F(a)
            for b in ph:
                fy = F(b)
                peaks.append(fx[half] * fy[half])
                m = np.hypot(px[:, None] - a, px[None, :] - b) <= r
                aps.append(float((fx[:, None] * fy[None, :] * m).sum()))
        peaks, aps = np.array(peaks), np.array(aps)
        out["rows"].append({"fwhm": fwhm, "peakMin": float(peaks.min()), "peakMax": float(peaks.max()),
                            "apMean": float(aps.mean()), "apRelStd": float(aps.std() / aps.mean())})
    return out


# ---- L.A.Cosmic (van Dokkum 2001, PASP 113, 1420), own implementation -----------------

def lacosmic(img, gain, readnoise, sigclip=4.5, sigfrac=0.3, objlim=5.0, niter=2):
    """img in counts-like units with gain (e-/unit) and read noise (units rms). Returns a boolean mask."""
    img = np.asarray(img, dtype=float)
    mask = np.zeros(img.shape, bool)
    work = img.copy()
    kernel = np.array([[0, -1, 0], [-1, 4, -1], [0, -1, 0]], dtype=float)
    for _ in range(niter):
        # 1. block-replicate 2x, Laplacian, clip negatives, rebin
        big = np.kron(work, np.ones((2, 2)))
        lap = ndimage.convolve(big, kernel, mode="nearest")
        lap[lap < 0] = 0
        L = lap.reshape(img.shape[0], 2, img.shape[1], 2).mean(axis=(1, 3)) * 1.0
        # 2. noise model: median of the 5x5 -> sky-ish, in electrons
        m5 = ndimage.median_filter(work, size=5, mode="nearest")
        m5[m5 <= 0.00001] = 0.00001
        noise = np.sqrt(m5 * gain + readnoise ** 2) / gain
        S = L / (2.0 * noise)
        S = S - ndimage.median_filter(S, size=5, mode="nearest")
        # 3. fine structure image: (median 3x3) - ((median 3x3) median 7x7)
        m3 = ndimage.median_filter(work, size=3, mode="nearest")
        m37 = ndimage.median_filter(m3, size=7, mode="nearest")
        F = m3 - m37
        F[F <= 0.01] = 0.01
        # 4. candidates
        cand = S > sigclip
        # 5. reject the ones that are stars: Laplacian over fine structure
        cand &= (L / F) > objlim
        # 6. grow to neighbours with S > sigfrac * sigclip
        grown = ndimage.binary_dilation(cand, structure=np.ones((3, 3), bool)) & (S > sigfrac * sigclip)
        cand |= grown
        mask |= cand
        # clean flagged pixels with the median of unflagged neighbours (5x5)
        cleaned = work.copy()
        ys, xs = np.nonzero(cand)
        for y, x in zip(ys, xs):
            y0, y1, x0, x1 = max(0, y - 2), min(img.shape[0], y + 3), max(0, x - 2), min(img.shape[1], x + 3)
            patch = work[y0:y1, x0:x1][~mask[y0:y1, x0:x1]]
            if patch.size:
                cleaned[y, x] = np.median(patch)
        work = cleaned
    return mask


def main():
    out_path = sys.argv[1]
    res = {"generator": "tools/detector-effects-oracle/oracle.py", "numpy": np.__version__,
           "seed": SEED, "response": response(), "poisson": poisson_tables(), "tracks": tracks(),
           "bleed": bleed(), "sampling": sampling()}
    if "--frame" in sys.argv:
        fr = json.load(open(sys.argv[sys.argv.index("--frame") + 1]))
        img = (np.array(fr["counts"], dtype=float).reshape(fr["height"], fr["width"]) - fr["bias"]) * fr["gain"]
        m = lacosmic(img, 1.0, fr["readNoise"])
        res["lacosmic"] = {"mask": m.astype(int).flatten().tolist(), "count": int(m.sum()),
                           "params": {"sigclip": 4.5, "sigfrac": 0.3, "objlim": 5.0, "niter": 2}}
    json.dump(res, open(out_path, "w"))


if __name__ == "__main__":
    main()
