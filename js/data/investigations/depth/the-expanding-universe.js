// =============================================================================
// The Expanding Universe, deeper (Prompt 91)
// -----------------------------------------------------------------------------
// The same instrument. Quantitative: the Hubble time from a slope, and a velocity
// from a distance. Advanced: a slope's error as a share of the slope, and how many
// of those errors separate the near sample from the far one.
// Every expected value is recomputed in tests/cosmologyInvestigations.test.js.
// =============================================================================

const HUBBLE = (values = {}) => ({ id: 'hubble-law', values });

export default {
  id: 'the-expanding-universe',
  steps: [
    {
      sid: 'the-hubble-time',
      after: 'hubbles-slope',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The Hubble time',
      body: `If galaxies had always moved at their present speeds, a galaxy at distance d would have set out when d ÷ v = 1 ÷ H<sub>0</sub> ago. With H<sub>0</sub> in kilometers per second per megaparsec, 1 ÷ H<sub>0</sub> is 977.8 ÷ H<sub>0</sub> billion years. Use Hubble’s slope of 424.`,
      prompt: 'The time 1 ÷ H₀ for Hubble’s slope, in billion years',
      unit: 'Gyr',
      answer: 2.31,
      tolerance: 0.05,
      hints: ['977.8 ÷ 424.'],
      worked:
        '977.8 ÷ 423.9 = 2.31 billion years: an age of the universe younger than the Earth, which Hubble’s contemporaries noticed. With 66.3 the same estimate is 14.7 billion years. A slope that was too large made a universe that was too young.',
      feedback: {
        close: 'Close. Divide 977.8 by the slope.',
        'wrong-order-of-magnitude':
          'A power of ten out: a slope of several hundred gives a time of a few billion years.',
        off: '977.8 ÷ the slope in km/s/Mpc.',
      },
      tool: HUBBLE({ sample: 0, zmax: 0.1 }),
    },
    {
      sid: 'a-velocity-from-a-distance',
      after: 'a-modern-sample',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'A velocity from a distance',
      body: `The line through the origin says v = H<sub>0</sub> d. Use the slope of the supernovae out to z = 0.1, 66.33, for a galaxy at a distance of 100 megaparsecs.`,
      prompt: 'The velocity at 100 megaparsecs, in kilometers per second',
      unit: 'km/s',
      answer: 6633,
      tolerance: 70,
      hints: ['66.33 × 100.'],
      worked:
        '66.33 × 100 = 6,633 kilometers per second, a redshift of 6,633 ÷ 299,792 = 0.022. Each megaparsec adds 66 kilometers per second, so a galaxy ten times as far recedes ten times as fast, as long as the line holds.',
      feedback: {
        close: 'Close. Multiply the slope by the distance.',
        'wrong-order-of-magnitude':
          'A power of ten out: 66 for each of 100 megaparsecs is thousands, not hundreds or tens of thousands.',
        off: 'slope × distance.',
      },
      tool: HUBBLE({ sample: 1, zmax: 0.1 }),
    },
    {
      sid: 'the-slopes-error',
      after: 'a-modern-sample',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'The error as a share of the slope',
      body: `A slope of 66.33 ± 0.24 km/s/Mpc. The relative error is the error over the slope. Use the instrument’s unrounded 0.245.`,
      prompt: 'The slope’s error, in percent',
      unit: '%',
      answer: 0.37,
      tolerance: 0.03,
      hints: ['100 × 0.245 ÷ 66.33.'],
      worked:
        '100 × 0.245 ÷ 66.33 = 0.37 percent. A third of one percent, from 197 supernovae, which is the statistical error alone: the systematic errors of the distance scale are far larger, as the next investigation makes plain.',
      feedback: {
        close: 'Close. Divide the error by the slope and multiply by 100.',
        'wrong-order-of-magnitude':
          'A power of ten out: a quarter of a unit in 66 is a fraction of one percent.',
        off: '100 × error ÷ slope.',
      },
      tool: HUBBLE({ sample: 1, zmax: 0.1 }),
    },
    {
      sid: 'how-many-errors-apart',
      after: 'further-out',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'How many errors apart',
      body: `The near sample gives 66.33 ± 0.245 and the far one 59.35 ± 0.196. For two independent estimates, the difference over the square root of the sum of the squared errors is the number of standard deviations between them.`,
      prompt: 'The number of standard deviations between the two slopes',
      unit: '',
      answer: 22.3,
      tolerance: 0.8,
      hints: [
        'The difference is 6.98. The combined error is sqrt(0.245² + 0.196²).',
      ],
      worked:
        '6.98 ÷ sqrt(0.0600 + 0.0384) = 6.98 ÷ 0.3137 = 22.3. The samples overlap (the near sample is in the far one), so the true number is not quite this, but a slope that changes by twenty standard deviations is not noise. The sample out to z = 0.5 is the wrong shape for a line.',
      feedback: {
        close:
          'Close. Divide the difference by the combined error, not by either one alone.',
        'wrong-order-of-magnitude':
          'A power of ten out: the difference is several times the error of each slope, not hundreds of times.',
        off: '(66.33 − 59.35) ÷ sqrt(0.245² + 0.196²).',
      },
      tool: HUBBLE({ sample: 1, zmax: 0.5 }),
    },
  ],
};
