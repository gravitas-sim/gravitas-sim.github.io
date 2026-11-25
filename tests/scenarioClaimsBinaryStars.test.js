import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import * as physics from '../js/physics.js';
import { SCENARIO_PRESETS } from '../js/scenarios.js';
import { SCENARIO_REVISIONS, currentRevision } from '../js/shareState.js';
import { SIM_UNITS_PER_AU, SOLAR_MASS_UNIT } from '../js/constants.js';
import { normalizeSeed } from '../js/rng.js';
import { digest } from './scenarioDigest.js';

// =============================================================================
// Binary Stars (`binary-star-system`): what its card says, held to the world
// -----------------------------------------------------------------------------
// The scenario review (tests/fixtures/scenario-review/) found revision 1 losing
// a planet: the planets started 1.25 to 2.25 binary separations from the pair,
// inside the distance a planet can circle it for long, and a generated giant of
// up to 20 Jupiter masses could swallow one. Revision 2 starts them past
// Holman and Wiegert's critical distance (1999, AJ 117, 621, Eq. 3) and lets
// only the stars pull, as in those test-particle integrations. These are the
// card's numbers and the correction's, read from the built world at several
// seeds; the run itself is the review's record, checked at the end.
// =============================================================================

const ROOT = path.resolve(import.meta.dirname, '..');
const ID = 'binary-star-system';
const SEEDS = [
  1,
  7,
  42,
  99991,
  normalizeSeed('audit'),
  normalizeSeed('audit-2'),
];

/** Holman and Wiegert's outer (P-type) fit, in binary separations. */
const critical = (e, mu) =>
  1.6 +
  5.1 * e -
  2.22 * e * e +
  4.12 * mu -
  4.27 * e * mu -
  5.09 * mu * mu +
  4.61 * e * e * mu * mu;

const build = seed => {
  digest(ID, seed);
  return physics;
};

describe('Binary Stars: the corrected world', () => {
  test('it is revision 2, and revision 1 is kept for links made before', () => {
    expect(currentRevision(ID)).toBe(2);
    expect(SCENARIO_REVISIONS[ID].earlier).toEqual({ 1: 'retained' });
  });

  test('the row: only the stars pull, at the zoom that frames the giants', () => {
    const row = SCENARIO_PRESETS[ID];
    expect(row.star_only_gravity).toBe(true);
    expect(row.mutual_gravity).toBe(false);
    expect(row.preset_zoom).toBe(0.75);
  });

  test.each(SEEDS)(
    'seed %s: two suns of 1.2 and 0.8 solar masses, 1.2 AU apart, on a circular orbit',
    seed => {
      const w = build(seed);
      expect(w.stars).toHaveLength(2);
      const [a, b] = w.stars;
      expect(a.mass / SOLAR_MASS_UNIT).toBeCloseTo(1.2, 9);
      expect(b.mass / SOLAR_MASS_UNIT).toBeCloseTo(0.8, 9);
      const sep = Math.hypot(b.pos.x - a.pos.x, b.pos.y - a.pos.y);
      expect(sep / SIM_UNITS_PER_AU).toBeCloseTo(1.2, 9);
      // Circular: the relative speed is the circular speed for the pair.
      const G = SCENARIO_PRESETS[ID].gravitational_constant;
      const vrel = Math.hypot(b.vel.x - a.vel.x, b.vel.y - a.vel.y);
      expect(vrel / Math.sqrt((G * (a.mass + b.mass)) / sep)).toBeCloseTo(1, 9);
    }
  );

  test.each(SEEDS)(
    'seed %s: five planets, two giants and 20 asteroids, every planet and giant past the critical distance',
    seed => {
      const w = build(seed);
      expect([
        w.planets.length,
        w.gas_giants.length,
        w.asteroids.length,
      ]).toEqual([5, 2, 20]);
      const [a, b] = w.stars;
      const M = a.mass + b.mass;
      const mu = Math.min(a.mass, b.mass) / M;
      const sep = Math.hypot(b.pos.x - a.pos.x, b.pos.y - a.pos.y);
      const cx = (a.mass * a.pos.x + b.mass * b.pos.x) / M;
      const cy = (a.mass * a.pos.y + b.mass * b.pos.y) / M;
      const ac = critical(0, mu);
      expect(ac).toBeCloseTo(2.4336, 4);
      for (const body of [...w.planets, ...w.gas_giants]) {
        const r = Math.hypot(body.pos.x - cx, body.pos.y - cy) / sep;
        expect([body.name, r > ac]).toEqual([body.name, true]);
      }
    }
  );

  test('the card says what is built, in both languages', () => {
    const read = f => readFileSync(path.join(ROOT, f), 'utf8');
    const en = read('js/i18n/en.js');
    const es = read('js/i18n/es.js');
    const card = (src, key) =>
      new RegExp(
        `'scenario\\.${ID}\\.${key}':\\s*'((?:[^'\\\\]|\\\\.)*)'`
      ).exec(src)[1];
    const enCard = card(en, 'summary');
    const esCard = card(es, 'summary');
    for (const s of [
      '1.2 and 0.8 solar masses',
      '1.2 AU',
      'five planets',
      'two gas giants',
      '20 asteroids',
      'Only the suns pull',
      '2.4 times',
      'Holman and Wiegert, 1999',
    ])
      expect([s, enCard.includes(s)]).toEqual([s, true]);
    for (const s of [
      '1,2 y 0,8 masas solares',
      '1,2 UA',
      'cinco planetas',
      'dos gigantes gaseosos',
      '20 asteroides',
      'solo atraen los soles',
      '2,4 veces',
      'Holman y Wiegert, 1999',
    ])
      expect([s, esCard.includes(s)]).toEqual([s, true]);
  });
});

describe('Binary Stars: the review run keeps every planet', () => {
  test('all five planets stay within 10 AU at every frame rate and seed', () => {
    const record = JSON.parse(
      readFileSync(
        path.join(ROOT, 'tests/fixtures/scenario-review/record.json'),
        'utf8'
      )
    );
    const rows = record.members[ID].rows.filter(
      r => r.claim === 'planets-kept'
    );
    expect(rows).toHaveLength(6);
    for (const r of rows)
      expect([r.rate, r.seed, r.value, r.pass]).toEqual([
        r.rate,
        r.seed,
        5,
        true,
      ]);
  });
});
