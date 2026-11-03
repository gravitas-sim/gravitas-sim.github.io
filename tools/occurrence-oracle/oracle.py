#!/usr/bin/env python3
"""Independent oracle for Prompt 229 (tests/fixtures/occurrence/thresholds.json).

No Gravitas code. numpy, scipy (norm, chi2) and batman 2.5.1 (Kreidberg 2015, PASP 127, 1161), an
independent implementation of the Mandel and Agol (2002) occultation. Built from the thresholds file alone.

What it supplies:
  analytic   the geometric probability R*/a, the epoch counts, the transit's signal to noise from batman's
             light curve at every epoch (A3), the standard normal CDF at the efficiency checkpoints (A4), the
             AR(1) statistic's standard deviation (A6), the Poisson rate and its interval by scipy's chi-square
             quantiles (Garwood) and a root find of the deviance (A7).
  population its own 2000 stars (numpy, seed 229), the completeness sum of every bin as a quadrature of
             batman's per-epoch light curve, the exact distribution of the epoch count and Phi(S - threshold),
             its own planets and detections (batman, one N(0,1) draw per statistic), its false listings, and
             the rate n (1 - f) / E of every bin with the Garwood interval.

Usage: python3 tools/occurrence-oracle/oracle.py > tests/fixtures/occurrence/oracle-results.json
"""
import json, math, os, sys
from multiprocessing import get_context
import numpy as np
import batman
import scipy
from scipy.stats import norm, chi2
from scipy.optimize import brentq

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
THR = json.load(open(os.path.join(ROOT, 'tests/fixtures/occurrence/thresholds.json')))
C = THR['constants']
GMS, RSUN, REARTH, DAY = C['GM_sun_m3s2'], C['R_sun_m'], C['R_earth_eq_m'], C['day_s']
ST = THR['systems']['stars']
BN = THR['systems']['bins']
DET = THR['systems']['detection']
REL = THR['systems']['reliability']['stated_false_fraction_by_period_bin']
TR = THR['systems']['truth']
CAD = ST['cadence_days']
U = ST['limb_darkening_quadratic']
THETA = DET['threshold_sigma']
NMIN = DET['min_transits']
PE = np.array(BN['period_edges_days'], float)
RE = np.array(BN['radius_edges_earth'], float)
NP, NR = len(PE) - 1, len(RE) - 1
N_STARS = ST['N_gate']
SUP = 11
OFFSETS = (0.0, 1 / 3 / 48, 2 / 3 / 48)


def sig(x, d=13):
    return float(f'{x:.{d}g}') if np.isfinite(x) else None


def semi_major_m(P, Ms):
    return (GMS * Ms * (P * DAY) ** 2 / (4 * math.pi ** 2)) ** (1 / 3)


def pgeo(P, Rs, Ms):
    return Rs * RSUN / semi_major_m(P, Ms)


def params(P, k, aRs, b):
    pm = batman.TransitParams()
    pm.t0 = 0.0; pm.per = P; pm.rp = k; pm.a = aRs
    pm.inc = math.degrees(math.acos(b / aRs)); pm.ecc = 0.0; pm.w = 90.0
    pm.u = list(U); pm.limb_dark = 'quadratic'
    return pm


def t14(P, k, aRs, b):
    inc = math.acos(b / aRs)
    arg = max((1 + k) ** 2 - b ** 2, 1e-12) ** 0.5 / (aRs * math.sin(inc))
    return P / math.pi * math.asin(min(arg, 1.0))


def epoch_deficit(P, k, aRs, b, offset):
    """Deficits at the cadence times of one epoch (mid-transit at time 0), the grid shifted by offset."""
    pm = params(P, k, aRs, b)
    M = int(math.ceil(t14(P, k, aRs, b) / 2 / CAD)) + 2
    t = offset + np.arange(-M, M + 1) * CAD
    m = batman.TransitModel(pm, t, supersample_factor=SUP, exp_time=CAD)
    return t, 1.0 - m.light_curve(pm)


def s2_epoch(P, k, aRs, b):
    return float(np.mean([np.sum(epoch_deficit(P, k, aRs, b, o)[1] ** 2) for o in OFFSETS]))


def gl(n, a, b):
    x, w = np.polynomial.legendre.leggauss(n)
    return 0.5 * (b - a) * x + 0.5 * (b + a), 0.5 * (b - a) * w


def n_distribution(span, P):
    q = span / P
    m = int(math.floor(q))
    f = q - m
    return [(m, 1 - f), (m + 1, f)]


def pdet_given(s2, sigma, span, P):
    out = 0.0
    for n, pr in n_distribution(span, P):
        if n >= NMIN and pr > 0:
            out += pr * norm.cdf(math.sqrt(n * s2) / sigma - THETA)
    return out


# ---- the population ----------------------------------------------------------------------------
def make_stars(rng):
    Rs = np.clip(np.exp(rng.normal(math.log(ST['radius_Rsun']['median']), ST['radius_Rsun']['sigma_ln'], N_STARS)),
                 *ST['radius_Rsun']['clip'])
    sigma = np.clip(ST['noise_ppm_per_cadence']['median'] * np.exp(ST['noise_ppm_per_cadence']['sigma_ln'] * rng.normal(size=N_STARS)),
                    *ST['noise_ppm_per_cadence']['clip']) * 1e-6
    span = rng.choice(ST['span_days']['values'], p=ST['span_days']['weights'], size=N_STARS).astype(float)
    return Rs, Rs ** 0.9, sigma, span


NODES_P = gl(3, 0, 1)
NODES_R = gl(4, 0, 1)
NODES_B = gl(5, 0, 1)


def star_completeness(args):
    Rs, Ms, sigma, span = args
    c = np.zeros((NP, NR))
    for j in range(NP):
        lp0, lp1 = math.log(PE[j]), math.log(PE[j + 1])
        for kk in range(NR):
            lr0, lr1 = math.log(RE[kk]), math.log(RE[kk + 1])
            tot = 0.0
            for xp, wp in zip(*NODES_P):
                P = math.exp(lp0 + xp * (lp1 - lp0))
                a = semi_major_m(P, Ms)
                aRs = a / (Rs * RSUN)
                pg = Rs * RSUN / a
                for xr, wr in zip(*NODES_R):
                    Re = math.exp(lr0 + xr * (lr1 - lr0))
                    k = Re * REARTH / (Rs * RSUN)
                    pdb = 0.0
                    for xb, wb in zip(*NODES_B):
                        pdb += wb * pdet_given(s2_epoch(P, k, aRs, xb), sigma, span, P)
                    tot += wp * wr * pg * pdb
            c[j, kk] = tot
    return c


def garwood(n, T, level):
    a = (1 - level) / 2
    lo = 0.0 if n == 0 else chi2.ppf(a, 2 * n) / 2 / T
    hi = chi2.ppf(1 - a, 2 * n + 2) / 2 / T
    return lo, hi


def deviance(n, T, level):
    thr = chi2.ppf(level, 1)
    rate = n / T
    f = lambda x: 2 * n * (x - 1 - math.log(x)) - thr
    lo = brentq(f, 1e-12, 1.0, xtol=1e-14, rtol=1e-14)
    top = 2.0
    while f(top) < 0:
        top *= 2
    hi = brentq(f, 1.0, top, xtol=1e-14, rtol=1e-14)
    return lo * rate, hi * rate


def interval(n, T, level):
    return garwood(n, T, level) if n < 100 else deviance(n, T, level)


def main():
    rng = np.random.default_rng(THR['seeds']['oracle'])
    out = {'oracle': {'numpy': np.__version__, 'scipy': scipy.__version__, 'batman': batman.__version__,
                      'seed': THR['seeds']['oracle'], 'supersample': SUP, 'offsets': 3}}

    # A1
    cases = [(1.0, 1.0, 365.25)]
    for _ in range(20):
        cases.append((float(np.clip(np.exp(rng.normal(0, 0.2)), 0.6, 1.6)), None, float(np.exp(rng.uniform(0, math.log(256))))))
    a1 = []
    for Rs, Ms, P in cases:
        Ms = Rs ** 0.9 if Ms is None else Ms
        a1.append({'Rs': sig(Rs), 'Ms': sig(Ms), 'P': sig(P), 'pgeo': sig(pgeo(P, Rs, Ms))})
    out['A1'] = a1

    # A2
    a2 = []
    for _ in range(40):
        P = float(np.exp(rng.uniform(0, math.log(500))))
        span = float(rng.choice([90, 365, 1460]))
        t0 = float(rng.uniform(0, P))
        n = int(math.ceil((span - t0) / P)) if t0 < span else 0
        a2.append({'P': sig(P), 'span': span, 't0': sig(t0), 'N': n})
    out['A2'] = a2

    # A3: every epoch, batman, absolute cadence times t = (j + 0.5) * CAD, the stated (star, sigma, span, t0)
    a3 = []
    for Re in (1.0, 4.0):
        for P in (3.0, 30.0, 200.0):
            for b in (0.0, 0.5, 0.9):
                Rs, Ms, sigma, span, t0 = 1.0, 1.0, 100e-6, 1460.0, 0.37 * P
                aRs = semi_major_m(P, Ms) / (Rs * RSUN)
                k = Re * REARTH / (Rs * RSUN)
                n = int(math.ceil((span - t0) / P))
                half = t14(P, k, aRs, b) / 2 + CAD
                times = []
                for e in range(n):
                    tm = t0 + e * P
                    j0 = int(math.floor((tm - half) / CAD)); j1 = int(math.ceil((tm + half) / CAD))
                    times.extend((np.arange(j0, j1 + 1) + 0.5) * CAD)
                times = np.array(times)
                pm = params(P, k, aRs, b); pm.t0 = t0
                m = batman.TransitModel(pm, times, supersample_factor=21, exp_time=CAD)
                s = 1.0 - m.light_curve(pm)
                a3.append({'Re': Re, 'P': P, 'b': b, 'Rs': Rs, 'Ms': Ms, 'sigma': sigma, 'span': span, 't0': t0,
                           'N': n, 'S': sig(math.sqrt(np.sum(s ** 2)) / sigma)})
    out['A3'] = a3

    # A4
    out['A4'] = {'offsets': [-2, -1, 0, 1, 2], 'phi': [sig(norm.cdf(d)) for d in (-2, -1, 0, 1, 2)]}

    # A6: AR(1) closed form for three single-epoch shapes (white marginal unit variance)
    a6 = []
    rho = DET['red_noise']['rho_leg']
    for Re, P, b in ((2.0, 5.0, 0.2), (4.0, 20.0, 0.6), (8.0, 60.0, 0.4)):
        Rs, Ms = 1.0, 1.0
        aRs = semi_major_m(P, Ms) / (Rs * RSUN); k = Re * REARTH / (Rs * RSUN)
        t, s = epoch_deficit(P, k, aRs, b, 0.0)
        idx = np.arange(len(s))
        Cm = rho ** np.abs(idx[:, None] - idx[None, :])
        a6.append({'Re': Re, 'P': P, 'b': b, 'Rs': Rs, 'Ms': Ms, 'rho': rho,
                   'sEff': sig(math.sqrt(s @ Cm @ s) / math.sqrt(s @ s))})
    out['A6'] = a6

    # A7
    a7 = []
    E, r = 37.5, 0.9
    for n in (1, 5, 20, 99, 100, 400):
        T = E / r
        for level in (0.6827, 0.95):
            lo, hi = interval(n, T, level)
            a7.append({'n': n, 'level': level, 'rate': sig(n / T), 'lo': sig(lo), 'hi': sig(hi)})
    out['A7'] = a7

    # population
    Rs, Ms, sigma, span = make_stars(rng)
    out['stars'] = {'Rs': [sig(x, 13) for x in Rs], 'sigma': [sig(x, 13) for x in sigma], 'span': [int(x) for x in span]}
    with get_context('spawn').Pool(3) as pool:
        cs = pool.map(star_completeness, list(zip(Rs, Ms, sigma, span)), chunksize=25)
    Esum = np.sum(cs, axis=0)  # [P bin, R bin]
    out['E'] = [[sig(Esum[j, k]) for k in range(NR)] for j in range(NP)]

    # truth rates
    mid = np.sqrt(PE[:-1] * PE[1:])
    w = mid ** 0.4; w /= w.sum()
    G = np.outer(w, np.array(TR['radius_bin_totals_per_star']))
    out['truth'] = [[sig(G[j, k]) for k in range(NR)] for j in range(NP)]
    out['reliabilityFalse'] = REL

    # planets and detections
    real = np.zeros((NP, NR), int); fp = np.zeros((NP, NR), int)
    transiting = 0
    for j in range(NP):
        lp0, lp1 = math.log(PE[j]), math.log(PE[j + 1])
        for k in range(NR):
            lr0, lr1 = math.log(RE[k]), math.log(RE[k + 1])
            npl = rng.poisson(G[j, k] * N_STARS)
            for _ in range(npl):
                i = int(rng.integers(N_STARS))
                P = math.exp(rng.uniform(lp0, lp1)); Re = math.exp(rng.uniform(lr0, lr1))
                if rng.uniform() >= pgeo(P, Rs[i], Ms[i]):
                    continue
                transiting += 1
                b = float(rng.uniform()); t0 = float(rng.uniform(0, P))
                n = int(math.ceil((span[i] - t0) / P)) if t0 < span[i] else 0
                z0 = rng.normal()
                if n < NMIN:
                    continue
                aRs = semi_major_m(P, Ms[i]) / (Rs[i] * RSUN); kr = Re * REARTH / (Rs[i] * RSUN)
                S = math.sqrt(n * s2_epoch(P, kr, aRs, b)) / sigma[i]
                if S + z0 >= THETA:
                    real[j, k] += 1
            f = REL[j]
            fp[j, k] = rng.poisson(G[j, k] * Esum[j, k] * f / (1 - f))
    n_obs = real + fp
    out['detections'] = {'real': real.tolist(), 'false': fp.tolist(), 'listed': n_obs.tolist(), 'transiting': transiting}

    rates = []
    for j in range(NP):
        for k in range(NR):
            n = int(n_obs[j, k]); f = REL[j]; Ej = Esum[j, k]
            T = Ej / (1 - f)
            row = {'j': j, 'k': k, 'n': n, 'E': sig(Ej)}
            if n > 0:
                lo, hi = interval(n, T, 0.6827)
                row.update({'rate': sig(n / T), 'lo': sig(lo), 'hi': sig(hi)})
                lo95, hi95 = interval(n, T, 0.95)
                row.update({'lo95': sig(lo95), 'hi95': sig(hi95)})
            rates.append(row)
    out['rates'] = rates
    json.dump(out, sys.stdout, separators=(',', ':'))


if __name__ == '__main__':
    main()
