// =============================================================================
// gravitas-compute/1: the messages between the compute page and its frame
// -----------------------------------------------------------------------------
// Fixtures of every message each side sends, read by js/compute/messages.js
// and held to sdk/schemas/compute-messages-1.schema.json; and the refusals the
// frame and the page both depend on: a wrong side, another key, a field of the
// wrong type, a string past its bound.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';

import { valid } from './jsonSchemaSubset.js';
import { isItsRow } from './schemaCorpus.js';
import * as M from '../js/compute/messages.js';

const schema = JSON.parse(
  readFileSync('sdk/schemas/compute-messages-1.schema.json', 'utf8')
);
const HEX = 'a'.repeat(64);
const runtime = {
  name: 'pyodide',
  version: '314.0.7',
  python: '3.14.2',
  lockSha256: HEX,
  packages: { numpy: '2.4.6' },
};
const m = (type, fields = {}) => M.message(type, fields);

const FIXTURES = {
  page: [
    m('hello'),
    m('load', { id: 'load-1', packages: ['numpy', 'matplotlib'] }),
    m('run', {
      id: 'run-1.a:b_c',
      input: '{"a":1}',
      params: '{"sigma":5}',
      cells: ['x = 1', 'y = 2'],
      packages: ['numpy'],
    }),
    m('cancel', { id: 'run-1' }),
  ],
  frame: [
    m('ready', {
      build: HEX,
      probes: { origin: 'null', localStorage: 'refused (SecurityError)' },
    }),
    m('loaded', {
      id: 'load-1',
      runtime,
      marks: { runtime: 1200, packages: 3400 },
      heapBytes: 78_000_000,
    }),
    m('progress', { id: 'run-1', phase: 'cells' }),
    m('result', {
      id: 'run-1',
      output: '{"envelope":"{}"}',
      stdout: 'ok',
      heapBytes: 1,
      marks: { cells: 5 },
      runtime,
    }),
    m('error', { id: 'run-1', code: 'memory', message: 'out of memory' }),
    m('error', { id: null, code: 'invalid-request', message: 'refused' }),
  ],
};

describe('the schema', () => {
  test('is its row in FORMATS.md, at the version the code writes', () =>
    isItsRow(
      'compute-messages-1',
      'gravitas-compute messages',
      M.PROTOCOL_VERSION
    ));

  test.each(
    Object.entries(FIXTURES).flatMap(([from, list]) =>
      list.map(x => [from, x.type, x])
    )
  )('%s %s fits the schema and the reader', (from, type, msg) => {
    expect(valid(schema, msg)).toBe(true);
    expect(M.readMessage(msg, from)).toEqual({ ok: true, message: msg });
  });
});

describe('the reader', () => {
  const run = FIXTURES.page[2];
  const refused = (doc, from, code) => {
    const r = M.readMessage(doc, from);
    expect({ ok: r.ok, code: r.code }).toEqual({ ok: false, code });
    // The schema refuses what the reader refuses, except a wrong side, which is not a shape.
    if (code !== 'unknown-type') expect(valid(schema, doc)).toBe(false);
  };

  test('refuses a message from the wrong side', () => {
    refused(FIXTURES.frame[0], 'page', 'unknown-type');
    refused(run, 'frame', 'unknown-type');
  });
  test('refuses what is not a message', () => {
    for (const x of [null, 'run', 42, [run], undefined])
      expect(M.readMessage(x, 'page').ok).toBe(false);
    refused({ ...run, protocol: 'other' }, 'page', 'bad-message');
    refused({ ...run, version: 2 }, 'page', 'unsupported-version');
    refused({ ...run, type: 'eval' }, 'page', 'unknown-type');
    refused({ ...run, type: 'constructor' }, 'page', 'unknown-type');
  });
  test('refuses another key, a missing key and a wrong type', () => {
    refused({ ...run, extra: 1 }, 'page', 'bad-field');
    refused({ ...run, __proto__x: 1 }, 'page', 'bad-field');
    const { cells, ...noCells } = run;
    void cells;
    refused(noCells, 'page', 'bad-field');
    refused({ ...run, cells: 'x = 1' }, 'page', 'bad-field');
    refused({ ...run, packages: ['scipy'] }, 'page', 'bad-field');
    refused({ ...run, id: 'has space' }, 'page', 'bad-field');
  });
  test('refuses a string past its bound, and accepts one at it', () => {
    const at = { ...run, input: 'x'.repeat(M.LIMITS.input) };
    expect(M.readMessage(at, 'page').ok).toBe(true);
    refused(
      { ...run, input: 'x'.repeat(M.LIMITS.input + 1) },
      'page',
      'bad-field'
    );
    refused(
      { ...run, params: 'x'.repeat(M.LIMITS.params + 1) },
      'page',
      'bad-field'
    );
    refused(
      { ...run, cells: ['x'.repeat(M.LIMITS.cell + 1)] },
      'page',
      'bad-field'
    );
    refused(
      { ...run, cells: Array(M.LIMITS.cells + 1).fill('x') },
      'page',
      'bad-field'
    );
    const result = FIXTURES.frame[3];
    refused(
      { ...result, output: 'x'.repeat(M.LIMITS.output + 1) },
      'frame',
      'bad-field'
    );
    refused(
      { ...result, stdout: 'x'.repeat(M.LIMITS.stdout + 1) },
      'frame',
      'bad-field'
    );
  });
  test('refuses a frame message with an unknown error code or a bad build', () => {
    refused({ ...FIXTURES.frame[4], code: 'oops' }, 'frame', 'bad-field');
    refused({ ...FIXTURES.frame[0], build: 'abc' }, 'frame', 'bad-field');
    refused(
      { ...FIXTURES.frame[0], probes: { origin: 'x'.repeat(81) } },
      'frame',
      'bad-field'
    );
  });
  test('refuses an object with another prototype', () => {
    expect(M.readMessage(Object.create({ ...run }), 'page').ok).toBe(false);
  });
  test('says which types each side may send', () => {
    expect(M.PAGE_TYPES).toEqual(['hello', 'load', 'run', 'cancel']);
    expect(M.FRAME_TYPES).toEqual([
      'ready',
      'loaded',
      'progress',
      'result',
      'error',
    ]);
  });
});
