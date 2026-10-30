// =============================================================================
// Which Kind of Variable, deeper (Prompt 96)
// -----------------------------------------------------------------------------
// The same instrument. Quantitative: the accuracy from the table by hand, and
// the accuracy for the four kinds that are not eclipsing binaries. Advanced: the
// accuracy a different mix of kinds would give from the same classifier. Every
// expected value is recomputed in tests/variableInvestigations.test.js.
// =============================================================================

const CLASS = (values = {}) => ({ id: 'variable-class', values });
const AMBIGUITY = (values = {}) => ({ id: 'variable-ambiguity', values });
const FEATURES = (values = {}) => ({ id: 'variable-features', values });

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
    {
      sid: 'features-with-their-errors',
      after: 'the-shape',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The shape number and its error',
      body: `The classifier above reads R21, the ratio of the second harmonic of the light curve to the first, for
             synthetic stars. A real light curve gives it with an error. The panel holds the TESS light curve of
             SU Draconis, an RR Lyrae star, folded on its period, with the three-harmonic fit; read <strong>R21</strong>
             and its error for the whole run.`,
      prompt: 'R21 of SU Draconis',
      unit: '',
      answer: 0.539,
      tolerance: 0.01,
      hints: [
        'The R21 row gives the value and, after the plus-minus sign, its error.',
      ],
      worked:
        'R21 = 0.539 ± 0.007, from 39 cycles. A sawtooth RR Lyrae curve has a large second harmonic, and 0.54 is the value the exercise’s RRab template takes; the error is the first-order propagation of the fit’s covariance, and it assumes the points are independent.',
      feedback: {
        close:
          'Close. Read the R21 row with the star on SU Draconis and the whole run.',
        'wrong-order-of-magnitude':
          'R21 is a ratio of amplitudes, between 0 and about 1.',
        off: 'Set the star to SU Draconis and the days to 28, and read R21.',
      },
      tool: FEATURES({ star: 0, days: 28 }),
    },
    {
      sid: 'a-run-too-short',
      after: 'features-with-their-errors',
      depth: 'quantitative',
      type: 'question',
      kind: 'choice',
      title: 'A run too short for a shape',
      body: `Switch the star to <strong>Eta Aquilae</strong>, a Cepheid, and use only the first <strong>6 days</strong>
             of its run. The period is 7.2 days. Read the <em>Shape numbers</em> row.`,
      prompt: 'Why does the panel withdraw the shape numbers?',
      options: [
        'The run holds fewer than three cycles, so the harmonics are not constrained: a fit would still return numbers, but they would describe the noise and the gaps',
        'The star is not a Cepheid',
        'The light curve is too faint to measure',
        'R21 is only defined for RR Lyrae stars',
      ],
      answer: 0,
      hints: [
        'Look at the cycles row: how much of one cycle does the run cover?',
      ],
      worked:
        'The cycles row reads 0.83: six days against a 7.2-day period. Below three cycles the panel gives the reason and no numbers; with the whole run the same star returns R21 and R31 with their errors.',
      because:
        'Six days is 0.83 of a cycle. Fitting three harmonics to less than a cycle would return a curve and numbers, but a different arrangement of the same noise would return different ones. The panel refuses below three cycles, or when the phases leave a gap of more than a third of a cycle, and says why. With the whole run, 3.7 cycles, the numbers return with their errors.',
      misconceptions: [
        {
          id: 'only-rrl',
          option: 3,
          say: 'R21 is defined for any periodic curve; it is what separates the kinds that is different.',
        },
      ],
      tool: FEATURES({ star: 1, days: 6 }),
    },
    {
      sid: 'when-not-to-say',
      after: 'what-a-single-number-hides',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'When not to say',
      body: `A classifier that must name every star is wrong on the ones it cannot tell apart. This panel gives a
             star a class only if at least <strong>4 of its 5 nearest neighbours</strong> agree, and leaves the others
             open. It uses the period and the amplitude. Read how many of the 120 stars are left open.`,
      prompt: 'Stars left open',
      unit: '',
      answer: 11,
      tolerance: 0.5,
      hints: [
        'The Stars left open row; the preset is period and amplitude, 4 of 5.',
      ],
      worked:
        '11 of 120 are left open, and the 109 that are called are right 94.5 percent of the time, against 90.8 percent if every star had to be called. Those left open are mostly eclipsing binaries (6) and delta Scuti stars (3): the kinds the period and the amplitude run together. Asking for 5 of 5 leaves 37 open.',
      feedback: {
        close:
          'Close. Read the row for stars left open with period and amplitude, 4 of 5.',
        'wrong-order-of-magnitude':
          'The number of stars left open is a count under 120.',
        off: 'Use period and amplitude, 4 neighbours of 5, and read the row.',
      },
      tool: AMBIGUITY({ features: 1, votes: 4 }),
    },
  ],
};
