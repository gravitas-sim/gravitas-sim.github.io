"""The independent oracle of the population inference gate (Roadmap III, Prompt 264 Part A).

/usr/bin/python3 -E tools/population-oracle/oracle.py <thresholds.json> <out.json>

An independent implementation: it reads no Gravitas code and no output of the
prototype. numpy, scipy and the standard library only. Its output is pinned
before the prototype is run.

It holds, for the legs of the committed thresholds file:
  - the reference samples S1 to S8 (generated here by numpy default_rng) with the
    maximum of the extended log-likelihood by scipy.optimize (L-BFGS-B) and by its
    own EM (a second algorithm), the profile deviance by constrained L-BFGS-B, the
    interval ends by scipy.optimize.brentq, the zero-bin limits, the floor, the
    resolution record and the counts path by scipy.stats.chi2 and scipy.stats.poisson;
  - the penalised maximum by scipy.optimize.minimize on the penalised objective;
  - the exposures of scenarios U1 and M by scipy.integrate.quad;
  - hand example A2;
  - the oracle's own coverage ensemble on scenario U1 (300 replicates).
"""

import hashlib
import json
import math
import sys
import time

import numpy as np
import scipy
from scipy import optimize, stats
from scipy.integrate import quad
from scipy.special import ndtr

thr_path, out_path = sys.argv[1], sys.argv[2]
thr_bytes = open(thr_path, "rb").read()
thr = json.loads(thr_bytes)
CONST = thr["constants"]
LEVELS = CONST["levels"]
LIMIT_LEVEL = CONST["limitLevel"]
FLOOR = CONST["floor"]
ZERO_MU = CONST["zeroMu"]
UNBOUNDED = CONST["unboundedFactor"]
RICH = CONST["richMu"]
THR_OF = {str(L): float(stats.chi2.ppf(L, 1)) for L in LEVELS}
LIMIT_DEV = -2.0 * math.log(1.0 - LIMIT_LEVEL)
t_start = time.process_time()


def r12(a):
    """Round to 12 significant digits (the samples are pinned in this form and fitted in it)."""
    return np.array([float("%.12g" % v) for v in np.atleast_1d(a)])


# ----------------------------------------------------------------------------
# the likelihood
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


def fit_em(K, iters=50000):
    n, J = K.shape
    mu = np.full(J, max(n, 1) / J)
    prev = loglik(mu, K)
    done = 0
    for it in range(iters):
        d = np.maximum(K @ mu, 1e-300)
        mu = mu * (K / d[:, None]).sum(axis=0)
        if it % 10 == 9:
            cur = loglik(mu, K)
            if abs(cur - prev) < 1e-15 * (1 + abs(cur)):
                done = it + 1
                break
            prev = cur
    return mu, loglik(mu, K), done


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


def bins_from_fit(K, edges, E, r, mu_hat, ell_hat):
    """The reported statement of every bin of an object-form fit."""
    prof = Profile(K, mu_hat, ell_hat)
    out = []
    ends = []
    for j in range(len(E)):
        if E[j] < FLOOR:
            out.append({"status": "not-constrained"})
            continue
        if mu_hat[j] < ZERO_MU:
            m = prof.limit(j)
            out.append({"status": "upper-limit", "limit": None if m is None else m * r[j] / E[j]})
            continue
        b = {"status": "ok", "rate": float(mu_hat[j] * r[j] / E[j])}
        for L in LEVELS:
            lo, hi = prof.interval(j, THR_OF[str(L)])
            b["lo_%s" % L] = lo * r[j] / E[j]
            b["hi_%s" % L] = None if hi is None else hi * r[j] / E[j]
            ends.append((j, lo, THR_OF[str(L)]))
            if hi is not None:
                ends.append((j, hi, THR_OF[str(L)]))
        out.append(b)
    # O4: the profile deviance at every end found
    dev_err = 0.0
    for j, m, dev in ends:
        if m <= 0.0:
            continue
        dev_err = max(dev_err, abs(prof.D(j, m) - dev))
    return out, dev_err


def counts_bins(n, E, r):
    """The counts path: n r / E, Garwood (n < 100) or deviance intervals, by scipy.stats."""
    out = []
    for nj, Ej, rj in zip(n, E, r):
        if Ej < FLOOR:
            out.append({"status": "not-constrained"})
            continue
        T = Ej / rj
        if nj == 0:
            out.append({"status": "upper-limit", "limit": -math.log(1.0 - LIMIT_LEVEL) / Ej})
            continue
        b = {"status": "ok", "rate": nj * rj / Ej}
        for L in LEVELS:
            al = (1.0 - L) / 2.0
            if nj < 100:
                lo = float(stats.chi2.ppf(al, 2 * nj)) / 2.0 / T
                hi = float(stats.chi2.ppf(1.0 - al, 2 * nj + 2)) / 2.0 / T
                # the second route: the Poisson tail itself
                lo2 = optimize.brentq(lambda t: stats.poisson.sf(nj - 1, t) - al, 1e-12, nj + 10 * math.sqrt(nj) + 20, xtol=1e-14, rtol=1e-14) / T
                hi2 = optimize.brentq(lambda t: stats.poisson.cdf(nj, t) - al, nj, nj + 20 * math.sqrt(nj) + 40, xtol=1e-14, rtol=1e-14) / T
                b["garwoodRoutes_%s" % L] = max(abs(lo - lo2) / max(lo, 1e-300), abs(hi - hi2) / hi)
                b["method"] = "poisson-garwood"
            else:
                dev = THR_OF[str(L)]
                f = lambda x: 2 * nj * (x - 1 - math.log(x)) - dev
                top = 2.0
                while f(top) < 0:
                    top *= 2.0
                lo = optimize.brentq(f, 1e-12, 1.0, xtol=1e-15, rtol=1e-15) * nj / T
                hi = optimize.brentq(f, 1.0, top, xtol=1e-15, rtol=1e-15) * nj / T
                b["method"] = "poisson-profile"
            b["lo_%s" % L] = lo
            b["hi_%s" % L] = hi
        out.append(b)
    return out


def resolution(x, s, edges):
    w = np.diff(edges)
    idx = np.clip(np.searchsorted(edges, x, side="right") - 1, 0, len(w) - 1)
    med = float(np.median(np.asarray(s) / w[idx])) if len(x) else 0.0
    return {"median": med, "ok": bool(med <= CONST["resolutionMax"])}


# ----------------------------------------------------------------------------
# the penalised maximum
# ----------------------------------------------------------------------------


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


# ----------------------------------------------------------------------------
# generators and designs
# ----------------------------------------------------------------------------


def parse_edges(spec):
    spec = spec.strip()
    if ".." in spec and "," not in spec:
        a, b = spec.split("..")
        return np.arange(float(a), float(b) + 1.0)
    return np.array([float(v) for v in spec.split(",")])


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


designs = {}
checks = {"O1": 0.0, "O3": 0.0, "O4": 0.0}
for d in thr["referenceSamples"]["designs"]:
    rng = np.random.default_rng(d["seed"])
    edges = parse_edges(d["edges"])
    J = len(edges) - 1
    mu_true = np.array(d["mu"], float)
    E = np.array(d.get("exposure", [100.0] * J), float)
    rel = d["reliability"]
    r = np.array(rel if isinstance(rel, list) else [rel] * J, float)
    rec = {"edges": edges.tolist(), "exposure": E.tolist(), "reliability": r.tolist(), "muTrue": mu_true.tolist(), "kind": d["kind"], "seed": d["seed"]}
    if d["kind"] == "counts":
        n = [int(rng.poisson(m)) for m in mu_true]
        rec["counts"] = n
        rec["fit"] = {"bins": counts_bins(n, E, r)}
        # O3: closed form n r / E and the two routes of the Garwood ends
        for b, nj, Ej, rj in zip(rec["fit"]["bins"], n, E, r):
            if b["status"] == "ok":
                checks["O3"] = max(checks["O3"], abs(b["rate"] - nj * rj / Ej) / (nj * rj / Ej))
                for L in LEVELS:
                    if "garwoodRoutes_%s" % L in b:
                        checks["O3"] = max(checks["O3"], b["garwoodRoutes_%s" % L])
    else:
        x, s = gen_objects(rng, edges, mu_true, d["sigma"])
        x, s = r12(x), r12(s)
        rec["objects"] = {"x": x.tolist(), "sigma": s.tolist()}
        K = kernel(x, s, edges)
        mu, ell, ok = fit_lbfgs(K)
        mu_em, ell_em, it_em = fit_em(K)
        checks["O1"] = max(checks["O1"], abs(ell - ell_em))
        bins, dev_err = bins_from_fit(K, edges, E, r, mu, ell)
        checks["O4"] = max(checks["O4"], dev_err)
        rec["fit"] = {
            "logLik": ell,
            "mu": mu.tolist(),
            "success": ok,
            "em": {"logLik": ell_em, "mu": mu_em.tolist(), "iterations": it_em},
            "bins": bins,
            "profileDevError": dev_err,
            "resolution": resolution(x, s, edges),
        }
        if d["id"] in ("S1", "S3"):
            pen = {}
            base = np.maximum(mu, 0.5)
            for kappa in thr["constants"]["kappaGrid"]:
                th0 = np.log(base * r / E)
                th, obj, okp = penalised(K, E, r, float(kappa), th0)
                pen[str(kappa)] = {"theta": th.tolist(), "gamma": np.exp(th).tolist(), "objective": obj, "success": okp}
            rec["penalty"] = pen
    designs[d["id"]] = rec

# ----------------------------------------------------------------------------
# exposures
# ----------------------------------------------------------------------------


def logistic_mean(a, s, lo, hi):
    """The mean over [lo, hi] of 1 / (1 + exp(-(u - a) / s)) by scipy.integrate.quad."""
    v, _ = quad(lambda u: 1.0 / (1.0 + math.exp(-(u - a) / s)), lo, hi, epsabs=1e-13, epsrel=1e-13)
    return v / (hi - lo)


def logistic_mean_closed(a, s, lo, hi):
    f = lambda u: s * np.logaddexp(0.0, (u - a) / s)
    return float((f(hi) - f(lo)) / (hi - lo))


U1_EDGES = np.arange(0.0, 9.0)
m_t = 0.5 + 0.8 * (np.arange(500) + 0.5) / 500.0
# p_t(u) = 1 / (1 + exp((m_t - u) / 0.35)) = 1 / (1 + exp(-(u - m_t) / 0.35)): a logistic in u with a = m_t, s = 0.35
E_U1 = np.array([sum(logistic_mean(m, 0.35, U1_EDGES[j], U1_EDGES[j + 1]) for m in m_t) for j in range(8)])
E_U1_closed = np.array([sum(logistic_mean_closed(m, 0.35, U1_EDGES[j], U1_EDGES[j + 1]) for m in m_t) for j in range(8)])

M_EDGES = np.round(np.arange(-0.5, 1.5 + 1e-9, 0.2), 10)
shell_lo = 5.0 * np.arange(40)
shell_hi = shell_lo + 5.0
vol = (4.0 * math.pi / 3.0) * (shell_hi ** 3 - shell_lo ** 3)
d_mid = 0.5 * (shell_lo + shell_hi)
uLim = (-1.0 + 2.0 * np.log10(d_mid)) / 3.5
E_M = np.array([sum(vol[k] * logistic_mean(uLim[k], 0.1, M_EDGES[j], M_EDGES[j + 1]) for k in range(40)) for j in range(10)])
E_M_closed = np.array([sum(vol[k] * logistic_mean_closed(uLim[k], 0.1, M_EDGES[j], M_EDGES[j + 1]) for k in range(40)) for j in range(10)])
mustar_M = 400.0 * 0.75 ** np.arange(10)

exposure = {
    "U1": {"E": E_U1.tolist(), "closed": E_U1_closed.tolist(), "maxRelClosedVsQuad": float(np.max(np.abs(E_U1 - E_U1_closed) / E_U1))},
    "M": {"E": E_M.tolist(), "closed": E_M_closed.tolist(), "gamma": (mustar_M / E_M).tolist(), "maxRelClosedVsQuad": float(np.max(np.abs(E_M - E_M_closed) / E_M))},
}

# ----------------------------------------------------------------------------
# hand example A2
# ----------------------------------------------------------------------------

edgesA2 = np.array([0.0, 1.0, 2.0])
K2 = kernel(np.array([1.0]), np.array([0.5]), edgesA2)
mu2, ell2, ok2 = fit_lbfgs(K2)
exp_ell = math.log(float(ndtr(2.0) - 0.5)) - 1.0
prof2 = Profile(K2, mu2, ell2)
gstar = optimize.brentq(lambda g: 2.0 * (g - 1.0 - math.log(g)) - THR_OF["0.95"], 1.0, 50.0, xtol=1e-15, rtol=1e-15)
lo2, hi2 = prof2.interval(0, THR_OF["0.95"])
hand = {
    "A2": {
        "total": float(mu2.sum()),
        "logLik": ell2,
        "expectedLogLik": exp_ell,
        "gstarClosed": gstar,
        "profileLo": lo2,
        "profileHi": hi2,
        "mu": mu2.tolist(),
    }
}

# ----------------------------------------------------------------------------
# the oracle's own coverage ensemble: scenario U1, 300 replicates
# ----------------------------------------------------------------------------

gamma_U1 = np.array([0.3, 0.3, 0.3, 0.3, 0.3, 0.06, 0.06, 0.06])
mu_U1 = E_U1 * gamma_U1
rich = [j for j in range(8) if mu_U1[j] >= RICH]
REPS = 300
hits = np.zeros(8)
trials = 0
fail = 0
dev95 = THR_OF["0.95"]
for r_ in range(REPS):
    rng = np.random.default_rng(264100 + r_)
    x, s = gen_objects(rng, U1_EDGES, mu_U1, [0.1, 0.4])
    x, s = r12(x), r12(s)
    K = kernel(x, s, U1_EDGES)
    mu, ell, ok = fit_lbfgs(K)
    if not ok:
        fail += 1
    prof = Profile(K, mu, ell)
    trials += 1
    for j in rich:
        # Gamma_true -> mu_true_j = E_j Gamma_j (r = 1)
        if prof.D(j, mu_U1[j]) <= dev95:
            hits[j] += 1
ens = {
    "replicates": REPS,
    "baseSeed": 264100,
    "richBins": rich,
    "muTrue": mu_U1.tolist(),
    "coveragePerBin": {str(j): float(hits[j] / trials) for j in rich},
    "pooled": float(sum(hits[j] for j in rich) / (trials * len(rich))),
    "fitsNotSuccessful": fail,
}

out = {
    "format": "gravitas.population-inference-gate-oracle-results/1",
    "thresholdsSha256": hashlib.sha256(thr_bytes).hexdigest(),
    "python": sys.version.split()[0],
    "numpy": np.__version__,
    "scipy": scipy.__version__,
    "checks": {"O1maxLogLikDiff": checks["O1"], "O3maxRel": checks["O3"], "O4maxDevErr": checks["O4"]},
    "designs": designs,
    "exposure": exposure,
    "hand": hand,
    "ensembleU1": ens,
    "cpuSeconds": time.process_time() - t_start,
}
with open(out_path, "w") as f:
    json.dump(out, f, indent=1, allow_nan=False)
    f.write("\n")
print("ok", out_path, "cpu %.1fs" % out["cpuSeconds"])
