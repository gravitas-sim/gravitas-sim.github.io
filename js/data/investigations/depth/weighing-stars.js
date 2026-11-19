// =============================================================================
// Weighing the Stars, deeper (Prompt 72)
// -----------------------------------------------------------------------------
// The same pair and the same two measurements (`weigh-the-pair`): the orbit
// size and the period the student already recorded, now with the uncertainty of
// each carried into the mass, and the split of that mass into two.
// =============================================================================

import { fixed } from '../../../format.js';

const mass = (a, p) => a ** 3 / p ** 2;
/** The timings a student took, in order, those that are numbers. */
const timings = v => [v.t1, v.t2, v.t3, v.t4].filter(Number.isFinite);
/** Standard error of the mean of the timings (0 when there are fewer than two). */
const scatter = ts => {
  if (ts.length < 2) return 0;
  const mean = ts.reduce((s, x) => s + x, 0) / ts.length;
  const ss = ts.reduce((s, x) => s + (x - mean) ** 2, 0);
  return Math.sqrt(ss / (ts.length - 1) / ts.length);
};
const fraction = (a, sa, p, sp) =>
  Math.sqrt(((3 * sa) / a) ** 2 + ((2 * sp) / p) ** 2);

export default {
  id: 'weighing-stars',
  steps: [
    {
      sid: 'how-sure-is-the-total',
      after: 'weigh-the-pair',
      depth: 'quantitative',
      decides:
        'How many timings to take, and how wide an error bar to draw for the period and the orbit size from them.',
      type: 'measure',
      requires: ['weigh-the-pair'],
      title: 'How sure is the total?',
      body: `Your period came from a stopwatch started and stopped by a person,
 so it is a reading, not an exact value. Time a lap again, as many
 times as you choose (at least two), and take each timing. The scatter
 of your own timings is what sets the error bar of the period.
 \n\nThe orbit size is read from the panel, so its uncertainty is how
 finely the panel prints it. Say how far off each could be.
 \n\nThen the page moves one reading at a time, on the readings you
 already took, and recomputes the mass: <em>a</em> by its error bar,
 then <em>P</em> by its. This is worked on your numbers, not by running
 the scene again. The mass is <em>a</em>³ / <em>P</em>², so a
 fractional error in <em>a</em> counts three times and one in
 <em>P</em> twice; independent errors add in quadrature.`,
      tool: {
        id: 'binary',
        mystery: true,
        grid: false,
        barycenter: true,
        timer: true,
        hide: ['m1', 'm2'],
        presets: false,
        rows: ['timer'],
        title: 'Time a lap again',
        note: 'Press Mark, wait for Star A to come back to the dotted line, then press Stop.',
      },
      fields: [
        {
          id: 't1',
          label: 'Timing 1, one lap',
          unit: 'years',
          source: { tool: 'timer' },
        },
        {
          id: 't2',
          label: 'Timing 2, one lap',
          unit: 'years',
          source: { tool: 'timer' },
        },
        {
          id: 't3',
          label: 'Timing 3, one lap',
          unit: 'years',
          source: { tool: 'timer' },
        },
        {
          id: 't4',
          label: 'Timing 4, one lap',
          unit: 'years',
          source: { tool: 'timer' },
        },
        {
          id: 'n',
          label: 'Timings taken',
          compute: v => timings(v).length,
          decimals: 0,
        },
        {
          id: 'se',
          label: 'Scatter of the mean of your timings',
          unit: 'years',
          compute: v => scatter(timings(v)),
          decimals: 3,
        },
        {
          id: 'sp',
          label: 'How far off P could be',
          unit: 'years',
          hint: 'set by your own timings',
          want: '0.1',
        },
        {
          id: 'sa',
          label: 'How far off a could be',
          unit: 'AU',
          hint: 'set by how finely the panel prints it',
          want: '0.01',
        },
        {
          id: 'move_a',
          label: 'The mass moves by this if only a is off by its error bar',
          unit: 'M☉',
          compute: (v, e) => {
            const a = e('weigh-the-pair', 'a');
            const p = e('weigh-the-pair', 'p');
            return Math.abs(mass(a + v.sa, p) - mass(a, p));
          },
          decimals: 3,
        },
        {
          id: 'move_p',
          label: 'The mass moves by this if only P is off by its error bar',
          unit: 'M☉',
          compute: (v, e) => {
            const a = e('weigh-the-pair', 'a');
            const p = e('weigh-the-pair', 'p');
            return Math.abs(mass(a, p + v.sp) - mass(a, p));
          },
          decimals: 3,
        },
        {
          id: 'm_tot',
          label: 'Total mass',
          unit: 'M☉',
          compute: (v, e) =>
            mass(e('weigh-the-pair', 'a'), e('weigh-the-pair', 'p')),
          decimals: 2,
        },
        {
          id: 's_tot',
          label: 'Its uncertainty',
          unit: 'M☉',
          compute: (v, e) => {
            const a = e('weigh-the-pair', 'a');
            const p = e('weigh-the-pair', 'p');
            return mass(a, p) * fraction(a, v.sa, p, v.sp);
          },
          decimals: 2,
        },
      ],
      validate: v => {
        if (!(v.sa > 0) || !(v.sp > 0) || !Number.isFinite(v.s_tot))
          return null;
        if (v.n < 2) {
          return {
            level: 'warn',
            message:
              'Take at least two timings: one timing cannot show you its own scatter.',
          };
        }
        if (v.sp < v.se) {
          return {
            level: 'warn',
            message:
              'Your error bar for the period is smaller than the scatter of your own timings. A bar narrower than your scatter claims more than you measured: widen it, or take more timings.',
          };
        }
        return {
          level: 'ok',
          message: `The pair weighs ${fixed(v.m_tot, 2)} ± ${fixed(v.s_tot, 2)} solar masses. Compare the two lines above: the reading that moves the mass more is the one that limits it. Quote both the mass and its uncertainty.`,
        };
      },
    },
    {
      sid: 'weigh-it-with-an-error-bar',
      after: 'how-sure-is-the-total',
      depth: 'quantitative',
      decides:
        'How to quote the mass with the uncertainty the previous step supports.',
      type: 'question',
      kind: 'numeric',
      uncertainty: true,
      title: 'Give the mass with an error bar',
      body: `Write the total mass of the pair the way it is reported: the
 value, ±, and its uncertainty from the step before. It counts when
 the range you give overlaps the range the measurement supports
 and is no wider than twice that range's half-width.`,
      prompt: 'Total mass of the pair, with its uncertainty',
      unit: 'M☉',
      placeholder: 'a value, then ± its uncertainty',
      answer: 4,
      tolerance: 0.5,
      agrees: [{ sid: 'weigh-the-pair', id: 'total', at: { a: 4, p: 4 } }],
      hints: {
        concept: `A mass is a value and how well it is known.`,
        method: `Copy the total and its uncertainty from the previous step.`,
      },
      because: 'Four solar masses, uncertain by about half of one.',
    },
    {
      sid: 'which-measurement-limits-you',
      after: 'weigh-it-with-an-error-bar',
      depth: 'advanced',
      decides:
        'Which reading to improve first, from how far each one moved the mass.',
      type: 'question',
      kind: 'choice',
      title: 'Which measurement limits you?',
      body: `In the step before, you moved one reading at a time by its
 error bar and saw how far each move shifted your mass. The mass goes
 as a³ / P².`,
      prompt: 'Which of your two readings moved your mass more?',
      options: [
        'the orbit size, because it is cubed',
        'the period, because it is squared and is the less well known of the two',
        'they moved it equally, because both are measured',
        'neither: the mass is exact if the law is exact',
      ],
      answer: 1,
      because:
        'The power matters, but so does how well each reading is known. The orbit size is printed to a hundredth of an AU, while a stopwatch is stopped by a hand, so the period carried most of the uncertainty; a more careful stopwatch measurement, such as timing several laps and dividing, improves the mass more than a finer ruler.',
    },
    {
      sid: 'weigh-one-star-with-an-error-bar',
      after: 'now-weigh-each-one',
      depth: 'advanced',
      decides:
        'How the uncertainty of the total and of the split combine into the uncertainty of one star.',
      type: 'question',
      kind: 'numeric',
      uncertainty: true,
      title: 'Weigh one star, with an error bar',
      body: `The total is 4.0 ± 0.5 solar masses. The balance point sits so
 that Star A, the heavier, carries 0.75 of the total, known to
 ±0.02. A share of a total is a product, so the fractional
 uncertainties add in quadrature: σ<sub>m</sub>/m =
 √((σ<sub>M</sub>/M)² + (σ<sub>f</sub>/f)²).`,
      prompt: 'Mass of Star A, with its uncertainty',
      unit: 'M☉',
      placeholder: 'a value, then ± its uncertainty',
      answer: 3,
      tolerance: 0.35,
      hints: {
        concept: `Star A's mass is its share of the total.`,
        method: `m = 0.75 × 4.0. The fractions are 0.5/4.0 and 0.02/0.75;
 combine them and multiply by m.`,
      },
      because:
        'Three solar masses, uncertain by about four tenths of one. The split of the mass is known better than the mass itself, because the ratio of the two distances is measured directly, while the total depends on a cubed.',
    },
  ],
};
