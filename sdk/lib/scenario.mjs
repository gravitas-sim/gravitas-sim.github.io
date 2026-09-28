// The scenario-pack format, as the SDK sees it: the platform's own validator
// (js/platform/scenario.js, which the Scenario Studio uses too), with this
// build of Gravitas as its `api`, and the compiler that turns a pack into the
// share link the application opens. Re-exported rather than copied, so the
// SDK, the Studio and the tests can never disagree about what a pack is.
export {
  FORMAT,
  FORMAT_VERSION,
  SETTING_RULES,
  STARTING_PANELS,
  STARTING_TOOLS,
  validateScenarioPack,
  migrateScenarioPack,
} from '../../js/platform/scenario.js';
export {
  checkPack,
  compileScenarioPack,
  scenarioApi,
  packFromOrbitalSystem,
} from '../../js/scenarioPack.js';
export {
  buildPackWorld,
  stepPackWorld,
  worldSnapshot,
} from '../../js/scenarioPackWorld.js';
