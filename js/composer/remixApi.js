// =============================================================================
// The remix half of the composer's verdict
// -----------------------------------------------------------------------------
// js/composer/api.js judges a pack; a pack with `derivedFrom` is also judged
// against the built-in investigation it was made from (js/platform/remix.js).
// This is the part that needs that investigation, so it is its own module,
// imported only when a pack has a `derivedFrom`: the composer page does not
// pay for the lesson registry, the depth loader or the remix rules until an
// author opens a remix.
// =============================================================================

import { loadInvestigation } from '../data/investigations/registry.js';
import { withDepth } from '../investigations/depth.js';
import { lessonProvider } from '../assignments/provider.js';
import { scenarioId, SCENARIO_INFO } from '../data/scenarioInfo.js';
import {
  checkRemix,
  compileRemix,
  excusedByOriginal,
  originalDigest,
  remixInvestigation,
} from '../platform/remix.js';

export { remixInvestigation, originalDigest };

/**
 * A built-in investigation as a remix starts from it: English, and the
 * Spanish merged over it, each with every depth laid in.
 *
 * @param {string} id - A built-in investigation id
 * @returns {Promise<{en: object, es: ?object, version: string}|null>} Null
 *   when Gravitas has no such investigation
 */
export async function loadOriginal(id) {
  const en = await loadInvestigation(id, 'en').catch(() => undefined);
  if (!en) return null;
  const es = await loadInvestigation(id, 'es').catch(() => undefined);
  return {
    en: await withDepth(en, 'en'),
    es: es && es !== en ? await withDepth(es, 'es') : null,
    version: lessonProvider(id)?.version ?? '1.0.0',
  };
}

/** The `summary` a card shows, which a lesson does not hold. */
async function summaryOf(id) {
  const [{ SUMMARIES }, { SUMMARIES_ES }] = await Promise.all([
    import('../data/investigations/summaries.js'),
    import('../data/investigations/summaries.es.js'),
  ]);
  return { en: SUMMARIES[id], es: SUMMARIES_ES[id] };
}

/**
 * Remix a built-in investigation.
 *
 * @param {string} from - The built-in's id
 * @param {{id: string, version?: string}} options - The new pack's identity
 * @returns {Promise<?{pack: object, kept: Array}>} Null when there is no such investigation
 */
export async function remixBuiltin(from, options) {
  const original = await loadOriginal(from);
  if (!original) return null;
  return remixInvestigation(original.en, original.es, {
    ...options,
    from: original.version,
    summary: await summaryOf(from),
  });
}

/**
 * Judge a remix's pack against its original: the format's errors that the
 * original's own shape does not explain, and every edit a remix may not make.
 *
 * @param {object} pack
 * @param {Array} errors - validateInvestigationPack's
 * @param {object} api - packApi()
 * @returns {Promise<{errors: Array, original: ?object}>}
 */
export async function judgeRemix(pack, errors, api) {
  const original = await loadOriginal(pack.derivedFrom?.id);
  const own = original
    ? errors.filter(e => !excusedByOriginal(e, pack, original.en))
    : errors;
  return {
    errors: [...own, ...checkRemix(pack, original?.en ?? null, api)],
    original,
  };
}

/** The lesson and Spanish shadow the engine runs for a remix. */
export const compileRemixed = (pack, original) =>
  compileRemix(pack, original.en, original.es, {
    scenarios: SCENARIO_INFO,
    scenarioId,
  });
