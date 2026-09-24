// =============================================================================
// Finding and loading capability packages at run time
// -----------------------------------------------------------------------------
// The manifests are validated in full at build time (tools/capabilities.mjs);
// what ships is a compact catalog of them, and this. It answers three questions
// and does nothing else: which package provides a public id, what a package
// needs first, and the module behind a builtin reference - fetched once however
// many callers ask, and forgotten on failure so the next ask retries.
//
// A hashed chunk name never passes through here: callers name packages, public
// ids and builtin references, and only the bundler knows where a module went.
// =============================================================================

import { CATALOG, PLATFORM_API } from './catalog.generated.js';
import { BUILTINS } from './builtins.js';
import { satisfies } from './semver.js';

const byId = new Map(CATALOG.map(p => [p.id, p]));
const loads = new Map();

/** The package that provides a public id of a kind, or null. */
export function providerOf(kind, id) {
  for (const p of CATALOG) {
    if (kind === 'widgets') {
      const families = p.provides?.widgetFamilies || [];
      if (families.some(f => f.widgets.includes(id))) return p;
    } else if ((p.provides?.[kind] || []).some(e => e.id === id)) {
      return p;
    }
  }
  return null;
}

/**
 * A package and everything it needs, dependencies first.
 * @throws {Error} for an unknown package, an unsatisfied range, a platform API
 *   this build does not implement, or a cycle
 */
export function resolve(id, seen = new Set(), open = new Set(), order = []) {
  if (seen.has(id)) return order;
  if (open.has(id)) throw new Error(`capability dependency cycle at ${id}`);
  const p = byId.get(id);
  if (!p) throw new Error(`no capability package "${id}"`);
  if (!satisfies(PLATFORM_API, p.gravitas)) {
    throw new Error(
      `${id} needs platform API ${p.gravitas}; this is ${PLATFORM_API}`
    );
  }
  open.add(id);
  for (const [dep, range] of Object.entries(p.requires || {})) {
    const d = byId.get(dep);
    if (!d || !satisfies(d.version, range)) {
      throw new Error(`${id} needs ${dep} ${range}`);
    }
    resolve(dep, seen, open, order);
  }
  open.delete(id);
  seen.add(id);
  order.push(id);
  return order;
}

/** The module behind `builtin:<id>`, loaded once. */
export function loadBuiltin(ref) {
  const id = String(ref).replace(/^builtin:/, '');
  const load = BUILTINS[id];
  if (!load) return Promise.reject(new Error(`no built-in "${ref}"`));
  if (!loads.has(id)) {
    loads.set(
      id,
      load().catch(err => {
        loads.delete(id);
        throw err;
      })
    );
  }
  return loads.get(id);
}

/** A widget family's public shape, from its package, for js/widgets.js. */
export function widgetFamily(familyId) {
  for (const p of CATALOG) {
    const f = (p.provides?.widgetFamilies || []).find(x => x.id === familyId);
    if (f)
      return {
        package: p.id,
        ids: [...f.widgets],
        entry: f.entry,
        pick: f.pick,
      };
  }
  return null;
}
