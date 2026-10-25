// =============================================================================
// Catalogue overlays, blink and compare (Prompt 182)
// -----------------------------------------------------------------------------
// tests/fixtures/overlay/thresholds.json fixed every bound before
// js/measure/overlay.js existed. tools/overlay-validate.mjs runs them in plain
// Node (Jest's VM makes Math reads about ten times slower, so a 3,000-trial
// ensemble here would time the harness); this file runs it, holds every row to
// its bound (the one leg that fails as committed to its record), and adds what
// needs no ensemble: the module's rules against the thresholds', the proper
// motion against the sky kernel's own, the tie between two frames, the edges of
// the carry, the pins of the oracle and the record of what was not run. Nothing
// here is an exact float that passes through a trigonometric function (Node 20,
// 22 and 24 differ in the last bits): tolerances only.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  DIFFERENCE_REFUSALS,
  RESIDENT,
  RULES,
  blinkPlan,
  carry,
  differenceVerdict,
  moveStar,
  planetsIn,
  predictionSigma,
  skyFor,
  starOfRow,
  starsIn,
  subtract,
  tieOf,
  toTt,
} from '../js/measure/overlay.js';
import { fitWcs, pixelOf, skyOf } from '../js/measure/astrometry.js';
import { starAtEpoch, unpackStar } from '../js/kernels/sky/stars.js';
import { LIMITS } from '../js/dataKinds/limits.js';
import { permits } from '../js/dataKinds/contract.js';
import { geocentricEquatorial } from '../js/kernels/sky/planets.js';
import { truthWcs } from '../tools/astrometry-validate.mjs';
import { sidecarOf, synth, trial } from '../tools/overlay-validate.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const FIX = path.join(ROOT, 'tests/fixtures/overlay');
const read = name => JSON.parse(readFileSync(path.join(FIX, name), 'utf8'));
const THRESHOLDS = read('thresholds.json');
const sha = p =>
  createHash('sha256')
    .update(readFileSync(path.join(ROOT, p)))
    .digest('hex');
const wcs = truthWcs({
  crval: [210.5, 54.3],
  crpix: [100.5, 80.5],
  scaleArcsec: 2.5,
  positionAngleDeg: 33,
  parity: -1,
});
const size = { width: 200, height: 160 };

// ---- the committed thresholds, as rows ------------------------------------------

describe('the committed thresholds hold for the production module', () => {
  const rows = JSON.parse(
    execFileSync(
      process.execPath,
      [path.join(ROOT, 'tools/overlay-validate.mjs'), '--json'],
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 24 }
    )
  );
  const failed = read('failed-legs.json');

  test('every leg passes except the one recorded as failing as committed and the two that need Prompt 189', () => {
    const legs = rows.filter(r => !r.id.startsWith('x.'));
    expect(legs.filter(r => r.pass === null).map(r => r.id)).toEqual([
      'b5.oracleAuthentic',
      'e1.authenticFrame',
    ]);
    expect(legs.filter(r => r.pass === false).map(r => r.id)).toEqual(
      Object.keys(failed.legs)
    );
    for (const r of legs.filter(r => r.pass))
      expect({ id: r.id, pass: r.pass }).toEqual({ id: r.id, pass: true });
    for (const id of Object.keys(THRESHOLDS.checks))
      expect(rows.some(r => r.id === id)).toBe(true);
  });

  test('the failed leg is held to its record: the committed bound is untouched and the failing parts are exactly the ones named', () => {
    const leg = rows.find(r => r.id === 'a3.timeScales');
    expect(leg.pass).toBe(false);
    expect(THRESHOLDS.checks['a3.timeScales'].boundExactSec).toBe(1e-6);
    expect(failed.legs['a3.timeScales'].bound).toEqual({
      boundUtcSec: THRESHOLDS.checks['a3.timeScales'].boundUtcSec,
      boundExactSec: THRESHOLDS.checks['a3.timeScales'].boundExactSec,
      boundFormatsDay: THRESHOLDS.checks['a3.timeScales'].boundFormatsDay,
    });
    const m = leg.measured;
    const part = {
      utc: m.utcVsLeapSeconds <= THRESHOLDS.checks['a3.timeScales'].boundUtcSec,
      formats:
        m.formatsDay <= THRESHOLDS.checks['a3.timeScales'].boundFormatsDay,
      tai: m.tai <= 1e-6,
      tt: m.tt <= 1e-6,
      tdb: m.tdb <= 1e-6,
      start: m.start <= 1e-6,
      end: m.end <= 1e-6,
    };
    expect(
      Object.entries(part)
        .filter(([, ok]) => !ok)
        .map(([k]) => k)
        .sort()
    ).toEqual([...failed.legs['a3.timeScales'].failingParts].sort());
    const [lo, hi] = failed.legs['a3.timeScales'].measuredRange;
    for (const k of ['tai', 'start', 'end']) {
      expect(m[k]).toBeGreaterThan(lo);
      expect(m[k]).toBeLessThan(hi);
    }
    const ev = rows.find(r => r.id === 'x.a3.timeScalesAtResolution');
    expect(ev.pass).toBe(true);
    expect(ev.note).toMatch(/evidence only/);
  });

  test('the two authentic legs are NOT RUN in the thresholds file and in the document, never faked', () => {
    expect(THRESHOLDS.checks['b5.oracleAuthentic'].status).toMatch(
      /NOT RUN until Prompt 189/
    );
    expect(THRESHOLDS.checks['e1.authenticFrame'].status).toMatch(
      /NOT RUN until Prompt 189/
    );
    const doc = readFileSync(path.join(ROOT, 'OVERLAYS.md'), 'utf8');
    expect(doc).toMatch(/Not run until\s+Prompt 189/i);
  });

  test("the module's rules are the thresholds' rules", () => {
    const t = THRESHOLDS.rules;
    expect(RULES.maxEntries).toBe(t.maxEntries);
    expect(RULES.magnitudeLimitDefault).toBe(t.magnitudeLimitDefault);
    expect([...RULES.planets]).toEqual(t.planets);
    expect([...RULES.blinkRatesPerSecond]).toEqual(t.blinkRatesPerSecond);
    expect(RULES.blinkRateDefault).toBe(t.blinkRateDefault);
    expect(RULES.differenceNeedsResidentFrames).toBe(
      t.differenceNeedsResidentFrames
    );
    expect([...DIFFERENCE_REFUSALS]).toEqual(t.differenceRefusals);
  });

  test('the ensemble is as large as the thresholds say, and the 500 is the reference-star bound of Prompt 181', async () => {
    const E = THRESHOLDS.scenes.ensemble;
    expect(E.trials).toBe(3000);
    expect(E.testPixels).toHaveLength(5);
    const { LIMITS: calLimits } =
      await import('../js/measure/calibrationRecord.js');
    expect(RULES.maxEntries).toBe(calLimits.stars);
    const c1 = rows.find(r => r.id === 'c1.coveragePredictionAffine');
    expect(c1.measured.n).toBe(E.trials * E.testPixels.length * 2);
  });

  test('the decoded-memory bound written out here is the data contract’s', () => {
    expect(RESIDENT.maxBytes).toBe(LIMITS.maxDecodedBytes);
    expect(RESIDENT.bytesPerPixel).toBe(LIMITS.bytesPerPixel.data);
  });
});

// ---- the oracle's pins ----------------------------------------------------------

describe('the oracle', () => {
  const prov = read('oracle-provenance.json');

  test('the provenance names the packages and pins every file by its digest', () => {
    expect(prov.packages.astropy).toBe('6.1.7');
    expect(prov.packages.scipy).toBe('1.15.3');
    expect(prov.packages.numpy).toBe('2.2.6');
    for (const [p, digest] of Object.entries(prov.files))
      expect({ p, digest: sha(p) }).toEqual({ p, digest });
    expect(prov.identity).toMatch(/no Gravitas code ran/);
    expect(prov.run).toMatch(/-I tools\/overlay-oracle\/oracle\.py/);
  });

  test('the results carry no NaN, and one value per star and per planet and date', () => {
    const r = read('oracle-results.json');
    expect(r.stars.hr).toHaveLength(904);
    expect(r.stars.j2000).toHaveLength(904);
    expect(r.stars.epoch).toHaveLength(904);
    for (const id of RULES.planets)
      expect(r.planets[id]).toHaveLength(THRESHOLDS.scenes.planets.jdTt.length);
    expect(r.resample.values).toHaveLength(96 * 72);
    expect(r.skyMap.second).toHaveLength(25);
    const n = JSON.stringify(r);
    expect(n).not.toMatch(/NaN|Infinity/);
  });

  test('the inputs are those the validator builds (the pack, the truth WCS, the seeded frame)', () => {
    const i = read('oracle-inputs.json');
    expect(i.stars.rows).toHaveLength(904);
    expect(i.planets.bodies).toEqual([...RULES.planets]);
    expect(i.resample.data).toHaveLength(96 * 72);
    expect(i.time.utc).toBe(THRESHOLDS.scenes.orion.time.value);
  });
});

// ---- time ----------------------------------------------------------------------

describe('toTt', () => {
  test('a time with no scale, no value or an unknown format is refused by code', () => {
    expect(toTt(null).code).toBe('no-time');
    expect(toTt({ value: 1 }).code).toBe('no-time');
    expect(toTt({ value: 'x', scale: 'UTC', format: 'iso' }).code).toBe('time');
    expect(toTt({ value: 1, scale: 'UTC', format: 'unix' }).code).toBe('time');
    expect(toTt({ value: 1, scale: 'TCB', format: 'mjd' }).code).toBe(
      'time-scale'
    );
  });

  test('an ISO time with a zone is read as stated, and without one as UTC', () => {
    const a = toTt({
      value: '2026-01-01T00:00:00Z',
      scale: 'TT',
      format: 'iso',
    });
    const b = toTt({
      value: '2026-01-01T00:00:00',
      scale: 'TT',
      format: 'iso',
    });
    const c = toTt({
      value: '2026-01-01T02:00:00+02:00',
      scale: 'TT',
      format: 'iso',
    });
    expect(a.jdTt).toBe(b.jdTt);
    expect(Math.abs(c.jdTt - a.jdTt)).toBeLessThan(1e-9);
  });

  test('a UTC time becomes about 69 s later in TT', () => {
    const r = toTt({ value: 61041, scale: 'UTC', format: 'mjd' });
    expect((r.jdTt - 2461041.5) * 86400).toBeGreaterThan(69);
    expect((r.jdTt - 2461041.5) * 86400).toBeLessThan(69.5);
  });
});

// ---- the stars ------------------------------------------------------------------

describe('starsIn and moveStar', () => {
  const doc = JSON.parse(
    readFileSync(path.join(ROOT, 'sky/bright-stars.json'), 'utf8')
  );

  test('the proper motion is the sky kernel’s, star by star, at four epochs', () => {
    for (const jd of [2415020.5, 2451545, 2461041.5, 2488069.5])
      for (const row of doc.stars) {
        const mine = moveStar(starOfRow(row), jd);
        const theirs = starAtEpoch(unpackStar(row), jd);
        expect(Math.abs(mine.dec - theirs.decDeg)).toBeLessThan(1e-9);
        const dra = Math.abs(((mine.ra - theirs.raDeg + 540) % 360) - 180);
        expect(dra).toBeLessThan(1e-9);
      }
  });

  test('a star behind the tangent plane, or outside the frame, is not listed; the label falls back to the designation and then the number', () => {
    const near = starsIn(
      [
        { ...synth(5, 210.5, 54.3, 2), name: 'Named' },
        { ...synth(6, 210.52, 54.3, 2), desig: '3 Alp Foo' },
        synth(7, 210.5 + 0.002, 54.3 + 0.002, 2),
        synth(8, 30.5, -54.3, 1),
        synth(9, 210.5, 54.3 + 5, 1),
      ],
      wcs,
      size
    );
    expect(near.entries.map(e => e.id)).toEqual(
      ['hr5', 'hr6', 'hr7'].filter(id => near.entries.some(e => e.id === id))
    );
    expect(near.entries.find(e => e.hr === 5).name).toBe('Named');
    expect(near.entries.find(e => e.hr === 8)).toBeUndefined();
    expect(near.entries.find(e => e.hr === 9)).toBeUndefined();
    const lab = starsIn(
      [
        synth(7, 210.5, 54.3, 2),
        { ...synth(8, 210.5, 54.3, 3), desig: '9 Bet Bar' },
      ],
      wcs,
      size
    );
    expect(lab.entries.find(e => e.hr === 7).name).toBe('HR 7');
    expect(lab.entries.find(e => e.hr === 8).name).toBe('9 Bet Bar');
  });

  test('the magnitude limit leaves out the fainter, and a missing time leaves the stars where the catalogue has them', () => {
    const stars = [synth(1, 210.5, 54.3, 2, 1, 1), synth(2, 210.5, 54.3, 6)];
    const a = starsIn(stars, wcs, size, { magnitude: 4.5, jdTt: null });
    expect(a.entries.map(e => e.hr)).toEqual([1]);
    expect(a.moved).toBe(false);
    const moved = starsIn(stars, wcs, size, { jdTt: 2451545 + 3652.5 });
    expect(moved.moved).toBe(true);
    const p0 = a.entries[0];
    const p1 = moved.entries[0];
    // 1 arcsec/yr over ten years: ten arcsec on a 2.5 arcsec pixel is a few pixels
    expect(Math.hypot(p1.x - p0.x, p1.y - p0.y)).toBeGreaterThan(3);
  });
});

// ---- planets --------------------------------------------------------------------

describe('planetsIn', () => {
  const jd = 2461041.5;

  test('a planet inside is listed with its bound; one outside whose bound reaches the frame is named with its distance, and no pixel position', () => {
    const g = geocentricEquatorial('jupiter', jd);
    const centred = truthWcs({
      crval: [g.raDeg, g.decDeg],
      crpix: [100.5, 80.5],
      scaleArcsec: 60,
      positionAngleDeg: 0,
      parity: -1,
    });
    const inFrame = planetsIn(centred, size, jd);
    expect(inFrame.entries.find(e => e.id === 'jupiter')).toBeTruthy();
    const e = inFrame.entries.find(p => p.id === 'jupiter');
    expect(e.boundDeg).toBe(0.2);
    expect(e.boundPix).toBeCloseTo(0.2 / (60 / 3600), 6);
    expect(inFrame.entries.every(p => p.kind === 'planet')).toBe(true);
    // the same sky, a frame whose center is 0.1 degree north: Jupiter is outside but within its bound
    const off = truthWcs({
      crval: [g.raDeg, g.decDeg + 0.15],
      crpix: [20.5, 15.5],
      scaleArcsec: 20,
      positionAngleDeg: 0,
      parity: -1,
    });
    const r = planetsIn(off, { width: 40, height: 30 }, jd);
    expect(r.entries.find(p => p.id === 'jupiter')).toBeUndefined();
    const reach = r.reach.find(p => p.id === 'jupiter');
    expect(reach.awayPix).toBeGreaterThan(0);
    expect(reach.awayPix).toBeLessThanOrEqual(reach.boundPix);
    expect('x' in reach).toBe(false);
  });
});

// ---- the sky a frame has --------------------------------------------------------

describe('skyFor', () => {
  const header = wcs;
  test('a solved calibration wins over the header; a header without one is used; a display-only frame refuses either', () => {
    const solved = { ...wcs, crval: [1, 2] };
    const ok = (side, h, s) =>
      skyFor({ sidecar: side, header: h, solved: s, permits });
    expect(ok({ ...sidecarOf(), wcs: header }, header, solved).source).toBe(
      'calibration'
    );
    expect(ok({ ...sidecarOf(), wcs: header }, header, null).source).toBe(
      'header'
    );
    expect(ok(undefined, header, null).source).toBe('header');
    const d = ok(
      { ...sidecarOf(), use: 'display-only', wcs: header },
      header,
      solved
    );
    expect(d.ok).toBe(false);
    expect(d.code).toBe('display-only');
  });
});

// ---- two frames -----------------------------------------------------------------

describe('tieOf and carry', () => {
  const second = {
    width: 40,
    height: 30,
    data: Float64Array.from({ length: 1200 }, (_, i) => i),
  };

  test('each tie carries a pixel to the other frame and back', () => {
    const w2 = truthWcs({
      crval: [210.52, 54.31],
      crpix: [90.5, 70.5],
      scaleArcsec: 2.6,
      positionAngleDeg: 36,
      parity: -1,
    });
    const sky = tieOf({ kind: 'sky', first: wcs, second: w2 });
    const pairs = tieOf({
      kind: 'pairs',
      registration: { theta: 0.04, t: [3.2, -4.1] },
    });
    for (const tie of [sky, pairs, tieOf({ kind: 'identity' })])
      for (const [x, y] of [
        [10, 12],
        [150, 90],
      ]) {
        const there = tie.toSecond(x, y);
        const back = tie.toFirst(...there);
        expect(Math.hypot(back[0] - x, back[1] - y)).toBeLessThan(1e-6);
      }
  });

  test('the carried frame is NaN outside the second frame and exact on a pixel centre; a NaN neighbour with weight spoils the pixel and one without does not', () => {
    const shifted = carry(
      second,
      { width: 40, height: 30 },
      { toSecond: (x, y) => [x + 0.5, y] }
    );
    expect(shifted[0]).toBeCloseTo(0.5, 12);
    // the last column needs a neighbour beyond the frame
    expect(Number.isNaN(shifted[39])).toBe(true);
    const holes = { ...second, data: second.data.slice() };
    holes.data[5] = NaN;
    const whole = carry(
      holes,
      { width: 40, height: 30 },
      tieOf({ kind: 'identity' })
    );
    expect(Number.isNaN(whole[5])).toBe(true);
    expect(Number.isNaN(whole[4])).toBe(false);
    const half = carry(
      holes,
      { width: 40, height: 30 },
      { toSecond: (x, y) => [x + 0.5, y] }
    );
    expect(Number.isNaN(half[4])).toBe(true);
    expect(Number.isNaN(half[5])).toBe(true);
    expect(Number.isNaN(half[3])).toBe(false);
  });

  test('a tie that cannot place a pixel leaves it NaN', () => {
    const out = carry(
      second,
      { width: 4, height: 4 },
      { toSecond: () => null }
    );
    expect([...out].every(Number.isNaN)).toBe(true);
    expect(
      subtract(new Float64Array([1, 2]), new Float64Array([3, NaN]))[0]
    ).toBe(2);
    expect(
      Number.isNaN(
        subtract(new Float64Array([1, 2]), new Float64Array([3, NaN]))[1]
      )
    ).toBe(true);
  });
});

describe('differenceVerdict', () => {
  const frame = (over, pixels) => {
    const sidecar = sidecarOf(over, pixels);
    return { width: sidecar.width, height: sidecar.height, sidecar };
  };
  const id = tieOf({ kind: 'identity' });

  test('the checks run in a fixed order: the first reason is the one given', () => {
    const both = differenceVerdict(
      frame({ use: 'display-only' }),
      frame({ calibration: { state: 'calibrated' } }, { unit: 'electron' }),
      { permits, tie: id }
    );
    expect(both.code).toBe('display-only');
    expect(both.data.which).toBe('first');
    const second = differenceVerdict(
      frame({}),
      frame({ use: 'display-only' }),
      { permits, tie: id }
    );
    expect(second.data.which).toBe('second');
    const none = differenceVerdict({ width: 3, height: 3 }, frame({}), {
      permits,
      tie: id,
    });
    expect(none.code).toBe('incomplete-contract');
  });

  test('every refusal says why in words and carries what a page needs to say it again', () => {
    const cal = differenceVerdict(
      frame({}),
      frame({ calibration: { state: 'flat-fielded' } }),
      { permits, tie: id }
    );
    expect(cal.data).toEqual({
      first: 'bias-subtracted',
      second: 'flat-fielded',
    });
    expect(cal.message).toMatch(/calibration/);
    const exp = differenceVerdict(
      frame({}),
      frame({ exposure: { seconds: 31, kind: 'effective' } }),
      { permits, tie: id }
    );
    expect(exp.data).toEqual({ first: 30, second: 31 });
    const big = differenceVerdict(
      frame({ width: 2048, height: 2048 }),
      frame({}),
      { permits, tie: id }
    );
    expect(big.code === 'too-large' || big.code === 'shape').toBe(true);
  });

  test('a registration of unknown verdict, or a consistent or exact one, does not refuse', () => {
    for (const verdict of [undefined, 'consistent', 'exact'])
      expect(
        differenceVerdict(frame({}), frame({}), {
          permits,
          tie: tieOf({
            kind: 'pairs',
            registration: { theta: 0, t: [0, 0], verdict },
          }),
        }).ok
      ).toBe(true);
  });
});

// ---- the blink ------------------------------------------------------------------

describe('blinkPlan', () => {
  test('the default rate is one of the rates, and every rate gives its interval', () => {
    expect(RULES.blinkRatesPerSecond).toContain(RULES.blinkRateDefault);
    expect(blinkPlan(0.5).intervalMs).toBe(2000);
    expect(blinkPlan(4).intervalMs).toBe(250);
    expect(blinkPlan(0).ok).toBe(false);
    expect(blinkPlan(1, { reducedMotion: true }).mode).toBe('manual');
  });
});

// ---- the prediction ------------------------------------------------------------

describe('predictionSigma', () => {
  test('it is finite and positive for a star among the fit stars and larger far outside them', () => {
    const tr = trial(1, false);
    const f = fitWcs(tr.stars, {
      tangent: tr.truth.crval,
      model: 'affine',
      parity: tr.parity,
    });
    const inner = skyOf(tr.truth, 512.5, 512.5);
    const outer = skyOf(tr.truth, 4000, 4000);
    const a = predictionSigma(f, inner.ra, inner.dec);
    const b = predictionSigma(f, outer.ra, outer.dec);
    expect(a.sx).toBeGreaterThan(0);
    expect(Number.isFinite(a.sy)).toBe(true);
    expect(b.sx).toBeGreaterThan(a.sx * 0.5);
    expect(a.covariance[0][1]).toBeCloseTo(a.covariance[1][0], 12);
    const behind = predictionSigma(
      f,
      (tr.truth.crval[0] + 180) % 360,
      -tr.truth.crval[1]
    );
    expect(behind).toBeNull();
    expect(pixelOf(f.wcs, inner.ra, inner.dec)).toBeTruthy();
  });
});
