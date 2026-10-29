"""Independent oracle for Prompt 213 (the spectrograph model and wavelength calibration), SPECTROGRAPH.md.

Run under `python3 oracle.py OUT.json` from an empty directory (numpy, scipy, astropy). Nothing here imports Gravitas code; the only thing it reads
of the repository is the line pack's numbers (js/data/radiation/lines.js, parsed as text). It writes the reference values the
JavaScript validator compares the kernel with:

  A2  the area of a Gaussian over a pixel from scipy.special.erf and erfc at 300 fixed cases (and 12 far-tail cases)
  A4  the central pixel's area of a Gaussian line at four samplings
  A6  the Planck function integrated over 0.1 nm pixels by scipy.integrate.quad
  A7  relativistic Doppler wavelengths of H-alpha for seven velocities (closed form)
  B1  a numerical convolution (template sampled at 1/20 of the line-spread sigma, scipy.ndimage.gaussian_filter1d, pixel
      averages by cumulative trapezoid) of the science template at three resolving powers
  B2  the reference spectrograph's noisy arc (numpy PCG64 seed 213, expected-count errors); every isolated line fitted
      by scipy.optimize.curve_fit (a pixel-integrated Gaussian with erf, plus a linear continuum) and by astropy
      LevMarLSQFitter (a point-sampled Gaussian1D plus Linear1D)
  B3  the wavelength solution at degrees 1, 2, 3 on those lines by numpy.linalg.lstsq (weighted Vandermonde in the scaled
      abscissa) and by astropy LinearLSQFitter with Chebyshev1D, at 50 pixels
  F1  the line signal-to-noise discrete sum, evaluated independently
  F2  the slit throughput from scipy.integrate.dblquad
  F3  the resolving-power optimum from scipy.optimize.minimize_scalar

Seed 213.
"""
import json, os, re, sys, time, types
import numpy as np
from scipy import integrate, optimize, special as sp
from scipy.ndimage import gaussian_filter1d
# astropy.table imports PyYAML at load; modeling never reads YAML, so an empty stand-in lets the import finish when PyYAML is absent
try:
    import yaml  # noqa: F401
except ModuleNotFoundError:
    sys.modules["yaml"] = types.ModuleType("yaml")
from astropy.modeling import fitting, models

SEED = 213
rng = np.random.Generator(np.random.PCG64(SEED))
FWHM_PER_SIGMA = 2 * np.sqrt(2 * np.log(2))
C_KM_S = 299792.458
H, C, KB = 6.62607015e-34, 299792458.0, 1.380649e-23


def r12(x):
    """Round to 12 significant digits, recursively."""
    if isinstance(x, (float, np.floating)):
        return float(f"{float(x):.12g}")
    if isinstance(x, (list, tuple)):
        return [r12(v) for v in x]
    if isinstance(x, np.ndarray):
        return [r12(v) for v in x.tolist()]
    if isinstance(x, dict):
        return {k: r12(v) for k, v in x.items()}
    return x


# ----------------------------------------------------------------------------------------------- the line pack (text)
def read_lines():
    src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "js", "data", "radiation", "lines.js"), encoding="utf-8").read()
    out = []
    for m in re.finditer(r"id: '([^']+)',\s*name: '[^']*',\s*species: '[^']*',\s*kind: '([^']*)',\s*air: ([0-9.]+),\s*vacuum: ([0-9.]+),", src):
        out.append({"id": m.group(1), "kind": m.group(2), "air": float(m.group(3)), "vacuum": float(m.group(4))})
    assert len(out) == 23, len(out)
    return out


LINES = read_lines()

# ----------------------------------------------------------------------------------------------- the reference instrument
N_PIX = 2048
COEF = (380.0, 0.105, -1e-7, 4e-12)
LSF_FWHM = 0.3
READ_NOISE = 5.0
CONT_E = 20.0
SCI = {"T": 6000.0, "S500": 1.0e5, "sigmaInt": 0.10, "depth": 0.40, "ids": ["h-beta", "h-gamma", "h-delta", "h-epsilon"], "v": 120.0}


def lam_of_x(x):
    c0, c1, c2, c3 = COEF
    return c0 + c1 * x + c2 * x**2 + c3 * x**3


def dlam_dx(x):
    c0, c1, c2, c3 = COEF
    return c1 + 2 * c2 * x + 3 * c3 * x**2


def x_of_lam(lam):
    return optimize.brentq(lambda x: lam_of_x(x) - lam, -50, N_PIX + 50, xtol=1e-13, rtol=1e-14)


def pixel_area(mu, sigma, a, b):
    """Area of a unit-area Gaussian over [a, b]: erf in the bulk, erfc in the tails (no cancellation)."""
    za, zb = (a - mu) / sigma, (b - mu) / sigma
    if min(za, zb) > 0:
        return 0.5 * (sp.erfc(za / np.sqrt(2)) - sp.erfc(zb / np.sqrt(2)))
    if max(za, zb) < 0:
        return 0.5 * (sp.erfc(-zb / np.sqrt(2)) - sp.erfc(-za / np.sqrt(2)))
    return 0.5 * (sp.erf(zb / np.sqrt(2)) - sp.erf(za / np.sqrt(2)))


# ----------------------------------------------------------------------------------------------- A2
def a2():
    cases = []
    for _ in range(300):
        sigma = float(10 ** rng.uniform(-1, 1))
        mu = float(rng.uniform(-3, 3))
        a = float(rng.uniform(-6, 6) * sigma + mu)
        b = a + float(10 ** rng.uniform(-2, 0.5)) * sigma
        # the inputs are rounded to the 12 digits the file keeps before the value is computed from them
        mu, sigma, a, b = (float(f"{v:.12g}") for v in (mu, sigma, a, b))
        cases.append({"mu": mu, "sigma": sigma, "a": a, "b": b, "value": pixel_area(mu, sigma, a, b)})
    tail = []
    for z in (8, 10, 12, 15, 20, 25, 30):
        mu, sigma = 0.0, 0.7
        a, b = z * sigma, (z + 0.5) * sigma
        # erfc evaluated at high precision by the continued-fraction-free closed form: scipy's erfcx is exact here
        va = sp.erfcx(a / sigma / np.sqrt(2)) * np.exp(-0.5 * (a / sigma) ** 2)
        vb = sp.erfcx(b / sigma / np.sqrt(2)) * np.exp(-0.5 * (b / sigma) ** 2)
        tail.append({"mu": mu, "sigma": sigma, "a": a, "b": b, "value": 0.5 * (va - vb)})
    return {"cases": cases, "tail": tail}


def a4():
    out = []
    for s in (0.5, 1, 2, 5):
        d = 0.105
        sigma_nm = LSF_FWHM / FWHM_PER_SIGMA
        # dispersion such that FWHM/d = s pixels
        d = LSF_FWHM / s
        mu = 450.0 + 0.3 * d
        # pixel index i = 0 has its centre at lam0
        lam0 = mu - 0.3 * d
        val = pixel_area(mu, sigma_nm, lam0 - d / 2, lam0 + d / 2)
        out.append({"sampling": s, "dispersionNm": d, "centreNm": mu, "pixelCentreNm": lam0, "area": val})
    return out


def planck_lambda(lam_m, T):
    return 2 * H * C**2 / lam_m**5 / np.expm1(H * C / (lam_m * KB * T))


def a6():
    out = []
    for T in (4000.0, 5800.0, 9000.0):
        for lam0 in np.arange(380.0, 900.0, 13.0):
            a, b = lam0 * 1e-9, (lam0 + 0.1) * 1e-9
            v, _ = integrate.quad(lambda l: planck_lambda(l, T), a, b, epsabs=0, epsrel=1e-13)
            out.append({"T": T, "aNm": lam0, "bNm": lam0 + 0.1, "value": v})
    return out


def a7():
    out = []
    lam0 = [l for l in LINES if l["id"] == "h-alpha"][0]
    for v in (-300, -120, -30, 0, 30, 120, 300):
        b = v / C_KM_S
        z = np.sqrt((1 + b) / (1 - b)) - 1
        out.append({"v": v, "obsAirNm": lam0["air"] * (1 + z)})
    return {"line": lam0, "cases": out, "mediaOffsetKmS": C_KM_S * (lam0["vacuum"] / lam0["air"] - 1)}


# ----------------------------------------------------------------------------------------------- B1
def science_template(lam_nm, line_air):
    """Photon density (electrons per nm) of the science template, rest frame (no velocity)."""
    lam_m = lam_nm * 1e-9
    cont = SCI["S500"] * planck_lambda(lam_m, SCI["T"]) / planck_lambda(500e-9, SCI["T"])
    dep = np.zeros_like(lam_nm)
    for l0 in line_air:
        dep += SCI["depth"] * np.exp(-0.5 * ((lam_nm - l0) / SCI["sigmaInt"]) ** 2)
    return cont * (1 - dep)


def b1():
    ids = SCI["ids"]
    line_air = [[l["air"] for l in LINES if l["id"] == i][0] for i in ids]
    out = {"pixelCentre0Nm": 380.0, "pixelNm": 0.1, "nPixels": 2000, "refNm": 500.0, "cases": []}
    for R in (300, 1000, 3000):
        fwhm = 500.0 / R
        sigma = fwhm / FWHM_PER_SIGMA
        h = sigma / 20
        lam = np.arange(370.0, 590.0, h)
        T = science_template(lam, line_air)
        S = gaussian_filter1d(T, sigma / h, mode="nearest", truncate=10)
        cum = np.concatenate([[0], np.cumsum(0.5 * (S[1:] + S[:-1]) * h)])
        edges = 380.0 + 0.1 * np.arange(2001) - 0.05
        cume = np.interp(edges, lam, cum)
        pix = np.diff(cume)  # electrons per pixel
        out["cases"].append({"R": R, "fwhmNm": fwhm, "counts": pix})
    return out


# ----------------------------------------------------------------------------------------------- B2 arc
def arc_lines():
    """The 23 lamp lines in air with their truth pixel and the isolation rule applied."""
    rows = []
    for k, l in enumerate(LINES):
        lam = l["air"]
        if lam > lam_of_x(N_PIX - 1) - 1.0:
            continue  # H-alpha, outside the 380 to 595 nm range, is not on the arc
        others = [m["air"] for j, m in enumerate(LINES) if j != k]
        gap = min(abs(lam - o) for o in others)
        rows.append({"id": l["id"], "k": k, "air": lam, "vacuum": l["vacuum"], "total": 2.0e4 * (1 + (k % 4)), "x": x_of_lam(lam), "gapNm": gap, "isolated": bool(gap > 6 * LSF_FWHM)})
    return rows


def arc_expected(rows):
    x = np.arange(N_PIX, dtype=float)
    sigma_nm = LSF_FWHM / FWHM_PER_SIGMA
    exp = np.full(N_PIX, CONT_E)
    for r in rows:
        # area of the Gaussian over every pixel of the line's neighbourhood (the pixel's wavelength edges from the cubic)
        lo = max(0, int(r["x"]) - 40)
        hi = min(N_PIX, int(r["x"]) + 41)
        for i in range(lo, hi):
            a, b = lam_of_x(i - 0.5), lam_of_x(i + 0.5)
            exp[i] += r["total"] * pixel_area(r["air"], sigma_nm, a, b)
    return exp


def line_model_integrated(x, flux, mu, s, c0, c1, x0):
    a = (x - 0.5 - mu) / s
    b = (x + 0.5 - mu) / s
    area = 0.5 * (sp.erf(b / np.sqrt(2)) - sp.erf(a / np.sqrt(2)))
    return c0 + c1 * (x - x0) + flux * area


def fit_line(counts, sigma, guess, half, sigma_px0):
    x = np.arange(guess - half, guess + half + 1, dtype=float)
    y = counts[guess - half : guess + half + 1]
    e = sigma[guess - half : guess + half + 1]
    p0 = [float(y.max() - np.median(y)) * sigma_px0 * 2.5, float(guess), sigma_px0, float(np.median(y)), 0.0]
    f = lambda xx, F, mu, s, c0, c1: line_model_integrated(xx, F, mu, s, c0, c1, guess)
    popt, pcov = optimize.curve_fit(f, x, y, p0=p0, sigma=e, absolute_sigma=True, xtol=1e-14, ftol=1e-14, gtol=1e-14, maxfev=5000)
    chi2 = float(np.sum(((y - f(x, *popt)) / e) ** 2))
    # astropy: a point-sampled Gaussian1D plus Linear1D, same window and weights
    g = models.Gaussian1D(amplitude=float(y.max() - np.median(y)), mean=float(guess), stddev=sigma_px0) + models.Linear1D(slope=0.0, intercept=float(np.median(y)))
    fitter = fitting.LevMarLSQFitter()
    gfit = fitter(g, x, y, weights=1.0 / e, maxiter=2000, acc=1e-14)
    return {
        "flux": popt[0], "mu": popt[1], "s": abs(popt[2]), "c0": popt[3], "c1": popt[4],
        "sigmaMu": float(np.sqrt(pcov[1, 1])), "sigmaS": float(np.sqrt(pcov[2, 2])), "chi2": chi2, "dof": int(len(x) - 5),
        "astropyMu": float(gfit.mean_0.value),
    }


def solution(xs, lam, sig_lam, degree):
    """Weighted polynomial by numpy lstsq in the scaled abscissa; returns an evaluator and its covariance."""
    lo, hi = float(xs.min()), float(xs.max())
    c, hw = 0.5 * (lo + hi), 0.5 * (hi - lo)
    t = (xs - c) / hw
    A = np.vander(t, degree + 1, increasing=True)
    W = 1.0 / sig_lam
    coef, res, rank, sv = np.linalg.lstsq(A * W[:, None], lam * W, rcond=None)
    cov = np.linalg.inv((A * W[:, None]).T @ (A * W[:, None]))
    fit = A @ coef
    chi2 = float(np.sum(((lam - fit) / sig_lam) ** 2))
    return {"c": c, "hw": hw, "coef": coef, "cov": cov, "chi2": chi2, "dof": len(xs) - degree - 1, "resid": lam - fit}


def sol_eval(s, x):
    t = (np.asarray(x, dtype=float) - s["c"]) / s["hw"]
    V = np.vander(t, len(s["coef"]), increasing=True)
    return V @ s["coef"], np.sqrt(np.einsum("ij,jk,ik->i", V, s["cov"], V))


def b2_b3_b4():
    rows = arc_lines()
    exp = arc_expected(rows)
    sig = np.sqrt(exp + READ_NOISE**2)
    counts = exp + sig * rng.standard_normal(N_PIX)
    iso = [r for r in rows if r["isolated"]]
    fits = []
    sigma_px0 = LSF_FWHM / FWHM_PER_SIGMA / 0.105
    half = int(np.ceil(4 * LSF_FWHM / 0.105))  # 12 pixels
    for r in iso:
        guess = int(round(r["x"]))
        f = fit_line(counts, sig, guess, half, sigma_px0)
        f.update({"id": r["id"], "guess": guess, "air": r["air"], "xTrue": r["x"]})
        fits.append(f)
    xs = np.array([f["mu"] for f in fits])
    sx = np.array([f["sigmaMu"] for f in fits])
    lam = np.array([f["air"] for f in fits])
    pix50 = np.linspace(100, 1950, 50)
    sols = []
    for degree in (1, 2, 3):
        # first pass: unweighted polynomial of the same degree gives the local dispersion (the effective variance rule)
        p0 = np.polynomial.polynomial.polyfit((xs - xs.mean()) / (0.5 * np.ptp(xs)), lam, degree)
        dp = np.polynomial.polynomial.polyder(p0)
        disp = np.polynomial.polynomial.polyval((xs - xs.mean()) / (0.5 * np.ptp(xs)), dp) / (0.5 * np.ptp(xs))
        sl = sx * np.abs(disp)
        s = solution(xs, lam, sl, degree)
        w50, s50 = sol_eval(s, pix50)
        # astropy Chebyshev1D, weights 1/sigma_lambda
        cheb = models.Chebyshev1D(degree, domain=[float(xs.min()), float(xs.max())])
        cf = fitting.LinearLSQFitter()(cheb, xs, lam, weights=1.0 / sl)
        wa = cf(pix50)
        sols.append({"degree": degree, "sigmaLamNm": sl, "wavelength50": w50, "sigma50": s50, "chi2": s["chi2"], "dof": s["dof"], "residualsNm": s["resid"], "astropyWavelength50": wa})
    return {
        "rows": rows,
        "arc": {"counts": counts, "sigma": sig, "expectedSumCheck": float(exp.sum())},
        "windowHalf": half,
        "fits": fits,
        "pixels50": pix50,
        "solutions": sols,
    }


# ----------------------------------------------------------------------------------------------- F
def f1():
    out = []
    for sigma_obs_nm, d, Sc, RN in ((0.15, 0.105, 1.0e5, 5.0), (0.15, 0.105, 1.0e5, 0.0), (0.25, 0.08, 3.0e4, 8.0), (0.12, 0.05, 2.0e6, 0.0)):
        n = int(np.ceil(12 * sigma_obs_nm / d))
        xs = np.arange(-n, n + 1)
        off = 0.31
        P = np.array([pixel_area(off * d, sigma_obs_nm, (i - 0.5) * d, (i + 0.5) * d) for i in xs])
        var = Sc * d + RN**2
        disc = 1.0 / (Sc * np.sqrt(np.sum(P**2 / var)))
        out.append({"sigmaObsNm": sigma_obs_nm, "pixelNm": d, "continuumPerNm": Sc, "readNoiseE": RN, "centreOffsetPx": off, "halfPixels": n, "sigmaEw": disc,
                    "continuous": float(np.sqrt(2 * np.sqrt(np.pi) * sigma_obs_nm / Sc)) if RN == 0 else None})
    return out


def f2():
    out = []
    for ratio in (0.1, 0.5, 1.0, 2.0, 5.0):
        theta = 1.0
        s = theta / FWHM_PER_SIGMA
        w = ratio * theta
        val, _ = integrate.dblquad(lambda y, x: np.exp(-0.5 * (x**2 + y**2) / s**2) / (2 * np.pi * s**2), -w / 2, w / 2, -12 * s, 12 * s, epsabs=1e-13, epsrel=1e-13)
        out.append({"ratio": ratio, "throughput": val, "closed": float(sp.erf(w / (2 * np.sqrt(2) * s)))})
    return out


def f3():
    out = []
    Rs, lam = 3000.0, 500.0
    for s_int in (0.05, 0.10, 0.30):
        def neg(R):
            s_l = (lam / R) / FWHM_PER_SIGMA
            return -sp.erf(np.sqrt(np.log(2)) * Rs / R) / np.sqrt(s_int**2 + s_l**2)
        res = optimize.minimize_scalar(neg, bounds=(Rs / 20, 40 * Rs), method="bounded", options={"xatol": 1e-9})
        # refine on a grid first to avoid a local trap: the objective is unimodal, the grid is a check
        grid = np.geomspace(Rs / 20, 40 * Rs, 4001)
        vals = np.array([neg(g) for g in grid])
        out.append({"sigmaIntNm": s_int, "RsStar": float(res.x), "gridBest": float(grid[np.argmin(vals)]), "value": float(-res.fun)})
    return {"Rs": Rs, "lamNm": lam, "cases": out}


def main(path):
    t0 = time.time()
    res = {
        "seed": SEED,
        "lines": LINES,
        "a2": a2(),
        "a4": a4(),
        "a6": a6(),
        "a7": a7(),
        "b1": b1(),
        "arc": b2_b3_b4(),
        "f1": f1(),
        "f2": f2(),
        "f3": f3(),
        "seconds": time.time() - t0,
    }
    json.dump(r12(res), open(path, "w"), separators=(",", ":"))


if __name__ == "__main__":
    main(sys.argv[1])
