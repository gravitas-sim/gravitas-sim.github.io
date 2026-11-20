// Weighing the stars: content only. A live number comes from the `ctx` the engine hands a step.
const fixed = (v, n) => (Number.isFinite(v) ? v.toFixed(n) : '');

// One AU is 100 world units; both pairs are binaries the engine integrates.
const AU = 100;

const EQUAL_PAIR = {
  starPair: { m1: 2, m2: 2, separation: 4 * AU, fit: true },
};

const MYSTERY_PAIR = {
  starPair: { m1: 3, m2: 1, separation: 4 * AU, fit: true },
};

// Steps whose answer is a mass keep the masses off the canvas (`hideMasses`);
// the answer step puts them back. The stage is the same pair, so no rebuild.
const hidden = stage => ({ ...stage, hideMasses: true });

const WEIGHING = {
  id: 'weighing-stars',
  thumbnail: 'images/investigations/weighing-stars.webp',
  title: 'Weighing the Stars',
  subtitle: 'Use an orbit to measure something you cannot put on a scale',
  question: 'How can anyone weigh a star they can never touch?',
  medium: { kind: 'scene', name: 'the live view' },
  duration: '35-45 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 18, section: '18.2' },
  courseLevel: 'survey',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'arithmetic',
  prerequisites: [],
  tags: ['stars', 'gravity', 'orbits'],
  lock: { placement: true, inspector: true, areaSweep: false },
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
      sid: 'you-cannot-put-a-star',
      stage: EQUAL_PAIR,
      type: 'read',
      title: 'You cannot put a star on a scale',
      body: `How can anyone weigh a star they can never touch? You will choose a
             way it could be done, then try it in the live view and take the
             measurements yourself.
             \n\nA bathroom scale works by pushing back: stand on it, and it
             measures how hard the Earth is pulling you down. There is no
             version of that for a star, and yet any astronomy textbook gives
             the masses of dozens of stars, to two decimal places.`,
      tip: 'Nothing here needs algebra. You will read two numbers off a screen and do one division.',
    },
    {
      sid: 'how-would-you-do-it',
      stage: EQUAL_PAIR,
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
      sid: 'two-stars-side-by-side',
      stage: EQUAL_PAIR,
      type: 'predict',
      reveal: 'watch-them',
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
      sid: 'watch-them',
      stage: EQUAL_PAIR,
      type: 'explore',
      title: 'Watch them',
      allowInspector: true,
      body: `The two stars are on the main canvas, with a trail behind each one
             so you can see where it has been. They are not a diagram: the
             simulation is moving them, the same one that runs everything else
             in Gravitas.
             \n\nDo not measure anything yet. Watch for a few seconds and pay
             attention to what each star is doing. Then click one of them, or
             use <strong>Objects in this activity</strong> below, and read its
             card.`,
      checklist: [
        'Watch until each star has been all the way round at least once',
        'Follow Star A with your eye for one full lap',
        'Now follow Star B for one full lap',
        'Select each star in turn and check the two masses really are equal',
      ],
      probe: ctx => {
        const b = ctx.barycenter();
        if (!b) return [{ label: 'The pair', value: 'not on the canvas yet' }];
        return [
          { label: 'Star A, mass', value: `${b.arms[0]?.massSun ?? '—'} M☉` },
          { label: 'Star B, mass', value: `${b.arms[1]?.massSun ?? '—'} M☉` },
          {
            label: 'Star to star',
            value: `${(b.separation / 100).toFixed(2)} AU`,
          },
        ];
      },
      tip: 'The speed and pause controls are the sandbox’s own, at the bottom of the window. Pausing is often the easiest way to look at something carefully.',
    },
    {
      sid: 'what-moved',
      stage: EQUAL_PAIR,
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
      sid: 'what-are-they-going-round',
      stage: EQUAL_PAIR,
      type: 'read',
      motion: true,
      title: 'What are they going round?',
      body: `If both stars are moving, and they are always on opposite sides of
             each other, then there is a point between them that neither star
             ever visits and that never moves at all.
             \n\nThat point has a name. It is the <strong>barycenter</strong>,
             which is just a technical word for the balance point of the two
             stars: the place where the pair would balance if you could put them
             on a see-saw.
             \n\nIt is now marked on the main canvas with a cross, with a
             dashed line out to each star. Watch the two stars go round it, and
             watch the cross stay where it is.
             \n\nThe cross is drawn as an instrument, not as an object: there
             is nothing there. It is a place, worked out from where the two
             stars are at this instant.`,
      showBarycenter: true,
      probe: ctx => {
        const b = ctx.barycenter();
        if (!b) return [{ label: 'Balance point', value: 'no pair on screen' }];
        return b.arms.map(arm => ({
          label: `${arm.name} to the balance point`,
          value: `${(arm.r / 100).toFixed(2)} AU`,
        }));
      },
      tip: 'Every orbiting pair in the universe has one of these, including the Earth and the Moon. The Earth-Moon barycenter is inside the Earth, about a thousand miles below the surface, and the Earth swings round it once a month.',
    },
    {
      sid: 'where-does-it-sit',
      stage: EQUAL_PAIR,
      type: 'question',
      title: 'Where does it sit?',
      kind: 'choice',
      body: `These two stars have the same mass as each other. Look at where the
             cross is on the canvas, and at the two distances in the panel.`,
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
      sid: 'make-one-of-them-heavier',
      stage: EQUAL_PAIR,
      type: 'predict',
      reveal: 'try-it',
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
      sid: 'try-it',
      stage: EQUAL_PAIR,
      type: 'explore',
      title: 'Try it',
      body: `Both mass sliders are unlocked, and they are the masses of the two
             stars on the canvas. Start with them equal, then drag Star A’s mass
             up and watch the cross move.
             \n\nGo to the extreme: put Star A at 4 solar masses and Star B at 1.
             Look at the size of the two orbits.
             \n\nOne thing to know about what the slider does. It does not make
             a star heavier in mid-orbit - it starts the pair again with the new
             masses. A star whose mass changed half way round would be on a path
             that no longer closes, and you would be watching a slow spiral
             while this investigation called it a circle.`,
      showBarycenter: true,
      allowInspector: true,
      tool: {
        id: 'binary',
        values: { m1: 2, m2: 2 },
        scene: true,
        barycenter: true,
        rows: ['masses', 'distances', 'which'],
        presets: false,
        title: 'Change the masses',
        note: 'These are the masses of the two stars on the canvas. Move one and the pair is restood with the new masses.',
      },
      checklist: [
        'Start with both stars at 2 M☉ and note the cross is in the middle',
        'Raise Star A to 3 M☉ and watch the cross shift on the canvas',
        'Set Star A to 4 M☉ and Star B to 1 M☉',
        'Note which star now makes the small circle and which makes the big one',
        'Select the heavy star and check its card agrees with the slider',
        'Try it the other way round, with Star B the heavy one',
      ],
      probe: ctx => {
        const b = ctx.barycenter();
        if (!b) return [{ label: 'The pair', value: 'not on the canvas' }];
        const [a, bb] = b.arms;
        const ratio = a && bb && a.r > 0 ? bb.r / a.r : null;
        return [
          { label: 'Star A arm', value: `${(a.r / 100).toFixed(2)} AU` },
          { label: 'Star B arm', value: `${(bb.r / 100).toFixed(2)} AU` },
          {
            label: 'B’s arm ÷ A’s arm',
            value: ratio ? ratio.toFixed(2) : '—',
          },
          {
            label: 'A’s mass ÷ B’s mass',
            value: bb?.massSun > 0 ? (a.massSun / bb.massSun).toFixed(2) : '—',
          },
        ];
      },
      tip: 'The heavier star does not sit still. It still moves. It just moves in a much smaller circle, and it moves more slowly, because it has less far to go in the same amount of time.',
    },
    {
      sid: 'the-rule',
      stage: EQUAL_PAIR,
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
      sid: 'put-them-on-a-see',
      stage: EQUAL_PAIR,
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
      sid: 'reading-the-see-saw',
      stage: EQUAL_PAIR,
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
      sid: 'writing-it-down',
      stage: EQUAL_PAIR,
      type: 'read',
      title: 'Writing it down',
      body: `That is the whole of the first idea, and it can be written on one
             line. If you would rather keep it in words, the words are:
             \n\n<strong>the heavier star stays proportionally closer to the
             balance point.</strong>
             \n\nIf you would rather have the line, here it is. Call the two
             masses <em>M</em><sub>A</sub> and <em>M</em><sub>B</sub>, and call their distances
             from the balance point <em>r</em><sub>A</sub> and <em>r</em><sub>B</sub>:
             \n\n<strong><em>M</em><sub>A</sub> × <em>r</em><sub>A</sub> = <em>M</em><sub>B</sub> ×
             <em>r</em><sub>B</sub></strong>
             \n\nYou will not have to rearrange it. It is here so that the line
             looks familiar if you meet it later. Everything you actually need
             is the see-saw: three times as far out means one third as heavy.`,
      tip: 'This is why a see-saw works at all. A small child sits at the end, a large adult sits near the middle, and mass times distance comes out the same on both sides.',
    },
    {
      sid: 'one-more-to-be-sure',
      stage: EQUAL_PAIR,
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
      sid: 'what-kepler-found-and-what',
      stage: EQUAL_PAIR,
      type: 'read',
      title: 'What Kepler found, and what Newton added',
      body: `In the Kepler investigation you measured the orbits of planets and
             found that the size of an orbit and the time it takes go together:
             \n\n<strong><em>a</em>³ = <em>P</em>²</strong>
             \n\nwith the orbit size <em>a</em> in AU and the [[period|period]] <em>P</em> in years. Bigger
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
      sid: 'which-pair-is-quicker',
      stage: EQUAL_PAIR,
      type: 'predict',
      reveal: 'run-them-together',
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
      sid: 'run-them-together',
      stage: EQUAL_PAIR,
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
    },
    {
      sid: 'why-the-heavy-pair-wins',
      stage: EQUAL_PAIR,
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
      sid: 'newton-s-version-and-what',
      stage: EQUAL_PAIR,
      type: 'read',
      title: 'Newton’s version, and what it is for',
      body: `Here is the relationship Newton found, written the way an astronomer
             uses it:
             \n\n<strong>total mass = <em>a</em>³ ÷ <em>P</em>²</strong>
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
             <em>r</em><sub>A</sub> + <em>r</em><sub>B</sub>, which is simply the distance from one
             star across to the other.
             \n\nSo when you measure a, measure star to star.`,
      tip: 'The slip to avoid is taking one star’s distance from the balance point for a. In the weighing step you can see how far that slip moves the mass, from your own numbers.',
    },
    {
      sid: 'a-practice-run',
      stage: hidden(EQUAL_PAIR),
      type: 'measure',
      title: 'A practice run',
      body: `Try the formula once on numbers chosen to be kind, before using it
             on anything real.
             \n\nA pair of stars is <strong>2 AU</strong> apart and takes
             <strong>2 years</strong> to go round. Type those two numbers in. The
             rest is worked out for you, one line at a time, so you can see where
             the answer comes from.`,
      fields: [
        { id: 'a', label: 'Orbit size a', unit: 'AU', want: '2' },
        { id: 'p', label: 'Period P', unit: 'years', want: '2' },
        {
          id: 'a3',
          label: '<em>a</em>³, that is <em>a</em> × <em>a</em> × <em>a</em>',
          unit: '',
          decimals: 0,
          compute: v => v.a ** 3,
        },
        {
          id: 'p2',
          label: '<em>P</em>², that is <em>P</em> × <em>P</em>',
          unit: '',
          decimals: 0,
          compute: v => v.p ** 2,
        },
        {
          id: 'total',
          label: 'Total mass, <em>a</em>³ ÷ <em>P</em>²',
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
      tip: 'The little raised numbers just mean "multiply it by itself that many times". <em>a</em>³ is <em>a</em> × <em>a</em> × <em>a</em>. <em>P</em>² is <em>P</em> × <em>P</em>. If you would rather use a calculator, nothing here is against the rules.',
    },
    {
      sid: 'the-mystery-pair',
      stage: hidden(MYSTERY_PAIR),
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
      tip: 'There is no trick and no hidden difficulty. If your answer looks odd, check the measurement before the arithmetic.',
    },
    {
      sid: 'what-do-you-need-to',
      stage: hidden(MYSTERY_PAIR),
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
      sid: 'measurement-one-how-big-is',
      stage: hidden(MYSTERY_PAIR),
      type: 'measure',
      title: 'Measurement one: how big is the orbit?',
      body: `The pair on the canvas is a different one now: two stars whose
             masses you have not been told. The balance point is marked, with a
             dashed line out to each star, and the panel measures those lines
             for you as the pair goes round.
             \n\nPause the sandbox if you want a steady look, and take the
             readings you will need. Remember what the last step said: the orbit
             size <strong>a</strong> is the distance from one star <em>across to
             the other</em>. Which of your readings is that one is for you to
             say in the weighing step.`,
      showBarycenter: true,
      allowInspector: false,
      probe: ctx => {
        const b = ctx.barycenter();
        const off = 'not on the canvas';
        if (!b)
          return [
            { id: 'ra', label: 'Star A to the balance point', value: off },
            { id: 'rb', label: 'Star B to the balance point', value: off },
            { id: 'sep', label: 'Star to star', value: off },
          ];
        return [
          ...b.arms.map((arm, i) => ({
            id: i ? 'rb' : 'ra',
            label: `${arm.name} to the balance point`,
            value: `${(arm.r / 100).toFixed(2)} AU`,
          })),
          {
            id: 'sep',
            label: 'Star to star',
            value: `${(b.separation / 100).toFixed(2)} AU`,
          },
        ];
      },
      fields: [
        {
          id: 'ra',
          label: 'Star A to the balance point',
          unit: 'AU',
          want: '1',
          source: { probe: 'ra' },
        },
        {
          id: 'rb',
          label: 'Star B to the balance point',
          unit: 'AU',
          want: '3',
          source: { probe: 'rb' },
        },
        {
          id: 'sep',
          label: 'Star to star',
          unit: 'AU',
          want: '4',
          source: { probe: 'sep' },
        },
      ],
      validate: v => {
        if (![v.ra, v.rb, v.sep].every(Number.isFinite)) return null;
        if (Math.abs(v.ra + v.rb - v.sep) > 0.05) {
          return {
            level: 'warn',
            message:
              'These readings do not fit together: the two arms should add up to the star-to-star distance. Take them again.',
          };
        }
        return {
          level: 'ok',
          message:
            'The two arms add up to the star-to-star distance, as they must. Keep these readings for the weighing step.',
        };
      },
      checklist: [
        'Pause the sandbox if you want a steady look at the two dashed lines',
        'Take Star A’s distance from the balance point',
        'Take Star B’s distance from the balance point',
        'Take the star-to-star distance',
        'Check that the two arms add up to the star-to-star distance',
        'Start it running again and check that a reading still holds a lap later',
      ],
    },
    {
      sid: 'measurement-two-how-long-does',
      stage: hidden(MYSTERY_PAIR),
      type: 'measure',
      title: 'Measurement two: how long does a lap take?',
      body: `Now time it. Press <strong>Mark</strong> when Star A is
             somewhere easy to recognize: a dotted line appears through that
             position. Watch Star A come back to the line and press
             <strong>Stop</strong> the moment it crosses again.
             \n\nYou decide how many laps to time. Your reaction time is the
             same however long you wait, so it matters less over a longer
             timing. Say how many laps you timed, take the stopwatch reading,
             and the page works out the period of one lap.
             \n\nPress <strong>Capture this orbit</strong> to record the
             separation, both arms and your timing in your notebook, marked as
             timed by you rather than taken from the model.`,
      showBarycenter: true,
      tool: {
        id: 'binary',
        mystery: true,
        grid: false,
        barycenter: true,
        timer: true,
        capture: true,
        hide: ['m1', 'm2'],
        presets: false,
        rows: ['timer', 'clock'],
        title: 'Time the laps',
        note: 'Press Mark, wait for Star A to come back to the dotted line, then press Stop. The clock runs in simulated years.',
      },
      fields: [
        {
          id: 'laps',
          label: 'Laps you timed',
          unit: '',
          hint: 'a whole number of laps',
        },
        {
          id: 't',
          label: 'Stopwatch reading',
          unit: 'years',
          source: { tool: 'timer' },
        },
        {
          id: 'p',
          label: 'Period P, one lap',
          unit: 'years',
          want: '4',
          decimals: 2,
          compute: v => v.t / v.laps,
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.laps) || !Number.isFinite(v.t)) return null;
        if (v.laps < 1 || v.laps !== Math.round(v.laps)) {
          return {
            level: 'error',
            message: 'Count whole laps, and time at least one.',
          };
        }
        return {
          level: 'ok',
          message:
            'The period of one lap is your stopwatch reading divided by the number of laps. Keep it for the weighing step.',
        };
      },
      checklist: [
        'Press Mark and note the dotted line that appears',
        'Decide how many laps to time, and watch Star A go round that many times',
        'Press Stop as Star A crosses the line again',
        'Say how many laps you timed, and take the stopwatch reading',
        'If you missed it, press Mark again and have another go',
        'Press Capture this orbit to put the measurement in your notebook',
      ],
    },
    {
      sid: 'weigh-the-pair',
      stage: hidden(MYSTERY_PAIR),
      requires: ['measurement-one-how-big-is', 'measurement-two-how-long-does'],
      type: 'measure',
      title: 'Weigh the pair',
      body: `Choose, from the readings you took, the two numbers the
             formula needs, and put them in. The arithmetic is done for you,
             line by line.`,
      fields: [
        {
          id: 'a',
          label: 'Orbit size a, star to star',
          unit: 'AU',
          hint: 'from your readings',
          want: '4',
          misconceptions: [
            {
              id: 'armA',
              factor: 0.25,
              say: 'That matches one star’s distance from the balance point, not the whole orbit. The orbit size runs from one star across to the other, and a is cubed: work out how far this slip moves the mass from your own arm readings.',
            },
            {
              id: 'armB',
              factor: 0.75,
              say: 'That matches one star’s distance from the balance point, not the whole orbit. The orbit size runs from one star across to the other, and a is cubed: work out how far this slip moves the mass from your own arm readings.',
            },
            {
              id: 'armPlusSeparation',
              factor: 1.25,
              say: 'It looks as if one arm was added to the star-to-star distance. The two arms are the two pieces of that distance, so adding one on counts a piece twice.',
            },
            {
              id: 'armPlusSeparationB',
              factor: 1.75,
              say: 'It looks as if one arm was added to the star-to-star distance. The two arms are the two pieces of that distance, so adding one on counts a piece twice.',
            },
            {
              id: 'allThree',
              factor: 2,
              say: 'It looks as if all three readings were added. The two arms already make up the star-to-star distance, so the sum counts the orbit twice.',
            },
          ],
        },
        {
          id: 'p',
          label: 'Period P, one full lap',
          unit: 'years',
          hint: 'from your stopwatch',
          want: '4',
          misconceptions: [
            {
              id: 'halfLap',
              factor: 0.5,
              say: 'That is about half a lap. Halfway round, Star B is where Star A started. Stop the watch when Star A itself is back at its line.',
            },
            {
              id: 'laps2',
              factor: 2,
              say: 'That looks like the time for more than one lap. Divide your stopwatch reading by the number of laps you timed.',
            },
            {
              id: 'laps3',
              factor: 3,
              say: 'That looks like the time for more than one lap. Divide your stopwatch reading by the number of laps you timed.',
            },
            {
              id: 'months',
              factor: 12,
              say: 'That looks like a number of months. The formula wants the period in years.',
            },
          ],
        },
        {
          id: 'a3',
          label: '<em>a</em>³',
          unit: '',
          decimals: 0,
          compute: v => v.a ** 3,
        },
        {
          id: 'p2',
          label: '<em>P</em>²',
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
        if (v.a < 3.4 || v.a > 4.6) {
          return {
            level: 'warn',
            message:
              'Check the orbit size against your readings: it is the star-to-star distance, the two arms together.',
          };
        }
        if (v.p < 3.3 || v.p > 4.7) {
          return {
            level: 'warn',
            message:
              'Check the period against your stopwatch: one lap of Star A, from the dotted line to the same line again.',
          };
        }
        const total = v.a ** 3 / v.p ** 2;
        return {
          level: 'ok',
          message: `Your numbers give <strong>${fixed(total, 1)} solar masses</strong> between the two stars. You measured that by watching, and by nothing else.`,
        };
      },
    },
    {
      sid: 'stop-and-look-at-what',
      stage: hidden(MYSTERY_PAIR),
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
             this investigation.`,
    },
    {
      sid: 'back-to-the-balance-point',
      stage: hidden(MYSTERY_PAIR),
      type: 'measure',
      title: 'Back to the balance point',
      body: `The balance point is on the canvas again. This time read the two
             dashed lines the other way: not to add the distances up, but to
             compare them.
             \n\nTake how many times further out one star swings than the
             other, and decide which star must be the heavier.`,
      showBarycenter: true,
      probe: ctx => {
        const b = ctx.barycenter();
        if (!b)
          return [
            {
              id: 'ratio',
              label: 'How many times further out B is',
              value: 'not on the canvas',
            },
          ];
        const [a, bb] = b.arms;
        return [
          {
            id: 'ra',
            label: `${a.name} arm`,
            value: `${(a.r / 100).toFixed(2)} AU`,
          },
          {
            id: 'rb',
            label: `${bb.name} arm`,
            value: `${(bb.r / 100).toFixed(2)} AU`,
          },
          {
            id: 'ratio',
            label: 'How many times further out B is',
            value: a.r > 0 ? (bb.r / a.r).toFixed(2) : '—',
          },
        ];
      },
      fields: [
        {
          id: 'ratio',
          label: 'How many times further out Star B is',
          unit: '',
          want: '3',
          source: { probe: 'ratio' },
        },
      ],
      checklist: [
        'Compare the two distances from the balance point',
        'Take how many times further out Star B is',
        'Decide which of the two must be the heavier star',
      ],
    },
    {
      sid: 'splitting-them-up',
      stage: hidden(MYSTERY_PAIR),
      type: 'question',
      title: 'Splitting them up',
      kind: 'choice',
      body: `In the last step you took how many times further from the balance
             point Star B swings than Star A.`,
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
      sid: 'now-weigh-each-one',
      stage: hidden(MYSTERY_PAIR),
      requires: ['weigh-the-pair', 'back-to-the-balance-point'],
      type: 'measure',
      title: 'Now weigh each one',
      body: `You know the total mass of the pair from the weighing step, and
             you know how much further out one star swings than the other.
             Share the total out between the two stars.
             \n\nThe panel is the see-saw again: set the two distances to match
             your readings and see what it says about the masses. Then write the
             two masses in below.`,
      tool: {
        id: 'balance',
        values: { d1: 1, d2: 3 },
        start: { d1: 2, d2: 2 },
        presets: false,
        title: 'Share out the mass',
        note: 'The see-saw decides how the total is shared: the star that sits closer in is the heavier.',
      },
      fields: [
        {
          id: 'tot',
          label: 'Total mass you weighed',
          unit: 'M☉',
          decimals: 2,
          compute: (v, e) => (e ? e('weigh-the-pair', 'total') : NaN),
        },
        {
          id: 'rat',
          label: 'How many times further out Star B is',
          unit: '',
          decimals: 2,
          compute: (v, e) =>
            e ? e('back-to-the-balance-point', 'ratio') : NaN,
        },
        {
          id: 'ma',
          label: 'Mass of Star A',
          unit: 'M☉',
          hint: 'the heavier one',
          want: '3',
        },
        {
          id: 'mb',
          label: 'Mass of Star B',
          unit: 'M☉',
          hint: 'the lighter one',
          want: '1',
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
        const tot = Number.isFinite(v.tot) ? v.tot : 4;
        if (Math.abs(sum - tot) > 0.15 * tot) {
          return {
            level: 'warn',
            message: `Those two add up to ${fixed(sum, 1)}, and the pair you weighed has ${fixed(tot, 1)} solar masses in total. The two numbers have to add up to the total you measured.`,
          };
        }
        if (v.mb > v.ma) {
          return {
            level: 'warn',
            message:
              'You have them the wrong way round. Star A is the one that stays close to the balance point, which makes it the heavier of the two.',
          };
        }
        const rat = Number.isFinite(v.rat) ? v.rat : 3;
        if (Math.abs(v.ma / v.mb - rat) > 0.15 * rat) {
          return {
            level: 'warn',
            message:
              'The two add up correctly, but not in the ratio your arm readings give. The star that swings further out is lighter by the same factor.',
          };
        }
        return {
          level: 'ok',
          message: `${fixed(v.ma, 1)} solar masses and ${fixed(v.mb, 1)}. You have just weighed two individual stars, separately, using a ruler and a stopwatch.`,
        };
      },
    },
    {
      sid: 'the-answer',
      stage: MYSTERY_PAIR,
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
      sid: 'somebody-really-did-this',
      stage: MYSTERY_PAIR,
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
             orbit appear one dot at a time.
             \n\nThese dots are of a different kind from everything else in
             this investigation. Every number you have measured so far came off the
             simulation on the canvas, which is still running behind this panel
             and is still the pair you weighed. These are <strong>observations
             of a real star</strong>, made by real telescopes over a hundred and
             sixty years. Nothing on the canvas is Sirius, and the simulation
             had no part in producing them.`,
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
      sid: 'and-stars-are-not-the',
      stage: MYSTERY_PAIR,
      type: 'read',
      title: 'And stars are not the only things that do it',
      body: `One last thought, because it connects to something you may have met
             already.
             \n\nNothing in this investigation required both objects to be stars. A star
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
      sid: 'one-on-your-own',
      stage: hidden(MYSTERY_PAIR),
      type: 'measure',
      title: 'One on your own',
      body: `A new pair, not one you have seen. The two stars are
             <strong>3 AU</strong> apart and take <strong>3 years</strong> to go
             round each other.
             \n\nWork out what they weigh between them.`,
      fields: [{ id: 'total', label: 'Total mass', unit: 'M☉', want: '3' }],
      validate: v => {
        if (!Number.isFinite(v.total)) return null;
        if (v.total <= 0) {
          return {
            level: 'error',
            message: 'A mass has to be a positive number.',
          };
        }
        if (Math.abs(v.total - 3) > 0.15) {
          return {
            level: 'warn',
            message:
              'Not quite. The formula is the orbit size cubed, divided by the period squared, with the orbit size in AU and the period in years.',
          };
        }
        return {
          level: 'ok',
          message: 'Three solar masses between the two of them.',
        };
      },
    },
    {
      sid: 'and-which-one-is-heavier',
      stage: hidden(MYSTERY_PAIR),
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
      sid: 'say-how-the-weighing-worked',
      requires: ['now-weigh-each-one'],
      type: 'question',
      kind: 'short',
      title: 'Say how the weighing worked',
      body: `You measured two arm lengths and one period, and came out with two
             masses. Nobody put a star on a balance.`,
      prompt:
        'In two or three sentences, explain how the separation and the period gave you the total mass, and how the two arm lengths then split that total between the stars. Name one thing about this pair that made it easier than a real one.',
      rubric:
        'Kepler\u2019s third law in Newton\u2019s form, M_A + M_B = a\u00b3/P\u00b2 with a in AU and P in years, turns the orbit size and the period into the total mass. The balance point then divides it: each star\u2019s distance from the barycenter is inversely proportional to its mass, so M_A/M_B = r_B/r_A, and the two relations together give both masses. What made this pair easy: the orbit is seen face-on, so the measured separation is the true one; a real binary is tilted by an unknown angle and the separation you measure is a projection, which is why real work needs either the inclination or a statistical correction. Credit also for noticing the orbit is drawn with the barycenter marked, which is not something a telescope gives you.',
    },
    {
      sid: 'what-you-can-now-say',
      stage: MYSTERY_PAIR,
      type: 'read',
      title: 'Why it matters',
      body: `Binary stars are the only direct way we have of weighing a star,
             and very nearly everything else we claim to know about stellar
             masses rests on them. When a textbook says that a star ten times
             the Sun's mass burns out in a few tens of millions of years, the
             masses behind that statement were calibrated on pairs of stars
             measured the way you measured this one.
             \n\nAbout half the stars in the sky have a companion. Every one of
             them is quietly announcing its own mass to anyone who watches long
             enough.`,
      tip: 'Bessel found Sirius B by noticing a wobble, decades before anyone saw it. Measuring what you cannot see, by watching what it does to something you can, is one of the oldest tricks in the subject and still one of the best.',
    },
  ],
};

export default WEIGHING;
