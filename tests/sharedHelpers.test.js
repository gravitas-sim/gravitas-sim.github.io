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
import { readFileSync } from 'node:fs';
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

  test('the copies that are not exported run the same loop', () => {
    // The lab report's completion code and the analysis stream's seed (the
    // import's fingerprint and the engine's now use js/hash.js): the same basis, the same prime, over charCodeAt.
    for (const file of ['js/labReport.js', 'js/analysis/stats.js']) {
      const src = readFileSync(file, 'utf8');
      expect({ file, basis: src.includes('0x811c9dc5') }).toEqual({
        file,
        basis: true,
      });
      expect(src).toMatch(/Math\.imul\(h, 0x01000193\)/);
      expect(src).toMatch(/h \^= \w+\.charCodeAt\(i\)/);
    }
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
