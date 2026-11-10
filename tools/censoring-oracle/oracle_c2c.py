"""The independent oracle of the follow-up to the censoring and truncation gate
(Roadmap III, Prompt 262, legs C2c and the cross-feed). SPIKE, never merged.

/usr/bin/python3 -E tools/censoring-oracle/oracle_c2c.py own <followup-thresholds.json> <partA-oracle.py> <scratch-dir> <out.json>
/usr/bin/python3 -E tools/censoring-oracle/oracle_c2c.py fed <followup-thresholds.json> <partA-oracle.py> <scratch-dir> <out.json>

It reads no Gravitas code and no output of the prototype. numpy, scipy and the
standard library only.

  own: generates its four numpy ensembles (Part A's T1 and T2, and the new
       C2c T1 and T2), writes every sample to <scratch-dir>/numpy-<ensemble>.f64,
       judges each with its own estimator, writes the per-sample table to
       <scratch-dir>/oracle-on-numpy-<ensemble>.tab.f64 and the summary to out.json.
  fed: reads <scratch-dir>/stream-<ensemble>.f64 (x and u only, written by the
       Gravitas-stream sample writer, which holds no estimator), judges each
       sample with the same estimator, and adds a "fed" block to out.json
       without touching the "own" block.

gen_truncated and cm_closed are copied without change from oracle.py of Part A;
the copy is checked against that file's text at run time.
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
from scipy.special import ndtr, ndtri

mode, thr_path, parta_path, scratch, out_path = sys.argv[1:6]
thr_bytes = open(thr_path, "rb").read()
thr = json.loads(thr_bytes)
LEVEL = 0.95
MIN_RISK = 10
Z = float(-ndtri((1.0 - LEVEL) / 2.0))
t0 = time.process_time()


def gen_truncated(rng, n):
    xs, us = [], []
    have = 0
    while have < n:
        m = max(4 * (n - have), 256)
        x = rng.standard_normal(m)
        d = rng.uniform(0.0, 1.0, size=m) ** (1.0 / 3.0)
        d = np.maximum(d, 1e-300)
        u = 0.5 + 2.0 * np.log10(d)
        keep = x >= u
        xs.append(x[keep])
        us.append(u[keep])
        have += int(keep.sum())
    x = np.concatenate(xs)[:n]
    u = np.concatenate(us)[:n]
    return x, u


def cm_closed(x, u, frm, min_risk):
    x = np.asarray(x, float)
    u = np.asarray(u, float)
    keep = x >= frm
    xk, uk = x[keep], u[keep]
    xs = np.unique(xk)
    S = 1.0
    support, ns, ds, Ss = [], [], [], []
    for t in xs:
        n = int(((uk <= t) & (xk >= t)).sum())
        d = int((xk == t).sum())
        S_new = S * (1.0 - d / n)
        support.append((float(t), S - S_new))
        ns.append(n)
        ds.append(d)
        Ss.append(S_new)
        S = S_new
    mean = sum(v * m for v, m in support)
    xmax = float(xs[-1])
    nxt = list(xs[1:]) + [xmax]
    contrib = [Ss[i] * (float(nxt[i]) - float(xs[i])) for i in range(len(xs))]
    A = list(np.cumsum(contrib[::-1])[::-1])
    var = sum(a * a * d / (n * (n - d)) for a, d, n in zip(A, ds, ns) if n > d)
    return {
        "from": frm,
        "support": [[v, m] for v, m in support],
        "associatedSets": [[float(t), n] for t, n in zip(xs, ns)],
        "riskAtFrom": ns[0],
        "mean": mean,
        "variance": var,
        "se": math.sqrt(var),
        "xmax": xmax,
    }


def sha_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 22), b""):
            h.update(chunk)
    return h.hexdigest()


def bitmap_hex(flags):
    return np.packbits(np.asarray(flags, dtype=np.uint8)).tobytes().hex()


def judge(x, u, frm, truth):
    """One sample, as the C2o loop of Part A judged it. Returns the table row."""
    kk = x >= frm
    xs, us = x[kk], u[kk]
    if len(xs) == 0:
        return [1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
    t_min = xs.min()
    risk_at = int(((us <= t_min) & (xs >= t_min)).sum())
    if risk_at < MIN_RISK:
        return [1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
    c = cm_closed(x, u, frm, MIN_RISK)
    lo = c["mean"] - Z * c["se"]
    hi = c["mean"] + Z * c["se"]
    covered = 1.0 if lo <= truth <= hi else 0.0
    return [0.0, float(c["riskAtFrom"]), float(len(c["support"])), c["mean"], c["variance"], lo, hi, covered]


def summarise(table, design, truth, extra):
    refused = table[:, 0] == 1.0
    covered = table[:, 7] == 1.0
    reps = design["replicates"]
    risk = table[~refused, 1]
    out = {
        "N": design["N"],
        "from": design["from"],
        "replicates": reps,
        "baseSeed": design["baseSeed"],
        "truth": truth,
        "hits": int(covered.sum()),
        "coverage": int(covered.sum()) / reps,
        "refused": int(refused.sum()),
        "medianRiskAtFrom": float(np.median(risk)) if len(risk) else None,
        "coveredHex": bitmap_hex(covered),
        "refusedHex": bitmap_hex(refused),
    }
    out.update(extra)
    return out


def designs():
    for group in ("orig", "c2c"):
        for name in ("T1", "T2"):
            yield f"{group}-{name}", thr["ensembles"][group][name]


def truth_of(frm):
    return math.exp(-0.5 * frm * frm) / math.sqrt(2 * math.pi) / (1.0 - float(ndtr(frm)))


parta_text = open(parta_path, "r").read()
verbatim = all(inspect.getsource(f) in parta_text for f in (gen_truncated, cm_closed))
env = {"python": sys.version.split()[0], "numpy": np.__version__, "scipy": scipy.__version__, "executable": "/usr/bin/python3 -E"}

if mode == "own":
    block = {}
    for key, d in designs():
        N, frm, reps, base = d["N"], d["from"], d["replicates"], d["baseSeed"]
        truth = truth_of(frm)
        table = np.zeros((reps, 8))
        sample_name = f"numpy-{key}.f64"
        with open(os.path.join(scratch, sample_name), "wb") as f:
            for r in range(reps):
                rng = np.random.default_rng(base + r)
                x, u = gen_truncated(rng, N)
                f.write(np.asarray(x, "<f8").tobytes())
                f.write(np.asarray(u, "<f8").tobytes())
                table[r] = judge(x, u, frm, truth)
        table_name = f"oracle-on-numpy-{key}.tab.f64"
        table.astype("<f8").tofile(os.path.join(scratch, table_name))
        block[key] = summarise(
            table,
            d,
            truth,
            {
                "generator": "numpy default_rng(baseSeed + r), gen_truncated",
                "sampleFile": sample_name,
                "sampleSha256": sha_file(os.path.join(scratch, sample_name)),
                "tableFile": table_name,
                "tableSha256": sha_file(os.path.join(scratch, table_name)),
            },
        )
    out = {
        "format": "gravitas.censoring-truncation-followup-oracle-results/1",
        "thresholdsSha256": hashlib.sha256(thr_bytes).hexdigest(),
        "partAOracleSha256": hashlib.sha256(parta_text.encode()).hexdigest(),
        "functionsVerbatimFromPartA": verbatim,
        "environment": env,
        "z": Z,
        "own": block,
        "ownCpuSeconds": time.process_time() - t0,
    }
elif mode == "fed":
    out = json.load(open(out_path))
    assert "fed" not in out, "the fed block is written once"
    assert out["thresholdsSha256"] == hashlib.sha256(thr_bytes).hexdigest()
    assert out["environment"] == env and out["z"] == Z
    block = {}
    for key, d in designs():
        N, frm, reps = d["N"], d["from"], d["replicates"]
        truth = truth_of(frm)
        sample_name = f"stream-{key}.f64"
        path = os.path.join(scratch, sample_name)
        data = np.fromfile(path, dtype="<f8")
        assert data.size == reps * 2 * N, (key, data.size)
        data = data.reshape(reps, 2, N)
        table = np.zeros((reps, 8))
        for r in range(reps):
            table[r] = judge(data[r, 0], data[r, 1], frm, truth)
        table_name = f"oracle-on-stream-{key}.tab.f64"
        table.astype("<f8").tofile(os.path.join(scratch, table_name))
        block[key] = summarise(
            table,
            d,
            truth,
            {
                "generator": "the Gravitas-stream sample writer's file, read",
                "sampleFile": sample_name,
                "sampleSha256": sha_file(path),
                "tableFile": table_name,
                "tableSha256": sha_file(os.path.join(scratch, table_name)),
            },
        )
    out["fed"] = block
    out["fedFunctionsVerbatimFromPartA"] = verbatim
    out["fedCpuSeconds"] = time.process_time() - t0
else:
    raise SystemExit("mode is own or fed")

json.dump(out, open(out_path, "w"), indent=1, allow_nan=False)
which = out["own"] if mode == "own" else out["fed"]
print(json.dumps({k: {q: v[q] for q in ("hits", "replicates", "coverage", "refused", "medianRiskAtFrom")} for k, v in which.items()}, indent=1))
print(json.dumps({"verbatim": verbatim, "cpuSeconds": time.process_time() - t0}))
