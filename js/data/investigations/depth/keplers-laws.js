// =============================================================================
// Kepler's Laws, deeper (Prompt 72)
// -----------------------------------------------------------------------------
// Laid into the lesson only when it is read at quantitative or advanced depth
// (js/investigations/depth.js, DEPTH.md). Same Solar System, same readouts and
// the same numbers the student already recorded: every field here is computed
// from them through `earlier`, so nothing is measured twice and no expected
// value is new.
//
//   quantitative  how sure a period is (repeated readings), a weighted fit of
//                 P² = k·a³ to the table already filled in, and a prediction
//                 given with its uncertainty
//   advanced      the same law weighing the star of a real exoplanet, and why
//                 two independent methods agreeing on a period matters
// =============================================================================

const SOLAR = {
  sun: { name: 'Sun' },
  mercury: { name: 'Mercury' },
  earth: { name: 'Earth' },
  jupiter: { name: 'Jupiter' },
  saturn: { name: 'Saturn' },
};

/** The readout shows four decimals of a year; half a unit is its resolution. */
const READOUT = 0.00005;
const ROWS = [1, 2, 3, 4, 5, 6, 7, 8];

/** The rows of the four-planet table that hold two positive numbers. */
const table = earlier =>
  ROWS.map(i => ({
    x: earlier('measure-four-planets', `p${i}_a`) ** 3,
    y: earlier('measure-four-planets', `p${i}_P`) ** 2,
  })).filter(r => r.x > 0 && r.y > 0);

/** How uncertain each period is, as a fraction, from the repeated readings. */
const fraction = earlier => {
  const f = earlier('repeat-the-timing', 'frac');
  return f > 0 ? f : 0.001;
};

/** The weighted constant and its uncertainty: P² = k·a³ through the origin. */
const weighted = earlier => {
  const rows = table(earlier);
  if (rows.length < 2) return { k: NaN, s: NaN, n: rows.length };
  // Each P carries the same fractional uncertainty, so P² carries 2f of itself
  // and a row is weighted by 1 / (2f·y)².
  const sw = rows.reduce((t, r) => t + (r.x / r.y) ** 2, 0);
  const k = rows.reduce((t, r) => t + r.x / r.y, 0) / sw;
  return { k, s: (2 * fraction(earlier)) / Math.sqrt(sw), n: rows.length };
};

const mean3 = v => (v.t1 + v.t2 + v.t3) / 3;
const sem3 = v => {
  const m = mean3(v);
  const s = Math.sqrt(
    ((v.t1 - m) ** 2 + (v.t2 - m) ** 2 + (v.t3 - m) ** 2) / 2
  );
  return Math.max(s / Math.sqrt(3), READOUT / Math.sqrt(3));
};

export default {
  id: 'keplers-laws',
  steps: [
    {
      sid: 'repeat-the-timing',
      after: 'use-the-law',
      depth: 'quantitative',
      bind: SOLAR,
      type: 'measure',
      title: 'How sure is a period?',
      body: `Every number you have recorded so far is one reading, and a
 reading is not the same as the truth. Here the period of an orbit
 is read from the planet's motion at that moment, and the planets
 tug on one another, so reading it at three different moments gives
 three slightly different answers.
 \n\nSelect a planet and press the button three times, seconds apart. The
 spread of the three is the scale of your uncertainty. The
 uncertainty of their <em>mean</em> is the standard deviation
 divided by √3, and it cannot be smaller than the readout itself
 can resolve: a number shown to four decimals is good to half a
 unit in the last one.
 \n\nThe fraction at the bottom is how uncertain <em>any one</em>
 of your periods is, as a share of itself. The next step uses it.`,
      importLabel: 'Take a reading',
      importFromSelection: ctx => {
        const b = ctx.selected;
        const el = b && ctx.elements(b);
        if (!el || !el.bound) return null;
        const P = ctx.years(el.period);
        return Number.isFinite(P) ? [P.toFixed(4)] : null;
      },
      importGroups: [['t1'], ['t2'], ['t3']],
      fields: [
        { id: 't1', label: 'Reading 1: P', unit: 'yr' },
        { id: 't2', label: 'Reading 2: P', unit: 'yr' },
        { id: 't3', label: 'Reading 3: P', unit: 'yr' },
        {
          id: 'mean',
          label: 'Mean period',
          unit: 'yr',
          compute: mean3,
          decimals: 5,
        },
        {
          id: 'sem',
          label: 'Uncertainty of the mean',
          unit: 'yr',
          compute: sem3,
          decimals: 5,
        },
        {
          id: 'frac',
          label: 'Uncertainty as a fraction of the period',
          unit: '',
          compute: v => sem3(v) / mean3(v),
          decimals: 6,
        },
      ],
      validate: v => {
        if (![v.t1, v.t2, v.t3].every(Number.isFinite)) return null;
        if ([v.t1, v.t2, v.t3].some(x => x <= 0)) {
          return { level: 'error', message: 'A period must be positive.' };
        }
        const f = sem3(v) / mean3(v);
        return {
          level: 'ok',
          message: `The mean is ${mean3(v).toFixed(4)} yr, uncertain by ${(f * 100).toFixed(3)}% of itself. Quote it as ${mean3(v).toFixed(4)} ± ${sem3(v).toFixed(4)} yr.`,
        };
      },
    },
    {
      sid: 'weighted-fit',
      after: 'repeat-the-timing',
      depth: 'quantitative',
      bind: SOLAR,
      requires: ['measure-four-planets', 'repeat-the-timing'],
      type: 'measure',
      title: 'Fit the law with weights',
      body: `Nothing new to measure: this step works on the table you filled
 in and the uncertainty you just found.
 \n\nStraightening the data as before, P² against a³ should be a
 line through the origin with slope k. Two ways to find it. The
 plain least-squares slope treats every planet alike. But a period
 uncertain by the same <em>fraction</em> makes P² uncertain by twice
 that fraction <em>of itself</em>, so the outer planets, with large
 P², are known less well in absolute terms, and a weighted fit
 counts each row by one over the square of its uncertainty.
 \n\nThe two should agree within the uncertainty. If they do not, a
 row is wrong. The last two boxes use the weighted constant to
 predict the period of the planet at 4 AU from the earlier step,
 with its uncertainty carried through: P = √(k·a³), so
 σ<sub>P</sub> = a<sup>3/2</sup>·σ<sub>k</sub> / (2√k).`,
      fields: [
        {
          id: 'n',
          label: 'Planets used from your table',
          unit: '',
          compute: (v, e) => table(e).length,
          decimals: 0,
        },
        {
          id: 'k_ols',
          label: 'Least-squares constant k',
          unit: 'yr²/AU³',
          compute: (v, e) => {
            const rows = table(e);
            return rows.length < 2
              ? NaN
              : rows.reduce((t, r) => t + r.x * r.y, 0) /
                  rows.reduce((t, r) => t + r.x * r.x, 0);
          },
          decimals: 4,
        },
        {
          id: 'k_w',
          label: 'Weighted constant k',
          unit: 'yr²/AU³',
          compute: (v, e) => weighted(e).k,
          decimals: 4,
        },
        {
          id: 's_k',
          label: 'Its uncertainty',
          unit: 'yr²/AU³',
          compute: (v, e) => weighted(e).s,
          decimals: 4,
        },
        {
          id: 'p4',
          label: 'Predicted period at 4 AU',
          unit: 'yr',
          compute: (v, e) => Math.sqrt(weighted(e).k * 64),
          decimals: 3,
        },
        {
          id: 's_p4',
          label: 'Its uncertainty',
          unit: 'yr',
          compute: (v, e) => (4 * weighted(e).s) / Math.sqrt(weighted(e).k),
          decimals: 3,
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.k_w) || !Number.isFinite(v.k_ols)) return null;
        const apart = Math.abs(v.k_w - v.k_ols) / v.s_k;
        return apart <= 2
          ? {
              level: 'ok',
              message: `The weighted constant, ${v.k_w.toFixed(3)} ± ${v.s_k.toFixed(3)}, and the plain one, ${v.k_ols.toFixed(3)}, differ by ${apart.toFixed(1)} of its uncertainties: the same law, found two ways.`,
            }
          : {
              level: 'warn',
              message: `The two constants differ by ${apart.toFixed(1)} uncertainties. One row of your table is probably wrong: a period in days, or a distance from another planet.`,
            };
      },
    },
    {
      sid: 'predict-with-an-error-bar',
      after: 'weighted-fit',
      depth: 'quantitative',
      bind: SOLAR,
      restates: 'use-the-law',
      type: 'question',
      kind: 'numeric',
      uncertainty: true,
      title: 'Predict, with an error bar',
      body: `A prediction without an uncertainty cannot be tested: any
 measurement would be "close". Report the period of the planet at
 4 AU the way a result is reported: the value, then ±, then its
 uncertainty, from the last two boxes of the previous step.
 \n\nIt counts as right when the range you give overlaps the range
 the law allows, and is no wider than twice that range's half-width,
 because an uncertainty large enough to overlap anything has not
 told anyone anything.`,
      prompt: 'Period at a = 4 AU, with its uncertainty',
      unit: 'years',
      placeholder: 'e.g. 8.0 ± 0.1',
      answer: 8,
      tolerance: 0.4,
      expect: { dimension: 'time', unit: 'yr', accept: ['yr', 'years'] },
      hints: {
        concept: `The weighted fit gives a constant k and how well it is
 known. The law turns that into a period and an uncertainty
 on the period.`,
        method: `Copy the predicted period and its uncertainty from the
 weighted-fit step, and write them as value ± uncertainty.`,
      },
      because:
        'The law, fitted with weights, gives about 8 years with an uncertainty of a few hundredths of a year, which overlaps the 8 years the unweighted law gives.',
    },
    {
      sid: 'weigh-the-host-star',
      after: 'predict-with-an-error-bar',
      depth: 'advanced',
      bind: SOLAR,
      type: 'question',
      kind: 'numeric',
      uncertainty: true,
      title: 'Weigh a real planet’s star',
      body: `The canvas still shows the Solar System; this step uses numbers
 only. They are the ones the transit and radial-velocity
 investigations use for HD 209458 b: an orbital period of
 <strong>3.5247 ± 0.0001 days</strong> and an orbit of
 <strong>0.0475 ± 0.0005 AU</strong>.
 \n\nNewton's form of the third law gives the star's mass in solar
 masses from a in AU and P in years: M = a³ / P². Convert the
 period first. The uncertainty of a product of powers adds the
 fractional uncertainties in quadrature, each multiplied by its
 power: σ<sub>M</sub>/M = √((3σ<sub>a</sub>/a)² +
 (2σ<sub>P</sub>/P)²).`,
      prompt: 'Mass of HD 209458, with its uncertainty',
      unit: 'M☉',
      placeholder: 'e.g. 1.15 ± 0.04',
      answer: 1.15,
      tolerance: 0.06,
      hints: {
        concept: `Kepler's third law in years, AU and solar masses: the mass
 is a cubed divided by P squared.`,
        method: `P = 3.5247 / 365.25 years. Work out M, then the two
 fractional uncertainties, combine them, and multiply by M.`,
      },
      because:
        'About 1.15 solar masses, uncertain by about 0.04. Almost all of that comes from the orbit size, because a is cubed: a 1% uncertainty in a is a 3% uncertainty in the mass, while the period, known to a few parts in a hundred thousand, hardly contributes.',
    },
    {
      sid: 'two-methods-one-period',
      after: 'weigh-the-host-star',
      depth: 'advanced',
      bind: SOLAR,
      type: 'question',
      kind: 'choice',
      title: 'Two methods, one period',
      body: `That 3.52-day period can be found two independent ways: from the
 star's wobble towards and away from us (the radial-velocity
 analysis built into Gravitas, under Tools) and from the dip each
 time the planet crosses the star (the transit investigation, and
 real light curves such as TESS's). Where the two disagree, one of
 them is wrong.`,
      prompt: 'What does agreement between two independent methods give you?',
      options: [
        'A smaller uncertainty on the period, and nothing else',
        'Protection against a signal that comes from the instrument or the star rather than from a planet',
        'Proof that the planet’s mass is exactly the published value',
        'Nothing: either method alone would have been enough',
      ],
      answer: 1,
      because:
        'Each method has its own ways of being fooled: starspots and instrument drift imitate a wobble, a background eclipsing star imitates a dip. A period that appears in both, with the same value within its uncertainty, is very unlikely to be a fault common to both. It does not by itself fix the mass.',
    },
  ],
};
