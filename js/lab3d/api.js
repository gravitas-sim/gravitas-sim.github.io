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

export const LAB3D_API = '1.1.0';
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
  /** Send one request to a fresh Worker; settle on its answer. */
  const request = (message, { onProgress } = {}) => {
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
        return worker.postMessage({ ...message, id });
      }
      if (data?.type === 'bench') return finish(settle.ok, data.results);
      if (data?.id !== id) return;
      if (data.type === 'progress') onProgress?.(data.fraction);
      else if (data.type === 'result')
        finish(settle.ok, data.checks ? data : data.result);
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
  };
  return {
    api: LAB3D_API,
    /**
     * Run a system. Resolves with the Worker's result; `cancel()` asks the
     * run to stop (it resolves with status 'canceled'), `terminate()` ends
     * the Worker at once (it rejects).
     */
    run: (system, options, hooks) =>
      request({ type: 'run', system, options }, hooks),
    /** Run and check a reference problem (./references.js); resolves with {result, checks}. */
    reference: (problem, { integrator, ...hooks } = {}) =>
      request({ type: 'reference', problem, integrator }, hooks),
    /** Steps a second in a Worker, for each fixed scheme and body count. */
    bench: ({ bodies, ms } = {}) => request({ type: 'bench', bodies, ms }),
    live: (system, options) => live(spawn, system, options),
  };
}

/**
 * A live session (API 1.1, ./live.js) in a Worker of its own: `ready`
 * resolves with the first snapshot, `advance(k)` with the snapshot after k
 * more intervals, and `stop()` ends the Worker. One advance is in flight at a
 * time; asking again before it answers returns the same promise.
 */
function live(spawn, system, options) {
  const worker = spawn();
  const id = 'live';
  let pending = null;
  let stopped = false;
  let readyOk;
  let readyBad;
  const ready = new Promise((ok, bad) => {
    readyOk = ok;
    readyBad = bad;
  });
  const fail = err => {
    stopped = true;
    worker.terminate();
    readyBad(err);
    pending?.bad(err);
    pending = null;
  };
  worker.onmessage = ({ data }) => {
    if (data?.type === 'hello') {
      if (
        major(data.api) !== major(LAB3D_API) ||
        !(Number(String(data.api).split('.')[1]) >= 1)
      )
        return fail(
          Object.assign(new Error('api'), {
            code: 'api',
            vars: { theirs: data.api, ours: LAB3D_API },
          })
        );
      return worker.postMessage({ type: 'live', id, system, options });
    }
    if (data?.id !== id) return;
    if (data.type === 'snapshot') {
      if (pending) {
        const p = pending;
        pending = null;
        p.ok(data.snapshot);
      } else readyOk({ snapshot: data.snapshot, migrated: data.migrated });
    } else if (data.type === 'refused')
      fail(
        Object.assign(new Error('refused'), {
          code: 'refused',
          problems: data.problems,
        })
      );
    else if (data.type === 'error') fail(new Error(data.message));
  };
  worker.onerror = e => fail(new Error(e?.message || 'the Worker failed'));
  worker.postMessage({ type: 'hello' });
  return {
    ready,
    advance(intervals) {
      if (stopped)
        return Promise.reject(
          Object.assign(new Error('stopped'), { code: 'stopped' })
        );
      if (pending) return pending.promise;
      let ok;
      let bad;
      const promise = new Promise((a, b) => {
        ok = a;
        bad = b;
      });
      pending = { ok, bad, promise };
      worker.postMessage({ type: 'live-advance', id, intervals });
      return promise;
    },
    stop() {
      if (stopped) return;
      stopped = true;
      worker.terminate();
      pending?.bad(Object.assign(new Error('stopped'), { code: 'stopped' }));
      pending = null;
    },
  };
}
