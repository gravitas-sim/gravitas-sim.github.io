// =============================================================================
// Wanderers on the Sky, deeper (Prompt 89)
// -----------------------------------------------------------------------------
// Quantitative: the synodic period from the two orbital periods. Advanced: the
// westward rate at opposition from circular orbits, against the instrument.
// =============================================================================

export default {
  id: 'wanderers-on-the-sky',
  steps: [
    {
      sid: 'synodic-period',
      after: 'when-retrograde',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'How often the loop comes round',
      body: `Earth gains on Mars once per <em>synodic period</em> S, with
             1/S = 1/P<sub>Earth</sub> &minus; 1/P<sub>Mars</sub>. The orbital
             periods are 365.256 and 686.98 days.`,
      prompt: 'The synodic period of Mars',
      unit: 'd',
      answer: 780,
      tolerance: 5,
      hints: ['Take the difference of the two rates (per day) and invert.'],
      worked:
        '1/S = 1/365.256 − 1/686.98, so S = 779.9 days: a retrograde loop about every 26 months.',
      feedback: {
        close: 'Close. Subtract the reciprocals, then invert.',
        'wrong-order-of-magnitude':
          'Longer than a year and shorter than a decade.',
        off: 'S = 1 ÷ (1/365.256 − 1/686.98).',
      },
      tool: { id: 'sky-wanderers', values: { planet: 2, day: 0 } },
    },
    {
      sid: 'westward-rate',
      after: 'fastest-westward',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'The speed of the loop',
      body: `At opposition Earth (29.78&nbsp;km/s) passes Mars (24.07&nbsp;km/s)
             on a line through the Sun, 0.524&nbsp;au (7.84&times;10&sup7;&nbsp;km)
             away in circular orbits. The line of sight turns at the relative
             speed divided by the distance.`,
      prompt:
        'The westward rate of Mars at opposition in circular orbits, as a magnitude in degrees per day',
      unit: 'deg/d',
      answer: 0.36,
      tolerance: 0.01,
      hints: [
        'Relative speed ÷ distance gives radians per second; convert to degrees per day.',
      ],
      worked:
        '(29.78 − 24.07) km/s ÷ 7.84×10⁷ km = 7.3×10⁻⁸ rad/s = 0.36° per day. The instrument gives 0.40° per day at this opposition, because the orbits are not circles.',
      feedback: {
        close:
          'Close. Relative speed ÷ distance, then radians to degrees and seconds to days.',
        'wrong-order-of-magnitude':
          'A planet moves less than a degree a day against the stars.',
        off: 'Rate = (v Earth − v Mars) ÷ distance, in rad per second; ×86,400 s and ×57.30 for degrees per day.',
      },
      tool: { id: 'sky-wanderers', values: { planet: 2, day: 106 } },
    },
  ],
};
