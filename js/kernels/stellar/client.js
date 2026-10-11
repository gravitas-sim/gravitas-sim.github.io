// =============================================================================
// The page's side of the stellar kernel's Worker
// -----------------------------------------------------------------------------
// request(type, payload) resolves with the Worker's answer. Where no Worker
// exists (a test, an old browser) the same handler runs in place, so a caller
// never branches. The Worker is created on the first request and kept: the
// kernel holds no state between requests.
// =============================================================================

import { handle } from './workerCore.js';

export function createStellarClient({ spawn } = {}) {
  const make =
    spawn ||
    (() =>
      typeof Worker === 'undefined'
        ? null
        : new Worker(new URL('./worker.js', import.meta.url), {
            type: 'module',
          }));
  const waiting = new Map();
  let worker;
  let next = 1;
  let failed = false;
  const settle = ({ data }) => {
    const w = waiting.get(data.id);
    if (!w) return;
    waiting.delete(data.id);
    if (data.type === 'result') w.resolve(data.result);
    else w.reject(new Error(data.message));
  };
  return {
    request(type, payload = {}) {
      const id = next++;
      return new Promise((resolve, reject) => {
        waiting.set(id, { resolve, reject });
        if (worker === undefined && !failed) {
          try {
            worker = make();
          } catch {
            worker = null;
          }
          if (worker) {
            worker.onmessage = settle;
            worker.onerror = () => {
              failed = true;
              worker = null;
              for (const [k, w] of waiting) {
                waiting.delete(k);
                w.reject(new Error('the stellar worker failed'));
              }
            };
          }
        }
        if (worker) worker.postMessage({ id, type, ...payload });
        else
          handle({ id, type, ...payload }, message =>
            settle({ data: message })
          );
      });
    },
    close() {
      worker?.terminate?.();
      worker = undefined;
    },
  };
}
