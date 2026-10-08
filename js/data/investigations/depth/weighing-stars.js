// =============================================================================
// Weighing the Stars, deeper (Prompt 72)
// -----------------------------------------------------------------------------
// The same pair and the same two measurements (`weigh-the-pair`): the orbit
// size and the period the student already recorded, now with the uncertainty of
// each carried into the mass, and the split of that mass into two.
// =============================================================================

const mass = (a, p) => a ** 3 / p ** 2;
const fraction = (a, sa, p, sp) =>
  Math.sqrt(((3 * sa) / a) ** 2 + ((2 * sp) / p) ** 2);

export default {
  id: 'weighing-stars',
  steps: [
    {
      sid: 'how-sure-is-the-total',
      after: 'weigh-the-pair',
      depth: 'quantitative',
      type: 'measure',
      requires: ['weigh-the-pair'],
      title: 'How sure is the total?',
      body: `Your two measurements were readings, not exact values: the rings
 are a little wider than a line, and a stopwatch is started and
 stopped by a person. Say how far off each could be.
 \n\nThe mass is a³ / P², so a fractional error in a counts three
 times and one in P counts twice, and independent errors add in
 quadrature: σ<sub>M</sub>/M = √((3σ<sub>a</sub>/a)² +
 (2σ<sub>P</sub>/P)²). The orbit size and the period are the ones
 you entered in the weighing step.`,
      fields: [
        { id: 'sa', label: 'How far off a could be', unit: 'AU', hint: '0.1' },
        {
          id: 'sp',
          label: 'How far off P could be',
          unit: 'years',
          hint: '0.2',
        },
        {
          id: 'a_in',
          label: 'Orbit size a',
          unit: 'AU',
          compute: (v, e) => e('weigh-the-pair', 'a'),
          decimals: 2,
        },
        {
          id: 'p_in',
          label: 'Period P',
          unit: 'years',
          compute: (v, e) => e('weigh-the-pair', 'p'),
          decimals: 2,
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
        return {
          level: 'ok',
          message: `The pair weighs ${v.m_tot.toFixed(2)} ± ${v.s_tot.toFixed(2)} solar masses. Quote both: a mass without its uncertainty cannot be compared with anyone else's.`,
        };
      },
    },
    {
      sid: 'weigh-it-with-an-error-bar',
      after: 'how-sure-is-the-total',
      depth: 'quantitative',
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
      placeholder: 'e.g. 4.0 ± 0.5',
      answer: 4,
      tolerance: 0.5,
      agrees: [{ sid: 'weigh-the-pair', id: 'total', at: { a: 4, p: 4 } }],
      hints: {
        concept: `A mass is a value and how well it is known.`,
        method: `Copy the total and its uncertainty from the previous step.`,
      },
      worked: `a = 4 and P = 4 give 64 / 16 = 4 solar masses. With the
 uncertainties suggested, 2.5% in a and 5% in P, the result is
 4.0 ± 0.5.`,
      because:
        'Four solar masses, uncertain by about half of one. Real binaries are weighed the same way, and the uncertainty quoted with each mass is what lets two astronomers say whether their results agree.',
    },
    {
      sid: 'which-measurement-limits-you',
      after: 'weigh-it-with-an-error-bar',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'Which measurement limits you?',
      body: `Say a = 4.0 ± 0.1 AU and P = 4.0 ± 0.2 years. The first is
 uncertain by 2.5% and the second by 5%. The mass goes as
 a³ / P².`,
      prompt: 'Which one contributes more to the uncertainty of the mass?',
      options: [
        'the orbit size, because it is cubed',
        'the period, because it is squared and is the less certain of the two',
        'they contribute equally, because both are measured',
        'neither: the mass is exact if the law is exact',
      ],
      answer: 1,
      because:
        'The orbit size contributes 3 × 2.5% = 7.5% and the period 2 × 5% = 10%. The power matters, but so does how well each is known; here the period wins, so a more careful stopwatch measurement, such as timing several laps and dividing, improves the mass more than a more careful ruler.',
    },
    {
      sid: 'weigh-one-star-with-an-error-bar',
      after: 'now-weigh-each-one',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      uncertainty: true,
      title: 'Weigh one star, with an error bar',
      body: `The total is 4.0 ± 0.3 solar masses. The balance point sits so
 that Star A, the heavier, carries 0.75 of the total, known to
 ±0.02. A share of a total is a product, so the fractional
 uncertainties add in quadrature: σ<sub>m</sub>/m =
 √((σ<sub>M</sub>/M)² + (σ<sub>f</sub>/f)²).`,
      prompt: 'Mass of Star A, with its uncertainty',
      unit: 'M☉',
      placeholder: 'e.g. 3.0 ± 0.3',
      answer: 3,
      tolerance: 0.35,
      hints: {
        concept: `Star A's mass is its share of the total.`,
        method: `m = 0.75 × 4.0. The fractions are 0.3/4.0 and 0.02/0.75;
 combine them and multiply by m.`,
      },
      worked: `m = 3.0. The fractions are 0.075 and 0.027, which combine to
 0.080, and 0.080 × 3.0 = 0.24.`,
      because:
        'Three solar masses, uncertain by about a quarter of one. The split of the mass is known better than the mass itself, because the ratio of the two distances is measured directly, while the total depends on a cubed.',
    },
  ],
};
