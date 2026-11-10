"""The independent oracle of the follow-up to the population inference gate (Roadmap III, Prompt 264).

/usr/bin/python3 -E tools/population-oracle/oracle_followup.py stage1 <followup-thresholds.json> <thresholds.json>
    <oracle-results.json> <oracle.py> <scratch dir> <followup-oracle-results.json>
/usr/bin/python3 -E tools/population-oracle/oracle_followup.py stage2 <same seven arguments>

An independent implementation: it reads no Gravitas code and no output of the prototype. numpy, scipy
and the standard library only. Stage 1 reads the pinned Part A samples and draws its own numpy ensemble
of U3c; stage 2 reads the stream sample files (draws only: x and sigma), which is the cross-feed.

kernel, loglik, fit_lbfgs, fit_fixed, Profile, penalised and gen_objects are copied without change from
tools/population-oracle/oracle.py at 48d21711; the program checks that the source text of each is found
verbatim in that file before it computes anything.
"""

import hashlib
import inspect
import json
import math
import os
import sys
import time

import numpy as np
import scipy
from scipy import optimize, stats
from scipy.integrate import quad
from scipy.special import ndtr

stage, fthr_path, thr_path, pinned_path, parta_oracle_path, scratch, out_path = sys.argv[1:8]
fthr_bytes = open(fthr_path, "rb").read()
fthr = json.loads(fthr_bytes)
thr_bytes = open(thr_path, "rb").read()
thr = json.loads(thr_bytes)
pinned_bytes = open(pinned_path, "rb").read()
pinned = json.loads(pinned_bytes)
CONST = thr["constants"]
LEVELS = CONST["levels"]
LIMIT_LEVEL = CONST["limitLevel"]
FLOOR = CONST["floor"]
ZERO_MU = CONST["zeroMu"]
UNBOUNDED = CONST["unboundedFactor"]
THR_OF = {str(L): float(stats.chi2.ppf(L, 1)) for L in LEVELS}
LIMIT_DEV = -2.0 * math.log(1.0 - LIMIT_LEVEL)
t_start = time.process_time()
sha = lambda b: hashlib.sha256(b).hexdigest()

# ----------------------------------------------------------------------------
# copied without change from oracle.py at 48d21711
# ----------------------------------------------------------------------------


def kernel(x, s, edges):
    """K_ij: the density of the measured x_i from a true value uniform in bin j."""
    lo, hi = edges[:-1], edges[1:]
    w = hi - lo
    x = np.asarray(x, float)[:, None]
    s = np.asarray(s, float)[:, None]
    pos = s > 0
    ss = np.where(pos, s, 1.0)
    a = (x - lo) / ss
    b = (x - hi) / ss
    # a > b; use the survival form when both are positive (no cancellation in the tail)
    mass = np.where(b > 0, ndtr(-b) - ndtr(-a), ndtr(a) - ndtr(b))
    inside = (x >= lo) & ((x < hi) | ((x == hi) & (hi == edges[-1])))
    exact = inside.astype(float)
    return np.where(pos, mass, exact) / w


def loglik(mu, K):
    d = np.maximum(K @ mu, 1e-300)
    return float(np.sum(np.log(d)) - np.sum(mu))


def fit_lbfgs(K, start=None):
    n, J = K.shape
    mu0 = np.full(J, max(n, 1) / J) if start is None else np.maximum(start, 1e-9)

    def f(mu):
        d = np.maximum(K @ mu, 1e-300)
        return -(np.sum(np.log(d)) - np.sum(mu)), -((K / d[:, None]).sum(axis=0) - 1.0)

    r = optimize.minimize(
        f,
        mu0,
        jac=True,
        method="L-BFGS-B",
        bounds=[(0.0, None)] * J,
        options={"ftol": 1e-16, "gtol": 1e-11, "maxiter": 100000, "maxfun": 400000, "maxcor": 30},
    )
    mu = np.maximum(r.x, 0.0)
    # a short polish by EM keeps a component at an exact zero where the bound is active
    for _ in range(50):
        d = np.maximum(K @ mu, 1e-300)
        mu = mu * (K / d[:, None]).sum(axis=0)
    if loglik(mu, K) < -r.fun - 1e-12:
        mu = np.maximum(r.x, 0.0)
    return mu, loglik(mu, K), bool(r.success)


def fit_fixed(K, j, m, start):
    """Maximum over the other mu at mu_j = m."""
    n, J = K.shape
    others = [k for k in range(J) if k != j]
    Kj, Ko = K[:, j] * m, K[:, others]
    s0 = np.maximum(np.array([start[k] for k in others]), 1e-9)

    def f(nu):
        d = np.maximum(Ko @ nu + Kj, 1e-300)
        return -(np.sum(np.log(d)) - np.sum(nu) - m), -((Ko / d[:, None]).sum(axis=0) - 1.0)

    r = optimize.minimize(
        f,
        s0,
        jac=True,
        method="L-BFGS-B",
        bounds=[(0.0, None)] * len(others),
        options={"ftol": 1e-16, "gtol": 1e-11, "maxiter": 100000, "maxfun": 400000, "maxcor": 30},
    )
    nu = np.maximum(r.x, 0.0)
    for _ in range(50):
        d = np.maximum(Ko @ nu + Kj, 1e-300)
        nu = nu * (Ko / d[:, None]).sum(axis=0)
    mu = np.empty(J)
    mu[others] = nu
    mu[j] = m
    best = loglik(mu, K)
    mu2 = np.empty(J)
    mu2[others] = np.maximum(r.x, 0.0)
    mu2[j] = m
    if loglik(mu2, K) > best:
        return loglik(mu2, K), mu2
    return best, mu


class Profile:
    def __init__(self, K, mu_hat, ell_hat):
        self.K, self.mu_hat, self.ell_hat = K, mu_hat, ell_hat

    def D(self, j, m):
        ell, _ = fit_fixed(self.K, j, m, self.mu_hat)
        return max(0.0, 2.0 * (self.ell_hat - ell))

    def root(self, j, level_dev, lo, hi):
        f = lambda m: self.D(j, m) - level_dev
        return optimize.brentq(f, lo, hi, xtol=1e-13, rtol=1e-13, maxiter=500)

    def interval(self, j, dev):
        mh = float(self.mu_hat[j])
        if self.D(j, 0.0) <= dev:
            lo = 0.0
        else:
            lo = self.root(j, dev, 0.0, mh)
        top = max(mh, 1.0)
        cap = UNBOUNDED * max(mh, 1.0)
        prev = mh
        while self.D(j, top) < dev:
            prev = top
            if top >= cap:
                return lo, None
            top *= 2.0
        hi = self.root(j, dev, prev, top)
        return lo, hi

    def limit(self, j):
        top = 1.0
        while self.D(j, top) < LIMIT_DEV:
            top *= 2.0
            if top > 1e9:
                return None
        return self.root(j, LIMIT_DEV, 0.0, top)


def penalised(K, E, r, kappa, theta0):
    J = K.shape[1]
    D2 = np.zeros((max(J - 2, 0), J))
    for i in range(J - 2):
        D2[i, i], D2[i, i + 1], D2[i, i + 2] = 1.0, -2.0, 1.0
    scale = E / r

    def f(theta):
        mu = scale * np.exp(theta)
        d = np.maximum(K @ mu, 1e-300)
        ell = np.sum(np.log(d)) - np.sum(mu)
        g = -mu * ((K / d[:, None]).sum(axis=0) - 1.0)
        dt = D2 @ theta
        return -ell + 0.5 * kappa * float(dt @ dt), g + kappa * (D2.T @ dt)

    res = optimize.minimize(f, theta0, jac=True, method="BFGS", options={"gtol": 1e-10, "maxiter": 20000})
    return res.x, float(res.fun), bool(res.success)


def gen_objects(rng, edges, mu, sig):
    w = np.diff(edges)
    xs, ss = [], []
    for j, m in enumerate(mu):
        n = int(rng.poisson(m))
        if n == 0:
            continue
        u = rng.uniform(edges[j], edges[j + 1], size=n)
        if sig[1] > 0:
            s = w[j] * np.exp(rng.uniform(math.log(sig[0]), math.log(sig[1]), size=n))
        else:
            s = np.zeros(n)
        xs.append(u + s * rng.standard_normal(n))
        ss.append(s)
    if not xs:
        return np.array([]), np.array([])
    return np.concatenate(xs), np.concatenate(ss)


COPIED = [kernel, loglik, fit_lbfgs, fit_fixed, Profile, penalised, gen_objects]
parta_text = open(parta_oracle_path, "r").read()
verbatim = {}
for fn in COPIED:
    src = inspect.getsource(fn)
    verbatim[fn.__name__] = src in parta_text
if not all(verbatim.values()):
    raise SystemExit("a copied function is not verbatim: %r" % verbatim)

# ----------------------------------------------------------------------------
# written for the follow-up: the second penalised algorithm (Newton, analytic Hessian, flat start)
# ----------------------------------------------------------------------------


def second_diff(J):
    D2 = np.zeros((max(J - 2, 0), J))
    for i in range(J - 2):
        D2[i, i], D2[i, i + 1], D2[i, i + 2] = 1.0, -2.0, 1.0
    return D2


def pen_parts(K, scale, kappa, D2, theta):
    """The penalised objective -l + (kappa / 2) |D2 theta|^2, its gradient, its Hessian and the Hessian of -l alone."""
    mu = scale * np.exp(theta)
    d = np.maximum(K @ mu, 1e-300)
    W = (K / d[:, None]) * mu  # W_ij = K_ij mu_j / d_i
    a = W.sum(axis=0)  # mu_j sum_i K_ij / d_i
    ell = float(np.sum(np.log(d)) - np.sum(mu))
    gl = a - mu  # dl / dtheta_j
    Hneg = W.T @ W - np.diag(gl)  # the Hessian of -l in theta
    dt = D2 @ theta
    obj = -ell + 0.5 * kappa * float(dt @ dt)
    grad = -gl + kappa * (D2.T @ dt)
    H = Hneg + kappa * (D2.T @ D2)
    return obj, grad, H, Hneg


def pen_newton(K, E, r, kappa):
    n, J = K.shape
    scale = E / r
    D2 = second_diff(J)
    theta = np.full(J, math.log(max(n, 1) / float(np.sum(scale))))
    last = None
    it = 0
    for it in range(400):
        obj, g, H, _ = pen_parts(K, scale, kappa, D2, theta)
        w = np.linalg.eigvalsh(H)
        Hm = H
        if w[0] <= 1e-10 * max(1.0, w[-1]):
            Hm = H + (1e-6 * max(1.0, w[-1]) - w[0]) * np.eye(J)
        step = np.linalg.solve(Hm, -g)
        smax = float(np.max(np.abs(step)))
        last = smax
        if smax < 1e-12:
            break
        t = 1.0
        if smax > 1e-7:
            # far from the optimum: backtrack on the objective; near it the full Newton step is taken
            while t > 1e-12:
                o2 = pen_parts(K, scale, kappa, D2, theta + t * step)[0]
                if o2 <= obj + 1e-4 * t * float(g @ step):
                    break
                t *= 0.5
        theta = theta + t * step
    obj, g, H, Hneg = pen_parts(K, scale, kappa, D2, theta)
    return {
        "theta": theta,
        "iterations": it + 1,
        "lastStep": last,
        "gmax": float(np.max(np.abs(g))),
        "minEig": float(np.linalg.eigvalsh(H)[0]),
        "minEigUnpenalised": float(np.linalg.eigvalsh(Hneg)[0]),
        "objective": obj,
    }


def both_penalised(K, E, r, kappa):
    """Part A's BFGS from Part A's start, and the Newton iteration from a flat start."""
    mu, ell, ok = fit_lbfgs(K)
    th0 = np.log(np.maximum(mu, 0.5) * r / E)
    th_b, obj_b, ok_b = penalised(K, E, r, float(kappa), th0)
    nw = pen_newton(K, E, r, float(kappa))
    return mu, ell, th_b, ok_b, nw


def logistic_mean(a, s, lo, hi):
    v, _ = quad(lambda u: 1.0 / (1.0 + math.exp(-(u - a) / s)), lo, hi, epsabs=1e-13, epsrel=1e-13)
    return v / (hi - lo)


U1_EDGES = np.arange(0.0, 9.0)
Z = fthr["ensembles"]["zeroBins"]["Z"]
FU = fthr["ensembles"]["followUp"]
KAPPAS = [float(k) for k in CONST["kappaGrid"]]
os.makedirs(scratch, exist_ok=True)


def write_json(path, obj):
    with open(path, "w") as f:
        json.dump(obj, f, allow_nan=False)
    return sha(open(path, "rb").read())


head = {
    "format": "gravitas.population-inference-gate-followup-oracle-results/1",
    "followupThresholdsSha256": sha(fthr_bytes),
    "thresholdsSha256": sha(thr_bytes),
    "partAOracleResultsSha256": sha(pinned_bytes),
    "partAOracleSourceSha256": sha(parta_text.encode()),
    "python": sys.version.split()[0],
    "numpy": np.__version__,
    "scipy": scipy.__version__,
    "copiedVerbatim": verbatim,
}

if stage == "stage1":
    # ---- F2: the pinned reference samples and the pinned exposure
    f2 = {"maxRelLogLik": 0.0, "maxAbsTheta": 0.0, "per": {}}
    ref = {}
    po1 = 0.0
    for sid in ("S1", "S3"):
        d = pinned["designs"][sid]
        edges = np.array(d["edges"], float)
        E = np.array(d["exposure"], float)
        r = np.array(d["reliability"], float)
        x = np.array(d["objects"]["x"], float)
        s = np.array(d["objects"]["sigma"], float)
        K = kernel(x, s, edges)
        for kappa in CONST["kappaGrid"]:
            mu, ell, th_b, ok_b, nw = both_penalised(K, E, r, kappa)
            e_ll = abs(ell - d["fit"]["logLik"]) / abs(d["fit"]["logLik"])
            e_th = float(np.max(np.abs(th_b - np.array(d["penalty"][str(kappa)]["theta"]))))
            f2["maxRelLogLik"] = max(f2["maxRelLogLik"], e_ll)
            f2["maxAbsTheta"] = max(f2["maxAbsTheta"], e_th)
            f2["per"]["%s-%s" % (sid, kappa)] = e_th
            diff = float(np.max(np.abs(th_b - nw["theta"])))
            po1 = max(po1, diff)
            ref["%s-%s" % (sid, kappa)] = {
                "thetaNewton": nw["theta"].tolist(),
                "thetaBfgs": th_b.tolist(),
                "bfgsSuccess": ok_b,
                "newtonIterations": nw["iterations"],
                "newtonLastStep": nw["lastStep"],
                "gmaxNewton": nw["gmax"],
                "minEig": nw["minEig"],
                "minEigUnpenalised": nw["minEigUnpenalised"],
                "maxAbsThetaBfgsVsNewton": diff,
                "objects": int(len(x)),
            }
    m_t = 0.5 + 0.8 * (np.arange(500) + 0.5) / 500.0
    E_U1 = np.array([sum(logistic_mean(m, 0.35, U1_EDGES[j], U1_EDGES[j + 1]) for m in m_t) for j in range(8)])
    pinnedE = np.array(pinned["exposure"]["U1"]["E"])
    f2["maxRelExposureU1"] = float(np.max(np.abs(E_U1 - pinnedE) / pinnedE))

    # ---- D8b.oracle: the oracle's own numpy ensemble of U3c
    gamma_U3 = np.array(thr["scenarios"]["U1"]["gamma"], float) / 6.0
    mu_U3 = E_U1 * gamma_U3
    reps = FU["U3c"]["oracleReplicates"]
    base = FU["U3c"]["baseSeed"]
    dev95 = THR_OF["0.95"]
    stat = np.zeros((reps, 8), dtype=int)  # 0 ok, 1 upper-limit
    cov = np.zeros((reps, 8), dtype=int)
    val = np.zeros((reps, 8))  # the deviance at the truth (ok) or the limit as a rate (upper-limit; -1 for none)
    muhat = np.zeros((reps, 8))
    samples = []
    fail = 0
    for q in range(reps):
        rng = np.random.default_rng(base + q)
        x, s = gen_objects(rng, U1_EDGES, mu_U3, [0.1, 0.4])
        samples.append({"x": x.tolist(), "sigma": s.tolist()})
        K = kernel(x, s, U1_EDGES)
        mu, ell, ok = fit_lbfgs(K)
        if not ok:
            fail += 1
        muhat[q] = mu
        prof = Profile(K, mu, ell)
        for j in range(8):
            if mu[j] < ZERO_MU:
                stat[q, j] = 1
                if j in Z:
                    m = prof.limit(j)
                    lim = None if m is None else m / E_U1[j]
                    val[q, j] = -1.0 if lim is None else lim
                    cov[q, j] = 1 if (lim is None or gamma_U3[j] <= lim) else 0
            elif j in Z:
                dv = prof.D(j, mu_U3[j])
                val[q, j] = dv
                cov[q, j] = 1 if dv <= dev95 else 0
    samples_sha = write_json(os.path.join(scratch, "u3c-numpy-samples.json"), {"baseSeed": base, "edges": U1_EDGES.tolist(), "exposure": E_U1.tolist(), "gamma": gamma_U3.tolist(), "replicates": samples})
    statements_sha = write_json(
        os.path.join(scratch, "u3c-numpy-statements.json"),
        {"Z": Z, "status": stat[:, Z].tolist(), "covered": cov[:, Z].tolist(), "value": val[:, Z].tolist(), "muHat": muhat[:, Z].tolist()},
    )
    per = {}
    zs_all = 0
    zc_all = 0
    for j in Z:
        zs = int(np.sum(stat[:, j] == 1))
        zc = int(np.sum((stat[:, j] == 1) & (cov[:, j] == 1)))
        zs_all += zs
        zc_all += zc
        per[str(j)] = {"statements": reps, "covered": int(cov[:, j].sum()), "coverage": float(cov[:, j].sum() / reps), "zeroStatements": zs, "zeroCovered": zc, "muTrue": float(mu_U3[j])}
    covered = int(cov[:, Z].sum())
    outside = int(sum(np.sum(stat[:, j] == 1) for j in range(8) if j not in Z))
    # ---- D8b.r3: the exact unconditional coverage of 229's rule on the counts path, by scipy.stats
    def counts_exact(mu_true):
        tot = 0.0
        ns = []
        for n in range(1, 400):
            lo = float(stats.chi2.ppf(0.025, 2 * n)) / 2.0
            hi = float(stats.chi2.ppf(0.975, 2 * n + 2)) / 2.0
            if lo <= mu_true <= hi:
                tot += float(stats.poisson.pmf(n, mu_true))
                ns.append(n)
        zero_covers = mu_true <= -math.log(1.0 - LIMIT_LEVEL)
        if zero_covers:
            tot += float(stats.poisson.pmf(0, mu_true))
        return {"muTrue": mu_true, "coverage": tot, "coveringCounts": [ns[0], ns[-1]] if ns else None, "zeroCovers": bool(zero_covers), "probabilityOfZero": float(stats.poisson.pmf(0, mu_true))}

    out = dict(head)
    out["stage1"] = {
        "F2": f2,
        "referenceFits": ref,
        "PO1reference": po1,
        "exposureU1": E_U1.tolist(),
        "D8b": {
            "replicates": reps,
            "baseSeed": base,
            "Z": Z,
            "muTrue": mu_U3.tolist(),
            "perBin": per,
            "statements": reps * len(Z),
            "covered": covered,
            "pooled": covered / (reps * len(Z)),
            "zeroStatements": zs_all,
            "zeroCovered": zc_all,
            "conditionalShare": (zc_all / zs_all) if zs_all else None,
            "zeroStatementsOutsideZ": outside,
            "fitsNotSuccessful": fail,
            "samplesFile": "u3c-numpy-samples.json",
            "samplesSha256": samples_sha,
            "statementsFile": "u3c-numpy-statements.json",
            "statementsSha256": statements_sha,
        },
        "countsExact": {str(j): counts_exact(float(mu_U3[j])) for j in Z},
        "countsExactAt5": counts_exact(5.0),
        "cpuSeconds": time.process_time() - t_start,
    }
elif stage in ("stage2", "stage2b"):
    out = json.loads(open(out_path, "rb").read())
    for k, v in head.items():
        if k in out and out[k] != v and k not in ("copiedVerbatim", "followupThresholdsSha256"):
            raise SystemExit("stage 2 does not see the inputs stage 1 pinned: %s" % k)
    sets = {
        "P3": {"file": "p3-stream.json", "E": 12.0, "kappas": [4.0]},
        "P3c": {"file": "p3c-stream.json", "E": 12.0, "kappas": KAPPAS},
        "P4c": {"file": "p4c-stream.json", "E": 60.0, "kappas": KAPPAS},
    }
    if stage == "stage2b":
        # amendment AM-F2: Part A's P4 ensemble, for PD3's classes; stages 1 and 2 are left as pinned
        sets = {"P4": {"file": "p4-stream.json", "E": 60.0, "kappas": KAPPAS}}
    edges = np.arange(0.0, 11.0)
    r = np.ones(10)
    res = {}
    thetas = {}
    po1 = 0.0
    for name, sp in sets.items():
        raw = open(os.path.join(scratch, sp["file"]), "rb").read()
        data = json.loads(raw)
        E = np.full(10, sp["E"])
        rec = {"file": sp["file"], "sha256": sha(raw), "baseSeed": data["baseSeed"], "replicates": len(data["replicates"]), "kappas": sp["kappas"], "empty": 0, "bfgsNotSuccessful": 0, "maxAbsThetaBfgsVsNewton": 0.0, "minEig": None, "negativeUnpenalisedEig": 0, "maxGmaxNewton": 0.0, "maxNewtonIterations": 0, "fits": 0}
        th_all = []
        for q, smp in enumerate(data["replicates"]):
            x = np.array(smp["x"], float)
            s = np.array(smp["sigma"], float)
            row = []
            if len(x) == 0:
                rec["empty"] += 1
                th_all.append(None)
                continue
            K = kernel(x, s, edges)
            for kappa in sp["kappas"]:
                mu, ell, th_b, ok_b, nw = both_penalised(K, E, r, kappa)
                diff = float(np.max(np.abs(th_b - nw["theta"])))
                rec["fits"] += 1
                rec["maxAbsThetaBfgsVsNewton"] = max(rec["maxAbsThetaBfgsVsNewton"], diff)
                rec["minEig"] = nw["minEig"] if rec["minEig"] is None else min(rec["minEig"], nw["minEig"])
                rec["negativeUnpenalisedEig"] += 1 if nw["minEigUnpenalised"] < 0 else 0
                rec["maxGmaxNewton"] = max(rec["maxGmaxNewton"], nw["gmax"])
                rec["maxNewtonIterations"] = max(rec["maxNewtonIterations"], nw["iterations"])
                rec["bfgsNotSuccessful"] += 0 if ok_b else 1
                row.append(nw["theta"].tolist())
            th_all.append(row)
        po1 = max(po1, rec["maxAbsThetaBfgsVsNewton"])
        thetas[name] = th_all
        res[name] = rec
    th_name = "oracle-penalised-thetas.json" if stage == "stage2" else "oracle-penalised-thetas-p4.json"
    th_sha = write_json(os.path.join(scratch, th_name), thetas)
    out[stage] = {"sets": res, "PO1stream": po1, "thetasFile": th_name, "thetasSha256": th_sha, "followupThresholdsSha256": sha(fthr_bytes), "cpuSeconds": time.process_time() - t_start}
else:
    raise SystemExit("unknown stage")

with open(out_path, "w") as f:
    json.dump(out, f, indent=1, allow_nan=False)
    f.write("\n")
print("ok", stage, out_path, "cpu %.1fs" % (time.process_time() - t_start))
