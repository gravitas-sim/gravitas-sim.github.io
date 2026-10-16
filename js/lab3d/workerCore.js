// =============================================================================
// The 3-D kernel Worker's message handling (./worker.js)
// -----------------------------------------------------------------------------
// Separate from the Worker's global scope so that one implementation serves
// the Worker and the tests. The protocol, versioned by ./api.js LAB3D_API:
//
//   page -> worker   {type: 'hello'}
//                    {type: 'run', id, system, options}
//                    {type: 'cancel', id}
//                    {type: 'trial', manifest, trial}  (the scheduler's)
//                    {type: 'reference', id, problem, integrator?}
//                    -> {type: 'result', id, result, checks}
//                    {type: 'bench', bodies: [n...], ms}
//                    -> {type: 'bench', results: {'scheme/n': steps per s}}
//                    {type: 'live', id, system, options}   (API 1.1)
//                    {type: 'live-advance', id, intervals}
//                    {type: 'live-stop', id}
//                    -> {type: 'snapshot', id, snapshot} (./snapshot.js)
//   worker -> page   {type: 'hello', api}
//                    {type: 'progress', id, fraction}
//                    {type: 'result', id, result}
//                    {type: 'refused', id, problems}
//                    {type: 'error', id, message}
//
// A run advances in slices of about 30 ms and yields between them, so a
// cancel message is read within a slice. Terminating the Worker ends a run
// at once, and is what the scheduler does to a trial past its time limit.
// =============================================================================

import { LAB3D_API } from './api.js';
import { createRun, runProblems, runToEnd } from './engine.js';
import { REFERENCES, passes } from './references.js';
import { EVALS_PER_STEP, makeState, run } from './kernel.js';
import { fromElements } from './elements.js';
import { migrateSystem } from './state.js';
import { trialOptions, trialResult, trialSystem } from './experiment.js';
import { createLive } from './live.js';

const runs = new Map();
const live = new Map();

/** A snapshot's arrays, handed over rather than copied. */
const transfer = snap => [
  snap.m.buffer,
  snap.radius.buffer,
  snap.x.buffer,
  snap.v.buffer,
  snap.alive.buffer,
  snap.trail.buffer,
  snap.trailT.buffer,
];

/** At most `max` samples, evenly spread, the first and last kept: for plotting. */
function thin(samples, max = 1500) {
  if (samples.length <= max) return samples;
  const out = [];
  for (let k = 0; k < max; k++)
    out.push(samples[Math.round((k * (samples.length - 1)) / (max - 1))]);
  return out;
}

/**
 * One reference problem (./references.js), made, run and checked in this
 * realm, with the checks' extra runs too: the page never integrates.
 */
async function reference({ id, problem, integrator }, post) {
  const ref = REFERENCES.find(r => r.id === problem);
  if (!ref)
    return post({
      type: 'refused',
      id,
      problems: [{ path: 'problem', code: 'problem' }],
    });
  try {
    const made = ref.make();
    const system = integrator ? { ...made.system, integrator } : made.system;
    const options = {
      ...made.options,
      limits: { maxSamples: 30000, maxEvals: 1e9 },
    };
    const problems = runProblems(system, options);
    if (problems.length) return post({ type: 'refused', id, problems });
    const r = createRun(system, options);
    runs.set(id, r);
    let last = -1;
    while (!r.advance(30)) {
      if (r.fraction - last >= 0.02) {
        last = r.fraction;
        post({ type: 'progress', id, fraction: r.fraction });
      }
      await tick();
    }
    runs.delete(id);
    const result = r.result();
    const checks =
      result.status === 'ok'
        ? ref
            .check(result, made.context, (sys, opt) =>
              runToEnd(integrator ? { ...sys, integrator } : sys, {
                ...opt,
                limits: options.limits,
              })
            )
            .map(c => ({ ...c, ok: passes(c) }))
        : [];
    post({
      type: 'result',
      id,
      result: {
        ...result,
        samples: thin(result.samples).map(({ v: _v, ...rest }) => rest),
      },
      checks,
      system: {
        bodies: system.bodies.map(b => b.id),
        integrator: system.integrator,
      },
    });
  } catch (err) {
    runs.delete(id);
    post({
      type: 'error',
      id,
      message: String(err?.message || err).slice(0, 500),
    });
  }
}

/**
 * Steps a second for each fixed scheme and body count, in this realm: a
 * star and n - 1 planets on inclined orbits, run for about `ms` each.
 */
export function bench(
  bodies = [3, 10, 50],
  ms = 400,
  now = () => performance.now()
) {
  const results = {};
  for (const n of bodies) {
    const list = [{ m: 1, x: [0, 0, 0], v: [0, 0, 0] }];
    for (let i = 1; i < n; i++) {
      const r = fromElements(
        {
          a: 1 + 0.7 * i,
          e: 0.02 * (i % 5),
          i: 0.02 * i,
          Omega: 0.7 * i,
          omega: 1.3 * i,
          M: 0.9 * i,
        },
        1
      );
      list.push({ m: 1e-5, x: r.x, v: r.v });
    }
    for (const scheme of Object.keys(EVALS_PER_STEP)) {
      const s = makeState(list);
      // Warm the compiler first: the first few thousand steps are slower.
      run(s, scheme, 0.01, 2000);
      let steps = 0;
      const t0 = now();
      while (now() - t0 < ms) {
        run(s, scheme, 0.01, 50);
        steps += 50;
      }
      results[`${scheme}/${n}`] = Math.round((steps / (now() - t0)) * 1000);
    }
  }
  return results;
}

/**
 * One trial of a 3-D experiment (./experiment.js), for the scheduler: it
 * speaks the experiment Worker's messages (progress, result, error), and the
 * scheduler terminates this realm when it answers or runs out of time.
 */
async function trial({ manifest, trial }, post) {
  try {
    const system = trialSystem(manifest, trial);
    const run = createRun(system, trialOptions(manifest));
    let last = -1;
    while (!run.advance(30)) {
      if (run.fraction - last >= 0.05) {
        last = run.fraction;
        post({ type: 'progress', fraction: run.fraction });
      }
      await tick();
    }
    post({
      type: 'result',
      result: trialResult(manifest, trial, system, run.result()),
    });
  } catch (err) {
    post({
      type: 'error',
      message: String(err?.message || err).slice(0, 500),
    });
  }
}
const tick = () => new Promise(ok => setTimeout(ok, 0));

/**
 * Handle one message; `post` sends an answer. The Worker (./worker.js) is
 * this with post = self.postMessage, and the tests drive it directly.
 */
export async function handle(msg, post) {
  if (!msg || typeof msg !== 'object') return;
  if (msg.type === 'hello') return post({ type: 'hello', api: LAB3D_API });
  if (msg.type === 'cancel') return runs.get(msg.id)?.cancel();
  if (msg.type === 'trial') return trial(msg, post);
  if (msg.type === 'reference') return reference(msg, post);
  if (msg.type === 'bench')
    return post({ type: 'bench', results: bench(msg.bodies, msg.ms) });
  if (msg.type === 'live') {
    const migrated = migrateSystem(msg.system);
    if (!migrated.ok)
      return post({
        type: 'refused',
        id: msg.id,
        problems: [
          { path: 'system', code: migrated.code, vars: migrated.vars },
        ],
      });
    const made = createLive(migrated.system, msg.options || {});
    if (made.problems)
      return post({ type: 'refused', id: msg.id, problems: made.problems });
    live.set(msg.id, made.session);
    const snapshot = made.session.now();
    return post(
      { type: 'snapshot', id: msg.id, snapshot, migrated: migrated.migrated },
      transfer(snapshot)
    );
  }
  if (msg.type === 'live-advance') {
    const session = live.get(msg.id);
    if (!session)
      return post({ type: 'error', id: msg.id, message: 'no live session' });
    try {
      const snapshot = session.advance(msg.intervals);
      return post(
        { type: 'snapshot', id: msg.id, snapshot },
        transfer(snapshot)
      );
    } catch (err) {
      live.delete(msg.id);
      return post({
        type: 'error',
        id: msg.id,
        message: String(err?.message || err).slice(0, 500),
      });
    }
  }
  if (msg.type === 'live-stop') return live.delete(msg.id);
  if (msg.type !== 'run')
    return post({
      type: 'error',
      id: msg.id ?? null,
      message: `unknown message ${msg.type}`,
    });
  const { id } = msg;
  const migrated = migrateSystem(msg.system);
  if (!migrated.ok)
    return post({
      type: 'refused',
      id,
      problems: [{ path: 'system', code: migrated.code, vars: migrated.vars }],
    });
  const problems = runProblems(migrated.system, msg.options);
  if (problems.length) return post({ type: 'refused', id, problems });
  try {
    const run = createRun(migrated.system, msg.options);
    runs.set(id, run);
    let last = -1;
    while (!run.advance(30)) {
      if (run.fraction - last >= 0.02) {
        last = run.fraction;
        post({ type: 'progress', id, fraction: run.fraction });
      }
      await tick();
    }
    runs.delete(id);
    post({
      type: 'result',
      id,
      result: { ...run.result(), migrated: migrated.migrated },
    });
  } catch (err) {
    runs.delete(id);
    post({
      type: 'error',
      id,
      message: String(err?.message || err).slice(0, 500),
    });
  }
}
