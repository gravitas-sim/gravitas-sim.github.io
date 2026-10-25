// =============================================================================
// The measurement and claim investigations (Prompt 190)
// -----------------------------------------------------------------------------
// Three short investigations on synthetic truth, in one module: "What Is a
// Measurement?" (survey), "What Does ± Claim?" (majors) and "When the Method
// Must Refuse" (upper). One file holds the three because the instructor bundle's
// closure is capped by file count (D-R10-67); the per-lesson paths every loader
// and tool builds from an id are one-line re-exports of the named exports here.
//
// Content only, no imports: every number a step states is a row of the claim
// family's readout (js/claimWidgets.js), and tests/claimInvestigations.test.js
// recomputes each of them. The data are synthetic, the truth is known, and each
// lesson says so; no authentic data are used here on purpose (the truth is the
// point). Every step carries a `sid`, an opaque stable id that student progress
// is keyed by: reword a step, move it, translate it, never change its sid.
// The instructor guides, flows and expectations at the end of this file are
// merged into the instructor registries (js/data/instructor*.js).
// =============================================================================

/** A placeholder star on the canvas: a display; the instrument is where the picture is. */
const STAGE = {
  spacing: 150,
  fit: true,
  stars: [{ role: 'star', name: 'A star', teffK: 5772, lumSun: 1 }],
};
const FM = (values = {}, hide = ['offset', 'truth']) => ({
  id: 'frame-marks',
  values,
  hide,
});
const CR = (values = {}, hide = ['case', 'form', 'rate', 'repeats']) => ({
  id: 'coverage-repeats',
  values,
  hide,
});
const PR = (values = {}, hide = ['terms']) => ({
  id: 'profile-refusal',
  values,
  hide,
});
const near = (x, target, tolerance) =>
  Number.isFinite(x) && Math.abs(x - target) <= tolerance;

// -----------------------------------------------------------------------------
// 1. What is a measurement?
// -----------------------------------------------------------------------------
export const WHAT_IS_A_MEASUREMENT = {
  id: 'what-is-a-measurement',
  thumbnail: 'images/investigations/what-is-a-measurement.webp',
  title: 'What Is a Measurement?',
  subtitle: 'Marking one star again and again, and what the marks can tell you',
  duration: '20-30 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 6, section: null },
  courseLevel: 'survey',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'arithmetic',
  prerequisites: [],
  tags: ['observing'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Say why five marks of one star are five different numbers, and that the spread belongs to the marking and is not a mistake',
    'Read the mean of the marks and its standard error from the spread and the number of marks',
    'Predict, before the truth is shown, how near the mean of the marks will be to it',
    'Say what the standard error includes and what it leaves out',
  ],
  steps: [
    {
      sid: 'a-star-on-a-frame',
      stage: STAGE,
      type: 'read',
      title: 'One star, marked again and again',
      body: `A measurement of where a star is begins with a mark on a picture.
             The frame below is <strong>synthetic</strong>: a star was put at a
             position we chose, blurred the way a telescope blurs it, and given
             a little sky noise. Each cross is one mark, the place a careful
             person would put the center of the blurred spot.
             \n\nBecause we made the frame, we know where the star really is.
             A real frame never tells you that. The truth is hidden for now.
             Five marks are shown, each as its position in pixels (x, y) in the
             list under the picture, and the ring is their mean.`,
      tool: FM({ n: 5, blur: 4 }),
    },
    {
      sid: 'predict-the-marks',
      stage: STAGE,
      type: 'predict',
      reveal: 'read-the-spread',
      title: 'Will the marks agree?',
      body: `The same star is marked five times, each time as carefully as
             possible. Do not change the instrument yet.`,
      prompt: 'The five positions will be&hellip;',
      options: [
        'all the same, if the marking is done carefully enough',
        'scattered a little around a center, even when each mark is careful',
        'scattered only because some of the marks are mistakes',
        'scattered only if the frame is poor',
      ],
      answer: 1,
      hints: ['Look at where the crosses sit on the blurred spot.'],
      because:
        'Scattered a little. The star is a blur several pixels wide, so even a careful mark lands a little to one side or the other, and no single mark is the truth. The spread is a property of the marking. The next step measures it.',
      tool: FM({ n: 5, blur: 4 }),
    },
    {
      sid: 'read-the-spread',
      stage: STAGE,
      type: 'measure',
      title: 'The mean and the spread',
      body: `With <strong>5</strong> marks, read the <strong>mean</strong> x
             position and the <strong>spread</strong> of the x marks, their
             standard deviation. The mean is the best single position the marks
             give; the spread says how far one mark typically lies from it.`,
      fields: [
        { id: 'mean', label: 'Mean x', unit: 'px', hint: '31.1' },
        {
          id: 'sd',
          label: 'Spread of x (standard deviation)',
          unit: 'px',
          hint: '0.80',
        },
      ],
      validate: v => {
        if (![v.mean, v.sd].every(Number.isFinite)) return null;
        if (near(v.mean, 31.1, 0.05) && near(v.sd, 0.8, 0.03)) {
          return {
            level: 'ok',
            message:
              'The five marks sit within about a pixel of 31.1, and a single mark is typically 0.8 pixel from that mean. That spread is what the five marks show of the marking itself.',
          };
        }
        return {
          level: 'error',
          message:
            'Set “How many marks” to 5 and read “Mean x position” and “Spread of the x marks”.',
        };
      },
      tool: FM({ n: 5, blur: 4 }),
    },
    {
      sid: 'the-standard-error',
      stage: STAGE,
      type: 'measure',
      title: 'How well is the mean known?',
      body: `The mean of five marks is better known than any one of them. The
             <strong>standard error</strong> says by how much: it is the spread
             divided by the square root of the number of marks. Read it for
             the x marks and for the y marks.`,
      fields: [
        { id: 'sex', label: 'Standard error of x', unit: 'px', hint: '0.36' },
        { id: 'sey', label: 'Standard error of y', unit: 'px', hint: '0.34' },
      ],
      validate: v => {
        if (![v.sex, v.sey].every(Number.isFinite)) return null;
        if (near(v.sex, 0.36, 0.02) && near(v.sey, 0.34, 0.02)) {
          return {
            level: 'ok',
            message:
              'About a third of a pixel on each axis. That is smaller than the spread of one mark, because the average of five marks wanders less than one mark does.',
          };
        }
        return {
          level: 'error',
          message:
            'Read the rows “Standard error of x” and “Standard error of y” with 5 marks.',
        };
      },
      tool: FM({ n: 5, blur: 4 }),
    },
    {
      sid: 'predict-more-marks',
      stage: STAGE,
      type: 'predict',
      reveal: 'twenty-marks',
      title: 'What do more marks buy?',
      body: `You will mark the star twenty times instead of five, which is four
             times as many marks.`,
      prompt: 'The standard error of the mean will&hellip;',
      options: [
        'stay about the same, because each mark is as careful as before',
        'fall to about half',
        'fall to about a quarter',
        'fall to zero, given enough marks',
      ],
      answer: 1,
      hints: [
        'The standard error is the spread divided by the square root of the number of marks.',
      ],
      because:
        'About half. Four times the marks is a factor of two in the square root, so the standard error falls to about half. The next step measures it.',
      tool: FM({ n: 5, blur: 4 }),
    },
    {
      sid: 'twenty-marks',
      stage: STAGE,
      type: 'measure',
      title: 'Twenty marks',
      body: `Set <strong>How many marks</strong> to 20. Read the standard error of
             x again, and work out how many times smaller it is than the
             standard error with five marks (0.36&nbsp;px).`,
      fields: [
        {
          id: 'sex',
          label: 'Standard error of x, 20 marks',
          unit: 'px',
          hint: '0.17',
        },
        {
          id: 'factor',
          label: 'How many times smaller than with 5 marks',
          unit: '',
          hint: '2.06',
        },
      ],
      validate: v => {
        if (![v.sex, v.factor].every(Number.isFinite)) return null;
        if (near(v.sex, 0.17, 0.02) && near(v.factor, 2.06, 0.2)) {
          return {
            level: 'ok',
            message:
              'The standard error fell by a factor of about two, as four times the marks predicts. The factor is not exactly two because twenty marks have their own spread, a little different from five.',
          };
        }
        return {
          level: 'error',
          message:
            'Set “How many marks” to 20, read “Standard error of x”, then divide 0.36 by it.',
        };
      },
      tool: FM({ n: 20, blur: 4 }),
    },
    {
      sid: 'predict-the-truth',
      stage: STAGE,
      type: 'predict',
      reveal: 'reveal-the-truth',
      title: 'Where is the star really?',
      body: `Back to <strong>5</strong> marks. The star's true position is hidden.
             Your mean is a good estimate of it, but it is only an estimate.`,
      prompt: 'When the truth is shown, it will lie&hellip;',
      options: [
        'exactly at the mean of the marks',
        'close to the mean, typically within about one or two standard errors of it, but not exactly on it',
        'at the first mark, which was made before the others could influence it',
        'anywhere in the frame, because five marks say nothing about it',
      ],
      answer: 1,
      hints: [
        'What did the standard error say about how far the mean wanders?',
      ],
      because:
        'Close, but not exactly on it. The standard error is how far the mean typically lies from the truth, so the truth should sit within about one or two of them. The next step shows it.',
      tool: FM({ n: 5, blur: 4 }),
    },
    {
      sid: 'reveal-the-truth',
      stage: STAGE,
      type: 'measure',
      title: 'The true position',
      body: `The dashed ring now marks the star's <strong>true</strong> position. Read
             the error of your mean in x (the mean minus the truth), and that
             error in units of the standard error.`,
      fields: [
        {
          id: 'err',
          label: 'Error of the mean in x (mean minus truth)',
          unit: 'px',
          hint: '-0.30',
        },
        {
          id: 'inse',
          label: 'That error in standard errors',
          unit: '',
          hint: '-0.84',
        },
      ],
      validate: v => {
        if (![v.err, v.inse].every(Number.isFinite)) return null;
        if (near(v.err, -0.3, 0.04) && near(v.inse, -0.84, 0.1)) {
          return {
            level: 'ok',
            message:
              'The mean is 0.3 pixel left of the truth, which is less than one standard error. The sign matters: the mean is below the truth. The truth was inside the range the standard error describes, as the prediction said.',
          };
        }
        return {
          level: 'error',
          message:
            'Show the truth, then read “Error of the mean in x” and “That error in standard errors”, with 5 marks and the sign shown.',
        };
      },
      tool: FM({ n: 5, blur: 4, truth: 1 }, ['offset']),
    },
    {
      sid: 'a-blurrier-star',
      stage: STAGE,
      type: 'measure',
      title: 'A star twice as blurred',
      body: `A different night, the same star, but the seeing is worse and the
             spot is <strong>twice as wide</strong>. Set <strong>Width of the
             star</strong> to 8 pixels, with 5 marks, and read the spread and the
             standard error of x.`,
      fields: [
        { id: 'sd', label: 'Spread of x', unit: 'px', hint: '1.60' },
        { id: 'sex', label: 'Standard error of x', unit: 'px', hint: '0.71' },
      ],
      validate: v => {
        if (![v.sd, v.sex].every(Number.isFinite)) return null;
        if (near(v.sd, 1.6, 0.06) && near(v.sex, 0.71, 0.03)) {
          return {
            level: 'ok',
            message:
              'Both doubled: a blurrier spot is harder to place, and the same five marks give a mean known half as well. The same method gives a worse answer, and it says so.',
          };
        }
        return {
          level: 'error',
          message:
            'Set “Width of the star” to 8 pixels and “How many marks” to 5, then read the spread and the standard error of x.',
        };
      },
      tool: FM({ n: 5, blur: 8 }),
    },
    {
      sid: 'why-it-doubled',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Why did both numbers double?',
      body: `With the star twice as wide, the spread and the standard error of x
             both came out about twice as large.`,
      prompt: 'What does that say?',
      options: [
        'How well a position is measured depends on the picture, and a blurrier picture gives a larger spread and a worse mean',
        'The standard error depends only on how many marks were made',
        'The marks were less careful on the second night',
        'The truth moved when the star blurred',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'only-n-matters',
          option: 1,
          say: 'The standard error is the spread over the square root of the number of marks. Both numbers change it, and this step changed the spread.',
        },
      ],
      hints: ['The number of marks did not change between the two steps.'],
      because:
        'The spread comes from how precisely a mark can be placed on the picture. A wider star is harder to place, so the spread is larger and the mean of the same number of marks is less well known. An uncertainty belongs to the measurement and to the picture it was made from.',
      tool: FM({ n: 5, blur: 8 }),
    },
    {
      sid: 'what-you-would-report',
      stage: STAGE,
      type: 'question',
      kind: 'short',
      rubric:
        'Full credit for reporting the mean of the marks (about 31.1 pixels) with its standard error (about 0.36 pixel, the spread divided by the square root of the number of marks), and for saying that one mark is one draw from the scatter, so the next mark differs. Credit also saying that the standard error leaves out a constant offset. Do not credit reporting only the first mark, or saying the marks are mistakes to be thrown away.',
      title: 'What would you report?',
      body: `You marked a star five times and found the marks differ.`,
      prompt:
        'In a sentence or two, say what you would report for the star’s x position, and why you would not report only the first mark.',
      tool: FM({ n: 5, blur: 4 }),
    },
    {
      sid: 'what-you-worked-out',
      stage: STAGE,
      type: 'read',
      title: 'What you worked out',
      body: `Careful marks of one star differ, because the spot is blurred, and the
             spread of the marks says how precisely a mark can be made. The
             mean of the marks is the best estimate they give, and its standard
             error, the spread over the square root of the number of marks,
             says how near the truth the mean typically lies. More marks lower
             it slowly: four times the marks halve it. A blurrier picture raises
             it. Here the truth was known, so we could see the mean land within one standard error of it. The next
             investigation asks what a stated "plus or minus" claims, and how
             to check a claim like that.`,
      tool: FM({ n: 5, blur: 4 }),
    },
  ],
};

// -----------------------------------------------------------------------------
// 2. What does ± claim?
// -----------------------------------------------------------------------------
export const WHAT_DOES_PLUS_MINUS_CLAIM = {
  id: 'what-does-plus-minus-claim',
  thumbnail: 'images/investigations/what-does-plus-minus-claim.webp',
  title: 'What Does ± Claim?',
  subtitle: 'Checking a stated uncertainty by repeating the measurement',
  duration: '25-40 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 6, section: null },
  courseLevel: 'majors',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'algebra',
  prerequisites: ['what-is-a-measurement'],
  tags: ['observing'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Say what coverage means: of many repeats of a measurement, the share whose stated interval holds the true value',
    'Check a stated one-sigma and two-sigma claim against a seeded ensemble of repeats',
    'Say why a small plus-or-minus from a biased instrument is a confident wrong claim',
    'Read an asymmetric interval and an upper limit as claims with a coverage of their own',
  ],
  steps: [
    {
      sid: 'a-claim-to-check',
      stage: STAGE,
      type: 'read',
      title: 'A claim you can check',
      body: `A measurement is reported as a value with an interval: “10.0
             ± 1.0”. If the interval is a <strong>one-sigma</strong>
             claim, it says that, over many repeats of the measurement, about
             two repeats in three would put the true value inside their own
             interval.
             \n\nThat claim can be checked, because here the data are
             <strong>synthetic</strong> and the true value is known (10.0). The
             picture shows the first forty of a seeded ensemble of repeats:
             each bar is the interval one repeat stated, the line is the truth.
             Bars that miss it are drawn dashed. The readout counts all of them.`,
      tool: CR({ case: 0, k: 1, repeats: 2000 }),
    },
    {
      sid: 'predict-one-sigma',
      stage: STAGE,
      type: 'predict',
      reveal: 'coverage-at-one-sigma',
      title: 'How many repeats hold the truth?',
      body: `The instrument really scatters by 1.0, and each repeat states
             “± 1.0”: an honest claim. Among 2000 repeats, count those whose interval
             holds the true value.`,
      prompt: 'The share that hold the truth will be about&hellip;',
      options: [
        'two thirds (68 percent)',
        'nineteen in twenty (95 percent)',
        'all of them, because the claim is honest',
        'half (50 percent)',
      ],
      answer: 0,
      hints: [
        'Think of the normal curve: how much of it lies within one sigma of the center?',
      ],
      because:
        'About two thirds. An interval of one sigma either side holds the truth for 68 percent of repeats when the stated sigma is the real scatter. The next step counts them.',
      tool: CR({ case: 0, k: 1, repeats: 2000 }),
    },
    {
      sid: 'coverage-at-one-sigma',
      stage: STAGE,
      type: 'measure',
      title: 'Count the repeats that hold the truth',
      body: `With the interval at <strong>±1 σ</strong> and 2000 repeats, read how
             many intervals hold the true value and what share of the repeats
             that is.`,
      fields: [
        {
          id: 'hits',
          label: 'Intervals that hold the truth',
          unit: '',
          hint: '1361',
        },
        { id: 'share', label: 'Share of the repeats', unit: '%', hint: '68.0' },
      ],
      validate: v => {
        if (![v.hits, v.share].every(Number.isFinite)) return null;
        if (near(v.hits, 1361, 25) && near(v.share, 68, 1.5)) {
          return {
            level: 'ok',
            message:
              'Just over two in three. The claim “one sigma” held up: the stated interval holds the truth about as often as it says it should.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the interval to ±1 σ with 2000 repeats, then read “Intervals that hold the truth” and “Coverage”.',
        };
      },
      tool: CR({ case: 0, k: 1, repeats: 2000 }),
    },
    {
      sid: 'coverage-at-two-sigma',
      stage: STAGE,
      type: 'measure',
      title: 'Widen the interval',
      body: `Widen the interval to <strong>±2 σ</strong>. Read the count and the
             share again.`,
      fields: [
        {
          id: 'hits',
          label: 'Intervals that hold the truth',
          unit: '',
          hint: '1901',
        },
        { id: 'share', label: 'Share of the repeats', unit: '%', hint: '95.0' },
      ],
      validate: v => {
        if (![v.hits, v.share].every(Number.isFinite)) return null;
        if (near(v.hits, 1901, 15) && near(v.share, 95, 1)) {
          return {
            level: 'ok',
            message:
              'Nineteen in twenty. A wider interval is a safer claim and a less sharp one: a two-sigma interval is wrong about one repeat in twenty.',
          };
        }
        return {
          level: 'error',
          message: 'Set the interval to ±2 σ and read the same two rows.',
        };
      },
      tool: CR({ case: 0, k: 2, repeats: 2000 }, [
        'case',
        'form',
        'rate',
        'repeats',
      ]),
    },
    {
      sid: 'predict-the-biased-instrument',
      stage: STAGE,
      type: 'predict',
      reveal: 'biased-coverage',
      title: 'A small plus-or-minus from a biased instrument',
      body: `A second instrument is far more precise: it scatters by only 0.3 and
             states “± 0.3”. But it reads <strong>0.4 too high</strong> every time,
             and nothing in its error bar says so.`,
      prompt:
        'The share of its one-sigma intervals that hold the truth will be&hellip;',
      options: [
        'about two thirds, because its stated sigma matches its scatter',
        'about nineteen in twenty',
        'much lower than two thirds',
        'higher than two thirds, because its interval is smaller',
      ],
      answer: 2,
      hints: [
        'Compare the offset, 0.4, with the half-width of the interval, 0.3.',
      ],
      because:
        'Much lower. Every repeat is shifted by more than the interval is wide, so most intervals miss the truth: the error bar describes the scatter and says nothing about the offset. The next step counts.',
      tool: CR({ case: 1, k: 1, repeats: 2000 }, [
        'case',
        'form',
        'rate',
        'repeats',
      ]),
    },
    {
      sid: 'biased-coverage',
      stage: STAGE,
      type: 'measure',
      title: 'Count them',
      body: `Read the share of the repeats that hold the truth at <strong>±1
             σ</strong> and then at <strong>±2 σ</strong>.`,
      fields: [
        { id: 'one', label: 'Share at ±1 σ', unit: '%', hint: '36.3' },
        { id: 'two', label: 'Share at ±2 σ', unit: '%', hint: '74.4' },
      ],
      validate: v => {
        if (![v.one, v.two].every(Number.isFinite)) return null;
        if (near(v.one, 36.3, 1.5) && near(v.two, 74.4, 1.5)) {
          return {
            level: 'ok',
            message:
              'Barely over a third at one sigma, and three in four at two sigma, for a claim that said two in three and nineteen in twenty. The scatter is small and the answer is still off.',
          };
        }
        return {
          level: 'error',
          message:
            'Use the biased instrument, then read “Coverage” at ±1 σ and at ±2 σ.',
        };
      },
      tool: CR({ case: 1, k: 1, repeats: 2000 }, [
        'case',
        'form',
        'rate',
        'repeats',
      ]),
    },
    {
      sid: 'what-a-small-error-bar-says',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'What does a small error bar say?',
      body: `The biased instrument's error bar is a third as long as the honest
             instrument's, and its intervals hold the truth far less often.`,
      prompt: 'What does a small stated uncertainty tell you?',
      options: [
        'That the repeats agree with each other: the measurement is precise, and it can still be inaccurate',
        'That the measurement is close to the true value',
        'That the instrument is better than one with a larger error bar',
        'That the interval will hold the truth more often',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'small-error-means-accurate',
          option: 1,
          say: 'A small error bar says the repeats cluster. It says nothing about whether the cluster sits on the truth: that is a different property, accuracy, and only a check against the truth, or against another method, can show it.',
        },
      ],
      hints: [
        'Which of the two properties did the biased instrument have, and which did it lack?',
      ],
      because:
        'Agreement between repeats, which is precision. Accuracy, closeness to the truth, needs a check that does not use the instrument itself. A stated plus-or-minus is a claim, and it is a claim about scatter unless someone has also checked for an offset.',
      tool: CR({ case: 1, k: 1, repeats: 2000 }, [
        'case',
        'form',
        'rate',
        'repeats',
      ]),
    },
    {
      sid: 'an-asymmetric-interval',
      stage: STAGE,
      type: 'measure',
      title: 'An interval that is not symmetric',
      body: `A star's parallax is 3.0&nbsp;mas, measured to ±0.9&nbsp;mas, and its
             distance in parsecs is 1000 divided by the parallax. The interval on
             the parallax, carried through that division, is
             <strong>not symmetric</strong> about the distance: it runs further
             above than below. Choose the <strong>asymmetric</strong> form at ±1 σ and read the
             coverage, and how many repeats had no upper end at all, because
             their parallax interval reached zero.`,
      fields: [
        {
          id: 'share',
          label: 'Share that hold the true distance',
          unit: '%',
          hint: '68.0',
        },
        {
          id: 'open',
          label: 'Repeats with no upper end',
          unit: '',
          hint: '17',
        },
      ],
      validate: v => {
        if (![v.share, v.open].every(Number.isFinite)) return null;
        if (near(v.share, 68, 1.5) && near(v.open, 17, 4)) {
          return {
            level: 'ok',
            message:
              'The asymmetric interval holds the truth two times in three, as a one-sigma interval should, because it is the parallax interval carried through the division. A few repeats cannot say how far the star is at all.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose the third case with the asymmetric form at ±1 σ and read “Coverage” and “No upper end”.',
        };
      },
      tool: CR({ case: 2, k: 1, repeats: 2000, form: 0 }, [
        'case',
        'rate',
        'repeats',
      ]),
    },
    {
      sid: 'the-symmetric-shortcut',
      stage: STAGE,
      type: 'measure',
      title: 'The symmetric shortcut',
      body: `A shortcut states the distance with a symmetric error bar instead, the
             distance plus or minus the parallax error carried through to first
             order. Choose the <strong>symmetric</strong> form at ±1 σ and read the coverage.`,
      fields: [
        {
          id: 'share',
          label: 'Share that hold the true distance',
          unit: '%',
          hint: '78.3',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.share)) return null;
        if (near(v.share, 78.3, 1.5)) {
          return {
            level: 'ok',
            message:
              'Not two in three. The symmetric shortcut says one sigma and holds the truth nearly four times in five, so it claims more than its coverage and the claim is not the one it appears to make.',
          };
        }
        return {
          level: 'error',
          message: 'Choose the symmetric form at ±1 σ and read “Coverage”.',
        };
      },
      tool: CR({ case: 2, k: 1, repeats: 2000, form: 1 }, [
        'case',
        'rate',
        'repeats',
      ]),
    },
    {
      sid: 'predict-the-upper-limit',
      stage: STAGE,
      type: 'predict',
      reveal: 'upper-limit-coverage',
      title: 'When nothing is seen well enough to measure',
      body: `An experiment counts events from a source whose true mean is 3.0
             events, and reports a <strong>95 percent upper limit</strong> on the
             rate from each count: a number the true rate is claimed to be
             below. Do not change the instrument.`,
      prompt:
        'Among 2000 repeats, the share whose upper limit lies above the true rate will be&hellip;',
      options: [
        'at least 95 percent, near 95 percent here',
        'about two thirds',
        'exactly 95.000 percent in every sample',
        'about half, because the limit is a one-sided bound',
      ],
      answer: 0,
      hints: [
        'The limit is built so that it holds the truth at least 95 times in 100.',
      ],
      because:
        'Near 95 percent, never below it by construction. Counts come in whole numbers, so the coverage cannot be tuned to exactly 95, and the 2000 repeats add a wobble of their own. The next step counts.',
      tool: CR({ case: 3, repeats: 2000, rate: 3 }, [
        'case',
        'k',
        'form',
        'repeats',
      ]),
    },
    {
      sid: 'upper-limit-coverage',
      stage: STAGE,
      type: 'measure',
      title: 'Check the limit',
      body: `Read the coverage of the upper limits at a true rate of
             <strong>3.0</strong>, then raise the rate to <strong>4.0</strong> and read it again.`,
      fields: [
        {
          id: 'at3',
          label: 'Share that hold the rate at 3.0',
          unit: '%',
          hint: '95.6',
        },
        {
          id: 'at4',
          label: 'Share that hold the rate at 4.0',
          unit: '%',
          hint: '98.7',
        },
      ],
      validate: v => {
        if (![v.at3, v.at4].every(Number.isFinite)) return null;
        if (near(v.at3, 95.6, 1) && near(v.at4, 98.7, 1)) {
          return {
            level: 'ok',
            message:
              'Near 95 percent at one rate and well above it at the other: an upper limit is a promise of at least that coverage, so it holds more often than it says at most rates. It is conservative, and it never promises less.',
          };
        }
        return {
          level: 'error',
          message: 'Read “Coverage” at the rate 3.0 and again at 4.0.',
        };
      },
      tool: CR({ case: 3, repeats: 2000, rate: 3 }, [
        'case',
        'k',
        'form',
        'repeats',
      ]),
    },
    {
      sid: 'what-would-prove-it-wrong',
      stage: STAGE,
      type: 'question',
      kind: 'short',
      rubric:
        'Full credit for saying that the claim 4.2 ± 0.3 (1σ) is about repeats: an interval built this way holds the true value in about two of every three repeats (68 percent); that the check is to repeat the measurement many times, or simulate it with a known truth, and count how often the interval holds the truth; and that the claim is wrong if that share is far from 68 percent beyond its own counting uncertainty (for example about 36 percent for a biased instrument). Do not credit saying that the true value lies in this one interval with 68 percent probability, or that a small ± means the value is right.',
      title: 'What would prove it wrong?',
      body: `A paper reports a value as “4.2 ± 0.3 (1σ)”.`,
      prompt:
        'In two or three sentences: what does that claim say about repeats, how would you check it, and what would you have to see for the claim to be wrong?',
      tool: CR({ case: 0, k: 1, repeats: 2000 }),
    },
    {
      sid: 'what-you-worked-out',
      stage: STAGE,
      type: 'read',
      title: 'What you worked out',
      body: `A stated one-sigma interval is a claim about repeats: it should hold the
             truth for about two in three of them, and a two-sigma interval for
             about nineteen in twenty. Here the truth was known, so the claim
             could be counted, and it held for the honest instrument and failed
             for the biased one, whose small plus-or-minus said nothing about its
             offset. An interval carried through a division is asymmetric, and the
             symmetric shortcut does not keep its coverage. An upper limit is a
             claim of at least its coverage. With real data the truth is unknown,
             so a claim can only be checked against repeats or against another
             method. The last investigation of three asks what to say when a
             method cannot give an interval at all.`,
      tool: CR({ case: 0, k: 1, repeats: 2000 }),
    },
  ],
};

// -----------------------------------------------------------------------------
// 3. When the method must refuse
// -----------------------------------------------------------------------------
export const WHEN_THE_METHOD_MUST_REFUSE = {
  id: 'when-the-method-must-refuse',
  thumbnail: 'images/investigations/when-the-method-must-refuse.webp',
  title: 'When the Method Must Refuse',
  subtitle:
    'A fit that fixes one combination, and a model that does not describe the data',
  duration: '25-40 min',
  level: 'Majors and upper-level astronomy',
  audience: 'intro',
  textbook: { chapter: 6, section: null },
  courseLevel: 'upper',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'algebra',
  prerequisites: ['what-does-plus-minus-claim'],
  tags: ['observing'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Say what a profile is: the best fit left when one parameter is held at each trial value',
    'Find that data which fix only a product of two parameters give a lower bound on one of them and no upper bound',
    'Say "not constrained" as the result, and why quoting a number would be inventing one',
    'Refuse a fit whose reduced chi-square and p-value say the model does not describe the data',
  ],
  steps: [
    {
      sid: 'a-product-not-two-numbers',
      stage: STAGE,
      type: 'read',
      title: 'Two parameters, one measurement',
      body: `The wobble of a star measures the pull of an unseen planet along
             our line of sight. That fixes the product of the planet's mass
             <em>m</em> and the sine of its orbit's tilt, <em>s</em> (1 for an orbit
             seen edge on, nearly 0 face on). Suppose the data give
             <strong>m s = 0.85 ± 0.06</strong> Jupiter masses. They fix that product and,
             as far as they go, nothing else.
             \n\nThe <strong>profile</strong> asks: for each trial mass, what is the best fit
             when the tilt is free to take whatever value fits best? Where the
             fit costs nothing more than its best, the mass is allowed. The
             data are <strong>synthetic</strong>, and the true mass and tilt are not stated.`,
      tool: PR({ case: 0, mass: 2 }),
    },
    {
      sid: 'predict-the-mass',
      stage: STAGE,
      type: 'predict',
      reveal: 'try-a-mass',
      title: 'What do the data say about the mass?',
      body: `The data say m s = 0.85 ± 0.06 Jupiter masses, and the tilt is not
             measured. Do not change the instrument yet.`,
      prompt: 'The mass m is&hellip;',
      options: [
        '0.85 Jupiter masses, give or take 0.06',
        'at least a little under 0.85 Jupiter masses, and it could be much larger',
        'between about 0.79 and 0.91 Jupiter masses',
        'anything at all: the data say nothing about it',
      ],
      answer: 1,
      hints: [
        'If s can be anything up to 1, what does that do to m = 0.85 ÷ s?',
      ],
      because:
        'The mass is at least about the product and could be much larger, since a smaller s needs a larger m to give the same product. The next steps measure the limit.',
      tool: PR({ case: 0, mass: 2 }),
    },
    {
      sid: 'try-a-mass',
      stage: STAGE,
      type: 'measure',
      title: 'Try a mass of 2 Jupiter masses',
      body: `Set the trial mass to <strong>2.0</strong> and read the tilt that fits
             best at that mass and what the fit then costs (the chi-square).`,
      fields: [
        { id: 's', label: 'Best tilt, the sine s', unit: '', hint: '0.425' },
        { id: 'chi', label: 'Chi-square of that fit', unit: '', hint: '0.00' },
      ],
      validate: v => {
        if (![v.s, v.chi].every(Number.isFinite)) return null;
        if (near(v.s, 0.425, 0.005) && near(v.chi, 0, 0.1)) {
          return {
            level: 'ok',
            message:
              'A mass of 2 fits the data perfectly, with a tilt of about 25 degrees from face on. The data cannot tell it from 0.85 Jupiter masses seen edge on.',
          };
        }
        return {
          level: 'error',
          message:
            'Set “Trial mass” to 2.0 and read the best tilt and the chi-square.',
        };
      },
      tool: PR({ case: 0, mass: 2 }),
    },
    {
      sid: 'try-a-small-mass',
      stage: STAGE,
      type: 'measure',
      title: 'Try a mass of 0.5',
      body: `Now set the trial mass to <strong>0.5</strong>, below the product. The tilt
             cannot exceed 1, so it cannot help. Read the best tilt and the
             chi-square.`,
      fields: [
        { id: 's', label: 'Best tilt, the sine s', unit: '', hint: '1.000' },
        { id: 'chi', label: 'Chi-square of that fit', unit: '', hint: '34.0' },
      ],
      validate: v => {
        if (![v.s, v.chi].every(Number.isFinite)) return null;
        if (near(v.s, 1, 0.005) && near(v.chi, 34, 0.7)) {
          return {
            level: 'ok',
            message:
              'The tilt is pinned at its limit and the fit costs 34 in chi-square: far outside any plausible range. Masses below the product are ruled out, and masses above it are not.',
          };
        }
        return {
          level: 'error',
          message: 'Set “Trial mass” to 0.5 and read the same two rows.',
        };
      },
      tool: PR({ case: 0, mass: 0.5 }),
    },
    {
      sid: 'the-lower-limit',
      stage: STAGE,
      type: 'measure',
      title: 'The smallest mass the data allow',
      body: `The profile shows the chi-square of the best fit at each trial mass,
             with lines where it has risen by 1 (a one-sigma range) and by 3.84
             (a 95 percent range). Read the smallest mass inside each rise.`,
      fields: [
        {
          id: 'one',
          label: 'Smallest mass, rise of 1',
          unit: 'M_J',
          hint: '0.79',
        },
        {
          id: 'two',
          label: 'Smallest mass, rise of 3.84',
          unit: 'M_J',
          hint: '0.73',
        },
      ],
      validate: v => {
        if (![v.one, v.two].every(Number.isFinite)) return null;
        if (near(v.one, 0.79, 0.01) && near(v.two, 0.73, 0.01)) {
          return {
            level: 'ok',
            message:
              'The data rule out masses below about 0.79 Jupiter masses at one sigma and below 0.73 at 95 percent. They say nothing about how large the mass can be: the curve is flat from there on.',
          };
        }
        return {
          level: 'error',
          message:
            'Read the rows “Smallest mass inside a rise of 1” and “… of 3.84”.',
        };
      },
      tool: PR({ case: 0, mass: 2 }),
    },
    {
      sid: 'is-there-a-largest-mass',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Is there a largest mass?',
      body: `Look at the right-hand side of the profile, for masses above the
             product.`,
      prompt: 'Do these data set a largest mass for the planet?',
      options: [
        'No: any larger mass fits equally well, with a smaller tilt',
        'Yes: about 0.91 Jupiter masses, one sigma above the product',
        'Yes: the largest mass is the one at the middle of the plotted range',
        'Yes, but it needs more data to be known',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'plus-sigma-is-upper-bound',
          option: 1,
          say: 'The product is 0.85 ± 0.06, but the mass is the product divided by the sine, so adding the product’s error bar does not bound it: a small enough tilt gives any mass.',
        },
      ],
      hints: [
        'What happens to the chi-square as the mass goes up and the tilt goes down together?',
      ],
      because:
        'No. For any larger mass the tilt that fits is smaller, and the chi-square stays at its best. With only the product measured, the mass has a lower bound and no upper one.',
      tool: PR({ case: 0, mass: 2 }),
    },
    {
      sid: 'what-to-report',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'What goes in the paper?',
      body: `The analysis has to state something about the planet's mass.`,
      prompt: 'Which statement is honest?',
      options: [
        'm = 0.85 ± 0.06 Jupiter masses',
        'm is at least 0.79 Jupiter masses (one sigma), and the data set no upper bound',
        'm = 2.0 Jupiter masses, the middle of the allowed range',
        'Nothing can be said about m',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'report-a-number',
          option: 0,
          say: 'That is the product m s, and quoting it as the mass invents a measurement of the tilt that was never made.',
        },
        {
          id: 'refuse-everything',
          option: 3,
          say: 'The data do rule out small masses. Saying nothing throws away a real result: the lower bound.',
        },
      ],
      hints: [
        'An honest report keeps the part the data fix and refuses the part they do not.',
      ],
      because:
        'A lower bound with the confidence stated, and "not constrained" above it. Giving a single mass would be inventing a number the data do not contain; saying nothing would drop the bound they do contain.',
      tool: PR({ case: 0, mass: 2 }),
    },
    {
      sid: 'predict-the-line',
      stage: STAGE,
      type: 'predict',
      reveal: 'fit-the-line',
      title: 'A straight line through six points',
      body: `A second analysis fits a straight line to six points, each with an
             error bar of 0.1. If a straight line is the right model, the chi-square
             of the fit divided by its degrees of freedom, the
             <strong>reduced chi-square</strong>, should come out about the same size
             in every repeat of the experiment. Do not fit yet.`,
      prompt:
        'If the line is the right model, the reduced chi-square will be near&hellip;',
      options: [
        '0, because the best fit has no error',
        '1',
        '6, the number of points',
        '100, because the points scatter',
      ],
      answer: 1,
      hints: [
        'Each point should miss the model by about its own error bar, and the chi-square sums the squares of those misses.',
      ],
      because:
        'Near 1. Each of the points should lie about one error bar from the model, and the degrees of freedom count the points not already used to fix the line. A reduced chi-square far above 1 says the model fails.',
      tool: PR({ case: 1, terms: 2 }, ['case', 'mass']),
    },
    {
      sid: 'fit-the-line',
      stage: STAGE,
      type: 'measure',
      title: 'Fit the line',
      body: `The line is fitted by weighted least squares, and the fit states a slope
             with its formal uncertainty. Read the slope, its formal
             uncertainty and the reduced chi-square.`,
      fields: [
        { id: 'slope', label: 'Slope', unit: '', hint: '1.078' },
        {
          id: 'sigma',
          label: 'Formal uncertainty of the slope',
          unit: '',
          hint: '0.024',
        },
        { id: 'reduced', label: 'Reduced chi-square', unit: '', hint: '7.64' },
      ],
      validate: v => {
        if (![v.slope, v.sigma, v.reduced].every(Number.isFinite)) return null;
        if (
          near(v.slope, 1.078, 0.01) &&
          near(v.sigma, 0.024, 0.003) &&
          near(v.reduced, 7.64, 0.15)
        ) {
          return {
            level: 'ok',
            message:
              'A slope of 1.078 ± 0.024 comes with a reduced chi-square of 7.6: the points miss the line by about three error bars each, where a line that described them would miss by one. The slope’s tidy uncertainty describes a model that is not the data.',
          };
        }
        return {
          level: 'error',
          message:
            'Use a straight line (two terms) and read “Slope”, its uncertainty and “Reduced chi-square”.',
        };
      },
      tool: PR({ case: 1, terms: 2 }, ['case', 'mass', 'terms']),
    },
    {
      sid: 'refuse-or-report',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'What should the analysis say?',
      body: `The line has a reduced chi-square of 7.6 on four degrees of freedom,
             and a p-value below 0.001: a chance below one in a thousand that a
             true line would miss the points this badly.`,
      prompt: 'What does the analysis report?',
      options: [
        'The slope is 1.078 ± 0.024',
        'The line does not describe these data, so its slope and uncertainty are not a result: no slope is claimed from this fit',
        'The slope is 1.078 with the uncertainty multiplied by the square root of 7.6, to make the reduced chi-square 1',
        'The slope is 1.078 ± 0.024, with a note that the fit is poor',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'scale-the-errors',
          option: 2,
          say: 'Rescaling the errors makes the numbers look consistent and keeps a model the data have already rejected. The fix is a different model, not a larger error bar on the wrong one.',
        },
        {
          id: 'note-and-report',
          option: 3,
          say: 'A note does not undo the number: the slope and its ± are quoted as a result, and the uncertainty is formal only for a model that fits.',
        },
      ],
      hints: ['Ask first whether the model describes the data at all.'],
      because:
        'The model is refused. A formal uncertainty only means something when the model describes the data, and here a reduced chi-square of 7.6 with a p-value below 0.001 says it does not. The honest answer is the refusal and a better model, not a number.',
      tool: PR({ case: 1, terms: 2 }, ['case', 'mass', 'terms']),
    },
    {
      sid: 'a-model-that-fits',
      stage: STAGE,
      type: 'measure',
      title: 'A model with one more term',
      body: `Change the fit to a <strong>parabola</strong> (three terms). Read the reduced
             chi-square and the coefficient of the squared term.`,
      fields: [
        { id: 'reduced', label: 'Reduced chi-square', unit: '', hint: '0.37' },
        {
          id: 'curve',
          label: 'Coefficient of the squared term',
          unit: '',
          hint: '0.089',
        },
      ],
      validate: v => {
        if (![v.reduced, v.curve].every(Number.isFinite)) return null;
        if (near(v.reduced, 0.37, 0.04) && near(v.curve, 0.089, 0.005)) {
          return {
            level: 'ok',
            message:
              'The parabola describes the points: the reduced chi-square is below 1 and the squared term is about five of its own uncertainties from zero. That is a model that fits, not a proof that the true curve is a parabola.',
          };
        }
        return {
          level: 'error',
          message:
            'Use the parabola (three terms), then read “Reduced chi-square” and the squared term.',
        };
      },
      tool: PR({ case: 1, terms: 3 }, ['case', 'mass']),
    },
    {
      sid: 'what-would-you-refuse',
      stage: STAGE,
      type: 'question',
      kind: 'short',
      rubric:
        'Full credit for saying that for a parameter the data do not fix (only a product of two is constrained) the analysis reports a bound or not constrained, with the combination that is fixed, instead of one value; that for a model the data reject (a reduced chi-square far above 1 and a tiny p-value) it says the model does not fit and quotes no slope; and for naming the check: the profile of chi-square against the parameter, and the reduced chi-square and p-value of the fit. Do not credit quoting the best fit with its formal error.',
      title: 'What would you refuse?',
      body: `You have seen two ways a method can have nothing honest to quote: a
             parameter the data do not fix, and a model the data reject.`,
      prompt:
        'In two or three sentences: for each, what would the analysis say instead of a number, and what would you check before a number is quoted?',
      tool: PR({ case: 0, mass: 2 }),
    },
    {
      sid: 'what-you-worked-out',
      stage: STAGE,
      type: 'read',
      title: 'What you worked out',
      body: `Data that fix only a product give a lower bound on one factor and none
             above it: the profile is flat, and the honest result is a lower
             limit with "not constrained" beyond it. A number such as the product
             itself, or the middle of the range, would invent a measurement.
             A fit whose reduced chi-square is far above 1 has a model the data
             reject, and its formal uncertainty is not a result; a model with one
             more term can fit and still is not proven. Both data sets here were
             synthetic, with the truth built in. The method on real data will have
             the same refusals, and they are findings.`,
      tool: PR({ case: 0, mass: 2 }),
    },
  ],
};

// -----------------------------------------------------------------------------
// The image investigations (Prompt 191): three more lessons in this file, on the
// image-measurement instruments (js/imagingWidgets.js). Same rules as above.
// -----------------------------------------------------------------------------
const MM = (values = {}, hide = []) => ({
  id: 'moon-marks',
  values,
  hide,
});
const SP = (values = {}, hide = ['zero']) => ({
  id: 'star-parallax',
  values,
  hide,
});
const BO = (values = {}, hide = ['plx']) => ({
  id: 'binary-orbit',
  values,
  hide,
});

// -----------------------------------------------------------------------------
// 4. Measuring the Moon
// -----------------------------------------------------------------------------
export const MEASURING_THE_MOON = {
  id: 'measuring-the-moon',
  thumbnail: 'images/investigations/measuring-the-moon.webp',
  title: 'Measuring the Moon',
  subtitle:
    'Marks on a real picture, a scale from a known length, and a size in kilometers',
  duration: '15-25 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 6, section: null },
  courseLevel: 'survey',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'arithmetic',
  prerequisites: ['what-is-a-measurement'],
  tags: ['observing'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Say why a picture has no scale of its own, and where a scale comes from',
    'Give a real picture a scale from a length you know, and read a size in kilometers from a circle on it',
    'Predict the size of a feature before measuring it, and say what the stated uncertainty includes and what it leaves out',
    'Say why this picture can be marked and measured in pixels but not read for brightness',
  ],
  steps: [
    {
      sid: 'a-picture-of-the-moon',
      stage: STAGE,
      type: 'read',
      title: 'A real picture of the Moon',
      body: `This is a <strong>real</strong> picture: the Moon, photographed by NASA&rsquo;s
             Galileo spacecraft on 7 December 1992 as it flew past the Earth on
             its way to Jupiter. It is an enhanced-color composite, shown here in
             gray. <em>Enhanced</em> means the contrast was stretched to show
             differences in the ground, so its gray levels are for the eye and are
             not a measure of the light the Moon reflects. The Observatory calls such
             a picture <strong>display-only</strong>: you may mark it and measure
             it in pixels, and nothing more.
             \n\nA picture has no scale of its own. This one is 496 pixels across,
             and a pixel is not a kilometer. The pixels are numbered from the lower
             left, x to the right and y up, and the disc is cropped close: its right
             edge touches the last column. In this investigation you give the picture a
             scale and take one measurement off it.`,
      tool: MM({}, ['x1', 'x2', 'cx', 'cy', 'r']),
    },
    {
      sid: 'predict-the-scale',
      stage: STAGE,
      type: 'predict',
      reveal: 'scale-from-the-disc',
      title: 'What gives a picture its scale?',
      body: `You want a length on the picture in kilometers, and you have only
             pixels.`,
      prompt: 'To turn pixels into kilometers you need&hellip;',
      options: [
        'the date the picture was taken',
        'a length in the picture that you already know in kilometers',
        'the brightness of the Moon in the picture',
        'the number of colors in the picture',
      ],
      answer: 1,
      hints: [
        'Where could a length in kilometers come from, with nothing else on the picture?',
      ],
      because:
        'A length in the picture that you already know. A picture records angles and pixels and never says how far away the thing is, so the only way to a scale is to point at something in it whose size you know by other means. Here that is the Moon itself, whose mean diameter, 3,474.8 km, was measured by other means.',
      tool: MM({}, ['x1', 'x2', 'cx', 'cy', 'r']),
    },
    {
      sid: 'scale-from-the-disc',
      stage: STAGE,
      type: 'measure',
      title: 'A reference pair across the disc',
      body: `Mark the full width of the disc with a <strong>reference pair</strong>: a
             line along the horizontal through the middle of the disc (row 245), from
             its left edge to its right edge. Set the left end to <strong>3</strong>
             and the right end to <strong>496</strong>. The pair is taken to span
             3,474.8 km, the Moon&rsquo;s mean diameter. Read its length in pixels and
             the scale it gives.
             \n\nThe right end sits on the last column of the frame, so the disc may
             be a pixel or two wider than the picture. Keep that in mind: it is not in
             the uncertainty the tool states.`,
      fields: [
        { id: 'pair', label: 'Length of the pair', unit: 'px', hint: '493' },
        {
          id: 'scale',
          label: 'Scale from the pair, in km per pixel',
          unit: '',
          hint: '7.05',
        },
      ],
      validate: v => {
        if (![v.pair, v.scale].every(Number.isFinite)) return null;
        if (near(v.pair, 493, 3) && near(v.scale, 7.05, 0.05)) {
          return {
            level: 'ok',
            message:
              'The pair spans 493 pixels, so one pixel is 7.05 km on the Moon. The scale is only as good as the two things it rests on: the diameter you assumed, and where you put the two ends.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the left end to 3 and the right end to 496, then read “Length of the pair” and “Scale from the pair”.',
        };
      },
      tool: MM({ x1: 60, x2: 440 }, ['cx', 'cy', 'r']),
    },
    {
      sid: 'why-a-pair',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Why the scale comes from you',
      body: `The Observatory can give an image a scale in arcseconds per pixel when
             the image carries world coordinates, and it refuses to for this picture.
             The scale you just made came from a pair you marked.`,
      prompt: 'Why does the scale have to come from a pair that you mark?',
      options: [
        'The picture was taken by a spacecraft, so it has no pixels',
        'The picture carries no coordinates or units for its pixels, so no scale can be read from it; the only scale is one you make from a length you know',
        'The Observatory does not trust pictures from NASA',
        'A scale is only needed for pictures in color',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'no-pixels',
          option: 0,
          say: 'Every digital picture has pixels. What this one lacks is a record of what a pixel is worth on the sky or on the ground.',
        },
        {
          id: 'trust',
          option: 2,
          say: 'It is not about trust. A display picture was stretched and re-encoded for the eye, and no one recorded a scale for it; a scale you state yourself is yours, and the tool shows it as such.',
        },
      ],
      hints: ['What does the picture record about its own pixels?'],
      because:
        'The picture carries no coordinates or units, so nothing in it says what a pixel is worth. A scale you make from a length you know is a measurement of yours, with the assumption written beside it, and that is the only kind this picture allows.',
      tool: MM({ x1: 3, x2: 496 }, ['x1', 'x2', 'cx', 'cy', 'r']),
    },
    {
      sid: 'predict-the-plain',
      stage: STAGE,
      type: 'predict',
      reveal: 'measure-the-plain',
      title: 'How wide is the dark plain?',
      body: `Near the middle of the disc there is a large dark plain, nearly round,
             with its center close to x = 289, y = 306. The Moon&rsquo;s dark plains are
             old lava flows. Before you measure it, look at it beside the whole disc.`,
      prompt: 'Across, the plain is about&hellip;',
      options: ['6 km', '60 km', '600 km', '6,000 km'],
      answer: 2,
      hints: [
        'The whole Moon is about 3,500 km across. What share of it is the plain?',
      ],
      because:
        'About 600 km, a little under a fifth of the Moon’s width: the plain spans roughly a fifth of the disc and the disc is 3,475 km across. The next step measures it.',
      tool: MM({ x1: 3, x2: 496, cx: 289, cy: 306, r: 20 }, ['x1', 'x2']),
    },
    {
      sid: 'measure-the-plain',
      stage: STAGE,
      type: 'measure',
      title: 'A circle on the plain',
      body: `The pair stays across the disc. The circle starts at x = 289, y = 306.
             Change the <strong>radius</strong> until the circle follows the edge of the
             dark plain, and nudge the center if the circle drifts to one side. Read
             the diameter of the circle in kilometers.`,
      fields: [
        {
          id: 'km',
          label: 'Diameter of the circle',
          unit: 'km',
          hint: '630',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.km)) return null;
        if (near(v.km, 634, 45)) {
          return {
            level: 'ok',
            message:
              'About 630 km across, as the prediction said, within the few pixels a careful person can place the edge of a soft dark plain. The tool states about 6 km; the next step is about what that number does and does not include.',
          };
        }
        return {
          level: 'error',
          message:
            'Fit the circle to the edge of the dark plain, then read “Diameter of the circle in kilometers”.',
        };
      },
      tool: MM({ x1: 3, x2: 496, cx: 289, cy: 306, r: 30 }, ['x1', 'x2']),
    },
    {
      sid: 'what-would-change-it',
      stage: STAGE,
      type: 'question',
      kind: 'short',
      rubric:
        'Full credit for naming two things that change the diameter, for example where the edge of the plain is placed (a soft edge, so two careful people differ by a few pixels), where the two ends of the pair are placed, the assumed diameter of the Moon, or the picture being cropped at the right, and for saying that the stated uncertainty of about 6 km includes only the rounding of each placement, and so leaves the softness of the edge and the assumptions out. Do not credit saying the number is exact, or that more marks of the same kind remove the assumptions.',
      title: 'What would change the number?',
      body: `The tool states the diameter as about 634 &plusmn; 6 km. Two people who each
             fit the circle by eye will not agree to 6 km.`,
      prompt:
        'In two or three sentences: name two things that would change the diameter you got, and say which of them the stated uncertainty includes.',
      tool: MM({ x1: 3, x2: 496, cx: 289, cy: 306, r: 45 }, ['x1', 'x2']),
    },
    {
      sid: 'what-you-worked-out',
      stage: STAGE,
      type: 'read',
      title: 'What you worked out',
      body: `A picture has no scale until you give it one, and the scale you give it is
             a measurement of yours, resting on a length you assumed and on two marks you
             placed. With it, a circle on a feature gave a size in kilometers, about
             630 km for the plain, and the tool&rsquo;s stated uncertainty covered only the
             rounding of your marks. The softness of the edge, the crop at the right
             and the assumed diameter are not in it. And because the picture is a
             display picture, its gray levels are not light: you measured where things
             are and how big they are, and nothing about how bright.`,
      tool: MM({ x1: 3, x2: 496, cx: 289, cy: 306, r: 45 }, ['x1', 'x2']),
    },
  ],
};

// -----------------------------------------------------------------------------
// 5. How far is that star?
// -----------------------------------------------------------------------------
export const HOW_FAR_IS_THAT_STAR = {
  id: 'how-far-is-that-star',
  thumbnail: 'images/investigations/how-far-is-that-star.webp',
  title: 'How Far Is That Star?',
  subtitle:
    'A shift, a motion and a parallax from fourteen positions of one star',
  duration: '20-30 min',
  level: 'Majors and upper-level astronomy',
  audience: 'intro',
  textbook: { chapter: 19, section: '19.1' },
  courseLevel: 'majors',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'algebra',
  prerequisites: ['what-does-plus-minus-claim'],
  tags: ['observing'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Say why a shift between two positions is not a distance, and what a two-epoch shift assumes',
    'Say why a straight proper motion cannot describe a star that has a parallax, and read the chi-square that says so',
    'Read a parallax and a distance with an interval from a well-sampled series, and say what the interval claims',
    'Say what a relative parallax leaves out, and why too few epochs are refused',
  ],
  steps: [
    {
      sid: 'fourteen-positions',
      stage: STAGE,
      type: 'read',
      title: 'One star, fourteen dates',
      body: `A star&rsquo;s position on the sky has been measured at fourteen dates over
             almost two years. The data are <strong>synthetic</strong>: a star was put at a
             distance and given a motion that we chose, seen from the Earth&rsquo;s real
             orbit, and each position was given a random error of 4 milliarcseconds
             (mas). The truth is withheld until the end.
             \n\nTwo things move a star on the sky. Its own motion through space,
             its <strong>proper motion</strong>, is steady. The Earth&rsquo;s motion around the
             Sun makes a nearby star trace a small loop once a year, its
             <strong>parallax</strong>, and the nearer the star, the bigger the loop. A parallax
             of p seconds of arc is a distance of 1/p parsecs.`,
      tool: SP({ fit: 2, n: 14 }),
    },
    {
      sid: 'predict-the-shift',
      stage: STAGE,
      type: 'predict',
      reveal: 'the-shift',
      title: 'Does a shift give a distance?',
      body: `Take the first and the last of the fourteen positions. They differ: the
             star has moved.`,
      prompt: 'That shift between two positions&hellip;',
      options: [
        'gives the distance: the bigger the shift, the nearer the star',
        'cannot tell the star’s own motion from a parallax, so it gives no distance',
        'gives the distance if the two positions are a year apart',
        'is zero, because stars do not move',
      ],
      answer: 1,
      hints: ['What else, besides distance, moves a star between two dates?'],
      because:
        'It cannot tell the two apart. Between two dates the star has moved by its own motion and by a different part of its yearly loop, and one pair of positions has no way to say how much is which. The tool labels such a result a shift under a fixed-motion assumption, and gives no parallax or distance for it.',
      tool: SP({ fit: 0, n: 14 }),
    },
    {
      sid: 'the-shift',
      stage: STAGE,
      type: 'measure',
      title: 'The shift, first to last',
      body: `Set <strong>What to fit</strong> to the two-epoch shift and use all 14 epochs, so
             the shift is from the first position to the last. Read the size of the shift
             and the rate it would be if it were all motion.`,
      fields: [
        { id: 'sep', label: 'Size of the shift', unit: 'mas', hint: '549' },
        {
          id: 'rate',
          label: 'Rate if it were all motion, in arcseconds a year',
          unit: '',
          hint: '0.287',
        },
      ],
      validate: v => {
        if (![v.sep, v.rate].every(Number.isFinite)) return null;
        if (near(v.sep, 549, 5) && near(v.rate, 0.287, 0.004)) {
          return {
            level: 'ok',
            message:
              'The star shifted 549 mas in 1.92 years: 0.287 arcsec a year if it were all motion. The result carries its label: a shift under a fixed-motion assumption, not a parallax, so there is no distance in it.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose the two-epoch shift with 14 epochs, then read “Size of the shift” and “Rate if it were all motion”.',
        };
      },
      tool: SP({ fit: 0, n: 14 }),
    },
    {
      sid: 'predict-a-straight-line',
      stage: STAGE,
      type: 'predict',
      reveal: 'a-straight-line-fails',
      title: 'Does a straight line describe the path?',
      body: `Now fit all fourteen positions with a proper motion alone: a straight line
             at a steady speed, with no parallax.`,
      prompt: 'A straight line&hellip;',
      options: [
        'will describe the path, because stars move in straight lines',
        'will not describe it, because the yearly loop lies off any straight line',
        'will describe it if the errors are made large enough',
        'will describe it, because the loop is smaller than the errors',
      ],
      answer: 1,
      hints: [
        'The loop is about 60 mas across. How large is the error of one position?',
      ],
      because:
        'It will not. The loop is about fifteen times the 4 mas error of one position, so every position that is off the line is off it by a lot. A model that cannot make a loop cannot describe a star that makes one.',
      tool: SP({ fit: 1, n: 14 }),
    },
    {
      sid: 'a-straight-line-fails',
      stage: STAGE,
      type: 'measure',
      title: 'The straight line, judged',
      body: `Set <strong>What to fit</strong> to the proper motion, with 14 epochs. Read the
             chi-square of the fit and its degrees of freedom: 28 numbers (14 positions in
             two coordinates) less the four the line has.`,
      fields: [
        { id: 'chi2', label: 'Chi-square of the fit', unit: '', hint: '1576' },
        { id: 'dof', label: 'Degrees of freedom', unit: '', hint: '24' },
      ],
      validate: v => {
        if (![v.chi2, v.dof].every(Number.isFinite)) return null;
        if (near(v.chi2, 1576, 12) && near(v.dof, 24, 0.5)) {
          return {
            level: 'ok',
            message:
              'A chi-square of 1576 for 24 degrees of freedom: each position misses the line by about eight of its own error bars, where a line that described the star would miss by about one. The tool says the residuals are not consistent with the errors, and the straight line is refused as a description.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose the proper motion with 14 epochs, then read “Chi-square of the fit” and “Degrees of freedom”.',
        };
      },
      tool: SP({ fit: 1, n: 14 }),
    },
    {
      sid: 'the-parallax',
      stage: STAGE,
      type: 'measure',
      title: 'Parallax and motion together',
      body: `Set <strong>What to fit</strong> to parallax and motion, with 14 epochs. Read the
             parallax, its uncertainty and the distance.`,
      fields: [
        { id: 'p', label: 'Parallax, relative', unit: 'mas', hint: '60.3' },
        {
          id: 'sigma',
          label: 'Uncertainty of the parallax',
          unit: 'mas',
          hint: '1.5',
        },
        {
          id: 'd',
          label: 'Distance, 1 over the parallax',
          unit: 'pc',
          hint: '16.6',
        },
      ],
      validate: v => {
        if (![v.p, v.sigma, v.d].every(Number.isFinite)) return null;
        if (
          near(v.p, 60.3, 0.5) &&
          near(v.sigma, 1.53, 0.1) &&
          near(v.d, 16.6, 0.15)
        ) {
          return {
            level: 'ok',
            message:
              'A parallax of 60.3 ± 1.5 mas is a distance of about 16.6 parsecs, and the residuals are now consistent with the errors (chi-square 13.2 for 23 degrees of freedom). A model with the loop describes the star; one without it did not.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose parallax and motion with 14 epochs, then read “Parallax, relative”, its uncertainty and “Distance, 1 over the parallax”.',
        };
      },
      tool: SP({ fit: 2, n: 14 }),
    },
    {
      sid: 'what-the-interval-says',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'What the interval says',
      body: `The tool gives the distance as 16.59 pc, with a 68 percent interval of 16.18
             to 17.02 pc and a 95 percent interval of 15.80 to 17.45 pc. The parallax
             has an uncertainty of 1.53 mas.`,
      prompt: 'Which sentence does the result support?',
      options: [
        'The star is 16.59 pc away, exactly',
        'If the reference stars have no parallax of their own, the distance is about 16.6 pc, and repeating the measurement would give an interval that holds the true distance about two times in three',
        'The star is certainly between 16.18 and 17.02 pc',
        'The star is 16.59 pc away, plus or minus 1.53 pc',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'exact',
          option: 0,
          say: 'One over the parallax is the middle of an interval and not an exact distance: with an error on the parallax, the distance has one too, and it is not even symmetric.',
        },
        {
          id: 'certain',
          option: 2,
          say: 'A 68 percent interval is a statement about repeats: about one in three would miss it. “Certainly” is a claim no interval makes.',
        },
        {
          id: 'mixed-units',
          option: 3,
          say: 'The 1.53 is the uncertainty of the parallax, in milliarcseconds. The distance’s own interval comes from 1 over the ends of the parallax’s, and is not 1.53 parsecs.',
        },
      ],
      hints: [
        'An interval says what repeats would do, and the frame the parallax is measured in matters.',
      ],
      because:
        'The interval is a statement about repeats of the measurement, as in What Does ± Claim?, and about the frame: the parallax is relative to the reference stars, so the distance is never smaller than the true one if they have a parallax of their own.',
      tool: SP({ fit: 2, n: 14 }),
    },
    {
      sid: 'six-epochs',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Only six epochs',
      body: `Set <strong>Epochs used</strong> to 6, and keep parallax and motion. The
             first six epochs cover 0.74 of a year.`,
      prompt: 'What does the tool report?',
      options: [
        'A parallax of the same size, with a larger error bar',
        'Not constrained: a parallax needs at least eight epochs that sample the Earth’s orbit, so it gives no number',
        'A parallax of zero, because the loop is not complete',
        'The proper motion, relabeled as a parallax',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'bigger-bar',
          option: 0,
          say: 'With too few epochs, or too little of the orbit, the loop is not fixed at all, so a wider bar would still hide that a number was made up.',
        },
        {
          id: 'zero',
          option: 2,
          say: 'Zero is a measurement too, and it is not what the data say: they say nothing. The refusal is the honest answer.',
        },
      ],
      hints: ['Read the line that starts “Not constrained”.'],
      because:
        'Not constrained. A parallax is the part of the star’s path that repeats every year, so the epochs must sample that loop; the tool requires eight epochs over at least 0.9 of a year and gives no number below that. A refusal is a result, not a failure.',
      tool: SP({ fit: 2, n: 6 }),
    },
    {
      sid: 'say-what-relative-means',
      stage: STAGE,
      type: 'question',
      kind: 'short',
      rubric:
        'Full credit for saying that a parallax needs about a year of coverage because it is the part of the motion that repeats yearly and must be told apart from the steady proper motion, and that a relative parallax is measured against reference stars that themselves have a parallax, so it is smaller than the absolute one by their mean parallax and the distance from it reads too large. Do not credit saying the distance is exact, or that relative means approximate.',
      title: 'Why a year, and what relative means',
      body: `Two things limited this distance beyond its interval: how many epochs there
             were, and the frame the parallax is measured in.`,
      prompt:
        'In two or three sentences: why does a parallax need epochs covering about a year, and what does “relative” say about the parallax you read?',
      tool: SP({ fit: 2, n: 14 }),
    },
    {
      sid: 'what-you-worked-out',
      stage: STAGE,
      type: 'read',
      title: 'What you worked out',
      body: `A shift between two positions mixes a star&rsquo;s own motion with a parallax
             and gives no distance. A straight proper motion fitted to a star that has a
             parallax is rejected by its own chi-square, here 1576 for 24 degrees of freedom.
             With the loop in the model, fourteen epochs gave 60.3 &plusmn; 1.5 mas, about 16.6
             parsecs, with an interval, and with six epochs the tool gave nothing, which is
             the right answer. The parallax is relative to the reference stars, so the
             distance is never smaller than the true one. The data were synthetic; the star
             was made at 16.67 parsecs, a parallax of 60 mas, and the interval holds that.`,
      tool: SP({ fit: 2, n: 14 }),
    },
  ],
};

// -----------------------------------------------------------------------------
// 6. A binary star's orbit
// -----------------------------------------------------------------------------
export const A_BINARY_STARS_ORBIT = {
  id: 'a-binary-stars-orbit',
  thumbnail: 'images/investigations/a-binary-stars-orbit.webp',
  title: 'A Binary Star’s Orbit',
  subtitle:
    'Positions over sixteen years, the orbit they fix, and the mass of the pair',
  duration: '20-30 min',
  level: 'Majors and upper-level astronomy',
  audience: 'intro',
  textbook: { chapter: 18, section: '18.2' },
  courseLevel: 'upper',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'algebra',
  prerequisites: ['how-far-is-that-star'],
  tags: ['observing'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Say why the path of a companion on the sky is an ellipse even for a circular orbit, and why a circular model is refused for an eccentric one',
    'Read an orbit from positions over time, with its period, size and eccentricity and their uncertainties',
    'Turn the size of the orbit and a parallax into astronomical units, and the period and size into a mass sum by Kepler&rsquo;s third law',
    'Say what the positions of a binary fix and what they leave open: the mass of each star, the node, and the distance behind the sum',
  ],
  steps: [
    {
      sid: 'twelve-positions',
      stage: STAGE,
      type: 'read',
      title: 'A companion, twelve dates',
      body: `A binary star is two stars that go round each other. Here the position of
             the fainter one, relative to the brighter, has been measured at twelve dates
             over sixteen years, each with an error of 15 milliarcseconds. The data are
             <strong>synthetic</strong>: a binary with elements we chose, seen at an angle, with
             random errors. The truth is withheld until the end.
             \n\nThe path on the sky is the orbit as seen at an angle. Its size in
             arcseconds, a, and its period, P, are what the positions fix. Kepler&rsquo;s third
             law then gives the mass of the pair, M = a³/P² in solar masses when a is in
             astronomical units and P in years, and a in astronomical units needs the distance:
             a parallax of p arcseconds makes a (au) = a (arcsec)/p. Positions alone fix only the
             <em>sum</em> of the two masses.`,
      tool: BO({ n: 12, model: 0 }),
    },
    {
      sid: 'predict-the-shape',
      stage: STAGE,
      type: 'predict',
      reveal: 'a-circle-first',
      title: 'What shape is the path on the sky?',
      body: `Suppose the true orbit were a perfect circle, tilted away from face-on.`,
      prompt: 'The path of the companion on the sky would be&hellip;',
      options: [
        'always a circle',
        'an ellipse, unless the orbit is seen exactly face-on',
        'a straight line',
        'a spiral, because the stars attract each other',
      ],
      answer: 1,
      hints: ['What does a tilted circle look like?'],
      because:
        'An ellipse. A circle seen at an angle is foreshortened in one direction and is an ellipse, so an ellipse on the sky does not by itself mean an eccentric orbit. The fit separates the two: it asks the data whether a circle, seen at some angle, describes them.',
      tool: BO({ n: 12, model: 1 }),
    },
    {
      sid: 'a-circle-first',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'A circular orbit, tried first',
      body: `Set <strong>Orbit model</strong> to circular, with all twelve epochs, and read what the
             tool says.`,
      prompt: 'What does the tool report?',
      options: [
        'A circular orbit with a period of 13.3 years',
        'Not constrained: the residuals are far larger than the stated errors, so a circular orbit does not describe these positions',
        'An orbit with an eccentricity of zero and the mass of the pair',
        'A circular orbit, with a note that the fit is poor',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'report-anyway',
          option: 0,
          say: 'The tool does fit a period, 13.3 years, and then refuses it: a number from a model the data reject is not a result.',
        },
        {
          id: 'note-and-report',
          option: 3,
          say: 'A note does not undo the number. The chi-square, 5225 for 19 degrees of freedom, says the model is wrong, and the tool gives no orbit.',
        },
      ],
      hints: ['Read the line that starts “Not constrained”.'],
      because:
        'The circular model is refused. Its chi-square is 5225 for 19 degrees of freedom: the positions miss it by about sixteen of their own error bars each. The orbit is eccentric, and the data say so.',
      tool: BO({ n: 12, model: 1 }),
    },
    {
      sid: 'the-elliptical-fit',
      stage: STAGE,
      type: 'measure',
      title: 'The elliptical orbit',
      body: `Set <strong>Orbit model</strong> to elliptical, with all twelve epochs. Read the
             period, the semi-major axis and the eccentricity.`,
      fields: [
        { id: 'P', label: 'Period', unit: 'yr', hint: '14.13' },
        { id: 'a', label: 'Semi-major axis', unit: 'arcsec', hint: '0.908' },
        { id: 'e', label: 'Eccentricity', unit: '', hint: '0.443' },
      ],
      validate: v => {
        if (![v.P, v.a, v.e].every(Number.isFinite)) return null;
        if (
          near(v.P, 14.13, 0.15) &&
          near(v.a, 0.908, 0.02) &&
          near(v.e, 0.443, 0.02)
        ) {
          return {
            level: 'ok',
            message:
              'A period of 14.13 ± 0.06 years, a semi-major axis of 0.908 ± 0.008 arcseconds and an eccentricity of 0.443 ± 0.008, with a chi-square of 17.9 for 17 degrees of freedom: the residuals are now what the errors allow.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose the elliptical orbit with 12 epochs, then read “Period”, “Semi-major axis” and “Eccentricity”.',
        };
      },
      tool: BO({ n: 12, model: 0 }),
    },
    {
      sid: 'from-arcseconds-to-au',
      stage: STAGE,
      type: 'question',
      kind: 'numeric',
      title: 'The orbit in astronomical units',
      body: `The binary&rsquo;s parallax, relative to its reference stars, is 100 mas: 0.100
             arcsecond. Turn the semi-major axis of 0.908 arcseconds into astronomical units.`,
      prompt: 'The semi-major axis',
      unit: 'AU',
      answer: 9.08,
      tolerance: 0.1,
      hints: [
        'a in au is a in arcseconds divided by the parallax in arcseconds.',
      ],
      worked:
        '0.908 ÷ 0.100 = 9.08 au. At 10 parsecs one arcsecond is 10 au, so the orbit’s 0.908 arcsecond is 9.08 au, a little more than the distance from the Sun to Saturn.',
      feedback: {
        close: 'Close. Divide the angle by the parallax, both in arcseconds.',
        'wrong-order-of-magnitude':
          'A power of ten out: divide by 0.100 arcsecond, not by 100.',
        off: 'a (arcseconds) ÷ parallax (arcseconds).',
      },
      tool: BO({ n: 12, model: 0 }),
    },
    {
      sid: 'the-mass-sum',
      stage: STAGE,
      type: 'measure',
      title: 'The mass of the pair',
      body: `With the parallax at 100 mas, read the mass sum and its 68 percent interval.
             The interval comes from the orbit&rsquo;s uncertainty and the parallax&rsquo;s, 4 mas,
             together.`,
      fields: [
        { id: 'm', label: 'Mass sum', unit: 'M_sun', hint: '3.76' },
        {
          id: 'lo',
          label: 'Mass sum, low end of the 68 percent interval',
          unit: 'M_sun',
          hint: '3.33',
        },
        {
          id: 'hi',
          label: 'Mass sum, high end of the 68 percent interval',
          unit: 'M_sun',
          hint: '4.25',
        },
      ],
      validate: v => {
        if (![v.m, v.lo, v.hi].every(Number.isFinite)) return null;
        if (
          near(v.m, 3.76, 0.06) &&
          near(v.lo, 3.33, 0.08) &&
          near(v.hi, 4.25, 0.1)
        ) {
          return {
            level: 'ok',
            message:
              'The two stars together weigh about 3.8 solar masses, between 3.3 and 4.2 at 68 percent. The interval is lopsided and wide, because the mass goes as the cube of the distance and the parallax is known to 4 percent.',
          };
        }
        return {
          level: 'error',
          message:
            'Use the elliptical orbit with 12 epochs and the parallax at 100 mas, then read “Mass sum” and its 68 percent interval.',
        };
      },
      tool: BO({ n: 12, model: 0 }, []),
    },
    {
      sid: 'six-epochs',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Only the first six epochs',
      body: `Set <strong>Epochs used</strong> to 6 with the elliptical model. The first six epochs
             cover seven years of a fourteen-year orbit.`,
      prompt: 'What does the tool report?',
      options: [
        'The same orbit with larger error bars',
        'Not constrained: an elliptical orbit needs at least eight epochs, so it gives no orbit',
        'A circular orbit instead, because the arc is short',
        'The period only, since that is the best-fixed element',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'larger-bars',
          option: 0,
          say: 'With six positions the seven elements are not all fixed, so there is no orbit to put bars on.',
        },
        {
          id: 'fallback',
          option: 2,
          say: 'The tool does not switch to a model the data reject. A circular fit of this binary is refused too.',
        },
      ],
      hints: ['Read the line that starts “Not constrained”.'],
      because:
        'Not constrained. An elliptical orbit has seven parameters and needs at least eight epochs, covering enough of the period; six give nothing. As with the star, the refusal is the answer.',
      tool: BO({ n: 6, model: 0 }),
    },
    {
      sid: 'say-what-the-sum-needs',
      stage: STAGE,
      type: 'question',
      kind: 'short',
      rubric:
        'Full credit for saying that the positions fix only the sum of the two masses, not each (it takes the stars’ motion about their common center, or radial velocities, to split it), and that the sum depends on the distance cubed, so the parallax and its frame (relative, so the distance and the sum read high) carry into the mass. Do not credit saying that the sum is exact or that the interval is only the orbit’s.',
      title: 'What the sum needs',
      body: `The mass sum came from an orbit and a parallax, each with an uncertainty.`,
      prompt:
        'In two or three sentences: what do the positions not tell you about the masses, and which input of the sum is the most dangerous to get wrong?',
      tool: BO({ n: 12, model: 0 }),
    },
    {
      sid: 'what-you-worked-out',
      stage: STAGE,
      type: 'read',
      title: 'What you worked out',
      body: `Twelve positions over sixteen years fixed an orbit: a period of 14.13 &plusmn;
             0.06 years, a semi-major axis of 0.908 arcseconds and an eccentricity of
             0.44. A circle was refused outright, and six epochs gave nothing. With a
             parallax of 100 mas the orbit is 9.08 au across and the pair weighs about 3.8
             solar masses, between 3.3 and 4.2 at 68 percent. Positions fix only the sum, and
             the sum is the cube of the distance: the parallax is the weakest link. The data
             were synthetic, made with a period of 14.2 years, an eccentricity of 0.45, a
             semi-major axis of 0.9 arcseconds and a parallax of 100 mas, and the fit holds
             them.`,
      tool: BO({ n: 12, model: 0 }),
    },
  ],
};

// -----------------------------------------------------------------------------
// The Jupiter investigation (Prompt 193): one more lesson in this file, on the
// Jupiter-moons instruments (js/jovianWidgets.js). Same rules as above: every
// number a step states is recomputed in tests/galileanMoons.test.js from the
// kernel in js/satellites/ and the pack sky/galilean-moons.json.
// -----------------------------------------------------------------------------
const JF = (values = {}, hide = []) => ({ id: 'moon-frames', values, hide });
const JP = (values = {}, hide = []) => ({ id: 'moon-fit', values, hide });

// -----------------------------------------------------------------------------
// 7. Weighing Jupiter From Its Moons
// -----------------------------------------------------------------------------
export const WEIGHING_JUPITER = {
  id: 'weighing-jupiter',
  thumbnail: 'images/investigations/weighing-jupiter.webp',
  title: 'Weighing Jupiter From Its Moons',
  subtitle:
    'Four moons, a cadence that can measure them, and Kepler’s third law',
  duration: '25-40 min',
  level: 'Introductory to upper-level astronomy',
  audience: 'intro',
  textbook: { chapter: 12, section: '12.2' },
  courseLevel: 'majors',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'algebra',
  prerequisites: ['a-binary-stars-orbit'],
  tags: ['observing'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Identify the four Galilean moons night by night, with the ephemeris as the check, and read how far each stands from Jupiter',
    'Find a moon’s period and orbit radius from a sinusoid fitted to its distances over time',
    'Say why a frame once a night cannot give Io’s period, and what sampling can',
    'Turn a period and a radius into Jupiter’s mass with Kepler’s third law, and say what the uncertainty includes',
  ],
  steps: [
    {
      sid: 'a-sequence-of-frames',
      stage: STAGE,
      type: 'read',
      title: 'Jupiter and four points of light',
      body: `Through binoculars Jupiter has four small companions in a line: Io, Europa,
             Ganymede and Callisto, the moons Galileo saw in January 1610. This
             investigation measures them. The frames here are <strong>synthetic</strong>: no
             picture of Jupiter was observed for this lesson. Each was made from the
             moons&rsquo; real positions on the nights of 20 November to 30 December 2025
             (JPL Horizons, satellite ephemeris JUP365), then given Jupiter&rsquo;s disk, the
             moons&rsquo; brightness, atmospheric blur and detector noise. For a real picture
             of the moons, see NASA&rsquo;s Jupiter moons page, science.nasa.gov/jupiter/moons.
             \n\nEast is to the right and Jupiter&rsquo;s equator is horizontal. There are 51
             frames: three long nights of hourly frames, 5 to 7 December, and one frame
             a night, at 08:00 UT, on the other nights. Turn the overlay on to see where
             the ephemeris puts each moon: it is the check on who is who.`,
      tool: JF({ frame: 13, overlay: 1 }),
    },
    {
      sid: 'which-moon-is-farthest',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Who is who?',
      body: `Frame 13 is the night of 4 December. Four moons stand in a line with the
             overlay on, I, E, G and C.`,
      prompt: 'In frame 13, which moon is farthest from Jupiter?',
      options: ['Io', 'Europa', 'Ganymede', 'Callisto'],
      answer: 3,
      misconceptions: [
        {
          id: 'brightest',
          option: 2,
          say: 'Ganymede is the brightest and the biggest, but brightness does not say how far it stands. Read each moon’s distance from Jupiter in the readout.',
        },
      ],
      hints: [
        'The readout lists each moon’s distance east or west of Jupiter.',
      ],
      because:
        'Callisto, 26.3 Jupiter radii east of Jupiter. The overlay and the measured positions agree: the farther out a moon orbits, the farther it can stand from Jupiter, and Callisto is the outermost.',
      tool: JF({ frame: 13, overlay: 1 }),
    },
    {
      sid: 'how-fast-does-ganymede-move',
      stage: STAGE,
      type: 'measure',
      title: 'How far does a moon move in an hour?',
      body: `Frames 14 to 34 are hourly, over three nights. Set the frame to <strong>14</strong>
             (06:00 UT on 5 December) and read how far Ganymede is from Jupiter, in
             Jupiter radii. Then set the frame to <strong>16</strong>, two hours later, and read
             it again. Enter the first distance, and how far it moved in the two hours.`,
      fields: [
        {
          id: 'd14',
          label: 'Ganymede’s distance from Jupiter in frame 14',
          unit: 'R',
          hint: '9.7',
        },
        {
          id: 'move',
          label: 'How far it moved between frame 14 and frame 16',
          unit: 'R',
          hint: '0.9',
        },
      ],
      validate: v => {
        if (![v.d14, v.move].every(Number.isFinite)) return null;
        if (near(v.d14, 9.66, 0.25) && near(v.move, 0.89, 0.2)) {
          return {
            level: 'ok',
            message:
              'About 9.7 Jupiter radii west of Jupiter, and 0.9 radii closer after two hours, about 0.45 an hour. A moon that moves this far in an hour is changing visibly between the nights, which matters in a moment.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the frame to 14, read the distance in the Ganymede row, then set the frame to 16 and subtract.',
        };
      },
      tool: JF({ frame: 14, overlay: 1 }),
    },
    {
      sid: 'io-period-and-radius',
      stage: STAGE,
      type: 'measure',
      title: 'Io’s period and its distance',
      body: `Every frame gives one measured distance for each moon. The instrument has
             collected them: Io&rsquo;s distance from Jupiter against time, with the
             sinusoid that fits best. Leave the sampling at <strong>1</strong>, the designed
             sequence, and read Io&rsquo;s <strong>period</strong> in days and its
             <strong>amplitude</strong> in Jupiter radii. The amplitude is Io&rsquo;s greatest
             distance from Jupiter, which for a circular orbit seen edge on is the radius
             of the orbit.`,
      fields: [
        { id: 'period', label: 'Io’s period', unit: 'd', hint: '1.77' },
        {
          id: 'radius',
          label: 'Io’s orbit radius',
          unit: 'R',
          hint: '5.9',
        },
      ],
      validate: v => {
        if (![v.period, v.radius].every(Number.isFinite)) return null;
        if (near(v.period, 1.768, 0.01) && near(v.radius, 5.89, 0.1)) {
          return {
            level: 'ok',
            message:
              'Io goes round in 1.768 days, at 5.89 Jupiter radii, about 421,000 km from Jupiter’s center. The period is the one the Earth sees, and it is the next steps’ question how it differs from the true one.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose Io (1) with the designed sampling (1), then read “Period” and “Amplitude”.',
        };
      },
      tool: JP({ moon: 1, cadence: 1 }),
    },
    {
      sid: 'once-a-night',
      stage: STAGE,
      type: 'predict',
      reveal: 'try-once-a-night',
      title: 'What if you had one frame a night?',
      body: `Most observers watching Jupiter take one frame a night, at the same time.
             Io goes round in 1.77 days. Take only the 30 once-a-night frames and ask for
             Io&rsquo;s period, searching the periods an observer would, longer than two
             days.`,
      prompt:
        'The period found for Io from once-a-night frames would be&hellip;',
      options: [
        'about 1.77 days, the true one',
        'about 0.9 days, half the true one',
        'about 2.3 days, a period that is not Io’s',
        'no period at all: the points would scatter',
      ],
      answer: 2,
      hints: [
        'A frame a day cannot follow a moon that goes round in under two days. What would it see instead?',
      ],
      because:
        'About 2.3 days. A frame every day sees the moon at 0.565 turns a day as if it went round at 1 − 0.565 = 0.435 turns a day, a period of 2.30 days, and nothing in the frames says which is right. The next step shows it.',
      tool: JP({ moon: 1, cadence: 0 }),
    },
    {
      sid: 'try-once-a-night',
      stage: STAGE,
      type: 'measure',
      title: 'Io from one frame a night',
      body: `Set the sampling to <strong>0</strong>: once a night, with the periods searched
             longer than 2 days. Read Io&rsquo;s period.`,
      fields: [
        {
          id: 'period',
          label: 'Io’s period from once-a-night frames',
          unit: 'd',
          hint: '2.30',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.period)) return null;
        if (near(v.period, 2.3017, 0.03)) {
          return {
            level: 'ok',
            message:
              'A clean 2.30-day sinusoid, 30 percent longer than Io’s real 1.77 days, with a good fit: the alias of Io’s period. Europa, Ganymede and Callisto have periods longer than two days, so the same sampling gets them right. Only the hourly frames, which see Io move within a night, tell the alias from the moon.',
          };
        }
        return {
          level: 'error',
          message: 'Choose Io (1), set the sampling to 0, then read “Period”.',
        };
      },
      tool: JP({ moon: 1, cadence: 0 }),
    },
    {
      sid: 'what-you-worked-out',
      stage: STAGE,
      type: 'read',
      title: 'What you worked out',
      body: `You identified the moons with the ephemeris as the check, watched Ganymede
             move 0.9 Jupiter radii in two hours, and fitted Io: 1.77 days at 5.9
             Jupiter radii. And you saw why the cadence matters: sampled once a night,
             Io gives a clean answer, 2.3 days, which is wrong. The hourly nights are what
             make Io measurable. The frames were synthetic, made from the moons&rsquo; real
             positions; a real night would add clouds, drift and bad pixels. The deeper
             steps weigh Jupiter with these periods and radii.`,
      tool: JP({ moon: 1, cadence: 1 }),
    },
  ],
};

/** The lessons, in order: what the barrel registers. */
export default [
  WHAT_IS_A_MEASUREMENT,
  WHAT_DOES_PLUS_MINUS_CLAIM,
  WHEN_THE_METHOD_MUST_REFUSE,
  MEASURING_THE_MOON,
  HOW_FAR_IS_THAT_STAR,
  A_BINARY_STARS_ORBIT,
  WEIGHING_JUPITER,
];
