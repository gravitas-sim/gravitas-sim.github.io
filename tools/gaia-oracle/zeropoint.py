#!/usr/bin/env python3
"""Second implementation of the Lindegren et al. (2021) parallax zero point, for leg B2.

    python3 tools/gaia-oracle/zeropoint.py <z5.txt> <z6.txt> <ngc2420.csv> <neighbourhood.csv> <out.json>

Written with numpy only, from the coefficient text files and the formula as
described in js/kernels/galactic/zeropoint.js's header, reading the tables from
the text files (not from the generated JavaScript). It is an independent
reimplementation, NOT the authors' gaiadr3_zeropoint package: that package was
not run (execution of downloaded code was not allowed), so there is no
package-output oracle. Written offline by the coordinator's data, never by a test.

For each row it gives the offset from the inputs as the Gaia archive wrote them
and from the inputs rounded to the packs' steps (G 0.001; nu_eff, pseudocolour and
ecl_lat 0.0001), so the kernel can be compared on exactly what a pack stores. Only
row positions and values are written: no source id leaves the data folder.
"""
import csv
import json
import sys

import numpy as np


def table(path):
    rows = [[float(c) for c in line.split(",")] for line in open(path).read().splitlines() if line.strip()]
    a = np.array(rows)
    return a[0, 1:].astype(int), a[1, 1:].astype(int), a[2:, 0], a[2:, 1:]


def zpt(tab, g, colour, eclat):
    j, k, gn, q = tab
    sb = np.sin(np.radians(eclat))
    c = [1.0,
         np.clip(colour - 1.48, -0.24, 0.24),
         np.clip(1.48 - colour, 0.0, 0.24) ** 3,
         np.minimum(0.0, colour - 1.24),
         np.maximum(0.0, colour - 1.72)]
    b = [1.0, sb, sb ** 2 - 1.0 / 3.0]
    ig = int(np.clip(np.searchsorted(gn, g, side="right") - 1, 0, len(gn) - 2))
    h = float(np.clip((g - gn[ig]) / (gn[ig + 1] - gn[ig]), 0.0, 1.0))
    return 0.001 * sum(((1 - h) * q[ig, i] + h * q[ig + 1, i]) * c[j[i]] * b[k[i]] for i in range(len(j)))


def rnd(x, step):
    return round(x / step) * step


def run(path, t5, t6):
    out = {"raw": [], "rounded": []}
    for r in csv.DictReader(open(path)):
        p = int(r["astrometric_params_solved"])
        g = float(r["phot_g_mean_mag"])
        el = float(r["ecl_lat"])
        col = float(r["nu_eff_used_in_astrometry"] if p == 31 else r["pseudocolour"])
        tab = t5 if p == 31 else t6
        out["raw"].append(round(zpt(tab, g, col, el), 9))
        out["rounded"].append(round(zpt(tab, rnd(g, 0.001), rnd(col, 0.0001), rnd(el, 0.0001)), 9))
    return out


def main():
    t5, t6 = table(sys.argv[1]), table(sys.argv[2])
    res = {
        "format": "gravitas.gaia-workflows-zeropoint-oracle/1",
        "what": "a second implementation (numpy) of the Lindegren et al. 2021 zero point from the coefficient files; NOT the authors' package, which was not run: there is no package-output oracle",
        "run": "Python %s, numpy %s" % (sys.version.split()[0], np.__version__),
        "units": "mas",
        "gaia-dr3-ngc2420": run(sys.argv[3], t5, t6),
        "gaia-dr3-solar-neighbourhood": run(sys.argv[4], t5, t6),
    }
    json.dump(res, open(sys.argv[5], "w"))
    open(sys.argv[5], "a").write("\n")


if __name__ == "__main__":
    main()
