// =============================================================================
// Which message ids are allowed to be late
// -----------------------------------------------------------------------------
// A clean start-up used to print dozens of `[i18n] no message for ...` warnings
// for ids that exist. The sweep in ./dom.js translates index.html on the first
// paint, forty-odd of those data-i18n attributes belong to panels whose strings
// were split into ./en.deferred.js, and that chunk is not fetched until a panel
// asks for it. Every one of them was reported missing, and the report was
// wrong.
//
// The catalog itself cannot answer "is this id real?" before it has loaded -
// that is what makes it deferred. What can be answered cheaply is which
// namespaces the deferred catalog covers, and that is enough: an id in one of
// them is held rather than reported, and re-checked once the catalog settles.
// If it is still missing then, it is missing, and the warning says so.
//
// Ten of these namespaces also appear in the eager catalog, which does not
// matter. An eager id resolves and never reaches the warning path at all; the
// list is only ever used to decide whether being absent right now is worth
// mentioning yet.
//
// Kept honest by tests/i18nDeferredNamespaces.test.js, which regenerates this
// list from the two deferred catalogs and fails if it has drifted.
// =============================================================================

/** Namespaces whose strings arrive with a lazily imported panel. */
export const DEFERRED_NAMESPACES = Object.freeze([
  'activity',
  'assign',
  'assist',
  'bench',
  'bhW',
  'binW',
  'binaryRun',
  'binarySweep',
  'burn',
  'chaosW',
  'cr3bp',
  'dmW',
  'energyW',
  'exoW',
  'export',
  'gwW',
  'hzW',
  'inv',
  'lessonFn',
  'nb',
  'obsW',
  'reliability',
  'resW',
  'rv',
  'rvfit',
  'rvsched',
  'sound',
  'specW',
  'stelE',
  'stelW',
  'stellar',
  'summary',
  'sweep',
  'tideP',
  'tideW',
  'transitW',
  'welcome',
  'welcomeAudience',
  'welcomeCard',
  'welcomeLink',
]);

const SET = new Set(DEFERRED_NAMESPACES);

/**
 * Could this id still be on its way?
 *
 * @param {string} id - A message id
 * @returns {boolean} Whether it belongs to a deferred namespace
 */
export const mayBeDeferred = id => SET.has(String(id).split('.')[0]);
