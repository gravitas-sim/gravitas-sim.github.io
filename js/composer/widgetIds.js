// =============================================================================
// The instruments a step may dock, family by family
// -----------------------------------------------------------------------------
// The ids js/widgets.js LAZY_FAMILIES lists, as data. A copy, because
// importing the registry starts fetching both deferred catalogs of words and
// a dozen modules the instruments share (about 430 KB before the composer has
// drawn anything), and the composer needs only the names until a step docks
// one - then js/composer/api.js imports the registry for the families in use.
// tests/composer.test.js holds this to the registry, id for id.
// =============================================================================

export const WIDGET_FAMILIES = Object.freeze({
  energy: ['launch', 'live-energy', 'escape-compare', 'shapes'],
  binary: ['binary', 'binary-compare', 'balance', 'visual-binary'],
  blackHole: [
    'bh-horizon',
    'bh-scaling',
    'bh-escape',
    'bh-density',
    'bh-blocks',
    'bh-thermo',
    'bh-lifetime',
    'bh-lineup',
  ],
  habitability: [
    'hz-insolation',
    'hz-spreading',
    'hz-star',
    'hz-boundaries',
    'hz-orbit',
    'hz-trappist',
    'hz-candidates',
  ],
  exoplanet: [
    'reflex-motion',
    'rv-observer',
    'rv-mass',
    'rv-inclination',
    'astrometry-signature',
    'method-comparison',
    'planet-characterization',
    'survey-schedule',
    'transit-noise',
  ],
  tidal: [
    'tide-vectors',
    'tide-strength',
    'tide-compare',
    'tide-balance',
    'roche-model',
    'tide-disrupt',
  ],
  darkMatter: [
    'dm-shapes',
    'dm-enclosed',
    'dm-fit',
    'dm-flyby',
    'dm-virial',
    'dm-budget',
    'dm-mond',
  ],
  chaos: ['chaos-divergence'],
  resonance: [
    'resonance-periods',
    'resonance-angle',
    'resonance-conjunctions',
    'resonance-frame',
  ],
  stellar: ['stellar-lab', 'stellar-compare', 'stellar-population'],
  stellarEvolution: ['stellar-evolution'],
  observing: ['observing-planner'],
  spectra: ['spectra-compare', 'spectra-identify'],
  transit: ['depth-size', 'geometry', 'spectrum', 'dilution', 'resolve'],
  powerLaw: [
    'power-law-precession',
    'power-law-refinement',
    'power-law-kepler',
    'power-law-conservation',
  ],
  gw: ['gw-lab', 'gw-real'],
  light: ['blackbody', 'spectrum-viewer', 'kirchhoff'],
  galactic: ['solar-motion', 'rotating-disk', 'cluster-members'],
  interiors: ['polytrope', 'wd-mass-radius', 'ms-scaling'],
  variables: ['variable-fold', 'leavitt-law', 'variable-class'],
  lensing: ['light-bending', 'lens-plane', 'lens-passing'],
  survey: ['survey-counts', 'malmquist', 'completeness-lf'],
  cosmology: ['hubble-law', 'hubble-diagram', 'redshift-wedge'],
  detector: ['ccd-frames', 'ccd-snr', 'diff-photometry'],
  exposure: ['exposure-planner'],
  strategy: ['strategy-window', 'strategy-plan'],
  eclipse: ['eclipse-curve', 'eclipse-fit'],
  clusterFit: ['cluster-fit'],
  masses: ['masses-minimum', 'masses-solve', 'masses-diagram'],
  activity: [
    'activity-spots',
    'activity-period',
    'activity-flares',
    'activity-ffd',
  ],
  spectrograph: [
    'spectrograph-lines',
    'spectrograph-arc',
    'spectrograph-trade',
  ],
  telescope: ['telescope'],
  effects: ['detector-effects'],
  photcal: ['photometric-calibration'],
  surveyDesign: [
    'survey-design-tradeoff',
    'survey-design-plan',
    'survey-design-compare',
  ],
  sky: [
    'sky-turning',
    'sky-seasons',
    'sky-phases',
    'sky-eclipses',
    'sky-wanderers',
    'sky-plan',
  ],
  compare: ['compare-transit'],
  gwEvents: ['gw-events'],
  claim: ['frame-marks', 'coverage-repeats', 'profile-refusal'],
  imaging: [
    'moon-marks',
    'star-parallax',
    'binary-orbit',
    'field-sources',
    'field-completeness',
  ],
  jovian: ['moon-frames', 'moon-fit', 'jupiter-weigh'],
  atmosphere: [
    'atmosphere-balance',
    'atmosphere-greenhouse',
    'atmosphere-scale',
    'atmosphere-eclipse',
    'atmosphere-phase',
  ],
  crater: ['crater-regions', 'crater-sfd', 'crater-budget'],
  sun: ['sun-frames', 'sun-rotation', 'sun-power'],
  smallBodies: ['belt-gaps', 'spin-curve'],
  tides: ['tides-roche', 'tides-resonance', 'tides-moon', 'tides-heating'],
  habitabilityLimits: ['hz-limits', 'hz-locking', 'hz-ages'],
});

/** Every instrument id, in the registry’s order. */
export const WIDGET_IDS = Object.freeze(Object.values(WIDGET_FAMILIES).flat());
