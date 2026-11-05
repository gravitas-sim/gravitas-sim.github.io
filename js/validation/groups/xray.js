// ===========================================================================
// 39. The X-ray counts kernel: Poisson rates, hardness, binning and the period search (Prompt 243)
// ===========================================================================

import * as K from '../../kernels/xray/index.js';
import { stream } from '../../random/streams.js';

/**
 * Run this group's checks (HIGH_ENERGY.md; the full table, with the independent oracle, the
 * ensembles and the legs that wait for authentic files, is `npm run xray:validate`).
 *
 * @param {object} ctx - `add` (physicsChecks.js)
 */
export default async function run({ add }) {
  const GROUP = 'X-ray counts';
  // The band unit is a label of the contract, never a quantity the registry formats.
  const BAND_UNIT = 'keV';
  const mini = (counts, T) => ({
    format: 'gravitas.counts-series/1',
    time: { system: 'TDB', barycentric: true },
    start: [0],
    stop: [T],
    exposure: [T],
    bands: [
      { id: 'S', lo: 1, hi: 3, unit: BAND_UNIT },
      { id: 'H', lo: 3, hi: 10, unit: BAND_UNIT },
    ],
    counts: { S: [counts], H: [0] },
    background: { kind: 'none', negligible: true },
    deadTime: { kind: 'in-exposure' },
    gti: [[0, T]],
  });

  add({
    group: GROUP,
    kind: 'analytic',
    name: 'No counts in 10 s of exposure at level 0.95: the exact Poisson interval is [0, ln(40) / 10] per second (not 0 +/- 0)',
    measured: K.rate(mini(0, 10), { level: 0.95 }).pooled.hi,
    expected: Math.log(40) / 10,
    unit: 'Hz',
    tolerance: 1e-10,
    toleranceKind: 'relative',
    why: 'The upper end of the exact interval at no counts is -ln(alpha) / T with alpha = 0.025, a closed form; sqrt(N) would give an interval of zero width.',
  });

  add({
    group: GROUP,
    kind: 'analytic',
    name: 'The hardness of 0 hard counts in 10 has the exact upper end 2 (1 - 0.025^(1/10)) - 1 = -0.3830057843624783 at level 0.95',
    measured: K.hardnessCounts({ hard: 0, soft: 10, level: 0.95 }).hi,
    expected: 2 * (1 - 0.025 ** 0.1) - 1,
    unit: '',
    tolerance: 1e-9,
    toleranceKind: 'absolute',
    why: 'With no hard counts the Clopper-Pearson upper end of the hard fraction is 1 - (alpha)^(1/N), alpha = 0.025, mapped by HR = 2 p - 1.',
  });

  add({
    group: GROUP,
    kind: 'analytic',
    name: 'Swapping the soft and hard bands negates the hardness ratio and mirrors its interval',
    measured: (() => {
      const a = K.hardnessCounts({ hard: 3, soft: 17, level: 0.95 });
      const b = K.hardnessCounts({ hard: 17, soft: 3, level: 0.95 });
      return Math.max(
        Math.abs(a.hr + b.hr),
        Math.abs(a.lo + b.hi),
        Math.abs(a.hi + b.lo)
      );
    })(),
    expected: 0,
    unit: '',
    tolerance: 1e-14,
    toleranceKind: 'absolute',
    why: 'HR = (H - S) / (H + S) and the binomial interval of p = H / N mirrors under H <-> S, so the difference is zero up to rounding.',
  });

  const gtis = [
    [0, 400],
    [1000, 1400],
  ];
  const { series } = (() => {
    const start = [];
    const stop = [];
    const exposure = [];
    const draw = stream('noise', 243, 'group');
    const S = [];
    const H = [];
    for (const [a, b] of gtis)
      for (let t = a; t < b; t += 20) {
        start.push(t);
        stop.push(t + 20);
        exposure.push(20);
        S.push(K.poissonDraw(draw, 3));
        H.push(K.poissonDraw(draw, 2));
      }
    return {
      series: {
        format: 'gravitas.counts-series/1',
        time: { system: 'TDB', barycentric: true },
        start,
        stop,
        exposure,
        bands: [
          { id: 'S', lo: 1, hi: 3, unit: BAND_UNIT },
          { id: 'H', lo: 3, hi: 10, unit: BAND_UNIT },
        ],
        counts: { S, H },
        background: { kind: 'none', negligible: true },
        deadTime: { kind: 'in-exposure' },
        gti: gtis,
      },
    };
  })();
  const binned = K.binByCounts(series, { minCounts: 40, maxGap: 5 });
  const total = s =>
    s.counts.S.reduce((a, b) => a + b, 0) +
    s.counts.H.reduce((a, b) => a + b, 0);
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'Binning by counts conserves the counts exactly and never joins bins across the 600 s gap between good-time intervals',
    measured:
      total(binned.series) -
      total(series) +
      binned.groups.filter(g =>
        g.members.some(
          (m, i) => i > 0 && series.start[m] - series.stop[g.members[i - 1]] > 5
        )
      ).length,
    expected: 0,
    unit: '',
    tolerance: 0,
    toleranceKind: 'absolute',
    why: 'A merged bin is the sum of its members; a group that crossed the gap would have a member whose start is more than maxGap after the previous stop.',
  });

  add({
    group: GROUP,
    kind: 'analytic',
    name: 'A series without good-time intervals is refused with code noGti, not rated',
    measured: K.rate({ ...series, gti: [] }).code === 'noGti' ? 1 : 0,
    expected: 1,
    unit: '',
    tolerance: 0,
    toleranceKind: 'absolute',
    why: 'Without good-time intervals the series cannot say when the detector was looking, so no rate, hardness or period is computed from it (X_RAY_COUNTS_GATE.md).',
  });

  const draw = stream('noise', 243, 'poisson-draw');
  let sum = 0;
  let sum2 = 0;
  const n = 20000;
  for (let i = 0; i < n; i++) {
    const v = K.poissonDraw(draw, 41.5);
    sum += v;
    sum2 += v * v;
  }
  add({
    group: GROUP,
    kind: 'statistical',
    name: 'The exact Poisson sampler has mean 41.5 and variance 41.5 over 20,000 draws, to four standard errors',
    measured: Math.max(
      Math.abs(sum / n - 41.5) / Math.sqrt(41.5 / n),
      Math.abs(sum2 / n - (sum / n) ** 2 - 41.5) / (41.5 * Math.sqrt(2 / n))
    ),
    expected: 0,
    unit: '',
    tolerance: 4,
    toleranceKind: 'absolute',
    why: 'The mean of a Poisson variable is its parameter with standard error sqrt(mu / n); the variance equals the mean with standard error about mu sqrt(2 / n).',
  });
}
