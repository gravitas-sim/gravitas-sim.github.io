// =============================================================================
// Kepler's Laws
// -----------------------------------------------------------------------------
// Content only, no imports: a step that needs a live number is handed a `ctx`
// by the engine. ./registry.js imports this file on demand.
// =============================================================================

/** Format a number for display in a probe row. */
const fixed = (v, n = 3) => (Number.isFinite(v) ? v.toFixed(n) : '-');

/** The slip of reading the Circular Orbiter on the steps about the other. */
const WRONG_BODY = {
  id: 'wrongBody',
  when: { role: 'circular' },
  say: 'That reading is from the Circular Orbiter. This step is about the Eccentric Orbiter: select it in the object list and take the reading again.',
};

// --- 1. Kepler's Laws ---------------------------------------------------------

/**
 * The bodies each scene of this lesson is about, bound by exact name: the
 * object list is a chip for each, and the keyboard route to a selection.
 */
const KEPLER_PAIR = {
  star: { name: 'Kepler Star' },
  circular: { name: 'Circular Orbiter' },
  eccentric: { name: 'Eccentric Orbiter' },
};

/** The Solar System steps: the star plus the planets worth measuring. */
const SOLAR = Object.fromEntries(
  'Sun Mercury Venus Earth Mars Jupiter Saturn Uranus Neptune'
    .split(' ')
    .map(n => [n.toLowerCase(), { name: n }])
);

/** TRAPPIST-1 and the three planets the weighing step uses. */
const TRAPPIST_1 = {
  star: { name: 'TRAPPIST-1' },
  e: { name: 'TRAPPIST-1e' },
  f: { name: 'TRAPPIST-1f' },
  g: { name: 'TRAPPIST-1g' },
};

const KEPLER = {
  id: 'keplers-laws',
  thumbnail: 'images/scenarios/keplers-2nd-law.webp',
  title: "Kepler's Laws",
  subtitle: 'Measure the shape, pacing and timing of real orbits',
  question:
    'What path does a planet follow around its star, and what sets how fast it moves and how long its year is?',
  medium: { kind: 'scene', name: 'the live orbit view' },
  duration: '35-45 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 3, section: '3.1' },
  courseLevel: 'survey',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'logarithms',
  prerequisites: [],
  // Subject tags, for the browser's filters. A fixed vocabulary
  // shared across the catalog rather than free text, so a filter can offer
  // the whole set without a second list to keep in step.
  tags: ['orbits', 'solar-system'],
  // The equal-area wedges stay off until the step that is about them.
  lock: { placement: true, inspector: true, areaSweep: false },
  retired: {
    'measure-the-two-orbits': {
      to: 'find-the-foci',
      release: '3.1',
      was: {
        en: 'Read the eccentricity, closest and furthest distance of two orbits off the readout and type them in.',
        es: 'Leer la excentricidad y las distancias mínima y máxima de dos órbitas en el panel y escribirlas.',
      },
    },
    // Deeper step; its replacement is `time-it-until-sure` in depth/.
    'repeat-the-timing': {
      to: null,
      release: '3.1',
      was: {
        en: 'Read a period three times, seconds apart, and take the mean and its uncertainty.',
        es: 'Leer un periodo tres veces, con segundos de diferencia, y tomar la media y su incertidumbre.',
      },
    },
    'use-the-law': {
      to: 'check-the-estimate',
      release: '3.1',
      was: {
        en: 'Work out the period of a planet at 4 AU by cubing the distance and taking the square root, following the steps in the text.',
        es: 'Calcular el periodo de un planeta a 4 UA elevando la distancia al cubo y sacando la raíz cuadrada, siguiendo los pasos del texto.',
      },
    },
  },
  objectives: [
    'State where the primary sits in an elliptical orbit, and support it with a measurement',
    'Explain why an orbiting body moves fastest at periapsis, in terms of angular momentum',
    'Measure the semi-major axis and period of several planets and show that P² ∝ a³',
    'Use the third law to predict an orbital period, and say what its constant depends on',
  ],
  steps: [
    {
      sid: 'eight-minutes-of-arc',
      bind: KEPLER_PAIR,
      type: 'read',
      title: 'Three questions about an orbit',
      body: `What path does a planet follow around its star, and what sets how
             fast it moves and how long its year is? You will answer it in the
             live orbit view: predict first, then measure distances, speeds
             and years in orbits you choose.
             \n\nJohannes Kepler answered it four hundred years ago from
             positions of Mars measured without a telescope. Why he trusted
             them comes after your first prediction.`,
      tip: 'While an investigation is running, clicking selects an object without opening the inspector card, and placing new objects is switched off so a stray click cannot alter the system you are measuring.',
      setup: {
        scenario: "Kepler's 2nd Law",
        seed: 'kepler-lab',
        camera: { zoom: 1.5, pan: { x: 0, y: 0 } },
        // Paused: no orbit goes by while the first screens are read.
        paused: true,
      },
    },
    {
      sid: 'what-you-are-looking-at',
      bind: KEPLER_PAIR,
      type: 'read',
      title: 'What you are looking at',
      body: `A single star of one solar mass sits at the center of the view with
             two bodies orbiting it.
             \n\nThe <strong>pale blue</strong> body on the wide, almost round
             path is the Circular Orbiter. The <strong>orange</strong> body on
             the stretched path is the Eccentric Orbiter, which swings in much
             closer to the star and back out much further. Nearly circular
             orbits are what most Solar System planets are on, which is exactly
             why the ellipse went unnoticed for so long.
             \n\nThe scene is paused, and the ring marks the star. Nothing is
             measured yet: the next step asks you to say where that star sits
             in the orange body's path before you look any closer.`,
      tip: 'Nothing needs selecting yet. If the scene looks wrong, press the reset button beside the progress bar to rebuild the system.',
    },
    {
      sid: 'where-is-the-star',
      bind: KEPLER_PAIR,
      type: 'predict',
      reveal: 'the-first-law-and-the',
      time: { paused: true },
      title: 'Where is the star?',
      body: `An ellipse has a center, halfway along its long diameter, and two
             special points called foci, one on each side of the center.
             \n\nLook at the orange body's path and where the star sits inside
             it. Commit to an answer before measuring anything: the next step
             gives you a way to check it.`,
      prompt: 'The star sits at…',
      options: [
        'the center of the ellipse',
        'one focus of the ellipse, off-center',
        'the closest point of the orbit',
        'a point that moves as the planet moves',
      ],
      answer: 1,
      because:
        'The star sits at one focus, and the other focus is empty: there is nothing there at all. This is not a coincidence of the Solar System: any inverse-square attraction produces a conic section with the source at a focus, which Newton proved sixty years after Kepler measured it. For a circle the two foci merge at the center, which is why a low-eccentricity orbit looks centered.',
    },
    {
      sid: 'find-the-foci',
      bind: KEPLER_PAIR,
      type: 'measure',
      allowInspector: true,
      time: { paused: true },
      title: 'Find the empty focus',
      body: `The simulation can draw the ellipse a planet follows, with both
             foci marked. Use it to check your prediction against two things you
             read yourself.
             \n\nFirst take the distances. Select the <strong>Eccentric
             Orbiter</strong> from the object list, then press <strong>Take
             reading</strong> beside <em>[[closest-approach|closest approach]]</em> and again beside
             <em>furthest distance</em>.
             \n\nThen switch on <strong>Orbit geometry</strong> in the planet's
             card. A panel lists the points you can measure. Choose the star's
             point (<em>Focus at Kepler Star</em>) and the <em>Empty focus</em>,
             by pointer, or with Left and Right and Enter in the list. The panel
             gives the distance between the two you chose: type it in. The last
             box works out what your two distances say that separation must be.`,
      tip: 'The panel can be closed with its X once you have the number. The two points are chosen one after the other; choosing a third replaces the oldest.',
      fields: [
        {
          id: 'f_peri',
          label: 'Eccentric Orbiter: closest approach to the star',
          unit: 'AU',
          want: '0.50',
          source: { probe: 'peri' },
          misconceptions: [WRONG_BODY],
        },
        {
          id: 'f_apo',
          label: 'Eccentric Orbiter: furthest distance from the star',
          unit: 'AU',
          want: '2.36',
          source: { probe: 'apo' },
          misconceptions: [WRONG_BODY],
        },
        {
          id: 'f_sep',
          label:
            'Distance between the star and the empty focus, from the panel',
          unit: 'AU',
          want: '1.86',
          misconceptions: [
            {
              id: 'secondFocusAtTheCenter',
              equals: 0.93,
              say: 'That is the distance from the star to the center of the ellipse, which is only half of the way to the empty focus. The empty focus is as far past the center as the star is short of it.',
            },
            {
              id: 'wrongTwoMarkers',
              equals: 0.5,
              say: 'That is the distance between the star and the nearest point of the orbit, or between the empty focus and the far point. Choose the star’s point and the Empty focus, and read the distance between those two.',
            },
            {
              id: 'wrongTwoMarkersFar',
              equals: 2.36,
              say: 'That is the distance between the star and the far point of the orbit, or between the empty focus and the near point. Choose the star’s point and the Empty focus, and read the distance between those two.',
            },
          ],
        },
        {
          id: 'f_implied',
          label: 'What your two distances say the foci are apart',
          unit: 'AU',
          compute: v => v.f_apo - v.f_peri,
          decimals: 2,
        },
      ],
      validate: (v, ctx) => {
        if (![v.f_peri, v.f_apo].every(Number.isFinite)) return null;
        if (v.f_peri <= 0 || v.f_apo <= 0) {
          return {
            level: 'error',
            message: 'Distances have to be positive numbers.',
          };
        }
        if (v.f_peri > v.f_apo) {
          return {
            level: 'warn',
            message:
              'Closest approach is larger than furthest distance: these look swapped.',
          };
        }
        const body = ctx.find('Eccentric');
        const el = body && ctx.elements(body);
        if (el) {
          const trueA = el.a * 0.01;
          if (Math.abs((v.f_peri + v.f_apo) / 2 - trueA) / trueA > 0.1) {
            return {
              level: 'warn',
              message:
                'Your two distances do not belong to the same orbit as the Eccentric Orbiter’s. Select it in the object list and take both readings again.',
            };
          }
        }
        if (!Number.isFinite(v.f_sep)) return null;
        const implied = v.f_apo - v.f_peri;
        if (Math.abs(v.f_sep - implied) / implied <= 0.07) {
          return {
            level: 'ok',
            message:
              'The panel’s separation agrees with what your two distances say. The star is as far from the near end of the orbit as the empty focus is from the far end, so the foci are the difference of the two distances apart, and the center of the ellipse lies halfway between them.',
          };
        }
        return {
          level: 'warn',
          message: `The separation you read from the panel and the one your two distances say (${implied.toFixed(2)} AU) do not agree. Check which two points are chosen, and that both distances were taken from the Eccentric Orbiter.`,
        };
      },
      probe: ctx => {
        const b = ctx.selected;
        const el = b && ctx.elements(b);
        if (!el) {
          return [
            { label: 'Select the Eccentric Orbiter', value: '-' },
            { id: 'peri', label: 'Closest (periapsis)', value: '-' },
            { id: 'apo', label: 'Furthest (apoapsis)', value: '-' },
          ];
        }
        return [
          { label: 'Selected', value: b.name || 'Body', emphasis: true },
          { label: 'Eccentricity e', value: fixed(el.e, 3) },
          {
            id: 'peri',
            label: 'Closest (periapsis)',
            value: ctx.distance(el.periapsis),
          },
          {
            id: 'apo',
            label: 'Furthest (apoapsis)',
            value: ctx.distance(el.apoapsis),
          },
        ];
      },
    },
    {
      sid: 'the-first-law-and-the',
      bind: KEPLER_PAIR,
      type: 'read',
      evidence: [
        { step: 'find-the-foci', field: 'f_sep' },
        { step: 'find-the-foci', field: 'f_implied' },
      ],
      compare:
        'The star sits at one focus and the other focus is empty. The panel’s separation and the one your two distances give are the same number because the foci mirror each other about the center.',
      quote: {
        text: 'Because these eight minutes could not be ignored, they alone have led the way toward reforming the whole of astronomy.',
        by: 'Johannes Kepler, Astronomia Nova, 1609',
      },
      title: 'The First Law, and the anatomy of an ellipse',
      body: `Tycho Brahe measured planetary positions to about one arcminute,
             the limit without a telescope. When Johannes Kepler fitted Tycho's
             observations of Mars to a circle, the best fit was off by eight
             arcminutes, and he trusted the measurements over two thousand
             years of circles.
             \n\nKepler's <strong>first law</strong>: every planet moves on an
             ellipse, with the star at one focus.
             \n\nAn ellipse has two foci. Their defining property is that for
             any point on the curve, the distances to the two foci always add to
             the same total. The <em>[[semi-major-axis|semi-major axis]]</em> <strong>a</strong> is
             half the long diameter, and it is the orbit's size. The
             <em>[[eccentricity|eccentricity]]</em> <strong>e</strong> is its shape: the foci sit
             a distance <em>a</em> × <em>e</em> either side of the center, so <em>e</em> = 0 puts both foci
             at the center and gives a circle, while <em>e</em> approaching 1 stretches
             the ellipse into a sliver.
             \n\nThe second focus is the strange part. There is nothing there.
             No mass, no object, nothing to mark it. It is a purely geometric
             consequence of the inverse-square force.`,
      tip: 'Drag the slider on the next step to watch the foci separate as e grows.',
    },
    {
      sid: 'change-the-shape',
      bind: KEPLER_PAIR,
      type: 'ellipse',
      title: 'Change the shape',
      start: 0.017,
      body: `Drag the eccentricity slider in the panel beside this one. Each
             quantity is drawn in its own color, matching the key underneath.
             \n\n<strong>a</strong>, the semi-major axis, is half the long
             diameter and sets the orbit's <em>size</em>. It is held fixed on
             screen here so that only the shape changes.
             <strong>b</strong> is the semi-minor axis, half the short diameter.
             <strong><em>c</em> = <em>a</em> × <em>e</em></strong> is how far each focus sits from the
             center, so the eccentricity is just the fraction of a by which the
             star is off-center.
             \n\nThe two are tied together by <em>b</em> = <em>a</em> × √(1 − <em>e</em>²),
             which is why the ellipse gets shorter as it gets more eccentric
             while its length stays the same.
             \n\nNotice how little <em>e</em> has to grow before the star is visibly
             off-center, and how hard it is to see any difference at all below
             about 0.1. That is why the Solar System's near-circular orbits hid
             the ellipse for two thousand years, and why it was Mars, one of the
             more eccentric planets Tycho could measure well, that finally gave
             it away.`,
      presets: [
        {
          label: 'Venus',
          e: 0.007,
          note: 'Venus has the roundest orbit of any planet. At this eccentricity the two foci are almost on top of each other and the orbit is indistinguishable from a circle by eye.',
        },
        {
          label: 'Earth',
          e: 0.017,
          note: 'Earth. The Sun is about 1.7% of a off-center, which puts us roughly 5 million km closer in January than in July. Not enough to cause the seasons, which come from axial tilt.',
        },
        {
          label: 'Mars',
          e: 0.093,
          note: 'Mars, and the reason Kepler got there. At <em>e</em> = 0.093 the departure from a circle is just large enough to show up in naked-eye measurements accurate to an arcminute.',
        },
        {
          label: 'Mercury',
          e: 0.206,
          note: 'Mercury, the most eccentric planet. Its perihelion advance, tiny and unexplained by Newton, was one of the first confirmations of general relativity.',
        },
        {
          label: 'Pluto',
          e: 0.249,
          note: 'Pluto. Its orbit is eccentric enough that it spends about twenty years of each 248-year circuit closer to the Sun than Neptune.',
        },
        {
          label: 'Halley',
          e: 0.967,
          note: "Halley's Comet. It swings from inside Venus's orbit out past Neptune on a 76-year circuit. At this eccentricity the ellipse is a long thin cigar with the Sun near one tip.",
        },
        {
          label: 'Hale-Bopp',
          e: 0.995,
          note: 'Comet Hale-Bopp, bright in 1997 and not due back for roughly two thousand years. Barely bound at all.',
        },
        {
          label: 'Circle',
          e: 0,
          note: 'A perfect circle: both foci sit exactly at the center. Circles are ellipses; they are just the special case Kepler had to give up as the only case.',
        },
      ],
    },
    {
      sid: 'what-sits-at-the-other',
      bind: KEPLER_PAIR,
      type: 'question',
      title: 'What sits at the other focus?',
      kind: 'choice',
      body: `You have just watched two foci slide apart as the eccentricity
             grew, one of them holding the star.`,
      prompt: 'At the second focus of a planetary orbit there is…',
      options: [
        'a second, unseen star',
        'the center of mass of the system',
        'nothing at all',
        'the point where the planet moves slowest',
      ],
      answer: 2,
      because:
        'Nothing at all. The empty focus is a geometric feature of the ellipse, not a physical location, and there is no object or force there. The center of mass sits very close to the star, not at the far focus, and the planet moves slowest at apoapsis, which is a point on the orbit rather than inside it.',
    },
    {
      sid: 'where-does-it-move-fastest',
      bind: KEPLER_PAIR,
      type: 'predict',
      reveal: 'why-the-speed-changes',
      time: { paused: true },
      title: 'Where does it move fastest?',
      body: `The eccentric planet's distance from its star changes all the way
             round its orbit: it swings in close and out far. Think about what
             that does to its speed, then commit to an answer before you measure
             anything.`,
      prompt: 'The eccentric planet moves fastest…',
      options: [
        'at its closest approach to the star',
        'at its furthest point from the star',
        'at the same speed everywhere',
        'halfway between the two',
      ],
      answer: 0,
      because:
        'Fastest at closest approach. A wedge drawn close to the star is short in radius, so to enclose the same area it has to be long around: the planet must cover more ground per unit time when it is near. Kepler found this rule before he found the ellipse, and it is the reason the northern hemisphere summer is a few days longer than the southern one: Earth is near aphelion in July and dawdles.',
    },
    {
      sid: 'watch-it-happen',
      bind: KEPLER_PAIR,
      type: 'explore',
      time: { paused: false },
      title: 'Watch it happen',
      body: `Let the simulation run and keep the eccentric planet selected. The
             live speed below changes continuously as it goes round, while the
             shape of the orbit does not change at all.`,
      checklist: [
        'Watch the speed reading as the planet swings past the star',
        'Watch it again at the far end of the orbit',
        'Note that the semi-major axis and eccentricity barely move: the orbit is fixed, only the position on it changes',
      ],
      probe: ctx => {
        const b = ctx.selected;
        if (!b) return [{ label: 'Select the Eccentric Orbiter', value: '-' }];
        const el = ctx.elements(b);
        if (!el) return [{ label: b.name || 'Body', value: 'no orbit found' }];
        return [
          { label: 'Selected', value: b.name || 'Body' },
          { label: 'Distance from star', value: ctx.distance(el.r) },
          { label: 'Speed now', value: ctx.speed(el.v), emphasis: true },
          { label: 'Eccentricity e', value: fixed(el.e, 3) },
        ];
      },
    },
    {
      sid: 'fast-and-slow-in-numbers',
      bind: KEPLER_PAIR,
      type: 'measure',
      title: 'Fast and slow, in numbers',
      body: `Now put numbers on it, and let the simulation find the two
             moments for you, because catching them by hand measures your
             reflexes rather than the orbit.
             \n\nThe <strong>Pause at Event</strong> tool below has the
             <strong>Eccentric Orbiter</strong> and its star chosen, and with
             your prediction committed it is armed for
             <strong>[[periapsis|periapsis]]</strong>: the simulation runs until
             the planet reaches its closest point and stops there. Select the
             planet in the object list and press <strong>Take reading</strong>
             beside the speed and beside the distance. Then set the event to
             <strong>[[apoapsis|apoapsis]]</strong>, press <strong>Arm</strong>,
             and take the same two readings at the far end.
             \n\nBoth numbers are measured <strong>relative to the star</strong>:
             the readout subtracts the star's own motion, so the distance and
             the speed describe the orbit rather than the pair's drift through
             the frame. The ratio is worked out for you.
             \n\nThe tool reports when the event <em>was</em>, and how far past
             it the simulation actually <em>stopped</em>. Those are different
             things: the world is integrated in steps, and the event falls
             between two of them, so the speed you read is a short way past the
             extreme. For this orbit the difference is small, and the honest
             thing is to know it is there.`,
      // Opens the tool with these two bodies chosen. With `auto` it arms the
      // periapsis watch once the prediction is committed; the reader arms the
      // second event, apoapsis, which is the interaction being asked for.
      // See js/investigations/eventWatch.js.
      pauseAt: {
        kind: 'periapsis',
        body: 'Eccentric Orbiter',
        primary: 'Kepler Star',
        auto: true,
      },
      fields: [
        {
          id: 'v_peri',
          label: 'Speed at closest approach',
          unit: 'km/s',
          want: '54',
          source: { probe: 'speed' },
          misconceptions: [WRONG_BODY],
        },
        {
          id: 'r_peri',
          label: 'Distance from star there',
          unit: 'AU',
          want: '0.50',
          source: { probe: 'dist' },
        },
        {
          id: 'v_apo',
          label: 'Speed at furthest point',
          unit: 'km/s',
          want: '11.5',
          source: { probe: 'speed' },
          misconceptions: [WRONG_BODY],
        },
        {
          id: 'r_apo',
          label: 'Distance from star there',
          unit: 'AU',
          want: '2.36',
          source: { probe: 'dist' },
        },
        {
          id: 'v_ratio',
          label: 'Ratio (fast ÷ slow)',
          unit: '',
          compute: v => v.v_peri / v.v_apo,
          decimals: 2,
        },
      ],
      validate: (v, ctx) => {
        if (!Number.isFinite(v.v_peri) || !Number.isFinite(v.v_apo))
          return null;
        if (v.v_peri <= 0 || v.v_apo <= 0) {
          return {
            level: 'error',
            message:
              'Speeds have to be positive. Read the "Speed now" value, which is a magnitude.',
          };
        }
        if (v.v_peri < v.v_apo) {
          return {
            level: 'warn',
            message:
              'Your "closest" speed is lower than your "furthest" speed. That is the wrong way round for any bound orbit. Check which reading you took where, using the distance to tell them apart.',
          };
        }
        const body = ctx.find('Eccentric');
        const el = body && ctx.elements(body);
        if (!el) return null;
        // The two distances, when they were recorded. Checked before the
        // speed ratio because a swapped pair explains a wrong ratio, and
        // "these are the wrong way round" is more use than "your ratio is
        // off". Both are separations from the star in the same relative frame
        // the speeds are read in.
        if (Number.isFinite(v.r_peri) && Number.isFinite(v.r_apo)) {
          if (v.r_peri >= v.r_apo) {
            return {
              level: 'warn',
              message:
                'The distance you recorded at closest approach is not smaller than the one at the far point, so the two readings are swapped or both came from the same end. The tool stops at whichever event it was armed for - check that the second arm was apoapsis.',
            };
          }
          const eFromR = (v.r_apo - v.r_peri) / (v.r_apo + v.r_peri);
          if (Math.abs(eFromR - el.e) / Math.max(el.e, 1e-6) > 0.25) {
            return {
              level: 'warn',
              message: `Your two distances imply an eccentricity of ${eFromR.toFixed(3)}, but this orbit's is ${el.e.toFixed(3)}. Both have to come from the paused state at each event, measured from the star.`,
            };
          }
        }
        // Conservation of angular momentum at the two extremes, where velocity
        // is perpendicular to the radius, gives v_peri/v_apo = (1+e)/(1-e).
        const expected = (1 + el.e) / (1 - el.e);
        const ratio = v.v_peri / v.v_apo;
        const err = Math.abs(ratio - expected) / expected;
        if (err <= 0.15) {
          return {
            level: 'ok',
            message: `Your ratio of ${ratio.toFixed(2)} matches (1+<em>e</em>)/(1−<em>e</em>) = ${expected.toFixed(2)} for this orbit's eccentricity of ${el.e.toFixed(3)}. That relation falls straight out of angular momentum being conserved.`,
          };
        }
        if (ratio < 1.2) {
          return {
            level: 'warn',
            message: `A ratio of ${ratio.toFixed(2)} is close to 1, which would mean the planet barely changes speed, but this orbit has <em>e</em> = ${el.e.toFixed(3)}, so the ratio should be near ${expected.toFixed(2)}. You have probably caught it twice at similar distances. Pause when "Distance from star" is at its smallest, then again at its largest.`,
          };
        }
        return {
          level: 'warn',
          message: `Your ratio is ${ratio.toFixed(2)}, but for <em>e</em> = ${el.e.toFixed(3)} it should be about (1+<em>e</em>)/(1−<em>e</em>) = ${expected.toFixed(2)}. Double-check both readings: pausing a little before or after the true extreme is the usual cause.`,
        };
      },
      tip: 'If the tool refuses to arm and says the orbit is circular, that is not a fault. On a perfectly round orbit there is no closest point: the radial rate is zero everywhere and its sign is decided by rounding error, so a watch would fire on the first step and every step after it. The tool declines and says so. The Eccentric Orbiter is eccentric enough; the Circular Orbiter is not, and it is worth arming it once to see the refusal.',
      probe: ctx => {
        const b = ctx.selected;
        const el = b && ctx.elements(b);
        if (!el) {
          return [
            { id: 'dist', label: 'Distance from star', value: '-' },
            { id: 'speed', label: 'Speed now', value: '-' },
            { label: 'Select the Eccentric Orbiter', value: '-' },
          ];
        }
        const nearPeri = Math.abs(el.r - el.periapsis) / el.periapsis < 0.03;
        const nearApo = Math.abs(el.r - el.apoapsis) / el.apoapsis < 0.03;
        return [
          {
            id: 'dist',
            label: 'Distance from star',
            value: ctx.distance(el.r),
            emphasis: nearPeri || nearApo,
          },
          {
            id: 'speed',
            label: 'Speed now',
            value: ctx.speed(el.v),
            emphasis: true,
          },
          {
            label: 'At an extreme?',
            value: nearPeri
              ? 'closest: read now'
              : nearApo
                ? 'furthest: read now'
                : 'in between',
          },
          { label: 'Closest this orbit', value: ctx.distance(el.periapsis) },
          { label: 'Furthest this orbit', value: ctx.distance(el.apoapsis) },
        ];
      },
    },
    {
      sid: 'why-the-speed-changes',
      bind: KEPLER_PAIR,
      type: 'question',
      evidence: [
        { step: 'fast-and-slow-in-numbers', field: 'v_peri' },
        { step: 'fast-and-slow-in-numbers', field: 'v_apo' },
      ],
      compare:
        'The planet is fastest at its closest approach and slowest at its furthest point. Your two speeds are the evidence the explanation below has to account for.',
      title: 'Why the speed changes',
      kind: 'short',
      body: `You have just measured a planet speeding up and slowing down on a
             fixed orbit, with nothing pushing it along and no fuel being burned.
             Something is being traded, and something else is being conserved.`,
      prompt:
        'In one or two sentences, explain why the planet speeds up as it approaches the star. What quantity stays constant, and why does gravity not change it?',
      rubric:
        'Angular momentum L = m·v·r·sin(angle) is conserved because gravity is a central force: it acts along the line joining the two bodies and so exerts no torque about the star. As r falls, v must rise to keep the product constant. (Energy is also conserved, with potential converting to kinetic; either argument earns credit, but angular momentum is the one that gives the equal-areas rule directly.)',
    },
    {
      sid: 'equal-areas-however-you-slice',
      bind: KEPLER_PAIR,
      type: 'wedges',
      wedgeOf: 'Eccentric',
      title: 'Equal areas, however you slice it',
      body: `The orbit on screen is cut into equal-time slices, and every slice
             is labeled with its share of the total area. Change how many slices
             there are and watch what happens to those numbers.
             \n\nWith 5 slices each is 20%. With 12 each is 8.3%. The count is
             arbitrary; what is not arbitrary is that they are always equal. The
             planet takes exactly the same time to travel along each slice's
             stretch of orbit, whether that stretch is a short fast dash past the
             star or a long slow crawl across the far side.`,
      tip: 'The wedge time below is the real answer to "equal areas in equal times": it is the same number for every wedge because they all represent the same interval.',
    },
    {
      sid: 'kepler-s-third-law',
      bind: SOLAR,
      type: 'read',
      title: "Kepler's third law",
      body: `The first two laws describe a single orbit. The third relates
             <em>different</em> orbits to each other, and it took Kepler another
             decade to find: the square of the orbital [[period|period]] is proportional to
             the cube of the semi-major axis.
             \n\nWritten for a one-solar-mass star with <em>P</em> in years and
             <em>a</em> in AU, the constant is exactly 1, so the law reads
             simply <em>P</em>² = <em>a</em>³. Earth checks out trivially: 1² = 1³.
             \n\nYou are about to test it against the real Solar System. These
             are the true semi-major axes and the true masses, so your
             measurements should match a textbook table to within your reading
             error. Earth really is at 1 AU here, and its period really does
             come out at one year.
             \n\nOne thing to notice straight away: the view is framed on
             Mercury out to Saturn, and Uranus and Neptune are already off
             screen. Neptune is thirty times further from the Sun than Earth is,
             and no single view shows the inner planets and the outer ones at a
             useful size at once. That is not a limitation of this software. It
             is why almost every diagram of the Solar System you have ever seen
             is drawn to the wrong scale.`,
      tip: 'Scroll to zoom. The planets stay visible as small dots however far out you go, and stay clickable, but they only separate properly when you zoom in. Nothing is moving, so take your time.',
      setup: {
        scenario: 'Solar System',
        seed: 'kepler-lab',
        // Asteroids and comets are turned off: they are not what is being
        // measured, and a belt of unlabeled rocks between Mars and Jupiter is
        // just something else to click by mistake.
        settings: { enable_asteroids: false, num_asteroids: 0, num_comets: 0 },
        // Framed on Mercury out to Saturn, which is the range a student can
        // actually work in: at 0.4 the inner planets are still separated by
        // tens of pixels, while Saturn stays on screen. Uranus and Neptune are
        // further out and need a scroll, which the text says.
        camera: { zoom: 0.4, pan: { x: 0, y: 0 } },
        paused: true,
      },
    },
    {
      sid: 'measure-four-planets',
      bind: SOLAR,
      type: 'measure',
      title: 'Measure the planets',
      body: `Select a planet and press <strong>Add reading</strong> to record
             its semi-major axis and period together, with the name of the
             planet they came from. Choose at least five, and choose them so
             that they are well spread out, because a narrow range of <em>a</em>
             cannot tell a power law apart from a straight line.
             \n\nThere is room for all eight planets, and the fitted line gets
             visibly better as you add them. Mercury, Earth, Jupiter and Saturn
             are reachable at the starting zoom; scroll out for Uranus and
             Neptune. Select a point on the plot, or a row of the table, to ring
             the planet it came from.
             \n\nIf the outer planets squash the inner ones into the corner of
             the plot, press <strong>Log axes</strong>. On a log-log plot a power
             law is a straight line whatever its exponent, and every planet gets
             the same amount of room.
             \n\nYour points appear on the plot as you add them. Record what the
             simulation reports, not what you remember about the real Solar
             System.`,
      importLabel: 'Add reading',
      fields: [1, 2, 3, 4, 5, 6, 7, 8].flatMap(i => [
        {
          id: `p${i}_name`,
          label: `Planet ${i}: name`,
          unit: '',
          kind: 'text',
        },
        { id: `p${i}_a`, label: `Planet ${i}: a`, unit: 'AU' },
        { id: `p${i}_P`, label: `Planet ${i}: P`, unit: 'yr' },
      ]),
      // Lets the student copy the selected planet's readings into the next
      // empty row instead of transcribing four numbers by hand.
      importFromSelection: ctx => {
        const b = ctx.selected;
        if (!b) return null;
        const el = ctx.elements(b);
        if (!el || !el.bound) return null;
        const a = el.a * 0.01; // simulation units to AU
        const P = ctx.years(el.period);
        if (!Number.isFinite(a) || !Number.isFinite(P)) return null;
        return [b.name || 'Planet', a.toFixed(3), P.toFixed(P < 10 ? 3 : 2)];
      },
      importGroups: [1, 2, 3, 4, 5, 6, 7, 8].map(i => [
        `p${i}_name`,
        `p${i}_a`,
        `p${i}_P`,
      ]),
      plot: {
        title: 'Your measurements',
        xLabel: 'a  (AU)',
        yLabel: 'P  (yr)',
        height: 190,
        points: v =>
          [1, 2, 3, 4, 5, 6, 7, 8].map(i => ({
            x: v[`p${i}_a`],
            y: v[`p${i}_P`],
            label: (v[`p${i}_name_text`] || '').slice(0, 8),
          })),
        transform: {
          label: 'Square P, cube a',
          xLabel: 'a³  (AU³)',
          yLabel: 'P²  (yr²)',
          map: p => ({ x: p.x ** 3, y: p.y ** 2, label: p.label }),
        },
        note: `Raw, the points curve away: a power law always does. Press
               <strong>Square P, cube a</strong> and they should fall on a
               straight line through the origin. Straightening a curve by
               choosing the right axes is how you identify a power law, and the
               slope of that line is the constant in <em>P</em>² = <em>k</em>·<em>a</em>³.`,
      },
      validate: v => {
        const rows = [1, 2, 3, 4, 5, 6, 7, 8]
          .map(i => ({
            i,
            name: String(v[`p${i}_name_text`] || `row ${i}`),
            a: v[`p${i}_a`],
            P: v[`p${i}_P`],
          }))
          .filter(r => Number.isFinite(r.a) && Number.isFinite(r.P));
        if (rows.length < 2) return null;
        if (rows.some(r => r.a <= 0 || r.P <= 0)) {
          return {
            level: 'error',
            message: 'Distances and periods must both be positive.',
          };
        }
        const ks = rows.map(r => (r.P * r.P) / (r.a * r.a * r.a));
        const mean = ks.reduce((x, y) => x + y, 0) / ks.length;
        const spread = (Math.max(...ks) - Math.min(...ks)) / mean;
        if (rows.length >= 3 && spread > 0.5) {
          // Name the row that disagrees with the others: the one furthest
          // from the middle value.
          const mid = [...ks].sort((x, y) => x - y)[Math.floor(ks.length / 2)];
          const off = rows
            .map((r, j) => ({ r, d: Math.abs(ks[j] - mid) / mid }))
            .sort((x, y) => y.d - x.d)[0].r;
          return {
            level: 'warn',
            message: `Your <em>P</em>²/<em>a</em>³ values range from ${Math.min(...ks).toFixed(2)} to ${Math.max(...ks).toFixed(2)}. For planets around the same star they should all be close to each other, and ${off.name} (row ${off.i}) is the one that disagrees. Check whether its period was read in days rather than years, or its distance from another planet.`,
          };
        }
        const range =
          Math.max(...rows.map(r => r.a)) / Math.min(...rows.map(r => r.a));
        if (rows.length >= 3 && range < 4) {
          return {
            level: 'warn',
            message: `Your planets span only a factor of ${range.toFixed(1)} in distance. A narrow range cannot tell a power law from a straight line: add a planet much nearer or much farther than the others.`,
          };
        }
        if (rows.length >= 5) {
          return {
            level: 'ok',
            message: `All ${rows.length} of your <em>P</em>²/<em>a</em>³ values agree to within ${fixed(spread * 100, 0)}%, across a factor of ${fixed(range, 0)} in distance. That constancy across planets of wildly different sizes is Kepler's third law.`,
          };
        }
        return {
          level: 'warn',
          message: `${rows.length} planets so far. Add more, spread out: at least five are needed before the pattern can be told from a straight line.`,
        };
      },
      probe: ctx => {
        const b = ctx.selected;
        if (!b) return [{ label: 'Click a planet to measure it', value: '-' }];
        const el = ctx.elements(b);
        if (!el) return [{ label: b.name || 'Body', value: 'no orbit found' }];
        return [
          { label: 'Selected', value: b.name || 'Body', emphasis: true },
          { label: 'Semi-major axis a', value: ctx.distance(el.a) },
          { label: 'Period P', value: ctx.time(el.period), emphasis: true },
          { label: 'Eccentricity e', value: fixed(el.e, 3) },
        ];
      },
    },
    {
      sid: 'work-the-law-out-step',
      bind: SOLAR,
      // The two values in the first two boxes are copied from the table the
      // student filled in there; without it this step asks them to copy numbers
      // they were never asked to write down.
      requires: ['measure-four-planets'],
      type: 'measure',
      title: 'Work the law out, step by step',
      body: `Take your <strong>outermost</strong> planet: the one with the
             largest <em>a</em>. Copy its two values into the first two boxes
             below and the rest is worked out for you, one stage at a time, so
             you can see where the number comes from.
             \n\nCube the distance. Square the period. Divide the second by the
             first. If Kepler was right, what comes out should not depend on
             which planet you chose.`,
      fields: [
        { id: 'k_a', label: 'Semi-major axis a', unit: 'AU' },
        { id: 'k_P', label: 'Period P', unit: 'yr' },
        {
          id: 'k_a3',
          label: 'Step 1: <em>a</em>³',
          unit: 'AU³',
          compute: v => v.k_a ** 3,
          decimals: 3,
        },
        {
          id: 'k_P2',
          label: 'Step 2: <em>P</em>²',
          unit: 'yr²',
          compute: v => v.k_P ** 2,
          decimals: 3,
        },
        {
          id: 'k_ratio',
          label: 'Step 3: <em>P</em>² ÷ <em>a</em>³',
          unit: '',
          compute: v => v.k_P ** 2 / v.k_a ** 3,
          decimals: 3,
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.k_a) || !Number.isFinite(v.k_P)) return null;
        if (v.k_a <= 0 || v.k_P <= 0) {
          return {
            level: 'error',
            message: 'Both values must be positive.',
          };
        }
        const k = v.k_P ** 2 / v.k_a ** 3;
        if (Math.abs(k - 1) <= 0.25) {
          return {
            level: 'ok',
            message: `<em>P</em>² ÷ <em>a</em>³ = ${k.toFixed(3)}, which is 1 within your reading error. The star here is exactly one solar mass, and in years and AU that makes the constant exactly 1, so this is the check working, not a coincidence.`,
          };
        }
        if (k > 100 || k < 0.01) {
          return {
            level: 'warn',
            message: `<em>P</em>² ÷ <em>a</em>³ comes out as ${k.toExponential(2)}, which is far from 1. That size of error almost always means a unit slip: a period entered in days instead of years, or a distance in simulation units rather than AU. Check the readout labels.`,
          };
        }
        return {
          level: 'warn',
          message: `<em>P</em>² ÷ <em>a</em>³ = ${k.toFixed(3)}, where it should be close to 1 for a one-solar-mass star. Re-read a and P for the same planet and check you have not mixed rows.`,
        };
      },
      probe: ctx => {
        const b = ctx.selected;
        if (!b) return [{ label: 'Click a planet to re-read it', value: '-' }];
        const el = ctx.elements(b);
        if (!el) return [{ label: b.name || 'Body', value: 'no orbit found' }];
        return [
          { label: 'Selected', value: b.name || 'Body', emphasis: true },
          { label: 'Semi-major axis a', value: ctx.distance(el.a) },
          { label: 'Period P', value: ctx.time(el.period) },
        ];
      },
    },
    {
      sid: 'pick-a-distance',
      bind: SOLAR,
      requires: ['measure-four-planets'],
      type: 'measure',
      title: 'Pick an orbit nobody has measured',
      body: `The real test of a law is whether it predicts something you have
             not measured. Choose a distance from the star, in AU, for a ninth
             planet that does not exist. Pick one that falls in a gap between
             two of the planets you measured, not on top of one of them, so that
             the prediction means something.
             \n\nNobody has measured its period. The next two steps ask you
             to estimate it from your plot, and then to check the estimate.`,
      fields: [
        {
          id: 'a_new',
          label: 'Distance of the ninth planet from the star',
          unit: 'AU',
        },
      ],
      validate: (v, ctx) => {
        if (!Number.isFinite(v.a_new)) return null;
        if (v.a_new < 0.3 || v.a_new > 25) {
          return {
            level: 'warn',
            message:
              'That is outside the range of the planets in this view. Pick a distance between about 0.3 and 25 AU, in a gap between two planets you measured.',
          };
        }
        const near = [
          'mercury',
          'venus',
          'earth',
          'mars',
          'jupiter',
          'saturn',
          'uranus',
          'neptune',
        ]
          .map(r => ctx.role(r))
          .filter(Boolean)
          .map(b => ({ b, el: ctx.elements(b) }))
          .filter(x => x.el)
          .find(
            x => Math.abs(x.el.a * 0.01 - v.a_new) / (x.el.a * 0.01) < 0.12
          );
        if (near) {
          return {
            level: 'warn',
            message: `That is almost exactly ${near.b.name}'s distance, so its period would just be ${near.b.name}'s. Pick a distance in a gap between two planets.`,
          };
        }
        return {
          level: 'ok',
          message:
            'That distance is in a gap, so the prediction has to come from the pattern in your plot rather than from one planet.',
        };
      },
    },
    {
      sid: 'estimate-the-year',
      bind: SOLAR,
      type: 'predict',
      kind: 'estimate',
      unit: 'yr',
      reveal: 'compare-the-estimate',
      title: 'Estimate its year',
      body: `Look at your plot and your table. Estimate the orbital period of
             the planet at the distance you chose, in years. Do not work out a
             formula yet: read it off the pattern, then commit to a number. It
             stays unmarked until the next step.`,
      prompt: 'Period of the ninth planet',
    },
    {
      sid: 'check-the-estimate',
      bind: SOLAR,
      requires: ['pick-a-distance'],
      type: 'measure',
      title: 'Check it against a real planet',
      body: `Check the estimate against the planet whose orbit is nearest the
             one you chose. Select that planet and press <strong>Take
             reading</strong> beside its distance and beside its period.
             \n\nThen use Kepler's third law to work out the period at your
             distance, scaling from that planet, and put it in the last box.
             Does it land near your estimate?`,
      fields: [
        {
          id: 'near_a',
          label: 'Nearest measured planet: distance',
          unit: 'AU',
          source: { probe: 'a' },
        },
        {
          id: 'near_P',
          label: 'Nearest measured planet: period',
          unit: 'yr',
          source: { probe: 'P' },
        },
        {
          id: 'ratio',
          label: 'Your distance as a multiple of that planet’s',
          unit: '',
          compute: (v, earlier) =>
            (earlier?.('pick-a-distance', 'a_new') ?? NaN) / v.near_a,
          decimals: 2,
        },
        {
          id: 'P_calc',
          label: 'Period at your distance, from the law',
          unit: 'yr',
        },
      ],
      validate: (v, ctx) => {
        if (![v.near_a, v.near_P, v.ratio].every(Number.isFinite)) return null;
        // One planet's two readings, not two planets'.
        const body = ctx.selected;
        const el = body && ctx.elements(body);
        if (el && Math.abs(ctx.years(el.period) - v.near_P) / v.near_P > 0.2) {
          return {
            level: 'warn',
            message:
              'The period does not belong to the planet whose distance you took. Select one planet and take both readings from it.',
          };
        }
        // The planet nearest the chosen orbit in plain distance, from the world.
        const P = Object.values(SOLAR).slice(1);
        const A = P.map(({ name }) => {
          const b = ctx.bodies?.find(x => x.name === name);
          return (b && ctx.elements(b)?.a * 0.01) || NaN;
        });
        const near = x =>
          A.map((y, i) => [Math.abs(x - y), i])
            .filter(p => p[0] === p[0])
            .sort((p, q) => p[0] - q[0])[0]?.[1];
        const nearest = near(v.ratio * v.near_a);
        if (nearest !== undefined && near(v.near_a) !== nearest) {
          return {
            level: 'warn',
            message: `${P[nearest].name} is the planet whose orbit is nearest the one you chose, and it is not the one you took. Select ${P[nearest].name} and take both readings again.`,
          };
        }
        if (v.ratio > 2 || v.ratio < 0.5) {
          return {
            level: 'warn',
            message:
              'That planet is more than twice as far from the star as your orbit, or less than half. The law still scales, but a nearer planet is a closer check on the estimate. Select a nearer one and take both readings again.',
          };
        }
        if (!Number.isFinite(v.P_calc) || v.P_calc <= 0) return null;
        const a = v.ratio * v.near_a;
        const want = v.near_P * v.ratio ** 1.5;
        const at = x => Math.abs(v.P_calc - x) / x <= 0.06;
        if (at(want)) {
          return {
            level: 'ok',
            message:
              'That agrees with scaling the nearest planet’s period by the law. The law gives the same number whichever planet you scale from, which is what your table showed. Compare it with your estimate.',
          };
        }
        if (at(a ** 3)) {
          return {
            level: 'warn',
            message:
              'That is the distance cubed, which is the square of the period. The law says P² = a³, so the period is the square root of that.',
          };
        }
        if (at(a ** 0.5)) {
          return {
            level: 'warn',
            message:
              'That is the square root of the distance. Cube the distance first, then take the square root of the result.',
          };
        }
        if (at(v.near_P * v.ratio)) {
          return {
            level: 'warn',
            message:
              'That scales the period in proportion to the distance. The law says the period grows faster than the distance: as its power three halves.',
          };
        }
        return {
          level: 'warn',
          message:
            'That does not agree with scaling the nearest planet’s period by the law. Check the power the distance is raised to, and the units: the period is in years.',
        };
      },
      probe: ctx => {
        const b = ctx.selected;
        const el = b && ctx.elements(b);
        if (!el) {
          return [
            { label: 'Click a planet to read it', value: '-' },
            { id: 'a', label: 'Semi-major axis a', value: '-' },
            { id: 'P', label: 'Period P', value: '-' },
          ];
        }
        return [
          { label: 'Selected', value: b.name || 'Body', emphasis: true },
          {
            id: 'a',
            label: 'Semi-major axis a',
            value: `${fixed(el.a * 0.01, 3)} AU`,
          },
          {
            id: 'P',
            label: 'Period P',
            value: `${fixed(ctx.years(el.period), 3)} yr`,
            emphasis: true,
          },
        ];
      },
    },
    {
      sid: 'compare-the-estimate',
      bind: SOLAR,
      type: 'read',
      evidence: [
        { step: 'check-the-estimate', field: 'P_calc' },
        { step: 'check-the-estimate', field: 'near_P' },
      ],
      compare:
        'The law gives a period from a distance alone. Where your estimate and the law’s number differ, the curve you read the estimate from was the less exact of the two.',
      title: 'Your estimate and the law',
      body: `Above are your estimate, the period the law gives at your distance,
             and the planet you scaled it from. A law is more than a curve
             through your points: it says what the period has to be at a
             distance nobody has measured, and a planet put there would be
             held to it.
             \n\nIf your estimate was off, notice what it came from: reading
             a curved plot by eye. Straightening the plot, or using the
             exponent, is what the law is for.`,
    },
    {
      sid: 'what-the-constant-depends-on',
      type: 'question',
      kind: 'choice',
      // One planet on a circular orbit at 1 AU, around a star whose mass the
      // controlled run changes: the same planet, the same orbit, one thing
      // different.
      stage: {
        system: {
          starName: 'Test star',
          planets: [{ name: 'Test planet', role: 'planet', aAU: 1, ecc: 0 }],
          fit: true,
        },
      },
      variation: {
        param: 'starMassSun',
        values: [1, 2],
        runFor: 30,
        read: ['P'],
        label: 'star mass',
      },
      time: { paused: true },
      title: 'What the constant depends on',
      body: `Your planets had wildly different masses, from a small rocky world to
             a gas giant hundreds of times heavier, and all gave the same
             <em>P</em>²/<em>a</em>³. So what does that constant depend on?
             \n\nHere is one planet on a circular orbit at 1 AU. Press
             <strong>Run A</strong> and read its period, then
             <strong>Change star mass</strong> and press <strong>Run B</strong>:
             the same planet at the same distance, around a star of twice the
             mass. The two runs are kept in the table.`,
      probe: ctx => {
        const b = ctx.role('world');
        const el = b && ctx.elements(b);
        if (!el) {
          return [
            { label: 'Planet', value: '-' },
            { id: 'P', label: 'Period P', value: '-' },
          ];
        }
        return [
          { label: 'Planet', value: b.name },
          {
            id: 'P',
            label: 'Period P',
            value: `${fixed(ctx.years(el.period), 3)} yr`,
            emphasis: true,
          },
        ];
      },
      prompt:
        'The constant in <em>P</em>² = <em>k</em>·<em>a</em>³ depends on…',
      options: [
        'the mass of the planet',
        'the mass of the star',
        'the eccentricity of the orbit',
        'nothing: it is the same everywhere in the universe',
      ],
      answer: 1,
      because:
        'It depends on the central mass: Newton showed <em>k</em> = 4π<sup>2</sup>/<em>G</em>(<em>M</em>+<em>m</em>), and since <em>M</em> ≫ <em>m</em> for a planet the planet’s own mass drops out. Read backwards, this is a way to weigh things you can never visit. Measure a period and a distance, and the mass falls out. It is how the Sun was first weighed, how exoplanet host stars are weighed today, and how the four-million-solar-mass black hole at the center of the Milky Way was weighed by tracking the star S2 through a sixteen-year orbit.',
    },
    {
      sid: 'what-newton-added',
      bind: TRAPPIST_1,
      type: 'read',
      title: 'What Newton added',
      body: `Kepler's three laws describe the Solar System, but they do not
             explain it. Kepler found them by fitting curves to Tycho's numbers
             over twenty years of arithmetic; he had no idea <em>why</em> orbits
             should be ellipses or why the periods should scale that way.
             \n\nSixty years later Newton derived all three from a single
             assumption: that gravity falls off as the inverse square of
             distance. The ellipse, the equal areas and the three-halves power
             law all drop out as consequences. And in deriving them he found the
             correction Kepler could not have known about:
             \n\n<em>P</em>² = 4π<sup>2</sup> <em>a</em>³ / <em>G</em>(<em>M</em> + <em>m</em>)
             \n\nKepler's version assumed the constant was the same for
             everything orbiting the Sun. Newton's shows it depends on the
             <strong>total</strong> mass. For a planet around a star the planet's
             own mass is negligible and the two agree, which is why Kepler's
             version worked. For two stars of comparable mass orbiting each
             other, it does not, and only Newton's form is right.
             \n\nThis is what turned a description of one solar system into a
             tool that works anywhere.`,
      tip: 'Rearranged for M, this equation is how essentially every stellar mass in the literature is measured.',
      setup: {
        scenario: 'TRAPPIST-1 System',
        seed: 'newton-lab',
        settings: { enable_asteroids: false, num_asteroids: 0, num_comets: 0 },
        // 6.2 units across at 100 per AU: the view has to come a long way in.
        camera: { zoom: 55, pan: { x: 0, y: 0 } },
        paused: false,
      },
    },
    {
      sid: 'the-same-laws-forty-light',
      bind: TRAPPIST_1,
      type: 'explore',
      allowInspector: true,
      showAreaSweep: true,
      title: 'The same laws, forty light years away',
      body: `On screen is TRAPPIST-1, a real red dwarf with seven planets, none
             of which Kepler could have imagined. It is a tenth of the Sun's mass
             and its planets orbit closer in than Mercury, so nothing about it
             resembles the system Kepler fitted.
             \n\nThe laws hold anyway. Click any planet and the equal-area
             wedges are drawn for its orbit; click another and they are redrawn
             for that one. Each planet's slices are equal to each other, and each
             planet has its own period, but every one of them satisfies the same
             <em>P</em> squared over <em>a</em> cubed, with the constant set by this star's mass
             rather than the Sun's.`,
      checklist: [
        'Click an inner planet and note its semi-major axis and period',
        'Click an outer planet and note that both are larger',
        'Write down a and P for whichever planet you want to use next',
        'Notice the periods are in days, not years: this system is very compact',
      ],
      probe: ctx => {
        const b = ctx.selected;
        if (!b) return [{ label: 'Click a planet', value: '-' }];
        const el = ctx.elements(b);
        if (!el || !el.bound)
          return [{ label: b.name || 'Body', value: 'no orbit' }];
        // Deliberately only the two raw measurements. The implied star mass was
        // listed here, which turned the next step into a copying exercise
        // rather than a calculation.
        return [
          { label: 'Selected', value: b.name || 'Planet', emphasis: true },
          {
            label: 'Semi-major axis a',
            value: ctx.distance(el.a),
            emphasis: true,
          },
          { label: 'Period P', value: ctx.time(el.period), emphasis: true },
          { label: 'Eccentricity e', value: el.e.toFixed(4) },
        ];
      },
    },
    {
      sid: 'weigh-trappist-1-yourself',
      bind: TRAPPIST_1,
      type: 'measure',
      title: 'Weigh TRAPPIST-1 yourself',
      body: `Pick any one of the seven planets, read its semi-major axis and
             period off the readout, and enter them below. The arithmetic is
             done for you one stage at a time, so you can see where the number
             comes from.
             \n\nWatch the units. The readout gives periods in <em>days</em>,
             and <em>M</em> = <em>a</em>³ / <em>P</em>² only returns solar masses when <em>P</em> is in
             <strong>years</strong> and a is in <strong>AU</strong>. Converting
             is the step that catches people.`,
      fields: [
        { id: 'w_name', label: 'Planet you are using', unit: '', kind: 'text' },
        { id: 'w_a', label: 'Semi-major axis a', unit: 'AU' },
        { id: 'w_Pd', label: 'Period P', unit: 'days' },
        {
          id: 'w_Py',
          label: 'Step 1: period in years (days / 365.25)',
          unit: 'yr',
          compute: v => v.w_Pd / 365.25,
          decimals: 5,
        },
        {
          id: 'w_a3',
          label: 'Step 2: <em>a</em> cubed',
          unit: 'AU cubed',
          compute: v => v.w_a ** 3,
          decimals: 8,
        },
        {
          id: 'w_P2',
          label: 'Step 3: <em>P</em> squared',
          unit: 'yr squared',
          compute: v => (v.w_Pd / 365.25) ** 2,
          decimals: 8,
        },
        {
          id: 'w_M',
          label: 'Step 4: star mass = <em>a</em>³ / <em>P</em>²',
          unit: 'M_sun',
          compute: v => v.w_a ** 3 / (v.w_Pd / 365.25) ** 2,
          decimals: 4,
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.w_a) || !Number.isFinite(v.w_Pd)) return null;
        if (v.w_a <= 0 || v.w_Pd <= 0) {
          return { level: 'error', message: 'Both values must be positive.' };
        }
        const TRUE_MASS = 0.0898;
        const M = v.w_a ** 3 / (v.w_Pd / 365.25) ** 2;
        if (!Number.isFinite(M)) return null;
        if (Math.abs(M - TRUE_MASS) <= 0.008) {
          return {
            level: 'ok',
            message: `${M.toFixed(4)} solar masses. That is TRAPPIST-1: the published value is 0.0898, one of the smallest stars known and barely above the limit for hydrogen fusion. You have weighed a star forty light years away from two numbers read off its planets. Try a different planet and you should get the same answer, because they all orbit the same mass.`,
          };
        }
        // Name the direction and diagnose from the *inputs* rather than from the
        // size of the miss. A semi-major axis entered in the wrong units and a
        // period entered in the wrong units both land far too high, so a
        // ratio-based guess names the wrong culprit half the time.
        const dir = M > TRUE_MASS ? 'too high' : 'too low';
        const off = M / TRUE_MASS;
        let hint = 'Check that a and P came from the same planet.';
        if (v.w_a > 0.5) {
          hint =
            'The semi-major axis looks too large. Every orbit here is under 0.07 AU, so the value should start 0.0 something.';
        } else if (v.w_Pd < 0.5) {
          hint =
            'The period looks too small for days. The readout gives days, and the shortest year in this system is about 1.5 of them.';
        } else if (v.w_Pd > 100) {
          hint =
            'The period looks too large for days. The longest year here is about 19 of them.';
        } else if (off > 3 || off < 0.33) {
          hint =
            'Out by more than a factor of three, which usually means a and P were read from different planets.';
        }
        return {
          level: 'warn',
          message: `That works out to ${M.toPrecision(3)} solar masses, which is <strong>${dir}</strong>. ${hint}`,
        };
      },
      probe: ctx => {
        const b = ctx.selected;
        if (!b) return [{ label: 'Click a planet to read it', value: '-' }];
        const el = ctx.elements(b);
        if (!el || !el.bound)
          return [{ label: b.name || 'Body', value: 'no orbit' }];
        return [
          { label: 'Selected', value: b.name || 'Planet', emphasis: true },
          { label: 'Semi-major axis a', value: ctx.distance(el.a) },
          { label: 'Period P', value: ctx.time(el.period) },
        ];
      },
    },
    {
      sid: 'weighing-another-star',
      bind: TRAPPIST_1,
      type: 'question',
      title: 'Weighing another star',
      kind: 'numeric',
      body: `Here is the payoff. Kepler-10 is a Sun-like star about 600 light
             years away with a planet 2.4 times Earth’s radius, Kepler-10c,
             discovered by [[transit|transit]].
             Its orbit has a semi-major axis of about 0.24 AU and a period of
             about 45 days, which is 0.123 years.
             \n\nUse Newton's form, taking the planet's mass as negligible:
             \n\n<em>M</em> = <em>a</em>³ / <em>P</em>²  (in solar masses, with <em>a</em> in AU and <em>P</em> in years)
             \n\n<strong>First,</strong> cube the distance: 0.24³ = 0.0138.
             \n\n<strong>Second,</strong> square the period: 0.123² = 0.0151.
             \n\n<strong>Third,</strong> divide.`,
      prompt: 'Mass of Kepler-10, in solar masses',
      unit: 'M_sun',
      answer: 0.91,
      tolerance: 0.12,
      expect: {
        dimension: 'mass',
        unit: 'M_sun',
        accept: ['M_sun', 'M_jup', 'M_earth', 'kg'],
      },
      misconceptions: [
        {
          id: 'periodInDays',
          // Using 45 days where the formula wants 0.123 years divides the mass
          // by 365.25² - a specific, checkable slip rather than a guess.
          equals: 0.91 / 365.25 ** 2,
          say: `The period has to be in years for this form of the law. Using 45
                days instead of 0.123 years divides the answer by 365.25².`,
        },
      ],
      hints: {
        concept: `Newton's version of the third law says the period and the
                  orbit size together tell you the mass of what is being
                  orbited. That is the whole reason it matters.`,
        method: `<em>M</em> = <em>a</em>³ / <em>P</em>², with <em>a</em> in AU and <em>P</em> in *years*. The period is given
                 in days as well as years — use the years.`,
      },
      worked: `<em>a</em> = 0.24, so <em>a</em>³ = 0.0138. <em>P</em> = 0.123 years, so <em>P</em>² = 0.01513.
               0.0138 / 0.01513 = 0.91 solar masses, within a few per cent of
               the published value.`,
      because:
        'About 0.91 solar masses, which is within a few percent of the published value of 0.91. You have just weighed a star 600 light years away using nothing but a distance, a period, and a relation Kepler found by fitting Mars. This is the standard method: essentially every stellar mass in the exoplanet literature comes from some version of this calculation.',
      feedback: {
        close:
          'Close. Check the cube and the square separately, and the rounding in each.',
        'wrong-unit':
          'The answer is out by a factor of 365, the days in a year. Put the period in years, not days.',
        'wrong-order-of-magnitude':
          'Out by powers of ten. Make sure the period is in years, not days: the days figure is far larger than the same time in years.',
        off: 'Work in three parts: <em>a</em> cubed, then <em>P</em> squared, then divide the first by the second.',
      },
    },
    {
      sid: 'where-kepler-s-version-breaks',
      bind: TRAPPIST_1,
      type: 'question',
      title: "Where Kepler's version breaks",
      kind: 'choice',
      body: `Newton's correction replaces Kepler's constant with one that
             depends on <em>M</em> + <em>m</em> rather than <em>M</em> alone.`,
      prompt: 'For which system does that correction matter most?',
      options: [
        'Earth orbiting the Sun',
        'A Jupiter-mass planet orbiting a Sun-like star',
        'Two white dwarfs of equal mass orbiting each other',
        'A spacecraft orbiting the Earth',
      ],
      answer: 2,
      because:
        "Two equal masses. There <em>m</em> = <em>M</em>, so <em>M</em> + <em>m</em> is twice what Kepler's version assumes and the predicted period is off by a factor of √2, about 41%. In the other three cases the orbiting body is a millionth to a thousandth of the central mass and the correction is invisible. It is exactly this term that lets astronomers measure the individual masses in a binary system rather than just their sum.",
    },
    {
      sid: 'where-this-leaves-you',
      bind: TRAPPIST_1,
      type: 'read',
      title: 'Where this leaves you',
      body: `The three laws are not three separate facts. One pull toward the
             star, weakening as the square of the distance, produces all of
             them, which is why they hold for TRAPPIST-1 as they do here. They
             describe a light body going round a much heavier one: when the two
             masses are close, as in a pair of stars, both move, and the period
             depends on their sum.`,
      tip: 'If you are submitting this for credit, press Finish to enter your name and download your lab report. Otherwise you can simply close the panel.',
    },
  ],
};

export default KEPLER;
