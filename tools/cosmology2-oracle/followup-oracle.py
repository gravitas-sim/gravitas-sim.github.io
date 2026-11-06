#!/usr/bin/env python3
"""The follow-up oracle for Prompt 255b: the age of a matter-only universe by scipy quad (no closed form for it,
no Gravitas code), for the Om list of leg A7b in tests/fixtures/cosmology2/followup-thresholds.json.

  python3 tools/cosmology2-oracle/followup-oracle.py [out.json]

The age is the integral of a da / sqrt(F(a)) with F = Om a + (1 - Om) a^2, a = s^2, at epsabs 0 and epsrel 1e-13
(numpy and scipy only; no yaml stub is needed).
"""
import json, math, os, sys
import numpy as np
import scipy
from scipy.integrate import quad

HERE = os.path.dirname(os.path.abspath(__file__))
FIX = os.path.join(HERE, '..', '..', 'tests', 'fixtures', 'cosmology2')
T = json.load(open(os.path.join(FIX, 'followup-thresholds.json')))
L = [c for c in T['checks'] if c['id'].startswith('A7b.')][0]['limits']
C = 299792.458
# Gyr per (1/H0) at H0 = 1 km/s/Mpc: megaparsec in km over the Julian year in seconds (IAU parsec)
GYR = 3.0856775814913673e19 / (365.25 * 86400) / 1e9

def age(Om, H0):
    Ok = 1 - Om
    f = lambda s: 2 * s**3 / math.sqrt(Om * s * s + Ok * s**4)
    pts = [0, 1e-4, 1e-3, 1e-2, 0.1, 0.3, 0.6, 1.0]
    v = sum(quad(f, a, b, epsabs=0, epsrel=1e-13, limit=500)[0] for a, b in zip(pts[:-1], pts[1:]))
    return GYR / H0 * v

out = {'format': 'gravitas.cosmology2-followup-oracle/1',
       'note': 'written by tools/cosmology2-oracle/followup-oracle.py (numpy, scipy; no Gravitas code) after followup-thresholds.json and before the follow-up kernel option or validator existed',
       'tools': {'python': sys.version.split()[0], 'numpy': np.__version__, 'scipy': scipy.__version__},
       'H0': L['H0'], 'gyrPerInvH0': GYR,
       'ages': [{'Om': Om, 'ageGyr': age(Om, L['H0'])} for Om in L['omegaM']]}
p = sys.argv[1] if len(sys.argv) > 1 else os.path.join(FIX, 'followup-oracle.json')
json.dump(out, open(p, 'w'), indent=1)
open(p, 'a').write('\n')
print('wrote', p)
