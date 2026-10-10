// =============================================================================
// What a Spectrum Is Made Of, deeper (Prompt 83)
// -----------------------------------------------------------------------------
// The same demonstrator. Quantitative adds the Planck ratio that sets how dark
// a thick line gets, the equivalent width, where it changes sign, and the
// Boltzmann factor at the introductory level (a stated model). Advanced shows
// that the width's sign flips while the cloud's own "patch" does not, and sets
// the Boltzmann model against two real stars' Balmer lines. Every expected
// value is recomputed from the kernel and the measurement node
// (tools/authoring/lightModels.mjs).
// =============================================================================

const KF = (values = {}) => ({ id: 'kirchhoff', values });
const SP = (values = {}) => ({ id: 'spectrum-viewer', values });

export default {
  id: 'what-a-spectrum-is-made-of',
  steps: [
    {
      sid: 'planck-floor',
      after: 'what-flipped-it',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'How dark can a line get?',
      body: `A thick cloud takes out all of the source’s light at the center of
             a line, and puts back only its own glow there. So the center of a
             thick line sits at the cloud’s own blackbody brightness, as a
             fraction of the source’s: B(T<sub>c</sub>) ÷ B(T<sub>s</sub>).
             For Planck’s law at wavelength λ this is
             (e<sup>x ÷ T<sub>s</sub></sup> − 1) ÷ (e<sup>x ÷ T<sub>c</sub></sup> − 1),
             where x = hc ÷ (λk) = 21,917&nbsp;K at H-alpha, 6,564.6&nbsp;Å.`,
      prompt:
        'The fraction of the source’s light left at the center of a thick H-alpha line, source 8,000 K, cloud 4,000 K',
      unit: '%',
      answer: 6.07,
      tolerance: 0.15,
      hints: [
        'Work out e<sup>21,917 ÷ 8,000</sup> − 1 and e<sup>21,917 ÷ 4,000</sup> − 1 separately.',
        'Divide the first by the second, then multiply by 100. Check it against the demonstrator’s row for the cloud’s own blackbody.',
      ],
      worked:
        'e^(21,917 ÷ 8,000) − 1 = e^2.740 − 1 = 14.48 and e^(21,917 ÷ 4,000) − 1 = e^5.479 − 1 = 238.9, so the fraction is 14.48 ÷ 238.9 = 0.0607, or 6.07 %. A thick line does not reach zero: it stops at the cloud’s own brightness.',
      feedback: {
        close:
          'Close. The cloud, the cooler one, is in the denominator: it is the larger exponential, so the answer is a small fraction.',
        'wrong-order-of-magnitude':
          'A power of ten out. Compare the two exponentials: one is about 14 and the other about 240.',
        off: 'Fraction = (e^(x ÷ T_s) − 1) ÷ (e^(x ÷ T_c) − 1), with x = 21,917 K, times 100.',
      },
      tool: KF({ mode: 0, Ts: 8000, Tc: 4000, tau: 10, view: 1 }),
    },
    {
      sid: 'equivalent-width',
      after: 'planck-floor',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'How much light the line removes',
      body: `The <strong>equivalent width</strong> of a line is the width of a
             rectangle as tall as the continuum that holds the same area as the
             line: the light the line removes, in Å. The demonstrator measures
             it with the same node as the spectrum viewer. Set a 6,000&nbsp;K
             source seen through a 4,000&nbsp;K cloud with gas 3, zoom on
             H-alpha, and read it.`,
      prompt: 'The equivalent width of H-alpha',
      unit: 'Å',
      answer: 14.2,
      tolerance: 0.5,
      hints: ['It is the row “Equivalent width of H-alpha”.'],
      worked:
        'The node fits the continuum on both sides and sums (1 − flux ÷ continuum) over the line, in Å: 14.16 Å, positive because the line is dark.',
      feedback: {
        close:
          'Close. Check the source is 6,000 K, the cloud 4,000 K and the gas 3.',
        off: 'Read the “Equivalent width of H-alpha” row with the source seen through the cloud.',
      },
      tool: KF({ mode: 0, Ts: 6000, Tc: 4000, tau: 3, view: 1 }),
    },
    {
      sid: 'ew-zero',
      after: 'equivalent-width',
      depth: 'quantitative',
      type: 'question',
      kind: 'choice',
      title: 'Where the width crosses zero',
      body: `Keep the source at 6,000&nbsp;K and the gas at 3, and raise the
             cloud’s temperature in steps from 4,000 to 8,000&nbsp;K, reading
             the equivalent width each time. It falls from 14&nbsp;Å, passes
             through zero and becomes negative (a bright line adds light).`,
      prompt: 'At what cloud temperature is the equivalent width zero?',
      options: [
        'At the source’s own temperature, 6,000 K',
        'At 5,000 K, halfway to the source',
        'At 0 K, where the cloud emits nothing',
        'It never reaches zero while there is gas',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'cold-is-darkest',
          option: 2,
          say: 'A colder cloud makes a deeper line, not a vanishing one. Read the width at 3,000 K and at 6,000 K.',
        },
      ],
      hints: [
        'The width is the light the cloud removes minus the light it adds. When are they equal?',
      ],
      because:
        'At 6,000 K, the source’s temperature. For this model the width is (1 − B(T_c) ÷ B(T_s)) times a quantity that depends only on how much gas there is, so it vanishes when the two blackbodies match and changes sign beyond.',
      tool: KF({ mode: 0, Ts: 6000, Tc: 5000, tau: 3, view: 1 }),
    },
    {
      sid: 'boltzmann-ratio',
      after: 'ew-zero',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'How many atoms can absorb?',
      body: `Balmer lines come from hydrogen atoms in the second level, n = 2.
             The Boltzmann factor says how many are there, against the
             ground state: 4 e<sup>−10.2 eV ÷ kT</sup>, with the 4 counting the
             states of each level. <em>This is a model</em>: it counts only
             excitation, and leaves out ionization, which strips the atoms
             altogether when it is hot. The demonstrator lists it for the
             cloud’s temperature. Read it at 6,000&nbsp;K and at
             10,000&nbsp;K.`,
      prompt:
        'How many times more hydrogen atoms are in n = 2 at 10,000 K than at 6,000 K?',
      unit: '',
      answer: 2673,
      tolerance: 120,
      hints: [
        'Read the row “Hydrogen atoms in n = 2 against n = 1” at each cloud temperature, then divide.',
      ],
      worked:
        '2.89 × 10⁻⁵ at 10,000 K and 1.08 × 10⁻⁸ at 6,000 K: the ratio is about 2,670. A change of temperature by a factor of 1.7 changes the number of absorbing atoms by a factor of thousands.',
      feedback: {
        close:
          'Close. Divide the 10,000 K value by the 6,000 K one, not the other way round.',
        'wrong-order-of-magnitude':
          'A power of ten out. The two readings differ by more than three powers of ten.',
        off: 'Ratio = (n2 ÷ n1 at 10,000 K) ÷ (n2 ÷ n1 at 6,000 K), read from the list.',
      },
      tool: KF({ mode: 1, Tc: 10000, tau: 3, view: 0 }),
    },
    {
      sid: 'same-patch',
      after: 'boltzmann-ratio',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'The part that does not change sign',
      body: `For a cloud in front of a source the equivalent width is
             W<sub>eq</sub> = (1 − B(T<sub>c</sub>) ÷ B(T<sub>s</sub>)) × A,
             where A, in Å, depends only on the gas (its optical depth and
             the width of its lines) and not on either temperature. Use a
             6,000&nbsp;K source and gas 3, and the cloud at 4,000&nbsp;K. Read
             the equivalent width and the brightness ratio from the list.`,
      prompt: 'A, from W<sub>eq</sub> ÷ (1 − the ratio)',
      unit: 'Å',
      answer: 16.8,
      tolerance: 0.4,
      hints: [
        'The ratio row is a percentage: 15.7 % is 0.157 in the formula.',
        'Then check with the cloud at 8,000 K: both the width and the factor 1 − ratio change sign, and A comes out the same.',
      ],
      worked:
        'At 4,000 K: 14.16 ÷ (1 − 0.1575) = 16.8 Å. At 8,000 K: −26.8 ÷ (1 − 2.595) = 16.8 Å. The width changes sign with the temperature; A does not, because it is a property of the gas.',
      feedback: {
        close:
          'Close. Turn the percentage into a fraction before you subtract it from 1.',
        off: 'A = W_eq ÷ (1 − ratio), with the ratio as a fraction.',
      },
      tool: KF({ mode: 0, Ts: 6000, Tc: 4000, tau: 3, view: 1 }),
    },
    {
      sid: 'real-balmer-ratio',
      after: 'same-patch',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'The model against two real stars',
      body: `The A star is near 9,500&nbsp;K and the G star near 5,800&nbsp;K,
             typical of their spectral types. The Boltzmann model of the
             last quantitative step says A stars should have about 2,800 times
             as many atoms in n = 2. In the spectrum viewer, zoom on H-alpha
             and read its equivalent width in each star.`,
      prompt: 'The A star’s H-alpha equivalent width divided by the G star’s',
      unit: '',
      answer: 2.34,
      tolerance: 0.4,
      hints: [
        'Read the “Equivalent width” row for the A star and then for the G star.',
      ],
      worked:
        '7.17 ± 0.21 Å in the A star and 3.07 ± 0.26 Å in the G star: a ratio of 2.3, not 2,800.',
      feedback: {
        close: 'Close. Put the A star’s width on top.',
        off: 'Divide the A star’s H-alpha equivalent width by the G star’s.',
      },
      tool: SP({ src: 0, view: 1, line: 0 }),
    },
    {
      sid: 'model-misses',
      after: 'real-balmer-ratio',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'Why the model overshoots',
      body: `The Boltzmann factor predicts a ratio near 2,800. The stars give 2.3.
             The model is not a mistake; it is incomplete.`,
      prompt: 'Which two things does the Boltzmann factor alone leave out?',
      options: [
        'Ionization, which removes atoms in a hot star, and saturation, which stops a thick line removing more than all the light',
        'The star’s motion, and the telescope’s resolution',
        'The star’s distance, and its mass',
        'Nothing: the data must be wrong',
      ],
      answer: 0,
      hints: [
        'Two of the demonstrator’s own results bear on it: a thick line stops at the cloud’s own brightness, and the Boltzmann row says it leaves ionization out.',
      ],
      because:
        'Ionization and saturation. In a hot star many hydrogen atoms have lost their electron and cannot absorb, which is why real Balmer lines are strongest near 10,000 K and then weaken. And a line cannot remove more than all of the light, so its width grows far more slowly than the number of absorbing atoms. A model that keeps only one effect is useful until you set it against data.',
      tool: SP({ src: 0, view: 0 }),
    },
  ],
};
