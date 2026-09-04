// =============================================================================
// Resonance analysis: angles, ratios, and the difference between them
// -----------------------------------------------------------------------------
// The measuring apparatus of the orbital-resonance investigation, and nothing
// else. Pure arithmetic - no DOM, no simulation imports, no canvas - so every
// claim the lesson makes can be tested directly in tests/resonance.test.js.
//
// The one idea the whole file is built around
// -----------------------------------------------------------------------------
// A near-rational period ratio is not evidence of resonance. It is barely
// evidence of anything: rationals with small denominators are dense enough that
// an arbitrary ratio lands within a percent or so of one by accident. Callisto
// sits within 0.03% of 7:3 with Ganymede and is not in resonance with it;
// Pluto sits 0.3% away from 3:2 with Neptune - ten times further - and is.
//
// What separates them is a resonant angle: a particular integer combination of
// mean longitudes and longitudes of periapsis, chosen so that the fast terms
// cancel and what is left evolves slowly. If that angle circulates - runs
// through all 360 degrees - the two bodies take up every relative geometry in
// turn and there is no resonance. If it librates - swings back and forth about
// a fixed value without ever completing a circuit - the geometry repeats, the
// perturbations add up in the same sense every time, and that is the lock.
//
// So `nearestRatio` is deliberately paired with `ratioSurprise`, which says how
// unremarkable the closeness is, and `classifyAngle` is deliberately willing to
// answer "inconclusive". A short run cannot distinguish libration from very
// slow circulation, and saying so is the honest result rather than a failure.
// =============================================================================

/** Radians to degrees. */
export const DEG = 180 / Math.PI;
/** Degrees to radians. */
export const RAD = Math.PI / 180;

// --- Angles -------------------------------------------------------------------

/**
 * An angle folded into [0, 360).
 * @param {number} deg - Any angle in degrees
 * @returns {number} The same angle in [0, 360)
 */
export const wrap360 = deg => {
  if (!Number.isFinite(deg)) return NaN;
  const w = deg % 360;
  if (w >= 0) return w;
  // A tiny negative angle plus 360 rounds to exactly 360 in floating point,
  // which is outside the half-open range this function promises and shows up
  // downstream as a libration centre of "360 degrees" or a conjunction mean of
  // 360 rather than 0.
  const shifted = w + 360;
  return shifted >= 360 ? 0 : shifted;
};

/**
 * An angle folded into [-180, 180).
 *
 * The form to use for a difference between two angles, and the wrong form for
 * a resonant angle that librates about 180 - which is why both exist.
 *
 * @param {number} deg - Any angle in degrees
 * @returns {number} The same angle in [-180, 180)
 */
export const wrap180 = deg => {
  const w = wrap360(deg);
  return w >= 180 ? w - 360 : w;
};

/**
 * An angle folded into a 360-degree window centred on `centre`.
 *
 * A resonant angle librating about 180 crosses neither 0 nor 360, so plotting
 * it wrapped to [0, 360) is already continuous. One librating about 0 crosses
 * 360 on every swing and looks like a sawtooth until it is re-centred, and a
 * student reading amplitude off that plot reads 180 degrees instead of two.
 *
 * @param {number} deg - Any angle in degrees
 * @param {number} centre - Centre of the window, in degrees
 * @returns {number} The angle in [centre - 180, centre + 180)
 */
export const wrapAbout = (deg, centre) => centre + wrap180(deg - centre);

/**
 * Remove the 360-degree jumps from a sampled angle.
 *
 * Every classification in this file works on the unwrapped form, because
 * "has it gone all the way round?" is a question the wrapped form throws away.
 * The step between consecutive samples is assumed to be less than half a turn;
 * a series sampled more coarsely than that cannot be unwrapped by any means,
 * and `classifyAngle` refuses such a series rather than guessing at it.
 *
 * @param {Array<number>} degrees - Sampled angle, wrapped, in degrees
 * @returns {Array<number>} The same angle made continuous
 */
export function unwrapDegrees(degrees) {
  const out = [];
  let offset = 0;
  let prev = null;
  for (const d of degrees) {
    if (!Number.isFinite(d)) {
      out.push(NaN);
      continue;
    }
    if (prev !== null) offset += wrap180(d - prev) - (d - prev);
    out.push(d + offset);
    prev = d;
  }
  return out;
}

/**
 * The largest step between consecutive samples of a wrapped angle.
 *
 * The unwrapping above is only valid while this stays below 180 degrees. A
 * caller that wants to trust an unwrapped series should check this first.
 *
 * @param {Array<number>} degrees - Sampled angle, wrapped
 * @returns {number} Largest absolute wrapped step, in degrees
 */
export function largestStep(degrees) {
  let worst = 0;
  for (let i = 1; i < degrees.length; i++) {
    const step = Math.abs(wrap180(degrees[i] - degrees[i - 1]));
    if (step > worst) worst = step;
  }
  return worst;
}

// --- Two-body elements, in the form resonance work needs ----------------------

/**
 * Orbital elements of a body about a primary, including the angles.
 *
 * js/orbital.js already solves the two-body problem and is what the rest of the
 * application uses; it stops short of the mean anomaly and the mean longitude,
 * which are exactly the quantities a resonant angle is built from. Rather than
 * widen that module for one caller, this repeats the derivation in the form
 * this one needs and returns the angles in degrees, which is how every
 * resonance in the literature is written.
 *
 * Conventions, all of them stated because a sign error in one of them produces
 * a plausible-looking angle that means nothing:
 *
 *   theta   true longitude, atan2(y, x) of the relative position
 *   varpi   longitude of periapsis, the direction of the eccentricity vector
 *   f       true anomaly, theta - varpi
 *   E       eccentric anomaly, from f by the half-angle relation
 *   M       mean anomaly, E - e sin E
 *   lambda  mean longitude, varpi + M
 *
 * For a retrograde orbit the sense of f, E, M and the angular part of theta is
 * flipped, so that lambda still increases with time. Every scenario in the
 * lesson is prograde; the flip is here so that a student who reverses one gets
 * a wrong answer rather than a nonsensical one.
 *
 * @param {Object} body - {pos:{x,y}, vel:{x,y}, mass}
 * @param {Object} primary - {pos:{x,y}, vel:{x,y}, mass}
 * @param {number} G - Gravitational constant in simulation units
 * @returns {Object|null} Elements with angles in degrees, or null
 */
export function resonanceElements(body, primary, G) {
  if (!body || !primary || !Number.isFinite(G) || G <= 0) return null;

  const rx = body.pos.x - primary.pos.x;
  const ry = body.pos.y - primary.pos.y;
  const vx = body.vel.x - primary.vel.x;
  const vy = body.vel.y - primary.vel.y;

  const r = Math.hypot(rx, ry);
  if (!(r > 0) || !Number.isFinite(r)) return null;

  const mu = G * ((primary.mass || 0) + (body.mass || 0));
  if (!(mu > 0) || !Number.isFinite(mu)) return null;

  const v2 = vx * vx + vy * vy;
  const energy = v2 / 2 - mu / r;
  if (!(energy < 0)) return null; // unbound: no period, no mean longitude

  const a = -mu / (2 * energy);
  const h = rx * vy - ry * vx;
  const sense = h < 0 ? -1 : 1;

  const ex = (vy * h) / mu - rx / r;
  const ey = (-vx * h) / mu - ry / r;
  const e = Math.min(Math.hypot(ex, ey), 0.999999);

  const n = Math.sqrt(mu / (a * a * a)); // radians per simulated second
  const period = (2 * Math.PI) / n;

  // With e at or near zero the eccentricity vector has no direction and varpi
  // is arbitrary. It cancels out of lambda = varpi + M analytically, and does
  // so numerically too as long as both come from the same vector, so the
  // fallback below keeps lambda right even when varpi is meaningless.
  const varpiRad = e > 0 ? Math.atan2(ey, ex) : 0;
  const thetaRad = Math.atan2(ry, rx);
  const f = sense * (thetaRad - varpiRad);

  // Eccentric anomaly by the half-angle relation, which is stable for every
  // eccentricity below one and does not need the quadrant repaired afterwards.
  const E =
    2 *
    Math.atan2(
      Math.sqrt(1 - e) * Math.sin(f / 2),
      Math.sqrt(1 + e) * Math.cos(f / 2)
    );
  const M = E - e * Math.sin(E);
  const lambda = sense * varpiRad + M;

  return {
    a,
    e,
    r,
    speed: Math.sqrt(v2),
    n: sense * n,
    period,
    // Angles, in degrees, wrapped into [0, 360).
    lambda: wrap360(lambda * DEG),
    varpi: wrap360(sense * varpiRad * DEG),
    meanAnomaly: wrap360(M * DEG),
    trueAnomaly: wrap360(f * DEG),
    trueLongitude: wrap360(sense * thetaRad * DEG),
    periapsis: a * (1 - e),
    apoapsis: a * (1 + e),
    retrograde: sense < 0,
    mu,
  };
}

// --- Ratios -------------------------------------------------------------------

/**
 * The best small-integer approximation to a ratio.
 *
 * Continued fractions, truncated at the largest denominator asked for. The
 * convergents of a continued fraction are provably the best rational
 * approximations available at their denominator, so this cannot be beaten by
 * searching - and, more to the point for the lesson, it finds one for any
 * number at all. That is the trap the investigation is built to spring.
 *
 * @param {number} x - The ratio, expected positive
 * @param {number} maxDenominator - Largest q to consider
 * @returns {{p:number, q:number, value:number, error:number, fractional:number}|null}
 */
export function nearestRatio(x, maxDenominator = 10) {
  if (!Number.isFinite(x) || x <= 0) return null;
  const limit = Math.max(1, Math.floor(maxDenominator));

  // Convergents by the standard recurrence. h/k are the current convergent and
  // hPrev/kPrev the one before it.
  let [h, hPrev] = [1, 0];
  let [k, kPrev] = [0, 1];
  let value = x;
  let best = { p: Math.max(1, Math.round(x)), q: 1 };

  for (let i = 0; i < 32; i++) {
    const whole = Math.floor(value);
    const h2 = whole * h + hPrev;
    const k2 = whole * k + kPrev;
    if (k2 > limit || k2 <= 0) break;
    [hPrev, h] = [h, h2];
    [kPrev, k] = [k, k2];
    if (h > 0) best = { p: h, q: k };
    const frac = value - whole;
    if (frac < 1e-12) break;
    value = 1 / frac;
  }

  const ratio = best.p / best.q;
  return {
    p: best.p,
    q: best.q,
    value: ratio,
    error: x - ratio,
    fractional: Math.abs(x - ratio) / x,
  };
}

/**
 * How unremarkable a near-rational ratio is.
 *
 * The rationals with denominator at most Q are dense: there are about
 * 3Q^2/pi^2 of them per unit interval, so the mean gap between neighbours is
 * about pi^2 / (3 Q^2) and an arbitrary number is typically within half of that
 * of one. For Q = 10 that is 1.6%. A ratio 0.3% from 3:2 is therefore about
 * five times closer than chance, which sounds impressive until you notice that
 * Callisto is fifty times closer than chance to 7:3 and is not resonant.
 *
 * The number this returns is the point of the whole exercise: closeness is a
 * hint, and only the resonant angle settles it.
 *
 * @param {number} x - The ratio
 * @param {number} maxDenominator - The denominator limit used to find it
 * @returns {{fractional:number, typical:number, timesCloser:number}|null}
 */
export function ratioSurprise(x, maxDenominator = 10) {
  const near = nearestRatio(x, maxDenominator);
  if (!near) return null;
  const Q = Math.max(1, Math.floor(maxDenominator));
  // Half the mean gap between Farey neighbours of order Q, expressed as a
  // fraction of x so it compares with `fractional`.
  const typical = Math.PI ** 2 / (6 * Q * Q) / x;
  return {
    fractional: near.fractional,
    typical,
    timesCloser: near.fractional > 0 ? typical / near.fractional : Infinity,
  };
}

// --- Resonant angles ----------------------------------------------------------

/**
 * A general resonant argument.
 *
 * phi = sum(c_i * lambda_i) + sum(d_j * varpi_j), wrapped into [0, 360).
 *
 * The d'Alembert rule requires the coefficients to sum to zero for the angle to
 * be a valid resonant argument - otherwise it is not invariant under a rotation
 * of the coordinate frame and its value depends on where the x axis happens to
 * point. This checks that, and returns null rather than a frame-dependent
 * number, because a plot of a frame-dependent angle looks exactly like a plot
 * of a real one.
 *
 * @param {Array<{coefficient:number, lambda:number, varpi?:number, varpiCoefficient?:number}>} terms
 * @returns {number|null} The argument in degrees, or null if it is not one
 */
export function resonantArgument(terms) {
  if (!Array.isArray(terms) || !terms.length) return null;
  let total = 0;
  let sum = 0;
  for (const term of terms) {
    const c = term.coefficient ?? 0;
    const d = term.varpiCoefficient ?? 0;
    if (!Number.isFinite(term.lambda)) return null;
    if (d !== 0 && !Number.isFinite(term.varpi)) return null;
    total += c * term.lambda + d * (term.varpi ?? 0);
    sum += c + d;
  }
  if (Math.abs(sum) > 1e-9) return null;
  return wrap360(total);
}

/**
 * The Laplace argument of the Galilean moons.
 *
 * phi_L = lambda_Io - 3 lambda_Europa + 2 lambda_Ganymede
 *
 * Coefficients 1, -3, 2 sum to zero, so no longitude of periapsis is needed and
 * the argument is defined even for orbits whose eccentricity is too small to
 * give a periapsis direction. That is why this is the angle the lesson leans
 * on: the two-body arguments of the same system all involve a varpi, and
 * Gravitas has no oblateness term to precess one at the rate reality does.
 *
 * It librates about 180 degrees, which is the statement that Io, Europa and
 * Ganymede are never all three in conjunction.
 *
 * @param {number} io - Mean longitude of Io, degrees
 * @param {number} europa - Mean longitude of Europa, degrees
 * @param {number} ganymede - Mean longitude of Ganymede, degrees
 * @returns {number} The Laplace argument in [0, 360)
 */
export const laplaceArgument = (io, europa, ganymede) =>
  wrap360(io - 3 * europa + 2 * ganymede);

/**
 * The 3:2 resonant argument of Pluto with Neptune.
 *
 * phi = 3 lambda_Pluto - 2 lambda_Neptune - varpi_Pluto
 *
 * Coefficients 3, -2, -1 sum to zero. It librates about 180 degrees, and the
 * arithmetic of why that protects Pluto is one line: at a conjunction the two
 * mean longitudes are equal, so phi collapses to lambda_conjunction minus
 * varpi_Pluto, and phi = 180 says every conjunction happens half a revolution
 * from Pluto's perihelion - which is to say at its aphelion, thirteen AU
 * further out than Neptune ever reaches.
 *
 * @param {number} pluto - Mean longitude of Pluto, degrees
 * @param {number} neptune - Mean longitude of Neptune, degrees
 * @param {number} plutoVarpi - Longitude of Pluto's perihelion, degrees
 * @returns {number} The argument in [0, 360)
 */
export const plutoArgument = (pluto, neptune, plutoVarpi) =>
  wrap360(3 * pluto - 2 * neptune - plutoVarpi);

/**
 * A first-order two-body resonant argument, p:q with the inner body's periapsis.
 *
 * phi = p * lambda_outer - q * lambda_inner - (p - q) * varpi
 *
 * @param {number} p - Integer multiplying the outer mean longitude
 * @param {number} q - Integer multiplying the inner mean longitude
 * @param {number} outer - Mean longitude of the outer body, degrees
 * @param {number} inner - Mean longitude of the inner body, degrees
 * @param {number} varpi - Longitude of periapsis the argument is built on
 * @returns {number} The argument in [0, 360)
 */
export const twoBodyArgument = (p, q, outer, inner, varpi) =>
  wrap360(p * outer - q * inner - (p - q) * varpi);

// --- Libration or circulation -------------------------------------------------

/** The states `classifyAngle` can return. */
export const ANGLE_STATE = {
  LIBRATION: 'libration',
  CIRCULATION: 'circulation',
  INCONCLUSIVE: 'inconclusive',
};

/**
 * The thresholds every classification below is made against.
 *
 * Each one is a judgement, so each one is written down with the reason rather
 * than buried in the code that uses it.
 */
export const ANGLE_CRITERIA = {
  /** Below this many samples nothing is claimed: a handful of points can be
   *  drawn through by either hypothesis. */
  minSamples: 24,
  /** Unwrapping is only valid while consecutive samples are less than half a
   *  turn apart. Above this the series is refused outright. */
  maxStepDeg: 150,
  /** A completed circuit. Slightly under 360 so that a circulation whose last
   *  sample lands just short is still recognised. */
  circulationDeg: 355,
  /** A turning point has to stand this far clear of the excursion around it,
   *  as a fraction of the total observed range, before it counts as a reversal
   *  rather than a wiggle. An N-body resonant angle carries a ripple at the
   *  synodic frequency, and every ripple has two extrema; counting those would
   *  report the synodic period as the libration period. */
  turnProminence: 0.12,
  /** ...and at least this many degrees, so a series flat to numerical
   *  precision does not report hundreds of tiny reversals. */
  turnFloorDeg: 0.5,
  /** An angle that has stayed inside this much of the circle is reported as
   *  confined. Confined is not a verdict - see below - but it is the difference
   *  between "we have not seen it go round" and "we have seen it go most of the
   *  way round", and a reader is entitled to the distinction. */
  boundedSpanDeg: 150,
  /** ...and confined is only worth saying when any circulation consistent with
   *  the observed drift would take at least this many conjunction cycles. */
  confinedCycles: 20,
  /** The window must cover at least this many conjunction cycles before any
   *  verdict but "too short" is offered. */
  minCycles: 20,
  /** An angle that has not moved this far in the whole record is not librating
   *  slowly; it is sitting at the equilibrium, which is the zero-amplitude
   *  limit of a libration. Reported separately because "inconclusive - it has
   *  not turned back yet" is a strange thing to say about a body that has not
   *  moved at all. Over the twenty conjunction cycles the record must already
   *  cover, a circulation this slow would take forty thousand of them. */
  stationaryDeg: 0.25,
  /** A back-and-forth faster than this many conjunction cycles is the
   *  short-period ripple every resonant argument carries, not a libration.
   *  Real libration periods are far longer than the conjunction cycle that
   *  drives them - forty times for Pluto, six hundred for the Laplace
   *  argument - so four is a floor with a lot of room under it. */
  minLibrationCycles: 4,
  /** With three or more reversals there are two extrema of the same kind to
   *  compare, and a libration must return to the same extreme each time. They
   *  are allowed to differ by this fraction of the amplitude; beyond it the
   *  centre is moving, which is a drift with a wobble on it and not a lock. */
  extremaWander: 0.6,
  /** With only two reversals there is nothing to compare, so the test is
   *  weaker: the angle must have ended up within this multiple of the
   *  amplitude of where it started. A libration watched from one extreme to
   *  the other for a period and a half can legitimately drift by twice its
   *  amplitude, so this rejects some genuine librations - which is the right
   *  way round for a test whose other failure mode is calling Callisto
   *  resonant. */
  driftOverAmplitude: 1.2,
};

/**
 * A centred moving average over a fixed span of time.
 *
 * Every resonant argument carries a ripple at the conjunction frequency: the
 * two bodies pull hardest on each other when they line up, and the argument
 * jogs each time they do. That ripple is not libration - it does not mean the
 * angle is confined, and it happens whether or not there is a resonance - but
 * every one of its cycles has two extrema, and a turning-point search run on
 * the raw series counts them. Measured on Callisto, whose 7:3 argument with
 * Ganymede is slowly circulating, the raw series reports a tidy libration of
 * amplitude 7 degrees with a period equal to the Ganymede-Callisto synodic
 * period. It is an artefact, and a convincing one.
 *
 * Averaging over exactly one conjunction cycle removes it, which is the same
 * averaging the analytic treatment does when it drops the short-period terms
 * from the disturbing function. The window is measured in time rather than in
 * samples so that a decimated record is smoothed over the same physical
 * interval as a dense one, and it is shrunk symmetrically near the ends so the
 * average stays centred rather than becoming lopsided there.
 *
 * @param {Array<number>} values - The unwrapped angle
 * @param {Array<number>} times - Matching timestamps
 * @param {number} span - Full width of the averaging window, in time
 * @returns {Array<number>} The smoothed series, same length
 */
export function smoothOverTime(values, times, span) {
  if (!(span > 0) || values.length < 3) return values.slice();
  const half = span / 2;
  const out = new Array(values.length);
  const t0 = times[0];
  const t1 = times[times.length - 1];

  let lo = 0;
  let hi = 0;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < values.length; i++) {
    // Shrink the window near the ends rather than letting it hang off the
    // series, which would drag the average towards whichever end is closer.
    const reach = Math.min(half, times[i] - t0, t1 - times[i]);
    const from = times[i] - reach;
    const to = times[i] + reach;
    while (lo < values.length && times[lo] < from) {
      sum -= values[lo];
      count--;
      lo++;
    }
    while (hi < values.length && times[hi] <= to) {
      sum += values[hi];
      count++;
      hi++;
    }
    // The window only ever moves forward, so a shrinking reach at the far end
    // can leave `hi` ahead of `to`; recompute directly in that rare case.
    if (hi > 0 && times[hi - 1] > to) {
      let s2 = 0;
      let n2 = 0;
      for (let k = lo; k < values.length && times[k] <= to; k++) {
        s2 += values[k];
        n2++;
      }
      out[i] = n2 ? s2 / n2 : values[i];
      continue;
    }
    out[i] = count > 0 ? sum / count : values[i];
  }
  return out;
}

/**
 * Turning points of a series, filtered by prominence.
 *
 * A resonant angle sampled from an N-body integration is not smooth: the
 * short-period terms put a ripple on it at the synodic frequency, and every
 * ripple has two extrema. Counting those as reversals would report a libration
 * period equal to the synodic period, which is wrong and confidently so. Only
 * an extremum that stands clear of the surrounding excursion counts.
 *
 * @param {Array<number>} values - The unwrapped angle
 * @param {number} prominence - Minimum height above the neighbouring extremum
 * @returns {Array<{index:number, value:number, kind:string}>} Turning points
 */
export function turningPoints(values, prominence) {
  if (!Array.isArray(values) || values.length < 3 || !(prominence > 0))
    return [];

  // Running extremes since the last committed turning point. `looking` is +1
  // while a maximum is being hunted, -1 for a minimum, and 0 before the series
  // has moved far enough in either direction to say which - in that state
  // whichever threshold is crossed first decides the phase.
  const out = [];
  let looking = 0;
  let hi = values[0];
  let hiAt = 0;
  let lo = values[0];
  let loAt = 0;

  for (let i = 1; i < values.length; i++) {
    const v = values[i];
    if (!Number.isFinite(v)) continue;
    if (v > hi) {
      hi = v;
      hiAt = i;
    }
    if (v < lo) {
      lo = v;
      loAt = i;
    }
    if (looking >= 0 && hi - v >= prominence) {
      // Not at index 0: a reversal needs the series to arrive at the extremum
      // as well as leave it, and the first sample was never arrived at.
      if (hiAt > 0) out.push({ index: hiAt, value: hi, kind: 'max' });
      looking = -1;
      lo = v;
      loAt = i;
    } else if (looking <= 0 && v - lo >= prominence) {
      if (loAt > 0) out.push({ index: loAt, value: lo, kind: 'min' });
      looking = 1;
      hi = v;
      hiAt = i;
    }
  }
  return out;
}

/**
 * Decide whether a sampled resonant angle librates, circulates, or has not been
 * watched long enough to say.
 *
 * The three answers are not symmetric, and the third is what makes the other
 * two mean anything. A resonant angle observed briefly drifts a little; so does
 * one circulating with a period far longer than the observation. Nothing in the
 * data separates them, and a classifier that picks one anyway has produced a
 * number rather than a measurement.
 *
 * In descending order of what the evidence supports:
 *
 *   a completed circuit          circulation, and its period is measured
 *   two or more reversals        libration, with centre, amplitude and period
 *   one reversal                 libration, with centre and amplitude; the
 *                                period is bounded below, not measured
 *   no reversal, tight bound     inconclusive, reason "confined": the angle has
 *                                not been seen to go round, and the slowest
 *                                circulation ruled out is reported so a reader
 *                                can judge how nearly it is a lock
 *   anything else                inconclusive, reason "ambiguous-drift"
 *
 * `referencePeriod` should be the conjunction cycle of the bodies in the
 * argument - the synodic period of the pair, or for the Laplace argument the
 * Io-Europa synodic period. It is what turns "the angle hardly moved" into a
 * physical statement: hardly moved *while the bodies met two hundred times*.
 * Without it the same test is made against the length of the run, which makes
 * the verdict depend on how long the student watched.
 *
 * @param {Array<{t:number, phi:number}>} samples - Time and wrapped angle
 * @param {Object} [options] - `referencePeriod` plus any ANGLE_CRITERIA override
 * @returns {Object} The classification, always with a `state` and a `reason`
 */
export function classifyAngle(samples, options = {}) {
  const { referencePeriod = null, ...overrides } = options;
  const C = { ...ANGLE_CRITERIA, ...overrides };
  const clean = (samples || []).filter(
    s => s && Number.isFinite(s.t) && Number.isFinite(s.phi)
  );

  const window = clean.length > 1 ? clean[clean.length - 1].t - clean[0].t : 0;
  const cycles = referencePeriod > 0 ? window / referencePeriod : null;

  // Filled in below as soon as there is enough to compute them, and handed to
  // `blank` as well as to the verdicts. An instrument that cannot be given an
  // answer should still be able to draw what it recorded: a plot that goes
  // blank while the verdict says "not long enough yet" hides exactly the
  // evidence a student is being asked to wait for.
  let drawn = { unwrapped: [], secular: [] };

  const blank = reason => ({
    state: ANGLE_STATE.INCONCLUSIVE,
    reason,
    samples: clean.length,
    window,
    observedCycles: cycles,
    centre: null,
    amplitude: null,
    amplitudeIsBound: false,
    period: null,
    periodResolved: false,
    librationCycles: 0,
    drift: null,
    span: null,
    ripple: null,
    minimumCirculationPeriod: null,
    turns: [],
    ...drawn,
  });

  if (clean.length < C.minSamples) return blank('too-few-samples');
  if (!(window > 0)) return blank('no-window');

  const wrapped = clean.map(s => wrap360(s.phi));
  if (largestStep(wrapped) > C.maxStepDeg) return blank('undersampled');

  const unwrapped = unwrapDegrees(wrapped);
  // Everything below is measured on the series with the conjunction-frequency
  // ripple averaged out. The raw series is still what gets plotted, because a
  // student should see what was actually recorded, but it is not what the
  // verdict is made from - see smoothOverTime for why.
  const times = clean.map(s => s.t);
  const secular =
    referencePeriod > 0 && options.smooth !== false
      ? smoothOverTime(unwrapped, times, referencePeriod)
      : unwrapped;

  const lo = Math.min(...secular);
  const hi = Math.max(...secular);
  const span = hi - lo;
  const drift = secular[secular.length - 1] - secular[0];
  const ripple =
    Math.max(...unwrapped.map((v, i) => Math.abs(v - secular[i]))) || 0;
  drawn = { unwrapped, secular };

  const prominence = Math.max(C.turnFloorDeg, C.turnProminence * span);
  let turns = turningPoints(secular, prominence);

  // A reversal pattern at the conjunction frequency is ripple that survived the
  // averaging, not libration. Discard the turning points rather than quoting a
  // libration period equal to the synodic period.
  if (turns.length >= 2 && referencePeriod > 0) {
    const first = times[turns[0].index];
    const last = times[turns[turns.length - 1].index];
    const halfPeriod = (last - first) / (turns.length - 1);
    if (2 * halfPeriod < C.minLibrationCycles * referencePeriod) turns = [];
  }

  // The strongest thing a bounded record can say: no circulation faster than
  // this is consistent with the drift observed.
  const rate = Math.abs(drift) / window;
  const minimumCirculationPeriod = rate > 0 ? 360 / rate : Infinity;
  const base = {
    samples: clean.length,
    window,
    observedCycles: cycles,
    span,
    drift,
    ripple,
    unwrapped,
    secular,
    turns,
    minimumCirculationPeriod,
  };

  // A completed circuit settles it. Nothing that librates covers 360 degrees in
  // one direction, because a libration turns back before it gets there.
  if (Math.abs(drift) >= C.circulationDeg) {
    const laps = Math.abs(drift) / 360;
    return {
      ...base,
      state: ANGLE_STATE.CIRCULATION,
      reason: 'completed-circuit',
      centre: null,
      amplitude: null,
      amplitudeIsBound: false,
      period: window / laps,
      periodResolved: true,
      librationCycles: 0,
    };
  }

  // Too short to say anything, whatever the shape of it.
  if (cycles !== null && cycles < C.minCycles) return blank('too-short');

  // A body sitting exactly at an equilibrium.
  if (span <= C.stationaryDeg) {
    return {
      ...base,
      state: ANGLE_STATE.LIBRATION,
      reason: 'stationary',
      centre: wrap360((hi + lo) / 2),
      amplitude: span / 2,
      amplitudeIsBound: false,
      period: null,
      periodResolved: false,
      librationCycles: 0,
    };
  }

  if (turns.length >= 2) {
    const maxima = turns.filter(p => p.kind === 'max').map(p => p.value);
    const minima = turns.filter(p => p.kind === 'min').map(p => p.value);
    const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
    const spread = xs =>
      xs.length > 1 ? Math.max(...xs) - Math.min(...xs) : 0;
    const top = mean(maxima);
    const bottom = mean(minima);
    const amplitude = (top - bottom) / 2;
    const halves = [];
    for (let i = 1; i < turns.length; i++) {
      halves.push(clean[turns[i].index].t - clean[turns[i - 1].index].t);
    }
    const period = 2 * mean(halves);

    // The test that separates a libration from a drift with a wobble on it.
    //
    // With three reversals or more there are two extrema of the same kind, and
    // a libration must come back to the same extreme: if each maximum is higher
    // than the last, the centre is moving and the angle is on its way round.
    // With only two there is nothing to compare, so the weaker test is used
    // instead - the angle must have ended near where it began.
    //
    // Callisto is what these are for. Over three hundred Io orbits its 7:3
    // argument with Ganymede shows a clean pair of reversals and would be
    // reported as a libration of amplitude 26 degrees. It is not librating; it
    // is circulating once every three thousand Io orbits with a 26-degree
    // wobble along the way, and the tell is that it has drifted 35 degrees
    // while doing it.
    const repeatable =
      turns.length >= 3
        ? Math.max(spread(maxima), spread(minima)) <=
          C.extremaWander * Math.abs(amplitude)
        : Math.abs(drift) <= C.driftOverAmplitude * Math.abs(amplitude);

    if (repeatable) {
      return {
        ...base,
        state: ANGLE_STATE.LIBRATION,
        reason: 'reversals',
        centre: wrap360((top + bottom) / 2),
        amplitude,
        amplitudeIsBound: false,
        period,
        periodResolved: turns.length >= 3,
        librationCycles: (turns.length - 1) / 2,
      };
    }

    return {
      ...base,
      state: ANGLE_STATE.INCONCLUSIVE,
      reason: 'drifting-centre',
      centre: null,
      amplitude,
      amplitudeIsBound: true,
      period: null,
      periodResolved: false,
      librationCycles: 0,
    };
  }

  // Exactly one reversal. The angle has been seen to turn once, which rules
  // nothing out on its own: a circulating angle with a wobble does that too,
  // and this is where Callisto sits for most of a lesson-length run. What it
  // does establish is a lower bound on the swing, so that is what is reported.
  if (turns.length === 1) {
    return {
      ...base,
      state: ANGLE_STATE.INCONCLUSIVE,
      reason: 'one-reversal',
      centre: wrap360((hi + lo) / 2),
      amplitude: span / 2,
      amplitudeIsBound: true,
      period: null,
      periodResolved: false,
      librationCycles: 0,
    };
  }

  // No reversal and no circuit, which is the case this whole classifier exists
  // to get right.
  //
  // It is tempting to call a tightly confined angle a libration. It is also
  // wrong: a circulation slower than the observation looks exactly the same,
  // and no amount of confinement separates them - only a reversal does.
  // Callisto is why this matters rather than being a technicality. Its 7:3
  // argument with Ganymede drifts about twenty degrees over a hundred and fifty
  // Io orbits, which bounds any circulation at a few hundred conjunction
  // cycles; the Laplace argument over the same run bounds its own at over a
  // thousand. Both look locked. One is, and the only thing that says so is
  // watching until it turns back.
  //
  // So this returns inconclusive, and returns the bound with it, and the two
  // reasons say how much has been ruled out.
  const confined =
    span <= C.boundedSpanDeg &&
    minimumCirculationPeriod >= C.confinedCycles * (referencePeriod || window);

  return {
    ...base,
    state: ANGLE_STATE.INCONCLUSIVE,
    reason: confined ? 'confined' : 'ambiguous-drift',
    // Given because a reader needs somewhere to look, and flagged as a bound
    // because the angle has not been seen to turn: the true amplitude is at
    // least this, and the true centre could be anywhere inside the span.
    centre: confined ? wrap360((hi + lo) / 2) : null,
    amplitude: confined ? span / 2 : null,
    amplitudeIsBound: true,
    period: null,
    periodResolved: false,
    librationCycles: 0,
  };
}

// --- Conjunctions -------------------------------------------------------------

/**
 * Where two bodies line up, and where those line-ups happen.
 *
 * A conjunction is where the difference of the two mean longitudes passes
 * through zero. The time is found by linear interpolation between the two
 * samples that straddle it, which is accurate to well under a sample as long as
 * the relative longitude is not turning over at that moment - and it cannot be,
 * because the two mean motions differ.
 *
 * The longitude returned is the inner body's mean longitude at that instant.
 * For a resonant pair those longitudes cluster into a small number of fixed
 * directions and stay there; for a non-resonant pair they walk steadily round
 * the circle, which is a picture of the same fact the resonant angle reports.
 *
 * @param {Array<{t:number, inner:number, outer:number}>} samples - Longitudes, degrees
 * @returns {Array<{t:number, longitude:number}>} Conjunctions
 */
export function conjunctions(samples) {
  const out = [];
  const clean = (samples || []).filter(
    s =>
      s &&
      Number.isFinite(s.t) &&
      Number.isFinite(s.inner) &&
      Number.isFinite(s.outer)
  );
  if (clean.length < 2) return out;

  const relative = unwrapDegrees(clean.map(s => wrap360(s.inner - s.outer)));
  for (let i = 1; i < relative.length; i++) {
    const a = relative[i - 1];
    const b = relative[i];
    if (a === b) continue;
    // Every multiple of 360 crossed between the two samples is a conjunction.
    // The interval is half open - a crossing exactly on a sample belongs to the
    // step that leaves it, not also to the step that arrives at it - because a
    // relative longitude that advances by a whole number of degrees per sample
    // lands exactly on the multiple and would otherwise be counted twice.
    const from = Math.min(a, b);
    const to = Math.max(a, b);
    for (let k = Math.ceil(from / 360); k * 360 <= to; k++) {
      const target = k * 360;
      const span = b - a;
      const frac = (target - a) / span;
      if (frac < 0 || frac >= 1) continue;
      const t = clean[i - 1].t + frac * (clean[i].t - clean[i - 1].t);
      const inner =
        clean[i - 1].inner +
        frac * wrap180(clean[i].inner - clean[i - 1].inner);
      out.push({ t, longitude: wrap360(inner) });
    }
  }
  return out;
}

/**
 * How tightly a set of conjunction longitudes clusters.
 *
 * Circular statistics, because the mean of 1 degree and 359 degrees is 0 and
 * not 180. R is the length of the mean unit vector: 1 for a perfect cluster,
 * 0 for longitudes spread evenly round the circle. Anything above about 0.9 is
 * a pattern a student can see on the plot without being told it is there.
 *
 * @param {Array<{longitude:number}>} events - Conjunctions
 * @returns {{mean:number, R:number, spreadDeg:number, count:number}|null}
 */
export function conjunctionCluster(events) {
  const angles = (events || []).map(e => e.longitude).filter(Number.isFinite);
  if (!angles.length) return null;
  let sx = 0;
  let sy = 0;
  for (const deg of angles) {
    sx += Math.cos(deg * RAD);
    sy += Math.sin(deg * RAD);
  }
  const R = Math.hypot(sx, sy) / angles.length;
  return {
    mean: wrap360(Math.atan2(sy, sx) * DEG),
    R,
    // Circular standard deviation, in degrees.
    spreadDeg: R > 0 ? Math.sqrt(-2 * Math.log(R)) * DEG : 180,
    count: angles.length,
  };
}

// --- The rotating frame -------------------------------------------------------

/**
 * A position in the frame that turns with the secondary.
 *
 * The Trojan question cannot be asked in the inertial frame. In it, a Trojan
 * goes round the Sun on an orbit that looks exactly like Jupiter's, and the
 * whole phenomenon - that it stays 60 degrees ahead, wandering slowly about
 * that point and never escaping - is invisible. Rotate with Jupiter and the
 * tadpole draws itself.
 *
 * The frame's origin is the primary, its x axis points from the primary
 * towards the secondary, and distances are unchanged. Optionally normalised so
 * that the secondary sits at exactly x = 1.
 *
 * Primary-centred rather than barycentric, which is the less usual convention
 * and the right one here. The triangular points are defined by an equilateral
 * triangle with the primary and the secondary, so in these coordinates they sit
 * at exactly (0.5, +/-sqrt(3)/2) whatever the mass ratio; in barycentric
 * coordinates they sit at (0.5 - mu, +/-sqrt(3)/2), and the instrument would
 * have to know mu to draw its own reference marks in the right place.
 *
 * @param {{x:number,y:number}} point - Position to transform
 * @param {Object} primary - {pos, mass}
 * @param {Object} secondary - {pos, mass}
 * @param {{normalise?: boolean}} [opts] - Normalise to the separation
 * @returns {{x:number, y:number, separation:number, angle:number}|null}
 */
export function rotatingFrame(point, primary, secondary, opts = {}) {
  if (!point || !primary?.pos || !secondary?.pos) return null;
  const ox = primary.pos.x;
  const oy = primary.pos.y;

  const sx = secondary.pos.x - ox;
  const sy = secondary.pos.y - oy;
  const separation = Math.hypot(sx, sy);
  if (!(separation > 0)) return null;

  const cos = sx / separation;
  const sin = sy / separation;
  const dx = point.x - ox;
  const dy = point.y - oy;
  // Rotate by -phase, which puts the secondary on the positive x axis.
  let x = dx * cos + dy * sin;
  let y = -dx * sin + dy * cos;
  if (opts.normalise) {
    x /= separation;
    y /= separation;
  }
  return { x, y, separation, angle: wrap360(Math.atan2(y, x) * DEG) };
}

/**
 * The two triangular equilibrium points, in the rotating frame.
 *
 * Equilateral with the primary and the secondary, which is Lagrange's 1772
 * result and is exact for a circular secondary orbit however the mass is
 * divided between the two. Normalised coordinates, so this is a constant.
 *
 * @returns {{L4:{x:number,y:number}, L5:{x:number,y:number}}} The points
 */
export const triangularPoints = () => ({
  L4: { x: 0.5, y: Math.sqrt(3) / 2 },
  L5: { x: 0.5, y: -Math.sqrt(3) / 2 },
});

/**
 * The angle a co-orbital body makes with the secondary, seen from the primary.
 *
 * This is the resonant angle of a 1:1 resonance in everything but name: it is
 * lambda_trojan - lambda_jupiter, which is what the general argument reduces to
 * when p = q = 1 and the periapsis terms cancel. Sixty degrees is L4, minus
 * sixty is L5, and a body that is not co-orbital runs through all 360.
 *
 * @param {Object} body - The co-orbital
 * @param {Object} primary - The primary
 * @param {Object} secondary - The secondary defining the frame
 * @returns {number} The angle in [-180, 180) degrees
 */
export function coorbitalAngle(body, primary, secondary) {
  if (!body?.pos || !primary?.pos || !secondary?.pos) return NaN;
  const a = Math.atan2(body.pos.y - primary.pos.y, body.pos.x - primary.pos.x);
  const b = Math.atan2(
    secondary.pos.y - primary.pos.y,
    secondary.pos.x - primary.pos.x
  );
  return wrap180((a - b) * DEG);
}

/**
 * The small-amplitude tadpole libration period about L4 or L5.
 *
 * From the linearised restricted three-body problem: the libration frequency is
 * n * sqrt(27 mu (1 - mu) / 4) with mu the secondary's share of the total mass,
 * so for a planet the libration takes about 1/sqrt(27 mu / 4) orbits. For
 * Jupiter that is 12.5 of its years, which is why this is the one resonance in
 * the lesson whose full cycle a student can sit and watch.
 *
 * @param {number} orbitalPeriod - The secondary's period
 * @param {number} massRatio - Secondary mass over total mass
 * @returns {number} The libration period, same units as orbitalPeriod
 */
export function tadpolePeriod(orbitalPeriod, massRatio) {
  if (!(orbitalPeriod > 0) || !(massRatio > 0) || massRatio >= 1) return NaN;
  return orbitalPeriod / Math.sqrt((27 * massRatio * (1 - massRatio)) / 4);
}
