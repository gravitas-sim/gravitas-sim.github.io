#!/usr/bin/env python3
"""
The direct-imaging oracle (Prompt 230): an independent implementation of the contract in
tests/fixtures/imaging/thresholds.json, on cases it generates itself.

    python3 tools/imaging-oracle/oracle.py > tests/fixtures/imaging/oracle-results.json

Independent of Gravitas: the constants (astropy.constants), the Planck function
(written here from astropy's h, c and k_B), the band integral (scipy.integrate.quad in log
wavelength), the equilibrium temperature (flux balance from the Stefan-Boltzmann law),
the Lambert phase function (written here) and the observability rule (written from the
contract). Not independent: the definitions themselves (a flux ratio of two
blackbodies, a Lambert sphere, a stated inner working angle); this is an independent
implementation of the stated formulas, not a cited code's output and not a coronagraph
simulation. numpy, scipy and astropy only; numpy RandomState(230).
"""
import json
import math
import sys

import astropy
import astropy.units as u
import numpy as np
import scipy
from astropy import constants as const
from scipy.integrate import quad

AU = const.au.value
R_J = 7.1492e7   # IAU 2015 B3 nominal equatorial radii, as in js/kernels/imaging/constants.js
R_E = 6.3781e6
R_SUN = 6.957e8  # IAU 2015 B3 nominal
SIGMA = const.sigma_sb.value
H, C, KB = const.h.value, const.c.value, const.k_B.value
ARCSEC = 180.0 / math.pi * 3600.0


def planck(lam_m, T):
    """B_lambda in W m^-3 sr^-1 (astropy's constants; astropy.modeling does not import here: no yaml)."""
    x = H * C / (lam_m * KB * T)
    return 2 * H * C**2 / lam_m**5 / math.expm1(x)


def thermal(lam, Tp, Ts, Rp, Rs):
    return (Rp / Rs) ** 2 * planck(lam, Tp) / planck(lam, Ts)


def band_energy(a, b, T):
    f = lambda x: planck(math.exp(x), T) * math.exp(x)
    val, _ = quad(f, math.log(a), math.log(b), epsabs=0, epsrel=1e-13, limit=400)
    return val


def band(a, b, Tp, Ts, Rp, Rs):
    return (Rp / Rs) ** 2 * band_energy(a, b, Tp) / band_energy(a, b, Ts)


def lambert(alpha):
    return (math.sin(alpha) + (math.pi - alpha) * math.cos(alpha)) / math.pi


def reflected(ag, Rp, a, alpha):
    return ag * (Rp / a) ** 2 * lambert(alpha)


def teq(Ts, Rs, a, bond, eps):
    f = 2.0 / 3.0 - 5.0 * eps / 12.0
    L = 4 * math.pi * Rs**2 * SIGMA * Ts**4
    flux = L / (4 * math.pi * a**2)
    return ((1 - bond) * f * flux / SIGMA) ** 0.25


def verdict(sep, contrast, iwa, floor):
    if sep < iwa:
        return 'inside-inner-working-angle'
    if contrast < floor:
        return 'below-contrast-floor'
    return 'observable'


def curve(name, Ts, Rs, Tp, Rp, a, ag):
    lams = np.exp(np.linspace(math.log(0.3e-6), math.log(30e-6), 61))
    bond = min(1.0, 1.5 * ag)
    out = dict(name=name, starTeffK=Ts, starRadiusM=Rs, planetTeffK=Tp, planetRadiusM=Rp,
               semiMajorM=a, geometricAlbedo=ag, phaseAngleRad=0.0,
               wavelengthsM=[float(x) for x in lams], thermal=[], reflected=[], total=[])
    for lam in lams:
        t = thermal(float(lam), Tp, Ts, Rp, Rs)
        r = reflected(ag, Rp, a, 0.0)
        out['thermal'].append(t)
        out['reflected'].append(r)
        out['total'].append(t + r)
    return out


def main():
    rs = np.random.RandomState(230)
    U = lambda lo, hi: float(rs.uniform(lo, hi))
    L = lambda lo, hi: float(math.exp(rs.uniform(math.log(lo), math.log(hi))))

    def system():
        Rs = L(0.3, 2.0) * R_SUN
        return dict(starTeffK=U(3000, 7000), starRadiusM=Rs, planetTeffK=U(100, 2000),
                    planetRadiusM=L(0.3, 2.0) * R_J, semiMajorM=L(0.05, 50) * AU * max(1.0, Rs / R_SUN))

    mono = []
    for _ in range(60):
        s = system()
        s['wavelengthM'] = L(0.4e-6, 25e-6)
        s['contrast'] = thermal(s['wavelengthM'], s['planetTeffK'], s['starTeffK'], s['planetRadiusM'], s['starRadiusM'])
        mono.append(s)
    bands = []
    for _ in range(40):
        s = system()
        lo = L(0.4e-6, 8e-6)
        s['lambdaMinM'], s['lambdaMaxM'] = lo, lo * U(1.1, 3.0)
        s['contrast'] = band(s['lambdaMinM'], s['lambdaMaxM'], s['planetTeffK'], s['starTeffK'], s['planetRadiusM'], s['starRadiusM'])
        bands.append(s)
    refl = []
    for _ in range(60):
        s = system()
        s['geometricAlbedo'] = U(0.0, 1.0)
        s['phaseAngleRad'] = U(0.0, math.pi)
        s['contrast'] = reflected(s['geometricAlbedo'], s['planetRadiusM'], s['semiMajorM'], s['phaseAngleRad'])
        refl.append(s)
    teqs = []
    for _ in range(40):
        s = system()
        s['bondAlbedo'] = U(0.0, 0.9)
        s['redistribution'] = U(0.0, 1.0)
        s['teq'] = teq(s['starTeffK'], s['starRadiusM'], s['semiMajorM'], s['bondAlbedo'], s['redistribution'])
        teqs.append(s)
    curves = [
        curve('earth-sun', 5772.0, R_SUN, 255.0, R_E, AU, 0.3),
        curve('jupiter-sun', 5772.0, R_SUN, 125.0, R_J, 5.2 * AU, 0.5),
        curve('hot-companion', 4000.0, 0.7 * R_SUN, 1500.0, R_J, 30 * AU, 0.0),
    ]
    obs = []
    for _ in range(200):
        sep, iwa = L(0.01, 2.0), L(0.05, 0.5)
        contrast, floor = L(1e-11, 1e-3), L(1e-10, 1e-4)
        obs.append(dict(separationArcsec=sep, innerWorkingArcsec=iwa, contrast=contrast,
                        contrastFloor=floor, expected=verdict(sep, contrast, iwa, floor)))
    json.dump(dict(
        format='gravitas.imaging-oracle/1',
        versions=dict(python=sys.version.split()[0], numpy=np.__version__, scipy=scipy.__version__, astropy=astropy.__version__),
        seed=230, mono=mono, band=bands, reflected=refl, teq=teqs, curves=curves, observability=obs,
    ), sys.stdout, indent=1)


if __name__ == '__main__':
    main()
