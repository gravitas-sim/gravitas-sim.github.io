// =============================================================================
// The crossmatch kernel's behaviour (Prompt 263)
// -----------------------------------------------------------------------------
// The kernel's contract in small, fast cases: the epoch rule in closed form,
// the refusals before any match, the nearest and one-to-one pairing, the
// shifted-match estimate, the joined table and its record, and the populations.
// The ensembles, the independent oracle and the authentic packs are
// tools/crossmatch-validate.mjs, held to their committed bounds by
// tests/crossmatchResults.test.js.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import * as X from '../js/kernels/crossmatch/index.js';
import { stream } from '../js/random/streams.js';
import { validateArtifact } from '../js/platform/artifact.js';
import {
  NEVER_PRECACHED,
  buildManifest,
} from '../tools/build-service-worker.mjs';

const STEP = { raDeg: 1e-5, decDeg: 1e-5 };
const cat = (ra, dec, extra = {}) => ({
  ra,
  dec,
  epoch: 2000,
  positionStep: STEP,
  ...extra,
});
const arc = s => s / 3600;
const match = (a, b, o = {}) =>
  X.crossmatch(a, b, { radiusArcsec: 2, toEpoch: 2000, ...o });

describe('epoch propagation', () => {
  test('northward motion moves the declination by atan(mu dt) and nothing else', () => {
    const p = X.propagateCatalog(
      { ra: [10], dec: [30], epoch: 0, pmra: [0], pmdec: [450] },
      40
    );
    const s = 450 * X.MAS * 40;
    expect(p.ra[0]).toBeCloseTo(10, 12);
    expect(p.dec[0]).toBeCloseTo(30 + (Math.atan(s) * 180) / Math.PI, 12);
  });

  test('a zero interval returns the inputs bitwise and needs no proper motion', () => {
    const p = X.propagateCatalog(
      { ra: [12.5], dec: [-3.5], epoch: 2000 },
      2000
    );
    expect([p.ra[0], p.dec[0], p.excluded]).toEqual([12.5, -3.5, 0]);
  });

  test('variances add the proper-motion error times the interval', () => {
    const p = X.propagateCatalog(
      {
        ra: [10],
        dec: [20],
        epoch: 0,
        pmra: [3],
        pmdec: [-4],
        sigmaPosArcsec: 0.05,
        pmraErr: 0.3,
        pmdecErr: 0.3,
      },
      16
    );
    expect(p.sigmaRa[0] ** 2).toBeCloseTo(0.05 ** 2 + (0.3 * 16e-3) ** 2, 14);
  });

  test('a shift over one degree is refused, and the source past a pole turns by 180 degrees', () => {
    const big = X.propagateCatalog(
      { ra: [1], dec: [1], epoch: 0, pmra: [0], pmdec: [3.7e6] },
      1
    );
    expect(big.code).toBe('shift-too-large');
    const p = X.propagateCatalog(
      { ra: [33], dec: [90 - 1e-5], epoch: 0, pmra: [0], pmdec: [5] },
      25
    );
    expect(p.ra[0]).toBeCloseTo(213, 6);
    expect(p.dec[0]).toBeLessThan(90);
  });
});

describe('the refusals come before any match', () => {
  const ok = cat([0, 0.01, 0.02], [10, 10, 10]);
  test('an absent epoch, a missing proper motion and a bad radius', () => {
    expect(match({ ...ok, epoch: undefined }, ok).code).toBe('epoch');
    expect(match({ ...ok, epoch: 2016 }, ok).code).toBe('proper-motion');
    expect(match(ok, ok, { radiusArcsec: 10.0001 }).code).toBe('radius');
    expect(match(ok, ok, { radiusArcsec: 10 }).status).toBe('ok');
    expect(match(ok, ok, { radiusArcsec: 0 }).code).toBe('radius');
  });

  test('rounded or unstated positions are refused, with the step in the reason', () => {
    const rounded = cat([0, 1], [10, 10], {
      positionStep: { raDeg: 0.006, decDeg: 0.004 },
    });
    const r = match(rounded, ok);
    expect(r.code).toBe('rounded-positions');
    expect(r.why).toMatch(/arcsec/);
    expect(match({ ...ok, positionStep: undefined }, ok).code).toBe(
      'resolution'
    );
  });

  test('the rounding boundary is a quarter of the radius', () => {
    const at = e =>
      cat([0], [0], { positionStep: { raDeg: e / 3600, decDeg: e / 3600 } });
    expect(match(at(1), ok, { radiusArcsec: 2 }).status).toBe('ok');
    expect(match(at(1.1), ok, { radiusArcsec: 2 }).code).toBe(
      'rounded-positions'
    );
  });

  test('rows without a proper motion are counted, never matched at an unpropagated position', () => {
    const a = {
      ...cat([0, 0, 0], [10, 10, 10]),
      epoch: 2016,
      pmra: [1, NaN, 1],
      pmdec: [1, 1, 1],
    };
    expect(match(a, ok).excluded).toEqual({ a: 1, b: 0 });
  });
});

describe('the pairing', () => {
  const B = cat([0], [0]);
  test('nearest shares a row, one-to-one gives it to the nearer; a tie goes to the lower index', () => {
    const A = cat([0, 0], [arc(0.3), arc(-0.5)]);
    const n = match(A, B);
    expect(n.pairs.length).toBe(2);
    expect(n.shared).toBe(1);
    const o = match(A, B, { mode: 'oneToOne' });
    expect(o.pairs.map(p => p.a)).toEqual([0]);
    const tie = match(cat([0, 0], [arc(0.4), arc(-0.4)]), B, {
      mode: 'oneToOne',
    });
    expect(tie.pairs.map(p => p.a)).toEqual([0]);
  });

  test('a partner at the radius is matched and one just beyond is not', () => {
    expect(match(cat([0], [0]), cat([0], [arc(2)])).pairs.length).toBe(1);
    expect(match(cat([0], [0]), cat([0], [arc(2.0001)])).pairs.length).toBe(0);
  });

  test('the epoch rule decides the pair: a moving source matches only after propagation', () => {
    const A = {
      ...cat([10], [20]),
      epoch: 2016,
      pmra: [0],
      pmdec: [1000],
    };
    const b = cat([10], [20 - arc(16)]);
    expect(match(A, b, { radiusArcsec: 1 }).pairs.length).toBe(1);
    expect(match(cat([10], [20]), b, { radiusArcsec: 1 }).pairs.length).toBe(0);
  });

  test('the match distance carries its epoch difference and the propagated uncertainty', () => {
    const A = {
      ...cat([10], [20], { sigmaPosArcsec: 0.05, pmraErr: 0.3, pmdecErr: 0.3 }),
      epoch: 2016,
      pmra: [0],
      pmdec: [0],
    };
    const B = cat([10], [20 + arc(0.5)], { sigmaPosArcsec: 0.1 });
    const r = match(A, B);
    expect(r.pairs[0].epochDifferenceYr).toBe(16);
    expect(r.pairs[0].distanceArcsec).toBeCloseTo(0.5, 6);
    // the offset is north-south: the declination sigma of A is sqrt(.05^2 + (.3 * 16 / 1000)^2)
    expect(r.pairs[0].sigmaArcsec).toBeCloseTo(
      Math.sqrt(0.05 ** 2 + 0.0048 ** 2 + 0.1 ** 2),
      6
    );
  });
});

describe('the shifted-match estimate', () => {
  const grid = n =>
    Array.from({ length: n * n }, (_, i) => [
      10 + arc(5 * (i % n)),
      20 + arc(5 * Math.floor(i / n)),
    ]);
  test('a catalog matched to a shifted copy of itself has no counterparts, and the count is the chance of an unrelated neighbour', () => {
    const pts = grid(12);
    const a = cat(
      pts.map(p => p[0]),
      pts.map(p => p[1])
    );
    const r = match(a, a, {
      radiusArcsec: 1,
      falseMatch: { distanceArcsec: 20 },
    });
    // a regular 5 arcsec lattice shifted by 20 arcsec along a bearing of 0, 90, ... lands on lattice points
    expect(r.falseMatch.counts.length).toBe(8);
    expect(r.falseMatch.chance).toBeGreaterThan(0);
    expect(r.falseMatch.bound).toBe('upper');
    expect(r.falseMatch.warnings.join(' ')).toMatch(/footprint/);
  });

  test('a crowded field is called unreliable', () => {
    const draw = stream('noise', 'p263', 'test', 'crowd');
    const u = Array.from({ length: 4000 }, () => [
      10 + arc(1000 * draw()),
      20 + arc(1000 * draw()),
    ]);
    const a = cat(
      u.map(p => p[0]),
      u.map(p => p[1])
    );
    const r = match(a, a, { radiusArcsec: 10, falseMatch: {} });
    expect(r.falseMatch.status).toBe('unreliable');
  });
});

describe('the joined table and the record', () => {
  const A = {
    ...cat([10, 10.001], [20, 20.001]),
    epoch: 2016,
    pmra: [0, 0],
    pmdec: [0, 0],
    columns: [{ id: 'g', unit: 'mag', values: [15, 16] }],
  };
  const B = {
    ...cat([10, 10.001], [20, 20.001]),
    columns: [{ id: 'z', unit: '', values: [0.1, 0.2] }],
  };
  const r = match(A, B, { falseMatch: {} });
  test('one row per pair with the distance, the epoch difference and the pass-through columns', () => {
    const t = X.joinedTable(r, A, B, { passA: ['g'], passB: ['z'] });
    expect(t.n).toBe(2);
    expect(t.columns.map(c => c.id)).toEqual([
      'aIndex',
      'bIndex',
      'distance',
      'epochDifference',
      'a.g',
      'b.z',
    ]);
    expect(Array.from(t.columns[3].values)).toEqual([16, 16]);
    expect(() => X.joinedTable(r, A, B, { passA: ['nope'] })).toThrow();
  });

  test('the record is a valid artifact, two quantities a pair beyond the summary', () => {
    const rec = X.crossmatchRecord(r, {
      source: { kind: 'pipeline', id: 't' },
    });
    expect(validateArtifact(rec)).toEqual([]);
    expect(rec.quantities.filter(q => q.id.startsWith('pair')).length).toBe(4);
  });
});

describe('populations', () => {
  test('bins carry the statistics kernel Poisson interval and a refused edge list says why', () => {
    const d = X.distribution([0.5, 0.5, 1.5], { edges: [0, 1, 2] });
    expect(d.bins.map(b => b.count)).toEqual([2, 1]);
    expect(d.bins[1].intervalLo).toBeLessThan(1);
    expect(X.distribution([1], { edges: [2, 1] }).code).toBe('edges');
  });

  test('two samples are compared only from 30 values each', () => {
    const a = Array.from({ length: 30 }, (_, i) => i);
    expect(X.compareSamples(a.slice(0, 29), a).code).toBe('sample-size');
    const r = X.compareSamples(
      a,
      a.map(v => v + 5)
    );
    expect(r.status).toBe('ok');
    expect(r.value).toBeCloseTo(-5, 12);
    expect(r.p).toBeLessThan(0.05);
  });
});

describe('the pack readers', () => {
  test('the epoch and the rounding step come from the record, and are null when it states neither', () => {
    expect(X.epochFromFrame('ICRS, epoch J2016.0')).toBe(2016);
    expect(X.epochFromFrame('ICRS, epoch J2000')).toBe(2000);
    expect(X.epochFromFrame('ICRS')).toBeNull();
    expect(
      X.positionStepFromReductions([
        'Positions are rounded to 0.006 degree in right ascension and 0.004 degree in declination (22 and 14 arcsec).',
      ])
    ).toEqual({ raDeg: 0.006, decDeg: 0.004 });
    expect(
      X.positionStepFromReductions(['Positions are rounded to 0.00001 degree.'])
    ).toEqual({ raDeg: 1e-5, decDeg: 1e-5 });
    expect(X.positionStepFromReductions(['nothing here'])).toBeNull();
  });
});

describe('the lazy tier', () => {
  test('no page can fetch the kernel: it is never precached', async () => {
    expect(
      NEVER_PRECACHED.some(re => re.test('js/kernels/crossmatch/match.js'))
    ).toBe(true);
    const { paths } = await buildManifest();
    expect(paths.filter(p => p.startsWith('js/kernels/crossmatch/'))).toEqual(
      []
    );
  });
});
