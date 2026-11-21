// =============================================================================
// When Orbits Lock
// -----------------------------------------------------------------------------
// Orbital resonance, and the one piece of evidence that establishes it.
//
// The usual telling is circular: two bodies are in resonance because their
// periods are in a small whole-number ratio, and the ratio is explained by the
// resonance. Callisto's ratio with Ganymede is 0.03% from 7:3, ten times closer
// than Pluto's is to 3:2, and Callisto is in no resonance; the three inner moons
// are locked as tightly as any in the Solar System with ratios no better than
// chance. So the ratio is not the evidence. A resonant angle is: it librates
// about a fixed value, or it circulates through 360 degrees.
//
// The third answer. The angle instrument reports "inconclusive" whenever the
// record cannot separate a slow circulation from a wide libration, and over a
// lesson-length run that is the honest answer for Callisto. It is the third of
// the three states the lesson teaches. The scenarios and the published values
// behind every number here are in js/resonance/systems.js and the "Orbital
// resonance" group of js/validation/physicsChecks.js.
// =============================================================================

/**
 * The three moons' longitudes, the Laplace angle they make, and how long it has
 * been watched (in Io orbits), read off the live bodies.
 */
const laplaceRows = ctx => {
  const io = ctx.role('io');
  const europa = ctx.role('europa');
  const ganymede = ctx.role('ganymede');
  // Whatever the moons go round: the heaviest thing in the scene.
  const primary = (ctx.bodies || []).reduce(
    (best, b) => (!best || b.mass > best.mass ? b : best),
    null
  );
  if (!io || !europa || !ganymede || !primary) {
    return [{ label: 'The three moons', value: 'not all on the canvas' }];
  }
  // True longitude off the positions: within a degree of the mean longitude
  // for these eccentricities, enough to point at and not to compute with.
  const lon = b =>
    ((Math.atan2(b.pos.y - primary.pos.y, b.pos.x - primary.pos.x) * 180) /
      Math.PI +
      360) %
    360;
  const [a, b, c] = [lon(io), lon(europa), lon(ganymede)];
  const phi = (((a - 3 * b + 2 * c) % 360) + 360) % 360;
  return [
    { label: 'Io, where it is now', value: `${a.toFixed(0)}°` },
    { label: 'Europa', value: `${b.toFixed(0)}°` },
    { label: 'Ganymede', value: `${c.toFixed(0)}°` },
    {
      label: 'Io − 3×Europa + 2×Ganymede',
      value: `${phi.toFixed(0)}° — the angle the plot is drawing`,
      emphasis: true,
    },
    {
      label: 'What a librating trace is evidence of',
      value: 'the window you have watched, and not a proof that it lasts',
    },
  ];
};

// A captured amplitude below these is a bound taken before the instrument had
// seen the angle turn back. Each sits about 3 degrees under the lowest
// converged amplitude measured at 60 and 120 frames a second (Laplace 24.4 to
// 26.2, Pluto 80.0 to 80.3, tadpole about 24): the integration step follows
// the frame rate, so the figure a student reads moves a little with it.
const AMPLITUDE_FLOOR = 21;
const PLUTO_FLOOR = 77;
const TADPOLE_FLOOR = 15;
// Every instrument step re-holds the world under Reduced motion and Step by step.
const HELD =
  'Under Reduced motion or Step by step the world starts paused: press Run to start it.';

/** A measure field the student fills from an instrument row (K1) or types. */
const reading = (id, label, unit, want, tool) => ({
  id,
  label,
  unit,
  want,
  ...(tool && { source: { tool } }),
});

const WAS = (to, en, es) => ({ to, release: '3.1', was: { en, es } });

const GALILEANS = {
  io: { name: 'Io' },
  europa: { name: 'Europa' },
  ganymede: { name: 'Ganymede' },
  callisto: { name: 'Callisto' },
};

const WHEN_ORBITS_LOCK = {
  id: 'when-orbits-lock',
  thumbnail: 'images/scenarios/galilean-resonance.webp',
  title: 'When Orbits Lock',
  subtitle: 'A ratio is a hint. Find out what counts as proof',
  duration: '55-70 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 12, section: null },
  courseLevel: 'survey',
  mathematics: 'algebra',
  prerequisites: [],
  tags: ['orbits', 'resonance', 'solar-system'],
  retired: {
    'write-down-the-ratios': WAS(
      'rank-the-three-pairs',
      'Read the three period ratios off the instrument and type them in.',
      'Leer las tres razones de periodos en el instrumento y escribirlas.'
    ),
    'record-the-laplace-libration': WAS(
      'capture-the-laplace-libration',
      'Read the Laplace libration center, amplitude and period off the instrument once its verdict reads libration, and type them in.',
      'Leer el centro, la amplitud y el periodo de la libración de Laplace en el instrumento cuando su veredicto dice libración, y escribirlos.'
    ),
    'record-pluto-s-libration': WAS(
      'capture-pluto-s-libration',
      'Read Pluto’s libration center, amplitude and period in years off the instrument and type them in.',
      'Leer el centro, la amplitud y el periodo en años de la libración de Plutón en el instrumento y escribirlos.'
    ),
    'record-the-tadpole': WAS(
      'capture-the-tadpole',
      'Read Patroclus’s libration center, amplitude and period off the frame instrument and type them in.',
      'Leer el centro, la amplitud y el periodo de libración de Patroclo en el instrumento del marco y escribirlos.'
    ),
  },
  objectives: [
    'Measure orbital periods and period ratios from the orbits themselves, and find the nearest small-integer ratio to each',
    'Explain why a near-rational period ratio is weak evidence, using a case where the closest ratio in the system belongs to a body in no resonance',
    'Build a resonant angle from mean longitudes and longitudes of periapsis, and say why the combination is chosen so the coefficients sum to zero',
    'Tell libration from circulation, and recognize the records that cannot distinguish them',
    'Use the libration of the Laplace argument and of Pluto’s 3:2 argument to explain what each resonance protects',
    'Distinguish a stable equilibrium from an unstable one at Jupiter’s Lagrange points, working in the rotating frame',
  ],
  steps: [
    // --- Act 1: periods, and the trap in them -------------------------------
    {
      sid: 'four-moons-and-a-suspicious',
      bind: GALILEANS,
      type: 'read',
      title: 'Four moons and a suspicious coincidence',
      setup: {
        scenario: 'Galilean Resonance',
        seed: 'resonance-lab',
        paused: true,
      },
      body: `On screen are the four moons Galileo saw in January 1610: Io,
             Europa, Ganymede and Callisto, going round Jupiter on their real
             orbits.

             \n\nThe three inner ones do something the outer one does not. Io
             goes round in about 1.77 days, Europa in about 3.55, Ganymede in
             about 7.15. Each is roughly twice the one inside it, so the three
             periods are roughly in the ratio 1 : 2 : 4, and Laplace showed in
             1805 that this is not an accident — the three moons hold each other
             there.

             \n\nThe word for it is <strong>resonance</strong>, and the way it
             is usually explained is by that ratio. This investigation is going
             to take the ratio away from you and see what is left.

             \n\nOne thing to know before you start: <strong>this scenario is a
             scale model.</strong> The Jovian system is a thousandth the size of
             the Solar System scenarios, small enough that Io's orbit would be
             narrower than Jupiter is drawn. So every distance here is a hundred
             times life size, and Newtonian gravity being what it is, that makes
             every duration a thousand times longer. The instrument converts
             back; the app's own distance and time readouts do not. Nothing
             dimensionless — no ratio, no eccentricity, no angle — is affected
             at all.`,
      tip: 'The simulation is paused. Nothing moves until you let it.',
    },
    {
      sid: 'how-close-is-close',
      bind: GALILEANS,
      type: 'predict',
      reveal: 'measure-the-four-periods',
      title: 'How close is close?',
      body: `Before measuring anything: Io and Europa are said to be in a 2:1
             resonance, which is to say Io goes round exactly twice for every
             once that Europa does.`,
      prompt: 'When you measure the two periods, the ratio will be…',
      options: [
        'exactly 2, because that is what "in resonance" means',
        'within about a part in a thousand of 2',
        'within about a part in three hundred of 2',
        'nowhere near 2 — the resonance is about something else',
      ],
      answer: 2,
      because: `About a part in three hundred: the measured ratio is 2.0075,
                which is 0.37% away from 2. That is close, and it is not exact,
                and the gap is far too large to be measurement error. Whatever
                the resonance is doing, it is not making the ratio exactly two.`,
    },
    {
      sid: 'measure-the-four-periods',
      bind: GALILEANS,
      type: 'explore',
      title: 'Measure the four periods',
      // Step 1 paused it so the student could read without four moons moving
      // behind the text. This step says "let it run", so it has to.
      setup: {
        scenario: 'Galilean Resonance',
        seed: 'resonance-lab',
        paused: false,
      },
      tool: { id: 'resonance-periods' },
      body: `Let it run. The instrument below
             measures each moon's period from its orbit — from the energy and
             the distance, the way an astronomer would — and averages over
             everything it has seen, so the numbers settle within a few Io
             orbits. Read the periods here: the app's own inspector shows them a
             thousand times too long, because of the scale model.

             \n\nGive it about half a minute, which is around 150 Io orbits (the
             Fast button in the transport bar shortens the wait), and then read
             the table. It reports each period, the ratio of each moon
             to the one inside it, and the nearest ratio of small whole numbers
             to that.

             \n\nPay attention to the last figure on each row. It says how much
             closer the measured ratio is to a small whole-number ratio than an
             arbitrary number would have been. That figure is the one this
             investigation is about.`,
      tip: HELD,
      checklist: [
        'Let the simulation run for about 150 Io orbits',
        'Read the four periods',
        'Read the three ratios and the nearest small-integer ratio to each',
        'Read how much closer than chance each one is',
      ],
      rubric: `Expect periods of about 1.769, 3.552, 7.155 and 16.69 days, and
               ratios of 2.008, 2.014 and 2.333. Full credit for noticing that
               none of the three is exact and for reporting the "closer than
               chance" figures, which come out around 2, 1 and 25 — that is,
               the outermost pair, which is <em>not</em> in resonance, has by
               far the tidiest ratio.`,
    },
    {
      sid: 'rank-the-three-pairs',
      bind: GALILEANS,
      // Read off the instrument that step sets running.
      requires: ['measure-the-four-periods'],
      type: 'measure',
      title: 'Rank the three pairs',
      tool: { id: 'resonance-periods' },
      body: `The last figure in each ratio row says how many times closer the
             ratio sits to a whole-number ratio than a number picked at random
             would. Once the run has settled, rank the three pairs by that
             figure: 1 for the pair whose figure is the largest, 3 for the
             smallest.`,
      fields: [
        reading('rankEuropa', 'Rank of Europa’s period ÷ Io’s', '', '2'),
        reading(
          'rankGanymede',
          'Rank of Ganymede’s period ÷ Europa’s',
          '',
          '3'
        ),
        reading(
          'rankCallisto',
          'Rank of Callisto’s period ÷ Ganymede’s',
          '',
          '1'
        ),
      ],
      validate: v => {
        const r = [v.rankEuropa, v.rankGanymede, v.rankCallisto];
        if (!r.every(Number.isFinite)) return null;
        if ([...r].sort().join() !== '1,2,3') {
          return {
            level: 'warn',
            message: 'Give each pair a different rank: 1, 2 and 3, once each.',
          };
        }
        if (r.join() !== '2,3,1') {
          return {
            level: 'warn',
            message:
              'Look at the last figure in each row again. The pair with the largest "closer than chance" figure is 1, and the run has to have settled before the order is steady.',
          };
        }
        return {
          level: 'ok',
          message:
            'That is the order the instrument gives. The next question is what the order is evidence of.',
        };
      },
    },
    {
      sid: 'which-is-the-impressive-one',
      bind: GALILEANS,
      // "The three ratios you measured".
      requires: ['rank-the-three-pairs'],
      type: 'question',
      kind: 'choice',
      title: 'Which is the impressive one?',
      body: `You ranked the three pairs by how much closer than chance their
             ratios are. The first step said which moons hold each other in
             resonance. Set that beside your ranking.`,
      prompt:
        'What does that tell you about "the periods are nearly in a small whole-number ratio" as evidence?',
      options: [
        'Nothing — Callisto’s ratio must be a coincidence, and coincidences happen',
        'It is not evidence on its own: the best ratio in the system belongs to the body that is not resonant',
        'The measurement of Callisto’s period must be wrong',
        'Callisto must be in a 7:3 resonance that nobody has noticed',
      ],
      answer: 1,
      because: `The second. Callisto's ratio really is 0.03% from 7:3 — that is
                a real measurement of a real system, not an artifact — and
                Callisto really is not resonant. Any rule that would have
                declared it resonant is a rule that gives wrong answers.

                \n\nAnd the reason is not bad luck. Fractions with small
                denominators are <em>dense</em>: there are about thirty of them
                with denominator ten or less in every unit interval, so an
                arbitrary ratio is typically within a percent or two of one
                without being anywhere near a resonance. Getting within 0.03% is
                unusual — about twenty-five times better than chance — and
                twenty-five times better than chance is not proof of anything.`,
    },
    {
      sid: 'what-a-resonance-actually-is',
      bind: GALILEANS,
      type: 'read',
      title: 'What a resonance actually is',
      body: `Step back from the ratio and ask what the resonance is supposed to
             be <em>doing</em>.

             \n\nTwo moons pull on each other hardest when they are closest,
             which is when they line up on the same side of Jupiter — a
             <strong>conjunction</strong>. Every conjunction gives each of them
             a small kick.

             \n\nIf the conjunctions happen in a different place each time, the
             kicks point in different directions and average away to nothing
             over many orbits. That is the ordinary case, and it is why the
             Solar System is not a chaos of interacting orbits.

             \n\nIf the conjunctions keep happening <em>in the same place</em>,
             the kicks all point the same way and add up. That is a resonance.
             It is a statement about where the line-ups happen, not about the
             ratio of the periods — and the ratio only matters at all because it
             is what decides whether the line-ups repeat.

             \n\nSo the question to ask a pair of bodies is not "are your periods
             nearly commensurate?" It is "<strong>do your conjunctions happen in
             the same place?</strong>"`,
    },

    // --- Act 2: conjunctions -------------------------------------------------
    {
      sid: 'where-do-the-line-ups',
      bind: GALILEANS,
      type: 'predict',
      reveal: 'watch-the-line-ups',
      title: 'Where do the line-ups happen?',
      setup: {
        scenario: 'Galilean Resonance',
        seed: 'resonance-lab',
        paused: false,
      },
      body: `Io and Europa line up about every 3.5 days. Over a run of a hundred
             Io orbits there will be dozens of line-ups.`,
      prompt:
        'Plotted as directions in the sky as seen from Jupiter, those conjunctions will…',
      options: [
        'be spread evenly all round the circle',
        'cluster into a small number of directions and stay there',
        'drift steadily round the circle, one direction at a time',
        'all happen in exactly one direction',
      ],
      answer: 2,
      because: `They drift — steadily and slowly. That is the answer most people
                get wrong, and it is worth having got wrong before the next
                step. The line-ups do not stay in one place in the sky, because
                the orbits themselves turn. What stays put is something subtler,
                and finding it is the rest of this investigation.`,
    },
    {
      sid: 'watch-the-line-ups',
      bind: GALILEANS,
      type: 'explore',
      title: 'Watch the line-ups',
      tool: { id: 'resonance-conjunctions', inner: 'Io', outer: 'Europa' },
      tip: HELD,
      body: `Let it run for a minute or so. Each dot on the left dial is one
             Io–Europa conjunction, plotted by the direction it happened in as
             seen from Jupiter. The right dial plots the same conjunctions by
             where Europa was on its own orbit at the time.

             \n\nThe arrow in each dial is the average direction, and its
             <em>length</em> is how tightly the dots cluster: a long arrow means
             they are all in one place, a stub means they are scattered.`,
      checklist: [
        'Watch the left dial fill in over 50 or more conjunctions',
        'Note whether the dots cluster or spread',
        'Compare with the right dial',
      ],
      rubric: `The left dial should show the conjunctions spread over a broad arc
               rather than pinned to one direction, and the arrow should be
               short. Full credit for reporting the spread honestly rather than
               reporting the clustering the previous step's wrong answer
               predicted.`,
    },
    {
      sid: 'why-the-sky-is-the',
      bind: GALILEANS,
      type: 'question',
      kind: 'choice',
      title: 'Why the sky is the wrong place to look',
      body: `The conjunctions do not stay put in the sky. But the resonance is
             real — the three moons have been locked together for most of the
             age of the Solar System.`,
      prompt:
        'What is wrong with using "the conjunctions happen in a fixed direction" as the test?',
      options: [
        'Nothing is wrong with it; the resonance must be weaker than advertised',
        'A direction in the sky is measured against a fixed frame, and nothing about an orbit is fixed in that frame — the orbits themselves precess',
        'Conjunctions are too hard to time accurately',
        'The test only works for pairs, and there are three moons here',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'weakerResonance',
          option: 0,
          say: 'The line-ups did drift in the sky and the moons are still locked, so it is the test that fails, not the resonance. Ask what in the sky stays fixed while an orbit’s long axis turns.',
        },
        {
          id: 'timingIsHard',
          option: 2,
          say: 'The instrument timed them without trouble. What is wrong is what they are measured against, not how well they are timed.',
        },
        {
          id: 'pairsOnly',
          option: 3,
          say: 'The test could be tried on any one pair of the three. Look instead at the frame a direction in the sky is measured in.',
        },
      ],
      because: `An orbit is not a fixed thing. Its long axis turns — precesses —
                because of the pull of the other moons, so a conjunction that
                happens at the same point <em>of the orbit</em> every time will
                still slide round the sky as the orbit does.

                \n\nWhich tells you what to measure instead. Not the direction
                in space, but the geometry <em>relative to the orbits
                themselves</em>. That is exactly what a resonant angle is, and
                it is why the definition looks as fussy as it does.`,
    },

    // --- Act 3: the resonant angle -------------------------------------------
    {
      sid: 'the-resonant-angle',
      bind: GALILEANS,
      type: 'read',
      title: 'The resonant angle',
      body: `Here is the construction. It looks arbitrary the first time and it
             is not.

             \n\nEvery orbiting body has a <strong>mean longitude</strong>, λ:
             where it would be if it went round at a steady rate, measured from
             a fixed direction. It increases by 360° every orbit, at a rate set
             by the period. It also has a <strong>longitude of periapsis</strong>,
             ϖ: the direction of the orbit's closest point. That one barely
             moves, and moves slowly when it does.

             \n\nNow take a combination like

             \n\n<strong>φ = 3λ<sub>outer</sub> − 2λ<sub>inner</sub> −
             ϖ<sub>outer</sub></strong>

             \n\nand notice what the coefficients do. If the two periods really
             are in a 3:2 ratio, then 3λ<sub>outer</sub> and 2λ<sub>inner</sub>
             increase at the <em>same</em> rate, and the difference between them
             stands still. The fast motion cancels out. What is left is a slow
             angle that says where the conjunctions fall relative to the outer
             body's own perihelion — the thing that does not precess away.

             \n\nThe coefficients must add up to zero — 3 − 2 − 1 = 0 — and that
             is not a convention. It is what makes the angle independent of
             where you chose to point your x-axis. A combination that does not
             sum to zero measures your coordinate system rather than the orbits.

             \n\nSuch an angle does exactly one of two things:

             \n\n<strong>It circulates.</strong> It runs through all 360°, over
             and over. The conjunctions take up every geometry in turn and the
             kicks average away. No resonance.

             \n\n<strong>It librates.</strong> It swings back and forth about
             one value and never completes a circuit. The conjunctions keep
             happening in the same place relative to the orbit, the kicks add up,
             and the two bodies hold each other there. <em>That</em> is a
             resonance, and it is the only thing that is.`,
    },
    {
      sid: 'the-laplace-argument',
      bind: GALILEANS,
      type: 'predict',
      reveal: 'watch-the-laplace-argument',
      title: 'The Laplace argument',
      body: `For the three inner moons the right combination involves all three
             at once, and Laplace found it in 1805:

             \n\n<strong>φ<sub>L</sub> = λ<sub>Io</sub> − 3λ<sub>Europa</sub> +
             2λ<sub>Ganymede</sub></strong>

             \n\nThe coefficients 1 − 3 + 2 sum to zero, so no longitude of
             periapsis is needed at all — which is useful here, because these
             orbits are nearly circular and their perihelion directions are
             hard to pin down.`,
      prompt: 'Over a long run, φ_L will…',
      options: [
        'run through all 360° once every few Io orbits',
        'sit at one value and never move at all',
        'swing back and forth about a fixed value without ever going all the way round',
        'drift slowly and steadily in one direction',
      ],
      answer: 2,
      because: `It librates: it swings back and forth about a fixed value and
                never goes all the way round. Where that value sits, how wide the
                swing is and how long it takes are yours to read off the
                instrument a few steps on. The instrument will refuse to confirm
                it for the first minute and a half, and the reason it refuses is
                the next thing worth understanding.`,
    },
    {
      sid: 'watch-the-laplace-argument',
      bind: GALILEANS,
      allowInspector: true,
      probe: laplaceRows,
      type: 'explore',
      title: 'Watch the Laplace argument',
      tool: { id: 'resonance-angle', argument: 'laplace' },
      tip: HELD,
      body: `<strong>Leave it running.</strong>
             At normal speed this one takes about three and a half minutes (the
             Fast button in the transport bar shortens the wait), and the way it
             changes its mind is the point.

             \n\nThe upper plot is φ<sub>L</sub> folded into a single turn. The
             lower one is the same angle unwrapped, so a circulation would be a
             straight ramp and a libration is a wave.

             \n\nWatch the verdict line in the readout as the run goes on. It
             will say three different things, in this order:

             \n\n<strong>Inconclusive — confined.</strong> The angle has hardly
             moved, but it has not turned back either, and an angle circulating
             slowly enough would look exactly the same.

             \n\n<strong>Inconclusive — it has turned back once.</strong>
             Better, and still not proof: an angle on its way round with a
             wobble on it also turns back once.

             \n\n<strong>Libration.</strong> It turned, came back, and returned
             to where it started. Now it is established.

             \n\nThe first change comes at about eighty seconds and the second at
             about three and a half minutes. Read the next two steps while you
             wait, and come back to it.`,
      checklist: [
        'Start the run and note the first verdict',
        'Note when it changes to "turned back once"',
        'Wait for the libration verdict',
        'Read the center, the amplitude and the libration period',
      ],
      rubric: `Expect a libration centered within a degree or two of 180° with an
               amplitude near 26°, and a libration period near 1,200 Io orbits —
               about 2,100 days. Full credit requires reporting all three
               <em>and</em> noticing that the instrument declined to give an
               answer for the first part of the run.`,
    },
    {
      sid: 'why-the-instrument-refuses',
      bind: GALILEANS,
      type: 'read',
      title: 'Why the instrument refuses',
      body: `An instrument that always gives an answer is not measuring
             anything, and this one is built to say so.

             \n\nSuppose you watch a resonant angle for a while and it moves 20°.
             Two explanations fit:

             \n\n<strong>It is librating</strong> with an amplitude of at least
             10°, and you have caught part of one swing.

             \n\n<strong>It is circulating</strong>, very slowly — at 20° per
             run it would take eighteen runs to get all the way round.

             \n\nNothing in the record distinguishes them. Not the smoothness,
             not the size, not the shape. Only watching until it turns back
             does, and if it has not turned back yet then the honest answer is
             that you do not know.

             \n\nSo the instrument reports three states, not two: circulation,
             libration, and <em>inconclusive</em>. When it is inconclusive it
             tells you what it has ruled out — "any circulation would take more
             than a thousand conjunction cycles" — which is a real result and
             not the same as a resonance.

             \n\nHold on to this. In a few steps you are going to meet a body
             whose angle stays inconclusive for the whole investigation, and the
             temptation to call it resonant will be considerable.`,
    },
    {
      sid: 'capture-the-laplace-libration',
      bind: GALILEANS,
      allowInspector: true,
      probe: laplaceRows,
      // Taken from the angle instrument once it has reached its verdict,
      // which takes the run that step starts.
      requires: ['watch-the-laplace-argument'],
      type: 'measure',
      title: 'Capture the Laplace libration',
      tool: { id: 'resonance-angle', argument: 'laplace' },
      body: `Take the center, the amplitude and the libration period from the
             instrument you ran. Before its verdict reads LIBRATION the amplitude
             is only a lower bound and the period a guess from one swing, so
             deciding when the run is long enough is part of the measurement. If
             you took a reading too soon, let the run go on and take it again.`,
      fields: [
        reading('center', 'libration center', 'degrees', '180', 'center'),
        reading('amplitude', 'amplitude', 'degrees', '26', 'amplitude'),
        reading('period', 'libration period', 'days', '2100', 'period'),
      ],
      validate: v => {
        if (!Number.isFinite(v.center)) return null;
        const off = Math.abs(((((v.center - 180) % 360) + 540) % 360) - 180);
        if (off > 20) {
          return {
            level: 'warn',
            message:
              'The center should be within a few degrees of 180. A value near 0 usually means the angle was read with a sign reversed.',
          };
        }
        if (Number.isFinite(v.amplitude) && v.amplitude > 180) {
          return {
            level: 'error',
            message:
              'An amplitude above 180° is more than the whole circle and would mean the angle had circulated.',
          };
        }
        if (Number.isFinite(v.amplitude) && v.amplitude < AMPLITUDE_FLOOR) {
          return {
            level: 'error',
            message:
              'That amplitude is still growing: it was taken before the angle had turned back, so it is only a lower bound. Let the run go on until the verdict reads LIBRATION and take it again.',
          };
        }
        if (Number.isFinite(v.period) && (v.period < 1200 || v.period > 3200)) {
          return {
            level: 'warn',
            message:
              'The libration period should come out near 2,100 days. A much shorter value usually means the instrument is still reporting a provisional period from a single swing.',
          };
        }
        return {
          level: 'ok',
          message:
            'That is what this model gives, and it is worth comparing with the real thing: the observed Laplace libration period is 2,071 days. The amplitude is not comparable — the real one is a few hundredths of a degree (0.03 to 0.06 depending on the source), because the real moons sit far closer to the exact center of the resonance than these starting conditions do.',
        };
      },
    },
    {
      sid: 'what-180-means',
      bind: GALILEANS,
      type: 'question',
      title: 'What 180° means',
      kind: 'numeric',
      body: `φ<sub>L</sub> = λ<sub>Io</sub> − 3λ<sub>Europa</sub> +
             2λ<sub>Ganymede</sub> librates about the center you captured.

             \n\nConsider a moment when Io and Europa are in conjunction, so
             λ<sub>Io</sub> = λ<sub>Europa</sub>. Work out what that says about
             Ganymede.`,
      prompt:
        'How many degrees away from Europa is Ganymede whenever Io and Europa line up?',
      unit: 'degrees',
      answer: 90,
      tolerance: 0.1,
      because: `Ninety degrees — a quarter of the way round. Which is the whole
                content of the Laplace resonance in one sentence:
                <strong>the three moons are never all in conjunction at
                once.</strong> Whenever two of them line up, the third is a
                quarter turn away.

                \n\nThat is what the lock protects. Three moons meeting in the
                same place would pull each other hard in the same direction
                every time it happened, and the configuration would not
                survive. The resonance is the arrangement that makes the meeting
                impossible.`,
      hints: [
        'After the substitution only two longitudes are left. What combination of them remains?',
        'The expression is twice the angle between Ganymede and Europa.',
        'It must equal the angle φ holds. Divide by whatever multiplies the angle you want.',
      ],
      feedback: {
        close:
          'Close, but this one is exact. Substitute your angle back: does it give the angle φ must hold?',
        'wrong-sign': 'Give the size of the angle, not its direction.',
        'wrong-unit': 'That looks like radians. The question wants degrees.',
        'wrong-order-of-magnitude':
          'Out by a power of ten. An angle between two bodies in orbit is at most a few hundred degrees.',
        off: 'Look at the collapsed expression: it is a multiple of one angle. Set it equal to the value φ holds and solve for the angle.',
      },
    },

    // --- Act 4: breaking it, and the awkward case ----------------------------
    {
      sid: 'one-percent',
      bind: GALILEANS,
      type: 'predict',
      reveal: 'break-it',
      title: 'One percent',
      body: `Next you will run the same four moons with a single number changed:
             Europa starts one percent further out. Nothing else differs — same
             masses, same eccentricities, same starting angles.

             \n\nOne percent in distance is about 1.5% in period, so Europa's
             period goes from 2.0075 times Io's to about 2.037.`,
      prompt: 'The Laplace argument in the changed system will…',
      options: [
        'librate about 180° with a slightly larger amplitude',
        'librate about a different center',
        'circulate — go all the way round, over and over',
        'be unchanged, because one percent is a small change',
      ],
      answer: 2,
      because: `It circulates, and quickly: a complete circuit about every
                forty-seven Io orbits. The resonance holds Europa's semi-major
                axis to about one part in a thousand; one part in a hundred is
                ten times outside it, and outside it there is nothing.`,
    },
    {
      sid: 'break-it',
      bind: GALILEANS,
      allowInspector: true,
      probe: laplaceRows,
      type: 'explore',
      title: 'Break it',
      setup: {
        scenario: 'Broken Laplace Resonance',
        seed: 'resonance-lab',
        paused: false,
      },
      tool: { id: 'resonance-angle', argument: 'laplace' },
      tip: HELD,
      body: `The same system with Europa moved out one percent. Watch the two
             plots.

             \n\nOn the wrapped plot the angle now sweeps through every value
             instead of hovering. On the unwrapped plot it is a ramp instead of
             a wave. The verdict should read CIRCULATION within about ten
             seconds — which is worth comparing with the three and a half
             minutes the resonant case needed before it would commit.

             \n\nThat asymmetry is not a defect. Circulation is easy to prove:
             one completed circuit does it. Libration takes longer because
             ruling out a slow circulation takes longer.`,
      checklist: [
        'Note how long the verdict takes to appear',
        'Read the circulation period',
        'Compare the shape of both plots with the resonant case',
      ],
      rubric: `Expect CIRCULATION with a period near 47 Io orbits, reported
               within the first few seconds of the run. Full credit for
               contrasting how quickly this verdict arrives with how long the
               libration verdict took, and for saying why.`,
    },
    {
      sid: 'what-the-pair-of-runs',
      bind: GALILEANS,
      type: 'question',
      kind: 'choice',
      title: 'What the pair of runs establishes',
      body: `Two runs, differing in one number. In one the Laplace argument
             librates; in the other it circulates.`,
      prompt: 'What does the pair establish that either run alone would not?',
      options: [
        'That the resonance depends on Europa’s distance, and that the librating angle is a property of the configuration rather than of the instrument',
        'That the instrument is unreliable, since it gives different answers for nearly identical systems',
        'That one percent is a large change',
        'Nothing — the two runs are of different systems and cannot be compared',
      ],
      answer: 0,
      because: `The first. A single librating angle could in principle be an
                artifact — of the integrator, of the way the angle was defined,
                of the plotting. The control rules that out: the same
                instrument, the same integrator, the same angle definition, the
                same starting geometry, and one number different, and it
                circulates. Whatever the instrument is measuring, it is
                something about the system.

                \n\nThis is the shape of a controlled experiment, and the
                A/B Bench in Tools is built for running them. It is worth
                capturing both of these as a pair if you want the comparison in
                your report.`,
    },
    {
      sid: 'the-awkward-case',
      bind: GALILEANS,
      type: 'explore',
      title: 'The awkward case',
      setup: {
        scenario: 'Galilean Resonance',
        seed: 'resonance-lab',
        paused: false,
      },
      tool: {
        id: 'resonance-angle',
        inner: 'Ganymede',
        outer: 'Callisto',
      },
      tip: HELD,
      body: `Back to the intact system, and now to Callisto — the one with the
             tidiest ratio in the whole system.

             \n\nThe instrument has found the nearest small-integer ratio to
             Callisto's period over Ganymede's, which is 7:3, and built the
             argument that goes with it:

             \n\n<strong>7λ<sub>Callisto</sub> − 3λ<sub>Ganymede</sub> −
             4ϖ<sub>Callisto</sub></strong>

             \n\nCoefficients 7 − 3 − 4 = 0, as they must. This is exactly what
             you would do if you believed the ratio.

             \n\nRun it for two or three minutes and watch what the verdict
             does. Then read the readout carefully — particularly the line that
             says what is missing.`,
      checklist: [
        'Let it run for at least two minutes',
        'Note every verdict it reports, in order',
        'Read the bound it gives on any circulation',
        'Note the amplitude, and whether the instrument calls it a bound',
      ],
      rubric: `Expect the verdict to move from "confined" through "the center is
               moving" or "it has turned back once", and never to reach
               LIBRATION. Full credit for reporting the sequence rather than the
               endpoint, and for noticing that the reported amplitude keeps
               growing — which is the tell.`,
    },
    {
      sid: 'the-best-ratio-in-the',
      bind: GALILEANS,
      type: 'question',
      kind: 'choice',
      title: 'The best ratio in the system',
      body: `A colleague has looked at your run of Callisto's 7:3 argument, the
             one whose amplitude you watched as it went, and disagrees with what
             the instrument said about it.`,
      prompt:
        'A colleague says the instrument should have called Callisto resonant, because its angle stayed within 100° for the whole run. What is the best reply?',
      options: [
        'They are right — 100° out of 360° is confinement, and confinement is what a resonance is',
        'Staying within 100° is what a slow circulation looks like early on; the amplitude the instrument reported kept growing, which a libration’s would not',
        'The angle was the wrong one — a different combination would have librated',
        'The run was too short to say anything at all about Callisto',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'confinedIsLibration',
          option: 0,
          say: 'Staying inside 100° says only that no circuit has been completed yet, and a slow circulation looks the same early on. Ask what the amplitude did as the run went on.',
        },
      ],
      because: `The second, and the growing amplitude is the specific evidence.
                A libration returns to the same extremes: its maxima are all at
                about the same value, run after run. Callisto's each exceeded
                the last, so the center was moving, and an angle whose center
                moves is on its way round.

                \n\nThe fourth option is tempting and slightly wrong. The run
                <em>did</em> establish something: any circulation is slower than
                a few hundred conjunction cycles. That is a genuine constraint.
                It just is not a resonance. Over a long enough run Callisto's
                argument does complete a circuit, in roughly three thousand Io
                orbits, which a class-length run cannot see and says so.`,
    },

    // --- Act 5: Pluto --------------------------------------------------------
    {
      sid: 'the-orbit-that-crosses-and',
      bind: GALILEANS,
      type: 'read',
      title: 'The orbit that crosses and never collides',
      setup: {
        scenario: 'Pluto and Neptune',
        seed: 'resonance-lab',
        paused: true,
      },
      body: `Pluto's orbit crosses Neptune's. At perihelion Pluto is 29.7 AU from
             the Sun; Neptune's orbit is at 30.1. For twenty years out of every
             248, Pluto is the eighth planet.

             \n\nThis was noticed as soon as Pluto's orbit was known, and it was
             a problem: two bodies on crossing orbits should eventually meet,
             and on Solar System timescales "eventually" is not long. Yet Pluto
             has been there for billions of years.

             \n\nCohen and Hubbard found the answer in 1965 by integrating the
             orbit forward: Pluto and Neptune are in a 3:2 resonance. Pluto goes
             round twice for every three Neptune years, and the resonant
             argument

             \n\n<strong>φ = 3λ<sub>Pluto</sub> − 2λ<sub>Neptune</sub> −
             ϖ<sub>Pluto</sub></strong>

             \n\nlibrates about 180° rather than circulating.

             \n\nThis scenario is at true scale — every distance and period the
             app reports is the real one — but it runs fast: about 270 years a
             second, because a single libration of that angle takes twenty
             thousand years. A third body is included, on almost the same orbit
             but outside the resonance. Watch what happens to it.`,
      tip: 'Two departures from reality, both stated in the model: Gravitas is two-dimensional, so Pluto’s 17° inclination is projected away, and Pluto starts on the exact 3:2 rather than at its observed distance. Neither affects the argument you are about to measure.',
    },
    {
      sid: 'measure-pluto-s-resonance',
      bind: GALILEANS,
      type: 'explore',
      title: 'Measure Pluto’s resonance',
      setup: {
        scenario: 'Pluto and Neptune',
        seed: 'resonance-lab',
        paused: false,
      },
      tool: { id: 'resonance-angle', argument: 'pluto' },
      tip: HELD,
      body: `Let it run for a minute and a half. This one reaches its verdict
             quickly — the libration is wide and fast enough in these units that
             the angle turns back twice inside ninety seconds.

             \n\nWatch the unwrapped plot. This is what a libration looks like
             when there is no ambiguity about it at all: a clean wave, turning
             back at the same two levels every time, with the band the
             instrument fitted shaded behind it.`,
      checklist: [
        'Run for about ninety seconds',
        'Read the verdict, the center and the amplitude',
        'Read the libration period in years',
        'Watch the third body — the Unbound Wanderer — on the main view',
      ],
      rubric: `Expect LIBRATION about 180° with an amplitude near 80° and a
               period near 19,600 years. The published values are 180°, about
               82°, and about 20,000 years. Full credit for all three plus the
               observation that the wanderer's angle circulates.`,
    },
    {
      sid: 'capture-pluto-s-libration',
      bind: GALILEANS,
      // Taken from the run that step starts.
      requires: ['measure-pluto-s-resonance'],
      type: 'measure',
      title: 'Capture Pluto’s libration',
      tool: { id: 'resonance-angle', argument: 'pluto' },
      body: `Take the center and the amplitude from the instrument you ran, and
             the libration period in years. The instrument gives the period in
             days; the conversion is yours. As with the moons, a reading taken
             before the verdict says LIBRATION is only a bound.`,
      fields: [
        reading('plutoCenter', 'libration center', 'degrees', '180', 'center'),
        reading('plutoAmplitude', 'amplitude', 'degrees', '80', 'amplitude'),
        reading('plutoPeriod', 'libration period', 'years', '19600'),
      ],
      validate: v => {
        if (!Number.isFinite(v.plutoCenter)) return null;
        const off = Math.abs(
          ((((v.plutoCenter - 180) % 360) + 540) % 360) - 180
        );
        if (off > 15) {
          return {
            level: 'warn',
            message:
              'The center should be close to 180°. A center near 0 would mean conjunctions at Pluto’s perihelion, which is the opposite of what protects it.',
          };
        }
        if (
          Number.isFinite(v.plutoAmplitude) &&
          v.plutoAmplitude < PLUTO_FLOOR
        ) {
          return {
            level: 'error',
            message:
              'That amplitude is only a bound: the instrument had not yet seen the angle turn back twice. Let the run go on until the verdict reads LIBRATION and take it again.',
          };
        }
        if (Number.isFinite(v.plutoAmplitude) && v.plutoAmplitude > 110) {
          return {
            level: 'warn',
            message:
              'Expected an amplitude near 80°. A value this large usually means the unwrapped angle was read instead of the amplitude.',
          };
        }
        if (
          Number.isFinite(v.plutoPeriod) &&
          (v.plutoPeriod < 12000 || v.plutoPeriod > 30000)
        ) {
          return {
            level: 'warn',
            message:
              'Expected about 19,600 years. The instrument gives days: divide by 365.25, and check you have read the period and not the number of conjunction cycles beside it.',
          };
        }
        return {
          level: 'ok',
          message:
            'Those are close to the published values: 180°, about 82°, and a period of about 20,000 years (sources give 19,900 to 20,000). The model’s period is within about 2% of that, and it does it with a two-dimensional model that starts exactly on the 3:2.',
        };
      },
    },
    {
      sid: 'where-the-line-ups-happen',
      bind: GALILEANS,
      type: 'explore',
      title: 'Where the line-ups happen',
      tool: {
        id: 'resonance-conjunctions',
        inner: 'Neptune',
        outer: 'Pluto',
      },
      tip: HELD,
      body: `Now the same run, seen as conjunctions. The left dial is where
             Pluto and Neptune line up as seen from the Sun; the right dial is
             where Pluto was on its own orbit when they did.

             \n\nCompare the two arrows. One is short and one is long, and the
             difference between them is the whole protection mechanism.`,
      checklist: [
        'Compare the spread in the two dials',
        'Read the mean position on the outer orbit',
        'Read the line the instrument gives under "Which means"',
      ],
      rubric: `The left dial should be a broad smear; the right should cluster
               near 180°, which is aphelion, with a spread of about 38°. Full
               credit for reporting that every Pluto–Neptune conjunction happens
               near Pluto's furthest point from the Sun.`,
    },
    {
      sid: 'why-180-protects-pluto',
      bind: GALILEANS,
      type: 'question',
      kind: 'choice',
      title: 'Why 180° protects Pluto',
      body: `Take the argument φ = 3λ<sub>Pluto</sub> − 2λ<sub>Neptune</sub> −
             ϖ<sub>Pluto</sub> and evaluate it at a conjunction, where the two
             mean longitudes are equal. Call that common value
             λ<sub>c</sub>. Then

             \n\nφ = 3λ<sub>c</sub> − 2λ<sub>c</sub> − ϖ<sub>Pluto</sub> =
             λ<sub>c</sub> − ϖ<sub>Pluto</sub>

             \n\nand ϖ<sub>Pluto</sub> is the direction of Pluto's perihelion.`,
      prompt: 'φ librates about 180°, so at every conjunction Pluto is…',
      options: [
        'at perihelion, closest to the Sun',
        'half a revolution from perihelion — at aphelion, furthest from the Sun',
        'a quarter of a revolution from perihelion',
        'in a different place each time, since φ is not exactly 180°',
      ],
      answer: 1,
      because: `At aphelion. The one line of algebra above is the entire
                mechanism: φ = 180° <em>is</em> the statement that conjunctions
                happen half a revolution from Pluto's perihelion.

                \n\nPluto crosses Neptune's orbit near perihelion, at 29.7 AU.
                It reaches aphelion at 49.3 AU. So the resonance arranges for
                Neptune to be somewhere else entirely whenever Pluto is at the
                dangerous part of its orbit, and for the two to meet only when
                Pluto is nearly twenty AU beyond Neptune's reach. In this run
                the closest they come is 16.6 AU; the real figure, with Pluto's
                inclination included, is 17.2.

                \n\nThe fourth option is worth a moment. φ is not exactly 180° —
                it swings 80° either side — and that is why the conjunctions
                spread over about 38° of Pluto's orbit rather than landing on a
                single point. The protection does not need them to land on a
                point. It needs them to stay away from perihelion, and an 80°
                libration about 180° does that with room to spare.`,
    },

    // --- Act 6: the Trojans --------------------------------------------------
    {
      sid: 'sixty-degrees-ahead',
      bind: GALILEANS,
      type: 'read',
      title: 'Sixty degrees ahead',
      setup: {
        scenario: 'Jupiter Trojans',
        seed: 'resonance-lab',
        paused: true,
      },
      body: `The last case is the strangest, and it is a resonance too — a 1:1.

             \n\nLagrange showed in 1772 that if you put a third, light body at
             the far corner of an equilateral triangle with the Sun and Jupiter,
             the forces on it come out exactly right: it circles the Sun at
             Jupiter's rate and keeps its position relative to Jupiter forever.
             There are two such corners, 60° ahead and 60° behind, called L4 and
             L5. More than fifteen thousand asteroids are known at them.

             \n\nGascheau proved in 1843 that these two points are stable only
             when the primary is more than 24.96 times the secondary. The Sun is
             1,047 times Jupiter, so they are. There is a third equilibrium, L3,
             directly opposite Jupiter — and that one is not stable, which is
             the comparison this scenario is built around.

             \n\nNone of this is visible from outside. In the inertial frame a
             Trojan just goes round the Sun on an orbit that looks exactly like
             Jupiter's. You have to <strong>rotate with Jupiter</strong> to see
             anything at all, which is what the next instrument does.

             \n\nFour test bodies are in the scene: one placed exactly at L4, the
             real Trojan 617 Patroclus displaced from L5, a probe one degree
             from L3, and one on an ordinary circular orbit a quarter again as
             wide.`,
    },
    {
      sid: 'the-rotating-frame',
      bind: GALILEANS,
      type: 'explore',
      title: 'The rotating frame',
      setup: {
        scenario: 'Jupiter Trojans',
        seed: 'resonance-lab',
        paused: false,
      },
      tool: { id: 'resonance-frame', secondary: 'Jupiter' },
      tip: HELD,
      body: `Run it for a minute and a half. In this view Jupiter is pinned at
             the right, one unit from the Sun, and the two crosses are L4 and
             L5 — exactly the corners of the equilateral triangles.

             \n\nFour bodies, four different things:

             \n\nThe <strong>L4 probe</strong> sits on its cross and does not
             move. That is what an equilibrium is.

             \n\n<strong>Patroclus</strong> draws a long flat loop around L5.
             This is a <em>tadpole</em> orbit, and it is what a real Trojan
             does: it does not sit at the point, it circles it.

             \n\nThe <strong>L3 probe</strong> started one degree from an
             equilibrium and leaves. Watch how far it gets.

             \n\nThe <strong>wide orbit probe</strong> is not co-orbital at all,
             and in this frame it simply goes round and round.

             \n\nThe readout classifies each one. It needs about twenty Jupiter
             years before it will commit to anything, which is about forty-five
             seconds.`,
      checklist: [
        'Identify all four bodies in the rotating frame',
        'Read the verdict for each',
        'Note the center and amplitude for Patroclus',
        'Note how far the L3 probe travels',
      ],
      rubric: `Expect: the L4 probe reported as an equilibrium with an amplitude
               of 0°; Patroclus librating about roughly −64° (that is, 296°)
               with an amplitude near 24° and a period near 13 Jupiter years;
               the L3 probe swinging more than 150° away from where it started;
               the wide probe circulating. Full credit for all four and for
               using the rotating frame rather than the main view to read them.`,
    },
    {
      sid: 'capture-the-tadpole',
      bind: GALILEANS,
      // Taken from the frame instrument that step sets running.
      requires: ['the-rotating-frame'],
      type: 'measure',
      title: 'Capture the tadpole',
      tool: { id: 'resonance-frame', secondary: 'Jupiter', read: 'Patroclus' },
      body: `Patroclus is a real object and this is a real measurement of the
             kind made for it. Take its libration center, amplitude and period
             from the frame instrument once it has committed to a verdict for
             it.

             \n\nThe theoretical small-amplitude tadpole period, from the
             linearized restricted three-body problem, is
             P<sub>Jupiter</sub> ÷ √(27μ/4) with μ Jupiter's share of the total
             mass — which works out at 12.47 Jupiter years, about 148 years.`,
      fields: [
        reading(
          'tadpoleCenter',
          'libration center, measured from Jupiter',
          'degrees',
          '296',
          'center'
        ),
        reading('tadpoleAmplitude', 'amplitude', 'degrees', '24', 'amplitude'),
        reading('tadpolePeriod', 'libration period', 'years', '154', 'period'),
      ],
      validate: v => {
        if (!Number.isFinite(v.tadpoleCenter)) return null;
        const c = ((v.tadpoleCenter % 360) + 360) % 360;
        const fromL5 = Math.abs(c - 300);
        const fromL4 = Math.abs(c - 60);
        if (fromL4 < 20) {
          return {
            level: 'warn',
            message:
              'That is L4, the leading point. Patroclus is in the trailing camp, so its center should be near −60°, which the instrument reports as about 296°.',
          };
        }
        if (fromL5 > 25) {
          return {
            level: 'warn',
            message:
              'Expected a center near 296° — that is 60° behind Jupiter, which is L5.',
          };
        }
        if (
          Number.isFinite(v.tadpoleAmplitude) &&
          v.tadpoleAmplitude < TADPOLE_FLOOR
        ) {
          return {
            level: 'error',
            message:
              'That amplitude was taken before the instrument had committed to a libration, so it is not the swing Patroclus makes. Let the run go on and take it again.',
          };
        }
        if (
          Number.isFinite(v.tadpolePeriod) &&
          (v.tadpolePeriod < 107 || v.tadpolePeriod > 214)
        ) {
          return {
            level: 'warn',
            message:
              'Expected about 154 years (13 Jupiter years), against a theoretical 148. A value near 12 means you have read Jupiter’s own orbital period instead.',
          };
        }
        return {
          level: 'ok',
          message:
            'That is the tadpole. The measured period is a few percent above the 148 years (12.47 Jupiter years) that the linear theory gives for a vanishingly small swing, and a 24° libration is not one, so the gap is expected. The figure you read moves a little with the length of the run.',
        };
      },
    },
    {
      sid: 'two-equilibria-one-survivor',
      bind: GALILEANS,
      type: 'question',
      kind: 'choice',
      title: 'Two equilibria, one survivor',
      body: `L3, L4 and L5 are all equilibrium points: a body placed exactly at
             any of them stays there. The L4 probe in this run demonstrates
             that. The L3 probe started one degree away and, within about thirty
             Jupiter years, had swung more than 150° from where it began.`,
      prompt: 'What is the difference between L4 and L3?',
      options: [
        'L3 is not really an equilibrium; the one-degree offset shows the calculation is wrong',
        'Both are equilibria, but only L4 is stable: a small displacement from L4 produces a force back towards it, and from L3 a force away',
        'L3 is further from Jupiter, so Jupiter’s pull is too weak to hold anything there',
        'L3 is unstable because the probe was given the wrong velocity',
      ],
      answer: 1,
      misconceptions: [
        {
          id: 'l3IsWrong',
          option: 0,
          say: 'A point can be an equilibrium and still lose whatever is nudged off it. One degree is all the probe was given, so the offset shows the point is unstable, not that the calculation is wrong.',
        },
        {
          id: 'tooFarOut',
          option: 2,
          say: 'Distance alone does not decide it: the L4 and L5 points are as far out as L3. Ask which way the force points once a body is nudged off each of them.',
        },
        {
          id: 'wrongVelocity',
          option: 3,
          say: 'The probe was displaced by one degree, as the text says. What differs between L3 and L4 is what the force does after a small displacement.',
        },
      ],
      because: `Both are equilibria; only L4 and L5 are stable. The distinction
                is the same one as between a marble at the bottom of a bowl and
                a marble balanced on top of a dome. Both are places where the
                net force is zero. Only one of them survives being nudged.

                \n\nAt L3 a small displacement grows exponentially, with an
                e-folding time of about three Jupiter years, so one degree
                becomes a hundred and eighty in roughly twenty-five — which is
                what you watched. It does not escape the system: it settles into
                a <em>horseshoe</em>, a much wider co-orbital orbit that carries
                it right past both triangular points and back. Still a 1:1
                resonance, and a completely different shape of one.

                \n\nAnd it is why there are no asteroids at L3 and more than fifteen
                thousand at L4 and L5. Stability is not a detail; it is the whole reason
                a population exists.`,
    },
    {
      sid: 'predict-the-wide-probe',
      bind: GALILEANS,
      type: 'predict',
      reveal: 'one-last-ratio',
      title: 'A body on a wider orbit',
      body: `The fourth body in this scene is on an ordinary circular orbit a
             quarter again as wide as Jupiter's. The instrument will find the
             nearest ratio of small whole numbers to its period over Jupiter's,
             build the resonant argument that goes with it and report both. The
             ratio will turn out to be within about half a percent of 7:5, two
             to five times closer than a number picked at random would be.`,
      prompt: 'Is the wide probe in resonance with Jupiter?',
      options: [
        'Yes: a ratio that close to a whole-number ratio is the mark of a lock',
        'No: its angle will go all the way round, however close the ratio looks',
        'Yes, but too weakly for the angle to show it',
        'Not yet: a near-commensurate ratio locks if the run is long enough',
      ],
      answer: 1,
      because: `The second. The probe's ratio settles near 1.406, about 0.3 to
                0.5% from 7:5 and two to five times closer than chance (the
                figure moves a little as the instrument averages). That is the
                kind of near-miss the ratio rule would call a resonance, and the
                angle circulates: it runs through every value, so there is no
                lock. A ratio is a reason to look; the angle is the evidence.`,
    },
    {
      sid: 'one-last-ratio',
      bind: GALILEANS,
      type: 'explore',
      title: 'One last ratio',
      tool: {
        id: 'resonance-angle',
        inner: 'Jupiter',
        outer: 'Wide orbit probe',
      },
      tip: HELD,
      body: `The fourth body in this scene is on an ordinary circular orbit a
             quarter again as wide as Jupiter's. Its period ratio with Jupiter
             comes out near 1.406.

             \n\nThe instrument has found the nearest small ratio to that and
             built the corresponding argument. Look at what it found, and at how
             close it is. The offset and the closer-than-chance figure move a
             little as the run goes on, so read them when the verdict arrives.

             \n\nThen look at the verdict. If it says the run is still too short, let
             it go on until “Watched for” reads about twenty conjunction cycles.`,
      checklist: [
        'Read the nearest small-integer ratio and the percentage offset',
        'Set the closer-than-chance figure beside the moons’ and Pluto’s',
        'Wait for the verdict on the argument and read it',
      ],
      rubric: `The instrument should report a nearest ratio of 7:5, an offset of
               about 0.3 to 0.5% (settling near 0.45%) and a figure of two to
               five times closer than chance (settling near 2.5). That is as
               good as the resonant moons' ratios and a little looser than
               Pluto's 0.30%. The verdict for the argument should be
               circulation once about twenty conjunction cycles have passed.
               Full credit for stating the conclusion: a ratio this close to a
               whole-number ratio, and no resonance at all.`,
    },

    // --- Act 7: what counts as evidence --------------------------------------
    {
      sid: 'what-you-can-and-cannot',
      bind: GALILEANS,
      type: 'read',
      title: 'What you can and cannot conclude from a ratio',
      body: `Collect the four cases.

             \n\n<strong>Io–Europa–Ganymede.</strong> Ratios about 0.4% and
             0.7% from 2:1 — roughly twice as good as chance. The Laplace argument
             librates about 180° with a period of 2,100 days. <em>Resonant.</em>

             \n\n<strong>Callisto–Ganymede.</strong> Ratio 0.03% from 7:3 —
             twenty-five times better than chance, the tidiest in the system.
             The argument drifts, its swings each ending further on than the
             last. <em>Not resonant.</em>

             \n\n<strong>Pluto–Neptune.</strong> Ratio 0.30% from 3:2 — four
             times better than chance. The argument librates about 180° with a
             period of 19,600 years. <em>Resonant.</em>

             \n\n<strong>The wide probe–Jupiter.</strong> Ratio about 0.3 to
             0.5% from 7:5 — two to five times better than chance, as good as
             the moons'. The angle circulates. <em>Not resonant.</em>

             \n\nSort those four by how close the ratio is and Callisto is far
             ahead, with the probe level with the moons that are resonant. Sort
             them by whether they are resonant and you get a completely
             different order. The ratio does not
             predict the answer, and it was never going to: it is a necessary
             condition, not a sufficient one. A resonance requires a
             near-commensurate ratio the way a fire requires oxygen.

             \n\nWhat does settle it is an angle that turns back.`,
    },
    {
      sid: 'the-report-you-would-write',
      bind: GALILEANS,
      type: 'question',
      kind: 'choice',
      title: 'The report you would write',
      body: `A colleague sends you a newly discovered pair of bodies. The period
             ratio is 1.9987 — 0.065% from 2:1, about twelve times closer than
             chance. They have integrated the system for the equivalent of forty
             conjunction cycles and the 2:1 resonant argument stayed within 30°
             of a constant value the whole time, drifting slowly in one
             direction.`,
      prompt: 'What should the paper claim?',
      options: [
        'That the pair is in a 2:1 resonance, on the strength of a ratio twelve times closer than chance and a confined angle',
        'That the pair is not in resonance, since the angle drifted',
        'That the angle is confined to within 30° over forty conjunction cycles, which bounds any circulation at about 480 cycles — and that a longer integration is needed to distinguish libration from slow circulation',
        'That nothing can be said until the ratio is measured more precisely',
      ],
      answer: 2,
      because: `The third, and the arithmetic in it is the point. Thirty degrees
                over forty cycles is 0.75° per cycle, so a full 360° would take
                about 480 cycles — twelve times longer than the integration. That
                is a real, quotable result, and it is not a resonance.

                \n\nThe first option is what the ratio rule invites and it is
                exactly the mistake Callisto is there to warn against. The
                second overclaims in the other direction: a drift over a
                fraction of a libration period is what a libration looks like
                too. The fourth misses the point entirely — more decimal places
                on the ratio would not help, because the ratio was never the
                evidence.

                \n\nRun it longer. It is the only thing that settles it, and
                it is what Cohen and Hubbard did in 1965 for Pluto.`,
    },
    {
      sid: 'say-what-a-libration-shows',
      bind: GALILEANS,
      // Four recorded librations in this lesson and no step that asks what
      // they mean. The distinction between a ratio that is close and an angle
      // that is held is the entire argument, and it is the one thing a
      // checklist of readings cannot demonstrate.
      requires: ['capture-the-laplace-libration'],
      type: 'question',
      kind: 'short',
      title: 'What a libration shows that a ratio does not',
      body: `You measured period ratios close to whole numbers, and you also
             recorded resonant angles that swing back and forth about a fixed
             value instead of running all the way round.`,
      prompt:
        'In two or three sentences, explain why a near-integer period ratio on its own is not evidence of a resonance, and what the libration of the resonant angle adds.',
      rubric:
        'A ratio close to a small whole number can happen by chance, and with enough bodies and enough pairs some will be close; the ratio is a coincidence until something shows it is maintained. A resonant angle that librates \u2014 swings about a fixed value with a bounded amplitude rather than circulating through 360\u00b0 \u2014 shows that the configuration is being actively held: the conjunctions keep happening at the same place, and the gravitational kicks that follow push back rather than accumulate. Credit for noting that a circulating angle means the ratio is a near-miss, and extra credit for the Laplace argument \u03c6_L = \u03bb_Io \u2212 3\u03bb_Europa + 2\u03bb_Ganymede holding near 180\u00b0, which no pair of periods on its own could show.',
    },
    {
      sid: 'where-this-goes',
      bind: GALILEANS,
      type: 'read',
      title: 'Where this goes',
      body: `Resonance is not a curiosity at the edge of the Solar System. It is
             one of the main things that decided what the Solar System looks
             like.

             \n\n<strong>The Kirkwood gaps.</strong> The asteroid belt has gaps
             at the places where an asteroid's period would be a simple ratio of
             Jupiter's — 3:1, 5:2, 7:3, 2:1. There, the resonance does the
             opposite of protecting: it pumps up eccentricity until the asteroid
             crosses a planet's orbit and is removed. Same mechanism, opposite
             outcome, and which one you get depends on the geometry the
             libration holds.

             \n\n<strong>Pluto is not alone.</strong> There are hundreds of
             known Kuiper belt objects in the same 3:2 with Neptune — they are
             called plutinos. They are thought to have been swept up as Neptune
             migrated outward early in the Solar System's history, the resonance
             moving ahead of it and carrying whatever it caught. The population
             is a fossil of the migration.

             \n\n<strong>Io is the most volcanically active body known.</strong>
             The Laplace resonance keeps its orbit slightly eccentric — left
             alone, tides would have circularized it long ago — and an eccentric
             orbit means Jupiter's tidal squeeze changes over each orbit. That
             flexing is what melts the interior. The volcanoes are powered by the
             resonance.

             \n\n<strong>And it is not just here.</strong> Kepler found whole
             chains of them: TRAPPIST-1's seven planets are in a resonant chain,
             and so are the four of Kepler-223. Those chains are the strongest
             evidence there is that planets migrate after they form, because a
             chain is very hard to build any other way.

             \n\nAll of it rests on the same measurement you have just made
             four times: does the angle come back, or does it go round?`,
      tip: 'The TRAPPIST-1 System scenario is in the gallery if you want to look at a resonant chain with seven links.',
    },
  ],
};

export default WHEN_ORBITS_LOCK;
