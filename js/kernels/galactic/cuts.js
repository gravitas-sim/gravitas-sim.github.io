// =============================================================================
// Galactic kernel: what a Gaia sample's cuts remove (Roadmap III Prompt 233)
// -----------------------------------------------------------------------------
// A catalogue sample is what passed its cuts. This names the four a Gaia table
// carries (a magnitude limit, a parallax-over-error cut, RUWE, and a radial
// velocity) as selection objects of the statistics kernel (154) and counts what
// each removes, alone and in order, so a student sees the cut and not only the
// sample. Not a model of Gaia's real selection function: only the cuts the
// rows carry.
//
// A row is {g, poe, ruwe, rv}: the G magnitude, the observed parallax over its
// error, the RUWE and the radial velocity. A cut whose observable a row lacks
// removes the row (a row with no finite value is never included, as in 154).
// =============================================================================

import { selection, all } from '../statistics/selection.js';

/** The cuts, in the order a student meets them. */
export const CUTS = Object.freeze({
  magnitude: { observable: 'g', label: 'magnitude limit', bound: 'max' },
  parallaxOverError: {
    observable: 'poe',
    label: 'parallax over error',
    bound: 'min',
  },
  ruwe: { observable: 'ruwe', label: 'RUWE', bound: 'max' },
  radialVelocity: {
    observable: 'rv',
    label: 'has a radial velocity',
    bound: null,
  },
});

/**
 * The selection objects for the cuts a caller switches on.
 * @param {{magnitude?: number, parallaxOverError?: number, ruwe?: number,
 *   radialVelocity?: boolean}} on - A limit per cut; absent or false is off
 * @returns {Array<{id: string, label: string, selection: object}>}
 */
export function cutSelections(on = {}) {
  const out = [];
  for (const [id, def] of Object.entries(CUTS)) {
    const v = on[id];
    if (v === undefined || v === false || v === null) continue;
    const cut =
      def.bound === 'max'
        ? { max: v }
        : def.bound === 'min'
          ? { min: v }
          : null;
    out.push({
      id,
      label: def.label,
      limit: def.bound ? v : true,
      selection: selection({
        name: def.label,
        observable: def.observable,
        cut,
      }),
    });
  }
  return out;
}

/**
 * Apply the cuts and say what each removes.
 * @param {object[]} rows
 * @param {ReturnType<typeof cutSelections>} cuts
 * @returns {{total: number, kept: number, included: Int32Array,
 *   alone: Array<{id, label, limit, removed: number}>,
 *   steps: Array<{id, label, limit, removed: number, remaining: number}>}}
 *   `alone`: what each cut removes from the whole sample; `steps`: what each
 *   removes from what the earlier cuts left, in order
 */
export function applyCuts(rows, cuts) {
  const total = rows.length;
  const alone = cuts.map(c => {
    let removed = 0;
    for (const row of rows) if (c.selection.inclusion(row) < 1) removed++;
    return { id: c.id, label: c.label, limit: c.limit, removed };
  });
  const steps = [];
  let remaining = rows.map((_, i) => i);
  for (const c of cuts) {
    const next = remaining.filter(i => c.selection.inclusion(rows[i]) >= 1);
    steps.push({
      id: c.id,
      label: c.label,
      limit: c.limit,
      removed: remaining.length - next.length,
      remaining: next.length,
    });
    remaining = next;
  }
  return {
    total,
    kept: remaining.length,
    included: Int32Array.from(remaining),
    alone,
    steps,
    selection: cuts.length ? all(...cuts.map(c => c.selection)) : null,
  };
}
