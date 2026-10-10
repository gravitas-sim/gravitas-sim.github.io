// =============================================================================
// The Sun's Motion, deeper (Prompt 92)
// -----------------------------------------------------------------------------
// The same instrument. Quantitative: the speed from the components, the
// Stromberg lag by hand, the error of a mean. Advanced: what the choice of
// frame does to the Sun's speed, and what would settle the choice. Every
// expected value is recomputed from the model (tools/authoring/galacticModels.mjs).
// =============================================================================

const SM = (values = {}) => ({ id: 'solar-motion', values });

export default {
  id: 'the-suns-motion',
  steps: [
    {
      sid: 'speed-from-components',
      after: 'measure-the-sun',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The speed from the components',
      body: `The three components are at right angles, so the Sun’s speed is
             the square root of the sum of their squares:
             √(U² + V² + W²). Use the three values you measured (10.5, 21.9
             and 9.1&nbsp;km/s, or your own).`,
      prompt: 'The Sun’s speed relative to these stars',
      unit: 'km/s',
      answer: 25.95,
      tolerance: 0.8,
      hints: ['Square each of the three, add them, and take the square root.'],
      worked:
        '10.48² + 21.92² + 9.10² = 109.8 + 480.5 + 82.8 = 673.2, and √673.2 = 25.95 km/s. The instrument lists the same number as the speed.',
      feedback: {
        close:
          'Close. Check that you squared the components and added all three before the root.',
        'wrong-order-of-magnitude':
          'A power of ten out. The speed cannot be much more than the largest component, 22 km/s.',
        off: 'Speed = √(U² + V² + W²), in km/s.',
      },
      tool: SM({ maxPc: 100, frame: 0, view: 0 }),
    },
    {
      sid: 'lag-arithmetic',
      after: 'the-lsr-problem',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'Strömberg’s lag by hand',
      body: `Read σ<sub>U</sub>, the stars’ velocity dispersion in U, from the
             list at 100&nbsp;pc: 38.1&nbsp;km/s. Strömberg’s relation says the
             stars lag the local standard of rest by σ<sub>U</sub>² ÷ 80&nbsp;km/s.`,
      prompt: 'The lag',
      unit: 'km/s',
      answer: 18.15,
      tolerance: 0.3,
      hints: ['Square 38.1 first, then divide by 80.'],
      worked:
        '38.11² = 1,452 and 1,452 ÷ 80 = 18.15 km/s. The Sun’s V against the stars is 21.92, so against the LSR it is 21.92 − 18.15 = 3.77 km/s.',
      feedback: {
        close: 'Close. The lag is σ_U squared, divided by 80.',
        off: 'Lag = σ_U² ÷ 80 km/s, with σ_U = 38.1 km/s.',
      },
      tool: SM({ maxPc: 100, frame: 1, view: 0 }),
    },
    {
      sid: 'error-of-the-mean',
      after: 'measure-farther',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'Where the uncertainty comes from',
      body: `The uncertainty of the Sun’s U is the stars’ scatter divided by the
             square root of how many there are. Within 1,000&nbsp;pc there are
             1,570 stars and σ<sub>U</sub> is 41.0&nbsp;km/s.`,
      prompt: 'The uncertainty of U',
      unit: 'km/s',
      answer: 1.03,
      tolerance: 0.05,
      hints: ['√1,570 is about 39.6.'],
      worked:
        '41.0 ÷ √1,570 = 41.0 ÷ 39.62 = 1.03 km/s. Four times the stars would halve it; it falls only as the square root.',
      feedback: {
        close:
          'Close. Divide by the square root of the count, not by the count.',
        off: 'Uncertainty = σ ÷ √N, with σ = 41.0 km/s and N = 1,570.',
      },
      tool: SM({ maxPc: 1000, frame: 0, view: 0 }),
    },
    {
      sid: 'speed-two-frames',
      after: 'record-both-frames',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'What the assumption costs',
      body: `At 100&nbsp;pc, read the Sun’s <strong>speed</strong> in the
             Strömberg frame (14.4&nbsp;km/s) and in the Schönrich frame
             (18.5&nbsp;km/s). U and W are the same in both; only V is
             different.`,
      prompt: 'The difference in the Sun’s speed between the two frames',
      unit: 'km/s',
      answer: 4.12,
      tolerance: 0.3,
      hints: ['Read the Speed row in each frame and subtract.'],
      worked:
        'Strömberg: √(10.48² + 3.77² + 9.10²) = 14.38. Schönrich: √(10.48² + 12.24² + 9.10²) = 18.51. The difference is 4.12 km/s: nearly 30 percent of the smaller speed, from a choice of reference.',
      feedback: {
        close: 'Close. Subtract the smaller speed from the larger.',
        off: 'Difference of the two Speed rows, at 100 pc.',
      },
      tool: SM({ maxPc: 100, frame: 2, view: 0 }),
    },
    {
      sid: 'what-would-settle-it',
      after: 'speed-two-frames',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'What would settle it?',
      body: `Strömberg’s correction treats the lag as set by the dispersion
             alone. Schönrich and colleagues found it depends on metallicity as
             well. Fitting the lag across color bins of this sample is the obvious
             test. The project’s notes (GALACTIC_DYNAMICS.md) record it giving
             12.3 ± 6.7&nbsp;km/s for one choice of bins: an error about as big as
             the 8&nbsp;km/s between the two values, so it cannot settle them.
             That is a recorded result, not something the instrument shows.`,
      prompt: 'What would let a sample decide between the two values?',
      options: [
        'Many more stars with a radial velocity and a measured metallicity, split by both, so the lag can be fitted against each',
        'Using only the nearest 25 stars, where there is no lag',
        'Averaging the two published values',
        'A better parallax zero-point correction',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'average-it',
          option: 2,
          say: 'An average is not a measurement: it would be a third value with no argument behind it.',
        },
      ],
      hints: [
        'What would you need to see the dependence on metallicity separately from the dispersion?',
      ],
      because:
        'More stars with metallicity, split by both. The two corrections differ in what the lag depends on, so only a sample large enough to separate the dependences can choose. Until then the value is an assumption, to be stated with the result.',
      tool: SM({ maxPc: 1000, frame: 1, view: 0 }),
    },
  ],
};
