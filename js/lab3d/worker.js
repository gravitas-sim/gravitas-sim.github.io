// =============================================================================
// The 3-D kernel's Worker: one disposable realm per run
// -----------------------------------------------------------------------------
// The only place the 3-D kernel integrates. The page never does (it would
// freeze it), and no realm is reused, so no run can see another's bodies
// (MULTI_WORLD_DECISION.md). The protocol, versioned by ./api.js LAB3D_API:
//
//   page -> worker   {type: 'hello'}
//                    {type: 'run', id, system, options}
//                    {type: 'cancel', id}
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

const runs = new Map();
const tick = () => new Promise(ok => setTimeout(ok, 0));

self.onmessage = async ({ data: msg }) => {
  if (!msg || typeof msg !== 'object') return;
  if (msg.type === 'hello')
    return self.postMessage({ type: 'hello', api: LAB3D_API });
  if (msg.type === 'cancel') return runs.get(msg.id)?.cancel();
  if (msg.type !== 'run')
    return self.postMessage({
      type: 'error',
      id: msg.id ?? null,
      message: `unknown message ${msg.type}`,
    });
  const { id } = msg;
  const migrated = migrateSystem(msg.system);
  if (!migrated.ok)
    return self.postMessage({
      type: 'refused',
      id,
      problems: [{ path: 'system', code: migrated.code, vars: migrated.vars }],
    });
  const problems = runProblems(migrated.system, msg.options);
  if (problems.length)
    return self.postMessage({ type: 'refused', id, problems });
  try {
    const run = createRun(migrated.system, msg.options);
    runs.set(id, run);
    let last = -1;
    while (!run.advance(30)) {
      if (run.fraction - last >= 0.02) {
        last = run.fraction;
        self.postMessage({ type: 'progress', id, fraction: run.fraction });
      }
      await tick();
    }
    runs.delete(id);
    self.postMessage({
      type: 'result',
      id,
      result: { ...run.result(), migrated: migrated.migrated },
    });
  } catch (err) {
    runs.delete(id);
    self.postMessage({
      type: 'error',
      id,
      message: String(err?.message || err).slice(0, 500),
    });
  }
};
