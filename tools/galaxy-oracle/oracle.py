# The independent oracle of Prompt 248 (GALAXY_SPECTRA.md): numpy and scipy, no Gravitas code.
# It reads tests/fixtures/galaxy/oracle-inputs.json (forward-model spectra, templates and grids) and writes
# tests/fixtures/galaxy/oracle-results.json:
#   python3 tools/galaxy-oracle/oracle.py > tests/fixtures/galaxy/oracle-results.json
# It implements, from the rule written in tests/fixtures/galaxy/thresholds.json (GALAXY-RULE-1 X2 to X5, L2, B1,
# B2), a correlation by FFT (scipy.signal.fftconvolve) at integer lags, the refinement by scipy's bounded
# scalar minimiser over scipy's natural cubic spline, the Gaussian lines by scipy.optimize.curve_fit, and the
# break by numpy. It is an independent implementation by the same author, not a cited tool (B5 is NOT RUN
# until one is supplied).
import json
import sys
import numpy as np
import scipy
import scipy.optimize as opt
import scipy.signal as sig
import scipy.interpolate as interp
from scipy.special import ndtr

path = sys.argv[1] if len(sys.argv) > 1 else "tests/fixtures/galaxy/oracle-inputs.json"
D = json.load(open(path))
W = D["highPassWindow"]


def grid(g):
    return 10.0 ** (g["log10Start"] + g["log10Step"] * np.arange(g["samples"]))


lam = grid(D["grid"])
tlam = grid(D["templateGrid"])
step = D["grid"]["log10Step"]
L0 = np.log10(lam[0])
T0 = np.log10(tlam[0])
N = lam.size
M = tlam.size


def highpass(y):
    n = y.size
    half = W // 2
    cum = np.concatenate([[0.0], np.cumsum(y)])
    i = np.arange(n)
    lo = np.maximum(0, i - half)
    hi = np.minimum(n - 1, i + half)
    return y - (cum[hi + 1] - cum[lo]) / (hi - lo + 1)


def correlate(f, w, t, zmin, zmax):
    """Integer-lag S, T by FFT; returns lags and q over the lags with enough overlap."""
    wf = w * f
    # S(k) = sum_i wf_i t_{i-k}: the cross-correlation of wf with t at lag k
    S_full = sig.fftconvolve(wf, t[::-1], mode="full")  # index n = k + (M - 1)
    T_full = sig.fftconvolve(w, (t * t)[::-1], mode="full")
    lag_lo = int(np.ceil((np.log10(1 + zmin) - (L0 - T0)) / step))
    lag_hi = int(np.floor((np.log10(1 + zmax) - (L0 - T0)) / step))
    min_overlap = max(50, int(np.ceil(0.5 * min(N, M))))
    lags = []
    q = []
    for k in range(lag_lo, lag_hi + 1):
        lo = max(0, k)
        hi = min(N - 1, M - 1 + k)
        if hi - lo + 1 < min_overlap:
            continue
        S = S_full[k + M - 1]
        T = T_full[k + M - 1]
        lags.append(k)
        q.append(S / np.sqrt(T) if T > 0 else 0.0)
    return np.array(lags), np.array(q)


def xc(flux, sigma, tflux, zmin, zmax):
    f = highpass(np.asarray(flux))
    t = highpass(np.asarray(tflux))
    w = 1.0 / np.asarray(sigma) ** 2
    lags, q = correlate(f, w, t, zmin, zmax)
    b = int(np.argmax(q))
    k0 = lags[b]
    spline = interp.CubicSpline(np.arange(M), t, bc_type="natural")
    wf = w * f

    def qat(k):
        lo = max(0, int(np.ceil(k)))
        hi = min(N - 1, int(np.floor(M - 1 + k)))
        i = np.arange(lo, hi + 1)
        tv = spline(i - k)
        S = np.sum(wf[i] * tv)
        T = np.sum(w[i] * tv * tv)
        return S / np.sqrt(T)

    res = opt.minimize_scalar(lambda k: -qat(k), bounds=(k0 - 1, k0 + 1), method="bounded", options={"xatol": 1e-9})
    kb = res.x
    qp = qat(kb)
    h = 0.1
    qpp = (qat(kb + h) - 2 * qp + qat(kb - h)) / h ** 2
    z = 10.0 ** (L0 - T0 + kb * step) - 1
    sk = 1.0 / np.sqrt(qp * -qpp)
    sz = (1 + z) * np.log(10) * step * sk
    return dict(z=float(z), sigmaZ=float(sz), q=float(qp), lag=float(kb)), lags, q


def d4000(flux, sigma, z, bands, kind="f-lambda"):
    wd = np.empty_like(lam)
    wd[0] = lam[1] - lam[0]
    wd[-1] = lam[-1] - lam[-2]
    wd[1:-1] = 0.5 * (lam[2:] - lam[:-2])
    flux = np.asarray(flux)
    sigma = np.asarray(sigma)
    out = {}
    for name in ("blueNm", "redNm"):
        lo, hi = bands[name]
        m = (lam >= lo * (1 + z)) & (lam <= hi * (1 + z))
        sc = lam[m] ** 2 if kind == "f-lambda" else 1.0
        mean = np.sum(wd[m] * sc * flux[m]) / np.sum(wd[m])
        var = np.sum((wd[m] * sc * sigma[m]) ** 2) / np.sum(wd[m]) ** 2
        out[name] = (mean, var)
    D_ = out["redNm"][0] / out["blueNm"][0]
    rel = out["redNm"][1] / out["redNm"][0] ** 2 + out["blueNm"][1] / out["blueNm"][0] ** 2
    return float(D_), float(D_ * np.sqrt(rel))


def lsf_sigma_px(R):
    return 1.0 / (R * 2 * np.sqrt(2 * np.log(2)) * np.log(10) * step)


def gauss_line(x, mu, s, F, c0, c1, x0):
    return c0 + c1 * (x - x0) + F * (ndtr((x + 0.5 - mu) / s) - ndtr((x - 0.5 - mu) / s))


def fit_line(flux, sigma, guess_nm, R):
    n = lam.size
    sig_lsf = lsf_sigma_px(R)
    fwhm_lsf = sig_lsf * 2 * np.sqrt(2 * np.log(2))
    i0 = int(np.argmin(np.abs(lam - guess_nm)))
    half = max(8, int(np.ceil(4 * fwhm_lsf)))
    out = None
    for _ in range(2):
        lo = max(0, i0 - half)
        hi = min(n - 1, i0 + half)
        x = np.arange(lo, hi + 1).astype(float)
        y = flux[lo : hi + 1]
        s = sigma[lo : hi + 1]
        x0 = float(i0)
        c0 = float(np.median(y))
        F = float((y[np.argmin(np.abs(x - i0))] - c0) * sig_lsf * np.sqrt(2 * np.pi))
        p, cov = opt.curve_fit(lambda xx, mu, sg, FF, a, b: gauss_line(xx, mu, sg, FF, a, b, x0), x, y, p0=[i0, sig_lsf, F, c0, 0.0], sigma=s, absolute_sigma=True, maxfev=20000)
        mu, sg = p[0], abs(p[1])
        fwhm = sg * 2 * np.sqrt(2 * np.log(2))
        half2 = int(np.ceil(3 * fwhm))
        if half2 > half and out is None:
            out = (p, cov)
            half = half2
            i0 = int(round(mu))
            continue
        out = (p, cov)
        break
    p, cov = out
    mu = p[0]
    smu = float(np.sqrt(cov[0, 0]))
    centre = float(np.interp(mu, np.arange(n), lam))
    j = int(min(n - 2, max(0, np.floor(mu))))
    disp = lam[j + 1] - lam[j]
    return centre, smu * disp


results = dict(versions=dict(numpy=np.__version__, scipy=scipy.__version__), note="independent implementation by the same author (numpy, scipy), no Gravitas code; not a cited tool")
zr = D["zRange"]
tm = D["templates"]
res_xc = []
res_fft = []
res_break = []
res_lines = []
for idx, c in enumerate(D["cases"]):
    if idx < 8:
        r, lags, q = xc(c["flux"], np.full(N, c["sigmaPixel"]), tm[c["kind"]]["flux"], zr["min"], zr["max"])
        res_xc.append(dict(id=c["id"], kind=c["kind"], **r))
        if idx < 4:
            res_fft.append(dict(id=c["id"], lag0=int(lags[0]), q=[float(v) for v in q]))
        # the break at the correlation's own redshift and at the forward model's redshift
        db, sb = d4000(c["flux"], np.full(N, c["sigmaPixel"]), r["z"], D["breakBands"])
        res_break.append(dict(id=c["id"], z=r["z"], D=db, sigma=sb))
    if c["kind"] == "star-forming" and idx in (0, 2, 4, 6, 8, 9):
        flux = np.asarray(c["flux"])
        sigma = np.asarray(np.full(N, c["sigmaPixel"]))
        fits = []
        for l in c["lines"]:
            try:
                centre, sc = fit_line(flux, sigma, l["observedNm"], c["resolvingPower"])
            except Exception:
                continue
            if not (np.isfinite(centre) and np.isfinite(sc) and sc > 0):
                continue
            fits.append(dict(id=l["id"], z=centre / l["restNm"] - 1, sigmaZ=sc / l["restNm"]))
        res_lines.append(dict(id=c["id"], lines=fits))
results["b1"] = res_xc
results["b2"] = res_fft
results["b3"] = res_break
results["b4"] = res_lines
json.dump(results, sys.stdout, indent=1)
print()
