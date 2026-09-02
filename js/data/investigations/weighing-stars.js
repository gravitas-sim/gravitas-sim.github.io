// =============================================================================
// Weighing the stars
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

// --- 4. Weighing the stars ----------------------------------------------------

const BINARY_LAB = {
  scenario: 'Binary Pair',
  seed: 'binary-lab',
  camera: { zoom: 1.5, pan: { x: 0, y: 0 } },
  paused: false,
};

const WEIGHING = {
  id: 'weighing-stars',
  thumbnail: 'images/scenarios/binary-pair.webp',
  title: 'Weighing the Stars',
  subtitle: 'Use an orbit to measure something you cannot put on a scale',
  duration: '35-45 min',
  level: 'Introductory astronomy',
  lock: { placement: true, inspector: true, areaSweep: false },
  summary:
    'Kepler’s laws end with Newton’s correction, and this is what that correction is for. Watch two stars circle each other, find the balance point they are both going round, and use nothing but the size and the timing of their orbit to work out how much each one weighs. No telescope has ever put a star on a scale; this is how it is actually done.',
  objectives: [
    'Explain why both stars in a binary move, rather than one going round the other',
    'Say what the barycenter is and where it sits when one star is heavier',
    'Use the distances of two stars from the barycenter to compare their masses',
    'Use the size and period of an orbit to find the total mass of a pair',
    'Split a measured total mass between two stars',
    'Explain why binary stars are how astronomers know what stars weigh',
  ],
  steps: [
    {
      type: 'read',
      title: 'You cannot put a star on a scale',
      body: `A bathroom scale works by pushing back. Stand on it, and it measures
             how hard the Earth is pulling you down. There is no version of that
             for a star. Stars are enormous, they are unreachable, and the
             nearest one after the Sun is forty thousand years away at the speed
             of a spacecraft.
             \n\nAnd yet, open any astronomy textbook and it will tell you the
             mass of dozens of stars, to two decimal places. Somebody measured
             them. How?
             \n\nThe answer is the last thing the Kepler investigation showed
             you. Kepler found that the size and the timing of an orbit go
             together. Newton found that the <em>mass</em> of whatever is doing
             the pulling belongs in that relationship too, and once you know
             that, an orbit becomes a measuring instrument.
             \n\nThis lesson is about pointing that instrument at a pair of
             stars.`,
      tip: 'Nothing here needs algebra. You will read two numbers off a screen and do one division.',
      setup: BINARY_LAB,
    },
    {
      type: 'question',
      title: 'How would you do it?',
      kind: 'choice',
      body: `Before going any further, think about what could possibly work.
             You have a telescope. You cannot travel there, you cannot touch it,
             and you cannot wait very long.`,
      prompt: 'How could an astronomer measure the mass of a star?',
      options: [
        'Measure how bright it looks',
        'Measure how large it looks',
        'Watch how its gravity moves something else',
        'There is no way to measure a star’s mass',
      ],
      answer: 2,
      because:
        'Gravity is the only one of these that depends on mass. Brightness and size are related to mass for ordinary stars, but only loosely, and only because somebody first measured masses another way. Watching how a star pulls something else is the direct measurement, and everything else is calibrated against it.',
    },
    {
      type: 'predict',
      title: 'Two stars, side by side',
      body: `On screen are two stars of about the same size, close enough
             together that gravity holds them to each other. Pairs like this are
             extremely common: something like half of all the stars you can see
             have a companion.
             \n\nIn a moment you will watch them. Commit to an answer first.`,
      prompt: 'When you press play, which star stays where it is?',
      options: [
        'Star A stays put and Star B goes round it',
        'Star B stays put and Star A goes round it',
        'Both of them stay put',
        'Neither of them stays put',
      ],
      answer: 3,
      because:
        'Neither. This trips almost everybody up the first time, because every diagram of the Solar System has the Sun nailed to the middle of the page. It is not: the Sun moves too, just not by much. With two stars of similar size, both of them move by a lot, and it is obvious.',
    },
    {
      type: 'explore',
      title: 'Watch them',
      body: `Here they are, with a trail behind each one so you can see where it
             has been.
             \n\nDo not measure anything yet. Just watch for a few seconds and
             pay attention to what each star is doing.`,
      tool: {
        id: 'binary',
        values: { m1: 2, m2: 2 },
        hide: ['m1', 'm2'],
        presets: false,
        barycenter: false,
        rows: [],
        title: 'Two stars',
        note: 'Two stars of equal mass, four AU apart. The trails show where each one has been.',
      },
      checklist: [
        'Watch until each star has been all the way round at least once',
        'Follow Star A with your eye for one full lap',
        'Now follow Star B for one full lap',
        'Press Run / Pause to freeze the picture and look at the two trails',
      ],
      tip: 'The Run / Pause and Reset buttons are underneath the picture. Pausing is often the easiest way to look at something carefully.',
    },
    {
      type: 'question',
      title: 'What moved?',
      kind: 'choice',
      body: `You have watched a full lap. Answer from what you saw, not from
             what you expected.`,
      prompt: 'In that system…',
      options: [
        'only Star A moved',
        'only Star B moved',
        'both stars moved, each tracing its own circle',
        'the stars stayed still and the background moved',
      ],
      answer: 2,
      because:
        'Both moved, and each traced its own circle. Notice something else about those two trails: the stars were always on opposite sides. When one was on the left, the other was on the right. They are not chasing each other round; they are swinging round something in the middle.',
    },
    {
      type: 'read',
      title: 'What are they going round?',
      body: `If both stars are moving, and they are always on opposite sides of
             each other, then there is a point between them that neither star
             ever visits and that never moves at all.
             \n\nThat point has a name. It is the <strong>barycenter</strong>,
             which is just a technical word for the balance point of the two
             stars: the place where the pair would balance if you could put them
             on a see-saw.
             \n\nIt is now marked on the picture with a cross. Watch the stars go
             round it.`,
      tool: {
        id: 'binary',
        values: { m1: 2, m2: 2 },
        hide: ['m1', 'm2'],
        presets: false,
        barycenter: true,
        rows: ['distances'],
        title: 'The balance point',
        note: 'The cross is the barycenter: the balance point of the two stars. Neither star ever reaches it, and it never moves.',
      },
      tip: 'Every orbiting pair in the universe has one of these, including the Earth and the Moon. The Earth-Moon barycenter is inside the Earth, about a thousand miles below the surface, and the Earth swings round it once a month.',
    },
    {
      type: 'question',
      title: 'Where does it sit?',
      kind: 'choice',
      body: `These two stars have the same mass as each other. Look at where the
             cross is, and at the two numbers under the picture.`,
      prompt: 'With two equal stars, the barycenter sits…',
      options: [
        'right next to Star A',
        'right next to Star B',
        'exactly halfway between them',
        'somewhere outside the pair entirely',
      ],
      answer: 2,
      because:
        'Exactly halfway. Both stars are two AU from it, which is what you would expect from a see-saw with two children of the same weight: to balance, they sit the same distance from the middle.',
    },
    {
      type: 'predict',
      title: 'Make one of them heavier',
      body: `Now for the interesting part. In the next step you will be able to
             change how much Star A weighs, and you will make it a good deal
             heavier than Star B.
             \n\nThink about the see-saw before you do it.`,
      prompt:
        'If Star A becomes much heavier than Star B, the balance point will…',
      options: [
        'move towards Star A, the heavier one',
        'move towards Star B, the lighter one',
        'stay exactly where it is',
        'disappear: there is no balance point any more',
      ],
      answer: 0,
      because:
        'It moves towards the heavier star. On a see-saw, a heavy child has to sit closer to the middle to balance a light one further out. Two stars do exactly the same thing, and for exactly the same reason.',
    },
    {
      type: 'explore',
      title: 'Try it',
      body: `Both mass sliders are unlocked. Start with them equal, then drag
             Star A’s mass up and watch the cross.
             \n\nGo to the extreme: put Star A at 4 solar masses and Star B at 1.
             Look at the size of the two trails.`,
      tool: {
        id: 'binary',
        values: { m1: 2, m2: 2 },
        barycenter: true,
        rows: ['masses', 'distances', 'which'],
        presets: false,
        title: 'Change the masses',
        note: 'Drag a mass slider and the picture starts again with the new masses. The cross is the balance point.',
      },
      checklist: [
        'Start with both stars at 2 M☉ and note the cross is in the middle',
        'Raise Star A to 3 M☉ and watch the cross shift',
        'Set Star A to 4 M☉ and Star B to 1 M☉',
        'Note which star now makes the small circle and which makes the big one',
        'Try it the other way round, with Star B the heavy one',
      ],
      tip: 'The heavier star does not sit still. It still moves. It just moves in a much smaller circle, and it moves more slowly, because it has less far to go in the same amount of time.',
    },
    {
      type: 'question',
      title: 'The rule',
      kind: 'choice',
      body: `You have now seen several combinations. Pick the statement that
             matches what actually happened.`,
      prompt: 'Comparing a heavy star with a light one in the same pair…',
      options: [
        'the heavier star makes the larger circle',
        'the heavier star stays closer to the balance point and makes the smaller circle',
        'the mass makes no difference to the size of the circles',
        'the heavier star stops moving altogether',
      ],
      answer: 1,
      because:
        'The heavier star stays closer to the balance point. Say it as a pair of arrows and it is easy to hold on to: MORE MASS → closer in, smaller circle. LESS MASS → further out, bigger circle. That single fact is going to let you compare the masses of two stars without knowing either of them.',
    },
    {
      type: 'explore',
      title: 'Put them on a see-saw',
      body: `Here is the same idea drawn as an actual see-saw, with the balance
             point in the middle and the two stars sitting out along the beam.
             \n\nMove the two distance sliders and watch the stars change size.
             Try the presets: each one sets a pair of distances and tells you
             what it means.`,
      tool: { id: 'balance', values: { d1: 1, d2: 2 } },
      checklist: [
        'Set Star A at 1 AU and Star B at 2 AU',
        'Read how many times heavier Star A has to be',
        'Try 1 AU and 3 AU',
        'Try 2 AU and 4 AU, and notice you get the same answer as 1 and 2',
      ],
      tip: 'Only the ratio of the two distances matters. 2 AU against 4 AU tells you the same thing as 1 AU against 2 AU, because in both cases one star is twice as far out as the other.',
    },
    {
      type: 'question',
      title: 'Reading the see-saw',
      kind: 'choice',
      body: `Star A sits <strong>1 AU</strong> from the balance point.
             Star B sits <strong>2 AU</strong> from the balance point.`,
      prompt: 'Which star is heavier, and by how much?',
      options: [
        'Star B, by about twice',
        'Star A, by about twice',
        'Star A, by about four times',
        'They weigh the same: distance does not matter',
      ],
      answer: 1,
      because:
        'Star A, by about twice. Star B has to travel twice as far from the balance point, so Star A must be twice as heavy to hold the other end down. The star that stays closer is the heavier one, and the ratio of the distances is the ratio of the masses, the other way up.',
    },
    {
      type: 'read',
      title: 'Writing it down',
      body: `That is the whole of the first idea, and it can be written on one
             line. If you would rather keep it in words, the words are:
             \n\n<strong>the heavier star stays proportionally closer to the
             balance point.</strong>
             \n\nIf you would rather have the line, here it is. Call the two
             masses M<sub>A</sub> and M<sub>B</sub>, and call their distances
             from the balance point r<sub>A</sub> and r<sub>B</sub>:
             \n\n<strong>M<sub>A</sub> × r<sub>A</sub> = M<sub>B</sub> ×
             r<sub>B</sub></strong>
             \n\nYou will not have to rearrange it. It is here so that the line
             looks familiar if you meet it later. Everything you actually need
             is the see-saw: three times as far out means one third as heavy.`,
      tip: 'This is why a see-saw works at all. A small child sits at the end, a large adult sits near the middle, and mass times distance comes out the same on both sides.',
    },
    {
      type: 'question',
      title: 'One more, to be sure',
      kind: 'choice',
      body: `A different pair. Star A sits <strong>2 AU</strong> from the balance
             point, and Star B sits <strong>4 AU</strong> from it.`,
      prompt: 'How do their masses compare?',
      options: [
        'Star A is twice as heavy as Star B',
        'Star B is twice as heavy as Star A',
        'Star A is four times as heavy as Star B',
        'You cannot tell without knowing the period',
      ],
      answer: 0,
      because:
        'Star A is twice as heavy. It is the same answer as 1 AU against 2 AU, because the ratio is the same. Notice what this measurement does and does not give you: it tells you how the mass is <em>split</em> between the two stars, but not how much there is in total. That is the next thing to find.',
    },
    {
      type: 'read',
      title: 'What Kepler found, and what Newton added',
      body: `In the Kepler investigation you measured the orbits of planets and
             found that the size of an orbit and the time it takes go together:
             \n\n<strong>a<sup>3</sup> = P<sup>2</sup></strong>
             \n\nwith the orbit size a in AU and the period P in years. Bigger
             orbit, longer year, every time.
             \n\nThat relationship works beautifully for the planets, and it has
             a hidden assumption in it: every planet in the Solar System is going
             round the same Sun. Kepler never had to worry about the mass, because
             the mass never changed.
             \n\nNewton worked out what happens when it does. More mass means
             stronger gravity, and stronger gravity means an object is pulled
             round its orbit faster. Two stars four AU apart will take a
             different amount of time to get round each other depending on how
             heavy they are.
             \n\nThat is the second idea, and it is the one that turns an orbit
             into a scale.`,
    },
    {
      type: 'predict',
      title: 'Which pair is quicker?',
      body: `Next you will see two binary systems side by side. The two stars in
             each pair are exactly <strong>4 AU</strong> apart, in both systems.
             \n\nThe pair on the left weighs half a solar mass per star. The pair
             on the right weighs two solar masses per star, so four times as much
             in total.`,
      prompt: 'Starting together, which pair gets round its orbit first?',
      options: [
        'the lightweight pair on the left',
        'the heavyweight pair on the right',
        'they finish together: the separation is the same',
        'neither: they never complete an orbit',
      ],
      answer: 1,
      because:
        'The heavy pair, and by a clear margin. More mass means a stronger pull, so the stars are hauled round the same-sized orbit more quickly. This is exactly the effect Kepler could not see, because he only ever had one Sun to work with.',
    },
    {
      type: 'explore',
      title: 'Run them together',
      body: `Both systems start at the same moment. The counter under each one
             says how many complete laps it has done.
             \n\nLet them run until the heavy pair has been round twice.`,
      tool: { id: 'binary-compare' },
      checklist: [
        'Start both and watch until the right-hand pair completes one lap',
        'Check how far round the left-hand pair has got at that moment',
        'Keep going until the right-hand pair has done two laps',
        'Confirm the left-hand pair has done exactly one',
      ],
      tip: 'Four times the mass turns out to give exactly half the period. You do not need to know why that particular factor comes out; the point is only that more mass means a quicker orbit.',
    },
    {
      type: 'question',
      title: 'Why the heavy pair wins',
      kind: 'choice',
      body: `The two orbits were the same size. Only the masses were different.`,
      prompt: 'The heavier pair completed its orbit sooner because…',
      options: [
        'heavier stars are always closer together',
        'more mass means a stronger pull, so the stars are moved round the same orbit faster',
        'heavier stars are brighter, so they look like they are moving faster',
        'the heavier pair had a smaller orbit',
      ],
      answer: 1,
      because:
        'More mass, stronger pull, quicker lap. And here is why that matters so much: it works backwards. If you can see how big an orbit is and time how long it takes, then the only thing left that could explain the timing is the mass. The orbit tells you what the stars weigh.',
    },
    {
      type: 'read',
      title: 'Newton’s version, and what it is for',
      body: `Here is the relationship Newton found, written the way an astronomer
             uses it:
             \n\n<strong>total mass = a<sup>3</sup> ÷ P<sup>2</sup></strong>
             \n\nwith <strong>a</strong> the size of the orbit in AU,
             <strong>P</strong> the time for one lap in years, and the answer in
             solar masses. That is the whole thing. Two measurements in, one
             number out:
             \n\n<strong>measure the orbit size → measure the period → get the
             total mass.</strong>
             \n\nOne detail matters, and it is the only place people go wrong.
             The <strong>a</strong> in that formula is the size of the
             <em>whole</em> two-star orbit, not one star’s share of it. Picture
             the pair with the balance point between them:
             \n\n<strong>Star A ── r<sub>A</sub> ── barycenter ── r<sub>B</sub>
             ── Star B</strong>
             \n\nand <strong>a</strong> is the two pieces added together:
             r<sub>A</sub> + r<sub>B</sub>, which is simply the distance from one
             star across to the other.
             \n\nSo when you measure a, measure star to star.`,
      tip: 'If you take only one star’s distance from the barycenter by mistake, you will get a mass several times too small. Measuring star to star is the fix, and it is easier to do anyway.',
    },
    {
      type: 'measure',
      title: 'A practice run',
      body: `Try the formula once on numbers chosen to be kind, before using it
             on anything real.
             \n\nA pair of stars is <strong>2 AU</strong> apart and takes
             <strong>2 years</strong> to go round. Type those two numbers in. The
             rest is worked out for you, one line at a time, so you can see where
             the answer comes from.`,
      fields: [
        { id: 'a', label: 'Orbit size a', unit: 'AU', hint: '2' },
        { id: 'p', label: 'Period P', unit: 'years', hint: '2' },
        {
          id: 'a3',
          label: 'a<sup>3</sup>, that is a × a × a',
          unit: '',
          decimals: 0,
          compute: v => v.a ** 3,
        },
        {
          id: 'p2',
          label: 'P<sup>2</sup>, that is P × P',
          unit: '',
          decimals: 0,
          compute: v => v.p ** 2,
        },
        {
          id: 'total',
          label: 'Total mass, a<sup>3</sup> ÷ P<sup>2</sup>',
          unit: 'M☉',
          decimals: 2,
          compute: v => v.a ** 3 / v.p ** 2,
        },
      ],
      validate: v => {
        const total = v.a ** 3 / v.p ** 2;
        if (!Number.isFinite(total)) return null;
        if (v.a !== 2 || v.p !== 2) {
          return {
            level: 'warn',
            message:
              'For this practice run, put 2 in both boxes. You can experiment with other numbers afterwards.',
          };
        }
        return {
          level: 'ok',
          message:
            '2 × 2 × 2 is 8, and 2 × 2 is 4, and 8 divided by 4 is 2. The pair weighs <strong>2 solar masses</strong> between them. Nobody went there. Nobody weighed anything. Two measurements of an orbit were enough.',
        };
      },
      tip: 'The little raised numbers just mean "multiply it by itself that many times". a³ is a × a × a. P² is P × P. If you would rather use a calculator, nothing here is against the rules.',
    },
    {
      type: 'read',
      title: 'The mystery pair',
      body: `Now the real thing.
             \n\nThe next few steps show a binary system whose masses are
             <strong>hidden</strong>. Nothing on the screen will tell you what
             either star weighs. You are going to work it out anyway, using only
             what you can see the stars doing, which is precisely the situation a
             real astronomer is in.
             \n\nYou already have everything you need. Take it one measurement at
             a time.`,
      tip: 'There is no trick and no hidden difficulty. The numbers have been chosen to come out cleanly, so if your answer is not close to a whole number, check the measurement rather than the arithmetic.',
    },
    {
      type: 'question',
      title: 'What do you need to measure?',
      kind: 'choice',
      body: `Before touching anything, decide what you are looking for.`,
      prompt:
        'To find the total mass of the pair, the two things you need are…',
      options: [
        'the brightness of each star and its color',
        'the size of the orbit and the time it takes to go round',
        'the distance to the system and its age',
        'the temperature of each star and its size',
      ],
      answer: 1,
      because:
        'Orbit size and period. Those are the only two things in the formula, and both of them are things you can watch happen. Everything else about the stars, however interesting, is beside the point here.',
    },
    {
      type: 'explore',
      title: 'Measurement one: how big is the orbit?',
      body: `The picture now has rings drawn on it, one every astronomical unit,
             centered on the balance point. They are your ruler.
             \n\nPause the system when the two stars are lined up nicely, and
             read off how far each star is from the center. Then remember what
             the last step said: the orbit size <strong>a</strong> is the
             distance from one star <em>across to the other</em>, so add the two
             readings together.`,
      tool: {
        id: 'binary',
        mystery: true,
        grid: true,
        barycenter: true,
        hide: ['m1', 'm2'],
        presets: false,
        rows: [],
        title: 'Measure the orbit',
        note: 'Each ring is one AU from the balance point. Pause with the Run / Pause button to read the positions.',
      },
      checklist: [
        'Pause the system with the Run / Pause button',
        'Read which ring Star A is sitting on',
        'Read which ring Star B is sitting on',
        'Add the two together to get the star-to-star distance',
        'Start it running again and check your reading still holds a lap later',
      ],
      tip: 'Star A is on the 1 AU ring and Star B is on the 3 AU ring, so the two stars are 4 AU apart. Write that down: a = 4 AU.',
    },
    {
      type: 'explore',
      title: 'Measurement two: how long does a lap take?',
      body: `Now time it. There is a stopwatch under the picture, and a clock in
             the corner counting simulated years.
             \n\nPress <strong>Mark</strong> when Star A is somewhere easy to
             recognize. A dotted line appears through that position. Then wait,
             watch Star A come all the way round, and press <strong>Stop</strong>
             the moment it crosses the line again.`,
      tool: {
        id: 'binary',
        mystery: true,
        grid: false,
        barycenter: true,
        timer: true,
        hide: ['m1', 'm2'],
        presets: false,
        rows: ['timer', 'clock'],
        title: 'Time one lap',
        note: 'Press Mark, wait for Star A to come back to the dotted line, then press Stop. The clock runs in simulated years.',
      },
      checklist: [
        'Press Mark and note the dotted line that appears',
        'Watch Star A go all the way round once',
        'Press Stop as it crosses the line again',
        'Read the stopwatch: it should be close to a whole number of years',
        'If you missed it, press Mark again and have another go',
      ],
      tip: 'It does not have to be perfect. Anything between about 3.5 and 4.5 years will get you to the right answer, because the answer is a whole number.',
    },
    {
      type: 'measure',
      title: 'Weigh the pair',
      body: `Put your two measurements in. The arithmetic is done for you, line
             by line.
             \n\nIf your stopwatch reading was a little off, round it to the
             nearest whole year first: real measurements get rounded all the
             time, and this one is meant to.`,
      fields: [
        {
          id: 'a',
          label: 'Orbit size a, star to star',
          unit: 'AU',
          hint: 'from the rings',
        },
        {
          id: 'p',
          label: 'Period P, one full lap',
          unit: 'years',
          hint: 'from the stopwatch',
        },
        {
          id: 'a3',
          label: 'a<sup>3</sup>',
          unit: '',
          decimals: 0,
          compute: v => v.a ** 3,
        },
        {
          id: 'p2',
          label: 'P<sup>2</sup>',
          unit: '',
          decimals: 0,
          compute: v => v.p ** 2,
        },
        {
          id: 'total',
          label: 'Total mass of the pair',
          unit: 'M☉',
          decimals: 2,
          compute: v => v.a ** 3 / v.p ** 2,
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.a) || !Number.isFinite(v.p)) return null;
        if (v.a <= 0 || v.p <= 0) {
          return {
            level: 'error',
            message: 'Both measurements have to be positive numbers.',
          };
        }
        if (v.a > 1.4 && v.a < 2.6) {
          return {
            level: 'warn',
            message:
              'That looks like one star’s distance from the balance point rather than the whole orbit. The orbit size is measured from one star <em>across to the other</em>: add both distances together.',
          };
        }
        if (v.a < 3.4 || v.a > 4.6) {
          return {
            level: 'warn',
            message:
              'Check the orbit size against the rings. Star A sits on one ring and Star B on another, and the number you want is the two added together.',
          };
        }
        if (v.p < 3.3 || v.p > 4.7) {
          return {
            level: 'warn',
            message:
              'Check the period. Time Star A from the dotted line all the way round until it crosses the same line again.',
          };
        }
        const total = v.a ** 3 / v.p ** 2;
        return {
          level: 'ok',
          message: `64 divided by 16 is 4. The two stars weigh <strong>${total.toFixed(1)} solar masses</strong> between them. You measured that by watching, and by nothing else.`,
        };
      },
      tip: 'If you measured a = 4 and P = 4, then a³ = 4 × 4 × 4 = 64 and P² = 4 × 4 = 16.',
    },
    {
      type: 'read',
      title: 'Stop and look at what you just did',
      body: `You have the combined mass of two stars that nobody has ever been
             near, and you got it from two things you could see: how far apart
             they are, and how long they take to go round.
             \n\nThis is not a simplified version of how it is done. It is how it
             is done. The masses in the textbooks came from exactly this
             calculation, applied to pairs of stars that astronomers have been
             patiently photographing for a century and a half.
             \n\nThere is one thing left. You know what the pair weighs
             <em>together</em>. You do not yet know how that weight is divided
             between them, and for that you need the other idea from earlier in
             this lesson.`,
    },
    {
      type: 'explore',
      title: 'Back to the balance point',
      body: `The rings are back. This time read them the other way: not to add
             the two distances up, but to compare them.
             \n\nWhich star stays closer to the balance point?`,
      tool: {
        id: 'binary',
        mystery: true,
        grid: true,
        barycenter: true,
        hide: ['m1', 'm2'],
        presets: false,
        rows: [],
        title: 'Which one stays closer?',
        note: 'The rings are one AU apart, centered on the balance point.',
      },
      checklist: [
        'Read Star A’s distance from the balance point',
        'Read Star B’s distance from the balance point',
        'Work out how many times further out Star B is',
        'Decide which of the two must be the heavier star',
      ],
      tip: 'Star A is on the 1 AU ring. Star B is on the 3 AU ring. Star B travels three times as far.',
    },
    {
      type: 'question',
      title: 'Splitting them up',
      kind: 'choice',
      body: `Star A stays <strong>1 AU</strong> from the balance point. Star B
             swings out to <strong>3 AU</strong>.`,
      prompt: 'So how do the two masses compare?',
      options: [
        'Star B is three times as heavy as Star A',
        'Star A is three times as heavy as Star B',
        'They are equal, since they orbit together',
        'Star A is nine times as heavy as Star B',
      ],
      answer: 1,
      because:
        'Star A is three times as heavy. It is the see-saw again: Star B is three times further out, so Star A must be three times heavier to balance it. You now know the total mass and the ratio, which is enough to pin down both stars.',
    },
    {
      type: 'measure',
      title: 'Now weigh each one',
      body: `You have four solar masses to share out, and you know the split has
             to be three to one.
             \n\nThe panel shows it as blocks. Set Star A at 1 AU and Star B at 3
             AU and count them: three blocks on one side, one on the other, four
             blocks in total. Then write the two masses in below.`,
      tool: {
        id: 'balance',
        values: { d1: 1, d2: 3 },
        total: 4,
        presets: false,
        title: 'Share out four solar masses',
        note: 'Each block is one solar mass. The see-saw decides how they are shared.',
      },
      fields: [
        {
          id: 'ma',
          label: 'Mass of Star A',
          unit: 'M☉',
          hint: 'the heavier one',
        },
        {
          id: 'mb',
          label: 'Mass of Star B',
          unit: 'M☉',
          hint: 'the lighter one',
        },
        {
          id: 'sum',
          label: 'Do they add up to the total you measured?',
          unit: 'M☉',
          decimals: 1,
          compute: v => v.ma + v.mb,
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.ma) || !Number.isFinite(v.mb)) return null;
        const sum = v.ma + v.mb;
        if (Math.abs(sum - 4) > 0.6) {
          return {
            level: 'warn',
            message: `Those two add up to ${sum.toFixed(1)}, and the pair weighs 4 solar masses in total. The two numbers have to add up to the total you measured.`,
          };
        }
        if (v.mb > v.ma) {
          return {
            level: 'warn',
            message:
              'You have them the wrong way round. Star A is the one that stays close to the balance point, which makes it the heavier of the two.',
          };
        }
        if (Math.abs(v.ma - 3) < 0.35 && Math.abs(v.mb - 1) < 0.35) {
          return {
            level: 'ok',
            message:
              'Three solar masses and one solar mass. You have just weighed two individual stars, separately, using a ruler and a stopwatch.',
          };
        }
        return {
          level: 'warn',
          message:
            'The two add up correctly, but not in a three to one ratio. Count the blocks: three on Star A’s side for every one on Star B’s.',
        };
      },
    },
    {
      type: 'read',
      title: 'The answer',
      body: `The masses that were hidden all along:
             \n\n<strong>Star A: 3 solar masses. Star B: 1 solar mass.</strong>
             \n\nIf that is what you got, you did not guess it and you were not
             told it. You measured a distance, you timed a lap, you divided one
             number by another, and you compared two distances from a balance
             point. That is the entire method.
             \n\nAnd notice how little you needed. Not the distance to the
             system, not the temperature of the stars, not their colors, not
             their ages. Two stars going round each other give up their masses to
             anybody patient enough to watch.`,
      tip: 'Getting 3.9 or 4.2 solar masses instead of exactly 4 would be a perfectly good result. Real measurements of real binaries carry uncertainties of a few percent, and they are still the most trustworthy stellar masses we have.',
    },
    {
      type: 'explore',
      title: 'Somebody really did this',
      body: `Sirius is the brightest star in the night sky. In 1844 Friedrich
             Bessel noticed that it was not moving in a straight line across the
             sky: it was wobbling. He concluded there had to be something heavy
             next to it that nobody could see. Eighteen years later, a telescope
             maker testing a new lens found it.
             \n\nThe panel shows what astronomers have recorded since: the
             position of the faint companion relative to the bright star, once
             every five years. Slide forward through the decades and watch the
             orbit appear one dot at a time.`,
      tool: { id: 'visual-binary', values: { year: 1900 } },
      checklist: [
        'Slide up to 1910 and note how little you can tell from three dots',
        'Slide to 1925 and watch a curve start to form',
        'Slide to 1945, one complete orbit, and see the shape close',
        'Go all the way to 2000 and confirm it retraces the same path',
        'Notice the dots are further apart on the fast part of the orbit',
      ],
      tip: 'That orbit is 50.1 years round and 19.8 AU across. Put those into your formula: 19.8 cubed is 7,762, and 50.1 squared is 2,510. Divide, and the pair weighs 3.1 solar masses. The accepted value, from a century of careful work, is 3.06.',
    },
    {
      type: 'read',
      title: 'And stars are not the only things that do it',
      body: `One last thought, because it connects to something you may have met
             already.
             \n\nNothing in this lesson required both objects to be stars. A star
             with a <em>planet</em> also goes round a shared balance point. The
             planet is thousands of times lighter, so the balance point sits very
             nearly at the middle of the star, and the star's own circle is
             correspondingly tiny.
             \n\nBut it is not zero. Jupiter makes the Sun swing around a point
             just outside its own surface, once every twelve years. That
             wobble is small, and it is measurable, and measuring it is one of the
             ways we have found planets around other stars.
             \n\nThe picture shows a star with a planet, and a magnified inset of
             the star's own little circle so you can see it at all.`,
      tool: {
        id: 'binary',
        values: { m1: 1 },
        planet: true,
        barycenter: true,
        hide: ['m1', 'm2'],
        presets: false,
        rows: ['wobble'],
        title: 'A star and a planet',
        note: 'A Sun-like star with a Jupiter beside it. The box in the corner magnifies the star’s own motion, which is otherwise far too small to see.',
      },
      tip: 'That is a different investigation. This one has done its job if you can say why the star moves at all.',
    },
    {
      type: 'measure',
      title: 'One on your own',
      body: `A new pair, not one you have seen. The two stars are
             <strong>3 AU</strong> apart and take <strong>3 years</strong> to go
             round each other.
             \n\nWork out what they weigh between them.`,
      fields: [
        { id: 'a', label: 'Orbit size a', unit: 'AU', hint: '3' },
        { id: 'p', label: 'Period P', unit: 'years', hint: '3' },
        {
          id: 'a3',
          label: 'a<sup>3</sup>',
          unit: '',
          decimals: 0,
          compute: v => v.a ** 3,
        },
        {
          id: 'p2',
          label: 'P<sup>2</sup>',
          unit: '',
          decimals: 0,
          compute: v => v.p ** 2,
        },
        {
          id: 'total',
          label: 'Total mass',
          unit: 'M☉',
          decimals: 2,
          compute: v => v.a ** 3 / v.p ** 2,
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.a) || !Number.isFinite(v.p)) return null;
        if (v.a !== 3 || v.p !== 3) {
          return {
            level: 'warn',
            message:
              'Put 3 in both boxes: the pair is 3 AU apart with a 3 year period.',
          };
        }
        return {
          level: 'ok',
          message:
            '3 × 3 × 3 is 27, and 3 × 3 is 9, and 27 divided by 9 is 3. Three solar masses between the two of them.',
        };
      },
    },
    {
      type: 'question',
      title: 'And which one is heavier?',
      kind: 'choice',
      body: `Same pair. Watching it, you find that one star stays close to the
             balance point while the other swings much further out.`,
      prompt: 'The star that stays close to the balance point is…',
      options: [
        'the lighter of the two',
        'the heavier of the two',
        'always exactly half the total mass',
        'impossible to compare without knowing the period',
      ],
      answer: 1,
      because:
        'The heavier one. Together with the previous step, that is both halves of the method: the size and timing of the orbit give you the total mass, and the distances from the balance point tell you how to split it.',
    },
    {
      type: 'read',
      title: 'What you can now say',
      body: `In ordinary words, with nothing memorised:
             \n\n<strong>When two stars orbit each other, both of them move
             around a shared balance point. How big their orbit is and how long
             it takes tell us their combined mass. How far each star sits from
             the balance point tells us how that mass is divided between
             them.</strong>
             \n\nThat is why binary stars matter so much. They are the only
             direct way we have of weighing a star, and very nearly everything
             else we claim to know about stellar masses rests on them. When a
             textbook says the Sun is an average sort of star, or that a star ten
             times the Sun's mass burns out in a few tens of millions of years,
             the numbers behind those statements were calibrated on pairs of
             stars measured exactly the way you just did it.
             \n\nAbout half the stars in the sky have a companion. Every one of
             them is quietly announcing its own mass to anyone who watches long
             enough.`,
      tip: 'Bessel found Sirius B by noticing a wobble, decades before anyone saw it. Measuring what you cannot see, by watching what it does to something you can, is one of the oldest tricks in the subject and still one of the best.',
    },
  ],
};

export default WEIGHING;
