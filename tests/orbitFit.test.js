// =============================================================================
// Orbit fitting with identifiability, and moving-object tracks (Prompt 187)
// -----------------------------------------------------------------------------
// tests/fixtures/orbit-fit/gate-thresholds.json (Part A) and thresholds.json (Part
// B) fixed every bound before the production modules had been run.
// tools/orbit-fit-validate.mjs runs them in plain Node (Jest's VM makes Math reads
// about ten times slower, so an ensemble here would time the harness); this file
// runs it and holds every row to its bound, holds the gate's recorded verdict to
// its text, and adds what needs no ensemble: the criterion's refusals with their
// codes and data, the nested depth, the mass sum, the record and its replay, the
// envelope, and the track's codes. Nothing here is an exact float that passes
// through a trigonometric function (Node 20, 22 and 24 differ in the last bits).
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  CRITERION,
  KEPLER_K,
  STEP,
  csvRows,
  elementsFromThieleInnes,
  epochYear,
  fitOrbit,
  fitRecordOf,
  massSum,
  orbitCurve,
  positionsFromElements,
  positionsViaLayer,
  prepare,
  quantitiesOf,
  reductionOf,
  replay,
  thieleInnesOf,
} from '../js/measure/orbit-fit.js';
import * as track from '../js/measure/mover-track.js';
import { artifact, validateArtifact } from '../js/platform/artifact.js';
import { num } from '../js/csv.js';
import { gaussian, stream } from '../js/random/streams.js';
import {
  canonical,
  evenYears,
  jitteredYears,
  makeOrbitSeries,
} from '../tools/orbit-fit-synth.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = name =>
  JSON.parse(
    readFileSync(path.join(ROOT, 'tests/fixtures/orbit-fit', name), 'utf8')
  );
const THRESHOLDS = read('thresholds.json');
const GATE = read('gate-thresholds.json');
const GATE_RESULTS = read('gate-results.json');

/** The one committed leg that fails: selection by the S/N rule makes the accepted intervals over-cover. */
const KNOWN_FAILED = ['c3.mass.snr4.68'];

describe('the committed thresholds hold for the production modules', () => {
  // The tool exits 1 while the known failed leg fails; the rows are what is judged.
  const ran = spawnSync(
    process.execPath,
    [path.join(ROOT, 'tools/orbit-fit-validate.mjs'), '--json'],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 24 }
  );
  const rows = JSON.parse(ran.stdout).rows;

  test('every committed row passes but the one known failed leg, and the authentic leg is not run', () => {
    for (const r of rows) {
      if (r.id === 'e1.authentic' || r.evidence) continue;
      if (KNOWN_FAILED.includes(r.id)) continue;
      expect({ id: r.id, pass: r.pass }).toEqual({ id: r.id, pass: true });
    }
    const e1 = rows.find(r => r.id === 'e1.authentic');
    expect(e1.pass).toBeNull();
    expect(e1.note).toMatch(/NOT RUN: no authentic arc pack exists/);
    expect(ran.status).toBe(1);
  });

  test('the failed leg stays failed, as measured, with its cause on record', () => {
    const r = rows.find(x => x.id === KNOWN_FAILED[0]);
    expect(r.pass).toBe(false);
    expect(r.bound).toEqual([0.6, 0.76]);
    // selection on the observed S/N explains it: 0.6827 / 0.8413 = 0.811, plus the orbit's own error
    expect(r.measured).toBeGreaterThan(0.76);
    expect(r.measured).toBeLessThan(0.88);
    const e = rows.find(x => x.id === 'c3.mass.snr4.selection');
    expect(e.evidence).toBe(true);
    expect(e.note).toMatch(/0\.811/);
  });

  test('every committed check has rows', () => {
    for (const id of Object.keys(THRESHOLDS.checks)) {
      expect(
        rows.filter(r => r.id.startsWith(`${id}.`) || r.id === id).length
      ).toBeGreaterThan(0);
    }
  });

  test('the ensembles are the committed size', () => {
    const c = THRESHOLDS.checks;
    expect(c['c1.coverage'].trials).toBe(250);
    expect(c['c2.circular'].trials).toBe(250);
    expect(GATE.testSet.trialsPerCell).toBe(400);
    expect(GATE_RESULTS.trials).toBe(400);
    expect(GATE_RESULTS.tag).toBe('gate');
  });

  test('the corpus orbit at exactly regular epochs is refused as ambiguous, and the evidence says so', () => {
    const e = rows.find(x => x.id === 'b1.corpus.regular');
    expect(e.measured).toBe('period-ambiguous');
  });
});

describe('the gate, as recorded', () => {
  test('the criterion of the modules is the committed one', () => {
    const g = GATE.criterion;
    expect(CRITERION.minEpochs).toEqual(g.minEpochs);
    expect(CRITERION.coverageFraction).toEqual(g.coverageFraction);
    expect(CRITERION.maxConditionNumber).toBe(g.maxConditionNumber);
    expect(CRITERION.eccentricityDeltaChi2).toBe(g.eccentricityDeltaChi2);
    expect(CRITERION.consistentPValue).toBe(g.consistentPValue);
  });

  test('the verdict function gives A on the recorded legs, and every leg passes', () => {
    expect(GATE_RESULTS.verdict).toBe('A');
    for (const depth of ['circular', 'elliptical'])
      for (const [leg, v] of Object.entries(GATE_RESULTS.legs[depth]))
        expect({ depth, leg, pass: v.pass }).toEqual({
          depth,
          leg,
          pass: true,
        });
  });

  test('the short arcs refused every trial, on the committed stream', () => {
    for (const depth of ['circular', 'elliptical'])
      for (const arc of ['0.1', '0.3'])
        expect(GATE_RESULTS.cells[depth][arc].accepted).toBe(0);
    expect(GATE_RESULTS.g5.refusalRate).toBe(1);
  });

  test('the amendment is recorded and moved no bound', () => {
    expect(GATE.amendments).toHaveLength(1);
    expect(GATE.amendments[0].moved).toMatch(/no criterion constant/);
    expect(GATE.testSet.jitterFractionOfSpacing).toBe(0.3);
  });
});

// ---- the fitter, on a few series --------------------------------------------------

const truth = {
  a: 1,
  e: 0.5,
  i: 70,
  Omega: 200,
  omega: 40,
  P: 10,
  T: 2003,
};
const u = stream('noise', 'orbit-fit-test');
const full = makeOrbitSeries(truth, jitteredYears(2000, 11, 12, u), {
  sigma: 0.02,
  seed: 'full',
  label: 'orbit-fit-test',
});

describe('a full-period arc returns elements, with the node folded and stated', () => {
  const r = fitOrbit(full, { depth: 'elliptical' });

  test('the elements are the truth within their stated errors', () => {
    expect(r.ok).toBe(true);
    expect(r.kind).toBe('thiele-innes-orbit');
    const c = canonical(truth);
    const z = (q, v) => Math.abs(q.value - v) / q.sigma;
    expect(z(r.elements.P, truth.P)).toBeLessThan(4);
    expect(z(r.elements.a, truth.a)).toBeLessThan(4);
    expect(z(r.elements.e, truth.e)).toBeLessThan(4);
    expect(z(r.elements.i, truth.i)).toBeLessThan(4);
    expect(z(r.elements.Omega, c.Omega)).toBeLessThan(4);
    expect(r.elements.Omega.value).toBeGreaterThanOrEqual(0);
    expect(r.elements.Omega.value).toBeLessThan(180);
    expect(r.nodeAmbiguity).toBe(true);
    expect(r.eccentricity.detected).toBe(true);
    expect(r.criterion.condition).toBeLessThan(CRITERION.maxConditionNumber);
    expect(r.criterion.coverageLower).toBeGreaterThan(
      CRITERION.coverageFraction.elliptical
    );
  });

  test('the period carries a closed profile interval, wider at 95 than at 68 percent', () => {
    const P = r.elements.P;
    expect(P.interval68[0]).toBeLessThan(P.value);
    expect(P.interval68[1]).toBeGreaterThan(P.value);
    expect(P.interval95[0]).toBeLessThan(P.interval68[0]);
    expect(P.interval95[1]).toBeGreaterThan(P.interval68[1]);
  });

  test('the closed form, the 3-D kernel and the layer agree on the orbit', () => {
    const ys = [2000.5, 2003.1, 2007.7, 2012];
    const el = { ...truth };
    const a = positionsFromElements(el, ys);
    const b = positionsViaLayer(el, ys);
    a.forEach((p, i) => {
      expect(Math.abs(p.x - b[i].x)).toBeLessThan(1e-9);
      expect(Math.abs(p.y - b[i].y)).toBeLessThan(1e-9);
    });
    const curve = orbitCurve(r, 24);
    expect(curve).toHaveLength(25);
    expect(
      Math.hypot(curve[0].x - curve[24].x, curve[0].y - curve[24].y)
    ).toBeLessThan(0.05);
  });

  test('the Thiele-Innes constants give the elements back', () => {
    const ti = thieleInnesOf(truth);
    const back = elementsFromThieleInnes(ti);
    const c = canonical(truth);
    expect(back.a).toBeCloseTo(truth.a, 12);
    expect(back.i).toBeCloseTo(truth.i, 9);
    expect(back.Omega).toBeCloseTo(c.Omega, 9);
    expect(back.omega).toBeCloseTo(c.omega, 9);
  });
});

describe('a short arc refuses, with the code, the numbers and no elements', () => {
  const years = jitteredYears(
    2000,
    0.3 * truth.P,
    12,
    stream('noise', 'orbit-fit-test', 'short')
  );
  const short = makeOrbitSeries(truth, years, {
    sigma: 0.02,
    seed: 'short',
    label: 'orbit-fit-test',
  });

  test('both depths say not constrained and return no elements', () => {
    for (const depth of ['elliptical', 'circular']) {
      const r = fitOrbit(short, { depth });
      expect(r.ok).toBe(false);
      expect(r.status).toBe('not-constrained');
      expect(['coverage', 'conditioning', 'period-unbounded']).toContain(
        r.code
      );
      expect(r.elements).toBeUndefined();
      expect(typeof r.message).toBe('string');
    }
  });

  test('the refusal carries the coverage it measured and the one it needed', () => {
    const r = fitOrbit(short, { depth: 'elliptical' });
    if (r.code === 'coverage') {
      expect(r.data.coverageLower).toBeLessThan(r.data.coverageNeeded);
      expect(r.data.coverageNeeded).toBe(0.5);
    }
  });

  test('too few epochs, malformed rows and an unknown depth are refused with their codes', () => {
    const few = { epochs: full.epochs.slice(0, 5) };
    expect(fitOrbit(few, { depth: 'elliptical' })).toMatchObject({
      code: 'epochs',
      data: { epochs: 5, need: 8 },
    });
    expect(
      fitOrbit({ epochs: full.epochs.slice(0, 4) }, { depth: 'circular' }).code
    ).toBe('epochs');
    expect(fitOrbit(full, { depth: 'parabolic' }).code).toBe('depth');
    expect(prepare({ epochs: [] }).code).toBe('bad-series');
    const bad = { epochs: full.epochs.map(e => ({ ...e })) };
    bad.epochs[3].sigma = -1;
    expect(prepare(bad).code).toBe('bad-sigma');
    bad.epochs[3] = { ...full.epochs[3], rxy: 1.2 };
    expect(prepare(bad).code).toBe('bad-sigma');
  });

  test('an exactly regular cadence is refused as period-ambiguous', () => {
    const regular = makeOrbitSeries(truth, evenYears(2000, 11, 12), {
      sigma: 0.02,
      seed: 'regular',
      label: 'orbit-fit-test',
    });
    const r = fitOrbit(regular, { depth: 'elliptical' });
    expect(r.ok).toBe(false);
    expect(['period-ambiguous', 'inconsistent']).toContain(r.code);
  });

  test('uncertainties that are too small are refused as inconsistent', () => {
    const tight = {
      epochs: full.epochs.map(e => ({ ...e, sigma: e.sigma * 0.3 })),
    };
    expect(fitOrbit(tight, { depth: 'elliptical' }).code).toBe('inconsistent');
  });
});

describe('the circular depth, and the eccentric depth that finds no eccentricity', () => {
  const circ = { a: 1, e: 0, i: 50, Omega: 100, omega: 60, P: 8, T: 2000 };
  const s = makeOrbitSeries(
    circ,
    jitteredYears(2000, 9, 12, stream('noise', 'orbit-fit-test', 'c')),
    {
      sigma: 0.02,
      seed: 'circ',
      label: 'orbit-fit-test',
    }
  );

  test('the circular fit recovers a circle, and says the latitude is at the reference epoch', () => {
    const r = fitOrbit(s, { depth: 'circular' });
    expect(r.ok).toBe(true);
    expect(r.kind).toBe('circular-apparent-orbit');
    expect(r.elements.e.value).toBe(0);
    expect(r.elements.T).toBeNull();
    expect(r.elements.omega.meaning).toBe('latitude-at-reference');
    expect(Math.abs(r.elements.P.value - circ.P)).toBeLessThan(
      4 * r.elements.P.sigma
    );
  });

  test('asked for an eccentric orbit, the data return the circle and an upper limit on e', () => {
    const r = fitOrbit(s, { depth: 'elliptical' });
    expect(r.ok).toBe(true);
    expect(r.kind).toBe('circular-apparent-orbit');
    expect(r.requested).toBe('elliptical');
    expect(r.eccentricity.detected).toBe(false);
    expect(r.eccentricity.upper95).toBeGreaterThan(0);
    expect(r.eccentricity.upper95).toBeLessThan(0.97);
  });

  test('the circular model refuses an eccentric orbit', () => {
    const r = fitOrbit(
      makeOrbitSeries(
        { ...truth, e: 0.7 },
        jitteredYears(2000, 11, 12, stream('noise', 'orbit-fit-test', 'ecc')),
        {
          sigma: 0.02,
          seed: 'ecc',
          label: 'orbit-fit-test',
        }
      ),
      { depth: 'circular' }
    );
    expect(r.ok).toBe(false);
    expect(['inconsistent', 'coverage', 'conditioning']).toContain(r.code);
  });
});

describe('epochs and positions', () => {
  test('years, Besselian years, Julian dates and modified Julian dates agree', () => {
    const jd = 2451545.0 + 365.25 * 5;
    const y = epochYear({ value: jd, format: 'jd' });
    expect(y).toBeCloseTo(2005, 9);
    expect(epochYear({ value: jd - 2400000.5, format: 'mjd' })).toBeCloseTo(
      y,
      9
    );
    expect(epochYear({ value: 2005, format: 'year' })).toBe(2005);
    expect(
      Math.abs(epochYear({ value: 1950, format: 'byear' }) - 1950)
    ).toBeLessThan(0.01);
    expect(epochYear({ value: 'x', format: 'jd' })).toBeNull();
    expect(epochYear({ value: 1, format: 'sol' })).toBeNull();
  });

  test('a separation and angle become offsets with their covariance, and a mean epoch', () => {
    const p = prepare({
      epochs: [
        {
          time: { value: 2000, format: 'year' },
          rho: 1,
          theta: 90,
          sigmaRho: 0.01,
          sigmaTheta: 1,
        },
        {
          time: { value: 2002, format: 'year' },
          rho: 1,
          theta: 0,
          sigmaRho: 0.01,
          sigmaTheta: 1,
        },
      ],
    });
    expect(p.ok).toBe(true);
    expect(p.x[0]).toBeCloseTo(0, 12);
    expect(p.y[0]).toBeCloseTo(1, 12);
    expect(p.x[1]).toBeCloseTo(1, 12);
    expect(p.tRef).toBeCloseTo(2001, 9);
    // at 90 degrees the radial error is along east, the tangential along north
    expect(p.sy[0]).toBeCloseTo(0.01, 9);
    expect(p.sx[0]).toBeCloseTo(Math.PI / 180, 9);
  });
});

describe('the mass sum', () => {
  const circ = { a: 1, e: 0, i: 50, Omega: 100, omega: 60, P: 8, T: 2000 };
  const fit = fitOrbit(
    makeOrbitSeries(
      circ,
      jitteredYears(2000, 9, 12, stream('noise', 'orbit-fit-test', 'm')),
      {
        sigma: 0.02,
        seed: 'mass',
        label: 'orbit-fit-test',
      }
    ),
    { depth: 'circular' }
  );
  const good = { value: 100, sigma: 5, unit: 'mas', frame: 'relative' };

  test('Kepler, the frame statement and the intervals', () => {
    const m = massSum(fit, good);
    expect(m.ok).toBe(true);
    // a = 1 arcsec at 0.1 arcsec of parallax is 10 au; P = 8 years
    const expected =
      (KEPLER_K * (fit.elements.a.value / 0.1) ** 3) /
      fit.elements.P.value ** 2;
    expect(m.value / expected).toBeCloseTo(1, 9);
    expect(m.intervals[0].lo).toBeLessThan(m.value);
    expect(m.intervals[0].hi).toBeGreaterThan(m.value);
    expect(m.intervals[1].lo).toBeLessThan(m.intervals[0].lo);
    expect(m.frameStatement).toMatch(/relative to the reference stars/);
    expect(m.method).toMatch(/Monte Carlo/);
  });

  test('it is reproducible, and refuses what it cannot say', () => {
    expect(massSum(fit, good)).toEqual(massSum(fit, good));
    expect(massSum(fit, { ...good, value: 12 }).code).toBe('parallax-weak');
    expect(massSum(fit, { ...good, frame: undefined }).code).toBe('frame');
    expect(massSum(fit, { ...good, frame: 'absolute' }).code).toBe('frame');
    expect(massSum(fit, { ...good, value: -1 }).code).toBe('parallax');
    expect(massSum({ ok: false }, good).code).toBe('no-orbit');
    expect(massSum(fit, { ...good, unit: 'furlong' }).code).toBe('parallax');
  });
});

describe('the record', () => {
  const r = fitOrbit(full, { depth: 'elliptical' });

  test('the quantities and the fit-result validate in an envelope, the period as a profile interval', () => {
    const m = massSum(r, { value: 100, sigma: 4, frame: 'relative' });
    const q = quantitiesOf(r, m);
    const env = artifact({
      id: 'orbit-1',
      source: { kind: 'analysis', id: 'orbit', digest: 'ab'.repeat(8) },
      quantities: q,
      fit: fitRecordOf(r),
      provenance: { reductions: [{ step: STEP }] },
      made: { app: 'gravitas', tool: STEP },
    });
    expect(validateArtifact(env)).toEqual([]);
    const P = q.find(x => x.id === 'orbit.P');
    expect(P.uncertainty.kind).toBe('interval');
    expect(P.uncertainty.basis).toBe('profile');
    expect(P.unit).toBe('yr');
    expect(q.find(x => x.id === 'orbit.mass').uncertainty.kind).toBe(
      'interval'
    );
    expect(q.find(x => x.id === 'orbit.a').unit).toBe('mas');
  });

  test('the record replays to the same numbers', () => {
    const red = reductionOf(full, r);
    expect(red.step).toBe(STEP);
    expect(replay(red)).toMatchObject({ ok: true, agrees: true });
    expect(replay({ step: 'other' }).code).toBe('record');
  });

  test('the CSV has a header and a row for each epoch', () => {
    const rows = csvRows(
      r,
      ['n', 'year', 'x', 'y', 'dx', 'dy', 'zx', 'zy'],
      num
    );
    expect(rows).toHaveLength(13);
    expect(rows[1]).toHaveLength(8);
  });
});

// ---- the moving-object track -----------------------------------------------------------

describe('the moving-object track', () => {
  const g = gaussian(stream('noise', 'orbit-fit-test', 'track'));
  const sigma = 0.05;
  const stat = Array.from({ length: 12 }, (_, k) => ({
    x: 7 * k + 3,
    y: 90 - 5 * k,
  }));
  const frames = (movers, n = 5) =>
    Array.from({ length: n }, (_, f) => ({
      time: { value: 2460000.5 + (f * 0.5) / 24, format: 'jd', scale: 'tdb' },
      sources: [
        ...stat.map(s => ({
          x: s.x + g() * sigma,
          y: s.y + g() * sigma,
          sigma,
        })),
        ...movers.map(m => ({
          x: m.x + m.vx * f * 0.5 + g() * sigma,
          y: m.y + m.vy * f * 0.5 + g() * sigma,
          sigma,
        })),
      ],
    }));

  test('the mover is found among the static sources, with its rate and angle', () => {
    const r = track.findMover(frames([{ x: 20, y: 20, vx: 0.6, vy: 0.8 }]));
    expect(r.ok).toBe(true);
    expect(r.staticSources).toBe(12);
    expect(Math.abs(r.rate.value - 1)).toBeLessThan(5 * r.rate.sigma);
    // east 0.6, north 0.8: 36.87 degrees from north through east
    expect(Math.abs(r.positionAngle.value - 36.87)).toBeLessThan(
      5 * r.positionAngle.sigma
    );
    expect(r.positionAngle.local).toBe(false);
    expect(r.frames).toBe(5);
    expect(r.residuals).toHaveLength(5);
  });

  test('the codes: no mover, two movers, two frames, a slow one', () => {
    expect(track.findMover(frames([])).code).toBe('no-mover');
    const two = track.findMover(
      frames([
        { x: 20, y: 20, vx: 0.6, vy: 0.8 },
        { x: 60, y: 10, vx: -0.7, vy: 0.2 },
      ])
    );
    expect(two.code).toBe('several-movers');
    expect(two.data.movers).toHaveLength(2);
    expect(
      track.findMover(frames([{ x: 20, y: 20, vx: 0.6, vy: 0.8 }], 2)).code
    ).toBe('too-few-frames');
    expect(
      track.findMover(frames([{ x: 20, y: 20, vx: 0.02, vy: 0.02 }])).code
    ).toBe('no-mover');
    expect(track.findMover([]).code).toBe('no-frames');
    const bad = frames([]);
    bad[1].sources[0].sigma = 0;
    expect(track.findMover(bad).code).toBe('bad-sigma');
  });

  test('sky positions give a local position angle and a plane angle', () => {
    const sky = frames([{ x: 20, y: 20, vx: 0.6, vy: 0.8 }]).map(f => ({
      time: f.time,
      sources: f.sources.map(s => ({
        ra: 150 + s.x / 3600 / Math.cos((20 * Math.PI) / 180),
        dec: 20 + s.y / 3600,
        sigma: s.sigma,
      })),
    }));
    const r = track.findMover(sky);
    expect(r.ok).toBe(true);
    expect(r.positionAngle.local).toBe(true);
    expect(
      Math.abs(r.positionAngle.value - r.positionAngle.plane)
    ).toBeLessThan(0.05);
  });

  test('the quantities validate in an envelope and the record replays', () => {
    const f = frames([{ x: 20, y: 20, vx: 0.6, vy: 0.8 }]);
    const r = track.findMover(f);
    const env = artifact({
      id: 'track-1',
      source: { kind: 'analysis', id: 'track', digest: 'cd'.repeat(8) },
      quantities: track.quantitiesOf(r),
      provenance: { reductions: [{ step: track.STEP }] },
      made: { app: 'gravitas', tool: track.STEP },
    });
    expect(validateArtifact(env)).toEqual([]);
    expect(track.replay(track.reductionOf(f, r))).toMatchObject({
      ok: true,
      agrees: true,
    });
    expect(track.replay({ step: 'x' }).code).toBe('record');
  });
});
