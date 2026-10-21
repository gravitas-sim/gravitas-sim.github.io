#!/usr/bin/env node
// =============================================================================
// The surface gate: one decision function, the same for every surface
// -----------------------------------------------------------------------------
//   node tools/surface-gate.mjs check     the verdicts follow from the evidence
//                                         and the generated tables are current
//   node tools/surface-gate.mjs write     write the generated tables
//   node tools/surface-gate.mjs report    print the verdicts
//
// Prompt 165. SURFACE_RETIREMENT_GATE.md says how a surface is judged; this
// file is the judgment as code, so that a verdict is a function of recorded
// evidence and not of a mood. `tools/surface-gate.json` holds the evidence, one
// record per surface; `decide()` below is the only thing that turns a record
// into a verdict; `tests/surfaceGate.test.js` holds the two together.
//
// The thresholds and the support periods in this file were committed before
// any surface was judged (the commit that adds this file has no evidence file),
// and a change to one is a decision-register row, never an edit made because a
// surface came out the wrong way.
//
// Nothing here changes the site. A verdict is read by Prompt 166, which carries
// out the ones Carl approves, one pull request each.
// =============================================================================

/** The five verdicts, and what each one allows (SURFACE_RETIREMENT_GATE.md). */
export const VERDICTS = Object.freeze([
  'KEEP',
  'FREEZE',
  'GROUP',
  'CONSOLIDATE',
  'RETIRE',
]);

/**
 * The thresholds. Cost is "material" when at least `atLeast` of the six signals
 * reach their value; a route merge is "justified" only by a measured gain.
 */
export const THRESHOLDS = Object.freeze({
  material: Object.freeze({
    atLeast: 2,
    /** Source lines only this surface loads (its page and the modules no other page reaches). */
    lines: 1500,
    /** Test files (Jest and Playwright) that name the surface. */
    testFiles: 3,
    /** Generated artifacts that exist only for it. */
    generated: 2,
    /** Catalog keys per language that only it uses. */
    strings: 150,
    /** Gzip KB of its own files in the service worker's precache tiers. */
    precacheKb: 20,
    /** Rows of the accessibility spec that open it. */
    axeRows: 4,
  }),
  consolidate: Object.freeze({
    /** At least this many routes leave the stamped set. */
    removesRoutes: 1,
    /** And at least one of these gains, measured: */
    savingKb: 5,
    choicesRemoved: 1,
    duplicatedModules: 1,
  }),
});

/**
 * The link-support policy (Prompt 165, register row D-R10-44). A period ends
 * when both its months and its minor releases have passed. It is counted from
 * the release that first carries the notice, never from a merge to a train that
 * is not deployed. Class R covers saved records, files a person can hold and
 * links that carry state; class L covers a route or a capability that holds
 * nothing. Class R's periods are FORMATS.md's support period.
 */
export const PERIODS = Object.freeze({
  L: Object.freeze({
    deprecated: Object.freeze({ months: 6, minorReleases: 2 }),
    readOnly: Object.freeze({ months: 6, minorReleases: 1 }),
  }),
  R: Object.freeze({
    deprecated: Object.freeze({ months: 12, minorReleases: 2 }),
    readOnly: Object.freeze({ months: 12, minorReleases: 1 }),
  }),
});

const count = x => (Array.isArray(x) ? x.length : Number(x) || 0);

/** The six cost signals that reached their threshold, and whether that is "material". */
export function costClass(cost = {}) {
  const t = THRESHOLDS.material;
  const reached = Object.keys(t)
    .filter(k => k !== 'atLeast')
    .filter(k => Number(cost[k]) >= t[k]);
  return { material: reached.length >= t.atLeast, reached };
}

/** A route merge is justified by a named target, a route removed and a measured gain. */
export function mergeJustified(merge) {
  if (!merge || !merge.target) return false;
  const t = THRESHOLDS.consolidate;
  if (!(merge.removesRoutes >= t.removesRoutes)) return false;
  if (merge.keepsRequestCeiling === false) return false;
  return (
    merge.savingKb >= t.savingKb ||
    merge.choicesRemoved >= t.choicesRemoved ||
    merge.duplicatedModules >= t.duplicatedModules
  );
}

/** Class R when anything a person can hold or share carries state to the surface; else class L. */
export function supportClass(e) {
  return count(e.exposure?.records) > 0 || count(e.exposure?.stateLinks) > 0
    ? 'R'
    : 'L';
}

/**
 * The decision function. Rules are tried in order and the first match wins; the
 * rule id is part of the answer so a verdict can be traced.
 *
 * @param {object} e one evidence record: {unique, replacement, role, menu,
 *   firstAction, use:{shippedLinks, libraryEntries}, cost, exposure:{links,
 *   records, stateLinks}, merge}
 * @returns {{verdict: string, rule: string, material: boolean, support: ?string, why: string}}
 */
export function decide(e) {
  const material = costClass(e.cost).material;
  const used = count(e.use?.shippedLinks) + count(e.use?.libraryEntries) > 0;
  const out = (verdict, rule, why) => ({
    verdict,
    rule,
    material,
    support:
      verdict === 'RETIRE' || verdict === 'CONSOLIDATE'
        ? supportClass(e)
        : null,
    why,
  });

  if (e.unique !== 'yes' && e.unique !== 'partly' && e.unique !== 'no') {
    return out('KEEP', 'R0', 'the unique-task test could not be answered');
  }
  if (e.firstAction) {
    return out('KEEP', 'R1', "a destination's own first-action page");
  }
  if (e.menu === true) {
    return out('GROUP', 'R2', 'a menu entry that is not a destination');
  }
  if (e.unique === 'yes') {
    const exposed =
      count(e.exposure?.links) +
        count(e.exposure?.records) +
        count(e.exposure?.stateLinks) >
      0;
    return !used && !exposed && material
      ? out('FREEZE', 'R3a', 'unique, but nothing uses it, nothing holds it, and it costs')
      : out('KEEP', 'R3b', 'a task nothing else supports');
  }
  if (!e.replacement) {
    return out('KEEP', 'R4', 'no replacement is named, so nothing can be pointed at');
  }
  if (!used) {
    if (e.unique === 'no') {
      return out('RETIRE', 'R5', 'a named replacement does all of it and nothing shipped uses it');
    }
    return material
      ? out('FREEZE', 'R6a', 'only partly replaced, unused, and it costs')
      : out('KEEP', 'R6b', 'only partly replaced');
  }
  if (mergeJustified(e.merge)) {
    return out('CONSOLIDATE', 'R7', 'used, and a merge into the named target has a measured gain');
  }
  return material
    ? out('FREEZE', 'R8a', 'used, replaceable, no measured merge gain, and it costs')
    : out('KEEP', 'R8b', 'used, and the merge gains nothing measured');
}
