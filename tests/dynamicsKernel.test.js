// The dynamics kernel of Prompt 237 (js/kernels/dynamics/, DYNAMICS.md): the relations against the
// oracle's pinned closed forms, the refusals, the virial estimator on one synthetic cluster, and the
// two properties the gate depends on: the kernel shares no code with the engine, and every cited
// coefficient is flagged for verification. The full table is `npm run dynamics:validate`.
import { describe, test, expect } from '@jest/globals';
import { readFileSync, readdirSync } from 'node:fs';
import * as K from '../js/kernels/dynamics/index.js';

const here = name => new URL(name, import.meta.url);
const fixture = name =>
  JSON.parse(readFileSync(here(`./fixtures/dynamics/${name}.json`), 'utf8'));
const oracle = fixture('oracle-results');
const thresholds = fixture('thresholds');
const rel = (a, b) => Math.abs(a - b) / Math.abs(b);

describe('the relations against the oracle (numpy, scipy, no Gravitas code)', () => {
  test('dynamical, crossing and half-mass relaxation times', () => {
    for (const c of oracle.A1.slice(0, 8)) {
      expect(rel(K.dynamicalTime({ radius: c.R_pc, mass: c.M_sun }).value, c.tDyn_Myr)).toBeLessThan(1e-9);
      expect(rel(K.crossingTime({ radius: c.R_pc, speed: c.v_kms }).value, c.tCross_Myr)).toBeLessThan(1e-9);
    }
    for (const c of oracle.A2.slice(0, 8)) {
      const t = K.halfMassRelaxationTime({ N: c.N, halfMassRadius: c.rh_pc, meanMass: c.m_sun, gamma: c.gamma });
      expect(rel(t.value, c.tRh_Myr)).toBeLessThan(1e-9);
      expect(t.assumes.join(' ')).toContain(`gamma = ${c.gamma}`);
    }
  });
  test('the sinking time, the friction function and the Coulomb logarithm', () => {
    for (const c of oracle.O1.slice(0, 10))
      expect(
        rel(
          K.sinkingTimeIsothermal({ radius: c.r_pc, circularSpeed: c.vc_kms, mass: c.M_sun, lnLambda: c.lnLambda }).value,
          c.tSink_Myr
        )
      ).toBeLessThan(1e-9);
    for (const c of oracle.A4.f) expect(Math.abs(K.frictionFunction(c.X) - c.f)).toBeLessThan(2e-12);
    for (const c of oracle.A6) expect(Math.abs(K.coulombLogarithm({ bmax: c.bmax, bmin: c.bmin }).value - c.lnLambda)).toBeLessThan(1e-12);
  });
  test('the scalings the relations promise', () => {
    const a = K.sinkingTimeIsothermal({ radius: 4, circularSpeed: 20, mass: 1e4, lnLambda: 3 }).value;
    expect(K.sinkingTimeIsothermal({ radius: 8, circularSpeed: 20, mass: 1e4, lnLambda: 3 }).value / a).toBeCloseTo(4, 12);
    expect(K.sinkingTimeIsothermal({ radius: 4, circularSpeed: 20, mass: 2e4, lnLambda: 3 }).value / a).toBeCloseTo(0.5, 12);
    expect(K.sinkingTimeIsothermal({ radius: 4, circularSpeed: 20, mass: 1e4, lnLambda: 6 }).value / a).toBeCloseTo(0.5, 12);
    const rh = K.halfMassRelaxationTime({ N: 1e4, halfMassRadius: 2, meanMass: 0.5, gamma: 0.11 }).value;
    expect(K.evaporationTime({ halfMassRelaxation: rh }).value / rh).toBeCloseTo(K.CITED.evaporation.value, 12);
    expect(K.segregationTime({ halfMassRelaxation: rh, meanMass: 0.5, mass: 5 }).value / rh).toBeCloseTo(0.1, 12);
    expect(K.segregationTime({ halfMassRelaxation: rh, meanMass: 0.5, mass: 5 }).assumes.join(' ')).toMatch(/order of magnitude/);
  });
});

describe('the criterion and the refusals', () => {
  test('collisionless, transitional and collisional by the stated convention', () => {
    expect(K.criterion({ time: 1, halfMassRelaxation: 100 }).kind).toBe('collisionless');
    expect(K.criterion({ time: 10, halfMassRelaxation: 100 }).kind).toBe('collisionless');
    expect(K.criterion({ time: 50, halfMassRelaxation: 100 }).kind).toBe('transitional');
    expect(K.criterion({ time: 100, halfMassRelaxation: 100 }).kind).toBe('collisional');
  });
  test('a missing Coulomb logarithm, too few stars, bad inputs', () => {
    expect(K.frictionDeceleration({ mass: 1, speed: 1, density: 1, sigma: 1 }).code).toBe('coulomb');
    expect(K.sinkingTimeIsothermal({ radius: 1, circularSpeed: 1, mass: 1 }).code).toBe('coulomb');
    expect(K.halfMassRelaxationTime({ N: 10, halfMassRadius: 1, meanMass: 1, gamma: 0.11 }).code).toBe('coulomb');
    expect(K.halfMassRelaxationTime({ N: 1000, halfMassRadius: -1, meanMass: 1, gamma: 0.11 }).status).toBe('refused');
    expect(K.coulombLogarithm({ bmax: 1, bmin: 1 }).status).toBe('refused');
    expect(K.segregationTime({ halfMassRelaxation: 1, meanMass: 1, mass: 0.5 }).code).toBe('range');
  });
});

describe('the virial mass', () => {
  test('a synthetic Plummer cluster: the truth manifest is labelled, the interval covers, the dispersion is the truth to its error', () => {
    const c = K.plummerCluster({ members: 120, scaleRadius: 3, mass: 1e5, errorFraction: 0.1, seed: 'unit-1' });
    expect(c.truth.label).toMatch(/synthetic/);
    const r = K.virialMass({ x: c.x, y: c.y, v: c.v, e: c.e, seed: 'unit-1' });
    expect(r.status).toBe('ok');
    expect(r.lo).toBeLessThan(1e5);
    expect(r.hi).toBeGreaterThan(1e5);
    expect(Math.abs(r.sigmaLos - c.truth.sigmaLos)).toBeLessThan(4 * r.sigmaLosError);
    expect(r.assumes.join(' ')).toMatch(/structure term of 0.15/);
  });
  test('the same seed gives the same cluster and the same interval', () => {
    const a = K.plummerCluster({ members: 40, scaleRadius: 3, mass: 1e5, seed: 's' });
    const b = K.plummerCluster({ members: 40, scaleRadius: 3, mass: 1e5, seed: 's' });
    expect(Array.from(a.v)).toEqual(Array.from(b.v));
    const r1 = K.virialMass({ x: a.x, y: a.y, v: a.v, e: a.e, seed: 'z' });
    const r2 = K.virialMass({ x: b.x, y: b.y, v: b.v, e: b.e, seed: 'z' });
    expect([r1.lo, r1.hi]).toEqual([r2.lo, r2.hi]);
  });
  test('fewer than 20 members and an unresolved dispersion are not constrained; bad arrays are refused', () => {
    const few = K.plummerCluster({ members: 19, scaleRadius: 3, mass: 1e5, seed: 'f' });
    expect(K.virialMass({ x: few.x, y: few.y, v: few.v, e: few.e, seed: 'f' })).toMatchObject({ status: 'not-constrained', code: 'members', members: 19 });
    const hot = K.plummerCluster({ members: 60, scaleRadius: 3, mass: 1e5, errorFraction: 5, seed: 'h' });
    expect(K.virialMass({ x: hot.x, y: hot.y, v: hot.v, e: hot.e, seed: 'h' }).status).toBe('not-constrained');
    const ok = K.plummerCluster({ members: 30, scaleRadius: 3, mass: 1e5, seed: 'o' });
    expect(K.virialMass({ x: ok.x, y: ok.y, v: ok.v, e: ok.e.map(() => 0), seed: 'o' }).code).toBe('error');
    expect(K.virialMass({ x: ok.x, y: ok.y.slice(1), v: ok.v, e: ok.e, seed: 'o' }).code).toBe('shape');
  });
});

describe('the gate depends on two properties of the kernel', () => {
  test('it shares no code with the application: no import of the engine, the physics module or the validation harness', () => {
    const dir = new URL('../js/kernels/dynamics/', import.meta.url);
    for (const f of readdirSync(dir)) {
      const src = readFileSync(new URL(f, dir), 'utf8');
      for (const m of src.matchAll(/from\s+'(\.[^']+)'/g))
        expect(m[1]).not.toMatch(/engine|physics|validation|orbital/);
    }
  });
  test('every cited coefficient names its source and is flagged for verification until Carl has checked it', () => {
    const flat = [K.CITED.spitzerRelaxation, K.CITED.gamma.equalMass, K.CITED.gamma.massSpectrum, K.CITED.gamma.spitzerHart, K.CITED.evaporation, K.CITED.segregation];
    for (const c of flat) {
      expect(c.source).toMatch(/\d{4}/);
      expect(c.verify).toBe(true);
    }
    expect(K.CITED.plummer.verify).toBe(false);
  });
  test('the thresholds file holds every committed leg and its amendments', () => {
    expect(thresholds.checks.map(c => c.id)).toEqual(
      expect.arrayContaining(['A1', 'A7', 'O1', 'B1', 'C1', 'C3', 'D1', 'D4', 'R1', 'R7', 'G1', 'G7'])
    );
    expect(thresholds.amendments.map(a => a.id).sort()).toEqual(['AM1', 'AM2', 'AM3', 'AM4', 'AM5']);
  });
});
