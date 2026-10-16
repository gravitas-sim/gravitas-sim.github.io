// The scenario-pack format, as the SDK sees it: the platform's own validator
// (js/platform/scenario.js, which the Scenario Studio uses too), with this
// build of Gravitas as its `api`, and the compiler that turns a pack into the
// share link the application opens. Re-exported rather than copied, so the
// SDK, the Studio and the tests can never disagree about what a pack is.
import {
  FORMAT,
  FORMAT_VERSION,
  SETTING_RULES,
  STARTING_PANELS,
  STARTING_TOOLS,
  validateScenarioPack,
  migrateScenarioPack,
} from '../../js/platform/scenario.js';
import { scenarioApi } from '../../js/scenarioPack.js';
import { validateSystem as validateSystem3d } from '../../js/lab3d/state.js';

export {
  FORMAT,
  FORMAT_VERSION,
  SETTING_RULES,
  STARTING_PANELS,
  STARTING_TOOLS,
  validateScenarioPack,
  migrateScenarioPack,
};

/**
 * Every problem with a pack, by this build's checks, including the 3-D lab's
 * own on a `system3d` block (the Studio checks that block's shape up front and
 * the lab's checks when it opens the system, to keep its route small).
 */
export const checkPack = pack =>
  validateScenarioPack(pack, { ...scenarioApi(), validateSystem3d });
export {
  packCautions,
  describeCaution,
  compileScenarioPack,
  scenarioApi,
  packFromOrbitalSystem,
} from '../../js/scenarioPack.js';
export {
  packFromSystem3d,
  checkSystem3d,
  labLink,
} from '../../js/scenarioPack3d.js';
export {
  buildPackWorld,
  stepPackWorld,
  worldSnapshot,
} from '../../js/scenarioPackWorld.js';
