// =============================================================================
// Bending Light
// -----------------------------------------------------------------------------
// Content only, no imports: every step that needs a live number is handed a
// `ctx` by the engine. The card paragraph is written once in summaries.js (and
// summaries.es.js). Every step carries a `sid`, an opaque stable id that student
// progress is keyed by (js/investigations/progressSchema.js): reword a step,
// move it, translate it, never change its sid.
//
// The instrument is the lensing family's "light-bending" tool
// (js/lensingWidgets.js over js/kernels/lensing): a ray passing a point mass,
// the bending 4GM/(c^2 b) in the weak field. The numbers a student reads are
// checked against that model by tests/lensingInvestigations.test.js. The model
// is a model, and the lesson says where it stops being true.
// =============================================================================

/** Two placeholder stars on the canvas: a display; the instrument is where the numbers are. */
const STARS = {
  spacing: 150,
  fit: true,
  stars: [
    { role: 'lens', name: 'A massive star', teffK: 5800, lumSun: 1 },
    { role: 'source', name: 'A distant star', teffK: 9000, lumSun: 30 },
  ],
};
const LB = (values = {}) => ({ id: 'light-bending', values });

const BENDING_LIGHT = {
  id: 'bending-light',
  thumbnail: 'images/investigations/bending-light.webp',
  title: 'Bending Light',
  subtitle:
    'How far a mass turns a ray of light, and the Sun’s 1.75 arcseconds',
  duration: '20-30 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 24, section: null },
  courseLevel: 'majors',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'algebra',
  prerequisites: ['what-is-a-gravitational-wave'],
  tags: ['gravity', 'observing'],
  lock: { placement: true, inspector: true },
  objectives: [
    'State what the bending of a ray of light depends on: the mass of the lens and how close the ray passes',
    'Measure the bending at the Sun’s limb, about 1.75 arcseconds, and say what it was compared with in 1919',
    'Scale the bending with the mass and the closest approach, and say which way each goes',
    'Say what the weak-field formula assumes and find a case where it cannot be trusted',
  ],
  steps: [
    {
      sid: 'a-mass-turns-light',
      stage: STARS,
      type: 'read',
      title: 'A mass turns a ray of light',
      body: `General relativity says that mass curves space, and a ray of light
             follows the curve: when it passes a mass it is turned toward it.
             For a ray that passes a point mass <em>M</em> at a closest approach
             <em>b</em>, far outside the mass's own Schwarzschild radius, the
             angle is <strong>4GM ÷ (c²b)</strong>. A particle of matter moving at the speed of light, in
             Newton's gravity, would be turned by half as much.
             \n\nThe instrument draws the bending against the closest approach
             on logarithmic axes. The gray line is the Sun, the colored line is
             the mass you choose, and the dot is the ray. This is a
             <strong>model</strong>: one point mass, one ray, in a weak field.`,
      tool: LB({ logM: 0, logB: 0 }),
    },
    {
      sid: 'the-suns-limb',
      stage: STARS,
      type: 'measure',
      title: 'Light grazing the Sun',
      body: `Set the mass to <strong>1</strong> solar mass and the closest
             approach to <strong>1</strong> solar radius: a ray that just
             grazes the Sun. Read how far it is bent, in arcseconds.`,
      fields: [{ id: 'alpha', label: 'Bending', unit: 'arcsec', hint: '1.75' }],
      validate: v => {
        if (!Number.isFinite(v.alpha)) return null;
        if (Math.abs(v.alpha - 1.75) <= 0.02) {
          return {
            level: 'ok',
            message:
              '1.75 arcseconds, the value Einstein calculated in 1915. The Newtonian row is half of it. Eddington’s eclipse plates in 1919 gave 1.98 ± 0.12 and 1.61 ± 0.30, much nearer 1.75 than 0.88.',
          };
        }
        return {
          level: 'error',
          message:
            'Set “Mass of the lens” to 1 and “Closest approach of the ray” to 1, then read “Bending of the ray”.',
        };
      },
      tool: LB({ logM: 0, logB: 0 }),
    },
    {
      sid: 'predict-the-far-ray',
      stage: STARS,
      type: 'predict',
      reveal: 'the-far-ray',
      title: 'A ray a hundred times farther out',
      body: `Now imagine a ray that passes the Sun at 100 solar radii instead
             of 1. Do not change the instrument yet.`,
      prompt: 'The bending will be&hellip;',
      options: [
        'a hundred times smaller',
        'ten times smaller',
        'the same, since it is the same Sun',
        'a hundred times larger',
      ],
      answer: 0,
      hints: ['The formula has the closest approach b in the denominator.'],
      because:
        'A hundred times smaller. The bending is inversely proportional to the closest approach, so 100 times the distance gives 1/100 of the angle. The next step measures it.',
      tool: LB({ logM: 0, logB: 0 }),
    },
    {
      sid: 'the-far-ray',
      stage: STARS,
      type: 'measure',
      title: 'Measure the far ray',
      body: `Set the closest approach to <strong>100</strong> solar radii and read
             the bending.`,
      fields: [
        { id: 'alpha', label: 'Bending', unit: 'arcsec', hint: '0.0175' },
      ],
      validate: v => {
        if (!Number.isFinite(v.alpha)) return null;
        if (Math.abs(v.alpha - 0.0175) <= 0.0008) {
          return {
            level: 'ok',
            message:
              'Seventeen thousandths of an arcsecond, a hundredth of the value at the limb. The bending falls off as one over the distance: slowly, so a heavy lens bends light that passes far from it.',
          };
        }
        return {
          level: 'error',
          message:
            'Use a mass of 1 and a closest approach of 100, then read “Bending of the ray”.',
        };
      },
      tool: LB({ logM: 0, logB: 2 }),
    },
    {
      sid: 'ten-times-the-mass',
      stage: STARS,
      type: 'measure',
      title: 'Ten times the mass',
      body: `Go back to the limb, 1 solar radius, but make the lens a star of
             <strong>10</strong> solar masses. Read the bending, and the
             Schwarzschild radius 2GM/c².`,
      fields: [
        { id: 'alpha', label: 'Bending', unit: 'arcsec', hint: '17.5' },
        { id: 'rs', label: 'Schwarzschild radius', unit: 'km', hint: '29.5' },
      ],
      validate: v => {
        if (![v.alpha, v.rs].every(Number.isFinite)) return null;
        if (Math.abs(v.alpha - 17.52) <= 0.2 && Math.abs(v.rs - 29.5) <= 0.5) {
          return {
            level: 'ok',
            message:
              'Ten times the mass at the same distance bends light ten times as far, and has ten times the Schwarzschild radius. The mass and the bending are in proportion.',
          };
        }
        return {
          level: 'error',
          message:
            'Set “Mass of the lens” to 10 and “Closest approach” to 1, then read the two rows.',
        };
      },
      tool: LB({ logM: 1, logB: 0 }),
    },
    {
      sid: 'what-1919-showed',
      stage: STARS,
      type: 'question',
      kind: 'choice',
      title: 'What the 1919 eclipse decided',
      body: `The instrument lists two predictions for the Sun's limb: general
             relativity's 1.75 arcseconds and the Newtonian half of it, 0.88.
             Eddington's expeditions photographed stars near the Sun during the
             eclipse of 29 May 1919 and measured 1.98 ± 0.12 and 1.61 ± 0.30
             arcseconds at their two sites.`,
      prompt: 'Which statement do the measurements support?',
      options: [
        'The bending is near 1.75 arcseconds, and the Newtonian 0.88 is ruled out',
        'The bending is near 0.88 arcseconds, as Newton said',
        'There is no bending: the stars did not move',
        'The two sites disagree so much that nothing can be said',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'newton',
          option: 1,
          say: 'Both values are far from 0.88: 1.98 is more than eight error bars away and 1.61 is more than two. They sit around 1.75.',
        },
      ],
      hints: [
        'Compare each measurement with 0.88 and with 1.75, in units of its error bar.',
      ],
      because:
        'The measurements agree with general relativity, 1.75, and exclude the Newtonian 0.88 (the 1.98 value by about nine error bars, the 1.61 value by about two and a half). The result made the news because it could have gone the other way.',
      tool: LB({ logM: 0, logB: 0 }),
    },
    {
      sid: 'where-the-formula-fails',
      stage: STARS,
      type: 'measure',
      title: 'Where the formula cannot be trusted',
      body: `Load “A black hole of 100 million Suns”. Read how many Schwarzschild
             radii the ray passes from the center, and what the formula says the
             bending is. The formula assumes the ray passes far outside the
             Schwarzschild radius, and the instrument says whether it does.`,
      fields: [
        {
          id: 'ratio',
          label: 'Closest approach in Schwarzschild radii',
          unit: '',
          hint: '2.4',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.ratio)) return null;
        if (Math.abs(v.ratio - 2.36) <= 0.15) {
          return {
            level: 'ok',
            message:
              'The ray passes at 2.4 Schwarzschild radii, and the formula returns about 49 degrees, which is not a small angle: the weak-field formula has stopped being valid, and a real ray this close is turned by a different, larger amount, or captured. The model says so in its last row.',
          };
        }
        return {
          level: 'error',
          message:
            'Use a mass of 100 million Suns (10^8) and a closest approach of about 1,000 solar radii, then read “Closest approach divided by the Schwarzschild radius”.',
        };
      },
      tool: LB({ logM: 8, logB: 3 }),
    },
    {
      sid: 'what-you-worked-out',
      stage: STARS,
      type: 'read',
      title: 'What you worked out',
      body: `A mass bends a ray of light by 4GM ÷ (c²b): in proportion to the
             mass and inversely with the closest approach. For the Sun's limb
             that is 1.75 arcseconds, twice the Newtonian value, and 1919
             favored it. The formula is a weak-field one, valid when the ray
             passes at many Schwarzschild radii, and it fails for a ray that
             passes a black hole's edge. When the lens, the source and the
             observer line up, a bending of this kind makes rings, and the
             next investigation makes them.`,
      tool: LB({ logM: 0, logB: 0 }),
    },
  ],
};

export default BENDING_LIGHT;
