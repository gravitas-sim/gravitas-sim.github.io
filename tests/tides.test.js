// =============================================================================
// The tides kernel (Prompt 204, part A)
// -----------------------------------------------------------------------------
// tests/fixtures/tides/thresholds.json fixed every bound before js/kernels/tides/
// had been run. tools/tides-validate.mjs judges the kernel against them; this
// file holds every row, and adds what a row cannot say: the kernel reuses the
// Roche functions of js/tidalPhysics.js instead of repeating them, the
// resonance finder names Mimas for the Cassini Division, the heating bound is a
// range, an evolution that ends names its time, and the oracle fixtures are the
// ones their provenance record describes.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { runValidation, THRESHOLDS } from '../tools/tides-validate.mjs';
import * as K from '../js/kernels/tides/index.js';
import {
  ROCHE_FLUID_COEFF,
  ROCHE_RIGID_COEFF,
  rocheLimitFromDensities,
} from '../js/tidalPhysics.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = p => readFileSync(path.join(ROOT, p));

describe('the committed thresholds hold for the production module', () => {
  const rows = runValidation();

  test('every committed row passes', () => {
    const failing = rows.filter(r => r.pass === false);
    expect(
      failing.map(
        r => `${r.id}: ${r.measured} against ${JSON.stringify(r.bound)}`
      )
    ).toEqual([]);
    expect(rows.length).toBeGreaterThan(150);
  });

  test('tier c is stated as not applicable, and nothing else is skipped', () => {
    expect(rows.filter(r => r.pass === null).map(r => r.id)).toEqual([
      'c.ensemble',
    ]);
  });

  test('every check in the fixture has at least one row', () => {
    const tiers = new Set(rows.map(r => r.id.split('.')[0]));
    for (const id of Object.keys(THRESHOLDS.checks)) {
      expect(tiers.has(id.split('.')[0])).toBe(true);
    }
  });
});

describe('the oracle fixtures are the ones the provenance record describes', () => {
  const prov = JSON.parse(read('tests/fixtures/tides/oracle-provenance.json'));
  test.each(Object.entries(prov.files))('%s', (file, sha) => {
    expect(createHash('sha256').update(read(file)).digest('hex')).toBe(sha);
  });
});

describe('what the kernel reuses and what it adds', () => {
  test('the Roche coefficients are the existing authority, not a copy', () => {
    expect(K.ROCHE_RIGID_COEFF).toBe(ROCHE_RIGID_COEFF);
    expect(K.ROCHE_FLUID_COEFF).toBe(ROCHE_FLUID_COEFF);
    const args = {
      primaryRadius: 6.0268e7,
      primaryDensity: 687.3,
      satelliteDensity: 900,
    };
    expect(K.rocheLimit({ ...args, kind: 'fluid' }).distance).toBe(
      rocheLimitFromDensities(
        args.primaryRadius,
        args.primaryDensity,
        args.satelliteDensity,
        ROCHE_FLUID_COEFF
      )
    );
  });

  test('the exact fluid coefficient is 0.6 percent above the default and says so', () => {
    expect(K.CHANDRASEKHAR_FLUID_COEFF / K.ROCHE_FLUID_COEFF - 1).toBeCloseTo(
      0.0062,
      3
    );
  });

  test('a satellite denser than its primary is flagged inside the primary', () => {
    const r = K.rocheLimit({
      primaryRadius: 1e6,
      primaryDensity: 1000,
      satelliteDensity: 8000,
      kind: 'rigid',
    });
    expect(r.insidePrimary).toBe(true);
    expect(r.inPrimaryRadii).toBeLessThan(1);
  });
});

describe('rings', () => {
  const mimas = 1.8552e8;
  test('the nearest resonance of the Cassini Division edge is Mimas 2:1', () => {
    const best = K.nearestResonances({
      semiMajorAxis: mimas,
      radius: 1.1758e8,
    })[0];
    expect([best.p, best.q]).toEqual([2, 1]);
    expect(Math.abs(best.offset)).toBeLessThan(0.01);
  });

  test('results are sorted by offset, best first', () => {
    const list = K.nearestResonances({ semiMajorAxis: mimas, radius: 1.0e8 });
    for (let i = 1; i < list.length; i++) {
      expect(Math.abs(list[i].offset)).toBeGreaterThanOrEqual(
        Math.abs(list[i - 1].offset)
      );
    }
  });

  test('Toomre: a denser disc is less stable, and a fluid is more stable than particles at equal inputs', () => {
    const base = {
      primaryMass: 5.683e26,
      radius: 1e8,
      velocityDispersion: 0.5,
      surfaceDensity: 500,
    };
    const dense = K.toomreQ({ ...base, surfaceDensity: 5000 });
    const thin = K.toomreQ(base);
    expect(dense.Q).toBeLessThan(thin.Q);
    expect(K.toomreQ({ ...base, kind: 'fluid' }).Q).toBeGreaterThan(thin.Q);
    expect(K.toomreQ({ ...base, surfaceDensity: 1e6 }).unstable).toBe(true);
  });
});

describe('tides', () => {
  const io = {
    primaryMass: 1.8982e27,
    satelliteRadius: 1.8216e6,
    semiMajorAxis: 4.217e8,
    eccentricity: 0.0041,
    k2: 1.5,
    Q: 100,
  };
  test('the heating bound is a range that brackets the stated k2 and Q', () => {
    const r = K.heatingRange(io);
    const p = K.tidalHeating(io).power;
    expect(r.low).toBeLessThan(p);
    expect(r.high).toBeGreaterThan(p);
    expect(r.high / r.low).toBeCloseTo(1000, 6);
  });

  test('the k2/Q an observed power needs, put back in, returns that power', () => {
    const need = K.requiredK2OverQ({ ...io, power: 1e14 });
    const back = K.heatingRange({
      ...io,
      k2OverQMin: need.k2OverQ,
      k2OverQMax: need.k2OverQ,
    });
    expect(back.low).toBeCloseTo(1e14, -2);
  });

  const earthMoon = {
    primaryMass: 5.9722e24,
    primaryRadius: 6.3781e6,
    satelliteMass: 7.342e22,
    semiMajorAxis: 3.844e8,
    k2: 0.3,
    Q: 12,
    spin: 7.2921159e-5,
    alpha: 0.3307,
  };
  test('the Moon recedes and the day lengthens, and the sign flips with the spin', () => {
    const r = K.recession(earthMoon);
    expect(r.sign).toBe(1);
    expect(r.dadt).toBeGreaterThan(0);
    expect(r.dOmegaDt).toBeLessThan(0);
    const slow = K.recession({ ...earthMoon, spin: 1e-6 });
    expect(slow.sign).toBe(-1);
    expect(slow.dadt).toBeLessThan(0);
  });

  test('evolution is its own inverse in time to the closed form', () => {
    const t = 5e8 * K.SECONDS_PER_YEAR;
    const there = K.evolveCircular({ ...earthMoon, time: t });
    const back = K.timeToReach({ ...earthMoon, target: there.a });
    expect(Math.abs(back - t) / t).toBeLessThan(1e-12);
  });

  test('run backward at constant Q the Moon reaches the Earth well inside the age of the Solar System', () => {
    // The famous failure of the constant-Q extrapolation, kept as a stated limit.
    let refused = null;
    try {
      K.evolveCircular({ ...earthMoon, time: -4.5e9 * K.SECONDS_PER_YEAR });
    } catch (e) {
      refused = e;
    }
    expect(refused).toBeInstanceOf(K.TidesError);
    expect(['orbit-inside-body', 'corotation']).toContain(refused.code);
  });

  test('a refusal carries a code and never a number', () => {
    expect(() => K.recession({ ...earthMoon, Q: 4 })).toThrow(K.TidesError);
    try {
      K.recession({ ...earthMoon, Q: 4 });
    } catch (e) {
      expect(e.code).toBe('q-range');
      expect(e.detail.min).toBe(K.Q_MIN);
    }
  });
});

describe('the precomputed trajectory (the gate verdict B slice)', () => {
  const earthMoon = {
    primaryMass: 5.9722e24,
    primaryRadius: 6.3781e6,
    satelliteMass: 7.342e22,
    semiMajorAxis: 3.844e8,
    k2: 0.3,
    Q: 12,
    spin: 7.2921159e-5,
    alpha: 0.3307,
  };

  test('it is the closed form sampled, and the samples are those of the oracle', () => {
    const oracle = JSON.parse(read('tests/fixtures/tides/oracle-results.json'))
      .evolution['earth-moon'];
    const tEnd = oracle.times[oracle.times.length - 1];
    const tr = K.tidalTrajectory({ ...earthMoon, duration: tEnd, samples: 5 });
    expect(tr.endedBy).toBeNull();
    expect(tr.sign).toBe(1);
    tr.rows.forEach((row, i) => {
      expect(Math.abs(row.a - oracle.a[i]) / oracle.a[i]).toBeLessThan(1e-9);
      expect(row.time).toBeCloseTo(oracle.times[i], -3);
    });
  });

  test('the Moon recedes, the day lengthens and the account falls along the table', () => {
    const tr = K.tidalTrajectory({
      ...earthMoon,
      duration: 1e9 * K.SECONDS_PER_YEAR,
      samples: 40,
    });
    for (let i = 1; i < tr.rows.length; i++) {
      expect(tr.rows[i].a).toBeGreaterThan(tr.rows[i - 1].a);
      expect(tr.rows[i].spinPeriod).toBeGreaterThan(tr.rows[i - 1].spinPeriod);
      expect(tr.rows[i].energy).toBeLessThan(tr.rows[i - 1].energy);
      expect(
        Math.abs(
          tr.rows[i].totalAngularMomentum / tr.rows[0].totalAngularMomentum - 1
        )
      ).toBeLessThan(1e-12);
    }
  });

  test('into the past the table stops at contact and names the time', () => {
    const tr = K.tidalTrajectory({
      ...earthMoon,
      duration: -4.5e9 * K.SECONDS_PER_YEAR,
      samples: 30,
    });
    expect(tr.endedBy.code).toBe('orbit-inside-body');
    expect(tr.endedBy.time).toBeLessThan(0);
    // the constant-Q age problem: contact well inside the age of the Solar System
    expect(Math.abs(tr.endedBy.time) / K.SECONDS_PER_YEAR).toBeLessThan(4.5e9);
    expect(tr.rows[tr.rows.length - 1].a).toBeGreaterThan(
      earthMoon.primaryRadius
    );
  });

  test('forward past corotation it stops and names the time', () => {
    const tr = K.tidalTrajectory({
      ...earthMoon,
      duration: 1e12 * K.SECONDS_PER_YEAR,
      samples: 30,
    });
    expect(tr.endedBy.code).toBe('corotation');
    const last = tr.rows[tr.rows.length - 1];
    expect(Math.abs(last.spin - last.n) / last.n).toBeLessThan(1e-5);
  });

  test('hostile arguments are refused', () => {
    for (const bad of [
      { duration: 0 },
      { duration: NaN },
      { duration: 1e9, samples: 1 },
      { duration: 1e9, samples: 5000 },
      { duration: 1e9, samples: 2.5 },
    ]) {
      expect(() => K.tidalTrajectory({ ...earthMoon, ...bad })).toThrow(
        K.TidesError
      );
    }
  });
});
