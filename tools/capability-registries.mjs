#!/usr/bin/env node
// =============================================================================
// The lazy registries, generated from what describes them
// -----------------------------------------------------------------------------
// Three registries answer "which module holds this, and how is it fetched":
//
//   LAZY_FAMILIES   js/widgets.js                          instrument families
//   BUILTINS        js/platform/builtins.js                what a manifest names
//   LOADERS, TRANSLATIONS
//                   js/data/investigations/registry.js     lessons, and Spanish
//
// Each entry has to be a literal import(), so that a bundler can see it and give
// the module a chunk of its own. That is why they were written by hand, and why
// this generator writes the same text instead of replacing them with data: the
// regions between `// <generated:NAME>` and `// </generated:NAME>` in those
// three files are this tool's output, and nothing outside them is touched.
//
// Where each registry's facts come from (CAPABILITY_RUNTIME.md, D-CAP-01):
//
//   builtins     the `builtin:<id>` references in capabilities/*.json. The
//                module an id names is found by its prefix (see sourceOf), and
//                tools/capabilities.mjs then checks that the package declares it.
//   lessons      INVESTIGATIONS in js/data/investigations.js, in catalog order; a
//                Spanish shadow is a lesson with a file in es/.
//   families     every js/*Widgets.js module, read with acorn: the array it
//                exports, the ids of the instruments in it, and the one
//                `...Ready` promise it exports, if any. A family a capability
//                package owns is written as the package's catalog entry.
//
// What is still written by hand, here, because nothing describes it: the order
// the families are listed in (allWidgets() reads the catalog in that order, and
// the audits print it), and three family names that are not their file's
// (FAMILY_KEYS). A family that is on neither list is appended in file order, so
// adding one needs no edit here.
//
//   node tools/capability-registries.mjs            write the regions
//   node tools/capability-registries.mjs --check    fail when one is stale
// =============================================================================

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as acorn from 'acorn';
// Namespace import: the package's API is named exports, and the default binding
// is absent under the test runner's ESM interop.
import * as prettier from 'prettier';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const FILES = Object.freeze({
  families: 'js/widgets.js',
  builtins: 'js/platform/builtins.js',
  lessons: 'js/data/investigations/registry.js',
});

/** The families' catalog order, as it was written when they were hand-listed. */
export const FAMILY_ORDER = Object.freeze([
  'energy',
  'binary',
  'blackHole',
  'habitability',
  'exoplanet',
  'tidal',
  'darkMatter',
  'chaos',
  'resonance',
  'stellar',
  'stellarEvolution',
  'observing',
  'spectra',
  'transit',
  'powerLaw',
  'gw',
  'light',
  'interiors',
  'variables',
  'lensing',
  'galactic',
  'survey',
  'cosmology',
  'detector',
  'sky',
  'compare',
  'gwEvents',
]);

/** The three families whose name is not their module's (`<name>Widgets.js`). */
export const FAMILY_KEYS = Object.freeze({
  'stellarSpectraWidgets.js': 'spectra',
  'variableWidgets.js': 'variables',
  'gwEventWidgets.js': 'gwEvents',
});

const BUILTIN_RANK = [
  'widgets/',
  'data/',
  'investigation/',
  'investigation/es/',
];

/** kebab-case to camelCase. */
const camel = s => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const lowerFirst = s => s[0].toLowerCase() + s.slice(1);

const read = (root, rel) => readFileSync(path.join(root, rel), 'utf8');

/** Every capability manifest, in file order. */
export function readManifests(root = REPO) {
  const dir = path.join(root, 'capabilities');
  return readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .sort()
    .map(f => JSON.parse(readFileSync(path.join(dir, f), 'utf8')));
}

/** The `builtin:` references in a manifest's `provides`, in document order. */
function builtinRefs(value) {
  if (typeof value === 'string')
    return value.startsWith('builtin:') ? [value.slice('builtin:'.length)] : [];
  if (Array.isArray(value)) return value.flatMap(builtinRefs);
  if (value && typeof value === 'object')
    return Object.values(value).flatMap(builtinRefs);
  return [];
}

/**
 * The module a builtin id names, from its prefix.
 *
 * Three prefixes, because three kinds of module are named so far: a lesson
 * (and its Spanish shadow), an instrument family, a data module that sits
 * among the package's own assets. An id with another prefix is an error rather
 * than a guess: teach this function the new kind.
 */
export function sourceOf(id, manifest) {
  if (id.startsWith('investigation/'))
    return `js/data/investigations/${id.slice('investigation/'.length)}.js`;
  if (id.startsWith('widgets/'))
    return `js/${camel(id.slice('widgets/'.length))}Widgets.js`;
  if (id.startsWith('data/')) {
    const file = `${camel(id.slice('data/'.length))}.js`;
    const hits = (manifest.assets || [])
      .map(a => a.path)
      .filter(p => p.startsWith('js/data/') && path.posix.basename(p) === file);
    if (hits.length !== 1)
      throw new Error(
        `${manifest.id}: builtin:${id} should be one asset named ${file} under js/data/, found ${hits.length}`
      );
    return hits[0];
  }
  throw new Error(
    `${manifest.id}: builtin:${id} has a prefix tools/capability-registries.mjs does not know`
  );
}

/** What js/platform/builtins.js holds: id, module path, owning package. */
export function builtinEntries(manifests) {
  const seen = new Map();
  for (const m of manifests)
    for (const id of builtinRefs(m.provides)) {
      if (m.kind !== 'built-in')
        throw new Error(
          `${m.id}: only a built-in package may name builtin:${id}`
        );
      if (!seen.has(id))
        seen.set(id, { id, source: sourceOf(id, m), pkg: m.id });
    }
  const rank = id => BUILTIN_RANK.findLastIndex(p => id.startsWith(p));
  return [...seen.values()].sort(
    (a, b) => rank(a.id) - rank(b.id) || (a.id < b.id ? -1 : 1)
  );
}

/**
 * The lessons in catalog order (INVESTIGATIONS in js/data/investigations.js,
 * which is the order of the lesson browser), and which locales have a shadow of
 * each. A lesson is a default import from ./investigations/<id>.js, listed in
 * that array by its local name. tests/capabilityRegistries.test.js holds the
 * list to the generated manifest.
 */
export function lessonEntries(root = REPO) {
  const dir = 'js/data/investigations';
  const program = acorn.parse(read(root, 'js/data/investigations.js'), {
    ecmaVersion: 'latest',
    sourceType: 'module',
  });
  const idOf = new Map();
  for (const n of program.body) {
    if (n.type !== 'ImportDeclaration') continue;
    const id = /^\.\/investigations\/([a-z0-9-]+)\.js$/.exec(
      n.source.value
    )?.[1];
    const def = n.specifiers.find(x => x.type === 'ImportDefaultSpecifier');
    if (id && def) idOf.set(def.local.name, id);
  }
  const catalog = topLevelConsts(program).get('INVESTIGATIONS');
  if (catalog?.type !== 'ArrayExpression')
    throw new Error('js/data/investigations.js has no INVESTIGATIONS array');
  const ids = catalog.elements.map(el => {
    if (el?.type !== 'Identifier' || !idOf.has(el.name))
      throw new Error(
        'INVESTIGATIONS lists something that is not an imported lesson'
      );
    return idOf.get(el.name);
  });
  if (ids.length !== idOf.size || new Set(ids).size !== ids.length)
    throw new Error(
      'INVESTIGATIONS and the lesson imports are not the same list'
    );
  const locales = readdirSync(path.join(root, dir), { withFileTypes: true })
    .filter(d => d.isDirectory() && /^[a-z]{2}$/.test(d.name))
    .map(d => d.name)
    .sort();
  return {
    locales,
    lessons: ids.map(id => {
      if (!existsSync(path.join(root, dir, `${id}.js`)))
        throw new Error(
          `${dir}/${id}.js is imported by the catalog but is not there`
        );
      return {
        id,
        locales: locales.filter(l =>
          existsSync(path.join(root, dir, l, `${id}.js`))
        ),
      };
    }),
  };
}

// ---------------------------------------------------------------------------
// Instrument families, read from the modules
// ---------------------------------------------------------------------------

const topLevelConsts = program => {
  const out = new Map();
  for (const node of program.body) {
    const decl =
      node.type === 'ExportNamedDeclaration' ? node.declaration : node;
    if (decl?.type !== 'VariableDeclaration') continue;
    for (const d of decl.declarations)
      if (d.id.type === 'Identifier') out.set(d.id.name, d.init);
  }
  return out;
};

const propertyValue = (object, name) => {
  const p = object.properties.find(
    q =>
      q.type === 'Property' &&
      (q.key.name === name || q.key.value === name) &&
      !q.computed
  );
  return p?.value;
};

/**
 * The id of one element of a family's array, or null where the reading cannot
 * follow it. Three shapes: an object literal, a name bound to one, and a call
 * of a top-level arrow function that returns an object whose `id` is its first
 * parameter (compareWidgets.js builds its instrument that way).
 */
function instrumentId(el, consts) {
  const literal = object => {
    const id =
      object?.type === 'ObjectExpression' ? propertyValue(object, 'id') : null;
    return id?.type === 'Literal' && typeof id.value === 'string'
      ? id.value
      : null;
  };
  if (el?.type === 'ObjectExpression') return literal(el);
  if (el?.type === 'Identifier') return literal(consts.get(el.name));
  if (el?.type === 'CallExpression' && el.callee.type === 'Identifier') {
    const fn = consts.get(el.callee.name);
    const first = el.arguments[0];
    const param = fn?.type === 'ArrowFunctionExpression' && fn.params[0];
    const body = fn?.body;
    const id = body?.type === 'ObjectExpression' && propertyValue(body, 'id');
    if (
      first?.type === 'Literal' &&
      typeof first.value === 'string' &&
      param?.type === 'Identifier' &&
      id?.type === 'Identifier' &&
      id.name === param.name
    )
      return first.value;
  }
  return null;
}

/**
 * What a family module declares: the array of instruments it exports, their
 * ids, and its readiness promise. Anything the reading cannot follow - a
 * spread, a computed id, two arrays - is an error that names the module: that
 * family keeps a hand entry until the generator is taught its shape.
 */
export function readFamily(file, source) {
  const program = acorn.parse(source, {
    ecmaVersion: 'latest',
    sourceType: 'module',
  });
  const consts = topLevelConsts(program);
  const exported = new Set();
  for (const node of program.body)
    if (node.type === 'ExportNamedDeclaration' && node.declaration)
      for (const d of node.declaration.declarations || [])
        exported.add(d.id.name);
  const arrays = [...exported].filter(n => /^[A-Z][A-Z0-9_]*_WIDGETS$/.test(n));
  if (arrays.length !== 1)
    throw new Error(
      `${file}: expected one exported *_WIDGETS array, found ${arrays.length}`
    );
  const array = consts.get(arrays[0]);
  if (array?.type !== 'ArrayExpression')
    throw new Error(`${file}: ${arrays[0]} is not an array literal`);
  const ids = array.elements.map(el => {
    const id = instrumentId(el, consts);
    if (typeof id !== 'string')
      throw new Error(
        `${file}: cannot read the id of an instrument in ${arrays[0]}`
      );
    return id;
  });
  const ready = [...exported].filter(n => /Ready$/.test(n));
  if (ready.length > 1)
    throw new Error(
      `${file}: more than one *Ready export: ${ready.join(', ')}`
    );
  return { exportName: arrays[0], ids, ready: ready[0] || null };
}

/**
 * A family module: any js/*Widgets.js, digits and hyphens included. One the
 * reader cannot follow is an error, never a file that is quietly left out.
 */
export const FAMILY_FILE = /.Widgets\.js$/;

/** The key a family is listed under. */
export const keyOf = file =>
  FAMILY_KEYS[file] || lowerFirst(file.replace(/Widgets\.js$/, ''));

/** Every family, in catalog order, with the package that owns it, if any. */
export function familyEntries(manifests, root = REPO, order = FAMILY_ORDER) {
  const owned = new Map();
  for (const m of manifests)
    for (const f of m.provides?.widgetFamilies || []) {
      const id = f.entry.replace(/^builtin:/, '');
      owned.set(sourceOf(id, m), { pkg: m.id, family: f });
    }
  const files = readdirSync(path.join(root, 'js'))
    .filter(f => FAMILY_FILE.test(f))
    .sort();
  const byKey = new Map();
  for (const file of files) {
    const own = owned.get(`js/${file}`);
    let read1;
    try {
      read1 = readFamily(file, read(root, `js/${file}`));
    } catch (error) {
      // A module the reading cannot follow keeps a hand manifest: a package
      // that owns the family says what it holds, and the generator trusts it
      // (tests/lazyWidgets.test.js holds that to the module at run time).
      if (!own) throw error;
      read1 = {
        exportName: own.family.pick,
        ids: [...own.family.widgets],
        ready: null,
      };
      own.trusted = true;
    }
    if (own && !own.trusted) {
      const f = own.family;
      if (f.pick !== read1.exportName || f.widgets.join() !== read1.ids.join())
        throw new Error(
          `${own.pkg}: ${f.id} lists ${f.pick} ${f.widgets.join()}, but ${file} exports ${read1.exportName} ${read1.ids.join()}`
        );
      if (read1.ready)
        throw new Error(
          `${own.pkg}: ${f.id} is read from the catalog, which has no readiness, and ${file} exports ${read1.ready}`
        );
    }
    byKey.set(keyOf(file), {
      key: keyOf(file),
      path: `./${file}`,
      ...read1,
      familyId: own ? own.family.id : null,
    });
  }
  for (const key of order)
    if (!byKey.has(key))
      throw new Error(`FAMILY_ORDER lists ${key}, which has no module`);
  const rest = [...byKey.keys()].filter(k => !order.includes(k)).sort();
  return [...order, ...rest].map(k => byKey.get(k));
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

const str = s => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
const key = k => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : str(k));

const renderFamilies = families =>
  [
    `// ${families
      .filter(f => f.ready)
      .map(f => f.key)
      .join(
        ', '
      )} wait on their own readiness (prose or data behind a second import); whenWidgetsReady() waits for it.`,
    'export const LAZY_FAMILIES = Object.freeze({',
    ...families.map(f =>
      f.familyId
        ? `${key(f.key)}: fromPackage(${str(f.familyId)}, ${str(f.path)}),`
        : `${key(f.key)}: familyEntry(() => import(${str(f.path)}), ${str(f.path)}, ${str(f.exportName)}, [${f.ids.map(str).join(', ')}]${f.ready ? `, ${str(f.ready)}` : ''}),`
    ),
    '});',
  ].join('\n');

/** A path from js/platform/ (where builtins.js is) to a repository path. */
const fromPlatform = p => path.posix.relative('js/platform', p);

const renderBuiltins = entries =>
  [
    'export const BUILTINS = {',
    ...entries.map(
      e => `${key(e.id)}: () => import(${str(fromPlatform(e.source))}),`
    ),
    '};',
    '',
    '/** Where each id lives, for the tools that check it; never used to load. */',
    'export const BUILTIN_SOURCES = {',
    ...entries.map(e => `${key(e.id)}: ${str(e.source)},`),
    '};',
  ].join('\n');

const renderLoaders = ({ lessons }) =>
  [
    'const LOADERS = {',
    ...lessons.map(l => `${key(l.id)}: () => import(${str(`./${l.id}.js`)}),`),
    '};',
  ].join('\n');

const renderTranslations = ({ lessons, locales }) =>
  [
    'const TRANSLATIONS = {',
    ...locales.flatMap(loc => [
      `${key(loc)}: {`,
      ...lessons
        .filter(l => l.locales.includes(loc))
        .map(l => `${key(l.id)}: () => import(${str(`./${loc}/${l.id}.js`)}),`),
      '},',
    ]),
    '};',
  ].join('\n');

/** Every region, as raw source: file -> region name -> text. */
export async function renderRegions(root = REPO) {
  const manifests = readManifests(root);
  const lessons = lessonEntries(root);
  return {
    [FILES.families]: {
      'lazy-families': renderFamilies(familyEntries(manifests, root)),
    },
    [FILES.builtins]: { builtins: renderBuiltins(builtinEntries(manifests)) },
    [FILES.lessons]: {
      loaders: renderLoaders(lessons),
      translations: renderTranslations(lessons),
    },
  };
}

const markerOpen = name => new RegExp(`^// <generated:${name}>.*$`, 'm');
const markerClose = name => `// </generated:${name}>`;

/** A file's text with one region's body replaced. */
export function splice(text, name, body) {
  const open = markerOpen(name).exec(text);
  const close = text.indexOf(markerClose(name));
  if (!open || close < open.index)
    throw new Error(`no // <generated:${name}> region`);
  const start = open.index + open[0].length;
  return `${text.slice(0, start)}\n${body}\n${text.slice(close)}`;
}

async function format(text, file) {
  const options = (await prettier.resolveConfig(path.join(REPO, file))) || {};
  return prettier.format(text, { ...options, filepath: path.join(REPO, file) });
}

/** The three files as they should be: file -> text. */
export async function expectedFiles(root = REPO) {
  const regions = await renderRegions(root);
  const out = {};
  for (const [file, byName] of Object.entries(regions)) {
    let text = read(root, file);
    for (const [name, body] of Object.entries(byName))
      text = splice(text, name, body);
    out[file] = await format(text, file);
  }
  return out;
}

/** The files whose regions differ, in text, from what the manifests say. */
export async function staleFiles(root = REPO) {
  const want = await expectedFiles(root);
  return Object.keys(want).filter(f => want[f] !== read(root, f));
}

/** A region's body: the text between its markers. */
function bodyOf(text, name) {
  const open = markerOpen(name).exec(text);
  const close = text.indexOf(markerClose(name));
  if (!open || close < open.index)
    throw new Error(`no // <generated:${name}> region`);
  return text.slice(open.index + open[0].length, close);
}

/** The code of a region without its formatting: the syntax tree, no positions. */
const shape = body =>
  JSON.stringify(
    acorn.parse(body, { ecmaVersion: 'latest', sourceType: 'module' }),
    (k, v) => (k === 'start' || k === 'end' || k === 'raw' ? undefined : v)
  );

/**
 * The regions that say something different from the manifests, compared as
 * code and not as text: the formatting is Prettier's to check (`--check`), and
 * this runs where Prettier does not, under Jest and in the capability build
 * check.
 *
 * @returns {Promise<string[]>} `file#region` for each stale one
 */
export async function staleRegions(root = REPO) {
  const out = [];
  for (const [file, byName] of Object.entries(await renderRegions(root)))
    for (const [name, body] of Object.entries(byName))
      if (shape(bodyOf(read(root, file), name)) !== shape(body))
        out.push(`${file}#${name}`);
  return out;
}

async function main(argv) {
  if (argv.includes('--check')) {
    const stale = await staleFiles();
    if (stale.length) {
      for (const f of stale)
        console.error(`  ${f}: a generated region is stale`);
      console.error('Run `node tools/capability-registries.mjs`.');
      return 1;
    }
    console.log('Lazy registries are what the manifests and modules say.');
    return 0;
  }
  const want = await expectedFiles();
  for (const [file, text] of Object.entries(want)) {
    if (read(REPO, file) !== text) {
      writeFileSync(path.join(REPO, file), text);
      console.log(`Wrote ${file}`);
    }
  }
  return 0;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main(process.argv.slice(2)).then(code => (process.exitCode = code));
}
