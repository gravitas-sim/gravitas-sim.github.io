// =============================================================================
// Plan a Night at the Telescope
// -----------------------------------------------------------------------------
// Content only, no imports; every sid is permanent. Expected values are
// recomputed from the Sky Lab kernel by tools/authoring/skyModels.mjs. It
// extends Design the Schedule and Twelve Nights: those take the target as
// given and plan the epochs; this one chooses the targets for a night.
// =============================================================================

const STAGE = {
  spacing: 95,
  fit: true,
  stars: [{ role: 'sun', name: 'The Sun', teffK: 5772, lumSun: 1 }],
};
const PLAN = (values = {}) => ({ id: 'sky-plan', values });

const PLAN_A_NIGHT = {
  id: 'plan-a-night',
  thumbnail: 'images/investigations/plan-a-night.webp',
  title: 'Plan a Night at the Telescope',
  subtitle:
    'Choose targets for a date and a site under twilight, airmass and Moon limits',
  duration: '35-45 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 4, section: '4.3' },
  courseLevel: 'survey',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'algebra',
  prerequisites: [],
  tags: ['observing', 'stars'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Measure the hours of astronomical dark for a date and a site',
    'Compute an airmass from an altitude, and say why observers limit it',
    'Measure what a bright Moon costs a target',
    'Choose targets that meet three constraints, and justify each choice in words',
  ],
  steps: [
    {
      sid: 'the-brief',
      stage: STAGE,
      type: 'read',
      title: 'The brief',
      body: `You have one night at a telescope at latitude 30&deg; north, and
             eight bright stars you would like to observe. Which can you
             observe, and for how long? Three things decide it:
             <strong>astronomical dark</strong> (the Sun more than 18&deg; below
             the horizon), <strong>airmass</strong> (how much atmosphere the
             light crosses, which grows as a star gets low) and the
             <strong>Moon</strong> (a bright Moon nearby washes out the sky).
             \n\nThis is the step before the investigations <em>Design the
             Schedule</em> and <em>Twelve Nights</em>, which take the target as
             given and plan its epochs. Here you choose the targets. The
             instrument is a model from the Sky Lab kernel: each row is a star
             across the night, and the list below gives its usable hours.`,
      tool: PLAN({ lat: 30, day: 28, airmassMax: 2, moonSep: 30 }),
    },
    {
      sid: 'dark-hours',
      stage: STAGE,
      type: 'measure',
      title: 'How long is the dark',
      body: `Set the evening to 2025-01-29, then to 2025-06-21, at latitude
             30&deg;. Read the length of the astronomical dark each time.`,
      fields: [
        {
          id: 'jan',
          label: 'Astronomical dark, 29 January',
          unit: 'h',
          decimals: 1,
          hint: '10.5',
        },
        {
          id: 'jun',
          label: 'Astronomical dark, 21 June',
          unit: 'h',
          decimals: 1,
          hint: '6.7',
        },
        {
          id: 'diff',
          label: 'How much longer in January',
          unit: 'h',
          decimals: 1,
          compute: v => v.jan - v.jun,
        },
      ],
      validate: v => {
        if (![v.jan, v.jun].every(Number.isFinite)) return null;
        const ok = (x, want) => Math.abs(x - want) <= 0.2;
        if (ok(v.jan, 10.5) && ok(v.jun, 6.7)) {
          return {
            level: 'ok',
            message:
              'Winter nights give nearly four more hours of dark at this latitude. At higher latitudes the June dark disappears entirely.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the evening exactly and read the “Astronomical dark” row at each date.',
        };
      },
      tool: PLAN({ lat: 30, day: 28, airmassMax: 2, moonSep: 30 }),
    },
    {
      sid: 'airmass-at-thirty',
      stage: STAGE,
      type: 'question',
      kind: 'numeric',
      title: 'How much atmosphere',
      body: `The airmass is the path length through the atmosphere compared with
             looking straight up. For a flat layer it is 1/sin(altitude).`,
      prompt: 'Airmass of a star at an altitude of 30°',
      unit: '',
      answer: 2.0,
      tolerance: 0.05,
      hints: ['What is the sine of 30°?', 'Airmass = 1 ÷ sin(altitude).'],
      worked:
        '1 ÷ sin 30° = 1 ÷ 0.5 = 2.0. The more careful fit the kernel uses gives 1.99.',
      feedback: {
        close: 'Close. Airmass = 1 divided by the sine of the altitude.',
        'wrong-order-of-magnitude':
          'Near the zenith the airmass is 1; at 30° it is a small whole number.',
        off: 'Airmass = 1 ÷ sin(altitude).',
      },
      tool: PLAN({ lat: 30, day: 28, airmassMax: 2, moonSep: 30 }),
    },
    {
      sid: 'why-limit-airmass',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Why limit the airmass',
      body: `Most observing proposals say “airmass below 2”.`,
      prompt: 'Why a limit?',
      options: [
        'Low stars are dimmer, redder and blurrier, and refraction is harder to correct, so the measurement is worse',
        'Telescopes cannot point below an altitude of 30°',
        'Stars move faster near the horizon',
        'The Moon is always near the horizon',
      ],
      answer: 0,
      hints: ['Think of how the Sun looks near the horizon.'],
      because:
        'A low star is seen through more air: it is dimmed, reddened, blurred by turbulence, and refraction shifts its position by an amount that depends on the weather. Observers trade a longer window against a worse measurement, and the airmass limit is where they stop.',
      tool: PLAN({ lat: 30, day: 28, airmassMax: 2, moonSep: 30 }),
    },
    {
      sid: 'what-the-moon-costs',
      stage: STAGE,
      type: 'measure',
      title: 'What the Moon costs',
      body: `Look at Regulus, with the airmass limit 2 and the least distance
             from the Moon 30&deg;. Read its usable hours on the evening of
             2025-01-29 (new Moon) and on the evening of 2025-02-12 (full Moon).`,
      fields: [
        {
          id: 'newm',
          label: 'Regulus, new Moon night',
          unit: 'h',
          decimals: 1,
          hint: '8.1',
        },
        {
          id: 'fullm',
          label: 'Regulus, full Moon night',
          unit: 'h',
          decimals: 1,
          hint: '0.0',
        },
        {
          id: 'lost',
          label: 'Hours lost to the Moon',
          unit: 'h',
          decimals: 1,
          compute: v => v.newm - v.fullm,
        },
      ],
      validate: v => {
        if (![v.newm, v.fullm].every(Number.isFinite)) return null;
        if (Math.abs(v.newm - 8.1) <= 0.3 && Math.abs(v.fullm - 0) <= 0.3) {
          return {
            level: 'ok',
            message:
              'The full Moon that night sits in Leo, close to Regulus, so the whole night is lost. The best star on a new-Moon night can be worthless two weeks later.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the evening to each date, with the limits as given, and read the Regulus row.',
        };
      },
      tool: PLAN({ lat: 30, day: 28, airmassMax: 2, moonSep: 30 }),
    },
    {
      sid: 'count-the-targets',
      stage: STAGE,
      type: 'question',
      kind: 'numeric',
      title: 'How many are worth it',
      body: `Set the evening to 2025-02-15, latitude 30&deg;, airmass limit 2
             and least Moon distance 30&deg;. A target is worth a night if it
             has at least 3 usable hours.`,
      prompt: 'How many of the eight stars have at least 3 usable hours?',
      unit: '',
      answer: 5,
      tolerance: 0.4,
      hints: [
        'Read the usable hours for each star in the list and count those of 3 or more.',
      ],
      worked:
        'Sirius, Arcturus, Capella, Aldebaran and Regulus: five. Vega, Spica and Altair have under three hours or none.',
      feedback: {
        close: 'Close. Count the rows with 3 hours or more.',
        'wrong-order-of-magnitude': 'There are only eight stars.',
        off: 'Count the stars whose usable hours are at least 3.',
      },
      tool: PLAN({ lat: 30, day: 45, airmassMax: 2, moonSep: 30 }),
    },
    {
      sid: 'tighten-the-limit',
      stage: STAGE,
      type: 'question',
      kind: 'numeric',
      title: 'A stricter airmass',
      body: `For precise photometry you want a stricter limit. Lower the highest
             airmass to 1.5, keeping the same evening.`,
      prompt: 'Now how many of the eight stars have at least 3 usable hours?',
      unit: '',
      answer: 4,
      tolerance: 0.4,
      hints: ['Read the list again after changing the limit, and count.'],
      worked:
        'Arcturus, Capella, Aldebaran and Regulus still have 3 hours or more; Sirius falls to 1.5 hours.',
      feedback: {
        close: 'Close. Recount after changing the limit.',
        'wrong-order-of-magnitude': 'There are only eight stars.',
        off: 'Count the stars whose usable hours are at least 3.',
      },
      tool: PLAN({ lat: 30, day: 45, airmassMax: 1.5, moonSep: 30 }),
    },
    {
      sid: 'write-the-plan',
      stage: STAGE,
      type: 'question',
      kind: 'short',
      rubric:
        'Full credit for a plan for the evening of 15 February at latitude 30 degrees that names at least three targets from the list, puts them in a time order that follows when each is usable (read from the bars), and says which constraint decides at least one choice: the dark, the airmass limit or the Moon. Credit an answer that gives a reason tied to the readout. Do not credit one that names stars without any reason.',
      title: 'Write the plan',
      body: `Set the evening to 2025-02-15, airmass limit 2, Moon distance 30&deg;.
             Look at the bars: where each star is usable across the night.`,
      prompt:
        'Write a plan for the night: three targets, the order you would observe them in, and which constraint decides each.',
      tool: PLAN({ lat: 30, day: 45, airmassMax: 2, moonSep: 30 }),
    },
    {
      sid: 'what-you-worked-out',
      stage: STAGE,
      type: 'read',
      title: 'What you worked out',
      body: `A night at the telescope is a set of windows: the astronomical
             dark, the time each star is above the airmass limit, and the time
             it is clear of the Moon. The hours of dark change by hours across
             the year, the Moon can remove a target entirely, and a stricter
             airmass limit trims every window. The investigations on radial
             velocity and the schedule take it from here, with the target
             chosen.`,
    },
  ],
};

export default PLAN_A_NIGHT;
