#!/usr/bin/env python3
"""
The reference-subtraction oracle (Prompt 230 Part B): an independent implementation of
methods M1 to M6 of tests/fixtures/imaging-subtraction/thresholds.json, run offline and
never by Gravitas.

    python3 tools/imaging-subtract-oracle/oracle.py inputs.json oracle-results.json

Independent of Gravitas: its own electrons, sky median, least-squares scale, residual,
robust local noise, and a scipy.optimize.least_squares fit of the Moffat profile (its own
pixel integration on a 3 by 3 grid, its own derivatives by finite differences inside
least_squares). The inputs are frame pairs the Gravitas scene builder drew (the forward
model is not re-implemented here: it is the thing being subtracted), the planet's
starting guess and the profile's FWHM and beta. numpy and scipy only.
"""
import json
import sys

import numpy as np
import scipy
from scipy.optimize import least_squares

FIT_FWHM = 2.0
SKY_FRACTION = 0.69
ANNULUS = 1.5
SUB = 5


def moffat_alpha(fwhm, beta):
    return fwhm / (2.0 * np.sqrt(2.0 ** (1.0 / beta) - 1.0))


def model(params, px, py, alpha, beta):
    x, y, flux = params
    off = (np.arange(SUB) + 0.5) / SUB - 0.5
    acc = np.zeros(len(px))
    for oj in off:
        for oi in off:
            dx = px + oi - x
            dy = py + oj - y
            acc += (beta - 1.0) / (np.pi * alpha ** 2) * (1.0 + (dx * dx + dy * dy) / alpha ** 2) ** (-beta)
    return flux * acc / SUB ** 2


def one(case):
    w, h = case['width'], case['height']
    gain, bias = case['gain'], case['bias']
    T = (np.array(case['target'], dtype=float).reshape(h, w) - bias) * gain
    R = (np.array(case['reference'], dtype=float).reshape(h, w) - bias) * gain
    cy, cx = h / 2.0, w / 2.0
    yy, xx = np.mgrid[0:h, 0:w]
    rr = np.hypot(xx - cx, yy - cy)
    ring = rr >= SKY_FRACTION * min(w, h) / 2.0
    T = T - np.median(T[ring])
    R = R - np.median(R[ring])
    disc = rr <= FIT_FWHM * case['fwhm']
    k = float(np.sum(T[disc] * R[disc]) / np.sum(R[disc] ** 2))
    D = T - k * R
    sx, sy = case['start']['x'], case['start']['y']
    r0 = np.hypot(sx - cx, sy - cy)
    excl = np.hypot(xx - sx, yy - sy) <= FIT_FWHM * case['fwhm']
    sel = (np.abs(rr - r0) <= ANNULUS) & (~excl)
    vals = D[sel]
    med = np.median(vals)
    noise = float(1.4826 * np.median(np.abs(vals - med)))
    win = np.hypot(xx - sx, yy - sy) <= FIT_FWHM * case['fwhm']
    px = xx[win].astype(float)
    py = yy[win].astype(float)
    data = D[win]
    alpha = moffat_alpha(case['fwhm'], case['beta'])
    p0 = [sx, sy, case['start']['flux']]
    sol = least_squares(lambda p: (data - model(p, px, py, alpha, case['beta'])) / noise,
                        p0, method='lm', xtol=1e-14, ftol=1e-14, gtol=1e-14, max_nfev=2000)
    J = sol.jac
    cov = np.linalg.inv(J.T @ J)
    return {
        'id': case['id'],
        'k': k,
        'noise': noise,
        'residual': [float(v) for v in D.ravel()],
        'fit': {'x': float(sol.x[0]), 'y': float(sol.x[1]), 'flux': float(sol.x[2])},
        'sigma': {'x': float(np.sqrt(cov[0, 0])), 'y': float(np.sqrt(cov[1, 1])), 'flux': float(np.sqrt(cov[2, 2]))},
    }


def main():
    inputs = json.load(open(sys.argv[1]))
    out = {
        'format': 'gravitas.imaging-subtract-oracle/1',
        'versions': {'python': sys.version.split()[0], 'numpy': np.__version__, 'scipy': scipy.__version__},
        'cases': [one(c) for c in inputs['cases']],
    }
    json.dump(out, open(sys.argv[2], 'w'), separators=(',', ':'))


if __name__ == '__main__':
    main()
