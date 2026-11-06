#!/usr/bin/env python3
"""
Independent oracle of the corrected-eigenvector convergent point (CE), Roadmap III
Prompt 234 Part A follow-up. Written from the "estimator" block of
tests/fixtures/moving-cluster/followup-thresholds.json (committed 1d71cd33 and
amended by AM4 in 5729b051) in numpy; it uses the Part A oracle's plain pieces
(oracle.py: the sample preparation, the amended membership iteration, the speed
and the plain eigenvector) and no Gravitas code. The CE iteration, the noise
variance, the tau^2 estimator and the bootstrap below are written here, not
ported from the JavaScript module.

    python3 oracle_ce.py --synthetic DIR/synthetic.json --csv hyades.csv \
        --mask DIR/real-zeropoints.json --out oracle-ce-results.json
"""
import argparse
import hashlib
import json
import math
import os
import sys

import numpy as np
import scipy
import astropy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import oracle as O  # noqa: E402  (the Part A oracle)

MIN_SIN = 0.1
TOL = 1e-12
MAX_ITER = 100
SEEDS = {"cases": 234102, "real": 234103}


def basis(n):
    ra = np.arctan2(n[:, 1], n[:, 0])
    dec = np.arcsin(n[:, 2])
    e = np.stack([-np.sin(ra), np.cos(ra), np.zeros_like(ra)], 1)
    g = np.stack([-np.cos(ra) * np.sin(dec), -np.sin(ra) * np.sin(dec), np.cos(dec)], 1)
    return e, g


def angle(a, b):
    return math.atan2(np.linalg.norm(np.cross(a, b)), float(a @ b))


def sin_theta(n, c):
    cn = n @ c
    return np.sqrt(np.clip(1.0 - cn * cn, 0.0, None))


def sign_towards(c, n, t, use):
    """Flip c so that the sum over `use` of t . u(c) is positive, u the unit direction to c on the sky."""
    s = sin_theta(n, c)
    ok = use & (s > 0)
    tu = np.where(ok, (t @ c) / np.where(s > 0, s, 1.0), 0.0)
    return -c if tu.sum() < 0 else c


def plain_cp(b, t, n, use=None):
    if use is None:
        use = np.ones(len(b), bool)
    w, v = np.linalg.eigh(b[use].T @ b[use])
    return sign_towards(v[:, 0], n[use], t[use], np.ones(use.sum(), bool))


def ce_fit(b, t, n, mu, pra, pdec):
    """CE of the stars given by the arrays; returns a dict (converged, c, tau2, iterations, n)."""
    e, g = basis(n)
    s2 = ((b * e).sum(1) * pra) ** 2 + ((b * g).sum(1) * pdec) ** 2
    c_plain = plain_cp(b, t, n)
    u0 = sin_theta(n, c_plain) >= MIN_SIN
    if u0.sum() < 3:
        return dict(converged=False, iterations=0)
    c = plain_cp(b, t, n, u0)
    for k in range(1, MAX_ITER + 1):
        sn = sin_theta(n, c)
        U = sn >= MIN_SIN
        nU = int(U.sum())
        if nU <= 2:
            return dict(converged=False, iterations=k)
        off = b @ c
        lam = float(np.sum(off[U] ** 2))
        with np.errstate(divide="ignore", invalid="ignore"):
            M = sn ** 2 * s2 / mu ** 2
            sum_m = float(np.sum(M[U]))
            tau2 = max(0.0, (lam * nU / (nU - 2) - sum_m) / nU)
            delta2 = tau2 / sn[U] ** 2 + s2[U] / mu[U] ** 2
        S = b[U].T @ b[U] - (t[U] * delta2[:, None]).T @ t[U]
        w, v = np.linalg.eigh(S)
        nxt = sign_towards(v[:, 0], n[U], t[U], np.ones(nU, bool))
        a = angle(nxt, c)
        c = nxt
        if a <= TOL:
            return dict(converged=True, c=c, tau2=tau2, iterations=k, n=nU)
    return dict(converged=False, iterations=MAX_ITER, c=c)


def at_cp(st, pm, sel, c):
    """Speed, per-star parallax and pi_MC at c for the stars sel (indices into st)."""
    sp = O.fit_speed(st, sel, c)
    if sp["n"] < O.MIN_RV:
        return dict(status="cp-only", reason="no-rv", V=sp["V"])
    if sp["meancos2"] < O.MIN_COS2:
        return dict(status="cp-only", reason="perpendicular", V=sp["V"])
    if not (sp["V"] > 0):
        return dict(status="cp-only", reason="sign", V=sp["V"])
    gm = O.geometry(st, c, sel)
    pis = O.star_plx(gm["mu_par"], gm["sin"], sp["V"])
    use = np.isfinite(pis)
    if use.sum() < 5:
        return dict(status="cp-only", reason="no-rv", V=sp["V"])
    return dict(status="ok", reason=None, V=float(sp["V"]), pi_mc=O.wmean(st, sel[use], pis[use]),
                per_star=[[int(st["index"][i]), float(v)] for i, v in zip(sel[use], pis[use])], n_used=int(use.sum()))


def arrays(st, pm, sel):
    return st["b"][sel], st["t"][sel], st["n"][sel], st["mu"][sel], pm["ra"][sel], pm["dec"][sel]


def ce_bootstrap(st, pm, members_local, B, rng):
    M = np.asarray(members_local)
    n = len(M)
    reps = []
    disc = 0
    for _ in range(B):
        pick = M[rng.integers(0, n, n)]
        fit = ce_fit(*arrays(st, pm, pick))
        if not fit["converged"]:
            disc += 1
            continue
        sp = O.fit_speed(st, pick, fit["c"])
        if not (sp["V"] > 0):
            disc += 1
            continue
        gm = O.geometry(st, fit["c"], pick)
        pis = O.star_plx(gm["mu_par"], gm["sin"], sp["V"])
        use = np.isfinite(pis)
        if use.sum() < 5:
            disc += 1
            continue
        reps.append(O.wmean(st, pick[use], pis[use]))
    reps = np.sort(np.array(reps))
    lo, hi = np.percentile(reps, [15.865, 84.135])
    return dict(sigma=float(0.5 * (hi - lo)), discarded=disc, replicates=int(len(reps)))


def run_case(rows, mask=None, B=4000, seed=234102, baseline=True):
    st = O.prepare(rows, mask=mask)
    idx = st["index"]
    pm = dict(
        ra=np.array([rows[i].get("pmraError", rows[i]["parallaxError"]) for i in idx], float),
        dec=np.array([rows[i].get("pmdecError", rows[i]["parallaxError"]) for i in idx], float),
    )
    plain = O.analyse(st, "amended")
    rec = dict(plain_status=plain["status"], plain_reason=plain.get("reason"))
    if plain["status"] == "refused":
        rec.update(status="refused", reason=plain.get("reason"), members=[])
        return rec
    members_rows = plain["members"]
    local = np.array([int(np.nonzero(idx == m)[0][0]) for m in members_rows])
    fit = ce_fit(*arrays(st, pm, local))
    rec["members"] = [int(m) for m in members_rows]
    if not fit["converged"]:
        rec.update(status="refused", reason="ce-no-convergence", iterations=fit["iterations"])
        return rec
    c = fit["c"]
    rec.update(cp=[float(x) for x in c], tau2=float(fit["tau2"]), iterations=int(fit["iterations"]), n_u=int(fit["n"]))
    d = at_cp(st, pm, local, c)
    rec.update({("piMC" if k == "pi_mc" else "perStar" if k == "per_star" else k): v for k, v in d.items()})
    if d["status"] == "ok" and baseline:
        rng = np.random.default_rng(seed)
        rec["sigmaMC"] = ce_bootstrap(st, pm, local, B, rng)["sigma"]
    return rec


def read_csv(path):
    import csv
    rows = []
    with open(path, newline="") as fh:
        for r in csv.DictReader(fh):
            def f(k):
                v = r[k]
                return None if v == "" else float(v)
            rows.append(dict(
                id=r["source_id"], ra=f("ra"), dec=f("dec"), parallax=f("parallax"), parallaxError=f("parallax_error"),
                pmra=f("pmra"), pmdec=f("pmdec"), pmraError=f("pmra_error"), pmdecError=f("pmdec_error"),
                rv=f("radial_velocity"), rvError=f("radial_velocity_error"),
                ruwe=f("ruwe"), params=int(r["astrometric_params_solved"]),
            ))
    return rows


def clean(o):
    """NaN and infinity become null, so the output is plain JSON."""
    if isinstance(o, float) and not math.isfinite(o):
        return None
    if isinstance(o, dict):
        return {k: clean(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [clean(v) for v in o]
    return o


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--synthetic")
    ap.add_argument("--csv")
    ap.add_argument("--mask")
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    result = {
        "format": "gravitas.moving-cluster-followup-oracle/1",
        "versions": {"python": sys.version.split()[0], "numpy": np.__version__, "scipy": scipy.__version__, "astropy": astropy.__version__},
        "bootstrap": {"B": 4000, "generator": "numpy.random.default_rng(seed), seeds " + json.dumps(SEEDS)},
    }
    if a.synthetic:
        raw = open(a.synthetic, "rb").read()
        data = json.loads(raw)
        result["synthetic"] = {"sha256": hashlib.sha256(raw).hexdigest(), "thresholdsSha256": data["thresholdsSha256"],
                               "followupSha256": data["followupSha256"]}
        cases = []
        for c in data["cases"]:
            rows = c["rows"]
            cases.append({"id": c["id"], "ce": run_case(rows, B=4000, seed=SEEDS["cases"], baseline=c["baseline"])})
        result["cases"] = cases
    if a.csv:
        raw = open(a.csv, "rb").read()
        rows = read_csv(a.csv)
        maskraw = open(a.mask, "rb").read()
        zp = json.loads(maskraw)["zeroPoints"]
        mask = np.array([z is not None for z in zp])
        cuts = np.array([(r["params"] in (31, 95)) and r["ruwe"] < 1.4 for r in rows])
        rec = run_case(rows, mask=cuts & mask, B=4000, seed=SEEDS["real"], baseline=True)
        result["real"] = {"sha256": hashlib.sha256(raw).hexdigest(), "maskSha256": hashlib.sha256(maskraw).hexdigest(), "ce": rec}
    result["script"] = {"sha256": hashlib.sha256(open(__file__, "rb").read()).hexdigest()}
    json.dump(clean(result), open(a.out, "w"))
    print("wrote", a.out)


if __name__ == "__main__":
    main()
