#!/usr/bin/env python3
"""Independent oracle for the closed forms of Prompt 237 (tests/fixtures/dynamics/thresholds.json).

No Gravitas code. numpy and scipy only, built from the thresholds file alone. It supplies, for the
validator to feed the kernel the same inputs:

  A1  dynamical and crossing times in Myr by the SI path from GM_sun, the parsec and the Julian year
  A2  the half-mass relaxation time of the Spitzer form
  A3  the Plummer sphere's virial factor and mass by numerical integration (Jeans equation for the
      velocity moment, the projected mass by integrating the surface density)
  A4  Chandrasekhar's friction function by scipy.special.erf
  A5  the sinking time of a satellite in a singular isothermal sphere by integrating the equation of
      motion under Chandrasekhar's drag (scipy solve_ivp, DOP853)
  A6  the Coulomb logarithm
  A7  the local relaxation time in SI
  O1  200 random cases of every relation the kernel exposes, with the criterion's class

Usage: python3 tools/dynamics-oracle/oracle.py > tests/fixtures/dynamics/oracle-results.json
"""
import json
import math
import os
import numpy as np
from scipy import integrate, special

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
THR = json.load(open(os.path.join(ROOT, 'tests/fixtures/dynamics/thresholds.json')))
C = THR['constants']
GMS = C['GM_sun_m3s2']
AU = C['AU_m']
PC = 648000.0 / math.pi * AU
YR = C['Julian_year_s']
MYR = 1e6 * YR
KMS = 1000.0
SPITZER = 0.138
EVAP = 300.0


def sig(x, d=15):
    return float(f'{x:.{d}g}')


def t_dyn_myr(R_pc, M_sun):
    return math.sqrt((R_pc * PC) ** 3 / (GMS * M_sun)) / MYR


def t_cross_myr(R_pc, v_kms):
    return (R_pc * PC) / (v_kms * KMS) / MYR


def t_rh_myr(N, rh_pc, m_sun, gamma):
    return (
        SPITZER
        * math.sqrt(N)
        * (rh_pc * PC) ** 1.5
        / (math.sqrt(GMS * m_sun) * math.log(gamma * N))
    ) / MYR


def f_of_x(x):
    return float(special.erf(x) - 2 * x * math.exp(-x * x) / math.sqrt(math.pi))


def sink_closed_myr(r_pc, vc_kms, M_sun, lnl, r_final_pc=0.0):
    f1 = f_of_x(1.0)
    r2 = (r_pc * PC) ** 2 - (r_final_pc * PC) ** 2
    return r2 * (vc_kms * KMS) / (2 * GMS * M_sun * lnl * f1) / MYR


def local_relax_myr(v_kms, rho_msun_pc3, m_sun, lnl):
    rho = rho_msun_pc3 / PC ** 3  # solar masses per m^3
    v = v_kms * KMS
    return v ** 3 / (8 * math.pi * (GMS * m_sun) * (GMS * rho) * lnl) / MYR


def plummer_numeric():
    """eta = G M / (sigma_los^2 R_h) for an isotropic Plummer sphere with G = M = a = 1, by quadrature."""
    a = 1.0

    def rho(r):
        return 3.0 / (4 * math.pi) * a * a * (r * r + a * a) ** -2.5

    def menc(r):
        return r ** 3 / (r * r + a * a) ** 1.5

    def sr2(r):
        # Jeans equation for an isotropic system: rho sigma_r^2 = int_r^inf rho G M / r'^2 dr'
        val, _ = integrate.quad(lambda s: rho(s) * menc(s) / (s * s), r, np.inf, epsabs=1e-14, epsrel=1e-12)
        return val / rho(r)

    # the mean square speed: <v^2> = 3 <sigma_r^2>, mass weighted
    num, _ = integrate.quad(
        lambda r: 4 * math.pi * r * r * rho(r) * 3 * sr2(r), 0, np.inf, epsabs=1e-13, epsrel=1e-11, limit=200
    )
    mtot, _ = integrate.quad(lambda r: 4 * math.pi * r * r * rho(r), 0, np.inf, epsabs=1e-13, epsrel=1e-11, limit=200)
    v2 = num / mtot
    sigma_los2 = v2 / 3.0

    def sigma_proj(R):
        val, _ = integrate.quad(lambda z: rho(math.hypot(R, z)), -np.inf, np.inf, epsabs=1e-14, epsrel=1e-12)
        return val

    def mproj(R):
        val, _ = integrate.quad(lambda s: 2 * math.pi * s * sigma_proj(s), 0, R, epsabs=1e-13, epsrel=1e-11)
        return val

    # the projected half-mass radius: root of mproj(R) = mtot / 2
    from scipy.optimize import brentq

    Rh = brentq(lambda R: mproj(R) - 0.5 * mtot, 0.2, 5.0, xtol=1e-12)
    eta = 1.0 * mtot / (sigma_los2 * Rh)  # G = 1
    return {
        'mass': sig(mtot),
        'sigmaLos2': sig(sigma_los2),
        'projectedHalfMassRadius': sig(Rh),
        'eta': sig(eta),
        'massRecovered': sig(eta_to_mass(eta, sigma_los2, Rh)),
        'etaClosedForm': sig(32 / math.pi),
    }


def eta_to_mass(eta, s2, Rh):
    return eta * s2 * Rh


def sink_numeric(lnl=3.0, ratio=0.01, r_final=0.05):
    """G = 1, v_c = 1, r_i = 1: SIS, rho = 1 / (4 pi r^2). Drag a = -4 pi G^2 M rho lnL f(X) vhat / v^2."""
    M = ratio  # M / M_enc(1) with M_enc(1) = v_c^2 r / G = 1

    def rhs(t, y):
        x, yy, vx, vy = y
        r = math.hypot(x, yy)
        v = math.hypot(vx, vy)
        gx = -x / (r * r)  # SIS: g = -v_c^2 / r
        gy = -yy / (r * r)
        X = v  # v / (sqrt(2) sigma), sigma = v_c / sqrt(2)
        rho = 1.0 / (4 * math.pi * r * r)
        mag = 4 * math.pi * M * rho * lnl * f_of_x(X) / (v * v)
        return [vx, vy, gx - mag * vx / v, gy - mag * vy / v]

    def hit(t, y):
        return math.hypot(y[0], y[1]) - r_final

    hit.terminal = True
    hit.direction = -1
    sol = integrate.solve_ivp(rhs, [0, 400], [1.0, 0.0, 0.0, 1.0], method='DOP853', rtol=1e-11, atol=1e-13, events=hit)
    t_hit = float(sol.t_events[0][0])
    # closed form in G = v_c = r_i = 1 units: t = (1 - r_f^2) / (2 M lnL f(1))
    closed = (1 - r_final ** 2) / (2 * M * lnl * f_of_x(1.0))
    return {'lnLambda': lnl, 'massRatio': ratio, 'rFinal': r_final, 'tNumeric': sig(t_hit), 'tClosed': sig(closed)}


def main():
    rng = np.random.default_rng(THR['seeds']['oracle'])
    out = {
        'format': 'gravitas.dynamics-oracle/1',
        'generator': 'tools/dynamics-oracle/oracle.py',
        'numpy': np.__version__,
        'scipy': __import__('scipy').__version__,
        'seed': THR['seeds']['oracle'],
        'constants': {'GM_sun': GMS, 'AU': AU, 'pc': sig(PC), 'Julian_year': YR},
    }
    # A1
    a1 = []
    for _ in range(20):
        R = 10 ** rng.uniform(-1, 2)
        M = 10 ** rng.uniform(1, 7)
        v = 10 ** rng.uniform(math.log10(0.5), math.log10(200))
        a1.append({'R_pc': sig(R, 12), 'M_sun': sig(M, 12), 'v_kms': sig(v, 12), 'tDyn_Myr': sig(t_dyn_myr(R, M)), 'tCross_Myr': sig(t_cross_myr(R, v))})
    out['A1'] = a1
    # A2
    a2 = []
    for _ in range(30):
        N = int(10 ** rng.uniform(math.log10(500), 7))
        rh = 10 ** rng.uniform(-1, 1.5)
        m = 10 ** rng.uniform(math.log10(0.1), math.log10(2))
        gam = float(rng.choice([0.4, 0.11, 0.02]))
        a2.append({'N': N, 'rh_pc': sig(rh, 12), 'm_sun': sig(m, 12), 'gamma': gam, 'tRh_Myr': sig(t_rh_myr(N, rh, m, gam)),
                   'tDynAtRh_Myr': sig(t_dyn_myr(rh, N * m))})
    out['A2'] = a2
    # A3
    out['A3'] = plummer_numeric()
    # A4
    xs = np.concatenate([np.geomspace(0.01, 6, 28), [0.5, 1.0]])
    out['A4'] = {
        'f': [{'X': sig(x, 12), 'f': sig(f_of_x(x))} for x in xs],
        'smallX': {'X': 0.01, 'f': sig(f_of_x(0.01)), 'limit': sig(4 * 0.01 ** 3 / (3 * math.sqrt(math.pi)))},
        'largeX': {'X': 6.0, 'f': sig(f_of_x(6.0))},
    }
    # A5
    out['A5'] = sink_numeric()
    # A6
    a6 = []
    for _ in range(10):
        bmin = 10 ** rng.uniform(-6, 0)
        bmax = bmin * 10 ** rng.uniform(0.3, 6)
        a6.append({'bmax': sig(bmax, 12), 'bmin': sig(bmin, 12), 'lnLambda': sig(math.log(bmax / bmin))})
    out['A6'] = a6
    # A7
    a7 = []
    for _ in range(10):
        v = 10 ** rng.uniform(0, 2.3)
        rho = 10 ** rng.uniform(-2, 5)
        m = 10 ** rng.uniform(-1, 0.5)
        lnl = rng.uniform(5, 20)
        a7.append({'v_kms': sig(v, 12), 'rho_Msun_pc3': sig(rho, 12), 'm_sun': sig(m, 12), 'lnLambda': sig(lnl, 12), 'tRelax_Myr': sig(local_relax_myr(v, rho, m, lnl))})
    out['A7'] = a7
    # O1
    o1 = []
    for _ in range(200):
        N = int(10 ** rng.uniform(math.log10(500), 7))
        rh = 10 ** rng.uniform(-1, 1.5)
        mmean = 10 ** rng.uniform(math.log10(0.1), math.log10(2))
        gam = float(rng.choice([0.4, 0.11, 0.02]))
        mstar = mmean * 10 ** rng.uniform(0, 1.3)
        T = 10 ** rng.uniform(1, 5)  # Myr
        trh = t_rh_myr(N, rh, mmean, gam)
        cls = 'collisionless' if T <= 0.1 * trh else ('collisional' if T >= trh else 'transitional')
        r_i = 10 ** rng.uniform(-1, 1.5)
        vc = 10 ** rng.uniform(0.7, 2.5)
        Msat = 10 ** rng.uniform(2, 6)
        lnl = rng.uniform(1.5, 12)
        o1.append({
            'N': N, 'rh_pc': sig(rh, 12), 'mMean_sun': sig(mmean, 12), 'gamma': gam, 'mStar_sun': sig(mstar, 12), 'T_Myr': sig(T, 12),
            'r_pc': sig(r_i, 12), 'vc_kms': sig(vc, 12), 'M_sun': sig(Msat, 12), 'lnLambda': sig(lnl, 12),
            'tDyn_Myr': sig(t_dyn_myr(rh, N * mmean)), 'tRh_Myr': sig(trh),
            'tSeg_Myr': sig(mmean / mstar * trh), 'tEv_Myr': sig(EVAP * trh),
            'tSink_Myr': sig(sink_closed_myr(r_i, vc, Msat, lnl)), 'class': cls,
        })
    out['O1'] = o1
    print(json.dumps(out, separators=(',', ':')))


if __name__ == '__main__':
    main()
