// =============================================================================
// How far, and how sure? and What Gaia does not see (Prompt 233, Part B)
// -----------------------------------------------------------------------------
// Two investigations at three depths, in one module that also carries their Spanish words,
// their deeper steps and their instructor content: this is the one closure file the prompt
// adds (D-R10-233-08), because the shared sequence files sit at their line ceilings. The
// per-lesson path every loader builds from an id is a one-line re-export of a named export
// here, and the instructor modules read INSTRUCTOR. No imports: every number a step states is
// recomputed in tests/gaiaLessons.test.js from the instruments (js/gaiaWidgets.js over
// js/gaiaField.js and the kernel js/kernels/galactic/gaia.js), and every number about NGC 2420
// or the validation is held to tests/fixtures/gaia-workflows/results.json or the dataset.
// Every step carries a `sid`, an opaque stable id that student progress is keyed by.
//
// What they teach is the assumptions: a parallax measures 1 over the distance with an error,
// a prior is a stated option and not a correction, the zero point is a stated offset whose own
// uncertainty is not known here, and a sample is what passed its cuts. The cluster's distance
// is stated with its labels (statistics only, no systematic floor, leg E1 NOT RUN, not validated
// against a published catalog) and no universal correction is applied to anything.
// =============================================================================

const near = (x, target, tolerance) =>
  Number.isFinite(x) && Math.abs(x - target) <= tolerance;

const STAGE_D = {
  spacing: 150,
  fit: true,
  stars: [
    { role: 'star', name: 'A star with a parallax', teffK: 5800, lumSun: 1 },
  ],
};
const STAGE_S = {
  spacing: 150,
  fit: true,
  stars: [
    { role: 'member', name: 'A cluster star', teffK: 6200, lumSun: 2 },
    { role: 'field', name: 'A field star', teffK: 4800, lumSun: 0.3 },
  ],
};
/** The distance panel: plx and err in mas, zp the zero point in mas (0 none), prior 0 none or 1 falling as exp(-r/L), L in kpc, range the plot's far edge in kpc, mu the proper motion in mas/yr (0 none). */
const DIST = (values = {}) => ({
  id: 'gaia-distance',
  values: {
    plx: 0.4,
    err: 0.05,
    zp: 0,
    prior: 0,
    L: 1,
    range: 10,
    mu: 0,
    ...values,
  },
});
/** The sample panel: view 0 color and magnitude, 1 velocities; mag the magnitude limit (17.5 off), poe the parallax-over-error minimum (0 off), ruwe the RUWE limit (1.4 off), zp 1 applies a zero point per star. */
const SAMP = (values = {}) => ({
  id: 'gaia-sample',
  values: { view: 0, mag: 17.5, poe: 0, ruwe: 1.4, zp: 1, ...values },
});

// ---------------------------------------------------------------------------
// How far, and how sure?
// ---------------------------------------------------------------------------

export const HOW_FAR_AND_HOW_SURE = {
  id: 'how-far-and-how-sure',
  thumbnail: 'images/investigations/how-far-and-how-sure.webp',
  title: 'How far, and how sure?',
  subtitle:
    'A parallax measures one over the distance, with an error: draw the likelihood, see when it gives a distance and when it gives only a limit, and what a prior and a zero point do',
  duration: '8-12 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 19, section: null },
  courseLevel: 'majors',
  mathematics: 'algebra',
  prerequisites: ['the-suns-motion'],
  tags: ['galaxies', 'stars', 'observing'],
  lock: { placement: true, inspector: true },
  depths: ['core', 'quantitative', 'advanced'],
  objectives: [
    'Turn a parallax and its error into a distance with an interval, and say why the interval is not symmetric',
    'Say when a parallax supports a distance and when it supports only a lower limit or nothing, using the corrected parallax over its error',
    'Say what a negative parallax means and why it is kept, not thrown away',
    'Say what a prior adds, what it assumes about the sample, and what the zero point does to a distance',
  ],
  steps: [
    {
      sid: 'a-parallax-is-not-a-distance',
      stage: STAGE_D,
      type: 'read',
      title: 'A parallax is not a distance',
      body: `As the Earth goes round the Sun a nearby star seems to shift against the stars behind it. Half the
             size of that shift is its <strong>parallax</strong>, and in milliarcseconds it is one divided by the
             distance in kiloparsecs. A star at 2.5 kpc has a parallax of 0.4 mas.\n\nBut Gaia measures the parallax, not
             the distance, and it measures it with an <strong>error</strong>. So what is known is a likelihood: how
             well each possible distance agrees with the number measured. The panel draws that likelihood for a parallax
             and an error that you set (they are inputs, not a Gaia star). Its highest point is one divided by the
             parallax; its width is the error carried through the division.`,
      tool: DIST(),
    },
    {
      sid: 'commit-to-a-distance',
      stage: STAGE_D,
      type: 'predict',
      reveal: 'read-the-distance',
      title: 'Commit to a distance',
      body: `A star’s parallax is measured as 0.40 mas, with an error of 0.05 mas. Before you read the panel, say
             where the likelihood of its distance should peak.`,
      prompt: 'Where does the likelihood of the distance peak?',
      options: [
        'At 0.4 kpc, the parallax read as a distance',
        'At 8 kpc, the parallax divided by its error',
        'At 2.5 kpc, one divided by the parallax',
        'At 0.05 kpc, the error read as a distance',
      ],
      answer: 2,
      hints: [
        'A star at 1 kpc has a parallax of 1 mas. What distance has a parallax of 0.4 mas?',
      ],
      because:
        'At 2.5 kpc. A parallax is the inverse of a distance, so the distance that agrees best with 0.40 mas is one divided by 0.40. The error does not move the peak; it sets how wide the likelihood is.',
      tool: DIST(),
    },
    {
      sid: 'read-the-distance',
      stage: STAGE_D,
      type: 'measure',
      title: 'Read the distance and its interval',
      body: `Set the panel to a parallax of 0.40 mas and an error of 0.05 mas, with no prior and no zero point. Read
             the distance from the likelihood and the two ends of its 68 percent interval.`,
      fields: [
        {
          id: 'distance',
          label: 'Distance, the maximum of the likelihood',
          unit: 'kpc',
          want: '2.5',
        },
        {
          id: 'lo',
          label: 'Lower end of the interval',
          unit: 'kpc',
          want: '2.22',
        },
        {
          id: 'hi',
          label: 'Upper end of the interval',
          unit: 'kpc',
          want: '2.86',
        },
      ],
      validate: v => {
        if (![v.distance, v.lo, v.hi].every(Number.isFinite)) return null;
        if (
          near(v.distance, 2.5, 0.05) &&
          near(v.lo, 2.22, 0.04) &&
          near(v.hi, 2.86, 0.04)
        ) {
          return {
            level: 'ok',
            message:
              'The distance is 2.5 kpc and the 68 percent interval runs from 2.22 to 2.86 kpc. The interval is the likelihood’s, not a bare 1 divided by the parallax: it is one divided by (parallax plus the error) and one divided by (parallax minus the error).',
          };
        }
        return {
          level: 'error',
          message:
            'Set the parallax to 0.40 and the error to 0.05, prior off, and read the “Distance from the likelihood” line: a distance with an interval from a lower to an upper end.',
        };
      },
      tool: DIST(),
    },
    {
      sid: 'why-the-interval-leans',
      stage: STAGE_D,
      type: 'question',
      kind: 'choice',
      title: 'An interval that leans',
      body: `The interval runs from 2.22 to 2.86 kpc around 2.5: it reaches 0.28 kpc below and 0.36 above. The error
             in the parallax is the same size on both sides.`,
      prompt: 'Why is the interval longer on the far side?',
      options: [
        'Gaia measures faint, distant stars less well',
        'The error in distance is 1 divided by the parallax error, so it is the same on both sides',
        'Equal steps in parallax are unequal steps in distance: a smaller parallax is a larger distance',
        'The panel is biased toward large distances',
      ],
      answer: 2,
      hints: [
        'Work out the distance at a parallax 0.05 above and 0.05 below 0.40. Are the two steps from 2.5 equal?',
      ],
      because:
        'The parallax is symmetric and the distance is not. A parallax of 0.35 mas is 2.86 kpc, a step of 0.36 from 2.5; a parallax of 0.45 mas is 2.22 kpc, a step of 0.28. Because distance goes as one over parallax, an error of the same size either way is a longer step on the side of the smaller parallax.',
      misconceptions: [
        {
          id: 'faint',
          option: 0,
          say: 'The error is the same 0.05 mas on both sides here. The lean is a property of one divided by the parallax, not of how well Gaia saw the star.',
        },
      ],
      tool: DIST(),
    },
    {
      sid: 'try-the-controls',
      stage: STAGE_D,
      type: 'explore',
      title: 'Make the parallax worse',
      body: `Raise the parallax error and watch the likelihood. Then try the “Low signal” and “Negative parallax”
             buttons. Notice where the likelihood has a maximum, whether it falls to nothing on the far side, and what
             the lines on the right say a parallax supports.`,
      checklist: [
        'The likelihood widens as the error rises, and its peak stays at one divided by the parallax',
        'With “Low signal” the interval has no far end: the likelihood never falls on the far side',
        'With “Negative parallax” there is a likelihood and no distance',
      ],
      tool: DIST({ err: 0.09 }),
    },
    {
      sid: 'when-it-is-too-faint',
      stage: STAGE_D,
      type: 'question',
      kind: 'choice',
      title: 'A parallax as large as its error',
      body: `Press “Low signal”: a parallax of 0.10 mas with an error of 0.10 mas, a corrected parallax equal to its
             error. The panel says what this supports, and the interval has no far end.`,
      prompt: 'What can be said about the distance of this star?',
      options: [
        'It is 10 kpc away, with an uncertainty',
        'It is at least about 5 kpc away, and the data give no upper end',
        'It is at 0.1 kpc',
        'Nothing at all: a parallax this small is not data',
      ],
      answer: 1,
      hints: [
        'Read the interval: it starts at a lower end and says it has no far end.',
      ],
      because:
        'The lower end of the 68 percent interval is 5 kpc and the likelihood does not fall at large distance, so the parallax supports a lower limit, not a measured distance. One divided by 0.10 is 10 kpc, the maximum of the likelihood, but the curve is so wide that any larger distance fits nearly as well.',
      misconceptions: [
        {
          id: 'one-over-p',
          option: 0,
          say: 'One divided by the parallax is where the likelihood peaks, not a distance with an uncertainty here: the curve is open on the far side, so the data cannot say the star is not farther.',
        },
        {
          id: 'nothing',
          option: 3,
          say: 'The parallax does say something: the star is probably not nearer than the lower end. A measurement with a large error is weak evidence, not no evidence.',
        },
      ],
      tool: DIST({ plx: 0.1, err: 0.1, range: 20 }),
    },
    {
      sid: 'a-negative-parallax',
      stage: STAGE_D,
      type: 'question',
      kind: 'choice',
      title: 'A negative parallax',
      body: `Press “Negative parallax”: a measured parallax of −0.10 mas with an error of 0.05 mas. A catalog can
             hold such a number, because a measurement with noise can come out below zero for a faraway star.`,
      prompt: 'What does the panel give for this star, and why?',
      options: [
        'A distance of −10 kpc, which a student should ignore',
        'A distance of zero: the star is at the Sun',
        'The star is rejected as a bad measurement',
        'A likelihood and no distance: the corrected parallax is not positive, so one divided by it is not a distance',
      ],
      answer: 3,
      hints: ['Read the line that says what the parallax supports.'],
      because:
        'A likelihood and no distance. One divided by a negative number is not a distance, so the panel draws the likelihood and says there is nothing to report. The star is not bad: its measurement says only that it is far, or that the noise went the wrong way. Throwing out negative parallaxes would cut the noisy half of a sample and bias what is left.',
      misconceptions: [
        {
          id: 'negative-distance',
          option: 0,
          say: 'There is no such thing as a negative distance. The panel does not invent one: it draws the likelihood and says there is no distance.',
        },
        {
          id: 'reject',
          option: 2,
          say: 'A negative parallax is an honest measurement with noise on it. Rejecting it throws away the information that the star is faint in parallax, and biases the sample.',
        },
      ],
      tool: DIST({ plx: -0.1, err: 0.05, range: 20 }),
    },
    {
      sid: 'what-you-worked-out',
      stage: STAGE_D,
      type: 'read',
      title: 'What you worked out',
      body: `A parallax is one over a distance, measured with an error. What it supports is a likelihood: a maximum at
             one divided by the corrected parallax, an interval that leans toward the far side, a lower limit when the
             parallax is no larger than its error, and nothing but the likelihood when it is not positive. A point
             distance needs a corrected parallax at least five times its error. Nothing here was corrected beyond the
             numbers you set.`,
      tool: DIST(),
    },
  ],
};

export const HOW_FAR_AND_HOW_SURE_DEEPER = {
  id: 'how-far-and-how-sure',
  steps: [
    {
      sid: 'the-relative-error',
      after: 'read-the-distance',
      depth: 'quantitative',
      type: 'measure',
      title: 'The error in the distance',
      body: `For the 0.40 mas parallax with an error of 0.05 mas, the panel says the corrected parallax is a number of
             times its error. The relative error of the distance equals the relative error of the parallax. Give it as a
             percent.`,
      fields: [
        {
          id: 'relative',
          label: 'Error of the parallax as a share of the parallax',
          unit: 'percent',
          want: '12.5',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.relative)) return null;
        if (near(v.relative, 12.5, 1)) {
          return {
            level: 'ok',
            message:
              '0.05 divided by 0.40 is 12.5 percent, and the interval of 2.22 to 2.86 kpc is about 13 percent either side of 2.5. For a parallax a few times larger than its error the distance’s relative error is the parallax’s, to a good approximation; the approximation fails as the ratio falls, which is why the interval leans.',
          };
        }
        return {
          level: 'error',
          message:
            'Divide the error (0.05) by the parallax (0.40), and give the result in percent. The panel’s “times its error” is the inverse of this.',
        };
      },
      tool: DIST(),
    },
    {
      sid: 'where-the-threshold-falls',
      after: 'the-relative-error',
      depth: 'quantitative',
      type: 'question',
      kind: 'choice',
      title: 'Where the threshold falls',
      body: `A point distance needs a corrected parallax of at least five times its error. Keep the parallax at 0.40 mas
             and raise the error one step at a time (the slider moves in 0.01 mas), and read what the panel says it
             supports.`,
      prompt: 'At what error does 0.40 mas stop supporting a point distance?',
      options: [
        'Above 0.04 mas',
        'Above 0.08 mas',
        'Above 0.20 mas',
        'It never does, because 0.40 is positive',
      ],
      answer: 1,
      hints: ['Five times the error must not exceed 0.40.'],
      because:
        'Above 0.08 mas: 0.40 divided by 0.08 is 5, and at 0.09 the ratio is 4.4 and the panel says low signal. The threshold of five is a stated choice, not a law of nature; below it the distance is a maximum of a wide likelihood and not a measurement.',
      tool: DIST({ err: 0.08 }),
    },
    {
      sid: 'an-interval-with-no-far-end',
      after: 'where-the-threshold-falls',
      depth: 'quantitative',
      type: 'measure',
      title: 'An interval with no far end',
      body: `Press “Low signal” (0.10 mas, error 0.10 mas) and read the lower end of the 68 percent interval. Then
             raise the parallax to 0.15 mas and read both ends.`,
      fields: [
        { id: 'lo', label: 'Lower end at 0.10 mas', unit: 'kpc', want: '5.0' },
        { id: 'hi', label: 'Upper end at 0.15 mas', unit: 'kpc', want: '20' },
      ],
      validate: v => {
        if (![v.lo, v.hi].every(Number.isFinite)) return null;
        if (near(v.lo, 5, 0.1) && near(v.hi, 20, 0.5)) {
          return {
            level: 'ok',
            message:
              'At 0.10 mas the interval starts at 5 kpc and has no far end; at 0.15 mas it closes, at 20 kpc. The far end appears only when the corrected parallax exceeds its error: one divided by (parallax minus error) is finite only then.',
          };
        }
        return {
          level: 'error',
          message:
            'With 0.10 mas and an error of 0.10, read the lower end (the interval has no upper one); then set the parallax to 0.15 and read the upper end, one divided by 0.05.',
        };
      },
      tool: DIST({ plx: 0.1, err: 0.1, range: 30 }),
    },
    {
      sid: 'from-parallax-to-speed',
      after: 'an-interval-with-no-far-end',
      depth: 'quantitative',
      type: 'measure',
      title: 'From a parallax to a speed',
      body: `A star’s proper motion is 5 mas/yr. At a distance, that angle per year is a speed across the sky: 4.74 km/s
             for each mas/yr at 1 kpc. Set the parallax to 0.40 mas with an error of 0.05 mas and the proper motion to 5.0
             mas/yr, and read the tangential speed and its interval.`,
      fields: [
        { id: 'speed', label: 'Tangential speed', unit: 'km/s', want: '59.3' },
        {
          id: 'lo',
          label: 'Lower end of the interval',
          unit: 'km/s',
          want: '52.7',
        },
        {
          id: 'hi',
          label: 'Upper end of the interval',
          unit: 'km/s',
          want: '67.7',
        },
      ],
      validate: v => {
        if (![v.speed, v.lo, v.hi].every(Number.isFinite)) return null;
        if (
          near(v.speed, 59.3, 0.5) &&
          near(v.lo, 52.7, 0.6) &&
          near(v.hi, 67.7, 0.6)
        ) {
          return {
            level: 'ok',
            message:
              '4.74 times 5 times 2.5 kpc is 59.3 km/s, and the interval is the distance’s interval multiplied by the same factor, 52.7 to 67.7 km/s. The speed inherits the distance’s lean; and the proper motion’s own error is not in this number.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the proper motion to 5.0 mas/yr and read the “Tangential speed” line: the distance of 2.5 kpc and its interval, each times 4.74 times 5.',
        };
      },
      tool: DIST({ mu: 5 }),
    },
    {
      sid: 'why-one-over-p-is-biased',
      after: 'from-parallax-to-speed',
      depth: 'quantitative',
      type: 'question',
      kind: 'choice',
      title: 'Averaging one over the parallax',
      body: `The validation drew many noisy parallaxes of stars at one true distance and averaged one over each. At a
             parallax five times its error the mean came out 1.043 times the true distance; at ten times, 1.010; at twenty
             times, 1.003. The median of one over the parallax, at twenty times, was 1.00007 of the true distance
             (leg A1 of GAIA_WORKFLOWS.md).`,
      prompt: 'What does this say?',
      options: [
        'Gaia’s parallaxes are biased high',
        'One over the parallax is never a good estimate of the distance',
        'The bias is the zero point',
        'The mean of one over a noisy parallax is biased high, by a share that falls as the parallax grows against its error, and the median is not',
      ],
      answer: 3,
      hints: [
        'Which of the two, the mean or the median, stayed at 1.000 at twenty times? What does the share do as the ratio rises?',
      ],
      because:
        'The bias is in the average of one over p, not in p. A noisy p sometimes comes out small, and one over a small p is a very large distance; the average is pulled up by those, by 4.3 percent at a ratio of five and 0.25 percent at twenty. The median is not pulled. It is a property of the inversion, so it is stated and shown, and no blanket correction is applied to any sample.',
      misconceptions: [
        {
          id: 'gaia-biased',
          option: 0,
          say: 'The parallaxes here were drawn with no bias at all. The bias comes from taking one over a noisy number.',
        },
        {
          id: 'zero-point',
          option: 2,
          say: 'The zero point is an offset in the measurement and is a separate matter (later). This bias is there with no zero point at all.',
        },
      ],
      tool: DIST({ plx: 0.4, err: 0.08 }),
    },
    {
      sid: 'justify-a-report',
      after: 'why-one-over-p-is-biased',
      depth: 'quantitative',
      type: 'question',
      kind: 'short',
      title: 'Report a distance',
      body: `A catalog lists a star with a parallax of 0.10 mas and an error of 0.10 mas, and a student writes
             “the star is 10 kpc away”.`,
      prompt:
        'Say what is wrong with the sentence, and write what the parallax supports instead, using numbers from the panel.',
      rubric:
        'Credit for saying that 10 kpc is one over the parallax, the maximum of a very wide likelihood, and not a measured distance; for the lower end of about 5 kpc and the missing far end; and for stating the corrected parallax over its error (1) against the threshold (5). Do not credit an answer that only says the error is large.',
      rubricCriteria: [
        {
          name: 'Says what is wrong with the single number',
          kind: 'correctness',
          levels: [
            {
              label: 'Full',
              points: 3,
              text: 'Says that 10 kpc is only where the likelihood peaks, the curve is open on the far side, and the parallax supports a lower limit.',
            },
            {
              label: 'Partly',
              points: 1,
              text: 'Says the error is large or the number is uncertain, without saying why the far side is open.',
            },
            {
              label: 'Not yet',
              points: 0,
              text: 'Accepts 10 kpc, or replaces it with another single distance.',
            },
          ],
        },
        {
          name: 'Writes the supported statement',
          kind: 'reasoning',
          levels: [
            {
              label: 'Full',
              points: 2,
              text: 'Writes that the star is probably at least 5 kpc away, with no upper end from these data.',
            },
            { label: 'Not yet', points: 0, text: 'Writes no limit.' },
          ],
        },
        {
          name: 'Uses the panel’s numbers',
          kind: 'uncertainty',
          levels: [
            {
              label: 'Full',
              points: 2,
              text: 'Gives the corrected parallax over its error (1) and compares it with the threshold of 5.',
            },
            {
              label: 'Not yet',
              points: 0,
              text: 'Gives no number from the panel.',
            },
          ],
        },
        {
          name: 'Answers the question asked',
          kind: 'completion',
          levels: [
            { label: 'Full', points: 1, text: 'Addresses both parts.' },
            { label: 'Not yet', points: 0, text: 'Addresses one part.' },
          ],
        },
      ],
      tool: DIST({ plx: 0.1, err: 0.1, range: 20 }),
    },
    {
      sid: 'add-a-prior',
      after: 'justify-a-report',
      depth: 'advanced',
      type: 'measure',
      title: 'Add a prior',
      body: `Press “Low signal” and switch the prior on, with a scale length of 1 kpc. The prior says how stars are
             spread along the line of sight: here a space density that falls as exp(−r ÷ L). Read the median of the posterior
             and its 68 percent interval.`,
      fields: [
        { id: 'median', label: 'Posterior median', unit: 'kpc', want: '5.11' },
        { id: 'lo', label: 'Lower end', unit: 'kpc', want: '3.85' },
        { id: 'hi', label: 'Upper end', unit: 'kpc', want: '6.93' },
      ],
      validate: v => {
        if (![v.median, v.lo, v.hi].every(Number.isFinite)) return null;
        if (
          near(v.median, 5.11, 0.1) &&
          near(v.lo, 3.85, 0.1) &&
          near(v.hi, 6.93, 0.15)
        ) {
          return {
            level: 'ok',
            message:
              'The prior closed the interval: from “at least 5 kpc, no far end” to a median of 5.1 kpc between 3.9 and 6.9. That is the prior doing the work, not the parallax, and the panel says so: the status is prior-dominated.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the parallax to 0.10 and the error to 0.10, switch the prior on with a scale length of 1.0, and read the “With the prior” line.',
        };
      },
      tool: DIST({ plx: 0.1, err: 0.1, prior: 1, L: 1, range: 20 }),
    },
    {
      sid: 'double-the-scale-length',
      after: 'add-a-prior',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'Change what the prior says',
      body: `Now change the scale length from 1 to 2 kpc and read the interval again: its upper end moves from 6.93 to 10.81 kpc.
             The validation measured the same thing: with a corrected parallax equal to its error, doubling the scale
             length moved the upper end by a factor of 1.56 (leg D3).`,
      prompt: 'What does this mean for a star with a parallax this weak?',
      options: [
        'The answer is the parallax’s, and the prior only decorates it',
        'The prior should be chosen to make the interval shortest',
        'The answer is the prior’s as much as the parallax’s: it moves when the prior’s scale moves',
        'The scale length of 1 kpc is correct and 2 kpc is wrong',
      ],
      answer: 2,
      hints: ['What changed between the two readings: the data, or the prior?'],
      because:
        'The data did not change; the prior did, and the interval moved by more than half. When the parallax is weak the posterior is mostly the prior, which is why the panel says prior-dominated. Choosing the scale length to give a tidy interval would put the answer in by hand, and neither scale length is known to be right for this star.',
      misconceptions: [
        {
          id: 'decoration',
          option: 0,
          say: 'Compare the two intervals: the upper end moved from 6.93 to 10.81 kpc with the data unchanged. The prior is not a decoration here.',
        },
      ],
      tool: DIST({ plx: 0.1, err: 0.1, prior: 1, L: 2, range: 20 }),
    },
    {
      sid: 'when-the-data-win',
      after: 'double-the-scale-length',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'When the data win',
      body: `Press “Well measured” (0.40 mas, error 0.02 mas, a corrected parallax twenty times its error) and switch the
             prior on. Change the scale length between 1 and 2 kpc and watch the median.`,
      prompt: 'What happens to the posterior median?',
      options: [
        'It barely moves: the likelihood is narrow and the prior is nearly flat across it',
        'It moves by half, as it did for the weak parallax',
        'It moves to the prior’s peak',
        'The prior is ignored and the interval is unchanged to the last digit',
      ],
      answer: 0,
      hints: [
        'Compare the width of the likelihood with the scale over which the prior changes.',
      ],
      because:
        'The median moves from 2.509 to 2.517 kpc, a third of a percent. A narrow likelihood sits where the prior is nearly flat, so any reasonable scale length gives nearly the same answer. A prior matters in proportion to how little the parallax says, which is why a point distance needs five times the error.',
      tool: DIST({ plx: 0.4, err: 0.02, prior: 1, L: 1 }),
    },
    {
      sid: 'what-the-prior-assumes',
      after: 'when-the-data-win',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'What the prior assumes',
      body: `The prior is stated beside the likelihood: the stars sampled have a density that falls as exp(−r ÷ L), and
             the sample is complete over the distances drawn. A student applies it to stars chosen because their
             parallax over error exceeds 5. In the validation a prior with the wrong scale length (1 kpc for stars that
             really fall off over 3) gave 68 percent intervals that covered between 22 and 42 percent of the stars
             (leg C4, reported with no pass or fail).`,
      prompt: 'What is wrong with applying the prior to that sample?',
      options: [
        'Nothing: a prior is always better than none',
        'The prior is only for stars brighter than a magnitude',
        'It would give the right intervals but the wrong medians',
        'A cut on the parallax thins the sample by distance, so the sample is not complete and the stated prior is not the sample’s',
      ],
      answer: 3,
      hints: [
        'Which stars does a cut on parallax over error remove first, the near ones or the far ones?',
      ],
      because:
        'A cut on parallax over error removes far stars first, so the sample is not the population the prior describes, and the interval’s stated level is no longer what it covers. The validation showed what a wrong prior scale costs: 68 percent intervals that covered 22 to 42 percent. A cut changes the prior; the panel says so, and cannot repair it.',
      misconceptions: [
        {
          id: 'always-better',
          option: 0,
          say: 'A prior that does not describe the sample moves the answer toward something false. In the validation, intervals meant to cover 68 percent covered as few as 22 percent.',
        },
      ],
      tool: DIST({ plx: 0.2, err: 0.04, prior: 1, L: 1 }),
    },
    {
      sid: 'the-zero-point',
      after: 'what-the-prior-assumes',
      depth: 'advanced',
      type: 'measure',
      title: 'The zero point',
      body: `Gaia’s parallaxes have a small offset, the <strong>zero point</strong>, that depends on a star’s magnitude, color
             and sky position; it is negative, so the catalog’s parallax is too small. Press “Well measured”, set the
             zero-point offset to −0.040 mas (a value near what NGC 2420’s stars need, below) and read the new distance.`,
      fields: [
        {
          id: 'distance',
          label: 'Distance with the zero point',
          unit: 'kpc',
          want: '2.27',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.distance)) return null;
        if (near(v.distance, 2.27, 0.03)) {
          return {
            level: 'ok',
            message:
              'The corrected parallax is 0.44 mas, so the distance is 2.27 kpc, not 2.5. The shift of 0.23 kpc is larger than the 68 percent interval for this error (2.38 to 2.63 kpc); a zero point that is not stated or applied is an error the interval does not contain.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the zero-point offset to −0.040 mas with a parallax of 0.40 and an error of 0.02. The corrected parallax is the observed one minus the offset: 0.44.',
        };
      },
      tool: DIST({ plx: 0.4, err: 0.02, zp: -0.04 }),
    },
    {
      sid: 'the-cluster-and-the-zero-point',
      after: 'the-zero-point',
      depth: 'advanced',
      type: 'measure',
      title: 'A cluster, with and without',
      body: `The second panel holds the 993 Gaia stars of the open cluster NGC 2420. Its members (stars whose proper
             motion alone puts them in the cluster with probability 0.9 or more) have a mean parallax and, with the
             zero point of each star applied, a distance. Read the distance with the zero point on, then switch the
             zero point per star off and read it again.`,
      fields: [
        {
          id: 'with',
          label: 'Distance with the zero point',
          unit: 'kpc',
          want: '2.324',
        },
        {
          id: 'without',
          label: 'Distance without it',
          unit: 'kpc',
          want: '2.555',
        },
      ],
      validate: v => {
        if (![v.with, v.without].every(Number.isFinite)) return null;
        if (near(v.with, 2.324, 0.01) && near(v.without, 2.555, 0.01)) {
          return {
            level: 'ok',
            message:
              'With the zero point 2.324 kpc, without it 2.555 kpc: the zero point moves the distance by 0.23 kpc, more than 25 times the half-width of the first interval. The first interval, 2.316 to 2.332 kpc, is statistics only: it carries no systematic floor, because the zero point’s own uncertainty is not known here.',
          };
        }
        return {
          level: 'error',
          message:
            'Read the “Distance of the cluster” line twice: once with “Zero point per star” on and once with it off. The first is the smaller distance.',
        };
      },
      tool: SAMP(),
    },
    {
      sid: 'what-the-interval-leaves-out',
      after: 'the-cluster-and-the-zero-point',
      depth: 'advanced',
      type: 'question',
      kind: 'short',
      title: 'Say what the distance is',
      body: `The cluster’s corrected distance is 2.324 kpc with a statistical interval of 2.316 to 2.332 kpc. That interval
             has no systematic floor. The leg of the validation that would check the distance against a published,
             Gaia-based catalog distance (E1) was not run: the table it needs, Hunt and Reffert 2023, could not be fetched.
             The literature’s values in the validation range from 2.48 kpc (photometry, converted from a distance
             modulus) to 2.59 (Gaia DR2); one DR3 parallax as printed, with no zero point, gives 2.78 kpc.`,
      prompt:
        'Write the sentence you would put in a report for this distance, with its labels, and say what has not been done.',
      rubric:
        'Credit for 2.324 kpc with the statistical interval 2.316 to 2.332 labelled as statistics only with no systematic floor; for saying the zero point’s own uncertainty is not known here; for saying the distance has not been validated against a published catalog distance (E1 NOT RUN) and lies below the literature values listed; and for not calling it an agreement. Do not credit a sentence that gives 2.324 kpc as the cluster’s distance with no label.',
      rubricCriteria: [
        {
          name: 'States the value with its labels',
          kind: 'correctness',
          levels: [
            {
              label: 'Full',
              points: 3,
              text: 'Gives 2.324 kpc, the interval 2.316 to 2.332 kpc as statistics only, and no systematic floor.',
            },
            {
              label: 'Partly',
              points: 1,
              text: 'Gives the value and the interval without saying what the interval leaves out.',
            },
            {
              label: 'Not yet',
              points: 0,
              text: 'Gives the value with no label.',
            },
          ],
        },
        {
          name: 'Says what has not been done',
          kind: 'reasoning',
          levels: [
            {
              label: 'Full',
              points: 2,
              text: 'Says the distance is not validated against a published catalog and that leg E1 was not run.',
            },
            {
              label: 'Not yet',
              points: 0,
              text: 'Claims agreement with the literature.',
            },
          ],
        },
        {
          name: 'Places it among the other values',
          kind: 'uncertainty',
          levels: [
            {
              label: 'Full',
              points: 2,
              text: 'Says it lies below every distance in the listed sources, including the printed DR3 parallax’s lower end (2.38 kpc), and does not call that agreement.',
            },
            { label: 'Not yet', points: 0, text: 'Does not compare it.' },
          ],
        },
        {
          name: 'Writes a sentence for a report',
          kind: 'completion',
          levels: [
            {
              label: 'Full',
              points: 1,
              text: 'Writes a sentence that could stand alone.',
            },
            {
              label: 'Not yet',
              points: 0,
              text: 'Lists points without a sentence.',
            },
          ],
        },
      ],
      tool: SAMP(),
    },
  ],
};

// ---------------------------------------------------------------------------
// What Gaia does not see
// ---------------------------------------------------------------------------

export const WHAT_GAIA_DOES_NOT_SEE = {
  id: 'what-gaia-does-not-see',
  thumbnail: 'images/investigations/what-gaia-does-not-see.webp',
  title: 'What Gaia does not see',
  subtitle:
    'Cuts on magnitude, parallax over error and RUWE decide which stars a Gaia sample holds: watch the color-magnitude diagram and the cluster’s distance change as stars are removed',
  duration: '8-12 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 22, section: null },
  courseLevel: 'majors',
  mathematics: 'algebra',
  prerequisites: ['cluster-membership', 'how-far-and-how-sure'],
  tags: ['galaxies', 'stars', 'observing'],
  lock: { placement: true, inspector: true },
  depths: ['core', 'quantitative', 'advanced'],
  objectives: [
    'Say that a catalog sample is the stars that passed its cuts, and read what each cut removes from NGC 2420’s stars',
    'Say which part of a color-magnitude diagram a magnitude limit and a parallax-over-error cut remove',
    'Say that a cut on the parallax moves a distance taken from the stars that are left, and that the interval does not contain the move',
    'Say what a cut does to a prior’s assumptions, and what the panel’s cuts are not: Gaia’s real selection',
  ],
  steps: [
    {
      sid: 'a-sample-is-what-passed',
      stage: STAGE_S,
      type: 'read',
      title: 'A sample is what passed its cuts',
      body: `No catalog holds every star. NGC 2420 is an old open cluster, and the dataset holds 993 Gaia stars in its
             field: stars brighter than G = 17.5 whose astrometric solution was good enough (RUWE below 1.4; 55 more were dropped by
             that query before you saw anything). Every study then adds cuts of its own, and the stars left are the
             sample.\n\nThe panel lets you add three cuts: a limit on the magnitude, a minimum on the parallax over its
             error, and a limit on RUWE. The diagram shows the stars kept (members in blue, others in gray) and the
             stars removed (orange); the lines on the right say what each cut removed and what is left.`,
      tool: SAMP(),
    },
    {
      sid: 'commit-to-a-cut',
      stage: STAGE_S,
      type: 'predict',
      reveal: 'read-what-is-left',
      title: 'Commit to a cut',
      body: `Before you move a slider: set the magnitude limit to G below 16, a cut that keeps only stars brighter than
             magnitude 16. Most of the dataset’s stars are faint, since fainter stars are more numerous.`,
      prompt: 'About how much of the dataset does G below 16 remove?',
      options: [
        'About a tenth',
        'About half',
        'About nine tenths',
        'None: every star in the dataset is brighter than 17.5',
      ],
      answer: 1,
      hints: [
        'The dataset runs from G of about 9 to 17.5, and the number of stars rises steeply toward the faint end.',
      ],
      because:
        'About half: 526 of 993. Stars rise in number toward fainter magnitudes, so a cut at 16 removes the faint half of the dataset even though it is 1.5 magnitudes brighter than the limit the dataset was made with.',
      tool: SAMP({ mag: 16 }),
    },
    {
      sid: 'read-what-is-left',
      stage: STAGE_S,
      type: 'measure',
      title: 'Read what is left',
      body: `Tighten the magnitude limit to G below 15. Read how many stars the cut removes from the dataset and how many
             are left.`,
      fields: [
        {
          id: 'removed',
          label: 'Stars removed by the cut',
          want: '755',
        },
        { id: 'left', label: 'Stars left', want: '238' },
      ],
      validate: v => {
        if (![v.removed, v.left].every(Number.isFinite)) return null;
        if (v.removed === 755 && v.left === 238) {
          return {
            level: 'ok',
            message:
              '755 of 993 stars are removed and 238 left: a limit 2.5 magnitudes brighter than the dataset’s removes three quarters of it. The rows add up: 755 and 238 make 993.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the magnitude limit to 15.0 with every other cut off and read the “Cuts on” and “Stars left” lines; the two numbers add up to 993.',
        };
      },
      tool: SAMP({ mag: 15 }),
    },
    {
      sid: 'which-stars-go',
      stage: STAGE_S,
      type: 'question',
      kind: 'choice',
      title: 'Which stars go',
      body: `Look at the diagram with G below 15. The orange points are the stars the cut removed.`,
      prompt:
        'Which part of the cluster’s diagram does a magnitude limit take away?',
      options: [
        'The red giants, which are rare',
        'A band of colors, whatever the magnitude',
        'The faint end of the main sequence: the lower-mass stars, which are numerous',
        'Stars at random across the diagram',
      ],
      answer: 2,
      hints: [
        'In this diagram brighter is up. Where do the removed stars sit?',
      ],
      because:
        'The faint end of the main sequence. A magnitude limit is a horizontal line across the diagram, so it removes everything below it: the stars of lowest mass, which are the most numerous. What is left is the turnoff, the giants and the upper main sequence. The diagram of a cut sample is a different diagram.',
      misconceptions: [
        {
          id: 'giants',
          option: 0,
          say: 'The giants are bright: a limit at the faint end cannot remove them first. Look at where the orange points sit.',
        },
      ],
      tool: SAMP({ mag: 15 }),
    },
    {
      sid: 'a-cut-on-parallax-over-error',
      stage: STAGE_S,
      type: 'question',
      kind: 'choice',
      title: 'A cut on parallax over error',
      body: `Reset the magnitude limit and keep only stars whose parallax is at least ten times its error. The panel says
             513 of 993 stars are removed. Their mean magnitude is 16.7 and that of the stars kept is 14.9.`,
      prompt:
        'Why does a cut on parallax over error remove mostly faint stars?',
      options: [
        'Faint stars have larger parallax errors, so the ratio is smaller',
        'Faint stars have smaller parallaxes',
        'Gaia does not see stars fainter than 16',
        'The cut is on magnitude in disguise, and nothing else',
      ],
      answer: 0,
      hints: [
        'All the stars of a cluster have nearly the same true parallax. What differs from star to star?',
      ],
      because:
        'The error. Stars of a cluster are at one distance and have one true parallax, so the ratio changes from star to star because the error does: it grows toward faint magnitudes. A cut on parallax over error is therefore close to a cut on magnitude here, but not the same: it also removes the stars whose parallax happened to be measured low.',
      misconceptions: [
        {
          id: 'smaller-parallax',
          option: 1,
          say: 'These stars are at one distance, so they share one true parallax. Faintness does not make a parallax smaller; it makes its error larger.',
        },
      ],
      tool: SAMP({ poe: 10 }),
    },
    {
      sid: 'the-distance-moves',
      stage: STAGE_S,
      type: 'question',
      kind: 'choice',
      title: 'The distance moves',
      body: `With every cut off the cluster’s distance is 2.324 kpc, with a statistical interval of 2.316 to 2.332 kpc. Now
             keep only stars whose parallax is at least ten times its error: the distance is 2.299 kpc, interval 2.291
             to 2.308 kpc.`,
      prompt: 'What do the two intervals say?',
      options: [
        'The cut did not matter: the two distances agree',
        'The second distance is better because the stars are more precise',
        'The first distance is wrong and the second is right',
        'The two intervals do not overlap: the cut moved the distance by more than the statistics allow, so a cut changes the answer, not only the number of stars',
      ],
      answer: 3,
      hints: [
        'Compare the upper end of the second interval with the lower end of the first.',
      ],
      because:
        'They do not overlap, 2.308 against 2.316, and the move is 0.025 kpc, three times the half-width of the first interval. Keeping stars by their measured parallax over error favours stars whose parallax came out high, so the distance falls. The cleaner sample is not the better one: it is a different one, and the panel’s intervals do not contain the move.',
      misconceptions: [
        {
          id: 'more-precise',
          option: 1,
          say: 'Each star is more precise, but the sample was chosen with the parallax itself, which pushes the mean one way. A precise answer to a biased question is still biased.',
        },
        {
          id: 'agree',
          option: 0,
          say: 'The intervals are 2.316 to 2.332 and 2.291 to 2.308 kpc: they do not touch.',
        },
      ],
      tool: SAMP({ poe: 10 }),
    },
    {
      sid: 'not-gaias-selection',
      stage: STAGE_S,
      type: 'question',
      kind: 'choice',
      title: 'What the panel’s cuts are not',
      body: `The panel’s cuts are the three a Gaia table’s rows carry: a magnitude, a parallax over error and RUWE. They
             are applied here to a dataset that already had two cuts of its own.`,
      prompt: 'What do these cuts not tell you?',
      options: [
        'How complete Gaia itself is: how likely a star of a given magnitude, color and place was to be observed and measured at all',
        'Which stars were in the dataset',
        'How many stars a cut removes',
        'What the diagram looks like after a cut',
      ],
      answer: 0,
      hints: ['Which of these four does the panel tell you directly?'],
      because:
        'Gaia’s own completeness. The panel counts what its three cuts remove from the stars in the dataset; it is not a model of how Gaia selects stars (crowding, scanning pattern, the magnitude at which the catalog thins). The dataset’s stars are only the ones Gaia measured, and a study of what Gaia did not see needs that selection, which is not built here.',
      tool: SAMP(),
    },
    {
      sid: 'what-you-worked-out',
      stage: STAGE_S,
      type: 'read',
      title: 'What you worked out',
      body: `A sample is the stars that passed its cuts. A magnitude limit removes the faint end of the diagram; a cut on
             parallax over error removes mostly faint stars too, but also those whose parallax was measured low, so
             the distance taken from what is left moves by more than its statistics. The cuts here are three that a
             table’s rows carry, not a model of Gaia’s own completeness.`,
      tool: SAMP(),
    },
  ],
};

export const WHAT_GAIA_DOES_NOT_SEE_DEEPER = {
  id: 'what-gaia-does-not-see',
  steps: [
    {
      sid: 'cuts-overlap',
      after: 'read-what-is-left',
      depth: 'quantitative',
      type: 'measure',
      title: 'Cuts overlap',
      body: `Switch on all three cuts: G below 16, parallax over error at least 5, and RUWE below 1.1. The panel says what
             each removes alone, and what it removes from the stars the earlier cuts left. Read the parallax-over-error
             cut’s two numbers.`,
      fields: [
        {
          id: 'alone',
          label: 'Removed by parallax over error alone',
          want: '189',
        },
        {
          id: 'after',
          label: 'Removed after the magnitude limit',
          want: '5',
        },
      ],
      validate: v => {
        if (![v.alone, v.after].every(Number.isFinite)) return null;
        if (v.alone === 189 && v.after === 5) {
          return {
            level: 'ok',
            message:
              'Alone it removes 189 stars; after G below 16 only 5. The cut overlaps the magnitude limit almost completely: the stars it would remove are the faint ones the first cut already took. Cuts are not additive, so the order matters for what a cut appears to do.',
          };
        }
        return {
          level: 'error',
          message:
            'Set G below 16, parallax over error at least 5 and RUWE below 1.10 and read the second cut’s line: “removed alone” and “of those the earlier cuts left”.',
        };
      },
      tool: SAMP({ mag: 16, poe: 5, ruwe: 1.1 }),
    },
    {
      sid: 'which-way-it-pushes',
      after: 'cuts-overlap',
      depth: 'quantitative',
      type: 'question',
      kind: 'choice',
      title: 'Which way a cut pushes',
      body: `The members’ mean parallax is 0.4303 mas with every cut off and 0.4349 mas with parallax over error at least 10.
             The distance falls from 2.324 to 2.299 kpc.`,
      prompt: 'Why does the cut raise the mean parallax?',
      options: [
        'The faint stars are farther away',
        'Brighter stars have larger parallaxes',
        'The zero point was applied twice',
        'The cut keeps the stars whose measured parallax came out high relative to their error, and discards some whose came out low',
      ],
      answer: 3,
      hints: [
        'The members share one true parallax. A cut on the measured parallax over its error treats a low measurement and a high one differently.',
      ],
      because:
        'A star with a large error can pass the cut only if its measured parallax is high; one whose measurement came out low fails it. The stars that remain at the faint end are the high ones, so their mean sits above the cluster’s true parallax. The members are at one distance, so neither brightness nor distance explains it, and the zero point is applied once, per star.',
      misconceptions: [
        {
          id: 'farther',
          option: 0,
          say: 'These stars are members of one cluster, at one distance with one true parallax. A star’s brightness does not change its distance.',
        },
      ],
      tool: SAMP({ poe: 10 }),
    },
    {
      sid: 'the-zero-point-under-cuts',
      after: 'which-way-it-pushes',
      depth: 'quantitative',
      type: 'measure',
      title: 'The zero point depends on the stars kept',
      body: `The zero point is a function of a star’s magnitude, color and latitude, so its mean over the stars kept
             depends on which stars they are. With every cut off the panel reads a mean zero point of −0.0368 mas. Keep
             only stars with parallax over error at least 10 and read it again.`,
      fields: [
        {
          id: 'zp',
          label: 'Mean zero point of the stars used',
          unit: 'mas',
          want: '-0.0417',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.zp)) return null;
        if (near(v.zp, -0.0417, 0.0015)) {
          return {
            level: 'ok',
            message:
              'The mean zero point is −0.0417 mas against −0.0368 with no cut: the correction applied to a sample is not a constant but follows the stars that were kept. That is why the correction is per star and why a quoted “−0.017 mas on average” cannot stand in for it.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the parallax-over-error minimum to 10 with the zero point per star on, and read the “Mean parallax of the members” line: its last number is the mean zero point.',
        };
      },
      tool: SAMP({ poe: 10 }),
    },
    {
      sid: 'the-velocity-scatter',
      after: 'the-zero-point-under-cuts',
      depth: 'quantitative',
      type: 'measure',
      title: 'Velocities at the cluster’s distance',
      body: `Switch the picture to velocities. At the cluster’s distance each member’s proper motion is a speed across the
             sky, 4.74 km/s per mas/yr at 1 kpc. With every cut off, read the scatter of the members’ velocities along right
             ascension. It includes the measurement errors, so it is an upper limit on how fast the stars move among themselves.`,
      fields: [
        {
          id: 'scatter',
          label: 'Scatter along right ascension',
          unit: 'km/s',
          want: '1.04',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.scatter)) return null;
        if (near(v.scatter, 1.04, 0.05)) {
          return {
            level: 'ok',
            message:
              'About 1.04 km/s along right ascension and 0.97 along declination. These include the proper-motion errors, so the stars’ real internal motion is smaller; the cluster hangs together to about a kilometre per second at 2.3 kpc.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose the velocities picture, with every cut off, and read the “Tangential velocities” line: the first of the two scatters.',
        };
      },
      tool: SAMP({ view: 1 }),
    },
    {
      sid: 'answer-a-colleague',
      after: 'the-velocity-scatter',
      depth: 'quantitative',
      type: 'question',
      kind: 'short',
      title: 'A colleague’s advice',
      body: `A colleague says: “use only the stars with parallax over error at least 10, the clean ones, for the
             cluster’s distance.”`,
      prompt:
        'Answer in a few sentences, with the numbers from the panel: what does that cut do to the distance, and why?',
      rubric:
        'Credit for the numbers (2.324 kpc with no cut and 2.299 with the cut; intervals 2.316 to 2.332 and 2.291 to 2.308 that do not overlap); for saying that selecting on the measured parallax over its error keeps high measurements and so lowers the distance; and for saying that a more precise sample is not a better one. Do not credit an answer that says the cut removes noise and so improves the answer.',
      rubricCriteria: [
        {
          name: 'States what the cut does to the distance',
          kind: 'correctness',
          levels: [
            {
              label: 'Full',
              points: 3,
              text: 'Says the distance falls from 2.324 to 2.299 kpc and that the two intervals do not overlap.',
            },
            {
              label: 'Partly',
              points: 1,
              text: 'Says the distance changes, without the numbers.',
            },
            {
              label: 'Not yet',
              points: 0,
              text: 'Says it does not change or that it improves.',
            },
          ],
        },
        {
          name: 'Gives the reason',
          kind: 'reasoning',
          levels: [
            {
              label: 'Full',
              points: 2,
              text: 'Says the cut is on the measured parallax, so it keeps high measurements, and a precise sample can still be biased.',
            },
            {
              label: 'Not yet',
              points: 0,
              text: 'Gives no reason, or says only that noise is removed.',
            },
          ],
        },
        {
          name: 'Uses the intervals correctly',
          kind: 'uncertainty',
          levels: [
            {
              label: 'Full',
              points: 2,
              text: 'Says the statistical intervals do not contain the move, and that there is still no systematic floor.',
            },
            {
              label: 'Not yet',
              points: 0,
              text: 'Treats the intervals as the whole uncertainty.',
            },
          ],
        },
        {
          name: 'Answers the colleague',
          kind: 'completion',
          levels: [
            {
              label: 'Full',
              points: 1,
              text: 'Replies to the advice in a few sentences.',
            },
            { label: 'Not yet', points: 0, text: 'Does not reply.' },
          ],
        },
      ],
      tool: SAMP({ poe: 10 }),
    },
    {
      sid: 'far-stars-need-to-be-bright',
      after: 'answer-a-colleague',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'Far stars need to be bright',
      body: `A magnitude limit passes a star by its apparent brightness. In the validation, a synthetic sample of identical
             stars spread uniformly in space and cut at a magnitude limit gave counts whose logarithm rises with the limit at a slope of
             0.600 per magnitude, the Euclidean value of 0.6 (leg S1).`,
      prompt: 'What does a magnitude limit do to the stars at large distance?',
      options: [
        'Nothing: distance and brightness are unrelated',
        'It keeps only the nearest stars of every kind',
        'It keeps only the intrinsically bright ones: a faint star passes only if it is near, so the sample is not complete in distance',
        'It makes every star in the sample the same brightness',
      ],
      answer: 2,
      hints: [
        'A star twice as far looks four times fainter. Which stars can still pass a fixed limit at twice the distance?',
      ],
      because:
        'Only the luminous ones. At a greater distance a star of a given luminosity is fainter, so past some distance only stars bright enough pass the limit and the sample thins by distance and luminosity together. A prior that assumes the sample is complete over a range of distance, as the one in the first investigation does, does not describe it.',
      tool: SAMP({ mag: 16 }),
    },
    {
      sid: 'the-diagram-changes-shape',
      after: 'far-stars-need-to-be-bright',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'The diagram changes shape',
      body: `Press “Bright stars only” (G below 15). The diagram keeps the turnoff, the giants and the top of the main
             sequence. A student counts stars in magnitude bins on this diagram to find the cluster’s luminosity function.`,
      prompt: 'What is wrong with that?',
      options: [
        'The counts stop at the limit: the faint main sequence is removed by a cut, not absent from the cluster, so the function is truncated',
        'Nothing: the stars left are a fair sample of the cluster',
        'The giants are counted twice',
        'Counting is not allowed on a color-magnitude diagram',
      ],
      answer: 0,
      hints: [
        'Where does the orange band of removed stars lie in the diagram?',
      ],
      because:
        'The faint end is missing because of the cut: 755 of 993 stars are gone. A luminosity function from this diagram falls to zero at the limit and says nothing about stars fainter than it. The shape of a diagram is a property of the sample and its selection as much as of the cluster.',
      tool: SAMP({ mag: 15 }),
    },
    {
      sid: 'what-the-pack-already-cut',
      after: 'the-diagram-changes-shape',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'A cut made before you saw the data',
      body: `The dataset’s own query held 1,048 stars brighter than G = 17.5 in the field and kept the 993 with RUWE below 1.4: it
             had already dropped 55. The panel’s RUWE slider starts at 1.4, so it does nothing there; moving it to 1.1
             removes 168 more.`,
      prompt: 'What does that tell you about a catalog sample?',
      options: [
        'The dataset is not Gaia’s data',
        'RUWE is not a real cut',
        'The panel’s RUWE cut at 1.1 is the first cut ever made on these stars',
        'Cuts accumulate: some were made before a study started, and the stars removed by them cannot be seen or counted here',
      ],
      answer: 3,
      hints: [
        'Which cut is the 55 the result of, and could you undo it in the panel?',
      ],
      because:
        'The first cut was made when the dataset was built. A study works with stars that had already passed several cuts, and the panel can add cuts but never remove one: the 55 with RUWE of 1.4 or more are not in the table. Saying what a sample is means listing every cut, including those made before the data reached you.',
      tool: SAMP({ ruwe: 1.1 }),
    },
    {
      sid: 'a-pack-that-gives-no-distance',
      after: 'what-the-pack-already-cut',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'A dataset that gives no distance',
      body: `Gravitas holds a second Gaia sample, stars near the Sun with radial velocities, but its parallaxes are
             rounded to 0.02 mas. In the validation, 80 percent of its 1,570 stars were rounded by more than a tenth of their
             parallax error (the largest rounding was 0.00999 mas; leg E3). The panel does not use it.`,
      prompt: 'Why is no distance taken from it?',
      options: [
        'Its stars are too close for parallax',
        'Rounding is a measurement error the catalog’s error does not contain, and for most of its stars it is a visible share of the error',
        'Radial velocities cannot be combined with parallaxes',
        'Its stars are too bright for Gaia',
      ],
      answer: 1,
      hints: [
        'What does rounding to 0.02 mas do to a parallax error of 0.01 mas?',
      ],
      because:
        'The rounding is an error of up to 0.01 mas that the quoted parallax error knows nothing about. For 80 percent of those stars it exceeds a tenth of the error, so a distance taken from the rounded value would carry an error the interval could not state. The cluster dataset is precise; this one is for velocities.',
      tool: SAMP(),
    },
    {
      sid: 'say-what-the-sample-is',
      after: 'a-pack-that-gives-no-distance',
      depth: 'advanced',
      type: 'question',
      kind: 'short',
      title: 'Say what the sample is',
      body: `Write the methods sentence for a distance to NGC 2420 taken from stars with parallax over error at least 10:
             what the stars are and every cut they passed, the zero point, and what the interval does and does not include.`,
      prompt:
        'Write the sentence, with the cuts, the number of stars, the distance and its labels.',
      rubric:
        'Credit for naming the dataset’s own cuts (G below 17.5, RUWE below 1.4, 55 dropped) and the added cut (parallax over error at least 10, 480 of 993 stars left); for the distance 2.299 kpc with a statistical interval of 2.291 to 2.308 labelled as statistics only with no systematic floor; for saying the zero point was applied per star with its own uncertainty not known here; and for saying the distance is not validated against a published catalog distance. Do not credit a sentence with no cuts.',
      rubricCriteria: [
        {
          name: 'Lists every cut',
          kind: 'completion',
          levels: [
            {
              label: 'Full',
              points: 2,
              text: 'Names the dataset’s cuts (G below 17.5, RUWE below 1.4) and the added one (parallax over error at least 10).',
            },
            {
              label: 'Not yet',
              points: 0,
              text: 'Names only the added cut, or none.',
            },
          ],
        },
        {
          name: 'States the distance with its labels',
          kind: 'correctness',
          levels: [
            {
              label: 'Full',
              points: 3,
              text: 'Gives 2.299 kpc, 2.291 to 2.308 as statistics only, no systematic floor.',
            },
            {
              label: 'Partly',
              points: 1,
              text: 'Gives the value without the labels.',
            },
            { label: 'Not yet', points: 0, text: 'Gives no value.' },
          ],
        },
        {
          name: 'Says what was not done',
          kind: 'reasoning',
          levels: [
            {
              label: 'Full',
              points: 2,
              text: 'Says the distance has not been checked against a published catalog distance, and that the zero point’s own uncertainty is not known.',
            },
            {
              label: 'Not yet',
              points: 0,
              text: 'Says nothing about validation.',
            },
          ],
        },
        {
          name: 'Says what the cut did',
          kind: 'uncertainty',
          levels: [
            {
              label: 'Full',
              points: 2,
              text: 'Says the cut moved the distance from 2.324 kpc by more than the statistical interval.',
            },
            { label: 'Not yet', points: 0, text: 'Does not say.' },
          ],
        },
      ],
      tool: SAMP({ poe: 10 }),
    },
  ],
};

// ---------------------------------------------------------------------------
// Español: sombras de las dos investigaciones, alineadas por índice con el inglés
// ---------------------------------------------------------------------------

export const HOW_FAR_AND_HOW_SURE_ES = {
  title: '¿A qué distancia y con cuánta seguridad?',
  subtitle:
    'Una paralaje mide uno entre la distancia, con un error: dibuja la verosimilitud, mira cuándo da una distancia y cuándo solo un límite, y qué hacen una distribución previa y un punto cero',
  objectives: [
    'Convertir una paralaje y su error en una distancia con un intervalo, y decir por qué el intervalo no es simétrico',
    'Decir cuándo una paralaje respalda una distancia y cuándo solo un límite inferior o nada, con la paralaje corregida sobre su error',
    'Decir qué significa una paralaje negativa y por qué se conserva en vez de tirarse',
    'Decir qué añade una distribución previa, qué supone sobre la muestra y qué hace el punto cero a una distancia',
  ],
  steps: {
    'a-parallax-is-not-a-distance': {
      title: 'Una paralaje no es una distancia',
      body: `Mientras la Tierra gira alrededor del Sol, una estrella cercana parece desplazarse contra las estrellas del fondo. La mitad de ese desplazamiento es su <strong>paralaje</strong>, y en milisegundos de arco es uno dividido entre la distancia en kiloparsecs. Una estrella a 2,5 kpc tiene una paralaje de 0,4 mas.\n\nPero Gaia mide la paralaje, no la distancia, y la mide con un <strong>error</strong>. Lo que se conoce es entonces una verosimilitud: cuánto concuerda cada distancia posible con el número medido. El panel dibuja esa verosimilitud para una paralaje y un error que fijas tú (son datos de entrada, no una estrella de Gaia). Su punto más alto es uno dividido entre la paralaje; su anchura es el error llevado a través de la división.`,
    },
    'commit-to-a-distance': {
      title: 'Compromete una distancia',
      body: `La paralaje de una estrella se mide como 0,40 mas, con un error de 0,05 mas. Antes de leer el panel, di dónde debería alcanzar su máximo la verosimilitud de su distancia.`,
      prompt: '¿Dónde alcanza su máximo la verosimilitud de la distancia?',
      options: [
        'En 0,4 kpc, la paralaje leída como distancia',
        'En 8 kpc, la paralaje dividida entre su error',
        'En 2,5 kpc, uno dividido entre la paralaje',
        'En 0,05 kpc, el error leído como distancia',
      ],
      hints: [
        'Una estrella a 1 kpc tiene una paralaje de 1 mas. ¿Qué distancia tiene una paralaje de 0,4 mas?',
      ],
      because:
        'En 2,5 kpc. Una paralaje es la inversa de una distancia, así que la distancia que mejor concuerda con 0,40 mas es uno dividido entre 0,40. El error no mueve el máximo; fija lo ancha que es la verosimilitud.',
    },
    'read-the-distance': {
      title: 'Lee la distancia y su intervalo',
      body: `Pon el panel en una paralaje de 0,40 mas y un error de 0,05 mas, sin distribución previa y sin punto cero. Lee la distancia según la verosimilitud y los dos extremos de su intervalo del 68 por ciento.`,
      fields: [
        { label: 'Distancia, el máximo de la verosimilitud' },
        { label: 'Extremo inferior del intervalo' },
        { label: 'Extremo superior del intervalo' },
      ],
    },
    'why-the-interval-leans': {
      title: 'Un intervalo que se inclina',
      body: `El intervalo va de 2,22 a 2,86 kpc alrededor de 2,5: llega 0,28 kpc por debajo y 0,36 por encima. El error de la paralaje es del mismo tamaño a ambos lados.`,
      prompt: '¿Por qué el intervalo es más largo en el lado lejano?',
      options: [
        'Gaia mide peor las estrellas débiles y lejanas',
        'El error de la distancia es 1 dividido entre el error de la paralaje, así que es igual a ambos lados',
        'Pasos iguales en paralaje son pasos desiguales en distancia: una paralaje menor es una distancia mayor',
        'El panel está sesgado hacia las distancias grandes',
      ],
      hints: [
        'Calcula la distancia con una paralaje 0,05 por encima y 0,05 por debajo de 0,40. ¿Son iguales los dos pasos desde 2,5?',
      ],
      because:
        'La paralaje es simétrica y la distancia no. Una paralaje de 0,35 mas son 2,86 kpc, un paso de 0,36 desde 2,5; una de 0,45 mas son 2,22 kpc, un paso de 0,28. Como la distancia va como uno entre la paralaje, un error del mismo tamaño a ambos lados es un paso más largo del lado de la paralaje menor.',
      misconceptions: [
        {
          say: 'El error es el mismo, 0,05 mas, a ambos lados. La inclinación es una propiedad de uno dividido entre la paralaje, no de lo bien que Gaia vio la estrella.',
        },
      ],
    },
    'try-the-controls': {
      title: 'Empeora la paralaje',
      body: `Sube el error de la paralaje y mira la verosimilitud. Luego prueba los botones «Señal baja» y «Paralaje negativa». Fíjate dónde tiene un máximo la verosimilitud, si cae a nada en el lado lejano y qué dicen las líneas de la derecha que respalda una paralaje.`,
      checklist: [
        'La verosimilitud se ensancha al subir el error, y su máximo sigue en uno dividido entre la paralaje',
        'Con «Señal baja» el intervalo no tiene extremo lejano: la verosimilitud nunca cae en el lado lejano',
        'Con «Paralaje negativa» hay una verosimilitud y ninguna distancia',
      ],
    },
    'when-it-is-too-faint': {
      title: 'Una paralaje tan grande como su error',
      body: `Pulsa «Señal baja»: una paralaje de 0,10 mas con un error de 0,10 mas, una paralaje corregida igual a su error. El panel dice qué respalda esto, y el intervalo no tiene extremo lejano.`,
      prompt: '¿Qué se puede decir de la distancia de esta estrella?',
      options: [
        'Está a 10 kpc, con una incertidumbre',
        'Está al menos a unos 5 kpc, y los datos no dan un extremo superior',
        'Está a 0,1 kpc',
        'Nada en absoluto: una paralaje tan pequeña no es un dato',
      ],
      hints: [
        'Lee el intervalo: empieza en un extremo inferior y dice que no tiene extremo lejano.',
      ],
      because:
        'El extremo inferior del intervalo del 68 por ciento es 5 kpc y la verosimilitud no cae a distancias grandes, así que la paralaje respalda un límite inferior, no una distancia medida. Uno dividido entre 0,10 son 10 kpc, el máximo de la verosimilitud, pero la curva es tan ancha que cualquier distancia mayor encaja casi igual de bien.',
      misconceptions: [
        {
          say: 'Uno dividido entre la paralaje es donde la verosimilitud alcanza su máximo, no una distancia con una incertidumbre: la curva está abierta por el lado lejano, así que los datos no pueden decir que la estrella no esté más lejos.',
        },
        {
          say: 'La paralaje sí dice algo: la estrella probablemente no está más cerca que el extremo inferior. Una medición con un error grande es una prueba débil, no la ausencia de prueba.',
        },
      ],
    },
    'a-negative-parallax': {
      title: 'Una paralaje negativa',
      body: `Pulsa «Paralaje negativa»: una paralaje medida de −0,10 mas con un error de 0,05 mas. Un catálogo puede contener un número así, porque una medición con ruido puede salir por debajo de cero para una estrella lejana.`,
      prompt: '¿Qué da el panel para esta estrella, y por qué?',
      options: [
        'Una distancia de −10 kpc, que un estudiante debe ignorar',
        'Una distancia de cero: la estrella está en el Sol',
        'La estrella se rechaza por mala medición',
        'Una verosimilitud y ninguna distancia: la paralaje corregida no es positiva, así que uno dividido entre ella no es una distancia',
      ],
      hints: ['Lee la línea que dice qué respalda la paralaje.'],
      because:
        'Una verosimilitud y ninguna distancia. Uno dividido entre un número negativo no es una distancia, así que el panel dibuja la verosimilitud y dice que no hay nada que dar. La estrella no es mala: su medición dice solo que está lejos, o que el ruido fue en contra. Tirar las paralajes negativas recortaría la mitad ruidosa de una muestra y sesgaría lo que queda.',
      misconceptions: [
        {
          say: 'No existe una distancia negativa. El panel no la inventa: dibuja la verosimilitud y dice que no hay distancia.',
        },
        {
          say: 'Una paralaje negativa es una medición honesta con ruido. Rechazarla tira la información de que la estrella es débil en paralaje, y sesga la muestra.',
        },
      ],
    },
    'what-you-worked-out': {
      title: 'Lo que averiguaste',
      body: `Una paralaje es uno sobre una distancia, medida con un error. Lo que respalda es una verosimilitud: un máximo en uno dividido entre la paralaje corregida, un intervalo que se inclina hacia el lado lejano, un límite inferior cuando la paralaje no es mayor que su error, y nada más que la verosimilitud cuando no es positiva. Una distancia puntual necesita una paralaje corregida de al menos cinco veces su error. Aquí no se corrigió nada más allá de los números que fijaste.`,
    },
  },
};

export const HOW_FAR_AND_HOW_SURE_DEEPER_ES = {
  steps: {
    'the-relative-error': {
      title: 'El error de la distancia',
      body: `Para la paralaje de 0,40 mas con un error de 0,05 mas, el panel dice que la paralaje corregida es un número de veces su error. El error relativo de la distancia es igual al error relativo de la paralaje. Dalo en porcentaje.`,
      fields: [{ label: 'Error de la paralaje como parte de la paralaje' }],
    },
    'where-the-threshold-falls': {
      title: 'Dónde cae el umbral',
      body: `Una distancia puntual necesita una paralaje corregida de al menos cinco veces su error. Deja la paralaje en 0,40 mas y sube el error paso a paso (el deslizador avanza de 0,01 en 0,01 mas), y lee qué dice el panel que respalda.`,
      prompt:
        '¿Con qué error deja 0,40 mas de respaldar una distancia puntual?',
      options: [
        'Por encima de 0,04 mas',
        'Por encima de 0,08 mas',
        'Por encima de 0,20 mas',
        'Nunca, porque 0,40 es positivo',
      ],
      hints: ['Cinco veces el error no debe superar 0,40.'],
      because:
        'Por encima de 0,08 mas: 0,40 dividido entre 0,08 es 5, y con 0,09 el cociente es 4,4 y el panel dice señal baja. El umbral de cinco es una elección declarada, no una ley de la naturaleza; por debajo, la distancia es el máximo de una verosimilitud ancha y no una medición.',
    },
    'an-interval-with-no-far-end': {
      title: 'Un intervalo sin extremo lejano',
      body: `Pulsa «Señal baja» (0,10 mas, error 0,10 mas) y lee el extremo inferior del intervalo del 68 por ciento. Luego sube la paralaje a 0,15 mas y lee ambos extremos.`,
      fields: [
        { label: 'Extremo inferior con 0,10 mas' },
        { label: 'Extremo superior con 0,15 mas' },
      ],
    },
    'from-parallax-to-speed': {
      title: 'De una paralaje a una velocidad',
      body: `El movimiento propio de una estrella es de 5 mas/año. A una distancia, ese ángulo por año es una velocidad a través del cielo: 4,74 km/s por cada mas/año a 1 kpc. Pon la paralaje en 0,40 mas con un error de 0,05 mas y el movimiento propio en 5,0 mas/año, y lee la velocidad tangencial y su intervalo.`,
      fields: [
        { label: 'Velocidad tangencial' },
        { label: 'Extremo inferior del intervalo' },
        { label: 'Extremo superior del intervalo' },
      ],
    },
    'why-one-over-p-is-biased': {
      title: 'Promediar uno entre la paralaje',
      body: `La validación sorteó muchas paralajes con ruido de estrellas a una misma distancia verdadera y promedió uno entre cada una. Con una paralaje cinco veces su error la media salió 1,043 veces la distancia verdadera; con diez veces, 1,010; con veinte, 1,003. La mediana de uno entre la paralaje, con veinte veces, fue 1,00007 de la distancia verdadera (tramo A1 de GAIA_WORKFLOWS.md).`,
      prompt: '¿Qué dice esto?',
      options: [
        'Las paralajes de Gaia están sesgadas al alza',
        'Uno entre la paralaje nunca es un buen estimador de la distancia',
        'El sesgo es el punto cero',
        'La media de uno entre una paralaje con ruido está sesgada al alza, en una proporción que baja al crecer la paralaje frente a su error, y la mediana no',
      ],
      hints: [
        '¿Cuál de las dos, la media o la mediana, se quedó en 1,000 con veinte veces? ¿Qué hace la proporción al subir el cociente?',
      ],
      because:
        'El sesgo está en el promedio de uno entre p, no en p. Una p con ruido a veces sale pequeña, y uno entre una p pequeña es una distancia enorme; el promedio sube por esas, un 4,3 por ciento con un cociente de cinco y un 0,25 por ciento con veinte. La mediana no sube. Es una propiedad de la inversión, así que se declara y se muestra, y no se aplica ninguna corrección general a ninguna muestra.',
      misconceptions: [
        {
          say: 'Las paralajes aquí se sortearon sin ningún sesgo. El sesgo viene de tomar uno entre un número con ruido.',
        },
        {
          say: 'El punto cero es un desfase de la medición y es otro asunto (más adelante). Este sesgo está ahí sin punto cero alguno.',
        },
      ],
    },
    'justify-a-report': {
      title: 'Informa una distancia',
      body: `Un catálogo lista una estrella con una paralaje de 0,10 mas y un error de 0,10 mas, y un estudiante escribe «la estrella está a 10 kpc».`,
      prompt:
        'Di qué falla en esa frase, y escribe qué respalda en cambio la paralaje, con números del panel.',
      rubric:
        'Crédito por decir que 10 kpc es uno entre la paralaje, el máximo de una verosimilitud muy ancha, y no una distancia medida; por el extremo inferior de unos 5 kpc y el extremo lejano que falta; y por dar la paralaje corregida sobre su error (1) frente al umbral (5). No se da crédito a una respuesta que solo diga que el error es grande.',
      rubricCriteria: [
        {
          name: 'Dice qué falla en el número único',
          levels: [
            {
              label: 'Completo',
              text: 'Dice que 10 kpc es solo donde la verosimilitud alcanza su máximo, la curva está abierta por el lado lejano y la paralaje respalda un límite inferior.',
            },
            {
              label: 'En parte',
              text: 'Dice que el error es grande o el número incierto, sin decir por qué el lado lejano está abierto.',
            },
            {
              label: 'Aún no',
              text: 'Acepta 10 kpc, o lo sustituye por otra distancia única.',
            },
          ],
        },
        {
          name: 'Escribe lo que se respalda',
          levels: [
            {
              label: 'Completo',
              text: 'Escribe que la estrella probablemente está al menos a 5 kpc, sin extremo superior con estos datos.',
            },
            { label: 'Aún no', text: 'No escribe ningún límite.' },
          ],
        },
        {
          name: 'Usa los números del panel',
          levels: [
            {
              label: 'Completo',
              text: 'Da la paralaje corregida sobre su error (1) y la compara con el umbral de 5.',
            },
            { label: 'Aún no', text: 'No da ningún número del panel.' },
          ],
        },
        {
          name: 'Responde lo que se pide',
          levels: [
            { label: 'Completo', text: 'Atiende las dos partes.' },
            { label: 'Aún no', text: 'Atiende una parte.' },
          ],
        },
      ],
    },
    'add-a-prior': {
      title: 'Añade una distribución previa',
      body: `Pulsa «Señal baja» y activa la distribución previa, con una longitud de escala de 1 kpc. La previa dice cómo se reparten las estrellas a lo largo de la línea de visión: aquí una densidad espacial que decrece como exp(−r ÷ L). Lee la mediana de la posterior y su intervalo del 68 por ciento.`,
      fields: [
        { label: 'Mediana posterior' },
        { label: 'Extremo inferior' },
        { label: 'Extremo superior' },
      ],
    },
    'double-the-scale-length': {
      title: 'Cambia lo que dice la previa',
      body: `Ahora cambia la longitud de escala de 1 a 2 kpc y vuelve a leer el intervalo: su extremo superior pasa de 6,93 a 10,81 kpc. La validación midió lo mismo: con una paralaje corregida igual a su error, duplicar la longitud de escala movió el extremo superior en un factor de 1,56 (tramo D3).`,
      prompt:
        '¿Qué significa esto para una estrella con una paralaje tan débil?',
      options: [
        'La respuesta es de la paralaje, y la previa solo adorna',
        'La previa debe elegirse para dar el intervalo más corto',
        'La respuesta es tanto de la previa como de la paralaje: se mueve cuando se mueve la escala de la previa',
        'La longitud de escala de 1 kpc es correcta y la de 2 kpc es errónea',
      ],
      hints: ['¿Qué cambió entre las dos lecturas: los datos o la previa?'],
      because:
        'Los datos no cambiaron; cambió la previa, y el intervalo se movió en más de la mitad. Cuando la paralaje es débil la posterior es sobre todo la previa, por eso el panel dice dominada por la previa. Elegir la longitud de escala para obtener un intervalo ordenado metería la respuesta a mano, y no se sabe que ninguna de las dos sea la correcta para esta estrella.',
      misconceptions: [
        {
          say: 'Compara los dos intervalos: el extremo superior pasó de 6,93 a 10,81 kpc con los datos sin cambiar. Aquí la previa no es un adorno.',
        },
      ],
    },
    'when-the-data-win': {
      title: 'Cuando ganan los datos',
      body: `Pulsa «Bien medida» (0,40 mas, error 0,02 mas, una paralaje corregida veinte veces su error) y activa la distribución previa. Cambia la longitud de escala entre 1 y 2 kpc y mira la mediana.`,
      prompt: '¿Qué le pasa a la mediana posterior?',
      options: [
        'Casi no se mueve: la verosimilitud es estrecha y la previa es casi plana a lo ancho',
        'Se mueve en la mitad, como con la paralaje débil',
        'Se mueve al máximo de la previa',
        'La previa se ignora y el intervalo no cambia ni en la última cifra',
      ],
      hints: [
        'Compara la anchura de la verosimilitud con la escala en que cambia la previa.',
      ],
      because:
        'La mediana pasa de 2,509 a 2,517 kpc, un tercio de uno por ciento. Una verosimilitud estrecha cae donde la previa es casi plana, así que cualquier longitud de escala razonable da casi la misma respuesta. Una previa importa en proporción a lo poco que dice la paralaje, por eso una distancia puntual necesita cinco veces el error.',
    },
    'what-the-prior-assumes': {
      title: 'Qué supone la previa',
      body: `La previa se declara junto a la verosimilitud: las estrellas muestreadas tienen una densidad espacial que decrece como exp(−r ÷ L), y la muestra es completa en las distancias dibujadas. Un estudiante la aplica a estrellas elegidas porque su paralaje sobre error supera 5. En la validación, una previa con la escala equivocada (1 kpc para estrellas que en realidad decrecen en 3) dio intervalos del 68 por ciento que cubrieron entre el 22 y el 42 por ciento de las estrellas (tramo C4, registrado sin aprobado ni suspenso).`,
      prompt: '¿Qué falla al aplicar la previa a esa muestra?',
      options: [
        'Nada: una previa siempre es mejor que ninguna',
        'La previa solo vale para estrellas más brillantes que una magnitud',
        'Daría los intervalos correctos pero las medianas erróneas',
        'Un corte en la paralaje reduce la muestra según la distancia, así que la muestra no es completa y la previa declarada no es la de la muestra',
      ],
      hints: [
        '¿Qué estrellas quita primero un corte en paralaje sobre error, las cercanas o las lejanas?',
      ],
      because:
        'Un corte en paralaje sobre error quita primero las estrellas lejanas, así que la muestra no es la población que describe la previa, y el nivel declarado del intervalo ya no es lo que cubre. La validación mostró lo que cuesta una escala equivocada: intervalos del 68 por ciento que cubrieron del 22 al 42 por ciento. Un corte cambia la previa; el panel lo dice, y no puede repararlo.',
      misconceptions: [
        {
          say: 'Una previa que no describe la muestra mueve la respuesta hacia algo falso. En la validación, intervalos pensados para cubrir el 68 por ciento cubrieron hasta solo el 22 por ciento.',
        },
      ],
    },
    'the-zero-point': {
      title: 'El punto cero',
      body: `Las paralajes de Gaia tienen un pequeño desfase, el <strong>punto cero</strong>, que depende de la magnitud, el color y la posición en el cielo de una estrella; es negativo, así que la paralaje del catálogo es demasiado pequeña. Pulsa «Bien medida», pon el desfase del punto cero en −0,040 mas (un valor cercano al que necesitan las estrellas de NGC 2420, más abajo) y lee la nueva distancia.`,
      fields: [{ label: 'Distancia con el punto cero' }],
    },
    'the-cluster-and-the-zero-point': {
      title: 'Un cúmulo, con y sin',
      body: `El segundo panel contiene las 993 estrellas de Gaia del cúmulo abierto NGC 2420. Sus miembros (estrellas cuyo movimiento propio por sí solo las pone en el cúmulo con probabilidad 0,9 o más) tienen una paralaje media y, con el punto cero de cada estrella aplicado, una distancia. Lee la distancia con el punto cero activado, luego desactiva el punto cero por estrella y léela otra vez.`,
      fields: [
        { label: 'Distancia con el punto cero' },
        { label: 'Distancia sin él' },
      ],
    },
    'what-the-interval-leaves-out': {
      title: 'Di qué es la distancia',
      body: `La distancia corregida del cúmulo es 2,324 kpc con un intervalo estadístico de 2,316 a 2,332 kpc. Ese intervalo no tiene suelo sistemático. El tramo de la validación que comprobaría la distancia con la de un catálogo publicado basado en Gaia (E1) no se ejecutó: la tabla que necesita, Hunt y Reffert 2023, no pudo obtenerse. Los valores de la literatura en la validación van de 2,48 kpc (fotometría, convertida de un módulo de distancia) a 2,59 (Gaia DR2); una paralaje de DR3 tal como se imprimió, sin punto cero, da 2,78 kpc.`,
      prompt:
        'Escribe la frase que pondrías en un informe para esta distancia, con sus etiquetas, y di qué no se ha hecho.',
      rubric:
        'Crédito por 2,324 kpc con el intervalo estadístico de 2,316 a 2,332 rotulado como solo estadístico y sin suelo sistemático; por decir que aquí no se conoce la incertidumbre del propio punto cero; por decir que la distancia no se ha validado con la de un catálogo publicado (E1 NO SE EJECUTÓ) y queda por debajo de los valores de la literatura listados; y por no llamarlo concordancia. No se da crédito a una frase que dé 2,324 kpc como la distancia del cúmulo sin etiqueta.',
      rubricCriteria: [
        {
          name: 'Da el valor con sus etiquetas',
          levels: [
            {
              label: 'Completo',
              text: 'Da 2,324 kpc, el intervalo de 2,316 a 2,332 kpc como solo estadístico, y ningún suelo sistemático.',
            },
            {
              label: 'En parte',
              text: 'Da el valor y el intervalo sin decir qué deja fuera el intervalo.',
            },
            { label: 'Aún no', text: 'Da el valor sin etiqueta.' },
          ],
        },
        {
          name: 'Dice qué no se ha hecho',
          levels: [
            {
              label: 'Completo',
              text: 'Dice que la distancia no está validada con un catálogo publicado y que el tramo E1 no se ejecutó.',
            },
            { label: 'Aún no', text: 'Afirma concordancia con la literatura.' },
          ],
        },
        {
          name: 'La sitúa entre los otros valores',
          levels: [
            {
              label: 'Completo',
              text: 'Dice que queda por debajo de toda distancia de las fuentes listadas, incluido el extremo inferior de la paralaje de DR3 impresa (2,38 kpc), y no lo llama concordancia.',
            },
            { label: 'Aún no', text: 'No la compara.' },
          ],
        },
        {
          name: 'Escribe una frase para un informe',
          levels: [
            {
              label: 'Completo',
              text: 'Escribe una frase que podría valer por sí sola.',
            },
            { label: 'Aún no', text: 'Lista puntos sin una frase.' },
          ],
        },
      ],
    },
  },
};

export const WHAT_GAIA_DOES_NOT_SEE_ES = {
  title: 'Lo que Gaia no ve',
  subtitle:
    'Los cortes de magnitud, paralaje sobre error y RUWE deciden qué estrellas contiene una muestra de Gaia: mira cómo cambian el diagrama color-magnitud y la distancia del cúmulo al quitar estrellas',
  objectives: [
    'Decir que una muestra de un catálogo son las estrellas que pasaron sus cortes, y leer lo que cada corte quita de las estrellas de NGC 2420',
    'Decir qué parte de un diagrama color-magnitud quitan un límite de magnitud y un corte de paralaje sobre error',
    'Decir que un corte en la paralaje mueve la distancia tomada de las estrellas que quedan, y que el intervalo no contiene ese movimiento',
    'Decir qué hace un corte a los supuestos de una previa, y qué no son los cortes del panel: la selección real de Gaia',
  ],
  steps: {
    'a-sample-is-what-passed': {
      title: 'Una muestra es lo que pasó sus cortes',
      body: `Ningún catálogo contiene todas las estrellas. NGC 2420 es un cúmulo abierto viejo, y el paquete contiene 993 estrellas de Gaia en su campo: estrellas más brillantes que G = 17,5 cuya solución astrométrica fue lo bastante buena (RUWE menor que 1,4; esa consulta descartó otras 55 antes de que vieras nada). Luego cada estudio añade cortes propios, y las estrellas que quedan son la muestra.\n\nEl panel te deja añadir tres cortes: un límite de magnitud, un mínimo de paralaje sobre su error y un límite de RUWE. El diagrama muestra las estrellas conservadas (miembros en azul, otras en gris) y las quitadas (naranja); las líneas de la derecha dicen qué quitó cada corte y qué queda.`,
    },
    'commit-to-a-cut': {
      title: 'Compromete un corte',
      body: `Antes de mover un deslizador: pon el límite de magnitud en G menor que 16, un corte que conserva solo las estrellas más brillantes que la magnitud 16. La mayoría de las estrellas del paquete son débiles, porque las estrellas más débiles son más numerosas.`,
      prompt: '¿Cuánto del paquete quita G menor que 16, más o menos?',
      options: [
        'Una décima parte',
        'La mitad',
        'Nueve décimas partes',
        'Nada: toda estrella del paquete es más brillante que 17,5',
      ],
      hints: [
        'El paquete va de G de unos 9 a 17,5, y el número de estrellas crece mucho hacia el extremo débil.',
      ],
      because:
        'La mitad: 526 de 993. Las estrellas aumentan en número hacia las magnitudes más débiles, así que un corte en 16 quita la mitad débil del paquete aunque esté 1,5 magnitudes por encima del límite con el que se hizo.',
    },
    'read-what-is-left': {
      title: 'Lee lo que queda',
      body: `Aprieta el límite de magnitud a G menor que 15. Lee cuántas estrellas quita el corte del paquete y cuántas quedan.`,
      fields: [
        { label: 'Estrellas quitadas por el corte' },
        { label: 'Estrellas que quedan' },
      ],
    },
    'which-stars-go': {
      title: 'Qué estrellas se van',
      body: `Mira el diagrama con G menor que 15. Los puntos naranja son las estrellas que quitó el corte.`,
      prompt: '¿Qué parte del diagrama del cúmulo quita un límite de magnitud?',
      options: [
        'Las gigantes rojas, que son raras',
        'Una banda de colores, sea cual sea la magnitud',
        'El extremo débil de la secuencia principal: las estrellas de menor masa, que son numerosas',
        'Estrellas al azar por todo el diagrama',
      ],
      hints: [
        'En este diagrama lo más brillante está arriba. ¿Dónde están las estrellas quitadas?',
      ],
      because:
        'El extremo débil de la secuencia principal. Un límite de magnitud es una línea horizontal a través del diagrama, así que quita todo lo que queda debajo: las estrellas de menor masa, que son las más numerosas. Lo que queda es el desvío, las gigantes y la parte alta de la secuencia principal. El diagrama de una muestra recortada es otro diagrama.',
      misconceptions: [
        {
          say: 'Las gigantes son brillantes: un límite en el extremo débil no puede quitarlas primero. Mira dónde están los puntos naranja.',
        },
      ],
    },
    'a-cut-on-parallax-over-error': {
      title: 'Un corte en paralaje sobre error',
      body: `Restablece el límite de magnitud y conserva solo las estrellas cuya paralaje es al menos diez veces su error. El panel dice que se quitan 513 de 993 estrellas. Su magnitud media es 16,7 y la de las conservadas, 14,9.`,
      prompt:
        '¿Por qué un corte en paralaje sobre error quita sobre todo estrellas débiles?',
      options: [
        'Las estrellas débiles tienen errores de paralaje mayores, así que el cociente es menor',
        'Las estrellas débiles tienen paralajes menores',
        'Gaia no ve estrellas más débiles que 16',
        'El corte es de magnitud disfrazado, y nada más',
      ],
      hints: [
        'Todas las estrellas de un cúmulo tienen casi la misma paralaje verdadera. ¿Qué cambia de una estrella a otra?',
      ],
      because:
        'El error. Las estrellas de un cúmulo están a una distancia y tienen una paralaje verdadera, así que el cociente cambia de una estrella a otra porque cambia el error: crece hacia las magnitudes débiles. Un corte en paralaje sobre error es aquí casi un corte de magnitud, pero no lo mismo: también quita estrellas cuya paralaje se midió baja.',
      misconceptions: [
        {
          say: 'Estas estrellas están a una distancia, así que comparten una paralaje verdadera. Ser débil no hace menor una paralaje; hace mayor su error.',
        },
      ],
    },
    'the-distance-moves': {
      title: 'La distancia se mueve',
      body: `Con todos los cortes desactivados la distancia del cúmulo es 2,324 kpc, con un intervalo estadístico de 2,316 a 2,332 kpc. Ahora conserva solo las estrellas cuya paralaje es al menos diez veces su error: la distancia es 2,299 kpc, intervalo de 2,291 a 2,308 kpc.`,
      prompt: '¿Qué dicen los dos intervalos?',
      options: [
        'El corte no importó: las dos distancias concuerdan',
        'La segunda distancia es mejor porque las estrellas son más precisas',
        'La primera distancia es errónea y la segunda es correcta',
        'Los dos intervalos no se solapan: el corte movió la distancia más de lo que permite la estadística, así que un corte cambia la respuesta, no solo el número de estrellas',
      ],
      hints: [
        'Compara el extremo superior del segundo intervalo con el inferior del primero.',
      ],
      because:
        'No se solapan, 2,308 frente a 2,316, y el movimiento es de 0,025 kpc, tres veces la semianchura del primer intervalo. Conservar estrellas por su paralaje sobre error medidos favorece a las estrellas cuya paralaje salió alta, así que la distancia baja. La muestra más limpia no es la mejor: es otra, y los intervalos del panel no contienen el movimiento.',
      misconceptions: [
        {
          say: 'Cada estrella es más precisa, pero la muestra se eligió con la propia paralaje, lo que empuja la media en un sentido. Una respuesta precisa a una pregunta sesgada sigue sesgada.',
        },
        {
          say: 'Los intervalos son de 2,316 a 2,332 y de 2,291 a 2,308 kpc: no se tocan.',
        },
      ],
    },
    'not-gaias-selection': {
      title: 'Lo que no son los cortes del panel',
      body: `Los cortes del panel son los tres que llevan las filas de una tabla de Gaia: una magnitud, una paralaje sobre error y el RUWE. Se aplican aquí a un paquete que ya tenía dos cortes propios.`,
      prompt: '¿Qué no te dicen estos cortes?',
      options: [
        'Qué tan completo es el propio Gaia: qué probabilidad tenía una estrella de cierta magnitud, color y posición de ser observada y medida',
        'Qué estrellas estaban en el paquete',
        'Cuántas estrellas quita un corte',
        'Cómo queda el diagrama tras un corte',
      ],
      hints: ['¿Cuál de estas cuatro te dice directamente el panel?'],
      because:
        'La completitud del propio Gaia. El panel cuenta lo que sus tres cortes quitan de las estrellas del paquete; no es un modelo de cómo selecciona Gaia las estrellas (aglomeración, patrón de barrido, la magnitud a la que el catálogo se vuelve ralo). Las estrellas del paquete son solo las que Gaia midió, y estudiar lo que Gaia no vio necesita esa selección, que aquí no está construida.',
    },
    'what-you-worked-out': {
      title: 'Lo que averiguaste',
      body: `Una muestra son las estrellas que pasaron sus cortes. Un límite de magnitud quita el extremo débil del diagrama; un corte en paralaje sobre error quita también sobre todo estrellas débiles, pero además las de paralaje medida baja, así que la distancia tomada de lo que queda se mueve más que su estadística. Los cortes de aquí son tres que llevan las filas de una tabla, no un modelo de la completitud propia de Gaia.`,
    },
  },
};

export const WHAT_GAIA_DOES_NOT_SEE_DEEPER_ES = {
  steps: {
    'cuts-overlap': {
      title: 'Los cortes se solapan',
      body: `Activa los tres cortes: G menor que 16, paralaje sobre error de al menos 5 y RUWE menor que 1,1. El panel dice qué quita cada uno por sí solo y qué quita de las estrellas que dejaron los cortes anteriores. Lee los dos números del corte de paralaje sobre error.`,
      fields: [
        { label: 'Quitadas solo por paralaje sobre error' },
        { label: 'Quitadas tras el límite de magnitud' },
      ],
    },
    'which-way-it-pushes': {
      title: 'En qué sentido empuja un corte',
      body: `La paralaje media de los miembros es 0,4303 mas con todos los cortes desactivados y 0,4349 mas con paralaje sobre error de al menos 10. La distancia baja de 2,324 a 2,299 kpc.`,
      prompt: '¿Por qué el corte sube la paralaje media?',
      options: [
        'Las estrellas débiles están más lejos',
        'Las estrellas más brillantes tienen paralajes mayores',
        'El punto cero se aplicó dos veces',
        'El corte conserva las estrellas cuya paralaje medida salió alta respecto de su error, y descarta algunas cuya paralaje salió baja',
      ],
      hints: [
        'Los miembros comparten una paralaje verdadera. Un corte en la paralaje medida sobre su error trata distinto una medición baja y una alta.',
      ],
      because:
        'Una estrella con un error grande solo puede pasar el corte si su paralaje medida es alta; una cuya medición salió baja lo suspende. Las estrellas que quedan en el extremo débil son las altas, así que su media queda por encima de la paralaje verdadera del cúmulo. Los miembros están a una distancia, así que ni el brillo ni la distancia lo explican, y el punto cero se aplica una vez, por estrella.',
      misconceptions: [
        {
          say: 'Estas estrellas son miembros de un cúmulo, a una distancia con una paralaje verdadera. El brillo de una estrella no cambia su distancia.',
        },
      ],
    },
    'the-zero-point-under-cuts': {
      title: 'El punto cero depende de las estrellas que se conservan',
      body: `El punto cero es función de la magnitud, el color y la latitud de una estrella, así que su media sobre las estrellas conservadas depende de cuáles sean. Con todos los cortes desactivados el panel lee un punto cero medio de −0,0368 mas. Conserva solo las estrellas con paralaje sobre error de al menos 10 y léelo otra vez.`,
      fields: [{ label: 'Punto cero medio de las estrellas usadas' }],
    },
    'the-velocity-scatter': {
      title: 'Velocidades a la distancia del cúmulo',
      body: `Cambia la imagen a velocidades. A la distancia del cúmulo el movimiento propio de cada miembro es una velocidad a través del cielo, 4,74 km/s por mas/año a 1 kpc. Con todos los cortes desactivados, lee la dispersión de las velocidades de los miembros según la ascensión recta. Incluye los errores de medida, así que es un límite superior de la rapidez con que se mueven las estrellas entre sí.`,
      fields: [{ label: 'Dispersión según la ascensión recta' }],
    },
    'answer-a-colleague': {
      title: 'El consejo de un colega',
      body: `Un colega dice: «usa solo las estrellas con paralaje sobre error de al menos 10, las limpias, para la distancia del cúmulo».`,
      prompt:
        'Responde en pocas frases, con los números del panel: ¿qué le hace ese corte a la distancia, y por qué?',
      rubric:
        'Crédito por los números (2,324 kpc sin corte y 2,299 con el corte; intervalos de 2,316 a 2,332 y de 2,291 a 2,308 que no se solapan); por decir que seleccionar por la paralaje medida sobre su error conserva mediciones altas y por tanto baja la distancia; y por decir que una muestra más precisa no es una muestra mejor. No se da crédito a una respuesta que diga que el corte quita ruido y por tanto mejora la respuesta.',
      rubricCriteria: [
        {
          name: 'Dice qué hace el corte a la distancia',
          levels: [
            {
              label: 'Completo',
              text: 'Dice que la distancia baja de 2,324 a 2,299 kpc y que los dos intervalos no se solapan.',
            },
            {
              label: 'En parte',
              text: 'Dice que la distancia cambia, sin los números.',
            },
            { label: 'Aún no', text: 'Dice que no cambia o que mejora.' },
          ],
        },
        {
          name: 'Da la razón',
          levels: [
            {
              label: 'Completo',
              text: 'Dice que el corte es en la paralaje medida, así que conserva mediciones altas, y que una muestra precisa puede seguir sesgada.',
            },
            {
              label: 'Aún no',
              text: 'No da razón, o dice solo que se quita ruido.',
            },
          ],
        },
        {
          name: 'Usa bien los intervalos',
          levels: [
            {
              label: 'Completo',
              text: 'Dice que los intervalos estadísticos no contienen el movimiento, y que sigue sin haber suelo sistemático.',
            },
            {
              label: 'Aún no',
              text: 'Trata los intervalos como toda la incertidumbre.',
            },
          ],
        },
        {
          name: 'Responde al colega',
          levels: [
            { label: 'Completo', text: 'Contesta al consejo en pocas frases.' },
            { label: 'Aún no', text: 'No contesta.' },
          ],
        },
      ],
    },
    'far-stars-need-to-be-bright': {
      title: 'Las estrellas lejanas deben ser brillantes',
      body: `Un límite de magnitud deja pasar una estrella por su brillo aparente. En la validación, una muestra sintética de estrellas idénticas repartidas uniformemente en el espacio y recortadas en un límite de magnitud dio recuentos cuyo logaritmo crece con el límite con una pendiente de 0,600 por magnitud, el valor euclídeo de 0,6 (tramo S1).`,
      prompt:
        '¿Qué le hace un límite de magnitud a las estrellas a gran distancia?',
      options: [
        'Nada: la distancia y el brillo no están relacionados',
        'Conserva solo las estrellas más cercanas de todo tipo',
        'Conserva solo las intrínsecamente brillantes: una estrella débil pasa solo si está cerca, así que la muestra no es completa en distancia',
        'Hace que toda estrella de la muestra tenga el mismo brillo',
      ],
      hints: [
        'Una estrella al doble de distancia parece cuatro veces más débil. ¿Qué estrellas pueden seguir pasando un límite fijo al doble de distancia?',
      ],
      because:
        'Solo las luminosas. A mayor distancia una estrella de cierta luminosidad es más débil, así que pasada cierta distancia solo pasan el límite las estrellas bastante brillantes y la muestra se vuelve rala por distancia y luminosidad a la vez. Una previa que supone que la muestra es completa en un intervalo de distancias, como la de la primera investigación, no la describe.',
    },
    'the-diagram-changes-shape': {
      title: 'El diagrama cambia de forma',
      body: `Pulsa «Solo estrellas brillantes» (G menor que 15). El diagrama conserva el desvío, las gigantes y la parte alta de la secuencia principal. Un estudiante cuenta estrellas por intervalos de magnitud en este diagrama para hallar la función de luminosidad del cúmulo.`,
      prompt: '¿Qué falla en eso?',
      options: [
        'Los recuentos terminan en el límite: la secuencia principal débil la quitó un corte, no falta en el cúmulo, así que la función queda truncada',
        'Nada: las estrellas que quedan son una muestra justa del cúmulo',
        'Las gigantes se cuentan dos veces',
        'No se permite contar en un diagrama color-magnitud',
      ],
      hints: [
        '¿Dónde queda la banda naranja de estrellas quitadas en el diagrama?',
      ],
      because:
        'El extremo débil falta por el corte: se han ido 755 de 993 estrellas. Una función de luminosidad sacada de este diagrama cae a cero en el límite y no dice nada de estrellas más débiles. La forma de un diagrama es una propiedad de la muestra y de su selección tanto como del cúmulo.',
    },
    'what-the-pack-already-cut': {
      title: 'Un corte hecho antes de ver los datos',
      body: `La consulta del propio paquete tenía 1.048 estrellas más brillantes que G = 17,5 en el campo y conservó las 993 con RUWE menor que 1,4: ya había descartado 55. El deslizador de RUWE del panel empieza en 1,4, así que ahí no hace nada; llevarlo a 1,1 quita 168 más.`,
      prompt: '¿Qué te dice eso de una muestra de un catálogo?',
      options: [
        'El paquete no es de Gaia',
        'RUWE no es un corte de verdad',
        'El corte de RUWE en 1,1 del panel es el primero que se hace a estas estrellas',
        'Los cortes se acumulan: algunos se hicieron antes de empezar un estudio, y las estrellas que quitaron no pueden verse ni contarse aquí',
      ],
      hints: [
        '¿De qué corte es resultado el 55, y podrías deshacerlo en el panel?',
      ],
      because:
        'El primer corte se hizo al construir el paquete. Un estudio trabaja con estrellas que ya pasaron varios cortes, y el panel puede añadir cortes pero nunca quitar uno: las 55 con RUWE de 1,4 o más no están en la tabla. Decir qué es una muestra supone enumerar todos los cortes, incluidos los hechos antes de que los datos llegaran a ti.',
    },
    'a-pack-that-gives-no-distance': {
      title: 'Un paquete que no da distancia',
      body: `Gravitas tiene una segunda muestra de Gaia, estrellas cercanas al Sol con velocidades radiales, pero sus paralajes están redondeadas a 0,02 mas. En la validación, el 80 por ciento de sus 1.570 estrellas se redondeó en más de una décima de su error de paralaje (el mayor redondeo fue 0,00999 mas; tramo E3). El panel no la usa.`,
      prompt: '¿Por qué no se toma ninguna distancia de ella?',
      options: [
        'Sus estrellas están demasiado cerca para la paralaje',
        'El redondeo es un error de medida que el error del catálogo no contiene, y para la mayoría de sus estrellas es una parte visible del error',
        'Las velocidades radiales no pueden combinarse con paralajes',
        'Sus estrellas son demasiado brillantes para Gaia',
      ],
      hints: [
        '¿Qué le hace redondear a 0,02 mas a un error de paralaje de 0,01 mas?',
      ],
      because:
        'El redondeo es un error de hasta 0,01 mas del que el error de paralaje citado no sabe nada. Para el 80 por ciento de esas estrellas supera una décima del error, así que una distancia tomada del valor redondeado llevaría un error que el intervalo no podría declarar. El paquete del cúmulo es preciso; este es para velocidades.',
    },
    'say-what-the-sample-is': {
      title: 'Di qué es la muestra',
      body: `Escribe la frase de métodos para una distancia a NGC 2420 tomada de estrellas con paralaje sobre error de al menos 10: qué son las estrellas y cada corte que pasaron, el punto cero y qué incluye y qué no incluye el intervalo.`,
      prompt:
        'Escribe la frase, con los cortes, el número de estrellas, la distancia y sus etiquetas.',
      rubric:
        'Crédito por nombrar los cortes propios del paquete (G menor que 17,5, RUWE menor que 1,4, 55 descartadas) y el corte añadido (paralaje sobre error de al menos 10, quedan 480 de 993 estrellas); por la distancia 2,299 kpc con un intervalo estadístico de 2,291 a 2,308 rotulado como solo estadístico y sin suelo sistemático; por decir que el punto cero se aplicó por estrella con su propia incertidumbre desconocida aquí; y por decir que la distancia no está validada con la de un catálogo publicado. No se da crédito a una frase sin cortes.',
      rubricCriteria: [
        {
          name: 'Enumera todos los cortes',
          levels: [
            {
              label: 'Completo',
              text: 'Nombra los cortes del paquete (G menor que 17,5, RUWE menor que 1,4) y el añadido (paralaje sobre error de al menos 10).',
            },
            {
              label: 'Aún no',
              text: 'Nombra solo el corte añadido, o ninguno.',
            },
          ],
        },
        {
          name: 'Da la distancia con sus etiquetas',
          levels: [
            {
              label: 'Completo',
              text: 'Da 2,299 kpc, de 2,291 a 2,308 como solo estadístico, sin suelo sistemático.',
            },
            { label: 'En parte', text: 'Da el valor sin las etiquetas.' },
            { label: 'Aún no', text: 'No da ningún valor.' },
          ],
        },
        {
          name: 'Dice qué no se hizo',
          levels: [
            {
              label: 'Completo',
              text: 'Dice que la distancia no se ha comprobado con la de un catálogo publicado, y que no se conoce la incertidumbre del punto cero.',
            },
            { label: 'Aún no', text: 'No dice nada de validación.' },
          ],
        },
        {
          name: 'Dice qué hizo el corte',
          levels: [
            {
              label: 'Completo',
              text: 'Dice que el corte movió la distancia desde 2,324 kpc más que el intervalo estadístico.',
            },
            { label: 'Aún no', text: 'No lo dice.' },
          ],
        },
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// Instructor materials
// ---------------------------------------------------------------------------

const CONTENT = {
  'how-far-and-how-sure': {
    topic:
      'A Gaia parallax as a distance: a likelihood in one over the distance with a maximum at one over the corrected parallax, an interval that leans to the far side, a lower limit and no far end when the parallax is no larger than its error, no distance when it is not positive, a prior as a stated option with its sample assumptions, and the zero point as a stated offset',
    difficulty:
      'Introductory (one divided by the parallax, the interval, a parallax as large as its error, a negative parallax); majors (the relative error, the threshold of five, an interval with no far end, a speed from a proper motion, the bias of averaging one over a noisy parallax, a report sentence); upper (a prior and what it assumes, the zero point, a cluster’s distance with and without it, and the labels a distance needs)',
    placement:
      'In a unit on stellar distances or on Galactic structure, after the parallax and the distance ladder (The First Rung) and before a unit that uses Gaia samples (Cluster Membership by Motion, What Gaia does not see). The upper depth belongs in a statistics or data-analysis unit: the prior and the zero point are the investigation’s two assumptions.',
    overview:
      'Students set a parallax and an error and watch the likelihood of every distance. They predict where it peaks, read the distance with its interval, see why the interval leans, and meet the two cases that a bare one-over-p hides: a parallax as large as its error, which supports only a lower limit, and a negative one, which supports a likelihood and no distance. The majors depth fixes the threshold, reads an interval with no far end, takes a speed from a proper motion, and meets the bias of averaging one over a noisy parallax. The upper depth adds a prior and shows when it decides the answer, then the zero point and NGC 2420’s distance with and without it, and ends on the labels that distance needs.',
    priorKnowledge: [
      'Parallax as an angle that measures distance: one divided by the distance in kiloparsecs, in milliarcseconds',
      'An uncertainty as a range a measurement is expected to fall in, and a 68 percent interval',
      'For the upper depth: what a probability distribution is, and what it means that a model assumes something about a sample',
    ],
    keyConcepts: [
      {
        heading: 'A parallax is not a distance',
        body: 'It is one divided by the distance, with an error. What it supports is a likelihood whose maximum is one over the corrected parallax; the interval is exactly one over (parallax plus k errors) to one over (parallax minus k errors) and so leans to the far side, and is open when the corrected parallax is not larger than k errors.',
      },
      {
        heading: 'A point distance needs a signal',
        body: 'The panel reports a point distance only where the corrected parallax is at least five times its error, a stated choice and not tuned to anything. Below it the answer is low-signal; at or below zero there is a likelihood and no distance, and so no velocity.',
      },
      {
        heading: 'A prior is an option with assumptions, not a correction',
        body: 'With a weak parallax the posterior is mostly the prior, and moves when the prior’s scale moves; with a strong one it barely does. The prior assumes the sample is complete in distance, which a cut on magnitude or on parallax over error breaks. No blanket correction is applied to any sample.',
      },
      {
        heading: 'The zero point is a stated offset',
        body: 'The catalog’s parallax is too small on average by an amount that depends on a star’s magnitude, color and latitude. The correction applied here is an independent reimplementation of Lindegren et al. (2021); its own uncertainty is not known here, so every distance with the correction has no systematic floor and says so.',
      },
    ],
    features: [
      {
        name: 'The distance panel (gaia-distance)',
        text: 'A parallax, an error, a zero-point offset, an optional prior with a scale length and a proper motion, all set by the student (it is not a Gaia star); the likelihood, the prior and the posterior drawn through the plot component; the corrected parallax over its error, what it supports, the distance and interval from the likelihood, the posterior where a prior is on, the prior’s stated assumptions, and the tangential speed with the distance’s interval.',
      },
      {
        name: 'The sample panel (gaia-sample)',
        text: 'Used in the upper depth for NGC 2420’s distance with and without the zero point (its cuts are the other investigation’s subject).',
      },
      {
        name: 'Depth',
        text: 'Quantitative: the relative error, the threshold, an interval with no far end, a speed, the inversion’s bias and a report sentence (a rubric with four criteria). Advanced: a prior, its scale, when the data win, what a prior assumes, the zero point, a cluster with and without it, and the sentence for a report (a rubric with four criteria).',
      },
      {
        name: 'A model, validated before it was built',
        text: 'The thresholds of the validation were committed before the kernel existed (GAIA_WORKFLOWS.md): the bias of one over the parallax against its closed form, an independent implementation as the oracle on ten stars, the coverage of the intervals at three signal levels, and a refusal for a negative parallax. One authentic leg, NGC 2420’s distance against published values, was NOT RUN.',
      },
    ],
    misconceptions: [
      {
        claim:
          'The distance is one divided by the parallax, with the error scaled the same way.',
        response:
          'One over the parallax is the maximum of the likelihood. The interval is not symmetric, and for a parallax no larger than its error it has no far end at all.',
      },
      {
        claim:
          'A negative parallax is a bad measurement and should be discarded.',
        response:
          'It is a measurement with noise. Discarding it cuts the noisy half of a sample and biases what is left; the panel keeps it as a likelihood with no distance.',
      },
      {
        claim: 'A prior always improves a distance.',
        response:
          'It improves it only where it describes the sample. A prior with the wrong scale gave 68 percent intervals that covered 22 to 42 percent of the stars in the validation, and a cut on parallax over error breaks the prior’s completeness assumption.',
      },
      {
        claim:
          'The zero point is small enough to ignore, or has already been taken out.',
        response:
          'For NGC 2420’s members it moves the cluster’s distance from 2.555 to 2.324 kpc, more than 25 times the statistical half-width. The catalog’s parallaxes are not corrected, and the correction’s own uncertainty is not known here.',
      },
    ],
    teachingNotes: [
      'Every input of the distance panel is a number the student sets; no star is claimed. The cluster values in the upper depth are from the dataset and the validation (results.json), not from a literature table.',
      'The point-distance threshold of five is stated, not derived. Show students that nothing happens at five: the maximum of the likelihood is the same at 4.9 as at 5.1, and only the wording changes.',
      'The prior used is exponentially decreasing space density, so the prior on the distance is r squared times exp(−r over L), peaking at two L. Its scale length is the student’s to set; no value is claimed right. The panel states its sample assumptions beside it.',
      'The zero point has no uncertainty of its own in the kernel (the paper’s statement of it was not in the material supplied), so no systematic floor is shown or invented; the distance of NGC 2420 says so each time it appears.',
      'The distance of NGC 2420 is 2.324 kpc with a statistical interval of 2.316 to 2.332 kpc, members from proper motion alone at probability 0.9, a per-star zero point and a 3-sigma clip. Leg E1 of the validation, which would check it against a published Gaia-based catalog distance, was NOT RUN (Hunt and Reffert 2023 could not be fetched). The value is below every literature distance in the validation’s table, including the printed DR3 parallax’s lower end; the investigation says so and does not call it agreement.',
    ],
    discussion: [
      'A catalog gives a star a parallax of 0.10 mas with an error of 0.10 mas. A colleague wants to put it on a map at 10 kpc. What would you put on the map instead?',
      'Why is it more honest to keep a star with a negative parallax in a sample than to drop it? What does dropping it do to the mean?',
      'When would you be comfortable choosing a prior scale length, and what would you need to know about the sample to defend it?',
    ],
    extensions: [
      'Find the parallax at which a star with an error of 0.05 mas first has a point distance, and the distance that parallax gives (the threshold of five times the error).',
      'With the prior on, find a parallax and an error at which doubling the scale length moves the posterior median by less than one percent, and say what that tells you about when to trust a prior.',
    ],
    assessment:
      'Core: the prediction of where the likelihood peaks, the distance with its interval (2.5 kpc, 2.22 to 2.86), why the interval leans, what 0.10 mas with an error of 0.10 supports (a lower limit near 5 kpc), and what a negative parallax gives (a likelihood and no distance). Quantitative: the relative error of 12.5 percent, the threshold at 0.08 mas, the interval with no far end, a speed of 59.3 km/s and the inversion’s bias, and the report sentence. Advanced: the prior’s effect on a weak parallax and its absence on a strong one, what the prior assumes, the zero point’s shift of the distance, the cluster with and without it, and the sentence with its labels.',
    modelNotes:
      'js/kernels/galactic/astrometry.js (the likelihood, the interval, the prior, the status ladder), zeropoint.js and cuts.js, js/gaiaField.js, js/gaiaWidgets.js, GAIA_WORKFLOWS.md. The thresholds are tests/fixtures/gaia-workflows/thresholds.json, committed before the kernel existed; the numbers a step quotes about the validation are in results.json, and the sample is NGC 2420 from the dataset (version 1.1.0, CC BY-NC 3.0 IGO, ESA/Gaia/DPAC).',
  },
  'what-gaia-does-not-see': {
    topic:
      'A Gaia sample is what passed its cuts: a magnitude limit, a parallax-over-error minimum and RUWE, what each removes from NGC 2420’s stars, how the color-magnitude diagram changes, how the cluster’s distance moves with the cut, and what the panel’s cuts are not',
    difficulty:
      'Introductory (a cut and what it removes, the faint end of the diagram, parallax over error, a distance that moves); majors (overlapping cuts, the direction a cut on the measured parallax pushes, a zero point that depends on the stars kept, velocities at the cluster’s distance, answering a colleague); upper (completeness in distance, the diagram’s changed shape, cuts made before the data reached you, a dataset that gives no distance, and the sentence a methods section needs)',
    placement:
      'After Cluster Membership by Motion (which finds NGC 2420’s members) and How far, and how sure? (which says what a parallax supports), in a unit on survey samples, selection effects or data analysis. It pairs with the survey-design investigations, whose magnitude limits are the same idea in a different place.',
    overview:
      'Students open NGC 2420’s 993 Gaia stars and add cuts one at a time. They predict what a magnitude limit removes, read how many stars remain, see that the faint end of the main sequence goes, and then see that a cut on parallax over error is close to a cut on magnitude but also changes the distance: the cluster’s distance moves from 2.324 to 2.299 kpc, outside its statistical interval. The majors depth shows cuts that overlap, why a cut on the measured parallax pushes the mean one way, and that the zero point follows the stars kept. The upper depth asks what a cut does to completeness, to a diagram’s shape and to what a dataset already removed, and ends on the sentence a methods section needs.',
    priorKnowledge: [
      'A color-magnitude diagram and the main sequence, the turnoff and the giant branch (Cluster Membership by Motion)',
      'Parallax as a measure of distance and what an error is (How far, and how sure?)',
      'For the upper depth: what it means for a sample to be complete over a range',
    ],
    keyConcepts: [
      {
        heading: 'A sample is what passed its cuts',
        body: 'The dataset holds the 993 stars of 1,048 brighter than G = 17.5 that had RUWE below 1.4; the panel adds a magnitude limit, a parallax-over-error minimum and a lower RUWE limit and says what each removes alone and in order. Cuts overlap, so the order matters for what a cut appears to do.',
      },
      {
        heading: 'A cut changes the answer, not only the count',
        body: 'Keeping stars by their measured parallax over error keeps high measurements and lowers the distance: with a minimum of ten the members’ mean parallax rises from 0.4303 to 0.4349 mas and the distance falls from 2.324 to 2.299 kpc, outside the first statistical interval. A precise sample is not a better one.',
      },
      {
        heading: 'The diagram’s shape belongs to the sample',
        body: 'A magnitude limit removes the faint end of the main sequence, so a luminosity function from the diagram stops at the limit. The cuts shown are the three a table carries, not Gaia’s own completeness, which is not built here.',
      },
    ],
    features: [
      {
        name: 'The sample panel (gaia-sample)',
        text: 'NGC 2420’s 993 stars from the Gaia dataset with cuts as controls, the color-magnitude diagram or the velocities of the members, what each cut removes alone and in order, the stars left and the members among them, the mean parallax, the distance with a statistical interval (no systematic floor) and the cluster’s velocities at its distance.',
      },
      {
        name: 'Depth',
        text: 'Quantitative: overlapping cuts, the direction of a cut’s push, the zero point under cuts, the velocity scatter and an answer to a colleague (a rubric with four criteria). Advanced: completeness in distance, the diagram’s shape, a cut made before the data, a dataset that gives no distance and the methods sentence (a rubric with four criteria).',
      },
      {
        name: 'Validation',
        text: 'The cuts were checked through the statistics kernel’s selection object against closed forms (legs S1 to S3 of GAIA_WORKFLOWS.md); the cluster’s distance is from the precise cluster dataset under a contract fixed before it was run; the rounded neighbourhood dataset is not used for a distance (leg E3).',
      },
    ],
    misconceptions: [
      {
        claim:
          'A cleaner sample, cut on parallax over error, gives a better distance.',
        response:
          'It gives a different one. The cut is on the measured parallax, so it keeps high measurements; in NGC 2420 the distance falls by more than three times the half-width of the first interval.',
      },
      {
        claim:
          'The stars removed by a magnitude limit were not in the cluster.',
        response:
          'They are in the cluster and not in the sample. A diagram or a count made from the sample falls to zero at the limit, whatever the cluster holds beyond it.',
      },
      {
        claim: 'The cuts in the panel are Gaia’s own selection.',
        response:
          'They are three cuts that a table’s rows carry, applied to stars Gaia had already measured. Gaia’s own completeness (crowding, scanning, the thinning near the faint limit) is not modeled.',
      },
      {
        claim: 'The data are what Gaia saw.',
        response:
          'The dataset had already dropped 55 stars with RUWE of 1.4 or more before any cut here. Every sample is the product of cuts made before it reached the student.',
      },
    ],
    teachingNotes: [
      'All numbers come from the dataset (993 stars, 55 dropped from 1,048 by its own query) and the cluster contract of leg E1: members from proper motion alone at probability 0.9, a per-star zero point, a 3-sigma clip, no systematic floor. The cuts are applied to those members after the fit, as the panel’s note says.',
      'The cluster’s distance is 2.324 kpc with every cut off, with a statistical interval of 2.316 to 2.332 kpc, and no systematic floor. It has not been validated against a published catalog distance (E1 NOT RUN) and the panel and the investigations say so. The rounded neighbourhood dataset is not used for any distance (E3: 80 percent of its stars round by more than a tenth of their parallax error).',
      'The direction of the move under a cut on parallax over error is what the panel computes; the investigation states the mechanism (a cut on the measured value keeps high measurements) without claiming the size of the effect for any other sample.',
      'A RUWE limit of 1.1 removes 168 stars and leaves the distance at 2.325 kpc, unchanged. The removed stars are on average brighter than the kept ones; the investigation does not say why.',
      'The velocity scatter includes the proper-motion errors, so it is an upper limit on the stars’ internal motion; the panel says so.',
    ],
    discussion: [
      'You are asked for the cluster’s distance from stars with a parallax over error of at least 10. What do you tell the person who asked for the cut?',
      'A magnitude limit removed the faint end of the diagram. What part of a cluster’s story can no longer be read from the sample, and what can?',
      'List every cut that the stars in this panel passed before you moved a slider. Who made each one?',
    ],
    extensions: [
      'Find the smallest parallax-over-error minimum at which the cluster’s statistical interval no longer overlaps the one with no cut, and say what that tells you about quoting such an interval.',
      'Compare the mean zero point with the cuts on and off, and say why a single quoted value cannot stand in for the per-star correction.',
    ],
    assessment:
      'Core: the prediction of half the dataset removed by G below 16, the counts at G below 15 (755 removed, 238 left), the faint end of the diagram, why parallax over error removes faint stars, and the two intervals that do not overlap (2.324 and 2.299 kpc). Quantitative: the overlap of cuts (189 alone, 5 after the limit), the direction of a cut’s push, the zero point under cuts, the velocity scatter, and the answer to a colleague. Advanced: completeness in distance, the diagram’s shape, the dataset’s own cut, the dataset that gives no distance, and the methods sentence with its labels.',
    modelNotes:
      'js/kernels/galactic/cuts.js (the cuts as selection objects, 154), astrometry.js (the cluster’s mean parallax and distance), zeropoint.js, js/gaiaField.js, js/gaiaWidgets.js, GAIA_WORKFLOWS.md. The dataset is gaia-dr3-ngc2420 version 1.1.0 (CC BY-NC 3.0 IGO, ESA/Gaia/DPAC; non-commercial). The cuts are the three a table carries, not a model of Gaia’s selection function.',
  },
};

const FLOW = {
  'how-far-and-how-sure': [
    {
      from: 'a-parallax-is-not-a-distance',
      to: 'commit-to-a-distance',
      text: 'A parallax is one over a distance with an error, not a distance. Students predict what a distance from one parallax looks like before the panel shows it.',
    },
    {
      from: 'read-the-distance',
      to: 'why-the-interval-leans',
      text: 'The likelihood peaks at one over the parallax and its interval leans to the far side, which the panel draws.',
    },
    {
      from: 'try-the-controls',
      to: 'a-negative-parallax',
      text: 'A parallax as large as its error supports a lower limit and no far end, and a negative one supports a likelihood and no distance.',
    },
    {
      from: 'what-you-worked-out',
      to: 'what-you-worked-out',
      text: 'The summary: what a parallax supports at each signal level, and that nothing here was corrected beyond what the student set.',
    },
  ],
  'what-gaia-does-not-see': [
    {
      from: 'a-sample-is-what-passed',
      to: 'commit-to-a-cut',
      text: 'A sample is what passed its cuts. Students predict how much of NGC 2420 a magnitude limit removes before the panel counts it.',
    },
    {
      from: 'read-what-is-left',
      to: 'which-stars-go',
      text: 'A magnitude limit removes the faint end of the diagram, and the counts say how many stars each cut takes.',
    },
    {
      from: 'a-cut-on-parallax-over-error',
      to: 'the-distance-moves',
      text: 'A cut on parallax over error removes faint stars and also moves the cluster’s distance outside its statistical interval.',
    },
    {
      from: 'not-gaias-selection',
      to: 'what-you-worked-out',
      text: 'The cuts shown are three a table carries, not Gaia’s own completeness; the summary of what a cut does.',
    },
  ],
};

// The expectations are the core steps’ checked numbers; the deeper steps’ are in `assessment`.
const EXPECTATIONS = {
  'how-far-and-how-sure': {
    'read-the-distance':
      'A parallax of 0.40 mas with an error of 0.05 mas gives 2.5 kpc with a 68 percent interval of 2.22 to 2.86 kpc (within 0.05 and 0.04), prior off and no zero point.',
    'when-it-is-too-faint':
      'A parallax of 0.10 mas with an error of 0.10 supports a lower limit near 5 kpc with no far end, and not 10 kpc with an uncertainty.',
  },
  'what-gaia-does-not-see': {
    'read-what-is-left':
      'With G below 15 and every other cut off the cut removes 755 of the 993 stars and leaves 238.',
    'the-distance-moves':
      'The cluster’s distance is 2.324 kpc (statistical interval 2.316 to 2.332) with no cut and 2.299 kpc (2.291 to 2.308) with parallax over error at least 10: the intervals do not overlap, and neither has a systematic floor.',
  },
};

const BANDS = {
  'how-far-and-how-sure': {
    core: 'short',
    quantitative: 'medium',
    advanced: 'long',
  },
  'what-gaia-does-not-see': {
    core: 'short',
    quantitative: 'medium',
    advanced: 'medium',
  },
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
  'how-far-and-how-sure': HOW_FAR_AND_HOW_SURE_ES,
  'what-gaia-does-not-see': WHAT_GAIA_DOES_NOT_SEE_ES,
};

/** The deeper steps by lesson id (what js/investigations/depth*.js read). */
export const DEPTH = {
  'how-far-and-how-sure': HOW_FAR_AND_HOW_SURE_DEEPER,
  'what-gaia-does-not-see': WHAT_GAIA_DOES_NOT_SEE_DEEPER,
};
export const DEPTH_ES = {
  'how-far-and-how-sure': HOW_FAR_AND_HOW_SURE_DEEPER_ES,
  'what-gaia-does-not-see': WHAT_GAIA_DOES_NOT_SEE_DEEPER_ES,
};

/** The lessons, in catalog order (what js/data/investigations.js spreads). */
export default [HOW_FAR_AND_HOW_SURE, WHAT_GAIA_DOES_NOT_SEE];
