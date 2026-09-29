// =============================================================================
// The mission core's capability API, gravitas.mission
// -----------------------------------------------------------------------------
// What a page or a tool uses to solve a transfer: a version, and a client
// that sends each request to a fresh Worker (./worker.js) and ends it after.
// The version follows semver: a minor release adds, a major one may change
// what a result means. capabilities/mission.json declares the route and the
// model, and MISSION.md documents the API.
//
// No solver is imported here: this module is what the page loads, and the
// solvers belong to the Worker.
// =============================================================================

export const MISSION_API = '1.0.0';

const major = v => Number(String(v).split('.')[0]);

/**
 * A client that runs each request in a fresh Worker.
 * @param {{spawn: () => Worker}} opts - How to make a Worker; the page passes
 *   `() => new Worker(new URL('./worker.js', import.meta.url), {type: 'module'})`
 */
export function createMission({ spawn }) {
  let seq = 0;
  const request = (message, { onProgress } = {}) => {
    const worker = spawn();
    const id = `m-${++seq}`;
    let settle;
    const done = new Promise((ok, bad) => {
      settle = { ok, bad };
    });
    let over = false;
    const finish = (fn, value) => {
      if (over) return;
      over = true;
      worker.terminate();
      fn(value);
    };
    worker.onmessage = ({ data }) => {
      if (data?.type === 'hello') {
        if (major(data.api) !== major(MISSION_API))
          return finish(
            settle.bad,
            Object.assign(new Error('api'), {
              code: 'api',
              vars: { theirs: data.api, ours: MISSION_API },
            })
          );
        return worker.postMessage({ ...message, id });
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
      /** Ask the request to stop between slices; it resolves as 'canceled'. */
      cancel: () => worker.postMessage({ type: 'cancel', id }),
      /** End the Worker at once; the request rejects with code 'terminated'. */
      terminate: () =>
        finish(
          settle.bad,
          Object.assign(new Error('terminated'), { code: 'terminated' })
        ),
    };
  };
  return {
    api: MISSION_API,
    /** Solve one problem ({kind, ...}); resolves with the solver's answer. */
    solve: problem => request({ type: 'solve', problem }),
    /** A transfer window (./window.js); resolves with its grid. */
    window: (options, { limits, ...hooks } = {}) =>
      request({ type: 'window', options, limits }, hooks),
    /** The reference cases (./references.js); resolves with their measures. */
    validate: (cases, hooks) => request({ type: 'validate', cases }, hooks),
  };
}
