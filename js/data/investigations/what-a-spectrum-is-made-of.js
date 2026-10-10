// =============================================================================
// What a Spectrum Is Made Of
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
// The instrument is the Light Lab's Kirchhoff demonstrator (js/lightWidgets.js):
// a blackbody, a uniform cloud of hydrogen and a detector, by the equation of
// transfer (js/light/model.js, kirchhoffIntensity). The only number the core
// asks a student to read is the demonstrator's own, checked against the
// measurement node by tests/lightInvestigations.test.js
// (tools/authoring/lightModels.mjs).
// =============================================================================

/**
 * Two placeholder stars on the canvas: a display, not an orbit and not the
 * spectra in the demonstrator. The demonstrator is where the light is.
 */
const STARS = {
  spacing: 150,
  fit: true,
  stars: [
    { role: 'source', name: 'Hot source', teffK: 6000, lumSun: 1 },
    { role: 'cloud', name: 'Cool cloud', teffK: 4000, lumSun: 0.3 },
  ],
};
const KF = (values = {}) => ({ id: 'kirchhoff', values });
const SP = (values = {}) => ({ id: 'spectrum-viewer', values });

const WHAT_A_SPECTRUM_IS_MADE_OF = {
  id: 'what-a-spectrum-is-made-of',
  thumbnail: 'images/investigations/what-a-spectrum-is-made-of.webp',
  title: 'What a Spectrum Is Made Of',
  subtitle: 'Why one gas makes dark lines, bright lines, or none',
  duration: '15-25 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 5, section: '5.3' },
  courseLevel: 'survey',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'algebra',
  prerequisites: ['lines-and-motion'],
  tags: ['stars', 'observing'],
  lock: { placement: true, inspector: true },
  objectives: [
    'State the three kinds of spectrum a source can make: a continuum, bright lines and dark lines',
    'Predict, then measure, what a cloud of gas does to the light behind it',
    'Explain why a cool cloud in front of a hotter source makes dark lines, and a hotter one makes bright lines',
    'Say what a spectrum with dark lines tells you about the temperature of the gas that made them',
    'Recognize that the same gas can make absorption lines or emission lines, depending on what is behind it',
  ],
  steps: [
    {
      sid: 'a-hot-solid',
      stage: STARS,
      type: 'read',
      title: 'A hot, dense source',
      body: `A hot solid, liquid or thick gas glows at every wavelength, and the
             spectrum it makes is a smooth curve: a <strong>continuum</strong>.
             You met its shape in Color and Temperature, the blackbody curve. A
             star’s hot, dense inner layers make one.
             \n\nThe demonstrator below is a model: a hot blackbody, a cloud of
             thin hydrogen gas and a detector. It starts with the source alone.
             Everything it draws and every number in its list is computed, not
             measured; the planet and star pictures above are placeholders.`,
      tool: KF({ mode: 2, view: 0 }),
    },
    {
      sid: 'predict-the-cloud',
      stage: STARS,
      type: 'predict',
      reveal: 'measure-two-clouds',
      title: 'Put a cloud in the way',
      body: `A cloud of thin hydrogen gas, cooler than the source, is placed
             between the hot source and the detector. Do not change the
             demonstrator yet.`,
      prompt: 'Compared with the source alone, the detector now sees&hellip;',
      options: [
        'dark lines cut into the same continuum',
        'bright lines added to the continuum',
        'the same smooth continuum, unchanged',
        'no light at all, because the cloud blocks it',
      ],
      answer: 0,
      hints: [
        'Hydrogen atoms take light out of the beam, but only at the wavelengths they can absorb.',
      ],
      because:
        'Dark lines. The gas takes light out of the beam at its own wavelengths and lets the rest through. The next step measures it, and then asks what happens if the cloud is hotter.',
      tool: KF({ mode: 2, Ts: 6000, Tc: 4000, tau: 3, view: 0 }),
    },
    {
      sid: 'measure-two-clouds',
      stage: STARS,
      type: 'measure',
      title: 'Measure two clouds',
      body: `Set the demonstrator to look at <strong>the source, through the
             cloud</strong>, with a 6,000&nbsp;K source, a 4,000&nbsp;K cloud
             and gas 3 (the second preset does this), and zoom on H-alpha. Read
             the row “At the H-alpha center, brightness against the source’s”:
             100&nbsp;% would be no line at all. Then raise the cloud to
             8,000&nbsp;K, leaving everything else, and read it again.`,
      fields: [
        {
          id: 'cool',
          label: 'H-alpha center, cloud at 4,000 K',
          unit: '%',
          hint: '20',
        },
        {
          id: 'hot',
          label: 'H-alpha center, cloud at 8,000 K',
          unit: '%',
          hint: '250',
        },
      ],
      validate: v => {
        if (![v.cool, v.hot].every(Number.isFinite)) return null;
        if (Math.abs(v.cool - 19.9) <= 1.5 && Math.abs(v.hot - 251.6) <= 8) {
          return {
            level: 'ok',
            message:
              'Below 100 % the line is dark: the cloud takes out more light than it adds. Above 100 % it is bright: the cloud adds more than it takes out. It is the same gas and the same amount; only its temperature moved.',
          };
        }
        return {
          level: 'error',
          message:
            'Zoom on H-alpha with “the source, through the cloud” selected, then read the row “At the H-alpha center, brightness against the source’s” at each cloud temperature. The source stays at 6,000 K.',
        };
      },
      tool: KF({ mode: 0, Ts: 6000, Tc: 4000, tau: 3, view: 1 }),
    },
    {
      sid: 'what-flipped-it',
      stage: STARS,
      type: 'question',
      kind: 'choice',
      title: 'What flipped the line?',
      body: `In the two settings you measured, the gas was the same hydrogen in
             the same amount. The line went from dark to bright.`,
      prompt: 'What changed?',
      options: [
        'The cloud went from cooler than the source to hotter than it',
        'The cloud changed from hydrogen to some other gas',
        'The cloud got thicker, so it blocked more light',
        'The source got brighter',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'gas-decides',
          option: 1,
          say: 'The gas never changed: the lines are at the same wavelengths in both. Look at which slider you moved.',
        },
        {
          id: 'thickness-decides',
          option: 2,
          say: 'Gas amount stayed at 3. A thicker cloud makes the line stronger, whichever way it points; it does not turn dark into bright.',
        },
      ],
      hints: ['Only one slider moved between the two readings.'],
      because:
        'The cloud’s temperature, against the source’s. A cloud also glows at its own temperature. Cooler than the source, it adds less than it takes out and the line is dark; hotter, it adds more and the line is bright.',
      tool: KF({ mode: 0, Ts: 6000, Tc: 8000, tau: 3, view: 1 }),
    },
    {
      sid: 'cloud-alone',
      stage: STARS,
      type: 'question',
      kind: 'choice',
      title: 'A cloud with nothing behind it',
      body: `Now look at <strong>the cloud alone</strong>, hot (8,000&nbsp;K),
             with no source behind it. The only light is the cloud’s own.`,
      prompt: 'What does the detector see?',
      options: [
        'bright lines on a dark background',
        'dark lines on a bright background',
        'a smooth continuum',
        'nothing at all',
      ],
      answer: 0,
      hints: ['A thin gas glows only at the wavelengths its atoms can emit.'],
      because:
        'Bright lines on a dark background, an emission spectrum. A thin hot gas glows only at its own wavelengths, so there is nothing between the lines. It is the same gas that made dark lines in front of a hotter source.',
      tool: KF({ mode: 1, Tc: 8000, tau: 3, view: 0 }),
    },
    {
      sid: 'same-temperature',
      stage: STARS,
      type: 'question',
      kind: 'choice',
      title: 'The same temperature',
      body: `Set the source and the cloud both to 6,000&nbsp;K, with the source
             seen through the cloud and plenty of gas (3). Look at the whole
             spectrum, then at H-alpha.`,
      prompt: 'What do you see?',
      options: [
        'a smooth continuum with no lines at all',
        'deep dark lines',
        'bright lines',
        'no light',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'gas-always-absorbs',
          option: 1,
          say: 'Try it: the gas is there, but a cloud at the source’s own temperature gives back exactly the light it takes out.',
        },
      ],
      hints: [
        'Compare the cloud’s own blackbody at H-alpha with the source’s, in the list under the plot.',
      ],
      because:
        'No lines. A cloud at the source’s temperature glows as brightly, at every wavelength, as the light it removes from the source, so the two cancel and the spectrum is the continuum. Lines appear only when the cloud and the source differ in temperature.',
      tool: KF({ mode: 0, Ts: 6000, Tc: 6000, tau: 3, view: 0 }),
    },
    {
      sid: 'why-cool-absorbs',
      stage: STARS,
      type: 'question',
      kind: 'short',
      rubric:
        'Full credit for both halves: the cloud removes light from the source at the wavelengths of its lines, and it also glows at its own temperature, but a cooler cloud glows less than the light it removes there, so the line comes out darker than the continuum. Credit an answer that says the line is pulled toward the cloud’s own brightness, or that the cloud emits less than it absorbs. Do not credit an answer that says only that gas absorbs light, or that cool things are dark, without saying why the cloud’s own glow does not fill the line in.',
      title: 'In your own words',
      body: `A cool cloud is not dark: it glows too, at its own temperature.`,
      prompt:
        'Why does a cool cloud in front of a hotter source still make dark lines?',
      tool: KF({ mode: 0, Ts: 6000, Tc: 4000, tau: 3, view: 1 }),
    },
    {
      sid: 'the-sun-is-the-cloud',
      stage: STARS,
      type: 'question',
      kind: 'choice',
      title: 'A star’s dark lines',
      body: `The viewer shows the spectrum of the <strong>G star</strong>, a star
             like the Sun, from the Sloan Digital Sky Survey. It is a smooth
             continuum with dark lines cut into it.`,
      prompt: 'What does that say about the gas in the star’s atmosphere?',
      options: [
        'The gas that made the lines is cooler than the hot layers behind it',
        'The gas that made the lines is hotter than the layers behind it',
        'The star has no atmosphere',
        'The star is moving toward us',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'motion-makes-lines',
          option: 3,
          say: 'Motion moves lines, as in Lines and Motion; it does not make them. The lines are there for a star at rest.',
        },
      ],
      hints: [
        'Dark lines are what a cooler gas leaves on the light of a hotter source behind it.',
      ],
      because:
        'Cooler. Dark lines mean the absorbing gas is cooler than the layers it is in front of: in a star, the temperature falls outward through the atmosphere, so the cooler upper layers print their lines on the hot, glowing interior.',
      tool: SP({ src: 1, view: 0 }),
    },
    {
      sid: 'flash-spectrum',
      stage: STARS,
      type: 'question',
      kind: 'choice',
      title: 'The flash at an eclipse',
      body: `In a total solar eclipse the Moon covers the bright surface of the
             Sun. For a second or two, a thin layer of hot gas above the
             surface shows beyond the Moon’s edge, with nothing bright behind
             it, and a spectrograph pointed at it records a “flash spectrum”.`,
      prompt: 'What does the flash spectrum show?',
      options: [
        'bright lines, at the same wavelengths as the Sun’s dark lines',
        'dark lines, at the same wavelengths as the Sun’s dark lines',
        'a smooth continuum',
        'bright lines at wavelengths where the Sun has no dark lines',
      ],
      answer: 0,
      hints: ['The gas is the same; what has changed is what is behind it.'],
      because:
        'Bright lines, at the wavelengths of the Sun’s dark lines. Seen against the bright surface the layer absorbs; seen alone against the dark sky it glows. It was first recorded this way in 1870, and it showed that the same atoms make both.',
      tool: KF({ mode: 1, Tc: 6000, tau: 3, view: 0 }),
    },
    {
      sid: 'what-you-worked-out',
      stage: STARS,
      type: 'read',
      title: 'What you worked out',
      body: `A hot dense source makes a continuum. A thin gas has lines at
             wavelengths that belong to its atoms. Seen alone and hot, it
             makes bright lines. In front of a hotter source it makes dark
             lines, because it takes light out of the beam and adds back less
             than it took. At the same temperature as the source it makes none.
             So a spectrum with dark lines says the gas that made them is
             cooler than what is behind it, and a spectrum with bright lines
             says a hot gas is being seen on its own or against something
             cooler.`,
      tool: KF({ mode: 0, Ts: 6000, Tc: 4000, tau: 3, view: 0 }),
    },
  ],
};

export default WHAT_A_SPECTRUM_IS_MADE_OF;
