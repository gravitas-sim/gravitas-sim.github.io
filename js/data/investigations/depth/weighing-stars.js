// Weighing the Stars, deeper: the error bar from the student's own timings, and the split of the mass.

import { fixed } from '../../../format.js';

const mass = (a, p) => a ** 3 / p ** 2;
const timings = v => [v.t1, v.t2, v.t3].filter(Number.isFinite);
/** Sample standard deviation: the scatter of one timed lap (0 under two timings). */
const scatter = ts => {
  if (ts.length < 2) return 0;
  const mean = ts.reduce((s, x) => s + x, 0) / ts.length;
  return Math.sqrt(
    ts.reduce((s, x) => s + (x - mean) ** 2, 0) / (ts.length - 1)
  );
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
      decides: 'How many timings to take, and how wide an error bar to draw.',
      type: 'measure',
      requires: ['weigh-the-pair'],
      title: 'How sure is the total?',
      body: `Your period came from a stopwatch started and stopped by a
 person. Time a lap again as often as you choose (at least twice) and
 take each timing: the scatter of your own timings (their standard
 deviation) is the error bar of one timed lap. The orbit size is read from the panel, so its error bar
 is how finely the panel prints it. Say how far off each could be.
 \n\nThen the page moves one reading at a time on the readings you
 already took, <em>a</em> by its error bar and <em>P</em> by its, and
 recomputes the mass <em>a</em>³ / <em>P</em>²: a worked comparison,
 not a new run of the scene.`,
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
          id: 'n',
          label: 'Timings taken',
          compute: v => timings(v).length,
          decimals: 0,
        },
        {
          id: 'sd',
          label: 'Scatter of one timing',
          unit: 'years',
          compute: v => scatter(timings(v)),
          decimals: 3,
        },
        {
          id: 'sp',
          label: 'How far off P could be',
          unit: 'years',
          hint: 'from your own timings',
        },
        {
          id: 'sa',
          label: 'How far off a could be',
          unit: 'AU',
          hint: 'from the panel’s precision',
        },
        {
          id: 'move_a',
          label: 'Mass change from a alone',
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
          label: 'Mass change from P alone',
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
        if (v.sp < v.sd) {
          return {
            level: 'warn',
            message:
              'Your error bar for the period is smaller than the scatter of one of your own timings: it claims more than you measured. Widen it.',
          };
        }
        if (v.s_tot > 0.5 * v.m_tot) {
          return {
            level: 'warn',
            message:
              'That error bar is more than half the mass: it says almost nothing. Look again at the scatter of your timings and the precision of the panel.',
          };
        }
        return {
          level: 'ok',
          message: `The pair weighs ${fixed(v.m_tot, 2)} ± ${fixed(v.s_tot, 2)} solar masses. Quote both numbers.`,
        };
      },
    },
    {
      sid: 'weigh-it-with-an-error-bar',
      after: 'how-sure-is-the-total',
      depth: 'quantitative',
      decides: 'How to quote the mass with its uncertainty.',
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
      because:
        'About four solar masses, with the uncertainty your own timings gave.',
    },
    {
      sid: 'which-measurement-limits-you',
      after: 'weigh-it-with-an-error-bar',
      depth: 'advanced',
      decides: 'Which reading to improve first.',
      type: 'measure',
      requires: ['how-sure-is-the-total'],
      title: 'Which measurement limits you?',
      body: `In the step before, you moved one reading at a time by its error
 bar. Read off how far each move shifted your mass, and say which
 reading limits it: the one that moves the mass more.`,
      fields: [
        {
          id: 'move_a',
          label: 'Mass change from a alone',
          unit: 'M☉',
          compute: (v, e) => e('how-sure-is-the-total', 'move_a'),
          decimals: 3,
        },
        {
          id: 'move_p',
          label: 'Mass change from P alone',
          unit: 'M☉',
          compute: (v, e) => e('how-sure-is-the-total', 'move_p'),
          decimals: 3,
        },
        {
          id: 'which',
          kind: 'text',
          label: 'Which reading limits the mass, a or P',
          hint: 'a or P',
        },
      ],
      validate: v => {
        const pick = String(v.which_text ?? '')
          .trim()
          .toLowerCase();
        if (!pick || !(v.move_a >= 0) || !(v.move_p >= 0)) return null;
        if (!['a', 'p'].includes(pick[0])) {
          return { level: 'warn', message: 'Answer with a or P.' };
        }
        const limits = v.move_p > v.move_a ? 'p' : 'a';
        return pick[0] === limits
          ? {
              level: 'ok',
              message:
                'Yes: the reading that moves the mass more is the one that limits it, so improving the other first would change little.',
            }
          : {
              level: 'warn',
              message:
                'Look again at the two changes above: the larger one belongs to the reading that limits the mass.',
            };
      },
    },
    {
      sid: 'weigh-one-star-with-an-error-bar',
      after: 'now-weigh-each-one',
      depth: 'advanced',
      decides: 'How the two uncertainties combine for one star.',
      type: 'question',
      kind: 'numeric',
      uncertainty: true,
      title: 'Weigh one star, with an error bar',
      body: `Take the total as 4.0 ± 0.5 solar masses, the size of bar a
 hand-timed lap gives. The balance point sits so
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
