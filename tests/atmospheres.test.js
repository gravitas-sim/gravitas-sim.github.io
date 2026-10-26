// =============================================================================
// The atmospheres kernel (Prompt 200)
// -----------------------------------------------------------------------------
// tests/fixtures/atmospheres/thresholds.json fixed every bound before
// js/kernels/atmospheres/ had been run (Prompt 199's bounds, carried over).
// tools/atmospheres-validate.mjs runs them in plain Node (Jest's VM makes Math
// reads about ten times slower); this file runs it, holds every row to its
// bound, and adds the worked examples, the two models' disagreement, the
// refusals and the pack's provenance and vocabulary.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import * as K from '../js/kernels/atmospheres/index.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const text = f => readFileSync(path.join(ROOT, f), 'utf8');
const THRESHOLDS = JSON.parse(
  text('tests/fixtures/atmospheres/thresholds.json')
);

describe('the committed thresholds hold for the production module', () => {
  const ran = spawnSync(
    process.execPath,
    [path.join(ROOT, 'tools/atmospheres-validate.mjs'), '--json'],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 24 }
  );
  const rows = JSON.parse(ran.stdout || '[]');

  test('the tool exits 0 and every row passes, tier (c) stated and not run', () => {
    expect(ran.status).toBe(0);
    expect(rows.length).toBeGreaterThan(40);
    for (const r of rows) {
      if (r.pass === null) continue;
      if (r.pass !== true)
        throw new Error(
          `${r.id}: ${r.measured} against ${JSON.stringify(r.bound)}`
        );
    }
    expect(rows.filter(r => r.pass === null).map(r => r.id)).toEqual([
      'c.uncertainty',
    ]);
  });

  test('every committed check has a row (none silently dropped)', () => {
    for (const id of Object.keys(THRESHOLDS.checks)) {
      const prefix = id.split('.')[0];
      expect(rows.some(r => r.id.startsWith(prefix))).toBe(true);
    }
  });

  test('the Eddington top is 3.66 percent warm against the exact grey solution, inside its stated 4.0', () => {
    const r = rows.find(x => x.id === 'b1.eddington');
    expect(r.measured).toBeGreaterThan(0.0365);
    expect(r.measured).toBeLessThan(0.0367);
    expect(r.bound).toBe(0.04);
  });
});

describe('the models, worked', () => {
  test('Earth: 254 K emission, and the one-layer emissivity and the grey depth that make 288 K differ', () => {
    const e = K.compareWithMeasured('earth');
    expect(e.emissionK).toBeCloseTo(254.0, 1);
    expect(e.differenceK).toBeCloseTo(34.0, 1);
    expect(e.measuredAt).toBe('surface');
    const ratio = e.ratio;
    const layer = K.oneLayerEmissivityFor(ratio);
    const grey = K.greyDepthFor(ratio);
    expect(layer.emissivity).toBeCloseTo(0.79, 2);
    expect(grey.tauSurface).toBeCloseTo(0.87, 2);
    // the same number does not mean the same thing in the two models
    expect(layer.emissivity).not.toBeCloseTo(grey.tauSurface, 1);
  });

  test('Venus: the one layer has no solution, the grey model needs tau_s near 141', () => {
    const v = K.compareWithMeasured('venus');
    expect(v.ratio).toBeGreaterThan(K.ONE_LAYER_MAX_RATIO);
    const layer = K.oneLayerEmissivityFor(v.ratio);
    expect(layer.refused).toBe(true);
    expect(layer).not.toHaveProperty('emissivity');
    expect(layer.reason).toMatch(/2\^\(1\/4\)/);
    expect(K.greyDepthFor(v.ratio).tauSurface).toBeCloseTo(141.6, 0);
  });

  test('uniform redistribution is f = 1/4 and none (eps = 0) is 2/3', () => {
    expect(K.redistributionFactor(1)).toBeCloseTo(0.25, 15);
    expect(K.redistributionFactor(0)).toBeCloseTo(2 / 3, 15);
    const hot = K.equilibriumTemperature({
      flux: 1361,
      bondAlbedo: 0.3,
      redistribution: 0,
    });
    const uni = K.equilibriumTemperature({ flux: 1361, bondAlbedo: 0.3 });
    expect(hot.temperature / uni.temperature).toBeCloseTo((8 / 3) ** 0.25, 12);
  });

  test('a giant planet is compared at its 1 bar level and the row says it has no surface', () => {
    const j = K.compareWithMeasured('jupiter');
    expect(j.measuredAt).toBe('1 bar level');
    expect(j.label).toMatch(/no surface/);
    expect(j.label).toMatch(/internal heat/);
  });

  test('an unknown body or an out-of-domain albedo is refused with a reason', () => {
    expect(K.compareWithMeasured('pluto').refused).toBe(true);
    const r = K.compareWithMeasured('earth', { albedo: 1.5 });
    expect(r.refused).toBe(true);
    expect(r.reason).toMatch(/Bond albedo/);
  });
});

describe('the pack tells the truth about what it is', () => {
  test('typed and read by Carl but not source-checked, no retrieval date; six bodies; no escape data', () => {
    expect(K.PACK_PROVENANCE.checked).toBe(false);
    expect(K.PACK_PROVENANCE.retrieved).toBeNull();
    // Carl's reader review is recorded on the pack and on every body, and it is not a source check.
    expect(K.PACK_PROVENANCE.reviewedBy).toMatch(/^Carl/);
    expect(K.PACK_PROVENANCE.reviewNote).toMatch(
      /not a check against the source/
    );
    for (const id of K.BODY_IDS) {
      expect(K.BODIES[id].reviewedBy).toBe(K.PACK_PROVENANCE.reviewedBy);
      expect(K.BODIES[id].reviewNote).toBe(K.PACK_PROVENANCE.reviewNote);
    }
    expect(K.BODY_IDS).toEqual([
      'venus',
      'earth',
      'mars',
      'jupiter',
      'uranus',
      'neptune',
    ]);
    expect(
      Object.keys(K).filter(k => /jeans|exobase|escape|retain/i.test(k))
    ).toEqual([]);
    expect(
      text('js/kernels/atmospheres/bodies.js').replace(/\/\/[^\n]*/g, '')
    ).not.toMatch(/exobase|jeans/i);
  });

  test('the kernel imports only its own files and the radiation constants (pure, no DOM)', () => {
    for (const f of [
      'constants',
      'equilibrium',
      'greenhouse',
      'grey',
      'scale',
      'bodies',
      'index',
    ]) {
      const src = text(`js/kernels/atmospheres/${f}.js`);
      for (const m of src.matchAll(/from '([^']+)'/g))
        expect(m[1]).toMatch(/^(\.\/|\.\.\/radiation\/constants\.js)/);
      expect(src).not.toMatch(/\b(document|window)\b/);
    }
  });

  test('ATMOSPHERES.md states the verdict-B scope and what is not built', () => {
    const doc = text('ATMOSPHERES.md');
    expect(doc).toMatch(/verdict B/);
    expect(doc).toMatch(/What is not built/);
    expect(doc).toMatch(/checked: false/);
  });
});
