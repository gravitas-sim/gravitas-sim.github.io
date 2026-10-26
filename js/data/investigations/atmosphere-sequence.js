// =============================================================================
// The atmosphere investigations (Prompt 200)
// -----------------------------------------------------------------------------
// Two investigations on the atmosphere instruments (js/atmosphereWidgets.js), in
// a module of their own: "Why Venus Is Hot" (survey) and "Two Greenhouse Models"
// (majors). Separate files because the shared sequence files sit at their line
// ceilings (D-R10-81); the per-lesson path every loader builds from an id is a
// one-line re-export of the named export here, and the instructor bundle's
// closure grew by this file and its three siblings (D-R10-81).
//
// Content only, no imports: every number a step states is recomputed in
// tests/atmosphereLessons.test.js from the kernel in js/kernels/atmospheres/ and
// its pack. These are teaching models (no convection, no clouds, no internal
// heat); each step says so where it matters. Every step carries a `sid`, an
// opaque stable id that student progress is keyed by: reword a step, move it,
// translate it, never change its sid.
// =============================================================================

const STAGE = {
  spacing: 150,
  fit: true,
  stars: [{ role: 'star', name: 'The Sun', teffK: 5772, lumSun: 1 }],
};
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
// -----------------------------------------------------------------------------
// 1. Why Venus Is Hot
// -----------------------------------------------------------------------------
export const WHY_VENUS_IS_HOT = {
  id: 'why-venus-is-hot',
  thumbnail: 'images/investigations/why-venus-is-hot.webp',
  title: 'Why Venus Is Hot',
  subtitle:
    'What sunlight alone gives a planet, the gap it leaves, and what closes it',
  duration: '25-40 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 10, section: '10.3' },
  courseLevel: 'survey',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'algebra',
  prerequisites: [],
  tags: ['habitability', 'solar-system'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Say what the equilibrium temperature of a planet is, and what it is not',
    'Find the gap between a planet’s equilibrium temperature and the temperature measured at its surface, and read it as a greenhouse effect only where it is one',
    'See that Venus, with the cooler equilibrium temperature, has the hotter surface',
    'Find the one number a gray atmosphere needs to give Venus its surface temperature, and see why a single layer cannot',
  ],
  steps: [
    {
      sid: 'two-temperatures',
      stage: STAGE,
      type: 'read',
      title: 'Two temperatures for one planet',
      body: `The surface of Venus is at 737 K, about 464 &deg;C, hotter than the surface of
             Mercury, which is much nearer the Sun. This investigation asks what sunlight
             alone would give each planet, and what is left over.
             \n\nThe <strong>equilibrium temperature</strong> is the temperature of a black
             body that radiates exactly the sunlight the planet absorbs. It depends on the
             distance from the Sun and on the <strong>Bond albedo</strong>, the fraction of
             the sunlight a planet reflects. It is not the temperature of the ground: it
             is what the planet would radiate to space if sunlight were all there was.
             Use the instrument to set it beside the temperature measured at the surface.
             The models here leave out convection, clouds and any heat inside the planet,
             and the instrument says so.`,
      tool: BAL({ body: 1 }),
    },
    {
      sid: 'earth-sunlight-alone',
      stage: STAGE,
      type: 'measure',
      title: 'Earth: sunlight alone',
      body: `Start at home. With the planet set to <strong>Earth</strong> and its own albedo,
             read Earth&rsquo;s <strong>equilibrium temperature</strong> and the
             <strong>measured minus equilibrium</strong> difference.`,
      fields: [
        {
          id: 'teq',
          label: 'Earth’s equilibrium temperature',
          unit: 'K',
          hint: '254',
        },
        {
          id: 'gap',
          label: 'Measured surface temperature minus equilibrium',
          unit: 'K',
          hint: '34',
        },
      ],
      validate: v => {
        if (![v.teq, v.gap].every(Number.isFinite)) return null;
        if (near(v.teq, 254.0, 0.6) && near(v.gap, 34.0, 1)) {
          return {
            level: 'ok',
            message:
              'Sunlight alone gives Earth 254 K, about −19 °C. The surface is 288 K: 34 K warmer. That 34 K is the greenhouse warming this simple model leaves for the atmosphere to explain.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose Earth, leave the albedo as the planet’s own and the night-side heat at 1, then read “Equilibrium temperature” and “Measured minus equilibrium”.',
        };
      },
      tool: BAL({ body: 1 }),
    },
    {
      sid: 'venus-predict',
      stage: STAGE,
      type: 'predict',
      reveal: 'venus-sunlight-alone',
      title: 'Venus: closer, so hotter?',
      body: `Venus is nearer the Sun than Earth, so it receives about twice the sunlight
             at the top of its atmosphere. Its clouds also reflect most of it back: its
             Bond albedo is 0.76, against Earth&rsquo;s 0.306.`,
      prompt:
        'Venus’s equilibrium temperature, from sunlight alone, would be&hellip;',
      options: [
        'higher than Earth’s, near 330 K, because Venus is closer to the Sun',
        'about the same as Earth’s',
        'lower than Earth’s, near 230 K, because its clouds reflect so much sunlight',
        'near 737 K, the temperature measured at its surface',
      ],
      answer: 2,
      misconceptions: [
        {
          id: 'closer',
          option: 0,
          say: 'Closer means more sunlight arriving, but a planet is heated by the sunlight it absorbs, and Venus reflects 76 percent of it.',
        },
        {
          id: 'measured',
          option: 3,
          say: 'That is the temperature measured at the surface. The equilibrium temperature is what sunlight alone gives, and it is the next step to find out how far apart the two are.',
        },
      ],
      hints: [
        'Multiply the sunlight at Venus by the fraction it absorbs, 1 − 0.76, and compare with Earth’s 1 − 0.306.',
      ],
      because:
        'Venus absorbs only a quarter of the sunlight that reaches it, and that sets its equilibrium temperature near 229 K, cooler than Earth’s 254 K. The next step reads it from the instrument.',
      tool: BAL({ body: 0 }),
    },
    {
      sid: 'venus-sunlight-alone',
      stage: STAGE,
      type: 'measure',
      title: 'Venus: sunlight alone',
      body: `Set the planet to <strong>Venus</strong> and read its equilibrium temperature,
             and the difference between the measured surface temperature and it.`,
      fields: [
        {
          id: 'teq',
          label: 'Venus’s equilibrium temperature',
          unit: 'K',
          hint: '229',
        },
        {
          id: 'gap',
          label: 'Measured surface temperature minus equilibrium',
          unit: 'K',
          hint: '508',
        },
      ],
      validate: v => {
        if (![v.teq, v.gap].every(Number.isFinite)) return null;
        if (near(v.teq, 229.0, 0.7) && near(v.gap, 508, 2)) {
          return {
            level: 'ok',
            message:
              'Venus’s equilibrium temperature is 229 K, cooler than Earth’s, and its surface is 737 K: 508 K above what sunlight alone gives. The planet that absorbs less sunlight is by far the hotter at the surface.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose Venus with its own albedo, then read “Equilibrium temperature” and “Measured minus equilibrium”.',
        };
      },
      tool: BAL({ body: 0 }),
    },
    {
      sid: 'what-the-gap-says',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'What does the gap say?',
      body: `Venus’s surface is 508 K hotter than sunlight alone can make it.`,
      prompt: 'What is the most reasonable reading of that gap?',
      options: [
        'The atmosphere traps heat: the surface is warmer than the temperature the planet radiates to space',
        'Venus has an internal heat source far larger than the sunlight it absorbs',
        'The albedo of Venus must be wrong, since a hotter planet would reflect less',
        'Sunlight at Venus is much stronger than the model uses',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'internal',
          option: 1,
          say: 'Venus has no internal heat source of that size. Heat from a planet’s interior is a small fraction of the sunlight it absorbs, except for the giant planets.',
        },
        {
          id: 'albedo',
          option: 2,
          say: 'Even with Earth’s albedo, Venus’s equilibrium temperature would be about 299 K, nowhere near 737 K. The gap is far too large to be an albedo error.',
        },
      ],
      hints: [
        'Compare the temperature the planet radiates to space with the temperature of its ground.',
      ],
      because:
        'The planet as a whole radiates what it absorbs, at 229 K, from high in the atmosphere. The ground is much hotter because a thick atmosphere that absorbs infrared radiation carries the heating from the ground up through many layers: a greenhouse effect.',
      tool: BAL({ body: 0 }),
    },
    {
      sid: 'six-bodies',
      stage: STAGE,
      type: 'measure',
      title: 'Is the gap always a greenhouse?',
      body: `Go through the other bodies. Read the difference for <strong>Mars</strong> (a thin
             carbon dioxide atmosphere) and for <strong>Jupiter</strong>. Jupiter has no
             surface: its row compares the model with the temperature at the 1 bar level,
             and Jupiter also gives off heat of its own.`,
      fields: [
        {
          id: 'mars',
          label: 'Mars: measured minus equilibrium',
          unit: 'K',
          hint: '0.2',
        },
        {
          id: 'jupiter',
          label: 'Jupiter: measured (1 bar) minus equilibrium',
          unit: 'K',
          hint: '55',
        },
      ],
      validate: v => {
        if (![v.mars, v.jupiter].every(Number.isFinite)) return null;
        if (near(v.mars, 0.2, 0.5) && near(v.jupiter, 55.2, 2)) {
          return {
            level: 'ok',
            message:
              'Mars is within a fraction of a kelvin of its equilibrium temperature, as a very thin atmosphere would allow. Jupiter’s 1 bar level is 55 K above its equilibrium temperature, but Jupiter has no surface and radiates internal heat the model leaves out, so that gap is not a greenhouse measurement.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose Mars (2) and then Jupiter (3), each with its own albedo, and read “Measured minus equilibrium”.',
        };
      },
      tool: BAL({ body: 2 }),
    },
    {
      sid: 'one-layer-for-venus',
      stage: STAGE,
      type: 'measure',
      title: 'One layer for Venus?',
      body: `The simplest greenhouse is <strong>one layer</strong> that lets sunlight through
             and absorbs a fraction of the infrared, the <em>emissivity</em>. The ground it
             can warm is at most 2<sup>1/4</sup> = 1.19 times the equilibrium temperature,
             however thick the layer. Set the planet to <strong>Venus</strong> and the
             emissivity to 1, the most the layer can do, and read the ground temperature
             the one-layer model gives.`,
      fields: [
        {
          id: 'ground',
          label: 'Highest ground temperature one layer can give Venus',
          unit: 'K',
          hint: '272',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.ground)) return null;
        if (near(v.ground, 272.4, 1.5)) {
          return {
            level: 'ok',
            message:
              'At most 272 K, about 2^(1/4) × 229 K. Venus’s surface is 737 K, so no one-layer atmosphere reaches it, whatever its emissivity: the model has no solution there, and the instrument says so. That refusal is the result.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose Venus (0), set the emissivity of the layer to 1, then read “Ground temperature, one layer”.',
        };
      },
      tool: GRN({ body: 0, emissivity: 1, tau: 1 }),
    },
    {
      sid: 'gray-depth-for-venus',
      stage: STAGE,
      type: 'measure',
      title: 'One optical depth for Venus',
      body: `A <strong>gray atmosphere</strong> is a different model: the opacity is the same at
             every wavelength and the atmosphere has an <strong>optical depth</strong>, a
             measure of how opaque the whole column is. A thick enough column can warm the
             ground without limit. With the planet set to <strong>Venus</strong>, read the
             optical depth that gives the measured surface temperature.`,
      fields: [
        {
          id: 'tau',
          label: 'Optical depth that gives Venus’s surface temperature',
          hint: '141.6',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.tau)) return null;
        if (near(v.tau, 141.6, 1.5)) {
          return {
            level: 'ok',
            message:
              'An optical depth near 142: the atmosphere is about 140 optical depths thick, opaque to infrared at almost every level. Set the optical depth to 141.6 and the ground temperature the model gives is Venus’s 737 K. It is one number fitted to one measurement, and it says nothing about what the atmosphere is made of.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose Venus (0) and read “Optical depth that gives the measured temperature”.',
        };
      },
      tool: GRN({ body: 0, tau: 141.6, emissivity: 1 }),
    },
    {
      sid: 'what-you-worked-out',
      stage: STAGE,
      type: 'read',
      title: 'What you worked out',
      body: `Sunlight alone gives Earth 254 K and Venus 229 K, and the surfaces are at 288 K
             and 737 K: gaps of 34 K and 508 K. Venus reflects most of its sunlight, so it
             has the cooler equilibrium temperature and the hotter surface. Mars&rsquo;s gap
             is a fraction of a kelvin, and Jupiter&rsquo;s is not a greenhouse gap at all.
             A single absorbing layer cannot give Venus more than 272 K; a gray atmosphere
             with an optical depth of about 142 can. These are teaching models: they leave
             out convection, clouds and the wavelength dependence of real opacity, and
             the one number fitted for Venus is not a measurement of its atmosphere.`,
      tool: GRN({ body: 0, tau: 141.6, emissivity: 1 }),
    },
  ],
};

// -----------------------------------------------------------------------------
// 2. Two Greenhouse Models
// -----------------------------------------------------------------------------
export const TWO_GREENHOUSE_MODELS = {
  id: 'two-greenhouse-models',
  thumbnail: 'images/investigations/two-greenhouse-models.webp',
  title: 'Two Greenhouse Models',
  subtitle:
    'A single layer and a gray atmosphere, the same planets, and why the numbers differ',
  duration: '30-40 min',
  level: 'Majors and upper-level astronomy',
  audience: 'intro',
  textbook: { chapter: 8, section: '8.3' },
  courseLevel: 'majors',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'algebra',
  prerequisites: ['why-venus-is-hot'],
  tags: ['habitability', 'solar-system'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Fit Earth’s surface temperature with a one-layer emissivity and with a gray optical depth, and say why the two numbers differ',
    'Say what each model’s free number means and what each leaves out',
    'See which model can reach Venus’s surface temperature and which cannot',
    'Read the temperature profile of a gray atmosphere and the error of the Eddington approximation',
  ],
  steps: [
    {
      sid: 'two-models',
      stage: STAGE,
      type: 'read',
      title: 'Two ways to model a greenhouse',
      body: `Both models start from the same planet: sunlight lands, the planet is in
             energy balance, and the equilibrium temperature is the temperature it radiates
             at. They differ in how the atmosphere absorbs the heat from the ground.
             \n\nThe <strong>one-layer</strong> model is a single sheet with an
             <em>emissivity</em> between 0 and 1. The <strong>gray</strong> model is a column
             with an <em>optical depth</em> from the top down and the same opacity at every
             wavelength, solved here with the Eddington approximation. Each has one free
             number and neither is the other with another name. You will fit both to Earth,
             Mars and Venus.`,
      tool: GRN({ body: 1, tau: 1, emissivity: 0.5 }),
    },
    {
      sid: 'earth-one-layer',
      stage: STAGE,
      type: 'measure',
      title: 'Earth in the one-layer model',
      body: `With the planet set to <strong>Earth</strong>, read the <strong>emissivity of one
             layer</strong> that gives Earth&rsquo;s measured surface temperature, 288 K.`,
      fields: [
        {
          id: 'eps',
          label: 'Emissivity that gives 288 K',
          hint: '0.790',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.eps)) return null;
        if (near(v.eps, 0.79, 0.01)) {
          return {
            level: 'ok',
            message:
              'An emissivity of 0.79: one layer absorbing 79 percent of the infrared from below puts the ground at 288 K.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose Earth (1) and read “Emissivity of one layer that gives the measured temperature”.',
        };
      },
      tool: GRN({ body: 1, tau: 1, emissivity: 0.79 }),
    },
    {
      sid: 'earth-gray',
      stage: STAGE,
      type: 'measure',
      title: 'Earth in the gray model',
      body: `Now the gray model. Read the <strong>optical depth</strong> that gives Earth&rsquo;s
             surface temperature.`,
      fields: [
        {
          id: 'tau',
          label: 'Optical depth that gives 288 K',
          hint: '0.87',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.tau)) return null;
        if (near(v.tau, 0.87, 0.02)) {
          return {
            level: 'ok',
            message:
              'An optical depth of 0.87: the gray column has to be a little under one optical depth thick to put the ground at 288 K.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose Earth (1) and read “Optical depth that gives the measured temperature”.',
        };
      },
      tool: GRN({ body: 1, tau: 0.87, emissivity: 0.79 }),
    },
    {
      sid: 'same-planet-different-numbers',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Same planet, different numbers',
      body: `Earth needs an emissivity of 0.79 in one model and an optical depth of 0.87 in
             the other.`,
      prompt: 'Why are the two numbers different?',
      options: [
        'They are different quantities: an emissivity is the share one sheet absorbs, and an optical depth sets how opaque a whole column is, layer by layer',
        'One of the two models is simply wrong for Earth and its number should be ignored',
        'The emissivity must always equal the optical depth if the models are right',
        'The optical depth counts clouds and the emissivity does not',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'equal',
          option: 2,
          say: 'An emissivity cannot exceed 1, and an optical depth can be 142. They are not the same quantity, and the models agree only at a ground temperature, not in what they say about the atmosphere.',
        },
      ],
      hints: ['What is the largest value each number can take?'],
      because:
        'Both reproduce 288 K, and both are fitted to the one measurement. What they claim about the atmosphere is different, and neither has been measured: a number fitted to a surface temperature is not an observation of the atmosphere.',
      tool: GRN({ body: 1, tau: 0.87, emissivity: 0.79 }),
    },
    {
      sid: 'venus-both',
      stage: STAGE,
      type: 'predict',
      reveal: 'venus-both-try',
      title: 'Venus in both models',
      body: `Venus’s surface is 737 K and its equilibrium temperature is 229 K.`,
      prompt: 'Which model can give Venus’s surface temperature?',
      options: [
        'both, each with a suitable emissivity or optical depth',
        'only the gray model, with a large optical depth',
        'only the one-layer model, with an emissivity near 1',
        'neither: sunlight alone cannot do it',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'both',
          option: 0,
          say: 'A one layer has a ceiling: its ground is at most 2^(1/4) times the equilibrium temperature, however high the emissivity. The next step checks what that is for Venus.',
        },
      ],
      hints: [
        'What is the warmest ground one layer can give, as a multiple of the equilibrium temperature?',
      ],
      because:
        'Only the gray model. One layer cannot go above 2^(1/4) = 1.19 times the equilibrium temperature, 272 K for Venus, while a gray atmosphere’s ground temperature keeps rising with its optical depth.',
      tool: GRN({ body: 0, tau: 1, emissivity: 1 }),
    },
    {
      sid: 'venus-both-try',
      stage: STAGE,
      type: 'measure',
      title: 'Venus: the ceiling and the depth',
      body: `Set the planet to <strong>Venus</strong>. Read the highest ground temperature one
             layer can give it (emissivity 1), and the optical depth the gray model needs.`,
      fields: [
        {
          id: 'ceiling',
          label: 'Highest ground temperature one layer can give Venus',
          unit: 'K',
          hint: '272',
        },
        {
          id: 'tau',
          label: 'Optical depth that gives Venus’s surface temperature',
          hint: '141.6',
        },
      ],
      validate: v => {
        if (![v.ceiling, v.tau].every(Number.isFinite)) return null;
        if (near(v.ceiling, 272.4, 1.5) && near(v.tau, 141.6, 1.5)) {
          return {
            level: 'ok',
            message:
              'One layer tops out at 272 K and the instrument reports no emissivity that reaches 737 K. The gray model reaches it with an optical depth near 142. A model with a ceiling can be refused by a planet; refusing is information.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose Venus (0). Set the emissivity to 1 and read “Ground temperature, one layer”, then read “Optical depth that gives the measured temperature”.',
        };
      },
      tool: GRN({ body: 0, tau: 141.6, emissivity: 1 }),
    },
    {
      sid: 'what-you-worked-out',
      stage: STAGE,
      type: 'read',
      title: 'What you worked out',
      body: `Earth needs an emissivity of 0.79 in the one-layer model and an optical depth
             of 0.87 in the gray model: two numbers for one planet, because they are two
             different quantities. Venus needs an optical depth near 142 in the gray model
             and has no solution in the one-layer model, whose ground cannot exceed 1.19
             times the equilibrium temperature. Each number is fitted to a single surface
             temperature; neither is a measurement of the atmosphere. The deeper steps look
             at Mars, at the profile inside a gray atmosphere, and at where gray opacity
             stops being a good description.`,
      tool: GRN({ body: 1, tau: 0.87, emissivity: 0.79 }),
    },
  ],
};

/** The lessons, in order: what the barrel registers. */
export default [WHY_VENUS_IS_HOT, TWO_GREENHOUSE_MODELS];
