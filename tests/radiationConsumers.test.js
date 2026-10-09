// =============================================================================
// The radiation kernel against what already computes the same things
// -----------------------------------------------------------------------------
// Prompt 82 asks the Stellar Lab, the spectra screens, the Observatory's flux and
// extinction arithmetic and the model page to adopt the kernel without changing
// any lesson's expected value, and to keep the old path where it differs beyond
// the lesson's tolerance. Importing the kernel into those routes would add a
// request to routes that have none to spare (tools/route-budgets.json), so this
// holds each consumer to the kernel by measurement instead and records the
// differences (RADIATION.md, "What Prompt 83 inherits"). Nothing here changes a
// consumer; a consumer that drifts from the kernel fails here.
// =============================================================================

import { describe, test, expect } from '@jest/globals';

import * as K from '../js/kernels/radiation/index.js';
import { BANDS } from '../js/data/radiation/bandpasses.js';
import { LINES } from '../js/data/radiation/lines.js';
import { LAW } from '../js/data/radiation/extinction.js';
import {
  R_SUN_M,
  TEFF_SUN_K,
  luminosityFromRadiusAndTemperature,
} from '../js/stellar/geometry.js';
import { LINES as OLD_LINES } from '../js/measure/spectrumLine.js';
import { SPECTRAL_FEATURES, airToVacuum } from '../js/stellar/spectrumIndex.js';

const band = id => K.decodeBand(BANDS.find(b => b.id === id));
const C = 299792.458;

describe('the Stellar Lab: the three sizes of a star', () => {
  test("the solar constants are the kernel's (IAU 2015 B3)", () => {
    expect(TEFF_SUN_K).toBe(K.TEFF_SUN_K);
    expect(R_SUN_M).toBe(K.R_SUN_M);
  });
  test("L = R^2 T^4 in solar units is the kernel's Stefan-Boltzmann law, to the four digits of the nominal values", () => {
    // 1e-4: the nominal L, R, T are four-digit numbers that agree to 5e-5 (the kernel gives
    // 1.00005 L_sun for a nominal Sun). Two radii and temperatures apart, to 1e-12 of each other.
    for (const [R, T] of [
      [1, 5772],
      [10, 4500],
      [0.2, 3200],
      [5, 15000],
    ]) {
      const kernel = K.luminosity(R * K.R_SUN_M, T) / K.L_SUN_W;
      expect(
        Math.abs(kernel / luminosityFromRadiusAndTemperature(R, T) - 1)
      ).toBeLessThan(1e-4);
    }
  });
});

describe('the spectra screens', () => {
  test("airToVacuum (Angstrom) is the kernel's Morton 2000 (nm): the same formula to rounding", () => {
    for (const a of [3500, 4861.35, 5892.94, 6562.8, 9000]) {
      expect(
        Math.abs(airToVacuum(a) / (K.airToVacuumNm(a / 10) * 10) - 1)
      ).toBeLessThan(1e-12);
    }
  });

  test('the Balmer lines of the line-measuring tool against NIST: the largest difference is 1.7 km/s (H-beta vacuum, 0.028 A)', () => {
    // Recorded, not changed: a student velocity measured with these rest wavelengths
    // moves by up to 1.7 km/s if the kernel's are used instead. The cause of the largest
    // is an inconsistency in the old table itself: its H-beta pairs air 4861.35 with vacuum
    // 4862.68, which Morton 2000 gives for 4861.33; the pair is 0.028 A (1.7 km/s) apart. RADIATION.md has the
    // table; it is for Prompt 83 to decide whether a lesson tolerance can absorb it.
    const map = { ha: 'h-alpha', hb: 'h-beta', hg: 'h-gamma' };
    let worst = 0;
    for (const o of OLD_LINES) {
      const k = LINES.find(l => l.id === map[o.id]);
      for (const m of ['air', 'vacuum']) {
        const dKms = ((o[m] - k[m] * 10) / o[m]) * C;
        worst = Math.max(worst, Math.abs(dKms));
        expect(Math.abs(o[m] - k[m] * 10)).toBeLessThan(0.03);
      }
    }
    expect(worst).toBeGreaterThan(1.6);
    expect(worst).toBeLessThan(1.8);
  });

  test("the feature labels point where the kernel's lines are, to 0.05 A (the windows are tens of Angstroms wide)", () => {
    const ids = { cak: 'ca2-k', hbeta: 'h-beta' };
    for (const f of SPECTRAL_FEATURES.filter(x => ids[x.id])) {
      const k = LINES.find(l => l.id === ids[f.id]);
      expect(Math.abs(f.centerAir - k.air * 10)).toBeLessThan(0.05);
    }
    // The sodium label is the doublet's mean.
    const d = ['na1-d1', 'na1-d2'].map(
      id => LINES.find(l => l.id === id).air * 10
    );
    expect(
      Math.abs(
        SPECTRAL_FEATURES.find(f => f.id === 'nad').centerAir -
          (d[0] + d[1]) / 2
      )
    ).toBeLessThan(0.05);
  });
});

describe('the Observatory: reddening in the cluster-fit tool', () => {
  test('its A_g / E(g - r) = 3.245 (Schlafly & Finkbeiner 2011, Fitzpatrick 1999) against CCM89 through the kernel: 3.60, 11 percent higher', () => {
    // The two laws differ. At E(g - r) = 0.1 the difference is 0.035 mag in g, above the
    // curve tool's 0.02 mag tolerance, so the tool keeps its adopted number and the kernel's
    // law is not substituted (RADIATION.md, deviations). The assertion is the measured value.
    const pg = K.pivotWavelength(band('g'));
    const pr = K.pivotWavelength(band('r'));
    const Ag = 3.1 * K.extinctionRatio(pg, 3.1, LAW);
    const Ar = 3.1 * K.extinctionRatio(pr, 3.1, LAW);
    const R = Ag / (Ag - Ar);
    expect(R).toBeGreaterThan(3.55);
    expect(R).toBeLessThan(3.65);
    expect((R - 3.245) * 0.1).toBeGreaterThan(0.02);
  });
  test("its distance modulus is the kernel's: 5 log10(d / 10 pc)", () => {
    expect(K.distanceModulus(1585)).toBeCloseTo(5 * Math.log10(158.5), 12);
  });
});
