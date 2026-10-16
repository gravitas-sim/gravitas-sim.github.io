// =============================================================================
// A live 3-D session's client (gravitas.lab3d API 1.1)
// -----------------------------------------------------------------------------
// The lab (/3d/) plays a system through this: a Worker of its own holding a
// live run (./live.js), advanced a whole number of intervals at a time and
// answered with snapshots (./snapshot.js). Separate from ./api.js so that a
// page which only runs systems to the end does not download it.
// =============================================================================

import { LAB3D_API } from './api.js';

const major = v => Number(String(v).split('.')[0]);
const minor = v => Number(String(v).split('.')[1]);
/**
 * A live session (API 1.1, ./live.js) in a Worker of its own: `ready`
 * resolves with the first snapshot, `advance(k)` with the snapshot after k
 * more intervals, and `stop()` ends the Worker. One advance is in flight at a
 * time; asking again before it answers returns the same promise.
 */
export function createLiveSession({ spawn }, system, options) {
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
      if (major(data.api) !== major(LAB3D_API) || !(minor(data.api) >= 1))
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
