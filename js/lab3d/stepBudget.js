// =============================================================================
// A fixed step from an error budget (Prompt 273 addendum, RESONANCES_II.md)
// -----------------------------------------------------------------------------
// The first resonance gate committed its fixed steps by hand and they were too
// coarse: the energy drifted past its bound and a test particle's apse turned
// thirty times too fast. Here the step is derived from the error a measurement
// can afford. A short pilot at three steps measures the scheme's error and its
// growth; a fourth-order scaling carries that to the whole window; the step is
// the largest one whose predicted errors are a stated fraction of the budget.
// Pure: no DOM, no fetch.
// =============================================================================

import { energy, makeState, run } from './kernel.js';

/** The committed constants of the rule. */
export const STEP_BUDGET = Object.freeze({
  /** The pilot runs this many periods of the innermost body. */
  pilotPeriods: 50,
  /** ...starting from this many steps a period, then twice and four times that. */
  pilotStepsPerPeriod: 64,
  /** Predicted errors may use this fraction of each budget. */
  safety: 0.1,
  /** A budget that needs more steps a period than this is refused. */
  maxStepsPerPeriod: 4096,
  /** The scheme's order: errors scale as the step to this power. */
  order: 4,
});

const circDiff = (a, b) =>
  Math.abs(((((a - b + 180) % 360) + 360) % 360) - 180);

/**
 * The largest fixed step that keeps a run inside an error budget.
 *
 * `bodies` and `G` are a kernel state's; `innerPeriod` the innermost body's
 * period; `sampleInterval` the spacing of the samples the run will be read at
 * (the step divides it); `window` the length of the run. `energyBudget` bounds
 * the relative energy error. `angles(state)` returns the angles (degrees) whose
 * accumulated error over the window, weighted by `angleWeights` and summed,
 * `angleBudgetDeg` bounds. Returns state 'chosen' with the step, or
 * 'not-attainable' and no step.
 */
export function stepForBudget({
  bodies,
  G = 1,
  innerPeriod,
  sampleInterval,
  window,
  energyBudget,
  angles = null,
  angleWeights = [],
  angleBudgetDeg = null,
  scheme = 'yoshida4',
}) {
  const {
    pilotPeriods,
    pilotStepsPerPeriod,
    safety,
    maxStepsPerPeriod,
    order,
  } = STEP_BUDGET;
  const h0 = innerPeriod / pilotStepsPerPeriod;
  const tPilot = pilotPeriods * innerPeriod;
  const levels = [0, 1, 2].map(level => {
    const s = makeState(bodies, { G });
    const e0 = energy(s);
    // Read at every coarse step, not once a period: at the same orbital phase
    // the energy error of a closed orbit returns to almost nothing and hides.
    const per = 1 << level;
    let dE = 0;
    const track = [];
    for (let k = 0; k < pilotPeriods * pilotStepsPerPeriod; k++) {
      run(s, scheme, h0 / per, per);
      dE = Math.max(dE, Math.abs((energy(s) - e0) / e0));
      if (angles) track.push(angles(s));
    }
    return { dE, track };
  });
  const scale = 2 ** order;
  const energyAtH0 = Math.max(
    levels[0].dE,
    scale * levels[1].dE,
    scale * scale * levels[2].dE
  );
  const between = (p, q, i) =>
    p.track.reduce(
      (m, row, k) => Math.max(m, circDiff(row[i], q.track[k][i])),
      0
    );
  const rates = angles
    ? levels[0].track[0].map((_, i) => {
        const d1 = between(levels[0], levels[1], i);
        const d2 = between(levels[1], levels[2], i);
        return ((scale / (scale - 1)) * Math.max(d1, scale * d2)) / tPilot;
      })
    : [];
  const angleAtH0 = rates.reduce(
    (s, r, i) => s + (angleWeights[i] ?? 1) * r * window,
    0
  );
  const room = (budget, predicted) =>
    predicted > 0
      ? Math.pow((safety * budget) / predicted, 1 / order)
      : Infinity;
  const ratio = Math.min(
    1,
    room(energyBudget, energyAtH0),
    angleBudgetDeg === null ? Infinity : room(angleBudgetDeg, angleAtH0)
  );
  const pilot = {
    h0,
    periods: pilotPeriods,
    energy: levels.map(l => l.dE),
    energyAtH0,
    angleRatesDegPerTime: rates,
    angleAtH0Deg: angleAtH0,
  };
  const stepsPerSample = Math.ceil(sampleInterval / (h0 * ratio) - 1e-9);
  const h = sampleInterval / stepsPerSample;
  const stepsPerInnerPeriod = innerPeriod / h;
  if (!(ratio > 0) || !(stepsPerInnerPeriod <= maxStepsPerPeriod))
    return {
      state: 'not-attainable',
      h: null,
      stepsPerSample: null,
      stepsPerInnerPeriod: null,
      pilot,
    };
  const shrink = Math.pow(h / h0, order);
  return {
    state: 'chosen',
    h,
    stepsPerSample,
    stepsPerInnerPeriod,
    predicted: { energy: energyAtH0 * shrink, angleDeg: angleAtH0 * shrink },
    pilot,
  };
}
