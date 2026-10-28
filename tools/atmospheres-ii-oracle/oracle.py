"""Independent oracle for the eclipse and phase slice of Prompt 202 (atmospheres II).

The eclipse, slab, Lambert and single-scattering parts of the oracle written for the atmospheres gate II (Prompt 201,
ATMOSPHERES_GATE_II.md), from the equations in that document and without reading the kernel; the transmission
(ray tracing) part is not carried because transmission is not built. Run under `python3 -I oracle.py OUT.json`
(numpy, scipy, astropy). It produces seeded inputs AND truth, columnar and rounded to 15 significant digits; the JS
validator runs the kernel on the inputs and compares. Nothing here imports Gravitas code. Seed 201, as at the gate, so
the numbers are the gate's own.
"""
import json, sys, time, hashlib
import numpy as np
from scipy import integrate
from astropy import constants as const

K_B = const.k_B.value
H_P = const.h.value
C = const.c.value
M_U = const.u.value
SIG = const.sigma_sb.value
R_JUP = const.R_jup.value
R_SUN = const.R_sun.value
SEED = 201


def rng_for(tag):
    return np.random.Generator(np.random.PCG64([SEED, int(hashlib.sha1(tag.encode()).hexdigest()[:8], 16)]))


# ----------------------------------------------------------------------------- Planck and the slab
def planck_l(lam, T):
    x = H_P * C / (lam * K_B * T)
    return 2 * H_P * C ** 2 / lam ** 5 / np.expm1(x)


def band_radiance(l1, l2, T):
    """mean over [l1,l2] of B_lambda, W m^-3 sr^-1 ... per metre of wavelength; quad in ln(lambda)."""
    f = lambda u: planck_l(np.exp(u), T) * np.exp(u)
    val, _ = integrate.quad(f, np.log(l1), np.log(l2), epsabs=0, epsrel=1e-13, limit=800)
    return val / (l2 - l1)


def slab_flux_over_pi(Bd, Bs, tau):
    f = lambda mu: (Bd * np.exp(-tau / mu) + Bs * (-np.expm1(-tau / mu))) * mu if mu > 0 else Bs * 0.0
    val, _ = integrate.quad(f, 0, 1, epsabs=0, epsrel=1e-13, limit=400)
    return 2 * val


# ----------------------------------------------------------------------------- Lambert and single-scattering spheres
def _phi_limits(alpha, theta):
    """phi half-range with mu0 > 0 at polar angle theta (observer on +z, sun at angle alpha from the observer)."""
    if alpha <= 0:
        return np.pi
    if alpha >= np.pi:
        return 0.0
    ct = np.cos(theta) / max(np.sin(theta), 1e-300)
    c = -ct / np.tan(alpha)
    if c <= -1:
        return np.pi
    if c >= 1:
        return 0.0
    return np.arccos(c)


def sphere_integral(alpha, weight):
    """integral over the lit, visible hemisphere of weight(mu0, mu) * mu0 * mu / ... as the caller defines, dA = sin(theta) dtheta dphi."""
    sa, ca = np.sin(alpha), np.cos(alpha)

    def inner(theta):
        pm = _phi_limits(alpha, theta)
        if pm == 0.0:
            return 0.0
        st, ct = np.sin(theta), np.cos(theta)
        g = lambda phi: weight(sa * st * np.cos(phi) + ca * ct, ct)
        v, _ = integrate.quad(g, 0, pm, epsabs=0, epsrel=1e-12, limit=200)
        return 2 * v * st

    val, _ = integrate.quad(inner, 0, np.pi / 2, epsabs=0, epsrel=1e-11, limit=400)
    return val


def lambert_phi(alpha):
    """disc-integrated Lambert sphere, normalised to 1 at alpha = 0 (integral of mu0 mu dA = 2 pi / 3 there)."""
    return sphere_integral(alpha, lambda m0, m: m0 * m) / (2 * np.pi / 3)


def hg(theta_s, g):
    return (1 - g * g) / (1 + g * g - 2 * g * np.cos(theta_s)) ** 1.5


def single_scatter_shape(alpha, g):
    """single-scattering sphere (Chandrasekhar): intensity ~ P(Theta) mu0 / (mu0 + mu); flux shape normalised at alpha = 0."""
    w = lambda m0, m: m0 * m / (m0 + m) if (m0 + m) > 0 else 0.0
    return hg(np.pi - alpha, g) * sphere_integral(alpha, w) / (hg(np.pi, g) * sphere_integral(0.0, w))


def ls_closed(alpha):
    """Lommel-Seeliger sphere phase function (Fairbairn 2005 form), 1 at alpha = 0."""
    a = np.asarray(alpha, float)
    return 1 - np.sin(a / 2) * np.tan(a / 2) * np.log(1 / np.tan(a / 4))


def r15(v):
    """Round to 15 significant digits (the checks' tightest bound is 1e-12)."""
    return float('%.14e' % v)


def col(rows, keys):
    return {k: [r15(r[k]) for r in rows] for k in keys}


def run(out_path):
    t0 = time.time()
    res = {'format': 'gravitas.atmospheres-ii-oracle-results/1', 'seed': SEED,
           'note': 'independent oracle, eclipse and phase slice; columnar, 15 significant digits; same seed and streams as the gate'}
    res['constants'] = {'k': K_B, 'h': H_P, 'c': C, 'mu': M_U, 'sigma': SIG}

    st = {}
    st['lambertAt0'] = lambert_phi(0.0)
    st['lambertAtHalfPi'] = lambert_phi(np.pi / 2) * 1.0 - 1 / np.pi
    st['lambertAtPi'] = lambert_phi(np.pi)
    al = np.array([0.3, 1.0, 2.0, 2.9])
    st['lommelSeeligerClosedVsNumeric'] = float(np.max(np.abs(np.array([single_scatter_shape(a, 0.0) for a in al]) - ls_closed(al))))
    res['selfTest'] = st

    r = rng_for('E1')
    e1 = []
    for _ in range(400):
        T = np.exp(r.uniform(np.log(200), np.log(10000)))
        l1 = r.uniform(0.3, 29.0) * 1e-6
        l2 = min(30e-6, l1 + max(0.01e-6, r.uniform(0.01, 29.7) * 1e-6 * r.uniform(0, 1)))
        l2 = max(l2, l1 + 0.01e-6)
        e1.append({'T': T, 'l1': l1, 'l2': l2, 'B': band_radiance(l1, l2, T)})
    res['E1'] = {'points': col(e1, ['T', 'l1', 'l2', 'B']),
                 'fullBand': col([{'T': T, 'l1': 1e-9, 'l2': 1e-1, 'expected': SIG * T ** 4 / np.pi / (1e-1 - 1e-9)} for T in (300.0, 1000.0, 2500.0, 5800.0, 9000.0)], ['T', 'l1', 'l2', 'expected'])}

    r = rng_for('E2')
    e2 = []
    for _ in range(1000):
        Tp = r.uniform(500, 3000); Ts = r.uniform(4000, 7000); k = r.uniform(0.03, 0.16)
        l1 = r.uniform(0.5, 10) * 1e-6; l2 = l1 * r.uniform(1.05, 1.6)
        Ag = r.uniform(0, 0.6); aR = r.uniform(4, 25)
        e2.append({'Tp': Tp, 'Ts': Ts, 'k': k, 'l1': l1, 'l2': l2, 'Ag': Ag, 'aR': aR,
                   'depth': k ** 2 * band_radiance(l1, l2, Tp) / band_radiance(l1, l2, Ts) + Ag / aR ** 2})
    res['E2'] = col(e2, ['Tp', 'Ts', 'k', 'l1', 'l2', 'Ag', 'aR', 'depth'])

    r = rng_for('E3')
    e3 = []
    for _ in range(300):
        tau = 10 ** r.uniform(-4, 2)
        Tp = r.uniform(800, 2800); l1 = r.uniform(1, 8) * 1e-6; l2 = l1 * 1.2
        Bd = band_radiance(l1, l2, Tp); Bs = band_radiance(l1, l2, Tp / 2 ** 0.25)
        e3.append({'tau': tau, 'Bd': Bd, 'Bs': Bs, 'F': slab_flux_over_pi(Bd, Bs, tau)})
    res['E3'] = col(e3, ['tau', 'Bd', 'Bs', 'F'])

    alphas = np.linspace(0, np.pi, 181)
    res['E4'] = {'alpha': [r15(a) for a in alphas], 'phi': [r15(lambert_phi(a)) for a in alphas]}

    grid = 0.1 + (3.04 - 0.1) * np.arange(24) / 23
    res['phaseGrid'] = {'alpha': [r15(a) for a in grid],
                        'lambert': [r15(lambert_phi(a)) for a in grid],
                        'lommel-seeliger': [r15(single_scatter_shape(a, 0.0)) for a in grid],
                        'hg+0.3': [r15(single_scatter_shape(a, 0.3)) for a in grid],
                        'hg-0.3': [r15(single_scatter_shape(a, -0.3)) for a in grid]}

    r = rng_for('E6')
    e6 = []
    for _ in range(2000):
        Tp = r.uniform(800, 2800); Ts = r.uniform(4500, 6500); k = r.uniform(0.05, 0.15)
        l1, l2 = 3.6e-6, 4.5e-6
        e6.append({'Tp': Tp, 'Ts': Ts, 'k': k, 'depth': k ** 2 * band_radiance(l1, l2, Tp) / band_radiance(l1, l2, Ts)})
    res['E6'] = {'band': [3.6e-6, 4.5e-6], **col(e6, ['Tp', 'Ts', 'k', 'depth'])}

    res['elapsedSeconds'] = round(time.time() - t0, 1)
    with open(out_path, 'w') as fh:
        json.dump(res, fh, allow_nan=False, separators=(',', ':'))
    print('oracle done', res['elapsedSeconds'], 's;', 'selftest', json.dumps(st))


if __name__ == '__main__':
    run(sys.argv[1])
