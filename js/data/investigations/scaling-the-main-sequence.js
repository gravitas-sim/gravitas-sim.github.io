// =============================================================================
// Scaling the Main Sequence
// -----------------------------------------------------------------------------
// Content only, no imports: every step that needs a live number is handed a
// `ctx` by the engine. The card paragraph is written once in summaries.js (and
// summaries.es.js). Every step carries a `sid`, an opaque stable id that student
// progress is keyed by (js/investigations/progressSchema.js): reword a step,
// move it, translate it, never change its sid.
//
// The instrument is the interiors family's "ms-scaling" tool
// (js/interiorsWidgets.js over js/kernels/stellar): the homology exponents for a
// pair of laws, set against the MIST zero-age models of eight masses. The
// numbers a student reads are checked against that model by
// tests/interiorsInvestigations.test.js. MIST stars are models, not stars, and
// the lesson says so.
// =============================================================================

/** Two placeholder stars on the canvas: a display; the instrument is where the numbers are. */
const STARS = {
  spacing: 150,
  fit: true,
  stars: [
    { role: 'low', name: 'A low-mass star', teffK: 5000, lumSun: 0.3 },
    { role: 'high', name: 'A massive star', teffK: 20000, lumSun: 3000 },
  ],
};
const MS = (values = {}) => ({ id: 'ms-scaling', values });
const MASSIVE = { quantity: 0, opacity: 1, energy: 1, idx: 5 };

const SCALING_THE_MAIN_SEQUENCE = {
  id: 'scaling-the-main-sequence',
  thumbnail: 'images/investigations/scaling-the-main-sequence.webp',
  title: 'Scaling the Main Sequence',
  subtitle: 'What a scaling argument predicts, and the MIST models say',
  duration: '30-40 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 18, section: null },
  courseLevel: 'majors',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'logarithms',
  prerequisites: ['inside-a-star'],
  tags: ['stars', 'stellar-evolution'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Say what homology assumes and what it can and cannot predict',
    'Read an exponent from a scaling argument and from a log-log fit to model stars, and compare them',
    'Say which opacity and which energy source set the exponent in which range of mass',
    'Use the residuals to say where a scaling law stops working, and why',
  ],
  steps: [
    {
      sid: 'stars-as-scaled-copies',
      stage: STARS,
      type: 'read',
      title: 'Stars as scaled copies',
      body: `Suppose every main-sequence star is the same shape at a different
             size. Then at the same fractional radius the density scales as
             M ÷ R³, the pressure as M² ÷ R⁴ and, for an ideal gas, the
             temperature as M ÷ R. Add how radiation leaks out (an
             <strong>opacity</strong> κ ∝ ρ<sup>a</sup>T<sup>−b</sup>) and how
             energy is made (a rate ∝ ρ<sup>λ</sup>T<sup>ν</sup>) and the two
             have to agree on the luminosity: that fixes how L and R change with
             M. This is <strong>homology</strong>. It predicts <em>exponents</em>,
             not constants.
             \n\nThe instrument sets the prediction (lines) against the
             zero-age stars of the MIST models (dots, eight masses from 0.2 to
             40 times the Sun). Both are models: one is a scaling argument,
             the other a full stellar-evolution calculation.`,
      tool: MS(MASSIVE),
    },
    {
      sid: 'predict-the-slope',
      stage: STARS,
      type: 'predict',
      reveal: 'the-prediction',
      title: 'Will the models follow the scaling?',
      body: `For stars where electrons scatter the light (opacity independent of
             density and temperature) the scaling says luminosity grows as
             M³. The MIST models between 2 and 40 solar masses are an
             independent check. Do not read the instrument yet.`,
      prompt:
        'Over 2 to 40 solar masses the models will give an exponent&hellip;',
      options: [
        'close to 3, within about ten percent',
        'near 5, much steeper',
        'near 1, much shallower',
        'that is not a power law at all',
      ],
      answer: 0,
      hints: ['A scaling argument is rough, but it is not wildly wrong.'],
      because:
        'Close to 3: the fit over 2 to 40 solar masses gives 3.16, five percent above 3. The scatter of 0.14 dex about the line is the part the scaling does not capture. The next step reads both.',
      tool: MS(MASSIVE),
    },
    {
      sid: 'the-prediction',
      stage: STARS,
      type: 'measure',
      title: 'Massive stars: electron scattering and the CNO cycle',
      body: `The instrument starts on luminosity against mass with electron
             scattering and the CNO cycle. Read the exponent the scaling
             predicts, the exponent fitted to the models from 2 to 40 solar
             masses, and the scatter of those models about the predicted
             exponent (in dex, factors of ten).`,
      fields: [
        { id: 'pred', label: 'Predicted exponent', unit: '', hint: '3' },
        {
          id: 'fit',
          label: 'Fitted exponent, 2 to 40 M☉',
          unit: '',
          hint: '3.16',
        },
        { id: 'rms', label: 'Scatter, 2 to 40 M☉', unit: 'dex', hint: '0.143' },
      ],
      validate: v => {
        if (![v.pred, v.fit, v.rms].every(Number.isFinite)) return null;
        if (
          Math.abs(v.pred - 3) <= 0.01 &&
          Math.abs(v.fit - 3.16) <= 0.03 &&
          Math.abs(v.rms - 0.143) <= 0.01
        ) {
          return {
            level: 'ok',
            message:
              'Predicted 3.00, fitted 3.16, with 0.14 dex of scatter: the models are within a factor of 1.4 of the scaling line over a factor of twenty in mass. For a one-line argument that is a good prediction, and 0.14 dex is the size of what it leaves out.',
          };
        }
        return {
          level: 'error',
          message:
            'Use the first preset (“Luminosity of massive stars”), then read “Exponent the scaling predicts”, “Exponent fitted over 2 to 40 solar masses” and the scatter row for the same range.',
        };
      },
      tool: MS(MASSIVE),
    },
    {
      sid: 'low-mass-stars',
      stage: STARS,
      type: 'measure',
      title: 'Low-mass stars: Kramers opacity and the proton-proton chain',
      body: `Load “Luminosity of low-mass stars”. For stars of about 0.5 to 2
             solar masses the opacity is Kramers’ (it falls with temperature)
             and hydrogen burns by the proton-proton chain. Read the exponent
             the scaling predicts and the exponent fitted to the models from
             0.5 to 2 solar masses.`,
      fields: [
        { id: 'pred', label: 'Predicted exponent', unit: '', hint: '5.46' },
        {
          id: 'fit',
          label: 'Fitted exponent, 0.5 to 2 M☉',
          unit: '',
          hint: '4.43',
        },
      ],
      validate: v => {
        if (![v.pred, v.fit].every(Number.isFinite)) return null;
        if (Math.abs(v.pred - 5.46) <= 0.03 && Math.abs(v.fit - 4.43) <= 0.03) {
          return {
            level: 'ok',
            message:
              'Predicted 5.46, fitted 4.43. The scaling is steeper than the models by about one in the exponent: from 0.5 to 2 solar masses it predicts a factor of about 1,900 in luminosity and the models give about 460. It gets the direction and the rough size, not the number. The low-mass star has a convective envelope, which the scaling does not know about.',
          };
        }
        return {
          level: 'error',
          message:
            'Use the second preset (“Luminosity of low-mass stars”), then read “Exponent the scaling predicts” and “Exponent fitted over 0.5 to 2 solar masses”.',
        };
      },
      tool: MS({ quantity: 0, opacity: 0, energy: 0, idx: 2 }),
    },
    {
      sid: 'the-wrong-law',
      stage: STARS,
      type: 'measure',
      title: 'Use the wrong law on massive stars',
      body: `Go back to luminosity, keep the CNO cycle, and change the opacity
             to <strong>Kramers</strong>. Read the exponent it predicts and the
             scatter of the 2 to 40 solar-mass models about it.`,
      fields: [
        { id: 'pred', label: 'Predicted exponent', unit: '', hint: '5.16' },
        { id: 'rms', label: 'Scatter, 2 to 40 M☉', unit: 'dex', hint: '0.92' },
      ],
      validate: v => {
        if (![v.pred, v.rms].every(Number.isFinite)) return null;
        if (
          Math.abs(v.pred - 5.16) <= 0.03 &&
          Math.abs(v.rms - 0.917) <= 0.03
        ) {
          return {
            level: 'ok',
            message:
              'The scatter is 0.92 dex, six times the electron-scattering value, and the predicted exponent is 5.2 against a fitted 3.2. A wrong physical law gives a large residual, so the residual is how the model is tested.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose luminosity, “Kramers” for the opacity law and the CNO cycle for the energy source, then read the predicted exponent and the scatter for 2 to 40 solar masses.',
        };
      },
      tool: MS({ quantity: 0, opacity: 0, energy: 1, idx: 5 }),
    },
    {
      sid: 'why-no-single-exponent',
      stage: STARS,
      type: 'question',
      kind: 'choice',
      title: 'Why no single exponent',
      body: `The fitted exponent is 4.4 from 0.5 to 2 solar masses and 3.2 from 2
             to 40, and a single line through all eight models leaves residuals
             of up to 0.36 dex.`,
      prompt: 'Which statement best explains it?',
      options: [
        'Low-mass and high-mass stars are made of different materials',
        'Different processes dominate the opacity and the energy source in different mass ranges, so the exponent changes',
        'The MIST models are wrong at one end',
        'Luminosity does not depend on mass',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'different-stuff',
          option: 0,
          say: 'The models all start with the same composition. What changes with mass is the central temperature, which decides which opacity and which reactions dominate.',
        },
      ],
      hints: [
        'Compare the laws that gave small scatter in the two ranges: they are not the same.',
      ],
      because:
        'A hotter center (more mass) shifts the opacity from Kramers toward electron scattering and the energy source from the proton-proton chain toward the CNO cycle, so the exponent falls from about 4.4 toward 3 and below. The scaling holds within a range where one law dominates and fails across the change.',
      tool: MS(MASSIVE),
    },
    {
      sid: 'radius-scaling',
      stage: STARS,
      type: 'measure',
      title: 'The radius is harder',
      body: `Load “Radius of massive stars”. Read the exponent the scaling
             predicts for the radius and the exponent fitted to the 2 to 40
             solar-mass models.`,
      fields: [
        { id: 'pred', label: 'Predicted exponent', unit: '', hint: '0.789' },
        {
          id: 'fit',
          label: 'Fitted exponent, 2 to 40 M☉',
          unit: '',
          hint: '0.546',
        },
      ],
      validate: v => {
        if (![v.pred, v.fit].every(Number.isFinite)) return null;
        if (
          Math.abs(v.pred - 0.789) <= 0.01 &&
          Math.abs(v.fit - 0.546) <= 0.02
        ) {
          return {
            level: 'ok',
            message:
              'Predicted 0.79, fitted 0.55. The radius depends on the energy source’s steepness, which the scaling treats as one power law through a core where the temperature changes by orders of magnitude. The luminosity is the more robust prediction; the radius is the more sensitive one.',
          };
        }
        return {
          level: 'error',
          message:
            'Use the third preset (“Radius of massive stars”), then read the predicted exponent and the exponent fitted over 2 to 40 solar masses.',
        };
      },
      tool: MS({ quantity: 1, opacity: 1, energy: 1, idx: 5 }),
    },
    {
      sid: 'lifetimes',
      stage: STARS,
      type: 'measure',
      title: 'Lifetimes follow',
      body: `A star burns a fixed share of its fuel, so its life is its fuel
             divided by its luminosity: it scales as M ÷ L, one power less than
             the luminosity’s. Load “Lifetimes” and read the exponent the scaling
             predicts and the exponent fitted to the models from 2 to 40 solar
             masses.`,
      fields: [
        { id: 'pred', label: 'Predicted exponent', unit: '', hint: '-2' },
        {
          id: 'fit',
          label: 'Fitted exponent, 2 to 40 M☉',
          unit: '',
          hint: '-1.82',
        },
      ],
      validate: v => {
        if (![v.pred, v.fit].every(Number.isFinite)) return null;
        if (Math.abs(v.pred + 2) <= 0.01 && Math.abs(v.fit + 1.815) <= 0.03) {
          return {
            level: 'ok',
            message:
              'Predicted −2, fitted −1.8. Doubling the mass of a massive star shortens its life by about a factor of 3.5 (the scaling says 4). A 40-solar-mass star lives under five million years, and the Sun’s ten billion years is two thousand times longer.',
          };
        }
        return {
          level: 'error',
          message:
            'Use the fourth preset (“Lifetimes”), then read the predicted exponent and the exponent fitted over 2 to 40 solar masses (both negative).',
        };
      },
      tool: MS({ quantity: 2, opacity: 1, energy: 1, idx: 3 }),
    },
    {
      sid: 'the-suns-clock',
      stage: STARS,
      type: 'measure',
      title: 'The Sun’s clock, two ways',
      body: `Select the 1 solar-mass model. The instrument lists its main-sequence
             life from the MIST calculation and a simple nuclear timescale: 0.7
             percent of the mass turns into energy, a tenth of the star’s mass is
             burned, and the star shines at the model’s luminosity. Read both.`,
      fields: [
        {
          id: 'mist',
          label: 'Main-sequence life (MIST)',
          unit: 'Gyr',
          hint: '9.88',
        },
        { id: 'nuc', label: 'Nuclear timescale', unit: 'Gyr', hint: '13.9' },
      ],
      validate: v => {
        if (![v.mist, v.nuc].every(Number.isFinite)) return null;
        if (Math.abs(v.mist - 9.88) <= 0.15 && Math.abs(v.nuc - 13.9) <= 0.25) {
          return {
            level: 'ok',
            message:
              'MIST gives 9.9 billion years and the estimate 13.9, about 40 percent apart. The estimate uses the zero-age luminosity, which is a quarter below the Sun’s luminosity today, and a fixed tenth of the mass. A rough clock that is right in kind and in order of magnitude is what a scaling argument is for.',
          };
        }
        return {
          level: 'error',
          message:
            'Select the 1 solar-mass zero-age model, then read “Its main-sequence life (MIST)” and “Nuclear timescale”.',
        };
      },
      tool: MS({ quantity: 2, opacity: 1, energy: 1, idx: 2 }),
    },
    {
      sid: 'what-you-worked-out',
      stage: STARS,
      type: 'read',
      title: 'What you worked out',
      body: `If stars are scaled copies, the structure equations plus one
             opacity and one energy source fix exponents: L ∝ M³ for massive
             stars, steeper for low-mass ones, and a life that falls as M ÷ L.
             Against the MIST zero-age models the massive-star luminosity
             exponent is right to five percent with 0.14 dex of scatter; at low
             mass the scaling is a unit too steep; the radius is harder than the
             luminosity. The residuals say where the assumptions break: where
             the opacity and the reactions change with mass, and where
             convection sets the structure. Scaling tells you what to expect;
             the model stars tell you how far to trust it.`,
      tool: MS(MASSIVE),
    },
  ],
};

export default SCALING_THE_MAIN_SEQUENCE;
