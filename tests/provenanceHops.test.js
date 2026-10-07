import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import { valid } from './jsonSchemaSubset.js';
import { FIXTURES, lightCurveObservation } from '../js/observatory/fixtures.js';
import { observationJson, openedDigest } from '../js/observatory/export.js';
import { read } from '../js/observatory/import.js';
import { validateObservation } from '../js/observatory/schema.js';
import {
  contentPayload,
  observationDigest,
} from '../js/observatory/identity.js';
import { contentDigest } from '../js/measure/pipeline.js';
import { observedEntry } from '../js/notebook/observed.js';
import {
  inferenceManifest,
  validateInference,
} from '../js/inference/manifest.js';
import { BUILTINS } from '../js/platform/builtins.js';

// =============================================================================
// The provenance hops Roadmap II Prompt 60 audited
// -----------------------------------------------------------------------------
// P68's checkpoint found ten places where a datum a pack or a lesson states is
// lost on the way to a notebook, a fit, a file or a gradebook. Each test here
// is a producer fixture and the hop after it: the datum goes in, and comes out
// the other side. Every change is additive: an older file still reads.
//
//   hop 2  guide answer          -> the entry carries the pack and a digest
//   hop 3  notebook observed     -> citations and retrieval kept
//   hop 4  inference manifest    -> data.digest
//   hop 5  arrival path          -> one digest of source, data and metadata
//   hop 6  observation save      -> the pack block
//   hop 8  submission results    -> a unit column (tests/submissionResults.test.js)
//   hop 9  time.reference        -> read from the pack, kept in the file
// =============================================================================

// Jest's realm has no WebCrypto of its own (as tests/measure.test.js).
if (!globalThis.crypto?.subtle)
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto });

const schema = name =>
  JSON.parse(readFileSync(`sdk/schemas/${name}.schema.json`, 'utf8'));
const tess = () => FIXTURES.find(f => f.id === 'tess-light-curve').load();
const HEX64 = /^[0-9a-f]{64}$/;

describe('hop 5: one identity however the observation arrives', () => {
  test('the content digest the pipeline writes did not move', async () => {
    const o = {
      kind: 'time-series',
      columns: [
        {
          id: 'time',
          unit: 'd',
          role: 'x',
          values: Float64Array.from([1, 2, NaN, 4]),
        },
        {
          id: 'flux',
          unit: '',
          role: 'value',
          values: Float64Array.from([1, 0.5, 0.25, 1]),
        },
      ],
      masks: [{ id: 'm', rows: [2] }],
      axes: { x: 'time', y: 'flux' },
    };
    // Computed with the function as it was before the payload moved.
    expect(await contentDigest(o)).toBe(
      'f2b81e3e9f139f75a5f0397b4392d1a44195b08c7b5ade7c48b28fe33d09f210'
    );
  });

  test('the same pack opened built in and installed has two ids and one digest', async () => {
    const built = await tess();
    const installed = await lightCurveObservation(
      await BUILTINS['data/tess-hd209458-s56'](),
      { idPrefix: 'installed' }
    );
    expect(built.id).not.toBe(installed.id);
    const [a, b] = await Promise.all([
      observationDigest(built),
      observationDigest(installed),
    ]);
    expect(a).toMatch(HEX64);
    expect(a).toBe(b);
    expect(await contentDigest(built)).toBe(await contentDigest(installed));
  });

  test('it changes with the data, the source, the time and the spectral metadata', async () => {
    const o = await tess();
    const base = await observationDigest(o);
    const flux = o.columns.find(c => c.id === 'flux');
    const bent = Float64Array.from(flux.values);
    bent[0] += 1e-9;
    const changed = {
      value: {
        ...o,
        columns: o.columns.map(c => (c === flux ? { ...c, values: bent } : c)),
      },
      source: { ...o, source: { ...o.source, version: '9.9.9' } },
      time: { ...o, time: { ...o.time, format: 'MJD' } },
      spectral: {
        ...o,
        spectral: {
          column: 'time',
          quantity: 'wavelength',
          medium: 'air',
          frame: 'observer',
        },
      },
    };
    for (const [what, x] of Object.entries(changed))
      expect({ what, same: (await observationDigest(x)) === base }).toEqual({
        what,
        same: false,
      });
    // The pipeline's digest is of the data alone, as it always was.
    expect(contentPayload(o).time).toBeUndefined();
  });

  test('a save names the digest of what it was opened as, and still reads without one', async () => {
    const o = await tess();
    const digest = await openedDigest(o);
    const json = JSON.parse(
      observationJson(o, { source: o, changes: [], digest })
    );
    expect(json.workspace.openedFrom.digest).toBe(digest);
    expect(valid(schema('observation-1'), json)).toBe(true);
    const old = JSON.parse(observationJson(o, { source: o, changes: [] }));
    expect(old.workspace.openedFrom.digest).toBeUndefined();
    expect(read(JSON.stringify(old), { name: 'old.json', bytes: 1 }).ok).toBe(
      true
    );
  });
});

describe('hops 6 and 9: the pack block and the time reference survive a save', () => {
  test('both come back from the file, and the file fits the schema', async () => {
    const o = await tess();
    expect(o.time.reference).toBe('BTJD = BJD - 2457000');
    const text = observationJson(o, { source: o, changes: [] });
    const saved = JSON.parse(text);
    expect(saved.pack.masks.length).toBeGreaterThan(0);
    expect(saved.pack).toEqual({ masks: o.pack.masks, crowding: null });
    expect(saved.time.reference).toBe(o.time.reference);
    expect(valid(schema('observation-1'), saved)).toBe(true);
    const back = read(text, { name: 'lc.json', bytes: text.length });
    expect(back.ok).toBe(true);
    expect(back.observation.pack).toEqual(saved.pack);
    expect(back.observation.time.reference).toBe(o.time.reference);
    expect(validateObservation(back.observation)).toEqual([]);
  });

  test('a file saved before either existed is read as it was', async () => {
    const o = await tess();
    const saved = JSON.parse(observationJson(o, { source: o, changes: [] }));
    delete saved.pack;
    delete saved.time.reference;
    const back = read(JSON.stringify(saved), { name: 'old.json', bytes: 1 });
    expect(back.ok).toBe(true);
    expect(back.observation.pack).toBeUndefined();
    expect(back.observation.time.format).toBe('BTJD');
  });

  test('a pack that counts time another way is refused, not read as BTJD', async () => {
    const mod = await BUILTINS['data/tess-hd209458-s56']();
    const other = {
      ...mod,
      PACK: { ...mod.PACK, time: { ...mod.PACK.time, reference: 'BJD' } },
    };
    await expect(lightCurveObservation(other, {})).rejects.toThrow(
      /counts time as BJD/
    );
  });
});

describe('hop 4: a fit names the data it read', () => {
  const data = {
    x: [1, 2, 3],
    y: [1, 2, 3],
    sigma: [1, 1, 1],
    columns: { x: 'time', y: 'flux', sigma: 'err' },
    units: { x: 'd', y: '' },
    counts: { total: 3, used: 3, masked: 0, missing: 0, withoutUncertainty: 0 },
  };
  const request = {
    model: { id: 'rv-keplerian' },
    parameters: {},
    settings: {},
  };

  test('data.digest is the observation digest, and the manifest is valid with or without it', async () => {
    const o = await tess();
    const digest = await observationDigest(o);
    const without = inferenceManifest(o, data, request, {});
    const withIt = inferenceManifest(o, data, request, {}, digest);
    expect(without.data.digest).toBeUndefined();
    expect(withIt.data.digest).toBe(digest);
    expect(
      validateInference(without).filter(p => /digest/.test(p.path))
    ).toEqual([]);
    expect(
      validateInference(withIt).filter(p => /digest/.test(p.path))
    ).toEqual([]);
    expect(valid(schema('inference-1').properties.data, withIt.data)).toBe(
      true
    );
  });
});

describe('hops 2 and 3: the notebook entry keeps the pack, its digest, its citations and its retrieval', () => {
  const labels = { quantity: q => q.id, note: () => '', rows: [] };
  const node = {
    tool: 'guide:exo-planet',
    version: '1.0.0',
    params: {},
    at: 0,
    quantities: [{ id: 'depth', value: 0.1228, unit: '', kind: 'measured' }],
  };

  test('what a guide captures from the open observation', async () => {
    const o = await tess();
    const digest = await observationDigest(o);
    const entry = observedEntry({
      node,
      source: o,
      digest,
      changes: [],
      title: 'guide',
      labels,
    });
    const g = entry.snapshot.observed.observation;
    expect(g.digest).toBe(digest);
    expect(g.source).toEqual({
      kind: 'pack',
      id: o.source.id,
      version: o.source.version,
    });
    expect(g.retrieved).toBe(o.retrieved);
    expect(g.citations.length).toBe(o.citations.length);
    expect(g.citations[0].text).toBe(o.citations[0].text);
  });

  test('an entry for a source with neither is as it was', () => {
    const entry = observedEntry({
      node,
      source: { id: 'x', title: 'x' },
      digest: null,
      changes: [],
      title: 't',
      labels,
    });
    const g = entry.snapshot.observed.observation;
    expect('retrieved' in g).toBe(false);
    expect('citations' in g).toBe(false);
  });
});
