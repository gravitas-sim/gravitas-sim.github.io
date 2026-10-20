// =============================================================================
// Tolerances for the engine's validation debt (Prompt 137), committed first
// -----------------------------------------------------------------------------
// This file was committed before any of the checks that use it existed or ran,
// so none of these numbers can have been chosen to make a measurement pass. Each
// is derived from the method's literature or from arithmetic, and says which. A
// check that fails against one of them is a finding for DECISION_REGISTER.md;
// the tolerance stays.
// =============================================================================

/** The Barnes-Hut tree, as the Worker implements it: monopole cells, 2-D. */
export const BARNES_HUT = Object.freeze({
  /**
   * The application's opening angle (barnes_hut_theta in js/appState.js).
   */
  theta: 0.4,
  /**
   * Mean relative force error at that angle, against the direct sum.
   *
   * Barnes & Hut (1986, Nature 324, 446) and Hernquist (1987, ApJS 64, 715)
   * report percent-level force errors for a monopole tree at theta near 1;
   * the error falls steeply as theta falls, so one percent at 0.4 is a ceiling
   * the method is known to sit well under, not a measured expectation.
   */
  meanForceError: 1e-2,
  /**
   * Worst single-body relative force error. A bound, not a claim: the error of
   * a monopole tree has a heavy tail (Salmon & Warren 1994, J. Comput. Phys.
   * 111, 136), concentrated in bodies near a cell boundary where the
   * acceleration is small by cancellation. Ten percent is the largest error the
   * literature treats as ordinary for any one body of a monopole tree.
   */
  maxForceError: 0.1,
  /**
   * Opening angle zero opens every cell, so the tree is the direct sum and
   * differs from it only by the Worker's single-precision positions and
   * outputs. Float32 carries 6e-8 relative; positions of a few hundred units
   * against separations of tens turn that into a few parts in 1e6 of force.
   * 1e-4 is two orders of margin over that arithmetic, no more.
   */
  zeroThetaError: 1e-4,
  /**
   * Net force on a closed system: the tree is not reciprocal (a cell pulls a
   * body that the body does not pull back with the same term), so the sum of
   * m*a does not vanish as it does for the direct sum. Springel (2005, MNRAS
   * 364, 1105) accepts error tolerances of 0.005 to 0.01 for this reason; the
   * net force, as a fraction of the sum of the force magnitudes, is bounded by
   * the same one percent.
   */
  netForceFraction: 1e-2,
  /**
   * Energy drift of a fixed number of steps of one integrator driven by the
   * tree, and its difference from the same run driven by the direct sum. One
   * percent, the same tolerance as the force error that causes it (Springel
   * 2005 reports tree-force energy errors of that order as the norm).
   */
  energyDrift: 1e-2,
});

/** Mass and momentum across the engine's outcomes. */
export const OUTCOMES = Object.freeze({
  /**
   * A perfectly inelastic merge, a replacement in place or an accretion with a
   * mass-weighted velocity conserves both exactly (PHYSICS_VALIDATION.md,
   * Mergers and Absorption). What remains is double-precision round-off over a
   * handful of operations: a few ulp, so a part in 1e12 of the total.
   */
  exact: 1e-12,
  /**
   * The sum of a group of products and quotients carried through one step of
   * the integrator before the handler runs (a few operations at 1e-16 each,
   * and a collision test that fires only after the bodies have moved); a part
   * in 1e9 covers the step's own motion of the momentum, which is zero for a
   * closed pair, and no more.
   */
  throughStep: 1e-9,
  /**
   * A star absorbing a planet, a gas giant or an asteroid (D-R10-23): the
   * largest momentum error, and the largest centre-of-mass error, as a
   * fraction of the scale S = sum of |m q| over the two bodies, where q is the
   * velocity (for momentum) or the position (for the centre of mass).
   *
   * The scale is the sum of magnitudes, not the net, on purpose. The net can be
   * near zero when the two velocities oppose, and the same round-off would then
   * look like a large fraction of nothing.
   *
   * The merged state is q' = (m1 q1 + m2 q2) / (m1 + m2), and what the system
   * holds afterwards is (m1 + m2) q'. That is two products, a sum, a quotient
   * and a product, and the mass sum, so six roundings of at most 1.1e-16 each
   * (half an ulp of a double): a worst case of 7e-16 S, and a few times that
   * once the check adds the two sides up itself. A part in 1e12 of S is three
   * orders of margin over that arithmetic and no more, the figure `exact`
   * already uses for the same operations.
   *
   * It is also far finer than the effect it has to see. A star that keeps its
   * own velocity drops m2 |v2 - v1|, which is m2 / (m1 + m2) of S at the
   * largest: 1e-10 for a Ceres-mass asteroid (4.7e-7 units on a star of 4000),
   * 7e-6 for a thirty-Earth-mass planet and 5e-4 for a two-Jupiter-mass giant.
   * The asteroid is the smallest of the three, and it still sits two orders
   * above this tolerance.
   */
  momentumScale: 1e-12,
});

/**
 * Long-term statistics, a regression check and nothing else. The bounds are
 * set from the first measurement with a stated margin and say so in the check;
 * they pin the engine's behaviour so a change that alters it is seen, and
 * claim nothing about relaxation, ejection rates or any physical statistic.
 */
export const REGRESSION = Object.freeze({
  /** Seeds in the sample. */
  seeds: 50,
  /** The margin over the measured median and 90th percentile. */
  margin: 1.25,
});
