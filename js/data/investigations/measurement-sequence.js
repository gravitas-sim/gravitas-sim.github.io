// =============================================================================
// The measurement and claim investigations (Prompt 190)
// -----------------------------------------------------------------------------
// Three short investigations on synthetic truth, in one module (Prompt 195 adds three
// crater investigations at the end, D-R10-85): "What Is a
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
// 7. Which surface is older? (Prompt 195, CRATER_COUNTING.md; the crater
//    instruments in js/craterWidgets.js, D-R10-85)
// -----------------------------------------------------------------------------
// Three more investigations, appended here and not in a file of their own
// because the instructor bundle's closure is capped by file count (D-R10-85).
// Every number is recomputed in tests/craterLessons.test.js from the kernel
// (js/measure/craters.js) and the committed regions (frames/craters-regions.json):
// the circles are a catalog's, made by its authors, and nobody has marked these
// pictures. No age in years is computed anywhere (Prompt 196's gate).
const CRG = (values = {}, hide = []) => ({
  id: 'crater-regions',
  values,
  hide,
});
const CSF = (values = {}, hide = []) => ({
  id: 'crater-sfd',
  values,
  hide,
});
const CBD = (values = {}, hide = []) => ({
  id: 'crater-budget',
  values,
  hide,
});

export const WHICH_SURFACE_IS_OLDER = {
  id: 'which-surface-is-older',
  thumbnail: 'images/investigations/which-surface-is-older.webp',
  title: 'Which Surface Is Older?',
  subtitle:
    'Craters per area in two regions of the Moon and of Mars, and the ratio that says which is older',
  duration: '15-25 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 9, section: '9.2' },
  courseLevel: 'survey',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'arithmetic',
  prerequisites: [],
  tags: ['solar-system', 'observing'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Say why craters per area, and not craters, say which of two surfaces is older',
    'Count the craters above one diameter in two regions, find each density with its interval, and predict which is older before reading the ratio',
    'Read a density ratio and its interval, and say what an interval that holds 1 does and does not mean',
    'Name what can make a surface look older or younger than it is: resurfacing, saturation and secondary craters',
  ],
  steps: [
    {
      sid: 'two-surfaces',
      stage: STAGE,
      type: 'read',
      title: 'Two surfaces, one clock',
      body: `A surface starts with no craters and collects them as it is hit. If the
             rate of impacts is about the same everywhere, a surface that has had longer
             to collect them has more craters <strong>per area</strong>. That is the
             idea behind counting craters: the density of craters says which of two
             surfaces is <strong>older</strong>, relative to the other.
             \n\nThe instrument shows two regions of the Moon (a highland and a dark,
             smooth mare) and two of Mars. The circles on the pictures are the craters
             that a <strong>catalog</strong> lists, made by its authors from other data.
             Nobody has marked these pictures, and nothing here is a count you made. What
             you do is choose a diameter, read the numbers, and say what they do and do not
             show. A density ratio is <em>not</em> an age in years.`,
      tool: CRG({ pair: 0, view: 0, dmin: 30 }),
    },
    {
      sid: 'which-is-older-predict',
      stage: STAGE,
      type: 'predict',
      reveal: 'count-the-moon',
      title: 'Which has more?',
      body: `Think about two regions of the Moon: a bright, rough highland in the south, and the dark,
             smooth Mare Tranquillitatis. Count only craters at least 30 km across.`,
      prompt: 'Per area, the highland will have&hellip;',
      options: [
        'about the same density of craters as the mare',
        'a much higher density of craters than the mare',
        'a much lower density of craters than the mare, because the mare is the larger region',
        'a higher density only if it is the larger region: density is just the count',
      ],
      answer: 1,
      hints: [
        'Dark maria are lava that flooded the low ground long after the highlands formed. What does fresh lava do to the craters under it?',
      ],
      because:
        'A much higher density. Lava buried the craters that were already there on the mare, so it started counting again from the flood, while the highland has been counting since much earlier. The next step reads the counts.',
    },
    {
      sid: 'count-the-moon',
      stage: STAGE,
      type: 'measure',
      title: 'Count the craters at least 30 km across',
      body: `Choose the <strong>Moon</strong> and set the diameter to <strong>30 km</strong>. Read how many
             craters at least 30 km across the highland has, and how many the mare has.`,
      fields: [
        {
          id: 'highland',
          label: 'Craters in the lunar highland',
          hint: '40',
        },
        {
          id: 'mare',
          label: 'Craters in the lunar mare',
          hint: '7',
        },
      ],
      validate: v => {
        if (![v.highland, v.mare].every(Number.isFinite)) return null;
        if (v.highland === 40 && v.mare === 7) {
          return {
            level: 'ok',
            message:
              'Forty and seven. The highland has about six times as many, but the regions are not the same size, so the count alone is not the comparison: it has to be per area.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose the Moon, set “Count craters at least” to 30 km and read the number of craters in each region.',
        };
      },
      tool: CRG({ pair: 0, view: 0, dmin: 30, circles: 1 }),
    },
    {
      sid: 'per-area',
      stage: STAGE,
      type: 'measure',
      title: 'Per million square kilometers',
      body: `The highland covers about 305 thousand km² and the mare about 341 thousand, so the
             counts are not on the same footing. Read the <strong>density</strong> of each, in
             craters per million km², from the two region rows.`,
      fields: [
        {
          id: 'highland',
          label: 'Highland density, per million km²',
          hint: '131.2',
        },
        {
          id: 'mare',
          label: 'Mare density, per million km²',
          hint: '20.5',
        },
      ],
      validate: v => {
        if (![v.highland, v.mare].every(Number.isFinite)) return null;
        if (near(v.highland, 131.2, 0.6) && near(v.mare, 20.5, 0.3)) {
          return {
            level: 'ok',
            message:
              '131.2 and 20.5 per million km². Each comes with a 95 percent Poisson interval, 93.7 to 178.6 for the highland and 8.3 to 42.3 for the mare: a count is itself uncertain, because chance decides how many craters landed in an area.',
          };
        }
        return {
          level: 'error',
          message:
            'Keep the Moon at 30 km and read the number “per million km²” in each of the two region rows.',
        };
      },
      tool: CRG({ pair: 0, view: 0, dmin: 30, circles: 1 }),
    },
    {
      sid: 'ratio-moon',
      stage: STAGE,
      type: 'measure',
      title: 'How much denser, and how sure?',
      body: `Read the <strong>density ratio</strong>, highland over mare, and the <strong>lower
             end of its 95 percent interval</strong>. The interval is computed exactly from the
             two counts (a Clopper&ndash;Pearson interval on the share of craters that fall in the
             highland).`,
      fields: [
        {
          id: 'ratio',
          label: 'Density ratio, highland over mare',
          hint: '6.39',
        },
        { id: 'lo', label: 'Lower end of the interval', hint: '2.83' },
      ],
      validate: v => {
        if (![v.ratio, v.lo].every(Number.isFinite)) return null;
        if (near(v.ratio, 6.39, 0.1) && near(v.lo, 2.83, 0.1)) {
          return {
            level: 'ok',
            message:
              'The ratio is 6.39 and the interval runs from 2.83 to 16.9. The whole interval is above 1, so the highland is denser, and the instrument says so. How much denser is far less certain: anywhere from under three times to nearly seventeen.',
          };
        }
        return {
          level: 'error',
          message:
            'Stay on the Moon at 30 km and read “Density ratio, first over second”: the first number, then the lower end of the interval in brackets.',
        };
      },
      tool: CRG({ pair: 0, view: 0, dmin: 30, circles: 1 }),
    },
    {
      sid: 'reading-the-interval',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'What does the interval say?',
      body: `The ratio is 6.4, with an interval from 2.8 to 16.9.`,
      prompt: 'Which statement is the best reading?',
      options: [
        'The highland is denser than the mare; how much denser is uncertain by a factor of about six',
        'The highland is 6.4 times older than the mare, in years',
        'The interval is so wide that the counts tell us nothing',
        'The ratio is 6.4, and the interval is only the uncertainty of the area',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'years',
          option: 1,
          say: 'A density ratio is not a ratio of ages in years. Craters accumulate at a rate that has changed, and turning a density into years needs a chronology and corrections this investigation does not apply.',
        },
        {
          id: 'useless',
          option: 2,
          say: 'The interval excludes 1, and that is a finding: the two densities differ. A wide interval limits the size of the difference, not its direction.',
        },
        {
          id: 'area',
          option: 3,
          say: 'The interval is the chance variation in how many craters landed in each area. The areas have their own, smaller uncertainty, which is not in it.',
        },
      ],
      hints: [
        'The interval holds the ratios that the counts cannot rule out. Is 1 one of them?',
      ],
      because:
        'The interval does not contain 1, so the highland is denser. Its width, from 2.8 to 16.9, is the honest uncertainty of a count of 40 and a count of 7.',
      tool: CRG({ pair: 0, view: 0, dmin: 30, circles: 1 }),
    },
    {
      sid: 'mars-pair',
      stage: STAGE,
      type: 'measure',
      title: 'The same question on Mars',
      body: `Switch to <strong>Mars</strong>: a highland (Terra Sabaea) and young lava plains
             (Elysium Planitia), 12&deg; by 12&deg; each. On Mars the count is complete from
             20 km, so set the diameter to <strong>20 km</strong>. Read the density ratio, highland over
             plains, and the lower end of its interval.`,
      fields: [
        {
          id: 'ratio',
          label: 'Density ratio, highland over plains',
          hint: '6.50',
        },
        { id: 'lo', label: 'Lower end of the interval', hint: '3.68' },
      ],
      validate: v => {
        if (![v.ratio, v.lo].every(Number.isFinite)) return null;
        if (near(v.ratio, 6.5, 0.1) && near(v.lo, 3.68, 0.1)) {
          return {
            level: 'ok',
            message:
              'The ratio is 6.50, from 91 and 14 craters, with an interval from 3.68 to 12.4. The same finding on another world: the highland is denser. The Martian interval is narrower than the lunar one because more craters were counted.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose Mars, set “Count craters at least” to 20 km and read “Density ratio, first over second”.',
        };
      },
      tool: CRG({ pair: 1, view: 0, dmin: 20, circles: 1 }),
    },
    {
      sid: 'fewer-craters',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'When the verdict is “no significant difference”',
      body: `Raise the diameter on Mars to 60 km. Only 12 highland craters and 4 plains craters are
             that large, and the instrument now reads a ratio of 3.0 with an interval from 0.91 to 12.8,
             and the verdict &ldquo;no significant difference&rdquo;.`,
      prompt: 'What does that verdict mean?',
      options: [
        'The two surfaces have the same age',
        'These counts, at this diameter, cannot tell the two apart: the interval holds 1',
        'The count at 60 km is wrong, because the verdict at 20 km was different',
        'The plains are older, because 4 is a smaller number than 12',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'same',
          option: 0,
          say: '“No significant difference” is not a finding of equality. The interval from 0.91 to 12.8 includes ratios near 1 and ratios near 13: the counts leave all of them open.',
        },
        {
          id: 'wrong',
          option: 2,
          say: 'Both are right. Raising the diameter keeps the largest craters only, so there are fewer of them and the interval is wider. The verdict at 20 km was drawn from 105 craters, this one from 16.',
        },
      ],
      hints: ['How many craters is the ratio drawn from now?'],
      because:
        'The interval, from 0.91 to 12.8, holds 1. With 12 and 4 craters, chance alone can give a ratio of 3 from two equally old surfaces. Counting down to smaller craters, where there are more of them, is what narrows the interval again.',
      tool: CRG({ pair: 1, view: 0, dmin: 60, circles: 1 }),
    },
    {
      sid: 'what-can-go-wrong',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'What could make a surface look older than it is?',
      body: `A density ratio assumes that craters landed independently, at a steady rate, and stayed.
             Real surfaces break these assumptions. One large impact throws out debris that digs thousands
             of small <strong>secondary craters</strong> nearby, all at once.`,
      prompt:
        'If those secondaries are counted as ordinary craters, the surface will look&hellip;',
      options: [
        'older than it is: it has more craters than its own impact history made',
        'younger than it is: so many craters overlap that they erase each other',
        'no different, because small craters count the same as large ones',
        'no different, because the Poisson interval already allows for it',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'saturation',
          option: 1,
          say: 'Erasing craters is saturation, which makes a very old surface look younger than it is: new craters destroy older ones, and the count stops growing. Secondaries do the opposite.',
        },
        {
          id: 'small',
          option: 2,
          say: 'Small craters do not count the same: they are the ones most affected by secondaries and by saturation, and the hardest to see completely. That is why a count is made above a diameter at which it is complete.',
        },
        {
          id: 'poisson',
          option: 3,
          say: 'The interval allows for chance in the number of independent craters. Secondaries are not independent: they arrive in clusters, and the interval is then too narrow.',
        },
      ],
      hints: [
        'A secondary crater is made by a piece of one large impact, not by an impact of its own.',
      ],
      because:
        'Older than it is. Resurfacing hides old craters and makes a surface look younger; saturation does the same; secondaries add craters that are not independent and make it look older. A relative age rests on none of them having happened, and says so.',
      tool: CRG({ pair: 0, view: 0, dmin: 30, circles: 1 }),
    },
    {
      sid: 'what-you-worked-out',
      stage: STAGE,
      type: 'read',
      title: 'What you worked out',
      body: `Above 30 km the lunar highland has 131 craters per million km² and the mare 20.5, a ratio
             of 6.4 with a 95 percent interval from 2.8 to 17: the highland is the denser. On Mars above
             20 km the highland is 6.5 times the plains, from 3.7 to 12.4. Raise the diameter and the counts
             fall and the intervals widen, until on Mars at 60 km the verdict becomes &ldquo;no significant
             difference&rdquo;, which is not the same as &ldquo;the same age&rdquo;. The ratio is not an age
             in years: it assumes one production function, no saturation, no large share of secondaries and
             a count that is complete. The deeper steps look at how the interval depends on the diameter,
             and at what the instrument refuses.`,
      tool: CRG({ pair: 0, view: 0, dmin: 30, circles: 1 }),
    },
  ],
};

// -----------------------------------------------------------------------------
// 8. Craters by size
// -----------------------------------------------------------------------------
export const CRATERS_BY_SIZE = {
  id: 'craters-by-size',
  thumbnail: 'images/investigations/craters-by-size.webp',
  title: 'Craters by Size',
  subtitle:
    'The size-frequency plot with its error bars, the slope with its interval, and a count that stops short',
  duration: '10-20 min',
  level: 'Majors and upper-level astronomy',
  audience: 'intro',
  textbook: { chapter: 9, section: '9.2' },
  courseLevel: 'majors',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'algebra',
  prerequisites: ['which-surface-is-older'],
  tags: ['solar-system', 'observing'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Read a cumulative size-frequency plot: the number of craters at least as large as D, per area, with a Poisson interval on each point',
    'Find the slope of a power law, with its interval, and say how the number of craters in the fit sets the width of the interval',
    'Show that a count that stops short at small diameters bends the plot, and say what the flag on the slope does and does not tell you',
    'Say why the slope of the plot and the level of the plot answer different questions',
  ],
  steps: [
    {
      sid: 'a-plot-of-counts',
      stage: STAGE,
      type: 'read',
      title: 'A plot of how many, at least this big',
      body: `Small craters are many and large craters are few. The <strong>cumulative</strong>
             size-frequency plot counts, for each diameter <em>D</em>, all the craters at least
             that large, per area. Both axes are logarithmic, so a power law
             <em>N</em>(≥<em>D</em>) ∝ <em>D</em><sup>&minus;<em>b</em></sup> is a straight line
             whose slope is &minus;<em>b</em>. Each point carries a 95 percent Poisson interval:
             a count is uncertain because chance decides how many craters landed.
             \n\nThe craters are a catalog&rsquo;s, not marks on the picture. A dashed line is the
             power law fitted above the diameter you choose, and the readout gives its index <em>b</em> with
             an interval. Below the diameter at which the count is <em>complete</em>, points are drawn
             in a different color and are not trusted.`,
      tool: CSF({ region: 0, dmin: 30, miss: 0 }, ['miss']),
    },
    {
      sid: 'highland-slope',
      stage: STAGE,
      type: 'measure',
      title: 'The slope of the lunar highland',
      body: `Choose the <strong>lunar highland</strong> and fit craters at least <strong>30 km</strong>
             across, the diameter above which its count is complete. Read the cumulative index
             <em>b</em> and the two ends of its 95 percent interval.`,
      fields: [
        { id: 'b', label: 'Index b', hint: '1.71' },
        { id: 'lo', label: 'Lower end of the interval', hint: '1.22' },
        { id: 'hi', label: 'Upper end of the interval', hint: '2.28' },
      ],
      validate: v => {
        if (![v.b, v.lo, v.hi].every(Number.isFinite)) return null;
        if (
          near(v.b, 1.71, 0.03) &&
          near(v.lo, 1.22, 0.03) &&
          near(v.hi, 2.28, 0.03)
        ) {
          return {
            level: 'ok',
            message:
              'An index of 1.71, from 1.22 to 2.28, from 40 craters. For a power law the cumulative count falls as D to the power minus 1.7: doubling the diameter leaves about 30 percent as many craters.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose the lunar highland, set “Fit craters at least” to 30 km and leave the count as given. Read the index and the two ends of its 95 percent interval.',
        };
      },
      tool: CSF({ region: 0, dmin: 30, miss: 0 }, ['miss']),
    },
    {
      sid: 'narrower-predict',
      stage: STAGE,
      type: 'predict',
      reveal: 'mars-slope',
      title: 'Whose slope is better known?',
      body: `The lunar highland gave an index with an interval 1.06 wide, from 40 craters. The Martian
             highland has 91 craters at least 20 km across, the diameter above which its count is
             complete.`,
      prompt: 'The interval of the Martian highland’s index will be&hellip;',
      options: [
        'wider, because Martian craters are harder to measure',
        'narrower, because there are more craters in the fit',
        'the same, because a slope is a slope whatever it is fitted to',
        'impossible to say without the slope',
      ],
      answer: 1,
      hints: ['What sets how well a maximum-likelihood fit knows its slope?'],
      because:
        'Narrower. The interval of an index from n craters shrinks roughly as one over the square root of n, so 91 craters know the slope better than 40. The next step reads it.',
    },
    {
      sid: 'mars-slope',
      stage: STAGE,
      type: 'measure',
      title: 'The slope of the Martian highland',
      body: `Choose the <strong>Martian highland</strong> and fit craters at least
             <strong>20 km</strong> across. Read the two ends of the interval of its index.`,
      fields: [
        { id: 'lo', label: 'Lower end of the interval', hint: '1.39' },
        { id: 'hi', label: 'Upper end of the interval', hint: '2.09' },
      ],
      validate: v => {
        if (![v.lo, v.hi].every(Number.isFinite)) return null;
        if (near(v.lo, 1.39, 0.03) && near(v.hi, 2.09, 0.03)) {
          return {
            level: 'ok',
            message:
              'The index is 1.72, from 1.39 to 2.09: an interval about 0.7 wide, against 1.06 on the Moon. The two highlands have the same slope to within what their counts can say.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose the Martian highland (2), set “Fit craters at least” to 20 km and read the two ends of the interval of the index.',
        };
      },
      tool: CSF({ region: 2, dmin: 20, miss: 0 }, ['miss']),
    },
    {
      sid: 'thin-mare',
      stage: STAGE,
      type: 'measure',
      title: 'A slope from seven craters',
      body: `Choose the <strong>lunar mare</strong>, fitted from <strong>30 km</strong>. Only seven craters are
             that large. Read its index and the upper end of its interval.`,
      fields: [
        { id: 'b', label: 'Index b', hint: '3.47' },
        { id: 'hi', label: 'Upper end of the interval', hint: '6.47' },
      ],
      validate: v => {
        if (![v.b, v.hi].every(Number.isFinite)) return null;
        if (near(v.b, 3.47, 0.05) && near(v.hi, 6.47, 0.08)) {
          return {
            level: 'ok',
            message:
              'An index of 3.5, but the interval runs from 1.4 to 6.5. Seven craters fix a slope very loosely: this number is almost all uncertainty.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose the lunar mare (1), set “Fit craters at least” to 30 km and read the index and the upper end of its interval.',
        };
      },
      tool: CSF({ region: 1, dmin: 30, miss: 0 }, ['miss']),
    },
    {
      sid: 'does-mare-differ',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Is the mare’s slope different?',
      body: `The mare&rsquo;s index is 3.5, from 1.4 to 6.5. The lunar highland&rsquo;s is 1.7, from 1.2 to 2.3.`,
      prompt: 'What can you say?',
      options: [
        'The mare has proportionally fewer large craters: 3.5 is twice 1.7',
        'The two intervals overlap widely, so seven craters cannot separate the slopes',
        'The mare must be the older surface, because its slope is steeper',
        'The mare’s index is wrong, because it is above every published value',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'number',
          option: 0,
          say: 'An index is only as good as its interval. The interval from 1.4 to 6.5 includes 1.7, so a slope equal to the highland’s is not ruled out.',
        },
        {
          id: 'steeper',
          option: 2,
          say: 'The slope is the shape of the size distribution: how fast the counts fall with diameter. The level of the plot, how many craters there are in all, is what the age rests on. A steeper slope is not an older surface.',
        },
      ],
      hints: ['Does the highland’s 1.7 lie inside the mare’s interval?'],
      because:
        'The highland’s 1.7 lies inside the mare’s interval, which is wide because it rests on seven craters. The data neither show nor rule out a difference in slope.',
      tool: CSF({ region: 1, dmin: 30, miss: 0 }, ['miss']),
    },
    {
      sid: 'roll-off',
      stage: STAGE,
      type: 'measure',
      title: 'A count that stops short',
      body: `A count of a picture misses the small craters first. Choose the <strong>lunar highland</strong>,
             fit craters at least <strong>20 km</strong>, below its completeness limit of 30 km, and set
             <strong>A count that stops short</strong> to <strong>100 %</strong>: every crater under 30 km is
             left out of the list, as a count of the picture would miss it. Read the index and the
             <strong>z</strong> of the check on the slope higher up.`,
      fields: [
        { id: 'b', label: 'Index b', hint: '1.01' },
        {
          id: 'z',
          label: 'z of the check above twice the fit diameter',
          hint: '2.77',
        },
      ],
      validate: v => {
        if (![v.b, v.z].every(Number.isFinite)) return null;
        if (near(v.b, 1.01, 0.04) && near(v.z, 2.77, 0.1)) {
          return {
            level: 'ok',
            message:
              'An index of 1.0, against 1.56 with the list complete from 20 km, and a flag: above twice the fit diameter the index is 1.96, and z of 2.8 says the two slopes differ. The list made by leaving out small craters is no longer one power law.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose the lunar highland (0), set “Fit craters at least” to 20 km and “A count that stops short” to 100 %, then read the index and the z in the slope check.',
        };
      },
      tool: CSF({ region: 0, dmin: 20, miss: 100 }),
    },
    {
      sid: 'what-the-flag-says',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'What does the flag say?',
      body: `The instrument reports that the slope is not constant: the index above 40 km differs from the index
             of 1.0 fitted from 20 km.`,
      prompt: 'What should you conclude?',
      options: [
        'The surface really has few small craters, so 1.0 is its true slope',
        'The list does not follow one power law down to 20 km, so one index cannot describe it; the flag cannot say whether the cause is an incomplete count, saturation or a real break',
        'Nothing: small craters count the same as large ones, so the index is fine at any diameter',
        'The fit failed, because fewer than five craters were used',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'real',
          option: 0,
          say: 'Here the bend was made by leaving craters out, so the surface itself has not changed. A real roll-off from saturation or resurfacing would bend the plot in the same way, and the plot alone cannot say which.',
        },
        {
          id: 'small',
          option: 2,
          say: 'Small craters do not count the same: they are the most numerous and the hardest to count completely, and they are first to be lost to saturation. That is why the fit starts at a diameter where the count is complete.',
        },
      ],
      hints: ['What was done to the list before the fit?'],
      because:
        'The flag says the list is not one power law. It does not correct anything and it does not name a cause: a stopped-short count, saturation, resurfacing and a real change in the impactors can all bend the plot. The remedy is to fit only above the diameter where the count is complete.',
      tool: CSF({ region: 0, dmin: 20, miss: 100 }),
    },
    {
      sid: 'what-you-worked-out',
      stage: STAGE,
      type: 'read',
      title: 'What you worked out',
      body: `A cumulative size-frequency plot counts the craters at least as large as each diameter, per area, with a
             Poisson interval on every point. The lunar highland&rsquo;s slope is 1.71 from 1.22 to 2.28
             (40 craters) and the Martian highland&rsquo;s 1.72 from 1.39 to 2.09 (91 craters): more craters,
             a narrower interval. The mare&rsquo;s 3.5 from 7 craters is nearly all uncertainty. Leave out the
             small craters and the fit drops to 1.0 and the slope check flags it: the flag says a list is not one
             power law, not why. The roll-off is <em>not</em> corrected here. The deeper steps look at how the
             interval widens as the fit rises, and at why the fit is not a line drawn through the plotted points.`,
      tool: CSF({ region: 0, dmin: 30, miss: 0 }, ['miss']),
    },
  ],
};

// -----------------------------------------------------------------------------
// 9. What a crater diameter is worth
// -----------------------------------------------------------------------------
export const WHAT_A_CRATER_DIAMETER_IS_WORTH = {
  id: 'what-a-crater-diameter-is-worth',
  thumbnail: 'images/investigations/what-a-crater-diameter-is-worth.webp',
  title: 'What a Crater Diameter Is Worth',
  subtitle:
    'One circle on a map, the four terms of its uncertainty, and why no age in years is reported',
  duration: '10-20 min',
  level: 'Upper-level astronomy',
  audience: 'intro',
  textbook: { chapter: 9, section: null },
  courseLevel: 'upper',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'algebra',
  prerequisites: ['which-surface-is-older'],
  tags: ['solar-system', 'observing'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Turn a circle on a map into a diameter in kilometers, with the scale and the view stated',
    'Name the four terms of a diameter’s uncertainty (the scale, placing the circle, where the rim is, the view) and say which is largest',
    'Say why a correction larger than its own uncertainty is still a correction, and what leaving it out costs',
    'Say why this investigation reports a diameter and a density ratio but no age in years',
  ],
  steps: [
    {
      sid: 'a-circle-and-a-scale',
      stage: STAGE,
      type: 'read',
      title: 'From a circle to a diameter',
      body: `A diameter on a map is a length in pixels times the scale of the map. Here the map is a
             Clementine picture of the Moon&rsquo;s southern highlands at 2.02 km per pixel, and
             your circle has a <strong>center</strong> and a <strong>rim point</strong>. The instrument turns
             the circle&rsquo;s radius into kilometers, corrects for the view if you let it, and gives
             the diameter with four terms of its uncertainty: the scale, how well a hand places a circle, where
             the rim really is, and the view.
             \n\nThe map is a view of a sphere. Near the edge of the disc a circular crater is seen
             at a slant, and is squeezed along the direction toward the center of the disc. The instrument draws the
             ground circle as the ellipse it makes. The circle on the picture starts on one crater of the catalog,
             and the catalog&rsquo;s own circles can be shown to compare.`,
      tool: CBD({}, ['dmin', 'catalog', 'correct', 'recognition']),
    },
    {
      sid: 'read-the-diameter',
      stage: STAGE,
      type: 'measure',
      title: 'Read the diameter',
      body: `The circle is set on a large crater, with its rim point 25 pixels from the center, in the direction
             toward the center of the disc, and the view corrected. Read the <strong>diameter</strong> and its
             uncertainty.`,
      fields: [
        { id: 'D', label: 'Diameter', unit: 'km', hint: '112.0' },
        {
          id: 'sigma',
          label: 'Its uncertainty (one sigma)',
          unit: 'km',
          hint: '5.9',
        },
      ],
      validate: v => {
        if (![v.D, v.sigma].every(Number.isFinite)) return null;
        if (near(v.D, 112.0, 0.6) && near(v.sigma, 5.9, 0.3)) {
          return {
            level: 'ok',
            message:
              'A diameter of 112.0 km with an uncertainty of 5.9 km, 5.3 percent. The uncertainty is as large as it is for a reason the next steps take apart.',
          };
        }
        return {
          level: 'error',
          message:
            'Leave the circle as it is (center 113, 76; rim point 25 pixels away at 95 degrees; recognition 5 percent; view corrected) and read “Diameter”.',
        };
      },
      tool: CBD({}, ['dmin', 'catalog']),
    },
    {
      sid: 'largest-term-predict',
      stage: STAGE,
      type: 'predict',
      reveal: 'the-budget',
      title: 'Which term is largest?',
      body: `The uncertainty of the diameter is built from four terms: the scale of the map, how
             well the circle is placed, where the rim really is, and the view.`,
      prompt: 'For this circle, the largest term is&hellip;',
      options: [
        'the scale of the map',
        'how well the circle is placed',
        'where the rim really is, a fraction of the diameter that you set',
        'the view, because the crater is near the edge of the disc',
      ],
      answer: 2,
      hints: [
        'A hand places a point to a fraction of a pixel, and the circle is 50 pixels across. What fraction of the diameter is that?',
      ],
      because:
        'Where the rim is. A crater’s rim is a ridge, weathered and overlapped, and two careful people disagree about it by a few percent of the diameter. The placement of a hand and the scale are both much smaller, and the view is known well. The next step reads each term.',
    },
    {
      sid: 'the-budget',
      stage: STAGE,
      type: 'measure',
      title: 'The four terms',
      body: `Read the uncertainty from <strong>placing the circle</strong> and from <strong>where the rim
             is</strong>, each as a percentage of the diameter. The recognition term is yours: you set it to 5
             percent, and the instrument does not know better.`,
      fields: [
        {
          id: 'fit',
          label: 'Uncertainty from placing the circle',
          unit: '%',
          hint: '1.6',
        },
        {
          id: 'rim',
          label: 'Uncertainty from where the rim is',
          unit: '%',
          hint: '5.0',
        },
      ],
      validate: v => {
        if (![v.fit, v.rim].every(Number.isFinite)) return null;
        if (near(v.fit, 1.6, 0.1) && near(v.rim, 5.0, 0.1)) {
          return {
            level: 'ok',
            message:
              '1.6 and 5.0 percent. The scale term is 0.06 percent and the view term 0.06 percent: they add in quadrature to 5.3 percent, which is the 5.0 percent of the rim and little else. The largest term is the one the person sets, and it is the one that no measurement shrinks.',
          };
        }
        return {
          level: 'error',
          message:
            'Read “Uncertainty from placing the circle” and “Uncertainty from where the rim is”, as percentages.',
        };
      },
      tool: CBD({}, ['dmin', 'catalog']),
    },
    {
      sid: 'the-correction',
      stage: STAGE,
      type: 'measure',
      title: 'Leave the view out',
      body: `Switch <strong>Correct for the view</strong> off: the view is taken as straight down, and the
             circle is drawn round. Read the diameter and by how much, as a percentage, it falls.`,
      fields: [
        {
          id: 'D',
          label: 'Diameter without the correction',
          unit: 'km',
          hint: '101.1',
        },
        {
          id: 'pct',
          label: 'How much smaller than with it',
          unit: '%',
          hint: '9.8',
        },
      ],
      validate: v => {
        if (![v.D, v.pct].every(Number.isFinite)) return null;
        if (near(v.D, 101.1, 0.6) && near(v.pct, 9.8, 0.5)) {
          return {
            level: 'ok',
            message:
              '101.1 km, 9.8 percent less than 112.0. The correction changes the diameter by about ten percent, and its own uncertainty is 0.06 percent: leaving it out is a systematic error of nearly two of the circle’s own sigmas.',
          };
        }
        return {
          level: 'error',
          message:
            'Set “Correct for the view” to off and read the diameter; the percentage is (112.0 minus that diameter) over 112.0.',
        };
      },
      tool: CBD({ correct: 0 }, ['dmin', 'catalog']),
    },
    {
      sid: 'big-correction-small-uncertainty',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'A big correction, a small uncertainty',
      body: `The view changes the diameter by ten percent and adds 0.06 percent to its uncertainty.`,
      prompt: 'What does that say?',
      options: [
        'The correction is unimportant, because its uncertainty is tiny',
        'The correction is large and well known, so leaving it out would be a systematic error, not a small uncertainty',
        'The correction should be dropped, because the picture looks round without it',
        'The correction is as uncertain as the diameter, because both come from the same circle',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'tiny',
          option: 0,
          say: 'A small uncertainty in a correction says it is known well, not that it is small. A known, large effect has to be applied: leaving it out shifts every diameter the same way.',
        },
        {
          id: 'round',
          option: 2,
          say: 'The picture does look round because the squeeze is along one direction and mild at this place. The ellipse the instrument draws is the circle on the ground as the camera sees it.',
        },
      ],
      hints: [
        'How does the size of an effect differ from how well it is known?',
      ],
      because:
        'A correction can be large and certain. The view is fixed by where the crater is on the disc, which is known to a pixel. Leaving it out is not a larger error bar: it is a wrong answer by about ten percent, every time, in the same direction.',
      tool: CBD({ correct: 1 }, ['dmin', 'catalog']),
    },
    {
      sid: 'why-no-age',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Why no age in years?',
      body: `This investigation, and the two before it, give a diameter, a density and a ratio of two
             densities. None gives an age in years.`,
      prompt: 'Why not?',
      options: [
        'The diameter’s uncertainty is too large to give an age',
        'An age needs a production function, corrections for saturation and secondary craters, and a completeness correction checked on craters of known size; none of that has passed its test here',
        'Craters cannot be dated, because impacts do not happen at a steady rate',
        'The Poisson intervals are too wide to give an age',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'diameter',
          option: 0,
          say: 'A diameter good to five percent is good enough for a count. The obstacles to an age are elsewhere: what the impact rate was, and how complete and how clean the count is.',
        },
        {
          id: 'steady',
          option: 2,
          say: 'Craters can be dated, by calibrating the density against samples of known age: that is exactly the chronology function an age would need. The rate is not steady, and the calibration says how it changed.',
        },
        {
          id: 'poisson',
          option: 3,
          say: 'The intervals are one part of the uncertainty of an age, and often not the largest. The count has to be complete, free of secondaries and below saturation before the density means anything in years.',
        },
      ],
      hints: ['Which of these has not been tested here?'],
      because:
        'An age needs several things that are not here: a production function and a chronology to turn a density into years, corrections for saturation and secondary craters, and a correction for what a count misses, checked on craters whose sizes are known. Until they pass their test, a density ratio is the finding, and it says which surface is older, not by how many years.',
      tool: CBD({}, ['dmin', 'catalog']),
    },
    {
      sid: 'what-you-worked-out',
      stage: STAGE,
      type: 'read',
      title: 'What you worked out',
      body: `A circle with a center and a rim point 25 pixels away gave a diameter of 112.0 &plusmn; 5.9 km: the scale
             of the map, the placement of the circle, where the rim is, and the view, added in quadrature, with the rim,
             a fraction you set, the largest. The view changes the diameter by about ten percent and its uncertainty
             by 0.06 percent: it is a correction to apply, not an error to quote. A diameter and a density ratio are
             what this investigation reports. An age in years is not, because it needs a production function, corrections
             for saturation and secondary craters, and a completeness correction that has not passed its test.`,
      tool: CBD({}, ['dmin', 'catalog']),
    },
  ],
};

// -----------------------------------------------------------------------------
// 10. What is in this field? (Prompt 191 part 3, IMAGE_INVESTIGATIONS.md; the
//     two field instruments in js/imagingWidgets.js, the frame in
//     js/imagingField.js)
// -----------------------------------------------------------------------------
// One more investigation, appended here for the same reason as the others (the
// closure cap, D-R10-67). Every number is recomputed in tests/fieldLesson.test.js
// from the detector and injection tools. The frame is synthetic and says so.
// A step that hides a control offers no preset: one could move it unseen.
const FSO = (values = {}, hide = []) => ({
  id: 'field-sources',
  values,
  hide,
  ...(hide.length ? { presets: false } : {}),
});
const FCO = (values = {}, hide = []) => ({
  id: 'field-completeness',
  values,
  hide,
  ...(hide.length ? { presets: false } : {}),
});

export const WHAT_IS_IN_THIS_FIELD = {
  id: 'what-is-in-this-field',
  thumbnail: 'images/investigations/what-is-in-this-field.webp',
  title: 'What Is in This Field?',
  subtitle:
    'The sources a detector lists, the width of the stars, and the curve that says how faint a search can see',
  duration: '20-30 min',
  level: 'Majors and upper-level astronomy',
  audience: 'intro',
  textbook: { chapter: 6, section: null },
  courseLevel: 'majors',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'algebra',
  prerequisites: ['signal-noise-and-exposure'],
  tags: ['observing'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Say that a list of sources is what stands out of the noise at a threshold, not what is there, and what lowering the threshold buys and costs',
    'Read the width of the stars in a frame with its uncertainty, and say why the stars added to test a search must have that width',
    'Read a completeness curve: the share of added stars found by magnitude, and the magnitudes at 50 and at 90 percent with an interval',
    'Say what a completeness curve is the answer for, one search of one frame, and what it is not',
  ],
  steps: [
    {
      sid: 'a-field-of-stars',
      stage: STAGE,
      type: 'read',
      title: 'A frame, and no list yet',
      body: `Below is one frame of a star field: forty stars, bright to faint, on a sky with noise.
             A detector has not yet looked at it. Three things are asked of it here: which sources
             stand out of the noise, how wide the stars are, and, the one that says how far to trust
             the other two, how faint a star it would have found.
             \n\nThe frame is <strong>synthetic</strong>: the stars were placed from a table, and
             that truth stays hidden until a step switches it on. A real frame never offers it.
             Magnitudes here are <em>instrumental</em>: minus 2.5 times the logarithm of the
             electrons a second, so a smaller number is a brighter star, and there is no zero
             point.`,
      tool: FSO({}, ['sigma', 'truth']),
    },
    {
      sid: 'predict-the-list',
      stage: STAGE,
      type: 'predict',
      reveal: 'how-many-sources',
      title: 'What will the list hold?',
      body: `The detector subtracts the sky, smooths the frame and lists every place that stands
             four sigma out of the noise.`,
      prompt:
        'Compared with the stars that were placed, the list will hold&hellip;',
      options: [
        'every star, and nothing else',
        'the brighter stars, with the faintest ones missed',
        'the brighter stars, and several places that are only noise',
        'about as many sources as there are stars, whichever they are',
      ],
      answer: 1,
      hints: ['What does a faint star look like beside the noise of the sky?'],
      because:
        'The brighter stars, with the faintest ones missed. At four sigma almost nothing but a star stands that far out of the noise, and a star whose light is spread over a few pixels of sky noise does not. The next steps show what a lower threshold does.',
      tool: FSO({}, ['sigma', 'truth']),
    },
    {
      sid: 'how-many-sources',
      stage: STAGE,
      type: 'measure',
      title: 'How many sources?',
      body: `Leave <strong>Threshold</strong> at 4 sigma. Read how many sources the detector lists,
             and how many of them carry a flag.`,
      fields: [
        { id: 'n', label: 'Sources listed', unit: '', hint: '30' },
        {
          id: 'flagged',
          label: 'Sources carrying a flag',
          unit: '',
          hint: '0',
        },
      ],
      validate: v => {
        if (![v.n, v.flagged].every(Number.isFinite)) return null;
        if (v.n === 30 && v.flagged === 0) {
          return {
            level: 'ok',
            message:
              'Thirty sources and no flags. Whether that is every star is something the list cannot say: it holds what stood out of the noise, and says nothing of what did not. Here the truth is known and the next step looks at it; in a real frame it never is.',
          };
        }
        return {
          level: 'error',
          message:
            'Leave “Threshold” at 4 σ, then read “Sources listed” and “Sources carrying a flag”.',
        };
      },
      tool: FSO({ sigma: 4 }, ['truth']),
    },
    {
      sid: 'lower-the-threshold',
      stage: STAGE,
      type: 'measure',
      title: 'A lower threshold',
      body: `Set <strong>Threshold</strong> to 2.5 sigma and switch <strong>Placed stars</strong> to shown. Read how many sources are listed, and how many of them are
             not a star that was placed.`,
      fields: [
        { id: 'n', label: 'Sources listed', unit: '', hint: '44' },
        {
          id: 'noise',
          label: 'Sources that are not a star that was placed',
          unit: '',
          hint: '7',
        },
      ],
      validate: v => {
        if (![v.n, v.noise].every(Number.isFinite)) return null;
        if (v.n === 44 && v.noise === 7) {
          return {
            level: 'ok',
            message:
              'Forty-four sources, seven of them noise. The threshold bought seven more stars, 37 of the 40 now listed, and cost seven places that are only noise that crossed it. At 2 sigma the list has 73 sources and 36 are noise. A list does not say which entries are which; a real frame has no truth to switch on.',
          };
        }
        return {
          level: 'error',
          message:
            'Set “Threshold” to 2.5 σ, switch “Placed stars” to shown, then read “Sources listed” and “Sources that are not a star that was placed”.',
        };
      },
      tool: FSO({ sigma: 2.5, truth: 1 }),
    },
    {
      sid: 'the-width',
      stage: STAGE,
      type: 'measure',
      title: 'The width of the stars',
      body: `Set <strong>Threshold</strong> back to 4 sigma and the truth to hidden. The detector
             takes the brightest stars that are round and have no flag, fits each with a Gaussian
             and combines them. Read how many stars it used and the width (FWHM) with its
             uncertainty.`,
      fields: [
        { id: 'n', label: 'Stars used for the width', unit: '', hint: '6' },
        { id: 'w', label: 'Width of the stars', unit: 'px', hint: '3.00' },
        { id: 's', label: 'Its uncertainty', unit: 'px', hint: '0.02' },
      ],
      validate: v => {
        if (![v.n, v.w, v.s].every(Number.isFinite)) return null;
        if (v.n === 6 && near(v.w, 3.0, 0.03) && near(v.s, 0.02, 0.005)) {
          return {
            level: 'ok',
            message:
              'Six stars give a width of 3.00 ± 0.02 pixels, and a Gaussian and a Moffat model agree on it. It is the width of the stars in this frame and nowhere else: a different night, a different focus would give another.',
          };
        }
        return {
          level: 'error',
          message:
            'Set “Threshold” to 4 σ with the truth hidden, then read “Stars used for the width” and “Width of the stars”.',
        };
      },
      tool: FSO({ sigma: 4, truth: 0 }, ['truth']),
    },
    {
      sid: 'why-the-width',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'What the width is for',
      body: `The next instrument adds stars of chosen brightness to a copy of this frame and has the
             detector look again. It asks for the width of the stars it adds.`,
      prompt: 'Why use the width just measured?',
      options: [
        'The added stars must look like the real ones, or the detector is tested on a different kind of star',
        'The width sets how bright the added stars are',
        'A wider star is always easier for a detector to find',
        'The tool refuses any width but the measured one',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'wide-is-easy',
          option: 2,
          say: 'A wider star spreads the same light over more pixels, so each pixel is dimmer against the same noise, and it is harder to find. The last steps show it.',
        },
        {
          id: 'refuses',
          option: 3,
          say: 'The tool accepts other widths, and the last steps use one. A wrong width gives a curve that describes the wrong kind of star.',
        },
      ],
      hints: ['What is being tested: the detector, on which stars?'],
      because:
        'A completeness curve says how likely this detector is to find stars like the ones added. If they are narrower or wider than the frame’s own, the curve is about stars the frame does not have.',
      tool: FCO({}, ['sigma', 'truth']),
    },
    {
      sid: 'one-magnitude',
      stage: STAGE,
      type: 'measure',
      title: 'Added stars, found and missed',
      body: `Twelve trials of twenty stars each were added at random places, between magnitude
             minus 3.4 and minus 1.6, and the detector looked each time. With the threshold at 4
             sigma and the width at 3 pixels, read the share found in the brightest bin (minus 3.4
             to minus 3.1) and in the bin from minus 2.5 to minus 2.2.`,
      fields: [
        {
          id: 'bright',
          label: 'Found, magnitude −3.4 to −3.1',
          unit: '%',
          hint: '100',
        },
        {
          id: 'faint',
          label: 'Found, magnitude −2.5 to −2.2',
          unit: '%',
          hint: '31',
        },
      ],
      validate: v => {
        if (![v.bright, v.faint].every(Number.isFinite)) return null;
        if (near(v.bright, 100, 0.5) && near(v.faint, 31, 1)) {
          return {
            level: 'ok',
            message:
              'All 34 of the brightest were found, and 12 of 39 in the bin from −2.5 to −2.2: 31 percent, with a 68 percent interval of 23 to 40. A share of a few dozen added stars is a measured fraction, and carries the binomial uncertainty of that few.',
          };
        }
        return {
          level: 'error',
          message:
            'Use the threshold 4 σ and the width 3 px, then read the two bins’ shares (“Magnitude −3.4 to −3.1” and “Magnitude −2.5 to −2.2”).',
        };
      },
      tool: FCO({ sigma: 4, width: 3 }, ['sigma', 'truth']),
    },
    {
      sid: 'the-curve',
      stage: STAGE,
      type: 'measure',
      title: 'The curve',
      body: `The shares, bin by bin, are the completeness curve of this search of this frame. Read
             the magnitude at which half of the added stars are found, and the one at which nine in
             ten are.`,
      fields: [
        {
          id: 'm50',
          label: 'Magnitude at 50 percent found',
          unit: 'mag',
          hint: '-2.47',
        },
        {
          id: 'm90',
          label: 'Magnitude at 90 percent found',
          unit: 'mag',
          hint: '-2.87',
        },
      ],
      validate: v => {
        if (![v.m50, v.m90].every(Number.isFinite)) return null;
        if (near(v.m50, -2.47, 0.03) && near(v.m90, -2.87, 0.03)) {
          return {
            level: 'ok',
            message:
              'Half are found at magnitude −2.47 (the interval’s edges cross at −2.52 and −2.42) and nine in ten at −2.87. The detector goes from nearly always finding a star to missing every second one in less than half a magnitude.',
          };
        }
        return {
          level: 'error',
          message:
            'Use the threshold 4 σ and the width 3 px, then read “Magnitude at 50 percent found” and “Magnitude at 90 percent found”.',
        };
      },
      tool: FCO({ sigma: 4, width: 3 }, ['truth']),
    },
    {
      sid: 'how-faint',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'How faint can it see?',
      body: `A question that wants one number has a curve for an answer.`,
      prompt: 'How faint can this detector see?',
      options: [
        'To magnitude −2.47: nothing fainter is ever found',
        'There is no single limit: it finds nearly every star brighter than −2.9, about half of those near −2.5, and almost none fainter than −2.2',
        'As faint as the faintest source on its list',
        'To the magnitude where the threshold is 4 sigma, a fixed property of the telescope',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'a-wall',
          option: 0,
          say: 'Half are found at −2.47, and a few fainter ones too: five percent of the added stars in the bin from −2.2 to −1.9. A limit is a choice of how sure to be, not a wall.',
        },
        {
          id: 'faintest-listed',
          option: 2,
          say: 'The faintest source listed is the faintest that happened to cross the threshold, with most of its neighbors missed. A list has no memory of what it missed; the added stars supply it.',
        },
        {
          id: 'fixed-property',
          option: 3,
          say: 'The threshold is a setting, not a property of the telescope. Change it and the curve moves, as the deeper path shows.',
        },
      ],
      hints: ['Look at the shares, bin by bin, and not at one number.'],
      because:
        'It depends on how sure you want to be. The curve gives the whole answer: 90 percent at −2.87, half at −2.47 and 5 percent at −2.2. “How faint” without a share is not a measurement, and a faintest listed source is not an answer either.',
      tool: FCO({ sigma: 4, width: 3 }, ['truth']),
    },
    {
      sid: 'what-you-worked-out',
      stage: STAGE,
      type: 'read',
      title: 'What you worked out',
      body: `At four sigma the detector listed 30 sources and flagged none. At 2.5 sigma it listed 44
             and seven were only noise, which no list can say of itself. Six clean stars gave a width
             of 3.00 &plusmn; 0.02 pixels. Stars of that width added at random places were found
             nine times in ten at magnitude −2.87 and half the time at −2.47, with almost none
             found beyond −2.2: the completeness curve is how a search answers &ldquo;how
             faint&rdquo;. It belongs to this frame, this width and this threshold. The frame was
             synthetic: forty stars of a table, a sky of 90 electrons a pixel and 8 of read noise,
             and a width of 3.0 pixels, which the measurement recovered.`,
      tool: FSO({}, ['sigma', 'truth']),
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
  WHICH_SURFACE_IS_OLDER,
  CRATERS_BY_SIZE,
  WHAT_A_CRATER_DIAMETER_IS_WORTH,
  WHAT_IS_IN_THIS_FIELD,
];
