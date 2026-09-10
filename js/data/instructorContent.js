// =============================================================================
// Instructor content: the part of a teaching guide that cannot be derived
// -----------------------------------------------------------------------------
// Titles, durations, step counts, questions, correct answers and tolerances are
// NOT here. Those are read out of investigations.js by answerKey.js, so they
// cannot drift from the lessons a class is actually using.
//
// What is here is the prose an instructor needs and a program cannot write: why
// a lesson is built the way it is, what students get wrong, where they slow
// down, and what a measurement should come out at. Step numbers referenced in
// this file are checked against the real lessons by the test suite, so a lesson
// edit that moves a step is caught rather than silently making a guide wrong.
// =============================================================================

/** Shared closing note pointing at the public model page. */
const MODEL_PAGE = 'https://gravitas-sim.online/model/';

export const INSTRUCTOR_CONTENT = {
  'lagrange-points': {
    topic:
      'The circular restricted three-body problem: Jacobi constant, zero-velocity curves and Lagrange points',
    difficulty: 'Introductory, conceptual, with one arithmetic step',
    placement:
      'Twenty to twenty-five minutes, after students have met orbits and ideally after the Hohmann-transfer lesson, which introduces the manoeuvre planner this one uses. It is the most conceptually demanding lesson in the catalogue and the least computational: almost all the work is distinguishing three claims that sound identical.',
    overview: `Students meet a conserved quantity that buys a boundary rather than a solution.
      The three-body problem has no closed-form trajectory, but the Jacobi constant is exact, and
      from it comes a wall the tracer can never cross. The lesson has them read the constant,
      watch it hold, speed the tracer up, and see the walls open in a fixed order.
      \n\nIts spine is a distinction, not a calculation. Energetically accessible, actually
      reachable, and stable are three different statements about the same diagram, and students
      reliably collapse them into one. The lesson meets them one at a time and separated by
      screens: energy through screen 9, then a deliberately inconclusive experiment at screen 11
      where the neck is open and the tracer may simply not go through, then stability introduced
      at screen 13 as an explicitly third thing.
      \n\nThe sign convention is the other hazard and is stated three times. C rises as the
      tracer slows, so every mental graph is upside down relative to the rest of the course.`,
    priorKnowledge: [
      'That gravity holds things in orbit',
      'Comfort with the idea of a conserved quantity',
      'Helpful: having seen a potential-energy landscape, even qualitatively',
      'No vectors, no calculus. The effective potential is described rather than differentiated',
    ],
    keyConcepts: [
      {
        heading:
          'A conserved quantity can buy a boundary without buying a solution',
        body: 'This is the intellectual pay-off and worth naming explicitly. The trajectory is not solvable, and yet C is exact, and from C alone comes a region the tracer provably never enters. Students who have only met conservation laws as calculation shortcuts have not seen one used this way.',
      },
      {
        heading: 'The sign convention runs backwards',
        body: 'C = 2*Omega - v^2, so a faster tracer has a smaller C. Larger C means more confined. Expect this to be got wrong at least once by most of the class; the panel states it under every reading and the lesson repeats it at screens 4, 5 and 9.',
      },
      {
        heading: 'The walls open in a fixed order',
        body: 'C1 > C2 > C3 > C4 = C5 always. As the tracer speeds up it first gains the neck at L1 between the two bodies, then L2 to the exterior, then L3, then nothing is forbidden. The order is a property of the problem and not of this system.',
      },
      {
        heading: 'Accessible, reachable and stable are three claims',
        body: 'The zero-velocity curve makes only the first. Screen 11 is built so the tracer may visibly fail to use an open neck, which is the only honest way to teach it - asserting the distinction while the tracer sails through would teach the opposite.',
      },
      {
        heading: 'L4 and L5 are stable at maxima, which sounds impossible',
        body: 'They sit at maxima of the effective potential and are nonetheless stable below Routh\u2019s ratio, because the Coriolis force turns a departing tracer into a small orbit about the point. Worth drawing: it is the least intuitive true thing in the lesson, and it is why the Trojan asteroids exist.',
      },
    ],
    flow: [
      {
        steps: '1-3',
        text: 'The system, the rotating frame, the normalisation, and a prediction about whether speeding up opens or closes the forbidden region. Set the units carefully here - every number later is in them.',
      },
      {
        steps: '4-6',
        text: 'The Jacobi constant, reading it twice to see it hold, and what a conserved quantity is worth when the trajectory is unsolvable. Screen 6 is the conceptual centre of the first half.',
      },
      {
        steps: '7-9',
        text: 'The five points, the equilateral geometry of L4, and the ordering of the critical values. Brisk; the arithmetic is one line.',
      },
      {
        steps: '10-11',
        text: 'Open the L1 neck with a burn, and predict what an open neck licenses. Everyone opens it differently, which is deliberate and is why the next two screens exist.',
      },
      {
        steps: '12-13',
        text: 'The controlled version, and the heart of the second act: one tracer, one place, one speed, two directions, so the accessible region is identical by construction and the trajectory is the only thing left that can differ. About a minute of running. Budget time here and resist resolving the ambiguity beyond what the runs show - "did not cross in two periods" is the whole finding.',
      },
      {
        steps: '14-16',
        text: 'Stability as a third question, the surprise that L4 and L5 are stable at maxima, and the Trojans. This is the part students remember.',
      },
      {
        steps: '17-19',
        text: 'Break the assumptions deliberately and watch the overlay refuse, then the eccentric case, then the three claims restated side by side. Leave time for the last screen.',
      },
    ],
    features: [
      {
        name: 'The restricted three-body panel',
        text: 'Opens with the scenario. Reports the Jacobi constant, which neck is open, the five points with their critical values, and whether the energy permits each. It states the normalisation and the sign convention under the reading, and it disables itself with a named reason when the assumptions fail.',
      },
      {
        name: 'The zero-velocity overlay',
        text: 'The shaded region is where this tracer\u2019s energy forbids it to be. It is recomputed as the tracer\u2019s speed changes and is drawn from a grid cached against the mass ratio, so it costs nothing to watch it move.',
      },
      {
        name: 'The manoeuvre planner',
        text: 'Used at screen 10 to change the tracer\u2019s speed deliberately rather than by dragging. Its Undo restores the whole world, so a class can try several burns and compare.',
      },
    ],
    misconceptions: [
      {
        claim: 'A bigger Jacobi constant means the tracer has more energy.',
        response:
          'The opposite. C = 2*Omega - v^2, so speeding the tracer up reduces C. Expect this one; it is not carelessness but a reasonable inference from every other energy they have met. The panel prints the convention under every reading.',
      },
      {
        claim: 'The neck at L1 is open, so the tracer will go through it.',
        response:
          'An open neck is a gap in a wall, not a route through it. Screen 11 exists to be inconclusive: let students run it and see the tracer loiter. If it does cross on their first attempt, have them undo and try a different burn - it will not always.',
      },
      {
        claim: 'The Lagrange points are where gravity cancels.',
        response:
          'They are where gravity from both bodies plus the centrifugal effect of the rotating frame cancel. In an inertial frame nothing cancels at all: a body at L4 is in orbit, accelerating the whole time. The frame is doing half the work and it is worth saying so.',
      },
      {
        claim: 'L4 and L5 are stable because they are at potential minima.',
        response:
          'They are at maxima. The stability comes from the Coriolis force in the rotating frame, which turns a departing tracer back into a small orbit about the point, and it holds only below Routh\u2019s mass ratio of 0.03852.',
      },
      {
        claim: 'This all applies to any three bodies.',
        response:
          'Two of them must be on a circular orbit and the third must be negligible. Screen 16 has students break it on purpose. The elliptic restricted problem exists and has no conserved Jacobi constant, which is exactly why the panel refuses rather than approximating.',
      },
    ],
    teachingNotes: [
      'This system has mu = 0.0291 against Routh\u2019s 0.03852 - close enough that raising the small star\u2019s mass a little makes L4 and L5 unstable, which is a good live demonstration if a class has time. The panel says which side of the line the system is on.',
      'The critical values here are C1 = 3.313, C2 = 3.274, C3 = 3.029 and C4 = C5 = 2.971. A student comparing them against a textbook may find the last differs: this application omits the mu(1-mu)/2 term some texts add to Omega, so C4 is 3 - mu + mu^2 rather than 3. The panel states this and it is worth pre-empting.',
      'Screen 5 asks students to read C twice and see it unchanged. It holds to about four parts in a hundred thousand over several orbits, which is the Velocity Verlet integrator rather than the physics; the scenario chooses that integrator for this reason. If a class asks, that is a good moment to talk about what a numerical result can and cannot establish.',
      'Screen 11 is the one that decides whether the lesson worked. Do not tell students what will happen. If several groups get different outcomes from different burns, that is the best possible result and worth collecting on a board.',
      'The overlay disables itself if a class adds a third body while exploring. That is intended, and the message names the assumption that failed - it is not a fault to work around.',
    ],
    discussion: [
      'The trajectory cannot be solved but the boundary can be drawn exactly. What else in physics works like that?',
      'What would you have to measure to find out whether the tracer actually goes through an open neck?',
      'Why does nothing accumulate at L1 or L2, when spacecraft are put there anyway?',
      'The frame is doing half the work. What is a Lagrange point in an inertial frame?',
    ],
    extensions: [
      'Raise the small star\u2019s mass past a thirtieth of the large one and watch L4 and L5 stop being marked as stable. Ask students to predict the threshold before they cross it.',
      'Place the tracer near L4 with a small velocity and let it run for many orbits: it librates about the point rather than sitting at it, which is what the Trojans actually do.',
      'Compute the Sun-Earth mass ratio and work out where L1 and L2 are, then compare against the real distances to SOHO and JWST.',
      'Use the A/B experiment bench to record the same tracer at two timesteps and check that the Jacobi constant\u2019s drift is the integrator rather than the system.',
    ],
    expectations: {
      5: 'Two readings of C agreeing to four or five figures. A difference in the fourth figure over a long run is the integrator; a large difference means something was changed between the readings.',
      10: 'C falls as the burn is applied and the shaded region visibly retreats. The neck opens when C passes 3.313. Students who see C rise have burned retrograde, which is a useful mistake to have made.',
      13: 'About a minute of running, and the same answer for everybody, which is what separates this from screen 10. The control rows should read: both arms started at (0.600, 0.000) at a rotating-frame speed of 0.565, both with a Jacobi constant of 3.28426 - identical to every digit shown, because C is fixed by position and speed and neither differs - both with the L1 neck open and L2 still closed, and both integrated at the same measured step. Then the outcome rows diverge: 30 degrees crosses the neck 0.11 periods in and comes within 0.008 of L1; 130 degrees never crosses, never gets nearer than 0.172, and its x never passes the 0.600 it started at. The sentence to insist on is "same accessible region, different paths"; the sentence to catch is "B can never cross", which the window cannot support and the caveat says so.',
      17: 'The overlay switches off and names the assumption: "this needs exactly two massive bodies" for an added star, or the tracer being heavy enough to move the others. Removing the change brings it straight back.',
    },
    modelNotes: `Two massive bodies on a circular orbit, integrated with Velocity Verlet rather
      than the catalogue\u2019s default symplectic Euler, because the lesson asks students to
      watch a conserved quantity hold and first-order drift would make that a claim about the
      integrator. Measured eccentricity is 2.4e-9 and the tracer is a billionth of the pair.
      \n\nThe world is built to the convention the analysis uses: barycentre at the origin,
      heavier body at -mu, lighter at 1-mu, so the overlay and the simulation agree about where
      everything is. The tracer is placed and launched in the rotating frame and converted, which
      is what makes its Jacobi constant a chosen quantity rather than an accident of the setup.
      \n\nThe effective potential is sampled on a 220-square grid in the rotating frame\u2019s own
      coordinates. That grid depends on the mass ratio and nothing else, so it survives a moving
      camera and a moving tracer and is computed once; the per-frame cost is one comparison per
      cell. e2e/cr3bp.spec.js bisects the tracer\u2019s speed for the value at which the L1 neck
      opens and recovers the closed form\u2019s C1 to six decimal places.`,
  },
  'hohmann-transfer': {
    topic: 'Orbital transfers: two burns, a coast, and the vis-viva equation',
    difficulty: 'Introductory, with arithmetic and one square root',
    placement:
      'Twenty to twenty-five minutes, best placed after students have met circular orbital speed and Kepler\u2019s third law. It pairs naturally with the gravity-assist lesson - that one is about borrowing momentum, this one about buying it - and either order works. It is the most quantitative lesson in the catalogue that still needs no calculus.',
    overview: `Students plan a Hohmann transfer from 1 AU to 2.5 AU with a pencil, then fly it
      with the manoeuvre planner and find that the engine agrees with them. Both burns and the
      coast between them are computed from vis-viva and Kepler\u2019s third law before anything
      is applied, which is what makes the flight a test rather than a demonstration.
      \n\nThe lesson is built around two results that students reliably get wrong. The first is
      that a burn changes the orbit half a revolution away from where it is made: push at 1 AU
      and the far side climbs to 2.5 while the near side does not move. The second is that
      arriving is not staying - at the top of the arc the spacecraft is on a closed ellipse
      whose periapsis is still at 1 AU, and without a second burn it falls straight back and
      does so for ever.
      \n\nThe scenario is one star, one spacecraft and one station, all circular and coplanar,
      because a Hohmann transfer only has a closed-form answer under exactly those conditions.
      That is stated to students at the end rather than assumed at the start: the last screen
      asks which of their answers depended on it, and the honest answer is all of them.`,
    priorKnowledge: [
      'Circular orbital speed falls with distance from the central mass',
      'Kepler\u2019s third law, at least as "period grows faster than radius"',
      'Comfortable with a square root and a subtraction',
      'Helpful but not required: that angular momentum is conserved without a torque',
    ],
    keyConcepts: [
      {
        heading: 'A burn changes the orbit on the far side',
        body: 'The burn point stays on the new orbit - you are still there, at that radius - so that radius remains a point the orbit passes through. Everything gained appears half a revolution later. Students consistently expect the change to happen where the push happens, and the periapsis/apoapsis rows in the planner make the alternative undeniable before they apply anything.',
      },
      {
        heading: 'Radial and transverse burns do different jobs',
        body: 'A radial push exerts no torque about the primary, so it cannot change the angular momentum and cannot raise the far side by much; it makes the orbit eccentric instead. The third screen has students read the unchanged angular-momentum row in the preview, which is the cleanest demonstration of a conservation law in the catalogue.',
      },
      {
        heading: 'Vis-viva gives the speed anywhere on any orbit',
        body: 'v\u00b2 = GM(2/r \u2212 1/a) is the only equation the lesson needs, used four times: circular speed at each radius with a = r, and transfer speed at each end with a = 1.75 AU. Working in units of the local circular speed - v/v_circ = sqrt(2 \u2212 r/a) - keeps the arithmetic to one square root and is worth showing on a board.',
      },
      {
        heading: 'Arriving and staying are different achievements',
        body: 'This is the half students forget, and the lesson makes them predict it before it happens. The spacecraft reaches 2.5 AU on an ellipse whose periapsis is at 1 AU; with no second burn it returns to where it started every 2.3 years indefinitely. Real missions that miss this burn do not orbit their destination, they fly past it.',
      },
      {
        heading: 'Faster twice, slower overall',
        body: 'Both burns are accelerations and the spacecraft ends up slower than it began, 18.8 km/s against 29.8. The energy went into height rather than speed. Students who can say that clearly have understood the difference between speed and orbital energy, which is the deepest thing in the lesson.',
      },
    ],
    flow: [
      {
        steps: '1-3',
        text: 'The problem, then a prediction about pushing straight outward, then a preview of a radial burn that leaves the angular momentum untouched. Nothing is applied yet; the planner previews without changing the world.',
      },
      {
        steps: '4-6',
        text: 'Why transverse is the lever and why the change appears on the far side, then measuring the two circular speeds and asking why the outer body is slower. Straightforward, and worth moving through briskly.',
      },
      {
        steps: '7-10',
        text: 'The transfer ellipse, its semi-major axis, the departure speed from vis-viva, and the size of the first burn. This is the arithmetic core - budget half the lesson time here and let students check each other.',
      },
      {
        steps: '11-12',
        text: 'Applying the first burn and reading where the orbit changed. The preview should show apoapsis at 2.5 AU before they press Apply; a student whose preview disagrees has mistyped, and Undo restores the whole world.',
      },
      {
        steps: '13-15',
        text: 'The transfer time from Kepler\u2019s third law, the coast itself, and the prediction about doing nothing on arrival. The coast takes about 423 simulated days; use the speed control rather than waiting.',
      },
      {
        steps: '16-20',
        text: 'The second burn, circularising, the total cost, why both burns were accelerations, and what the whole answer depended on. The last screen is the one to leave time for.',
      },
    ],
    features: [
      {
        name: 'The manoeuvre planner',
        text: 'Opened from the \u25b2 button in the object inspector once a planet, moon or asteroid is selected. It previews without applying: the table shows periapsis, apoapsis, energy, angular momentum and period before and after, and nothing changes until Apply is pressed. Undo restores a full snapshot of the world rather than subtracting the impulse, so a mistyped burn costs nothing.',
      },
      {
        name: 'The Orbital Transfer Lab',
        text: 'One sunlike star, a spacecraft on a circular orbit at 1 AU and a station at 2.5 AU, with nothing else in the system and eccentricities of about 1e-4. Integrated with Velocity Verlet rather than the catalogue default, because the lesson checks a transfer time against a closed form to a per cent.',
      },
      {
        name: 'The burn log and its export',
        text: 'Every applied burn is recorded with its simulated time, body, primary, frame, vector, units and the orbit either side, and the log exports as JSON. Useful as a submission: a student\u2019s two burns and their timing are the whole assessment.',
      },
    ],
    misconceptions: [
      {
        claim: 'To go further out, point outward and thrust.',
        response:
          'A radial burn exerts no torque and so cannot change the angular momentum, which is what sets how far the orbit reaches on the far side. It makes the orbit eccentric for very little gain in size. Have students preview a radial burn at the third screen and read the angular-momentum row: it does not move.',
      },
      {
        claim: 'The orbit changes where the burn happens.',
        response:
          'The burn point stays on the new orbit, so it becomes an apsis. The change is entirely on the opposite side. The preview table makes this visible before anything is applied, which is why the lesson has students read it rather than describing it.',
      },
      {
        claim: 'Once the spacecraft reaches 2.5 AU it is at the station.',
        response:
          'It is at the station\u2019s radius, on an ellipse whose periapsis is still at 1 AU, travelling 4.6 km/s too slowly for that orbit. Without the second burn it falls back and repeats the trip for ever. The fifteenth screen has students predict this before the coast finishes.',
      },
      {
        claim: 'Both burns speed it up, so it should end up faster.',
        response:
          'It ends up slower - 18.8 km/s against 29.8 - and richer in energy. Most of the added energy went into potential rather than kinetic. This catches strong students as often as weak ones and is worth a board discussion rather than a sentence.',
      },
      {
        claim: 'These numbers would work for a real mission to Mars.',
        response:
          'They are where a real calculation starts. Mars\u2019s orbit is eccentric and slightly inclined, and the transfer has to arrive when Mars is there. The lesson\u2019s last screen names all three omissions; the planner\u2019s own preview names the two-body assumption on every burn.',
      },
    ],
    teachingNotes: [
      'The planner works in simulation velocity units and the arithmetic is done in km/s. One simulation unit is 6.661 km/s, and the lesson gives the converted figures (0.873 and 0.690) at the point of use. If students are computing their own conversions, check the first one as a class - a factor error here produces a wildly wrong orbit and an easy diagnosis.',
      'The inner orbit runs at 29.787 km/s, which is Earth\u2019s actual orbital speed. Worth pointing out: the scenario is a genuine Solar System analogue rather than an arbitrary set of numbers, and a student who knows Earth\u2019s orbital speed has a free check on the unit scale.',
      'Timing the second burn matters and the lesson says so. A burn made partway up the arc rather than at apoapsis produces a different orbit, because a burn changes the far side and the far side depends on where you are. If a class is short of time, pausing at apoapsis is legitimate and worth saying out loud.',
      'Screen 5 is a measurement step with no automatic check. Students reading 29.8 and 18.8 km/s are set up correctly; anything else usually means the unit toggle is on simulation units.',
      'Applying a burn deliberately invalidates any running radial-velocity or astrometry recording, because the orbit those measurements describe no longer exists. If a class has both panels open, expect the recordings to restart and say why - it is the correct behaviour and a small lesson in itself.',
    ],
    discussion: [
      'Both burns were accelerations and the spacecraft ended up slower. Where did the energy go?',
      'Why is the cheapest transfer the slowest one? What would you spend fuel on to arrive sooner?',
      'The station has to be there when you arrive. How would you work out when to leave?',
      'Every number here depended on both orbits being circular and coplanar. Which one would you least like to give up, and why?',
    ],
    extensions: [
      'Run the transfer inwards, from 2.5 AU to 1 AU. Both burns become brakes and the total cost and coast time are identical - the symmetry is worth deriving rather than being told.',
      'Change the outer radius in the scenario settings and rebuild, then plot total \u0394v against the radius ratio. Past a ratio of about 11.9 the Hohmann transfer stops being optimal.',
      'Use the A/B experiment bench to record the transfer twice at different timesteps, or the bench\u2019s reliability check to ask whether the measured transfer time is about the system or about the integration.',
      'Have students plan the transfer for a real destination - Mars at 1.52 AU, Jupiter at 5.20 - and compare their \u0394v against the published figures for a real mission.',
    ],
    expectations: {
      3: 'The preview shows periapsis falling, apoapsis rising, and the specific angular momentum unchanged to every digit shown. Students should set the field back to zero without applying; if somebody applies it, Undo restores the world exactly.',
      5: 'About 29.8 km/s for the spacecraft and 18.8 for the station. Anything an order of magnitude off is the unit toggle rather than the student.',
      11: 'The previewed apoapsis reads 250 simulation units, which is 2.5 AU, and the periapsis stays at 100. After applying, the trail visibly climbs away from the inner circle. A student whose apoapsis is wildly wrong has entered the km/s figure rather than the converted one.',
      14: 'The coast takes about 423 simulated days and the speed falls from 35.6 km/s to 14.2 as the spacecraft climbs. At normal speed this is a long wait; the transport control is the intended route.',
      17: 'The eccentricity in the preview falls to a few thousandths, and the periapsis and apoapsis both read about 250 simulation units. A residual eccentricity above about 0.05 means the burn was made away from apoapsis rather than at it.',
    },
    modelNotes: `Two-body motion about a single dominant mass, integrated with Velocity Verlet
      rather than the catalogue\u2019s default symplectic Euler, because the lesson checks a
      transfer time against pi*sqrt(a^3/mu) and first-order period error is too coarse for that.
      \n\nThe scenario is built circular by construction: each body is placed at sqrt(mu/r) with
      the orbiting body\u2019s own mass included in mu, the same mu the readout uses, so the
      orbits open at eccentricities of about 1e-4 rather than at some value the setup and the
      inspector disagree about. The spacecraft is a billionth of the star\u2019s mass - not zero,
      because a massless body drops out of the barycentre and out of the conservation
      diagnostics, and small enough that the two-body formulae the lesson uses are right well
      past the precision anybody reads.
      \n\nThe manoeuvre planner\u2019s preview is the osculating two-body orbit computed by the
      same orbitalElements() the inspector uses. In this scenario that is exact to the precision
      of the integration; in a system with a third mass of any consequence it would not be, and
      both the panel and every exported burn record say so.
      \n\ne2e/maneuver.spec.js flies the whole transfer through the engine and checks both burns
      and the coast against the closed form: the coast comes out at 162.62 simulation time units
      against 162.63 predicted.`,
  },
  'gravity-assist': {
    topic: 'Reference frames, and where a gravity assist gets its energy',
    difficulty: 'Introductory, no mathematics beyond arithmetic',
    placement:
      'A short lesson, 15 to 20 minutes, that fits anywhere after students have met the idea of an orbit. It is the most self-contained thing in the catalogue and works well as a lab-period opener or as the practical half of a lecture on reference frames. It needs no prerequisites and leaves students with a result they will meet again in every outer-solar-system mission they read about.',
    overview: `Students fly the same flyby twice, once on each side of a planet, and read the
      result in two frames at once. In the planet's frame the spacecraft leaves at exactly the
      speed it arrived; in an inertial frame it leaves 78 per cent faster. Both numbers are on
      screen simultaneously, in two columns, and the lesson is the question of how they can both
      be true.
      \n\nThe first pass is flown by hand, so students learn to read the instrument. The pair
      is then run as one retained experiment: both sides at once, from the same starting
      configuration, differing only in the sign of the impact parameter, with both results kept
      on screen. That replaces the part of the lesson where students had to hold four numbers in
      their heads while the panel showed four others - and it is what makes the central
      comparison possible, because what they are being asked to notice is that the change in
      VELOCITY is identical on both sides while the change in SPEED is not.
      \n\nThe first two thirds have no star in them, and that is the pedagogical spine rather
      than a simplification. With nothing else present the planet moves in a straight line, its
      frame is genuinely inertial, and the measured change in relative speed is three parts in
      a hundred billion - zero to any precision anyone cares about. Only once that exact version
      is established does a star appear, at which point the same quantity changes by a third of
      a per cent and the lesson can name that residual as the patched-conic approximation and
      quote its size.
      \n\nThe isolated case is also the only one in which the momentum ledger is legible. On an
      orbit the planet's velocity changes far more from its own turning than from the
      spacecraft; in empty space the recoil is the only thing there is, so the panel can show
      the two momentum changes agreeing rather than assert that they do. How closely depends on the
      integration step, which the application sizes from the frame rate: a part in 10^9 at a fixed
      step of 0.5, and a part in 10^5 on a machine busy enough to make its own step three times
      coarser. Both are far tighter than the argument needs, and the lesson quotes a bound.`,
    priorKnowledge: [
      'That gravity pulls, and that a planet moves',
      'Reading a number off a panel',
      'Helpful but not required: the idea that speed is measured relative to something',
      'No vectors required. The vector addition is introduced in words and pictures at the seventh screen and never written as components',
    ],
    keyConcepts: [
      {
        heading: 'Speed is not a property of an object',
        body: 'It is a property of an object and a thing to measure against. The two columns in the panel are the same spacecraft at the same two instants, and they disagree because they measure against different things. Students who have never had to confront this usually believe speed is intrinsic, and the panel makes the belief untenable rather than arguing with it.',
      },
      {
        heading: 'A flyby can only turn the velocity, not lengthen it',
        body: 'In the planet frame the spacecraft falls in and climbs back out by the same depth, so it leaves at the speed it arrived. That is the conservation statement, and it is exact when the planet frame is inertial. Everything else in the lesson follows from it.',
      },
      {
        heading: 'The gain is a vector sum, not a push',
        body: 'v(inertial) = v(planet) + v(relative). Rotating the second vector changes the length of the sum without changing the length of either part. The tennis-ball-and-train analogy at the seventh screen is exact rather than illustrative, and worth drawing on a board.',
      },
      {
        heading: 'Which side decides the sign',
        body: 'Behind the planet gains, in front loses. The natural intuition - "the planet pulls it forward from in front" - gets the sign backwards, which is why the prediction is collected before anything is run.',
      },
      {
        heading: 'The ceiling is set by approach speed, not planet mass',
        body: 'The largest possible velocity change is twice the approach speed, reached only by a full reversal. A heavier planet bends the path further and so gets closer to that ceiling; it cannot raise it. This is the reason assists are worth so much at Jupiter and so little at Mercury, and students almost always guess that mass sets the limit.',
      },
      {
        heading: 'Frame-dependent speed, frame-independent everything else',
        body: 'The fourteenth screen, and the sharpest statement of the lesson. Speed disagrees between the two columns. The CHANGE IN VELOCITY does not - it is the same vector in every inertial frame, which is why both passes report the same 4.28 km/s. Nor does the system\u2019s total momentum. The spacecraft has a finite mass here, so the planet recoils and "the planet\u2019s frame" strictly names one inertial frame before the encounter and a slightly different one after; the panel checks that the recoil equals the mass ratio times the spacecraft\u2019s own velocity change, which is momentum conservation written as a division. The unchanged relative speed is exact anyway, at any mass ratio, because the relative motion is a Kepler problem - and students who assume it is an approximation good to one part in a million have found a plausible wrong answer worth discussing.',
      },
      {
        heading: 'The planet pays, in momentum',
        body: 'Equal and opposite, always. The spacecraft here is an Earth mass rather than a tonne, chosen so the recoil is a readable number; the physics is identical and the size is not, and the lesson says so.',
      },
      {
        heading: 'Patched conics, and its measured error',
        body: 'Treating a flyby as an isolated two-body encounter spliced into a heliocentric orbit is what mission designers do for a first pass. With a star present the relative speed changes by 0.34 per cent and the deflection misses the two-body prediction by six per cent. Those residuals are the approximation, and the closing question exists to stop students reading them as numerical error.',
      },
    ],
    flow: [
      {
        steps: '1-3',
        text: 'Voyager 2 arriving at Jupiter at 10 km/s and leaving at 26 with its engines off, then the stripped-down version on screen and why it has no star. Students commit to which side of the planet gains before running anything.',
      },
      {
        steps: '4-7',
        text: 'The gaining pass, flown by hand, about nine seconds of wall clock. Students record all four speeds, face the central question, and are given the vector addition. This is the part to slow down for.',
      },
      {
        steps: '8-10',
        text: 'The retained comparison: both sides at once, about a minute of wall clock, both results kept on screen. Then three numbers off the table, then why the loss is smaller than the gain - which is geometry rather than physics and catches almost everybody.',
      },
      {
        steps: '11-14',
        text: 'The ceiling of twice the approach speed, the recoil and the momentum ledger, where the energy actually came from, and then the sharpest screen in the lesson: whose frame, exactly, and what survives a change of one.',
      },
      {
        steps: '15-18',
        text: 'Optional, about five minutes, three of them the sweep running. Five impact parameters on the gaining side, and the question of whether the biggest turn must give the biggest gain. Skip the whole block if the period is short; nothing after it depends on it.',
      },
      {
        steps: '19-22',
        text: 'The same encounter with a star, the residuals it introduces, what they mean, and the three things the model leaves out.',
      },
    ],
    features: [
      {
        name: 'Gravity Assist Lab and Gravity Assist: Heliocentric scenarios',
        text: 'Two controlled encounters built from closed-form orbital elements, so the impact parameter and the approach speed are exact inputs rather than approximate consequences of a starting position. The two shipped Slingshot scenarios cannot be used for this: they are randomised fields of dozens of bodies under mutual gravity, with no isolated encounter and no defined before and after.',
      },
      {
        name: 'The Gravity Assist panel',
        text: 'Two columns, deliberately side by side rather than one list, because the juxtaposition is the explanation. Also reports which side the spacecraft passed, the closest approach in planet radii, the measured deflection against the two-body prediction, the planet’s recoil, and the momentum ledger. It opens itself when either scenario loads.',
      },
      {
        name: 'The reference frame control',
        text: 'The panel’s "Planet’s frame" button drives the application’s existing frame system, which re-expresses positions AND trails - so the path is redrawn as the planet would have seen it, a hyperbola, rather than the camera merely following the planet. Worth pressing mid-encounter with a class watching.',
      },
      {
        name: 'The vis-viva correction',
        text: 'Speeds "at infinity" are read at a stated distance and corrected for the potential there, because at the gate the spacecraft is still travelling 0.6 per cent faster than its asymptotic speed - ten times the accuracy the rest of the lesson works to. Both legs are read at the same distance so the correction is the same size on each.',
      },
      {
        name: 'The retained comparison',
        text: 'Runs both passes on the experiment bench and keeps both. Each arm rebuilds the encounter from the same starting configuration through the scenario\u2019s own builder, changing only the sign of the impact parameter, and both are measured at the same gate distance by the same recorder that measures a hand-flown pass - so the numbers in the table are the numbers in the panel. It reports the two speed changes separately and the velocity change once, because there is one of it, and its caveat states how closely the deflection, the closest approach and the velocity change agree before saying that the speed changes do not have to. About a minute of wall clock, measured.',
      },
      {
        name: 'The optional impact-parameter sweep',
        text: 'Five passes on the gaining side - 20, 30, 40, 60 and 90 - plotted as turn and signed speed change against impact parameter, points only. The range is chosen so every pass clears the planet: the closest passes 3.8 planet radii out, and the pass that would maximise the gain would pass inside the planet, which is why the sweep can show the approach to a turnover and not the turnover itself. About three minutes of wall clock, measured. The lesson labels it optional and nothing after it depends on it.',
      },
      {
        name: 'The A/B experiment bench',
        text: 'The runner underneath both of the above, and available directly for anything else: capture the start, record one arm, restore exactly, change one variable and record the other.',
      },
    ],
    misconceptions: [
      {
        claim:
          'The planet pulls the spacecraft forward, so passing in front gains speed.',
        response:
          'The most common wrong answer and the reason the prediction is collected at the third screen before anything runs. A spacecraft ahead of the planet is pulled backwards relative to the planet’s motion. Take it as a show of hands and come back to it after the eighth screen.',
      },
      {
        claim: 'The gravity assist creates energy.',
        response:
          'The momentum ledger at the twelfth screen is the answer, and it is worth reading aloud: the spacecraft gained what the planet lost, to better than a hundredth of a per cent. The planet is slower by four millimetres per second.',
      },
      {
        claim:
          'The spacecraft speeds up because the planet’s gravity accelerates it.',
        response:
          'It does accelerate on the way in - and decelerates by exactly as much on the way out. In the planet’s frame the two cancel exactly, which is what the left-hand column shows. The gain is entirely in the frame change.',
      },
      {
        claim: 'A heavier planet would give a bigger boost without limit.',
        response:
          'The eleventh screen. The ceiling is twice the approach speed and mass cannot raise it; mass only decides how much of the ceiling a given pass reaches. Ask what would happen at a planet the spacecraft approached at 50 km/s.',
      },
      {
        claim: 'The gain and the loss should be equal and opposite.',
        response:
          'The tenth screen, and a genuinely good wrong expectation. The change in VELOCITY is the same size both ways - the comparison table reports the two agreeing to a part in 10^13 - and the change in SPEED is not, because speed is the length of a vector sum. Worth drawing: same two arrows, two different angles between them.',
      },
      {
        claim:
          'The residual in the heliocentric case means the simulation is inaccurate.',
        response:
          'The twenty-first screen exists for this. It is a physical effect - an accelerating frame and a third body - and halving the timestep does not shrink it. Students who have done the binary-stars investigation will reach for a convergence check here, which is exactly the right instinct applied to the wrong problem, and is worth praising and then redirecting.',
      },
      {
        claim:
          'The unchanged relative speed only works because the spacecraft is so much lighter than the planet.',
        response:
          'The fourteenth screen, and the most sophisticated wrong answer in the lesson - it is wrong for a good reason and worth taking seriously. The relative motion of two bodies is a Kepler problem in one coordinate, and it returns the same relative speed at the same separation for any pair of masses at all. What the finite mass does change is that the planet recoils, so "the planet\u2019s frame" names two slightly different inertial frames. Ask what the left-hand column would do if the spacecraft were as heavy as the planet: nothing.',
      },
      {
        claim: 'Passing closer always gains more speed.',
        response:
          'True of every pass in the optional sweep, and not a rule - which is why the seventeenth screen asks it rather than telling them. Turning helps only until the relative velocity points along the planet\u2019s own motion; here that needs 131 degrees and the closest survivable pass manages 97, so the turnover is real and unreachable. Students who answer "the closest possible pass" have generalised correctly from their data and incorrectly from the physics, which is a useful thing to have done out loud.',
      },
    ],
    teachingNotes: [
      'Collect the third screen’s prediction as a show of hands and write the tally on the board. In most classes a clear majority chooses "in front".',
      'The fourth screen is the one to run at the front of the room. Nine seconds of wall clock, and the moment to press "Planet’s frame" is right after the readings are taken: the same encounter redrawn as a hyperbola about a stationary planet makes the left-hand column obvious.',
      'The sixth screen is the hinge of the lesson. If a class is going to stall anywhere it is here, and the productive move is to ask what the spacecraft’s speed is "really" - which has no answer, and is the point.',
      'The tennis-ball-and-train analogy at the seventh screen is exact, not a loose comparison. A ball thrown at 10 m/s at a train approaching at 20 leaves the train at 10 m/s in the train’s frame and 50 m/s in the station’s. It is worth doing on the board with numbers.',
      'The tenth screen catches almost everyone, including people who got everything before it right. Let them be wrong out loud before resolving it.',
      'The eighth screen runs for about a minute with nobody typing, which makes it the natural place to take the third screen\u2019s show of hands off the board and ask the room to commit again. Both results are kept, so nothing is lost by talking over it.',
      'The optional sweep at the fifteenth screen runs for about three minutes. If you use it, set it going and teach something else - it needs no attention while it runs, and the four optional screens are written so a group that skips them loses nothing later.',
      'The heliocentric half is quick - the encounter takes a few seconds - so if time is short it is the part to compress rather than cut. The residual and what it means are worth more than the flyby itself.',
      'For a class that has done Planets in Binary Stars: the fifteenth screen is a deliberate counterpoint. There, a discrepancy that changed with the timestep meant the run was not converged. Here, a discrepancy that does not change with the timestep means the model is approximate. Telling those two apart is the transferable skill.',
    ],
    discussion: [
      'Voyager 2 gained about 16 km/s at Jupiter. Jupiter lost the corresponding momentum. Is there any measurement that could ever detect that?',
      'The Parker Solar Probe uses seven flybys of Venus on the leading side to lose speed and fall closer to the Sun. Why is losing speed hard, and why does it take seven?',
      'Every assist is capped at twice the approach speed. What does that imply about missions to the outer solar system, and about why they are so often routed past Jupiter?',
      'The lesson uses an Earth-mass spacecraft so the recoil is readable. Does using an unrealistic mass weaken the demonstration, and what would you have done instead?',
      'The heliocentric residual is a third of a per cent. If you were designing a real mission, would that be good enough, and what would you do about it?',
    ],
    extensions: [
      'The built-in sweep covers the gaining side. Run the same five magnitudes on the losing side by hand - -20, -30, -40, -60, -90 - and plot both branches on one axis. The two are not mirror images of each other, and the shape of the difference is the vector picture drawn out.',
      'Work out where the gain would peak for this geometry: the turn that lines the outgoing relative velocity up with the planet\u2019s motion, which is 131 degrees here. Invert tan(delta/2) = mu / (b v^2) for the impact parameter that produces it, then compute the periapsis at that value and compare it with the planet\u2019s radius. The answer is why the sweep stops where it does.',
      'Work out the tennis-ball-and-train problem on paper for the actual numbers on screen: 2.83 km/s for the planet, 4.34 for the approach, 58.6 degrees of turn. The answer should be the number in the panel.',
      'The retained comparison keeps two passes. Use the A/B experiment bench directly to record them as a time series instead, and chart speed against simulated time rather than as a before and an after.',
      'Look up the Voyager 2 Jupiter encounter parameters and compute the deflection with the formula this lesson uses. Jupiter’s GM is 1.267e17 m^3/s^2 and the closest approach was about 722,000 km.',
      'For a class with trigonometry: derive the ceiling. Show that the change in velocity has magnitude 2 v sin(delta/2), and that this is maximised at delta = 180 degrees.',
    ],
    expectations: {
      4: 'About nine seconds of wall clock. The trail bends visibly as the spacecraft rounds the planet, closest approach is 0.234 AU which is twelve planet radii, and the deflection is 58.63 degrees against a two-body prediction of 58.63 - they agree to a hundredth of a degree, which is worth pointing at. The "Planet\u2019s frame" button is the moment: press it after the readings and the same path is redrawn as a clean hyperbola about a stationary planet.',
      5: 'Relative to the planet, 4.343 km/s both before and after - the panel reports the change as roughly minus three parts in a hundred billion, which is zero. Relative to everything else, 3.32 km/s before and 5.89 after, a gain of 78 per cent. A student whose left column differs is reading the wrong column; the field check says so. A student whose right column shrank has the impact parameter negative.',
      8: 'About a minute of wall clock for both passes, measured. The table fills with two columns and the same left column in each: 4.343 km/s in and out on both sides. The rows that matter are the last three. Change in speed: +2.57 km/s behind, -1.67 in front. Change in velocity: 4.28 km/s in both columns. Encounter: "read in and out" in both. The caveat beneath reports the two velocity changes agreeing to a part in 10^13, the deflections to a part in 10^12 and the closest approaches to a part in 10^12, and then says the speed changes are not mirror images and were never going to be. Do not resolve that before the tenth screen.',
      9: 'A gain of about 2.57, a loss of about 1.67 and a velocity change of about 4.28, all in km/s. Two ways to get this wrong, and the field check catches both: reading the velocity-change row for both of the first two answers, which makes them equal, and entering the loss as a negative number. The ratio 1.67 / 2.57 is 0.65 and is worth writing on the board before the next screen.',
      12: 'The planet slows by about 4.3 mm/s, which is 1.5 parts per million of its own 2.83 km/s. Expect the ledger figure to differ between machines and say so if it does: it is around 0.002 per cent on a laptop under load and four orders of magnitude smaller when the encounter is integrated in fine steps, because the application sizes its integration step from the frame rate and the residual is a finite-gate effect that shrinks with the step. Every one of those numbers is far tighter than anything the thirteenth screen needs, which is the point to make - not the digits.',
      15: 'Optional, and about three minutes of wall clock, measured. Five passes, all reported as complete encounters. Turn: 96.6, 73.6, 58.6, 41.0 and 28.0 degrees at b = 20, 30, 40, 60 and 90. Speed change: 3.58, 3.05, 2.57, 1.90 and 1.34 km/s. Closest approach runs from 0.076 AU - about 3.8 planet radii - out to 0.70 AU. The plot draws points and no line, and the caveat states which pass turned most, which gained most, and that the answer is not a rule.',
      16: 'Turn 96.6 degrees and speed change 3.58 km/s at b = 20; 3.05 km/s at b = 30. The field check catches the two common misreadings - reading the table upside down, so that the widest pass is entered as the closest, and reading the turn from the wrong row. The subtraction they will need next is 3.58 minus 3.05 against 96.6 minus 73.6: about 0.023 km/s per degree, against 0.043 per degree at the wide end.',
      20: 'A few seconds only. Relative to the star the spacecraft goes from about 13.7 to about 19.8 km/s, a gain of 45 per cent. Relative to the planet it goes from 8.48 to 8.51, a change of 0.34 per cent where the isolated version gave 3e-12. The measured deflection is 34.2 degrees against a two-body prediction of 36.3, a six per cent miss. Both residuals are physical. Reading the gate distance of 0.45 AU against the quoted Hill radius of 0.58 AU is worth doing with a class: the encounter is being measured only just inside the region where the planet is what matters. The comparison and the sweep are deliberately not offered here - with a star present their two arms would differ in two ways rather than one.',
    },
    modelNotes: `The encounter is a Newtonian three-body problem in a plane - two bodies in the
      isolated scenario - integrated with Velocity Verlet rather than the catalogue's default
      symplectic Euler. The lesson asks students to believe that a speed is unchanged to a part
      in ten million, and first-order phase error is far too coarse to support that claim.
      \n\nThe spacecraft is placed on its encounter hyperbola from the orbital elements rather
      than pointed at the planet from a distance, so the impact parameter and the speed at
      infinity are exact inputs. A probe merely aimed at the planet arrives with a slightly
      different impact parameter and a noticeably different approach speed, and the comparison
      against the two-body prediction would then be measuring the setup rather than the physics.
      \n\nSpeeds relative to the planet are quoted at infinity, computed from the local speed and
      distance through vis-viva. At the gate the spacecraft is still travelling about 0.6 per
      cent faster than its asymptotic speed, which is ten times the accuracy the rest of the
      lesson works to; the alternative was to start the encounter absurdly far out and integrate
      empty space. Both legs are read at the same distance, so whatever the correction is worth,
      it is worth the same on each side.
      \n\nThe spacecraft is one Earth mass, about 10^22 times a real probe. This is the one
      deliberately unrealistic number in the lesson and it is called out at the closing screen.
      It is chosen so the planet's recoil is 4 mm/s - ten orders of magnitude above floating
      point noise, and therefore a number a student can read - rather than 10^-25 m/s, which is
      true, unreadable, and would reduce the momentum ledger to an assertion. At a mass ratio of
      10^-6 the test-particle scattering formula still holds to far better than anything here is
      measured to.
      \n\nEverything is coplanar. Real flybys are aimed in three dimensions and the out-of-plane
      component is most of the design problem; nothing in this lesson can show that.
      \n\nIn the heliocentric scenario the planet's own velocity change is dominated by its
      orbital turning rather than by the spacecraft, which is why the momentum ledger is
      demonstrated in the isolated scenario and not there. The panel does not report a recoil
      with a star present, because the number would be almost entirely the planet going round a
      corner. The retained comparison and the sweep are hidden there for the same class of
      reason: their claim is that their arms differ in one input, and with a star present the
      planet's frame is accelerating too.
      \n\nBoth experiments run on the A/B bench, which rebuilds the world per arm through the
      scenario's own builder rather than nudging the spacecraft mid-flight, photographs the
      reader's world before the first build and restores it after the last. Every arm is
      measured by the same recorder as a hand-flown pass, at the same gate on both legs, so a
      number in a table and the same number in the panel mean the same thing. What the bench's
      own metrics would give - a speed averaged over a run - is deliberately not used: it is not
      a before and an after, and it would happily report a flyby that never completed. An arm
      whose spacecraft never came back out past the gate is reported as an incomplete encounter
      with no speeds at all, rather than as a flyby with small ones.
      \n\nThe sweep's five values are bounded below by the planet, not by taste. Periapsis falls
      with the impact parameter, and js/physics.js merges bodies whose centres come within the
      sum of their drawn radii, 2.4 units here. At b = 20 the spacecraft passes 7.6 units out;
      at b = 10 it would pass 2.1 units out and be swallowed. The impact parameter that would
      maximise the gain is about 10.3, whose periapsis is 2.26 units - inside the collision
      radius. So the turnover in gain against turn is real, is where the geometry says it is,
      and cannot be reached in this laboratory: the sweep shows the approach to it and the
      lesson says so rather than implying the curve rises for ever.`,
  },

  'binary-star-planets': {
    topic:
      'Orbital stability in binaries, and the difference between a physical result and a numerical one',
    difficulty:
      'Introductory, but the second half is a genuine numerical-methods lesson and works in a computational course as well as an astronomy one',
    placement:
      'A long lesson, 40 to 50 minutes, that needs a full lab period. It has no prerequisites beyond knowing that gravity holds orbits together, and it sits naturally after any lesson that has established Kepler orbits. In a computational physics or scientific-computing course it can be run for its second half alone: steps 13 to 20 are a self-contained convergence study that happens to be about planets.',
    overview: `Students run a controlled three-body system - two stars of stated mass on a stated
      orbit, plus one Earth-mass planet - and find the distance at which the planet stops
      surviving. They do it twice: once for a planet orbiting one star of the pair, once for a
      planet orbiting both. Both boundaries are compared against the published Holman & Wiegert
      (1999) fits, which the panel prints along with the assumptions behind them.
      \n\nThe second half is the part that makes this more than a stability lesson. At 0.25 binary
      separations the planet survives twenty binary periods at one timestep and is ejected at a
      quarter of that step, with energy conserved to better than a part in a million in both
      runs. Students meet the case, are caught by it, and are led to the rule that actually
      licenses a claim: an outcome counts when halving the step leaves it unchanged. Energy
      conservation is shown to be a screen that catches disasters and cannot certify a result.
      \n\nNothing in the lesson is ever called stable. Every finished run is reported as having
      "survived this integration" for a stated number of binary periods, and steps 27 and 28
      make that distinction do real work: two circumbinary configurations that the published fit
      calls unstable survive forty periods here, while being flung fourteen and twenty-five
      separations out and back.`,
    priorKnowledge: [
      'That gravity holds a planet in orbit, and that a closer or heavier body pulls harder',
      'Reading a number off a panel and comparing it with another number',
      'Substituting values into a polynomial - steps 11 and 25 ask for arithmetic, not algebra',
      'No numerical methods required. Timesteps, energy drift and convergence are all introduced from scratch in steps 13 to 20',
    ],
    keyConcepts: [
      {
        heading: 'The stable zone is much smaller than it looks',
        body: 'Students consistently guess that a planet can live anywhere inside the binary. For this pair the circumstellar boundary is at 0.177 separations - under a fifth - and the circumbinary one is at 3.6 separations, so a band more than three times the stars’ separation wide is excluded on both sides. The step 3 prediction is worth collecting as a show of hands.',
      },
      {
        heading: 'Two different geometries, two opposite rules',
        body: 'For a planet around one star the boundary is a ceiling: inside is safe. For a planet around both it is a floor: outside is safe. The reason is the same in both cases - a planet is safe where one gravitational source dominates and unsafe where it can resolve two - but the direction reverses, and students who learned the first rule apply it to the second.',
      },
      {
        heading: 'Two distinct ways to lose a planet',
        body: 'The circumstellar planet at 0.30 separations is thrown out by a single close pass with the companion. The circumbinary planet at 2.0 separations is driven out over several periods without ever coming within two separations of a star: resonant forcing, where the changing pull arrives at nearly the same orbital phase each time and the small kicks accumulate. The encounter counter separates the two mechanisms, and step 25 turns that into the question.',
      },
      {
        heading: 'A numerical failure is not an outcome',
        body: 'A badly resolved close approach hands the planet the wrong energy, after which it leaves or stays for reasons that have nothing to do with the binary. From the outside this is indistinguishable from physics. The panel refuses to name an outcome when the energy drift exceeds a tenth of a per cent, and says so rather than guessing.',
      },
      {
        heading: 'Convergence, not conservation, is the test',
        body: 'This is the lesson’s hardest idea and its most transferable. Energy conservation is necessary and nowhere near sufficient: energy is one number and a three-body encounter can be resolved badly in ways that do not disturb it. The only test that licenses an outcome is repeating the run at half the step and getting the same answer. Step 16 is where students meet a case that passes the energy screen at both steps and gives two different answers.',
      },
      {
        heading: '"Survived this integration" is not "stable"',
        body: 'Instability in these systems is often slow: eccentricity is pumped a little on each pass and a planet can circle quietly for hundreds of periods before leaving. Holman & Wiegert integrated for 10⁴ binary periods; this lesson integrates for 20 or 40. Steps 27 and 28 show two configurations the fit calls unstable surviving the run, with maximum excursions of 14 and 25 separations that make clear they are on their way out.',
      },
      {
        heading: 'An empirical fit is a fit',
        body: 'The Holman & Wiegert formulae are polynomial fits to where a transition mostly sat across a grid of integrations. They carry assumptions - massless planet, coplanar, prograde, initially circular - a validity range in mass ratio and eccentricity, and a coefficient uncertainty of about 0.02 separations. The paper itself reports islands of instability inside the boundary and of stability outside it. The panel declines to predict at all within the fit’s own uncertainty, which is worth pointing at.',
      },
    ],
    flow: [
      {
        steps: '1-4',
        text: 'The system and the vocabulary. Two stars of 1.0 and 0.5 solar masses, 10 AU apart at e = 0.4, every parameter stated rather than generated. Students commit to a prediction for the stable radius, and are told before measuring anything that a finished run will be reported as "survived this integration" and why that is not "stable".',
      },
      {
        steps: '5-7',
        text: 'The quiet run: the planet at 0.15 separations for twenty binary periods, about half a minute of wall clock. Students record four numbers and answer why the companion barely matters at that radius - proximity, not mass.',
      },
      {
        steps: '8-11',
        text: 'The planet moved to 0.30. It is ejected within about three binary periods after one close pass. Students predict first, then measure when it left, then work out why positive energy alone is not enough to call something an ejection.',
      },
      {
        steps: '12-13',
        text: 'The published boundary. Students compute a_c = 0.177 separations from the fit and find their two runs on either side of it, then answer which of four departures from the fit’s assumptions would most clearly put a real system outside its scope. (Inclination, because the fit is two-dimensional and Kozai-Lidov is not in it.)',
      },
      {
        steps: '20-21',
        text: 'The turn. What a timestep is, why a close approach is where it fails, and the energy screen - demonstrated by running 0.50 separations, which starts the planet almost on top of the companion and produces a refusal rather than a result.',
      },
      {
        steps: '14-19',
        text: 'The sweep. Students predict the trend, run the same twenty-period experiment at five radii with everything else held fixed, read the outcomes off the table and the plot, and then re-run the trial at the change of outcome at half the step. It replaces three manual runs and the copying that went with them: the machine time is about the same, four to seven minutes, and it is spent discussing the prediction rather than typing. The plot deliberately draws no line through the points.',
      },
      {
        steps: '22-26',
        text: 'The case the lesson is built around. 0.25 separations, run at timesteps of 1.0, 0.5 and 0.25. The outcome changes; the energy drift stays under a part in a million throughout. Students record all three, choose what to report, meet the convergence rule, and write two or three sentences reporting the configuration honestly. This is the longest stretch and should not be rushed.',
      },
      {
        steps: '27-31',
        text: 'Circumbinary planets. Kepler-16b as the real example, a prediction about which direction the danger lies, then one explore covering 4.0 separations (survives) and 2.0 (ejected in about 3.4 periods with no close encounter at all), a measurement of both, and the question about what drove it out.',
      },
      {
        steps: '32-35',
        text: 'The circumbinary boundary at 3.6 separations, then the deliberate disagreement: 3.0 and 2.5 both survive forty periods although the fit excludes them, with excursions to 14 and 25 separations. Students are asked who is wrong, and the answer is neither - forty periods is four thousandths of what the fit was calibrated on.',
      },
      {
        steps: '36-37',
        text: 'The strongest claim the work supports, written out in full so students can see how long an honest one is, and a closing summary of every result together with the three things the model leaves out: it is flat, the planet is a test particle, and the stars are points drawn ten times life size.',
      },
    ],
    features: [
      {
        name: 'Binary Planet Lab and Circumbinary Planet Lab scenarios',
        text: 'Two scenarios built from closed-form orbital elements rather than from the world generator: identical stars in both, differing only in where the planet starts and how long the run is. Nothing is seeded because nothing is sampled, so two loads produce the same three bodies to the last bit and the experiment bench can restore a run by rebuilding it. The randomized "Binary Star System" scenario next to them in the gallery is not usable for this and step 2 says why.',
      },
      {
        name: 'Binary Planet Run panel',
        text: 'Set the planet’s starting radius, the number of binary periods and the integration step; read back the periods integrated, the energy drift, the step actually used, the encounter count, the closest approach to the perturbing star and the farthest excursion. Everything is measured on integration steps rather than frames, so a grazing pass that lasts three steps is not missed. Distances are reported in binary separations, which is the unit the published fit is written in.',
      },
      {
        name: '"Repeat at half the step"',
        text: 'One button, and it is the pedagogical core of the second half. It halves the integration step and rebuilds the identical starting state, so the two runs differ in exactly one thing. Steps 15 and 16 both depend on it.',
      },
      {
        name: 'The energy-drift screen',
        text: 'Past a tenth of a per cent the panel declines to report an outcome at all. The threshold was measured rather than chosen: across the configurations this lesson uses, every run that drifted more than that gave an outcome that changed when the step was halved. It is presented to students as a screen and not a certificate, which is the honest description.',
      },
      {
        name: 'The published boundary readout',
        text: 'The panel prints the Holman & Wiegert critical radius for whatever configuration was run, which side of it the planet started on, and the paper’s assumptions and validity range. Within 0.02 separations of the line - the fit’s own coefficient uncertainty - it declines to predict either way and says so.',
      },
      {
        name: 'Step size actually used',
        text: 'Not the step requested. The render loop sizes its substeps from the frame time, so a machine under load silently integrates coarser than the scenario asked for. In a lesson about whether a result is numerical, that could not be left unsaid; the panel reports the mean and the largest step the run was actually given.',
      },
      {
        name: 'The A/B experiment bench',
        text: 'Not required by the lesson, but the natural next tool: it will record two runs on the same simulated-time axis and difference them, which turns "0.15 survives and 0.30 does not" into a chart. Worth offering to students who finish early.',
      },
    ],
    misconceptions: [
      {
        claim: 'A planet can orbit anywhere inside the binary.',
        response:
          'The step 3 prediction, collected before anything is run. Most classes choose "roughly half" or more; the answer is under a fifth. The two runs at 0.15 and 0.30 settle it in about a minute of wall clock each.',
      },
      {
        claim: 'The companion matters because of its mass.',
        response:
          'Step 7. At 1.5 AU from a 1.0 solar-mass star the planet feels about eighteen times more pull from its own star than from a 0.5 solar-mass companion six AU away. Distance dominates, which is why the boundary is a distance.',
      },
      {
        claim: 'The rule for a circumbinary planet is the same rule.',
        response:
          'Step 22. Students who have internalised "close is safe" apply it outside the binary and predict that bringing the planet in is safe. The direction reverses because what makes a region safe is one source dominating, and outside the pair that means being far enough away to see them as one.',
      },
      {
        claim:
          'A planet leaves because something hits it or passes very close.',
        response:
          'The circumbinary run at 2.0 separations records zero close encounters and a closest approach of 0.22 separations, and the planet is gone in 3.4 periods. Resonant forcing does not need a close pass, and step 25 is where that becomes explicit.',
      },
      {
        claim: 'If energy is conserved, the run is right.',
        response:
          'This is the big one and the whole reason for steps 16 to 20. At 0.25 separations both the coarse and the fine run conserve energy to better than a part in a million and they disagree about whether the planet survives. Energy is one number; a three-body encounter can go wrong in ways that do not show up in it.',
      },
      {
        claim:
          'The finer timestep is more accurate, so the fine answer is the answer.',
        response:
          'The most interesting wrong answer in the lesson, and the one to draw out at step 18. It is more accurate, and that is not the same as converged: the next halving might move it again. What a changing answer establishes is that the answer is still moving. Students who make this error have understood the numerics and drawn the wrong conclusion, which is worth more class time than students who have not.',
      },
      {
        claim: 'A run that gives no answer is a failed run.',
        response:
          '"This configuration is not resolved at these steps" is a result, and a reportable one. Point at the 0.30 run, which agreed at every step tried, and ask what is different about it.',
      },
      {
        claim:
          'The published fit is the right answer and the simulation is wrong.',
        response:
          'Steps 27 and 28. Two configurations the fit excludes survive forty periods here, and neither the fit nor the simulation is wrong: the fit was calibrated at 10⁴ periods and this run is 40. The maximum-excursion figures - 14 and 25 separations - show the planets already being pumped out. Neither is a fit a wall: the paper reports islands of instability inside its own boundary.',
      },
      {
        claim: 'The planet hitting a star is a measured collision.',
        response:
          'The stars are drawn ten times life size so they are visible at all at a 10 AU separation, and js/physics.js collides on the drawn radius. A "collision" here means the planet came within about 0.06 AU - roughly thirteen solar radii - of a star’s centre. A pass that close destroys a planet in reality too, so the outcome is not fiction, but the split between collided and ejected among the disrupted configurations is partly set by a drawing decision. The split between disrupted and survived is not: surviving configurations keep the planet seventy times that distance away.',
      },
    ],
    teachingNotes: [
      'Budget the time backwards from step 16. Steps 1 to 13 are a brisk stability lesson and can be done in twenty minutes; steps 14 to 20 are the part that is hard to teach anywhere else and need at least as long again.',
      'Take the step 3 prediction as a show of hands and write the tally on the board before anyone runs anything. Coming back to it after step 12 - when they have computed 0.177 - is the strongest moment in the first half.',
      'Each run is about half a minute of wall clock at the scenario’s own speed. Halving the step doubles it, so the third run at a timestep of 0.25 takes roughly two minutes. Warn students, and consider having different groups run different steps and pool the results rather than each doing all three.',
      'At step 15, the 0.50 configuration starts the planet almost on top of the companion star, which is why it fails so spectacularly. That is deliberate: it is the easiest possible demonstration of the energy screen, and it is not subtle. The subtle case is step 16.',
      'Step 16 is the one to run at the front of the room if you run anything yourself. Watching the encounter counter climb into the dozens while the drift readout sits at 0.0002% makes the point better than the text does.',
      'Step 18 has one instructive wrong answer - "ejected, since the finer step is always more accurate" - and it deserves discussion rather than correction. Ask what would have to be true for that reasoning to be safe. The answer is that you would have to already know the run had converged.',
      'Step 20 is a written answer and takes most of the remaining time. Its rubric has four parts and the fourth - offering no verdict - is the one to mark hardest. If time is short, set it as the exit ticket.',
      'The circumbinary half is faster than it looks because the two disruption cases resolve in three or four binary periods. Steps 21 to 28 fit in fifteen minutes if the first half has run long.',
      'Step 27 asks students to run configurations the fit says should fail, and they do not fail. Some students will assume they have made a mistake. Tell them in advance that this is the intended result and the question is why.',
      'Everything in steps 14 to 20 transfers to any N-body work. If any of your students go on to a computational project, this is the lesson they will use again, and it is worth saying so.',
    ],
    discussion: [
      'A run that gives different answers at different timesteps has told you something. What, exactly, and how would you write it in a paper?',
      'Holman & Wiegert integrated 10⁴ binary periods per configuration across a grid in mass ratio and eccentricity. What would that cost today, and what would you do with the result that a formula does not already give you?',
      'The formula in this lesson assumes a coplanar, prograde, initially circular, massless planet. Which of those four is most likely to be violated by a real system, and what would you do about it?',
      'Alpha Centauri A and B are 23.5 AU apart at e = 0.52. Work out the circumstellar boundary for that pair. What does the answer say about the prospects for a habitable-zone planet around either star?',
      'This lesson calls nothing stable. Is that excessive caution, or is "stable" a word that should not be used about a numerical result at all?',
      'Two thirds of Sun-like stars have companions, and the excluded band here is wide. What does that imply about how many planetary systems could exist, and does the exoplanet census bear it out?',
    ],
    extensions: [
      'Bisect the circumstellar boundary. Run 0.18, 0.20 and 0.22 at two timesteps each and see how narrow an interval can be established before the answers stop converging. The honest result is likely to be a wider interval than students expect.',
      'Change the binary eccentricity in the settings from 0.4 to 0.2 and recompute the fit. The boundary moves outward to 0.254 separations - run 0.20 and 0.30 again and see whether the simulation agrees.',
      'Take a real system - Alpha Centauri, or Kepler-16 - work out its critical radius from the appropriate formula, and compare with the actual or proposed planet. Kepler-16b at 0.7048 AU against a critical radius of about 0.65 AU is famously marginal.',
      'Use the A/B experiment bench to record 0.15 and 0.30 as two arms of one experiment and chart the distance to the primary against simulated time. The divergence is visible long before the ejection.',
      'For a computational course: reproduce the convergence study at 0.25 separations in a language of your choice, with your own integrator, and see whether the step at which the answer settles is the same. It should not be, and why not is the exercise.',
    ],
    expectations: {
      5: 'The planet at 0.15 separations, twenty binary periods, about half a minute of wall clock. The trail band holds its shape throughout - it widens and narrows slightly as the stars swing through periapsis, and it never stops being a ring. Energy drift settles around 0.00017% and stays there. If a machine is struggling, the "Step actually used" row will report a mean larger than 1.0; that is worth pointing out rather than ignoring, because it is the same effect the second half of the lesson is about.',
      6: 'Twenty periods completed, farthest out about 0.62 separations, zero close encounters, energy drift about 0.00017%. A student reporting fewer than twenty periods has the starting radius wrong - the panel prints the value it actually used. A farthest-out figure above 2 usually means they have read the row in AU rather than in separations.',
      9: 'The planet at 0.30 separations is ejected after about 2.5 binary periods, following one close pass with the companion. Energy drift around 0.0005%, comfortably inside the screen, so this is a physical result and not a numerical one. The run ends itself once the planet is unbound and past ten separations. Exact timing varies with the step: at a timestep of 1.0 it leaves around 2.5 periods and at 0.25 nearer 5, which is expected in a chaotic system and is the subject of step 19 - the runs must agree on whether, not on when.',
      10: 'About 2.5 binary periods and one close encounter. Any answer of twenty periods means the planet did not leave; check the starting radius. The encounter count is the interesting number here, because the circumbinary case at step 24 records zero and loses its planet anyway.',
      21: 'At 0.50 separations the planet starts about 1 AU from the companion, which is not really an orbit at all. At a timestep of 1.0 the drift is about 0.18%, past the 0.1% screen, and the panel refuses to name an outcome; the eccentricity readout comes out above 100, which is a useful thing for students to see a number do. The first halving is the instructive part: the drift goes to 0.17%, essentially unchanged, and is still refused. The second, to a timestep of 0.25, takes it to 0.0023% and produces an answer - the planet collided with a star after 0.010 binary periods. Two points to draw out: resolving an encounter is not a matter of doing gradually better, and the outcome turned out to be a collision rather than the ejection most students will have assumed. This is the blunt demonstration; the subtle one is next.',
      22: 'This is the run to do at the front of the room. At 0.25 separations with a timestep of 1.0 the planet survives all twenty periods while the encounter counter climbs into the dozens - around seventy by the end - and the drift readout sits at about 0.00018%. At a timestep of 0.25 the same configuration is ejected, after roughly thirteen periods, with drift near 0.0000034%. Both runs pass the energy screen and they disagree. Wall clock is about half a minute, one minute and two minutes for the three timesteps; consider splitting them across groups.',
      23: 'Drift about 0.00018% at a timestep of 1.0 and about 0.0000034% at 0.25 - both several orders of magnitude inside the screen. The third field has no single right answer and is meant to be uncomfortable: students who ran all three steps will usually find two agreeing and one not, and the point is that "two out of three" is not how convergence works. Take the count they report and ask what it would take to make it three.',
      29: 'At 4.0 separations the planet holds its ring for all forty binary periods, with a farthest-out figure of about 4.03 and zero encounters. At 2.0 it is ejected after about 3.4 periods, still with zero encounters and a closest approach of about 0.22 separations - it never comes near either star. Energy drift is around 0.0007% in both, so neither result is numerical. Each run is about half a minute.',
      30: 'About 3.4 binary periods, zero close encounters, drift about 0.0007%. The zero is the point of the step. A student reporting a nonzero encounter count has the radius smaller than 2.0.',
      34: 'Both should report that the planet survived the integration, which is not what the fit predicts. What separates them from the genuine survivor at 4.0 is the farthest-out figure: about 14 separations from the run at 3.0 and about 25 from the run at 2.5, against 4.03 for the 4.0 run. Those excursions are the answer to step 28 - the planets are being pumped outward and forty periods is not long enough to see where it ends. Expect some students to assume they have made a mistake; tell them in advance that this is the intended result.',
      15: 'The sweep takes four to seven minutes for five trials of twenty periods. Expect 0.12 through 0.22 to survive the window and 0.30 to be ejected after about five periods, with a farthest distance of ten separations and a handful of close passes. The exact ejection time is not reproducible between machines and does not need to be.',
      16: 'Four survived; the largest surviving radius is 0.22 and the smallest ejecting one is 0.30. A class that reads 0.22 as "the boundary" has read a gap between two samples as a measurement, which is what the next question is for.',
      18: 'The re-run at the change of outcome with half the step gives the same answer, so the ejection is not an artefact of the step. If it disagrees, that is the better lesson: neither run has measured that configuration.',
      33: 'Optional, eight to twelve minutes. Expect the outer radii to hold and the inner ones to be disrupted, with the change not falling neatly at the published 3.61 - which is the disagreement the next two screens are about.',
    },
    modelNotes: `The three bodies are integrated as a Newtonian point-mass system in a plane, with
      Velocity Verlet rather than the catalogue's default symplectic Euler. That choice is part of
      the lesson's subject matter: symplectic Euler's O(dt) phase error puts a spurious
      eccentricity on the planet within a few orbits, which a student would then read as the
      binary perturbing it. Verlet's error is O(dt²) and bounded, so a quiet run holds energy to
      about a part in a million and the drift readout rises only when something real is
      unresolved.
      \n\nThe two Holman & Wiegert fits are transcribed from the paper - equation (1) with Table 3
      for the circumstellar case, equation (3) with Table 7 for the circumbinary one - and are
      checked in the test suite against values published outside the fit: the familiar 0.27 and
      2.4 separations for an equal-mass circular binary, Alpha Centauri A's quoted stable zone of
      close to 3 AU, and Kepler-16b sitting just outside its critical radius of about 0.65 AU. A
      transcription error in a coefficient is invisible on a plot, so it is checked against
      systems rather than against itself.
      \n\nThe planet is one Earth mass, three parts in a million of the lighter star. Not zero,
      because a massless body drops out of the barycentre and out of the energy bookkeeping the
      diagnostics depend on, and small enough that the test-particle assumption behind the fit is
      not violated by the thing being measured. A Jupiter-mass planet in this lab would be outside
      what the fit describes.
      \n\nEverything is coplanar, and both the simulation and the fit are two-dimensional. This is
      the model's largest simplification and step 13 makes it explicit. A planet inclined out of
      the binary's plane can exchange inclination for eccentricity through the Kozai-Lidov
      mechanism, which destabilises orbits that are safe in the plane; no part of this lesson
      can show that.
      \n\nThe stars are drawn ten times their main-sequence radii, because at a 10 AU separation a
      true solar radius is about a third of a pixel. js/physics.js collides on the drawn radius,
      so the exaggeration sets the collision threshold at roughly 0.06 AU. This is stated in the
      lesson's closing screen and in the panel's own wording, and it affects the split between
      recorded collisions and recorded ejections among the disrupted configurations. It does not
      affect the split between disrupted and survived: every surviving configuration in this
      lesson keeps the planet at least 400 simulation units from the perturbing star, about
      seventy times the threshold.
      \n\nOne further limit worth naming to a class that asks. The runs here are 20 and 40 binary
      periods. That is short enough that the lesson's own results and the published fit disagree
      in two places, which the lesson uses rather than hides - but it also means every "survived"
      in this lesson is a much weaker claim than the ones in the paper, and no claim at all about
      the real systems the paper's readers care about.`,
  },
  'design-the-schedule': {
    topic:
      'Observing design on the live instrument, and what a result has to carry',
    difficulty: 'Introductory, written for non-science majors',
    placement:
      'The hands-on companion to Can You Detect This Planet?, and best run immediately after it in the following lab period. That lesson makes the argument with an analytic planner in seconds; this one makes students do it for real on the live spectrograph, where a run takes minutes and cannot be rewound. It needs 35 to 40 minutes, most of which is observing time that a class can spend discussing predictions. It also works as a standalone experimental-design lab for any course that needs one, because everything it demonstrates is about the schedule rather than about exoplanets.',
    overview: `Students plan an eight-night radial-velocity run themselves in the live Radial
      Velocity panel, commit to a prediction, and then observe two schedules side by side
      against the same simulated star. The panel's Compare mode runs both arms over the same
      frames with the same eight observations, the same 24.673-day baseline, the same 8 m/s
      uncertainty and the same noise seed, so the only difference between the two recordings
      is when they looked. The regular arm's nights land 3.525 days apart against a 3.5247-day
      period, so every one of them falls at the same orbital phase and the run cannot establish
      that the velocity varies at all; the irregular arm of the same eight nights recovers the
      period.
      \n\nThe second half is about not over-reading that. Students change the noise seed to
      separate a property of the schedule from a property of the draw, lose the middle of the
      run to weather and watch the panel refuse to call the comparison controlled, type a list
      of dates by hand, and close on what a reported period needs beside it - the times, the
      seed, the uncertainty and the range searched - before anybody else can check it.`,
    priorKnowledge: [
      'That a planet makes its star move, and that radial velocity measures the part of that motion along the line of sight',
      'Reading a point with an error bar off a plot',
      'Strongly recommended: Can You Detect This Planet?, which makes the same argument analytically and in a fifth of the time',
      'No statistics beyond the idea that a measurement has an uncertainty. The window function is introduced in words as "what these times cannot tell apart"',
    ],
    keyConcepts: [
      {
        heading: 'A controlled comparison is a comparison of one thing',
        body: 'The two arms share the star, the frames, the observation count, the baseline, the stated uncertainty and the noise seed. Holding all of that fixed is what licenses attributing the difference in the answers to the times. The panel checks every one of those holds rather than assuming them, and says which ones broke; a class that has only ever met controls as a phrase in a methods section can see one being enforced.',
      },
      {
        heading: 'The spectral window',
        body: 'A property of the observation times alone, computable before any telescope is pointed anywhere. A peak near one says there is a frequency at which two entirely different signals produce identical measurements, so no amount of care in the fitting can separate them. The regular arm here has a window peak of essentially 1.0 and the irregular arm about 0.57, and that number - not the fitted period - is what a proposal should be argued from.',
      },
      {
        heading: 'A search range is part of a result',
        body: 'A period search returns the best period inside the range it was given, and a true period outside that range comes back as whichever end was nearest, with no error and no complaint. Two runs that both did that agree with each other perfectly and mean nothing. The panel prints the range for every comparison and flags a fit sitting on its own boundary rather than reporting it as a measurement.',
      },
      {
        heading: 'One draw is not a study',
        body: 'Each arm is a single noise realisation. That the irregular schedule won here is a fact about this run; that irregular schedules are better is a claim about schedules, and one run of each cannot support it. The seed step exists so the distinction can be tested rather than asserted: the regular arm fails on every seed because its failure is geometric, while the irregular arm\u2019s period and especially its amplitude move from draw to draw.',
      },
      {
        heading: 'Phase coverage and amplitude bias',
        body: 'The winning arm here typically returns K near 100 m/s against a true 84, because eight points with a two-thirds phase hole overestimate an amplitude. This is worth naming out loud: recovering the right period is not the same as measuring the orbit, and the lesson deliberately does not tune the configuration to hide it.',
      },
    ],
    flow: [
      {
        steps: '1-2',
        text: 'The framing - eight nights, one star, the times to be decided in advance - and the setup of the live panel: baseline 24.673 d, uncertainty 8 m/s, seed schedule-1, regular cadence, eight observations. Have students write down the schedule checksum the note prints.',
      },
      {
        steps: '3-4',
        text: 'The prediction, collected before anything is observed, then the comparison run itself. This is the long screen: about seven simulated orbits. It is a good moment to poll the room on the prediction and to point out that the second arm is not a second run.',
      },
      {
        steps: '5-7',
        text: 'Reading the two arms, then the two questions that decide what the reading is worth: what a window peak of 100% means, and what one draw of each schedule does and does not establish. The second is the harder one and the one worth discussing aloud.',
      },
      {
        steps: '8',
        text: 'Changing the noise seed and running again, to separate the geometric failure of the comb from the luck in the irregular arm.',
      },
      {
        steps: '9-11',
        text: 'The run as it actually arrives: a weather gap typed into the panel, which drops epochs and can break the control, and then a hand-typed list of times, which is also where students discover that unreadable entries are reported rather than dropped.',
      },
      {
        steps: '12-14',
        text: 'What a number has to be quoted with - the range searched, the schedule, the seed - and the closing statement that a schedule is not administration around a sampled measurement but the measurement itself.',
      },
    ],
    features: [
      {
        name: 'Schedule shapes in the Radial Velocity panel (steps 2-11)',
        text: 'The observing run can be given a shape - regular, irregular, clustered, or a typed list of times - an observation count, and weather gaps, instead of only a cadence. The note under the controls reports what the plan came out as, what fell inside a gap, and what it could not read, and prints a checksum over the epoch times so two recordings can be told apart.',
      },
      {
        name: 'Compare mode (steps 4-11)',
        text: 'A second schedule observing the same star over the same frames as the first, with the noise on the nth observation drawn identically in both arms. Both arms are searched over one range derived from what they share, and the report states what was held equal, what was not, whether the two periods differ by more than the baseline can resolve, and whether a difference lands on one of the schedules\u2019 own window peaks.',
      },
      {
        name: 'Seeded noise',
        text: 'The scatter comes from a generator dedicated to observing, seeded by name and keyed by epoch index, so removing an epoch to a gap does not redraw the scatter on the ones that remain. Two students with the same seed get identical measurements and can compare answers.',
      },
      {
        name: 'CSV export',
        text: 'Export data \u2192 Radial velocity measurements. Every row carries the schedule kind, the schedule checksum, the planned epoch count and the gaps alongside the cadence, baseline, uncertainty and seed, which is what makes a result somebody else can check rather than only read.',
      },
      {
        name: 'Exoplanet Characterization Lab scenario (steps 1-11)',
        text: 'HD 209458 with the star free to move: P = 3.5247 d, K = 84 m/s, the same system the other radial-velocity lessons use. One orbit is about thirteen seconds of wall clock at normal speed, so the 24.673-day run is a few minutes unless the simulation speed is raised.',
      },
    ],
    misconceptions: [
      {
        claim: 'A cadence that matches the period is the ideal cadence.',
        response:
          'It is the worst one available. Matching the period returns the star to the same phase at every visit, so the run sees a nearly constant velocity. Collect the step 3 prediction before revealing this; the first option is chosen by a substantial fraction of most classes.',
      },
      {
        claim: 'This experiment shows that irregular sampling is better.',
        response:
          'It shows what happened on one draw of one pair of schedules against one period. Step 8 is where a class can actually test the generalisation, and the honest finding is asymmetric: the comb fails on every seed for a geometric reason, while the irregular arm gets lucky to varying degrees.',
      },
      {
        claim: 'The period the panel reports is the period of the planet.',
        response:
          'It is the best fit inside a stated range. Change the range and the number changes; put the true period outside it and the fit returns a boundary. The panel prints the range with every comparison and flags a fit on the edge, and step 12 is built on that.',
      },
      {
        claim: 'Losing nights to weather just means slightly less data.',
        response:
          'It means fewer observations in the same baseline, a hole in the phase coverage, and - if the two arms lose different numbers of nights - a comparison that is no longer about scheduling at all. The panel says so rather than quietly reporting a shorter run.',
      },
      {
        claim: 'Recovering the right period means the orbit has been measured.',
        response:
          'The winning arm here typically returns an amplitude around 100 m/s against a true 84, from eight points that missed two-thirds of the cycle. The period can be right while the amplitude is badly biased, and the coverage number in the report is what says so.',
      },
    ],
    teachingNotes: [
      'The observing at step 4 takes a few minutes of wall clock. Raise the simulation speed rather than shortening the baseline - but watch for the panel\u2019s warning that frames are too far apart for the schedule, which means measurements are being read across the curve instead of on it, and is a real defect in the data rather than a cosmetic complaint.',
      'Collect the step 3 prediction as a show of hands before anybody runs anything. The lesson\u2019s whole structure depends on the prediction existing before the result does, and the reading step declares the prediction as a prerequisite so an assignment cannot include one without the other.',
      'Numbers will differ slightly between machines: the frames land differently at different simulation speeds, so the fitted values move. The story does not - the comb sees a nearly constant velocity on every machine and every seed.',
      'Step 11 is the one to let run long if there is time. Students who know the period can design a list of times that beats both built-in shapes, which is the most useful thing in the lesson and the closest to what a real second season of observing does.',
      'If a class is short of time, steps 9 and 10 can be dropped without breaking anything later; steps 12 and 13 cannot, because they are where the result becomes reportable.',
    ],
    discussion: [
      'The window function can be computed before any observing happens. What would you have to know about a target to design a schedule for it, and what do you do when you do not know the period you are looking for?',
      'The regular schedule failed for a reason that has nothing to do with luck, and the irregular one succeeded partly by luck. Which of those two statements could you have made before running anything, and which needed the run?',
      'Ground-based observers cannot observe in daylight, which forces a cadence near a whole number of days. Which planets does that make hardest to find, and what did observers do about it?',
      'You are asked to referee a paper reporting a 3.5-day period from eight measurements. What do you ask the authors for?',
    ],
    extensions: [
      'Have each student run the comparison with a different seed and pool the results on a board. The distribution of the irregular arm\u2019s recovered period and amplitude is the beginning of an error analysis that no single run could produce.',
      'Export both arms and fit them in Python or a spreadsheet, using the schedule checksum in the file to keep the two recordings straight. A class that has done any curve fitting can reproduce the panel\u2019s numbers and then try a range that excludes the true period, to see a boundary reported as a result.',
      'Design a schedule for a planet whose period is not known in advance - the real problem. Give students a range of plausible periods and ask for eight times that would distinguish them, then test the design against the simulation.',
    ],
    modelNotes: `The star and planet are integrated by the simulation, not modelled analytically, so the
      velocities are whatever the dynamics produce. The observing layer keeps only the measurements a
      stated schedule would have produced: each epoch is interpolated between the render frames either
      side of it and carries a Gaussian uncertainty drawn from a generator seeded by name and keyed by
      the epoch\u2019s index in the ungapped plan, so removing an epoch does not redraw the others.
      Both arms of a comparison observe the same frames, which is why the noise is a shared draw rather
      than two independent ones. The period search is the same weighted circular fit the analysis
      workspace uses, run over one range for both arms; the reported window function is computed from
      the times alone and uses no velocities at all.`,
    expectations: {
      2: 'The note under the controls should read eight observations over 24.673 days with a schedule checksum. If it shows a different count, the Observations field has been left at its default rather than set to 8.',
      4: 'Both arms observe together and the comparison appears only when both have finished; before that the panel reports progress as two counts. Expect a few minutes at normal speed, or under a minute at high speed.',
      5: 'The regular arm lands somewhere well away from 3.5 days with an amplitude of a few m/s - it has seen essentially no variation - while the irregular arm recovers about 3.52 days with an amplitude near 100 m/s against a true 84. The exact figures move with the simulation speed and the seed; the pattern does not.',
      8: 'The regular arm fails on every seed, because its failure is geometric. The irregular arm recovers the period on most seeds, with the amplitude varying more than the period does.',
      10: 'The note reports how many epochs fell inside the 8-16 day gap. If the two arms lose different numbers, the comparison block says it is no longer a comparison of scheduling alone and lists what stopped being equal.',
      11: 'Unreadable entries and duplicate times are reported in the note rather than dropped silently, and a list that cannot be read at all falls back to a regular cadence and says so.',
    },
  },
  'detect-this-planet': {
    topic: 'Observational design and the limits of a measurement',
    difficulty: 'Introductory, written for non-science majors',
    placement:
      'A short lesson, 15 to 20 minutes, meant to sit immediately after Finding Planets by Their Tug, which is where students learn to read a radial-velocity curve. It works as a standalone lab-period opener and as the bridge from "here is a signal, what does it mean" to "here is a telescope allocation, what will you get". It is also the only exoplanet lesson that is about the observer rather than the system, so it doubles as an introduction to experimental design in any course that needs one.',
    overview: `Students plan two radial-velocity observing runs of the same star, with the same
      instrument and the same twelve measurements, and find that one of them detects a hot
      Jupiter unambiguously while the other - eleven times the baseline, not one measurement
      fewer - returns a result nobody could publish either way. The planet is identical in both.
      What differs is the cadence: Schedule B samples every 3.52 days against a 3.5247-day
      period, so every measurement lands at the same orbital phase.
      \n\nThe lesson then separates the three things a run can get wrong - cadence, baseline and
      precision - by holding two fixed and moving the third, and closes on two questions about
      what the evidence supports: what a marginal chi-square excess actually licenses you to
      say, and what a completely flat dataset does and does not rule out. It deliberately never
      offers a detection verdict; the readouts report scatter against a constant-velocity model
      and say in as many words that this is not the same as finding a planet.`,
    priorKnowledge: [
      'That a planet makes its star move, and that radial velocity measures the part of that motion along the line of sight',
      'Reading a point with an error bar off a plot',
      'Helpful but not required: Finding Planets by Their Tug, for the shape of a radial-velocity curve and the meaning of K',
      'No statistics beyond the idea that a measurement has an uncertainty. Chi-square is introduced in words at step 5 as "how surprising is this much scatter if nothing was changing"',
    ],
    keyConcepts: [
      {
        heading: 'A schedule is part of the experiment',
        body: 'When measurements are taken is a decision, made before any data exist, and it constrains the conclusions as firmly as the instrument does. Students routinely believe that data quality is a property of the instrument and quantity a property of effort; a schedule is neither, and it can make both irrelevant.',
      },
      {
        heading: 'Cadence, baseline and precision are independent',
        body: 'Baseline sets the longest period that could be seen at all. Cadence sets which phases of a given period get looked at, and can destroy a signal at any baseline. Precision sets how small a signal survives the noise. A run can be ruined by any one of the three while the other two are excellent, and the lesson demonstrates each failure separately.',
      },
      {
        heading: 'Aliasing',
        body: 'A cadence close to the period - or to a simple fraction or multiple of it - returns the star to nearly the same phase at every visit. The signal is fully present and completely unsampled. The classic real-world case is a one-day cadence forced by the rotation of the Earth acting on a planet with a period near a whole number of days.',
      },
      {
        heading: 'Phase coverage',
        body: 'The fraction of the orbital cycle a schedule actually visited. It is the statistic that separates the two runs here, and it is the one students are least likely to think of on their own, because it cannot be read off a time series - only off a folded one.',
      },
      {
        heading: 'What excess scatter licenses',
        body: 'A chi-square excess over the measurement errors says the velocity is not constant. It does not identify a planet, a period or a mass, and it does not exclude a companion star, stellar activity, spots, pulsation, or an underestimated error bar. Turning variability into a planet requires a repeating period and the elimination of the alternatives.',
      },
      {
        heading:
          'A nondetection is a statement about a region, not about a star',
        body: 'A flat dataset excludes planets above a mass that depends on period, inclination and the schedule itself. It never excludes "a planet". Published radial-velocity nondetections are always presented as sensitivity curves for this reason.',
      },
    ],
    flow: [
      {
        steps: '1-2',
        text: 'The framing: twelve nights, one star, and the question of whether the schedule would find a planet rather than whether one is there. Students commit to which of four choices matters most before seeing any data.',
      },
      {
        steps: '3-5',
        text: 'Schedule A - twelve measurements across one orbit - in the survey-schedule instrument. Students read phase coverage, scatter and chi-square, then face the key question: the most this establishes is that the velocity is not constant.',
      },
      {
        steps: '6-9',
        text: 'Schedule B, the same twelve measurements at 3.52-day intervals. Students predict, observe the folded panel collapse into two bins, record the numbers, and work out that the cadence is one orbital period.',
      },
      {
        steps: '10-11',
        text: 'Precision isolated: a Neptune on the good schedule is invisible at 8 m/s and obvious at 1 m/s. Then the ambiguous-evidence question, which is the lesson’s hardest and the one most worth discussing aloud.',
      },
      {
        steps: '12-13',
        text: 'The synthetic observing run in the live Radial Velocity panel, against the simulated star, followed by the CSV export. Schedule A completes in about thirteen seconds of wall clock.',
      },
      {
        steps: '14',
        text: 'A written question on the limits of a nondetection: what a flat dataset excludes, and what it leaves open.',
      },
      {
        steps: '15-16',
        text: 'The turn to transits. The depth of a transit is a ratio of areas, and students compute the 84 ppm an Earth would make across the Sun - a number that comes back at step 23 as a planet TESS cannot reach.',
      },
      {
        steps: '17-19',
        text: 'The noise budget instrument, opening on a Kepler hot Jupiter at a depth-over-noise of 587. Students predict what the same planet does from three nights on the ground, then watch it fall to about 4 - and then find that three hundred nights take it to 31, but no further than a ceiling of 49.',
      },
      {
        steps: '20-21',
        text: 'Three noise terms rather than two and why they scale differently, then what the model is pretending - the middle term is treated as perfectly correlated within a transit and perfectly independent between them, and reality is neither. The second of these is the screen to slow down on.',
      },
      {
        steps: '22-23',
        text: 'A measurement of both budgets side by side, then the question that names the ceiling: two of the three terms average down and one does not, which is why three hundred nights bought a factor of eight rather than ten and why it stops at 49.',
      },
      {
        steps: '24-25',
        text: 'Three real TESS cases in order of difficulty: Pi Mensae c at 10.5, TOI-700 d at 2.7 after a year of sectors, and an Earth twin at 0.6 whose ceiling is 2.8 - unreachable however long anyone observes. Then what would actually have to change.',
      },
      {
        steps: '26',
        text: 'The closing statement, now covering both halves: the radial-velocity failure could have been repaired by observing differently, and the photometric one only by lowering the persistent floor.',
      },
    ],
    features: [
      {
        name: 'survey-schedule instrument (steps 3-11)',
        text: 'An analytic planner: it computes the radial-velocity curve for a chosen planet mass, samples it on a chosen cadence, adds Gaussian noise from a seeded generator, and reports phase coverage, scatter and chi-square against a constant velocity. Analytic rather than integrated so a student can compare two schedules in seconds; the four presets are the four cases the lesson uses.',
      },
      {
        name: 'Ideal-signal overlay',
        text: 'The dashed curve on both panels is the noiseless signal, drawn to teach and labelled as such on the plot itself. It has no counterpart in a real observing run and the lesson says so at step 3. It can be switched off in the live panel, which is worth doing with a class.',
      },
      {
        name: 'Synthetic observing run (step 12)',
        text: 'An opt-in mode in the live Radial Velocity panel. It keeps only the measurements a stated cadence and baseline would have produced, each with a Gaussian uncertainty, and records nothing between them. Measurements are scheduled in simulated days and read by interpolating between render frames, so the result does not depend on the frame rate; a run whose frames are too coarse for its cadence says so rather than reporting flattened extremes.',
      },
      {
        name: 'Seeded noise',
        text: 'The scatter comes from a generator dedicated to observing, seeded by name. Two students with the same seed get identical measurements and can compare answers; the world’s own random number stream and the dynamics are untouched, so observing a star does not change it.',
      },
      {
        name: 'CSV export (step 13)',
        text: 'Export data → Radial velocity measurements. One row per measurement - time, velocity, uncertainty, target and the full observing configuration - and nothing between them, so the gaps in the file are the gaps in the run. Suitable for a follow-up fitting exercise in Python or a spreadsheet.',
      },
      {
        name: 'Exoplanet Characterization Lab scenario (steps 1, 12)',
        text: 'HD 209458 with the star free to move, the same scenario the other radial-velocity lesson uses. One orbit takes about thirteen seconds of wall clock, so Schedule A completes live in about that time.',
      },
    ],
    misconceptions: [
      {
        claim:
          'More data is always better, so a longer run beats a shorter one.',
        response:
          'Schedule B is the counterexample and it is the point of the lesson. Collect the step 6 prediction before revealing it - in most classes a clear majority chooses the longer baseline.',
      },
      {
        claim:
          'The number of measurements is what determines whether you find a planet.',
        response:
          'Both schedules take exactly twelve. Say the number out loud when the second one fails; students often do not notice that it was held fixed.',
      },
      {
        claim:
          'If the signal is bigger than the error bars, that is a detection.',
        response:
          'Step 11, option four. An amplitude-to-noise ratio ignores the number of points, their distribution in phase, and the number of periods implicitly searched. The instrument never prints such a ratio, deliberately.',
      },
      {
        claim: 'A flat result means there is no planet.',
        response:
          'Step 14. A flat result excludes a region of the mass-period-inclination space that depends on the schedule. Students who write "there is no planet" should be asked what period they are ruling it out at.',
      },
      {
        claim: 'The dashed curve is the data.',
        response:
          'It is labelled on the plot and called out at step 3, and it is still worth switching off in the live panel with a class watching. What remains is what an observer actually has.',
      },
      {
        claim: 'Aliasing is a defect of the instrument or of the simulation.',
        response:
          'It is a property of the sampling, and it applies identically to a perfect instrument. Setting the uncertainty to zero on Schedule B is the demonstration: the points still pile up in two phase bins.',
      },
    ],
    teachingNotes: [
      'Take the step 2 prediction as a show of hands before anyone opens the instrument, and write the tally on the board. Coming back to it after step 8 is the strongest moment in the lesson.',
      'The chi-square readout is introduced in words, not symbols: "how surprising is this much scatter if the velocity never changed". Classes without statistics can work entirely from phase coverage and the comparison of scatter against the error bar, and the numbers still separate cleanly.',
      'Step 5 is the question students most often get wrong for a good reason: they know there is a planet because the lesson told them. Ask what they would have concluded from the twelve numbers alone.',
      'On Schedule B, have someone set the uncertainty to zero. The measurements become perfect and the run still fails, which decouples "noisy" from "uninformative" better than any explanation.',
      'The seed field is worth using deliberately: give different groups different seeds on Schedule B and collect their chi-square values. The spread across groups is itself the argument against reading too much into a single marginal result.',
      'Step 14 is a written answer and takes most of the time in a 20-minute run. If time is short it can be set as the exit ticket instead.',
      'Step 5 has one instructive wrong answer: choosing "a planet orbits this star" rather than "the velocity is not constant". It is the exact overreach the step tests for, and students make it because the lesson has already told them there is a planet. Ask what they would have concluded from the twelve numbers alone.',
      'Step 9 is the arithmetic: 3.52 / 3.5247 = 0.9987 orbits, accepted within 0.06. A student answering near 0.28 has divided the wrong way round.',
      'Step 11 is the hardest question in the lesson and the one most worth reading aloud. The fourth option - "the amplitude is twice the noise, so the detection is significant" - attracts students who have correctly seen the excess and incorrectly turned it into a significance. Both it and the first option deserve a sentence.',
      'Step 14 answers that say "there is no planet" should be handed back with the question "at what period, and above what mass?". Answers that say "we learned nothing" should be told that a nondetection with a stated sensitivity is publishable, and is how upper limits appear in the literature.',
      'If the class has done Finding Planets by Their Tug, connect step 9 back to the period they measured there: the planet was easy to find because the observing was continuous, which no real programme is.',
    ],
    discussion: [
      'Schedule B produced an honest paper reporting nothing conclusive. Was that a mistake, given that the planet was there? What would have had to be different for it not to be?',
      'Telescope time is awarded by committee, months ahead, on the basis of a written plan. What should a committee ask about a proposed cadence?',
      'The first exoplanet surveys found overwhelmingly hot Jupiters on short periods. How much of that is about planetary systems and how much is about schedules?',
      'If you had a thirteenth night to add to Schedule B, when would you use it, and what would you be able to say afterwards that you cannot say now?',
      'Every measurement in this lesson has the same uncertainty. Real ones do not - weather, airmass and exposure time all vary. Does a run with mixed precision help or hurt?',
    ],
    extensions: [
      'Export a Schedule A run and a Schedule B run and hand both files to students without saying which is which. Ask them to decide, from the data alone, whether the star has a planet.',
      'Have students design a twelve-night schedule that would detect a planet with a period near 1.0 days, and explain why an observer at a single site cannot simply observe nightly.',
      'Look up a published radial-velocity nondetection and find its sensitivity curve: the plot of the smallest planet mass excluded as a function of period. Ask which part of that curve is set by the baseline and which by the cadence.',
      'Set the uncertainty to zero and find, by hand, the shortest baseline that still gives full phase coverage for the 3.5247-day planet. Then ask how the answer would change if the period were unknown.',
    ],
    modelNotes: `The star and planet are integrated as a Newtonian two-body system in a plane, and the
      radial velocity the live panel reports is the projection of the star's actual simulated
      velocity onto the line of sight, relative to the system barycenter. The survey-schedule
      instrument at steps 3 to 11 is analytic rather than integrated: it evaluates a circular
      single-planet velocity curve from js/exoplanetObservables.js, which is exact for the
      near-circular orbit of HD 209458 b and would not be for an eccentric one. Real
      radial-velocity curves of eccentric planets are not sinusoids, and the phase-coverage
      argument the lesson makes is unchanged by that but the shape of the curve is not.
      \n\nThe noise is Gaussian, identically distributed, and independent between measurements.
      Real radial-velocity errors are none of the three: they include correlated systematics from
      the instrument and the atmosphere, and stellar jitter from spots and granulation that is
      correlated on the star's rotation period and is often the dominant term for an active star.
      The lesson names underestimated error bars at step 11 as the leading alternative explanation
      for a marginal excess, which is the honest version of this simplification, but a class that
      goes on to real data should be told that jitter is why a 1 m/s spectrograph does not deliver
      1 m/s planet sensitivity.
      \n\nThe schedule itself is idealized in the other direction: measurements arrive exactly on
      time, with no weather, no target visibility window and no lost nights. That makes the two
      schedules cleanly comparable and understates how much worse a real cadence is. Nothing in
      the model prevents a measurement from being scheduled while the target would be below the
      horizon, because the simulation has no horizon.
      \n\nOne numerical caveat is surfaced in the interface rather than hidden here: measurements
      are read by interpolating the simulated velocity between render frames, and at high
      simulation speeds consecutive frames can be an appreciable fraction of an orbit apart. The
      panel detects this and says so, because a straight line drawn across a quarter of a cycle
      flattens the extremes. At the default speed the frames are far finer than the cadence and
      the interpolation is exact to well under a metre per second.`,
    // Keyed to the steps where a student is looking at something: the three
    // explore screens, the two measure screens and the live run. Guidance on
    // the graded questions is in teachingNotes, because an expectation on a
    // pure-question screen is a mistake the tests catch.
    expectations: {
      3: 'Schedule A, seed 1, 8 m/s. The left panel shows twelve points tracing one full sine cycle; the right panel has at least one point in every phase bin. The readout gives phase coverage 10 of 10, scatter about 55.8 m/s against an expected 8, and chi-square per degree of freedom about 48.7. With the uncertainty dragged to zero the points sit exactly on the dashed curve, which is worth doing once with the class.',
      4: 'Coverage 10 of 10, scatter about 55.8 m/s, chi-square per degree of freedom about 48.7. A student reporting coverage below 10 has not loaded the preset; one reporting a chi-square near 1 has left the uncertainty far too high. The field check warns below 5.',
      7: 'Schedule B. The left panel spans 38.7 days and looks almost flat; the folded panel shows all twelve points stacked in two adjacent bins. Coverage drops to 2 of 10 and chi-square per degree of freedom to about 1.9. Moving the cadence to 3.0 or 4.2 restores most of the coverage immediately, which is the cleanest way to show that the failure is the cadence and nothing else.',
      8: 'Coverage 2 of 10, scatter about 11 m/s, chi-square per degree of freedom about 1.9. The scatter being close to the 8 m/s error bar is the whole result. Setting the uncertainty to zero here is worth doing: the run still fails, which separates "noisy" from "uninformative".',
      10: 'The Neptune preset at 8 m/s gives K near 7.3 m/s, full phase coverage and chi-square per degree of freedom near 1.7 - a perfect schedule that still fails. Switching to 1 m/s leaves the planet and the schedule untouched and takes chi-square per degree of freedom to about 22.8.',
      17: 'The instrument opens on HAT-P-7 b: a measured depth of 5,900 ppm, a four-hour transit, six hundred of them, and a depth-over-noise of about 587. The green depth line sits far beyond every noise bar. Dragging the transit count down barely moves the ratio, because at six hundred transits almost the entire remaining budget is the persistent term - the white and within-transit rows are both well under one part per million. This is the floor-limited case, and it is worth naming as such before the ground-based one arrives.',
      19: 'The same planet from three nights on the ground: white noise about 260 ppm, the within-transit term about 1,440, the persistent term 120, and a ratio of about 4. Dragging the transit count to 300 takes it to about 31 - a real factor of eight, not the factor of ten a pure square-root law would give, because part of the budget was already persistent. Keep dragging and it approaches 49 and stops. Both halves matter: more observing does help, and it stops helping, and the ceiling row says where before any nights are spent.',
      22: 'About 587 with Kepler and about 4 from three nights on the ground, a factor of 150 on the same planet. The largest ground-based term is the within-transit bar at about 1,440 ppm after three transits. A student who reports the two ratios the other way round has read the columns backwards; the field check says so.',
      24: 'Pi Mensae c about 10.5, TOI-700 d about 2.7, the Earth twin about 0.6. Two things to draw out. The Earth twin has by far the longest transit - thirteen hours against under two for TOI-700 d - and it is still the least detectable, which cuts against the intuition that a longer transit is an easier one. And two hundred transits take it to about 2.5 against a ceiling of 2.8, so even unlimited TESS observing of this system does not produce a detection: the honest answer, and a more useful one than implying it is a few more sectors away.',
      12: 'The live panel completes Schedule A in about thirteen seconds of wall clock at normal speed, laying down twelve points on the dashed overlay. Untick the overlay and what is left is what an observer has. If a student runs the simulation fast, the panel warns that the frames are too coarse for the cadence and the extremes may be flattened; that warning is real and the answer is to slow down and restart.',
    },
  },

  'keplers-laws': {
    topic: 'Orbital motion',
    difficulty: 'Introductory',
    placement:
      'During the gravity and orbits unit, after students have met the idea of an orbit but before or instead of a lecture derivation of the three laws.',
    overview: `Students recover all three of Kepler's laws by measuring them, in the order Kepler
      found them. They read the shape of an ellipse off a slider, watch equal areas sweep out and
      then time the speeds that make them equal, tabulate four planets and plot the result, and
      finish by using Newton's version of the third law to weigh a star forty light years away.
      The pedagogical aim is that the laws arrive as conclusions from data the student produced,
      not as three statements to memorise. The final section matters more than it looks: it is
      where "Kepler's third law" stops being a curiosity about the Solar System and becomes the
      instrument astronomers actually weigh things with.`,
    priorKnowledge: [
      'That planets orbit the Sun and moons orbit planets',
      'Reading values off a graph, and plotting a point',
      'Squaring and cubing a number on a calculator',
      'No calculus, and no trigonometry beyond the idea of an angle',
    ],
    keyConcepts: [
      {
        heading: 'The first law is about a shape',
        body: `An ellipse is the set of points whose distances to two fixed foci sum to a constant.
          The semi-major axis a is half the long diameter; the eccentricity e places the foci at a
          distance a·e either side of the center. The star sits at one focus and the other focus is
          empty. Worth stressing: Solar System orbits are nearly circular (Earth e = 0.017), so the
          textbook picture of a squashed ellipse is a teaching exaggeration.`,
      },
      {
        heading: 'The second law is angular momentum',
        body: `Equal areas in equal times is conservation of angular momentum in disguise. Gravity
          is a central force, acting along the line joining the two bodies, so it exerts no torque
          about the star and L = m·v·r·sin(θ) cannot change. When r falls, v must rise. This is the
          single most useful reframing in the lesson, and it is what step 12 asks for in writing.`,
      },
      {
        heading: 'The third law, and what Newton added',
        body: `Kepler found P² ∝ a³ empirically. Newton showed the constant is not universal:
          P² = 4π²a³ / G(M + m). In years, AU and solar masses that reduces to a³ = P²(M + m), so
          for the Solar System the constant is 1 only because the Sun is one solar mass. Around
          TRAPPIST-1 it is not 1, and that is precisely what makes the relation a way to measure
          mass rather than a coincidence.`,
      },
    ],
    flow: [
      {
        steps: '1–6',
        text: 'Tycho’s data and Kepler’s problem, then the anatomy of an ellipse with an eccentricity slider. Ends with the empty second focus.',
      },
      {
        steps: '7–12',
        text: 'The second law. Students measure both orbits, watch the equal-area wedges, then measure speed at periapsis and apoapsis and write down why it changes.',
      },
      {
        steps: '13–17',
        text: 'The third law. Four planets are tabulated from the live Solar System, plotted automatically, and the constant is worked out and then used to predict a period.',
      },
      {
        steps: '18–22',
        text: 'Newton’s correction. Students weigh TRAPPIST-1 from one planet’s orbit, then weigh a second star, and identify where Kepler’s version breaks.',
      },
      { steps: '23', text: 'Synthesis.' },
    ],
    features: [
      {
        name: 'Eccentricity slider (step 5)',
        text: 'Drags the foci apart while holding a fixed. Students who move it to 0.9 and back understand the first law faster than any diagram achieves.',
      },
      {
        name: 'Equal-area wedges (step 10)',
        text: 'A slice-count slider redraws the sweep with more or fewer wedges. The point is that the areas stay equal however finely you slice.',
      },
      {
        name: '"Use selected object" (steps 7, 14)',
        text: 'Clicking a body then pressing the import button fills a measurement row from the live simulation. This is the fastest place for a class to get stuck: students often do not notice they must select the object first.',
      },
      {
        name: 'Automatic plot (steps 14–15)',
        text: 'Points land on the graph as rows are filled. The log-log toggle turns the power law into a straight line, which is the moment the third law becomes visible.',
      },
      {
        name: 'Derived fields',
        text: 'Any field marked "worked out for you" is computed from the others. Students cannot lose the astronomy to an arithmetic slip, and the validator gets a number it can trust.',
      },
    ],
    misconceptions: [
      {
        claim: 'Planets move at a constant speed around their orbits.',
        response:
          'Steps 8–11 exist to break this. Have students commit to the prediction at step 8 before running step 9; the measured speed ratio at step 11 then settles it with their own numbers.',
      },
      {
        claim: 'The Sun sits at the center of the ellipse.',
        response:
          'It sits at a focus. On a near-circular orbit the two are almost the same point, which is exactly why this survives so long. The slider at step 5 separates them visibly.',
      },
      {
        claim: 'Something is at the other focus.',
        response:
          'Nothing is. Step 6 asks this directly. The empty focus is a geometric consequence of an inverse-square force, not a place.',
      },
      {
        claim: 'Orbits are strongly elliptical, as textbook figures show.',
        response:
          'Most are nearly circular. Give students Earth’s e = 0.017 and let them set the slider there.',
      },
      {
        claim: 'Kepler’s third law constant is the same everywhere.',
        response:
          'It depends on the mass being orbited, which is the whole content of steps 17–22. A class that misses this cannot use the law to weigh anything.',
      },
    ],
    teachingNotes: [
      'Steps 1–6 move quickly. If time is short this is the section to compress, not the third-law section.',
      'Step 7 is the first import. Demonstrate the click-then-import gesture once for the whole room; it saves ten minutes of individual questions.',
      'Step 12 is the only written answer in the lesson and the one worth grading by hand. Look for "angular momentum is conserved because gravity exerts no torque", not merely "it speeds up because it is closer".',
      'Step 14 accepts up to eight planets but two are enough for the plot and three make the trend convincing. Students who fill all eight will spend fifteen minutes on one screen.',
      'Step 15 shows the intermediate powers. If a student’s P²/a³ is not near 1, the usual cause is a period read in days rather than years.',
      'Step 20 is the payoff. Give the class a moment on it: they have just measured the mass of a star from two numbers, and most will not notice unless it is pointed out.',
    ],
    discussion: [
      'Kepler had Tycho’s data for years before he abandoned circles. What would it take for you to give up an assumption that had worked for two thousand years?',
      'The second focus of an orbit is empty. Does it mean anything physically, or is it purely geometry?',
      'Newton’s version needs the total mass M + m. When is it safe to ignore the planet’s mass, and when is it not?',
      'You weighed TRAPPIST-1 from one planet. What would you need to measure to weigh a star with no planets at all?',
    ],
    extensions: [
      'Have students look up a real transiting planet, find its period and semi-major axis, and weigh its host the same way. Comparing with the published stellar mass is a genuine check.',
      'Ask why the equal-area result implies angular momentum conservation, and where the sin(θ) in L = m·v·r·sin(θ) goes at periapsis and apoapsis.',
      'For students with calculus: derive P² = 4π²a³/GM for a circular orbit by setting gravity equal to the centripetal requirement.',
    ],
    modelNotes: `This investigation uses the Newtonian N-body model directly, and it is the right tool
      for it: the concepts being measured are exactly the ones Newtonian gravity describes. The
      simulation is two-dimensional, so every orbit here is coplanar and inclination never enters.
      Perturbations between planets are present when mutual gravity is on but are far too small over
      a lesson to affect any measurement. Precession from general relativity is not modeled and is
      not needed at this level.`,
    expectations: {
      7: 'The Circular Orbiter comes out at e near 0.02; the Eccentric Orbiter at roughly e = 0.6–0.7. The derived semi-major axis is the mean of the periapsis and apoapsis distances, and the validator warns if the two are entered the wrong way round.',
      11: 'Speed at periapsis should exceed speed at apoapsis by roughly the inverse ratio of the distances. The validator warns if the two are swapped, which is the common error.',
      14: 'Any two or more Solar System planets. P²/a³ should come out near 1 for every row when a is in AU and P in years; the validator flags a spread greater than 50%, which almost always means a period entered in days.',
      15: 'P² ÷ a³ = 1 within reading error. The star in this scenario is exactly one solar mass, so the constant is exactly 1 by construction, and the validator says so.',
      20: 'TRAPPIST-1 comes out at 0.0898 solar masses. The validator accepts within 0.008 and names the published value when a student lands on it.',
    },
  },

  'transit-photometry': {
    topic: 'Exoplanets',
    difficulty: 'Introductory, longest of the set',
    placement:
      'In the exoplanets unit, after stars and stellar radii have been introduced. Works well as a two-session lab.',
    overview: `The full working chain of the transit method, on the first exoplanet ever caught
      crossing its star. Students measure a depth and turn it into a radius, discover that the naive
      answer is too large and correct it for limb darkening, time two transits to get a period and
      then an orbit, read a transmission spectrum, and finish by finding an unresolved companion
      star that had been making the planet look smaller than it is. That last section is the one
      instructors should not skip: it is real observational practice, it is the author’s own
      research area, and it teaches that a measurement is only as good as your knowledge of what
      else is in the aperture.`,
    priorKnowledge: [
      'That stars are distant suns and planets orbit them',
      'Area of a circle, and taking a square root',
      'Reading a graph of one quantity against another',
      'Helpful but not required: the idea of a stellar radius in solar units',
    ],
    keyConcepts: [
      {
        heading: 'Depth is an area ratio',
        body: `A planet blocks the fraction of the stellar disk it covers, so depth = (R_p/R_★)²
          and R_p/R_★ = √depth. Note what this does *not* involve: mass. Depth alone cannot tell
          you whether the object is a gas giant or a brown dwarf.`,
      },
      {
        heading: 'Limb darkening',
        body: `A star is brighter at the center of its disk than at the limb, because looking at
          the center you see deeper and hotter layers. A planet crossing the middle therefore blocks
          more than its share of the light and the dip is deeper than the area ratio alone predicts.
          Taking √depth without correcting overestimates the planet by several percent.`,
      },
      {
        heading: 'Transit probability',
        body: `A transit is only visible from directions within roughly R_★/a of the orbital plane,
          so the geometric probability is about R_★/a. For the Earth around the Sun that is about
          1 in 215. Transit surveys are therefore heavily biased toward short-period planets, which
          is the substance of the written answer at step 15.`,
      },
      {
        heading: 'Transmission spectroscopy',
        body: `An atmosphere is opaque at some wavelengths and transparent at others, so the planet
          presents a larger silhouette in an absorption band. Measuring depth as a function of color
          gives the composition. The effect is tiny, of order one part in ten thousand of the stellar
          flux, which is worth stating so students appreciate the instrumentation.`,
      },
      {
        heading: 'Dilution by an unresolved companion',
        body: `If a second star falls inside the photometric aperture, its light fills in the dip and
          the measured depth is shallower by a factor 1/(1 + f), where f is the companion’s flux
          ratio. The recovered radius is then too small by √(1 + f). Correcting this is why
          high-resolution imaging surveys of planet hosts exist.`,
      },
    ],
    flow: [
      {
        steps: '1–5',
        text: 'Why planets are found indirectly, the five main methods, and a first transit watched live on HD 209458.',
      },
      {
        steps: '6–10',
        text: 'Depth to radius. Students explore the depth–size relation, measure the real dip, discover the naive radius is too big, and correct it for limb darkening.',
      },
      {
        steps: '11–15',
        text: 'The shape of the dip, viewing geometry and transit probability, ending in a written answer about survey bias.',
      },
      {
        steps: '16–19',
        text: 'Timing. Two transits give a period; the period gives the orbit and an equilibrium temperature.',
      },
      {
        steps: '20–22',
        text: 'Transmission spectroscopy: the planet changes size with color.',
      },
      {
        steps: '23–28',
        text: 'False positives and dilution. A hidden companion is found, imaged, and corrected for, recovering the true planet radius.',
      },
      { steps: '29', text: 'Synthesis.' },
    ],
    features: [
      {
        name: 'Light curve panel',
        text: 'Opens automatically on the steps that need it. It records continuously and detects complete transits on its own; students do not have to catch one by hand.',
      },
      {
        name: 'Observer handle',
        text: 'Dragged on the simulation, or set with the angle slider. Because the simulation is two-dimensional every orbit is edge-on, so the angle changes which side you watch from, not whether a transit happens. Step 13 handles inclination in a dedicated panel instead.',
      },
      {
        name: 'Instrument panels',
        text: 'Five: depth–size, geometry, spectrum, dilution and resolve. The last two are ports of the author’s own research tools.',
      },
      {
        name: '"Use the measurement" buttons',
        text: 'Copy the detected depth, baseline and transit times straight into the measurement fields. Timing a fast transit by hand is not how the measurement is really made either.',
      },
    ],
    misconceptions: [
      {
        claim: 'A deeper transit means a more massive planet.',
        response:
          'Depth gives radius, not mass. A puffy hot Jupiter and a dense brown dwarf of forty times the mass can produce the same dip. Mass needs radial velocities.',
      },
      {
        claim: 'We see the planet in a transit.',
        response:
          'We see a change in the total light of the star. The planet is never resolved; everything is inferred from a number that drops by a percent.',
      },
      {
        claim:
          'Most stars must have transiting planets, since we have found so many.',
        response:
          'Only a small geometric fraction transit. Surveys observe hundreds of thousands of stars to find thousands of planets, and step 14 gets students to that number themselves.',
      },
      {
        claim: 'The bottom of a transit is flat.',
        response:
          'It is curved, because of limb darkening. Step 12 asks students to read the floor, and the curvature is the evidence that the star is not a uniform disk.',
      },
      {
        claim: 'A dip in brightness means a planet.',
        response:
          'Eclipsing binaries, background blends and stellar activity all produce dips. Steps 23–28 exist because a real survey spends much of its effort ruling these out.',
      },
    ],
    teachingNotes: [
      'This is the longest investigation in the library. Splitting at step 15 gives two clean sessions of roughly equal length.',
      'Step 8 needs a complete transit in the recording before the copy button has anything to offer. If a student presses it too early, tell them to let the simulation run one more dip.',
      'Step 10 is where students see that their first answer was wrong and why. Do not let them skip past it: "my first measurement was biased and here is the correction" is the most transferable thing in the lesson.',
      'Step 15 is a written answer and the best assessment item in the investigation. Two distinct biases are wanted, geometric and detection.',
      'Step 17 depends on the transit counter. Students who lose count should use the transit number the panel reports rather than counting dips by eye.',
      'Steps 24–26 change scenario to the blended binary. If a student’s numbers suddenly stop matching, check they have not stepped backward into the unblended system.',
    ],
    discussion: [
      'The transit method finds planets that happen to be lined up with us. What does the population of known planets look like as a result, and how would you correct for it?',
      'You measured a radius but not a mass. What else would you need to know whether this planet is rock or gas?',
      'A dip could be a planet, a small star or a background eclipsing binary. What observation would you make to tell them apart?',
      'Why is a transit around a small, cool star easier to detect than the same planet around a Sun-like star?',
    ],
    extensions: [
      'Pull a real light curve from the NASA Exoplanet Archive or a TESS quick-look product and measure a depth from it. The workflow is identical.',
      'Have students estimate how many stars a survey must watch to find one Earth analogue, using their transit-probability answer from step 14.',
      'Ask advanced students to derive the transit duration for a central transit and compare it with the durations the panel reports.',
    ],
    modelNotes: `Orbits are Newtonian and two-dimensional, which for a transit lesson is a feature
      rather than a limitation: every orbit is edge-on and every planet transits, so the light curve
      is always available. Inclination is therefore handled in a dedicated geometry panel rather than
      by the simulation. The light curve itself is an analytic model, not a radiative-transfer
      calculation: it uses a quadratic limb-darkening law with fixed coefficients, and treats the
      planet as an opaque disk. The transmission spectrum is illustrative. See ${MODEL_PAGE} for the
      full description.`,
    expectations: {
      8: 'Baseline near 1.000; depth about 1.8%. The naive radius ratio is then about 0.135, which is roughly ten percent larger than the true value, and the lesson goes on to explain why.',
      10: 'With the limb-darkening correction and a stellar radius of 1.155 solar radii, the recovered planet radius lands near 1.38 Jupiter radii, the published value for HD 209458 b.',
      17: 'Two successive transits are about 3.52 days apart. Students who miss a transit will get a multiple of that; the validator catches the doubled value and says so.',
      18: 'A 3.52-day period around a 1.148 solar mass star gives a semi-major axis near 0.047 AU and an equilibrium temperature of order 1400 K.',
      27: 'The blended depth is shallower than the clean one. Correcting for a companion half a magnitude fainter recovers a planet radius consistent with the unblended measurement.',
    },
  },

  'orbital-energy': {
    topic: 'Gravity and orbital energy',
    difficulty: 'Introductory, no calculus',
    placement:
      'After gravity has been introduced and before or alongside the discussion of escape velocity. Pairs naturally with a lecture on energy conservation.',
    overview: `Students fire a projectile from a tower at increasing speeds and find, by experiment,
      the line between coming back and leaving forever. The lesson then reframes what they found:
      it was never really about speed, it was about the sign of the total energy. The last third
      applies this to a real object, the interstellar visitor 1I/'Oumuamua, and asks students to
      decide from its measured energy whether it will return. The design deliberately delays the
      formula until after the experiment, and the escape-speed misconception at step 14 is the
      single most valuable screen in the investigation.`,
    priorKnowledge: [
      'That gravity pulls, and weakens with distance',
      'The idea of kinetic and potential energy, at least qualitatively',
      'Positive and negative numbers, and what a sign means',
      'No calculus required',
    ],
    keyConcepts: [
      {
        heading: 'Total energy decides everything',
        body: `E = ½mv² − GMm/r. If E < 0 the object is bound and cannot reach infinity; if E ≥ 0 it
          escapes. This one number, and specifically its sign, settles the question that speed alone
          cannot, because the answer depends on where you started as well as how fast you are going.`,
      },
      {
        heading: 'Escape speed is local',
        body: `v_esc = √(2GM/r) depends on r, so there is no single "escape velocity" for a body,
          only an escape speed at a given distance. Earth’s surface value is 11.2 km/s; from the
          top of a tall orbit it is much less. Students who learn escape velocity as one number for
          each planet have learned something that will mislead them.`,
      },
      {
        heading: 'Escaping does not switch gravity off',
        body: `An unbound object is decelerating the entire time it recedes. It never stops being
          pulled; it simply has enough energy that the pull can never bring it to rest. This is the
          misconception at step 14 and it is extremely common.`,
      },
      {
        heading: 'Energy and orbit shape',
        body: `E < 0 gives an ellipse, E = 0 a parabola, E > 0 a hyperbola. The three shapes at
          step 19 are the same physics as the sign of the number, drawn.`,
      },
    ],
    flow: [
      {
        steps: '1–7',
        text: 'The cannonball experiment. Students predict, fire at low and high speed, hunt for the dividing line, and identify what happens at it.',
      },
      {
        steps: '8–12',
        text: 'The reframing. Energy bars are introduced, the sign of the total is read, and students confirm it stays constant around a real orbit.',
      },
      {
        steps: '13–14',
        text: 'Escape speed, and the misconception that gravity stops.',
      },
      {
        steps: '15–19',
        text: 'What changes escape speed: mass, then starting distance. Ends with the three orbit shapes.',
      },
      {
        steps: '20–23',
        text: 'ʻOumuamua. Students check its energy themselves and decide in writing whether it will return.',
      },
    ],
    features: [
      {
        name: 'Launch panel (steps 3–9)',
        text: 'A speed slider and a fire button. The projectile is launched from a tower 320 km up, because a launch from the ground travels only a few degrees before hitting the surface and shows no arc at all.',
      },
      {
        name: 'Energy bars',
        text: 'Kinetic, potential and total, with the zero line marked. On the launch panel the numbers are deliberately not shown: the sign is the lesson, and simulation-unit energies labeled in joules would be worse than no number.',
      },
      {
        name: 'Escape comparison (steps 16–17)',
        text: 'Switches between bodies of different mass and between starting distances, so the two dependencies are separated.',
      },
      {
        name: 'Live energy panel (step 11)',
        text: 'Reads the running simulation rather than a model, so students see the total holding steady while kinetic and potential trade off.',
      },
    ],
    misconceptions: [
      {
        claim: 'Once something escapes, gravity stops acting on it.',
        response:
          'Step 14 targets this directly. Gravity acts forever; the object simply outruns it. Ask students what force is acting on ʻOumuamua right now.',
      },
      {
        claim: 'Escape velocity is a single number for a planet.',
        response:
          'It is a value at a distance. Steps 17–18 make students find that starting further out lowers it.',
      },
      {
        claim: 'You need to keep pushing to keep escaping.',
        response:
          'No thrust is involved anywhere in this lesson. A single impulse either was or was not enough, and nothing afterwards changes the answer.',
      },
      {
        claim:
          'Something in orbit is weightless because there is no gravity there.',
        response:
          'Gravity is what holds the orbit. This one does not appear in the lesson but reliably comes up in discussion; it is worth having the answer ready.',
      },
      {
        claim:
          'A hyperbolic orbit means the object was fired outward very hard.',
        response:
          'It means E > 0, which can happen at modest speed if you start far enough out. The shapes panel at step 19 separates the shape from the speed.',
      },
    ],
    teachingNotes: [
      'Insist on the predictions at steps 2 and 4 before anything is fired. Students who watch first remember having known the answer all along, and the lesson loses its point.',
      'Step 6 is the discovery moment. Give it time; students should be allowed to bracket the dividing line themselves rather than being told the number.',
      'Step 12 asks what stays put as the object moves. If a class struggles, pause the simulation at two very different points and compare the three bars.',
      'Step 14 is worth doing aloud as a class. It is the misconception most likely to survive the lesson if it is only read silently.',
      'Steps 20–22 change scenario to ʻOumuamua. The measured total energy is positive and that is the whole answer; students should quote the sign, not a speed.',
    ],
    discussion: [
      'If you throw a ball upward it comes back. If you throw it hard enough it does not. Is there a speed at which it hovers?',
      'Voyager 1 is leaving the Solar System. Is the Sun still pulling on it? What is happening to its speed?',
      'ʻOumuamua came from another star. What does its energy tell you about where it has been and where it is going?',
      'Why is it easier to launch a probe out of the Solar System from Earth orbit than from the Earth’s surface?',
    ],
    extensions: [
      'Compute escape speed from the surface of the Moon, Mars and Jupiter and compare with the values the panel gives.',
      'Ask why a gravitational slingshot can raise a spacecraft’s energy without any fuel, and where that energy comes from.',
      'Have students look up 2I/Borisov and compare its eccentricity with ʻOumuamua’s.',
    ],
    modelNotes: `Newtonian energy throughout, in two dimensions. The launch panel integrates its own
      trajectory with an adaptive step so that a highly eccentric path does not drift, and the energy
      it reports is conserved to a few thousandths of a percent of the well depth. The ʻOumuamua
      scenario uses the object’s measured orbit; the simulation reproduces its hyperbolic path but
      does not model the non-gravitational acceleration seen in the real object.`,
    expectations: {
      3: 'A low launch speed gives a suborbital arc that returns to the surface. Total energy is clearly negative.',
      5: 'A high launch speed gives a path that leaves and does not return. Total energy is at or above zero.',
      6: 'The dividing line is where the total energy bar reaches zero. Students should be able to bracket it within a small range of the slider.',
      9: 'The kinetic and potential bars change continuously; the total does not. This is the observation the next question depends on.',
      21: 'ʻOumuamua’s total energy is positive. The eccentricity is above 1 and the path is hyperbolic.',
    },
  },

  'weighing-stars': {
    topic: 'Stars and binary systems',
    difficulty: 'Introductory, written for non-science majors',
    placement:
      'In the stars unit, after Kepler’s laws. Assumes the third law has been met but re-teaches what it needs.',
    overview: `How astronomers know what stars weigh. Students watch a binary pair, discover that both
      stars move, find the balance point, learn that the heavier star sits closer to it, and then
      combine an orbit size with a period to weigh a pair whose masses are hidden from them. They
      finish by splitting that total between the two stars and checking the method against Sirius,
      using the real observations. The lesson is written for students who are uncomfortable with
      algebra: every number is chosen so the arithmetic lands on whole numbers, and every symbol
      arrives only after the thing it stands for has been seen.`,
    priorKnowledge: [
      'That stars orbit each other in pairs',
      'Multiplying and dividing on a calculator',
      'Kepler’s third law is helpful but is re-taught in the lesson',
      'No algebra beyond substituting numbers into a stated relation',
    ],
    keyConcepts: [
      {
        heading: 'Both stars move',
        body: `Neither star orbits the other. Both orbit the barycenter, the balance point of the
          pair, which is why the two are always on opposite sides of it. The Sun does this too, in
          response to Jupiter; it is not a special property of equal-mass binaries.`,
      },
      {
        heading: 'The barycenter locates the mass ratio',
        body: `M_A·r_A = M_B·r_B, exactly as for a see-saw. The heavier star sits closer in and
          traces the smaller circle. Measuring the two distances therefore gives the ratio of the
          masses without knowing either one.`,
      },
      {
        heading: 'Size and period give the total',
        body: `In AU, years and solar masses, a³ = P²(M_A + M_B) with no constants to carry. The a in
          that relation is the semi-major axis of the *relative* orbit, the star-to-star separation,
          not one star’s distance from the barycenter. This is the single most common error in
          the topic and the lesson flags it explicitly.`,
      },
      {
        heading: 'Ratio plus total gives both masses',
        body: `The total comes from the orbit; the ratio comes from the balance point; together they
          determine each mass separately. This is how essentially every stellar mass in the
          literature was originally measured.`,
      },
    ],
    flow: [
      {
        steps: '1–7',
        text: 'Both stars move, and there is a fixed point between them. Ends with the barycenter of an equal-mass pair.',
      },
      {
        steps: '8–14',
        text: 'Unequal masses. The balance point shifts toward the heavier star; the see-saw makes the mass ratio visible and then quantitative.',
      },
      {
        steps: '15–19',
        text: 'Kepler’s third law and Newton’s correction, then a side-by-side comparison showing that the heavier pair orbits faster at the same separation.',
      },
      {
        steps: '20–26',
        text: 'The central measurement. Students practise on a known pair, then measure a mystery binary’s separation and period with a stopwatch and weigh it.',
      },
      {
        steps: '27–30',
        text: 'Splitting the total between the two stars using the balance point, and the reveal.',
      },
      {
        steps: '31–35',
        text: 'Sirius, measured from real observations, then a star with a planet, then one worked independently.',
      },
    ],
    features: [
      {
        name: 'Binary panel',
        text: 'Appears in several modes: plain, with the barycenter marked, with mass sliders, with AU rings for reading distances, with a stopwatch, and as a star-plus-planet with a magnified inset.',
      },
      {
        name: 'Stopwatch (steps 24–25)',
        text: 'Mark and Stop time one lap. The orbits are computed analytically rather than integrated, so a lap reads exactly 4.00 years and the arithmetic on the following screen lands cleanly.',
      },
      {
        name: 'AU rings (step 23)',
        text: 'Concentric rings at whole astronomical units, so a separation is read off rather than estimated. Students are told not to judge distances from pixels and this is how that promise is kept.',
      },
      {
        name: 'See-saw panel (steps 11–12, 29)',
        text: 'Turns the mass ratio into a picture, and on the weighing step into countable mass blocks.',
      },
      {
        name: 'Sirius panel (step 31)',
        text: 'Plots real observations five years apart; sliding from 1900 to 2000 draws the orbit. Its 50.1-year period and 19.8 AU orbit give 3.09 solar masses against the accepted 3.06.',
      },
    ],
    misconceptions: [
      {
        claim: 'The smaller star orbits the bigger one, which stays still.',
        response:
          'Steps 3–5 are built to break this. Every diagram students have seen nails the Sun to the center of the page.',
      },
      {
        claim: 'The barycenter is always midway between the two stars.',
        response:
          'Only for equal masses. Step 8 asks for the prediction before the sliders move.',
      },
      {
        claim: 'The heavier star moves faster because it has more force on it.',
        response:
          'It moves more slowly, on a smaller circle, in the same period. The forces on the two are equal and opposite.',
      },
      {
        claim: 'a is one star’s distance from the barycenter.',
        response:
          'It is the full star-to-star separation. This is the error most likely to produce a wrong mass, and the validator at step 25 catches it with its own message.',
      },
      {
        claim: 'You need to know a star’s brightness or size to get its mass.',
        response:
          'You need an orbit. Brightness–mass relations exist but they are calibrated against binaries measured exactly this way.',
      },
    ],
    teachingNotes: [
      'The lesson is deliberately gentle. A class comfortable with algebra can move through steps 1–14 quickly, but do not skip step 8: the prediction is what makes the balance-point rule stick.',
      'Steps 23–25 are the heart of the lesson. Budget time for them. The stopwatch needs one full lap and students often stop it early.',
      'At step 25 the intended answer is a = 4 AU, P = 4 years, giving 4 solar masses. A student who uses one star’s ring distance instead of the separation gets 0.5 and the validator says specifically what went wrong.',
      'Step 29 splits 4 into 3 and 1. Students who get the ratio right but the sum wrong, or vice versa, get different feedback; both are worth a moment at the board.',
      'Step 31 is real data. Point out that the residual difference from the accepted value is measurement error in a century-old observation, not a flaw in the method.',
    ],
    discussion: [
      'About half the stars you can see have a companion. Why does that make binaries such a useful population for astronomy?',
      'The Sun wobbles because of Jupiter. If an alien astronomer watched the Sun for fifty years, what could they work out?',
      'You measured a total mass and a ratio. Which of the two is easier to measure for a real binary, and why?',
      'What would you need to observe to weigh a star that has no companion at all?',
    ],
    extensions: [
      'Look up Alpha Centauri A and B, find the published separation and period, and weigh the pair.',
      'Ask why the mass–luminosity relation is useful and what it had to be calibrated against.',
      'For students ready for it: why does the relative orbit have a semi-major axis equal to the sum of the two individual orbits?',
    ],
    modelNotes: `The binary panels are analytic rather than integrated: circular two-body orbits
      evaluated in closed form. That is deliberate. The stopwatch must read exactly 4.00 years for
      the arithmetic on the next screen to work, and an integrator that lost a percent per lap would
      quietly break the measurement the whole lesson builds toward. The Sirius panel solves Kepler’s
      equation so the plotted epochs are correctly spaced in time. The main simulation behind the
      lesson is the usual Newtonian N-body model in two dimensions.`,
    expectations: {
      20: 'Practice pair: a = 2 AU, P = 2 years, giving a total of 2 solar masses.',
      23: 'The mystery pair is 4 AU apart, read from the AU rings. Star A sits on the 1 AU ring, Star B on the 3 AU ring.',
      24: 'One lap takes 4.00 years on the stopwatch.',
      25: 'a³ = 64, P² = 16, so the total is 4 solar masses. A student who uses one star’s barycenter distance instead of the separation gets 0.5 and is told so.',
      29: 'The 3:1 distance ratio splits 4 solar masses into 3 and 1. Star A, on the smaller circle, is the heavier one.',
      33: 'The independent pair is a = 3 AU, P = 3 years, giving 3 solar masses.',
    },
  },

  'black-holes': {
    topic: 'Black holes and compact objects',
    difficulty: 'Introductory, written for non-science majors',
    placement:
      'In the stellar-remnants or galaxies unit. Needs no earlier investigation, though the escape-speed section lands better after Bound, Unbound and Escape.',
    overview: `Students change one property of a black hole, its mass, and discover how four unrelated
      properties respond: horizon size, average density, Hawking temperature and evaporation lifetime.
      Two of the four go the opposite way to almost everyone’s expectation, and the lesson is built
      so that students commit to a prediction before each one. The escape-speed section is handled
      carefully on purpose: the Newtonian argument gives the right radius for the wrong reason, and
      saying so is part of the lesson rather than a footnote.`,
    priorKnowledge: [
      'That stars can collapse at the end of their lives',
      'Reading a straight-line graph',
      'Nothing else. Powers of ten are taught in the lesson as "counting zeros"',
    ],
    keyConcepts: [
      {
        heading: 'The event horizon is a boundary, not a surface',
        body: `R_s = 2GM/c² marks where signals can no longer reach the outside universe. There is
          nothing there to touch, and an astronaut crossing the horizon of a large black hole would
          notice nothing at that moment. Roughly 3 km of radius per solar mass.`,
      },
      {
        heading: 'Radius is proportional to mass',
        body: `R_s ∝ M, a straight line through the origin. Double the mass and the horizon radius
          doubles. This is the only one of the four relations that behaves the way students expect.`,
      },
      {
        heading: 'Average density falls with mass',
        body: `Mass divided by the volume of a sphere of radius R_s goes as 1/M². Radius grows in
          step with mass, so volume grows three times as fast in powers of ten, and the density loses
          the difference. A 10 M☉ hole is at roughly nuclear density; one of 1.4×10⁸ M☉ is less dense
          than water. Be careful with wording: this is a comparison quantity, not a claim about the
          interior.`,
      },
      {
        heading: 'Temperature falls, lifetime rises',
        body: `T_H ∝ 1/M and evaporation lifetime ∝ M³. A one-solar-mass black hole is at 6×10⁻⁸ K
          and lasts about 10⁶⁷ years. Every astrophysical black hole is far colder than the cosmic
          microwave background, so all of them are currently absorbing more than they emit and none
          is evaporating yet.`,
      },
      {
        heading: 'Mass classes',
        body: `Stellar-mass, a few to tens of solar masses; intermediate, hundreds to hundreds of
          thousands; supermassive, millions to billions. The boundaries are conventions, not physics.`,
      },
    ],
    flow: [
      {
        steps: '1–4',
        text: 'What a black hole is not, what "size" could mean, and the event horizon at a fixed scale against familiar lengths.',
      },
      {
        steps: '5–9',
        text: 'The mass experiment. Students record three trials, watch the points land on a straight line through the origin, and only then meet R_s ∝ M.',
      },
      {
        steps: '10–13',
        text: 'Squeezing the Sun until the escape speed reaches c, followed by the careful statement that this is the right answer for the wrong reason.',
      },
      {
        steps: '14–17',
        text: 'The density surprise: prediction, ladder, then the zero-counting explanation.',
      },
      {
        steps: '18–21',
        text: 'Hawking temperature, introduced cautiously, with a logarithmic thermometer.',
      },
      {
        steps: '22–24',
        text: 'Evaporation lifetime on a bar chart that counts zeros rather than years.',
      },
      {
        steps: '25–29',
        text: 'Mass classes, a four-object lineup at clearly labeled separate scales, and the reveal that the mystery object is Sagittarius A*.',
      },
    ],
    features: [
      {
        name: 'Horizon panel (steps 3–4)',
        text: 'Holds the pixels-per-kilometre fixed across the whole slider range, so a bigger picture really is a bigger black hole. Auto-fitting would keep the disk the same size and hide the point.',
      },
      {
        name: 'Trial recorder (steps 6–8)',
        text: 'Record and Clear buttons build a table and plot it. Trials persist across steps 6–8 and are cleared on arrival from elsewhere.',
      },
      {
        name: 'Squeeze panel (steps 11–12)',
        text: 'Compresses one solar mass from the Sun’s radius to 2.95 km with a gauge marked at the speed of light. Presets jump to each size.',
      },
      {
        name: 'Ladders and thermometer',
        text: 'Density and temperature use logarithmic scales with familiar benchmarks marked. Each says on the panel that every small tick is a factor of ten.',
      },
      {
        name: 'Lineup (steps 25–29)',
        text: 'Four black holes, each drawn at its own scale with its own scale bar and a comparison object. They cannot share one scale: the largest is half a million times wider than the smallest.',
      },
    ],
    misconceptions: [
      {
        claim: 'Black holes suck in everything nearby.',
        response:
          'Step 1 opens with four objects in stable orbits precisely to kill this. Gravity far from a black hole is the same gravity as anywhere else; swap the Sun for a black hole of equal mass and Earth’s orbit is unchanged.',
      },
      {
        claim: 'The event horizon is a solid surface.',
        response:
          'It is a causal boundary. Step 13 asks this directly. Nothing is there to hit.',
      },
      {
        claim: 'Bigger black holes must be denser.',
        response:
          'Average density on this measure goes as 1/M². Step 14 collects the prediction before the ladder is shown, and most students predict wrongly, which is the point.',
      },
      {
        claim: 'Bigger black holes are hotter.',
        response:
          'T ∝ 1/M. The largest black holes are the coldest objects in the universe. Step 18 takes the prediction first.',
      },
      {
        claim: 'A black hole is a hole in space.',
        response:
          'It is mass in a small volume. The word "hole" does a lot of damage here.',
      },
      {
        claim: 'Black holes are evaporating away now.',
        response:
          'All known black holes are colder than the microwave background around them, so they are absorbing more than they radiate. Evaporation cannot begin until the universe is far colder.',
      },
    ],
    teachingNotes: [
      'Steps 5, 10, 14, 18 and 22 are predictions. The lesson is built on them; a class that clicks through them without committing loses most of the value.',
      'Step 6 asks for three trials at 5, 10 and 20 solar masses. Students who record only one cannot answer step 8, and the panel says so if the graph is empty.',
      'Step 13 is the most important screen scientifically. The Newtonian escape-speed argument gives the correct radius by coincidence; the real reason is the geometry of spacetime. Do not let a class leave believing light is a ball thrown too slowly.',
      'Step 17 is the only numeric answer in the lesson. The panel shows the arithmetic 3 + 3 + 3 = 9 directly; students who type 3 are reading the mass row rather than the volume row.',
      'The lineup at steps 25–29 changes scale between panels. Point at the scale bar explicitly; it is the one place students could be misled about size.',
      'The object inspector is left unlocked in this lesson. Clicking the black hole shows the same numbers the lesson quotes, computed by the simulation, which is worth demonstrating once.',
    ],
    discussion: [
      'If the Sun were replaced by a black hole of the same mass, what would change for the Earth?',
      'A supermassive black hole can be less dense than water. Does that make it less dangerous to approach?',
      'Hawking radiation has never been observed. What would it take to detect it, and why is that so hard?',
      'The boundaries between stellar, intermediate and supermassive are conventions. Is there any physical reason for a gap between the classes?',
    ],
    extensions: [
      'Work out the mass a black hole would need for its average density to equal that of air, and compare with the largest known black holes.',
      'Look up the Event Horizon Telescope images of M87* and Sagittarius A* and compare the apparent sizes with the horizon radii from the lesson.',
      'Ask why a Kerr black hole differs from the Schwarzschild case used here, and which of the lesson’s trends survive.',
    ],
    modelNotes: `Nothing in this investigation is dynamically simulated relativity. The black hole in
      the scenario participates in the ordinary Newtonian N-body simulation like any other mass; the
      horizon radius, average density, Hawking temperature and evaporation lifetime are analytic
      Schwarzschild expressions evaluated for display. Every result assumes a non-rotating, uncharged
      black hole, which the lesson states. Real astrophysical black holes rotate, which changes the
      horizon geometry but none of the trends taught here. See ${MODEL_PAGE} for the full statement.`,
    expectations: {
      6: 'Three trials at 5, 10 and 20 solar masses give 14.8, 29.5 and 59.1 km. The points fall on a straight line through the origin.',
      11: 'Squeezing one solar mass: the Sun today gives 0.2% of light speed, Earth-sized 2.2%, 30 km gives 31%, 6 km gives 70%, and 2.95 km gives exactly 100%.',
      15: 'The density marker moves down the ladder as mass rises. At 10 solar masses it sits near nuclear density; at a million it is ten powers of ten lower.',
      20: 'The thermometer level falls with mass. Sagittarius A* comes out at 1.4×10⁻¹⁴ K, far below the coldest temperature ever produced in a laboratory.',
      23: 'The lifetime bar for a 10 solar mass hole reaches 70 zeros against the universe’s 10.',
    },
  },

  'radial-velocity': {
    topic: 'Exoplanet detection and characterization',
    difficulty: 'Introductory, written for non-science majors',
    placement:
      'The third of the three exoplanet lessons, after Finding Planets by Their Shadows and before or after The Goldilocks Question. It closes the inference chain: Shadows measures a radius, this one measures a mass and combines the two into a density, and Goldilocks asks what that buys. It works standalone, but the payoff at steps 30-33 lands hardest for students who have done the transit lesson.',
    overview: `Students discover that a star and its planet both orbit their common center of
      mass, that the star's share of that motion is measurable through the Doppler shift of
      its spectral lines, and that the size of the wobble gives the planet's mass. They then
      meet the central limitation of the method, the M sin i degeneracy, and see why a
      transiting planet escapes it. Astrometry is introduced as the complementary method
      that works precisely where radial velocity fails. The lesson closes by combining the
      transit radius with the radial-velocity mass into a bulk density, placing the planet
      against the modeled habitable zone, and asking students to judge three candidate
      planets on evidence no single column can supply.`,
    priorKnowledge: [
      'That planets orbit stars, and that gravity acts between any two masses',
      'That light can be spread into a spectrum (the lesson explains absorption lines from scratch)',
      'Helpful but not required: Finding Planets by Their Shadows, for the transit radius reused at step 30',
      'Helpful but not required: Weighing the Stars, for the center-of-mass rule reused at step 4',
    ],
    keyConcepts: [
      {
        heading: 'Stellar reflex motion',
        body: 'A star and its planet orbit their common center of mass. Each body’s distance from that point is set by the other body’s share of the total mass, so a star a thousand times heavier than its planet traces an orbit a thousand times smaller. The star moves; it moves very little.',
      },
      {
        heading: 'Radial velocity and the Doppler shift',
        body: 'Only the component of the star’s velocity along the line of sight produces a Doppler shift. Absorption lines move to longer wavelengths as the star recedes (positive radial velocity) and shorter as it approaches (negative). Motion across the sky produces no shift at all.',
      },
      {
        heading: 'The semi-amplitude K',
        body: 'K is half the peak-to-peak range of the radial-velocity curve, not the whole range. It grows with planet mass and shrinks as the orbit is tilted away from edge-on. Confusing K with the full amplitude is the commonest factor-of-two error in the subject.',
      },
      {
        heading: 'The M sin i degeneracy',
        body: 'Radial velocity cannot separate planet mass from orbital inclination. What it reports is a minimum mass. A transit fixes the inclination near 90 degrees, which is what converts that lower limit into a measurement.',
      },
      {
        heading: 'Astrometry and complementarity',
        body: 'Astrometry measures the star’s position on the sky rather than its velocity toward us. The astrometric orbit does not shrink as a system tilts toward face-on; it changes shape from a line to a circle. Radial velocity dies face-on, astrometry does not, and that is why the two are described as complementary.',
      },
      {
        heading: 'Bulk density and its limits',
        body: 'Mass and radius together give a mean density, the first real constraint on composition. It constrains rather than determines: rock under a hydrogen envelope and a water-rich world can produce similar densities.',
      },
    ],
    flow: [
      {
        steps: '1-6',
        text: 'The planet from the transit lesson returns, with the history that it was found by its star’s wobble first. Students predict which body moves, then use the reflex-motion instrument to see both orbiting the barycenter and to discover that more planet mass means a bigger stellar orbit.',
      },
      {
        steps: '7-9',
        text: 'Absorption lines and the Doppler shift are introduced from scratch, with the restriction that only line-of-sight motion produces a shift. The rv-observer instrument connects the star’s position on its orbit to the curve that motion produces.',
      },
      {
        steps: '10-14',
        text: 'Students open the live Radial Velocity panel on the Exoplanet Characterization Lab scenario, watch a real curve build over two orbits, measure the period, and learn the definition of K before reading it off the panel.',
      },
      {
        steps: '15-17',
        text: 'A controlled experiment: hold everything fixed and change only planet mass. Students discover the linear relationship, then use it in reverse to weigh HD 209458 b from the K they measured.',
      },
      {
        steps: '18-21',
        text: 'The inclination problem. The same planet is tilted and the reported mass falls away as sin i. M sin i is named, and students reason out why a transiting planet escapes the ambiguity.',
      },
      {
        steps: '22-29',
        text: 'Astrometry as the complementary method. Students tilt a system from edge-on to face-on and watch the sky path open from a line into a circle while the radial-velocity signal dies, then explore how distance and orbit size govern detectability.',
      },
      {
        steps: '30-33',
        text: 'The payoff. Transit radius and radial-velocity mass are combined into a bulk density, and the characterization panel adds stellar flux and habitable-zone context from the same habitability module The Goldilocks Question uses.',
      },
      {
        steps: '34-37',
        text: 'Three candidate planets, designed so that no single measurement identifies the best one. A short-answer step asks what is still unknown, and the lesson closes on the idea that combination, not any one technique, is what characterization consists of.',
      },
    ],
    features: [
      {
        name: 'Exoplanet Characterization Lab scenario (steps 1, 3, 10, 14)',
        text: 'HD 209458 with the star free to move. The transit scenarios pin their star so the light curve stays centered; this one initializes both bodies in the center-of-mass frame with zero net momentum, so the wobble the instruments measure is the wobble the simulation is doing. The star circles a point 2.7e-5 AU away at 84 m/s.',
      },
      {
        name: 'Radial Velocity panel (steps 10-14)',
        text: 'A live instrument in the Tools list. It projects the observed star’s actual simulated velocity onto the shared line of sight and plots it against time, reporting K once a full cycle is recorded. Velocities are relative to the system barycenter so the curve sits around zero.',
      },
      {
        name: 'Astrometry panel (available from Tools)',
        text: 'Plots the star’s path on the sky about the barycenter, with the physical reflex orbit in AU and the angle it subtends shown separately. Not used by a lesson step, but worth demonstrating alongside step 24.',
      },
      {
        name: 'Shared observer control',
        text: 'Position angle and inclination live in one module and every observing panel mounts the same control. Changing inclination in one panel changes it everywhere, which is what makes the step-24 comparison honest.',
      },
      {
        name: 'reflex-motion instrument (steps 4, 6)',
        text: 'Star, planet and barycenter with the stellar orbit magnified by a labeled factor. The magnification is cosmetic and stated on the picture; the reported numbers are physical.',
      },
      {
        name: 'rv-observer instrument (step 9)',
        text: 'Orbit on the left with a line-of-sight arrow, curve on the right with the star’s current position marked. Direction is given in words as well as color.',
      },
      {
        name: 'rv-mass instrument (step 16)',
        text: 'K against planet mass with everything else held fixed. The straight line is the point.',
      },
      {
        name: 'rv-inclination instrument (steps 17, 19)',
        text: 'Two bars: true mass, and the mass radial velocity would report. Used both to weigh the planet at step 17 and to break the reported mass at step 19.',
      },
      {
        name: 'astrometry-signature instrument (steps 24, 28)',
        text: 'The sky path at any inclination, with sliders for planet mass, orbit size and distance. Distance changes the angle and not the orbit, which the readout shows explicitly.',
      },
      {
        name: 'method-comparison instrument (step 26)',
        text: 'Transit, radial velocity and astrometry side by side as one system tilts. The astrometry bar deliberately stays full: its amplitude does not vanish face-on.',
      },
      {
        name: 'planet-characterization instrument (steps 31, 34)',
        text: 'The inference chain as a table. Calls habitability.js directly for insolation and zone bounds, so its numbers are identical to The Goldilocks Question by construction rather than by coincidence.',
      },
    ],
    misconceptions: [
      {
        claim: 'The star does not really move; only the planet orbits.',
        response:
          'Collect this at step 3 before anyone runs anything. It is the single most common starting belief and the whole lesson depends on dislodging it. The reflex-motion instrument at step 4 shows both bodies on opposite sides of a fixed point; the magnification label is what stops the fix becoming a new misconception.',
      },
      {
        claim: 'Radial velocity measures the planet’s speed.',
        response:
          'It measures the star’s. The planet never enters the measurement directly, which is exactly why the method works on planets nobody can see. Worth restating at step 10 when the live panel opens.',
      },
      {
        claim: 'A Doppler shift makes the star visibly change color.',
        response:
          'At 84 m/s the shift is under a thousandth of a nanometre on a 500 nm line. The panel’s spectral-line strip is labeled "shift exaggerated for visibility" for this reason. If a student describes the star turning blue, the number is the correction.',
      },
      {
        claim: 'Zero radial velocity means the star has stopped.',
        response:
          'It means all of the star’s motion is across our view at that instant. Step 9 makes this visible; a student who misses it will misread the curve’s zero crossings as pauses.',
      },
      {
        claim: 'Radial velocity gives the planet’s true mass.',
        response:
          'It gives M sin i, a lower limit, unless something else fixes the inclination. Steps 18-21 are built entirely around this, and step 21 is where the transit connection pays off.',
      },
      {
        claim: 'A face-on system cannot be detected by any wobble method.',
        response:
          'Radial velocity fails; astrometry does not. The astrometric semi-major axis is unchanged face-on, and the projected path is a circle rather than a line. Step 26 asserts this deliberately because the opposite is widely and wrongly assumed.',
      },
      {
        claim: 'Astrometry photographs the planet.',
        response:
          'It measures the star’s position. The planet stays invisible throughout, which is stated at step 23 and worth repeating if anyone describes the sky plot as an image of the planet.',
      },
      {
        claim: 'Density tells you exactly what a planet is made of.',
        response:
          'It constrains composition, it does not determine it. Rock under a hydrogen envelope and a water-rich world can share a density. The lesson’s language is "consistent with" throughout and student answers should be held to the same standard.',
      },
      {
        claim: 'A planet in the habitable zone is habitable, or inhabited.',
        response:
          'The zone is a statement about the orbit under assumed climate conditions, not a measurement of the planet. Step 36 asks students to name what is still unknown for exactly this reason; answers naming atmosphere, rotation or albedo are the ones to reward.',
      },
    ],
    teachingNotes: [
      'Collect the step 3 prediction out loud before anyone runs the simulation. "Only the planet moves" is the majority answer in most classes and the rest of the lesson is built on overturning it.',
      'At step 10 the live panel takes about thirteen seconds per orbit. Tell students to let it run for two full cycles before moving on; a partial curve gives a K that is too small, and the panel says "so far" while that is true.',
      'Step 14 asks students to read K off the panel rather than compute it. The panel reports the semi-amplitude, not the full range, which is the definition step 13 just gave them. If a student writes 168 rather than 84 they have taken the peak-to-peak value.',
      'Step 17 is the quantitative centerpiece. Students match a mass to their measured K rather than rearranging a formula with G in SI units; the arithmetic is the software’s job and the inference is theirs.',
      'Steps 18-21 work best if you pause between 19 and 20 and ask what a survey would report for a planet it can only see at 30 degrees. The answer, "half its real mass", is the whole of M sin i in one sentence.',
      'Step 26 is the step to slow down on. The astrometry bar staying full while the radial-velocity bar shrinks is counterintuitive and is the single most valuable idea in the second half.',
      'For step 35, resist letting students answer from one column. Planet B is in the zone and Planet C is rocky; only A is both, and the point of the exercise is that neither fact alone was sufficient.',
      'Step 36 is short-answer and deliberately open. Any property beyond the reach of the measurements, tied to liquid water, earns full credit. It is a good exit ticket.',
    ],
    discussion: [
      'The first exoplanet surveys found mostly hot Jupiters. What does that tell us about planetary systems, and what does it tell us only about the surveys?',
      'Radial velocity gives a minimum mass. Is a minimum mass a useful scientific result, or is it a failure? What can you do with a lower limit?',
      'If a planet transits, we know the orbit is nearly edge-on. What fraction of planetary systems would you expect to be oriented that way, and what does that imply about how many planets transit surveys miss?',
      'Astrometry favours wide orbits and nearby stars; transits favour close-in planets. If each method is biased, how does the field arrive at a picture of what planetary systems are actually like?',
      'A planet with Earth’s density in the habitable zone of its star: what would you want to measure next, and with what instrument?',
      'HD 209458 b is a hot Jupiter. Nothing about it resembles Earth. Why has so much effort gone into characterizing it?',
    ],
    extensions: [
      'Have students look up a planet from the NASA Exoplanet Archive with both a measured mass and radius, compute its bulk density, and compare it with the values in this lesson.',
      'Ask students to estimate the radial-velocity semi-amplitude Earth induces on the Sun (about 0.09 m/s) and discuss what that implies about detecting Earth analogues.',
      'Open the Astrometry panel alongside the Radial Velocity panel on the characterization scenario and demonstrate the inclination sweep live, rather than through the analytical widget.',
      'For a mathematically prepared class, derive the semi-amplitude relation from the center-of-mass condition and a circular orbit. The lesson deliberately does not, but the derivation is short.',
    ],
    modelNotes: `The simulation integrates gravity in a plane. The observer geometry is a genuine
      three-dimensional projection over that planar model: a line-of-sight direction is built
      analytically from a position angle and an inclination, and positions and velocities are
      projected onto it. This is what allows inclination to affect the transit, the
      radial-velocity amplitude and the astrometric shape consistently without a
      three-dimensional N-body rewrite. The dynamics remain planar; only the viewing geometry
      is three-dimensional.
      \n\nThe Exoplanet Characterization Lab initializes HD 209458 and its planet in the
      center-of-mass frame from published parameters. Measured against the analytic
      semi-amplitude, the simulated star's wobble reproduces K to within about 0.5 per cent at
      the scenario's own speed. The radial-velocity panel plots velocity relative to the
      measured system barycenter, which removes the small residual drift that integration
      error leaves behind.
      \n\nThe semi-amplitude, reflex orbit, astrometric signature and bulk density all come
      from js/exoplanetObservables.js, and the insolation and habitable-zone boundaries from
      js/habitability.js, the same module The Goldilocks Question uses. The habitable-zone
      prescription is Kopparapu et al. (2013) with the 2014 erratum, valid for stellar
      effective temperatures between 2600 and 7200 K.
      \n\nSystem parameters for HD 209458 are stored in js/data/exoplanetSystems.js and shared
      by the scenario, the widgets and the tests, so a change in one place cannot leave the
      lesson disagreeing with the instrument.`,
    expectations: {
      12: 'The curve repeats every 3.52 days. Students reading between successive peaks typically land between 3.3 and 3.8; anything in that range is a good measurement off a live plot. The published period is 3.5247 days.',
      14: 'The panel reports K near 84 m/s once a full cycle is recorded, which matches the published semi-amplitude for HD 209458 b. A student answer near 168 has taken the full peak-to-peak range rather than the semi-amplitude and should be sent back to step 13.',
      16: 'The rv-mass instrument holds star, period and viewing angle fixed, so K is strictly proportional to planet mass: an Earth gives 0.38 m/s, a Neptune 6.6, HD 209458 b 84, and a five-Jupiter planet 609. At step 17 students match this instrument to their measured K and should land near 0.69 Jupiter masses, the published value; the accepted range is 0.61 to 0.77, wide enough to absorb a slightly misread K.',
      31: 'The characterization panel reports HD 209458 b at 1.38 Jupiter radii, 0.69 Jupiter masses and a bulk density of 0.33 g/cm³: about a third the density of water and a sixteenth of Earth’s. It receives roughly 785 times Earth’s starlight and sits far inside the inner edge of the modeled zone. At step 32 the accepted density range is 0.25 to 0.41; a student answering near 5.5 has read Earth’s density from the comparison text rather than the planet’s.',
    },
  },
  'retrograde-motion': {
    topic: 'Reference frames, apparent motion, and the Copernican argument',
    difficulty: 'Introductory, written for non-science majors',
    placement:
      'Any time after circular orbits have been introduced; it pairs naturally with Kepler’s Laws and works well immediately after it, since students arrive already able to read a period off the inspector. It also stands alone as a single-session lesson, and it is the one lesson in the set that is as much history and philosophy of science as it is physics. If you teach a unit on the Copernican revolution, this is the lesson that lets students perform the observation the revolution was about rather than being told it.',
    overview: `Students meet retrograde motion as an observation first, stated in terms of the one
      quantity a pre-telescopic astronomer could actually measure: the direction to a planet against
      the fixed stars. They measure the orbital periods of Earth and Mars, convert them to angular
      speeds, and compute the 780-day synodic period twice by two different routes. They then predict
      what Mars's path will look like from Earth, switch the reference frame, and watch the loop draw
      itself out of positions that never reversed. The rest of the lesson is about what that does and
      does not establish: they locate the reversal at opposition, find that Mars is brightest exactly
      when it is moving backwards, discover that every outer planet's Ptolemaic epicycle has a period
      of one year, and are then asked directly whether the loop proves heliocentrism. It does not, and
      the lesson closes on what did: the fictitious forces a geocentric frame requires, and the
      stellar parallax Tycho looked for with an instrument eighty times too coarse to find it.`,
    priorKnowledge: [
      'That planets orbit the Sun, and that an orbit has a period',
      'Reading a number off a live readout and writing it down',
      'Dividing and subtracting reciprocals on a calculator; the arithmetic at steps 9 and 10 is two divisions',
      'Helpful but not required: Kepler’s Laws, for the period-distance relation students meet again at step 6',
    ],
    keyConcepts: [
      {
        heading: 'Retrograde motion as an observation',
        body: 'Over a few weeks an outer planet stops its steady eastward drift against the stars, reverses, and then resumes. It is a statement about a direction changing the wrong way, not about a path anyone watched being traced. Naked-eye astronomers had no distances at all, so direction against the fixed stars was the entire dataset, and stating the phenomenon that way keeps the lesson honest about what was being explained.',
      },
      {
        heading: 'The synodic period',
        body: 'The interval between successive alignments of Sun, Earth and planet, given by 1/S = 1/P1 - 1/P2 with P1 the shorter period. It counts laps gained rather than laps run, which is why it is longer than either planet’s year. For Earth and Mars it is 780 days. The lesson has students reach the same number twice, once from reciprocals and once from a rate of degrees gained per day, because the formula is easy to apply and hard to feel.',
      },
      {
        heading: 'Reference frames',
        body: 'A position is a relationship between a body and something else, and that something else is the frame. Changing frames adds no force and moves no body; it changes what every position is measured against, and therefore changes the path. Gravitas re-expresses trails by subtracting where the origin body was at the moment each point was recorded, which is why the shape of the path changes rather than the drawing merely sliding across the screen.',
      },
      {
        heading: 'Why the loop happens at opposition',
        body: 'Earth is on the smaller, faster orbit. Around opposition it overtakes Mars on the inside, and the direction from Earth to Mars swings backwards against the distant stars for about ten weeks. This is the motorway-overtaking geometry, and it means the reversal and the closest approach are the same event: Mars is at its brightest precisely while it appears to move backwards.',
      },
      {
        heading: 'The one-year epicycle',
        body: 'In Ptolemy’s model each of Mars, Jupiter and Saturn rides an epicycle, and every one of those epicycles takes exactly one year. Ptolemy knew this and recorded it; his model gives no reason for it. In the heliocentric picture the epicycle is not the planet’s motion at all but Earth’s, reflected onto the planet’s apparent path, so the shared period is forced. Three unrelated planets sharing one number is the specific coincidence Copernicus pointed at.',
      },
      {
        heading: 'What the loop does not establish',
        body: 'Both the geocentric and the heliocentric descriptions reproduce the observation, which is exactly why the argument lasted fourteen centuries. The loop establishes that the observer is moving relative to Mars; it does not by itself say what is at the center. What settles it is that only in the Sun’s frame can every force be traced to a mass, and that the heliocentric picture predicted stellar parallax, measured in 1838.',
      },
    ],
    flow: [
      {
        steps: '1-4',
        text: 'The phenomenon is stated as history and then as a measurement: five wandering stars, and the fact that the only measurable quantity was a direction. Students then watch the system from outside and confirm for themselves that neither planet ever reverses. Everything that follows is about reconciling those two screens.',
      },
      {
        steps: '5-7',
        text: 'The two orbits are measured off the inspector and converted to angular speeds. The multiple-choice step in the middle is there to make students say out loud that the inner planet is the faster one, which is the entire mechanism and is easy to skate past.',
      },
      {
        steps: '8-10',
        text: 'The synodic period, computed twice. Step 9 uses the reciprocal formula, step 10 the rate of degrees gained. Students who get two different answers have usually put the longer period first in the subtraction.',
      },
      {
        steps: '11-13',
        text: 'A prediction is committed to before anything changes, then reference frames are introduced, then a screen explaining what the trails are actually doing. The last of these matters more than it looks: students who think the picture is being redrawn artistically will not accept the loop as evidence.',
      },
      {
        steps: '14-17',
        text: 'The frame is switched and the loop appears. Students then put numbers on it: the direction from Earth running backwards, and the distance to Mars reaching a clear minimum and maximum. The direction readout is the observable the whole lesson rests on.',
      },
      {
        steps: '18-21',
        text: 'The geometry is pinned down. Brightness and reversal are shown to be the same event, the reversal is located at opposition, the overtaking analogy is given, and students write the explanation in their own words. This short-answer step is the assessment center of the lesson.',
      },
      {
        steps: '22-24',
        text: 'Ptolemy. The epicycle is presented as a device that worked rather than as a mistake, and students find the one-year period that a geocentric model has to accept as a coincidence, then count the twenty separate devices the five planets needed.',
      },
      {
        steps: '25-27',
        text: 'The Sun is examined in Earth’s frame, where it traces a clean annual circle with no loop, and students are then asked directly whether the loop proves heliocentrism. The intended answer is that it does not, and this is the step most likely to generate discussion.',
      },
      {
        steps: '28-30',
        text: 'What actually settles the question: the fictitious forces a geocentric frame requires, and stellar parallax. Tycho’s null result is treated as sound reasoning with an inadequate instrument, which gives a transferable lesson about what a non-detection constrains.',
      },
      {
        steps: '31-33',
        text: 'A final measurement of the length of the retrograde episode, a prediction about Jupiter that students can check against the formula, and a closing screen that names the transferable question: measured against what?',
      },
    ],
    features: [
      'The Retrograde Mars scenario: the Sun, Earth and Mars at their real distances, periods and masses, and nothing else. The full Solar System draws the same loops, but with fifty asteroids and ten comets looping at once it is a picture rather than a measurement.',
      'The reference-frame switcher, in Tools > Frame and in the object inspector under Overlays. Choosing a body puts it at rest and re-expresses every position and every trail around it.',
      'Frame-relative readouts in the inspector: Distance from Earth and Direction from Earth appear whenever a frame is active, alongside the unchanged world-frame Velocity row. The direction in degrees is the number steps 16 and 31 are read from.',
      'A trail long enough to close the loop: the scenario holds about 110 days of history, a little longer than a whole retrograde episode.',
    ],
    misconceptions: [
      {
        claim: 'Mars actually slows down and reverses in its orbit.',
        response:
          'It does not, and the lesson is built so students see this before they see the loop: step 4 has them watch from outside and confirm that neither planet ever turns back. If a student still writes this at step 21, send them back to step 4 rather than re-explaining. The whole point is that the reversal is a fact about the observer.',
      },
      {
        claim:
          'Changing the reference frame is just a drawing trick, so the loop is not real.',
        response:
          'The loop is exactly as real as the circle, and both are pictures of the same recorded positions. What makes the loop the observationally relevant one is that we live on Earth: it is what our eyes receive. Step 13 exists to head this off by explaining that each trail point is re-expressed against where the origin was at the time it was recorded, not slid across the screen.',
      },
      {
        claim: 'The retrograde loop proves the Earth moves.',
        response:
          'It does not, and step 27 asks this directly. Both models reproduce it; that is why the dispute lasted so long. The loop shows relative motion between Earth and Mars, and attributing that motion to one body rather than the other needs a separate argument. Students who find this unsatisfying have understood it correctly.',
      },
      {
        claim: 'Ptolemy was simply wrong, and epicycles were a silly idea.',
        response:
          'Epicycles reproduced planetary positions to about naked-eye accuracy and were used for fourteen hundred years, which is a longer run than most theories get. Step 22 presents them as a working model. The weakness worth naming is not inaccuracy but the unexplained coincidence of step 23: five devices tuned separately, three of which turn out to share one period for no reason the model supplies.',
      },
      {
        claim: 'Tycho failed to find parallax because he was a poor observer.',
        response:
          'He was the best pre-telescopic observer there has ever been, and his reasoning was valid: no parallax means either no motion or absurdly distant stars. He had no way to rule out the second. Step 30 puts numbers on it, and the general point is worth drawing out: a null result constrains a theory only once you know what your instrument could have detected.',
      },
      {
        claim:
          'Every frame is equally good, so physics has nothing to say about which to use.',
        response:
          'Step 28 addresses this. Frames are equally valid as descriptions and not equally useful as physics: in Earth’s frame you must add fictitious forces that no mass exerts to explain why the Sun circles us. The frame in which every force can be traced to a body is the one worth building mechanics in, and that argument is Newton’s rather than Copernicus’s.',
      },
    ],
    teachingNotes: [
      'Steps 3 and 4 are the setup for everything else and are worth not rushing. A class that has personally confirmed at step 4 that neither planet reverses will accept the loop at step 14 as a puzzle to solve rather than as an animation to watch.',
      'At step 14 the loop does not appear instantly. The trail has to grow, and Earth has to reach opposition, which can take half a minute of running. Tell students this in advance or several will conclude the control is broken and switch it off again.',
      'Step 21 is the assessment center. The discriminating feature of a good answer is that it explains the reversal without attributing anything unusual to Mars. Answers that invoke gravity pulling Mars back, or Mars slowing at the far point of its orbit, are the common failure and are worth collecting and discussing as a group.',
      'Step 27 is where the room usually divides, and it is the most valuable minute in the lesson. Some students will insist the loop settles it. Ask them to state what a geocentric astronomer would say when shown the same screen, and the argument becomes about criteria for choosing between models rather than about which is true.',
      'If you are short on time, steps 22 to 24 can be assigned as reading rather than done in class; the physics survives without them. Steps 28 to 30 are harder to cut, because without them the lesson has raised the question of what settles the matter and left it unanswered.',
      'Students who have done Kepler’s Laws will notice at step 6 that the inner planet being faster is the third law again. Naming that connection out loud costs nothing and does a lot for the coherence of the unit.',
    ],
    discussion: [
      'A geocentric astronomer and a heliocentric one are shown the same screen at step 14. What exactly do they disagree about, and what observation could settle it? What would each accept as evidence against their own view?',
      'Ptolemy’s model made accurate predictions for fourteen centuries. If a model predicts correctly, in what sense can it be wrong? Is a model that predicts well but explains nothing worse than one that explains well but predicts poorly, which is what Copernicus originally offered?',
      'Step 23 turns on a coincidence: three planets, one period. How much weight should an unexplained coincidence carry when choosing between two models that fit the data equally well? Can students name a modern example of the same kind of argument?',
      'Tycho concluded from a null result that the Earth does not move. His logic was sound and his conclusion was wrong. What was missing, and how would you avoid making the same error with a modern non-detection?',
    ],
    extensions: [
      'Have students find the current retrograde dates for Mars in a planetarium program or an almanac, and check the interval against the 780 days computed at step 9. The agreement is exact enough to be striking.',
      'Repeat the whole exercise for Venus by building a Sun, Venus and Earth system. Venus is an inner planet, so the geometry is reversed and the loop happens at inferior conjunction rather than opposition. Ask students to predict the difference before running it.',
      'Ask students to compute the synodic periods of all five naked-eye planets and to explain, physically, why the outer ones converge on one year while Venus and Mercury do not.',
      'For a mathematically stronger group: derive the direction from Earth to Mars as a function of time for two circular orbits, and find the condition for the derivative to change sign. The result is a clean statement of when a retrograde episode begins and ends.',
    ],
    modelNotes: `The orbits here are circles at the true semi-major axes, 1.00 and 1.523 AU, with the true masses and therefore the true periods. Real eccentricities are 0.017 for Earth and 0.093 for Mars, and both are left out because neither changes the phenomenon: what draws the loop is the difference in angular speed, not the shape of either orbit. Real Mars retrograde episodes vary in length and in the shape of the loop from one opposition to the next, and that variation does come from the eccentricities and from the 1.85 degree inclination of Mars's orbit, which this planar model also omits. Students comparing a screenshot with a photograph of a real Mars loop will find the real one is a flattened S or an open zigzag as often as a closed loop, because Mars is usually a little above or below the ecliptic when it happens. The synodic period, the location of the reversal at opposition, and the coincidence of reversal with closest approach are all reproduced exactly.`,
    expectations: {
      4: 'Both planets circle counterclockwise and neither ever reverses. Earth’s speed reads about 29.8 km/s and Mars’s about 24.1 km/s; students should notice both that Earth is faster and that it has less far to go. If a student reports a reversal here, they have already switched the frame.',
      5: 'Earth: 1.00 AU and about 365 days. Mars: 1.52 AU and about 687 days. The inspector computes these from live position and velocity, so readings drift by a per cent or two depending on when they are taken; anything within 5 per cent is a good measurement.',
      7: 'Earth 0.99 degrees per day, Mars 0.52, and a gain of about 0.46 degrees per day. A student getting a negative gain has subtracted the wrong way round.',
      14: 'Earth sits still at the center, the Sun circles it once a year, and Mars’s trail carries a loop or a cusp. The loop needs roughly half a minute of running to appear: the trail has to fill and Earth has to reach opposition. Students who switch the frame and immediately switch back will see nothing.',
      16: 'The direction from Earth climbs at roughly half a degree a day for most of the cycle, then falls for about ten weeks around opposition. Any pair of readings that brackets a fall is a correct answer; the day numbers themselves depend on when the student started.',
      17: 'Closest about 0.5 AU, furthest about 2.5 AU, a ratio near 5. Readings of 0.53 and 1.98 are typical if the student has not watched a full synodic period, and that is fine: the point is that the ratio is large, not its exact value. The real range is 0.38 to 2.68 AU because of the eccentricities this model leaves out.',
      26: 'The Sun traces a closed circle of radius 1 AU around Earth, once a year, with no loop and no cusp anywhere on it. Switching to the world frame stops the Sun dead; switching to the Sun’s own frame puts Earth back on the circle. Students often find this screen more unsettling than the Mars loop, which is a good sign.',
      31: 'About 70 to 80 days between the direction starting to fall and starting to rise again. The real figure for Mars is about 72 days, and it varies from one opposition to the next by a couple of weeks for reasons this planar circular model does not include.',
    },
  },
  'missing-mass': {
    topic: 'Dark matter',
    difficulty: 'Introductory, with one genuinely open-ended fitting exercise',
    placement:
      'Anywhere after orbital motion has been covered, and it needs nothing else. It pairs naturally with a unit on galaxies or on cosmology, and it also works as a single-session standalone: thirty-three screens, one argument, and a result students derive rather than receive. If you teach Kepler earlier in the term, this is the lesson that shows what happens when Kepler stops working. The rotation-curve fitting sequence at steps 13-19 is the longest single activity in Gravitas and the closest any of these lessons comes to what research actually feels like; if you are short of time it is the part to protect, and steps 2-3 and 6-8 are the scaffolding that makes it work.',
    overview: `Students weigh systems twice over, once by adding up the mass that is visible and once
      by watching how things move, and discover that the two answers agree for the Solar System and
      disagree badly for anything larger. The lesson opens by making a rotation curve into a tool
      rather than a result: students rearrange a fixed amount of mass four ways and watch the curve
      change shape, then work the relation backwards on a second instrument that shows a curve and its
      enclosed mass side by side, and record four points that fall on a straight line through the
      origin. They read the Solar System's Keplerian exponent of -0.5, predict the same shape for a
      galaxy, and meet the flat curve telescopes actually find.
      \n\nThe centre of the lesson is a fitting exercise. Students are handed a measured rotation
      curve and a model with a stellar disc and a dark halo, and asked to reproduce the data. They try
      the disc alone first, with both of its parameters free, and cannot do it: the best possible
      stars-only fit misses by about 15 km/s against measurement errors of 5, and it misses worst at
      the outer edge. A choice step draws out why - the shortfall is the wrong shape, not merely the
      wrong size - and then the halo goes in and the fit closes. Students read off how much dark mass
      per unit of visible mass their own fit implies.
      \n\nThe rest is consequence and context. A single star is launched on a circular orbit and the
      halo is removed underneath it; then the same experiment is run on ninety stars in the live
      simulation and the disc comes apart. Zwicky's 1933 cluster measurement follows, first on the real
      Coma Cluster in an instrument where the two classic arithmetic mistakes are selectable, then on
      the simulated cluster by hand. The lesson closes on the mass budget of the universe and on a
      short-answer step asking what the measurements establish and, more importantly, what they do
      not.`,
    priorKnowledge: [
      'That gravity holds orbits together, and that a faster orbit implies more mass inside it',
      'Reading a point off a graph, and the idea that a straight line on a log plot is a power law',
      'Squaring a number and dividing on a calculator; the arithmetic at steps 25 and 26 is two multiplications',
      'Comfort with the idea of fitting a model to data with error bars, and that a fit is judged against those errors rather than against zero. Steps 13-19 introduce this from scratch, but a class that has met it before will move faster',
      'Helpful but not required: Kepler’s Laws, for the circular-orbit speed relation the whole lesson leans on',
    ],
    keyConcepts: [
      {
        heading: 'The rotation curve',
        body: 'Orbital speed plotted against distance from the center. Its shape is a direct readout of where the mass is: a system with its mass concentrated in the middle gives a curve falling as the inverse square root of radius, and any departure from that means mass is still being enclosed further out. The Gravitas panel plots one point per body from live positions and velocities, with nothing fitted or smoothed.',
      },
      {
        heading: 'The other reading: MOND',
        body: 'Milgrom (1983) observed that rotation curves stop falling at a characteristic acceleration a\u2080 \u2248 1.2 \u00d7 10\u207b\u00b9\u2070 m/s\u00b2 rather than at a characteristic size or brightness, and proposed that below it gravity departs from Newton\u2019s law. Far from a galaxy this gives v\u2074 = G M a\u2080 - a flat curve and a fixed relation between baryonic mass and asymptotic speed, with no parameter fitted per galaxy. That relation is observed independently: it is the baryonic Tully-Fisher relation, and its scatter is small. \n\nMOND is very good at galaxy rotation curves and this is not in dispute. It is much less good elsewhere, and a lesson that presents it as an equal contender across the board would be misleading. In clusters it reduces the missing mass but leaves a residual factor of about two, so clusters still need unseen matter. The Bullet Cluster shows lensing mass displaced from the visible gas after a collision, which is what a collisionless dark component looks like. The relative heights of the acoustic peaks in the cosmic microwave background are fitted by cold dark matter and are not reproduced by MOND without adding a dark component anyway. And MOND has no settled relativistic form: TeVeS and its successors exist, are more complicated than general relativity, and several were ruled out by the measured speed of gravitational waves. \n\nThe symmetric point, which students should also hear: dark matter owes an explanation of why halo properties track the visible mass as tightly as the Tully-Fisher relation says they do, and that is a live problem. Neither picture is finished.',
      },
      {
        heading: 'Why the Keplerian exponent is -0.5',
        body: 'Setting gravitational attraction equal to what a circular orbit needs gives v = sqrt(G M(<r) / r). If essentially all the mass sits inside the smallest orbit, M is a constant and only r varies, so v goes as r to the power -1/2. The Sun holds 99.8 per cent of the Solar System’s mass, which is why the Solar System returns almost exactly -0.500.',
      },
      {
        heading: 'What a flat curve requires',
        body: 'Rearranging the same relation for mass gives M(<r) = v squared times r over G. Holding v constant with radius therefore forces M(<r) to grow in proportion to r: double the radius and the mass inside must double. Out where the stars have run out, nothing visible supplies that growth, yet the speeds do not drop. This is the observation, and it is independent of any explanation of it.',
      },
      {
        heading: 'The dark-matter halo',
        body: 'A halo is not an object. It is a smooth mass distribution added to the force law, with no position of its own, nothing drawn on screen and no entry in the body counts. Gravitas uses a pseudo-isothermal profile, the same family used to fit real rotation curves, whose enclosed mass keeps growing with radius and whose circular speed approaches a constant far out. That asymptote is what flattens the curve.',
      },
      {
        heading: 'The virial theorem',
        body: 'For a self-gravitating system that has settled down, 2K + U = 0. Writing the kinetic energy as half M times the mean square speed and the potential energy of a uniform sphere as -(3/5) G M squared over R, and cancelling one factor of M, gives M = (5/3) R times the mean square speed, divided by G. This converts a spread of speeds into a mass, and it is the whole of what Zwicky did.',
      },
      {
        heading: 'Dynamical mass against visible mass',
        body: 'These are two independent estimates of the same quantity, from two unrelated kinds of measurement. Their ratio is the entire result of this lesson. Because it is a ratio it is unaffected by the scale of the model, which is what lets a scaled-down cluster carry a conclusion about a real one.',
      },
      {
        heading: 'Decomposing a rotation curve',
        body: 'A model galaxy is built from components whose circular speeds add in quadrature, because it is the accelerations that add and each of them equals v squared over r. The disc in the fitting instrument is a thin exponential disc with the Freeman (1970) solution, which rises, peaks at about 2.15 scale lengths and then declines more slowly than a point mass would. That shape is the crux: it is fixed by the geometry, so the only freedoms are how much mass the disc has and how spread out it is, and neither of them can turn a declining curve into a level one.',
      },
      {
        heading: 'Why the shape of the residual matters more than its size',
        body: 'The instinctive response to a model that falls below the data is to add mass. Students discover at steps 14-16 that this cannot work, because adding mass to a disc raises the inner curve faster than the outer one: the best stars-only fit leaves about 15 km/s of average error against measurement errors of 5, and the miss is concentrated at the outer edge. What the data requires is mass that is negligible where the light is and dominant where it is not, which is the opposite of how starlight is distributed. This is the argument that actually closed the question in the literature, and it is an argument about shape.',
      },
    ],
    flow: [
      {
        steps: '1-3',
        text: 'A rotation curve is established as a tool before it is used as a result. Students rearrange a fixed amount of mass four ways in the "Where the mass is" instrument and watch the curve change shape, then commit in a choice step to which arrangement produces a flat curve. Nothing about dark matter has been mentioned yet.',
      },
      {
        steps: '4-5',
        text: 'The Solar System, plotted live from the simulation. Students read the fitted exponent off the Rotation Curve panel and then reason out, in a multiple-choice step, why it comes to -0.5. This is the case where light and motion agree, and it is the reference the rest of the lesson is measured against.',
      },
      {
        steps: '6-8',
        text: 'The relation is worked backwards. The "What the speed tells you about the mass" instrument shows a curve and its enclosed mass together with a draggable radius marker, a choice step draws out what a flat curve requires, and then students record the enclosed mass at four radii and plot it. The four points fall on a straight line through the origin, which is what "proportional to radius" looks like.',
      },
      {
        steps: '9-12',
        text: 'The prediction and the observation. Students predict the curve of a galaxy built on the assumption that light traces mass, measure it, then meet Rubin and Ford’s result in the same disc with the speeds telescopes actually find, and measure that too. The visible mass is identical in both; only the motion differs.',
      },
      {
        steps: '13-16',
        text: 'The fitting exercise begins, and this is the heart of the lesson. Students are handed a measured curve with error bars and a stellar disc with two free parameters, and asked to reproduce the data. They cannot. Step 15 has them record their own best attempt, and step 16 asks why a heavier disc does not rescue it: the shortfall is the wrong shape, not the wrong size.',
      },
      {
        steps: '17-19',
        text: 'The halo goes in. Two more sliders, a fit that closes to within the measurement errors, and a numeric step in which students divide their own fitted halo mass by their own visible mass. The answer, about 3.4, is a number they produced rather than received.',
      },
      {
        steps: '20-21',
        text: 'What the halo is holding. A single star is launched on a circular orbit at the speed a real galaxy gives it and the halo is switched off underneath it; then the same experiment runs on ninety stars in the live simulation and the disc unwinds from the outside in.',
      },
      {
        steps: '22-24',
        text: 'Zwicky and the Coma Cluster. The history is introduced, then students work the virial theorem on the real Coma Cluster in an instrument where both classic arithmetic mistakes are selectable, and only then switch to simulation units and record the member count, speed spread and radius of the simulated cluster by hand.',
      },
      {
        steps: '25-26',
        text: 'The cluster calculation. Two numeric steps take students from the virial theorem to a dynamical mass and then to its ratio against the visible mass.',
      },
      {
        steps: '27-30',
        text: 'The other explanation, in four screens. MOND is introduced as what it is - an empirical observation that rotation curves stop falling at a particular acceleration, turned into a law - and then put on the same twelve measurements the halo was fitted to. Students discover that both reproduce the curve inside its error bars, that the halo spent three fitted numbers doing it and MOND spent one, and that the two disagree about how heavy the stellar disc is. A numeric step has them apply v⁴ = G M a₀ by hand, and a short-answer step asks what the curve can and cannot settle. Expect the question "so which one is right?" here; the honest answer is that this measurement does not say, and the step exists to make that a finding rather than a dodge. Nothing in the lesson asserts that either explanation is correct, and the answer key credits students who reach for evidence outside rotation curves.',
      },
      {
        steps: '31-33',
        text: 'What it all establishes. A short-answer step asks what has and has not been shown, the mass-budget instrument puts the result in cosmological context, and the lesson closes on where the evidence stands and what remains unknown.',
      },
    ],
    features: [
      {
        name: 'The same curve, two explanations (steps 27-30)',
        text: 'The MOND comparison. It scores a dark-matter halo and Milgrom\u2019s modified law against the same twelve synthetic measurements, in the same units, and reports both residuals side by side along with how many numbers each explanation had to be given. The halo generated this curve, so it matches exactly with three fitted numbers; MOND has no halo and only the disc mass to adjust, and with one fitted number it lands about 2 km/s from the data, inside the error bars. a\u2080 is displayed and not adjustable, because it is meant to be a constant of nature rather than a property of this galaxy. \n\nThe two want different discs - MOND prefers about two thirds the stellar mass - and that is worth drawing out rather than glossing: a rotation curve does not measure a stellar mass-to-light ratio, so "how heavy is the disc" was never pinned down by the data in either picture. This is the disc-halo degeneracy and it is real. \n\nThe instrument will not declare a winner, and neither should the discussion. What it demonstrates is that this measurement underdetermines the explanation.',
      },
      {
        name: 'Galaxy gravity modes in the live panel',
        text: 'The Rotation Curve panel now offers three mutually exclusive laws for the outskirts: visible matter only, visible matter plus the halo, and MOND applied to the visible matter. They are one setting with three values rather than separate switches, so a student cannot construct a world running both a halo and MOND. \n\nMOND is offered only in the three galaxy scenarios, which declare what one simulation unit represents in kiloparsecs and solar masses; everywhere else the button is disabled and says why. There is no defensible way to apply a galactic acceleration scale to a planetary system, and applying one silently would be worse than refusing. The panel labels the halo\u2019s parameters as fitted and MOND\u2019s a\u2080 as fixed, which is the distinction the whole comparison turns on.',
      },
      {
        name: 'Where the mass is (steps 2-3)',
        text: 'A lesson instrument, not the live panel. It holds a total mass fixed and lets a student arrange it four ways — all in the middle, a uniform ball, an exponential disc, and a halo whose mass keeps growing — showing the mass distribution beside the curve it produces. Every arrangement contains the same mass inside 30 kpc, so the comparison is about shape alone. It reports the outer slope, and names the shape in words using bands that are deliberately comparative: a pseudo-isothermal halo still climbs slightly over any finite range, so "flat" means near zero rather than exactly zero.',
      },
      {
        name: 'What the speed tells you about the mass (steps 6-8)',
        text: 'Two stacked plots — a rotation curve above, the enclosed mass it implies below — joined by one draggable radius marker. The lower plot is the upper one with M = v squared r over G applied to it, and the panel says so. Three curves are selectable: falling, flat, and a real galaxy with the visible contribution drawn as a dashed line. The readout states what happens to the enclosed mass when the radius doubles, which is the sentence step 7 grades.',
      },
      {
        name: 'Fit a real galaxy (steps 13-19)',
        text: 'The centrepiece. A measured rotation curve with error bars, and a four-slider model: disc mass, disc scale length, halo strength and halo core radius. It scores the fit as an RMS residual in km/s and states the mean measurement error alongside it, so a student can tell a good fit from a lucky one, and it names the radius of the worst single miss and whether the model is too fast or too slow there. The plot marks FITTED when the residual drops below the errors. Steps 14-16 hide the two halo sliders so the disc has to be tried on its own first.',
      },
      {
        name: 'What the halo is holding (step 20)',
        text: 'A single star launched on a circular orbit at the speed the full model gives it, integrated live, with a halo toggle. Switching the halo off removes the mass without touching the motion, which is precisely the situation a flat rotation curve presents, and the star leaves. The readout shows the launch speed beside the speed the visible disc alone could have held, and the view does not rescale when the star escapes.',
      },
      {
        name: 'Weigh a cluster by how fast it jitters (step 23)',
        text: 'The virial theorem applied to the real Coma Cluster, with sliders for the measured dispersion and the radius, and a third slider that selects how sigma becomes the mean square speed. Two of its three positions are wrong on purpose: sigma without squaring, and sigma squared without the factor of three for the two unobserved directions. The readout warns when a wrong one is selected and says why. Two bars compare the mass the motion demands against the galaxies and the hot gas.',
      },
      {
        name: 'Where the mass of the universe is (step 28)',
        text: 'Planck 2018 fractions revealed one layer at a time: everything, then the matter alone, then the ordinary matter alone, then the stellar share of it. Each layer rescales to the slice above, which is what makes the last number land — every star and nebula ever photographed is about half a per cent of the universe.',
      },
      {
        name: 'Rotation Curve panel (live, used at steps 4-5, 9-12 and 21-24)',
        text: 'A live instrument in the Tools list. It plots one point per body from the simulation’s own positions and velocities, over a dashed line showing the speeds the visible mass alone would produce and, when the halo is on, a solid line including it. It reports a power-law fit to the outer curve and names the shape in words. The inner region excluded from the fit is shaded, so the reported slope is visibly the slope of the outer curve.',
      },
      {
        name: 'Dark-matter halo toggle (step 21)',
        text: 'Inside the Rotation Curve panel. It adds or removes a term in the force law rather than changing the display, which is why the disc physically disperses when it is switched off. The flat-speed and core-radius sliders beside it set the halo’s two parameters.',
      },
      {
        name: 'Spiral Galaxy and Milky Way Rotation scenarios (steps 9-12 and 21)',
        text: 'The same disc twice: ninety stars and a central bulge, identical visible mass. In the first, each star is launched at the circular speed the visible mass implies, and the curve falls with an exponent near -0.45. In the second, every star moves at the same speed regardless of radius, and the halo is on because the disc does not survive without it.',
      },
      {
        name: 'Coma Cluster scenario (steps 22-24)',
        text: 'Twenty-four galaxies on randomly oriented orbits, named after real members of Coma. Galaxy is a new object type in Gravitas: a point mass with a disc drawn on it, which does not merge or evolve. The scenario is paused and carries a fixed seed, so the numbers a class reads are reproducible.',
      },
      {
        name: 'Cluster measurements block',
        text: 'Appears in the Rotation Curve panel whenever the scene contains three or more galaxies, and reports member count, speed spread and cluster radius. It deliberately stops there: the virial arithmetic is the exercise, so the panel supplies the measurements and not the answer.',
      },
    ],
    misconceptions: [
      {
        claim: 'Dark matter is a theory somebody invented to patch up gravity.',
        response:
          'The discrepancy is a measurement, made independently in galaxies and in clusters decades apart, and this lesson has students reproduce both. What dark matter names is the explanation, and step 27 exists specifically to separate the two. A student who leaves able to make that distinction has the most valuable thing in the lesson.',
      },
      {
        claim:
          'The outer planets move slowly because gravity is weaker out there.',
        response:
          'Gravity weakening with distance is already inside v = sqrt(G M / r) and does not by itself give the -0.5 exponent. What fixes that exponent is the enclosed mass staying constant. The distinction matters, because a flat rotation curve has the same weakening gravity and a completely different slope.',
      },
      {
        claim:
          'A flat rotation curve means the stars are moving too fast to stay bound.',
        response:
          'They are moving too fast for the visible mass to hold, which is not the same claim. The galaxies are bound and stable; what the measurement shows is that something is doing the binding that we cannot see. Steps 20 and 21 make the difference concrete: remove the halo and the star, and then the whole disc, really do come apart.',
      },
      {
        claim:
          'The dark matter is in a halo, so it must be a shell around the outside.',
        response:
          'A halo in this sense is a roughly spherical distribution that extends well beyond the visible disc but is present throughout it, densest in the middle like everything else. It is not a shell and there is no edge. The word is a description of extent, not of shape.',
      },
      {
        claim: 'Zwicky proved dark matter exists in 1933.',
        response:
          'He measured a discrepancy and named it. His own numbers were off by a large factor, partly because the extragalactic distance scale was wrong in 1933 and partly because most of a cluster’s ordinary matter is in hot gas nobody could see until X-ray astronomy. The result was largely ignored for forty years and only became compelling when independent lines of evidence agreed.',
      },
      {
        claim: 'Dark matter has been detected.',
        response:
          'Its gravitational effects have been measured many times over and in several unrelated ways. The substance itself has never been detected in a laboratory and no candidate particle has been identified, after four decades of searching. Step 29 says this plainly and it is worth saying again out loud.',
      },
      {
        claim:
          'The rotation curve problem could be fixed by finding more stars, or heavier ones.',
        response:
          'This is the belief steps 14 to 16 are built to break, and it is worth letting students hold it long enough to test. Both of the disc’s parameters are free, and neither works: adding mass raises the inner curve faster than the outer one, and spreading the disc out flattens its peak without stopping it from declining. The best possible stars-only fit is three times worse than the measurement errors and misses worst at the outer edge. The problem is the shape of what is missing, not the amount, and no amount of starlight has that shape.',
      },
      {
        claim: 'A halo is just a free parameter, so of course it fits.',
        response:
          'It is two free parameters, and that is a fair thing to be suspicious of. Two points are worth making. First, the disc it is competing against also has two free parameters and still cannot fit, so the halo is not winning by having more freedom. Second, the halo is not free to be any shape: it is a specific profile whose enclosed mass grows in proportion to radius far out, which is what a flat curve demands and what the fit tests. A student who presses this is doing exactly the right thing, and the honest answer is that the halo is a fitted model whose form is constrained by the data it was invented to explain — the same status it has in the research literature.',
      },
    ],
    teachingNotes: [
      'Have the class open the Rotation Curve panel at step 4 and leave it open for the rest of the lesson. The live measurements at steps 4-5, 9-12 and 21-24 all come from that one instrument, and the argument is much clearer when students watch the same plot change under three different systems than when they open and close it. Steps 2-3, 6-8, 13-20, 23 and 28 use their own docked instruments instead and need nothing from the rail.',
      'Steps 2 and 3 look like warm-up and are not. Everything after them depends on a student being able to look at a curve and say where the mass is, and this is the only place they get to build that by moving mass around rather than by being told. Ten minutes here saves twenty at step 16.',
      'Collect the step 9 prediction before anyone looks at the panel. Most classes correctly predict a falling curve, which is exactly what you want: the surprise at step 12 only lands for students who had committed to the other answer first.',
      'Steps 13 to 19 are the lesson. Budget half the session for them and resist the urge to shorten. The intended experience at step 14 is sustained, honest failure: students should push the disc mass to the top of its range, watch the inner curve overshoot, bring it back, try the scale length, and arrive at about 15 km/s of residual convinced there is nothing left to try. Do not rescue them, and do not let a fast student tell the room the answer.',
      'Ask for step 15 in writing before anyone touches the halo sliders. The number a student produced themselves, and the fact that their worst miss was at the outer edge, is what makes step 16 an inference rather than a claim.',
      'Step 16 is the pivot of the whole lesson and the one place to run a discussion rather than a click. The distractor about a disc not holding enough mass is the intuitive answer and it is wrong: mass is not the problem, distribution is. If the class can articulate "we need mass where the light is not", they have the argument that settled the question in the literature.',
      'At step 17, expect a spread of halo parameters that all fit. That is a genuine degeneracy between halo strength and core radius, not a mistake, and it is worth naming out loud: published rotation-curve papers quote these two together with a covariance for exactly this reason. The halo mass, and therefore the ratio at step 19, is far better constrained than either slider on its own.',
      'Step 20 is the best demonstration in the lesson and takes about thirty seconds. Run it on one screen with the class watching: launch the star, let it complete an orbit, then drag the halo slider to OFF and say nothing. Then ask why the star left, and insist on the answer that nothing was added to the star.',
      'Step 21 repeats step 20 on ninety stars in the live simulation. It is worth doing both: the single star makes the mechanism clear and the disc makes the consequence visible.',
      'Let students find both wrong settings at step 23 rather than warning them first. The "forget to square it" case is the valuable one, because the discrepancy vanishes: an answer that shows no missing mass is a signal that the arithmetic went wrong, and recognising that is a transferable skill.',
      'At step 24, make sure students actually switch to simulation units before recording anything. In physical units the panel reports a cluster radius in AU, which is a nonsense number for a cluster of galaxies and will produce a mass wrong by many orders of magnitude. The scenario is a scale model and the lesson says so, but the unit switch is the step students skip.',
      'The commonest arithmetic error at step 25 is using sigma rather than sigma squared, which gives about 86,000 instead of 1.76 million in simulation units. The second commonest is forgetting to divide by 1000 to reach solar masses. Both are worth naming in advance, and both were reachable deliberately at step 23 so that a student may already have met them.',
      'Steps 25 and 26 can be done on paper in under two minutes, and doing them on paper rather than in the answer box is worth the time: the point is that this calculation is genuinely small, and that Zwicky needed nothing more than this.',
      'Step 27 is a good exit ticket. Any answer that separates the measured discrepancy from its interpretation earns full credit; naming faint ordinary matter or modified gravity as alternatives earns more, and so does noticing that the rotation-curve result constrains the shape of the missing mass and not only its amount. Students who write only "dark matter exists" have missed the step.',
      'If a student asks whether the halo in this simulation is real physics or a fudge, the honest answer is that it is a fitted model: a pseudo-isothermal profile with two free parameters, chosen because it reproduces real rotation curves. Say so. It is the same status the profile has in the research literature, and the misconceptions section above has a longer answer.',
      'The rotation curve being fitted at steps 13-19 is synthetic, built from NGC 3198’s published structural parameters rather than transcribed from a data table, and the panel says so. This is deliberate: it means the exercise has an exact right answer, so a student who fits well has genuinely fitted well rather than guessed. If a class asks to see the real thing, the published decomposition of NGC 3198 is in the extensions below.',
    ],
    discussion: [
      'The Solar System gives an exponent of -0.5 and a galaxy gives roughly zero. Is there a size at which the disagreement starts, and how would you find out?',
      'Two independent measurements, in different kinds of system, sixty years apart, both say there is more mass than light. Why does independence matter so much here? What would it take for both to be wrong in the same direction?',
      'Suppose the missing mass turned out to be ordinary matter that is simply too faint to count: dim stars, cold gas, free-floating planets. What would you look for to test that, and why do you think it was eventually ruled out?',
      'Modifying the law of gravity at large distances also reproduces flat rotation curves. What would distinguish that from extra mass, and why do clusters make it harder to sustain?',
      'Roughly eighty-five per cent of the matter in the universe is of a kind nobody has identified. Is that a scandal, a research programme, or both?',
      'The panel reports a slope and names the shape in words. What is gained and what is lost when an instrument tells you what its own measurement means?',
    ],
    extensions: [
      'Have students look up a published rotation curve for a real galaxy, NGC 3198 and NGC 2403 are the classic cases, and compare its shape with the two Gravitas scenarios. The published figures usually plot the stellar, gas and halo contributions separately, which is exactly the decomposition the panel draws.',
      'Ask students to quantify the degeneracy they met at step 17. Have them find three different pairs of halo strength and core radius that all fit, record the halo mass inside 30 kpc for each, and compare the spread in the parameters with the spread in the mass. The parameters vary by tens of per cent; the mass barely moves. This is why papers quote the derived mass rather than the fitted parameters.',
      'Have students repeat the step 14 sweep systematically rather than by feel: fix the scale length, step the disc mass across its whole range, and tabulate the average miss. The curve of residual against disc mass has a shallow minimum around 8.5, well above the mass the light implies and still three times worse than the errors. Plotting that curve turns "I could not fit it" into "no disc mass fits, and here is the proof".',
      'Have students read about the Bullet Cluster and explain, in a paragraph, why the separation of the lensing mass from the X-ray gas is difficult for modified-gravity explanations to accommodate.',
      'For a mathematically prepared class, derive M(<r) proportional to r from the flat-curve condition, then integrate to show the implied density falls as r to the power -2 and that the total mass diverges. Ask what that divergence means physically, and connect it back to step 8 where students measured that proportionality directly.',
      'The disc curve in the fitting instrument is the Freeman (1970) thin exponential disc, whose peak sits at 2.15 scale lengths regardless of mass. Have a prepared class verify that from the panel by fixing the scale length and finding the peak, then repeating at a different scale length. It is a pure number that falls out of the geometry, and finding it is a good demonstration that the disc model is not adjustable in the way the mass is.',
    ],
    modelNotes: `The halo is a smooth background field added to the force law, not a body. It uses a
      pseudo-isothermal profile, whose circular speed is v_flat times the square root of
      1 - (r_c/r) arctan(r/r_c). This is the profile used to fit real rotation curves, chosen over the
      NFW profile that better matches structure-formation simulations because NFW is cuspy at the
      center, which would place a singularity in the middle of a scenario students are asked to fly a
      star through. The halo is applied as a velocity kick before the existing gravity solver on each
      step, which keeps it correct for both the direct sum and the Barnes-Hut path; a test confirms
      that a circular orbit in the halo stays circular to better than one per cent over several orbits.
      \n\nThe three scenarios are scale models and their cards say so. A real galactic bulge is around
      ten billion solar masses and a real cluster is megaparsecs across, while Gravitas's units are
      calibrated so that G = 1 works for planetary systems. Rebuilding the unit system around galactic
      scales would change nothing a student measures here, because every quantity this lesson turns on
      is dimensionless: the exponent of a power law, and the ratio of two masses.
      \n\nGalaxies are a genuine object type, deliberately the simplest in the codebase: a mass, a
      position and a drawing. They do not merge, accrete or evolve, because none of those are what a
      student is being asked to look at, and a cluster that lost members would lose the dispersion
      being measured.
      \n\nThe rotation curve excludes the central mass from the plot, identified as the heaviest body
      lying near the middle rather than by a radius cutoff. A cutoff wide enough to catch a galactic
      bulge also discarded Mercury, which is a tracer and belongs on the plot. Everything else shown
      is a live measurement: nothing is fitted or smoothed except the power law, whose fitting window
      is drawn on the plot.`,
    expectations: {
      2: 'All four presets should be pressed. The falling presets return an outer slope near -0.50 and the shape reads "falling, Keplerian"; the disc reads about -0.28 and "falling"; "What galaxies do" reads about +0.10 and "FLAT". The +0.10 is worth a word if a student queries it: a pseudo-isothermal halo approaches its asymptote from below, so over a finite range it is still climbing slightly. The claim the lesson makes is comparative — flat rather than -0.5 — and the panel’s bands are set for that.',
      4: 'The Solar System returns an exponent of -0.500 and the panel names the shape Keplerian. Mercury sits at the left of the plot at 48.5 km/s and 0.389 AU, and Neptune at the right at 5.43 km/s and 30.1 AU, both within a per cent of the real values, and every point lies on the dashed prediction. This is the agreement the rest of the lesson is measured against.',
      6: 'On the falling curve, dragging the marker from 2 kpc to 30 leaves the lower plot almost level and the readout says the enclosed mass "barely changes (x 1.00)". On the flat curve the lower plot is a straight line through the origin and the readout says it "roughly doubles (x 2.00)". On the real galaxy the visible dashed line accounts for about a quarter of the enclosed mass at 30 kpc, which is the number step 19 will reproduce independently.',
      8: 'The flat curve gives 2.62, 5.23, 10.46 and 15.69 in units of 10^10 solar masses at 5, 10, 20 and 30 kpc: exactly proportional to radius, and the plot is a straight line through the origin. The falling curve gives 5.23 at 30 kpc, the same as it gives at 10, which is the contrast the step is for. Students who read 5.2 rather than 5.23 are fine; the point is the proportionality, not the third digit.',
      10: 'The Spiral Galaxy scenario gives an exponent near -0.45 and the shape reads Keplerian. It is not exactly -0.5 because the disc carries about a fifth of the visible mass, so the enclosed total does keep growing a little; students who notice that discrepancy and can explain it are ahead of the lesson. The visible mass reads 14.7 solar masses in the model’s own units.',
      12: 'The Milky Way Rotation scenario gives an exponent near +0.02 and the shape reads Flat. The visible mass is unchanged at 14.7, which is the point worth drawing out: nothing about the bookkeeping changed, only the motion. At the outer edge the stars are moving roughly 2.7 times faster than the dashed prediction, so answers between 2 and 3 are good readings off the plot.',
      14: 'Expect frustration, and protect it. A heavier disc lifts the whole curve and overshoots the inner points long before it reaches the outer ones; a wider disc flattens its peak a little and moves it outward but still comes back down. The best achievable stars-only fit is an average miss of about 15 km/s at a disc mass near 8.5 and a scale length near 4.5, and it is worst at 30 kpc where the model runs about 27 km/s too slow. Students who get anywhere near 15 have found the real answer and should be told so.',
      15: 'Around 15 km/s for the average miss, a disc mass between 6 and 10, and the worst miss at 30 kpc with the model too slow. A student reporting an average miss under 10 has almost certainly left the halo on or misread the row; a student reporting 40 or more has not swept the range. The sign of the worst miss is the field that matters most: too slow, at the outer edge, every time.',
      17: 'Raising the halo strength from zero lifts the outer curve while the inner points barely move, which is the observation the whole exercise exists to produce. FITTED appears once the average miss drops below about 4.7 km/s. There is a real degeneracy between halo strength and core radius, so a range of settings will fit: anything from roughly 140 to 160 km/s with a matching core between 4 and 9 kpc gets there. That degeneracy is a feature of the real problem and worth naming.',
      18: 'A halo flat speed near 150 km/s and a core radius near 6 kpc, with an average miss around 2 km/s. The visible mass reads 3.35 and the halo mass inside 30 kpc reads about 11.4, both in units of 10^10 solar masses. Because of the degeneracy the individual halo numbers will vary between students while the halo mass, and therefore the ratio at step 19, will not vary much.',
      20: 'With the halo on the star holds 20 kpc indefinitely. The readout shows a launch speed near 146 km/s against about 77 km/s for what the visible disc alone could hold — a factor of nearly two in speed, which is a factor of nearly four in the mass required. Switching the halo off sends the star out past three times its launch radius within a few seconds and the verdict line appears. Relaunching at 8 kpc with the halo off keeps the star, because the disc still dominates there; that contrast is worth asking for explicitly.',
      21: 'With the halo switched off the outermost stars begin drifting outward within a few seconds and the disc visibly unwinds from the outside in. The fitted slope climbs as the outer stars carry their speed to larger radii. Reloading the scenario restores it; the toggle alone does not, because the stars have already moved.',
      23: 'Done correctly, Coma comes out near 1.6 x 10^15 solar masses, about 11 times the galaxies and hot gas combined and about 54 times the galaxies alone. Selecting "forget the factor of 3" divides the mass by exactly three. Selecting "forget to square it" collapses it by a factor of a thousand and the discrepancy disappears entirely, which is the most useful thing on the panel: an answer that shows no discrepancy is the signal that the arithmetic went wrong, not that the problem went away.',
      24: 'Twenty-four members, a speed spread of 20.5 simulation units per time, and a cluster radius of about 2516 simulation units. The visible mass reads 96 solar masses. Because the scenario is paused and seeded these are the same for every student, so a different answer is a reading error rather than a different moment.',
    },
  },

  'goldilocks-question': {
    topic: 'Exoplanets and habitability',
    difficulty: 'Introductory, written for non-science majors',
    placement:
      'In the exoplanets unit, or wherever habitability is discussed. Works as a standalone; the eccentric-orbit section lands better after Kepler’s laws.',
    overview: `Students derive the inverse-square law from three measurements, use it to work out why a
      dim star’s habitable zone is tucked in close, meet the two published definitions of that zone and
      what separates them, watch an eccentric planet swing in and out of it, and read the real
      TRAPPIST-1 system against the model. The last five screens are the reason the investigation
      exists: having spent forty minutes making the habitable zone feel powerful, the lesson turns
      round and asks what being inside it actually establishes. The answer is "very little about the
      planet", and a student who leaves with that is better equipped to read an exoplanet headline than
      one who leaves able to recite the definition.`,
    priorKnowledge: [
      'That planets orbit stars, and that stars vary enormously in brightness',
      'Squaring a number, and dividing on a calculator',
      'Reading a point off a graph',
      'No physics background, no algebra beyond substituting into a stated relation',
    ],
    keyConcepts: [
      {
        heading: 'Insolation and the inverse-square law',
        body: `The energy arriving per square meter goes as L/d². The reason is geometric: a star’s
          output crosses an imaginary sphere whose area grows as the square of the radius, so the same
          energy is spread thinner. Earth receives about 1,361 W/m², which the lesson calls one Earth
          and uses as its unit throughout. Watts appear only as a secondary readout.`,
      },
      {
        heading: 'Why luminosity moves the zone',
        body: `A boundary is defined by an effective stellar flux, so the distance at which it falls
          scales as the square root of luminosity. A star a hundred times more luminous has its zone ten
          times further out. TRAPPIST-1, at 0.000553 L☉, has its zone about forty times closer in than
          the Sun’s, which is why all seven of its planets fit inside Mercury’s orbit.`,
      },
      {
        heading: 'What sets each edge',
        body: `The inner edge is the runaway greenhouse: past a certain incident flux, water vapor
          feedback runs away, the oceans end up in the atmosphere and hydrogen escapes. The outer edge
          is the maximum greenhouse: a carbon-dioxide atmosphere can only warm a surface so far before
          it scatters more light than it traps. Neither edge is a temperature; both are limits on
          incident flux that a climate model can cope with.`,
      },
      {
        heading: 'Conservative and optimistic are not moods',
        body: `The conservative zone (runaway to maximum greenhouse) comes from a climate model. The
          optimistic zone (recent Venus to early Mars) comes from what the Solar System’s own history
          rules out: Venus has had no surface water for about a billion years, Mars appears to have had
          some early on. Gravitas uses the Kopparapu et al. (2013) prescription for both, which is why
          the Sun comes out at 0.98 to 1.69 AU and 0.75 to 1.77 AU respectively.`,
      },
      {
        heading: 'Why the zone says so little about a planet',
        body: `It is computed from a star’s luminosity and temperature alone. It knows nothing about
          whether a planet has an atmosphere, has any water, or is rocky. Venus and Earth are nearly the
          same size, receive starlight within a factor of two of each other, and have surfaces four
          hundred degrees apart. That comparison is the whole argument in one line.`,
      },
    ],
    flow: [
      {
        steps: '1–6',
        text: 'Insolation is introduced with Earth as the unit. Students predict what doubling the distance does, measure three distances with the instrument and the graph on the same screen, and read the curve their own points make.',
      },
      {
        steps: '7–8',
        text: 'Only now the explanation. Students step a shell outward one astronomical unit at a time and read off the areas 1, 4, 9, 16 before the inverse-square relation is written down, then apply it at an unfamiliar distance.',
      },
      {
        steps: '9–13',
        text: 'The star changes instead of the planet. Students find that insolation tracks luminosity, then meet the habitable zone as a band and watch it move by a factor of fifty as the star changes.',
      },
      {
        steps: '14–17',
        text: 'The careful definition, then the live Solar System with the zone drawn on it. Students classify four real worlds and then write a short answer about the one that makes the definition mean something: Mars is inside the zone and bone dry.',
      },
      {
        steps: '18–23',
        text: 'What sets each edge, the conservative and optimistic prescriptions side by side, and the same comparison run on the live Solar System. Ends with an inverse-square calculation for Venus.',
      },
      {
        steps: '24–28',
        text: 'Orbits. A circular year gives a flat starlight curve; an eccentric one does not. Students watch the planet cross a zone boundary and interpret the fraction of the year spent inside.',
      },
      {
        steps: '29–32',
        text: 'TRAPPIST-1, with the real measured luminosity: a prediction, the diagram, the live seven-planet simulation, and a measurement screen where students take the readings themselves instead of being told the answer.',
      },
      {
        steps: '33–37',
        text: 'The turn. Does being inside the zone establish anything about the planet? Three candidates with similar insolation and different everything else, a follow-up-target choice, an unfamiliar case, and the synthesis.',
      },
    ],
    features: [
      {
        name: 'Insolation panel (steps 2, 4, 5)',
        text: 'A distance slider with presets at 0.5, 1 and 2 AU. The bar is proportional all the way down, so the falloff past 1.5 AU is visible rather than bottoming out. Step 5 carries the panel and the plot together, so no value has to be remembered from a previous screen.',
      },
      {
        name: 'Automatic plot (step 5)',
        text: 'The three recorded readings plot themselves. The validator checks that starlight × distance² is the same for every row and says so when it is, which is the inverse-square law appearing in the student’s own numbers before it is named.',
      },
      {
        name: 'Spreading panel (step 7)',
        text: 'One spherical shell at a time, with a fixed cone of starlight landing on it. As the distance goes out the patch of light grows while the energy in it does not. The readout spells out the arithmetic: the shell is 9× bigger, so each square meter gets 1/9.',
      },
      {
        name: 'Star panel (steps 10, 12)',
        text: 'Four real main-sequence stars from a faint red dwarf to five solar luminosities. The distance axis rescales with the star, which is deliberate and labeled: a red dwarf’s zone and a bright star’s zone differ by a factor of fifty.',
      },
      {
        name: 'Live Solar System with the zone drawn (steps 15, 21)',
        text: 'The main simulation, not a diagram: the Sun with Venus, Earth, Mars and Ceres on their real orbits, and the habitable zone rendered from the Sun’s own luminosity and temperature by the same module the panels use. Step 21 runs the identical system on the optimistic definition, so the inner edge visibly jumps inward while nothing else changes.',
      },
      {
        name: 'Boundaries panel (steps 18, 19)',
        text: 'Draws both the conservative and optimistic bands at once, the selected one filled and the other outlined, so switching shows exactly what moved.',
      },
      {
        name: 'Orbit panel (steps 24, 26, 27)',
        text: 'Solves Kepler’s equation, so the planet genuinely races through periapsis and crawls through the cold outer year. The starlight graph underneath is synchronized to the planet by a moving marker. Run/Pause and Reset are underneath.',
      },
      {
        name: 'TRAPPIST-1 panel (steps 30, 32)',
        text: 'All seven planets with alternating leader lines so seven labels on a compressed axis cannot collide. Planets inside the zone get a ring as well as a color, so the distinction does not depend on seeing color. Step 32 puts the panel beside a set of entry fields and has students take the readings themselves.',
      },
      {
        name: 'Live TRAPPIST-1 (step 31)',
        text: 'The real system in the simulation at about thirty times the zoom of the Solar System steps, with the zone ring drawn at the same scale as the orbits. The object inspector is unlocked for this one screen, so students can click a planet and read a period the gravity solver produced rather than one typed in. The ring label states that the star is cooler than the published fit covers.',
      },
    ],
    misconceptions: [
      {
        claim: 'Twice as far means half as much light.',
        response:
          'The commonest wrong answer at step 3, and worth collecting before step 4 rather than after. The light spreads over a surface, not along a line: four times the area, a quarter as much. Step 7 is the picture of why.',
      },
      {
        claim: 'Habitable means inhabited.',
        response:
          'Step 33 asks this directly. The zone is calculated from the star alone and says nothing about any planet in it. Watch for students using "habitable" and "inhabited" interchangeably in discussion and correct it each time.',
      },
      {
        claim: 'Every star has a habitable zone near 1 AU.',
        response:
          'Steps 12 and 13 are built to break this. One AU is Earth’s distance from one particular star. Around TRAPPIST-1 the zone sits near 0.03 AU, which students see running live at step 31.',
      },
      {
        claim: 'A planet in the green ring is Earth-like.',
        response:
          'The zone constrains one quantity, incident starlight. Step 34 gives three planets with the same insolation and very different prospects. Mars at step 15 is the version of that comparison students can see with their own eyes: inside the zone, and frozen.',
      },
      {
        claim: 'The habitable zone is a physical region of space.',
        response:
          'It is a calculated range of orbital distances, drawn as an overlay. Nothing is there. The lesson says so at step 12 and again at step 15, where the ring is visibly sitting in empty space, and the wording is worth repeating aloud.',
      },
      {
        claim: 'A planet that leaves the zone freezes immediately.',
        response:
          'Step 28 targets this. Atmospheres and oceans carry enormous heat and take a long time to change temperature. The fraction of the year inside the zone is a flag, not a forecast of the surface.',
      },
      {
        claim:
          'The optimistic definition is the one that finds more habitable planets.',
        response:
          'Step 22 is the counterexample. Widening the Sun’s zone from 0.98–1.69 AU to 0.75–1.77 AU brings in no additional Solar System world: Venus at 0.72 AU still misses the wider inner edge, by 0.03 AU. Which definition a paper uses matters for how a result is stated, not for how many planets exist.',
      },
    ],
    teachingNotes: [
      'Collect the prediction at step 3 before anyone touches the slider. "Half" is the answer most students give, and the value of step 4 depends on them having committed to it.',
      'Step 5 puts the instrument and the plot on one screen. Students who typed a distance into a starlight field get a specific warning from the validator; point them at it rather than at the answer.',
      'At step 7, have students say the area out loud at each distance before reading the third line of the readout. The sequence 1, 4, 9, 16 is the whole lesson, and it lands better spoken than read.',
      'Step 8 asks for 1/9. A student who types 0.33 has divided by three instead of nine.',
      'At step 12 the distance axis rescales when the star changes. Say this out loud: a class that reads the pixels instead of the axis will conclude that all four zones are the same size.',
      'Step 15 is the first time the lesson leaves the panels and uses the simulation itself. Give it a minute of quiet looking before asking anything. Most students will find Mars inside the ring on their own, and the surprise is worth having.',
      'Step 17 is the only written answer in the lesson. The model answer unlocks once a student has written about forty characters, so let them commit before pointing at the button. Collect a few answers aloud before anyone reveals it.',
      'Step 19 is worth doing as a class. The conservative-versus-optimistic distinction is the one place where students see that a published number depends on stated assumptions, and it transfers well beyond this topic.',
      'Steps 26 and 27 need a full lap before the fraction means anything. Students often pause too early.',
      'Step 31 unlocks the object inspector. Expect a minute of clicking; that is the point. TRAPPIST-1b should read about 1.5 days and h about 19 days, and those come out of the integrator rather than a table.',
      'Step 32 replaces what used to be a multiple choice. Students who write 4.18 for planet e have read the wrong row; the validator names the fields that are off rather than giving the values.',
      'Step 33 is the hinge of the whole investigation. If time is short, cut something from the first half rather than rushing steps 33 to 37.',
      'Step 35 has a defensible answer, but a student arguing for A or C with a good reason has understood the lesson. Reward the reasoning.',
    ],
    discussion: [
      'Mars is inside the conservative habitable zone and has no liquid water. What would have to be different about Mars for the zone’s promise to hold?',
      'The habitable zone is defined by liquid water. What does that assumption rule out, and why do astronomers make it anyway?',
      'Venus and Earth are nearly the same size and receive starlight within a factor of two of each other. Why are their surfaces four hundred degrees apart?',
      'The optimistic inner edge is set by Venus itself, and Venus sits 0.03 AU inside it. Is a definition calibrated on one example a strong definition or a weak one?',
      'Red dwarfs are by far the commonest stars, and their habitable zones are very close in. What might that closeness do to a planet, and does it rule it out?',
      'A press release calls a newly found planet "potentially habitable". What has actually been measured, and what has not?',
      'If you had one spectrum of one exoplanet, what would you most want to look for, and why?',
    ],
    extensions: [
      'Have students look up a real planet from the NASA Exoplanet Archive, find its host star’s luminosity and its semi-major axis, and place it against the zone themselves.',
      'Open the Habitable Zone Lab scenario outside the lesson, change the Sun’s mass, and watch the zone move. Ask what would happen to Earth if the Sun were ten percent more luminous, which it will be in about a billion years.',
      'Ask why a tidally locked planet is not automatically uninhabitable, and what an atmosphere would have to do for it to work.',
      'For students ready for it: the zone edges scale as the square root of luminosity, but luminosity itself scales steeply with stellar mass. Work out how the zone distance depends on mass, and why that makes low-mass stars such awkward hosts.',
    ],
    modelNotes: `The habitable-zone boundaries come from the Kopparapu et al. (2013) prescription with
      the 2014 erratum coefficients, evaluated from each star’s luminosity and effective temperature.
      The same module draws the ring in the live simulation and the bands in the lesson panels, so a
      student who reads 0.98 AU off a panel and then looks at the ring on screen is looking at one
      calculation drawn twice. Measured stellar luminosities are used wherever a scenario carries one,
      which matters most for TRAPPIST-1: a mass-luminosity relation would put its zone out by more than
      a factor of four. Below 2,600 K the polynomial is evaluated at its own lower limit rather than
      extrapolated, and the ring says so on screen. The orbital instruments solve Kepler’s equation
      analytically rather than integrating, so the timing of an eccentric year and the fraction spent
      inside the zone are exact. Nothing in this investigation models a climate: the zone is a
      statement about incident starlight against limits from a published model, and the lesson is
      careful to say so.`,
    expectations: {
      4: 'At 0.5, 1 and 2 AU the panel reads 4.00, 1.00 and 0.25 Earths. These are exact by construction, not rounded.',
      5: 'The three pairs should be (0.5, 4), (1, 1) and (2, 0.25). The validator confirms starlight × distance² is constant and says the relationship has appeared in the student’s own numbers; it warns if the rows do not sit on one curve, which almost always means a value was read at the wrong distance.',
      7: 'The shell areas read 1×, 4×, 9× and 16× at 1, 2, 3 and 4 AU, and the third line of the readout gives 1, 0.25, 0.111 and 0.063 Earths. The last line never changes: the total energy crossing the shell is the same at every distance.',
      10: 'At a fixed 1 AU: the red dwarf gives 0.0015 Earths, the orange dwarf 0.34, the Sun 1.00, the brighter star 5.1. The starlight equals the luminosity exactly, because the distance is 1 AU.',
      12: 'Conservative zones: red dwarf 0.042 to 0.080 AU, Sun 0.98 to 1.69 AU, brighter star 2.11 to 3.58 AU. A factor of about fifty between the extremes.',
      15: 'The ring runs from 0.98 to 1.69 AU. Venus at 0.72 AU sits inside the inner edge and Ceres at 2.77 AU well beyond the outer one, so Earth and Mars are the two worlds inside. Mars being inside is the point of the screen and is worth waiting for a student to notice.',
      19: 'Around the Sun the conservative zone is 0.98 to 1.69 AU and the optimistic zone is 0.75 to 1.77 AU. The inner edge moves much further than the outer one, which surprises most students.',
      21: 'The inner edge visibly jumps inward from 0.98 to 0.75 AU while the outer barely moves, 1.69 to 1.77. Venus at 0.72 AU is still outside it, by about 0.03 AU. The census of the Solar System does not change: Earth and Mars, on either definition.',
      24: 'On a circular orbit the starlight graph is a flat line. That is the observation the next prediction depends on.',
      26: 'At a = 1.2 AU and e = 0.45 the planet swings between 0.66 and 1.74 AU, receiving 2.30 and 0.33 Earths. The starlight peak is narrow and the trough is wide, because the planet moves fastest at periapsis.',
      27: 'At e = 0.45 the planet spends about 56% of its year inside the conservative zone; at e = 0.3 about 78%; on a circular orbit at the same semi-major axis, 100%.',
      30: 'Insolations: b 4.18, c 2.22, d 1.11, e 0.65, f 0.37, g 0.25, h 0.14 Earths. The conservative zone runs 0.0254 to 0.0499 AU, putting e, f and g inside. Switching to optimistic brings d in as well.',
      31: 'The whole system fits inside the ring plus a little either side. Orbital periods from the inspector: b about 1.5 days, c 2.4, d 4.0, e 6.1, f 9.2, g 12.4, h 18.8. TRAPPIST-1b completes about twelve laps for each one of h.',
      32: 'e 0.65, f 0.37, g 0.25 Earths, with the zone running 0.0254 to 0.0499 AU. The validator accepts anything within five percent and names the specific fields that are off, so a student who has read the wrong row is told which one rather than being given the value.',
      34: 'All three candidates receive close to one Earth of starlight and all three are inside the zone. The differences are atmosphere, size and stellar activity.',
    },
  },
  'butterfly-effect': {
    topic: 'Deterministic chaos and the limits of prediction',
    difficulty: 'Introductory',
    placement:
      'After Newtonian gravity and orbits, and after students have run at least one two-body scenario. It needs no calculus and no differential equations, only logarithms. It works particularly well immediately after a unit on the two-body problem, because the whole lesson is built on the contrast: the one problem that is solved exactly, against the one next door that is not.',
    overview:
      'The lesson is four measurements in a fixed order, and the order is the argument. First, two identical runs, which come out identical to the last decimal and establish that the engine is deterministic - so nothing later can be blamed on randomness. Second, a two-body system given a tiny nudge, which comes apart steadily in proportion to time; the instrument refuses to call this chaos and says why, which is the single most transferable idea in the lesson. Third, the same nudge in a three-body system, which comes apart exponentially, and the students measure the e-folding time. Fourth, the same comparison repeated with a smaller timestep and a different integrator, which is what turns the result from a property of the software into a property of the physics. It closes on the claim that "three bodies means chaos", which is false, and on the difference between a classroom estimate and a Lyapunov exponent.',
    priorKnowledge: [
      'Newtonian gravity and orbital motion at a qualitative level',
      'What a logarithm is, and that a straight line on a log axis means exponential growth',
      'That a simulation advances time in discrete steps',
      'Helpful but not required: having seen the Binary Pair scenario before',
    ],
    keyConcepts: [
      {
        heading: 'Deterministic is not the same as predictable',
        body: 'The equations fix the future completely from the present, which is why two runs from identical numbers are identical. Prediction additionally requires knowing the present, and knowledge of the present is always approximate. In a chaotic system that approximation grows exponentially, so a perfectly deterministic system becomes unpredictable in practice. Students who miss this distinction usually think the computer is adding noise; the reproducibility control at step 4 is there to close that door before it opens.',
      },
      {
        heading: 'Exponential growth, not merely growth',
        body: 'Two nearly identical two-body orbits also separate, because a small change alters the period slightly and the two runs drift out of phase. That separation grows in proportion to time. Chaos means the separation grows by a fixed factor per unit time, which is a different function and looks different on a log axis. The lesson measures both cases with the same instrument so the comparison is direct.',
      },
      {
        heading: 'An e-folding time, and what it buys',
        body: 'The fitted slope of log(separation) against time gives a timescale tau on which errors grow by a factor of e. Its practical meaning is the cruel one: improving the initial measurement by a factor f buys only ln(f) extra e-folding times. A thousandfold better measurement buys about seven. This is why long-range prediction of a chaotic system is impossible rather than merely difficult.',
      },
      {
        heading: 'Numerical refinement as evidence',
        body: 'A computed divergence is only physical if it survives being computed better. The lesson requires the comparison to be repeated at a smaller timestep and with a different integrator, and the widget reports the spread. If the answers disagree, the correct report is "numerically unresolved" and no number at all - not the average, and not the value from the fanciest integrator.',
      },
    ],
    flow: [
      {
        steps: '1–5',
        text: 'The three-star lab, introduced, then the reproducibility control: two runs changing nothing, which come out identical. Establishes determinism before anything diverges. Ends by asking what exactly zero proves, and the answer is narrower than most students expect.',
      },
      {
        steps: '6–10',
        text: 'The two-body control. The Binary Pair scenario given a 1,500 km nudge separates steadily and linearly; the instrument declines to report an e-folding time and says the growth is proportional to time. This is the section to protect if time is short.',
      },
      {
        steps: '11–17',
        text: 'The three-body case. Lagrange\u2019s equilateral solution, Gascheau\u2019s stability criterion, and why three equal masses make it unstable. Students measure the e-folding time from the shaded log-linear interval and work out the predictability horizon and what improving the measurement buys.',
      },
      {
        steps: '18–21',
        text: 'The numerical control. Repeat at half the simulation speed and with a different integrator, record each, and read the refinement verdict. Includes the hypothetical of an unresolved result and what to report about it.',
      },
      {
        steps: '22–28',
        text: 'What chaos is not: the Trojan asteroids and the figure-eight orbit as stable three-body configurations, a sorting question, a short-answer synthesis, a free exploration of perturbation size, then the real-world reach of the result, the sources, and the summary.',
      },
    ],
    features: [
      {
        name: 'The divergence instrument (steps 4, 8, 13, 20, 25)',
        text: 'Reads the two runs out of the A/B Bench, computes the separation between them at each moment of simulated time, and plots it on linear and logarithmic axes. It classifies the behaviour - identical, bounded, linear, exponential - and quotes an e-folding time only when the log-linear fit clears its thresholds: at least three e-folds of range, at least ten points, r-squared of at least 0.98, and a window spanning at least two e-folding times. The fitted interval is shaded on the plot, so the estimate is never shown without the data it came from. It also always reports how well a straight line fits, which is what separates drift from chaos.',
      },
      {
        name: 'The A/B Bench',
        text: 'Provides the capture, the exact restore and the paired recording. The perturbation is applied to the captured state rather than to the live simulation, so it is stored with the experiment, printed in the report and carried in a share link. Students who have not met the bench before will need a few minutes on steps 3 and 4.',
      },
      {
        name: 'The Three-Body Sensitivity Lab scenario',
        text: 'Three six-solar-mass stars on Lagrange\u2019s equilateral solution, circumradius 0.5 AU, rotating once per 26.7 simulated seconds. Star merging is off and the bodies never come within eight times the sum of their drawn radii, so nothing is removed mid-experiment and the divergence measure keeps all three identities for the whole run.',
      },
    ],
    misconceptions: [
      {
        claim: 'Chaos means the simulation is adding randomness.',
        response:
          'Step 4 settles this before the argument starts: two runs from identical starts are identical to every decimal place. If a student still says this later, send them back to that measurement rather than arguing.',
      },
      {
        claim: 'Any two runs that come apart show chaos.',
        response:
          'The two-body control at step 8 comes apart by a factor of about a hundred and is not chaotic. The distinguishing feature is the shape - proportional to time versus a fixed factor per unit time - which is why the instrument reports the straight-line fit alongside the exponential one.',
      },
      {
        claim: 'The divergence is just accumulated rounding error.',
        response:
          'A fair objection, and the reason steps 18 to 21 exist. The answer is refinement: the e-folding time is unchanged when the timestep is halved and when the integrator is swapped. Worth noting that the objection is right about some systems - two of the configurations considered for this lab failed exactly this test and were rejected.',
      },
      {
        claim: 'Every three-body system is chaotic.',
        response:
          'Step 22. Jupiter\u2019s Trojans sit at a stable equilateral configuration and have for billions of years, and the Chenciner-Montgomery figure-eight orbit is a stable three-body solution with equal masses. Chaos is a property of a configuration, not of a body count.',
      },
      {
        claim: 'A bigger perturbation makes the system more chaotic.',
        response:
          'Step 25 is the experiment that settles it. Changing the perturbation size moves the horizon - when the runs become visibly different - and leaves the growth rate alone. The rate belongs to the system.',
      },
      {
        claim: 'The measured number is the Lyapunov exponent.',
        response:
          'It is an estimate of a local growth rate over a finite window from one perturbation in one direction. The true exponent is an infinite-time limit averaged over the attractor. Step 26 says this explicitly; it is worth repeating aloud, because the distinction is exactly the kind that gets lost between the lab and the write-up.',
      },
    ],
    teachingNotes: [
      'Steps 4 and 8 are the lesson. If the room is short of time, cut from steps 22 to 25, never from the reproducibility control or the two-body case: without them the three-body result is a light show rather than an argument.',
      'Budget generously for step 3. Most students meet the A/B Bench here for the first time, and the capture-record-restore cycle takes a couple of attempts to become automatic. Demonstrating it once on the projector saves fifteen minutes across a class.',
      'Runs of about forty seconds are enough. Longer runs do not improve the measurement - the separation saturates once the stars have rearranged - and the instrument will simply exclude the flat tail from the fit.',
      'A common failure at step 13 is recording two runs of very different lengths, which shrinks the overlap the instrument can compare. The widget reports the overlap it used; point students at that line rather than at their result.',
      'At step 20, insist that only one thing changes at a time. A student who halves the speed and switches integrator together has run a valid experiment about neither.',
      'The theoretical e-folding time for this configuration is sqrt(2)/n = 6.0 simulated seconds. Measured values come out around 6.9. That 15% gap is honest and worth discussing: the fit covers a finite window, the perturbation is finite rather than infinitesimal, and the unstable eigenvalue has an oscillatory part the fit averages over.',
      'If a class is comfortable with logarithms, step 17 is the place to slow down. The result that error reduction buys time only logarithmically is the single most useful thing in the lesson for anyone who will later meet weather models, ephemerides or orbit determination.',
    ],
    expectations: {
      4: 'About a minute of running from one button. The separation should read exactly zero for the whole run and the instrument should report "the two runs are identical". The section reports both intervals - 40.0 simulated seconds each, against 40 asked for - and says in as many words that nothing was changed between the runs. Any nonzero value means something was; the parameter-difference line will name it. This is also the moment to point out that the runs are compared on simulated time, not wall-clock time.',
      8: 'A growth factor of order 100 over four or five orbits, a straight-line fit around r-squared 0.99, and no e-folding time. The instrument should say the separation is growing in proportion to time. Students often read the refusal as an error; it is the result. The section names the nudge - 1500 km along x - as the only difference between the runs, which is worth reading aloud before the result.',
      13: 'The guided pair runs a defined forty seconds at a defined step, so this is now the same for everyone: an e-folding time of 8.33 simulated seconds, r-squared 0.991, growth about 220, fitted between t = 5.3 and t = 29.3. The shaded band on the log plot marks that interval. Reproducibility is the change worth noticing here - two students who disagree have loaded different scenarios, not made different measurements.',
      14: 'Expect tau 8.3 s, r-squared 0.99 and growth about 220. Values of tau outside 7 to 9 mean the wrong run or the wrong scenario rather than a physics error. The field validation warns rather than blocks, so a student can record an unexpected number and discuss it.',
      20: 'Two controls, about a minute each, and the three e-folding times should agree far better than the twenty per cent the verdict allows. Measured: 8.333 s at the shipped step with symplectic Euler, 8.322 s at half that step, 8.314 s with velocity Verlet - a spread of 0.1 per cent, reported as resolved. Two things to check if it does not read that way. Wild disagreement means something else changed as well, and the parameter diff will name it. A verdict that says the repeats did not change the arithmetic means the same control was run twice: the section refuses to count agreement between two identical calculations, which is a point worth making out loud. Note also that the step control halves the MEASURED step rather than the setting - this lab ships with no cap at all, so halving the setting would have halved nothing.',
      25: 'The e-folding time should be essentially unchanged by a smaller or larger perturbation; what moves is the time at which the two runs become visibly different, and it moves by ln(factor) times tau. A perturbation ten times smaller buys about sixteen extra seconds and no more.',
    },
    discussion: [
      'The simulation is exactly reproducible and its long-term behaviour cannot be predicted. Where exactly does the unpredictability live, if not in the equations?',
      'Weather forecasts are useful for about a week. What would have to be true for them to be useful for a month, and is it achievable in principle?',
      'If improving your measurement by a factor of a thousand buys seven e-folding times, what does that say about the value of ever more precise initial data for a chaotic system?',
      'The two-body problem is exactly solvable and the three-body problem is not. Is that a fact about the universe or a fact about mathematics?',
      'Jupiter\u2019s Trojan asteroids sit in a three-body configuration that has been stable for billions of years. What distinguishes their situation from the one measured in this lesson?',
    ],
    extensions: [
      'Have students estimate the Lyapunov time of the inner Solar System from published values (a few million years) and work out the corresponding predictability horizon for planetary positions. Compare with the age of the Solar System.',
      'Ask students to design a configuration they predict will not be chaotic, build it in the sandbox, and test it with the same paired-run method. A hierarchical triple with a distant third body is the usual attempt, and it is a productive near-miss.',
      'Repeat the three-body measurement with unequal masses - one star much heavier than the other two - and see whether Gascheau\u2019s inequality predicts the outcome correctly.',
      'For a class that has met numerical methods: compare the energy drift reported in the readout across the three integrators over the same run, and connect it to why symplectic integrators are preferred for long orbital integrations even though RK4 is locally more accurate.',
    ],
    modelNotes:
      'The scenario is Lagrange\u2019s equilateral solution of the three-body problem with three equal masses of 6 solar masses at a circumradius of 0.5 AU, rotating at the exact rate omega = sqrt(G*3m/L^3) = 0.2354 rad per simulated second. It is linearly unstable by Gascheau\u2019s criterion, and the theoretical e-folding time of the unstable mode is sqrt(2)/omega = 6.0 simulated seconds. The divergence measure is the configuration-space separation between the two runs, sqrt(sum over bodies of |r_A - r_B|^2), with bodies matched by their stable object identities and samples aligned by simulated time; a normalised phase-space version including velocities gives the same growth rate to better than one per cent. The fit thresholds are in js/chaos/divergence.js and are deliberately strict, because a confidently wrong Lyapunov number is worse than none. Two other classic configurations were tested against this engine and rejected: the Pythagorean (Burrau) problem, whose close approaches trigger a merger and remove a body, and a near-figure-eight triple, whose e-folding time moved by orders of magnitude between integrators. Both rejections are recorded in the comment above the scenario in js/ui.js.',
  },
  tides: {
    topic: 'Gravity and tides',
    difficulty: 'Introductory',
    placement:
      'Immediately after Newtonian gravity and the inverse-square law have been introduced, and before or instead of a lecture treatment of tides. It also works late in the term as the bridge between everyday gravity and compact objects, since the last third is a tidal disruption event done honestly.',
    overview: `Students build the whole subject out of one subtraction. They look at the gravitational
      pull the Moon exerts on three points of the Earth, notice the three numbers differ by about seven
      percent, subtract the pull on the centre, and discover the two bulges falling out of the arithmetic
      rather than being asserted. They then measure both scaling relationships themselves - one power of
      companion mass, three powers of separation - and use them to predict, correctly, that the Moon beats
      the Sun. The second half turns the same difference against a body's own gravity, which produces the
      Roche limit as a competition the student sets up rather than a formula they are handed, and closes on
      a tidal disruption event with the approximations stated out loud. The single most important outcome
      is that "tides are caused by strong gravity" is replaced by "tides are caused by unequal gravity".`,
    priorKnowledge: [
      'That gravity weakens with distance, and ideally that it does so as an inverse square',
      'That the Moon orbits the Earth, and that the Earth and Moon both orbit under mutual gravity',
      'Reading a value off a slider-driven panel and plotting a point',
      'Cubing a number on a calculator. No algebra is derived and no calculus is used',
    ],
    keyConcepts: [
      {
        heading: 'A tide is a residual, not a force',
        body: `The body as a whole accelerates at the rate the pull on its centre of mass dictates, and
          carries everything in it along at that rate. What deforms the body is the local acceleration
          minus the centre's. On the near side that residual points toward the perturber; on the far side
          it points away, because the far side is pulled less than average and so lags behind the shared
          motion. Nothing pushes the far side. This framing - free fall, then subtract - is what makes
          the two bulges obvious instead of paradoxical, and it is worth insisting on the word
          "difference" every time the class says "tide".`,
      },
      {
        heading: 'One power of mass, three of distance',
        body: `The tidal acceleration across a body of radius R at separation d from a mass M is about
          2GMR/d³. Students measure the M and the d dependences separately in steps 10 and 14 and never
          see the expression until step 12. The inverse cube is the surprising half: an inverse-square
          pull differenced across a small offset picks up one extra power of distance. The practical
          consequence, which is the through-line of the whole second half, is that proximity beats mass
          decisively. The Sun outweighs the Moon by 27 million and loses the tidal contest by a factor
          of 2.2.`,
      },
      {
        heading: 'The Roche limit is a competition, not a radius',
        body: `Setting the tidal stretch at a body's surface equal to that body's own surface gravity
          gives d = 2^(1/3)·R_sat·(M/m)^(1/3), which is exactly the classical rigid Roche limit. Written
          with densities it is the more familiar 1.26·R_primary·(ρ_primary/ρ_sat)^(1/3). The satellite's
          radius cancels: doubling a moon's size doubles both the stretch across it and its own surface
          gravity. What survives is the primary's mass and the satellite's density, which is why there
          is no single Roche radius for a planet and why step 25 asks for exactly that.`,
      },
      {
        heading: 'Rigid and fluid limits bracket a real answer',
        body: `A deformable body stretches as it approaches, which lengthens the lever the tide acts on,
          so it disrupts further out than a body that holds its shape. The fluid coefficient is about
          2.44 against the rigid 1.26, so the two limits differ by nearly a factor of two. The gap is
          physics, not error bars, and the lesson draws both arcs rather than one line. Below the scale
          where self-gravity dominates, material strength takes over entirely and the argument does not
          apply at all: a boulder is safe at any distance.`,
      },
    ],
    flow: [
      {
        steps: '1–8',
        text: 'The Earth-Moon system live, then the three-arrow panel. Students see that the pulls differ by seven percent, predict why there are two bulges, and are shown the subtraction that produces them. Ends with the definition of a tide as a difference.',
      },
      {
        steps: '9–15',
        text: 'The two scaling relationships, each predicted and then measured. Four distances give the inverse cube (with a straighten-the-curve transform on the plot); three masses give simple proportionality. The expression 2GMR/d³ appears at step 12, after the distance measurement and before the mass one.',
      },
      {
        steps: '16–19',
        text: 'Applying both relationships. Students predict the Sun-versus-Moon contest, read seven real tides off a logarithmic comparison chart, meet tidal locking and heating conceptually, and write the far-side bulge in their own words.',
      },
      {
        steps: '20–26',
        text: 'Disruption. Stretch is set against a body’s own surface gravity as two bars, the crossing point is measured and named as the Roche limit, the material is varied to show the limit moving, and a full screen is given to what a Roche limit does not predict.',
      },
      {
        steps: '27–30',
        text: 'The extreme case: the live tidal disruption scenario with its modelling honestly described, the tidal-radius-against-horizon panel and the hundred-million-solar-mass crossover, then the written synthesis and the summary.',
      },
    ],
    features: [
      {
        name: 'The three-arrow panel (steps 3, 6)',
        text: 'The centrepiece. At step 3 it draws the three pulls in true proportion, which makes them look identical on purpose; at step 6 it adds a second row showing what is left after the centre is subtracted, and states the magnification factor between the rows on the panel. Students who see only the second row learn a diagram; the pairing is what teaches the mechanism.',
      },
      {
        name: 'Straighten-the-curve transform (step 10)',
        text: 'The distance plot offers a "Try 1 ÷ distance³" button. Points that curve away sharply drop onto a straight line through the corner. This is where most classes recognise the inverse cube, and it is worth pausing on as a general method for identifying a power law.',
      },
      {
        name: 'The two-bar balance (steps 21, 22)',
        text: 'Green is the body’s own surface gravity, red is the tidal stretch. The distance slider moves only the red bar and the density slider only the green one, so the competition is easy to reason about. The crossing point the student finds is the Roche limit, and it is named only after they have measured it.',
      },
      {
        name: 'The Saturn Roche panel (steps 23, 24)',
        text: 'Two arcs, one for a body with no strength and one for a body that keeps its shape, against Saturn’s real ring geometry. Changing the density moves both arcs a long way, which is the argument that a Roche limit is not one distance. At high density the inner arc falls inside Saturn and the panel says so in words rather than clipping it.',
      },
      {
        name: 'Tidal radius against horizon (step 28)',
        text: 'A logarithmic drawing of the two lengths as the black hole mass runs from ten to a billion solar masses, with presets for a stellar-mass hole, Sagittarius A*, and a giant where the star is swallowed whole. The crossover near 1.6 × 10⁸ solar masses is stated on the panel.',
      },
    ],
    misconceptions: [
      {
        claim: 'Tides are caused by the Moon’s gravity being strong.',
        response:
          'They are caused by it being unequal. The single best counterexample is in the lesson at step 16: the Sun pulls the Earth about 180 times harder than the Moon does and raises less than half the tide. If a class takes away only one correction, this is the one.',
      },
      {
        claim:
          'The Moon pushes on the far side of the Earth, or gravity reverses there.',
        response:
          'Step 7 tests this directly. The far side is pulled toward the Moon like everything else, just less than the centre is, so relative to the planet’s shared free-fall motion it lags. The outward arrow is what is left after a subtraction, not a force. Watch for students who accept the arithmetic and still narrate a push.',
      },
      {
        claim:
          'The far-side bulge is centrifugal force from the Earth’s rotation.',
        response:
          'This one is stubborn because it appears in older textbooks. Two bulges appear for a non-rotating Earth held at a fixed distance too. Rotation is what carries an observer through the bulges twice a day; it is not what creates them. Offer the thought experiment of an Earth that does not spin.',
      },
      {
        claim:
          'Halving the distance quadruples the tide, because gravity is inverse-square.',
        response:
          'It multiplies it by eight. The pull does go as the inverse square, but the tide is a difference between two pulls, and closing in makes the two distances differ by a larger fraction as well as making both pulls stronger. Step 9 collects the wrong prediction on purpose and step 10 refutes it with the student’s own table.',
      },
      {
        claim:
          'The Roche limit is a fixed radius around a planet, inside which everything is destroyed.',
        response:
          'It depends on the density of what is falling in as well as on the planet, and there are two of them, bracketing rigid and deformable behaviour. Step 24 moves the limits by changing only the material. Step 26 adds that small bodies held together by material strength are exempt entirely.',
      },
      {
        claim: 'Crossing the Roche limit makes a body explode.',
        response:
          'Disruption takes time and sheds material from the ends first. Shoemaker-Levy 9 passed inside Jupiter’s limit in 1992 and became a line of about twenty fragments rather than a cloud. Step 26 is built around this, and it is the natural place to show the Hubble image if you have it.',
      },
    ],
    teachingNotes: [
      'Steps 3 and 6 are the lesson. If the room is short of time, cut from the middle third, never from here. Consider projecting step 6 and doing the subtraction out loud with the class before letting them work on.',
      'Step 5 collects the wrong prediction deliberately. Do not correct it in the room before step 6; the commitment is what makes the reveal land, and predictions are never graded on correctness.',
      'Step 10 is the longest screen. Four rows is the target but two are enough for the transform to work, so a student who is behind should be told to fill two and press the transform button rather than to hurry through four.',
      'Step 12 introduces 2GMR/d³ after both the prediction and the distance measurement. Students who have seen the expression before will want to skip ahead to it; the measurement is worth more than the formula and is where the retention is.',
      'Step 19 is the first written answer and the one worth grading by hand. The discriminator is whether the student compares the far side with the centre. "It is pulled less" alone is only half the answer.',
      'Step 27 runs the live disruption scenario. Expect students to over-read it. The screen says explicitly that Gravitas sheds debris by a rule rather than computing fluid flow, and it is worth repeating that out loud, because this is the one place in the lesson where the picture is more dramatic than the physics behind it.',
      'Step 29 is the summative written answer and maps directly onto the three learning objectives about cause, scaling and disruption. It grades quickly against the rubric.',
    ],
    discussion: [
      'The Sun pulls the Earth about 180 times harder than the Moon does and raises less than half the tide. What does that tell you about the difference between a quantity and its gradient?',
      'Tidal locking means the Moon shows us one face. What would have to be true for the Earth to show the Moon one face as well, and how long would it take?',
      'Io is kept molten by being kneaded. Where else in the Solar System might tidal heating matter, and what would you look for as evidence?',
      'The largest black holes swallow Sun-like stars whole, so they produce no flare. How would you go about finding a black hole that never tears anything apart?',
      'A Roche limit needs two objects to be stated. What other astronomical "limits" turn out to be relationships between two things rather than properties of one?',
    ],
    extensions: [
      'Have students look up a tide table for a real coastline and identify the spring and neap cycle in it, then check the dates against the phases of the Moon. The agreement is good; the two-hour offsets from local geography are a useful second conversation.',
      'Ask for the Roche limit of the Earth for a body of a given density, worked by hand from d = 1.26·R_Earth·(ρ_Earth/ρ_body)^(1/3), and compare with what the panel at step 22 reports. It is one cube root and it closes the loop between the measurement and the textbook formula.',
      'For students with calculus: differentiate GM/r² with respect to r and show that the leading term of the difference across a small offset R is 2GMR/d³, which is where the factor of two and the extra power of distance come from.',
      'Look up the light curve of a real tidal disruption event and ask what part of it the Newtonian estimate in step 28 does and does not predict. The timing of the peak is roughly accessible; the luminosity is not.',
    ],
    modelNotes: `The tidal and Roche calculations in this lesson are computed in js/tidalPhysics.js from the
      masses and separations shown, using the standard Newtonian expressions, and they are unit-tested
      against published values: the lunar tide at 1.10 × 10⁻⁶ m/s², the Earth-Moon rigid and fluid Roche
      limits at about 9,500 and 18,400 km, and the swallow-whole black hole mass at 1.6 × 10⁸ solar masses.
      What the simulation itself does is Newtonian N-body integration of point masses. It does not deform
      bodies, does not model internal friction, and does not evolve rotation under tidal torques, so tidal
      locking is presented at step 18 as a conceptual account and explicitly labelled as one. In the live
      disruption scenario at step 27 the engine sheds debris particles from a body that passes inside a
      threshold radius and then integrates those particles normally; that is a rule producing a plausible
      geometry, not hydrodynamics. There is no fluid, no pressure, no shock heating and no radiative
      transfer anywhere in Gravitas, and the deformation drawn in the Roche panel is an illustration of the
      outcome rather than a calculation of it. Step 28 states the same caveat for the compact-object case,
      where general relativity would also matter near the horizon and is not used. Every one of these
      limitations is named on the screen where it applies rather than only here.`,
    expectations: {
      3: 'At a distance of 1.00 the three arrows are visually indistinguishable, which is the intended reaction. The readout gives 3.43 × 10⁻⁵, 3.32 × 10⁻⁵ and 3.21 × 10⁻⁵ m/s², and the last row reports the near side as 6.9% larger than the far side. Students who slide the distance down to 0.2 will see the arrows separate visibly, which is worth encouraging.',
      6: 'The residual row shows about 1.1 × 10⁻⁶ m/s² outward on each side, roughly a thirtieth of the pull itself, and the panel reports the magnification between the two rows. The centre shows a dot rather than an arrow, and students regularly ask whether that is a drawing error; it is the answer.',
      10: 'At mass 1, the readings should be 0.13, 1.00, 8.00 and 64.00 times the lunar tide at distances of 2, 1, 0.5 and 0.25. The validator checks that stretch × distance³ is the same for every row and warns at a spread above 35%, which almost always means a strength read at a different slider position from the distance beside it. The transformed plot straightens to a line through the origin.',
      14: 'At distance 1, the readings should be 1.00, 2.00 and 4.00 at masses of 1, 2 and 4. The validator checks that stretch ÷ mass is constant and warns if the distance slider was moved during the run, which is the only common failure here.',
      17: 'The seven bars run from 5.05 × 10⁻⁷ m/s² for the Sun on the Earth to 68 m/s² for a stellar-mass black hole on the Sun at three million km. The two comparisons worth drawing out are the Moon beating the Sun by 2.2, and the last two rows differing by 1.2 × 10⁵ for a fifty-fold change in distance alone.',
      21: 'At 5 Earth radii and lunar density the green bar dwarfs the red one and the verdict reads HOLDS TOGETHER. The bars become equal near 1.50 Earth radii. Comet ice moves the crossing out to about 2.64 Earth radii and iron brings it in to about 1.22, which is the observation step 25 depends on.',
      23: 'With porous ice at 600 kg/m³ the no-strength limit is 2.47 Saturn radii, or about 149,000 km, and the keeps-its-shape limit is 1.27 Saturn radii. The A ring’s outer edge is at 2.27 Saturn radii and Mimas at 3.08, so the rings sit inside the outer limit and the innermost round moon sits outside it. That is the payoff of the screen.',
      24: 'Both arcs move inward as density rises: the no-strength limit runs from 2.47 Saturn radii at 600 kg/m³ to 1.14 at 6,000. Above roughly 2,500 kg/m³ the keeps-its-shape limit drops below one Saturn radius and the panel reports it as being inside Saturn itself rather than drawing it.',
      27: 'Bodies on close passages shed debris that spreads along the orbit; bodies passing further out are untouched. Students will ask whether the streams are real. The answer to give is that the geometry is plausible and the mechanism is a threshold rule, not a fluid calculation, which the screen also says.',
      28: 'At ten solar masses the tidal radius is about 1.9 million km against a 29.5 km horizon, a ratio of 6.4 × 10⁴. At Sagittarius A* the ratio is about 11. The two meet near 1.6 × 10⁸ solar masses, and the billion-solar-mass preset reads SWALLOWED WHOLE.',
    },
  },
  'when-orbits-lock': {
    topic: 'Mean-motion resonance, and what counts as evidence for it',
    difficulty: 'Introductory',
    placement:
      'After Kepler’s laws and after students are comfortable with the idea that an orbit has a period and a shape. It sits naturally beside a unit on the Solar System’s architecture, and it is the obvious companion to any treatment of planetary migration or the asteroid belt. No calculus, no differential equations; the only new mathematical object is an angle built as an integer combination of other angles, and the lesson derives it rather than asserting it.',
    overview:
      'The lesson takes away the definition students will already have met - "the periods are in a small whole-number ratio" - and makes them find a replacement. It does this with a counter-example from the same system: Callisto’s period ratio with Ganymede is 0.03% from 7:3, ten times closer to a small ratio than Pluto’s is to 3:2, and Callisto is in no resonance at all. From there it builds the resonant angle, shows what libration and circulation look like, and applies the test to three real systems: the Galilean Laplace resonance, Pluto’s 3:2 with Neptune, and Jupiter’s Trojans as a 1:1 co-orbital. Each has a control alongside it that fails the test, so every positive result is paired with a negative one measured by the same instrument in the same run.',
    priorKnowledge: [
      'That an orbit has a period, and that the period depends on the size of the orbit',
      'That the planets and moons all go round in more or less the same plane and the same direction',
      'Comfort with degrees and with the idea of an angle wrapping round at 360',
      'Helpful but not required: having met the phrase "orbital resonance" before, correctly or otherwise',
    ],
    keyConcepts: [
      {
        heading: 'Small-integer ratios are cheap',
        body: 'There are about thirty fractions with denominator ten or less in any unit interval, so an arbitrary period ratio lands within a percent or two of one by accident. The lesson makes this quantitative rather than rhetorical: the instrument reports how much closer than chance each measured ratio is, and the largest figure in the whole investigation - twenty-five times closer than chance - belongs to Callisto, which is not resonant. Students should leave unable to accept a near-rational ratio as evidence on its own.',
      },
      {
        heading: 'A resonant angle, and why it is built the way it is',
        body: 'The physical question is whether conjunctions keep happening in the same place relative to the orbits. A combination like 3λ_outer − 2λ_inner − ϖ_outer answers it: if the periods are in a 3:2 ratio the two fast terms advance at the same rate and cancel, leaving a slow angle that tracks the conjunction geometry. The coefficients must sum to zero, which is not a convention but a requirement - a combination that does not sum to zero changes value when you rotate your coordinate axes, and would be measuring the frame rather than the orbits.',
      },
      {
        heading: 'Libration versus circulation',
        body: 'A resonant angle does one of two things. Circulation means it runs through all 360 degrees, the conjunctions take up every geometry in turn, and the perturbations average away. Libration means it swings about a fixed value and never completes a circuit, the conjunctions repeat, and the perturbations accumulate in the same sense. That is the lock, and it is the only evidence for one.',
      },
      {
        heading: 'The third answer, and why an instrument needs one',
        body: 'A short record of a slowly circulating angle and a short record of a slowly librating one are indistinguishable. The instrument therefore reports libration, circulation or inconclusive, and it is willing to stay inconclusive for the whole of a lesson-length run. When it does, it reports the bound it has established - "any circulation would take more than a thousand conjunction cycles" - which is a real result. Students often read the refusal as a malfunction; it is the most transferable idea in the lesson.',
      },
      {
        heading: 'The rotating frame',
        body: 'Nothing about the Trojans is visible from outside. In the inertial frame a Trojan traces the same orbit Jupiter does, and the fact that it stays 60 degrees ahead is invisible. Rotate with Jupiter and the tadpole draws itself. This is worth naming as a general move rather than a trick for this one case: choosing the frame in which the interesting quantity stands still is most of what makes a dynamical problem tractable.',
      },
    ],
    flow: [
      {
        steps: '1–7',
        text: 'The four Galilean moons. Students predict the Io–Europa ratio, measure all four periods, and meet the counter-example: the tidiest ratio in the system belongs to the moon that is not resonant. Ends on why small-integer ratios are dense enough to be worthless as evidence.',
      },
      {
        steps: '8–10',
        text: 'Conjunctions. A prediction most students get wrong - that line-ups cluster in a fixed direction in the sky - followed by the measurement showing they drift, and the explanation: the orbits themselves precess, so a direction in the sky is the wrong thing to measure.',
      },
      {
        steps: '11–16',
        text: 'The resonant angle, built from mean longitudes and longitudes of periapsis, then applied to the Laplace argument. The instrument moves through three verdicts as the run lengthens; students are told to start it and read on. Closes with the algebra showing that 180 degrees means the three moons are never all in conjunction.',
      },
      {
        steps: '17–21',
        text: 'The paired control and the awkward case. Europa moved one percent out and the argument circulates in forty-seven Io orbits. Then Callisto’s 7:3, which stays inconclusive for the whole run, and the question of what that establishes.',
      },
      {
        steps: '22–26',
        text: 'Pluto and Neptune. The crossing orbits, the 3:2, the libration measured in ninety seconds, the conjunctions clustered at Pluto’s aphelion, and the one line of algebra that connects the two. A third body on nearly the same orbit but outside the resonance circulates and is scattered.',
      },
      {
        steps: '27–31',
        text: 'The Trojans in the rotating frame: an exact equilibrium, a real tadpole libration, an unstable equilibrium that departs, and a non-co-orbital body whose ratio is closer to 7:5 than Pluto’s is to 3:2. The distinction between an equilibrium and a stable equilibrium is the target here.',
      },
      {
        steps: '32–33',
        text: 'The four cases sorted two ways - by how good the ratio is, and by whether they are resonant - which give different orders. Then a referee-style question about a paper that overclaims, and the closing survey: Kirkwood gaps, plutinos, Io’s volcanism, and resonant chains as evidence for migration.',
      },
    ],
    features: [
      {
        name: 'Measured periods and the ratios between them (steps 3, 4)',
        text: 'Measures each body’s period from its own orbit and averages over the whole record, so the numbers settle within a few orbits and are quoted to five figures. For each adjacent pair it reports the ratio, the nearest ratio of small whole numbers found by continued fractions, the percentage offset, and - the figure that matters - how much closer than chance that offset is. The continued-fraction search will find a ratio for any number at all, which is the trap the lesson springs.',
      },
      {
        name: 'The resonant angle (steps 14, 18, 20, 23, 31)',
        text: 'Plots the argument twice: wrapped into a single turn, where a circulating angle visibly visits every value, and unwrapped, where a circulation is a ramp and a libration is a wave. It classifies the record as libration, circulation or inconclusive, reports the centre, amplitude and period when it can, and reports the circulation period it has ruled out when it cannot. Short-period ripple is averaged over one conjunction cycle before the classification is made, because without that averaging a slowly drifting angle with a wobble reads as a tidy libration.',
      },
      {
        name: 'Conjunctions (steps 9, 25)',
        text: 'Every line-up in the run, plotted twice: by direction in the sky and by where the outer body was on its own orbit. Circular statistics, so the mean of 1 and 359 degrees is 0. The length of the arrow is how tightly the events cluster. For Pluto the second dial clusters at a true anomaly of 180 degrees, which is aphelion, and that is the protection mechanism seen directly.',
      },
      {
        name: 'The rotating frame (steps 28, 29)',
        text: 'The system as seen from a frame turning with the secondary, normalised so the secondary is at unit distance and L4 and L5 are exactly the corners of the equilateral triangles. Each body’s track is rebuilt from the record every frame rather than accumulated, so it is always drawn in the frame as it stands now.',
      },
      {
        name: 'The four scenarios',
        text: 'Galilean Resonance and Broken Laplace Resonance are a matched pair differing in one number. Pluto and Neptune and Jupiter Trojans are at true scale, so every distance and period the interface reports for them is the real one. The Jovian pair is a scale model - distances a hundred times life size, clock a thousand times faster - because Io’s orbit at true scale is smaller than Jupiter is drawn; the scenario summary says so, and every ratio, eccentricity and angle is untouched by it.',
      },
    ],
    misconceptions: [
      {
        claim:
          'The periods being in a small whole-number ratio is what a resonance is.',
        response:
          'Callisto, at step 5. Its ratio with Ganymede is 0.03% from 7:3 and it is in no resonance; Ganymede’s ratio with Io is 1.1% from 4:1 and the two are locked as tightly as anything in the Solar System. Sorting the four cases by ratio quality and by resonance gives different orders, which is step 32.',
      },
      {
        claim: 'The periods in a resonance are exactly commensurate.',
        response:
          'The measurement at step 3 gives 2.0075, not 2. A resonance holds a system near a commensurability, in a band of finite width; the width for Europa is about a part in a thousand, which the broken control at step 18 demonstrates by stepping ten times outside it.',
      },
      {
        claim:
          'A resonance means the bodies keep meeting, so they are in danger.',
        response:
          'Exactly backwards for Pluto, and this is the lesson’s best surprise. The resonance is what stops Pluto and Neptune meeting: it fixes where the conjunctions happen, and 180 degrees puts them at Pluto’s aphelion. Worth pairing with the Kirkwood gaps at step 33, where the same mechanism removes asteroids instead of protecting them - the difference is the geometry the libration holds.',
      },
      {
        claim:
          'The instrument saying "inconclusive" means something is broken.',
        response:
          'Step 15 exists for this and is worth reading aloud. Over a short record a slow circulation and a long-period libration are the same picture, and an instrument that picked one anyway would be producing a number rather than a measurement. The refusal comes with a quantitative bound, which is a genuine result.',
      },
      {
        claim: 'L4 is stable because it is a point where the forces balance.',
        response:
          'So is L3, and the probe placed one degree from it is gone within thirty Jupiter years. Equilibrium and stability are different properties: the marble at the bottom of the bowl and the marble on top of the dome are both at equilibrium. Step 30.',
      },
      {
        claim: 'A Trojan sits at the Lagrange point.',
        response:
          'Real Trojans librate about it, on tadpole orbits tens of degrees wide. The scenario includes one body placed exactly at L4, which does sit still, precisely so that the contrast with Patroclus is visible in the same frame.',
      },
    ],
    teachingNotes: [
      'Steps 5 and 21 are the lesson. If time is short, cut the Trojans before cutting Callisto: the Trojan section is the most enjoyable and the Callisto section is the argument.',
      'The Laplace argument takes about three and a half minutes of running before the instrument will call it a libration, and the lesson deliberately tells students to start it and read on. Start it on the projector at the beginning of the Galilean section and leave it running; by the time the class reaches step 16 it will have got there.',
      'Pluto and the Trojans both reach a verdict in about ninety seconds, so they are the better choices for a short demonstration. If you only have time to show one resonance being established, show Pluto.',
      'The scenarios run at speeds between 150 and 7,500 times the usual. That is deliberate - a single Pluto libration is twenty thousand years - but a student who drags the speed slider will not get it back to the right value by eye. Reloading the step restores it.',
      'The Galilean scenario is a scale model and the app’s own distance and time readouts are wrong for it by factors of 100 and 1,000. The resonance instrument converts correctly and the lesson never asks for a reading from anywhere else, but a student exploring with the object inspector will notice, and it is worth pre-empting.',
      'The libration amplitude of the model Laplace argument is 26 degrees where the real one is 0.064. The libration period, which is the physically meaningful quantity, comes out at about 2,100 days against a measured 2,071. Say this if a student looks it up; the amplitude is a property of where the model was started, and the period is a property of the resonance.',
      'Step 30 rewards a demonstration. Ask the class to predict what the L3 probe will do before running it, and again after the L4 probe has been sitting motionless for a minute. Most will expect symmetry.',
    ],
    expectations: {
      3: 'Periods of about 1.769, 3.552, 7.155 and 16.69 days and ratios of 2.007, 2.014 and 2.333, settling within about thirty Io orbits. The figures to draw attention to are the "closer than chance" numbers, which come out around 2, 1 and 25 depending on how long the run has been going.',
      4: 'The field validation warns rather than blocks. A student who enters exactly 2 gets a note that the instrument does not report exactly 2, which is the point of the step. Expect about 2.008, 2.014 and 2.333; the last figure of each moves a little with the length of the run.',
      8: 'The sky dial should be a broad arc rather than a tight clump, and the arrow short. Most students predicted clustering at step 7, so this is the moment the lesson turns; do not rescue it too quickly.',
      12: 'Three verdicts in order over about three and a half minutes: confined, then one reversal, then libration. If a class has less time, the first two are enough to make the argument as long as the paired control at step 17 is also run.',
      14: 'A centre within a degree or two of 180, an amplitude near 26 degrees and a libration period near 2,100 days. A much shorter period usually means the instrument is still quoting a provisional value from a single swing; leave it running.',
      17: 'CIRCULATION within about ten seconds, with a period near 47 Io orbits. Worth remarking on how much faster this verdict arrives than the libration one, and why: one completed circuit proves circulation, while ruling out a slow circulation takes as long as it takes.',
      19: 'Never LIBRATION. The verdict passes through confined, then either "the centre is moving" or "it has turned back once", and the reported amplitude grows through the run. The growing amplitude is the specific evidence and is what step 20 asks about.',
      22: 'LIBRATION about 180 degrees with an amplitude near 80 and a period near 19,600 years, against published values of 180, 82 and 19,670. This is the closest agreement with a published measurement anywhere in the investigation, and it takes about ninety seconds.',
      23: 'The same three numbers, recorded. The validation accepts a centre within 15 degrees of 180 and a period between 12,000 and 30,000 years; a value near zero for the centre means the sign of the argument was read backwards, and the note says so.',
      24: 'The sky dial is a broad smear; the orbit dial clusters near 180 degrees with a spread of about 38. The instrument’s own summary line reads that every line-up happens near the outer body’s aphelion.',
      27: 'Four different behaviours: the L4 probe reported as an equilibrium with an amplitude of 0, Patroclus librating about 296 degrees with an amplitude near 24 and a period near 13 Jupiter years, the L3 probe more than 150 degrees from where it started, and the wide probe circulating. The instrument needs about twenty Jupiter years - roughly forty-five seconds - before it will commit to any of them.',
      28: 'A centre near 296 degrees, an amplitude near 24 and a period near 13 Jupiter years against a linearised prediction of 12.47. The validation catches a student who has read L4 instead of L5, which is the common slip, and one who has recorded Jupiter’s own period instead of the libration period.',
      30: 'A nearest ratio of 7:5, an offset near 0.25%, about 4.6 times closer than chance, and circulation. Ask the class to compare that offset with Pluto’s 0.30% before revealing the verdict.',
    },
    discussion: [
      'Callisto’s period ratio with Ganymede is closer to a small whole-number ratio than Pluto’s is to 3:2. What would you need to see before you believed either of them was resonant?',
      'The resonance protects Pluto from Neptune, and the same mechanism clears the Kirkwood gaps in the asteroid belt. What is different about the two situations?',
      'A referee receives a paper claiming a new resonance on the strength of a period ratio and a forty-cycle integration. What should the referee ask for?',
      'Why can circulation be established in one circuit while libration takes several times as long to establish? Is there any way round that asymmetry?',
      'Ten thousand asteroids sit at L4 and L5 and none at L3, although all three are equilibrium points. What does that tell you about how the Solar System selects what survives?',
      'Io is the most volcanically active body known and the energy comes from the resonance holding its orbit eccentric. Would Io be geologically dead without Europa and Ganymede?',
    ],
    extensions: [
      'Load the TRAPPIST-1 System scenario and have students measure the seven periods and look for the resonant chain. The ratios are close to 8:5, 5:3, 3:2, 3:2, 4:3 and 3:2; ask what further measurement would be needed to establish that the chain is real, and note that the answer is the same one this lesson gives.',
      'Have students compute the location of the 3:1 and 2:1 Kirkwood gaps from Jupiter’s period and Kepler’s third law, then compare with a published plot of asteroid semi-major axes.',
      'Set the Trojan libration period against the linearised prediction P / sqrt(27μ/4) for a range of secondary masses, by editing the scenario, and check whether the square-root dependence holds.',
      'For a class that has met migration: ask why a resonant chain is hard to build in place and easy to build by moving planets slowly inward, and connect it to the plutinos as a fossil of Neptune’s outward migration.',
      'Ask students to work out, from the libration amplitude of 80 degrees and Pluto’s orbital elements, the range of true anomalies at which Pluto–Neptune conjunctions can occur, and check it against what the conjunction instrument reports.',
    ],
    modelNotes:
      'Three of the four scenarios are built from published elements in js/resonance/systems.js, which is also what the validation suite reads, so a scenario and its check cannot quote different numbers. Pluto and Neptune and Jupiter Trojans are at true scale: 1 length unit is 0.01 AU and 1000 mass units is a solar mass, as everywhere else in Gravitas. The Galilean scenario is a scale model with distances multiplied by 100 and, by Newtonian scale invariance with masses unchanged, durations multiplied by 1000; the instruments convert back and the scenario summary says so. Two documented departures from reality: Gravitas is two-dimensional, so Pluto’s 17-degree inclination is projected away, which brings the modelled minimum Pluto–Neptune separation down from the observed 17.2 AU to 16.6; and Jupiter’s orbit is circularised in the Trojan scenario, because the triangular points are exact equilibria only for a circular secondary. The Galilean moons are placed from their published periods rather than their published distances, because the resonance is a statement about mean motions and the two published quantities disagree at the 0.1% level in a point-mass model - the difference is Jupiter’s oblateness, which Gravitas does not model. Pluto is placed at the exact 3:2 rather than its observed semi-major axis for the same kind of reason: the 0.2% difference is taken up in reality by the precession of Pluto’s perihelion. All four scenarios use Velocity Verlet with a capped substep, because a resonant angle is a secular quantity accumulated over hundreds of orbits and symplectic Euler at the same step reports a Laplace libration amplitude a third of the converged value. Thirty-two checks in the "Orbital resonance" group of tools/physics-checks.mjs hold every number quoted above to a published value or to a refinement test.',
  },
  'listening-to-spacetime': {
    topic:
      'Gravitational waves from a compact binary: the chirp, what it constrains, and where a leading-order model stops',
    difficulty:
      'Introductory, conceptual, with arithmetic no harder than a ratio',
    placement:
      'Sixty to seventy-five minutes, after students have met orbits and ideally after Black Holes by the Numbers. It is the only lesson in the catalogue that puts a measurement, a model and an illustration on the same screen and asks students to tell them apart, so it works well late in a course as a lesson about evidence as much as about gravity. No calculus. Audio is offered four times and required never.',
    overview: `Students are shown a signal with no label on it and asked what could have made it,
      and then spend twenty-two screens finding out whether they were right. The instrument
      computes a real waveform in real units; the last four screens compare it against the data
      LIGO published for GW150914.
      \n\nThe spine is a distinction that the subject makes very easy to lose. Three things on
      screen would all answer to "gravitational wave": the sandbox animation behind the panel,
      which spirals in because of a damping constant somebody chose; the schematic source inside
      it, which is a drawing at a compressed scale; and the plots, which are a calculation.
      Screen 2 names all three and no later screen lets them blur.
      \n\nThe second spine is where a model stops. The leading-order inspiral this lab computes
      is terminated at the innermost stable circular orbit and never extrapolated past it, which
      for a GW150914-like binary is 67.6 Hz - far below the 250 Hz the detectors actually saw.
      Screen 18 asks students to notice that and screen 22 shows them what fills the gap: the
      collaboration's own numerical-relativity waveform, clearly labelled as somebody else's
      calculation. A model that says where it stops is the thing being taught.
      \n\nThe third is experimental control. Screens 11, 15, 20 and 23 are comparisons, and the
      panel refuses to pretend: it names the variables that changed and says plainly when more
      than one did.`,
    priorKnowledge: [
      'That gravity holds things in orbit, and that a closer orbit is a faster one',
      'Reading a graph with a logarithmic axis, or willingness to be shown',
      'Helpful but not required: having met the idea of a wave having a frequency and an amplitude',
      'No calculus, no vectors, no complex numbers. Every relationship in the lesson is measured rather than derived',
    ],
    keyConcepts: [
      {
        heading: 'A binary that loses energy speeds up',
        body: 'The single most counter-intuitive fact in the lesson, and screen 4 asks students to commit to an answer before they see it. Radiating energy away means falling closer together, and closer together means going round faster. Students who reason "losing energy means slowing down" are reasoning correctly about a car and incorrectly about an orbit, and the difference is worth drawing out rather than correcting.',
      },
      {
        heading: 'The wave frequency is twice the orbital frequency',
        body: 'Screen 6 has students count it rather than be told it. The reason is a symmetry: half a turn of the binary leaves an arrangement indistinguishable from the one it started in, so the wave repeats twice per orbit. This factor of two is the origin of most of the arithmetic confusion in the subject, and a class that has counted it does not lose it.',
      },
      {
        heading: 'The chirp mass, not the masses',
        body: 'Screen 13 sets up two binaries with very different component masses and nearly the same signal. To leading order the inspiral depends on one combination of the two masses and not on either separately, which is why a real detection reports a chirp mass to three figures and the individual masses to one. This is a fact about what an observation can constrain, and it is the lesson’s best example of that idea.',
      },
      {
        heading: 'Amplitude does not determine distance',
        body: 'Screen 16 has students find the distance-inclination degeneracy for themselves: a face-on binary at 800 Mpc produces exactly the strain of an edge-on one at 400. The readout reports the effective distance beside the true one so the two can be compared. This is why gravitational-wave distances come with wide error bars and why a network of detectors is worth building.',
      },
      {
        heading: 'A high similarity is not a detection',
        body: 'Screen 20 lets students score a wrong template against a buried signal and see how well it still does. The number the panel reports is a normalised overlap - the same inner product a real search uses - and it is deliberately never called a signal-to-noise ratio. Turning it into a claim needs a template bank, a background estimate and a trials factor, none of which are here, and saying so is the point.',
      },
      {
        heading: 'Where the model stops, and what fills the gap',
        body: 'The lab terminates at the Schwarzschild innermost stable circular orbit and reports the orbital velocity parameter throughout, which is already 0.27 when a heavy binary enters the band. The dropped post-Newtonian terms grow as the square of that. Screens 18 and 22 make the boundary the subject rather than an apology for it.',
      },
    ],
    flow: [
      {
        steps: '1-3',
        text: 'An unlabelled signal, a prediction about what made it, then the reveal and the three-kinds-of-picture screen. Screen 2 is the one to slow down on: if a class leaves without the distinction between the animation, the schematic and the plots, the rest lands differently. Screen 3 is controls practice and can be brisk.',
      },
      {
        steps: '4-9',
        text: 'The chirp, measured. A prediction, the wave overlay, the two-per-orbit count, two frequency readings, a saved evidence capture at 50 Hz, and a written explanation. The counting exercise at screen 6 takes longer than it looks and is worth the time.',
      },
      {
        steps: '10-13',
        text: 'Mass. A prediction about time in band, the first controlled comparison, a three-way table, and the chirp-mass surprise. Screen 13 lands best if students have not been told the answer at screen 11.',
      },
      {
        steps: '14-16',
        text: 'Distance and geometry. The vertical scale is pinned across screens 15 and 16 so the comparison is honest; screen 16 is where the degeneracy appears and it is the hardest idea in the lesson.',
      },
      {
        steps: '17-18',
        text: 'The three presets side by side, then the limits screen. Screen 18 is a multiple-choice question but it is really the conceptual close of the model half.',
      },
      {
        steps: '19-20',
        text: 'Noise, and what a similarity number is and is not. Expect this pair to generate the most discussion in the room.',
      },
      {
        steps: '21-22',
        text: 'The real data. Students find the seven-millisecond shift and the sign flip themselves before the readout confirms them, then see the residual. Do not shortcut the finding.',
      },
      {
        steps: '23-24',
        text: 'The open challenge and the written conclusion. Budget fifteen minutes: the challenge is the only screen with no right answer and it is where the experimental-control habit either shows up or does not.',
      },
    ],
    features: [
      {
        name: 'The gravitational-wave lab',
        text: 'Computes a leading-order quasi-circular inspiral in physical units from the two masses, the distance and the viewing angle. One timeline drives the schematic source, both plots, the audio and every capture, so nothing on screen can disagree with anything else. It reports the chirp mass, the frequency and separation at the playhead, the orbital velocity parameter with a plain-language verdict on how much the approximation has dropped, where the model stops and why, and both the true and effective distances.',
      },
      {
        name: 'The wave overlay and the test-mass ring',
        text: 'Each ring is a wave crest placed by emission history, so the outer ones are further apart because they left when the binary was turning more slowly. The near field is masked because a far-field formula does not describe it. The ring of test masses is a separate inset with the wave arriving out of the page, which is the only honest way to draw a transverse deformation without implying a detector is parked next to the binary.',
      },
      {
        name: 'Seeded detector noise',
        text: 'Coloured to the published Advanced LIGO design curve and drawn from a fixed seed, so it does not change when a student changes a mass. A separate control redraws it deliberately. It is a design curve rather than the noise any detector had, and the readout says so.',
      },
      {
        name: 'The published GW150914 traces',
        text: 'The figure data from Abbott et al. (2016), reproduced under CC BY 4.0 and not reprocessed. The observed strain from both detectors, the collaboration’s numerical-relativity waveform and the residual. No time shift and no sign inversion were applied to the stored data; the panel applies what a student asks for and records it, which is what makes screen 21 a finding rather than a demonstration.',
      },
      {
        name: 'Evidence capture',
        text: 'Available on screens 8, 15, 20, 23 and 24. A capture records the numbers, the settings they were taken under and the model’s own limitations together, so a claim written in the notebook can be checked against the reading it came from.',
      },
    ],
    misconceptions: [
      {
        claim: 'Gravitational waves are a kind of sound.',
        response:
          'They are not, and there is nothing between here and the source for sound to travel through. Everything audible in this lesson is data converted into sound, and the panel prints exactly what was done to make it audible - the speed factor, any frequency shift, and by how much the shift flattened the chirp. Students who reach for "we heard the black holes" should be asked what the microphone was.',
      },
      {
        claim:
          'The signal gets faster because the black holes are being pulled harder.',
        response:
          'True but not the mechanism, and it hides the step that matters. The binary radiates energy, so the separation shrinks; a smaller orbit has a shorter period; the wave frequency is twice the orbital frequency. Ask for the separation to appear in the answer - the readout gives it in Schwarzschild radii on every screen.',
      },
      {
        claim: 'A louder signal means a closer source.',
        response:
          'Only at fixed inclination, which is exactly what nobody knows in advance. Screen 16 shows a face-on binary at 800 Mpc and an edge-on one at 400 producing identical strain. This is the misconception most likely to survive the lesson if screen 16 is rushed.',
      },
      {
        claim: 'The three presets show what a neutron star sounds like.',
        response:
          'They show what three different pairs of masses sound like. This model has no tides, no disruption and no post-merger behaviour, so a neutron-star preset is a mass choice and nothing more - and the lesson says so on the screen where the choice is made. Nothing in a gravitational wave says what the objects were made of.',
      },
      {
        claim: 'The model shows the merger.',
        response:
          'It stops at 67.6 Hz for the black-hole preset, which is well before the loudest part of what the detectors recorded. The merger and ringdown on screen 22 are the collaboration’s numerical-relativity waveform, not this model extrapolated. Students who think they have watched a merger have watched the first act of one.',
      },
      {
        claim: 'A template that matches means the signal has been detected.',
        response:
          'Screen 20 is built to break this. A wrong-mass template still scores well, and a correct template scores well against a signal buried in noise. The number is a similarity and the lesson never calls it anything else; a detection claim needs a background estimate the lab does not have.',
      },
    ],
    teachingNotes: [
      'The whole lesson can be completed with the sound off, and this is tested rather than asserted. Say so at the start: students on a shared machine or with hearing loss should not be wondering whether they are missing the point of the exercise. The frequency plot carries the same information as the pitch.',
      'Screen 6 - counting orbits against wave peaks - reliably takes twice as long as it looks. The reliable method is to note where the small body starts, step the playhead until it returns, and count peaks over that same interval. Students who count peaks over a longer interval than orbits get three or four per orbit and conclude the relationship is not two.',
      'On screen 11 the panel will say that two things changed when a student moves both masses, and it is right. That is a good moment to discuss what "holding the mass ratio fixed" actually controls, rather than a message to work around.',
      'Screen 21 works best if nobody says the answer. Let a class hunt for the alignment; the shift comes out near seven milliseconds and the sign must be flipped, and both are physical. The readout has the measured values but they are phrased as a check, not as an instruction.',
      'The lab reports the orbital velocity parameter with a verdict attached, and for a heavy black-hole binary it never reaches the reliable band inside LIGO’s frequency range. This is a real property of the approximation and not a defect of the software. A class that asks about it has found the most sophisticated point in the lesson.',
      'The GW150914 comparison is the only real data in the catalogue. If a class has time for one digression, the acknowledgement line in the readout - the Gravitational Wave Open Science Center - is worth a minute: this data is public because a collaboration decided it should be.',
    ],
    discussion: [
      'The model refuses to say what happens after 67.6 Hz. Is a model that stops more useful than one that guesses?',
      'The signal constrains the chirp mass tightly and the individual masses loosely. What does that tell you about what an observation is?',
      'Two detectors saw GW150914 and disagreed by seven milliseconds. What would one detector alone have been able to claim?',
      'A wrong template still scores 0.6. What would you need to add before a number like that could support a discovery?',
      'Nothing in a gravitational wave says what the objects were made of. How did anyone establish that GW170817 involved neutron stars?',
    ],
    extensions: [
      'Have students work out how long a 1.4 + 1.4 solar-mass binary spends between 20 Hz and 40 Hz, then between 200 Hz and 400 Hz, using the lab’s own readout. The same octave takes very different times, which is the chirp in one comparison.',
      'Set two binaries with the same chirp mass and different total masses and find the frequency at which their signals visibly part company. That frequency is a rough measure of how much information the merger carries that the inspiral does not.',
      'Use the similarity control to find the largest chirp-mass error a template can have and still score above 0.9. That number is roughly how finely a real template bank has to be spaced.',
      'Read the model page section on gravitational waves alongside the lesson and identify each of its stated limitations in the interface.',
    ],
    expectations: {
      3: 'Everything moving together: the playhead, the two bodies in the schematic, both plots and the readout. A student who reports one of them lagging has found a bug worth hearing about.',
      5: 'Rings that are further apart at the edge of the picture than near the centre, and a masked region in the middle. The test-mass ring stretches across the page and squeezes at right angles to that, alternately.',
      6: 'Two wave peaks per orbit, within counting error. Anything between about 1.7 and 2.3 is a successful count; the validator says so and asks for a recount outside that.',
      7: 'Roughly 20 Hz near the start and 60-67 Hz near the end for the default black-hole preset, a factor of about three. The time before merger falls from about 0.85 s to under 0.05 s.',
      8: 'At 50 Hz the readout gives about 0.14 s before merger, a separation near 3.9 Schwarzschild radii and an orbital velocity parameter around 0.36. The saved notebook entry should carry the model’s limitations alongside those numbers.',
      11: 'Halving both masses roughly triples the time in band and roughly doubles the frequency at which the model stops. The panel will report two changes rather than one, which is correct and worth discussing.',
      12: 'The lighter pair stays in band longest and reaches the highest frequency; the heavier pair does neither. For 18 + 14.4, 36 + 29 and 60 + 48 solar masses the model stops at about 135, 68 and 41 Hz respectively, and the whole inspiral from 20 Hz lasts roughly 2.7 s, 0.85 s and 0.39 s.',
      13: 'Chirp masses within about a solar mass of each other - near 28 for both pairs - despite total masses of 65 and 69.4 and mass ratios of 1.24 and 2.6. The two traces should be hard to tell apart over most of the window.',
      15: 'Peak strain halving each time the distance doubles, so a ratio near 2.0, and the frequency at which the model stops identical at all three distances. A student who gets a ratio near 4 has assumed an inverse-square law.',
      16: 'Edge-on about half the amplitude of face-on, and an effective distance of about 800 Mpc for a source at 400. The number to draw out is that the effective distance is what a single detector measures.',
      17: 'Three very different windows from the same equations: the black-hole pair stops at 68 Hz after 0.8 s, the neutron-star pair at 1.57 kHz after 158 s of which the lab models the last eight, and the mixed pair at 386 Hz after 35 s. Chirp masses of about 28, 1.2 and 3.0 solar masses.',
      19: 'At 410 Mpc the signal is clearly visible above the simulated noise; by 2000 Mpc it is not findable by eye in the time series. Pressing New noise changes the grey trace and leaves the blue one exactly where it was.',
      20: 'The correct template near 0.9 or above, the wrong-mass template somewhere around 0.3 to 0.6, and the distant case still scoring high because the overlap is blind to amplitude. That last one is the finding: similarity does not fall with distance, which is precisely why it cannot be a detection statistic.',
      21: 'A shift near 7 ms with the sign flipped, at which the two traces visibly line up. The readout reports -7.3 ms and a correlation of -0.76 as measured from the published files.',
      22: 'The measurement and the reconstruction agreeing closely through the last cycles, and a residual that is as loud before the signal arrives as after it. The rapid die-away at the end is the ringdown and this lesson’s own model does not produce it.',
      23: 'Any controlled comparison with one variable and a saved capture. Distance and viewing angle change amplitude alone; mass changes the shape as well, so a mass change is two effects and a good answer says so.',
    },
    modelNotes: `The lab computes a leading-order quadrupole inspiral of two point masses on
      circular orbits - Peters (1964) for the radiation reaction, Maggiore chapter 4 for the
      closed forms - with no spin, no eccentricity, no tides and no higher post-Newtonian terms.
      Masses are detector-frame throughout and no cosmology is assumed anywhere.
      \n\nIt is terminated at the Schwarzschild innermost stable circular orbit of the total mass,
      4397 Hz divided by the total mass in solar masses, and is never extrapolated past it. The
      interface reports the orbital velocity parameter with a three-band verdict, because the
      terms the model drops enter at the square of that number and there is no frequency at which
      the approximation simply stops being valid.
      \n\nThe detector response places the source directly overhead with polarization angle zero,
      so the plotted strain is the plus polarization alone and the distance-inclination degeneracy
      appears in its simplest form. Synthetic noise is coloured to a published analytic fit to the
      Advanced LIGO zero-detuning high-power design curve and seeded, so it is reproducible and
      does not change under a parameter sweep.
      \n\nThe GW150914 traces are the figure data published with Abbott et al. (2016), Phys. Rev.
      Lett. 116, 061102, doi:10.1103/PhysRevLett.116.061102, released by the Gravitational Wave
      Open Science Center under CC BY 4.0. They were decimated from 16384 Hz and quantized to
      16 bits; nothing was shifted, inverted, filtered or aligned. The Hanford-Livingston lag and
      sign are measured by the build and recorded, not applied.
      \n\nNone of this is the ordinary sandbox. Its inspirals run on a damping constant and its
      sounds are quantized onto a musical scale, and the lesson says so on screen 2. The full
      specification, including what is deliberately absent, is at ${MODEL_PAGE}#gravitational-waves.`,
  },
};

/** @returns {Object|null} The instructor content for an investigation id */
export const instructorContentFor = id => INSTRUCTOR_CONTENT[id] ?? null;
