// =============================================================================
// The Shape of Expansion, deeper (Prompt 91)
// -----------------------------------------------------------------------------
// The same instrument. Quantitative: the deceleration parameter and the share of
// dark energy implied by the best fit. Advanced: the fit's distance from 0.30 in
// standard deviations, and how much wider the published interval is.
// Every expected value is recomputed in tests/cosmologyInvestigations.test.js.
// =============================================================================

const DIAGRAM = (values = {}) => ({ id: 'hubble-diagram', values });

export default {
  id: 'the-shape-of-expansion',
  steps: [
    {
      sid: 'acceleration-today',
      after: 'the-best-fit',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'Acceleration today',
      body: `For a flat universe of matter and a cosmological constant, the deceleration parameter today is q<sub>0</sub> = Ω<sub>m</sub> ÷ 2 − Ω<sub>Λ</sub>, with Ω<sub>Λ</sub> = 1 − Ω<sub>m</sub>. A negative q<sub>0</sub> is an expansion speeding up. Use Ω<sub>m</sub> = 0.361.`,
      prompt: 'The deceleration parameter q₀ (negative for acceleration)',
      unit: '',
      answer: -0.459,
      tolerance: 0.01,
      hints: ['0.361 ÷ 2 − 0.639; or 1.5 × 0.361 − 1.'],
      worked:
        '0.1805 − 0.639 = −0.459. It is negative, so the expansion is accelerating today. The cutoff is Ω_m = 2/3: with more matter than that, gravity would still win.',
      feedback: {
        close:
          'Close. Subtract the dark-energy share from half the matter share.',
        'wrong-order-of-magnitude':
          'A power of ten out: q₀ for a universe like ours is a few tenths.',
        off: 'Ωm ÷ 2 − (1 − Ωm).',
      },
      tool: DIAGRAM({ om: 0.36, h0: 70, calib: 0, view: 1 }),
    },
    {
      sid: 'the-dark-energy-share',
      after: 'the-best-fit',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The share of dark energy',
      body: `In a flat universe the matter density and the cosmological constant’s density add to one. Find the cosmological constant’s share when Ω<sub>m</sub> = 0.361.`,
      prompt: 'The cosmological constant’s share, in percent',
      unit: '%',
      answer: 63.9,
      tolerance: 0.3,
      hints: ['100 × (1 − 0.361).'],
      worked:
        '100 × (1 − 0.361) = 63.9 percent. Most of the energy density of the universe, in this model, is the cosmological constant: a conclusion of the model and the flatness assumption, not of the supernovae alone.',
      feedback: {
        close: 'Close. Subtract Ωm from 1, then multiply by 100.',
        'wrong-order-of-magnitude':
          'A power of ten out: it is a share of the whole, between 0 and 100.',
        off: '100 × (1 − Ωm).',
      },
      tool: DIAGRAM({ om: 0.36, h0: 70, calib: 0, view: 1 }),
    },
    {
      sid: 'how-many-sigma-is-0-3',
      after: 'the-usual-value',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'How many sigma',
      body: `For a single fitted parameter, a chi-square that is Δχ² above the minimum is √Δχ² standard deviations from the best fit. Use the 30.9 you read for Ω<sub>m</sub> = 0.30.`,
      prompt: 'The distance of 0.30 from the best fit, in standard deviations',
      unit: '',
      answer: 5.56,
      tolerance: 0.1,
      hints: ['The square root of 30.9.'],
      worked:
        '√30.9 = 5.56 standard deviations. A probability of about one in a hundred million if the errors are right: a number that should make you ask whether the errors are right, not whether the universe has Ωm = 0.36.',
      feedback: {
        close: 'Close. Take the square root, not the square.',
        'wrong-order-of-magnitude':
          'A power of ten out: the answer is a few, not hundreds.',
        off: 'sqrt(30.9).',
      },
      tool: DIAGRAM({ om: 0.3, h0: 70, calib: 0, view: 0 }),
    },
    {
      sid: 'the-published-interval',
      after: 'what-the-interval-leaves-out',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'The published interval',
      body: `The instrument’s 68% interval, 0.349 to 0.372, has a half-width of (0.372 − 0.349) ÷ 2. The published analysis of the same supernovae gives ± 0.017. Find how many times wider the published one is.`,
      prompt: 'The published half-width over this fit’s, as a ratio',
      unit: '',
      answer: 1.48,
      tolerance: 0.06,
      hints: ['The half-width is 0.0115.'],
      worked:
        '0.017 ÷ 0.0115 = 1.48. Including the errors that the supernovae share widens the interval by about half, without moving the best value much: the effect of the errors you left out, measured.',
      feedback: {
        close:
          'Close. Divide the published half-width by this fit’s half-width.',
        'wrong-order-of-magnitude':
          'A power of ten out: the published interval is a little wider, not many times.',
        off: '0.017 ÷ ((0.372 − 0.349) ÷ 2).',
      },
      tool: DIAGRAM({ om: 0.3, h0: 70, calib: 0, view: 0 }),
    },
  ],
};
