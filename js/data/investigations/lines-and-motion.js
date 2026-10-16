// =============================================================================
// Lines and Motion
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
// The instrument is the Light Lab's spectrum viewer (js/lightWidgets.js): four
// OBSERVED SDSS spectra and three SYNTHETIC ones whose shifts the viewer does
// not show. Every expected value is the measurement node's own result on those
// spectra (js/measure/spectrumLine.js), recomputed by
// tools/authoring/lightModels.mjs and held to the lesson by
// tests/lightInvestigations.test.js.
// =============================================================================

/**
 * Three placeholder stars on the canvas: a display, not an orbit and not the
 * spectra in the viewer. The viewer is where the light is.
 */
const STARS = {
  spacing: 95,
  fit: true,
  stars: [
    { role: 'one', name: 'Star 1', teffK: 5800, lumSun: 1 },
    { role: 'two', name: 'Star 2', teffK: 5800, lumSun: 1 },
    { role: 'three', name: 'Star 3', teffK: 5800, lumSun: 1 },
  ],
};
const SP = (values = {}) => ({ id: 'spectrum-viewer', values });

const LINES_AND_MOTION = {
  id: 'lines-and-motion',
  thumbnail: 'images/investigations/lines-and-motion.webp',
  title: 'Lines and Motion',
  subtitle: 'Read a star’s lines, then measure how fast it moves',
  duration: '15-25 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 5, section: '5.4' },
  courseLevel: 'survey',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'algebra',
  prerequisites: ['color-and-temperature'],
  tags: ['stars', 'observing'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Identify hydrogen and calcium lines in real stellar spectra by their wavelengths',
    'Predict how a star’s motion along the line of sight moves its lines, then measure the shift',
    'Turn a measured shift into a velocity, with its sign and its uncertainty',
    'Say when a measured shift is too small, next to its uncertainty, to mean anything',
    'Explain why a shift tells only the motion toward or away from us',
  ],
  steps: [
    {
      sid: 'light-by-wavelength',
      stage: STARS,
      type: 'read',
      title: 'Light split by wavelength',
      body: `A blackbody gives a smooth curve. A real star’s light, spread out by
             wavelength, has <strong>dark lines</strong> cut into it: narrow
             wavelengths where atoms in the star’s atmosphere absorb light.
             Each kind of atom absorbs at its own wavelengths, so the lines
             say what the atmosphere is made of.
             \n\nThe viewer shows an <strong>observed</strong> spectrum of a
             real star, from the Sloan Digital Sky Survey. The short ticks along
             the top are the line list: where a laboratory finds each line when
             the source is at rest. The list under the plot names the deepest
             dips. The three stars on the canvas are placeholders; the light is
             in the viewer.`,
      tool: SP({ src: 0, view: 0 }),
    },
    {
      sid: 'hydrogen-in-the-a-star',
      stage: STARS,
      type: 'question',
      kind: 'choice',
      title: 'Name the lines',
      body: `The viewer is on the A star. The four deepest dips in the list sit
             at 4,103, 4,342, 4,863 and 6,565&nbsp;Å. The line list gives each
             one a name.`,
      prompt: 'Which element makes these four lines?',
      options: ['hydrogen', 'calcium', 'sodium', 'iron'],
      answer: 0,
      misconceptions: [
        {
          id: 'calcium-for-deep',
          option: 1,
          say: 'Calcium’s deepest line is at 3,934 Å, in the violet. Compare each wavelength in the list with the name beside it.',
        },
      ],
      hints: [
        'Read the names in the list: all four share the first letter of the same element.',
      ],
      because:
        'Hydrogen. The four dips are H-delta, H-gamma, H-beta and H-alpha, the visible lines of the Balmer series. A hot A star has the most of its hydrogen in the right state to absorb them.',
      tool: SP({ src: 0, view: 0 }),
    },
    {
      sid: 'calcium-in-the-g-star',
      stage: STARS,
      type: 'question',
      kind: 'choice',
      title: 'A different star, a different list',
      body: `Switch the spectrum to the <strong>G star</strong>, a star a little
             like the Sun, and read the list again.`,
      prompt: 'Which line is now the deepest?',
      options: [
        'Ca II K (calcium), at 3,935 Å',
        'H-alpha (hydrogen), at 6,565 Å',
        'Na I D2 (sodium), at 5,892 Å',
        'H-delta (hydrogen), at 4,103 Å',
      ],
      answer: 0,
      hints: ['The list is ordered by depth, deepest first.'],
      because:
        'Ca II K. In the cooler G star the hydrogen lines are much weaker than in the A star and ionized calcium is the deepest. Which lines a spectrum shows depends on the temperature, so the same atom is not equally visible in every star.',
      tool: SP({ src: 1, view: 0 }),
    },
    {
      sid: 'predict-the-shift',
      stage: STARS,
      type: 'predict',
      reveal: 'measure-one-shift',
      title: 'Predict the shift',
      body: `Every line sits at a known wavelength when its source is at rest.
             A star moves directly away from us at 100&nbsp;km/s. Do not
             change the viewer yet.`,
      prompt:
        'Compared with their rest wavelengths, the star’s lines appear&hellip;',
      options: [
        'at longer wavelengths',
        'at shorter wavelengths',
        'at the same wavelengths, only fainter',
        'split into two lines',
      ],
      answer: 0,
      hints: [
        'A source moving away stretches the waves that reach us, as a receding siren drops in pitch.',
      ],
      because:
        'At longer wavelengths: a redshift. A source moving away stretches the waves, and a source moving toward us squeezes them to shorter wavelengths. The next step measures both.',
      tool: SP({ src: 4, view: 1, line: 0 }),
    },
    {
      sid: 'measure-one-shift',
      stage: STARS,
      type: 'measure',
      title: 'Measure two shifts',
      body: `Synthetic stars 1 and 2 are computed spectra with a Doppler shift
             the viewer does not tell you. Zoom on <strong>H-alpha</strong> for
             each and read the velocity from the list under the plot. The
             viewer fits a continuum, finds the center of the line, and turns
             the shift into a speed. A negative speed is toward us.`,
      fields: [
        {
          id: 'v1',
          label: 'Synthetic star 1, from H-alpha',
          unit: 'km/s',
          hint: '85',
        },
        {
          id: 'v2',
          label: 'Synthetic star 2, from H-alpha',
          unit: 'km/s',
          hint: '-142',
        },
      ],
      validate: v => {
        if (![v.v1, v.v2].every(Number.isFinite)) return null;
        if (Math.abs(v.v1 - 85) <= 12 && Math.abs(v.v2 + 142) <= 12) {
          return {
            level: 'ok',
            message:
              'Star 1’s lines are at longer wavelengths than rest, so it is moving away. Star 2’s are at shorter wavelengths, so it is moving toward us. The sign is the direction and the number is the speed along the line of sight.',
          };
        }
        return {
          level: 'error',
          message:
            'Zoom on H-alpha and read the “Velocity” row for each synthetic star. A line at a longer wavelength than rest is a positive speed.',
        };
      },
      tool: SP({ src: 4, view: 1, line: 0 }),
    },
    {
      sid: 'which-way',
      stage: STARS,
      type: 'question',
      kind: 'choice',
      title: 'Which way is it going?',
      body: `Synthetic star 2 has a negative velocity: its H-alpha line sits at
             6,561.5 Å, short of the rest wavelength of 6,564.6&nbsp;Å.`,
      prompt: 'What is star 2 doing?',
      options: [
        'moving toward us',
        'moving away from us',
        'moving across the sky',
        'getting hotter',
      ],
      answer: 0,
      hints: ['Shorter wavelength than rest is the opposite of a redshift.'],
      because:
        'It is moving toward us. A shift to shorter wavelengths, a blueshift, means the source is approaching. Whether the line is at a longer or shorter wavelength than rest is the whole of the direction.',
      tool: SP({ src: 5, view: 1, line: 0 }),
    },
    {
      sid: 'doppler-arithmetic',
      stage: STARS,
      type: 'question',
      kind: 'numeric',
      title: 'From a shift to a speed',
      body: `For speeds far below the speed of light, the fractional change of
             a line’s wavelength is the speed divided by the speed of light:
             Δλ ÷ λ<sub>rest</sub> = v ÷ c, with c = 299,792&nbsp;km/s. A
             star’s H-beta line has a rest wavelength of 4,862.7&nbsp;Å and is
             found at 4,865.0&nbsp;Å.`,
      prompt: 'The star’s velocity along the line of sight',
      unit: 'km/s',
      answer: 141.8,
      tolerance: 3,
      hints: [
        'Find the shift Δλ first: observed minus rest.',
        'Then v = c × Δλ ÷ λ<sub>rest</sub>.',
      ],
      worked:
        'Δλ = 4,865.0 − 4,862.7 = 2.3 Å. v = 299,792 × 2.3 ÷ 4,862.7 = 141.8 km/s, positive because the line is at a longer wavelength: receding.',
      feedback: {
        close:
          'Close. Divide the shift by the rest wavelength, then multiply by c.',
        'wrong-order-of-magnitude':
          'A power of ten out. The shift is a couple of Å in nearly five thousand, a few parts in ten thousand of c.',
        off: 'v = c × (observed − rest) ÷ rest.',
      },
      tool: SP({ src: 4, view: 1, line: 1 }),
    },
    {
      sid: 'star-three',
      stage: STARS,
      type: 'question',
      kind: 'choice',
      title: 'How sure is the shift?',
      body: `Synthetic star 3 is a noisier spectrum. Zoom on
             <strong>H-alpha</strong> and read the velocity with its
             uncertainty, the number after the ±.`,
      prompt: 'What can you conclude about star 3’s motion?',
      options: [
        'It is moving away at the speed shown',
        'The shift is smaller than its uncertainty, so these data cannot say whether it is moving',
        'It is at rest, because its shift is so small',
        'The viewer has failed, since a real star always has a large shift',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'small-is-zero',
          option: 2,
          say: 'A small measured shift is not a zero shift: the uncertainty is larger than the shift, so zero is just as consistent with the data as the number shown.',
        },
      ],
      hints: [
        'Compare the velocity with the number after the ± sign.',
        'A result smaller than its own uncertainty is not a detection.',
      ],
      because:
        'The shift is smaller than its uncertainty (about +10 ± 27 km/s from H-alpha), so a star at rest fits the data as well as one moving at 10 km/s. A measurement is a number and how well it is known; with a noisy spectrum a small motion cannot be told from none.',
      tool: SP({ src: 6, view: 1, line: 0 }),
    },
    {
      sid: 'sideways-motion',
      stage: STARS,
      type: 'question',
      kind: 'choice',
      title: 'Across, not along',
      body: `A star moves at 50&nbsp;km/s straight across our line of sight, with
             no motion toward or away.`,
      prompt: 'What do its lines do?',
      options: [
        'They do not shift by any measurable amount',
        'They shift to longer wavelengths by half as much',
        'They shift to shorter wavelengths',
        'They split into two lines',
      ],
      answer: 0,
      hints: [
        'The shift records the part of the motion along the line from the star to us.',
      ],
      because:
        'They do not shift by a measurable amount. A line moves only for motion along the line of sight. A purely sideways motion has a tiny second-order effect, about one part in 10⁸ at 50 km/s, far below any measurement. A spectrum gives the speed toward or away and nothing about the speed across the sky.',
      tool: SP({ src: 4, view: 1, line: 0 }),
    },
    {
      sid: 'one-sentence',
      stage: STARS,
      type: 'question',
      kind: 'short',
      rubric:
        'Full credit for a way to shrink the uncertainty and the reason it works: more light (a longer exposure or a bigger telescope) lowers the noise, so the center of each line is better known; or combine several lines (H-alpha, H-beta, H-gamma, Ca II K), each an independent measurement of the same shift, weighted by their uncertainties. Credit an answer that names either with a reason tied to the noise. Do not credit an answer that only says to look more carefully or to take a better picture without saying why it helps.',
      title: 'In your own words',
      body: `Star 3’s spectrum is too noisy to say whether it is moving.`,
      prompt: 'What would you do to find out, and why would it work?',
      tool: SP({ src: 6, view: 1, line: 0 }),
    },
    {
      sid: 'what-you-worked-out',
      stage: STARS,
      type: 'read',
      title: 'What you worked out',
      body: `Atoms leave dark lines in a star’s light at wavelengths that belong
             to them, and which lines show depends on temperature. A source
             moving toward or away from us moves every line by the same small
             fraction of its wavelength, v ÷ c, to the red when it recedes and to
             the blue when it approaches. That fraction gives the speed along
             the line of sight, with an uncertainty that sets how small a speed
             can be trusted. It says nothing about motion across the sky.`,
      tool: SP({ src: 4, view: 1, line: 0 }),
    },
  ],
};

export default LINES_AND_MOTION;
