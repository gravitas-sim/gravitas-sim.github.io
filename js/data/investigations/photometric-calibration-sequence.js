// =============================================================================
// Counts to Magnitudes (Prompt 212)
// -----------------------------------------------------------------------------
// One investigation at three depths, in one module that also carries its Spanish
// words, its deeper steps and its instructor content: the one closure file the
// prompt adds, because the shared sequence files sit at their line ceilings. The
// per-lesson path every loader builds from an id is a one-line re-export of a
// named export here, and the instructor modules read INSTRUCTOR. No imports:
// every number a step states is recomputed in tests/photometricLessons.test.js
// from the instrument (js/photcalWidgets.js over the calibration kernel,
// js/kernels/detector/photcal.js). Every step carries a `sid`, an opaque stable
// id that student progress is keyed by.
//
// The nights are synthetic and say so: made from a stated truth with seeded
// noise, not an observatory's. The extinction here is the atmosphere's, in
// magnitudes per airmass; it is never the interstellar extinction (A_V) of the
// radiation model, and the lesson says so where the two could be confused.
// =============================================================================

const near = (x, target, tolerance) =>
  Number.isFinite(x) && Math.abs(x - target) <= tolerance;

const STAGE = {
  spacing: 150,
  fit: true,
  stars: [{ role: 'star', name: 'A star', teffK: 5772, lumSun: 1 }],
};
/** The calibration panel with its controls set (night 0 clear, 1 narrow, 2 colour-dependent; model 1 second order). */
const PC = (values = {}, hide = []) => ({
  id: 'photometric-calibration',
  values: {
    night: 0,
    stars: 14,
    noise: 5,
    reach: 2.4,
    model: 0,
    prior: 0,
    view: 0,
    colour: 0.8,
    airmass: 1.9,
    truth: 0,
    ...values,
  },
  hide,
});
/** The controls a first reading does not need. */
const PLAIN = ['stars', 'noise', 'reach', 'model', 'prior', 'colour'];

export const COUNTS_TO_MAGNITUDES = {
  id: 'counts-to-magnitudes',
  thumbnail: 'images/investigations/counts-to-magnitudes.webp',
  title: 'Counts to Magnitudes',
  subtitle:
    'Why a star looks fainter low in the sky, how a night of standard stars turns counts into magnitudes, and what the calibration cannot tell you',
  duration: '10-20 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 6, section: null },
  courseLevel: 'survey',
  mathematics: 'algebra',
  prerequisites: [],
  tags: ['observing'],
  lock: { placement: true, inspector: true },
  depths: ['core', 'quantitative', 'advanced'],
  objectives: [
    'Predict, then read, how much fainter the same star looks at a higher airmass, and say why',
    'Read the extinction of the air, in magnitudes per airmass, from the slope of a night’s standard stars',
    'Say that the air’s extinction is not the dust between the stars',
    'Read a calibrated magnitude with the uncertainty the night leaves it',
  ],
  steps: [
    {
      sid: 'a-night-of-standards',
      stage: STAGE,
      type: 'read',
      title: 'A night of standard stars',
      body: `A detector counts electrons; a catalog lists magnitudes. To turn one into the
             other an observer measures <strong>standard stars</strong>, stars whose
             magnitudes are already known, at several heights in the sky. Each point below
             is one measurement of one standard: the horizontal axis is the
             <strong>airmass</strong> (1 straight overhead, about 2 at 30 degrees above the
             horizon), the vertical axis how far the instrument&rsquo;s own magnitude lies
             from the catalog&rsquo;s.
             \n\nThe night is <strong>synthetic</strong>: made by a model from a stated
             truth, with noise, so the answer can be checked afterwards. Nobody observed it.`,
      tool: PC({}, PLAIN),
    },
    {
      sid: 'low-in-the-sky-predict',
      stage: STAGE,
      type: 'predict',
      reveal: 'bouguer',
      title: 'Low in the sky',
      body: `The same star is measured overhead, at airmass 1.05, and again later when it
             has sunk to airmass 2.15, more than twice as much air to look through. The
             points on the plot tell you how much the air costs.`,
      prompt: 'At the higher airmass the same star looks&hellip;',
      options: [
        'the same: a star’s brightness does not depend on where it is in the sky',
        'about a quarter of a magnitude fainter',
        'about two and a half magnitudes (a factor of 10) fainter',
        'brighter, because it is closer to the horizon',
      ],
      answer: 1,
      hints: [
        'Read the slope of the points: how many magnitudes the line drops for each extra airmass.',
      ],
      because:
        'About a quarter of a magnitude: the line falls by about 0.21 magnitudes for every extra airmass, and 2.15 is 1.1 airmasses above 1.05.',
      tool: PC({}, PLAIN),
    },
    {
      sid: 'bouguer',
      stage: STAGE,
      type: 'measure',
      title: 'The slope is the air',
      body: `The dashed line is the fit to the standards, and its slope is the
             <strong>extinction coefficient</strong>, <em>k</em>, in magnitudes per airmass.
             Read it from the <em>Extinction of the air</em> row. The instrument gives how
             much fainter a star looks at airmass 2.4 than overhead: <em>k</em> times the
             1.4 airmasses between.`,
      fields: [
        {
          id: 'k',
          label: 'Extinction of the air, k',
          unit: 'mag/airmass',
          hint: '0.21',
        },
        {
          id: 'dm',
          label: 'Fainter at airmass 2.4 than overhead',
          unit: 'mag',
          compute: v => v.k * 1.4,
          decimals: 2,
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.k)) return null;
        if (near(v.k, 0.213, 0.008) && near(v.dm, 0.298, 0.015)) {
          return {
            level: 'ok',
            message:
              'About 0.21 magnitudes per airmass, so a star at airmass 2.4 is about 0.3 magnitudes, a third of a magnitude, fainter than overhead. Turn on the truth row and the night says what it was made with: 0.210. The fit finds 0.213 with an uncertainty of 0.003, the scatter of the points made honest.',
          };
        }
        return {
          level: 'error',
          message:
            'Read the number in the “Extinction of the air, k” row (the slope of the dashed line, about 0.2 magnitudes per airmass); the fainter-by value is k times 1.4.',
        };
      },
      tool: PC({}, PLAIN),
    },
    {
      sid: 'why-fainter',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Why fainter?',
      body: `The star did not change and the telescope did not move. Only the sky between
             them did.`,
      prompt: 'Why does the same star look fainter low in the sky?',
      options: [
        'Its light crosses more air on the way down, and the air absorbs and scatters a share of it for every airmass',
        'It is farther away when it is low, so its light has further to travel',
        'The star really does get fainter as it sets',
        'The detector responds less to light that arrives at a slant',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'distance',
          option: 1,
          say: 'The star is the same distance whatever its height: the extra path is only the last few tens of kilometres, through the atmosphere.',
        },
        {
          id: 'star',
          option: 2,
          say: 'The star is steady; its altitude changes, and with it the amount of air in the way.',
        },
        {
          id: 'detector',
          option: 3,
          say: 'The detector sees the same light it would see anywhere; less light reaches it because more of it was taken out above.',
        },
      ],
      hints: ['What is between the star and the telescope, and how does its amount change with the star’s height?'],
      because:
        'More air, more extinction: the loss is about 0.21 magnitudes for every airmass of it, so a star low in the sky loses more than one overhead.',
      tool: PC({}, PLAIN),
    },
    {
      sid: 'not-the-dust',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Not the dust',
      body: `Astronomers also speak of <em>extinction</em> for the dust between the stars,
             which dims and reddens distant stars. The word is the same.`,
      prompt: 'Is the <em>k</em> on this plot the dust between the stars?',
      options: [
        'No: it is the Earth’s atmosphere, in magnitudes per airmass, and it changes with the night and the site; the dust between the stars dims a star by an amount that does not depend on where it is in our sky tonight',
        'Yes: extinction is extinction, and k is the dust of the galaxy',
        'Yes, but only for stars near the horizon',
        'No: the atmosphere does not dim starlight at all',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'same',
          option: 1,
          say: 'The two are separate: the dust is between the star and the top of our atmosphere and is the same however high the star is; this k is in the last hundred kilometres, per airmass. A calibrated magnitude here is corrected for the air, not for the dust.',
        },
        {
          id: 'horizon',
          option: 2,
          say: 'The dust does not know where the horizon is. The air’s share grows with airmass; the dust’s does not.',
        },
        {
          id: 'none',
          option: 3,
          say: 'The slope of the points is the atmosphere dimming starlight: 0.21 magnitudes for every airmass.',
        },
      ],
      hints: ['Which one would change if the same star were observed from the same place an hour later?'],
      because:
        'The air’s extinction depends on airmass and on the night; the interstellar extinction belongs to the line of sight through the galaxy. A calibration removes the first and leaves the second in the magnitude.',
      tool: PC({}, PLAIN),
    },
    {
      sid: 'what-a-calibration-does',
      stage: STAGE,
      type: 'read',
      title: 'What a calibration does',
      body: `A night of standards fixes three numbers: the <strong>zero point</strong>
             (what magnitude one count per second is), the <strong>extinction</strong> of the
             air, and a <strong>colour term</strong> (the instrument sees blue and red stars
             a little differently). With them, any star on the same frames gets a calibrated
             magnitude, <em>with an uncertainty</em> that comes from how well the night fixed
             them. The next steps make one. Remember the night is synthetic and the
             extinction is the atmosphere&rsquo;s, not the dust&rsquo;s.`,
      tool: PC({}, PLAIN),
    },
  ],
};

export const COUNTS_TO_MAGNITUDES_DEEPER = {
  id: 'counts-to-magnitudes',
  steps: [
    {
      sid: 'the-zero-point',
      after: 'not-the-dust',
      depth: 'quantitative',
      type: 'measure',
      title: 'The zero point',
      body: `Read the <em>Zero point at airmass 1</em> row, <strong>Z1</strong>: the
             calibrated magnitude of a star that gives one electron per second, observed at
             airmass 1. Read the extinction too; the instrument gives the zero point
             <em>outside</em> the atmosphere, Z1 minus <em>k</em>.`,
      fields: [
        { id: 'z', label: 'Zero point at airmass 1, Z1', unit: 'mag', hint: '24.80' },
        { id: 'k', label: 'Extinction, k', unit: 'mag/airmass', hint: '0.21' },
        {
          id: 'z0',
          label: 'Zero point outside the atmosphere',
          unit: 'mag',
          compute: v => v.z - v.k,
          decimals: 3,
        },
      ],
      validate: v => {
        if (![v.z, v.k].every(Number.isFinite)) return null;
        if (near(v.z, 24.803, 0.008) && near(v.k, 0.213, 0.008)) {
          return {
            level: 'ok',
            message:
              'Z1 is 24.803 with an uncertainty of 0.003 magnitudes, and outside the atmosphere the zero point is 24.590. Z1 is the one that goes with measurements, which are made through the air, and it is the zero point at airmass 1 that the calibration equation uses.',
          };
        }
        return {
          level: 'error',
          message:
            'Read Z1 from the “Zero point at airmass 1” row (about 24.8) and k from the next row (about 0.21).',
        };
      },
      tool: PC({}, ['stars', 'noise', 'reach', 'model', 'prior', 'colour']),
    },
    {
      sid: 'calibrate-a-target',
      after: 'the-zero-point',
      depth: 'quantitative',
      type: 'measure',
      title: 'Calibrate a target',
      body: `The panel also measures one <strong>target</strong> star, at airmass 1.9 and
             colour index 0.8. Read the <em>Target star</em> row: its calibrated magnitude
             and the uncertainty. Then turn on <em>Show the truth</em> and compare with the
             magnitude the model gave it.`,
      fields: [
        { id: 'M', label: 'Calibrated magnitude', unit: 'mag', hint: '13.20' },
        { id: 's', label: 'Its uncertainty', unit: 'mag', hint: '0.008' },
        {
          id: 'iv',
          label: 'Half-width of the 95 percent interval',
          unit: 'mag',
          compute: v => 1.96 * v.s,
          decimals: 3,
        },
      ],
      validate: v => {
        if (![v.M, v.s].every(Number.isFinite)) return null;
        if (near(v.M, 13.203, 0.01) && near(v.s, 0.008, 0.003)) {
          return {
            level: 'ok',
            message:
              'The target calibrates to 13.203 with an uncertainty of 0.008; the truth is 13.200, three thousandths of a magnitude away, well inside the error. The error is not the noise of the target alone: it folds in the uncertainties of the zero point, the extinction and the colour term, and the correlations between them.',
          };
        }
        return {
          level: 'error',
          message:
            'Read the “Target star” row: the calibrated magnitude (about 13.2) and the number after the plus-minus sign (about 0.008).',
        };
      },
      tool: PC({ truth: 1 }, ['stars', 'noise', 'reach', 'model', 'prior', 'colour']),
    },
    {
      sid: 'the-airmass-limit',
      after: 'calibrate-a-target',
      depth: 'quantitative',
      type: 'measure',
      title: 'Where a straight line stops',
      body: `Raise <em>Highest airmass observed</em> to <strong>3.0</strong>. The night now
             also has standards above airmass 2.5, where the air is thick and a straight line
             in airmass is no longer trusted. The tool leaves them out and flags them. Read
             how many measurements it left out, and the extinction it then finds.`,
      fields: [
        { id: 'n', label: 'Measurements left out', unit: '', hint: '6' },
        { id: 'k', label: 'Extinction, k', unit: 'mag/airmass', hint: '0.21' },
      ],
      validate: v => {
        if (![v.n, v.k].every(Number.isFinite)) return null;
        if (near(v.n, 6, 0.01) && near(v.k, 0.2095, 0.005)) {
          return {
            level: 'ok',
            message:
              'Six measurements are left out, and the extinction without them is 0.2095, a hair under the 0.213 before. Leaving data out is not free; the rule is stated before the data are seen: beyond airmass 2.5 the standards are flagged and not used, and a target there is refused.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the highest airmass to 3.0, then read the “Excluded” row (the number of measurements) and the extinction row.',
        };
      },
      tool: PC({ reach: 3 }, ['stars', 'noise', 'model', 'prior', 'colour']),
    },
    {
      sid: 'refuse-a-target',
      after: 'the-airmass-limit',
      depth: 'quantitative',
      type: 'question',
      kind: 'choice',
      title: 'A target at airmass 3',
      body: `Now set the <em>Target airmass</em> to <strong>3.0</strong>. The target row
             says it is refused.`,
      prompt: 'Why is a refusal better than a number?',
      options: [
        'No standard was reliably measured that low, so the line was never tested there: any number would be an extrapolation the data cannot check',
        'The tool is not able to calculate a magnitude above airmass 2',
        'A star at airmass 3 is too faint to be measured',
        'The refusal saves the observer time',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'calc',
          option: 1,
          say: 'The arithmetic can be done at any airmass: the equation does not break. It is the answer that cannot be trusted.',
        },
        {
          id: 'faint',
          option: 2,
          say: 'The target is as bright as before; it is the extinction there, and how it changes with the airmass, that the standards no longer cover.',
        },
        {
          id: 'time',
          option: 3,
          say: 'A refusal says that the data do not support a number; it is the honest answer, not a shortcut.',
        },
      ],
      hints: ['What does the calibration know about the air at an airmass that none of the standards was observed at?'],
      because:
        'An extrapolation beyond what was tested is a guess dressed as a measurement. The tool refuses above airmass 2.5 and the observer re-observes the target higher in the sky.',
      tool: PC({ airmass: 3 }, ['stars', 'noise', 'reach', 'model', 'prior', 'colour']),
    },
    {
      sid: 'narrow-predict',
      after: 'refuse-a-target',
      depth: 'quantitative',
      type: 'predict',
      reveal: 'narrow-night',
      title: 'A night with one airmass',
      body: `Choose the night called <em>one narrow airmass range</em>: all its standards
             were measured between airmass 1.30 and 1.42, because the observer did not wait
             for the field to move.`,
      prompt: 'What can this night say about the extinction <em>k</em>?',
      options: [
        'Nothing useful: with the points all at about one airmass the slope cannot be told from the zero point',
        'It fixes k as well as a wide night does, just with more points',
        'It gives k exactly, because the scatter is small',
        'It fixes k only if the noise is high',
      ],
      answer: 0,
      hints: [
        'Could you draw a slope through points that all lie above almost one value of the airmass?',
      ],
      because:
        'The slope is a change in magnitude over a change in airmass; if the airmass hardly changes, any slope fits about as well, and the zero point and the extinction trade off against each other.',
      tool: PC({ night: 1 }, ['stars', 'noise', 'reach', 'model', 'prior', 'colour']),
    },
    {
      sid: 'narrow-night',
      after: 'narrow-predict',
      depth: 'quantitative',
      type: 'measure',
      title: 'The night that cannot say',
      body: `Read the <em>Night</em> row for the airmass range, then the extinction and
             zero point rows. The colour term is still fixed (the standards span a wide
             range of colour). Give the airmass range, and the colour term.`,
      fields: [
        { id: 'lo', label: 'Lowest airmass', unit: '', hint: '1.30' },
        { id: 'hi', label: 'Highest airmass', unit: '', hint: '1.42' },
        {
          id: 'span',
          label: 'Range',
          unit: '',
          compute: v => v.hi - v.lo,
          decimals: 2,
        },
        { id: 'c', label: 'Colour term, c', unit: '', hint: '0.079' },
      ],
      validate: v => {
        if (![v.lo, v.hi, v.c].every(Number.isFinite)) return null;
        if (near(v.lo, 1.3, 0.011) && near(v.hi, 1.42, 0.011) && near(v.c, 0.0788, 0.008)) {
          return {
            level: 'ok',
            message:
              'A range of 0.12 in airmass: the tool says the extinction and the zero point are not constrained, and gives no number for either, not a zero and not a guess. The colour term is fixed (0.079 with an uncertainty of 0.006), because the standards do span colour. The target is refused: it was not observed at the standards’ airmass.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose the narrow night and read the airmass range in the “Night” row (1.30 to 1.42) and the colour term in its row (about 0.079).',
        };
      },
      tool: PC({ night: 1 }, ['stars', 'noise', 'reach', 'model', 'prior', 'colour']),
    },
    {
      sid: 'a-cited-coefficient',
      after: 'narrow-night',
      depth: 'quantitative',
      type: 'measure',
      title: 'Borrow a coefficient',
      body: `Turn on <em>Use a cited site coefficient</em>. The extinction is then taken
             from a table (the Rubin Observatory&rsquo;s coefficient for the r band, 0.126,
             from the published survey paper) with an <em>assumed</em> uncertainty of 0.05
             magnitudes per airmass, because the table states none. The night can then
             calibrate the target. Read its calibrated magnitude and uncertainty.`,
      fields: [
        { id: 'M', label: 'Calibrated magnitude', unit: 'mag', hint: '13.22' },
        { id: 's', label: 'Its uncertainty', unit: 'mag', hint: '0.012' },
        {
          id: 'off',
          label: 'Distance from the true 13.200',
          unit: 'mag',
          compute: v => v.M - 13.2,
          decimals: 3,
        },
      ],
      validate: v => {
        if (![v.M, v.s].every(Number.isFinite)) return null;
        if (near(v.M, 13.2202, 0.01) && near(v.s, 0.0115, 0.003)) {
          return {
            level: 'ok',
            message:
              'The target comes out at 13.220 with an uncertainty of 0.0115, 0.020 from the truth, inside the 95 percent interval (13.198 to 13.243) and flagged: the extinction is the cited one. The borrowed coefficient was for another site and another night, and it pulled the extinction to 0.181; the true night’s was 0.210. The flag is the honest part of the answer.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose the narrow night, turn the cited coefficient on, then read the “Target star” row: about 13.22 with an uncertainty of about 0.012.',
        };
      },
      tool: PC({ night: 1, prior: 1, truth: 1 }, ['stars', 'noise', 'reach', 'model', 'colour']),
    },
    {
      sid: 'how-few-standards',
      after: 'a-cited-coefficient',
      depth: 'quantitative',
      type: 'measure',
      title: 'How few standards?',
      body: `On the clear night, lower <em>Standard stars used</em> to <strong>2</strong>,
             then <strong>3</strong>. Two stars cannot fix both the extinction and a colour
             term, so the colour term is not constrained and the tool adds a stated
             uncertainty for it. Read the target&rsquo;s uncertainty each time.`,
      fields: [
        { id: 's2', label: 'Uncertainty with 2 standards', unit: 'mag', hint: '0.081' },
        { id: 's3', label: 'Uncertainty with 3 standards', unit: 'mag', hint: '0.0088' },
        {
          id: 'ratio',
          label: 'Ratio',
          unit: '',
          compute: v => v.s2 / v.s3,
          decimals: 1,
        },
      ],
      validate: v => {
        if (![v.s2, v.s3].every(Number.isFinite)) return null;
        if (near(v.s2, 0.0812, 0.008) && near(v.s3, 0.0088, 0.002)) {
          return {
            level: 'ok',
            message:
              'Two standards leave the target uncertain to 0.081 magnitudes; three bring it to 0.009, nine times smaller. The third standard is not three-halves as good; it is the difference between a term being determined and being missing.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the number of standards to 2, read the target’s uncertainty, then to 3 and read it again: about 0.081 and 0.0088.',
        };
      },
      tool: PC({ stars: 2 }, ['noise', 'reach', 'model', 'prior', 'colour']),
    },
    {
      sid: 'the-colour-night',
      after: 'not-the-dust',
      depth: 'advanced',
      type: 'read',
      title: 'A night the straight line does not fit',
      body: `Choose the night called <em>colour-dependent extinction</em>. Here the air dims
             blue stars a little more than red ones, so the extinction depends on colour, a
             term the first-order equation does not have. Look at the <em>The fit</em> row
             and at the residual plots (choose <em>residuals against airmass</em>): the
             standards no longer scatter around the fit as their errors say they should, and
             the tool says so, and says why it suspects a colour-dependent extinction.`,
      tool: PC({ night: 2, view: 1 }, ['stars', 'noise', 'reach', 'model', 'prior', 'colour', 'airmass']),
    },
    {
      sid: 'second-order',
      after: 'the-colour-night',
      depth: 'advanced',
      type: 'measure',
      title: 'Is there more in the data?',
      body: `Read the row <em>Is there more in the data?</em>: how much adding a
             colour-dependent extinction lowers chi-square. Then switch the model to
             <em>with colour-dependent extinction</em> and read the new term, <em>k2</em>.`,
      fields: [
        { id: 'dchi', label: 'Drop in chi-square', unit: '', hint: '67.8' },
        { id: 'k2', label: 'Colour-dependent extinction, k2', unit: 'mag/airmass/colour', hint: '-0.047' },
      ],
      validate: v => {
        if (![v.dchi, v.k2].every(Number.isFinite)) return null;
        if (near(v.dchi, 67.8, 2) && near(v.k2, -0.0466, 0.008)) {
          return {
            level: 'ok',
            message:
              'The chi-square drops by 67.8 for one added term, a chance of about 10 to the minus 16, and the term is −0.047 with an uncertainty of 0.006. With it the fit is good (p = 0.70). The night was made with −0.040; the fit finds a term within about one standard error of it.',
          };
        }
        return {
          level: 'error',
          message:
            'On the colour-dependent night in the first-order model read the “Is there more in the data?” row (about 67.8); then choose the second-order model and read the k2 row (about −0.047).',
        };
      },
      tool: PC({ night: 2, view: 1 }, ['stars', 'noise', 'reach', 'prior', 'colour', 'airmass']),
    },
    {
      sid: 'a-blue-target',
      after: 'second-order',
      depth: 'advanced',
      type: 'measure',
      title: 'What it does to a blue star',
      body: `Set the <em>Target colour index</em> to <strong>&minus;0.2</strong>, a blue
             star. Read the calibrated magnitude in the first-order model and again in the
             second-order one. The true magnitude is 13.200.`,
      fields: [
        { id: 'm1', label: 'Calibrated, first order', unit: 'mag', hint: '13.215' },
        { id: 'm2', label: 'Calibrated, second order', unit: 'mag', hint: '13.202' },
        {
          id: 'd',
          label: 'Difference',
          unit: 'mag',
          compute: v => v.m1 - v.m2,
          decimals: 3,
        },
      ],
      validate: v => {
        if (![v.m1, v.m2].every(Number.isFinite)) return null;
        if (near(v.m1, 13.2149, 0.006) && near(v.m2, 13.2019, 0.006)) {
          return {
            level: 'ok',
            message:
              'The first-order calibration gives 13.215 for the blue star, 0.015 from the truth, with the lack of fit flagged and its error widened to 0.014; the second-order one gives 13.202, within 0.002. A model that is too simple does not fail loudly: the answer is wrong by a small amount and the flag is the clue.',
          };
        }
        return {
          level: 'error',
          message:
            'On the colour-dependent night set the target colour to −0.2 and read the “Target star” row in each model: about 13.215 first order, 13.202 second order.',
        };
      },
      tool: PC({ night: 2, colour: -0.2, truth: 1 }, ['stars', 'noise', 'reach', 'prior', 'airmass']),
    },
    {
      sid: 'what-it-costs',
      after: 'a-blue-target',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'Why not always the bigger model?',
      body: `On the clear night the second-order model finds a colour-dependent extinction of
             −0.001, no more than its own error. Its target is as good, and its extinction
             is less certain: 0.0047 instead of 0.0029.`,
      prompt: 'When should an observer fit the colour-dependent extinction?',
      options: [
        'When the data ask for it: the fit’s residuals and the test of the extra term say there is more in the data, and the night’s colours and airmasses can fix it',
        'Always: a more general model is always better',
        'Never: the first-order equation is the standard',
        'Only for red stars',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'always',
          option: 1,
          say: 'Each term costs precision: the extinction’s uncertainty here goes from 0.0029 to 0.0047 for a term that is not needed. A term the data cannot fix also adds nothing but a wider error.',
        },
        {
          id: 'never',
          option: 2,
          say: 'On the colour-dependent night the first-order answer is wrong by 0.015 for a blue star and says so with a flag; ignoring the flag is not caution.',
        },
        {
          id: 'red',
          option: 3,
          say: 'The term works on blue and red stars alike (its effect is proportional to the colour); the blue target here was the bigger test, but it is not the only case.',
        },
      ],
      hints: ['Compare the uncertainties of the extinction in the two models on the clear night.'],
      because:
        'A bigger model is chosen by evidence, not by default: the test of the extra term and the residuals decide, and the extra term is fitted only when the night’s standards can determine it.',
      tool: PC({ model: 1 }, ['stars', 'noise', 'reach', 'prior', 'airmass', 'colour']),
    },
    {
      sid: 'the-limits',
      after: 'what-it-costs',
      depth: 'advanced',
      type: 'read',
      title: 'What the calibration assumes',
      body: `A linear calibration claims only what its equation allows. It assumes the
             extinction is constant through the night (clouds, dust and a rising wind break
             it), the catalogue magnitudes are right (their errors are shared by every
             measurement of a star, and the tool includes that), the measurements are free of
             aperture and flat-field errors, and one straight line in airmass and in colour
             describes the instrument. The tool refuses where it cannot support a number,
             and it flags the rest: refusal, widened errors and flags are the calibration
             saying what it does not know. The panel&rsquo;s <em>It assumes</em> row says it
             again. And the extinction is the atmosphere&rsquo;s, in magnitudes per
             airmass: the dust between the stars is another correction entirely.`,
      tool: PC({ night: 2, model: 1 }, ['stars', 'noise', 'reach', 'prior', 'airmass', 'colour']),
    },
  ],
};

export const COUNTS_TO_MAGNITUDES_ES = {
  title: 'De cuentas a magnitudes',
  subtitle:
    'Por qué una estrella se ve más débil cerca del horizonte, cómo una noche de estrellas patrón convierte cuentas en magnitudes y qué no puede decirte la calibración',
  objectives: [
    'Predecir y después leer cuánto más débil se ve la misma estrella a mayor masa de aire, y decir por qué',
    'Leer la extinción del aire, en magnitudes por masa de aire, en la pendiente de las estrellas patrón de una noche',
    'Decir que la extinción del aire no es el polvo entre las estrellas',
    'Leer una magnitud calibrada con la incertidumbre que le deja la noche',
  ],
  steps: [
    {
      title: 'Una noche de estrellas patrón',
      body: 'Un detector cuenta electrones; un catálogo da magnitudes. Para pasar de lo uno a lo otro el observador mide <strong>estrellas patrón</strong>, estrellas cuyas magnitudes ya se conocen, a varias alturas del cielo. Cada punto de abajo es una medida de un patrón: el eje horizontal es la <strong>masa de aire</strong> (1 en el cenit, cerca de 2 a 30 grados sobre el horizonte) y el vertical, cuánto se aparta la magnitud del propio instrumento de la del catálogo.\n\nLa noche es <strong>sintética</strong>: la hizo un modelo a partir de una verdad declarada, con ruido, para poder comprobar la respuesta después. Nadie la observó.',
    },
    {
      title: 'Bajo en el cielo',
      body: 'La misma estrella se mide en el cenit, con masa de aire 1,05, y de nuevo más tarde, cuando ha bajado a 2,15, más del doble de aire que atravesar. Los puntos del gráfico dicen cuánto cuesta el aire.',
      prompt: 'Con la masa de aire mayor la misma estrella se ve&hellip;',
      options: [
        'igual: el brillo de una estrella no depende de dónde esté en el cielo',
        'más débil en un cuarto de magnitud, aproximadamente',
        'más débil en unas dos magnitudes y media (un factor 10)',
        'más brillante, porque está más cerca del horizonte',
      ],
      hints: [
        'Lee la pendiente de los puntos: cuántas magnitudes baja la recta por cada masa de aire más.',
      ],
      because:
        'Un cuarto de magnitud, aproximadamente: la recta cae unas 0,21 magnitudes por cada masa de aire más, y de 1,05 a 2,15 hay 1,1.',
    },
    {
      title: 'La pendiente es el aire',
      body: 'La recta discontinua es el ajuste a los patrones y su pendiente es el <strong>coeficiente de extinción</strong>, <em>k</em>, en magnitudes por masa de aire. Léelo en la fila <em>Extinción del aire</em>. El instrumento da cuánto más débil se ve una estrella con masa de aire 2,4 que en el cenit: <em>k</em> por las 1,4 masas de aire de diferencia.',
      fields: [
        { label: 'Extinción del aire, k' },
        { label: 'Más débil con masa de aire 2,4 que en el cenit' },
      ],
    },
    {
      title: '¿Por qué más débil?',
      body: 'La estrella no cambió y el telescopio no se movió. Solo cambió el cielo entre ambos.',
      prompt: '¿Por qué la misma estrella se ve más débil cerca del horizonte?',
      options: [
        'Su luz cruza más aire al bajar, y el aire absorbe y dispersa una parte de ella por cada masa de aire',
        'Está más lejos cuando está baja, así que su luz tiene que recorrer más camino',
        'La estrella se vuelve de verdad más débil al ponerse',
        'El detector responde menos a la luz que llega en diagonal',
      ],
      misconceptions: [
        {
          say: 'La estrella está a la misma distancia a cualquier altura: el camino extra son solo las últimas decenas de kilómetros, a través de la atmósfera.',
        },
        {
          say: 'La estrella es constante; cambia su altura, y con ella la cantidad de aire en medio.',
        },
        {
          say: 'El detector ve la misma luz que vería en cualquier otro sitio; llega menos luz porque arriba se quitó más.',
        },
      ],
      hints: [
        '¿Qué hay entre la estrella y el telescopio y cómo cambia su cantidad con la altura de la estrella?',
      ],
      because:
        'Más aire, más extinción: la pérdida es de unas 0,21 magnitudes por cada masa de aire, así que una estrella baja pierde más que una en el cenit.',
    },
    {
      title: 'No es el polvo',
      body: 'Los astrónomos también hablan de <em>extinción</em> para el polvo entre las estrellas, que debilita y enrojece las estrellas lejanas. La palabra es la misma.',
      prompt: '¿Es la <em>k</em> de este gráfico el polvo entre las estrellas?',
      options: [
        'No: es la atmósfera de la Tierra, en magnitudes por masa de aire, y cambia con la noche y el lugar; el polvo entre las estrellas debilita una estrella en una cantidad que no depende de dónde esté en nuestro cielo esta noche',
        'Sí: extinción es extinción, y k es el polvo de la galaxia',
        'Sí, pero solo para estrellas cerca del horizonte',
        'No: la atmósfera no debilita la luz de las estrellas',
      ],
      misconceptions: [
        {
          say: 'Son cosas distintas: el polvo está entre la estrella y lo alto de nuestra atmósfera y es el mismo a cualquier altura de la estrella; esta k está en los últimos cien kilómetros, por masa de aire. Una magnitud calibrada aquí está corregida del aire, no del polvo.',
        },
        {
          say: 'El polvo no sabe dónde está el horizonte. La parte del aire crece con la masa de aire; la del polvo no.',
        },
        {
          say: 'La pendiente de los puntos es la atmósfera debilitando la luz de las estrellas: 0,21 magnitudes por cada masa de aire.',
        },
      ],
      hints: [
        '¿Cuál de las dos cambiaría si la misma estrella se observara desde el mismo sitio una hora después?',
      ],
      because:
        'La extinción del aire depende de la masa de aire y de la noche; la extinción interestelar pertenece a la línea de visión a través de la galaxia. Una calibración quita la primera y deja la segunda en la magnitud.',
    },
    {
      title: 'Qué hace una calibración',
      body: 'Una noche de patrones fija tres números: el <strong>punto cero</strong> (qué magnitud tiene una cuenta por segundo), la <strong>extinción</strong> del aire y un <strong>término de color</strong> (el instrumento ve las estrellas azules y rojas de forma algo distinta). Con ellos, cualquier estrella de las mismas imágenes recibe una magnitud calibrada, <em>con una incertidumbre</em> que sale de lo bien que la noche los fijó. Los pasos siguientes hacen una. Recuerda que la noche es sintética y que la extinción es la de la atmósfera, no la del polvo.',
    },
  ],
};

export const COUNTS_TO_MAGNITUDES_DEEPER_ES = {
  steps: [
    {
      title: 'El punto cero',
      body: 'Lee la fila <em>Punto cero a masa de aire 1</em>, <strong>Z1</strong>: la magnitud calibrada de una estrella que da un electrón por segundo, observada con masa de aire 1. Lee también la extinción; el instrumento da el punto cero <em>fuera</em> de la atmósfera, Z1 menos <em>k</em>.',
      fields: [
        { label: 'Punto cero a masa de aire 1, Z1' },
        { label: 'Extinción, k' },
        { label: 'Punto cero fuera de la atmósfera' },
      ],
    },
    {
      title: 'Calibra una estrella problema',
      body: 'El panel mide también una estrella <strong>problema</strong>, con masa de aire 1,9 e índice de color 0,8. Lee la fila <em>Estrella problema</em>: su magnitud calibrada y la incertidumbre. Después activa <em>Mostrar la verdad</em> y compara con la magnitud que le dio el modelo.',
      fields: [
        { label: 'Magnitud calibrada' },
        { label: 'Su incertidumbre' },
        { label: 'Semianchura del intervalo del 95 por ciento' },
      ],
    },
    {
      title: 'Dónde se acaba una recta',
      body: 'Sube <em>Mayor masa de aire observada</em> a <strong>3,0</strong>. La noche tiene ahora patrones por encima de la masa de aire 2,5, donde el aire es espeso y ya no se fía una recta en la masa de aire. La herramienta los deja fuera y los marca. Lee cuántas medidas dejó fuera y la extinción que encuentra entonces.',
      fields: [
        { label: 'Medidas dejadas fuera' },
        { label: 'Extinción, k' },
      ],
    },
    {
      title: 'Una estrella problema con masa de aire 3',
      body: 'Ahora fija la <em>Masa de aire del problema</em> en <strong>3,0</strong>. La fila de la estrella problema dice que se rechaza.',
      prompt: '¿Por qué es mejor un rechazo que un número?',
      options: [
        'Ningún patrón se midió con fiabilidad tan bajo, así que la recta nunca se puso a prueba allí: cualquier número sería una extrapolación que los datos no pueden comprobar',
        'La herramienta no sabe calcular una magnitud por encima de la masa de aire 2',
        'Una estrella con masa de aire 3 es demasiado débil para medirla',
        'El rechazo ahorra tiempo al observador',
      ],
      misconceptions: [
        {
          say: 'La aritmética se puede hacer con cualquier masa de aire: la ecuación no se rompe. Lo que no se puede es fiarse de la respuesta.',
        },
        {
          say: 'La estrella problema es tan brillante como antes; lo que los patrones ya no cubren es la extinción allí y cómo cambia con la masa de aire.',
        },
        {
          say: 'Un rechazo dice que los datos no respaldan un número; es la respuesta honesta, no un atajo.',
        },
      ],
      hints: [
        '¿Qué sabe la calibración del aire con una masa de aire a la que no se observó ningún patrón?',
      ],
      because:
        'Una extrapolación más allá de lo probado es una conjetura disfrazada de medida. La herramienta rechaza por encima de la masa de aire 2,5 y el observador vuelve a observar la estrella problema más alto en el cielo.',
    },
    {
      title: 'Una noche con una sola masa de aire',
      body: 'Elige la noche llamada <em>un intervalo estrecho de masa de aire</em>: todos sus patrones se midieron entre las masas de aire 1,30 y 1,42, porque el observador no esperó a que el campo se moviera.',
      prompt: '¿Qué puede decir esta noche de la extinción <em>k</em>?',
      options: [
        'Nada útil: con todos los puntos en casi una misma masa de aire no se distingue la pendiente del punto cero',
        'Fija k tan bien como una noche amplia, solo que con más puntos',
        'Da k exactamente, porque la dispersión es pequeña',
        'Fija k solo si el ruido es alto',
      ],
      hints: [
        '¿Podrías trazar una pendiente por puntos que están todos sobre casi un mismo valor de la masa de aire?',
      ],
      because:
        'La pendiente es un cambio de magnitud sobre un cambio de masa de aire; si la masa de aire casi no cambia, cualquier pendiente ajusta casi igual de bien, y el punto cero y la extinción se compensan entre sí.',
    },
    {
      title: 'La noche que no puede decirlo',
      body: 'Lee la fila <em>Noche</em> para el intervalo de masa de aire y después las filas de la extinción y del punto cero. El término de color sigue fijado (los patrones cubren un amplio intervalo de color). Da el intervalo de masa de aire y el término de color.',
      fields: [
        { label: 'Masa de aire más baja' },
        { label: 'Masa de aire más alta' },
        { label: 'Intervalo' },
        { label: 'Término de color, c' },
      ],
    },
    {
      title: 'Pide prestado un coeficiente',
      body: 'Activa <em>Usar un coeficiente citado del sitio</em>. La extinción se toma entonces de una tabla (el coeficiente del Observatorio Rubin para la banda r, 0,126, del artículo publicado del sondeo) con una incertidumbre <em>supuesta</em> de 0,05 magnitudes por masa de aire, porque la tabla no da ninguna. La noche puede entonces calibrar la estrella problema. Lee su magnitud calibrada y su incertidumbre.',
      fields: [
        { label: 'Magnitud calibrada' },
        { label: 'Su incertidumbre' },
        { label: 'Distancia a la verdad, 13,200' },
      ],
    },
    {
      title: '¿Cuántos patrones como mínimo?',
      body: 'En la noche despejada, baja <em>Estrellas patrón usadas</em> a <strong>2</strong> y luego a <strong>3</strong>. Dos estrellas no pueden fijar a la vez la extinción y un término de color, así que el término de color no queda determinado y la herramienta añade una incertidumbre declarada para él. Lee cada vez la incertidumbre de la estrella problema.',
      fields: [
        { label: 'Incertidumbre con 2 patrones' },
        { label: 'Incertidumbre con 3 patrones' },
        { label: 'Cociente' },
      ],
    },
    {
      title: 'Una noche que la recta no ajusta',
      body: 'Elige la noche llamada <em>extinción que depende del color</em>. Aquí el aire debilita las estrellas azules algo más que las rojas, de modo que la extinción depende del color, un término que la ecuación de primer orden no tiene. Mira la fila <em>El ajuste</em> y los gráficos de residuos (elige <em>residuos frente a la masa de aire</em>): los patrones ya no se dispersan alrededor del ajuste como dicen sus errores, y la herramienta lo dice y dice por qué sospecha una extinción que depende del color.',
    },
    {
      title: '¿Hay más en los datos?',
      body: 'Lee la fila <em>¿Hay más en los datos?</em>: cuánto baja la chi cuadrado al añadir una extinción que depende del color. Después cambia el modelo a <em>con extinción que depende del color</em> y lee el término nuevo, <em>k2</em> (<em>Dependencia de la extinción con el color</em>).',
      fields: [
        { label: 'Bajada de la chi cuadrado' },
        { label: 'Extinción que depende del color, k2' },
      ],
    },
    {
      title: 'Qué le hace a una estrella azul',
      body: 'Fija el <em>Índice de color del problema</em> en <strong>&minus;0,2</strong>, una estrella azul. Lee la magnitud calibrada en el modelo de primer orden y otra vez en el de segundo orden. La magnitud verdadera es 13,200.',
      fields: [
        { label: 'Calibrada, primer orden' },
        { label: 'Calibrada, segundo orden' },
        { label: 'Diferencia' },
      ],
    },
    {
      title: '¿Por qué no usar siempre el modelo mayor?',
      body: 'En la noche despejada el modelo de segundo orden encuentra una extinción que depende del color de −0,001, no más que su propio error. Su estrella problema es igual de buena y su extinción es menos segura: 0,0047 en vez de 0,0029.',
      prompt: '¿Cuándo debe ajustar un observador la extinción que depende del color?',
      options: [
        'Cuando los datos lo piden: los residuos del ajuste y la prueba del término extra dicen que hay más en los datos, y los colores y masas de aire de la noche pueden fijarlo',
        'Siempre: un modelo más general es siempre mejor',
        'Nunca: la ecuación de primer orden es la estándar',
        'Solo para estrellas rojas',
      ],
      misconceptions: [
        {
          say: 'Cada término cuesta precisión: aquí la incertidumbre de la extinción pasa de 0,0029 a 0,0047 por un término que no hace falta. Un término que los datos no pueden fijar tampoco añade más que un error mayor.',
        },
        {
          say: 'En la noche con extinción que depende del color, la respuesta de primer orden se equivoca en 0,015 para una estrella azul y lo dice con una marca; ignorar la marca no es prudencia.',
        },
        {
          say: 'El término actúa igual en estrellas azules y rojas (su efecto es proporcional al color); la estrella problema azul era la prueba mayor, pero no el único caso.',
        },
      ],
      hints: [
        'Compara las incertidumbres de la extinción en los dos modelos en la noche despejada.',
      ],
      because:
        'Un modelo mayor se elige por la evidencia, no por defecto: la prueba del término extra y los residuos deciden, y el término extra solo se ajusta cuando los patrones de la noche pueden determinarlo.',
    },
    {
      title: 'Qué supone la calibración',
      body: 'Una calibración lineal solo afirma lo que permite su ecuación. Supone que la extinción es constante durante la noche (las nubes, el polvo y un viento que se levanta la rompen), que las magnitudes del catálogo son correctas (sus errores los comparten todas las medidas de una estrella, y la herramienta lo incluye), que las medidas están libres de errores de apertura y de campo plano, y que una recta en la masa de aire y en el color describe el instrumento. La herramienta rechaza donde no puede respaldar un número y marca el resto: el rechazo, los errores ensanchados y las marcas son la calibración diciendo lo que no sabe. La fila <em>Supone</em> del panel lo repite. Y la extinción es la de la atmósfera, en magnitudes por masa de aire: el polvo entre las estrellas es otra corrección distinta.',
    },
  ],
};

const CONTENT = {
  'counts-to-magnitudes': {
    topic:
      'How an observer turns the counts of a detector into calibrated magnitudes: a night of standard stars measured at several airmasses fixes a zero point, the extinction of the air (about 0.21 magnitudes per airmass on the synthetic night here, so a star at airmass 2.4 is a third of a magnitude fainter than overhead) and a colour term; a target is then calibrated with the uncertainty the night leaves it (13.203 ± 0.008). The lesson separates the atmosphere’s extinction, in magnitudes per airmass, from the interstellar extinction of the dust between the stars, and shows what the calibration refuses (a night of one airmass, a target above airmass 2.5, a colour term from two standards) and where a straight line is not enough (a colour-dependent extinction).',
    difficulty:
      'Introductory (read a slope, say why a star is fainter low in the sky, not the dust); majors (calibrate a night: zero point, target, limits, refusals, a cited coefficient, how few standards); advanced (a colour term, a colour-dependent extinction found by a nested test, what a linear calibration assumes)',
    placement:
      'In a survey course beside the unit on the atmosphere and observing, and before photometry; in a majors course after the saturated-star investigation (the saturation limit comes before the calibration) and beside the exposure and the observing-strategy investigations. It supports OpenStax Astronomy 2e chapter 6 (astronomical instruments). It is the investigation behind the calibration kernel of Prompt 212, on the detector pipeline of Prompts 180 and 209-211.',
    overview:
      'Students predict how much fainter a star looks at airmass 2.15 than at 1.05, read the slope of a synthetic night’s standards (k about 0.21 magnitudes per airmass), say why, and say that it is not the dust between the stars. At the quantitative depth they read the zero point (24.803 at airmass 1, 24.590 outside the atmosphere), calibrate a target (13.203 ± 0.008 against a truth of 13.200), see standards above airmass 2.5 left out and a target there refused, see a night of one airmass leave the extinction and zero point not constrained (and no number given), borrow a cited coefficient with an assumed uncertainty and see the flag, and see two standards leave the colour term open (0.081 against 0.009 with three). At the advanced depth they read a colour-dependent night (a drop in chi-square of 67.8 for one added term, k2 = −0.047 ± 0.006), the 0.015 magnitude error of a first-order calibration of a blue star, why the bigger model is not always the better one, and what a linear calibration assumes.',
    priorKnowledge: [
      'Magnitudes are a logarithmic scale: five magnitudes is a factor of 100 in brightness',
      'A straight-line fit has a slope and an intercept',
      'A CCD collects electrons, and a catalog lists magnitudes',
    ],
    keyConcepts: [
      {
        heading: 'The air costs magnitudes in proportion to the airmass',
        body: 'The slope of a standard star’s magnitude against airmass is the extinction coefficient k, here 0.213 ± 0.003 magnitudes per airmass (the night was made with 0.210). The zero point at airmass 1 is the intercept.',
      },
      {
        heading: 'Atmospheric extinction is not interstellar extinction',
        body: 'k is the Earth’s atmosphere, per airmass, and changes with the night and the site; the interstellar extinction (A_V) is the dust along the line of sight and does not depend on airmass. The calibration removes the first and leaves the second in the magnitude.',
      },
      {
        heading: 'A refusal and a flag are part of the answer',
        body: 'A night that does not span airmass cannot fix k (the tool gives no number), a target above airmass 2.5 is refused, two standards cannot fix a colour term, a borrowed coefficient is flagged, and a lack of fit widens the errors.',
      },
      {
        heading: 'A bigger model is chosen by evidence',
        body: 'A colour-dependent extinction is fitted when the test of the extra term and the residuals ask for it (a drop in chi-square of 67.8 for one term); on a night that does not need it the term costs precision (0.0029 to 0.0047 on k).',
      },
    ],
    features: [
      {
        name: 'The photometric-calibration panel (its own lazy family)',
        text: 'Three synthetic nights of standard stars (clear, one narrow airmass range, colour-dependent extinction), the fit of Z1 − k(X − 1) + cC to them with its uncertainties, the Bouguer line and the residual plots through the plot component, a target star calibrated with its 95 percent interval, a switch for the cited-coefficient prior and the second-order model, and a button that keeps the calibration in the notebook as a gravitas.artifact record.',
      },
      {
        name: 'Depth',
        text: 'Quantitative: the zero point, a calibrated target, the airmass limit and a refused target, a night of one airmass, a cited coefficient, how few standards. Advanced: a colour-dependent extinction, its test, a blue target in two models, the price of the bigger model, what a linear calibration assumes.',
      },
      {
        name: 'Synthetic nights, stated',
        text: 'Every step says the night is synthetic; the truth (Z1 24.800, k 0.210, c 0.080, target 13.200) is shown only when the reader asks for it. The cited coefficient is the Rubin r-band value, a different site’s, with an assumed uncertainty.',
      },
    ],
    misconceptions: [
      {
        claim: 'A star looks fainter low in the sky because it is farther away.',
        response:
          'The star is the same distance at any height; its light crosses more air, and about 0.21 magnitudes are lost for every airmass.',
      },
      {
        claim: 'Extinction is extinction: k is the dust of the galaxy.',
        response:
          'The k of a night is the atmosphere’s, per airmass; the interstellar dust dims a star by an amount that does not depend on the airmass. A calibrated magnitude here is corrected for the air and not for the dust.',
      },
      {
        claim: 'A night of standards always fixes the extinction.',
        response:
          'Only if the standards span airmass: seen between airmass 1.30 and 1.42 they cannot tell the slope from the zero point, and the tool says so without giving a number.',
      },
      {
        claim: 'A more general model is always better.',
        response:
          'It costs precision where it is not needed (0.0029 to 0.0047 on k on the clear night) and should be fitted when the test of the extra term asks for it.',
      },
    ],
    teachingNotes: [
      'The nights are synthetic: the instrumental magnitudes follow the calibration equation M − m = Z1 − k(X − 1) + cC [− k2 C (X − 1)] with a seeded Gaussian noise, so the truth is known. The kernel is checked against an independent implementation (numpy, SciPy and Astropy), by an ensemble for coverage, by a physical night built from the radiation model’s band responses under a Rayleigh and aerosol atmosphere, and by a cross-match of the repository’s SDSS and Gaia data on NGC 2420 (PHOTOMETRIC_CALIBRATION.md).',
      'Four checks of the committed contract failed and are reported, not repaired: a lack-of-fit test does not see a colour-dependent extinction the first-order model absorbs (the nested test does), the physical night’s limit clause, the detection power of an underestimated error (0.977 against the 0.99 bound) and the held-out coverage of the authentic cross-match (0.743, a catalogue pair’s colour term, not a hidden calibration).',
      'The cited coefficient is a value from the instrument library (Rubin r band, ivezic2019) used as a Gaussian prior with an assumed uncertainty of 0.05 magnitudes per airmass, because the table states none; the lesson says so in the step and the flag.',
      'Inherited limits: the extinction is constant through the night; the catalogue magnitudes are right; no aperture or flat-field errors; a straight line in airmass and colour; the airmass limit of 2.5 is a stated rule.',
    ],
    discussion: [
      'Why is the zero point at airmass 1 more useful to an observer than the zero point outside the atmosphere?',
      'What would you do on a night when all your standards were measured at nearly the same airmass?',
      'Why is a calibration’s uncertainty larger than the noise of the target alone?',
    ],
    extensions: [
      'On the clear night set the noise to 20 mmag and say what happens to the extinction and to the target’s uncertainty; then lower the number of standards.',
      'Look up the extinction coefficients of two observatories in the instrument library and say what a night at each one would cost a star at airmass 2.',
    ],
    modelNotes:
      'js/kernels/detector/photcal.js (the fit, the refusals, the intervals), js/instruments/photcal.js (the cited coefficient and the record), js/photcalField.js (the synthetic nights), js/photcalWidgets.js (the panel), PHOTOMETRIC_CALIBRATION.md.',
  },
};

const FLOW = {
  'counts-to-magnitudes': [
    {
      from: 'a-night-of-standards',
      to: 'bouguer',
      text: 'A night of standards on a plot of magnitude against airmass; the prediction of how much fainter the same star looks at airmass 2.15 and the slope that answers it (0.213 magnitudes per airmass).',
    },
    {
      from: 'why-fainter',
      to: 'what-a-calibration-does',
      text: 'Why the star is fainter (more air), why that is not the dust between the stars, and what a calibration fixes.',
    },
  ],
};

const EXPECTATIONS = {
  'counts-to-magnitudes': {
    bouguer:
      'About 0.213 magnitudes per airmass (within 0.008), so about 0.30 magnitudes fainter at airmass 2.4 than overhead.',
    'the-zero-point':
      'Z1 about 24.803 (within 0.008) with k about 0.213, so about 24.590 outside the atmosphere.',
    'calibrate-a-target':
      'About 13.203 with an uncertainty of about 0.008 (within 0.003); the truth is 13.200.',
    'narrow-night':
      'Airmass 1.30 to 1.42, so a range of 0.12, no number for the extinction or the zero point, and a colour term of about 0.079.',
  },
};

const BANDS = {
  'counts-to-magnitudes': {
    core: 'short',
    quantitative: 'long',
    advanced: 'long',
  },
};

/** The guides, flows, expectations and time bands of the lesson above. */
export const INSTRUCTOR = {
  content: CONTENT,
  flow: FLOW,
  expectations: EXPECTATIONS,
  bands: BANDS,
};

/** The Spanish shadows by lesson id (what instructorLocale.js spreads). */
export const SHADOWS = {
  'counts-to-magnitudes': COUNTS_TO_MAGNITUDES_ES,
};

/** The deeper steps by lesson id (what js/investigations/depth*.js read). */
export const DEPTH = {
  'counts-to-magnitudes': COUNTS_TO_MAGNITUDES_DEEPER,
};
export const DEPTH_ES = {
  'counts-to-magnitudes': COUNTS_TO_MAGNITUDES_DEEPER_ES,
};

/** The lessons, in catalog order (what js/data/investigations.js spreads). */
export default [COUNTS_TO_MAGNITUDES];
