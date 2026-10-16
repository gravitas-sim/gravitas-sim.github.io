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
//   { type: 'run', task: 'rv-search' | 'rv-fit' | 'rv-mc', index, request }
//     the circular RV model's period search, fit and Monte Carlo (./rvTasks.js)
//   { type: 'cancel' }, which a Monte Carlo hears between batches and answers
//     with the trials it managed
// Messages out: { type: 'progress', fraction }, then exactly one of
//   { type: 'result', result: { index, status: 'ok', ... } } or
//   { type: 'error', message }.
// =============================================================================

import { fitOnce, profileTask } from './infer.js';
import { RV_TASKS, runRvTask } from './rvTasks.js';

let canceled = false;

self.onmessage = e => {
  const msg = e.data || {};
  if (msg.type === 'cancel') {
    canceled = true;
    return;
  }
  if (msg.type === 'run' && RV_TASKS.includes(msg.task)) {
    const started = performance.now();
    canceled = false;
    runRvTask(msg, {
      // A task of a few messages, or one a batch of trials: both are few.
      onProgress: ({ done, total }) =>
        self.postMessage({ type: 'progress', fraction: done / total }),
      shouldCancel: () => canceled,
      // Lets the queue run, so a cancel message can arrive between batches.
      yieldTo: () => new Promise(r => setTimeout(r, 0)),
    }).then(
      result =>
        self.postMessage({
          type: 'result',
          result: {
            ...result,
            index: msg.index,
            task: msg.task,
            wallMs: performance.now() - started,
          },
        }),
      err =>
        self.postMessage({
          type: 'error',
          message: String(err?.message || err),
        })
    );
    return;
  }
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
