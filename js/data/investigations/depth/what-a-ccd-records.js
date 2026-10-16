// =============================================================================
// What a CCD Records, deeper (Prompt 86)
// -----------------------------------------------------------------------------
// The same instrument. Quantitative: counts to electrons, and the exposure at
// which the dark current's noise matches the read noise, and the size of the
// flat's correction. Advanced: how much of a saturated star is lost, and how
// many error bars that is. Every expected value is recomputed in
// tests/calibrationLessons.test.js.
// =============================================================================

const FRAMES = (values = {}) => ({
  id: 'ccd-frames',
  values: { draw: 1, exposure: 60, ...values },
});

export default {
  id: 'what-a-ccd-records',
  steps: [
    {
      sid: 'the-bias-in-electrons',
      after: 'the-flat',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The offset in electrons',
      body: `The converter reports counts, and each count stands for a number of electrons, the <strong>gain</strong> you just read. Multiplying a count by the gain gives electrons. The bias level is 500.4 counts.`,
      prompt: 'The bias level, in electrons',
      unit: '',
      answer: 759,
      tolerance: 10,
      hints: [
        'The bias level in counts times the gain in electrons per count.',
      ],
      worked:
        '500.4 × 1.516 = 759 electrons. The offset is large against the read noise of 8 electrons, which is the point of it: a count of 500 leaves room for the noise to go either way without reaching zero.',
      feedback: {
        close: 'Close. Multiply the counts by the gain.',
        'wrong-order-of-magnitude':
          'A power of ten out: a gain near 1.5 turns hundreds of counts into hundreds of electrons.',
        off: 'counts × gain.',
      },
      tool: FRAMES({ view: 2 }),
    },
    {
      sid: 'dark-matches-read',
      after: 'the-dark',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'When the dark current matters',
      body: `A pixel’s dark current adds noise too: the electrons it collects in a time t have a variance equal to their number, 0.1 × t. The read noise adds a variance of its own square, once per read. Use a read noise of 8.05 electrons and a dark current of 0.100 electron a second.`,
      prompt:
        'The exposure at which the dark current’s variance equals the read noise’s, in seconds',
      unit: 's',
      answer: 648,
      tolerance: 12,
      hints: ['Set 0.100 × t equal to 8.05², about 64.8.'],
      worked:
        '8.05² = 64.8 and 64.8 ÷ 0.100 = 648 seconds. Below about eleven minutes the read noise outweighs the dark current’s noise in an ordinary pixel, so for a short exposure the dark matters as an offset to subtract, not as noise.',
      feedback: {
        close:
          'Close. Divide the square of the read noise by the dark current.',
        'wrong-order-of-magnitude':
          'A power of ten out: the square of the read noise is about 65 electrons squared, and the dark current makes a tenth of an electron a second.',
        off: 'read noise squared ÷ dark current.',
      },
      tool: FRAMES({ view: 1 }),
    },
    {
      sid: 'the-flats-correction',
      after: 'what-the-flat-does',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'How big the correction is',
      body: `Star B read 47,296 electrons raw and 54,083 after the flat.`,
      prompt: 'The factor the flat multiplied star B’s light by',
      unit: '',
      answer: 1.14,
      tolerance: 0.02,
      hints: ['The calibrated light divided by the raw light.'],
      worked:
        '54,083 ÷ 47,296 = 1.14: the flat raised star B’s light by 14 percent. Its pixels were at about 87 percent of average, and 1 ÷ 0.875 = 1.14.',
      feedback: {
        close: 'Close. Divide the calibrated light by the raw light.',
        'wrong-order-of-magnitude':
          'A factor near one: the flat changes a star by tens of percent here, not by orders of magnitude.',
        off: 'calibrated ÷ raw.',
      },
      tool: FRAMES({ view: 6 }),
    },
    {
      sid: 'the-lost-share',
      after: 'the-saturated-star',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'How much of star D is lost',
      body: `Star D’s calibrated light is 1,097,121 electrons and the table’s truth is 1,799,605.`,
      prompt: 'The share of star D’s light that was never recorded, in percent',
      unit: '%',
      answer: 39,
      tolerance: 1,
      hints: ['One minus the measured light over the true light, times 100.'],
      worked:
        '1 − 1,097,121 ÷ 1,799,605 = 0.390, or 39 percent. The brightest pixels reached the full well and the rest of their light was not stored.',
      feedback: {
        close:
          'Close. Divide the measured light by the true light and take the rest.',
        'wrong-order-of-magnitude':
          'A fraction of the whole: a share of the star’s light, between none and all of it.',
        off: '100 × (truth − measured) ÷ truth.',
      },
      tool: FRAMES({ view: 6 }),
    },
    {
      sid: 'the-bars-that-do-not-see',
      after: 'the-saturated-star',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'How many error bars is that',
      body: `The table’s error for star D is 1,060 electrons: photon and read noise only. The shortfall is the truth, 1,799,605, minus the measured light, 1,097,121.`,
      prompt: 'The shortfall, in units of the error bar',
      unit: '',
      answer: 663,
      tolerance: 12,
      hints: ['The shortfall in electrons divided by the error in electrons.'],
      worked:
        '(1,799,605 − 1,097,121) ÷ 1,060 = 663 error bars. A noise-only error bar cannot see a systematic loss: no amount of care with the statistics would have flagged this star, only the pixel values at the full well did.',
      feedback: {
        close: 'Close. Divide the shortfall by the error.',
        'wrong-order-of-magnitude':
          'A power of ten out: the shortfall is hundreds of thousands of electrons and the error about a thousand.',
        off: '(truth − measured) ÷ error.',
      },
      tool: FRAMES({ view: 6 }),
    },
  ],
};
