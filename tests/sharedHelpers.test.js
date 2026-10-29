// =============================================================================
// js/hash.js and js/platform/common.js against every copy they replace
// -----------------------------------------------------------------------------
// Most of what the hash copies write is kept: storage keys, world seeds,
// assignment links, notebook fingerprints. So each shared form is proved
// equal to each exported copy on a corpus built to hit the edges (empty text,
// non-ASCII and astral characters, float noise, -0, non-finite numbers,
// undefined keys, nesting), before any copy becomes an import. The copies that
// are not exported are held by their source instead: the same FNV-1a loop,
// read from the file. And every copied id and version pattern is held to
// common.js's.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { Buffer } from 'node:buffer';
import { readFileSync, readdirSync } from 'node:fs';
import { webcrypto } from 'node:crypto';

import {
  canonicalJson,
  canonicalJsonExact,
  fnv1a32,
  fnvBase36,
  fnvHex8,
  sha256Hex,
} from '../js/hash.js';
import {
  PACKAGE_ID,
  PUBLIC_ID,
  SEMVER,
  readVersioned,
  reporter,
} from '../js/platform/common.js';
import * as state from '../js/experiments/canonicalState.js';
import { experimentHash } from '../js/experiments/experimentManifest.js';
import { snapshotFingerprint } from '../js/notebook/entry.js';
import { shortHash } from '../js/assignments/assignment.js';
import { digest } from '../js/composer/compile.js';
import { normalizeSeed } from '../js/rng.js';
import { scheduleFingerprint } from '../js/rvSchedule.js';

// jsdom's crypto has no subtle digest, so the test lends Node's; and Node 20's
// WebCrypto refuses another realm's ArrayBuffer, so the bytes are copied into
// a Node buffer first (tests/lab3d.test.js).
if (!globalThis.crypto?.subtle)
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      subtle: {
        digest: (alg, data) =>
          webcrypto.subtle.digest(
            alg,
            Buffer.from(
              ArrayBuffer.isView(data)
                ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
                : new Uint8Array(data)
            )
          ),
      },
    },
    configurable: true,
  });

const TEXTS = [
  '',
  'a',
  'orbit1',
  'orbit2',
  'Kepler’s second law',
  'órbita — Tierra ☉ 🪐',
  'x'.repeat(5000),
  '{"a":1}',
];

const VALUES = [
  null,
  0,
  -0,
  1 / 3,
  0.1 + 0.2,
  1e-300,
  -123456789.123456789,
  NaN,
  Infinity,
  'text',
  true,
  [],
  [1, [2, [3]]],
  {},
  { b: 1, a: 2 },
  { a: undefined, b: null, c: [undefined, 1] },
  { nested: { z: 0.30000000000000004, y: -0, x: 'é' } },
];

describe('FNV-1a', () => {
  test('each exported copy is the shared one', () => {
    for (const t of TEXTS) {
      expect(shortHash(t)).toBe(fnvHex8(t));
      expect(digest(t)).toBe(fnvHex8(t));
      if (!/^\d+$/.test(t.trim()) && t.trim() !== '')
        expect(normalizeSeed(t)).toBe(fnv1a32(t.trim()));
    }
  });

  test('the forms are the ones the copies write', () => {
    expect(fnvHex8('')).toBe('811c9dc5');
    expect(fnvHex8('a')).toMatch(/^[0-9a-f]{8}$/);
    expect(fnvBase36('a')).toMatch(/^[0-9A-Z]{7}$/);
  });

  test('a schedule fingerprint is the base-36 form over its epochs', () => {
    const plan = {
      epochs: [
        { index: 0, offset: 0.1 + 0.2 },
        { index: 3, offset: 12.5 },
      ],
    };
    expect(scheduleFingerprint(plan)).toBe(
      fnvBase36(
        plan.epochs.map(e => `${e.index}:${e.offset.toPrecision(12)}`).join('|')
      )
    );
  });

  test('the loop is spelled out only where a decision says so', () => {
    // Prompt 143 Part A: a content hash (a link, a key, a fingerprint, a
    // digest) is js/hash.js's wherever importing it costs no route a request.
    // What still spells the basis is listed with its reason; a new one is a
    // decision.
    const KEPT = {
      'js/hash.js': 'the one',
      'js/rng.js': 'the world seed; an instructor-bundle source',
      'js/assignments/assignment.js': 'an instructor-bundle source',
      'js/analysis/stats.js':
        'the seed of an analysis stream, spelled as js/rng.js seeds',
      'js/bodyVisuals.js': 'a silhouette seed: the basis xor the body id',
      'js/analysis/modelCompare.js':
        'a fit data key over the bytes of floats: a bytes form of the loop in hash.js would add 0.3 KB to every route that has the module, for one caller',
      'js/instructorNotes.js':
        'an instructor-bundle source: importing js/hash.js (or js/composer/compile.js) adds a file to the bundle closure, which tests/instructorDigest.test.js holds under 286 files and 285 are in use (D-R10-67, D-R10-74, D-R10-81, D-R10-205-03, D-R10-206-02, D-R10-208-02); tests/instructorNotes.test.js holds the copy equal to the ledger digest',
      'js/composer/compile.js':
        'a request on the composer and the course-packs routes (D-R10-19)',
      'js/experiments/canonicalState.js':
        'a request on eleven sources routes, the front door among them (D-R10-19)',
      'js/experiments/experimentManifest.js':
        'a request on the experiments route (D-R10-19)',
      'js/experiments/trialRunner.js':
        'a request on the experiments route (D-R10-19)',
    };
    const spellsIt = [];
    const walk = dir => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = `${dir}/${e.name}`;
        if (e.isDirectory()) walk(p);
        else if (
          p.endsWith('.js') &&
          readFileSync(p, 'utf8').includes('0x811c9dc5')
        )
          spellsIt.push(p);
      }
    };
    walk('js');
    expect(spellsIt.sort()).toEqual(Object.keys(KEPT).sort());
  });

  test('digests run on across pieces, so a stream of pieces is their concatenation', () => {
    // The fit workspace's inputs key and the engine's fingerprint fed the loop
    // piece by piece; each is now one text. Proved on the loop as it was.
    const piecewise = pieces => {
      let h = 0x811c9dc5;
      for (const piece of pieces)
        for (let i = 0; i < piece.length; i++) {
          h ^= piece.charCodeAt(i);
          h = Math.imul(h, 0x01000193);
        }
      return h >>> 0;
    };
    for (const pieces of [
      [],
      [''],
      ['a', 'b', 'c'],
      ['target', '3', '40', '1.23456789012', '-4.5', '', 'good'],
      ['é', '😀', 'x'.repeat(300)],
    ])
      expect(fnv1a32(pieces.join(''))).toBe(piecewise(pieces));
  });
});

describe('the digests v3 wrote, as recorded then', () => {
  // Recorded by running v3 (c83e2040, before Prompt 143) over these
  // inputs; the functions now build on js/hash.js and must return them.
  const IN = [
    '',
    'a',
    'abc',
    ' spaced ',
    'orbit1',
    'orbit2',
    'é',
    'naïve café',
    '日本語',
    '😀 astral',
    '\u0000',
    'line\nbreak',
    '{"a":1}',
    'x'.repeat(5000),
    '12345',
    '-0',
    'The Chirp: step 3/7',
  ];
  const OBJ = [
    [],
    [1, [2, [3]]],
    {},
    { b: 1, a: 2 },
    { a: undefined, b: null, c: [undefined, 1] },
    { nested: { z: 0.30000000000000004, y: -0, x: 'é' } },
  ];
  const WANT = {
    shortHash: [
      '811c9dc5',
      'e40c292c',
      '1a47e90b',
      '595022e7',
      'ce6f135a',
      'cd6f11c7',
      '6c0b6c44',
      '76745c95',
      '5406374e',
      'e56e8f7f',
      '050c5d1f',
      '1f7562aa',
      '8b9e4511',
      '616035e5',
      '43c2c0d8',
      '13cd0898',
      'aff4cc3f',
    ],
    digest: [
      '811c9dc5',
      'e40c292c',
      '1a47e90b',
      '595022e7',
      'ce6f135a',
      'cd6f11c7',
      '6c0b6c44',
      '76745c95',
      '5406374e',
      'e56e8f7f',
      '050c5d1f',
      '1f7562aa',
      '8b9e4511',
      '616035e5',
      '43c2c0d8',
      '13cd0898',
      'aff4cc3f',
    ],
    hashState: [
      '5465b825',
      '070e19fa',
      '5465b825',
      'af62f0e3',
      '307f4b12',
      'e686cca5',
    ],
    experimentHash: [
      '741638a5',
      'd47b3d89',
      '5465b825',
      'af62f0e3',
      '014941cb',
      'e686cca5',
    ],
    snapshot: [
      '0W7K42T',
      '1MYF155',
      '0NF0RVP',
      '1CNVX7N',
      '12K02Z3',
      '15VP5SH',
    ],
    schedule: ['0ZTNTFP', '17A5E77', '0DH4X4Q', '0ZTNTFP'],
    dataKey: [
      '40:dc89e42f',
      '40:7431c507',
      '1:1f03da9d',
      '0:cc55e280',
      '3:3ed8aa8c',
    ],
  };

  test('assignment links, translation digests', () => {
    expect(IN.map(shortHash)).toEqual(WANT.shortHash);
    expect(IN.map(digest)).toEqual(WANT.digest);
  });

  test('an initial state, an experiment and a notebook snapshot', () => {
    expect(OBJ.map(v => state.hashState(v))).toEqual(WANT.hashState);
    expect(OBJ.map(v => experimentHash(v))).toEqual(WANT.experimentHash);
    expect(OBJ.map(v => snapshotFingerprint(v))).toEqual(WANT.snapshot);
  });

  test('a schedule', () => {
    const plans = [
      { epochs: [] },
      {
        epochs: [
          { index: 0, offset: 0.1 + 0.2 },
          { index: 3, offset: 12.5 },
        ],
      },
      {
        epochs: Array.from({ length: 400 }, (_, i) => ({
          index: i,
          offset: i * 0.3137 + 1 / 7,
        })),
      },
      null,
    ];
    expect(plans.map(scheduleFingerprint)).toEqual(WANT.schedule);
  });
});

describe('canonical JSON', () => {
  test('the rounded form is the experiments’ own, on every value', () => {
    for (const v of VALUES)
      expect(canonicalJson(v)).toBe(state.canonicalJson(v));
  });

  test('an initial state and an experiment hash as before', () => {
    const payload = {
      v: 1,
      s: 'Binary Pair',
      seed: 'e2e',
      b: [[1, 0.1 + 0.2]],
    };
    expect(state.hashState(payload)).toBe(
      fnvHex8(canonicalJson(state.stripVolatile(payload)))
    );
    for (const v of VALUES.filter(x => x && typeof x === 'object'))
      expect(experimentHash(v)).toBe(fnvHex8(canonicalJson(v)));
  });

  test('the exact form is the notebook’s, so a fingerprint is unchanged', () => {
    for (const v of VALUES.filter(x => x && typeof x === 'object'))
      expect(snapshotFingerprint(v)).toBe(fnvBase36(canonicalJsonExact(v)));
  });

  test('the two forms differ where they should', () => {
    expect(canonicalJson({ a: undefined, x: 0.1 + 0.2 })).toBe('{"x":0.3}');
    expect(canonicalJsonExact({ x: 0.1 + 0.2 })).toBe(
      '{"x":0.30000000000000004}'
    );
  });
});

test('SHA-256 over text and over bytes', async () => {
  const empty =
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  expect(await sha256Hex('')).toBe(empty);
  expect(await sha256Hex(new Uint8Array(0))).toBe(empty);
  expect(await sha256Hex('abc')).toBe(
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
  );
});

test('every copied id and version pattern is the shared one', () => {
  const files = [
    'js/course/pack.js',
    'js/platform/course.js',
    'js/platform/investigation.js',
    'js/platform/manifest.js',
    'js/platform/questionBank.js',
    'js/platform/scenario.js',
    'tools/data-packs/schema.mjs',
  ];
  const shared = { PUBLIC_ID, SEMVER, PACKAGE_ID };
  let seen = 0;
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(
      /const (PUBLIC_ID|SEMVER|PACKAGE_ID) = (\/.+\/);/g
    )) {
      expect({ file, [m[1]]: m[2] }).toEqual({
        file,
        [m[1]]: String(shared[m[1]]),
      });
      seen++;
    }
  }
  expect(seen).toBe(13);
});

describe('readVersioned', () => {
  const rules = {
    format: 'gravitas.thing',
    current: 3,
    min: 1,
    migrations: {
      1: d => ({ ...d, formatVersion: 2, b: d.a * 2 }),
      2: d => ({ doc: { ...d, formatVersion: 3 }, notes: ['c added'] }),
    },
  };

  test('the current version is read as it is', () => {
    const doc = { format: 'gravitas.thing', formatVersion: 3, a: 1 };
    expect(readVersioned(doc, rules)).toEqual({
      ok: true,
      doc,
      migrated: false,
      notes: [],
    });
  });

  test('an older one through each migration in turn', () => {
    const r = readVersioned(
      { format: 'gravitas.thing', formatVersion: 1, a: 2 },
      rules
    );
    expect(r).toEqual({
      ok: true,
      doc: { format: 'gravitas.thing', formatVersion: 3, a: 2, b: 4 },
      migrated: true,
      notes: ['c added'],
    });
  });

  test('a newer one, another format, or none is refused with a reason', () => {
    const newer = readVersioned(
      { format: 'gravitas.thing', formatVersion: 4 },
      rules
    );
    expect(newer).toMatchObject({ ok: false, reason: 'newer' });
    expect(newer.message).toMatch(/newer version of Gravitas/);
    expect(readVersioned({ format: 'x', formatVersion: 1 }, rules).reason).toBe(
      'format'
    );
    expect(readVersioned({ format: 'gravitas.thing' }, rules).reason).toBe(
      'version'
    );
    expect(readVersioned('text', rules).reason).toBe('notObject');
    expect(
      readVersioned(
        { format: 'gravitas.thing', formatVersion: 2 },
        { ...rules, migrations: {} }
      ).reason
    ).toBe('noMigration');
  });

  test('an older field pair is read by name', () => {
    expect(readVersioned({ v: 1 }, { current: 1, versionField: 'v' }).ok).toBe(
      true
    );
  });
});

test('the reporter is the one shape', () => {
  const { problems, need } = reporter();
  expect(need(true, 'a', 'x', 'm')).toBe(true);
  expect(need(false, 'b', 'required', 'is required', { n: 1 })).toBe(false);
  expect(problems).toEqual([
    { path: 'b', code: 'required', vars: { n: 1 }, message: 'is required' },
  ]);
});
