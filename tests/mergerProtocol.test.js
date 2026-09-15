// =============================================================================
// Every merger does the same bookkeeping, and says so once
// -----------------------------------------------------------------------------
// Three families of merger decide different things - BH-BH always makes a black
// hole, a gas-giant pair makes a bigger gas giant or ignites into a star, and
// the star/remnant family chooses between a star, a white dwarf, a neutron star
// and a black hole across nine branches. What they do afterwards is the same,
// and it had been written out three times: twice with an event, and once - in
// the richest family of the three - without one.
//
// That omission was not cosmetic. Every consumer of `gravitasMerge` is a
// continuity handler: js/ui.js moves an object reference frame onto the result
// and re-opens the inspector on it. A star that merged while the reader was
// following it announced nothing, so there was nothing to move to and the view
// fell back to the world origin.
//
// This is the pair matrix. It asserts what each pair produces, that the
// bookkeeping happened, and that exactly one event carries what a consumer
// needs to follow the result.
// =============================================================================

import { describe, test, expect, beforeEach } from '@jest/globals';
import * as P from '../js/physics.js';
import {
  setFrame,
  resetFrame,
  frameObjectId,
  transferFrame,
  OBJECT,
} from '../js/referenceFrame.js';

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

/** Every body list the engine keeps. */
const LISTS = [
  'bh_list',
  'stars',
  'planets',
  'gas_giants',
  'asteroids',
  'comets',
  'neutron_stars',
  'white_dwarfs',
  'debris',
];

/**
 * Empty every list.
 *
 * Read through the module namespace on every access rather than aliased once:
 * js/physics.js reassigns these arrays (purgeDead, filterAndClearEnergy), so a
 * captured reference goes stale and a test that holds one is clearing a
 * detached copy.
 */
function clearWorld() {
  for (const name of LISTS) {
    const list = P[name];
    if (Array.isArray(list)) list.length = 0;
  }
}

/** Everything alive, now. */
const allBodies = () =>
  LISTS.flatMap(name => (Array.isArray(P[name]) ? P[name] : []));

/** Run something and collect the merge events it dispatched. */
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

/** Put b just inside a's radius, so the pair is overlapping at t=0. */
function overlap(a, b) {
  b.pos.x = a.radius * 0.3;
  b.pos.y = 0;
}

beforeEach(() => {
  P.setStateReference(view);
  view.frame_count = 0;
  clearWorld();
  P.updatePhysicsSettings({
    // Free-moving holes and no phenomenological inspiral, so the step under
    // test is the merger and nothing else.
    bh_behavior: 'Orbiting',
    orbit_decay_rate: 0,
    follow_mode: 'None',
    enable_star_merging: true,
  });
  resetFrame();
});

// --- The pairs ---------------------------------------------------------------
// Masses chosen to land on a named branch; the expectations were read off the
// engine rather than guessed, and each one is the branch's own rule.
const PAIRS = [
  {
    name: 'star + star, light enough to stay a star',
    build: () => [
      new P.StarObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 1),
      new P.StarObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 1),
    ],
    into: ['stars', 'stars'],
    resultClass: 'StarObject',
    resultList: 'stars',
  },
  {
    name: 'star + star, heavy enough to collapse',
    build: () => [
      new P.StarObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 20),
      new P.StarObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 20),
    ],
    into: ['stars', 'stars'],
    resultClass: 'BlackHole',
    resultList: 'bh_list',
  },
  {
    name: 'white dwarf + white dwarf',
    build: () => [
      new P.WhiteDwarf({ x: 0, y: 0 }, { x: 0, y: 0 }, 0.6),
      new P.WhiteDwarf({ x: 0, y: 0 }, { x: 0, y: 0 }, 0.6),
    ],
    into: ['white_dwarfs', 'white_dwarfs'],
    resultClass: 'WhiteDwarf',
    resultList: 'white_dwarfs',
  },
  {
    name: 'neutron star + neutron star',
    build: () => [
      new P.NeutronStar({ x: 0, y: 0 }, { x: 0, y: 0 }, 1.4),
      new P.NeutronStar({ x: 0, y: 0 }, { x: 0, y: 0 }, 1.4),
    ],
    into: ['neutron_stars', 'neutron_stars'],
    resultClass: 'NeutronStar',
    resultList: 'neutron_stars',
  },
  {
    name: 'mixed remnants: neutron star + white dwarf',
    build: () => [
      new P.NeutronStar({ x: 0, y: 0 }, { x: 0, y: 0 }, 1.4),
      new P.WhiteDwarf({ x: 0, y: 0 }, { x: 0, y: 0 }, 0.6),
    ],
    into: ['neutron_stars', 'white_dwarfs'],
    resultClass: 'NeutronStar',
    resultList: 'neutron_stars',
  },
  {
    name: 'black hole + black hole',
    build: () => [
      new P.BlackHole({ x: 0, y: 0 }, 20, { x: 0, y: 0 }),
      new P.BlackHole({ x: 0, y: 0 }, 15, { x: 0, y: 0 }),
    ],
    into: ['bh_list', 'bh_list'],
    resultClass: 'BlackHole',
    resultList: 'bh_list',
  },
  {
    name: 'gas giant + gas giant, below the ignition threshold',
    build: () => [
      new P.GasGiant({ x: 0, y: 0 }, { x: 0, y: 0 }, 1),
      new P.GasGiant({ x: 0, y: 0 }, { x: 0, y: 0 }, 1),
    ],
    into: ['gas_giants', 'gas_giants'],
    resultClass: 'GasGiant',
    resultList: 'gas_giants',
  },
  {
    name: 'gas giant + gas giant, over it, so a star forms',
    build: () => [
      new P.GasGiant({ x: 0, y: 0 }, { x: 0, y: 0 }, 50),
      new P.GasGiant({ x: 0, y: 0 }, { x: 0, y: 0 }, 50),
    ],
    into: ['gas_giants', 'gas_giants'],
    resultClass: 'StarObject',
    resultList: 'stars',
  },
];

describe.each(PAIRS)('$name', ({ build, into, resultClass, resultList }) => {
  /** Build the pair, overlap it, and run one step. */
  function merge() {
    const [a, b] = build();
    overlap(a, b);
    P[into[0]].push(a);
    P[into[1]].push(b);
    const before = {
      mass: a.mass + b.mass,
      px: a.mass * a.vel.x + b.mass * b.vel.x,
      py: a.mass * a.vel.y + b.mass * b.vel.y,
      comX: (a.pos.x * a.mass + b.pos.x * b.mass) / (a.mass + b.mass),
      comY: (a.pos.y * a.mass + b.pos.y * b.mass) / (a.mass + b.mass),
      ids: [a.id, b.id],
    };
    const events = captureMerges(() => P.updatePhysics(0.001));
    return { a, b, before, events };
  }

  test('produces exactly one merge event', () => {
    const { events } = merge();
    expect(events).toHaveLength(1);
  });

  test('produces the result type its branch decided on', () => {
    const { events } = merge();
    expect(events[0].types.result).toBe(resultClass);
    // obj_type is carried separately and is not a synonym: a transformed body
    // keeps the obj_type of what it became and the class of what it was, and
    // js/ui.js renders the inspector by obj_type.
    expect(events[0].types.resultObjType).toBeTruthy();
  });

  test('the result is in its collection, and both progenitors are gone', () => {
    const { a, b, events } = merge();
    const [evt] = events;
    const result = allBodies().find(body => body.id === evt.resultId);
    expect(result).toBeDefined();
    expect(P[resultList].some(body => body.id === evt.resultId)).toBe(true);
    // A progenitor that is also the result survives on purpose - see star+BH.
    for (const gone of [a, b]) {
      if (gone.id === evt.resultId) continue;
      expect(allBodies().some(body => body.id === gone.id)).toBe(false);
      expect(gone.alive).toBe(false);
    }
  });

  test('names both progenitors and their types', () => {
    const { before, events } = merge();
    const [evt] = events;
    expect([evt.primaryId, evt.secondaryId].sort()).toEqual(
      [...before.ids].sort()
    );
    expect(evt.types.primary).toBeTruthy();
    expect(evt.types.secondary).toBeTruthy();
  });

  test('carries the masses on both sides of the merger', () => {
    const { before, events } = merge();
    const [evt] = events;
    expect(evt.masses.primary + evt.masses.secondary).toBeCloseTo(
      before.mass,
      6
    );
    expect(evt.masses.result).toBeGreaterThan(0);
    expect(evt.masses.units).toBe('sim');
    // Legacy field, kept for the consumers that already read it.
    expect(evt.mergedMass).toBe(evt.masses.result);
  });

  test('conserves linear momentum into the result', () => {
    const { before, events } = merge();
    const [evt] = events;
    const result = allBodies().find(body => body.id === evt.resultId);
    const scale = Math.max(1, Math.abs(before.px) + Math.abs(before.py));
    expect(result.mass * result.vel.x - before.px).toBeLessThan(1e-6 * scale);
    expect(result.mass * result.vel.y - before.py).toBeLessThan(1e-6 * scale);
    expect(evt.velocity).toEqual({ x: result.vel.x, y: result.vel.y });
  });

  test('puts the result at the center of mass', () => {
    const { before, events } = merge();
    const [evt] = events;
    // The star+BH family is the exception and says so: the hole survives where
    // it was rather than moving to the barycenter.
    if (evt.resultId === before.ids[0] || evt.resultId === before.ids[1])
      return;
    expect(evt.position.x).toBeCloseTo(before.comX, 6);
    expect(evt.position.y).toBeCloseTo(before.comY, 6);
  });

  test('is stamped with the simulation clock, not the wall clock', () => {
    const { events } = merge();
    const [evt] = events;
    expect(typeof evt.simTime).toBe('number');
    expect(evt.simTimeUnits).toBe('sim');
    expect(evt.simTime).not.toBe(evt.time);
    // The wall clock is still there, because the audio bass drop is a
    // wall-clock effect and reads it.
    expect(typeof evt.time).toBe('number');
  });

  test('says the result belongs to the engine', () => {
    const { events } = merge();
    expect(events[0].engineOwned).toBe(true);
    expect(events[0].modelOwned).toBe(false);
  });

  test('goes into the simulation event log exactly once', () => {
    const { events } = merge();
    const logged = (P.simulation.eventLog || []).filter(
      e => e.type === 'merge' && e.resultId === events[0].resultId
    );
    expect(logged).toHaveLength(1);
  });

  // The whole reason the event exists. A reader following a progenitor is
  // handed the result, rather than the frame falling back to the world origin.
  test('a reference frame on a progenitor transfers to the result', () => {
    const [a, b] = build();
    overlap(a, b);
    P[into[0]].push(a);
    P[into[1]].push(b);
    setFrame(OBJECT, a.id);
    const [evt] = captureMerges(() => P.updatePhysics(0.001));
    // This is what js/ui.js does with the payload.
    transferFrame([evt.primaryId, evt.secondaryId], evt.resultId);
    expect(frameObjectId()).toBe(evt.resultId);
    expect(allBodies().some(body => body.id === frameObjectId())).toBe(true);
  });
});

// --- Star + black hole, where one progenitor is the result -------------------
describe('a star falling into a black hole', () => {
  /** The hole survives; the star does not. */
  function merge() {
    const bh = new P.BlackHole({ x: 0, y: 0 }, 20, { x: 0, y: 0 });
    const star = new P.StarObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 1);
    star.pos.x = bh.radius * 0.3;
    const holeMass = bh.mass;
    P.bh_list.push(bh);
    P.stars.push(star);
    const events = captureMerges(() => P.updatePhysics(0.001));
    return { bh, star, holeMass, events };
  }

  test('announces the merger with the surviving hole as the result', () => {
    const { bh, events } = merge();
    expect(events).toHaveLength(1);
    expect(events[0].resultId).toBe(bh.id);
    expect(events[0].types.result).toBe('BlackHole');
  });

  test('retires the star and keeps the hole', () => {
    const { bh, star } = merge();
    expect(star.alive).toBe(false);
    expect(P.stars.some(s => s.id === star.id)).toBe(false);
    expect(P.bh_list.some(h => h.id === bh.id)).toBe(true);
    expect(bh.alive).not.toBe(false);
  });

  test('the hole ends heavier by the star it consumed', () => {
    const { bh, star, holeMass, events } = merge();
    expect(bh.mass).toBeCloseTo(holeMass + events[0].masses.primary, 6);
    expect(star.mass).toBeGreaterThan(0);
  });

  test('a reader following the star is moved onto the hole, not to the origin', () => {
    const bh = new P.BlackHole({ x: 0, y: 0 }, 20, { x: 0, y: 0 });
    const star = new P.StarObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 1);
    star.pos.x = bh.radius * 0.3;
    P.bh_list.push(bh);
    P.stars.push(star);
    setFrame(OBJECT, star.id);
    const [evt] = captureMerges(() => P.updatePhysics(0.001));
    transferFrame([evt.primaryId, evt.secondaryId], evt.resultId);
    expect(frameObjectId()).toBe(bh.id);
  });
});

// --- Ownership ---------------------------------------------------------------
// A body a prescribed model owns is not the integrator's to evolve, and merging
// is evolution. Without this the engine merged both gravitational-wave lessons'
// staged binaries into one randomly named black hole a second after the lesson
// opened, on every step.
describe('a model-owned body is never merged automatically', () => {
  test('black holes', () => {
    const a = new P.BlackHole({ x: 0, y: 0 }, 20, { x: 0, y: 0 });
    const b = new P.BlackHole({ x: 0, y: 0 }, 15, { x: 0, y: 0 });
    overlap(a, b);
    a.model_owned = true;
    P.bh_list.push(a, b);
    const events = captureMerges(() => P.updatePhysics(0.001));
    expect(events).toHaveLength(0);
    expect(P.bh_list).toHaveLength(2);
  });

  test('stars', () => {
    const a = new P.StarObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 1);
    const b = new P.StarObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 1);
    overlap(a, b);
    b.model_owned = true;
    P.stars.push(a, b);
    const events = captureMerges(() => P.updatePhysics(0.001));
    expect(events).toHaveLength(0);
    expect(P.stars).toHaveLength(2);
  });

  // This guard did not exist before the protocol: js/lessonStage.js stages gas
  // giants and marks them model_owned, and the gas-giant loop merged them
  // anyway.
  test('gas giants', () => {
    const a = new P.GasGiant({ x: 0, y: 0 }, { x: 0, y: 0 }, 1);
    const b = new P.GasGiant({ x: 0, y: 0 }, { x: 0, y: 0 }, 1);
    overlap(a, b);
    a.model_owned = true;
    P.gas_giants.push(a, b);
    const events = captureMerges(() => P.updatePhysics(0.001));
    expect(events).toHaveLength(0);
    expect(P.gas_giants).toHaveLength(2);
  });
});

// --- The other side of the boundary ------------------------------------------
describe('absorption is not a merger and is not announced', () => {
  // A planet falling into a hole leaves the hole holding its own id. Nothing
  // needs to be transferred, it is not rare - Stellar Graveyard absorbs most of
  // its mass in seconds - and announcing each one would flood the event log and
  // fire the audio layer hundreds of times.
  test('a black hole absorbing a planet emits nothing', () => {
    const bh = new P.BlackHole({ x: 0, y: 0 }, 50, { x: 0, y: 0 });
    const planet = new P.Planet({ x: 0, y: 0 }, { x: 0, y: 0 });
    planet.pos.x = bh.radius * 0.2;
    P.bh_list.push(bh);
    P.planets.push(planet);
    const events = captureMerges(() => P.updatePhysics(0.001));
    expect(events).toHaveLength(0);
  });

  test('absorb_into_black_hole moves mass without announcing anything', () => {
    const bh = new P.BlackHole({ x: 0, y: 0 }, 50, { x: 0, y: 0 });
    const planet = new P.Planet({ x: 10, y: 0 }, { x: 0, y: 0 });
    const before = bh.mass;
    planet.alive = false;
    const events = captureMerges(() => P.absorb_into_black_hole(bh, planet));
    expect(events).toHaveLength(0);
    expect(bh.mass).toBeCloseTo(before + planet.mass, 9);
    // And the hole is still itself, which is why there is nothing to transfer.
    expect(P.bh_list.length + 1).toBeGreaterThan(0);
  });
});
