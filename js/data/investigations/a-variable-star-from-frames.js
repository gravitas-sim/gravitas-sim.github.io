// =============================================================================
// A Variable Star From Frames
// -----------------------------------------------------------------------------
// Content only, no imports (see what-a-ccd-records.js). The instrument is the
// detector family's "diff-photometry" tool (js/detectorWidgets.js): forty
// SYNTHETIC frames of one field, each reduced with the calibration set of
// the same camera and photometered, with a variable star that varies as a sine
// (period 0.12 d, amplitude 0.04 mag) among two steady stars and a cloud that
// wanders from frame to frame. The truth manifest is in the instrument's table
// when asked for. No authentic frames ship (D-CALIB-01), so the advanced
// reduction is compared with the truth of the synthetic set. The numbers a
// student reads are checked by tests/calibrationLessons.test.js.
// =============================================================================

const STARS = {
  spacing: 150,
  fit: true,
  stars: [
    { role: 'star', name: 'A variable star', teffK: 7500, lumSun: 20 },
    { role: 'star', name: 'A comparison star', teffK: 6000, lumSun: 3 },
  ],
};
const DIFF = (values = {}) => ({
  id: 'diff-photometry',
  values: { draw: 1, reduction: 3, truth: 0, mode: 0, ...values },
});

const A_VARIABLE_STAR_FROM_FRAMES = {
  id: 'a-variable-star-from-frames',
  thumbnail: 'images/investigations/a-variable-star-from-frames.webp',
  title: 'A Variable Star From Frames',
  subtitle:
    'Differential photometry of forty calibrated frames: why a comparison star removes the cloud, and how to know a variation is real',
  duration: '10-18 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 6, section: null },
  courseLevel: 'majors',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'logarithms',
  prerequisites: ['what-a-ccd-records'],
  tags: ['observing', 'stars'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Say why a star’s brightness measured alone wanders from frame to frame, and why a comparison star removes it',
    'Use a check star to say how precise one differential measurement is',
    'Fit a period and an amplitude to a differential light curve, with an error, and say whether the variation is real',
    'Show what each calibration step changes in a light curve, against a truth manifest',
  ],
  steps: [
    {
      sid: 'forty-frames',
      stage: STARS,
      type: 'read',
      title: 'Forty frames of one night',
      body: `A telescope takes a picture every 11 minutes for most of an evening.
             In each, the same three stars sit on the same pixels: a variable star
             and two steady ones. Each frame is calibrated (bias, dark and flat, as
             in the first investigation) and the light of each star is measured in
             an aperture, with the CCD equation’s error.
             \n\nThe instrument plots the result. The picture starts on the
             <strong>variable star alone</strong>, as an instrumental magnitude,
             −2.5 times the logarithm of the electrons; brighter is up. Other
             pictures show the <strong>comparison star</strong> alone, the variable
             <strong>against</strong> the comparison, and a <strong>check
             star</strong> against the comparison.
             \n\nThe frames are <strong>synthetic</strong>, from a stated model of
             a CCD with a variable star that varies as a sine, and thin cloud that
             changes from frame to frame and dims every star at once.`,
      tool: DIFF(),
    },
    {
      sid: 'the-star-alone',
      stage: STARS,
      type: 'measure',
      title: 'The star alone',
      body: `With “The variable star alone” and every calibration applied, read the
             <strong>scatter of the variable star alone</strong>, in magnitudes.`,
      fields: [
        {
          id: 'raw',
          label: 'Scatter of the star alone',
          unit: 'mag',
          hint: '0.070',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.raw)) return null;
        if (Math.abs(v.raw - 0.07) <= 0.005) {
          return {
            level: 'ok',
            message:
              '0.07 magnitude, 7 percent. The star’s own variation is only 0.04 magnitude either side of its mean; most of this wander is something else. Look at the comparison star alone next to see what.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose “The variable star alone” with “all, with cosmic rays masked”, and read “Scatter of the variable star alone”, in magnitudes.',
        };
      },
      tool: DIFF({ mode: 0 }),
    },
    {
      sid: 'where-the-wander-comes-from',
      stage: STARS,
      type: 'question',
      kind: 'choice',
      title: 'Where the wander comes from',
      body: `Switch the picture between “The variable star alone” and “The
             comparison star alone”. Both wander, and in step.`,
      prompt: 'What makes both stars wander together?',
      options: [
        'Both stars are variable',
        'The sky’s transparency changes from frame to frame and dims every star at once',
        'The CCD’s read noise is much larger than the star’s light',
        'The comparison star is too faint to measure',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'both-variable',
          option: 0,
          say: 'The comparison star is steady in the model. If it wandered on its own, the check star, measured the same way, would not stay flat.',
        },
        {
          id: 'read-noise',
          option: 2,
          say: 'The read noise of 8 electrons is a tiny part of a star of tens of thousands. It makes a scatter of about one percent, not seven.',
        },
      ],
      hints: [
        'What does a thin cloud do to a bright star, and to a faint one, in the same frame?',
      ],
      because:
        'Thin cloud, or air mass, multiplies every star’s light by the same factor in one frame. The factor changes from frame to frame, so every star moves together. A star measured alone cannot tell the cloud from its own variation; a star measured against another does not suffer it, because the factor cancels in the ratio.',
      tool: DIFF({ mode: 1 }),
    },
    {
      sid: 'against-the-comparison',
      stage: STARS,
      type: 'measure',
      title: 'Against a comparison star',
      body: `Choose “The check star against the comparison”. The check star does not
             vary, so its scatter is the <strong>precision</strong> of one
             differential measurement. Read it, and divide the scatter of the
             star alone (0.070) by it.`,
      fields: [
        {
          id: 'check',
          label: 'Scatter of the check star',
          unit: 'mag',
          hint: '0.0088',
        },
        { id: 'factor', label: 'Improvement', unit: '', hint: '8.0' },
      ],
      validate: v => {
        if (![v.check, v.factor].every(Number.isFinite)) return null;
        if (
          Math.abs(v.check - 0.0088) <= 0.001 &&
          Math.abs(v.factor - 8) <= 0.8
        ) {
          return {
            level: 'ok',
            message:
              '0.009 magnitude, 0.8 percent, and eight times better than the star alone. The cloud is gone; what is left is the photon noise and the read noise of two stars, which the CCD equation predicts.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose “The check star against the comparison” and read “Scatter of the check star against the comparison”, in magnitudes; divide 0.070 by it.',
        };
      },
      tool: DIFF({ mode: 3 }),
    },
    {
      sid: 'predict-the-curve',
      stage: STARS,
      type: 'predict',
      reveal: 'the-sine',
      title: 'The variable against the comparison',
      body: `The variable star changes by 0.04 magnitude, about four times the check
             star’s scatter. Do not change the instrument yet.`,
      prompt:
        'The variable star measured against the comparison will show&hellip;',
      options: [
        'the same ragged scatter as the star alone, since it is the same star',
        'a smooth rise and fall that repeats, with a scatter of about 0.009 around it',
        'a flat line, since the comparison star cancels the variable star as well',
        'no pattern: 0.04 magnitude is too small to see',
      ],
      answer: 1,
      hints: [
        'The cloud cancels because it multiplies both stars. Does the variable star’s own change multiply the comparison star?',
      ],
      because:
        'A smooth rise and fall. The cloud multiplies both stars and divides out; the variable star’s own change belongs to it alone, and stays. Four times the scatter of one point is easily seen across forty points.',
      tool: DIFF({ mode: 3 }),
    },
    {
      sid: 'the-sine',
      stage: STARS,
      type: 'measure',
      title: 'Period and amplitude',
      body: `Choose “The variable against the comparison”. The instrument fits a
             sine wave, scanning trial periods for the smallest chi-square. Read the
             <strong>period</strong> and the <strong>amplitude</strong> of the
             best sine.`,
      fields: [
        { id: 'period', label: 'Period', unit: 'd', hint: '0.122' },
        { id: 'amp', label: 'Amplitude', unit: 'mag', hint: '0.042' },
      ],
      validate: v => {
        if (![v.period, v.amp].every(Number.isFinite)) return null;
        if (
          Math.abs(v.period - 0.1223) <= 0.004 &&
          Math.abs(v.amp - 0.0417) <= 0.004
        ) {
          return {
            level: 'ok',
            message:
              'A period of 0.122 day, three hours, and an amplitude of 0.042 magnitude, with an error of 0.002. The run holds only two and a half cycles, so the period is good to about two percent. The star brightens and fades by four percent about its mean.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose “The variable against the comparison” and read “Period of the best sine” in days and “Amplitude of the best sine” in magnitudes.',
        };
      },
      tool: DIFF({ mode: 2 }),
    },
    {
      sid: 'is-it-real',
      stage: STARS,
      type: 'question',
      kind: 'choice',
      title: 'Is the variation real',
      body: `The amplitude is 0.042 ± 0.002 magnitude, and the check star’s scatter
             is 0.009.`,
      prompt:
        'How do you know the variable star’s variation is real and not noise?',
      options: [
        'The amplitude is a tenth of a magnitude',
        'The amplitude is twenty times its error and several times the scatter of a star that does not vary, measured the same way',
        'The fit’s chi-square is zero',
        'A fit always finds an amplitude, so it is real by definition',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'size',
          option: 0,
          say: 'The amplitude is 0.04 magnitude. What makes it real is how it compares with the noise, not its size.',
        },
        {
          id: 'always',
          option: 3,
          say: 'A sine fit to pure noise returns a small amplitude too. The question is whether the amplitude exceeds what noise alone gives, and the check star measures that.',
        },
      ],
      hints: [
        'Compare the amplitude with its error, and with what a steady star does when measured the same way.',
      ],
      because:
        'Noise alone gives a small amplitude with a size set by the scatter of one point and the number of points. The check star, measured exactly like the variable, shows the scatter noise gives; the amplitude is several times larger than it and twenty times its own error, and it repeats with a period. That is what an observer calls a detection.',
      tool: DIFF({ mode: 2 }),
    },
    {
      sid: 'what-you-worked-out',
      stage: STARS,
      type: 'read',
      title: 'What you worked out',
      body: `A star measured alone wanders by 0.070 magnitude because thin cloud
             dims every star in a frame together; measured against a comparison
             star, the cloud divides out and a steady check star scatters by only
             0.009 magnitude, eight times less. The variable against the
             comparison shows a smooth variation with a period of 0.122 day and
             an amplitude of 0.042 ± 0.002 magnitude, twenty times its error and
             several times the check star’s scatter: a detection.
             \n\nThe frames are <strong>synthetic</strong>. The variable is a
             perfect sine, the comparison and check stars are perfectly steady,
             the cloud has no color, the stars never move on the pixels and there
             are no cosmic rays in this series. A real night adds a color term for
             the air, a drift in the telescope’s pointing and a comparison star
             that turns out to vary. The method is real; the number of things
             that can go wrong is larger.`,
      tool: DIFF({ mode: 2 }),
    },
  ],
};

export default A_VARIABLE_STAR_FROM_FRAMES;
