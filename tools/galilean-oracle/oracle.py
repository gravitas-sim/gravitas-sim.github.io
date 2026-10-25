"""Independent oracle for the Galilean-moon kernel (Prompt 193).

Run with the scratch venv's python in isolated mode (-I):
    python -I tools/galilean-oracle/oracle.py <cache dir> <inputs.json> <out.json>

Leg a2: x and y (Jupiter radii) of each moon from the RAW hourly Horizons rows
(cubic Hermite between the hourly position and velocity), with Jupiter's
direction from astropy's built-in ephemeris (get_body, light-time corrected),
the pole from the IAU constants, and the obliquity 84381.448 arcsec. Nothing is
shared with the kernel's code, its Chebyshev pack or its planetary pack.
Leg e1: scipy.optimize.curve_fit of a sinusoid with a constant to the marks.
"""
import json, sys, re
import numpy as np
from scipy.optimize import curve_fit
from astropy.time import Time
from astropy.coordinates import get_body, solar_system_ephemeris
import astropy

cache, inp, outp = sys.argv[1:4]
inputs = json.load(open(inp))
IDS = {'io': '501', 'europa': '502', 'ganymede': '503', 'callisto': '504'}
RJ = 71492.0
C = 299792.458


def rows(cmd):
    r = json.load(open(f'{cache}/{cmd}-daily.json'))['result']
    block = r[r.index('$$SOE') + 5:r.index('$$EOE')].strip().splitlines()
    return np.array([[float(v) for v in ln.split(',')[0:1] + ln.split(',')[2:8]] for ln in block])


tables = {k: rows(c) for k, c in IDS.items()}
eps = np.radians(84381.448 / 3600.0)
ce, se = np.cos(eps), np.sin(eps)


def hermite(tab, jd):
    t = tab[:, 0]
    i = int(np.clip(np.searchsorted(t, jd) - 1, 0, len(t) - 2))
    h = (t[i + 1] - t[i]) * 86400.0
    s = (jd - t[i]) / (t[i + 1] - t[i])
    p0, p1 = tab[i, 1:4], tab[i + 1, 1:4]
    m0, m1 = tab[i, 4:7] * h, tab[i + 1, 4:7] * h
    h00 = 2 * s**3 - 3 * s**2 + 1
    h10 = s**3 - 2 * s**2 + s
    h01 = -2 * s**3 + 3 * s**2
    h11 = s**3 - s**2
    return h00 * p0 + h10 * m0 + h01 * p1 + h11 * m1


def pole(jd):
    T = (jd - 2451545.0) / 36525.0
    a = np.radians(268.056595 - 0.006499 * T)
    d = np.radians(64.495303 + 0.002413 * T)
    return np.array([np.cos(d) * np.cos(a), np.cos(d) * np.sin(a), np.sin(d)])


geo = []
with solar_system_ephemeris.set('builtin'):
    for jd in inputs['geometryEpochsJdTt']:
        j = get_body('jupiter', Time(jd, format='jd', scale='tt'))
        u = j.cartesian.xyz.value
        dist_km = np.linalg.norm(u) * 149597870.7
        u = u / np.linalg.norm(u)
        p = pole(jd)
        xh = np.cross(p, u); xh /= np.linalg.norm(xh)
        yh = np.cross(u, xh)
        tau = dist_km / C
        row = {'jdTt': jd, 'moons': {}}
        for k, tab in tables.items():
            r = hermite(tab, jd - tau / 86400.0)
            r = np.array([r[0], r[1] * ce - r[2] * se, r[1] * se + r[2] * ce])
            row['moons'][k] = {'x': float(r @ xh / RJ), 'y': float(r @ yh / RJ)}
        geo.append(row)

fit = {}
t = np.array(inputs['fit']['t']); sig = inputs['fit']['sigmaRj']
t0 = t.mean()
for k, x in inputs['fit']['x'].items():
    x = np.array(x)
    best = None
    for P0 in np.linspace(0.97, 1.03, 7) * {'io': 1.769, 'europa': 3.551, 'ganymede': 7.155, 'callisto': 16.689}[k]:
        def f(tt, a, b, c, P):
            ph = 2 * np.pi * (tt - t0) / P
            return a * np.sin(ph) + b * np.cos(ph) + c
        try:
            popt, pcov = curve_fit(f, t, x, p0=[x.std() * 1.4, 0.0, 0.0, P0], sigma=np.full_like(x, sig), absolute_sigma=True, maxfev=20000, xtol=1e-14, ftol=1e-14)
        except Exception:
            continue
        chi2 = float((((x - f(t, *popt)) / sig) ** 2).sum())
        if best is None or chi2 < best[0]:
            best = (chi2, popt)
    a, b, c, P = best[1]
    fit[k] = {'periodDays': float(abs(P)), 'amplitude': float(np.hypot(a, b)), 'chi2': best[0]}

json.dump({'oracle': 'numpy, scipy, astropy; python -I', 'astropy': astropy.__version__, 'numpy': np.__version__,
           'geometry': {'rows': geo}, 'fit': fit}, open(outp, 'w'))
print(len(geo), 'geometry rows;', {k: round(v['periodDays'], 6) for k, v in fit.items()})
