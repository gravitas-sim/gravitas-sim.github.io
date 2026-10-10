// =============================================================================
// The forward models: a Gravitas model state and an observing setup in, a
// synthetic gravitas.observation (with its truth manifest) out
// -----------------------------------------------------------------------------
// Each model is a pure module and runs in a Worker as well as on the page. The
// registry is the only place that lists them.
// =============================================================================

import * as transit from './models/transit.js';
import * as radialVelocity from './models/radialVelocity.js';
import * as astrometry from './models/astrometry.js';
import * as periodic from './models/periodic.js';
import * as spectrum from './models/spectrum.js';
import * as catalogue from './models/catalogue.js';
import * as image from './models/image.js';

export const FORWARD_MODELS = Object.freeze({
  [transit.ID]: transit,
  [radialVelocity.ID]: radialVelocity,
  [astrometry.ID]: astrometry,
  [periodic.ID]: periodic,
  [spectrum.ID]: spectrum,
  [catalogue.ID]: catalogue,
  [image.ID]: image,
});

/**
 * Observe a model state through a setup.
 * @param {string} id - A key of FORWARD_MODELS
 * @param {object} state - The model state the model reads
 * @param {object} setup - gravitas.observing-setup/1
 * @param {object} [opts] - title; bands (catalogue)
 * @returns {object} A gravitas.observation, origin synthetic
 */
export function runForward(id, state, setup, opts = {}) {
  const model = FORWARD_MODELS[id];
  if (!model)
    throw new Error(
      `no forward model "${id}"; there are ${Object.keys(FORWARD_MODELS).join(', ')}`
    );
  return model.run(state, setup, opts);
}

export {
  compareWithTruth,
  gradeAgainstTruth,
  isSynthetic,
} from './observation.js';
export * from './setup.js';
export { elementsFromBodies } from './system.js';
