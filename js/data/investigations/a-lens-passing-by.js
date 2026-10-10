// =============================================================================
// A Lens Passing By
// -----------------------------------------------------------------------------
// Content only, no imports (see bending-light.js for the conventions). The
// instrument is the lensing family's "lens-passing" tool (js/lensingWidgets.js
// over js/kernels/lensing): the Paczynski light curve of a point lens crossing
// a star, with finite-source and blending parameters, and a synthetic event
// with noise for the advanced depth to fit with the inference core's fitter.
// The numbers a student reads are checked against that model by
// tests/lensingInvestigations.test.js. No authentic event light curve ships:
// its terms of use could not be confirmed (DECISION_REGISTER, D-LENS-01).
// =============================================================================

/** Two placeholder stars on the canvas: a display; the instrument is where the numbers are. */
const STARS = {
  spacing: 150,
  fit: true,
  stars: [
    { role: 'lens', name: 'The lens', teffK: 3400, lumSun: 0.02 },
    { role: 'source', name: 'The source star', teffK: 5800, lumSun: 1 },
  ],
};
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

const A_LENS_PASSING_BY = {
  id: 'a-lens-passing-by',
  thumbnail: 'images/investigations/a-lens-passing-by.webp',
  title: 'A Lens Passing By',
  subtitle: 'Microlensing light curves, and what one curve cannot tell you',
  duration: '25-40 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 24, section: null },
  courseLevel: 'majors',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'algebra',
  prerequisites: ['einstein-rings-and-arcs'],
  tags: ['observing', 'stars', 'gravity'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Say why a star brightens and fades when a lens passes in front of it, and read the peak and the duration of the event',
    'Find the crossing time from a mass, a distance and a speed',
    'Say why a light curve fixes the crossing time but not the mass, the distance and the speed separately',
    'Say what blending and a finite source do to a light curve',
    'Say what the fit to a real-looking event can and cannot recover',
  ],
  steps: [
    {
      sid: 'a-star-brightens',
      stage: STARS,
      type: 'read',
      title: 'A star brightens and fades',
      body: `When a lens passes almost in front of a star, the two
             images are too close together to resolve (a milliarcsecond
             apart), but together they carry more light than the star alone.
             The star <strong>brightens</strong> and fades again as the lens
             moves on, for days or weeks.
             \n\nThe instrument draws the light curve: flux over its quiet
             baseline against time. It depends on how close the pass is
             (<em>u</em><sub>0</sub>, in Einstein radii) and on the
             <strong>crossing time</strong> t<sub>E</sub> the lens takes to move one Einstein
             radius, which in turn depends on the lens's mass, distance and
             speed. This is a <strong>model</strong>: one point lens moving in a straight
             line past one star.`,
      tool: LM(TYPICAL),
    },
    {
      sid: 'predict-the-peak',
      stage: STARS,
      type: 'predict',
      reveal: 'the-peak',
      title: 'How bright does it get?',
      body: `In the instrument the lens passes the star at 0.1 Einstein
             radii: ten times closer than one Einstein radius. Do not change the
             instrument yet.`,
      prompt: 'At closest approach the star will be about&hellip;',
      options: [
        'ten times brighter',
        'twice as bright',
        'a hundred times brighter',
        'just a few percent brighter',
      ],
      answer: 0,
      hints: [
        'At one Einstein radius the magnification is 1.34. A closer pass gives more.',
      ],
      because:
        'About ten times. The magnification of a point lens is (u² + 2) ÷ (u √(u² + 4)), which for small u is close to 1 ÷ u: a pass at 0.1 Einstein radii gives 10.',
      tool: LM(TYPICAL),
    },
    {
      sid: 'the-peak',
      stage: STARS,
      type: 'measure',
      title: 'The peak',
      body: `With the typical event (closest approach 0.1) read the peak flux
             over the baseline.`,
      fields: [
        { id: 'peak', label: 'Peak flux over baseline', unit: '', hint: '10' },
      ],
      validate: v => {
        if (!Number.isFinite(v.peak)) return null;
        if (Math.abs(v.peak - 10.04) <= 0.1) {
          return {
            level: 'ok',
            message:
              'A tenfold brightening, 10.04, for a pass at a tenth of the Einstein radius. A pass at 0.01 Einstein radii would be a hundred times brighter, if the star were a point.',
          };
        }
        return {
          level: 'error',
          message:
            'Load “A typical bulge event” and read “Peak flux over baseline”.',
        };
      },
      tool: LM(TYPICAL),
    },
    {
      sid: 'how-long',
      stage: STARS,
      type: 'measure',
      title: 'How long it lasts',
      body: `The lens is 0.3 solar masses, 6 kiloparsecs away, moving across the
             line of sight at 200 km/s, in front of a star 8 kiloparsecs
             away. Read the crossing time and how long the star is brighter
             than 1.34 times its baseline.`,
      fields: [
        { id: 'tE', label: 'Crossing time tE', unit: 'd', hint: '16.6' },
        { id: 'above', label: 'Brighter than 1.34', unit: 'd', hint: '33' },
      ],
      validate: v => {
        if (![v.tE, v.above].every(Number.isFinite)) return null;
        if (Math.abs(v.tE - 16.6) <= 0.3 && Math.abs(v.above - 33) <= 0.6) {
          return {
            level: 'ok',
            message:
              'The lens takes 16.6 days to cross its Einstein radius, and the star is brighter than 1.34 times its baseline for about twice that, 33 days. Typical bulge events last a few weeks.',
          };
        }
        return {
          level: 'error',
          message:
            'Use the typical event (0.3 solar masses, 6 kpc, 200 km/s, closest approach 0.1), then read “Crossing time tE” and “Time brighter than 1.34 times baseline”.',
        };
      },
      tool: LM(TYPICAL),
    },
    {
      sid: 'a-faster-lens',
      stage: STARS,
      type: 'measure',
      title: 'Twice the speed',
      body: `Raise the lens's sideways speed to <strong>400 km/s</strong>, keeping
             everything else. Read the crossing time.`,
      fields: [{ id: 'tE', label: 'Crossing time tE', unit: 'd', hint: '8.3' }],
      validate: v => {
        if (!Number.isFinite(v.tE)) return null;
        if (Math.abs(v.tE - 8.29) <= 0.2) {
          return {
            level: 'ok',
            message:
              'Half the time, 8.3 days: the crossing time is the Einstein radius divided by the speed. The peak is unchanged, because it depends only on how close the pass is.',
          };
        }
        return {
          level: 'error',
          message:
            'Set “Sideways speed of the lens” to 400 km/s with the other values unchanged, then read “Crossing time tE”.',
        };
      },
      tool: LM({ ...TYPICAL, v: 400 }),
    },
    {
      sid: 'one-curve-three-lenses',
      stage: STARS,
      type: 'measure',
      title: 'Other lenses, the same curve',
      body: `Go back to the typical event, tE = 16.6 days. The last two rows of
             the instrument give the mass a lens would need to make
             <em>exactly this</em> curve at other distances and speeds. Read both.`,
      fields: [
        {
          id: 'near',
          label: 'At 2 kpc and 100 km/s',
          unit: 'M☉',
          hint: '0.075',
        },
        {
          id: 'far',
          label: 'At 6 kpc and 300 km/s',
          unit: 'M☉',
          hint: '0.68',
        },
      ],
      validate: v => {
        if (![v.near, v.far].every(Number.isFinite)) return null;
        if (
          Math.abs(v.near - 0.075) <= 0.005 &&
          Math.abs(v.far - 0.675) <= 0.03
        ) {
          return {
            level: 'ok',
            message:
              'A brown dwarf of 0.075 solar masses nearby and slow, or a star of 0.68 solar masses far away and fast, makes the same light curve as the 0.3 solar-mass lens. The mass differs by a factor of nine, and the curve is identical.',
          };
        }
        return {
          level: 'error',
          message:
            'Use the typical event and read the rows “Mass for this tE at 2 kpc and 100 km/s” and “Mass for this tE at 6 kpc and 300 km/s”.',
        };
      },
      tool: LM(TYPICAL),
    },
    {
      sid: 'can-the-curve-weigh-the-lens',
      stage: STARS,
      type: 'question',
      kind: 'choice',
      title: 'Can the light curve weigh the lens?',
      body: `Try the three lenses in the instrument: set the mass, distance and
             speed to the pairs you just read and watch the curve.`,
      prompt: 'What does the shape of one microlensing light curve fix?',
      options: [
        'Only the crossing time: one combination of mass, distance and speed, not each separately',
        'The mass of the lens, whatever its distance',
        'The distance to the lens, whatever its mass',
        'The speed of the lens, and so its mass',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'weighs',
          option: 1,
          say: 'The curve depends on the mass only through the crossing time, which also depends on the distance and the speed. Three different masses made the same curve in the last step.',
        },
      ],
      hints: ['What did the three lenses of the last step have in common?'],
      because:
        'The crossing time, and (with the pass distance and the blend) nothing else. The shape depends on t_E = θ_E D_l ÷ v, one number for three unknowns, so mass, distance and speed are degenerate. Breaking it needs more: the lens’s light, a parallax from a second observer, or the source’s finite size.',
      tool: LM(TYPICAL),
    },
    {
      sid: 'blended-light',
      stage: STARS,
      type: 'measure',
      title: 'Light from other stars',
      body: `In a crowded field other stars fall in the same pixel. Load “The
             same event, half the light blended”: only half of the baseline
             light is the source's. Read the peak flux over the baseline.`,
      fields: [
        { id: 'peak', label: 'Peak flux over baseline', unit: '', hint: '5.5' },
      ],
      validate: v => {
        if (!Number.isFinite(v.peak)) return null;
        if (Math.abs(v.peak - 5.52) <= 0.1) {
          return {
            level: 'ok',
            message:
              'The same event peaks at 5.5, not 10: the unmagnified light of the other stars dilutes the rise. A fit that ignores the blend would call this a pass at about 0.18 Einstein radii.',
          };
        }
        return {
          level: 'error',
          message:
            'Set “Share of the light that is the source’s” to 0.5 with the typical event, then read “Peak flux over baseline”.',
        };
      },
      tool: LM({ ...TYPICAL, fs: 0.5 }),
    },
    {
      sid: 'a-star-with-a-size',
      stage: STARS,
      type: 'measure',
      title: 'A star is not a point',
      body: `Load “A very close pass, finite source”: the lens passes 0.01 Einstein
             radii from the star's center, and the star's radius is 0.1 Einstein
             radii. A point source would be a hundred times brighter. Read the
             peak.`,
      fields: [
        { id: 'peak', label: 'Peak flux over baseline', unit: '', hint: '20' },
      ],
      validate: v => {
        if (!Number.isFinite(v.peak)) return null;
        if (Math.abs(v.peak - 19.98) <= 0.3) {
          return {
            level: 'ok',
            message:
              'About 20, not 100: the star’s disk spreads over regions of very different magnification and averages them. For a pass this close the peak measures the star’s size in Einstein radii, 2 ÷ ρ, rather than the pass distance.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the closest approach to 0.01 and the source radius to 0.1, then read “Peak flux over baseline”.',
        };
      },
      tool: LM({ ...TYPICAL, u0: 0.01, rho: 0.1 }),
    },
    {
      sid: 'what-you-worked-out',
      stage: STARS,
      type: 'read',
      title: 'What you worked out',
      body: `A lens passing in front of a star brightens it by (u² + 2) ÷
             (u √(u² + 4)), 10 for a pass at a tenth of the Einstein radius, over
             a crossing time of weeks for a star-mass lens. The curve fixes that
             time but not the mass, the distance and the speed that made it.
             Blended light lowers the peak, and a finite star caps it. In the
             advanced depth you fit a synthetic event and see how an assumption
             about the blend changes the answer.`,
      tool: LM(TYPICAL),
    },
  ],
};

export default A_LENS_PASSING_BY;
