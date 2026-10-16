// =============================================================================
// Reseeding a lesson scene changes nothing, and here is the proof
// -----------------------------------------------------------------------------
// Per-student scenario variants are an obvious-looking idea: hand every student
// the same investigation with a different seed so they cannot copy each other's
// numbers. It does not work here, and this is the test that says why before
// anybody designs around it.
//
// The lab scenarios are hand-built. A lesson step declares a stage - a hole of
// ten solar masses, a binary at this separation, a population of that many
// stars - and js/lessonStage.js places every body from those numbers. Nothing
// in that path draws from Math.random, so the seeded stream withSeed() installs
// is never consulted and the same stage comes out identical whatever the seed.
//
// Every stage in every shipped investigation is built here under three seeds
// and compared body by body: position, velocity, mass and type. If a stage ever
// does start sampling, this fails, and the person who made it random finds out
// in the same commit rather than an instructor discovering that half the class
// has a different galaxy.
//
// One trap, recorded because it cost an hour: applyStage() short-circuits when
// it believes the stage is already built - stageIntact() checks the body lists
// and returns early. Emptying the body lists between builds is not enough,
// because lessonStage keeps its own key and snapshots, so the second build is a
// no-op and three identical EMPTY snapshots compare equal. That reads as
// "deterministic" and means nothing. resetStageForTests() is what clears it,
// and the body count is asserted so a vacuous pass cannot happen again.
// =============================================================================

import { describe, test, expect, beforeAll } from '@jest/globals';
import { MANIFEST } from '../js/data/investigations/manifest.js';
import * as stageMod from '../js/lessonStage.js';
import { withSeed } from '../js/rng.js';
import * as P from '../js/physics.js';

const LISTS = [
  'bh_list',
  'stars',
  'gas_giants',
  'planets',
  'asteroids',
  'comets',
  'debris',
  'particles',
  'neutron_stars',
  'white_dwarfs',
  'galaxies',
];

/** Everything that is on the table, in a form two builds can be compared by. */
const snapshot = () => {
  const out = [];
  for (const key of LISTS) {
    for (const o of P[key] || []) {
      out.push(
        `${key}:${o.obj_type}:` +
          `${(o.pos?.x ?? 0).toFixed(6)},${(o.pos?.y ?? 0).toFixed(6)}:` +
          `${(o.vel?.x ?? 0).toFixed(6)},${(o.vel?.y ?? 0).toFixed(6)}:` +
          `${Number(o.mass).toPrecision(10)}`
      );
    }
  }
  return out.sort();
};

const clear = () => {
  stageMod.resetStageForTests?.();
  for (const key of LISTS) if (Array.isArray(P[key])) P[key].length = 0;
};

const build = (stage, seed) => {
  clear();
  P.resetPhysicsObjectCounter?.();
  return withSeed(seed, () => {
    stageMod.applyStage(stage);
    return snapshot();
  });
};

/** @type {Array<{lesson: string, sid: string, stage: object}>} */
const stages = [];

beforeAll(async () => {
  for (const entry of MANIFEST) {
    let lesson;
    try {
      const mod = await import(`../js/data/investigations/${entry.id}.js`);
      lesson = mod.default || mod[Object.keys(mod)[0]];
    } catch {
      continue;
    }
    for (const step of lesson?.steps || []) {
      if (step.stage) {
        stages.push({ lesson: entry.id, sid: step.sid, stage: step.stage });
      }
    }
  }
});

describe('lesson scenes do not depend on the seed', () => {
  test('there are stages to check, so this is not vacuous', () => {
    expect(stages.length).toBeGreaterThan(100);
  });

  test('every stage builds the same bodies under three different seeds', () => {
    const differing = [];
    let built = 0;
    let empty = 0;
    for (const { lesson, sid, stage } of stages) {
      const a = build(stage, 1);
      const b = build(stage, 987654321);
      const c = build(stage, 42);
      built += a.length;
      if (a.length === 0) empty++;
      if (a.join('\n') !== b.join('\n') || b.join('\n') !== c.join('\n')) {
        differing.push(`${lesson}/${sid}`);
      }
    }
    // The guard against the short-circuit described in the header: three empty
    // snapshots also compare equal.
    expect(empty).toBe(0);
    expect(built).toBeGreaterThan(500);
    expect(differing).toEqual([]);
  });
});
