// =============================================================================
// The Completeness Curve, deeper (Prompt 93)
// -----------------------------------------------------------------------------
// The same instrument. Quantitative: the weight of one counted star and the
// Poisson error, by hand. Advanced, the statistics of surveys for an upper-level
// course: the Euclidean count slope, a bootstrap, and the completeness of a
// real catalogue. Every expected value is recomputed
// (tools/authoring/surveyModels.mjs and tests/surveyInvestigations.test.js).
// =============================================================================

const CC = (values = {}) => ({ id: 'completeness-lf', values });
const SHARP = { limit: 20, m50: 20, width: 0.3, view: 0 };

export default {
  id: 'the-completeness-curve',
  steps: [
    {
      sid: 'weight-by-hand',
      after: 'why-raw-is-low',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The weight of one star',
      body: `Take a counted star of absolute magnitude 11 in a survey with a hard
             limit of 20, in a cone 1,000&nbsp;pc deep. It reaches the limit at
             d = 10 pc × 10<sup>(20 − 11 + 5) ÷ 5</sup> = 631&nbsp;pc. Because the volume of a
             cone goes as the cube of its depth, the star could be counted in
             (631 ÷ 1,000)³ of the cone.`,
      prompt:
        'How many stars of its kind in the cone does this one star stand for?',
      unit: 'stars',
      answer: 3.98,
      tolerance: 0.05,
      hints: [
        'It stands for 1 ÷ the fraction of the cone it could be counted in.',
      ],
      worked:
        '(631 ÷ 1,000)³ = 0.251, and 1 ÷ 0.251 = 3.98. Every counted star of that brightness is weighted by that number, which is the effective-volume method of Schmidt (1968): the “1/V<sub>max</sub>” estimate.',
      feedback: {
        close:
          'Close. Cube the ratio of the distances, then take its reciprocal.',
        off: 'Weight = (1,000 ÷ 631)³.',
      },
      tool: CC(SHARP),
    },
    {
      sid: 'poisson-by-hand',
      after: 'raw-against-truth',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The Poisson error',
      body: `In the bin from M = 10 to 12 the survey counted 498 stars. The
             number of stars counted in a bin varies from survey to survey like
             a Poisson count, with a spread of √N.`,
      prompt: 'The fractional error of the count',
      unit: '%',
      answer: 4.5,
      tolerance: 0.3,
      hints: ['Divide √498 by 498, or take 1 ÷ √498.'],
      worked:
        '√498 = 22.3 and 22.3 ÷ 498 = 4.5 percent. The instrument gives 4.6 percent, a little more, because the weights differ from star to star. Four times the stars would halve it.',
      feedback: {
        close: 'Close. The fractional error is 1 ÷ √N.',
        off: 'Error = √N ÷ N, with N = 498.',
      },
      tool: CC(SHARP),
    },
    {
      sid: 'euclidean-slope',
      after: 'the-catalogue-own-magnitudes',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'The count slope of a uniform field',
      body: `For stars of one brightness, evenly spread, the number
             brighter than magnitude m grows as the cube of the distance they
             can be seen to, and one magnitude is a factor 10<sup>0.2</sup> in
             distance. So log<sub>10</sub> N rises linearly with m.`,
      prompt: 'The slope of log₁₀ N(< m) against m',
      unit: 'per mag',
      answer: 0.6,
      tolerance: 0.02,
      hints: ['N goes as d³ and d goes as 10 raised to 0.2 m.'],
      worked:
        'N ∝ d³ ∝ (10^(0.2 m))³ = 10^(0.6 m), so the slope of log₁₀ N is 0.6. The model’s count of a standard candle in a deep cone comes out at 0.60 (tests/surveyModel.test.js). Anything that bends it, a boundary, dust, a disc or an incomplete sample, shows as a lower slope.',
      feedback: {
        close:
          'Close. Cube the distance factor for one magnitude, then take its log.',
        off: 'Slope = 3 × 0.2.',
      },
      tool: CC(SHARP),
    },
    {
      sid: 'real-completeness',
      after: 'euclidean-slope',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'A real catalogue runs out',
      body: `The NGC 2420 photometry pack (SDSS DR18, real stars within 14
             arcminutes of the cluster) counts stars per magnitude in r:
             312 from 17 to 18, 377, 431 and 519 from 20 to 21, then
             <strong>153</strong> from 21 to 22 and <strong>11</strong> from 22
             to 23. The sky does not run out of faint stars at r = 21.`,
      prompt: 'What do the last two counts show?',
      options: [
        'The survey’s completeness is falling: it is nearly complete to about r = 21 and misses most stars beyond it',
        'There are few stars fainter than r = 21',
        'The cluster ends at r = 21',
        'The counts are random and mean nothing',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'sky-runs-out',
          option: 1,
          say: 'The rise from 312 to 519 is the sky’s: each magnitude has more stars than the one before. A fall after it, from 519 to 153 to 11, is the survey’s. The model’s luminosity function does not stop either.',
        },
      ],
      hints: [
        'What did the counts do before the fall, and what would a complete survey do?',
      ],
      because:
        'The completeness is falling. The counts rose steadily to 519 and then fall by a factor of 3 and a further 14: the sky does not do that, a completeness curve does. This is the same fade the instrument draws, here measured in real stars (the pack is the cluster field, so the rise is not Euclidean).',
      tool: CC(FADE),
    },
    {
      sid: 'what-the-bootstrap-says',
      after: 'real-completeness',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'What a bootstrap can say',
      body: `The analysis lab’s bootstrap resamples the counted stars with
             replacement and recomputes the corrected luminosity function each
             time, giving an interval for each bin. For the faintest bin the
             interval is wide; for the middle bins it is narrow.`,
      prompt: 'What does the bootstrap interval measure?',
      options: [
        'How much the corrected value would change with a different draw of stars from the same survey; it does not include the bias of the selection or of the magnitudes',
        'How far the corrected value is from the truth',
        'The size of the Malmquist bias',
        'Whether the completeness curve is right',
      ],
      answer: 0,
      hints: ['What does it vary, and what does it keep fixed?'],
      because:
        'The sampling spread only. It resamples the stars that were counted and keeps the selection and the magnitudes as given, so a bias in either, like the 60 percent of the catalogue-magnitude correction, is invisible to it. The interval says how well the data constrain the answer, not whether the answer is right.',
      tool: CC(SHARP),
    },
  ],
};
