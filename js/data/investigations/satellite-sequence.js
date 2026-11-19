// =============================================================================
// The Jupiter investigation (Prompt 193)
// -----------------------------------------------------------------------------
// One investigation on the Jupiter-moons instruments (js/jovianWidgets.js), in
// a module of its own: "Weighing Jupiter From Its Moons" (majors). A separate
// file from ../measurement-sequence.js because that one is at its line ceiling
// (D-R10-74); the per-lesson path every loader and tool builds from an id is a
// one-line re-export of the named export here, and the instructor bundle's
// closure grew by this file and its three siblings (D-R10-74).
//
// Content only, no imports: every number a step states is recomputed in
// tests/galileanMoons.test.js from the kernel in js/satellites/ and the pack
// sky/galilean-moons.json. The frames are synthetic and the lesson says so.
// Every step carries a `sid`, an opaque stable id that student progress is
// keyed by: reword a step, move it, translate it, never change its sid.
// =============================================================================

/** A placeholder star on the canvas: a display; the instrument is where the picture is. */
const STAGE = {
  spacing: 150,
  fit: true,
  stars: [{ role: 'star', name: 'A star', teffK: 5772, lumSun: 1 }],
};
const near = (x, target, tolerance) =>
  Number.isFinite(x) && Math.abs(x - target) <= tolerance;

// -----------------------------------------------------------------------------
// The Jupiter investigation (Prompt 193): one more lesson in this file, on the
// Jupiter-moons instruments (js/jovianWidgets.js). Same rules as above: every
// number a step states is recomputed in tests/galileanMoons.test.js from the
// kernel in js/satellites/ and the pack sky/galilean-moons.json.
// -----------------------------------------------------------------------------
const JF = (values = {}, hide = []) => ({ id: 'moon-frames', values, hide });
const JP = (values = {}, hide = []) => ({ id: 'moon-fit', values, hide });

// -----------------------------------------------------------------------------
// 7. Weighing Jupiter From Its Moons
// -----------------------------------------------------------------------------
export const WEIGHING_JUPITER = {
  id: 'weighing-jupiter',
  thumbnail: 'images/investigations/weighing-jupiter.webp',
  title: 'Weighing Jupiter From Its Moons',
  subtitle:
    'Four moons, a cadence that can measure them, and Kepler’s third law',
  duration: '25-40 min',
  level: 'Introductory to upper-level astronomy',
  audience: 'intro',
  textbook: { chapter: 12, section: '12.2' },
  courseLevel: 'majors',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'algebra',
  prerequisites: ['a-binary-stars-orbit'],
  tags: ['observing'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Identify the four Galilean moons night by night, with the ephemeris as the check, and read how far each stands from Jupiter',
    'Find a moon’s period and orbit radius from a sinusoid fitted to its distances over time',
    'Say why a frame once a night cannot give Io’s period, and what sampling can',
    'Turn a period and a radius into Jupiter’s mass with Kepler’s third law, and say what the uncertainty includes',
  ],
  steps: [
    {
      sid: 'a-sequence-of-frames',
      stage: STAGE,
      type: 'read',
      title: 'Jupiter and four points of light',
      body: `Through binoculars Jupiter has four small companions in a line: Io, Europa,
             Ganymede and Callisto, the moons Galileo saw in January 1610. This
             investigation measures them. The frames here are <strong>synthetic</strong>: no
             picture of Jupiter was observed for this investigation. Each was made from the
             moons&rsquo; real positions on the nights of 20 November to 30 December 2025
             (JPL Horizons, satellite ephemeris JUP365), then given Jupiter&rsquo;s disk, the
             moons&rsquo; brightness, atmospheric blur and detector noise. For a real picture
             of the moons, see NASA&rsquo;s Jupiter moons page, science.nasa.gov/jupiter/moons.
             \n\nEast is to the right and Jupiter&rsquo;s equator is horizontal. There are 51
             frames: three long nights of hourly frames, 5 to 7 December, and one frame
             a night, at 08:00 UT, on the other nights. Turn the overlay on to see where
             the ephemeris puts each moon: it is the check on who is who.`,
      tool: JF({ frame: 13, overlay: 1 }),
    },
    {
      sid: 'which-moon-is-farthest',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Who is who?',
      body: `Frame 13 is the night of 4 December. Four moons stand in a line with the
             overlay on, I, E, G and C.`,
      prompt: 'In frame 13, which moon is farthest from Jupiter?',
      options: ['Io', 'Europa', 'Ganymede', 'Callisto'],
      answer: 3,
      misconceptions: [
        {
          id: 'brightest',
          option: 2,
          say: 'Ganymede is the brightest and the biggest, but brightness does not say how far it stands. Read each moon’s distance from Jupiter in the readout.',
        },
      ],
      hints: [
        'The readout lists each moon’s distance east or west of Jupiter.',
      ],
      because:
        'Callisto, 26.3 Jupiter radii east of Jupiter. The overlay and the measured positions agree: the farther out a moon orbits, the farther it can stand from Jupiter, and Callisto is the outermost.',
      tool: JF({ frame: 13, overlay: 1 }),
    },
    {
      sid: 'how-fast-does-ganymede-move',
      stage: STAGE,
      type: 'measure',
      title: 'How far does a moon move in an hour?',
      body: `Frames 14 to 34 are hourly, over three nights. Set the frame to <strong>14</strong>
             (06:00 UT on 5 December) and read how far Ganymede is from Jupiter, in
             Jupiter radii. Then set the frame to <strong>16</strong>, two hours later, and read
             it again. Enter the first distance, and how far it moved in the two hours.`,
      fields: [
        {
          id: 'd14',
          label: 'Ganymede’s distance from Jupiter in frame 14',
          unit: 'RJup',
          want: '9.7',
        },
        {
          id: 'move',
          label: 'How far it moved between frame 14 and frame 16',
          unit: 'RJup',
          want: '0.9',
        },
      ],
      validate: v => {
        if (![v.d14, v.move].every(Number.isFinite)) return null;
        if (near(v.d14, 9.66, 0.25) && near(v.move, 0.89, 0.2)) {
          return {
            level: 'ok',
            message:
              'About 9.7 Jupiter radii west of Jupiter, and 0.9 radii closer after two hours, about 0.45 an hour. A moon that moves this far in an hour is changing visibly between the nights, which matters in a moment.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the frame to 14, read the distance in the Ganymede row, then set the frame to 16 and subtract.',
        };
      },
      tool: JF({ frame: 14, overlay: 1 }),
    },
    {
      sid: 'io-period-and-radius',
      stage: STAGE,
      type: 'measure',
      title: 'Io’s period and its distance',
      body: `Every frame gives one measured distance for each moon. The instrument has
             collected them: Io&rsquo;s distance from Jupiter against time, with the
             sinusoid that fits best. Leave the sampling at <strong>1</strong>, the designed
             sequence, and read Io&rsquo;s <strong>period</strong> in days and its
             <strong>amplitude</strong> in Jupiter radii. The amplitude is Io&rsquo;s greatest
             distance from Jupiter, which for a circular orbit seen edge on is the radius
             of the orbit.`,
      fields: [
        { id: 'period', label: 'Io’s period', unit: 'd', want: '1.77' },
        {
          id: 'radius',
          label: 'Io’s orbit radius',
          unit: 'RJup',
          want: '5.9',
        },
      ],
      validate: v => {
        if (![v.period, v.radius].every(Number.isFinite)) return null;
        if (near(v.period, 1.768, 0.01) && near(v.radius, 5.89, 0.1)) {
          return {
            level: 'ok',
            message:
              'Io goes round in 1.768 days, at 5.89 Jupiter radii, about 421,000 km from Jupiter’s center. The period is the one the Earth sees, and it is the next steps’ question how it differs from the true one.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose Io (1) with the designed sampling (1), then read “Period” and “Amplitude”.',
        };
      },
      tool: JP({ moon: 1, cadence: 1 }),
    },
    {
      sid: 'once-a-night',
      stage: STAGE,
      type: 'predict',
      reveal: 'try-once-a-night',
      title: 'What if you had one frame a night?',
      body: `Most observers watching Jupiter take one frame a night, at the same time.
             Io goes round in 1.77 days. Take only the 30 once-a-night frames and ask for
             Io&rsquo;s period, searching the periods an observer would, longer than two
             days.`,
      prompt:
        'The period found for Io from once-a-night frames would be&hellip;',
      options: [
        'about 1.77 days, the true one',
        'about 0.9 days, half the true one',
        'about 2.3 days, a period that is not Io’s',
        'no period at all: the points would scatter',
      ],
      answer: 2,
      hints: [
        'A frame a day cannot follow a moon that goes round in under two days. What would it see instead?',
      ],
      because:
        'About 2.3 days. A frame every day sees the moon at 0.565 turns a day as if it went round at 1 − 0.565 = 0.435 turns a day, a period of 2.30 days, and nothing in the frames says which is right. The next step shows it.',
      tool: JP({ moon: 1, cadence: 0 }),
    },
    {
      sid: 'try-once-a-night',
      stage: STAGE,
      type: 'measure',
      title: 'Io from one frame a night',
      body: `Set the sampling to <strong>0</strong>: once a night, with the periods searched
             longer than 2 days. Read Io&rsquo;s period.`,
      fields: [
        {
          id: 'period',
          label: 'Io’s period from once-a-night frames',
          unit: 'd',
          want: '2.30',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.period)) return null;
        if (near(v.period, 2.3017, 0.03)) {
          return {
            level: 'ok',
            message:
              'A clean 2.30-day sinusoid, 30 percent longer than Io’s real 1.77 days, with a good fit: the alias of Io’s period. Europa, Ganymede and Callisto have periods longer than two days, so the same sampling gets them right. Only the hourly frames, which see Io move within a night, tell the alias from the moon.',
          };
        }
        return {
          level: 'error',
          message: 'Choose Io (1), set the sampling to 0, then read “Period”.',
        };
      },
      tool: JP({ moon: 1, cadence: 0 }),
    },
    {
      sid: 'what-you-worked-out',
      stage: STAGE,
      type: 'read',
      title: 'What you worked out',
      body: `You identified the moons with the ephemeris as the check, watched Ganymede
             move 0.9 Jupiter radii in two hours, and fitted Io: 1.77 days at 5.9
             Jupiter radii. And you saw why the cadence matters: sampled once a night,
             Io gives a clean answer, 2.3 days, which is wrong. The hourly nights are what
             make Io measurable. The frames were synthetic, made from the moons&rsquo; real
             positions; a real night would add clouds, drift and bad pixels. The deeper
             steps weigh Jupiter with these periods and radii.`,
      tool: JP({ moon: 1, cadence: 1 }),
    },
  ],
};

// -----------------------------------------------------------------------------
// The ring and tide investigations (Prompt 204 part 2): three more lessons in
// this file, on the tide instruments (js/tidesWidgets.js) and the two scenarios
// declared in js/world/build.js ('Roche Pass', 'Ring Gap'). Same rules as above:
// every number a step states is recomputed in tests/tidesLessons.test.js from the
// kernel in js/kernels/tides/ and the committed record of the two scenarios
// (tests/fixtures/tides/display-record.json). The ring scenario's resonance and
// lane legs did not pass their committed bounds, and the lesson says what the
// run does show and no more.
// -----------------------------------------------------------------------------
const RO = (values = {}, hide = []) => ({ id: 'tides-roche', values, hide });
const RS = (values = {}, hide = []) => ({
  id: 'tides-resonance',
  values,
  hide,
});
// `start` is where the instrument opens when the check is somewhere else.
const TM = (values = {}, hide = [], start) => ({
  id: 'tides-moon',
  values,
  hide,
  ...(start && { start }),
});
const TH = (values = {}, hide = [], start) => ({
  id: 'tides-heating',
  values,
  hide,
  ...(start && { start }),
});

// -----------------------------------------------------------------------------
// 8. Why Rings?
// -----------------------------------------------------------------------------
export const WHY_RINGS = {
  id: 'why-rings',
  thumbnail: 'images/investigations/why-rings.webp',
  title: 'Why Rings?',
  subtitle:
    'Where a moon falls apart, and where a moon’s pull leaves a mark in a ring',
  duration: '15-25 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 12, section: '12.5' },
  courseLevel: 'survey',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'algebra',
  prerequisites: [],
  tags: ['solar-system'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Say what the Roche limit is, and why there are two of them for one pair of bodies',
    'Find the rigid and the fluid Roche limit of a pair from their densities, and say whether a given orbit lies inside, between or outside them',
    'Find where a moon’s resonance falls in a ring, and compare it with a gap that is observed',
    'Say what the scenarios show and what they leave out',
  ],
  steps: [
    {
      sid: 'rings-and-limits',
      stage: STAGE,
      type: 'read',
      title: 'Why rings, and why so close?',
      body: `Every giant planet has rings, and the rings lie close to the planet, where
             the planet&rsquo;s pull on a body changes most from one side of the body to the
             other. That difference is the <strong>tide</strong>. A body held together only by
             its own gravity comes apart where the tide across it beats that gravity. This
             investigation finds where that is, and what else a ring shows.`,
      tool: RO({ system: 1 }),
    },
    {
      sid: 'sl9-limits',
      stage: STAGE,
      type: 'measure',
      title: 'Shoemaker-Levy 9 at Jupiter',
      body: `In July 1992 comet Shoemaker-Levy 9 passed 1.3 Jupiter radii from the
             center of Jupiter and broke into pieces. With the pair set to
             <strong>SL9, Jupiter</strong> (Shoemaker-Levy 9 and Jupiter), read the <strong>rigid limit</strong>
             and the <strong>fluid limit</strong>, in Jupiter radii (R).`,
      fields: [
        {
          id: 'rigid',
          label: 'Rigid limit (planet radii)',
          unit: '',
          want: '1.64',
        },
        {
          id: 'fluid',
          label: 'Fluid limit (planet radii)',
          unit: '',
          want: '3.18',
        },
      ],
      validate: v => {
        if (![v.rigid, v.fluid].every(Number.isFinite)) return null;
        if (near(v.rigid, 1.64, 0.03) && near(v.fluid, 3.18, 0.04)) {
          return {
            level: 'ok',
            message:
              'The rigid limit is 1.64 Jupiter radii and the fluid limit 3.18. The comet passed at 1.3, inside both: nothing held together by gravity alone survives there.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose the pair “SL9, Jupiter”, leave the distance on “the real one”, then read “Rigid limit” and “Fluid limit” in planet radii (R).',
        };
      },
      tool: RO({ system: 1, own: 1 }),
    },
    {
      sid: 'phobos-predict',
      stage: STAGE,
      type: 'predict',
      reveal: 'phobos-where',
      title: 'Phobos and the limits',
      body: `Phobos, the larger moon of Mars, orbits 9,376 km from the center of Mars.
             Mars is 3,389.5 km in radius and Phobos is a loose rock, about half as dense
             as Mars.`,
      prompt: 'Phobos’s orbit lies&hellip;',
      options: [
        'inside the rigid limit, where it should have been torn apart',
        'between the rigid and the fluid limit',
        'outside both limits, where nothing is stretched at all',
      ],
      answer: 1,
      hints: [
        'Compute both limits for the two densities; the instrument below will.',
      ],
      because:
        'The two limits for Mars’s and Phobos’s densities are 5,466 km (rigid) and 10,585 km (fluid) from the center of Mars; Phobos at 9,376 km lies between them, so only a body held together by gravity alone would be pulled apart.',
      tool: RO({ system: 0 }),
    },
    {
      sid: 'phobos-where',
      stage: STAGE,
      type: 'measure',
      title: 'Where Phobos’s orbit lies',
      body: `Set the pair to <strong>Phobos, Mars</strong> and read the two limits in
             kilometers from the center of Mars.`,
      fields: [
        { id: 'rigid', label: 'Rigid limit', unit: 'km', want: '5466' },
        { id: 'fluid', label: 'Fluid limit', unit: 'km', want: '10585' },
      ],
      validate: v => {
        if (![v.rigid, v.fluid].every(Number.isFinite)) return null;
        if (near(v.rigid, 5466, 60) && near(v.fluid, 10585, 100)) {
          return {
            level: 'ok',
            message:
              '5,466 km and 10,585 km. Phobos at 9,376 km is between them: a fluid body there would be pulled apart, and a body with any strength need not be. Phobos survives, but only just outside the fluid limit’s reach, and its orbit is slowly shrinking.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose the pair “Phobos, Mars” with the distance on “the real one”, then read “Rigid limit” and “Fluid limit” in kilometers.',
        };
      },
      tool: RO({ system: 0, own: 1 }),
    },
    {
      sid: 'a-pass-inside-the-limit',
      type: 'read',
      motion: true,
      title: 'A clump on a pass inside the limit',
      setup: { scenario: 'Roche Pass', seed: 'roche-pass', paused: false },
      body: `This is a scale model with Newtonian gravity and nothing else: a planet and a
             loose clump of 60 particles on an orbit that passes 1.3 planet radii from the
             planet&rsquo;s center, inside both limits for the clump&rsquo;s density, as
             Shoemaker-Levy 9 did. Watch the pass. The clump is drawn out into a stream,
             about sixteen times longer than it was. The clump is a softened swarm, not a
             rock: it is a picture of the tide, not of the comet&rsquo;s fragments.`,
      tip: 'Let it run through the closest point. The line the particles leave is the stream.',
    },
    {
      sid: 'where-the-gap-falls',
      stage: STAGE,
      type: 'measure',
      title: 'Where Mimas’s 2:1 resonance falls',
      body: `The Cassini Division is a gap in Saturn&rsquo;s rings. A ring particle that goes
             round twice for every orbit of Mimas is pulled by Mimas at the same point of each
             orbit. With the moon set to <strong>Mimas</strong>, p = 2 and q = 1, read the
             <strong>radius of the 2:1 resonance</strong> in kilometers and how far it is
             from the nearest feature of the rings, in percent.`,
      fields: [
        {
          id: 'radius',
          label: 'Radius of the 2:1 resonance',
          unit: 'km',
          want: '116883',
        },
        {
          id: 'offset',
          label: 'From the nearest feature',
          unit: '%',
          want: '0.59',
        },
      ],
      validate: v => {
        if (![v.radius, v.offset].every(Number.isFinite)) return null;
        if (
          near(v.radius, 116883, 400) &&
          near(Math.abs(v.offset), 0.59, 0.1)
        ) {
          return {
            level: 'ok',
            message:
              '116,883 km, 0.59 percent inside the outer edge of the B ring, where the Cassini Division begins. A point-mass orbit does not know Saturn’s oblateness, which shifts the true radius by about as much, so the agreement is as good as the model can give.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose Mimas, p = 2 and q = 1, then read “Radius of the 2:1 resonance” and “From that feature”; the offset is a percentage, either sign.',
        };
      },
      tool: RS({ moon: 0, p: 2, q: 1 }),
    },
    {
      sid: 'a-ring-with-a-resonance',
      type: 'read',
      title: 'What the ring scenario shows, and does not',
      setup: { scenario: 'Ring Gap', seed: 'ring-gap', paused: false },
      body: `A Saturn-mass planet, 200 ring particles, a resonant moon whose 2:1 resonance
             falls in the ring, and a shepherd moon inside it. Both moons are far heavier than
             Mimas and Pan, so twenty orbits can show something. The honest result of the run
             recorded for this investigation is modest: the ring thins at the resonance (19 particles
             where the neighbouring stretches hold 24) and the ring with no moon stays as it
             was, but it does not open a gap, and the shepherd leaves no clear lane. The
             particles in this model never collide, and a real gap is made by a resonance
             acting on a ring that does.`,
      tip: 'Compare the ring with and without the moons by running it, then reload it.',
    },
    {
      sid: 'what-rings-tell',
      stage: STAGE,
      type: 'read',
      title: 'What you worked out',
      body: `Inside the Roche limit a body held only by gravity comes apart, and the limit
             is twice as far for a body that can deform as for one that cannot. A moon&rsquo;s
             resonance falls at a radius set by its distance alone, and the 2:1 resonance of
             Mimas lies within 0.6 percent of the edge of the Cassini Division. What opens the
             gap, and how empty it is, depends on the moon&rsquo;s mass and on how the ring
             dissipates, which the instruments here leave out.`,
      tool: RS({ moon: 0, p: 2, q: 1 }),
    },
  ],
};

// -----------------------------------------------------------------------------
// 9. Tides That Move the Moon
// -----------------------------------------------------------------------------
export const TIDES_THAT_MOVE_THE_MOON = {
  id: 'tides-that-move-the-moon',
  thumbnail: 'images/investigations/tides-that-move-the-moon.webp',
  title: 'Tides That Move the Moon',
  question:
    'Why is the Moon moving away from the Earth, and does the same tide explain the Moon’s whole past?',
  medium: { kind: 'instrument', name: 'the tide model' },
  subtitle:
    'The Moon’s recession, the lengthening day, and the model that fails when run backward',
  duration: '20-30 min',
  level: 'Majors and upper-level astronomy',
  audience: 'intro',
  textbook: { chapter: 4, section: '4.6' },
  courseLevel: 'majors',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'algebra',
  prerequisites: [],
  tags: ['solar-system'],
  lock: { placement: true, inspector: true },
  // The science is the instrument's closed-form table, so the canvas behind it says nothing.
  canvas: 'quiet',
  retired: {
    'the-moons-recession': {
      to: 'match-the-recession',
      release: '3.1',
      was: {
        en: 'Set k2 to 0.30, Q to 12 and the time to 0, and read the Moon’s recession and the day’s lengthening.',
        es: 'Poner k2 en 0,30, Q en 12 y el tiempo en 0, y leer el alejamiento de la Luna y el alargamiento del día.',
      },
    },
  },
  objectives: [
    'Say why the Moon recedes and the day lengthens, as one process',
    'Find the Q that makes a tide model match the Moon’s measured recession, and compare the day it gives',
    'Run the model forward and backward and find where it stops',
    'Say what the model assumes, and what its failure backward says about it',
  ],
  steps: [
    {
      sid: 'the-bulge-ahead',
      type: 'read',
      title: 'A bulge that runs ahead',
      body: `Why is the Moon moving away from the Earth, and does the same tide explain the
             Moon&rsquo;s whole past? You will set the one free number of the tide model so that
             it matches the Moon&rsquo;s measured recession, then run it a billion years forward
             and back to see where it holds.
             \n\nThe Moon raises a bulge on the Earth, and because the Earth spins faster than
             the Moon orbits, the bulge is carried a little ahead of the line to the Moon. It pulls
             the Moon forward, so the Moon gains energy and recedes, and the Moon pulls it back, so
             the Earth&rsquo;s spin slows. The table below is the model&rsquo;s closed form, not a
             simulation.`,
      tool: TM({ k2: 0.3, Q: 40, gyr: 0 }),
    },
    {
      sid: 'match-the-recession',
      type: 'measure',
      title: 'Choose the Q that fits the Moon',
      body: `Lunar laser ranging, light bounced off mirrors the Apollo crews left on the Moon,
             measures the Moon receding at 3.82 &plusmn; 0.07 cm per year. The model has one
             number you are free to choose, <em>Q</em>, how little energy the tide loses.
             Leave k2 at 0.30 and the time at 0, then change <em>Q</em> until the row
             <strong>Moon&rsquo;s recession now</strong> is as close as you can get it to that
             measurement. Write down
             the <em>Q</em> you chose, and take the <strong>day&rsquo;s lengthening</strong> that the
             same <em>Q</em> gives, in milliseconds per century.`,
      fields: [
        {
          id: 'q',
          label: 'The Q that matches the measured recession',
          unit: '',
          want: '12',
        },
        {
          id: 'day',
          label: 'The day’s lengthening (ms per century)',
          unit: '',
          want: '2.05',
          source: { tool: 'day' },
        },
      ],
      validate: v => {
        if (![v.q, v.day].every(Number.isFinite)) return null;
        if (v.q > 12.5) {
          return {
            level: 'error',
            message:
              'That Q gives a recession slower than laser ranging measures. A smaller Q is a tide that loses more energy: try lower, and read “Moon’s recession now”.',
          };
        }
        if (v.q < 11.5) {
          return {
            level: 'error',
            message:
              'That Q gives a recession faster than laser ranging measures. A larger Q is a tide that loses less energy: try higher, and read “Moon’s recession now”.',
          };
        }
        if (near(v.day, 2.05, 0.06)) {
          return {
            level: 'ok',
            message:
              'Q = 12 comes as close to the measured recession as the slider allows, and the same Q gives a day that lengthens by about 2 ms per century, close to the record of ancient eclipses. Q was chosen to fit the present: it is a fitted parameter, not a measurement of the oceans.',
          };
        }
        return {
          level: 'error',
          message:
            'Take the day’s lengthening from the row “The day’s lengthening now”, with the Q you found and the time at 0.',
        };
      },
      tool: TM({ k2: 0.3, Q: 12, gyr: 0 }, [], { k2: 0.3, Q: 40, gyr: 0 }),
    },
    {
      sid: 'forward-predict',
      type: 'predict',
      reveal: 'forward-one-billion',
      title: 'A billion years on',
      body: `The Moon is about 60 Earth radii away today. Use the model you have just matched to
             the measured recession.`,
      prompt: 'In a billion years the Moon will be about&hellip;',
      options: [
        '60 Earth radii: it barely moves',
        '65 Earth radii',
        '80 Earth radii',
        '100 Earth radii',
      ],
      answer: 1,
      hints: [
        'Start from the rate you matched, and ask what that rate depends on besides Q.',
      ],
      because:
        'The model puts the Moon at 414.6 thousand km in a billion years, about 65 Earth radii: the rate of 3.75 cm per year slows as the Moon recedes, so it gains less than the 37,500 km a constant rate would give.',
    },
    {
      sid: 'forward-one-billion',
      type: 'measure',
      title: 'One billion years ahead',
      body: `Keep k2 at 0.30 and <em>Q</em> at the value you found. Set the time to
             <strong>1</strong> billion years and read the Moon&rsquo;s distance in thousand km
             and the length of the day in hours.`,
      fields: [
        {
          id: 'a',
          label: 'The Moon’s distance (thousand km)',
          unit: '',
          want: '414.6',
        },
        { id: 'day', label: 'The day', unit: 'h', want: '29.5' },
      ],
      validate: v => {
        if (![v.a, v.day].every(Number.isFinite)) return null;
        if (near(v.a, 414.6, 1.5) && near(v.day, 29.5, 0.4)) {
          return {
            level: 'ok',
            message:
              '414.6 thousand km, 65 Earth radii, and a day of 29.5 hours. The Moon is a tenth farther and the day a fifth longer in a billion years.',
          };
        }
        return {
          level: 'error',
          message:
            'Keep k2 = 0.30 and the Q you found, set the time to 1, and read the distance and the day.',
        };
      },
      tool: TM({ k2: 0.3, Q: 12, gyr: 1 }, [], { k2: 0.3, Q: 12, gyr: 0 }),
    },
    {
      sid: 'the-model-run-backward',
      type: 'measure',
      title: 'Run it backward',
      body: `Run the same model backward. Set the time to <strong>&minus;2</strong> billion
             years. The model cannot go that far back. Read in what year, counted back from now
             in billion years, the orbit would have reached the Earth&rsquo;s surface.`,
      fields: [
        {
          id: 'gyr',
          label: 'Contact, billion years ago',
          unit: 'Gyr',
          want: '1.58',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.gyr)) return null;
        if (near(v.gyr, 1.58, 0.03)) {
          return {
            level: 'ok',
            message:
              '1.58 billion years ago. The Moon is older than that by almost three billion years, so a Q that stays 12 for the whole history cannot be right: the model, run backward, contradicts the record. That is what the Q was always a parameter for, not a measurement.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the time to −2 and read “The model stops”: it gives how many billion years away.',
        };
      },
      tool: TM({ k2: 0.3, Q: 12, gyr: -2 }, [], { k2: 0.3, Q: 12, gyr: 0 }),
    },
    {
      sid: 'what-the-model-leaves-out',
      type: 'read',
      title: 'What you worked out',
      body: `Run backward, the model that matches today brings the Moon into contact with the
             Earth well within the age of the Solar System, and that did not happen. So
             <em>Q</em> was not constant: in a real history it changed with the oceans and the
             continents, which set how much energy the tide loses. A [[parameter|parameter]]
             that fits the present is not a law.`,
      tool: TM({ k2: 0.3, Q: 12, gyr: -2 }, [], { k2: 0.3, Q: 12, gyr: 0 }),
    },
  ],
};

// -----------------------------------------------------------------------------
// 10. Io's Fire
// -----------------------------------------------------------------------------
// The picture is Jupiter and its large moons, held still; Io is named. The heating
// check below is the instrument's formula at Io's eccentricity: watts per unit of k2/Q.
const IO_BIND = {
  io: { name: 'Io' },
  europa: { name: 'Europa' },
  ganymede: { name: 'Ganymede' },
  callisto: { name: 'Callisto' },
};
const IO_SETUP = {
  scenario: 'Galilean Resonance',
  seed: 'resonance-lab',
  paused: true,
};
const IO_HEAT = 6.2226e15;
const IO_OBSERVED = [6e13, 1.6e14];
export const IOS_FIRE = {
  id: 'ios-fire',
  thumbnail: 'images/scenarios/galilean-resonance.webp',
  title: 'Io’s Fire',
  question:
    'Where does Io’s heat come from, and what does it tell us about Io’s interior?',
  medium: { kind: 'instrument', name: 'the tidal heating instrument' },
  subtitle:
    'Tidal heating as energy per orbit, bounded by what nobody knows about Io’s interior',
  duration: '15-25 min',
  level: 'Majors and upper-level astronomy',
  audience: 'intro',
  textbook: { chapter: 12, section: '12.2' },
  courseLevel: 'majors',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'algebra',
  prerequisites: ['tides-that-move-the-moon'],
  tags: ['solar-system'],
  lock: { placement: true, inspector: true },
  canvas: 'portrait',
  picture: 'Jupiter and its four large moons, Io the innermost',
  retired: {
    'heating-at-the-maximum': {
      to: 'heating-at-two-eccentricities',
      release: '3.1',
      was: {
        en: 'Set k2 to 1.5, Q to 100 and the eccentricity to 0.0041, and read the heating and the energy in one orbit.',
        es: 'Poner k2 en 1,5, Q en 100 y la excentricidad en 0,0041, y leer el calentamiento y la energía en una órbita.',
      },
    },
    'double-the-eccentricity': {
      to: 'heating-at-two-eccentricities',
      release: '3.1',
      was: {
        en: 'Set the eccentricity to 0.0082 and read the heating.',
        es: 'Poner la excentricidad en 0,0082 y leer el calentamiento.',
      },
    },
    'the-bound': {
      to: 'find-the-interiors',
      release: '3.1',
      was: {
        en: 'Set the eccentricity back to 0.0041 and read the k2/Q the middle of the observed heat flow needs.',
        es: 'Volver a poner la excentricidad en 0,0041 y leer el k2/Q que necesita el valor medio del flujo de calor observado.',
      },
    },
  },
  objectives: [
    'Say where Io’s heat comes from and why it needs an orbit that is not quite circular',
    'Predict, then measure, how the heating changes when only the eccentricity does',
    'Find two interiors, a k2 and a Q, that give the heat Io radiates',
    'Say why the answer is a bound and not a prediction',
  ],
  steps: [
    {
      sid: 'a-moon-that-melts',
      bind: IO_BIND,
      setup: IO_SETUP,
      type: 'read',
      title: 'The most volcanic body we know',
      body: `Where does Io&rsquo;s heat come from, and what does it tell us about Io&rsquo;s
             interior? You will predict how the heat depends on Io&rsquo;s orbit, measure it on
             the tidal heating instrument, then search for interiors that give the heat Io gives
             off.
             \n\nIo is the most volcanically active body in the Solar System, and the Sun does not
             heat it. Jupiter raises a tide on Io, and because Io&rsquo;s orbit is not quite
             circular the tide rises and falls once an orbit. The picture behind this activity is
             Jupiter with Io, the innermost of its four large moons, held still.`,
    },
    {
      sid: 'double-predict',
      bind: IO_BIND,
      type: 'predict',
      reveal: 'what-doubling-did',
      title: 'A more eccentric orbit',
      body: `Io&rsquo;s orbit departs from a circle by an eccentricity of 0.0041, a small amount.
             Picture the same moon, with the same interior, on an orbit that departs twice as
             far.`,
      prompt: 'If Io’s eccentricity were doubled, the heating would be&hellip;',
      options: [
        'twice as large',
        'four times as large',
        'eight times as large',
        'unchanged',
      ],
      answer: 1,
      hints: [
        'Think about what the eccentricity changes in Io’s tide before you choose.',
      ],
      because:
        'The heating goes as <em>e</em> squared, so doubling the eccentricity gives four times the heat: the bulge’s rise and fall is proportional to <em>e</em>, and so is the friction in it, whatever k2 and <em>Q</em> are.',
    },
    {
      sid: 'heating-at-two-eccentricities',
      bind: IO_BIND,
      type: 'measure',
      title: 'Heating at Io’s eccentricity, and at twice it',
      body: `Change one thing and hold the rest: leave k2 and <em>Q</em> where the instrument
             opens, and move only the <strong>[[eccentricity|Eccentricity]]</strong>. Set it to Io&rsquo;s value,
             0.0041, and take the <strong>Heating</strong>. Then set it to twice that value and
             take the Heating again. Each reading is in units of 10<sup>13</sup> W.`,
      fields: [
        {
          id: 'p1',
          label: 'Heating at Io’s eccentricity (10¹³ W)',
          unit: '',
          want: '1.99',
          source: { tool: 'power' },
        },
        {
          id: 'p2',
          label: 'Heating at twice that eccentricity (10¹³ W)',
          unit: '',
          want: '7.96',
          source: { tool: 'power' },
        },
      ],
      validate: v => {
        if (![v.p1, v.p2].every(Number.isFinite)) return null;
        if (near(v.p1, 1.99, 0.05) && near(v.p2, 7.96, 0.15)) {
          return {
            level: 'ok',
            message:
              'Two readings with k2 and Q held fixed and only the eccentricity changed. Compare them with the prediction you made: the next screen sets them side by side.',
          };
        }
        return {
          level: 'error',
          message:
            'Leave k2 and Q as the instrument opens, change only the eccentricity, and take the Heating at 0.0041 and then at twice that.',
        };
      },
      tool: TH({ k2: 0.8, Q: 250, e: 0.0041 }, [], {
        k2: 0.8,
        Q: 250,
        e: 0.001,
      }),
    },
    {
      sid: 'what-doubling-did',
      bind: IO_BIND,
      type: 'read',
      title: 'Your prediction and your readings',
      body: `The heating goes as the square of the eccentricity: the bulge&rsquo;s rise and fall
             is proportional to <em>e</em> and the friction in it is proportional to that again,
             so doubling <em>e</em> multiplies the heat by four, whatever k2 and <em>Q</em> are.
             Your prediction and your two readings are below.`,
      evidence: [
        { step: 'heating-at-two-eccentricities', field: 'p1' },
        { step: 'heating-at-two-eccentricities', field: 'p2' },
      ],
      compare:
        'Divide your second reading by your first: that is the factor the heating changed by when the eccentricity doubled.',
    },
    {
      sid: 'find-the-interiors',
      bind: IO_BIND,
      type: 'measure',
      title: 'Interiors that match the heat',
      body: `Io radiates about 1 &times; 10<sup>14</sup> W, observed to lie between the two lines
             drawn at 0.6 and 1.6 &times; 10<sup>14</sup> W. Leave the eccentricity at
             Io&rsquo;s 0.0041 and search with k2 and <em>Q</em> for a pair that brings the row
             <strong>Heating</strong> inside that observed range, and write it down. Then find a
             second pair that also does, with a k2 that differs by at least 0.2.`,
      fields: [
        { id: 'k2a', label: 'First pair: k2', unit: '', want: '0.5' },
        { id: 'qa', label: 'First pair: Q', unit: '', want: '30' },
        { id: 'k2b', label: 'Second pair: k2', unit: '', want: '1.0' },
        { id: 'qb', label: 'Second pair: Q', unit: '', want: '60' },
      ],
      validate: v => {
        const pairs = [
          [v.k2a, v.qa],
          [v.k2b, v.qb],
        ];
        if (!pairs.flat().every(Number.isFinite)) return null;
        if (pairs.some(([k, q]) => k < 0.1 || k > 1.5 || q < 5 || q > 500)) {
          return {
            level: 'error',
            message:
              'Both pairs must be ones the sliders can set: k2 from 0.1 to 1.5 and Q from 5 to 500.',
          };
        }
        const heat = pairs.map(([k, q]) => (IO_HEAT * k) / q);
        if (heat.some(h => h > IO_OBSERVED[1])) {
          return {
            level: 'error',
            message:
              'Too much: one of your pairs gives more heat than Io is observed to radiate. Read the row Heating against the observed range, and change k2 or Q to bring it inside.',
          };
        }
        if (heat.some(h => h < IO_OBSERVED[0])) {
          return {
            level: 'error',
            message:
              'Too little: one of your pairs gives less heat than Io is observed to radiate. Read the row Heating against the observed range, and change k2 or Q to bring it inside.',
          };
        }
        if (Math.abs(v.k2a - v.k2b) < 0.2 - 1e-9) {
          return {
            level: 'error',
            message:
              'Your two pairs are nearly the same interior. Make k2 differ by at least 0.2 and find the Q that goes with it.',
          };
        }
        return {
          level: 'ok',
          message:
            'Two different interiors, with different k2 and Q, both give the observed heat. The heating depends on k2 divided by Q, so the observed heat fixes that ratio and not the two numbers: it cannot tell these interiors apart.',
        };
      },
      tool: TH({ k2: 0.8, Q: 250, e: 0.0041 }),
    },
    {
      sid: 'two-interiors-one-heat',
      bind: IO_BIND,
      type: 'question',
      kind: 'short',
      rubric:
        'Full credit for saying that the heating depends on k2 and Q only through their ratio, so many different pairs give a heat inside the observed range; that the observed heat therefore fixes that ratio only to a range and does not identify the interior; and that a formula whose two unknowns can be chosen to match the observation gives a bound, a result that is consistent with the heat, not a prediction of it, until k2 or Q is known independently. Partial credit for one or two.',
      title: 'Two interiors, one observation',
      body: `You found two interiors, with different k2 and <em>Q</em>, whose heating lies inside the observed range.`,
      prompt:
        'In two or three sentences: why can two different interiors both give a heat inside the observed range, and what does that mean for calling the formula’s answer a prediction?',
      hints: [
        'Compare the two pairs you wrote down: what differs between them, and what do both satisfy?',
      ],
    },
    {
      sid: 'what-heat-is',
      bind: IO_BIND,
      type: 'read',
      title: 'What you worked out',
      body: `Io&rsquo;s orbit would have become circular long ago, and the heating would have
             stopped, if Europa and Ganymede did not keep pulling on it in a
             [[resonance|resonance]]. The heat fixes only k2 divided by <em>Q</em>, so every
             interior with the same ratio fits it: the formula gives a bound, not a prediction.
             What it leaves out is the interior itself, where a partly molten layer changes how
             Io flexes. A measurement that depends on k2 alone would separate the
             possibilities, and the deeper steps ask which.`,
    },
  ],
};

// -----------------------------------------------------------------------------
// The small-body investigations (Prompt 198 part 3): two more lessons in this
// file, on the small-body instruments (js/smallBodiesWidgets.js). Same rules as
// above: every number a step states is recomputed in
// tests/smallBodiesLessons.test.js from the kernel in js/kernels/smallbodies/
// and the pack js/data/smallbodies/numbered-h13.json. The belt is a real catalog
// of what was found; the light curve is synthetic and says so (tier e2, a
// measured curve, was not run).
// -----------------------------------------------------------------------------
const BG = (values = {}, hide = []) => ({
  id: 'belt-gaps',
  values,
  hide,
  ...(hide.length ? { presets: false } : {}),
});
const SC = (values = {}, hide = []) => ({
  id: 'spin-curve',
  values,
  hide,
  ...(hide.length ? { presets: false } : {}),
});
const BELT_ONLY_GAP = ['hlimit', 'width', 'degree', 'classes', 'survey'];
const SPIN_ONLY_TARGET = ['hours', 'noise', 'cadence', 'truth'];

// -----------------------------------------------------------------------------
// 8. The Gaps in the Belt
// -----------------------------------------------------------------------------
export const THE_GAPS_IN_THE_BELT = {
  id: 'the-gaps-in-the-belt',
  thumbnail: 'images/investigations/the-gaps-in-the-belt.webp',
  title: 'The Gaps in the Belt',
  subtitle:
    'A histogram of 8,886 numbered asteroids, a smooth baseline fitted outside the resonance windows, and how deep each gap is, with an interval',
  duration: '12-16 min',
  level: 'Introductory to upper-level astronomy',
  audience: 'intro',
  textbook: { chapter: 13, section: null },
  courseLevel: 'survey',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'algebra',
  prerequisites: [],
  tags: ['solar-system', 'observing'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Say what a histogram of a catalog of numbered asteroids is a count of, and what it is not a count of',
    'Measure how deep a gap is against a smooth baseline fitted outside the resonance windows, with a bootstrap interval',
    'Say why a gap is a depletion rather than an emptiness, and why two gaps have different depths',
    'Say when a window cannot be measured, and that a different window, cut or baseline is a different measurement',
  ],
  steps: [
    {
      sid: 'a-catalog-of-whats-found',
      stage: STAGE,
      type: 'read',
      title: 'A catalog of what was found',
      body: `The <strong>JPL Small-Body Database</strong> lists every minor planet that has been discovered and given a
             number. This investigation uses the 8,886 numbered objects with an absolute magnitude <strong>H below 13</strong>,
             the large ones (retrieved on 27 October 2026; credit JPL, not endorsed). The picture counts them by
             <strong>semi-major axis</strong> a, the size of the orbit, from 2.0 to 3.5 AU: the main belt. The dashed lines
             mark the <strong>resonances</strong> with Jupiter, where an asteroid goes around the Sun a whole number of
             times for a whole number of Jupiter&rsquo;s turns: the 4:1, 3:1, 5:2, 7:3 and 2:1. This is a catalog of what was
             <em>found</em>, not of what is there; the next step asks what that lets you say.`,
      tool: BG({ gap: 1 }, BELT_ONLY_GAP),
    },
    {
      sid: 'what-is-counted',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'What does the histogram show?',
      body: `Every bar is a count of catalog objects. The catalog holds the objects that were found and numbered, and the cut
             at H below 13 keeps the large ones. Its own note says that for the main belt the cut is brighter than the
             completeness limit of the discoveries, so the gaps show with little discovery bias, and that the outer belt and
             the Trojans are less complete than the inner belt at the same H.`,
      prompt: 'What may you say from the picture?',
      options: [
        'Where the large objects that were found lie; it describes the belt as far as large objects are all found, which the note says holds for the main belt',
        'How many asteroids there are, and how they are spread',
        'The orbits of every asteroid of every size',
        'Nothing: a catalog of discoveries says nothing about the sky',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'population',
          option: 1,
          say: 'The catalog is a count of objects found and numbered, not of objects that exist. It is a count of the large ones, and the faint are missing.',
        },
        {
          id: 'small-bodies',
          option: 2,
          say: 'The cut keeps only the bright (large) bodies; it says nothing about the small ones, which are far more numerous and mostly not found.',
        },
        {
          id: 'nothing',
          option: 3,
          say: 'A selected sample is still evidence, about what it selects. What you must do is say what the selection is, as the catalog’s note does.',
        },
      ],
      hints: [
        'Ask what had to happen for an object to be in the catalog at all.',
      ],
      because:
        'It is a histogram of what was found with H below 13, and it describes the main belt as far as the large bodies are all found. That is why this investigation measures the gaps, which a selection that is nearly complete in the large bodies shows with little discovery bias, and does not count bodies.',
      tool: BG({ gap: 1 }, BELT_ONLY_GAP),
    },
    {
      sid: 'depletion-predict',
      stage: STAGE,
      type: 'predict',
      reveal: 'depletion',
      title: 'How depleted is the 3:1 gap?',
      body: `A smooth curve is fitted to the counts outside every shaded window and carried across them: it says how many
             large objects a band 0.05 AU wide at the 3:1 resonance would hold if the belt were smooth there.`,
      prompt:
        'Of that number, the catalog finds in the 3:1 window about&hellip;',
      options: [
        'one in eight, a depletion near 88 percent',
        'half of it, a depletion near 50 percent',
        'nine in ten, a depletion near 10 percent',
        'all of it: a gap only shows in a picture, not in the counts',
      ],
      answer: 0,
      hints: [
        'The gap is plainly visible in the bars; ask how low the bars go, not whether they do.',
      ],
      because:
        'About one in eight: 26 found where 216 are expected, a depletion of 88 percent. The next two steps count it and put an interval on it.',
      tool: BG({ gap: 1 }, BELT_ONLY_GAP),
    },
    {
      sid: 'count-the-gap',
      stage: STAGE,
      type: 'measure',
      title: 'Count the 3:1 window',
      body: `The shaded band is the 3:1 window, 0.025 AU either side of a = 2.5013 AU. Read how many catalog objects
             <strong>are</strong> in the window and how many the smooth curve <strong>expects</strong> there.`,
      fields: [
        {
          id: 'found',
          label: 'Found in the window',
          unit: '',
          want: '26',
        },
        {
          id: 'expected',
          label: 'Expected from the baseline',
          unit: '',
          want: '216',
        },
      ],
      validate: v => {
        if (![v.found, v.expected].every(Number.isFinite)) return null;
        if (near(v.found, 26, 0.5) && near(v.expected, 216, 1.5)) {
          return {
            level: 'ok',
            message:
              '26 found where 216 are expected. The window is not empty, and it is far below what the smooth curve gives.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the window to 3:1 and read “Found” and “expected” in “Found, and expected from the baseline”.',
        };
      },
      tool: BG({ gap: 1 }, BELT_ONLY_GAP),
    },
    {
      sid: 'depletion',
      stage: STAGE,
      type: 'measure',
      title: 'The depletion, and how sure it is',
      body: `The <strong>depletion</strong> is one minus found over expected. The interval comes from resampling the
             catalog&rsquo;s rows 400 times and refitting the baseline each time, so it says how far the depth would move
             with another sample of the same kind of belt. Read the depletion and the two ends of its 95 percent interval,
             in percent.`,
      fields: [
        {
          id: 'dep',
          label: 'The depletion (percent)',
          unit: '',
          want: '88.0',
        },
        {
          id: 'lo',
          label: 'Low end of the 95 percent interval (percent)',
          unit: '',
          want: '82.9',
        },
        {
          id: 'hi',
          label: 'High end of the 95 percent interval (percent)',
          unit: '',
          want: '92.4',
        },
      ],
      validate: v => {
        if (![v.dep, v.lo, v.hi].every(Number.isFinite)) return null;
        if (
          near(v.dep, 88.0, 0.3) &&
          near(v.lo, 82.9, 0.5) &&
          near(v.hi, 92.4, 0.5)
        ) {
          return {
            level: 'ok',
            message:
              '88.0 percent, 82.9 to 92.4: the window holds about one object in eight of what a smooth belt would. The interval is the sampling error of this catalog; it does not include the choice of window or baseline, which the deeper steps vary.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the window to 3:1 and read the percent and the two ends of the interval in “Depletion against the baseline”.',
        };
      },
      tool: BG({ gap: 1 }, BELT_ONLY_GAP),
    },
    {
      sid: 'not-empty',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Is the gap empty?',
      body: `The 3:1 window still holds 26 catalog objects.`,
      prompt: 'What should one say?',
      options: [
        'It is a thinning, not a hole: the window is strongly depleted, and some bodies are found in it',
        'It is not a gap at all: a gap would hold nothing',
        'The 26 must be errors in the catalog',
        'Jupiter swept the window clean, so those 26 are not really asteroids',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'hole',
          option: 1,
          say: 'A gap in a histogram is a depletion against what the neighbors say to expect. Nothing in the data asks for zero; what it shows is one in eight.',
        },
        {
          id: 'errors',
          option: 2,
          say: 'The objects are numbered, with orbits from many observations. Calling the awkward ones errors is a way of making a measurement come out the way you wanted.',
        },
        {
          id: 'swept',
          option: 3,
          say: 'They are asteroids, found with a semi-major axis in the window. Why some bodies are there is a question for orbit calculations, which a histogram cannot answer.',
        },
      ],
      hints: ['What number does the instrument show for the depletion?'],
      because:
        'A depletion of 88 percent with an interval from 83 to 92 percent: a strong thinning, not an emptiness. The count of a gap is a measurement with a number, and the number is not zero.',
      tool: BG({ gap: 1 }, BELT_ONLY_GAP),
    },
    {
      sid: 'the-second-gap',
      stage: STAGE,
      type: 'measure',
      title: 'A shallower gap: 5:2',
      body: `Choose the 5:2 window, at a = 2.8246 AU. Read how many objects it holds and how depleted it is.`,
      fields: [
        {
          id: 'found',
          label: 'Found in the window',
          unit: '',
          want: '115',
        },
        {
          id: 'dep',
          label: 'The depletion (percent)',
          unit: '',
          want: '63.3',
        },
      ],
      validate: v => {
        if (![v.found, v.dep].every(Number.isFinite)) return null;
        if (near(v.found, 115, 0.5) && near(v.dep, 63.3, 0.3)) {
          return {
            level: 'ok',
            message:
              '115 found of 314 expected: a depletion of 63.3 percent, interval 56.5 to 70.0. The 3:1 gap is 88 percent deep and the 5:2 gap 63, and their intervals do not overlap: the gaps differ in depth, and each is a measurement of its own.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the window to 5:2 and read “Found” and the percent in “Depletion against the baseline”.',
        };
      },
      tool: BG({ gap: 2 }, ['hlimit', 'width', 'degree', 'classes', 'survey']),
    },
    {
      sid: 'what-you-worked-out',
      stage: STAGE,
      type: 'read',
      title: 'What you worked out',
      body: `A histogram of the 8,886 numbered asteroids with H below 13 shows the gaps at Jupiter&rsquo;s resonances. A smooth
             curve fitted outside the windows says how many objects each window would hold, and the depletion is how far the
             count falls below it: 88.0 percent at 3:1 (interval 82.9 to 92.4) and 63.3 at 5:2 (56.5 to 70.0). A gap is a
             depletion, not an emptiness, and the catalog is what was found, not what is there. The deeper steps change the
             window, the cut and the baseline, meet two windows the method cannot measure, and say what a depletion does
             and does not tell you about Jupiter.`,
      tool: BG({ gap: 1 }, BELT_ONLY_GAP),
    },
  ],
};

// -----------------------------------------------------------------------------
// 9. How Fast Does It Spin?
// -----------------------------------------------------------------------------
export const HOW_FAST_DOES_IT_SPIN = {
  id: 'how-fast-does-it-spin',
  thumbnail: 'images/investigations/how-fast-does-it-spin.webp',
  title: 'How Fast Does It Spin?',
  subtitle:
    'A synthetic light curve, the rotation period from its periodogram, the amplitude, and what the amplitude bounds about the shape',
  duration: '8-12 min',
  level: 'Introductory to upper-level astronomy',
  audience: 'intro',
  textbook: { chapter: 13, section: null },
  courseLevel: 'survey',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'algebra',
  prerequisites: [],
  tags: ['solar-system', 'observing'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Read the rotation period of an asteroid from the strongest peak of a periodogram, with the two-maxima rule, and say what its error is a floor of',
    'Turn the amplitude of a light curve into a lower bound on the axis ratio, and say why it is only a bound',
    'Say what sampling can hide: an alias, a part of the turn never observed, or a period that is not there',
    'Say that the data here are synthetic, and what it means to check a method against a known truth',
  ],
  steps: [
    {
      sid: 'a-flickering-point',
      stage: STAGE,
      type: 'read',
      title: 'A flickering point of light',
      body: `An asteroid is a point of light that gets brighter and fainter as it turns, because a lumpy body shows us a
             different area as it rotates. The data here are <strong>synthetic</strong>: a rotating ellipsoid simulated for this
             investigation with noise, over five nights of 40 measurements each in a night of 7 hours. It is not a real
             asteroid&rsquo;s light curve (the measured one the project looked for was not available), and its true period and
             shape are withheld until you ask. Top: the measurements against time. Middle: how well each trial rotation
             period explains them (a <strong>periodogram</strong>). Bottom: the measurements folded on the best period.`,
      tool: SC({ target: 0 }, SPIN_ONLY_TARGET),
    },
    {
      sid: 'two-maxima-predict',
      stage: STAGE,
      type: 'predict',
      reveal: 'rotation-period',
      title: 'The light peaks twice a turn',
      body: `The periodogram&rsquo;s strongest peak says how often the light repeats: about every three hours. An elongated body shows
             its long side to us twice in each turn, once at each end.`,
      prompt: 'The asteroid&rsquo;s rotation period will be about&hellip;',
      options: [
        'twice the light’s period, about 6 hours',
        'the same as the light’s period, about 3 hours',
        'half of it, about 1.5 hours',
        'four times it, about 12 hours',
      ],
      answer: 0,
      hints: ['How many bright ends does an elongated body have?'],
      because:
        'Twice: 6.2 hours. The light repeats every 3.1 hours because two maxima fit into each turn. That is the two-maxima rule, and it holds for a body that is roughly an ellipsoid; the deeper steps return to what it assumes.',
      tool: SC({ target: 0 }, SPIN_ONLY_TARGET),
    },
    {
      sid: 'rotation-period',
      stage: STAGE,
      type: 'measure',
      title: 'The period',
      body: `Read the light&rsquo;s period at the strongest peak of the periodogram, and the rotation period the instrument
             gives from it by the two-maxima rule.`,
      fields: [
        {
          id: 'peak',
          label: 'The light’s period at the strongest peak (hours)',
          unit: '',
          want: '3.099',
        },
        {
          id: 'period',
          label: 'The rotation period (hours)',
          unit: '',
          want: '6.199',
        },
      ],
      validate: v => {
        if (![v.peak, v.period].every(Number.isFinite)) return null;
        if (near(v.peak, 3.099, 0.01) && near(v.period, 6.199, 0.01)) {
          return {
            level: 'ok',
            message:
              'The light repeats every 3.099 h, and the rotation period is twice that, 6.199 ± 0.001 h, taking two maxima a rotation. The ± is from resampling the measurements: it assumes they are independent, and it is a floor on the error, not the whole of it.',
          };
        }
        return {
          level: 'error',
          message:
            'Use target A with five nights and read “Strongest peak” and “Rotation period”.',
        };
      },
      tool: SC({ target: 0 }, SPIN_ONLY_TARGET),
    },
    {
      sid: 'amplitude-and-bound',
      stage: STAGE,
      type: 'measure',
      title: 'How much it varies, and what that bounds',
      body: `The folded curve rises and falls by an <strong>amplitude</strong>, in magnitudes. A brightness ratio of
             10<sup>0.4 &times; amplitude</sup> is the least that the long axis can exceed the middle one by: the bound on
             <strong>a/b</strong>. Read the amplitude and the bound.`,
      fields: [
        {
          id: 'amp',
          label: 'The amplitude (mag)',
          unit: '',
          want: '0.333',
        },
        {
          id: 'bound',
          label: 'a/b is at least',
          unit: '',
          want: '1.36',
        },
      ],
      validate: v => {
        if (![v.amp, v.bound].every(Number.isFinite)) return null;
        if (near(v.amp, 0.333, 0.004) && near(v.bound, 1.36, 0.01)) {
          return {
            level: 'ok',
            message:
              '0.333 mag (interval 0.331 to 0.339) and a/b of at least 1.36: the body is at least 1.36 times longer than wide. It is a lower bound: it equals a/b only if we look at the body exactly along its equator.',
          };
        }
        return {
          level: 'error',
          message: 'Read “Amplitude” and the number in “The axis ratio a/b”.',
        };
      },
      tool: SC({ target: 0 }, SPIN_ONLY_TARGET),
    },
    {
      sid: 'ask-for-the-truth',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Check against the truth',
      body: `Turn on &ldquo;Show the truth&rdquo;. The simulation&rsquo;s own rotation period, axis ratio and aspect appear below your
             measurements: this is the one thing a synthetic curve gives that a real asteroid never does.`,
      prompt: 'How do the measurements and the truth compare?',
      options: [
        'The period agrees to within 0.001 h (6.199 against 6.2), and the bound, 1.36, is below the true a/b of 1.5, as a lower bound must be',
        'Both match exactly: the instrument returns the truth',
        'The period is right but the bound is wrong, since it should be 1.5',
        'They cannot be compared: the truth is made up',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'exact',
          option: 1,
          say: 'The period differs from the truth by 0.001 h and the bound is not 1.5. A measurement is close to the truth, not equal to it.',
        },
        {
          id: 'bound-wrong',
          option: 2,
          say: 'A bound that equaled a/b would be a measurement of it. It equals a/b only when the body is seen exactly equator-on, and this one is seen at an aspect of 70 degrees.',
        },
        {
          id: 'made-up',
          option: 3,
          say: 'A made-up truth is exactly what lets you check a method: you know the answer. What it cannot do is stand in for a real asteroid, whose truth is never shown.',
        },
      ],
      hints: ['Is a lower bound supposed to be equal to what it bounds?'],
      because:
        'The simulation’s period is 6.2 h and its axis ratio a/b 1.5, seen at 70 degrees from the spin axis, with an amplitude of 0.335 mag. The measured period is within 0.001 h and the bound 1.36 lies below 1.5: both as they should. A real asteroid’s truth is never shown, which is why a method has to be checked like this first.',
      tool: SC({ target: 0, truth: 1 }, [
        'nights',
        'hours',
        'noise',
        'cadence',
      ]),
    },
    {
      sid: 'what-you-worked-out',
      stage: STAGE,
      type: 'read',
      title: 'What you worked out',
      body: `The light of a rotating body repeats twice a turn, so the rotation period is twice the strongest peak: 6.199 h
             here, from five nights, with an error that is a floor. The amplitude, 0.333 mag, bounds the axis ratio from
             below, a/b of at least 1.36, and the simulation&rsquo;s truth, 1.5, is above it as a bound requires. All of it is
             synthetic. The deeper steps shorten the run, round the body, sample once a night, and meet the cases in which
             the instrument says it cannot tell.`,
      tool: SC({ target: 0 }, SPIN_ONLY_TARGET),
    },
  ],
};

/** The lessons, in order: what the barrel registers. */
export default [
  WEIGHING_JUPITER,
  WHY_RINGS,
  TIDES_THAT_MOVE_THE_MOON,
  IOS_FIRE,
  THE_GAPS_IN_THE_BELT,
  HOW_FAST_DOES_IT_SPIN,
];
