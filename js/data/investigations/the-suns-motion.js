// =============================================================================
// The Sun's Motion
// -----------------------------------------------------------------------------
// Content only, no imports: every step that needs a live number is handed a
// `ctx` by the engine. The card paragraph is written once in summaries.js (and
// summaries.es.js). Every step carries a `sid`, an opaque stable id that student
// progress is keyed by (js/investigations/progressSchema.js): reword a step,
// move it, translate it, never change its sid.
//
// The instrument is the galactic family's Sun's motion tool
// (js/galacticWidgets.js, js/galactic/model.js): Gaia DR3 stars with a radial
// velocity, turned into U, V, W by the galactic kernel. The numbers a student
// reads are checked against that model by tests/galacticInvestigations.test.js
// (tools/authoring/galacticModels.mjs).
//
// THE OPEN ASSUMPTION: the Sun's V against the local standard of rest has two
// published values the sample cannot choose between (about 3.8 km/s by
// Stromberg's correction, 12.24 by Schonrich et al. 2010). This lesson states
// both, and makes the choice a stated assumption of the student's.
// =============================================================================

/** Two placeholder stars on the canvas: a display; the instrument is where the stars are. */
const STARS = {
  spacing: 150,
  fit: true,
  stars: [
    { role: 'sun', name: 'The Sun', teffK: 5772, lumSun: 1 },
    { role: 'neighbour', name: 'A neighbour', teffK: 5000, lumSun: 0.4 },
  ],
};
const SM = (values = {}) => ({ id: 'solar-motion', values });

const THE_SUNS_MOTION = {
  id: 'the-suns-motion',
  thumbnail: 'images/investigations/the-suns-motion.webp',
  title: 'The Sun’s Motion',
  subtitle: 'Measuring the solar apex from nearby stars in Gaia',
  duration: '15-25 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 25, section: '25.1' },
  courseLevel: 'majors',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'algebra',
  prerequisites: ['lines-and-motion'],
  tags: ['stars', 'observing', 'galaxies'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Turn a star’s parallax, proper motion and radial velocity into a three-dimensional velocity',
    'Measure the Sun’s velocity relative to nearby stars as minus the stars’ mean velocity, with an uncertainty',
    'Say where the Sun is heading (the apex) and why that is not the direction of the Galaxy’s rotation',
    'Explain why the stars’ mean motion is not the local standard of rest, and what asymmetric drift is',
    'State, as an assumption, which value of the Sun’s motion relative to the local standard of rest is used, and what depends on the choice',
  ],
  steps: [
    {
      sid: 'from-stars-to-velocities',
      stage: STARS,
      type: 'read',
      title: 'Three numbers, then a velocity',
      body: `Gaia measures how far away a star is (its <strong>parallax</strong>)
             and how fast it crosses the sky (its <strong>proper motion</strong>).
             Together they give the star’s speed across your line of sight. Its
             <strong>radial velocity</strong>, from the Doppler shift you met in
             Lines and Motion, gives the speed along it. Three numbers make a
             velocity in space.
             \n\nThe instrument below holds 1,570 Gaia DR3 stars that have a
             radial velocity. It resolves each into <strong>U</strong> (toward
             the Galactic center), <strong>V</strong> (the way the Galaxy
             rotates) and <strong>W</strong> (toward the north Galactic pole). The
             picture shows the stars within 100 parsecs; every number is in the
             list beneath it. The two stars above are placeholders.`,
      tool: SM({ maxPc: 100, frame: 0, view: 0 }),
    },
    {
      sid: 'predict-the-mean',
      stage: STARS,
      type: 'predict',
      reveal: 'measure-the-sun',
      title: 'What the neighbours’ average says',
      body: `Suppose the Sun is moving through a swarm of nearby stars that,
             taken together, are not going anywhere. Do not change the
             instrument yet.`,
      prompt: 'Seen from the Sun, the stars’ mean velocity will point&hellip;',
      options: [
        'opposite to the Sun’s own motion',
        'the same way as the Sun’s own motion',
        'nowhere: it will average to zero',
        'toward the Galactic center, whatever the Sun does',
      ],
      answer: 0,
      hints: [
        'Think of walking through a crowd that stands still: which way do the people seem to go?',
      ],
      because:
        'Opposite to it. From a moving observer a still crowd streams the other way, so the Sun’s motion is minus the stars’ mean velocity. That is exactly how the next step measures it.',
      tool: SM({ maxPc: 100, frame: 0, view: 0 }),
    },
    {
      sid: 'measure-the-sun',
      stage: STARS,
      type: 'measure',
      title: 'Measure the Sun’s velocity',
      body: `Keep <strong>stars closer than 100 pc</strong> and measure against
             <strong>the mean of these stars</strong>. In the list, read the
             Sun’s <strong>U</strong>, <strong>V</strong> and <strong>W</strong>.
             The picture shows each star’s velocity as seen from the Sun, the
             blue cross is their mean, and the orange arrow, minus that mean, is
             the Sun’s motion.`,
      fields: [
        { id: 'U', label: 'Sun’s U', unit: 'km/s', hint: '10' },
        { id: 'V', label: 'Sun’s V', unit: 'km/s', hint: '22' },
        { id: 'W', label: 'Sun’s W', unit: 'km/s', hint: '9' },
      ],
      validate: v => {
        if (![v.U, v.V, v.W].every(Number.isFinite)) return null;
        if (
          Math.abs(v.U - 10.5) <= 1.5 &&
          Math.abs(v.V - 21.9) <= 2 &&
          Math.abs(v.W - 9.1) <= 1.5
        ) {
          return {
            level: 'ok',
            message:
              'Each value comes with an uncertainty, the scatter of the stars divided by the square root of how many there are. The Sun is moving about 10 km/s toward the Galactic center, 22 along the rotation and 9 northward, relative to these stars.',
          };
        }
        return {
          level: 'error',
          message:
            'Set “Use stars closer than” to 100 pc and “Measure the Sun’s V against” to the mean of these stars, then read the three rows for U, V and W.',
        };
      },
      tool: SM({ maxPc: 100, frame: 0, view: 0 }),
    },
    {
      sid: 'why-v-is-big',
      stage: STARS,
      type: 'question',
      kind: 'choice',
      title: 'Why is V the biggest?',
      body: `Relative to these stars the Sun moves about 10 km/s in U, 9 in W
             and 22 in V. The Galaxy rotates at over 200 km/s in the V
             direction, so V is where a large number was always possible.`,
      prompt: 'What is the likeliest reason V is larger than U or W?',
      options: [
        'The stars as a group lag behind the Galaxy’s rotation, so the Sun is running ahead of them',
        'Gaia measures V less well than U or W',
        'The Sun is a runaway star that was thrown out of a cluster',
        'The Sun is the only star moving in the rotation direction',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'instrument-error',
          option: 1,
          say: 'The error of V is no bigger than the others in the list (1 to 2 km/s). The 22 km/s is a real property of these stars’ motion.',
        },
      ],
      hints: [
        'Older, hotter-moving stars fall behind the rotation. The next steps give it a name.',
      ],
      because:
        'The group lags. Stars whose orbits are more stirred up (a larger spread of speeds) swing out and lag the circular orbit; this is called asymmetric drift. Relative to a lagging group, the Sun, which is on a nearly circular orbit, seems to run ahead.',
      tool: SM({ maxPc: 100, frame: 0, view: 0 }),
    },
    {
      sid: 'measure-farther',
      stage: STARS,
      type: 'measure',
      title: 'Use more stars, from farther away',
      body: `Raise the limit to <strong>1,000 pc</strong> (the second preset), so
             the sample grows from about 490 stars to all 1,570. Read the
             Sun’s <strong>U</strong> and its uncertainty.`,
      fields: [
        {
          id: 'U',
          label: 'Sun’s U within 1,000 pc',
          unit: 'km/s',
          hint: '9.7',
        },
        { id: 'err', label: 'its uncertainty', unit: 'km/s', hint: '1.0' },
      ],
      validate: v => {
        if (![v.U, v.err].every(Number.isFinite)) return null;
        if (Math.abs(v.U - 9.74) <= 1 && Math.abs(v.err - 1.03) <= 0.3) {
          return {
            level: 'ok',
            message:
              'U is about the same as before, with a smaller error because there are more stars. But stars up to a kiloparsec away are far enough that the Galaxy’s own rotation changes across the sample, so the nearer stars are the cleaner reference.',
          };
        }
        return {
          level: 'error',
          message:
            'Move “Use stars closer than” to 1,000 pc, leave the frame on the mean of these stars, and read the Sun’s U and the number after the ± sign.',
        };
      },
      tool: SM({ maxPc: 1000, frame: 0, view: 0 }),
    },
    {
      sid: 'the-lsr-problem',
      stage: STARS,
      type: 'read',
      title: 'Which rest frame?',
      body: `The Sun’s motion relative to <em>these stars</em> is not yet the
             Sun’s motion relative to the Galaxy’s circular motion here, the
             <strong>local standard of rest</strong> (LSR). The stars lag it, by
             an amount that grows with how stirred up they are. Strömberg’s
             relation estimates the lag as σ<sub>U</sub>² ÷ 80&nbsp;km/s, from the
             stars’ own spread σ<sub>U</sub>; the instrument lists it. Take it
             off and the Sun’s V against the LSR is about
             <strong>4&nbsp;km/s</strong>.
             \n\nBut Schönrich, Binney and Dehnen (2010) argued, from stars of
             different metallicity, that the lag depends on more than the spread,
             and found the Sun’s V to be <strong>12.24&nbsp;km/s</strong>. The two
             published values differ by about 8&nbsp;km/s. This sample cannot
             choose between them, and Gravitas does not: the third frame in the
             instrument is labelled as an assumption, and so should your answer be.`,
      tool: SM({ maxPc: 100, frame: 1, view: 1 }),
    },
    {
      sid: 'record-both-frames',
      stage: STARS,
      type: 'measure',
      title: 'Record both',
      body: `At 100 pc, set “Measure the Sun’s V against” to
             <strong>the LSR by Strömberg’s correction</strong> and read V. Then
             set it to <strong>the LSR of Schönrich et al.</strong> and read V
             again. The second is not measured here: the instrument adopts it.`,
      fields: [
        {
          id: 'stromberg',
          label: 'V, Strömberg’s correction',
          unit: 'km/s',
          hint: '3.8',
        },
        {
          id: 'schonrich',
          label: 'V, Schönrich et al.',
          unit: 'km/s',
          hint: '12.2',
        },
      ],
      validate: v => {
        if (![v.stromberg, v.schonrich].every(Number.isFinite)) return null;
        if (
          Math.abs(v.stromberg - 3.77) <= 0.5 &&
          Math.abs(v.schonrich - 12.24) <= 0.3
        ) {
          return {
            level: 'ok',
            message:
              'Both are published, and they disagree by more than eight km/s, much more than the measurement’s own error. The sample does not decide: the choice is an assumption, and everything that follows (the Sun’s speed against the LSR, the apex) depends on it.',
          };
        }
        return {
          level: 'error',
          message:
            'Use 100 pc. Read V with the Strömberg frame, then with the Schönrich frame. If the second differs from 12.24, check the frame control; if the first differs from about 3.8, check the distance limit.',
        };
      },
      tool: SM({ maxPc: 100, frame: 1, view: 0 }),
    },
    {
      sid: 'where-is-the-apex',
      stage: STARS,
      type: 'question',
      kind: 'choice',
      title: 'Where is the Sun heading?',
      body: `Open the sky map with the Strömberg LSR, then with the Schönrich LSR.
             The cross marks the <strong>apex</strong>: the point on the sky the
             Sun is moving toward. The Galactic center is in the middle of the
             map, at l = 0°. The apex moves between the two frames.`,
      prompt: 'Which is true of the apex in either frame?',
      options: [
        'It is well to one side of the Galactic center: the Sun is mostly moving around the Galaxy, not toward its center',
        'It is the Galactic center',
        'It is the north Galactic pole',
        'It is the same in both frames',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'apex-is-center',
          option: 1,
          say: 'The apex would be at l = 0° if U were the biggest component. V is: the Sun moves along the rotation, at 90° from the center.',
        },
      ],
      hints: [
        'Compare the apex’s l with 0° (the center) and 90° (the rotation direction).',
      ],
      because:
        'Well to one side: l is tens of degrees from the center in both frames (about 20° and 49° at 100 pc), because the Sun’s motion has a large V. It moves with the Galaxy’s rotation, and the apex depends on which LSR is assumed.',
      tool: SM({ maxPc: 100, frame: 1, view: 1 }),
    },
    {
      sid: 'state-the-assumption',
      stage: STARS,
      type: 'question',
      kind: 'short',
      rubric:
        'Full credit for naming one of the two frames and stating it as an assumption, with a reason or a consequence: the Strömberg frame takes the lag from the stars’ own spread and gives V near 4 km/s; the Schönrich frame is adopted from a metallicity argument and gives V of 12.24; the sample here cannot choose. Credit saying that the Sun’s speed against the LSR changes with the choice (about 14 against 19 km/s at 100 pc). Do not credit an answer that picks a value as the true one without calling it an assumption.',
      title: 'Your assumption',
      body: `A report of the Sun’s speed has to say which frame it used.`,
      prompt:
        'Write the sentence you would put in a report: which value of the Sun’s V relative to the LSR you use, and what makes it an assumption.',
      tool: SM({ maxPc: 100, frame: 2, view: 0 }),
    },
    {
      sid: 'what-you-worked-out',
      stage: STARS,
      type: 'read',
      title: 'What you worked out',
      body: `Parallax, proper motion and radial velocity make a velocity. The
             Sun’s motion relative to nearby stars is minus their mean velocity,
             with an uncertainty from their scatter: about 10, 22 and 9&nbsp;km/s
             in U, V and W. The stars lag the Galaxy’s rotation, so that is not
             the motion relative to the local standard of rest. Correcting for
             the lag needs a model, and two published models disagree by
             8&nbsp;km/s in V: a choice a measurement here cannot make, and so an
             assumption to state.`,
      tool: SM({ maxPc: 100, frame: 1, view: 1 }),
    },
  ],
};

export default THE_SUNS_MOTION;
