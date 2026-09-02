// =============================================================================
// Finding planets by their tug
// -----------------------------------------------------------------------------
// One lesson, lifted verbatim out of the single 8,460-line module these ten
// used to share. Content only, no imports: every step that needs a live number
// is handed a `ctx` by the engine, so a lesson stays a description of what is
// being taught rather than a piece of the simulation.
//
// The registry in ./registry.js imports this file on demand, so opening one
// lesson no longer pulls in the other nine. See ../investigations.js for the
// synchronous barrel the answer-key generator, the instructor materials build
// and the tests use.
// =============================================================================

// --- Finding Planets by Their Tug -------------------------------------------
// The third of the exoplanet sequence. Shadows measured a radius; this one
// measures a mass, and then puts the two together into a density and asks the
// question The Goldilocks Question was built to answer.
//
// The scenario the live steps use puts the star in genuine barycentric motion,
// because the transit scenarios pin theirs and a radial-velocity panel pointed
// at a pinned star would teach that planets do not move their stars.

const RV_LAB = {
  scenario: 'Exoplanet Characterization Lab',
  seed: 'tug',
  camera: { zoom: 55, pan: { x: 0, y: 0 } },
  paused: false,
};

const RV_LAB_PAUSED = { ...RV_LAB, paused: true };

const RADIAL_VELOCITY = {
  id: 'radial-velocity',
  thumbnail: 'images/scenarios/exoplanet-characterization-lab.webp',
  series: 'Detecting exoplanets',
  title: 'Finding Planets by Their Tug',
  subtitle: 'Watch a star wobble, weigh its planet, and combine the clues',
  duration: '45-55 min',
  level: 'Introductory astronomy',
  lock: { placement: true, inspector: true, areaSweep: false },
  summary:
    'A planet you cannot see still pulls on its star, and the star moves. Measure that motion two different ways, turn it into a mass, and combine it with the radius a transit gave you to work out what kind of world it is.',
  objectives: [
    'Explain why a star and its planet both orbit their common center of mass',
    'Read a radial-velocity curve and identify its period and semi-amplitude K',
    'Use a measured K to estimate a planet mass, and say why that mass is usually a lower limit',
    'Explain why a transiting planet escapes the M sin i ambiguity',
    'Describe what astrometry measures and when it works better than radial velocity',
    'Combine a mass and a radius into a bulk density, and say what density can and cannot tell you',
    'Place a characterized planet against a modeled habitable zone without overclaiming',
  ],
  steps: [
    // --- Part 1: the planet found before it cast a shadow -------------------
    {
      type: 'read',
      title: 'The planet you already measured',
      setup: RV_LAB,
      body: `In <em>Finding Planets by Their Shadows</em> you watched HD 209458 b
             cross its star and used the depth of the dip to work out how big the
             planet is. Here is the same system again.
             \n\nThere is something that lesson did not mention. When the transit
             was first seen in 1999, astronomers already knew the planet was
             there. They had been watching the star for months, and the star had
             been telling them.`,
      tip: 'The star is the bright disc at the center. The planet is the small point tracing the ring around it.',
    },
    {
      type: 'question',
      kind: 'choice',
      title: 'How does an invisible planet give itself away?',
      body: `The planet is far too faint to see next to its star, and at this
             point in the story nobody has watched it transit. Yet the star alone
             was enough to say a planet was there.`,
      prompt: 'What could the star be doing that reveals the planet?',
      options: [
        'The planet blocks some of the star’s light',
        'The planet pulls on the star, so the star moves',
        'The planet heats the star up',
        'The star does not move; only the planet does',
      ],
      answer: 1,
      because: `Gravity works both ways. The star pulls the planet into orbit, and
                the planet pulls back just as hard. The star is far heavier, so it
                moves far less, but it does move, and that motion is measurable.`,
    },
    {
      type: 'predict',
      title: 'Which one moves?',
      setup: RV_LAB_PAUSED,
      body: `Before you run anything: the star here is about 1.15 times the mass
             of the Sun. The planet is roughly two thirds the mass of Jupiter,
             which makes it about a seventeen-hundredth of the star.`,
      prompt: 'When the simulation runs, which objects will actually move?',
      options: [
        'Only the planet. The star stays where it is.',
        'Both, around a fixed point between them, but by very different amounts',
        'Both, by the same amount',
        'Only the star',
      ],
      answer: 1,
      because: `Both move, around their common center of mass. Because the star is
                about seventeen hundred times heavier, its own orbit is about
                seventeen hundred times smaller. That is why it looks stationary
                here and is not.`,
    },
    {
      type: 'explore',
      title: 'Both of them go round',
      body: `This instrument draws the same idea with the star’s orbit magnified
             so you can see it. The planet’s orbit is at true scale; the star’s is
             blown up by the amount written at the bottom of the picture.
             \n\nThe cross is the center of mass: the point they both circle.
             Notice that the star and the planet are always on opposite sides of
             it.`,
      tool: {
        id: 'reflex-motion',
        values: { mp: 0.69, a: 0.04747, mag: 400 },
        title: 'Who is actually moving?',
        note: 'Try the presets. The magnification changes; the physics does not.',
      },
    },

    // --- Part 2: the star wobbles ------------------------------------------
    {
      type: 'predict',
      title: 'Make the planet heavier',
      body: `Keep the orbit the same size and make the planet more massive.`,
      prompt:
        'A heavier planet at the same distance makes the star’s own orbit…',
      options: ['smaller', 'the same size', 'larger', 'disappear'],
      answer: 2,
      because: `A heavier companion pulls the balance point further from the star’s
                center, so the star has further to travel. More planet mass means a
                bigger stellar wobble.`,
    },
    {
      type: 'explore',
      title: 'Watch it grow',
      body: `Drag the planet-mass slider from an Earth up to a heavy Jupiter and
             watch the star’s circle open out. Read the number labeled
             <strong>Star’s own orbit</strong> as you go.
             \n\nThen try the Earth preset. The physical wobble becomes tiny, and
             the magnification has to go up by a factor of thousands before you
             can see it at all. It is still there.
             \n\nThat is the whole idea behind this lesson. A planet does not have
             to be bright to be found, or visible at all. It only has to be heavy
             enough to move its star by an amount we can measure.`,
      tool: {
        id: 'reflex-motion',
        values: { mp: 0.69, a: 0.04747, mag: 400 },
        title: 'More mass, bigger wobble',
      },
    },

    // --- Part 3: measuring motion we cannot see -----------------------------
    {
      type: 'read',
      title: 'Light carries the answer',
      body: `Starlight is not a smooth spread of color. Running through it are
             dark lines, at wavelengths where atoms in the star’s atmosphere have
             absorbed light. Each element puts its lines at wavelengths we can
             measure in a laboratory, so we know exactly where they belong.
             \n\nWhen the star moves toward us, every line shifts very slightly
             toward shorter wavelengths. When it moves away, they shift toward
             longer ones. Measure the shift and you have measured the speed.`,
      tip: 'This is the Doppler effect, the same reason a siren drops in pitch as it passes you.',
    },
    {
      type: 'question',
      kind: 'choice',
      title: 'Which way is it going?',
      body: `An astronomer measures a star’s spectral lines and finds them all at
             slightly <em>longer</em> wavelengths than they should be.`,
      prompt: 'The star is…',
      options: [
        'moving toward us',
        'moving away from us',
        'not moving',
        'getting hotter',
      ],
      answer: 1,
      because: `Longer wavelengths mean the star is receding. Astronomers write
                that as a positive radial velocity. Shorter wavelengths, an
                approaching star, count as negative.`,
    },
    {
      type: 'explore',
      title: 'Toward, away, toward again',
      body: `On the left, the star goes round its small orbit and an arrow shows
             how much of its motion is pointing at us. On the right, that quantity
             is plotted as the star goes round.
             \n\nWatch what happens at the two points where the star is moving
             straight across your view.`,
      tool: {
        id: 'rv-observer',
        values: { mp: 0.69, inc: 90 },
        title: 'The part we can measure',
      },
    },

    // --- Part 4: build the curve --------------------------------------------
    {
      type: 'explore',
      title: 'Open the real instrument',
      setup: RV_LAB,
      body: `Now the live system. Open <strong>Radial Velocity</strong> from the
             Tools list on the right. It measures the star in this simulation, the
             same way a spectrograph measures a real one, and builds the curve as
             the orbit proceeds.
             \n\nLet it run for at least two full cycles before moving on. One
             orbit takes about thirteen seconds.`,
      tip: 'The panel reports the velocity relative to the system’s own center of mass, so the curve sits around zero.',
    },
    {
      type: 'question',
      kind: 'choice',
      title: 'Reading the curve',
      body: `Look at the curve the panel has drawn.`,
      prompt: 'When the curve is at its most negative, the star is…',
      options: [
        'moving toward us as fast as it ever does',
        'moving away from us as fast as it ever does',
        'closest to the planet',
        'stationary',
      ],
      answer: 0,
      because: `Negative means approaching. The lowest point of the curve is the
                moment the star is coming at us fastest; the highest point is the
                moment it is receding fastest.`,
    },
    {
      type: 'measure',
      title: 'Measure the period',
      body: `The curve repeats. Find the time between two matching points, for
             example two successive peaks, and record it.
             \n\nThis is the orbital period of the planet, measured without ever
             seeing the planet.`,
      fields: [
        {
          id: 'period',
          label: 'Time for one full cycle',
          unit: 'days',
          hint: '3.5',
        },
      ],
    },
    {
      type: 'read',
      title: 'The semi-amplitude, K',
      body: `The curve swings from a maximum down to a minimum and back.
             <strong>K</strong> is <em>half</em> that full range: the distance from
             the middle of the curve to its top, not from top to bottom.
             \n\nThat factor of two is the commonest mistake in this whole
             subject. K is the semi-amplitude.`,
      tip: 'The panel reports K for you once it has seen a full cycle, so you can check yourself.',
    },
    {
      type: 'measure',
      title: 'Read K off the panel',
      setup: RV_LAB,
      body: `With the Radial Velocity panel open and at least one complete cycle
             recorded, read the semi-amplitude it reports.`,
      fields: [{ id: 'k', label: 'Semi-amplitude K', unit: 'm/s', hint: '84' }],
    },

    // --- Part 5: what controls K --------------------------------------------
    {
      type: 'predict',
      title: 'What would make K bigger?',
      body: `Hold the star, the orbit and the viewing angle fixed, and change only
             the planet.`,
      prompt: 'A more massive planet produces a K that is…',
      options: ['smaller', 'unchanged', 'larger', 'negative'],
      answer: 2,
      because: `More planet mass means a bigger stellar orbit, and a bigger orbit
                covered in the same period means a faster star. K goes up.`,
    },
    {
      type: 'explore',
      title: 'One thing at a time',
      body: `This instrument holds the star, the period and the viewing angle
             still, and lets you change only the planet’s mass. Work along the
             presets from an Earth to a heavy Jupiter.
             \n\nThe relationship is a straight line: double the planet’s mass and
             you double K.`,
      tool: {
        id: 'rv-mass',
        values: { mp: 0.69 },
        title: 'Mass against K',
      },
    },

    // --- Part 6: weigh the planet -------------------------------------------
    {
      type: 'question',
      kind: 'numeric',
      title: 'Weigh HD 209458 b',
      body: `Use the instrument below. Set the true planet mass until the K it
             reports matches the K you measured from the panel, about 84 metres
             per second, with the inclination left at 90 degrees.
             \n\nWhat planet mass gives that?`,
      tool: {
        id: 'rv-inclination',
        values: { inc: 90, mp: 0.69 },
        title: 'Match the measured K',
      },
      prompt: 'Planet mass, in Jupiter masses',
      answer: 0.69,
      unit: 'M_J',
      tolerance: 0.08,
      because: `About 0.69 Jupiter masses, which is the published value. The star’s
                speed told you the mass of a planet nobody had seen.`,
    },

    // --- Part 7: the inclination problem ------------------------------------
    {
      type: 'predict',
      title: 'Now tilt the whole system',
      body: `Leave the planet exactly as it is. Change only where we happen to be
             standing, so that instead of seeing the orbit edge-on we see it more
             nearly face-on.`,
      prompt: 'Tilting the system toward face-on makes the measured K…',
      options: [
        'larger',
        'smaller',
        'unchanged, because the planet has not changed',
        'negative',
      ],
      answer: 1,
      because: `The planet has not changed, but less of the star’s motion now points
                at us. Radial velocity only ever sees the along-our-line-of-sight
                part, so the measured K shrinks.`,
    },
    {
      type: 'explore',
      title: 'The same planet, four viewing angles',
      body: `Work through the inclination presets. The bar labeled
             <strong>true mass</strong> never moves. The bar labeled
             <strong>RV says at least</strong> shrinks as the system tilts.
             \n\nAt 30 degrees the same planet appears to be half its real mass. At
             5 degrees it nearly disappears.`,
      tool: {
        id: 'rv-inclination',
        values: { inc: 90, mp: 0.69 },
        title: 'Tilt it',
      },
    },
    {
      type: 'read',
      title: 'M sin i',
      body: `Radial velocity on its own cannot separate a planet’s mass from the
             tilt of its orbit. A light planet seen edge-on and a heavier planet
             seen at an angle produce the same curve.
             \n\nSo what an RV survey reports is not a mass. It is a
             <strong>minimum</strong> mass, written <em>M</em> sin <em>i</em>. The
             real planet is that heavy or heavier.`,
    },
    {
      type: 'question',
      kind: 'choice',
      title: 'What a transit adds',
      body: `Now remember what a transit requires. For the planet to cross the face
             of its star from where we sit, the orbit has to be very nearly edge-on
             to our line of sight.`,
      prompt: 'For a planet we can watch transit, the RV minimum mass is…',
      options: [
        'still only a lower limit, no better than for any other planet',
        'very close to the true mass, because a transit means the orbit is nearly edge-on',
        'always exactly double the true mass',
        'meaningless',
      ],
      answer: 1,
      because: `A transit pins the inclination near 90 degrees, so sin i is near 1
                and the minimum mass is essentially the mass. This is why transiting
                planets are the ones we know best: the transit gives the radius and
                fixes the geometry, and radial velocity then gives a real mass.`,
    },

    // --- Part 8: a second kind of wobble ------------------------------------
    {
      type: 'predict',
      title: 'A face-on system',
      body: `Suppose a system sits almost exactly face-on to us. Its radial-velocity
             signal is nearly nothing.`,
      prompt: 'Is the planet undetectable?',
      options: [
        'Yes. No wobble method can work on a face-on system.',
        'No. The star still moves; it just moves across our view instead of along it.',
        'Yes, unless the planet is very large',
        'No, because face-on systems always transit',
      ],
      answer: 1,
      because: `The star is still tracing its little orbit. Face-on, all of that
                motion is across our view, which is exactly the motion radial
                velocity cannot see and a different method can.`,
    },
    {
      type: 'read',
      title: 'Astrometry',
      body: `Astrometry measures <em>where</em> a star is, very precisely, over and
             over. A star with a planet does not sit still: it traces a small closed
             path on the sky, once per orbit.
             \n\nThis is not a picture of the planet. The planet stays invisible
             throughout. What is being measured is the star’s position.`,
      tip: 'The angles involved are tiny: often millionths of an arcsecond.',
    },
    {
      type: 'explore',
      title: 'Tilt it again, and watch the other method',
      body: `Move the inclination slider from edge-on to face-on.
             \n\nEdge-on, the star’s path on the sky collapses to a line. Face-on,
             it opens into a circle. In between it is an ellipse.
             \n\nThe important part: the <em>size</em> of the path never changes.
             Only its shape does.`,
      tool: {
        id: 'astrometry-signature',
        values: { mp: 1, a: 5.2, d: 10, inc: 45 },
        title: 'The path on the sky',
      },
    },
    {
      type: 'question',
      kind: 'choice',
      title: 'Two methods, opposite weaknesses',
      body: `Compare what the two methods do as a system tilts from edge-on toward
             face-on.`,
      prompt: 'For a nearly face-on system…',
      options: [
        'both radial velocity and astrometry fail',
        'radial velocity nearly vanishes, while astrometry works well',
        'astrometry nearly vanishes, while radial velocity works well',
        'both work equally well at every angle',
      ],
      answer: 1,
      because: `Radial velocity scales with sin i and dies face-on. The astrometric
                orbit does not shrink at all; it simply appears as a circle rather
                than a line. The two methods fail in opposite directions, which is
                why they are described as complementary.`,
    },
    {
      type: 'explore',
      title: 'All three at once',
      body: `This panel puts the three methods side by side for one system as you
             tilt it. Watch which measurements survive.
             \n\nNotice that the transit is the most fragile of the three: a few
             degrees away from edge-on and it stops happening entirely.`,
      tool: {
        id: 'method-comparison',
        values: { inc: 90 },
        title: 'Which signals survive',
      },
    },

    // --- Part 9: distance and orbit size ------------------------------------
    {
      type: 'predict',
      title: 'Move the system further away',
      body: `Take a system with a known stellar wobble and imagine it twice as far
             from Earth.`,
      prompt: 'The star’s physical orbit around the center of mass…',
      options: [
        'halves',
        'doubles',
        'stays exactly the same; only the angle we measure changes',
        'disappears',
      ],
      answer: 2,
      because: `Distance is our problem, not the system’s. The star’s orbit is
                whatever it is. What changes is the angle that orbit subtends from
                here, and that is what astrometry has to measure.`,
    },
    {
      type: 'explore',
      title: 'Distance, and orbit size',
      body: `Use the distance slider first: the reflex orbit in AU stays put while
             the angular signature shrinks.
             \n\nThen use the orbit-size slider. A wider orbit puts the star further
             from the center of mass, so the physical wobble genuinely grows.
             \n\nCompare the two presets: HD 209458 b, and the Sun with Jupiter
             seen from ten parsecs.`,
      tool: {
        id: 'astrometry-signature',
        values: {
          mp: 0.69,
          a: 0.04747,
          d: 48.3,
          inc: 87,
        },
        title: 'What makes an astrometric signal detectable',
      },
    },
    {
      type: 'question',
      kind: 'choice',
      title: 'Different methods, different planets',
      body: `HD 209458 b gives a large radial-velocity signal, 84 metres per
             second, and an astrometric signature under one millionth of an
             arcsecond. The Sun and Jupiter seen from ten parsecs give a much
             smaller RV signal but an astrometric wobble hundreds of times larger.`,
      prompt: 'Astrometry is at its best for planets that are…',
      options: [
        'massive, in wide orbits, around nearby stars',
        'small, in tight orbits, around distant stars',
        'exactly like Earth',
        'transiting',
      ],
      answer: 0,
      because: `A wide orbit means a large physical wobble; a nearby star means that
                wobble subtends a large angle. Transits favour the opposite - close-in
                planets - and radial velocity sits in between. No method surveys the
                whole population, which is why we use several.`,
    },

    // --- Part 10: combine transit and RV ------------------------------------
    {
      type: 'read',
      title: 'Bring the transit back',
      body: `You now have two independent measurements of the same planet.
             \n\nFrom the transit, in the previous investigation: its
             <strong>radius</strong>, about 1.38 Jupiter radii.
             \n\nFrom the wobble, in this one: its <strong>mass</strong>, about
             0.69 Jupiter masses.
             \n\nNeither number alone says what kind of object this is. Together
             they do.`,
    },
    {
      type: 'explore',
      title: 'Characterize the planet',
      body: `The panel below takes each measurement in turn and shows what it buys.
             The top two rows are the transit and the radial velocity. The third
             combines them.
             \n\nRead the bulk density for HD 209458 b, and compare it with water at
             1 gram per cubic centimetre and with Earth at 5.5.`,
      tool: {
        id: 'planet-characterization',
        values: {
          rp: 1.38,
          mp: 0.69,
          a: 0.04747,
          lum: 1.77,
          teff: 6065,
        },
        title: 'The inference chain',
      },
    },
    {
      type: 'question',
      kind: 'numeric',
      title: 'How dense is it?',
      body: `Read the bulk density from the panel for HD 209458 b.`,
      prompt: 'Bulk density, in g/cm³',
      answer: 0.33,
      unit: 'g/cm³',
      tolerance: 0.08,
      because: `About 0.33 grams per cubic centimetre: roughly a third the density of
                water, and about a sixteenth of Earth’s. A Jupiter-sized planet with
                two thirds of Jupiter’s mass has to be dominated by gas.`,
    },

    // --- Part 11: the habitability question ---------------------------------
    {
      type: 'question',
      kind: 'choice',
      title: 'Where does HD 209458 b sit?',
      body: `Look at the last two rows of the characterization panel.`,
      prompt:
        'HD 209458 b receives roughly 785 times the starlight Earth does, which puts it…',
      options: [
        'inside the modeled habitable zone',
        'far closer than the inner edge of the zone',
        'far beyond the outer edge of the zone',
        'exactly at the inner edge',
      ],
      answer: 1,
      because: `It orbits at a twentieth of Earth’s distance from a star brighter than
                the Sun. We now know a great deal about this planet: its size, its
                mass, its density and its irradiation. All of it says hot gas giant.`,
    },

    // --- Part 12: the characterization challenge ----------------------------
    {
      type: 'read',
      title: 'Three candidates',
      body: `Here are three planets from a survey. For each you have a radius from
             its transit, a mass from its radial velocity, and an orbit around a
             star slightly cooler and fainter than the Sun.
             \n\nUse the presets on the panel to load each one in turn, and read all
             four numbers: radius, mass, density and where it sits relative to the
             zone.`,
      tool: {
        id: 'planet-characterization',
        values: { rp: 0.0981, mp: 0.0044, a: 1.02, lum: 0.6, teff: 5400 },
        title: 'Three candidates',
        note: 'Load Planet A, then Planet B, then Planet C.',
      },
    },
    {
      type: 'question',
      kind: 'choice',
      title: 'Which is the strongest candidate?',
      body: `Planet A is 1.1 Earth radii and 1.4 Earth masses, in the zone.
             \n\nPlanet B is 2.5 Earth radii and 6 Earth masses, also in the zone.
             \n\nPlanet C is 1.05 Earth radii and 1.3 Earth masses, but receives
             about thirty times the starlight Earth does.`,
      prompt:
        'Which is the strongest candidate for a rocky world at a temperate level of irradiation?',
      options: [
        'Planet A',
        'Planet B, because it is the largest',
        'Planet C, because it is rocky',
        'All three are equally good candidates',
      ],
      answer: 0,
      because: `Only A satisfies both conditions. B sits in the zone but its density of
                about 2 grams per cubic centimetre is far too low for rock, so it is
                more likely a small world with a thick envelope. C has a rocky density
                but is thirty times too irradiated. Neither column answers the question
                on its own.`,
    },
    {
      type: 'question',
      kind: 'short',
      title: 'What would you still want to know?',
      body: `You have a radius, a mass, a density and an irradiation for Planet A.
             That is a great deal for a planet nobody has seen.
             \n\nIt is not everything.`,
      prompt:
        'Name one thing you still do not know about Planet A that would matter for whether it could actually support liquid water, and say briefly why it matters.',
      rubric: `Full credit for naming any property the measurements so far cannot
               reach, together with a reason it bears on surface liquid water.
               Expected answers include: whether it has an atmosphere at all, and of
               what composition, since surface pressure decides whether liquid water
               is stable; whether it rotates or is tidally locked, which governs
               whether one side freezes; its albedo, since reflected light never
               warms the surface; whether it retains a magnetic field, which bears on
               atmospheric loss; and the star's flare activity. Also accept that the
               habitable-zone calculation is a statement about the orbit under
               assumed climate conditions, not a measurement of the planet. One
               property is enough; do not penalise an answer outside this list whose
               reasoning connects it to liquid water.`,
      because: `There are several good answers: whether it has an atmosphere at all,
                what that atmosphere is made of, whether it rotates or keeps one face
                to its star, whether it has a magnetic field, how much of the starlight
                it reflects, and whether the star flares. The habitable zone is a
                statement about the orbit, not about the planet. It says where liquid
                water is possible given a set of climate assumptions, and nothing about
                whether this particular world has any.`,
    },

    // --- Synthesis ----------------------------------------------------------
    {
      type: 'question',
      kind: 'choice',
      title: 'The point of all this',
      body: `You began this lesson unable to see a planet at all.`,
      prompt: 'The single most important idea here is that…',
      options: [
        'radial velocity is the best way to find planets',
        'combining different measurements tells you things no single measurement can',
        'transits are the only reliable method',
        'a planet in the habitable zone is inhabited',
      ],
      answer: 1,
      because: `Each method has a blind spot, and they are not the same blind spot. A
                transit without a mass leaves you a size and no idea what it is made
                of. A radial velocity without a transit leaves you a lower limit on a
                mass. Together they give a real planet. That combination, not any one
                technique, is what characterizing another world actually consists of.`,
    },
  ],
};

export default RADIAL_VELOCITY;
