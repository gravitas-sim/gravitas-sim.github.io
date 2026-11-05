# The independent oracle of Prompt 249 (GALAXY_MORPHOLOGY.md): numpy and scipy, no Gravitas code.
# It reads tests/fixtures/morphology/oracle-inputs.json (forward-model manifests only) and writes
# tests/fixtures/morphology/oracle-results.json:
#   python3 tools/morphology-oracle/oracle.py > tests/fixtures/morphology/oracle-results.json
# It implements, from the forward model and the rule MORPH-RULE-1 written in tests/fixtures/morphology/thresholds.json:
#   forward   the elliptical Sersic (b_n from scipy.special.gammaincinv), a clump, 5 by 5 sub-pixel means (15 by 15
#             within 4 pixels of the centre), the separable Gaussian PSF by scipy.ndimage.convolve1d, zero padded;
#   measure   the rim sky, the elliptical growth by SORTING 5 by 5 sub-pixels (the kernel bins 3 by 3 into 0.05 pixel
#             bins), the Petrosian radius, the fixed point of the second moments (started from the TRUTH geometry,
#             the kernel starts from its own detection), the radii, C, the profile, and the asymmetry by
#             scipy.ndimage.map_coordinates (bilinear);
#   truth     for the coverage legs, r_P, the flux inside 2 r_P and R50 of each ensemble galaxy's noise-free image
#             at the TRUE centre, shape and sky.
# It is an independent implementation by the same author, not a cited photometry pipeline (E1 is NOT RUN).
import json
import sys
import numpy as np
import scipy
import scipy.ndimage as ndi
from scipy.special import gammaincinv, gammaln

path = sys.argv[1] if len(sys.argv) > 1 else "tests/fixtures/morphology/oracle-inputs.json"
D = json.load(open(path))
W = D["world"]["width"]
H = D["world"]["height"]
RULE = D["rule"]
FWHM = 3.0
SIGMA_PER_FWHM = 1.0 / (2.0 * np.sqrt(2.0 * np.log(2.0)))
S_ORACLE = 5


def sersic_flux_factor(n):
    b = gammaincinv(2 * n, 0.5)
    return b, 2 * np.pi * n * np.exp(b + gammaln(2 * n) - 2 * n * np.log(b))


def surf_fn(c):
    th = np.deg2rad(c["paDeg"])
    cs, sn = np.cos(th), np.sin(th)
    q = c["q"]
    f = 1.0 - c["clump"]["fraction"] if c.get("clump") else 1.0
    b, fac = sersic_flux_factor(c["n"])
    ie = f * c["flux"] / (fac * c["re"] ** 2 * q)
    clump = c.get("clump")
    if clump:
        sc = 0.25 * c["re"]
        cx = c["x0"] + 1.5 * c["re"] * cs
        cy = c["y0"] + 1.5 * c["re"] * sn
        amp = clump["fraction"] * c["flux"] / (2 * np.pi * sc * sc)

    def fn(x, y):
        dx, dy = x - c["x0"], y - c["y0"]
        u = dx * cs + dy * sn
        v = -dx * sn + dy * cs
        r = np.sqrt(u * u + (v / q) ** 2)
        out = ie * np.exp(-b * ((r / c["re"]) ** (1.0 / c["n"]) - 1.0))
        if clump:
            out = out + amp * np.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (2 * sc * sc))
        return out

    return fn


def forward(c):
    """Noise-free PSF-convolved model image, no sky."""
    fn = surf_fn(c)
    J, I = np.mgrid[0:H, 0:W].astype(float)
    s = D["world"]["subSamples"]
    off = (np.arange(s) + 0.5) / s - 0.5
    acc = np.zeros((H, W))
    for b in off:
        for a in off:
            acc += fn(I + a, J + b)
    img = acc / (s * s)
    near = np.hypot(I - c["x0"], J - c["y0"]) <= D["world"]["coreRadius"]
    sc = D["world"]["coreSubSamples"]
    offc = (np.arange(sc) + 0.5) / sc - 0.5
    ii, jj = I[near], J[near]
    accn = np.zeros(ii.shape)
    for b in offc:
        for a in offc:
            accn += fn(ii + a, jj + b)
    img[near] = accn / (sc * sc)
    sigma = c["psfFwhm"] * SIGMA_PER_FWHM
    half = int(np.ceil(4 * sigma))
    d = np.arange(-half, half + 1)
    w = np.exp(-(d * d) / (2 * sigma * sigma))
    w /= w.sum()
    img = ndi.convolve1d(img, w, axis=1, mode="constant", cval=0.0)
    img = ndi.convolve1d(img, w, axis=0, mode="constant", cval=0.0)
    return img


def rim_width():
    return max(RULE["rimMin"] if "rimMin" in RULE else 8, int(np.floor(0.075 * min(W, H) + 0.5)))


def sky_of(values, var):
    rim = max(8, int(np.floor(0.075 * min(W, H) + 0.5)))
    J, I = np.mgrid[0:H, 0:W]
    mask = (I < rim) | (J < rim) | (I >= W - rim) | (J >= H - rim)
    v, s2 = values[mask], var[mask]
    mean = v.mean()
    kept = np.ones(v.shape, bool)
    for p in range(5):
        k = np.abs(v - mean) <= 3 * np.sqrt(s2)
        if p > 0 and k.sum() == kept.sum():
            break
        kept = k
        mean = v[kept].mean()
    return mean, np.sqrt(s2[kept].sum()) / kept.sum(), rim


def a_limit(g, rim):
    c, s = np.cos(g["pa"]), np.sin(g["pa"])
    kx = np.sqrt(c * c + g["q"] ** 2 * s * s)
    ky = np.sqrt(s * s + g["q"] ** 2 * c * c)
    return min((g["x"] - (rim - 0.5)) / kx, (W - rim - 0.5 - g["x"]) / kx,
               (g["y"] - (rim - 0.5)) / ky, (H - rim - 0.5 - g["y"]) / ky)


class Growth:
    def __init__(self, sub, g, mmax, s=S_ORACLE):
        c, sn = np.cos(g["pa"]), np.sin(g["pa"])
        r = mmax + 1.5
        i0, i1 = max(0, int(np.floor(g["x"] - r))), min(W - 1, int(np.ceil(g["x"] + r)))
        j0, j1 = max(0, int(np.floor(g["y"] - r))), min(H - 1, int(np.ceil(g["y"] + r)))
        off = (np.arange(s) + 0.5) / s - 0.5
        I, J = np.meshgrid(np.arange(i0, i1 + 1), np.arange(j0, j1 + 1))
        ms, fs = [], []
        for b in off:
            for a in off:
                x, y = I + a - g["x"], J + b - g["y"]
                u = x * c + y * sn
                v = (-x * sn + y * c) / g["q"]
                ms.append(np.sqrt(u * u + v * v).ravel())
                fs.append((sub[j0:j1 + 1, i0:i1 + 1] / (s * s)).ravel())
        m = np.concatenate(ms)
        f = np.concatenate(fs)
        keep = m <= mmax + 0.5
        m, f = m[keep], f[keep]
        order = np.argsort(m, kind="stable")
        self.m = m[order]
        self.cf = np.cumsum(f[order])
        self.ca = np.cumsum(np.full(self.m.shape, 1.0 / (s * s)))

    def F(self, a):
        return np.interp(a, self.m, self.cf, left=0.0)

    def A(self, a):
        return np.interp(a, self.m, self.ca, left=0.0)

    def radius(self, frac):
        k = int(np.searchsorted(self.cf, frac))
        if k <= 0 or k >= self.m.size:
            return float("nan")
        t = (frac - self.cf[k - 1]) / (self.cf[k] - self.cf[k - 1])
        return self.m[k - 1] + t * (self.m[k] - self.m[k - 1])


def petrosian(G, amax):
    f0, f1 = RULE["annulusFactors"]
    prev_a = prev_eta = None
    a = 0.25 * FWHM
    while f1 * a <= amax:
        inside = G.F(a) / G.A(a)
        ann = (G.F(f1 * a) - G.F(f0 * a)) / (G.A(f1 * a) - G.A(f0 * a))
        eta = ann / inside if G.F(a) > 0 else -np.inf
        if eta <= RULE["petrosianEta"]:
            if prev_eta is None:
                return a
            t = (prev_eta - RULE["petrosianEta"]) / (prev_eta - eta)
            return float(np.exp(np.log(prev_a) + t * (np.log(a) - np.log(prev_a))))
        prev_a, prev_eta = a, eta
        a *= RULE["radiusGridRatio"]
    return float("nan")


def moments_inside(sub, g, A, s=S_ORACLE):
    c, sn = np.cos(g["pa"]), np.sin(g["pa"])
    r = A + 1.5
    i0, i1 = max(0, int(np.floor(g["x"] - r))), min(W - 1, int(np.ceil(g["x"] + r)))
    j0, j1 = max(0, int(np.floor(g["y"] - r))), min(H - 1, int(np.ceil(g["y"] + r)))
    off = (np.arange(s) + 0.5) / s - 0.5
    I, J = np.meshgrid(np.arange(i0, i1 + 1), np.arange(j0, j1 + 1))
    cnt = np.zeros(I.shape)
    for b in off:
        for a in off:
            x, y = I + a - g["x"], J + b - g["y"]
            u = x * c + y * sn
            v = (-x * sn + y * c) / g["q"]
            cnt += (u * u + v * v <= A * A)
    w = cnt / (s * s) * sub[j0:j1 + 1, i0:i1 + 1]
    sw = w.sum()
    x = (w * I).sum() / sw
    y = (w * J).sum() / sw
    sxx = (w * (I - x) ** 2).sum() / sw
    sxy = (w * (I - x) * (J - y)).sum() / sw
    syy = (w * (J - y) ** 2).sum() / sw
    return x, y, sxx, sxy, syy


def eigen_shape(sxx, sxy, syy):
    m = 0.5 * (sxx + syy)
    d = np.sqrt(max(0.0, (0.5 * (sxx - syy)) ** 2 + sxy ** 2))
    l1, l2 = m + d, m - d
    pa = 0.5 * np.arctan2(2 * sxy, sxx - syy)
    if pa < 0:
        pa += np.pi
    return np.sqrt(l2 / l1), pa


def fixed_point(sub, rim, start):
    g = dict(start)
    for _ in range(RULE["maxPasses"] if "maxPasses" in RULE else 15):
        lim = a_limit(g, rim)
        G = Growth(sub, g, lim)
        rP = petrosian(G, lim)
        x, y, sxx, sxy, syy = moments_inside(sub, g, RULE["totalRadiusFactor"] * rP)
        q, pa = eigen_shape(sxx, sxy, syy)
        q = min(q, 1.0)
        dpa = abs(pa - g["pa"])
        dpa = min(dpa, np.pi - dpa)
        done = (abs(q - g["q"]) < 0.001 and (dpa < np.deg2rad(0.1) or q > 0.995)
                and np.hypot(x - g["x"], y - g["y"]) < 0.01)
        g = {"x": x, "y": y, "q": q, "pa": pa}
        if done:
            break
    lim = a_limit(g, rim)
    G = Growth(sub, g, lim)
    return g, G, petrosian(G, lim)


def asymmetry(sub, g, R):
    xs, ys = [], []
    for j in range(int(np.floor(g["y"] - R)), int(np.ceil(g["y"] + R)) + 1):
        for i in range(int(np.floor(g["x"] - R)), int(np.ceil(g["x"] + R)) + 1):
            if np.hypot(i - g["x"], j - g["y"]) <= R:
                xs.append(i)
                ys.append(j)
    xs, ys = np.array(xs, float), np.array(ys, float)
    vals = sub[ys.astype(int), xs.astype(int)]

    def rot(px, py, cx, cy):
        return ndi.map_coordinates(sub, [2 * cy - py, 2 * cx - px], order=1, mode="nearest")

    def Afn(cx, cy):
        return np.abs(vals - rot(xs, ys, cx, cy)).sum() / np.abs(vals).sum()

    cx, cy = g["x"], g["y"]
    best = Afn(cx, cy)
    step = 0.5
    for _ in range(8):
        for _ in range(20):
            improved = False
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    if dx == 0 and dy == 0:
                        continue
                    a = Afn(cx + dx * step, cy + dy * step)
                    if a < best:
                        best, cx, cy, improved = a, cx + dx * step, cy + dy * step, True
            if not improved:
                break
        step /= 2
    norm = np.abs(vals).sum()
    cands = []
    for (px, py) in [(R + 2, R + 2), (W - 3 - R, R + 2), (R + 2, H - 3 - R), (W - 3 - R, H - 3 - R)]:
        px, py = int(np.floor(px + 0.5)), int(np.floor(py + 0.5))
        if px - R >= 1 and py - R >= 1 and px + R <= W - 2 and py + R <= H - 2:
            cands.append((px, py))
    cands.sort(key=lambda p: -np.hypot(p[0] - cx, p[1] - cy))
    if not cands or np.hypot(cands[0][0] - cx, cands[0][1] - cy) < 2 * R:
        return None, best
    px0, py0 = cands[0]
    pcx, pcy = px0 + (cx - np.floor(cx)), py0 + (cy - np.floor(cy))
    ps, qs = [], []
    for j in range(int(np.floor(pcy - R)), int(np.ceil(pcy + R)) + 1):
        for i in range(int(np.floor(pcx - R)), int(np.ceil(pcx + R)) + 1):
            if np.hypot(i - pcx, j - pcy) <= R:
                ps.append(i)
                qs.append(j)
    ps, qs = np.array(ps, float), np.array(qs, float)
    pv = sub[qs.astype(int), ps.astype(int)]
    bg = np.abs(pv - rot(ps, qs, pcx, pcy)).sum() * (xs.size / ps.size) / norm
    return best - bg, best


def measure(c, img_model):
    sky = D["world"]["skyElectrons"]
    values = img_model + sky
    var = img_model + sky + D["world"]["readNoise"] ** 2
    level, _, rim = sky_of(values, var)
    sub = values - level
    start = {"x": c["x0"], "y": c["y0"], "q": c["q"], "pa": np.deg2rad(c["paDeg"]) % np.pi}
    g, G, rP = fixed_point(sub, rim, start)
    A = RULE["totalRadiusFactor"] * rP
    fT = float(G.F(A))
    r50, r20, r80 = G.radius(0.5 * fT), G.radius(0.2 * fT), G.radius(0.8 * fT)
    k = RULE["profileAnnuli"]
    e0, e1 = 0.5 * FWHM, A
    prof = []
    for j in range(k):
        lo = e0 * (e1 / e0) ** (j / k)
        hi = e0 * (e1 / e0) ** ((j + 1) / k)
        prof.append(float((G.F(hi) - G.F(lo)) / (G.A(hi) - G.A(lo))))
    a_val, a_raw = asymmetry(sub, g, 2 * rP * np.sqrt(g["q"]))
    return {
        "x": float(g["x"]), "y": float(g["y"]), "q": float(g["q"]),
        "paDeg": float(np.rad2deg(g["pa"]) % 180), "rPetrosian": float(rP),
        "r50": float(r50), "r20": float(r20), "r80": float(r80), "flux": fT,
        "concentration": float(5 * np.log10(r80 / r20)),
        "asymmetry": None if a_val is None else float(a_val), "asymmetryRaw": float(a_raw),
        "profile": prof, "skyLevel": float(level),
    }


def truth_of(c, img_model):
    """r_P, the flux inside 2 r_P and R50 at the TRUE centre, shape and sky (no sky error)."""
    g = {"x": c["x0"], "y": c["y0"], "q": c["q"], "pa": np.deg2rad(c["paDeg"]) % np.pi}
    rim = max(8, int(np.floor(0.075 * min(W, H) + 0.5)))
    lim = a_limit(g, rim)
    G = Growth(img_model, g, lim)
    rP = petrosian(G, lim)
    fT = float(G.F(RULE["totalRadiusFactor"] * rP))
    return {"rPetrosian": float(rP), "flux": fT, "r50": float(G.radius(0.5 * fT)),
            "magnitude": float(25.0 - 2.5 * np.log10(fT))}


out = {"versions": {"python": sys.version.split()[0], "numpy": np.__version__, "scipy": scipy.__version__},
       "note": "an independent implementation by the same author (numpy, scipy, no Gravitas code); not a cited photometry pipeline"}
cases = []
for c in D["cases"]:
    img = forward(c)
    sp = [float(img[y, x]) for (x, y) in D["samplePixels"]]
    cases.append({"id": c["id"], "samples": sp, "total": float(img.sum()), "peak": float(img.max()),
                  "measure": measure(c, img)})
out["cases"] = cases
out["ensemble"] = [dict(id=c["id"], **truth_of(c, forward(c))) for c in D["ensemble"]]
json.dump(out, sys.stdout)
sys.stdout.write("\n")
