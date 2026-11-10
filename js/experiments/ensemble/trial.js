// One trial of an ensemble experiment, in whatever realm calls it: the pool's
// Worker (./worker.js), a serial loop in the page or in Node (./run.js), or a test.
// The answer is the trial's row (./record.js trialRow): its status, its outcome class
// and its quantities as a gravitas.artifact envelope. It is a function of the record
// and the job's own stream, so where it runs and in what order cannot change it.

import { stream } from '../../random/streams.js';
import { buildScenario, runTrial } from '../trialRunner.js';
import { METRIC_UNITS } from '../metrics.js';
import { KINDS, plainTrial, threeBodyTrial } from './kinds.js';
import { trialRow } from './record.js';

/** The engine's modules in this realm, loaded once (what the experiment Worker imports). */
let realmPromise = null;
export const loadRealm = () =>
  (realmPromise ??= Promise.all([
    import('../../physics.js'),
    import('../../world/build.js'),
    import('../../scenarios.js'),
    import('../../appState.js'),
    import('../../rng.js'),
    import('../../timestep.js'),
    import('../../units.js'),
  ]).then(([physics, build, scenarios, appState, rng, timestep, units]) => ({
    physics,
    build,
    scenarios,
    appState,
    rng,
    timestep,
    units,
  })));

/** The unit ids of the bench's metrics that the registry spells differently. */
const UNIT_ID = Object.freeze({ days: 'd' });

function sweepOutcome(manifest, r) {
  const quantities = [];
  for (const id of manifest.observables.metrics) {
    const v = r.results?.[id];
    if (Number.isFinite(v)) {
      const unit = METRIC_UNITS[id] || null;
      quantities.push({
        id,
        value: v,
        unit: UNIT_ID[unit] ?? unit,
        origin: 'synthetic',
      });
    }
  }
  return {
    status: r.status,
    quantities,
    ...(r.error ? { error: r.error } : {}),
  };
}

/**
 * Run one job of a record.
 * @param {object} manifest - A validated gravitas.experiment/2 record
 * @param {{index: number, trial?: object, stream?: {id: string, seed: string, labels: Array}}} job
 *   `stream.labels` ends with the trial's index, as the pool hands it over
 * @param {{realm?: object, now?: Function}} [o] - The engine's modules, when this
 *   realm already holds them
 * @returns {Promise<object>} The trial's row
 */
export async function runJob(manifest, job, { realm, now } = {}) {
  const e = manifest.ensemble;
  const started = now?.();
  let outcome;
  if (e.kind === 'sweep') {
    outcome = sweepOutcome(
      manifest,
      runTrial(realm ?? (await loadRealm()), manifest, job.trial)
    );
  } else {
    const s = job.stream;
    const draw = stream(s.id, s.seed, ...s.labels);
    outcome =
      KINDS[e.kind].needsEngine(e) && e.kind === 'ensemble'
        ? threeBodyTrial(
            realm ?? (await loadRealm()),
            buildScenario,
            e.config,
            draw,
            e.config.physics === 'validation-lab'
              ? (await import('../../validation/harness.js')).applyLabSettings
              : undefined
          )
        : await plainTrial(e, draw);
  }
  const row = trialRow(manifest, job.index, outcome);
  if (started !== undefined) row.wallMs = Math.round(now() - started);
  return row;
}
