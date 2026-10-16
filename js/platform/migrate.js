// =============================================================================
// Carrying saved work across a package's version change
// -----------------------------------------------------------------------------
// A package may rename its own public identifiers between versions - a
// control, a widget, a step - and declares each rename in its manifest's
// `migrations`, keyed on the range of versions it migrates from. Saved answers
// are keyed `${lesson}:${sid}:tool:${control}`, so a control rename is a key
// rename, and applying it needs no code of the package's own: a declarative
// package can migrate as safely as a built-in one. Reversible, so a round trip
// is checkable. Pure and tiny, because the runtime loads it for every packaged
// lesson and must not bring the validator with it.
// =============================================================================

import { satisfies } from './semver.js';

/**
 * Rename saved public identifiers across a version change.
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
