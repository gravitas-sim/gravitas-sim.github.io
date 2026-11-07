# Independent oracle for Prompt 265 (EXPERIMENT_ENSEMBLES.md). Run as
#   /usr/bin/python3 -E tools/experiment-ensemble-oracle/oracle.py > tests/fixtures/experiments-ensemble/oracle-results.json
# It imports no Gravitas code and reads no Gravitas file but the thresholds file
# it hashes. Everything it computes is written from the stated algorithms alone:
# FNV-1a of the key text over UTF-16 code units (an integer key, or a text of
# digits only, is itself), mulberry32, the trial key '<seed>:trial:<i>',
# Box-Muller with the spare kept, the case bootstrap's rule floor(u * n), and
# numpy / scipy for the statistics.
import hashlib
import json
import sys
from collections import Counter
from pathlib import Path

import numpy as np
from scipy import stats

M32 = 0xFFFFFFFF


def imul(a, b):
    return ((a & M32) * (b & M32)) & M32


def fnv1a(text):
    h = 0x811C9DC5
    data = text.encode('utf-16-le')
    for i in range(0, len(data), 2):
        h ^= data[i] | (data[i + 1] << 8)
        h = imul(h, 0x01000193)
    return h & M32


def normalize(key):
    if isinstance(key, int):
        return abs(key) & M32
    t = key.strip()
    if t == '':
        return 0
    if t.isascii() and t.isdigit():
        n = int(t)
        if n <= 2**53 - 1:
            return n & M32
    return fnv1a(t)


def mulberry32(seed):
    s = seed & M32

    def draw():
        nonlocal s
        s = (s + 0x6D2B79F5) & M32
        t = imul(s ^ (s >> 15), 1 | s)
        t = ((t + imul(t ^ (t >> 7), 61 | t)) & M32) ^ t
        return ((t ^ (t >> 14)) & M32) / 4294967296.0

    return draw


def stream(seed, *labels):
    key = seed if not labels else ':'.join(str(x) for x in [seed, *labels])
    return mulberry32(normalize(key))


def gaussian(draw):
    spare = [None]

    def g():
        if spare[0] is not None:
            s, spare[0] = spare[0], None
            return s
        while True:
            a = draw()
            if a > 1e-12:
                break
        r = np.sqrt(-2.0 * np.log(a))
        t = 2.0 * np.pi * draw()
        spare[0] = float(r * np.sin(t))
        return float(r * np.cos(t))

    return g


def trial_values(seed, i):
    """analytic-draw kind: u is the first draw, z the first normal of the same
    stream (drawn after u, from the next two uniforms)."""
    d = stream(seed, 'trial', i)
    u = d()
    z = gaussian(d)()
    return u, z


def main():
    root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('.')
    thresholds = (root / 'tests/fixtures/experiments-ensemble/thresholds.json').read_bytes()
    out = {
        'format': 'gravitas.experiment-ensemble-oracle/1',
        'thresholdsSha256': hashlib.sha256(thresholds).hexdigest(),
        'python': sys.version.split()[0],
        'numpy': np.__version__,
        'scipy': __import__('scipy').__version__,
        'noGravitasCode': True,
    }

    # A1: 64 uniforms for each of 20 trial indices, for five seeds.
    seeds = ['a', 'ensemble-7', 'ünï', '42', 42]
    forks = []
    for seed in seeds:
        rows = []
        for i in range(20):
            d = stream(seed, 'trial', i)
            rows.append([d() for _ in range(64)])
        forks.append({'seed': seed, 'draws': rows})
    out['forks'] = forks

    # B: five arrays of 40 trials of the analytic-draw kind.
    arrays = []
    for k in range(5):
        seed = f'p265-b-{k}'
        u = np.array([trial_values(seed, i)[0] for i in range(40)])
        z = np.array([trial_values(seed, i)[1] for i in range(40)])
        arrays.append({'seed': seed, 'u': u.tolist(), 'z': z.tolist()})
    out['arrays'] = arrays

    def describe(x):
        n = len(x)
        mean = float(np.mean(x))
        sd = float(np.std(x, ddof=1))
        tq = float(stats.t.ppf(0.975, n - 1))
        half = tq * sd / np.sqrt(n)
        qs = {str(q): float(np.quantile(x, q, method='linear')) for q in (0.05, 0.25, 0.5, 0.75, 0.95)}
        return {'n': n, 'mean': mean, 'sd': sd, 'lo': float(mean - half), 'hi': float(mean + half), 'quantiles': qs}

    out['summaries'] = [{'seed': a['seed'], 'u': describe(np.array(a['u'])), 'z': describe(np.array(a['z']))} for a in arrays]

    # B5: classes of the u array ('high' when u >= 0.5).
    out['classes'] = [
        {'seed': a['seed'], 'counts': dict(Counter('high' if v >= 0.5 else 'low' for v in a['u']))}
        for a in arrays
    ]

    # B4: the case bootstrap of the median of array 0's u values, 500 draws,
    # level 0.95, on the stream '<seed>:bootstrap:u'. Rule: draw d takes n
    # uniforms in turn, idx = floor(u * n); the statistic is the median of the
    # resampled values; the interval is the linear-interpolated quantiles of the
    # sorted draws at 0.025, 0.5 and 0.975.
    vals = np.array(arrays[0]['u'])
    n = len(vals)
    d = stream(arrays[0]['seed'], 'bootstrap', 'u')
    meds = []
    for _ in range(500):
        idx = [int(np.floor(d() * n)) for _ in range(n)]
        meds.append(float(np.median(vals[idx])))
    meds = np.sort(np.array(meds))
    out['bootstrap'] = {
        'seed': arrays[0]['seed'],
        'metric': 'u',
        'draws': 500,
        'level': 0.95,
        'estimate': float(np.median(vals)),
        'lo': float(np.quantile(meds, 0.025, method='linear')),
        'value': float(np.quantile(meds, 0.5, method='linear')),
        'hi': float(np.quantile(meds, 0.975, method='linear')),
    }

    # C3: the closed-form efficiency of a matched filter, Phi(S - threshold).
    out['analyticEfficiency'] = {
        str(s): float(stats.norm.cdf(s - 7.1)) for s in (6.0, 7.1, 8.0)
    }
    json.dump(out, sys.stdout, indent=1, ensure_ascii=False)
    sys.stdout.write('\n')


main()
