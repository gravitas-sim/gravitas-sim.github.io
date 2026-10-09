// =============================================================================
// Color and Temperature
// -----------------------------------------------------------------------------
// Content only, no imports: every step that needs a live number is handed a
// `ctx` by the engine, so a lesson stays a description of what is being taught
// rather than a piece of the simulation. The card paragraph is not here; it is
// written once in summaries.js (and summaries.es.js).
//
// Every step carries a `sid`: an opaque, stable id that student progress is
// keyed by. Reword a step, move it, translate it - but never change its sid, or
// every answer already saved against it is orphaned. See
// js/investigations/progressSchema.js.
//
// Every expected value is computed from the radiation kernel (RADIATION.md) and
// held to it by tests/lightInvestigations.test.js, which also grades each step
// headlessly with the lesson's own checker.
// =============================================================================

/** Three hypothetical stars on the canvas: a display, not an orbit. */
const STARS = {
  spacing: 95,
  fit: true,
  stars: [
    { role: 'cool', name: 'Cool', teffK: 3000, lumSun: 0.073 },
    { role: 'sun', name: 'The Sun', teffK: 5772, lumSun: 1 },
    { role: 'hot', name: 'Hot', teffK: 10000, lumSun: 9 },
  ],
};
const BB = (extra = {}) => ({ id: 'blackbody', ...extra });

const COLOR_AND_TEMPERATURE = {
  id: 'color-and-temperature',
  thumbnail: 'images/scenarios/solar-system.webp',
  title: 'Color and Temperature',
  subtitle: 'Predict, then measure, what a hot glowing thing looks like',
  duration: '30-40 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 5, section: '5.2' },
  courseLevel: 'survey',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'algebra',
  prerequisites: [],
  tags: ['stars', 'observing'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Predict how the peak wavelength of a glowing object changes with its temperature, then measure it',
    'Use Wien’s law to find a temperature from a peak wavelength',
    'Explain why the peak wavelength is not the color the eye sees',
    'Recover a temperature from a color index',
    'Say where a real star departs from a blackbody',
  ],
  steps: [
    {
      sid: 'everything-glows',
      stage: STARS,
      type: 'read',
      title: 'Everything glows',
      body: `A hot stove ring goes dull red, then orange, then yellow-white. The
             light it gives off depends on its temperature and on almost
             nothing else. An object that absorbs everything and gives off
             light by temperature alone is a <strong>blackbody</strong>, and a
             star is close enough to one to be worth studying as one.
             \n\nThe instrument draws a blackbody's light against wavelength.
             It is a computed curve (Planck's law), not a measurement of a
             star. The three stars on the canvas are hypothetical, set to 3,000,
             5,772 and 10,000&nbsp;K.`,
      tool: BB({ values: { T: 5772 } }),
    },
    {
      sid: 'predict-the-peak',
      stage: STARS,
      type: 'predict',
      reveal: 'three-peaks',
      title: 'Predict the peak',
      body: `Every blackbody curve has a peak: the wavelength at which it gives
             off the most light per unit of wavelength. Do not move the slider
             yet.`,
      prompt:
        'If a blackbody is heated from 3,000 K to 6,000 K, its peak wavelength&hellip;',
      options: [
        'doubles',
        'is cut in half',
        'stays where it is, and only the curve grows',
        'drops to about 70 percent of what it was',
      ],
      answer: 1,
      hints: [
        'Hotter things give off light of shorter wavelength: think of a metal going from red to white.',
      ],
      because:
        'Cut in half. The peak wavelength is inversely proportional to temperature (Wien’s law): twice as hot, half the wavelength. The next step measures it.',
      tool: BB({ values: { T: 3000 } }),
    },
    {
      sid: 'three-peaks',
      stage: STARS,
      type: 'measure',
      title: 'Measure three peaks',
      body: `Set the temperature to each value below and read the peak
             wavelength from the list under the plot.`,
      fields: [
        { id: 'p3', label: 'Peak at 3,000 K', unit: 'nm', hint: '965.9' },
        { id: 'p6', label: 'Peak at 6,000 K', unit: 'nm', hint: '483' },
        { id: 'p12', label: 'Peak at 12,000 K', unit: 'nm', hint: '241.5' },
        {
          id: 'prod',
          label: 'Peak × temperature at 6,000 K',
          unit: 'nm·K',
          decimals: 0,
          compute: v => v.p6 * 6000,
        },
      ],
      validate: v => {
        if (![v.p3, v.p6, v.p12].every(Number.isFinite)) return null;
        const ok = (x, want) => Math.abs(x - want) <= 0.015 * want;
        if (ok(v.p3, 965.9) && ok(v.p6, 483) && ok(v.p12, 241.5)) {
          return {
            level: 'ok',
            message:
              'Each doubling of the temperature halves the peak wavelength, so peak × temperature is the same every time: about 2.9 million nm·K. That constant is Wien’s law.',
          };
        }
        return {
          level: 'error',
          message:
            'Read the “Peak wavelength” row at each temperature, in nm. Doubling the temperature should halve it.',
        };
      },
      tool: BB({ values: { T: 3000 } }),
    },
    {
      sid: 'peak-of-4000',
      stage: STARS,
      type: 'question',
      kind: 'numeric',
      title: 'Use the rule',
      body: `Peak × temperature is a constant, about 2.898 million nm·K. Use it
             before you check it with the instrument.`,
      prompt: 'Peak wavelength of a 4,000 K blackbody',
      unit: 'nm',
      answer: 724.4,
      tolerance: 15,
      hints: [
        'Divide the constant by the temperature.',
        'The units come out in nm because the constant is in nm·K.',
      ],
      worked: '2,897,772 nm·K ÷ 4,000 K = 724.4 nm.',
      feedback: {
        close:
          'Close. Divide the constant by the temperature, with no other factor.',
        'wrong-order-of-magnitude':
          'A power of ten out. The peak of a star-like blackbody is in or near the visible, hundreds of nanometers.',
        off: 'Wien’s law gives wavelength = constant ÷ temperature.',
      },
      tool: BB({ values: { T: 4000 } }),
    },
    {
      sid: 'temperature-from-peak',
      stage: STARS,
      type: 'question',
      kind: 'numeric',
      title: 'Run it backwards',
      body: `A star’s spectrum peaks at 380&nbsp;nm, at the violet edge of the
             visible. Wien’s law works either way round.`,
      prompt: 'Temperature of a blackbody whose spectrum peaks at 380 nm',
      unit: 'K',
      answer: 7626,
      tolerance: 150,
      hints: [
        'Temperature = constant ÷ peak wavelength.',
        'Keep the wavelength in nm so the units match the constant.',
      ],
      worked: '2,897,772 nm·K ÷ 380 nm = 7,626 K.',
      feedback: {
        close:
          'Close. Divide the constant by the wavelength, not the other way round.',
        'wrong-order-of-magnitude':
          'A power of ten out. Star surfaces run from a few thousand to a few tens of thousands of kelvin.',
        off: 'Temperature = constant ÷ wavelength, with the wavelength in nm.',
      },
      tool: BB({ values: { T: 7626 } }),
    },
    {
      sid: 'why-not-green',
      stage: STARS,
      type: 'question',
      kind: 'choice',
      title: 'The Sun’s peak is green',
      body: `Set the Sun’s temperature. Its peak is at about 502&nbsp;nm, which
             is green. The Sun does not look green.`,
      prompt: 'Why not?',
      options: [
        'The peak is a single wavelength; the eye adds up all the visible light, and the curve is broad',
        'The Sun is not a blackbody, so Wien’s law does not apply',
        'Earth’s atmosphere turns the light white',
        'The peak is really in the infrared',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'peak-is-color',
          option: 3,
          say: 'The peak is in the visible; check the position of the dashed line against the shaded band.',
        },
      ],
      hints: ['Look at how wide the curve is next to the shaded visible band.'],
      because:
        'The curve is broad: the Sun gives off plenty of light across the whole visible range, and the eye mixes it into a near-white. The peak wavelength says where the most light is, not what color a thing looks.',
      tool: BB({ values: { T: 5772 } }),
    },
    {
      sid: 'three-colors',
      stage: STARS,
      type: 'measure',
      title: 'Measure a color index',
      body: `Astronomers measure color as a difference of magnitudes through two
             filters. With the bands set to <strong>B &minus; V</strong>, read
             the color index at each temperature. A larger number is redder.
             The swatch shows roughly how the blackbody looks.`,
      fields: [
        { id: 'c3', label: 'B − V at 3,000 K', unit: '', hint: '1.69' },
        { id: 'c6', label: 'B − V at 6,000 K', unit: '', hint: '0.6' },
        { id: 'c10', label: 'B − V at 10,000 K', unit: '', hint: '0.15' },
      ],
      validate: v => {
        if (![v.c3, v.c6, v.c10].every(Number.isFinite)) return null;
        const ok = (x, want) => Math.abs(x - want) <= 0.05;
        if (ok(v.c3, 1.69) && ok(v.c6, 0.6) && ok(v.c10, 0.15)) {
          return {
            level: 'ok',
            message:
              'The cooler the blackbody, the larger the color index. A color is a thermometer, and unlike a peak wavelength it needs only two ordinary measurements of brightness.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the bands to B − V and read the color index row. Cooler should be redder, which is larger.',
        };
      },
      tool: BB({ values: { T: 3000, pair: 0 } }),
    },
    {
      sid: 'temperature-from-color',
      stage: STARS,
      type: 'question',
      kind: 'numeric',
      title: 'Find the temperature from the color',
      body: `A star has B &minus; V = 0.82. Move the temperature until the
             explorer gives that color index.`,
      prompt: 'Temperature of the blackbody with B − V = 0.82',
      unit: 'K',
      answer: 5000,
      tolerance: 250,
      hints: [
        'The index falls as the temperature rises, so move the slider until the row reads 0.82.',
      ],
      worked:
        'At the temperature where the B − V row reads 0.82, the blackbody is a little cooler than the Sun.',
      feedback: {
        close: 'Close. Nudge the slider and watch the color index row.',
        'wrong-order-of-magnitude':
          'A power of ten out. Set the slider first, then read the temperature from its label.',
        off: 'Cooler is redder is larger. If your index is too large, raise the temperature.',
      },
      tool: BB({ values: { T: 6000, pair: 0 } }),
    },
    {
      sid: 'real-stars-differ',
      stage: STARS,
      type: 'question',
      kind: 'choice',
      title: 'Where the model stops',
      body: `A real star is not a perfect blackbody. Its atmosphere absorbs at
             many wavelengths (the lines of the next investigation) and its
             color is measured through real filters.`,
      prompt: 'A color temperature found this way is best described as&hellip;',
      options: [
        'the temperature of the blackbody that would have this color',
        'exactly the star’s surface temperature',
        'the temperature of the star’s core',
        'meaningless, because stars are not blackbodies',
      ],
      answer: 0,
      hints: ['It is the answer to “which blackbody matches?”'],
      because:
        'It is the blackbody temperature that matches the color. It is close to the surface (effective) temperature for many stars and differs from it by the effects of the lines and edges in the real spectrum.',
      tool: BB({ values: { T: 5000, pair: 0 } }),
    },
    {
      sid: 'one-sentence',
      stage: STARS,
      type: 'question',
      kind: 'short',
      reflect: true,
      title: 'In your own words',
      body: `Two ways to take a temperature from light have appeared: a peak
             wavelength and a color index.`,
      prompt:
        'Which would you rather use on a faint star, and why? Say what each needs from the observation.',
      tool: BB({ values: { T: 5772 } }),
    },
    {
      sid: 'what-you-worked-out',
      stage: STARS,
      type: 'read',
      title: 'What you worked out',
      body: `A blackbody’s peak wavelength is the constant 2.898 million nm·K
             divided by its temperature. Its color index also falls steadily
             with temperature, and it is easier to measure on a faint star.
             Neither is the whole story: a real spectrum has lines in it, and
             the next investigation reads them.`,
    },
  ],
};

export default COLOR_AND_TEMPERATURE;
