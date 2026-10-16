// =============================================================================
// Capability packages at run time
// -----------------------------------------------------------------------------
// The manifests are validated in full at build time (tools/capabilities.mjs);
// what ships is a catalog of direct lookups generated from them, and this:
//
//   resolve(id)          a package and what it needs, dependencies first,
//                        checked against the platform API and every range
//   loadBuiltin(ref)     the module behind `builtin:<id>`, fetched once however
//                        many callers ask, and forgotten on failure so the next
//                        ask fetches again rather than replaying the failure
//   providerOf(kind, id) the package that provides a public id, or null for a
//                        capability still built into the core
//   migrateSavedProgress a packaged lesson's saved answers carried across its
//                        package's declared renames
//
// It accepts only the packages the build validated and compiled into the
// catalog. A package the build never saw is checked by checkAgainstInstalled()
// in ./manifest.js; that arrives in the browser with package import, not
// before, because the validator costs 8.2 KB of a deferred budget with 2 to spare.
//
// Importing this also installs the packaged lessons' loaders into the lesson
// registry, which does not import the platform itself.
//
// A hashed chunk name never passes through here: callers name packages, public
// ids and builtin references, and only the bundler knows where a module went.
// Failures are CapabilityErrors with a stable `code`, so a caller can say what
// happened in the reader's language rather than showing an exception.
// =============================================================================

import {
  PACKAGES,
  PLATFORM_API,
  LESSONS,
  MIGRATIONS,
  OWNERS,
} from './catalog.generated.js';
import { BUILTINS } from './builtins.js';
import { satisfies } from './semver.js';
import { migrateSaved } from './migrate.js';
import { provideLessonLoaders } from '../data/investigations/registry.js';

/** A capability that could not be resolved or loaded. */
export class CapabilityError extends Error {
  /**
   * @param {string} code - unknown-package, api-range, requirement, cycle,
   *   unknown-builtin or load-failed
   * @param {string} message
   * @param {{retryable?: boolean, cause?: unknown}} [options]
   */
  constructor(code, message, { retryable = false, cause } = {}) {
    super(message);
    this.name = 'CapabilityError';
    this.code = code;
    this.retryable = retryable;
    if (cause !== undefined) this.cause = cause;
  }
}

const loads = new Map();

/**
 * A package and everything it needs, dependencies first.
 * @throws {CapabilityError}
 */
export function resolve(id, done = new Set(), open = new Set(), order = []) {
  if (done.has(id)) return order;
  if (open.has(id)) {
    throw new CapabilityError('cycle', `capability dependency cycle at ${id}`);
  }
  const p = PACKAGES[id];
  if (!p) throw new CapabilityError('unknown-package', `no package "${id}"`);
  const [, api, requires] = p;
  if (!satisfies(PLATFORM_API, api)) {
    throw new CapabilityError(
      'api-range',
      `${id} needs platform API ${api}; this is ${PLATFORM_API}`
    );
  }
  open.add(id);
  for (const [dep, range] of Object.entries(requires)) {
    if (!PACKAGES[dep] || !satisfies(PACKAGES[dep][0], range)) {
      throw new CapabilityError('requirement', `${id} needs ${dep} ${range}`);
    }
    resolve(dep, done, open, order);
  }
  open.delete(id);
  done.add(id);
  order.push(id);
  return order;
}

/**
 * The module behind `builtin:<id>`, loaded once.
 * @returns {Promise<object>} Rejects with a CapabilityError
 */
export function loadBuiltin(ref) {
  const id = String(ref).replace(/^builtin:/, '');
  const load = BUILTINS[id];
  if (!load) {
    return Promise.reject(
      new CapabilityError('unknown-builtin', `no built-in "${ref}"`)
    );
  }
  if (!loads.has(id)) {
    loads.set(
      id,
      load().catch(cause => {
        loads.delete(id);
        throw new CapabilityError('load-failed', `${ref} did not load`, {
          retryable: true,
          cause,
        });
      })
    );
  }
  return loads.get(id);
}

/**
 * The package that provides a public id, or null for a capability still built
 * into the core - which is how the core's unmigrated capabilities and the
 * packaged ones sit side by side while the repository moves in stages.
 * @param {'widgets'|'widgetFamilies'|'investigations'|'dataPacks'} kind
 */
export const providerOf = (kind, id) => OWNERS[`${kind}:${id}`] || null;

/** Where a packaged lesson's saved work was last read, by package. */
const STAMPS = 'gravitas_capability_versions';

/**
 * A packaged lesson's saved answers, carried across its package's renames.
 *
 * The first version of every package keeps the ids its content had before it
 * was packaged, so a save with no stamp is a 1.0.0 save: a student who last
 * opened the lesson before packaging, or before any rename, is migrated from
 * there. The stamp is updated once the answers are read.
 *
 * @param {string} lessonId
 * @param {Record<string, unknown>} responses
 * @param {Storage} [storage]
 * @param {{version?: string, migrations?: object[]}} [package_] - What the
 *   package says, for a test that has to pretend a later version shipped
 * @returns {Record<string, unknown>}
 */
export function migrateSavedProgress(
  lessonId,
  responses,
  storage,
  package_ = {}
) {
  const pkg = LESSONS[lessonId]?.[2];
  if (!pkg || !responses) return responses;
  const store = storage ?? globalThis.localStorage;
  const version = package_.version ?? PACKAGES[pkg][0];
  const migrations = package_.migrations ?? MIGRATIONS[pkg];
  let stamps = {};
  try {
    stamps = JSON.parse(store?.getItem(STAMPS) || '{}') || {};
  } catch {
    stamps = {};
  }
  const from = stamps[pkg] || '1.0.0';
  const out =
    from !== version && migrations
      ? migrateSaved(responses, migrations, from)
      : responses;
  if (stamps[pkg] !== version) {
    try {
      store?.setItem(STAMPS, JSON.stringify({ ...stamps, [pkg]: version }));
    } catch {
      /* the answers are migrated for this read; the stamp is retried next */
    }
  }
  return out;
}

// The packaged lessons, into the registry the lesson engine reads.
for (const [id, [entry, translations]] of Object.entries(LESSONS)) {
  provideLessonLoaders(id, {
    lesson: () => loadBuiltin(entry),
    translations: Object.fromEntries(
      Object.entries(translations).map(([locale, ref]) => [
        locale,
        () => loadBuiltin(ref),
      ])
    ),
  });
}
