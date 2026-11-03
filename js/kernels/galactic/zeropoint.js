// =============================================================================
// Galactic kernel: the Gaia parallax zero point as a stated correction
// (Roadmap III Prompt 233, GAIA_WORKFLOWS.md)
// -----------------------------------------------------------------------------
// Gaia's parallaxes are offset from the truth by a few tens of micro-arcseconds
// that depend on the star's G magnitude, its colour and its ecliptic latitude.
// Lindegren et al. (2021) fit that offset as
//
//   Z(G, colour, sin b) = sum over j, k of q_jk(G) c_j(colour) b_k(sin b)
//
// with q_jk interpolated linearly between the G nodes of a table
// (zeropointTables.js, one table for five-parameter solutions that use the
// effective wavenumber, one for six-parameter solutions that use the
// pseudocolour), the colour basis c_0..c_4 and b_0 = 1, b_1 = sin b,
// b_2 = sin^2 b - 1/3. The corrected parallax is p - Z.
//
// This is an independent reimplementation from the tabulated coefficients and the
// basis functions the package's source states. It is not that package: no output
// of the package was available to compare with (the check in tools/gaia-validate.mjs
// is against a second reimplementation in numpy, tools/gaia-oracle/zeropoint.py).
// The paper's own statement of the offset's remaining systematic error is not in
// the material supplied, so none is built in: ZERO_POINT_SOURCE.sigma is null and
// a caller that wants a systematic floor states it and its source.
//
// Valid for 6 < G < 21, 1.1 < nu_eff < 1.9 and 1.24 < pseudocolour < 1.72; outside
// those ranges the result is flagged, not hidden. Pure: no DOM, no clock.
// =============================================================================

import { Z5, Z6, TABLE_FILES } from './zeropointTables.js';

const { Math, Number } = globalThis;

/** What the correction is and what is not known about its error. */
export const ZERO_POINT_SOURCE = Object.freeze({
  name: 'Lindegren et al. (2021), A&A 649, A4: the parallax bias as a function of G, colour and ecliptic latitude',
  tables: TABLE_FILES,
  implementation:
    'an independent reimplementation from the tabulated coefficients (not the authors’ package, whose output was not available to compare with)',
  sigma: null,
  sigmaNote:
    'the residual systematic error of the correction is not in the material this release was built from, so no floor is assumed: a caller supplies one with its source, or states that it has none',
});

const colourBasis = c => [
  1,
  Math.max(-0.24, Math.min(0.24, c - 1.48)),
  Math.min(0.24, Math.max(0, 1.48 - c)) ** 3,
  Math.min(0, c - 1.24),
  Math.max(0, c - 1.72),
];
const latitudeBasis = s => [1, s, s * s - 1 / 3];

function evaluate(table, g, colour, sinBeta) {
  const n = table.g.length;
  // The bin with g[ig] <= G < g[ig + 1], clamped to the table.
  let ig = 0;
  while (ig < n - 2 && g >= table.g[ig + 1]) ig++;
  const h = Math.max(
    0,
    Math.min(1, (g - table.g[ig]) / (table.g[ig + 1] - table.g[ig]))
  );
  const c = colourBasis(colour);
  const b = latitudeBasis(sinBeta);
  let sum = 0;
  for (let i = 0; i < table.j.length; i++)
    sum +=
      ((1 - h) * table.q[ig][i] + h * table.q[ig + 1][i]) *
      c[table.j[i]] *
      b[table.k[i]];
  return sum * 0.001;
}

/**
 * The zero-point offset Z in mas for one star, and whether the star lies in the
 * range the fit covers.
 * @param {{g: number, nuEff?: number|null, pseudocolour?: number|null,
 *   eclLat: number, params: number}} star - G magnitude; the effective
 *   wavenumber (five-parameter) or pseudocolour (six-parameter) in 1/um; the
 *   ecliptic latitude in degrees; astrometric_params_solved (31 or 95)
 * @returns {{value: number, inRange: boolean, reason: string|null} | {status: 'refused', code: string, why: string}}
 */
export function parallaxZeroPoint({ g, nuEff, pseudocolour, eclLat, params }) {
  if (params !== 31 && params !== 95)
    return {
      status: 'refused',
      code: 'solution',
      why: 'astrometric_params_solved must be 31 (five parameters) or 95 (six); a two-parameter solution has no parallax',
    };
  const colour = params === 31 ? nuEff : pseudocolour;
  if (![g, colour, eclLat].every(Number.isFinite))
    return {
      status: 'refused',
      code: 'input',
      why: 'the G magnitude, the colour of the solution type and the latitude must be finite numbers',
    };
  const sinBeta = Math.sin((eclLat * Math.PI) / 180);
  const value = evaluate(params === 31 ? Z5 : Z6, g, colour, sinBeta);
  let reason = null;
  if (g <= 6 || g >= 21)
    reason = 'G is outside 6 to 21: the value at the end of the table is used';
  else if (params === 31 && (colour <= 1.1 || colour >= 1.9))
    reason = 'the effective wavenumber is outside 1.1 to 1.9 per micrometre';
  else if (params === 95 && (colour <= 1.24 || colour >= 1.72))
    reason = 'the pseudocolour is outside 1.24 to 1.72 per micrometre';
  return { value, inRange: reason === null, reason };
}
