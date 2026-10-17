// =============================================================================
// The page's side of the conversation, against a frame that behaves, and ones that do not
// -----------------------------------------------------------------------------
// js/compute/session.js with its two seams faked: the frame's document (for the
// hash check) and the transport (a MessageChannel whose far end is a script
// standing in for the frame). Every failure the page has words for is made to
// happen: offline, an unreachable frame, a frame that is not the pinned build,
// one that never answers, a runtime that is another release, a download that
// fails, memory, a notebook that raises, an answer that is not what was
// declared, a timeout that removes the frame, and a cancel.
// =============================================================================

import { afterEach, describe, test, expect } from '@jest/globals';
import './computeSetup.js';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { MessageChannel } from 'node:worker_threads';

import { entryOf } from '../js/compute/catalogue.js';
import { message } from '../js/compute/messages.js';
import { RUNTIME } from '../js/compute/runtime.js';
import { createSession } from '../js/compute/session.js';

const sha = t => createHash('sha256').update(t).digest('hex');
const FRAME_TEXT = '<!doctype html><title>frame</title>';
const PIN = { indexSha256: sha(FRAME_TEXT), build: 'b'.repeat(64) };
const entry = entryOf('line-centroid');
const answer = JSON.parse(
  readFileSync('tests/fixtures/compute/line-centroid.answer.json', 'utf8')
);
const runtime = {
  name: 'pyodide',
  version: RUNTIME.version,
  python: RUNTIME.python,
  lockSha256: RUNTIME.lockSha256,
  packages: { numpy: '2.4.6' },
};

const channels = [];
afterEach(() => {
  while (channels.length) {
    const c = channels.pop();
    c.port1.close();
    c.port2.close();
  }
});

/** A far end that answers as the real frame does, unless told otherwise. */
function fake(over = {}) {
  const log = { closed: false, requests: [] };
  const connect = async () => {
    if (over.unreachable) throw new Error('no frame');
    const ch = new MessageChannel();
    channels.push(ch);
    const out = m => ch.port2.postMessage(m);
    ch.port2.onmessage = ({ data }) => {
      log.requests.push(data.type);
      if (over.silent) return;
      if (data.type === 'run' && over.dropRun) return;
      if (data.type === 'load') {
        if (over.loadError)
          return out(
            message('error', {
              id: data.id,
              code: over.loadError,
              message: 'x',
            })
          );
        out(
          message('loaded', {
            id: data.id,
            runtime: over.runtime ?? runtime,
            marks: { runtime: 100, packages: 300 },
            heapBytes: 78e6,
          })
        );
      } else if (data.type === 'run') {
        out(message('progress', { id: data.id, phase: 'cells' }));
        if (over.stray) {
          out({ nonsense: true });
          out(
            message('result', {
              id: 'someone-else',
              output: '{}',
              stdout: '',
              heapBytes: 0,
              marks: {},
              runtime,
            })
          );
        }
        if (over.runError)
          return out(
            message('error', {
              id: data.id,
              code: over.runError,
              message: 'boom',
            })
          );
        out(
          message('result', {
            id: data.id,
            output: JSON.stringify(over.answer ?? answer),
            stdout: 'hello',
            heapBytes: 80e6,
            marks: { runtime: 100, packages: 300, cells: 900 },
            runtime: over.runtime ?? runtime,
          })
        );
      }
    };
    // The page-visible end: close() stops the far end too.
    if (!over.noReady)
      queueMicrotask(() =>
        out(
          message('ready', {
            build: over.build ?? PIN.build,
            probes: { origin: 'null' },
          })
        )
      );
    return {
      port: ch.port1,
      close: () => {
        log.closed = true;
        ch.port2.close();
      },
    };
  };
  return { connect, log };
}

const make = (over = {}, deps = {}) => {
  const f = fake(over);
  const states = [];
  const s = createSession({
    fetchFrame: async () => over.frameText ?? FRAME_TEXT,
    connect: f.connect,
    pin: PIN,
    onState: x => states.push(x),
    timeouts: { connect: 100, load: 150, run: 150 },
    ...deps,
  });
  return { s, f, states };
};
const prepared = {
  entry,
  notebook: { cells: ['x = 1'], hash: entry.cellsSha256 },
  input: {
    text: readFileSync(entry.input.example.path, 'utf8'),
    source: 'example',
    title: 'example',
  },
  params: { rest: 6564.6, halfwidth: 60 },
  paramsText: '{"rest":6564.6,"halfwidth":60}',
};
const fails = async (p, code) => {
  const err = await p.then(
    () => null,
    e => e
  );
  expect({ code: err?.code, message: err?.message }).toEqual({
    code,
    message: expect.any(String),
  });
};

describe('a good run', () => {
  test('starts, runs, and returns a verified capsule with the frame’s answer', async () => {
    const { s, f, states } = make();
    const started = await s.start(['numpy']);
    expect(started.runtime.version).toBe(RUNTIME.version);
    expect(states).toEqual(['verifying', 'starting', 'loading', 'ready']);
    expect(s.probes).toEqual({ origin: 'null' });
    expect(s.frame.build).toBe(PIN.build);
    const out = await s.run(prepared);
    expect(out.capsule.format).toBe('gravitas.compute-capsule');
    expect(out.capsule.frame).toEqual({
      origin: 'https://gravitas-compute.github.io',
      build: PIN.build,
    });
    expect(out.capsule.timing).toMatchObject({
      runtimeMs: 100,
      packagesMs: 200,
      cellsMs: 600,
    });
    expect(out.parts.envelope.quantities).toHaveLength(5);
    expect(out.stdout).toBe('hello');
    expect(f.log.requests).toEqual(
      ['hello', 'load', 'run'].filter(t => t !== 'hello')
    );
    s.dispose();
    expect(f.log.closed).toBe(true);
  });

  test('ignores messages that are not its own, and counts the strays', async () => {
    const { s } = make({ stray: true });
    await s.start(['numpy']);
    const out = await s.run(prepared);
    expect(out.capsule.outputs.length).toBe(2);
    expect(s.stray).toContain('bad-message');
  });

  test('runs again on the same runtime', async () => {
    const { s } = make();
    await s.start(['numpy']);
    const a = await s.run(prepared);
    const b = await s.run(prepared);
    expect(b.capsule.digest).toBe(a.capsule.digest);
  });
});

describe('every way it can go wrong, said by name', () => {
  test('offline', async () => {
    const { s } = make({}, { online: () => false });
    await fails(s.start(['numpy']), 'offline');
  });
  test('the frame document cannot be fetched', async () => {
    const { s } = make(
      {},
      {
        fetchFrame: async () => {
          throw new Error('net');
        },
      }
    );
    await fails(s.start(['numpy']), 'frame-unreachable');
  });
  test('the frame document is not the pinned bytes', async () => {
    const { s, f } = make({ frameText: `${FRAME_TEXT} ` });
    await fails(s.start(['numpy']), 'frame-version');
    expect(f.log.requests).toEqual([]);
  });
  test('the frame does not load', async () => {
    const { s } = make({ unreachable: true });
    await fails(s.start(['numpy']), 'frame-unreachable');
  });
  test('the frame reports another build', async () => {
    const { s, f } = make({ build: 'c'.repeat(64) });
    await fails(s.start(['numpy']), 'frame-version');
    expect(f.log.closed).toBe(true);
  });
  test('the frame never answers its handshake', async () => {
    const { s, f } = make({ noReady: true });
    await fails(s.start(['numpy']), 'handshake-timeout');
    expect(f.log.closed).toBe(true);
  });
  test('the runtime download fails', async () => {
    const { s } = make({ loadError: 'runtime-download' });
    await fails(s.start(['numpy']), 'runtime-download');
  });
  test('the frame says the lock file is not the pinned release', async () => {
    const { s } = make({ loadError: 'runtime-version' });
    await fails(s.start(['numpy']), 'version-mismatch');
  });
  test('the runtime it loaded is another release', async () => {
    const { s } = make({ runtime: { ...runtime, version: '999' } });
    await fails(s.start(['numpy']), 'version-mismatch');
    const t = make({ runtime: { ...runtime, lockSha256: 'e'.repeat(64) } });
    await fails(t.s.start(['numpy']), 'version-mismatch');
  });
  test('loading times out: the frame is removed', async () => {
    const { s, f } = make({ silent: true });
    await fails(s.start(['numpy']), 'timeout');
    expect(f.log.closed).toBe(true);
  });
  test('a run times out: the frame is removed and the runtime must be started again', async () => {
    const { s, f } = make({ dropRun: true });
    await s.start(['numpy']);
    await fails(s.run(prepared), 'timeout');
    expect(f.log.closed).toBe(true);
    expect(s.state).toBe('stopped');
    await fails(s.run(prepared), 'busy');
  });
  test('memory', async () => {
    const { s } = make({ runError: 'memory' });
    await s.start(['numpy']);
    await fails(s.run(prepared), 'memory');
    expect(s.state).toBe('ready');
  });
  test('a notebook that raises, with its message', async () => {
    const { s } = make({ runError: 'notebook-error' });
    await s.start(['numpy']);
    const err = await s.run(prepared).catch(e => e);
    expect(err.code).toBe('notebook-error');
    expect(err.message).toBe('boom');
  });
  test('an answer that is not what was declared is refused and never becomes a capsule', async () => {
    const { s } = make({ answer: { ...answer, extra: '1' } });
    await s.start(['numpy']);
    await fails(s.run(prepared), 'output-refused');
    const t = make({ answer: { ...answer, envelope: '{}' } });
    await t.s.start(['numpy']);
    await fails(t.s.run(prepared), 'output-refused');
  });
  test('a run before the runtime is ready, and a cancel', async () => {
    const { s } = make();
    await fails(s.run(prepared), 'busy');
    await s.start(['numpy']);
    s.cancel();
    expect(s.state).toBe('stopped');
    await fails(s.run(prepared), 'busy');
  });
  test('a cancel in the middle of a load rejects it as cancelled', async () => {
    const { s } = make({ silent: true });
    const p = s.start(['numpy']);
    await new Promise(r => setTimeout(r, 20));
    s.cancel();
    await fails(p, 'cancelled');
  });
});
