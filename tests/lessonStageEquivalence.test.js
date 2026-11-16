// =============================================================================
// Every staged lesson draws the same stage it always drew
// -----------------------------------------------------------------------------
// The stage code and the stellar model load when a lesson's first staged step
// is reached rather than with the lesson engine. That moves where the code
// arrives from and nothing it computes, and this is the check that says so:
// for every distinct stage a shipped lesson declares, the bodies it puts on
// the canvas (kind, name, position, velocity, mass, radius, colour), the roles
// and labels the lesson sees, the stage's key and scale, and the camera a fit
// chooses, reduced to a digest, held against a recorded fixture.
//
// The fixture was recorded from the engine that imported the stage statically,
// before the change. It is re-recorded only when a stage is meant to differ:
//   RECORD_STAGE_FIXTURE=1 npm test -- tests/lessonStageEquivalence.test.js
// =============================================================================

/* global process */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { URL } from 'node:url';
import { describe, test, expect, beforeAll } from '@jest/globals';
import { MANIFEST } from '../js/data/investigations/manifest.js';
import { withSeed } from '../js/rng.js';
import { state } from '../js/appState.js';
import * as P from '../js/physics.js';

const FIXTURE = new URL(
  './fixtures/lessonStageEquivalence.json',
  import.meta.url
);

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
const FIELDS = ['name', 'mass', 'radius', 'color', 'luminosity', 'teff'];

const r6 = n => (Number.isFinite(n) ? Number(n.toFixed(6)) : n);

const bodies = () => {
  const out = [];
  for (const key of LISTS) {
    for (const o of P[key] || []) {
      const row = [
        key,
        o.obj_type,
        r6(o.pos?.x ?? 0),
        r6(o.pos?.y ?? 0),
        r6(o.vel?.x ?? 0),
        r6(o.vel?.y ?? 0),
      ];
      for (const f of FIELDS) {
        const v = o[f];
        row.push(
          typeof v === 'number' ? Number(v.toPrecision(10)) : (v ?? null)
        );
      }
      out.push(JSON.stringify(row));
    }
  }
  return out;
};

const digest = text =>
  createHash('sha256').update(text).digest('hex').slice(0, 20);

/** The stage module itself, and the door the engine reaches it through. */
let real;
let gate;

const clear = () => {
  real.resetStageForTests?.();
  for (const key of LISTS) if (Array.isArray(P[key])) P[key].length = 0;
  P.resetPhysicsObjectCounter?.();
  state.zoom = 1;
  state.pan = { x: 0, y: 0 };
};

const record = (stage, declared) =>
  withSeed(1, () => {
    clear();
    const built = stage.applyStage(declared);
    const fitted = stage.fitStage();
    const rows = bodies();
    return {
      built: built.built,
      roles: built.roles,
      problems: Object.keys(built.problems || {}),
      count: rows.length,
      key: digest(stage.stageKey()),
      scale: stage.stageScale(),
      stars: stage.stagedStars().length,
      labels: digest(
        JSON.stringify(
          stage
            .stagedStars()
            .map(e => [e.role, e.star?.name ?? null, e.model ?? null])
        )
      ),
      population: stage.stagedPopulation()
        ? Object.keys(stage.stagedPopulation())
        : null,
      camera: [fitted, r6(state.zoom), r6(state.pan.x), r6(state.pan.y)],
      bodies: digest(rows.join('\n')),
    };
  });

/** @type {Map<string, object>} distinct stage declarations, by digest */
const distinct = new Map();
/** @type {Record<string, string[]>} lesson to the digests of the stages it declares */
const where = {};

beforeAll(async () => {
  real = await import('../js/lessonStage.js');
  gate = await import('../js/lesson/stageGate.js');
  for (const entry of MANIFEST) {
    const mod = await import(`../js/data/investigations/${entry.id}.js`);
    for (const step of mod.default?.steps || []) {
      if (!step.stage) continue;
      const key = digest(JSON.stringify(step.stage));
      distinct.set(key, step.stage);
      (where[entry.id] ||= []).includes(key) || where[entry.id].push(key);
    }
  }
});

const stagesThrough = stage => {
  const now = {};
  for (const [key, declared] of distinct) now[key] = record(stage, declared);
  return now;
};

describe('staged lessons draw the stage they always drew', () => {
  test('every distinct stage of every lesson matches the recorded fixture', () => {
    const now = stagesThrough(real);
    expect(Object.keys(now).length).toBeGreaterThan(50);
    expect(Object.values(now).every(s => s.count > 0)).toBe(true);
    const doc = { stages: now, where };
    if (process.env.RECORD_STAGE_FIXTURE) {
      writeFileSync(FIXTURE, `${JSON.stringify(doc)}\n`);
      return;
    }
    const was = JSON.parse(readFileSync(FIXTURE, 'utf8'));
    expect(where).toEqual(was.where);
    const differing = Object.keys(now).filter(
      k => JSON.stringify(now[k]) !== JSON.stringify(was.stages[k])
    );
    expect(differing).toEqual([]);
  });

  test('the engine draws the same stages through its lazy door', async () => {
    // Before the code is in, the door answers as an empty stage does.
    expect(gate.stageLoaded()).toBe(false);
    expect(gate.stagedStars()).toEqual([]);
    expect(gate.stageKey()).toBe('');
    expect(gate.stagePresence()).toEqual({
      present: 0,
      total: 0,
      allGone: false,
    });
    expect(gate.applyStage({ stars: [] }).built).toBe(false);
    expect(() => gate.clearStage()).not.toThrow();
    await gate.loadStage();
    expect(gate.stageLoaded()).toBe(true);
    const through = stagesThrough(gate);
    const was = JSON.parse(readFileSync(FIXTURE, 'utf8'));
    expect(through).toEqual(was.stages);
  });
});
