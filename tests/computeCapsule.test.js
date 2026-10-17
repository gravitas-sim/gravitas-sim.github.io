// =============================================================================
// gravitas.compute-capsule/1: a run, recorded and checked again
// -----------------------------------------------------------------------------
// A capsule built from what the vendored notebooks really returned round-trips
// through its file, verifies, and is refused when any byte it depends on is
// changed; the "run it yourself" notebook carries the input, the reviewed cells
// and a verification cell.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import './computeSetup.js';
import { readFileSync } from 'node:fs';

import { valid } from './jsonSchemaSubset.js';
import { isItsRow } from './schemaCorpus.js';
import { entryOf } from '../js/compute/catalogue.js';
import * as C from '../js/compute/capsule.js';
import { checkOutput } from '../js/compute/check.js';
import { RUNTIME } from '../js/compute/runtime.js';

const schema = JSON.parse(
  readFileSync('sdk/schemas/compute-capsule-1.schema.json', 'utf8')
);
const clone = v => JSON.parse(JSON.stringify(v));
const answer = id =>
  JSON.parse(readFileSync(`tests/fixtures/compute/${id}.answer.json`, 'utf8'));
const runtime = {
  name: 'pyodide',
  version: RUNTIME.version,
  python: RUNTIME.python,
  lockSha256: RUNTIME.lockSha256,
  packages: { numpy: '2.4.6', matplotlib: '3.10.8' },
};

async function made(id = 'transit-times', over = {}) {
  const entry = entryOf(id);
  const text = readFileSync(entry.input.example.path, 'utf8');
  const checked = checkOutput(JSON.stringify(answer(id)), entry.outputs);
  expect(checked.ok).toBe(true);
  const capsule = await C.buildCapsule({
    entry,
    inputs: [
      {
        name: 'observation',
        text,
        format: 'gravitas.observation/1',
        source: 'example',
        title: 'example',
      },
    ],
    params:
      id === 'transit-times' ? { sigma: 5 } : { rest: 6564.6, halfwidth: 60 },
    checked,
    runtime,
    frame: {
      origin: 'https://gravitas-compute.github.io',
      build: 'b'.repeat(64),
    },
    timing: {
      runtimeMs: 2500,
      packagesMs: 4000,
      cellsMs: 900,
      totalMs: 7400,
      downloadBytes: 19_000_000,
    },
    cellsSha256: entry.cellsSha256,
    cellCount: entry.cells,
    at: '2026-10-11T12:00:00.000Z',
    citations: [
      ...entry.citations,
      { text: 'the input’s own citation' },
      entry.citations[0],
    ],
    ...over,
  });
  return { capsule, entry, text };
}

test('the schema is its row in FORMATS.md, at the version the code writes', () =>
  isItsRow('compute-capsule-1', 'gravitas.compute-capsule', C.FORMAT_VERSION));

describe('a capsule', () => {
  test('fits its schema and its structural check, and names every output by hash', async () => {
    const { capsule, entry } = await made();
    expect(valid(schema, capsule)).toBe(true);
    expect(C.validateCapsule(capsule)).toEqual([]);
    expect(capsule.outputs.map(o => o.name)).toEqual([
      'envelope',
      'table',
      'figure',
    ]);
    expect(capsule.notebook.cellsSha256).toBe(entry.cellsSha256);
    expect(capsule.inputs[0].sha256).toMatch(/^[0-9a-f]{64}$/);
    // Citations once each.
    expect(new Set(capsule.citations.map(c => c.text)).size).toBe(
      capsule.citations.length
    );
  });

  test('has the same digest for the same computation, whatever the clock, timing or frame', async () => {
    const a = (await made()).capsule;
    const b = (
      await made('transit-times', {
        at: '2030-01-01T00:00:00.000Z',
        timing: {
          runtimeMs: 1,
          packagesMs: 1,
          cellsMs: 1,
          totalMs: 3,
          downloadBytes: 0,
        },
        frame: { origin: 'https://example.invalid', build: 'c'.repeat(64) },
      })
    ).capsule;
    expect(b.digest).toBe(a.digest);
    const other = (await made('line-centroid')).capsule;
    expect(other.digest).not.toBe(a.digest);
  });

  test('round-trips through its file and verifies', async () => {
    const { capsule } = await made();
    const read = C.readCapsule(C.capsuleFile(capsule));
    expect(read.ok).toBe(true);
    expect(read.capsule).toEqual(capsule);
    const v = await C.verifyCapsule(read.capsule, entryOf);
    expect(v).toMatchObject({ ok: true, problems: [], warnings: [] });
    expect(v.parts.envelope.quantities.length).toBe(4);
    expect(v.parts.figure.type).toBe('image/png');
  });

  test('both vendored notebooks verify', async () => {
    const { capsule } = await made('line-centroid');
    expect((await C.verifyCapsule(capsule, entryOf)).ok).toBe(true);
  });

  test('is refused when anything it depends on changes', async () => {
    const { capsule } = await made();
    const why = async edit => {
      const c = clone(capsule);
      edit(c);
      return (await C.verifyCapsule(c, entryOf)).problems.join('|');
    };
    expect(
      await why(
        c => (c.outputs[0].text = c.outputs[0].text.replace('3.5238', '3.5239'))
      )
    ).toMatch(/envelope does not match its hash/);
    expect(await why(c => (c.notebook.cellsSha256 = 'f'.repeat(64)))).toMatch(
      /not the one in the catalogue/
    );
    expect(await why(c => (c.notebook.id = 'nope'))).toMatch(
      /not in the catalogue/
    );
    expect(await why(c => (c.params.sigma = 6))).toMatch(
      /digest does not match/
    );
    expect(await why(c => (c.inputs[0].sha256 = '0'.repeat(64)))).toMatch(
      /digest does not match/
    );
    expect(await why(c => (c.runtime.version = '1.0.0'))).toMatch(
      /digest does not match/
    );
    // An answer that is not what the notebook declares, even with its hashes made good.
    const c = clone(capsule);
    const env = JSON.parse(c.outputs[0].text);
    env.quantities[0].unit = 'h';
    c.outputs[0].text = JSON.stringify(env);
    c.outputs[0].sha256 = await (
      await import('../js/hash.js')
    ).sha256Hex(c.outputs[0].text);
    expect((await C.verifyCapsule(c, entryOf)).problems.join('|')).toMatch(
      /declared/
    );
  });

  test('says when it was made by another runtime release, without refusing it', async () => {
    const { capsule } = await made('transit-times', {
      runtime: { ...runtime, version: '999.0.0' },
    });
    const v = await C.verifyCapsule(capsule, entryOf);
    expect(v.ok).toBe(true);
    expect(v.warnings.join()).toMatch(/999\.0\.0/);
  });

  test('is read by reason: not JSON, too large, malformed, a newer version', async () => {
    const { capsule } = await made();
    expect(C.readCapsule('{').code).toBe('not-json');
    expect(C.readCapsule('x'.repeat(C.MAX_CAPSULE_CHARS + 1)).code).toBe(
      'too-large'
    );
    expect(C.readCapsule('{"format":"gravitas.compute-capsule"}').code).toBe(
      'invalid'
    );
    expect(
      C.readCapsule(JSON.stringify({ ...capsule, formatVersion: 2 })).code
    ).toBe('newer');
    expect(
      C.readCapsule(JSON.stringify({ ...capsule, format: 'other' })).ok
    ).toBe(false);
    const bad = clone(capsule);
    bad.outputs[0].name = 'script';
    expect(C.validateCapsule(bad).length).toBeGreaterThan(0);
    expect(valid(schema, bad)).toBe(false);
  });
});

describe('the run-it-yourself notebook', () => {
  test('holds the input, the reviewed cells and a verification cell', async () => {
    const { capsule, entry, text } = await made('line-centroid');
    const nb = JSON.parse(readFileSync(entry.notebook, 'utf8'));
    const cells = C.cellsOf(nb);
    const out = C.localNotebook({
      capsule,
      cells,
      inputs: { observation: text },
      params: '{"rest":6564.6,"halfwidth":60}',
    });
    expect(out.nbformat).toBe(4);
    expect(out.cells.map(c => c.cell_type)).toEqual([
      'markdown',
      'code',
      ...cells.map(() => 'code'),
      'code',
    ]);
    expect(C.cellsOf(out).slice(1, -1)).toEqual(cells);
    const setup = out.cells[1].source.join('');
    const b64 = /gravitas_input = base64\.b64decode\("([^"]+)"\)/.exec(
      setup
    )[1];
    expect(Buffer.from(b64, 'base64').toString('utf8')).toBe(text);
    const verify = out.cells.at(-1).source.join('');
    for (const o of capsule.outputs) expect(verify).toContain(o.sha256);
    expect(verify).toContain('MATCH');
    expect(out.cells[0].source.join('')).toContain(capsule.digest);
  });
});
