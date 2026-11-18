// =============================================================================
// What a step may declare as a figure drawn from the model
// -----------------------------------------------------------------------------
// `step.figure = { from, params, unit?, withhold? }` is the second form of
// `step.figure` (the first is a photograph, with `src`). `from` names a figure
// in js/lessonFigures.js, which loads only when a step declares one; the list
// is here so the drawing and the authoring rule (tools/authoring/figureRules.mjs,
// `ref/figure`, run by `npm run author:check`) share it and cannot drift.
//
// `params` are either the lesson's own constants or a recorded state:
//   orbit    {a, e, omegaDeg?}                  semi-major axis, eccentricity
//            {scenarioId, state:{G, primary, body, mutual?}}
//   transit  {k, b}                             radius ratio, impact parameter
//            {scenarioId, state:{star, planet, observer}}
// `state` is what the integrator holds at one moment: positions and velocities
// of the two bodies and the G in force (an orbit), the bodies' positions and
// radii and the observer's two angles (a transit). `scenarioId` names the
// scenario it was recorded from.
//
// `withhold` lists quantities the figure's words leave out, for a step whose
// task is to find one of them; the drawing itself cannot hide a shape.
// =============================================================================

const finite = v => Number.isFinite(v);

/** The numbers a recorded body carries. */
const BODY = {
  orbit: ['x', 'y', 'vx', 'vy', 'm'],
  disc: ['x', 'y', 'r'],
};

/** Each figure: its quantities, its constants with their domains, its state parts. */
export const FIGURES = Object.freeze({
  orbit: {
    quantities: ['a', 'e', 'periapsis', 'apoapsis', 'focalSeparation'],
    constants: { a: v => v > 0, e: v => v >= 0 && v < 1, omegaDeg: finite },
    required: ['a', 'e'],
    state: { primary: BODY.orbit, body: BODY.orbit },
  },
  transit: {
    quantities: ['k', 'b', 'contactLength', 'innerLength'],
    constants: { k: v => v > 0 && v <= 1, b: (v, p) => v >= 0 && v < 1 + p.k },
    required: ['k', 'b'],
    state: {
      star: BODY.disc,
      planet: BODY.disc,
      observer: ['phiDeg', 'incDeg'],
    },
  },
});
