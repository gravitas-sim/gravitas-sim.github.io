// =============================================================================
// The orbit-determination gate (Prompt 197, part A): the verdict, held by a test
// -----------------------------------------------------------------------------
// tests/fixtures/orbit-determination-gate/thresholds.json fixed the forward model, the
// noise, the arcs, the conditioning threshold, the tolerance, every bound and the decision
// function before any orbit was determined; oracle-results.json is what an independent
// Python implementation (DOP853 integration of the perturbed and the unperturbed motion,
// its own decoding of the ephemeris pack, its own best-fit orbits) wrote; record.json what
// the spike (branch spike/orbit-determination-gate, never merged) measured against it.
// This applies the committed bounds to the recorded numbers (not to the recorded pass
// flags) and holds the verdict: C, measured on the synthetic legs (F5, G1, H2 and N1 fail
// as committed) with the authentic legs NOT RUN. Nothing here moves a bound.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = p => JSON.parse(readFileSync(path.join(ROOT, p), 'utf8'));
const DIR = 'tests/fixtures/orbit-determination-gate';
const TH = read(`${DIR}/thresholds.json`);
const REC = read(`${DIR}/record.json`);
const ORA = read(`${DIR}/oracle-results.json`);
const SRC = read(`${DIR}/sources.json`);
const DOC = readFileSync(
  path.join(ROOT, 'ORBIT_DETERMINATION_GATE.md'),
  'utf8'
);
const L = TH.legs;
const row = id => REC.rows.find(r => r.id === id);
const MU = TH.constants.k ** 2;
const total = o => Object.values(o).reduce((a, b) => a + b, 0);

/** Every leg judged from its recorded numbers and the committed bound. */
const judged = {
  'F1.propagate': () =>
    row('F1.propagate').measured.relativeInvariant <=
      L['F1.propagate'].bounds.relativeInvariant &&
    row('F1.propagate').measured.roundTripAu <=
      L['F1.propagate'].bounds.roundTripAu,
  'F2.oracle': () =>
    row('F2.oracle').measured <= L['F2.oracle'].bounds.maxPositionAu,
  'F3.observer': () =>
    row('F3.observer').measured <= L['F3.observer'].bounds.maxPositionAu,
  'F4.forward': () =>
    row('F4.forward').measured <= L['F4.forward'].bounds.maxArcsec,
  'F5.exact': () => {
    const m = row('F5.exact').measured;
    const b = L['F5.exact'].bounds;
    return (
      m.objectsRecoveredToBound === b.objectsRecovered &&
      m.objectsStatusOk === b.objectsRecovered &&
      m.maxPositionAu <= b.maxPositionAu
    );
  },
  'G1.noisy': () =>
    row('G1.noisy').measured.okRate >= L['G1.noisy'].bounds.minOkRate,
  'G2.cond': () =>
    row('G2.cond').measured.kappa.filter(k => k <= L['G2.cond'].bounds.kappaMax)
      .length >= L['G2.cond'].bounds.minObjects,
  'G3.withheld': () =>
    Object.values(row('G3.withheld').measured).every(
      v => v >= L['G3.withheld'].bounds.minRate
    ),
  'G4.coverage': () =>
    L['G4.coverage'].bounds.epochs.every(e => {
      const m = row('G4.coverage').measured[e];
      const [a, b] = L['G4.coverage'].bounds.ellipse95;
      const [c, d] = L['G4.coverage'].bounds.ellipse68;
      return (
        m.ellipse95 >= a &&
        m.ellipse95 <= b &&
        m.ellipse68 >= c &&
        m.ellipse68 <= d
      );
    }),
  'G5.useful': () =>
    row('G5.useful').measured.rate >= L['G5.useful'].bounds.minRate,
  'H1.refuse': () =>
    row('H1.refuse').measured.okRate <= L['H1.refuse'].bounds.maxOkRate &&
    row('H1.refuse').measured.kappaNotAbove === 0,
  'H2.sweep': () => {
    const s = row('H2.sweep').measured.sweep;
    let v = 0;
    for (let i = 1; i < s.length; i++)
      if (s[i].medianKappa > s[i - 1].medianKappa) v++;
    return v <= L['H2.sweep'].bounds.violations;
  },
  'L1.longer': () => {
    const m = row('L1.longer').measured;
    const b = L['L1.longer'].bounds;
    return (
      m.okRate >= b.minOkRate &&
      m.withinTolWn >= b.minRate &&
      m.withinTolWf >= b.minRate &&
      m.semiMajorRatioWf <= b.semiMajorRatioMax
    );
  },
  'N1.nearEarth': () => {
    const m = row('N1.nearEarth').measured;
    const b = L['N1.nearEarth'].bounds;
    return (
      m.okDraws <= b.maxOkRate &&
      m.nearEarthOrIllConditioned >= b.minNearEarthOrIllConditioned &&
      m.mainBeltNearEarth <= b.maxNearEarthOnMainBelt
    );
  },
};

/** The committed decision function, first match from the top, over the judged legs and the NOT RUN ones. */
function decide(pass) {
  const ok = ids => ids.every(id => pass[id] === true);
  const F = [
    'F1.propagate',
    'F2.oracle',
    'F3.observer',
    'F4.forward',
    'F5.exact',
  ];
  const G = ['G1.noisy', 'G2.cond', 'G3.withheld', 'G4.coverage', 'G5.useful'];
  const common = ['H1.refuse', 'H2.sweep', 'L1.longer', 'N1.nearEarth'];
  if (
    ok([
      ...F,
      ...G,
      ...common,
      'A1.authentic',
      'A2.reference',
      'A3.observation',
    ])
  )
    return 'A';
  if (ok([...F, ...common, 'A4.longer'])) return 'B';
  return 'C';
}

describe('the contract was committed before any result', () => {
  test('the thresholds say so, hold no measured value, and carry the arcs, the noise and the threshold', () => {
    expect(TH.committed).toMatch(/Before any orbit was determined/);
    expect(TH.corrections).toEqual([]);
    expect(JSON.stringify(TH)).not.toMatch(/"measured"|"okRate"|"medianKappa"/);
    expect(TH.noise.sigmaArcsec).toBe(0.5);
    expect(TH.determination.conditioning.threshold).toBe(1000);
    expect(TH.arcs.curated.epochsDaysFromT2).toEqual([-60, 0, 60]);
    expect(TH.arcs.withheld.nextNight.daysFromT2).toBe(61);
    expect(TH.arcs.withheld.far.daysFromT2).toBe(121);
    expect(TH.tolerance.notDemanded).toMatch(
      /no number from Horizons enters any tolerance/
    );
  });

  test('every leg the document tables is in the thresholds, and the other way round', () => {
    for (const id of Object.keys(L))
      expect(DOC).toContain(`| ${id.split('.')[0]} |`);
    for (const id of [
      'F1',
      'F2',
      'F3',
      'F4',
      'F5',
      'G1',
      'G2',
      'G3',
      'G4',
      'G5',
      'H1',
      'H2',
      'L1',
      'N1',
      'P1',
      'A1',
      'A2',
      'A3',
      'A4',
    ])
      expect(Object.keys(L).some(k => k.startsWith(`${id}.`))).toBe(true);
  });

  test('the authentic legs name the data they need and nothing is committed for them', () => {
    for (const id of [
      'A1.authentic',
      'A2.reference',
      'A3.observation',
      'A4.longer',
    ])
      expect(L[id].data).toBe('R1, R2, R3');
    expect(Object.keys(TH.dataRequests).sort()).toEqual([
      'R0',
      'R1',
      'R2',
      'R3',
      'terms',
    ]);
    expect(Object.keys(REC.notRun).sort()).toEqual([
      'A1.authentic',
      'A2.reference',
      'A3.observation',
      'A4.longer',
    ]);
  });
});

describe('the oracle is internally consistent', () => {
  test('twelve main-belt objects and twelve near-Earth objects, as the contract draws them', () => {
    expect(ORA.objects).toHaveLength(12);
    expect(ORA.neos).toHaveLength(12);
    expect(ORA.seed).toBe(197);
    for (const o of ORA.objects) {
      expect(o.t2).toBe(2460900.5 + 380 * o.id);
      const el = o.elements;
      expect(el.aAu).toBeGreaterThanOrEqual(2.2);
      expect(el.aAu).toBeLessThanOrEqual(3.3);
      expect(el.e).toBeLessThanOrEqual(0.25);
      expect(el.iDeg).toBeLessThanOrEqual(20);
    }
  });

  test('the state of each object has the semi-major axis and the eccentricity its elements say (the oracle against its own file)', () => {
    for (const o of [...ORA.objects]) {
      const [x, y, z] = o.state.r;
      const [vx, vy, vz] = o.state.v;
      const r = Math.hypot(x, y, z);
      const energy = (vx * vx + vy * vy + vz * vz) / 2 - MU / r;
      expect(-MU / (2 * energy)).toBeCloseTo(o.elements.aAu, 9);
      const h = [y * vz - z * vy, z * vx - x * vz, x * vy - y * vx];
      const hn = Math.hypot(...h);
      expect(Math.sqrt(1 - (hn * hn) / (MU * o.elements.aAu))).toBeCloseTo(
        o.elements.e,
        9
      );
      expect((Math.acos(h[2] / hn) * 180) / Math.PI).toBeCloseTo(
        o.elements.iDeg,
        9
      );
    }
  });

  test('every object is at opposition at t2: its geocentric and its heliocentric longitude agree, and it lies beyond the Earth', () => {
    for (const o of ORA.objects) {
      const j = o.offsets.indexOf(0);
      const helio = Math.atan2(o.state.r[1], o.state.r[0]);
      const d = o.twobody.lam[j] - helio;
      // the geocentric direction is the heliocentric one when Sun, Earth and object are on a line;
      // light time and the object's own motion leave under two milliradians
      expect(
        Math.abs(d - 2 * Math.PI * Math.round(d / (2 * Math.PI)))
      ).toBeLessThan(2e-3);
      expect(o.twobody.rho[j]).toBeGreaterThan(Math.hypot(...o.state.r) - 1.03);
    }
  });

  test('the model error E is the size the perturbation estimate says and grows with the time from the epoch', () => {
    const e61 = ORA.objects.map(o => o.E['61']).sort((a, b) => a - b);
    const e121 = ORA.objects.map(o => o.E['121']).sort((a, b) => a - b);
    expect(e61[0]).toBeGreaterThan(0);
    expect(e121[11]).toBeLessThan(10);
    expect(e121[5]).toBeGreaterThan(e61[5]);
    for (const o of ORA.objects) {
      for (const arc of ['Efit_T60', 'Efit_L240']) {
        expect(o[arc].rmsArcsec).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(o[arc].atW['61'])).toBe(true);
        expect(Number.isFinite(o[arc].atW['121'])).toBe(true);
      }
      // a two-body fit to the three curated observations is exact, so only the withheld epochs carry error
      expect(o.Efit_T60.rmsArcsec).toBeLessThan(1e-6);
    }
  });

  test('the near-Earth objects are bound, are 0.05 to 0.4 AU from the Earth at t2 and are not main-belt orbits', () => {
    for (const n of ORA.neos) {
      expect(n.rangeAu).toBeGreaterThanOrEqual(0.05);
      expect(n.rangeAu).toBeLessThanOrEqual(0.4);
      expect(n.aAu).toBeGreaterThan(0);
      expect(n.e).toBeLessThan(0.95);
      const j = n.offsets.indexOf(0);
      expect(n.nbody.rho[j]).toBeCloseTo(n.rangeAu, 3);
    }
  });
});

describe('the measured legs, judged from the recorded numbers against the committed bounds', () => {
  test('every recorded pass flag is what the bounds give', () => {
    for (const [id, f] of Object.entries(judged))
      expect({ id, pass: row(id).pass }).toEqual({ id, pass: f() });
  });

  test('the draws add up', () => {
    expect(total(row('G1.noisy').measured.statuses)).toBe(1200);
    expect(total(row('L1.longer').measured.statuses)).toBe(1200);
    expect(total(row('N1.nearEarth').measured.statuses)).toBe(1200);
    for (const k of Object.keys(REC.detail.H1.statuses))
      expect(total(REC.detail.H1.statuses[k])).toBe(1200);
    expect(REC.detail.G4.draws).toBe(2400);
    expect(REC.detail.G4.Wn.n).toBe(REC.detail.G4.okDraws);
  });

  test('the machinery holds: F1 to F4 pass, the exact arc is recovered on all twelve objects, and the withheld epochs, the prediction ellipses and the longer arc hold', () => {
    for (const id of [
      'F1.propagate',
      'F2.oracle',
      'F3.observer',
      'F4.forward',
      'G2.cond',
      'G3.withheld',
      'G4.coverage',
      'G5.useful',
      'H1.refuse',
      'L1.longer',
    ])
      expect(judged[id]()).toBe(true);
    expect(row('F5.exact').measured.objectsRecoveredToBound).toBe(12);
    expect(row('F5.exact').measured.maxPositionAu).toBeLessThan(1e-12);
    // coverage is honest: the formal 95 and 68 percent ellipses cover at their nominal rate to 0.01 and 0.02
    for (const e of ['Wn', 'Wf']) {
      expect(
        Math.abs(row('G4.coverage').measured[e].ellipse95 - 0.95)
      ).toBeLessThan(0.01);
      expect(
        Math.abs(row('G4.coverage').measured[e].ellipse68 - 0.6827)
      ).toBeLessThan(0.02);
    }
  });

  test('F5, G1, H2 and N1 fail as committed, each for the reason recorded, and no bound moved', () => {
    expect(judged['F5.exact']()).toBe(false);
    expect(row('F5.exact').measured.objectsStatusOk).toBe(11);
    expect(judged['G1.noisy']()).toBe(false);
    expect(row('G1.noisy').measured.okRate).toBeCloseTo(1099 / 1200, 6);
    expect(row('G1.noisy').measured.statuses.illConditioned).toBe(100);
    // the one object above the conditioning threshold: object 1, inclination 0.44 degrees
    const k = row('G2.cond').measured.kappa;
    expect(
      k.filter(x => x > TH.determination.conditioning.threshold)
    ).toHaveLength(1);
    expect(k[1]).toBeGreaterThan(1000);
    expect(ORA.objects[1].elements.iDeg).toBeLessThan(1);
    expect(judged['H2.sweep']()).toBe(false);
    const s = row('H2.sweep').measured.sweep;
    expect(s.map(x => x.T)).toEqual([1, 2, 5, 10, 20, 40, 60, 90]);
    expect(s[7].medianKappa).toBeGreaterThan(s[6].medianKappa);
    expect(judged['N1.nearEarth']()).toBe(false);
    expect(row('N1.nearEarth').measured.okDraws).toBe(0);
    expect(row('N1.nearEarth').measured.nearEarthOrIllConditioned).toBeLessThan(
      0.9
    );
    expect(L['F5.exact'].bounds.objectsRecovered).toBe(12);
    expect(L['G1.noisy'].bounds.minOkRate).toBe(0.95);
    expect(L['H2.sweep'].bounds.violations).toBe(0);
    expect(L['N1.nearEarth'].bounds.minNearEarthOrIllConditioned).toBe(0.9);
  });

  test('the curated arc is the best of the sweep, and the ill-conditioned arcs are far above the threshold', () => {
    const s = row('H2.sweep').measured.sweep;
    const med = T => s.find(x => x.T === T).medianKappa;
    expect(med(60)).toBeLessThan(med(40));
    expect(med(60)).toBeLessThan(med(90));
    expect(med(1)).toBeGreaterThan(
      10 * TH.determination.conditioning.threshold
    );
    expect(med(60)).toBeLessThan(TH.determination.conditioning.threshold / 10);
    // the next-night semi-major axis of the 95 percent ellipse falls from kiloarcseconds to arcseconds
    expect(s[0].medianSemiMajor95NextNightArcsec).toBeGreaterThan(1000);
    expect(s[6].medianSemiMajor95NextNightArcsec).toBeLessThan(10);
  });

  test('Laplace is reported and never judged', () => {
    expect(row('P1.laplace').pass).toBeNull();
    expect(
      row('P1.laplace').measured.medianPositionErrorAu.laplaceRaw
    ).toBeGreaterThan(
      100 * row('P1.laplace').measured.medianPositionErrorAu.gaussRaw
    );
  });
});

describe('the verdict', () => {
  test('C by the committed function, measured: the synthetic legs F5, G1, H2 and N1 fail and the authentic legs are NOT RUN', () => {
    const pass = {};
    for (const id of Object.keys(judged)) pass[id] = judged[id]();
    // NOT RUN is not a pass
    expect(decide(pass)).toBe('C');
    expect(
      decide({
        ...pass,
        'A1.authentic': true,
        'A2.reference': true,
        'A3.observation': true,
        'A4.longer': true,
      })
    ).toBe('C');
  });

  test('the function would give A or B only if the failed synthetic legs passed and the authentic ones ran', () => {
    const pass = {};
    for (const id of Object.keys(judged)) pass[id] = true;
    expect(decide(pass)).toBe('C');
    expect(
      decide({
        ...pass,
        'A1.authentic': true,
        'A2.reference': true,
        'A3.observation': true,
      })
    ).toBe('A');
    expect(decide({ ...pass, 'A4.longer': true })).toBe('B');
  });

  test('the record names its corrections and the spike, and the document names the verdict', () => {
    expect(REC.corrections.map(c => c.id)).toEqual(['k1', 'k2', 'k3']);
    expect(REC.spike.branch).toBe('spike/orbit-determination-gate');
    expect(DOC).toMatch(/Verdict by the committed function: \*\*C\*\*/);
    expect(REC.syntheticLegs).toEqual({ A: false, B: false });
  });
});

describe('the retrieved MPC data (R2) and what was not retrieved', () => {
  const r2 = SRC.R2.extract;
  const kep = Object.fromEntries(
    r2.KEP.coefficient_names.map((n, i) => [n, r2.KEP.coefficient_values[i]])
  );
  const car = r2.CAR.coefficient_values;

  test("the published orbit of Ceres meets the intake rule's elements", () => {
    expect(r2.designation.name).toBe('Ceres');
    expect(kep.a).toBeGreaterThanOrEqual(2.2);
    expect(kep.a).toBeLessThanOrEqual(3.3);
    expect(kep.e).toBeLessThan(0.25);
    expect(kep.i).toBeLessThan(20);
    expect(r2.magnitude_data.H).toBeLessThan(10);
    expect(r2.categorization.orbit_type_str).toBe('Main Belt');
  });

  test("the published numbers agree with each other: Kepler's third law, and the Cartesian state against the elements", () => {
    const k = TH.constants.k;
    const period = ((2 * Math.PI) / k) * kep.a ** 1.5;
    expect(Math.abs(period / r2.orbit_fit_statistics.period - 1)).toBeLessThan(
      2e-6
    );
    const r = Math.hypot(car[0], car[1], car[2]);
    const v2 = car[3] ** 2 + car[4] ** 2 + car[5] ** 2;
    expect(-(k * k) / (2 * (v2 / 2 - (k * k) / r))).toBeCloseTo(kep.a, 6);
  });

  test('the provenance is complete, R1 is recorded as not retrieved and R0 as not fetched', () => {
    expect(SRC.R2.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(SRC.R3.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(SRC.R3.committed).toBe(false);
    expect(SRC.R1.retrieved).toBeNull();
    expect(SRC.R1.status).toMatch(/NOT RETRIEVED/);
    expect(SRC.R0.status).toMatch(/not fetched/);
    for (const id of Object.keys(REC.notRun))
      expect(REC.notRun[id]).toMatch(/R1|as A1/);
  });

  test('the rulings are in the document verbatim and the thresholds were not touched by them', () => {
    expect(DOC).toContain('"Leave failing, labelled (Recommended)"');
    expect(DOC).toContain('"Yes, R1–R3 (Recommended)"');
    expect(TH.corrections).toEqual([]);
    expect(TH.legs['A1.authentic'].bounds.kappaMax).toBe(1000);
  });
});
