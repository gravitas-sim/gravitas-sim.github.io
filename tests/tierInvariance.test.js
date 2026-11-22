/**
 * A quality tier never changes a taught number.
 *
 * The low tier caps the generic populations a scenario asks for and draws
 * fewer samples for a few fits (js/quality.js). This holds the three promises
 * that makes to a student: every lesson scene is the same world on both tiers;
 * in the sandbox, the bodies the low tier keeps are the full tier's own; and a
 * result computed from fewer draws says so beside the number, while the
 * lesson's answer window still holds. The table these rows come from is
 * docs/tier-invariance.md, written by tools/tier-table.mjs.
 */
import { jest } from '@jest/globals';
import { readFileSync } from 'node:fs';

import { build, compare, render, OUT } from '../tools/tier-table.mjs';
import {
  computeNote,
  COMPUTE_TIERS,
  renderOverrides,
  setTier,
} from '../js/quality.js';
import { A_BINARY_STARS_ORBIT } from '../js/data/investigations/measurement-sequence.js';
import { setLocale } from '../js/i18n/index.js';

jest.setTimeout(120_000);

let table;
beforeAll(() => {
  table = render();
});
afterEach(() => setTier('full'));

describe('the body-count table', () => {
  test('docs/tier-invariance.md is what the generator writes', () => {
    expect(readFileSync(OUT, 'utf8')).toBe(table.text);
  });

  test('every scene that differs has been read for what a student sees', () => {
    expect(table.missing).toEqual([]);
  });
});

describe('lesson scenes', () => {
  test('every lesson setup builds the same world at both tiers', () => {
    expect(table.lessonRows.length).toBeGreaterThanOrEqual(39);
    const off = table.lessonRows
      .filter(({ r }) => r.differs || r.kept !== 'identical')
      .map(({ id, s }) => `${id} (${s.seed})`);
    expect(off).toEqual([]);
  });
});

describe('the sandbox', () => {
  test('every body the low tier keeps is the full tier’s, in the same place', () => {
    const off = table.catRows.filter(({ r }) => !r.same).map(({ id }) => id);
    expect(off).toEqual([]);
  });

  test('a capped world keeps the bodies the cap left, ids and all', () => {
    // Kuiper Belt: 300 belt objects at full, 40 at low. The low world's bodies
    // are the first 40 of the full world's, with the same ids.
    const r = compare('kuiper-belt', 'tier-table', null);
    expect(r.differs).toBe(true);
    expect(r.low.counts.asteroids).toBe(40);
    for (const [id, b] of r.low.bodies) {
      const a = r.full.bodies.get(id);
      expect(a).toBeDefined();
      expect([a.x, a.y, a.mass, a.name]).toEqual([b.x, b.y, b.mass, b.name]);
    }
    expect(r.low.note).toEqual({ built: 49, wanted: 309 });
  });
});

describe('render-only reductions', () => {
  test('the low tier’s display overrides change no body, force or stored value', () => {
    setTier('low');
    const overrides = renderOverrides();
    setTier('full');
    expect(Object.keys(overrides).length).toBeGreaterThan(0);
    // A lesson scene with lensing, waves and the accretion disc on, run with
    // and without the low tier's overrides, at the full tier: the same world.
    const on = {
      show_object_lensing: true,
      show_gravitational_waves: true,
      show_accretion_disk: true,
    };
    // The first run in a process differs from every later one (some engine
    // state is set up on the first step), so one is run and set aside.
    build('binary-bh', 'full', 'render', on, 120);
    const plain = build('binary-bh', 'full', 'render', on, 120);
    const reduced = build(
      'binary-bh',
      'full',
      'render',
      { ...on, ...overrides },
      120
    );
    expect(reduced.counts).toEqual(plain.counts);
    expect([...reduced.bodies]).toEqual([...plain.bodies]);
  });
});

describe('a result computed from fewer draws', () => {
  const step = A_BINARY_STARS_ORBIT.steps.find(s => s.sid === 'the-mass-sum');
  let W;
  beforeAll(async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    W = await import('../js/imagingWidgets.js');
    warn.mockRestore();
    setLocale('en');
  });

  // What the student reads off the tool, at two decimals as it shows them.
  const reading = () => {
    const f = W.orbitView({ n: 12, model: 0, plx: 100 });
    const two = x => Number(x.toFixed(2));
    return {
      m: two(f.mass.value),
      lo: two(f.mass.intervals[0].lo),
      hi: two(f.mass.intervals[0].hi),
    };
  };
  const binary = () => W.IMAGING_WIDGETS.find(w => w.id === 'binary-orbit');
  const drawsRow = () =>
    binary()
      .readout({ n: 12, model: 0, plx: 100 })
      .find(r => r.label === 'Intervals computed from');

  test.each(['full', 'low'])(
    'the mass-sum step accepts what the tool shows at the %s tier',
    tier => {
      setTier(tier);
      expect(step.validate(reading())?.level).toBe('ok');
    }
  );

  test('the low tier says how many draws, beside the intervals', () => {
    setTier('low');
    const note = computeNote(['monteCarloDraws']);
    expect(note.reduced.monteCarloDraws).toEqual({
      used: COMPUTE_TIERS.low.monteCarloDraws,
      full: COMPUTE_TIERS.full.monteCarloDraws,
    });
    expect(drawsRow().value).toContain(
      String(COMPUTE_TIERS.low.monteCarloDraws)
    );
    expect(drawsRow().value).toContain(
      String(COMPUTE_TIERS.full.monteCarloDraws)
    );
  });

  test('the full tier adds nothing', () => {
    setTier('full');
    expect(drawsRow()).toBeUndefined();
  });
});
