// =============================================================================
// The observing closeout investigations (Prompt 216)
// -----------------------------------------------------------------------------
// The connecting investigations of the observational unit (Prompts 208 to 215),
// in one module that also carries their Spanish words, their deeper steps and
// their instructor content: the one closure file the closeout adds
// (D-R10-216-01, approved by the coordinator), because the shared sequence files
// sit at their line ceilings. The per-lesson path every loader builds from an id
// is a one-line re-export of a named export here (English, `_ES` for the Spanish,
// `_DEEPER` and `_DEEPER_ES` for the deeper steps), and the instructor modules
// read INSTRUCTOR.
//
// Content, no imports: every number a step states is recomputed in
// tests/observingCloseout.test.js from the instruments and kernels the lesson
// points at (the exposure planner, the calibration panel, the sky panels and the
// instrument library). Every step carries a `sid`, an opaque stable id that
// student progress is keyed by: reword a step, move it, translate it, never
// change its sid.
//
// What the five investigations are, and are not (D-R10-216-02):
// - Every frame and every night behind them is synthetic and says so; the
//   facility values are the instrument library's (cited, Prompt 209) and the
//   throughput, dark current and extinction the exposure planner supplies are
//   teaching values it labels as supplied.
// - The library has no urban or suburban site, so no investigation invents one:
//   "the sky background" uses the panel's "sky brighter by" control as a stated
//   exercise offset, and says so.
// - Nothing here is a measurement of the sky's real brightness, moonlight or
//   pointing: they are predictions under stated assumptions.
// =============================================================================

const near = (x, target, tolerance) =>
  Number.isFinite(x) && Math.abs(x - target) <= tolerance;

/** A placeholder star on the canvas: a display; the instrument is where the numbers are. */
const STAGE = {
  spacing: 150,
  fit: true,
  stars: [
    { role: 'star', name: 'A star to be observed', teffK: 5800, lumSun: 1 },
  ],
};

/** The exposure planner: Las Cumbres 1.0 m in V, a 22nd-magnitude star, a signal-to-noise of 20, one exposure. */
const EXP = (values = {}) => ({
  id: 'exposure-planner',
  values: {
    setup: 1,
    kind: 0,
    mag: 22,
    aperture: 1.5,
    patch: 3,
    exposures: 1,
    target: 20,
    airmass: 1,
    moon: 0,
    ...values,
  },
});
/** The sky panels: the turning sky (a star's rise, crossing and set) and the night planner. */
const TURN = (values = {}) => ({
  id: 'sky-turning',
  values: { lat: 40, nights: 0, star: 0, ...values },
});
const NIGHT = (values = {}) => ({
  id: 'sky-plan',
  values: { lat: 30, day: 28, airmassMax: 2, moonSep: 30, ...values },
});
/** The calibration panel on its clear night. */
const CAL = (values = {}) => ({
  id: 'photometric-calibration',
  values: { night: 0, airmass: 1.1, ...values },
});

// -----------------------------------------------------------------------------
// 1. Which instrument for which question?
// -----------------------------------------------------------------------------
export const WHICH_INSTRUMENT_FOR_WHICH_QUESTION = {
  id: 'which-instrument-for-which-question',
  thumbnail: 'images/investigations/which-instrument-for-which-question.webp',
  title: 'Which Instrument for Which Question?',
  subtitle:
    'Five facilities from the instrument library, the same faint star, and what decides the choice: light, sampling, field and wavelength',
  duration: '15-25 min',
  level: 'Majors and upper-level astronomy',
  audience: 'intro',
  textbook: { chapter: 6, section: null },
  courseLevel: 'majors',
  mathematics: 'algebra',
  prerequisites: ['plan-an-exposure'],
  tags: ['observing'],
  lock: { placement: true, inspector: true },
  depths: ['core', 'quantitative'],
  objectives: [
    'Compare facilities by what the instrument library states (collecting area, pixel scale, field, wavelength) and by the exposure each needs for one star',
    'Say which property of an instrument decides which question it can answer: light for faint sources, sampling for sharp images, field for large objects and wavelength for the physics',
    'Say why the fastest instrument for one star is not always the right one',
    'Choose an instrument for a stated question and give the reason in the library’s own numbers',
  ],
  steps: [
    {
      sid: 'a-question-first',
      stage: STAGE,
      type: 'read',
      title: 'A question first, an instrument second',
      body: `Gravitas’s <strong>instrument library</strong> holds five facilities, every
             value cited to a paper or a facility page and every missing value left
             missing: two small Las Cumbres telescopes, Rubin, the TESS camera and the
             Green Bank Telescope. A telescope is not good or bad; it is good for a
             question. This investigation puts one question to them in turn, a faint star,
             and then three other questions that the same table answers differently.
             \n\nThe <strong>exposure planner</strong> beside the text reads the library: the
             collecting area, the pixel scale, the read noise, the sky and the seeing of a
             site. Every frame is synthetic. The share of light the system delivers and the
             dark current are teaching values the planner labels as supplied, because the
             library does not state them.`,
      tool: EXP(),
    },
    {
      sid: 'the-same-star-three-ways',
      stage: STAGE,
      type: 'measure',
      title: 'One star, three facilities',
      body: `A star of magnitude <strong>22</strong>, a signal-to-noise of
             <strong>20</strong>, one exposure, seen at the zenith. Choose each facility in
             turn (<strong>Las Cumbres 0.35 m, V</strong>, <strong>Las Cumbres 1.0 m, V</strong>
             and <strong>Rubin, r</strong>) and read the <strong>total exposure</strong> each
             asks. Rubin’s band is r and the others’ V; the star is the same brightness in
             each.`,
      fields: [
        { id: 't035', label: 'Las Cumbres 0.35 m', unit: 's', hint: '12070' },
        { id: 't1m', label: 'Las Cumbres 1.0 m', unit: 's', hint: '602' },
        { id: 'trub', label: 'Rubin', unit: 's', hint: '15.2' },
      ],
      validate: v => {
        if (![v.t035, v.t1m, v.trub].every(Number.isFinite)) return null;
        if (
          near(v.t035, 12070.7, 250) &&
          near(v.t1m, 602.2, 12) &&
          near(v.trub, 15.2, 0.6)
        ) {
          return {
            level: 'ok',
            message:
              '12,070 seconds (3.4 hours), 602 seconds (10 minutes) and 15 seconds: the same star at the same signal-to-noise takes 800 times longer on the smallest telescope than on Rubin. All three are sky-limited at this brightness, so the time is set by how much light the aperture gathers against how much sky it sees.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the brightness to 22, the target signal-to-noise to 20 and the exposures to 1, then read “Total exposure” for each of the three facility choices in turn.',
        };
      },
      tool: EXP(),
    },
    {
      sid: 'how-much-longer',
      stage: STAGE,
      type: 'question',
      kind: 'numeric',
      title: 'Why the small telescope needs so much longer',
      body: `The 1.0 m telescope collects 0.785 square meters of light; the 0.35 m one,
             with its central obstruction, 0.066: 11.9 times less. Divide the exposure the
             small telescope needs by the one the larger asks.`,
      prompt:
        'How many times longer does the 0.35 m telescope need than the 1.0 m one for this star?',
      unit: '',
      answer: 20.04,
      tolerance: 0.6,
      hints: [
        'Divide the first exposure you read by the second.',
        'It is more than the 11.9 of the collecting areas. Look at the seeing of each site in the planner’s “From the instrument library” row.',
      ],
      worked:
        '12,070.7 ÷ 602.2 = 20.0. The 11.9 of the collecting area is the first factor; the second is that the smaller telescope’s site has seeing of 1.3 arcseconds against 0.9, so its aperture holds more sky for the same star. A sky-limited exposure grows as the sky in the aperture divided by the light of the star.',
      feedback: {
        close: 'Close. Divide the 0.35 m exposure by the 1.0 m exposure.',
        'wrong-order-of-magnitude':
          'A factor of tens, not hundreds or a few: both exposures are in the hundreds to thousands of seconds.',
        off: 'exposure of the 0.35 m telescope ÷ exposure of the 1.0 m telescope.',
      },
      tool: EXP(),
    },
    {
      sid: 'what-the-time-leaves-out',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Is the fastest instrument the right one?',
      body: `Rubin needs 15 seconds for a star the 1.0 m telescope needs ten minutes for. A
             student concludes that Rubin should be used for every faint star.`,
      prompt: 'What is the best thing to say about that conclusion?',
      options: [
        'It is right: the faster telescope is the better one for every question',
        'The time is one cost. The question also needs the field, the pixels, the wavelength and a way to point the instrument where and when the question needs, and the library says nothing about the last',
        'It is wrong because a larger telescope is less accurate',
        'It is right for faint stars and for nothing else, because only faint stars are limited by light',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'fastest',
          option: 0,
          say: 'The time to a signal-to-noise answers one question: how long to collect enough light. A question about a 40-arcminute galaxy or a 21 centimeter line has a different deciding property.',
        },
        {
          id: 'accuracy',
          option: 2,
          say: 'Size sets how much light is collected, not how accurate a measurement is; an accurate measurement still needs sampling, calibration and a stable instrument.',
        },
        {
          id: 'only-faint',
          option: 3,
          say: 'Light is the deciding property for faint sources and not for large ones, bright ones or other wavelengths: the next three steps show each.',
        },
      ],
      hints: [
        'Look at the rows the library gives besides the collecting area: pixel scale, field, wavelength range.',
      ],
      because:
        'The exposure time is one cost among several. The library also holds the pixel scale, the field of view and the wavelength range; whether an observer can point the instrument at a chosen target on a chosen night (a survey follows its own schedule) is a fact the library does not hold and the comparison leaves out.',
      tool: EXP(),
    },
    {
      sid: 'pixels-across-the-seeing',
      stage: STAGE,
      type: 'measure',
      title: 'Do the pixels sample the blur?',
      body: `Choose <strong>Las Cumbres 0.35 m, V</strong>. The planner’s row “From the
             instrument library” gives the <strong>pixel scale</strong> and the
             <strong>seeing</strong> of its site, both in arcseconds. Type them, and the
             instrument divides: the number of pixels across the blur (its full width at half
             maximum). A common rule is at least two.`,
      fields: [
        { id: 'pix', label: 'Pixel scale', unit: 'arcsec', hint: '0.73' },
        { id: 'see', label: 'Seeing (FWHM)', unit: 'arcsec', hint: '1.3' },
        {
          id: 'across',
          label: 'Pixels across the FWHM',
          unit: '',
          compute: v => v.see / v.pix,
          decimals: 2,
        },
      ],
      validate: v => {
        if (![v.pix, v.see].every(Number.isFinite)) return null;
        if (near(v.pix, 0.73, 0.02) && near(v.see, 1.3, 0.05)) {
          return {
            level: 'ok',
            message:
              '1.3 ÷ 0.73 = 1.8 pixels across the blur, a little under the two the rule asks: a star’s centre will be found less well than the signal-to-noise alone promises. The 1.0 m telescope has 2.3 and Rubin 3.3 in their own seeing.',
          };
        }
        return {
          level: 'error',
          message:
            'Read the pixel scale (0.73) and the seeing (1.3) of the 0.35 m telescope in the “From the instrument library” row.',
        };
      },
      tool: EXP({ setup: 0 }),
    },
    {
      sid: 'the-field',
      stage: STAGE,
      type: 'question',
      kind: 'numeric',
      title: 'How much sky one frame holds',
      body: `The 0.35 m telescope’s camera sees a field of 1.9 by 1.2 degrees (2.28 square
             degrees). The 1.0 m telescope’s camera sees 26.5 arcminutes on a side
             (26.5 ÷ 60 = 0.442 degrees; 0.195 square degrees).`,
      prompt:
        'How many frames of the 1.0 m camera does it take to cover the field of one frame of the 0.35 m camera?',
      unit: '',
      answer: 11.7,
      tolerance: 0.4,
      hints: ['Divide the two areas in square degrees.'],
      worked:
        '2.28 ÷ 0.195 = 11.7: about twelve pointings of the larger telescope to cover what the smaller one sees at once. That is what the field is worth, and it is why the larger telescope is not simply better.',
      feedback: {
        close: 'Close. Divide the larger area by the smaller.',
        'wrong-order-of-magnitude':
          'About ten, not a hundred or one: the two fields differ by a factor of around twelve.',
        off: 'field of the 0.35 m camera in square degrees ÷ field of the 1.0 m camera.',
      },
      tool: EXP({ setup: 1 }),
    },
    {
      sid: 'a-big-galaxy',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'A galaxy forty arcminutes across',
      body: `A student wants one frame of a galaxy 40 arcminutes across. The fields are: the
             0.35 m camera 114 by 72 arcminutes, the 1.0 m camera 26.5 by 26.5, Rubin 9.6
             square degrees (a circle about 3.5 degrees across) and TESS’s cameras 24 by 24
             degrees.`,
      prompt: 'Which of these cannot hold the galaxy in one frame?',
      options: [
        'Las Cumbres 0.35 m',
        'Las Cumbres 1.0 m',
        'Rubin',
        'A TESS camera',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'bigger-is-wider',
          option: 2,
          say: 'A bigger mirror does not mean a smaller field: Rubin’s is the widest of the three ground telescopes, because its optics were designed for a wide field.',
        },
        {
          id: 'small-is-narrow',
          option: 0,
          say: 'The 0.35 m telescope has the wider field of the two Las Cumbres ones: its camera is a large sensor behind a fast, short telescope.',
        },
      ],
      hints: ['Compare 40 arcminutes with each field’s shorter side.'],
      because:
        'The 1.0 m camera holds only 26.5 arcminutes on a side, so the galaxy would need a mosaic. The others each hold it, and the choice among those is then a question of resolution and light, not of field: TESS’s pixels are 21 arcseconds, which would show the galaxy as a blob.',
      tool: EXP({ setup: 1 }),
    },
    {
      sid: 'the-wrong-wavelength',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'The 21 centimeter line',
      body: `A student wants to map the neutral hydrogen of a nearby galaxy, which radiates
             at a wavelength of 21 centimeters (a frequency of 1420 MHz).`,
      prompt: 'Which facility in the library can take this observation?',
      options: [
        'Rubin, because it is the largest',
        'Any of the optical telescopes, with a long enough exposure',
        'The Green Bank Telescope: its receiver covers 1.15 to 1.73 GHz and its beam at 1420 MHz is 9.1 arcminutes',
        'TESS, because it is above the atmosphere',
      ],
      answer: 2,
      misconceptions: [
        {
          id: 'long-enough',
          option: 1,
          say: 'An optical detector does not respond to radio waves at any exposure: the wavelength is a hard limit, not a cost.',
        },
        {
          id: 'largest',
          option: 0,
          say: 'Rubin’s camera records the optical and near-infrared bands u to y. The size of a mirror does not move the wavelength it can detect.',
        },
      ],
      hints: [
        'Compare 21 centimeters with the wavelength each instrument’s row in the library covers.',
      ],
      because:
        'Only the Green Bank receiver covers the line’s frequency. The comparison is no longer about time at all, which is the point: before any exposure is planned, the wavelength decides whether an instrument is a candidate. The beam of 9.1 arcminutes is also the angular resolution of the map.',
      tool: EXP(),
    },
    {
      sid: 'your-own-question',
      stage: STAGE,
      type: 'question',
      kind: 'short',
      reflect: true,
      title: 'Your own question',
      body: `Pick a question of your own about the sky (a star’s period, a galaxy’s shape, a
             planet’s transit, a gas cloud). Do not answer it; choose an instrument for it.`,
      prompt:
        'Which instrument in the library would you start with for your question, and which of its properties (light, pixels, field, wavelength) decides the choice? Name one that would not do, and why.',
    },
    {
      sid: 'what-you-worked-out',
      stage: STAGE,
      type: 'read',
      title: 'What you worked out',
      body: `For one magnitude-22 star at a signal-to-noise of 20 the three ground
             facilities needed 12,070, 602 and 15 seconds: the light each gathers sets most of
             that, and the seeing of its site the rest. But a time is an answer to one
             question. A galaxy 40 arcminutes across is the field’s question, and the
             1.0 m camera cannot hold it; a 21 centimeter line is the wavelength’s, and only
             the radio telescope can take it; and the 0.35 m telescope’s pixels, 1.8 across a
             blur of 1.3 arcseconds, are the sampling’s.
             \n\nThe library is a few cited facilities, not the sky’s instruments, and the
             comparison leaves out what no table has: who may point the instrument, when, and
             at what cost.`,
      tool: EXP(),
    },
  ],
};

export const WHICH_INSTRUMENT_FOR_WHICH_QUESTION_DEEPER = {
  id: 'which-instrument-for-which-question',
  steps: [
    {
      sid: 'survey-speed',
      after: 'the-field',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'Light times field',
      body: `For many pointings the quantity that matters is how much light is gathered
             <em>and</em> how much sky is seen at once: the collecting area times the field.
             Rubin’s effective collecting area is 33.2 square meters and its field 9.6
             square degrees; the 1.0 m telescope’s is 0.785 square meters and 0.195.`,
      prompt:
        'How many times larger is the product of area and field of Rubin than of the 1.0 m telescope?',
      unit: '',
      answer: 2079,
      tolerance: 60,
      hints: [
        'Multiply each telescope’s area by its field, then divide.',
        'Rubin is 42 times the area and 49 times the field.',
      ],
      worked:
        '(33.18 × 9.6) ÷ (0.785 × 0.195) = 318.5 ÷ 0.1532 = 2079. For one star Rubin is only about 40 times faster (15 seconds against 602); for a field it is 2000 times faster, because it also sees 49 times more sky at once.',
      feedback: {
        close: 'Close. Multiply area by field for each, then divide.',
        'wrong-order-of-magnitude':
          'Thousands, not tens: the area ratio (42) and the field ratio (49) multiply.',
        off: '(area × field of Rubin) ÷ (area × field of the 1.0 m telescope).',
      },
      tool: EXP({ setup: 3 }),
    },
    {
      sid: 'one-star-or-a-field',
      after: 'survey-speed',
      depth: 'quantitative',
      type: 'question',
      kind: 'choice',
      title: 'Forty times, or two thousand?',
      body: `One star: Rubin is 40 times faster than the 1.0 m telescope. A whole field:
             about 2000 times.`,
      prompt: 'Why are the two ratios so different?',
      options: [
        'Because the second is a mistake',
        'Because one star uses a fraction of Rubin’s field, and a survey fills all of it: the 49 times larger field is worth nothing for a single star and everything for a million',
        'Because Rubin has better pixels',
        'Because the sky is brighter over a wide field',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'pixels',
          option: 2,
          say: 'Rubin’s pixels are finer (0.2 arcsecond against 0.389), which helps sampling but is not what separates the two ratios; the field is.',
        },
      ],
      hints: [
        'One of the two numbers includes the field and the other does not.',
      ],
      because:
        'One star lights up a small part of any frame, so only the collecting area helps; a survey of a whole region uses every pixel of the field. A question about one object and a question about a population are different questions, and the same instrument is a hundred times better at one than at the other.',
      tool: EXP({ setup: 3 }),
    },
  ],
};

// -----------------------------------------------------------------------------
// 2. The sky background
// -----------------------------------------------------------------------------
export const THE_SKY_BACKGROUND = {
  id: 'the-sky-background',
  thumbnail: 'images/investigations/the-sky-background.webp',
  title: 'The Sky Background',
  subtitle:
    'The sky is a light of its own: how bright it is inside a star’s aperture, what a brighter sky costs in exposure, and when the Moon matters',
  duration: '15-25 min',
  level: 'Majors and upper-level astronomy',
  audience: 'intro',
  textbook: { chapter: 6, section: null },
  courseLevel: 'majors',
  mathematics: 'algebra',
  prerequisites: ['plan-an-exposure'],
  tags: ['observing'],
  lock: { placement: true, inspector: true },
  depths: ['core', 'quantitative'],
  objectives: [
    'Turn a sky brightness in magnitudes per square arcsecond into the sky inside a star’s aperture, and compare it with the star',
    'Say how the exposure for a fixed signal-to-noise grows with a brighter sky, and why a sky-limited exposure grows as the sky’s light and not its square root',
    'Say when the Moon matters (faint sources) and when it hardly does (bright ones), and read the hours it is up from a night plan',
    'Say what the library knows about the sky (dark sites, band by band) and what it does not (a city, the Moon’s changing light)',
  ],
  steps: [
    {
      sid: 'the-brightest-thing',
      stage: STAGE,
      type: 'read',
      title: 'The brightest thing in the frame',
      body: `Between the stars the sky is not black. Air glows, scattered moonlight and
             city light add to it, and what it adds is measured as a
             <strong>surface brightness</strong>: magnitudes per square arcsecond. A faint
             star has to be measured on top of that sky, and the sky’s own photons are the
             noise.
             \n\nThe <strong>exposure planner</strong> reads Rubin’s site from the instrument
             library: in the r band the sky is <strong>21.2</strong> magnitudes per square
             arcsecond and the seeing <strong>0.65</strong> arcseconds. Every frame is
             synthetic. The library holds dark sites only; it has no city, so nothing here is
             about a real light-polluted site.`,
      tool: EXP({ setup: 3, mag: 23, exposures: 2 }),
    },
    {
      sid: 'sky-in-the-aperture',
      stage: STAGE,
      type: 'question',
      kind: 'numeric',
      title: 'The sky inside the aperture',
      body: `The planner measures a star in a circle of radius 1.5 times the seeing: 1.5 ×
             0.65 = 0.975 arcseconds, an area of π × 0.975² = 2.99 square arcseconds. A
             magnitude per square arcsecond is a brightness for one square arcsecond, so the
             sky in the whole circle is brighter (a smaller magnitude) by 2.5 log₁₀ of that
             area.`,
      prompt:
        'What is the magnitude of all the sky inside the aperture, for a surface brightness of 21.2?',
      unit: 'mag',
      answer: 20.01,
      tolerance: 0.1,
      hints: [
        'Subtract 2.5 log₁₀(2.99) from 21.2.',
        '2.5 log₁₀(2.99) is about 1.2.',
      ],
      worked:
        '21.2 − 2.5 log₁₀(2.99) = 21.2 − 1.19 = 20.01. The sky in the circle is as bright as a star of magnitude 20.',
      feedback: {
        close:
          'Close. The sky inside the circle is brighter than one square arcsecond of it.',
        'wrong-order-of-magnitude':
          'A magnitude a little below 21.2, not a few magnitudes off.',
        off: '21.2 − 2.5 × log₁₀(area in square arcseconds).',
      },
      tool: EXP({ setup: 3, mag: 23, exposures: 2 }),
    },
    {
      sid: 'sky-over-the-star',
      stage: STAGE,
      type: 'question',
      kind: 'numeric',
      title: 'How many stars of sky',
      body: `The star is magnitude 23, and the sky inside its aperture is as bright as a star
             of magnitude 20.01. Three magnitudes is a factor of 2.512³.`,
      prompt:
        'How many times more light does the sky inside the aperture give than the star?',
      unit: '',
      answer: 15.7,
      tolerance: 0.8,
      hints: ['10 to the power of 0.4 times the difference in magnitudes.'],
      worked:
        '10^(0.4 × (23 − 20.01)) = 10^1.195 = 15.7. The star is a sixteenth of the light in its own aperture; its signal is a small bump on the sky, and the sky’s noise is what the exposure has to beat.',
      feedback: {
        close:
          'Close. Raise 10 to 0.4 times the difference of the two magnitudes.',
        'wrong-order-of-magnitude': 'About sixteen, not a hundred or three.',
        off: '10^(0.4 × (star magnitude − sky magnitude in the aperture)).',
      },
      tool: EXP({ setup: 3, mag: 23, exposures: 2 }),
    },
    {
      sid: 'a-sky-limited-plan',
      stage: STAGE,
      type: 'measure',
      title: 'A plan on a dark night',
      body: `With <strong>Rubin, r</strong>, a magnitude of <strong>23</strong>, a target
             signal-to-noise of <strong>20</strong> and <strong>2</strong> exposures, read the
             <strong>total exposure</strong> and the share of the noise squared that
             <strong>the sky</strong> has, in percent.`,
      fields: [
        { id: 'total', label: 'Total exposure', unit: 's', hint: '79.8' },
        {
          id: 'sky',
          label: 'Share of the noise squared from the sky',
          unit: '%',
          hint: '87',
        },
      ],
      validate: v => {
        if (![v.total, v.sky].every(Number.isFinite)) return null;
        if (near(v.total, 79.84, 1.5) && near(v.sky, 86.97, 2)) {
          return {
            level: 'ok',
            message:
              'About 80 seconds, and 87 percent of the noise squared is the sky’s. The star’s own photons are 5 percent and the read noise 8: this plan is sky-limited, which is why a brighter sky is going to cost so much.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the facility to “Rubin, r”, brightness 23, two exposures, a target of 20 and a sky brighter by 0, then read “Total exposure” and the row “Noise budget: the sky” (its percent).',
        };
      },
      tool: EXP({ setup: 3, mag: 23, exposures: 2 }),
    },
    {
      sid: 'predict-the-moon',
      stage: STAGE,
      type: 'predict',
      reveal: 'two-magnitudes-brighter',
      title: 'A brighter sky',
      body: `A bright Moon makes the sky brighter. Suppose the sky were <strong>2
             magnitudes</strong> brighter, that is 6.3 times as much light. Do not set the
             control yet.`,
      prompt:
        'The exposure for the same star and signal-to-noise will be&hellip;',
      options: [
        'The same: the star has not changed',
        'About 2.5 times longer, because 2 magnitudes is a factor of 2.5',
        'A little under 6.3 times longer: nearly as much as the sky’s light, not as little as its square root',
        'About 2.5 times longer, because noise grows as the square root of the sky',
      ],
      answer: 2,
      hints: [
        'The noise is the square root of the sky’s photons; the signal has to beat it.',
      ],
      because:
        'About 5.6 times longer, a little less than the 6.3 times as much sky light. The signal grows as the time and the noise as its square root, so to keep the ratio the time must grow as the sky’s light; the star’s own photons and the read noise do not grow, which is the small difference.',
      tool: EXP({ setup: 3, mag: 23, exposures: 2 }),
    },
    {
      sid: 'two-magnitudes-brighter',
      stage: STAGE,
      type: 'measure',
      title: 'Two magnitudes of Moon',
      body: `Type the exposure from the last plan, then set <strong>Sky brighter by</strong>
             to <strong>2</strong> magnitudes and type the new total exposure. The instrument
             divides the second by the first.`,
      fields: [
        {
          id: 'dark',
          label: 'Total exposure, dark sky',
          unit: 's',
          hint: '79.8',
        },
        {
          id: 'moon',
          label: 'Total exposure, sky 2 mag brighter',
          unit: 's',
          hint: '443',
        },
        {
          id: 'ratio',
          label: 'Times longer',
          unit: '',
          compute: v => v.moon / v.dark,
          decimals: 2,
        },
      ],
      validate: v => {
        if (![v.dark, v.moon].every(Number.isFinite)) return null;
        if (near(v.dark, 79.84, 1.5) && near(v.moon, 443.2, 8)) {
          return {
            level: 'ok',
            message:
              '443 seconds against 80: 5.6 times longer, for 6.3 times the sky’s light. The sky’s share of the noise went from 87 to 99 percent, so the exposure is now almost entirely paying for the sky.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the sky brighter by 2 magnitudes with the rest unchanged, then read “Total exposure”: about 443 seconds.',
        };
      },
      tool: EXP({ setup: 3, mag: 23, exposures: 2, moon: 2 }),
    },
    {
      sid: 'three-magnitudes-brighter',
      stage: STAGE,
      type: 'question',
      kind: 'numeric',
      title: 'Three magnitudes',
      body: `Set <strong>Sky brighter by</strong> to <strong>3</strong>, the sky of a place
             16 times brighter than a dark site, and read the total exposure.`,
      prompt:
        'How many times longer is the exposure than on the dark sky (79.8 seconds)?',
      unit: '',
      answer: 13.84,
      tolerance: 0.5,
      hints: ['Divide the new total exposure by 79.8.'],
      worked:
        '1105 ÷ 79.8 = 13.8, for 15.8 times the sky’s light. Each magnitude of sky costs about 2.5 times the exposure: the star is the same, the plan is 18 minutes instead of 80 seconds.',
      feedback: {
        close: 'Close. New total exposure ÷ 79.8.',
        'wrong-order-of-magnitude': 'More than ten times, less than a hundred.',
        off: 'exposure at 3 magnitudes brighter ÷ exposure at the dark sky.',
      },
      tool: EXP({ setup: 3, mag: 23, exposures: 2, moon: 3 }),
    },
    {
      sid: 'time-follows-the-sky',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Why the exposure follows the sky’s light',
      body: `A student says: “The noise only grows as the square root of the sky’s photons,
             so a sky 16 times brighter should cost only 4 times the exposure.”`,
      prompt: 'What is wrong with that?',
      options: [
        'Nothing: the exposure grows as the square root of the sky',
        'The noise does grow as the square root, but the signal grows only as the time, so to keep the signal-to-noise the exposure must grow as the sky’s light itself',
        'The sky’s light grows as the square of the magnitude',
        'The detector saturates at four times the exposure',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'sqrt',
          option: 0,
          say: 'The square root is in the noise. The signal-to-noise is the signal over the noise, and the signal grows as the time, so the time needed goes as the noise squared, which is the sky’s light.',
        },
      ],
      hints: [
        'Write the signal-to-noise as the star’s electrons over the square root of the sky’s: how does each depend on the exposure t?',
      ],
      because:
        'Signal ∝ t and noise ∝ √(sky · t), so the signal-to-noise ∝ √t · (star ÷ √sky), and the exposure for a fixed value ∝ the sky’s light. The measured 13.8 against the 15.8 is the star’s own photons and the read noise, which do not scale with the sky.',
      tool: EXP({ setup: 3, mag: 23, exposures: 2, moon: 3 }),
    },
    {
      sid: 'the-moon-and-a-bright-star',
      stage: STAGE,
      type: 'measure',
      title: 'When the Moon does not matter',
      body: `Choose <strong>Las Cumbres 1.0 m, V</strong>, one exposure, a target of
             <strong>20</strong>. Read the total exposure for a star of magnitude
             <strong>20</strong> and for one of magnitude <strong>17</strong>, each on the
             dark sky and with the sky <strong>3 magnitudes</strong> brighter.`,
      fields: [
        { id: 'f0', label: 'Magnitude 20, dark sky', unit: 's', hint: '43.1' },
        {
          id: 'f3',
          label: 'Magnitude 20, sky 3 mag brighter',
          unit: 's',
          hint: '204',
        },
        { id: 'b0', label: 'Magnitude 17, dark sky', unit: 's', hint: '2.3' },
        {
          id: 'b3',
          label: 'Magnitude 17, sky 3 mag brighter',
          unit: 's',
          hint: '2.7',
        },
      ],
      validate: v => {
        if (![v.f0, v.f3, v.b0, v.b3].every(Number.isFinite)) return null;
        if (
          near(v.f0, 43.07, 1.5) &&
          near(v.f3, 203.8, 6) &&
          near(v.b0, 2.26, 0.15) &&
          near(v.b3, 2.72, 0.15)
        ) {
          return {
            level: 'ok',
            message:
              'The faint star’s exposure grows 4.7 times (43 to 204 seconds); the bright one’s grows 1.2 times (2.3 to 2.7 seconds). For a bright star the exposure is set by its own light and the camera’s read noise, and the sky is a small term even when it is 16 times brighter: the Moon is a problem for faint sources.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose “Las Cumbres 1.0 m, V”, one exposure, a target of 20 and read “Total exposure” for each of the four cases (magnitude 20 and 17; sky brighter by 0 and 3).',
        };
      },
      tool: EXP({ setup: 1, mag: 20 }),
    },
    {
      sid: 'a-redder-sky',
      stage: STAGE,
      type: 'question',
      kind: 'numeric',
      title: 'The sky is brighter in the red',
      body: `The library states Rubin’s sky brightness band by band: <strong>g</strong>
             22.26, <strong>r</strong> 21.20 and <strong>i</strong> 20.48 magnitudes per
             square arcsecond (the dark-sky model of the reference design). The air’s own
             glow is stronger at longer wavelengths.`,
      prompt:
        'How many times more light does a square arcsecond of sky give in i than in g?',
      unit: '',
      answer: 5.15,
      tolerance: 0.15,
      hints: [
        '10 to the power of 0.4 times the difference of the two magnitudes.',
      ],
      worked:
        '10^(0.4 × (22.26 − 20.48)) = 10^0.712 = 5.15. The same star costs more exposure in i than in g not only because the filters differ, but because the sky behind it is five times brighter.',
      feedback: {
        close: 'Close. The brighter sky has the smaller magnitude.',
        'wrong-order-of-magnitude': 'A factor of about five.',
        off: '10^(0.4 × (22.26 − 20.48)).',
      },
      tool: EXP({ setup: 3, mag: 23, exposures: 2 }),
    },
    {
      sid: 'a-sky-the-library-does-not-have',
      stage: STAGE,
      type: 'question',
      kind: 'short',
      reflect: true,
      title: 'A sky the library does not have',
      body: `The library holds three dark sites and no city. The “sky brighter by” control is
             an exercise offset, not a measurement: the real light of a Moon depends on its
             phase, its height and how far it is from the target, and none of that is
             modelled.`,
      prompt:
        'If your campus sky were three magnitudes brighter than a dark site, what would you change about an observing plan, and what would you have to measure first?',
    },
    {
      sid: 'what-you-worked-out',
      stage: STAGE,
      type: 'read',
      title: 'What you worked out',
      body: `On Rubin’s dark sky (21.2 magnitudes per square arcsecond) the sky inside a
             star’s aperture is as bright as a star of magnitude 20, sixteen times a
             magnitude-23 star. A plan for it took 80 seconds and was 87 percent sky noise.
             A sky 2 magnitudes brighter cost 5.6 times the exposure and one 3 magnitudes
             brighter 13.8 times, because the exposure follows the sky’s light and not its
             square root. A bright star hardly cares (1.2 times); a faint one pays in full
             (4.7 times). And the sky is five times brighter in i than in g.
             \n\nThe numbers are a model: dark sites, a stated offset for a brighter sky, no
             moonlight geometry. A real night adds the Moon’s phase and position, clouds and
             twilight, and an observer measures the sky in the frame rather than trusting a
             table.`,
      tool: EXP({ setup: 3, mag: 23, exposures: 2 }),
    },
  ],
};

export const THE_SKY_BACKGROUND_DEEPER = {
  id: 'the-sky-background',
  steps: [
    {
      sid: 'a-wider-aperture',
      after: 'sky-over-the-star',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'A wider aperture holds more sky',
      body: `Set the <strong>aperture radius</strong> to 2.5 times the seeing: a circle of
             radius 2.5 × 0.65 = 1.625 arcseconds, an area of 8.30 square arcseconds.`,
      prompt:
        'What is the magnitude of the sky inside this aperture, for a surface brightness of 21.2?',
      unit: 'mag',
      answer: 18.9,
      tolerance: 0.1,
      hints: ['The same subtraction as before, with the larger area.'],
      worked:
        '21.2 − 2.5 log₁₀(8.30) = 21.2 − 2.30 = 18.90. The sky in the circle is 2.8 times brighter than in the first aperture, while the star’s light barely grows: a wider aperture is a worse trade for a faint star.',
      feedback: {
        close: 'Close. 21.2 minus 2.5 log₁₀ of the area.',
        'wrong-order-of-magnitude':
          'Brighter than the first aperture, but not by several magnitudes.',
        off: '21.2 − 2.5 × log₁₀(π × 1.625²).',
      },
      tool: EXP({ setup: 3, mag: 23, exposures: 2, aperture: 2.5 }),
    },
    {
      sid: 'the-moon-up-hours',
      after: 'time-follows-the-sky',
      depth: 'quantitative',
      type: 'measure',
      title: 'Choosing the night',
      body: `The night planner shows the hours the Moon is up inside the astronomical dark
             at a site at latitude 30° north. Read <strong>Hours the Moon is up in the
             dark</strong> for the night of <strong>2025-01-29</strong> (day 28, a new Moon)
             and for <strong>2025-01-13</strong> (day 12, a full Moon).`,
      fields: [
        {
          id: 'newMoon',
          label: 'Hours up, new Moon night',
          unit: 'h',
          hint: '0',
        },
        {
          id: 'fullMoon',
          label: 'Hours up, full Moon night',
          unit: 'h',
          hint: '10.8',
        },
      ],
      validate: v => {
        if (![v.newMoon, v.fullMoon].every(Number.isFinite)) return null;
        if (near(v.newMoon, 0, 0.3) && near(v.fullMoon, 10.79, 0.4)) {
          return {
            level: 'ok',
            message:
              'No hours at the new Moon, and the Moon up for the whole 10.8 hours of dark at the full. A faint-source program asks for the new Moon; a bright-star program can use the full, which is the choice the previous step showed the sky costs nothing for.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the latitude to 30, the night to 2025-01-29 and then 2025-01-13, and read “Hours the Moon is up in the dark”.',
        };
      },
      tool: NIGHT({ day: 28 }),
    },
  ],
};

// -----------------------------------------------------------------------------
// 3. Coordinates and time at depth
// -----------------------------------------------------------------------------
export const COORDINATES_AND_TIME = {
  id: 'coordinates-and-time',
  thumbnail: 'images/investigations/coordinates-and-time.webp',
  title: 'Coordinates and Time at Depth',
  subtitle:
    'Sidereal time and the hour angle, the minute a star crosses the meridian, and what precession does to a catalogue position',
  duration: '15-25 min',
  level: 'Majors and upper-level astronomy',
  audience: 'intro',
  textbook: { chapter: 2, section: null },
  courseLevel: 'majors',
  mathematics: 'algebra',
  prerequisites: ['the-turning-sky'],
  tags: ['observing'],
  lock: { placement: true, inspector: true },
  depths: ['core', 'quantitative'],
  objectives: [
    'Say why the sky comes ahead of the clock by 3 minutes 56 seconds a day, and measure it from the meridian crossings of a star',
    'Find the time a star crosses the meridian from the sidereal time at midnight and the star’s right ascension, and the hour angle at any clock time',
    'Say why a catalogue position carries an epoch, and find the shift precession makes to a position over 25 years in right ascension and declination',
    'Say what an uncorrected catalogue position does to where a telescope points, in arcseconds and in pixels',
  ],
  steps: [
    {
      sid: 'two-clocks',
      stage: STAGE,
      type: 'read',
      title: 'Two clocks',
      body: `A day on the clock is the time the Sun takes to come back to the same place in
             the sky. The stars come back sooner, because in that time the Earth has also moved
             a degree along its orbit: a <strong>sidereal day</strong> is the time the stars
             take to return, <strong>23 hours 56 minutes 4.09 seconds</strong> of clock time.
             Observatories keep both. The <strong>sidereal time</strong> at a place is the
             right ascension that is on its meridian now.
             \n\nThe <strong>turning sky</strong> panel from the survey investigation
             <em>The Turning Sky</em> gives, for a star and a night, the sidereal time at the
             midnight that ends the date, and when the star rises, crosses the meridian and
             sets. Every number is computed from the Sky Lab kernel, a model of the sky and not
             an observation.`,
      tool: TURN(),
    },
    {
      sid: 'a-day-that-is-short',
      stage: STAGE,
      type: 'question',
      kind: 'numeric',
      title: 'How much shorter than a day',
      body: `A solar day is 24 hours, or 86,400 seconds. A sidereal day is 23 hours 56
             minutes 4.09 seconds.`,
      prompt: 'By how many seconds is a sidereal day shorter than a solar day?',
      unit: 's',
      answer: 235.9,
      tolerance: 2,
      hints: [
        'Turn 23 h 56 min 4.09 s into seconds and subtract it from 86,400.',
      ],
      worked:
        '23 × 3600 + 56 × 60 + 4.09 = 86,164.09 seconds; 86,400 − 86,164.09 = 235.9 seconds, or 3 minutes 55.9 seconds. A star that crosses the meridian at one clock time crosses 3 minutes 56 seconds earlier the next night.',
      feedback: {
        close: 'Close. 86,400 minus the sidereal day in seconds.',
        'wrong-order-of-magnitude': 'A few minutes, in seconds: a few hundred.',
        off: '86,400 − (23 × 3600 + 56 × 60 + 4.09).',
      },
      tool: TURN(),
    },
    {
      sid: 'earlier-each-night',
      stage: STAGE,
      type: 'measure',
      title: 'Measuring the gain from the sky',
      body: `Choose <strong>Sirius</strong> at latitude 40°. Read the minutes after noon at
             which it <strong>crosses the meridian</strong> on the first night (<strong>0</strong>
             nights from 2025-01-01) and thirty nights later. The instrument divides the
             difference by 30.`,
      fields: [
        { id: 't0', label: 'Crossing, night 0', unit: 'min', hint: '718.7' },
        { id: 't30', label: 'Crossing, night 30', unit: 'min', hint: '600.8' },
        {
          id: 'gain',
          label: 'Earlier each night',
          unit: 'min',
          compute: v => (v.t0 - v.t30) / 30,
          decimals: 2,
        },
      ],
      validate: v => {
        if (![v.t0, v.t30].every(Number.isFinite)) return null;
        if (near(v.t0, 718.7, 0.6) && near(v.t30, 600.8, 0.6)) {
          return {
            level: 'ok',
            message:
              '117.9 minutes over 30 nights, 3.93 minutes a night: 3 minutes 56 seconds, the figure of the sidereal day. The panel finds it from the sky’s turning, with no clock in the sum.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the star to Sirius and the latitude to 40, then read “Crosses the meridian” (minutes after noon) at 0 and at 30 nights.',
        };
      },
      tool: TURN(),
    },
    {
      sid: 'from-sidereal-time-to-crossing',
      stage: STAGE,
      type: 'measure',
      title: 'When does it cross?',
      body: `A star crosses the meridian when the sidereal time equals its right ascension.
             The panel says the sidereal time at the midnight that ends the date is <strong>6.792
             h</strong> and Sirius’s catalogue right ascension is <strong>6.752 h</strong>:
             the star crosses <em>before</em> midnight, when the sidereal time was smaller. The
             sidereal time runs 1.0027379 hours for each hour of clock, so it was this many
             hours before midnight: (6.792 − 6.752) ÷ 1.0027379. Type the two readings from the
             panel; the instrument gives the crossing in minutes after noon (midnight is 720).`,
      fields: [
        {
          id: 'lst',
          label: 'Sidereal time at midnight',
          unit: 'h',
          hint: '6.792',
        },
        {
          id: 'ra',
          label: 'Right ascension of Sirius',
          unit: 'h',
          hint: '6.752',
        },
        {
          id: 'cross',
          label: 'Crossing, minutes after noon',
          unit: 'min',
          compute: v => 720 - (60 * (v.lst - v.ra)) / 1.0027379,
          decimals: 1,
        },
      ],
      validate: v => {
        if (![v.lst, v.ra].every(Number.isFinite)) return null;
        if (near(v.lst, 6.792, 0.003) && near(v.ra, 6.752, 0.003)) {
          return {
            level: 'ok',
            message:
              '717.6 minutes after noon, about 23:57.6 on the clock. A telescope’s control system does exactly this arithmetic to know what is on the meridian; the panel’s own figure for the same star is a minute different, which the next step is about.',
          };
        }
        return {
          level: 'error',
          message:
            'Read “Sidereal time at midnight” (6.792 h) and the right ascension in the “Star” row (6.752 h).',
        };
      },
      tool: TURN(),
    },
    {
      sid: 'the-panel-is-later',
      stage: STAGE,
      type: 'question',
      kind: 'numeric',
      title: 'A minute apart',
      body: `Your crossing is 717.6 minutes after noon. The panel’s “Crosses the meridian” row
             says 718.7.`,
      prompt:
        'By how many minutes is the panel’s crossing later than the one you computed?',
      unit: 'min',
      answer: 1.1,
      tolerance: 0.3,
      hints: ['Subtract your crossing from the panel’s.'],
      worked:
        '718.7 − 717.6 = 1.1 minutes. The catalogue’s right ascension is for a fixed reference (J2000.0); the panel crosses the star where it is on the date. The next steps say why the two differ.',
      feedback: {
        close: 'Close. 718.7 minus your computed crossing.',
        'wrong-order-of-magnitude': 'About a minute, not seconds or hours.',
        off: '718.7 − 717.6.',
      },
      tool: TURN(),
    },
    {
      sid: 'why-later',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Why the panel is later',
      body: `The catalogue gives Sirius’s right ascension as 6.752 h. The kernel’s Sirius
             crosses 1.1 minutes later than a calculation with that number.`,
      prompt: 'What is the main reason?',
      options: [
        'The panel’s clock runs slow',
        'The Earth’s axis precesses: the equator and equinox the catalogue refers to (J2000.0) have moved, so the star’s right ascension of date is larger by about a minute of time',
        'Sirius is moving through space so fast that its right ascension grows by a minute in 25 years',
        'Refraction lifts the star so it crosses later',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'proper-motion',
          option: 2,
          say: 'Sirius’s own motion changes its position by about 1.3 arcseconds a year, about a second of time over 25 years: the minute is precession, which moves every star.',
        },
        {
          id: 'refraction',
          option: 3,
          say: 'Refraction changes the apparent height of a star, not the time it is on the meridian: a star on the meridian has no refraction in azimuth.',
        },
      ],
      hints: [
        'The catalogue’s coordinates have an epoch. What does the Earth’s axis do over 25 years?',
      ],
      because:
        'Precession: the Earth’s axis traces a cone in 25,800 years, moving the equinox along the equator by 50 arcseconds a year, so every right ascension grows, by about 3 seconds of time a year near the equator. In 25 years that is a minute: the panel uses the star’s place for the night, the catalogue’s number is for 2000.',
      tool: TURN(),
    },
    {
      sid: 'in-your-words',
      stage: STAGE,
      type: 'question',
      kind: 'short',
      reflect: true,
      title: 'In your own words',
      body: `You have found the same thing two ways: a star comes 3 minutes 56 seconds
             earlier each night, and the sidereal time at midnight rises by about 3.9
             minutes of clock each day.`,
      prompt:
        'Explain, as you would to a friend, why the stars rise earlier each night, and what the sidereal time of a place tells an observer.',
    },
    {
      sid: 'what-you-worked-out',
      stage: STAGE,
      type: 'read',
      title: 'What you worked out',
      body: `A sidereal day is 235.9 seconds short of a solar day, which the panel confirmed
             as 3.93 minutes earlier each night for Sirius. From the sidereal time at midnight
             and the right ascension you found that the star crosses the meridian at 717.6
             minutes after noon, and that the kernel’s crossing is a minute later because a
             catalogue position carries an epoch: the right ascension of date has moved
             since 2000. A telescope’s pointing model does this arithmetic for every target.
             \n\nThe panel is a model of the sky, computed from the Sky Lab kernel. It uses
             the star’s apparent place, with precession, nutation and aberration; this
             investigation separated the first, the largest, and left the others for
             a deeper look.`,
      tool: TURN(),
    },
  ],
};

export const COORDINATES_AND_TIME_DEEPER = {
  id: 'coordinates-and-time',
  steps: [
    {
      sid: 'ra-shift',
      after: 'why-later',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The shift in right ascension',
      body: `To first order, a position moves each year by <em>m</em> + <em>n</em> sin α tan δ
             seconds of time in right ascension, with <em>m</em> = 3.075 s and <em>n</em> =
             1.336 s a year, and by 20.04 cos α arcseconds in declination. Sirius is at α =
             101.29° (6.752 h) and δ = −16.72°. The panel’s date is 25 years after J2000.`,
      prompt:
        'By how many seconds of time has its right ascension changed in 25 years?',
      unit: 's',
      answer: 67.1,
      tolerance: 1.5,
      hints: [
        'First the yearly rate: 3.075 + 1.336 × sin(101.29°) × tan(−16.72°).',
        'The rate is about 2.7 seconds a year.',
      ],
      worked:
        '3.075 + 1.336 × 0.9806 × (−0.3008) = 2.681 seconds a year; × 25 = 67.0 seconds. The kernel’s rigorous precession gives 67.1 seconds (0.2797 degrees): the first-order formula is good to a tenth of a second over this span, at this declination. 67 seconds is 1.1 minutes: the minute of the previous step.',
      feedback: {
        close: 'Close. The yearly rate times 25.',
        'wrong-order-of-magnitude':
          'About a minute, in seconds: tens, not hundreds.',
        off: '25 × (3.075 + 1.336 × sin α × tan δ).',
      },
      tool: TURN(),
    },
    {
      sid: 'dec-shift',
      after: 'ra-shift',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The shift in declination',
      body: `Use the declination formula: 20.04 cos α arcseconds a year, with α = 101.29°
             (cos α = −0.196), over 25 years.`,
      prompt:
        'By how many arcseconds has Sirius’s declination changed (give the signed number)?',
      unit: 'arcsec',
      answer: -99.5,
      tolerance: 3,
      hints: ['Multiply the yearly rate by cos α and by the number of years.'],
      worked:
        '20.04 × (−0.196) × 25 = −98.4 arcseconds; the rigorous precession gives −99.5. Declination decreases: Sirius sits 1.7 arcminutes further south than the catalogue says.',
      feedback: {
        close: 'Close. The yearly rate times 25, with its sign.',
        'wrong-order-of-magnitude':
          'About a hundred arcseconds, not a few or thousands.',
        off: '25 × 20.04 × cos α.',
      },
      tool: TURN(),
    },
    {
      sid: 'pointing-in-pixels',
      after: 'dec-shift',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'What an uncorrected position costs',
      body: `A telescope is pointed with Sirius’s J2000 catalogue position and no precession.
             The 1.0 m telescope’s camera has pixels of 0.389 arcseconds, so a shift of 99.5
             arcseconds in declination is a number of pixels.`,
      prompt: 'How many pixels is the declination error alone?',
      unit: 'px',
      answer: 256,
      tolerance: 10,
      hints: ['Divide the arcseconds by the arcseconds per pixel.'],
      worked:
        '99.5 ÷ 0.389 = 256 pixels in declination, and a right-ascension shift of 67 seconds of time is 1007 arcseconds, 965 on the sky (× cos δ), another 2500 pixels. The star is not in the frame at all: its field is 26.5 arcminutes wide, 4096 pixels, and the pointing is off by 16 arcminutes. Pointing models always apply precession.',
      feedback: {
        close: 'Close. 99.5 ÷ 0.389.',
        'wrong-order-of-magnitude':
          'Hundreds of pixels, not tens or thousands.',
        off: 'shift in arcseconds ÷ 0.389.',
      },
      tool: TURN(),
    },
  ],
};

// -----------------------------------------------------------------------------
// 4. A night at the telescope, end to end
// -----------------------------------------------------------------------------
/** The strategy planner on its stated defaults: a fortnight of nights with a weather chain. */
const PLAN14 = () => ({ id: 'strategy-plan', values: {} });
/** The exposure planner as the night uses it: a 19th-magnitude star on the 1.0 m telescope at airmass 1.1. */
const NIGHT_EXP = (values = {}) =>
  EXP({ setup: 1, mag: 19, target: 50, exposures: 1, airmass: 1.1, ...values });

export const A_NIGHT_AT_THE_TELESCOPE = {
  id: 'a-night-at-the-telescope',
  thumbnail: 'images/investigations/a-night-at-the-telescope.webp',
  title: 'A Night at the Telescope, End to End',
  subtitle:
    'Plan, expose, calibrate, measure and report one star, with a prepared plan: five stations, each with the number it hands to the next',
  duration: '20-30 min',
  level: 'Majors and upper-level astronomy',
  audience: 'intro',
  textbook: { chapter: 6, section: null },
  courseLevel: 'majors',
  mathematics: 'algebra',
  prerequisites: ['plan-an-exposure', 'counts-to-magnitudes'],
  tags: ['observing'],
  lock: { placement: true, inspector: true },
  depths: ['core', 'quantitative'],
  objectives: [
    'Follow one observation through its five stations (plan, expose, calibrate, measure, report) and name what each hands to the next',
    'Read the usable hours and the best airmass from a night plan, and say what a plan assumes about the weather',
    'Plan the exposure for a signal-to-noise, calibrate against standard stars, check a synthetic frame against the prediction, and combine the uncertainties in quadrature',
    'Say which term of the final uncertainty is largest and what would improve the number most',
  ],
  steps: [
    {
      sid: 'five-stations',
      stage: STAGE,
      type: 'read',
      title: 'Five stations',
      body: `An observation is a chain. A <strong>plan</strong> says when a target is up and
             dark; an <strong>exposure</strong> is long enough to reach a signal-to-noise; a
             <strong>calibration</strong> turns counts into a magnitude; a
             <strong>measurement</strong> reads the counts from the frame; and a
             <strong>report</strong> gives the number with what it is good to. Each station is
             an instrument you have met, and each hands the next station one number.
             \n\nThis investigation follows a prepared plan: a star of magnitude 19 on the
             Las Cumbres 1.0 m telescope, on the night of 2025-01-29 (a new Moon), from a
             site at latitude 30° north. Every frame and every night of standard stars is
             <strong>synthetic</strong>, and the facility’s values are the instrument
             library’s; nobody has observed this. The first station is the night planner.`,
      tool: NIGHT(),
    },
    {
      sid: 'station-when',
      stage: STAGE,
      type: 'measure',
      title: 'Station 1: when is it up?',
      body: `The planner stands <strong>Regulus</strong> in for the field’s position. Read
             the <strong>hours of astronomical dark</strong> that night, and for Regulus the
             <strong>hours usable</strong> (above an airmass of 2, in the dark) and the
             <strong>best airmass</strong> it reaches.`,
      fields: [
        {
          id: 'dark',
          label: 'Hours of astronomical dark',
          unit: 'h',
          hint: '10.5',
        },
        {
          id: 'usable',
          label: 'Regulus, hours usable',
          unit: 'h',
          hint: '8.08',
        },
        {
          id: 'airmass',
          label: 'Regulus, best airmass',
          unit: '',
          hint: '1.05',
        },
      ],
      validate: v => {
        if (![v.dark, v.usable, v.airmass].every(Number.isFinite)) return null;
        if (
          near(v.dark, 10.53, 0.15) &&
          near(v.usable, 8.08, 0.15) &&
          near(v.airmass, 1.05, 0.03)
        ) {
          return {
            level: 'ok',
            message:
              '10.5 hours of dark, 8.1 of them with Regulus below an airmass of 2, and 1.05 at best: the plan hands the next station an airmass of about 1.1, which is the one the exposure will use. With the Moon down all night, nothing adds to the sky.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the latitude to 30° and the night to 2025-01-29, then read “Astronomical dark” and the row for Regulus: “hours usable; best airmass”.',
        };
      },
      tool: NIGHT(),
    },
    {
      sid: 'station-weather',
      stage: STAGE,
      type: 'question',
      kind: 'numeric',
      title: 'A plan assumes clear nights',
      body: `A plan for one night says nothing about clouds. The <strong>strategy planner</strong>
             of the observing-strategy investigations spreads three visits a night over a
             fortnight and draws the weather from a stated chain (60 percent of nights clear,
             with persistence). Read its <strong>Visits</strong> row: how many visits were
             executed of how many planned.`,
      prompt:
        'What share of the planned visits did the weather take, in percent?',
      unit: '%',
      answer: 42.9,
      tolerance: 1,
      hints: ['Visits lost = planned − executed; divide by planned.'],
      worked:
        '(42 − 24) ÷ 42 = 42.9 percent. The planner draws whole nights lost to a seeded weather chain; the real fraction at a real site is a climate statistic the library does not hold, so the number is a lesson about plans, not a forecast.',
      feedback: {
        close: 'Close. (planned − executed) ÷ planned, in percent.',
        'wrong-order-of-magnitude': 'Tens of percent, not a few or all.',
        off: 'visits lost ÷ visits planned, × 100.',
      },
      tool: PLAN14(),
    },
    {
      sid: 'predict-the-limit',
      stage: STAGE,
      type: 'predict',
      reveal: 'station-expose',
      title: 'Station 2: what limits the exposure?',
      body: `The star is magnitude 19 and the 1.0 m telescope’s dark sky is 22 magnitudes per
             square arcsecond. We want a signal-to-noise of 50 in one exposure at an airmass of
             1.1. Do not read the planner yet.`,
      prompt: 'The largest term of the noise budget will be&hellip;',
      options: [
        'The star’s own photons',
        'The sky’s photons in the aperture',
        'The dark current',
        'The read noise of the camera',
      ],
      answer: 0,
      hints: [
        'Compare the star at magnitude 19 with the sky inside its aperture, which works out near magnitude 20 at this site.',
      ],
      because:
        'The star’s own photons, 49 percent, with the read noise 28 and the sky 23. A star this bright against a dark sky is limited by itself, not by the sky as the faintest stars are.',
      tool: NIGHT_EXP(),
    },
    {
      sid: 'station-expose',
      stage: STAGE,
      type: 'measure',
      title: 'Station 2: how long to expose?',
      body: `Use the <strong>exposure planner</strong>: Las Cumbres 1.0 m in V, a brightness of
             <strong>19</strong>, a target signal-to-noise of <strong>50</strong>, one exposure
             and an airmass of <strong>1.1</strong> (the plan’s). Read the <strong>total
             exposure</strong> and the percent of the noise squared that comes from the
             <strong>target’s own photons</strong>.`,
      fields: [
        { id: 'total', label: 'Total exposure', unit: 's', hint: '59.3' },
        {
          id: 'source',
          label: 'Share from the target’s photons',
          unit: '%',
          hint: '49',
        },
      ],
      validate: v => {
        if (![v.total, v.source].every(Number.isFinite)) return null;
        if (near(v.total, 59.3, 1.2) && near(v.source, 49.0, 2)) {
          return {
            level: 'ok',
            message:
              'About 59 seconds, with half the noise squared the star’s own. The exposure hands the next station a frame, and the plan a cost of a minute of telescope time.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose “Las Cumbres 1.0 m, V”, brightness 19, a target of 50, one exposure and an airmass of 1.1, then read “Total exposure” and “Noise budget: the target’s photons”.',
        };
      },
      tool: NIGHT_EXP(),
    },
    {
      sid: 'station-calibrate',
      stage: STAGE,
      type: 'measure',
      title: 'Station 3: what is a count worth?',
      body: `The <strong>calibration</strong> panel is a synthetic night of standard stars
             whose magnitudes are known: it fits the zero point, the extinction of the air and
             a colour term to them, and says what the night leaves unknown about a target.
             Read the <strong>zero point at airmass 1</strong>, the <strong>extinction</strong>
             and the one-sigma uncertainty of the <strong>calibrated magnitude of the target
             star</strong>. The panel’s instrument is its own synthetic one; what carries
             over to the chain is the size of the uncertainty a night of fourteen standards
             leaves.`,
      fields: [
        {
          id: 'z',
          label: 'Zero point at airmass 1',
          unit: 'mag',
          hint: '24.803',
        },
        {
          id: 'k',
          label: 'Extinction of the air, k',
          unit: 'mag/airmass',
          hint: '0.213',
        },
        {
          id: 'sigma',
          label: 'Uncertainty of the calibrated target',
          unit: 'mag',
          hint: '0.008',
        },
      ],
      validate: v => {
        if (![v.z, v.k, v.sigma].every(Number.isFinite)) return null;
        if (
          near(v.z, 24.803, 0.01) &&
          near(v.k, 0.213, 0.01) &&
          near(v.sigma, 0.008, 0.0015)
        ) {
          return {
            level: 'ok',
            message:
              'A zero point of 24.803 and an extinction of 0.213 magnitudes per airmass, each to three thousandths, and a calibrated target good to 0.008 magnitude. The calibration station hands the report one uncertainty: 0.008.',
          };
        }
        return {
          level: 'error',
          message:
            'On the clear night read “Zero point at airmass 1”, “Extinction of the air” and the “±” after the calibrated magnitude in “Target star”.',
        };
      },
      tool: CAL(),
    },
    {
      sid: 'station-measure',
      stage: STAGE,
      type: 'measure',
      title: 'Station 4: what does the frame say?',
      body: `Return to the exposure planner with the same plan. The frame beside the readout
             is a synthetic exposure of exactly that plan. Read the signal-to-noise
             <strong>predicted</strong> for its aperture and the signal-to-noise
             <strong>measured</strong> on it by aperture photometry.`,
      fields: [
        {
          id: 'pred',
          label: 'Predicted signal-to-noise',
          unit: '',
          hint: '49.5',
        },
        {
          id: 'meas',
          label: 'Measured signal-to-noise',
          unit: '',
          hint: '49.9',
        },
      ],
      validate: v => {
        if (![v.pred, v.meas].every(Number.isFinite)) return null;
        if (near(v.pred, 49.45, 0.6) && near(v.meas, 49.89, 3.5)) {
          return {
            level: 'ok',
            message:
              'Predicted 49.5 and measured 49.9, against a target of 50: the frame is one draw of the noise, and a signal-to-noise of 50 varies by about 1 in 50 from draw to draw, so agreement within a couple is what to expect, not a proof that the model is exact.',
          };
        }
        return {
          level: 'error',
          message:
            'Read the rows “Predicted for the frame’s own aperture” and “Measured on the frame”: about 49.5 and 49.9 for this plan.',
        };
      },
      tool: NIGHT_EXP(),
    },
    {
      sid: 'station-report',
      stage: STAGE,
      type: 'question',
      kind: 'numeric',
      title: 'Station 5: the number and what it is good to',
      body: `A signal-to-noise of 50 is a photometric uncertainty of 1.0857 ÷ 50 = 0.0217
             magnitude (1.0857 is 2.5 ÷ ln 10). The calibration leaves 0.008. Two independent
             uncertainties combine as the square root of the sum of their squares.`,
      prompt:
        'What is the total one-sigma uncertainty of the reported magnitude, in magnitudes?',
      unit: 'mag',
      answer: 0.0231,
      tolerance: 0.0015,
      hints: ['Square each of the two uncertainties, add, take the root.'],
      worked:
        '√(0.0217² + 0.008²) = √(0.000471 + 0.000064) = 0.0231 magnitude: the report reads “V = (calibrated value) ± 0.023”. Adding the two as 0.0217 + 0.008 = 0.0297 would overstate it; independent errors do not all fall the same way.',
      feedback: {
        close: 'Close. Square each, add, then take the root.',
        'wrong-order-of-magnitude': 'A couple of hundredths of a magnitude.',
        off: 'the square root of the sum of the two squares.',
      },
      tool: NIGHT_EXP(),
    },
    {
      sid: 'which-term-dominates',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'What would improve the number most?',
      body: `The report is good to 0.023 magnitude: 0.022 from the star’s photons and 0.008
             from the calibration.`,
      prompt: 'Which change would improve the final uncertainty most?',
      options: [
        'Calibrate better: halve the calibration’s 0.008',
        'Collect more light from the star: a longer exposure or a larger telescope',
        'Use a different filter',
        'Nothing: 0.023 magnitude is as good as photometry gets',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'calibrate',
          option: 0,
          say: 'Halving the calibration’s term lowers the total from 0.0231 to 0.0225, under three percent: the larger term in a quadrature sum is nearly all of it.',
        },
        {
          id: 'floor',
          option: 3,
          say: 'Photometry reaches 0.01 magnitude and better for bright stars; a floor from flat fielding sits near one percent, and the investigation’s deeper steps find it.',
        },
      ],
      hints: ['In a sum of squares the larger term dominates.'],
      because:
        'The star’s photon noise is the larger term, so more light is what helps: doubling the signal-to-noise halves it. The calibration is already small, and improving it further changes little until the photon noise is brought down.',
      tool: NIGHT_EXP(),
    },
    {
      sid: 'what-could-go-wrong',
      stage: STAGE,
      type: 'question',
      kind: 'short',
      reflect: true,
      title: 'What could go wrong',
      body: `The chain gave a number, and every station assumed something: a clear night, a
             calibration that holds for the whole night, a frame free of defects.`,
      prompt:
        'Name one assumption at one station that could fail on a real night, say what you would see if it did, and what you would do about it.',
    },
    {
      sid: 'what-you-worked-out',
      stage: STAGE,
      type: 'read',
      title: 'What you worked out',
      body: `Station 1 found 8.1 usable hours at an airmass of 1.05 on a new-Moon night, and the
             strategy planner showed that a plan across nights loses 43 percent of its visits to
             a stated weather chain. Station 2 asked 59 seconds for a signal-to-noise of 50,
             limited by the star’s own photons. Station 3 calibrated against standards to
             0.008 magnitude. Station 4 found the frame’s measured signal-to-noise within a
             draw of the prediction. Station 5 combined 0.022 and 0.008 into 0.023 magnitude,
             and the larger term, the star’s photons, is the one to improve.
             \n\nEvery frame and night here is synthetic and the facility’s values are the
             library’s; the chain is a prediction under stated assumptions, and it leaves out
             flat-field and sky-subtraction error, crowding, cloud and a changing
             atmosphere. The next investigation, <em>From Photons to a Number</em>, traces the
             arithmetic of stations 2 to 5 in one calculation.`,
      tool: NIGHT_EXP(),
    },
  ],
};

export const A_NIGHT_AT_THE_TELESCOPE_DEEPER = {
  id: 'a-night-at-the-telescope',
  steps: [
    {
      sid: 'a-moonlit-night',
      after: 'station-expose',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The same plan with a bright Moon',
      body: `Suppose the Moon were up and made the sky <strong>2 magnitudes</strong> brighter
             (set <strong>Sky brighter by</strong> to 2: an exercise offset, not a moonlight
             model). Read the new total exposure.`,
      prompt:
        'How many times longer is the exposure than on the dark sky (59.3 seconds)?',
      unit: '',
      answer: 2.08,
      tolerance: 0.08,
      hints: ['Divide the new total exposure by 59.3.'],
      worked:
        '123.3 ÷ 59.3 = 2.08. The sky is 6.3 times brighter but the exposure only doubles, because half the noise was the star’s own photons, which the sky does not touch: for a bright target the Moon is a small cost, for a faint one (the sky-background investigation) it is the whole exposure.',
      feedback: {
        close: 'Close. The new total exposure ÷ 59.3.',
        'wrong-order-of-magnitude': 'About two, not six or one.',
        off: 'exposure with the brighter sky ÷ 59.3.',
      },
      tool: NIGHT_EXP({ moon: 2 }),
    },
    {
      sid: 'two-exposures',
      after: 'a-moonlit-night',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'Splitting the exposure',
      body: `Return the sky to the dark and set the number of <strong>exposures</strong> to 2
             (a telescope may not be able to take one long frame). Read the total.`,
      prompt:
        'How many times longer is the total than for one exposure (59.3 seconds)?',
      unit: '',
      answer: 1.19,
      tolerance: 0.04,
      hints: ['Divide the two-exposure total by 59.3.'],
      worked:
        '70.5 ÷ 59.3 = 1.19. Each frame pays the camera’s read noise once, so two frames carry twice the read noise, and the star’s and the sky’s photons are collected the same however the time is split.',
      feedback: {
        close: 'Close. Divide the new total by 59.3.',
        'wrong-order-of-magnitude': 'A little more than one, not two.',
        off: 'exposure of two frames ÷ exposure of one.',
      },
      tool: NIGHT_EXP({ exposures: 2 }),
    },
  ],
};

// -----------------------------------------------------------------------------
// 5. From photons to a number
// -----------------------------------------------------------------------------
export const FROM_PHOTONS_TO_A_NUMBER = {
  id: 'from-photons-to-a-number',
  thumbnail: 'images/investigations/from-photons-to-a-number.webp',
  title: 'From Photons to a Number',
  subtitle:
    'The whole chain as one traced calculation: electrons, noise, signal-to-noise, magnitude, calibration, and the uncertainty carried at each step',
  duration: '20-30 min',
  level: 'Majors and upper-level astronomy',
  audience: 'intro',
  textbook: { chapter: 6, section: null },
  courseLevel: 'upper',
  mathematics: 'algebra',
  prerequisites: ['a-night-at-the-telescope'],
  tags: ['observing'],
  lock: { placement: true, inspector: true },
  depths: ['core', 'quantitative'],
  objectives: [
    'Trace a magnitude through the arithmetic of a measurement: electrons, noise, signal-to-noise, magnitude uncertainty, instrumental magnitude and calibrated magnitude',
    'Carry an uncertainty through each step and combine independent ones in quadrature',
    'Say how long it takes to halve the uncertainty, and why it is not always four times',
    'Find where a systematic floor (flat-field error) overtakes photon noise',
  ],
  steps: [
    {
      sid: 'a-number-from-photons',
      stage: STAGE,
      type: 'read',
      title: 'One number, traced',
      body: `The previous investigation ran the stations of a night. This one writes out the
             arithmetic of the last four as a single trace: the <strong>electrons</strong> the
             star puts in its aperture, the <strong>noise</strong> on them, the
             <strong>signal-to-noise</strong> and the magnitude uncertainty it implies, the
             star’s <strong>magnitude</strong> from its rate, and the <strong>calibration</strong>
             added in quadrature.
             \n\nThe exposure planner gives the electrons and the noise for a magnitude-19 star
             on the Las Cumbres 1.0 m telescope at an airmass of 1.1, a signal-to-noise of 50
             and one exposure. Every frame is synthetic; the planner’s zero point is a
             throughput model with a supplied throughput of 0.5, a teaching value, not the
             telescope’s.`,
      tool: NIGHT_EXP(),
    },
    {
      sid: 'the-counts',
      stage: STAGE,
      type: 'measure',
      title: 'Step 1: signal and noise',
      body: `In the row <strong>Predicted for the frame’s own aperture</strong> the planner
             gives the electrons the star puts in the aperture, with their noise. Type them;
             the instrument forms the signal-to-noise.`,
      fields: [
        { id: 'signal', label: 'Signal', unit: 'electrons', hint: '5101' },
        { id: 'noise', label: 'Noise', unit: 'electrons', hint: '103' },
        {
          id: 'snr',
          label: 'Signal-to-noise',
          unit: '',
          compute: v => v.signal / v.noise,
          decimals: 1,
        },
      ],
      validate: v => {
        if (![v.signal, v.noise].every(Number.isFinite)) return null;
        if (near(v.signal, 5100.6, 60) && near(v.noise, 103.1, 2)) {
          return {
            level: 'ok',
            message:
              '5101 electrons against a noise of 103: a signal-to-noise of 49.5. The noise is the square root of the variance, the star’s photons plus the sky’s and the read noise’s over the aperture’s pixels, which the planner’s budget lists.',
          };
        }
        return {
          level: 'error',
          message:
            'Read the row “Predicted for the frame’s own aperture”: signal-to-noise, then the electrons “±” the noise (about 5101 ± 103).',
        };
      },
      tool: NIGHT_EXP(),
    },
    {
      sid: 'the-magnitude-uncertainty',
      stage: STAGE,
      type: 'question',
      kind: 'numeric',
      title: 'Step 2: the uncertainty of a magnitude',
      body: `A fractional uncertainty in the flux δF ÷ F is an uncertainty in the magnitude of
             2.5 ÷ ln 10 = 1.0857 times that. The fractional uncertainty is the inverse of the
             signal-to-noise.`,
      prompt:
        'What is the one-sigma uncertainty of the instrumental magnitude, from a signal-to-noise of 49.45, in magnitudes?',
      unit: 'mag',
      answer: 0.02195,
      tolerance: 0.0008,
      hints: ['1.0857 divided by the signal-to-noise.'],
      worked:
        '1.0857 ÷ 49.45 = 0.02195 magnitude. A rule to carry in the head: a signal-to-noise of 100 is 0.011 magnitude, of 20 is 0.054.',
      feedback: {
        close: 'Close. 1.0857 ÷ the signal-to-noise.',
        'wrong-order-of-magnitude': 'A couple of hundredths of a magnitude.',
        off: '1.0857 ÷ 49.45.',
      },
      tool: NIGHT_EXP(),
    },
    {
      sid: 'the-rate-to-a-magnitude',
      stage: STAGE,
      type: 'question',
      kind: 'numeric',
      title: 'Step 3: from electrons to a magnitude',
      body: `The exposure was 59.3 seconds, so the star delivered 5101 ÷ 59.3 = 86.0 electrons
             a second. A star of magnitude 0 gives, in this setup, <strong>3.50 × 10⁹</strong>
             electrons a second at the zenith (the 1.0 m aperture through V with the supplied
             throughput). The observed magnitude is −2.5 log₁₀ of the ratio. At an airmass of
             1.1 the air has dimmed the star by 0.2 × 0.1 = 0.02 magnitude, which is taken back
             off.`,
      prompt: 'What magnitude does the trace give the star?',
      unit: 'mag',
      answer: 19.0,
      tolerance: 0.03,
      hints: [
        'The observed magnitude is −2.5 log₁₀ of the rate over the zero point.',
        'Then take back the extinction the air added.',
      ],
      worked:
        '−2.5 log₁₀(86.0 ÷ 3.50×10⁹) = 19.02 observed; minus 0.02 for the air is 19.00 above the atmosphere: the magnitude the plan started from. The trace closes the loop: the counts hold the magnitude, to the uncertainty of the previous step.',
      feedback: {
        close: 'Close. Remember the 0.02 magnitude the air added.',
        'wrong-order-of-magnitude':
          'A faint star: a magnitude 0 star gives a billion electrons a second, and this one gives about a hundred.',
        off: '−2.5 log₁₀(rate ÷ zero point), minus the extinction.',
      },
      tool: NIGHT_EXP(),
    },
    {
      sid: 'the-calibration-term',
      stage: STAGE,
      type: 'measure',
      title: 'Step 4: what the calibration adds',
      body: `The calibration panel’s synthetic night leaves a calibrated target good to some
             small uncertainty (it is a different instrument from the planner’s; only the size of
             the uncertainty a night of fourteen standards leaves carries over). Read the
             <strong>zero point at airmass 1</strong> with its uncertainty, and the
             uncertainty of the calibrated <strong>target star</strong>.`,
      fields: [
        {
          id: 'sigz',
          label: 'Zero point uncertainty',
          unit: 'mag',
          hint: '0.003',
        },
        {
          id: 'sigt',
          label: 'Calibrated target uncertainty',
          unit: 'mag',
          hint: '0.008',
        },
      ],
      validate: v => {
        if (![v.sigz, v.sigt].every(Number.isFinite)) return null;
        if (near(v.sigz, 0.003, 0.0012) && near(v.sigt, 0.008, 0.0015)) {
          return {
            level: 'ok',
            message:
              'The zero point is known to 0.003 magnitude and the calibrated target to 0.008: the target’s figure includes the extinction, the colour term and the standards’ own scatter. The trace uses the larger, 0.008.',
          };
        }
        return {
          level: 'error',
          message:
            'On the clear night read the “±” after “Zero point at airmass 1” and after the calibrated magnitude in “Target star”.',
        };
      },
      tool: CAL(),
    },
    {
      sid: 'adding-in-quadrature',
      stage: STAGE,
      type: 'question',
      kind: 'numeric',
      title: 'Step 5: the total',
      body: `Two independent uncertainties: 0.02195 from the star’s photons and 0.008 from
             the calibration.`,
      prompt:
        'What is the total one-sigma uncertainty of the calibrated magnitude?',
      unit: 'mag',
      answer: 0.02337,
      tolerance: 0.0012,
      hints: ['The square root of the sum of the squares.'],
      worked:
        '√(0.02195² + 0.008²) = √(0.000482 + 0.000064) = 0.0234 magnitude. The report: V = 19.00 ± 0.02 (the second decimal is the last the uncertainty supports).',
      feedback: {
        close: 'Close. Square, add, root.',
        'wrong-order-of-magnitude': 'About two hundredths of a magnitude.',
        off: '√(0.02195² + 0.008²).',
      },
      tool: NIGHT_EXP(),
    },
    {
      sid: 'which-term-wins',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Where the uncertainty comes from',
      body: `The trace carried two terms and a total of 0.0234 magnitude.`,
      prompt: 'Which statement does the trace support?',
      options: [
        'The star’s photon noise supplies about 88 percent of the variance, so more light improves the number most',
        'The calibration supplies most of the variance, so better standards improve it most',
        'The two contribute equally',
        'The uncertainty is dominated by the atmosphere’s extinction',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'calibration',
          option: 1,
          say: 'The calibration’s variance is 0.000064 against the star’s 0.000482: 12 percent of the total.',
        },
        {
          id: 'extinction',
          option: 3,
          say: 'The extinction is inside the calibration’s 0.008, which is the smaller term.',
        },
      ],
      hints: ['Compare the two variances, not the two uncertainties.'],
      because:
        'Variances add: 0.000482 of 0.000546 is 88 percent, from the star. Reading the shares off the variances, not the uncertainties, is the quick way to see which term to attack.',
      tool: NIGHT_EXP(),
    },
    {
      sid: 'halve-it',
      stage: STAGE,
      type: 'measure',
      title: 'Halving the uncertainty',
      body: `Twice the signal-to-noise halves the photon term. Read the total exposure for a
             target signal-to-noise of <strong>50</strong> and of <strong>100</strong> (the
             rest unchanged); the instrument divides.`,
      fields: [
        {
          id: 't50',
          label: 'Total exposure, signal-to-noise 50',
          unit: 's',
          hint: '59.3',
        },
        {
          id: 't100',
          label: 'Total exposure, signal-to-noise 100',
          unit: 's',
          hint: '191',
        },
        {
          id: 'ratio',
          label: 'Times longer',
          unit: '',
          compute: v => v.t100 / v.t50,
          decimals: 2,
        },
      ],
      validate: v => {
        if (![v.t50, v.t100].every(Number.isFinite)) return null;
        if (near(v.t50, 59.3, 1.2) && near(v.t100, 191.4, 4)) {
          return {
            level: 'ok',
            message:
              '3.2 times longer, not 4. Where the star’s photons dominate the signal-to-noise grows as the square root of the time, so doubling it costs 4; but part of the noise is read noise, which does not grow with time, so each extra second buys a little more than the square root says.',
          };
        }
        return {
          level: 'error',
          message:
            'Keep the facility, brightness 19, one exposure and airmass 1.1; set the target to 50, then to 100, and read “Total exposure”.',
        };
      },
      tool: NIGHT_EXP({ target: 100 }),
    },
    {
      sid: 'the-number-you-would-report',
      stage: STAGE,
      type: 'question',
      kind: 'short',
      reflect: true,
      title: 'The number you would report',
      body: `The trace ends with a magnitude and an uncertainty: 19.00 ± 0.02.`,
      prompt:
        'Write the result as a sentence for a report: the number with its uncertainty, the band, what it is calibrated to, and one thing it assumes.',
    },
    {
      sid: 'what-you-worked-out',
      stage: STAGE,
      type: 'read',
      title: 'What you worked out',
      body: `A magnitude-19 star gave 5101 electrons with a noise of 103: a signal-to-noise of
             49.5, which is 0.022 magnitude. Its rate, 86 electrons a second, gave 19.02
             magnitudes observed and 19.00 above the atmosphere. The calibration added 0.008,
             in quadrature: a total of 0.023 magnitude, 88 percent of the variance from the
             star’s photons. Halving the uncertainty cost 3.2 times the exposure, not 4,
             because part of the noise is the camera’s.
             \n\nThe trace is a prediction under stated assumptions. The planner’s zero point is
             a supplied throughput and the calibration’s instrument is its own: the chain
             shows the arithmetic, not a real telescope. It leaves out flat-field error,
             crowding and the changing sky.`,
      tool: NIGHT_EXP(),
    },
  ],
};

export const FROM_PHOTONS_TO_A_NUMBER_DEEPER = {
  id: 'from-photons-to-a-number',
  steps: [
    {
      sid: 'a-flat-field-floor',
      after: 'which-term-wins',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'A floor under the uncertainty',
      body: `A flat field is never perfect. Suppose a systematic error of 1 percent (0.0109
             magnitude) is left in the star’s flux, independent of the others.`,
      prompt:
        'What is the total uncertainty with the photon term (0.02195), the calibration (0.008) and the floor (0.0109)?',
      unit: 'mag',
      answer: 0.0258,
      tolerance: 0.0012,
      hints: ['Square all three, add them, take the root.'],
      worked:
        '√(0.02195² + 0.008² + 0.0109²) = √(0.000482 + 0.000064 + 0.000119) = 0.0258 magnitude: the floor adds 10 percent to the total, still behind the star’s photons.',
      feedback: {
        close: 'Close. Three squares, one root.',
        'wrong-order-of-magnitude':
          'About two and a half hundredths of a magnitude.',
        off: '√(0.02195² + 0.008² + 0.0109²).',
      },
      tool: NIGHT_EXP(),
    },
    {
      sid: 'where-the-floor-wins',
      after: 'a-flat-field-floor',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'Where the floor wins',
      body: `The photon term falls as the signal-to-noise rises; the floor does not. A floor of
             1 percent of the flux is 0.0109 magnitude, and the photon term is the same
             1.0857 times the fractional error 1 ÷ (signal-to-noise). The planner warns
             about this above a signal-to-noise of 100.`,
      prompt:
        'At what signal-to-noise does the photon term equal a floor of 1 percent?',
      unit: '',
      answer: 100,
      tolerance: 3,
      hints: ['Where is the fractional photon error, 1 ÷ S, equal to 0.01?'],
      worked:
        'The floor is a fractional error of 0.01; the photon term is a fractional error of 1 ÷ S, so they are equal at S = 100. That is the point where the planner’s warning begins: beyond it, more exposure buys almost nothing, because the floor does not shrink with time.',
      feedback: {
        close:
          'Close. The photon term equals the floor where the fractional error is 1 percent.',
        'wrong-order-of-magnitude': 'About a hundred.',
        off: '1 ÷ 0.01.',
      },
      tool: NIGHT_EXP({ target: 150 }),
    },
  ],
};

// =============================================================================
// Spanish shadows: aligned by index with the English steps
// =============================================================================

export const WHICH_INSTRUMENT_FOR_WHICH_QUESTION_ES = {
  title: '¿Qué instrumento para qué pregunta?',
  subtitle:
    'Cinco instalaciones de la biblioteca de instrumentos, la misma estrella débil y lo que decide la elección: luz, muestreo, campo y longitud de onda',
  objectives: [
    'Comparar instalaciones por lo que declara la biblioteca de instrumentos (área colectora, escala de píxel, campo, longitud de onda) y por la exposición que cada una necesita para una estrella',
    'Decir qué propiedad de un instrumento decide qué pregunta puede responder: la luz para las fuentes débiles, el muestreo para las imágenes nítidas, el campo para los objetos grandes y la longitud de onda para la física',
    'Decir por qué el instrumento más rápido para una estrella no siempre es el adecuado',
    'Elegir un instrumento para una pregunta dada y justificarlo con los números de la biblioteca',
  ],
  steps: [
    {
      title: 'Primero una pregunta, después un instrumento',
      body: 'La <strong>biblioteca de instrumentos</strong> de Gravitas contiene cinco instalaciones, cada valor con su cita en un artículo o en la página de la instalación y cada valor que falta dejado sin rellenar: dos telescopios pequeños de Las Cumbres, Rubin, la cámara de TESS y el Green Bank Telescope. Un telescopio no es bueno ni malo: es bueno para una pregunta. Esta investigación plantea una pregunta a todos ellos, una estrella débil, y luego otras tres que la misma tabla responde de otra manera.\n\nEl <strong>planificador de exposición</strong> junto al texto lee la biblioteca: el área colectora, la escala de píxel, el ruido de lectura, el cielo y el seeing de un sitio. Todas las imágenes son sintéticas. La parte de la luz que entrega el sistema y la corriente oscura son valores didácticos que el planificador marca como aportados, porque la biblioteca no los declara.',
    },
    {
      title: 'Una estrella, tres instalaciones',
      body: 'Una estrella de magnitud <strong>22</strong>, una señal a ruido de <strong>20</strong>, una exposición, vista en el cenit. Elige cada instalación por turno (<strong>Las Cumbres 0,35 m, V</strong>, <strong>Las Cumbres 1,0 m, V</strong> y <strong>Rubin, r</strong>) y lee la <strong>exposición total</strong> que pide cada una. La banda de Rubin es r y la de las otras V; la estrella tiene el mismo brillo en cada una.',
      fields: [
        { label: 'Las Cumbres 0,35 m' },
        { label: 'Las Cumbres 1,0 m' },
        { label: 'Rubin' },
      ],
    },
    {
      title: 'Por qué el telescopio pequeño necesita tanto más',
      body: 'El telescopio de 1,0 m recoge 0,785 metros cuadrados de luz; el de 0,35 m, con su obstrucción central, 0,066: 11,9 veces menos. Divide la exposición que necesita el pequeño entre la que pide el mayor.',
      prompt:
        '¿Cuántas veces más tiempo necesita el telescopio de 0,35 m que el de 1,0 m para esta estrella?',
      hints: [
        'Divide la primera exposición que leíste entre la segunda.',
        'Es más que el 11,9 de las áreas colectoras. Mira el seeing de cada sitio en la fila «De la biblioteca de instrumentos» del planificador.',
      ],
      worked:
        '12 070,7 ÷ 602,2 = 20,0. El 11,9 del área colectora es el primer factor; el segundo es que el sitio del telescopio pequeño tiene un seeing de 1,3 segundos de arco frente a 0,9, así que su abertura contiene más cielo para la misma estrella. Una exposición limitada por el cielo crece como el cielo en la abertura dividido entre la luz de la estrella.',
    },
    {
      title: '¿Es el más rápido el instrumento adecuado?',
      body: 'Rubin necesita 15 segundos para una estrella que el telescopio de 1,0 m tarda diez minutos en medir. Un estudiante concluye que Rubin debería usarse para toda estrella débil.',
      prompt: '¿Qué es lo mejor que se puede decir de esa conclusión?',
      options: [
        'Es correcta: el telescopio más rápido es el mejor para toda pregunta',
        'El tiempo es un coste. La pregunta también necesita el campo, los píxeles, la longitud de onda y una forma de apuntar el instrumento donde y cuando la pregunta lo pida, y la biblioteca no dice nada de lo último',
        'Es errónea porque un telescopio mayor es menos exacto',
        'Es correcta para las estrellas débiles y para nada más, porque solo las estrellas débiles están limitadas por la luz',
      ],
      misconceptions: [
        {
          say: 'El tiempo hasta una señal a ruido responde a una pregunta: cuánto tardo en recoger suficiente luz. Una pregunta sobre una galaxia de 40 minutos de arco o sobre una línea de 21 centímetros tiene otra propiedad decisiva.',
        },
        {
          say: 'El tamaño fija cuánta luz se recoge, no lo exacta que es una medida; una medida exacta sigue necesitando muestreo, calibración y un instrumento estable.',
        },
        {
          say: 'La luz decide para las fuentes débiles y no para las grandes, las brillantes ni otras longitudes de onda: los tres pasos siguientes muestran cada caso.',
        },
      ],
      hints: [
        'Mira las filas que da la biblioteca además del área colectora: escala de píxel, campo, rango de longitudes de onda.',
      ],
      because:
        'El tiempo de exposición es un coste entre varios. La biblioteca también contiene la escala de píxel, el campo de visión y el rango de longitudes de onda; que un observador pueda apuntar el instrumento a un objetivo elegido en una noche elegida (un sondeo sigue su propio calendario) es un dato que la biblioteca no contiene y la comparación omite.',
    },
    {
      title: '¿Los píxeles muestrean el desenfoque?',
      body: 'Elige <strong>Las Cumbres 0,35 m, V</strong>. La fila «De la biblioteca de instrumentos» del planificador da la <strong>escala de píxel</strong> y el <strong>seeing</strong> de su sitio, ambos en segundos de arco. Escríbelos y el instrumento divide: el número de píxeles a través del desenfoque (su anchura a media altura). Una regla común pide al menos dos.',
      fields: [
        { label: 'Escala de píxel' },
        { label: 'Seeing (FWHM)' },
        { label: 'Píxeles a través de la FWHM' },
      ],
    },
    {
      title: 'Cuánto cielo contiene una imagen',
      body: 'La cámara del telescopio de 0,35 m ve un campo de 1,9 por 1,2 grados (2,28 grados cuadrados). La cámara del telescopio de 1,0 m ve 26,5 minutos de arco por lado (26,5 ÷ 60 = 0,442 grados; 0,195 grados cuadrados).',
      prompt:
        '¿Cuántas imágenes de la cámara de 1,0 m hacen falta para cubrir el campo de una imagen de la cámara de 0,35 m?',
      hints: ['Divide las dos áreas en grados cuadrados.'],
      worked:
        '2,28 ÷ 0,195 = 11,7: unos doce apuntados del telescopio mayor para cubrir lo que el pequeño ve de una vez. Eso es lo que vale el campo, y por eso el telescopio mayor no es simplemente mejor.',
    },
    {
      title: 'Una galaxia de cuarenta minutos de arco',
      body: 'Un estudiante quiere una sola imagen de una galaxia de 40 minutos de arco. Los campos son: la cámara de 0,35 m, 114 por 72 minutos de arco; la de 1,0 m, 26,5 por 26,5; Rubin, 9,6 grados cuadrados (un círculo de unos 3,5 grados) y las cámaras de TESS, 24 por 24 grados.',
      prompt: '¿Cuál de estas no puede contener la galaxia en una imagen?',
      options: [
        'Las Cumbres 0,35 m',
        'Las Cumbres 1,0 m',
        'Rubin',
        'Una cámara de TESS',
      ],
      misconceptions: [
        {
          say: 'Un espejo mayor no implica un campo menor: el de Rubin es el más ancho de los tres telescopios de tierra, porque su óptica se diseñó para un campo amplio.',
        },
        {
          say: 'El telescopio de 0,35 m tiene el campo más ancho de los dos de Las Cumbres: su cámara es un sensor grande detrás de un telescopio corto y luminoso.',
        },
      ],
      hints: ['Compara 40 minutos de arco con el lado menor de cada campo.'],
      because:
        'La cámara de 1,0 m solo abarca 26,5 minutos de arco por lado, así que la galaxia necesitaría un mosaico. Las demás la contienen, y la elección entre ellas es entonces cuestión de resolución y de luz, no de campo: los píxeles de TESS son de 21 segundos de arco y mostrarían la galaxia como una mancha.',
    },
    {
      title: 'La línea de 21 centímetros',
      body: 'Un estudiante quiere cartografiar el hidrógeno neutro de una galaxia cercana, que radia a una longitud de onda de 21 centímetros (una frecuencia de 1420 MHz).',
      prompt: '¿Qué instalación de la biblioteca puede hacer esta observación?',
      options: [
        'Rubin, porque es la mayor',
        'Cualquiera de los telescopios ópticos, con una exposición suficientemente larga',
        'El Green Bank Telescope: su receptor cubre de 1,15 a 1,73 GHz y su haz a 1420 MHz es de 9,1 minutos de arco',
        'TESS, porque está por encima de la atmósfera',
      ],
      misconceptions: [
        {
          say: 'Un detector óptico no responde a las ondas de radio con ninguna exposición: la longitud de onda es un límite duro, no un coste.',
        },
        {
          say: 'La cámara de Rubin registra las bandas ópticas y del infrarrojo cercano de u a y. El tamaño de un espejo no mueve la longitud de onda que puede detectar.',
        },
      ],
      hints: [
        'Compara 21 centímetros con el rango de longitudes de onda que cubre la fila de cada instrumento en la biblioteca.',
      ],
      because:
        'Solo el receptor de Green Bank cubre la frecuencia de la línea. La comparación ya no trata del tiempo, y ese es el punto: antes de planificar una exposición, la longitud de onda decide si un instrumento es candidato. El haz de 9,1 minutos de arco es también la resolución angular del mapa.',
    },
    {
      title: 'Tu propia pregunta',
      body: 'Elige una pregunta tuya sobre el cielo (el periodo de una estrella, la forma de una galaxia, el tránsito de un planeta, una nube de gas). No la respondas: elige un instrumento para ella.',
      prompt:
        '¿Con qué instrumento de la biblioteca empezarías para tu pregunta, y qué propiedad suya (luz, píxeles, campo, longitud de onda) decide la elección? Nombra uno que no serviría, y por qué.',
    },
    {
      title: 'Lo que averiguaste',
      body: 'Para una estrella de magnitud 22 con una señal a ruido de 20, las tres instalaciones de tierra necesitaron 12 070, 602 y 15 segundos: la luz que recoge cada una fija la mayor parte, y el seeing de su sitio el resto. Pero un tiempo es la respuesta a una sola pregunta. Una galaxia de 40 minutos de arco es la pregunta del campo, y la cámara de 1,0 m no la contiene; una línea de 21 centímetros es la de la longitud de onda, y solo el radiotelescopio puede tomarla; y los píxeles del telescopio de 0,35 m, 1,8 a través de un desenfoque de 1,3 segundos de arco, son los del muestreo.\n\nLa biblioteca son unas pocas instalaciones con cita, no los instrumentos del cielo, y la comparación omite lo que ninguna tabla tiene: quién puede apuntar el instrumento, cuándo y a qué coste.',
    },
  ],
};

export const WHICH_INSTRUMENT_FOR_WHICH_QUESTION_DEEPER_ES = {
  steps: [
    {
      title: 'Luz por campo',
      body: 'Para muchos apuntados, lo que importa es cuánta luz se recoge <em>y</em> cuánto cielo se ve de una vez: el área colectora por el campo. El área colectora efectiva de Rubin es de 33,2 metros cuadrados y su campo de 9,6 grados cuadrados; los del telescopio de 1,0 m, 0,785 y 0,195.',
      prompt:
        '¿Cuántas veces mayor es el producto del área por el campo de Rubin que el del telescopio de 1,0 m?',
      hints: [
        'Multiplica el área de cada telescopio por su campo y divide.',
        'Rubin tiene 42 veces el área y 49 veces el campo.',
      ],
      worked:
        '(33,18 × 9,6) ÷ (0,785 × 0,195) = 318,5 ÷ 0,1532 = 2079. Para una estrella Rubin es solo unas 40 veces más rápido (15 segundos frente a 602); para un campo es 2000 veces más rápido, porque además ve 49 veces más cielo de una vez.',
    },
    {
      title: '¿Cuarenta veces o dos mil?',
      body: 'Una estrella: Rubin es 40 veces más rápido que el telescopio de 1,0 m. Un campo entero: unas 2000.',
      prompt: '¿Por qué son tan distintos los dos cocientes?',
      options: [
        'Porque el segundo es un error',
        'Porque una estrella usa una fracción del campo de Rubin y un sondeo lo llena entero: el campo 49 veces mayor no vale nada para una sola estrella y lo vale todo para un millón',
        'Porque Rubin tiene mejores píxeles',
        'Porque el cielo es más brillante en un campo amplio',
      ],
      misconceptions: [
        {
          say: 'Los píxeles de Rubin son más finos (0,2 segundos de arco frente a 0,389), lo que ayuda al muestreo pero no es lo que separa los dos cocientes; el campo sí.',
        },
      ],
      hints: ['Uno de los dos números incluye el campo y el otro no.'],
      because:
        'Una estrella ilumina una parte pequeña de cualquier imagen, así que solo ayuda el área colectora; un sondeo de una región usa cada píxel del campo. Una pregunta sobre un objeto y una sobre una población son preguntas distintas, y el mismo instrumento puede ser cien veces mejor para una que para la otra.',
    },
  ],
};

export const THE_SKY_BACKGROUND_ES = {
  title: 'El fondo de cielo',
  subtitle:
    'El cielo es una luz propia: lo brillante que es dentro de la abertura de una estrella, lo que cuesta un cielo más brillante en exposición y cuándo importa la Luna',
  objectives: [
    'Convertir un brillo de cielo en magnitudes por segundo de arco cuadrado en el cielo dentro de la abertura de una estrella, y compararlo con la estrella',
    'Decir cómo crece la exposición para una señal a ruido fija con un cielo más brillante, y por qué una exposición limitada por el cielo crece como la luz del cielo y no como su raíz cuadrada',
    'Decir cuándo importa la Luna (fuentes débiles) y cuándo apenas (brillantes), y leer las horas que está sobre el horizonte en un plan de noche',
    'Decir qué sabe la biblioteca del cielo (sitios oscuros, banda por banda) y qué no (una ciudad, la luz cambiante de la Luna)',
  ],
  steps: [
    {
      title: 'Lo más brillante de la imagen',
      body: 'Entre las estrellas el cielo no es negro. El aire brilla, la luz de la Luna dispersada y la luz de las ciudades se suman, y lo que suman se mide como un <strong>brillo superficial</strong>: magnitudes por segundo de arco cuadrado. Una estrella débil hay que medirla encima de ese cielo, y los fotones del propio cielo son el ruido.\n\nEl <strong>planificador de exposición</strong> lee el sitio de Rubin en la biblioteca de instrumentos: en la banda r el cielo es de <strong>21,2</strong> magnitudes por segundo de arco cuadrado y el seeing de <strong>0,65</strong> segundos de arco. Todas las imágenes son sintéticas. La biblioteca contiene solo sitios oscuros; no tiene ninguna ciudad, así que nada de aquí trata de un sitio real con contaminación lumínica.',
    },
    {
      title: 'El cielo dentro de la abertura',
      body: 'El planificador mide una estrella en un círculo de radio 1,5 veces el seeing: 1,5 × 0,65 = 0,975 segundos de arco, un área de π × 0,975² = 2,99 segundos de arco cuadrados. Una magnitud por segundo de arco cuadrado es un brillo para un segundo de arco cuadrado, así que el cielo del círculo entero es más brillante (una magnitud menor) en 2,5 log₁₀ de esa área.',
      prompt:
        '¿Cuál es la magnitud de todo el cielo dentro de la abertura, para un brillo superficial de 21,2?',
      hints: [
        'Resta 2,5 log₁₀(2,99) de 21,2.',
        '2,5 log₁₀(2,99) vale unos 1,2.',
      ],
      worked:
        '21,2 − 2,5 log₁₀(2,99) = 21,2 − 1,19 = 20,01. El cielo del círculo es tan brillante como una estrella de magnitud 20.',
    },
    {
      title: 'Cuántas estrellas de cielo',
      body: 'La estrella es de magnitud 23, y el cielo dentro de su abertura es tan brillante como una estrella de magnitud 20,01. Tres magnitudes son un factor de 2,512³.',
      prompt:
        '¿Cuántas veces más luz da el cielo dentro de la abertura que la estrella?',
      hints: ['10 elevado a 0,4 veces la diferencia de magnitudes.'],
      worked:
        '10^(0,4 × (23 − 20,01)) = 10^1,195 = 15,7. La estrella es una decimosexta parte de la luz de su propia abertura; su señal es un pequeño bulto sobre el cielo, y el ruido del cielo es lo que la exposición debe vencer.',
    },
    {
      title: 'Un plan en una noche oscura',
      body: 'Con <strong>Rubin, r</strong>, una magnitud de <strong>23</strong>, una señal a ruido objetivo de <strong>20</strong> y <strong>2</strong> exposiciones, lee la <strong>exposición total</strong> y la parte del ruido al cuadrado que corresponde al <strong>cielo</strong>, en por ciento.',
      fields: [
        { label: 'Exposición total' },
        { label: 'Parte del ruido al cuadrado del cielo' },
      ],
    },
    {
      title: 'Un cielo más brillante',
      body: 'Una Luna brillante hace el cielo más brillante. Supón que el cielo fuera <strong>2 magnitudes</strong> más brillante, es decir 6,3 veces más luz. Todavía no muevas el control.',
      prompt:
        'La exposición para la misma estrella y la misma señal a ruido será&hellip;',
      options: [
        'La misma: la estrella no ha cambiado',
        'Unas 2,5 veces mayor, porque 2 magnitudes son un factor de 2,5',
        'Algo menos de 6,3 veces mayor: casi tanto como la luz del cielo, no tan poco como su raíz cuadrada',
        'Unas 2,5 veces mayor, porque el ruido crece como la raíz cuadrada del cielo',
      ],
      hints: [
        'El ruido es la raíz cuadrada de los fotones del cielo; la señal tiene que vencerlo.',
      ],
      because:
        'Unas 5,6 veces mayor, algo menos que las 6,3 veces más luz de cielo. La señal crece como el tiempo y el ruido como su raíz cuadrada, así que para conservar el cociente el tiempo debe crecer como la luz del cielo; los fotones de la propia estrella y el ruido de lectura no crecen, y esa es la pequeña diferencia.',
    },
    {
      title: 'Dos magnitudes de Luna',
      body: 'Escribe la exposición del plan anterior, luego pon <strong>Cielo más brillante en</strong> en <strong>2</strong> magnitudes y escribe la nueva exposición total. El instrumento divide la segunda entre la primera.',
      fields: [
        { label: 'Exposición total, cielo oscuro' },
        { label: 'Exposición total, cielo 2 mag más brillante' },
        { label: 'Veces mayor' },
      ],
    },
    {
      title: 'Tres magnitudes',
      body: 'Pon <strong>Cielo más brillante en</strong> en <strong>3</strong>, el cielo de un lugar 16 veces más brillante que un sitio oscuro, y lee la exposición total.',
      prompt:
        '¿Cuántas veces mayor es la exposición que con el cielo oscuro (79,8 segundos)?',
      hints: ['Divide la nueva exposición total entre 79,8.'],
      worked:
        '1105 ÷ 79,8 = 13,8, para 15,8 veces la luz del cielo. Cada magnitud de cielo cuesta unas 2,5 veces la exposición: la estrella es la misma, el plan es de 18 minutos en vez de 80 segundos.',
    },
    {
      title: 'Por qué la exposición sigue la luz del cielo',
      body: 'Un estudiante dice: «El ruido solo crece como la raíz cuadrada de los fotones del cielo, así que un cielo 16 veces más brillante debería costar solo 4 veces la exposición».',
      prompt: '¿Qué tiene de erróneo?',
      options: [
        'Nada: la exposición crece como la raíz cuadrada del cielo',
        'El ruido sí crece como la raíz cuadrada, pero la señal crece solo como el tiempo, así que para conservar la señal a ruido la exposición debe crecer como la propia luz del cielo',
        'La luz del cielo crece como el cuadrado de la magnitud',
        'El detector se satura a cuatro veces la exposición',
      ],
      misconceptions: [
        {
          say: 'La raíz cuadrada está en el ruido. La señal a ruido es la señal entre el ruido, y la señal crece como el tiempo, así que el tiempo necesario va como el ruido al cuadrado, que es la luz del cielo.',
        },
      ],
      hints: [
        'Escribe la señal a ruido como los electrones de la estrella entre la raíz de los del cielo: ¿cómo depende cada uno de la exposición t?',
      ],
      because:
        'Señal ∝ t y ruido ∝ √(cielo · t), así que la señal a ruido ∝ √t · (estrella ÷ √cielo), y la exposición para un valor fijo ∝ la luz del cielo. Los 13,8 medidos frente a 15,8 son los fotones de la propia estrella y el ruido de lectura, que no escalan con el cielo.',
    },
    {
      title: 'Cuando la Luna no importa',
      body: 'Elige <strong>Las Cumbres 1,0 m, V</strong>, una exposición, un objetivo de <strong>20</strong>. Lee la exposición total para una estrella de magnitud <strong>20</strong> y para una de magnitud <strong>17</strong>, cada una con el cielo oscuro y con el cielo <strong>3 magnitudes</strong> más brillante.',
      fields: [
        { label: 'Magnitud 20, cielo oscuro' },
        { label: 'Magnitud 20, cielo 3 mag más brillante' },
        { label: 'Magnitud 17, cielo oscuro' },
        { label: 'Magnitud 17, cielo 3 mag más brillante' },
      ],
    },
    {
      title: 'El cielo es más brillante en el rojo',
      body: 'La biblioteca declara el brillo del cielo de Rubin banda por banda: <strong>g</strong> 22,26, <strong>r</strong> 21,20 e <strong>i</strong> 20,48 magnitudes por segundo de arco cuadrado (el modelo de cielo oscuro del diseño de referencia). El brillo propio del aire es más intenso a longitudes de onda mayores.',
      prompt:
        '¿Cuántas veces más luz da un segundo de arco cuadrado de cielo en i que en g?',
      hints: ['10 elevado a 0,4 veces la diferencia de las dos magnitudes.'],
      worked:
        '10^(0,4 × (22,26 − 20,48)) = 10^0,712 = 5,15. La misma estrella cuesta más exposición en i que en g no solo porque los filtros difieran, sino porque el cielo detrás es cinco veces más brillante.',
    },
    {
      title: 'Un cielo que la biblioteca no tiene',
      body: 'La biblioteca contiene tres sitios oscuros y ninguna ciudad. El control «cielo más brillante en» es un desplazamiento de ejercicio, no una medida: la luz real de una Luna depende de su fase, de su altura y de lo lejos que esté del objetivo, y nada de eso está modelado.',
      prompt:
        'Si el cielo de tu campus fuera tres magnitudes más brillante que el de un sitio oscuro, ¿qué cambiarías en un plan de observación y qué tendrías que medir primero?',
    },
    {
      title: 'Lo que averiguaste',
      body: 'En el cielo oscuro de Rubin (21,2 magnitudes por segundo de arco cuadrado) el cielo dentro de la abertura de una estrella es tan brillante como una estrella de magnitud 20, dieciséis veces una de magnitud 23. Un plan para ella tardó 80 segundos y el 87 por ciento del ruido era del cielo. Un cielo 2 magnitudes más brillante costó 5,6 veces la exposición y uno 3 magnitudes más brillante 13,8 veces, porque la exposición sigue la luz del cielo y no su raíz cuadrada. Una estrella brillante apenas lo nota (1,2 veces); una débil paga entero (4,7 veces). Y el cielo es cinco veces más brillante en i que en g.\n\nLos números son un modelo: sitios oscuros, un desplazamiento declarado para un cielo más brillante, sin geometría de la luz de la Luna. Una noche real añade la fase y la posición de la Luna, las nubes y el crepúsculo, y un observador mide el cielo en la propia imagen en vez de fiarse de una tabla.',
    },
  ],
};

export const THE_SKY_BACKGROUND_DEEPER_ES = {
  steps: [
    {
      title: 'Una abertura más ancha contiene más cielo',
      body: 'Pon el <strong>radio de abertura</strong> en 2,5 veces el seeing: un círculo de radio 2,5 × 0,65 = 1,625 segundos de arco, un área de 8,30 segundos de arco cuadrados.',
      prompt:
        '¿Cuál es la magnitud del cielo dentro de esta abertura, para un brillo superficial de 21,2?',
      hints: ['La misma resta que antes, con el área mayor.'],
      worked:
        '21,2 − 2,5 log₁₀(8,30) = 21,2 − 2,30 = 18,90. El cielo del círculo es 2,8 veces más brillante que en la primera abertura, mientras la luz de la estrella apenas crece: una abertura más ancha es un mal trato para una estrella débil.',
    },
    {
      title: 'Elegir la noche',
      body: 'El planificador de noche muestra las horas que la Luna está sobre el horizonte dentro de la oscuridad astronómica en un sitio a 30° de latitud norte. Lee <strong>Horas que la Luna está sobre el horizonte en la oscuridad</strong> para la noche del <strong>29-01-2025</strong> (día 28, Luna nueva) y para la del <strong>13-01-2025</strong> (día 12, Luna llena).',
      fields: [
        { label: 'Horas arriba, noche de Luna nueva' },
        { label: 'Horas arriba, noche de Luna llena' },
      ],
    },
  ],
};

export const COORDINATES_AND_TIME_ES = {
  title: 'Coordenadas y tiempo en profundidad',
  subtitle:
    'El tiempo sidéreo y el ángulo horario, el minuto en que una estrella cruza el meridiano y lo que la precesión hace a una posición de catálogo',
  objectives: [
    'Decir por qué el cielo se adelanta al reloj 3 minutos y 56 segundos al día, y medirlo con los cruces del meridiano de una estrella',
    'Hallar la hora en que una estrella cruza el meridiano a partir del tiempo sidéreo a medianoche y la ascensión recta de la estrella, y el ángulo horario a cualquier hora del reloj',
    'Decir por qué una posición de catálogo lleva una época, y hallar el cambio que la precesión causa en una posición en 25 años en ascensión recta y en declinación',
    'Decir qué hace una posición de catálogo sin corregir a dónde apunta un telescopio, en segundos de arco y en píxeles',
  ],
  steps: [
    {
      title: 'Dos relojes',
      body: 'Un día del reloj es el tiempo que tarda el Sol en volver al mismo lugar del cielo. Las estrellas vuelven antes, porque en ese tiempo la Tierra también se ha movido un grado a lo largo de su órbita: un <strong>día sidéreo</strong> es el tiempo que tardan las estrellas en volver, <strong>23 horas 56 minutos 4,09 segundos</strong> de tiempo del reloj. Los observatorios llevan los dos. El <strong>tiempo sidéreo</strong> de un lugar es la ascensión recta que está ahora en su meridiano.\n\nEl panel del <strong>cielo que gira</strong> de la investigación de nivel básico <em>El cielo que gira</em> da, para una estrella y una noche, el tiempo sidéreo a la medianoche que cierra la fecha, y cuándo la estrella sale, cruza el meridiano y se pone. Cada número se calcula con el núcleo del Laboratorio del Cielo, un modelo del cielo y no una observación.',
    },
    {
      title: 'Cuánto más corto que un día',
      body: 'Un día solar son 24 horas, u 86 400 segundos. Un día sidéreo son 23 horas 56 minutos 4,09 segundos.',
      prompt: '¿Cuántos segundos más corto es un día sidéreo que un día solar?',
      hints: ['Convierte 23 h 56 min 4,09 s en segundos y réstalo de 86 400.'],
      worked:
        '23 × 3600 + 56 × 60 + 4,09 = 86 164,09 segundos; 86 400 − 86 164,09 = 235,9 segundos, o 3 minutos 55,9 segundos. Una estrella que cruza el meridiano a una hora del reloj lo cruza 3 minutos 56 segundos antes la noche siguiente.',
    },
    {
      title: 'Medir la ganancia en el cielo',
      body: 'Elige <strong>Sirio</strong> a 40° de latitud. Lee los minutos tras el mediodía en que <strong>cruza el meridiano</strong> la primera noche (<strong>0</strong> noches desde el 01-01-2025) y treinta noches después. El instrumento divide la diferencia entre 30.',
      fields: [
        { label: 'Cruce, noche 0' },
        { label: 'Cruce, noche 30' },
        { label: 'Antes cada noche' },
      ],
    },
    {
      title: '¿Cuándo cruza?',
      body: 'Una estrella cruza el meridiano cuando el tiempo sidéreo es igual a su ascensión recta. El panel dice que el tiempo sidéreo a la medianoche que cierra la fecha es <strong>6,792 h</strong> y la ascensión recta de catálogo de Sirio es <strong>6,752 h</strong>: la estrella cruza <em>antes</em> de la medianoche, cuando el tiempo sidéreo era menor. El tiempo sidéreo avanza 1,0027379 horas por cada hora del reloj, así que fue estas horas antes de la medianoche: (6,792 − 6,752) ÷ 1,0027379. Escribe las dos lecturas del panel; el instrumento da el cruce en minutos tras el mediodía (la medianoche es 720).',
      fields: [
        { label: 'Tiempo sidéreo a medianoche' },
        { label: 'Ascensión recta de Sirio' },
        { label: 'Cruce, minutos tras el mediodía' },
      ],
    },
    {
      title: 'Un minuto de diferencia',
      body: 'Tu cruce es 717,6 minutos tras el mediodía. La fila «Cruza el meridiano» del panel dice 718,7.',
      prompt:
        '¿Cuántos minutos más tarde es el cruce del panel que el que calculaste?',
      hints: ['Resta tu cruce del del panel.'],
      worked:
        '718,7 − 717,6 = 1,1 minutos. La ascensión recta del catálogo es para una referencia fija (J2000,0); el panel cruza la estrella donde está en la fecha. Los pasos siguientes dicen por qué las dos difieren.',
    },
    {
      title: 'Por qué el panel es más tardío',
      body: 'El catálogo da la ascensión recta de Sirio como 6,752 h. El Sirio del núcleo cruza 1,1 minutos más tarde que un cálculo con ese número.',
      prompt: '¿Cuál es la razón principal?',
      options: [
        'El reloj del panel va lento',
        'El eje de la Tierra experimenta precesión: el ecuador y el equinoccio a los que se refiere el catálogo (J2000,0) se han movido, así que la ascensión recta de la fecha de la estrella es mayor en cerca de un minuto de tiempo',
        'Sirio se mueve por el espacio tan deprisa que su ascensión recta crece un minuto en 25 años',
        'La refracción eleva la estrella y por eso cruza más tarde',
      ],
      misconceptions: [
        {
          say: 'El movimiento propio de Sirio cambia su posición unos 1,3 segundos de arco al año, cerca de un segundo de tiempo en 25 años: el minuto es precesión, que mueve a todas las estrellas.',
        },
        {
          say: 'La refracción cambia la altura aparente de una estrella, no la hora a la que está en el meridiano: una estrella en el meridiano no tiene refracción en acimut.',
        },
      ],
      hints: [
        'Las coordenadas del catálogo tienen una época. ¿Qué hace el eje de la Tierra a lo largo de 25 años?',
      ],
      because:
        'Precesión: el eje de la Tierra traza un cono en 25 800 años, moviendo el equinoccio a lo largo del ecuador 50 segundos de arco al año, así que toda ascensión recta crece, unos 3 segundos de tiempo al año cerca del ecuador. En 25 años es un minuto: el panel usa el lugar de la estrella para la noche, el número del catálogo es de 2000.',
    },
    {
      title: 'Con tus palabras',
      body: 'Has encontrado lo mismo de dos maneras: una estrella llega 3 minutos 56 segundos antes cada noche, y el tiempo sidéreo a medianoche sube unos 3,9 minutos de reloj cada día.',
      prompt:
        'Explica, como a un amigo, por qué las estrellas salen antes cada noche, y qué le dice a un observador el tiempo sidéreo de un lugar.',
    },
    {
      title: 'Lo que averiguaste',
      body: 'Un día sidéreo es 235,9 segundos más corto que un día solar, lo que el panel confirmó como 3,93 minutos antes cada noche para Sirio. Con el tiempo sidéreo a medianoche y la ascensión recta hallaste que la estrella cruza el meridiano a los 717,6 minutos tras el mediodía, y que el cruce del núcleo es un minuto más tardío porque una posición de catálogo lleva una época: la ascensión recta de la fecha se ha movido desde 2000. El modelo de apuntado de un telescopio hace esta aritmética para cada objetivo.\n\nEl panel es un modelo del cielo, calculado con el núcleo del Laboratorio del Cielo. Usa el lugar aparente de la estrella, con precesión, nutación y aberración; esta investigación separó la primera, la mayor, y dejó las otras para una mirada más profunda.',
    },
  ],
};

export const COORDINATES_AND_TIME_DEEPER_ES = {
  steps: [
    {
      title: 'El cambio en ascensión recta',
      body: 'A primer orden, una posición se mueve cada año <em>m</em> + <em>n</em> sen α tan δ segundos de tiempo en ascensión recta, con <em>m</em> = 3,075 s y <em>n</em> = 1,336 s al año, y 20,04 cos α segundos de arco en declinación. Sirio está en α = 101,29° (6,752 h) y δ = −16,72°. La fecha del panel es 25 años después de J2000.',
      prompt:
        '¿Cuántos segundos de tiempo ha cambiado su ascensión recta en 25 años?',
      hints: [
        'Primero el ritmo anual: 3,075 + 1,336 × sen(101,29°) × tan(−16,72°).',
        'El ritmo es de unos 2,7 segundos al año.',
      ],
      worked:
        '3,075 + 1,336 × 0,9806 × (−0,3008) = 2,681 segundos al año; × 25 = 67,0 segundos. La precesión rigurosa del núcleo da 67,1 segundos (0,2797 grados): la fórmula de primer orden es buena a una décima de segundo en este intervalo y a esta declinación. 67 segundos son 1,1 minutos: el minuto del paso anterior.',
    },
    {
      title: 'El cambio en declinación',
      body: 'Usa la fórmula de declinación: 20,04 cos α segundos de arco al año, con α = 101,29° (cos α = −0,196), durante 25 años.',
      prompt:
        '¿Cuántos segundos de arco ha cambiado la declinación de Sirio (da el número con signo)?',
      hints: ['Multiplica el ritmo anual por cos α y por el número de años.'],
      worked:
        '20,04 × (−0,196) × 25 = −98,4 segundos de arco; la precesión rigurosa da −99,5. La declinación disminuye: Sirio queda 1,7 minutos de arco más al sur de lo que dice el catálogo.',
    },
    {
      title: 'Lo que cuesta una posición sin corregir',
      body: 'Se apunta un telescopio con la posición de catálogo J2000 de Sirio y sin precesión. La cámara del telescopio de 1,0 m tiene píxeles de 0,389 segundos de arco, así que un desplazamiento de 99,5 segundos de arco en declinación es cierto número de píxeles.',
      prompt: '¿Cuántos píxeles son solo el error en declinación?',
      hints: [
        'Divide los segundos de arco entre los segundos de arco por píxel.',
      ],
      worked:
        '99,5 ÷ 0,389 = 256 píxeles en declinación, y un desplazamiento en ascensión recta de 67 segundos de tiempo son 1007 segundos de arco, 965 en el cielo (× cos δ), otros 2500 píxeles. La estrella ni siquiera está en la imagen: su campo mide 26,5 minutos de arco de ancho, 4096 píxeles, y el apuntado se equivoca en 16 minutos de arco. Los modelos de apuntado siempre aplican la precesión.',
    },
  ],
};

export const A_NIGHT_AT_THE_TELESCOPE_ES = {
  title: 'Una noche en el telescopio, de principio a fin',
  subtitle:
    'Planificar, exponer, calibrar, medir e informar una estrella con un plan preparado: cinco estaciones, cada una con el número que entrega a la siguiente',
  objectives: [
    'Seguir una observación por sus cinco estaciones (plan, exposición, calibración, medida e informe) y nombrar lo que cada una entrega a la siguiente',
    'Leer las horas utilizables y la mejor masa de aire de un plan de noche, y decir qué supone un plan sobre el tiempo',
    'Planificar la exposición para una señal a ruido, calibrar con estrellas patrón, comprobar una imagen sintética con la predicción y combinar las incertidumbres en cuadratura',
    'Decir qué término de la incertidumbre final es el mayor y qué mejoraría más el número',
  ],
  steps: [
    {
      title: 'Cinco estaciones',
      body: 'Una observación es una cadena. Un <strong>plan</strong> dice cuándo un objetivo está alto y a oscuras; una <strong>exposición</strong> es lo bastante larga para alcanzar una señal a ruido; una <strong>calibración</strong> convierte cuentas en una magnitud; una <strong>medida</strong> lee las cuentas de la imagen; y un <strong>informe</strong> da el número con aquello a lo que es bueno. Cada estación es un instrumento que ya conoces, y cada una entrega a la siguiente un número.\n\nEsta investigación sigue un plan preparado: una estrella de magnitud 19 en el telescopio de 1,0 m de Las Cumbres, la noche del 29-01-2025 (Luna nueva), desde un sitio a 30° de latitud norte. Cada imagen y cada noche de estrellas patrón es <strong>sintética</strong>, y los valores de la instalación son los de la biblioteca de instrumentos; nadie ha observado esto. La primera estación es el planificador de noche.',
    },
    {
      title: 'Estación 1: ¿cuándo está alta?',
      body: 'El planificador usa <strong>Régulo</strong> en lugar de la posición del campo. Lee las <strong>horas de oscuridad astronómica</strong> de esa noche y, para Régulo, las <strong>horas utilizables</strong> (por debajo de una masa de aire de 2, a oscuras) y la <strong>mejor masa de aire</strong> que alcanza.',
      fields: [
        { label: 'Horas de oscuridad astronómica' },
        { label: 'Régulo, horas utilizables' },
        { label: 'Régulo, mejor masa de aire' },
      ],
    },
    {
      title: 'Un plan supone noches despejadas',
      body: 'Un plan para una noche no dice nada de las nubes. El <strong>planificador de estrategia</strong> de las investigaciones de estrategia de observación reparte tres visitas por noche en una quincena y saca el tiempo de una cadena declarada (el 60 por ciento de las noches despejadas, con persistencia). Lee su fila <strong>Visitas</strong>: cuántas visitas se ejecutaron de cuántas planificadas.',
      prompt:
        '¿Qué parte de las visitas planificadas se llevó el tiempo, en por ciento?',
      hints: [
        'Visitas perdidas = planificadas − ejecutadas; divide entre las planificadas.',
      ],
      worked:
        '(42 − 24) ÷ 42 = 42,9 por ciento. El planificador saca noches enteras perdidas de una cadena de tiempo con semilla; la fracción real en un sitio real es una estadística climática que la biblioteca no contiene, así que el número es una lección sobre planes, no un pronóstico.',
    },
    {
      title: 'Estación 2: ¿qué limita la exposición?',
      body: 'La estrella es de magnitud 19 y el cielo oscuro del telescopio de 1,0 m es de 22 magnitudes por segundo de arco cuadrado. Queremos una señal a ruido de 50 en una exposición con una masa de aire de 1,1. Todavía no leas el planificador.',
      prompt: 'El mayor término del presupuesto de ruido será&hellip;',
      options: [
        'Los fotones de la propia estrella',
        'Los fotones del cielo en la abertura',
        'La corriente oscura',
        'El ruido de lectura de la cámara',
      ],
      hints: [
        'Compara la estrella de magnitud 19 con el cielo dentro de su abertura, que en este sitio sale cerca de la magnitud 20.',
      ],
      because:
        'Los fotones de la propia estrella, el 49 por ciento, con el ruido de lectura el 28 y el cielo el 23. Una estrella tan brillante contra un cielo oscuro está limitada por sí misma, no por el cielo como las más débiles.',
    },
    {
      title: 'Estación 2: ¿cuánto exponer?',
      body: 'Usa el <strong>planificador de exposición</strong>: Las Cumbres 1,0 m en V, un brillo de <strong>19</strong>, una señal a ruido objetivo de <strong>50</strong>, una exposición y una masa de aire de <strong>1,1</strong> (la del plan). Lee la <strong>exposición total</strong> y el por ciento del ruido al cuadrado que viene de los <strong>fotones del objetivo</strong>.',
      fields: [
        { label: 'Exposición total' },
        { label: 'Parte de los fotones del objetivo' },
      ],
    },
    {
      title: 'Estación 3: ¿cuánto vale una cuenta?',
      body: 'El panel de <strong>calibración</strong> es una noche sintética de estrellas patrón cuyas magnitudes se conocen: ajusta el punto cero, la extinción del aire y un término de color a ellas, y dice qué deja sin saber la noche sobre un objetivo. Lee el <strong>punto cero a masa de aire 1</strong>, la <strong>extinción</strong> y la incertidumbre de una sigma de la <strong>magnitud calibrada de la estrella objetivo</strong>. El instrumento del panel es uno sintético propio; lo que pasa a la cadena es el tamaño de la incertidumbre que deja una noche de catorce patrones.',
      fields: [
        { label: 'Punto cero a masa de aire 1' },
        { label: 'Extinción del aire, k' },
        { label: 'Incertidumbre del objetivo calibrado' },
      ],
    },
    {
      title: 'Estación 4: ¿qué dice la imagen?',
      body: 'Vuelve al planificador de exposición con el mismo plan. La imagen junto a la lectura es una exposición sintética de exactamente ese plan. Lee la señal a ruido <strong>predicha</strong> para su abertura y la señal a ruido <strong>medida</strong> en ella con fotometría de abertura.',
      fields: [
        { label: 'Señal a ruido predicha' },
        { label: 'Señal a ruido medida' },
      ],
    },
    {
      title: 'Estación 5: el número y a qué es bueno',
      body: 'Una señal a ruido de 50 es una incertidumbre fotométrica de 1,0857 ÷ 50 = 0,0217 magnitudes (1,0857 es 2,5 ÷ ln 10). La calibración deja 0,008. Dos incertidumbres independientes se combinan como la raíz cuadrada de la suma de sus cuadrados.',
      prompt:
        '¿Cuál es la incertidumbre total de una sigma de la magnitud informada, en magnitudes?',
      hints: ['Eleva al cuadrado cada incertidumbre, súmalas y toma la raíz.'],
      worked:
        '√(0,0217² + 0,008²) = √(0,000471 + 0,000064) = 0,0231 magnitudes: el informe dice «V = (valor calibrado) ± 0,023». Sumarlas como 0,0217 + 0,008 = 0,0297 la exageraría; los errores independientes no caen todos en el mismo sentido.',
    },
    {
      title: '¿Qué mejoraría más el número?',
      body: 'El informe es bueno a 0,023 magnitudes: 0,022 de los fotones de la estrella y 0,008 de la calibración.',
      prompt: '¿Qué cambio mejoraría más la incertidumbre final?',
      options: [
        'Calibrar mejor: reducir a la mitad los 0,008 de la calibración',
        'Recoger más luz de la estrella: una exposición más larga o un telescopio mayor',
        'Usar un filtro distinto',
        'Nada: 0,023 magnitudes es lo mejor que da la fotometría',
      ],
      misconceptions: [
        {
          say: 'Reducir a la mitad el término de la calibración baja el total de 0,0231 a 0,0225, menos de un tres por ciento: el término mayor en una suma en cuadratura es casi todo.',
        },
        {
          say: 'La fotometría llega a 0,01 magnitudes y menos para estrellas brillantes; un suelo del aplanado ronda el uno por ciento, y los pasos profundos de la investigación lo encuentran.',
        },
      ],
      hints: ['En una suma de cuadrados domina el término mayor.'],
      because:
        'El ruido de fotones de la estrella es el término mayor, así que más luz es lo que ayuda: doblar la señal a ruido lo reduce a la mitad. La calibración ya es pequeña y mejorarla más cambia poco hasta que se reduzca el ruido de fotones.',
    },
    {
      title: 'Qué podría salir mal',
      body: 'La cadena dio un número, y cada estación supuso algo: una noche despejada, una calibración válida toda la noche, una imagen sin defectos.',
      prompt:
        'Nombra una suposición de una estación que podría fallar en una noche real, di qué verías si fallara y qué harías.',
    },
    {
      title: 'Lo que averiguaste',
      body: 'La estación 1 halló 8,1 horas utilizables con una masa de aire de 1,05 en una noche de Luna nueva, y el planificador de estrategia mostró que un plan de varias noches pierde el 43 por ciento de sus visitas con una cadena de tiempo declarada. La estación 2 pidió 59 segundos para una señal a ruido de 50, limitada por los fotones de la propia estrella. La estación 3 calibró con patrones a 0,008 magnitudes. La estación 4 halló la señal a ruido medida de la imagen a un sorteo de la predicción. La estación 5 combinó 0,022 y 0,008 en 0,023 magnitudes, y el término mayor, los fotones de la estrella, es el que hay que mejorar.\n\nCada imagen y noche de aquí es sintética y los valores de la instalación son los de la biblioteca; la cadena es una predicción con suposiciones declaradas, y deja fuera el error de aplanado y de resta de cielo, el amontonamiento, las nubes y una atmósfera cambiante. La siguiente investigación, <em>De fotones a un número</em>, traza la aritmética de las estaciones 2 a 5 en un solo cálculo.',
    },
  ],
};

export const A_NIGHT_AT_THE_TELESCOPE_DEEPER_ES = {
  steps: [
    {
      title: 'El mismo plan con una Luna brillante',
      body: 'Supón que la Luna estuviera sobre el horizonte y hiciera el cielo <strong>2 magnitudes</strong> más brillante (pon <strong>Cielo más brillante en</strong> en 2: un desplazamiento de ejercicio, no un modelo de luz lunar). Lee la nueva exposición total.',
      prompt:
        '¿Cuántas veces mayor es la exposición que con el cielo oscuro (59,3 segundos)?',
      hints: ['Divide la nueva exposición total entre 59,3.'],
      worked:
        '123,3 ÷ 59,3 = 2,08. El cielo es 6,3 veces más brillante pero la exposición solo se duplica, porque la mitad del ruido eran los fotones de la propia estrella, que el cielo no toca: para un objetivo brillante la Luna cuesta poco, para uno débil (la investigación del fondo de cielo) es toda la exposición.',
    },
    {
      title: 'Dividir la exposición',
      body: 'Devuelve el cielo a oscuro y pon el número de <strong>exposiciones</strong> en 2 (un telescopio puede no poder tomar una sola imagen larga). Lee el total.',
      prompt:
        '¿Cuántas veces mayor es el total que con una exposición (59,3 segundos)?',
      hints: ['Divide el total de dos exposiciones entre 59,3.'],
      worked:
        '70,5 ÷ 59,3 = 1,19. Cada imagen paga una vez el ruido de lectura de la cámara, así que dos imágenes llevan el doble de ruido de lectura, y los fotones de la estrella y del cielo se recogen igual se divida como se divida el tiempo.',
    },
  ],
};

export const FROM_PHOTONS_TO_A_NUMBER_ES = {
  title: 'De fotones a un número',
  subtitle:
    'La cadena entera como un solo cálculo trazado: electrones, ruido, señal a ruido, magnitud, calibración y la incertidumbre que se arrastra en cada paso',
  objectives: [
    'Trazar una magnitud por la aritmética de una medida: electrones, ruido, señal a ruido, incertidumbre de la magnitud, magnitud instrumental y magnitud calibrada',
    'Arrastrar una incertidumbre por cada paso y combinar las independientes en cuadratura',
    'Decir cuánto cuesta reducir a la mitad la incertidumbre, y por qué no siempre son cuatro veces',
    'Hallar dónde un suelo sistemático (error de aplanado) supera al ruido de fotones',
  ],
  steps: [
    {
      title: 'Un número, trazado',
      body: 'La investigación anterior recorrió las estaciones de una noche. Esta escribe la aritmética de las cuatro últimas como una sola traza: los <strong>electrones</strong> que la estrella pone en su abertura, el <strong>ruido</strong> sobre ellos, la <strong>señal a ruido</strong> y la incertidumbre de la magnitud que implica, la <strong>magnitud</strong> de la estrella a partir de su tasa y la <strong>calibración</strong> sumada en cuadratura.\n\nEl planificador de exposición da los electrones y el ruido de una estrella de magnitud 19 en el telescopio de 1,0 m de Las Cumbres con una masa de aire de 1,1, una señal a ruido de 50 y una exposición. Todas las imágenes son sintéticas; el punto cero del planificador es un modelo de rendimiento con un rendimiento aportado de 0,5, un valor didáctico, no el del telescopio.',
    },
    {
      title: 'Paso 1: señal y ruido',
      body: 'En la fila <strong>Predicho para la abertura de la propia imagen</strong> el planificador da los electrones que la estrella pone en la abertura, con su ruido. Escríbelos; el instrumento forma la señal a ruido.',
      fields: [
        { label: 'Señal' },
        { label: 'Ruido' },
        { label: 'Señal a ruido' },
      ],
    },
    {
      title: 'Paso 2: la incertidumbre de una magnitud',
      body: 'Una incertidumbre fraccionaria del flujo δF ÷ F es una incertidumbre en la magnitud de 2,5 ÷ ln 10 = 1,0857 veces eso. La incertidumbre fraccionaria es la inversa de la señal a ruido.',
      prompt:
        '¿Cuál es la incertidumbre de una sigma de la magnitud instrumental, con una señal a ruido de 49,45, en magnitudes?',
      hints: ['1,0857 dividido entre la señal a ruido.'],
      worked:
        '1,0857 ÷ 49,45 = 0,02195 magnitudes. Una regla para llevar en la cabeza: una señal a ruido de 100 son 0,011 magnitudes, y de 20 son 0,054.',
    },
    {
      title: 'Paso 3: de electrones a una magnitud',
      body: 'La exposición fue de 59,3 segundos, así que la estrella entregó 5101 ÷ 59,3 = 86,0 electrones por segundo. Una estrella de magnitud 0 da, en esta configuración, <strong>3,50 × 10⁹</strong> electrones por segundo en el cenit (la abertura de 1,0 m a través de V con el rendimiento aportado). La magnitud observada es −2,5 log₁₀ del cociente. Con una masa de aire de 1,1 el aire ha atenuado la estrella 0,2 × 0,1 = 0,02 magnitudes, que se restituyen.',
      prompt: '¿Qué magnitud da la traza para la estrella?',
      hints: [
        'La magnitud observada es −2,5 log₁₀ de la tasa entre el punto cero.',
        'Luego devuelve la extinción que añadió el aire.',
      ],
      worked:
        '−2,5 log₁₀(86,0 ÷ 3,50×10⁹) = 19,02 observada; menos 0,02 del aire son 19,00 por encima de la atmósfera: la magnitud con la que empezó el plan. La traza cierra el círculo: las cuentas contienen la magnitud, con la incertidumbre del paso anterior.',
    },
    {
      title: 'Paso 4: lo que añade la calibración',
      body: 'La noche sintética del panel de calibración deja un objetivo calibrado con cierta incertidumbre pequeña (es un instrumento distinto del del planificador; solo pasa el tamaño de la incertidumbre que deja una noche de catorce patrones). Lee el <strong>punto cero a masa de aire 1</strong> con su incertidumbre, y la incertidumbre de la <strong>estrella objetivo</strong> calibrada.',
      fields: [
        { label: 'Incertidumbre del punto cero' },
        { label: 'Incertidumbre del objetivo calibrado' },
      ],
    },
    {
      title: 'Paso 5: el total',
      body: 'Dos incertidumbres independientes: 0,02195 de los fotones de la estrella y 0,008 de la calibración.',
      prompt:
        '¿Cuál es la incertidumbre total de una sigma de la magnitud calibrada?',
      hints: ['La raíz cuadrada de la suma de los cuadrados.'],
      worked:
        '√(0,02195² + 0,008²) = √(0,000482 + 0,000064) = 0,0234 magnitudes. El informe: V = 19,00 ± 0,02 (el segundo decimal es el último que sostiene la incertidumbre).',
    },
    {
      title: 'De dónde viene la incertidumbre',
      body: 'La traza llevó dos términos y un total de 0,0234 magnitudes.',
      prompt: '¿Qué afirmación respalda la traza?',
      options: [
        'El ruido de fotones de la estrella aporta cerca del 88 por ciento de la varianza, así que más luz mejora más el número',
        'La calibración aporta la mayor parte de la varianza, así que mejores patrones lo mejoran más',
        'Los dos aportan por igual',
        'La incertidumbre está dominada por la extinción de la atmósfera',
      ],
      misconceptions: [
        {
          say: 'La varianza de la calibración es 0,000064 frente a 0,000482 de la estrella: el 12 por ciento del total.',
        },
        {
          say: 'La extinción está dentro de los 0,008 de la calibración, que es el término menor.',
        },
      ],
      hints: ['Compara las dos varianzas, no las dos incertidumbres.'],
      because:
        'Las varianzas se suman: 0,000482 de 0,000546 es el 88 por ciento, de la estrella. Leer las proporciones en las varianzas, no en las incertidumbres, es la forma rápida de ver qué término atacar.',
    },
    {
      title: 'Reducir a la mitad la incertidumbre',
      body: 'El doble de señal a ruido reduce a la mitad el término de fotones. Lee la exposición total para una señal a ruido objetivo de <strong>50</strong> y de <strong>100</strong> (lo demás sin cambiar); el instrumento divide.',
      fields: [
        { label: 'Exposición total, señal a ruido 50' },
        { label: 'Exposición total, señal a ruido 100' },
        { label: 'Veces mayor' },
      ],
    },
    {
      title: 'El número que informarías',
      body: 'La traza termina con una magnitud y una incertidumbre: 19,00 ± 0,02.',
      prompt:
        'Escribe el resultado como una frase de informe: el número con su incertidumbre, la banda, a qué está calibrado y una cosa que supone.',
    },
    {
      title: 'Lo que averiguaste',
      body: 'Una estrella de magnitud 19 dio 5101 electrones con un ruido de 103: una señal a ruido de 49,5, que son 0,022 magnitudes. Su tasa, 86 electrones por segundo, dio 19,02 magnitudes observadas y 19,00 por encima de la atmósfera. La calibración añadió 0,008, en cuadratura: un total de 0,023 magnitudes, el 88 por ciento de la varianza de los fotones de la estrella. Reducir a la mitad la incertidumbre costó 3,2 veces la exposición, no 4, porque parte del ruido es de la cámara.\n\nLa traza es una predicción con suposiciones declaradas. El punto cero del planificador es un rendimiento aportado y el instrumento de la calibración es propio: la cadena muestra la aritmética, no un telescopio real. Deja fuera el error de aplanado, el amontonamiento y el cielo cambiante.',
    },
  ],
};

export const FROM_PHOTONS_TO_A_NUMBER_DEEPER_ES = {
  steps: [
    {
      title: 'Un suelo bajo la incertidumbre',
      body: 'Un aplanado nunca es perfecto. Supón que queda un error sistemático del 1 por ciento (0,0109 magnitudes) en el flujo de la estrella, independiente de los demás.',
      prompt:
        '¿Cuál es la incertidumbre total con el término de fotones (0,02195), la calibración (0,008) y el suelo (0,0109)?',
      hints: ['Eleva los tres al cuadrado, súmalos y toma la raíz.'],
      worked:
        '√(0,02195² + 0,008² + 0,0109²) = √(0,000482 + 0,000064 + 0,000119) = 0,0258 magnitudes: el suelo añade un 10 por ciento al total, todavía por detrás de los fotones de la estrella.',
    },
    {
      title: 'Dónde gana el suelo',
      body: 'El término de fotones baja al subir la señal a ruido; el suelo no. Un suelo del 1 por ciento del flujo son 0,0109 magnitudes, y el término de fotones es el mismo 1,0857 por el error fraccionario 1 ÷ (señal a ruido). El planificador avisa de esto por encima de una señal a ruido de 100.',
      prompt:
        '¿A qué señal a ruido iguala el término de fotones a un suelo del 1 por ciento?',
      hints: [
        '¿Dónde el error fraccionario de fotones, 1 ÷ S, es igual a 0,01?',
      ],
      worked:
        'El suelo es un error fraccionario de 0,01; el término de fotones es un error fraccionario de 1 ÷ S, así que son iguales en S = 100. Ese es el punto donde empieza el aviso del planificador: más allá, más exposición no compra casi nada, porque el suelo no disminuye con el tiempo.',
    },
  ],
};

// =============================================================================
// Instructor content
// =============================================================================

const GUIDE = (
  topic,
  overview,
  difficulty,
  placement,
  concepts,
  misconceptions,
  notes,
  discussion,
  extensions,
  priorKnowledge
) => ({
  topic,
  difficulty,
  placement,
  overview,
  priorKnowledge,
  keyConcepts: concepts,
  features: [
    {
      name: 'The panels (exposure planner, night planner, turning sky, calibration and strategy panels)',
      text: 'The instruments of Prompts 208 to 215 and the survey sky lessons, set to a prepared plan: every number a step states is the instrument’s own, over the instrument library’s cited table (Prompt 209) with a supplied throughput and dark current the planner labels as supplied.',
    },
    {
      name: 'Depth',
      text: 'Each investigation has deeper steps (quantitative) that add a derived number or a limit; the introductory path follows a prepared plan and never asks a student to design one.',
    },
    {
      name: 'Synthetic, stated',
      text: 'Every frame and night of standards is synthetic and says so; the library has dark sites only, no city and no moonlight model, and the investigations say what they leave out.',
    },
  ],
  misconceptions,
  teachingNotes: notes,
  discussion,
  extensions,
  modelNotes:
    'js/kernels/detector/snr.js (planExposure) through js/exposureWidgets.js and js/instruments/exposure.js over the instrument library (INSTRUMENTS.md); the night and turning-sky panels are js/skyWidgets.js over js/kernels/sky/; the calibration panel is js/photcalWidgets.js over js/kernels/detector/photcal.js; the strategy planner is js/strategyWidgets.js over js/kernels/strategy/.',
});

const CONTENT = {
  'which-instrument-for-which-question': GUIDE(
    'Choosing an instrument by the property that decides the question: light for faint sources, pixels for sampling, field for large objects, wavelength for the physics, read from the instrument library',
    'Students put one faint star to three facilities (12,070, 602 and 15 seconds), say why the small telescope takes 20 times the larger’s time, check the sampling of the 0.35 m pixels (1.8 across the seeing), count the frames of a field, and choose an instrument for a 40-arcminute galaxy and a 21 centimeter line; the deeper steps compute the product of area and field and why it separates one star from a survey.',
    'Majors observing unit (the quantitative depth adds the survey-speed product)',
    'In an observing or instrumentation unit after Plan an Exposure; before the survey-design investigations, whose Two Telescopes, One Question it prepares.',
    [
      {
        heading: 'Light is one cost',
        body: 'The exposure for a signal-to-noise follows the collecting area and the sky in the aperture: the 0.35 m telescope needs 20 times the 1.0 m’s time, 11.9 from the area and the rest from its site’s seeing.',
      },
      {
        heading: 'Sampling, field and wavelength decide other questions',
        body: 'Pixels across the seeing (1.8 for the 0.35 m, 2.3 for the 1.0 m, 3.3 for Rubin), the field (11.7 frames of the 1.0 m cover one of the 0.35 m) and the wavelength range (only the radio receiver takes 21 cm) are properties the library states.',
      },
      {
        heading: 'What the library does not hold',
        body: 'Whether an instrument may be pointed at a chosen target on a chosen night is not a table value; the comparison leaves it out and says so.',
      },
    ],
    [
      {
        claim: 'The fastest telescope is the best for every question.',
        response:
          'It answers how long a star takes; a large object, a radio line or a sharp image is decided by another property.',
      },
      {
        claim: 'A bigger mirror means a smaller field.',
        response:
          'Rubin has the widest ground field of the three; the field is set by the optical design, not the aperture alone.',
      },
      {
        claim:
          'An optical telescope can see anything with a long enough exposure.',
        response:
          'The wavelength is a hard limit: no exposure makes an optical detector respond to a 21 cm line.',
      },
      {
        claim:
          'Two pixels across the seeing is the same as sampled well enough.',
        response:
          'It is a rule of thumb for adequate sampling; below it a star’s centre is found less well than its signal-to-noise promises.',
      },
    ],
    [
      'Rubin’s band is r and the Las Cumbres telescopes’ V in step 2; the star is the same brightness in each, and the three are the planner’s facility choices (Rubin g and i are not offered, see the register).',
      'The library holds five facilities and one typical entry; a value a source does not state is absent, and the planner’s throughput, dark current and (for the Las Cumbres telescopes) extinction are labelled as supplied.',
      'The field of the 0.35 m camera (1.9 by 1.2 degrees) and of Sinistro (26.5 arcminutes) are the library’s; Rubin’s 9.6 square degrees is a field area, not a rectangle.',
      'The reflection is not marked: it gives the class a question of its own to carry into the next unit.',
    ],
    [
      'Which property decides the choice for a transiting planet around a bright star, and which instrument in the library would you start with?',
      'Why is a long list of instruments a list of questions, and not a ranking?',
      'What would you need to know that the library does not tell you before you booked time?',
    ],
    [
      'Choose the best facility for each of four questions of your own and say which table row decided each.',
      'Find a facility outside the library whose field and pixel scale you would add, and say what sources you would cite.',
    ],
    [
      'Magnitudes as a logarithmic brightness scale',
      'That a longer exposure reaches fainter sources, and what a signal-to-noise is (Plan an Exposure)',
      'A telescope’s collecting area, field of view and pixel scale',
    ]
  ),
  'the-sky-background': GUIDE(
    'The sky as a source of noise: surface brightness in magnitudes per square arcsecond, the sky inside a star’s aperture, what a brighter sky costs in exposure (it follows the sky’s light), and when the Moon matters',
    'Students turn 21.2 magnitudes per square arcsecond into 20.0 inside an aperture, find the sky is 16 times the star, read a sky-limited plan (80 seconds, 87 percent sky), see a sky 2 and 3 magnitudes brighter cost 5.6 and 13.8 times, compare a faint and a bright star under the Moon (4.7 against 1.2 times), and find the sky five times brighter in i than in g; the deeper steps widen the aperture and read the Moon’s hours from the night planner.',
    'Majors observing unit (the quantitative depth adds the wider aperture and the choice of night)',
    'In an observing unit after Plan an Exposure, before a photometry or survey-design investigation.',
    [
      {
        heading: 'A surface brightness is per square arcsecond',
        body: 'The sky in an aperture is brighter by 2.5 log₁₀ of its area: 21.2 becomes 20.0 in a circle of 1.5 seeing radii.',
      },
      {
        heading: 'The exposure follows the sky’s light',
        body: 'Signal grows as the time and the noise as the root of the sky’s photons times the time, so the exposure for a fixed signal-to-noise is proportional to the sky’s light (13.8 against 15.8 for 3 magnitudes: the star and the camera do not scale).',
      },
      {
        heading: 'The Moon matters for faint sources',
        body: 'A bright star’s exposure is set by its own light and the read noise: the same 3 magnitudes cost 1.2 times at magnitude 17 and 4.7 at magnitude 20.',
      },
    ],
    [
      {
        claim: 'The exposure only grows as the square root of the sky.',
        response:
          'The square root is in the noise; the signal-to-noise needs the signal over it, so the time follows the sky’s light.',
      },
      {
        claim: 'The sky is black between the stars.',
        response:
          'It is about as bright as a magnitude-20 star inside a star’s aperture; the star is a bump on it.',
      },
      {
        claim: 'The Moon matters equally for every target.',
        response:
          'It costs a faint source nearly the full factor and a bright one almost nothing.',
      },
      {
        claim: 'The panel models moonlight.',
        response:
          'It does not: “sky brighter by” is a stated exercise offset, and the library holds dark sites only.',
      },
    ],
    [
      'The planner reads Rubin’s r band: sky 21.2, seeing 0.65, library values; the Rubin g and i settings of the planner are not used (see the register).',
      'The sky of 5.15 times in i against g uses the library’s per-band sky table; the planner is not needed for it.',
      'The aperture of the panel is 1.5 seeing radii (the deeper step uses 2.5), so the sky in it is a function of the seeing, which is itself a table value.',
      'No city, no moonlight geometry and no twilight are modelled; the reflection asks students what they would measure first.',
    ],
    [
      'If your campus sky is 3 magnitudes brighter than a dark site, which programs on your telescope stop being worth doing?',
      'Why do observers pick a new-Moon night for a faint program and not for a bright one?',
      'How would you measure the sky in a frame rather than trust a table?',
    ],
    [
      'Repeat the exposure comparison for the 0.35 m telescope and say whether the Moon matters there.',
      'Compute the sky in the aperture for the 1.0 m telescope at its site (22.0, seeing 0.9) and compare it with Rubin’s.',
    ],
    [
      'Magnitudes and surface brightness',
      'A signal-to-noise and the terms of a noise budget (Plan an Exposure)',
      'Logarithms and powers of ten',
    ]
  ),
  'coordinates-and-time': GUIDE(
    'Sidereal time and the hour angle, the minute a star crosses the meridian, and precession as the reason a catalogue position carries an epoch',
    'Students compute that a sidereal day is 235.9 seconds short, measure 3.93 minutes a night from the meridian crossings of Sirius, find the crossing from the sidereal time and the right ascension (717.6 minutes after noon against the panel’s 718.7), and say why the panel is later; the deeper steps compute the 25-year shift (67 seconds of time in right ascension, −99.5 arcseconds in declination) and what it does to pointing (256 pixels in declination alone).',
    'Majors observing unit (the quantitative depth adds the precession arithmetic); the existing sky lessons are the survey tier',
    'In an observing unit after The Turning Sky and Plan a Night, before a pointing, a telescope or a catalogue lesson.',
    [
      {
        heading: 'Two clocks',
        body: 'A sidereal day is 23 h 56 min 4.09 s, 235.9 seconds shorter than a solar day, so a star crosses the meridian 3.93 minutes earlier each night.',
      },
      {
        heading:
          'A star crosses when the sidereal time equals its right ascension',
        body: 'The sidereal time runs 1.0027379 hours per clock hour; the hour angle is the sidereal time minus the right ascension.',
      },
      {
        heading: 'A catalogue position has an epoch',
        body: 'Precession moves the equinox about 50 arcseconds a year: in 25 years Sirius’s right ascension has grown 67 seconds of time and its declination moved −99.5 arcseconds.',
      },
    ],
    [
      {
        claim: 'A star rises at the same clock time every night.',
        response:
          'It rises about four minutes earlier each night, because the sky’s day is the sidereal day.',
      },
      {
        claim: 'The difference of a minute is the star’s own motion.',
        response:
          'Sirius’s proper motion is about 1.3 arcseconds a year; the minute is precession, which moves every star.',
      },
      {
        claim: 'Sidereal time is a different kind of time.',
        response:
          'It is the right ascension on the meridian now: a clock of the sky, with its own length of day.',
      },
      {
        claim:
          'A telescope can be pointed with the catalogue’s coordinates unchanged.',
        response:
          'Twenty-five years of precession is 16 arcminutes in right ascension for Sirius: the star would be out of a 26-arcminute frame.',
      },
    ],
    [
      'The panel’s “sidereal time at midnight” is for the midnight that ends the date (00:00 UT on the next day at longitude 0), which is why the arithmetic uses 720 minutes after noon.',
      'The panel crosses the star at its apparent place (precession, nutation, aberration); the investigation separates precession, the largest of the three, and leaves the others.',
      'The first-order formulas are good to a tenth of a second of time and a couple of arcseconds over 25 years at this declination; they fail near the pole.',
      'The reflection is not marked.',
    ],
    [
      'Why do observatories keep sidereal time as well as clock time?',
      'What would the pointing look like after 100 years without a correction?',
      'Which other effects move a catalogue position, and which of them can you correct from a catalogue alone?',
    ],
    [
      'Find the crossing time of a second star from the panel and from the catalogue, and compare the differences.',
      'Compute the shift for a star near the pole, where tan δ is large, and say why the first-order formula needs care.',
    ],
    [
      'The turning sky and the sidereal day (The Turning Sky)',
      'Right ascension and declination',
      'Angles in arcseconds and degrees',
    ]
  ),
  'a-night-at-the-telescope': GUIDE(
    'One observation through its five stations: plan the night, expose to a signal-to-noise, calibrate against standards, measure a frame, and report a magnitude with its uncertainty, all from a prepared plan',
    'Students read 8.1 usable hours at an airmass of 1.05 from the night planner, see the strategy planner lose 43 percent of a fortnight’s visits, predict and read a 59 second exposure limited by the star’s photons, read a calibration good to 0.008 magnitude, compare a predicted and a measured signal-to-noise (49.5 and 49.9) and combine 0.022 and 0.008 into 0.023 magnitude; the deeper steps add a bright Moon (2.1 times) and a split exposure (1.19 times).',
    'Majors observing unit (introductory path: follows a prepared plan; the quantitative depth changes the plan)',
    'In an observing unit after Plan an Exposure and Counts to Magnitudes; before From Photons to a Number.',
    [
      {
        heading: 'Each station hands on one number',
        body: 'The plan hands an airmass, the exposure a frame, the calibration an uncertainty, the measurement a signal-to-noise, and the report adds them.',
      },
      {
        heading: 'A plan assumes weather',
        body: 'The strategy planner’s seeded chain loses 18 of 42 visits; the number is a lesson about plans, not a forecast.',
      },
      {
        heading: 'The larger term is the one to improve',
        body: 'Variances add: the star’s photons are 88 percent of the total, so halving the calibration changes the total by under three percent.',
      },
    ],
    [
      {
        claim: 'A plan for one night is a plan for the observation.',
        response:
          'It leaves out the weather; the strategy planner shows how much of a campaign a stated chain removes.',
      },
      {
        claim: 'Uncertainties add as 0.022 + 0.008.',
        response:
          'Independent ones add in quadrature, 0.023, which is smaller.',
      },
      {
        claim: 'Better calibration is always the way to a better number.',
        response:
          'Only when the calibration term is the larger; here the star’s photons are.',
      },
      {
        claim:
          'The measured signal-to-noise should equal the prediction exactly.',
        response:
          'A frame is one draw of the noise: a signal-to-noise of 50 varies by about 1 in 50.',
      },
    ],
    [
      'Regulus stands in for the field’s position; the planner has eight bright stars and no target entry, and the lesson says so.',
      'The calibration panel’s instrument is its own synthetic one: only the size of its uncertainty carries over to the chain, which the step states.',
      'The exposure planner’s zero point is a supplied throughput (0.5), a teaching value; the report is a prediction under stated assumptions.',
      'The reflection is not marked: it asks for one assumption that could fail on a real night.',
    ],
    [
      'Which station would you trust least on a real night, and why?',
      'If the calibration were 0.02 magnitude, which term would dominate and what would you change?',
      'What does a plan across several nights say about asking for time?',
    ],
    [
      'Choose another star from the planner and repeat the first station for another date.',
      'Repeat the report for a star of magnitude 21 and say which term dominates.',
    ],
    [
      'The exposure planner and a signal-to-noise (Plan an Exposure)',
      'Counts and magnitudes (Counts to Magnitudes)',
      'Combining independent uncertainties in quadrature',
    ]
  ),
  'from-photons-to-a-number': GUIDE(
    'The whole chain as one traced calculation: electrons and noise, the signal-to-noise, the magnitude uncertainty (1.0857 over the signal-to-noise), the magnitude from the rate, the calibration added in quadrature, and where a systematic floor wins',
    'Students read 5101 electrons and a noise of 103, form a signal-to-noise of 49.5 and a magnitude uncertainty of 0.022, turn 86 electrons a second into magnitude 19.00 after the air’s 0.02, add the calibration’s 0.008 to 0.0234, see the photons are 88 percent of the variance, and find halving the uncertainty costs 3.2 times the exposure; the deeper steps add a 1 percent floor (0.0258) and find it equals the photon term at a signal-to-noise of 100.',
    'Upper-level observing unit (introductory path is the trace; the quantitative depth adds the floor)',
    'In an observing unit after A Night at the Telescope; a capstone for the unit’s uncertainty reasoning.',
    [
      {
        heading: 'Every step carries an uncertainty',
        body: 'The signal-to-noise gives the magnitude uncertainty by 1.0857 over its value; independent uncertainties add in quadrature.',
      },
      {
        heading: 'The magnitude is in the counts',
        body: 'The rate over the zero point gives the observed magnitude, and taking back the extinction closes the loop on the input.',
      },
      {
        heading: 'A floor does not shrink with time',
        body: 'A flat-field error of 1 percent equals the photon term at a signal-to-noise of 100, the point where the planner warns.',
      },
    ],
    [
      {
        claim:
          'Doubling the signal-to-noise always costs four times the exposure.',
        response:
          'Only where the star’s or the sky’s photons dominate; part of the noise here is the camera’s, so it cost 3.2.',
      },
      {
        claim: 'A calibrated magnitude has the calibration’s uncertainty only.',
        response:
          'It also has the measurement’s photon noise, usually the larger.',
      },
      {
        claim: 'The zero point is a property of the telescope.',
        response:
          'In this planner it is a supplied throughput model, a teaching value; a real zero point is measured on a night.',
      },
      {
        claim: 'More exposure always improves the number.',
        response:
          'Only until a systematic floor, such as flat-field error, equals the photon term.',
      },
    ],
    [
      'The planner’s zero point (3.50 × 10⁹ electrons a second at magnitude 0) is a supplied throughput of 0.5 over the library’s aperture, not the telescope’s; the step says so.',
      'The calibration panel is a different synthetic instrument: only the size of its uncertainty (0.008) carries into the trace.',
      'The aperture holds 99.8 percent of a star’s light, so the trace recovers 19.00 to within a few thousandths of a magnitude, not exactly.',
      'The reflection is not marked: it asks for the result as a sentence with its uncertainty and one assumption.',
    ],
    [
      'Which step of the trace is most affected by a wrong zero point?',
      'Why do observers combine uncertainties in quadrature and not linearly?',
      'At what brightness does the calibration become the larger term?',
    ],
    [
      'Repeat the trace for a star of magnitude 21 on the same telescope.',
      'Find the signal-to-noise at which the flat-field floor doubles the total uncertainty.',
    ],
    [
      'A signal-to-noise and the CCD equation (Plan an Exposure)',
      'Magnitudes and counts (Counts to Magnitudes)',
      'Logarithms, and combining independent uncertainties',
    ]
  ),
};

const FLOW = {
  'which-instrument-for-which-question': [
    {
      from: 'a-question-first',
      to: 'how-much-longer',
      text: 'A question first, one star on three facilities, and why the small telescope needs 20 times the larger’s time.',
    },
    {
      from: 'what-the-time-leaves-out',
      to: 'the-field',
      text: 'The fastest instrument is not always the right one: the pixels across the seeing and the field.',
    },
    {
      from: 'a-big-galaxy',
      to: 'the-wrong-wavelength',
      text: 'A galaxy 40 arcminutes across, and a line at 21 centimeters.',
    },
    {
      from: 'your-own-question',
      to: 'what-you-worked-out',
      text: 'A question of the student’s own, and the close.',
    },
  ],
  'the-sky-background': [
    {
      from: 'the-brightest-thing',
      to: 'sky-over-the-star',
      text: 'The sky as a source, its brightness inside an aperture and against the star.',
    },
    {
      from: 'a-sky-limited-plan',
      to: 'two-magnitudes-brighter',
      text: 'A sky-limited plan, the prediction for a brighter sky and the 2-magnitude measurement.',
    },
    {
      from: 'three-magnitudes-brighter',
      to: 'the-moon-and-a-bright-star',
      text: 'Three magnitudes, why the exposure follows the sky’s light, and a bright star under the Moon.',
    },
    {
      from: 'a-redder-sky',
      to: 'what-you-worked-out',
      text: 'The sky in the red, what the library does not have, and the close.',
    },
  ],
  'coordinates-and-time': [
    {
      from: 'two-clocks',
      to: 'a-day-that-is-short',
      text: 'Two clocks, and the 235.9 seconds a sidereal day is short.',
    },
    {
      from: 'earlier-each-night',
      to: 'from-sidereal-time-to-crossing',
      text: 'The gain measured from the sky, and the crossing from the sidereal time and the right ascension.',
    },
    {
      from: 'the-panel-is-later',
      to: 'why-later',
      text: 'A minute apart, and why: a catalogue position has an epoch.',
    },
    {
      from: 'in-your-words',
      to: 'what-you-worked-out',
      text: 'The student’s own explanation, and the close.',
    },
  ],
  'a-night-at-the-telescope': [
    {
      from: 'five-stations',
      to: 'station-weather',
      text: 'Five stations, and station 1: the night’s usable hours and the weather a plan assumes.',
    },
    {
      from: 'predict-the-limit',
      to: 'station-expose',
      text: 'Station 2: the prediction of what limits the exposure, and the exposure.',
    },
    {
      from: 'station-calibrate',
      to: 'station-measure',
      text: 'Station 3 and station 4: the calibration and the frame.',
    },
    {
      from: 'station-report',
      to: 'what-you-worked-out',
      text: 'Station 5: the report, which term to improve, what could go wrong, and the close.',
    },
  ],
  'from-photons-to-a-number': [
    {
      from: 'a-number-from-photons',
      to: 'the-magnitude-uncertainty',
      text: 'The chain as one trace, the signal and noise, and the magnitude uncertainty.',
    },
    {
      from: 'the-rate-to-a-magnitude',
      to: 'the-calibration-term',
      text: 'From electrons to a magnitude, and what the calibration adds.',
    },
    {
      from: 'adding-in-quadrature',
      to: 'which-term-wins',
      text: 'The total, and which term wins.',
    },
    {
      from: 'halve-it',
      to: 'what-you-worked-out',
      text: 'Halving the uncertainty, the number to report, and the close.',
    },
  ],
};

const EXPECTATIONS = {
  'which-instrument-for-which-question': {
    'the-same-star-three-ways':
      'About 12,070 s (within 250) for the 0.35 m telescope, 602 s (within 12) for the 1.0 m and 15.2 s (within 0.6) for Rubin, for a magnitude-22 star at a signal-to-noise of 20.',
    'how-much-longer': 'A ratio of 20.0 (within 0.6).',
    'pixels-across-the-seeing':
      'A pixel scale of 0.73 and a seeing of 1.3 arcseconds (1.8 pixels across) for the 0.35 m telescope.',
    'the-field': 'About 11.7 frames (within 0.4).',
  },
  'the-sky-background': {
    'sky-in-the-aperture': 'A magnitude of 20.0 (within 0.1).',
    'sky-over-the-star': 'A ratio of 15.7 (within 0.8).',
    'a-sky-limited-plan':
      'A total exposure of about 79.8 s (within 1.5) with 87 percent of the noise squared from the sky (within 2).',
    'two-magnitudes-brighter':
      'About 79.8 s and 443 s (within 8), a ratio of 5.6.',
    'three-magnitudes-brighter': 'A ratio of 13.84 (within 0.5).',
    'the-moon-and-a-bright-star':
      'For the 1.0 m telescope: 43 and 204 s at magnitude 20 and 2.3 and 2.7 s at magnitude 17 (dark and 3 magnitudes brighter).',
    'a-redder-sky': 'A ratio of 5.15 (within 0.15).',
  },
  'coordinates-and-time': {
    'a-day-that-is-short': '235.9 seconds (within 2).',
    'earlier-each-night':
      'Crossings of 718.7 and 600.8 minutes after noon (each within 0.6), 3.93 minutes a night.',
    'from-sidereal-time-to-crossing':
      'A sidereal time of 6.792 h and a right ascension of 6.752 h (each within 0.003): a crossing at 717.6 minutes.',
    'the-panel-is-later': 'A difference of 1.1 minutes (within 0.3).',
  },
  'a-night-at-the-telescope': {
    'station-when':
      '10.5 hours of dark (within 0.15), 8.08 hours usable (within 0.15) and a best airmass of 1.05 (within 0.03) for Regulus.',
    'station-weather': 'A share of 42.9 percent (within 1).',
    'station-expose':
      'About 59.3 s (within 1.2), with 49 percent of the noise squared from the target’s photons (within 2).',
    'station-calibrate':
      'A zero point of 24.803 (within 0.01), an extinction of 0.213 (within 0.01) and an uncertainty of 0.008 (within 0.0015).',
    'station-measure':
      'A predicted signal-to-noise of 49.5 (within 0.6) and a measured one of 49.9 (within 3.5).',
    'station-report':
      'A total uncertainty of 0.0231 magnitude (within 0.0015).',
  },
  'from-photons-to-a-number': {
    'the-counts':
      'About 5101 electrons (within 60) and a noise of 103 (within 2).',
    'the-magnitude-uncertainty': '0.02195 magnitude (within 0.0008).',
    'the-rate-to-a-magnitude': 'A magnitude of 19.00 (within 0.03).',
    'the-calibration-term':
      'A zero point uncertainty of 0.003 (within 0.0012) and a target uncertainty of 0.008 (within 0.0015).',
    'adding-in-quadrature': 'A total of 0.0234 magnitude (within 0.0012).',
    'halve-it':
      '59.3 s (within 1.2) and 191 s (within 4): 3.2 times longer, not 4.',
  },
};

const BANDS = {
  'which-instrument-for-which-question': {
    core: 'short',
    quantitative: 'short',
  },
  'the-sky-background': { core: 'short', quantitative: 'short' },
  'coordinates-and-time': { core: 'short', quantitative: 'short' },
  'a-night-at-the-telescope': { core: 'medium', quantitative: 'medium' },
  'from-photons-to-a-number': { core: 'medium', quantitative: 'medium' },
};

/** The guides, flows, expectations and time bands of the lessons above. */
export const INSTRUCTOR = {
  content: CONTENT,
  flow: FLOW,
  expectations: EXPECTATIONS,
  bands: BANDS,
};

/** The Spanish shadows by lesson id (what instructorLocale.js spreads). */
export const SHADOWS = {
  'which-instrument-for-which-question': WHICH_INSTRUMENT_FOR_WHICH_QUESTION_ES,
  'the-sky-background': THE_SKY_BACKGROUND_ES,
  'coordinates-and-time': COORDINATES_AND_TIME_ES,
  'a-night-at-the-telescope': A_NIGHT_AT_THE_TELESCOPE_ES,
  'from-photons-to-a-number': FROM_PHOTONS_TO_A_NUMBER_ES,
};

/** The deeper steps by lesson id (what js/investigations/depth*.js read). */
export const DEPTH = {
  'which-instrument-for-which-question':
    WHICH_INSTRUMENT_FOR_WHICH_QUESTION_DEEPER,
  'the-sky-background': THE_SKY_BACKGROUND_DEEPER,
  'coordinates-and-time': COORDINATES_AND_TIME_DEEPER,
  'a-night-at-the-telescope': A_NIGHT_AT_THE_TELESCOPE_DEEPER,
  'from-photons-to-a-number': FROM_PHOTONS_TO_A_NUMBER_DEEPER,
};
export const DEPTH_ES = {
  'which-instrument-for-which-question':
    WHICH_INSTRUMENT_FOR_WHICH_QUESTION_DEEPER_ES,
  'the-sky-background': THE_SKY_BACKGROUND_DEEPER_ES,
  'coordinates-and-time': COORDINATES_AND_TIME_DEEPER_ES,
  'a-night-at-the-telescope': A_NIGHT_AT_THE_TELESCOPE_DEEPER_ES,
  'from-photons-to-a-number': FROM_PHOTONS_TO_A_NUMBER_DEEPER_ES,
};

/** The lessons, in catalog order (what js/data/investigations.js spreads). */
// The catalog order is the order the lessons are written in this file: the
// registry generator reads it from the text (tools/capability-registries.mjs).
export default [
  WHICH_INSTRUMENT_FOR_WHICH_QUESTION,
  THE_SKY_BACKGROUND,
  COORDINATES_AND_TIME,
  A_NIGHT_AT_THE_TELESCOPE,
  FROM_PHOTONS_TO_A_NUMBER,
];
