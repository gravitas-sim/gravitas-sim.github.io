// =============================================================================
// Finding and loading capability packages at run time
// -----------------------------------------------------------------------------
// The manifests are validated in full at build time (tools/capabilities.mjs);
// what ships is a catalog of direct lookups generated from them, and this: the
// order a package's requirements load in, checked against the platform API and
// each required range, and the module behind a builtin reference - fetched once
// however many callers ask, and forgotten on failure so the next ask retries.
//
// A hashed chunk name never passes through here: callers name packages, public
// ids and builtin references, and only the bundler knows where a module went.
// =============================================================================

import { PACKAGES, PLATFORM_API } from './catalog.generated.js';
import { BUILTINS } from './builtins.js';
import { satisfies } from './semver.js';

const loads = new Map();

/**
 * A package and everything it needs, dependencies first.
 * @throws {Error} for an unknown package, an unsatisfied range, a platform API
 *   this build does not implement, or a cycle
 */
export function resolve(id, done = new Set(), open = new Set(), order = []) {
  if (done.has(id)) return order;
  if (open.has(id)) throw new Error(`capability dependency cycle at ${id}`);
  const p = PACKAGES[id];
  if (!p) throw new Error(`no capability package "${id}"`);
  const [, api, requires] = p;
  if (!satisfies(PLATFORM_API, api)) {
    throw new Error(`${id} needs platform API ${api}; this is ${PLATFORM_API}`);
  }
  open.add(id);
  for (const [dep, range] of Object.entries(requires)) {
    if (!PACKAGES[dep] || !satisfies(PACKAGES[dep][0], range)) {
      throw new Error(`${id} needs ${dep} ${range}`);
    }
    resolve(dep, done, open, order);
  }
  open.delete(id);
  done.add(id);
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
