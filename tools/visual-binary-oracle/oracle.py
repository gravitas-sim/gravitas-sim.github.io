"""
Independent oracle for the visual-binary gate (Roadmap III, Prompt 218, Part B).

Uses numpy and scipy only; NO Gravitas code. Two jobs:

  b1   the photocentre of a binary from a direct numerical integration of the two-body
       problem (both stars, in the barycentre frame, scipy DOP853, rtol 1e-12), rotated to
       the sky by the Heintz/Thiele-Innes convention (x north, y east), weighted by the
       light of each star, scaled by the parallax;
  b2   the solution of the two-component series in oracle-inputs.json: scipy least_squares of
       the Thiele-Innes orbit of the relative series, then the weighted regression for the
       mass fraction B with the components' offsets c + mu (t - t0) - B r(t).

Run:  python3 -I oracle.py thresholds.json oracle-inputs.json oracle-results.json
"""
import json
import math
import sys

import numpy as np
import scipy
from scipy.integrate import solve_ivp
from scipy.optimize import least_squares

AU = 149597870700.0
GM = 1.3271244e20
YR = 365.25 * 86400.0
MU_AU_YR = GM * YR * YR / AU ** 3  # GM_sun in au^3 / yr^2 from the nominal constants
K = 4 * math.pi ** 2 / MU_AU_YR  # (4 pi^2 au^3) / (GM yr^2): a^3 / P^2 = M / K ... see below


def semi_major_au(m_total, period_yr):
    """a in au from Kepler's third law with the nominal GM: a^3 = GM (P / 2 pi)^2."""
    return (MU_AU_YR * m_total * (period_yr / (2 * math.pi)) ** 2) ** (1.0 / 3.0)


def sky(vec_plane, inc, node, argp):
    """(x north, y east) of an orbital-plane vector (x towards periastron, y 90 degrees ahead)."""
    ci, si = math.cos(inc), math.sin(inc)
    cO, sO = math.cos(node), math.sin(node)
    cw, sw = math.cos(argp), math.sin(argp)
    x, y = vec_plane
    north = (cO * cw - sO * sw * ci) * x + (-cO * sw - sO * cw * ci) * y
    east = (sO * cw + cO * sw * ci) * x + (-sO * sw + cO * cw * ci) * y
    return north, east


def two_body_photocentre(sys_, years):
    """Photocentre offsets (arcsec) of the system at the given decimal years."""
    mA, mB = sys_["MA"], sys_["MB"]
    mt = mA + mB
    B = mB / mt
    l = sys_["lB"]
    P = sys_["P"]
    e = sys_["e"]
    a = semi_major_au(mt, P)
    plx_arcsec = sys_["parallaxMas"] / 1000.0
    rp = a * (1 - e)
    vp = math.sqrt(MU_AU_YR * mt * (1 + e) / rp)
    # both stars in the barycentre frame, at periastron, along the orbital-plane axes
    y0 = np.array([-B * rp, 0.0, (1 - B) * rp, 0.0, 0.0, -B * vp, 0.0, (1 - B) * vp])

    def rhs(_, y):
        xa, ya, xb, yb, vxa, vya, vxb, vyb = y
        dx, dy = xb - xa, yb - ya
        r3 = (dx * dx + dy * dy) ** 1.5
        return [
            vxa, vya, vxb, vyb,
            MU_AU_YR * mB * dx / r3, MU_AU_YR * mB * dy / r3,
            -MU_AU_YR * mA * dx / r3, -MU_AU_YR * mA * dy / r3,
        ]

    t = np.asarray(years, float) - sys_["T"]
    order = np.argsort(t)
    ts = t[order]
    if ts[0] > 0 or ts[-1] < 0:
        pass
    # integrate forward from periastron, and backward for epochs before it
    out = np.zeros((len(t), 8))
    fwd = ts >= 0
    for sel, direction in ((fwd, 1.0), (~fwd, -1.0)):
        if not sel.any():
            continue
        tt = ts[sel]
        tt_run = tt if direction > 0 else tt[::-1]
        sol = solve_ivp(rhs, (0.0, tt_run[-1]), y0, method="DOP853", t_eval=tt_run,
                        rtol=1e-12, atol=1e-14)
        res = sol.y.T
        if direction < 0:
            res = res[::-1]
        out[np.where(sel)[0]] = res
    result = np.zeros((len(t), 2))
    inc, node, argp = (math.radians(sys_[k]) for k in ("i", "Omega", "omega"))
    for k in range(len(t)):
        xa, ya, xb, yb = out[k, :4]
        px = (1 - l) * xa + l * xb
        py = (1 - l) * ya + l * yb
        n, ea = sky((px, py), inc, node, argp)
        result[order[k]] = (n * plx_arcsec, ea * plx_arcsec)
    return result


def kepler_E(M, e):
    M = np.mod(M, 2 * np.pi)
    E = np.where(e < 0.8, M, np.pi)
    for _ in range(60):
        f = E - e * np.sin(E) - M
        E = E - f / (1 - e * np.cos(E))
    return E


def ti_model(p, t, tref):
    lnP, e, tau, A, Bc, F, G = p
    P = math.exp(lnP)
    M = 2 * np.pi * ((t - tref) / P - tau)
    E = kepler_E(M, e)
    X = np.cos(E) - e
    Y = math.sqrt(1 - e * e) * np.sin(E)
    return A * X + F * Y, Bc * X + G * Y


def semi_major_from_ti(A, B, F, G):
    u = 0.5 * (A * A + B * B + F * F + G * G)
    v = A * G - B * F
    return math.sqrt(u + math.sqrt(max(u * u - v * v, 0.0)))


def ln_k3(p):
    return 3 * math.log(semi_major_from_ti(*p[3:])) - 2 * p[0]


def solve_series(case):
    truth = case["truth"]
    ep = case["epochs"]
    t = np.array([q["t"] for q in ep])
    xA = np.array([[q["xA"], q["yA"]] for q in ep])
    xB = np.array([[q["xB"], q["yB"]] for q in ep])
    sA = np.array([q["sA"] for q in ep])
    sB = np.array([q["sB"] for q in ep])
    rel = xB - xA
    srel = np.hypot(sA, sB)
    tref = float(t.mean())
    # start from the truth (a local fit: the oracle checks the minimum, not the search)
    Pt, et = truth["P"], truth["e"]
    start = [
        math.log(Pt), et, (truth["T"] - tref) / Pt % 1.0,
        *truth["thieleInnes"],
    ]

    def resid(p):
        mx, my = ti_model(p, t, tref)
        return np.concatenate([(mx - rel[:, 0]) / srel, (my - rel[:, 1]) / srel])

    sol = least_squares(resid, start, method="lm", xtol=1e-15, ftol=1e-15, gtol=1e-15,
                        max_nfev=4000)
    p = sol.x
    J = sol.jac
    cov = np.linalg.inv(J.T @ J)
    chi2 = float((sol.fun ** 2).sum())
    dof = 2 * len(t) - 7
    scale = math.sqrt(chi2 / dof) if chi2 / dof > 1 else 1.0
    cov = cov * scale ** 2
    # gradient of ln(a^3 / P^2) by central differences
    g = np.zeros(7)
    for k in range(7):
        h = 1e-6 * max(1.0, abs(p[k]))
        a_, b_ = p.copy(), p.copy()
        a_[k] += h
        b_[k] -= h
        g[k] = (ln_k3(a_) - ln_k3(b_)) / (2 * h)
    sig_ln = float(math.sqrt(g @ cov @ g))
    lnk3 = ln_k3(p)
    # the mass fraction: y_A = c + mu tau - B r, y_B - r = same, with r the fitted relative orbit
    rx, ry = ti_model(p, t, tref)
    r = np.column_stack([rx, ry])
    tau = t - tref
    rows, ys, ws = [], [], []
    for coord in (0, 1):
        for k in range(len(t)):
            for who in ("A", "B"):
                row = np.zeros(5)
                row[2 * coord] = 1.0
                row[2 * coord + 1] = tau[k]
                row[4] = -r[k, coord]
                y = xA[k, coord] if who == "A" else xB[k, coord] - r[k, coord]
                rows.append(row)
                ys.append(y)
                ws.append(1.0 / (sA[k] if who == "A" else sB[k]))
    X = np.array(rows) * np.array(ws)[:, None]
    y = np.array(ys) * np.array(ws)
    th, *_ = np.linalg.lstsq(X, y, rcond=None)
    res = y - X @ th
    chi2b = float(res @ res)
    dofb = len(y) - 5
    covb = np.linalg.inv(X.T @ X) * (chi2b / dofb if chi2b / dofb > 1 else 1.0)
    Bhat = float(th[4])
    sB_ = float(math.sqrt(covb[4, 4]))
    # truth in the same terms
    tru_lnk3 = 3 * math.log(truth["aArcsec"]) - 2 * math.log(Pt)
    return {
        "lnK3": lnk3, "sigmaLnK3": sig_ln, "aArcsec": semi_major_from_ti(*p[3:]),
        "P": math.exp(p[0]), "B": Bhat, "sigmaB": sB_, "chi2": chi2, "chi2b": chi2b,
        "trueLnK3": tru_lnk3, "trueB": truth["B"],
        "zLnK3": (lnk3 - tru_lnk3) / sig_ln, "zB": (Bhat - truth["B"]) / sB_,
    }


def main():
    thr = json.load(open(sys.argv[1]))
    out = {
        "format": "gravitas.visual-binary-oracle-results/1",
        "oracle": {
            "python": sys.version.split()[0], "numpy": np.__version__,
            "scipy": scipy.__version__,
            "method": "two-body DOP853 rtol 1e-12; least_squares lm of the Thiele-Innes orbit; numpy lstsq regression",
        },
        "constants": {"GM_au3_yr2": MU_AU_YR, "K": K},
        "b1": {}, "b2": {},
    }
    for name in ("V1", "V2", "V3"):
        s = thr["systems"][name]
        years = [s["start"] + 1.2 * s["P"] * k / 399 for k in range(400)]
        pos = two_body_photocentre(s, years)
        out["b1"][name] = {"years": years, "x": pos[:, 0].tolist(), "y": pos[:, 1].tolist()}
    cases = json.load(open(sys.argv[2]))
    for name, case in cases.items():
        out["b2"][name] = solve_series(case)
    json.dump(out, open(sys.argv[3], "w"), indent=1)


if __name__ == "__main__":
    main()
