// =============================================================================
// The curated catalog: its archives, the browser's reader, and installing
// -----------------------------------------------------------------------------
// tools/catalog.mjs check holds the catalog to the repository. This holds the
// page's side of it, without a page:
//   - the browser's .gxp reader (js/catalog/archive.js) reads every archive
//     the catalog serves, and refuses, each with its own code, every archive
//     the SDK would not have written: traversal, absolute paths, links,
//     directories, duplicates, names in the prefix field, a gzip bomb, a
//     truncated entry, a bad or missing checksum, entries out of order;
//   - install() refuses an incompatible entry, a tampered archive, an archive
//     that is not the version its entry says, a course naming a lesson
//     Gravitas lacks, and a network failure, and leaves what was installed
//     untouched each time; statusOf() tells available, installed, update,
//     newer and incompatible apart;
//   - the stepped series encoding the pulsating star needs decodes exactly.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { createHash, webcrypto } from 'node:crypto';
import { DecompressionStream } from 'node:stream/web';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ArchiveError, LIMITS, readArchive } from '../js/catalog/archive.js';
import {
  InstallError,
  breaking,
  compare,
  install,
  installedObservation,
  statusOf,
} from '../js/catalog/install.js';
import { createMemoryStore } from '../js/catalog/store.js';
import { observationOf } from '../js/observation.js';

// Jest's environment lacks two Web APIs the browser and Node itself have; the
// reader uses them as it would in a page.
if (!globalThis.crypto?.subtle)
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  });
globalThis.DecompressionStream ??= DecompressionStream;

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CATALOG = JSON.parse(
  readFileSync(path.join(REPO, 'catalog/catalog.json'), 'utf8')
);
const archiveEntries = CATALOG.entries.filter(e => e.delivery === 'archive');
const bytesOf = e =>
  new Uint8Array(readFileSync(path.join(REPO, 'catalog', e.archiveFile)));
const sha256 = b => createHash('sha256').update(b).digest('hex');

// --- A tar writer that will write what the SDK refuses to ----------------------

function header(name, size, { type = '0', prefix = '' } = {}) {
  const h = Buffer.alloc(512, 0);
  h.write(name, 0, 'utf8');
  const oct = (v, w) => v.toString(8).padStart(w - 1, '0') + '\0';
  h.write(oct(0o644, 8), 100, 'ascii');
  h.write(oct(0, 8), 108, 'ascii');
  h.write(oct(0, 8), 116, 'ascii');
  h.write(oct(size, 12), 124, 'ascii');
  h.write(oct(0, 12), 136, 'ascii');
  h.write('        ', 148, 'ascii');
  h.write(type, 156, 'ascii');
  h.write('ustar\0', 257, 'ascii');
  h.write('00', 263, 'ascii');
  if (prefix) h.write(prefix, 345, 'utf8');
  let sum = 0;
  for (const b of h) sum += b;
  h.write(oct(sum, 7) + ' ', 148, 'ascii');
  return h;
}

/** entries: [name, body, opts?]; CHECKSUMS appended unless given. */
function tar(entries, { checksums = true, extra = [] } = {}) {
  const list = [...entries];
  if (checksums) {
    const sums = list
      .filter(([n]) => n !== 'CHECKSUMS')
      .map(([n, b]) => `${sha256(Buffer.from(b))}  ${n}`)
      .join('\n');
    list.push(['CHECKSUMS', `${sums}\n`]);
  }
  list.push(...extra);
  const parts = [];
  for (const [name, body, opts] of list) {
    const b = Buffer.from(body);
    parts.push(header(name, b.length, opts), b);
    parts.push(Buffer.alloc((512 - (b.length % 512)) % 512));
  }
  parts.push(Buffer.alloc(1024));
  return new Uint8Array(gzipSync(Buffer.concat(parts)));
}

const MANIFEST = ['gravitas-extension.json', '{}'];
const code = async (promise, expected) => {
  const err = await promise.then(
    () => null,
    e => e
  );
  expect(err).toBeInstanceOf(ArchiveError);
  expect(err.code).toBe(expected);
};

describe('the browser reads every archive the catalog serves', () => {
  test.each(archiveEntries.map(e => [e.id, e]))('%s', async (_id, e) => {
    const files = await readArchive(bytesOf(e), { sha256: e.sha256 });
    expect([...files.keys()]).toEqual(e.files.map(f => f.path));
    for (const f of e.files) expect(sha256(files.get(f.path))).toBe(f.sha256);
  });
});

describe('and refuses what the SDK would not write', () => {
  test('a traversal, an absolute path, or a character the SDK does not allow', async () => {
    await code(
      readArchive(tar([MANIFEST, ['../escape.json', 'x']])),
      'unsafePath'
    );
    await code(
      readArchive(tar([MANIFEST, ['data/../../escape.json', 'x']])),
      'unsafePath'
    );
    await code(
      readArchive(tar([MANIFEST, ['/etc/passwd', 'x']])),
      'unsafePath'
    );
    await code(readArchive(tar([MANIFEST, ['a\\b.json', 'x']])), 'unsafePath');
    // A long name continued in the ustar prefix field.
    await code(
      readArchive(tar([MANIFEST, ['b.json', 'x', { prefix: '..' }]])),
      'unsafePath'
    );
  });

  test('a link, a directory, or any entry but a regular file', async () => {
    await code(
      readArchive(tar([MANIFEST, ['link.json', '', { type: '2' }]])),
      'entryType'
    );
    await code(
      readArchive(tar([MANIFEST, ['hard.json', '', { type: '1' }]])),
      'entryType'
    );
    await code(
      readArchive(tar([MANIFEST, ['dir', '', { type: '5' }]])),
      'entryType'
    );
  });

  test('an entry twice, too many entries, or entries out of order', async () => {
    await code(
      readArchive(tar([MANIFEST, ['a.json', 'x'], ['a.json', 'y']])),
      'duplicate'
    );
    const many = Array.from({ length: 5 }, (_, i) => [`f${i}.json`, 'x']);
    await code(
      readArchive(tar([MANIFEST, ...many]), {
        limits: { ...LIMITS, entries: 4 },
      }),
      'tooManyEntries'
    );
    await code(readArchive(tar([['a.json', 'x'], MANIFEST])), 'order');
  });

  test('a checksum that does not match, an entry not listed, or one listed and absent', async () => {
    const good = tar([MANIFEST, ['a.json', 'x']]);
    const flipped = good.slice();
    flipped[flipped.length - 20] ^= 1;
    await code(readArchive(flipped, { sha256: sha256(good) }), 'checksum');
    await code(
      readArchive(
        tar(
          [
            MANIFEST,
            ['a.json', 'x'],
            [
              'CHECKSUMS',
              `${'0'.repeat(64)}  gravitas-extension.json\n${'0'.repeat(64)}  a.json\n`,
            ],
          ],
          { checksums: false }
        )
      ),
      'entryChecksum'
    );
    await code(
      readArchive(
        tar(
          [
            MANIFEST,
            ['a.json', 'x'],
            [
              'CHECKSUMS',
              `${sha256(Buffer.from('{}'))}  gravitas-extension.json\n`,
            ],
          ],
          { checksums: false }
        )
      ),
      'unlisted'
    );
    await code(
      readArchive(
        tar(
          [
            MANIFEST,
            [
              'CHECKSUMS',
              `${sha256(Buffer.from('{}'))}  gravitas-extension.json\n${'0'.repeat(64)}  gone.json\n`,
            ],
          ],
          { checksums: false }
        )
      ),
      'missing'
    );
  });

  test('a gzip bomb stops at the limit, and an oversized archive is not read at all', async () => {
    const bomb = tar([MANIFEST, ['zeros.json', Buffer.alloc(3_000_000)]]);
    expect(bomb.length).toBeLessThan(10_000);
    await code(
      readArchive(bomb, { limits: { ...LIMITS, unpackedBytes: 1_000_000 } }),
      'unpackedTooLarge'
    );
    await code(
      readArchive(bomb, { limits: { ...LIMITS, archiveBytes: 100 } }),
      'tooLarge'
    );
  });

  test('a header that is not ustar, an entry past the end, or not gzip at all', async () => {
    const t = Buffer.concat([
      header('gravitas-extension.json', 2),
      Buffer.from('{}'),
    ]);
    t[150] = 0x39; // a checksum digit changed
    await code(readArchive(new Uint8Array(gzipSync(t))), 'badHeader');
    const short = Buffer.concat([
      header('gravitas-extension.json', 4096),
      Buffer.from('{}'),
    ]);
    await code(readArchive(new Uint8Array(gzipSync(short))), 'truncated');
    await code(readArchive(new Uint8Array([1, 2, 3])), 'notGzip');
  });
});

// --- Installing ------------------------------------------------------------------

const suDra = archiveEntries.find(e => e.type === 'data-pack');
const course = archiveEntries.find(e => e.type === 'course-pack');
const fromDisk = async url =>
  new Uint8Array(
    readFileSync(path.join(REPO, 'catalog', new URL(url).pathname.slice(1)))
  );
const ctx = store => ({
  catalog: CATALOG,
  store,
  fetchBytes: fromDisk,
  base: 'file:///',
});
const refused = async (promise, expected) => {
  const err = await promise.then(
    () => null,
    e => e
  );
  expect(err).toBeInstanceOf(InstallError);
  expect(err.code).toBe(expected);
  return err;
};

describe('installing', () => {
  test('a data pack installs whole, decodes, and removes cleanly', async () => {
    const store = createMemoryStore();
    expect(statusOf(suDra, null)).toBe('available');
    const record = await install(suDra, ctx(store));
    expect(record.version).toBe(suDra.version);
    expect(statusOf(suDra, await store.get(suDra.id))).toBe('installed');
    const o = installedObservation(record);
    expect(o.x.values.length).toBeGreaterThan(3000);
    expect(Math.max(...o.y.values)).toBeGreaterThan(1.4);
    await store.remove(suDra.id);
    expect(await store.list()).toEqual([]);
  });

  test('a course installs, and one naming a lesson Gravitas lacks does not', async () => {
    const store = createMemoryStore();
    await install(course, ctx(store));
    expect((await store.get(course.id)).files['course.json']).toContain(
      'lives-of-stars'
    );
    const fewer = {
      ...CATALOG,
      lessons: { 'transit-photometry': { en: 'x', es: 'x' } },
    };
    await refused(
      install(course, { ...ctx(createMemoryStore()), catalog: fewer }),
      'content'
    );
  });

  test('an incompatible entry, a built-in one, or a failed download is refused, and nothing changes', async () => {
    const store = createMemoryStore();
    await install(suDra, ctx(store));
    const before = await store.list();
    await refused(
      install({ ...suDra, gravitas: '^2.0.0' }, ctx(store)),
      'incompatible'
    );
    expect(statusOf({ ...suDra, gravitas: '^2.0.0' }, null)).toBe(
      'incompatible'
    );
    const builtIn = CATALOG.entries.find(e => e.delivery === 'built-in');
    await refused(install(builtIn, ctx(store)), 'notInstallable');
    const err = await refused(
      install(suDra, {
        ...ctx(store),
        fetchBytes: async () => {
          throw new Error('offline');
        },
      }),
      'network'
    );
    expect(err.retryable).toBe(true);
    expect(await store.list()).toEqual(before);
  });

  test('a tampered archive, or one that is not the version its entry names, is refused and the installed one kept', async () => {
    const store = createMemoryStore();
    await install(suDra, ctx(store));
    const before = await store.list();
    const tampered = async url => {
      const b = await fromDisk(url);
      b[b.length - 30] ^= 1;
      return b;
    };
    const err = await refused(
      install(suDra, { ...ctx(store), fetchBytes: tampered }),
      'archive'
    );
    expect(err.detail.archive).toBe('checksum');
    // The catalog says 2.0.0 and names this archive's checksum: the manifest
    // inside says otherwise.
    await refused(
      install({ ...suDra, version: '2.0.0' }, ctx(store)),
      'manifest'
    );
    expect(await store.list()).toEqual(before);
  });

  test('updates, downgrades and a changed archive are told apart', () => {
    const installed = { version: '1.0.0', sha256: suDra.sha256 };
    expect(statusOf({ ...suDra, version: '1.1.0' }, installed)).toBe('update');
    expect(statusOf({ ...suDra, version: '0.9.0' }, installed)).toBe('newer');
    expect(statusOf(suDra, { ...installed, sha256: 'x' })).toBe('update');
    expect(breaking('1.4.2', '2.0.0')).toBe(true);
    expect(breaking('1.4.2', '1.5.0')).toBe(false);
    expect(compare('1.10.0', '1.9.3')).toBe(1);
  });
});

describe('binned-relative-flux/2', () => {
  test('decodes the flux in its step, and refuses a step it cannot trust', () => {
    const flux = Buffer.alloc(6);
    [-11500, 0, 23000].forEach((v, i) => flux.writeInt16LE(v, 2 * i));
    const pack = {
      PACK: {
        id: 'x',
        version: '1.0.0',
        columns: [
          { name: 'time', unit: 'd' },
          { name: 'flux', unit: '' },
        ],
      },
      SERIES: {
        encoding: 'binned-relative-flux/2',
        t0: 100,
        binDays: 0.01,
        n: 3,
        runs: [[0, 3]],
        flux: flux.toString('base64'),
        fluxStepPpm: 20,
        errStepPpm: 5,
        err: Buffer.from([10, 10, 10]).toString('base64'),
      },
    };
    const o = observationOf(pack);
    expect([...o.y.values].map(v => Number(v.toFixed(6)))).toEqual([
      0.77, 1, 1.46,
    ]);
    expect(o.err[0]).toBeCloseTo(50e-6, 12);
    expect(() =>
      observationOf({
        ...pack,
        SERIES: { ...pack.SERIES, fluxStepPpm: 0.5 },
      })
    ).toThrow(/fluxStepPpm/);
  });
});
