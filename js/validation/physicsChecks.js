// =============================================================================
// The scientific validation suite
// -----------------------------------------------------------------------------
// One registry of checks, consumed by two front ends: `npm run validate:physics`
// (tools/validate-physics.mjs, which prints a table) and jest
// (tests/physicsValidation.test.js, which fails a build). They run the same
// code, so the table a reviewer prints and the suite CI enforces cannot drift
// apart.
//
// What a check is
// -----------------------------------------------------------------------------
// A measured number, an expected number, a tolerance, and - the part that makes
// this a validation suite rather than a set of assertions - a written reason the
// tolerance is what it is. A tolerance with no justification is a number chosen
// to make a test pass, which is the opposite of the exercise.
//
// Five kinds of check, and they are not interchangeable:
//
//   analytic       Closed-form arithmetic against the equation it claims to
//                  implement. Tolerances are at or near machine epsilon,
//                  because there is nothing here for a tolerance to absorb.
//
//   integration    A quantity measured by actually running the N-body
//                  integrator. Tolerances are set by the discretization error
//                  of symplectic Euler at the stated timestep, and every one of
//                  them says which.
//
//   approximation  An educational model that is not the full physics. Validated
//                  against the equation it says it uses, never against reality,
//                  and labeled so nobody mistakes the two.
//
//   data           A stored parameter for a real system, checked against a
//                  published value with its source named.
//
// What this suite does not do
// -----------------------------------------------------------------------------
// It does not test rendering. Nothing here reads a pixel. Every check is a
// deterministic number-in, number-out computation, so a failure names a
// quantity rather than a screenshot.
//
// It also does not check things the model does not claim. Gravitas is Newtonian,
// two-dimensional and non-relativistic; scenarios containing a "Static" black
// hole deliberately break Newton's third law, because a fixed potential well is
// the pedagogical object. Those are recorded in PHYSICS_VALIDATION.md as
// documented departures, not silently omitted.
// =============================================================================

import { installDomShim } from './domShim.js';
import { makeLab, score } from './harness.js';

export { score, REF } from './harness.js';

// =============================================================================
// The checks
// =============================================================================

// The groups, in the order the report prints them. A new domain adds a file to
// js/validation/groups/ and a line here; nothing else in this module changes.
const GROUPS = [
  () => import('./groups/unit-system.js'),
  () => import('./groups/circular-two-body-orbit.js'),
  () => import('./groups/eccentric-kepler-orbit.js'),
  () => import('./groups/conservation-laws.js'),
  () => import('./groups/conservation-laws-2.js'),
  () => import('./groups/conservation-laws-3.js'),
  () => import('./groups/numerical-integrators.js'),
  () => import('./groups/reference-frames.js'),
  () => import('./groups/binary-stars.js'),
  () => import('./groups/escape-and-binding.js'),
  () => import('./groups/reference-frames-2.js'),
  () => import('./groups/observer-geometry.js'),
  () => import('./groups/radial-velocity.js'),
  () => import('./groups/astrometry.js'),
  () => import('./groups/habitable-zone.js'),
  () => import('./groups/dark-matter.js'),
  () => import('./groups/mond.js'),
  () => import('./groups/compact-objects.js'),
  () => import('./groups/mergers.js'),
  () => import('./groups/absorption.js'),
  () => import('./groups/tidal-disruption.js'),
  () => import('./groups/three-body-sensitivity.js'),
  () => import('./groups/inspiral-approximation.js'),
  () => import('./groups/real-systems.js'),
  () => import('./groups/orbital-resonance.js'),
  () => import('./groups/planets-in-binary-stars.js'),
  () => import('./groups/gravity-assist.js'),
  () => import('./groups/sonification-law.js'),
  () => import('./groups/observing-windows.js'),
  () => import('./groups/radiation-and-photometry.js'),
  () => import('./groups/barnes-hut-gravity.js'),
  () => import('./groups/collision-outcomes.js'),
  () => import('./groups/long-term-regression.js'),
  () => import('./groups/atmospheres.js'),
  () => import('./groups/interiors.js'),
];

/**
 * Build and run every check.
 *
 * @returns {Promise<Array<object>>} Scored check records, in group order
 */
export async function runChecks() {
  installDomShim();

  const [
    constants,
    physics,
    units,
    orbital,
    darkMatter,
    habitability,
    observables,
    blackHole,
    observer,
    frames,
    energyWidgets,
    binaryWidgets,
    transitWidgets,
    trappist,
    exoSystems,
    dmWidgets,
    chaos,
    resonance,
    systems,
    mond,
    binaryOrbits,
    binaryStability,
    gravityAssist,
    sonifyLaw,
    sky,
  ] = await Promise.all([
    import('../constants.js'),
    import('../physics.js'),
    import('../units.js'),
    import('../orbital.js'),
    import('../darkMatter.js'),
    import('../habitability.js'),
    import('../exoplanetObservables.js'),
    import('../blackHolePhysics.js'),
    import('../observerGeometry.js'),
    import('../referenceFrame.js'),
    import('../energyWidgets.js'),
    import('../binaryWidgets.js'),
    import('../transitWidgets.js'),
    import('../data/trappist1.js'),
    import('../data/exoplanetSystems.js'),
    import('../darkMatterWidgets.js'),
    import('../chaos/divergence.js'),
    import('../resonance/elements.js'),
    import('../resonance/systems.js'),
    import('../mond.js'),
    import('../binaryOrbits.js'),
    import('../binaryStability.js'),
    import('../gravityAssist.js'),
    import('../sonify/law.js'),
    import('../observingWindow.js'),
  ]);

  const out = [];
  const add = spec => out.push(score(spec));
  const lab = makeLab(physics);
  const ctx = {
    constants,
    physics,
    units,
    orbital,
    darkMatter,
    habitability,
    observables,
    blackHole,
    observer,
    frames,
    energyWidgets,
    binaryWidgets,
    transitWidgets,
    trappist,
    exoSystems,
    dmWidgets,
    chaos,
    resonance,
    systems,
    mond,
    binaryOrbits,
    binaryStability,
    gravityAssist,
    sonifyLaw,
    sky,
    add,
    lab,
    out,
  };
  for (const load of GROUPS) await (await load()).default(ctx);

  return out;
}

/**
 * Group the flat result list, preserving first-seen order.
 * @param {Array<object>} results - From runChecks
 * @returns {Array<{group: string, checks: Array<object>}>} Grouped
 */
export { KIND_LABEL, KIND_SHORT, KIND_ORDER } from '../physicsKinds.js';

export function groupResults(results) {
  const order = [];
  const map = new Map();
  for (const r of results) {
    if (!map.has(r.group)) {
      map.set(r.group, []);
      order.push(r.group);
    }
    map.get(r.group).push(r);
  }
  return order.map(group => ({ group, checks: map.get(group) }));
}
