#!/usr/bin/env python3
"""Runs the posterior-sampling notebook's sampler on the cases the Prompt 103 gate used.

    python3 tools/compute-sampler-cases.py <notebook.ipynb> <cells sha256> <out.json>

Roadmap II Prompt 102 (COMPUTE.md). The sampler is the notebook's own: its
sampler cell, taken from the vendored file and run exactly as the frame runs
it, on problems whose answers are known exactly (SAMPLER_GATE.md):

  G  a six-dimensional correlated Gaussian
  B  the twisted Gaussian (Haario's banana)
  P  a straight line fitted to twelve seeded points with normal priors, whose
     posterior is a conjugate normal
  short    ten runs of B far too short to have converged
  bimodal  ten runs on two unit Gaussians twelve apart, two ensembles
           started in each

For each replicate it records what the draws say (mean, standard deviation,
the 16th, 50th and 84th percentiles, and for G the correlations and for B the
slope of x2 on x1 squared) and what the notebook's own diagnostics said of the
run (whether it refuses to report an interval, and why). tests/computeSampler
holds those to the exact answers, which it computes from the formulas, and to
the refusal rules. Needs numpy only. Writes the cell's hash with the results
so that a changed sampler makes the file stale, and the test says so.
"""

import json
import sys

import numpy as np

nb_path, cells_sha, out_path = sys.argv[1:4]
nb = json.load(open(nb_path, encoding="utf-8"))
cells = ["".join(c["source"]) for c in nb["cells"] if c["cell_type"] == "code"]
cell = next(c for c in cells if "def run_ensembles" in c)
g = {}
exec(cell, g)
run_ensembles, diagnose, refusals = g["run_ensembles"], g["diagnose"], g["refusals"]

PCT = [15.87, 50, 84.13]
M = 4


def summarize(chain, burn, acceptance):
    post = chain[burn:].reshape(-1, chain.shape[-1])
    diag = diagnose(chain, burn)
    why = refusals(diag, acceptance)
    return {
        "mean": post.mean(axis=0).tolist(),
        "sd": post.std(axis=0, ddof=1).tolist(),
        "pct": np.percentile(post, PCT, axis=0).T.tolist(),
        "refused": bool(why),
        "why": why,
        "acceptance": float(np.mean(acceptance)),
        "steps_per_tau": [d["steps_per_tau"] for d in diag],
        "ess": [d["ess"] for d in diag],
        "post": post,
    }


def ball(rng, center, scale, d, W):
    """Four over-dispersed ensembles: each its own center, then a ball of three scales."""
    c = center + 2 * scale * rng.standard_normal((M, 1, d))
    return c + 3 * scale * rng.standard_normal((M, W, d))


def replicate(logp, center, scale, d, W, steps, seed):
    rng = np.random.default_rng(seed + 100)
    start = ball(rng, center, scale, d, W)
    chain, acceptance = run_ensembles(logp, start, steps, seed)
    return summarize(chain, steps // 2, acceptance)


def strip(r, extra=None):
    out = {k: v for k, v in r.items() if k != "post"}
    out.update(extra or {})
    return out


results = {"notebook": {"cellsSha256": cells_sha}, "cases": {}}

# G: correlated Gaussian.
sds = np.array([1, 2, 0.5, 3, 1, 0.2])
means = np.array([0, 1, -2, 5, 0.3, 10])
corr = 0.9 ** np.abs(np.subtract.outer(np.arange(6), np.arange(6)))
precision = np.linalg.inv(corr * np.outer(sds, sds))
logp_g = lambda th: -0.5 * np.einsum("ni,ij,nj->n", th - means, precision, th - means)
reps = []
for seed in range(1, 11):
    r = replicate(logp_g, means, sds, 6, 48, 6000, seed)
    reps.append(strip(r, {"corr": np.corrcoef(r["post"].T).tolist()}))
results["cases"]["G"] = {
    "problem": {"d": 6, "sds": sds.tolist(), "means": means.tolist(), "rho": 0.9, "walkers": 48, "steps": 6000},
    "replicates": reps,
}

# B: twisted Gaussian.
logp_b = lambda th: -(th[:, 0] ** 2) / 200 - (th[:, 1] + 0.03 * th[:, 0] ** 2 - 3) ** 2 / 2
b_center, b_scale = np.array([0.0, 0.0]), np.array([10.0, np.sqrt(19)])
reps = []
for seed in range(1, 11):
    r = replicate(logp_b, b_center, b_scale, 2, 16, 8000, seed)
    x1, x2 = r["post"][:, 0], r["post"][:, 1]
    slope = float(np.polyfit(x1**2, x2, 1)[0])
    reps.append(strip(r, {"slope": slope}))
results["cases"]["B"] = {"problem": {"d": 2, "walkers": 16, "steps": 8000}, "replicates": reps}

# P: a straight line with normal priors, a conjugate normal posterior.
rng = np.random.default_rng(20261012)
x = np.arange(1, 13) - 6.5
sigma, tau = 0.5, np.array([5.0, 2.0])
y = 2 + 0.4 * x + sigma * rng.standard_normal(12)
design = np.stack([np.ones(12), x], axis=1)


def logp_p(th):
    resid = y[None, :] - th @ design.T
    return -0.5 * (resid**2).sum(axis=1) / sigma**2 - 0.5 * ((th / tau) ** 2).sum(axis=1)


post_cov = np.linalg.inv(design.T @ design / sigma**2 + np.diag(1 / tau**2))
post_mean = post_cov @ (design.T @ y / sigma**2)
reps = [
    strip(replicate(logp_p, post_mean, np.sqrt(np.diag(post_cov)), 2, 16, 2000, seed))
    for seed in range(1, 11)
]
results["cases"]["P"] = {
    "problem": {
        "d": 2, "x": x.tolist(), "y": y.tolist(), "sigma": sigma, "tau": tau.tolist(),
        "walkers": 16, "steps": 2000,
    },
    "replicates": reps,
}

# Short runs of B: far too short to have converged, so every one must be refused.
results["cases"]["short"] = {
    "problem": {"of": "B", "walkers": 16, "steps": 100},
    "replicates": [strip(replicate(logp_b, b_center, b_scale, 2, 16, 100, seed)) for seed in range(1, 11)],
}


# Bimodal: two unit Gaussians twelve apart in x1; two ensembles start in each mode.
def logp_bi(th):
    a = -0.5 * ((th[:, 0] - 6) ** 2 + th[:, 1] ** 2)
    b = -0.5 * ((th[:, 0] + 6) ** 2 + th[:, 1] ** 2)
    return np.logaddexp(a, b)


reps = []
for seed in range(1, 11):
    rng = np.random.default_rng(seed + 100)
    centers = np.array([[6, 0], [6, 0], [-6, 0], [-6, 0]], float)[:, None, :]
    start = centers + 0.5 * rng.standard_normal((M, 16, 2))
    chain, acceptance = run_ensembles(logp_bi, start, 6000, seed)
    reps.append(strip(summarize(chain, 3000, acceptance)))
results["cases"]["bimodal"] = {
    "problem": {"modes": [[-6, 0], [6, 0]], "walkers": 16, "steps": 6000},
    "replicates": reps,
}

with open(out_path, "w", encoding="utf-8") as f:
    json.dump(results, f, indent=1)
    f.write("\n")
print(out_path)
