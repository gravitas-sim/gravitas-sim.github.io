// =============================================================================
// The keys built-in scenarios had before they had ids
// -----------------------------------------------------------------------------
// Until Roadmap II Prompt 63 a built-in scenario was keyed by its English name,
// and every share link, lesson, course pack, experiment and saved setting made
// until then names it that way. This is that list, frozen as the catalog had
// it at a997937, each with the id it is read as now. Nothing in the application
// imports it: the application reads these through a rule (scenarioId() in
// js/scenarios.js and js/data/scenarioInfo.js), and tests/scenarioIds.test.js
// holds the rule to every pair here. Never edit an entry; a scenario added
// after ids has no entry, because no link ever named it any other way.
// =============================================================================

export const LEGACY_SCENARIO_KEYS = Object.freeze([
  ['Solar System', 'solar-system'],
  ['Retrograde Mars', 'retrograde-mars'],
  ['Earth-Moon System', 'earth-moon-system'],
  ['TRAPPIST-1 System', 'trappist-1-system'],
  ['Three-Body Sensitivity Lab', 'three-body-sensitivity-lab'],
  ['Galilean Resonance', 'galilean-resonance'],
  ['Broken Laplace Resonance', 'broken-laplace-resonance'],
  ['Pluto and Neptune', 'pluto-and-neptune'],
  ['Jupiter Trojans', 'jupiter-trojans'],
  ['Binary Pair', 'binary-pair'],
  ['Interstellar Visitor', 'interstellar-visitor'],
  ['Transit Lab', 'transit-lab'],
  ['Spiral Galaxy', 'spiral-galaxy'],
  ['Milky Way Rotation', 'milky-way-rotation'],
  ['Coma Cluster', 'coma-cluster'],
  ['Exoplanet Characterization Lab', 'exoplanet-characterization-lab'],
  ['Blended Binary', 'blended-binary'],
  ['Gravity Assist Lab', 'gravity-assist-lab'],
  ['Gravity Assist: Heliocentric', 'gravity-assist-heliocentric'],
  ['Lagrange Point Lab', 'lagrange-point-lab'],
  ['Orbital Transfer Lab', 'orbital-transfer-lab'],
  ['Binary Planet Lab', 'binary-planet-lab'],
  ['Circumbinary Planet Lab', 'circumbinary-planet-lab'],
  ['Black Hole Lab', 'black-hole-lab'],
  ['Habitable Zone Lab', 'habitable-zone-lab'],
  ["Kepler's 2nd Law", 'keplers-2nd-law'],
  ['GW150914', 'gw150914'],
  ['Binary BH', 'binary-bh'],
  ['Triple BH System', 'triple-bh-system'],
  ['Supermassive BH', 'supermassive-bh'],
  ['Star Cluster', 'star-cluster'],
  ['Kuiper Belt', 'kuiper-belt'],
  ['Sagittarius A*', 'sagittarius-a'],
  ['Binary Star System', 'binary-star-system'],
  ['Slingshot', 'slingshot'],
  ['Rogue Encounter', 'rogue-encounter'],
  ['Neutron Star Collision', 'neutron-star-collision'],
  ['Pulsar System', 'pulsar-system'],
  ['White Dwarf Binary', 'white-dwarf-binary'],
  ['Stellar Graveyard', 'stellar-graveyard'],
  ['Galactic Center', 'galactic-center'],
  ['Supernova Remnant', 'supernova-remnant'],
  ['Compact Object Zoo', 'compact-object-zoo'],
  ['Millisecond Pulsar', 'millisecond-pulsar'],
  ['Tidal Disruption Event', 'tidal-disruption-event'],
  ['Intermediate Mass BH', 'intermediate-mass-bh'],
  ['Galactic Collision', 'galactic-collision'],
  ['Micro BH Swarm', 'micro-bh-swarm'],
  ['Exoplanet Lab', 'exoplanet-lab'],
  ['Quasar Cannon', 'quasar-cannon'],
  ['The Pinwheel Galaxy Core', 'the-pinwheel-galaxy-core'],
  ['Star Frisbee', 'star-frisbee'],
  ['Kessler Cascade', 'kessler-cascade'],
  ['Alien Dyson Swarm Collapse', 'alien-dyson-swarm-collapse'],
  ['Tidal Arm Tango', 'tidal-arm-tango'],
  ['Hungry Hungry Holes', 'hungry-hungry-holes'],
  ['Slingshot Gauntlet', 'slingshot-gauntlet'],
  ['Black Hole Billiards', 'black-hole-billiards'],
  ['Stellar Nursery', 'stellar-nursery'],
]);

/** The old names alone, in the catalog's order. */
export const LEGACY_NAMES = Object.freeze(
  LEGACY_SCENARIO_KEYS.map(([name]) => name)
);
