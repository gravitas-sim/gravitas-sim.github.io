// =============================================================================
// The parts of a remix that need nothing of the lesson engine
// -----------------------------------------------------------------------------
// Shared by the composer (./remixApi.js, which loads the original from the
// registry itself) and by the application's link reader (js/remix/open.js, which
// is handed the engine's own loader). Importing neither the registry nor the
// scenario catalog is the point: the link reader reaches the engine only
// through js/investigations.js, so it adds no chunk to a lesson's route.
// =============================================================================

import {
  checkRemix,
  compileRemix,
  excusedByOriginal,
  remixInvestigation,
} from '../platform/remix.js';

/** The `summary` a card shows, which a lesson does not hold. */
export async function summaryOf(id) {
  const [{ SUMMARIES }, { SUMMARIES_ES }] = await Promise.all([
    import('../data/investigations/summaries.js'),
    import('../data/investigations/summaries.es.js'),
  ]);
  return { en: SUMMARIES[id], es: SUMMARIES_ES[id] };
}

/**
 * A built-in as a remix starts from it: English, and the Spanish merged over
 * it, each with every depth laid in.
 *
 * @param {string} id
 * @param {object} deps
 * @param {Function} deps.loadInvestigation - (id, locale) => lesson
 * @param {Function} deps.withDepth - (lesson, locale) => lesson with depths laid
 * @param {string} [deps.version] - The original's version
 */
export async function originalWith(
  id,
  { loadInvestigation, withDepth, version }
) {
  const en = await loadInvestigation(id, 'en').catch(() => undefined);
  if (!en) return null;
  const es = await loadInvestigation(id, 'es').catch(() => undefined);
  return {
    en: await withDepth(en, 'en'),
    es: es && es !== en ? await withDepth(es, 'es') : null,
    version: version ?? '1.0.0',
  };
}

/** The pack a remix of `original` starts as. */
export async function remixOf(original, from, options) {
  return remixInvestigation(original.en, original.es, {
    ...options,
    from: original.version,
    summary: await summaryOf(from),
  });
}

/**
 * Judge a remix's pack against its original: the format's errors the
 * original's own shape does not explain, and every edit a remix may not make.
 */
export function judgeWith(pack, errors, api, original) {
  const own = original
    ? errors.filter(e => !excusedByOriginal(e, pack, original.en))
    : errors;
  return [...own, ...checkRemix(pack, original?.en ?? null, api)];
}

/** The lesson and Spanish shadow the engine runs for a remix. */
export const compileWith = (pack, original, scenarioApi) =>
  compileRemix(pack, original.en, original.es, scenarioApi);
