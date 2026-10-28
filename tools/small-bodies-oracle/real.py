#!/usr/bin/env python3
"""The independent fit on the real numbered H < 13 cut (Prompt 198, tier e1, oracle row).

No Gravitas code: numpy and scipy, through oracle.py's fit_baseline (scipy.optimize
trust-exact on the Poisson negative log-likelihood). Reads the pack as data, writes
tests/fixtures/small-bodies/oracle-real-results.json.
"""
import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import oracle  # noqa: E402

R = oracle.R
ROOT = oracle.HERE.parent.parent
pack = json.loads((ROOT / "js/data/smallbodies/numbered-h13.json").read_text())
a = np.array(pack["a"])
a = a[(a >= R["fitRangeAu"][0]) & (a < R["fitRangeAu"][1])]
gaps = [
    {"id": g["id"], "centerAu": oracle.axis(R["planets"]["jupiterAu"], g["inner"], g["outer"], "inner"), "halfWidthAu": g["halfWidthAu"]}
    for g in R["gaps"]
]
c, mid, half, ok = oracle.fit_baseline(a, gaps)
bw = R["binWidthAu"]
rows = []
for g in gaps:
    lo, hi = g["centerAu"] - g["halfWidthAu"], g["centerAu"] + g["halfWidthAu"]
    dens = lambda s: np.exp(np.polyval(c[::-1], (s - mid) / half)) / bw
    nexp = oracle.integrate.quad(dens, lo, hi, epsabs=1e-12, epsrel=1e-12)[0]
    nobs = int(np.sum((a >= lo) & (a < hi)))
    rows.append({"id": g["id"], "nObs": nobs, "nExp": float(nexp), "depletion": float(1 - nobs / nexp)})
out = {"note": "scipy fit of the same model on js/data/smallbodies/numbered-h13.json", "n": int(len(a)), "converged": ok, "gaps": rows}
(oracle.FIX / "oracle-real-results.json").write_text(json.dumps(out, indent=1) + "\n")
print(json.dumps(out)[:600])
