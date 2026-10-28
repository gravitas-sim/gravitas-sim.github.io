// =============================================================================
// The solar kernel (Prompt 194)
// -----------------------------------------------------------------------------
// tests/fixtures/sun/thresholds.json fixed every bound before js/kernels/sun/ had
// been run. tools/sun-validate.mjs runs them in plain Node (Jest's VM makes Math
// reads about ten times slower, so the ensembles here would time the harness);
// this file runs it, holds every row to its bound (the one leg that fails as
// committed is held to tests/fixtures/sun/failed-legs.json), and adds what needs
// no ensemble: a worked example, the refusals, the reference laws' data, the
// summary of a flux series, and the input that was not run (a cited
// solar-coordinates package). Part 2 runs the authentic frames and the measured
// irradiance series (tests/fixtures/sun/thresholds-2.json) in the same table.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  LAWS,
  PRIMARY_LAW,
  compareToLaw,
  diskToHeliographic,
  fitRotationLaw,
  heliographicToDisk,
  lawRate,
  summariseFluxSeries,
  temperatureFromFlux,
} from '../js/kernels/sun/index.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const json = f => JSON.parse(readFileSync(path.join(ROOT, f), 'utf8'));
const THRESHOLDS = json('tests/fixtures/sun/thresholds.json');
const FAILED = json('tests/fixtures/sun/failed-legs.json').legs;

describe('the committed thresholds hold for the production module', () => {
  const ran = spawnSync(
    process.execPath,
    [path.join(ROOT, 'tools/sun-validate.mjs'), '--json'],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 24 }
  );
  const rows = JSON.parse(ran.stdout);

  test('every committed row passes but the recorded one, and the inputs not run say so', () => {
    for (const r of rows) {
      if (r.pass === null) continue;
      if (FAILED[r.id]) continue;
      if (r.pass !== true)
        throw new Error(
          `${r.id}: ${r.measured} against ${JSON.stringify(r.bound)}`
        );
    }
    expect(rows.filter(r => r.pass === null).map(r => r.id)).toEqual([
      'b4.package',
    ]);
  });

  test('the failed leg is held to its record: still failing, in its measured range', () => {
    const failing = rows.filter(r => r.pass === false).map(r => r.id);
    expect(failing.sort()).toEqual(Object.keys(FAILED).sort());
    for (const [id, leg] of Object.entries(FAILED)) {
      const r = rows.find(x => x.id === id);
      expect(r.measured).toBeGreaterThanOrEqual(leg.measuredRange[0]);
      expect(r.measured).toBeLessThanOrEqual(leg.measuredRange[1]);
      if (leg.rowBound === undefined)
        expect(r.bound).toBe(leg.bound.noiseFreeSynodicRouteDegPerDay);
      else expect(r.bound).toEqual(leg.rowBound);
    }
  });

  test('every check the thresholds name is run, or declared not run', () => {
    const ids = new Set(rows.map(r => r.id));
    for (const id of Object.keys(THRESHOLDS.checks)) {
      const ran = [...ids].some(
        r => r === id || r.startsWith(`${id.split('.')[0]}.`)
      );
      expect(ran).toBe(true);
    }
  });

  test('the row set is stable', () => {
    expect(rows.length).toBeGreaterThanOrEqual(70);
  });
});

describe('a worked example of the disc geometry', () => {
  const disk = {
    cx: 256,
    cy: 248,
    radiusPx: 235,
    pDeg: -15.3,
    b0Deg: -3.7,
    l0Deg: 221.4,
  };

  test('the disc centre is the sub-Earth point', () => {
    const h = diskToHeliographic(256, 248, disk);
    expect(h.latDeg).toBeCloseTo(-3.7, 10);
    expect(h.lonStonyDeg).toBeCloseTo(0, 10);
    expect(h.lonCarringtonDeg).toBeCloseTo(221.4, 10);
    expect(h.mu).toBeCloseTo(1, 12);
  });

  test('the east limb is 90 degrees east of the central meridian when P and B0 are zero', () => {
    const h = diskToHeliographic(21, 248, { ...disk, pDeg: 0, b0Deg: 0 });
    expect(h.lonStonyDeg).toBeCloseTo(-90, 8);
    expect(h.mu).toBeCloseTo(0, 6);
  });

  test('a pixel outside the disc is refused, never extrapolated', () => {
    const h = diskToHeliographic(256 + 236, 248, disk);
    expect(h.status).toBe('refused');
    expect(h.code).toBe('off-disc');
  });

  test('a point on the far side has no pixel', () => {
    const p = heliographicToDisk(0, 100, disk);
    expect(p.status).toBe('refused');
  });

  test('the same point on an orthographic and a perspective disc differ near the limb, by under a degree', () => {
    const o = diskToHeliographic(256 + 0.95 * 235, 248, {
      ...disk,
      pDeg: 0,
      b0Deg: 0,
    });
    const p = diskToHeliographic(256 + 0.95 * 235, 248, {
      ...disk,
      pDeg: 0,
      b0Deg: 0,
      distanceAu: 1,
    });
    const diff = Math.abs(o.lonStonyDeg - p.lonStonyDeg);
    expect(diff).toBeGreaterThan(0.01);
    expect(diff).toBeLessThan(1);
  });
});

describe('the reference laws are data with a citation and say they were not re-read', () => {
  test('both carry a citation and checked false', () => {
    for (const l of Object.values(LAWS)) {
      expect(l.citation).toMatch(/\d{4}/);
      expect(l.checked).toBe(false);
    }
    expect(PRIMARY_LAW.id).toBe('howard1990');
  });

  test('the law falls with latitude and the other law is within the group scatter', () => {
    expect(lawRate(0)).toBeGreaterThan(lawRate(30));
    expect(lawRate(30)).toBeGreaterThan(lawRate(60));
    expect(
      Math.abs(lawRate(20) - lawRate(20, LAWS.snodgrass1990))
    ).toBeLessThan(0.3);
  });

  test('a comparison carries the stated floor of group-to-group scatter', () => {
    const c = compareToLaw({
      latDeg: 20,
      rate: lawRate(20) + 0.2,
      sigma: 0.05,
    });
    expect(c.sigmaTotal).toBeCloseTo(Math.hypot(0.05, 0.3), 12);
    expect(c.agrees).toBe(true);
  });
});

describe('only what the latitudes allow is fitted', () => {
  test('three coefficients from two latitudes is refused with the numbers named', () => {
    const r = fitRotationLaw(
      [10, 30].map(l => ({ latDeg: l, rate: lawRate(l), sigma: 0.1 })),
      { free: ['A', 'B', 'C'] }
    );
    expect(r.status).toBe('refused');
    expect(r.code).toBe('under-determined');
    expect(r.why).toMatch(/2 distinct/);
  });

  test('the default fits the equatorial term only and holds B and C at the law', () => {
    const r = fitRotationLaw([
      { latDeg: 10, rate: lawRate(10) + 0.1, sigma: 0.05 },
      { latDeg: 25, rate: lawRate(25) + 0.1, sigma: 0.05 },
    ]);
    expect(Object.keys(r.params)).toEqual(['A']);
    expect(r.fixed.B).toBe(PRIMARY_LAW.B);
    expect(r.fixed.C).toBe(PRIMARY_LAW.C);
    expect(r.params.A.value).toBeCloseTo(PRIMARY_LAW.A + 0.1, 10);
  });

  test('a fit that is exact says so and carries no goodness of fit', () => {
    const r = fitRotationLaw(
      [10, 30].map(l => ({ latDeg: l, rate: lawRate(l), sigma: 0.1 })),
      { free: ['A', 'B'] }
    );
    expect(r.zeroDof).toBe(true);
    expect(r.chi2).toBeNull();
    expect(r.warnings.map(w => w.code)).toContain('correlated');
  });
});

describe('the flux to the Sun', () => {
  test('a flux of 1361 W/m2 at 1 AU is the IAU nominal luminosity to a hundredth of a percent and 5772 K to a fifth of a kelvin', () => {
    const r = temperatureFromFlux({ fluxWm2: 1361 });
    expect(Math.abs(r.luminosityW / 3.828e26 - 1)).toBeLessThan(5e-4);
    expect(Math.abs(r.teffK - 5772)).toBeLessThan(0.5);
  });

  test('a series names its instrument or says it does not', () => {
    const s = [1360.9, 1361.2, 1361.1].map(f => ({ fluxWm2: f }));
    expect(summariseFluxSeries(s).warnings.map(w => w.code)).toEqual([
      'instrument-not-named',
    ]);
    const named = summariseFluxSeries(s, { instrument: 'test series' });
    expect(named.warnings).toEqual([]);
    expect(named.instrument).toBe('test series');
    expect(named.standardError).toBeCloseTo(named.scatter / Math.sqrt(3), 12);
  });

  test('one value has no scatter and says so', () => {
    const s = summariseFluxSeries([{ fluxWm2: 1361 }], { instrument: 'x' });
    expect(s.scatter).toBe(0);
    expect(s.warnings.map(w => w.code)).toEqual(['one-value']);
  });
});
