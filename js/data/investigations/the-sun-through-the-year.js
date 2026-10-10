// =============================================================================
// The Sun Through the Year
// -----------------------------------------------------------------------------
// Content only, no imports; every sid is permanent. The card paragraph is in
// summaries.js (and summaries.es.js). Expected values are recomputed from the
// Sky Lab kernel and the radiation kernel by tools/authoring/skyModels.mjs and
// held to them by tests/skyInvestigations.test.js.
// =============================================================================

const STAGE = {
  spacing: 95,
  fit: true,
  stars: [{ role: 'sun', name: 'The Sun', teffK: 5772, lumSun: 1 }],
};
const SEA = (values = {}) => ({ id: 'sky-seasons', values });

const THE_SUN_THROUGH_THE_YEAR = {
  id: 'the-sun-through-the-year',
  thumbnail: 'images/investigations/the-sun-through-the-year.webp',
  title: 'The Sun Through the Year',
  subtitle:
    'Measure the Sun’s height, the length of the day and why June is warm',
  duration: '35-45 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 2, section: '2.2' },
  courseLevel: 'survey',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'algebra',
  prerequisites: [],
  tags: ['observing', 'solar-system'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Describe the ecliptic and the obliquity, and how they set the Sun’s declination through the year',
    'Measure the Sun’s noon altitude at the equinoxes and solstices, and explain the range',
    'Measure the length of the day at three latitudes',
    'Say why the distance to the Sun is not the cause of the seasons',
    'Predict what the seasons would be with a different tilt',
  ],
  steps: [
    {
      sid: 'a-sun-that-moves',
      stage: STAGE,
      type: 'read',
      title: 'A Sun that moves',
      body: `Over a year the Sun moves along a great circle on the sky, the
             <strong>ecliptic</strong>, through the constellations of the
             zodiac. The ecliptic is tilted from the celestial equator by
             23.4&deg;: the <strong>obliquity</strong>. When the Sun is at the
             crossing points (ecliptic longitude 0&deg; and 180&deg;) its
             declination is zero, the equinoxes. At longitude 90&deg; and
             270&deg; it is as far north and south as it goes, the solstices.
             \n\nThe instrument computes the Sun for local noon on a date, at a
             latitude you choose, from the Sky Lab kernel. It is a model, not a
             measurement. The upper plot is the Sun's noon altitude through the
             year; the lower one is the length of the day.`,
      tool: SEA({ lat: 40, day: 78, tilt: 23.44 }),
    },
    {
      sid: 'predict-noon-height',
      stage: STAGE,
      type: 'predict',
      reveal: 'three-noons',
      title: 'Predict the noon Sun',
      body: `At latitude 40&deg; north, about the latitude of Madrid or New
             York, think about the Sun at noon in June and in December.`,
      prompt:
        'The Sun’s noon altitude in June compared with December is&hellip;',
      options: [
        'about the same: the seasons come from the distance to the Sun',
        'higher in June, by about 47 degrees',
        'higher in June, by about 10 degrees',
        'higher in December',
      ],
      answer: 1,
      hints: [
        'The Sun’s declination swings between plus and minus the obliquity.',
      ],
      because:
        'Higher in June by about 47 degrees: twice the obliquity. The next step measures it.',
      tool: SEA({ lat: 40, day: 171, tilt: 23.44 }),
    },
    {
      sid: 'three-noons',
      stage: STAGE,
      type: 'measure',
      title: 'Three noons',
      body: `Use the presets for the March equinox, the June solstice and the
             December solstice, at latitude 40&deg;. Read the Sun's altitude at
             noon each time.`,
      fields: [
        {
          id: 'eq',
          label: 'Noon altitude, March equinox',
          unit: 'deg',
          hint: '50',
        },
        {
          id: 'jun',
          label: 'Noon altitude, June solstice',
          unit: 'deg',
          hint: '73.4',
        },
        {
          id: 'dec',
          label: 'Noon altitude, December solstice',
          unit: 'deg',
          hint: '26.6',
        },
        {
          id: 'range',
          label: 'June minus December',
          unit: 'deg',
          decimals: 1,
          compute: v => v.jun - v.dec,
        },
      ],
      validate: v => {
        if (![v.eq, v.jun, v.dec].every(Number.isFinite)) return null;
        const ok = (x, want) => Math.abs(x - want) <= 0.5;
        if (ok(v.eq, 50) && ok(v.jun, 73.4) && ok(v.dec, 26.6)) {
          return {
            level: 'ok',
            message:
              'The equinox noon Sun is 90° minus the latitude. The solstices are 23.4° above and below it, so the whole range is about 47°, twice the obliquity.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the latitude to 40° and read the “Sun’s altitude at noon” row at each preset.',
        };
      },
      tool: SEA({ lat: 40, day: 78, tilt: 23.44 }),
    },
    {
      sid: 'what-if-the-tilt',
      stage: STAGE,
      type: 'question',
      kind: 'numeric',
      title: 'What if the tilt were smaller',
      body: `At the June solstice the Sun's declination equals the tilt. Work out
             the noon altitude at 40&deg; north if the tilt were only
             10&deg;, then set the tilt slider to 10 to check.`,
      prompt: 'Noon altitude at the June solstice, latitude 40°, tilt 10°',
      unit: 'deg',
      answer: 60,
      tolerance: 0.5,
      hints: [
        'Noon altitude = 90° minus the latitude, plus the declination.',
        'At the June solstice the declination is the tilt.',
      ],
      worked: '90° − 40° + 10° = 60°. With the real tilt it is 73.4°.',
      feedback: {
        close:
          'Close. 90° − latitude + declination, with the declination equal to the tilt.',
        'wrong-order-of-magnitude': 'An altitude is between 0 and 90 degrees.',
        off: 'Altitude at noon = 90° − latitude + declination.',
      },
      tool: SEA({ lat: 40, day: 171, tilt: 10 }),
    },
    {
      sid: 'three-day-lengths',
      stage: STAGE,
      type: 'measure',
      title: 'Three day lengths',
      body: `Go back to the real tilt and the June solstice. Set the latitude to
             0&deg;, 40&deg; and 65&deg; in turn and read the length of the day.`,
      fields: [
        {
          id: 'h0',
          label: 'Day length at latitude 0°',
          unit: 'h',
          hint: '12.1',
        },
        {
          id: 'h40',
          label: 'Day length at latitude 40°',
          unit: 'h',
          hint: '15.0',
        },
        {
          id: 'h65',
          label: 'Day length at latitude 65°',
          unit: 'h',
          hint: '22.0',
        },
      ],
      validate: v => {
        if (![v.h0, v.h40, v.h65].every(Number.isFinite)) return null;
        const ok = (x, want) => Math.abs(x - want) <= 0.15;
        if (ok(v.h0, 12.1) && ok(v.h40, 15.0) && ok(v.h65, 22.0)) {
          return {
            level: 'ok',
            message:
              'The day at the equator is always about 12 hours; the higher the latitude the longer the June day, until the Sun stops setting at the Arctic Circle.',
          };
        }
        return {
          level: 'error',
          message:
            'Use the June solstice preset, then read the “Length of the day” row at each latitude.',
        };
      },
      tool: SEA({ lat: 0, day: 171, tilt: 23.44 }),
    },
    {
      sid: 'distance-is-not-it',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'The distance trap',
      body: `Read the Sun's distance on the June solstice (1.016&nbsp;au) and on
             the December solstice (0.984&nbsp;au). The Earth is farther from
             the Sun in June.`,
      prompt: 'So why is June warm in the northern hemisphere?',
      options: [
        'The Sun is higher and the day longer, and that outweighs a 3 percent change in distance',
        'The distance readout is wrong',
        'The Earth is closer to the Sun in June',
        'The Sun gives off more light in June',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'closer-is-summer',
          option: 2,
          say: 'Check the distance row on both dates: the Earth is farther from the Sun in June, and the southern hemisphere is in winter then.',
        },
      ],
      hints: [
        'Compare how much the distance changes with how much the noon altitude changes.',
      ],
      because:
        'The distance changes by only 3 percent between the two dates, and the sunlight by about 7 percent. The noon altitude changes by 47° and the day by 6 hours at this latitude, which changes the sunlight reaching a square meter of ground far more. And the southern hemisphere has winter in June.',
      tool: SEA({ lat: 40, day: 171, tilt: 23.44 }),
    },
    {
      sid: 'equinox-longitude',
      stage: STAGE,
      type: 'question',
      kind: 'numeric',
      title: 'Where on the ecliptic',
      body: `Use the September equinox preset and read the Sun's ecliptic
             longitude, the angle along the ecliptic from the March equinox.`,
      prompt: 'The Sun’s ecliptic longitude at the September equinox',
      unit: 'deg',
      answer: 180,
      tolerance: 3,
      hints: ['The March equinox is 0° and the June solstice is 90°.'],
      worked: 'Half way round the ecliptic from the March equinox: 180°.',
      feedback: {
        close:
          'Close. The September equinox is half a circle past the March one.',
        'wrong-order-of-magnitude':
          'An ecliptic longitude is between 0° and 360°.',
        off: 'The equinoxes are half a circle apart; each solstice is a quarter circle from both.',
      },
      tool: SEA({ lat: 40, day: 264, tilt: 23.44 }),
    },
    {
      sid: 'one-sentence',
      stage: STAGE,
      type: 'question',
      kind: 'short',
      rubric:
        'Full credit for saying that with no tilt the Sun would stay on the celestial equator all year, so its noon altitude and the length of the day would not change, and there would be no seasons; and that the tilt makes the Sun’s declination swing, which changes both the height of the Sun and the length of the day. Credit an answer that names both effects. Do not credit one that attributes the seasons to the distance.',
      title: 'In your own words',
      body: `Press the No tilt preset and step through the year.`,
      prompt:
        'What would the seasons be like with no tilt, and what does the tilt do?',
      tool: SEA({ lat: 40, day: 171, tilt: 0 }),
    },
    {
      sid: 'what-you-worked-out',
      stage: STAGE,
      type: 'read',
      title: 'What you worked out',
      body: `The Sun's declination swings between plus and minus the obliquity,
             23.4&deg;, as it travels the ecliptic. That moves the noon Sun
             through 47&deg; of altitude at 40&deg; north and lengthens the
             June day to 15 hours. The distance to the Sun changes by about 3
             percent and is the wrong place to look. The next investigation
             turns to the Moon.`,
    },
  ],
};

export default THE_SUN_THROUGH_THE_YEAR;
