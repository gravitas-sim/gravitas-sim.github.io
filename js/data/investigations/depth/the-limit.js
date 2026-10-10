// =============================================================================
// The Limit, deeper (Prompt 95)
// -----------------------------------------------------------------------------
// The same instrument. Quantitative: the mean density of the typical dwarf by
// hand. Advanced: how little mass a hundredfold increase of density buys near
// the limit. Every expected value is recomputed in
// tests/interiorsInvestigations.test.js.
// =============================================================================

const WD = (values = {}) => ({ id: 'wd-mass-radius', values });

export default {
  id: 'the-limit',
  steps: [
    {
      sid: 'the-mean-density-by-hand',
      after: 'a-typical-dwarf',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The mean density by hand',
      body: `The typical dwarf has a mass of 0.597 solar masses (1 solar mass =
             1.989 × 10<sup>30</sup> kg) and a radius of 8,864 km. The mean density
             is mass ÷ (4/3 π R³). Give it in units of 10<sup>5</sup> g/cm³
             (1 g/cm³ is 1,000 kg/m³); the instrument lists the same number.`,
      prompt: 'The mean density of the typical white dwarf',
      unit: '10⁵ g/cm³',
      answer: 4.07,
      tolerance: 0.06,
      hints: [
        'Mass: 1.188 × 10³⁰ kg. Volume: 4.19 × (8.864 × 10⁶ m)³ = 2.92 × 10²¹ m³.',
      ],
      worked:
        '1.188 × 10³⁰ ÷ 2.918 × 10²¹ = 4.07 × 10⁸ kg/m³, which is 4.07 × 10⁵ g/cm³: some 290,000 times the Sun’s mean density, 1.41 g/cm³. A teaspoon of it would weigh about two tonnes.',
      feedback: {
        close: 'Close. Check the cube of the radius and the unit conversion.',
        'wrong-order-of-magnitude':
          'A power of ten out: convert the radius to meters before cubing, and kg/m³ to g/cm³ at the end.',
        off: 'ρ = M ÷ (4/3 π R³) with R in meters, then divide by 1,000 and by 10⁵.',
      },
      tool: WD({ logRho: 6.5, muE: 2 }),
    },
    {
      sid: 'the-diminishing-return',
      after: 'the-ceiling',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'What a hundredfold density buys',
      body: `Raising the central density from 10⁹ to 10¹¹ g/cm³ took the mass from
             1.367 to 1.450 solar masses. Find how much mass that hundredfold
             increase added, as a percentage of the 1.367.`,
      prompt: 'Increase of mass, as a percentage',
      unit: '%',
      answer: 6.1,
      tolerance: 0.3,
      hints: [
        'Subtract the two masses and divide by 1.367, then multiply by 100.',
      ],
      worked:
        '(1.450 − 1.367) ÷ 1.367 = 6.1 percent. From 10⁷ to 10⁹ g/cm³ the mass had gone from 0.81 to 1.37; the next hundredfold adds six percent, and the one after would add under one percent. The mass saturates because the pressure is ρ^(4/3) there, and the ceiling is where that exponent stops giving a stable star.',
      feedback: {
        close:
          'Close. The increase is the difference divided by the starting mass.',
        'wrong-order-of-magnitude':
          'A power of ten out: the increase is a few percent, not a few hundred.',
        off: '100 × (1.450 − 1.367) ÷ 1.367.',
      },
      tool: WD({ logRho: 11, muE: 2 }),
    },
  ],
};
