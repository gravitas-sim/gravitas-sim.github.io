// The engine's events and step listeners (D-DECOMP-18, S2), and the bookkeeping
// every merger ends in (S6). Collisions and mergers go to `window` when there is
// one; the worker notice goes to globalThis.

import { clearObjectEnergyHistory } from './conservation.js';
import { getSimulationTime } from './state.js';

export const dispatchSimulationEvent = (name, detail = {}) => {
  if (
    typeof window !== 'undefined' &&
    typeof window.dispatchEvent === 'function' &&
    typeof window.CustomEvent === 'function'
  ) {
    window.dispatchEvent(new window.CustomEvent(name, { detail }));
  }
};

const emitCollisionEvent = detail => {
  dispatchSimulationEvent('gravitasCollision', detail);
};

const buildImpactPayload = (source, target, impactType) => {
  const sourcePos = source?.pos || target?.pos || { x: 0, y: 0 };
  const targetPos = target?.pos || sourcePos;
  const avgPos = {
    x: (sourcePos.x + targetPos.x) / 2,
    y: (sourcePos.y + targetPos.y) / 2,
  };
  const relativeSpeed = Math.hypot(
    (source?.vel?.x || 0) - (target?.vel?.x || 0),
    (source?.vel?.y || 0) - (target?.vel?.y || 0)
  );
  return {
    impactType,
    sourceType: source?.obj_type || source?.kind || 'Unknown',
    targetType: target?.obj_type || target?.kind || impactType,
    relativeSpeed,
    masses: [source?.mass || 0, target?.mass || 0],
    position: avgPos,
  };
};

export const broadcastImpact = (source, target, impactType) => {
  emitCollisionEvent(buildImpactPayload(source, target, impactType));
};

export const announceWorkerFailed = () => {
  globalThis.dispatchEvent?.(
    new CustomEvent('gravitasWorkerFailed', { detail: { worker: 'physics' } })
  );
};

export const simulation = {
  eventLog: [],
  getLatestEvents(count = 20) {
    return (this.eventLog || []).slice(-count);
  },
};

export const announceMerge = detail => {
  if (!simulation.eventLog) simulation.eventLog = [];
  simulation.eventLog.push(detail);
  if (simulation.eventLog.length > 1000) simulation.eventLog.shift();

  try {
    if (
      typeof window !== 'undefined' &&
      window.dispatchEvent &&
      typeof window.CustomEvent === 'function'
    ) {
      window.dispatchEvent(new window.CustomEvent('gravitasMerge', { detail }));
    }
  } catch {
    // no-op: event dispatch not supported in this environment
  }
};

// Run after every integration step. Subscribers, not imports: the engine is the
// bottom of the module graph.
const stepListeners = new Set();

// Subscribe to steps: fn(dt, simulationTime). Returns the unsubscribe.
export function onPhysicsStep(fn) {
  if (typeof fn !== 'function') return () => {};
  stepListeners.add(fn);
  return () => stepListeners.delete(fn);
}

export const runStepListeners = (dt, simulationTime) => {
  if (stepListeners.size) {
    for (const listen of stepListeners) {
      try {
        listen(dt, simulationTime);
      } catch (err) {
        // A listener must never be able to stop the integrator.
        console.warn('A physics-step listener threw:', err);
      }
    }
  }
};

// =============================================================================
// What happens when two bodies become one
// -----------------------------------------------------------------------------
// Three families of merger in this engine decide different things and then do
// the same bookkeeping:
//
//   BH-BH                 always a black hole
//   gas giant + gas giant a bigger gas giant, or a star above the ignition
//                         threshold
//   star / remnant        nine branches: star+star, WD+WD, NS+NS, the mixed
//                         remnants, and star+BH, choosing between a star, a
//                         white dwarf, a neutron star and a black hole
//
// The decision is physics and stays in its branch. The bookkeeping is not, and
// it had been written out three times - twice with an event and once, in the
// richest family of the three, without one. Every consumer of `gravitasMerge`
// is a continuity handler: js/ui.js moves an object reference frame onto the
// result and re-opens the inspector on it, because the product can be a
// different kind of body from either progenitor. A star that merged while the
// reader was following it emitted nothing, so there was nothing to move to and
// the view fell back to the world origin - the exact failure
// e2e/cameraStability.spec.js exists to catch, in the one path that never fired
// the event it watches for.
//
// Where the boundary is, and why absorption is on the other side of it
// -----------------------------------------------------------------------------
// `absorb_into_black_hole` above is not a merger and is deliberately not routed
// through this, and the line is about what is worth announcing rather than
// about arithmetic.
//
// An announced merger is a state transition a reader could be watching: two
// star-class bodies become one, it is rare, and something holding one of them
// needs to be told what to hold instead. Absorption is the opposite on every
// count. It is a planet, an asteroid or a comet falling into a hole that keeps
// its own identity; it is not rare - Stellar Graveyard absorbs 98 per cent of
// its mass within a few seconds - and announcing each one would flood a
// thousand-entry event log and fire the audio layer's bass drop hundreds of
// times in a row. Gas-giant accretion is the same shape and stays outside for
// the same reason.
//
// The one case that sits on the line is a star, white dwarf or neutron star
// falling into a black hole. It is handled inside handle_star_merging, it
// emits a gravitational-wave ripple, and the hole survives as the result - so
// it is announced, with the surviving hole as the result id, and the loop
// above declines to retire a progenitor that is also the result. A reader
// following the star then follows the hole its mass is now inside, which is
// the honest continuation; the alternative is the view falling back to the
// world origin.
//
// This does bookkeeping, not arithmetic. `mergedState` below is offered to the
// branches whose product genuinely is the mass-weighted mean, and the branches
// that compute something else - a merger that shed mass, a remnant whose radius
// follows its own rule - keep computing it. Centralising the arithmetic as well
// would be a physics change wearing a refactor's clothes.
// =============================================================================

/**
 * The mass, position and velocity of a perfectly inelastic merger.
 *
 * Total mass, mass-weighted center of mass, and the velocity that conserves
 * linear momentum. Offered rather than imposed: see the note above.
 *
 * @param {object} a - One progenitor
 * @param {object} b - The other
 * @returns {{mass: number, pos: {x: number, y: number}, vel: {x: number, y: number}}} The product's state
 */
export const mergedState = (a, b) => {
  const m1 = Number.isFinite(a?.mass) ? a.mass : 0;
  const m2 = Number.isFinite(b?.mass) ? b.mass : 0;
  const mass = m1 + m2;
  if (!(mass > 0)) {
    return { mass: 0, pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 } };
  }
  return {
    mass,
    pos: {
      x: (a.pos.x * m1 + b.pos.x * m2) / mass,
      y: (a.pos.y * m1 + b.pos.y * m2) / mass,
    },
    vel: {
      x: (a.vel.x * m1 + b.vel.x * m2) / mass,
      y: (a.vel.y * m1 + b.vel.y * m2) / mass,
    },
  };
};

/**
 * Whether these two may merge at all.
 *
 * A body a prescribed model owns is not the integrator's to evolve, and merging
 * is evolution. A lesson that stands a binary on the canvas draws its
 * components as fixed-size markers and moves them to the separation the
 * waveform is plotted from, so they spend most of an inspiral inside each
 * other's drawn radius - without this the engine merged them into one randomly
 * named black hole a second after the lesson opened, on every step, in both
 * gravitational-wave lessons.
 *
 * @param {object} a - One progenitor
 * @param {object} b - The other
 * @returns {boolean} True when the engine owns both
 */
export const mergeAllowed = (a, b) => !a?.model_owned && !b?.model_owned;

/**
 * Retire two progenitors into one result, and say so exactly once.
 *
 * @param {object} a - The first progenitor
 * @param {object} b - The second
 * @param {?object} result - What replaced them; null when the pair annihilated
 * @param {object} [opts] - Options
 * @param {Function} [opts.remove] - Removes a progenitor from its collection.
 *   The default marks it not alive, which is what `purgeDead` and the step's
 *   own `filterAndClearEnergy` sweep act on; callers that splice their own list
 *   pass their own and take responsibility for the history.
 * @returns {?object} The event detail that was dispatched, or null
 */
export const completeMerger = (a, b, result, { remove } = {}) => {
  if (!a || !b) return null;

  // Both are gone whatever happened, and their energy history goes with them.
  // `purgeDead` clears history for anything it filters out, so the default
  // path is covered; clearing here as well is idempotent and keeps a caller
  // that splices from leaking.
  for (const body of [a, b]) {
    // One family of merger keeps one of its progenitors: a star falling into a
    // black hole leaves the hole heavier and still itself, and the hole is the
    // result. Retiring it here would kill the thing that survived.
    if (body === result) continue;
    body.alive = false;
    if (typeof remove === 'function') remove(body);
    clearObjectEnergyHistory(body.id);
  }

  const detail = {
    type: 'merge',
    // Wall-clock, kept because the audio layer's bass drop is a wall-clock
    // effect and reads it. It is not the simulation's clock and never was.
    time: performance.now(),
    // The simulation's own clock, which is what a reader's timeline, a
    // recording and an exported measurement are all indexed by. In sim units,
    // measured from the moment the world was built.
    simTime: getSimulationTime(),
    simTimeUnits: 'sim',
    primaryId: a.id,
    secondaryId: b.id,
    resultId: result ? result.id : null,
    // Body kinds (the class names, set below), which the merger branches
    // decide on; the minifier cannot rename them.
    //
    // `resultObjType` is separate and is not a synonym: a transformed body
    // carries the obj_type of what it became and the class of what it was, and
    // js/ui.js renders the inspector by obj_type. Both are here so that no
    // consumer has to guess which one it wanted.
    types: {
      primary: a.kind ?? null,
      secondary: b.kind ?? null,
      result: result ? (result.kind ?? null) : null,
      resultObjType: result ? (result.obj_type ?? null) : null,
    },
    masses: {
      primary: Number.isFinite(a.mass) ? a.mass : null,
      secondary: Number.isFinite(b.mass) ? b.mass : null,
      // What the product actually came out at, which is not always the sum:
      // a gas-giant pair that ignites, and the remnant branches that shed
      // mass, both end lighter than m1 + m2.
      result: result && Number.isFinite(result.mass) ? result.mass : null,
      units: 'sim',
    },
    // Kept for the consumers that already read it.
    mergedMass: result && Number.isFinite(result.mass) ? result.mass : null,
    position: result ? { x: result.pos.x, y: result.pos.y } : null,
    velocity: result ? { x: result.vel.x, y: result.vel.y } : null,
    // Neither progenitor was model-owned or this would not have run, so the
    // product is the integrator's. Carried explicitly because a consumer
    // should not have to infer provenance from the absence of a refusal.
    modelOwned: Boolean(result?.model_owned),
    engineOwned: !result?.model_owned,
  };

  announceMerge(detail);

  return detail;
};
