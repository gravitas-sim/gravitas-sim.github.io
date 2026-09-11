// =============================================================================
// Planets in Binary Stars
// -----------------------------------------------------------------------------
// Two thirds of the Sun-like stars in the galaxy have a companion, so "can a
// planet survive here?" is not an exotic question. This lesson asks it twice -
// once for a planet around one star of a pair, once for a planet around both -
// and then spends its second half on a question that matters more than either:
// how do you know the answer your integrator gave you is about the planet?
//
// The spine is four measured configurations, and they were chosen by running
// them rather than by taste. In the circumstellar lab, at mu = 1/3 and e = 0.4:
//
//   0.15 separations   survives 20 binary periods, drift 1.7e-6, no encounters
//   0.30 separations   ejected at 2.5 periods, drift 5e-4 - clean, unambiguous
//   0.25 separations   SURVIVES at step 1.0 and is EJECTED at step 0.25, with
//                      the energy drift under a part in a million at both
//   0.50 separations   drift 2.1e-3, over the screen: not an answer at all
//
// The third of those is the reason the lesson exists in this shape. A student
// who runs one integration and writes down what happened has learned a fact
// about a timestep. The only way to know which fact is about the planet is to
// halve the step and see whether the answer holds, and steps 16 to 22 make the
// student do exactly that and get caught.
//
// The circumbinary half carries the other half of the honesty. At 40 binary
// periods, planets at 2.5 and 3.0 separations "survive" although the published
// boundary puts them well inside the unstable region - and their maximum
// excursions, 25 and 14 separations, show them being flung most of the way out
// and coming back. Holman & Wiegert integrated for 10^4 periods. This lesson
// integrates for 40 and says so, which is why nothing in it is ever called
// stable.
//
// On the boundary itself: it is shown, with its source, its assumptions and its
// range, and the lesson deliberately walks the student through a case where the
// simulation and the fit disagree. A fit that is treated as a law teaches worse
// physics than no fit at all.
// =============================================================================

/** A planet around the heavier star of the pair. */
const S_LAB = {
  scenario: 'Binary Planet Lab',
  seed: 'binary',
  paused: false,
};

/** The same two stars, with the planet outside them both. */
const P_LAB = {
  scenario: 'Circumbinary Planet Lab',
  seed: 'binary',
  paused: false,
};

/**
 * The three bodies each configuration is made of, bound by exact name.
 *
 * Both scenarios build the same cast - two stars and a planet - and differ in
 * where the planet is put. That is precisely the thing a reader has to keep
 * hold of while a sweep runs, so the chips name all three and selecting the
 * planet is how they check which configuration is on screen.
 */
const BINARY_CAST = {
  starA: { name: 'Star A' },
  starB: { name: 'Star B' },
  planet: { name: 'Planet' },
};

/**
 * Which configuration is on the canvas, and whether the last run still
 * describes it.
 *
 * Two things a reader could not previously see. The first is which of the
 * bodies the panel is talking about - a sweep reports a number and the scene
 * is three dots. The second is whether that number is still about this scene:
 * results stay on screen after an intervention, and nothing said so.
 */
const runRows = ctx => {
  const rows = [];
  const roles = ctx.roles() || [];
  const named = roles.map(r => ctx.role(r)?.name).filter(Boolean);
  rows.push({
    label: 'On the canvas',
    value: named.length ? named.join(', ') : 'nothing bound yet',
  });
  const run = ctx.experiment();
  if (!run) {
    rows.push({ label: 'Last run', value: 'none yet' });
    return rows;
  }
  const fresh = ctx.runMatchesScene(run);
  rows.push({
    label: 'Last run',
    value: run.name || 'unnamed',
  });
  rows.push({
    label: 'Does it still describe this scene?',
    value:
      fresh === null
        ? 'cannot tell — it was recorded before runs carried a world stamp'
        : fresh
          ? 'yes'
          : 'NO — the scene has been rebuilt since, so re-run before comparing',
    emphasis: fresh === false,
  });
  return rows;
};

const BINARY_STAR_PLANETS = {
  id: 'binary-star-planets',
  thumbnail: 'images/scenarios/binary-planet-lab.webp',
  title: 'Planets in Binary Stars',
  subtitle: 'What survives around two stars, and how you would know',
  duration: '40-50 min',
  level: 'Introductory astronomy',
  // Subject tags, for the browser's filters. A fixed vocabulary
  // shared across the catalogue rather than free text, so a filter can offer
  // the whole set without a second list to keep in step.
  tags: ['exoplanets', 'stars', 'chaos'],
  lock: { placement: true },
  summary:
    'Most stars come in pairs, so most planets have to make a living in a system with two suns. Some orbits work and some do not, and the line between them is sharper than you would guess. Find it twice — once for a planet around one star, once for a planet around both — and then find out how much of what you just measured was the physics and how much was the arithmetic.',
  objectives: [
    'Predict which planetary orbits in a binary survive an integration, for a planet around one star and for a planet around both',
    'Distinguish a physical outcome — ejection, collision, survival — from a numerical failure of the integration that produced it',
    'Show that repeating a run at half the timestep, not conserving energy, is the test that settles an outcome',
    'State what a finite integration can and cannot establish about the long-term fate of an orbit',
    'Use a published empirical stability boundary within its stated assumptions and range, and say what it does not cover',
  ],
  steps: [
    // --- Part 1: the system, and what a result here will mean ---------------
    {
      sid: 'two-suns',
      bind: BINARY_CAST,
      type: 'read',
      title: 'Two suns',
      setup: S_LAB,
      body: `Rather more than half of the Sun-like stars in the galaxy have at
             least one companion. Planets in those systems are not a curiosity;
             they are the normal case, and the Sun's single-star arrangement is
             the one that needs explaining.
             \n\nOn screen are two stars — one solar mass and half a solar mass —
             ten AU apart on an orbit with eccentricity 0.4, so they swing
             between six and fourteen AU of each other every twenty-six years.
             The small blue trail is an Earth-mass planet going round the heavier
             star at 1.5 AU.
             \n\nThe question for the next forty minutes is the obvious one:
             <strong>where can a planet be here and stay?</strong>`,
      tip: 'Alpha Centauri A and B are a real version of this: 1.13 and 0.97 solar masses, 23.5 AU apart, eccentricity 0.52.',
    },
    {
      sid: 'nothing-here-is-random',
      bind: BINARY_CAST,
      type: 'read',
      title: 'Nothing here is random',
      body: `The scenario next to this one in the gallery — "Binary Star System"
             — builds its stars from a random number generator. It is a fine
             thing to watch and useless to experiment on, because two loads of
             it are two different systems and any difference between them means
             nothing.
             \n\nThis lab is the opposite. Every number is written down:
             \n\n<strong>Star A</strong> 1.0 solar masses ·
             <strong>Star B</strong> 0.5 solar masses ·
             <strong>separation</strong> 10 AU ·
             <strong>eccentricity</strong> 0.4 ·
             <strong>both starting angles</strong> zero, at periapsis
             \n\nSo when you change where the planet starts and run it again,
             the planet's starting radius is the only thing that changed. That
             is what makes this an experiment rather than an anecdote.`,
      tip: 'Load the scenario twice and the three bodies land on identical positions and velocities, to the last bit. Nothing in this lab is seeded, because nothing in it is sampled.',
    },
    {
      sid: 'before-you-run-anything',
      bind: BINARY_CAST,
      type: 'predict',
      title: 'Before you run anything',
      body: `The stars are 10 AU apart on average and come within 6 AU of each
             other at their closest. A planet going round Star A has to live
             somewhere inside that.
             \n\nCommit to a number now. You will be measuring against it for the
             rest of the lesson.`,
      prompt:
        'How far from Star A do you think a planet can be and still survive, as a fraction of the 10 AU separation?',
      options: [
        'Almost all of it — anywhere inside about 0.9 of the separation',
        'Roughly half of it',
        'Something like a fifth of it',
        'Only very close in — a few per cent',
      ],
      answer: 2,
      because: `About a fifth, and for this pair it turns out to be a little
                under. The stable zone is much smaller than the space that looks
                available, which is the first surprise in this lesson and not
                the last.`,
    },
    {
      sid: 'what-survived-will-mean',
      bind: BINARY_CAST,
      type: 'read',
      title: 'What "survived" is going to mean',
      body: `One piece of vocabulary before any measuring, because it decides
             what you are allowed to say at the end.
             \n\nEvery run in this lesson has a stated length — twenty binary
             periods, or forty. When a planet is still in orbit at the end, the
             panel will say it <strong>survived this integration</strong>. It
             will never say the orbit is stable, and neither should you.
             \n\nThe difference is not pedantry. Instability in these systems is
             usually slow: a resonance nudges the planet's eccentricity a little
             on each pass, the nudges accumulate, and a planet that circled
             quietly for three hundred periods leaves on the three hundred and
             first. Twenty periods cannot see that. The study you will compare
             against later ran for ten thousand.`,
      tip: 'This is a general habit rather than a fact about binaries. "The simulation did not blow up in the time I ran it" is a much weaker claim than "this is stable", and they are easy to confuse.',
    },

    // --- Part 2: a planet around one star ------------------------------------
    {
      sid: 'run-the-default',
      bind: BINARY_CAST,
      probe: runRows,
      type: 'explore',
      title: 'Run it as it stands',
      setup: S_LAB,
      body: `Open <strong>Binary Planet Run</strong> from the Tools list on the
             right. It is set to the configuration on screen: the planet
             starting at 0.15 of the binary separation — 1.5 AU — and twenty
             binary periods to integrate, which is a bit over five hundred
             years and about half a minute of watching.
             \n\nPress <strong>Run</strong> and watch. The planet goes round
             about six times a second, so what you can see is not an individual
             orbit but the band it occupies. Watch whether that band holds its
             shape.`,
      checklist: [
        'Watch the trail band: does it stay a ring, or does it start to breathe in and out as the stars swing past?',
        'Read "Integrated" as it climbs — it counts binary periods, not years',
        'Watch the "Planet’s orbit now" row: the semi-major axis barely moves, and the eccentricity does not sit still',
        'Watch "Highest eccentricity reached" — it does not come back down',
        'Note the energy drift while the run is quiet; you will want the comparison later',
        'Let it finish, and read the sentence at the bottom of the panel',
      ],
      tip: 'Turn the speed down with the transport controls if you want to see a single orbit rather than the band.',
    },
    {
      sid: 'what-the-quiet-run-did',
      bind: BINARY_CAST,
      // "With the run finished, read four numbers off the panel" - the run
      // that step performs.
      requires: ['run-the-default'],
      type: 'measure',
      title: 'What the quiet run did',
      body: `With the run finished, read four numbers off the panel.`,
      fields: [
        {
          id: 'periods',
          label: 'Binary periods integrated',
          unit: '',
          hint: 'periods',
        },
        {
          id: 'farthest',
          label: 'Farthest out, in binary separations',
          unit: 'a',
          hint: 'separations',
        },
        {
          id: 'encounters',
          label: 'Close encounters with Star B',
          unit: '',
          hint: 'count',
        },
        {
          id: 'drift',
          label: 'Energy drift, in per cent',
          unit: '%',
          hint: 'per cent',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.periods) || !Number.isFinite(v.farthest)) {
          return null;
        }
        if (v.periods < 20) {
          return {
            level: 'warn',
            message:
              'The run should reach a full twenty periods. If it stopped early, the planet left — check the starting radius is 0.15.',
          };
        }
        if (v.farthest > 2) {
          return {
            level: 'warn',
            message:
              'That is much further out than this configuration goes. Check you are reading the row in binary separations rather than AU.',
          };
        }
        return {
          level: 'ok',
          message:
            'A quiet run: never much more than half a separation out, never near the other star, and energy conserved to a couple of parts in a million.',
        };
      },
    },
    {
      sid: 'why-so-quiet',
      bind: BINARY_CAST,
      type: 'question',
      kind: 'choice',
      title: 'Why was that so quiet?',
      body: `The planet stayed within about 0.62 separations of the barycenter
             and never came within a quarter of a separation of Star B.`,
      prompt:
        'The planet at 1.5 AU barely notices the companion star. The best reason is:',
      options: [
        'Star B is only half the mass of Star A',
        'The planet is close enough to Star A that Star A’s pull dominates everywhere on its orbit',
        'The planet is too light to be affected',
        'Star B never gets close to the planet’s orbit',
      ],
      answer: 1,
      because: `Proximity, not mass. At 1.5 AU from a 1.0 solar-mass star the
                planet feels a pull about eighteen times stronger than the one
                from a 0.5 solar-mass star six AU away at its closest. The
                companion is a perturbation rather than a competitor, and a
                perturbation that small mostly averages out.
                \n\nMostly. Look again at the highest-eccentricity row from that
                run: it starts near zero and finishes around 0.17, and it climbs
                steadily rather than wobbling. The orbit that "survived
                untroubled" was being pumped the whole time — slowly, and with
                twenty periods nowhere near enough to see where it ends up.
                Hold on to that when the word "stable" comes up later.`,
    },
    {
      sid: 'move-it-out',
      bind: BINARY_CAST,
      type: 'predict',
      title: 'Move it out',
      body: `Now double the planet's starting radius, to 0.30 of the separation
             — 3 AU. That is still less than half the closest the two stars
             ever come to each other, so the planet is nowhere near either of
             them at the start.`,
      prompt: 'At 0.30 separations, over twenty binary periods, you expect:',
      options: [
        'Much the same as before — a slightly wider, slightly wobblier ring',
        'A ring that visibly breathes but stays put',
        'The planet to leave',
        'The planet to fall into one of the stars',
      ],
      answer: 2,
      because: `It leaves, and it does not take long about it. Doubling the
                radius from 0.15 to 0.30 is the difference between an
                undisturbed orbit and no orbit at all.`,
    },
    {
      sid: 'run-it-at-030',
      bind: BINARY_CAST,
      probe: runRows,
      type: 'explore',
      title: 'Run it at 0.30',
      setup: S_LAB,
      body: `Set <strong>Planet start</strong> to <strong>0.30</strong> and
             press Run. The world is rebuilt from scratch — same two stars, same
             starting angles, planet in a new place — so this is the same
             experiment with one thing changed.
             \n\nThis one will not take twenty periods.`,
      checklist: [
        'Watch the ring stop being a ring within the first period or two',
        'Watch the "Farthest out" figure climb past 1, then past 5',
        'Read when the run stopped, and why',
      ],
      tip: 'The run ends itself once the planet is unbound and more than ten separations out. Integrating a departing planet for another eighteen periods would tell you nothing.',
    },
    {
      sid: 'when-did-it-leave',
      bind: BINARY_CAST,
      // Reads the 0.30 run off the panel.
      requires: ['run-it-at-030'],
      type: 'measure',
      title: 'When did it leave?',
      body: `Read the run off the panel.`,
      fields: [
        {
          id: 'ejectAt',
          label: 'Binary periods completed before it left',
          unit: '',
          hint: 'periods',
        },
        {
          id: 'ejectEnc',
          label: 'Close encounters with Star B',
          unit: '',
          hint: 'count',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.ejectAt)) return null;
        if (v.ejectAt >= 20) {
          return {
            level: 'warn',
            message:
              'A full twenty periods means it did not leave. Check the starting radius really is 0.30 — the panel shows the value it used.',
          };
        }
        return {
          level: 'ok',
          message:
            'A few binary periods, and one close pass with the companion was enough to do it.',
        };
      },
    },
    {
      sid: 'ejected-means-what',
      bind: BINARY_CAST,
      type: 'question',
      kind: 'choice',
      title: 'What does "ejected" mean here?',
      body: `The panel called that an ejection. It has two conditions for the
             word and it needs both: the planet must have positive energy with
             respect to <em>both</em> stars, and it must be more than ten binary
             separations away.`,
      prompt: 'Why is positive energy on its own not enough?',
      options: [
        'Because energy is not conserved well enough to trust',
        'Because a planet can be briefly unbound during an encounter and still come back',
        'Because the planet’s mass is too small for energy to mean anything',
        'Because the barycenter moves, so energy is measured in the wrong frame',
      ],
      answer: 1,
      because: `A close pass hands the planet energy and then takes some of it
                back. During the encounter the planet can be formally unbound
                for a while and still end up on a wide bound orbit. Requiring
                distance as well means "ejected" describes something that
                actually left.`,
    },
    {
      sid: 'work-out-the-boundary',
      bind: BINARY_CAST,
      type: 'question',
      kind: 'numeric',
      title: 'Somebody has done this properly',
      body: `You have two points: 0.15 survives, 0.30 does not. The boundary is
             somewhere between, and finding it precisely would take rather more
             than forty minutes.
             \n\nIn 1999 Matthew Holman and Paul Wiegert did it properly. They
             integrated test particles in binaries across a grid of mass ratios
             and eccentricities, for ten thousand binary periods each, and
             fitted a formula to where the transition sat:
             \n\n<strong>a_c / a_b = 0.464 − 0.380 μ − 0.631 e + 0.586 μe
             + 0.150 e² − 0.198 μe²</strong>
             \n\nwhere <strong>μ</strong> is the companion's share of the total
             mass — 0.5 / 1.5 = 0.333 here — and <strong>e</strong> is the
             binary's eccentricity, 0.4. The panel prints the result for
             whatever configuration you ran, and prints the assumptions behind
             it alongside. Work it out yourself first.`,
      prompt: 'Critical semi-major axis, in units of the binary separation',
      answer: 0.177,
      unit: '',
      tolerance: 0.012,
      hints: {
        concept: `Six terms, and the two that matter most are the two big
                  negative ones: a heavier companion and a more eccentric binary
                  each pull the boundary inward.`,
        method: `Work through them in order: 0.464, −0.1266, −0.2524, +0.0781,
                 +0.0240, −0.0106. Add them up.`,
      },
      worked: `0.464 − 0.1266 − 0.2524 + 0.0781 + 0.0240 − 0.0106 = 0.177. In a
               10 AU binary that is 1.77 AU — so the planet you ran at 1.5 AU
               was inside it and the one at 3 AU was well outside, which is what
               happened.`,
      because: `About 0.177 separations, or 1.77 AU for these stars. Your two
                runs sit on either side of it, which is the fit and the
                simulation agreeing — the only place in this lesson where they
                do so without argument.`,
      tip: 'Holman, M. J. & Wiegert, P. A. 1999, The Astronomical Journal, 117, 621: "Long-Term Stability of Planets in Binary Systems".',
    },
    {
      sid: 'what-the-fit-assumes',
      bind: BINARY_CAST,
      type: 'question',
      kind: 'choice',
      title: 'What the fit assumes',
      body: `The panel lists the assumptions behind that formula. One of them
             matters more than the others for anyone who wants to use it on a
             real system.`,
      prompt:
        'Holman & Wiegert’s planets were massless test particles on coplanar, prograde, initially circular orbits. Which of these would most clearly put a real system outside the fit?',
      options: [
        'A planet of one Earth mass rather than exactly zero',
        'A planet on an orbit tilted forty degrees out of the binary’s plane',
        'A binary with a mass ratio of 0.4 rather than 0.333',
        'A planet observed for only fifty binary periods',
      ],
      answer: 1,
      because: `Inclination. The fit is two-dimensional, and a planet forty
                degrees out of the plane is a different problem — one where the
                Kozai–Lidov mechanism can trade inclination for eccentricity and
                destabilise orbits the flat fit calls safe. The other three are
                all inside its scope or beside the point: an Earth mass is a
                millionth of the star, μ = 0.4 is well within the fitted range,
                and how long you watched is not a property of the system.`,
      tip: 'Worth trying before you move on: run 0.20, just outside the boundary. The paper reports islands of instability inside the fitted line and islands of stability outside it, and the panel declines to predict at all within 0.02 separations of it. A fit to where a transition mostly sits is not a wall.',
    },

    // --- Part 3: is the answer about the planet or the arithmetic? -----------
    // --- The sweep: the same run at five radii, without the typing ---------
    {
      sid: 'predict-the-sweep',
      bind: BINARY_CAST,
      type: 'predict',
      title: 'Five radii at once',
      body: `You have run two configurations by hand and read four numbers off
             the panel each time. Doing that for three more is not going to
             teach you anything the first two did not — so the panel will do it.
             

Open <strong>Sweep the starting radius</strong> at the bottom
             of the Binary Planet Run panel. It runs the same twenty-period
             experiment at <strong>0.12, 0.15, 0.18, 0.22 and 0.30</strong>
             separations, with the masses, the eccentricity, the seed, the
             integrator and the step held exactly as they are now. The only
             thing that changes between trials is where the planet starts.
             

The published boundary is at 0.177. Commit before you run it.`,
      prompt: 'Which of these do you expect the five trials to show?',
      options: [
        'Survival below 0.177 and ejection above it, sharply',
        'Survival at the small radii and ejection at the large ones, with the change somewhere near 0.177 but not necessarily at it',
        'Ejection at every radius, because the binary is eccentric',
        'Survival at every radius, because twenty periods is not long',
      ],
      answer: 1,
      because: `The second. The fit is a fit to where a transition mostly sits,
                across a grid of systems — not a wall in this one. The paper
                itself reports islands of instability inside the line and
                islands of stability outside it, and twenty periods is short
                enough that a slow instability has not finished happening. What
                you should expect is a change of outcome somewhere in the
                neighbourhood of 0.177, and no guarantee about exactly where.`,
      tip: 'A prediction you have written down is what makes the result evidence rather than a demonstration.',
    },
    {
      sid: 'run-the-sweep',
      bind: BINARY_CAST,
      probe: runRows,
      type: 'explore',
      title: 'Run the sweep',
      setup: S_LAB,
      requires: ['predict-the-sweep'],
      body: `Press <strong>Run the sweep</strong> and leave it. Five trials of
             twenty binary periods takes about <strong>four to seven
             minutes</strong> depending on the machine — roughly what the five
             runs would have cost you by hand, minus the typing and the
             copying.
             

Watch what it reports as it goes. Each trial ends with an
             <em>outcome</em>, not a score: still there at the end, left the
             system, hit a star, or nothing established. That last one is a
             real result and it is why the table has a column for periods done
             against periods asked.`,
      tip: 'Stop is there if you need it. A stopped sweep keeps the trials it finished and says which radii it never reached, rather than quietly reporting four points as five.',
    },
    {
      sid: 'read-the-sweep',
      bind: BINARY_CAST,
      type: 'measure',
      title: 'Read the five trials',
      requires: ['run-the-sweep'],
      body: `Read these off the table. Every trial ran the same twenty periods,
             so the outcomes are comparable with each other and with the two
             runs you did by hand.`,
      fields: [
        {
          id: 'sweep_survived',
          label: 'Trials still there at the end',
          unit: '',
          hint: '4',
        },
        {
          id: 'sweep_last_survivor',
          label: 'Largest starting radius that survived',
          unit: 'separations',
          hint: '0.22',
        },
        {
          id: 'sweep_first_loss',
          label: 'Smallest starting radius that did not',
          unit: 'separations',
          hint: '0.30',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.sweep_last_survivor)) return null;
        if (v.sweep_last_survivor >= v.sweep_first_loss) {
          return {
            level: 'error',
            message:
              'The survivor has to be inside the loss, or the two columns have been read the wrong way round.',
          };
        }
        if (v.sweep_last_survivor > 0.177) {
          return {
            level: 'ok',
            message:
              'Your last survivor is outside the published boundary of 0.177 — which the paper allows for, and which is the next question.',
          };
        }
        return {
          level: 'ok',
          message:
            'The change of outcome sits between your two figures. Where exactly, this sweep does not say.',
        };
      },
    },
    {
      sid: 'what-the-sweep-shows',
      bind: BINARY_CAST,
      type: 'question',
      kind: 'choice',
      title: 'What five points support',
      requires: ['read-the-sweep'],
      body: `The plot puts each trial at its own starting radius, on the row for
             what happened to it. It draws no line through them, and that is
             deliberate.`,
      prompt: 'Why not join them up?',
      options: [
        'Because five points are not enough to fit a curve to',
        'Because a line would assert that everything between two tested radii behaves like its neighbours, which is the claim the paper explicitly denies',
        'Because the outcomes are words rather than numbers',
        'Because the trials were run in a random order',
      ],
      answer: 1,
      because: `A line between 0.22 and 0.30 would say that everything in
                between survives up to some crossing point and is ejected after
                it. Holman & Wiegert found islands of both on either side of
                their fitted line — the transition is not sharp and is not
                monotone in radius. Five samples of a system like that are five
                facts about five radii.`,
      tip: 'The third option is not the reason: an outcome is a category, and categories are perfectly plottable. What they are not is interpolatable.',
    },
    {
      sid: 'resolve-the-edge',
      bind: BINARY_CAST,
      probe: runRows,
      type: 'explore',
      title: 'Is the edge real, or is it the arithmetic?',
      setup: S_LAB,
      requires: ['read-the-sweep'],
      body: `Pick the trial where the outcome changes — the selector marks it —
             and press <strong>Check it</strong>. That re-runs that one radius
             at <strong>half the step</strong>, with everything else identical,
             and compares the two outcomes.
             

This is the same test you did by hand at 0.25, applied to the
             one value in the sweep where it matters. A configuration whose
             fate changes when you halve the step has not been measured at
             either step.`,
      tip: 'It reruns one trial rather than the whole sweep, which is the point: the check belongs where the answer is in doubt.',
    },
    {
      sid: 'is-it-resolved',
      bind: BINARY_CAST,
      type: 'question',
      kind: 'choice',
      title: 'What the recheck settles',
      requires: ['resolve-the-edge'],
      body: `Suppose the two steps agree: the planet is ejected at that radius
             at both the step you swept at and half of it.`,
      prompt: 'What has that established?',
      options: [
        'That the planet is unstable at that radius',
        'That the ejection is not an artefact of the step size, over these twenty periods',
        'That the published boundary is wrong',
        'That the sweep can be trusted at every other radius too',
      ],
      answer: 1,
      because: `The second, and only the second. Agreement between two step
                sizes rules out the arithmetic as the cause of what you saw. It
                says nothing about what happens after period twenty, nothing
                about the radii you did not check, and nothing about the
                published fit, which is built on ten thousand periods across a
                grid of systems rather than twenty in this one.`,
      tip: 'The panel says the same thing in its own words underneath the table, and the notebook entry carries it into anything you export.',
    },

    {
      sid: 'a-harder-question',
      bind: BINARY_CAST,
      type: 'read',
      title: 'A harder question than "what happened"',
      body: `Everything so far has taken the simulation at its word. It is time
             to stop doing that.
             \n\nThe integrator advances the three bodies in steps. Between two
             steps it does not know what happened; it assumes the forces were
             what they were at the start. That is fine when nothing much is
             changing and badly wrong during a close pass, when the force on the
             planet can double and halve inside a single step.
             \n\nA badly resolved close pass hands the planet the wrong amount of
             energy. The planet then leaves, or does not, for reasons that have
             nothing to do with the binary. <strong>Both look exactly like
             physics from the outside.</strong>`,
      tip: 'The panel shows the step it actually integrated at, which is not always the step you asked for: if the machine is struggling, the render loop takes bigger steps to keep up.',
    },
    {
      sid: 'energy-drift-as-a-screen',
      bind: BINARY_CAST,
      probe: runRows,
      type: 'explore',
      title: 'The first check, and its limits',
      setup: S_LAB,
      body: `The obvious guard is energy. The three bodies form a closed system,
             so their total energy cannot change; if the number the simulation
             reports has moved, the arithmetic has gone wrong somewhere. The
             panel screens on this, and past a tenth of a per cent it refuses to
             report an outcome at all — it does not say the planet was ejected,
             because it does not know.
             \n\nTry it. Set the planet to <strong>0.50</strong> separations,
             which starts it almost on top of Star B, and run. You will not get
             an answer; you will get a complaint and an instruction. Follow the
             instruction — and keep following it until the panel is willing to
             tell you something.
             \n\nOne halving will not be enough, which is worth noticing. Fixing
             a badly resolved encounter is not a matter of doing slightly better;
             either the step resolves the pass or it does not.`,
      checklist: [
        'Run 0.50 at the default step of 1.0 and read the drift — about 0.18%, well over the screen',
        'Look at the planet\u2019s eccentricity while you are there: it comes out above 100, which is not an orbit, it is an explosion',
        'Note that the panel declines to say what happened to the planet',
        'Press "Repeat at half the step". The drift is 0.17% — essentially unchanged, and still refused',
        'Press it again. At a step of 0.25 the drift is 0.0023%, and now there is an answer: the planet hit a star, one hundredth of a binary period in',
      ],
      tip: 'A tenth of a per cent is not a natural constant. It was measured: on these configurations, every run that drifted more than that gave an outcome that changed when the step was halved. Note also what the answer turned out to be — a collision, not an ejection. Two of the four things that can happen to the planet here look similar from a distance and are told apart by the panel rather than by eye.',
    },
    {
      sid: 'the-case-that-matters',
      bind: BINARY_CAST,
      probe: runRows,
      type: 'explore',
      title: 'Now the case that matters',
      setup: S_LAB,
      body: `Set the planet to <strong>0.25</strong> separations, leave the step
             at <strong>1.0</strong>, and run the full twenty periods.
             \n\nWatch this one properly. It is not a quiet run: the trail band
             stretches and reshapes, and the encounter counter climbs steadily.
             Note the outcome, the encounter count and the energy drift.
             \n\nThen press <strong>Repeat at half the step</strong>. Twice.`,
      checklist: [
        'Run 0.25 at step 1.0 — record the outcome, the encounters and the drift',
        'Halve to 0.5 — record the same three',
        'Halve to 0.25 — record the same three',
        'Ask yourself which of the three runs you would put in a paper',
      ],
      tip: 'Each halving doubles the wall-clock time. The last one takes a couple of minutes; it is the most important run in the lesson.',
    },
    {
      sid: 'the-drift-was-tiny',
      bind: BINARY_CAST,
      // Records what the 0.25 runs said.
      requires: ['the-case-that-matters'],
      type: 'measure',
      title: 'Three runs of the same configuration',
      body: `Write down what the three runs said. The point of the exercise is
             in the disagreement, so record it even if — especially if — it
             looks like a mistake.`,
      fields: [
        {
          id: 'coarseDrift',
          label: 'Energy drift at step 1.0, in per cent',
          unit: '%',
          hint: 'per cent',
        },
        {
          id: 'fineDrift',
          label: 'Energy drift at step 0.25, in per cent',
          unit: '%',
          hint: 'per cent',
        },
        {
          id: 'agree',
          label: 'Number of the three runs that agreed on the outcome',
          unit: '',
          hint: 'of 3',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.coarseDrift)) return null;
        if (v.coarseDrift > 0.1) {
          return {
            level: 'warn',
            message:
              'That is above the screen, so the panel would have refused to report an outcome. Check you are reading the run at step 1.0 with the planet at 0.25.',
          };
        }
        return {
          level: 'ok',
          message:
            'Both runs conserve energy to better than a part in a million — and that is exactly what makes this case worth the trouble.',
        };
      },
    },
    {
      sid: 'which-answer-is-right',
      bind: BINARY_CAST,
      type: 'question',
      kind: 'choice',
      title: 'Which answer is right?',
      body: `At step 1.0 the planet survived twenty periods, with dozens of close
             encounters along the way. At step 0.25 it was ejected. The energy
             drift was under a part in a million in both.`,
      prompt: 'The honest thing to report from these runs is:',
      options: [
        'That the planet survives, since the run that survived conserved energy just as well',
        'That the planet is ejected, since the finer step is always more accurate',
        'That this configuration is not resolved at either step, so neither run establishes an outcome',
        'That the simulation is broken and the runs should be discarded',
      ],
      answer: 2,
      because: `Neither run establishes anything on its own. The finer step is
                more accurate and that is a reason to prefer it, not a reason to
                trust it: what a changing answer tells you is that the answer is
                still moving, and the next halving might move it again. The
                claim you can make is about the configuration — that its fate at
                twenty periods is not settled by an integration at these steps —
                and that is a real result, not a failure.`,
    },
    {
      sid: 'convergence-is-the-test',
      bind: BINARY_CAST,
      type: 'read',
      title: 'Convergence is the test',
      body: `So the rule that actually applies, and it is not the one about
             energy:
             \n\n<strong>An outcome counts when halving the step leaves it
             unchanged.</strong>
             \n\nEnergy conservation is a screen. It catches the disasters, and
             the 0.50 run you did earlier is a disaster it caught. It cannot
             catch this, because energy is one number and a badly resolved
             three-body encounter can go wrong in ways that do not show up in
             it.
             \n\nNotice what convergence does <em>not</em> require. Two runs of a
             chaotic system at different steps diverge in position almost
             immediately, and they will not agree on when the planet left, or
             where it went. That is expected. They have to agree on
             <em>whether</em>.`,
      tip: 'This is standard practice rather than anything special to binaries. A published N-body result carries a convergence study, and a reviewer who does not find one asks for it.',
    },
    {
      sid: 'report-it',
      bind: BINARY_CAST,
      type: 'question',
      kind: 'short',
      title: 'Write the sentence',
      body: `Suppose you had to hand these three runs to somebody else.`,
      prompt:
        'In two or three sentences, write what you would report about a planet at 0.25 binary separations in this system — including what you did to find out and what you still do not know.',
      because: `A good answer names the configuration, says what was run and at
                what steps, reports that the outcome changed between them, and
                stops short of a verdict on the planet. Something like: "At 0.25
                separations, integrated for 20 binary periods, the planet
                survived at a step of 1.0 and was ejected at 0.25, with energy
                conserved to better than 1e-6 in both. The outcome has not
                converged, so this integration does not determine the planet's
                fate; the run at 0.30 separations, which was ejected at every
                step tried, does."`,
      rubric: `Four things earn credit, and the fourth is the one worth arguing
               about with a class.
               \n\n(1) The configuration is named: 0.25 binary separations, in
               this binary, integrated for 20 binary periods.
               \n(2) The method is stated: the same configuration run at more
               than one timestep.
               \n(3) The disagreement is reported rather than resolved — the
               planet survived at the coarse step and was ejected at the fine
               one.
               \n(4) No verdict is offered on the planet's fate.
               \n\nFull credit needs all four. The commonest miss is (4): a
               student writes up the finer-step run as the answer, on the
               reasonable-sounding grounds that a smaller step is more accurate.
               It is more accurate, and that is still not the same as converged
               — the next halving might move it again. Worth drawing out: a
               student who reports "ejected, because the finer step is better"
               has understood the numerics and drawn the wrong conclusion from
               them, which is a more interesting error than not knowing.
               \n\nA student who reports that the simulation is broken has
               missed that a non-converged result is a result. Point them at the
               0.30 run, which agreed at every step tried, and ask what is
               different about it.`,
      tip: 'Saying what you do not know is not a weakness in a result. It is most of what makes it usable by somebody else.',
    },

    // --- Part 4: a planet around both stars ----------------------------------
    {
      sid: 'around-both',
      bind: BINARY_CAST,
      type: 'read',
      title: 'Around both at once',
      setup: P_LAB,
      body: `The other place a planet can live in a binary is outside both stars,
             going round the pair as though it were a single object. These are
             called circumbinary planets, and they exist: Kepler-16b, found in
             2011, orbits a 0.69 and a 0.20 solar-mass pair every 229 days.
             \n\nThe same two stars are on screen, with the planet moved out to
             40 AU — four times their separation. Everything else is identical.
             \n\nFar enough away, the two stars start to look like one object of
             1.5 solar masses and the planet has an ordinary Keplerian orbit.
             The question is how far "far enough" is.`,
      tip: 'Kepler-16b takes about 229 days to go round a pair that orbit each other in 41. It is far enough out to see them as one star, and only just.',
    },
    {
      sid: 'which-way-round',
      bind: BINARY_CAST,
      type: 'predict',
      title: 'Which way round is the danger?',
      body: `For a planet around one star, the rule was "close in is safe, far
             out is dangerous". Think about what happens to a circumbinary
             planet as you bring it inward toward the pair.`,
      prompt: 'For a planet orbiting both stars, you would expect:',
      options: [
        'The same rule: close to the pair is safe, far out is dangerous',
        'The opposite: far out is safe, and there is a minimum distance below which it fails',
        'No boundary at all, since the planet is outside both stars',
        'A boundary that depends on the planet’s mass rather than its distance',
      ],
      answer: 1,
      because: `The opposite, and the reason is the approximation. Far out, the
                pair looks like one mass and the planet has a clean Keplerian
                orbit. Bring it inward and the planet starts to resolve the two
                stars separately — the pull it feels changes as they swing
                around — and that changing pull pumps its orbit. Here the
                boundary is a floor rather than a ceiling.`,
    },
    {
      sid: 'run-the-circumbinary',
      bind: BINARY_CAST,
      probe: runRows,
      type: 'explore',
      title: 'Four separations out, then two',
      setup: P_LAB,
      body: `Forty binary periods this time, because a circumbinary planet is
             slow: at 40 AU it takes about five and a half binary periods to go
             round once, so forty periods is only seven planet orbits. That is
             worth remembering when you read the result.
             \n\nRun it as it stands, at <strong>4.0</strong> separations, and
             watch the ring. Then halve the starting radius to
             <strong>2.0</strong> — 20 AU, still twice as far out as the stars
             are from each other and further than either of them ever reaches —
             and run it again.`,
      checklist: [
        'At 4.0: watch the two stars whirl inside the planet’s orbit, and compare the farthest-out figure with 4.0',
        'At 4.0: the highest eccentricity reached settles around 0.06 and stops climbing',
        'At 2.0: watch the ring stop closing on itself, and watch the eccentricity row while it does',
        'At 2.0: the eccentricity passes 0.25 in the first binary period and 1 in the second — past 1 the orbit is open and the semi-major axis stops existing',
        'At 2.0: read the encounter count when it finishes — it may surprise you',
        'At 2.0: read when it left',
      ],
      tip: 'Nothing came near anything in the second run. This is a different way of losing a planet from the one you saw in the first half of the lesson.',
    },
    {
      sid: 'no-encounter-at-all',
      bind: BINARY_CAST,
      // Reads the circumbinary run off the panel.
      requires: ['run-the-circumbinary'],
      type: 'measure',
      title: 'It left without touching anything',
      body: `Read the run.`,
      fields: [
        {
          id: 'pEjectAt',
          label: 'Binary periods before it left',
          unit: '',
          hint: 'periods',
        },
        {
          id: 'pEnc',
          label: 'Close encounters',
          unit: '',
          hint: 'count',
        },
        {
          id: 'pDrift',
          label: 'Energy drift, in per cent',
          unit: '%',
          hint: 'per cent',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.pEnc)) return null;
        if (v.pEnc > 0) {
          return {
            level: 'warn',
            message:
              'This configuration should record no close encounters at all. Check the starting radius is 2.0 and not something smaller.',
          };
        }
        return {
          level: 'ok',
          message:
            'Ejected in a few binary periods without ever coming near a star, and with the energy conserved to seven parts in a million. Nothing about this run is numerical.',
        };
      },
    },
    {
      sid: 'how-without-a-pass',
      bind: BINARY_CAST,
      type: 'question',
      kind: 'choice',
      title: 'How, with no close pass?',
      body: `The planet at 0.30 separations in the first half was flung out by a
             single close encounter. This one was never within two separations
             of a star and left just as decisively.`,
      prompt: 'What drove it out?',
      options: [
        'A slow leak of energy from the integrator',
        'The pull it feels changes as the stars swing round, and at this distance those changes add up instead of averaging out',
        'The gravitational pull of two stars is stronger than that of one',
        'The planet was never really bound to begin with',
      ],
      answer: 1,
      because: `Resonant forcing. At 2.0 separations the planet's orbital period
                is close to a small-integer multiple of the binary's, so the
                pull it gets is not random — it arrives at nearly the same phase
                of its orbit each time and the small kicks accumulate. You
                watched that happen: the eccentricity row went past 0.25 in the
                first binary period and past 1 in the second, and past 1 an
                orbit does not close. The energy drift of seven parts in a
                million rules out the first option, which is exactly why the
                panel shows it.`,
    },
    {
      sid: 'circumbinary-boundary',
      bind: BINARY_CAST,
      type: 'question',
      kind: 'numeric',
      title: 'The circumbinary boundary',
      body: `The same paper gives a second formula, for planets around both
             stars:
             \n\n<strong>a_c / a_b = 1.60 + 5.10 e − 2.22 e² + 4.12 μ − 4.27 eμ
             − 5.09 μ² + 4.61 e²μ²</strong>
             \n\nThe panel has already worked it out for this system. Read it
             off, or put μ = 0.333 and e = 0.4 in yourself.`,
      prompt: 'Critical semi-major axis, in units of the binary separation',
      answer: 3.605,
      unit: '',
      tolerance: 0.12,
      hints: {
        concept: `This one is a floor rather than a ceiling: a planet must start
                  <em>outside</em> a_c, not inside it.`,
        method: `1.60 + 2.04 − 0.355 + 1.373 − 0.569 − 0.566 + 0.082.`,
      },
      worked: `1.60 + 5.10(0.4) − 2.22(0.16) + 4.12(0.333) − 4.27(0.4)(0.333)
               − 5.09(0.111) + 4.61(0.16)(0.111) = 3.61 separations, or 36 AU.
               So the survivor you ran at 4.0 was outside it and the one at 2.0
               was well inside, which is what happened.`,
      because: `About 3.6 separations — 36 AU for these stars. Note how much
                larger the excluded zone is than in the circumstellar case: a
                circumbinary planet has to stay more than three and a half times
                the stars' separation away.`,
      misconceptions: [
        {
          id: 'usedSType',
          equals: 0.177,
          say: `That is the circumstellar boundary from earlier in the lesson.
                The circumbinary case has its own formula with quite different
                coefficients — and it is a floor rather than a ceiling.`,
        },
      ],
    },
    {
      sid: 'sweep-the-circumbinary',
      bind: BINARY_CAST,
      probe: runRows,
      type: 'explore',
      title: 'Optional: the same sweep, out here',
      setup: P_LAB,
      body: `<strong>Optional, and it takes about eight to twelve minutes.</strong>
             Skip it if the session is short; nothing after this depends on it.
             

The sweep works out here too, with its own range and its own
             window: <strong>2.0, 2.5, 3.0, 3.5 and 4.0</strong> separations,
             forty binary periods each, because a circumbinary planet is slow
             and twenty periods of the pair is only three or four of its own
             orbits.
             

The published boundary for this configuration is 3.61. Predict
             what the five will do before you press it, as you did inside — and
             expect the disagreement you have just been reading about rather
             than a clean line.`,
      tip: 'Longer window, same argument: an outcome is about the window it was watched over, and forty periods out here is a shorter look than twenty was inside.',
    },
    {
      sid: 'where-the-fit-disagrees',
      bind: BINARY_CAST,
      probe: runRows,
      type: 'explore',
      title: 'Where the fit and the simulation disagree',
      setup: P_LAB,
      body: `The fit says 3.61. So a planet at <strong>3.0</strong> separations
             should be disrupted, and one at <strong>2.5</strong> even more so.
             \n\nRun both, for the full forty periods. Read the outcome — and
             then read the <strong>farthest out</strong> figure, which is the
             number that explains the disagreement.`,
      checklist: [
        'Run 3.0 for forty periods: outcome, farthest out, and highest eccentricity reached',
        'Run 2.5 for forty periods: the same three',
        'Compare all three with the 4.0 run, where the planet stayed on its ring at an eccentricity under 0.07',
        'Optional: put two of these side by side in the A/B Bench, recording distance to primary, and read the difference off one time axis',
      ],
      tip: 'Both of these will report that the planet survived the integration. Look at how far it got before it came back.',
    },
    {
      sid: 'who-is-wrong',
      bind: BINARY_CAST,
      type: 'question',
      kind: 'choice',
      title: 'So who is wrong?',
      body: `Both planets survived forty binary periods, and the fit says both
             should have been disrupted. But the one starting at 4.0 never got
             further than 4.0, while the one at 3.0 reached 14 separations and
             the one at 2.5 reached 25 — and came back.`,
      prompt: 'The best reading of this is:',
      options: [
        'The published fit is wrong for this mass ratio',
        'The simulation is wrong, since the fit is from a peer-reviewed paper',
        'Forty binary periods is far too short to test a boundary calibrated at ten thousand, and the huge excursions show the planets are already on their way out',
        'Circumbinary planets are more stable than the fit suggests',
      ],
      answer: 2,
      because: `The run length. Holman & Wiegert called a particle stable if it
                lasted ten thousand binary periods; you ran forty, which is four
                thousandths of that. A planet flung out to twenty-five
                separations and back has not settled into anything — it is being
                pumped, and the pumping has not finished. "Survived this
                integration" and "stable" are different claims, and this is the
                screen where the difference has teeth.`,
    },

    // --- Part 5: what a finite integration is worth --------------------------
    {
      sid: 'the-strongest-claim',
      bind: BINARY_CAST,
      // The claim is about the planet at 0.15, which is the run recorded
      // there.
      requires: ['what-the-quiet-run-did'],
      type: 'question',
      kind: 'choice',
      title: 'The strongest claim',
      body: `A colleague asks what you found out about the planet at 0.15
             separations.`,
      prompt: 'The strongest claim your work supports is:',
      options: [
        'A planet can orbit stably at 1.5 AU in this binary',
        'A planet started at 1.5 AU on a circular orbit stayed on it for twenty binary periods in this integration, and a published fit calibrated at ten thousand periods puts the boundary further out at 1.77 AU',
        'Planets are generally stable inside about a fifth of a binary separation',
        'Nothing, because twenty periods is too short to establish anything',
      ],
      answer: 1,
      because: `The long one, and it is long for a reason: it names the
                configuration, the initial condition, the length of the
                integration and the outside evidence, and it leaves the reader
                able to check any of them. The first claims more than a
                twenty-period run can support. The third generalises from one
                mass ratio and one eccentricity. The fourth throws away a real
                result — a converged, well-conserved run that agrees with the
                literature is worth something, just not everything.`,
      tip: 'None of the limits above make the exercise worthless. They make it a model, which is what every simulation is, and knowing which parts of yours are load-bearing is the difference between using one and being used by one.',
    },
    {
      sid: 'what-you-can-say',
      bind: BINARY_CAST,
      type: 'read',
      title: 'What you can say, and what the model leaves out',
      body: `You have measured a good deal:
             \n\n· A planet at 0.15 separations around one star survived twenty
             binary periods untroubled, and the published fit agrees it should.
             \n· A planet at 0.30 was ejected within three periods, at every
             timestep tried.
             \n· A planet at 0.25 gave different answers at different timesteps,
             so its fate is not determined by these runs.
             \n· A circumbinary planet at 4.0 held its orbit for forty periods;
             one at 2.0 was driven out in three, without ever coming near a star.
             \n· Two configurations the fit calls unstable survived forty
             periods, while visibly being flung most of the way out of the
             system.
             \n\nEvery one of those is a statement about a finite integration of
             a specific configuration. None of them is a statement about
             stability, and the last two are a good demonstration of why the
             distinction is worth keeping.
             \n\nThree limits of the model itself, before you take any of this
             to a real system.
             \n\n<strong>It is flat.</strong> Everything here — the simulation
             and the fit both — is two-dimensional. Real orbits are inclined,
             and an inclined orbit in a binary can trade its tilt for
             eccentricity, which destabilises orbits that are perfectly safe in
             the plane.
             \n\n<strong>The planet is a test particle.</strong> An Earth mass
             against a solar mass. A Jupiter would perturb the stars back, and a
             system with several planets is a different problem again.
             \n\n<strong>The stars are points.</strong> No tides, no radiation,
             no mass loss. A "collision" here means the planet came within about
             0.06 AU of a star's center, because the stars are drawn ten times
             life size and the simulation collides on what is drawn.`,
      tip: 'The gap between "my integration says X" and "nature does X" is where most of the work in computational astrophysics actually lives.',
    },
  ],
};

export default BINARY_STAR_PLANETS;
