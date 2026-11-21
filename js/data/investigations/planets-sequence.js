// =============================================================================
// The planetary closeout investigations (Prompt 206)
// -----------------------------------------------------------------------------
// The connecting investigations of the planetary unit, in one module that also
// carries their Spanish words and their instructor content: this is the one
// closure file the closeout adds (D-R10-206-02), because the shared sequence
// files sit at or near their line ceilings and every kind of file a lesson needs
// would otherwise be a file of its own. The per-lesson path every loader builds
// from an id is a one-line re-export of a named export here (English, or `_ES`
// for the Spanish), and the instructor modules read INSTRUCTOR.
//
// Content, no imports: every number a step states is recomputed in
// tests/planetsCloseout.test.js from the instruments and kernels the lesson
// points at. Every step carries a `sid`, an opaque stable id that student
// progress is keyed by: reword a step, move it, translate it, never change its
// sid.
//
// Not here, and why (D-R10-206-01): "Worlds compared" needs the workbench of
// Prompt 203 part B, which is not built; "Reading a surface" needs a marking
// instrument for craters, channels and dunes on the Mars frame, which does not
// exist; "Space weather from the Sun" needs a sunspot-number table pack that has
// not been retrieved. Each is listed with its reason as a reading in the last
// unit of the course package (js/data/courses/solar-system-and-the-sun.js).
// =============================================================================

// js/format.js is 13 KB on the instructor route (a request and a closure file
// for ten calls), so the computed messages format through one Intl formatter
// here, fixed to English like the messages themselves (a computed string is
// not translated).
const FIX = {};
const fixed = (value, digits) =>
  Number.isFinite(value)
    ? (FIX[digits] ||= new Intl.NumberFormat('en-US', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
        useGrouping: false,
      })).format(value)
    : '';

const near = (x, target, tolerance) =>
  Number.isFinite(x) && Math.abs(x - target) <= tolerance;

const JF = (values = {}, hide = []) => ({ id: 'moon-frames', values, hide });
const JP = (values = {}, hide = []) => ({ id: 'moon-fit', values, hide });

// -----------------------------------------------------------------------------
// 1. Moons of the Giants
// -----------------------------------------------------------------------------
/** A reading taken with another moon selected, or on the once-a-night sampling, is told so. */
const WRONG_MOON = {
  id: 'wrongMoon',
  when: { setting: { moon: { max: 0 } } },
  say: 'That reading was taken with another moon selected. Set Moon to 1 for Io, 2 for Europa and 3 for Ganymede, then take the period again.',
};
const NIGHTLY = {
  id: 'nightly',
  when: { setting: { cadence: { max: 0 } } },
  say: 'That reading used the once-a-night sampling (0). This step asks for the designed sampling, 1.',
};
const moonSlips = n => [
  { ...WRONG_MOON, when: { setting: { moon: { max: n - 1 } } } },
  { ...WRONG_MOON, when: { setting: { moon: { min: n + 1 } } } },
  NIGHTLY,
];
/** The motion in degrees a day of a period in days. */
const motion = p => 360 / p;

export const MOONS_OF_THE_GIANTS = {
  id: 'moons-of-the-giants',
  thumbnail: 'images/investigations/moons-of-the-giants.webp',
  title: 'Moons of the Giants',
  subtitle:
    'Three periods from one set of frames, and the combination that is zero when a family of moons keeps step',
  duration: '15-25 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 12, section: '12.2' },
  courseLevel: 'survey',
  mathematics: 'algebra',
  prerequisites: [],
  tags: ['orbits', 'resonance', 'solar-system'],
  lock: { placement: true, inspector: true },
  canvas: 'quiet',
  retired: {
    'the-motions-together': {
      to: 'how-sure-is-the-sum',
      release: '3.1',
      was: {
        en: 'Type the three periods again, read the combination of the three motions the instrument forms, and compare it with a stated uncertainty of 0.025 degrees a day.',
        es: 'Escribir otra vez los tres periodos, leer la combinación de los tres movimientos que forma el instrumento y compararla con una incertidumbre dada de 0,025 grados por día.',
      },
    },
  },
  objectives: [
    'Read the periods of Io, Europa and Ganymede from fitted frames, and form their ratios',
    'Say why a ratio near 2 is a hint of a resonance and not a proof, and what the combination of the three motions adds',
    'Choose the sampling, find the Laplace combination of the three motions with its uncertainty, and say what a value consistent with zero does and does not show',
    'Predict, then test with the same arithmetic, whether Callisto is part of the chain',
  ],
  steps: [
    {
      sid: 'a-family-of-moons',
      type: 'read',
      title: 'A family of moons',
      body: `A giant planet carries a family. Jupiter has four large moons you can see in
             binoculars, Io, Europa, Ganymede and Callisto. This investigation asks
             whether their periods, the times they take to go round, have a pattern, and measures them from pictures.
             \n\nThe frames are the <strong>synthetic</strong> ones of <em>Weighing
             Jupiter From Its Moons</em>: made from the moons&rsquo; real positions in
             November and December 2025 (JPL Horizons), with Jupiter&rsquo;s disk,
             blur and noise added. Nobody observed these pictures. The distances you
             read are the instrument&rsquo;s measurements; the overlay marks where the
             ephemeris puts each moon.`,
      tool: JF({ frame: 13, overlay: 1 }),
    },
    {
      sid: 'three-periods-predict',
      type: 'predict',
      reveal: 'three-periods',
      title: 'How do the three periods compare?',
      body: `Io goes round in about 1.77 days. Europa and Ganymede lie further out. The
             instrument will fit a sinusoid to each moon&rsquo;s distance from Jupiter
             over the 51 frames, and read the period from it.`,
      prompt:
        'Europa’s period, and then Ganymede’s, will each be about&hellip;',
      options: [
        'twice the period of the moon inside it',
        'the same as the moon inside it',
        'one and a half times the moon inside it, because the orbits are 1.5 times as far across',
        'no pattern: the three periods are unrelated',
      ],
      answer: 0,
      hints: [
        'Divide Europa’s period by Io’s, and Ganymede’s by Europa’s, once you have them.',
      ],
      because:
        'About twice each: 2.006 and 2.013. Kepler’s third law would let an orbit 1.5 times as far across take 1.84 times as long, but these ratios are nearer 2 than that, and it is that closeness that is the subject of the rest.',
    },
    {
      sid: 'three-periods',
      type: 'measure',
      title: 'Three periods',
      body: `Set the sampling to <strong>1</strong>, the designed sequence of frames. Then
             choose each moon in turn with <strong>Moon</strong> (1 Io, 2 Europa, 3
             Ganymede) and press <strong>Take reading</strong> beside its period. The
             readings keep the four decimals the instrument gives: the arithmetic that
             follows is sensitive to them.`,
      fields: [
        {
          id: 'p1',
          label: 'Io’s period',
          unit: 'd',
          want: '1.7682',
          source: { tool: 'period' },
          misconceptions: moonSlips(1),
        },
        {
          id: 'p2',
          label: 'Europa’s period',
          unit: 'd',
          want: '3.5480',
          source: { tool: 'period' },
          misconceptions: moonSlips(2),
        },
        {
          id: 'p3',
          label: 'Ganymede’s period',
          unit: 'd',
          want: '7.1413',
          source: { tool: 'period' },
          misconceptions: moonSlips(3),
        },
      ],
      validate: v => {
        if (![v.p1, v.p2, v.p3].every(Number.isFinite)) return null;
        if (
          near(v.p1, 1.7682, 0.001) &&
          near(v.p2, 3.548, 0.001) &&
          near(v.p3, 7.1413, 0.002)
        ) {
          return {
            level: 'ok',
            message:
              'Io 1.7682 days, Europa 3.5480 and Ganymede 7.1413, each with an uncertainty of a few parts in ten thousand of a day. These are the periods the frames show, from Earth, and a little shorter than the moons’ true orbits because Jupiter itself moves along.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose each moon in turn (1, 2, 3) with the designed sampling (1), then take its period.',
        };
      },
      tool: JP({ moon: 4, cadence: 1 }),
    },
    {
      sid: 'the-ratios',
      type: 'measure',
      title: 'Ratios, not quite two',
      body: `The periods you took are listed. Divide them to three decimals: Europa&rsquo;s
             by Io&rsquo;s, and Ganymede&rsquo;s by Europa&rsquo;s.`,
      fields: [
        {
          id: 'p1',
          label: 'Io’s period',
          unit: 'd',
          compute: (v, e) => e?.('three-periods', 'p1'),
          decimals: 4,
        },
        {
          id: 'p2',
          label: 'Europa’s period',
          unit: 'd',
          compute: (v, e) => e?.('three-periods', 'p2'),
          decimals: 4,
        },
        {
          id: 'p3',
          label: 'Ganymede’s period',
          unit: 'd',
          compute: (v, e) => e?.('three-periods', 'p3'),
          decimals: 4,
        },
        {
          id: 'r12',
          label: 'Europa’s period over Io’s',
          unit: '',
          want: '2.006',
        },
        {
          id: 'r23',
          label: 'Ganymede’s period over Europa’s',
          unit: '',
          want: '2.013',
        },
      ],
      validate: v => {
        if (![v.p1, v.p2, v.p3, v.r12, v.r23].every(Number.isFinite))
          return null;
        if (near(v.r12, 2.0065, 0.004) && near(v.r23, 2.0128, 0.004)) {
          return {
            level: 'ok',
            message:
              '2.006 and 2.013: each within about a half of one percent of 2, and not equal to it. A ratio of small whole numbers is a hint that two orbits might be locked together; a mismatch this small is also what many unrelated pairs would show by accident, so the ratio cannot decide.',
          };
        }
        return {
          level: 'error',
          message:
            'Divide the periods listed, to three decimals: Europa’s by Io’s, and Ganymede’s by Europa’s. If the periods look wrong, go back and take Io, Europa and Ganymede with Sampling at 1.',
        };
      },
      tool: JP({ moon: 2, cadence: 1 }),
    },
    {
      sid: 'a-hint-is-not-proof',
      type: 'question',
      kind: 'choice',
      title: 'What does 2.006 say?',
      body: `Europa takes 2.006 times as long as Io; Ganymede 2.013 times as long as
             Europa. Neither is exactly 2.`,
      prompt:
        'What follows from ratios that are close to 2 but not equal to it?',
      options: [
        'Nothing is settled: a ratio near 2 is a hint, and the three motions have to be tested together',
        'The moons cannot be in a resonance, because a resonance needs the ratio to be exactly 2',
        'The moons are certainly locked, because 2.006 rounds to 2',
        'The periods must have been measured wrongly',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'exact',
          option: 1,
          say: 'A resonance is a relation between angles that holds on average while the orbits slowly turn, so the measured periods need not give an exact ratio. The ratio is where to look, not the test.',
        },
        {
          id: 'rounds',
          option: 2,
          say: 'Close is what a hint is. Many pairs of unrelated periods are within a percent of a small ratio; what separates a lock from a coincidence is a relation that holds for all the motions at once, which the next steps build.',
        },
      ],
      hints: [
        'Think about how often two unrelated periods land within one percent of a whole-number ratio.',
      ],
      because:
        'A near ratio is where to look. What Laplace found in 1805 is a relation that involves all three moons at once, and it is the test the next steps apply.',
      tool: JP({ moon: 2, cadence: 1 }),
    },
    {
      sid: 'the-laplace-combination',
      type: 'predict',
      reveal: 'consistent-with-zero',
      title: 'Three motions, one combination',
      body: `Turn each period into a <strong>motion</strong>, the angle the moon goes round
             in a day: <em>n</em> = 360&deg; ÷ period. Laplace&rsquo;s combination is
             <strong><em>n</em><sub>Io</sub> &minus; 3<em>n</em><sub>Europa</sub> +
             2<em>n</em><sub>Ganymede</sub></strong>. The numbers 1, &minus;3 and 2
             add to zero, so a motion every moon shares, such as the apparent one
             Jupiter&rsquo;s own travel adds, cancels out of it. Io goes round at about
             204 degrees a day.`,
      prompt:
        'If the three moons keep exact step, the combination of the three motions is&hellip;',
      options: [
        'zero',
        'about 204 degrees a day, Io’s own motion',
        'about 50 degrees a day, Ganymede’s',
        'a different number each night',
      ],
      answer: 0,
      hints: [
        'The coefficients add to zero for a reason: look at what a shared offset does to them.',
      ],
      because:
        'Zero. Where the three move in step, the relation holds exactly for the mean motions; the measured ones go into it with the uncertainty the fits give.',
    },
    {
      sid: 'how-sure-is-the-sum',
      type: 'measure',
      title: 'How sure is the sum?',
      body: `Choose the <strong>Sampling</strong> you trust: 0 is one frame a night, 1 the
             designed sequence with three hourly nights. Then take each moon in turn
             with <strong>Moon</strong>, and press <strong>Take reading</strong> beside
             its period and beside its uncertainty. The page turns each period into a
             motion, forms Io&rsquo;s minus three times Europa&rsquo;s plus twice
             Ganymede&rsquo;s, and combines the three uncertainties: each motion&rsquo;s
             is 360&deg; × the period&rsquo;s uncertainty ÷ the period squared, and the
             three add in quadrature, weighted 1, 3 and 2.`,
      fields: [
        {
          id: 'q1',
          label: 'Io’s period',
          unit: 'd',
          want: '1.7682',
          source: { tool: 'period' },
        },
        {
          id: 'e1',
          label: 'Io’s period uncertainty',
          unit: 'd',
          want: '0.00010',
          source: { tool: 'sigma' },
        },
        {
          id: 'q2',
          label: 'Europa’s period',
          unit: 'd',
          want: '3.5480',
          source: { tool: 'period' },
        },
        {
          id: 'e2',
          label: 'Europa’s period uncertainty',
          unit: 'd',
          want: '0.00025',
          source: { tool: 'sigma' },
        },
        {
          id: 'q3',
          label: 'Ganymede’s period',
          unit: 'd',
          want: '7.1413',
          source: { tool: 'period' },
        },
        {
          id: 'e3',
          label: 'Ganymede’s period uncertainty',
          unit: 'd',
          want: '0.00047',
          source: { tool: 'sigma' },
        },
        {
          id: 'n1',
          label: 'Io’s motion, degrees a day',
          unit: '',
          compute: v => motion(v.q1),
          decimals: 2,
        },
        {
          id: 'n2',
          label: 'Europa’s motion, degrees a day',
          unit: '',
          compute: v => motion(v.q2),
          decimals: 2,
        },
        {
          id: 'n3',
          label: 'Ganymede’s motion, degrees a day',
          unit: '',
          compute: v => motion(v.q3),
          decimals: 2,
        },
        {
          id: 'laplace',
          label: 'Io − 3 × Europa + 2 × Ganymede, degrees a day',
          unit: '',
          compute: v => motion(v.q1) - 3 * motion(v.q2) + 2 * motion(v.q3),
          decimals: 3,
        },
        {
          id: 'sig',
          label: 'Its uncertainty, degrees a day',
          unit: '',
          compute: v =>
            Math.hypot(
              (360 * v.e1) / v.q1 ** 2,
              (3 * 360 * v.e2) / v.q2 ** 2,
              (2 * 360 * v.e3) / v.q3 ** 2
            ),
          decimals: 3,
        },
      ],
      validate: v => {
        if (![v.q1, v.q2, v.q3, v.e1, v.e2, v.e3].every(Number.isFinite))
          return null;
        if (near(v.q1, 2.3018, 0.05)) {
          return {
            level: 'error',
            message:
              'Io’s period reads 2.30 days with the once-a-night sampling, and its uncertainty looks as small as ever. A moon that goes round in under two days cannot be followed by frames a day apart: the fit lands on an alias. The combination is then far from zero because of the sampling, not the moons. Set Sampling to 1 and take the six readings again.',
          };
        }
        const small = [v.e1, v.e2, v.e3].every(e => e > 0 && e < 0.002);
        if (
          near(v.q1, 1.7682, 0.003) &&
          near(v.q2, 3.548, 0.003) &&
          near(v.q3, 7.1413, 0.005) &&
          small
        ) {
          return {
            level: 'ok',
            message: `Your combination is ${fixed(v.laplace, 3)} degrees a day, with an uncertainty of ${fixed(v.sig, 3)}, against motions of 204, 101 and 50 degrees a day. The four decimals of each period matter: rounded to three they would give 0.05.`,
          };
        }
        return {
          level: 'error',
          message:
            'Take the period and its uncertainty for Io, Europa and Ganymede in turn (Moon 1, 2, 3), all with the same sampling.',
        };
      },
      tool: JP({ moon: 4, cadence: 0 }),
    },
    {
      sid: 'consistent-with-zero',
      type: 'question',
      kind: 'choice',
      title: 'Is it zero?',
      body: `Your combination of the three motions, and its uncertainty, are in the box
             below.`,
      evidence: [
        { step: 'how-sure-is-the-sum', field: 'laplace' },
        { step: 'how-sure-is-the-sum', field: 'sig' },
      ],
      prompt: 'What does that say about whether it is zero?',
      options: [
        'It is consistent with zero: it is smaller than its own uncertainty, which is as close as these frames can say',
        'It is not zero, so the moons are not in a resonance',
        'It is exactly zero, so the moons are certainly locked',
        'It means nothing, because it is not a whole number',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'not-zero',
          option: 1,
          say: 'A value smaller than its uncertainty cannot be told from zero by these frames. Not being exactly 0 is what every measurement does. If yours is far larger than its uncertainty, look at the sampling you chose.',
        },
        {
          id: 'proof',
          option: 2,
          say: 'Consistent with zero is not the same as exactly zero, and neither proves that the moons are locked: the relation among the motions is a necessary condition. What the frames cannot show is whether the angle itself librates.',
        },
      ],
      hints: ['Compare the combination with the uncertainty beside it.'],
      because:
        'Consistent with zero. The combination is thousands of times smaller than Io’s motion, and inside its uncertainty. That is the necessary relation, observed. The sufficient part, that the angle <em>librates</em> and does not circulate, needs the angle watched over years; <em>When Orbits Lock</em> runs that in a model.',
      tool: JP({ moon: 3, cadence: 1 }),
    },
    {
      sid: 'callisto-predict',
      type: 'predict',
      reveal: 'callisto-is-not-in-the-chain',
      title: 'Does Callisto belong?',
      body: `Callisto is the fourth moon, and the farthest. Ganymede&rsquo;s period is the
             one you took in step 3, and Callisto&rsquo;s orbit is about 1.76 times as
             wide as Ganymede&rsquo;s.`,
      prompt: 'Callisto’s period, divided by Ganymede’s, will be about&hellip;',
      options: [
        'about 2.3, which is not near the 2 of the other pairs',
        'about 2, as for the other pairs',
        'about 3',
        'about 1.5',
      ],
      answer: 0,
      hints: [
        'Kepler’s third law turned 1.5 into 1.84 for the first prediction: do the same with 1.76.',
      ],
      because:
        'About 2.33: 1.76 to the power 1.5 is 2.33, nowhere near the 2 that keeps the first three in step.',
    },
    {
      sid: 'callisto-is-not-in-the-chain',
      type: 'measure',
      title: 'And Callisto?',
      body: `Choose <strong>Moon</strong> 4, with the sampling at 1, and take its period.
             The page divides it by Ganymede&rsquo;s period from step 3.`,
      fields: [
        {
          id: 'p4',
          label: 'Callisto’s period',
          unit: 'd',
          want: '16.624',
          source: { tool: 'period' },
        },
        {
          id: 'r34',
          label: 'Callisto’s period over Ganymede’s',
          unit: '',
          compute: (v, e) => v.p4 / e?.('three-periods', 'p3'),
          decimals: 3,
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.p4)) return null;
        if (near(v.p4, 16.624, 0.02) && near(v.r34, 2.328, 0.006)) {
          return {
            level: 'ok',
            message:
              '16.62 days, and a ratio of 2.33: not the 2 of the chain, nor 5/2. Callisto is not locked to the other three, and the same arithmetic that supports the chain of three says so.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose moon 4 with the designed sampling, then take its period.',
        };
      },
      tool: JP({ moon: 1, cadence: 1 }),
    },
    {
      sid: 'what-you-worked-out',
      type: 'read',
      title: 'What you worked out',
      body: `Three periods from synthetic frames, 1.7682, 3.5480 and 7.1413 days; ratios
             of 2.006 and 2.013, close to 2 and not equal to it, which is a hint and not
             a test; and a combination of the three motions that came out smaller than
             its own uncertainty, when each motion is some thousands of times larger. The
             sampling mattered: once a night, Io&rsquo;s period is an alias and the
             combination is tens of degrees a day from zero. Callisto, at a ratio of 2.33,
             is outside the chain. What the frames cannot show is the angle itself
             holding for years, which <em>When Orbits Lock</em> follows in a model. Other
             giants carry families of their own (Saturn&rsquo;s moons, Uranus&rsquo;s),
             and this set covers only Jupiter&rsquo;s.`,
    },
  ],
};

// -----------------------------------------------------------------------------
// 2. The Scale of the Solar System (the sandbox, true scale: 100 units to an AU)
// -----------------------------------------------------------------------------
const SOLAR_BIND = {
  sun: { name: 'Sol' },
  earth: { name: 'Earth' },
  jupiter: { name: 'Jupiter' },
  neptune: { name: 'Neptune' },
};
const SCALE_SETUP = {
  scenario: 'Solar System',
  seed: 'scale-of-the-solar-system',
  settings: { enable_asteroids: false, num_asteroids: 0, num_comets: 0 },
  camera: { zoom: 0.25, pan: { x: 0, y: 0 } },
  paused: true,
};
/** Distance of a body from the Sun, in AU, or null (100 simulation units to the AU). */
const auFrom = (ctx, b) => {
  const sun = ctx.role('sun');
  if (!sun || !b) return null;
  return ctx.au(Math.hypot(b.pos.x - sun.pos.x, b.pos.y - sun.pos.y));
};
const auFromSun = (ctx, role) => auFrom(ctx, ctx.role(role));
/** The selected body's distance from the Sun: the row a reading is taken from. */
const distanceRows = ctx => {
  const b = ctx.selected;
  const au = auFrom(ctx, b);
  return [
    b
      ? { label: 'Selected', value: b.name || 'Body', emphasis: true }
      : { label: 'Select a planet', value: '-' },
    {
      id: 'dist',
      label: 'Distance from the Sun',
      value: au === null ? '-' : `${fixed(au, 2)} AU`,
    },
  ];
};
/** Taking the distance of another planet than the field names. */
const otherThan = (...roles) => ({
  id: 'wrongPlanet',
  when: { role: roles },
  say: 'That reading is from another planet. Select the planet this box names, by clicking it or choosing it in the object list, and take the reading again.',
});
/** Astronomical unit and Earth's diameter in kilometers: the marble model's two lengths. */
const AU_KM = 149597870.7;
const EARTH_KM = 12742;

export const THE_SCALE_OF_THE_SOLAR_SYSTEM = {
  id: 'the-scale-of-the-solar-system',
  thumbnail: 'images/scenarios/solar-system.webp',
  title: 'The Scale of the Solar System',
  subtitle:
    'True distances from the sandbox, the light travel time, and a scale model in which Earth is a marble',
  duration: '15-25 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 7, section: null },
  courseLevel: 'survey',
  mathematics: 'algebra',
  prerequisites: [],
  tags: ['solar-system', 'orbits'],
  lock: { placement: true, inspector: true },
  retired: {
    'scale-model': {
      to: 'choose-your-marble',
      release: '3.1',
      was: {
        en: 'Type Neptune’s distance in astronomical units again and work out, for a one-centimeter Earth, how far the Earth and Neptune are from the Sun in the model.',
        es: 'Escribir otra vez la distancia de Neptuno en unidades astronómicas y calcular, para una Tierra de un centímetro, a qué distancia del Sol quedan la Tierra y Neptuno en la maqueta.',
      },
    },
  },
  objectives: [
    'Read the distances of Earth, Jupiter and Neptune from the Sun in astronomical units, from the sandbox drawn at true scale',
    'Turn a distance into the time light takes to cover it',
    'Build a scale model in which Earth is a marble of a size you choose, and say where the Sun and Neptune fall in it',
    'Say what a diagram of the Solar System on one page gets wrong, and what it keeps',
  ],
  steps: [
    {
      sid: 'a-picture-you-have-seen',
      bind: SOLAR_BIND,
      type: 'read',
      title: 'A picture you have seen',
      body: `Every diagram of the Solar System has the Sun, eight planets in a row, and
             planets drawn big enough to see. This investigation uses the sandbox
             instead, where the <strong>distances are true</strong>: 100 units to an
             astronomical unit, the distance from the Earth to the Sun. The planets are
             drawn larger than their true size so that they show at all, and the
             view reaches at least Saturn, because nothing wider would
             leave the inner planets visible. Neptune is further out than the first
             view shows.`,
      tip: 'The distances in the readout come from the sandbox, not from a table; the next steps check them against the numbers you know.',
      setup: SCALE_SETUP,
    },
    {
      sid: 'three-distances',
      bind: SOLAR_BIND,
      type: 'measure',
      title: 'Three distances',
      body: `Zoom out with the <strong>Zoom out</strong> button, the scroll wheel or a
             pinch until Neptune is on the screen. Then select <strong>Earth</strong>,
             <strong>Jupiter</strong> and <strong>Neptune</strong> in turn, by clicking
             the planet or choosing it in the object list, and press <strong>Take
             reading</strong> beside each one&rsquo;s distance from the Sun.`,
      fields: [
        {
          id: 'earth',
          label: 'Earth’s distance from the Sun',
          unit: 'AU',
          want: '1.00',
          source: { probe: 'dist' },
          misconceptions: [otherThan('jupiter', 'neptune')],
        },
        {
          id: 'jupiter',
          label: 'Jupiter’s distance from the Sun',
          unit: 'AU',
          want: '5.20',
          source: { probe: 'dist' },
          misconceptions: [otherThan('earth', 'neptune')],
        },
        {
          id: 'neptune',
          label: 'Neptune’s distance from the Sun',
          unit: 'AU',
          want: '30.07',
          source: { probe: 'dist' },
          misconceptions: [otherThan('earth', 'jupiter')],
        },
      ],
      probe: distanceRows,
      validate: (v, ctx) => {
        if (![v.earth, v.jupiter, v.neptune].every(Number.isFinite))
          return null;
        // Against the live world when there is one, so the answer is the
        // sandbox's own reading and not a table's.
        const live = (ctx.bodies || []).length
          ? ['earth', 'jupiter', 'neptune'].map(r => auFromSun(ctx, r))
          : [];
        const want =
          live.length && live.every(Number.isFinite) ? live : [1, 5.2, 30.07];
        const got = [v.earth, v.jupiter, v.neptune];
        if (
          got.every((x, k) => near(x, want[k], Math.max(0.05, 0.02 * want[k])))
        ) {
          return {
            level: 'ok',
            message:
              'Earth 1.00 AU, Jupiter 5.20 and Neptune 30.07. Neptune is thirty times as far from the Sun as the Earth is, which is why no single view shows the inner and the outer planets at a useful size at once.',
          };
        }
        return {
          level: 'error',
          message:
            'Each box takes the distance of the planet it names. Select that planet and press Take reading; if Neptune is not on the screen, zoom out.',
        };
      },
    },
    {
      sid: 'light-time-predict',
      bind: SOLAR_BIND,
      type: 'predict',
      reveal: 'light-time',
      title: 'How long does the light take?',
      body: `Sunlight takes some minutes to reach the Earth. Neptune is much further out,
             at the distance you took.`,
      prompt: 'Sunlight takes, to reach Neptune, about&hellip;',
      options: [
        'four hours',
        'thirty minutes',
        'the same time as to the Earth',
        'four days',
      ],
      answer: 0,
      hints: [
        'Light takes the same time to cross every astronomical unit. How many are there to Neptune?',
      ],
      because:
        'About four hours: Neptune is 30.07 AU out and light crosses an AU in 499 seconds, so 30.07 times 499 seconds is 15,005 seconds, 4.17 hours. A message from a spacecraft at Neptune would take that long to arrive, each way.',
    },
    {
      sid: 'light-time',
      bind: SOLAR_BIND,
      type: 'measure',
      title: 'The light time to Neptune',
      body: `Light crosses one astronomical unit in about 8 minutes and 19 seconds, 499
             seconds: it is the delay between something happening on the Sun and
             our seeing it. Multiply it by the distance you took to Neptune,
             and turn the seconds into hours.`,
      fields: [
        {
          id: 'neptune',
          label: 'Neptune’s distance from the Sun',
          unit: 'AU',
          compute: (v, e) => e?.('three-distances', 'neptune'),
          decimals: 2,
        },
        {
          id: 'hours',
          label: 'Light time from the Sun to Neptune',
          unit: 'h',
          want: '4.17',
        },
      ],
      validate: v => {
        if (![v.neptune, v.hours].every(Number.isFinite)) return null;
        if (near(v.hours, (v.neptune * 499.005) / 3600, 0.1)) {
          return {
            level: 'ok',
            message:
              '4.17 hours. The same arithmetic gives Earth 8.3 minutes and Jupiter 43 minutes; a radio command to a spacecraft at Neptune and its reply would take more than eight hours.',
          };
        }
        return {
          level: 'error',
          message:
            'The light time is the distance in astronomical units times 499 seconds, divided by 3,600 seconds an hour.',
        };
      },
    },
    {
      sid: 'earth-as-a-marble',
      bind: SOLAR_BIND,
      type: 'predict',
      reveal: 'choose-your-marble',
      title: 'Earth as a marble',
      body: `Build a scale model in which the Earth is a marble one centimeter across.
             The Earth is 12,742 kilometers across and 149.6 million kilometers from the
             Sun.`,
      prompt: 'In that model the Sun is&hellip;',
      options: [
        'a ball about 1 meter wide, about 120 meters from the marble',
        'a ball about 10 centimeters wide, about 1 meter from the marble',
        'a ball about 10 meters wide, about 10 meters from the marble',
        'a ball about as wide as the marble, about 10 centimeters from it',
      ],
      answer: 0,
      hints: [
        'Divide the Earth–Sun distance by the Earth’s diameter; that many marbles fit between them.',
      ],
      because:
        'The Sun is 109 Earth diameters across, so 109 centimeters, and 11,741 marbles fit between it and the Earth: 117 meters.',
    },
    {
      sid: 'choose-your-marble',
      bind: SOLAR_BIND,
      type: 'measure',
      title: 'Choose your marble',
      body: `Now choose the size of your own Earth, in centimeters across: a pea, a
             marble, a basketball. One astronomical unit is the same number of Earths
             across whatever you choose. The page works out how far the Sun is from the
             Earth in your model. Neptune&rsquo;s distance is the one you took, in
             astronomical units: find where Neptune falls in your model, in meters.`,
      fields: [
        {
          id: 'marble',
          label: 'Your Earth’s diameter in the model',
          unit: 'cm',
          want: '1',
        },
        {
          id: 'au_m',
          label: 'One astronomical unit in your model',
          unit: 'm',
          compute: v => ((AU_KM / EARTH_KM) * v.marble) / 100,
          decimals: 1,
        },
        {
          id: 'neptune',
          label: 'Neptune’s distance from the Sun',
          unit: 'AU',
          compute: (v, e) => e?.('three-distances', 'neptune'),
          decimals: 2,
        },
        {
          id: 'nep_m',
          label: 'Neptune’s distance from the Sun in your model',
          unit: 'm',
          want: '3531',
        },
      ],
      validate: v => {
        if (![v.marble, v.neptune, v.nep_m].every(Number.isFinite)) return null;
        if (!(v.marble > 0))
          return { level: 'error', message: 'A marble has a size above zero.' };
        const want = v.au_m * v.neptune;
        if (near(v.nep_m, want, 0.02 * want)) {
          return {
            level: 'ok',
            message: `Neptune falls ${fixed(want, 0)} meters from the Sun, ${fixed(want / 1000, 2)} kilometers, in a model whose Earth is ${fixed(v.marble, 2)} centimeters across. That is the same 353,000 Earths whatever the marble: halve it and every distance halves. The Sun is 109 Earths across, 11,741 Earths from the Earth, so a model with visible planets cannot be small.`,
          };
        }
        if (near(v.nep_m * 1000, want, 0.02 * want)) {
          return {
            level: 'warn',
            message:
              'That is the distance in kilometers: this box is in meters. Multiply by 1,000.',
          };
        }
        return {
          level: 'error',
          message:
            'Multiply the length of one astronomical unit in your model by Neptune’s distance in astronomical units.',
        };
      },
    },
    {
      sid: 'what-a-diagram-gets-wrong',
      bind: SOLAR_BIND,
      type: 'question',
      kind: 'choice',
      title: 'What does a textbook diagram get wrong?',
      body: `A page-wide diagram shows the planets as dots a few centimeters apart, with the
             Sun the size of a small coin.`,
      prompt: 'What is the diagram’s main departure from the true scale?',
      options: [
        'The sizes of the bodies are enormously exaggerated against the distances between them',
        'The order of the planets is wrong',
        'The distances are exaggerated and the sizes are right',
        'It is exactly to scale, but too small to see the details',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'distances',
          option: 2,
          say: 'It is the other way round: the bodies are tiny against the space between them, so to be visible they are drawn many times too big. The sandbox keeps the distances true and shows the planets larger than life for the same reason.',
        },
      ],
      hints: ['Think of your own model, and how far apart its pieces were.'],
      because:
        'Sizes are exaggerated: at the true scale of the distances the planets would be specks. The diagram keeps the order and, roughly, the relative spacing; the sandbox keeps the distances true and enlarges the planets so that they can be seen.',
    },
    {
      sid: 'what-you-worked-out',
      bind: SOLAR_BIND,
      type: 'read',
      title: 'What you worked out',
      body: `Earth, Jupiter and Neptune at 1.00, 5.20 and 30.07 astronomical units, each
             taken from the planet itself; sunlight that takes 8 minutes to reach us and
             4.17 hours to reach Neptune; and a scale model of your own choosing, in
             which a one-centimeter Earth has the Sun a meter wide 117 meters away and
             Neptune 3.5 kilometers out. The planets&rsquo; sizes are the one thing the
             sandbox does not show at true scale; the next investigations, on the moons
             of the giants and on comets, start from these distances.`,
    },
  ],
};

// -----------------------------------------------------------------------------
// 3. Comets and the Sun
// -----------------------------------------------------------------------------
const COMET_SETUP = {
  scenario: 'Solar System',
  seed: 'comets-and-the-sun',
  settings: { enable_asteroids: false, num_asteroids: 0, num_comets: 12 },
  camera: { zoom: 1.5, pan: { x: 0, y: 0 } },
  paused: false,
};
const COMET_BIND = { sun: { name: 'Sol' } };
/** A comet on a bound orbit (the one named, else the selected body), with its closest and furthest distance in AU, or null. */
const chosenComet = (ctx, name) => {
  const b = name ? (ctx.bodies || []).find(x => x.name === name) : ctx.selected;
  if (!b || b.kind !== 'Comet' || b.alive === false) return null;
  const el = ctx.elements(b);
  return el && el.bound
    ? { body: b, peri: ctx.au(el.periapsis), apo: ctx.au(el.apoapsis) }
    : null;
};
/** Equilibrium temperature of a bare, dark body at r AU, uniform redistribution, albedo 0.04 (kernel: 275.5 K at 1 AU). */
const cometTemperature = rAu => 275.5 / Math.sqrt(rAu);
/** The AU distance inside which the sandbox draws a tail (flux above 1/9 of Earth's). */
const TAIL_AU = 3;
const cometRows = ctx => {
  const c = chosenComet(ctx);
  const sun = ctx.role('sun');
  if (!c || !sun)
    return [
      { label: 'Select a comet', value: '-' },
      { id: 'peri', label: 'Closest approach to the Sun', value: '-' },
      { id: 'apo', label: 'Furthest distance from the Sun', value: '-' },
    ];
  const b = c.body;
  const r = ctx.au(Math.hypot(b.pos.x - sun.pos.x, b.pos.y - sun.pos.y));
  const vr =
    (b.pos.x - sun.pos.x) * (b.vel.x - sun.vel.x) +
    (b.pos.y - sun.pos.y) * (b.vel.y - sun.vel.y);
  return [
    { label: 'Comet', value: b.name || 'Comet', emphasis: true },
    {
      id: 'peri',
      label: 'Closest approach to the Sun',
      value: `${fixed(c.peri, 2)} AU`,
    },
    {
      id: 'apo',
      label: 'Furthest distance from the Sun',
      value: `${fixed(c.apo, 2)} AU`,
    },
    { label: 'Distance now', value: `${fixed(r, 2)} AU` },
    { label: 'Moving', value: vr < 0 ? 'toward the Sun' : 'away from the Sun' },
    {
      label: 'Tail',
      value:
        r < TAIL_AU
          ? 'drawn: closer than 3 AU'
          : 'not drawn: farther than 3 AU',
    },
  ];
};

export const COMETS_AND_THE_SUN = {
  id: 'comets-and-the-sun',
  thumbnail: 'images/scenarios/solar-system.webp',
  title: 'Comets and the Sun',
  subtitle:
    'A model comet’s orbit from the sandbox, how hot it gets at each end, the real Halley as a transfer case, and which way its tails point',
  duration: '15-25 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 13, section: null },
  courseLevel: 'survey',
  mathematics: 'algebra',
  prerequisites: [],
  tags: ['solar-system', 'orbits'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Read the closest and furthest distance from the Sun of a comet you choose, from its orbit in the sandbox',
    'Estimate the temperature of a bare comet nucleus at each end of its orbit, using the emission temperature and its inverse square-root law',
    'Say which way a comet’s ion tail points, whether it comes or goes, and why it is not the way smoke trails',
    'Say what the temperature estimate leaves out, and where ice begins to turn to gas',
  ],
  steps: [
    {
      sid: 'a-dirty-snowball',
      bind: COMET_BIND,
      type: 'read',
      title: 'A dirty snowball',
      body: `A comet is a few kilometers of ice and dust on a long orbit. Far from the Sun
             it is dark and inert. Near the Sun the ice turns to gas, the gas and dust
             escape and make a <strong>coma</strong> and two tails. The sandbox here has
             the Sun, the eight planets and twelve comets. They carry the names of famous
             comets, but the sandbox starts each one at the distance of its average orbit
             with 70 percent of the speed of a circular orbit, so they are
             <strong>model comets on orbits of their own</strong>, not the real orbits.`,
      tip: 'The comets move quickly. Pause to read a number; run it again to watch the tails.',
      setup: COMET_SETUP,
    },
    {
      sid: 'tail-predict',
      bind: COMET_BIND,
      type: 'predict',
      reveal: 'watch-the-tails',
      title: 'Which way does the tail point?',
      body: `A comet has a head and a tail, and a tail suggests something trailing behind,
             like smoke from a moving train.`,
      prompt: 'A comet’s main (ion) tail points&hellip;',
      options: [
        'away from the Sun, whichever way the comet is moving',
        'behind the comet, opposite its motion',
        'ahead of the comet, along its motion',
        'toward the Sun',
      ],
      answer: 0,
      hints: ['What does the tail’s gas feel from the Sun?'],
      because:
        'Away from the Sun. The ion tail is gas swept directly away by the solar wind, so on the way out of the inner Solar System it leads the comet instead of trailing it. The broader, curved dust tail does lag behind along the orbit.',
    },
    {
      sid: 'watch-the-tails',
      bind: COMET_BIND,
      type: 'explore',
      title: 'Watch the tails',
      body: `Tails show only where a comet is closer to the Sun than about 3 AU, and the
             readout says when the comet you select is. Halley, the readout&rsquo;s first
             comet, stays beyond 5.8 AU. Wild 2 and Hartley 2 come in to 1.1 AU and
             Shoemaker-Levy 9 to 2.1 (faint; the only one on a slower device). Pause the
             scene, click a comet, and run it again.`,
      checklist: [
        'Select a comet that comes inside 3 AU and zoom in on it',
        'Pause it at three points you choose: on the way in, near its closest approach, and on the way out',
        'At each point compare the narrow tail with the line from the Sun through the comet’s head: which way does it point, and which way is the comet going?',
      ],
      probe: cometRows,
    },
    {
      sid: 'going-out',
      bind: COMET_BIND,
      type: 'question',
      kind: 'choice',
      title: 'On the way out',
      body: `A comet is moving away from the Sun.`,
      prompt: 'Its ion tail is&hellip;',
      options: [
        'ahead of the nucleus, pointing away from the Sun',
        'behind the nucleus, trailing like smoke',
        'absent, because tails only form on the way in',
        'folded back on the nucleus',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'smoke',
          option: 1,
          say: 'That is the dust tail, and only roughly. The gas tail is swept directly away from the Sun, so moving outward the nucleus is following its own tail.',
        },
      ],
      hints: [
        'The tail points away from the Sun; which way is the comet going?',
      ],
      because:
        'Ahead of the nucleus. The tail’s direction is set by the Sun, not by the comet’s motion, so a comet on its way out is flying tail first.',
    },
    {
      sid: 'orbit-ends',
      bind: COMET_BIND,
      type: 'measure',
      title: 'The two ends of the orbit',
      body: `Select the comet you watched, or another. Press <strong>Take reading</strong>
             beside its <strong>closest approach</strong> and beside its <strong>furthest
             distance</strong> from the Sun, in astronomical units. They are the
             orbit&rsquo;s two ends, perihelion and aphelion.`,
      fields: [
        {
          id: 'peri',
          label: 'Closest approach to the Sun',
          unit: 'AU',
          want: '5.79',
          source: { probe: 'peri' },
        },
        {
          id: 'apo',
          label: 'Furthest distance from the Sun',
          unit: 'AU',
          want: '17.84',
          source: { probe: 'apo' },
        },
      ],
      probe: cometRows,
      validate: (v, ctx, how) => {
        if (![v.peri, v.apo].every(Number.isFinite)) return null;
        // The comet the readings came from, which may no longer be the selected one.
        const c = chosenComet(ctx, how?.peri?.b) || chosenComet(ctx);
        if (!c) return null;
        if (
          near(v.peri, c.peri, Math.max(0.03, 0.04 * c.peri)) &&
          near(v.apo, c.apo, Math.max(0.1, 0.04 * c.apo))
        ) {
          return {
            level: 'ok',
            message: `${fixed(c.peri, 2)} AU and ${fixed(c.apo, 2)} AU: the orbit’s two ends, a ratio of ${fixed(c.apo / c.peri, 1)} between them. A comet spends most of its time near the far end.`,
          };
        }
        return {
          level: 'error',
          message:
            'Select one comet and take both distances from it: “Closest approach to the Sun” and “Furthest distance from the Sun”.',
        };
      },
    },
    {
      sid: 'heat-at-the-ends',
      bind: COMET_BIND,
      type: 'measure',
      title: 'How hot at each end?',
      body: `A bare dark nucleus (Bond albedo 0.04) that spreads the sunlight it absorbs over
             its whole surface radiates at its <strong>emission temperature</strong>, 275.5 K at
             1 AU. It falls as one over the square root of the distance. Work out the
             temperature at the two distances you took. This is a bare-body estimate: a comet loses
             energy by turning ice to gas and a real nucleus is not uniform.`,
      fields: [
        {
          id: 'peri',
          label: 'Closest approach to the Sun',
          unit: 'AU',
          compute: (v, e) => e?.('orbit-ends', 'peri'),
          decimals: 2,
        },
        {
          id: 'apo',
          label: 'Furthest distance from the Sun',
          unit: 'AU',
          compute: (v, e) => e?.('orbit-ends', 'apo'),
          decimals: 2,
        },
        {
          id: 't_peri',
          label: 'Temperature at closest approach',
          unit: 'K',
          want: '114',
        },
        {
          id: 't_apo',
          label: 'Temperature at the furthest distance',
          unit: 'K',
          want: '65',
        },
      ],
      validate: v => {
        if (![v.peri, v.apo, v.t_peri, v.t_apo].every(Number.isFinite))
          return null;
        const tp = cometTemperature(v.peri);
        const ta = cometTemperature(v.apo);
        if (!near(v.t_peri, tp, 0.02 * tp) || !near(v.t_apo, ta, 0.02 * ta)) {
          return {
            level: 'error',
            message:
              'The temperature is 275.5 K divided by the square root of the distance in astronomical units: use the closest approach for the first box and the furthest distance for the second.',
          };
        }
        const hot = tp >= 160;
        return {
          level: 'ok',
          message: `${fixed(tp, 0)} K at closest approach and ${fixed(ta, 0)} K at the far end: a factor of ${fixed(Math.sqrt(v.apo / v.peri), 1)}, the square root of the ratio of distances. Water ice turns to gas readily from about 160 K, which a bare nucleus reaches at about 3 AU, where the sandbox starts to draw tails. ${hot ? 'This comet’s near end is above it, so it can grow a tail there.' : 'This comet’s near end is below it, so by this estimate it stays frozen at both ends.'}`,
        };
      },
    },
    {
      sid: 'halley-heat-predict',
      bind: COMET_BIND,
      type: 'predict',
      reveal: 'the-real-halley',
      title: 'How hot is the real Halley?',
      body: `The comet the sandbox calls Halley is not on Halley&rsquo;s orbit. The real
             comet comes to about <strong>0.586 AU</strong> from the Sun at its closest,
             inside the orbit of Venus.`,
      prompt: 'At that distance a bare nucleus is at about&hellip;',
      options: ['120 K', '200 K', '360 K', '700 K'],
      answer: 2,
      hints: [
        'Closer to the Sun than 1 AU means hotter than the temperature at 1 AU.',
      ],
      because:
        'About 360 K: the temperature at 1 AU divided by the square root of 0.586 is 360 K, far above the 160 K at which ice turns to gas.',
    },
    {
      sid: 'the-real-halley',
      bind: COMET_BIND,
      type: 'measure',
      title: 'The real Halley',
      body: `Apply the same estimate to the real closest approach of Halley, the
             distance in the last step, and set it beside your prediction.`,
      fields: [
        {
          id: 'q',
          label: 'The real Halley’s closest approach',
          unit: 'AU',
          compute: () => 0.586,
          decimals: 3,
        },
        {
          id: 't_q',
          label: 'Temperature at the real closest approach',
          unit: 'K',
          want: '360',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.t_q)) return null;
        if (!near(v.t_q, cometTemperature(0.586), 4))
          return {
            level: 'error',
            message:
              'Divide 275.5 K by the square root of 0.586, the real closest approach in astronomical units.',
          };
        return {
          level: 'ok',
          message:
            '360 K: far above the 160 K at which ice turns to gas, so the real comet does warm enough to grow a tail at the near end of its orbit. The model comet Halley’s orbit never brings it close enough, which is a property of the model and not of comets.',
        };
      },
    },
    {
      sid: 'why-a-tail-near-the-sun',
      bind: COMET_BIND,
      type: 'question',
      kind: 'choice',
      title: 'Why a tail near the Sun?',
      body: `A comet may spend centuries without a tail and grow one in months.`,
      prompt: 'Why does a comet grow a tail as it comes in toward the Sun?',
      options: [
        'The warmer nucleus turns its ice to gas, and the gas and dust escape and are pushed away from the Sun',
        'The Sun’s gravity stretches it',
        'It is moving faster, so the air streams past it',
        'The tail was there all the time, and only becomes visible',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'air',
          option: 2,
          say: 'There is no air out here to stream past. What is swept along is gas the comet itself lost, by sunlight and the solar wind.',
        },
      ],
      hints: [
        'Compare the temperature at the near end of a comet that grew a tail with the 160 K at which ice turns to gas.',
      ],
      because:
        'Heating. The nucleus’s temperature rises as one over the square root of the distance; ice turns to gas near 160 K, which a bare nucleus reaches at about 3 AU, and the escaping gas and dust form the coma and the tails: the solar wind sweeps the gas away from the Sun and sunlight pushes the dust.',
    },
    {
      sid: 'what-you-worked-out',
      bind: COMET_BIND,
      type: 'read',
      title: 'What you worked out',
      body: `A comet&rsquo;s orbit has two ends, here read from the sandbox; a bare nucleus
             is hotter by the square root of the ratio of those distances at the near end;
             ice turns to gas near 160 K, which a bare nucleus reaches at about 3 AU,
             where the sandbox starts to draw tails. The model Halley, at 5.79 AU and
             114 K, stays below it, a comet that comes inside 3 AU rises above it, and the
             real Halley, at 0.586 AU, reaches 360 K. The ion tail always points away from
             the Sun, so a comet flies tail first on the way out. A real comet adds what this
             estimate leaves out: its reflectivity, the energy spent turning ice to gas, and
             its spin.`,
    },
  ],
};

// -----------------------------------------------------------------------------
// The Spanish of the lessons above, step by step (index-aligned, words only).
// -----------------------------------------------------------------------------
export const MOONS_OF_THE_GIANTS_ES = {
  title: 'Las lunas de los gigantes',
  subtitle:
    'Tres periodos de un mismo conjunto de imágenes, y la combinación que vale cero cuando una familia de lunas lleva el paso',
  objectives: [
    'Leer los periodos de Ío, Europa y Ganímedes en imágenes ajustadas y formar sus cocientes',
    'Decir por qué un cociente cercano a 2 es un indicio de resonancia y no una prueba, y qué añade la combinación de los tres movimientos',
    'Elegir el muestreo, hallar la combinación de Laplace de los tres movimientos con su incertidumbre, y decir qué muestra y qué no un valor compatible con cero',
    'Predecir, y luego comprobar con la misma aritmética, si Calisto forma parte de la cadena',
  ],
  steps: [
    {
      title: 'Una familia de lunas',
      body: 'Un planeta gigante lleva consigo una familia. Júpiter tiene cuatro lunas grandes que se ven con unos prismáticos, Ío, Europa, Ganímedes y Calisto. Esta investigación pregunta si sus periodos, el tiempo que tardan en dar una vuelta, siguen algún patrón, y los mide a partir de imágenes.\n\nLas imágenes son las <strong>sintéticas</strong> de <em>Pesar a Júpiter con sus lunas</em>: hechas con las posiciones reales de las lunas en noviembre y diciembre de 2025 (JPL Horizons), con el disco de Júpiter, el desenfoque y el ruido añadidos. Nadie observó estas fotografías. Las distancias que lees son las medidas del instrumento; la superposición marca dónde pone el efemérides a cada luna.',
    },
    {
      title: '¿Cómo se comparan los tres periodos?',
      body: 'Ío tarda unos 1,77 días en dar una vuelta. Europa y Ganímedes están más lejos. El instrumento ajustará una sinusoide a la distancia de cada luna a Júpiter en las 51 imágenes y leerá el periodo de ella.',
      prompt:
        'El periodo de Europa, y luego el de Ganímedes, serán cada uno aproximadamente&hellip;',
      options: [
        'el doble del de la luna de dentro',
        'igual que el de la luna de dentro',
        'una vez y media el de la luna de dentro, porque las órbitas son 1,5 veces más anchas',
        'ningún patrón: los tres periodos no guardan relación',
      ],
      hints: [
        'Divide el periodo de Europa entre el de Ío, y el de Ganímedes entre el de Europa, cuando los tengas.',
      ],
      because:
        'Casi el doble cada uno: 2,006 y 2,013. La tercera ley de Kepler permitiría que una órbita 1,5 veces más ancha tardara 1,84 veces más, pero estos cocientes están más cerca de 2, y esa cercanía es el tema del resto.',
    },
    {
      title: 'Tres periodos',
      body: 'Pon el muestreo en <strong>1</strong>, la secuencia diseñada de imágenes. Luego elige cada luna por turno con <strong>Luna</strong> (1 Ío, 2 Europa, 3 Ganímedes) y pulsa <strong>Tomar la lectura</strong> junto a su periodo. Las lecturas conservan los cuatro decimales que da el instrumento: la aritmética siguiente es sensible a ellos.',
      fields: [
        {
          label: 'Periodo de Ío',
          misconceptions: [
            {
              say: 'Esa lectura se tomó con otra luna seleccionada. Pon Luna en 1 para Ío, 2 para Europa y 3 para Ganímedes, y toma el periodo otra vez.',
            },
            {
              say: 'Esa lectura se tomó con otra luna seleccionada. Pon Luna en 1 para Ío, 2 para Europa y 3 para Ganímedes, y toma el periodo otra vez.',
            },
            {
              say: 'Esa lectura usó el muestreo de una vez por noche (0). Este paso pide el muestreo diseñado, 1.',
            },
          ],
        },
        {
          label: 'Periodo de Europa',
          misconceptions: [
            {
              say: 'Esa lectura se tomó con otra luna seleccionada. Pon Luna en 1 para Ío, 2 para Europa y 3 para Ganímedes, y toma el periodo otra vez.',
            },
            {
              say: 'Esa lectura se tomó con otra luna seleccionada. Pon Luna en 1 para Ío, 2 para Europa y 3 para Ganímedes, y toma el periodo otra vez.',
            },
            {
              say: 'Esa lectura usó el muestreo de una vez por noche (0). Este paso pide el muestreo diseñado, 1.',
            },
          ],
        },
        {
          label: 'Periodo de Ganímedes',
          misconceptions: [
            {
              say: 'Esa lectura se tomó con otra luna seleccionada. Pon Luna en 1 para Ío, 2 para Europa y 3 para Ganímedes, y toma el periodo otra vez.',
            },
            {
              say: 'Esa lectura se tomó con otra luna seleccionada. Pon Luna en 1 para Ío, 2 para Europa y 3 para Ganímedes, y toma el periodo otra vez.',
            },
            {
              say: 'Esa lectura usó el muestreo de una vez por noche (0). Este paso pide el muestreo diseñado, 1.',
            },
          ],
        },
      ],
    },
    {
      title: 'Cocientes que no llegan a dos',
      body: 'Los periodos que tomaste están en la lista. Divídelos con tres decimales: el de Europa entre el de Ío, y el de Ganímedes entre el de Europa.',
      fields: [
        { label: 'Periodo de Ío' },
        { label: 'Periodo de Europa' },
        { label: 'Periodo de Ganímedes' },
        { label: 'Periodo de Europa entre el de Ío' },
        { label: 'Periodo de Ganímedes entre el de Europa' },
      ],
    },
    {
      title: '¿Qué dice 2,006?',
      body: 'Europa tarda 2,006 veces lo que Ío; Ganímedes, 2,013 veces lo que Europa. Ninguno es exactamente 2.',
      prompt:
        '¿Qué se deduce de unos cocientes cercanos a 2 pero no iguales a 2?',
      options: [
        'Nada queda decidido: un cociente cercano a 2 es un indicio, y hay que contrastar los tres movimientos juntos',
        'Las lunas no pueden estar en resonancia, porque una resonancia necesita que el cociente sea exactamente 2',
        'Las lunas están sin duda enlazadas, porque 2,006 se redondea a 2',
        'Los periodos deben de estar mal medidos',
      ],
      misconceptions: [
        {
          say: 'Una resonancia es una relación entre ángulos que se cumple en promedio mientras las órbitas giran despacio, así que los periodos medidos no tienen por qué dar un cociente exacto. El cociente es dónde mirar, no la prueba.',
        },
        {
          say: 'Cercano es lo que es un indicio. Muchos pares de periodos sin relación están a menos de un uno por ciento de un cociente sencillo; lo que separa un enlace de una coincidencia es una relación que se cumple para todos los movimientos a la vez, que construyen los pasos siguientes.',
        },
      ],
      hints: [
        'Piensa en cuántas veces dos periodos sin relación caen a menos de un uno por ciento de un cociente de números enteros.',
      ],
      because:
        'Un cociente cercano indica dónde mirar. Lo que Laplace encontró en 1805 es una relación que involucra a las tres lunas a la vez, y es la prueba que aplican los pasos siguientes.',
    },
    {
      title: 'Tres movimientos, una combinación',
      body: 'Convierte cada periodo en un <strong>movimiento</strong>, el ángulo que la luna recorre en un día: <em>n</em> = 360&deg; ÷ periodo. La combinación de Laplace es <strong><em>n</em><sub>Ío</sub> &minus; 3<em>n</em><sub>Europa</sub> + 2<em>n</em><sub>Ganímedes</sub></strong>. Los números 1, &minus;3 y 2 suman cero, así que un movimiento que las tres comparten, como el aparente que añade el propio viaje de Júpiter, se cancela. Ío da una vuelta a unos 204 grados por día.',
      prompt:
        'Si las tres lunas llevan el paso exacto, la combinación de los tres movimientos es&hellip;',
      options: [
        'cero',
        'unos 204 grados por día, el movimiento propio de Ío',
        'unos 50 grados por día, el de Ganímedes',
        'un número distinto cada noche',
      ],
      hints: [
        'Los coeficientes suman cero por una razón: mira qué hace con ellos un desplazamiento común.',
      ],
      because:
        'Cero. Donde las tres se mueven al paso, la relación se cumple exactamente para los movimientos medios; los medidos entran en ella con la incertidumbre que dan los ajustes.',
    },
    {
      title: '¿Qué seguridad tiene la suma?',
      body: 'Elige el <strong>Muestreo</strong> en el que confías: 0 es una imagen por noche, 1 la secuencia diseñada con tres noches horarias. Luego toma cada luna por turno con <strong>Luna</strong>, y pulsa <strong>Tomar la lectura</strong> junto a su periodo y junto a su incertidumbre. La página convierte cada periodo en un movimiento, forma el de Ío menos tres veces el de Europa más dos veces el de Ganímedes, y combina las tres incertidumbres: la de cada movimiento es 360&deg; × la incertidumbre del periodo ÷ el periodo al cuadrado, y las tres se suman en cuadratura, con pesos 1, 3 y 2.',
      fields: [
        { label: 'Periodo de Ío' },
        { label: 'Incertidumbre del periodo de Ío' },
        { label: 'Periodo de Europa' },
        { label: 'Incertidumbre del periodo de Europa' },
        { label: 'Periodo de Ganímedes' },
        { label: 'Incertidumbre del periodo de Ganímedes' },
        { label: 'Movimiento de Ío, grados por día' },
        { label: 'Movimiento de Europa, grados por día' },
        { label: 'Movimiento de Ganímedes, grados por día' },
        { label: 'Ío − 3 × Europa + 2 × Ganímedes, grados por día' },
        { label: 'Su incertidumbre, grados por día' },
      ],
    },
    {
      title: '¿Es cero?',
      body: 'Tu combinación de los tres movimientos y su incertidumbre están en el recuadro de abajo.',
      prompt: '¿Qué dice eso sobre si vale cero?',
      options: [
        'Es compatible con cero: es menor que su propia incertidumbre, que es lo más cerca que pueden decir estas imágenes',
        'No es cero, así que las lunas no están en resonancia',
        'Es exactamente cero, así que las lunas están sin duda enlazadas',
        'No significa nada, porque no es un número entero',
      ],
      misconceptions: [
        {
          say: 'Un valor menor que su incertidumbre no se distingue de cero con estas imágenes. No ser exactamente 0 es lo que hace toda medida. Si el tuyo es mucho mayor que su incertidumbre, revisa el muestreo que elegiste.',
        },
        {
          say: 'Compatible con cero no es lo mismo que exactamente cero, y ninguna de las dos cosas prueba que las lunas estén enlazadas: la relación entre los movimientos es una condición necesaria. Lo que las imágenes no pueden mostrar es si el propio ángulo libra.',
        },
      ],
      hints: ['Compara la combinación con la incertidumbre que tiene al lado.'],
      because:
        'Compatible con cero. La combinación es miles de veces menor que el movimiento de Ío, y está dentro de su incertidumbre. Esa es la relación necesaria, observada. La parte suficiente, que el ángulo <em>libra</em> y no circula, necesita años de observación del ángulo; <em>Cuando las órbitas se enlazan</em> lo sigue en un modelo.',
    },
    {
      title: '¿Pertenece Calisto?',
      body: 'Calisto es la cuarta luna, y la más lejana. El periodo de Ganímedes es el que tomaste en el paso 3, y la órbita de Calisto es unas 1,76 veces más ancha que la de Ganímedes.',
      prompt:
        'El periodo de Calisto, dividido entre el de Ganímedes, será aproximadamente&hellip;',
      options: [
        'unos 2,3, que no está cerca del 2 de los otros pares',
        'unos 2, como en los otros pares',
        'unos 3',
        'unos 1,5',
      ],
      hints: [
        'La tercera ley de Kepler convirtió 1,5 en 1,84 en la primera predicción: haz lo mismo con 1,76.',
      ],
      because:
        'Unos 2,33: 1,76 elevado a 1,5 es 2,33, muy lejos del 2 que mantiene al paso a las tres primeras.',
    },
    {
      title: '¿Y Calisto?',
      body: 'Elige la <strong>Luna</strong> 4, con el muestreo en 1, y toma su periodo. La página lo divide entre el periodo de Ganímedes del paso 3.',
      fields: [
        { label: 'Periodo de Calisto' },
        { label: 'Periodo de Calisto entre el de Ganímedes' },
      ],
    },
    {
      title: 'Lo que has deducido',
      body: 'Tres periodos de imágenes sintéticas, 1,7682, 3,5480 y 7,1413 días; cocientes de 2,006 y 2,013, cerca de 2 y no iguales a 2, lo cual es un indicio y no una prueba; y una combinación de los tres movimientos que salió menor que su propia incertidumbre, cuando cada movimiento es miles de veces mayor. El muestreo importó: con una imagen por noche, el periodo de Ío es un alias y la combinación queda a decenas de grados por día de cero. Calisto, con un cociente de 2,33, queda fuera de la cadena. Lo que las imágenes no pueden mostrar es el ángulo mismo manteniéndose durante años, que <em>Cuando las órbitas se enlazan</em> sigue en un modelo. Otros gigantes tienen familias propias (las lunas de Saturno, las de Urano), y este conjunto solo cubre las de Júpiter.',
    },
  ],
};

export const THE_SCALE_OF_THE_SOLAR_SYSTEM_ES = {
  title: 'La escala del sistema solar',
  subtitle:
    'Distancias verdaderas del sandbox, el tiempo que tarda la luz y una maqueta en la que la Tierra es una canica',
  objectives: [
    'Leer las distancias de la Tierra, Júpiter y Neptuno al Sol en unidades astronómicas, en el sandbox dibujado a escala verdadera',
    'Convertir una distancia en el tiempo que tarda la luz en recorrerla',
    'Construir una maqueta en la que la Tierra es una canica del tamaño que elijas, y decir dónde caen el Sol y Neptuno',
    'Decir qué hace mal un diagrama del sistema solar en una sola página, y qué conserva',
  ],
  steps: [
    {
      title: 'Una imagen que ya has visto',
      body: 'Todo diagrama del sistema solar tiene el Sol, ocho planetas en fila y planetas dibujados lo bastante grandes para verse. Esta investigación usa en cambio el sandbox, donde las <strong>distancias son verdaderas</strong>: 100 unidades por unidad astronómica, la distancia de la Tierra al Sol. Los planetas se dibujan más grandes que su tamaño real para que se vean, y la vista llega al menos a Saturno, porque una más amplia dejaría invisibles los planetas interiores. Neptuno está más lejos de lo que muestra la primera vista.',
      tip: 'Las distancias de la lectura vienen del sandbox, no de una tabla; los pasos siguientes las comparan con los números que conoces.',
    },
    {
      title: 'Tres distancias',
      body: 'Aleja la vista con el botón <strong>Alejar</strong>, la rueda del ratón o un gesto de pellizco hasta que Neptuno aparezca en pantalla. Luego selecciona <strong>la Tierra</strong>, <strong>Júpiter</strong> y <strong>Neptuno</strong> por turno, haciendo clic en el planeta o eligiéndolo en la lista de objetos, y pulsa <strong>Tomar la lectura</strong> junto a la distancia de cada uno al Sol.',
      fields: [
        {
          label: 'Distancia de la Tierra al Sol',
          misconceptions: [
            {
              say: 'Esa lectura es de otro planeta. Selecciona el planeta que nombra esta casilla, haciendo clic en él o eligiéndolo en la lista de objetos, y toma la lectura otra vez.',
            },
          ],
        },
        {
          label: 'Distancia de Júpiter al Sol',
          misconceptions: [
            {
              say: 'Esa lectura es de otro planeta. Selecciona el planeta que nombra esta casilla, haciendo clic en él o eligiéndolo en la lista de objetos, y toma la lectura otra vez.',
            },
          ],
        },
        {
          label: 'Distancia de Neptuno al Sol',
          misconceptions: [
            {
              say: 'Esa lectura es de otro planeta. Selecciona el planeta que nombra esta casilla, haciendo clic en él o eligiéndolo en la lista de objetos, y toma la lectura otra vez.',
            },
          ],
        },
      ],
    },
    {
      title: '¿Cuánto tarda la luz?',
      body: 'La luz del Sol tarda unos minutos en llegar a la Tierra. Neptuno está mucho más lejos, a la distancia que tomaste.',
      prompt: 'La luz del Sol tarda en llegar a Neptuno unos&hellip;',
      options: [
        'cuatro horas',
        'treinta minutos',
        'el mismo tiempo que hasta la Tierra',
        'cuatro días',
      ],
      hints: [
        'La luz tarda lo mismo en cruzar cada unidad astronómica. ¿Cuántas hay hasta Neptuno?',
      ],
      because:
        'Unas cuatro horas: Neptuno está a 30,07 UA y la luz cruza una UA en 499 segundos, así que 30,07 por 499 segundos son 15 005 segundos, 4,17 horas. Un mensaje de una nave en Neptuno tardaría eso en llegar, en cada sentido.',
    },
    {
      title: 'El tiempo de la luz hasta Neptuno',
      body: 'La luz cruza una unidad astronómica en unos 8 minutos y 19 segundos, 499 segundos: es el retraso entre que algo ocurre en el Sol y lo vemos. Multiplícalo por la distancia que tomaste hasta Neptuno, y convierte los segundos en horas.',
      fields: [
        { label: 'Distancia de Neptuno al Sol' },
        { label: 'Tiempo de la luz del Sol a Neptuno' },
      ],
    },
    {
      title: 'La Tierra como una canica',
      body: 'Construye una maqueta en la que la Tierra es una canica de un centímetro. La Tierra mide 12 742 kilómetros de diámetro y está a 149,6 millones de kilómetros del Sol.',
      prompt: 'En esa maqueta el Sol es&hellip;',
      options: [
        'una bola de unos 1 metro de ancho, a unos 120 metros de la canica',
        'una bola de unos 10 centímetros de ancho, a unos 1 metro de la canica',
        'una bola de unos 10 metros de ancho, a unos 10 metros de la canica',
        'una bola casi tan ancha como la canica, a unos 10 centímetros de ella',
      ],
      hints: [
        'Divide la distancia Tierra–Sol entre el diámetro de la Tierra; ese número de canicas cabe entre ellos.',
      ],
      because:
        'El Sol mide 109 diámetros terrestres, así que 109 centímetros, y entre él y la Tierra caben 11 741 canicas: 117 metros.',
    },
    {
      title: 'Elige tu canica',
      body: 'Ahora elige el tamaño de tu propia Tierra, en centímetros de ancho: un guisante, una canica, un balón. Una unidad astronómica son el mismo número de Tierras de ancho, elijas lo que elijas. La página calcula a qué distancia del Sol queda la Tierra en tu maqueta. La distancia de Neptuno es la que tomaste, en unidades astronómicas: halla dónde cae Neptuno en tu maqueta, en metros.',
      fields: [
        { label: 'Diámetro de tu Tierra en la maqueta' },
        { label: 'Una unidad astronómica en tu maqueta' },
        { label: 'Distancia de Neptuno al Sol' },
        { label: 'Distancia de Neptuno al Sol en tu maqueta' },
      ],
    },
    {
      title: '¿Qué hace mal un diagrama de libro?',
      body: 'Un diagrama de una página muestra los planetas como puntos separados unos centímetros, con el Sol del tamaño de una moneda pequeña.',
      prompt:
        '¿Cuál es la principal diferencia del diagrama con la escala verdadera?',
      options: [
        'Los tamaños de los cuerpos están enormemente exagerados frente a las distancias entre ellos',
        'El orden de los planetas es incorrecto',
        'Las distancias están exageradas y los tamaños son correctos',
        'Está exactamente a escala, pero es demasiado pequeño para ver los detalles',
      ],
      misconceptions: [
        {
          say: 'Es al revés: los cuerpos son diminutos frente al espacio que los separa, y para que se vean se dibujan muchas veces más grandes. El sandbox conserva las distancias verdaderas y muestra los planetas mayores de lo real por la misma razón.',
        },
      ],
      hints: [
        'Piensa en tu propia maqueta y en lo separadas que quedaban sus piezas.',
      ],
      because:
        'Los tamaños están exagerados: a la escala verdadera de las distancias los planetas serían motas. El diagrama conserva el orden y, más o menos, el espaciado relativo; el sandbox conserva las distancias verdaderas y agranda los planetas para poder verlos.',
    },
    {
      title: 'Lo que has deducido',
      body: 'La Tierra, Júpiter y Neptuno a 1,00, 5,20 y 30,07 unidades astronómicas, cada una tomada del propio planeta; luz del Sol que tarda 8 minutos en llegar a nosotros y 4,17 horas en llegar a Neptuno; y una maqueta del tamaño que elegiste, en la que una Tierra de un centímetro tiene el Sol, de un metro de ancho, a 117 metros y Neptuno a 3,5 kilómetros. Los tamaños de los planetas son lo único que el sandbox no muestra a escala verdadera; las investigaciones siguientes, sobre las lunas de los gigantes y sobre los cometas, parten de estas distancias.',
    },
  ],
};

export const COMETS_AND_THE_SUN_ES = {
  title: 'Los cometas y el Sol',
  subtitle:
    'La órbita de un cometa modelo en el sandbox, cuánto se calienta en cada extremo, el Halley real como caso de transferencia y hacia dónde apuntan sus colas',
  objectives: [
    'Leer la distancia mínima y máxima al Sol de un cometa que elijas, en su órbita del sandbox',
    'Estimar la temperatura de un núcleo cometario desnudo en cada extremo de su órbita, con la temperatura de emisión y su ley de la raíz cuadrada inversa',
    'Decir hacia dónde apunta la cola de iones de un cometa, venga o vaya, y por qué no es como la estela del humo',
    'Decir qué deja fuera la estimación de temperatura, y dónde el hielo empieza a hacerse gas',
  ],
  steps: [
    {
      title: 'Una bola de nieve sucia',
      body: 'Un cometa son unos kilómetros de hielo y polvo en una órbita larga. Lejos del Sol está oscuro e inerte. Cerca del Sol el hielo pasa a gas, y el gas y el polvo escapan y forman una <strong>coma</strong> y dos colas. El sandbox tiene el Sol, los ocho planetas y doce cometas. Llevan los nombres de cometas famosos, pero el sandbox coloca cada uno a la distancia de su órbita media con el 70 por ciento de la velocidad de una órbita circular, así que son <strong>cometas modelo en órbitas propias</strong>, no las órbitas reales.',
      tip: 'Los cometas se mueven deprisa. Pausa para leer un número; reanuda para ver las colas.',
    },
    {
      title: '¿Hacia dónde apunta la cola?',
      body: 'Un cometa tiene cabeza y cola, y una cola sugiere algo que se arrastra detrás, como el humo de un tren en marcha.',
      prompt: 'La cola principal (de iones) de un cometa apunta&hellip;',
      options: [
        'lejos del Sol, vaya el cometa hacia donde vaya',
        'detrás del cometa, opuesta a su movimiento',
        'delante del cometa, a lo largo de su movimiento',
        'hacia el Sol',
      ],
      hints: ['¿Qué siente del Sol el gas de la cola?'],
      because:
        'Lejos del Sol. La cola de iones es gas arrastrado directamente lejos por el viento solar, así que al salir del sistema solar interior va delante del cometa en lugar de detrás. La cola de polvo, más ancha y curva, sí se queda atrás a lo largo de la órbita.',
    },
    {
      title: 'Mira las colas',
      body: 'Las colas solo se ven donde un cometa está a menos de unas 3 UA del Sol, y la lectura dice cuándo lo está el cometa que seleccionas. Halley, el primer cometa de la lectura, se queda más allá de 5,8 UA. Wild 2 y Hartley 2 llegan a 1,1 UA y Shoemaker-Levy 9 a 2,1 (tenue; en un equipo más lento, el único). Pausa la escena, haz clic en un cometa y vuelve a reanudarla.',
      checklist: [
        'Selecciona un cometa que llegue a menos de 3 UA y acércate a él',
        'Páusalo en tres puntos que elijas: de camino hacia el Sol, cerca de su máxima aproximación y de camino hacia fuera',
        'En cada punto compara la cola estrecha con la línea del Sol a través de la cabeza del cometa: ¿hacia dónde apunta, y hacia dónde va el cometa?',
      ],
    },
    {
      title: 'De camino hacia fuera',
      body: 'Un cometa se aleja del Sol.',
      prompt: 'Su cola de iones está&hellip;',
      options: [
        'delante del núcleo, apuntando lejos del Sol',
        'detrás del núcleo, arrastrándose como el humo',
        'ausente, porque las colas solo se forman al acercarse',
        'plegada sobre el núcleo',
      ],
      misconceptions: [
        {
          say: 'Esa es la cola de polvo, y solo aproximadamente. La cola de gas es arrastrada directamente lejos del Sol, así que al alejarse el núcleo sigue a su propia cola.',
        },
      ],
      hints: ['La cola apunta lejos del Sol; ¿hacia dónde va el cometa?'],
      because:
        'Delante del núcleo. La dirección de la cola la fija el Sol, no el movimiento del cometa, así que un cometa que se aleja vuela con la cola por delante.',
    },
    {
      title: 'Los dos extremos de la órbita',
      body: 'Selecciona el cometa que observaste, u otro. Pulsa <strong>Tomar la lectura</strong> junto a su <strong>mínima distancia</strong> y junto a su <strong>máxima distancia</strong> al Sol, en unidades astronómicas. Son los dos extremos de la órbita, el perihelio y el afelio.',
      fields: [
        { label: 'Mínima distancia al Sol' },
        { label: 'Máxima distancia al Sol' },
      ],
    },
    {
      title: '¿Cuánto calor en cada extremo?',
      body: 'Un núcleo desnudo y oscuro (albedo de Bond 0,04) que reparte la luz solar que absorbe por toda su superficie irradia a su <strong>temperatura de emisión</strong>, 275,5 K a 1 UA. Cae como uno sobre la raíz cuadrada de la distancia. Calcula la temperatura a las dos distancias que tomaste. Es una estimación de cuerpo desnudo: un cometa pierde energía al pasar el hielo a gas y un núcleo real no es uniforme.',
      fields: [
        { label: 'Mínima distancia al Sol' },
        { label: 'Máxima distancia al Sol' },
        { label: 'Temperatura en la mínima distancia' },
        { label: 'Temperatura en la máxima distancia' },
      ],
    },
    {
      title: '¿Cuánto calor hace en el Halley real?',
      body: 'El cometa que el sandbox llama Halley no está en la órbita de Halley. El cometa real se acerca a unos <strong>0,586 UA</strong> del Sol en su punto más cercano, dentro de la órbita de Venus.',
      prompt: 'A esa distancia un núcleo desnudo está a unos&hellip;',
      options: ['120 K', '200 K', '360 K', '700 K'],
      hints: [
        'Más cerca del Sol que 1 UA significa más caliente que la temperatura a 1 UA.',
      ],
      because:
        'Unos 360 K: la temperatura a 1 UA dividida entre la raíz cuadrada de 0,586 es 360 K, muy por encima de los 160 K a los que el hielo pasa a gas.',
    },
    {
      title: 'El Halley real',
      body: 'Aplica la misma estimación a la aproximación mínima real de Halley, la distancia del paso anterior, y compárala con tu predicción.',
      fields: [
        { label: 'La aproximación mínima del Halley real' },
        { label: 'Temperatura en la aproximación mínima real' },
      ],
    },
    {
      title: '¿Por qué una cola cerca del Sol?',
      body: 'Un cometa puede pasar siglos sin cola y echar una en meses.',
      prompt: '¿Por qué le sale una cola a un cometa al entrar hacia el Sol?',
      options: [
        'El núcleo, más caliente, pasa su hielo a gas, y el gas y el polvo escapan y son empujados lejos del Sol',
        'La gravedad del Sol lo estira',
        'Va más deprisa, así que el aire corre a su lado',
        'La cola estaba ahí siempre, y solo se hace visible',
      ],
      misconceptions: [
        {
          say: 'Aquí fuera no hay aire que corra a su lado. Lo que se arrastra es gas que el propio cometa perdió, por la luz del Sol y el viento solar.',
        },
      ],
      hints: [
        'Compara la temperatura en el extremo cercano de un cometa que echó una cola con los 160 K a los que el hielo pasa a gas.',
      ],
      because:
        'El calor. La temperatura del núcleo sube como uno sobre la raíz cuadrada de la distancia; el hielo pasa a gas hacia los 160 K, que un núcleo desnudo alcanza a unas 3 UA, y el gas y el polvo que escapan forman la coma y las colas: el viento solar barre el gas lejos del Sol y la luz empuja el polvo.',
    },
    {
      title: 'Lo que has deducido',
      body: 'La órbita de un cometa tiene dos extremos, aquí leídos en el sandbox; un núcleo desnudo está más caliente, en el extremo cercano, en la raíz cuadrada del cociente de esas distancias; el hielo pasa a gas hacia los 160 K, que un núcleo desnudo alcanza a unas 3 UA, donde el sandbox empieza a dibujar colas. El Halley modelo, a 5,79 UA y 114 K, se queda por debajo, un cometa que llega a menos de 3 UA sube por encima, y el Halley real, a 0,586 UA, llega a 360 K. La cola de iones apunta siempre lejos del Sol, así que un cometa vuela con la cola por delante al alejarse. Un cometa real añade lo que esta estimación deja fuera: su reflectividad, la energía gastada en pasar el hielo a gas y su giro.',
    },
  ],
};

/** The Spanish shadows by lesson id (what instructorLocale.js spreads). */
export const SHADOWS = {
  'the-scale-of-the-solar-system': THE_SCALE_OF_THE_SOLAR_SYSTEM_ES,
  'comets-and-the-sun': COMETS_AND_THE_SUN_ES,
  'moons-of-the-giants': MOONS_OF_THE_GIANTS_ES,
};

/** The lessons, in catalog order (what js/data/investigations.js spreads). */
// The catalog order is the order the lessons are written in this file: the
// registry generator reads it from the text (tools/capability-registries.mjs).
export default [
  MOONS_OF_THE_GIANTS,
  THE_SCALE_OF_THE_SOLAR_SYSTEM,
  COMETS_AND_THE_SUN,
];
