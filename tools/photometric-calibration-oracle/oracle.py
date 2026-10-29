#!/usr/bin/env python3
"""Independent oracle for Prompt 212 (PHOTOMETRIC_CALIBRATION.md, thresholds.json).

numpy 1.26, scipy 1.13 and astropy 6.0.1; no Gravitas code, only data files the caller names. It makes its own
synthetic nights with numpy's generator and solves them three ways that have to agree among themselves:

  numpy        numpy.linalg.lstsq on the sigma-weighted design, covariance from the inverse of A' W A
  astropy      astropy.modeling.fitting.LinearLSQFitter on a first-degree Polynomial2D (second-order terms fixed
               at zero, the xy term free where the second-order model is asked for), weights 1 / sigma
  scipy        scipy.optimize.lsq_linear (exact) on the weighted design, covariance from (J' J)^-1 of least_squares

and the physical standards (Planck blackbodies through the radiation pack's Johnson V, Johnson B and SDSS g
responses under a Rayleigh plus aerosol atmosphere), the airmass formula and the NGC 2420 cross-match.

usage: oracle.py OUT.json [--bands bands.json] [--ngc ngc2420.json]
"""
import json
import sys
import math
import types
import numpy as np

# PyYAML is not installed on this machine and astropy.table imports it at module load although the modeling
# fitters never use it; an empty stand-in lets the import finish (nothing here reads YAML).
try:
    import yaml  # noqa: F401
except ModuleNotFoundError:
    sys.modules['yaml'] = types.ModuleType('yaml')
from scipy.optimize import least_squares, lsq_linear
from scipy.stats import chi2 as chi2dist, norm, t as tdist
from astropy.modeling import models, fitting

AL = [1.05, 1.30, 1.55, 1.80, 2.15, 2.40]
Z1, K, C_TERM = 24.80, 0.21, 0.08
TARGET_COLOURS = [-0.10, 0.30, 0.80, 1.20, None]
TARGET_X = [1.20, 1.90, 1.40, 2.30, 1.10]
TARGET_M = [13.2, 14.1, 12.7, 15.3, 14.0]
TARGET_SIG = [0.006, 0.008, 0.004, 0.012, 0.007]
UNKNOWN_TRUE_COLOUR = 0.55


def night(name, k2, sigma_fn, seed_inst, seed_cat=None, sigma_std=0.005):
    ri = np.random.default_rng(seed_inst)
    rc = np.random.default_rng(seed_cat) if seed_cat is not None else None
    obs = []
    for i in range(14):
        M = 11.0 + 0.8 * i
        C = -0.20 + 1.70 * i / 13.0
        Mcat = M + (rc.normal(0, sigma_std) if rc is not None else 0.0)
        for j in range(3):
            X = AL[(i % 4) + j]
            s = sigma_fn(M)
            m = M - (Z1 - K * (X - 1) + C_TERM * C - k2 * C * (X - 1)) + ri.normal(0, s)
            obs.append({"id": "s%02d-%d" % (i, j), "star": "s%02d" % i, "X": X, "m": m, "sigma": s,
                        "M": Mcat, "sigmaM": sigma_std, "C": C})
    rt = np.random.default_rng(2123)
    targets = []
    for q in range(5):
        Ct = TARGET_COLOURS[q] if TARGET_COLOURS[q] is not None else UNKNOWN_TRUE_COLOUR
        X = TARGET_X[q]
        m = TARGET_M[q] - (Z1 - K * (X - 1) + C_TERM * Ct - k2 * Ct * (X - 1)) + rt.normal(0, TARGET_SIG[q])
        targets.append({"id": "t%d" % q, "X": X, "m": m, "sigma": TARGET_SIG[q], "C": TARGET_COLOURS[q],
                        "truthM": TARGET_M[q], "truthC": Ct})
    return {"name": name, "truth": {"Z1": Z1, "k": K, "c": C_TERM, "k2": k2}, "observations": obs, "targets": targets}


def design(obs, second):
    X = np.array([o["X"] for o in obs])
    C = np.array([o["C"] for o in obs])
    cols = [np.ones_like(X), -(X - 1.0), C]
    if second:
        cols.append(-C * (X - 1.0))
    return np.vstack(cols).T, X, C


def solve_numpy(obs, second):
    A, X, C = design(obs, second)
    y = np.array([o["M"] - o["m"] for o in obs])
    sig = np.array([math.hypot(o["sigma"], o["sigmaM"]) for o in obs])
    Aw = A / sig[:, None]
    yw = y / sig
    theta, *_ = np.linalg.lstsq(Aw, yw, rcond=None)
    cov = np.linalg.inv(Aw.T @ Aw)
    r = yw - Aw @ theta
    return theta, cov, float(r @ r), len(y) - A.shape[1], y, sig


def solve_scipy(obs, second):
    A, X, C = design(obs, second)
    y = np.array([o["M"] - o["m"] for o in obs])
    sig = np.array([math.hypot(o["sigma"], o["sigmaM"]) for o in obs])
    Aw, yw = A / sig[:, None], y / sig
    # the parameters from SciPy's linear least-squares routine (direct, exact solver); the covariance from the Jacobian
    # SciPy's least_squares builds for the same residuals (an iterative stopping rule left that routine 1e-8 to 4e-8 from
    # the direct solvers on the ill-conditioned second-order fit, so it is used for the Jacobian only: AM1)
    lin = lsq_linear(Aw, yw, method="trf", lsq_solver="exact", tol=1e-15, max_iter=1000)
    f = lambda th: (A @ th - y) / sig
    J = least_squares(f, lin.x, method="lm", xtol=1e-15, ftol=1e-15, gtol=1e-15).jac
    return lin.x, np.linalg.inv(J.T @ J)


def solve_astropy(obs, second):
    X = np.array([o["X"] for o in obs])
    C = np.array([o["C"] for o in obs])
    y = np.array([o["M"] - o["m"] for o in obs])
    sig = np.array([math.hypot(o["sigma"], o["sigmaM"]) for o in obs])
    # Polynomial2D degree 2: c0_0 + c1_0 x + c0_1 y + c2_0 x^2 + c1_1 x y + c0_2 y^2, x = -(X - 1), y = C.
    # The model M - m = Z1 + k x + c C + k2 (x C), so c1_0 = k, c0_1 = c, c1_1 = k2; squares fixed at zero.
    p = models.Polynomial2D(degree=2, c2_0=0.0, c0_2=0.0, fixed={"c2_0": True, "c0_2": True})
    if not second:
        p.c1_1 = 0.0
        p.fixed["c1_1"] = True
    fit = fitting.LinearLSQFitter()
    best = fit(p, -(X - 1.0), C, y, weights=1.0 / sig)
    th = [best.c0_0.value, best.c1_0.value, best.c0_1.value]
    if second:
        th.append(best.c1_1.value)
    return np.array(th)


def calibrate(theta, cov, obs, second, targets, chi2, dof):
    out = []
    # the standards' mean colour and spread over the distinct stars, not the observations
    stars = {}
    for o in obs:
        stars[o["star"]] = o["C"]
    Cs = np.array(list(stars.values()))
    cmean, csd = float(Cs.mean()), float(Cs.std(ddof=1))
    for t in targets:
        known = t["C"] is not None
        Ct = t["C"] if known else cmean
        sC = 0.0 if known else csd
        X = t["X"]
        a = [1.0, -(X - 1.0), Ct] + ([-Ct * (X - 1.0)] if second else [])
        a = np.array(a)
        M = t["m"] + float(a @ theta)
        var = t["sigma"] ** 2 + float(a @ cov @ a) + (theta[2] * sC) ** 2
        out.append({"id": t["id"], "M": M, "sigma": math.sqrt(var), "colourAssumed": not known})
    return out


def nights():
    specs = [
        ("N1", 0.0, lambda M: 0.005, 212, None),
        ("N2", 0.0, lambda M: 0.004 * 10 ** (0.2 * (M - 11.0)), 2120, 2122),
        ("N3", -0.03, lambda M: 0.003, 2125, None),
    ]
    res = {}
    for name, k2, sf, si, sc in specs:
        nt = night(name, k2, sf, si, sc)
        rec = {"night": nt, "fits": {}}
        for label, second in (("first", False), ("second", True)):
            th, cov, chi2, dof, y, sig = solve_numpy(nt["observations"], second)
            th_s, cov_s = solve_scipy(nt["observations"], second)
            th_a = solve_astropy(nt["observations"], second)
            agree = max(float(np.max(np.abs(th - th_s))), float(np.max(np.abs(th - th_a))))
            cal = calibrate(th, cov, nt["observations"], second, nt["targets"], chi2, dof)
            rec["fits"][label] = {
                "theta": th.tolist(),
                "sigma": np.sqrt(np.diag(cov)).tolist(),
                "cov": cov.tolist(),
                "chi2": chi2,
                "dof": dof,
                "p": float(chi2dist.sf(chi2, dof)),
                "scipy": th_s.tolist(),
                "scipyCov": cov_s.tolist(),
                "astropy": th_a.tolist(),
                "solverAgreement": agree,
                "calibrated": cal,
            }
        res[name] = rec
    return res


def airmass():
    out = []
    for h in (90, 60, 45, 30, 15, 10):
        x = 1.0 / (math.sin(math.radians(h)) + 0.50572 * (h + 6.07995) ** -1.6364)
        out.append({"alt": h, "X": x, "secant": 1.0 / math.sin(math.radians(h))})
    return out


# ---- the physical night ------------------------------------------------------------------------------------
H, CL, KB = 6.62607015e-34, 2.99792458e8, 1.380649e-23
TEMPS = [3500, 4000, 4500, 5000, 5500, 6000, 6500, 7000, 8000, 9000, 10000, 12000]
PHYS_X = [1.1, 1.5, 2.0, 2.4]
TAU_R, TAU_A = 0.0975, 0.06


def planck(lam_nm, T):
    l = lam_nm * 1e-9
    return 2 * H * CL ** 2 / l ** 5 / np.expm1(H * CL / (l * KB * T))


def kfun(lam_nm):
    tau = TAU_R * (lam_nm / 550.0) ** -4.05 + TAU_A * (lam_nm / 550.0) ** -1.3
    return 2.5 / math.log(10) * tau


def photon(bands, bid, T, X=0.0):
    b = bands[bid]
    lam = b["startNm"] + b["stepNm"] * np.arange(len(b["response"]))
    s = np.array(b["response"]) / b["scale"]
    grid = np.arange(lam[0], lam[-1] + 1e-9, 0.5)
    S = np.interp(grid, lam, s)
    tr = 10 ** (-0.4 * kfun(grid) * X)
    return np.trapz(planck(grid, T) * S * tr * grid, grid)


def physical(bands):
    ref = {i: -2.5 * np.log10(photon(bands, i, 9600.0)) for i in ("B", "V", "g")}
    mag = lambda i, T, X=0.0: -2.5 * np.log10(photon(bands, i, T, X)) - ref[i]
    # P1: no atmosphere, the linear colour term of V - g against B - V
    C = np.array([mag("B", T) - mag("V", T) for T in TEMPS])
    y = np.array([mag("V", T) - mag("g", T) for T in TEMPS])
    A = np.vstack([np.ones_like(C), C]).T
    coef = np.linalg.lstsq(A, y, rcond=None)[0]
    p1 = {"colour": C.tolist(), "y": y.tolist(), "intercept": float(coef[0]), "c": float(coef[1]),
          "rms": float(np.std(y - A @ coef))}
    # P2/P3: the night through the atmosphere
    rows = []
    for T in TEMPS:
        for X in PHYS_X:
            rows.append((T, X, -2.5 * np.log10(photon(bands, "g", T, X)) - ref["g"], mag("V", T),
                         mag("B", T) - mag("V", T)))
    rows = np.array(rows)
    Xs, Cs = rows[:, 1], rows[:, 4]
    yy = rows[:, 3] - rows[:, 2]
    out = {"p1": p1, "night": [{"T": r[0], "X": r[1], "m": r[2], "M": r[3], "C": r[4]} for r in rows.tolist()]}
    for label, cols in (("first", [np.ones_like(Xs), -(Xs - 1), Cs]),
                        ("second", [np.ones_like(Xs), -(Xs - 1), Cs, -Cs * (Xs - 1)])):
        A = np.vstack(cols).T
        th = np.linalg.lstsq(A, yy, rcond=None)[0]
        out[label] = {"theta": th.tolist(), "rms": float(np.std(yy - A @ th)), "max": float(np.max(np.abs(yy - A @ th)))}
    # the 3500 K target at airmass 2.3
    Tt, Xt = 3500.0, 2.3
    mi = -2.5 * np.log10(photon(bands, "g", Tt, Xt)) - ref["g"]
    Mt = mag("V", Tt)
    Ct = mag("B", Tt) - mag("V", Tt)
    th1, th2 = np.array(out["first"]["theta"]), np.array(out["second"]["theta"])
    out["target"] = {"T": Tt, "X": Xt, "m": mi, "M": Mt, "C": Ct,
                     "errFirst": float(mi + th1[0] - th1[1] * (Xt - 1) + th1[2] * Ct - Mt),
                     "errSecond": float(mi + th2[0] - th2[1] * (Xt - 1) + th2[2] * Ct - th2[3] * Ct * (Xt - 1) - Mt)}
    return out


# ---- NGC 2420: the cross-match and the fit, independently ----------------------------------------------------
def ngc(d):
    s = {k: np.array(v, dtype=float) for k, v in d["sdss"].items()}
    g = {k: np.array(v, dtype=float) for k, v in d["gaia"].items()}
    dec0 = math.radians(21.575)
    # nearest Gaia star to each SDSS star on the tangent plane, arcsec
    px = lambda ra: ra * math.cos(dec0) * 3600.0
    py = lambda dec: dec * 3600.0
    gx, gy = px(g["ra"]), py(g["dec"])
    pairs = {}
    for i in range(len(s["ra"])):
        dx, dy = gx - px(s["ra"][i]), gy - py(s["dec"][i])
        dist = np.hypot(dx, dy)
        j = int(np.argmin(dist))
        if dist[j] <= 1.0:
            # the second-nearest must be farther than the radius, else the match is ambiguous
            second = np.partition(dist, 1)[1] if len(dist) > 1 else 1e9
            if second > 1.0:
                pairs.setdefault(j, []).append(i)
    sel = [(i[0], j) for j, i in pairs.items() if len(i) == 1]
    rows = []
    for i, j in sel:
        if not (s["g_err"][i] < 0.03 and s["r_err"][i] < 0.03 and 14.5 <= s["r"][i] <= 19.0):
            continue
        if not (np.isfinite(g["g"][j]) and np.isfinite(g["bp_rp"][j])):
            continue
        rows.append((s["g"][i], s["g_err"][i], g["g"][j], g["bp_rp"][j]))
    rows = np.array(rows)
    M, sM, m, C = rows.T
    sm = 0.003
    y = M - m
    sig = np.hypot(sM, sm)

    def wls(idx):
        A = np.vstack([np.ones(len(idx)), C[idx]]).T / sig[idx, None]
        yw = y[idx] / sig[idx]
        th = np.linalg.lstsq(A, yw, rcond=None)[0]
        cov = np.linalg.inv(A.T @ A)
        r = yw - A @ th
        return th, cov, float(r @ r), len(idx) - 2

    allidx = np.arange(len(y))
    th, cov, c2, dof = wls(allidx)
    res = y - (th[0] + th[1] * C)
    mad = np.median(np.abs(res - np.median(res))) * 1.4826
    keep = np.abs(res - np.median(res)) <= 4 * mad
    idx = allidx[keep]
    th, cov, c2, dof = wls(idx)
    p = float(chi2dist.sf(c2, dof))
    scale = c2 / dof if p < 0.01 and c2 > dof else 1.0
    covs = cov * scale
    res = y[idx] - (th[0] + th[1] * C[idx])
    out = {"matched": len(rows), "kept": int(len(idx)), "theta": th.tolist(),
           "sigma": np.sqrt(np.diag(covs)).tolist(), "chi2": c2, "dof": dof, "p": p, "scale": scale,
           "rms": float(np.sqrt(np.mean(res ** 2))), "significance": float(abs(th[1]) / math.sqrt(covs[1, 1]))}
    # parity split: even-index calibrators, odd-index targets, among the kept stars
    cal, tgt = idx[0::2], idx[1::2]
    thc, covc, c2c, dofc = wls(cal)
    pc = float(chi2dist.sf(c2c, dofc))
    sc = c2c / dofc if pc < 0.01 and c2c > dofc else 1.0
    covc = covc * sc
    q = tdist.ppf(0.975, dofc) if sc != 1.0 else norm.ppf(0.975)
    cover = 0
    for i in tgt:
        a = np.array([1.0, C[i]])
        # the target is a star whose instrumental magnitude is G with sigma_inst; its standard error is the
        # parameters' plus its own inst error (scaled when the fit was) and the catalogue error is the truth's error
        var = sm ** 2 * sc + float(a @ covc @ a)
        pred = m[i] + float(a @ thc)
        if abs(pred - M[i]) <= q * math.sqrt(var + sM[i] ** 2):
            cover += 1
    out["holdout"] = {"n": int(len(tgt)), "cover95": cover / len(tgt)}
    # the quadratic term as a report
    A2 = np.vstack([np.ones(len(idx)), C[idx], C[idx] ** 2]).T / sig[idx, None]
    th2 = np.linalg.lstsq(A2, y[idx] / sig[idx], rcond=None)[0]
    cov2 = np.linalg.inv(A2.T @ A2)
    r2 = y[idx] / sig[idx] - A2 @ th2
    c22 = float(r2 @ r2)
    sc2 = max(1.0, c22 / (len(idx) - 3))
    out["quadratic"] = {"theta": th2.tolist(), "significance": float(abs(th2[2]) / math.sqrt(cov2[2, 2] * sc2))}
    return out


def main():
    args = sys.argv[1:]
    out_path = args[0]
    opt = {args[i]: args[i + 1] for i in range(1, len(args) - 1, 2)}
    res = {"oracle": "photometric-calibration-212", "numpy": np.__version__}
    import scipy, astropy
    res["scipy"], res["astropy"] = scipy.__version__, astropy.__version__
    res["nights"] = nights()
    res["airmass"] = airmass()
    if "--bands" in opt:
        bands = {b["id"]: b for b in json.load(open(opt["--bands"]))}
        res["physical"] = physical(bands)
    if "--ngc" in opt:
        res["ngc2420"] = ngc(json.load(open(opt["--ngc"])))
    json.dump(res, open(out_path, "w"), indent=1)


if __name__ == "__main__":
    main()
