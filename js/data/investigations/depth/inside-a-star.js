// =============================================================================
// Inside a Star, deeper (Prompt 95)
// -----------------------------------------------------------------------------
// The same instrument. Quantitative: the central temperature from a dimensional
// estimate, by hand. Advanced: the central pressure in units of GM²/R⁴. Every
// expected value is recomputed in tests/interiorsInvestigations.test.js.
// =============================================================================

const PT = (values = {}) => ({ id: 'polytrope', values });

export default {
  id: 'inside-a-star',
  steps: [
    {
      sid: 'the-estimate-by-hand',
      after: 'the-suns-centre',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The temperature by hand',
      body: `Take a gas of mean molecular weight μ = 0.6 held up against the
             weight of a star of mass <em>M</em> and radius <em>R</em>. Setting
             the thermal energy per particle, kT, equal to the gravitational
             energy per particle, GMμm<sub>u</sub> ÷ R, gives a temperature
             scale T ≈ GMμm<sub>u</sub> ÷ (kR). For the Sun,
             GM = 1.3275 × 10<sup>20</sup> m³/s², m<sub>u</sub> = 1.6605 ×
             10<sup>−27</sup> kg, k = 1.3806 × 10<sup>−23</sup> J/K and
             R = 6.957 × 10<sup>8</sup> m.`,
      prompt: 'The temperature scale for the Sun',
      unit: 'million K',
      answer: 13.77,
      tolerance: 0.25,
      hints: [
        'Multiply 1.3275 × 10²⁰ by 0.6 and by 1.6605 × 10⁻²⁷, then divide by the product of k and R.',
      ],
      worked:
        '1.3275 × 10²⁰ × 0.6 × 1.6605 × 10⁻²⁷ = 1.3226 × 10⁻⁷, and k R = 9.605 × 10⁻¹⁵, so T = 1.377 × 10⁷ K: 13.8 million kelvin. The polytrope gives 11.8, 15 percent lower, because a real star is not uniform: the estimate has the right size and the right dependence on M ÷ R, which is what matters.',
      feedback: {
        close: 'Close. Check the molecular weight and the unit conversion.',
        'wrong-order-of-magnitude':
          'A power of ten out: the scale is of order 10⁷ kelvin.',
        off: 'T = G M μ m_u ÷ (k R), then divide by a million.',
      },
      tool: PT({ n: 3, logM: 0, logR: 0 }),
    },
    {
      sid: 'the-central-pressure',
      after: 'twice-the-mass',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'The central pressure in natural units',
      body: `Dimensions say the central pressure of any star is a number times
             GM² ÷ R⁴. For the Sun, GM² ÷ R⁴ is 1.127 × 10<sup>15</sup> Pa.
             Set the instrument to the Sun and read the central pressure (it
             is given in pascals), then divide.`,
      prompt: 'Central pressure ÷ (GM² ÷ R⁴) for n = 3',
      unit: '',
      answer: 11.05,
      tolerance: 0.15,
      hints: [
        'Read the central pressure, about 1.25 × 10¹⁶ Pa, and divide by 1.127 × 10¹⁵ Pa.',
      ],
      worked:
        '1.2456 × 10¹⁶ ÷ 1.127 × 10¹⁵ = 11.05. The number is 1 ÷ (4π (n + 1) θ′₁²) for the polytrope, which is 11.05 for n = 3, 0.119 for n = 0, and rises with n as the star condenses.',
      feedback: {
        close: 'Close. Check the exponents when you divide.',
        'wrong-order-of-magnitude':
          'A power of ten out: the pressure is about ten times GM² ÷ R⁴.',
        off: 'Divide the central pressure by 1.127 × 10¹⁵ Pa.',
      },
      tool: PT({ n: 3, logM: 0, logR: 0 }),
    },
  ],
};
