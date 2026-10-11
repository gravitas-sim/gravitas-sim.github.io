// =============================================================================
// The Beat of a Star, deeper (Prompt 96)
// -----------------------------------------------------------------------------
// The same instrument. Quantitative: the width of a search peak from the length
// of the run, the phase a two-percent error piles up, and the alias periods by
// hand. Advanced: the search peak against the refined period as a share of the
// peak's width, and the bootstrap error against the published period. Every
// expected value is recomputed in tests/variableInvestigations.test.js.
// =============================================================================

const FOLD = (values = {}) => ({ id: 'variable-fold', values });

export default {
  id: 'the-beat-of-a-star',
  steps: [
    {
      sid: 'the-width-from-the-run',
      after: 'the-first-period',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The width from the length of the run',
      body: `The width of a period-search peak is about P² ÷ T, where P is the
             period and T the length of the run. SU Draconis’s run holds 39.4
             cycles of 0.66041 days (the instrument lists both), so
             T = 39.4 × 0.66041 days. Work out P² ÷ T and compare it with the width
             you read.`,
      prompt: 'P² ÷ T for SU Draconis, in days',
      unit: 'd',
      answer: 0.0168,
      tolerance: 0.0008,
      hints: ['T = 39.4 × 0.66041 = 26.0 days. P² = 0.436 days².'],
      worked:
        'T = 26.02 days and P² = 0.4361 days², so P² ÷ T = 0.0168 days, against 0.0167 read from the search. The width is set by how long you watch, not by the star: double the run and the peak is half as wide.',
      feedback: {
        close: 'Close. Check T = cycles × period, then square the period.',
        'wrong-order-of-magnitude':
          'A power of ten out: P² is 0.44 days², and T is 26 days, so the ratio is a few hundredths.',
        off: '(0.66041)² ÷ (39.4 × 0.66041), which is 0.66041 ÷ 39.4.',
      },
      tool: FOLD({ star: 0, view: 1, multiple: 1, offset: 0 }),
    },
    {
      sid: 'the-drift-by-hand',
      after: 'a-slightly-wrong-period',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'How far out of step',
      body: `A fold period that is 2 percent too long is wrong by 0.02 of a
             cycle every cycle. Over the 39.4 cycles of the run those errors
             add up. Give the total drift of the last cycle against the first,
             in cycles.`,
      prompt: 'Drift over the whole run, in cycles',
      unit: 'cycles',
      answer: 0.77,
      tolerance: 0.04,
      hints: [
        'Cycles in the run times the share of a cycle lost per cycle: 39.4 × 0.02. Strictly the fold period is 1.02 times too long, which changes the third figure.',
      ],
      worked:
        '39.4 cycles × 0.02 is 0.79 cycles, or 0.77 with the fold period (1.02 P) used exactly. Either way the end of the run is out of step by most of a cycle, which is why the folded points spread into a band. A drift of a tenth of a cycle would still look like a curve; this is why the error on the period must be well below 1 ÷ 39.4, 2.5 percent.',
      feedback: {
        close: 'Close. Multiply the cycles by the error per cycle.',
        'wrong-order-of-magnitude':
          'A power of ten out: 39 cycles at 0.02 each is under one cycle.',
        off: '39.4 × 0.02, then allow for the fold period being 1.02 P, not P.',
      },
      tool: FOLD({ star: 0, view: 2, multiple: 1, offset: 2 }),
    },
    {
      sid: 'the-alias-by-hand',
      after: 'the-false-periods',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'An alias by hand',
      body: `Take the true frequency, 1 ÷ 0.66041 days, and subtract one cycle
             per day, the sampling frequency of a once-a-night observer. The
             period of what is left is the longer alias. Compare it with the
             instrument’s 1.945 days.`,
      prompt: 'The longer alias period, in days',
      unit: 'd',
      answer: 1.945,
      tolerance: 0.01,
      hints: ['1 ÷ 0.66041 = 1.5142 per day. Subtract 1, then invert.'],
      worked:
        '1.5142 − 1 = 0.5142 per day, and 1 ÷ 0.5142 = 1.945 days. Add one cycle per day instead and you get 2.5142 per day, or 0.3977 days. A true frequency f is mistaken for |f − n| for every whole n, so each star has infinitely many aliases and the nightly observer sees the strongest few.',
      feedback: {
        close: 'Close. Work in frequency, subtract 1 per day, then invert.',
        'wrong-order-of-magnitude':
          'A power of ten out: subtract in frequency (per day), not in days.',
        off: '1 ÷ (1 ÷ 0.66041 − 1).',
      },
      tool: FOLD({ star: 0, view: 1, multiple: 1, offset: 0 }),
    },
    {
      sid: 'the-honest-error',
      after: 'a-second-star',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'The peak and the refined period',
      body: `For Eta Aquilae the highest search peak is at 7.502 days, and the
             refined period is 7.226 days. Their difference, divided by the
             peak’s width of 2.12 days, tells how much of the peak’s width
             the refinement moved the answer.`,
      prompt: 'The shift as a fraction of the peak’s width',
      unit: '',
      answer: 0.13,
      tolerance: 0.01,
      hints: ['(7.502 − 7.226) ÷ 2.12.'],
      worked:
        '0.276 ÷ 2.12 = 0.13. The refinement moved the answer by an eighth of the width: well inside the peak, so it is a refinement and not a different answer. Notice the shift (0.28 days) is nine times the bootstrap error (0.030 days): the bootstrap measures how the answer wobbles with the noise, not how well the method places the period.',
      feedback: {
        close:
          'Close. Subtract the two periods first, then divide by the width.',
        'wrong-order-of-magnitude':
          'A power of ten out: the difference is 0.28 days and the width 2.12.',
        off: '(7.502 − 7.226) ÷ 2.12.',
      },
      tool: FOLD({ star: 1, view: 1, multiple: 1, offset: 0 }),
    },
    {
      sid: 'the-sigma-count',
      after: 'why-the-error-is-bigger',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'How many sigma from the catalogue',
      body: `The General Catalogue of Variable Stars gives Eta Aquilae’s period
             as 7.1766 days, from decades of observation. The run measured
             7.226 ± 0.030 days. Express the difference in units of the
             bootstrap error.`,
      prompt: 'The difference in bootstrap errors',
      unit: 'σ',
      answer: 1.7,
      tolerance: 0.15,
      hints: ['(7.226 − 7.1766) ÷ 0.030.'],
      worked:
        '0.0498 ÷ 0.030 = 1.7. A 1.7σ difference is ordinary, but the bootstrap treats the points as independent and a smooth light curve’s neighbours are not, so its error is a floor and the true uncertainty is larger. The honest statement is that the run agrees with the catalogue and could not have done better with 3.7 cycles.',
      feedback: {
        close: 'Close. Divide the difference by 0.030, not by the period.',
        'wrong-order-of-magnitude':
          'A power of ten out: the difference is 0.05 days and σ is 0.03.',
        off: '(7.226 − 7.1766) ÷ 0.030.',
      },
      tool: FOLD({ star: 1, view: 1, multiple: 1, offset: 0 }),
    },
  ],
};
