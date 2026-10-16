// =============================================================================
// js/plot/: a logarithmic y axis
// -----------------------------------------------------------------------------
// For ./plot.js: draw(o, { yScale: log10 }). The axis holds positive values
// only, so a chart that may hold others asks wantsLog() first.
// =============================================================================

/**
 * Whether a chart's values call for a log axis: more than one, all positive,
 * across more than two orders of magnitude. On a linear axis hundreds of AU
 * beside one leave every small value on the floor.
 * @param {ArrayLike<number>} ys - Values; ones that are not finite are left out
 */
export function wantsLog(ys) {
  const v = Array.from(ys).filter(Number.isFinite);
  const lo = Math.min(...v);
  return v.length > 1 && lo > 0 && Math.max(...v) / lo > 100;
}

/**
 * Base ten. The ticks are its powers, or with fewer than two of them in range
 * 1, 2 and 5 times them; at most six either way.
 */
export const log10 = {
  f: Math.log10,
  ticks(lo, hi) {
    for (const ms of [[1], [1, 2, 5]]) {
      const out = [];
      for (let k = Math.floor(lo); k <= Math.ceil(hi); k++) {
        for (const m of ms) {
          // Parsed, not raised: `10 ** k` is not correctly rounded everywhere.
          const v = Number(`${m}e${k}`);
          const at = Math.log10(v);
          if (at >= lo - 1e-9 && at <= hi + 1e-9) out.push(v);
        }
      }
      const step = Math.ceil(out.length / 6);
      if (out.length > 1) return out.filter((_, i) => i % step === 0);
    }
    return [Number(`1e${Math.round(lo)}`)];
  },
};
