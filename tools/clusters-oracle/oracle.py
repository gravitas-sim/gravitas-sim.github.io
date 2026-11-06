#!/usr/bin/env python3
"""Independent oracle for the galaxy-cluster kernel (Prompt 250).

numpy, scipy and astropy only; no Gravitas code and no value of Gravitas's. It reads
tests/fixtures/clusters/oracle-inputs.json (invented worlds, the tree's constants handed in as inputs,
thresholds.json AM1) and writes oracle-results.json. It re-implements, from the rules of
thresholds.json: the aperture selection, the iterated sigma clip, the plain dispersion and its
truncation factor (scipy brentq), the biweight scale and location (astropy.stats), the great-circle
separations (by the arctan form, not the haversine), the half-number and harmonic radii, D_A (astropy),
the virial mass and its three-term interval, the excess kurtosis (scipy), local densities and binned
fractions, the light and Clopper-Pearson intervals (scipy.stats.beta).

Run: python3 tools/clusters-oracle/oracle.py
"""
import json
import os
import sys

import numpy as np
from astropy.cosmology import FlatLambdaCDM
from astropy.stats import biweight_location, biweight_scale
from scipy.optimize import brentq
from scipy.stats import beta, kurtosis, norm

HERE = os.path.dirname(os.path.abspath(__file__))
FIX = os.path.join(HERE, '..', '..', 'tests', 'fixtures', 'clusters')
inp = json.load(open(os.path.join(FIX, 'oracle-inputs.json')))
C = inp['constants']
COSMO = FlatLambdaCDM(H0=inp['cosmology']['H0'], Om0=inp['cosmology']['Om'], Tcmb0=0)
MPC = C['PARSEC_M'] * 1e6
MAD_TO_SIGMA = 1.0 / norm.ppf(0.75)


def unit(ra, dec):
    r, d = np.radians(ra), np.radians(dec)
    return np.stack([np.cos(d) * np.cos(r), np.cos(d) * np.sin(r), np.sin(d)], axis=-1)


def sep(ra1, dec1, ra2, dec2):
    a, b = unit(ra1, dec1), unit(ra2, dec2)
    cross = np.linalg.norm(np.cross(a, b), axis=-1)
    dot = np.sum(a * b, axis=-1)
    return np.arctan2(cross, dot)


def V(a):
    return 1.0 - 2.0 * a * norm.pdf(a) / (2.0 * norm.cdf(a) - 1.0)


def xstar(kappa):
    return brentq(lambda x: x * x - V(kappa * x), 0.5, 1.0, xtol=1e-15, rtol=1e-15)


def clip(u, kappa, max_passes=10):
    n = len(u)
    centre = np.median(u)
    scale = MAD_TO_SIGMA * np.median(np.abs(u - centre))
    prev = None
    seen = set()
    for p in range(1, max_passes + 1):
        kept = np.where(np.abs(u - centre) <= kappa * scale)[0]
        if len(kept) < 2:
            return None, p, 'too-few-members'
        key = tuple(kept)
        if prev is not None and key == prev:
            return kept, p, 'ok'
        if key in seen:
            return kept, p, 'clip-not-converged'
        seen.add(key)
        prev = key
        centre = float(np.mean(u[kept]))
        scale = float(np.std(u[kept], ddof=1))
    return None, max_passes, 'clip-not-converged'


def analyse(w):
    c = C['C_KMS']
    kappa = w['kappa']
    ra = np.array([g['ra'] for g in w['galaxies']])
    dec = np.array([g['dec'] for g in w['galaxies']])
    z = np.array([g['z'] for g in w['galaxies']])
    ze = np.array([g['zErr'] for g in w['galaxies']])
    morph = np.array([g['morph'] for g in w['galaxies']])
    cen = w['centre']
    zuse = w['zGuess']
    out = {'index': w['index']}
    for p in (1, 2):
        da = COSMO.angular_diameter_distance(zuse).value
        ang = w['apertureMpc'] / da
        s = sep(ra, dec, cen['ra'], cen['dec']) <= ang
        idx = np.where(s)[0]
        if len(idx) < 20:
            out['status'] = 'too-few-members'
            return out
        z0 = float(np.median(z[idx]))
        v0 = c * (z[idx] - z0) / (1 + z0)
        idx = idx[np.abs(v0) <= w['velocityExtentKms']]
        if len(idx) < 20:
            out['status'] = 'too-few-members'
            return out
        u = c * (z[idx] - z0) / (1 + z0)
        kept, passes, st = clip(u, kappa)
        if st != 'ok':
            out['status'] = st
            return out
        mem = idx[kept]
        if len(mem) < 20:
            out['status'] = 'too-few-members'
            return out
        zc = float(np.mean(z[mem]))
        zuse = zc
        ucentre = float(np.mean(u[kept]))
    da = COSMO.angular_diameter_distance(zc).value
    v = c * (z[mem] - zc) / (1 + zc)
    n = len(v)
    s_raw = float(np.std(v, ddof=1))
    e2 = float(np.mean((c * ze[mem] / (1 + zc)) ** 2))
    sint = float(np.sqrt(s_raw ** 2 - e2))
    amp = s_raw / sint
    x = xstar(kappa)
    sigma = sint / x
    sig_err = amp * s_raw / x / np.sqrt(2 * (n - 1))
    tuning = inp['tuning']
    # biweight on the plain members (no errors), tuning of the input
    bw_scale = float(biweight_scale(v, c=tuning['cScale'], M=np.median(v)))
    bw_loc = float(biweight_location(z[mem], c=tuning['cLocation']))
    g2 = float(kurtosis(v, fisher=True, bias=False))
    se = float(np.sqrt(24.0 * n * (n - 1) ** 2 / ((n - 3) * (n - 2) * (n + 3) * (n + 5))))
    # radii
    d = sep(ra[mem], dec[mem], cen['ra'], cen['dec']) * da
    r_half = float(np.median(d))
    m = len(mem)
    ii, jj = np.triu_indices(m, 1)
    dij = sep(ra[mem][ii], dec[mem][ii], ra[mem][jj], dec[mem][jj]) * da
    r_harm = float(1.0 / np.mean(1.0 / dij))
    # mass
    K = w['factor']['value']
    sK = w['factor']['sigma']
    sR = w['declaredSigmaRadiusMpc']
    M = K * (sigma * 1000.0) ** 2 * (r_half * MPC) / C['G_SI']
    out.update(
        status='ok', members=[int(i) for i in mem], passes=passes, zc=zc, da=da,
        sRaw=s_raw, sigma=sigma, sigmaErr=float(sig_err), xstar=x,
        biweightScale=bw_scale, biweightLocation=bw_loc,
        g2=g2, se=se, rHalf=r_half, rHarmonic=r_harm, massKg=M,
    )
    if sR is not None:
        sln = float(np.sqrt((sK / K) ** 2 + (2 * sig_err / sigma) ** 2 + (sR / r_half) ** 2))
        out['sLnM'] = sln
        out['intervals'] = []
        for L in w['levels']:
            zq = float(norm.ppf((1 + L) / 2))
            out['intervals'].append({'level': L, 'lo': float(M * np.exp(-zq * sln)), 'hi': float(M * np.exp(zq * sln))})
    # local density and fractions (N = 5), edges as in the inputs' rule
    pts_ra, pts_dec = ra[mem], dec[mem]
    full = np.zeros((m, m))
    full[ii, jj] = dij
    full[jj, ii] = dij
    dens = np.full(m, np.nan)
    for a in range(m):
        row = np.sort(np.delete(full[a], a))
        dN = row[4]
        dens[a] = 5.0 / (np.pi * dN * dN)
    out['density'] = [float(x_) for x_ in dens]
    edges = [-1, 0, 1, 2]
    bins = []
    for b in range(len(edges) - 1):
        l = np.log10(dens)
        sel = (l >= edges[b]) & (l < edges[b + 1])
        bins.append({'n': int(sel.sum()), 'k': int((sel & (morph[mem] == 'early')).sum())})
    out['bins'] = bins
    return out


def light(w):
    zc = w['zc']
    dm = float(COSMO.distmod(zc).value)
    L = 0.0
    var2 = 0.0
    used = 0
    for g in w['members']:
        if g['mag'] > w['limitMag']:
            continue
        absm = g['mag'] - dm - g['k'] - g['A']
        Li = 10.0 ** (-0.4 * (absm - w['solarAbsMag']))
        L += Li
        var2 += (0.4 * np.log(10.0) * Li * g['magErr']) ** 2
        used += 1
    rel = float(np.sqrt(var2) / L)
    val = L
    if w['missing']:
        f = w['missing']['fraction']
        val = L / (1 - f)
        rel = float(np.hypot(rel, w['missing']['sigma'] / (1 - f)))
    ml = w['massKg'] / C['SOLAR_MASS_KG'] / val
    return {'index': w['index'], 'dm': dm, 'sum': L, 'solar': val, 'relSigma': rel, 'used': used,
            'ml': float(ml), 'mlRel': float(np.hypot(w['massRelSigma'], rel))}


def cp(k, n, level):
    a = 1 - level
    lo = 0.0 if k == 0 else float(beta.ppf(a / 2, k, n - k + 1))
    hi = 1.0 if k == n else float(beta.ppf(1 - a / 2, k + 1, n - k))
    return lo, hi


P = lambda x: 1 - np.sqrt(1 - x * x) + x * np.arccos(x)
x_half = float(brentq(lambda x: P(x) - 0.5, 0.01, 0.99, xtol=1e-15, rtol=1e-15))

res = {
    'format': 'gravitas.clusters-oracle-results/1',
    'tools': {'python': sys.version.split()[0], 'numpy': np.__version__,
              'scipy': __import__('scipy').__version__, 'astropy': __import__('astropy').__version__},
    'xHalf': x_half,
    'kPhys': 2.0 / x_half,
    'xstar3': xstar(3.0),
    'xstar': {str(k): xstar(float(k)) for k in (2, 3, 4, 5)},
    'worlds': [analyse(w) for w in inp['worlds']],
    'lightWorlds': [light(w) for w in inp['lightWorlds']],
    'binom': [dict(row, lo=cp(row['k'], row['n'], row['level'])[0], hi=cp(row['k'], row['n'], row['level'])[1])
              for row in inp['binom']],
}
# astropy's own constants, for the reported convention rows (no number typed here: read from astropy)
from astropy import constants as const
res['constants'] = {'astropyG': float(const.G.value), 'astropySolarMassKg': float(const.M_sun.value)}
json.dump(res, open(os.path.join(FIX, 'oracle-results.json'), 'w'))
print('oracle ok:', len(res['worlds']), 'worlds,', sum(1 for w in res['worlds'] if w['status'] == 'ok'), 'answered')
