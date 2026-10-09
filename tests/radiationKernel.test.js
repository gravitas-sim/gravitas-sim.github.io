// =============================================================================
// The radiation and photometry kernel (Roadmap II, Prompt 82)
// -----------------------------------------------------------------------------
// Every reference value here is either (a) a published number, with the paper or
// table it is printed in, or (b) computed offline by an independent
// implementation (tests/fixtures/radiation/make_reference.py), or (c) an
// identity. Every one has a tolerance and the reason for it, written beside it.
// Tolerances were fixed from the source's own precision and method before the
// kernel was compared with it; where one was changed after a comparison, the line
// says so (RADIATION.md lists every case).
//
// Jest's VM makes float-heavy loops slow (a free Math or Float64Array read goes
// through the context), so the heavy loops are in the kernel and the tests make a
// few dozen calls, not millions.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { Worker } from 'node:worker_threads';
import { pathToFileURL } from 'node:url';

import * as K from '../js/kernels/radiation/index.js';
import { BANDS } from '../js/data/radiation/bandpasses.js';
import { LINES } from '../js/data/radiation/lines.js';
import { LAW as CCM } from '../js/data/radiation/extinction.js';
import { LAW as BC } from '../js/data/radiation/bolometric.js';
import {
  PACK as GAIA_PACK,
  BANDS as GAIA_BANDS,
  ZERO_POINTS as GAIA_ZP,
} from '../js/data/radiation/gaiaBandpasses.js';
import { UNITS, isUnit } from '../js/units/registry.js';

const ROOT = process.cwd();
const fixture = f =>
  JSON.parse(
    readFileSync(path.join(ROOT, 'tests/fixtures/radiation', f), 'utf8')
  );
const REF = fixture('reference.json');
const SED = fixture('sed.json');
const band = id => K.decodeBand(BANDS.find(b => b.id === id));
const near = (actual, expected, tol, what) => {
  const ok = Math.abs(actual - expected) <= tol;
  if (!ok)
    throw new Error(
      `${what}: ${actual} differs from ${expected} by ${actual - expected}, tolerance ${tol}`
    );
};
const rel = (actual, expected, tol, what) =>
  near(actual / expected, 1, tol, what);

describe('the Planck function and its laws', () => {
  test('constants: sigma and both Wien constants from exact h, c, k (CODATA 2018 prints them to 10 digits)', () => {
    // Tolerance 2e-10 relative: CODATA 2018 prints 5.670374419e-8, 2.897771955e-3 and
    // 5.878925757e10; the half-unit of the last printed digit is under 1e-10.
    rel(K.SIGMA_SB, 5.670374419e-8, 2e-10, 'sigma');
    rel(K.WIEN_B_LAMBDA, 2.897771955e-3, 2e-10, 'Wien b');
    rel(K.WIEN_B_NU, 5.878925757e10, 2e-10, "Wien b'");
  });

  test('Planck function against an independent implementation (scipy-era numpy, CODATA constants)', () => {
    // 1e-12 relative: both evaluate the same closed form in double precision; the
    // difference is rounding in expm1 and the powers.
    for (const p of REF.planck) {
      rel(
        K.planckLambda(p.lambdaNm * 1e-9, p.T),
        p.value,
        1e-12,
        `B(${p.lambdaNm} nm, ${p.T} K)`
      );
    }
  });

  test('B_lambda integrated over wavelength is sigma T^4 / pi', () => {
    // 1e-9 relative: Simpson with 4000 log-spaced intervals from 10 nm to 1 cm
    // (the default is 2000; both are converged to 1e-10 or better here), and the part outside is ~1e-12 of the total at 5772 K;
    // the independent reference (adaptive quadrature) agrees to its own 1e-12.
    const T = REF.radianceTotal.T;
    const total = K.bandRadiance(1e-8, 1e-2, T, 4000);
    rel(total, REF.radianceTotal.sigmaT4OverPi, 1e-9, 'analytic');
    rel(total, REF.radianceTotal.value, 1e-9, 'adaptive quadrature');
  });

  test('Wien: the peak of B_lambda and of B_nu are at the stated places, and are not each other', () => {
    // 1e-6 relative: the peak is located by golden-section search to 1e-8 of its
    // value; B is flat at its maximum, so the search is only that precise.
    const peak = (f, lo, hi) => {
      const g = (Math.sqrt(5) - 1) / 2;
      let a = lo;
      let b = hi;
      for (let i = 0; i < 100; i++) {
        const c = b - g * (b - a);
        const d = a + g * (b - a);
        if (f(c) > f(d)) b = d;
        else a = c;
      }
      return (a + b) / 2;
    };
    const T = 5772;
    rel(
      peak(l => K.planckLambda(l, T), 1e-7, 2e-6),
      K.wienPeakLambda(T),
      1e-6,
      'lambda peak'
    );
    rel(
      peak(n => K.planckNu(n, T), 1e13, 1e15),
      K.wienPeakNu(T),
      1e-6,
      'nu peak'
    );
    // Frequency peak is not c over the wavelength peak (the classic mistake): 1.76x apart.
    expect(K.wienPeakNu(T) / (K.C_LIGHT / K.wienPeakLambda(T))).toBeCloseTo(
      0.5683,
      3
    );
    rel(K.temperatureFromPeak(K.wienPeakLambda(T)), T, 1e-14, 'round trip');
  });

  test('IAU 2015 B3 nominal solar values close: L = 4 pi R^2 sigma T^4 (published to four digits)', () => {
    // 1e-4: the nominal L, R and T are given to four significant digits.
    rel(K.luminosity(K.R_SUN_M, K.TEFF_SUN_K), K.L_SUN_W, 1e-4, 'L');
    rel(
      K.effectiveTemperature(K.L_SUN_W, K.R_SUN_M),
      K.TEFF_SUN_K,
      1e-4,
      'Teff'
    );
  });
});

describe('magnitudes, distance, bolometric quantities', () => {
  test('the Sun at 1 AU has a distance modulus of -31.5721 (IAU 2012; Willmer 2018 prints 4 decimals)', () => {
    near(K.AU_DISTANCE_MODULUS, -31.5721, 5e-5, 'm - M');
  });
  test('IAU 2015 B2: the nominal solar luminosity is M_bol = 4.74 (Mamajek et al. 2015)', () => {
    // 5e-4: L0 = 3.0128e28 W is five digits, so M_bol,sun = 4.7400 +- 3e-5; and
    // 4.74 is quoted to two decimals.
    near(K.bolometricMag(K.L_SUN_W), 4.74, 5e-4, 'M_bol');
    rel(
      K.luminosityFromMbol(K.bolometricMag(K.L_SUN_W)),
      K.L_SUN_W,
      1e-14,
      'round trip'
    );
  });
  test('Pogson: 100 in flux is 5 magnitudes; 10 pc is zero modulus; 1 kpc is 10', () => {
    near(K.fluxToMag(100), -5, 1e-14, '100x');
    near(K.distanceModulus(10), 0, 1e-14, '10 pc');
    near(K.distanceModulus(1000), 10, 1e-12, '1 kpc');
    near(
      K.distanceFromModulus(K.distanceModulus(237)),
      237,
      1e-10,
      'round trip'
    );
    near(
      K.absoluteMag(K.apparentMag(4.81, 100, 0.3), 100, 0.3),
      4.81,
      1e-12,
      'absolute round trip'
    );
  });
});

describe('bandpasses and synthetic photometry', () => {
  test('a source flat in f_nu has AB = 0 in every band (the definition)', () => {
    // 1e-12 mag: the integrand is exactly proportional to the denominator.
    for (const b of BANDS)
      near(K.abMag(band(b.id), K.flatFnuSed()), 0, 1e-12, `AB of ${b.id}`);
  });

  test('every band: pivot and mean photon wavelengths lie inside it, pivot between the half-power points', () => {
    for (const b of BANDS) {
      const d = band(b.id);
      const p = K.pivotWavelength(d);
      expect(p).toBeGreaterThan(d.lambdaNm[0]);
      expect(p).toBeLessThan(d.lambdaNm[d.lambdaNm.length - 1]);
      expect(Math.abs(K.meanPhotonWavelength(d) - p) / p).toBeLessThan(0.02);
    }
  });

  test('UBVRI pivot wavelengths reproduce Bessell & Murphy 2012 Table 5 (lambda_p, to 1 A)', () => {
    // 2 A: Table 5 prints whole Angstroms; the trapezoid on a 50-100 A grid adds < 1 A.
    const pub = { U: 3597, B: 4377, V: 5488, R: 6515, I: 7981 };
    for (const [k, v] of Object.entries(pub))
      near(K.pivotWavelength(band(k)) * 10, v, 2, `pivot ${k}`);
  });

  test('blackbody AB magnitudes: the kernel against an independent trapezoid (same convention)', () => {
    // 1e-6 mag: the same arithmetic written independently in numpy; differences are
    // rounding in the Planck function and the sums.
    for (const r of REF.abBlackbody) {
      near(
        K.abMag(band(r.band), K.blackbodySed(r.T)),
        r.value,
        1e-6,
        `${r.band} at ${r.T} K`
      );
    }
  });

  test('blackbody AB magnitudes: the trapezoid against adaptive quadrature of the piecewise-linear response', () => {
    // 1e-4 mag, fixed before it was measured: the kernel integrates at steps of at
    // most 1 nm, and the trapezoid's error on a smooth Planck curve is about
    // (h/lambda)^2 / 12 times the curvature, 1e-6 relative at 1 nm and a few 1e-5
    // mag on the steep Wien side of the hot blackbodies.
    for (const r of REF.abBlackbodyQuad) {
      near(
        K.abMag(band(r.band), K.blackbodySed(r.T)),
        r.value,
        1e-4,
        `${r.band} at ${r.T} K (quad)`
      );
    }
  });

  test('colours of blackbodies are ordered with temperature, and match for AB and Vega up to the offsets', () => {
    const B = band('B');
    const V = band('V');
    let prev = Infinity;
    for (const T of [3000, 4500, 6000, 9000, 15000, 30000]) {
      const c = K.blackbodyColor(T, B, V, 'ab');
      expect(c).toBeLessThan(prev);
      prev = c;
      near(
        K.blackbodyColor(T, B, V, 'vega'),
        c - (B.abMinusVega - V.abMinusVega),
        1e-12,
        'Vega colour'
      );
    }
    // A band with no stated offset has no Vega magnitude, and says so.
    expect(
      K.vegaMag({ ...V, abMinusVega: null }, K.blackbodySed(6000))
    ).toBeNaN();
  });

  test('zero points: the Vega spectrum (CALSPEC alpha_lyr_stis_008) has 0.03 mag in every band, to 0.003', () => {
    // 0.003: the fixture is the spectrum between 290 nm and 2.5 um as the archive
    // gives it, to 6 digits; the pack was built from the whole file.
    const vega = K.sedFromSamples(SED.vega.lambdaNm, SED.vega.fLambda);
    for (const b of BANDS) {
      near(K.vegaMag(band(b.id), vega), 0.03, 0.003, `Vega in ${b.id}`);
    }
  });

  test('zero points: AB - Vega against Willmer 2018 Table 3 (Vega to AB) and Cohen et al. 2003 (2MASS fluxes)', () => {
    // Tolerances as in tools/data-packs/radiation.mjs, which holds the pack to them at
    // build time: 0.01 for every band (Willmer prints three decimals and states a
    // 0.02 mag Vega calibration). The first version held UBVRI to 0.05 because U and B
    // were 0.04 off (0.806 and -0.096): a sampling bug (the spectrum was sampled only
    // at the band's own 50 and 100 A nodes, aliasing the Balmer jump of Vega), found
    // by the physics review and fixed; U is now 0.768 and B -0.133. The numbers
    // below are the published ones, a fixed independent reference.
    const will = {
      U: 0.768,
      B: -0.134,
      V: -0.017,
      R: 0.168,
      I: 0.408,
      J: 0.87,
      H: 1.344,
      Ks: 1.814,
      u: 0.9,
      g: -0.125,
      r: 0.119,
      i: 0.332,
      z: 0.494,
    };
    for (const [k, v] of Object.entries(will)) {
      near(BANDS.find(b => b.id === k).abMinusVega, v, 0.01, `AB - Vega ${k}`);
    }
    const jy = { J: 1594, H: 1024, Ks: 666.7 };
    for (const [k, f] of Object.entries(jy)) {
      near(
        BANDS.find(b => b.id === k).abMinusVega + 0.03,
        2.5 * Math.log10(3631 / f),
        0.02,
        `Cohen ${k}`
      );
    }
  });

  test('aliasing guard: Vega through UBVRI integrated on the band grid against a 1 A grid built here, to 0.003', () => {
    // The kernel refines the band before it integrates. An independent version here:
    // the response linearly interpolated to a 0.1 nm comb, trapezoid, AB zero point
    // 3631 Jy. 0.003 mag, fixed beforehand: the smallest offset difference reported.
    // The same arithmetic on the band's own nodes (not refined) is shown to alias by
    // more than 0.02 mag in U, so the guard is not vacuous.
    const vega = K.sedFromSamples(SED.vega.lambdaNm, SED.vega.fLambda);
    const C = 299792458e9;
    const independent = (b, step) => {
      const l = [];
      const s = [];
      for (let x = b.lambdaNm[0]; x <= b.lambdaNm.at(-1) + 1e-9; x += step) {
        let i = 0;
        while (i < b.lambdaNm.length - 2 && b.lambdaNm[i + 1] <= x) i++;
        const t = (x - b.lambdaNm[i]) / (b.lambdaNm[i + 1] - b.lambdaNm[i]);
        l.push(x);
        s.push(b.s[i] + t * (b.s[i + 1] - b.s[i]));
      }
      let num = 0;
      let den = 0;
      for (let i = 1; i < l.length; i++) {
        const w = l[i] - l[i - 1];
        num +=
          0.5 *
          w *
          (vega(l[i]) * s[i] * l[i] + vega(l[i - 1]) * s[i - 1] * l[i - 1]);
        den += 0.5 * w * (s[i] / l[i] + s[i - 1] / l[i - 1]);
      }
      return -2.5 * Math.log10(num / (C * den) / 1e-26 / 3631);
    };
    let nodesU = 0;
    for (const id of ['U', 'B', 'V', 'R', 'I']) {
      const b = band(id);
      near(K.abMag(b, vega), independent(b, 0.1), 0.003, `Vega ${id}`);
      if (id === 'U') {
        // On the band's own nodes: step = the grid step, no refinement.
        nodesU = independent(b, b.lambdaNm[1] - b.lambdaNm[0]);
        expect(Math.abs(nodesU - independent(b, 0.1))).toBeGreaterThan(0.02);
      }
    }
  });

  test('the Sun: absolute AB magnitudes against Willmer 2018 Table 3 (CALSPEC sun_reference_stis_002 against his composite)', () => {
    // 0.07 mag: Willmer states the colours of his composite against solar analogs to
    // 0.03 and the Vega calibration to 0.02, and his composite and the 1990s
    // HST reference spectrum differ at the few-percent level in the infrared (he
    // compares four published solar SEDs that differ by up to 5 percent, 0.05 mag).
    const sun = K.sedFromSamples(SED.sun.lambdaNm, SED.sun.fLambda);
    const pub = {
      B: 5.33,
      V: 4.81,
      R: 4.61,
      I: 4.52,
      u: 6.39,
      g: 5.11,
      r: 4.65,
      i: 4.53,
      z: 4.5,
      J: 4.54,
      H: 4.66,
      Ks: 5.08,
    };
    // Willmer's Bessell Murphy rows for UBVRI; his SDSS and 2MASS rows for the rest.
    const bm = { B: 5.33, V: 4.81, R: 4.61, I: 4.52 };
    for (const [k, v] of Object.entries({ ...pub, ...bm })) {
      near(
        K.abMag(band(k), sun) - K.AU_DISTANCE_MODULUS,
        v,
        0.07,
        `M_AB(sun) in ${k}`
      );
    }
  });
});

describe('extinction', () => {
  test('CCM89 Table 3: A/A_V at R_V = 3.1, eight standard filters (U ... K), against the paper', () => {
    // Per filter, with reasons (tools/data-packs/radiation.mjs holds the same): 0.003,
    // three units of the last digit of a table printed to 3 decimals from coefficients
    // printed to 4. B alone gets 0.015: Table 3 is the passband fit the optical
    // polynomial was fitted to, and the polynomial has a +0.05 hump between B and U that
    // the fit does not follow, so at x = 2.27 it departs from the printed 1.337 by
    // 0.014. The flat 0.015 of the first version was set after a first comparison and
    // was too loose for the seven others; that is disclosed in the PR.
    const table = [
      ['U', 2.78, 1.569],
      ['B', 2.27, 1.337],
      ['V', 1.82, 1.0],
      ['R', 1.43, 0.751],
      ['I', 1.11, 0.479],
      ['J', 0.8, 0.282],
      ['H', 0.63, 0.19],
      ['K', 0.46, 0.114],
    ];
    for (const [f, x, a] of table)
      near(
        K.extinctionRatio(1000 / x, 3.1, CCM),
        a,
        f === 'B' ? 0.015 : 0.003,
        `A(${f})/A(V)`
      );
  });
  test('CCM89 eqs. 2 to 4 against an independent transcription, exact to 1e-12, and A_B/A_V = 1 + 1/R_V at x = 2.27', () => {
    // 1e-12: the same closed form written again from the paper, rounding only.
    const ccm = (x, Rv) => {
      let a;
      let b;
      if (x < 1.1) {
        a = 0.574 * x ** 1.61;
        b = -0.527 * x ** 1.61;
      } else if (x <= 3.3) {
        const y = x - 1.82;
        a =
          1 +
          0.17699 * y -
          0.50447 * y ** 2 -
          0.02427 * y ** 3 +
          0.72085 * y ** 4 +
          0.01979 * y ** 5 -
          0.7753 * y ** 6 +
          0.32999 * y ** 7;
        b =
          1.41338 * y +
          2.28305 * y ** 2 +
          1.07233 * y ** 3 -
          5.38434 * y ** 4 -
          0.62251 * y ** 5 +
          5.3026 * y ** 6 -
          2.09002 * y ** 7;
      } else {
        let fa = 0;
        let fb = 0;
        if (x >= 5.9) {
          const d = x - 5.9;
          fa = -0.04473 * d * d - 0.009779 * d ** 3;
          fb = 0.213 * d * d + 0.1207 * d ** 3;
        }
        a = 1.752 - 0.316 * x - 0.104 / ((x - 4.67) ** 2 + 0.341) + fa;
        b = -3.09 + 1.825 * x + 1.206 / ((x - 4.62) ** 2 + 0.263) + fb;
      }
      return a + b / Rv;
    };
    for (let x = 0.3; x <= 8; x += 0.1)
      for (const Rv of [2.5, 3.1, 5])
        near(
          K.extinctionRatio(1000 / x, Rv, CCM),
          ccm(x, Rv),
          1e-12,
          `x ${x} R_V ${Rv}`
        );
    // E(B-V) = A_B - A_V by definition, so A_B/A_V = 1 + 1/R_V where B is. 0.002,
    // fixed beforehand: the polynomial was fitted to data that obey it to a few 1e-3.
    for (const Rv of [2.5, 3.1, 5])
      near(
        K.extinctionRatio(1000 / 2.27, Rv, CCM),
        1 + 1 / Rv,
        0.002,
        `A_B/A_V at R_V ${Rv}`
      );
  });
  test('the law is continuous at its joins, is 1 at V for every R_V, and refuses to extrapolate', () => {
    for (const x of [1.1, 3.3, 5.9]) {
      // 1e-2: the three CCM89 branches are not constrained to meet (eq. 3 is a fit); the
      // published joins are within 0.01 in a and b.
      near(
        K.ccmCoefficients(x - 1e-9, CCM).a,
        K.ccmCoefficients(x + 1e-9, CCM).a,
        1e-2,
        `a at ${x}`
      );
    }
    // At V (x = 1.82) a = 1 and b = 0 whatever R_V is; 549.45 nm is x = 1.82 exactly.
    for (const Rv of [2.5, 3.1, 5])
      near(
        K.extinctionRatio(1000 / 1.82, Rv, CCM),
        1,
        1e-9,
        `A_V/A_V at R_V ${Rv}`
      );
    near(K.extinctionRatio(550.0, 3.1, CCM), 1.0, 2e-3, 'A_V/A_V at 550 nm');
    expect(K.extinctionRatio(4000, 3.1, CCM)).toBeNaN();
    expect(K.extinctionRatio(100, 3.1, CCM)).toBeNaN();
    // E(B-V) = 1 at R_V = 3.1 dims the V band by 3.1 mag, to the law's own 1.0 at V.
    near(K.extinctionMag(1000 / 1.82, 1, 3.1, CCM), 3.1, 1e-9, 'A_V');
  });
});

describe('bolometric corrections', () => {
  test('BC_V of the Sun on the Flower scale is -0.080 (Torres 2010, section 3), within 0.001', () => {
    near(K.bolometricCorrectionV(5777, BC), -0.08, 0.001, 'BC_V,sun');
  });
  test('the three fits join to within 0.03 mag, and the range is not extrapolated', () => {
    // 0.03: not constrained to meet; the published steps are 0.022 at log T = 3.70 and 0.003 at 3.90.
    for (const lt of [3.7, 3.9]) {
      near(
        K.bolometricCorrectionV(10 ** (lt - 1e-9), BC),
        K.bolometricCorrectionV(10 ** (lt + 1e-9), BC),
        0.03,
        `join ${lt}`
      );
    }
    expect(K.bolometricCorrectionV(3000, BC)).toBeNaN();
    // 3500 to 4000 K is inside the polynomial's range but below the pack's reliableAboveK.
    expect(K.bolometricCorrectionV(3700, BC)).toBeNaN();
    expect(
      Number.isFinite(
        K.bolometricCorrectionV(3700, BC, { allowUnreliable: true })
      )
    ).toBe(true);
    expect(K.absoluteVFromLuminosity(0.05, 3700, BC)).toBeNaN();
    expect(Number.isFinite(K.bolometricCorrectionV(4000, BC))).toBe(true);
    expect(K.bolometricCorrectionV(60000, BC)).toBeNaN();
  });
  test("anchored on the Sun, a solar twin has the Sun's absolute V magnitude (4.812 from V_sun = -26.76)", () => {
    // 1e-4: the polynomial gives -0.0801 at 5777 K where the paper quotes -0.080 (three decimals).
    near(
      K.absoluteVFromLuminosity(1, 5777, BC),
      -26.76 - K.AU_DISTANCE_MODULUS,
      1e-4,
      'M_V of a solar twin'
    );
  });
  test('for the IAU M_bol,sun = 4.74 the Flower scale implies BC_V,sun = -0.072, not -0.080 (the 0.7 percent the pack documents)', () => {
    near(
      K.M_BOL_SUN - (BC.solar.vSun - K.AU_DISTANCE_MODULUS),
      -0.072,
      0.001,
      'implied BC_V,sun'
    );
  });
});

describe('Doppler shift, redshift and air and vacuum', () => {
  test('the relativistic form: v = 0.6 c is z = 1 exactly, and the two forms agree to the stated order', () => {
    const c = K.C_LIGHT / 1000;
    near(K.zFromVelocity(0.6 * c), 1, 1e-14, 'z at 0.6c');
    near(K.velocityFromZ(1), 0.6 * c, 1e-8, 'v at z = 1');
    // z_rel - z_classical = beta^2 / 2 to leading order (the series of sqrt((1+b)/(1-b))):
    // relative 1e-3 at beta = 1e-3, where the next term is of order beta.
    const v = 0.001 * c;
    rel(
      (K.zFromVelocity(v) - K.zFromVelocityClassical(v)) / (0.5 * 1e-6),
      1,
      2e-3,
      'second-order term'
    );
    expect(K.classicalError(300)).toBeLessThan(1e-3); // a star's: beta/2 = 5e-4 of z, 5e-7 in z
    expect(K.classicalError(0.1 * c)).toBeGreaterThan(0.04); // not a galaxy at z = 0.1
    for (const v2 of [-5000, -30, 0.001, 30, 5000, 90000])
      near(
        K.velocityFromZ(K.zFromVelocity(v2)),
        v2,
        1e-8 * Math.max(1, Math.abs(v2)),
        'round trip'
      );
    near(
      K.zTransverse(0.6 * c),
      0.25,
      1e-14,
      'transverse gamma at 0.6c is 1.25'
    );
    near(
      K.velocityFromWavelengths(656.28 * (1 + 100 / c), 656.28, 'classical'),
      100,
      1e-9,
      'H-alpha 100 km/s'
    );
  });

  test('air to vacuum (Morton 2000) against NIST level energies: Na D2, 5889.95095 A observed in air', () => {
    // 0.002 A: NIST gives the lower level 0 and the upper 16973.36619 cm^-1 (3s 2S1/2 to
    // 3p 2P3/2), so vacuum is 1e8 / 16973.36619 = 5891.583 A, good to 1e-5 A; the pack's
    // own check holds all fifteen non-hydrogen lines with observed wavelengths to 0.02 A and
    // they agree to under 0.004.
    near(K.airToVacuumNm(588.995095) * 10, 1e8 / 16973.36619, 0.002, 'Na D2');
    // Standard air, 200 nm to 2 um: no number outside.
    for (const x of [150, 199.9, 2000.1, 5000, NaN]) {
      expect(K.airToVacuumNm(x)).toBeNaN();
      expect(K.vacuumToAirNm(x)).toBeNaN();
    }
    expect(Number.isFinite(K.airToVacuumNm(200))).toBe(true);
    expect(Number.isFinite(K.airToVacuumNm(2000))).toBe(true);
    // 1e-5 nm (1e-4 A): vacuumToAirNm evaluates the index at the vacuum wavelength, as its comment says.
    near(K.vacuumToAirNm(K.airToVacuumNm(500)), 500, 1e-5, 'round trip');
  });

  test("every line of the pack: vacuum above air, and the formula agrees with NIST (the pack's own check, repeated)", () => {
    for (const l of LINES) {
      expect(l.vacuum).toBeGreaterThan(l.air);
      if (l.observed && !l.vacuumFromFormula)
        near(K.airToVacuumNm(l.air) * 10, l.vacuum * 10, 0.02, l.id);
      if (l.vacuumFromFormula)
        near(
          K.airToVacuumNm(l.air),
          l.vacuum,
          1e-4,
          `${l.id} (hydrogen, from the formula)`
        );
    }
  });

  test('line identification: H-alpha at z = 0.01 in air and in vacuum, Na D doublet resolved, no match elsewhere', () => {
    const ha = LINES.find(l => l.id === 'h-alpha');
    const hit = K.identifyLines(ha.air * 1.01, LINES, {
      z: 0.01,
      medium: 'air',
      toleranceNm: 0.05,
    });
    expect(hit[0].line.id).toBe('h-alpha');
    const hv = K.identifyLines(ha.vacuum * 1.01, LINES, {
      z: 0.01,
      medium: 'vacuum',
      toleranceNm: 0.05,
    });
    expect(hv[0].line.id).toBe('h-alpha');
    // The same observed number in the wrong medium misses by 0.18 nm: it is the point of saying which.
    expect(
      K.identifyLines(ha.vacuum, LINES, { medium: 'air', toleranceNm: 0.05 })
    ).toHaveLength(0);
    expect(K.identifyLines(589.0, LINES, { toleranceNm: 0.2 })[0].line.id).toBe(
      'na1-d2'
    );
    expect(K.identifyLines(589.6, LINES, { toleranceNm: 0.2 })[0].line.id).toBe(
      'na1-d1'
    );
    expect(K.identifyLines(560, LINES, { toleranceNm: 0.5 })).toHaveLength(0);
  });
});

describe('units through the registry', () => {
  test('flux density conversions round-trip, and agree with the registry within a dimension', () => {
    // Within a dimension the registry is the authority; across, f_nu = f_lambda lambda^2 / c.
    near(
      K.convertFlux(1, 'W/m2/nm', 'erg/s/cm2/Angstrom'),
      100,
      1e-12,
      'W/m2/nm to erg'
    );
    near(K.convertFlux(1, 'Jy', 'mJy'), 1000, 1e-12, 'Jy to mJy');
    // 3631 Jy at 550 nm is 3.631e-9 erg s^-1 cm^-2 A^-1 x (lambda-dependent): the standard flat-f_nu value.
    rel(
      K.convertFlux(3631, 'Jy', 'erg/s/cm2/Angstrom', 550),
      ((3.631e-20 * 3e18) / 550 ** 2) * 1 * 0 +
        (3631e-23 * 2.99792458e18) / 5500 ** 2,
      1e-9,
      'Jy to f_lambda'
    );
    for (const [from, to, lam] of [
      ['Jy', 'W/m2/nm', 500],
      ['W/m2/nm', 'Jy', 500],
      ['erg/s/cm2/Angstrom', 'mJy', 656.3],
      ['mJy', 'erg/s/cm2/Angstrom', 1650],
    ]) {
      rel(
        K.convertFlux(K.convertFlux(1.234, from, to, lam), to, from, lam),
        1.234,
        1e-12,
        `${from} to ${to} and back`
      );
    }
    expect(K.convertFlux(1, 'Jy', 'W/m2/nm')).toBeNaN(); // crossing needs a wavelength
    expect(K.convertFlux(1, 'mag', 'Jy', 500)).toBeNaN(); // a magnitude is not a flux
    expect(K.convertFlux(1, 'm', 'Jy', 500)).toBeNaN();
  });
  test('every unit a pack names is a registry unit', () => {
    for (const u of ['nm', 'mag', 'K', 'Angstrom', ''])
      expect(isUnit(u)).toBe(true);
    expect(UNITS.Jy.dim).toBe('flux-per-frequency');
  });
});

describe('the kernel is pure: no DOM, Worker-importable', () => {
  const dir = path.join(ROOT, 'js/kernels/radiation');
  test('no module touches the DOM, storage, timers or the network', () => {
    for (const f of readdirSync(dir)) {
      const src = readFileSync(path.join(dir, f), 'utf8').replace(
        /\/\/.*$/gm,
        ''
      );
      expect({
        f,
        hit: /\b(document|window|navigator|localStorage|sessionStorage|fetch|XMLHttpRequest|setTimeout|requestAnimationFrame)\b/.exec(
          src
        )?.[0],
      }).toEqual({ f, hit: undefined });
    }
  });
  test('the only imports are the kernel, and the unit registry (and the lazy loaders)', () => {
    for (const f of readdirSync(dir)) {
      const src = readFileSync(path.join(dir, f), 'utf8');
      for (const m of src.matchAll(/(?:from|import\()\s*'([^']+)'/g)) {
        expect({ f, to: m[1] }).toEqual({
          f,
          to: expect.stringMatching(
            /^(\.\/[a-z]+\.js|\.\.\/\.\.\/units\/registry\.js|\.\.\/\.\.\/data\/radiation\/[A-Za-z]+\.js)$/
          ),
        });
      }
    }
  });
  test('a Worker imports the kernel and computes a magnitude', async () => {
    const url = pathToFileURL(path.join(dir, 'index.js')).href;
    const code = `import(${JSON.stringify(url)}).then(K => { const {parentPort} = require('node:worker_threads'); parentPort.postMessage({ sigma: K.SIGMA_SB, mu: K.distanceModulus(1000), ab: K.fluxToMag(3631, 3631) }); });`;
    const out = await new Promise((resolve, reject) => {
      const w = new Worker(code, { eval: true });
      w.once('message', resolve);
      w.once('error', reject);
    });
    near(out.sigma, K.SIGMA_SB, 0, 'sigma in a Worker');
    near(out.mu, 10, 1e-12, 'modulus in a Worker');
    near(out.ab, 0, 0, 'AB zero in a Worker');
  });
});

// =============================================================================
// The Gaia passbands: the one pack under a non-commercial licence
// -----------------------------------------------------------------------------
// Published numbers are Riello et al. 2021, A&A 649, A3, Table 3. Tolerances were
// written into tools/data-packs/radiation.mjs before the pack was built, and are
// repeated here with their reasons.
// =============================================================================

describe('Gaia G, G_BP and G_RP (radiation-gaia-bandpasses)', () => {
  const gb = id => K.decodeBand(GAIA_BANDS.find(b => b.id === id));
  const T3 = {
    pivot: { G: 621.79, G_BP: 510.97, G_RP: 776.91 },
    mean: { G: 639.07, G_BP: 518.26, G_RP: 782.51 },
    vega: { G: 25.6874, G_BP: 25.3385, G_RP: 24.7479 },
    ab: { G: 25.801, G_BP: 25.354, G_RP: 25.104 },
  };
  const manifest = JSON.parse(
    readFileSync(
      path.join(ROOT, 'data-packs/radiation-gaia-bandpasses.json'),
      'utf8'
    )
  );

  test('pivot and mean photon wavelengths reproduce Table 3 to 0.1 nm (the table prints 0.01; the quadrature is unstated)', () => {
    for (const id of ['G', 'G_BP', 'G_RP']) {
      near(K.pivotWavelength(gb(id)), T3.pivot[id], 0.1, `pivot ${id}`);
      near(K.meanPhotonWavelength(gb(id)), T3.mean[id], 0.1, `mean ${id}`);
    }
  });

  test('AB - Vega is the published AB zero point minus the VEGAMAG one, to 1.5e-4 mag (two 4-decimal roundings)', () => {
    for (const id of ['G', 'G_BP', 'G_RP']) {
      const b = GAIA_BANDS.find(x => x.id === id);
      near(b.abMinusVega, T3.ab[id] - T3.vega[id], 1.5e-4, `AB-Vega ${id}`);
      near(GAIA_ZP.vegamag[id], T3.vega[id], 5e-5, `ZP Vega ${id}`);
      near(GAIA_ZP.ab[id], T3.ab[id], 5e-5, `ZP AB ${id}`);
    }
    // The values the task and the paper quote.
    expect(GAIA_BANDS.map(b => b.abMinusVega)).toEqual([
      0.1137, 0.0154, 0.3561,
    ]);
  });

  test('a flat-f_nu source has AB = 0 and Vega-system magnitude equal to the offset (the definition)', () => {
    for (const id of ['G', 'G_BP', 'G_RP']) {
      near(K.abMag(gb(id), K.flatFnuSed()), 0, 1e-12, `AB of ${id}`);
      near(
        K.vegaMag(gb(id), K.flatFnuSed()),
        -GAIA_BANDS.find(b => b.id === id).abMinusVega,
        1e-12,
        `Vega mag of ${id}`
      );
    }
  });

  test('the Sun: a 5772 K blackbody has G_BP - G_RP = 0.82 +- 0.06 on the Vega scale (the real Sun; blanketing is the 0.06)', () => {
    // Casagrande & VandenBerg 2018, Table 1: 0.815-0.828 for the real Sun with the DR2
    // passbands. A Planck curve keeps blue light a real G dwarf's lines absorb, so the
    // tolerance is 0.06 mag, fixed before the colour was computed.
    const c = K.blackbodyColor(5772, gb('G_BP'), gb('G_RP'), 'vega');
    near(c, 0.82, 0.06, 'G_BP - G_RP of a 5772 K blackbody');
  });

  test('colours order with temperature, and a hot star is blue in every Gaia colour', () => {
    let prev = -Infinity;
    for (const T of [30000, 10000, 6000, 4000, 3000]) {
      const c = K.blackbodyColor(T, gb('G_BP'), gb('G_RP'), 'vega');
      expect(c).toBeGreaterThan(prev);
      prev = c;
    }
    expect(K.blackbodyColor(30000, gb('G_BP'), gb('G'), 'vega')).toBeLessThan(
      0
    );
    expect(K.blackbodyColor(3000, gb('G'), gb('G_RP'), 'vega')).toBeGreaterThan(
      0.5
    );
  });

  test('the bands order by wavelength, and G is the widest', () => {
    const p = id => K.pivotWavelength(gb(id));
    expect(p('G_BP')).toBeLessThan(p('G'));
    expect(p('G')).toBeLessThan(p('G_RP'));
    for (const id of ['G', 'G_BP', 'G_RP']) {
      const d = gb(id);
      expect(Math.max(...d.s)).toBe(1);
    }
  });

  test('licence: the manifest and the runtime copy carry the non-commercial status, statement, basis and credit', () => {
    const lic = manifest.license;
    expect(lic.status).toBe('cc-by-nc-3.0-igo');
    expect(lic.nonCommercial).toBe(true);
    expect(lic.statement).toMatch(/CC BY-NC 3\.0 IGO/);
    expect(lic.statement).toMatch(
      /https:\/\/www\.cosmos\.esa\.int\/web\/gaia-users\/license/
    );
    expect(lic.statement).toMatch(/read 2026-10-09/);
    expect(lic.basis.length).toBeGreaterThan(200);
    expect(manifest.credit).toMatch(/ESA\/Gaia\/DPAC/);
    expect(manifest.credit).toMatch(/NON-COMMERCIAL/);
    expect(manifest.source.acknowledgement).toMatch(/non-commercial/i);
    // What an interface reads is the manifest's licence, whole.
    expect(GAIA_PACK.license).toEqual(lic);
    expect(GAIA_PACK.credit).toBe(manifest.credit);
    expect(GAIA_PACK.id).toBe('radiation-gaia-bandpasses');
  });

  test('licence: no other pack is under a non-commercial status, and the bandpass pack does not hold Gaia', () => {
    const dir2 = path.join(ROOT, 'data-packs');
    const nc = readdirSync(dir2)
      .filter(f => f.endsWith('.json'))
      .map(f => JSON.parse(readFileSync(path.join(dir2, f), 'utf8')))
      .filter(m => m.license?.status === 'cc-by-nc-3.0-igo')
      .map(m => m.id);
    expect(nc).toEqual(['radiation-gaia-bandpasses']);
    expect(BANDS.map(b => b.id)).not.toContain('G_BP');
    expect(BANDS.map(b => b.id)).not.toContain('G');
  });

  test('provenance: the raw files are pinned, the response is photon-counting and the version is stated', () => {
    expect(manifest.raw.map(r => r.file)).toEqual([
      'cds-gaia-edr3-passband.dat',
      'cds-gaia-edr3-zeropt.dat',
      'cds-gaia-edr3-readme.txt',
      'calspec-alpha-lyr-stis-008.fits',
    ]);
    expect(manifest.raw[0].sha256).toBe(
      '46160d3b84dc0b78530d1ef3d18c0cf632fdaeb27876c0773c7a62033127f301'
    );
    expect(manifest.raw[1].sha256).toBe(
      '6370f5f9efe1d6c87b8922dea41ecd7e97e981d5dc2ad0f01f24f33f8044cec9'
    );
    expect(manifest.assumptions.join(' ')).toMatch(/photon-counting/);
    expect(manifest.assumptions.join(' ')).toMatch(/EDR3/);
  });
});
