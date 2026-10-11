// =============================================================================
// The First Rung, deeper (Prompt 96)
// -----------------------------------------------------------------------------
// The same instrument. Quantitative: the distance from the modulus by hand, and
// the budget added in quadrature. Advanced: the distance's error as a percentage,
// and what averaging many hosts does to a budget whose largest terms are not the
// same kind. Every expected value is recomputed in
// tests/variableInvestigations.test.js.
// =============================================================================

const LEAVITT = (values = {}) => ({ id: 'leavitt-law', values });

export default {
  id: 'the-first-rung',
  steps: [
    {
      sid: 'from-modulus-to-distance',
      after: 'a-maser-galaxy',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'From the modulus to the distance',
      body: `The distance modulus is μ = 5 log₁₀(d ÷ 10 pc), so
             d = 10<sup>(μ+5)/5</sup> parsecs, which is 10<sup>(μ−25)/5</sup>
             megaparsecs. Use NGC 4258’s μ = 29.403 to find its distance and check the
             instrument’s figure.`,
      prompt: 'The distance of NGC 4258, in megaparsecs',
      unit: 'Mpc',
      answer: 7.59,
      tolerance: 0.05,
      hints: ['(29.403 − 25) ÷ 5 = 0.8806. Then 10 to that power.'],
      worked:
        '(29.403 − 25) ÷ 5 = 0.8806, and 10^0.8806 = 7.59 megaparsecs. Each magnitude of modulus is a factor of 10^0.2 = 1.58 in distance, so the 10.9-magnitude slide from the Magellanic Cloud is a factor 153.',
      feedback: {
        close: 'Close. Subtract 25 before dividing by 5, for megaparsecs.',
        'wrong-order-of-magnitude':
          'A power of ten out: with μ in magnitudes, 10 to the (μ − 25) ÷ 5 gives megaparsecs; without the 25 it gives parsecs.',
        off: '10^((29.403 − 25) ÷ 5).',
      },
      tool: LEAVITT({ host: 1 }),
    },
    {
      sid: 'the-budget-in-quadrature',
      after: 'the-budget',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The budget in quadrature',
      body: `Independent errors add as the square root of the sum of their
             squares. Take the four terms for NGC 4258: 0.043, 0.0048, 0.00015 and
             0.026 magnitudes. Add them in quadrature.`,
      prompt: 'The total error, in magnitudes',
      unit: 'mag',
      answer: 0.0505,
      tolerance: 0.0015,
      hints: [
        '0.043² = 0.00185; 0.026² = 0.00068; the other two are 0.00002 and nothing.',
      ],
      worked:
        '0.00185 + 0.00002 + 0.00000 + 0.00068 = 0.00255, whose square root is 0.0505, the instrument’s 0.051. Adding the four plainly would give 0.074, far too much: errors that are independent partly cancel.',
      feedback: {
        close: 'Close. Square each term, add, then take the square root.',
        'wrong-order-of-magnitude':
          'A power of ten out: the total is a little more than the largest term, 0.043.',
        off: 'sqrt(0.043² + 0.0048² + 0.00015² + 0.026²).',
      },
      tool: LEAVITT({ host: 1 }),
    },
    {
      sid: 'the-error-in-percent',
      after: 'what-limits-it',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'The error as a share of the distance',
      body: `A small error in the modulus is a fraction of the distance:
             Δd ÷ d = (ln 10 ÷ 5) Δμ = 0.4605 Δμ. Take NGC 4258’s total error,
             0.051 magnitudes, and give the distance’s error in percent.`,
      prompt: 'The error in distance, in percent',
      unit: '%',
      answer: 2.35,
      tolerance: 0.1,
      hints: ['0.4605 × 0.051 × 100.'],
      worked:
        '0.4605 × 0.051 = 0.0235, or 2.35 percent of 7.59 Mpc, which is 0.18 megaparsecs, the instrument’s figure. The Cloud’s distance alone is an error of 1.2 percent, and it supplies 26 percent of the variance (0.026² ÷ 0.051²).',
      feedback: {
        close: 'Close. Multiply 0.051 by 0.4605 and by 100.',
        'wrong-order-of-magnitude':
          'A power of ten out: 0.05 magnitudes is a couple of percent in distance.',
        off: '100 × 0.4605 × 0.051.',
      },
      tool: LEAVITT({ host: 1 }),
    },
    {
      sid: 'ten-hosts',
      after: 'another-galaxy',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'Ten galaxies',
      body: `Suppose ten galaxies like NGC 4258 were each calibrated on the same
             Cloud. Their own scatter terms are independent, so the host term of
             their mean falls to 0.043 ÷ √10. But the calibration’s scatter
             (0.0048) and the Cloud’s distance (0.026) are shared by every
             galaxy, and the slope term is negligible. Add the three in
             quadrature to find the error of the mean modulus.`,
      prompt: 'The error of the ten-galaxy mean modulus, in magnitudes',
      unit: 'mag',
      answer: 0.0297,
      tolerance: 0.002,
      hints: ['0.043 ÷ 3.162 = 0.0136. Then sqrt(0.0136² + 0.0048² + 0.026²).'],
      worked:
        'sqrt(0.0136² + 0.0048² + 0.026²) = sqrt(0.000185 + 0.000023 + 0.000676) = 0.0297 magnitudes. Ten galaxies cut the error from 0.051 to 0.030, not to 0.016: the shared terms do not average away. This is why the anchor’s distance is the limiting error of the whole ladder, and why that distance is the most studied number in it.',
      feedback: {
        close:
          'Close. Only the host term is divided by √10; the other two are not.',
        'wrong-order-of-magnitude':
          'A power of ten out: the answer lies between the Cloud’s 0.026 and the single-galaxy 0.051.',
        off: 'sqrt((0.043 ÷ √10)² + 0.0048² + 0.026²).',
      },
      tool: LEAVITT({ host: 1 }),
    },
    {
      sid: 'from-the-rung-to-the-hubble-constant',
      after: 'the-error-in-percent',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'From the rung to the Hubble constant',
      body: `A Hubble constant is a speed over a distance, so a distance
             scale that is wrong by a fraction is wrong by the same fraction in
             the constant. Suppose supernovae calibrated on NGC 4258 give
             H<sub>0</sub> = 70 km/s/Mpc, and the only error is this rung’s
             0.051 magnitudes, which is 2.35 percent in distance (the previous
             step). <em>Standard Candles</em> shows the same arithmetic on the
             supernovae.`,
      prompt: 'The error this rung passes on to H₀, in km/s/Mpc',
      unit: 'km/s/Mpc',
      answer: 1.64,
      tolerance: 0.05,
      hints: ['70 × 0.4605 × 0.051.'],
      worked:
        '70 × 0.0235 = 1.64 km/s/Mpc: a Hubble constant of 70 ± 1.6 from this one rung, before any supernova error. Averaging many galaxies would not reduce it far, because the Cloud’s distance in it is shared by every galaxy (the previous steps).',
      feedback: {
        close: 'Close. Multiply 70 by the fractional error in distance.',
        'wrong-order-of-magnitude':
          'A power of ten out: two percent of a number near seventy is a little over one.',
        off: '70 × (0.4605 × 0.051).',
      },
      tool: LEAVITT({ host: 1 }),
    },
  ],
};
