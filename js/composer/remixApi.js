// =============================================================================
// The remix half of the composer's verdict
// -----------------------------------------------------------------------------
// js/composer/api.js judges a pack; a pack with `derivedFrom` is also judged
// against the built-in investigation it was made from (js/platform/remix.js).
// This is the composer's side, which loads that investigation from the
// registry; it is imported only when a pack has a `derivedFrom`, so the
// composer page does not pay for the registry, the depth loader or the remix
// rules until an author opens a remix. The application's link reader has its
// own (js/remix/open.js) and shares ./remixCore.js.
// =============================================================================

import { loadInvestigation } from '../data/investigations/registry.js';
import { withDepth } from '../investigations/depth.js';
import { lessonProvider } from '../assignments/provider.js';
import { scenarioId, SCENARIO_INFO } from '../data/scenarioInfo.js';
import { originalDigest } from '../platform/remix.js';
import { compileWith, judgeWith, originalWith, remixOf } from './remixCore.js';

export { originalDigest };
export { remixInvestigation } from '../platform/remix.js';

/** @param {string} id - A built-in investigation id */
export const loadOriginal = id =>
  id
    ? originalWith(id, {
        loadInvestigation,
        withDepth,
        version: lessonProvider(id)?.version,
      })
    : Promise.resolve(null);

/**
 * Remix a built-in.
 * @param {string} from - The built-in's id
 * @param {{id: string, version?: string}} options - The new pack's identity
 * @returns {Promise<?{pack: object, kept: Array}>} Null when there is no such investigation
 */
export async function remixBuiltin(from, options) {
  const original = await loadOriginal(from);
  return original ? remixOf(original, from, options) : null;
}

/** @returns {Promise<{errors: Array, original: ?object}>} */
export async function judgeRemix(pack, errors, api) {
  const original = await loadOriginal(pack.derivedFrom?.id);
  return { errors: judgeWith(pack, errors, api, original), original };
}

/** The lesson and Spanish shadow the engine runs for a remix. */
export const compileRemixed = (pack, original) =>
  compileWith(pack, original, { scenarios: SCENARIO_INFO, scenarioId });
