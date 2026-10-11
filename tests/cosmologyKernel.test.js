// =============================================================================
// The FLRW kernel (Roadmap II, Prompt 91), held to astropy, to quadrature, to
// closed forms and to a 60-digit evaluation
// -----------------------------------------------------------------------------
// The bars are the ones COSMOLOGY_GATE.md fixed before any code existed
// (spike/cosmo/THRESHOLDS.md, 60b985b7):
//   - 1e-6 against astropy 6.0.1 (Tcmb0 = 0), five quantities, 900 grid points;
//   - 1e-9 against SciPy QUADPACK at epsrel 1e-13 on the defining integrals;
//   - 1e-12 for the Einstein-de Sitter comoving distance, 1e-10 for the flat
//     Lambda-CDM lookback closed form, 1e-14 for D_L = (1+z) D_M;
//   - the open matter-only family's identity (Mattig's closed form), restated
//     against a 60-digit evaluation at the same 1e-10 bar (D-COSMO-10): the
//     double-precision closed form is itself 1.5e-10 from the exact value at
//     Om = 0.05, z = 0.001, which is the formula's cancellation and not the
//     kernel's error.
// tests/fixtures/cosmology-refs.json holds the 900 reference rows (302 KB; it is
// read by this suite and by no runtime chunk).
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import {
  createCosmology,
  closedForms,
  ClosedModelError,
  C_KMS,
  wedgePoint,
  wedgeInverse,
} from '../js/kernels/cosmology/index.js';

const refs = JSON.parse(
  readFileSync(
    new URL('./fixtures/cosmology-refs.json', import.meta.url),
    'utf8'
  )
);
const rel = (a, b) => Math.abs(a - b) / Math.abs(b);
const KEYS = [
  ['dc', 'comovingDistance'],
  ['dm', 'transverseComovingDistance'],
  ['dl', 'luminosityDistance'],
  ['da', 'angularDiameterDistance'],
  ['lb', 'lookbackTime'],
];

describe('against the references', () => {
  test('the grid is the 900 points the gate fixed', () => {
    expect(refs.rows).toHaveLength(900);
    expect(refs.versions.astropy).toBe('6.0.1');
  });

  test('every quantity at every point is within 1e-6 of astropy and 1e-9 of quadrature', () => {
    let worstAstropy = 0;
    let worstQuad = 0;
    for (const r of refs.rows) {
      const c = createCosmology({ H0: r.H0, Om: r.Om, OL: r.OL });
      for (const [k, fn] of KEYS) {
        const v = c[fn](r.z);
        worstAstropy = Math.max(worstAstropy, rel(v, r.astropy[k]));
        worstQuad = Math.max(worstQuad, rel(v, r.quad[k]));
      }
    }
    expect(worstAstropy).toBeLessThan(1e-6);
    expect(worstQuad).toBeLessThan(1e-9);
    // Measured 1.8e-12 and 9e-16 in the gate; a regression to the bars is a defect.
    expect(worstAstropy).toBeLessThan(1e-10);
    expect(worstQuad).toBeLessThan(1e-13);
  });

  test('the three families are all on the grid', () => {
    const fams = new Set(refs.rows.map(r => r.family));
    expect([...fams].sort()).toEqual(['flat', 'open-lambda', 'open-matter']);
  });

  test('radiation neglected: at most 0.5% in D_L up to z = 5 against astropy with the CMB on', () => {
    let worst5 = 0;
    for (const r of refs.radiation)
      if (r.z <= 5) worst5 = Math.max(worst5, Math.abs(r.relErrDL));
    expect(worst5).toBeLessThan(0.005);
    const at10 = Math.max(
      ...refs.radiation.filter(r => r.z === 10).map(r => Math.abs(r.relErrDL))
    );
    expect(at10).toBeGreaterThan(0.005); // the reason the teaching range stops at 5
  });
});

describe('identities', () => {
  const H0s = [50, 70, 90];
  const Oms = [0.05, 0.1, 0.3, 0.5, 0.9];

  test('Einstein-de Sitter comoving distance, 1e-12', () => {
    let worst = 0;
    for (const h0 of H0s)
      for (const z of refs.grid.z)
        worst = Math.max(
          worst,
          rel(
            createCosmology({ H0: h0, Om: 1, OL: 0 }).comovingDistance(z),
            closedForms.edsComoving(h0, z)
          )
        );
    expect(worst).toBeLessThan(1e-12);
  });

  test('flat Lambda-CDM lookback time closed form, 1e-10', () => {
    let worst = 0;
    for (const h0 of H0s)
      for (const om of Oms)
        for (const z of refs.grid.z)
          worst = Math.max(
            worst,
            rel(
              createCosmology({ H0: h0, Om: om, OL: 1 - om }).lookbackTime(z),
              closedForms.flatLambdaLookback(h0, om, z)
            )
          );
    expect(worst).toBeLessThan(1e-10);
  });

  test('D_L = (1+z) D_M and D_A = D_M/(1+z), 1e-14', () => {
    let worst = 0;
    for (const om of Oms) {
      const c = createCosmology({ H0: 70, Om: om, OL: (1 - om) / 2 });
      for (const z of refs.grid.z)
        worst = Math.max(
          worst,
          rel(
            c.luminosityDistance(z),
            (1 + z) * c.transverseComovingDistance(z)
          ),
          rel(
            c.angularDiameterDistance(z),
            c.transverseComovingDistance(z) / (1 + z)
          )
        );
    }
    expect(worst).toBeLessThan(1e-14);
  });

  test('the age: the Einstein-de Sitter 2/3 and the flat Lambda-CDM closed form', () => {
    const g = 977.7922216807892; // Gyr per (1/H0) at H0 = 1, from the kernel's own constants
    const eds = createCosmology({ H0: 70, Om: 1, OL: 0 }).age();
    expect(rel(eds, ((2 / 3) * g) / 70)).toBeLessThan(1e-12);
    for (const om of [0.1, 0.3, 0.7])
      expect(
        rel(
          createCosmology({ H0: 70, Om: om, OL: 1 - om }).age(),
          closedForms.flatLambdaAge(70, om)
        )
      ).toBeLessThan(1e-10);
    // The age is the lookback time to infinity: it exceeds the lookback to z = 1000.
    const c = createCosmology({ H0: 70, Om: 0.3, OL: 0.7 });
    expect(c.age()).toBeGreaterThan(c.lookbackTime(1000));
    expect(c.age() - c.lookbackTime(1000)).toBeLessThan(0.01);
    // The flat 0.3/0.7, H0 = 70 universe is 13.47 Gyr old (textbook, 13.5).
    expect(c.age()).toBeGreaterThan(13.4);
    expect(c.age()).toBeLessThan(13.55);
    expect(() => createCosmology({ H0: 70, Om: 0, OL: 1 }).age()).toThrow(
      RangeError
    );
  });

  test('low redshift is Hubble law: D_L -> cz/H0, with q0 correction', () => {
    const c = createCosmology({ H0: 70, Om: 0.3, OL: 0.7 });
    const z = 1e-4;
    expect(rel(c.luminosityDistance(z), (C_KMS * z) / 70)).toBeLessThan(1e-4);
    // D_L = (cz/H0) [1 + (1 - q0) z / 2], q0 = Om/2 - OL = -0.55
    const q0 = 0.15 - 0.7;
    const z2 = 0.01;
    const series = ((C_KMS * z2) / 70) * (1 + ((1 - q0) * z2) / 2);
    expect(rel(c.luminosityDistance(z2), series)).toBeLessThan(2e-4);
  });

  test('the distance modulus is 5 log10(D_L / 10 pc)', () => {
    const c = createCosmology({ H0: 70, Om: 0.3, OL: 0.7 });
    expect(c.distanceModulus(0.5)).toBeCloseTo(
      5 * Math.log10(c.luminosityDistance(0.5) * 1e6) - 5,
      12
    );
  });
});

// A 60-digit evaluation of Mattig's formula in BigInt fixed point, so the open
// matter-only family is checked against something that does not cancel.
const SCALE = 10n ** 80n;
const fix = s => {
  const [i, f = ''] = String(s).split('.');
  return BigInt(i + f.padEnd(80, '0').slice(0, 80));
};
const mul = (a, b) => (a * b) / SCALE;
const div = (a, b) => (a * SCALE) / b;
const sqrt = a => {
  // Newton on the integer a * SCALE
  const n = a * SCALE;
  let x = BigInt(Math.floor(Math.sqrt(Number(a) / 1e80) * 1e40)) * 10n ** 40n;
  for (let i = 0; i < 60; i++) x = (x + n / x) / 2n;
  return x;
};
function mattigExact(H0, Om, z) {
  const om = fix(Om);
  const zz = fix(z);
  const one = SCALE;
  const root = sqrt(one + mul(om, zz));
  const bracket = mul(om, zz) + mul(om - 2n * one, root - one);
  return (
    (div(div(2n * fix('299792.458'), fix(H0)), mul(om, om)) * bracket) / SCALE
  );
}

describe('the open matter-only family against a 60-digit Mattig evaluation (D-COSMO-10)', () => {
  const pts = [];
  for (const h0 of [50, 70, 90])
    for (const om of [0.05, 0.1, 0.3, 0.5, 0.9])
      for (const z of [0.001, 0.01, 0.05, 0.1, 0.3, 0.5, 1, 1.5, 2, 3, 5, 10])
        pts.push([h0, om, z]);
  const exact = pts.map(([h, o, z]) => Number(mattigExact(h, o, z)) / 1e80);

  test('the 60-digit evaluation is itself sound: it reproduces the closed form where that does not cancel', () => {
    pts.forEach(([h, o, z], i) => {
      if (o * z > 0.1)
        expect(
          rel(exact[i], closedForms.mattigLuminosity(h, o, z))
        ).toBeLessThan(1e-12);
    });
    // Einstein-de Sitter limit of Mattig: D_L -> 2c/H0 (1+z)(1 - 1/sqrt(1+z)).
    const eds = mattigExact(70, '1', 1);
    expect(
      rel(Number(eds) / 1e80, ((2 * C_KMS) / 70) * 2 * (1 - 1 / Math.SQRT2))
    ).toBeLessThan(1e-13);
  });

  test('the kernel is within the gate bar of the exact value at all 180 points; in fact within 1e-14', () => {
    let worst = 0;
    pts.forEach(([h, o, z], i) => {
      worst = Math.max(
        worst,
        rel(
          createCosmology({ H0: h, Om: o, OL: 0 }).luminosityDistance(z),
          exact[i]
        )
      );
    });
    expect(worst).toBeLessThan(1e-10);
    expect(worst).toBeLessThan(1e-14);
  });

  test('why the double-precision closed form was not the reference: it is 1e-10 off at small Om z', () => {
    const i = pts.findIndex(
      p => p[0] === 50 && p[1] === 0.05 && p[2] === 0.001
    );
    const e = rel(closedForms.mattigLuminosity(50, 0.05, 0.001), exact[i]);
    expect(e).toBeGreaterThan(1e-10);
    expect(e).toBeLessThan(1e-9);
  });
});

describe('refusals and validation', () => {
  test('a closed universe is refused by name', () => {
    expect(() => createCosmology({ H0: 70, Om: 0.5, OL: 0.7 })).toThrow(
      ClosedModelError
    );
    expect(() => createCosmology({ H0: 70, Om: 0.3, OL: 0.7 })).not.toThrow();
  });
  test('nonsense parameters are refused', () => {
    expect(() => createCosmology({ H0: 0, Om: 0.3, OL: 0.7 })).toThrow(
      RangeError
    );
    expect(() => createCosmology({ H0: 70, Om: -0.1, OL: 0.7 })).toThrow(
      RangeError
    );
    expect(() => createCosmology({ H0: 70, Om: 0.3, OL: NaN })).toThrow(
      RangeError
    );
  });
  test('zero redshift is zero distance', () => {
    const c = createCosmology({ H0: 70, Om: 0.3, OL: 0.7 });
    expect(c.comovingDistance(0)).toBe(0);
    expect(c.lookbackTime(0)).toBe(0);
  });
});

describe('the wedge', () => {
  const c = createCosmology({ H0: 70, Om: 0.3, OL: 0.7 });
  test('(RA, z) to the wedge and back to 1e-12 in z, exactly in RA', () => {
    for (const [ra, z] of [
      [130, 0.02],
      [180, 0.08],
      [235.5, 0.119],
    ]) {
      const p = wedgePoint(c, ra, z);
      const b = wedgeInverse(c, p.x, p.y);
      expect(rel(b.z, z)).toBeLessThan(1e-12);
      expect(Math.abs(b.ra - ra)).toBeLessThan(1e-9);
    }
  });
  test('the centre line is straight ahead', () => {
    const p = wedgePoint(c, 180, 0.05);
    expect(p.x).toBeCloseTo(0, 9);
    expect(p.y).toBeCloseTo(c.comovingDistance(0.05), 9);
  });
});
