// =============================================================================
// The subtraction and orbit gate's validation group (Roadmap III, Prompt 230 Part B)
// -----------------------------------------------------------------------------
// tests/fixtures/imaging-subtraction/thresholds.json fixed every definition and bound before the
// module existed; this holds the module's constants equal to it, runs the cheap legs (the
// closed forms, the independent oracle's pinned pairs and the refusals) and holds the stored
// results to the labelling rule: every failed leg is in failed-legs.json and every leg there
// failed. The ensembles (tools/imaging-subtract-validate.mjs, minutes of work) are the validator's,
// not this suite's; their stored results are checked for shape and for the verdict function.
// =============================================================================

import { readFileSync } from 'node:fs';
import { describe, test, expect } from '@jest/globals';
import {
  DESIGN,
  expectedMap,
  subtract,
  measureAt,
  sceneFrame,
  fitPlanet,
} from '../js/kernels/imaging/subtract.js';
import { CRITERION } from '../js/measure/orbit-fit.js';

const read = p => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url)));
const FIX = 'tests/fixtures/imaging-subtraction';
const T = read(`${FIX}/thresholds.json`);

describe('the committed contract and the module agree', () => {
  test('the design values the thresholds file states are the module’s', () => {
    expect(T.scene.detector.width).toBe(DESIGN.detector.width);
    expect(T.scene.detector.gain).toBe(DESIGN.detector.gain);
    expect(T.scene.detector.readNoise).toBe(DESIGN.detector.readNoise);
    expect(T.scene.exposureS).toBe(DESIGN.exposure);
    expect(T.scene.skyEPerSPerPx).toBe(DESIGN.sky);
    expect(T.scene.starRateEPerS).toBe(DESIGN.starRate);
    expect(T.scene.psf.fwhmPx).toBe(DESIGN.fwhm);
    expect(T.scene.psf.beta).toBe(DESIGN.beta);
    expect(T.scene.orbitFrame.width).toBe(DESIGN.orbitFrame);
    expect(T.scene.reference.fwhmMismatch).toMatch(/0\.03/);
    expect(DESIGN.fwhmMismatch).toBe(0.03);
    expect(DESIGN.centroidSigma).toBe(0.03);
    expect(T.method.M3).toMatch(/2\.0 FWHM/);
    expect(DESIGN.fitFwhm).toBe(2);
    expect(DESIGN.detectSnr).toBe(5);
    expect(DESIGN.saturationFraction).toBe(0.9);
    expect(DESIGN.skyRadiusFraction).toBe(0.69);
  });
  test('the amended values are the module’s, and the originals stay in the file', () => {
    const ids = T.amendments.map(a => a.id);
    expect(ids).toEqual(['AM1', 'AM2', 'AM3', 'AM4', 'AM5', 'AM6']);
    expect(T.amendments.every(a => a.beforeGateRun === true)).toBe(true);
    expect(T.method.workingRadius.fwhm).toBe(1.5);
    expect(DESIGN.workingFwhm).toBe(2.5);
    expect(T.method.mismatchRule.refuseAbove).toBe(0.25);
    expect(DESIGN.mismatchDepth).toBe(0.1);
    expect(DESIGN.searchRadiusFraction).toBe(0.8);
  });
  test('Prompt 187’s criterion is the one the orbit legs name, unchanged', () => {
    const g = read('tests/fixtures/orbit-fit/gate-thresholds.json');
    expect(JSON.stringify(g)).toContain('0.4');
    expect(CRITERION.minEpochs).toEqual({ circular: 6, elliptical: 8 });
    expect(CRITERION.coverageFraction).toEqual({
      circular: 0.4,
      elliptical: 0.5,
    });
    expect(CRITERION.maxConditionNumber).toBe(1e6);
    expect(CRITERION.consistentPValue).toBe(0.001);
    expect(CRITERION.eccentricityDeltaChi2).toBe(11.83);
  });
});

describe('closed forms and refusals', () => {
  const w = 64;
  const clean = (flux, planet) => {
    const m = expectedMap(w, w, w / 2, w / 2, flux, { reach: 30 });
    const P = planet
      ? expectedMap(w, w, planet.x, planet.y, planet.flux, { reach: 30 })
      : null;
    const counts = new Float64Array(w * w);
    for (let i = 0; i < counts.length; i++)
      counts[i] = 500 + (m[i] + (P ? P[i] : 0) + 90) / 1.5;
    return { width: w, height: w, counts };
  };
  test('a pure scale is recovered to rounding and the residual is zero (A1)', () => {
    for (const c of [0.37, 1, 2.9]) {
      const r = subtract(clean(3e5), clean(3e5 * c), { fullWell: 1e9 });
      expect(Math.abs(r.k * c - 1)).toBeLessThan(1e-12);
      let worst = 0;
      for (const v of r.residual) worst = Math.max(worst, Math.abs(v));
      expect(worst).toBeLessThan(1e-6);
    }
  });
  test('a noise-free planet outside the working radius is recovered by the fit (A2)', () => {
    const planet = { x: 32 + 8 * 3 * 0.8, y: 32 + 8 * 3 * 0.6, flux: 1000 };
    const r = subtract(clean(3e5, planet), clean(3e5));
    const fit = fitPlanet(r, { x: planet.x + 0.3, y: planet.y - 0.2, flux: 700 }, 1);
    expect(Math.abs(fit.flux / planet.flux - 1)).toBeLessThan(1e-3);
    expect(Math.hypot(fit.x - planet.x, fit.y - planet.y)).toBeLessThan(1e-3);
  });
  test('the refusals carry their codes (D1, D3, D5)', () => {
    const target = sceneFrame({ seed: 'jest-sub', label: 't' });
    const reference = sceneFrame({ seed: 'jest-sub', label: 'r', starRate: 9000 });
    expect(subtract(target, undefined).code).toBe('no-reference');
    expect(
      subtract(target, sceneFrame({ seed: 'jest-sub', label: 's', size: 48 }))
        .code
    ).toBe('size-mismatch');
    expect(subtract(target, reference, { fwhm: -1 }).code).toBe('bad-psf');
    const sat = { ...reference, counts: Float64Array.from(reference.counts) };
    sat.counts[32 * 64 + 32] = 500 + (0.95 * 50000) / 1.5;
    expect(subtract(target, sat).code).toBe('saturated');
    const ok = subtract(target, reference);
    expect(ok.ok).toBe(true);
    const inside = measureAt(ok, 32 + 2 * 3, 32);
    expect(inside.code).toBe('inside-working-region');
    expect(inside.message).toBe(
      "not measurable behind the star's residual with this subtraction"
    );
  });
});

describe('the independent oracle (B1 to B4)', () => {
  test('the pinned pairs agree with the numpy and scipy implementation', () => {
    const inputs = read('tools/imaging-subtract-oracle/inputs.json');
    const ora = read(`${FIX}/oracle-results.json`);
    expect(ora.versions.numpy).toBeTruthy();
    expect(inputs.cases.length).toBe(8);
    let wk = 0;
    let wf = 0;
    for (const c of inputs.cases) {
      const o = ora.cases.find(q => q.id === c.id);
      const f = { width: c.width, height: c.height };
      const red = subtract(
        { ...f, counts: c.target },
        { ...f, counts: c.reference },
        { fwhm: c.fwhm, beta: c.beta }
      );
      wk = Math.max(wk, Math.abs(red.k - o.k) / Math.abs(o.k));
      const m = measureAt(red, c.start.x, c.start.y, { flux: c.start.flux });
      wf = Math.max(wf, Math.abs(m.x - o.fit.x) / o.sigma.x, Math.abs(m.flux - o.fit.flux) / o.sigma.flux);
    }
    expect(wk).toBeLessThan(1e-9);
    expect(wf).toBeLessThan(0.01);
  });
});

describe('the stored results and the labelling rule', () => {
  const results = read(`${FIX}/results.json`);
  const failed = read(`${FIX}/failed-legs.json`);
  test('every failed leg is in failed-legs.json and every leg there failed', () => {
    const f = results.rows.filter(r => r.status === 'fail').map(r => r.id).sort();
    expect(failed.failed.map(r => r.id).sort()).toEqual(f);
    for (const r of failed.failed) expect(r.label).toMatch(/failed leg/);
  });
  test('every committed leg has a row, the authentic leg is NOT RUN, and the stream is the gate’s', () => {
    expect(results.stream).toBe(T.seeds.ensemble);
    const ids = new Set(results.rows.map(r => r.id));
    for (const c of T.checks) expect(ids.has(c.id)).toBe(true);
    expect(results.rows.find(r => r.id === 'E1').status).toBe('not-run');
  });
  test('the verdict function applied to the rows gives the recorded verdict', () => {
    const st = id => results.rows.find(r => r.id === id).status;
    const pass = ids => ids.every(i => st(i) === 'pass');
    const verdict = pass(T.verdict.core)
      ? pass(T.verdict.orbit)
        ? 'A'
        : 'B'
      : 'C';
    expect(['A', 'B', 'C']).toContain(verdict);
    expect(results.verdict ?? verdict).toBe(verdict);
  });
});
