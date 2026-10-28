// The planetary bulk pack (Prompt 203, Part A): mass (as GM), radii and their
// stated errors for the eight planets and the Moon, the Bond albedo and
// distance of the three bodies the Prompt 200 pack does not hold, and the
// uncompressed densities of the terrestrial bodies. A lazy module
// (NEVER_PRECACHED).
//
// PROVENANCE, stated plainly: every number is typed from the cited publications
// and was NOT checked against them: nothing was downloaded, no retrieval date
// exists and `checked` stays false. The errors are the ones those publications
// state, as typed; where a source states none a value carries none and the
// kernel says so. The uncompressed-density spread is a declared convention,
// not a source's error (INTERIORS.md).
export const BULK_PROVENANCE = Object.freeze({
  retrieved: null,
  checked: false,
  radii:
    'IAU Working Group on Cartographic Coordinates and Rotational Elements (Archinal et al. 2018, Celest. Mech. Dyn. Astron. 130, 22), typed',
  gm: 'JPL Solar System Dynamics values from the planetary ephemerides and spacecraft solutions, typed',
  anchors:
    'NASA Planetary Fact Sheets (NSSDCA, public domain as a U.S. Government work), typed',
  note: 'typed, not retrieved; each value is [value, standard error]',
});

/** The 2018 CODATA constant and its error live in constants.js. */

/**
 * gm: km^3 s^-2. radius: km, `mean` the volumetric mean, `equatorial` and
 * `polar` where the body is measurably oblate. Each as [value, sigma].
 * albedo (Bond) and aMkm (10^6 km) only where the Prompt 200 pack lacks them.
 */
export const PLANETS = Object.freeze({
  mercury: {
    name: 'Mercury',
    gm: [22031.86, 0.01],
    radius: { mean: [2439.4, 0.1], equatorial: [2439.4, 0.1] },
    albedo: 0.088,
    aMkm: 57.91,
  },
  venus: {
    name: 'Venus',
    gm: [324858.592, 0.006],
    radius: { mean: [6051.8, 1.0], equatorial: [6051.8, 1.0] },
  },
  earth: {
    name: 'Earth',
    gm: [398600.4418, 0.0008],
    radius: {
      mean: [6371.008, 0.01],
      equatorial: [6378.137, 0.001],
      polar: [6356.752, 0.001],
    },
  },
  moon: {
    name: 'The Moon',
    gm: [4902.800066, 0.0001],
    radius: {
      mean: [1737.4, 1.0],
      equatorial: [1738.1, 1.0],
      polar: [1736.0, 1.0],
    },
    albedo: 0.11,
    aMkm: 149.6,
  },
  mars: {
    name: 'Mars',
    gm: [42828.375, 0.01],
    radius: {
      mean: [3389.5, 0.2],
      equatorial: [3396.19, 0.1],
      polar: [3376.2, 0.1],
    },
  },
  jupiter: {
    name: 'Jupiter',
    gm: [126686534, 100],
    radius: {
      mean: [69911, 6],
      equatorial: [71492, 4],
      polar: [66854, 10],
    },
  },
  saturn: {
    name: 'Saturn',
    gm: [37931207.8, 1],
    radius: {
      mean: [58232, 6],
      equatorial: [60268, 4],
      polar: [54364, 10],
    },
    albedo: 0.342,
    aMkm: 1432.0,
  },
  uranus: {
    name: 'Uranus',
    gm: [5793951.3, 4.4],
    radius: {
      mean: [25362, 7],
      equatorial: [25559, 4],
      polar: [24973, 20],
    },
  },
  neptune: {
    name: 'Neptune',
    gm: [6835100, 10],
    radius: {
      mean: [24622, 19],
      equatorial: [24764, 15],
      polar: [24341, 30],
    },
  },
});
export const PLANET_IDS = Object.freeze(Object.keys(PLANETS));

/**
 * Uncompressed densities, kg/m^3: the density the body's material would have
 * with no self-compression, as commonly tabulated for the terrestrial bodies
 * (for example Lewis, Physics and Chemistry of the Solar System). The spread
 * is a DECLARED CONVENTION (200 kg/m^3), the typical disagreement between
 * tabulations, not an error any source states. Typed, unchecked.
 */
export const UNCOMPRESSED = Object.freeze({
  mercury: 5300,
  venus: 3900,
  earth: 4000,
  moon: 3300,
  mars: 3700,
});
export const UNCOMPRESSED_SIGMA = 200;
