// =============================================================================
// The compute frame's page script (published to the compute origin)
// -----------------------------------------------------------------------------
// This runs inside <iframe sandbox="allow-scripts"> with no allow-same-origin,
// so its origin is opaque: no storage, no cookies, no reach into the page that
// holds it. It speaks gravitas-compute/1 (js/compute/messages.js) over one
// MessagePort the page transfers in its first message, and starts a Worker
// (./worker.js) that holds Pyodide. A notebook that never returns blocks that
// Worker, not this frame and not the page; the page's timeout removes the
// frame, which ends the Worker.
//
// It answers only a page it knows (js/compute/origin.js parentAllowed), takes
// one port, and reads every message through the shared reader: anything else
// is refused by name. It never evaluates what it is sent: the cells go to the
// Worker as strings for Python to run, inside Pyodide.
//
// tools/build-compute-frame.mjs bundles this with its Worker into one inline
// script, hashed into the frame's Content-Security-Policy.
// =============================================================================

import { message, readMessage } from '../messages.js';
import { parentAllowed } from '../origin.js';

/* global __BUILD__, __WORKER_SOURCE__, self, caches */
const BUILD = __BUILD__;
const WORKER_SOURCE = __WORKER_SOURCE__;

let port = null;
let worker = null;
/** The id of the load or run in progress, or null. */
let busy = null;

/** What this frame may reach, asked of the frame itself. */
async function probes() {
  const r = {};
  const sync = (k, fn) => {
    try {
      fn();
      r[k] = 'allowed';
    } catch (e) {
      r[k] = `refused (${e.name})`.slice(0, 80);
    }
  };
  sync('localStorage', () => window.localStorage.length);
  sync('sessionStorage', () => window.sessionStorage.length);
  sync('cookie', () => document.cookie);
  sync('parentDocument', () => window.parent.document.title);
  sync('topLocation', () => window.top.location.href);
  r.origin = String(self.origin).slice(0, 80);
  try {
    await new Promise((ok, bad) => {
      const q = indexedDB.open('probe');
      q.onsuccess = ok;
      q.onerror = () => bad(q.error);
    });
    r.indexedDB = 'allowed';
  } catch (e) {
    r.indexedDB = `refused (${e?.name || e})`.slice(0, 80);
  }
  try {
    await caches.keys();
    r.caches = 'allowed';
  } catch (e) {
    r.caches = `refused (${e?.name || e})`.slice(0, 80);
  }
  return r;
}

const send = (type, fields) => port.postMessage(message(type, fields));
const fail = (id, code, text) =>
  send('error', { id, code, message: String(text ?? code).slice(0, 2000) });

function startWorker() {
  worker = new Worker(
    URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'text/javascript' }))
  );
  worker.onmessage = ({ data }) => {
    // Only what the Worker is built to say; the same reader the page uses
    // refuses anything that is not a frame message.
    const m = readMessage(
      data && typeof data === 'object' ? { ...data } : null,
      'frame'
    );
    if (!m.ok || m.message.type === 'ready') return;
    if (
      m.message.type === 'result' ||
      m.message.type === 'loaded' ||
      m.message.type === 'error'
    )
      busy = null;
    port.postMessage(m.message);
  };
  worker.onerror = e => {
    const id = busy;
    busy = null;
    worker = null;
    fail(id, 'runtime-download', e.message || 'the worker failed');
  };
}

function onPage({ data }) {
  const m = readMessage(data, 'page');
  if (!m.ok) return fail(m.id, 'invalid-request', `refused: ${m.code}`);
  const { type, id } = m.message;
  if (type === 'hello') return fail(null, 'invalid-request', 'already started');
  if (type === 'cancel') {
    if (busy !== id) return;
    // Ending the Worker ends the notebook, however it is stuck.
    worker?.terminate();
    worker = null;
    busy = null;
    return fail(id, 'cancelled', 'stopped');
  }
  if (busy) return fail(id, 'busy', 'another request is still running');
  busy = id;
  if (!worker) startWorker();
  const job = { ...m.message, op: type };
  for (const k of ['protocol', 'version', 'type']) delete job[k];
  worker.postMessage(job);
}

window.addEventListener('message', async e => {
  // The handshake: the first message, from the page that holds this frame, a
  // page this frame answers, carrying exactly one port.
  if (port || e.source !== window.parent || !parentAllowed(e.origin)) return;
  const m = readMessage(e.data, 'page');
  if (!m.ok || m.message.type !== 'hello' || e.ports.length !== 1) return;
  port = e.ports[0];
  port.onmessage = onPage;
  send('ready', { build: BUILD, probes: await probes() });
});
