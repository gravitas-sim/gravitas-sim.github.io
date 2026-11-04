#!/usr/bin/env python3
"""Independent reference for the Oort fit's latitude factor (the cos b correction).

Run offline, never by a test:

    /usr/local/bin/python3.9 tools/oort-oracle/oracle.py > tests/fixtures/oort-cosb/oracle-results.json

(the interpreter needs numpy and astropy, and PyYAML for astropy.coordinates; the first python3 on the
machine that ran it lacked PyYAML, so the versions used are in the output)

It reads the shipped solar-neighbourhood sidecar (gaia/solar-neighbourhood.json: base64 little-endian
integers, value = offset + step * k, the minimum integer meaning missing) and fits, with code that shares
nothing with js/: astropy's ICRS to Galactic proper motions (SkyCoord) and numpy.linalg.lstsq on the
weighted design matrix

    4.74047 mu_l* = cos(b) (A cos 2l + B) + parallax (U sin l - V cos l)

in the in-plane form (no cos b, the form fitOortConstants had before Prompt 235) and with the factor, each
weighted by 1/parallax^2 ('distance') and unweighted ('none'); the covariance is the weight-normalised
residual scatter over n - 4 times the inverse normal matrix, as the kernel states. The IAU km/s per
(mas/yr kpc) constant is the only number shared with the kernel.
"""
import base64
import json
import pathlib
import sys

import numpy as np
import astropy
import astropy.units as u
from astropy.coordinates import SkyCoord

ROOT = pathlib.Path(__file__).resolve().parents[2]
K = 4.740470446
SIZE = {"int16": (2, "<i2", -32768), "int32": (4, "<i4", -2147483648)}
IDS = ["ra", "dec", "parallax", "parallax_err", "pmra", "pmra_err", "pmdec"]


def column(c):
    size, dtype, missing = SIZE[c["type"]]
    k = np.frombuffer(base64.b64decode(c["data"]), dtype=dtype)
    v = c["offset"] + c["step"] * k.astype(float)
    return np.where(k == missing, np.nan, v)


def fit(ra, dec, plx, pmra, pmdec, cosb, weighted):
    c = SkyCoord(
        ra=ra * u.deg,
        dec=dec * u.deg,
        pm_ra_cosdec=pmra * u.mas / u.yr,
        pm_dec=pmdec * u.mas / u.yr,
        frame="icrs",
    ).galactic
    l = c.l.rad
    b = c.b.rad
    y = K * c.pm_l_cosb.to_value(u.mas / u.yr)
    cb = np.cos(b) if cosb else np.ones_like(b)
    X = np.column_stack([cb * np.cos(2 * l), cb, plx * np.sin(l), -plx * np.cos(l)])
    w = 1.0 / plx**2 if weighted else np.ones_like(plx)
    sw = np.sqrt(w)
    beta, *_ = np.linalg.lstsq(X * sw[:, None], y * sw, rcond=None)
    res = y - X @ beta
    n = len(y)
    scale = np.sum(w * res**2) / (n - 4)
    cov = np.linalg.inv((X * w[:, None]).T @ X) * scale
    return {
        "n": int(n),
        "A": float(beta[0]),
        "B": float(beta[1]),
        "solarU": float(beta[2]),
        "solarV": float(beta[3]),
        "errA": float(np.sqrt(cov[0, 0])),
        "errB": float(np.sqrt(cov[1, 1])),
        "meanCosB": float(np.mean(np.cos(b))),
    }


def main():
    side = json.loads((ROOT / "gaia" / "solar-neighbourhood.json").read_text())
    cols = {i: column(c) for i, c in zip(IDS, side["columns"])}
    keep = np.isfinite(cols["parallax"]) & (cols["parallax"] > 0)
    a = [cols[i][keep] for i in ("ra", "dec", "parallax", "pmra", "pmdec")]
    out = {
        "format": "gravitas.oort-cosb-oracle/1",
        "tool": "tools/oort-oracle/oracle.py",
        "versions": {"python": sys.version.split()[0], "numpy": np.__version__, "astropy": astropy.__version__},
        "sample": "gaia/solar-neighbourhood.json, every star with a positive parallax",
        "distance": {"planar": fit(*a, False, True), "cosb": fit(*a, True, True)},
        "none": {"planar": fit(*a, False, False), "cosb": fit(*a, True, False)},
    }
    print(json.dumps(out, indent=1))


main()
