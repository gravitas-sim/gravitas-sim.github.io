// =============================================================================
// The initial-final mass relation, as cited
// -----------------------------------------------------------------------------
// Cummings et al. (2018): the mass a white dwarf has as a function of the mass
// its star was born with, a piecewise-linear fit to the white dwarfs of star
// clusters whose ages give their progenitors' lifetimes and so their initial
// masses. Two sets of stellar models give two relations (MIST and PARSEC); the
// paper finds them alike but for the highest masses, and both are offered so
// that the dependence on the models is not hidden. The scatter of the dwarfs
// about the relation (0.06 solar masses) is real and is not a measurement
// error; the coefficient uncertainties are separate and are taken as
// uncorrelated, which over-states their effect because a steeper slope comes
// with a lower intercept. Outside the span the data cover the answer is a
// refusal; above the last piece's stated limit (7.2) it is flagged.
// =============================================================================

import { IFMR } from './constants.js';

const refuse = (reason, detail) => ({ status: 'refused', reason, detail });

const Z95 = 1.959963984540054;

/** The piece of a relation that holds at an initial mass. */
function pieceAt(relation, mi) {
  const ps = relation.pieces;
  for (let i = 0; i < ps.length; i++)
    if (mi < ps[i].hi || i === ps.length - 1) return ps[i];
  return ps[ps.length - 1];
}

/**
 * The final mass for an initial mass, with the scatter, the parametric
 * uncertainty and the interval a new white dwarf of that initial mass would
 * fall in (95 per cent). The result says which relation, which piece, and
 * whether the initial mass is above the piece's stated limit.
 *
 * @param {number} initialMass - Solar masses
 * @param {{relation?: 'mist'|'parsec'}} [options]
 */
export function finalMass(initialMass, options = {}) {
  const { relation = 'mist' } = options;
  const rel = IFMR.relations[relation];
  if (!rel) return refuse('unknown-relation', `no relation called ${relation}`);
  if (
    typeof initialMass !== 'number' ||
    !Number.isFinite(initialMass) ||
    initialMass <= 0
  )
    return refuse(
      'invalid-input',
      'an initial mass that is a positive finite number'
    );
  const hi = IFMR.domain[1];
  const lo = Math.max(IFMR.domain[0], rel.pieces[0].lo);
  if (initialMass < lo)
    return refuse(
      'below-the-data',
      `the white dwarfs the relation was fitted to have progenitors of ${lo} to ${hi} solar masses`
    );
  if (initialMass > hi)
    return refuse(
      'above-the-data',
      `the white dwarfs the relation was fitted to have progenitors of ${lo} to ${hi} solar masses`
    );
  const p = pieceAt(rel, initialMass);
  const value = p.slope * initialMass + p.intercept;
  const sParam = Math.hypot(p.sSlope * initialMass, p.sIntercept);
  const sPredict = Math.hypot(IFMR.scatter, sParam);
  const lastLimit = rel.pieces[rel.pieces.length - 1].hi;
  return {
    status: 'ok',
    relation: rel.id,
    initialMass,
    finalMass: value,
    massLost: initialMass - value,
    lossFraction: (initialMass - value) / initialMass,
    scatter: IFMR.scatter,
    sigmaParameters: sParam,
    sigmaPrediction: sPredict,
    interval95: { lo: value - Z95 * sPredict, hi: value + Z95 * sPredict },
    extrapolated: initialMass > lastLimit,
    piece: { lo: p.lo, hi: p.hi },
  };
}

/** The relation as a curve over its span, for a plot: [mi, mf] pairs. */
export function ifmrCurve(relation = 'mist', n = 80) {
  const rel = IFMR.relations[relation];
  const [lo, hi] = [rel.pieces[0].lo, IFMR.domain[1]];
  return Array.from({ length: n }, (_, i) => {
    const mi = lo + ((hi - lo) * i) / (n - 1);
    const r = finalMass(mi, { relation });
    return [mi, r.status === 'ok' ? r.finalMass : null];
  });
}

export { IFMR };
