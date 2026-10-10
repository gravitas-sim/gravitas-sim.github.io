// =============================================================================
// Bending Light, deeper (Prompt 94)
// -----------------------------------------------------------------------------
// The same instrument. Quantitative: the Sun's bending by hand. Advanced: where
// rays bent by the Sun cross, a place to put a telescope. Every expected value
// is recomputed in tests/lensingInvestigations.test.js.
// =============================================================================

const LB = (values = {}) => ({ id: 'light-bending', values });

export default {
  id: 'bending-light',
  steps: [
    {
      sid: 'the-bending-by-hand',
      after: 'the-suns-limb',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The bending by hand',
      body: `For the Sun, GM ÷ c² is 1.477 km and the radius is 695,700 km. The
             bending of a ray that grazes the limb is 4GM ÷ (c²R) radians, and an
             arcsecond is 4.848 × 10<sup>−6</sup> radians.`,
      prompt: 'The bending of a ray at the Sun’s limb',
      unit: '″',
      answer: 1.75,
      tolerance: 0.02,
      hints: [
        'Divide 4 × 1.477 km by 695,700 km, then divide by 4.848 × 10⁻⁶.',
      ],
      worked:
        '4 × 1.477 ÷ 695,700 = 8.49 × 10⁻⁶ radians, and 8.49 × 10⁻⁶ ÷ 4.848 × 10⁻⁶ = 1.75 arcseconds. The instrument lists the same number.',
      feedback: {
        close: 'Close. Check the factor of 4 and the conversion from radians.',
        'wrong-order-of-magnitude':
          'A power of ten out: the bending in radians is of order 10⁻⁵, and an arcsecond is 10⁻⁶ of a radian.',
        off: 'α = 4 × (GM ÷ c²) ÷ R, then divide by 4.848 × 10⁻⁶ to get arcseconds.',
      },
      tool: LB({ logM: 0, logB: 0 }),
    },
    {
      sid: 'where-the-rays-cross',
      after: 'ten-times-the-mass',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'Where the rays cross',
      body: `Rays that graze the Sun are all turned toward it by 1.75 arcseconds,
             so they cross the line through its center at a distance
             <em>d</em> = R ÷ α from the Sun, where R is the radius and α is in
             radians. A telescope placed there would see the whole ring of the
             Sun's limb light focused. The astronomical unit is 1.496 × 10<sup>8</sup>
             km.`,
      prompt: 'The distance at which rays from the limb cross',
      unit: 'au',
      answer: 548,
      tolerance: 6,
      hints: [
        'd = 695,700 km ÷ 8.49 × 10⁻⁶, then divide by the astronomical unit.',
      ],
      worked:
        'd = 695,700 km ÷ 8.49 × 10⁻⁶ = 8.19 × 10¹⁰ km, which is 548 astronomical units: some thirteen times as far as Neptune. It is the nearest point of the Sun’s gravitational lens, and why proposals to use it send a telescope far past the planets. (A ray at 2 solar radii crosses at twice that distance, so the Sun is a poor lens, with a line of foci and not a point.)',
      feedback: {
        close: 'Close. Check that α is in radians when you divide R by it.',
        'wrong-order-of-magnitude':
          'A power of ten out: 8 × 10¹⁰ km divided by 1.5 × 10⁸ km per astronomical unit is hundreds.',
        off: 'd = R ÷ α with α = 8.49 × 10⁻⁶ rad, in astronomical units.',
      },
      tool: LB({ logM: 0, logB: 0 }),
    },
  ],
};
