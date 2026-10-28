"""Independent oracle for the interiors Part A validation (Prompt 203, INTERIORS.md).

Written from the equations, without reading the kernel:
    python3 -I tools/interiors-oracle/oracle.py inputs.json results.json
numpy and astropy (constants only). The first-order uncertainties are taken by
complex-step differentiation (exact to rounding for analytic functions); the
Monte Carlo is numpy's default_rng with seed 2031.
"""
import json
import sys

import numpy as np
from astropy import constants as const

G = float(const.G.value)
SG = float(const.G.uncertainty)


def density(gm, r, g=G):
    return 3 * gm * 1e9 / (4 * np.pi * g * (r * 1e3) ** 3)


def gravity(gm, r, g=G):
    return gm * 1e9 / (r * 1e3) ** 2


def escape(gm, r, g=G):
    return np.sqrt(2 * gm * 1e9 / (r * 1e3))


FUNCS = {"density": density, "gravity": gravity, "escape": escape}


def sigma_cs(fn, gm, r, sgm, sr, with_g):
    h = 1e-30
    d_gm = np.imag(fn(complex(gm, h), r)) / h
    d_r = np.imag(fn(gm, complex(r, h))) / h
    t = [d_gm * sgm, d_r * sr]
    if with_g:
        t.append(np.imag(fn(gm, r, complex(G, h))) / h * SG)
    return float(np.sqrt(sum(x * x for x in t)))


def main(inp_path, out_path):
    inp = json.load(open(inp_path))
    out = {"seed": inp["seed"], "G": G, "sigmaG": SG, "numpy": np.__version__}
    rows = []
    for p in inp["points"]:
        row = {}
        for k, fn in FUNCS.items():
            row[k] = float(fn(p["gm"], p["radius"]))
            row[k + "Sigma"] = sigma_cs(fn, p["gm"], p["radius"], p["sgm"], p["sr"], k == "density")
        rows.append(row)
    out["points"] = rows
    rng = np.random.default_rng(2031)
    n = 200000
    mc = {}
    for b in inp["bodies"]:
        gm = rng.normal(b["gm"][0], b["gm"][1], n)
        rm = rng.normal(b["mean"][0], b["mean"][1], n)
        re = rng.normal(b["equatorial"][0], b["equatorial"][1], n)
        g = rng.normal(G, SG, n)
        mc[b["id"]] = {
            "density": float(np.std(density(gm, rm, g), ddof=1)),
            "gravity": float(np.std(gravity(gm, re), ddof=1)),
            "escape": float(np.std(escape(gm, re), ddof=1)),
            "densityMean": float(np.mean(density(gm, rm, g))),
        }
    out["monteCarlo"] = mc
    json.dump(out, open(out_path, "w"))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
