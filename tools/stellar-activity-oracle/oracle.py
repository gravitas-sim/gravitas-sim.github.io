#!/usr/bin/env python3
"""
Independent oracle for the stellar rotation and flare kernel (Prompt 220).

No Gravitas code and no analytic spot integral: the spot flux is a brute-force
sky-plane pixel sum, the periodogram is Astropy's LombScargle, the flare finder is a
numpy implementation of the rule text in tests/fixtures/stellar-activity/thresholds.json
(contract.flareRule and contract.flareRuleDetail).

    python3 tools/stellar-activity-oracle/oracle.py FITS_DIR  > writes
      tests/fixtures/stellar-activity/oracle-results.json
      tests/fixtures/stellar-activity/flare-curve.json
      tests/fixtures/stellar-activity/oracle-provenance.json

FITS_DIR holds the two SPOC files named in D-R10-220-01 (used only when present).
"""
import hashlib, json, os, sys, types
import numpy as np

# PyYAML is not installed on this machine and astropy.table imports it at load (as for the
# Prompt 214 oracle); nothing here reads YAML, so an empty module stands in. Nothing was installed.
try:
    import yaml  # noqa: F401
except ModuleNotFoundError:
    sys.modules['yaml'] = types.ModuleType('yaml')
from astropy.timeseries import LombScargle
from astropy.io import fits
import astropy, scipy

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
FIX = os.path.join(ROOT, 'tests', 'fixtures', 'stellar-activity')
THR = json.load(open(os.path.join(FIX, 'thresholds.json')))


# ---- the spot flux by brute force -------------------------------------------------

def deficit_pixels(gamma_deg, rho_deg, u1, u2, n=4000):
    """Normalised flux deficit (before the contrast factor) of one circular spot."""
    g, rho = np.radians(gamma_deg), np.radians(rho_deg)
    xs = (np.arange(n) + 0.5) / n * 2 - 1
    total = 0.0
    cr = np.cos(rho)
    for j in range(0, n, 250):
        y = xs[j:j + 250][:, None]
        x = xs[None, :]
        r2 = x * x + y * y
        on = r2 < 1.0
        mu = np.sqrt(np.clip(1.0 - r2, 0.0, 1.0))
        inside = on & ((x * np.sin(g) + mu * np.cos(g)) >= cr)
        I = 1 - u1 * (1 - mu) - u2 * (1 - mu) ** 2
        total += float(np.sum(I[inside]))
    dA = (2.0 / n) ** 2
    full = np.pi * (1 - u1 / 3 - u2 / 6)
    return total * dA / full


def spot_flux(t, P, inc, u1, u2, spots, k=0.0, n=900):
    """Normalised flux of a rotating star with spots, pixel-integrated, n x n per epoch."""
    inc = np.radians(inc)
    xs = (np.arange(n) + 0.5) / n * 2 - 1
    x = xs[None, :]
    y = xs[:, None]
    r2 = x * x + y * y
    on = r2 < 1.0
    mu = np.sqrt(np.clip(1.0 - r2, 0.0, 1.0))
    I = (1 - u1 * (1 - mu) - u2 * (1 - mu) ** 2) * on
    full = np.sum(I)
    # the star's frame has the spin along z; the observer along (sin inc, 0, cos inc).
    # sky basis: e_z' = observer, e_x' = in the plane of the spin axis, e_y' = y.
    obs = np.array([np.sin(inc), 0.0, np.cos(inc)])
    ex = np.array([np.cos(inc), 0.0, -np.sin(inc)])   # toward the spin axis's projection
    ey = np.cross(obs, ex)
    # a surface point in the star frame at pixel (x, y): x ex + y ey + mu obs
    out = np.ones(len(t))
    sx = (x[None] * 0 + 1)
    for idx, tt in enumerate(t):
        lost = 0.0
        for s in spots:
            lat, lon0, rad, c = np.radians(s['lat']), s['lon0'], np.radians(s['radius']), s['contrast']
            Plat = P / (1 - k * np.sin(lat) ** 2)
            lam = np.radians(lon0 + 360.0 * tt / Plat)
            sp = np.array([np.cos(lat) * np.cos(lam), np.cos(lat) * np.sin(lam), np.sin(lat)])
            dot = (x * np.dot(ex, sp) + y * np.dot(ey, sp) + mu * np.dot(obs, sp))
            inside = on & (dot >= np.cos(rad))
            lost += (1 - c) * np.sum(I[inside])
        out[idx] = 1 - lost / full
    return out


# ---- periodogram ------------------------------------------------------------------

def ls_peak(t, y, pmin, pmax, nf=200001):
    f = np.linspace(1 / pmax, 1 / pmin, nf)
    p = LombScargle(t, y, fit_mean=True, center_data=True).power(f, method='cython')
    i = int(np.argmax(p))
    return float(1 / f[i]), float(p[i])


def ls_power(t, y, periods):
    f = 1 / np.asarray(periods, float)
    return LombScargle(t, y, fit_mean=True, center_data=True).power(f, method='cython').tolist()


# ---- the flare rule ---------------------------------------------------------------

def harmonic_fit(t, f, P, K, mask):
    w = 2 * np.pi / P
    cols = [np.ones_like(t)]
    for k in range(1, K + 1):
        cols += [np.cos(k * w * t), np.sin(k * w * t)]
    A = np.vstack(cols).T
    c, *_ = np.linalg.lstsq(A[~mask], f[~mask], rcond=None)
    return A @ c


def running_median(t, r, mask, half):
    out = np.empty_like(r)
    tk, rk = t[~mask], r[~mask]
    lo = np.searchsorted(tk, t - half, 'left')
    hi = np.searchsorted(tk, t + half, 'right')
    for i in range(len(t)):
        seg = rk[lo[i]:hi[i]]
        out[i] = np.median(seg) if len(seg) else 0.0
    return out


def mad_sigma(x):
    return 1.4826 * np.median(np.abs(x - np.median(x)))


def quiescent(t, f, P, window=0.25, K=3, passes=3, start=None):
    mask = np.zeros(len(t), bool) if start is None else start.copy()
    for _ in range(passes):
        h = harmonic_fit(t, f, P, K, mask) if P else np.zeros_like(f) + np.median(f[~mask])
        m = running_median(t, f - h, mask, window / 2)
        q = h + m
        resid = f - q
        sigma = mad_sigma(resid[~mask])
        bad = resid > 2.5 * sigma
        mask = bad.copy()
        # AM2: each seed point is extended backward and forward while resid >= 1 sigma
        for i in np.where(bad)[0]:
            a = i
            while a > 0 and resid[a - 1] >= sigma:
                a -= 1
                mask[a] = True
            b = i
            while b + 1 < len(resid) and resid[b + 1] >= sigma:
                b += 1
                mask[b] = True
        ext = mask.copy()
        for s in (1, 2):
            mask[s:] |= ext[:-s]
            mask[:-s] |= ext[s:]
    return q, sigma


def find_flares(t, f, err, P, window=0.25, N1=3, N2=2, N3=3):
    q, sigma = quiescent(t, f, P, window)
    resid = f - q
    cad = float(np.median(np.diff(t)))
    cand = (resid / sigma >= N1) & ((resid - err) / sigma >= N2)
    runs, i, n = [], 0, len(t)
    while i < n:
        if cand[i]:
            j = i
            while j + 1 < n and cand[j + 1] and (t[j + 1] - t[j]) < 1.5 * cad:
                j += 1
            if j - i + 1 >= N3:
                runs.append((i, j))
            i = j + 1
        else:
            i += 1
    wins = []
    for a, b in runs:
        moved = True
        while moved:  # AM2: the window runs on until three consecutive points lie below 1 sigma
            moved = False
            for k in (1, 2, 3):
                if a - k >= 0 and (t[a] - t[a - k]) < 1.5 * cad * k and resid[a - k] >= sigma:
                    a -= k
                    moved = True
                    break
        moved = True
        while moved:
            moved = False
            for k in (1, 2, 3):
                if b + k < n and (t[b + k] - t[b]) < 1.5 * cad * k and resid[b + k] >= sigma:
                    b += k
                    moved = True
                    break
        wins.append([a, b])
    merged = []
    for w in wins:
        if merged and (t[w[0]] - t[merged[-1][1]]) < 1.5 * cad:
            merged[-1][1] = max(merged[-1][1], w[1])
        else:
            merged.append(w)
    # AM5 (second stage): one more pass with every window, extended before by half its length and
    # after by twice it, masked from the start; the windows stay, the excess is re-measured
    m0 = np.zeros(n, bool)
    for a, b in merged:
        ln = b - a + 1
        m0[max(0, a - int(np.ceil(ln / 2))):min(n, b + 2 * ln + 1)] = True
    if merged:
        q, _ = quiescent(t, f, P, window, passes=1, start=m0)
        resid = f - q
    out = []
    g = resid / q
    for a, b in merged:
        pk = a + int(np.argmax(resid[a:b + 1]))
        ed = float(np.trapz(g[a:b + 1], t[a:b + 1]) * 86400.0)
        out.append({'tStart': float(t[a]), 'tStop': float(t[b]), 'tPeak': float(t[pk]),
                    'ampRel': float(g[pk]), 'edSeconds': ed, 'n': b - a + 1})
    return out, float(sigma)


# ---- the synthetic flare curve ---------------------------------------------------

def template(x):
    x = np.asarray(x, float)
    out = np.zeros_like(x)
    r = (x >= -1) & (x <= 0)
    out[r] = 1 + 1.941 * x[r] - 0.175 * x[r] ** 2 - 2.246 * x[r] ** 3 - 1.125 * x[r] ** 4
    d = x > 0
    out[d] = 0.6890 * np.exp(-1.600 * x[d]) + 0.3030 * np.exp(-0.2783 * x[d])
    return out


def make_flare_curve():
    spec = THR['oracle']['flareCurve']
    rng = np.random.default_rng(THR['seeds']['oracle'])
    n, cad = 3000, 2.0 / 1440.0
    t = np.arange(n) * cad
    base = 1 + 0.02 * np.sin(2 * np.pi * t / 1.7)
    sub = 5
    truth = []
    exc = np.zeros(n)
    for k in range(20):
        tp = (4 + 4.5 * k + 0.37 * (k % 3)) / 24.0
        amp = 0.006 + 0.004 * (k % 5)
        th = (8 + 3 * (k % 4)) / 1440.0
        off = (np.arange(sub) + 0.5) / sub - 0.5
        tt = t[:, None] + off[None, :] * cad
        exc += amp * template((tt - tp) / th).mean(axis=1)
        truth.append({'tPeak': tp, 'amp': amp, 'tHalfMin': th * 1440, 'ed': amp * th * 1.827046 * 86400.0})
    noise = rng.normal(0, 1e-3, n)
    f = base * (1 + exc) + noise
    return t, f, np.full(n, 1e-3), truth


# ---- authentic data ------------------------------------------------------------

def read_spoc(path):
    with fits.open(path) as h:
        d = h['LIGHTCURVE'].data
        t, f, e, qf = (np.array(d[c], float) for c in ('TIME', 'PDCSAP_FLUX', 'PDCSAP_FLUX_ERR', 'QUALITY'))
    ok = (qf == 0) & np.isfinite(t) & np.isfinite(f) & np.isfinite(e)
    t, f, e = t[ok], f[ok], e[ok]
    m = np.median(f)
    return t, f / m, e / m


def bin_30(t, f, minimum=8):
    k = np.floor((t - t[0]) / (30 / 1440.0)).astype(int)
    tb, fb = [], []
    for kk in np.unique(k):
        s = k == kk
        if s.sum() >= minimum:
            tb.append(t[s].mean())
            fb.append(f[s].mean())
    return np.array(tb), np.array(fb)


def harmonic_period(t, y, P0, K=4, span=0.03):
    """AM3: the period at which a K-harmonic series leaves the least scatter (scipy, independent)."""
    from scipy.optimize import minimize_scalar

    def rss(P):
        w = 2 * np.pi / P
        cols = [np.ones_like(t)]
        for k in range(1, K + 1):
            cols += [np.cos(k * w * (t - t[0])), np.sin(k * w * (t - t[0]))]
        A = np.vstack(cols).T
        c, res, *_ = np.linalg.lstsq(A, y, rcond=None)
        r = y - A @ c
        return float(r @ r)
    grid = np.linspace(P0 * (1 - span), P0 * (1 + span), 241)
    v = [rss(P) for P in grid]
    i = int(np.argmin(v))
    lo, hi = grid[max(0, i - 1)], grid[min(len(grid) - 1, i + 1)]
    r = minimize_scalar(rss, bounds=(lo, hi), method='bounded', options={'xatol': 1e-9})
    return float(r.x)


def sha(path):
    return hashlib.sha256(open(path, 'rb').read()).hexdigest()


def main():
    fits_dir = sys.argv[1] if len(sys.argv) > 1 else None
    res = {'format': 'gravitas.stellar-activity-oracle-results/1', 'seed': THR['seeds']['oracle']}
    # B1
    res['spotDeficits'] = [
        {'config': c, 'deficit': deficit_pixels(c[0], c[1], c[2], c[3])}
        for c in THR['oracle']['spotConfigs']['configs']
    ]
    # B2 curves
    t = 24.0 * np.arange(600) / 600.0
    u1, u2, inc, ctr = 0.4, 0.22, 70, 0.6
    curves = [
        (4.2, [dict(lat=20, lon0=30, radius=12, contrast=ctr)], 0.0),
        (2.9, [dict(lat=25, lon0=0, radius=10, contrast=ctr), dict(lat=-30, lon0=110, radius=8, contrast=ctr)], 0.0),
        (7.5, [dict(lat=45, lon0=200, radius=15, contrast=ctr)], 0.15),
    ]
    pinned = THR['oracle']['curves']['pinnedPeriods']
    res['curves'] = []
    for P, spots, k in curves:
        y = spot_flux(t, P, inc, u1, u2, spots, k)
        pk, pw = ls_peak(t, y, 0.5, 12.0)
        res['curves'].append({'P': P, 'peakPeriod': pk, 'peakPower': pw, 'harmonicPeriod': harmonic_period(t, y, pk),
                              'powerAt': dict(zip(map(str, pinned), ls_power(t, y, pinned))),
                              'flux': [round(float(v), 9) for v in y]})
    # B3 flare curve
    tt, ff, ee, truth = make_flare_curve()
    fl, sg = find_flares(tt, ff, ee, 1.7)
    res['flareCurve'] = {'sigma': sg, 'flares': fl, 'nTruth': len(truth)}
    json.dump({'t0': 0.0, 'cadenceDays': 2.0 / 1440.0, 'period': 1.7,
               'note': 'synthetic; truth manifest below; baseline 1 + 0.02 sin(2 pi t / 1.7), sigma 1e-3, numpy default_rng(220)',
               'truth': truth, 'flux': [round(float(v), 7) for v in ff]},
              open(os.path.join(FIX, 'flare-curve.json'), 'w'), separators=(',', ':'))
    prov = {'python': sys.version.split()[0], 'numpy': np.__version__, 'scipy': scipy.__version__,
            'astropy': astropy.__version__, 'files': {}}
    # authentic
    res['authentic'] = {}
    if fits_dir:
        for key, name, pmin, pmax in (
            ('auMic', 'tess2018206045859-s0001-0000000441420236-0120-s_lc.fits', 0.5, 13.0),
            ('ekDra', 'tess2019253231442-s0016-0000000159613900-0152-s_lc.fits', 0.5, 13.0),
        ):
            p = os.path.join(fits_dir, name)
            if not os.path.exists(p):
                continue
            prov['files'][name] = sha(p)
            t2, f2, e2 = read_spoc(p)
            tb, fb = bin_30(t2, f2)
            pk, pw = ls_peak(tb, fb, pmin, pmax)
            entry = {'file': name, 'nKept': int(len(t2)), 'nBins': int(len(tb)),
                     'span': float(t2[-1] - t2[0]), 'peakPeriod': pk, 'peakPower': pw,
                     'harmonicPeriod': harmonic_period(tb, fb, pk)}
            fl2, sg2 = find_flares(t2, f2, e2, pk)
            # the rule is applied at the peak period; for a factor-two alias the harmonic series has K = 3 at P
            entry['flares'] = fl2
            entry['sigma'] = sg2
            res['authentic'][key] = entry
    json.dump(res, open(os.path.join(FIX, 'oracle-results.json'), 'w'), indent=1)
    json.dump(prov, open(os.path.join(FIX, 'oracle-provenance.json'), 'w'), indent=1)
    print('flare curve:', len(fl), 'found of', len(truth))
    for k, v in res['authentic'].items():
        print(k, v['nKept'], v['peakPeriod'], len(v['flares']))


if __name__ == '__main__':
    main()
