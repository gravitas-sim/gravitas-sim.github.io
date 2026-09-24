import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';

import {
  validateManifest,
  validatePackages,
  dependencyOrder,
  migrateSaved,
  PLATFORM_API,
} from '../js/platform/manifest.js';
import { satisfies } from '../js/platform/semver.js';
import {
  readPackages,
  checkRepository,
  listing,
} from '../tools/capabilities.mjs';

// =============================================================================
// The platform package gate's thresholds, as far as Node can hold them
// -----------------------------------------------------------------------------
// PLATFORM_PACKAGE_RFC.md fixes ten thresholds before the prototype. This holds
// T1 (one format for three unlike capabilities), T2 (declarative packages name
// no code), T3 (malformed packages rejected with the field named), T6-T8 (what
// the manifests claim is true of the repository), and T10 (migration). The
// browser thresholds are e2e/capabilityPackages.spec.js and the existing specs.
// =============================================================================

/** Manifests are JSON, so a JSON round trip is an exact copy. */
const clone = v => JSON.parse(JSON.stringify(v));
const packages = readPackages();
const manifests = packages.map(p => p.manifest);
const byId = id => clone(manifests.find(m => m.id === id));
const LESSON = 'gravitas.lesson.power-law-gravity';
const INSTRUMENTS = 'gravitas.power-law-instruments';
const DATA = 'gravitas.sdss-dr18-spectra';
const messages = errors => errors.map(e => `${e.path}: ${e.message}`);

describe('T1: one format describes three unlike capabilities', () => {
  test('the three are an instrument, an authentic dataset and a lesson', () => {
    expect(manifests.map(m => m.id).sort()).toEqual(
      [INSTRUMENTS, LESSON, DATA].sort()
    );
    expect(byId(INSTRUMENTS).provides.widgetFamilies).toHaveLength(1);
    expect(byId(DATA).provides.dataPacks).toHaveLength(1);
    expect(byId(LESSON).provides.investigations).toHaveLength(1);
  });

  test('each is valid alone, and the three are valid together', () => {
    for (const m of manifests)
      expect(messages(validateManifest(m))).toEqual([]);
    expect(validatePackages(manifests)).toEqual([]);
  });

  test('the lesson needs the instrument, and resolution puts it first', () => {
    expect(dependencyOrder(manifests, LESSON)).toEqual([INSTRUMENTS, LESSON]);
    for (const m of manifests)
      expect(satisfies(PLATFORM_API, m.gravitas)).toBe(true);
  });
});

describe('T2: a declarative package names no code', () => {
  const declarative = () => ({ ...byId(DATA), kind: 'declarative' });
  const hostile = [
    [
      'a builtin reference',
      m => (m.provides.dataPacks[0].entry = 'builtin:data/sdss-spectra'),
    ],
    ['a script path', m => (m.provides.dataPacks[0].source = 'js/evil.js')],
    [
      'a module in the assets',
      m =>
        m.assets.push({ path: 'js/evil.mjs', role: 'code', offline: 'core' }),
    ],
    ['a javascript: URL', m => (m.title.en = 'javascript:alert(1)')],
    [
      'a remote URL to fetch',
      m =>
        (m.provides.dataPacks[0].source = 'https://example.org/spectra.json'),
    ],
    ['a code hook', m => (m.provides.dataPacks[0].ready = 'decode')],
    [
      'a data: URL',
      m => (m.provides.dataPacks[0].source = 'data:text/javascript,alert(1)'),
    ],
  ];
  for (const [what, spoil] of hostile) {
    test(`rejects ${what}`, () => {
      const m = declarative();
      delete m.provides.dataPacks[0].entry;
      m.assets = m.assets.filter(a => a.role !== 'code');
      spoil(m);
      expect(validateManifest(m).length).toBeGreaterThan(0);
    });
  }

  test('the same content with nothing executable is accepted', () => {
    const m = declarative();
    delete m.provides.dataPacks[0].entry;
    m.provides.dataPacks[0].source = 'data/spectra.json';
    // Its provenance is data too: a declarative pack names no .js at all.
    m.provides.dataPacks[0].provenance = 'data/spectra.provenance.json';
    m.assets = [{ path: 'data/spectra.json', role: 'data', offline: 'core' }];
    m.validation = [];
    expect(messages(validateManifest(m))).toEqual([]);
  });

  test('the runtime loads only what the built-in registry lists', async () => {
    const { loadBuiltin } = await import('../js/platform/resolver.js');
    await expect(loadBuiltin('builtin:../../evil.js')).rejects.toThrow(
      /no built-in/
    );
    await expect(loadBuiltin('https://example.org/x.js')).rejects.toThrow(
      /no built-in/
    );
  });
});

describe('T3: malformed packages are rejected, and the error names the field', () => {
  const cases = [
    ['missing identity', m => delete m.id, 'id'],
    ['bad version', m => (m.version = '1.0'), 'version'],
    ['unknown kind', m => (m.kind = 'plugin'), 'kind'],
    ['unknown field', m => (m.scripts = []), 'scripts'],
    [
      'a URL for an asset',
      m => (m.assets[0].path = 'https://x.org/a.js'),
      'assets[0].path',
    ],
    [
      'a chunk name',
      m => (m.assets[0].path = 'dist/js/chunk-AB12CD34.js'),
      'assets[0].path',
    ],
  ];
  for (const [what, spoil, field] of cases) {
    test(what, () => {
      const m = byId(INSTRUMENTS);
      spoil(m);
      expect(validateManifest(m).map(e => e.path)).toContain(field);
    });
  }

  test('an incompatible platform API range', () => {
    const m = byId(INSTRUMENTS);
    m.gravitas = '^2.0.0';
    const errors = validatePackages([m]);
    expect(errors.map(e => e.path)).toContain('gravitas');
  });

  test('an undeclared dependency', () => {
    const lesson = byId(LESSON);
    delete lesson.requires;
    const errors = validatePackages([byId(INSTRUMENTS), lesson]);
    expect(
      errors.some(
        e => e.path === 'uses.widgets' && /without requiring/.test(e.message)
      )
    ).toBe(true);
  });

  test('a dependency cycle', () => {
    const a = byId(INSTRUMENTS);
    a.requires = { [LESSON]: '^1.0.0' };
    const errors = validatePackages([a, byId(LESSON)]);
    expect(errors.some(e => /dependency cycle/.test(e.message))).toBe(true);
    expect(() => dependencyOrder([a, byId(LESSON)], LESSON)).toThrow(/cycle/);
  });

  test('a public id claimed twice', () => {
    const twin = byId(INSTRUMENTS);
    twin.id = 'gravitas.power-law-twin';
    const errors = validatePackages([byId(INSTRUMENTS), twin]);
    expect(errors.some(e => /also provided by/.test(e.message))).toBe(true);
  });

  test('a dependency on a package that is not installed, or too old', () => {
    const lesson = byId(LESSON);
    expect(
      validatePackages([lesson]).some(e => /not installed/.test(e.message))
    ).toBe(true);
    lesson.requires[INSTRUMENTS] = '^2.0.0';
    expect(
      validatePackages([byId(INSTRUMENTS), lesson]).some(e =>
        /is installed/.test(e.message)
      )
    ).toBe(true);
  });
});

describe('T6-T8: what the manifests claim is true of the repository', () => {
  test('builtins, assets, precache, validation, licenses, citations and the catalog', async () => {
    // One check for all of these, so a failure lists everything at once.
    expect(await checkRepository(packages)).toEqual([]);
  });

  test('a claim that is not true is caught', async () => {
    const spoiled = clone(packages);
    spoiled
      .find(p => p.manifest.id === DATA)
      .manifest.validation.push({ check: 'registry:no-such-check' });
    spoiled
      .find(p => p.manifest.id === INSTRUMENTS)
      .manifest.assets.push({
        path: 'js/nowhere.js',
        role: 'code',
        offline: 'core',
      });
    const problems = await checkRepository(spoiled);
    expect(problems.some(p => /no-such-check/.test(p))).toBe(true);
    expect(problems.some(p => /nowhere\.js does not exist/.test(p))).toBe(true);
  });

  test('the generated listing carries each citation and license', () => {
    const table = listing(packages);
    expect(table).toMatch(/SDSS DR18 \(Almeida et al\. 2023/);
    expect(table).toMatch(/CC-BY-4\.0/);
    expect(table).toMatch(/MIT/);
    const notice = readFileSync('NOTICE', 'utf8');
    expect(notice).toMatch(/SDSS/);
  });

  test('the family the manifest declares is the family the module exports', async () => {
    const { POWER_LAW_WIDGETS } = await import('../js/powerLawWidgets.js');
    const family = byId(INSTRUMENTS).provides.widgetFamilies[0];
    expect(POWER_LAW_WIDGETS.map(w => w.id).sort()).toEqual(
      [...family.widgets].sort()
    );
  });
});

describe('T7: authoring sees the same lesson through its package', () => {
  test('the rules give the same findings for the packaged lesson', async () => {
    const { loadAuthoringInputs } =
      await import('../tools/authoring/inputs.mjs');
    const { checkCatalog } = await import('../js/authoring/rules.js');
    const { loadBuiltin } = await import('../js/platform/resolver.js');
    const { LESSONS } = await import('../js/platform/catalog.generated.js');
    const inputs = await loadAuthoringInputs();
    const packaged = (await loadBuiltin(LESSONS['power-law-gravity'][0]))
      .default;
    expect(inputs.investigations.some(i => i.id === 'power-law-gravity')).toBe(
      true
    );
    const swapped = {
      ...inputs,
      investigations: inputs.investigations.map(inv =>
        inv.id === 'power-law-gravity' ? packaged : inv
      ),
    };
    const key = f => JSON.stringify(f);
    expect(checkCatalog(swapped).map(key)).toEqual(
      checkCatalog(inputs).map(key)
    );
  });
});

describe('T10: public identifiers migrate, and old saved work still opens', () => {
  const v2 = {
    from: '^1.0.0',
    to: '2.0.0',
    renames: { controls: { exponent: 'n' } },
  };
  const saved = {
    's-precession:tool:exponent': 2.3,
    's-precession:tool:eccentricity': 0.2,
    's-other:answer': 'yes',
  };

  test('a declared rename carries saved answers forward and back', () => {
    const forward = migrateSaved(saved, [v2], '1.0.0');
    expect(forward).toEqual({
      's-precession:tool:n': 2.3,
      's-precession:tool:eccentricity': 0.2,
      's-other:answer': 'yes',
    });
    expect(migrateSaved(forward, [v2], '2.0.0', { reverse: true })).toEqual(
      saved
    );
  });

  test('a migration is part of a valid manifest', () => {
    const m = byId(INSTRUMENTS);
    m.version = '2.0.0';
    m.migrations = [v2];
    expect(messages(validateManifest(m))).toEqual([]);
  });

  test('the lesson keeps its public id, so saved progress and links still reach it', async () => {
    const lesson = byId(LESSON);
    expect(lesson.provides.investigations[0].id).toBe('power-law-gravity');
    expect(lesson.provides.routes[0].path).toBe(
      '#investigation=power-law-gravity'
    );
    const { default: inv } =
      await import('../js/data/investigations/power-law-gravity.js');
    expect(inv.id).toBe('power-law-gravity');
  });
});
