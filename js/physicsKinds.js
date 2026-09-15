// =============================================================================
// What kind of check a check is
// -----------------------------------------------------------------------------
// Five kinds, and the names for them. Its own module because four things need
// the vocabulary and only one of them wants the three thousand lines of checks
// that go with it: the validator prints these names, the documentation
// generator writes them into a table, physics-checks.mjs assigns them, and the
// published validation page groups by them.
//
// In js/ rather than tools/ because the browser is one of those four. The page
// had its own copy with four entries, so the empirical check was filtered out
// of the kind summary and off the chart on a page whose heading promised every
// check by kind.
//
// There used to be one copy, in the validator, with four entries. The fifth
// kind rendered correctly anyway because the lookup falls through to the raw
// kind name when a label is missing - so nothing ever complained, and the
// coverage table in PHYSICS_VALIDATION.md, written by hand from that map,
// described four categories and 162 checks long after the suite had five and
// 243. A shared list is the fix: there is now one place to add a kind, and the
// table is generated from the suite rather than transcribed from it.
// =============================================================================

/** What each kind is called in prose and in a table a reader sees. */
export const KIND_LABEL = Object.freeze({
  analytic: 'analytic',
  integration: 'integrated',
  data: 'published',
  approximation: 'approximation',
  empirical: 'empirical',
});

/**
 * The short forms for the terminal, where the column is narrow and APPROX is
 * deliberately shouted so an educational model is never read as a measurement.
 */
export const KIND_SHORT = Object.freeze({
  ...KIND_LABEL,
  approximation: 'APPROX',
});

/** A stable order, so a generated table does not reshuffle between runs. */
export const KIND_ORDER = Object.freeze([
  'analytic',
  'integration',
  'data',
  'approximation',
  'empirical',
]);

/**
 * Count kinds into the canonical order, as "6 analytic, 1 published".
 *
 * @param {Record<string, number>} counts - Kind to how many
 * @returns {string} The phrase, in KIND_ORDER, unknown kinds last
 */
export function describeKinds(counts) {
  const known = KIND_ORDER.filter(k => counts[k]).map(
    k => `${counts[k]} ${KIND_LABEL[k]}`
  );
  const strangers = Object.keys(counts)
    .filter(k => !KIND_ORDER.includes(k))
    .sort()
    .map(k => `${counts[k]} ${k}`);
  return [...known, ...strangers].join(', ');
}
