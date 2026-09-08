// =============================================================================
// Where Does a Gravity Assist Get Its Speed?
// -----------------------------------------------------------------------------
// The least intuitive easy thing in orbital mechanics, in eighteen screens and
// four optional ones.
//
// The whole lesson is one juxtaposition, and the panel is built to put it on
// screen in two columns rather than one list:
//
//   relative to the planet          4.343 km/s in, 4.343 km/s out
//   relative to everything else     3.316 km/s in, 5.890 km/s out
//
// Both are the same encounter at the same two instants. A student who can say
// why both are true has understood gravity assists, reference frames, and a
// good deal about what "speed" means; a student who cannot will reach for
// either "the planet pushed it" or "energy came from nowhere", and the lesson
// is arranged to make both of those answers uncomfortable before it offers the
// right one.
//
// Why the first half has no star in it
// -----------------------------------------------------------------------------
// Because with no star the claim is EXACT. The planet moves in a straight line,
// its frame is genuinely inertial, and the measured change in the spacecraft's
// speed relative to it is -3.3e-12 per cent - zero to every digit anyone will
// ever care about. Put a star in and that becomes 0.34 per cent, which is
// small, real, and a different kind of statement. Teaching the exact version
// first means the approximate one can be introduced as an approximation with a
// measured size, rather than as the only version the student has ever seen.
//
// It is also the only arrangement in which the planet's recoil is legible. On
// an orbit the planet's velocity changes by 0.34 units per encounter from its
// own orbital turning and by 5e-7 from the spacecraft; in empty space the
// second number is the only one there is, so the momentum ledger can be shown
// balancing instead of asserted. How closely depends on the step: a part in
// 10^9 when the encounter is integrated at a fixed 0.5, and a part in 10^5 on
// a machine whose frame rate makes the application's own step three times
// coarser. The lesson quotes a bound rather than a digit for that reason.
//
// Why the two passes are run together
// -----------------------------------------------------------------------------
// The comparison the lesson turns on is that the change in VELOCITY is the same
// on both sides of the planet and the change in SPEED is not. That is a
// comparison between two numbers, and until the panel kept both passes it was a
// comparison a student had to make from memory: fly +40, write four figures
// down, press Other side, watch the panel overwrite them, and try to remember
// which was which. The retained comparison replaces that and nothing else - the
// first flyby is still flown by hand, still watched, still read off the panel,
// because that is where a student learns what the instrument is saying.
//
// The optional sweep after it asks the obvious follow-up - how much does
// passing closer buy you - and answers it in a way that does not become a rule:
// in this laboratory more turn does mean more gain, and the reason is that the
// pass which would overshoot the optimum is a pass that hits the planet.
//
// Numbers in this file were measured through the engine, not derived and hoped
// for. See tools/physics-checks.mjs, group "Gravity assist", and
// e2e/assistExperiments.spec.js for the comparison and the sweep.
// =============================================================================

/** A rogue planet and a spacecraft, and nothing else in the universe. */
const ISOLATED = {
  scenario: 'Gravity Assist Lab',
  seed: 'assist',
  paused: false,
};

/** The same encounter, with a star for the energy to come from. */
const HELIOCENTRIC = {
  scenario: 'Gravity Assist: Heliocentric',
  seed: 'assist',
  paused: false,
};

const GRAVITY_ASSIST = {
  id: 'gravity-assist',
  thumbnail: 'images/scenarios/gravity-assist-lab.webp',
  title: 'Where Does a Gravity Assist Get Its Speed?',
  subtitle:
    'The same flyby, measured in two frames, with two different answers',
  // The core is eighteen screens. The four optional ones add about five
  // minutes, three of which is the sweep running while nobody types.
  duration: '15-20 min',
  level: 'Introductory astronomy',
  // Subject tags, for the browser's filters. A fixed vocabulary
  // shared across the catalogue rather than free text, so a filter can offer
  // the whole set without a second list to keep in step.
  tags: ['spaceflight', 'orbits'],
  lock: { placement: true },
  summary:
    'Voyager 2 arrived at Jupiter travelling ten kilometres a second and left travelling twenty-six. Jupiter did not burn any fuel for it. Fly the same manoeuvre yourself, measure it in the planet’s frame and in an inertial one, run it past both sides of the planet at once, and find out why the two measurements disagree — and who actually paid.',
  objectives: [
    'Predict whether a flyby gains or loses speed from which side of the planet it passes',
    'State what a gravity assist changes and what it cannot change, in the planet’s frame and in an inertial one',
    'Explain the speed change as the rotation of one vector added to another, rather than as a push',
    'Identify where the energy comes from, and show the momentum ledger balancing',
    'Say why the planet’s frame is exactly inertial with no star and only approximately so with one',
    'Distinguish a frame-dependent speed from the quantities the system conserves in every frame',
  ],
  steps: [
    // --- Part 1: the puzzle --------------------------------------------------
    {
      sid: 'voyager-left-faster',
      type: 'read',
      title: 'Voyager left faster than it arrived',
      setup: ISOLATED,
      body: `In July 1979 Voyager 2 passed Jupiter. It approached at about ten
             kilometres per second relative to the Sun and departed at about
             twenty-six. Its engines were off.
             \n\nThis is not a curiosity. Every mission to the outer solar system
             has depended on it: Voyager could not have reached Neptune,
             Cassini could not have reached Saturn, and New Horizons could not
             have reached Pluto in under a decade without borrowing speed from a
             planet on the way.
             \n\nThe question is the obvious one, and it has a real answer rather
             than a trick. <strong>Where did the speed come from?</strong>`,
      tip: 'Voyager 2 is still receding at about 15 km/s, most of it borrowed from Jupiter, Saturn, Uranus and Neptune in turn.',
    },
    {
      sid: 'the-simplest-possible-flyby',
      type: 'read',
      title: 'The simplest possible flyby',
      body: `On screen is the least cluttered version of that manoeuvre anybody
             could build. A planet of five Jupiter masses, drifting through
             empty space at 2.83 kilometres per second. An Earth-mass spacecraft
             crossing its path. <strong>Nothing else at all</strong> — no star,
             no other planets, no light.
             \n\nThe missing star is the important part. With nothing else in the
             universe, the planet travels in a perfectly straight line at a
             perfectly constant speed, which means its point of view is an
             <em>inertial</em> frame: as good a place to measure from as any
             other, and not accelerating.
             \n\nThat matters because the answer to the Voyager question is
             going to be a disagreement between two frames, and it is much
             easier to trust a disagreement when one of the two is exactly
             right rather than nearly right.`,
      tip: 'Rogue planets, drifting between the stars with no sun of their own, are thought to be common. This one is a teaching device, but it is not an impossible object.',
    },
    {
      sid: 'which-side-gains',
      type: 'predict',
      title: 'Which side?',
      body: `The spacecraft can pass on either side of the planet: in front of
             it, in the direction the planet is heading, or behind it, in the
             space the planet has just left.
             \n\nOne of those choices speeds the spacecraft up and the other
             slows it down. Commit before you run anything.`,
      prompt: 'To gain speed, the spacecraft should pass:',
      options: [
        'In front of the planet, so the planet’s gravity pulls it forward',
        'Behind the planet, in the space it has just vacated',
        'Either — the gain depends on how close it gets, not on which side',
        'Directly at the planet, for the strongest possible pull',
      ],
      answer: 1,
      because: `Behind. The intuition that the planet "pulls it forward" from in
                front is the natural one and it gets the sign backwards: a
                spacecraft passing ahead of the planet is pulled <em>backwards</em>
                relative to the planet's motion. Passing behind, it is dragged
                along in the direction the planet is going.`,
    },

    // --- Part 2: the measurement ---------------------------------------------
    {
      sid: 'fly-the-gaining-pass',
      type: 'explore',
      title: 'Fly it',
      setup: ISOLATED,
      body: `The <strong>Gravity Assist</strong> panel is already open. It is set
             to an impact parameter of <strong>+40</strong>, which passes the
             spacecraft behind the planet, and the encounter takes about nine
             seconds to watch.
             \n\nPress <strong>Fly it</strong>. Watch the path bend. Then read
             the two columns — they are the whole lesson, and they disagree.`,
      checklist: [
        'Watch the trail bend as the spacecraft rounds the planet',
        'Read the left column: the speed relative to the planet, before and after',
        'Read the right column: the speed relative to everything else, before and after',
        'Notice that only one of them changed',
        'Press "Planet’s frame" and watch the same encounter redrawn from the planet’s point of view',
      ],
      tip: 'The frame button re-expresses the whole picture, trails included, in the planet’s frame. In that frame the planet sits still and the spacecraft sweeps past on a hyperbola.',
    },
    {
      sid: 'write-down-both-columns',
      type: 'measure',
      title: 'Both columns',
      body: `With the flyby finished, read four speeds off the panel. They are
             in kilometres per second.`,
      fields: [
        {
          id: 'relBefore',
          label: 'Relative to the planet, before',
          unit: 'km/s',
          hint: 'km/s',
        },
        {
          id: 'relAfter',
          label: 'Relative to the planet, after',
          unit: 'km/s',
          hint: 'km/s',
        },
        {
          id: 'inertBefore',
          label: 'Relative to everything else, before',
          unit: 'km/s',
          hint: 'km/s',
        },
        {
          id: 'inertAfter',
          label: 'Relative to everything else, after',
          unit: 'km/s',
          hint: 'km/s',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.relBefore) || !Number.isFinite(v.relAfter)) {
          return null;
        }
        const same = Math.abs(v.relAfter - v.relBefore) < 0.01;
        if (!same) {
          return {
            level: 'warn',
            message:
              'Those two should be the same number to four figures. Check you are reading the left-hand column, which is measured relative to the planet.',
          };
        }
        if (
          Number.isFinite(v.inertAfter) &&
          Number.isFinite(v.inertBefore) &&
          v.inertAfter <= v.inertBefore
        ) {
          return {
            level: 'warn',
            message:
              'The right-hand column should have grown. Check the impact parameter is +40 rather than −40.',
          };
        }
        return {
          level: 'ok',
          message:
            'Identical on the left, most of a factor of two larger on the right. Same encounter, same two moments.',
        };
      },
    },
    {
      sid: 'how-can-both-be-true',
      type: 'question',
      kind: 'choice',
      title: 'How can both of those be true?',
      body: `Relative to the planet: 4.343 km/s before, 4.343 km/s after — the
             panel reports the change as three parts in a hundred billion, which
             is zero to any precision that matters.
             \n\nRelative to everything else: 3.32 km/s before, 5.89 km/s after.
             An increase of seventy-eight per cent.
             \n\nBoth measurements are of the same spacecraft at the same two
             moments.`,
      prompt: 'The reason these disagree is:',
      options: [
        'The planet’s gravity did work on the spacecraft, and the planet’s frame cannot see it',
        'Speed depends on what you measure it against, and the two frames are moving relative to each other',
        'One of the two measurements is an approximation',
        'Energy is not conserved during a gravity assist',
      ],
      answer: 1,
      because: `Speed is not a property of an object. It is a property of an
                object <em>and</em> something to measure it against, and the two
                columns measure against different things. Nothing was
                approximated — with no star present both numbers are exact —
                and no energy appeared. The next screen is the arithmetic.`,
    },
    {
      sid: 'the-vector-addition',
      type: 'read',
      title: 'It is one vector, rotated',
      body: `Here is the whole mechanism, and it is not a push.
             \n\nIn the planet's frame the encounter can only do one thing to the
             spacecraft's velocity: <strong>turn it</strong>. The length cannot
             change, because the spacecraft falls towards the planet and then
             climbs back out again by exactly the same depth, arriving with
             exactly the speed it came in with. Yours turned by 58.6 degrees.
             \n\nTo get back to the other frame, add the planet's own velocity.
             That is the entire trick:
             \n\n<strong>v(everything else) = v(planet) + v(relative to planet)</strong>
             \n\nBefore the encounter those two vectors partly cancel, and the
             sum is short. Afterwards the second one has been rotated, so they
             partly reinforce, and the sum is long. Same two lengths, different
             angle between them, different total. Nobody pushed anything.`,
      tip: 'This is why the manoeuvre is sometimes explained as bouncing a tennis ball off a moving train. The ball leaves the train at the speed it arrived, in the train’s frame; in the station’s frame it leaves much faster.',
    },
    {
      sid: 'the-other-side',
      type: 'explore',
      title: 'Now the other side — both at once',
      setup: ISOLATED,
      // Requires the prediction, not the first flyby: the point of collecting
      // it at the third screen is that it is collected before any evidence,
      // and a subset of this lesson that runs the comparison without it has
      // turned an experiment into a demonstration.
      requires: ['which-side-gains'],
      body: `If the gain comes from adding a rotated vector, then rotating it the
             other way should subtract instead.
             \n\nYou could press <strong>Other side</strong> and fly it again —
             but then the numbers you just wrote down would be off the screen
             while you read the new ones, and the comparison you are about to
             make is between two of them at once.
             \n\nSo open <strong>Both sides, kept side by side</strong> under
             the panel and press <strong>Run both passes</strong>. It flies
             <strong>+40</strong> and <strong>−40</strong>, rebuilding the
             encounter from the same starting configuration each time so the
             sign of the impact parameter is the only thing that differs, and
             keeps both. It takes about <strong>a minute</strong>.`,
      checklist: [
        'Watch the two passes run, and read the table when it settles',
        'Find the row that is the same in both columns, and the row that is not',
        'Check the closest-approach row: the two passes came equally close',
        'Read the "Encounter" row at the bottom — both should say they were read in and out',
      ],
      tip: 'The deflection is identical on both sides: 58.63 degrees. Only its direction differs, and the table shows both.',
    },
    {
      sid: 'read-the-comparison',
      type: 'measure',
      title: 'Two passes, three numbers',
      // Reads the retained table, so the table has to exist.
      requires: ['the-other-side'],
      body: `Read these off the comparison table. The <em>change in speed</em>
             row is signed: one column gained and the other lost. The
             <em>change in velocity</em> row is a length, so it has no sign, and
             it is the row worth looking at twice.`,
      fields: [
        {
          id: 'abGain',
          label: 'Speed gained, passing behind',
          unit: 'km/s',
          hint: 'km/s',
        },
        {
          id: 'abLoss',
          label: 'Speed lost, passing in front (as a positive number)',
          unit: 'km/s',
          hint: 'km/s',
        },
        {
          id: 'abDeltaV',
          label: 'Change in velocity — either column',
          unit: 'km/s',
          hint: 'km/s',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.abGain) || !Number.isFinite(v.abLoss)) {
          return null;
        }
        if (v.abLoss < 0) {
          return {
            level: 'warn',
            message:
              'Enter the loss as a positive number — how much speed it lost. The sign is in the question, not in the answer.',
          };
        }
        if (Math.abs(v.abLoss - v.abGain) < 0.05) {
          return {
            level: 'warn',
            message:
              'Those two came out the same size. Check you have read the "change in speed" row and not the "change in velocity" row: it is the velocity change that matches on both sides.',
          };
        }
        if (
          Number.isFinite(v.abDeltaV) &&
          v.abDeltaV < Math.max(v.abGain, v.abLoss)
        ) {
          return {
            level: 'warn',
            message:
              'The change in velocity should be the largest of the three. It is the length of the arrow between the before and after velocities, and neither speed changed by that much.',
          };
        }
        return {
          level: 'ok',
          message:
            'A gain of about 2.6 and a loss of about 1.7 — not mirror images — and one velocity change of about 4.3 shared by both. The next screen is why.',
        };
      },
      tip: 'The caveat under the table reports how closely the two velocity changes agree. In the isolated lab it is a few parts in 10¹³, which is the integrator rather than the physics.',
    },
    {
      sid: 'why-not-mirror-image',
      type: 'question',
      kind: 'choice',
      title: 'Why is the loss smaller than the gain?',
      body: `Both columns are still on screen, which is the point of running
             them together. Passing behind, the spacecraft went from 3.32 to
             5.89 km/s: a gain of 2.57. Passing in front, it went from 3.32 to
             1.64: a loss of 1.67.
             \n\nSame planet, same approach speed, same closest approach to
             within a part in 10¹², same deflection to within a part in 10¹²,
             mirror-image geometry — and the two changes are not the same
             size. The table reports all four of those agreements, so the
             asymmetry cannot be blamed on any of them.`,
      prompt: 'The best explanation is:',
      options: [
        'The simulation loses a little energy on the losing pass',
        'Speed is the length of a vector sum, and lengths do not add and subtract symmetrically',
        'The planet’s gravity is stronger on the trailing side',
        'The losing pass came closer to the planet',
      ],
      answer: 1,
      because: `Geometry, not physics. The <em>change in velocity</em> is the same
                size in both cases — it is the same rotation of the same vector,
                so its magnitude is identical. But speed is the <em>length</em> of
                the resulting sum, and adding a fixed-length vector at different
                angles to another one does not change that length symmetrically.
                Check the closest-approach row if you doubt the fourth
                option: it is 0.234 AU on both passes, and the table says how
                closely.`,
    },
    {
      sid: 'the-ceiling',
      type: 'question',
      kind: 'numeric',
      title: 'How much is there to take?',
      body: `There is a hard limit on what any single flyby can do, and it falls
             straight out of the picture on the last screen. The most the
             encounter can do is reverse the relative velocity completely — a
             180-degree turn, which needs a grazing pass. In that case the
             change in velocity is twice the approach speed.
             \n\nYour spacecraft approached at 4.343 km/s relative to the planet.`,
      prompt:
        'The largest velocity change any flyby of this planet at this approach speed could produce, in km/s',
      answer: 8.686,
      unit: 'km/s',
      tolerance: 0.2,
      expect: {
        dimension: 'speed',
        unit: 'km/s',
        accept: ['km/s', 'm/s'],
      },
      hints: {
        concept: `A full reversal turns the relative velocity from pointing one
                  way to pointing exactly the other way. How much did it change
                  by?`,
        method: `Twice the approach speed.`,
      },
      worked: `2 × 4.343 = 8.686 km/s. Your actual pass achieved 2.57 km/s of
               speed gain, which is well under the ceiling because a 58-degree
               turn is a long way from a reversal.`,
      because: `About 8.7 km/s. Notice what sets that ceiling: the
                <strong>approach speed</strong>, not the planet's mass. A heavier
                planet bends the path further and so gets closer to the ceiling,
                but it cannot raise it. This is why assists are worth so much in
                the outer solar system — a spacecraft crawling past Jupiter has a
                low approach speed and a big turn — and so little at Mercury.`,
    },

    // --- Part 3: who paid ----------------------------------------------------
    {
      sid: 'who-paid',
      type: 'measure',
      title: 'Somebody paid for that',
      body: `Fly the gaining pass again with the impact parameter back at
             <strong>+40</strong>, and this time read the bottom of the panel:
             the planet's own velocity change, and the momentum ledger beneath
             it.`,
      fields: [
        {
          id: 'planetRecoil',
          label: 'The planet’s velocity change',
          unit: 'mm/s',
          hint: 'mm/s',
        },
        {
          id: 'ledgerMatch',
          label: 'How closely the two momentum changes agree, in per cent',
          unit: '%',
          hint: 'per cent',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.planetRecoil)) return null;
        if (v.planetRecoil > 1000) {
          return {
            level: 'warn',
            message:
              'That looks like the planet’s speed rather than its change. The row you want says "What it cost the planet".',
          };
        }
        return {
          level: 'ok',
          message:
            'A few millimetres per second, against its own 2.83 km/s — about one part in a million, and exactly the momentum the spacecraft gained.',
        };
      },
    },
    {
      sid: 'where-the-energy-came-from',
      type: 'question',
      kind: 'choice',
      title: 'So where did the energy come from?',
      body: `The spacecraft's kinetic energy went up by a factor of three. The
             planet slowed by about four millimetres per second — one part in a
             million of its own speed — and the two momentum changes match to
             better than a hundredth of a per cent.`,
      prompt:
        'In this isolated system, the spacecraft’s extra energy came from:',
      options: [
        'Nowhere — gravity assists genuinely create energy',
        'The planet’s kinetic energy, which fell by the same amount',
        'The gravitational field, which was permanently changed',
        'The simulation’s integrator, as accumulated numerical error',
      ],
      answer: 1,
      because: `The planet's kinetic energy. It is a much heavier object moving
                slightly slower, and the arithmetic works out: a tiny fractional
                change in a very large kinetic energy is a large fractional
                change in a very small one. The fourth option is worth ruling
                out rather than dismissing — the panel shows the two momentum
                changes agreeing to better than a hundredth of a per cent,
                which is far tighter than accumulated error could be. What is
                left is not error either: the readings are taken at a finite
                distance, where the two bodies are still very slightly pulling
                on each other, so the figure is smaller on a machine that can
                integrate the encounter in finer steps. Yours will not be the
                same as your neighbour's, and both of them rule out the fourth
                option.`,
    },

    {
      sid: 'the-planets-frame-is-two-frames',
      type: 'question',
      kind: 'choice',
      title: 'Whose frame, exactly?',
      body: `One loose end, and it is the interesting kind.
             \n\nThe whole lesson rests on the left-hand column: the speed
             relative to the planet does not change. But the planet you are
             measuring against is not the same planet before and after — it
             recoiled. The comparison's caveat says by how much: about four
             millimetres per second, which is exactly one millionth of the
             spacecraft's own velocity change, because the spacecraft is one
             millionth of the planet's mass.
             \n\nSo "the planet's frame" names one inertial frame on the way
             in and a slightly different one on the way out.`,
      prompt: 'Given that, the unchanged speed in the left-hand column is:',
      options: [
        'An approximation, good to about one part in a million because the spacecraft is light',
        'Exact anyway — the speed of one body relative to another returns to its old value at the same separation, whatever the two masses are',
        'Wrong, and the panel should be measuring against the barycentre instead',
        'Exact only because the spacecraft is much lighter than the planet',
      ],
      answer: 1,
      because: `Exact, and not because the spacecraft is light. Two bodies
                falling towards each other and separating again form a Kepler
                problem in their <em>relative</em> coordinate, and that problem
                returns the same relative speed at the same separation for any
                pair of masses at all. Make the spacecraft as heavy as the
                planet and the left column still would not move.
                \n\nWhat the finite mass changes is which frames you are
                naming. It is worth being precise about what survives the
                change of frame and what does not: <strong>speed</strong> is
                frame-dependent and disagrees between the columns; the
                <strong>change in velocity</strong> is the same vector in every
                inertial frame, which is why both passes report the same one;
                and the system's <strong>total momentum</strong> is conserved,
                which is the row the panel calls the ledger.`,
      tip: 'The panel checks this rather than asserting it: the planet\u2019s velocity change divided by the spacecraft\u2019s should equal the mass ratio, and the caveat says whether it does.',
    },

    // --- Part 4 (optional): how much does closeness buy? ---------------------
    {
      sid: 'sweep-the-impact-parameter',
      type: 'explore',
      title: 'Optional: how much does passing closer buy you?',
      setup: ISOLATED,
      requires: ['which-side-gains'],
      body: `<strong>Optional, and it takes about three minutes.</strong> Skip
             it if the session is short; nothing after this depends on it.
             \n\nEverything so far used one impact parameter. Open
             <strong>Optional: sweep how close it passes</strong> and press
             <strong>Run the sweep</strong>. It flies five passes on the gaining
             side — <strong>20, 30, 40, 60 and 90</strong> — holding the
             approach speed, the planet, the spacecraft, the integrator and the
             gate, and varying nothing else.
             \n\nThe closest of them passes 0.076 AU from the planet, which is
             about three and a half planet radii. Closer than that and the pass
             stops being a flyby and becomes a collision, which is why the
             sweep stops where it does rather than at zero.`,
      checklist: [
        'Predict, before it finishes: does passing closer always gain more speed?',
        'Read the turn column: it should grow steadily as the pass gets closer',
        'Read the speed-change column beside it',
        'Look at the plot: open circles are the turn, filled squares are the speed change',
      ],
      tip: 'Stop is there if you need it. A stopped sweep keeps the passes it flew and marks the ones it never reached, rather than reporting four points as five.',
    },
    {
      sid: 'read-the-sweep',
      type: 'measure',
      title: 'Optional: read the five',
      requires: ['sweep-the-impact-parameter'],
      body: `Two rows from the table, and one subtraction you will need on the
             next screen.`,
      fields: [
        {
          id: 'sweepTurn20',
          label: 'Turn at the closest pass, b = 20',
          unit: '°',
          hint: 'degrees',
        },
        {
          id: 'sweepGain20',
          label: 'Speed change at b = 20',
          unit: 'km/s',
          hint: 'km/s',
        },
        {
          id: 'sweepGain30',
          label: 'Speed change at b = 30',
          unit: 'km/s',
          hint: 'km/s',
        },
      ],
      validate: v => {
        if (
          !Number.isFinite(v.sweepGain20) ||
          !Number.isFinite(v.sweepGain30)
        ) {
          return null;
        }
        if (v.sweepGain20 <= v.sweepGain30) {
          return {
            level: 'warn',
            message:
              'The closer pass should have gained more, not less. Check which row is which: 20 is the top row and it is the closest pass, not the widest.',
          };
        }
        if (Number.isFinite(v.sweepTurn20) && v.sweepTurn20 < 60) {
          return {
            level: 'warn',
            message:
              'That looks like the turn at a wider pass. At b = 20 the spacecraft is turned by about 97 degrees.',
          };
        }
        return {
          level: 'ok',
          message:
            'Halving the impact parameter from 40 to 20 turned the spacecraft half as far again and bought about a kilometre per second. Whether the next halving would buy as much is the question.',
        };
      },
    },
    {
      sid: 'strongest-turn-biggest-gain',
      type: 'question',
      kind: 'choice',
      title: 'Optional: does the biggest turn always win?',
      requires: ['read-the-sweep'],
      body: `In your five passes the closest one turned the most and gained the
             most. The obvious conclusion is that a bigger turn always means a
             bigger gain.
             \n\nBefore you accept it, look at what the turn is <em>for</em>.
             The encounter rotates the spacecraft's velocity relative to the
             planet, and then that rotated vector is added to the planet's own.
             The sum is longest when the two point the same way.`,
      prompt: 'So the largest possible gain from this planet would come from:',
      options: [
        'The closest possible pass, since that turns the velocity furthest',
        'The pass that turns the relative velocity until it points along the planet’s own direction of travel — and no further',
        'The widest pass, since a gentle turn wastes less speed',
        'Any pass; the gain depends only on the approach speed',
      ],
      answer: 1,
      because: `The second. Turning helps only while it is bringing the relative
                velocity round towards the planet's direction of travel; keep
                turning past that alignment and the two vectors start to
                disagree again and the sum shortens. Here the incoming relative
                velocity is 131 degrees away from the planet's motion, so
                <strong>131 degrees</strong> is the turn that would be worth
                most — and the closest pass the planet survives manages about
                97. The hill has a top and this laboratory cannot reach it: the
                pass that would turn 131 degrees passes 0.02 AU out, which is
                inside the planet.
                \n\nSo your five points are all on the rising side of a curve
                that does turn over. That the biggest turn won here is a fact
                about this geometry, not a rule about flybys.`,
      tip: 'The caveat under the plot says the same thing, and says it whichever way your five came out.',
    },
    {
      sid: 'explain-the-sweep',
      type: 'question',
      kind: 'short',
      title: 'Optional: say it with your own numbers',
      requires: ['read-the-sweep'],
      body: `Your table has five turns and five speed changes. Work out roughly
             how much speed each extra degree of turn bought, between the two
             widest passes and then between the two closest ones.`,
      prompt:
        'Using those two figures, explain in two or three sentences why the sweep is evidence that a turnover exists, even though none of your five passes is past it.',
      rubric: `Full credit for reading the DIMINISHING RETURN off their own
               numbers and connecting it to the vector picture. Between b = 90
               and b = 60 the gain rises about 0.043 km/s per degree of extra
               turn; between b = 30 and b = 20 it rises about 0.023 km/s per
               degree — roughly half as much for each degree bought. A quantity
               whose increments are shrinking towards zero is approaching a
               maximum, and the vector picture says where: at the turn that
               lines the relative velocity up with the planet's motion, 131
               degrees here.
               \n\nCredit also for noticing that the five points alone cannot
               locate the turnover, only show the approach to it. Common wrong
               answers: "the gain is levelling off, so it must stay flat" (a
               curve with a maximum falls after it, and the geometry says this
               one does); "the closest pass gained most, so closer is always
               better" (true of these five and of nothing beyond them); and
               treating the turnover as a numerical artefact rather than as
               geometry - halving the timestep would not move it.`,
    },

    // --- Part 4: the version with a Sun --------------------------------------
    {
      sid: 'now-with-a-sun',
      type: 'read',
      title: 'Now put a star back',
      setup: HELIOCENTRIC,
      body: `Everything so far was exact, and slightly unreal: real planets are
             not drifting alone through empty space, they are orbiting stars.
             \n\nThis is the same planet, now on a circular orbit five AU from a
             Sun-like star, moving at 13.4 km/s. Same spacecraft, same kind of
             encounter. The energy the spacecraft gains now comes out of the
             planet's <em>orbit</em>, which is what actually happens at Jupiter.
             \n\nBut something has been given up. The planet is accelerating now
             — it is going round a corner — so its frame is no longer inertial,
             and the star pulls on the spacecraft too. The left-hand column will
             no longer be exactly unchanged. Watch how nearly it is.`,
      tip: 'The real Jupiter slows by about 10⁻²⁵ metres per second per Voyager. Over the age of the solar system, all the spacecraft ever launched have not measurably altered its orbit.',
    },
    {
      sid: 'fly-it-heliocentric',
      type: 'explore',
      title: 'Fly it, and watch the residual',
      setup: HELIOCENTRIC,
      body: `Press <strong>Fly it</strong>. This encounter is much quicker — the
             spacecraft is only tracked while it is close enough to the planet
             for the flyby to mean anything.
             \n\nRead all three things: the two columns as before, and the
             paragraph at the bottom that now appears.`,
      checklist: [
        'Read the right-hand column: the speed relative to the STAR, before and after',
        'Read the left-hand column, and notice it is no longer exactly unchanged',
        'Read the residual in the note at the bottom, and the Hill radius it quotes',
        'Compare the measured deflection with the two-body prediction beside it — they no longer agree either',
      ],
      tip: 'Let it keep running after the readings are taken and watch the spacecraft climb away on a much wider orbit than it arrived on.',
    },
    {
      sid: 'what-the-residual-means',
      type: 'question',
      kind: 'choice',
      title: 'What is the residual telling you?',
      body: `Relative to the star the spacecraft went from about 13.7 to about
             19.8 km/s — a real gain of 45 per cent, and the point of the whole
             manoeuvre.
             \n\nRelative to the planet it went from 8.48 to 8.51 km/s: a change
             of about a third of a per cent, where the isolated version gave
             three parts in a hundred billion. The measured deflection is 34.2
             degrees against a two-body prediction of 36.3.`,
      prompt: 'Those two discrepancies are best described as:',
      options: [
        'Numerical error that a smaller timestep would remove',
        'A real effect: the planet’s frame is accelerating and the star pulls on the spacecraft, so the encounter is only approximately two bodies',
        'Evidence that the isolated result was wrong',
        'The spacecraft losing energy to the star',
      ],
      answer: 1,
      because: `Physics, not arithmetic. Treating a flyby as an isolated
                two-body encounter patched into a heliocentric orbit is called
                the <strong>patched-conic approximation</strong>, and it is what
                mission designers actually use for a first pass. The residual you
                measured is its error, and the fact that you can measure it is
                what makes it an approximation rather than a fudge. Halving the
                timestep would not shrink it, because it is not a timestep
                problem.`,
    },
    {
      sid: 'what-this-leaves-out',
      type: 'read',
      title: 'What you measured, and what it leaves out',
      body: `You have measured a gravity assist twice over.
             \n\n· Passing behind a planet, a spacecraft gains speed relative to
             everything except the planet; passing in front, it loses it.
             \n· Relative to the planet, nothing changes — exactly, when the
             planet's frame is genuinely inertial.
             \n· The gain is the rotation of one vector added to another, and it
             is capped at twice the approach speed however heavy the planet is.
             \n· The two sides change the velocity by the same amount and the
             speed by different amounts, and the first of those is the same in
             every frame while the second is not.
             \n· The planet pays, in momentum, exactly what the spacecraft gains.
             \n· With a star present all of that is still true and none of it is
             exact any more, and the size of the error is a thing you can read
             off a panel.
             \n\nThree limits before you take this anywhere. It is
             <strong>two-dimensional</strong>: real flybys are aimed in three
             and the out-of-plane component is most of the design problem. The
             spacecraft is an <strong>Earth mass</strong>, some 10²² times a real
             probe, chosen so the planet's recoil is a number you can read rather
             than a claim you have to take on trust — the physics is identical,
             the recoil is not. And the planet here is a
             <strong>point</strong>: no atmosphere to skim, no moons to avoid,
             and no radiation belt of the sort that nearly ended Galileo.`,
      tip: 'The Parker Solar Probe is the same idea run backwards: seven flybys of Venus on the leading side, each one deliberately removing speed so it can fall closer to the Sun.',
    },
  ],
};

export default GRAVITY_ASSIST;
