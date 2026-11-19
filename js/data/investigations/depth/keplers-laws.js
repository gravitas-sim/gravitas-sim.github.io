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

import { fixed } from '../../../format.js';

const TRAPPIST_1 = {
  star: { name: 'TRAPPIST-1' },
  e: { name: 'TRAPPIST-1e' },
  f: { name: 'TRAPPIST-1f' },
  g: { name: 'TRAPPIST-1g' },
};

const SOLAR = {
  sun: { name: 'Sun' },
  mercury: { name: 'Mercury' },
  venus: { name: 'Venus' },
  earth: { name: 'Earth' },
  mars: { name: 'Mars' },
  jupiter: { name: 'Jupiter' },
  saturn: { name: 'Saturn' },
  uranus: { name: 'Uranus' },
  neptune: { name: 'Neptune' },
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
  const f = earlier('time-it-until-sure', 'frac');
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

/** The readings the student chose to take, up to six. */
const readings = v =>
  [1, 2, 3, 4, 5, 6].map(i => v[`t${i}`]).filter(Number.isFinite);
const mean3 = v => {
  const r = readings(v);
  return r.length < 3 ? NaN : r.reduce((a, b) => a + b, 0) / r.length;
};
const sem3 = v => {
  const r = readings(v);
  if (r.length < 3) return NaN;
  const m = mean3(v);
  const s = Math.sqrt(r.reduce((a, x) => a + (x - m) ** 2, 0) / (r.length - 1));
  return Math.max(s, READOUT) / Math.sqrt(r.length);
};

export default {
  id: 'keplers-laws',
  steps: [
    {
      sid: 'time-it-until-sure',
      decides: 'how many readings to take, and when the uncertainty is small enough to stop',
      after: 'check-the-estimate',
      depth: 'quantitative',
      bind: SOLAR,
      type: 'measure',
      title: 'How sure is a period?',
      body: `Every number you have recorded so far is one reading, and a
 reading is not the same as the truth. Here the period of an orbit
 is read from the planet's motion at that moment, and the planets
 tug on one another, so reading it at different moments gives
 slightly different answers.
 \n\nSelect a planet and press the button, seconds apart. Take at least
 three readings and at most six. You decide when to stop: the uncertainty of
 the <em>mean</em> is the standard deviation divided by the square root of how
 many readings you took, and it cannot be smaller than the readout itself
 can resolve, because a number shown to four decimals is good to half a
 unit in the last one. Watch it respond as you add readings, and stop when
 another reading would not change it much.
 \n\nThe fraction at the bottom is how uncertain <em>any one</em>
 of your periods is, as a share of itself. The next step uses it.`,
      importLabel: 'Take a reading',
      importFromSelection: ctx => {
        const b = ctx.selected;
        const el = b && ctx.elements(b);
        if (!el || !el.bound) return null;
        const P = ctx.years(el.period);
        return Number.isFinite(P) ? [fixed(P, 4)] : null;
      },
      importGroups: [['t1'], ['t2'], ['t3'], ['t4'], ['t5'], ['t6']],
      fields: [
        { id: 't1', label: 'Reading 1: P', unit: 'yr' },
        { id: 't2', label: 'Reading 2: P', unit: 'yr' },
        { id: 't3', label: 'Reading 3: P', unit: 'yr' },
        { id: 't4', label: 'Reading 4: P (optional)', unit: 'yr' },
        { id: 't5', label: 'Reading 5: P (optional)', unit: 'yr' },
        { id: 't6', label: 'Reading 6: P (optional)', unit: 'yr' },
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
        if (readings(v).length < 3) return null;
        if (readings(v).some(x => x <= 0)) {
          return { level: 'error', message: 'A period must be positive.' };
        }
        const f = sem3(v) / mean3(v);
        return {
          level: 'ok',
          message: `From ${readings(v).length} readings the mean is ${fixed(mean3(v), 4)} yr, uncertain by ${fixed(f * 100, 3)}% of itself. Quote it as ${fixed(mean3(v), 4)} ± ${fixed(sem3(v), 4)} yr.`,
        };
      },
    },
    {
      sid: 'weighted-fit',
      after: 'time-it-until-sure',
      depth: 'quantitative',
      bind: SOLAR,
      requires: ['measure-four-planets', 'time-it-until-sure'],
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
 predict the period of a planet at 4 AU, with its uncertainty carried
 through: P = √(k·a³), so
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
          label: 'Least-squares constant k (yr²/AU³)',
          unit: '',
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
          label: 'Weighted constant k (yr²/AU³)',
          unit: '',
          compute: (v, e) => weighted(e).k,
          decimals: 4,
        },
        {
          id: 's_k',
          label: 'Its uncertainty (yr²/AU³)',
          unit: '',
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
              message: `The weighted constant, ${fixed(v.k_w, 3)} ± ${fixed(v.s_k, 3)}, and the plain one, ${fixed(v.k_ols, 3)}, differ by ${fixed(apart, 1)} of its uncertainties: the same law, found two ways.`,
            }
          : {
              level: 'warn',
              message: `The two constants differ by ${fixed(apart, 1)} uncertainties. One row of your table is probably wrong: a period in days, or a distance from another planet.`,
            };
      },
    },
    {
      sid: 'predict-with-an-error-bar',
      after: 'weighted-fit',
      depth: 'quantitative',
      bind: SOLAR,
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
      placeholder: 'a value, then ± its uncertainty',
      answer: 8,
      tolerance: 0.4,
      expect: { dimension: 'time', unit: 'yr', accept: ['yr', 'years'] },
      hints: {
        concept: `The weighted fit gives a constant k and how well it is
 known. The law turns that into a period and an uncertainty
 on the period.`,
        method: `The weighted-fit step ends with a predicted period and its
 uncertainty for a planet at 4 AU. Write your answer as value ± uncertainty.`,
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
      placeholder: 'a value, then ± its uncertainty',
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
      sid: 'size-of-the-miss',
      decides: 'whether the planet’s mass can be left out of the law, from the size of the change it makes to the period',
      after: 'weigh-the-host-star',
      depth: 'advanced',
      bind: TRAPPIST_1,
      type: 'question',
      kind: 'numeric',
      title: 'How big is the miss?',
      body: `Newton's form of the third law has the total mass, <em>M</em> +
 <em>m</em>, where Kepler's version has the star's alone. For a planet the
 difference is tiny, so Kepler's version works, but it is not zero.
 \n\nTest it on TRAPPIST-1g: a planet of <strong>1.321</strong> Earth masses
 around a star of <strong>0.0898</strong> solar masses. An Earth mass is
 <strong>3.0035 × 10<sup>-6</sup></strong> solar masses. The period from
 Kepler's form, which leaves the planet out, comes out a little too long. By
 how much, as a fraction of the period, in parts per million?`,
      prompt: 'How much too long is the period from Kepler’s form?',
      unit: 'ppm',
      answer: 22,
      tolerance: 2,
      misconceptions: [
        {
          id: 'forgotTheHalf',
          factor: 2,
          say: 'That is the ratio of the planet’s mass to the star’s. The period depends on the square root of the total mass, so the miss is half of that ratio.',
        },
      ],
      hints: {
        concept: `The period goes as one over the square root of the total
 mass, so leaving the planet out changes the period by about half the
 planet-to-star mass ratio, when that ratio is small.`,
        method: `Convert the planet's mass to solar masses, divide by the
 star's mass, and take half. Then write it in parts per million.`,
      },
      because:
        'About 22 parts per million: the planet is a few times ten-millionths of a star this small, and the period goes as the square root of the total mass, so half of that ratio. It is far smaller than the readout can show, which is why Kepler’s form works for planets, and why the same correction is 41% for two equal stars.',
    },
    {
      sid: 'two-methods-one-period',
      after: 'size-of-the-miss',
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
