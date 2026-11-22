// The statement of what pulls on what, on every preset the sandbox ships
// (docs/gravity-roles.md). Each of the 61 is built headless as the page builds
// it; the statement's pulling, feeling and one-way lists must be the relation's
// over the lists present, and the scene statement's line must be the line the
// builder gives. On five presets with different kinds, a one-step probe of the
// engine says, for one body of each kind present, which other kinds it moves:
// a source's mass is doubled and the step re-run from the same state, and the
// target's change differs exactly where the relation and canMoveNow say.
import { describe, test, expect } from '@jest/globals';
import * as physics from '../js/physics.js';
import { build } from '../tools/tides-scenarios.mjs';
import { SCENARIO_IDS } from '../js/scenarios.js';
import { gravityRoles, canMoveNow } from '../js/engine/state.js';
import { sceneRoles, LIST_KIND } from '../js/engine/sources.js';
import { rolesSentences, sourcesStatement } from '../js/sceneStatement.js';

const LISTS = Object.keys(LIST_KIND);
const counts = () => Object.fromEntries(LISTS.map(l => [l, physics[l].length]));

describe('the statement on all 61 presets', () => {
  test('there are 61', () => {
    expect(SCENARIO_IDS.length).toBe(61);
  });

  test.each([...SCENARIO_IDS])('%s', id => {
    build(id, 1);
    const s = physics.physicsSettings;
    const c = counts();
    const r = sceneRoles(c, s);
    const { pulls } = gravityRoles(s);
    const present = LISTS.filter(l => c[l] > 0);
    // Independently of sceneRoles: each list present, and each ordered pair.
    expect(r.pulling.map(x => x.list)).toEqual(
      present.filter(
        l =>
          present.some(m => pulls(LIST_KIND[l], LIST_KIND[m])) ||
          pulls(LIST_KIND[l], 'Planet')
      )
    );
    expect([...r.pulling, ...r.feeling].map(x => x.list).sort()).toEqual(
      [...present].sort()
    );
    const oneWay = [];
    for (const a of present)
      for (const b of present) {
        const ab = pulls(LIST_KIND[a], LIST_KIND[b]);
        const ba = pulls(LIST_KIND[b], LIST_KIND[a]);
        if (ab && !ba) oneWay.push([a, b]);
      }
    expect(r.oneWay).toEqual(oneWay);
    expect(r.holesFeelOnlyHoles).toBe(c.bh_list > 0 && present.length > 1);
    expect(r.staticHoles).toBe(c.bh_list > 0 && s.bh_behavior !== 'Orbiting');
    // The scene statement's line is the builder's line.
    expect(sourcesStatement(s)).toBe(rolesSentences(c, s).join(' '));
    // A schematic G is said with the time unit.
    expect(sourcesStatement(s).includes('schematic')).toBe(
      present.length > 0 && s.gravitational_constant > 100
    );
  });
});

/** Every body's position, velocity and mass, to put the world back. */
const snapshot = () =>
  LISTS.flatMap(l =>
    physics[l].map(b => ({
      b,
      pos: { ...b.pos },
      vel: { ...b.vel },
      mass: b.mass,
      grace: b.graceUsed,
    }))
  );
const restore = snap => {
  for (const { b, pos, vel, mass, grace } of snap) {
    b.pos = { ...pos };
    b.vel = { ...vel };
    b.mass = mass;
    if (grace !== undefined) b.graceUsed = grace;
  }
};

const PROBED = [
  'binary-bh',
  'solar-system',
  'galactic-collision',
  'compact-object-zoo',
  'tidal-disruption-event',
];

describe('a one-step probe of the engine agrees with the relation', () => {
  test.each(PROBED)('%s', id => {
    build(id, 1);
    physics.updatePhysicsSettings({
      enable_star_merging: false,
      use_barnes_hut: false,
      orbit_decay_rate: 0,
    });
    const s = physics.physicsSettings;
    const { pulls } = gravityRoles(s);
    const present = LISTS.filter(l => physics[l].length > 0 && l !== 'debris');
    let checked = 0;
    for (const a of present)
      for (const b of present) {
        const source = physics[a][0];
        const target = physics[b].find(x => x !== source);
        if (!target) continue;
        // The target starts each run at rest, so its velocity after the step
        // is the step's own change and a small source's share is not lost
        // in the rounding of a large velocity.
        const snap = snapshot();
        target.vel = { x: 0, y: 0 };
        physics.updatePhysics(1e-3);
        const v1 = { ...target.vel };
        restore(snap);
        target.vel = { x: 0, y: 0 };
        source.mass *= 2;
        physics.updatePhysics(1e-3);
        const v2 = { ...target.vel };
        restore(snap);
        const moved = v1.x !== v2.x || v1.y !== v2.y;
        const expected =
          pulls(LIST_KIND[a], LIST_KIND[b]) && canMoveNow(target);
        expect({ a, b, moved }).toEqual({ a, b, moved: expected });
        checked++;
      }
    expect(checked).toBeGreaterThan(0);
  });
});
