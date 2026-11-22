// =============================================================================
// What "the same scene" means for resume (e2e/resumeScene.spec.js)
// -----------------------------------------------------------------------------
// The browser check compares the screen reached by walking to a step with the
// one reached by opening it from a saved record. These are the rules it
// compares by, tried on hand-made pairs: what counts as a difference, what a
// scene that ran may lose, which clock a step states, and the steps sampled.
// Also the stage a stage-less step finds on opening (carriedStage), which is
// the rule that made the two screens agree.
// =============================================================================

import { describe, expect, test } from '@jest/globals';
import {
  SAME_TIME,
  compare,
  sampleSteps,
  statesClock,
  DEFAULT_EVERY,
  KIND_LESSONS,
  inSample,
} from '../e2e/resumeSceneKit.js';
import { carriedStage } from '../js/lesson/stage.js';
import { MANIFEST } from '../js/data/investigations/manifest.js';
import { inDepth } from '../js/investigations/progressSchema.js';

const body = (name, over = {}) => ({
  list: 'planets',
  kind: 'Planet',
  name,
  mass: 1,
  radius: 2,
  x: 10,
  y: 0,
  vx: 0,
  vy: 1,
  ...over,
});
const screen = (over = {}) => ({
  bodies: [body('A'), body('B', { list: 'stars', kind: 'StarObject' })],
  time: 0,
  paused: true,
  speed: 1,
  pinned: 0,
  stage: '',
  staged: [],
  canvas: 'scene',
  instrument: [],
  ...over,
});

describe('compare', () => {
  test('equal screens differ in nothing', () => {
    expect(compare(screen(), screen(), { setup: {} })).toEqual({
      differences: [],
      carried: [],
    });
  });

  test('a stage, a canvas kind and an instrument are each named', () => {
    const { differences } = compare(
      screen({ stage: 'x', canvas: 'quiet', instrument: [['a', '1']] }),
      screen(),
      { setup: {} }
    );
    expect(differences.map(d => d.split(':')[0])).toEqual([
      'canvas',
      'stage',
      'instrument',
    ]);
  });

  test('positions count only at the same simulation time', () => {
    const moved = screen({
      bodies: [
        body('A', { x: 11 }),
        body('B', { list: 'stars', kind: 'StarObject' }),
      ],
    });
    expect(compare(screen(), moved, {}).differences[0]).toMatch(
      /^planets\/Planet\/A x/
    );
    // A running scene is not compared on positions even at the same time.
    expect(
      compare(
        screen({ paused: false }),
        screen({ paused: false, bodies: moved.bodies }),
        {}
      ).differences
    ).toEqual([]);
    // A scene that ran for a while has moved: not a difference.
    expect(compare(screen({ time: 5 }), moved, {}).differences).toEqual([]);
    // To the rounding a step's own arithmetic leaves.
    const rounded = screen({
      bodies: [
        body('A', { x: 10 * (1 + 1e-12) }),
        body('B', { list: 'stars', kind: 'StarObject' }),
      ],
    });
    expect(compare(screen(), rounded, {}).differences).toEqual([]);
    expect(SAME_TIME).toBeLessThan(1e-6);
  });

  test('a scene that ran may lose comets and debris, and nothing else', () => {
    const comet = body('C', { list: 'comets', kind: 'Comet' });
    const withComet = screen({ bodies: [...screen().bodies, comet] });
    expect(compare(screen({ time: 9 }), withComet, {}).differences).toEqual([]);
    expect(compare(screen(), withComet, {}).differences[0]).toMatch(/^bodies/);
    // Fragments a disruption threw off while the walk ran are not in a reopened scene.
    expect(compare(withComet, screen({ time: 9 }), {}).differences).toEqual([]);
    expect(compare(withComet, screen(), {}).differences[0]).toMatch(/^bodies/);
    const lost = screen({ bodies: [screen().bodies[0]] });
    // A planet that is gone, or one that appeared, is a difference whatever the time.
    expect(compare(screen({ time: 9 }), lost, {}).differences[0]).toMatch(
      /^bodies/
    );
    expect(compare(lost, screen({ time: 9 }), {}).differences[0]).toMatch(
      /^bodies/
    );
  });

  test('a stage-less step that walking leaves empty and resume fills is a difference', () => {
    const { differences } = compare(screen({ bodies: [] }), screen(), {
      sid: 'last',
      type: 'read',
    });
    expect(differences[0]).toMatch(/^bodies: walked 0, resumed 2/);
  });

  test('a step whose instrument moves itself is not compared on its bodies', () => {
    const moving = screen({ animated: true, bodies: [] });
    const { differences, carried } = compare(moving, screen(), {});
    expect(differences).toEqual([]);
    expect(carried).toContain('animated instrument');
  });

  test('the clock counts only where the step states it', () => {
    const running = screen({ paused: false });
    expect(statesClock({ sid: 'x', type: 'question' })).toBe(false);
    expect(statesClock({ time: { paused: false } })).toBe(true);
    expect(statesClock({ setup: {} })).toBe(true);
    expect(statesClock({ type: 'read' })).toBe(true);
    const silent = compare(running, screen(), { sid: 'x', type: 'question' });
    expect(silent.differences).toEqual([]);
    expect(silent.carried).toHaveLength(1);
    const stated = compare(running, screen(), {
      sid: 'x',
      time: { paused: true },
    });
    expect(stated.differences[0]).toMatch(/^paused/);
  });
});

describe('sampleSteps', () => {
  const lesson = {
    steps: [
      { sid: 'a', setup: {} },
      { sid: 'b' },
      { sid: 'c' },
      { sid: 'd', tool: 'x' },
      { sid: 'e' },
      { sid: 'f' },
      { sid: 'g', depth: 'quantitative' },
      { sid: 'h' },
    ],
  };
  test('first, last, declaring steps and the step after each', () => {
    expect([...sampleSteps(lesson, 'core')].sort()).toEqual([
      'a',
      'b',
      'd',
      'e',
      'h',
    ]);
  });
  test('a deeper depth adds its own steps', () => {
    expect([...sampleSteps(lesson, 'quantitative')].sort()).toEqual([
      'a',
      'b',
      'd',
      'e',
      'g',
      'h',
    ]);
  });
  test('all takes every step of the path', () => {
    expect(sampleSteps(lesson, 'core', true).size).toBe(7);
  });
});

describe('carriedStage', () => {
  const shown = s => inDepth(s, 'core');
  const stage = { system: { starName: 'S' } };
  const steps = [
    { sid: 'one', setup: { scenario: 'x' } },
    { sid: 'two', stage },
    { sid: 'three' },
    { sid: 'four', setup: { scenario: 'y' } },
    { sid: 'five' },
    { sid: 'six', stage: { hole: {} } },
    { sid: 'seven' },
  ];
  test('a stage-less step after a stage finds it, however many steps later', () => {
    expect(carriedStage(steps, 2, shown)).toBe(stage);
    expect(carriedStage([...steps.slice(0, 3), { sid: 'x' }], 3, shown)).toBe(
      stage
    );
  });
  test('a setup between ends it, and a step with its own stage or setup carries none', () => {
    expect(carriedStage(steps, 4, shown)).toBeNull();
    expect(carriedStage(steps, 1, shown)).toBeNull();
    expect(carriedStage(steps, 3, shown)).toBeNull();
    expect(carriedStage(steps, 6, shown)).toBe(steps[5].stage);
  });
  test('a step of another depth is not on the path', () => {
    const deeper = [
      { sid: 'a', setup: {} },
      { sid: 'b', stage, depth: 'advanced' },
      { sid: 'c' },
    ];
    expect(carriedStage(deeper, 2, shown)).toBeNull();
    expect(carriedStage(deeper, 2, s => inDepth(s, 'advanced'))).toBe(stage);
  });
});

describe('the default sample', () => {
  const entries = [...MANIFEST.entries()];
  const taken = every => entries.filter(([at, e]) => inSample(at, e.id, every));

  test('every lesson of a kind is in the manifest and in the default run', () => {
    const ids = new Set(entries.map(([, e]) => e.id));
    for (const id of KIND_LESSONS) {
      expect(ids.has(id)).toBe(true);
      expect(taken(DEFAULT_EVERY).some(([, e]) => e.id === id)).toBe(true);
    }
  });

  test('it holds a lesson with a deeper path and one without', () => {
    expect(taken(DEFAULT_EVERY).some(([, e]) => e.depths)).toBe(true);
    expect(taken(DEFAULT_EVERY).some(([, e]) => !e.depths)).toBe(true);
  });

  test('it is about a third of the lessons, and an every of 1 takes all', () => {
    const n = taken(DEFAULT_EVERY).length;
    expect(n).toBeGreaterThan(entries.length / 4);
    expect(n).toBeLessThan(entries.length / 2);
    expect(taken(1).length).toBe(entries.length);
  });
});
