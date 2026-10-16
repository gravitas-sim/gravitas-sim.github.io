// =============================================================================
// Failures, said in the status region
// -----------------------------------------------------------------------------
// js/main.js listens for an uncaught error, an unhandled rejection and a worker
// that was given up on, and imports this only when one happens, so a page that
// never fails never fetches it. It records the failure in #srStatus as well as
// the console. It swallows nothing: it never calls preventDefault, so the
// browser reports the error as it always did.
// =============================================================================

import { announce } from './notify.js';
import { t } from './i18n/index.js';
import { ensureDeferredMessages } from './i18n/deferredMessages.js';

/**
 * Say what failed.
 *
 * @param {Event} e - An ErrorEvent, a PromiseRejectionEvent, or the engine's
 *   gravitasWorkerFailed
 * @returns {Promise<void>}
 */
export async function record(e) {
  let id = 'failure.error';
  let message = '';
  if (e.type === 'gravitasWorkerFailed')
    id = `failure.worker.${e.detail?.worker}`;
  else if (e.type === 'unhandledrejection')
    message = String(e.reason?.message ?? e.reason ?? '');
  else message = String(e.error?.message ?? e.message ?? '');
  // Chrome reports a resize observer that could not deliver every
  // notification in one frame as an error; nothing failed.
  if (/ResizeObserver loop/.test(message)) return;
  await ensureDeferredMessages().catch(() => {});
  announce(t(id, { message: message.slice(0, 160) }));
}
