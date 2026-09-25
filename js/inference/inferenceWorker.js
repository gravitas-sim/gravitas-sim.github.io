// =============================================================================
// A disposable realm for one inference task
// -----------------------------------------------------------------------------
// Started by ./run.js through the experiment scheduler
// (js/experiments/scheduler.js), one per task, terminated when it answers.
// It imports only the inference core: no world, no engine, nothing a page
// shows, so a fit cannot touch the simulation.
//
// Messages in:
//   { type: 'run', task: 'fit', index, request, data }
//   { type: 'run', task: 'profile', index, parameter, request, data, fit }
// Messages out: { type: 'progress', fraction }, then exactly one of
//   { type: 'result', result: { index, status: 'ok', ... } } or
//   { type: 'error', message }.
// =============================================================================

import { fitOnce, profileTask } from './infer.js';

self.onmessage = e => {
  const msg = e.data || {};
  let last = -1;
  const hooks = {
    onProgress: fraction => {
      // A few messages a task, not one an evaluation.
      if (fraction - last >= 0.05 || fraction === 1) {
        last = fraction;
        self.postMessage({ type: 'progress', fraction });
      }
    },
  };
  try {
    if (msg.type !== 'run') {
      self.postMessage({
        type: 'error',
        message: `unknown message ${msg.type}`,
      });
      return;
    }
    const started = performance.now();
    const result =
      msg.task === 'fit'
        ? fitOnce(msg.request, msg.data, hooks)
        : profileTask(msg.request, msg.data, msg.fit, msg.parameter, hooks);
    self.postMessage({
      type: 'result',
      result: {
        ...result,
        index: msg.index,
        task: msg.task,
        wallMs: performance.now() - started,
      },
    });
  } catch (err) {
    self.postMessage({ type: 'error', message: String(err?.message || err) });
  }
};
