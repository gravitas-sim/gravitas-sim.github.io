// =============================================================================
// What the Settings panel shows, and in which section
// -----------------------------------------------------------------------------
// The panel used to be built from a flat list in js/ui.js in which a heading
// was an item of its own, and sections were whatever happened to sit between
// two headings. That is how "Visuals" came to be two sections, one of four
// rows and one of seventeen, eight sections apart; and how the scenario picker
// at the head of the list was silently dropped, because nothing came before
// the first heading to hold it.
//
// Here a section is named by every row that belongs to it, and the panel's
// order is SETTING_SECTIONS's. Data only, so a test can read it without the
// DOM (tests/settingsInventory.test.js): every row's key is a setting in
// DEFAULT_SETTINGS (js/appState.js), never renamed - share links, scenario
// presets and saved lessons all name settings by these keys - and every row
// has a label and a help text in both languages and something that reads it.
//
// A row's help text is `setHelp.<key>` in the deferred catalogs
// (js/i18n/en.deferred.js, es.deferred.js), fetched on the first press of an
// info button rather than downloaded by every visitor at start-up.
// =============================================================================

import { INTEGRATORS } from './physics.js';
import { setReadoutDigits, setUnitMode } from './units.js';

/**
 * The sections, in the panel's order. An `advanced` section sits inside the
 * panel's Advanced disclosure, closed until opened: the numerical method and
 * the performance trade-offs are what a course changes on purpose, and what a
 * newcomer changes by accident.
 */
export const SETTING_SECTIONS = Object.freeze([
  { id: 'simulation' },
  { id: 'black-holes' },
  { id: 'compact-objects' },
  { id: 'objects' },
  { id: 'visuals' },
  { id: 'ui-control' },
  { id: 'educational' },
  { id: 'accuracy', advanced: true },
  { id: 'performance', advanced: true },
]);

/** The heading of a section, from its id. */
export const sectionLabelId = id => `settings.section.${id}`;

/** The help text of a setting, from its key. */
export const helpId = key => `setHelp.${key}`;

/** Every row, in the order it is shown within its section. */
export const SETTING_ITEMS = Object.freeze([
  // Simulation
  {
    section: 'simulation',
    labelId: 'settings.label.gravitationalConstant',
    key: 'gravitational_constant',
    type: 'float',
    min: 0.1,
    max: 20.0,
    step: 0.1,
  },
  {
    section: 'simulation',
    labelId: 'settings.label.mutualGravity',
    key: 'mutual_gravity',
    type: 'bool',
  },
  {
    section: 'simulation',
    labelId: 'settings.label.simSpeed',
    key: 'sim_speed',
    type: 'float',
    min: 0.0,
    max: 5.0,
    step: 0.1,
  },
  {
    section: 'simulation',
    labelId: 'settings.label.simSize',
    key: 'sim_size',
    type: 'option',
    options: ['Small', 'Medium', 'Large', 'Huge'],
  },
  {
    section: 'simulation',
    labelId: 'settings.label.placement',
    key: 'placement',
    type: 'option',
    options: ['Circular', 'Multi-Ring', 'Random', 'Grid', 'Empty'],
  },

  // Black holes
  {
    section: 'black-holes',
    labelId: 'settings.label.numBlackHoles',
    key: 'num_black_holes',
    type: 'int',
    min: 0,
    max: 10,
    step: 1,
  },
  {
    section: 'black-holes',
    labelId: 'settings.label.bhMass',
    key: 'bh_mass',
    type: 'float',
    min: 0.1,
    max: 1000,
    step: 0.5,
  },
  {
    section: 'black-holes',
    labelId: 'settings.label.useIndividualBhMasses',
    key: 'use_individual_bh_masses',
    type: 'bool',
  },
  {
    section: 'black-holes',
    labelId: 'settings.label.bhBehavior',
    key: 'bh_behavior',
    type: 'option',
    options: ['Static', 'Orbiting'],
  },
  {
    section: 'black-holes',
    labelId: 'settings.label.orbitDecayRate',
    key: 'orbit_decay_rate',
    type: 'float',
    min: 0.0,
    max: 0.1,
    step: 0.001,
    precision: 3,
  },

  // Compact objects
  {
    section: 'compact-objects',
    labelId: 'settings.label.numNeutronStars',
    key: 'num_neutron_stars',
    type: 'int',
    min: 0,
    max: 20,
    step: 1,
  },
  {
    section: 'compact-objects',
    labelId: 'settings.label.numWhiteDwarfs',
    key: 'num_white_dwarfs',
    type: 'int',
    min: 0,
    max: 30,
    step: 1,
  },
  {
    section: 'compact-objects',
    labelId: 'settings.label.numStars',
    key: 'num_stars',
    type: 'int',
    min: 0,
    max: 20,
    step: 1,
  },

  // Objects
  {
    section: 'objects',
    labelId: 'settings.label.numPlanets',
    key: 'num_planets',
    type: 'int',
    min: 0,
    max: 200,
    step: 1,
  },
  {
    section: 'objects',
    labelId: 'settings.label.numGasGiants',
    key: 'num_gas_giants',
    type: 'int',
    min: 0,
    max: 50,
    step: 1,
  },
  {
    section: 'objects',
    labelId: 'settings.label.enableAsteroids',
    key: 'enable_asteroids',
    type: 'bool',
  },
  {
    section: 'objects',
    labelId: 'settings.label.numAsteroids',
    key: 'num_asteroids',
    type: 'int',
    min: 0,
    max: 500,
    step: 5,
  },
  {
    section: 'objects',
    labelId: 'settings.label.numComets',
    key: 'num_comets',
    type: 'int',
    min: 0,
    max: 100,
    step: 1,
  },
  {
    section: 'objects',
    labelId: 'settings.label.initVelocity',
    key: 'init_velocity',
    type: 'float',
    min: 0,
    max: 100,
    step: 1,
  },
  {
    section: 'objects',
    labelId: 'settings.label.velocityStddev',
    key: 'velocity_stddev',
    type: 'float',
    min: 0,
    max: 50,
    step: 1,
  },

  // Visuals: one section. Trails, then the overlays drawn on the bodies, then
  // the black holes' effects, then the sky and the colors.
  {
    section: 'visuals',
    labelId: 'settings.label.showTrails',
    key: 'show_trails',
    type: 'bool',
  },
  {
    section: 'visuals',
    labelId: 'settings.label.trailStyle',
    key: 'trail_style',
    type: 'option',
    options: ['Cloud', 'Simple', 'Glow'],
  },
  {
    section: 'visuals',
    labelId: 'settings.label.trailLength',
    key: 'trail_length',
    type: 'int',
    min: 5,
    max: 300,
    step: 5,
  },
  {
    section: 'visuals',
    labelId: 'settings.label.trailColorMode',
    key: 'trail_color_mode',
    type: 'option',
    options: ['type', 'speed'],
  },
  {
    section: 'visuals',
    labelId: 'settings.label.showVelocityVectors',
    key: 'show_velocity_vectors',
    type: 'bool',
  },
  {
    section: 'visuals',
    labelId: 'settings.label.showAccelerationVectors',
    key: 'show_acceleration_vectors',
    type: 'bool',
  },
  {
    section: 'visuals',
    labelId: 'settings.label.showPotentialWell',
    key: 'show_potential_well',
    type: 'bool',
  },
  {
    section: 'visuals',
    labelId: 'settings.label.showScaleBar',
    key: 'show_scale_bar',
    type: 'bool',
  },
  {
    section: 'visuals',
    labelId: 'settings.label.showElapsedTime',
    key: 'show_elapsed_time',
    type: 'bool',
  },
  {
    section: 'visuals',
    labelId: 'settings.label.showAccretionDisk',
    key: 'show_accretion_disk',
    type: 'bool',
  },
  {
    section: 'visuals',
    labelId: 'settings.label.realisticDiskPhysics',
    key: 'realistic_disk_physics',
    type: 'bool',
  },
  {
    section: 'visuals',
    labelId: 'settings.label.diskDoppler',
    key: 'disk_doppler',
    type: 'bool',
  },
  {
    section: 'visuals',
    labelId: 'settings.label.showBhJets',
    key: 'show_bh_jets',
    type: 'bool',
  },
  {
    section: 'visuals',
    labelId: 'settings.label.showObjectLensing',
    key: 'show_object_lensing',
    type: 'bool',
  },
  {
    section: 'visuals',
    labelId: 'settings.label.lensingQuality',
    key: 'lensing_quality',
    type: 'option',
    options: ['off', 'low', 'medium', 'high'],
  },
  {
    section: 'visuals',
    labelId: 'settings.label.starDensity',
    key: 'star_density',
    type: 'int',
    min: 0,
    max: 30000,
    step: 100,
  },
  {
    section: 'visuals',
    labelId: 'settings.label.showAmbientLighting',
    key: 'show_ambient_lighting',
    type: 'bool',
  },
  {
    section: 'visuals',
    labelId: 'settings.label.dynamicObjectProperties',
    key: 'dynamic_object_properties',
    type: 'bool',
  },
  {
    section: 'visuals',
    labelId: 'settings.label.planetBaseColor',
    key: 'planet_base_color',
    type: 'color',
  },

  // UI & control. "Record Simulation" was here: a switch that nothing in the
  // application ever read. Its key stays in DEFAULT_SETTINGS, so a share link
  // or a preset that names it still opens - and so do the three other keys
  // this panel no longer shows, each a control that did not do what it said:
  //
  //   input_object_type  the Add object picker sets it every time placement
  //                      is armed, so a choice made here never lasted
  //   show_bh_glow       drew no glow; all it moved was a mass label
  //   star_base_color    a star is drawn in the color of its temperature, and
  //                      a setting that overrode that would be teaching the
  //                      wrong thing; it was never read under the name the
  //                      engine looks for anyway
  {
    section: 'ui-control',
    labelId: 'settings.label.interactiveAdd',
    key: 'interactive_add',
    type: 'bool',
  },
  {
    section: 'ui-control',
    labelId: 'settings.label.followMode',
    key: 'follow_mode',
    type: 'option',
    options: [
      'None',
      'BlackHole',
      'Planet',
      'GasGiant',
      'Star',
      'Asteroid',
      'Comet',
      'NeutronStar',
      'WhiteDwarf',
    ],
  },
  {
    section: 'ui-control',
    labelId: 'settings.label.showDynamicOverlays',
    key: 'show_dynamic_overlays',
    type: 'bool',
  },
  {
    section: 'ui-control',
    labelId: 'settings.label.showGravitationalWaves',
    key: 'show_gravitational_waves',
    type: 'bool',
  },

  // Educational
  {
    section: 'educational',
    labelId: 'settings.label.habitableZoneOptimism',
    key: 'habitable_zone_optimism',
    type: 'float',
    min: 0.5,
    max: 2.0,
    step: 0.1,
  },

  // Advanced: the numerical method, and what the conservation check says
  // about it.
  {
    section: 'accuracy',
    labelId: 'settings.label.integrator',
    key: 'integrator',
    type: 'option',
    options: INTEGRATORS,
  },
  {
    section: 'accuracy',
    labelId: 'settings.label.showConservationDiagnostics',
    key: 'show_conservation_diagnostics',
    type: 'bool',
  },

  // Advanced: what is traded for speed.
  {
    section: 'performance',
    labelId: 'settings.label.useBarnesHut',
    key: 'use_barnes_hut',
    type: 'bool',
  },
  {
    section: 'performance',
    labelId: 'settings.label.barnesHutTheta',
    key: 'barnes_hut_theta',
    type: 'float',
    min: 0.2,
    max: 1.2,
    step: 0.05,
  },
  {
    section: 'performance',
    labelId: 'settings.label.adaptiveDetail',
    key: 'adaptive_detail',
    type: 'bool',
  },
  {
    section: 'performance',
    labelId: 'settings.label.qualityTier',
    key: 'quality_tier',
    type: 'option',
    options: ['auto', 'full', 'low'],
  },
]);

/** A section's rows, in order. */
export const itemsOf = id => SETTING_ITEMS.filter(item => item.section === id);

// --- Course level ---------------------------------------------------------------
//
// Introductory, majors or advanced: a documented bundle of defaults, never a
// lock. Choosing one stages the conservation readout and the Advanced section
// in the panel and, once applied, sets the units and how many significant
// figures a readout shows; every control stays where it is and can be changed
// after. Introductory is exactly what the application did before there were
// levels. Prompt 72 maps a level onto a lesson's depth.
//
// Here rather than in js/units.js, which the Studio and the experiment runner
// load too and whose routes had no room for it: this module is the
// application's alone, and every route that has it already pays for it.

/** The levels, in the order a reader is offered them. */
export const COURSE_LEVELS = Object.freeze({
  introductory: Object.freeze({
    depth: 'core',
    conservation: false,
    advancedOpen: false,
    units: 'physical',
    digits: 3,
  }),
  majors: Object.freeze({
    depth: 'quantitative',
    conservation: true,
    advancedOpen: false,
    units: 'physical',
    digits: 4,
  }),
  advanced: Object.freeze({
    depth: 'advanced',
    conservation: true,
    advancedOpen: true,
    units: 'simulation',
    digits: 6,
  }),
});

const LEVEL_KEY = 'gravitas_course_level';
let courseLevel = 'introductory';

/** @returns {string} The reader's course level */
export const getCourseLevel = () => courseLevel;

/**
 * What a level sets.
 * @param {string} id - A course level
 * @returns {{depth: string, conservation: boolean, advancedOpen: boolean, units: string, digits: number}}
 */
export const courseLevelDefaults = id =>
  COURSE_LEVELS[id] || COURSE_LEVELS.introductory;

/**
 * Choose a level: store it, and set the units and the readout precision it
 * names. The settings it stages are the Settings panel's to apply.
 * @param {string} id - A course level; anything else is ignored
 */
export function setCourseLevel(id) {
  if (!Object.hasOwn(COURSE_LEVELS, id)) return;
  courseLevel = id;
  try {
    window.localStorage?.setItem(LEVEL_KEY, id);
  } catch {
    /* storage unavailable */
  }
  setReadoutDigits(COURSE_LEVELS[id].digits);
  setUnitMode(COURSE_LEVELS[id].units);
}

/**
 * Restore the stored level's readout precision. Not its units: those are a
 * preference of their own once chosen (js/units.js), so a reader who switched
 * them after choosing a level keeps the switch.
 */
export function initCourseLevel() {
  try {
    const level = window.localStorage?.getItem(LEVEL_KEY);
    if (Object.hasOwn(COURSE_LEVELS, level)) {
      courseLevel = level;
      setReadoutDigits(COURSE_LEVELS[level].digits);
    }
  } catch {
    /* storage unavailable */
  }
}
