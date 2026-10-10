// =============================================================================
// A Lens Passing By, deeper (Prompt 94)
// -----------------------------------------------------------------------------
// The same instrument. Quantitative: the crossing time by hand. Advanced: the
// fit of a synthetic event by the inference core's fitter, with the blend held
// and free. The synthetic event is a model curve with seeded noise (truth
// t0 = 0, u0 = 0.15, tE = 25 days, source share 0.6, noise 2 percent); no
// authentic light curve ships, because its terms of use could not be
// confirmed (D-LENS-01). Every expected value is recomputed in
// tests/lensingInvestigations.test.js.
// =============================================================================

const LM = (values = {}) => ({ id: 'lens-passing', values });
const TYPICAL = {
  logM: Math.log10(0.3),
  dl: 6,
  v: 200,
  u0: 0.1,
  fs: 1,
  rho: 0,
  data: 0,
};
const EVENT = { ...TYPICAL, v: 130, u0: 0.15, fs: 0.6, data: 1 };

export default {
  id: 'a-lens-passing-by',
  steps: [
    {
      sid: 'the-crossing-time-by-hand',
      after: 'how-long',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The crossing time by hand',
      body: `The lens's Einstein angle is 0.319 milliarcseconds and it is 6 kpc
             away, so its Einstein radius at the lens is 0.319 × 6 =
             1.91 astronomical units. An astronomical unit is 1.496 × 10<sup>8</sup>
             km, and the lens moves across the line of sight at 200 km/s.`,
      prompt: 'The time the lens takes to move one Einstein radius',
      unit: 'd',
      answer: 16.6,
      tolerance: 0.4,
      hints: ['t = R ÷ v, then divide by 86,400 seconds in a day.'],
      worked:
        'R = 1.91 × 1.496 × 10⁸ km = 2.86 × 10⁸ km; t = 2.86 × 10⁸ ÷ 200 = 1.43 × 10⁶ s = 16.6 days. The instrument lists the same crossing time.',
      feedback: {
        close: 'Close. Check the conversion from seconds to days.',
        'wrong-order-of-magnitude':
          'A power of ten out: a lens moving at 200 km/s covers 17 million kilometers a day.',
        off: 't_E = (1.91 × 1.496 × 10⁸ km) ÷ (200 km/s), in days.',
      },
      tool: LM(TYPICAL),
    },
    {
      sid: 'the-peak-by-hand',
      after: 'the-crossing-time-by-hand',
      depth: 'quantitative',
      type: 'question',
      kind: 'numeric',
      title: 'The peak by hand',
      body: `The point-lens magnification is A(u) = (u² + 2) ÷ (u √(u² + 4)).
             Take u = 0.5, a pass at half the Einstein radius.`,
      prompt: 'The magnification at u = 0.5',
      unit: '',
      answer: 2.18,
      tolerance: 0.03,
      hints: ['u² + 2 = 2.25 and u² + 4 = 4.25.'],
      worked:
        'A = 2.25 ÷ (0.5 × √4.25) = 2.25 ÷ (0.5 × 2.062) = 2.18. At one Einstein radius it would be 1.34 and at a tenth it is 10; the same number is the sum of the two images of a point lens at offset 0.5 in the lens plane.',
      feedback: {
        close: 'Close. √4.25 is 2.062.',
        off: 'A = (0.25 + 2) ÷ (0.5 × √(0.25 + 4)).',
      },
      tool: LM({ ...TYPICAL, u0: 0.5 }),
    },
    {
      sid: 'fit-the-event-blend-free',
      after: 'blended-light',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'Fit the synthetic event, blending free',
      body: `Switch on “Synthetic event with noise”. The gray points are a
             synthetic microlensing event: a model curve with 2 percent noise,
             made here, so the truth exists though you are not told it. The
             instrument fits it with the inference core's fitter. Read the
             crossing time of the fit in which the blend is free.`,
      prompt: 'The best-fit crossing time with blending free',
      unit: 'd',
      answer: 25.2,
      tolerance: 1.3,
      hints: [
        'Read “Best fit with blending free: tE”; its error bar is about 0.65 days.',
      ],
      worked:
        'The free fit gives tE = 25.2 ± 0.7 days, u0 = 0.148 and a source share of 0.59, with chi-square per point 1.01: the model fits to within the noise. The tolerance here is two standard errors.',
      feedback: {
        close: 'Close. Read the row for the fit with blending free, not held.',
        off: 'Use “Best fit with blending free: tE”.',
      },
      tool: LM(EVENT),
    },
    {
      sid: 'the-wrong-blend',
      after: 'fit-the-event-blend-free',
      depth: 'advanced',
      type: 'question',
      kind: 'numeric',
      title: 'The fit that assumes no blend',
      body: `The other fit holds the blend at none: it assumes all the light is
             the source's. It finds a shorter event with a much smaller error bar.
             Read its chi-square per point; a fit that describes the data to
             within the noise has about 1.`,
      prompt: 'Chi-square per point of the fit with no blending',
      unit: '',
      answer: 2.13,
      tolerance: 0.1,
      hints: ['Read “Best fit with no blending: chi-square per point”.'],
      worked:
        'The no-blend fit gives chi-square per point 2.13 with a crossing time of 17.4 ± 0.06 days: a confident wrong answer, 8 days short of the truth, whose small error bar covers only the noise and not the wrong assumption. The free fit’s larger error bar, 0.65 days, is the honest one. A single curve cannot tell you the mass anyway: the crossing time still leaves mass, distance and speed degenerate.',
      feedback: {
        close: 'Close. Read the held fit, the one with no blending.',
        off: 'Use “Best fit with no blending: chi-square per point”.',
      },
      tool: LM(EVENT),
    },
  ],
};
