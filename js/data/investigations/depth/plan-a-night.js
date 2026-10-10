// =============================================================================
// Plan a Night at the Telescope, deeper (Prompt 89)
// -----------------------------------------------------------------------------
// Quantitative: the cost of the flat-layer airmass. Advanced: why a latitude
// has no astronomical dark in summer.
// =============================================================================

export default {
  id: 'plan-a-night',
  steps: [
    {
      sid: 'secant-versus-fit',
      after: 'why-limit-airmass',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'How wrong is the flat layer',
      body: `The flat-layer airmass 1/sin(altitude) grows without limit at the
             horizon, which the real, curved atmosphere does not. The Kasten and
             Young fit that the kernel uses gives 5.59 at an altitude of
             10&deg;.`,
      prompt:
        'By how much does 1/sin(altitude) overestimate the airmass at 10°?',
      unit: '',
      answer: 0.17,
      tolerance: 0.03,
      hints: ['Compute 1 ÷ sin 10°, then subtract the fit.'],
      worked:
        '1 ÷ sin 10° = 5.76, and 5.76 − 5.59 = 0.17: a 3 percent error at an airmass near 6, negligible near 2.',
      feedback: {
        close: 'Close. 1 ÷ sin 10° is about 5.76; subtract the fit.',
        'wrong-order-of-magnitude': 'The two airmasses agree to a few percent.',
        off: 'Difference = 1/sin(10°) − 5.59.',
      },
      tool: {
        id: 'sky-plan',
        values: { lat: 30, day: 28, airmassMax: 2, moonSep: 30 },
      },
    },
    {
      sid: 'midnight-sun-altitude',
      after: 'dark-hours',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'Why there is no dark',
      body: `Set the evening to 2025-06-21 and the latitude to 60&deg;: the
             instrument reports no astronomical dark. At midnight the Sun is at
             its lowest, at an altitude of latitude + declination &minus; 90&deg;.
             On 21 June the declination is +23.44&deg;. Astronomical dark needs
             an altitude below &minus;18&deg;.`,
      prompt: 'The Sun’s altitude at midnight on 21 June at latitude 60°',
      unit: 'deg',
      answer: -6.6,
      tolerance: 0.3,
      hints: ['Add the latitude and the declination, then subtract 90°.'],
      worked:
        '60° + 23.44° − 90° = −6.6°, far above −18°: the sky never gets dark enough.',
      feedback: {
        close: 'Close. Latitude plus declination minus 90°.',
        'wrong-order-of-magnitude': 'It is a small negative angle.',
        off: 'Lowest altitude = latitude + declination − 90°.',
      },
      tool: {
        id: 'sky-plan',
        values: { lat: 60, day: 171, airmassMax: 2, moonSep: 30 },
      },
    },
  ],
};
