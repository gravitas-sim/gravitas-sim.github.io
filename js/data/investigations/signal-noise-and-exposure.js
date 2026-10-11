// =============================================================================
// Signal, Noise and Exposure
// -----------------------------------------------------------------------------
// Content only, no imports (see what-a-ccd-records.js). The instrument is the
// detector family's "ccd-snr" tool (js/detectorWidgets.js): the CCD equation
// for one star in a round aperture, for a stated 0.4 m teaching telescope whose
// photon rate comes from the radiation kernel's V band. A calculation, not data,
// and the lesson says so. The numbers a student reads are checked by
// tests/calibrationLessons.test.js.
// =============================================================================

const STARS = {
  spacing: 150,
  fit: true,
  stars: [{ role: 'star', name: 'A star to be measured', teffK: 5800, lumSun: 1 }],
};
const SNR = (values = {}) => ({
  id: 'ccd-snr',
  values: { mag: 15, exposure: 60, radius: 5, sky: 0, target: 100, ...values },
});

const SIGNAL_NOISE_AND_EXPOSURE = {
  id: 'signal-noise-and-exposure',
  thumbnail: 'images/investigations/signal-noise-and-exposure.webp',
  title: 'Signal, Noise and Exposure',
  subtitle:
    'How long to expose to reach a signal-to-noise, and why four times the light is not four times the quality',
  duration: '10-18 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 6, section: null },
  courseLevel: 'majors',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'algebra',
  prerequisites: ['what-a-ccd-records'],
  tags: ['observing'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Read the signal-to-noise of a star from the CCD equation’s terms, and name the one that limits it',
    'Predict how the signal-to-noise changes with exposure, and say why it does not follow the exposure when the read noise matters',
    'Find the exposure that reaches a target, and say what a brighter sky costs',
    'Say what a calculator that leaves out flat-field error and seeing cannot promise',
  ],
  steps: [
    {
      sid: 'the-ccd-equation',
      stage: STARS,
      type: 'read',
      title: 'Counting what you did not want',
      body: `A star’s light arrives as photons, and photons arrive at random: a
             star that gives 10,000 electrons gives 10,000 ± 100 on another try,
             the square root. That is the star’s own <strong>photon noise</strong>.
             Around it the measurement adds the <strong>sky</strong>’s photons in
             the same pixels, the <strong>dark current</strong> and the
             <strong>read noise</strong> of every pixel. Noise from independent
             sources adds as squares, and the <strong>CCD equation</strong>
             says it for a round aperture:
             \n\n<em>noise² = S + n (B + D + R²)</em>
             \n\nwith S the star’s electrons in the aperture, n the pixels in it,
             B and D the sky’s and the dark’s electrons per pixel and R the read
             noise in electrons. (A small factor, 1 + n over the pixels of the
             sky ring, pays for measuring the sky from a finite ring.) The
             <strong>signal-to-noise</strong> is S over the noise.
             \n\nThe instrument calculates it for a 0.4 m telescope with a small
             CCD, one arcsecond pixels and a read noise of 8 electrons. It is a
             <strong>calculation</strong>, not a picture: the star’s light comes
             from the radiation kernel’s V band. Brightness is in V magnitudes,
             where a larger number is fainter.`,
      tool: SNR(),
    },
    {
      sid: 'one-star-one-minute',
      stage: STARS,
      type: 'measure',
      title: 'A V = 15 star in a minute',
      body: `With the star at V = 15, 60 seconds, a 5 pixel aperture and a dark
             site, read the <strong>star’s electrons in the aperture</strong>, the
             <strong>total noise</strong> and the <strong>signal-to-noise</strong>.`,
      fields: [
        { id: 'signal', label: 'Star’s electrons', unit: 'count', hint: '33630' },
        { id: 'noise', label: 'Total noise', unit: 'count', hint: '220.6' },
        { id: 'snr', label: 'Signal-to-noise', unit: '', hint: '152.5' },
      ],
      validate: v => {
        if (![v.signal, v.noise, v.snr].every(Number.isFinite)) return null;
        if (
          Math.abs(v.signal - 33631) <= 340 &&
          Math.abs(v.noise - 220.6) <= 3 &&
          Math.abs(v.snr - 152.5) <= 2
        ) {
          return {
            level: 'ok',
            message:
              '33,600 electrons in the aperture against a noise of 221: a signal-to-noise of 152, a measurement good to 0.7 percent, or 0.007 magnitude. The star’s own photons are most of the noise: the square root of 33,600 is 183.',
          };
        }
        return {
          level: 'error',
          message:
            'Set V = 15, 60 seconds, a 5 pixel radius and “a dark site”, then read “Star’s electrons in the aperture (S)”, “Total noise” and “Signal-to-noise”.',
        };
      },
      tool: SNR(),
    },
    {
      sid: 'what-limits-the-bright-star',
      stage: STARS,
      type: 'question',
      kind: 'choice',
      title: 'What limits the bright star',
      body: `Look at the four squares in the table: the star’s own electrons, the
             sky’s noise squared, the dark’s and the read noise’s.`,
      prompt: 'What limits the signal-to-noise of this star in this minute?',
      options: [
        'The read noise: every pixel pays it',
        'The sky, which is brighter than the star in each pixel',
        'The star’s own photons: the largest of the four terms',
        'The dark current',
      ],
      answer: 2,
      misconceptions: [
        {
          id: 'read-always',
          option: 0,
          say: 'The read noise squared is 6,200 electrons squared here, the second term after the star’s 33,600. It matters for a faint star in a short exposure, as you will see.',
        },
        {
          id: 'sky-first',
          option: 1,
          say: 'The sky at a dark site gives 1.4 electrons a second a pixel; over 60 seconds and 79 pixels, with the small ring correction, its term is 8,200, a quarter of the star’s.',
        },
      ],
      hints: ['The table’s last line before “What limits it” says which term is largest.'],
      because:
        'The star’s own photon noise, the square root of its electrons, is the largest term. A star in this regime is photon-limited: nothing about the camera or the sky would change the result much, only more light. A bright star is the case the textbook formula simplifies to.',
      tool: SNR(),
    },
    {
      sid: 'predict-four-times',
      stage: STARS,
      type: 'predict',
      reveal: 'four-times-longer',
      title: 'Four times the exposure',
      body: `Keep V = 15 at a dark site and the 5 pixel aperture. Do not change the
             instrument yet.`,
      prompt: 'Exposing four times as long (240 seconds), the signal-to-noise will be&hellip;',
      options: [
        'about four times as large',
        'about twice as large',
        'about 1.4 times as large',
        'no larger: noise grows with the signal',
      ],
      answer: 1,
      hints: [
        'The signal grows four times. The noise is a square root of a sum that grows four times.',
      ],
      because:
        'About twice. When the terms in the noise all grow with the exposure, the signal grows as t and the noise as the square root of t, so the signal-to-noise grows as the square root of t. Four times the time gives twice the quality.',
      tool: SNR(),
    },
    {
      sid: 'four-times-longer',
      stage: STARS,
      type: 'measure',
      title: 'Four times longer',
      body: `Set the exposure to 240 seconds. Read the new
             <strong>signal-to-noise</strong>, and work out the
             <strong>ratio</strong> to the 152.5 of a minute.`,
      fields: [
        { id: 'snr', label: 'Signal-to-noise at 240 s', unit: '', hint: '320.7' },
        { id: 'ratio', label: 'Ratio to the first', unit: '', hint: '2.10' },
      ],
      validate: v => {
        if (![v.snr, v.ratio].every(Number.isFinite)) return null;
        if (Math.abs(v.snr - 320.7) <= 4 && Math.abs(v.ratio - 2.1) <= 0.04) {
          return {
            level: 'ok',
            message:
              '321, a ratio of 2.10: slightly more than the square root of four, because the read noise, paid once, matters a little less in a longer exposure. In the photon-limited regime the ratio would be exactly 2.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the exposure to 240 seconds and read “Signal-to-noise”; divide it by 152.5.',
        };
      },
      tool: SNR({ exposure: 240 }),
    },
    {
      sid: 'a-faint-star',
      stage: STARS,
      type: 'measure',
      title: 'A faint star',
      body: `Now a star at V = 19 with a 3 pixel aperture at a dark site. Set the
             exposure to 10 seconds and read the <strong>signal-to-noise</strong>;
             then to 40 seconds, four times longer, and read it again.`,
      fields: [
        { id: 'short', label: 'Signal-to-noise at 10 s', unit: '', hint: '2.64' },
        { id: 'long', label: 'Signal-to-noise at 40 s', unit: '', hint: '8.11' },
      ],
      validate: v => {
        if (![v.short, v.long].every(Number.isFinite)) return null;
        if (Math.abs(v.short - 2.64) <= 0.08 && Math.abs(v.long - 8.11) <= 0.15) {
          return {
            level: 'ok',
            message:
              '2.6 at 10 seconds and 8.1 at 40: four times the exposure gave three times the quality, not two. The star is faint and the exposure short, so the read noise dominates, and while it does, the signal-to-noise grows nearly as fast as the exposure.',
          };
        }
        return {
          level: 'error',
          message:
            'Set V = 19, a 3 pixel radius and “a dark site”, then read “Signal-to-noise” at 10 seconds and at 40 seconds.',
        };
      },
      tool: SNR({ mag: 19, exposure: 10, radius: 3 }),
    },
    {
      sid: 'why-more-than-double',
      stage: STARS,
      type: 'question',
      kind: 'choice',
      title: 'Why more than double',
      body: `At 10 seconds the table says the read noise is the term that limits
             this faint star.`,
      prompt: 'Why did four times the exposure give three times the signal-to-noise?',
      options: [
        'The star got brighter during the longer exposure',
        'The read noise is paid once per frame whatever its length, so it does not grow with the exposure and the signal gains on it',
        'A longer exposure has a smaller aperture',
        'The calculator rounds the answer',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'brighter',
          option: 0,
          say: 'The star’s rate is the same at both exposures; only the time changes.',
        },
        {
          id: 'aperture',
          option: 2,
          say: 'The aperture is 3 pixels in both. Only the exposure changed.',
        },
      ],
      hints: [
        'Which of the four terms does not grow when you expose longer?',
      ],
      because:
        'The star’s electrons, the sky’s and the dark’s all grow with time; the read noise squared is a fixed price per pixel for each frame. When it dominates, the noise barely grows and the signal-to-noise follows the signal. Once the sky or the star takes over, the square-root law returns, and one long frame beats many short ones for a faint star.',
      tool: SNR({ mag: 19, exposure: 40, radius: 3 }),
    },
    {
      sid: 'exposure-for-the-target',
      stage: STARS,
      type: 'measure',
      title: 'The exposure for a target',
      body: `A photometry project needs a signal-to-noise of 100. For the V = 15
             star with a 5 pixel aperture in a suburb (the sky, V = 20, is
             brighter), set the target to 100 and read the <strong>exposure for
             the target</strong>. Then choose “a bright moon” and read it again.`,
      fields: [
        { id: 'suburb', label: 'Exposure, a suburb', unit: 's', hint: '40.4' },
        { id: 'moon', label: 'Exposure, a bright moon', unit: 's', hint: '89.4' },
      ],
      validate: v => {
        if (![v.suburb, v.moon].every(Number.isFinite)) return null;
        if (Math.abs(v.suburb - 40.4) <= 1 && Math.abs(v.moon - 89.4) <= 2) {
          return {
            level: 'ok',
            message:
              '40 seconds in the suburb and 89 under a bright moon, 2.2 times as long, for the same star. A brighter sky adds noise but no signal, and the cost of it is paid in time.',
          };
        }
        return {
          level: 'error',
          message:
            'Set “a suburb”, a target of 100, V = 15 and a 5 pixel radius, read “Exposure for the target”; then “a bright moon” and read it again.',
        };
      },
      tool: SNR({ sky: 1 }),
    },
    {
      sid: 'faintest-star',
      stage: STARS,
      type: 'measure',
      title: 'The faintest star',
      body: `At a dark site with a 5 pixel aperture, read the <strong>faintest
             star at signal-to-noise 5</strong> for 60 seconds. Then set the
             exposure to 240 seconds and read it again, and give how many
             magnitudes fainter four times the exposure reaches.`,
      fields: [
        { id: 'limit', label: 'Faintest star, 60 s', unit: 'mag', hint: '19.33' },
        { id: 'gain', label: 'Gain, 240 s over 60 s', unit: 'mag', hint: '0.96' },
      ],
      validate: v => {
        if (![v.limit, v.gain].every(Number.isFinite)) return null;
        if (Math.abs(v.limit - 19.33) <= 0.1 && Math.abs(v.gain - 0.96) <= 0.05) {
          return {
            level: 'ok',
            message:
              'V = 19.3 in a minute, and 1 magnitude fainter in four minutes: 0.96. A pure square-root law, with the star’s own photons, would give 0.75, and a read-noise-limited faint star would give more. Four times the time is not four magnitudes; the sky grows too.',
          };
        }
        return {
          level: 'error',
          message:
            'Set “a dark site”, a 5 pixel radius, and read “Faintest star at signal-to-noise 5” for 60 seconds and for 240 seconds; subtract.',
        };
      },
      tool: SNR({ exposure: 60 }),
    },
    {
      sid: 'what-you-worked-out',
      stage: STARS,
      type: 'read',
      title: 'What you worked out',
      body: `The noise of a measurement is the square root of a sum of terms: the
             star’s own photons, the sky’s, the dark current’s and the read noise
             of every pixel. A V = 15 star in a minute at a dark site reached a
             signal-to-noise of 152, limited by its own photons; four times the
             exposure gave about twice that. A faint star in a short exposure is
             limited by the read noise, and there four times the exposure gave
             three times the quality. A suburb costs about 40 percent more time than
             a dark site for the same star, and a bright moon about three times.
             \n\nThe calculator is a <strong>calculation</strong> for a stated
             0.4 m telescope with 55 percent of the light reaching the
             detector. It leaves out flat-field error, seeing that changes
             through the night, the sky’s gradient and the electronics’ own
             quantization, and the aperture is perfectly placed. A real
             exposure-time calculator adds a margin; this one shows where the
             time goes.`,
      tool: SNR(),
    },
  ],
};

export default SIGNAL_NOISE_AND_EXPOSURE;
