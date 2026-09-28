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
import { createRun, runProblems } from './engine.js';
import { migrateSystem } from './state.js';
import { trialOptions, trialResult, trialSystem } from './experiment.js';

const runs = new Map();

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
