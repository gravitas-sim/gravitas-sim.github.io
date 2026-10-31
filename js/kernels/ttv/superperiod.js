// =============================================================================
// The super-period and the first-order amplitudes (Prompt 226, TTV.md)
// -----------------------------------------------------------------------------
// Two planets near a first-order mean-motion resonance j:(j-1) pull on each other
// with a slowly drifting geometry: the pair returns to the same configuration every
//
//     P_super = 1 / | j / P2 - (j - 1) / P1 |                         (Lithwick, Xie
//                                                                    & Wu 2012, eq. 1)
//
// and each planet's transit times swing about the straight line with that period.
// To first order in the masses the amplitudes (their eq. 8 and 9) are
//
//     V  = P1  mu2 / (pi j^(2/3) (j-1)^(1/3) Delta) * ( -f - (3/2) Z* / Delta )
//     V' = P2  mu1 / (pi j Delta)                   * ( -g + (3/2) Z* / Delta )
//
// with Delta = (P2 / P1)(j - 1)/j - 1 the fractional distance from resonance, mu the
// planet-to-star mass ratio, f and g the Laplace-coefficient combinations of
// Murray & Dermott (1999, Appendix B: f27 and f31), and Z the complex combination
// f z + g z' of the two planets' FREE eccentricity vectors. Z is the term that
// cannot be read off an amplitude: it is degenerate with the mass (TTV.md).
//
// Domain, stated and enforced: the two planets are outside each other's
// resonance width, |Delta| above (mu1 + mu2)^(2/3), and not far from the
// resonance, |Delta| below 0.1; two planets only. Outside it the relation refuses
// and says why; the forward model (the engine) is what to use there.
//
// Pure: no DOM, no clock.
// =============================================================================

const { Math } = globalThis;

/** |Delta| above which a pair is not near a first-order resonance. */
export const DELTA_MAX = 0.1;

/**
 * A Laplace coefficient b_s^(j)(alpha) by the periodic trapezoid rule, which converges
 * geometrically for alpha below about 0.9.
 */
export function laplaceB(s, j, alpha, n = 4096) {
  let sum = 0;
  for (let k = 0; k < n; k++) {
    const psi = (2 * Math.PI * k) / n;
    sum +=
      Math.cos(j * psi) *
      Math.pow(1 - 2 * alpha * Math.cos(psi) + alpha * alpha, -s);
  }
  return (2 * sum) / n;
}

/** d b_s^(j) / d alpha, from the exact recurrence. */
export function laplaceDb(s, j, alpha, n = 4096) {
  return (
    s *
    (laplaceB(s + 1, j - 1, alpha, n) -
      2 * alpha * laplaceB(s + 1, j, alpha, n) +
      laplaceB(s + 1, j + 1, alpha, n))
  );
}

/**
 * f and g for the first-order resonance j:(j-1) at alpha = P1^(2/3) / P2^(2/3)
 * (Murray & Dermott 1999; the 2:1 case carries the indirect term -2 alpha in g).
 * @returns {{f: number, g: number}} 2:1 at alpha = 2^(-2/3) gives -1.1905 and 0.4284
 */
export function fgCoefficients(j, alpha) {
  const f =
    -0.5 * (2 * j * laplaceB(0.5, j, alpha) + alpha * laplaceDb(0.5, j, alpha));
  let g =
    0.5 *
    ((2 * j - 1) * laplaceB(0.5, j - 1, alpha) +
      alpha * laplaceDb(0.5, j - 1, alpha));
  if (j === 2) g -= 2 * alpha;
  return { f, g };
}

/** The fractional distance from the j:(j-1) resonance. */
export const deltaOf = (P1, P2, j) => (P2 / P1) * ((j - 1) / j) - 1;

/** The first-order resonance j (2 to 8) a pair is nearest to, and how far. */
export function nearestFirstOrder(P1, P2) {
  let best = null;
  for (let j = 2; j <= 8; j++) {
    const d = deltaOf(P1, P2, j);
    if (!best || Math.abs(d) < Math.abs(best.delta)) best = { j, delta: d };
  }
  return best;
}

/** The super-period in the unit of the periods, or null for a pair on the resonance. */
export function superPeriod(P1, P2, j) {
  const f = Math.abs(j / P2 - (j - 1) / P1);
  return f > 0 ? 1 / f : null;
}

/**
 * Whether the sinusoid relation applies, and if not why not.
 * @returns {{ok: boolean, reason?: 'invalid'|'order'|'far-from-resonance'|'inside-resonance-width',
 *   j?: number, delta?: number, width?: number}}
 */
export function relationDomain({ P1, P2, mu1, mu2, j }) {
  if (![P1, P2, mu1, mu2].every(x => Number.isFinite(x) && x > 0))
    return { ok: false, reason: 'invalid' };
  if (!(P2 > P1)) return { ok: false, reason: 'order' };
  const near = j ? { j, delta: deltaOf(P1, P2, j) } : nearestFirstOrder(P1, P2);
  const width = Math.pow(mu1 + mu2, 2 / 3);
  const base = { j: near.j, delta: near.delta, width };
  if (Math.abs(near.delta) > DELTA_MAX)
    return { ok: false, reason: 'far-from-resonance', ...base };
  if (Math.abs(near.delta) < width)
    return { ok: false, reason: 'inside-resonance-width', ...base };
  return { ok: true, ...base };
}

/**
 * The TTV amplitudes of both planets, to first order in the masses.
 *
 * @param {{P1: number, P2: number, mu1: number, mu2: number, j?: number,
 *   Z?: {re: number, im: number}}} s - Z the free-eccentricity combination f z + g z' (default 0)
 * @returns {{status: 'ok'|'refused', reason?: string, j?: number, delta?: number,
 *   superPeriod?: number, f?: number, g?: number, inner?: {amplitude: number, phase: number},
 *   outer?: {amplitude: number, phase: number}}} Amplitudes in the unit of P
 */
export function ttvAmplitudes(s) {
  const dom = relationDomain(s);
  if (!dom.ok)
    return {
      status: 'refused',
      reason: dom.reason,
      j: dom.j,
      delta: dom.delta,
      width: dom.width,
    };
  const { P1, P2, mu1, mu2 } = s;
  const j = dom.j;
  const D = dom.delta;
  const alpha = Math.pow(P1 / P2, 2 / 3);
  const { f, g } = fgCoefficients(j, alpha);
  const Z = s.Z ?? { re: 0, im: 0 };
  const zc = { re: Z.re / D, im: -Z.im / D }; // Z* / Delta
  const k1 =
    (P1 * mu2) / (Math.PI * Math.pow(j, 2 / 3) * Math.pow(j - 1, 1 / 3) * D);
  const k2 = (P2 * mu1) / (Math.PI * j * D);
  const V1 = { re: k1 * (-f - 1.5 * zc.re), im: k1 * (-1.5 * zc.im) };
  const V2 = { re: k2 * (-g + 1.5 * zc.re), im: k2 * (1.5 * zc.im) };
  return {
    status: 'ok',
    j,
    delta: D,
    superPeriod: superPeriod(P1, P2, j),
    f,
    g,
    inner: {
      amplitude: Math.hypot(V1.re, V1.im),
      phase: Math.atan2(V1.im, V1.re),
    },
    outer: {
      amplitude: Math.hypot(V2.re, V2.im),
      phase: Math.atan2(V2.im, V2.re),
    },
  };
}
