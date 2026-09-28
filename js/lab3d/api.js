// =============================================================================
// The 3-D kernel's capability API, gravitas.lab3d
// -----------------------------------------------------------------------------
// What a page, a tool or the experiment scheduler uses to run a 3-D system:
// a version, the checks, the migration, and a client that runs each system
// in a Worker of its own (./worker.js). The version follows semver: a minor
// release adds, a major one may change what a result means. The capability
// package capabilities/lab3d.json declares the model and the route, and
// LAB3D.md documents the API.
//
// The kernel is not imported here: this module is what a page loads, and the
// kernel belongs to the Worker.
// =============================================================================

export const LAB3D_API = '1.0.0';
export {
  validateSystem,
  migrateSystem,
  FORMAT,
  FORMAT_VERSION,
  MAX_BODIES,
} from './state.js';

const major = v => Number(String(v).split('.')[0]);

/**
 * A client that runs systems, each in a fresh Worker.
 * @param {{spawn: () => Worker}} opts - How to make a Worker; the page passes
 *   `() => new Worker(new URL('./worker.js', import.meta.url), {type: 'module'})`
 */
export function createLab3d({ spawn }) {
  let seq = 0;
  return {
    api: LAB3D_API,
    /**
     * Run a system. Resolves with the Worker's result; `cancel()` asks the
     * run to stop (it resolves with status 'canceled'), `terminate()` ends
     * the Worker at once (it rejects).
     */
    run(system, options, { onProgress } = {}) {
      const worker = spawn();
      const id = `run-${++seq}`;
      let settle;
      const done = new Promise((ok, bad) => {
        settle = { ok, bad };
      });
      const finish = (fn, value) => {
        worker.terminate();
        fn(value);
      };
      worker.onmessage = ({ data }) => {
        if (data?.type === 'hello') {
          if (major(data.api) !== major(LAB3D_API))
            return finish(
              settle.bad,
              Object.assign(new Error('api'), {
                code: 'api',
                vars: { theirs: data.api, ours: LAB3D_API },
              })
            );
          return worker.postMessage({ type: 'run', id, system, options });
        }
        if (data?.id !== id) return;
        if (data.type === 'progress') onProgress?.(data.fraction);
        else if (data.type === 'result') finish(settle.ok, data.result);
        else if (data.type === 'refused')
          finish(
            settle.bad,
            Object.assign(new Error('refused'), {
              code: 'refused',
              problems: data.problems,
            })
          );
        else if (data.type === 'error')
          finish(settle.bad, new Error(data.message));
      };
      worker.onerror = e =>
        finish(settle.bad, new Error(e?.message || 'the Worker failed'));
      worker.postMessage({ type: 'hello' });
      return {
        done,
        cancel: () => worker.postMessage({ type: 'cancel', id }),
        terminate: () =>
          finish(
            settle.bad,
            Object.assign(new Error('terminated'), { code: 'terminated' })
          ),
      };
    },
  };
}
