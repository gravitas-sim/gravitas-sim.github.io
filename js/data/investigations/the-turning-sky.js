// =============================================================================
// The Turning Sky
// -----------------------------------------------------------------------------
// Content only, no imports: every step that needs a live number is handed a
// `ctx` by the engine, so a lesson stays a description of what is being taught.
// The card paragraph is in summaries.js (and summaries.es.js).
//
// Every step carries a `sid`: an opaque, stable id that student progress is
// keyed by. Reword a step, move it, translate it - but never change its sid.
//
// Every expected value is recomputed from the Sky Lab kernel (SKY_LAB.md) by
// tools/authoring/skyModels.mjs and held to it by tests/skyInvestigations.test.js.
// =============================================================================

/** The Sun alone on the canvas: a display, not an orbit. */
const STAGE = {
  spacing: 95,
  fit: true,
  stars: [{ role: 'sun', name: 'The Sun', teffK: 5772, lumSun: 1 }],
};
const TURN = (values = {}) => ({ id: 'sky-turning', values });

const THE_TURNING_SKY = {
  id: 'the-turning-sky',
  thumbnail: 'images/investigations/the-turning-sky.webp',
  title: 'The Turning Sky',
  subtitle: 'Measure why a star rises four minutes earlier every night',
  duration: '10-20 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 2, section: '2.1' },
  courseLevel: 'survey',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'arithmetic',
  prerequisites: [],
  tags: ['observing', 'solar-system'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Say what horizon coordinates and equatorial coordinates each describe, and which one a star keeps',
    'Measure how much earlier a star rises each night, and explain it',
    'Read a sidereal time and say what it counts',
    'Find the altitude of a star at the meridian from its declination and the latitude',
    'Say which stars never set from a given latitude',
  ],
  steps: [
    {
      sid: 'a-sky-that-turns',
      stage: STAGE,
      type: 'read',
      title: 'A sky that turns',
      body: `Stand outside for an hour and the stars wheel over you. Two ways of
             saying where a star is keep this straight. Its
             <strong>horizon coordinates</strong>, altitude above the horizon and
             azimuth around it, change all night and are different for
             everyone. Its <strong>equatorial coordinates</strong>, right
             ascension and declination, are fixed on the sky like latitude and
             longitude on Earth, and a star keeps them from night to night.
             \n\nThe instrument below is a computed model of the sky (the Sky
             Lab kernel), not an observation. It follows one star over one
             night from a site on the Greenwich meridian, so clock time is
             Universal Time. The curve is the star's altitude through the day;
             the dot is the moment it rises.`,
      tool: TURN({ lat: 40, nights: 0, star: 0 }),
    },
    {
      sid: 'predict-tomorrow',
      stage: STAGE,
      type: 'predict',
      reveal: 'rise-shift',
      title: 'Predict tomorrow night',
      body: `A star rises at a certain time tonight. Do not move the sliders yet.`,
      prompt: 'Tomorrow night the same star will rise&hellip;',
      options: [
        'at exactly the same time',
        'about four minutes earlier',
        'about four minutes later',
        'about an hour earlier',
      ],
      answer: 1,
      hints: [
        'Think of the Sun: it rises at nearly the same clock time every day, and the stars do not.',
      ],
      because:
        'About four minutes earlier. The stars are a little ahead of the clock each night. The next step measures how much.',
      tool: TURN({ lat: 40, nights: 0, star: 1 }),
    },
    {
      sid: 'rise-shift',
      stage: STAGE,
      type: 'measure',
      title: 'Measure the shift',
      body: `Arcturus is selected, at latitude 40°. Read the time it rises
             in minutes after noon on night&nbsp;0, then move to night&nbsp;30
             and read it again. (A night starts at noon, so a rising time never
             wraps through midnight.)`,
      fields: [
        {
          id: 'r0',
          label: 'Rises on night 0 (minutes after noon)',
          unit: 'min',
          hint: '738.5',
        },
        {
          id: 'r30',
          label: 'Rises on night 30 (minutes after noon)',
          unit: 'min',
          hint: '620.6',
        },
        {
          id: 'shift',
          label: 'Earlier each night',
          unit: 'min',
          decimals: 2,
          compute: v => (v.r0 - v.r30) / 30,
        },
      ],
      validate: v => {
        if (![v.r0, v.r30].every(Number.isFinite)) return null;
        const ok = (x, want) => Math.abs(x - want) <= 3;
        if (ok(v.r0, 738.5) && ok(v.r30, 620.6)) {
          return {
            level: 'ok',
            message:
              'About 3.9 minutes earlier each night. It is the same on any star and at any latitude: a pattern in the sky, not in one star.',
          };
        }
        if (v.r30 > v.r0) {
          return {
            level: 'error',
            message:
              'The star should rise earlier on night 30, so the second number is the smaller one.',
          };
        }
        return {
          level: 'error',
          message:
            'Read the “Rises” row, the minutes after noon, with Arcturus selected, at night 0 and again at night 30.',
        };
      },
      tool: TURN({ lat: 40, nights: 0, star: 1 }),
    },
    {
      sid: 'a-month-on',
      stage: STAGE,
      type: 'question',
      kind: 'numeric',
      title: 'A month on',
      body: `A star rises at 21:30 on 1&nbsp;March. Use the shift you measured.`,
      prompt:
        'How many minutes earlier does it rise on 1 April, 31 nights later?',
      unit: 'min',
      answer: 122,
      tolerance: 4,
      hints: [
        'Multiply the shift each night by the number of nights.',
        'The shift is a little under four minutes.',
      ],
      worked:
        '31 nights × 3.93 min per night = 121.9 min, about two hours earlier.',
      feedback: {
        close:
          'Close. Multiply the nightly shift by 31 and keep the units in minutes.',
        'wrong-order-of-magnitude':
          'A power of ten out. A few minutes a night, over a month, is a couple of hours.',
        off: 'Total shift = nightly shift × number of nights.',
      },
      tool: TURN({ lat: 40, nights: 30, star: 1 }),
    },
    {
      sid: 'why-four-minutes',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Why four minutes',
      body: `The shift is the same for every star, so it is not about the stars.
             It is about the clock.`,
      prompt: 'Why do the stars rise earlier by the clock each night?',
      options: [
        'The clock follows the Sun, and the Sun moves about one degree east against the stars each day, so the Earth must turn that much farther to bring the Sun back to the meridian',
        'The stars drift slowly westward from night to night',
        'The Earth’s rotation is slowing down',
        'The air bends the starlight a little more each night',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'rotation-slows',
          option: 2,
          say: 'The rotation is steady; it would not shift every star by the same amount each night, and the shift does not change with time.',
        },
      ],
      hints: [
        'A star returns to the same place after one full turn of the Earth. Does the Sun?',
      ],
      because:
        'The Earth turns once relative to the stars in a sidereal day, 23 h 56 min. The Sun is a little behind, because the Earth has also moved about one degree along its orbit; it takes about four minutes more turning to bring the Sun back to the meridian. Clock time follows the Sun.',
      tool: TURN({ lat: 40, nights: 0, star: 1 }),
    },
    {
      sid: 'sidereal-clock',
      stage: STAGE,
      type: 'measure',
      title: 'A clock that follows the stars',
      body: `<strong>Sidereal time</strong> counts the Earth's turn against the
             stars: it is the right ascension that is on the meridian right now.
             Read the sidereal time at midnight on night&nbsp;0 and on
             night&nbsp;30.`,
      fields: [
        {
          id: 'lst0',
          label: 'Sidereal time at midnight, night 0',
          unit: 'h',
          hint: '6.79',
        },
        {
          id: 'lst30',
          label: 'Sidereal time at midnight, night 30',
          unit: 'h',
          hint: '8.76',
        },
        {
          id: 'adv',
          label: 'Advance over 30 nights',
          unit: 'h',
          decimals: 2,
          compute: v => v.lst30 - v.lst0,
        },
      ],
      validate: v => {
        if (![v.lst0, v.lst30].every(Number.isFinite)) return null;
        const ok = (x, want) => Math.abs(x - want) <= 0.04;
        if (ok(v.lst0, 6.79) && ok(v.lst30, 8.76)) {
          return {
            level: 'ok',
            message:
              'The sidereal time at midnight moves ahead by about two hours in 30 nights: four minutes a night. It is the same four minutes, counted from the other side.',
          };
        }
        return {
          level: 'error',
          message:
            'Read the “Sidereal time at midnight” row, in hours, on night 0 and on night 30.',
        };
      },
      tool: TURN({ lat: 40, nights: 0, star: 1 }),
    },
    {
      sid: 'height-at-the-meridian',
      stage: STAGE,
      type: 'question',
      kind: 'numeric',
      title: 'How high does it get',
      body: `Arcturus is at declination +19.2°. A star crosses the meridian
             at an altitude of 90° minus the latitude plus its declination,
             from a site in the northern hemisphere. Use it for latitude
             40°, then check the instrument's altitude at the meridian.`,
      prompt: 'Altitude of Arcturus at the meridian, latitude 40°',
      unit: 'deg',
      answer: 69.1,
      tolerance: 0.5,
      hints: [
        'Subtract the latitude from 90°, then add the declination.',
        'The result is an angle above the horizon, between 0 and 90 degrees.',
      ],
      worked:
        '90° − 40° + 19.2° = 69.2°; the instrument gives 69.1° with the star’s position on the date.',
      feedback: {
        close: 'Close. 90° minus the latitude, then plus the declination.',
        'wrong-order-of-magnitude': 'An altitude is between 0 and 90 degrees.',
        off: 'Meridian altitude = 90° − latitude + declination.',
      },
      tool: TURN({ lat: 40, nights: 0, star: 1 }),
    },
    {
      sid: 'never-sets',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'A star that never sets',
      body: `Select Vega, at declination +38.8°, and set the latitude to
             60°. Read what the instrument says about it.`,
      prompt: 'From latitude 60° north, Vega&hellip;',
      options: [
        'rises and sets, like most stars',
        'never sets: it is circumpolar',
        'never rises',
        'rises in the west',
      ],
      answer: 1,
      hints: [
        'A star is circumpolar when its declination is greater than 90° minus the latitude.',
      ],
      because:
        'At latitude 60° any star north of declination +30° never sets. Vega is at +38.8°, so it circles the pole above the horizon all night, every night.',
      tool: TURN({ lat: 60, nights: 0, star: 2 }),
    },
    {
      sid: 'one-sentence',
      stage: STAGE,
      type: 'question',
      kind: 'short',
      rubric:
        'Full credit for explaining that because the Earth is both turning and going round the Sun, a given star is a little earlier each night, so over months the evening sky shows different stars. Look for: the four minutes a night (about two hours a month), the idea that the Sun moves against the stars, and the conclusion that different constellations are up in the evening in different seasons. Do not credit an answer that says only that the stars move.',
      title: 'In your own words',
      body: `Winter evenings and summer evenings show different constellations.`,
      prompt:
        'Explain why, using what you measured about the rising time of a star.',
      tool: TURN({ lat: 40, nights: 0, star: 1 }),
    },
    {
      sid: 'what-you-worked-out',
      stage: STAGE,
      type: 'read',
      title: 'What you worked out',
      body: `A star keeps its equatorial coordinates and changes its horizon
             coordinates as the Earth turns. It rises about four minutes
             earlier each night, because the Earth must turn a little more than
             once to bring the Sun back to the same place: the sidereal day is
             about four minutes shorter than the solar day. How high a star
             gets, and whether it ever sets, depends only on its declination
             and your latitude. The next investigation uses the same tool to
             follow the Sun through the year.`,
    },
  ],
};

export default THE_TURNING_SKY;
