// =============================================================================
// Phases and Eclipses
// -----------------------------------------------------------------------------
// Content only, no imports; every sid is permanent. Expected values are
// recomputed from the Sky Lab kernel by tools/authoring/skyModels.mjs. The
// Earth-Moon-Sun geometry is the kernel's positions (Meeus), with the model
// stated in the steps: the 3-D lab's system is not used.
// =============================================================================

const STAGE = {
  spacing: 95,
  fit: true,
  stars: [{ role: 'sun', name: 'The Sun', teffK: 5772, lumSun: 1 }],
};
const PH = (values = {}) => ({ id: 'sky-phases', values });
const EC = (values = {}) => ({ id: 'sky-eclipses', values });

const PHASES_AND_ECLIPSES = {
  id: 'phases-and-eclipses',
  thumbnail: 'images/investigations/phases-and-eclipses.webp',
  title: 'Phases and Eclipses',
  subtitle:
    'Measure how much of the Moon is lit, then find out why eclipses are rare',
  duration: '35-45 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 2, section: '2.3' },
  courseLevel: 'survey',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'algebra',
  prerequisites: [],
  tags: ['observing', 'solar-system'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Measure the lit fraction of the Moon against its elongation from the Sun',
    'Predict the lit fraction at a given elongation',
    'Use the Moon’s ecliptic latitude to say whether an eclipse is possible at a new or full Moon',
    'Explain why eclipses come in seasons about half a year apart',
  ],
  steps: [
    {
      sid: 'a-moon-that-changes',
      stage: STAGE,
      type: 'read',
      title: 'A Moon that changes',
      body: `The Moon always has half of itself lit by the Sun. What changes is
             how much of that half we can see, and that depends on one angle:
             the <strong>elongation</strong>, the angle on the sky between the
             Moon and the Sun. At new Moon it is near 0&deg;, at full Moon near
             180&deg;.
             \n\nThe instrument is the kernel's Moon and Sun (a model computed
             from published series, not a picture of tonight's sky). Left: the
             three bodies seen from above, with sunlight from the left. Right:
             the Moon as seen from Earth. The slider counts days from the new
             Moon of 29 January 2025.`,
      tool: PH({ day: 0 }),
    },
    {
      sid: 'predict-the-quarter',
      stage: STAGE,
      type: 'predict',
      reveal: 'four-phases',
      title: 'Predict the quarter',
      body: `At first quarter the Moon is 90&deg; from the Sun on the sky.`,
      prompt: 'At that moment, how much of the Moon’s disc is lit?',
      options: ['none', 'a quarter', 'a half', 'three quarters'],
      answer: 2,
      hints: [
        'Draw the Sun, Earth and Moon from above, with the Moon at a right angle to the Sun as seen from Earth.',
      ],
      because:
        'A half. “Quarter” counts how far round its orbit the Moon is, not how much is lit. Seen from Earth at a right angle to the Sun, exactly half the lit hemisphere shows. The next step measures it.',
      tool: PH({ day: 7.4 }),
    },
    {
      sid: 'four-phases',
      stage: STAGE,
      type: 'measure',
      title: 'Four readings',
      body: `Set the days since new Moon to each value and read the fraction of
             the disc that is lit.`,
      fields: [
        {
          id: 'l1',
          label: 'Lit at 3.7 days',
          unit: '',
          decimals: 2,
          hint: '0.17',
        },
        {
          id: 'l2',
          label: 'Lit at 7.4 days',
          unit: '',
          decimals: 2,
          hint: '0.57',
        },
        {
          id: 'l3',
          label: 'Lit at 11.1 days',
          unit: '',
          decimals: 2,
          hint: '0.91',
        },
        {
          id: 'l4',
          label: 'Lit at 14.8 days',
          unit: '',
          decimals: 2,
          hint: '0.99',
        },
      ],
      validate: v => {
        if (![v.l1, v.l2, v.l3, v.l4].every(Number.isFinite)) return null;
        const ok = (x, want) => Math.abs(x - want) <= 0.02;
        if (
          ok(v.l1, 0.17) &&
          ok(v.l2, 0.57) &&
          ok(v.l3, 0.91) &&
          ok(v.l4, 0.99)
        ) {
          return {
            level: 'ok',
            message:
              'The lit fraction rises from 0 at new Moon to 1 at full, steeply at first and slowly at the end. At 7.4 days the elongation is about 98°, a little past a right angle, so slightly more than half is lit.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the day slider exactly and read the “Fraction of the disc lit” row each time.',
        };
      },
      tool: PH({ day: 3.7 }),
    },
    {
      sid: 'phase-from-elongation',
      stage: STAGE,
      type: 'question',
      kind: 'numeric',
      title: 'From the angle to the fraction',
      body: `The lit fraction of the disc is (1 &minus; cos&nbsp;E)/2 for an
             elongation E. Check it against one of your readings (the
             instrument lists the elongation), then use it.`,
      prompt: 'Fraction of the disc lit when the Moon is 60° from the Sun',
      unit: '',
      answer: 0.25,
      tolerance: 0.02,
      hints: ['cos 60° is 0.5.', 'Put the elongation into (1 − cos E) ÷ 2.'],
      worked: '(1 − cos 60°) ÷ 2 = (1 − 0.5) ÷ 2 = 0.25.',
      feedback: {
        close: 'Close. (1 − cos E) divided by 2, with E in degrees.',
        'wrong-order-of-magnitude':
          'A fraction of the disc is between 0 and 1.',
        off: 'Lit fraction = (1 − cos E) ÷ 2.',
      },
      tool: PH({ day: 3.7 }),
    },
    {
      sid: 'predict-the-eclipses',
      stage: STAGE,
      type: 'predict',
      reveal: 'eclipse-table',
      title: 'Predict the eclipses',
      body: `At every new Moon the Moon passes between the Earth and the Sun.`,
      prompt: 'So solar eclipses happen&hellip;',
      options: [
        'at every new Moon, 12 or 13 times a year',
        'a few times a year',
        'only once a decade',
        'never, because the Moon is too small',
      ],
      answer: 1,
      hints: [
        'If an eclipse happened every month it would not be remarkable. What could keep the Moon off the line to the Sun?',
      ],
      because:
        'A few times a year. The Moon’s orbit is tilted, and most new Moons pass above or below the Sun. The next step tables the new and full Moons of half a year.',
      tool: EC({ month: 0 }),
    },
    {
      sid: 'eclipse-table',
      stage: STAGE,
      type: 'measure',
      title: 'Count the eclipse chances',
      body: `The instrument lists every new and full Moon in half a year with
             the Moon's ecliptic latitude, and marks those within 1.5&deg; of
             the ecliptic as possible eclipses. Use the two 2025 presets and
             count the rows that say an eclipse is possible.`,
      fields: [
        {
          id: 'n1',
          label: 'Possible eclipses, January to June 2025',
          unit: '',
          decimals: 0,
          hint: '2',
        },
        {
          id: 'n2',
          label: 'Possible eclipses, July to December 2025',
          unit: '',
          decimals: 0,
          hint: '2',
        },
      ],
      validate: v => {
        if (![v.n1, v.n2].every(Number.isFinite)) return null;
        if (v.n1 === 2 && v.n2 === 2) {
          return {
            level: 'ok',
            message:
              'Two in each half year: a total lunar eclipse and a partial solar eclipse about two weeks apart in March, and the same pair in September. Out of 24 new and full Moons.',
          };
        }
        return {
          level: 'error',
          message:
            'Count the rows that say “an eclipse is possible”, once for each half year.',
        };
      },
      tool: EC({ month: 0 }),
    },
    {
      sid: 'months-between',
      stage: STAGE,
      type: 'question',
      kind: 'numeric',
      title: 'Half a year apart',
      body: `The March possible eclipses fall on the full Moon of 14&nbsp;March
             and the September ones on the full Moon of 7&nbsp;September.`,
      prompt: 'Days from the 14 March full Moon to the 7 September full Moon',
      unit: 'd',
      answer: 177,
      tolerance: 2,
      hints: [
        'Count the days from 14 March to 14 September, then adjust for the dates and the time of day in the list.',
        'The list gives the time of each full Moon in UT.',
      ],
      worked: 'From 2025-03-14 06:55 UT to 2025-09-07 18:11 UT is 177.5 days.',
      feedback: {
        close: 'Close. Count the days between the two timestamps in the list.',
        'wrong-order-of-magnitude': 'About half a year, in days.',
        off: 'Subtract the two dates: days from 14 March to 7 September.',
      },
      tool: EC({ month: 0 }),
    },
    {
      sid: 'why-not-every-month',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Why not every month',
      body: `Look at the latitude column. Most new Moons are several degrees
             north or south of the ecliptic.`,
      prompt: 'Why are eclipses not monthly?',
      options: [
        'The Moon’s orbit is tilted about 5° from the ecliptic, so it usually passes above or below the Sun and the Earth’s shadow',
        'The Moon is too small to cover the Sun',
        'The Earth’s shadow is too short to reach the Moon',
        'The Moon’s orbit is the same plane as the Earth’s, but slower',
      ],
      answer: 0,
      hints: [
        'Compare the Moon’s latitude with the size of the Sun’s and the Moon’s discs, about half a degree each.',
      ],
      because:
        'The tilted orbit crosses the ecliptic at two points, the nodes. Only when new or full Moon happens within a month or so of a node, which happens about every six months, can the Sun, Earth and Moon line up. Those windows are the eclipse seasons.',
      tool: EC({ month: 0 }),
    },
    {
      sid: 'one-sentence',
      stage: STAGE,
      type: 'question',
      kind: 'short',
      rubric:
        'Full credit for saying that eclipses need the new or full Moon to happen close to the ecliptic, near one of the Moon’s nodes; that the Sun passes each node about every half year, so eclipses cluster in seasons about six months apart, and the new and full Moons in a season give a solar and a lunar eclipse about two weeks apart. Do not credit an answer that explains only the phases.',
      title: 'In your own words',
      body: `Look again at the pairs of eclipses in March and in September.`,
      prompt:
        'Explain, using the Moon’s ecliptic latitude, why eclipses come in seasons.',
      tool: EC({ month: 0 }),
    },
    {
      sid: 'what-you-worked-out',
      stage: STAGE,
      type: 'read',
      title: 'What you worked out',
      body: `The lit fraction of the Moon is set by its elongation from the Sun,
             (1 &minus; cos&nbsp;E)/2. An eclipse needs a new or full Moon on
             the ecliptic, and the Moon’s tilted orbit puts it there only near
             its nodes, which the Sun reaches about every half year. The
             instrument is a model of the geometry (a rough 1.5&deg; limit),
             not a forecast of which eclipse is seen from where. The next
             investigation follows the planets.`,
    },
  ],
};

export default PHASES_AND_ECLIPSES;
