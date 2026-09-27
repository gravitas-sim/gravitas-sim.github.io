// =============================================================================
// A column described: how many values, their middle, their spread
// -----------------------------------------------------------------------------
// The first thing anyone asks of a column of numbers, and the one the other
// tools do not answer: how many there are, their median and mean, their
// standard deviation, and the smallest and largest. A cluster's members'
// velocity is their median; how far they scatter about it is their spread.
//
//   n        values used: finite, and in no mask (MEASURED)
//   median   the middle value, or the mean of the middle two (MEASURED)
//   mean     their mean (MEASURED)
//   sd       their standard deviation, with n - 1 (MEASURED)
//   min,     the smallest and largest (MEASURED)
//   max
//
// The standard error of the mean is sd / sqrt(n) only for independent values
// from one distribution, which a column of stars need not be; the result
// gives the spread and the count, and leaves that inference to the reader.
// =============================================================================

export const VERSION = '1.0.0';

export class DescribeError extends Error {
  constructor(code, message, detail = {}) {
    super(message);
    this.name = 'DescribeError';
    this.code = code;
    this.detail = detail;
  }
}

/**
 * @param {ArrayLike<number>} values - The column
 * @param {{skip?: Set<number>}} [o] - Rows to leave out: the masked ones
 * @returns {{n: number, median: number, mean: number, sd: number|null,
 *   min: number, max: number, missing: number, skipped: number}}
 */
export function describeColumn(values, { skip = new Set() } = {}) {
  const v = [];
  let missing = 0;
  let skipped = 0;
  for (let i = 0; i < values.length; i++) {
    if (skip.has(i)) skipped++;
    else if (Number.isFinite(values[i])) v.push(values[i]);
    else missing++;
  }
  if (!v.length)
    throw new DescribeError('empty', 'the column has no values to describe', {
      missing,
      skipped,
    });
  v.sort((a, b) => a - b);
  const n = v.length;
  const k = n >> 1;
  const median = n % 2 ? v[k] : (v[k - 1] + v[k]) / 2;
  let sum = 0;
  for (const x of v) sum += x;
  const mean = sum / n;
  let ss = 0;
  for (const x of v) ss += (x - mean) ** 2;
  return {
    n,
    median,
    mean,
    sd: n > 1 ? Math.sqrt(ss / (n - 1)) : null,
    min: v[0],
    max: v[n - 1],
    missing,
    skipped,
  };
}
