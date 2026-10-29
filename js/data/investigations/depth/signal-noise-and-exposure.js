// =============================================================================
// Signal, Noise and Exposure, deeper (Prompt 86)
// -----------------------------------------------------------------------------
// The same calculation. Quantitative: the photon-limited signal-to-noise, and
// the shares of the noise that belong to the read noise. Advanced: the cost of
// a bright moon in time, and what a square-root law would have promised in
// magnitudes. Every expected value is recomputed in
// tests/calibrationLessons.test.js.
// =============================================================================

const SNR = (values = {}) => ({
  id: 'ccd-snr',
  values: { mag: 15, exposure: 60, radius: 5, sky: 0, target: 100, ...values },
});

export default {
  id: 'signal-noise-and-exposure',
  steps: [
    {
      sid: 'only-the-stars-photons',
      after: 'one-star-one-minute',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The ideal measurement',
      body: `If the star’s own photons were the only noise, the noise would be the square root of the star’s electrons. The star gave 33,631 electrons in the aperture.`,
      prompt: 'The signal-to-noise with only the star’s own noise',
      unit: '',
      answer: 183,
      tolerance: 2,
      hints: ['The signal over its own square root is its square root.'],
      worked:
        'The square root of 33,631 is 183. The measurement reached 152.5, so the sky, the dark current and the read noise cost about a sixth of the quality.',
      feedback: {
        close: 'Close. Take the square root of the star’s electrons.',
        'wrong-order-of-magnitude':
          'A power of ten out: the square root of tens of thousands is a couple of hundred.',
        off: 'The square root of the star’s electrons.',
      },
      tool: SNR(),
    },
    {
      sid: 'the-read-noise-share-bright',
      after: 'four-times-longer',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The read noise’s share, a bright star',
      body: `At 60 seconds the total noise is 220.6 electrons, so the noise squared is the sum of the four terms, about 48,660. The read noise squared is 6,223.`,
      prompt: 'The read noise’s share of the noise squared, in percent',
      unit: '%',
      answer: 12.8,
      tolerance: 0.5,
      hints: [
        'The read noise squared over the total noise squared, times 100.',
      ],
      worked:
        '6,223 ÷ 220.6² = 6,223 ÷ 48,664 = 0.128, or 12.8 percent. At 240 seconds the same 6,223 is 3.5 percent of a larger total, which is why the signal-to-noise came out slightly above twice, not exactly twice.',
      feedback: {
        close:
          'Close. Divide the read noise squared by the square of the total noise.',
        'wrong-order-of-magnitude':
          'A share between zero and a hundred percent: one term of four.',
        off: '100 × read² ÷ noise².',
      },
      tool: SNR(),
    },
    {
      sid: 'the-read-noise-share-faint',
      after: 'a-faint-star',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The read noise’s share, a faint star',
      body: `At V = 19 and 10 seconds the total noise is 51.07 electrons, and the read noise squared is 2,001.`,
      prompt: 'The read noise’s share of the noise squared, in percent',
      unit: '%',
      answer: 77,
      tolerance: 2,
      hints: ['Read noise squared over total noise squared, times 100.'],
      worked:
        '2,001 ÷ 51.07² = 2,001 ÷ 2,608 = 0.767, or 77 percent: three quarters of the noise comes from reading the pixels, so a faint star in a short exposure is limited by the camera and not by the sky or the star.',
      feedback: {
        close:
          'Close. Divide the read noise squared by the square of the total noise.',
        'wrong-order-of-magnitude':
          'A share between zero and a hundred percent.',
        off: '100 × read² ÷ noise².',
      },
      tool: SNR({ mag: 19, exposure: 10, radius: 3 }),
    },
    {
      sid: 'what-the-moon-costs',
      after: 'exposure-for-the-target',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'What the moon costs',
      body: `Read the exposure that reaches a signal-to-noise of 100 for this star at a dark site (the first sky choice) and under a bright moon, 89.4 seconds.`,
      prompt:
        'How many times longer is the exposure under the moon than at the dark site',
      unit: '',
      answer: 3.05,
      tolerance: 0.1,
      hints: [
        'Choose “a dark site”, read the exposure for the target, and divide 89.4 by it.',
      ],
      worked:
        '89.4 ÷ 29.3 = 3.05: the moon triples the exposure. The same star gives the same signal; the sky’s extra photons add noise, and the only way to buy the lost quality back is time.',
      feedback: {
        close: 'Close. Divide the moon’s exposure by the dark site’s.',
        'wrong-order-of-magnitude':
          'A small factor, a few at most: both exposures are tens of seconds.',
        off: 'moon exposure ÷ dark-site exposure.',
      },
      tool: SNR({ sky: 0 }),
    },
    {
      sid: 'the-square-root-promise',
      after: 'faintest-star',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'What the square-root law promises',
      body: `If the star’s own photons were the only noise, four times the exposure would give twice the signal-to-noise, and the faintest star reached would be fainter by the magnitude difference of a factor of two in brightness, 2.5 times the base-ten logarithm of 2.`,
      prompt:
        'The gain in limiting magnitude for four times the exposure under that law',
      unit: 'mag',
      answer: 0.75,
      tolerance: 0.02,
      hints: ['2.5 × log10(2).'],
      worked:
        '2.5 × log10(2) = 0.753 magnitude. The instrument gave 0.96, more than the law: the faint limit is partly set by the read noise, which a longer frame pays only once, so for the faintest stars four times the time is worth more than the square-root law says.',
      feedback: {
        close: 'Close. Multiply the base-ten logarithm of 2 by 2.5.',
        'wrong-order-of-magnitude':
          'Less than a magnitude: a factor of two in brightness is three quarters of one.',
        off: '2.5 × log10(2).',
      },
      tool: SNR(),
    },
    // ---- Prompt 210: the noise budget under three conditions, and the read-noise regime ----
    {
      sid: 'budget-bright-dark',
      after: 'the-square-root-promise',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'The budget, a bright star at a dark site',
      body: `Set V = 15, 60 seconds, a 5 pixel radius and a dark site. The table gives the
             four terms of the noise squared and the total noise.`,
      prompt: 'The largest term’s share of the noise squared, in percent',
      unit: '%',
      answer: 69,
      tolerance: 1.5,
      hints: [
        'Divide the largest of the four terms by the square of the total noise.',
      ],
      worked:
        'The star’s own photons are 69 percent of the noise squared (the sky 17, the read noise 13, the dark current 1). A star this bright is limited by its own light: only more light helps.',
      feedback: {
        close:
          'Close. Divide the largest term by the square of the total noise.',
        'wrong-order-of-magnitude':
          'A share between zero and a hundred percent.',
        off: 'The largest term of the four, as a percent of the noise squared.',
      },
      tool: SNR(),
    },
    {
      sid: 'budget-faint-short',
      after: 'budget-bright-dark',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'The budget, a faint star in a short exposure',
      body: `Set V = 19, 10 seconds, a 3 pixel radius and a dark site.`,
      prompt: 'The largest term’s share of the noise squared, in percent',
      unit: '%',
      answer: 77,
      tolerance: 1.5,
      hints: [
        'The star gives only a few electrons a second here; the camera charges its read noise to every pixel of the aperture.',
      ],
      worked:
        'The read noise is 77 percent of the noise squared. A faint star in a short exposure is limited by the camera, not by the sky or the star: reading the pixels costs the same however long the exposure was.',
      feedback: {
        close:
          'Close. Divide the largest term by the square of the total noise.',
        'wrong-order-of-magnitude':
          'A share between zero and a hundred percent.',
        off: 'The largest term of the four, as a percent of the noise squared.',
      },
      tool: SNR({ mag: 19, exposure: 10, radius: 3, sky: 0 }),
    },
    {
      sid: 'budget-faint-moon',
      after: 'budget-faint-short',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'The budget, the same star under a bright moon',
      body: `Keep V = 19 and the 3 pixel radius, lengthen the exposure to 300 seconds and
             choose the bright moon.`,
      prompt: 'The largest term’s share of the noise squared, in percent',
      unit: '%',
      answer: 97,
      tolerance: 1.5,
      hints: [
        'Under a bright moon every pixel of the aperture collects the moon’s sky for the whole exposure.',
      ],
      worked:
        'The sky is 97 percent of the noise squared. The moon’s extra light adds noise in every pixel, and at 300 seconds the read noise has become a rounding error: the star is sky-limited, the regime where the square-root law holds and where a longer exposure is worth the most.',
      feedback: {
        close:
          'Close. Divide the largest term by the square of the total noise.',
        'wrong-order-of-magnitude':
          'A share between zero and a hundred percent.',
        off: 'The largest term of the four, as a percent of the noise squared.',
      },
      tool: SNR({ mag: 19, exposure: 300, radius: 3, sky: 2 }),
    },
    {
      sid: 'read-noise-crossover',
      after: 'budget-faint-moon',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'Where the sky takes over from the camera',
      body: `The read noise squared is paid once per exposure, the sky’s and the dark
             current’s noise squared grow with the exposure. For a dark site the sky gives
             1.41 electrons a second in each pixel and the dark current 0.10; the read noise is 8 electrons.`,
      prompt:
        'The exposure at which the sky’s and the dark’s noise squared in a pixel equal the read noise squared, in seconds',
      unit: 's',
      answer: 42.4,
      tolerance: 1.5,
      hints: ['Set (1.41 + 0.10) × t equal to 8², then solve for t.'],
      worked:
        '64 ÷ (1.408 + 0.100) = 42.4 seconds. Below it the camera’s read noise is the larger term and a longer exposure buys more than the square root; above it the sky is, and the square-root law takes over. A 10 second exposure of the faint star was well inside the read-limited regime; a 300 second one is well outside it.',
      feedback: {
        close:
          'Close. Divide the read noise squared by the electrons a second the sky and the dark give a pixel together.',
        'wrong-order-of-magnitude': 'Tens of seconds: 64 divided by about 1.5.',
        off: '8² ÷ (1.41 + 0.10).',
      },
      tool: SNR({ mag: 19, exposure: 10, radius: 3, sky: 0 }),
    },
  ],
};
