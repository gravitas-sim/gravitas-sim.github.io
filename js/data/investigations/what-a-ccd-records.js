// =============================================================================
// What a CCD Records
// -----------------------------------------------------------------------------
// Content only, no imports: every step that needs a live number is handed a
// `ctx` by the engine. The card paragraph is written once in summaries.js (and
// summaries.es.js). Every step carries a `sid`, an opaque stable id that student
// progress is keyed by (js/investigations/progressSchema.js): reword a step,
// move it, translate it, never change its sid.
//
// The instrument is the detector family's "ccd-frames" tool
// (js/detectorWidgets.js over js/kernels/detector, CALIBRATION_LAB.md): a
// SYNTHETIC CCD, a stated forward model with a seed, so every frame has a known
// truth. Draw 1 and a 60 s exposure are the numbers below. No authentic frames
// ship: the rights of a public teaching set could not be confirmed (D-CALIB-01).
// The numbers a student reads are checked by tests/calibrationLessons.test.js.
// =============================================================================

/** A placeholder star on the canvas: a display; the instrument is where the numbers are. */
const STARS = {
  spacing: 150,
  fit: true,
  stars: [
    { role: 'star', name: 'A star on the frame', teffK: 5800, lumSun: 1 },
  ],
};
const FRAMES = (values = {}) => ({
  id: 'ccd-frames',
  values: { draw: 1, exposure: 60, ...values },
});

const WHAT_A_CCD_RECORDS = {
  id: 'what-a-ccd-records',
  thumbnail: 'images/investigations/what-a-ccd-records.webp',
  title: 'What a CCD Records',
  subtitle:
    'Bias, dark and flat frames, and why a star’s light needs all three taken out before it is a measurement',
  duration: '10-18 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 6, section: null },
  courseLevel: 'majors',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'algebra',
  prerequisites: [],
  tags: ['observing'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Say what a bias, a dark and a flat frame measure, and read their numbers off a calibration set',
    'Show that dividing by a flat changes a star’s measured light, and by how much',
    'Tell a cosmic ray from a star, and say what a saturated star has lost',
    'Say what a synthetic detector can and cannot teach about a real one',
  ],
  steps: [
    {
      sid: 'three-calibration-frames',
      stage: STARS,
      type: 'read',
      title: 'What a camera adds to the light',
      body: `A CCD turns light into numbers, and leaves its own marks on them. Three
             kinds of frame, taken with the same camera, say what the marks are.
             \n\nA <strong>bias</strong> frame is an exposure of zero seconds: it
             holds what the electronics add to every read, an offset and the
             <strong>read noise</strong>. A <strong>dark</strong> frame is taken
             with the shutter closed for a long time: it holds the electrons
             that warmth makes, the <strong>dark current</strong>. A
             <strong>flat</strong> is a picture of an even light: it shows how
             much more sensitive some pixels are than others, and where dust and
             the edge of the optics dim the light.
             \n\nThe instrument holds ten bias frames, seven darks of 120
             seconds and ten flats, and a 60 second picture of four stars taken
             with the same camera. All of it is <strong>synthetic</strong>: made
             by a stated model of a CCD, so the true numbers are known and the
             table says what each frame should give back. Brighter is whiter;
             the picture is stretched by the square root so faint structure
             shows.`,
      tool: FRAMES({ view: 0 }),
    },
    {
      sid: 'the-bias',
      stage: STARS,
      type: 'measure',
      title: 'The bias',
      body: `Choose “A bias frame”. Read the <strong>master bias level</strong>,
             the average of the ten frames, in counts, and the
             <strong>read noise</strong>, which the instrument finds from the
             difference of two bias frames (the offset cancels in the
             difference; the noise does not).`,
      fields: [
        {
          id: 'level',
          label: 'Master bias level (counts)',
          unit: 'count',
          hint: '500.4',
        },
        { id: 'read', label: 'Read noise (electrons)', unit: '', hint: '8.05' },
      ],
      validate: v => {
        if (![v.level, v.read].every(Number.isFinite)) return null;
        if (Math.abs(v.level - 500.4) <= 1 && Math.abs(v.read - 8.05) <= 0.7) {
          return {
            level: 'ok',
            message:
              'A level of 500 counts and a read noise of 8 electrons. The camera adds the same 500 counts to every frame, whatever the light; the noise of 8 electrons is what each read adds at random, and no exposure can be shorter than it.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose “A bias frame” and read “Master bias level” in counts and “Read noise” in electrons.',
        };
      },
      tool: FRAMES({ view: 0 }),
    },
    {
      sid: 'why-the-bias-is-not-zero',
      stage: STARS,
      type: 'question',
      kind: 'choice',
      title: 'An exposure of nothing, and 500 counts',
      body: `The bias frame is an exposure of zero seconds, and its pixels read
             about 500, not 0.`,
      prompt: 'Why does the camera add an offset of 500 counts?',
      options: [
        'Light leaks into the camera during the read',
        'It keeps the noise from pushing a pixel below zero, where a counter cannot go, so no value is lost',
        'The detector makes electrons when it is warm',
        'The offset is the average brightness of the sky',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'light-leak',
          option: 0,
          say: 'The shutter is closed for a bias and the exposure is zero seconds. Whatever is there is added by the electronics, not by light.',
        },
        {
          id: 'dark-is-bias',
          option: 2,
          say: 'That is dark current, and it grows with the exposure. The bias does not: it is the same for zero seconds as for ten minutes.',
        },
      ],
      hints: [
        'A read noise of 8 electrons would push about half the pixels of a bias at a true zero below it. What does a counter do with a negative number?',
      ],
      because:
        'The converter counts whole numbers from zero. With the noise on top of a true zero, half the pixels would want to be negative and be clipped to zero, and the average would be too high. The offset puts the zero well inside the range, so every value is kept and the offset can be subtracted exactly.',
      tool: FRAMES({ view: 0 }),
    },
    {
      sid: 'the-dark',
      stage: STARS,
      type: 'measure',
      title: 'The dark',
      body: `Choose “A dark frame” (120 seconds, shutter closed). Read the
             <strong>dark current</strong>, the electrons a pixel makes each
             second as the median over the frame, and from it work out the
             electrons a typical pixel collected in the 120 seconds.`,
      fields: [
        {
          id: 'rate',
          label: 'Dark current',
          unit: 'electron/s',
          hint: '0.100',
        },
        {
          id: 'total',
          label: 'Electrons in 120 seconds (one pixel)',
          unit: 'count',
          hint: '12',
        },
      ],
      validate: v => {
        if (![v.rate, v.total].every(Number.isFinite)) return null;
        if (Math.abs(v.rate - 0.1) <= 0.01 && Math.abs(v.total - 12) <= 1.5) {
          return {
            level: 'ok',
            message:
              '0.1 electron a second, so 12 electrons in two minutes. It is small: a pixel that holds 50,000 electrons gains almost nothing in a minute. A few hot pixels make 20 to 50 times as many, which is why a dark frame is subtracted pixel by pixel, not as one number.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose “A dark frame”, read “Dark current (median pixel)” and multiply it by the 120 seconds of the dark frames.',
        };
      },
      tool: FRAMES({ view: 1 }),
    },
    {
      sid: 'the-flat',
      stage: STARS,
      type: 'measure',
      title: 'The flat',
      body: `Choose “A flat field”. It is a picture of an even light, so any
             structure in it is the camera’s. Read how bright the
             <strong>corner is as a share of the center</strong>, and the
             <strong>gain</strong>: the electrons each count stands for, which
             the instrument finds from two bias and two flat frames.`,
      fields: [
        {
          id: 'corner',
          label: 'Corner, share of the center',
          unit: '%',
          hint: '76.2',
        },
        { id: 'gain', label: 'Gain', unit: '', hint: '1.52' },
      ],
      validate: v => {
        if (![v.corner, v.gain].every(Number.isFinite)) return null;
        if (Math.abs(v.corner - 76.2) <= 2 && Math.abs(v.gain - 1.52) <= 0.08) {
          return {
            level: 'ok',
            message:
              'The corner receives about three quarters of the light the center does, the optics and the dust dimming the edge. And each count stands for about 1.5 electrons. The flat is the camera’s own map of how much light each pixel turns into counts.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose “A flat field” and read “Flat field: corner as a share of the center” in percent and the gain in electrons per count.',
        };
      },
      tool: FRAMES({ view: 2 }),
    },
    {
      sid: 'predict-the-flat',
      stage: STARS,
      type: 'predict',
      reveal: 'what-the-flat-does',
      title: 'Divide by the flat',
      body: `Star B sits near a corner of the frame, where the flat is dim. Do not
             change the instrument yet.`,
      prompt:
        'After the picture is divided by the flat, the light measured for star B will be&hellip;',
      options: [
        'smaller than before',
        'larger than before',
        'the same, since a flat only changes the look of the picture',
        'larger by exactly the corner’s share, 76 percent',
      ],
      answer: 1,
      hints: [
        'Where the optics dim the light, the raw picture holds less of the star than the star sent. Dividing puts the loss back.',
      ],
      because:
        'Larger. Star B’s light was dimmed by the corner’s low sensitivity, so the raw picture under-counts it; dividing by a flat that is below 1 there raises it. The next step reads the two numbers.',
      tool: FRAMES({ view: 3 }),
    },
    {
      sid: 'what-the-flat-does',
      stage: STARS,
      type: 'measure',
      title: 'Star B, raw and calibrated',
      body: `Choose “The raw picture of the stars” and read the <strong>net
             light in the aperture of star B</strong>, in electrons. Then choose
             “After dividing by the flat” and read it again. Both rows hold the
             <strong>truth</strong>, the light the model gave the star.`,
      fields: [
        {
          id: 'raw',
          label: 'Star B, raw (electrons)',
          unit: 'count',
          hint: '47300',
        },
        {
          id: 'cal',
          label: 'Star B, calibrated (electrons)',
          unit: 'count',
          hint: '54080',
        },
      ],
      validate: v => {
        if (![v.raw, v.cal].every(Number.isFinite)) return null;
        if (Math.abs(v.raw - 47300) <= 500 && Math.abs(v.cal - 54080) <= 900) {
          return {
            level: 'ok',
            message:
              'About 47,300 electrons raw and 54,100 calibrated, against a truth of 54,000. The raw light was 12 percent low. Star A, in the middle, goes the other way: the middle of the frame is brighter than average, and its raw light is 12 percent high.',
          };
        }
        return {
          level: 'error',
          message:
            'Read “Star B: net light in the aperture” with the raw picture and again after dividing by the flat, in electrons.',
        };
      },
      tool: FRAMES({ view: 6 }),
    },
    {
      sid: 'divide-not-subtract',
      stage: STARS,
      type: 'question',
      kind: 'choice',
      title: 'Divide, not subtract',
      body: `The bias and the dark are subtracted. The flat is divided.`,
      prompt: 'Why is the flat divided into the picture instead of subtracted?',
      options: [
        'Division is faster for the computer',
        'The flat is a sensitivity: a pixel at 76 percent turns every star’s light into 76 percent as many counts, so it multiplies the light and division undoes it',
        'The flat holds electrons that must be taken out',
        'It does not matter; either gives the same picture',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'additive',
          option: 2,
          say: 'The bias and the dark add counts, so they are subtracted. The flat adds nothing: a pixel with no light stays at zero in it. It scales what light there is.',
        },
        {
          id: 'either',
          option: 3,
          say: 'Subtracting a number near 0.76 would change a bright star by almost nothing and a faint one by nothing at all. Dividing changes each pixel in proportion to its light, which is what the dimming did.',
        },
      ],
      hints: ['What does a pixel at 76 percent do to a star twice as bright?'],
      because:
        'Sensitivity multiplies: counts = sensitivity × light. Undoing a product is a division, pixel by pixel. The bias and dark are added to the counts, so they are subtracted first, and the flat is divided last, after they are gone; a flat divided into a picture that still holds a bias would scale the bias too.',
      tool: FRAMES({ view: 6 }),
    },
    {
      sid: 'cosmic-rays',
      stage: STARS,
      type: 'measure',
      title: 'Cosmic rays and the saturated star',
      body: `Choose “Cosmic rays masked”. The instrument flags pixels that stand far
             above their neighbors, which a star, smooth over several pixels, does
             not. Read the number of <strong>cosmic-ray pixels flagged</strong>
             and the number of <strong>saturated pixels</strong> in the raw
             picture, the pixels of star D that reached the full well.`,
      fields: [
        {
          id: 'flagged',
          label: 'Cosmic-ray pixels flagged',
          unit: 'count',
          hint: '4',
        },
        {
          id: 'saturated',
          label: 'Saturated pixels',
          unit: 'count',
          hint: '13',
        },
      ],
      validate: v => {
        if (![v.flagged, v.saturated].every(Number.isFinite)) return null;
        if (v.flagged === 4 && v.saturated === 13) {
          return {
            level: 'ok',
            message:
              'Four pixels flagged, every cosmic-ray pixel the model added, and 13 saturated. A cosmic ray is a single pixel of thousands of electrons that no star made, and it is replaced by the median of its neighbors. The saturated pixels cannot be repaired.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose “Cosmic rays masked” and read “Cosmic-ray pixels flagged” and “Saturated pixels in the raw picture”, with the 60 second exposure.',
        };
      },
      tool: FRAMES({ view: 7 }),
    },
    {
      sid: 'the-saturated-star',
      stage: STARS,
      type: 'question',
      kind: 'choice',
      title: 'The star that is too bright',
      body: `Look at star D in the table. Its calibrated light is about 1.1 million
             electrons, against a truth of 1.8 million, and its error bar is the
             smallest of the four relative to its light.`,
      prompt:
        'Why is the measured light of star D 39 percent too low, with a tiny error bar?',
      options: [
        'The flat was wrong at the star’s place',
        'The cosmic-ray mask removed part of the star',
        'Its brightest pixels filled to the full well and stopped counting; the light they lost is gone, and the error bar knows only about noise',
        'A brighter star has a larger aperture correction',
      ],
      answer: 2,
      misconceptions: [
        {
          id: 'mask',
          option: 1,
          say: 'The mask flags single pixels that stand out sharply, and a star’s core does not. The 13 saturated pixels are the star’s own.',
        },
        {
          id: 'aperture-correction',
          option: 3,
          say: 'An aperture correction is a small, known fraction. Here 39 percent is missing, from the pixels that were full.',
        },
      ],
      hints: [
        'How many electrons can one pixel hold, and what happens to a pixel that receives more?',
      ],
      because:
        'A pixel holds at most the full well, 50,000 electrons here. Light beyond it is lost, not stored, so the measured light is a lower limit. The error bar counts photon and read noise only; it cannot know about charge that was never recorded. The cure is a shorter exposure, not a calibration.',
      tool: FRAMES({ view: 6 }),
    },
    {
      sid: 'what-you-worked-out',
      stage: STARS,
      type: 'read',
      title: 'What you worked out',
      body: `A bias frame gives the offset (500 counts) and the read noise (8
             electrons); a dark gives the dark current (0.1 electron a second a
             pixel); a flat gives the sensitivity of every pixel, the corner
             receiving about 76 percent of the center’s light. The bias and the
             dark are subtracted, and the flat is divided last. Star B, near a
             corner, read 12 percent low until the flat was applied; a cosmic ray
             is flagged because it is sharp, and a saturated star cannot be
             repaired.
             \n\nThe camera is <strong>synthetic</strong>: every number is from a
             stated model, with no blooming, no nonlinearity, one flat for every
             color and a perfectly round star. A real camera adds all of these,
             and each of its calibration frames has to be taken, checked and
             combined by someone. This shows what each frame is for; it does not
             replace taking them.`,
      tool: FRAMES({ view: 6 }),
    },
  ],
};

export default WHAT_A_CCD_RECORDS;
