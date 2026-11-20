// =============================================================================
// Which lesson steps use a scene, and what "framed" means for one
// -----------------------------------------------------------------------------
// The list (tools/lesson-framing.mjs) is read off the steps' own declarations,
// and the browser specifications (e2e/lessonFraming*.spec.js) are generated over
// it. This pins what the list covers, so a scene kind cannot drop out of the
// check unseen, and shows each clause of the verdict passing and failing.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import {
  FILL_FLOOR,
  FRAMING_SIZES,
  MARKER_FLOOR_PX,
  distinctScenes,
  judgeFraming,
  knownMatches,
  sceneKindOf,
  sceneSteps,
} from '../tools/lesson-framing.mjs';

const list = sceneSteps(INVESTIGATIONS);

describe('the list of scene steps', () => {
  test('names a kind for every step that sets up, stages or binds', () => {
    const declared = INVESTIGATIONS.flatMap(i => i.steps).filter(
      s => s.setup || s.stage || s.bind
    );
    expect(list.length).toBe(declared.length);
    for (const e of list) expect(e.kind).toBeTruthy();
  });

  test('covers every scenario a lesson loads and every kind of stage', () => {
    const scenarios = new Set(
      list.filter(e => e.kind === 'setup').map(e => e.scene)
    );
    expect(scenarios.size).toBe(28);
    const kinds = new Set(list.map(e => e.kind));
    for (const k of ['setup', 'engine-stage', 'model-stage', 'shelf', 'bind'])
      expect(kinds.has(k)).toBe(true);
    const stages = new Set(
      list.filter(e => /stage|population/.test(e.kind)).map(e => e.scene)
    );
    for (const s of ['starPair', 'hole', 'equalMass', 'gwSource', 'binary'])
      expect(stages.has(s)).toBe(true);
  });

  test('keeps a scene by its builder, not by a count', () => {
    expect(sceneKindOf({ setup: { scenario: 'x' }, bind: {} })).toBe('setup');
    expect(sceneKindOf({ stage: { starPair: {} } })).toBe('engine-stage');
    expect(sceneKindOf({ stage: { gwSource: 'x' } })).toBe('model-stage');
    expect(sceneKindOf({ stage: { stars: [] } })).toBe('shelf');
    expect(sceneKindOf({ bind: { a: {} } })).toBe('bind');
    expect(sceneKindOf({ title: 'prose' })).toBe(null);
  });

  test('collapses steps of one scene and keeps the first', () => {
    const d = distinctScenes(list);
    expect(d.length).toBeLessThan(list.length);
    expect(new Set(d.map(e => e.key)).size).toBe(d.length);
  });

  test('measures at a phone, a tablet and a laptop', () => {
    expect(FRAMING_SIZES.map(s => s.kind)).toEqual([
      'phone',
      'tablet',
      'laptop',
    ]);
  });
});

describe('the verdict', () => {
  const body = (over = {}) => ({
    role: 'a',
    x: 100,
    y: 100,
    inside: true,
    free: true,
    coveredBy: null,
    drawnRadius: 3,
    ...over,
  });
  const two = [body(), body({ role: 'b', x: 300, y: 200 })];
  const m = (bodies, over = {}) => ({ bodies, zoom: 1, fill: 0.8, ...over });

  test('passes a framed step', () => {
    expect(judgeFraming(m(two)).pass).toBe(true);
  });
  test('fails a body off the screen, under a panel, or too small', () => {
    expect(judgeFraming(m([body({ inside: false, free: false })])).pass).toBe(
      false
    );
    const under = judgeFraming(
      m([body({ free: false, coveredBy: 'investigationPanel' })])
    );
    expect(under.reasons[0]).toMatch(/under investigationPanel/);
    expect(
      judgeFraming(m([body({ drawnRadius: MARKER_FLOOR_PX - 1 })])).pass
    ).toBe(false);
  });
  test('fails a step that binds nothing', () => {
    expect(judgeFraming(m([])).pass).toBe(false);
  });
  test('a small span fails, and only a shelf, a lone body or one point at the cap of 3 is excused', () => {
    const small = { fill: FILL_FLOOR - 0.05 };
    expect(judgeFraming(m(two, small)).pass).toBe(false);
    // at a zoom of 3 a scene of several bodies is not excused: it is a speck scene
    expect(
      judgeFraming(m(two, { ...small, zoom: 3 }), { kind: 'bind' }).pass
    ).toBe(false);
    expect(
      judgeFraming(m(two, { ...small, zoom: 3 }), { kind: 'shelf' }).pass
    ).toBe(true);
    expect(judgeFraming(m([body()], { ...small, zoom: 3 })).pass).toBe(true);
    const onePoint = [body(), body({ role: 'b', x: 101, y: 100 })];
    expect(judgeFraming(m(onePoint, { ...small, zoom: 3 })).pass).toBe(true);
    // the cap is 3: a lone body at a zoom of 2 is not at it
    expect(judgeFraming(m([body()], { ...small, zoom: 2 })).pass).toBe(false);
  });
  test('a crowd may lose a tenth of its members, in view or under furniture', () => {
    const crowd = n =>
      Array.from({ length: 20 }, (_, i) =>
        i < n
          ? body({ role: `s${i}`, inside: false, free: false })
          : body({ role: `s${i}` })
      );
    expect(judgeFraming(m(crowd(2))).pass).toBe(true);
    expect(judgeFraming(m(crowd(3))).pass).toBe(false);
  });
});

describe('the known list', () => {
  test('excuses a failure only for the reason it lists', () => {
    const known = { why: 'the timeline bar', expect: 'is under timelineBar' };
    expect(knownMatches(['primary is under timelineBar'], known)).toBe(true);
    expect(knownMatches(['primary is under investigationBody'], known)).toBe(
      false
    );
    expect(
      knownMatches(
        ['a is under timelineBar', 'b is outside the viewport'],
        known
      )
    ).toBe(false);
    expect(knownMatches(['a is under timelineBar'], undefined)).toBe(false);
    const two = {
      why: 'docks',
      expect: ['is under timelineBar', 'is under timelineAux'],
    };
    expect(
      knownMatches(['a is under timelineBar', 'b is under timelineAux'], two)
    ).toBe(true);
    expect(knownMatches(['a is under timelineScrubber'], two)).toBe(false);
  });
});
