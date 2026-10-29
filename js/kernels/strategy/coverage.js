// =============================================================================
// Phase coverage (Prompt 214, OBSERVING_STRATEGY.md)
// -----------------------------------------------------------------------------
// The phases frac((t - t0) / P) of a set of epochs, the largest circular gap between
// them and the share of `bins` phase bins that hold a point. Epochs D apart with
// D / P = p / q in lowest terms visit exactly q phases, equally spaced: the cadence
// that is "regular" in time is the cadence that stares at a few phases.
// The page-level phaseCoverageDetail of js/rvSchedule.js is unchanged; this is the
// kernel's, over typed arrays, with the count of distinct phases and a scan over periods.
// =============================================================================

const { Math, Float64Array } = globalThis;

/** The phases of `times` for `period`, in [0, 1). */
export function phasesOf(times, period, t0 = 0) {
  return Float64Array.from(times, t => {
    const x = (t - t0) / period;
    return x - Math.floor(x);
  });
}

/**
 * @returns {{bins: number, covered: number, fraction: number, largestGap: number,
 *   gapStart: number, distinct: number, n: number}|null}
 */
export function phaseCoverage(
  times,
  period,
  { bins = 20, t0 = 0, tolerance = 1e-9 } = {}
) {
  if (!(period > 0) || !times.length) return null;
  const ph = phasesOf(times, period, t0).sort();
  const filled = new Uint8Array(bins);
  for (const p of ph) filled[Math.min(bins - 1, Math.floor(p * bins))] = 1;
  let covered = 0;
  for (const f of filled) covered += f;
  let largestGap = ph[0] + 1 - ph[ph.length - 1];
  let gapStart = ph[ph.length - 1];
  let distinct = 1;
  for (let i = 1; i < ph.length; i++) {
    const g = ph[i] - ph[i - 1];
    if (g > largestGap) {
      largestGap = g;
      gapStart = ph[i - 1];
    }
    if (g > tolerance) distinct++;
  }
  // The wrap-around neighbours are one phase when they differ by less than the tolerance.
  if (distinct > 1 && ph[0] + 1 - ph[ph.length - 1] <= tolerance) distinct--;
  return {
    bins,
    covered,
    fraction: covered / bins,
    largestGap,
    gapStart,
    distinct,
    n: times.length,
  };
}

/** Largest gap and filled fraction at each of a list of periods. */
export function coverageScan(times, periods, bins = 20) {
  const gap = new Float64Array(periods.length);
  const fraction = new Float64Array(periods.length);
  periods.forEach((P, i) => {
    const c = phaseCoverage(times, P, { bins });
    gap[i] = c ? c.largestGap : 1;
    fraction[i] = c ? c.fraction : 0;
  });
  return { periods: Float64Array.from(periods), gap, fraction };
}
