# The independent oracle of Prompt 252 (AGN.md): numpy, scipy and astropy, no Gravitas code.
# It reads tests/fixtures/agn/oracle-inputs.json and writes tests/fixtures/agn/oracle-results.json:
#   python3 tools/agn-oracle/oracle.py > tests/fixtures/agn/oracle-results.json
# It implements, from the rules written in tests/fixtures/agn/thresholds.json (AGN-RULE-1: R1, L1, E1, V1, B1, B2):
# the Eddington luminosity from astropy.constants, the luminosity distance by scipy.integrate.quad (astropy.cosmology cannot be imported here: its PyYAML dependency is missing; amendment AM1), the
# cross-correlation by FFT (scipy.signal.fftconvolve) at integer lags with the refinement by scipy's bounded scalar
# minimiser over scipy's natural cubic spline, the pair statistic of the light curve by numpy, the BPT classes by
# numpy, and the narrow lines by scipy.optimize.curve_fit. It is an independent implementation by the same author,
# not a cited tool (B7 is NOT RUN until the SDSS pipeline's values are supplied).
import json
import sys
import numpy as np
import scipy
import scipy.optimize as opt
import scipy.signal as sig
import scipy.interpolate as interp
from scipy.special import ndtr
import astropy
import astropy.constants as const
import astropy.units as u
import scipy.integrate as integrate

path = sys.argv[1] if len(sys.argv) > 1 else "tests/fixtures/agn/oracle-inputs.json"
D = json.load(open(path))
W = D["highPassWindow"]


def grid(g):
    return 10.0 ** (g["log10Start"] + g["log10Step"] * np.arange(g["samples"]))


# ---------------------------------------------------------------- Eddington
GM = const.GM_sun.value
LEDD1 = 4.0 * np.pi * GM * const.m_p.value * const.c.value / const.sigma_T.value
edd = dict(
    perSolarMass=float(LEDD1),
    luminosityW=[float(m * LEDD1) for m in D["eddington"]["massesSolar"]],
    massBound=[float(L / LEDD1) for L in D["eddington"]["luminositiesW"]],
)

# ---------------------------------------------------------------- distances
dist = []
C_KMS = const.c.value / 1000.0
MPC_M = u.Mpc.to(u.m)


def lum_distance_mpc(H0, Om, OL, z):
    """D_L = (1 + z) D_M, D_M = D_H int dz/E (flat) or D_H / sqrt(Ok) sinh(sqrt(Ok) D_C / D_H) (open), no radiation."""
    Ok = 1.0 - Om - OL
    dh = C_KMS / H0
    E = lambda x: np.sqrt(Om * (1 + x) ** 3 + max(Ok, 0.0) * (1 + x) ** 2 + OL)
    dc = dh * integrate.quad(lambda x: 1.0 / E(x), 0.0, z, epsabs=0, epsrel=1e-13)[0]
    if Ok > 1e-12:
        r = np.sqrt(Ok)
        dm = dh / r * np.sinh(r * dc / dh)
    else:
        dm = dc
    return (1 + z) * dm


for c in D["cosmologies"]:
    row = []
    for z in D["distanceZs"]:
        dl_mpc = lum_distance_mpc(c["H0"], c["Om"], c["OL"], z)
        dl = dl_mpc * MPC_M
        row.append(dict(z=z, dLMpc=float(dl_mpc), luminosityW=float(4.0 * np.pi * dl * dl * D["fluxWM2"])))
    dist.append(dict(cosmology=c, rows=row))

# ---------------------------------------------------------------- correlation
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
    wf = w * f
    S_full = sig.fftconvolve(wf, t[::-1], mode="full")
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


zr = D["zRange"]
res_xc = []
res_fft = []
for idx, c in enumerate(D["quasars"]):
    r, lags, q = xc(c["flux"], np.full(N, c["sigmaPixel"]), D["template"]["flux"], zr["min"], zr["max"])
    res_xc.append(dict(id=c["id"], **r))
    if idx < 4:
        res_fft.append(dict(id=c["id"], lag0=int(lags[0]), q=[float(v) for v in q]))

# ---------------------------------------------------------------- BPT
cv = D["bpt"]["curves"]


def cur(c, x):
    return c["a"] / (x - c["b"]) + c["c"]


def bpt_class(x, y):
    sf, ag = cv["starForming"], cv["agn"]
    if x >= ag["b"] or y > cur(ag, x):
        return "agn"
    if x < sf["b"] and y < cur(sf, x):
        return "star-forming"
    return "composite"


ratios = []
for s in D["bpt"]["fluxSets"]:
    x = np.log10(s["n"]["flux"] / s["ha"]["flux"])
    y = np.log10(s["o"]["flux"] / s["hb"]["flux"])
    rel = lambda k: s[k]["sigma"] / s[k]["flux"]
    sx = np.hypot(rel("n"), rel("ha")) / np.log(10)
    sy = np.hypot(rel("o"), rel("hb")) / np.log(10)
    ratios.append([float(x), float(y), float(sx), float(sy)])
classes = [bpt_class(x, y) for x, y in D["bpt"]["points"]]

# ---------------------------------------------------------------- light curves
tn = D["timescale"]
ts = []
for c in D["curves"]:
    t = np.asarray(c["t"])
    f = np.asarray(c["flux"])
    s = np.asarray(c["sigma"])
    best = None
    bestup = None
    for i in range(len(t) - 1):
        if not f[i] > 0:
            continue
        for j in range(i + 1, len(t)):
            if not f[j] > 0:
                continue
            if abs(f[j] - f[i]) < tn["nSigma"] * np.hypot(s[i], s[j]):
                continue
            dt = t[j] - t[i]
            lr = abs(np.log(f[j] / f[i]))
            sl = np.hypot(s[i] / f[i], s[j] / f[j])
            tau = dt / lr
            up = dt / max(lr - tn["kGuard"] * sl, tn["tiny"])
            if best is None or tau < best[0]:
                best = (tau, i, j)
            if bestup is None or up < bestup[0]:
                bestup = (up, i, j)
    ts.append(dict(id=c["id"], tau=None if best is None else float(best[0]), pair=None if best is None else [best[1], best[2]], tauUp=None if bestup is None else float(bestup[0]), pairUp=None if bestup is None else [bestup[1], bestup[2]]))

# ---------------------------------------------------------------- narrow lines
nlam = grid(D["narrowGrid"])
nstep = D["narrowGrid"]["log10Step"]
NR = D["narrowGrid"]["resolvingPower"]


def gauss_line(x, mu, s, F, c0, c1, x0):
    return c0 + c1 * (x - x0) + F * (ndtr((x + 0.5 - mu) / s) - ndtr((x - 0.5 - mu) / s))


def fit_line(flux, sigma, guess_nm, half):
    n = nlam.size
    fwhm_lsf = 1.0 / (NR * np.log(10) * nstep)
    sig_lsf = fwhm_lsf / (2 * np.sqrt(2 * np.log(2)))
    i0 = int(np.argmin(np.abs(nlam - guess_nm)))
    lo = max(0, i0 - half - 1)
    hi = min(n - 1, i0 + half + 1)
    x = np.arange(lo, hi + 1).astype(float)
    y = flux[lo : hi + 1]
    s = sigma[lo : hi + 1]
    x0 = float(i0)
    c0 = float(np.median(y))
    F = float((y[np.argmin(np.abs(x - i0))] - c0) * sig_lsf * np.sqrt(2 * np.pi))
    p, cov = opt.curve_fit(lambda xx, mu, sg, FF, a, b: gauss_line(xx, mu, sg, FF, a, b, x0), x, y, p0=[i0, sig_lsf, F, c0, 0.0], sigma=s, absolute_sigma=True, maxfev=20000)
    j = int(min(n - 2, max(0, np.floor(p[0]))))
    disp = nlam[j + 1] - nlam[j]
    return float(p[2] * disp), float(np.sqrt(cov[2, 2]) * disp)


nl = []
for c in D["narrow"]:
    flux = np.asarray(c["flux"])
    sigma = np.full(nlam.size, c["sigmaPixel"])
    obs = {k: v * (1 + c["z"]) for k, v in c["restNm"].items()}
    names = ["ha", "hb", "n", "o"]
    out = {}
    for k in names:
        i0 = int(np.argmin(np.abs(nlam - obs[k])))
        disp = nlam[min(i0 + 1, nlam.size - 1)] - nlam[i0] if i0 + 1 < nlam.size else nlam[i0] - nlam[i0 - 1]
        sep = min(abs(obs[k] - obs[m]) for m in names if m != k)
        lsf_fwhm_nm = obs[k] / NR
        default_half = max(8, int(np.ceil(4 * lsf_fwhm_nm / disp)))
        half = max(4, min(default_half, int(np.floor(0.4 * sep / disp))))
        F, sF = fit_line(flux, sigma, obs[k], half)
        out[k] = dict(flux=F, sigma=sF, half=half)
    nl.append(dict(id=c["id"], lines=out))

results = dict(
    versions=dict(numpy=np.__version__, scipy=scipy.__version__, astropy=astropy.__version__),
    note="independent implementation by the same author (numpy, scipy, astropy), no Gravitas code; not a cited tool",
    b1=edd,
    b2=dist,
    b3=res_xc,
    b3fft=res_fft,
    b4=dict(ratios=ratios, classes=classes),
    b5=ts,
    b6=nl,
)
json.dump(results, sys.stdout, indent=1)
print()
