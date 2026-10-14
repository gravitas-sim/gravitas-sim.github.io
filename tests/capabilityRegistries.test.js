// =============================================================================
// The lazy registries are written from what describes them
// -----------------------------------------------------------------------------
// LAZY_FAMILIES, BUILTINS and the lesson LOADERS and TRANSLATIONS were three
// hand-written lists; tools/capability-registries.mjs writes them now (D-CAP-01,
// CAPABILITY_RUNTIME.md). Four things are held here:
//
//   fresh       the committed regions are exactly what the generator writes
//   entry for   each registry, read back out of the committed file by an
//   entry       independent reading (acorn on the file, not the generator's own
//               model), says what the manifests, the catalog and the modules say
//   refusals    what the generator cannot express is an error, not a guess
//   new work    a lesson or a family added to the sources reaches the registry
//               with no other edit
//
// The first run of the equality checks was against the hand-written registries
// they replaced, at the commit before the replacement: every entry the same,
// the lesson loaders differing only in where power-law-gravity sits (catalog
// order now, import order before; nothing reads the order).
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as acorn from 'acorn';

import { MANIFEST } from '../js/data/investigations/manifest.js';
import { LAZY_FAMILIES } from '../js/widgets.js';
import {
  FAMILY_FILE,
  FAMILY_ORDER,
  FILES,
  builtinEntries,
  renderRegions,
  familyEntries,
  keyOf,
  lessonEntries,
  readFamily,
  readManifests,
  sourceOf,
  splice,
  staleRegions,
} from '../tools/capability-registries.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const text = rel => readFileSync(path.join(ROOT, rel), 'utf8');

// ---- an independent reading of the committed files -------------------------

const parse = source =>
  acorn.parse(source, { ecmaVersion: 'latest', sourceType: 'module' });

function constInit(source, name) {
  for (const n of parse(source).body) {
    const d = n.type === 'ExportNamedDeclaration' ? n.declaration : n;
    if (d?.type !== 'VariableDeclaration') continue;
    for (const x of d.declarations) if (x.id.name === name) return x.init;
  }
  throw new Error(`no const ${name}`);
}
const literal = node => {
  if (node.type === 'Literal') return node.value;
  if (node.type === 'ArrayExpression') return node.elements.map(literal);
  throw new Error(`not a literal: ${node.type}`);
};
/** The specifier of `() => import('...')`, and nothing else is accepted. */
const specifier = fn => {
  if (
    fn.type !== 'ArrowFunctionExpression' ||
    fn.params.length ||
    fn.body.type !== 'ImportExpression'
  )
    throw new Error('not a literal lazy loader');
  return fn.body.source.value;
};
const keyName = p => p.key.name ?? p.key.value;
const entries = object =>
  Object.fromEntries(
    (object.type === 'CallExpression'
      ? object.arguments[0]
      : object
    ).properties.map(p => [keyName(p), p.value])
  );

const committedFamilies = () =>
  Object.fromEntries(
    Object.entries(
      entries(constInit(text(FILES.families), 'LAZY_FAMILIES'))
    ).map(([key, call]) => {
      const a = call.arguments;
      return [
        key,
        call.callee.name === 'fromPackage'
          ? { package: literal(a[0]), path: literal(a[1]) }
          : {
              load: specifier(a[0]),
              path: literal(a[1]),
              exportName: literal(a[2]),
              ids: literal(a[3]),
              ready: a[4] ? literal(a[4]) : null,
            },
      ];
    })
  );

const committedBuiltins = () => {
  const source = text(FILES.builtins);
  return {
    loaders: Object.fromEntries(
      Object.entries(entries(constInit(source, 'BUILTINS'))).map(([k, v]) => [
        k,
        specifier(v),
      ])
    ),
    sources: Object.fromEntries(
      Object.entries(entries(constInit(source, 'BUILTIN_SOURCES'))).map(
        ([k, v]) => [k, v.value]
      )
    ),
  };
};

const committedLessons = () => {
  const source = text(FILES.lessons);
  const loaders = entries(constInit(source, 'LOADERS'));
  const translations = entries(constInit(source, 'TRANSLATIONS'));
  return {
    loaders: Object.fromEntries(
      Object.entries(loaders).map(([k, v]) => [k, specifier(v)])
    ),
    translations: Object.fromEntries(
      Object.entries(translations).map(([locale, object]) => [
        locale,
        Object.fromEntries(
          Object.entries(entries(object)).map(([k, v]) => [k, specifier(v)])
        ),
      ])
    ),
  };
};

describe('the committed registries', () => {
  test('say what the generator says, region by region', async () => {
    // As code, not text: Prettier does not load under Jest, and
    // \`node tools/capability-registries.mjs --check\` holds the formatting.
    expect(await staleRegions()).toEqual([]);
  });

  test('lessons: one loader per lesson in the catalog, in its order, and a Spanish shadow where there is a file', () => {
    const ids = MANIFEST.map(m => m.id);
    const { loaders, translations } = committedLessons();
    expect(Object.keys(loaders)).toEqual(ids);
    for (const id of ids) {
      expect(loaders[id]).toBe(`./${id}.js`);
      expect(
        existsSync(path.join(ROOT, `js/data/investigations/${id}.js`))
      ).toBe(true);
    }
    const spanish = ids.filter(id =>
      existsSync(path.join(ROOT, `js/data/investigations/es/${id}.js`))
    );
    expect(Object.keys(translations.es)).toEqual(spanish);
    for (const id of spanish) expect(translations.es[id]).toBe(`./es/${id}.js`);
    // Every locale directory is a locale of the registry.
    const locales = readdirSync(path.join(ROOT, 'js/data/investigations'), {
      withFileTypes: true,
    })
      .filter(d => d.isDirectory() && /^[a-z]{2}$/.test(d.name))
      .map(d => d.name);
    expect(Object.keys(translations).sort()).toEqual(locales.sort());
  });

  test('builtins: exactly the modules the manifests name, each a module its package declares', () => {
    const named = new Set();
    for (const m of readManifests(ROOT))
      for (const ref of JSON.stringify(m.provides).match(/builtin:[^"]+/g) ||
        [])
        named.add(ref.slice('builtin:'.length));
    const { loaders, sources } = committedBuiltins();
    expect(Object.keys(loaders).sort()).toEqual([...named].sort());
    expect(Object.keys(sources)).toEqual(Object.keys(loaders));
    for (const id of named) {
      // The loader and the recorded source are one module.
      expect(path.resolve(ROOT, 'js/platform', loaders[id])).toBe(
        path.join(ROOT, sources[id])
      );
      expect(existsSync(path.join(ROOT, sources[id]))).toBe(true);
      const owner = readManifests(ROOT).find(m =>
        JSON.stringify(m.provides).includes(`"builtin:${id}"`)
      );
      expect((owner.assets || []).map(a => a.path)).toContain(sources[id]);
    }
  });

  test('families: one entry per js/*Widgets.js module, in the written order, each loading its own module', async () => {
    const committed = committedFamilies();
    const files = readdirSync(path.join(ROOT, 'js'))
      .filter(f => FAMILY_FILE.test(f))
      .sort();
    expect(
      Object.values(committed)
        .map(f => f.path)
        .sort()
    ).toEqual(files.map(f => `./${f}`));
    expect(Object.keys(committed)).toEqual(Object.keys(LAZY_FAMILIES));
    expect(Object.keys(committed).slice(0, FAMILY_ORDER.length)).toEqual([
      ...FAMILY_ORDER,
    ]);
    const owned = new Map(
      readManifests(ROOT).flatMap(m =>
        (m.provides?.widgetFamilies || []).map(f => [f.id, m])
      )
    );
    for (const [key, f] of Object.entries(committed)) {
      expect(keyOf(f.path.slice(2))).toBe(key);
      if (f.package) {
        // A package's family is read from the catalog, by its own id.
        expect(owned.has(f.package)).toBe(true);
        continue;
      }
      // The loader is the module it is registered for, and a retry reaches
      // the same one.
      expect(f.load).toBe(f.path);
      // What the module really exports, not what the generator read: the
      // instruments in its array, and the one readiness promise it has.
      const mod = await LAZY_FAMILIES[key].load();
      expect(f.ids).toEqual(mod[f.exportName].map(w => w.id));
      const ready = Object.keys(mod).filter(k => /Ready$/.test(k));
      expect(ready).toEqual(f.ready ? [f.ready] : []);
      expect(typeof mod[f.ready]?.then).toBe(
        f.ready ? 'function' : 'undefined'
      );
    }
    // Every package family is accounted for.
    expect(
      Object.values(committed)
        .filter(f => f.package)
        .map(f => f.package)
        .sort()
    ).toEqual([...owned.keys()].sort());
  }, 60_000);
});

describe('the generator reads the same registries the committed files hold', () => {
  const manifests = readManifests(ROOT);

  test('builtins: the same ids, modules and order', () => {
    const model = builtinEntries(manifests);
    const { loaders, sources } = committedBuiltins();
    expect(loaders).toEqual(
      Object.fromEntries(
        model.map(e => [e.id, path.posix.relative('js/platform', e.source)])
      )
    );
    expect(Object.keys(loaders)).toEqual(model.map(e => e.id));
    expect(sources).toEqual(
      Object.fromEntries(model.map(e => [e.id, e.source]))
    );
  });

  test('lessons: the same lessons, and the same Spanish shadows', () => {
    const { lessons, locales } = lessonEntries(ROOT);
    const { loaders, translations } = committedLessons();
    // Compared as sets: the order is the catalog's (checked above), and the
    // hand-written loaders had it in the order the lessons were first imported.
    expect(Object.keys(loaders).sort()).toEqual(lessons.map(l => l.id).sort());
    expect(Object.keys(translations)).toEqual(locales);
    for (const loc of locales)
      expect(Object.keys(translations[loc]).sort()).toEqual(
        lessons
          .filter(l => l.locales.includes(loc))
          .map(l => l.id)
          .sort()
      );
  });

  test('families: the same entries in the same order, each with the same ids, export and readiness', () => {
    const model = familyEntries(manifests, ROOT);
    const committed = committedFamilies();
    expect(committed).toEqual(
      Object.fromEntries(
        model.map(f => [
          f.key,
          f.familyId
            ? { package: f.familyId, path: f.path }
            : {
                load: f.path,
                path: f.path,
                exportName: f.exportName,
                ids: f.ids,
                ready: f.ready,
              },
        ])
      )
    );
    expect(Object.keys(committed)).toEqual(model.map(f => f.key));
  });
});

describe('what the generator cannot express is refused', () => {
  const instruments = body =>
    readFamily('x.js', `export const X_WIDGETS = ${body};`);

  test('a family whose ids it cannot read', () => {
    expect(() => instruments('[...OTHER]')).toThrow(/cannot read the id/);
    expect(() => instruments('[{ id: name }]')).toThrow(/cannot read the id/);
    expect(() => instruments('make()')).toThrow(/not an array literal/);
    expect(() =>
      readFamily(
        'x.js',
        'export const A_WIDGETS = []; export const B_WIDGETS = [];'
      )
    ).toThrow(/one exported \*_WIDGETS array/);
    expect(() =>
      readFamily(
        'x.js',
        'export const aReady = 1; export const bReady = 2; export const X_WIDGETS = [];'
      )
    ).toThrow(/more than one \*Ready/);
  });

  test('the three shapes it can read, and a call only when it is the id', () => {
    const src = `
      const a = { id: 'one' };
      const make = (id, x) => ({ id, x });
      export const dataReady = Promise.resolve();
      export const X_WIDGETS = [a, { id: 'two' }, make('three', 1)];`;
    expect(readFamily('x.js', src)).toEqual({
      exportName: 'X_WIDGETS',
      ids: ['one', 'two', 'three'],
      ready: 'dataReady',
    });
    const wrong = `
      const make = (id, x) => ({ id: x });
      export const X_WIDGETS = [make('three', 1)];`;
    expect(() => readFamily('x.js', wrong)).toThrow(/cannot read the id/);
  });

  test('a builtin id with a prefix it does not know, or an asset it cannot find', () => {
    const m = { id: 'p', assets: [{ path: 'js/data/other/else.js' }] };
    expect(() => sourceOf('model/thing', m)).toThrow(/does not know/);
    expect(() => sourceOf('data/thing', m)).toThrow(/found 0/);
    expect(
      sourceOf('data/thing', {
        id: 'p',
        assets: [{ path: 'js/data/x/thing.js' }],
      })
    ).toBe('js/data/x/thing.js');
    expect(sourceOf('widgets/power-law', m)).toBe('js/powerLawWidgets.js');
    expect(sourceOf('investigation/es/tides', m)).toBe(
      'js/data/investigations/es/tides.js'
    );
  });

  test('a package that is not built in cannot name a builtin', () => {
    expect(() =>
      builtinEntries([
        {
          id: 'p',
          kind: 'installed',
          provides: { dataPacks: [{ entry: 'builtin:data/x' }] },
          assets: [{ path: 'js/data/x.js' }],
        },
      ])
    ).toThrow(/only a built-in package/);
  });

  test('a manifest that disagrees with the module it names is an error', () => {
    const tmp = mkdtempSync(path.join(tmpdir(), 'registries-'));
    mkdirSync(path.join(tmp, 'js'));
    writeFileSync(
      path.join(tmp, 'js/aWidgets.js'),
      "const w = { id: 'real' };\nexport const A_WIDGETS = [w];\n"
    );
    const manifest = ids => ({
      id: 'pkg',
      provides: {
        widgetFamilies: [
          {
            id: 'a',
            entry: 'builtin:widgets/a',
            pick: 'A_WIDGETS',
            widgets: ids,
          },
        ],
      },
    });
    expect(() => familyEntries([manifest(['stale'])], tmp, [])).toThrow(
      /lists A_WIDGETS stale/
    );
    expect(familyEntries([manifest(['real'])], tmp, [])[0]).toMatchObject({
      key: 'a',
      familyId: 'a',
      ids: ['real'],
    });
  });

  test('a family it cannot read keeps a hand manifest: the package that owns it says what it holds', () => {
    const tmp = mkdtempSync(path.join(tmpdir(), 'registries-'));
    mkdirSync(path.join(tmp, 'js'));
    writeFileSync(
      path.join(tmp, 'js/aWidgets.js'),
      'export const A_WIDGETS = [...somethingElse];\n'
    );
    const manifest = {
      id: 'pkg',
      provides: {
        widgetFamilies: [
          {
            id: 'a',
            entry: 'builtin:widgets/a',
            pick: 'A_WIDGETS',
            widgets: ['one', 'two'],
          },
        ],
      },
    };
    // Unowned, it is an error; owned, the manifest's list is the family's.
    expect(() => familyEntries([], tmp, [])).toThrow(/cannot read the id/);
    expect(familyEntries([manifest], tmp, [])[0]).toMatchObject({
      key: 'a',
      familyId: 'a',
      exportName: 'A_WIDGETS',
      ids: ['one', 'two'],
    });
  });

  test('a region that is not there', () => {
    expect(() => splice('const a = 1;\n', 'nope', 'x')).toThrow(
      /no \/\/ <generated:nope>/
    );
  });
});

describe('new work reaches the registries with no other edit', () => {
  const tree = files => {
    const dir = mkdtempSync(path.join(tmpdir(), 'registries-'));
    for (const [rel, body] of Object.entries(files)) {
      mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
      writeFileSync(path.join(dir, rel), body);
    }
    return dir;
  };

  test('a lesson added to the catalog', () => {
    const dir = tree({
      'js/data/investigations.js': `
        import ONE from './investigations/one.js';
        import TWO from './investigations/two.js';
        import { gradedSteps } from './investigations/catalog.js';
        export const INVESTIGATIONS = [TWO, ONE];`,
      'js/data/investigations/one.js': '',
      'js/data/investigations/two.js': '',
      'js/data/investigations/es/two.js': '',
    });
    expect(lessonEntries(dir)).toEqual({
      locales: ['es'],
      lessons: [
        { id: 'two', locales: ['es'] },
        { id: 'one', locales: [] },
      ],
    });
  });

  test('a lesson imported but missing from the catalog, or the reverse, is an error', () => {
    const dir = tree({
      'js/data/investigations.js': `
        import ONE from './investigations/one.js';
        import TWO from './investigations/two.js';
        export const INVESTIGATIONS = [ONE];`,
      'js/data/investigations/one.js': '',
    });
    expect(() => lessonEntries(dir)).toThrow(/not the same list/);
  });

  test('a family module nobody listed is appended, in file order', () => {
    const dir = tree({
      'js/bWidgets.js': "export const B_WIDGETS = [{ id: 'b' }];",
      'js/aWidgets.js': "export const A_WIDGETS = [{ id: 'a' }];",
      'js/cWidgets.js':
        "export const cReady = 1;\nexport const C_WIDGETS = [{ id: 'c' }];",
    });
    const all = familyEntries([], dir, ['c']);
    expect(all.map(f => [f.key, f.ready])).toEqual([
      ['c', 'cReady'],
      ['a', null],
      ['b', null],
    ]);
  });

  test('a family module with a digit or a hyphen in its name is found, and one it cannot read stops the run', () => {
    const dir = tree({
      'js/lab3dWidgets.js': "export const LAB3D_WIDGETS = [{ id: 'l3' }];",
    });
    expect(familyEntries([], dir, []).map(f => f.key)).toEqual(['lab3d']);
    expect(FAMILY_FILE.test('lab3dWidgets.js')).toBe(true);
    expect(FAMILY_FILE.test('my-extraWidgets.js')).toBe(true);
    expect(FAMILY_FILE.test('widgets.js')).toBe(false);
    const odd = tree({
      'js/my-extraWidgets.js': 'export const A_WIDGETS = f();',
    });
    expect(() => familyEntries([], odd, [])).toThrow(/not an array literal/);
  });

  test('the regions come out as literal imports a bundler can see', async () => {
    const out = await renderRegions();
    expect(out[FILES.lessons].loaders).toContain(
      "'keplers-laws': () => import('./keplers-laws.js'),"
    );
    expect(out[FILES.lessons].translations).toContain(
      "'keplers-laws': () => import('./es/keplers-laws.js'),"
    );
    expect(out[FILES.builtins].builtins).toContain(
      "'widgets/power-law': () => import('../powerLawWidgets.js'),"
    );
    expect(out[FILES.families]['lazy-families']).toContain(
      "() => import('./energyWidgets.js'),"
    );
  });
});
