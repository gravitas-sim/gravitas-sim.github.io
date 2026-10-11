// Prototype (spike): the sampler's view of the inference core. A target is the
// core's own likelihood, createProblem(...).evaluate(theta).chi2 with the
// linear parameters solved exactly, plus the priors the manifest declares:
// uniform on the bounds by default, or { type: 'normal', mean, sd }.

import { createProblem } from '../../js/inference/fit.js';
import { MODELS } from '../../js/inference/models.js';

const { Math, Float64Array } = globalThis;

/**
 * @param {{model: {id: string}, parameters: object[], settings?: object}} request
 *   parameters: every model parameter { name, mode, value, lo, hi, prior? }
 * @param {object} data - dataFrom() or syntheticTransit()'s shape
 */
export function coreTarget(request, data) {
  const model = MODELS[request.model.id];
  const problem = createProblem(
    model,
    data,
    request.parameters,
    request.settings || {}
  );
  const free = problem.free;
  const ki = free.findIndex(p => p.name === 'k');
  const bi = free.findIndex(p => p.name === 'b');
  const logProb = theta => {
    let lp = 0;
    for (let i = 0; i < free.length; i++) {
      const p = free[i];
      const v = theta[i];
      if (!(v >= p.lo && v <= p.hi)) return -Infinity;
      if (p.prior?.type === 'normal')
        lp -= 0.5 * ((v - p.prior.mean) / p.prior.sd) ** 2;
    }
    // A transit with b past 1 + k never touches the star (the model's own rule).
    if (bi >= 0 && ki >= 0 && !(theta[bi] < 1 + theta[ki])) return -Infinity;
    const chi2 = problem.evaluate(Float64Array.from(theta)).chi2;
    return Number.isFinite(chi2) ? lp - 0.5 * chi2 : -Infinity;
  };
  return {
    problem,
    names: free.map(p => p.name),
    d: free.length,
    lo: free.map(p => p.lo),
    hi: free.map(p => p.hi),
    logProb,
  };
}
