// =============================================================================
// gravitas.capability-package/1: what a capability package says about itself
// -----------------------------------------------------------------------------
// A package is a manifest - plain JSON - that names what it provides (models,
// instrument families, scenarios, investigations, translations, data packs,
// routes, assets), what it needs (other packages, a range of the Gravitas
// platform API), and what makes it trustworthy (citations, licenses, the checks
// that validate it, how its public identifiers migrate).
//
// Two kinds, and the difference is the security boundary:
//
//   built-in      reviewed code that ships with Gravitas. It may name code, but
//                 only as `builtin:<id>` - an entry in a registry the BUILD
//                 generates from these manifests, with a literal import() per
//                 entry. A package never names a path or URL to execute.
//   declarative   content only: JSON data, message catalogs, lesson structure.
//                 Anything that could execute - a builtin reference, a module
//                 path, a script URL, an entry point, a function hook - makes it
//                 invalid. An uploaded package is always declarative.
//
// Pure and dependency-free, so the build tools, the tests and the runtime share
// one definition of what a valid package is.
// =============================================================================

import { parseRange, parseVersion, satisfies } from './semver.js';

export const FORMAT = 'gravitas.capability-package';
export const FORMAT_VERSION = 1;
/** The platform API this build of Gravitas implements. */
export const PLATFORM_API = '1.0.0';

export const KINDS = ['built-in', 'declarative'];
const ID = /^[a-z0-9]+(\.[a-z0-9]+(-[a-z0-9]+)*)+$/;
const PUBLIC_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const TOP_LEVEL = new Set([
  'format',
  'formatVersion',
  'id',
  'version',
  'kind',
  'gravitas',
  'title',
  'requires',
  'uses',
  'provides',
  'assets',
  'citations',
  'licenses',
  'offline',
  'authoring',
  'validation',
  'migrations',
]);
/** What `provides` may contain, and the public-id field of each entry. */
export const PROVIDES = {
  routes: 'path',
  models: 'id',
  widgetFamilies: 'id',
  scenarios: 'id',
  investigations: 'id',
  translations: 'locale',
  dataPacks: 'id',
};
/** What a package may use from elsewhere. */
export const USES = ['scenarios', 'widgets', 'dataPacks', 'models'];
/** Fields that name code, allowed only in a built-in package. */
const CODE_FIELDS = new Set(['entry', 'pick', 'ready', 'services']);
const ASSET_ROLES = ['code', 'data', 'provenance', 'translation', 'image'];
const OFFLINE = ['core', 'optional', 'none'];
const POLICIES = ['precache', 'on-demand', 'online-only'];
const CHECK_REF = /^(registry|jest|e2e):[\w./-]+$/;

const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * Every problem with one manifest, each naming the field it is about.
 *
 * @param {unknown} m - A parsed manifest
 * @returns {Array<{path: string, message: string}>} Empty when valid
 */
export function validateManifest(m) {
  const errors = [];
  const fail = (path, message) => errors.push({ path, message });
  if (!isObject(m)) {
    fail('', 'a manifest is a JSON object');
    return errors;
  }
  for (const key of Object.keys(m)) {
    if (!TOP_LEVEL.has(key)) fail(key, `"${key}" is not a manifest field`);
  }
  if (m.format !== FORMAT) fail('format', `must be "${FORMAT}"`);
  if (m.formatVersion !== FORMAT_VERSION) {
    fail(
      'formatVersion',
      `must be ${FORMAT_VERSION}; this build reads no other`
    );
  }
  if (typeof m.id !== 'string' || !ID.test(m.id)) {
    fail('id', 'a dotted, lower-case identifier such as "gravitas.power-law"');
  }
  if (!parseVersion(m.version)) fail('version', 'a version such as "1.0.0"');
  if (!KINDS.includes(m.kind)) fail('kind', `one of ${KINDS.join(', ')}`);
  if (!parseRange(m.gravitas)) {
    fail('gravitas', 'a platform API range such as "^1.0.0"');
  }
  if (!isObject(m.title) || typeof m.title.en !== 'string' || !m.title.en) {
    fail('title.en', 'an English title');
  }
  if (m.requires !== undefined) {
    if (!isObject(m.requires)) fail('requires', 'an object of id to range');
    else {
      for (const [id, range] of Object.entries(m.requires)) {
        if (!ID.test(id)) fail(`requires.${id}`, 'not a package id');
        if (!parseRange(range)) fail(`requires.${id}`, 'not a version range');
      }
    }
  }
  // What a package reads from others - or from the core, while the core is not
  // yet packaged - by public id. A used id another package provides must come
  // from a package this one requires (checked across the set).
  if (m.uses !== undefined) {
    if (!isObject(m.uses)) fail('uses', 'an object of kind to ids');
    else {
      for (const [kind, ids] of Object.entries(m.uses)) {
        if (!USES.includes(kind))
          fail(`uses.${kind}`, `one of ${USES.join(', ')}`);
        else if (!Array.isArray(ids) || ids.some(i => typeof i !== 'string')) {
          fail(`uses.${kind}`, 'a list of public ids');
        }
      }
    }
  }
  if (!isObject(m.provides)) fail('provides', 'an object');
  else {
    for (const [key, list] of Object.entries(m.provides)) {
      if (!(key in PROVIDES)) {
        fail(`provides.${key}`, `"${key}" is not something a package provides`);
        continue;
      }
      if (!Array.isArray(list)) {
        fail(`provides.${key}`, 'a list');
        continue;
      }
      list.forEach((entry, i) => {
        const at = `provides.${key}[${i}]`;
        const idField = PROVIDES[key];
        if (!isObject(entry) || typeof entry[idField] !== 'string') {
          fail(at, `needs a "${idField}"`);
          return;
        }
        if (key !== 'routes' && key !== 'translations' && key !== 'scenarios') {
          if (!PUBLIC_ID.test(entry.id)) {
            fail(`${at}.id`, 'a kebab-case public identifier');
          }
        }
        if (key === 'widgetFamilies') {
          if (!Array.isArray(entry.widgets) || !entry.widgets.length) {
            fail(`${at}.widgets`, 'the widget ids the family owns');
          } else {
            for (const w of entry.widgets) {
              if (!PUBLIC_ID.test(w))
                fail(`${at}.widgets`, `"${w}" is not a public id`);
            }
          }
        }
        if (
          entry.entry !== undefined &&
          !/^builtin:[\w./-]+$/.test(entry.entry)
        ) {
          fail(`${at}.entry`, 'code is named only as builtin:<id>');
        }
      });
    }
  }
  if (m.assets !== undefined) {
    if (!Array.isArray(m.assets)) fail('assets', 'a list');
    else {
      m.assets.forEach((a, i) => {
        const at = `assets[${i}]`;
        if (!isObject(a) || typeof a.path !== 'string') {
          fail(at, 'needs a path');
          return;
        }
        if (/^[a-z]+:|^\/|(^|\/)\.\.(\/|$)/i.test(a.path)) {
          fail(`${at}.path`, 'a repository-relative path, never a URL or ..');
        }
        if (!ASSET_ROLES.includes(a.role)) {
          fail(`${at}.role`, `one of ${ASSET_ROLES.join(', ')}`);
        }
        if (!OFFLINE.includes(a.offline)) {
          fail(`${at}.offline`, `one of ${OFFLINE.join(', ')}`);
        }
      });
    }
  }
  if (!Array.isArray(m.citations))
    fail('citations', 'a list (it may be empty)');
  if (!Array.isArray(m.licenses) || !m.licenses.length) {
    fail('licenses', 'at least one license, with the paths it covers');
  }
  if (!isObject(m.offline) || !POLICIES.includes(m.offline.policy)) {
    fail('offline.policy', `one of ${POLICIES.join(', ')}`);
  }
  if (m.validation !== undefined) {
    if (!Array.isArray(m.validation)) fail('validation', 'a list');
    else {
      m.validation.forEach((v, i) => {
        if (!isObject(v) || !CHECK_REF.test(v.check || '')) {
          fail(
            `validation[${i}].check`,
            'registry:<id>, jest:<path> or e2e:<path>'
          );
        }
      });
    }
  }
  if (m.migrations !== undefined) {
    if (!Array.isArray(m.migrations)) fail('migrations', 'a list');
    else {
      m.migrations.forEach((g, i) => {
        const at = `migrations[${i}]`;
        if (!isObject(g) || !parseRange(g.from) || !parseVersion(g.to)) {
          fail(at, 'needs a "from" range and a "to" version');
          return;
        }
        if (g.renames !== undefined && !isObject(g.renames)) {
          fail(`${at}.renames`, 'an object of kind to {old: new}');
        }
      });
    }
  }
  // The security boundary. A declarative package names no code at all: no
  // builtin reference, no code field, no script path, no URL to fetch.
  if (m.kind === 'declarative') {
    walk(m, '', (path, key, value) => {
      if (CODE_FIELDS.has(key))
        fail(path, 'a declarative package names no code');
      if (typeof value === 'string') {
        if (/^builtin:/.test(value))
          fail(path, 'a declarative package names no code');
        if (
          /\.(m?js|cjs|wasm)(\?|#|$)/i.test(value) ||
          /^(javascript|data|blob):/i.test(value)
        ) {
          fail(path, 'a declarative package names no script');
        }
        if (/^https?:\/\//i.test(value) && key !== 'url' && key !== 'doi') {
          fail(path, 'a declarative package fetches nothing from a URL');
        }
      }
    });
    for (const a of Array.isArray(m.assets) ? m.assets : []) {
      if (a && a.role === 'code')
        fail('assets', 'a declarative package ships no code');
    }
  }
  // Build internals never become public: a hashed chunk name in a manifest
  // would be a contract nobody could keep.
  walk(m, '', (path, key, value) => {
    if (typeof value === 'string' && /(^|\/)chunk-[A-Z0-9]{6,}/.test(value)) {
      fail(path, 'names a build chunk, which is not a public identifier');
    }
  });
  return errors;
}

function walk(value, path, visit, key = '') {
  if (Array.isArray(value)) {
    value.forEach((v, i) => walk(v, `${path}[${i}]`, visit, key));
  } else if (isObject(value)) {
    for (const [k, v] of Object.entries(value)) {
      const p = path ? `${path}.${k}` : k;
      // Each key once: a container's key for what it is called, a leaf's key
      // with its value.
      if (isObject(v) || Array.isArray(v)) {
        visit(p, k, undefined);
        walk(v, p, visit, k);
      } else {
        visit(p, k, v);
      }
    }
  } else if (path) {
    visit(path, key, value);
  }
}

/**
 * Every problem with a set of packages taken together: each manifest's own,
 * then duplicates, missing or incompatible dependencies, and cycles.
 *
 * @param {object[]} packages
 * @param {{api?: string}} [options] - The platform API version to check against
 * @returns {Array<{package: string, path: string, message: string}>}
 */
export function validatePackages(packages, { api = PLATFORM_API } = {}) {
  const errors = [];
  const byId = new Map();
  for (const p of packages) {
    const id = p?.id || '(no id)';
    for (const e of validateManifest(p)) errors.push({ package: id, ...e });
    if (byId.has(id))
      errors.push({
        package: id,
        path: 'id',
        message: 'two packages have this id',
      });
    byId.set(id, p);
    if (parseRange(p?.gravitas) && !satisfies(api, p.gravitas)) {
      errors.push({
        package: id,
        path: 'gravitas',
        message: `needs platform API ${p.gravitas}; this build is ${api}`,
      });
    }
  }
  // Public identifiers are shared by the whole platform, so two packages may
  // not claim one - which is how a widget id or a lesson id stays stable.
  const claimed = new Map();
  for (const p of packages) {
    for (const [key, field] of Object.entries(PROVIDES)) {
      for (const entry of p?.provides?.[key] || []) {
        const names = [`${key}:${entry?.[field]}`];
        if (key === 'widgetFamilies')
          for (const w of entry.widgets || []) names.push(`widget:${w}`);
        for (const name of names) {
          if (claimed.has(name) && claimed.get(name) !== p.id) {
            errors.push({
              package: p.id,
              path: `provides.${key}`,
              message: `"${name}" is also provided by ${claimed.get(name)}`,
            });
          }
          claimed.set(name, p.id);
        }
      }
    }
  }
  for (const p of packages) {
    for (const [dep, range] of Object.entries(p?.requires || {})) {
      const target = byId.get(dep);
      if (!target) {
        errors.push({
          package: p.id,
          path: `requires.${dep}`,
          message: 'requires a package that is not installed',
        });
      } else if (!satisfies(target.version, range)) {
        errors.push({
          package: p.id,
          path: `requires.${dep}`,
          message: `needs ${range}; ${target.version} is installed`,
        });
      }
    }
  }
  // An id used from another package is a dependency, whether or not it was
  // written down: a lesson whose instrument arrives by accident breaks the day
  // the other package moves.
  const providerOf = new Map();
  for (const p of packages) {
    for (const f of p?.provides?.widgetFamilies || []) {
      for (const w of f.widgets || []) providerOf.set(`widgets:${w}`, p.id);
    }
    for (const d of p?.provides?.dataPacks || [])
      providerOf.set(`dataPacks:${d.id}`, p.id);
    for (const d of p?.provides?.models || [])
      providerOf.set(`models:${d.id}`, p.id);
    for (const d of p?.provides?.scenarios || [])
      providerOf.set(`scenarios:${d.id}`, p.id);
  }
  for (const p of packages) {
    for (const [kind, ids] of Object.entries(p?.uses || {})) {
      for (const id of Array.isArray(ids) ? ids : []) {
        const from = providerOf.get(`${kind}:${id}`);
        if (from && from !== p.id && !(from in (p.requires || {}))) {
          errors.push({
            package: p.id,
            path: `uses.${kind}`,
            message: `uses "${id}" from ${from} without requiring it`,
          });
        }
      }
    }
  }
  const cycle = findCycle(packages);
  if (cycle) {
    errors.push({
      package: cycle[0],
      path: 'requires',
      message: `dependency cycle: ${cycle.join(' -> ')}`,
    });
  }
  return errors;
}

/** The first dependency cycle, as a list of ids ending where it began, or null. */
export function findCycle(packages) {
  const requires = new Map(
    packages.map(p => [p?.id, Object.keys(p?.requires || {})])
  );
  const state = new Map();
  const stack = [];
  const visit = id => {
    state.set(id, 'open');
    stack.push(id);
    for (const dep of requires.get(id) || []) {
      if (!requires.has(dep)) continue;
      if (state.get(dep) === 'open')
        return [...stack.slice(stack.indexOf(dep)), dep];
      if (!state.has(dep)) {
        const found = visit(dep);
        if (found) return found;
      }
    }
    stack.pop();
    state.set(id, 'done');
    return null;
  };
  for (const id of requires.keys()) {
    if (!state.has(id)) {
      const found = visit(id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * A package and everything it needs, dependencies first.
 * @throws when an id is unknown or the requirements form a cycle
 */
export function dependencyOrder(packages, rootId) {
  const byId = new Map(packages.map(p => [p.id, p]));
  const order = [];
  const seen = new Set();
  const open = new Set();
  const visit = id => {
    if (seen.has(id)) return;
    if (open.has(id)) throw new Error(`dependency cycle through ${id}`);
    const p = byId.get(id);
    if (!p) throw new Error(`no package "${id}"`);
    open.add(id);
    for (const dep of Object.keys(p.requires || {})) visit(dep);
    open.delete(id);
    seen.add(id);
    order.push(id);
  };
  visit(rootId);
  return order;
}

/**
 * Rename saved public identifiers across a version change, as the package's
 * declared migrations say. Declarative, so it needs no code of the package's
 * own, and reversible, so a round trip is checkable.
 *
 * @param {Record<string, unknown>} saved - Keys such as `${sid}:tool:${control}`
 * @param {object[]} migrations - The package's `migrations`
 * @param {string} fromVersion - The version the saved state was made with
 * @param {{reverse?: boolean}} [options]
 * @returns {Record<string, unknown>}
 */
export function migrateSaved(
  saved,
  migrations,
  fromVersion,
  { reverse = false } = {}
) {
  let out = { ...saved };
  const steps = (migrations || []).filter(g =>
    reverse ? true : satisfies(fromVersion, g.from)
  );
  for (const g of reverse ? [...steps].reverse() : steps) {
    const controls = g.renames?.controls || {};
    const map = reverse
      ? Object.fromEntries(Object.entries(controls).map(([a, b]) => [b, a]))
      : controls;
    const next = {};
    for (const [key, value] of Object.entries(out)) {
      const m = /^(.*):tool:([^:]+)$/.exec(key);
      next[m && map[m[2]] ? `${m[1]}:tool:${map[m[2]]}` : key] = value;
    }
    out = next;
  }
  return out;
}
