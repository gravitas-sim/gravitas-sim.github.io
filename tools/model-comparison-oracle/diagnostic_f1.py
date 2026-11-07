"""Diagnostic for the failed leg F1 of Prompt 261 (not a committed leg, no bound).

Is the kernel's p = 0.011 on the 55-point eta Aquilae subsample an artefact of the
kernel, or what the stated null gives? This recomputes the same quantity with the
oracle's own numpy least squares and 20000 draws on the points the validator used
(passed in a JSON file written by the validator's --write-f1-points option; it
reads no other file). Run: python3 -E diagnostic_f1.py POINTS.json OUT.json
"""

import json
import math
import sys

import numpy as np

sys.path.insert(0, __file__.rsplit("/", 1)[0])
import oracle  # noqa: E402  (the oracle's statistic and calibration; same directory)


def main(points_path, out_path):
    d = json.load(open(points_path))
    t = np.array(d["t"])
    y = np.array(d["y"])
    T = float(t.max() - t.min())
    fmin, fmax = 1.0 / d["maxPeriod"], 1.0 / d["minPeriod"]
    df = 1.0 / (d["oversample"] * T)
    m = int(math.floor((fmax - fmin) / df)) + 1
    freqs = fmin + df * np.arange(m)
    obs, p, _ = oracle.calibrated_p(t, y, freqs, np.random.default_rng(2611), 20000)
    json.dump({"n": len(t), "nGrid": m, "observed": obs, "p": p, "B": 20000}, open(out_path, "w"), indent=1)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
