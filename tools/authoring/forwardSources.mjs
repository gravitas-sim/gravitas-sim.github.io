// =============================================================================
// Lesson steps whose answer is a measurement of a forward-modelled system
// -----------------------------------------------------------------------------
// A step may declare a model state, an observing setup (gravitas.observing-
// setup/1) and a forward model (js/forward) as the source of its measurement:
// "what would a survey see of this system". The declaration lives here, not on
// the step, for the reason modelChecked.mjs gives: every lesson route is at its
// ceiling and nothing shipped needs to read it. tools/authoring/modelChecked.mjs
// spreads forwardModels() into MODELS, so the literal answer is proven against
// the synthetic observation's truth manifest by tests/
// modelCheckedExpectations.test.js, and forwardFindings() (run by author:check)
// refuses a declaration whose setup is invalid, whose model or truth id does not
// exist, or whose measurement of the observation does not reproduce the truth.
// Node only.
// =============================================================================

import { runForward } from '../../js/forward/index.js';
import { validateSetup } from '../../js/forward/setup.js';
import { EARTH_RADIUS_M, SOLAR_RADIUS_M } from '../../js/constants.js';

export const RULE_ID = 'instructor/forward-source';
const col = (o, id) => o.columns.find(c => c.id === id).values;

export const FORWARD_STEPS = {
  'transit-photometry/from-a-depth-to-a': {
    via: 'js/forward transit model: a synthetic, noise-free survey of a uniform-disk planet of radius ratio 0.1; the depth is measured at mid-transit and the radius ratio taken from it, graded against the truth manifest',
    model: 'transit',
    state: {
      star: {
        massSun: 1,
        radiusSun: 1,
        teffK: 5772,
        distancePc: 100,
        limb: { q1: 0, q2: 0 },
      },
      planets: [
        {
          id: 'b',
          massEarth: 100,
          radiusEarth: (0.1 * SOLAR_RADIUS_M) / EARTH_RADIUS_M,
          periodDays: 4,
          meanAnomalyDeg: 0,
        },
      ],
      geometry: { positionAngleDeg: 0, inclinationDeg: 90 },
    },
    setup: {
      format: 'gravitas.observing-setup',
      formatVersion: 1,
      seed: 'lesson-depth',
      epochs: { kind: 'listed', list: [0, 1, 2, 3] },
      noise: {},
      instrument: { kind: 'photometer' },
    },
    truth: 'k',
    // What the student does: read the depth off the dip, take its square root.
    measure: o => Math.sqrt(1 - Math.min(...col(o, 'value'))),
    // The depth is a 96-annulus quadrature: its own order of accuracy.
    measureTolerance: 2e-4,
  },
};

const observe = d => runForward(d.model, d.state, d.setup);
const truthOf = (o, id) =>
  o.synthetic.truth.parameters.find(p => p.id === id)?.value;

/** The FORWARD_STEPS as MODELS entries: the value is the truth's. */
export function forwardModels() {
  return Object.fromEntries(
    Object.entries(FORWARD_STEPS).map(([key, d]) => [
      key,
      { via: d.via, value: () => truthOf(observe(d), d.truth) },
    ])
  );
}

/** Everything wrong with the declarations, each with where it is. */
export function forwardFindings(steps = FORWARD_STEPS) {
  const out = [];
  for (const [key, d] of Object.entries(steps)) {
    const bad = message => out.push({ where: key.split('/')[0], key, message });
    const problems = validateSetup(d.setup);
    if (problems.length) {
      bad(
        `${key}: the declared setup is not valid: ${problems[0].path} ${problems[0].message}`
      );
      continue;
    }
    let o;
    try {
      o = observe(d);
    } catch (e) {
      bad(`${key}: the forward model refused the declaration: ${e.message}`);
      continue;
    }
    const truth = truthOf(o, d.truth);
    if (!Number.isFinite(truth)) {
      bad(`${key}: the truth manifest has no parameter "${d.truth}"`);
      continue;
    }
    if (d.measure) {
      const got = d.measure(o);
      if (!(Math.abs(got / truth - 1) <= d.measureTolerance))
        bad(
          `${key}: the measurement ${got} does not reproduce the truth ${truth} within ${d.measureTolerance}`
        );
    }
  }
  return out;
}
