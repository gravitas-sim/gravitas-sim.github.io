// The engine's events and step listeners (D-DECOMP-18, S2). No window, no
// event: a Worker or the validation runner has none to tell.

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
