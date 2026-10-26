// =============================================================================
// The atmosphere investigations, deeper (Prompt 200)
// -----------------------------------------------------------------------------
// The deeper steps of "Why Venus Is Hot" and "Two Greenhouse Models" and their
// instructor content, in a module of its own (D-R10-81; see
// ../atmosphere-sequence.js). The same instruments. Every expected value is
// recomputed (tests/atmosphereLessons.test.js).
// =============================================================================

const near = (x, target, tolerance) =>
  Number.isFinite(x) && Math.abs(x - target) <= tolerance;

const BAL = (values = {}, hide = []) => ({
  id: 'atmosphere-balance',
  values,
  hide,
});
const GRN = (values = {}, hide = []) => ({
  id: 'atmosphere-greenhouse',
  values,
  hide,
});
const SCL = (values = {}, hide = []) => ({
  id: 'atmosphere-scale',
  values,
  hide,
});

// -----------------------------------------------------------------------------
// Why Venus Is Hot: the deeper steps.
// -----------------------------------------------------------------------------
export const WHY_VENUS_IS_HOT_DEEPER = {
  id: 'why-venus-is-hot',
  steps: [
    {
      sid: 'earth-without-clouds',
      after: 'what-the-gap-says',
      depth: 'quantitative',
      type: 'measure',
      title: 'Earth with no albedo',
      body: `The Bond albedo sets how much sunlight a planet absorbs. Set the planet to
             <strong>Earth</strong>, switch the albedo to <strong>my own</strong> and set it to
             <strong>0</strong>: a planet that absorbs everything. Read the new equilibrium
             temperature and how much warmer it is than with Earth&rsquo;s own albedo, 254 K.`,
      fields: [
        {
          id: 'teq',
          label: 'Earth’s equilibrium temperature with albedo 0',
          unit: 'K',
          hint: '278.3',
        },
        {
          id: 'rise',
          label: 'How much warmer than with its own albedo',
          unit: 'K',
          hint: '24.3',
        },
      ],
      validate: v => {
        if (![v.teq, v.rise].every(Number.isFinite)) return null;
        if (near(v.teq, 278.3, 0.7) && near(v.rise, 24.3, 1)) {
          return {
            level: 'ok',
            message:
              '278.3 K, 24.3 K warmer. The temperature goes as the fourth root of the absorbed sunlight, so removing the 30.6 percent that Earth reflects warms it by less than 10 percent. Even a perfectly absorbing Earth would sit 10 K below its measured 288 K: the albedo cannot replace the greenhouse.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose Earth (1), set “Albedo” to “my own”, set “My Bond albedo” to 0 and read “Equilibrium temperature”.',
        };
      },
      tool: BAL({ body: 1, own: 0, albedo: 0 }),
    },
    {
      sid: 'how-thick-is-venus',
      after: 'grey-depth-for-venus',
      depth: 'advanced',
      type: 'measure',
      title: 'How quickly does the air thin out?',
      body: `In an isothermal atmosphere the pressure falls by the same factor, 1/e or about
             37 percent, over every <strong>scale height</strong>
             <em>H</em> = <em>kT</em>/(<em>&mu;m</em><sub>u</sub><em>g</em>). It is not the thickness
             of the atmosphere: there is no top. Read the scale height of
             <strong>Venus</strong> at its surface temperature, and of <strong>Earth</strong>.`,
      fields: [
        {
          id: 'venus',
          label: 'Venus’s scale height',
          unit: 'km',
          hint: '15.9',
        },
        {
          id: 'earth',
          label: 'Earth’s scale height',
          unit: 'km',
          hint: '8.4',
        },
      ],
      validate: v => {
        if (![v.venus, v.earth].every(Number.isFinite)) return null;
        if (near(v.venus, 15.9, 0.2) && near(v.earth, 8.43, 0.15)) {
          return {
            level: 'ok',
            message:
              '15.9 km for Venus and 8.4 km for Earth. Venus’s air is hotter, which raises H, and heavier (carbon dioxide against nitrogen and oxygen), which lowers it; the net is a scale height almost twice Earth’s. The model assumes one temperature all the way up, which neither atmosphere has.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose Venus (0) with the planet’s own temperature, read “Scale height”, then Earth (1).',
        };
      },
      tool: SCL({ body: 0, own: 1 }),
    },
  ],
};

// -----------------------------------------------------------------------------
// Two Greenhouse Models: the deeper steps.
// -----------------------------------------------------------------------------
export const TWO_GREENHOUSE_MODELS_DEEPER = {
  id: 'two-greenhouse-models',
  steps: [
    {
      sid: 'mars-barely-a-greenhouse',
      after: 'earth-grey',
      depth: 'quantitative',
      type: 'measure',
      title: 'Mars in both models',
      body: `Mars has a thin atmosphere. Set the planet to <strong>Mars</strong> and read the
             emissivity of one layer and the optical depth that give its measured surface
             temperature, 210 K.`,
      fields: [
        { id: 'eps', label: 'Emissivity that gives 210 K', hint: '0.006' },
        { id: 'tau', label: 'Optical depth that gives 210 K', hint: '0.004' },
      ],
      validate: v => {
        if (![v.eps, v.tau].every(Number.isFinite)) return null;
        if (near(v.eps, 0.006, 0.003) && near(v.tau, 0.004, 0.003)) {
          return {
            level: 'ok',
            message:
              'About 0.006 and 0.004: both models need almost no atmosphere, because Mars’s measured surface temperature is within a fraction of a kelvin of its equilibrium temperature. The two numbers are tiny and close, but they are still different quantities. Real Mars has a day and night swing the model leaves out.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose Mars (2) and read “Emissivity of one layer that gives the measured temperature” and “Optical depth that gives the measured temperature”.',
        };
      },
      tool: GRN({ body: 2, tau: 0.004, emissivity: 0.006 }),
    },
    {
      sid: 'one-unit-two-models',
      after: 'mars-barely-a-greenhouse',
      depth: 'quantitative',
      type: 'measure',
      title: 'One unit in each model',
      body: `Set the planet to <strong>Earth</strong>. Give the one-layer model an emissivity of
             <strong>1</strong> (a layer that absorbs all the infrared) and the grey model an
             optical depth of <strong>1</strong>. Read the ground temperature each gives.`,
      fields: [
        {
          id: 'grey',
          label: 'Ground temperature, grey model with optical depth 1',
          unit: 'K',
          hint: '292.2',
        },
        {
          id: 'layer',
          label: 'Ground temperature, one layer with emissivity 1',
          unit: 'K',
          hint: '302.1',
        },
      ],
      validate: v => {
        if (![v.grey, v.layer].every(Number.isFinite)) return null;
        if (near(v.grey, 292.2, 0.7) && near(v.layer, 302.1, 0.7)) {
          return {
            level: 'ok',
            message:
              '292.2 K and 302.1 K. A layer that absorbs everything and a column one optical depth thick are not the same: the grey column lets some of the infrared from the ground escape through its upper layers, and the layer does not. “1” means a different thing in each model.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose Earth (1), set the optical depth to 1 and the emissivity to 1, then read “Ground temperature, grey model” and “Ground temperature, one layer”.',
        };
      },
      tool: GRN({ body: 1, tau: 1, emissivity: 1 }),
    },
    {
      sid: 'limits-of-grey',
      after: 'venus-both-try',
      depth: 'advanced',
      type: 'measure',
      title: 'Where the grey model stops',
      body: `The grey profile is the Eddington solution. A numerically exact grey solution
             exists and the instrument draws it dashed. Look at the top of the atmosphere, at
             optical depth 0, and read how much warmer the Eddington curve is than the exact
             grey one, as a percentage.
             \n\nThat gap is the error of the approximation. A bigger limit is the word
             <em>grey</em>: real opacity depends on wavelength, and sunlight and the planet&rsquo;s
             infrared are absorbed very differently, which this model cannot represent.`,
      fields: [
        {
          id: 'gap',
          label: 'Eddington against exact grey, at the top',
          unit: '%',
          hint: '3.7',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.gap)) return null;
        if (near(v.gap, 3.7, 0.2)) {
          return {
            level: 'ok',
            message:
              'About 3.7 percent warm at the top, and the curves close together with depth. That is the stated error of the Eddington closure and not a quantity to minimise. The larger omission is the one the model is named for: grey opacity, the same at every wavelength.',
          };
        }
        return {
          level: 'error',
          message:
            'Read “Eddington against the exact grey solution, at the top” in the instrument.',
        };
      },
      tool: GRN({ body: 1, tau: 5, emissivity: 0.79 }),
    },
  ],
};

// -----------------------------------------------------------------------------
// The instructor's side of both lessons.
// -----------------------------------------------------------------------------
export const INSTRUCTOR = {
  content: {
    'why-venus-is-hot': {
      topic:
        'The equilibrium temperature of a planet, the gap between it and the measured surface temperature, and what closes the gap: the one-layer and the grey greenhouse models, with Venus as the case that a single layer cannot reach.',
      difficulty: 'Introductory (a fourth root and a ratio)',
      placement:
        'In a survey course after the unit on the terrestrial planets; it needs no earlier investigation. It supports OpenStax Astronomy 2e chapter 10 (section 10.3 on the atmosphere of Venus), and the chapter citation is the author’s and has not been checked against the book.',
      overview:
        'Students read the equilibrium temperature of Earth (254 K) and see the 34 K gap to its surface, predict and read Venus (229 K, cooler than Earth because it reflects 76 percent of its sunlight, against a surface at 737 K), read why that gap is a greenhouse effect for Venus and Earth but not for Jupiter, find that one absorbing layer cannot give Venus more than 272 K, and fit one optical depth, about 142, for the grey model. The deeper steps vary the albedo and compare the scale heights of Venus and Earth.',
      priorKnowledge: [
        'Planets reflect part of the sunlight and absorb the rest',
        'Temperature and radiated power are linked (hotter radiates more)',
        'Venus and Earth are close in size and different in atmosphere',
      ],
      keyConcepts: [
        {
          heading: 'Equilibrium temperature is not a surface temperature',
          body: 'It is the temperature of a black body that radiates the sunlight the planet absorbs. Venus’s is 229 K, cooler than Earth’s 254 K, because its albedo is 0.76.',
        },
        {
          heading: 'The gap is the finding',
          body: 'Measured minus equilibrium is 34 K for Earth, 508 K for Venus and 0.2 K for Mars. For a giant planet it is not a greenhouse gap: there is no surface and internal heat is left out.',
        },
        {
          heading: 'A model can refuse',
          body: 'One isothermal layer cannot warm the ground above 2^(1/4) times the equilibrium temperature, 272 K for Venus. The instrument reports no solution; the grey model reaches 737 K with an optical depth of about 142.',
        },
      ],
      features: [
        {
          name: 'Atmosphere instruments (atmosphere family)',
          text: 'The energy balance, the two greenhouse models side by side with the profile drawn by the plot component, and the scale height. Every readout names its model and what it leaves out.',
        },
        {
          name: 'Depth',
          text: 'Quantitative: Earth with no albedo. Advanced: the scale heights of Venus and Earth.',
        },
        {
          name: 'Predictions before answers',
          text: 'The Venus prediction is recorded before the instrument reveals the equilibrium temperature, and is never marked wrong in the report.',
        },
      ],
      misconceptions: [
        {
          claim: 'A planet nearer the Sun is hotter.',
          response:
            'Not by distance alone: a planet is heated by the sunlight it absorbs. Venus absorbs a quarter of the sunlight that reaches it and has a lower equilibrium temperature than Earth.',
        },
        {
          claim:
            'The fitted optical depth or emissivity measures the atmosphere.',
          response:
            'Each is one number fitted to one surface temperature in a model that leaves out convection, clouds and the wavelength dependence of opacity. Two models give two numbers for the same planet.',
        },
        {
          claim:
            'Every gap between measured and equilibrium temperature is a greenhouse effect.',
          response:
            'Jupiter’s 55 K is the 1 bar level against a model with no internal heat, and Jupiter has no surface. The instrument says so.',
        },
        {
          claim: 'Venus is hot because it is the planet nearest the Sun.',
          response:
            'Mercury is nearer, and its surface is cooler on average than Venus’s. What matters is the sunlight absorbed and what the atmosphere does with the heat.',
        },
      ],
      teachingNotes: [
        'The anchors and the pack (albedos, distances, temperatures) are typed from the NASA fact sheets and read by Carl; they were not checked against the sources.',
        'The albedo is the Bond albedo (the fraction of all incident power reflected), not a geometric albedo.',
        'The models are not climate models: no convection, no clouds, no internal heat, grey opacity. A fitted number is not an observation of the atmosphere.',
        'No claim is made about retention of an atmosphere: the escape instrument is not built.',
      ],
      discussion: [
        'Why does the planet that absorbs less sunlight end up with the hotter surface?',
        'What would you need to measure to say the fitted optical depth of Venus is right?',
        'Why does a fourth root make the temperature change so slowly when the albedo changes?',
      ],
      extensions: [
        'Continue with Two Greenhouse Models, which fits Earth, Mars and Venus in both models.',
        'Look up the measured surface pressure of Venus and compare it with the scale height you found.',
      ],
      modelNotes:
        'js/kernels/atmospheres/ (ATMOSPHERES.md): equilibriumTemperature, oneLayer, greyGround and greyDepthFor, scaleHeight and the six-body pack, validated against an independent numpy and scipy oracle (npm run atmospheres:validate).',
    },
    'two-greenhouse-models': {
      topic:
        'A single absorbing layer and a grey atmosphere with an optical depth fitted to Earth, Mars and Venus: what each free number means, why they differ, which model can reach Venus and where grey opacity stops being a description.',
      difficulty:
        'Intermediate (fourth roots, two models, an approximation with a stated error)',
      placement:
        'After Why Venus Is Hot, whose equilibrium temperature and gap it reuses. It supports OpenStax Astronomy 2e chapter 8 (section 8.3 on Earth’s atmosphere); the citation is the author’s and has not been checked against the book.',
      overview:
        'Students fit Earth’s surface temperature with a one-layer emissivity (0.79) and a grey optical depth (0.87), say why the numbers differ, predict and then read that Venus is out of reach for one layer (272 K at most) and needs an optical depth near 142 in the grey model. Deeper: Mars needs almost nothing in either model, one unit in each model gives 292.2 K and 302.1 K, and the Eddington profile is 3.7 percent warm at the top against the exact grey solution.',
      priorKnowledge: [
        'The equilibrium temperature and the measured-minus-equilibrium gap',
        'Energy balance: what comes in as sunlight leaves as infrared',
        'The fourth-root relation between absorbed power and temperature',
      ],
      keyConcepts: [
        {
          heading: 'Two models, two free numbers',
          body: 'An emissivity is the share of the infrared one sheet absorbs, between 0 and 1. An optical depth sets the opacity of a whole column and can be 142. They are not the same quantity.',
        },
        {
          heading: 'A ceiling is information',
          body: 'One layer cannot exceed 2^(1/4) times the equilibrium temperature. A planet that needs more refuses the model.',
        },
        {
          heading: 'The approximation has a stated error',
          body: 'The Eddington profile is 3.66 percent warm at the top against the exact grey solution (a Milne-equation calculation). The error is stated, not minimised, and it is smaller than the error of calling real opacity grey.',
        },
      ],
      features: [
        {
          name: 'Greenhouse instrument',
          text: 'Both models for Earth, Mars or Venus: the grey profile as Eddington and exact curves through the plot component, the ground temperature of each model, and the number each needs to reproduce the measured temperature.',
        },
        {
          name: 'Depth',
          text: 'Quantitative: Mars in both models, one unit in each model. Advanced: the limits of grey opacity.',
        },
        {
          name: 'A model that can refuse',
          text: 'The one-layer model returns no solution, with the reason, when the planet needs a ground warmer than 2^(1/4) times its equilibrium temperature.',
        },
      ],
      misconceptions: [
        {
          claim:
            'If both models reproduce 288 K, both describe Earth’s atmosphere correctly.',
          response:
            'Each is fitted to the one measurement. They agree on the ground temperature and disagree on everything else, and neither number is measured.',
        },
        {
          claim: 'An emissivity of 1 and an optical depth of 1 are the same.',
          response:
            'They give 302.1 K and 292.2 K for Earth: a fully absorbing sheet and a column of one optical depth are different atmospheres.',
        },
        {
          claim: 'The grey model is exact, since it is a published solution.',
          response:
            'It is the Eddington approximation of the grey problem, 3.66 percent warm at the top, and the grey assumption itself is the larger simplification.',
        },
        {
          claim: 'A model that has no solution for a planet is broken.',
          response:
            'A refusal is a result: the one layer has a ceiling and Venus is above it.',
        },
      ],
      teachingNotes: [
        'The exact grey curve uses the Hopf function in a closed approximation, checked against a numerical solution of the Milne equation to 0.5 percent.',
        'The pack values were read by Carl and not checked against the NASA fact sheets.',
        'These are not climate models; they cannot say what a real atmosphere will do.',
        'The one number fitted to each planet is a fit to one measurement, not an observation: say so when students quote it.',
      ],
      discussion: [
        'Which of the two numbers would you expect to move if the clouds changed, and why?',
        'Why is “grey” a bigger limitation than the Eddington approximation?',
        'What would a model with two opacities, one for sunlight and one for infrared, change?',
      ],
      extensions: [
        'Open the validation page and find the atmospheres group.',
        'Compare the one-layer ceiling with the ratio of measured to equilibrium temperature of each planet in Why Venus Is Hot.',
      ],
      modelNotes:
        'js/kernels/atmospheres/ (ATMOSPHERES.md): oneLayer, oneLayerEmissivityFor, greyGround, greyDepthFor, greyTemperatureExact; the oracle results are pinned in tests/fixtures/atmospheres/.',
    },
  },
  flow: {
    'why-venus-is-hot': [
      {
        from: 'two-temperatures',
        to: 'earth-sunlight-alone',
        text: 'The equilibrium temperature and Earth’s gap.',
      },
      {
        from: 'venus-predict',
        to: 'what-the-gap-says',
        text: 'Venus is cooler by sunlight and hotter at the surface: the gap.',
      },
      {
        from: 'six-bodies',
        to: 'grey-depth-for-venus',
        text: 'Which gaps are a greenhouse, one layer cannot reach Venus, a grey atmosphere can.',
      },
      {
        from: 'what-you-worked-out',
        to: 'what-you-worked-out',
        text: 'The close: what the gap and the two models say.',
      },
    ],
    'two-greenhouse-models': [
      {
        from: 'two-models',
        to: 'earth-one-layer',
        text: 'The two models, and Earth fitted with an emissivity.',
      },
      {
        from: 'earth-grey',
        to: 'same-planet-different-numbers',
        text: 'The same planet fitted with an optical depth, and why the two numbers differ.',
      },
      {
        from: 'venus-both',
        to: 'venus-both-try',
        text: 'Which model can reach Venus.',
      },
      {
        from: 'what-you-worked-out',
        to: 'what-you-worked-out',
        text: 'The close: two numbers, two meanings.',
      },
    ],
  },
  expectations: {
    'why-venus-is-hot': {
      'earth-sunlight-alone':
        'Earth’s equilibrium temperature 254 K (within 0.6) and a gap of 34 K (within 1).',
      'venus-sunlight-alone':
        'Venus’s equilibrium temperature 229 K (within 0.7) and a gap of 508 K (within 2).',
      'six-bodies':
        'Mars within 0.5 K of 0.2 and Jupiter’s 1 bar level 55 K above its equilibrium temperature (within 2).',
      'one-layer-for-venus':
        'The highest ground temperature one layer can give Venus, 272 K (within 1.5).',
      'grey-depth-for-venus': 'An optical depth near 141.6 (within 1.5).',
    },
    'two-greenhouse-models': {
      'earth-one-layer': 'An emissivity of 0.79 (within 0.01).',
      'earth-grey': 'An optical depth of 0.87 (within 0.02).',
      'venus-both-try':
        'The one-layer ceiling for Venus, 272 K (within 1.5), and an optical depth near 141.6 (within 1.5).',
    },
  },
  bands: {
    'why-venus-is-hot': {
      core: 'medium',
      quantitative: 'short',
      advanced: 'short',
    },
    'two-greenhouse-models': {
      core: 'medium',
      quantitative: 'medium',
      advanced: 'short',
    },
  },
};

/** The deeper steps by lesson id: what depthAll.js registers. */
export default {
  [WHY_VENUS_IS_HOT_DEEPER.id]: WHY_VENUS_IS_HOT_DEEPER.steps,
  [TWO_GREENHOUSE_MODELS_DEEPER.id]: TWO_GREENHOUSE_MODELS_DEEPER.steps,
};
