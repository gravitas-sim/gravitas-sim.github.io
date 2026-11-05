// =============================================================================
// Outburst detection by a stated rule (Prompt 243)
// -----------------------------------------------------------------------------
// The rule, in full:
//
//   q       the lower quartile of the rates over the live bins (counts / exposure; the 25th
//           percentile by linear interpolation of the sorted rates: AM1 of the thresholds);
//   a bin   is ELEVATED when the lower end of its exact Poisson interval at level
//           0.9973 exceeds `factor` times q (factor 3);
//   a run   is `minBins` (3) or more consecutive live bins that are elevated, the gap
//           between neighbours at most `maxGap` (default: the median bin width);
//   refusal if more than half of the live bins are elevated, there is no quiet level to
//           measure an outburst against, and the search is REFUSED ('noQuietLevel'):
//           a source that is bright most of the time does not "outburst" by this rule.
//
// Nothing here says what an outburst IS physically; it finds the stretches where the
// rate is well above the series' own typical rate, with the Poisson noise accounted for.
// =============================================================================

import { poissonInterval } from '../statistics/intervals.js';
import { refused } from '../statistics/check.js';
import { bandCounts, stamp, validateSeries } from './contract.js';

const { Math, Number } = globalThis;

function median(a) {
  const s = [...a].sort((x, y) => x - y);
  return s.length % 2
    ? s[(s.length - 1) / 2]
    : 0.5 * (s[s.length / 2 - 1] + s[s.length / 2]);
}

/** The lower quartile: the 25th percentile by linear interpolation. */
function lowerQuartile(a) {
  const s = [...a].sort((x, y) => x - y);
  const x = 0.25 * (s.length - 1);
  const i = Math.floor(x);
  return s[i] + (x - i) * (s[Math.min(s.length - 1, i + 1)] - s[i]);
}

/**
 * @param {object} series - A counts series
 * @param {{band?: string|string[], factor?: number, level?: number, minBins?: number, maxGap?: number}} [opts]
 */
export function detectOutbursts(
  series,
  { band = 'total', factor = 3, level = 0.9973, minBins = 3, maxGap } = {}
) {
  const view = series?.status === 'ok' ? series : validateSeries(series);
  if (view.status !== 'ok') return view;
  const bc = bandCounts(view, band);
  if (bc.status !== 'ok') return bc;
  if (!(factor > 1) || !Number.isInteger(minBins) || minBins < 1)
    return refused(
      'bins',
      'factor must exceed 1 and minBins be a whole number of at least 1'
    );
  const live = [];
  for (let i = 0; i < view.n; i++) if (view.live[i]) live.push(i);
  if (live.length < 5)
    return refused(
      'tooFew',
      `${live.length} live bins; the rule needs at least 5`
    );
  const rates = live.map(i => bc.src[i] / view.exposure[i]);
  const q = lowerQuartile(rates);
  const gapMax = maxGap ?? median(live.map(i => view.width[i]));

  const lo = new Array(live.length);
  const hi = new Array(live.length);
  const elevated = new Array(live.length);
  let nElev = 0;
  for (let k = 0; k < live.length; k++) {
    const i = live[k];
    const iv = poissonInterval([bc.src[i]], {
      exposure: view.exposure[i],
      level,
      method: 'garwood',
    });
    lo[k] = iv.lo;
    hi[k] = iv.hi;
    elevated[k] = iv.lo > factor * q;
    if (elevated[k]) nElev++;
  }
  if (nElev > 0.5 * live.length)
    return refused(
      'noQuietLevel',
      `${nElev} of ${live.length} live bins are elevated: there is no quiet level to measure an outburst against`
    );

  const runs = [];
  let start = -1;
  const flush = end => {
    if (start >= 0 && end - start + 1 >= minBins) {
      let peak = start;
      for (let k = start; k <= end; k++) if (rates[k] > rates[peak]) peak = k;
      runs.push({
        firstBin: live[start],
        lastBin: live[end],
        bins: end - start + 1,
        tStart: view.start[live[start]],
        tStop: view.stop[live[end]],
        peakBin: live[peak],
        peakRate: rates[peak],
        peakLo: lo[peak],
        peakHi: hi[peak],
      });
    }
    start = -1;
  };
  for (let k = 0; k < live.length; k++) {
    if (!elevated[k]) {
      flush(k - 1);
      continue;
    }
    if (start >= 0 && view.start[live[k]] - view.stop[live[k - 1]] > gapMax)
      flush(k - 1);
    if (start < 0) start = k;
  }
  flush(live.length - 1);

  return stamp(
    {
      status: 'ok',
      rule: 'lower-quartile quiet level; elevated when the exact Poisson lower bound exceeds factor times it; a run is minBins or more consecutive elevated bins',
      band: bc.ids,
      quietRate: q,
      factor,
      level,
      minBins,
      maxGap: gapMax,
      elevatedBins: nElev,
      liveBins: live.length,
      runs,
    },
    view
  );
}
