// =============================================================================
// gravitas.experiment/1 with a 3-D model
// -----------------------------------------------------------------------------
// The experiment format (js/experiments/experimentManifest.js, EXPERIMENTS.md)
// names a 2-D scenario as its model. A 3-D experiment names this instead:
//
//   model: { kind: 'lab3d', api: '^1.0.0', system: <gravitas.system3d/1> }
//
// and keeps the rest of the format's shape, so the same scheduler
// (js/experiments/scheduler.js) runs it, trial by trial, each trial in a
// fresh Worker (./worker.js, message {type: 'trial'}):
//
//   seeds        each trial runs once per seed; a seed nudges every body by
//                `perturb` (./state.js perturb, + - * / only)
//   vary         one parameter over explicit values: 'integrator.h', or
//                'body:<id>.m', or 'body:<id>.speed' (a factor on its
//                velocity)
//   observables  energyDrift, angularMomentumDrift, momentumDrift;
//                minSeparation and maxEccentricity of a pair; escaped of a
//                body (1 if it escaped, else 0)
//   stop         the span and the number of samples
//   limits       concurrency, trialTimeoutMs, totalTimeoutMs, maxResultBytes
//
// The 2-D manifest validator refuses a 3-D manifest (it has no scenario),
// which is right: the two are run by different realms.
// =============================================================================

import { LAB3D_API } from './api.js';
import { gravityOf, perturb, validateSystem } from './state.js';
import { toElements } from './elements.js';
import { satisfies } from '../platform/semver.js';

export const METRICS3D = Object.freeze({
  energyDrift: 0,
  angularMomentumDrift: 0,
  momentumDrift: 0,
  minSeparation: 2,
  maxEccentricity: 2,
  escaped: 1,
});
const MAX_TRIALS = 400;
const MAX_VALUES = 40;
const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Every problem with a 3-D experiment, each as {path, message}. */
export function validateLab3dExperiment(m) {
  const out = [];
  const need = (ok, path, message) => ok || out.push({ path, message });
  if (!isObject(m)) return [{ path: '', message: 'is not an object' }];
  need(
    m.format === 'gravitas.experiment' && m.formatVersion === 1,
    'format',
    'a gravitas.experiment/1'
  );
  const model = m.model;
  need(isObject(model) && model.kind === 'lab3d', 'model.kind', "'lab3d'");
  if (!isObject(model)) return out;
  need(
    typeof model.api === 'string' && satisfies(LAB3D_API, model.api),
    'model.api',
    `a range this build's ${LAB3D_API} satisfies`
  );
  const problems = validateSystem(model.system);
  for (const p of problems)
    out.push({ path: `model.system.${p.path}`, message: p.message });
  if (problems.length) return out;
  const ids = new Set(model.system.bodies.map(b => b.id));
  need(
    Array.isArray(m.seeds) &&
      m.seeds.length >= 1 &&
      m.seeds.every(s => Number.isInteger(s) && s >= 0 && s <= 0xffffffff),
    'seeds',
    'a list of whole-number seeds'
  );
  if (m.perturb !== undefined)
    need(
      isObject(m.perturb) &&
        ['position', 'velocity'].every(
          k =>
            m.perturb[k] === undefined ||
            (Number.isFinite(m.perturb[k]) && m.perturb[k] >= 0)
        ),
      'perturb',
      'position and velocity offsets of zero or more'
    );
  if (m.vary !== undefined) {
    const v = m.vary;
    const param = v?.parameter;
    const bodyParam = /^body:([a-z0-9-]+)\.(m|speed)$/.exec(param || '');
    need(
      param === 'integrator.h' || (bodyParam && ids.has(bodyParam[1])),
      'vary.parameter',
      "'integrator.h', or 'body:<id>.m' or 'body:<id>.speed' for a body in the system"
    );
    need(
      param !== 'integrator.h' || model.system.integrator.scheme !== 'dopri5',
      'vary.parameter',
      'an adaptive scheme has no step to vary'
    );
    need(
      Array.isArray(v?.values) &&
        v.values.length >= 1 &&
        v.values.length <= MAX_VALUES &&
        v.values.every(x => Number.isFinite(x) && x > 0),
      'vary.values',
      `from 1 to ${MAX_VALUES} values greater than zero`
    );
  }
  const metrics = m.observables?.metrics;
  need(
    Array.isArray(metrics) && metrics.length >= 1,
    'observables.metrics',
    'at least one metric'
  );
  (metrics || []).forEach((q, i) => {
    const at = `observables.metrics[${i}]`;
    if (!isObject(q) || !Object.hasOwn(METRICS3D, q.id))
      return need(false, at, `one of ${Object.keys(METRICS3D).join(', ')}`);
    const arity = METRICS3D[q.id];
    need(
      arity === 0
        ? q.bodies === undefined
        : Array.isArray(q.bodies) &&
            q.bodies.length === arity &&
            q.bodies.every(b => ids.has(b)),
      `${at}.bodies`,
      arity === 0 ? 'no bodies' : `${arity} bodies of the system`
    );
  });
  need(
    isObject(m.stop) && Number.isFinite(m.stop.span) && m.stop.span > 0,
    'stop.span',
    'a span greater than zero'
  );
  need(
    m.stop?.escapeBeyond === undefined ||
      (Number.isFinite(m.stop.escapeBeyond) && m.stop.escapeBeyond > 0),
    'stop.escapeBeyond',
    'a distance greater than zero'
  );
  need(
    m.stop?.samples === undefined ||
      (Number.isInteger(m.stop.samples) &&
        m.stop.samples >= 1 &&
        m.stop.samples <= 5000),
    'stop.samples',
    'from 1 to 5000 samples'
  );
  const L = m.limits;
  need(
    isObject(L) &&
      Number.isInteger(L.concurrency) &&
      L.concurrency >= 1 &&
      L.concurrency <= 16 &&
      [L.trialTimeoutMs, L.totalTimeoutMs, L.maxResultBytes].every(
        x => Number.isFinite(x) && x > 0
      ),
    'limits',
    'concurrency, trialTimeoutMs, totalTimeoutMs and maxResultBytes'
  );
  const trials = (m.vary?.values?.length || 1) * (m.seeds?.length || 0);
  need(trials <= MAX_TRIALS, 'seeds', `at most ${MAX_TRIALS} trials in all`);
  return out;
}

/** Every trial, in order: each value, each seed. */
export function planLab3dTrials(m) {
  const values = m.vary ? m.vary.values : [null];
  const out = [];
  for (const value of values)
    for (const seed of m.seeds)
      out.push({
        index: out.length,
        params: m.vary ? { [m.vary.parameter]: value } : {},
        seed,
      });
  return out;
}

/** The system a trial runs: the parameter set, then the seed's nudge. */
export function trialSystem(m, trial) {
  let system = structuredCloneSafe(m.model.system);
  const [param, value] = Object.entries(trial.params)[0] || [];
  if (param === 'integrator.h')
    system.integrator = { ...system.integrator, h: value };
  else if (param) {
    const [, id, what] = /^body:([a-z0-9-]+)\.(m|speed)$/.exec(param);
    system.bodies = system.bodies.map(b =>
      b.id !== id
        ? b
        : what === 'm'
          ? { ...b, m: value }
          : { ...b, v: b.v.map(c => c * value) }
    );
  }
  if (m.perturb) system = perturb(system, trial.seed, m.perturb);
  return system;
}

const structuredCloneSafe = v => JSON.parse(JSON.stringify(v));
const metricKey = q => (q.bodies ? `${q.id}:${q.bodies.join(',')}` : q.id);

/**
 * One trial, from a run's result: the metrics, and each as a series over the
 * samples where it has one.
 */
export function trialResult(m, trial, system, result) {
  const index = new Map(system.bodies.map((b, i) => [b.id, i]));
  const results = {};
  const series = {};
  const kinds = {};
  const at = (x, i) => [x[3 * i], x[3 * i + 1], x[3 * i + 2]];
  for (const q of m.observables.metrics) {
    const key = metricKey(q);
    kinds[key] = q.id;
    const samples = result.samples;
    if (q.id === 'energyDrift') {
      results[key] = result.residuals.energy;
      series[key] = samples.map(s => s.energy);
    } else if (q.id === 'angularMomentumDrift') {
      results[key] = result.residuals.angularMomentum;
      series[key] = samples.map(s => s.angularMomentum);
    } else if (q.id === 'momentumDrift') {
      results[key] = result.residuals.momentum;
      series[key] = samples.map(s => s.momentum);
    } else if (q.id === 'minSeparation') {
      const [a, b] = q.bodies.map(id => index.get(id));
      series[key] = samples.map(s =>
        Math.hypot(...at(s.x, b).map((c, k) => c - at(s.x, a)[k]))
      );
      results[key] = series[key].length ? Math.min(...series[key]) : null;
    } else if (q.id === 'maxEccentricity') {
      const [a, b] = q.bodies.map(id => index.get(id));
      const mu = gravityOf(system) * (system.bodies[a].m + system.bodies[b].m);
      series[key] = samples.map(s => {
        const x = at(s.x, b).map((c, k) => c - at(s.x, a)[k]);
        const v = at(s.v, b).map((c, k) => c - at(s.v, a)[k]);
        return toElements(x, v, mu).e;
      });
      results[key] = series[key].length ? Math.max(...series[key]) : null;
    } else if (q.id === 'escaped') {
      const id = q.bodies[0];
      results[key] = result.events.some(
        e => e.kind === 'escape' && e.bodies[0] === id
      )
        ? 1
        : 0;
      series[key] = [];
    }
    if (!(results[key] === null || Number.isFinite(results[key])))
      results[key] = null;
  }
  return {
    index: trial.index,
    params: trial.params,
    seed: trial.seed,
    status:
      result.status === 'ok'
        ? 'ok'
        : result.status === 'notFinite'
          ? 'notFinite'
          : 'capped',
    results,
    kinds,
    series,
    events: result.events.slice(0, 200),
    warnings: result.warnings,
    steps: result.stats.steps,
    samples: result.samples.length,
    simTime: result.samples.at(-1)?.t ?? 0,
    wallMs: result.stats.wallMs,
    frames: 0,
    numerics: {
      integrator: system.integrator,
      units: system.units,
      evals: result.stats.evals,
    },
  };
}

/** The run options a trial uses. */
export const trialOptions = m => ({
  span: m.stop.span,
  samples: m.stop.samples ?? 200,
  positions: true,
  velocities: m.observables.metrics.some(q => q.id === 'maxEccentricity'),
  escapeBeyond: m.observables.metrics.some(q => q.id === 'escaped')
    ? (m.stop.escapeBeyond ?? 100)
    : undefined,
});

/** Whether a Worker's answer is this trial's result, for the scheduler. */
export function isLab3dTrialResult(r, trial) {
  if (!isObject(r) || r.index !== trial.index || r.seed !== trial.seed)
    return false;
  if (!['ok', 'notFinite', 'capped'].includes(r.status)) return false;
  if (!isObject(r.results) || !isObject(r.series)) return false;
  return Object.values(r.results).every(v => v === null || Number.isFinite(v));
}

/**
 * Run a 3-D experiment's trials with the scheduler, each in a fresh Worker.
 * @param {object} m - A validated 3-D experiment
 * @param {object} deps - createScheduler (js/experiments/scheduler.js) and spawn
 */
export function scheduleLab3d(
  m,
  { createScheduler, spawn, onTrial, onProgress }
) {
  const trials = planLab3dTrials(m);
  return createScheduler({
    manifest: { ...m, observables: { metrics: [] } },
    trials,
    spawn,
    concurrency: m.limits.concurrency,
    onTrial,
    onProgress,
    accept: isLab3dTrialResult,
    message: trial => ({ type: 'trial', manifest: m, trial }),
  });
}
