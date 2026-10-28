// =============================================================================
// The interiors kernel, Part A (Prompt 203)
// -----------------------------------------------------------------------------
// tests/fixtures/interiors/thresholds.json fixed every bound before
// js/kernels/interiors/ had been run. tools/interiors-validate.mjs runs them in
// plain Node (Jest's VM makes Math reads about ten times slower); this file runs
// it, holds every row to its bound, and adds the worked examples, the refusals
// and the pack's provenance and vocabulary.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import * as K from '../js/kernels/interiors/index.js';
import { compareWithMeasured } from '../js/kernels/atmospheres/index.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const text = f => readFileSync(path.join(ROOT, f), 'utf8');
const THRESHOLDS = JSON.parse(text('tests/fixtures/interiors/thresholds.json'));

describe('the committed thresholds hold for the production module', () => {
  const ran = spawnSync(
    process.execPath,
    [path.join(ROOT, 'tools/interiors-validate.mjs'), '--json'],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 24 }
  );
  const rows = JSON.parse(ran.stdout || '[]');

  test('the tool exits 0 and every row passes', () => {
    expect(ran.status).toBe(0);
    expect(rows.length).toBeGreaterThanOrEqual(16);
    for (const r of rows)
      if (r.pass !== true)
        throw new Error(
          `${r.id}: ${r.measured} against ${JSON.stringify(r.bound)}`
        );
  });

  test('every committed check has a row (none silently dropped)', () => {
    const have = new Set(rows.map(r => r.id.split('.')[0] + '.'));
    for (const c of THRESHOLDS.checks) {
      const stem = c.id.split('.')[0] + '.';
      expect(have.has(stem)).toBe(true);
    }
  });
});

describe('worked examples', () => {
  test('Earth: 5513 kg/m3, 9.80 m/s2, 11.18 km/s, with an uncertainty from G', () => {
    const e = K.bulkOf('earth');
    expect(e.density.value).toBeCloseTo(5513.5, 0);
    expect(e.gravity.value).toBeCloseTo(9.798, 3);
    expect(e.escapeSpeed.value / 1e3).toBeCloseTo(11.18, 2);
    // G's 2.2e-5 relative error dominates a density whose radius is known to 1.6e-6.
    expect(e.density.sigma / e.density.value).toBeGreaterThan(2e-5);
    expect(e.density.sigma / e.density.value).toBeLessThan(2.4e-5);
    expect(e.density.radiusUsed).toBe('mean');
    expect(e.gravity.radiusUsed).toBe('equatorial');
  });

  test('Jupiter’s gravity changes with the radius named, and the result says which', () => {
    const eq = K.bulkOf('jupiter');
    const mean = K.bulkOf('jupiter', { gravityRadius: 'mean' });
    expect(eq.gravity.value).toBeCloseTo(24.79, 1);
    expect(mean.gravity.value / eq.gravity.value).toBeCloseTo(
      (71492 / 69911) ** 2,
      6
    );
    expect(mean.gravity.radiusUsed).toBe('mean');
  });

  test('density cannot tell hydrogen and helium from water ice: Jupiter and Uranus', () => {
    const j = K.bulkOf('jupiter');
    const u = K.bulkOf('uranus');
    expect(j.class.class).toBe('volatile-rich');
    expect(u.class.class).toBe('volatile-rich');
    expect(Math.abs(j.density.value / u.density.value - 1)).toBeLessThan(0.05);
  });

  test('the Moon is rocky but its density sits closest to the rocky boundary of the five', () => {
    const d = id => K.bulkOf(id).density.value;
    expect(d('moon')).toBeLessThan(d('mars'));
    expect(K.bulkOf('moon').class.class).toBe('rocky');
  });

  test('the compression correction: Earth’s is large, the Moon’s small, and both carry the declared spread', () => {
    const e = K.compressionCorrection('earth');
    const m = K.compressionCorrection('moon');
    expect(e.correction / e.bulk).toBeGreaterThan(0.2);
    expect(m.correction / m.bulk).toBeLessThan(0.05);
    expect(e.sigma).toBeGreaterThanOrEqual(K.UNCOMPRESSED_SIGMA);
    expect(e.sigmaDeclared).toBe(200);
    expect(K.compressionCorrection('jupiter').code).toBe('no-table');
  });

  test('equilibrium temperature comes from the Prompt 200 kernel, with no uncertainty the table does not state', () => {
    for (const id of [
      'venus',
      'earth',
      'mars',
      'jupiter',
      'uranus',
      'neptune',
    ]) {
      const t = K.equilibriumOf(id);
      expect(t.temperature).toBe(compareWithMeasured(id).emissionK);
      expect(t.sigma).toBeNull();
    }
    expect(K.equilibriumOf('mercury').temperature).toBeGreaterThan(430);
  });

  test('a comparison keeps the order chosen, carries units and refuses what it cannot compare', () => {
    const c = K.compareBodies(['neptune', 'earth', 'moon']);
    expect(c.rows.map(r => r.id)).toEqual(['neptune', 'earth', 'moon']);
    expect(c.quantities).toEqual(K.QUANTITIES.map(q => q.id));
    expect(K.compareBodies().rows).toHaveLength(9);
    expect(K.compareBodies([]).code).toBe('empty');
    expect(K.compareBodies(['earth', 'earth']).code).toBe('duplicate');
  });
});

describe('the pack states what it is', () => {
  test('typed, never retrieved, unchecked', () => {
    expect(K.BULK_PROVENANCE.checked).toBe(false);
    expect(K.BULK_PROVENANCE.retrieved).toBeNull();
  });

  test('nine bodies, every radius and GM carries a stated error', () => {
    expect(K.PLANET_IDS).toHaveLength(9);
    for (const id of K.PLANET_IDS) {
      const b = K.PLANETS[id];
      expect(b.gm[1]).toBeGreaterThan(0);
      expect(b.radius.mean[1]).toBeGreaterThan(0);
    }
  });

  test('every uncompressed density is below its bulk density (compression raises density)', () => {
    for (const id of Object.keys(K.UNCOMPRESSED))
      expect(K.UNCOMPRESSED[id]).toBeLessThan(K.bulkOf(id).density.value);
  });

  test('the kernel names no interior model (the gated part is not built here)', () => {
    expect(
      Object.keys(K).some(k => /twoLayer|radau|oblate|core/i.test(k))
    ).toBe(false);
  });
});
