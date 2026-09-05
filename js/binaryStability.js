// =============================================================================
// Planets in binaries: what happened, and whether we can believe it
// -----------------------------------------------------------------------------
// Two questions a student asks of a run like this, and they are not the same
// question:
//
//   What did the planet do?      stayed, hit something, or left
//   Can I trust that?            or did the integrator invent it
//
// Keeping them apart is most of the point of this file. A planet that "was
// ejected" from a run whose energy drifted by twenty per cent was not ejected
// by the binary; it was ejected by the timestep. Reporting the first without
// the second teaches students to read numerical artefacts as physics, which is
// the specific failure this whole investigation is written against.
//
// The other thing this file is careful about is the word *stable*. Nothing here
// says a configuration is stable. A run says a planet "survived this
// integration", for a stated number of binary periods, and that is a different
// and much smaller claim: instability in these systems is often slow, and a
// planet can circulate quietly for hundreds of periods before a resonance walks
// its eccentricity up and throws it out.
//
// Pure and dependency-free, so the classifications can be tested against known
// configurations without a simulation attached.
// =============================================================================

/** What became of the planet. */
export const OUTCOME = Object.freeze({
  SURVIVED: 'survived',
  EJECTED: 'ejected',
  COLLIDED: 'collided',
  /** The run stopped being trustworthy before it stopped being interesting. */
  UNRELIABLE: 'unreliable',
  /** Still going. */
  RUNNING: 'running',
});

/**
 * How far, in units of the binary separation, counts as gone.
 *
 * Being unbound is not enough on its own: a planet can have positive energy for
 * part of an encounter and come back. Requiring distance as well as energy
 * means "ejected" describes something that actually left.
 */
export const EJECTION_RADIUS = 10;

/** Closer than this to a star, in units of the binary separation, is an encounter. */
export const ENCOUNTER_RADIUS = 0.1;

/**
 * How much energy drift makes a run untrustworthy.
 *
 * A fraction of the initial total energy. The number was not chosen; it was
 * measured. Running the shipped configurations at three timesteps each:
 *
 *   quiet, no close approach     drift 1e-6 and below, same answer at every step
 *   clean ejection               drift 1e-5 to 4e-4, same answer at every step
 *   ejection at a grazing pass   drift 9e-3, and the answer FLIPS at half the step
 *
 * 1e-3 sits in the gap. Everything above it in that sample gave an outcome that
 * did not survive halving the step.
 *
 * It is a screen, not a certificate, and the difference matters enough to say
 * twice. A run can conserve energy beautifully and still be wrong: energy is
 * one number, and a three-body encounter can be resolved badly in every way
 * that does not happen to show up in it. The only real test of an outcome is
 * whether it stays the same when the step is halved, which is what
 * convergenceVerdict() below is for.
 */
export const ENERGY_DRIFT_LIMIT = 1e-3;

/**
 * The Holman & Wiegert (1999) critical semi-major axis for a planet orbiting
 * ONE star of a binary (an S-type, or circumstellar, orbit).
 *
 * Source
 * -----------------------------------------------------------------------------
 * Holman, M. J. & Wiegert, P. A. 1999, AJ, 117, 621, "Long-Term Stability of
 * Planets in Binary Systems", equation (1) and Table 3.
 *
 *   a_c/a_b = 0.464 - 0.380 mu - 0.631 e + 0.586 mu e + 0.150 e^2 - 0.198 mu e^2
 *
 * with mu = m2/(m1+m2) the mass fraction of the *companion*, and e the binary's
 * eccentricity. Inside a_c a test particle survived their integrations; outside
 * it, it did not.
 *
 * What the fit assumes, all of which this investigation also does
 * -----------------------------------------------------------------------------
 *   - the planet is a test particle: massless, and it does not perturb the stars
 *   - coplanar and prograde with the binary
 *   - the planet starts on a circular orbit
 *   - survival means surviving 10^4 binary periods, not for ever
 *
 * and the range the fit was made over, outside which it is extrapolation:
 *
 *   - 0.1 <= mu <= 0.9
 *   - 0.0 <= e  <= 0.8
 *
 * The published coefficient uncertainties give roughly +/-0.02 a_b on a_c, and
 * the paper notes islands of instability inside the boundary and of stability
 * outside it - it is a fit to where the transition mostly is, not a wall.
 *
 * @param {number} mu - Companion mass fraction m2/(m1+m2)
 * @param {number} e - Binary eccentricity
 * @returns {?{a: number, uncertainty: number, inRange: boolean}} a_c in units of
 *   the binary semi-major axis, or null if the inputs are not numbers
 */
export function criticalSemiMajorSType(mu, e) {
  if (!Number.isFinite(mu) || !Number.isFinite(e)) return null;
  const a =
    0.464 -
    0.38 * mu -
    0.631 * e +
    0.586 * mu * e +
    0.15 * e * e -
    0.198 * mu * e * e;
  return {
    a,
    uncertainty: 0.02,
    inRange: mu >= 0.1 && mu <= 0.9 && e >= 0 && e <= 0.8,
  };
}

/**
 * The same paper's boundary for a planet orbiting BOTH stars (a P-type, or
 * circumbinary, orbit). Equation (3) and Table 7.
 *
 *   a_c/a_b = 1.60 + 5.10 e - 2.22 e^2 + 4.12 mu - 4.27 e mu - 5.09 mu^2
 *             + 4.61 e^2 mu^2
 *
 * Here the boundary is a floor rather than a ceiling: *outside* a_c the planet
 * survived, inside it did not. Same assumptions as above, over 0.1 <= mu <= 0.9
 * and 0.0 <= e <= 0.7.
 *
 * @param {number} mu - Companion mass fraction m2/(m1+m2)
 * @param {number} e - Binary eccentricity
 * @returns {?{a: number, uncertainty: number, inRange: boolean}} a_c in units of
 *   the binary semi-major axis, or null if the inputs are not numbers
 */
export function criticalSemiMajorPType(mu, e) {
  if (!Number.isFinite(mu) || !Number.isFinite(e)) return null;
  const a =
    1.6 +
    5.1 * e -
    2.22 * e * e +
    4.12 * mu -
    4.27 * e * mu -
    5.09 * mu * mu +
    4.61 * e * e * mu * mu;
  return {
    a,
    uncertainty: 0.04,
    inRange: mu >= 0.1 && mu <= 0.9 && e >= 0 && e <= 0.7,
  };
}

/**
 * Where a given orbit sits relative to the published boundary.
 *
 * Deliberately returns a band rather than a verdict. Inside the fit's own
 * uncertainty the honest answer is "this is close to the boundary and the fit
 * cannot tell you", and a lesson that rounded that to yes-or-no would be
 * claiming more than the paper does.
 *
 * @param {string} mode - 'circumstellar' | 'circumbinary'
 * @param {number} aPlanet - Planet semi-major axis, in binary separations
 * @param {number} mu - Companion mass fraction
 * @param {number} e - Binary eccentricity
 * @returns {?{critical: number, side: string, inRange: boolean, uncertainty: number}}
 */
export function boundaryVerdict(mode, aPlanet, mu, e) {
  const fit =
    mode === 'circumbinary'
      ? criticalSemiMajorPType(mu, e)
      : criticalSemiMajorSType(mu, e);
  if (!fit || !Number.isFinite(aPlanet)) return null;

  const inner =
    mode === 'circumbinary' ? 'expectedDisrupted' : 'expectedSurvive';
  const outer =
    mode === 'circumbinary' ? 'expectedSurvive' : 'expectedDisrupted';

  let side;
  if (Math.abs(aPlanet - fit.a) <= fit.uncertainty) side = 'tooCloseToCall';
  else side = aPlanet < fit.a ? inner : outer;

  return {
    critical: fit.a,
    side,
    inRange: fit.inRange,
    uncertainty: fit.uncertainty,
  };
}

/**
 * Classify a run from what was recorded of it.
 *
 * The order matters and is the point of the function. A run whose energy has
 * stopped being conserved is *unreliable* whatever else happened in it, because
 * "the planet left" and "the integrator lost it" look identical from the
 * outside and only one of them is physics.
 *
 * @param {object} run - What the watcher recorded
 * @param {boolean} run.alive - Whether the planet is still in the simulation
 * @param {boolean} run.merged - Whether it was absorbed by a star
 * @param {number} run.maxDistance - Furthest from the system, in binary separations
 * @param {boolean} run.unbound - Whether its energy relative to the system is positive
 * @param {number} run.energyDrift - |dE/E0| over the run
 * @param {number} run.periodsDone - Binary periods integrated
 * @param {number} run.periodsAsked - Binary periods requested
 * @returns {{outcome: string, trustworthy: boolean, reason: ?string}} The verdict
 */
export function classifyRun(run) {
  const drift = Math.abs(Number(run?.energyDrift) || 0);
  const trustworthy = drift <= ENERGY_DRIFT_LIMIT;

  // Numerical failure first, and it is not an outcome about the planet.
  if (!trustworthy) {
    return {
      outcome: OUTCOME.UNRELIABLE,
      trustworthy: false,
      reason: 'energyDrift',
    };
  }

  // A merger is a merger whatever else was going on: the planet is gone and
  // there is a star that is now slightly heavier.
  if (run?.merged) {
    return { outcome: OUTCOME.COLLIDED, trustworthy: true, reason: null };
  }

  if (!run?.alive) {
    // Removed from the simulation without a recorded merge - absorbed at a
    // boundary, or culled. Not something to draw a physical conclusion from.
    return {
      outcome: OUTCOME.UNRELIABLE,
      trustworthy: false,
      reason: 'vanished',
    };
  }

  if (run.unbound && Number(run.maxDistance) >= EJECTION_RADIUS) {
    return { outcome: OUTCOME.EJECTED, trustworthy: true, reason: null };
  }

  if (Number(run.periodsDone) < Number(run.periodsAsked)) {
    return { outcome: OUTCOME.RUNNING, trustworthy: true, reason: null };
  }

  return { outcome: OUTCOME.SURVIVED, trustworthy: true, reason: null };
}

/**
 * Whether two runs of the same configuration at different timesteps agree.
 *
 * This is the check that actually licenses a claim, and it is worth being
 * explicit about why the cheaper one does not. Halving the step and rerunning
 * asks the only question that matters - "is this an answer about the system, or
 * about the arithmetic?" - and a configuration whose fate changes between the
 * two has not been measured at either step.
 *
 * Agreement is on the outcome, not on the numbers. Two runs of a chaotic system
 * at different steps will diverge in position almost immediately and will not
 * agree on *when* a planet left; that is expected and is not a failure. What
 * they must agree on is whether it left at all.
 *
 * @param {object} coarse - classifyRun() of the run at the larger step
 * @param {object} fine - classifyRun() of the run at the smaller step
 * @returns {{converged: boolean, outcome: ?string, reason: ?string}} The verdict
 */
export function convergenceVerdict(coarse, fine) {
  if (!coarse?.trustworthy || !fine?.trustworthy) {
    return { converged: false, outcome: null, reason: 'unreliableRun' };
  }
  if (coarse.outcome !== fine.outcome) {
    return { converged: false, outcome: null, reason: 'outcomeChanged' };
  }
  if (coarse.outcome === OUTCOME.RUNNING) {
    return { converged: false, outcome: null, reason: 'notFinished' };
  }
  return { converged: true, outcome: fine.outcome, reason: null };
}

/**
 * The sentence a result should be reported as.
 *
 * Returns a key rather than prose so both languages say the same careful thing.
 * There is no key for "stable", and that is deliberate: the strongest claim a
 * finite integration supports is that nothing had gone wrong yet by the end of
 * it.
 *
 * @param {object} verdict - From classifyRun
 * @param {number} periods - Binary periods integrated
 * @returns {{key: string, periods: number}} What to say
 */
export function outcomeMessage(verdict, periods) {
  return { key: `binary.outcome.${verdict.outcome}`, periods };
}
