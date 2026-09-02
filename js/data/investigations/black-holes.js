// =============================================================================
// Black holes by the numbers
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

// --- 5. Black holes by the numbers -------------------------------------------

const BH_LAB = {
  scenario: 'Black Hole Lab',
  seed: 'black-hole-lab',
  camera: { zoom: 1.5, pan: { x: 0, y: 0 } },
  paused: false,
};

/** The instrument that draws one horizon at a scale that does not move. */
const horizonTool = (extra = {}) => ({ id: 'bh-horizon', ...extra });

const BLACK_HOLES = {
  id: 'black-holes',
  thumbnail: 'images/scenarios/black-hole-lab.webp',
  title: 'Black Holes by the Numbers',
  subtitle: 'Make a black hole bigger and discover some surprising rules',
  duration: '35-45 min',
  level: 'Introductory astronomy',
  // The inspector stays available here. Every number this lesson quotes is one
  // the object card already computes, and letting a student check the lesson
  // against the simulation is the point rather than a distraction.
  lock: { placement: true, inspector: false, areaSweep: false },
  summary:
    'Change one thing about a black hole, its mass, and watch four completely different properties respond. Its event horizon grows in step with the mass. Its average density falls. It gets colder. It lives dramatically longer. Two of those four surprise almost everybody, and you will predict them before you measure them.',
  objectives: [
    'Say what the event horizon of a black hole is, and what it is not',
    'Describe how the Schwarzschild radius changes when the mass changes',
    'Explain why the escape-speed argument gives the right answer for the wrong reason',
    'Predict how average density, temperature and lifetime change with mass',
    'Place a black hole in the stellar, intermediate or supermassive class from its mass',
  ],
  steps: [
    {
      type: 'read',
      title: 'Not a hole, and not a vacuum cleaner',
      body: `On screen is a black hole of ten solar masses, and four objects
             going round it. Watch them for a moment.
             \n\nNothing is falling in. That is worth sitting with, because the
             most common thing people believe about black holes is that they
             pull everything nearby into themselves. They do not. Gravity a
             long way from a black hole is exactly the same gravity as anywhere
             else: an object with sideways motion goes into orbit around a ten
             solar mass black hole in precisely the way it would orbit a ten
             solar mass star. If the Sun were swapped for a black hole of the
             same mass, the Earth's orbit would not change at all. It would
             just get very dark.
             \n\nA black hole is not a hole in space either. It is mass, packed
             into a small enough space that gravity wins.
             \n\nThis investigation is about one question: what changes when you
             make that mass bigger?`,
      tip: 'Click the black hole to open its information card. Everything this lesson calculates is on that card too, worked out by the simulation from the same formulas.',
      setup: BH_LAB,
    },
    {
      type: 'question',
      title: 'What could "size" even mean?',
      kind: 'choice',
      body: `Here is the awkward part. A black hole does not have a surface. It
             is not a ball of rock with an edge you could land on, and there is
             nothing there to measure with a ruler.
             \n\nSo when an astronomer says a black hole is thirty kilometers
             across, what could they possibly be measuring? Have a guess. You
             are not expected to know this yet.`,
      prompt: 'The "size" of a black hole most likely means…',
      options: [
        'the width of the lump of matter that fell in',
        'the distance out to which its gravity reaches',
        'the boundary inside which nothing can get back out',
        'nothing, because a black hole has no size',
      ],
      answer: 2,
      because:
        'It is the boundary. Not a surface, not an object, not a wall you could touch: a place in space where the situation changes. Outside it, light can still get away. Inside it, nothing can. That boundary is called the event horizon, and how far out it sits is what astronomers mean by the size of a black hole. The second answer is a good guess and a common one, but gravity has no edge; it just gets weaker with distance, and it does that around a black hole exactly as it does around a star.',
    },
    {
      type: 'read',
      title: 'The event horizon',
      body: `The picture beside this one is a black hole drawn on its own. The
             black disc is not the object. It is the region inside the
             <strong>event horizon</strong>, and it is drawn black because no
             light from inside it ever reaches your eye.
             \n\nThe event horizon is a boundary in space, not a thing. There is
             no shell, no crust, nothing to bump into. If you crossed it you
             would not notice anything happening at that moment. What changes is
             what is possible: from outside the horizon, a signal can still get
             out to the rest of the universe. From inside, it cannot, ever,
             however powerful the transmitter.
             \n\nThe distance from the middle out to that boundary has a name:
             the <strong>Schwarzschild radius</strong>, written
             <strong>R<sub>s</sub></strong>. It is marked on the picture with a
             blue line, and its value is written underneath. Karl Schwarzschild
             worked it out in 1916, from Einstein's brand new theory, while
             serving in the German army on the Russian front. He died of an
             illness a few months later.`,
      tool: horizonTool({
        values: { mass: 10 },
        hide: ['mass'],
        compare: false,
        rows: ['mass', 'radius'],
        title: 'A ten solar mass black hole',
        note: 'The blue line is the Schwarzschild radius: from the middle out to the event horizon.',
      }),
      tip: 'Every black hole in this lesson is treated as a simple one: not spinning and not electrically charged. Real black holes generally do spin, which changes the shape of the horizon, but not the trends you are about to find.',
    },
    {
      type: 'read',
      title: 'Thirty kilometers is not very much',
      body: `A ten solar mass black hole has a Schwarzschild radius of about
             thirty kilometers. Right across the horizon, that is fifty nine
             kilometers.
             \n\nThe bars underneath the picture are drawn at the same scale as
             the black hole itself, so you can compare them directly. The
             horizon of this thing is about a marathon and a half, and not quite
             three times the length of Manhattan.
             \n\nHold on to how strange that is. It has ten times as much
             material in it as the Sun. The Sun's radius is 696,000 kilometers.
             This is 30. Same kind of stuff, roughly ten times as much of it,
             and it fits inside a medium sized city.`,
      tool: horizonTool({
        values: { mass: 10 },
        hide: ['mass'],
        rows: ['mass', 'radius', 'across', 'compare'],
        title: 'Ten solar masses, against things you know',
        note: 'The black hole and all three bars are drawn at one scale. Nothing here is exaggerated.',
      }),
      tip: 'For scale in the other direction: to make a black hole the size of the Earth you would need about two thousand solar masses, and to make one the size of the Sun, about two hundred and thirty thousand.',
    },
    {
      type: 'predict',
      title: 'Now make it heavier',
      body: `You are about to be handed a mass slider. Before you touch it,
             commit to an answer.
             \n\nSuppose you take that ten solar mass black hole and double it
             to twenty solar masses. Think about what happens to the event
             horizon.`,
      prompt: 'Doubling the mass will make the Schwarzschild radius…',
      options: [
        'stay exactly the same',
        'get bigger, roughly doubling',
        'get bigger, but by very much more than double',
        'get smaller, because more mass means tighter gravity',
      ],
      answer: 1,
      because:
        'It doubles. If you picked the last option you are in good company: more mass does mean stronger gravity, and it is very natural to expect a heavier black hole to be a more tightly squeezed one. That is not what happens, and the next few screens are about watching it not happen.',
    },
    {
      type: 'explore',
      title: 'Three measurements',
      body: `Here is the experiment. The slider sets the mass. The panel works
             out the Schwarzschild radius. Pressing <strong>Record this
             trial</strong> puts that pair of numbers into the table underneath
             and drops a point on the graph.
             \n\nYou only need three. Take them at 5, 10 and 20 solar masses:
             each one is double the one before, which will make the pattern easy
             to see.`,
      tool: {
        id: 'bh-scaling',
        session: 'rs-vs-m',
        values: { mass: 5 },
        title: 'Mass against horizon size',
        note: 'Set a mass, press Record, repeat. Clear trials starts the table again if you want to redo it.',
      },
      checklist: [
        'Set the slider to 5 M☉ and press Record this trial',
        'Set it to 10 M☉ and press Record again',
        'Set it to 20 M☉ and press Record once more',
        'Read the three radii in the table under the graph',
        'Look at where the three points have landed',
      ],
      tip: 'If you record the same mass twice it replaces the old value rather than adding a second point, so you cannot clutter the graph by mistake.',
    },
    {
      type: 'question',
      title: 'What did doubling do?',
      kind: 'choice',
      body: `Look at your first two trials. You went from 5 solar masses to 10,
             which is twice as much mass. The radius went from about 14.8
             kilometers to about 29.5.`,
      prompt: 'When the mass doubled, the Schwarzschild radius…',
      options: [
        'stayed about the same',
        'roughly doubled as well',
        'roughly quadrupled',
        'went up by about eight times',
      ],
      answer: 1,
      because:
        'It doubled. And going from 10 to 20 doubled it again, from 29.5 to 59.1 kilometers. Twice the mass, twice the radius, every time.',
      tool: {
        id: 'bh-scaling',
        session: 'rs-vs-m',
        title: 'Your three trials',
        note: 'The table underneath the graph holds the numbers you recorded. If it is empty, step back one and take the three measurements.',
      },
    },
    {
      type: 'question',
      title: 'Read the graph',
      kind: 'choice',
      body: `Now look at the shape your three points make. The dashed line is
             drawn through them, starting from zero.`,
      prompt:
        'The graph of Schwarzschild radius against mass shows that the radius…',
      options: [
        'stays constant no matter what the mass is',
        'increases steadily, in a straight line through zero',
        'decreases as the mass increases',
        'changes with no pattern at all',
      ],
      answer: 1,
      because:
        'A straight line, and one that goes through the corner rather than starting somewhere up the axis. That is the signature of the simplest possible relationship there is: whatever you do to one, the same thing happens to the other. Triple the mass and the radius triples. Take a tenth of the mass and you get a tenth of the radius.',
      tool: {
        id: 'bh-scaling',
        session: 'rs-vs-m',
        title: 'Your three trials',
        note: 'The dashed line is drawn through your own points, starting from zero. If the graph is empty, step back one and record the three trials.',
      },
    },
    {
      type: 'read',
      title: 'The rule you just found',
      body: `What you measured has a shorthand:
             <strong>R<sub>s</sub> ∝ M</strong>. The symbol in the middle is
             read "is proportional to", and it means exactly what your graph
             shows: a straight line through zero.
             \n\nIn words, and this is the sentence worth remembering:
             <strong>double the mass of a black hole and its event horizon
             radius doubles.</strong>
             \n\nIf you want to see the full version, it is
             R<sub>s</sub> = 2GM/c², where G is the strength of gravity and c is
             the speed of light. You will not be asked to do anything with it.
             The only part that matters here is that M appears once, on its own,
             on the top: that is what makes the graph a straight line.
             \n\nThe useful consequence: about 3 kilometers of radius for every
             solar mass. A 20 solar mass black hole, 60 kilometers. A thousand
             solar masses, 3,000 kilometers. It is that simple, all the way up.`,
      tip: 'Schwarzschild found this radius in the first few months after Einstein published general relativity, and Einstein did not believe anything real could ever be that compact. It took another fifty years for astronomers to start finding them.',
    },
    {
      type: 'predict',
      title: 'Squeezing, and getting away',
      body: `Change of subject, briefly. Why is there a horizon at all?
             \n\nThink about throwing a ball straight up. Throw it hard enough
             and it never comes back down: that speed is called the escape
             speed, and for the Earth it is about 11 kilometers per second.
             \n\nNow imagine taking all of the Earth's material and squeezing it
             into a ball the size of a shopping mall. Same mass, much smaller.`,
      prompt:
        'Standing on the surface of the squeezed Earth, the escape speed would be…',
      options: [
        'the same, because the mass has not changed',
        'lower, because there is less material underneath you',
        'higher, because you are much closer to all of that mass',
        'zero, because a small object has no gravity',
      ],
      answer: 2,
      because:
        'Higher, and dramatically so. Escape speed depends on two things: how much mass is pulling, and how close to it you are standing. Squeezing an object does not change the mass, but it lets you get far closer to the middle of it, and being closer is what makes escaping hard.',
    },
    {
      type: 'explore',
      title: 'Squeeze the Sun',
      body: `The panel takes the Sun and squeezes it. Its mass never changes:
             it is one solar mass at every setting. Only the size changes.
             \n\nThe gauge underneath is the escape speed from the surface,
             worked out the ordinary way, the way you would for a planet. The
             bright orange line at the right hand end is the speed of light.
             \n\nUse the buttons underneath to jump to each size in turn, and
             watch two things at once: the ball shrinking, and the gauge
             filling.`,
      tool: {
        id: 'bh-escape',
        title: 'One solar mass, squeezed',
        note: 'The faint dashed circle is the Sun at its real size. The filled dot is the squeezed version, drawn at the same scale.',
      },
      checklist: [
        'Press The Sun today: the gauge is almost empty, at 0.2%',
        'Press Earth-sized: a whole solar mass in a ball the size of the Earth',
        'Press 30 km, about the size of a city, and read the gauge',
        'Press 6 km and watch how close to the orange line it gets',
        'Press 3 km',
      ],
      tip: 'The 30 km setting is roughly a real object: a neutron star. A solar mass or so of material in a ball the width of a city, and escaping from its surface really does take about a third of the speed of light.',
    },
    {
      type: 'question',
      title: 'The last squeeze',
      kind: 'choice',
      body: `You have squeezed one solar mass down to a radius of 2.95
             kilometers. Look at the gauge.`,
      prompt: 'At a radius of about 3 kilometers, the escape speed reaches…',
      options: [
        'about half the speed of light',
        'exactly the speed of light',
        'somewhat more than the speed of light',
        'a value too large to calculate',
      ],
      answer: 1,
      because:
        'Exactly the speed of light. And look at the number: 2.95 kilometers is the Schwarzschild radius of one solar mass, the same number you have been using all lesson. Squeeze any mass down to its own Schwarzschild radius and this calculation says light needs the speed of light to get away, which means it cannot.',
      tool: {
        id: 'bh-escape',
        values: { logr: 0.4705 },
        title: 'One solar mass, squeezed to 2.95 km',
        note: 'The gauge has reached the orange line.',
      },
    },
    {
      type: 'question',
      title: 'The right answer for the wrong reason',
      kind: 'choice',
      body: `That argument is a good one to have met, and it is how the idea was
             first imagined, by John Michell in 1783. But it needs a warning
             label, and here it is.
             \n\nThe calculation you just watched is ordinary Newtonian gravity,
             the kind that describes cannonballs. It gives exactly the right
             radius. It does not give the right reason. A real black hole is
             <strong>not</strong> an object whose ordinary escape speed happens
             to have crept above the speed of light, with light making a
             valiant attempt and falling back like a thrown ball.
             \n\nWhat actually happens is described by Einstein's general
             relativity, in which mass bends the geometry of space and time
             around it. Close enough to a black hole, that geometry is bent so
             far that every direction leading away from the hole has stopped
             existing. Light does not fail to escape. There is no longer
             anywhere for it to escape to.
             \n\nThat is as far as this lesson goes into it, and it is enough.`,
      prompt: 'Which of these statements about the event horizon is true?',
      options: [
        'It is a solid surface, and something crossing it would hit it',
        'Gravity switches on at the horizon and is absent outside it',
        'It is a boundary in space marking where signals can no longer get out',
        'It is the edge of the lump of matter that formed the black hole',
      ],
      answer: 2,
      because:
        'A boundary, and nothing more solid than that. Two things to be clear about while you are here. There is nothing to hit: an astronaut crossing the horizon of a large black hole would notice nothing at all happening at that moment. And gravity does not switch on there. Gravity was already acting outside, which is why the four objects at the start of this lesson were in orbit, and it goes on acting inside; the horizon is simply where getting back out stops being possible.',
    },
    {
      type: 'predict',
      title: 'Which one is denser?',
      body: `Back to the mass slider, and to a question that catches out almost
             everybody.
             \n\nDensity is how much mass is packed into a given amount of
             space. A brick is denser than a loaf of bread the same size,
             because there is more stuff in it.
             \n\nCompare two black holes: one of ten solar masses, and one of a
             million solar masses. Commit to an answer before you look at
             anything.`,
      prompt: 'Averaged over the space inside its horizon, which is denser?',
      options: [
        'the 10 solar mass black hole',
        'the 1,000,000 solar mass black hole',
        'they work out the same',
        'it depends on what each one was made from',
      ],
      answer: 0,
      because:
        'The small one, by an enormous margin. Most people pick the big one, and the reasoning behind that choice is perfectly sensible: a bigger black hole has more mass, and more mass in the same space would mean higher density. The catch is in those last four words. It is not the same space. The next few screens are about why.',
    },
    {
      type: 'explore',
      title: 'Mass divided by volume',
      body: `First, what is being measured. Density is mass divided by volume:
             how much stuff, divided by how much room it takes up. Water comes
             out at 1,000 kilograms per cubic meter; air, about 1.2.
             \n\nFor a black hole we take its mass and divide by the volume of a
             sphere the size of its event horizon. Be careful about what that
             number is and is not. It is a useful comparison, a way of asking
             "how concentrated is this thing, on the scale of its own horizon".
             It is <strong>not</strong> a claim that the inside is a uniform ball
             of material at that density. Nobody knows what the inside is like,
             and it is certainly not that.
             \n\nThe ladder in the panel is a scale of density with familiar
             things marked on it. Each small tick going up is ten times denser
             than the one below. Use the four buttons and watch the orange
             marker.`,
      tool: {
        id: 'bh-density',
        values: { logm: 1 },
        title: 'Average density on the horizon scale',
        note: 'Every small tick is ten times denser than the one below it. The orange line is where this black hole sits.',
      },
      checklist: [
        'Press 10 M☉ and note where the marker sits on the ladder',
        'Press 100 M☉ and watch which way it moves',
        'Press 1,000 M☉',
        'Press 1,000,000 M☉ and compare that with where you started',
      ],
      tip: 'Drag the slider slowly rather than jumping between the buttons and the marker slides smoothly down the ladder, which makes the direction of travel unmistakable.',
    },
    {
      type: 'question',
      title: 'Which way did it go?',
      kind: 'choice',
      body: `You have just watched a black hole get a hundred thousand times
             more massive.`,
      prompt: 'As the mass increased, the average density on this scale…',
      options: [
        'increased',
        'decreased',
        'stayed the same',
        'went up and then back down',
      ],
      answer: 1,
      because:
        'It went down, and it went down hard. A 10 solar mass black hole comes out at roughly the density of an atomic nucleus. A million solar mass one is ten powers of ten below that: still denser than anything you could hold, but the direction of travel is unmistakable. Push it further and it gets stranger. At about 140 million solar masses the average density on this scale drops below the density of water, and the black hole at the center of the galaxy M87, at six and a half billion solar masses, works out thinner than the air in the room you are sitting in.',
      tool: {
        id: 'bh-density',
        values: { logm: 6 },
        reference: 10,
        title: 'A million solar masses',
        note: 'The bottom row underneath compares this with where the 10 solar mass black hole sat.',
      },
    },
    {
      type: 'question',
      title: 'Where the room comes from',
      kind: 'numeric',
      body: `Here is the reason, and it comes down to counting zeros.
             \n\nWhen mass goes up by some factor, the radius goes up by the
             same factor: that is the rule you measured earlier. But volume is
             not radius. Volume grows in all three directions at once, so a
             sphere with ten times the radius has ten times ten times ten, a
             thousand times, the room inside it.
             \n\nSo the mass gains some zeros, and the volume gains three times
             as many. Density is mass divided by volume, and it loses the
             difference.
             \n\nSet the slider in the panel to <strong>×1,000</strong> and read
             the bars.`,
      prompt:
        'Multiplying the mass by 1,000 adds 3 zeros. How many zeros does the volume gain?',
      unit: 'zeros',
      answer: 9,
      tolerance: 0.5,
      because:
        'Nine, because volume grows in three directions at once: 3 + 3 + 3. The mass gained 3 zeros and the volume gained 9, so the density lost the difference, 6 zeros. It fell by a factor of a million. That is the whole surprise, and it is nothing more exotic than the fact that spheres get roomy faster than they get wide.',
      tool: {
        id: 'bh-blocks',
        values: { zeros: 3 },
        title: 'Counting the zeros',
        note: 'The blue bars gain zeros. The red one loses them. Bar length is the number of zeros, not the number itself.',
      },
      tip: 'The chain in one line: more mass, larger horizon, very much larger volume, lower average density.',
    },
    {
      type: 'predict',
      title: 'Which one is hotter?',
      body: `A third property, and a third chance to be surprised.
             \n\nIn 1974 Stephen Hawking showed that black holes are not
             completely black. Quantum physics predicts that a black hole
             behaves as though it has a temperature, and radiates a very faint
             glow because of it.
             \n\nEvery black hole has one of these temperatures. Compare a small
             one with a giant one and commit to an answer.`,
      prompt: 'Which do you expect to have the higher Hawking temperature?',
      options: [
        'the small black hole, of a few solar masses',
        'the supermassive one, of millions of solar masses',
        'they are at the same temperature',
        'neither: black holes have no temperature at all',
      ],
      answer: 0,
      because:
        'The small one, and by a very long way. The larger black hole is the natural guess: bigger usually means more of everything. This is one of the cases where it does not, and you are about to watch how far it goes the other way.',
    },
    {
      type: 'read',
      title: 'What Hawking radiation is, and what to be careful about',
      body: `Keep this modest, because the honest version is quite technical.
             \n\nQuantum effects near a black hole cause it to behave as though
             it has a temperature and to emit a very faint radiation. That is
             the claim, and it is enough for this lesson.
             \n\nYou may have heard a story about pairs of particles popping
             into existence at the horizon, one falling in and one escaping. It
             is a picture Hawking himself used, and it is a good deal less
             accurate than it sounds; the actual calculation is about quantum
             fields in curved spacetime and does not really work like that. It
             is mentioned here only so that you are not surprised to meet it
             elsewhere.
             \n\nOne more thing worth saying: this has never been observed. The
             temperatures involved are so low that no experiment can currently
             get anywhere near them, as the next screen will make painfully
             clear.`,
      tip: 'Hawking regarded this as his most important result, and asked for the equation for a black hole’s entropy, which comes from the same work, to be carved on his memorial stone in Westminster Abbey.',
    },
    {
      type: 'explore',
      title: 'The thermometer',
      body: `The panel is a thermometer, with familiar temperatures marked on
             it. It has to be a strange thermometer, because the range it needs
             to cover is enormous: every small tick going up is ten times hotter
             than the one below it.
             \n\nThe coldest thing marked is the coldest temperature ever
             produced in a laboratory. The one labeled "the microwave
             background" is the temperature of empty space itself, 2.7 degrees
             above absolute zero, left over from the Big Bang.
             \n\nUse the buttons to work up through the masses.`,
      tool: {
        id: 'bh-thermo',
        values: { logm: 0 },
        title: 'Hawking temperature',
        note: 'Every small tick is ten times hotter than the one below. The bar shows where this black hole sits.',
      },
      checklist: [
        'Press 1 M☉ and find the level on the thermometer',
        'Press 10 M☉ and watch which way the level moves',
        'Press 1,000 M☉',
        'Press Sagittarius A* and read the temperature underneath',
      ],
      tip: 'The row that says how much colder than the microwave background is the one to watch. It is the difference between a number that is small and a number that is unimaginable.',
    },
    {
      type: 'question',
      title: 'Colder, not hotter',
      kind: 'choice',
      body: `You have taken a black hole from one solar mass up to four million
             and watched the thermometer the whole way.`,
      prompt: 'As the mass of a black hole increases, its Hawking temperature…',
      options: [
        'increases',
        'decreases',
        'stays the same',
        'increases at first and then decreases',
      ],
      answer: 1,
      because:
        'It decreases, and the rule is as simple as the one for radius, just upside down: T ∝ 1/M. Double the mass and you halve the temperature. The biggest black holes in the universe are the coldest objects in it. A ten solar mass black hole sits at about six billionths of a degree above absolute zero. Sagittarius A*, at the center of our galaxy, is four hundred thousand times colder still. Both are far colder than the empty space around them, which means both are absorbing more energy from the microwave background than they give off, and are very slowly growing rather than shrinking.',
      tool: {
        id: 'bh-thermo',
        values: { logm: 6.6334 },
        title: 'Sagittarius A*, at four million solar masses',
        note: 'Far below the coldest temperature any laboratory has ever reached.',
      },
    },
    {
      type: 'predict',
      title: 'Then what happens to it?',
      body: `Follow the logic. If a black hole radiates, then it is losing
             energy. Energy and mass are the same currency, so it is losing
             mass. Slowly, over a very long time, it shrinks: this is called
             evaporation.
             \n\nHere is the question. You already know that small black holes
             are hotter than large ones, and a hotter object radiates more
             strongly.`,
      prompt: 'Which black hole evaporates away first?',
      options: [
        'the smaller one, because it is hotter and radiates faster',
        'the larger one, because it has more to give off',
        'they finish at the same time',
        'neither: evaporation never actually finishes',
      ],
      answer: 0,
      because:
        'The small one, on both counts: it is hotter, so it radiates faster, and it has less to lose. Both effects point the same way, which is why the difference between a small black hole and a large one turns out to be so extreme.',
    },
    {
      type: 'explore',
      title: 'A timeline that will not fit on a page',
      body: `The numbers here get out of hand, so the panel counts zeros instead
             of years. The age of the universe, 13.8 billion years, is a 1
             followed by 10 zeros, so its bar reaches 10. A number with 70 zeros
             gets a bar reaching 70.
             \n\nThat is all a bar means here: how many zeros. And each extra
             zero is another factor of ten, so a bar twice as long is not twice
             as long a time. It is unimaginably longer.
             \n\nWork up through the masses and watch the orange bar.`,
      tool: {
        id: 'bh-lifetime',
        values: { logm: 1 },
        title: 'How long until it evaporates',
        note: 'Bar length counts the zeros. The two grey bars are there for comparison and never move.',
      },
      checklist: [
        'Press 1 M☉ and compare the orange bar with the age of the universe',
        'Press 10 M☉',
        'Press 1,000 M☉ and watch the bar stretch',
        'Press Sagittarius A* and read the number of zeros',
      ],
      tip: 'A black hole with the mass of a mountain, rather than a star, would be small enough and hot enough to have evaporated by now. Nobody has ever found one, and whether any were made in the Big Bang is still an open question.',
    },
    {
      type: 'question',
      title: 'Longer, and then much longer',
      kind: 'choice',
      body: `A one solar mass black hole lasts about 10⁶⁷ years. Sagittarius
             A*, four million times heavier, lasts about 10⁸⁷.
             \n\nThat is not four million times longer. It is twenty extra
             zeros: a hundred million million million times longer.`,
      prompt: 'As mass increases, the evaporation lifetime…',
      options: [
        'gets shorter',
        'gets longer, roughly in step with the mass',
        'gets longer far faster than the mass increases',
        'does not depend on the mass',
      ],
      answer: 2,
      because:
        'Far faster. The rule is lifetime ∝ M³: double the mass and the lifetime goes up by eight times. Triple it and it goes up twenty seven times. That is why a factor of four million in mass becomes a factor of 10²⁰ in lifetime. Two things must be said plainly. First, none of this is happening yet: every known black hole is colder than the space around it, so all of them are currently gaining mass, not losing it, and evaporation cannot even begin until the universe has cooled far below its present temperature. Second, these lifetimes are longer than the age of the universe by so much that the comparison stops meaning anything.',
      tool: {
        id: 'bh-lifetime',
        values: { logm: 6.6334 },
        title: 'Sagittarius A*',
        note: 'Compare the length of the orange bar with the age of the universe.',
      },
    },
    {
      type: 'read',
      title: 'From city-sized to solar-system-sized',
      body: `One relationship, R<sub>s</sub> ∝ M, running across an enormous
             range of masses. Astronomers sort black holes into three loose
             groups:
             \n\n<strong>Stellar-mass</strong>, a few to a few tens of solar
             masses, left behind when a massive star collapses.
             <strong>Intermediate-mass</strong>, hundreds up to hundreds of
             thousands, which are rare and hard to find and were only confirmed
             recently. <strong>Supermassive</strong>, millions to billions,
             sitting at the centers of galaxies.
             \n\nThose boundaries are conventions rather than laws of nature.
             Nothing changes in the physics as you cross them.
             \n\nThe panel has four black holes in it. Use the slider to look at
             each one. <strong>Each is drawn at its own scale</strong>, because
             the largest is half a million times wider than the smallest and
             they cannot share a picture. The scale bar in the corner tells you
             which scale you are looking at, and the comparison object beside
             each hole is drawn at that same scale.`,
      tool: {
        id: 'bh-lineup',
        values: { which: 0 },
        title: 'Four black holes',
        note: 'Watch the scale bar in the bottom corner change as you move between them. A is measured in kilometers; D is measured in astronomical units, the distance from the Earth to the Sun.',
      },
      tip: 'One astronomical unit, 1 AU, is the distance from the Earth to the Sun: about 150 million kilometers.',
    },
    {
      type: 'question',
      title: 'Sorting them out',
      kind: 'choice',
      body: `Use the four masses listed under the picture. You do not need to
             calculate anything.`,
      prompt: 'Which of the four is a supermassive black hole?',
      options: [
        'A, at 8 M☉',
        'B, at 1,000 M☉',
        'C, at 150,000 M☉',
        'D, at 4.3 million M☉',
      ],
      answer: 3,
      because:
        'D, at 4.3 million solar masses, is the only one in the millions. For the others: A at 8 solar masses is stellar-mass, the kind left behind by a dying star. B at 1,000 and C at 150,000 are both intermediate-mass, and the enormous gap between those two is a fair picture of how loose that category is. Notice what the relationship does across the range: A’s horizon radius is about the length of Manhattan, B’s is about half the radius of the Earth, C’s is two thirds of the radius of the Sun, and D’s reaches a fifth of the way out to Mercury.',
      tool: {
        id: 'bh-lineup',
        values: { which: 3 },
        title: 'Four black holes',
        note: 'The list underneath gives all four masses and horizon radii.',
      },
    },
    {
      type: 'question',
      title: 'A mystery black hole: size and density',
      kind: 'choice',
      body: `Last of all, a test of whether the trends have stuck. Black hole D
             is far more massive than a stellar-mass black hole, and that is the
             only thing you need to know about it.
             \n\nAnswer from the rules you found, not by working anything out.`,
      prompt:
        'Compared with a stellar-mass black hole, D’s event horizon and its average density are…',
      options: [
        'a larger horizon, and a higher average density',
        'a larger horizon, and a lower average density',
        'a smaller horizon, and a higher average density',
        'a smaller horizon, and a lower average density',
      ],
      answer: 1,
      because:
        'Larger horizon, lower average density. The horizon grows in step with the mass, so a black hole half a million times heavier has a horizon half a million times wider. But the volume inside that horizon grows three times as fast in zeros, so the average density falls away.',
      tool: {
        id: 'bh-lineup',
        values: { which: 3 },
        title: 'Black hole D',
        note: 'Answer from the trends you found rather than from this panel.',
      },
    },
    {
      type: 'question',
      title: 'A mystery black hole: temperature and lifetime',
      kind: 'choice',
      body: `Same black hole, the other two properties.`,
      prompt:
        'Compared with a stellar-mass black hole, D’s Hawking temperature and its evaporation lifetime are…',
      options: [
        'hotter, and a shorter lifetime',
        'hotter, and a longer lifetime',
        'colder, and a shorter lifetime',
        'colder, and a longer lifetime',
      ],
      answer: 3,
      because:
        'Colder, and vastly longer lived. Both of these are the opposite of what people expect the first time, and you predicted them both correctly from a rule you discovered by moving a slider.',
      tool: {
        id: 'bh-lineup',
        values: { which: 3 },
        title: 'Black hole D',
        note: 'Answer from the trends you found rather than from this panel.',
      },
    },
    {
      type: 'read',
      title: 'It has a name',
      body: `Black hole D is <strong>Sagittarius A*</strong>, and it is 26,000
             light years away at the center of our own galaxy. Its mass, 4.3
             million solar masses, was measured by watching stars orbit it for
             thirty years; the work won the Nobel Prize in Physics in 2020. In
             2022 the Event Horizon Telescope published a picture of it.
             \n\nEverything you predicted about it is right. Its horizon is
             about 12.7 million kilometers across the radius, a fifth of the way
             out to Mercury. Its average density on that scale is about a
             million kilograms per cubic meter, roughly two hundred billion times
             lower than a ten solar mass black hole works out at. Its temperature is 1.4 × 10⁻¹⁴ degrees
             above absolute zero. It will take about 10⁸⁷ years to evaporate.
             \n\nSo: making a black hole more massive does much more than make
             it bigger.
             \n\n<strong>More mass → a larger event horizon.</strong>
             \n\n<strong>More mass → a lower average density on the horizon
             scale.</strong>
             \n\n<strong>More mass → a lower Hawking temperature.</strong>
             \n\n<strong>More mass → a very much longer lifetime.</strong>
             \n\nYou changed one thing, and four completely different properties
             answered. That is what it means to say that black holes follow the
             same rules across their whole range, from the remnant of a single
             dead star to the giants at the centers of galaxies.`,
      tool: {
        id: 'bh-lineup',
        values: { which: 3 },
        named: true,
        title: 'Sagittarius A*',
        note: 'The dashed circle is the orbit of Mercury, drawn at the same scale as the horizon.',
      },
      tip: 'The simplest black hole of all, and the one this lesson has used throughout, is a Schwarzschild black hole: not spinning, not charged. Real ones spin, sometimes very fast, and a spinning black hole is described by the Kerr solution instead. The horizon changes shape and size; every trend you found here survives.',
    },
  ],
};

export default BLACK_HOLES;
