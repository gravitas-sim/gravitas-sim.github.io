// =============================================================================
// The figures a step may declare, drawn from the model
// -----------------------------------------------------------------------------
// `step.figure = { from, params, unit?, withhold? }` is the second form of
// `step.figure` (the first is a photograph, with `src`). `from` names a figure
// in js/lessonFigures.js, which loads only when a step declares one. The
// declaration's checks (`ref/figure`, run by `npm run author:check`) are in
// tools/authoring/figureRules.mjs, so none of their sentences ship.
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
// task is to find one of them. Any two of a figure's numbers fix the rest
// (`basis`), so a figure with a withhold names at most one of them; the drawing
// itself cannot hide a shape.
// =============================================================================

export const FIGURES = Object.freeze({
  orbit: {
    quantities: ['a', 'e', 'periapsis', 'apoapsis', 'focalSeparation'],
    basis: ['a', 'e'],
  },
  transit: {
    quantities: ['k', 'b', 'contactLength', 'innerLength'],
    basis: ['k', 'b'],
  },
});
