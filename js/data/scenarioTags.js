// =============================================================================
// Scenario concept tags
// -----------------------------------------------------------------------------
// The controlled vocabulary the scenario gallery browses by, and the only place
// a concept's display name is written down. The gallery chips, the card pills,
// the search index and the filter descriptions all read from here.
//
// This is a curriculum index, not an astronomical ontology. It is deliberately
// short: an instructor planning a week should be able to read the whole list at
// a glance and find the one topic they are teaching. Twelve concepts was already
// near the limit of that, and the rule was to resist a thirteenth unless a
// genuine block of course material had nowhere to sit.
//
// Dark Matter is that thirteenth, added when the rotation-curve instrument and
// The Missing Mass arrived. It is a standard unit in an introductory course and
// none of the other twelve covers it: Galaxies & Clusters is about many-body
// dynamics at large scales, which is a different lecture. Thirteen is now the
// limit, and the same rule applies to a fourteenth.
//
// A tag means "this scenario is useful for discussing this concept". It does
// not claim the concept is simulated in full fidelity: Gravitas is Newtonian
// with a phenomenological inspiral model, and a scenario can still be the right
// thing to put on screen while teaching gravitational waves. The limitations
// are documented at /model/ rather than papered over here.
// =============================================================================

export const SCENARIO_TAGS = {
  'orbits-kepler': {
    label: 'Orbits & Kepler',
    description:
      "Orbital motion, Kepler's three laws, orbital energy, and the shapes trajectories take.",
  },
  'solar-system': {
    label: 'Solar System',
    description:
      'Our own planets, moons, asteroids and comets, at their real relative distances.',
  },
  exoplanets: {
    label: 'Exoplanets',
    description:
      'Planets around other stars: architectures, compact systems, and how they compare with ours.',
  },
  detection: {
    label: 'Detection Methods',
    description:
      'How planets are actually found: transit photometry, light curves, and what can confound them.',
  },
  habitability: {
    label: 'Habitability',
    description:
      'The circumstellar habitable zone, incident starlight, and what being inside a zone does and does not establish.',
  },
  'binary-systems': {
    label: 'Binary Systems',
    description:
      'Two or more bodies orbiting a common center of mass, and the dynamics that follow.',
  },
  tides: {
    label: 'Tides & Disruption',
    description:
      'Differential gravity: bodies stretched, stripped or torn apart by a close pass.',
  },
  chaos: {
    label: 'Chaos & Encounters',
    description:
      'Close passes, slingshots, ejections, and systems whose outcome depends sensitively on where they started.',
  },
  'stellar-evolution': {
    label: 'Stellar Evolution',
    description:
      'What stars leave behind: white dwarfs, neutron stars, remnants and the environments that make them.',
  },
  'compact-objects': {
    label: 'Compact Objects',
    description:
      'Black holes, neutron stars and white dwarfs, and how gravity behaves close to them.',
  },
  relativity: {
    label: 'Relativity & Gravitational Waves',
    description:
      'Inspiralling compact binaries and merger events, in the curriculum sense: the underlying solver stays Newtonian.',
  },
  'galaxies-clusters': {
    label: 'Galaxies & Clusters',
    description:
      'Many-body systems at the largest scales Gravitas models: cluster dynamics, galactic centers, and encounters between them.',
  },
  'dark-matter': {
    label: 'Dark Matter',
    description:
      'The two measurements that found it: rotation curves that stay flat when they should fall, and clusters whose members move far too fast for the mass that shines.',
  },
};

/** Tag ids in the order the concept chips should appear. */
export const TAG_ORDER = Object.keys(SCENARIO_TAGS);

/**
 * The display name for a tag id.
 * @param {string} id - A key of SCENARIO_TAGS
 * @returns {string} Its label, or the raw id if it is not in the vocabulary
 */
export const tagLabel = id => SCENARIO_TAGS[id]?.label ?? id;

export default SCENARIO_TAGS;
