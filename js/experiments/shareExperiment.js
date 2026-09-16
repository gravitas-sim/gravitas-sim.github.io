// =============================================================================
// Handing an experiment to somebody else as a link
// -----------------------------------------------------------------------------
// What travels in the URL is the *setup*, never the results: the initial state
// both runs started from, which objects and quantities were measured, and the
// one parameter that differed between A and B. That is enough for the person
// who opens it to run the experiment themselves, which is the only version of
// "sharing an experiment" worth having in a teaching tool. Recorded samples
// would multiply the link's length by a hundred and would let a student hand
// in someone else's measurements.
//
// It rides in the existing payload as `xp`, beside the `x` block that carries
// the clock and the frame. Three consequences worth stating:
//
//   Old links keep working. A payload without `xp` is a plain simulation link
//   and opens exactly as it always did.
//
//   Old builds keep working. A build that predates this feature parses the
//   payload as JSON and reads the keys it knows; `xp` is ignored rather than
//   fatal.
//
//   The size guard still applies. The bench's block is tens of characters
//   against a budget of eight thousand, but it is measured and refused rather
//   than assumed to fit - see experimentBlock(), which drops the parameter
//   list rather than produce a link a mail client will wrap.
// =============================================================================

import { COMFORTABLE_URL_LENGTH } from '../shareState.js';

/** Version of the `xp` block. */
export const EXPERIMENT_LINK_VERSION = 1;

/**
 * Build the `xp` block for a link.
 *
 * @param {Object} experiment - The experiment record
 * @returns {Object|null} The block, or null when there is nothing to say
 */
export function experimentBlock(experiment) {
  if (!experiment) return null;
  const metrics = experiment.metrics || [];
  const objects = experiment.objects || [];
  const variables = experiment.diff?.variables || [];
  if (!metrics.length && !variables.length) return null;

  const block = { v: EXPERIMENT_LINK_VERSION };
  if (experiment.name) block.n = String(experiment.name).slice(0, 80);
  if (metrics.length) block.m = metrics;
  if (objects.length) block.o = objects.map(Number).filter(Number.isFinite);
  if (experiment.primary !== null && experiment.primary !== undefined) {
    block.pr = Number(experiment.primary);
  }
  if (variables.length) {
    // Just the change, as key/from/to. The rest of the settings are already in
    // the payload's own `d` and `a` blocks; repeating them here would be two
    // sources of truth for one number.
    block.dv = variables.map(v => [v.key, v.from, v.to]);
  }
  if (experiment.multivariableConfirmed) block.mv = 1;
  return block;
}

/**
 * Read an `xp` block back.
 * @param {Object} payload - A decoded share payload
 * @returns {{present:boolean, version:number, name:string,
 *   metrics:Array<string>, objects:Array<number>, primary:number|null,
 *   variables:Array<{key:string, from:*, to:*}>, multivariable:boolean}} The setup
 */
export function readExperimentBlock(payload) {
  const xp = payload?.xp;
  if (!xp || typeof xp !== 'object') {
    return {
      present: false,
      version: 0,
      name: '',
      metrics: [],
      objects: [],
      primary: null,
      variables: [],
      multivariable: false,
    };
  }
  return {
    present: true,
    version: Number(xp.v) || 0,
    name: typeof xp.n === 'string' ? xp.n : '',
    metrics: Array.isArray(xp.m) ? xp.m.filter(m => typeof m === 'string') : [],
    objects: Array.isArray(xp.o)
      ? xp.o.map(Number).filter(Number.isFinite)
      : [],
    primary: Number.isFinite(xp.pr) ? Number(xp.pr) : null,
    variables: Array.isArray(xp.dv)
      ? xp.dv
          .filter(row => Array.isArray(row) && typeof row[0] === 'string')
          .map(([key, from, to]) => ({
            key,
            from: from ?? null,
            to: to ?? null,
          }))
      : [],
    multivariable: xp.mv === 1,
  };
}

/**
 * Whether a fragment is short enough to hand out.
 *
 * The threshold is the share dialog's own, imported rather than restated: two
 * numbers that must agree are one number.
 *
 * @param {string} fragment - Encoded fragment
 * @param {string} [base] - Base URL, for a realistic total
 * @returns {{ok:boolean, length:number, limit:number}} Whether it fits
 */
export function fragmentFits(fragment, base = '') {
  const length = base.length + 1 + (fragment?.length || 0);
  return {
    ok: length <= COMFORTABLE_URL_LENGTH,
    length,
    limit: COMFORTABLE_URL_LENGTH,
  };
}

/**
 * Drop the least useful parts of an experiment block until the link fits.
 *
 * Order of sacrifice, least to most useful: the name, then the incidental
 * object list, then the parameter change. The metrics go last because an
 * experiment link without them describes no experiment at all - at which point
 * the caller is better served by an ordinary simulation link, and is told so.
 *
 * @param {Object} block - From experimentBlock
 * @param {number} over - Characters to save
 * @returns {{block:Object|null, dropped:Array<string>}} The trimmed block
 */
export function trimBlock(block, over) {
  if (!block || over <= 0) return { block, dropped: [] };
  const out = { ...block };
  const dropped = [];
  const size = () => JSON.stringify(out).length;
  const target = size() - over;

  for (const [key, label] of [
    ['n', 'name'],
    ['o', 'objects'],
    ['dv', 'parameter change'],
  ]) {
    if (size() <= target) break;
    if (out[key] !== undefined) {
      delete out[key];
      dropped.push(label);
    }
  }
  if (size() > target && out.m) {
    delete out.m;
    dropped.push('measurements');
  }
  const meaningful = out.m || out.dv;
  return { block: meaningful ? out : null, dropped };
}
