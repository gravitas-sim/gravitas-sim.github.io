// =============================================================================
// Leavitt's Law, deeper (Prompt 96)
// -----------------------------------------------------------------------------
// The same instrument. Quantitative: a Cepheid read off the line, and what one
// star's scatter costs in distance. Advanced: the brightness ratio of a tenfold
// step, and the error the calibration's zero point has from the number of stars.
// Every expected value is recomputed in tests/variableInvestigations.test.js.
// =============================================================================

const LEAVITT = (values = {}) => ({ id: 'leavitt-law', values });

export default {
  id: 'leavitts-law',
  steps: [
    {
      sid: 'a-cepheid-at-thirty-days',
      after: 'the-calibration',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'A Cepheid of thirty days',
      body: `The line is m = a + b (log₁₀ P − 1), with a the magnitude at
             10 days (12.60 here) and b the slope (−3.29). A Cepheid in the
             cloud has a period of 30 days. Work out the Wesenheit
             magnitude the line gives it.`,
      prompt: 'The line’s Wesenheit magnitude at 30 days',
      unit: 'mag',
      answer: 11.03,
      tolerance: 0.03,
      hints: [
        'log₁₀ 30 = 1.477, so log₁₀ P − 1 = 0.477. Then 12.60 − 3.29 × 0.477.',
      ],
      worked:
        '12.60 − 3.29 × 0.4771 = 12.60 − 1.57 = 11.03 magnitudes: 1.57 magnitudes brighter than at 10 days, a factor of 4.2. Reading a Cepheid’s brightness off its period is the whole of the method; the distance comes from comparing this value with the one actually measured in another galaxy.',
      feedback: {
        close: 'Close. Subtract 3.29 times (log₁₀ 30 − 1) from the zero point.',
        'wrong-order-of-magnitude':
          'A power of ten out: the correction is about 1.6 magnitudes, so the answer is near 11, not near 1 or 100.',
        off: '12.60 − 3.29 × (log₁₀ 30 − 1).',
      },
      tool: LEAVITT(LMC),
    },
    {
      sid: 'one-star-in-distance',
      after: 'how-tight',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'One star’s error in distance',
      body: `Suppose you measured one Cepheid in a distant galaxy and used the
             relation to find the distance modulus. The star lies about 0.089
             magnitudes off the line, one scatter. A change of
             Δμ in modulus changes the distance by the fraction
             (ln 10 ÷ 5) Δμ, or 0.4605 Δμ. Give the error in distance, in
             percent.`,
      prompt: 'The fractional error in distance from one scatter, in percent',
      unit: '%',
      answer: 4.1,
      tolerance: 0.2,
      hints: ['0.4605 × 0.0894 × 100.'],
      worked:
        '0.4605 × 0.0894 = 0.0412, which is 4.1 percent. One Cepheid gives a distance good to about 4 percent; a hundred independent ones give 0.4 percent, which is why a galaxy’s whole sample is used, and why the real limit is the errors that do not average down.',
      feedback: {
        close: 'Close. Multiply 0.0894 by 0.4605 and by 100.',
        'wrong-order-of-magnitude':
          'A power of ten out: 0.09 magnitudes is a few percent in distance, not a few tens.',
        off: '100 × 0.4605 × 0.0894.',
      },
      tool: LEAVITT(LMC),
    },
    {
      sid: 'the-brightness-ratio',
      after: 'the-tenfold-step',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'The brightness ratio',
      body: `Five magnitudes is a factor of 100 in brightness, so a
             difference of Δm magnitudes is a factor of 10<sup>0.4 Δm</sup>.
             Use the slope to find how many times brighter the 100-day Cepheid
             is than the 10-day one.`,
      prompt: 'The brightness ratio of the two Cepheids',
      unit: '×',
      answer: 20.7,
      tolerance: 0.7,
      hints: ['10 to the power 0.4 × 3.29 = 10 to the power 1.316.'],
      worked:
        '10^(0.4 × 3.29) = 10^1.316 = 20.7. Brightness goes as about the 1.3 power of the period: L ∝ P^1.3. A relation that steep is what makes Cepheids visible far away, because the long-period ones are luminous enough to be seen in other galaxies.',
      feedback: {
        close: 'Close. The exponent is 0.4 times the 3.29 magnitudes.',
        'wrong-order-of-magnitude':
          'A power of ten out: the ratio is a couple of tens, not hundreds or tenths.',
        off: '10^(0.4 × 3.29).',
      },
      tool: LEAVITT(LMC),
    },
    {
      sid: 'many-stars',
      after: 'why-one-galaxy',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'What 339 stars buy',
      body: `The zero point of a fit is known to about the scatter divided by
             √N for N independent stars. Work this out for 339 stars
             with a scatter of 0.0894 magnitudes, and compare it with the error
             the instrument gives for the magnitude at 10 days.`,
      prompt: 'The error of the zero point, in magnitudes',
      unit: 'mag',
      answer: 0.0049,
      tolerance: 0.0004,
      hints: ['√339 = 18.4.'],
      worked:
        '0.0894 ÷ 18.4 = 0.0049 magnitudes, the figure the instrument lists. The calibration’s own scatter hardly matters after 339 stars; it is the 0.026 magnitudes in the cloud’s distance that stays, because no number of Cepheids can shrink it.',
      feedback: {
        close:
          'Close. Divide the scatter by the square root of the number of stars.',
        'wrong-order-of-magnitude':
          'A power of ten out: the answer is far smaller than the scatter but not a thousandth of it.',
        off: '0.0894 ÷ √339.',
      },
      tool: LEAVITT(LMC),
    },
  ],
};
