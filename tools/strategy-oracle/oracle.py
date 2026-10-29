#!/usr/bin/env python3
"""Independent oracle for Prompt 214 (tests/fixtures/strategy/thresholds.json).

No Gravitas code. Astropy's LombScargle (Zechmeister and Kuerster 2009; VanderPlas 2018) and a direct numpy sum build the pinned
results that tools/strategy-validate.mjs compares against. Usage: python3 oracle.py > ../../tests/fixtures/strategy/oracle-results.json
"""
import json, sys, types
import numpy as np

# PyYAML is not installed on this machine and astropy.table imports it at module load although
# LombScargle never uses it; an empty stand-in lets the import finish (nothing here reads YAML).
try:
    import yaml  # noqa: F401
except ModuleNotFoundError:
    sys.modules['yaml'] = types.ModuleType('yaml')
import astropy
from astropy.timeseries import LombScargle

SID = 0.9972695663
THR = json.load(open(__file__.replace('tools/strategy-oracle/oracle.py', 'tests/fixtures/strategy/thresholds.json')))
P = THR['patterns']


def lcg(count, span, state0):
    s = state0
    out = []
    for _ in range(count):
        out.append(span * s / 2**32)
        s = (1664525 * s + 1013904223) % 2**32
    return np.array(out)


def pattern(name):
    if name == 'nightlySidereal':
        return np.arange(40) * SID
    if name == 'nightlyThree':
        return np.sort(np.array([n * SID + o for n in range(30) for o in P['nightlyThree']['offsets']]))
    if name == 'seasonGapped':
        ns = list(range(0, 20)) + list(range(60, 80))
        return np.array([n * SID + 0.013 * (n % 5) for n in ns])
    if name == 'lcg':
        return np.sort(lcg(P['lcg']['count'], P['lcg']['span'], P['lcg']['state0']))
    raise KeyError(name)


g = P['grid']
n = int(round((g['fMax'] - g['fMin']) / g['step'])) + 1
grid = g['fMin'] + g['step'] * np.arange(n)
fine = np.arange(g['fMin'], g['fMax'] + 1e-9, 0.0005)


def window(t, f):
    t0 = t - t.mean()
    return np.abs(np.exp(-2j * np.pi * np.outer(f, t0)).sum(axis=1) / len(t)) ** 2


def sig3(a):
    return [float(f'{v:.10g}') for v in a]


out = {'format': 'gravitas.strategy-oracle/1', 'astropy': astropy.__version__, 'numpy': np.__version__, 'grid': {'fMin': g['fMin'], 'step': g['step'], 'n': int(n)}, 'patterns': {}}
for name, f0 in P['frequencies'].items():
    t = pattern(name)
    y = np.cos(2 * np.pi * f0 * t)
    ls = LombScargle(t, y, fit_mean=True, center_data=True)
    power = ls.power(grid, method='slow', normalization='standard')
    pf = ls.power(fine, method='slow', normalization='standard')
    idx = [i for i in range(1, len(pf) - 1) if pf[i] > pf[i - 1] and pf[i] >= pf[i + 1]]
    idx.sort(key=lambda i: -pf[i])
    peaks = [{'f': float(f'{fine[i]:.6f}'), 'power': float(f'{pf[i]:.10g}')} for i in idx[:6]]
    out['patterns'][name] = {
        'n': int(len(t)), 'f0': f0, 'span': float(f'{t.max() - t.min():.10g}'),
        'ls': sig3(power), 'window': sig3(window(t, grid)), 'peaks': peaks,
    }
json.dump(out, sys.stdout, separators=(',', ':'))
