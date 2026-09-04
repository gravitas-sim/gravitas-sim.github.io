// =============================================================================
// The Butterfly Effect in Space
// -----------------------------------------------------------------------------
// Sensitive dependence on initial conditions, measured rather than asserted.
//
// The lesson exists because "chaos" is the most misused word in popular
// physics, and four confusions in particular survive an ordinary telling:
//
//   chaos is randomness            It is not. The engine here is deterministic
//                                  to the last bit, and the lesson proves that
//                                  first, before anything diverges.
//   any drift is chaos             It is not. Two nearly identical two-body
//                                  runs also come apart, linearly, because one
//                                  is slightly ahead of the other in phase.
//                                  The lesson measures that case and refuses
//                                  to call it chaos.
//   the computer did it            The obvious objection, and the honest answer
//                                  is refinement: halve the timestep, change
//                                  the integrator, and see whether the answer
//                                  moves. The conclusion rests on that check.
//   three bodies means chaos       It does not. Lagrange's equilateral solution
//                                  is chaotic for equal masses and stable for
//                                  unequal ones, and the figure-eight solution
//                                  is not chaotic at all.
//
// The scenario was chosen against those requirements and against what Gravitas
// can actually integrate; the reasoning, and the measurements behind it, are in
// the comment above the scenario in js/ui.js.
// =============================================================================

const BUTTERFLY_EFFECT = {
  id: 'butterfly-effect',
  thumbnail: 'images/scenarios/three-body-sensitivity-lab.webp',
  title: 'The Butterfly Effect in Space',
  subtitle: 'Run the same system twice and find out how long the answer lasts',
  duration: '55-70 min',
  level: 'Introductory astronomy',
  summary:
    'Two runs of the same three stars, started from positions differing by fifteen hundred kilometres in a system a hundred and thirty million kilometres across, end up somewhere completely different. Nothing random happens in between: the simulation is deterministic, and running it twice from exactly the same numbers gives exactly the same answer both times. Along the way you will measure a case that looks like chaos and is not, put a number on how fast prediction fails, and check that the number is a property of the physics rather than of the computer.',
  objectives: [
    'Show that a deterministic system can be unpredictable, and say why those are not the same thing',
    'Distinguish exponential divergence from the linear drift two nearly identical orbits show anyway',
    'Measure an e-folding time from a log-linear interval, and say why a short run gives an estimate rather than a Lyapunov exponent',
    'Test whether a computed divergence survives a smaller timestep and a different integrator, and reject it if it does not',
    'State why "three bodies" and "chaotic" are not the same claim',
  ],
  steps: [
    // --- Act 1: determinism ------------------------------------------------
    {
      type: 'read',
      title: 'A word that has been worn smooth',
      setup: {
        scenario: 'Three-Body Sensitivity Lab',
        seed: 'chaos-lab',
        paused: true,
      },
      body: `On screen are three stars of six solar masses each, sitting at the
             corners of an equilateral triangle and rotating about their common
             centre like a rigid object. It is not an accident that they fit so
             neatly: this is an exact solution of the three-body problem, found
             by Lagrange in 1772, and if the numbers are set up precisely the
             triangle turns forever without changing shape.

             \n\nIt will not turn forever here. Watch it long enough and it
             comes apart. That is the subject of this investigation, and the
             word usually attached to it — <strong>chaos</strong> — has been
             worn so smooth by use that it is worth saying at the start what it
             does <em>not</em> mean.

             \n\nChaos does not mean random. It does not mean disordered. It
             does not mean the computer gave up. It means one specific thing,
             which you are going to measure: two starts that are almost the same
             lead to futures that are completely different, and the difference
             grows <em>exponentially</em>.

             \n\nEverything in this lesson is aimed at telling that apart from
             three things it is regularly confused with.`,
      tip: 'The simulation is paused. Nothing will move until you let it.',
    },
    {
      type: 'predict',
      title: 'The same numbers, twice',
      body: `Before anything else, the most basic question there is about a
             simulation.

             \n\nSuppose you record this system for forty seconds, then put every
             star back exactly where it started — the same positions, the same
             velocities, the same everything — and record it again for another
             forty seconds.`,
      prompt: 'The two recordings will be…',
      options: [
        'identical, to every decimal place',
        'almost identical, with tiny random differences',
        'noticeably different, because the computer rounds differently each time',
        'completely different, because the system is chaotic',
      ],
      answer: 0,
      because: `Identical, to every decimal place. This matters more than it
                looks. A simulation is arithmetic: the same numbers in the same
                order give the same answer every time, on the same machine and
                in the same browser. There is no dice roll anywhere in the
                engine. Whatever you are about to see is not randomness, and
                proving that <em>first</em> is what makes the rest of the lesson
                mean anything.`,
    },
    {
      type: 'read',
      title: 'How to run the same thing twice',
      body: `Doing this by hand is impossible — you cannot put three stars back
             where they were by eye. The <strong>A/B Bench</strong>, in Tools,
             exists for exactly this.

             \n\nIt works in six moves:

             \n\n<strong>Capture start</strong> records the world as it stands:
             the seed, the clock, every star's position and velocity, and which
             star is which. <strong>Record</strong> runs and samples it.
             <strong>Return to start</strong> puts it all back, exactly.
             Then you change one thing, record again, and compare.

             \n\nOpen the bench now (Tools → A/B Bench), name the experiment
             something you will recognise, and press <strong>Capture start</strong>.
             Then tick <strong>Position</strong> and <strong>Total energy</strong>
             so the runs carry what this lesson needs.`,
      tip: 'The bench keeps the two runs on the same simulated-time axis, which is what makes them comparable at all.',
    },
    {
      type: 'explore',
      title: 'The reproducibility control',
      tool: { id: 'chaos-divergence' },
      body: `Run the identical experiment twice, changing <em>nothing</em>
             between the runs.

             \n\nRecord Run A for about forty seconds. Press
             <strong>Return to start</strong>. Record Run B for about the same
             length, again changing nothing.

             \n\nThe instrument below measures the distance between the two runs
             — how far apart the two versions of the system are, adding up over
             all three stars, at each moment of simulated time.`,
      checklist: [
        'Capture the start and record Run A',
        'Return to start',
        'Record Run B without changing anything',
        'Read the separation the instrument reports',
      ],
      rubric: `The separation should be exactly zero for the whole run, and the
               instrument should say "the two runs are identical". Full credit
               for reporting zero and recognising what it establishes: the
               engine is deterministic, so any difference seen later in the
               lesson has a cause that can be pointed at. Partial credit for
               reporting zero without connecting it to what follows. If a
               student reports a nonzero separation here, the likely cause is
               that they changed a setting between the runs; the bench's own
               "what changed between the runs" line will say so.`,
    },
    {
      type: 'question',
      title: 'What zero proves',
      kind: 'choice',
      body: `Your two runs came apart by exactly nothing.`,
      prompt: 'The right conclusion from that is…',
      options: [
        'this system is not chaotic',
        'the simulation is deterministic: the same input always gives the same output',
        'the simulation is accurate',
        'forty seconds is too short to see anything',
      ],
      answer: 1,
      because: `Deterministic, and nothing more. Determinism is a statement
                about the <em>rule</em>: given a state, the next state follows
                with no element of chance. It says nothing about accuracy — a
                deterministic simulation can be deterministically wrong — and
                nothing about whether the system is chaotic. Those are the next
                two questions, in that order.`,
    },
    // --- Act 2: the two-body control ---------------------------------------
    {
      type: 'read',
      title: 'A control, before the interesting case',
      setup: {
        scenario: 'Binary Pair',
        seed: 'chaos-binary',
        paused: true,
        // The Binary Pair's own year is 795 simulated seconds, and the drift
        // this section measures only becomes visible over several of them. At
        // the scenario's default speed that is ten minutes of watching. The
        // physics is untouched by the speed control - it scales the step, and
        // both runs use the same one - so the comparison is unaffected and the
        // student gets four orbits in about forty seconds.
        settings: { sim_speed: 20 },
      },
      body: `Two stars now, not three. This is the <strong>Binary Pair</strong>
             scenario: two stars circling their common centre of mass on a
             closed, repeating orbit. Two-body motion is the one gravitational
             problem that is completely solved — Newton did it — and nothing
             about it is chaotic. It is the control.

             \n\nWe are going to do something to it that sounds like it should
             not matter: move one star sideways by <strong>1,500 km</strong>
             before starting, and leave everything else alone.

             \n\nFifteen hundred kilometres is about the distance from London to
             Rome. The two stars here are four astronomical units apart, which
             is six hundred million kilometres. So the nudge is about one part
             in four hundred thousand of the system.

             \n\nOne housekeeping note: this pair takes four years to go round
             once, so the lesson has turned the simulation speed up for this
             section. That changes how fast you watch it and nothing about the
             physics — both runs use the same step, so the comparison between
             them is unaffected.`,
    },
    {
      type: 'predict',
      title: 'Nudge one star in a binary',
      body: `Capture the start, record Run A, return to the start, apply the
             1,500 km nudge, and record Run B.`,
      prompt:
        'Over a few orbits, the distance between the two runs will most likely…',
      options: [
        'stay at 1,500 km, because the orbit is stable',
        'grow steadily, roughly in proportion to how long you wait',
        'double, then double again, and again — faster and faster',
        'shrink back to zero as the orbit closes',
      ],
      answer: 1,
      because: `It grows roughly in proportion to time. Here is why: moving a
                star slightly changes its orbital period slightly. Two clocks
                running at very slightly different rates drift apart steadily —
                after twice as long, twice as far out of step. Nothing
                accelerates. This is <em>phase drift</em>, and it is the single
                most common thing mistaken for chaos.`,
    },
    {
      type: 'explore',
      title: 'Measure the binary',
      tool: { id: 'chaos-divergence' },
      body: `Do it. Capture, Run A, return to start, nudge one star by 1,500 km
             along x, Run B.

             \n\nThe bench's perturbation control does the nudge for you and
             records exactly what it changed, so the number is not something you
             have to remember afterwards — it is stored with the experiment and
             printed in your report.

             \n\nWatch two things on the instrument: the shape of the separation
             on the <strong>linear</strong> plot, and what it does on the
             <strong>logarithmic</strong> one.`,
      checklist: [
        'Apply the 1,500 km perturbation to one star',
        'Record both runs over at least four orbits',
        'Read the growth factor and the straight-line r²',
        'Note whether the instrument gives an e-folding time',
      ],
      rubric: `Expect a growth factor of order a hundred over four or five
               orbits, a straight-line fit of r² ≈ 0.99 or better, and — this is
               the point — <strong>no e-folding time</strong>: the instrument
               should refuse, reporting that the separation grows in proportion
               to time rather than exponentially. Full credit requires noticing
               the refusal and reading it as a result rather than a
               malfunction.`,
    },
    {
      type: 'question',
      title: 'The instrument refused',
      kind: 'choice',
      body: `The instrument reported a growth factor but declined to give an
             e-folding time, saying the separation is growing linearly.`,
      prompt: 'That refusal is…',
      options: [
        'a limitation of the software: any growing curve has an exponential fit',
        'correct, and the point: linear growth is not exponential growth, and calling it chaos would be wrong',
        'caused by the run being too short',
        'because two-body orbits are not deterministic',
      ],
      answer: 1,
      because: `Correct, and the point. You can force a straight line through
                the logarithm of <em>any</em> increasing series and read a
                number with units of time off the slope. That number would look
                exactly like a Lyapunov time and would mean nothing. The
                instrument checks whether the exponential actually fits — and
                whether a straight line fits better — before it will quote one.
                An instrument that always gives an answer is not measuring
                anything.`,
    },
    {
      type: 'question',
      title: 'Linear, in numbers',
      kind: 'numeric',
      body: `Suppose the separation in your binary grew from 1,500 km to about
             100,000 km over four orbits, in proportion to time.`,
      prompt:
        'On that behaviour, roughly how far apart would the two runs be after forty orbits, in km?',
      unit: 'km',
      answer: 1000000,
      // Absolute, in kilometres - `tolerance` in js/answerCheck.js is a
      // distance from the answer, not a fraction of it. This was 0.5, written
      // as though it meant fifty percent, and it meant half a kilometre: a
      // question that asks "roughly how far apart" demanded a million to within
      // a half. 150,000 is fifteen percent, which accepts a student who carries
      // the initial 1,500 km through the arithmetic and gets 986,500, and still
      // rejects anyone out by a factor of two.
      tolerance: 150000,
      because: `About a million kilometres — ten times as long gives about ten
                times the separation, because the growth is proportional to
                time. Hold on to that number. In the three-body case you are
                about to run, ten times as long does not give ten times as much;
                it gives something with a great many more zeros on it.`,
    },
    // --- Act 3: the three-body case ----------------------------------------
    {
      type: 'read',
      title: 'Back to the triangle',
      setup: {
        scenario: 'Three-Body Sensitivity Lab',
        seed: 'chaos-lab',
        paused: true,
      },
      body: `Three stars again, in Lagrange's equilateral configuration.

             \n\nA word about why this particular arrangement. Lagrange showed
             in 1772 that three bodies placed at the corners of an equilateral
             triangle, turning at the right rate, is an exact solution — the
             triangle keeps its shape forever. Seventy years later Gascheau
             worked out when that solution is <em>stable</em>, and the answer is
             a clean inequality: it holds only if

             \n\n<strong>27(m₁m₂ + m₂m₃ + m₃m₁) &lt; (m₁ + m₂ + m₃)²</strong>

             \n\nFor three equal masses the left side is 81m² and the right side
             is 9m². The inequality fails by a factor of nine. So this exact,
             perfectly regular solution is <em>unstable</em>: the triangle is
             balanced on a knife edge, and any departure from it grows.

             \n\nThat is not a defect of the simulation. It is a theorem about
             the three-body problem, and it is why this configuration was chosen
             for the lab: it starts perfectly ordered, so there is no doubt about
             what the starting state was, and it departs from that order in a way
             we can measure.`,
    },
    {
      type: 'predict',
      title: 'The same nudge, three bodies',
      body: `The same experiment as the binary: capture, Run A, return, nudge one
             star by 1,500 km, Run B. The triangle here is 0.87 AU on a side —
             130 million kilometres — so the nudge is about one part in ninety
             thousand.`,
      prompt: 'Compared with the binary, the two runs will come apart…',
      options: [
        'at about the same rate: 1,500 km is 1,500 km',
        'more slowly, because three bodies share the disturbance out between them',
        'far faster, and at an accelerating rate',
        'not at all, because the equilateral solution is exact',
      ],
      answer: 2,
      because: `Far faster, and accelerating. Commit to that before you measure
                it, because the size of the effect is genuinely hard to believe
                until you have seen the number.`,
    },
    {
      type: 'explore',
      title: 'Measure the triple',
      tool: { id: 'chaos-divergence' },
      body: `Run it. Capture the start, record Run A for about forty seconds,
             return to start, apply the same 1,500 km perturbation to
             <strong>Alpha</strong>, and record Run B for about the same length.

             \n\nThis time watch the logarithmic plot in particular. On the
             linear plot almost nothing happens and then everything happens at
             once. On the log plot the same data is a straight line, and a
             straight line on a log plot is what exponential growth looks like.`,
      checklist: [
        'Capture the start and record Run A',
        'Return to start and perturb Alpha by 1,500 km',
        'Record Run B',
        'Read the e-folding time and the fitted interval',
      ],
      rubric: `Expect an e-folding time of roughly 6 to 8 simulated seconds, a
               log-linear fit with r² above 0.98, and a total growth of six or
               seven orders of magnitude. Full credit requires the e-folding
               time with its fitted interval, not just "it diverged". A student
               who reports a value far outside 5–9 s has probably recorded runs
               of very different lengths; the bench reports the overlap it
               actually used.`,
    },
    {
      type: 'measure',
      title: 'Write down what you measured',
      tool: { id: 'chaos-divergence' },
      body: `Read these off the instrument and record them. They go into your
             report.`,
      fields: [
        {
          id: 'tau',
          label: 'e-folding time',
          unit: 'simulated seconds',
          hint: '6.9',
        },
        { id: 'r2', label: 'fit quality r²', unit: '', hint: '0.99' },
        {
          id: 'growth',
          label: 'total growth factor',
          unit: '× the starting separation',
          hint: '2e7',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.tau)) return null;
        if (v.tau <= 0) {
          return {
            level: 'error',
            message: 'An e-folding time is a positive number of seconds.',
          };
        }
        if (v.tau < 3 || v.tau > 14) {
          return {
            level: 'warn',
            message:
              'That is a long way from what this configuration gives. Check that both runs cover a similar stretch of simulated time — the instrument reports the overlap it used.',
          };
        }
        if (Number.isFinite(v.r2) && v.r2 < 0.9) {
          return {
            level: 'warn',
            message:
              'A fit that poor means the instrument should not have quoted an e-folding time at all. Check you are reading the three-body run and not the binary.',
          };
        }
        return {
          level: 'ok',
          message:
            'That is the range this configuration gives. Theory predicts 6.0 s for the unstable mode; a finite perturbation measured over a finite window comes out a little longer.',
        };
      },
    },
    {
      type: 'read',
      title: 'What an e-folding time is',
      body: `The instrument fitted a straight line to the logarithm of the
             separation and turned the slope into a time. That time, usually
             written τ, is how long the difference between the two runs takes to
             grow by a factor of e — about 2.7.

             \n\nSo after one τ the two runs are 2.7 times further apart than
             they started. After two, about 7.4 times. After ten, about
             22,000 times. After twenty, about 500 million times. The growth is
             not fast at the beginning, which is exactly what makes it
             treacherous: for the first few seconds the two runs look identical
             on screen.

             \n\nNotice what the instrument shaded on the plot. It does not fit
             the whole run. At the start, the separation is still essentially
             the perturbation itself and has not begun growing; at the end it
             stops growing because the stars have completely rearranged
             themselves and there is no more system to get further apart in.
             Only the stretch in between is exponential, and quoting a rate
             fitted to the flat ends would be quoting a slower rate than the
             real one.`,
    },
    {
      type: 'question',
      title: 'How long does a prediction last?',
      kind: 'numeric',
      body: `Take τ from your measurement. You start knowing the stars' positions
             to 1,500 km, and you want to know when the two runs will be a full
             astronomical unit apart — 150 million km, which is about the size of
             the whole system.

             \n\nThat is a growth factor of 100,000, and ln(100,000) ≈ 11.5.`,
      prompt: 'Using your τ, roughly how long is that, in simulated seconds?',
      unit: 'simulated seconds',
      answer: 79,
      // Absolute, in simulated seconds, and sized to the measurement it is
      // built on. The step says "using your tau", and the lesson's own rubric
      // puts tau anywhere between 6 and 8 seconds; 11.5 tau is therefore
      // anywhere between 69 and 92. This was 0.35 - written as though it were
      // thirty-five percent - which accepted 78.65 to 79.35 and failed almost
      // every student who did exactly what the step asked. Thirteen covers the
      // whole of the stated band, 11.5 x 6 = 69 through 11.5 x 8 = 92.
      tolerance: 13,
      because: `About 11.5 τ, so with τ ≈ 6.9 s that is roughly 80 simulated
                seconds — three rotations of the triangle. Everything you knew
                about where the stars would be is gone in three turns, from a
                starting error the width of a country.`,
    },
    {
      type: 'question',
      title: 'Buying more time',
      kind: 'choice',
      body: `Suppose you are dissatisfied with that and you improve your
             measurement of the starting positions by a factor of a thousand —
             from 1,500 km to 1.5 km.`,
      prompt: 'How much longer does your prediction stay good?',
      options: [
        'a thousand times longer',
        'about seven τ longer — roughly fifty extra seconds',
        'about a thousand τ longer',
        'no longer at all: the improvement is wiped out immediately',
      ],
      answer: 1,
      because: `About ln(1000) ≈ 6.9 τ longer. This is the cruel arithmetic of
                chaos, and it is the whole practical consequence: because the
                error grows exponentially, reducing it buys you time only
                <em>logarithmically</em>. A thousandfold better measurement buys
                seven e-folding times. A millionfold better measurement buys
                fourteen. There is no measurement good enough to give
                long-term prediction, and that is a statement about the system,
                not about your instruments.`,
    },
    // --- Act 4: is it the computer? ----------------------------------------
    {
      type: 'read',
      title: 'The objection you should have',
      body: `Here is the objection any careful person should raise at this point.

             \n\nThe simulation does not solve the equations exactly. It advances
             time in small steps, and every step makes a small arithmetic error.
             Those errors are also differences between the two runs — and they
             also grow. So how do you know the divergence you measured is the
             physics, and not just the accumulated mistakes of the integrator?

             \n\nThis is a real question and it has a real answer:
             <strong>change the numerics and see whether the answer changes.</strong>

             \n\nIf the divergence is physical, then computing it more accurately
             gives the same rate. If the divergence is an artefact of the
             timestep, then halving the timestep will change it — usually a lot.
             That test is not optional. Without it, the measurement is a
             property of the software.`,
    },
    {
      type: 'predict',
      title: 'Before you refine',
      body: `You are about to repeat the three-body comparison with the timestep
             cut and with a different integrator.`,
      prompt:
        'If the divergence you measured is physical, the e-folding time will…',
      options: [
        'roughly halve, because the timestep halved',
        'stay about the same',
        'roughly double',
        'become impossible to measure',
      ],
      answer: 1,
      because: `Stay about the same. That is precisely what "physical" means
                here: the answer belongs to the system rather than to the way
                the system was computed. If it moves substantially, the honest
                report is not a smaller number — it is "numerically
                unresolved".`,
    },
    {
      type: 'explore',
      title: 'The numerical control',
      tool: { id: 'chaos-divergence' },
      body: `Repeat the three-body comparison twice more:

             \n\n<strong>Once with a smaller timestep.</strong> In Settings, set
             the simulation speed to half what it was. That halves the step the
             integrator takes each frame.

             \n\n<strong>Once with a different integrator.</strong> In Settings,
             switch from Symplectic Euler to Velocity Verlet, or to RK4.

             \n\nEach time, use the bench's <strong>record as numerical
             control</strong> action, which stores the e-folding time under a
             label instead of overwriting your main result. The instrument then
             reports whether the three answers agree.`,
      checklist: [
        'Repeat the comparison at half the simulation speed',
        'Repeat it with a different integrator',
        'Record each as a numerical control',
        'Read the refinement verdict',
      ],
      rubric: `All three e-folding times should agree to within about twenty per
               cent, and the instrument should report the result as resolved.
               Measured values for this configuration across three integrators
               and three timesteps span 6.8 to 7.6 simulated seconds. Full
               credit requires reporting the spread and drawing the conclusion:
               the divergence is a property of the three-body system, not of the
               integrator. A student whose values disagree wildly has probably
               changed something else at the same time; the bench's parameter
               diff will name it.`,
    },
    {
      type: 'question',
      title: 'Reading the verdict',
      kind: 'choice',
      body: `Imagine a different system, where repeating the comparison at half
             the timestep gave an e-folding time three times longer, and RK4 gave
             one five times shorter.`,
      prompt: 'The correct thing to report about that system would be…',
      options: [
        'the average of the three values',
        'the RK4 value, because RK4 is the most accurate integrator',
        'that the result is numerically unresolved, and no e-folding time should be quoted',
        'that the system is more chaotic than the one you measured',
      ],
      answer: 2,
      because: `Numerically unresolved, and no number quoted. Averaging three
                numbers that disagree does not produce a better one. Taking the
                most accurate integrator's answer is tempting and still wrong:
                if the answer depends on the integrator at all, none of them has
                resolved it, and the right response is a smaller timestep until
                they agree — or an honest statement that they do not. This is
                not hypothetical: two of the configurations considered for this
                lab behaved exactly that way and were rejected for it.`,
    },
    // --- Act 5: what chaos is not ------------------------------------------
    {
      type: 'read',
      title: 'Not every three-body system',
      body: `It is very often said that the three-body problem <em>is</em>
             chaotic. That is not right, and the counterexamples are famous.

             \n\nGo back to Gascheau's inequality. For three <em>equal</em> masses
             the equilateral solution is unstable — that is the system you
             measured. But make one body much heavier than the other two and the
             same inequality is satisfied, and the equilateral configuration
             becomes <em>stable</em>. That is not a curiosity: it is why Jupiter
             has thousands of Trojan asteroids sitting sixty degrees ahead of and
             behind it, and why they have stayed there for billions of years.

             \n\nAnd in 2000 Chenciner and Montgomery proved the existence of a
             three-body orbit in which three equal masses chase each other around
             a figure eight, forever, stably. Three bodies, comparable masses, no
             chaos.

             \n\nSo "three bodies" is not the same claim as "chaotic". What makes
             a system chaotic is a property of its particular configuration, and
             the way to find out is the measurement you just did.`,
    },
    {
      type: 'question',
      title: 'Which of these is chaos?',
      kind: 'choice',
      body: `Four systems, each run twice from starts differing by a tiny
             perturbation.`,
      prompt:
        'Which observation is evidence of sensitive dependence on initial conditions?',
      options: [
        'The two runs stay exactly equal for the whole run',
        'The separation grows steadily in proportion to elapsed time',
        'The separation grows by a factor of e every few seconds, at the same rate under three different integrators',
        'The separation jumps around unpredictably from sample to sample',
      ],
      answer: 2,
      because: `Growth by a fixed factor per unit time — exponential — and
                confirmed by refinement. The first is the reproducibility
                control and shows determinism. The second is phase drift, which
                every perturbed orbit shows. The fourth is not chaos either: a
                separation that jumps around from one sample to the next is
                noise, and in a deterministic simulation it usually means
                something is wrong with the measurement rather than interesting
                about the physics.`,
    },
    {
      type: 'question',
      title: 'Deterministic and unpredictable',
      kind: 'short',
      body: `You have now shown two things that sound contradictory: the
             simulation is exactly reproducible, and its long-term behaviour
             cannot be predicted.`,
      prompt:
        'In two or three sentences, explain how both can be true at once.',
      rubric: `Full credit for the distinction between the <em>rule</em> and the
               <em>knowledge of the state</em>: the equations determine the
               future completely from the present, so running the same numbers
               twice gives the same answer, but any real knowledge of the present
               is approximate, and in a chaotic system approximations grow
               exponentially until they are useless. Credit also for the
               observation that prediction requires knowing the initial state,
               not merely knowing the law. Common wrong answers to look for: "the
               computer introduces randomness" (it does not — the student proved
               that in the reproducibility control), and "chaos means the rules
               break down" (the rules never change).`,
    },
    {
      type: 'explore',
      title: 'Move the horizon',
      tool: { id: 'chaos-divergence' },
      body: `One last experiment, and this one is yours to design.

             \n\nRepeat the three-body comparison with a <em>different</em> size
             of perturbation — ten times smaller, or a hundred times larger. The
             bench lets you type the number.

             \n\nBefore you run it, predict what will change: the e-folding time,
             or the point at which the two runs become visibly different, or
             both.`,
      checklist: [
        'Run the comparison with a perturbation ten times smaller',
        'Compare the e-folding time with your first measurement',
        'Compare how long the two runs stay visually identical',
        'Say which of the two changed and which did not',
      ],
      rubric: `The e-folding time should be essentially unchanged — it is a
               property of the system, not of the perturbation. What changes is
               the <em>offset</em>: a perturbation ten times smaller takes about
               ln(10) ≈ 2.3 further e-folding times to reach the same
               separation, so the runs stay together about sixteen seconds
               longer and no more. Full credit requires separating the rate from
               the horizon: the rate is fixed by the physics, the horizon moves
               logarithmically with how well you know the start.`,
    },
    {
      type: 'read',
      title: 'What this is a model of',
      body: `The three stars are a laboratory, not an observation. No real
             system has three exactly equal stars in an exact equilateral
             triangle, and that is the point: the configuration was chosen
             because it starts in a state we can specify exactly, so that the
             only difference between two runs is the one we introduced.

             \n\nBut the behaviour is not laboratory-only. It is why weather
             forecasts are useful for about a week and not for a month —
             Lorenz found the same exponential sensitivity in a model of
             convection in 1963, and the phrase "butterfly effect" comes from
             the title of a talk he gave about it. It is why the long-term
             stability of the Solar System is still a research question rather
             than a settled calculation: the inner planets have a Lyapunov time
             of a few million years, so their positions cannot be predicted
             beyond about a hundred million years no matter how well they are
             measured today. And it is why a spacecraft on a trajectory through a
             multi-body gravitational field needs course corrections, not just a
             good launch.

             \n\nOne honest caveat about your own number. What you measured is an
             estimate of a local growth rate over a finite window, from one
             perturbation, in one direction. A true Lyapunov exponent is defined
             as a limit over infinite time, averaged over the attractor. Yours is
             a good classroom measurement of how fast <em>this</em> system loses
             track of <em>this</em> perturbation, and the refinement check tells
             you it is not an artefact. It is not the asymptotic quantity that
             carries the name, and reporting it as one would be overclaiming.`,
    },
    {
      type: 'read',
      title: 'Where these results come from',
      body: `The claims in this investigation, and where to check them:

             \n\n<strong>Lagrange, J.-L. (1772).</strong> <em>Essai sur le
             problème des trois corps.</em> The equilateral solution.

             \n\n<strong>Gascheau, G. (1843).</strong> Comptes Rendus de
             l'Académie des Sciences 16, 393. The stability criterion
             27(m₁m₂+m₂m₃+m₃m₁) &lt; (m₁+m₂+m₃)², which is why three equal masses
             at the corners of a triangle come apart and Jupiter's Trojans do
             not.

             \n\n<strong>Poincaré, H. (1890).</strong> "Sur le problème des trois
             corps et les équations de la dynamique." Acta Mathematica 13, 1.
             The work that first showed the three-body problem has solutions too
             complicated to write down, and the origin of the modern subject.

             \n\n<strong>Lorenz, E. N. (1963).</strong> "Deterministic Nonperiodic
             Flow." Journal of the Atmospheric Sciences 20, 130. Sensitive
             dependence, in a weather model, with the phrase that named it.

             \n\n<strong>Chenciner, A. &amp; Montgomery, R. (2000).</strong> "A
             remarkable periodic solution of the three-body problem in the case
             of equal masses." Annals of Mathematics 152, 881. The figure-eight
             orbit: three equal masses, no chaos.

             \n\n<strong>Boekholt, T. C. N., Portegies Zwart, S. F. &amp;
             Valtonen, M. (2020).</strong> "Gargantuan chaotic gravitational
             three-body systems and their irreversibility to the Planck length."
             Monthly Notices of the Royal Astronomical Society 493, 3932. On how
             far the unpredictability of three-body systems actually goes.

             \n\n<strong>Laskar, J. &amp; Gastineau, M. (2009).</strong>
             "Existence of collisional trajectories of Mercury, Mars and Venus
             with the Earth." Nature 459, 817. The Solar System's own Lyapunov
             time, and what it means for predicting it.`,
    },
    {
      type: 'read',
      title: 'What you established',
      body: `In order, and each one measured rather than asserted:

             \n\n<strong>The simulation is deterministic.</strong> Two runs from
             identical starts were identical to every decimal place.

             \n\n<strong>Not all divergence is chaos.</strong> A two-body system
             given the same 1,500 km nudge came apart steadily, in proportion to
             time. The instrument refused to give it an e-folding time, and was
             right to.

             \n\n<strong>The three-body system diverged exponentially.</strong>
             The same nudge grew by a factor of e every seven simulated seconds
             or so — a factor of ten million over the run.

             \n\n<strong>That is physics, not arithmetic.</strong> The rate
             survived halving the timestep and changing the integrator.

             \n\n<strong>And it is not about the number three.</strong> Stable
             three-body configurations exist, and one of them is why Jupiter's
             Trojan asteroids are still there.

             \n\nGenerate your report to keep the numbers, the perturbation you
             applied, and the divergence plot.`,
    },
  ],
};

export default BUTTERFLY_EFFECT;
