// =============================================================================
// Where Galaxies Live, deeper (Prompt 91)
// -----------------------------------------------------------------------------
// The same instrument. Quantitative: the ratio of the two shell densities, and the
// volume of a shell of the strip. Advanced: how much brighter a galaxy at 300
// megaparsecs must be to make the same flux cut as one at 100, in luminosity and in magnitudes.
// Every expected value is recomputed in tests/cosmologyInvestigations.test.js.
// =============================================================================

const WEDGE = (values = {}) => ({ id: 'redshift-wedge', values });

export default {
  id: 'where-galaxies-live',
  steps: [
    {
      sid: 'the-density-ratio',
      after: 'the-thinning',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The ratio of the densities',
      body: `Divide the density of the near shell by that of the far one, as read: 15,800 and 4,860.`,
      prompt: 'The near density over the far density',
      unit: '',
      answer: 3.26,
      tolerance: 0.05,
      hints: ['15,800 ÷ 4,860.'],
      worked:
        '15,800 ÷ 4,860 = 3.26. The far shell holds 3.3 times fewer galaxies per volume, and the volume it surveys is larger, so it holds more in all: 217 against 92.',
      feedback: {
        close: 'Close. Near over far, not far over near.',
        'wrong-order-of-magnitude':
          'A power of ten out: the two densities differ by a small factor.',
        off: 'near ÷ far.',
      },
      tool: WEDGE({ zmax: 0.12, om: 0.3, view: 1 }),
    },
    {
      sid: 'the-volume-of-a-shell',
      after: 'the-thinning',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The volume of a shell',
      body: `The strip covers a solid angle of 120° × 0.5°, which is 0.01828 steradian. The volume between two distances r<sub>1</sub> and r<sub>2</sub> is (solid angle ÷ 3)(r<sub>2</sub>³ − r<sub>1</sub>³). Find the volume of the shell from 100 to 125 megaparsecs.`,
      prompt: 'The volume of the shell, in cubic megaparsecs',
      unit: '',
      answer: 5807,
      tolerance: 40,
      hints: ['0.01828 ÷ 3 = 0.006093, and 125³ − 100³ = 953,125.'],
      worked:
        '0.006093 × 953,125 = 5,807 cubic megaparsecs. The shell holds 92 galaxies, which is 92 ÷ 5,807 = 0.01584 per cubic megaparsec, or 15,840 per million, which the instrument shows to three figures as 15,800.',
      feedback: {
        close:
          'Close. Cube both distances, subtract, and multiply by a third of the solid angle.',
        'wrong-order-of-magnitude':
          'A power of ten out: the cubes are of order a million, the solid angle’s third of order a hundredth.',
        off: '(0.01828 ÷ 3)(125³ − 100³).',
      },
      tool: WEDGE({ zmax: 0.12, om: 0.3, view: 1 }),
    },
    {
      sid: 'how-much-brighter',
      after: 'why-it-thins',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'How much brighter',
      body: `A flux limit means a galaxy can be seen only out to a distance that grows as the square root of its luminosity. A galaxy that just makes the cut at 100 megaparsecs is out of reach at 300 unless it is brighter. How many times more luminous must it be?`,
      prompt:
        'The luminosity factor needed to reach 300 megaparsecs instead of 100',
      unit: '',
      answer: 9,
      tolerance: 0.2,
      hints: [
        'The distance is three times as far, and the flux falls as the distance squared.',
      ],
      worked:
        'The distance is 3 times as far, the flux falls as 3² = 9, so the galaxy must be 9 times as luminous. At 300 megaparsecs the survey sees only galaxies 9 times brighter than the faintest it sees at 100, and there are far fewer of those: that is the whole thinning.',
      feedback: {
        close: 'Close. The flux falls as the square of the distance ratio.',
        'wrong-order-of-magnitude':
          'A power of ten out: the factor is a small whole number.',
        off: '(300 ÷ 100)².',
      },
      tool: WEDGE({ zmax: 0.12, om: 0.3, view: 1 }),
    },
    {
      sid: 'that-in-magnitudes',
      after: 'why-it-thins',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'That in magnitudes',
      body: `A luminosity factor L is 2.5 log<sub>10</sub>(L) magnitudes. Turn the factor of the last step into magnitudes.`,
      prompt: 'The same factor, in magnitudes',
      unit: 'mag',
      answer: 2.39,
      tolerance: 0.05,
      hints: ['2.5 × log₁₀(9).'],
      worked:
        '2.5 × 0.9542 = 2.39 magnitudes. A survey with a magnitude limit loses 2.4 magnitudes of depth in the luminosity function between 100 and 300 megaparsecs, even though both shells are the same universe.',
      feedback: {
        close: 'Close. 2.5 times log₁₀ of the factor.',
        'wrong-order-of-magnitude':
          'A power of ten out: a few magnitudes at most.',
        off: '2.5 × log₁₀(9).',
      },
      tool: WEDGE({ zmax: 0.12, om: 0.3, view: 1 }),
    },
  ],
};
