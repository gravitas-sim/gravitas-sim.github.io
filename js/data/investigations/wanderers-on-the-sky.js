// =============================================================================
// Wanderers on the Sky
// -----------------------------------------------------------------------------
// Content only, no imports; every sid is permanent. Expected values are
// recomputed from the Sky Lab kernel (Standish elements, SKY_LAB.md) by
// tools/authoring/skyModels.mjs. Companion to "Why Mars Goes Backwards": the
// instrument draws the same event from the sky and from above the orbits.
// =============================================================================

const STAGE = {
  spacing: 95,
  fit: true,
  stars: [{ role: 'sun', name: 'The Sun', teffK: 5772, lumSun: 1 }],
};
const WAN = (values = {}) => ({ id: 'sky-wanderers', values });

const WANDERERS_ON_THE_SKY = {
  id: 'wanderers-on-the-sky',
  thumbnail: 'images/investigations/wanderers-on-the-sky.webp',
  title: 'Wanderers on the Sky',
  subtitle:
    'Follow Mars, Venus and Jupiter through their loops, from the sky and from above',
  duration: '35-45 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 3, section: '3.1' },
  courseLevel: 'survey',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'algebra',
  prerequisites: [],
  tags: ['observing', 'solar-system'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Measure the start, end and length of a retrograde loop on the sky',
    'Say where Earth is relative to an outer planet when it moves westward fastest',
    'Measure the greatest elongation of an inner planet, and explain its limit',
    'Say when an outer planet is retrograde',
    'Connect a loop on the sky to the orbits seen from above',
  ],
  steps: [
    {
      sid: 'five-wanderers',
      stage: STAGE,
      type: 'read',
      title: 'Five wanderers',
      body: `The ancient word for a planet is <em>wanderer</em>. Against the
             fixed stars it drifts eastward, most of the time, then stops,
             backs up westward for a while, stops, and drifts east again. The
             companion investigation <strong>Why Mars Goes Backwards</strong>
             shows the cause in the orbits: Earth overtaking a slower planet.
             This one measures the same thing from the sky.
             \n\nThe instrument has two views of one date, from the Sky Lab's
             planet model (Standish elements, good to about 0.2&deg;): the
             path across the sky for 120 days each way, and the orbits seen
             from above, with the line of sight from Earth (green) to the
             planet (blue). Day&nbsp;0 is 1&nbsp;October 2024.`,
      tool: WAN({ planet: 2, day: 0 }),
    },
    {
      sid: 'predict-the-loop',
      stage: STAGE,
      type: 'predict',
      reveal: 'retrograde-window',
      title: 'Predict the loop',
      body: `Mars normally drifts eastward among the stars, a little under half a
             degree a day. Watch the “Change of longitude” row as you step
             through the following months. Do not move the slider yet.`,
      prompt: 'Over the next several months, Mars will&hellip;',
      options: [
        'keep drifting east at a steady rate',
        'slow, stop, move west for a couple of months, stop again and resume eastward',
        'move west for good',
        'fade and then reappear on the other side of the sky',
      ],
      answer: 1,
      hints: ['It is called retrograde motion, and it does not last.'],
      because:
        'It slows, stops, moves west for about two and a half months and then resumes. The next step finds the dates.',
      tool: WAN({ planet: 2, day: 60 }),
    },
    {
      sid: 'retrograde-window',
      stage: STAGE,
      type: 'measure',
      title: 'Find the loop',
      body: `With Mars selected, step the date slider near day&nbsp;60 and find
             the first day number on which the motion row says
             <strong>retrograde</strong>. Then find the first day number, a few
             months later, on which it says <strong>direct</strong> again.`,
      fields: [
        {
          id: 'start',
          label: 'First day of retrograde motion',
          unit: 'day',
          decimals: 0,
          hint: '68',
        },
        {
          id: 'end',
          label: 'First day of direct motion again',
          unit: 'day',
          decimals: 0,
          hint: '147',
        },
        {
          id: 'len',
          label: 'Length of the retrograde loop',
          unit: 'days',
          decimals: 0,
          compute: v => v.end - v.start,
        },
      ],
      validate: v => {
        if (![v.start, v.end].every(Number.isFinite)) return null;
        const ok = (x, want) => Math.abs(x - want) <= 2;
        if (ok(v.start, 68) && ok(v.end, 147)) {
          return {
            level: 'ok',
            message:
              'From about 6 December 2024 to 24 February 2025: about 79 days, with Mars stationary at each end.',
          };
        }
        return {
          level: 'error',
          message:
            'Read the “Motion on the sky” row at each day. The first change to retrograde is near day 70; the change back to direct is near day 150.',
        };
      },
      tool: WAN({ planet: 2, day: 60 }),
    },
    {
      sid: 'fastest-westward',
      stage: STAGE,
      type: 'question',
      kind: 'numeric',
      title: 'Where is the Sun',
      body: `Step through days 100 to 112 and find the day on which the change
             of longitude is the most negative: Mars moving westward fastest.
             Read its elongation, the angle from the Sun, on that day.`,
      prompt: 'Mars’s elongation when it moves westward fastest',
      unit: 'deg',
      answer: 175,
      tolerance: 5,
      hints: [
        'Watch the change of longitude row, and take the most negative value.',
        'The largest possible elongation means the planet is exactly opposite the Sun.',
      ],
      worked:
        'Fastest westward on day 106 (about 12 January 2025), at an elongation of 175°: very nearly opposite the Sun, at opposition.',
      feedback: {
        close:
          'Close. Read the elongation row on the day with the most negative change of longitude.',
        'wrong-order-of-magnitude': 'An elongation is an angle on the sky, never more than half a circle.',
        off: 'At the fastest westward motion, find the elongation row.',
      },
      tool: WAN({ planet: 2, day: 100 }),
    },
    {
      sid: 'two-views-one-event',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'The same event from above',
      body: `On the day Mars moves westward fastest, look at the right-hand
             panel: Earth (green), Mars (blue) and the line between them.`,
      prompt: 'What is Earth doing?',
      options: [
        'overtaking Mars on the inside track, so the line of sight swings westward',
        'standing still while Mars moves backward in its orbit',
        'on the far side of the Sun from Mars',
        'moving away from Mars at its greatest speed',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'mars-goes-back',
          option: 1,
          say: 'Mars never reverses in its orbit. Step the day slider and watch the blue dot: it keeps going the same way.',
        },
      ],
      hints: [
        'Step the slider a few days and watch which of the two dots moves faster.',
      ],
      because:
        'Earth moves faster than Mars and is on the inside track. As it overtakes, the line of sight to Mars swings backward against the stars. Mars never turns round. This is the same event Why Mars Goes Backwards shows when it changes the reference frame.',
      tool: WAN({ planet: 2, day: 106 }),
    },
    {
      sid: 'venus-elongation',
      stage: STAGE,
      type: 'measure',
      title: 'Venus’s farthest from the Sun',
      body: `Select Venus. Step the date slider between days 60 and 140 and find
             the day on which its elongation from the Sun is greatest. Read the
             elongation and the day number.`,
      fields: [
        {
          id: 'vmax',
          label: 'Greatest elongation of Venus',
          unit: 'deg',
          decimals: 1,
          hint: '47.2',
        },
        {
          id: 'vday',
          label: 'Day number of the greatest elongation',
          unit: 'day',
          decimals: 0,
          hint: '101',
        },
      ],
      validate: v => {
        if (![v.vmax, v.vday].every(Number.isFinite)) return null;
        if (Math.abs(v.vmax - 47.2) <= 1.2 && Math.abs(v.vday - 101) <= 4) {
          return {
            level: 'ok',
            message:
              'About 47° in January 2025. Venus never gets farther than that from the Sun, so it is only ever seen in the evening or the morning, never at midnight.',
          };
        }
        return {
          level: 'error',
          message:
            'Select Venus and read the elongation row as you step through days 60 to 140. The largest value is the one.',
        };
      },
      tool: WAN({ planet: 1, day: 80 }),
    },
    {
      sid: 'the-inner-limit',
      stage: STAGE,
      type: 'question',
      kind: 'numeric',
      title: 'Why 47 degrees',
      body: `Venus's orbit has radius 0.723&nbsp;au. The line of sight from
             Earth is tangent to Venus's orbit when Venus is as far from the Sun
             as it appears, which makes a right angle at Venus. In circular
             orbits, sin&nbsp;E = 0.723.`,
      prompt: 'Greatest elongation of Venus in circular orbits',
      unit: 'deg',
      answer: 46.3,
      tolerance: 1.5,
      hints: [
        'Take the inverse sine of 0.723.',
        'The measured value is a little different because the orbits are not circles.',
      ],
      worked:
        'arcsin(0.723) = 46.3°, close to the 47.2° measured: the orbits are slightly eccentric.',
      feedback: {
        close: 'Close. Use the inverse sine of 0.723, in degrees.',
        'wrong-order-of-magnitude': 'An elongation is between 0° and 180°.',
        off: 'E = arcsin(orbit radius in au).',
      },
      tool: WAN({ planet: 1, day: 101 }),
    },
    {
      sid: 'jupiter-loop',
      stage: STAGE,
      type: 'measure',
      title: 'Jupiter’s loop',
      body: `Select Jupiter and find, near the start of the slider range, the
             first day on which it moves retrograde, and the first day on
             which it goes direct again.`,
      fields: [
        {
          id: 'jstart',
          label: 'First day of retrograde motion',
          unit: 'day',
          decimals: 0,
          hint: '9',
        },
        {
          id: 'jend',
          label: 'First day of direct motion again',
          unit: 'day',
          decimals: 0,
          hint: '127',
        },
        {
          id: 'jlen',
          label: 'Length of Jupiter’s loop',
          unit: 'days',
          decimals: 0,
          compute: v => v.jend - v.jstart,
        },
      ],
      validate: v => {
        if (![v.jstart, v.jend].every(Number.isFinite)) return null;
        const ok = (x, want) => Math.abs(x - want) <= 2;
        if (ok(v.jstart, 9) && ok(v.jend, 127)) {
          return {
            level: 'ok',
            message:
              'About 118 days, longer than Mars’s 79 and a slower swing: Jupiter moves slowly, so the Earth overtakes it more gently.',
          };
        }
        return {
          level: 'error',
          message:
            'Select Jupiter and read the motion row near days 5 to 15 and again near 120 to 135.',
        };
      },
      tool: WAN({ planet: 3, day: 0 }),
    },
    {
      sid: 'when-retrograde',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'When is an outer planet retrograde',
      body: `Compare Mars and Jupiter. For each, the loop is centered on the day
             the planet is opposite the Sun.`,
      prompt: 'An outer planet is retrograde&hellip;',
      options: [
        'for a while on either side of opposition, when Earth overtakes it',
        'when it is near the Sun on the sky',
        'only at full Moon',
        'at a fixed date every year',
      ],
      answer: 0,
      hints: [
        'Compare the elongation on the day of fastest westward motion with 180°.',
      ],
      because:
        'Near opposition Earth is passing the planet on the inside track, and that is when the line of sight swings backward. Near conjunction, with the planet behind the Sun, it moves eastward fastest. The loop repeats every synodic period, not every year.',
      tool: WAN({ planet: 3, day: 68 }),
    },
    {
      sid: 'one-sentence',
      stage: STAGE,
      type: 'question',
      kind: 'short',
      rubric:
        'Full credit for explaining that the planet’s orbital motion never reverses: Earth, on a faster and smaller orbit, overtakes an outer planet, and the line of sight to the planet swings backward against the stars for a while around opposition. Credit an answer that uses the idea of overtaking or relative motion and notes that the loop is centered on opposition. Do not credit an answer that says the planet reverses its orbit.',
      title: 'In your own words',
      body: `Look once more at both panels on the day Mars is fastest westward.`,
      prompt:
        'Explain how a planet can appear to go backwards without reversing its orbit.',
      tool: WAN({ planet: 2, day: 106 }),
    },
    {
      sid: 'what-you-worked-out',
      stage: STAGE,
      type: 'read',
      title: 'What you worked out',
      body: `Mars was retrograde for about 79 days around its opposition in
             January 2025, Jupiter for about 118 days, and the loop appears
             whenever Earth overtakes a slower planet. Venus never gets
             farther than about 47&deg; from the Sun because its orbit is inside
             ours. These are models of the sky (planet positions good to about
             0.2&deg;), and each can be checked against an almanac. The next
             investigation uses the positions to plan a night at a
             telescope.`,
    },
  ],
};

export default WANDERERS_ON_THE_SKY;
