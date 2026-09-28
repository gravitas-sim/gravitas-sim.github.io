// The notebook runner (spike). Loaded in <iframe sandbox="allow-scripts">
// with no allow-same-origin, so its origin is opaque: it has no storage, no
// cookies and no reach into the page that holds it. It speaks one protocol
// over a MessagePort the host transfers, and runs the cells it is sent in
// Pyodide from a pinned release on the CDN.
const PROTOCOL = 'gravitas-notebook';
const MAX_INPUT = 2_000_000;
const MAX_CELL = 20_000;
const MAX_CELLS = 40;
const MAX_OUTPUT = 4_000_000;
const PACKAGES = new Set(['numpy', 'matplotlib', 'scipy', 'pandas', 'astropy']);
let port = null;

/** What this frame may reach, asked of the frame itself. */
async function probes() {
  const r = {};
  const sync = (k, fn) => {
    try {
      fn();
      r[k] = 'allowed';
    } catch (e) {
      r[k] = `refused (${e.name})`;
    }
  };
  sync('localStorage', () => window.localStorage.length);
  sync('sessionStorage', () => window.sessionStorage.length);
  sync('cookie', () => document.cookie);
  sync('parent.document', () => window.parent.document.title);
  sync('top.location.href', () => window.top.location.href);
  r.origin = self.origin;
  try {
    await new Promise((ok, bad) => {
      const q = indexedDB.open('probe');
      q.onsuccess = ok;
      q.onerror = () => bad(q.error);
    });
    r.indexedDB = 'allowed';
  } catch (e) {
    r.indexedDB = `refused (${e?.name || e})`;
  }
  try {
    await caches.keys();
    r.caches = 'allowed';
  } catch (e) {
    r.caches = `refused (${e?.name || e})`;
  }
  return r;
}

const valid = m =>
  m &&
  m.protocol === PROTOCOL &&
  m.v === 1 &&
  m.type === 'run' &&
  typeof m.id === 'string' &&
  m.id.length <= 64 &&
  typeof m.input === 'string' &&
  m.input.length <= MAX_INPUT &&
  Array.isArray(m.cells) &&
  m.cells.length <= MAX_CELLS &&
  m.cells.every(c => typeof c === 'string' && c.length <= MAX_CELL) &&
  Array.isArray(m.packages) &&
  m.packages.every(p => PACKAGES.has(p));

// Pyodide runs in a Worker made here: a notebook that never returns blocks
// the Worker, not this frame and not the page that holds it.
const WORKER_SOURCE = __WORKER_SOURCE__;
let worker = null;
function run(m) {
  worker ??= new Worker(URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'text/javascript' })));
  return new Promise((ok, bad) => {
    worker.onmessage = ({ data }) => (data.ok ? ok(data) : bad(new Error(data.error)));
    worker.onerror = e => bad(new Error(e.message || 'the worker failed'));
    worker.postMessage({ input: m.input, cells: m.cells, packages: m.packages });
  });
}

window.addEventListener('message', async e => {
  // Only the host's first message, which carries the port.
  if (port || e.source !== window.parent || !e.ports?.[0]) return;
  port = e.ports[0];
  port.onmessage = async ({ data }) => {
    if (!valid(data)) {
      port.postMessage({ protocol: PROTOCOL, v: 1, type: 'error', id: data?.id ?? null, error: 'invalid request' });
      return;
    }
    try {
      const r = await run(data);
      if (r.output.length > MAX_OUTPUT) throw new Error('output too large');
      port.postMessage({ protocol: PROTOCOL, v: 1, type: 'result', id: data.id, ...r });
    } catch (err) {
      port.postMessage({ protocol: PROTOCOL, v: 1, type: 'error', id: data.id, error: String(err?.message || err).slice(0, 2000) });
    }
  };
  port.postMessage({ protocol: PROTOCOL, v: 1, type: 'ready', probes: await probes() });
});
