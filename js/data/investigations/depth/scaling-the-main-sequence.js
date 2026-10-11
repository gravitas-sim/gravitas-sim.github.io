// =============================================================================
// Scaling the Main Sequence, deeper (Prompt 95)
// -----------------------------------------------------------------------------
// The same instrument. Quantitative: the ratio of two model luminosities against
// the scaling's. Advanced: the effective exponent between the two most massive
// models, which falls below 3. Every expected value is recomputed in
// tests/interiorsInvestigations.test.js.
// =============================================================================

const MS = (values = {}) => ({ id: 'ms-scaling', values });

export default {
  id: 'scaling-the-main-sequence',
  steps: [
    {
      sid: 'the-ratio-by-hand',
      after: 'the-prediction',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'Doubling the mass, by the models',
      body: `The scaling says L ∝ M³, so doubling the mass multiplies the
             luminosity by 2³ = 8. Select the 20 solar-mass model and read its
             luminosity, then the 40 solar-mass model, and divide the second by
             the first.`,
      prompt: 'Luminosity of the 40 M☉ model ÷ luminosity of the 20 M☉ model',
      unit: '',
      answer: 5.29,
      tolerance: 0.08,
      hints: [
        'The luminosities are about 42,900 and 226,600 solar luminosities.',
      ],
      worked:
        '226,595 ÷ 42,855 = 5.29, not 8: between 20 and 40 solar masses the luminosity grows more slowly than M³. Radiation pressure is large in these stars, and a star near its Eddington limit has a luminosity that rises only as M.',
      feedback: {
        close: 'Close. Divide the larger luminosity by the smaller.',
        'wrong-order-of-magnitude':
          'A power of ten out: a factor of two in mass gives a factor of a few in luminosity here.',
        off: 'Read the luminosity of each of the 20 and 40 solar-mass models and divide the second by the first.',
      },
      tool: MS({ quantity: 0, opacity: 1, energy: 1, idx: 7 }),
    },
    {
      sid: 'the-effective-exponent',
      after: 'radius-scaling',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'The exponent between two models',
      body: `A power law through two points has the exponent log(L₂ ÷ L₁) ÷
             log(M₂ ÷ M₁). Use the two most massive models, 20 and 40 solar
             masses, whose luminosities you can read from the instrument.`,
      prompt: 'The effective luminosity exponent from 20 to 40 M☉',
      unit: '',
      answer: 2.4,
      tolerance: 0.04,
      hints: [
        'The ratio of luminosities is 5.29 and the ratio of masses is 2: the exponent is log 5.29 ÷ log 2.',
      ],
      worked:
        'log₂ 5.29 = 2.40. The exponent has fallen from 3.16 over 2 to 40 to 2.4 over the top octave, and it keeps falling toward 1 as the Eddington limit takes over: the scaling for electron scattering is a stage on the way, not the end.',
      feedback: {
        close: 'Close. Use log 5.29 ÷ log 2, in the same base.',
        'wrong-order-of-magnitude':
          'A power of ten out: the exponent is a number between 1 and 4.',
        off: 'Exponent = log(5.29) ÷ log(2).',
      },
      tool: MS({ quantity: 0, opacity: 1, energy: 1, idx: 7 }),
    },
  ],
};
