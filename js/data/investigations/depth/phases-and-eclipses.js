// =============================================================================
// Phases and Eclipses, deeper (Prompt 89)
// -----------------------------------------------------------------------------
// Quantitative: the eclipse year from the regression of the nodes. Advanced:
// the saros as a coincidence of two kinds of month.
// =============================================================================

export default {
  id: 'phases-and-eclipses',
  steps: [
    {
      sid: 'eclipse-year',
      after: 'why-not-every-month',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The eclipse year',
      body: `The line of nodes turns westward, once round in 18.6 years
             (6,798.4 days), so the Sun meets a node a little sooner than once
             a year. The interval between returns, the eclipse year E, satisfies
             1/E = 1/365.2422 + 1/6798.4 per day.`,
      prompt: 'Half an eclipse year, the time between eclipse seasons, in days',
      unit: 'd',
      answer: 173.3,
      tolerance: 0.3,
      hints: ['Add the two rates, invert, and halve the result.'],
      worked:
        'E = 346.62 days, so half is 173.3 days: the eclipse seasons come about every 173 days, 4 days sooner each half year than the calendar.',
      feedback: {
        close: 'Close. Add the reciprocals, invert, then halve.',
        'wrong-order-of-magnitude': 'It is about half a year in days.',
        off: 'E = 1 ÷ (1/365.2422 + 1/6798.4); the seasons are E ÷ 2 apart.',
      },
      tool: { id: 'sky-eclipses', values: { month: 0 } },
    },
    {
      sid: 'saros',
      after: 'eclipse-year',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'A coincidence of months',
      body: `A synodic month, new Moon to new Moon, is 29.530589&nbsp;days. A
             draconic month, node to node, is 27.212221&nbsp;days. After 223
             synodic months the Moon has also completed almost exactly 242
             draconic months: the saros, after which an eclipse repeats.`,
      prompt: 'By how many days do 223 synodic and 242 draconic months differ?',
      unit: 'd',
      answer: 0.04,
      tolerance: 0.02,
      hints: [
        'Multiply each month by its count and subtract.',
        'Both come to about 6,585 days.',
      ],
      worked:
        '223 × 29.530589 = 6,585.321 d; 242 × 27.212221 = 6,585.357 d: a difference of 0.036 d, under an hour.',
      feedback: {
        close: 'Close. Compute both totals and subtract.',
        'wrong-order-of-magnitude': 'The two totals agree to within an hour.',
        off: 'Difference = 242 × 27.212221 − 223 × 29.530589.',
      },
      tool: { id: 'sky-eclipses', values: { month: 0 } },
    },
  ],
};
