import { describe, test, expect } from '@jest/globals';

import {
  CapabilityError,
  loadBuiltin,
  migrateSavedProgress,
  providerOf,
  resolve,
  validatePackage,
} from '../js/platform/resolver.js';
import { BUILTINS } from '../js/platform/builtins.js';
import { loadInvestigation } from '../js/data/investigations/registry.js';

// =============================================================================
// The capability runtime's contract
// -----------------------------------------------------------------------------
// js/platform/resolver.js is what the application calls. This holds what it
// promises: stable error codes, deduplicated loads that retry rather than
// replay a failure, providers found by public id with the core as the
// fallback, saved work carried across a package's declared renames, and a
// package the build never saw checked before anything trusts it.
// =============================================================================

const LESSON = 'gravitas.lesson.power-law-gravity';
const INSTRUMENTS = 'gravitas.power-law-instruments';

/** An in-memory Storage with just the two methods the runtime uses. */
function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: k => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v);
    },
  };
}

describe('resolution', () => {
  test('a lesson resolves after the instruments it needs', () => {
    expect(resolve(LESSON)).toEqual([INSTRUMENTS, LESSON]);
  });

  test('an unknown package is a CapabilityError with its code', () => {
    let error;
    try {
      resolve('gravitas.no-such-package');
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(CapabilityError);
    expect(error.code).toBe('unknown-package');
    expect(error.retryable).toBe(false);
  });
});

describe('loading', () => {
  test('many callers share one load, and it is the module the app imports', async () => {
    const a = loadBuiltin('builtin:widgets/power-law');
    const b = loadBuiltin('builtin:widgets/power-law');
    expect(a).toBe(b);
    const direct = await import('../js/powerLawWidgets.js');
    expect(await a).toBe(direct);
  });

  test('an unknown reference is refused, not guessed at, and is not retryable', async () => {
    await expect(loadBuiltin('builtin:../../x.js')).rejects.toMatchObject({
      name: 'CapabilityError',
      code: 'unknown-builtin',
      retryable: false,
    });
  });

  test('a failed load is forgotten, so the next ask fetches again', async () => {
    let calls = 0;
    const saved = BUILTINS['data/sdss-spectra'];
    BUILTINS['test/flaky'] = () => {
      calls += 1;
      return calls === 1
        ? Promise.reject(new Error('network'))
        : Promise.resolve({ ok: true });
    };
    try {
      await expect(loadBuiltin('builtin:test/flaky')).rejects.toMatchObject({
        code: 'load-failed',
        retryable: true,
      });
      await expect(loadBuiltin('builtin:test/flaky')).resolves.toEqual({
        ok: true,
      });
      expect(calls).toBe(2);
    } finally {
      delete BUILTINS['test/flaky'];
      expect(BUILTINS['data/sdss-spectra']).toBe(saved);
    }
  });

  test('the packaged lesson reaches the registry through the resolver', async () => {
    const inv = await loadInvestigation('power-law-gravity', 'en');
    const direct =
      await import('../js/data/investigations/power-law-gravity.js');
    expect(inv).toBe(direct.default);
  });
});

describe('providers, and the core as the fallback', () => {
  test('a packaged id names its package', () => {
    expect(providerOf('widgets', 'power-law-kepler')).toBe(INSTRUMENTS);
    expect(providerOf('widgetFamilies', 'power-law')).toBe(INSTRUMENTS);
    expect(providerOf('investigations', 'power-law-gravity')).toBe(LESSON);
    expect(providerOf('dataPacks', 'sdss-dr18-stellar-spectra')).toBe(
      'gravitas.sdss-dr18-spectra'
    );
  });

  test('an unmigrated capability belongs to the core', () => {
    expect(providerOf('widgets', 'depth-size')).toBeNull();
    expect(providerOf('investigations', 'keplers-laws')).toBeNull();
  });
});

describe('saved work across a version change', () => {
  const saved = { 'power-law-gravity:s1:tool:exponent': 2.3 };

  test('an unstamped save is read as it is, and then stamped', () => {
    const storage = memoryStorage();
    expect(migrateSavedProgress('power-law-gravity', saved, storage)).toEqual(
      saved
    );
    expect(JSON.parse(storage.data.gravitas_capability_versions)).toEqual({
      [LESSON]: '1.0.0',
    });
  });

  test('a stamped save migrates across a declared rename, and is restamped', () => {
    const storage = memoryStorage({
      gravitas_capability_versions: JSON.stringify({ [LESSON]: '1.0.0' }),
    });
    const later = {
      version: '2.0.0',
      migrations: [
        {
          from: '^1.0.0',
          to: '2.0.0',
          renames: { controls: { exponent: 'n' } },
        },
      ],
    };
    expect(
      migrateSavedProgress('power-law-gravity', saved, storage, later)
    ).toEqual({ 'power-law-gravity:s1:tool:n': 2.3 });
    expect(JSON.parse(storage.data.gravitas_capability_versions)[LESSON]).toBe(
      '2.0.0'
    );
    // Read again at 2.0.0, nothing moves twice.
    const again = migrateSavedProgress(
      'power-law-gravity',
      { 'power-law-gravity:s1:tool:n': 2.3 },
      storage,
      later
    );
    expect(again).toEqual({ 'power-law-gravity:s1:tool:n': 2.3 });
  });

  test('a lesson the core still owns is left alone and not stamped', () => {
    const storage = memoryStorage();
    expect(migrateSavedProgress('keplers-laws', saved, storage)).toBe(saved);
    expect(storage.data.gravitas_capability_versions).toBeUndefined();
  });

  test('storage that refuses writes costs the stamp, not the answers', () => {
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(migrateSavedProgress('power-law-gravity', saved, storage)).toEqual(
      saved
    );
  });
});

describe('a package the build never saw', () => {
  const base = {
    format: 'gravitas.capability-package',
    formatVersion: 1,
    id: 'example.stars',
    version: '1.0.0',
    kind: 'declarative',
    gravitas: '^1.0.0',
    title: { en: 'Example stars' },
    provides: { dataPacks: [{ id: 'example-stars', source: 'stars.json' }] },
    assets: [{ path: 'stars.json', role: 'data', offline: 'core' }],
    citations: [],
    licenses: [{ scope: 'stars.json', license: 'CC0-1.0' }],
    offline: { policy: 'on-demand' },
  };

  test('a valid declarative package against the installed set', async () => {
    expect(await validatePackage(base)).toEqual([]);
  });

  test('one that names code, needs a missing package or a newer API', async () => {
    const hostile = {
      ...base,
      requires: { 'example.missing': '^1.0.0' },
      gravitas: '^2.0.0',
      provides: {
        dataPacks: [{ id: 'x', entry: 'builtin:data/sdss-spectra' }],
      },
    };
    const paths = (await validatePackage(hostile)).map(e => e.path);
    expect(paths).toEqual(
      expect.arrayContaining(['gravitas', 'requires.example.missing'])
    );
    expect(paths.some(p => p.startsWith('provides.dataPacks'))).toBe(true);
  });

  test('one that claims an installed id', async () => {
    const errors = await validatePackage({ ...base, id: INSTRUMENTS });
    expect(errors.map(e => e.path)).toContain('id');
  });
});
