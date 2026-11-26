// =============================================================================
// What If Gravity Were Not Inverse Square?
// -----------------------------------------------------------------------------
// One exponent moves and everything else is held fixed, so a student sees which
// orbital results came from the inverse square and which from the force merely
// being central. Three are separable:
//
//   the closed ellipse       a property of THIS central force, not of central
//                            forces: change the exponent and the ellipse turns.
//   the 3/2 power            P against a states the exponent; changing G cannot
//                            fake it.
//   the conservation laws    These do NOT break: momentum and angular momentum
//                            survive any central pairwise law, and sit at 1e-15
//                            while everything else moves.
//
// Why there is a reference radius
// -----------------------------------------------------------------------------
// a = GM/r^n alone is wrong: its ratio to Newton, r^(2-n), depends on the unit
// distance is measured in and mostly changes strength, not shape, so a student
// would conclude "gravity got weaker". The law is therefore pinned at a
// reference radius r0 = 1 AU, Newtonian for every n; see js/powerLawGravity.js
// and tests/powerLawGravity.test.js.
//
// What this is not: a theory of gravity, MOND (js/mond.js) or relativity.
// Mercury's perihelion is mentioned once, as a historical precession the model
// does not explain.
// =============================================================================

// No role bindings: the instruments integrate their own two-body problem, and
// nothing on the canvas is driven by the exponent. The Solar System is context,
// and the lesson says so.

const POWER_LAW_GRAVITY = {
  id: 'power-law-gravity',
  thumbnail: 'images/scenarios/solar-system.webp',
  title: 'What If Gravity Were Not Inverse Square?',
  subtitle: 'Change the exponent, and find out what depended on it',
  duration: '45-60 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 3, section: '3.3' },
  courseLevel: 'majors',
  mathematics: 'logarithms',
  prerequisites: [],
  // Subject tags, for the browser's filters. A fixed vocabulary
  // shared across the catalog rather than free text, so a filter can offer
  // the whole set without a second list to keep in step.
  tags: ['orbits', 'gravity'],
  retired: {
    'predict-the-slope': {
      to: 'predict-the-slope-at-2-9',
      release: '3.1',
      was: {
        en: 'Predict the slope at n = 2.9 from four readings and the rule slope = (n + 1) / 2, both given in the text.',
        es: 'Predecir la pendiente en n = 2,9 a partir de cuatro lecturas y de la regla pendiente = (n + 1) / 2, ambas dadas en el texto.',
      },
    },
  },
  objectives: [
    'State what the exponent in an inverse-square law is, and why changing it needs a reference distance to mean anything',
    'Measure apsidal precession from a simulated orbit and distinguish it from integration error by refining the timestep',
    'Measure the slope of log period against log radius and use it to infer the force-law exponent',
    'Explain why changing the gravitational constant shifts that line without tilting it',
    'Identify which conservation laws depend on the inverse-square form and which follow from the force being central and pairwise',
  ],
  steps: [
    // --- Act 1: what is being changed, and why it needs an anchor ----------
    {
      sid: 'the-exactly',
      type: 'read',
      title: 'The word "exactly"',
      time: { speed: 1, paused: true },
      setup: {
        scenario: 'Solar System',
        paused: true,
      },
      body: `Newton's law of gravitation says the pull between two masses falls
             off as one over the square of the distance between them. Every
             orbit you have looked at in Gravitas has obeyed it.

             \n\nThe number 2 in that law is doing an enormous amount of work,
             and it is easy to read past. It is not 2 because two is a tidy
             number. It is 2 because that is what the Solar System does, to
             about one part in a billion, and a great deal of what you know
             about orbits follows from it being 2 rather than 1.9 or 2.1.

             \n\nThis investigation takes that number and moves it. Everything
             else — the masses, the starting positions, the speeds, the
             integrator — is held still. Then you measure what changed.`,
      tip: 'The simulation is paused. Nothing moves until you let it.',
    },
    {
      sid: 'why-there-is-a-reference-distance',
      type: 'read',
      title: 'Why the experiment needs an anchor',
      body: `There is a trap in the obvious way to do this, and stepping around
             it is the reason this investigation has one extra number in it.

             \n\nSuppose you simply wrote the law as
             <strong>a = GM / r<sup>n</sup></strong> and turned n from 2 to
             2.01. You would find that gravity changed everywhere, and orbits would
             change for that reason as much as for any other. Worse,
             <em>how much</em> it changed would depend on whether you had
             chosen to measure distance in kilometers, astronomical units or
             the engine's own units (100 to the AU). At a distance of 1 AU the
             pull would come out 17 percent weaker with distance in kilometers,
             4.5 percent weaker in the engine's own units, and unchanged in AU.
             The universe does not care what units you write down.

             \n\nSo the law used here is anchored. It is written so that at one
             chosen distance — the <strong>reference radius r₀</strong>, which
             is <strong>1 AU</strong> in this investigation — the pull is
             <em>exactly Newtonian no matter what n is</em>. Further in than
             1 AU a steeper law pulls harder; further out it pulls more weakly;
             and at 1 AU itself, nothing changes.

             \n\nThat makes n a statement about the <em>shape</em> of the
             gravitational field rather than its overall strength, which is the
             only version of this question worth asking.`,
      tip: 'r₀ = 1 AU is fixed for the whole investigation. Every instrument shows it.',
    },
    {
      sid: 'predict-does-small-matter',
      type: 'predict',
      reveal: 'first-look-at-the-orbit',
      title: 'Does a small change matter?',
      body: `You are about to put a planet on a mildly elliptical orbit and
             change the exponent from 2 to 2.05 — a change of two and a half
             percent, at a distance where the strength of gravity is pinned and
             cannot change at all.`,
      prompt: 'Changing n from 2 to 2.05 will…',
      options: [
        'do almost nothing — two and a half percent is a small change',
        'change the orbit noticeably within a few trips around',
        'throw the planet out of the system immediately',
      ],
      answer: 1,
      because: `Noticeably, and quickly. The orbit stays bound and perfectly
                well behaved — nothing is thrown anywhere — but the long axis of
                the ellipse swings round every time the planet completes one
                in-and-out cycle, which is obvious within a few trips. The size
                of the effect is not proportional to the size of the change in
                n, and that is worth holding on to.`,
      tip: 'Commit before you run it. The point of predicting is the commitment, not the score.',
    },

    // --- Act 2: precession, the primary visual result ----------------------
    {
      sid: 'first-look-at-the-orbit',
      type: 'explore',
      title: 'Does the ellipse close?',
      body: `Here is the orbit. Start with the preset <strong>n = 2</strong> and
             watch what the path does: the planet sweeps out an ellipse and
             comes back to exactly where it started. It closes. That is Kepler's
             first law, and it is the thing everyone pictures when they picture
             an orbit.

             \n\nNow press <strong>n = 2.05</strong>. Then
             <strong>n = 2.2</strong>. Then, for contrast,
             <strong>n = 1.8</strong>, which is <em>shallower</em> than Newton.

             \n\nThe number to watch is <strong>measured precession</strong>: the
             angle by which the long axis of the ellipse swings round each time
             the planet completes one in-and-out cycle.`,
      tool: {
        id: 'power-law-precession',
        values: { n: 2 },
        title: 'Change the exponent and watch the axis turn',
        note: 'Every number here was measured by running the orbit, not looked up.',
      },
      checklist: [
        'Read the measured precession at n = 2, then at n = 2.05',
        'Read it at n = 2.2, and say how it compares with n = 2.05',
        'Read it at n = 1.8, the shallower law',
        'Say which way the long axis turns at n = 1.8 compared with n = 2.2',
      ],
      tip: 'The sign of the reading says which way the long axis turns.',
    },
    {
      sid: 'record-the-precession',
      // The instruments run their own orbits, so the scene stays quiet here;
      // declared here so the canvas code is fetched after the first instrument
      // opens. The scene is back for the slope runs and the closing steps.
      canvas: 'quiet',
      type: 'measure',
      title: 'Record what the axis does',
      body: `Read the <strong>measured precession</strong> off the instrument at
             each of these four exponents and write it down.`,
      tool: {
        id: 'power-law-precession',
        values: { n: 2 },
        title: 'Read the precession at each preset',
        note: 'Use the preset buttons. Read the row marked "Measured precession".',
      },
      fields: [
        { id: 'p_18', label: 'n = 1.8', unit: '° per orbit', decimals: 2 },
        { id: 'p_20', label: 'n = 2', unit: '° per orbit', decimals: 2 },
        { id: 'p_205', label: 'n = 2.05', unit: '° per orbit', decimals: 2 },
        { id: 'p_22', label: 'n = 2.2', unit: '° per orbit', decimals: 2 },
      ],
      validate: v => {
        if (!Number.isFinite(v.p_20)) return null;
        if (Math.abs(v.p_20) > 0.5) {
          return {
            level: 'warn',
            message:
              'The n = 2 reading should be zero to several decimal places. Check you read it at the n = 2 preset.',
          };
        }
        if (Number.isFinite(v.p_18) && v.p_18 > 0) {
          return {
            level: 'warn',
            message:
              'At n = 1.8 the precession is negative. Keep the minus sign — it is the result.',
          };
        }
        return null;
      },
      tip: 'Keep the sign. Backwards is a different answer from forwards, not a smaller one.',
    },
    {
      sid: 'what-closes-an-orbit',
      type: 'question',
      title: 'What closes an orbit',
      kind: 'choice',
      body: `At n = 2 the ellipse closes exactly. At every other exponent you
             tried — steeper or shallower — it does not.`,
      prompt: 'The best statement of what you have just measured is…',
      options: [
        'gravity only works properly when n = 2',
        'a closed elliptical orbit is a special property of the inverse-square law, not of central forces in general',
        'the simulation becomes inaccurate when n is not 2',
        'orbits are only stable when n = 2',
      ],
      answer: 1,
      because: `The orbits at n = 2.05 and n = 2.2 are perfectly good orbits:
                bound, repeating, going round and round. They simply are not
                <em>closed ellipses</em>. Bertrand's theorem, proved in 1873,
                says there are exactly two force laws for which every bound
                orbit closes — the inverse square, and a spring that pulls
                proportionally to distance. Everything else precesses. So the
                closed ellipse is not a general fact about gravity or about
                central forces; it is a fact about this particular exponent,
                and you have just measured what happens without it.`,
    },

    // --- Act 3: is it real? -----------------------------------------------
    {
      sid: 'predict-is-it-the-computer',
      type: 'predict',
      reveal: 'refine-the-timestep',
      title: 'Or is it the computer?',
      body: `A fair objection. Simulations take discrete steps, and taking steps
             through a curve introduces error. Maybe the turning you just
             measured is the integrator's fault rather than the physics.

             \n\nThere is a clean way to test that. Integration error depends on
             the size of the timestep: make the steps smaller and it gets
             smaller. A real physical effect does not care how you chose to
             calculate it.`,
      prompt:
        'If the precession at n = 2.2 is physical rather than numerical, then making the timestep eight times smaller will…',
      options: [
        'roughly halve the measured precession',
        'leave the measured precession essentially unchanged',
        'make the measured precession grow',
      ],
      answer: 1,
      because: `Essentially unchanged. That is what "physical" means
                operationally: the answer is a property of the system, so it
                does not depend on how carefully you chose to compute it. If the
                number had moved when the timestep moved, it would have been
                telling you about your arithmetic rather than about gravity.`,
    },
    {
      sid: 'refine-the-timestep',
      type: 'measure',
      title: 'Refine the timestep',
      body: `This instrument runs the same orbit four times, at four timesteps
             spanning a factor of eight, and reports the precession each time.

             \n\nRun it at <strong>n = 2.2</strong> and then at
             <strong>n = 2</strong>, and record the spread — the difference
             between the largest and smallest of the four readings.`,
      tool: {
        id: 'power-law-refinement',
        values: { n: 2.2 },
        title: 'The same orbit at four timesteps',
        note: 'Read the row marked "Spread across all four".',
      },
      fields: [
        {
          id: 'spread_22',
          label: 'n = 2.2: spread across four timesteps',
          unit: '°',
        },
        {
          id: 'val_22',
          label: 'n = 2.2: the precession itself',
          unit: '°',
        },
      ],
      tip: 'Compare the two numbers you just wrote down. How big is the disagreement between timesteps, next to the effect itself?',
    },
    {
      sid: 'the-refinement-verdict',
      type: 'question',
      title: 'What refinement proves',
      kind: 'choice',
      body: `At n = 2.2 the four runs agree to about five decimal places while
             the timestep changes by a factor of eight. At n = 2 all four read
             zero.`,
      prompt: 'This shows that…',
      options: [
        'the integrator is perfect',
        'the precession is a property of the force law, because it does not depend on how finely the orbit was calculated',
        'the timestep was already small enough at the start',
        'precession and integration error are the same thing',
      ],
      answer: 1,
      because: `This is the whole argument, and it is worth keeping. Numerical
                error is a property of your <em>calculation</em>, so it responds
                when you change the calculation. Physics is a property of the
                <em>system</em>, so it does not. Changing the timestep by a
                factor of eight and finding the same answer to five decimals is
                how you tell which one you are looking at — and the n = 2
                control reading zero at every timestep says the measurement is
                not simply insensitive to everything.`,
    },

    // --- Act 4: the quantitative half --------------------------------------
    {
      sid: 'predict-period-and-distance',
      canvas: 'scene',
      type: 'predict',
      reveal: 'measure-the-slope',
      title: 'Period against distance',
      body: `Kepler's third law says the square of an orbital period is
             proportional to the cube of the orbital radius: P² ∝ r³. Plotted
             with logarithms on both axes, that is a straight line of slope 3/2.

             \n\nThat law was measured from the real Solar System, and it is a
             consequence of the inverse square. So it is fair to ask what it
             becomes when the exponent is not 2.`,
      prompt:
        'When n is made larger than 2, the slope of log P against log r will…',
      options: [
        'stay at 3/2 — Kepler’s third law is a law',
        'get steeper',
        'get shallower',
        'stop being a straight line at all',
      ],
      answer: 1,
      because: `Steeper, and still perfectly straight. Kepler's third law is a
                law in the sense that it is a true and useful summary of what
                the Solar System does — but it is a consequence of the
                inverse-square force rather than something independent of it.
                Change the force law and the relation survives as a power law;
                only its exponent moves.`,
    },
    {
      sid: 'measure-the-slope',
      type: 'measure',
      title: 'Measure the slope',
      body: `This instrument puts six planets on circular orbits spanning a
             factor of seven and a half in radius, times how long each takes to
             go round, and fits a straight line through the logarithms.

             \n\nEach planet is launched at the correct circular speed
             <em>for the law that is switched on</em> — which is not the
             Newtonian speed once n leaves 2. Launching them at the Newtonian
             speed would put them on orbits that were not circles, and you would
             be measuring the mistake instead of the physics.

             \n\nRead the <strong>measured slope</strong> at each of these
             exponents.`,
      tool: {
        id: 'power-law-kepler',
        values: { n: 2 },
        withhold: ['expected'],
        title: 'Six circular orbits, timed',
        note: 'Read the row marked "Measured slope of log P against log r".',
      },
      fields: [
        { id: 's_18', label: 'n = 1.8: slope', unit: '', decimals: 3 },
        { id: 's_20', label: 'n = 2: slope', unit: '', decimals: 3 },
        { id: 's_22', label: 'n = 2.2: slope', unit: '', decimals: 3 },
        { id: 's_25', label: 'n = 2.5: slope', unit: '', decimals: 3 },
      ],
      plot: {
        title: 'Slope against exponent',
        xLabel: 'exponent  n',
        yLabel: 'slope of log P against log r',
        height: 260,
        note: 'Four readings. The pattern in them is the point.',
        points: v => [
          { x: 1.8, y: v.s_18, label: '1.8' },
          { x: 2, y: v.s_20, label: '2' },
          { x: 2.2, y: v.s_22, label: '2.2' },
          { x: 2.5, y: v.s_25, label: '2.5' },
        ],
      },
      validate: v => {
        if (!Number.isFinite(v.s_20)) return null;
        if (Math.abs(v.s_20 - 1.5) > 0.05) {
          return {
            level: 'warn',
            message:
              'The n = 2 slope should be 1.5 — that is Kepler’s third law. Check which preset you read.',
          };
        }
        return null;
      },
      tip: 'Your four points lie on a straight line. Work out what line before you go on.',
    },
    {
      sid: 'find-the-slope-rate',
      hints: [
        'Take the change in the slope between the two readings, and the change in n.',
        'Divide the one by the other: how much does the slope move when n moves by 1?',
      ],
      feedback: {
        close:
          'Close. Use the change in slope between the two readings, divided by the change in n.',
        off: 'Work from the two readings: how far the slope moved, divided by how far n moved.',
      },
      type: 'question',
      title: 'The rule in your readings',
      kind: 'numeric',
      body: `Look at just two of your readings: the slope at n = 2 was 1.5, and
             the slope at n = 2.5 was 1.75.
             \n\nThe slope depends on the exponent by a simple rule, and two
             readings are enough to find it.`,
      prompt: 'Change in the slope for each rise of 1 in n',
      unit: '',
      answer: 0.5,
      tolerance: 0.02,
      explain: `The slope rose by 0.25 while n rose by 0.5, so it rises by 0.5 for
                each 1 in n: half as fast as the exponent does.`,
    },
    {
      hints: [
        'Start from the reading at n = 2, where the slope is 1.5, and use the rate you found for the rise in n.',
        'The exponent goes from 2 to 2.9: how far is that, and how far does the slope move for it?',
      ],
      feedback: {
        close:
          'Close. Move from a reading you trust, at the rate you found for each rise in n.',
        off: 'Pick one of your readings and move from it to the new n, at the rate you found.',
      },
      sid: 'predict-the-slope-at-2-9',
      type: 'question',
      title: 'Use the rule',
      kind: 'numeric',
      body: `Now use your rate on an exponent you have not measured. The
             instrument goes up to n = 2.9.
             \n\nWork the answer out first, then set the instrument to
             n = 2.9 to see whether you were right.`,
      tool: {
        id: 'power-law-kepler',
        values: { n: 2.9 },
        start: { n: 2 },
        withhold: ['expected'],
        title: 'Check your prediction here, after you have made it',
        note: 'The instrument is how you find out whether you were right, not how you find the answer.',
      },
      prompt: 'Predicted slope of log P against log r at n = 2.9',
      unit: '',
      answer: 1.95,
      tolerance: 0.03,
      explain: `The slope is (n + 1) / 2, so at n = 2.9 it is (2.9 + 1) / 2 = 1.95.
                Set the instrument to n = 2.9 and check: it reads 1.95. This is
                what it means for a relationship to be a law rather than a
                table — it answers for cases you did not measure. And it runs
                the other way too, which is how it is actually used: a slope you
                have measured from real orbits tells you the exponent of the
                force that produced them.`,
    },
    {
      sid: 'why-the-slope-and-not-something-else',
      type: 'question',
      title: 'Why this measurement in particular',
      kind: 'choice',
      body: `Suppose you did not change the exponent at all, but made
             gravity ten percent weaker by lowering G. Orbits would slow down
             and every period would get longer.`,
      prompt:
        'On the log-log plot of period against radius, weakening G would…',
      options: [
        'tilt the line, the same way changing n does',
        'shift the whole line up without tilting it',
        'have no effect at all',
        'curve the line',
      ],
      answer: 1,
      because: `Lowering G makes every period longer by the same factor, which
                adds the same amount to every point on a log plot: the line
                moves up and keeps its slope. That is what makes this
                measurement worth making. Almost anything you can measure about
                an orbit responds to gravity simply being stronger or weaker —
                so a change you see could always be explained that way. The
                slope cannot. It responds to the <em>exponent</em> and to
                nothing else, which is why a measured slope is evidence about
                the form of the law rather than about its strength.`,
    },

    // --- Act 5: what does not break ---------------------------------------
    {
      sid: 'predict-what-breaks',
      type: 'predict',
      reveal: 'measure-conservation',
      title: 'What else breaks?',
      body: `You have now broken Kepler's first law and Kepler's third law by
             moving one number. It would be reasonable to expect the rest of
             mechanics to go with them.`,
      prompt:
        'With n set to 2.2, conservation of momentum and angular momentum will…',
      options: [
        'both fail, like the two laws you have already broken',
        'both hold, as exactly as they did at n = 2',
        'angular momentum will hold but momentum will fail',
      ],
      answer: 1,
      because: `Both hold, and to the last decimal place the arithmetic has.
                They were never consequences of the exponent: momentum follows
                from the two bodies of a pair pushing on each other equally and
                oppositely, and angular momentum from the push being along the
                line between them. Neither statement mentions distance, so
                neither notices when the distance law changes.`,
    },
    {
      sid: 'measure-conservation',
      canvas: 'quiet',
      type: 'measure',
      title: 'Check the conservation laws',
      body: `Three stars of different masses, all free to move and all pulling on
             each other under whatever law is selected. The instrument reports
             how far each conserved quantity drifts over the run, as a fraction
             of itself.

             \n\nRead the momentum and angular-momentum drift at
             <strong>n = 2</strong> and at <strong>n = 2.5</strong>.`,
      tool: {
        id: 'power-law-conservation',
        values: { n: 2 },
        title: 'Three unequal masses, mutually attracting',
        note: 'A drift of 1e-15 means the quantity did not change at all: that is the precision of the arithmetic itself.',
      },
      fields: [
        { id: 'mom_20', label: 'n = 2: momentum drift', unit: '' },
        { id: 'mom_25', label: 'n = 2.5: momentum drift', unit: '' },
        { id: 'ang_25', label: 'n = 2.5: angular momentum drift', unit: '' },
      ],
      tip: 'These are written in scientific notation. 5e-15 is five thousandths of a trillionth.',
    },
    {
      sid: 'why-they-survive',
      type: 'question',
      title: 'Why those two survived',
      kind: 'choice',
      body: `Momentum and angular momentum are conserved to about fifteen
             decimal places, and the exponent makes no difference to either.`,
      prompt: 'The reason momentum is still conserved is that…',
      options: [
        'the simulation enforces it directly',
        'the two bodies in each pair still push on each other equally and oppositely, whatever the distance law says',
        'momentum is always conserved in every physical system',
        'the exponent was not changed by enough to matter',
      ],
      answer: 1,
      because: `Each pair of bodies is given one force magnitude, applied to both
                of them in opposite directions. That is Newton's third law, and
                nothing in it mentions distance: change how the magnitude
                depends on r and the two forces are still equal and opposite, so
                the total momentum still cannot change. Angular momentum
                survives for a closely related reason — the force points along
                the line joining the bodies, so it exerts no twist about the
                center, and that is also true for any dependence on r.

                \n\nSo these two are not consequences of the inverse square at
                all. They are consequences of the force being <em>pairwise</em>
                and <em>central</em>, which you did not change.`,
    },
    {
      sid: 'and-energy',
      canvas: 'scene',
      type: 'read',
      title: 'And energy, with one catch',
      body: `Energy is conserved too — but there is a genuine trap here, and it
             is worth seeing because it is the kind of mistake that survives
             peer review.

             \n\nThe formula for gravitational potential energy you have met,
             <strong>−GMm/r</strong>, is not a general fact about gravity. It is
             the potential energy <em>of the inverse-square law specifically</em>.
             Change the exponent and that formula no longer describes the force
             you are integrating.

             \n\nIf you keep using it anyway, the total energy appears to drift,
             and you would conclude that your universe does not conserve energy.
             It does. The instrument you just used computes the potential that
             actually belongs to the law that is switched on, which is why its
             energy figure stays put.

             \n\nThe general statement is that <em>any</em> force that depends
             only on position conserves energy. The inverse square is not
             special in that respect either — it just has a famously tidy
             formula.`,
      tip: 'A conservation law that appears to fail is often a measurement using the wrong definition.',
    },

    // --- Act 6: synthesis --------------------------------------------------
    {
      sid: 'two-lists',
      type: 'read',
      title: 'Two lists',
      body: `Everything you measured sorts into two piles, and the sorting is
             the point of the investigation.

             \n\n<strong>Specific to the inverse square:</strong> the closed
             elliptical orbit, and the 3/2 slope of period against radius. Both
             moved the instant the exponent did. Both are properties of that
             one exponent rather than of gravity in general.

             \n\n<strong>True for any central, pairwise force:</strong>
             conservation of linear momentum, conservation of angular momentum,
             and conservation of energy. None of them moved at all, because none
             of them ever depended on the exponent.

             \n\nThat second list has a deeper origin than this investigation can
             demonstrate: there is a theorem, due to Emmy Noether in 1918,
             connecting each conservation law to a symmetry — momentum to the
             fact that space has no special place, angular momentum to the fact
             that it has no special direction. What you have measured here is
             consistent with that and is not a proof of it. What you <em>have</em>
             shown is narrower and still worth having: these quantities do not
             care about the radial dependence of the force, and two famous
             orbital results care about very little else.`,
    },
    {
      sid: 'near-three',
      type: 'read',
      title: 'Where the instrument stops',
      body: `The exponent slider stops at 2.9, and the reason is a real result
             rather than a software limit.

             \n\nAs n climbs towards 3, the precession per orbit grows without
             bound — you can watch it: 9 degrees at n = 2.05, 43 at n = 2.2, 151
             at n = 2.5. At exactly n = 3 something qualitative happens: a
             circular orbit stops being stable. Nudge a planet slightly off a
             circle and instead of oscillating about it, it spirals — either
             inwards into the star or outwards and away.

             \n\nThat is worth knowing about and is not worth stranding you
             inside, where the orbits fly apart and it is hard to tell a real
             instability from a broken simulation. So the instrument stays below
             it and names it instead.`,
      tip: 'Steeper than inverse-cube gravity has no stable circular orbits at all.',
    },
    {
      sid: 'closing-question',
      type: 'question',
      title: 'One last sort',
      kind: 'choice',
      body: `A student tells you they have simulated a planetary system and the
             orbits precess noticeably.`,
      prompt: 'Which single follow-up question would tell you the most?',
      options: [
        'what is the mass of the central star?',
        'does the precession change when you halve the timestep?',
        'how eccentric are the orbits?',
        'how long did the simulation run?',
      ],
      answer: 1,
      because: `Every one of these is a reasonable question, but only one
                separates a result from an artifact. Precession that shrinks
                when the timestep shrinks was never physics. Precession that
                stays put survived the one test that could have killed it, and
                only then is it worth asking what is causing it. You used
                exactly this test in this investigation, and it is the habit most worth
                carrying out of it.`,
    },
    {
      sid: 'the-honest-caveat',
      type: 'read',
      title: 'What this was and was not',
      body: `A last piece of bookkeeping, because it would be easy to leave with
             a bigger conclusion than the evidence supports.

             \n\nThis was a <strong>controlled experiment in a simulation</strong>,
             not a theory of gravity. The power law with a reference radius is
             not something anyone proposes as a description of the universe; it
             is a deliberately simple knob, chosen because turning it isolates
             one question. Real alternatives to Newtonian gravity do not look
             like this.

             \n\nOrbits in the real Solar System <em>do</em> precess — Mercury's
             famously, by 43 arcseconds per century more than Newtonian gravity
             with all the other planets included can account for. That was
             explained in 1915 by general relativity, which is not a change to
             the exponent and is not what this model does. The resemblance is
             worth noticing and the explanation is not the same one.

             \n\nWhat you can take away is the method. When a result changes,
             ask what it depended on; when it does not, ask why not; and when a
             simulation tells you something surprising, change the timestep
             before you believe it.`,
    },
  ],
};

export default POWER_LAW_GRAVITY;
