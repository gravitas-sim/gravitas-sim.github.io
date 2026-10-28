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
// Content only, no imports: every number a step states is recomputed in
// tests/planetsCloseout.test.js from the instruments and kernels the lesson
// points at. Every step carries a `sid`, an opaque stable id that student
// progress is keyed by: reword a step, move it, translate it, never change its
// sid.
//
// Not here, and why (D-R10-206-01): "Worlds compared" needs the workbench of
// Prompt 203 part B, which is not built; "Reading a surface" needs a marking
// instrument for craters, channels and dunes on the Mars frame, which does not
// exist; "Space weather from the Sun" needs a sunspot-number table pack that has
// not been retrieved. Each is a reading step of the sequence, with its reason.
// =============================================================================

/** A placeholder star on the canvas: a display; the instrument is where the picture is. */
const STAGE = {
  spacing: 150,
  fit: true,
  stars: [{ role: 'star', name: 'A star', teffK: 5772, lumSun: 1 }],
};
const near = (x, target, tolerance) =>
  Number.isFinite(x) && Math.abs(x - target) <= tolerance;

const JF = (values = {}, hide = []) => ({ id: 'moon-frames', values, hide });
const JP = (values = {}, hide = []) => ({ id: 'moon-fit', values, hide });

// -----------------------------------------------------------------------------
// 1. Moons of the Giants
// -----------------------------------------------------------------------------
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
  objectives: [
    'Read the periods of Io, Europa and Ganymede from fitted frames, and form their ratios',
    'Say why a ratio near 2 is a hint of a resonance and not a proof, and what the combination of the three motions adds',
    'Find the Laplace combination of the three motions, with its uncertainty, and say what a value consistent with zero does and does not show',
    'Say why Callisto is not part of the chain, with the same arithmetic',
  ],
  steps: [
    {
      sid: 'a-family-of-moons',
      stage: STAGE,
      type: 'read',
      title: 'A family of moons',
      body: `A giant planet carries a family. Jupiter has four large moons you can see in
             binoculars, Io, Europa, Ganymede and Callisto, and the three inner ones
             have a curious habit: each takes about twice as long to go round as the
             one inside it. This investigation measures that from pictures.
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
      stage: STAGE,
      type: 'predict',
      reveal: 'three-periods',
      title: 'How do the three periods compare?',
      body: `Io goes round in about 1.77 days. The instrument fits a sinusoid to each
             moon&rsquo;s distance from Jupiter over the 51 frames, and reads the
             period from it.`,
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
      tool: JP({ moon: 1, cadence: 1 }),
    },
    {
      sid: 'three-periods',
      stage: STAGE,
      type: 'measure',
      title: 'Three periods',
      body: `With the sampling at <strong>1</strong>, the designed sequence of frames, read
             the <strong>period</strong> of Io, of Europa and of Ganymede in days. Use the
             four decimals the instrument gives: the arithmetic that follows is
             sensitive to them.`,
      fields: [
        { id: 'p1', label: 'Io’s period', unit: 'd', hint: '1.7682' },
        { id: 'p2', label: 'Europa’s period', unit: 'd', hint: '3.5480' },
        { id: 'p3', label: 'Ganymede’s period', unit: 'd', hint: '7.1413' },
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
            'Choose each moon in turn (1, 2, 3) with the designed sampling (1), then read “Period” to four decimals.',
        };
      },
      tool: JP({ moon: 1, cadence: 1 }),
    },
    {
      sid: 'the-ratios',
      stage: STAGE,
      type: 'measure',
      title: 'Ratios, not quite two',
      body: `Type the three periods again and the instrument will divide them: Europa&rsquo;s
             by Io&rsquo;s, and Ganymede&rsquo;s by Europa&rsquo;s.`,
      fields: [
        { id: 'p1', label: 'Io’s period', unit: 'd', hint: '1.7682' },
        { id: 'p2', label: 'Europa’s period', unit: 'd', hint: '3.5480' },
        { id: 'p3', label: 'Ganymede’s period', unit: 'd', hint: '7.1413' },
        {
          id: 'r12',
          label: 'Europa’s period over Io’s',
          unit: '',
          compute: v => v.p2 / v.p1,
          decimals: 3,
        },
        {
          id: 'r23',
          label: 'Ganymede’s period over Europa’s',
          unit: '',
          compute: v => v.p3 / v.p2,
          decimals: 3,
        },
      ],
      validate: v => {
        if (![v.p1, v.p2, v.p3].every(Number.isFinite)) return null;
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
            'Type the periods to four decimals, from the previous step: Io 1.7682, Europa 3.5480, Ganymede 7.1413.',
        };
      },
      tool: JP({ moon: 2, cadence: 1 }),
    },
    {
      sid: 'a-hint-is-not-proof',
      stage: STAGE,
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
      stage: STAGE,
      type: 'predict',
      reveal: 'the-motions-together',
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
        'Zero. Where the three move in step, the relation holds exactly for the mean motions, and the next step puts the measured ones into it, with the uncertainty the fits give.',
      tool: JP({ moon: 3, cadence: 1 }),
    },
    {
      sid: 'the-motions-together',
      stage: STAGE,
      type: 'measure',
      title: 'The three motions together',
      body: `Type the three periods again. The instrument turns each into a motion in
             degrees a day, and forms Io&rsquo;s minus three times Europa&rsquo;s plus
             twice Ganymede&rsquo;s. For scale: the three fits&rsquo; uncertainties
             combine to about <strong>&plusmn;0.025</strong> degrees a day.`,
      fields: [
        { id: 'p1', label: 'Io’s period', unit: 'd', hint: '1.7682' },
        { id: 'p2', label: 'Europa’s period', unit: 'd', hint: '3.5480' },
        { id: 'p3', label: 'Ganymede’s period', unit: 'd', hint: '7.1413' },
        {
          id: 'n1',
          label: 'Io’s motion',
          unit: '°/d',
          compute: v => 360 / v.p1,
          decimals: 2,
        },
        {
          id: 'n2',
          label: 'Europa’s motion',
          unit: '°/d',
          compute: v => 360 / v.p2,
          decimals: 2,
        },
        {
          id: 'n3',
          label: 'Ganymede’s motion',
          unit: '°/d',
          compute: v => 360 / v.p3,
          decimals: 2,
        },
        {
          id: 'laplace',
          label: 'Io − 3 × Europa + 2 × Ganymede',
          unit: '°/d',
          compute: v => 360 / v.p1 - (3 * 360) / v.p2 + (2 * 360) / v.p3,
          decimals: 3,
        },
      ],
      validate: v => {
        if (![v.p1, v.p2, v.p3].every(Number.isFinite)) return null;
        if (near(v.laplace, 0.015, 0.04)) {
          return {
            level: 'ok',
            message:
              'About 0.015 degrees a day, against motions of 204, 101 and 50 degrees a day and an uncertainty of ±0.025: consistent with zero, and 14 thousand times smaller than Io’s own motion. Rounded to three decimals the periods would give 0.05: the four decimals matter.',
          };
        }
        return {
          level: 'error',
          message:
            'Use four decimals: Io 1.7682, Europa 3.5480 and Ganymede 7.1413 days. The combination is very small, and a period rounded to three decimals can move it by more than its own size.',
        };
      },
      tool: JP({ moon: 3, cadence: 1 }),
    },
    {
      sid: 'consistent-with-zero',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Is 0.015 zero?',
      body: `The combination came out 0.015 degrees a day, with an uncertainty of about 0.025.`,
      prompt: 'What does that say about whether it is zero?',
      options: [
        'It is consistent with zero: it is smaller than its own uncertainty, which is as close as these frames can say',
        'It is not zero, so the moons are not in a resonance',
        'It is exactly zero, so the moons are certainly locked',
        'It means nothing, because 0.015 is not a whole number',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'not-zero',
          option: 1,
          say: 'A value smaller than its uncertainty cannot be told from zero by these frames. Not being exactly 0 is what every measurement does.',
        },
        {
          id: 'proof',
          option: 2,
          say: 'Consistent with zero is not the same as exactly zero, and neither proves that the moons are locked: the relation among the motions is a necessary condition. What the frames cannot show is whether the angle itself librates.',
        },
      ],
      hints: [
        'Compare 0.015 with the ±0.025 the instrument’s uncertainties give.',
      ],
      because:
        'Consistent with zero. The combination is some 14 thousand times smaller than Io’s motion, and inside its uncertainty. That is the necessary relation, observed. The sufficient part, that the angle <em>librates</em> and does not circulate, needs the angle watched over years; <em>When Orbits Lock</em> runs that in a model.',
      tool: JP({ moon: 3, cadence: 1 }),
    },
    {
      sid: 'callisto-is-not-in-the-chain',
      stage: STAGE,
      type: 'measure',
      title: 'And Callisto?',
      body: `Callisto is the fourth moon, and the farthest. Set the instrument to
             <strong>moon 4</strong> and read its period. Then divide it by
             Ganymede&rsquo;s, 7.1413 days.`,
      fields: [
        { id: 'p4', label: 'Callisto’s period', unit: 'd', hint: '16.624' },
        {
          id: 'r34',
          label: 'Callisto’s period over Ganymede’s',
          unit: '',
          compute: v => v.p4 / 7.1413,
          decimals: 3,
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.p4)) return null;
        if (near(v.p4, 16.624, 0.02) && near(v.r34, 2.328, 0.004)) {
          return {
            level: 'ok',
            message:
              '16.62 days, and a ratio of 2.33: nowhere near 2, 5/2 or any small whole number. Callisto is not locked to the other three, and the same arithmetic that supports the chain of three says so.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose moon 4 with the designed sampling, then read “Period”.',
        };
      },
      tool: JP({ moon: 4, cadence: 1 }),
    },
    {
      sid: 'what-you-worked-out',
      stage: STAGE,
      type: 'read',
      title: 'What you worked out',
      body: `Three periods from synthetic frames, 1.7682, 3.5480 and 7.1413 days; ratios
             of 2.006 and 2.013, near 2 and not equal to it, which is a hint and not a
             test; and a combination of the three motions, 0.015 degrees a day against
             an uncertainty of 0.025, consistent with zero when each motion is some
             hundreds of times larger. Callisto, at a ratio of 2.33, is outside the
             chain. What the frames cannot show is the angle itself holding for years,
             which <em>When Orbits Lock</em> follows in a model. Other giants carry
             families of their own (Saturn&rsquo;s moons, Uranus&rsquo;s), and this
             pack covers only Jupiter&rsquo;s.`,
      tool: JP({ moon: 3, cadence: 1 }),
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
/** Distance of a role from the Sun, in AU, or null (100 simulation units to the AU). */
const auFromSun = (ctx, role) => {
  const sun = ctx.role('sun');
  const b = ctx.role(role);
  if (!sun || !b) return null;
  return ctx.au(Math.hypot(b.pos.x - sun.pos.x, b.pos.y - sun.pos.y));
};
const distanceRows = ctx =>
  ['earth', 'jupiter', 'neptune'].map(role => {
    const au = auFromSun(ctx, role);
    return {
      label: `${role[0].toUpperCase()}${role.slice(1)}: distance from the Sun`,
      value: au === null ? 'not on the canvas yet' : `${au.toFixed(2)} AU`,
    };
  });

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
  objectives: [
    'Read the distances of Earth, Jupiter and Neptune from the Sun in astronomical units, from the sandbox drawn at true scale',
    'Turn a distance into the time light takes to cover it',
    'Build a scale model in which Earth is a marble, and say where the Sun and Neptune fall in it',
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
             view starts from Mercury out to Saturn because nothing wider would
             leave the inner planets visible. Scroll to zoom out and find Neptune.`,
      tip: 'The distances in the readout come from the sandbox, not from a table; the next steps check them against the numbers you know.',
      setup: SCALE_SETUP,
    },
    {
      sid: 'three-distances',
      bind: SOLAR_BIND,
      type: 'measure',
      title: 'Three distances',
      body: `Read the distance of <strong>Earth</strong>, <strong>Jupiter</strong> and
             <strong>Neptune</strong> from the Sun in astronomical units, in the readout.`,
      fields: [
        {
          id: 'earth',
          label: 'Earth’s distance from the Sun',
          unit: 'AU',
          hint: '1.00',
        },
        {
          id: 'jupiter',
          label: 'Jupiter’s distance from the Sun',
          unit: 'AU',
          hint: '5.20',
        },
        {
          id: 'neptune',
          label: 'Neptune’s distance from the Sun',
          unit: 'AU',
          hint: '30.07',
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
            'Read the three rows of the readout. If Neptune is not there yet, let the world finish building.',
        };
      },
    },
    {
      sid: 'light-time-predict',
      bind: SOLAR_BIND,
      type: 'predict',
      reveal: 'light-time',
      title: 'How long does the light take?',
      body: `Light crosses one astronomical unit in about 8 minutes and 20 seconds, 499
             seconds: it is the delay between something happening on the Sun and
             our seeing it.`,
      prompt: 'Sunlight takes, to reach Neptune, about&hellip;',
      options: [
        'four hours',
        'thirty minutes',
        'eight minutes, the same as to the Earth',
        'four days',
      ],
      answer: 0,
      hints: [
        'Neptune is thirty times as far as the Earth: multiply the time.',
      ],
      because:
        'About four hours: 30.07 times 499 seconds is 15,004 seconds, 4.17 hours. A message from a spacecraft at Neptune would take that long to arrive, each way.',
    },
    {
      sid: 'light-time',
      bind: SOLAR_BIND,
      type: 'measure',
      title: 'The light time to Neptune',
      body: `Type Neptune&rsquo;s distance from the readout. The light time is the
             distance times 499 seconds, which the instrument turns into hours.`,
      fields: [
        {
          id: 'neptune',
          label: 'Neptune’s distance from the Sun',
          unit: 'AU',
          hint: '30.07',
        },
        {
          id: 'hours',
          label: 'Light time from the Sun to Neptune',
          unit: 'h',
          compute: v => (v.neptune * 499.005) / 3600,
          decimals: 2,
        },
      ],
      probe: distanceRows,
      validate: v => {
        if (!Number.isFinite(v.neptune)) return null;
        if (near(v.hours, 4.17, 0.1)) {
          return {
            level: 'ok',
            message:
              '4.17 hours. The same arithmetic gives Earth 8.3 minutes and Jupiter 43 minutes; a radio command to a spacecraft at Neptune and its reply would take more than eight hours.',
          };
        }
        return {
          level: 'error',
          message: 'Type Neptune’s distance in astronomical units: about 30.',
        };
      },
    },
    {
      sid: 'earth-as-a-marble',
      bind: SOLAR_BIND,
      type: 'predict',
      reveal: 'scale-model',
      title: 'Earth as a marble',
      body: `Build a scale model in which the Earth is a marble one centimeter across.
             The Earth is 12,742 kilometers across and 149.6 million kilometers from the
             Sun.`,
      prompt: 'In that model the Sun is about&hellip;',
      options: [
        'a ball a meter wide, about 117 meters from the marble',
        'a ball a few centimeters wide, about a meter from the marble',
        'a ball ten meters wide, about 10 meters from the marble',
        'the same size as the marble',
      ],
      answer: 0,
      hints: [
        'Divide the Earth–Sun distance by the Earth’s diameter; that many marbles fit between them.',
      ],
      because:
        'The Sun is 109 Earth diameters across, so 109 centimeters, and 11,741 marbles fit between it and the Earth: 117 meters. Neptune is thirty times as far.',
    },
    {
      sid: 'scale-model',
      bind: SOLAR_BIND,
      type: 'measure',
      title: 'Where Neptune is in the marble model',
      body: `One marble centimeter is 12,742 kilometers. Work out how far the Earth is
             from the Sun in the model, in meters, and how far Neptune is, in
             kilometers, using Neptune&rsquo;s distance in astronomical units.`,
      fields: [
        {
          id: 'neptune',
          label: 'Neptune’s distance from the Sun',
          unit: 'AU',
          hint: '30.07',
        },
        {
          id: 'earth_m',
          label: 'Earth to the Sun in the model',
          unit: 'm',
          compute: () => (149597870.7 / 12742) * 0.01,
          decimals: 1,
        },
        {
          id: 'neptune_km',
          label: 'Neptune to the Sun in the model',
          unit: 'km',
          compute: v => ((149597870.7 / 12742) * 0.01 * v.neptune) / 1000,
          decimals: 2,
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.neptune)) return null;
        if (near(v.earth_m, 117.4, 0.5) && near(v.neptune_km, 3.53, 0.1)) {
          return {
            level: 'ok',
            message:
              '117 meters for the Earth and 3.5 kilometers for Neptune: a marble, a ball a meter wide a football field away, and Neptune two miles out. This is why a diagram on one page cannot be to scale in both size and distance.',
          };
        }
        return {
          level: 'error',
          message: 'Type Neptune’s distance in astronomical units: about 30.',
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
      hints: ['Think of the marble and the football field.'],
      because:
        'Sizes are exaggerated: at the true scale of the distances the planets would be specks. The diagram keeps the order and, roughly, the relative spacing; the sandbox keeps the distances true and enlarges the planets so that they can be seen.',
    },
    {
      sid: 'what-you-worked-out',
      bind: SOLAR_BIND,
      type: 'read',
      title: 'What you worked out',
      body: `Earth, Jupiter and Neptune at 1.00, 5.20 and 30.07 astronomical units; sunlight
             that takes 8 minutes to reach us and 4.17 hours to reach Neptune; and a marble
             Earth with the Sun a meter wide 117 meters away and Neptune 3.5 kilometers
             out. The planets&rsquo; sizes are the one thing the sandbox does not show at
             true scale; the next investigations, on the moons of the giants and on
             comets, start from these distances.`,
    },
  ],
};

// -----------------------------------------------------------------------------
// 3. Comets and the Sun
// -----------------------------------------------------------------------------
const COMET_SETUP = {
  scenario: 'Solar System',
  seed: 'comets-and-the-sun',
  settings: { enable_asteroids: false, num_asteroids: 0, num_comets: 3 },
  camera: { zoom: 0.25, pan: { x: 0, y: 0 } },
  paused: false,
};
const COMET_BIND = { sun: { name: 'Sol' } };
/** The first comet on a bound orbit, with its closest and furthest distance in AU, or null. */
const firstBoundComet = ctx => {
  for (const b of ctx.bodies || []) {
    if (b.kind !== 'Comet' || b.alive === false) continue;
    const el = ctx.elements(b);
    if (el && el.bound) {
      return { body: b, peri: ctx.au(el.periapsis), apo: ctx.au(el.apoapsis) };
    }
  }
  return null;
};
/** Equilibrium temperature of a bare, dark body at r AU, uniform redistribution, albedo 0.04 (kernel: 275.5 K at 1 AU). */
const cometTemperature = rAu => 275.5 / Math.sqrt(rAu);
const cometRows = ctx => {
  const c = firstBoundComet(ctx);
  const sun = ctx.role('sun');
  if (!c || !sun)
    return [
      {
        label: 'The first comet on a closed orbit',
        value: 'not on the canvas yet',
      },
    ];
  const b = c.body;
  const r = ctx.au(Math.hypot(b.pos.x - sun.pos.x, b.pos.y - sun.pos.y));
  const vr =
    (b.pos.x - sun.pos.x) * (b.vel.x - sun.vel.x) +
    (b.pos.y - sun.pos.y) * (b.vel.y - sun.vel.y);
  return [
    { label: 'Comet', value: b.name || 'Comet', emphasis: true },
    { label: 'Closest approach to the Sun', value: `${c.peri.toFixed(2)} AU` },
    {
      label: 'Furthest distance from the Sun',
      value: `${c.apo.toFixed(2)} AU`,
    },
    { label: 'Distance now', value: `${r.toFixed(2)} AU` },
    { label: 'Moving', value: vr < 0 ? 'toward the Sun' : 'away from the Sun' },
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
    'Read a comet’s closest and furthest distance from the Sun from its orbit in the sandbox',
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
             the Sun, the eight planets and a few comets. They carry the names of famous
             comets, but the sandbox starts each one at the distance of its average orbit
             with 70 percent of the speed of a circular orbit, so they are
             <strong>model comets on orbits of their own</strong>, not the real orbits.`,
      tip: 'The comets move quickly. Pause the simulation to read a number; run it again to watch the tails.',
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
      body: `Follow the comets as they go round, and compare each comet&rsquo;s tail with
             the direction to the Sun. The readout says whether the first comet is moving
             toward or away from the Sun.`,
      checklist: [
        'Find a comet with a visible tail, near the Sun',
        'See the narrow ion tail point away from the Sun',
        'See the same comet while it moves away from the Sun: where is its tail now?',
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
      body: `Read the first comet&rsquo;s <strong>closest approach</strong> and
             <strong>furthest distance</strong> from the Sun, in astronomical units,
             in the readout. They are the orbit&rsquo;s two ends, perihelion and aphelion.`,
      fields: [
        {
          id: 'peri',
          label: 'Closest approach to the Sun',
          unit: 'AU',
          hint: '5.79',
        },
        {
          id: 'apo',
          label: 'Furthest distance from the Sun',
          unit: 'AU',
          hint: '17.84',
        },
      ],
      probe: cometRows,
      validate: (v, ctx) => {
        if (![v.peri, v.apo].every(Number.isFinite)) return null;
        const c = firstBoundComet(ctx);
        if (!c) return null;
        if (
          near(v.peri, c.peri, Math.max(0.03, 0.04 * c.peri)) &&
          near(v.apo, c.apo, Math.max(0.1, 0.04 * c.apo))
        ) {
          return {
            level: 'ok',
            message: `${c.peri.toFixed(2)} AU and ${c.apo.toFixed(2)} AU: the orbit’s two ends, a ratio of ${(c.apo / c.peri).toFixed(1)} between them. A comet spends most of its time near the far end.`,
          };
        }
        return {
          level: 'error',
          message:
            'Read “Closest approach to the Sun” and “Furthest distance from the Sun” of the comet the readout names.',
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
             1 AU. It falls as one over the square root of the distance. Type the two
             distances from the last step and the instrument gives the temperature at each
             end. This is a bare-body estimate: a comet loses energy by turning ice to gas
             and a real nucleus is not uniform.`,
      fields: [
        {
          id: 'peri',
          label: 'Closest approach to the Sun',
          unit: 'AU',
          hint: '5.79',
        },
        {
          id: 'apo',
          label: 'Furthest distance from the Sun',
          unit: 'AU',
          hint: '17.84',
        },
        {
          id: 't_peri',
          label: 'Temperature at closest approach',
          unit: 'K',
          compute: v => cometTemperature(v.peri),
          decimals: 0,
        },
        {
          id: 't_apo',
          label: 'Temperature at the furthest distance',
          unit: 'K',
          compute: v => cometTemperature(v.apo),
          decimals: 0,
        },
      ],
      probe: cometRows,
      validate: (v, ctx) => {
        if (![v.peri, v.apo].every(Number.isFinite)) return null;
        const c = firstBoundComet(ctx);
        if (!c) return null;
        if (
          near(v.peri, c.peri, Math.max(0.03, 0.04 * c.peri)) &&
          near(v.apo, c.apo, Math.max(0.1, 0.04 * c.apo))
        ) {
          return {
            level: 'ok',
            message: `${cometTemperature(c.peri).toFixed(0)} K at closest approach and ${cometTemperature(c.apo).toFixed(0)} K at the far end: a factor of ${Math.sqrt(c.apo / c.peri).toFixed(1)}, the square root of the ratio of distances. Water ice turns to gas readily from about 160 K, and by this estimate this model comet never gets there: it stays frozen at both ends.`,
          };
        }
        return {
          level: 'error',
          message:
            'Type the two distances read from the readout of the previous step.',
        };
      },
    },
    {
      sid: 'the-real-halley',
      bind: COMET_BIND,
      type: 'measure',
      title: 'The real Halley',
      body: `The comet the sandbox calls Halley is not on Halley&rsquo;s orbit. The real
             comet comes to about <strong>0.586 AU</strong> from the Sun at its closest,
             inside the orbit of Venus. Use the same estimate for the real
             closest approach.`,
      fields: [
        {
          id: 'q',
          label: 'The real Halley’s closest approach',
          unit: 'AU',
          hint: '0.586',
        },
        {
          id: 't_q',
          label: 'Temperature at the real closest approach',
          unit: 'K',
          compute: v => cometTemperature(v.q),
          decimals: 0,
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.q)) return null;
        if (near(v.q, 0.586, 0.01) && near(v.t_q, 360, 4)) {
          return {
            level: 'ok',
            message:
              '360 K: far above the 160 K at which ice turns to gas, so the real comet does warm enough to grow a tail at the near end of its orbit. The model comet’s orbit never brings it close enough, which is a property of the model and not of comets.',
          };
        }
        return {
          level: 'error',
          message:
            'Type 0.586, the real closest approach in astronomical units.',
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
        'The temperature at the near end was much higher than at the far end.',
      ],
      because:
        'Heating. The nucleus’s temperature rises as one over the square root of the distance; ice turns to gas near 160 K, and the escaping gas and dust form the coma and the tails. The tail is pushed away from the Sun by sunlight and the solar wind.',
    },
    {
      sid: 'what-you-worked-out',
      bind: COMET_BIND,
      type: 'read',
      title: 'What you worked out',
      body: `A comet&rsquo;s orbit has two ends, here read from the sandbox; a bare nucleus
             is hotter by the square root of the ratio of those distances at the near end;
             the model comet stays below the 160 K at which ice turns to gas, and the real
             Halley, at 0.586 AU, reaches 360 K; and the ion tail always points away from the
             Sun, so a comet flies tail first on the way out. A real comet adds what this
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
    'Hallar la combinación de Laplace de los tres movimientos, con su incertidumbre, y decir qué muestra y qué no un valor compatible con cero',
    'Decir por qué Calisto no forma parte de la cadena, con la misma aritmética',
  ],
  steps: [
    {
      title: 'Una familia de lunas',
      body: 'Un planeta gigante lleva consigo una familia. Júpiter tiene cuatro lunas grandes que se ven con unos prismáticos, Ío, Europa, Ganímedes y Calisto, y las tres interiores tienen una costumbre curiosa: cada una tarda casi el doble que la de dentro en dar una vuelta. Esta investigación lo mide a partir de imágenes.\n\nLas imágenes son las <strong>sintéticas</strong> de <em>Pesar a Júpiter con sus lunas</em>: hechas con las posiciones reales de las lunas en noviembre y diciembre de 2025 (JPL Horizons), con el disco de Júpiter, el desenfoque y el ruido añadidos. Nadie observó estas fotografías. Las distancias que lees son las medidas del instrumento; la superposición marca dónde pone el efemérides a cada luna.',
    },
    {
      title: '¿Cómo se comparan los tres periodos?',
      body: 'Ío tarda unos 1,77 días en dar una vuelta. El instrumento ajusta una sinusoide a la distancia de cada luna a Júpiter en las 51 imágenes y lee el periodo de ella.',
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
      body: 'Con el muestreo en <strong>1</strong>, la secuencia diseñada de imágenes, lee el <strong>periodo</strong> de Ío, de Europa y de Ganímedes en días. Usa los cuatro decimales que da el instrumento: la aritmética siguiente es sensible a ellos.',
      fields: [
        { label: 'Periodo de Ío' },
        { label: 'Periodo de Europa' },
        { label: 'Periodo de Ganímedes' },
      ],
    },
    {
      title: 'Cocientes que no llegan a dos',
      body: 'Escribe otra vez los tres periodos y el instrumento los dividirá: el de Europa entre el de Ío, y el de Ganímedes entre el de Europa.',
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
        'Cero. Donde las tres se mueven al paso, la relación se cumple exactamente para los movimientos medios, y el paso siguiente pone en ella los medidos, con la incertidumbre que dan los ajustes.',
    },
    {
      title: 'Los tres movimientos juntos',
      body: 'Escribe otra vez los tres periodos. El instrumento convierte cada uno en un movimiento en grados por día y forma el de Ío menos tres veces el de Europa más dos veces el de Ganímedes. Para tener una escala: las incertidumbres de los tres ajustes se combinan en unos <strong>&plusmn;0,025</strong> grados por día.',
      fields: [
        { label: 'Periodo de Ío' },
        { label: 'Periodo de Europa' },
        { label: 'Periodo de Ganímedes' },
        { label: 'Movimiento de Ío' },
        { label: 'Movimiento de Europa' },
        { label: 'Movimiento de Ganímedes' },
        { label: 'Ío − 3 × Europa + 2 × Ganímedes' },
      ],
    },
    {
      title: '¿Es 0,015 cero?',
      body: 'La combinación salió 0,015 grados por día, con una incertidumbre de unos 0,025.',
      prompt: '¿Qué dice eso sobre si vale cero?',
      options: [
        'Es compatible con cero: es menor que su propia incertidumbre, que es lo más cerca que pueden decir estas imágenes',
        'No es cero, así que las lunas no están en resonancia',
        'Es exactamente cero, así que las lunas están sin duda enlazadas',
        'No significa nada, porque 0,015 no es un número entero',
      ],
      misconceptions: [
        {
          say: 'Un valor menor que su incertidumbre no se distingue de cero con estas imágenes. No ser exactamente 0 es lo que hace toda medida.',
        },
        {
          say: 'Compatible con cero no es lo mismo que exactamente cero, y ninguna de las dos cosas prueba que las lunas estén enlazadas: la relación entre los movimientos es una condición necesaria. Lo que las imágenes no pueden mostrar es si el propio ángulo libra.',
        },
      ],
      hints: [
        'Compara 0,015 con el ±0,025 que dan las incertidumbres del instrumento.',
      ],
      because:
        'Compatible con cero. La combinación es unas 14 mil veces menor que el movimiento de Ío, y está dentro de su incertidumbre. Esa es la relación necesaria, observada. La parte suficiente, que el ángulo <em>libra</em> y no circula, necesita años de observación del ángulo; <em>Cuando las órbitas se enlazan</em> lo sigue en un modelo.',
    },
    {
      title: '¿Y Calisto?',
      body: 'Calisto es la cuarta luna, y la más lejana. Pon el instrumento en la <strong>luna 4</strong> y lee su periodo. Luego divídelo entre el de Ganímedes, 7,1413 días.',
      fields: [
        { label: 'Periodo de Calisto' },
        { label: 'Periodo de Calisto entre el de Ganímedes' },
      ],
    },
    {
      title: 'Lo que has deducido',
      body: 'Tres periodos de imágenes sintéticas, 1,7682, 3,5480 y 7,1413 días; cocientes de 2,006 y 2,013, cerca de 2 y no iguales a 2, lo cual es un indicio y no una prueba; y una combinación de los tres movimientos, 0,015 grados por día frente a una incertidumbre de 0,025, compatible con cero cuando cada movimiento es cientos de veces mayor. Calisto, con un cociente de 2,33, queda fuera de la cadena. Lo que las imágenes no pueden mostrar es el ángulo mismo manteniéndose durante años, que <em>Cuando las órbitas se enlazan</em> sigue en un modelo. Otros gigantes tienen familias propias (las lunas de Saturno, las de Urano), y este paquete solo cubre las de Júpiter.',
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
    'Construir una maqueta en la que la Tierra es una canica, y decir dónde caen el Sol y Neptuno',
    'Decir qué hace mal un diagrama del sistema solar en una sola página, y qué conserva',
  ],
  steps: [
    {
      title: 'Una imagen que ya has visto',
      body: 'Todo diagrama del sistema solar tiene el Sol, ocho planetas en fila y planetas dibujados lo bastante grandes para verse. Esta investigación usa en cambio el sandbox, donde las <strong>distancias son verdaderas</strong>: 100 unidades por unidad astronómica, la distancia de la Tierra al Sol. Los planetas se dibujan más grandes que su tamaño real para que se vean, y la vista empieza de Mercurio a Saturno porque una más amplia dejaría invisibles los planetas interiores. Desplázate para alejar la vista y encuentra a Neptuno.',
      tip: 'Las distancias de la lectura vienen del sandbox, no de una tabla; los pasos siguientes las comparan con los números que conoces.',
    },
    {
      title: 'Tres distancias',
      body: 'Lee la distancia de la <strong>Tierra</strong>, <strong>Júpiter</strong> y <strong>Neptuno</strong> al Sol en unidades astronómicas, en la lectura.',
      fields: [
        { label: 'Distancia de la Tierra al Sol' },
        { label: 'Distancia de Júpiter al Sol' },
        { label: 'Distancia de Neptuno al Sol' },
      ],
    },
    {
      title: '¿Cuánto tarda la luz?',
      body: 'La luz cruza una unidad astronómica en unos 8 minutos y 20 segundos, 499 segundos: es el retraso entre que algo ocurre en el Sol y lo vemos.',
      prompt: 'La luz del Sol tarda en llegar a Neptuno unos&hellip;',
      options: [
        'cuatro horas',
        'treinta minutos',
        'ocho minutos, lo mismo que hasta la Tierra',
        'cuatro días',
      ],
      hints: [
        'Neptuno está treinta veces más lejos que la Tierra: multiplica el tiempo.',
      ],
      because:
        'Unas cuatro horas: 30,07 por 499 segundos son 15 004 segundos, 4,17 horas. Un mensaje de una nave en Neptuno tardaría eso en llegar, en cada sentido.',
    },
    {
      title: 'El tiempo de la luz hasta Neptuno',
      body: 'Escribe la distancia de Neptuno de la lectura. El tiempo de la luz es la distancia por 499 segundos, que el instrumento convierte en horas.',
      fields: [
        { label: 'Distancia de Neptuno al Sol' },
        { label: 'Tiempo de la luz del Sol a Neptuno' },
      ],
    },
    {
      title: 'La Tierra como una canica',
      body: 'Construye una maqueta en la que la Tierra es una canica de un centímetro. La Tierra mide 12 742 kilómetros de diámetro y está a 149,6 millones de kilómetros del Sol.',
      prompt: 'En esa maqueta el Sol es aproximadamente&hellip;',
      options: [
        'una bola de un metro de ancho, a unos 117 metros de la canica',
        'una bola de unos centímetros de ancho, a un metro de la canica',
        'una bola de diez metros de ancho, a 10 metros de la canica',
        'del mismo tamaño que la canica',
      ],
      hints: [
        'Divide la distancia Tierra–Sol entre el diámetro de la Tierra; ese número de canicas cabe entre ellos.',
      ],
      because:
        'El Sol mide 109 diámetros terrestres, así que 109 centímetros, y entre él y la Tierra caben 11 741 canicas: 117 metros. Neptuno está treinta veces más lejos.',
    },
    {
      title: 'Dónde está Neptuno en la maqueta de la canica',
      body: 'Un centímetro de canica son 12 742 kilómetros. Calcula a qué distancia está la Tierra del Sol en la maqueta, en metros, y a qué distancia Neptuno, en kilómetros, con la distancia de Neptuno en unidades astronómicas.',
      fields: [
        { label: 'Distancia de Neptuno al Sol' },
        { label: 'De la Tierra al Sol en la maqueta' },
        { label: 'De Neptuno al Sol en la maqueta' },
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
      hints: ['Piensa en la canica y el campo de fútbol.'],
      because:
        'Los tamaños están exagerados: a la escala verdadera de las distancias los planetas serían motas. El diagrama conserva el orden y, más o menos, el espaciado relativo; el sandbox conserva las distancias verdaderas y agranda los planetas para poder verlos.',
    },
    {
      title: 'Lo que has deducido',
      body: 'La Tierra, Júpiter y Neptuno a 1,00, 5,20 y 30,07 unidades astronómicas; luz del Sol que tarda 8 minutos en llegar a nosotros y 4,17 horas en llegar a Neptuno; y una Tierra de canica con el Sol de un metro de ancho a 117 metros y Neptuno a 3,5 kilómetros. Los tamaños de los planetas son lo único que el sandbox no muestra a escala verdadera; las investigaciones siguientes, sobre las lunas de los gigantes y sobre los cometas, parten de estas distancias.',
    },
  ],
};

export const COMETS_AND_THE_SUN_ES = {
  title: 'Los cometas y el Sol',
  subtitle:
    'La órbita de un cometa modelo en el sandbox, cuánto se calienta en cada extremo, el Halley real como caso de transferencia y hacia dónde apuntan sus colas',
  objectives: [
    'Leer la distancia mínima y máxima de un cometa al Sol en su órbita del sandbox',
    'Estimar la temperatura de un núcleo cometario desnudo en cada extremo de su órbita, con la temperatura de emisión y su ley de la raíz cuadrada inversa',
    'Decir hacia dónde apunta la cola de iones de un cometa, venga o vaya, y por qué no es como la estela del humo',
    'Decir qué deja fuera la estimación de temperatura, y dónde el hielo empieza a hacerse gas',
  ],
  steps: [
    {
      title: 'Una bola de nieve sucia',
      body: 'Un cometa son unos kilómetros de hielo y polvo en una órbita larga. Lejos del Sol está oscuro e inerte. Cerca del Sol el hielo pasa a gas, y el gas y el polvo escapan y forman una <strong>coma</strong> y dos colas. El sandbox tiene el Sol, los ocho planetas y unos cuantos cometas. Llevan los nombres de cometas famosos, pero el sandbox coloca cada uno a la distancia de su órbita media con el 70 por ciento de la velocidad de una órbita circular, así que son <strong>cometas modelo en órbitas propias</strong>, no las órbitas reales.',
      tip: 'Los cometas se mueven deprisa. Pausa la simulación para leer un número; vuelve a ponerla en marcha para ver las colas.',
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
      body: 'Sigue a los cometas mientras giran y compara la cola de cada uno con la dirección del Sol. La lectura dice si el primer cometa se mueve hacia el Sol o se aleja de él.',
      checklist: [
        'Busca un cometa con una cola visible, cerca del Sol',
        'Ve la cola estrecha de iones apuntar lejos del Sol',
        'Ve el mismo cometa mientras se aleja del Sol: ¿dónde está ahora su cola?',
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
      body: 'Lee la <strong>mínima distancia</strong> y la <strong>máxima distancia</strong> del primer cometa al Sol, en unidades astronómicas, en la lectura. Son los dos extremos de la órbita, el perihelio y el afelio.',
      fields: [
        { label: 'Mínima distancia al Sol' },
        { label: 'Máxima distancia al Sol' },
      ],
    },
    {
      title: '¿Cuánto calor en cada extremo?',
      body: 'Un núcleo desnudo y oscuro (albedo de Bond 0,04) que reparte la luz solar que absorbe por toda su superficie irradia a su <strong>temperatura de emisión</strong>, 275,5 K a 1 UA. Cae como uno sobre la raíz cuadrada de la distancia. Escribe las dos distancias del paso anterior y el instrumento da la temperatura en cada extremo. Es una estimación de cuerpo desnudo: un cometa pierde energía al pasar el hielo a gas y un núcleo real no es uniforme.',
      fields: [
        { label: 'Mínima distancia al Sol' },
        { label: 'Máxima distancia al Sol' },
        { label: 'Temperatura en la mínima distancia' },
        { label: 'Temperatura en la máxima distancia' },
      ],
    },
    {
      title: 'El Halley real',
      body: 'El cometa que el sandbox llama Halley no está en la órbita de Halley. El cometa real se acerca a unos <strong>0,586 UA</strong> del Sol en su punto más cercano, dentro de la órbita de Venus. Usa la misma estimación para la aproximación mínima real.',
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
        'La temperatura en el extremo cercano era mucho mayor que en el lejano.',
      ],
      because:
        'El calor. La temperatura del núcleo sube como uno sobre la raíz cuadrada de la distancia; el hielo pasa a gas hacia los 160 K, y el gas y el polvo que escapan forman la coma y las colas. La luz del Sol y el viento solar empujan la cola lejos del Sol.',
    },
    {
      title: 'Lo que has deducido',
      body: 'La órbita de un cometa tiene dos extremos, aquí leídos en el sandbox; un núcleo desnudo está más caliente, en el extremo cercano, en la raíz cuadrada del cociente de esas distancias; el cometa modelo se queda por debajo de los 160 K a los que el hielo pasa a gas, y el Halley real, a 0,586 UA, llega a 360 K; y la cola de iones apunta siempre lejos del Sol, así que un cometa vuela con la cola por delante al alejarse. Un cometa real añade lo que esta estimación deja fuera: su reflectividad, la energía gastada en pasar el hielo a gas y su giro.',
    },
  ],
};

// -----------------------------------------------------------------------------
// The guides, flows, expectations and time bands of the lessons above.
// -----------------------------------------------------------------------------
const CONTENT = {
  'the-scale-of-the-solar-system': {
    topic:
      'The distances of Earth, Jupiter and Neptune from the Sun read from the sandbox at true scale (1.00, 5.20 and 30.07 AU), the light time to Neptune (4.17 hours), and a scale model in which the Earth is a one-centimeter marble (the Sun a meter wide at 117 meters, Neptune at 3.5 kilometers).',
    difficulty: 'Introductory (a product and a ratio)',
    placement:
      'In a survey course at the start of the unit on the Solar System, before any investigation of a single world; it needs no earlier investigation. It supports OpenStax Astronomy 2e chapter 7 (an overview of the planetary system); the citation is the author’s statement of the match, checked against the table of contents.',
    overview:
      'Students read three distances from the sandbox, drawn with the distances true and the planets enlarged, predict and compute the light time to Neptune, predict and compute the positions of the Sun and Neptune in a marble-scale model of the Earth, and say what a one-page diagram gets wrong.',
    priorKnowledge: [
      'What an astronomical unit is',
      'Speed, distance and time: time is distance over speed',
      'Scaling a length by a ratio',
    ],
    keyConcepts: [
      {
        heading: 'Distances are true, sizes are not',
        body: 'The sandbox draws the orbits at 100 units to the AU and the planets larger than life so that they can be seen. At the true scale of the distances a planet would be a speck.',
      },
      {
        heading: 'Light time as a ruler',
        body: 'Light takes 499 seconds to cross an AU: 8.3 minutes to the Earth, 43 minutes to Jupiter, 4.17 hours to Neptune. The delay is a distance the student can feel.',
      },
      {
        heading: 'One scale cannot show size and distance',
        body: 'With the Earth a marble, the Sun is a ball 109 centimeters across, 117 meters away, and Neptune is 3.5 kilometers out. A page cannot keep both.',
      },
    ],
    features: [
      {
        name: 'The sandbox, no instrument',
        text: 'The Solar System scenario at its seed, framed from Mercury to Saturn, with a readout of the three distances; the step asks the student to scroll out to Neptune.',
      },
      {
        name: 'Predictions before answers',
        text: 'The light time to Neptune and the marble-scale distance are predicted before they are worked out, and are never marked wrong in the report.',
      },
      {
        name: 'Light time as a ruler',
        text: 'The light time to Neptune is worked out from the distance read in the sandbox, by an instrument-free field that multiplies by 499 seconds, so a student can check the arithmetic by hand.',
      },
    ],
    misconceptions: [
      {
        claim: 'The planets in a diagram are nearly to scale.',
        response:
          'Their sizes are enormously exaggerated against the distances; the order is right and the spacing roughly so.',
      },
      {
        claim: 'Sunlight reaches every planet at once.',
        response:
          'It takes 8.3 minutes to reach the Earth and 4.17 hours to reach Neptune.',
      },
      {
        claim: 'Neptune is only a little farther from the Sun than Saturn.',
        response:
          'Saturn is 9.6 AU out and Neptune 30.1: the outer planets are spread far more widely than the inner ones, which is why the sandbox frames Mercury to Saturn.',
      },
      {
        claim: 'The Sun is a small coin among the planets, as in a diagram.',
        response:
          'In the marble model it is a ball 109 centimeters across; the diagram shrinks it to fit.',
      },
    ],
    teachingNotes: [
      'The planets are placed on near-circular orbits at the table’s distances (Earth 1.00 AU, Jupiter 5.20, Neptune 30.07), so the readout equals the table to within its precision; it is a model of the Solar System and not an ephemeris.',
      'The 499.005-second light time per AU and the 12,742-kilometer Earth are the values the steps use; the marble model is a worked example, not a measurement.',
      'The sandbox’s planets are drawn larger than their true size at every zoom so that they can be seen; the distances in the readout are the table’s, and the lesson says so in its first step.',
      'The marble model uses the Earth’s diameter, 12,742 kilometers, and the astronomical unit, 149,597,870.7 kilometers; the Sun’s diameter of 1,392,700 kilometers gives 109 marbles across.',
    ],
    discussion: [
      'Where would the nearest star be in the marble model?',
      'What would you have to give up to make a page-wide diagram that is to scale in size and in distance?',
      'Where would the nearest star be in the marble model, and what does that say about a diagram of the Solar System?',
    ],
    extensions: [
      'Mark the planets on a long strip of paper at a scale of your choice and walk it.',
      'Compute the light times of all eight planets and sort them.',
    ],
    modelNotes:
      'js/world/build.js: the planet table (distances at 100 units to the AU); the sandbox is a scenario, with no kernel of its own.',
  },
  'comets-and-the-sun': {
    topic:
      'A comet’s closest and furthest distance read from the sandbox, its bare-body emission temperature at each end (275.5 K at 1 AU, falling as the inverse square root of the distance), and which way the ion tail points, whichever way the comet moves.',
    difficulty: 'Introductory (a square root and a ratio)',
    placement:
      'In a survey course after the investigation of the scale of the Solar System and the unit on orbits, and before a unit on small bodies; it needs no earlier investigation. It supports OpenStax Astronomy 2e chapter 13 (comets); the citation is the author’s statement of the match, checked against the table of contents.',
    overview:
      'Students watch the sandbox’s model comets, predict which way the tail points, read the first comet’s two distances from the Sun, compute its temperature at each end, and say why the tail grows near the Sun. The comets are model comets: the sandbox gives them the names of famous comets and starts each at the distance of its average orbit at 70 percent of circular speed, so the first, named Halley, comes no closer than 5.79 AU and goes out to 17.84 AU. The real Halley (0.586 AU) is a transfer case.',
    priorKnowledge: [
      'An orbit is an ellipse with the Sun at a focus',
      'The inverse-square law for light',
      'A square root',
    ],
    keyConcepts: [
      {
        heading: 'Two ends of an orbit',
        body: 'The closest and furthest distances are the orbit’s two ends; a comet spends most of its time near the far one.',
      },
      {
        heading: 'Temperature falls as 1 over the square root of the distance',
        body: 'The emission temperature of a bare dark body is 275.5 K at 1 AU for an albedo of 0.04; the ratio of the two ends’ temperatures is the square root of the ratio of the distances. It is a bare-body estimate that leaves out the energy spent turning ice to gas.',
      },
      {
        heading: 'The ion tail points away from the Sun',
        body: 'It is swept directly away by the solar wind, so on the way out the comet flies tail first; the dust tail is broader and curves back along the orbit.',
      },
    ],
    features: [
      {
        name: 'The sandbox, no instrument',
        text: 'The Solar System scenario with a few model comets and the asteroids off; a readout names the first comet on a closed orbit, its two distances, its distance now and whether it is moving toward or away from the Sun.',
      },
      {
        name: 'Live checking',
        text: 'The two distance steps are checked against the live orbit of the comet the readout names, within four percent, so any seed gives a graded answer.',
      },
      {
        name: 'Predictions before answers',
        text: 'The direction of the tail is predicted before the sandbox shows it, and the prediction is never marked wrong in the report.',
      },
    ],
    misconceptions: [
      {
        claim: 'A comet’s tail trails behind it, like smoke.',
        response:
          'The ion tail points away from the Sun, so an outbound comet flies tail first; only the dust tail trails along the orbit.',
      },
      {
        claim: 'A comet’s tail is there all the time.',
        response:
          'It grows as the ice warms near the Sun and fades far from it.',
      },
      {
        claim: 'A comet’s orbit is the same as a planet’s, only longer.',
        response:
          'Its eccentricity is large: the model comet here comes within 5.79 AU and goes out to 17.84, a ratio of three, and real ones are far more extreme.',
      },
      {
        claim: 'A comet is hot because it is near the Sun.',
        response:
          'A bare nucleus at 5.79 AU would be at 115 K, far too cold to turn its ice to gas; what matters is how close it comes, not that it is near.',
      },
    ],
    teachingNotes: [
      'The comets carry the names of famous comets (Halley, Hale-Bopp) but are placed by the sandbox at the distance of their average orbit at 70 percent of circular speed, so their orbits are not the real ones; the lesson says so and uses the real Halley (0.586 AU) as a transfer case. The first comet on a closed orbit, named Halley, is the one the steps use: it comes no closer than 5.79 AU and goes out to 17.84 AU, and its bare-body temperature never reaches the 160 K at which ice turns to gas.',
      'The temperature is a bare-body, uniform-redistribution estimate with a Bond albedo of 0.04 (the emission temperature of the atmosphere kernel); a real nucleus loses energy by sublimation and is not uniform.',
      'The temperature of 275.5 K at 1 AU is the emission temperature of the atmosphere kernel for a Bond albedo of 0.04 and uniform redistribution; the day-side maximum is higher by a factor of 2^(1/4), about 1.19.',
      'The sandbox’s ion and dust tails are drawn from the geometry in js/bodyVisuals.js: the ion tail always away from the Sun, the dust tail lagging along the orbit; their length and brightness are a drawing, not a measurement.',
    ],
    discussion: [
      'Why would a comet that has been round the Sun many times grow a smaller tail than a new one?',
      'What would change in the temperature estimate for a comet with a bright surface?',
      'Which of a comet’s two tails would you expect to see curve, and why?',
    ],
    extensions: [
      'Compare the comet’s temperature at its near end with the equilibrium temperatures of the planets in Why Venus Is Hot.',
      'Estimate where in the Solar System a bare dark body reaches 160 K, and compare it with the inner edge of the asteroid belt.',
    ],
    modelNotes:
      'js/kernels/atmospheres/equilibrium.js: the emission temperature, with uniform redistribution and a Bond albedo of 0.04; js/bodyVisuals.js: the ion and dust tail directions.',
  },
  'moons-of-the-giants': {
    topic:
      'The periods of Io, Europa and Ganymede fitted from synthetic frames, their ratios (2.006 and 2.013), the Laplace combination of the three motions with its uncertainty (0.015 ± 0.025 degrees a day), and Callisto outside the chain (2.33).',
    difficulty: 'Introductory (a division, and a combination of three numbers)',
    placement:
      'In a survey course after the unit on the giant planets and their moons, and before When Orbits Lock if both are set; it needs no earlier investigation, though Weighing Jupiter From Its Moons makes the frames familiar. It supports OpenStax Astronomy 2e chapter 12 (section 12.2, the Galilean moons); the citation is the author’s statement of the match, checked against the table of contents.',
    overview:
      'Students read the periods of three moons from the instrument of the Jupiter investigation (1.7682, 3.5480 and 7.1413 days), predict and then divide them (2.006 and 2.013), are asked what a near-miss of 2 can establish, form the combination of the three motions with the uncertainty the fits give, and compare Callisto. The frames are synthetic, made from the real ephemeris, and the investigation says so.',
    priorKnowledge: [
      'A period is the time for one orbit',
      'A rate is an angle divided by a time',
      'What an uncertainty is, at the level of “plus or minus”',
    ],
    keyConcepts: [
      {
        heading: 'A ratio near 2 is where to look',
        body: 'Europa takes 2.006 times as long as Io and Ganymede 2.013 times as long as Europa. Unrelated periods fall this near a whole-number ratio often enough that the ratio cannot decide; a resonance is a relation between angles that holds on average, so the periods need not give an exact ratio.',
      },
      {
        heading: 'The combination that cancels what the moons share',
        body: 'Io’s motion minus three times Europa’s plus twice Ganymede’s is zero for exact step, and the coefficients sum to zero, so an offset common to all three, such as the apparent one Jupiter’s travel adds to the periods seen from Earth, cancels. The measured value is 0.015 degrees a day, with an uncertainty of about 0.025.',
      },
      {
        heading: 'Consistent with zero is not proof',
        body: 'The relation among the motions is a necessary condition. That the angle itself librates and does not circulate takes years of data, and is followed in a model in When Orbits Lock. Callisto, at 2.33 times Ganymede, is outside the chain.',
      },
    ],
    features: [
      {
        name: 'Jupiter instruments (jovian family)',
        text: 'The frames and the period fit of the Jupiter investigation: the four moons at hourly and nightly cadence, a sinusoid fitted to each moon’s distance, and the period with its uncertainty to four decimals.',
      },
      {
        name: 'Four decimals',
        text: 'The combination is sensitive: rounding the three periods to three decimals gives 0.05, not 0.015. The steps say to use four, and the validators accept 0.015 within 0.04.',
      },
      {
        name: 'Predictions before answers',
        text: 'The periods’ pattern and the value of the combination are predicted before they are measured, and are never marked wrong in the report.',
      },
    ],
    misconceptions: [
      {
        claim:
          'A resonance needs the period ratio to be exactly a whole-number ratio.',
        response:
          'It needs a relation between angles to hold on average while the orbits slowly turn, so the measured periods differ a little from the ratio.',
      },
      {
        claim: 'A ratio of 2.006 is a ratio of 2.',
        response:
          'It is within half a percent of 2, which is what a hint looks like; many unrelated pairs are that close. The test is the combination of all three motions, with its uncertainty.',
      },
      {
        claim: 'A value inside its uncertainty proves the relation.',
        response:
          'It is consistent with zero and no more: it cannot tell exact step from a small departure the frames are too coarse to see.',
      },
      {
        claim:
          'The Laplace combination is a measurement of the resonance angle.',
        response:
          'It combines three periods; the angle itself is a different quantity, which librates about 180 degrees in a model that When Orbits Lock runs.',
      },
    ],
    teachingNotes: [
      'The periods are the ones the frames show, from Earth: each is a little shorter than the moon’s true period because Jupiter moves along its own orbit, by the same angle a day for all three, which the combination cancels. The true sidereal periods are 1.7691, 3.5512 and 7.1546 days.',
      'The frames are synthetic, made from the real positions of the satellite ephemeris JUP365 (JPL Horizons), and the pack covers only Jupiter’s moons: the title says “giants” and the last step says what is not covered.',
      'The combination is a necessary relation. The libration of the Laplace angle is shown, in a model, by When Orbits Lock; it should not be claimed from these frames.',
      'Callisto is not part of the Laplace chain: its period is 2.328 times Ganymede’s. The step says so with the same arithmetic, not by assertion.',
    ],
    discussion: [
      'If the combination had come out as 0.4 degrees a day, what would you conclude, and what would you check first?',
      'Why does a shared offset cancel from the combination, and what else could be removed the same way?',
      'What would observing the angle itself for years tell you that three periods cannot?',
    ],
    extensions: [
      'Repeat the combination with the once-a-night frames and see what the alias does to it.',
      'Use the weighing instrument of Weighing Jupiter From Its Moons on the same three moons.',
    ],
    modelNotes:
      'js/satellites/ (SATELLITE_EPHEMERIS.md): the fit of js/satellites/weigh.js on the marks measured from the synthetic frames; the Laplace argument itself is in js/resonance/elements.js.',
  },
};

const FLOW = {
  'the-scale-of-the-solar-system': [
    {
      from: 'a-picture-you-have-seen',
      to: 'three-distances',
      text: 'A picture you have seen, and three true distances.',
    },
    {
      from: 'light-time-predict',
      to: 'light-time',
      text: 'The prediction of the light time to Neptune, and the arithmetic.',
    },
    {
      from: 'earth-as-a-marble',
      to: 'scale-model',
      text: 'The marble-scale model: the Sun at 117 meters and Neptune at 3.5 kilometers.',
    },
    {
      from: 'what-a-diagram-gets-wrong',
      to: 'what-you-worked-out',
      text: 'What a one-page diagram gets wrong, and the close.',
    },
  ],
  'comets-and-the-sun': [
    {
      from: 'a-dirty-snowball',
      to: 'tail-predict',
      text: 'A dirty snowball, and the prediction of the tail’s direction.',
    },
    {
      from: 'watch-the-tails',
      to: 'going-out',
      text: 'Watching the tails, and the outbound comet.',
    },
    {
      from: 'orbit-ends',
      to: 'the-real-halley',
      text: 'The two ends of the orbit, the temperature at each, and the real Halley as a transfer case.',
    },
    {
      from: 'why-a-tail-near-the-sun',
      to: 'what-you-worked-out',
      text: 'Why a tail grows near the Sun, and the close.',
    },
  ],
  'moons-of-the-giants': [
    {
      from: 'a-family-of-moons',
      to: 'three-periods',
      text: 'A family of moons, the prediction of the pattern, and three fitted periods.',
    },
    {
      from: 'the-ratios',
      to: 'a-hint-is-not-proof',
      text: 'The ratios, 2.006 and 2.013, and why a near-miss of 2 is a hint.',
    },
    {
      from: 'the-laplace-combination',
      to: 'consistent-with-zero',
      text: 'The combination of the three motions, its value with its uncertainty, and what consistent with zero means.',
    },
    {
      from: 'callisto-is-not-in-the-chain',
      to: 'what-you-worked-out',
      text: 'Callisto outside the chain, and the close.',
    },
  ],
};

const EXPECTATIONS = {
  'the-scale-of-the-solar-system': {
    'three-distances':
      'Earth 1.00 AU (within 0.05), Jupiter 5.20 (within 0.15) and Neptune 30.07 (within 0.5).',
    'light-time': 'A light time to Neptune of 4.17 hours (within 0.1).',
    'scale-model':
      'The Earth at 117.4 meters (within 0.5) and Neptune at 3.53 kilometers (within 0.1) in the marble model.',
  },
  'comets-and-the-sun': {
    'orbit-ends':
      'The closest and furthest distance of the first comet on a closed orbit, 5.79 and 17.84 AU, each within four percent of the live orbit.',
    'heat-at-the-ends':
      'The same two distances, from which the instrument computes 275.5 K over the square root of each: 115 K and 65 K.',
    'the-real-halley':
      'A closest approach of 0.586 AU (within 0.01) and a temperature of 360 K (within 4).',
  },
  'moons-of-the-giants': {
    'three-periods':
      'Periods of 1.7682 (within 0.001), 3.5480 (within 0.001) and 7.1413 days (within 0.002).',
    'the-ratios': 'Ratios of 2.0065 and 2.0128 (each within 0.004).',
    'the-motions-together':
      'A combination of 0.015 degrees a day (within 0.04), against an uncertainty of about 0.025.',
    'callisto-is-not-in-the-chain':
      'A period of 16.62 days (within 0.02) and a ratio to Ganymede’s of 2.33 (within 0.004).',
  },
};

const BANDS = {
  'the-scale-of-the-solar-system': { core: 'short' },
  'comets-and-the-sun': { core: 'short' },
  'moons-of-the-giants': { core: 'short' },
};

/** The guides, flows, expectations and time bands of the lessons above. */
export const INSTRUCTOR = {
  content: CONTENT,
  flow: FLOW,
  expectations: EXPECTATIONS,
  bands: BANDS,
};

/** The Spanish shadows by lesson id (what instructorLocale.js spreads). */
export const SHADOWS = {
  'the-scale-of-the-solar-system': THE_SCALE_OF_THE_SOLAR_SYSTEM_ES,
  'comets-and-the-sun': COMETS_AND_THE_SUN_ES,
  'moons-of-the-giants': MOONS_OF_THE_GIANTS_ES,
};

/** The lessons, in catalog order (what js/data/investigations.js spreads). */
export default [
  THE_SCALE_OF_THE_SOLAR_SYSTEM,
  MOONS_OF_THE_GIANTS,
  COMETS_AND_THE_SUN,
];
