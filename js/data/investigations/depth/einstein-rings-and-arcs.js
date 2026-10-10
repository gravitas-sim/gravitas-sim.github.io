// =============================================================================
// Einstein Rings and Arcs, deeper (Prompt 94)
// -----------------------------------------------------------------------------
// The same instrument. Quantitative: the mass inside a ring, by hand.
// Advanced: the speed spread of the galaxy that makes it. Every expected value
// is recomputed in tests/lensingInvestigations.test.js.
// =============================================================================

const LP = (values = {}) => ({ id: 'lens-plane', values });
const GALAXY = { kind: 0, logM: 11, logD: 6, y: 0, size: 0.1 };

export default {
  id: 'einstein-rings-and-arcs',
  steps: [
    {
      sid: 'mass-by-hand',
      after: 'weigh-the-lens',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The mass inside a ring, by hand',
      body: `Solving the Einstein radius for the mass gives
             <em>M</em> = θ<sub>E</sub>² c² D<sub>l</sub>D<sub>s</sub> ÷
             (4G D<sub>ls</sub>). Take a ring of 1.0 arcsecond (4.848 × 10<sup>−6</sup>
             radians) around a lens at 1 Gpc, with the source at 2 Gpc, so
             D<sub>ls</sub> = 1 Gpc. One gigaparsec is 3.086 × 10<sup>25</sup> m
             and a solar mass is 1.989 × 10<sup>30</sup> kg.`,
      prompt: 'The mass inside the ring',
      unit: '10^11 solar masses',
      answer: 2.46,
      tolerance: 0.05,
      hints: [
        'D_l D_s ÷ D_ls = 2 Gpc × 1 Gpc ÷ 1 Gpc = 2 Gpc = 6.171 × 10²⁵ m.',
      ],
      worked:
        'M = (4.848 × 10⁻⁶)² × (2.998 × 10⁸)² × 6.171 × 10²⁵ ÷ (4 × 6.674 × 10⁻¹¹) = 4.88 × 10⁴¹ kg = 2.46 × 10¹¹ solar masses. It is the mass inside the ring, of whatever kind, and what the instrument gave by trial.',
      feedback: {
        close: 'Close. Check D_l D_s ÷ D_ls and the factor of 4G.',
        'wrong-order-of-magnitude':
          'A power of ten out: a galaxy’s lensing mass is of order 10¹¹ to 10¹² solar masses.',
        off: 'M = θ² c² D_l D_s ÷ (4 G D_ls), in kilograms, then divide by 1.989 × 10³⁰.',
      },
      tool: LP(GALAXY),
    },
    {
      sid: 'the-speed-spread',
      after: 'an-isothermal-galaxy',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'The speed spread of a lens',
      body: `An isothermal galaxy has an Einstein radius
             θ<sub>E</sub> = 4π (σ ÷ c)² D<sub>ls</sub> ÷ D<sub>s</sub>, where σ is
             the one-dimensional speed spread of its stars. Take
             θ<sub>E</sub> = 1.0 arcsecond and D<sub>ls</sub> ÷ D<sub>s</sub> = 0.5, as in the
             instrument. The speed of light is 299,792 km/s.`,
      prompt: 'The speed spread that makes a one-arcsecond ring',
      unit: 'km/s',
      answer: 263,
      tolerance: 3,
      hints: [
        'σ = c √(θ_E D_s ÷ (4π D_ls)), with θ_E in radians and D_s ÷ D_ls = 2.',
      ],
      worked:
        'σ = 299,792 × √(4.848 × 10⁻⁶ × 2 ÷ (4π)) = 299,792 × 8.78 × 10⁻⁴ = 263 km/s: a typical speed spread for a massive elliptical galaxy, which is why such galaxies are the common lenses. The instrument lists the speed spread for its own ring.',
      feedback: {
        close: 'Close. The ratio D_s ÷ D_ls is 2, and θ_E is in radians.',
        'wrong-order-of-magnitude':
          'A power of ten out: the speed spread of a galaxy is a few hundred kilometers per second.',
        off: 'σ = c √(θ_E ÷ (4π × 0.5)), with θ_E = 4.848 × 10⁻⁶.',
      },
      tool: LP({ ...GALAXY, kind: 1, logM: 11.4 }),
    },
  ],
};
