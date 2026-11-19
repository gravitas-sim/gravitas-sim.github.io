// =============================================================================
// What a two-body claim needs to know of the force law in force
// -----------------------------------------------------------------------------
// Resolved the way the step resolves it: the softening floor, the MOND a0 and
// the halo come from their one authority each (js/engine/state.js,
// js/engine/forces.js), so twoBodyModel (js/twoBodyModel.js) carries no
// fallback of its own. Read only by the orbit geometry overlay, which loads
// lazily, so it is not part of the engine's start-up modules.
// =============================================================================

import { physicsSettings, minInteractionDistance } from './engine/state.js';
import { activeHalo, activeMondA0 } from './engine/forces.js';
import { haloAcceleration } from './darkMatter.js';

/**
 * The settings twoBodyModel and orbitGeometry take, from the live engine.
 * @returns {object} Settings for twoBodyModel
 */
export const twoBodySettings = () => {
  const halo = activeHalo();
  return {
    gravitational_constant: physicsSettings.gravitational_constant,
    mutual_gravity: physicsSettings.mutual_gravity,
    star_only_gravity: physicsSettings.star_only_gravity,
    bh_behavior: physicsSettings.bh_behavior,
    softening: minInteractionDistance(),
    mondA0: activeMondA0(),
    haloAt: halo ? pos => haloAcceleration(pos, halo) : null,
  };
};
