// The engine's events: the collision and merger announcements, the worker
// failure notice and the step listeners (D-DECOMP-18, slice S2). Moved from
// js/physics.js verbatim; the facade re-exports `onPhysicsStep` and
// `simulation`, so no importer changes.
//
// Nothing here draws a random number or reads engine state, so the stream and
// the physics are the same whether anything listens. The three window
// dispatches stay behind their guards: a Worker, a test with no DOM and the
// headless validation runner have no `window` to tell, and the engine runs
// there unchanged. This module imports nothing.

/** Tell the page, if there is one, that something happened. */
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

/** The physics Worker died or went silent (`gravitasWorkerFailed`). */
export const announceWorkerFailed = () => {
  globalThis.dispatchEvent?.(
    new CustomEvent('gravitasWorkerFailed', { detail: { worker: 'physics' } })
  );
};

// Public simulation object for lightweight event access
export const simulation = {
  eventLog: [],
  getLatestEvents(count = 20) {
    return (this.eventLog || []).slice(-count);
  },
};

/** Log a merger (the last 1000 are kept) and announce it (`gravitasMerge`). */
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

/**
 * Things to run after every integration step.
 *
 * Not after every frame: a scenario that substeps takes several of these per
 * frame, and a paused or scrubbing frame takes none. Anything that has to see
 * the states the integrator actually produced - event detection, in particular,
 * which has to be able to say how finely it localised something - belongs here
 * and not in the render loop.
 *
 * Inverted deliberately. The engine is the bottom of the module graph and must
 * not import the things that care about it, so they subscribe instead.
 *
 * @type {Set<Function>}
 */
const stepListeners = new Set();

/**
 * Subscribe to integration steps.
 *
 * @param {Function} fn - Called with (dt, simulationTime) after each step
 * @returns {Function} Unsubscribe
 */
export function onPhysicsStep(fn) {
  if (typeof fn !== 'function') return () => {};
  stepListeners.add(fn);
  return () => stepListeners.delete(fn);
}

/** After the step is complete; the set is empty unless something armed a watch. */
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
