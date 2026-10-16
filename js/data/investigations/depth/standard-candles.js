// =============================================================================
// Standard Candles, deeper (Prompt 91)
// -----------------------------------------------------------------------------
// The same instrument. Quantitative: how a modulus error becomes a distance
// error and a smaller Hubble constant. Advanced: the calibration a 1 percent
// Hubble constant needs, and the size of a 5 percent gap in magnitudes.
// Every expected value is recomputed in tests/cosmologyInvestigations.test.js.
// =============================================================================

const DIAGRAM = (values = {}) => ({ id: 'hubble-diagram', values });

export default {
  id: 'standard-candles',
  steps: [
    {
      sid: 'the-distance-factor',
      after: 'a-calibration-error',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The distance factor',
      body: `A distance modulus error Δμ multiplies every distance by 10<sup>Δμ/5</sup>. If every supernova is 0.1 magnitude fainter than assumed, each is farther by that factor.`,
      prompt: 'The increase in every distance, in percent',
      unit: '%',
      answer: 4.71,
      tolerance: 0.05,
      hints: ['10 raised to 0.1 ÷ 5 = 0.02.'],
      worked:
        '10^0.02 = 1.0471: every distance is 4.71 percent larger. Five magnitudes are a factor of a hundred in brightness and of ten in distance, so a tenth of a magnitude is 10^(0.1/5).',
      feedback: {
        close:
          'Close. Raise 10 to the power Δμ ÷ 5, then subtract 1 and multiply by 100.',
        'wrong-order-of-magnitude':
          'A power of ten out: a tenth of a magnitude is a few percent in distance.',
        off: '(10^(0.1 ÷ 5) − 1) × 100.',
      },
      tool: DIAGRAM({ om: 0.3, h0: 70, calib: 0.1, view: 0 }),
    },
    {
      sid: 'and-the-hubble-constant',
      after: 'a-calibration-error',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'And the Hubble constant',
      body: `The Hubble constant is a speed over a distance, so when every distance is larger by 1.0471 it falls to 1 ÷ 1.0471 of its value. Find the fall as a percent of the 70 it started at.`,
      prompt: 'The fall in the Hubble constant, in percent',
      unit: '%',
      answer: 4.5,
      tolerance: 0.05,
      hints: ['1 − 1 ÷ 1.0471.'],
      worked:
        '1 ÷ 1.0471 = 0.955, so the constant falls to 66.85, a fall of 4.5 percent: a little less than the 4.71 percent by which distances rose, because the one is a ratio and the other its inverse.',
      feedback: {
        close: 'Close. The fall is 1 minus the inverse of the distance factor.',
        'wrong-order-of-magnitude': 'A power of ten out: it is a few percent.',
        off: '100 × (1 − 1 ÷ 1.0471).',
      },
      tool: DIAGRAM({ om: 0.3, h0: 70, calib: 0.1, view: 0 }),
    },
    {
      sid: 'the-calibration-for-one-percent',
      after: 'the-rung-below',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'The calibration for one percent',
      body: `Suppose you want the Hubble constant to 1 percent. A fractional change f in a distance is a change of 5 log<sub>10</sub>(1 + f) magnitudes.`,
      prompt:
        'The largest calibration error that keeps H₀ within 1 percent, in magnitudes',
      unit: 'mag',
      answer: 0.0216,
      tolerance: 0.001,
      hints: ['5 × log₁₀(1.01); log₁₀(1.01) is about 0.00432.'],
      worked:
        '5 × 0.004321 = 0.0216 magnitudes. One percent in H₀ asks for a few hundredths of a magnitude at every rung, which is about the error in a single good Cepheid distance: the reason the distance ladder is the hard part.',
      feedback: {
        close: 'Close. Multiply log₁₀ of 1.01 by 5.',
        'wrong-order-of-magnitude':
          'A power of ten out: it is a couple of hundredths of a magnitude.',
        off: '5 × log₁₀(1.01).',
      },
      tool: DIAGRAM({ om: 0.3, h0: 70, calib: 0, view: 0 }),
    },
    {
      sid: 'a-five-percent-gap',
      after: 'the-degeneracy',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'A five percent gap',
      body: `Two ways of finding the Hubble constant disagree by 5 percent. If the whole disagreement were a difference in the supernovae’s calibration, how many magnitudes would it be?`,
      prompt:
        'The calibration difference that makes a 5 percent gap, in magnitudes',
      unit: 'mag',
      answer: 0.106,
      tolerance: 0.004,
      hints: ['5 × log₁₀(1.05).'],
      worked:
        '5 × 0.02119 = 0.106 magnitudes. A gap of five percent is about a tenth of a magnitude, so a small calibration error common to every supernova is a natural suspect; and it cannot be told apart from a different Hubble constant using the supernovae alone.',
      feedback: {
        close: 'Close. 5 × log₁₀(1.05).',
        'wrong-order-of-magnitude':
          'A power of ten out: it is about a tenth of a magnitude.',
        off: '5 × log₁₀(1 + 0.05).',
      },
      tool: DIAGRAM({ om: 0.3, h0: 70, calib: 0, view: 0 }),
    },
  ],
};
