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
  tags: ['observing', 'statistics'],
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
             person would put the centre of the blurred spot.
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
        'scattered a little around a centre, even when each mark is careful',
        'scattered only because some of the marks are mistakes',
        'scattered only if the frame is poor',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'careful-means-identical',
          option: 0,
          say: 'A blurred spot has no single edge to put a cross on. Two careful marks differ by a fraction of a pixel, and so would two careful marks by the same person.',
        },
      ],
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
      misconceptions: [
        {
          id: 'enough-marks-reach-zero',
          option: 3,
          say: 'The standard error shrinks with the square root of the number of marks, so it keeps falling and never reaches zero. Halving it takes four times the marks.',
        },
      ],
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
      misconceptions: [
        {
          id: 'mean-is-truth',
          option: 0,
          say: 'The mean is the best estimate the marks give, not the truth. It lies near the truth by about one standard error, which is the number you just measured.',
        },
      ],
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
      reflect: true,
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
  tags: ['observing', 'statistics'],
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
      misconceptions: [
        {
          id: 'honest-means-always',
          option: 2,
          say: 'A one-sigma interval is built to hold the truth only about two times in three. An honest claim is one whose coverage matches what it says, not one that is never wrong.',
        },
      ],
      hints: [
        'Think of the normal curve: how much of it lies within one sigma of the centre?',
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
      reflect: true,
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
  tags: ['observing', 'statistics'],
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
      misconceptions: [
        {
          id: 'product-is-mass',
          option: 0,
          say: 'That is the product, m times s. The mass alone is that number divided by s, and s is at most 1, so the mass is at least the product, and the tilt is not measured.',
        },
      ],
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
      reflect: true,
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

/** The three lessons, in order: what the barrel registers. */
export default [
  WHAT_IS_A_MEASUREMENT,
  WHAT_DOES_PLUS_MINUS_CLAIM,
  WHEN_THE_METHOD_MUST_REFUSE,
];
