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
    inside: true,
    free: true,
    coveredBy: null,
    drawnRadius: 3,
    ...over,
  });
  const m = (bodies, over = {}) => ({
    bodies,
    capped: false,
    fill: 0.8,
    ...over,
  });

  test('passes a framed step', () => {
    expect(judgeFraming(m([body(), body({ role: 'b' })])).pass).toBe(true);
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
  test('fails bodies that fill little of the free region unless zoom is capped', () => {
    expect(judgeFraming(m([body()], { fill: FILL_FLOOR - 0.05 })).pass).toBe(
      false
    );
    expect(judgeFraming(m([body()], { fill: 0.01, capped: true })).pass).toBe(
      true
    );
  });
});
