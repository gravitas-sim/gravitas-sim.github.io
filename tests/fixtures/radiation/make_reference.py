#!/usr/bin/env python3
"""Offline reference values for tests/radiationKernel.test.js.

An independent implementation (numpy, scipy) of the arithmetic the kernel does,
run once; its output is committed as reference.json and sed.json. Inputs:

  bands.json   js/data/radiation/bandpasses.js BANDS, dumped by node
  raw/*.fits   CALSPEC alpha_lyr_stis_008 and sun_reference_stis_002 (STScI),
               pinned in data-packs/radiation-bandpasses.json (Vega); the Sun file
               is a test fixture only (it is not an input to any pack):
               https://ssb.stsci.edu/cdbs/calspec/sun_reference_stis_002.fits
               sha256 a50b70a5c6515322cee14a3fe8060d9e4d7260912ae8d3e85b7fa88302130ab3

Run: python3 make_reference.py <bands.json> <vega.fits> <sun.fits>   (needs numpy, scipy, astropy)
Conventions: wavelengths nm; f_lambda W m^-2 nm^-1; photon-counting responses.
"""
import json, sys
import numpy as np
from scipy.integrate import quad
from astropy.io import fits

H = 6.62607015e-34; C = 299792458.0; K = 1.380649e-23
SIGMA = 2 * np.pi**5 * K**4 / (15 * H**3 * C**2)

def planck_lam(lam_m, T):
    return 2 * H * C**2 / lam_m**5 / np.expm1(H * C / (lam_m * K * T))

def sed_bb(T):
    return lambda lam_nm: np.pi * planck_lam(lam_nm * 1e-9, T) * 1e-9

def band_arrays(b):
    n = len(b['response'])
    lam = b['startNm'] + b['stepNm'] * np.arange(n) if 'startNm' in b else np.array(b['lambdaNm'], float)
    return lam, np.array(b['response'], float) / b['scale']

def refine(lam, s, max_step=1.0):
    # The kernel integrates on the band refined by linear interpolation of the
    # response to steps of at most 1 nm (every original node kept): written here
    # independently, as np.interp on a union of the nodes and a 1 nm comb.
    fine = [lam[0]]
    for a, b in zip(lam[:-1], lam[1:]):
        n = max(1, int(np.ceil((b - a) / max_step - 1e-9)))
        fine.extend(a + (b - a) * np.arange(1, n + 1) / n)
    fine = np.array(fine)
    return fine, np.interp(fine, lam, s)

def ab_trapz(b, sed):
    lam, s = refine(*band_arrays(b))
    num = np.trapz(sed(lam) * s * lam, lam)
    den = np.trapz(s / lam, lam)
    fnu_jy = num / (C * 1e9 * den) / 1e-26
    return -2.5 * np.log10(fnu_jy / 3631.0)

def ab_quad(b, sed):
    lam, s = band_arrays(b)
    S = lambda x: np.interp(x, lam, s)
    pts = list(lam)
    num = sum(quad(lambda x: sed(x) * S(x) * x, lam[i], lam[i + 1], epsabs=0, epsrel=1e-12)[0] for i in range(len(lam) - 1))
    den = sum(quad(lambda x: S(x) / x, lam[i], lam[i + 1], epsabs=0, epsrel=1e-12)[0] for i in range(len(lam) - 1))
    return -2.5 * np.log10(num / (C * 1e9 * den) / 1e-26 / 3631.0)

def main(bands_json, vega_fits, sun_fits):
    bands = {b['id']: b for b in json.load(open(bands_json))}
    out = {'planck': [], 'abBlackbody': [], 'abBlackbodyQuad': []}
    for lam_nm, T in [(500, 5772), (100, 30000), (2000, 3000), (656.28, 10000), (10, 1e6), (1e5, 300)]:
        out['planck'].append({'lambdaNm': lam_nm, 'T': T, 'value': planck_lam(lam_nm * 1e-9, T)})
    for bid in ['U', 'B', 'V', 'R', 'I', 'u', 'g', 'r', 'i', 'z', 'T', 'J', 'H', 'Ks']:
        for T in [3500, 5772, 10000, 30000]:
            out['abBlackbody'].append({'band': bid, 'T': T, 'value': float(ab_trapz(bands[bid], sed_bb(T)))})
    for bid in ['B', 'V', 'g', 'r', 'J']:
        for T in [3500, 5772, 10000, 30000]:
            out['abBlackbodyQuad'].append({'band': bid, 'T': T, 'value': float(ab_quad(bands[bid], sed_bb(T)))})
    # Total radiance: integral of B_lambda over all wavelengths = sigma T^4 / pi.
    T = 5772.0
    tot = quad(lambda l: planck_lam(l, T), 1e-8, 1e-2, points=[5e-7, 2e-6, 1e-5, 1e-4], epsrel=1e-12, limit=400)[0]
    out['radianceTotal'] = {'T': T, 'value': float(tot), 'sigmaT4OverPi': float(SIGMA * T**4 / np.pi)}
    json.dump(out, open('reference.json', 'w'), indent=1)
    sed = {}
    for name, f, (lo, hi) in [('vega', vega_fits, (2900, 25000)), ('sun', sun_fits, (2900, 25000))]:
        d = fits.open(f)[1].data
        m = (d['WAVELENGTH'] > lo) & (d['WAVELENGTH'] < hi)
        sed[name] = {'lambdaNm': [float('%.6g' % x) for x in d['WAVELENGTH'][m] / 10], 'fLambda': [float('%.6g' % x) for x in d['FLUX'][m] * 1e-2]}
    json.dump(sed, open('sed.json', 'w'), separators=(',', ':'))

if __name__ == '__main__':
    main(*sys.argv[1:4])
