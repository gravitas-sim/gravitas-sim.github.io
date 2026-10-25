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

/** The lessons, in order: what the barrel registers. */
export default [WEIGHING_JUPITER];
