// =============================================================================
// What a hostile file is refused for (Roadmap II, Prompt 67)
// -----------------------------------------------------------------------------
// The structural guard every JSON reader can call, and the pipeline reader,
// which recomputes from what a saved node says: a prototype key, a document
// nested or listed without end, a text the size of a file, and something that
// is not plain data are each refused with where they were found.
// =============================================================================

import { Buffer } from 'node:buffer';
import { describe, test, expect } from '@jest/globals';

import { plainDataProblem, parseDocument } from '../js/platform/common.js';
import {
  decodePayload,
  decodeTagged,
  parseDocument as parseLink,
} from '../js/shareState.js';
import { readAssignmentFile } from '../js/assignments/assignmentLink.js';
import * as notebook from '../js/notebook/store.js';
import { readPipeline } from '../js/measure/pipeline.js';
import { importManifest } from '../js/experiments/exports.js';
import { readResults } from '../js/submission/results.js';

describe('plain, bounded data', () => {
  test('what a saved document holds is plain', () => {
    expect(
      plainDataProblem({ a: 1, b: [1, 2, { c: 'x' }], d: null, e: true })
    ).toBe(null);
  });

  test('a prototype key is refused wherever it is, as JSON.parse makes one', () => {
    expect(plainDataProblem(JSON.parse('{"__proto__": {"x": 1}}'))).toBe(
      '__proto__: a prototype key'
    );
    expect(
      plainDataProblem(JSON.parse('{"a": [{"constructor": {}}]}'), {}, 'params')
    ).toBe('params.a[0].constructor: a prototype key');
  });

  test('without end is refused', () => {
    let deep = 1;
    for (let i = 0; i < 10; i++) deep = [deep];
    expect(plainDataProblem(deep)).toMatch(/nested too deep/);
    expect(plainDataProblem(new Array(5000).fill(0))).toMatch(
      /more than 1000 items/
    );
    expect(plainDataProblem('x'.repeat(2000))).toMatch(/longer than 1000/);
  });

  test('what is not data is refused', () => {
    expect(plainDataProblem(Infinity)).toMatch(/finite/);
    expect(plainDataProblem(new Date())).toMatch(/not plain data/);
    expect(plainDataProblem(() => 1)).toMatch(/not plain data/);
  });
});

describe('a saved pipeline', () => {
  const doc = params =>
    JSON.stringify({
      format: 'gravitas.pipeline',
      formatVersion: 1,
      workspace: {},
      nodes: [{ id: 'm1', tool: 'period', at: 0, params }],
    });

  test('opens when its parameters are plain', () => {
    expect(readPipeline(doc({ minPeriod: 0.3, maxPeriod: 1.2 })).ok).toBe(true);
  });

  test('is refused when a node’s parameters are not, with where', () => {
    const bad = readPipeline(
      doc({ minPeriod: 0.3, __proto__x: 1 }).replace('__proto__x', '__proto__')
    );
    expect(bad).toMatchObject({
      ok: false,
      code: 'badNode',
      detail: { id: 'm1', why: 'params.__proto__: a prototype key' },
    });
    expect(readPipeline(doc('everything')).detail.why).toBe(
      'params: not an object'
    );
  });
});

describe('a saved pipeline against its tool’s declared schema', () => {
  const node = (tool, params) =>
    JSON.stringify({
      format: 'gravitas.pipeline',
      formatVersion: 1,
      workspace: {},
      nodes: [{ id: 'm7', tool, at: 0, params }],
    });

  test('refuses a wrong kind of value, with the path', () => {
    expect(readPipeline(node('period', { minPeriod: '0.3' }))).toMatchObject({
      ok: false,
      code: 'badParams',
      detail: { id: 'm7', path: 'params.minPeriod' },
    });
    expect(readPipeline(node('line', { blue: [1, 'x'] })).detail.path).toBe(
      'params.blue[1]'
    );
    expect(readPipeline(node('line', { blue: [1, 2, 3] })).detail.why).toMatch(
      /expected 2 items, found 3/
    );
    expect(readPipeline(node('curve', { model: { id: 7 } })).detail.path).toBe(
      'params.model.id'
    );
    expect(
      readPipeline(node('filter', { conditions: [{ column: 's', op: {} }] }))
        .detail.path
    ).toBe('params.conditions[0].op');
    expect(readPipeline(node('aperture', { bit: 1.5 })).code).toBe('badParams');
    expect(readPipeline(node('describe', { column: ['a'] })).code).toBe(
      'badParams'
    );
    expect(readPipeline(node('match', { how: 'sky' })).detail.path).toBe(
      'params.how'
    );
  });

  test('reads what the panel writes, nulls and missing keys included', () => {
    for (const [tool, params] of [
      ['period', { minPeriod: 0.3, maxPeriod: 1.2, oversample: 10 }],
      ['period', {}],
      ['box', { minPeriod: 1, maxPeriod: 10, durations: [0.08, 0.12] }],
      [
        'line',
        {
          blue: [1, 2],
          line: [2, 3],
          red: [3, 4],
          rest: null,
          restMedium: null,
        },
      ],
      [
        'band',
        { band: [1, 2], reference: [[3, 4]], medium: 'air', cite: null },
      ],
      ['aperture', { mode: 'bits', bit: 2 }],
      [
        'aperture',
        { mode: 'flux', x: 1, y: 2, r: 3, rIn: 4, rOut: 5, gain: null },
      ],
      ['describe', { column: '' }],
      [
        'filter',
        {
          conditions: [
            { column: 'a', op: '>', value: 1, unit: null },
            { column: 'b', op: 'contains', value: 'x', unit: null },
          ],
          join: 'all',
        },
      ],
      [
        'match',
        {
          how: {
            by: 'sky',
            a: ['ra', 'dec'],
            b: ['ra', 'dec'],
            radiusArcsec: 2,
          },
        },
      ],
      ['match', { how: { by: 'value', a: 'id', b: 'id', tolerance: 0 } }],
    ])
      expect(readPipeline(node(tool, params)).ok).toBe(true);
  });
});

describe('the other readers of a file', () => {
  const PROTO = '{"__proto__": {"polluted": true}}';

  test('an experiment file with a prototype key is refused', () => {
    expect(
      importManifest(
        `{"format": "gravitas-experiment", "version": 1, "a": ${PROTO}}`
      )
    ).toMatchObject({ ok: false, reason: 'not-plain-data' });
  });

  test('a results file with a prototype key is refused', () => {
    expect(
      readResults(`{"kind": "gravitas.submission-results", "x": ${PROTO}}`)
    ).toEqual({ ok: false, reason: 'notPlainData' });
  });

  test('an observation file with a prototype key is refused, with where', async () => {
    const { read } = await import('../js/observatory/import.js');
    const r = await read(
      `{"format": "gravitas.observation", "formatVersion": 1, "meta": ${PROTO}}`,
      { name: 'x.json' }
    );
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r)).toMatch(/meta.__proto__: a prototype key/);
  });

  test('nothing was polluted along the way', () => {
    expect({}.polluted).toBeUndefined();
  });
});

describe('the guard on every document a student opens', () => {
  const PROTO = '{"a": 1, "__proto__": {"polluted": true}}';
  const deep = n => '['.repeat(n) + ']'.repeat(n);
  const link = text => `1r${Buffer.from(text).toString('base64url')}`;
  const memory = items => ({
    getItem: k => (k in items ? items[k] : null),
    setItem: (k, v) => {
      items[k] = String(v);
    },
    removeItem: k => {
      delete items[k];
    },
    key: i => Object.keys(items)[i] ?? null,
    get length() {
      return Object.keys(items).length;
    },
  });

  test('parseDocument reads what JSON.parse reads and refuses the rest', () => {
    expect(parseDocument('{"a": [1, "x", null, true]}')).toEqual({
      a: [1, 'x', null, true],
    });
    // The full guard (js/platform/common.js) and the lean copy on the
    // start-up path (js/shareState.js) refuse the same fixtures.
    for (const read of [parseDocument, parseLink]) {
      expect(read('null')).toBe(null);
      expect(() => read('{')).toThrow(SyntaxError);
      for (const bad of [PROTO, '{"constructor": {}}', deep(40), '1e999']) {
        let caught;
        try {
          read(bad);
        } catch (err) {
          caught = err;
        }
        expect(caught).toBeInstanceOf(SyntaxError);
        expect(caught.code).toBe('notPlainData');
      }
      expect(() => read(deep(20))).not.toThrow();
    }
  });

  test('an assignment file with a prototype key is not read', () => {
    expect(readAssignmentFile(PROTO)).toMatchObject({
      ok: false,
      reason: 'notJson',
    });
  });

  test('a link with a prototype key is refused, by name', async () => {
    await expect(
      decodeTagged('a', `a1r${link(PROTO).slice(2)}`, 2)
    ).rejects.toThrow('corrupt');
    await expect(
      decodePayload(link('{"s": "None", "__proto__": {"polluted": 1}}'))
    ).rejects.toThrow('That link holds data Gravitas will not read.');
    await expect(decodePayload(link(deep(60)))).rejects.toThrow(
      'will not read'
    );
  });

  test('a link of plain data still decodes', async () => {
    const p = await decodePayload(link('{"s": "None", "w": [1, 2]}'));
    expect(p.s).toBe('None');
  });

  test('a stored notebook with a prototype key is unreadable, not merged', () => {
    notebook.setBackend(memory({ [notebook.KEY]: PROTO }));
    expect(notebook.load()).toMatchObject({ ok: false, reason: 'unreadable' });
    notebook.setBackend(
      memory({ [notebook.KEY]: '{"v": 1, "entries": [{"id": "a"}]}' })
    );
    expect(notebook.load()).toMatchObject({ ok: true });
    notebook.setBackend(null);
  });

  test('nothing was polluted by any of it', () => {
    expect({}.polluted).toBeUndefined();
  });
});
