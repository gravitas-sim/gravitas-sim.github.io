import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import * as physics from '../js/physics.js';
import { SCENARIO_PRESETS } from '../js/scenarios.js';
import { SCENARIO_REVISIONS, currentRevision } from '../js/shareState.js';
import { SIM_UNITS_PER_AU, SOLAR_MASS_UNIT } from '../js/constants.js';
import { digest } from './scenarioDigest.js';

// =============================================================================
// Lagrange Point Lab (`lagrange-point-lab`): what its card says, held to the world
// -----------------------------------------------------------------------------
// The scenario review (tests/fixtures/scenario-review/) found the tracer's
// Jacobi constant drifting by 2.4e-4 to 3.4e-4 under Velocity Verlet, against
// the 1e-6 the card's "conserved" was committed to, and the stars' paths moving
// by 2.2e-7 of their separation because of the tracer, against 1e-9. Revision 2
// integrates with RK4 at the same step and lightens the tracer to 1e-12 of the
// pair's mass. The tracer keeps the start the lagrange-points lesson describes
// (0.6 separations out, at rest in the rotating frame), and the companion keeps
// the 0.03 the lesson computes with; the card now says three hundredths.
// =============================================================================

const ROOT = path.resolve(import.meta.dirname, '..');
const ID = 'lagrange-point-lab';

const record = () =>
  JSON.parse(
    readFileSync(
      path.join(ROOT, 'tests/fixtures/scenario-review/record.json'),
      'utf8'
    )
  ).members[ID];

describe('Lagrange Point Lab: the corrected world', () => {
  test('it is revision 2, and revision 1 is kept for links made before', () => {
    expect(currentRevision(ID)).toBe(2);
    const entry = SCENARIO_REVISIONS[ID];
    expect(entry.earlier).toEqual({ 1: 'retained' });
    expect(entry.rows[1].integrator).toBe('Velocity Verlet');
    expect(entry.rows[1].lagrange_tracer_fraction).toBe(1e-9);
  });

  test('the row: RK4, a lighter tracer, and the start and mass the lesson uses', () => {
    const row = SCENARIO_PRESETS[ID];
    expect(row.integrator).toBe('RK4');
    expect(row.lagrange_tracer_fraction).toBe(1e-12);
    expect(row.lagrange_secondary_mass / row.lagrange_primary_mass).toBe(0.03);
    expect([row.lagrange_tracer_x, row.lagrange_tracer_y]).toEqual([0.6, 0]);
    expect([row.lagrange_tracer_vx, row.lagrange_tracer_vy]).toEqual([0, 0]);
    // Unchanged by the correction: the step the lesson's runs hold.
    expect(row.max_timestep).toBe(0.3);
  });

  test('the built world: a sunlike star, a companion of 0.03, 8 AU apart, a tracer of 1e-12', () => {
    digest(ID, 1);
    const [a, b] = physics.stars;
    expect(a.mass / SOLAR_MASS_UNIT).toBeCloseTo(1, 12);
    expect(b.mass / a.mass).toBeCloseTo(0.03, 12);
    const sep = Math.hypot(b.pos.x - a.pos.x, b.pos.y - a.pos.y);
    expect(sep / SIM_UNITS_PER_AU).toBeCloseTo(8, 9);
    expect(physics.planets).toHaveLength(1);
    const tracer = physics.planets[0];
    expect(tracer.mass / (a.mass + b.mass)).toBeCloseTo(1e-12, 20);
  });

  test('the card says three hundredths, in both languages', () => {
    const read = f => readFileSync(path.join(ROOT, f), 'utf8');
    const card = src =>
      new RegExp(
        `'scenario\\.${ID}\\.summary':\\s*'((?:[^'\\\\]|\\\\.)*)'`
      ).exec(src)[1];
    const en = card(read('js/i18n/en.js'));
    const es = card(read('js/i18n/es.js'));
    expect(en).toContain('a companion three hundredths of its mass');
    expect(en).not.toContain('thirtieth');
    expect(es).toContain('una compañera de tres centésimas de su masa');
    expect(es).not.toContain('treintava');
  });
});

describe('Lagrange Point Lab: the review run', () => {
  test('the Jacobi constant holds to 1e-6 at every frame rate', () => {
    const rows = record().rows.filter(r => r.claim === 'jacobi');
    expect(rows).toHaveLength(3);
    for (const r of rows)
      expect([r.rate, r.pass, r.value < 1e-6]).toEqual([r.rate, true, true]);
  });

  test('neither star notices the tracer: its pull moves their paths by under 1e-9 of the separation', () => {
    const rows = record().rows.filter(r => r.claim === 'tracer-stays');
    expect(rows).toHaveLength(3);
    for (const r of rows) {
      const moved = Number(
        /star paths differ by (\S+) separations/.exec(r.value)[1]
      );
      expect([r.rate, moved < 1e-9]).toEqual([r.rate, true]);
    }
  });
});
