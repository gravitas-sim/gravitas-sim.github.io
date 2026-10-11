"""Offline reference chains for the posterior-sampling gate (THRESHOLDS.md).

emcee 3.1.6, 64 walkers, the stretch move, 20,000 steps, the first 5,000
discarded, fixed seeds. G and B are analytic here; P and T are the likelihood
the JavaScript core tabulated (reference-export.mjs), interpolated by a
bicubic spline. Writes reference/<id>.emcee.json: 4,000 thinned draws, emcee's
integrated autocorrelation time, and the quantiles of the whole kept chain.

    python3 spike/sampler/reference.py
"""
import hashlib, json, os
import numpy as np
import emcee
from scipy.interpolate import RectBivariateSpline

HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(HERE, "reference")
STEPS, BURN, WALKERS, KEEP = 20000, 5000, 64, 4000


def run(name, logp, d, center, scale, seed, lo=None, hi=None):
    rng = np.random.default_rng(seed)
    p0 = np.array(center) + 3 * np.array(scale) * rng.standard_normal((WALKERS, d))
    if lo is not None:
        p0 = np.clip(p0, np.array(lo) + 1e-9, np.array(hi) - 1e-9)
    s = emcee.EnsembleSampler(WALKERS, d, logp, moves=[(emcee.moves.StretchMove(a=2.0), 1.0)])
    s.random_state = np.random.RandomState(seed)  # emcee 3 draws from this state
    s.run_mcmc(p0, STEPS, progress=False)
    chain = s.get_chain(discard=BURN)  # steps, walkers, d
    flat = chain.reshape(-1, d)
    tau = emcee.autocorr.integrated_time(chain, quiet=True)  # mean over walkers, per parameter
    idx = np.linspace(0, len(flat) - 1, KEEP).astype(int)
    draws = np.round(flat[idx], 8)
    q = np.percentile(flat, [16, 50, 84], axis=0)
    out = {
        "problem": name,
        "emcee": emcee.__version__,
        "numpy": np.__version__,
        "walkers": WALKERS,
        "steps": STEPS,
        "burn": BURN,
        "seed": seed,
        "tau": [float(t) for t in tau],
        "stepsOverTau": [float((STEPS - BURN) / t) for t in tau],
        "acceptance": float(np.mean(s.acceptance_fraction)),
        "mean": [float(v) for v in flat.mean(axis=0)],
        "sd": [float(v) for v in flat.std(axis=0, ddof=1)],
        "quantiles": [[float(q[i][k]) for i in range(3)] for k in range(d)],
        "draws": draws.tolist(),
    }
    path = os.path.join(REF, f"{name}.emcee.json")
    with open(path, "w") as f:
        json.dump(out, f, separators=(",", ":"))
    with open(path, "rb") as f:
        digest = hashlib.sha256(f.read()).hexdigest()
    print(name, "tau", np.round(tau, 1), "acc", round(out["acceptance"], 2), "sha256", digest)
    return digest


def gaussian_g():
    sd = np.array([1, 2, 0.5, 3, 1, 0.2])
    mean = np.array([0, 1, -2, 5, 0.3, 10])
    corr = 0.9 ** np.abs(np.subtract.outer(np.arange(6), np.arange(6)))
    cov = corr * np.outer(sd, sd)
    prec = np.linalg.inv(cov)
    return lambda x: -0.5 * (x - mean) @ prec @ (x - mean), mean + 0.5 * sd, sd


def banana():
    return (
        lambda x: -(x[0] ** 2) / 200 - 0.5 * (x[1] + 0.03 * x[0] ** 2 - 3) ** 2,
        [3, 1],
        [10, 4],
    )


def tabulated(name):
    with open(os.path.join(REF, f"{name}.grid.json")) as f:
        h = json.load(f)
    n = h["n"]
    g = np.fromfile(os.path.join(REF, f"{name}.grid.f32"), dtype=np.float32).reshape(n, n).astype(float)
    (a0, a1), (b0, b1) = h["axes"]
    xs = np.linspace(a0, a1, n)
    ys = np.linspace(b0, b1, n)
    g = np.where(np.isfinite(g), g, g[np.isfinite(g)].min() - 50)
    spline = RectBivariateSpline(xs, ys, g, kx=3, ky=3)

    def logp(x):
        if not (a0 <= x[0] <= a1 and b0 <= x[1] <= b1):
            return -np.inf
        return float(spline(x[0], x[1])[0, 0])

    # the posterior's center and scale from the grid itself
    w = np.exp(g - g.max())
    w /= w.sum()
    mx = (w.sum(axis=1) * xs).sum()
    my = (w.sum(axis=0) * ys).sum()
    sx = np.sqrt((w.sum(axis=1) * (xs - mx) ** 2).sum())
    sy = np.sqrt((w.sum(axis=0) * (ys - my) ** 2).sum())
    return logp, [mx, my], [sx, sy], [a0, b0], [a1, b1]


if __name__ == "__main__":
    shas = {}
    lp, c, s = gaussian_g()
    shas["G"] = run("G", lp, 6, c, s, 1031)
    lp, c, s = banana()
    shas["B"] = run("B", lp, 2, c, s, 1032)
    for seed, name in ((1033, "P"), (1034, "T-hd209458-1")):
        lp, c, s, lo, hi = tabulated(name)
        shas[name] = run(name, lp, 2, c, s, seed, lo, hi)
    with open(os.path.join(REF, "SHA256.json"), "w") as f:
        json.dump(shas, f, indent=1)
