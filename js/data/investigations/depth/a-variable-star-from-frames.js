// =============================================================================
// A Variable Star From Frames, deeper (Prompt 86)
// -----------------------------------------------------------------------------
// The same instrument. Quantitative: a scatter in magnitudes as a percent of
// the light, and the period in hours. Advanced: how many errors the amplitude
// is, and how far an uncalibrated night sits from the truth manifest. Every
// expected value is recomputed in tests/calibrationLessons.test.js.
// =============================================================================

const DIFF = (values = {}) => ({
  id: 'diff-photometry',
  values: { draw: 1, reduction: 3, truth: 0, mode: 0, ...values },
});

export default {
  id: 'a-variable-star-from-frames',
  steps: [
    {
      sid: 'magnitudes-to-percent',
      after: 'against-the-comparison',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'A scatter as a share of the light',
      body: `A change of 0.0088 magnitude is a change in brightness by the factor 10<sup>0.4 × 0.0088</sup>. For a small change, one magnitude is 92.1 percent of the light, because 0.4 times the natural logarithm of 10 is 0.921.`,
      prompt:
        'The check star’s scatter of 0.0088 magnitude, as a percent of its light',
      unit: '%',
      answer: 0.81,
      tolerance: 0.03,
      hints: ['0.0088 × 92.1.'],
      worked:
        '0.0088 × 92.1 = 0.81 percent. A single differential measurement is good to under one percent of the star’s light; the star alone, at 0.070 magnitude, was good to 6.5 percent.',
      feedback: {
        close: 'Close. Multiply the scatter in magnitudes by 92.1.',
        'wrong-order-of-magnitude':
          'A power of ten out: a hundredth of a magnitude is about one percent.',
        off: 'magnitudes × 92.1 = percent.',
      },
      tool: DIFF({ mode: 3 }),
    },
    {
      sid: 'the-period-in-hours',
      after: 'the-sine',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The period in hours',
      body: `The best sine has a period of 0.1223 day.`,
      prompt: 'The period, in hours',
      unit: 'h',
      answer: 2.93,
      tolerance: 0.1,
      hints: ['Multiply the days by 24.'],
      worked:
        '0.1223 × 24 = 2.93 hours. The 40 frames, 11 minutes apart, cover 7.2 hours, so the run holds two and a half cycles, which is why the period is known only to about two percent.',
      feedback: {
        close: 'Close. Multiply the days by 24.',
        'wrong-order-of-magnitude':
          'A power of ten out: a tenth of a day is a couple of hours.',
        off: 'days × 24.',
      },
      tool: DIFF({ mode: 2 }),
    },
    {
      sid: 'how-many-errors',
      after: 'is-it-real',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'The amplitude in errors',
      body: `The best sine’s amplitude is 0.0417 magnitude with an error of 0.0018, from the table.`,
      prompt: 'How many errors the amplitude is',
      unit: '',
      answer: 23.5,
      tolerance: 1.3,
      hints: ['The amplitude over its error.'],
      worked:
        '0.0417 ÷ 0.0018 = 23: the amplitude is more than twenty errors from zero. A detection needs only a few; the point of the number is that it is measured against an error the data carry, not a guess.',
      feedback: {
        close: 'Close. Divide the amplitude by its error.',
        'wrong-order-of-magnitude':
          'A power of ten out: a few hundredths over a couple of thousandths is a few tens.',
        off: 'amplitude ÷ error.',
      },
      tool: DIFF({ mode: 2 }),
    },
    {
      sid: 'the-uncalibrated-night',
      after: 'is-it-real',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'An uncalibrated night against the truth',
      body: `Choose “none: the raw frames” for the calibration, show the truth manifest, and look at the mean of the variable against the comparison and the truth beside it. They are both differences in magnitude.`,
      prompt: 'How far the uncalibrated mean is from the truth, in magnitudes',
      unit: 'mag',
      answer: 0.032,
      tolerance: 0.004,
      hints: ['The truth’s mean minus the uncalibrated mean.'],
      worked:
        'About 0.346 − 0.313 = 0.032 magnitude, three percent in the ratio of the two stars’ light. With no bias, dark or flat, the two stars sit on different parts of the frame and carry different offsets, and taking a difference of magnitudes does not cancel them. With every step, the mean agrees with the truth to better than a thousandth of a magnitude.',
      feedback: {
        close: 'Close. Subtract the uncalibrated mean from the truth.',
        'wrong-order-of-magnitude':
          'A few hundredths of a magnitude: both numbers are about a third of a magnitude.',
        off: 'truth − uncalibrated mean.',
      },
      tool: DIFF({ mode: 2, reduction: 0, truth: 1 }),
    },
  ],
};
