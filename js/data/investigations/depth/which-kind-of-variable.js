// =============================================================================
// Which Kind of Variable, deeper (Prompt 96)
// -----------------------------------------------------------------------------
// The same instrument. Quantitative: the accuracy from the table by hand, and
// the accuracy for the four kinds that are not eclipsing binaries. Advanced: the
// accuracy a different mix of kinds would give from the same classifier. Every
// expected value is recomputed in tests/variableInvestigations.test.js.
// =============================================================================

const CLASS = (values = {}) => ({ id: 'variable-class', values });

export default {
  id: 'which-kind-of-variable',
  steps: [
    {
      sid: 'accuracy-from-the-table',
      after: 'read-the-table',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The accuracy from the table',
      body: `With the period only, the diagonal of the table (stars called what
             they truly are) is 23 RRab, 24 RRc, 22 Cepheids, 24 delta Scuti and
             7 eclipsing binaries, out of 120 stars. Work out the accuracy and
             compare it with the instrument’s.`,
      prompt: 'The accuracy, in percent',
      unit: '%',
      answer: 83.3,
      tolerance: 0.3,
      hints: ['23 + 24 + 22 + 24 + 7 = 100.'],
      worked:
        '100 ÷ 120 = 83.3 percent, the instrument’s figure. The off-diagonal 20 stars are the errors: 1 RRab, 2 Cepheids and 17 eclipsing binaries.',
      feedback: {
        close: 'Close. Add the five diagonal counts and divide by 120.',
        'wrong-order-of-magnitude':
          'A power of ten out: the answer is a percentage between 0 and 100.',
        off: '(23 + 24 + 22 + 24 + 7) ÷ 120 × 100.',
      },
      tool: CLASS({ features: 0, view: 0 }),
    },
    {
      sid: 'the-four-easy-kinds',
      after: 'why-the-eclipsers-are-lost',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'Leaving out the binaries',
      body: `Of the 96 stars that are not eclipsing binaries, the period alone
             classifies 23 + 24 + 22 + 24 correctly. Give the accuracy on those
             four kinds.`,
      prompt: 'The accuracy on the four pulsator kinds, in percent',
      unit: '%',
      answer: 96.9,
      tolerance: 0.3,
      hints: ['93 ÷ 96.'],
      worked:
        '93 ÷ 96 = 96.9 percent. The pulsators are well separated by period; the binaries are what pulls the overall figure to 83. A classifier is as good as its worst class, and the overall number says nothing of which one that is.',
      feedback: {
        close: 'Close. Add 23, 24, 22 and 24, then divide by 96.',
        'wrong-order-of-magnitude':
          'A power of ten out: the answer is a percentage between 0 and 100.',
        off: '(23 + 24 + 22 + 24) ÷ 96 × 100.',
      },
      tool: CLASS({ features: 0, view: 0 }),
    },
    {
      sid: 'a-skewed-sky',
      after: 'what-a-single-number-hides',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'The same classifier on a different mix',
      body: `Suppose a survey held ten times as many eclipsing binaries as each of
             the four pulsator kinds (the weights are 1, 1, 1, 1 and 10), and that
             each kind is found at the same rate as in this sample with the period
             only: 23/24, 24/24, 22/24, 24/24 and 7/24. The accuracy is each
             kind’s rate weighted by its share. Work it out.`,
      prompt: 'The weighted accuracy, in percent',
      unit: '%',
      answer: 48.5,
      tolerance: 1,
      hints: ['(0.958 + 1 + 0.917 + 1 + 10 × 0.292) ÷ 14.'],
      worked:
        '(0.958 + 1.000 + 0.917 + 1.000 + 2.917) ÷ 14 = 0.485, or 48.5 percent, from the same classifier that scored 83.3 on the balanced sample. The classifier did not change; the mix did. This is the base-rate effect, and why a classifier’s quoted accuracy transfers to a survey only if the survey’s mix is like the training sample’s.',
      feedback: {
        close:
          'Close. Weight each rate, add, then divide by the total weight, 14.',
        'wrong-order-of-magnitude':
          'A power of ten out: the answer is a percentage between 0 and 100.',
        off: '(23/24 + 1 + 22/24 + 1 + 10 × 7/24) ÷ 14 × 100.',
      },
      tool: CLASS({ features: 0, view: 0 }),
    },
  ],
};
