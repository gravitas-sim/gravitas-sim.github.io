// Shared by the forward models: read a setup or refuse it in words, and put a
// time series together the same way each time.
import {
  applyNoise,
  normalizeSetup,
  planEpochs,
  validateSetup,
} from '../setup.js';
import { syntheticObservation, valueColumns } from '../observation.js';

export const SECONDS_PER_DAY = 86400;

/** Throw with every problem named, so a caller can show them. */
export function requireSetup(setup, kinds) {
  const problems = validateSetup(setup);
  if (problems.length)
    throw new Error(
      `the observing setup is not valid: ${problems
        .map(p => `${p.path || 'setup'} ${p.message}`)
        .join('; ')}`
    );
  if (kinds && !kinds.includes(setup.instrument.kind))
    throw new Error(
      `this model is observed with ${kinds.join(' or ')}, not ${setup.instrument.kind}`
    );
  return normalizeSetup(setup);
}

/** Epoch times in days, or throw when the setup's epochs are not in days. */
export function epochsInDays(setup) {
  if (setup.epochs.unit !== 'd')
    throw new Error('this model reads epochs in days');
  const plan = planEpochs(setup);
  if (!plan.times.length)
    throw new Error(
      `the setup observes at no epochs${
        plan.plan.problems?.length ? ` (${plan.plan.problems[0].id})` : ''
      }`
    );
  return plan;
}

/**
 * A one-quantity time series: the model values, the setup's noise on top, and
 * the observation around them.
 */
export function timeSeries({
  model,
  version,
  setup,
  title,
  plan,
  clean,
  quantity,
  unit,
  truth,
  object = null,
  notes = [],
}) {
  const noisy = applyNoise(clean, plan.times, plan.indices, setup);
  const columns = [
    {
      id: 'time',
      name: 'Time since the start of the run',
      unit: 'd',
      role: 'x',
      values: plan.times,
    },
    ...valueColumns('value', quantity, unit, noisy.values, noisy.sigma),
  ];
  return syntheticObservation({
    model,
    version,
    setup,
    kind: 'time-series',
    title,
    columns,
    axes: { x: 'time', y: 'value' },
    truth: { ...truth, injected: noisy.injected, notes },
    extra: {
      time: { column: 'time', format: 'relative', scale: 'unknown' },
      object,
    },
  });
}
