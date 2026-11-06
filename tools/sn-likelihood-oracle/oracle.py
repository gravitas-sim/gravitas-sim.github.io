#!/usr/bin/env python3
"""The independent oracle for Prompt 256 Part A (the supernova likelihood gate).

Written after tests/fixtures/supernova-likelihood/thresholds.json (commit 4f298510) and before any prototype code
existed. It imports no Gravitas code. It reads that file's bounds (restated below as constants, checked against
the file's text where a number is spelled there) and the raw Pantheon+SH0ES.dat only, and it does two things:

  1. the same likelihood the thresholds define, written again from the text: astropy 6.0.1 distances (the cited
     cosmology code), scipy.linalg for the Cholesky and the triangular solves, the analytic marginalisation of the
     additive offset, Nelder-Mead and Brent's rule for minima and crossings, its own brute-force domain check,
     its own edge-crossing and closure rules, scipy.stats for the levels, numpy.linalg.eigvalsh for the condition
     number;
  2. it draws the synthetic data sets (pinned to 17 significant digits so the prototype analyses the same numbers)
     and its own ensembles (numpy default_rng(SeedSequence([256, ...]))).

  PYTHONPATH=<dir with the import-only yaml stand-in> python3 tools/sn-likelihood-oracle/oracle.py [out.json]
"""
import hashlib
import json
import math
import os
import sys
import time
import warnings

import numpy as np
import scipy
import scipy.linalg as sla
import scipy.stats as sst
from scipy.optimize import brentq, minimize, minimize_scalar

import astropy
from astropy.cosmology import FlatLambdaCDM, FlatwCDM, LambdaCDM

warnings.filterwarnings('ignore')

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
FIX = os.path.join(ROOT, 'tests', 'fixtures', 'supernova-likelihood')
THRESH_PATH = os.path.join(FIX, 'thresholds.json')
RAW = os.path.join(ROOT, 'tools', 'data-packs', 'cosmology', 'Pantheon+SH0ES.dat')
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(FIX, 'oracle-results.json')

C_KMS = 299792.458
H0_REF = 70.0
TAU = 0.02
ZCUT = 0.01
OFFSET = 0.37
LEVEL_K = (1, 2, 3)
PK = [math.erf(k / math.sqrt(2)) for k in LEVEL_K]
D2 = [-2.0 * math.log(1.0 - p) for p in PK]          # Delta chi-square, 2 free parameters
D2_SCIPY = [float(sst.chi2.ppf(p, 2)) for p in PK]
D1 = [float(k * k) for k in LEVEL_K]
D1_SCIPY = [float(sst.chi2.ppf(p, 1)) for p in PK]

thresh_text = open(THRESH_PATH, 'rb').read()
THRESH_SHA = hashlib.sha256(thresh_text).hexdigest()
T = json.loads(thresh_text)


def sha_file(p):
    return hashlib.sha256(open(p, 'rb').read()).hexdigest()


# ---------------------------------------------------------------------------------------------- the data (raw file)
def read_raw():
    lines = open(RAW).read().split('\n')
    head = lines[0].split()
    at = {k: i for i, k in enumerate(head)}
    rows = []
    for ln in lines[1:]:
        if not ln.strip():
            continue
        f = ln.split()
        rows.append(dict(cid=f[at['CID']], z=float(f[at['zHD']]), mu=float(f[at['MU_SH0ES']]),
                         err=float(f[at['MU_SH0ES_ERR_DIAG']]), cal=int(float(f[at['IS_CALIBRATOR']])),
                         survey=int(float(f[at['IDSURVEY']]))))
    rows.sort(key=lambda r: (r['z'], r['cid'], r['survey']))
    return rows


ALL = read_raw()
SAMPLE = [r for r in ALL if r['cal'] == 0 and r['z'] >= ZCUT]
N = len(SAMPLE)
Z = np.array([r['z'] for r in SAMPLE])
MU = np.array([r['mu'] for r in SAMPLE])
SIG = np.array([r['err'] for r in SAMPLE])
SURV = np.array([r['survey'] for r in SAMPLE])
CID = [r['cid'] for r in SAMPLE]
ZMAX = float(Z.max())


def build_cov(idx, tau):
    """C for the rows idx of the sample: sigma^2 on the diagonal, tau^2 between rows of one survey (>= 2 rows)."""
    idx = np.asarray(idx)
    s = SIG[idx]
    sv = SURV[idx]
    C = np.diag(s * s)
    for code in np.unique(sv):
        m = np.where(sv == code)[0]
        if len(m) >= 2:
            C[np.ix_(m, m)] += tau * tau
            C[m, m] -= tau * tau          # diagonal stays sigma^2
    return C


def pd_ok(idx, tau):
    idx = np.asarray(idx)
    s = SIG[idx]
    sv = SURV[idx]
    for code in np.unique(sv):
        m = np.where(sv == code)[0]
        if len(m) >= 2 and not np.all(s[m] > tau):
            return False
    return True


class Chol:
    """Cholesky of a treatment's C on rows idx, with e = L^-1 1 for the marginalisation."""

    def __init__(self, treatment, idx, tau=TAU):
        self.treatment = treatment
        self.idx = np.asarray(idx)
        self.n = len(self.idx)
        if treatment == 'diag':
            self.L = None
            self.d = SIG[self.idx]
            self.e = 1.0 / self.d
        else:
            C = build_cov(self.idx, tau)
            self.L = sla.cholesky(C, lower=True)
            self.e = sla.solve_triangular(self.L, np.ones(self.n), lower=True)
        self.ee = float(self.e @ self.e)

    def whiten(self, R):
        """L^-1 applied to R (n,) or (n, k)."""
        if self.L is None:
            return R / (self.d if R.ndim == 1 else self.d[:, None])
        return sla.solve_triangular(self.L, R, lower=True)

    def chi2_from_r(self, R):
        """chi2_marg for residual columns R (n,) or (n,k): |u|^2 - (e.u)^2/|e|^2."""
        U = self.whiten(R)
        if U.ndim == 1:
            return float(U @ U - (self.e @ U) ** 2 / self.ee)
        return np.einsum('ij,ij->j', U, U) - (self.e @ U) ** 2 / self.ee


# ---------------------------------------------------------------------------------------------- distances (astropy)
def cosmo(kind, Om, Ode=None, w=-1.0):
    if kind == 'L1':
        return FlatLambdaCDM(H0=H0_REF, Om0=Om, Tcmb0=0)
    if kind == 'P1':
        return LambdaCDM(H0=H0_REF, Om0=Om, Ode0=Ode, Tcmb0=0)
    if kind == 'P2':
        return FlatwCDM(H0=H0_REF, Om0=Om, w0=w, Tcmb0=0)
    raise ValueError(kind)


_cache = {}


def mu_th(kind, Om, second=None, z=None):
    """Distance modulus at the sample's z for a node of a plane (Ode or w is `second`)."""
    zz = Z if z is None else z
    key = (kind, round(Om, 12), None if second is None else round(second, 12), zz is Z)
    if zz is Z and key in _cache:
        return _cache[key]
    if kind == 'L1':
        c = cosmo('L1', Om)
    elif kind == 'P1':
        c = cosmo('P1', Om, Ode=second)
    else:
        c = cosmo('P2', Om, w=second)
    dl = c.luminosity_distance(zz).value
    mu = 5.0 * np.log10(dl) + 25.0
    if zz is Z:
        if len(_cache) > 200000:
            _cache.clear()
        _cache[key] = mu
    return mu


def refused_node(kind, Om, second):
    """The oracle's own brute-force domain check (COSMOLOGY_II.md section 2 read as text, Or = 0).
    Returns (refused, marginal)."""
    if kind == 'P1':
        Ode, w = second, -1.0
    elif kind == 'P2':
        Ode, w = 1.0 - Om, second
    else:
        Ode, w = 1.0 - Om, -1.0
    Ok = 1.0 - Om - Ode
    a = np.logspace(-8, 0, 20000)
    F = Om * a + Ok * a ** 2 + Ode * a ** (1 - 3 * w)
    den = Om * a + abs(Ok) * a ** 2 + Ode * a ** (1 - 3 * w)
    with np.errstate(divide='ignore', invalid='ignore'):
        ratio = np.where(den > 0, F / den, 1.0)
    rmin = float(ratio.min())
    marginal = abs(rmin) < 1e-6
    if rmin <= 0:
        return True, marginal
    if Ok < 0:
        if kind == 'P1':
            c = cosmo('P1', Om, Ode=second)
        elif kind == 'P2':
            c = cosmo('P2', Om, w=second)
        else:
            c = cosmo('L1', Om)
        dc = c.comoving_distance(ZMAX).value
        if math.sqrt(abs(Ok)) * dc * H0_REF / C_KMS >= math.pi:
            return True, marginal
    return False, marginal


def node_status(kind, Om, second):
    """(final refusal, raw refusal, marginal, non-finite). AM1: a MARGINAL node (minimum ratio within 1e-6 of 0:
    the bounce boundary) and a node whose astropy distances are not finite are refused by the oracle."""
    raw, marg = refused_node(kind, Om, second)
    nonfinite = False
    if not raw and not marg:
        nonfinite = not np.all(np.isfinite(mu_th(kind, Om, second)))
    return (raw or marg or nonfinite), raw, marg, nonfinite


# ---------------------------------------------------------------------------------------------- planes
PLANES = {
    'L1': dict(a=np.round(np.linspace(0.0, 1.0, 201), 12), b=None),
    'P1': dict(a=np.round(np.linspace(0.0, 1.0, 51), 12), b=np.round(np.linspace(0.0, 1.5, 51), 12)),
    'P2': dict(a=np.round(np.linspace(0.0, 1.0, 51), 12), b=np.round(np.linspace(-3.0, 0.0, 51), 12)),
}
BOX = {'P1': ((0.0, 1.0), (0.0, 1.5)), 'P2': ((0.0, 1.0), (-3.0, 0.0))}


def node_mu(kind, i, j=None):
    if kind == 'L1':
        return mu_th('L1', float(PLANES['L1']['a'][i]))
    return mu_th(kind, float(PLANES[kind]['a'][i]), float(PLANES[kind]['b'][j]))


def build_nodes():
    """mu_th and domain flags at every node of every plane (one astropy call per node). refused = AM1 final."""
    out = {}
    t0 = time.time()
    for kind in ('L1', 'P1', 'P2'):
        a = PLANES[kind]['a']
        b = PLANES[kind]['b']
        if kind == 'L1':
            st = [node_status('L1', float(x), None) for x in a]
            mus = np.array([node_mu('L1', i) for i in range(len(a))])
            fin = np.array([s_[0] for s_ in st])
            out[kind] = dict(mu=mus, refused=fin, raw=np.array([s_[1] for s_ in st]),
                             marginal=np.array([s_[2] for s_ in st]), nonfinite=np.array([s_[3] for s_ in st]))
        else:
            n1, n2 = len(a), len(b)
            fin = np.zeros(n1 * n2, dtype=bool)
            raw = np.zeros(n1 * n2, dtype=bool)
            marg = np.zeros(n1 * n2, dtype=bool)
            nonf = np.zeros(n1 * n2, dtype=bool)
            mus = np.zeros((n1 * n2, N))
            for i in range(n1):
                for j in range(n2):
                    k = i * n2 + j
                    fin[k], raw[k], marg[k], nonf[k] = node_status(kind, float(a[i]), float(b[j]))
                    if not fin[k]:
                        mus[k] = node_mu(kind, i, j)
            out[kind] = dict(mu=mus, refused=fin, raw=raw, marginal=marg, nonfinite=nonf)
        print(f'  nodes {kind}: {time.time() - t0:.0f} s', file=sys.stderr)
    return out


# ---------------------------------------------------------------------------------------------- contours
def edges_of(chi, accepted, n1, n2, level):
    """Edge crossings of `level` on a (n1, n2) grid: [i, j, dir, f] with dir 0 = (i,j)->(i+1,j), 1 = (i,j)->(i,j+1)."""
    c = chi.reshape(n1, n2)
    acc = accepted.reshape(n1, n2)
    out = []
    for i in range(n1):
        for j in range(n2):
            if not acc[i, j]:
                continue
            if i + 1 < n1 and acc[i + 1, j] and ((c[i, j] <= level) != (c[i + 1, j] <= level)):
                out.append([i, j, 0, (level - c[i, j]) / (c[i + 1, j] - c[i, j])])
            if j + 1 < n2 and acc[i, j + 1] and ((c[i, j] <= level) != (c[i, j + 1] <= level)):
                out.append([i, j, 1, (level - c[i, j]) / (c[i, j + 1] - c[i, j])])
    return out


def region_closed(chi, accepted, n1, n2, level):
    """CLOSED iff no node inside the level lies on the outer ring and none has a refused 4-neighbour."""
    c = chi.reshape(n1, n2)
    acc = accepted.reshape(n1, n2)
    inside = np.zeros((n1, n2), dtype=bool)
    inside[acc] = c[acc] <= level
    if not inside.any():
        return False, 0
    for i in range(n1):
        for j in range(n2):
            if not inside[i, j]:
                continue
            if i in (0, n1 - 1) or j in (0, n2 - 1):
                return False, int(inside.sum())
            for di, dj in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                if not acc[i + di, j + dj]:
                    return False, int(inside.sum())
    return True, int(inside.sum())


# ---------------------------------------------------------------------------------------------- minimisation and slices
def exact_chi2(ch, kind, th):
    """chi2 at an exact theta on the rows of `ch`, or +inf outside the box or the domain."""
    if kind == 'L1':
        Om = th[0]
        if not (0.0 <= Om <= 1.0):
            return np.inf
        if node_status('L1', Om, None)[0]:
            return np.inf
        m = mu_th('L1', Om)
        return ch.chi2_from_r(MU_DATA[0][ch.idx] - m[ch.idx])
    (a0, a1), (b0, b1) = BOX[kind]
    Om, s = th
    if not (a0 <= Om <= a1 and b0 <= s <= b1):
        return np.inf
    if node_status(kind, Om, s)[0]:
        return np.inf
    m = mu_th(kind, Om, s)
    return ch.chi2_from_r(MU_DATA[0][ch.idx] - m[ch.idx])


MU_DATA = [None]   # the data vector (length N, indexed by sample row) the current analysis uses


def refine_min(ch, kind, chi_nodes, accepted, n1, n2):
    """Best accepted grid node, then Nelder-Mead on the exact function (inf outside box or domain)."""
    c = np.where(accepted, chi_nodes, np.inf)
    k = int(np.argmin(c))
    i, j = divmod(k, n2)
    a, b = PLANES[kind]['a'], PLANES[kind]['b']
    x0 = np.array([a[i], b[j]])
    (a0, a1), (b0, b1) = BOX[kind]
    ha = a[1] - a[0] if i + 1 < n1 else -(a[1] - a[0])
    hb = b[1] - b[0] if j + 1 < n2 else -(b[1] - b[0])
    sim = np.array([x0, x0 + [ha, 0.0], x0 + [0.0, hb]])
    res = minimize(lambda th: exact_chi2(ch, kind, th), x0, method='Nelder-Mead',
                   options=dict(initial_simplex=sim, xatol=1e-10, fatol=1e-12, maxiter=4000, maxfev=4000))
    best = float(min(res.fun, c[k]))
    pos = [float(x) for x in (res.x if res.fun <= c[k] else x0)]
    return best, pos, int(res.nfev)


def slice_crossings(ch, kind, fixed, vary, lo, hi, levels_abs, n=401):
    """Crossings of each absolute level along a slice by a 401-point scan and Brent's rule."""
    xs = np.linspace(lo, hi, n)

    def f(x):
        th = (x, fixed[1]) if vary == 0 else (fixed[0], x)
        return exact_chi2(ch, kind, th)

    vals = np.array([f(x) for x in xs])
    res = []
    for L in levels_abs:
        cr = []
        for t in range(n - 1):
            if np.isfinite(vals[t]) and np.isfinite(vals[t + 1]) and ((vals[t] <= L) != (vals[t + 1] <= L)):
                cr.append(float(brentq(lambda x: f(x) - L, xs[t], xs[t + 1], xtol=1e-12, rtol=1e-14)))
        res.append(cr)
    return res


def l1_profile(ch, grid_chi, accepted):
    """Refined L1 minimum (bounded golden-section by scipy) and exact crossings at Delta = 1, 4 (and 9)."""
    c = np.where(accepted, grid_chi, np.inf)
    k = int(np.argmin(c))
    a = PLANES['L1']['a']
    lo, hi = float(a[max(k - 1, 0)]), float(a[min(k + 1, len(a) - 1)])
    r = minimize_scalar(lambda x: exact_chi2(ch, 'L1', (x,)), bounds=(lo, hi), method='bounded',
                        options=dict(xatol=1e-12))
    best = float(min(r.fun, c[k]))
    pos = float(r.x) if r.fun <= c[k] else float(a[k])
    xs = np.linspace(0.0, 1.0, 401)
    vals = np.array([exact_chi2(ch, 'L1', (x,)) for x in xs])
    out = {}
    for lv, d in zip(('d1', 'd4', 'd9'), D1):
        L = best + d
        cr = []
        for t in range(400):
            if np.isfinite(vals[t]) and np.isfinite(vals[t + 1]) and ((vals[t] <= L) != (vals[t + 1] <= L)):
                cr.append(float(brentq(lambda x: exact_chi2(ch, 'L1', (x,)) - L, xs[t], xs[t + 1],
                                       xtol=1e-12, rtol=1e-14)))
        lower_open = not (np.isfinite(vals[0]) and vals[0] > L)
        upper_open = not (np.isfinite(vals[-1]) and vals[-1] > L)
        out[lv] = dict(crossings=cr, lowerOpen=bool(lower_open), upperOpen=bool(upper_open))
    return best, pos, out


# ---------------------------------------------------------------------------------------------- the datasets
def sub_index(n_rows):
    if n_rows == 300:
        k = N // 300
        return [i * k for i in range(300)]
    raise ValueError


IDX300 = sub_index(300)
IDX12 = [i for i, z in enumerate(Z) if z >= 0.05][:12]
IDXALL = list(range(N))

TRUTH = {
    'SYN300a': ('P1', 0.30, 0.70),
    'SYN300b': ('P1', 0.25, 0.60),
    'SYN300c': ('P2', 0.30, -0.8),
    'SYN12': ('P1', 0.30, 0.70),
}


def draw_synthetic(name, tag):
    kind, Om, s = TRUTH[name]
    idx = IDX12 if name == 'SYN12' else IDX300
    rng = np.random.default_rng(np.random.SeedSequence([256, 2 if name == 'SYN12' else 1, tag]))
    C = build_cov(idx, TAU)
    L = sla.cholesky(C, lower=True)
    m = mu_th(kind, Om, s)[idx]
    d = m + OFFSET + L @ rng.standard_normal(len(idx))
    full = np.zeros(N)
    full[idx] = d
    return idx, d, full


def analyse(name, mu_full, idx, treatment, nodes, planes):
    """Everything one (dataset, treatment) pair reports."""
    MU_DATA[0] = mu_full
    ch = Chol(treatment, idx)
    out = {}
    d_sub = mu_full[ch.idx]
    for kind in planes:
        nd = nodes[kind]
        if kind == 'L1':
            R = d_sub[:, None] - nd['mu'][:, ch.idx].T
            chi = ch.chi2_from_r(R)
            acc = ~nd['refused']
            best, pos, prof = l1_profile(ch, chi, acc)
            levels1 = [best + d for d in D1[:2]]
            edges1 = [[[i, j, d, round(f, 10)] for i, j, d, f in edges_of(chi, acc, len(chi), 1, L)] for L in levels1]
            out['L1'] = dict(chi2=[round(float(x), 9) if a else None for x, a in zip(chi, acc)],
                             best=round(best, 9), position=pos, intervals=prof, edges=edges1)
        else:
            n1, n2 = len(PLANES[kind]['a']), len(PLANES[kind]['b'])
            acc = ~nd['refused']
            chi = np.full(n1 * n2, np.inf)
            ok = np.where(acc)[0]
            R = d_sub[:, None] - nd['mu'][ok][:, ch.idx].T
            chi[ok] = ch.chi2_from_r(R)
            best, pos, nfev = refine_min(ch, kind, chi, acc, n1, n2)
            levels = [best + d for d in D2]
            edges = [[[i, j, d, round(f, 10)] for i, j, d, f in edges_of(chi, acc, n1, n2, L)] for L in levels]
            closed = [region_closed(chi, acc, n1, n2, L)[0] for L in levels]
            rec = dict(chi2=[round(float(x), 9) if a else None for x, a in zip(chi, acc)],
                       best=round(best, 9), position=pos, nfev=nfev, edges=edges, closed=closed)
            if name in ('real', 'SYN300a', 'SYN300b', 'SYN300c') and kind in ('P1', 'P2'):
                lv = levels[:2]
                if kind == 'P1':
                    sl = [dict(fixed=[0.3, 0.7], vary=1, range=[0.0, 1.5], key='Om=0.3'),
                          dict(fixed=[0.3, 0.7], vary=0, range=[0.0, 1.0], key='Ode=0.7')]
                else:
                    sl = [dict(fixed=[0.3, -1.0], vary=1, range=[-3.0, 0.0], key='Om=0.3'),
                          dict(fixed=[0.3, -1.0], vary=0, range=[0.0, 1.0], key='w=-1')]
                rec['slices'] = []
                for s in sl:
                    cr = slice_crossings(ch, kind, s['fixed'], s['vary'], s['range'][0], s['range'][1], lv)
                    rec['slices'].append(dict(key=s['key'], crossings=cr))
            out[kind] = rec
    return out


# ---------------------------------------------------------------------------------------------- ensembles (oracle's own)
def coverage_ensembles(nodes_by_kind):
    """The oracle's own L1 and P1 ensembles: numpy draws, its own likelihood (grid minimum, linear crossings)."""
    res = {}
    t0 = time.time()
    for treatment in ('diag', 'cov'):
        ch = Chol(treatment, IDXALL)
        # L1
        rng = np.random.default_rng(np.random.SeedSequence([256, 10, 1 if treatment == 'diag' else 2]))
        m_true = mu_th('L1', 0.30)
        nd = nodes_by_kind['L1']
        Vl1 = ch.whiten(nd['mu'].T)                      # (N, 201)
        cover = [0, 0]
        acc = ~nd['refused']
        a = PLANES['L1']['a']
        for _ in range(200):
            eps = rng.standard_normal(N)
            d = m_true + OFFSET + (SIG * eps if treatment == 'diag' else ch.L @ eps)
            u = ch.whiten(d)
            W = u[:, None] - Vl1
            chi = np.einsum('ij,ij->j', W, W) - (ch.e @ W) ** 2 / ch.ee
            chi = np.where(acc, chi, np.inf)
            kmin = int(np.argmin(chi))
            for lv, D in enumerate((1.0, 4.0)):
                lo, hi = -np.inf, np.inf
                for k in range(kmin, 0, -1):
                    if chi[k - 1] > chi[kmin] + D >= chi[k]:
                        lo = a[k - 1] + (chi[kmin] + D - chi[k - 1]) / (chi[k] - chi[k - 1]) * (a[k] - a[k - 1])
                        break
                for k in range(kmin, len(a) - 1):
                    if chi[k + 1] > chi[kmin] + D >= chi[k]:
                        hi = a[k] + (chi[kmin] + D - chi[k]) / (chi[k + 1] - chi[k]) * (a[k + 1] - a[k])
                        break
                if lo <= 0.30 <= hi:
                    cover[lv] += 1
        res[f'L1.{treatment}'] = [cover[0] / 200, cover[1] / 200]
        # P1
        rng = np.random.default_rng(np.random.SeedSequence([256, 11, 1 if treatment == 'diag' else 2]))
        nd = nodes_by_kind['P1']
        n1, n2 = len(PLANES['P1']['a']), len(PLANES['P1']['b'])
        acc = ~nd['refused']
        ok = np.where(acc)[0]
        V = ch.whiten(nd['mu'][ok].T)                     # (N, nok)
        mt = mu_th('P1', 0.30, 0.70)
        vt = ch.whiten(mt)
        m_true = mt
        cover = [0, 0]
        for _ in range(100):
            eps = rng.standard_normal(N)
            d = m_true + OFFSET + (SIG * eps if treatment == 'diag' else ch.L @ eps)
            u = ch.whiten(d)
            W = u[:, None] - V
            chi = np.einsum('ij,ij->j', W, W) - (ch.e @ W) ** 2 / ch.ee
            wt = u - vt
            ct = float(wt @ wt - (ch.e @ wt) ** 2 / ch.ee)
            dmin = ct - float(chi.min())
            for lv in range(2):
                if dmin <= D2[lv]:
                    cover[lv] += 1
        res[f'P1.{treatment}'] = [cover[0] / 100, cover[1] / 100]
        print(f'  ensembles {treatment}: {time.time() - t0:.0f} s', file=sys.stderr)
    return res


# ---------------------------------------------------------------------------------------------- the report
def main():
    t0 = time.time()
    out = {
        'format': 'gravitas.supernova-likelihood-oracle/1',
        'thresholdsSha256': THRESH_SHA,
        'software': dict(python=sys.version.split()[0], numpy=np.__version__, scipy=scipy.__version__,
                         astropy=astropy.__version__),
        'note': 'astropy for distances; scipy.linalg, Nelder-Mead and Brent written again from the thresholds; no Gravitas code',
    }
    out['data'] = dict(rawSha256=sha_file(RAW), rawRows=len(ALL), calibrators=sum(r['cal'] for r in ALL),
                       N=N, zMax=ZMAX, tau=TAU, zCut=ZCUT,
                       minSigma=float(SIG.min()), pdOk=bool(pd_ok(IDXALL, TAU)),
                       surveys={str(int(c)): int((SURV == c).sum()) for c in np.unique(SURV)})
    out['levels'] = dict(pk=PK, d2=D2, d2Scipy=D2_SCIPY, d1=D1, d1Scipy=D1_SCIPY)

    # the sample's rows as the oracle read them, for the pack-decode comparison (z, mu, err, survey)
    out['sample'] = dict(z=[r['z'] for r in SAMPLE], mu=[r['mu'] for r in SAMPLE],
                         err=[r['err'] for r in SAMPLE], survey=[int(r['survey']) for r in SAMPLE],
                         cal=[0] * N, cid=CID)

    # conditioning
    cond = {}
    for treatment in ('diag', 'cov'):
        C = np.diag(SIG ** 2) if treatment == 'diag' else build_cov(IDXALL, TAU)
        w = np.linalg.eigvalsh(C)
        cond[treatment] = dict(lmax=float(w[-1]), lmin=float(w[0]), cond=float(w[-1] / w[0]))
    out['condition'] = cond
    print(f'  condition done {time.time() - t0:.0f} s', file=sys.stderr)

    # A2 / B1 parameter sets
    sets = [('flat 0.3/0.7', 'P1', 0.3, 0.7), ('flat Om 0.1', 'P1', 0.1, 0.9), ('open 0.3/0', 'P1', 0.3, 0.0),
            ('closed 0.3/1.1', 'P1', 0.3, 1.1), ('w -0.7', 'P2', 0.3, -0.7), ('w -1.5', 'P2', 0.3, -1.5)]
    out['distanceSets'] = [dict(name=n, kind=k, Om=a, second=b,
                                mu=[round(float(x), 10) for x in mu_th(k, a, b)]) for n, k, a, b in sets]
    print(f'  distances done {time.time() - t0:.0f} s', file=sys.stderr)

    nodes = build_nodes()
    def plane_rec(kind):
        nd = nodes[kind]
        rec = dict(a=[float(x) for x in PLANES[kind]['a']],
                   refused=''.join('1' if r else '0' for r in nd['refused']),
                   rawRefused=''.join('1' if r else '0' for r in nd['raw']),
                   marginalNodes=[int(k) for k in np.where(nd['marginal'])[0]],
                   nonFiniteNodes=[int(k) for k in np.where(nd['nonfinite'])[0]])
        if PLANES[kind]['b'] is not None:
            rec['b'] = [float(x) for x in PLANES[kind]['b']]
        return rec

    out['planes'] = {k: plane_rec(k) for k in ('L1', 'P1', 'P2')}

    # pinned synthetic data
    syn = {}
    datasets = {'real': (MU, IDXALL)}
    for k, name in enumerate(('SYN300a', 'SYN300b', 'SYN300c')):
        idx, d, full = draw_synthetic(name, k)
        syn[name] = dict(truth=list(TRUTH[name]), rows=idx, mu=[float(x) for x in d])
        datasets[name] = (full, idx)
    idx, d, full = draw_synthetic('SYN12', 0)
    syn['SYN12'] = dict(truth=list(TRUTH['SYN12']), rows=idx, mu=[float(x) for x in d])
    datasets['SYN12'] = (full, idx)
    out['synthetic'] = syn
    print(f'  synthetic drawn {time.time() - t0:.0f} s', file=sys.stderr)

    analyses = {}
    for name, (mu_full, idx) in datasets.items():
        planes = ('L1', 'P1') if name == 'SYN12' else ('L1', 'P1', 'P2')
        for treatment in ('diag', 'cov'):
            analyses[f'{name}.{treatment}'] = analyse(name, mu_full, idx, treatment, nodes, planes)
            print(f'  analysed {name}.{treatment}: {time.time() - t0:.0f} s', file=sys.stderr)
    out['analyses'] = analyses

    out['ensembles'] = coverage_ensembles(nodes)

    # E4: duplicates (each supernova kept once: the row of the survey with the smallest sigma), L1 only
    keep = {}
    for i, r in enumerate(SAMPLE):
        c = r['cid']
        if c not in keep or SIG[i] < SIG[keep[c]]:
            keep[c] = i
    idx_unique = sorted(keep.values())
    dup = {'N': N, 'unique': len(idx_unique)}
    MU_DATA[0] = MU
    for treatment in ('diag', 'cov'):
        for label, idx in (('all', IDXALL), ('unique', idx_unique)):
            ch = Chol(treatment, idx)
            R = MU[ch.idx][:, None] - nodes['L1']['mu'][:, ch.idx].T
            chi = ch.chi2_from_r(R)
            best, pos, prof = l1_profile(ch, chi, ~nodes['L1']['refused'])
            dup[f'{treatment}.{label}'] = dict(best=best, position=pos, intervals=prof)
    out['duplicates'] = dup

    out['seconds'] = round(time.time() - t0, 1)
    with open(OUT, 'w') as f:
        keys = list(out.keys())
        f.write('{\n')
        for n, k in enumerate(keys):
            f.write(json.dumps(k) + ': ' + json.dumps(out[k], separators=(',', ':')) + (',\n' if n + 1 < len(keys) else '\n'))
        f.write('}\n')
    print('wrote', OUT, f'{out["seconds"]} s', file=sys.stderr)


if __name__ == '__main__':
    main()
