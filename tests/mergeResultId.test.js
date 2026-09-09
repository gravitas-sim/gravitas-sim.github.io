// =============================================================================
// A merge event names what the merger produced
// -----------------------------------------------------------------------------
// The payload carried primaryId and secondaryId - the two bodies that went -
// and nothing about what replaced them. Anything watching one of the
// progenitors could therefore tell that it had gone and had no way to follow
// what it became: an object reference frame fell back to the world origin, and
// the inspector closed. In Binary BH, which merges by design, that is a camera
// jump at the exact moment the reader was watching for.
// =============================================================================

import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  BlackHole,
  bh_list,
  updatePhysics,
  setStateReference,
  updatePhysicsSettings,
  getPhysicsSetting,
} from '../js/physics.js';

const view = {
  paused: false,
  zoom: 1,
  pan: { x: 0, y: 0 },
  frameOffset: { x: 0, y: 0 },
  frame_count: 0,
  followOffset: { x: 0, y: 0 },
  followPan: null,
  followTarget: null,
};

/** Every merge event the module dispatched during a step. */
function captureMerges(run) {
  const seen = [];
  const listener = e => seen.push(e.detail);
  window.addEventListener('gravitasMerge', listener);
  try {
    run();
  } finally {
    window.removeEventListener('gravitasMerge', listener);
  }
  return seen;
}

beforeEach(() => {
  setStateReference(view);
  view.frame_count = 0;
  bh_list.length = 0;
  // Free-moving holes, and no phenomenological inspiral to muddy the step.
  updatePhysicsSettings({
    ...Object.fromEntries(
      ['bh_behavior', 'orbit_decay_rate', 'follow_mode'].map(k => [
        k,
        getPhysicsSetting(k),
      ])
    ),
    bh_behavior: 'Orbiting',
    orbit_decay_rate: 0,
    follow_mode: 'None',
  });
});

describe('a black-hole merger', () => {
  test('reports the id of the hole it produced', () => {
    const a = new BlackHole({ x: 0, y: 0 }, 20, { x: 0, y: 0 });
    const b = new BlackHole({ x: a.radius * 0.5, y: 0 }, 15, { x: 0, y: 0 });
    bh_list.push(a, b);

    const events = captureMerges(() => updatePhysics(0.001));

    expect(events).toHaveLength(1);
    const [evt] = events;
    expect(evt.type).toBe('merge');
    expect([evt.primaryId, evt.secondaryId].sort()).toEqual(
      [a.id, b.id].sort()
    );
    expect(typeof evt.resultId).toBe('number');
    // Not either of the two that went: this is the new hole.
    expect(evt.resultId).not.toBe(a.id);
    expect(evt.resultId).not.toBe(b.id);
  });

  test('the id it reports is the hole that is actually there afterwards', () => {
    const a = new BlackHole({ x: 0, y: 0 }, 20, { x: 0, y: 0 });
    const b = new BlackHole({ x: a.radius * 0.5, y: 0 }, 15, { x: 0, y: 0 });
    bh_list.push(a, b);

    const [evt] = captureMerges(() => updatePhysics(0.001));

    expect(bh_list).toHaveLength(1);
    expect(bh_list[0].id).toBe(evt.resultId);
    // And it is the combined mass, so a frame that follows it follows the
    // thing the two became rather than an unrelated body.
    expect(bh_list[0].mass).toBeCloseTo(evt.mergedMass, 9);
  });
});
