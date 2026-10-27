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
          hint: '9.7',
        },
        {
          id: 'move',
          label: 'How far it moved between frame 14 and frame 16',
          unit: 'RJup',
          hint: '0.9',
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
        { id: 'period', label: 'Io’s period', unit: 'd', hint: '1.77' },
        {
          id: 'radius',
          label: 'Io’s orbit radius',
          unit: 'RJup',
          hint: '5.9',
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
          hint: '2.30',
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
const TM = (values = {}, hide = []) => ({ id: 'tides-moon', values, hide });
const TH = (values = {}, hide = []) => ({ id: 'tides-heating', values, hide });

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
             <strong>Shoemaker-Levy 9 and Jupiter</strong>, read the <strong>rigid limit</strong>
             and the <strong>fluid limit</strong>, in Jupiter radii (R).`,
      fields: [
        { id: 'rigid', label: 'Rigid limit', unit: 'R', hint: '1.64' },
        { id: 'fluid', label: 'Fluid limit', unit: 'R', hint: '3.18' },
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
            'Choose Shoemaker-Levy 9 and Jupiter, leave the distance on “the real one”, then read “Rigid limit” and “Fluid limit” in planet radii (R).',
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
      body: `Set the pair to <strong>Phobos and Mars</strong> and read the two limits in
             kilometers from the center of Mars.`,
      fields: [
        { id: 'rigid', label: 'Rigid limit', unit: 'km', hint: '5466' },
        { id: 'fluid', label: 'Fluid limit', unit: 'km', hint: '10585' },
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
            'Choose Phobos and Mars with the distance on “the real one”, then read “Rigid limit” and “Fluid limit” in kilometers.',
        };
      },
      tool: RO({ system: 0, own: 1 }),
    },
    {
      sid: 'a-pass-inside-the-limit',
      type: 'read',
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
          hint: '116883',
        },
        {
          id: 'offset',
          label: 'From the nearest feature',
          unit: '%',
          hint: '0.59',
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
             recorded for this lesson is modest: the ring thins at the resonance (19 particles
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
  objectives: [
    'Say why the Moon recedes and the day lengthens, as one process',
    'Read the Moon’s recession and the day’s lengthening from a constant-Q tide model and compare them with lunar laser ranging and eclipse records',
    'Run the model forward and backward and find where it stops',
    'Say what the model assumes, and what its failure backward says about it',
  ],
  steps: [
    {
      sid: 'the-bulge-ahead',
      stage: STAGE,
      type: 'read',
      title: 'A bulge that runs ahead',
      body: `The Moon raises two bulges on the Earth&rsquo;s oceans and body. The Earth spins
             faster than the Moon orbits, so the bulge is carried a little ahead of the line to
             the Moon. That bulge pulls the Moon forward, so the Moon gains energy and recedes,
             and the Moon pulls the bulge back, so the Earth&rsquo;s spin slows. The pair
             exchanges angular momentum; the sum is conserved. The table below is the
             model&rsquo;s closed form, not a simulation.`,
      tool: TM({ gyr: 0 }),
    },
    {
      sid: 'the-moons-recession',
      stage: STAGE,
      type: 'measure',
      title: 'How fast the Moon recedes now',
      body: `With k2 = 0.30 and Q = 12 and time 0, read how fast the Moon is receding,
             in cm per year, and how much the day lengthens, in milliseconds per century.`,
      fields: [
        {
          id: 'rate',
          label: 'The Moon’s recession',
          unit: 'cm/yr',
          hint: '3.75',
        },
        {
          id: 'day',
          label: 'The day’s lengthening',
          unit: 'ms/cy',
          hint: '2.05',
        },
      ],
      validate: v => {
        if (![v.rate, v.day].every(Number.isFinite)) return null;
        if (near(v.rate, 3.75, 0.06) && near(v.day, 2.05, 0.06)) {
          return {
            level: 'ok',
            message:
              '3.75 cm per year, against 3.82 ± 0.07 measured by lunar laser ranging, and 2.05 ms per century, against about 2.3 from ancient eclipses. Two numbers, one Q: the model is close, and k2 and Q were chosen to be.',
          };
        }
        return {
          level: 'error',
          message:
            'Set k2 to 0.30, Q to 12 and the time to 0, then read “Moon’s recession now” and “The day’s lengthening now”.',
        };
      },
      tool: TM({ k2: 0.3, Q: 12, gyr: 0 }),
    },
    {
      sid: 'forward-predict',
      stage: STAGE,
      type: 'predict',
      reveal: 'forward-one-billion',
      title: 'A billion years on',
      body: `The Moon is about 60 Earth radii away and recedes at a few cm per year.
             Recession slows as the Moon gets farther, because the tide falls off steeply with
             distance.`,
      prompt: 'In a billion years the Moon will be about&hellip;',
      options: [
        '60 Earth radii: it barely moves',
        '65 Earth radii',
        '80 Earth radii',
        '100 Earth radii',
      ],
      answer: 1,
      hints: [
        'A billion years at 3.75 cm per year is 37,500 km if the rate were constant, and it slows as it goes.',
      ],
      because:
        'The model puts the Moon at 414.6 thousand km in a billion years, about 65 Earth radii: the rate of 3.75 cm per year slows as the Moon recedes, so it gains less than the 37,500 km a constant rate would give.',
      tool: TM({ k2: 0.3, Q: 12, gyr: 1 }),
    },
    {
      sid: 'forward-one-billion',
      stage: STAGE,
      type: 'measure',
      title: 'One billion years ahead',
      body: `Set the time to <strong>1</strong> billion years and read the Moon&rsquo;s distance
             in thousand km and the length of the day in hours.`,
      fields: [
        {
          id: 'a',
          label: 'The Moon’s distance',
          unit: 'thousand km',
          hint: '414.6',
        },
        { id: 'day', label: 'The day', unit: 'h', hint: '29.5' },
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
            'Keep k2 = 0.30 and Q = 12, set the time to 1, and read the distance and the day.',
        };
      },
      tool: TM({ k2: 0.3, Q: 12, gyr: 1 }),
    },
    {
      sid: 'the-model-run-backward',
      stage: STAGE,
      type: 'measure',
      title: 'Run it backward',
      body: `Set the time to <strong>&minus;2</strong> billion years. The model cannot go that
             far back. Read in what year, counted back from now in billion years, the
             orbit would have reached the Earth&rsquo;s surface.`,
      fields: [
        {
          id: 'gyr',
          label: 'Contact, billion years ago',
          unit: 'Gyr',
          hint: '1.58',
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
      tool: TM({ k2: 0.3, Q: 12, gyr: -2 }),
    },
    {
      sid: 'what-the-model-leaves-out',
      stage: STAGE,
      type: 'read',
      title: 'What you worked out',
      body: `The Moon recedes at 3.75 cm per year in a model with one Q, close to the 3.82
             measured, and the day lengthens by 2.05 ms per century, close to the 2.3 from
             eclipses. Run backward, the same model puts the Moon in contact with the Earth
             1.58 billion years ago, well within the age of the Solar System. So Q was not
             constant: in a real history it changed with the oceans and the continents. A
             parameter that fits the present is not a law.`,
      tool: TM({ k2: 0.3, Q: 12, gyr: -2 }),
    },
  ],
};

// -----------------------------------------------------------------------------
// 10. Io's Fire
// -----------------------------------------------------------------------------
export const IOS_FIRE = {
  id: 'ios-fire',
  thumbnail: 'images/investigations/ios-fire.webp',
  title: 'Io’s Fire',
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
  objectives: [
    'Say where Io’s heat comes from and why it needs an orbit that is not quite circular',
    'Read the heat, and the energy in one orbit, from the tidal heating formula for a stated k2 and Q',
    'Say why the answer is a bound and not a prediction, and what k2/Q the observed heat needs',
    'Say how the heating depends on the eccentricity',
  ],
  steps: [
    {
      sid: 'a-moon-that-melts',
      stage: STAGE,
      type: 'read',
      title: 'The most volcanic body we know',
      body: `Io is the most volcanically active body in the Solar System, with no help from
             the Sun. Its heat is the tide: Jupiter raises a bulge on Io, and because
             Io&rsquo;s orbit is not quite circular (e = 0.0041) the bulge rises and falls
             once an orbit, and the friction in that flexing is heat. How much depends on how
             easily Io flexes (k2) and how much it loses as it does (Q), and neither is known
             for Io.`,
      tool: TH({ k2: 1.5, Q: 100, e: 0.0041 }),
    },
    {
      sid: 'heating-at-the-maximum',
      stage: STAGE,
      type: 'measure',
      title: 'The heat for k2 = 1.5 and Q = 100',
      body: `Set k2 to 1.5 (the most a body can have, for a fluid), Q to 100 and the
             eccentricity to 0.0041. Read the <strong>heating</strong> in units of 10<sup>13</sup>
             W, and the energy in one orbit in units of 10<sup>19</sup> J.`,
      fields: [
        { id: 'power', label: 'Heating', unit: '1e13 W', hint: '9.33' },
        {
          id: 'orbit',
          label: 'Energy in one orbit',
          unit: '1e19 J',
          hint: '1.43',
        },
      ],
      validate: v => {
        if (![v.power, v.orbit].every(Number.isFinite)) return null;
        if (near(v.power, 9.33, 0.1) && near(v.orbit, 1.43, 0.03)) {
          return {
            level: 'ok',
            message:
              '9.33 × 10¹³ W, and 1.43 × 10¹⁹ J in each 1.77-day orbit. The observed heat flow is 0.6 to 1.6 × 10¹⁴ W: this is inside it. That is partly luck: k2 and Q were chosen, not known.',
          };
        }
        return {
          level: 'error',
          message:
            'Set k2 = 1.5, Q = 100, e = 0.0041, then read “Heating” and “Energy in one orbit”.',
        };
      },
      tool: TH({ k2: 1.5, Q: 100, e: 0.0041 }),
    },
    {
      sid: 'double-predict',
      stage: STAGE,
      type: 'predict',
      reveal: 'double-the-eccentricity',
      title: 'A more eccentric orbit',
      body: `The heating is proportional to the square of the eccentricity, because the
             bulge&rsquo;s rise and fall is proportional to it and so is the friction.`,
      prompt: 'If Io’s eccentricity were doubled, the heating would be&hellip;',
      options: [
        'twice as large',
        'four times as large',
        'eight times as large',
        'unchanged',
      ],
      answer: 1,
      hints: ['Heating goes as e squared.'],
      because:
        'The heating goes as e squared, so doubling the eccentricity gives four times the heat: from 9.33 × 10¹³ W to 3.73 × 10¹⁴ W for k2 = 1.5 and Q = 100.',
      tool: TH({ k2: 1.5, Q: 100, e: 0.0041 }),
    },
    {
      sid: 'double-the-eccentricity',
      stage: STAGE,
      type: 'measure',
      title: 'Doubling the eccentricity',
      body: `Set the eccentricity to 0.0082 and read the heating in units of 10<sup>14</sup> W.`,
      fields: [{ id: 'power', label: 'Heating', unit: '1e14 W', hint: '3.73' }],
      validate: v => {
        if (!Number.isFinite(v.power)) return null;
        if (near(v.power, 3.73, 0.05)) {
          return {
            level: 'ok',
            message:
              '3.73 × 10¹⁴ W: four times as much, and now above the observed flow. Io’s orbit is kept slightly eccentric by its resonance with Europa and Ganymede; if the eccentricity decayed, the heat would too.',
          };
        }
        return {
          level: 'error',
          message:
            'Keep k2 = 1.5 and Q = 100, set e = 0.0082, and read “Heating”.',
        };
      },
      tool: TH({ k2: 1.5, Q: 100, e: 0.0082 }),
    },
    {
      sid: 'the-bound',
      stage: STAGE,
      type: 'measure',
      title: 'What the formula can and cannot say',
      body: `Set the eccentricity back to 0.0041. The line <strong>Range the model allows</strong>
             is the heat for the largest k2/Q (k2 = 1.5, Q = 5) and a thousandth of it. Read the
             <strong>k2/Q</strong> the middle of the observed heat flow needs.`,
      fields: [
        {
          id: 'need',
          label: 'k2/Q the observed middle value needs',
          unit: '',
          hint: '0.0177',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.need)) return null;
        if (near(v.need, 0.0177, 0.0006)) {
          return {
            level: 'ok',
            message:
              'k2/Q = 0.0177, a value inside what the model allows (from 0.0003 to 0.3). The heat spans three orders of magnitude, 1.9 × 10¹² to 1.9 × 10¹⁵ W, so the formula cannot tell us the interior; the heat we see tells us the interior’s k2/Q.',
          };
        }
        return {
          level: 'error',
          message:
            'Set e = 0.0041 and read “k2/Q the observed middle value needs”.',
        };
      },
      tool: TH({ k2: 1.5, Q: 100, e: 0.0041 }),
    },
    {
      sid: 'what-heat-is',
      stage: STAGE,
      type: 'read',
      title: 'What you worked out',
      body: `Io&rsquo;s heat comes from the tide, and the formula gives it as a multiple of
             k2/Q with the eccentricity squared. For a plausible k2 and Q it matches what is
             observed, and the formula alone cannot say more, because k2/Q is not known: the
             answer is a bound over three orders of magnitude, and the observation picks a point
             inside it. What the model leaves out is the interior: a partly molten layer changes
             how Io flexes.`,
      tool: TH({ k2: 1.5, Q: 100, e: 0.0041 }),
    },
  ],
};

/** The lessons, in order: what the barrel registers. */
export default [
  WEIGHING_JUPITER,
  WHY_RINGS,
  TIDES_THAT_MOVE_THE_MOON,
  IOS_FIRE,
];
