// =============================================================================
// Mean-motion resonance locations (Prompt 198, SMALL_BODIES.md)
// -----------------------------------------------------------------------------
// A body at period ratio r = T_body / T_planet orbits at a = a_planet r^(2/3)
// (Kepler's third law, the body's mass neglected). A resonance is named
// inner:outer, the whole numbers of orbits the INNER and the OUTER body complete
// in the same time: Jupiter 3:1 is three asteroid orbits to one of Jupiter
// (r = 1/3, a = 2.50 AU); the plutinos are 3:2 with Neptune, Neptune being the
// inner body (r = 3/2, a = 39.4 AU). A location is where the resonance is
// exact for a circular, unperturbed orbit; the resonance has a width, and
// whether a body inside it librates is the resonant angle's question
// (js/resonance/elements.js), not this file's.
// =============================================================================

const { Math } = globalThis;

/** The planets whose resonances the belts are read against. */
export const PLANETS = Object.freeze({
  jupiter: Object.freeze({
    id: 'jupiter',
    aAu: 5.202887,
    citation:
      "Standish, 'Keplerian Elements for Approximate Positions of the Major Planets', JPL Solar System Dynamics, Table 1 (1800-2050 AD): a = 5.20288700 AU",
    checked: false,
  }),
  neptune: Object.freeze({
    id: 'neptune',
    aAu: 30.06952752,
    citation:
      "Standish, 'Keplerian Elements for Approximate Positions of the Major Planets', JPL Solar System Dynamics, Table 1 (1800-2050 AD): a = 30.06952752 AU",
    checked: false,
  }),
});

/**
 * Semi-major axis of the resonance where `inner` orbits of the inner body take
 * as long as `outer` orbits of the outer one.
 * @param {number} aPlanet - the planet's semi-major axis, in the unit wanted back
 * @param {{inner: number, outer: number, body?: 'inner'|'outer'}} res - whole
 *   numbers; `body` says which one the small body is (default the inner one:
 *   the asteroids inside Jupiter's orbit; the Kuiper belt's bodies are 'outer')
 * @returns {number} the semi-major axis, NaN for an argument that is not valid
 */
export function resonanceAxis(aPlanet, { inner, outer, body = 'inner' }) {
  if (!(aPlanet > 0) || !(inner >= 1) || !(outer >= 1)) return NaN;
  if (body !== 'inner' && body !== 'outer') return NaN;
  const ratio = body === 'inner' ? outer / inner : inner / outer;
  return aPlanet * Math.pow(ratio, 2 / 3);
}

/** T_body / T_planet for a body at semi-major axis `a` about the same star. */
export const periodRatioAtAxis = (aPlanet, a) => Math.pow(a / aPlanet, 1.5);

/** The jovian resonances the belt lessons name, with where each sits. */
const JUPITER = [
  { id: '4:1', inner: 4, outer: 1, kind: 'gap', name: 'the 4:1 gap' },
  { id: '3:1', inner: 3, outer: 1, kind: 'gap', name: 'the 3:1 Kirkwood gap' },
  { id: '5:2', inner: 5, outer: 2, kind: 'gap', name: 'the 5:2 Kirkwood gap' },
  { id: '7:3', inner: 7, outer: 3, kind: 'gap', name: 'the 7:3 Kirkwood gap' },
  { id: '2:1', inner: 2, outer: 1, kind: 'gap', name: 'the 2:1 gap' },
  { id: '3:2', inner: 3, outer: 2, kind: 'population', name: 'the Hildas' },
  { id: '1:1', inner: 1, outer: 1, kind: 'population', name: 'the Trojans' },
];

/** The neptunian resonances of the Kuiper belt. The bodies are the outer ones. */
const NEPTUNE = [
  { id: '3:2', inner: 3, outer: 2, kind: 'population', name: 'the plutinos' },
  {
    id: '5:3',
    inner: 5,
    outer: 3,
    kind: 'population',
    name: 'the 5:3 resonance',
  },
  {
    id: '7:4',
    inner: 7,
    outer: 4,
    kind: 'population',
    name: 'the 7:4 resonance',
  },
  { id: '2:1', inner: 2, outer: 1, kind: 'population', name: 'the twotinos' },
];

const place = (planet, body, list) =>
  Object.freeze(
    list.map(r =>
      Object.freeze({
        ...r,
        planet: planet.id,
        body,
        aAu: resonanceAxis(planet.aAu, {
          inner: r.inner,
          outer: r.outer,
          body,
        }),
        periodRatio: body === 'inner' ? r.outer / r.inner : r.inner / r.outer,
      })
    )
  );

/** The seven jovian entries (five gaps, the Hildas, the Trojans), located. */
export const JUPITER_RESONANCES = place(PLANETS.jupiter, 'inner', JUPITER);
/** The four neptunian entries, located. */
export const NEPTUNE_RESONANCES = place(PLANETS.neptune, 'outer', NEPTUNE);

/** A table entry by planet and id, or null. */
export const resonanceEntry = (planet, id) =>
  (planet === 'neptune' ? NEPTUNE_RESONANCES : JUPITER_RESONANCES).find(
    r => r.id === id
  ) ?? null;
