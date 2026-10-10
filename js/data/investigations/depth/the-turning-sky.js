// =============================================================================
// The Turning Sky, deeper (Prompt 89)
// -----------------------------------------------------------------------------
// The same instrument and the same kernel. Quantitative derives the four
// minutes from the length of the year; advanced finds how long a star stays up.
// Expected values are recomputed in tools/authoring/skyModels.mjs.
// =============================================================================

export default {
  id: 'the-turning-sky',
  steps: [
    {
      sid: 'sidereal-day',
      after: 'why-four-minutes',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The four minutes from the year',
      body: `In one year of 365.2422 days the Earth turns 366.2422 times
             against the stars: one turn more than the number of sunrises.
             A solar day is 1,440 minutes.`,
      prompt: 'How many minutes shorter than a solar day is a sidereal day?',
      unit: 'min',
      answer: 3.93,
      tolerance: 0.05,
      hints: [
        'The extra turn is spread over every day of the year.',
        'Divide 1,440 minutes by the number of turns.',
      ],
      worked:
        '1,440 min ÷ 366.2422 = 3.93 min, so a sidereal day is 23 h 56 min 4 s.',
      feedback: {
        close:
          'Close. Divide the solar day by the number of turns in a year, 366.2422.',
        'wrong-order-of-magnitude':
          'A power of ten out. The two kinds of day differ by minutes, not hours or seconds.',
        off: 'Shorter by 1,440 ÷ 366.2422 minutes.',
      },
      tool: { id: 'sky-turning', values: { lat: 40, nights: 30, star: 1 } },
    },
    {
      sid: 'time-above-the-horizon',
      after: 'height-at-the-meridian',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'How long it stays up',
      body: `With Arcturus selected at latitude 40°, find from the rising
             and setting times how long it is above the horizon. The hour
             angle at which a star sets satisfies cos H = −tan&nbsp;latitude
             × tan&nbsp;declination, so the time up is 2H as hours of
             sidereal time. The instrument also allows for refraction and the
             star's apparent place.`,
      prompt: 'Time Arcturus is above the horizon at latitude 40°',
      unit: 'h',
      answer: 14.3,
      tolerance: 0.2,
      hints: [
        'Subtract the rising time from the setting time and convert minutes to hours.',
        'Or use the formula: H = arccos(−tan 40° × tan 19.2°), then 2H ÷ 15 gives hours.',
      ],
      worked:
        'Rise at 738.5 min and set at 1,597.6 min after noon: 859.1 min = 14.3 h.',
      feedback: {
        close: 'Close. Take set minus rise, and divide by 60 for hours.',
        'wrong-order-of-magnitude': 'A star is up for between 0 and 24 hours.',
        off: 'Time up = (setting time − rising time) ÷ 60, in hours.',
      },
      tool: { id: 'sky-turning', values: { lat: 40, nights: 0, star: 1 } },
    },
  ],
};
