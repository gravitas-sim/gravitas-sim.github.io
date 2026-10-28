// =============================================================================
// The atmosphere investigations (Prompt 200)
// -----------------------------------------------------------------------------
// Two investigations on the atmosphere instruments (js/atmosphereWidgets.js), in
// a module of their own (and, from Prompt 194 part 2, two on the Sun at the end): "Why Venus Is Hot" (survey) and "Two Greenhouse Models"
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
  duration: '15-25 min',
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
  duration: '10-20 min',
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

// -----------------------------------------------------------------------------
// The Sun (Prompt 194 part 2, SUN_KERNEL.md Part 2, D-R10-92)
// -----------------------------------------------------------------------------
// Two more investigations in this file, on the Sun instruments (js/sunWidgets.js):
// "The Turning Sun" (survey, with a majors and an upper depth) and "The Sun's
// Power". Appended here, and not in a file of their own, because the instructor
// bundle's closure is capped by file count. Every number is recomputed in
// tests/sunLessons.test.js from the kernel (js/kernels/sun/) and the committed
// sequence (frames/sun-2024-05.json). The pictures are SDO browse pictures: display
// pictures that their source says are not for science analysis, so what is read
// from them is an instructional reading with an uncertainty, labeled not
// astrometry. The marks of the two groups are the author's, by a stated rule;
// nobody else has marked these pictures. NOAA's region counts were not retrieved.
const SF = (values = {}, hide = []) => ({ id: 'sun-frames', values, hide });
const SR = (values = {}, hide = []) => ({ id: 'sun-rotation', values, hide });
const SP = (values = {}, hide = []) => ({ id: 'sun-power', values, hide });

export const THE_TURNING_SUN = {
  id: 'the-turning-sun',
  thumbnail: 'images/investigations/the-turning-sun.webp',
  title: 'The Turning Sun',
  subtitle:
    'Fourteen days of pictures, one spot group followed across the disc, and the Sun’s rotation from it',
  duration: '20-30 min',
  level: 'Introductory to upper-level astronomy',
  audience: 'intro',
  textbook: { chapter: 16, section: null },
  courseLevel: 'survey',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'algebra',
  prerequisites: [],
  tags: ['solar-system', 'observing'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Read the latitude and longitude of a spot from a picture of the Sun, with the uncertainty of placing it, and say why one near the edge is read less well',
    'Follow one spot group over days to a rotation rate and period, and correct it for the Earth’s own motion',
    'Say what a sunspot is, and why spots at different latitudes turn at different rates',
    'Say what two groups can and cannot show about how the Sun turns, and why two latitudes cannot fix three coefficients',
  ],
  steps: [
    {
      sid: 'fourteen-days',
      stage: STAGE,
      type: 'read',
      title: 'Fourteen pictures of the Sun',
      body: `On 4 May 2024 the Sun showed a handful of dark <strong>spots</strong>. Over the next
             thirteen days they crossed its face. The pictures here are one a day, at 12:00
             UT, from the Solar Dynamics Observatory (credit SDO/NASA and the HMI science
             team). They are <strong>browse pictures</strong>, made to be looked at: their source says
             they are not for science analysis, so what you read from them is an instructional
             reading with an uncertainty, not astrometry. The two rings, G1 and G3, are two groups
             marked by the author with a stated rule; nobody else has marked these pictures.
             \n\nSet the day to 1 and then to 5 and watch G1, a small spot near the middle of the disc.`,
      tool: SF({ day: 1, x: 452, y: 422, marks: 1 }),
    },
    {
      sid: 'which-way',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Which way do the spots go?',
      body: `North is up and east is on the left in these pictures. Step the day from 1 to 6 and
             follow G1.`,
      prompt: 'Across the face, the spots move&hellip;',
      options: [
        'from the left edge toward the right edge, east to west',
        'from the right edge toward the left edge, west to east',
        'up toward the north pole',
        'not at all: a spot stays where it is and the Sun’s face just brightens',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'stay',
          option: 3,
          say: 'A spot is at a fixed place on the Sun, and it moves across the picture because the Sun turns. G1 is at 452 pixels across on day 1 and at 912 on day 6.',
        },
      ],
      hints: ['Look at G1’s position across, on day 1 and on day 5.'],
      because:
        'From the left, east, toward the right, west. The Sun turns in the same sense as the planets go around it, so spots come over the east edge and leave at the west edge.',
      tool: SF({ day: 5, marks: 1 }),
    },
    {
      sid: 'read-a-position',
      stage: STAGE,
      type: 'measure',
      title: 'Where on the Sun is G1?',
      body: `A picture shows the Sun flat; what you want is where on the sphere a spot sits. The
             instrument does the geometry, from the tilt of the Sun’s pole toward us and the
             Carrington longitude of the central meridian, both from JPL Horizons. The crosshair
             starts on G1 on day 1. Read its <strong>latitude</strong> and its <strong>longitude from the
             central meridian</strong>, in degrees. East is negative.`,
      fields: [
        {
          id: 'lat',
          label: 'G1’s latitude on day 1',
          unit: 'deg',
          hint: '7.1',
        },
        {
          id: 'lon',
          label: 'G1’s longitude from the central meridian on day 1',
          unit: 'deg',
          hint: '-7.3',
        },
      ],
      validate: v => {
        if (![v.lat, v.lon].every(Number.isFinite)) return null;
        if (near(v.lat, 7.14, 0.3) && near(v.lon, -7.29, 0.4)) {
          return {
            level: 'ok',
            message:
              'About 7 degrees north and 7 degrees east of the central meridian, with a placement uncertainty of 0.2 degree in longitude for 1.5 pixels. The disc is a sphere seen from one side, and a pixel near the middle is a small fraction of a degree: that is why the middle of the disc is the best place to read from.',
          };
        }
        return {
          level: 'error',
          message:
            'Leave the crosshair where it starts (452 across, 422 down) on day 1 and read “latitude” and “longitude” from the crosshair row.',
        };
      },
      tool: SF({ day: 1, x: 452, y: 422, marks: 1 }),
    },
    {
      sid: 'how-far-in-three-days',
      stage: STAGE,
      type: 'measure',
      title: 'How far does it turn in three days?',
      body: `Set the day to <strong>4</strong> and read G1&rsquo;s longitude from the <strong>author&rsquo;s mark</strong>
             row. Then divide how far it moved, from day 1, by the three days between.`,
      fields: [
        {
          id: 'lon4',
          label: 'G1’s longitude on day 4',
          unit: 'deg',
          hint: '32.4',
        },
        {
          id: 'rate',
          label:
            'How far it turned each day, from day 1 to day 4 (degrees a day)',
          unit: '',
          hint: '13.2',
        },
      ],
      validate: v => {
        if (![v.lon4, v.rate].every(Number.isFinite)) return null;
        if (near(v.lon4, 32.44, 0.3) && near(v.rate, 13.22, 0.25)) {
          return {
            level: 'ok',
            message:
              'From −7.2 to 32.4 degrees in three days, 13.2 degrees a day. Two points make a rate and not a measurement of how good it is. The next step uses all the days.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the day to 4, read the longitude in the “Author’s mark of G1” row, subtract the −7.2 of day 1 and divide by 3.',
        };
      },
      tool: SF({ day: 4, marks: 1 }),
    },
    {
      sid: 'track-the-group',
      stage: STAGE,
      type: 'measure',
      title: 'The whole track',
      body: `The second instrument takes all the marks of G1 that are not too close to the edge
             (six days) and fits a straight line to longitude against time. Read the <strong>synodic
             rate</strong>, the rate as the Earth sees it, with its uncertainty, and the <strong>synodic
             period</strong>: how long a turn of 360 degrees takes at that rate.`,
      fields: [
        {
          id: 'rate',
          label: 'G1’s synodic rate (degrees a day)',
          unit: '',
          hint: '13.17',
        },
        {
          id: 'period',
          label: 'The synodic period',
          unit: 'd',
          hint: '27.3',
        },
      ],
      validate: v => {
        if (![v.rate, v.period].every(Number.isFinite)) return null;
        if (near(v.rate, 13.17, 0.06) && near(v.period, 27.33, 0.15)) {
          return {
            level: 'ok',
            message:
              '13.17 ± 0.06 degrees a day, a period of 27.3 days between a spot facing us and facing us again. The marks lie on the line within their uncertainties. This is the period the Earth sees; it is not the Sun’s own.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose G1 with the first day 1 and the last day 9 and read “Synodic rate” and “Synodic period”.',
        };
      },
      tool: SR({ group: 0, first: 1, last: 9, limb: 0, mode: 0 }, ['mode']),
    },
    {
      sid: 'longer-or-shorter',
      stage: STAGE,
      type: 'predict',
      reveal: 'the-sidereal-period',
      title: 'The Sun’s own period',
      body: `While the spot turned, the Earth moved too, around the Sun in the same direction.
             The 27.3 days are measured from a moving place.`,
      prompt:
        'The Sun’s own period of rotation, against the stars, will be&hellip;',
      options: [
        'shorter than 27.3 days: the Earth has moved on, so the spot has to turn a little more than once to face us again',
        'longer than 27.3 days: the Earth’s motion drags the spot back',
        'the same: the Earth is far too far away to matter',
      ],
      answer: 0,
      hints: [
        'In 27 days the Earth goes about a thirteenth of the way round its orbit, in the same direction as the Sun turns.',
      ],
      because:
        'Shorter. The spot has to turn through 360 degrees plus the angle the Earth has gone round in the meantime before it faces us again. The next step takes the Earth’s motion off the rate.',
      tool: SR({ group: 0, first: 1, last: 9 }, ['mode', 'limb']),
    },
    {
      sid: 'the-sidereal-period',
      stage: STAGE,
      type: 'measure',
      title: 'Against the stars',
      body: `Add the Earth&rsquo;s own motion, about 0.96 degree a day along the Sun&rsquo;s equator, to the
             synodic rate. Read the <strong>sidereal rate</strong> and the <strong>sidereal period</strong>.`,
      fields: [
        {
          id: 'rate',
          label: 'G1’s sidereal rate (degrees a day)',
          unit: '',
          hint: '14.13',
        },
        {
          id: 'period',
          label: 'The sidereal period',
          unit: 'd',
          hint: '25.5',
        },
      ],
      validate: v => {
        if (![v.rate, v.period].every(Number.isFinite)) return null;
        if (near(v.rate, 14.13, 0.06) && near(v.period, 25.47, 0.15)) {
          return {
            level: 'ok',
            message:
              '14.13 ± 0.06 degrees a day, a period of 25.5 days (95 percent: 25.3 to 25.7). It is shorter than the synodic 27.3, as predicted. Near the equator the Sun turns in about 25 days, and nearer the poles it takes longer, which the next steps use.',
          };
        }
        return {
          level: 'error',
          message:
            'Keep G1 and read “Sidereal rate” and “Sidereal period”: the synodic rate plus the Earth’s motion.',
        };
      },
      tool: SR({ group: 0, first: 1, last: 9 }, ['mode', 'limb']),
    },
    {
      sid: 'what-is-a-spot',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'What is a sunspot?',
      body: `You have followed one for a week. It stayed at one latitude, which is how you could
             follow it, and it turned with the Sun.`,
      prompt: 'A sunspot is&hellip;',
      options: [
        'a patch of the Sun’s surface that is cooler than its surroundings, and so darker, where strong magnetic fields hold the heat back',
        'a hole in the Sun’s surface through which we see a dark interior',
        'a cloud of cold gas in front of the Sun',
        'a planet crossing in front of the Sun',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'hole',
          option: 1,
          say: 'There is no hole: a spot is part of the surface. It only looks dark beside the hotter surface around it, as a coal looks dark beside a flame. It still glows.',
        },
        {
          id: 'cloud',
          option: 2,
          say: 'A cloud or a planet would not stay at one latitude and turn with the Sun for a week: G1 did. A spot belongs to the Sun.',
        },
      ],
      hints: [
        'What does staying at one latitude and turning with the Sun say?',
      ],
      because:
        'A cooler patch where strong magnetic fields hold the heat from below back. It is dark only by contrast and it belongs to the Sun, so tracking it follows the Sun’s own turning.',
      tool: SF({ day: 3, marks: 1 }),
    },
    {
      sid: 'what-you-worked-out',
      stage: STAGE,
      type: 'read',
      title: 'What you worked out',
      body: `You read a spot&rsquo;s place on the Sun from a flat picture, with an uncertainty, followed
             G1 for six days to 13.17 &plusmn; 0.06 degrees a day as the Earth sees it, and corrected for the
             Earth&rsquo;s motion to 14.13 &plusmn; 0.06 against the stars, a period of 25.5 days. A spot is a cooler
             patch of the surface and belongs to it. Two limits to keep: the pictures are browse pictures,
             so these are instructional readings and not astrometry, and G1 is one small group, so this is
             one latitude. The deeper steps follow a second group at another latitude and ask what two
             groups can and cannot show.`,
      tool: SR({ group: 0, first: 1, last: 9 }, ['mode', 'limb']),
    },
  ],
};

export const THE_SUNS_POWER = {
  id: 'the-suns-power',
  thumbnail: 'images/investigations/the-suns-power.webp',
  title: 'The Sun’s Power',
  subtitle:
    'A flux measured at the Earth, brought to one astronomical unit, and the Sun’s luminosity and temperature from it',
  duration: '15-25 min',
  level: 'Introductory to upper-level astronomy',
  audience: 'intro',
  textbook: { chapter: 15, section: null },
  courseLevel: 'survey',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'algebra',
  prerequisites: [],
  tags: ['solar-system', 'observing'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Bring a flux measured at the Earth to one astronomical unit with the Earth–Sun distance, and say why the correction has to be made',
    'Turn a flux at one astronomical unit into the Sun’s luminosity and effective temperature, and compare it with the Sun of the Color and Temperature investigation',
    'Say what the interval of a mean of daily values does and does not include',
    'Read a file’s fill values as missing data, not as measurements of zero',
  ],
  steps: [
    {
      sid: 'a-flux-above-the-air',
      stage: STAGE,
      type: 'read',
      title: 'Sunlight measured above the air',
      body: `The <strong>TSIS-1 TIM</strong> instrument measures the Sun&rsquo;s total irradiance, all the sunlight
             through one square meter facing the Sun, above the atmosphere. The daily values here are from
             LASP (credit LASP/TSIS-1 TIM team): the six days of 4 to 9 May 2024, the same days as the
             pictures in The Turning Sun. The file has seven more days after them, but they read 0.0
             with an uncertainty of 0.0: fill values, not measurements (a later step). The
             instrument gives the irradiance <strong>at the Earth</strong>, and the Earth is not always the same
             distance from the Sun.`,
      tool: SP({ days: 1, correct: 1 }),
    },
    {
      sid: 'flux-at-one-au',
      stage: STAGE,
      type: 'measure',
      title: 'Bring it to one astronomical unit',
      body: `Sunlight spreads over a sphere, so the flux falls as the square of the distance. On
             4 May the Earth was 1.00844 AU from the Sun. Read the flux at the Earth and the flux
             brought to <strong>1 AU</strong>: the flux times the distance in AU, squared.`,
      fields: [
        {
          id: 'earth',
          label: 'The flux at the Earth on 4 May (W/m²)',
          unit: '',
          hint: '1338.90',
        },
        {
          id: 'au',
          label: 'The flux at 1 AU (W/m²)',
          unit: '',
          hint: '1361.60',
        },
      ],
      validate: v => {
        if (![v.earth, v.au].every(Number.isFinite)) return null;
        if (near(v.earth, 1338.9, 0.1) && near(v.au, 1361.6, 0.1)) {
          return {
            level: 'ok',
            message:
              '1338.90 at the Earth and 1361.60 at 1 AU: the Earth was 0.8 percent farther than one astronomical unit, so its flux was 1.7 percent lower than at 1 AU. A flux is only comparable with another once both are at the same distance.',
          };
        }
        return {
          level: 'error',
          message:
            'Use one day and read “At the Earth” and “At 1 AU” (the first and the last day are the same here).',
        };
      },
      tool: SP({ days: 1, correct: 1 }),
    },
    {
      sid: 'power-predict',
      stage: STAGE,
      type: 'predict',
      reveal: 'luminosity',
      title: 'How much power in all?',
      body: `The Sun sends about 1361 W through every square meter at 1 AU, in every direction. The area of a
             sphere of radius 1 AU is about 2.8 &times; 10<sup>23</sup> square meters.`,
      prompt: 'The Sun’s total power, its luminosity, will be about&hellip;',
      options: [
        '4 × 10²⁶ W',
        '4 × 10²⁰ W',
        '4 × 10³² W',
        '1361 W, the same as the flux',
      ],
      answer: 0,
      hints: ['Multiply the flux by the area: 1361 × 2.8 × 10²³.'],
      because:
        'About 4 × 10²⁶ W, 400 trillion trillion watts: 1361 W per square meter times 2.8 × 10²³ square meters. The next step reads it from the instrument with every measured day.',
      tool: SP({ days: 6, correct: 1 }),
    },
    {
      sid: 'luminosity',
      stage: STAGE,
      type: 'measure',
      title: 'The Sun’s luminosity and temperature',
      body: `Use all six days. The instrument brings each to 1 AU, takes the mean, and multiplies by the
             area of the sphere. The temperature is the one a black surface the size of the Sun
             would need to radiate that power. Read the <strong>luminosity</strong> in units of
             10<sup>26</sup> W and the <strong>effective temperature</strong>.`,
      fields: [
        {
          id: 'lum',
          label: 'The Sun’s luminosity (× 10²⁶ W)',
          unit: '',
          hint: '3.828',
        },
        {
          id: 'teff',
          label: 'The effective temperature',
          unit: 'K',
          hint: '5772',
        },
      ],
      validate: v => {
        if (![v.lum, v.teff].every(Number.isFinite)) return null;
        if (near(v.lum, 3.828, 0.012) && near(v.teff, 5772, 3)) {
          return {
            level: 'ok',
            message:
              '3.828 × 10²⁶ W and 5772 K. That is the 5772 K of the Sun in Color and Temperature, and the class G of A Universe of Stars. It is a surface that radiates like a black body, not a temperature you could measure with a thermometer anywhere on the Sun.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the days to 6 with the correction on, and read “The Sun’s luminosity” and “Effective temperature”.',
        };
      },
      tool: SP({ days: 6, correct: 1 }),
    },
    {
      sid: 'forget-the-au',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'What if the correction is left out?',
      body: `Switch the correction off. The luminosity comes out lower. The Earth was between 1.0084 and
             1.0096 AU from the Sun on these days.`,
      prompt: 'Why is it lower, and by how much?',
      options: [
        'The Earth was a little farther than 1 AU, so each flux is lower than at 1 AU: about 1.8 percent too low',
        'The Sun gave out 1.8 percent less power on these days than on any other',
        'Leaving it out changes nothing: a flux is a flux',
        'The Earth was nearer than 1 AU, so the flux is higher and the luminosity too high',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'dimmer',
          option: 1,
          say: 'The correction is for where the Earth was, not for what the Sun did. At 1 AU the six days differ by less than 0.1 percent; the rest of the 1.8 percent is the distance.',
        },
        {
          id: 'same',
          option: 2,
          say: 'A flux falls as the square of the distance, so it depends on where it was measured. Two fluxes are only comparable at one distance.',
        },
      ],
      hints: ['Is the Earth’s distance on these days more or less than 1 AU?'],
      because:
        'The Earth was 0.8 to 1 percent farther than 1 AU, so each flux is about 1.7 to 1.9 percent lower than it would be at 1 AU. Skipping the correction gives a luminosity 1.8 percent too low and a temperature of 5746 K instead of 5772 K.',
      tool: SP({ days: 6, correct: 0 }),
    },
    {
      sid: 'what-you-worked-out',
      stage: STAGE,
      type: 'read',
      title: 'What you worked out',
      body: `A flux measured at the Earth is brought to 1 AU with the distance, and six days give 1361.2 W/m<sup>2</sup>
             at 1 AU. Multiplied by the area of a sphere it is a luminosity of 3.828 &times; 10<sup>26</sup> W, and
             a surface of the Sun&rsquo;s size would have to be at 5772 K to radiate it. The correction matters:
             leaving it out gives a luminosity 1.8 percent too low. The deeper steps look at what the six days
             show, how sure the mean is and what it leaves out.`,
      tool: SP({ days: 6, correct: 1 }),
    },
  ],
};

// -----------------------------------------------------------------------------
// 5 and 6. How Hot Is the Day Side? and Phases and Albedo (Prompt 202)
// -----------------------------------------------------------------------------
// The eclipse and phase slice of the atmosphere family, on the two instruments
// atmosphere-eclipse and atmosphere-phase. The data are synthetic: generated by
// js/kernels/atmospheres/synthetic.js with noise and a truth manifest, and every
// step says that no published table was compared. The wording follows the claim
// rule of the atmosphere family (ATMOSPHERES.md, Atmospheres II): a band is consistent with something under
// stated assumptions; nothing here names a gas or says what becomes of a
// planet's air over time.
const STAGE_BT = {
  spacing: 150,
  fit: true,
  stars: [{ role: 'star', name: 'A star', teffK: 6000, lumSun: 1.7 }],
};
const ECL = (values = {}, hide = []) => ({
  id: 'atmosphere-eclipse',
  values,
  hide,
});
const PHS = (values = {}, hide = []) => ({
  id: 'atmosphere-phase',
  values,
  hide,
});

export const HOW_HOT_IS_THE_DAY_SIDE = {
  id: 'how-hot-is-the-day-side',
  thumbnail: 'images/investigations/how-hot-is-the-day-side.webp',
  title: 'How Hot Is the Day Side?',
  subtitle:
    'An eclipse depth, a blackbody, and what a brightness temperature leaves out',
  duration: '15-25 min',
  level: 'Majors and upper-level astronomy',
  audience: 'intro',
  textbook: { chapter: 21, section: '21.4' },
  courseLevel: 'majors',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'algebra',
  prerequisites: ['why-venus-is-hot'],
  tags: ['exoplanets', 'solar-system'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Say what a secondary eclipse depth measures, and why it is a share of the light and not a temperature',
    'Turn an eclipse depth in one band into a brightness temperature, and say what that temperature assumes',
    'See why four noisy depths give four scattered temperatures and one blackbody fit',
    'See why the conversion refuses when reflected light could matter, and what a band that reads cooler can and cannot say',
  ],
  steps: [
    {
      sid: 'a-planet-behind-its-star',
      stage: STAGE_BT,
      type: 'read',
      title: 'A planet behind its star',
      body: `When a planet passes behind its star, the light drops by the planet&rsquo;s own share.
             That drop is the <strong>secondary eclipse depth</strong>. A hot Jupiter is near
             enough to its star that the share is a few thousand parts per million (ppm). The
             model here treats the planet as a uniform blackbody at one temperature and finds
             the depth in a band as the planet&rsquo;s radiance over the star&rsquo;s, times the
             radius ratio squared. Turned round, a depth gives a
             <strong>brightness temperature</strong>: the temperature of the blackbody that
             would give that depth in that band.
             \n\nThe depths in this investigation are <strong>synthetic</strong>: generated from
             the model with noise, with the true temperature recorded in a manifest you can
             read at the end. No published table was compared.`,
      tool: ECL({ dataset: 0, tPlanet: 2090, reflected: 1 }),
    },
    {
      sid: 'one-band',
      stage: STAGE_BT,
      type: 'measure',
      title: 'Planet X: one band',
      body: `Planet X has a radius ratio of 0.12 and a star at 6000 K. With the reflected light
             set to <strong>assume none</strong>, read the <strong>brightness temperature</strong>
             in <strong>band C</strong>.`,
      fields: [
        {
          id: 't',
          label: 'Brightness temperature, band C',
          unit: 'K',
          hint: '2094',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.t)) return null;
        if (near(v.t, 2094, 6)) {
          return {
            level: 'ok',
            message:
              'About 2,094 K, with a 95 percent interval from 2,063 to 2,125 K. It is the temperature of a blackbody that gives the depth in that band if no reflected light is in it: an assumption, stated, not a measurement of the ground.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose Planet X, set “Reflected light” to “assume none” and read “Brightness temperature, band C”.',
        };
      },
      tool: ECL({ dataset: 0, tPlanet: 2090, reflected: 1 }),
    },
    {
      sid: 'four-bands',
      stage: STAGE_BT,
      type: 'measure',
      title: 'Four bands, four temperatures',
      body: `Planet X is one blackbody, but the four bands do not give one number. Read the
             <strong>highest</strong> and the <strong>lowest</strong> of the four brightness temperatures.`,
      fields: [
        {
          id: 'hi',
          label: 'The highest of the four',
          unit: 'K',
          hint: '2171',
        },
        {
          id: 'lo',
          label: 'The lowest of the four',
          unit: 'K',
          hint: '2067',
        },
      ],
      validate: v => {
        if (![v.hi, v.lo].every(Number.isFinite)) return null;
        if (near(v.hi, 2171, 6) && near(v.lo, 2067, 6)) {
          return {
            level: 'ok',
            message:
              'Band A reads 2,171 K and band B 2,067 K, 104 K apart. Each depth carries 40 ppm of noise, which is the spread you see, so the four numbers are four readings of one temperature, not four temperatures.',
          };
        }
        return {
          level: 'error',
          message:
            'Read the four “Brightness temperature” rows for Planet X with the reflected light set to “assume none”, and report the highest and the lowest.',
        };
      },
      tool: ECL({ dataset: 0, tPlanet: 2090, reflected: 1 }),
    },
    {
      sid: 'why-the-scatter',
      stage: STAGE_BT,
      type: 'question',
      kind: 'choice',
      title: 'Why do the four disagree?',
      body: `The four brightness temperatures of Planet X run from 2,067 K to 2,171 K.`,
      prompt: 'What is the most reasonable reading of that spread?',
      options: [
        'The day side really has four different temperatures, one for each band',
        'Each depth has noise, so the four readings scatter around one value',
        'The bands have different widths, so they must give different temperatures',
        'The model has failed and its numbers should be thrown away',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'real-layers',
          option: 0,
          say: 'The planet is one blackbody here, by construction: the spread is noise. A real planet could have different temperatures in different bands, but you could not tell from scatter of this size.',
        },
        {
          id: 'band-width',
          option: 2,
          say: 'A blackbody gives the same temperature in a wide band as in a narrow one; the model already integrates over each band.',
        },
      ],
      hints: [
        'Each depth is quoted with a noise of 40 ppm. How big is that against the depths?',
      ],
      because:
        'A depth of a few hundred to a few thousand ppm with 40 ppm of noise gives a temperature uncertain by tens of kelvin, so four readings of one blackbody scatter by about that much. The next step fits one temperature to all four.',
      tool: ECL({ dataset: 0, tPlanet: 2090, reflected: 1 }),
    },
    {
      sid: 'match-by-hand',
      stage: STAGE_BT,
      type: 'measure',
      title: 'Match the four depths by hand',
      body: `Move <strong>My blackbody temperature</strong> until the curve runs through the four
             points. The instrument reports a <strong>chi-square</strong>: how far the four depths are
             from your curve, in units of their noise. It is about 4 or less when a model fits four
             depths well. Report your temperature and its chi-square.`,
      fields: [
        {
          id: 't',
          label: 'My blackbody temperature',
          unit: 'K',
          hint: '2090',
        },
        { id: 'chi', label: 'Its chi-square', unit: '', hint: '6.5' },
      ],
      validate: v => {
        if (![v.t, v.chi].every(Number.isFinite)) return null;
        if (near(v.t, 2090, 30) && v.chi >= 5 && v.chi <= 15) {
          return {
            level: 'ok',
            message:
              'The least chi-square is 6.5 at 2,090 K, a little above the 4 or so of a good fit: with four points and noise, that is what one blackbody gives. A single temperature fits all four bands of Planet X.',
          };
        }
        return {
          level: 'error',
          message:
            'Move “My blackbody temperature” until the chi-square is at its smallest, near 2,090 K, and report both numbers from the “My blackbody against the four depths” row.',
        };
      },
      tool: ECL({ dataset: 0, tPlanet: 1500, reflected: 1 }),
    },
    {
      sid: 'reflected-light',
      stage: STAGE_BT,
      type: 'measure',
      title: 'What if some of that light is reflected?',
      body: `A planet at 8 radii from its star also reflects starlight, at most about
             0.3 of what falls on it. Set <strong>Reflected light</strong> to
             <strong>allow for it</strong> and count how many of the four bands the model
             still converts to a temperature.`,
      fields: [
        {
          id: 'n',
          label: 'Bands converted to a temperature',
          unit: '',
          hint: '0',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.n)) return null;
        if (v.n === 0) {
          return {
            level: 'ok',
            message:
              'None. At 8 planet radii, reflected light with an albedo of up to 0.3 could be 4,688 ppm, more than the largest of the four depths, 2,817 ppm. A depth is not turned into a temperature until you say what the reflected light is, which is why the instrument refuses and why “assume none” is a stated assumption.',
          };
        }
        return {
          level: 'error',
          message:
            'Set “Reflected light” to “allow for it” and count the rows that give a temperature; each one that does not says it is not converted.',
        };
      },
      tool: ECL({ dataset: 0, tPlanet: 2090, reflected: 0 }),
    },
    {
      sid: 'planet-y-predict',
      stage: STAGE_BT,
      type: 'predict',
      reveal: 'planet-y',
      title: 'Planet Y: one band absorbs',
      body: `Planet Y is Planet X with one change: a cooler skin that is opaque in
             band C and clear in the other three bands.`,
      prompt:
        'Compared with Planet X&rsquo;s 2,094 K, Planet Y&rsquo;s brightness temperature in band C will be&hellip;',
      options: [
        'higher, because the skin adds heat',
        'about the same, because the planet is the same',
        'lower, because that band sees the cooler skin',
        'unreadable, because the model always refuses a dip',
      ],
      answer: 2,
      hints: [
        'Where the skin is opaque, the band shows the skin&rsquo;s temperature, which is 2^(&minus;1/4) of the planet&rsquo;s.',
      ],
      because:
        'The skin is cooler than the planet, so the band that sees it reads cooler. The next step reads how much.',
      tool: ECL({ dataset: 1, tPlanet: 2090, reflected: 1 }),
    },
    {
      sid: 'planet-y',
      stage: STAGE_BT,
      type: 'measure',
      title: 'Planet Y: one band reads cooler',
      body: `Planet Y has the same star and radius ratio. Set the planet to <strong>Planet Y</strong> and the
             reflected light back to <strong>assume none</strong>. Read the brightness temperature in
             band C and say how many kelvin cooler it is than Planet X&rsquo;s 2,094 K.`,
      fields: [
        {
          id: 'drop',
          label: 'Band C of Planet Y, cooler than Planet X’s by',
          unit: 'K',
          hint: '314',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.drop)) return null;
        if (near(v.drop, 314, 12)) {
          return {
            level: 'ok',
            message:
              'Band C reads about 1,780 K, 314 K below Planet X, while the other three bands are unchanged. In this model a band that sees a cooler layer, an isothermal skin at 2^(−1/4) of the planet’s temperature, reads cooler: its depth dips.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose Planet Y, set “Reflected light” to “assume none”, read band C and subtract it from 2,094 K.',
        };
      },
      tool: ECL({ dataset: 1, tPlanet: 2090, reflected: 1 }),
    },
    {
      sid: 'what-a-dip-says',
      stage: STAGE_BT,
      type: 'question',
      kind: 'choice',
      title: 'What does the dip say?',
      body: `One band of Planet Y reads 314 K cooler than the others.`,
      prompt: 'What is the most reasonable reading?',
      options: [
        'The day side is cooler everywhere, so every band should dip together',
        'That band sees a cooler layer higher up, which one isothermal skin can reproduce; the data do not say which absorber, or that the skin is the only cause',
        'The band shows the planet has an atmosphere of one particular gas',
        'A blackbody cannot dip, so the depth in that band must be an error',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'everywhere',
          option: 0,
          say: 'The other three bands agree with Planet X. Only the one band dips, which is what a layer that absorbs in that band would do.',
        },
        {
          id: 'one-gas',
          option: 2,
          say: 'A depth in one band is consistent with an absorber in that band under the model’s assumptions. It does not say which absorber, and other causes could give the same dip.',
        },
        {
          id: 'blackbody-cannot',
          option: 3,
          say: 'A planet seen through a cooler layer does look cooler in the band where the layer is opaque. The model builds that in: a band can only be a dip, never a bump.',
        },
      ],
      hints: [
        'Compare the three bands that did not move with the one that did.',
      ],
      because:
        'The model puts one isothermal skin over the planet. Where the skin is opaque the band shows the skin’s lower temperature. That reproduces the dip, and so could other things; the data are one depth in one band, and say nothing about what the absorber is.',
      tool: ECL({ dataset: 1, tPlanet: 2090, reflected: 1 }),
    },
    {
      sid: 'what-you-worked-out',
      stage: STAGE_BT,
      type: 'read',
      title: 'What you worked out',
      body: `An eclipse depth is a share of the light, a few thousand ppm for a hot Jupiter. In one
             band it converts to a brightness temperature, the temperature of a blackbody that gives
             that depth, only if you say the reflected light is small: at 8 planet radii the
             instrument will not convert without it. Four noisy depths scatter by about 100 K
             around one blackbody at 2,090 K. A band that reads cooler is consistent with a cooler
             layer in that band under a one-skin model; it does not name the absorber. The depths
             were synthetic, generated from a planet at 2,100 K with a recorded noise, and no
             published table was compared.`,
      tool: ECL({ dataset: 1, tPlanet: 2090, reflected: 1 }),
    },
  ],
};

export const PHASES_AND_ALBEDO = {
  id: 'phases-and-albedo',
  thumbnail: 'images/investigations/phases-and-albedo.webp',
  title: 'Phases and Albedo',
  subtitle: 'A planet’s phase curve, a Lambert sphere, and the albedo it gives',
  duration: '15-25 min',
  level: 'Majors and upper-level astronomy',
  audience: 'intro',
  textbook: { chapter: 2, section: '2.3' },
  courseLevel: 'majors',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'algebra',
  prerequisites: ['phases-and-eclipses'],
  tags: ['exoplanets', 'solar-system'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Say why the light a planet reflects follows its phase, as the Moon’s does',
    'Read a geometric albedo from a phase curve and turn it into the Bond albedo of a Lambert sphere',
    'Find the albedo that fits by hand and by chi-square',
    'See a curve a Lambert sphere does not describe, and say why the model returns no albedo for it',
  ],
  steps: [
    {
      sid: 'reflected-light-has-phases',
      stage: STAGE_BT,
      type: 'read',
      title: 'Light that follows the phase',
      body: `A planet shines by reflected starlight, so what we see changes with its phase, as the
             Moon&rsquo;s does in Phases and Eclipses. At <strong>phase angle 0</strong> the planet
             is full, behind its star; at 90 degrees it is half lit; at 180 degrees it is new. For a
             <strong>Lambert sphere</strong>, one that scatters light equally in every direction,
             the curve has one shape, and its height is the <strong>geometric albedo</strong>.
             \n\nThe curves here are <strong>synthetic</strong>: generated from a model with noise,
             with the truth recorded in a manifest. No published table was compared.`,
      tool: PHS({ dataset: 0, albedo: 0.2 }),
    },
    {
      sid: 'full-phase-albedo',
      stage: STAGE_BT,
      type: 'measure',
      title: 'Planet P: the albedo that fits',
      body: `Planet P sits 10 planet radii from its star. The instrument fits a Lambert sphere
             to its 24 points. Read the <strong>geometric albedo that fits</strong> and the
             <strong>Bond albedo</strong> of that sphere.`,
      fields: [
        {
          id: 'ag',
          label: 'Geometric albedo of the Lambert sphere that fits',
          unit: '',
          hint: '0.35',
        },
        {
          id: 'ab',
          label: 'Bond albedo of that sphere',
          unit: '',
          hint: '0.52',
        },
      ],
      validate: v => {
        if (![v.ag, v.ab].every(Number.isFinite)) return null;
        if (near(v.ag, 0.35, 0.01) && near(v.ab, 0.52, 0.015)) {
          return {
            level: 'ok',
            message:
              'A geometric albedo of 0.35, between 0.34 and 0.36 at 95 percent, and a Bond albedo of 0.52, which is 3/2 of it. The albedo found is the albedo of a Lambert sphere: a different kind of surface would give a different number.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose Planet P and read “Geometric albedo of a Lambert sphere that fits” and “Bond albedo of that Lambert sphere”.',
        };
      },
      tool: PHS({ dataset: 0, albedo: 0.35 }),
    },
    {
      sid: 'why-three-halves',
      stage: STAGE_BT,
      type: 'question',
      kind: 'choice',
      title: 'Why is the Bond albedo larger?',
      body: `For Planet P the Bond albedo is 0.52 and the geometric albedo 0.35.`,
      prompt: 'Why are they different?',
      options: [
        'The geometric albedo is the brightness at full phase against a flat white disc; the Bond albedo counts the light sent in every direction, and a Lambert sphere sends 3/2 as much in all directions as its full-phase brightness suggests',
        'The Bond albedo includes the planet’s own heat',
        'The two numbers are the same quantity measured twice, and the difference is noise',
        'The Bond albedo is always twice the geometric albedo',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'own-heat',
          option: 1,
          say: 'Neither albedo includes the planet’s own heat: both are fractions of the starlight reflected.',
        },
        {
          id: 'same',
          option: 2,
          say: 'They are different quantities: one is the full-phase brightness, the other the share of all the light reflected in every direction.',
        },
        {
          id: 'twice',
          option: 3,
          say: 'The factor is 3/2 for a Lambert sphere and a different number for another kind of sphere: it comes from the phase function.',
        },
      ],
      hints: [
        'The phase integral is the integral of the phase curve over every angle; for a Lambert sphere it is 3/2.',
      ],
      because:
        'The Bond albedo is the geometric albedo times the phase integral, 3/2 for a Lambert sphere. It rests on the assumption that the surface scatters like one.',
      tool: PHS({ dataset: 0, albedo: 0.35 }),
    },
    {
      sid: 'match-by-hand',
      stage: STAGE_BT,
      type: 'measure',
      title: 'Match the curve by hand',
      body: `Move <strong>My geometric albedo</strong> until the curve runs through the points. The
             instrument reports a chi-square for your albedo: for 24 points it is about 23 when a
             model fits. Report your albedo and its chi-square.`,
      fields: [
        { id: 'ag', label: 'My geometric albedo', unit: '', hint: '0.35' },
        { id: 'chi', label: 'Its chi-square', unit: '', hint: '31.2' },
      ],
      validate: v => {
        if (![v.ag, v.chi].every(Number.isFinite)) return null;
        if (near(v.ag, 0.35, 0.015) && v.chi >= 28 && v.chi <= 45) {
          return {
            level: 'ok',
            message:
              'The least chi-square is 31.2 at an albedo of 0.35, a little above the 23 expected for 24 points: it is what one Lambert curve gives with this noise. Moving 0.05 either way raises it to 186 and 191, so the curve fixes the albedo.',
          };
        }
        return {
          level: 'error',
          message:
            'Move “My geometric albedo” until the chi-square is at its smallest, near 0.35, and report both numbers from the “My albedo against the curve” row.',
        };
      },
      tool: PHS({ dataset: 0, albedo: 0.2 }),
    },
    {
      sid: 'planet-q-predict',
      stage: STAGE_BT,
      type: 'predict',
      reveal: 'planet-q',
      title: 'Planet Q looks the same',
      body: `Planet Q is at the same distance and its curve rises and falls in much the same way.
             Its noise is the same as Planet P&rsquo;s.`,
      prompt: 'Will a Lambert sphere describe Planet Q&rsquo;s curve?',
      options: [
        'Yes: any curve that rises toward full phase is a Lambert sphere',
        'Yes, with a different albedo',
        'No: the shape is slightly different from a Lambert sphere’s, and 24 points at this noise are enough to show it',
        'It cannot be said: a fit never says a model is wrong',
      ],
      answer: 2,
      hints: [
        'Compare the fit’s chi-square with the 0.99 quantile of chi-square for 23 degrees of freedom, about 41.7.',
      ],
      because:
        'The shape of Planet Q’s curve is that of another kind of sphere, and the 24 points are precise enough to show it. The next step reads the chi-square.',
      tool: PHS({ dataset: 1, albedo: 0.35 }),
    },
    {
      sid: 'planet-q',
      stage: STAGE_BT,
      type: 'measure',
      title: 'Planet Q: no albedo',
      body: `Set the planet to <strong>Planet Q</strong>. Read the chi-square of the best
             Lambert fit and the degrees of freedom, and see what the instrument returns for the albedo.`,
      fields: [
        {
          id: 'chi',
          label: 'Chi-square of the best Lambert fit',
          unit: '',
          hint: '82',
        },
        { id: 'dof', label: 'Degrees of freedom', unit: '', hint: '23' },
      ],
      validate: v => {
        if (![v.chi, v.dof].every(Number.isFinite)) return null;
        if (near(v.chi, 82, 1.5) && v.dof === 23) {
          return {
            level: 'ok',
            message:
              '82 for 23 degrees of freedom, far above the 41.7 that a true Lambert sphere stays under 99 times in 100. The model returns no albedo: a number would only be the albedo of a Lambert sphere, and this planet is not one. The curve is generated from a Lommel-Seeliger sphere, which is in the manifest.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose Planet Q and read the “Fit against the curve” row: the chi-square and the degrees of freedom.',
        };
      },
      tool: PHS({ dataset: 1, albedo: 0.35 }),
    },
    {
      sid: 'what-you-worked-out',
      stage: STAGE_BT,
      type: 'read',
      title: 'What you worked out',
      body: `Reflected light follows the phase. A Lambert sphere gives a curve of one shape whose
             height is the geometric albedo, 0.35 for Planet P, and the Bond albedo is 3/2 of it, 0.52.
             The albedo found is the albedo of a Lambert sphere: where a curve is not Lambertian, as
             Planet Q&rsquo;s is not, the model returns no albedo and says so. Both planets were synthetic,
             with the truth recorded, and no published table was compared.`,
      tool: PHS({ dataset: 1, albedo: 0.35 }),
    },
  ],
};

/** The lessons, in order: what the barrel registers. */
export default [
  WHY_VENUS_IS_HOT,
  TWO_GREENHOUSE_MODELS,
  THE_TURNING_SUN,
  THE_SUNS_POWER,
  HOW_HOT_IS_THE_DAY_SIDE,
  PHASES_AND_ALBEDO,
];
