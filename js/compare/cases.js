// =============================================================================
// Declared comparison cases for lessons
// -----------------------------------------------------------------------------
// A lesson step names a case (`tool: { id: 'compare-transit', case: ... }`);
// the case is the data and the system the instrument starts from. The data are
// synthetic, made by a forward model from a system that differs from the
// starting one in a stated way (`truth`), so the step has an answer: moving
// that element, and only that one, brings the residuals to the noise.
// tests/compareInstrument.test.js holds each case to its stated truth.
//
// Pure: no DOM.
// =============================================================================

import { runForward } from '../forward/index.js';
import { stateFromExoplanet, withElement } from './system.js';

const setup = (kind, extra) => ({
  format: 'gravitas.observing-setup',
  formatVersion: 1,
  epochs: { kind: 'regular', unit: 'd', start: 0, duration: 8, count: 320 },
  instrument: { kind },
  ...extra,
});

export const CASES = Object.freeze({
  // HD 209458 b observed with a planet 18% larger than the record's: the dip
  // is deeper than the model's, and only the radius mends it.
  'hd209458-larger-planet': {
    system: 'hd209458',
    model: 'transit',
    truth: { element: 'radiusEarth', factor: 1.18 },
    setup: setup('photometer', {
      seed: 'compare-larger-planet',
      noise: { white: { sigma: 0.0004, unit: '' } },
    }),
  },
});

/** The system the case's data were made from. */
export function truthState(c) {
  const base = stateFromExoplanet(c.system);
  const v = base.planets[0][c.truth.element];
  return withElement(base, c.truth.element, v * c.truth.factor);
}

/** The case's observation, made from its truth. */
export function caseObservation(id) {
  const c = CASES[id];
  if (!c) throw new Error(`no comparison case "${id}"`);
  return runForward(c.model, truthState(c), c.setup);
}
