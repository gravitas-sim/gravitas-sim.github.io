// =============================================================================
// Who Gets Counted, deeper (Prompt 93)
// -----------------------------------------------------------------------------
// The same instrument. Quantitative: the distance a star can be seen to, by
// hand, and how the volume grows with the limit. Advanced: the same drift of
// brightness with distance in a real Gaia catalogue. Every expected value is
// recomputed (tools/authoring/surveyModels.mjs, tests/surveyInvestigations.test.js).
// =============================================================================

const SC = (values = {}) => ({ id: 'survey-counts', values });

export default {
  id: 'who-gets-counted',
  steps: [
    {
      sid: 'limit-distance-by-hand',
      after: 'how-far-can-it-see',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The distance by hand',
      body: `A star of absolute magnitude M is at apparent magnitude m at
             a distance d, where m − M = 5 log<sub>10</sub>(d ÷ 10 pc). The
             limit is reached when m equals it. Take the Sun-like star
             (M = 4.74) and the limit 14.`,
      prompt: 'The distance at which it reaches the limit',
      unit: 'pc',
      answer: 711,
      tolerance: 15,
      hints: [
        'Solve for d: d = 10 pc × 10 raised to (m − M) ÷ 5, with m − M = 9.26.',
      ],
      worked:
        'm − M = 14 − 4.74 = 9.26, so log₁₀(d ÷ 10) = 9.26 ÷ 5 = 1.852 and d = 10 × 10^1.852 = 711 pc. The instrument lists the same number.',
      feedback: {
        close:
          'Close. Check that you divided m − M by 5 before raising 10 to it.',
        'wrong-order-of-magnitude':
          'A power of ten out. Ten parsecs is the distance at which m equals M; this star is dimmed by 9 magnitudes.',
        off: 'd = 10 pc × 10^((m − M) ÷ 5), with m − M = 14 − 4.74.',
      },
      tool: SC({ limit: 14, view: 0 }),
    },
    {
      sid: 'volume-per-magnitude',
      after: 'limit-distance-by-hand',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'What one magnitude buys',
      body: `Each magnitude of depth lets a star of a given brightness be
             counted at a distance 10<sup>0.2</sup> (1.585) times larger. Stars
             are spread evenly, so the number inside grows as the
             <em>cube</em> of the distance.`,
      prompt: 'By what factor does the volume grow for one more magnitude?',
      unit: '×',
      answer: 3.98,
      tolerance: 0.1,
      hints: ['Cube 1.585, or write it as 10 raised to 0.6.'],
      worked:
        '1.585³ = 3.98: about four times the stars of any given brightness for each magnitude of depth. That is why a deeper survey is so much more expensive than it looks, and why the count keeps rising until the cone, or the population, runs out.',
      feedback: {
        close: 'Close. The volume goes as the distance cubed.',
        off: 'Volume factor = (10^0.2)³ = 10^0.6.',
      },
      tool: SC({ limit: 16, view: 1 }),
    },
    {
      sid: 'real-drift',
      after: 'the-average-star',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'The same drift in real stars',
      body: `The solar-neighbourhood pack (1,570 Gaia DR3 stars with radial
             velocities, a real sample limited by what Gaia's spectrometer can
             measure, about G = 14 to 15) lets you ask the same question of
             data. Taking each star's absolute magnitude from its parallax,
             the mean M<sub>G</sub> is <strong>8.80</strong> for the 485 stars
             closer than 100&nbsp;pc and <strong>4.23</strong> for the 686
             stars from 500 to 1,000&nbsp;pc. (Parallaxes are used as
             given, with no zero-point correction.)`,
      prompt:
        'How much brighter, on average, are the far stars than the near ones?',
      unit: 'mag',
      answer: 4.56,
      tolerance: 0.1,
      hints: ['Subtract the far mean from the near mean.'],
      worked:
        '8.80 − 4.23 = 4.56 magnitudes, a factor of about 67 in luminosity. The real sample drifts as the synthetic one does, and for the same reason: a flux limit admits only the bright stars from far away. Nothing about the stars changed with distance; the selection did.',
      feedback: {
        close: 'Close. Near mean minus far mean, in magnitudes.',
        off: 'Difference of the two means: 8.80 and 4.23.',
      },
      tool: SC({ limit: 16, view: 0 }),
    },
    {
      sid: 'what-the-real-sample-cannot-say',
      after: 'real-drift',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'What the real sample cannot say',
      body: `The Gaia sample is a subset: its nearer stars are one in
             273 of those that pass the cuts, its far ones are sampled more
             densely, and it keeps only stars with a radial velocity. In the
             synthetic survey we knew every star that was missed.`,
      prompt:
        'What can the real sample not tell you that the synthetic one does?',
      options: [
        'How many stars of each brightness were missed, because the true population is not known',
        'The mean brightness of the stars it does contain',
        'The distance of its stars',
        'Whether brighter stars are rarer',
      ],
      answer: 0,
      hints: ['Which numbers needed us to know every star in the cone?'],
      because:
        'The missed stars. With a real catalogue the denominator is unknown, so a correction needs a model of the selection (its limit and completeness) and a stated assumption about what is there. That is the work of the third investigation, and the reason the synthetic surveys exist: to test the correction where the answer is known.',
      tool: SC({ limit: 16, view: 0 }),
    },
  ],
};
