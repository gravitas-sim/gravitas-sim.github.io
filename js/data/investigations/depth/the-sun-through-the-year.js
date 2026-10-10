// =============================================================================
// The Sun Through the Year, deeper (Prompt 89)
// -----------------------------------------------------------------------------
// Quantitative computes the sunlight from the radiation kernel's solar
// constant; advanced compares a high latitude with the equator.
// =============================================================================

export default {
  id: 'the-sun-through-the-year',
  steps: [
    {
      sid: 'daily-sunlight',
      after: 'three-day-lengths',
      depth: 'quantitative',
      type: 'measure',
      title: 'Sunlight on a square meter',
      body: `The daily mean sunlight at the top of the atmosphere on a
             horizontal square meter is S₀/π × (1/R²)
             × (H sinφ sinδ + cosφ cosδ sin&nbsp;H),
             where S₀ is the solar constant from the radiation kernel's
             Sun, 1,361&nbsp;W/m², R the distance in au and H the
             half-day arc. The instrument evaluates it. At latitude 40°,
             read it at the two solstices.`,
      fields: [
        { id: 'jun', label: 'June solstice', unit: '', hint: '483' },
        { id: 'dec', label: 'December solstice', unit: '', hint: '156' },
        {
          id: 'ratio',
          label: 'June divided by December',
          unit: '',
          decimals: 1,
          compute: v => v.jun / v.dec,
        },
      ],
      validate: v => {
        if (![v.jun, v.dec].every(Number.isFinite)) return null;
        const ok = (x, want) => Math.abs(x - want) <= 6;
        if (ok(v.jun, 483) && ok(v.dec, 156)) {
          return {
            level: 'ok',
            message:
              'Three times as much sunlight in June as in December at this latitude, from the height of the Sun and the length of the day together.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the latitude to 40° and read the daily mean sunlight row at each solstice.',
        };
      },
      tool: { id: 'sky-seasons', values: { lat: 40, day: 171, tilt: 23.44 } },
    },
    {
      sid: 'distance-in-percent',
      after: 'daily-sunlight',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'How much the distance matters',
      body: `Sunlight falls as 1/R². The Sun is 1.0163&nbsp;au away on the
             June solstice and 0.9838&nbsp;au on the December solstice.`,
      prompt:
        'By what percent is the sunlight stronger in December than in June, from distance alone?',
      unit: '%',
      answer: 6.7,
      tolerance: 0.4,
      hints: [
        'The ratio of the sunlight is the square of the inverse ratio of the distances.',
        'Convert the ratio to a percent increase.',
      ],
      worked:
        '(1.0163 / 0.9838)² = 1.067: 6.7 percent stronger in December, against a threefold change at 40° from the tilt.',
      feedback: {
        close: 'Close. Square the ratio of the distances, then subtract 1.',
        'wrong-order-of-magnitude': 'A few percent, not tens of percent.',
        off: 'Sunlight ∝ 1/R², so the ratio is (R June ÷ R December)².',
      },
      tool: { id: 'sky-seasons', values: { lat: 40, day: 354, tilt: 23.44 } },
    },
    {
      sid: 'polar-summer',
      after: 'distance-is-not-it',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'The pole beats the equator',
      body: `At the June solstice, read the daily mean sunlight at latitude
             0° and at latitude 65°.`,
      prompt: 'Which receives more sunlight over the day?',
      options: [
        'latitude 65°, where the Sun is low but up for 22 hours',
        'the equator, where the Sun is high at noon',
        'they are equal',
        'neither: there is no sunlight at the top of the atmosphere',
      ],
      answer: 0,
      hints: ['Compare the two numbers in the readout, and the day lengths.'],
      because:
        'Latitude 65° gets about 478 W/m² against the equator’s 385: the Sun is up for 22 hours, and that beats the lower altitude. Over the whole year the equator still receives more, because the polar winter has none.',
      tool: { id: 'sky-seasons', values: { lat: 65, day: 171, tilt: 23.44 } },
    },
  ],
};
