// =============================================================================
// The Expanding Universe
// -----------------------------------------------------------------------------
// Content only, no imports: every step that needs a live number is handed a
// `ctx` by the engine. The card paragraph is written once in summaries.js (and
// summaries.es.js). Every step carries a `sid`, an opaque stable id that student
// progress is keyed by (js/investigations/progressSchema.js): reword a step,
// move it, translate it, never change its sid.
//
// The instrument is the cosmology family's "hubble-law" tool (js/cosmologyWidgets.js
// over js/kernels/cosmology/fit.js): Hubble's own 24 nebulae (1929, Table 1) and
// the Dark Energy Survey supernovae out to a redshift the student sets, with the
// straight-line slope through the origin. The supernova distances are on the
// release's scale (H0 = 70), so the modern slope shows how the line changes with
// the sample and is not a measurement of the scale. The numbers a student reads
// are checked by tests/cosmologyInvestigations.test.js.
// =============================================================================

/** Two placeholder galaxies on the canvas: a display; the instrument is where the numbers are. */
const GALAXIES = {
  spacing: 150,
  fit: true,
  stars: [
    { role: 'near', name: 'A nearby galaxy', teffK: 5800, lumSun: 1 },
    { role: 'far', name: 'A distant galaxy', teffK: 5800, lumSun: 1 },
  ],
};
const HUBBLE = (values = {}) => ({ id: 'hubble-law', values });
const HUBBLE_1929 = { sample: 0, zmax: 0.1 };
const MODERN = { sample: 1, zmax: 0.1 };
const FAR = { sample: 1, zmax: 0.5 };

const THE_EXPANDING_UNIVERSE = {
  id: 'the-expanding-universe',
  thumbnail: 'images/investigations/the-expanding-universe.webp',
  title: 'The Expanding Universe',
  subtitle:
    'Hubble’s line of 1929, and what the same line says of 955 modern supernovae',
  duration: '12-20 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 26, section: '26.5' },
  courseLevel: 'majors',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'algebra',
  prerequisites: [],
  tags: ['galaxies', 'observing'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Fit a straight line through the origin to velocity against distance and read its slope as the Hubble constant',
    'Say why Hubble’s own slope was about six times too large, and what the slope depends on',
    'Show that the slope changes with the sample of galaxies, and say what that means for a single number called the Hubble constant',
    'Say why a straight line stops being the right shape for distant galaxies',
  ],
  steps: [
    {
      sid: 'a-line-through-the-origin',
      stage: GALAXIES,
      type: 'read',
      title: 'A line through the origin',
      body: `In 1929 Edwin Hubble plotted the speed at which 24 nebulae recede from
             us against their distances, and the points lay near a straight line
             through the origin: a galaxy twice as far goes twice as fast. The slope
             of that line, in kilometers per second for each megaparsec, is the
             <strong>Hubble constant</strong>, H<sub>0</sub>.
             \n\nThe instrument starts with Hubble’s own table, <strong>authentic</strong>,
             as printed in his paper. The warm line is the best straight line through
             the origin, and the pale one lets the line miss the origin.`,
      tool: HUBBLE(HUBBLE_1929),
    },
    {
      sid: 'predict-the-slope',
      stage: GALAXIES,
      type: 'predict',
      reveal: 'hubbles-slope',
      title: 'How steep is it',
      body: `Today’s measurements put the Hubble constant near 70 km/s per megaparsec.
             Hubble’s galaxies reach only 2 megaparsecs by his own distances, and the
             fastest recedes at 1,090 km/s. Do not change the instrument yet.`,
      prompt: 'Hubble’s own slope will be&hellip;',
      options: [
        'close to the modern 70, because the universe has not changed',
        'about half the modern value',
        'several times the modern value',
        'zero, because his points scatter too much for a line',
      ],
      answer: 2,
      hints: [
        'A galaxy at 2 megaparsecs moving at 1,000 km/s has a slope of about 500; at today’s 70 it would be moving at 140 km/s.',
      ],
      because:
        'It will be several times the modern value, about six. The speeds are measured well; the distances were not, and a slope is speed divided by distance, so distances that are too small make a slope that is too large. The next step reads it.',
      tool: HUBBLE(HUBBLE_1929),
    },
    {
      sid: 'hubbles-slope',
      stage: GALAXIES,
      type: 'measure',
      title: 'Hubble’s slope',
      body: `With Hubble’s 24 nebulae chosen, read the <strong>slope through the
             origin</strong> and its error.`,
      fields: [
        { id: 'h0', label: 'Slope', unit: 'km/s/Mpc', hint: '424' },
        { id: 'sigma', label: 'Its error', unit: 'km/s/Mpc', hint: '42' },
      ],
      validate: v => {
        if (![v.h0, v.sigma].every(Number.isFinite)) return null;
        if (Math.abs(v.h0 - 423.9) <= 3 && Math.abs(v.sigma - 42) <= 2.5) {
          return {
            level: 'ok',
            message:
              '424 ± 42 kilometers per second per megaparsec from 24 nebulae, 6.1 times the modern 70. Hubble himself quoted about 500. The line is a good fit to his points, but the scale is wrong: his distances were too small, mostly because the brightness of the stars he used as yardsticks was not yet calibrated.',
          };
        }
        return {
          level: 'error',
          message:
            'With Hubble’s 24 nebulae chosen, read “Slope through the origin (Hubble constant)”: the number and the error after the ±.',
        };
      },
      tool: HUBBLE(HUBBLE_1929),
    },
    {
      sid: 'does-it-need-the-origin',
      stage: GALAXIES,
      type: 'question',
      kind: 'choice',
      title: 'Does the line need to pass through zero',
      body: `The instrument also lists the slope when the line is free to miss the
             origin: 454 ± 75, against 424 ± 42 through it.`,
      prompt: 'What do the two slopes say?',
      options: [
        'They differ by 30, well inside their errors: the data do not need a line that misses the origin, and the simpler line is enough',
        'They differ, so one of the two fits must be wrong',
        'The free line is better because its slope is larger',
        'A slope with a bigger error is the more accurate one',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'differ-means-wrong',
          option: 1,
          say: 'Two estimates of one quantity always differ a little. What matters is the difference against the errors: 30 against 42 and 75 is a fraction of one error.',
        },
        {
          id: 'bigger-better',
          option: 2,
          say: 'A larger slope is not a better one. The free line has more freedom and so a larger error, and the data cannot tell the two apart.',
        },
      ],
      hints: [
        'Compare the difference of the slopes with the errors, not with the slopes themselves.',
      ],
      because:
        'The difference, 30, is smaller than either error. A line through the origin is also what an expanding universe predicts: at zero distance the recession is zero. The simpler line loses nothing here.',
      tool: HUBBLE(HUBBLE_1929),
    },
    {
      sid: 'a-modern-sample',
      stage: GALAXIES,
      type: 'measure',
      title: 'A modern sample',
      body: `Now choose the <strong>Dark Energy Survey supernovae</strong> and set
             them out to <strong>z ≤ 0.10</strong>. These are Type Ia supernovae,
             each with a distance from its brightness and a velocity from its
             redshift. Read the <strong>number of objects</strong> and the
             <strong>slope</strong>.`,
      fields: [
        { id: 'n', label: 'Objects in the fit', hint: '197' },
        { id: 'h0', label: 'Slope', unit: 'km/s/Mpc', hint: '66.3' },
      ],
      validate: v => {
        if (![v.n, v.h0].every(Number.isFinite)) return null;
        if (v.n === 197 && Math.abs(v.h0 - 66.33) <= 0.3) {
          return {
            level: 'ok',
            message:
              '197 supernovae and a slope of 66.33 ± 0.24: about 70, with an error of a third of one percent. The scale of these distances is fixed by the survey’s release, so the instrument is showing how the slope depends on the sample, not measuring the scale. The scale comes from the distance ladder.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose “Dark Energy Survey supernovae”, set the range to z ≤ 0.10, and read “Objects in the fit” and the slope through the origin.',
        };
      },
      tool: HUBBLE(MODERN),
    },
    {
      sid: 'predict-further-out',
      stage: GALAXIES,
      type: 'predict',
      reveal: 'further-out',
      title: 'Going further out',
      body: `The sample stops at a redshift of 0.1. The supernovae go on to 0.5,
             where the light has traveled for about five billion years. Do not
             change the instrument yet.`,
      prompt:
        'Fitting the straight line to all the supernovae out to z = 0.5, the slope will&hellip;',
      options: [
        'stay at about 66',
        'rise well above 66',
        'fall well below 66',
        'become impossible to fit',
      ],
      answer: 2,
      hints: [
        'Think about whether the far galaxies lie above or below an extension of the line from the near ones.',
      ],
      because:
        'It falls. Far supernovae lie below the straight line the near ones make, so the best line through the origin tilts down. The next step reads how far.',
      tool: HUBBLE(MODERN),
    },
    {
      sid: 'further-out',
      stage: GALAXIES,
      type: 'measure',
      title: 'Out to z = 0.5',
      body: `Set the range to <strong>z ≤ 0.50</strong> and read the number of
             objects and the slope again.`,
      fields: [
        { id: 'n', label: 'Objects in the fit', hint: '955' },
        { id: 'h0', label: 'Slope', unit: 'km/s/Mpc', hint: '59.3' },
      ],
      validate: v => {
        if (![v.n, v.h0].every(Number.isFinite)) return null;
        if (v.n === 955 && Math.abs(v.h0 - 59.35) <= 0.3) {
          return {
            level: 'ok',
            message:
              '955 supernovae and a slope of 59.35 ± 0.20, against 66.33 ± 0.24 out to 0.1. The two differ by 7.0, twenty-two times their combined error: this is no fluctuation. The same supernovae give a Hubble constant that depends on how far out you look.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the range to z ≤ 0.50 and read “Objects in the fit” and the slope through the origin.',
        };
      },
      tool: HUBBLE(FAR),
    },
    {
      sid: 'why-it-changes',
      stage: GALAXIES,
      type: 'question',
      kind: 'choice',
      title: 'Why the slope changes',
      body: `A slope of 66 from the near sample and 59 from the far one. Both samples
             are of one kind of supernova, measured the same way.`,
      prompt: 'Which explanation fits what you saw?',
      options: [
        'The far supernovae were measured badly, and the error pulls the line down',
        'Past a small redshift, velocity against distance is no longer a straight line, because the expansion rate was not the same in the past; a line through the origin is the wrong shape there',
        'The Hubble constant really is 59 for distant galaxies and 66 for near ones, at the same time',
        'Light from far galaxies is absorbed, which lowers their velocities',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'bad-data',
          option: 0,
          say: 'The error bars are no larger for the far supernovae in a way that matters, and the slope fell by twenty-two times its error: a systematic shape, not noise.',
        },
        {
          id: 'two-constants',
          option: 2,
          say: 'There is one expansion rate today. The far supernovae show the universe as it was, and the expansion rate then was different; a straight line has one slope and cannot follow that.',
        },
      ],
      hints: [
        'A straight line is what a universe that expands at a fixed rate predicts. Ask whether the far light left when that was true.',
      ],
      because:
        'The relation is a line only for small redshifts, where the light has traveled a short time. Farther out the distance depends on how the expansion rate changed along the way, and the line bends. The Hubble constant is the slope at zero distance, which a fit to the whole sample misses; the next investigations ask what the bend itself says.',
      tool: HUBBLE(FAR),
    },
    {
      sid: 'what-you-worked-out',
      stage: GALAXIES,
      type: 'read',
      title: 'What you worked out',
      body: `Hubble’s 24 nebulae give a slope of 424 ± 42 kilometers per second
             per megaparsec, six times the modern value, because his distances
             were too small. Modern supernovae out to z = 0.1 give 66.33 ± 0.24 on
             a distance scale fixed by their release, and out to z = 0.5 they give
             59.35 ± 0.20: a straight line through the origin is only right
             nearby.
             \n\nNot done here: the distance scale itself, which comes from the
             rungs of the distance ladder; the supernovae’s errors are
             statistical only; and the fit does not allow for the supernovae’s own
             peculiar velocities, which matter below z of about 0.02. The bend of
             the relation is the subject of <em>The Shape of Expansion</em>.`,
      tool: HUBBLE(FAR),
    },
  ],
};

export default THE_EXPANDING_UNIVERSE;
