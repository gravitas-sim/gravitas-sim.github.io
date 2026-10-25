// =============================================================================
// Crater counting (Prompt 195)
// -----------------------------------------------------------------------------
// tests/fixtures/craters/thresholds.json fixed every bound before
// js/measure/craters.js had been run. tools/craters-validate.mjs runs them in plain
// Node (Jest's VM makes Math reads about ten times slower, so the ensembles here
// would time the harness); this file runs it, holds every row to its bound, and
// adds what needs no ensemble: marks to a crater list, the boundary report of the
// diameters' own uncertainty, the table export, the assumptions a relative age
// carries, and the inputs that were not run (the cited crater-statistics tool and
// the reference regions' published counts).
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  AGE_ASSUMES,
  craterList,
  cumulative,
  defaultThresholds,
  diameterOf,
  powerLaw,
  relativeAge,
  toCsv,
} from '../js/measure/craters.js';
import { emptyState, place } from '../js/measure/marks.js';
import { readPlanes } from '../tools/data-packs/image-packs.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const THRESHOLDS = JSON.parse(
  readFileSync(
    path.join(ROOT, 'tests/fixtures/craters/thresholds.json'),
    'utf8'
  )
);
const km = { value: 0.5, sigma: 0.01, unit: 'km/pix' };

describe('the committed thresholds hold for the production module', () => {
  const ran = spawnSync(
    process.execPath,
    [path.join(ROOT, 'tools/craters-validate.mjs'), '--json'],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 24 }
  );
  const rows = JSON.parse(ran.stdout);

  test('every committed row passes and the two inputs that were not run say so', () => {
    expect(ran.status).toBe(0);
    for (const r of rows) {
      if (r.pass === null) continue;
      if (r.pass !== true)
        throw new Error(
          `${r.id}: ${r.measured} against ${JSON.stringify(r.bound)}`
        );
    }
    expect(rows.filter(r => r.pass === null).map(r => r.id)).toEqual([
      'b4.crater-tool',
      'b4.craterstats',
      'e.published',
      'e.frames',
    ]);
  });

  test('every check the thresholds name is run, or declared not run', () => {
    const ids = new Set(rows.map(r => r.id));
    for (const id of Object.keys(THRESHOLDS.checks)) {
      const ran = [...ids].some(
        r => r === id || r.startsWith(`${id.split('.')[0]}.`)
      );
      expect(ran).toBe(true);
    }
    for (const id of Object.keys(THRESHOLDS.notRun)) {
      // e1.authentic is superseded by part 2's e1 to e4 and its own NOT RUN rows
      if (id !== 'packs' && id !== 'e1.authentic')
        expect(ids.has(id)).toBe(true);
    }
  });

  test('the row set is stable', () => {
    expect(rows.length).toBeGreaterThan(120);
  });
});

describe('marks to a crater list', () => {
  const circle = (s, tag, centre, rim) =>
    place(s, { kind: 'circle', tag, pts: [centre, rim] });

  test('only circle marks of the tag count, with their diameters in km', () => {
    let s = emptyState();
    s = circle(s, 'crater', [100, 100], [140, 100]);
    s = circle(s, 'crater', [300, 300], [300, 380]);
    s = circle(s, 'other', [10, 10], [20, 10]);
    s = place(s, { kind: 'point', tag: 'crater', pts: [[5, 5]] });
    const r = craterList(s, { scale: km });
    expect(r.status).toBe('ok');
    expect(r.ignored).toBe(2);
    expect(r.craters.map(c => c.D)).toEqual([40, 80]);
    expect(r.craters[0].sigma).toBeGreaterThan(0);
  });

  test('a mark that cannot be measured refuses the call and is named', () => {
    let s = emptyState();
    s = circle(s, 'crater', [100, 100], [140, 100]);
    const r = craterList(s, { scale: { value: 3, unit: 'arcsec/pix' } });
    expect(r.status).toBe('refused');
    expect(r.code).toBe('scale-unit');
    expect(r.id).toBe('m1');
  });

  test('the budget is reported component by component and adds in quadrature', () => {
    const d = diameterOf(
      {
        kind: 'circle',
        pts: [
          [0, 0],
          [100, 0],
        ],
        sigma: 0.3,
      },
      { scale: km, recognition: 0.1 }
    );
    expect(Object.keys(d.budget)).toEqual([
      'scale',
      'fit',
      'recognition',
      'foreshortening',
    ]);
    expect(d.relative).toBeCloseTo(Math.hypot(...Object.values(d.budget)), 12);
    expect(d.lengthUnit).toBe('km');
  });
});

describe('the cumulative distribution', () => {
  test('the diameters own uncertainty is reported apart and never added to the interval', () => {
    const list = [20, 20.5, 19.5, 40].map(D => ({ D, sigma: 1 }));
    const plain = cumulative(
      list.map(c => c.D),
      { area: 100, thresholds: [20] }
    );
    const withSigma = cumulative(list, { area: 100, thresholds: [20] });
    expect(withSigma.rows[0].lo).toBe(plain.rows[0].lo);
    expect(withSigma.rows[0].hi).toBe(plain.rows[0].hi);
    const b = withSigma.rows[0].boundary;
    // 20 (p 0.5), 20.5 (p 0.6915), 19.5 (p 0.3085) and 40 (p 1): the expectation is 2.5,
    // the variance 0.25 + 2 * 0.6915 * 0.3085 = 0.6766
    expect(b.expected).toBeCloseTo(2.5, 12);
    expect(b.sd).toBeCloseTo(Math.sqrt(0.6766), 3);
    expect(plain.rows[0].boundary.sd).toBe(0);
  });

  test('the default thresholds step by the square root of two from dMin', () => {
    const t = defaultThresholds(4, 20);
    expect(t).toHaveLength(5);
    expect(t[2] / t[0]).toBeCloseTo(2, 12);
    expect(t.at(-1)).toBeLessThanOrEqual(20);
  });

  test('the table exports as comma-separated values', () => {
    const csv = toCsv(
      cumulative([5, 10, 20], { area: 50, thresholds: [5, 10] })
    );
    expect(csv.split('\n')).toEqual([
      'D_km,N,density_per_km2,lo_per_km2,hi_per_km2',
      expect.stringMatching(/^5,3,0\.06,/),
      expect.stringMatching(/^10,2,0\.04,/),
    ]);
  });

  test('the area is carried with its own sigma, outside the interval', () => {
    const r = cumulative([5, 6], {
      area: { km2: 100, relSigma: 0.1 },
      thresholds: [5],
    });
    expect(r.area.relSigma).toBe(0.1);
    expect(r.note).toMatch(/counting error only/);
  });
});

describe('the relative age says what it assumes and what it is not', () => {
  const mk = (n, A) => ({ craters: new Array(n).fill(5), area: A });

  test('a density ratio with its assumptions, and no age', () => {
    const r = relativeAge(mk(60, 100), mk(20, 100), { dMin: 2 });
    expect(r.verdict).toBe('a older');
    expect(r.assumes).toBe(AGE_ASSUMES);
    expect(AGE_ASSUMES.join(' ')).toMatch(/not an age in years/);
    expect(JSON.stringify(r)).not.toMatch(/"(age|ageGa|ageMa|absolute)"/i);
  });

  test('overlapping intervals return no significant difference', () => {
    const r = relativeAge(mk(12, 100), mk(9, 100), { dMin: 2 });
    expect(r.verdict).toBe('no significant difference');
    expect(r.lo).toBeLessThan(1);
    expect(r.hi).toBeGreaterThan(1);
  });

  test('the region that is smaller counts for more per square kilometre', () => {
    // equal counts, a is half the area: its density is twice b's
    const r = relativeAge(mk(40, 50), mk(40, 100), { dMin: 2 });
    expect(r.ratio).toBeCloseTo(2, 12);
    expect(r.verdict).toBe('a older');
  });

  test('a region naming its completeness limit refuses a smaller dMin', () => {
    const r = relativeAge({ ...mk(40, 50), completeFrom: 5 }, mk(40, 100), {
      dMin: 2,
    });
    expect(r.code).toBe('below-completeness');
    expect(r.why).toMatch(/region a/);
  });
});

describe('the index', () => {
  test('a break at twice dMin is flagged and a clean power law is not', () => {
    const clean = [];
    for (let i = 1; i <= 200; i++)
      clean.push((1 - (i - 0.5) / 200) ** (-1 / 2));
    expect(powerLaw(clean, { dMin: 1 }).constancy.flag).toBe(null);
    const broken = clean.filter((D, i) => D >= 2 || i % 3 === 0);
    expect(powerLaw(broken, { dMin: 1 }).constancy.flag).toBe(
      'slope-not-constant'
    );
  });

  test('the check is not run when fewer than five craters are above twice dMin', () => {
    const p = powerLaw([1.1, 1.2, 1.3, 1.4, 1.5, 3], { dMin: 1 });
    expect(p.status).toBe('ok');
    expect(p.constancy.status).toBe('not-run');
  });
});

describe('the four regions (part 2)', () => {
  const doc = JSON.parse(
    readFileSync(path.join(ROOT, 'frames/craters-regions.json'), 'utf8')
  );
  const regions = Object.entries(doc.regions);

  test('four regions, each list holds diameter, longitude and latitude and nothing else', () => {
    expect(regions.map(([id]) => id)).toEqual([
      'moon-highland',
      'moon-mare',
      'mars-highland',
      'mars-plains',
    ]);
    for (const [, r] of regions) {
      expect(r.craters.length).toBeGreaterThan(5);
      let last = Infinity;
      for (const c of r.craters) {
        expect(c).toHaveLength(3);
        const [D, lon, lat] = c;
        expect(D).toBeGreaterThanOrEqual(r.cutKm);
        expect(D).toBeLessThanOrEqual(last);
        last = D;
        expect(lon).toBeGreaterThanOrEqual(r.lonE[0]);
        expect(lon).toBeLessThan(r.lonE[1]);
        expect(lat).toBeGreaterThanOrEqual(r.lat[0]);
        expect(lat).toBeLessThan(r.lat[1]);
      }
    }
  });

  test('the credit and the rights decision are in the file', () => {
    expect(doc.credit.moon).toMatch(/Please cite authors/);
    expect(doc.credit.moon).toMatch(/NASA\/JPL\/USGS/);
    expect(doc.credit.mars).toMatch(/no licence is stated/);
    expect(doc.credit.mars).toMatch(/Robbins and B\. M\. Hynek 2012/);
  });

  test('each frame is a display-only plane of the recorded size, not blank', () => {
    for (const [id, r] of regions) {
      const text = readFileSync(path.join(ROOT, r.frame.file), 'utf8');
      const p = readPlanes(text);
      expect(p.id).toBe(`craters-${id}`);
      expect([p.width, p.height]).toEqual([r.frame.width, r.frame.height]);
      expect(r.frame.use).toBe('display-only');
      const box = r.frame.cropBoxPx;
      expect([box[2] - box[0], box[3] - box[1]]).toEqual([p.width, p.height]);
      const px = p.planes.display;
      expect(px.length).toBe(p.width * p.height);
      expect(new Set(px).size).toBeGreaterThan(50);
    }
  });

  test('the scale of each frame follows from its geometry', () => {
    const moon = doc.regions['moon-mare'].geometry;
    expect(moon.kmPerPixelAtCentre).toBeCloseTo(1737.4 / 859.5, 12);
    expect(moon.kmPerPixelSigma / moon.kmPerPixelAtCentre).toBeCloseTo(
      0.5 / 859.5,
      12
    );
    const mars = doc.regions['mars-plains'].geometry;
    expect(mars.kmPerPixel).toBeCloseTo(1, 3);
  });

  test('a mark on a regional frame reads a diameter through the foreshortening of its place', () => {
    // The Moon, orthographic: at 60 degrees of longitude on the equator the
    // radial direction is compressed by cos E = cos(60) = 0.5, so a radius of
    // 20 pixels along it is 40 on the ground.
    const g = doc.regions['moon-mare'].geometry;
    const d = diameterOf(
      {
        kind: 'circle',
        pts: [
          [0, 0],
          [20, 0],
        ],
        sigma: 0.3,
      },
      {
        scale: {
          value: g.kmPerPixelAtCentre,
          sigma: g.kmPerPixelSigma,
          unit: 'km/pix',
        },
        foreshortening: { cosE: 0.5, axis: 0 },
      }
    );
    expect(d.diameter).toBeCloseTo(2 * 40 * g.kmPerPixelAtCentre, 9);
  });
});
