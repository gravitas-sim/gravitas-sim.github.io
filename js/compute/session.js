// =============================================================================
// One run of the compute page's frame, from "Start the runtime" to a capsule
// -----------------------------------------------------------------------------
// The page never runs a cell. This object does the page's side of the
// conversation with the sandboxed frame (./messages.js), and turns every way it
// can go wrong into a ComputeError the page has words for:
//
//   offline            the network is down
//   frame-unreachable  the frame's document could not be fetched
//   frame-version      its bytes, or the build it reports, are not the pinned ones
//   handshake-timeout  the frame did not answer in time
//   runtime-download   the runtime or a package could not be fetched or checked
//   version-mismatch   the runtime is not the release the page pins
//   timeout            a load or a run did not finish; the frame is removed,
//                      which ends the Worker, however the notebook is stuck
//   memory             the runtime ran out of memory
//   notebook-error     the notebook raised
//   output-refused     what it returned is not what the catalogue declares
//   cancelled, busy
//
// Everything outside the page is behind two small seams, so the whole state
// machine is tested without a browser: `fetchFrame` (the frame document's text,
// for the hash check) and `connect` (a transport that yields the page's end of
// the MessagePort and a way to close it). The real ones are in ./transport.js.
// =============================================================================

import { sha256Hex } from '../hash.js';
import { FRAME_ORIGIN } from './origin.js';
import { checkOutput } from './check.js';
import { buildCapsule } from './capsule.js';
import { ComputeError } from './prepare.js';
import { message, readMessage } from './messages.js';
import { RUNTIME, downloadBytes } from './runtime.js';

/** Milliseconds each wait is given; a test passes shorter ones. */
export const TIMEOUTS = Object.freeze({
  connect: 20_000,
  load: 300_000,
  run: 180_000,
});

const newId = (() => {
  let n = 0;
  return prefix => `${prefix}-${Date.now().toString(36)}-${(n++).toString(36)}`;
})();

/** The frame's error codes, as the page's. */
const FRAME_ERROR = {
  'runtime-download': 'runtime-download',
  'runtime-version': 'version-mismatch',
  memory: 'memory',
  'notebook-error': 'notebook-error',
  'output-too-large': 'output-refused',
  'invalid-request': 'frame-version',
  busy: 'busy',
  cancelled: 'cancelled',
};

/**
 * @param {object} deps
 * @param {() => Promise<string>} deps.fetchFrame - The frame document's text
 * @param {() => Promise<{port: MessagePort, close: () => void}>} deps.connect
 *   Frames it and hands over the port; rejects if the frame never loads
 * @param {{indexSha256: string, build: string}} deps.pin - js/compute/framePin.js
 * @param {(state: string, detail?: object) => void} [deps.onState]
 * @param {(phase: string) => void} [deps.onProgress]
 * @param {Partial<typeof TIMEOUTS>} [deps.timeouts]
 * @param {() => boolean} [deps.online]
 * @param {() => number} [deps.now]
 */
export function createSession({
  fetchFrame,
  connect,
  pin,
  onState = () => {},
  onProgress = () => {},
  timeouts = {},
  online = () => globalThis.navigator?.onLine !== false,
  now = () => performance.now(),
}) {
  const limit = { ...TIMEOUTS, ...timeouts };
  let link = null;
  let ready = null;
  let loaded = null;
  let pending = null;
  let state = 'idle';
  const stray = [];

  const set = (s, detail) => {
    state = s;
    onState(s, detail);
  };

  function close() {
    pending?.timer && clearTimeout(pending.timer);
    pending = null;
    try {
      link?.port.close();
      link?.close();
    } catch {
      /* already gone */
    }
    link = null;
    ready = null;
    loaded = null;
  }

  /** Reject the request in flight (and tear the frame down for a timeout). */
  function failPending(err, tearDown) {
    const p = pending;
    if (!p) return;
    clearTimeout(p.timer);
    pending = null;
    if (tearDown) {
      close();
      set('stopped', { code: err.code });
    }
    p.reject(err);
  }

  function onFrame({ data }) {
    const m = readMessage(data, 'frame');
    if (!m.ok) {
      stray.push(m.code);
      return;
    }
    const msg = m.message;
    if (!pending) return;
    if (msg.type === 'progress' && msg.id === pending.id)
      return onProgress(msg.phase);
    if (msg.type === 'error' && (msg.id === pending.id || msg.id === null)) {
      const code = FRAME_ERROR[msg.code] ?? 'notebook-error';
      return failPending(
        new ComputeError(code, msg.message, { frameCode: msg.code }),
        false
      );
    }
    if (msg.id !== pending.id) return;
    if (msg.type === pending.expect) {
      const p = pending;
      clearTimeout(p.timer);
      pending = null;
      p.resolve(msg);
    }
  }

  /** Send one request and wait for its one answer. */
  function request(type, fields, expect, ms) {
    return new Promise((resolve, reject) => {
      const id = newId(type);
      const timer = setTimeout(
        () =>
          failPending(
            new ComputeError(
              'timeout',
              `${type} did not finish in ${Math.round(ms / 1000)} s`
            ),
            true
          ),
        ms
      );
      pending = { id, expect, resolve, reject, timer };
      link.port.postMessage(message(type, { id, ...fields }));
    });
  }

  const checkRuntime = rt => {
    if (
      rt.version !== RUNTIME.version ||
      rt.lockSha256 !== RUNTIME.lockSha256 ||
      rt.name !== RUNTIME.name
    )
      throw new ComputeError(
        'version-mismatch',
        `the runtime is ${rt.name} ${rt.version}, not ${RUNTIME.name} ${RUNTIME.version}`
      );
  };

  return {
    get state() {
      return state;
    },
    get stray() {
      return stray;
    },
    get probes() {
      return ready?.probes ?? null;
    },
    get frame() {
      return ready ? { origin: FRAME_ORIGIN, build: ready.build } : null;
    },

    /**
     * Fetch and check the frame, frame it, and load the runtime and packages.
     * @param {string[]} packages
     */
    async start(packages) {
      if (
        state === 'verifying' ||
        state === 'starting' ||
        state === 'loading' ||
        state === 'running'
      )
        throw new ComputeError('busy', 'already working');
      close();
      try {
        if (!online()) throw new ComputeError('offline', 'the network is down');
        set('verifying');
        let text;
        try {
          text = await fetchFrame();
        } catch {
          throw new ComputeError(
            online() ? 'frame-unreachable' : 'offline',
            'the frame could not be fetched'
          );
        }
        if ((await sha256Hex(text)) !== pin.indexSha256)
          throw new ComputeError(
            'frame-version',
            'the frame is not the pinned build'
          );
        set('starting');
        link = await connect().catch(() => {
          throw new ComputeError('frame-unreachable', 'the frame did not load');
        });
        link.port.onmessage = onFrame;
        ready = await new Promise((resolve, reject) => {
          const timer = setTimeout(
            () =>
              reject(
                new ComputeError(
                  'handshake-timeout',
                  'the frame did not answer'
                )
              ),
            limit.connect
          );
          const first = link.port.onmessage;
          link.port.onmessage = ev => {
            const m = readMessage(ev.data, 'frame');
            if (m.ok && m.message.type === 'ready') {
              clearTimeout(timer);
              link.port.onmessage = first;
              resolve(m.message);
            } else if (!m.ok) stray.push(m.code);
          };
        });
        if (ready.build !== pin.build)
          throw new ComputeError(
            'frame-version',
            'the frame reports another build'
          );
        set('loading');
        loaded = await request('load', { packages }, 'loaded', limit.load);
        checkRuntime(loaded.runtime);
        set('ready', { download: downloadBytes(packages) });
        return {
          runtime: loaded.runtime,
          marks: loaded.marks,
          heapBytes: loaded.heapBytes,
        };
      } catch (err) {
        const e =
          err instanceof ComputeError
            ? err
            : new ComputeError('notebook-error', String(err?.message ?? err));
        if (e.code !== 'timeout') close();
        set('failed', { code: e.code });
        throw e;
      }
    },

    /**
     * Run a prepared notebook and build its capsule.
     * @param {object} a
     * @param {object} a.entry - Catalogue entry
     * @param {{cells: string[], hash: string}} a.notebook - From loadNotebook
     * @param {{text: string, source: string, title: string}} a.input
     * @param {object} a.params - Name to number
     * @param {string} a.paramsText
     * @param {string} [a.at]
     * @returns {Promise<{capsule: object, parts: object, stdout: string, heapBytes: number}>}
     */
    async run({
      entry,
      notebook,
      input,
      params,
      paramsText,
      at,
      inputCitations = [],
    }) {
      if (state !== 'ready')
        throw new ComputeError('busy', 'the runtime is not ready');
      set('running');
      const t0 = now();
      try {
        const result = await request(
          'run',
          {
            input: input.text,
            params: paramsText,
            cells: notebook.cells,
            packages: entry.packages,
          },
          'result',
          limit.run
        );
        checkRuntime(result.runtime);
        const checked = checkOutput(result.output, entry.outputs);
        if (!checked.ok)
          throw new ComputeError('output-refused', checked.message, {
            code: checked.code,
          });
        const m = result.marks;
        const capsule = await buildCapsule({
          entry,
          inputs: [
            {
              name: entry.input.name,
              text: input.text,
              format: `${entry.input.format}/${entry.input.version}`,
              source: input.source,
              title: input.title,
            },
          ],
          params,
          checked,
          runtime: result.runtime,
          frame: { origin: FRAME_ORIGIN, build: ready.build },
          timing: {
            // The runtime and packages were loaded by "Start the runtime", before this run.
            runtimeMs: loaded.marks.runtime ?? 0,
            packagesMs: Math.max(
              0,
              (loaded.marks.packages ?? 0) - (loaded.marks.runtime ?? 0)
            ),
            cellsMs: Math.max(0, (m.cells ?? 0) - (m.packages ?? 0)),
            totalMs: Math.round(now() - t0),
            downloadBytes: downloadBytes(entry.packages),
          },
          cellsSha256: notebook.hash,
          cellCount: notebook.cells.length,
          at,
          citations: [...entry.citations, ...inputCitations],
        });
        set('ready');
        return {
          capsule,
          parts: checked.parts,
          stdout: result.stdout,
          heapBytes: result.heapBytes,
        };
      } catch (err) {
        if (state !== 'stopped') set('ready');
        throw err;
      }
    },

    /** Stop what is running by removing the frame; the runtime must be started again. */
    cancel() {
      if (pending) failPending(new ComputeError('cancelled', 'stopped'), true);
      else {
        close();
        set('stopped', { code: 'cancelled' });
      }
    },

    /** Remove the frame. */
    dispose() {
      close();
      set('idle');
    },
  };
}
