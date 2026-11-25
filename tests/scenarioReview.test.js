// The scenario review's record, against the claims committed before it was
// measured (tests/fixtures/scenario-review/claims.json). This does not re-run
// the long simulations: it checks that the record answers every claim at every
// rate and seed, that no bound moved, that every pass flag follows from its own
// value and the committed tolerance, and that each member's suggested verdict
// follows from its rows. One cheap start-of-run reading is rebuilt from the
// engine and compared with the record, so a record cannot drift from the code.
// tools/scenario-review.mjs writes the record (node tools/scenario-review.mjs --write).
import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import * as physics from '../js/physics.js';
import { SOLAR_MASS_UNIT, SIM_UNITS_PER_AU } from '../js/constants.js';
import { buildAt, planFor, verdictFrom } from '../tools/scenario-review.mjs';

const read = name =>
  JSON.parse(
    readFileSync(
      new URL(`./fixtures/scenario-review/${name}`, import.meta.url),
      'utf8'
    )
  );
const CLAIMS = read('claims.json');
const RECORD = read('record.json');
const RATES = [30, 60, 120];
const AUDIT = ['audit', 'audit-2'];
const BOUND_KEYS = [
  'value',
  'values',
  'unit',
  'tolerance',
  'bound',
  'range',
  'grid',
  'step',
  'limitSeparations',
  'threshold',
  'radiusAU',
  'what',
];
const within = (m, v, tol) => Math.abs(m - v) <= tol * Math.abs(v);

describe('the record follows the committed claims', () => {
  test('format, source and members', () => {
    expect(RECORD.format).toBe('gravitas.scenario-record/1');
    expect(RECORD.claims).toBe('tests/fixtures/scenario-review/claims.json');
    expect(Object.keys(RECORD.members).sort()).toEqual(
      Object.keys(CLAIMS.members).sort()
    );
  });

  for (const [id, spec] of Object.entries(CLAIMS.members)) {
    describe(id, () => {
      const rec = RECORD.members[id];

      test('seeds and rates', () => {
        expect(rec.rates).toEqual(RATES);
        if (spec.seeds) expect(rec.seeds).toEqual(spec.seeds);
        else expect([[1], AUDIT]).toContainEqual(rec.seeds);
      });

      test('every claim has one row at every rate and seed, with its committed bound', () => {
        const expected = spec.claims.length * RATES.length * rec.seeds.length;
        expect(rec.rows).toHaveLength(expected);
        for (const claim of spec.claims) {
          for (const rate of RATES) {
            for (const seed of rec.seeds) {
              const rows = rec.rows.filter(
                r => r.claim === claim.id && r.rate === rate && r.seed === seed
              );
              expect(rows).toHaveLength(1);
              const bound = rows[0].bound;
              for (const k of BOUND_KEYS) {
                if (claim[k] === undefined) expect(bound[k]).toBeUndefined();
                else expect(bound[k]).toEqual(claim[k]);
              }
              expect(bound.measure).toBe(claim.measure);
            }
          }
        }
        // No row for a claim the file does not hold.
        const ids = new Set(spec.claims.map(c => c.id));
        for (const r of rec.rows) expect(ids.has(r.claim)).toBe(true);
      });

      test('a pass flag, a status and a note that agree', () => {
        for (const r of rec.rows) {
          if (r.status === 'NOT RUN') {
            expect(r.pass).toBeNull();
            expect(r.note.length).toBeGreaterThan(10);
          } else if (r.pass === true) expect(r.status).toBe('pass');
          else if (r.pass === false) expect(r.status).toBe('fail');
          else expect(r.status).toBe('recorded');
        }
      });

      test('card numbers and counts pass exactly when they are within the committed tolerance', () => {
        for (const claim of spec.claims) {
          for (const r of rec.rows.filter(x => x.claim === claim.id)) {
            if (r.status === 'NOT RUN') continue;
            if (claim.kind === 'cardNumber') {
              const got = Array.isArray(r.value) ? r.value : [r.value];
              const want = claim.values ?? got.map(() => claim.value);
              const ok =
                got.length === want.length &&
                got.every((m, i) => within(m, want[i], claim.tolerance));
              expect(r.pass).toBe(ok);
            } else if (claim.kind === 'count') {
              expect(r.pass).toBe(r.value === claim.value);
            }
          }
        }
      });

      test('the verdict follows from the rows', () => {
        const failing = spec.claims
          .filter(c => rec.rows.some(r => r.claim === c.id && r.pass === false))
          .map(c => c.id);
        const notRun = spec.claims
          .filter(
            c =>
              !failing.includes(c.id) &&
              rec.rows.some(r => r.claim === c.id && r.status === 'NOT RUN')
          )
          .map(c => c.id);
        const v = rec.verdictSuggested;
        expect(v.failing).toEqual(failing);
        expect(v.notRun).toEqual(notRun);
        expect(v.verdict).toBe(
          failing.length === 0 && notRun.length === 0
            ? 'KEEP'
            : 'REFRAME or CORRECT'
        );
        expect(verdictFrom(rec.rows, spec.claims)).toEqual(v);
      });

      test('steps per period is a finding below 200', () => {
        const s = rec.stepsPerPeriod;
        expect(s).not.toBeNull();
        expect(s.minimum).toBe(CLAIMS.rules.stepsPerPeriod.match(/\d+/)[0] * 1);
        expect(within(s.stepsPerPeriod, s.period / s.step, 1e-4)).toBe(true);
        expect(s.finding).toBe(!(s.stepsPerPeriod >= s.minimum));
      });
    });
  }

  test('numeric bounds hold for the rows that carry a number', () => {
    const rows = (m, c) => RECORD.members[m].rows.filter(r => r.claim === c);
    const below = (m, c, bound) => {
      for (const r of rows(m, c)) {
        if (r.status === 'NOT RUN') continue;
        expect(r.pass).toBe(r.value < bound);
      }
    };
    const claim = (m, c) => CLAIMS.members[m].claims.find(x => x.id === c);
    below(
      'binary-pair',
      'balance-point',
      claim('binary-pair', 'balance-point').bound
    );
    below(
      'lagrange-point-lab',
      'circular',
      claim('lagrange-point-lab', 'circular').bound
    );
    below(
      'lagrange-point-lab',
      'jacobi',
      claim('lagrange-point-lab', 'jacobi').bound
    );
    below(
      'gravity-assist-lab',
      'relative-speed',
      claim('gravity-assist-lab', 'relative-speed').bound
    );
    const [lo, hi] = claim('three-body-sensitivity-lab', 'comes-apart').range;
    for (const r of rows('three-body-sensitivity-lab', 'comes-apart')) {
      expect(r.pass).toBe(
        typeof r.value === 'number' && r.value >= lo && r.value <= hi
      );
    }
    const tol = claim('slingshot-gauntlet', 'slingshot').tolerance;
    for (const r of rows('slingshot-gauntlet', 'slingshot')) {
      if (r.status !== 'NOT RUN') expect(r.pass).toBe(Math.abs(r.value) > tol);
    }
  });

  test('every rate of a divergence claim carries the same verdict', () => {
    const rows = RECORD.members['three-body-sensitivity-lab'].rows.filter(
      r => r.claim === 'divergence'
    );
    expect(new Set(rows.map(r => r.pass)).size).toBe(1);
  });
});

describe('the record agrees with a fresh build of the cheapest member', () => {
  test('binary-pair at t = 0 and its steps per period at 60 frames a second', () => {
    const rec = RECORD.members['binary-pair'];
    const settings = buildAt('binary-pair', 1);
    const [A, B] = physics.stars;
    const at = (claim, rate) =>
      rec.rows.find(r => r.claim === claim && r.rate === rate).value;
    expect(at('masses', 60)).toEqual([
      A.mass / SOLAR_MASS_UNIT,
      B.mass / SOLAR_MASS_UNIT,
    ]);
    const sep = Math.hypot(A.pos.x - B.pos.x, A.pos.y - B.pos.y);
    expect(at('separation', 60)).toBeCloseTo(sep / SIM_UNITS_PER_AU, 4);
    // The page's step at the row's speed and cap, and the Kepler period of the
    // pair at the row's G.
    const plan = planFor(settings, '60');
    const G = settings.gravitational_constant;
    const period = 2 * Math.PI * Math.sqrt(sep ** 3 / (G * (A.mass + B.mass)));
    const s = rec.stepsPerPeriod;
    expect(within(s.step, plan.step, 1e-5)).toBe(true);
    expect(within(s.period, period, 1e-5)).toBe(true);
  });
});
