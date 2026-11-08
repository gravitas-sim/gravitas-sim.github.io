#!/usr/bin/env python3 -E
"""Independent oracle for Prompt 272 (the window-and-budget workflow).

Run:  python3 -E tests/fixtures/mission-lab-ii/oracle.py > tests/fixtures/mission-lab-ii/oracle-results.json

No Gravitas code, no Gravitas constant and no number from the ephemeris pack is
read except the pack manifest's date range (leg D2). The Lambert answer is
found by shooting: DOP853 two-body propagation of the heliocentric state and
fsolve on the three components of the departure velocity until the arrival
position is met. Constants come from the Horizons physical-data text recorded in
horizons-rows.json. thresholds.json holds the fixtures and every bound; nothing
here sets a bound.
"""
import json, math, os, sys
import numpy as np
from scipy.integrate import solve_ivp
from scipy.optimize import fsolve

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
H = json.load(open(os.path.join(HERE, 'horizons-rows.json')))
T = json.load(open(os.path.join(HERE, 'thresholds.json')))
C = H['constants']
MU, MUE, MUM = C['GM_sun'], C['GM_earth'], C['GM_mars']
RE, RM = C['R_earth_equ'], C['R_mars_equ']
G0 = 9.80665
DAY = 86400.0
INP = T['fixtures']['inputs']


def propagate(r0, v0, tof):
    f = lambda t, y: np.concatenate([y[3:], -MU * y[:3] / np.linalg.norm(y[:3]) ** 3])
    s = solve_ivp(f, (0, tof), np.concatenate([r0, v0]), method='DOP853', rtol=1e-12, atol=1e-9)
    return s.y[:3, -1], s.y[3:, -1]


def sine(r1, r2):
    return float(np.linalg.norm(np.cross(r1, r2)) / (np.linalg.norm(r1) * np.linalg.norm(r2)))


def shoot(r1, r2, tof, guess=None):
    """Prograde (angular momentum along +z) departure velocity, or None."""
    r1 = np.array(r1); r2 = np.array(r2)
    vc = math.sqrt(MU / np.linalg.norm(r1))
    tang = np.cross([0, 0, 1.0], r1); tang /= np.linalg.norm(tang)
    guesses = [] if guess is None else [np.array(guess)]
    guesses += [vc * tang * s for s in (1.0, 0.85, 1.15, 0.7, 1.3)]
    for g in guesses:
        sol, info, ier, _ = fsolve(lambda v: propagate(r1, v, tof)[0] - r2, g, full_output=True, xtol=1e-13, maxfev=400)
        miss = float(np.linalg.norm(propagate(r1, sol, tof)[0] - r2))
        h = np.cross(r1, sol)[2]
        if miss < 0.05 and h > 0:
            return sol
    return None


def hyp_burn(mu, rp, vinf):
    return math.sqrt(vinf * vinf + 2 * mu / rp) - math.sqrt(mu / rp)


def burns(v1, vE, v2, vM):
    d = float(np.linalg.norm(np.array(v1) - vE)); a = float(np.linalg.norm(np.array(v2) - vM))
    return d, a, hyp_burn(MUE, RE + INP['parkingAltitudeKm'], d), hyp_burn(MUM, RM + INP['parkingAltitudeKm'], a)


def ledger(vinf_dep, vinf_arr):
    rp_e = RE + INP['parkingAltitudeKm']
    rp = RM + INP['captureOrbit']['periapsisAltitudeKm']
    ra = INP['captureOrbit']['apoapsisRadiusKm']
    a = (rp + ra) / 2
    v_ell_p = math.sqrt(MUM * (2 / rp - 1 / a))
    rows = [
        ('launch', math.sqrt(MUE / rp_e) + INP['launchLossesKmS']),
        ('departure', hyp_burn(MUE, rp_e, vinf_dep)),
        ('corrections', INP['correctionsKmS']),
        ('arrival', math.sqrt(vinf_arr ** 2 + 2 * MUM / rp) - v_ell_p),
        ('capture', v_ell_p - math.sqrt(MUM / rp)),
    ]
    ve = INP['ispS'] * G0 / 1000
    sc = [dv for n, dv in rows if n != 'launch']
    start = INP['dryKg'] * math.exp(sum(sc) / ve)
    return {'rows': [{'id': n, 'dvKmS': dv} for n, dv in rows], 'totalKmS': sum(dv for _, dv in rows),
            'spacecraftKmS': sum(sc), 'startKg': start, 'propellantKg': start - INP['dryKg'], 'exhaustKmS': ve}


def jd_of(date):
    import datetime
    y, m, d = map(int, date.split('-'))
    return (datetime.date(y, m, d) - datetime.date(1970, 1, 1)).days + 2440587.5


def row(rows, jd):
    for r in rows:
        if abs(r[0] - jd) < 1e-6:
            return np.array(r[1:4]), np.array(r[4:7])
    raise KeyError(jd)


R = H['rows']
out = {'format': 'gravitas.mission-lab-ii-oracle-results', 'method': 'DOP853 shooting + fsolve, python -E', 'numpy': np.__version__}

# ---- pairs (B2, A, ledger) ----
pairs = []
for i, p in enumerate(T['fixtures']['datePairs']):
    jd1 = jd_of(p['departure']); jd2 = jd1 + p['tofDays']
    r1, vE = row(R['earthPairs'], jd1); r2, vM = row(R['marsPairs'], jd2)
    v1 = shoot(r1, r2, p['tofDays'] * DAY)
    rec = {'id': p['id'], 'departureJd': jd1, 'arrivalJd': jd2, 'tofDays': p['tofDays'], 'sine': sine(r1, r2)}
    if v1 is None:
        rec['converged'] = False
    else:
        r2e, v2 = propagate(r1, v1, p['tofDays'] * DAY)
        d, a, bd, ba = burns(v1, vE, v2, vM)
        rec.update({'converged': True, 'v1': list(map(float, v1)), 'v2': list(map(float, v2)), 'vinfDep': d, 'vinfArr': a,
                    'burnDep': bd, 'burnArr': ba, 'ledger': ledger(d, a), 'miss': float(np.linalg.norm(r2e - r2))})
    pairs.append(rec)
out['pairs'] = pairs

# ---- B2c: the kernel's v1 is flown by the oracle's integrator: done in the test from these helpers (the test supplies v1);
# the oracle script exposes the propagator result for the pinned kernel velocities via pinned-kernel-v1 if present.
kv = os.path.join(HERE, 'kernel-departures.json')
if os.path.exists(kv):
    K = json.load(open(kv))
    fl = []
    for p, k in zip(pairs, K['pairs']):
        # leg B2c as committed: from the kernel's departure position, with the kernel's velocity
        rf, _ = propagate(np.array(k['r1']), np.array(k['v1']), p['tofDays'] * DAY)
        fl.append({'id': p['id'], 'missKm': float(np.linalg.norm(rf - np.array(k['r2'])))})
    out['kernelFlown'] = fl

# ---- Hohmann estimate (A1-A3) ----
k0 = 15  # 2026-11-15, lattice index
eL, mL = R['earthLattice'], R['marsLattice']
def sma(rows_, k):
    r = np.array(rows_[k][1:4]); v = np.array(rows_[k][4:7])
    return 1 / (2 / np.linalg.norm(r) - v @ v / MU)
aE, aM = sma(eL, k0), sma(mL, k0)
aH = (aE + aM) / 2
vinf_d = math.sqrt(MU / aE) * (math.sqrt(2 * aM / (aE + aM)) - 1)
vinf_a = math.sqrt(MU / aM) * (1 - math.sqrt(2 * aE / (aE + aM)))
tH = math.pi * math.sqrt(aH ** 3 / MU) / DAY
nM = math.sqrt(MU / aM ** 3)
phiH = math.pi - nM * tH * DAY
lam = lambda rows_, k: math.atan2(rows_[k][2], rows_[k][1])
dl = []
for k in range(31):
    d = lam(mL, k) - lam(eL, k)
    d = d % (2 * math.pi)
    dl.append(d)
epoch = None
for k in range(30):
    if (dl[k] - phiH) * (dl[k + 1] - phiH) <= 0 and abs(dl[k] - dl[k + 1]) < 1:
        f = (dl[k] - phiH) / (dl[k] - dl[k + 1])
        epoch = eL[k][0] + f * 5
        break
out['hohmann'] = {'aEarthKm': aE, 'aMarsKm': aM, 'vinfDep': vinf_d, 'vinfArr': vinf_a,
                  'totalKmS': hyp_burn(MUE, RE + 300, vinf_d) + hyp_burn(MUM, RM + 300, vinf_a),
                  'tofDays': tH, 'phaseRad': phiH, 'epochJd': epoch, 'lambdaDiffRad': dl}

# ---- B3: the 806-cell subgrid ----
cells = []
guess_prev = {}
for ki in range(31):
    r1, vE = np.array(eL[ki][1:4]), np.array(eL[ki][4:7])
    last = None
    for jj in range(26):
        tof = 150 + 10 * jj
        m = ki + 30 + 2 * jj
        r2, vM = np.array(mL[m][1:4]), np.array(mL[m][4:7])
        s = sine(r1, r2)
        c = {'dep': ki, 'tofIdx': jj, 'sine': s}
        if s < 1e-3:
            c['status'] = 'degenerate'
        else:
            v1 = shoot(r1, r2, tof * DAY, last)
            if v1 is None:
                c['status'] = 'noConverge'
            else:
                _, v2 = propagate(r1, v1, tof * DAY)
                _, _, bd, ba = burns(v1, vE, v2, vM)
                c.update({'status': 'ok', 'total': bd + ba, 'c3': float(np.linalg.norm(v1 - vE)) ** 2})
                last = v1
        cells.append(c)
    print('row', ki, file=sys.stderr)
out['grid'] = {'cells': cells}

# ---- D1: degenerate pair ----
G = H['degenerate']
rE, _ = row(R['earthDegenerate'], G['departureJd'])
out['degenerate'] = {}
for key, jd2 in (('pair', G['arrivalJd']), ('control', G['controlArrivalJd'])):
    rM, vMd = row(R['marsDegenerate'], jd2)
    rec = {'arrivalJd': jd2, 'sine': sine(rE, rM), 'dot': float(rE @ rM)}
    if key == 'control':
        v1 = shoot(rE, rM, (jd2 - G['departureJd']) * DAY)
        rec['converged'] = v1 is not None
    out['degenerate'][key] = rec

# ---- D2: the pack's span from its manifest ----
man = json.load(open(os.path.join(ROOT, 'ephemeris-packs', 'solar-system-2025-2045.json')))
out['packRange'] = {'startJd': man['range']['startJd'], 'stopJd': man['range']['stopJd']}

# ---- A5: closed forms ----
out['hyperbolic'] = [{'vinf': v, 'earth': hyp_burn(MUE, RE + 300, v), 'mars': hyp_burn(MUM, RM + 300, v)} for v in (0.0, 2.5, 3.0)]
print(json.dumps(out, indent=1))
