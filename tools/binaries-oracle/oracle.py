#!/usr/bin/env python3
"""Independent oracle for Prompt 217 (tests/fixtures/binaries/thresholds.json).

No Gravitas code. batman 2.5.1 (Kreidberg 2015, PASP 127, 1161) computes each star's eclipse as a transit of that star by the
other (the second in the swapped frame: radius 1/k, a / R2, w + 180, t0 the secondary conjunction); a brute-force polar quadrature
of the two discs is a second implementation. Usage: python3 oracle.py > ../../tests/fixtures/binaries/oracle-results.json
"""
import json, math, sys
import numpy as np
import batman

THR = json.load(open(__file__.replace('tools/binaries-oracle/oracle.py', 'tests/fixtures/binaries/thresholds.json')))
NPH = 2000


def lum_ratio(s):
    a, b = s['ldA'], s['ldB']
    return s['J'] * s['k'] ** 2 * (1 - b[0] / 3 - b[1] / 6) / (1 - a[0] / 3 - a[1] / 6)


def params(s):
    e = math.hypot(s['ecosw'], s['esinw'])
    w = math.degrees(math.atan2(s['esinw'], s['ecosw'])) if e > 0 else 90.0
    r1 = s['rsum'] / (1 + s['k'])
    r2 = s['k'] * r1
    return e, w, r1, r2


def star_curves(s, t):
    e, w, r1, r2 = params(s)
    p = batman.TransitParams()
    p.t0 = s['tc']; p.per = s['P']; p.rp = s['k']; p.a = 1.0 / r1; p.inc = s['inc']; p.ecc = e; p.w = w
    p.u = list(s['ldA']); p.limb_dark = 'quadratic'
    m = batman.TransitModel(p, t)
    f1 = m.light_curve(p)
    ts = float(m.get_t_secondary(p))
    q = batman.TransitParams()
    q.t0 = ts; q.per = s['P']; q.rp = 1.0 / s['k']; q.a = 1.0 / r2; q.inc = s['inc']; q.ecc = e; q.w = (w + 180.0) % 360.0
    q.u = list(s['ldB']); q.limb_dark = 'quadratic'
    m2 = batman.TransitModel(q, t)
    f2 = m2.light_curve(q)
    return f1, f2, ts


def total(s, t):
    f1, f2, ts = star_curves(s, t)
    L = lum_ratio(s)
    return (f1 + L * f2) / (1 + L), ts


def brute_fraction(z, p, u1, u2, N=1200):
    r = (np.arange(N) + 0.5) / N
    th = (np.arange(2 * N) + 0.5) / (2 * N) * 2 * np.pi
    R, T = np.meshgrid(r, th, indexing='ij')
    mu = np.sqrt(1 - R ** 2)
    I = 1 - u1 * (1 - mu) - u2 * (1 - mu) ** 2
    inside = ((R * np.cos(T) - z) ** 2 + (R * np.sin(T)) ** 2) < p * p
    w = I * R
    return float((w * inside).sum() / w.sum())


def kepler(M, e):
    E = M if e < 0.8 else math.pi
    for _ in range(60):
        E -= (E - e * math.sin(E) - M) / (1 - e * math.cos(E))
    return E


def separation(s, t, which):
    """sky separation / a and which star is in front, from the orbit directly (no batman)."""
    e, w, r1, r2 = params(s)
    wr = math.radians(w)
    f_c = math.pi / 2 - wr
    E_c = 2 * math.atan2(math.sqrt(1 - e) * math.sin(f_c / 2), math.sqrt(1 + e) * math.cos(f_c / 2))
    M_c = E_c - e * math.sin(E_c)
    M = M_c + 2 * math.pi * (t - s['tc']) / s['P']
    E = kepler(M % (2 * math.pi), e)
    f = 2 * math.atan2(math.sqrt(1 + e) * math.sin(E / 2), math.sqrt(1 - e) * math.cos(E / 2))
    r = (1 - e * e) / (1 + e * math.cos(f))
    sini = math.sin(math.radians(s['inc']))
    cosi = math.cos(math.radians(s['inc']))
    z = r * math.sin(f + wr) * sini
    d = r * math.sqrt(1 - (math.sin(f + wr) * sini) ** 2)
    return d, z


def brute_total(s, t):
    L = lum_ratio(s)
    out = np.ones(len(t))
    k = s['k']
    _, _, r1, r2 = params(s)
    for i, ti in enumerate(t):
        d, z = separation(s, ti, None)
        if d >= r1 + r2:
            continue
        if z > 0:   # star 2 in front of star 1
            fr = brute_fraction(d / r1, k, *s['ldA'])
            out[i] = (1 - fr + L) / (1 + L)
        else:       # star 1 in front of star 2
            fr = brute_fraction(d / r2, 1.0 / k, *s['ldB'])
            out[i] = (1 + L * (1 - fr)) / (1 + L)
    return out


res = {'format': 'gravitas.binaries-oracle/1', 'systems': {}}
for name, s in THR['systems'].items():
    phase = np.arange(NPH) / NPH
    t = s['tc'] + s['P'] * phase
    f, ts = total(s, t)
    entry = {'tSecondary': ts, 'phase': NPH, 'batman': [round(float(v), 10) for v in f],
             'minPrimary': float(f[np.argmin(np.where(np.abs(((phase + 0.5) % 1) - 0.5) < 0.1, f, 9))]) }
    sec = np.abs(((phase - ((ts - s['tc']) / s['P']) % 1 + 0.5) % 1) - 0.5) < 0.1
    entry['minSecondary'] = float(np.min(np.where(sec, f, 9)))
    entry['minAll'] = float(f.min())
    if name in ('S1', 'S3'):
        b = brute_total(s, t)
        entry['brute'] = [round(float(v), 10) for v in b]
        entry['bruteVsBatmanMaxAbs'] = float(np.max(np.abs(b - f)))
    res['systems'][name] = entry
print(json.dumps(res))
