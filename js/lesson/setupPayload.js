// =============================================================================
// A lesson's setup as a shared-link payload
// -----------------------------------------------------------------------------
// Taken out of js/investigations.js, which is at its size ceiling; the engine
// still applies a setup through this and nothing else.
// =============================================================================

import { normalizeSeed, formatSeed } from '../rng.js';

/**
 * Convert a lesson's declarative setup into a shared-link payload, so a step cannot set up a state that could
 * not be handed out as a URL (the report's "open this exact state" links stay honest).
 * @param {Object} setup - From a step definition
 * @returns {Object} Payload for applyShareState
 */
export function payloadFromSetup(setup) {
  const payload = {
    v: 1,
    s: setup.scenario,
    seed: formatSeed(normalizeSeed(setup.seed ?? setup.scenario)),
  };
  if (setup.settings) payload.d = { ...setup.settings };
  if (setup.camera) {
    payload.c = [
      setup.camera.zoom ?? 1.5,
      setup.camera.pan?.x ?? 0,
      setup.camera.pan?.y ?? 0,
    ];
  }
  if (setup.paused) payload.p = 1;
  return payload;
}
