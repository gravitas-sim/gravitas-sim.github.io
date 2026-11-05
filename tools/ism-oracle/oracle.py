# The independent oracle of Prompt 247 (ISM.md): numpy, scipy and astropy, no Gravitas code.
# It reads tests/fixtures/ism/oracle-inputs.json (forward-model spectra, line fluxes, the extinction
# law's coefficient values as data, equivalent widths, the decoded A star of the SDSS pack) and
# writes tests/fixtures/ism/oracle-results.json:
#   python3 tools/ism-oracle/oracle.py > tests/fixtures/ism/oracle-results.json
# It implements, from the rule written in tests/fixtures/ism/thresholds.json (ISM-RULE-1 S2, S3, S4,
# S8) and the published CCM89 equations, with scipy's curve_fit for the Gaussian line and astropy's
# constants for the classical electron radius. It is an independent implementation by the same author,
# not a cited tool (B6 is NOT RUN until one is supplied).
import json
import sys
import numpy as np
import scipy
import scipy.optimize as opt
import scipy.special as sp
import scipy.stats as st
import astropy
import astropy.constants as const

path = sys.argv[1] if len(sys.argv) > 1 else "tests/fixtures/ism/oracle-inputs.json"
D = json.load(open(path))

# ---- S2, S3: the continuum and the direct equivalent width -----------------------------------------

def pixel_widths(lam):
    w = np.empty_like(lam)
    w[0] = lam[1] - lam[0]
    w[-1] = lam[-1] - lam[-2]
    w[1:-1] = 0.5 * (lam[2:] - lam[:-2])
    return w

def continuum(lam, flux, sigma, windows, order):
    sel = np.zeros(lam.size, bool)
    for lo, hi in windows:
        sel |= (lam >= lo) & (lam <= hi)
    x0 = lam[sel].mean()
    x = lam[sel] - x0
    y = flux[sel]
    w = 1.0 / sigma[sel] ** 2 if sigma is not None else np.ones(x.size)
    if order == 0:
        X = np.ones((x.size, 1))
    else:
        X = np.vstack([np.ones(x.size), x]).T
    A = X.T @ (X * w[:, None])
    cov = np.linalg.inv(A)
    c = cov @ (X.T @ (w * y))
    r = y - X @ c
    p = X.shape[1]
    rms = np.sqrt(np.sum(r ** 2) / (x.size - p))
    if sigma is None:
        cov = cov * rms ** 2
    return dict(x0=x0, c=c, cov=cov, rms=rms, from_scatter=sigma is None, order=order)

def width(lam, flux, sigma, cont, lo, hi):
    sel = (lam >= lo) & (lam <= hi)
    w = pixel_widths(lam)[sel]
    F = flux[sel]
    x = lam[sel] - cont["x0"]
    C = cont["c"][0] + (cont["c"][1] * x if cont["order"] == 1 else 0.0)
    s = sigma[sel] if sigma is not None else np.full(F.size, cont["rms"])
    W = np.sum(w * (1 - F / C))
    var = np.sum((w * s / C) ** 2)
    d = w * F / C ** 2
    g = np.array([d.sum(), (d * x).sum()]) if cont["order"] == 1 else np.array([d.sum()])
    var += g @ cont["cov"] @ g
    return W, np.sqrt(var)

# ---- S4: the Gaussian line, pixel-integrated, on a linear continuum -------------------------------

def gauss_fit(case):
    lam = np.array(case["lambdaNm"])
    flux = np.array(case["flux"])
    sig = np.array(case["sigma"])
    i0 = int(np.argmin(np.abs(lam - case["centreNm"])))
    half = case["halfWidthPx"]
    idx = np.array([i for i in range(lam.size) if abs(i - i0) <= half])
    x = idx.astype(float)
    y = flux[idx]
    s = sig[idx]
    x0 = float(i0)

    def model(xx, f, mu, sg, c0, c1):
        return c0 + c1 * (xx - x0) + f * (sp.ndtr((xx + 0.5 - mu) / sg) - sp.ndtr((xx - 0.5 - mu) / sg))

    disp0 = lam[i0 + 1] - lam[i0]
    s0 = case["sigmaObsNm"] / disp0
    med = np.median(y)
    dev = y - med
    k = int(np.argmax(np.abs(dev)))
    f0 = dev[k] * s0 * np.sqrt(2 * np.pi)
    p0 = [f0, case["startIndex"], s0, med, 0.0]
    lo = [-np.inf, x0 - half, 0.15, -np.inf, -np.inf]
    hi = [np.inf, x0 + half, 3 * half, np.inf, np.inf]
    popt, pcov = opt.curve_fit(model, x, y, p0=p0, sigma=s, absolute_sigma=True, bounds=(lo, hi), xtol=1e-14, ftol=1e-14, gtol=1e-14, max_nfev=2000)
    res = (y - model(x, *popt)) / s
    chi2 = float(np.sum(res ** 2))
    dof = x.size - 5
    red = chi2 / dof
    flagged = red > st.chi2.ppf(0.99, dof) / dof
    scale = red if flagged else 1.0
    cov = pcov * scale
    f, mu, sg, c0, c1 = popt
    sd = np.sqrt(np.diag(cov))
    i = int(min(lam.size - 2, max(0, np.floor(mu))))
    disp = lam[i + 1] - lam[i]
    centre = lam[i] + (mu - i) * disp
    return dict(centreNm=float(centre), sigmaCentreNm=float(sd[1] * disp), sigmaNm=float(sg * disp), flux=float(f * disp), sigmaFlux=float(sd[0] * disp), reducedChi2=float(red))

# ---- the CCM89 law from the coefficient values the inputs carry ------------------------------------

def poly(c, y):
    v = 0.0
    for k in reversed(range(len(c))):
        v = v * y + c[k]
    return v

def ccm_ab(x, L):
    if x < L["xMin"] or x > L["xMax"]:
        return float("nan"), float("nan")
    if x < L["xIrOptical"]:
        p = x ** L["ir"]["power"]
        return L["ir"]["a"] * p, L["ir"]["b"] * p
    if x <= L["xOpticalUv"]:
        y = x - L["optical"]["y0"]
        return poly(L["optical"]["a"], y), poly(L["optical"]["b"], y)
    u = L["uv"]
    a = u["a0"] + u["a1"] * x + u["aPole"]["k"] / ((x - u["aPole"]["x0"]) ** 2 + u["aPole"]["w"])
    b = u["b0"] + u["b1"] * x + u["bPole"]["k"] / ((x - u["bPole"]["x0"]) ** 2 + u["bPole"]["w"])
    if x >= L["xFarUv"]:
        z = x - L["farUv"]["x0"]
        a += poly(L["farUv"]["fa"], z) * z * z
        b += poly(L["farUv"]["fb"], z) * z * z
    return a, b

def a_over_av(lam_nm, RV, L):
    a, b = ccm_ab(1000.0 / lam_nm, L)
    return a + b / RV

# ---- assemble --------------------------------------------------------------------------------------

out = dict(
    format="gravitas.ism-oracle-results/1",
    note="numpy, scipy and astropy only; no Gravitas code. An independent implementation of the written rule, not a cited tool.",
    versions=dict(numpy=np.__version__, scipy=scipy.__version__, astropy=astropy.__version__),
)

b12 = []
for case in D["cases"]:
    lam = np.array(case["lambdaNm"])
    flux = np.array(case["flux"])
    sig = np.array(case["sigma"])
    lin = continuum(lam, flux, sig, case["continuumWindows"], 1)
    con = continuum(lam, flux, sig, case["continuumWindows"], 0)
    W, sW = width(lam, flux, sig, lin, *case["lineWindow"])
    Wc, sWc = width(lam, flux, sig, con, *case["lineWindow"])
    b12.append(dict(
        id=case["id"],
        width=dict(widthNm=float(W), sigmaNm=float(sW), constantWidthNm=float(Wc), coefficients=[float(v) for v in lin["c"]]),
        gauss=gauss_fit(case),
    ))
out["b12"] = b12

RV_LAW = D["ebv"]["law"]
b3 = []
for c in D["ebv"]["cases"]:
    RV = c["RV"]
    k1 = RV * a_over_av(c["numerator"]["lambdaNm"], RV, RV_LAW)
    k2 = RV * a_over_av(c["denominator"]["lambdaNm"], RV, RV_LAW)
    R = c["numerator"]["flux"] / c["denominator"]["flux"]
    ebv = 2.5 * np.log10(R / c["intrinsicRatio"]) / (k2 - k1)
    b3.append(dict(ratioNum=a_over_av(c["numerator"]["lambdaNm"], RV, RV_LAW), ratioDen=a_over_av(c["denominator"]["lambdaNm"], RV, RV_LAW), ebv=float(ebv)))
out["b3"] = b3

# r_e from astropy's e, epsilon0, m_e, c (SI), an independent route from alpha h / (2 pi m_e c)
re_m = float(const.e.si.value ** 2 / (4 * np.pi * const.eps0.value * const.m_e.value * const.c.value ** 2))
out["electronRadiusM"] = re_m
out["b4"] = [dict(columnCm2=float((c["widthNm"] / c["lambdaNm"] ** 2 * 1e7) / (np.pi * re_m * 100 * c["f"]))) for c in D["columns"]]

A = D["authentic"]
lam = np.array(A["lambdaNm"])
flux = np.array(A["flux"])
b5 = []
for ln in A["lines"]:
    lin = continuum(lam, flux, None, ln["continuumWindows"], 1)
    W, sW = width(lam, flux, None, lin, *ln["lineWindow"])
    b5.append(dict(id=ln["id"], widthNm=float(W), sigmaNm=float(sW), rms=float(lin["rms"])))
out["b5"] = b5
print(json.dumps(out, indent=1))
