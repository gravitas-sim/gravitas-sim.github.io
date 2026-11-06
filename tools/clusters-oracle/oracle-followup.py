#!/usr/bin/env python3
"""Independent oracle for the follow-up terms of the galaxy-cluster kernel (Prompt 250, 250b).

numpy, scipy and astropy only; no Gravitas code. Writes tests/fixtures/clusters/followup-oracle-results.json:
d ln D_L / dz by a central difference of astropy's luminosity distance, and the Poisson upper tail by
scipy.stats.poisson.sf. The redshifts and the (n, mu) pairs are round numbers chosen here.

Run: python3 tools/clusters-oracle/oracle-followup.py
"""
import json
import os
import sys

import numpy as np
from astropy.cosmology import FlatLambdaCDM
from scipy.stats import poisson

HERE = os.path.dirname(os.path.abspath(__file__))
FIX = os.path.join(HERE, '..', '..', 'tests', 'fixtures', 'clusters')
COSMO = FlatLambdaCDM(H0=70, Om0=0.3, Tcmb0=0)

zs = [0.01, 0.02, 0.03, 0.05, 0.08, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4]
h = 1e-5
dln = []
for z in zs:
    up = np.log(COSMO.luminosity_distance(z * (1 + h)).value)
    dn = np.log(COSMO.luminosity_distance(z * (1 - h)).value)
    dln.append(float((up - dn) / (2 * z * h)))

pairs = [(1, 0.5), (3, 1.0), (5, 2.0), (10, 4.0), (30, 20.0), (40, 18.5), (40, 6.0), (100, 100.0),
         (100, 90.0), (60, 10.0), (20, 20.0), (25, 12.0), (8, 8.0), (15, 3.0), (50, 45.0),
         (200, 80.0), (12, 11.0), (7, 1.0), (300, 135.0), (2, 2.0)]
tails = [{'n': n, 'mu': mu, 'tail': float(poisson.sf(n - 1, mu))} for n, mu in pairs]

json.dump({
    'format': 'gravitas.clusters-followup-oracle/1',
    'tools': {'python': sys.version.split()[0], 'numpy': np.__version__,
              'scipy': __import__('scipy').__version__, 'astropy': __import__('astropy').__version__},
    'dlnDL': [{'z': z, 'value': v} for z, v in zip(zs, dln)],
    'poisson': tails,
}, open(os.path.join(FIX, 'followup-oracle-results.json'), 'w'))
print('followup oracle ok')
