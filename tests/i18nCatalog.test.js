// =============================================================================
// The catalog is every fragment, found by rule rather than by list
// -----------------------------------------------------------------------------
// tools/i18n-catalog.mjs is the one reader of js/i18n that the count in
// README.md, the i18n audit and the catalog-sweeping tests share. Before it,
// each of them named files: the published `uiStrings` counted two of the five
// fragments and said 3691 over a catalog of 4017.
//
// The structural cases work on copies in a temporary directory. A test that
// adds a file to js/i18n - even briefly - is a test that can change what a
// parallel suite reads, and two suites doing exactly that to other directories
// are why the service-worker manifest's content hash was flaky.
// =============================================================================

import {
  copyFileSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  I18N_DIR,
  catalogLayout,
  completeCatalogs,
  exportNameFor,
} from '../tools/i18n-catalog.mjs';
import { FACT_GROUPS, gatherFacts } from '../tools/docs-facts.mjs';

const LOCALES = ['en', 'es'];
const scratch = [];

/** A fresh directory, removed after the suite. */
function tempDir() {
  const dir = mkdtempSync(path.join(tmpdir(), 'gravitas-i18n-'));
  scratch.push(dir);
  return dir;
}

/** A copy of the real catalog files, and nothing else from js/i18n. */
function copyOfRealCatalogs() {
  const dir = tempDir();
  const { files } = catalogLayout({ locales: LOCALES });
  for (const { file } of files) {
    copyFileSync(path.join(I18N_DIR, file), path.join(dir, file));
  }
  return dir;
}

/** Write a catalog module exporting `table` under the conventional name. */
function writeCatalog(
  dir,
  file,
  table,
  { name, prelude = '', spread = '' } = {}
) {
  const stem = file.slice(0, -'.js'.length);
  const [locale, ...rest] = stem.split('.');
  const exportName = name ?? exportNameFor(locale, rest.join('.') || null);
  const body = Object.entries(table)
    .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`)
    .join('\n');
  writeFileSync(
    path.join(dir, file),
    `${prelude}export const ${exportName} = {\n${spread}${body}\n};\n`
  );
}

/** A minimal two-locale catalog with one fragment, in its own directory. */
function tinyCatalogs() {
  const dir = tempDir();
  writeCatalog(dir, 'en.js', { 'a.one': 'One' });
  writeCatalog(dir, 'es.js', { 'a.one': 'Uno' });
  writeCatalog(dir, 'en.panel.js', { 'p.two': 'Two' });
  writeCatalog(dir, 'es.panel.js', { 'p.two': 'Dos' });
  // A module that is not a catalog, the way index.js and dom.js are not.
  writeFileSync(path.join(dir, 'dom.js'), 'export const x = 1;\n');
  return dir;
}

afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

describe('the real catalog', () => {
  test('is one catalog: parity, one home per id, every export readable', async () => {
    const { problems } = await completeCatalogs();
    expect(problems).toEqual([]);
  });

  test('every fragment is read, not only the ones someone listed', async () => {
    const { layout, catalogs } = await completeCatalogs();
    const onDisk = readdirSync(I18N_DIR).filter(f =>
      /^(en|es)(\.[\w-]+)?\.js$/.test(f)
    );
    expect(layout.files.map(f => f.file).sort()).toEqual(onDisk.sort());
    // Split for bundling, not for coverage: more than the original two.
    expect(layout.parts.length).toBeGreaterThanOrEqual(4);
    const read = catalogs.get('en').fragments.map(f => f.file);
    expect(read).toEqual(
      layout.files.filter(f => f.locale === 'en').map(f => f.file)
    );
  });

  test('teaching passes activities on without defining them twice', async () => {
    const { catalogs } = await completeCatalogs();
    const byFile = Object.fromEntries(
      catalogs.get('en').fragments.map(f => [f.file, f])
    );
    expect(byFile['en.teaching.js'].inherited).toBe(
      byFile['en.activities.js'].own
    );
    expect(byFile['en.activities.js'].inherited).toBe(0);
  });

  test('uiStrings is the whole merged catalog, and the quick check measures it', async () => {
    const { catalogs } = await completeCatalogs();
    const whole = Object.keys(catalogs.get('en').merged).length;
    // The cheap path: no group, which is what `npm run docs:check` runs.
    const { facts } = await gatherFacts({ groups: new Set() });
    expect(facts.uiStrings).toBe(whole);
    // And it is not deferred to a group, so a stale count cannot wait for
    // --full to be noticed.
    for (const group of Object.values(FACT_GROUPS)) {
      expect(group.keys).not.toContain('uiStrings');
    }
  });

  test('the merge is deterministic', async () => {
    const dir = copyOfRealCatalogs();
    const a = await completeCatalogs({ locales: LOCALES });
    const b = await completeCatalogs({ locales: LOCALES, dir });
    expect(Object.keys(b.catalogs.get('en').merged)).toEqual(
      Object.keys(a.catalogs.get('en').merged)
    );
    expect(b.layout.files.map(f => f.file)).toEqual(
      a.layout.files.map(f => f.file)
    );
  });
});

describe('a new fragment', () => {
  test('matched in both languages, is counted the day it is made', async () => {
    const dir = copyOfRealCatalogs();
    const before = await completeCatalogs({ locales: LOCALES, dir });
    const was = Object.keys(before.catalogs.get('en').merged).length;

    const probe = copyOfRealCatalogs();
    writeCatalog(probe, 'en.probe.js', { 'probe.a': 'A', 'probe.b': 'B' });
    writeCatalog(probe, 'es.probe.js', { 'probe.a': 'A', 'probe.b': 'B' });
    const after = await completeCatalogs({ locales: LOCALES, dir: probe });

    expect(after.problems).toEqual([]);
    expect(after.layout.parts).toContain('probe');
    expect(Object.keys(after.catalogs.get('en').merged).length).toBe(was + 2);
  });

  test('in one language only, fails and names the missing file', async () => {
    const dir = copyOfRealCatalogs();
    writeCatalog(dir, 'en.probe.js', { 'probe.a': 'A' });
    const { problems } = await completeCatalogs({ locales: LOCALES, dir });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/en\.probe\.js has no counterpart for es/);
    expect(problems[0]).toMatch(/es\.probe\.js/);
  });

  test('for a locale nobody registered, fails rather than being skipped', async () => {
    const dir = tinyCatalogs();
    writeCatalog(dir, 'fr.panel.js', { 'p.two': 'Deux' });
    const { problems } = await completeCatalogs({ locales: LOCALES, dir });
    expect(problems.join('\n')).toMatch(
      /fr\.panel\.js .*not a registered locale/
    );
  });
});

describe('the rules, on a catalog small enough to read', () => {
  test('a clean catalog has no problems, and modules are not catalogs', async () => {
    const dir = tinyCatalogs();
    const { layout, catalogs, problems } = await completeCatalogs({
      locales: LOCALES,
      dir,
    });
    expect(problems).toEqual([]);
    expect(layout.files.map(f => f.file)).toEqual([
      'en.js',
      'en.panel.js',
      'es.js',
      'es.panel.js',
    ]);
    expect(catalogs.get('en').merged).toEqual({
      'a.one': 'One',
      'p.two': 'Two',
    });
  });

  test('an id defined in two fragments is a problem, not a tie-break', async () => {
    const dir = tinyCatalogs();
    writeCatalog(dir, 'en.panel.js', { 'p.two': 'Two', 'a.one': 'One again' });
    const { problems } = await completeCatalogs({ locales: LOCALES, dir });
    expect(problems.join('\n')).toMatch(
      /"a\.one" is defined in both en\.js and en\.panel\.js/
    );
  });

  test('a re-export with the same text is inherited; with new text it is a second definition', async () => {
    const same = tinyCatalogs();
    const prelude = "import { EN_PANEL } from './en.panel.js';\n";
    writeCatalog(
      same,
      'en.page.js',
      { 'g.three': 'Three' },
      { prelude, spread: '  ...EN_PANEL,\n' }
    );
    writeCatalog(same, 'es.page.js', { 'g.three': 'Tres' });
    const ok = await completeCatalogs({ locales: LOCALES, dir: same });
    expect(ok.problems).toEqual([]);
    const page = ok.catalogs
      .get('en')
      .fragments.find(f => f.file === 'en.page.js');
    expect(page).toMatchObject({ own: 1, inherited: 1 });

    const changed = tinyCatalogs();
    writeCatalog(
      changed,
      'en.page.js',
      { 'g.three': 'Three', 'p.two': 'Two, reworded' },
      { prelude, spread: '  ...EN_PANEL,\n' }
    );
    writeCatalog(changed, 'es.page.js', { 'g.three': 'Tres' });
    const bad = await completeCatalogs({ locales: LOCALES, dir: changed });
    expect(bad.problems.join('\n')).toMatch(
      // Merge order is by file name, so page is read before panel.
      /"p\.two" is defined in both en\.page\.js and en\.panel\.js/
    );
  });

  test('a fragment that exports under the wrong name is reported, not skipped', async () => {
    const dir = tinyCatalogs();
    writeCatalog(dir, 'es.panel.js', { 'p.two': 'Dos' }, { name: 'ES_PANELS' });
    const { problems } = await completeCatalogs({ locales: LOCALES, dir });
    expect(problems.join('\n')).toMatch(
      /es\.panel\.js does not export ES_PANEL/
    );
  });

  test('a translation filed in a different fragment from its original is reported', async () => {
    const dir = tinyCatalogs();
    writeCatalog(dir, 'es.js', { 'a.one': 'Uno', 'p.two': 'Dos' });
    writeCatalog(dir, 'es.panel.js', {});
    const { problems } = await completeCatalogs({ locales: LOCALES, dir });
    expect(problems.join('\n')).toMatch(
      /"p\.two" is in es\.js, but its original is in en\.panel\.js/
    );
  });

  test('a registered locale with no base catalog is reported', async () => {
    const dir = tinyCatalogs();
    rmSync(path.join(dir, 'es.js'));
    const { problems } = catalogLayout({ locales: LOCALES, dir });
    expect(problems.join('\n')).toMatch(/es\.js is missing/);
  });
});
