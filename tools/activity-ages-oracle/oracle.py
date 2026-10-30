#!/usr/bin/env python3
"""Independent numpy oracle for the activity ages gate (Prompt 220 Part B). No Gravitas code.
Usage: python3 oracle.py band-T.json > tests/fixtures/activity-ages-gate/oracle-results.json
band-T.json is {"lambdaNm": [...], "s": [...]}: the TESS response table of the radiation pack."""
import json, sys
import numpy as np

H, C, K, SIG = 6.62607015e-34, 299792458.0, 1.380649e-23, 5.670374419e-8
REL = {'mamajek2008': (0.407, 0.325, 0.495, 0.566), 'barnes2007': (0.7725, 0.601, 0.4, 0.5189)}


def age_myr(P, bv, rel):
    a, b, c, n = REL[rel]
    return 10 ** ((np.log10(P) - np.log10(a) - b * np.log10(bv - c)) / n)


def period(t, bv, rel):
    a, b, c, n = REL[rel]
    return a * (bv - c) ** b * t ** n


def planck(lam_m, T):
    return 2 * H * C * C / lam_m ** 5 / np.expm1(H * C / (lam_m * K * T))


def band_integral(lam_nm, s, T):
    lam = lam_nm * 1e-9
    r = s * lam_nm  # energy-weighted response (photon-counting S times wavelength)
    r = r / r.max()
    return float(np.trapz(planck(lam, T) * r, lam))


def main():
    band = json.load(open(sys.argv[1]))
    lam, s = np.array(band['lambdaNm'], float), np.array(band['s'], float)
    out = {'points': [], 'bandIntegrals': {}}
    pts = [(bv, t) for bv in (0.5, 0.65, 0.8, 0.9) for t in (100, 250, 400, 600, 625)]
    for rel in REL:
        for bv, t in pts[:20]:
            P = period(t, bv, rel)
            out['points'].append({'rel': rel, 'bv': bv, 't': t, 'P': float(P), 'age': float(age_myr(P, bv, rel))})
    for T in range(7000, 12001, 1000):
        out['bandIntegrals'][str(T)] = band_integral(lam, s, float(T))
    json.dump(out, sys.stdout, indent=1)


main()
