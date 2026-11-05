# The independent oracle of Prompt 242 (PULSARS.md, "Validation contract"). It reads
# tests/fixtures/pulsars/oracle-inputs.json (parameters and seeds, no kernel output), rebuilds
# every series with its own forward model, and writes oracle-results.json. It imports no Gravitas
# code. The stated rules (tests/fixtures/pulsars/thresholds.json, PULSAR-RULE-1 and the four
# amendments) are re-implemented here in numpy and scipy; the dispersion constant comes from
# astropy.constants by a different algebra (e^2 / (8 pi^2 eps0 m_e c)), and the Lomb-Scargle power
# from astropy.timeseries. The one thing shared with the kernel by specification is the named
# random stream (mulberry32 with an FNV-1a seed hash and Box-Muller normals), ported here, so the
# oracle can regenerate the noise of a seeded series instead of being handed it.
#
# Run offline, from the repository root:
#   /usr/local/bin/python3.9 tools/pulsar-oracle/oracle.py
import json
import math
import sys

import numpy as np
from scipy import optimize

import astropy
import astropy.constants as const
import astropy.units as u
import scipy
from astropy.timeseries import LombScargle

M32 = 0xFFFFFFFF


def imul(a, b):
    return (a * b) & M32


def fnv1a(text):
    h = 0x811C9DC5
    for ch in text:
        h ^= ord(ch)
        h = imul(h, 0x01000193)
    return h & M32


def normalize_seed(value):
    text = str(value).strip()
    if text.isdigit() and int(text) < 2**53:
        return int(text) & M32
    return fnv1a(text)


def mulberry32(seed):
    state = {'s': seed & M32}

    def draw():
        s = (state['s'] + 0x6D2B79F5) & M32
        state['s'] = s
        t = imul(s ^ (s >> 15), 1 | s)
        t = (((t + imul(t ^ (t >> 7), 61 | t)) & M32) ^ t) & M32
        return ((t ^ (t >> 14)) & M32) / 4294967296

    return draw


def gaussian(draw):
    box = {'spare': None}

    def g():
        if box['spare'] is not None:
            s = box['spare']
            box['spare'] = None
            return s
        a = draw()
        while a <= 1e-12:
            a = draw()
        r = math.sqrt(-2 * math.log(a))
        t = 2 * math.pi * draw()
        box['spare'] = r * math.sin(t)
        return r * math.cos(t)

    return g


# ---- constants (B1): e^2 / (8 pi^2 eps0 m_e c), a different algebra from alpha h / (4 pi^2 m_e)
PC_M = (u.pc).to(u.m)


def dispersion_constant():
    k_si = const.e.value**2 / (8 * math.pi**2 * const.eps0.value * const.m_e.value * const.c.value)
    return k_si * PC_M * 1e6 / 1e12


K = dispersion_constant()


# ---- the forward model, from the stated rules
def wrap(x):
    return x - np.floor(x + 0.5)


def profile_at(phase, comps):
    v = np.zeros_like(phase)
    for c in comps:
        d = wrap(phase - c['center'])
        z = d / c['sigma']
        mask = np.abs(z) < 9
        v += np.where(mask, c['amp'] * np.exp(-0.5 * z * z), 0.0)
    return v


def generate(w):
    nchan = w.get('channels', 16)
    lo, hi = w.get('bandMHz', [1200, 1500])
    dt = w.get('dt', 0.002)
    n = w.get('samples', 6000)
    m = w.get('subchannels', 1)
    amp = w.get('amplitude', 1.0)
    sig_t = w.get('sigmaTurns', 0.03)
    noise = w.get('noiseSigma', 1.0)
    df = (hi - lo) / nchan
    freqs = lo + (np.arange(nchan) + 0.5) * df
    draw = gaussian(mulberry32(normalize_seed(f"{w['seed']}:pulsar")))
    t = np.arange(n) * dt
    data = np.zeros((nchan, n))
    for c in range(nchan):
        comps = [{'amp': amp, 'center': 0.0, 'sigma': sig_t}]
        acc = np.zeros(n)
        for s in range(m):
            fs = freqs[c] - df / 2 + (s + 0.5) * df / m
            delay = K * w['dm'] / (fs * fs)
            acc += profile_at((t - delay) / w['period'] - w.get('phase0', 0.0), comps)
        acc /= m
        if noise > 0:
            acc = acc + noise * np.array([draw() for _ in range(n)])
        data[c] = acc
    return {'freqs': freqs, 'dt': dt, 'n': n, 'nchan': nchan, 'data': data}


def mad_sigma(y):
    d = np.diff(y)
    med = np.median(d)
    return 1.4826 * np.median(np.abs(d - med)) / math.sqrt(2)


def jsround(x):
    return np.floor(x + 0.5)


def delays(freqs, dm):
    top = freqs[-1]
    return K * dm * (1 / freqs**2 - 1 / top**2)


def dedisperse(s, dm, method):
    sh = delays(s['freqs'], dm) / s['dt']
    n = s['n']
    if method == 'nearest':
        r = jsround(sh).astype(int)
        length = n - int(r.max())
        out = np.zeros(length)
        for c in range(s['nchan']):
            out += s['data'][c, r[c]:r[c] + length]
        return out / s['nchan']
    fl = np.floor(sh).astype(int)
    length = n - 1 - int(fl.max())
    x = np.arange(n, dtype=float)
    out = np.zeros(length)
    j = np.arange(length, dtype=float)
    for c in range(s['nchan']):
        out += np.interp(j + sh[c], x, s['data'][c])
    return out / s['nchan']


def fold(y, dt, period, nbin, start=0, end=None, origin=0):
    end = len(y) if end is None else end
    j = np.arange(start, end)
    x = (j - origin) * dt * (1.0 / period)
    x = x - np.floor(x)
    b = np.minimum(nbin - 1, np.floor(x * nbin).astype(int))
    cnt = np.bincount(b, minlength=nbin)
    sm = np.bincount(b, weights=y[start:end], minlength=nbin)
    prof = np.where(cnt > 0, sm / np.maximum(cnt, 1), 0.0)
    return prof, cnt, float(sm.sum())


def fold_stat(y, dt, period, nbin, sigma):
    prof, cnt, _ = fold(y, dt, period, nbin)
    mean = (cnt * prof).sum() / cnt.sum()
    return float((cnt * (prof - mean) ** 2).sum() / (sigma * sigma))


# ---- S4 (AM1): harmonic-summed Fourier power
def next_pow2(n):
    m = 1
    while m < n:
        m *= 2
    return m


def coarse_dm(s, dm_range, period_range, sigmas, harmonics=4):
    lo, hi = dm_range
    pmin, pmax = period_range
    pguess = math.sqrt(pmin * pmax)
    f = s['freqs']
    n, nchan, dt = s['n'], s['nchan'], s['dt']
    span = K * (1 / f[0] ** 2 - 1 / f[-1] ** 2)
    step = pguess / 128 / span
    ntr = int(math.floor((hi - lo) / step)) + 1
    inv = K * (1 / f**2 - 1 / f[-1] ** 2)
    max_shift = int(jsround(inv[0] * hi / dt))
    L = n - max_shift
    sig_sum = math.sqrt(sum(x * x for x in sigmas)) / nchan
    size = next_pow2(2 * L)
    klo = max(1, int(math.floor(size * dt / pmax)))
    khi = int(math.ceil(size * dt / pmin))
    grid = lo + np.arange(ntr) * step
    S = np.zeros(ntr)
    for i, dm in enumerate(grid):
        r = jsround(inv * dm / dt).astype(int)
        acc = np.zeros(L)
        for c in range(nchan):
            acc += s['data'][c, r[c]:r[c] + L]
        acc /= nchan
        acc = acc - acc.mean()
        X = np.fft.fft(acc, size)
        power = (X.real**2 + X.imag**2)[: size // 2 + 1] / (L * sig_sum**2)
        top = len(power) - 1
        best = -np.inf
        for k in range(max(1, klo), min(khi, size // 2 - 1) + 1):
            tot = 0.0
            for h in range(1, harmonics + 1):
                c = h * k
                if c > top:
                    break
                w = int(math.ceil(h / 2))
                tot += power[max(0, c - w): min(top, c + w) + 1].max()
            best = max(best, tot)
        S[i] = best
    b = int(np.argmax(S))
    dm_best = grid[b]
    if 0 < b < ntr - 1:
        a, bb, c = S[b - 1], S[b], S[b + 1]
        den = a - 2 * bb + c
        if den < 0:
            dm_best += max(-0.5, min(0.5, 0.5 * (a - c) / den)) * step
    return {'dm': float(dm_best), 'step': step, 'trials': ntr, 'peakIndex': b,
            'statistic': S.tolist()}


def search_period(y, dt, pmin, pmax, nbin, sigma, os_=2):
    T = len(y) * dt
    fmin, fmax = 1 / pmax, 1 / pmin
    df = 1 / (T * nbin * os_)
    n = int(math.floor((fmax - fmin) / df)) + 1
    stat = np.array([fold_stat(y, dt, 1 / (fmin + k * df), nbin, sigma) for k in range(n)])
    b = int(np.argmax(stat))
    return {'period': float(1 / (fmin + b * df)), 'chi2': float(stat[b]), 'gridSize': n}


# ---- S6 to S8: harmonics, template matching, the DM line
def harm(profile):
    return np.fft.rfft(profile)[: len(profile) // 2]


def var_bin(sigma, counts):
    return sigma**2 * np.mean(1.0 / np.maximum(1, counts))


def rotate(h, phi):
    k = np.arange(len(h))
    return h * np.exp(2j * np.pi * k * (phi - np.round(phi)))


def combine(items, skip=-1):
    W = 0.0
    acc = 0
    for i, (h, v) in enumerate(items):
        if i == skip:
            continue
        w = 1.0 / v
        W += w
        acc = acc + w * h
    return acc / W, 1.0 / W


def match(prof, vp_bin, tmpl, vt_bin, snr_min=5.0, mult=9.0):
    nbin = 2 * len(prof)
    vp = nbin / 2 * vp_bin
    vT = nbin / 2 * vt_bin
    ks = [k for k in range(1, len(tmpl)) if abs(tmpl[k]) ** 2 > mult * vT]
    if not ks:
        return None
    ks = np.array(ks)
    cross = prof[ks] * np.conj(tmpl[ks])
    A, B = cross.real, cross.imag
    t2 = np.abs(tmpl[ks]) ** 2

    def C(phi):
        th = 2 * np.pi * ks * phi
        return float(np.sum(A * np.cos(th) - B * np.sin(th)))

    n = 16 * nbin
    grid = -0.5 + np.arange(n) / n
    vals = np.array([C(p) for p in grid])
    b = int(np.argmax(vals))
    res = optimize.minimize_scalar(lambda p: -C(p), bounds=(grid[b] - 1 / n, grid[b] + 1 / n),
                                   method='bounded', options={'xatol': 1e-14})
    phi = float(res.x)
    phi -= round(phi)
    a = C(phi) / t2.sum()
    if not a > 0:
        return {'usable': False}
    snr = math.sqrt(a * a * t2.sum() / vp)
    sigma = math.sqrt((vp + a * a * vT) / (a * a * (2 * math.pi) ** 2 * np.sum(ks**2 * t2)))
    return {'usable': snr >= snr_min, 'phase': phi, 'sigma': sigma, 'snr': snr}


def refine_dm(s, period, dm0, sigmas, nbin=64, snr_min=5.0, max_passes=5):
    f, dt, n, nchan = s['freqs'], s['dt'], s['n'], s['nchan']
    hs = []
    for c in range(nchan):
        prof, cnt, _ = fold(s['data'][c], dt, period, nbin)
        hs.append((harm(prof), var_bin(sigmas[c], cnt)))
    top = f[-1]
    x = K / f**2
    dm = dm0
    last = None
    for p in range(max_passes):
        phase = K * dm * (1 / f**2 - 1 / top**2) / period
        al = [(rotate(h, phase[c]), v) for c, (h, v) in enumerate(hs)]
        rows = []
        for c in range(nchan):
            tm, vt = combine(al, c)
            rows.append(match(al[c][0], al[c][1], tm, vt, snr_min))
        used = [c for c, r in enumerate(rows) if r and r['usable']]
        if len(used) < 4:
            return {'refused': 'too-few-channels', 'used': len(used)}
        w = np.array([1 / (rows[c]['sigma'] * period) ** 2 for c in used])
        X = np.array([[1.0, x[c]] for c in used])
        y = np.array([rows[c]['phase'] * period for c in used])
        sw = np.sqrt(w)
        coef, *_ = np.linalg.lstsq(X * sw[:, None], y * sw, rcond=None)
        cov = np.linalg.inv((X * w[:, None]).T @ X)
        res = y - X @ coef
        chi2 = float(np.sum(w * res**2))
        dof = len(used) - 2
        scale = max(1.0, chi2 / dof) if dof >= 1 else 1.0
        sigma0 = math.sqrt(cov[1, 1])
        last = {'rows': rows, 'used': used, 'chi2': chi2, 'dof': dof, 'scale': scale,
                'sigma': sigma0 * math.sqrt(scale), 'slope': float(coef[1])}
        dm += float(coef[1])
        if abs(coef[1]) < 1e-3 * sigma0:
            break
    return {'dm': float(dm), 'sigma': last['sigma'], 'used': len(last['used']),
            'chi2': last['chi2'], 'dof': last['dof'],
            'phases': [(r['phase'] if r else None) for r in last['rows']],
            'passes': p + 1}


def refine_period(s, period, dm, sigmas, nbin=64, M=8, snr_min=5.0, passes=2):
    f, dt, n, nchan = s['freqs'], s['dt'], s['n'], s['nchan']
    top = f[-1]
    edges = [int(math.floor(m * n / M)) for m in range(M + 1)]
    P = period
    out = None
    for _ in range(passes):
        subs = []
        for m in range(M):
            per = []
            for c in range(nchan):
                prof, cnt, _ = fold(s['data'][c], dt, P, nbin, start=edges[m], end=edges[m + 1])
                ph = K * dm * (1 / f[c] ** 2 - 1 / top**2) / P
                per.append((rotate(harm(prof), ph), var_bin(sigmas[c], cnt)))
            subs.append(combine(per))
        rows = []
        for m in range(M):
            tm, vt = combine(subs, m)
            r = match(subs[m][0], subs[m][1], tm, vt, snr_min)
            rows.append((r, ((edges[m] + edges[m + 1] - 1) / 2) * dt))
        used = [(r, t) for r, t in rows if r and r['usable']]
        if len(used) < 4:
            return {'refused': 'too-few-subintegrations'}
        w = np.array([1 / r['sigma'] ** 2 for r, _ in used])
        X = np.array([[1.0, t] for _, t in used])
        y = np.array([r['phase'] for r, _ in used])
        sw = np.sqrt(w)
        coef, *_ = np.linalg.lstsq(X * sw[:, None], y * sw, rcond=None)
        cov = np.linalg.inv((X * w[:, None]).T @ X)
        res = y - X @ coef
        chi2 = float(np.sum(w * res**2))
        dof = len(used) - 2
        scale = max(1.0, chi2 / dof) if dof >= 1 else 1.0
        loo = (M - 1) / M
        sl = coef[1] * loo
        sig_s = math.sqrt(cov[1, 1]) * math.sqrt(scale) * loo
        Pn = P / (1 - sl * P)
        out = {'period': float(Pn), 'sigma': float(sig_s * Pn * Pn), 'used': len(used)}
        P = Pn
    return out


def analyze_fixed(w, dm_range, period_range, nbin=64):
    """The whole of PULSAR-RULE-1 for B4 and B5, from the same fixed ranges the validator uses."""
    s = generate(w)
    sigmas = [mad_sigma(s['data'][c]) for c in range(s['nchan'])]
    pmin, pmax = period_range
    coarse = coarse_dm(s, dm_range, period_range, sigmas)
    dd = dedisperse(s, coarse['dm'], 'nearest')
    sig_sum = mad_sigma(dd)
    search = search_period(dd, s['dt'], pmin, pmax, nbin, sig_sum)
    d1 = refine_dm(s, search['period'], coarse['dm'], sigmas, nbin)
    if 'refused' in d1:
        return {'refused': d1['refused'], 'stage': 'dm1'}
    p1 = refine_period(s, search['period'], d1['dm'], sigmas, nbin)
    if 'refused' in p1:
        return {'refused': p1['refused'], 'stage': 'period'}
    d2 = refine_dm(s, p1['period'], d1['dm'], sigmas, nbin)
    if 'refused' in d2:
        return {'refused': d2['refused'], 'stage': 'dm2'}
    return {'coarseDm': coarse['dm'], 'searchPeriod': search['period'], 'period': p1['period'],
            'periodSigma': p1['sigma'], 'dm': d2['dm'], 'dmSigma': d2['sigma'], 'used': d2['used'],
            'phases': d2['phases'], 'chi2': d2['chi2'], 'dof': d2['dof']}


def main():
    inp = json.load(open('tests/fixtures/pulsars/oracle-inputs.json'))
    out = {
        'format': 'gravitas.pulsar-oracle-results/1',
        'versions': {'numpy': np.__version__, 'scipy': scipy.__version__, 'astropy': astropy.__version__,
                     'python': sys.version.split()[0]},
        'note': 'written by tools/pulsar-oracle/oracle.py from tests/fixtures/pulsars/oracle-inputs.json; no Gravitas code is read',
    }
    # B1
    b1 = inp['b1']
    out['b1'] = {
        'constant': K,
        'delays': [[(K * dm / (f * f)) for f in b1['frequenciesMHz']] for dm in b1['dms']],
    }
    # B2 and B3 on one fixed series
    b3 = inp['b3']
    s = generate(b3['world'])
    sig = [mad_sigma(s['data'][c]) for c in range(s['nchan'])]
    dd_n = dedisperse(s, b3['dm'], 'nearest')
    dd_l = dedisperse(s, b3['dm'], 'linear')
    nb = b3['nbin']
    prof_n, cnt_n, tot_n = fold(dd_n, s['dt'], b3['period'], nb)
    prof_l, cnt_l, tot_l = fold(dd_l, s['dt'], b3['period'], nb)
    sig_n = mad_sigma(dd_n)
    out['b3'] = {
        'generator': {
            'channelSums': s['data'].sum(axis=1).tolist(),
            'channelSumSquares': (s['data'] ** 2).sum(axis=1).tolist(),
            'first': s['data'][:, :40].tolist(),
        },
        'noiseSigmas': sig,
        'nearest': {'length': len(dd_n), 'profile': prof_n.tolist(), 'counts': cnt_n.tolist(),
                    'statistic': fold_stat(dd_n, s['dt'], b3['period'], nb, sig_n), 'sigma': sig_n},
        'linear': {'length': len(dd_l), 'profile': prof_l.tolist(),
                   'statistic': fold_stat(dd_l, s['dt'], b3['period'], nb, mad_sigma(dd_l))},
    }
    # B2: Lomb-Scargle on the nearest sum rebinned by blocks
    block = inp['b2']['block']
    nn = len(dd_n) // block
    y = dd_n[: nn * block].reshape(nn, block).mean(axis=1)
    t = (np.arange(nn) * block + (block - 1) / 2) * s['dt']
    periods = np.array(inp['b2']['periods'])
    ls = LombScargle(t, y, fit_mean=True, center_data=True)
    out['b2'] = {'power': ls.power(1.0 / periods, normalization='standard', method='slow').tolist()}
    # B4 and B5
    ranges = inp['b45']['ranges']
    res = []
    for w in inp['b45']['worlds']:
        res.append(analyze_fixed(w, ranges['dm'], ranges['period']))
    out['b45'] = res
    json.dump(out, open('tests/fixtures/pulsars/oracle-results.json', 'w'), separators=(',', ':'))
    print('wrote oracle-results.json', len(res), 'series')


if __name__ == '__main__':
    main()
