// =============================================================================
// Investigations: the guided lessons themselves
// -----------------------------------------------------------------------------
// Content only. No imports: every step that needs a live number gets a `ctx`
// handed to it by the engine, so this file stays a description of what is being
// taught rather than a piece of the simulation.
//
// A step is one screen in the panel. The shapes:
//
//   read      explanation, optionally with a scenario to set up
//   predict   commit to an outcome *before* running it: the point is the
//             commitment, so these are always recorded even when wrong
//   explore   free play, with a checklist of things to try
//   measure   record numbers read off the live probe
//   question  short answer, multiple choice, or numeric with a tolerance
//
// `setup` is a declarative state the engine applies through the same code path
// as a shared link, which means every step of every lesson is also a link that
// can be handed out on its own.
//
// On predict steps: interactive simulations only produce a measurable learning
// gain when the student commits to an answer first. Without that, they watch,
// see whatever happens, and remember having known it all along. Predict steps
// are therefore never optional and never graded on correctness.
//
// Two fields exist for the lesson browser rather than for the lesson:
//
//   thumbnail  the capture of the scenario the lesson opens in, borrowed from
//              images/scenarios/. Not a separate render: a card that shows the
//              system a student is about to be dropped into is telling the
//              truth, and it stays true when `npm run thumbnails` reruns.
//   series     lessons that build on each other. The position within a series
//              is derived from the order of INVESTIGATIONS, not written down,
//              so inserting a lesson renumbers the sequence by itself.
// =============================================================================

/** Format a number for display in a probe row. */
const fixed = (v, n = 3) => (Number.isFinite(v) ? v.toFixed(n) : '-');

// --- 1. Kepler's Laws ---------------------------------------------------------

const KEPLER = {
  id: 'keplers-laws',
  thumbnail: 'images/scenarios/keplers-2nd-law.webp',
  title: "Kepler's Laws",
  subtitle: 'Measure the shape, pacing and timing of real orbits',
  duration: '35-45 min',
  level: 'Introductory astronomy',
  lock: { placement: true, inspector: true },
  summary:
    'Work through all three of Kepler’s laws by measuring orbits rather than being shown them: find the focus of an ellipse, watch equal areas sweep out in equal times, and recover the three-halves power law by plotting it yourself.',
  objectives: [
    'State where the primary sits in an elliptical orbit, and support it with a measurement',
    'Explain why an orbiting body moves fastest at periapsis, in terms of angular momentum',
    'Measure the semi-major axis and period of several planets and show that P² ∝ a³',
    'Use the third law to predict an orbital period, and say what its constant depends on',
  ],
  steps: [
    {
      type: 'read',
      title: 'Eight minutes of arc',
      body: `For most of recorded history orbits were circles. When observations
             disagreed, astronomers added more circles: epicycles: until the
             model fit. Copernicus moved the Sun to the center but kept the
             circles, and his model was no more accurate than the one it
             replaced.
             \n\nWhat broke the circle was data. Tycho Brahe spent two decades
             measuring planetary positions to about one arcminute, the limit of
             what is possible without a telescope. When Johannes Kepler tried to
             fit Tycho's observations of Mars to a circular orbit, the best fit
             he could manage was off by eight arcminutes. He could have called
             that observational error and moved on. Instead he trusted Tycho's
             measurements over two thousand years of assumption, and spent years
             working out what curve would fit.
             \n\nThe answer was an ellipse, with the Sun not at its center.`,
      quote: {
        text: 'Because these eight minutes could not be ignored, they alone have led the way toward reforming the whole of astronomy.',
        by: 'Johannes Kepler, Astronomia Nova, 1609',
      },
      tip: 'While a lesson is running, clicking selects an object without opening the inspector card, and placing new objects is switched off so a stray click cannot alter the system you are measuring.',
      setup: {
        scenario: "Kepler's 2nd Law",
        seed: 'kepler-lab',
        camera: { zoom: 1.5, pan: { x: 0, y: 0 } },
        paused: false,
      },
    },
    {
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
             \n\nThe colored wedges fanning out behind the orange body are all
             equal in area. Watch them for a moment: near the star they are
             narrow and long, far away they are broad and short. That is
             Kepler's second law drawing itself, before you have measured
             anything.`,
      tip: 'Nothing needs selecting yet. If the wedges are not showing, press the reset button beside the progress bar to rebuild the system.',
    },
    {
      type: 'predict',
      title: 'Where is the star?',
      body: `An ellipse has a center and two foci. For a circle all three
             coincide; the more elongated the ellipse, the further the foci sit
             from the center.
             \n\nLook at the orange body's path and where the star sits inside
             it. Commit to an answer before measuring anything.`,
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
      type: 'read',
      title: 'The First Law, and the anatomy of an ellipse',
      body: `Kepler's <strong>first law</strong>: every planet moves on an
             ellipse, with the star at one focus.
             \n\nAn ellipse has two foci. Their defining property is that for
             any point on the curve, the distances to the two foci always add to
             the same total. The <em>semi-major axis</em> <strong>a</strong> is
             half the long diameter, and it is the orbit's size. The
             <em>eccentricity</em> <strong>e</strong> is its shape: the foci sit
             a distance a x e either side of the center, so e = 0 puts both foci
             at the center and gives a circle, while e approaching 1 stretches
             the ellipse into a sliver.
             \n\nThe second focus is the strange part. There is nothing there.
             No mass, no object, nothing to mark it. It is a purely geometric
             consequence of the inverse-square force.`,
      tip: 'Drag the slider on the next step to watch the foci separate as e grows.',
    },
    {
      type: 'ellipse',
      title: 'Change the shape',
      start: 0.017,
      body: `Drag the eccentricity slider in the panel beside this one. Each
             quantity is drawn in its own color, matching the key underneath.
             \n\n<strong>a</strong>, the semi-major axis, is half the long
             diameter and sets the orbit's <em>size</em>. It is held fixed on
             screen here so that only the shape changes.
             <strong>b</strong> is the semi-minor axis, half the short diameter.
             <strong>c = a x e</strong> is how far each focus sits from the
             center, so the eccentricity is just the fraction of a by which the
             star is off-center.
             \n\nThe two are tied together by b = a x sqrt(1 - e squared),
             which is why the ellipse gets shorter as it gets more eccentric
             while its length stays the same.
             \n\nNotice how little e has to grow before the star is visibly
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
          note: 'Mars, and the reason Kepler got there. At e = 0.093 the departure from a circle is just large enough to show up in naked-eye measurements accurate to an arcminute.',
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
      type: 'measure',
      title: 'Measure the two orbits',
      body: `Click the <strong>Circular Orbiter</strong> and read its values from
             the live readout, then click the <strong>Eccentric Orbiter</strong>
             and read its.
             \n\nEccentricity <em>e</em> runs from 0 for a perfect circle to
             just under 1 for a very elongated ellipse. For comparison: Earth is
             0.017, Mars is 0.093, Pluto is 0.249, and Halley's Comet is 0.967.`,
      fields: [
        { id: 'circ_e', label: 'Circular Orbiter: eccentricity e', unit: '' },
        { id: 'ecc_e', label: 'Eccentric Orbiter: eccentricity e', unit: '' },
        {
          id: 'ecc_peri',
          label: 'Eccentric Orbiter: closest approach',
          unit: 'AU',
        },
        {
          id: 'ecc_apo',
          label: 'Eccentric Orbiter: furthest distance',
          unit: 'AU',
        },
        {
          id: 'ecc_a',
          label: 'Semi-major axis from your two distances',
          unit: 'AU',
          compute: v => (v.ecc_peri + v.ecc_apo) / 2,
          decimals: 2,
        },
      ],
      validate: (v, ctx) => {
        if (!Number.isFinite(v.ecc_peri) || !Number.isFinite(v.ecc_apo)) {
          return null;
        }
        if (v.ecc_peri <= 0 || v.ecc_apo <= 0) {
          return {
            level: 'error',
            message: 'Distances have to be positive numbers.',
          };
        }
        if (v.ecc_peri > v.ecc_apo) {
          return {
            level: 'warn',
            message:
              'Closest approach is larger than furthest distance: these look swapped.',
          };
        }
        // The semi-major axis is the mean of the two extremes, so it is a free
        // check that the student read both off the same orbit.
        const body = ctx.find('Eccentric');
        const el = body && ctx.elements(body);
        if (!el) return null;
        const trueA = el.a * 0.01;
        const err = Math.abs((v.ecc_peri + v.ecc_apo) / 2 - trueA) / trueA;
        if (err < 0.1) {
          return {
            level: 'ok',
            message: `That averages to ${((v.ecc_peri + v.ecc_apo) / 2).toFixed(2)} AU, which matches the semi-major axis the simulation reports. The mean of the two extremes <em>is</em> a: that is what "semi-major axis" means.`,
          };
        }
        return {
          level: 'warn',
          message: `Your two distances average to ${((v.ecc_peri + v.ecc_apo) / 2).toFixed(2)} AU, but this orbit's semi-major axis is about ${trueA.toFixed(2)} AU. Check you read both values from the same body.`,
        };
      },
      probe: ctx => {
        const b = ctx.selected;
        if (!b) return [{ label: 'Click a planet to select it', value: '-' }];
        const el = ctx.elements(b);
        if (!el) return [{ label: b.name || 'Body', value: 'no orbit found' }];
        return [
          { label: 'Selected', value: b.name || 'Body', emphasis: true },
          { label: 'Eccentricity e', value: fixed(el.e, 3) },
          { label: 'Semi-major axis a', value: ctx.distance(el.a) },
          { label: 'Closest (periapsis)', value: ctx.distance(el.periapsis) },
          { label: 'Furthest (apoapsis)', value: ctx.distance(el.apoapsis) },
          { label: 'Current speed', value: ctx.speed(el.v) },
        ];
      },
    },
    {
      type: 'predict',
      title: 'Where does it move fastest?',
      body: `Kepler's second law says a line drawn from the star to the planet
             sweeps out equal areas in equal times. Think about what that forces
             the speed to do at different points on the orbit.`,
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
      type: 'explore',
      title: 'Watch it happen',
      body: `Let the simulation run and keep the eccentric planet selected. The
             live speed below changes continuously as it goes round, while the
             shape of the orbit does not change at all.`,
      checklist: [
        'Watch the speed reading as the planet swings past the star',
        'Watch it again at the far end of the orbit',
        'Note that the semi-major axis and eccentricity barely move: the orbit is fixed, only the position on it changes',
        'Notice the wedges: thin and long near the star, wide and short far away, but equal in area',
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
      type: 'wedges',
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
      type: 'measure',
      title: 'Fast and slow, in numbers',
      body: `Now put numbers on it. Press <strong>Space</strong> to pause and
             resume, and catch the planet at each end of its orbit.
             \n\nRecord its speed when it is <strong>closest</strong> to the
             star, then again when it is <strong>furthest</strong>. Watch the
             "Distance from star" reading to know when you are at each extreme: it reaches a minimum at closest approach and a maximum at the far
             end. The ratio is worked out for you.`,
      fields: [
        { id: 'v_peri', label: 'Speed at closest approach', unit: 'km/s' },
        { id: 'v_apo', label: 'Speed at furthest point', unit: 'km/s' },
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
        // Conservation of angular momentum at the two extremes, where velocity
        // is perpendicular to the radius, gives v_peri/v_apo = (1+e)/(1-e).
        const expected = (1 + el.e) / (1 - el.e);
        const ratio = v.v_peri / v.v_apo;
        const err = Math.abs(ratio - expected) / expected;
        if (err <= 0.15) {
          return {
            level: 'ok',
            message: `Your ratio of ${ratio.toFixed(2)} matches (1+e)/(1−e) = ${expected.toFixed(2)} for this orbit's eccentricity of ${el.e.toFixed(3)}. That relation falls straight out of angular momentum being conserved.`,
          };
        }
        if (ratio < 1.2) {
          return {
            level: 'warn',
            message: `A ratio of ${ratio.toFixed(2)} is close to 1, which would mean the planet barely changes speed, but this orbit has e = ${el.e.toFixed(3)}, so the ratio should be near ${expected.toFixed(2)}. You have probably caught it twice at similar distances. Pause when "Distance from star" is at its smallest, then again at its largest.`,
          };
        }
        return {
          level: 'warn',
          message: `Your ratio is ${ratio.toFixed(2)}, but for e = ${el.e.toFixed(3)} it should be about (1+e)/(1−e) = ${expected.toFixed(2)}. Double-check both readings: pausing a little before or after the true extreme is the usual cause.`,
        };
      },
      probe: ctx => {
        const b = ctx.selected;
        if (!b) return [{ label: 'Select a planet', value: '-' }];
        const el = ctx.elements(b);
        if (!el) return [{ label: b.name || 'Body', value: 'no orbit found' }];
        const nearPeri = Math.abs(el.r - el.periapsis) / el.periapsis < 0.03;
        const nearApo = Math.abs(el.r - el.apoapsis) / el.apoapsis < 0.03;
        return [
          {
            label: 'Distance from star',
            value: ctx.distance(el.r),
            emphasis: nearPeri || nearApo,
          },
          { label: 'Speed now', value: ctx.speed(el.v), emphasis: true },
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
      type: 'question',
      title: 'Why the speed changes',
      kind: 'short',
      body: `You have just measured a planet speeding up and slowing down on a
             fixed orbit, with nothing pushing it along and no fuel being burnt.
             Something is being traded, and something else is being conserved.`,
      prompt:
        'In one or two sentences, explain why the planet speeds up as it approaches the star. What quantity stays constant, and why does gravity not change it?',
      rubric:
        'Angular momentum L = m·v·r·sin(angle) is conserved because gravity is a central force: it acts along the line joining the two bodies and so exerts no torque about the star. As r falls, v must rise to keep the product constant. (Energy is also conserved, with potential converting to kinetic; either argument earns credit, but angular momentum is the one that gives the equal-areas rule directly.)',
    },
    {
      type: 'read',
      title: "Kepler's third law",
      body: `The first two laws describe a single orbit. The third relates
             <em>different</em> orbits to each other, and it took Kepler another
             decade to find: the square of the orbital period is proportional to
             the cube of the semi-major axis.
             \n\nWritten for a one-solar-mass star with <em>P</em> in years and
             <em>a</em> in AU, the constant is exactly 1, so the law reads
             simply P² = a³. Earth checks out trivially: 1² = 1³.
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
      type: 'measure',
      title: 'Measure four planets',
      body: `Click each planet in turn and record its semi-major axis and
             period. Choose four that are well spread out, because a narrow range
             of <em>a</em> cannot tell a power law apart from a straight line.
             \n\nThere is room for all eight planets, and the fitted line gets
             visibly better as you add them. Mercury, Earth, Jupiter and Saturn
             are reachable at the starting zoom; scroll out for Uranus and
             Neptune.
             \n\nIf the outer planets squash the inner ones into the corner of
             the plot, press <strong>Log axes</strong>. On a log-log plot a power
             law is a straight line whatever its exponent, and every planet gets
             the same amount of room.
             \n\nYour points appear on the plot as you type. Record what the
             simulation reports, not what you remember about the real Solar
             System.`,
      fields: [
        { id: 'p1_name', label: 'Planet 1: name', unit: '', kind: 'text' },
        { id: 'p1_a', label: 'Planet 1: a', unit: 'AU' },
        { id: 'p1_P', label: 'Planet 1: P', unit: 'yr' },
        { id: 'p2_name', label: 'Planet 2: name', unit: '', kind: 'text' },
        { id: 'p2_a', label: 'Planet 2: a', unit: 'AU' },
        { id: 'p2_P', label: 'Planet 2: P', unit: 'yr' },
        { id: 'p3_name', label: 'Planet 3: name', unit: '', kind: 'text' },
        { id: 'p3_a', label: 'Planet 3: a', unit: 'AU' },
        { id: 'p3_P', label: 'Planet 3: P', unit: 'yr' },
        { id: 'p4_name', label: 'Planet 4: name', unit: '', kind: 'text' },
        { id: 'p4_a', label: 'Planet 4: a', unit: 'AU' },
        { id: 'p4_P', label: 'Planet 4: P', unit: 'yr' },
        { id: 'p5_name', label: 'Planet 5: name', unit: '', kind: 'text' },
        { id: 'p5_a', label: 'Planet 5: a', unit: 'AU' },
        { id: 'p5_P', label: 'Planet 5: P', unit: 'yr' },
        { id: 'p6_name', label: 'Planet 6: name', unit: '', kind: 'text' },
        { id: 'p6_a', label: 'Planet 6: a', unit: 'AU' },
        { id: 'p6_P', label: 'Planet 6: P', unit: 'yr' },
        { id: 'p7_name', label: 'Planet 7: name', unit: '', kind: 'text' },
        { id: 'p7_a', label: 'Planet 7: a', unit: 'AU' },
        { id: 'p7_P', label: 'Planet 7: P', unit: 'yr' },
        { id: 'p8_name', label: 'Planet 8: name', unit: '', kind: 'text' },
        { id: 'p8_a', label: 'Planet 8: a', unit: 'AU' },
        { id: 'p8_P', label: 'Planet 8: P', unit: 'yr' },
      ],
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
               slope of that line is the constant in P² = k·a³.`,
      },
      validate: v => {
        const rows = [1, 2, 3, 4, 5, 6, 7, 8]
          .map(i => ({ a: v[`p${i}_a`], P: v[`p${i}_P`] }))
          .filter(r => Number.isFinite(r.a) && Number.isFinite(r.P));
        if (rows.length < 2) return null;
        if (rows.some(r => r.a <= 0 || r.P <= 0)) {
          return {
            level: 'error',
            message: 'Distances and periods must both be positive.',
          };
        }
        const ks = rows.map(r => (r.P * r.P) / (r.a * r.a * r.a));
        const spread =
          (Math.max(...ks) - Math.min(...ks)) /
          (ks.reduce((x, y) => x + y, 0) / ks.length);
        if (rows.length >= 3 && spread > 0.5) {
          return {
            level: 'warn',
            message: `Your P²/a³ values range from ${Math.min(...ks).toFixed(2)} to ${Math.max(...ks).toFixed(2)}. For planets around the same star they should all be close to each other. Check whether a period was read in days rather than years, or a distance mixed up between two planets.`,
          };
        }
        if (rows.length >= 3) {
          return {
            level: 'ok',
            message: `All ${rows.length} of your P²/a³ values agree to within ${(spread * 100).toFixed(0)}%. That constancy across planets of wildly different sizes is Kepler's third law. Add more planets and watch the fitted line tighten.`,
          };
        }
        return null;
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
          label: 'Step 1: a³',
          unit: 'AU³',
          compute: v => v.k_a ** 3,
          decimals: 3,
        },
        {
          id: 'k_P2',
          label: 'Step 2: P²',
          unit: 'yr²',
          compute: v => v.k_P ** 2,
          decimals: 3,
        },
        {
          id: 'k_ratio',
          label: 'Step 3: P² ÷ a³',
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
            message: `P² ÷ a³ = ${k.toFixed(3)}, which is 1 within your reading error. The star here is exactly one solar mass, and in years and AU that makes the constant exactly 1, so this is the check working, not a coincidence.`,
          };
        }
        if (k > 100 || k < 0.01) {
          return {
            level: 'warn',
            message: `P² ÷ a³ comes out as ${k.toExponential(2)}, which is far from 1. That size of error almost always means a unit slip: a period entered in days instead of years, or a distance in simulation units rather than AU. Check the readout labels.`,
          };
        }
        return {
          level: 'warn',
          message: `P² ÷ a³ = ${k.toFixed(3)}, where it should be close to 1 for a one-solar-mass star. Re-read a and P for the same planet and check you have not mixed rows.`,
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
      type: 'question',
      title: 'Use the law',
      kind: 'numeric',
      body: `The real test of a law is whether it predicts something you have
             not measured.
             \n\nSuppose a ninth planet orbited this same star at a semi-major
             axis of exactly 4 AU, out between Mars and Jupiter. Nobody has
             measured its period, because it does not exist. Work it out anyway.
             \n\n<strong>Step 1.</strong> You know P² = a³, and you know
             a = 4 AU.
             \n\n<strong>Step 2.</strong> Cube the distance:
             a³ = 4 × 4 × 4 = 64. So P² = 64.
             \n\n<strong>Step 3.</strong> You have P squared, but the question
             asks for P. Undo the square by taking the square root: P = √64.
             \n\nWhat is that?`,
      prompt: 'Orbital period of a planet at a = 4 AU',
      unit: 'years',
      answer: 8,
      tolerance: 0.4,
      because:
        "P = 8 years. Now try it on a planet you did measure: Jupiter sits at 5.204 AU, so a³ = 141.0 and P = √141.0 = 11.87 years. The table says 11.86. You have just predicted a real planet's year from nothing but its distance.",
    },
    {
      type: 'question',
      title: 'What the constant depends on',
      kind: 'choice',
      body: `Your four planets had wildly different masses: from a small rocky
             world to a gas giant hundreds of times heavier, and all gave the
             same P²/a³.`,
      prompt: 'The constant in P² = k·a³ depends on…',
      options: [
        'the mass of the planet',
        'the mass of the star',
        'the eccentricity of the orbit',
        'nothing: it is the same everywhere in the universe',
      ],
      answer: 1,
      because:
        'It depends on the central mass: Newton showed k = 4π²/G(M+m), and since M ≫ m for a planet the planet’s own mass drops out. Read backwards, this is a way to weigh things you can never visit. Measure a period and a distance, and the mass falls out. It is how the Sun was first weighed, how exoplanet host stars are weighed today, and how the four-million-solar-mass black hole at the center of the Milky Way was weighed by tracking the star S2 through a sixteen-year orbit.',
    },
    {
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
             \n\nP² = 4π² a³ / G(M + m)
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
        // The system is 6.2 units across at 100 units per AU, so the view has
        // to come a long way in.
        camera: { zoom: 55, pan: { x: 0, y: 0 } },
        paused: false,
      },
    },
    {
      type: 'explore',
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
             P squared over a cubed, with the constant set by this star's mass
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
      type: 'measure',
      title: 'Weigh TRAPPIST-1 yourself',
      body: `Pick any one of the seven planets, read its semi-major axis and
             period off the readout, and enter them below. The arithmetic is
             done for you one stage at a time, so you can see where the number
             comes from.
             \n\nWatch the units. The readout gives periods in <em>days</em>,
             and M = a cubed / P squared only returns solar masses when P is in
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
          label: 'Step 2: a cubed',
          unit: 'AU cubed',
          compute: v => v.w_a ** 3,
          decimals: 8,
        },
        {
          id: 'w_P2',
          label: 'Step 3: P squared',
          unit: 'yr squared',
          compute: v => (v.w_Pd / 365.25) ** 2,
          decimals: 8,
        },
        {
          id: 'w_M',
          label: 'Step 4: star mass = a cubed / P squared',
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
      type: 'question',
      title: 'Weighing another star',
      kind: 'numeric',
      body: `Here is the payoff. Kepler-10 is a Sun-like star about 600 light
             years away with a rocky planet, Kepler-10c, discovered by transit.
             Its orbit has a semi-major axis of about 0.24 AU and a period of
             about 45 days, which is 0.123 years.
             \n\nUse Newton's form, taking the planet's mass as negligible:
             \n\nM = a³ / P²  (in solar masses, with a in AU and P in years)
             \n\n<strong>Step 1.</strong> Cube the distance: 0.24³ = 0.0138.
             \n\n<strong>Step 2.</strong> Square the period: 0.123² = 0.0151.
             \n\n<strong>Step 3.</strong> Divide.`,
      prompt: 'Mass of Kepler-10, in solar masses',
      unit: 'M_sun',
      answer: 0.91,
      tolerance: 0.12,
      because:
        'About 0.91 solar masses, which is within a few percent of the published value of 0.91. You have just weighed a star 600 light years away using nothing but a distance, a period, and a relation Kepler found by fitting Mars. This is the standard method: essentially every stellar mass in the exoplanet literature comes from some version of this calculation.',
    },
    {
      type: 'question',
      title: "Where Kepler's version breaks",
      kind: 'choice',
      body: `Newton's correction replaces Kepler's constant with one that
             depends on M + m rather than M alone.`,
      prompt: 'For which system does that correction matter most?',
      options: [
        'Earth orbiting the Sun',
        'A Jupiter-mass planet orbiting a Sun-like star',
        'Two white dwarfs of equal mass orbiting each other',
        'A spacecraft orbiting the Earth',
      ],
      answer: 2,
      because:
        "Two equal masses. There m = M, so M + m is twice what Kepler's version assumes and the predicted period is off by a factor of √2, about 41%. In the other three cases the orbiting body is a millionth to a thousandth of the central mass and the correction is invisible. It is exactly this term that lets astronomers measure the individual masses in a binary system rather than just their sum.",
    },
    {
      type: 'read',
      title: 'Where this leaves you',
      body: `You have measured the shape of an orbit, watched a planet trade
             speed for distance while conserving angular momentum, and recovered
             a power law from eight measurements you took yourself. Then you used
             it to weigh a star you will never visit.
             \n\nEverything here came out of naked-eye positions recorded before
             the telescope existed, by an observer who refused to round away eight
             minutes of arc.`,
      tip: 'If you are submitting this for credit, press Next once more to enter your name and download your lab report. Otherwise you can simply close the panel.',
    },
  ],
};

// --- 2. Transit photometry ----------------------------------------------------

const TRANSIT_LAB = {
  scenario: 'Transit Lab',
  seed: 'transit-lab',
  camera: { zoom: 60, pan: { x: 0, y: 0 } },
  paused: false,
};

/**
 * What the recorded light curve says.
 *
 * A transit of this system goes past in half a second of wall clock, so asking
 * a student to read a value off the screen at the right instant measures their
 * reflexes rather than their understanding. The panel finds the transits in the
 * recording instead, which is also how the measurement is really made.
 */
const photometry = ctx => {
  const a = ctx.photometry();
  const rows = [
    { label: 'Baseline, out of transit', value: a.baseline.toFixed(6) },
    { label: 'Complete transits recorded', value: String(a.seen) },
  ];
  if (a.last) {
    rows.push({
      label: `Transit ${a.last.seq}: bottom`,
      value: a.last.bottom.toFixed(6),
      emphasis: true,
    });
    rows.push({
      label: `Transit ${a.last.seq}: mid-time`,
      value: `${a.last.mid.toFixed(4)} days`,
    });
  } else {
    rows.push({ label: 'Waiting for a complete transit', value: '...' });
  }
  rows.push({ label: 'Clock', value: `${ctx.days().toFixed(4)} days` });
  return rows;
};

/** The last few transit times, for the step that measures a period. */
const timing = ctx => {
  const a = ctx.photometry();
  const rows = [
    {
      label: 'Complete transits recorded',
      value: String(a.seen),
      emphasis: true,
    },
  ];
  const recent = a.log.slice(-4);
  if (!recent.length) {
    rows.push({ label: 'Waiting for a complete transit', value: '...' });
  }
  for (const t of recent) {
    rows.push({ label: `Transit ${t.seq}`, value: `${t.mid.toFixed(4)} days` });
  }
  rows.push({ label: 'Clock', value: `${ctx.days().toFixed(4)} days` });
  return rows;
};

const TRANSITS = {
  id: 'transit-photometry',
  thumbnail: 'images/scenarios/transit-lab.webp',
  series: 'Detecting exoplanets',
  title: 'Finding Planets by Their Shadows',
  subtitle:
    'Measure a transit, weigh what it tells you, and find what is hiding',
  duration: '50-70 min',
  level: 'Introductory astronomy',
  lock: { placement: true, inspector: true },
  summary:
    'Work through the transit method from first principles on HD 209458 b, the first planet ever caught crossing its star: measure a depth and turn it into a radius, correct it for limb darkening, time two transits to get a period, read an atmosphere out of the color of the dip, and finish by finding the hidden companion star that makes the planet look smaller than it is.',
  objectives: [
    'Explain why almost every known exoplanet was found indirectly, and what each method actually measures',
    'Derive the relation between transit depth and radius ratio, and use it on a measured light curve',
    'Account for limb darkening when turning a measured depth into a planet radius',
    'Time successive transits to recover an orbital period, and use it to find the orbit',
    'Explain what a transmission spectrum measures and why the depth changes with wavelength',
    'Correct a transit depth for light from an unresolved companion star, and say why that matters to a whole survey',
  ],
  steps: [
    {
      type: 'read',
      title: 'A firefly beside a lighthouse',
      body: `There are more than six thousand confirmed planets around other
             stars. Fewer than a hundred have ever been photographed.
             \n\nThe problem is not that they are far away, it is that they sit
             next to something overwhelmingly brighter. Seen from thirty light
             years, Jupiter is about a billion times fainter than the Sun and
             sits half an arcsecond away from it: the angle a coin subtends
             from four kilometers. Every telescope spreads a point of light out
             into a small blur, and the star's blur is a billion times taller
             than the planet is. Direct imaging works only in the rare corner of
             parameter space where the planet is young enough to still glow with
             its own heat, massive enough to glow brightly, and far enough out to
             be clear of the glare: a young, enormous world on a wide orbit. That
             is not what most planets are.
             \n\nSo we look for the star instead. A planet cannot hide what it
             does to its host: it pulls the star around, it bends the light of
             stars behind it, and, if the geometry is right, it passes in front
             of it and blocks some light. All three are measurements of the
             <em>star</em>, and stars are bright and easy.
             \n\nOn screen is <strong>HD 209458</strong>, a slightly hotter and
             more massive relative of the Sun about 160 light years away in
             Pegasus, with a planet on a three and a half day orbit. The star and
             the planet are drawn at their true relative sizes, which is why the
             view is zoomed so far in.`,
      tip: 'Everything in this lesson is measurable from what is on screen. Clicking selects an object without opening the inspector card, and placing new objects is switched off so a stray click cannot alter the system you are measuring.',
      setup: TRANSIT_LAB,
    },
    {
      type: 'read',
      title: 'Five ways to find a planet you cannot see',
      body: `<strong>Radial velocity.</strong> A planet and its star both orbit
             their common center of mass, so the star wobbles, and the wobble
             shifts its spectral lines blue then red. Jupiter moves the Sun at
             12.5 m/s; the Earth manages 9 cm/s. This is how the first planet
             around a normal star was found: Michel Mayor and Didier Queloz
             announced 51 Pegasi b in 1995, a Jupiter-mass world on a four-day
             orbit that nobody's theory of planet formation had allowed for. It
             won them a share of the 2019 Nobel Prize. Radial velocity measures a
             minimum mass, because an orbit seen face-on produces no shift at
             all.
             \n\n<strong>Transits.</strong> If the orbit happens to be edge-on to
             us, the planet crosses the stellar disk and the star dims by a fixed
             fraction, once per orbit, forever. This measures a radius. It is by
             far the most productive method, and it is the one you are about to
             do.
             \n\n<strong>Microlensing.</strong> When one star passes in front of
             another, its gravity focuses the background star's light. A planet
             adds a brief extra spike. This finds planets thousands of light years
             away, including cold ones beyond the snow line, but each event
             happens once and never repeats.
             \n\n<strong>Astrometry.</strong> The same wobble as radial velocity,
             measured as a position on the sky rather than a Doppler shift. Gaia
             has the precision to do this at scale and is beginning to deliver.
             \n\n<strong>Direct imaging.</strong> Blocking the starlight with a
             coronagraph and photographing the planet itself. Rare, difficult, and
             the only method that gets you a photon that actually came from the
             planet.
             \n\nNotice what is missing from all of them except the last: nobody
             has seen the planet. Everything is inferred from an effect on
             something else, and every inference carries assumptions that can be
             wrong. Keeping track of which is which is most of the skill.`,
      tip: 'Radial velocity gives a mass, transits give a radius. Neither gives both, which is why the two together are worth far more than either alone.',
    },
    {
      type: 'predict',
      title: 'What will the brightness do?',
      body: `The planet is about to cross in front of the star from your point of
             view. In a moment you will open a photometer and watch. Commit to an
             answer first.`,
      prompt:
        'While the planet crosses the star, the measured brightness will…',
      options: [
        'rise, because the planet reflects extra light towards us',
        'drop by a small amount, then recover',
        'drop to zero until the planet has passed',
        'stay flat: the planet is far too small to matter',
      ],
      answer: 1,
      because:
        'It drops by a small amount and recovers. The planet blocks a fraction of the star’s disk equal to the ratio of their areas, and even a Jupiter in front of a Sun-like star only covers about 1% of it. Everything in this lesson follows from that one number being small but perfectly measurable.',
    },
    {
      type: 'explore',
      title: 'Your first transit',
      body: `The <strong>Light Curve</strong> panel has opened on the right. It
             plots the total brightness of everything in view against time,
             exactly what a photometer on a telescope records, and nothing else:
             no image, no positions, one number per moment.
             \n\nThe planet goes around once every 13 seconds or so of your
             time, and the transit itself is over in half a second. That ratio is
             real: the transit occupies 4% of the orbit, or three and a half hours
             out of a three and a half day year. It goes past too quickly to
             watch closely, which is exactly the situation a real observer is in
             and exactly why the measurement is made on the recording afterwards.
             The curve keeps every dip that has gone past.
             \n\nThe <em>observer angle</em> control rotates your vantage point
             around the system. Try it: the transits move to a different moment
             but they never stop happening, because this simulation runs in a
             single plane and every orbit in it is edge-on. Real orbits are
             tilted, and that changes everything: you will come back to it.`,
      lightCurve: true,
      observerAngle: 0,
      checklist: [
        'Wait until at least two dips are on the plot',
        'Hover over the flat part of the curve and read the value in the tooltip',
        'Hover over the bottom of a dip and read that value too',
        'Move the observer angle and confirm the dips shift but do not disappear',
        'Notice the very slight rise and fall of the baseline between transits',
      ],
      tip: 'That slow baseline ripple is the planet’s phase curve: like the Moon, it shows us more or less of its lit side as it goes round. It is a real signal, roughly a hundred times smaller than the transit, and space telescopes measure it.',
      probe: photometry,
    },
    {
      type: 'read',
      title: 'Where the depth comes from',
      body: `A star is, to a photometer, a uniformly bright disk of radius
             R<sub>★</sub> and area πR<sub>★</sub><sup>2</sup>. A planet in front
             of it is an opaque disk of radius R<sub>p</sub> and area
             πR<sub>p</sub><sup>2</sup>, and it blocks exactly its own area.
             \n\nThe fractional drop in brightness, the <strong>transit
             depth</strong>, is therefore the ratio of the two areas:
             \n\n<strong>δ = πR<sub>p</sub><sup>2</sup> / πR<sub>★</sub><sup>2</sup>
             = (R<sub>p</sub> / R<sub>★</sub>)<sup>2</sup></strong>
             \n\nThe π cancels, the distance to the star cancels, the star's
             luminosity cancels, and the planet's own brightness is negligible.
             What survives is a pure ratio of sizes. Turn it around and the
             measurement you want falls straight out:
             \n\n<strong>R<sub>p</sub> / R<sub>★</sub> = √δ</strong>
             \n\nThat is the whole method in one line. It also tells you what the
             method cannot do: a transit gives you the planet's size <em>relative
             to the star</em>. To get a planet radius in kilometers you need to
             know the star, which is why a great deal of exoplanet work is
             actually stellar astrophysics.`,
      tip: 'The ratio is usually written k, and it is the single most important number in a transit fit.',
    },
    {
      type: 'explore',
      title: 'Try it on some real planets',
      body: `The instrument on the right draws the silhouette to scale on the
             left and the transit it produces on the right, on a fixed vertical
             scale so that changes read as changes.
             \n\nWork through the presets. The lesson is in the two extremes: an
             Earth in front of the Sun is 84 parts per million, a depth that took
             a dedicated space telescope to reach, while the same Earth in front
             of TRAPPIST-1 is nearly 1%, easily within reach of a small ground
             telescope. Nothing about the planet changed. The star did.`,
      tool: { id: 'depth-size' },
      lightCurve: false,
      checklist: [
        'Find the depth of an Earth in front of the Sun',
        'Find the depth of a Jupiter in front of the Sun',
        'Put an Earth in front of TRAPPIST-1 and compare',
        'Shrink the star and watch the depth climb as 1 / R★²',
        'Convince yourself that doubling the planet radius quadruples the depth',
      ],
      tip: 'This is why the search for small planets moved to small stars. Chasing an Earth around a Sun-like star costs you a space mission; chasing one around an M dwarf is a hundred times easier in signal and can be done from the ground.',
    },
    {
      type: 'question',
      title: 'From a depth to a size',
      kind: 'numeric',
      body: `Suppose a survey reports a clean, repeating 1% dip:
             δ = 0.0100.`,
      prompt: 'What is R<sub>p</sub> / R<sub>★</sub> for a 1% dip?',
      unit: '',
      answer: 0.1,
      tolerance: 0.015,
      because:
        'The square root of 0.01 is 0.1: the planet is a tenth of the star’s radius. Around a Sun-like star that is roughly Jupiter-sized, which is exactly why every transiting planet found before about 2005 was a hot Jupiter. They were the only ones anybody could see.',
    },
    {
      type: 'measure',
      title: 'Measure the dip',
      body: `Now do it for real, on the curve you have been watching.
             \n\nYou need two numbers: the brightness on the flat stretch
             between transits, and the brightness at the bottom of a dip.
             \n\nThe panel is already finding them. It takes the baseline as
             the level the star sits at for nearly all of its orbit, and it
             measures the bottom of every complete dip that has gone past. Wait
             until the readout below shows at least one transit, then press the
             button to copy both numbers in. If you would rather read them
             yourself, hover the pointer over the light curve and it reports the
             value under it to six decimal places.
             \n\nThe depth and the radius ratio are worked out from what you
             enter, so a slipped decimal point in your arithmetic cannot be
             mistaken for a misunderstanding of the physics.`,
      lightCurve: true,
      importLabel: 'Copy the last transit',
      importFromSelection: ctx => {
        const a = ctx.photometry();
        return a.last
          ? [a.baseline.toFixed(6), a.last.bottom.toFixed(6)]
          : null;
      },
      importGroups: [['base', 'bot']],
      fields: [
        {
          id: 'base',
          label: 'Brightness outside transit',
          unit: '',
          hint: 'e.g. 1.000065',
        },
        { id: 'bot', label: 'Brightness at the bottom of the dip', unit: '' },
        {
          id: 'depth',
          label: 'Transit depth δ = baseline − bottom',
          unit: '',
          decimals: 5,
          compute: v => v.base - v.bot,
        },
        {
          id: 'k_naive',
          label: 'Radius ratio R<sub>p</sub> / R<sub>★</sub> = √(δ)',
          unit: '',
          decimals: 4,
          compute: v => Math.sqrt(v.base - v.bot),
        },
      ],
      validate: v => {
        const d = v.base - v.bot;
        if (!Number.isFinite(d)) return null;
        if (d <= 0) {
          return {
            level: 'error',
            message:
              'The bottom of a transit sits <em>below</em> the baseline, so the depth has to come out positive. Check that you have not swapped the two.',
          };
        }
        if (d > 0.2) {
          return {
            level: 'error',
            message:
              'A 20% dip would be a stellar eclipse, not a planet. If you entered numbers like 98.2 and 100, enter the brightness itself rather than a percentage of it.',
          };
        }
        if (d < 0.005) {
          return {
            level: 'warn',
            message:
              'That is shallower than this system can produce. Make sure the bottom value really is from the lowest point of a dip and not from the shoulder on the way in.',
          };
        }
        if (d > 0.014 && d < 0.024) {
          return {
            level: 'ok',
            message:
              'Good: about 1.8%, giving a radius ratio near 0.135. Hold on to that number, because the next step is going to tell you it is about 10% too big, and why.',
          };
        }
        return {
          level: 'warn',
          message:
            'Expected somewhere near 0.018 for this system. Read the baseline from a flat stretch well away from any dip, and the bottom from the lowest point of one.',
        };
      },
      probe: photometry,
      tip: 'A real light curve is noisy, and nobody reads the bottom off it by eye: you fit a model transit to every point at once, which is how the precision ends up better than any single measurement in it. What the panel does here is the same idea with the noise left out.',
    },
    {
      type: 'read',
      title: 'Why that radius came out too big',
      body: `A star is not a uniformly bright disk. You are looking down through
             a partly transparent atmosphere, and at the center of the disk you
             see straight down into hot, bright layers, while near the edge your
             line of sight slants and stops in cooler, dimmer ones. The disk is
             brightest in the middle and fades towards the rim. This is
             <strong>limb darkening</strong>, and it is visible in any decent
             photograph of the Sun.
             \n\nSo a planet crossing the middle of the disk covers brighter than
             average light, and the dip at mid-transit is deeper than the plain
             area ratio predicts. For the coefficients used here, the center of
             the disk is <strong>1.215</strong> times as bright as the disk
             average, so:
             \n\n<strong>δ<sub>measured</sub> = 1.215 × (R<sub>p</sub> /
             R<sub>★</sub>)<sup>2</sup></strong>
             \n\nTaking the square root of your measured depth therefore
             overestimates the radius ratio by √1.215 = 1.102, about 10%. On a
             planet near a classification boundary, 10% is the difference between
             two different answers about what the world is made of.
             \n\nThis is not a quirk of the simulation. It is why nobody in the
             field reports √δ as a radius ratio: a real transit fit solves for the
             radius ratio, the limb-darkening coefficients, the impact parameter
             and the orbit together, because they are all tangled up in the same
             curve.`,
      figure: {
        src: 'images/transit-of-venus-2012.jpg',
        alt: 'The Sun photographed in white light. Its disk is noticeably brighter in the middle and fades towards the rim. The small, hard-edged black disk of Venus sits near the upper right edge, and several sunspots are scattered across the middle.',
        caption: `Venus crossing the Sun on 5 June 2012, photographed from San
                  Francisco. This is the same measurement you have been making,
                  on the one star close enough to resolve. The
                  <strong>limb darkening</strong> is plain: the middle of the
                  disk is visibly brighter than the rim, and Venus happens to be
                  crossing near the edge, where the star is dimmer. Venus is
                  0.0087 of the Sun's radius, so it blocks about 76 parts per
                  million: almost exactly what an Earth transiting a Sun-like
                  star would give an observer somewhere else. The dark specks
                  across the middle are sunspots, and they are the reason real
                  transit photometry has to contend with a star that does not
                  hold still.`,
        author: 'Brocken Inaglory',
        source:
          'https://commons.wikimedia.org/wiki/File:2012_Transit_of_Venus_from_SF.jpg',
        license: 'CC BY 2.5',
        licenseUrl: 'https://creativecommons.org/licenses/by/2.5/',
        changes: 'resized',
      },
      tip: 'Limb darkening is wavelength dependent, and it is much weaker in the infrared. That is one reason precise radius measurements are usually made in the red or the infrared rather than in blue light.',
    },
    {
      type: 'measure',
      title: 'Correct it, and get a real radius',
      body: `Divide out the limb darkening, then convert the ratio into a size.
             \n\nHD 209458 is a well-studied star. Spectroscopy and its distance
             from Gaia give a radius of <strong>1.155 R<sub>☉</sub></strong>,
             which is the number the transit depth has to be multiplied by. Enter
             your measured depth and the star's radius; the rest is arithmetic.`,
      fields: [
        {
          id: 'd2',
          label: 'Depth you measured',
          unit: '',
          hint: 'from the previous step',
        },
        {
          id: 'rstar',
          label: 'Star radius R<sub>★</sub>',
          unit: 'R☉',
          hint: '1.155',
        },
        {
          id: 'k_true',
          label: 'Corrected ratio √(δ / 1.215)',
          unit: '',
          decimals: 4,
          compute: v => Math.sqrt(v.d2 / 1.2146),
        },
        {
          id: 'rp_rj',
          label: 'Planet radius',
          unit: 'R_Jupiter',
          decimals: 3,
          compute: v => Math.sqrt(v.d2 / 1.2146) * v.rstar * 9.7311,
        },
        {
          id: 'rp_re',
          label: 'The same radius',
          unit: 'R⊕',
          decimals: 2,
          compute: v => Math.sqrt(v.d2 / 1.2146) * v.rstar * 109.198,
        },
      ],
      validate: v => {
        const rj = Math.sqrt(v.d2 / 1.2146) * v.rstar * 9.7311;
        if (!Number.isFinite(rj)) return null;
        if (v.rstar > 50) {
          return {
            level: 'error',
            message:
              'The star radius goes in solar radii, not in kilometers or in Jupiters. HD 209458 is 1.155 R☉.',
          };
        }
        if (v.d2 > 1) {
          return {
            level: 'error',
            message:
              'The depth is a fraction, not a percentage: 1.8% goes in as 0.018.',
          };
        }
        if (rj > 1.15 && rj < 1.65) {
          return {
            level: 'ok',
            message:
              'That is it: about 1.38 Jupiter radii, or 15.5 Earth radii. The published value from a decade of Hubble transits is 1.38 R_Jupiter. You just measured a planet 160 light years away by watching a star get slightly dimmer.',
          };
        }
        if (rj > 1.65) {
          return {
            level: 'warn',
            message:
              'Too large. Check that you divided the depth by 1.215 before taking the square root rather than after, and that the depth is the one you measured rather than a percentage.',
          };
        }
        return {
          level: 'warn',
          message:
            'Too small. The most common cause is reading the bottom of the dip from the ingress shoulder rather than the lowest point.',
        };
      },
      tip: 'A radius of 1.38 R_Jupiter with a mass of only 0.69 M_Jupiter makes this planet less dense than water. Hot Jupiters are inflated by the heat they absorb, and explaining exactly how is still an open problem.',
    },
    {
      type: 'read',
      title: 'The shape of the dip',
      body: `A transit is not a step function. It has four contact points, and
             the shape between them carries information.
             \n\n<strong>Ingress</strong> begins when the planet's leading edge
             first touches the stellar disk and ends when its trailing edge has
             fully crossed onto it. During that interval the blocked area climbs
             from nothing to its full value. Ingress lasts roughly
             2R<sub>p</sub>/2R<sub>★</sub> of the whole event, so the steepness of
             the shoulders is itself a measurement of the radius ratio,
             independent of the depth.
             \n\nThe <strong>floor</strong> between second and third contact is
             where the planet is entirely on the disk. It is not flat: limb
             darkening curves it, deepest at mid-transit where the planet covers
             the brightest part of the star.
             \n\n<strong>Egress</strong> mirrors ingress.
             \n\nThe <strong>total duration</strong> depends on how fast the planet
             is moving and how long a chord it cuts across the disk. Combine the
             duration with the period and you can extract the density of the
             star, without ever resolving it. That trick, called asterodensity
             profiling, is one of the reasons transit surveys turned out to be
             useful for stellar astrophysics as well.`,
    },
    {
      type: 'question',
      title: 'Reading the floor',
      kind: 'choice',
      body: `Look closely at a dip on the light curve. The bottom is not flat: it
             curves gently, deepest in the middle.`,
      prompt: 'The rounded floor of the transit is caused by…',
      options: [
        'the planet slowing down as it crosses',
        'limb darkening: the star is brighter at its center than at its edge',
        'the planet’s atmosphere leaking light through',
        'noise in the measurement',
      ],
      answer: 1,
      because:
        'Limb darkening. You see deeper, hotter layers at the center of the stellar disk and cooler, dimmer layers near the edge, so the planet blocks more light mid-transit than just after ingress. It is also exactly the effect you divided out two steps ago.',
    },
    {
      type: 'explore',
      title: 'The angle you happen to be standing at',
      body: `Everything so far assumed the planet crosses the middle of the star.
             Real orbits are tilted, and the tilt is set by how the system happens
             to be oriented relative to Earth: nothing about the planet, entirely
             about us.
             \n\nThe <strong>impact parameter</strong> b is how far from the
             center of the disk the planet's path passes, in units of the stellar
             radius. b = 0 is dead center. b = 1 clips the limb. Above about
             b = 1 + k the planet misses the star altogether and there is no
             transit at all, however patiently you watch.
             \n\nSlide it and watch three things change at once: the transit gets
             shorter, the floor loses its flat section and becomes a V, and the
             depth drops because the planet is now covering the dim limb rather
             than the bright center. All three are why a fit that ignores the
             impact parameter gets the radius wrong.`,
      tool: { id: 'geometry' },
      lightCurve: false,
      checklist: [
        'Start at b = 0 and note the duration and depth',
        'Raise b to 0.9 and watch the flat floor turn into a V',
        'Find the value of b where the transit disappears entirely',
        'Load the Earth-around-the-Sun preset and read off the transit probability',
        'Shrink a / R★ and watch the probability climb',
      ],
      tip: 'The simulation runs in a plane, so every orbit in it has b = 0 and transits. That is a limitation of a two-dimensional sandbox, not a claim about the sky. This instrument is where the third dimension lives.',
    },
    {
      type: 'question',
      title: 'How lucky do you have to be?',
      kind: 'numeric',
      body: `For a randomly oriented orbit, the chance that it happens to be
             edge-on enough to transit is very close to
             R<sub>★</sub> / a: the star's radius divided by the size of the
             orbit.
             \n\nThe Sun's radius is 0.00465 AU. The Earth orbits at 1 AU.`,
      prompt:
        'An alien astronomer picks a random direction to look at the Sun from. Roughly one chance in how many that they see the Earth transit?',
      unit: 'to one',
      answer: 215,
      tolerance: 40,
      because:
        'R★/a = 0.00465, or about 1 in 215. That is the single hardest fact about the transit method: even a survey with perfect photometry watching every star in the sky forever would find fewer than one in two hundred of the Earth-like planets out there. Everything the method reports about how common planets are has to be divided by this geometric factor before it means anything.',
    },
    {
      type: 'question',
      title: 'What the method misses',
      kind: 'short',
      body: `You have now seen both halves of the problem: the geometry has to be
             right, and the signal has to be big enough to detect.`,
      prompt:
        'A transit survey reports that hot Jupiters are far more common than Jupiters on wide orbits. Give two separate reasons this survey would say that even if it were not true.',
      rubric:
        'Two biases should appear. (1) Geometric: transit probability goes as R★/a, so a planet at 0.05 AU is twenty times more likely to transit than one at 1 AU and four hundred times more likely than one at 20 AU. (2) Detection: a survey has to see several transits to confirm a period, so a planet with a long period either falls outside the observing baseline or gives too few events; short periods produce hundreds of transits that can be stacked. Credit also for depth bias, since large planets give deeper dips and are found further out in distance, and for duration or duty-cycle arguments.',
    },
    {
      type: 'predict',
      title: 'Getting the period',
      body: `So far you have used a single dip. The light curve has more in it
             than that: the transits repeat.`,
      prompt: 'The orbital period of the planet is best measured by…',
      options: [
        'the width of one transit',
        'the time between the middles of two successive transits',
        'the depth of the transit',
        'how long the star stays at its baseline brightness',
      ],
      answer: 1,
      because:
        'The spacing between transits is the period, by definition: the planet has gone exactly once around. The width of a transit is a different quantity, set by the geometry and the orbital speed, and it is what you use to get the stellar density once you know the period.',
    },
    {
      type: 'measure',
      title: 'Time two transits',
      body: `The readout below numbers every complete transit and gives the
             time of its middle. Press the button to record whichever one has
             most recently gone past, wait for a later one, and press it again.
             Each press brings its transit number with it, so you can leave the
             simulation running and come back to it.
             \n\nThe two do not have to be consecutive. Enter how many orbits
             went by between them, which is the difference of the two transit
             numbers, and the period is divided by that. This is not a trick to
             save you waiting: it is how transit timing actually works. If each
             mid-time is good to a minute and you wait one orbit, the period is
             good to a minute; wait a hundred orbits and the same two
             measurements give a period good to under a second. Kepler periods
             are quoted to seven significant figures for exactly this reason, and
             you can see it happen here by waiting longer.`,
      lightCurve: true,
      importLabel: 'Record the latest transit',
      importFromSelection: ctx => {
        const a = ctx.photometry();
        return a.last ? [a.last.mid.toFixed(4), String(a.last.seq)] : null;
      },
      importGroups: [
        ['t1', 'n1'],
        ['t2', 'n2'],
      ],
      fields: [
        { id: 't1', label: 'First mid-transit time', unit: 'days' },
        { id: 'n1', label: 'which transit it was', unit: '', hint: 'e.g. 2' },
        { id: 't2', label: 'A later mid-transit time', unit: 'days' },
        { id: 'n2', label: 'which transit it was', unit: '', hint: 'e.g. 5' },
        {
          id: 'n',
          label: 'Orbits between the two',
          unit: '',
          hint: 'the difference of the two transit numbers',
        },
        {
          id: 'P',
          label: 'Orbital period P = (t₂ − t₁) / n',
          unit: 'days',
          decimals: 4,
          compute: v => (v.t2 - v.t1) / v.n,
        },
      ],
      validate: v => {
        const P = (v.t2 - v.t1) / v.n;
        if (!Number.isFinite(P)) return null;
        if (P < 0) {
          return {
            level: 'error',
            message:
              'The second stamp has to come after the first. Swap them, or take a fresh pair.',
          };
        }
        if (v.n < 1) {
          return {
            level: 'error',
            message: 'At least one orbit has to pass between two transits.',
          };
        }
        // The classic off-by-one: transit 2 to transit 5 is three orbits, not
        // four. Worth naming, because the period comes out wrong by a factor
        // that looks almost right.
        const gap = v.n2 - v.n1;
        if (Number.isFinite(gap) && gap > 0 && v.n !== gap) {
          return {
            level: 'warn',
            message:
              `You recorded transit ${v.n1} and transit ${v.n2}, so the planet went ` +
              `round <strong>${gap}</strong> ${gap === 1 ? 'time' : 'times'} in between, not ${v.n}. ` +
              'Count the gaps between the transits, not the transits themselves.',
          };
        }
        if (P > 3.2 && P < 3.9) {
          return {
            level: 'ok',
            message:
              'About 3.5 days. The published period of HD 209458 b is 3.5247 days, known to better than a tenth of a second from two decades of transits.',
          };
        }
        if (P > 6.5 && P < 7.5) {
          return {
            level: 'warn',
            message:
              'That is twice the period: a transit went by between your two stamps and was not counted. Put 2 in the orbits box.',
          };
        }
        if (P > 1.5 && P < 2.1) {
          return {
            level: 'warn',
            message:
              'That is about half the period. Check that both stamps were taken at the bottom of a transit and not one at a transit and one at the secondary eclipse halfway between.',
          };
        }
        return {
          level: 'warn',
          message:
            'Expected something near 3.5 days. Check that the orbit count matches the difference between the two transit numbers in the readout.',
        };
      },
      probe: timing,
      tip: 'The transit numbers in the readout count every complete dip since the recording started, so the orbits between transit 3 and transit 7 is simply 4.',
    },
    {
      type: 'measure',
      title: 'From a period to an orbit',
      body: `A period and a stellar mass are enough to place the planet, through
             the same third law you would use on the Solar System:
             \n\n<strong>a<sup>3</sup> = P<sup>2</sup> M<sub>★</sub></strong>,
             with a in AU, P in years and M<sub>★</sub> in solar masses.
             \n\nHD 209458 weighs <strong>1.148 M<sub>☉</sub></strong>, from its
             spectrum and its position on the main sequence. Enter your period and
             that mass.
             \n\nThe last two rows are what the orbit means. a / R<sub>★</sub> is
             how many stellar radii out the planet sits, which is what sets the
             transit probability and the duration. The equilibrium temperature is
             what you get by balancing the starlight it absorbs against the heat
             it radiates away.`,
      fields: [
        {
          id: 'P_d',
          label: 'Period P',
          unit: 'days',
          hint: 'from the previous step',
        },
        {
          id: 'M',
          label: 'Star mass M<sub>★</sub>',
          unit: 'M☉',
          hint: '1.148',
        },
        {
          id: 'P_yr',
          label: 'Period in years',
          unit: 'yr',
          decimals: 6,
          compute: v => v.P_d / 365.25,
        },
        {
          id: 'a_au',
          label: 'Semi-major axis a = (P² M)^⅓',
          unit: 'AU',
          decimals: 5,
          compute: v => Math.cbrt((v.P_d / 365.25) ** 2 * v.M),
        },
        {
          id: 'a_over_r',
          label: 'Orbit in stellar radii, a / R<sub>★</sub>',
          unit: '',
          decimals: 2,
          compute: v =>
            (Math.cbrt((v.P_d / 365.25) ** 2 * v.M) * 215.032) / 1.155,
        },
        {
          id: 'teq',
          label: 'Equilibrium temperature',
          unit: 'K',
          decimals: 0,
          compute: v =>
            6065 /
            Math.sqrt(
              (2 * (Math.cbrt((v.P_d / 365.25) ** 2 * v.M) * 215.032)) / 1.155
            ),
        },
      ],
      validate: v => {
        const a = Math.cbrt((v.P_d / 365.25) ** 2 * v.M);
        if (!Number.isFinite(a)) return null;
        if (v.P_d < 0.5) {
          return {
            level: 'error',
            message:
              'The period goes in days, not years. Three and a half days, not three and a half thousandths of a year.',
          };
        }
        if (v.M > 20) {
          return {
            level: 'error',
            message:
              'The mass goes in solar masses. HD 209458 is 1.148 of them.',
          };
        }
        if (a > 0.035 && a < 0.06) {
          return {
            level: 'ok',
            message:
              'About 0.047 AU: one eighth of Mercury’s distance from the Sun, and roughly nine stellar radii out. At 1,450 K the planet’s day side is hot enough to glow dull red on its own. Nothing in planet formation theory before 1995 put a gas giant there, and working out how it arrived is still an active argument between migration through the disk and scattering off other planets.',
          };
        }
        return {
          level: 'warn',
          message:
            'Expected roughly 0.047 AU. Check the period is in days and the mass in solar masses.',
        };
      },
    },
    {
      type: 'read',
      title: 'What a transit cannot tell you',
      body: `You have a radius, a period and an orbit. You do not have a mass, and
             no amount of better photometry will give you one. A puffy gas planet
             and a dense rocky one of the same size produce identical dips.
             \n\nThe mass has to come from somewhere else, and it almost always
             comes from radial velocities: the star's spectral lines shift as the
             planet pulls it around, and the size of that shift gives the planet's
             mass. For HD 209458 b that is 0.69 Jupiter masses. Put the two
             measurements together and you get a density: 0.69 Jupiter masses
             inside 1.38 Jupiter radii is about 0.34 grams per cubic centimeter,
             a third the density of water. The planet would float, if you had an
             ocean large enough.
             \n\nThat is why the standard plot in the field is the
             <strong>mass-radius diagram</strong>, and why a planet with only one
             of the two is a candidate rather than a result. It is also where the
             most interesting recent result came from: plot radius against period
             for the small Kepler planets and there is a visible gap near
             1.8 R<sub>⊕</sub>, the <em>radius valley</em>, separating rocky
             super-Earths from small worlds holding a thin hydrogen envelope. The
             gap is thought to be carved by atmospheric escape, and it is a
             feature nobody predicted before the data showed it. Finding it
             required thousands of planet radii to be accurate, which is where the
             last section of this lesson goes.`,
      tip: 'The TRAPPIST-1 planets got their masses a third way: they perturb each other enough to shift each other’s transits by minutes, and those transit timing variations are a mass measurement.',
    },
    {
      type: 'read',
      title: 'The planet changes size with color',
      body: `Here is something the simple picture does not predict. Measure the
             transit depth in red light and again in blue light and you can get
             different answers.
             \n\nThe reason is that the planet's edge is not a hard edge. A gas
             planet has an atmosphere, and how deep you can see into it depends on
             what is absorbing at the wavelength you are looking at. At a
             wavelength where sodium absorbs strongly, the atmosphere goes opaque
             high up and the planet presents a slightly larger disk. At a
             wavelength where nothing absorbs, you see further down and the disk
             is slightly smaller. The transit depth traces out the planet's
             opacity against wavelength: a <strong>transmission spectrum</strong>.
             \n\nThe size of the effect is set by the atmospheric
             <strong>scale height</strong>, the vertical distance over which
             pressure falls by a factor of e: H = kT / μg. Hot, low-gravity,
             hydrogen-rich atmospheres are puffy and have large scale heights,
             which is why hot Jupiters are the easiest atmospheres to study. For
             this planet H is roughly 550 km against a radius of 99,000 km, so a
             strong band lifts the radius by a few tenths of a percent and the
             depth by a few hundred parts per million on top of 18,000.
             \n\nThat sounds impossible to measure. It was done first in this very
             system: in 2002 David Charbonneau and colleagues used the Hubble
             Space Telescope to find that HD 209458 b's transit was very slightly
             deeper in the sodium D lines than beside them. It was the first
             detection of an atmosphere on a planet around another star.`,
      tip: 'The same idea in reverse gives you emission spectra: watch the planet pass behind the star, subtract, and what disappears is the planet’s own light.',
    },
    {
      type: 'explore',
      title: 'Read an atmosphere',
      body: `The instrument plots transit depth against wavelength for a hot
             Jupiter like this one. The dashed line is where the depth would sit
             if the planet had no atmosphere at all; every bump above it is a
             molecule making the atmosphere opaque at that color.
             \n\nThe cloud slider is the honest part. High cloud and haze decks sit
             above the layers where the molecular features form and mute them
             towards a flat line. A large fraction of well-observed hot Jupiters
             look at least partly like this, and telling a genuinely dry
             atmosphere from a cloudy wet one is a real and current difficulty.`,
      tool: { id: 'spectrum' },
      lightCurve: false,
      checklist: [
        'Find the sodium feature and read its size in parts per million',
        'Compare the 1.4 μm water band with the 4.3 μm carbon dioxide band',
        'Turn the clouds up and watch the features flatten',
        'Change the scale height and see which features survive',
        'Find a wavelength where nothing is absorbing at all',
      ],
      tip: 'Wavelengths beyond about 2.5 μm are absorbed by our own atmosphere and were unreachable until JWST. Its first exoplanet results in 2022 included the first unambiguous carbon dioxide detection in an exoplanet atmosphere.',
    },
    {
      type: 'question',
      title: 'Why the depth moves',
      kind: 'choice',
      body: `A team measures a planet's transit 300 parts per million deeper at
             1.4 μm than at 1.2 μm, and repeats the result on four separate
             transits.`,
      prompt: 'The most likely explanation is that…',
      options: [
        'the planet is physically larger when observed at 1.4 μm',
        'water vapour makes the atmosphere opaque at 1.4 μm, so the planet blocks a slightly wider disk',
        'the star is brighter at 1.4 μm, which deepens the transit',
        'the orbit is slightly different on the transits taken at 1.4 μm',
      ],
      answer: 1,
      because:
        'Opacity, not size. At a wavelength where an abundant molecule absorbs, the atmosphere becomes opaque higher up, so the radius at which the planet stops transmitting starlight is larger. The star’s own brightness cancels out of the depth entirely, which is what makes this measurement possible in the first place.',
    },
    {
      type: 'read',
      title: 'Things that are not planets',
      body: `A dip in a light curve is a dip in a light curve. Several things that
             are not planets produce one.
             \n\nAn <strong>eclipsing binary</strong> of two stars produces dips
             of tens of percent, which is obvious, until the pair is grazing and
             only clips a few percent. A <strong>background eclipsing binary</strong>
             behind your target, its deep eclipses watered down by all the light of
             the foreground star, produces a shallow dip of exactly planetary
             depth. Starspots rotating in and out of view produce dips that
             almost repeat. Kepler and TESS both flag more candidates than they
             confirm, and sorting them out is the bulk of the follow-up effort.
             \n\nThe subtler problem is not a false positive at all. It is a real
             planet whose measurement is quietly wrong.
             \n\nSurvey telescopes have coarse pixels. Kepler's were about four
             arcseconds across; TESS's are <strong>21 arcseconds</strong>, roughly
             the apparent size of a small crater on the Moon. Every star that
             falls in the aperture contributes light to the same one number.
             Stellar companions are common: roughly half of Sun-like stars have
             one. If your target has a neighbor a fraction of an arcsecond away,
             the survey has no way of knowing, and the neighbor's light is in
             every measurement you make.
             \n\nAdding constant light to a light curve does not hide the transit.
             It <em>dilutes</em> it.`,
    },
    {
      type: 'explore',
      title: 'A star you did not know was there',
      body: `Suppose a fraction of the light in the aperture comes from a
             companion, with flux ratio F<sub>2</sub>/F<sub>1</sub>. The planet
             still blocks the same fraction of its own star, but that blocked
             light is now a smaller share of the total:
             \n\n<strong>δ<sub>observed</sub> = δ<sub>true</sub> /
             (1 + F<sub>2</sub>/F<sub>1</sub>)</strong>
             \n\nSince the radius goes as √δ, the radius you report is too small
             by exactly
             \n\n<strong>R<sub>true</sub> / R<sub>measured</sub> =
             √(1 + F<sub>2</sub>/F<sub>1</sub>)</strong>
             \n\nContrast is usually quoted as a magnitude difference, and
             F<sub>2</sub>/F<sub>1</sub> = 10<sup>−0.4Δm</sup>. An equal twin
             makes every radius too small by √2. A companion four magnitudes
             fainter changes it by 1.2%.
             \n\nThis is what high-resolution imaging of planet hosts is for. The
             <strong>Robo-AO Kepler Survey</strong> put a robotic laser adaptive
             optics system on the 1.5 m telescope at Palomar and imaged
             <strong>3,857</strong> Kepler planet-candidate hosts between 2012 and
             2016, reaching about 0.15 arcseconds. It found a nearby star within
             4 arcseconds around <strong>14.5 ± 0.5%</strong> of them: about one
             host in seven. The <strong>SOAR TESS Survey</strong> does the same
             job for TESS with speckle imaging on the 4.1 m SOAR telescope in
             Chile, resolving to about 0.04 arcseconds, and has observed nearly
             3,000 targets.`,
      tool: { id: 'dilution' },
      lightCurve: false,
      checklist: [
        'Set Δm = 0 and confirm the correction is exactly √2',
        'Set Δm = 0.5, the contrast in the scenario you are about to load',
        'Find the Δm beyond which the correction is under 1%',
        'Set the measured radius to 1.5 R⊕ and find the Δm that pushes it past 1.6',
      ],
      tip: 'Robo-AO Survey IV corrected 814 candidate radii. Treating the primary and the secondary as equally likely hosts, the mean radius grew by a factor of 1.54, and 35 candidates previously believed to be rocky moved out of the rocky size range entirely.',
    },
    {
      type: 'explore',
      title: 'Go and look',
      body: `Knowing that dilution matters does not tell you which stars are
             diluted. Somebody has to point a telescope with enough resolving
             power at every planet host and find out what else is in the
             aperture.
             \n\nThat is hard from the ground, because the atmosphere smears
             every point of light into a blur about an arcsecond across, and a
             companion inside that blur is simply part of the star. Two
             techniques get underneath it. <strong>Adaptive optics</strong>
             measures the distorted wavefront with a guide star, often an
             artificial one made by a laser, and corrects it with a deformable
             mirror hundreds of times a second. <strong>Speckle imaging</strong>
             takes hundreds of exposures short enough to freeze the atmosphere
             and combines them in Fourier space, where the binary signal
             survives and the atmospheric scrambling does not.
             \n\nThe instrument on the right shows the same pair of stars
             imaged at a resolution you choose. Work down from ordinary seeing
             to what a 4 m telescope reaches with speckle, and watch a single
             star become two.`,
      tool: { id: 'resolve' },
      lightCurve: false,
      checklist: [
        'Start at ordinary seeing and confirm the pair reads as one star',
        'Step down to the Robo-AO resolution and find where it splits',
        'Reach the SOAR speckle resolution and see how much closer it goes',
        'Move the companion inwards until even that cannot separate them',
        'Turn the contrast up and note that separation is not the only thing that matters',
      ],
      tip: 'Robo-AO reached about 0.15 arcseconds on a 1.5 m telescope and imaged 3,857 Kepler hosts; SOAR speckle reaches about 0.04 arcseconds on a 4.1 m and has observed close to 3,000 TESS targets. Neither is a large telescope by modern standards. What made them work was doing it to every host, not to a chosen few.',
    },
    {
      type: 'explore',
      title: 'Now measure it',
      body: `The same star and the same planet are back, with one change: a
             second star half a magnitude fainter sits 300 AU away. At the
             distance of this system that is about three arcseconds on the sky,
             comfortably inside a single TESS pixel and inside a Kepler aperture,
             and it is 30,000 simulation units from the star you are watching, far
             outside the view. It is there. You cannot see it. Neither could the
             survey.
             \n\nMeasure the transit depth again exactly as you did before. The
             readout below is measuring the new curve as it comes in; wait for a
             complete transit and compare its bottom with what you got the first
             time.`,
      setup: {
        scenario: 'Blended Binary',
        seed: 'transit-lab',
        camera: { zoom: 60, pan: { x: 0, y: 0 } },
        paused: false,
      },
      lightCurve: true,
      observerAngle: 0,
      clearLightCurve: true,
      checklist: [
        'Wait for a complete transit and read the new baseline and the new bottom',
        'Confirm the dip is visibly shallower than it was',
        'Check the mid-times: the period has not changed at all',
        'Note that the shape and duration of the transit are exactly as before',
      ],
      probe: photometry,
      tip: 'Only the depth changes. The period, the duration and the shape are untouched, which is precisely why blending is so easy to miss: nothing about the light curve looks wrong.',
    },
    {
      type: 'measure',
      title: 'Recover the real planet',
      body: `You have measured the same planet twice, once clean and once
             blended. The ratio of the two depths is 1 + F<sub>2</sub>/F<sub>1</sub>
             directly, which means this pair of measurements contains the
             companion's brightness even though you never saw it.
             \n\nIn practice you never get the clean measurement: that is the whole
             difficulty, and it is why somebody has to go and take a
             high-resolution image. Here you have both, so you can check that the
             correction does what it claims.`,
      lightCurve: true,
      importLabel: 'Copy the blended depth',
      importFromSelection: ctx => {
        const a = ctx.photometry();
        return a.last ? [a.last.depth.toFixed(6)] : null;
      },
      importGroups: [['d_blend']],
      probe: photometry,
      fields: [
        {
          id: 'd_blend',
          label: 'Depth you just measured, blended',
          unit: '',
        },
        {
          id: 'd_clean',
          label: 'Depth you measured earlier, unblended',
          unit: '',
          hint: 'from step 8',
        },
        {
          id: 'rp_blend',
          label: 'Radius the blended curve implies',
          unit: 'R⊕',
          decimals: 2,
          compute: v => Math.sqrt(v.d_blend / 1.2146) * 1.155 * 109.198,
        },
        {
          id: 'ratio',
          label: 'Depth ratio = 1 + F₂/F₁',
          unit: '',
          decimals: 4,
          compute: v => v.d_clean / v.d_blend,
        },
        {
          id: 'dm',
          label: 'Implied companion contrast Δm',
          unit: 'mag',
          decimals: 2,
          compute: v => -2.5 * Math.log10(v.d_clean / v.d_blend - 1),
        },
        {
          id: 'corr',
          label: 'Radius correction √(1 + F₂/F₁)',
          unit: '',
          decimals: 4,
          compute: v => Math.sqrt(v.d_clean / v.d_blend),
        },
        {
          id: 'rp_true',
          label: 'Corrected planet radius',
          unit: 'R⊕',
          decimals: 2,
          compute: v =>
            Math.sqrt(v.d_blend / 1.2146) *
            1.155 *
            109.198 *
            Math.sqrt(v.d_clean / v.d_blend),
        },
      ],
      validate: v => {
        const ratio = v.d_clean / v.d_blend;
        const rp = Math.sqrt(v.d_blend / 1.2146) * 1.155 * 109.198;
        if (!Number.isFinite(ratio) || !Number.isFinite(rp)) return null;
        if (v.d_clean > 1 || v.d_blend > 1) {
          return {
            level: 'error',
            message:
              'Both depths are fractions, not percentages: 1.1% goes in as 0.011.',
          };
        }
        if (ratio <= 1) {
          return {
            level: 'error',
            message:
              'The blended depth has to be the <em>shallower</em> of the two. Check you have not put them in the wrong boxes.',
          };
        }
        const corrected = rp * Math.sqrt(ratio);
        if (
          ratio > 1.4 &&
          ratio < 1.95 &&
          corrected > 13.5 &&
          corrected < 17.5
        ) {
          return {
            level: 'ok',
            message:
              'That is the result. The blended curve says about 12 Earth radii; the correction of roughly ×1.28 takes it back to about 15.5, which is the 1.38 Jupiter radii you measured before the companion was there. The implied contrast should land near Δm = 0.5, which is what the companion actually is.',
          };
        }
        if (ratio > 1.95) {
          return {
            level: 'warn',
            message:
              'The ratio is larger than this companion can produce. Re-read the blended depth: it should be near 0.011, not near half the clean value.',
          };
        }
        return {
          level: 'warn',
          message:
            'Expected a ratio near 1.63 and a corrected radius near 15.5 R⊕. Check both depths came from the bottom of a dip rather than a shoulder.',
        };
      },
      tip: 'Notice what the correction does not need: the companion’s distance, its mass, or whether it is even bound to the star. Only how much light it adds.',
    },
    {
      type: 'question',
      title: 'What it does to a survey',
      kind: 'choice',
      body: `Roughly one Kepler planet host in seven has a neighboring star
             within four arcseconds, and every one of those planets had its radius
             underestimated by some amount between a fraction of a percent and
             40%.`,
      prompt:
        'What is the most important consequence for results drawn from the whole catalog?',
      options: [
        'None: the corrections are small and average out across the sample',
        'Planet radii are systematically too small, so any feature that depends on a radius boundary, such as the count of rocky planets, is biased in one direction',
        'The affected planets are not real and should be discarded',
        'Only the orbital periods are affected, not the radii',
      ],
      answer: 1,
      because:
        'The bias is one-directional: dilution can only ever make a planet look smaller, never larger, so it does not average out. That matters most where a scientific conclusion depends on which side of a line a planet falls: how many rocky planets there are, where the radius valley sits, how many worlds are in a habitable zone. Robo-AO Survey V, working with the companions it could establish were physically bound, found a mean radius correction of 1.77 for those systems, and found hot Jupiters roughly four times more likely to sit in binaries than other planets: a result about planet formation that only exists because somebody imaged the hosts.',
    },
    {
      type: 'read',
      title: 'What you did, and where it goes next',
      body: `You measured a transit depth and turned it into a planet radius, and
             then made that radius more accurate three times over: once by
             dividing out limb darkening, once by understanding the geometry that
             sets the impact parameter, and once by correcting for a star nobody
             could see. That sequence, measurement then correction then
             correction, is what the field actually looks like from the inside.
             \n\nThe method is not slowing down. TESS is surveying essentially the
             whole sky for transits around bright, nearby stars, the ones worth
             following up. JWST is taking transmission spectra of small planets
             around cool stars, which is the only route to an atmosphere on
             anything rocky with current technology. ESA's PLATO, due later this
             decade, is built to find Earth-sized planets in year-long orbits
             around Sun-like stars, the corner of parameter space Kepler could
             only just reach. Ariel after it will do atmospheres at survey scale.
             \n\nAnd behind all of them sits the unglamorous work you did in the
             last three steps: somebody has to go and look at every host star with
             a big enough telescope to find out what else is in the aperture.
             Every one of those thousands of planet radii is only as good as the
             answer.`,
      tip: 'A note on numbers: the survey results quoted here come from the Robo-AO Kepler Survey and the SOAR TESS Survey, both of which set out to image every planet-candidate host they could reach. The Robo-AO census covers 3,857 Kepler hosts; the SOAR programme has observed close to 3,000 TESS targets and finds a median primary-host radius correction of about 1.07, rising to 1.33 for the worst tenth.',
    },
  ],
};

// --- 3. Orbital energy --------------------------------------------------------

// Held still for the opening. The work of the first half is all in the panel,
// and a simulation moving behind it is only something else to look at.
const ENERGY_LAB = {
  scenario: "Kepler's 2nd Law",
  seed: 'energy-lab',
  camera: { zoom: 1.4, pan: { x: 0, y: 0 } },
  paused: true,
};

const ENERGY_ORBIT = {
  scenario: "Kepler's 2nd Law",
  seed: 'energy-lab',
  camera: { zoom: 1.4, pan: { x: 0, y: 0 } },
  paused: false,
};

/** Live energies of whatever is selected, for the steps that watch an orbit. */
const energyProbe = ctx => {
  const b = ctx.selected;
  if (!b) return [{ label: 'Click a body in the simulation', value: '…' }];
  const e = ctx.energy(b);
  const el = ctx.elements(b);
  if (!e) return [{ label: b.name || 'Body', value: 'nothing to orbit' }];
  return [
    { label: 'Selected', value: b.name || 'Body' },
    { label: 'Distance from the star', value: el ? ctx.distance(el.r) : '-' },
    { label: 'Speed', value: el ? ctx.speed(el.v) : '-' },
    {
      label: 'Total energy',
      value: e.total < 0 ? 'below zero' : 'above zero',
      emphasis: true,
    },
    {
      label: 'Bound or unbound',
      value: el
        ? el.bound
          ? 'bound: it comes back'
          : 'unbound: it is leaving'
        : '-',
    },
  ];
};

const ENERGY = {
  id: 'orbital-energy',
  thumbnail: 'images/scenarios/interstellar-visitor.webp',
  title: 'Bound, Unbound and Escape',
  subtitle: 'Find out what decides whether something comes back',
  duration: '35-45 min',
  level: 'Introductory astronomy',
  // The equal-area wedges belong to the lesson this scenario was built for,
  // not to this one.
  lock: { placement: true, inspector: true, areaSweep: false },
  summary:
    'Fire something off a planet and find out what decides whether it falls back, circles forever, or leaves and never returns. Work up from the experiment to the idea behind it: every object near a star carries an amount of energy, and the sign of that one number settles the question. Finish on a real interstellar visitor and decide for yourself whether it will be back.',
  objectives: [
    'Describe what happens to a launched object as its speed is raised past the escape point',
    'Explain in your own words why total energy below zero means an object is trapped',
    'State roughly what escape speed is at the Earth’s surface, and what it means',
    'Explain why escaping does not mean gravity has stopped pulling',
    'Say what happens to escape speed for a more massive body, and for a greater starting distance',
    'Decide from its path whether a real object is bound to the Sun',
  ],
  steps: [
    {
      type: 'read',
      title: 'How hard would you have to throw it?',
      body: `Throw a ball and it comes down. Throw it harder and it comes down
             further away. Newton asked the obvious next question, in a
             thought experiment he drew in 1687: put a cannon on a mountain so
             tall it is above the air, and fire it horizontally. What happens if
             you keep loading more gunpowder?
             \n\nHis answer was that at some point the ground curves away
             underneath the cannonball as fast as the ball falls, and it stops
             coming down at all. It goes all the way round and hits you in the
             back. That is an orbit, and it is the reason a satellite stays up:
             not because it has escaped gravity, but because it is falling and
             continually missing.
             \n\nAnd if you load even more gunpowder? At some speed it leaves and
             does not come back. Somewhere between those two outcomes there is a
             dividing line. Finding that line, and understanding what decides
             which side of it something falls on, is the whole of this lesson.
             \n\nOver the next few steps you will fire Newton's cannon yourself.`,
      tip: 'Nothing needs measuring yet. The panel on the right will appear in a moment with a cannon on it.',
      setup: ENERGY_LAB,
    },
    {
      type: 'predict',
      title: 'Load it lightly',
      body: `The first shot leaves the mountaintop sideways at
             <strong>6 kilometers per second</strong>. That is fast: about
             twenty times the speed of sound, and far faster than any bullet.
             \n\nCommit to an answer before you fire it.`,
      prompt: 'Fired sideways at 6 km/s, the cannonball will…',
      options: [
        'go round the Earth and keep going round',
        'travel a long way and then fall back to the ground',
        'leave the Earth and never return',
        'stop and drop straight down',
      ],
      answer: 1,
      because:
        'It comes back down. Six kilometers a second sounds enormous, and it is, but it is not enough: the ball rises, slows, turns over and falls. Every projectile ever fired on Earth has done this.',
    },
    {
      type: 'explore',
      title: 'Fire it',
      body: `There is the shot. The green path is the cannonball, launched
             sideways from the surface, and it lands a long way round the world.
             \n\nPress <strong>Run</strong> to fire it again, and use the speed
             slider to try a few more. Do not worry about the bars at the bottom
             of the panel yet: you will come back to those.`,
      tool: { id: 'launch', values: { v: 6 } },
      checklist: [
        'Watch the 6 km/s shot come back down',
        'Try 3 km/s and see how much shorter the flight is',
        'Raise the speed until the ball goes right round without landing',
        'Note roughly the speed at which that first happens',
      ],
      tip: 'The cannon is 320 km up, which is roughly where the space station flies and safely above the air. From there, the lowest speed that gets all the way round without touching the ground is about 7.7 km/s. That is why rockets tip over and fly sideways rather than straight up: getting high is the easy part, going fast enough sideways is the hard part.',
    },
    {
      type: 'predict',
      title: 'Load it heavily',
      body: `Now double the powder. This time the cannonball leaves at
             <strong>14 kilometers per second</strong>.`,
      prompt: 'Fired sideways at 14 km/s, the cannonball will…',
      options: [
        'go round the Earth in a very large circle',
        'fall back down, just much later',
        'leave along an open path and never come back',
        'orbit for a while and then slowly spiral in',
      ],
      answer: 2,
      because:
        'It leaves for good. The path is no longer a closed loop: it opens out, and the ball is still moving away when it is far past everything on the screen. Nothing brings it back.',
    },
    {
      type: 'explore',
      title: 'Fire it again',
      body: `The path has changed character. It is not a very big loop, it is
             not a loop at all. The ball goes out and keeps going.
             \n\nNotice that the panel now says the path is <em>open</em>, and
             that the "furthest it gets" line has no answer to give.`,
      tool: { id: 'launch', values: { v: 14 } },
      checklist: [
        'Watch the 14 km/s shot leave along an open path',
        'Try 16 km/s and confirm it leaves faster and straighter',
        'Go back down to 9 km/s and confirm that one still comes back',
        'Read the "does it come back?" line in each case',
      ],
    },
    {
      type: 'explore',
      title: 'Find the dividing line',
      body: `Somewhere between 9 and 12 km/s the answer flips from
             <em>yes, it comes back</em> to <em>no, it is gone</em>.
             \n\nMove the slider carefully and find where. It is worth going
             slowly through the last stretch: just below the line, the ball goes
             an absurd distance out and still turns round.`,
      tool: { id: 'launch', values: { v: 9 } },
      checklist: [
        'Find the lowest speed at which the answer changes to "it leaves for good"',
        'Set the speed just under that and read how far out it gets before turning',
        'Set it just over and confirm the path never closes',
        'Notice that the change is sudden: there is a definite dividing speed',
      ],
      tip: 'At 10.9 km/s the ball goes out past 350 Earth radii, further than the Moon, and still comes home. At 10.92 it never turns round at all. The two look identical for the first stretch of the flight, which is exactly why astronomers want a number rather than a picture.',
    },
    {
      type: 'question',
      title: 'Where is the line?',
      kind: 'choice',
      body: `You have just found it by hand.`,
      prompt:
        'The dividing speed for a cannonball fired from the Earth’s surface is closest to…',
      options: ['8 km/s', '12 km/s', '20 km/s', '40 km/s'],
      answer: 1,
      because:
        'From the cannon it is 10.9 km/s, so 12 is much the closest. From the ground itself it is 11.2 km/s, and that is the number worth carrying around: roughly 25,000 miles per hour, or about forty times the speed of sound. Every spacecraft that has ever left for another planet had to be given at least this much. Notice that the two differ, and that the cannon on its tower needs slightly less. That is a clue you will come back to.',
    },
    {
      type: 'read',
      title: 'What is actually deciding this?',
      body: `You could stop here with a rule of thumb: above 11.2 km/s it leaves,
             below it comes back. But that number is not fundamental, and it
             changes completely if you stand somewhere else. Something underneath
             it is doing the real work.
             \n\nAn object near a planet carries two kinds of energy at once.
             \n\n<strong>The energy of motion</strong> is the obvious one: the
             faster it goes, the more it has. It is never negative, and it is
             zero only if the object is standing still.
             \n\n<strong>The energy of position</strong> is the strange one.
             Being deep in a planet's gravity is like being at the bottom of a
             pit: to get out you have to climb, and climbing costs you. Physics
             keeps track of this by calling the energy of position
             <em>negative</em>, and calling zero the value it has when you are
             infinitely far away and free of the planet entirely. Deep in the
             pit, it is a large negative number. Far away, it is a small one.
             \n\nAdd the two together and you get the <strong>total energy</strong>,
             and that total does not change as the object flies. Speed up on the
             way in, slow down on the way out, the two swap back and forth, and
             the sum stays put.`,
      tip: 'The energies are shown per kilogram, which is why the panel never asks how heavy the cannonball is. It turns out not to matter, and you will see why shortly.',
    },
    {
      type: 'explore',
      title: 'Watch the total',
      body: `The three bars at the bottom of the panel are those energies, with
             a thick line marking <strong>zero</strong>.
             \n\nThe green bar is the energy of motion, above the line. The blue
             bar is the energy of position, below it. The third bar is the total,
             and it is the one to watch.
             \n\nMove the speed slider slowly and watch the total bar move up
             through the line.`,
      tool: { id: 'launch', values: { v: 6 } },
      checklist: [
        'At 6 km/s, note that the total bar is below the zero line',
        'At 9 km/s it is still below, but shorter',
        'Find the speed where the total bar disappears into the zero line',
        'Compare that speed with the dividing line you found earlier',
        'Above it, note that the total bar has flipped to the other side',
      ],
      tip: 'The speed where the total energy crosses zero is exactly the speed where the path stops closing. That is not a coincidence. It is the same fact told two different ways.',
    },
    {
      type: 'question',
      title: 'Reading the sign',
      kind: 'choice',
      body: `You have now seen the total energy go from below zero to above zero,
             and the path go from closed to open, at the same moment.`,
      prompt: 'An object whose total energy is below zero is…',
      options: [
        'bound: it cannot get away, however long you wait',
        'unbound: it will eventually leave',
        'about to fall straight into the planet',
        'travelling faster than escape speed',
      ],
      answer: 0,
      because:
        'Below zero means bound. To get infinitely far away, an object would need a total of at least zero, because that is what the energy of position becomes out there and the energy of motion cannot be negative to make up the difference. Below zero it simply cannot reach, so gravity always wins in the end and turns it round.',
    },
    {
      type: 'explore',
      title: 'Around a real orbit',
      body: `That was a launch. Now watch a whole orbit.
             \n\nIn the simulation there are two planets going round a star. The
             <strong>orange</strong> one is on a stretched orbit: it swings in
             close and races, then drifts far out and crawls. Click it.
             \n\nThe panel shows its two energies as bars, and plots them over
             time underneath. Watch for a full lap.`,
      setup: ENERGY_ORBIT,
      tool: { id: 'live-energy' },
      probe: energyProbe,
      checklist: [
        'Click the orange Eccentric Orbiter in the simulation',
        'Watch the green line rise as it swings in close and fast',
        'Watch the blue line fall at the same moment',
        'Confirm the white total line stays flat while the other two move',
        'Check that the total stays below the zero line the whole way round',
      ],
      tip: 'This is the trade. Falling inwards converts energy of position into energy of motion, and climbing back out converts it straight back. Nothing is gained or lost, which is why the orbit repeats forever.',
    },
    {
      type: 'question',
      title: 'What stays put',
      kind: 'choice',
      body: `Over one lap of that stretched orbit, the planet's speed changed by
             a large factor and its distance changed even more.`,
      prompt: 'Which of these stayed essentially constant all the way round?',
      options: [
        'the energy of motion',
        'the energy of position',
        'the total of the two',
        'none of them: everything changed',
      ],
      answer: 2,
      because:
        'The total. The other two traded back and forth by large amounts and their sum did not move, which is what allowed you to read off a single number and know the orbit was closed. An orbit cannot decide to become unbound on its own: something would have to come along and add energy to it.',
    },
    {
      type: 'read',
      title: 'Escape speed',
      body: `The dividing speed has a name: <strong>escape speed</strong>. It is
             the speed at which the total energy comes out exactly zero, which is
             the slowest you can be launched and still never come back.
             \n\nWritten out, it is
             \n\n<strong>v<sub>escape</sub> = √( 2 G M / r )</strong>
             \n\nwhere M is the mass of the body you are leaving and r is how far
             you already are from its center. You will not need to rearrange it.
             What matters is what it says, which is two things:
             \n\n<strong>More mass makes escape harder.</strong> M is on the top,
             so a heavier body demands a higher speed.
             \n\n<strong>Starting further out makes escape easier.</strong> r is
             on the bottom, so the further out you begin, the less you need. This
             is not because gravity has given up on you; it is because you have
             already done part of the climb.
             \n\nNotice what is <em>not</em> in there: the mass of the thing
             escaping. A grain of dust and a battleship need exactly the same
             speed, for the same reason a feather and a hammer fall together on
             the Moon.`,
      tip: 'The square root is why doubling your distance does not halve the speed you need. It divides it by about 1.4 instead.',
    },
    {
      type: 'question',
      title: 'A common misunderstanding',
      kind: 'choice',
      body: `A spacecraft is launched from Earth at 12 km/s, comfortably above
             escape speed. A week later it is far past the Moon and still
             heading out.`,
      prompt: 'At that moment, the Earth’s gravity is…',
      options: [
        'no longer acting on it: it has escaped',
        'still pulling it backwards and still slowing it down',
        'pushing it away, which is what escape means',
        'exactly canceled by its speed',
      ],
      answer: 1,
      because:
        'Still pulling, and still slowing it. Escaping does not switch gravity off, and there is no distance at which gravity stops. What escaping means is that the spacecraft has enough energy that the slowing never quite brings it to a halt: it keeps losing speed forever and never runs out. Below escape speed, the same slowing does bring it to a halt, and then everything happens in reverse.',
    },
    {
      type: 'predict',
      title: 'Somewhere else entirely',
      body: `Everything so far has been about leaving Earth. Escape speed depends
             on what you are leaving.`,
      prompt:
        'Standing on the surface of each, which would need the highest speed to escape from?',
      options: ['the Moon', 'Earth', 'Jupiter', 'the Sun'],
      answer: 3,
      because:
        'The Sun, by a long way: about 618 km/s from its surface, more than fifty times the Earth’s. The Sun is a third of a million times the Earth’s mass, and although its surface is also much further from its center, the mass wins.',
    },
    {
      type: 'explore',
      title: 'More mass, harder to leave',
      body: `Here are four real bodies with their real escape speeds, all
             measured standing on the surface.
             \n\nThe Sun's bar runs off the end of the chart on purpose. Drawn to
             the same scale as the others it would be ten times longer than the
             panel, which is a fair impression of the situation.`,
      tool: { id: 'escape-compare', values: { dist: 1 } },
      checklist: [
        'Read the escape speed from the Moon and from Earth',
        'Compare Earth with Jupiter and note roughly the factor between them',
        'Note that the Sun is off the scale entirely',
        'Convince yourself the order matches the order of their masses',
      ],
      tip: 'The Moon’s 2.4 km/s is why the Apollo lunar module could be a flimsy foil-covered box with one small engine, while getting the same astronauts off Earth took a 110 meter rocket.',
    },
    {
      type: 'explore',
      title: 'Further out, easier to leave',
      body: `Now keep the bodies the same and change where you start from.
             \n\nThe slider moves your starting point away from the center,
             measured in multiples of each body's own radius. Drag it and watch
             every bar shrink together.`,
      tool: { id: 'escape-compare', values: { dist: 1 } },
      checklist: [
        'Read Earth’s escape speed at the surface',
        'Move to 4 radii out and read it again',
        'Find how far out you have to be for it to fall below 5 km/s',
        'Confirm that every bar shrinks, not just Earth’s',
        'Note that the order of the bodies never changes',
      ],
      tip: 'Nothing about Earth changes when you move the slider. The only thing that changed is how much of the climb you have already done.',
    },
    {
      type: 'question',
      title: 'Starting further out',
      kind: 'choice',
      body: `A rocket is fired from the surface of Earth, and an identical rocket
             is fired from a space station orbiting far above it.`,
      prompt:
        'Compared with the surface, escaping from the space station needs…',
      options: [
        'more speed, because it is further from the ground',
        'less speed, because it is already partly out of the Earth’s gravity',
        'exactly the same speed: escape speed is a property of Earth',
        'no speed at all, because gravity is zero up there',
      ],
      answer: 1,
      because:
        'Less. Escape speed is not a property of a planet on its own, it is a property of a planet and a place. The higher you start, the less of the climb is left, so the less speed you need to finish it. This is one reason interplanetary missions are often assembled in orbit rather than launched in one go.',
    },
    {
      type: 'explore',
      title: 'Three shapes, one law',
      body: `One last thing to look at before applying all this.
             \n\nThe faint curves are three launches from the same spot: one below
             escape speed, one exactly at it, and one above. The heavy white
             curve is yours. Move the slider and watch it change from one to the
             next.
             \n\nThese shapes have names. Below escape speed the path is an
             <strong>ellipse</strong>, a closed loop. Exactly at escape speed it
             is a <strong>parabola</strong>. Above, it is a
             <strong>hyperbola</strong>, an open curve that straightens out into
             a line far away.
             \n\nThe names are not the point. The point is that all three come
             from the same law of gravity acting on the same planet. Nothing
             about the physics changed between them. Only the energy did.`,
      tool: { id: 'shapes' },
      checklist: [
        'Set the slider below 1 and confirm the path closes',
        'Set it to exactly 1 and note that it opens but only just',
        'Set it above 1 and see the path straighten out as it leaves',
        'Watch the "total energy" line change sign as you cross 1',
      ],
      tip: 'Astronomers read this backwards. Measure enough of an object’s path to work out its shape, and you have learned whether it is bound without ever needing to watch it for a whole orbit.',
    },
    {
      type: 'read',
      title: 'Something that came from outside',
      body: `On 19 October 2017, a survey telescope in Hawaii picked up a faint
             moving object. Within days it was clear that it was not behaving
             like anything in the Solar System.
             \n\nEverything that orbits the Sun follows a closed path. This did
             not. Its measured path was open: it came in from the direction of
             the constellation Lyra, swung round the Sun inside Mercury's orbit
             at 87 kilometers per second, and left. It was named
             <strong>1I/ʻOumuamua</strong>, Hawaiian for a scout or messenger
             from far away, and the "1I" means it was the first interstellar
             object anyone had ever caught.
             \n\nIt is on screen now, on its real orbit, with Earth shown for
             scale. Watch it come in.`,
      setup: {
        scenario: 'Interstellar Visitor',
        seed: 'visitor',
        camera: { zoom: 1.1, pan: { x: 0, y: 0 } },
        paused: false,
      },
      tip: 'It was found on its way out, already past the Sun and fading. Nobody has seen it since 2018, and nobody ever will again.',
    },
    {
      type: 'explore',
      title: 'Check it yourself',
      body: `Do not take anyone's word for it. You have a test now.
             \n\nClick the visitor and read the sign of its total energy. Then
             click Earth and read that one, and compare.`,
      probe: energyProbe,
      checklist: [
        'Click 1I/ʻOumuamua and read the sign of its total energy',
        'Click Earth and read the sign of its total energy',
        'Watch the visitor swing round the Sun and start heading back out',
        'Confirm its path never closes, however long you watch',
      ],
      tip: 'Its path is a hyperbola with an eccentricity of 1.20. Every comet ever recorded before this one had an eccentricity below 1, which is another way of saying every one of them was bound to the Sun.',
    },
    {
      type: 'question',
      title: 'Will it be back?',
      kind: 'short',
      body: `The visitor has now passed the Sun and is heading out again, still
             slowing down as the Sun pulls on it.`,
      prompt:
        'Will ʻOumuamua eventually slow to a stop, turn round, and come back into orbit around the Sun? Say why or why not, using what you have measured.',
      rubric:
        'No. Its total energy is above zero, so it is unbound: the Sun’s pull keeps slowing it but can never bring it to a halt, and it will still be moving away when it is arbitrarily far off. Credit for noting that its path is open rather than a closed loop, or that its eccentricity is greater than 1. A common wrong answer is that gravity stops acting on it once it is far enough away, which is worth correcting: gravity keeps pulling forever, and the object escapes anyway.',
    },
    {
      type: 'read',
      title: 'What you worked out',
      body: `You started by firing a cannon and asking a question a child could
             ask: does it come back? By the end you were able to answer the same
             question about an object from another star system, using one number.
             \n\nThe five things worth keeping:
             \n\n<strong>Gravity never switches off.</strong> An escaping object
             is still being pulled backwards the whole way out. It escapes anyway.
             \n\n<strong>Bound means trapped.</strong> Total energy below zero:
             the object cannot reach infinity, so gravity always turns it round
             eventually.
             \n\n<strong>Unbound means gone.</strong> Total energy above zero: it
             leaves and is still moving when it is far away.
             \n\n<strong>Escape speed is the dividing line</strong>, the speed at
             which the total comes out exactly zero.
             \n\n<strong>It depends on where you are, not just what you are
             leaving.</strong> More mass raises it. Starting further out lowers
             it.
             \n\nThat last point is why there is no single answer to "how fast do
             you have to go to escape the Earth". It depends where you start. And
             it is why the honest way to ask the question was never about speed at
             all. It was about energy.`,
      tip: 'The same test decides much bigger questions: whether a star escapes the cluster it was born in, whether a galaxy holds on to the gas blown out by its supernovae, and whether the Milky Way and Andromeda are bound to each other. They are.',
    },
  ],
};

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

// --- 6. The Goldilocks question ----------------------------------------------

const HZ_LAB = {
  scenario: 'Solar System',
  seed: 'goldilocks',
  camera: { zoom: 1.5, pan: { x: 0, y: 0 } },
  paused: false,
};

// The Sun with Venus, Earth, Mars and Ceres, habitable-zone ring switched on.
// The lesson uses the live simulation for the steps that ask students to read
// the real Solar System against the zone, rather than showing them a drawing
// of a system and asking them to take its word for it.
const HZ_RINGS = {
  scenario: 'Habitable Zone Lab',
  seed: 'goldilocks',
  camera: { zoom: 1.35, pan: { x: 0, y: 0 } },
  settings: { habitable_zone_optimism: 1.0 },
  paused: false,
};

// The same system with the wider published definition selected, so the edges
// move on screen while nothing else does.
const HZ_RINGS_WIDE = {
  ...HZ_RINGS,
  settings: { habitable_zone_optimism: 1.7 },
};

// TRAPPIST-1 is 0.06 AU across, so it needs roughly thirty times the zoom the
// Solar System does before anything is visible at all.
const HZ_TRAPPIST = {
  scenario: 'TRAPPIST-1 System',
  seed: 'goldilocks',
  camera: { zoom: 45, pan: { x: 0, y: 0 } },
  // The scenario runs at 0.01, which puts a lap of the innermost planet at
  // sixteen seconds and a lap of the outermost at three and a half minutes.
  // Tripling it makes the inner planets visibly race without touching the
  // integrator: accuracy here is set by the scenario's max_timestep of 0.0006,
  // which the substep loop honors whatever the speed.
  settings: { habitable_zone_optimism: 1.0, sim_speed: 0.03 },
  paused: false,
};

// Same world, separate object on purpose: a step whose setup is not the one in
// force triggers a rebuild, which resets the camera. The step that asks
// students to watch the system run wants the view centered wherever the
// previous step left it having been panned to.
const HZ_TRAPPIST_RUN = { ...HZ_TRAPPIST };

const GOLDILOCKS = {
  id: 'goldilocks-question',
  thumbnail: 'images/scenarios/habitable-zone-lab.webp',
  series: 'Detecting exoplanets',
  title: 'The Goldilocks Question',
  subtitle:
    "Move a planet, change its star, and decide what 'habitable' really means",
  duration: '40-50 min',
  level: 'Introductory astronomy',
  lock: { placement: true, inspector: true, areaSweep: false },
  summary:
    'Work out for yourself why a planet twice as far from its star receives a quarter as much energy, why dim stars have their habitable zones tucked in close, and why an eccentric orbit means a planet does not receive one steady amount of light all year. Then finish with the harder question the phrase "habitable zone" invites people to skip: what does being inside it actually tell you?',
  objectives: [
    'Explain why the starlight reaching a planet falls off rapidly with distance, and use the twice-as-far, one-quarter rule',
    'Explain why a dim star’s habitable zone lies close in and a luminous star’s lies far out',
    'Define the circumstellar habitable zone as a range of orbital distances where surface liquid water could be possible under suitable conditions',
    'Say what sets the inner edge and what sets the outer edge, and why two published definitions disagree',
    'Explain why a planet on an eccentric orbit receives very different amounts of starlight through its year',
    'Read the TRAPPIST-1 system against a habitable-zone model and say where each planet falls',
    'Explain why being inside the habitable zone does not establish that a planet is habitable',
  ],
  steps: [
    {
      type: 'read',
      title: 'What does Earth get from the Sun?',
      body: `Sunlight takes eight minutes and twenty seconds to reach us. What
             arrives is energy, and almost everything about the Earth's surface
             follows from how much of it lands here: the temperature, the
             weather, whether water sits in oceans or in ice or escapes into
             space entirely.
             \n\nThat quantity has a name. The <strong>stellar flux</strong>, or
             insolation, is the energy arriving on each square meter of a
             planet every second. For Earth it is about 1,361 watts per square
             meter, which is roughly the output of a small electric heater
             falling on every square meter of the daylit side.
             \n\nThis investigation is about one question: what decides how much
             of that a planet gets, and what does the answer let you say about
             the planet?`,
      tip: 'Nothing here needs algebra. You will move one slider, read three numbers off a panel, and watch a graph draw itself.',
      setup: HZ_LAB,
    },
    {
      type: 'read',
      title: 'One Earth of starlight',
      body: `Rather than carrying watts per square meter around, this lesson
             uses Earth itself as the ruler. Earth sits one astronomical unit
             from the Sun, which is 150 million kilometers, and receives what we
             will call <strong>one Earth</strong> of starlight.
             \n\nThe panel beside this one shows exactly that: the Sun on the
             left, a planet at 1 AU, and a bar for the energy arriving there.
             The bar is at the mark labeled "what Earth gets", because the
             planet is where Earth is.
             \n\nEverything from here on is measured against that one number.`,
      tool: {
        id: 'hz-insolation',
        values: { distance: 1 },
        hide: ['distance'],
        presets: false,
        title: 'Earth, at one astronomical unit',
        note: 'The lines fanning out from the star are its light, heading outward. The planet intercepts whatever crosses its own patch of sky.',
      },
      tip: 'One astronomical unit, 1 AU, is the average distance from the Earth to the Sun. It is the natural yardstick for anything inside a planetary system.',
    },
    {
      type: 'predict',
      title: 'Move it twice as far out',
      body: `Now imagine picking the Earth up and putting it down at 2 AU,
             twice as far from the Sun as it is now. The Sun is unchanged. The
             planet is unchanged. Only the distance is different.
             \n\nCommit to an answer before you touch anything.`,
      prompt:
        'At twice the distance, each square meter of the planet receives…',
      options: [
        'the same amount of starlight',
        'half as much',
        'one quarter as much',
        'one eighth as much',
      ],
      answer: 2,
      because:
        'One quarter. Half is the answer almost everyone reaches for, and it is worth noticing why it is wrong: the light is not being divided along a line, it is being spread over a surface. Double the distance and that surface is four times bigger. You are about to measure this rather than take it on trust.',
    },
    {
      type: 'explore',
      title: 'Three distances',
      body: `The slider moves the planet. Take a reading at each of the three
             distances below and write the numbers down, or keep this panel open:
             the next screen asks you to record them.
             \n\nThe number to read is the one labeled <strong>starlight
             reaching each square meter</strong>.`,
      tool: {
        id: 'hz-insolation',
        values: { distance: 1 },
        title: 'Move the planet',
        note: 'Use the buttons underneath for the three distances, or drag the slider anywhere in between.',
      },
      checklist: [
        'Set the planet to 0.5 AU and read the starlight',
        'Set it to 1 AU and read it again',
        'Set it to 2 AU and read it a third time',
        'Notice what happened between 1 AU and 2 AU',
      ],
      tip: 'The bar changes length and the number under it changes with it. Both say the same thing; the bar is there so the change is visible before you read the digits.',
    },
    {
      type: 'measure',
      title: 'Write the three down',
      body: `Set the slider to each distance in turn and type what the panel
             reads. The instrument and the graph are both on this screen, so
             nothing has to be remembered from the last one: read a value,
             enter it, watch the point land.`,
      fields: [
        { id: 'd1', label: 'Distance 1', unit: 'AU', hint: '0.5' },
        { id: 's1', label: 'Starlight there', unit: 'Earths', hint: '4' },
        { id: 'd2', label: 'Distance 2', unit: 'AU', hint: '1' },
        { id: 's2', label: 'Starlight there', unit: 'Earths', hint: '1' },
        { id: 'd3', label: 'Distance 3', unit: 'AU', hint: '2' },
        { id: 's3', label: 'Starlight there', unit: 'Earths', hint: '0.25' },
      ],
      validate: v => {
        const rows = [
          [v.d1, v.s1],
          [v.d2, v.s2],
          [v.d3, v.s3],
        ].filter(([d, s]) => Number.isFinite(d) && Number.isFinite(s));
        if (rows.length < 2) return null;
        if (rows.some(([d, s]) => d <= 0 || s <= 0)) {
          return {
            level: 'error',
            message: 'Distances and starlight are both positive numbers.',
          };
        }
        // Every row should satisfy S x d^2 = 1 for a one-solar-luminosity star.
        const products = rows.map(([d, s]) => s * d * d);
        const spread =
          (Math.max(...products) - Math.min(...products)) /
          (products.reduce((a, b) => a + b, 0) / products.length);
        if (spread > 0.35) {
          return {
            level: 'warn',
            message:
              'These do not all sit on the same relationship. Check that each starlight value was read at the distance beside it.',
          };
        }
        return {
          level: 'ok',
          message:
            'Every one of your readings satisfies starlight x distance x distance = 1. That is the pattern, already in your own numbers.',
        };
      },
      plot: {
        title: 'Your three readings',
        xLabel: 'distance  (AU)',
        yLabel: 'starlight  (Earths)',
        height: 260,
        note: 'Distance across, starlight up. Three points are enough to see the shape.',
        points: v => [
          { x: v.d1, y: v.s1, label: '1' },
          { x: v.d2, y: v.s2, label: '2' },
          { x: v.d3, y: v.s3, label: '3' },
        ],
      },
      tool: {
        id: 'hz-insolation',
        values: { distance: 0.5 },
        title: 'Read each distance here',
        note: 'Drag the slider to 0.5, then 1, then 2 AU. Type each reading into the boxes.',
      },
      tip: 'The three suggested distances are only suggestions. Any three will do, as long as the starlight value beside each one was read at that distance.',
    },
    {
      type: 'question',
      title: 'What the graph says',
      kind: 'choice',
      body: `Look at the curve your three points make. It starts high on the
             left, drops steeply, and then flattens out as it goes right without
             ever quite reaching zero.`,
      prompt:
        'As a planet moves further from its star, the starlight it receives…',
      options: [
        'falls steadily, by the same amount for each extra AU',
        'falls quickly at first and then more and more slowly',
        'stays about the same until it suddenly stops',
        'rises, because there is more space to collect from',
      ],
      answer: 1,
      because:
        'It falls fast close in and slowly far out. Going from 0.5 AU to 1 AU costs three quarters of the starlight. Going from 2 AU to 2.5 AU, the same half an astronomical unit, costs only a little. That shape is the signature of the relationship you are about to be shown, and it is why the inner part of any planetary system is so much more sensitive to distance than the outer part.',
    },
    {
      type: 'explore',
      title: 'The star is not running out of light',
      body: `Here is why it happens, and it has nothing to do with light getting
             tired on the way.
             \n\nA star pours out the same energy in every direction. Picture
             that energy crossing an imaginary shell centered on the star. The
             panel draws one shell at a time. Drag the distance out and watch
             two things at once: the patch of light stays the same energy, and
             the shell it has to cover keeps growing.`,
      checklist: [
        'At 1 AU, note how large the lit patch is.',
        'Move out to 2 AU. The shell has twice the radius. Read how many times bigger its area is.',
        'Move out to 3 AU and then 4 AU, reading the area each time: 1, 4, 9, 16.',
        'Notice the bottom line of the panel: the total energy crossing the shell never changes.',
      ],
      tool: {
        id: 'hz-spreading',
        values: { shell: 1 },
        title: 'One shell at a time',
      },
      tip: 'The same rule governs how loud a speaker sounds and how bright a streetlight looks. It is not special to astronomy; it is what happens to anything that spreads out equally in all directions.',
    },
    {
      type: 'question',
      title: 'Writing it down, then using it',
      kind: 'numeric',
      body: `The areas you just read off were 1, 4, 9 and 16: the squares of
             1, 2, 3 and 4. That is not a coincidence about shells, it is what
             the surface of a sphere does. Double the radius and the area goes
             up by four.
             \n\nSame energy, four times the area, a quarter as much on each
             square meter. Written down:
             \n\n<strong>starlight ∝ 1 / d²</strong>
             \n\nor, in full, F = L / (4πd²), where L is the star's luminosity
             and the 4πd² is the area of that shell. You will not be asked to
             rearrange it. What matters is the sentence: <strong>twice as far,
             one quarter as much</strong>.
             \n\nSo, without the panel: a planet sits three times as far from
             its star as Earth is from the Sun. Three squared is nine.`,
      prompt: 'Starlight at 3 AU, in Earths',
      unit: 'Earths',
      answer: 0.111,
      tolerance: 0.02,
      because:
        'One ninth, or about 0.11 Earths. Three times the distance, nine times the area, a ninth of the energy on each square meter. Jupiter is a little further out than this, at 5.2 AU, and receives about a twenty-seventh of what Earth does.',
      tip: 'This is called an inverse-square law. "Inverse" because bigger distance means smaller starlight, "square" because it is the distance squared that does the work.',
    },
    {
      type: 'predict',
      title: 'Leave the planet, change the star',
      body: `So far the star has been the Sun and only the planet has moved. Now
             turn it around.
             \n\nPut a planet at 1 AU, exactly where Earth is, and swap the Sun
             for a red dwarf: a small, cool, very faint star. Red dwarfs are the
             commonest kind of star in the galaxy by a wide margin, and the
             nearest star to the Sun is one.`,
      prompt: 'That planet, still at 1 AU, would now receive…',
      options: [
        'the same starlight, because it has not moved',
        'a little less',
        'far less, because the star is putting out far less light',
        'more, because cooler stars are closer',
      ],
      answer: 2,
      because:
        'Far less. Distance is only half of the story; the other half is how much light the star is producing in the first place. A red dwarf can be less than a thousandth as luminous as the Sun, and a planet at 1 AU around one would be receiving less than a thousandth of what Earth receives.',
    },
    {
      type: 'explore',
      title: 'Four stars, one planet',
      body: `The planet stays at 1 AU. The star slider swaps between four real
             kinds of main-sequence star, from a dim red dwarf to a star five
             times more luminous than the Sun.
             \n\nWatch the number in the top right of the panel as you move
             through them.`,
      tool: {
        id: 'hz-star',
        values: { star: 2, distance: 1 },
        title: 'The same planet, four different stars',
        note: 'Luminosity is given in Suns: 1 is the Sun, 0.0015 is a faint red dwarf. The planet does not move.',
      },
      checklist: [
        'Start on the Sun and note the starlight at 1 AU',
        'Switch to the dim red dwarf without moving the planet',
        'Switch to the orange dwarf, then to the brighter star',
        'Look at the luminosity row each time, and at the starlight row',
      ],
      tip: 'A star four hundred times fainter delivers four hundred times less light to a planet at the same distance. The two numbers track each other exactly, because luminosity multiplies straight through the inverse-square relation.',
    },
    {
      type: 'question',
      title: 'What luminosity does',
      kind: 'choice',
      body: `You have now changed the star four times without moving the planet
             at all.`,
      prompt: 'At a fixed distance, the starlight a planet receives…',
      options: [
        'does not depend on the star, only on the distance',
        'is proportional to the star’s luminosity',
        'depends on the star’s size but not its luminosity',
        'is the same for all main-sequence stars',
      ],
      answer: 1,
      because:
        'It is proportional to luminosity. Ten times the luminosity, ten times the starlight at the same distance. Combine that with what you found earlier and you have the whole relation: the starlight goes up with the star’s luminosity and down with the square of the distance.',
    },
    {
      type: 'explore',
      title: 'So where would a planet have to be?',
      body: `Put those two together and an obvious question follows. If a dim
             star delivers far less light, then a planet would have to sit far
             closer to it to receive as much as Earth receives from the Sun.
             \n\nAstronomers turn that into a band, and the panel now draws one:
             the range of distances where the starlight is in a range that could
             permit liquid water at the surface, given suitable conditions on the
             planet. It is bounded by a dashed line on the hot side and a dotted
             line on the cold side, and the numbers underneath give its inner and
             outer edges for whichever star is showing.
             \n\nChange the star and watch the band rather than the planet.`,
      tool: {
        id: 'hz-star',
        values: { star: 0, distance: 0.05 },
        showZone: true,
        title: 'The band appears',
        note: 'The shaded band is a calculated range of orbital distances, not a physical region of space. Nothing is there. The distance scale changes with the star, so read the axis rather than the pixels.',
      },
      checklist: [
        'On the dim red dwarf, read where the band begins and ends',
        'Switch to the Sun and read the band again',
        'Switch to the brighter star and read it a third time',
        'Put the planet inside the band for each star in turn',
      ],
      tip: 'For the red dwarf the band runs from about 0.042 to 0.080 AU. For the bright star it runs from about 2.1 to 3.6 AU. That is a factor of fifty between them, and it is entirely the star’s doing.',
    },
    {
      type: 'question',
      title: 'Dim stars, close bands',
      kind: 'choice',
      body: `You have watched the band jump around as the star changed.`,
      prompt:
        'Compared with the Sun’s, the band around a much dimmer star lies…',
      options: [
        'much closer to the star',
        'in the same place, since it depends on the planet',
        'much further from the star',
        'in the same place, since all stars are similar',
      ],
      answer: 0,
      because:
        'Much closer in. A dim star delivers less light, so a planet has to be nearer to receive the same amount, and the whole band moves inward with it. The relationship is a square root: a star a hundred times more luminous has its band ten times further out. You do not need to calculate that, but it is why the bright star’s band sat around 2 to 3.5 AU while the red dwarf’s sat at a twentieth of an AU.',
    },
    {
      type: 'read',
      title: 'Saying it carefully',
      body: `The band has a name: the <strong>circumstellar habitable zone</strong>,
             usually shortened to the habitable zone. It is worth reading the
             careful definition once, because the short name invites a much
             stronger claim than the idea can support.
             \n\nThe habitable zone is <em>the range of orbital distances where a
             rocky planet with suitable atmospheric conditions could potentially
             maintain liquid water on its surface.</em>
             \n\nEvery part of that sentence is doing work. <strong>Range</strong>,
             not a line. <strong>Could potentially</strong>, not does.
             <strong>With suitable atmospheric conditions</strong>, which is an
             assumption about the planet, not something the zone measures.
             \n\nThe zone is calculated entirely from the star. It knows nothing
             at all about any particular planet.`,
      tip: 'Liquid water is the criterion because it is the one requirement every form of life we know of shares, and because we have no way to search for the requirements of life we do not know of.',
    },
    {
      type: 'explore',
      title: 'Now put it round the real Sun',
      body: `Enough diagrams. The simulation behind this panel is now the Sun
             with four real worlds around it: <strong>Venus</strong> at 0.72 AU,
             <strong>Earth</strong> at 1.00, <strong>Mars</strong> at 1.52 and
             <strong>Ceres</strong>, the largest asteroid, at 2.77.
             \n\nThe green ring is the habitable zone, drawn from the Sun's own
             luminosity and temperature by the same code the panels have been
             using. Nothing here is a sketch. Take a moment and look at where
             each world falls.`,
      checklist: [
        'Find the inner edge: the dashed orange circle, labeled "runaway greenhouse".',
        'Find the outer edge: the dashed blue circle, labeled "maximum greenhouse".',
        'Watch one full lap of the inner worlds. Which ones stay inside the ring, and which never enter it?',
        'Notice that the ring does not move. It belongs to the star, not to any planet.',
      ],
      setup: HZ_RINGS,
      tip: 'The ring is a calculation, not an object. There is nothing physically present at 0.98 AU; that is simply the distance at which the model says a runaway greenhouse begins for a planet of this type.',
    },
    {
      type: 'question',
      title: 'Reading the real Solar System',
      kind: 'choice',
      body: `The conservative zone around the Sun runs from about 0.98 AU to
             about 1.69 AU. Venus is at 0.72, Earth at 1.00, Mars at 1.52 and
             Ceres at 2.77.`,
      prompt: 'Which worlds on screen lie inside the ring?',
      options: [
        'Earth only',
        'Earth and Mars',
        'Venus, Earth and Mars',
        'All four',
      ],
      answer: 1,
      because:
        'Earth and Mars. Venus at 0.72 AU is inside the inner edge, receiving about 1.9 Earths of starlight; Ceres at 2.77 AU is far beyond the outer edge. Mars, at 1.52 AU, is comfortably within the conservative zone. That last one usually comes as a surprise, and it is the most useful fact in this lesson.',
    },
    {
      type: 'question',
      title: 'The Mars problem',
      kind: 'short',
      body: `Mars is inside the habitable zone. Mars has no liquid water
             anywhere on its surface and has had none for something like three
             billion years. Its atmosphere is about a hundredth the pressure of
             Earth's, and its average surface temperature is around −60 °C.
             \n\nSo either the calculation is wrong, or the calculation is
             answering a narrower question than the name suggests.`,
      prompt:
        'In two or three sentences: why is dry, frozen Mars sitting inside the habitable zone not evidence that the zone was calculated incorrectly?',
      tip: 'Look back at the careful definition three screens ago, the one that begins "the range of orbital distances". Which words in it are about the star, and which are assumptions about the planet?',
      rubric:
        'Full credit for recognizing that the zone is computed from the star alone and that the definition carries an explicit assumption about the planet ("a rocky planet with suitable atmospheric conditions"). Mars is in the right place and fails the assumption: at about a tenth of Earth\'s mass it could not retain a thick atmosphere, so surface pressure is far too low for liquid water and there is almost no greenhouse warming. Credit an answer that gets the structure right even if it names a different atmospheric mechanism. Do not require the phrase "atmospheric escape". Common wrong answer: that Mars is actually outside the zone, or that the zone must be recalculated for each planet.',
      because:
        'The zone is computed from the star alone, and the definition assumes a rocky planet with suitable atmospheric conditions. Mars is in the right place and fails the assumption: it is too small to have held onto a thick atmosphere, so there is not enough pressure or greenhouse warming to keep water liquid. The zone said "this distance could work for a suitable planet". It never said Mars was one.',
    },
    {
      type: 'read',
      title: 'The two edges',
      body: `Why does the zone stop at each end?
             \n\n<strong>The inner edge.</strong> Closer to the star means more
             incoming energy, which means a warmer surface, which means more
             water vapor in the air. Water vapor is itself a powerful greenhouse
             gas, so it traps more heat, which evaporates more water. Past a
             certain amount of incoming light that feedback runs away, the
             oceans end up in the atmosphere, and ultraviolet light breaks the
             water apart so the hydrogen escapes to space. That limit is called
             the <strong>runaway greenhouse</strong>, and it sets the inner edge.
             \n\n<strong>The outer edge.</strong> Further out means less energy
             and a colder surface. A planet can compensate with a thicker
             carbon dioxide atmosphere, which is why the outer edge is not simply
             where water freezes. But carbon dioxide has a limit: pile on enough
             and it starts reflecting and scattering more sunlight than it traps.
             The best a carbon dioxide atmosphere can do is called the
             <strong>maximum greenhouse</strong>, and that sets the outer edge.
             \n\nNeither edge is a temperature. Both are limits on how much
             starlight a climate model can cope with.`,
      tool: {
        id: 'hz-boundaries',
        values: { model: 0 },
        presets: false,
        title: 'The two edges, around the Sun',
        note: 'The dashed line is the runaway greenhouse limit. The dotted line is the maximum greenhouse limit. Earth is marked for scale.',
      },
      tip: 'Venus is thought to have gone through a runaway greenhouse. It sits at 0.72 AU, receives about 1.9 Earths of starlight, and has a surface hot enough to melt lead under an atmosphere ninety times heavier than ours.',
    },
    {
      type: 'explore',
      title: 'Two definitions of the same zone',
      body: `Published habitable zones come in two flavors, and the difference
             is not a matter of mood.
             \n\nThe <strong>conservative</strong> zone uses the two limits you
             just met, both of which come out of a climate model. The
             <strong>optimistic</strong> zone uses two empirical limits instead,
             taken from the history of our own Solar System: Venus appears to
             have had no surface water for at least a billion years, and Mars
             appears to have had some early on. Those two facts bracket a wider
             band.
             \n\nSwitch between them and watch which edge moves further.`,
      tool: {
        id: 'hz-boundaries',
        values: { model: 0 },
        title: 'Conservative and optimistic',
        note: 'Both bands are drawn. The one you have selected is filled in; the other is left as an outline so you can see exactly what changed.',
      },
      checklist: [
        'Read the inner and outer edges of the conservative zone',
        'Switch to optimistic and read them again',
        'Note which of the two edges moved more',
        'Notice where Earth sits relative to each inner edge',
      ],
      tip: 'The optimistic inner edge is called Recent Venus and the optimistic outer edge is called Early Mars. The names are literal: those two worlds are the evidence.',
    },
    {
      type: 'question',
      title: 'What actually changed',
      kind: 'choice',
      body: `You have seen both bands drawn on the same axis.`,
      prompt: 'Going from the conservative to the optimistic zone changes…',
      options: [
        'the star, which is now assumed to be brighter',
        'the assumptions about what atmosphere a planet might have, which moves both edges outward and inward',
        'nothing physical: it just draws a bigger band',
        'the distance scale of the diagram',
      ],
      answer: 1,
      because:
        'The assumptions. The conservative edges come from a climate model asking what a water-rich planet can survive; the optimistic edges come from asking what our own neighbors rule out. Both are defensible and both are published. Which you use depends on what question you are asking, and a paper that quotes a habitable zone should say which one it means.',
    },
    {
      type: 'explore',
      title: 'The wider definition, on the real Sun',
      body: `Back to the live Solar System, with one change: the habitable zone
             is now drawn using the <strong>optimistic</strong> definition. The
             star has not changed. The planets have not changed. Only the
             assumption about what counts as an edge.
             \n\nThe inner edge has jumped from 0.98 AU in towards
             <strong>0.75 AU</strong>, which is a large move on screen. The
             outer edge has barely shifted, from 1.69 to 1.77 AU.
             \n\nLook carefully at Venus.`,
      checklist: [
        'Find the new inner edge and compare it with where Venus orbits, at 0.72 AU.',
        'Check the outer edge against Ceres at 2.77 AU.',
        'Count how many worlds are inside the ring now, and compare with the count you made on the conservative definition.',
      ],
      setup: HZ_RINGS_WIDE,
      tip: 'The optimistic inner edge is the Recent Venus limit, and it is set by Venus itself: the argument is that Venus has had no surface water for at least a billion years, so wherever Venus is must already be too close. Venus therefore sits just inside its own limit, by about 0.03 AU. The definition is nearly touching the evidence it was built from.',
    },
    {
      type: 'question',
      title: 'What the wider band bought',
      kind: 'choice',
      body: `Switching to the optimistic definition moved the inner edge inward
             by almost a quarter of an astronomical unit.`,
      prompt:
        'How many additional Solar System worlds did that bring inside the zone?',
      options: [
        'Two: Venus and Ceres',
        'One: Venus',
        'None',
        'One: Mars, which was outside the conservative zone',
      ],
      answer: 2,
      because:
        'None. Venus at 0.72 AU still falls just inside the optimistic inner edge at 0.75, and Ceres at 2.77 is nowhere near the outer edge at 1.77. Mars was already inside the conservative zone. So the two published definitions, which disagree about the edges by a wide margin, agree completely about our own Solar System: two worlds in the zone, and one of them is Mars.',
    },
    {
      type: 'question',
      title: 'Venus, by the rule you already have',
      kind: 'numeric',
      body: `You do not need a climate model to see why Venus is a hard case.
             Venus orbits at 0.72 AU. Use the rule from the first half of this
             lesson: starlight goes as 1 / d².
             \n\n0.72 squared is about 0.52.`,
      prompt: 'Starlight at Venus, in Earths',
      unit: 'Earths',
      answer: 1.92,
      tolerance: 0.12,
      because:
        'About 1.9 Earths. Venus receives nearly twice the starlight Earth does, which is what puts it inside the runaway greenhouse limit and outside the conservative zone. Its surface sits at about 460 °C, hot enough to melt lead, under an atmosphere ninety times heavier than ours. Note the direction of the argument: the extra starlight starts the process, the atmosphere finishes it.',
    },
    {
      type: 'read',
      title: 'A year on a circular orbit',
      body: `One thing has been quietly assumed so far: that a planet has
             <em>a</em> distance from its star. Most of the planets you have met
             in these lessons are on nearly circular orbits, and for those it is
             very nearly true.
             \n\nThe panel shows a planet on a perfectly circular orbit at
             1.2 AU. Underneath it is a graph of the starlight it receives
             through one complete year, with a marker that keeps pace with the
             planet.
             \n\nWatch the graph. It is a flat line.`,
      tool: {
        id: 'hz-orbit',
        values: { ecc: 0, semi: 1.2 },
        hide: ['ecc'],
        title: 'A circular year',
        note: 'The marker on the graph is the planet’s current position in its year. On a circular orbit the distance never changes, so neither does the starlight.',
      },
      tip: 'Earth’s orbit is not exactly circular: its eccentricity is 0.017, which makes the starlight vary by about seven percent over the year. That is small, and it is not what causes the seasons.',
    },
    {
      type: 'predict',
      title: 'Now stretch the orbit',
      body: `In a moment you will be able to raise the eccentricity, which
             stretches the circle into an ellipse. The star stays at one focus,
             so the planet swings in close on one side of the orbit and out far
             on the other.
             \n\nThe semi-major axis, the average of the closest and furthest
             distances, will stay the same.`,
      prompt: 'On a stretched orbit, the starlight the planet receives will…',
      options: [
        'stay constant, because the average distance has not changed',
        'vary through the year, higher when the planet is closer',
        'vary through the year, higher when the planet is further away',
        'drop to zero for part of the year',
      ],
      answer: 1,
      because:
        'It varies, and it peaks when the planet is closest. Because the relationship goes as the inverse square, a modest stretch in the orbit makes a large swing in the starlight: on the orbit you are about to run, the planet receives seven times more at its closest point than at its furthest.',
    },
    {
      type: 'explore',
      title: 'Run an eccentric year',
      body: `Raise the eccentricity and watch both halves of the panel at once:
             the planet going round, and the marker tracing out the starlight
             graph beneath it.
             \n\nPay attention to <em>where the planet is when it is moving
             quickly</em>. It is not moving at a constant speed, and it never
             was: this is Kepler's second law, and it matters for the next
             screen.`,
      tool: {
        id: 'hz-orbit',
        values: { ecc: 0.45, semi: 1.2 },
        title: 'An eccentric year',
        note: 'Run and pause with the buttons underneath. The two closest and furthest distances, and the starlight at each, are in the rows below.',
      },
      checklist: [
        'Set the eccentricity to about 0.45 and let it run a full lap',
        'Watch the marker race through the tall peak on the graph',
        'Watch it crawl through the long flat trough',
        'Compare the starlight at the closest and furthest points in the readout',
      ],
      tip: 'The peak on the graph is narrow and the trough is wide. That is not a drawing choice: the planet really does spend most of its year in the cold outer part of the orbit, and hurries through the hot part.',
    },
    {
      type: 'explore',
      title: 'Crossing the edges',
      body: `Now the habitable zone is drawn on both halves of the panel: as a
             ring around the star, and as a horizontal band on the graph. They
             are the same information twice.
             \n\nThis particular orbit does not stay inside it. Watch the planet
             leave the ring at one end of its year and come back at the other,
             and watch the graph line cross out of the band at the same moment.
             \n\nThe readout now gives the fraction of the <em>year</em> spent
             inside the zone.`,
      tool: {
        id: 'hz-orbit',
        values: { ecc: 0.45, semi: 1.2 },
        showZone: true,
        title: 'In and out of the zone',
        note: 'The dashed line is the inner edge, the dotted line the outer edge, on both the orbit and the graph.',
      },
      checklist: [
        'Let it run until you have seen the planet leave and return',
        'Pause it while the planet is outside the ring',
        'Read the fraction of the year spent inside the zone',
        'Set the eccentricity to 0.3 and read that fraction again',
      ],
      tip: 'The fraction is measured in time, not in distance around the loop. Those are different numbers, because the planet does not cover equal stretches of orbit in equal times.',
    },
    {
      type: 'question',
      title: 'Reading the fraction',
      kind: 'choice',
      body: `At an eccentricity of 0.45 this planet spends a little over half of
             its year inside the zone. At 0.3 it spends about three quarters
             there. On a circular orbit at the same average distance it never
             leaves.`,
      prompt:
        'What does "56% of the year inside the zone" tell you about the planet’s surface?',
      options: [
        'It has liquid water for 56% of the year and ice for the rest',
        'It freezes and thaws twice a year',
        'Less than the number suggests: it describes the starlight arriving, not the surface temperature',
        'Nothing at all, since the habitable zone is not real',
      ],
      answer: 2,
      because:
        'Less than it sounds like. The fraction describes incoming starlight against a climate model’s limits. An atmosphere and an ocean carry an enormous amount of heat and take a long time to change temperature, so a planet does not track the light arriving at it minute by minute any more than a beach cools the instant a cloud passes. A planet that dips outside the zone briefly each year may well be fine. The number is a useful flag, not a forecast.',
    },
    {
      type: 'predict',
      title: 'A real system, forty light years away',
      body: `Time to point all of this at a real object.
             \n\nTRAPPIST-1 is a very small, very cool star: about nine percent
             of the Sun's mass, barely bigger than Jupiter, with a surface
             temperature of 2,566 K against the Sun's 5,772. Its measured
             luminosity is 0.000553 Suns, which is about one eighteen-hundredth
             of the Sun's output. It has seven known rocky planets.`,
      prompt: 'Compared with the Sun’s, TRAPPIST-1’s habitable zone should be…',
      options: [
        'much further out, because cool stars need more room',
        'in about the same place, near 1 AU',
        'much closer in, because the star is so faint',
        'impossible to define for such a small star',
      ],
      answer: 2,
      because:
        'Much closer in. You worked this out two sections ago: the band tracks the square root of the luminosity. A star eighteen hundred times fainter has its band about forty times closer, which puts it at a few hundredths of an astronomical unit.',
    },
    {
      type: 'explore',
      title: 'All seven planets',
      body: `Here is the real system, with the habitable zone from the same
             model you have been using all lesson, calculated from TRAPPIST-1's
             measured luminosity and temperature.
             \n\nThe distance axis is compressed, because otherwise the inner
             planets would pile up on top of the star. Read the numbers, not the
             pixels.
             \n\nThe second panel puts the Solar System on the same axis. The
             whole seven-planet system would fit comfortably inside the orbit of
             Mercury.`,
      tool: {
        id: 'hz-trappist',
        values: { model: 0 },
        compare: true,
        title: 'TRAPPIST-1',
        note: 'Every planet is listed underneath with the starlight it receives and where it falls relative to the modeled zone.',
      },
      setup: HZ_TRAPPIST,
      checklist: [
        'Find planets b and c, closest to the star, and read their starlight',
        'Find e, f and g and read theirs',
        'Read where the zone begins and ends in AU',
        'Switch the zone definition to optimistic and see whether anything changes category',
        'Compare the scale with Mercury’s orbit in the lower panel',
      ],
      tip: 'TRAPPIST-1b receives about four times what Earth does, and TRAPPIST-1h about a seventh. The seven planets span that entire range within six hundredths of an astronomical unit.',
    },
    {
      type: 'explore',
      title: 'Watch it run',
      body: `The diagram was a diagram. This is the simulation, with all seven
             planets on their real orbits and the habitable zone drawn at the
             same scale as everything else.
             \n\nThe view is zoomed in about thirty times further than the
             Solar System steps, because the entire system is six hundredths of
             an astronomical unit across. TRAPPIST-1b completes an orbit in a
             day and a half; h takes nineteen days.
             \n\nOne caution is printed on the ring itself. TRAPPIST-1 at
             2,566 K is cooler than the temperature range the published fit
             covers, so the model is evaluated at its own lower limit rather
             than extrapolated past its data. That is a modeling decision, and
             the label says so rather than quoting the number as a measurement.`,
      checklist: [
        'Find the green ring and see how much of the system it covers.',
        'Watch the inner planets race and the outer ones crawl. b laps about twelve times for each lap of h.',
        'Click any planet to open its card and read its orbital period in days.',
        'Notice the note on the ring saying the star is cooler than the model covers.',
      ],
      setup: HZ_TRAPPIST_RUN,
      allowInspector: true,
      tip: 'The orbital periods here are not typed in. They come out of the same gravity solver as every other scenario, from the measured semi-major axes and the measured stellar mass. If they match the published values, that is the simulation agreeing with the observations.',
    },
    {
      type: 'measure',
      title: 'Take the readings yourself',
      body: `Rather than being told which planets fall where, read it off the
             instrument. The panel is back, on the conservative definition.
             \n\nWork down the list under the picture and record the starlight
             each of the three middle planets receives, in Earths. Then record
             where the zone begins and ends.`,
      fields: [
        {
          id: 'e',
          label: 'TRAPPIST-1e receives',
          unit: 'Earths',
          hint: '0.65',
        },
        {
          id: 'f',
          label: 'TRAPPIST-1f receives',
          unit: 'Earths',
          hint: '0.37',
        },
        {
          id: 'g',
          label: 'TRAPPIST-1g receives',
          unit: 'Earths',
          hint: '0.25',
        },
        { id: 'inner', label: 'Zone inner edge', unit: 'AU', hint: '0.0254' },
        { id: 'outer', label: 'Zone outer edge', unit: 'AU', hint: '0.0499' },
      ],
      validate: v => {
        const want = {
          e: 0.65,
          f: 0.37,
          g: 0.25,
          inner: 0.0254,
          outer: 0.0499,
        };
        const filled = Object.keys(want).filter(k => Number.isFinite(v[k]));
        if (filled.length < 5) return null;
        const off = filled.filter(
          k =>
            Math.abs(v[k] - want[k]) >
            Math.max(0.05 * want[k], 0.02 * want[k] + 1e-4)
        );
        if (off.length) {
          return {
            level: 'warn',
            message: `Check ${off.join(', ')} against the list under the picture. Each planet's row gives its starlight in Earths, and the top row gives the two edges.`,
          };
        }
        return {
          level: 'ok',
          message:
            'Those match. Now say it in words, and say it carefully: e, f and g lie within the modeled habitable zone. That is a statement about their orbits and their star, and it is the correct thing to say. It is not a statement that any of them has water, an atmosphere, or a surface anyone would recognize.',
        };
      },
      tool: {
        id: 'hz-trappist',
        values: { model: 0 },
        presets: false,
        title: 'Read the values here',
        note: 'Every planet is listed under the picture with its distance, the starlight it receives, and where it falls relative to the modeled zone.',
      },
      tip: 'The three planets inside the zone receive between a quarter and two thirds of what Earth does. All three sit closer to their star than Mercury does to the Sun.',
    },
    {
      type: 'question',
      title: 'The question the name invites',
      kind: 'choice',
      body: `So: a rocky planet, the right size, orbiting inside its star's
             habitable zone.`,
      prompt:
        'Has it been shown that this planet has liquid water on its surface?',
      options: [
        'Yes: that is what the habitable zone means',
        'Yes, provided the planet is rocky and roughly Earth-sized',
        'No: the zone is calculated from the star alone and says nothing about the planet',
        'No, but only because we cannot see the planet well enough yet',
      ],
      answer: 2,
      because:
        'No, and the reason is not that our telescopes are too small. The habitable zone is computed from a star’s luminosity and temperature. Nothing in that calculation knows whether the planet has an atmosphere, whether it has any water to begin with, what it is made of, or what its surface is doing. Being inside the zone means the planet is receiving an amount of energy that would be compatible with surface liquid water if a great many other things also happened to be true.',
    },
    {
      type: 'explore',
      title: 'Three planets that all look promising',
      body: `To see how much room that leaves, consider three planets that all
             receive close to one Earth of starlight and all sit inside their
             star's habitable zone.
             \n\nOn the one number this lesson has spent forty minutes on, they
             are identical. Look at what else is known about each.
             \n\nFor context from our own system: Venus and Earth are nearly the
             same size and receive starlight within a factor of two of each
             other, and their surfaces differ by more than four hundred degrees.
             Mars receives 0.43 Earths and has a surface that would be far
             warmer with a thicker atmosphere than the thin one it has. Distance
             matters enormously, and it is not the only thing that matters.`,
      tool: {
        id: 'hz-candidates',
        values: { which: 0 },
        title: 'Three candidates',
        note: 'All three receive similar starlight and all three are inside the modeled zone. Everything else about them differs.',
      },
      checklist: [
        'Look at Planet A: what is known, and what is not',
        'Look at Planet B',
        'Look at Planet C, and at its size compared with Earth',
        'Decide which you would spend telescope time on before reading on',
      ],
      tip: 'A planet larger than about 1.6 Earth radii is usually not a bare rock: it tends to have kept a thick hydrogen envelope, which means no surface in the sense we mean.',
    },
    {
      type: 'question',
      title: 'Which one would you observe next?',
      kind: 'choice',
      body: `Telescope time is the scarcest resource in astronomy. You can have
             a spectrum of one of these three.
             \n\nThe question is not which one has life. It is which one is the
             most promising to study.`,
      prompt:
        'Which planet is the strongest follow-up target on this evidence?',
      options: [
        'Planet A: rocky and Earth-sized, with no atmosphere detected',
        'Planet B: rocky, slightly larger than Earth, atmosphere detected but not yet characterised',
        'Planet C: 1.6 Earth radii with an extended atmosphere, around a frequently flaring star',
        'None of them: without a temperature measurement there is nothing to choose between them',
      ],
      answer: 1,
      because:
        'Planet B. It is the only one of the three that is both small enough to plausibly be rocky and known to have an atmosphere, and its star is not actively stripping that atmosphere away. That combination is what a spectrum could actually say something about. Planet A may still have an atmosphere too thin to have shown up, and Planet C is large enough that it is probably a small gas-rich world rather than a rocky one. None of this establishes that B is habitable. It establishes that B is where the next observation should point.',
    },
    {
      type: 'question',
      title: 'One more, and then you are done',
      kind: 'choice',
      body: `A new discovery is announced. A rocky planet, close to Earth's
             size, orbiting inside the conservative habitable zone of its star
             and receiving 0.9 Earths of starlight. Its star flares often. No
             atmosphere has been measured yet.
             \n\nA headline calls it a second Earth.`,
      prompt: 'What can honestly be concluded from what is known?',
      options: [
        'That the planet is habitable',
        'That the planet probably has liquid water, given its size and position',
        'That it receives an amount of starlight compatible with surface liquid water under suitable conditions, making it worth studying further',
        'Nothing, because the star flares',
      ],
      answer: 2,
      because:
        'The third. It is a genuinely interesting object and the discovery is genuinely worth making, and everything past "worth studying further" is unsupported. The flaring is a real concern for whether an atmosphere survives, but it does not by itself rule the planet out, and a single unmeasured atmosphere is exactly the gap the next observation is for. The habitable zone did its job here: it told astronomers where to point.',
    },
    {
      type: 'read',
      title: 'What you worked out',
      body: `Starting from a planet and a star, you found all of this yourself:
             \n\n<strong>Further away → less starlight.</strong> Twice as far,
             one quarter as much, because the light spreads over a sphere whose
             area grows as the square of the distance.
             \n\n<strong>More luminous star → habitable zone further out.
             Less luminous star → habitable zone closer in.</strong> A star a
             hundred times brighter has its zone ten times further out.
             \n\n<strong>Eccentric orbit → the starlight changes through the
             year</strong>, and the planet spends most of that year in the cold
             outer part of its orbit rather than the hot inner part.
             \n\n<strong>Inside the habitable zone is not the same as
             habitable</strong>, and it is not remotely the same as inhabited.
             The zone is calculated from the star alone.
             \n\nWhich leaves the habitable zone doing something genuinely
             valuable, just not the thing its name suggests. There are billions
             of planets in the galaxy and a handful of telescopes able to take
             their spectra. The habitable zone is how you decide which ones to
             look at first.
             \n\nIt is an excellent place to start looking. It is not the answer
             to whether a world is habitable.`,
      tip: 'The phrase "Goldilocks zone" is older than the science and has done real damage to how the idea is understood. Every professional paper uses "circumstellar habitable zone", and every one of them means the careful definition you read earlier.',
    },
  ],
};

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

export const RADIAL_VELOCITY = {
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

// --- The Missing Mass --------------------------------------------------------
// The short one. Fifteen steps against the thirty-seven of the exoplanet
// lessons, because it makes a single argument and the argument is short: you
// can weigh a system two ways, by adding up its light and by watching how it
// moves, and for anything bigger than a solar system the two answers do not
// agree.
//
// The order is the historical order, and it is also the pedagogical one. The
// Solar System first, because it is the case where the two answers do agree and
// so it establishes what the method is. Then a galaxy as it would be if the
// light told the truth. Then a galaxy as telescopes actually find it. Then
// Zwicky's cluster, which came first in time and lands harder once a student
// has already seen one system misbehave.
//
// Nothing in this lesson asks a student to believe in dark matter. It asks them
// to make two measurements and notice that they disagree, which is all the
// evidence itself does.

const DM_SOLAR = {
  scenario: 'Solar System',
  seed: 'missing-mass',
  paused: false,
};

const DM_EXPECTED = {
  scenario: 'Spiral Galaxy',
  seed: 'missing-mass',
  paused: false,
};

const DM_OBSERVED = {
  scenario: 'Milky Way Rotation',
  seed: 'missing-mass',
  paused: false,
};

// Paused, and on a fixed seed, so that every student measuring this cluster
// measures the same cluster. A swarm on randomly oriented orbits changes its
// dispersion and its extent as it moves, and a lesson that asks a class to
// compute a number from a moving target gets thirty different numbers and no
// way to tell a mistake from a moment.
const DM_CLUSTER = {
  scenario: 'Coma Cluster',
  seed: 'zwicky',
  paused: true,
};

export const DARK_MATTER = {
  id: 'missing-mass',
  thumbnail: 'images/scenarios/milky-way-rotation.webp',
  title: 'The Missing Mass',
  subtitle: 'Weigh a system twice, and find the two answers do not agree',
  duration: '45-60 min',
  level: 'Introductory astronomy',
  lock: { placement: true, inspector: false, areaSweep: false },
  summary:
    'There are two ways to weigh a system in space: add up the light, or watch how things move. For the Solar System the two agree. For a galaxy they do not, and for a cluster of galaxies they are out by more than a factor of ten. Students arrange mass and watch the rotation curve it makes, turn a measured speed into an enclosed mass, then take a real galaxy’s curve and try to fit it with stars alone — and fail, in the specific way the field failed for a decade, before adding a halo and getting it right. It closes on Zwicky’s cluster and the mass budget of the universe. It is how dark matter was found, and it is a measurement rather than a theory.',
  objectives: [
    'Explain why orbital speed falls as the inverse square root of radius when the mass is concentrated in the middle',
    'Read a rotation curve and describe what its slope says about where the mass is',
    'Convert a measured orbital speed into an enclosed mass, and state what a flat curve implies about how that mass grows with radius',
    'Decompose a measured rotation curve into a stellar disc and a dark halo, and judge a fit against the measurement errors',
    'Argue from the shape of the residual, not just its size, that no arrangement of visible matter reproduces a flat curve',
    'Apply the virial theorem to a cluster of galaxies to estimate its mass from the motion of its members, including the conversion from a line-of-sight dispersion',
    'Compare a dynamical mass with a visible mass and quantify the discrepancy',
    'Distinguish what these measurements establish from what they do not',
  ],
  steps: [
    // --- Part 1: what the shape of a curve is telling you --------------------
    {
      type: 'read',
      title: 'Two ways to weigh a thing you cannot touch',
      setup: DM_SOLAR,
      body: `You cannot put a galaxy on a scale. There are two ways to find out
             how much a system in space weighs, and they are completely
             independent of each other.
             \n\nThe first is to <strong>add up what you can see</strong>. Count
             the stars, work out the mass of each from its brightness and colour,
             and add. This is what astronomers mean by the visible mass, or the
             luminous mass.
             \n\nThe second is to <strong>watch how things move</strong>. Gravity
             sets the speed of an orbit, so an orbital speed and an orbital
             radius together give you the mass that must be inside. This is the
             dynamical mass.
             \n\nThe two ways are measuring the same thing, so they had better
             agree. This lesson is about three systems. In the first, they do.`,
      tip: 'Open the Rotation Curve panel from the Tools section of the right-hand rail. Leave it open: you will use it for the whole lesson.',
    },
    {
      type: 'explore',
      title: 'Put the mass somewhere',
      tool: { id: 'dm-shapes' },
      body: `Before measuring anything, get a feel for what a rotation curve is
             for. A curve of orbital speed against radius is not a picture of the
             stars. It is a readout of <strong>where the mass is</strong>, and
             nothing else.
             \n\nThis instrument holds the total mass fixed and lets you rearrange
             it. Every one of the four arrangements contains the same amount of
             matter inside 30 kpc. Look at how differently they spin.`,
      checklist: [
        'Press each of the four preset buttons in turn and watch the curve change shape',
        'On "Solar System", note the speed falling away: the outer orbits are the slow ones',
        'On "Uniform ball", drag the spread slider and watch the peak follow the edge of the ball',
        'On "Spiral disc", notice the curve rises, peaks and then falls: still not flat',
        'On "What galaxies do", read the outer slope and compare it with the first preset',
      ],
      tip: 'The "outer slope" number is the exponent in v ∝ rⁿ. Keplerian is −0.5. Flat is 0. It is the single number this whole lesson turns on.',
    },
    {
      type: 'question',
      title: 'Which arrangement gives a flat curve?',
      kind: 'choice',
      tool: { id: 'dm-shapes' },
      body: `You have just seen four ways of arranging the same mass, and only one
             of them produced a curve that stays level as you go out. Use the
             instrument to check your answer before committing to it.`,
      prompt: 'A rotation curve stays flat when…',
      options: [
        'the mass is concentrated in the middle',
        'the mass is in a ball with a definite edge',
        'the mass is in a disc that thins out with radius',
        'the mass keeps being added as you go further out',
      ],
      answer: 3,
      because: `Only the fourth. The first three all have something in common: the
                mass runs out somewhere, and past that point going further out
                adds nothing to the total inside your orbit. Once the enclosed
                mass stops growing, the speed has to fall. A flat curve is the
                signature of a mass distribution that has not finished yet, and
                that is a strange thing for a galaxy to be, because galaxies
                visibly do end.`,
    },
    {
      type: 'explore',
      title: 'The Solar System, plotted',
      body: `Now a real system, measured live. The panel is plotting one point for
             every body in the Solar System: how far it is from the Sun, across,
             and how fast it is moving, up. Both axes are the real, measured
             values, taken from the simulation this instant. Nothing is fitted.
             \n\nThe dashed red line is the prediction. It is
             √(G·M/r) using only the mass of the objects on screen: what the
             speeds ought to be if the things you can see are all the mass there
             is.
             \n\nThe points sit on the line.`,
      checklist: [
        'Find Mercury at the left-hand end and Neptune at the right',
        'Notice that the inner planets are the fast ones',
        'Check that the measured points follow the dashed prediction across the whole range',
        'Read the "Outer slope" number at the top of the panel',
      ],
      probe: ctx => {
        const rc = ctx.rotationCurve();
        if (!rc || !rc.points.length) {
          return [{ label: 'Rotation curve', value: 'open the panel' }];
        }
        const inner = rc.points[0];
        const outer = rc.points[rc.points.length - 1];
        return [
          { label: 'Bodies plotted', value: String(rc.points.length) },
          {
            label: 'Innermost',
            value: `${ctx.distance(inner.r)} at ${ctx.speed(inner.speed)}`,
          },
          {
            label: 'Outermost',
            value: `${ctx.distance(outer.r)} at ${ctx.speed(outer.speed)}`,
          },
          {
            label: 'Fitted slope',
            value: rc.fit ? rc.fit.exponent.toFixed(3) : '—',
          },
        ];
      },
    },
    {
      type: 'question',
      title: 'What the slope means',
      kind: 'choice',
      body: `The panel reports the slope as a power: speed goes as radius raised
             to some exponent. For the Solar System that exponent is very close
             to −0.5, which is another way of writing v ∝ 1/√r.
             \n\nThat number is not a coincidence and it is not a fit to data.
             It falls straight out of setting the gravitational pull equal to
             what a circular orbit needs: v = √(G·M/r), with M the mass inside
             the orbit.`,
      prompt: 'Speed falls off as 1/√r in the Solar System because…',
      options: [
        'the outer planets are older and have slowed down',
        'almost all the mass is in the Sun, so M inside the orbit stops growing as you go out',
        'gravity gets weaker with distance, and that alone sets the speed',
        'the outer planets are lighter than the inner ones',
      ],
      answer: 1,
      because: `The Sun holds 99.8% of the mass of the Solar System. Past
                Mercury, going further out adds essentially nothing to the mass
                inside the orbit, so M is a constant in v = √(G·M/r) and only the
                r changes. Gravity does weaken with distance, but that is already
                inside the formula: what makes the exponent exactly −0.5 rather
                than something else is the mass staying put. Orbits do not decay
                on their own, and the outer planets are not the lightest ones:
                Jupiter is the heaviest thing here after the Sun.`,
    },

    // --- Part 2: turning a speed into a mass --------------------------------
    {
      type: 'explore',
      title: 'What the speed tells you about the mass',
      tool: { id: 'dm-enclosed' },
      body: `The relation you have been using runs both ways. Written as
             v = √(G·M/r) it predicts a speed from a mass. Rearranged, it does
             something far more useful:
             \n\n<strong>M(&lt;r) = v²·r / G</strong>
             \n\nA speed and a radius give you the mass inside, and the
             calculation says nothing at all about what that mass is made of or
             whether it gives off any light. That is the entire reason this
             method can find something a telescope cannot.
             \n\nThe top plot is a rotation curve. The bottom plot is the same
             measurement rearranged. Drag the radius marker and watch both.`,
      checklist: [
        'Start on "Falling curve" and drag the marker from 2 kpc out to 30',
        'Watch the bottom plot go flat: everything is already inside, so there is nothing left to enclose',
        'Switch to "Flat curve" and drag the marker out again',
        'Watch the bottom plot climb in a straight line, and read the "go out twice as far" row',
        'Switch to "A real galaxy" and compare the orange dashed line with the green one',
      ],
      tip: 'The bottom plot is not a second measurement. It is the top plot with one line of algebra applied to it.',
    },
    {
      type: 'question',
      title: 'What a flat curve requires',
      kind: 'choice',
      tool: { id: 'dm-enclosed', values: { shape: 1, radius: 10 } },
      body: `Go back to M(&lt;r) = v²·r/G, and this time treat the speed as known
             and the mass as the unknown. If v is the same at every radius, then
             M(&lt;r) is proportional to r.
             \n\nThe instrument will tell you the answer if you drag the marker.
             Work it out first.`,
      prompt: 'A flat rotation curve means that as you go further out…',
      options: [
        'the enclosed mass stops growing',
        'the enclosed mass keeps growing, in proportion to the radius',
        'gravity stops obeying the inverse square law',
        'the stars have too much angular momentum to fall in',
      ],
      answer: 1,
      because: `The enclosed mass has to keep growing, and specifically it has to
                grow in proportion to r. Double the radius and you have to double
                the mass inside to hold the speed constant. Out where the disc
                has run out of stars there is nothing visible left to supply it,
                yet the speed does not drop. Something out there is still adding
                mass. Modifying gravity is a real alternative and people have
                proposed it, but it is a different claim from this one and it is
                not what this measurement shows on its own.`,
    },
    {
      type: 'measure',
      title: 'Measure the enclosed mass yourself',
      tool: { id: 'dm-enclosed', values: { shape: 1, radius: 5 } },
      body: `Set the instrument to <strong>Flat curve</strong> and read the
             enclosed mass off the bottom plot at four radii. Then switch to
             <strong>Falling curve</strong> and read it once more, at 30 kpc, for
             the contrast.
             \n\nEvery number is in units of 10¹⁰ solar masses, which is what the
             readout gives you. Type the mantissa: for 5.23 × 10¹⁰, type 5.23.`,
      fields: [
        {
          id: 'flat5',
          label: 'Flat curve: mass inside 5 kpc',
          unit: '× 10¹⁰ M☉',
        },
        {
          id: 'flat10',
          label: 'Flat curve: mass inside 10 kpc',
          unit: '× 10¹⁰ M☉',
        },
        {
          id: 'flat20',
          label: 'Flat curve: mass inside 20 kpc',
          unit: '× 10¹⁰ M☉',
        },
        {
          id: 'flat30',
          label: 'Flat curve: mass inside 30 kpc',
          unit: '× 10¹⁰ M☉',
        },
        {
          id: 'kep30',
          label: 'Falling curve: mass inside 30 kpc',
          unit: '× 10¹⁰ M☉',
        },
      ],
      plot: {
        title: 'Your four measurements',
        xLabel: 'radius  (kpc)',
        yLabel: 'mass inside  (10¹⁰ M☉)',
        height: 190,
        points: v =>
          [5, 10, 20, 30].map(r => ({
            x: r,
            y: v[`flat${r}`],
            label: `${r}`,
          })),
        note: `Four points on a straight line through the origin. That is what
               "proportional to radius" looks like, and it is what the flat curve
               forces. Compare your last number: on the falling curve the mass
               inside 30 kpc is the same as the mass inside 10, because there is
               nothing out there.`,
      },
      tip: 'The radius slider stops at 30 kpc, which is about as far out as a real rotation curve can be measured before there is nothing left bright enough to see.',
    },

    // --- Part 3: the galaxy we expected, and the galaxy we found -------------
    {
      type: 'predict',
      title: 'Now a galaxy',
      setup: DM_EXPECTED,
      body: `A spiral galaxy is a disc of stars with a dense bulge in the
             middle, and most of its light comes from that bulge and the inner
             disc. In that respect it is built like the Solar System: bright and
             heavy in the center, thin and faint further out.
             \n\nThis scenario is a galaxy built on exactly that assumption. Every
             star was launched at the speed the visible mass says it should have.
             \n\nBefore you look at the panel, commit to an answer.`,
      prompt: 'The rotation curve of this galaxy will…',
      options: [
        'fall off as 1/√r, like the Solar System',
        'stay flat all the way out',
        'rise with radius',
        'have no particular shape',
      ],
      answer: 0,
      because: `It falls off as 1/√r. The reasoning is the same as for the Solar
                System and so is the answer: put most of the mass in the middle,
                and the mass enclosed by an orbit stops growing once you are
                outside the bulge. This scenario is the prediction, drawn out in
                full. The next one is what telescopes actually find.`,
    },
    {
      type: 'measure',
      title: 'Measure the expected curve',
      body: `Read the panel. The shaded strip on the left of the plot is the
             inner region, which is excluded from the fit: inside the bulge the
             curve rises with radius for reasons that have nothing to do with
             this lesson, and including it would drag the slope towards zero.
             \n\nRecord the slope and the shape the panel reports.`,
      fields: [
        { id: 'exp_slope', label: 'Outer slope (the exponent)', unit: '' },
        {
          id: 'exp_shape',
          label: 'Shape reported by the panel',
          unit: '',
          kind: 'text',
        },
        { id: 'exp_visible', label: 'Visible mass', unit: 'M☉' },
      ],
      tip: 'The slope will not be exactly −0.500 the way the Solar System’s was. The disc carries some mass of its own, so the enclosed total does keep growing a little.',
    },
    {
      type: 'read',
      title: 'What Rubin and Ford found',
      setup: DM_OBSERVED,
      body: `Through the 1960s and 1970s Vera Rubin and Kent Ford measured
             rotation curves of spiral galaxies, starting with Andromeda. Their
             instrument was a spectrograph: light from the approaching side of a
             galaxy is blueshifted, light from the receding side is redshifted,
             and the size of the shift gives the orbital speed at that radius.
             \n\nThey expected the curve to fall. It did not. In galaxy after
             galaxy the speed climbed out of the bulge, levelled off, and then
             simply stayed there, as far out as there was anything bright enough
             to measure.
             \n\nThis scenario is that result. Same disc, same visible mass, same
             number of stars. Every star is now moving at the speed a real galaxy
             gives, which is the same speed at every radius.`,
      tip: 'Look at the plot. The dashed red line has not moved: that is still the prediction from the visible mass. The points have.',
    },
    {
      type: 'measure',
      title: 'Measure the real curve',
      body: `Record what the panel reports now. The visible mass is unchanged
             from the previous scenario, so any difference is in the motion and
             not in the bookkeeping.`,
      fields: [
        { id: 'obs_slope', label: 'Outer slope (the exponent)', unit: '' },
        {
          id: 'obs_shape',
          label: 'Shape reported by the panel',
          unit: '',
          kind: 'text',
        },
        {
          id: 'obs_gap',
          label:
            'At the outer edge, roughly how many times faster are the stars moving than the dashed prediction?',
          unit: '×',
        },
      ],
    },

    // --- Part 4: do what the astronomers actually do -------------------------
    {
      type: 'read',
      title: 'Now do what the astronomers did',
      tool: { id: 'dm-fit', values: { haloVFlat: 0 } },
      body: `Measuring a flat curve is the easy half. The hard half, and the one
             that took the 1970s and 1980s to settle, is working out what mass
             distribution could possibly produce it — and showing that no
             arrangement of the visible matter will do.
             \n\nThat is a fitting problem, and it is what this instrument is.
             The pink points with error bars are a measured rotation curve. The
             sliders are a model of the galaxy: a disc of stars, and a halo of
             something else. Your job is to reproduce the points.
             \n\nThe rules are the ones a real astronomer works under. You may
             choose how much mass the disc has and how spread out it is, because
             neither is known precisely from the light alone. You may not move the
             data.`,
      tip: 'The panel scores you: "average miss" is how far your curve sits from the points, in km/s, and the data itself is only good to about ±5. Get under that and the plot says FITTED.',
    },
    {
      type: 'explore',
      title: 'Try it with stars alone',
      tool: {
        id: 'dm-fit',
        values: { haloVFlat: 0 },
        hide: ['haloVFlat', 'haloCore'],
      },
      body: `The halo is switched off and hidden. You have two sliders: how much
             mass is in the disc, and how far it is spread. Both are genuinely
             uncertain in a real galaxy, so this is a fair fight.
             \n\nTry to fit the curve. Really try — the point of this step is not
             to fail quickly.`,
      checklist: [
        'Start from the "Stars only" preset and look at where the model falls below the data',
        'Push the disc mass up until the outer points are matched, and look at what happened to the inner ones',
        'Bring the mass back down until the inner points are matched, and look at the outer ones',
        'Try spreading the disc out with the scale-length slider, and then squeezing it in',
        'Find the best "average miss" you can manage, and write down what it is',
      ],
      tip: 'A heavier disc lifts the whole curve. A wider disc moves its peak outward and flattens it a little. Neither changes the fact that a disc curve comes back down.',
    },
    {
      type: 'measure',
      title: 'Record your best stars-only fit',
      tool: {
        id: 'dm-fit',
        values: { haloVFlat: 0 },
        hide: ['haloVFlat', 'haloCore'],
      },
      body: `Whatever your best attempt was, record it. This is a real result and
             it is worth having in your own handwriting: it is the number that
             rules out the obvious explanation.`,
      fields: [
        { id: 'so_rms', label: 'Best average miss you achieved', unit: 'km/s' },
        { id: 'so_disc', label: 'Disc mass that gave it', unit: '× 10¹⁰ M☉' },
        {
          id: 'so_worst',
          label: 'Radius where the model missed worst',
          unit: 'kpc',
        },
        {
          id: 'so_sign',
          label: 'At that radius, was your model too fast or too slow?',
          unit: '',
          kind: 'text',
        },
      ],
      tip: 'The best possible stars-only fit leaves an average miss of about 15 km/s, three times the measurement error, and it is worst at the outer edge. If you got close to that, you found the real answer.',
    },
    {
      type: 'question',
      title: 'Why a heavier disc cannot rescue it',
      kind: 'choice',
      tool: {
        id: 'dm-fit',
        values: { haloVFlat: 0 },
        hide: ['haloVFlat', 'haloCore'],
      },
      body: `You have just discovered something that took the field a decade to
             accept. Adding mass to the disc does lift the outer curve — but it
             lifts the inner curve at the same time, and by more.`,
      prompt: 'No disc, at any mass, fits the whole curve because…',
      options: [
        'a disc cannot hold enough mass to matter',
        'the shortfall is not just an amount, it is the wrong shape: the data needs mass added where the light is not',
        'the outer measurements are less reliable than the inner ones',
        'discs are two-dimensional and galaxies are three-dimensional',
      ],
      answer: 1,
      because: `The problem is the shape of the shortfall, not its size. A disc's
                contribution peaks a couple of scale lengths out and then declines,
                because that is where its mass is. The data does not decline. To
                fix the outer curve without wrecking the inner one you need mass
                that is <em>negligible in the middle and dominant at the edge</em>,
                which is the opposite of how light is distributed in every spiral
                ever photographed. A disc can be made heavier; it cannot be made
                to have that shape. The outer points are, if anything, measured
                more reliably than the inner ones, because they come from cold
                hydrogen gas that extends well beyond the stars.`,
    },
    {
      type: 'explore',
      title: 'Now add the halo',
      tool: {
        id: 'dm-fit',
        values: { discMass: 3.3, discScale: 2.6, haloVFlat: 0 },
      },
      body: `Two more sliders, controlling a component that is not made of stars.
             The halo's flat speed sets how much of it there is; its core radius
             sets how quickly it takes over from the disc.
             \n\nGet the plot to say FITTED.`,
      checklist: [
        'Set the disc back to about 3.3 and its scale length to about 2.6',
        'Raise the halo strength from zero and watch the outer curve lift while the inner curve barely moves',
        'Adjust the core radius until the two components hand over smoothly',
        'Drive the average miss below 5 km/s and read the FITTED marker',
        'Read the last row: how much dark mass there is for every unit of visible mass',
      ],
      tip: 'This is the shape the halo has to have, and the reason the pseudo-isothermal profile is used: negligible in the middle, growing without limit outward. Nothing made of stars does that.',
    },
    {
      type: 'measure',
      title: 'Record the fit that works',
      tool: { id: 'dm-fit' },
      body: `Write down the model that fitted. These four numbers are a
             decomposition of a galaxy, and they are the same four numbers a
             published rotation-curve paper reports.`,
      fields: [
        { id: 'fit_vflat', label: 'Halo flat speed', unit: 'km/s' },
        { id: 'fit_core', label: 'Halo core radius', unit: 'kpc' },
        { id: 'fit_rms', label: 'Average miss', unit: 'km/s' },
        { id: 'fit_visible', label: 'Visible mass', unit: '× 10¹⁰ M☉' },
        {
          id: 'fit_halo',
          label: 'Halo mass inside 30 kpc',
          unit: '× 10¹⁰ M☉',
        },
      ],
      tip: 'A good fit lands near 150 km/s and a core of about 6 kpc, with an average miss around 2 km/s. There is a genuine degeneracy between the two halo sliders, which is why real papers quote them together with a covariance.',
    },
    {
      type: 'question',
      title: 'How much of it is dark?',
      kind: 'numeric',
      tool: { id: 'dm-fit' },
      body: `You fitted a galaxy. Divide the halo mass inside 30 kpc by the
             visible mass and you have the headline number of forty years of
             galaxy dynamics.`,
      prompt: 'Halo mass inside 30 kpc, divided by visible mass',
      unit: '×',
      answer: 3.4,
      tolerance: 0.9,
      because: `About three and a half. Roughly three-quarters of the mass inside
                the visible extent of this galaxy is in something that gives off
                no light — and the fraction keeps climbing if you measure further
                out, because the halo's mass keeps growing while the disc's does
                not. Note carefully what this is and is not: it is a mass you
                measured from motion, minus a mass you measured from light. It is
                not a claim about what the difference is made of.`,
    },

    // --- Part 5: what the halo actually does --------------------------------
    {
      type: 'explore',
      title: 'What the halo is holding',
      tool: { id: 'dm-flyby' },
      body: `A halo is a term in the force law. It has no position, it is not an
             object, and it is not drawn on the simulation, which makes it easy to
             suspect it of being a bookkeeping trick.
             \n\nIt is not. Here is a single star, launched on a circular orbit at
             the speed a real galaxy gives it at that radius. Watch it hold its
             orbit, then take the halo away while it runs.`,
      checklist: [
        'Press Run and watch the star complete an orbit with the halo on',
        'Compare the two speeds in the readout: the launch speed, and the speed the visible disc alone could hold',
        'Now drag the halo slider to OFF, without touching anything else',
        'Watch the star leave. It has not been given any extra energy: the mass holding it was removed',
        'Try relaunching at 8 kpc with the halo off, where the disc still dominates, and see it stay',
      ],
      tip: 'This is exactly the situation the flat rotation curve presents. Real stars at 20 kpc really are moving at this speed, and the visible mass really cannot hold them.',
    },
    {
      type: 'explore',
      title: 'Take the halo away from the whole galaxy',
      setup: DM_OBSERVED,
      body: `Now the same experiment on ninety stars at once, in the live
             simulation rather than a model panel.
             \n\nThis scenario has a dark-matter halo switched on, and the panel
             draws it as the solid blue line the points are sitting on. Switch it
             off with the toggle in the panel and watch what happens to the disc.`,
      checklist: [
        'Switch the Dark matter halo toggle off and let the simulation run',
        'Watch the stars begin to drift outward: at these speeds the visible mass cannot hold them',
        'Watch the measured points climb away from the solid line and the disc come apart',
        'Switch the halo back on and reload the scenario to restore it',
      ],
      probe: ctx => {
        const rc = ctx.rotationCurve();
        if (!rc) return [{ label: 'Rotation curve', value: 'open the panel' }];
        const outer = rc.points.length ? rc.points[rc.points.length - 1] : null;
        return [
          { label: 'Halo', value: ctx.haloOn() ? 'On' : 'Off' },
          {
            label: 'Outermost star',
            value: outer ? ctx.distance(outer.r) : '—',
          },
          {
            label: 'Slope',
            value: rc.fit ? rc.fit.exponent.toFixed(3) : '—',
          },
        ];
      },
      tip: 'The stars do not stop suddenly. They keep the speed they had and simply stop being held, so the disc unwinds from the outside in.',
    },

    // --- Part 6: Zwicky got there first -------------------------------------
    {
      type: 'read',
      title: 'Forty years earlier',
      setup: DM_CLUSTER,
      body: `Rubin and Ford were not the first. In 1933 Fritz Zwicky pointed a
             spectrograph at the Coma Cluster, a swarm of about a thousand
             galaxies, and measured how fast its members were moving relative to
             each other.
             \n\nA cluster is not a disc. Its members are on long, randomly
             oriented orbits, so there is no rotation to plot: what there is
             instead is a spread of speeds. But the same logic applies. A bound
             system's members move at speeds set by the mass holding them, so the
             spread of speeds gives the mass.
             \n\nZwicky did the arithmetic, compared the answer with the light of
             the galaxies, and found the two out by a factor of several hundred.
             He named the excess <em>dunkle Materie</em>. Almost nobody took it
             seriously for four decades.
             \n\nThis cluster is paused, so that everyone measuring it measures
             the same thing.`,
      tip: 'The panel now shows a Cluster measurements block. A rotation curve is the wrong instrument for a swarm; those three numbers are the right one.',
    },
    {
      type: 'explore',
      title: 'Zwicky’s arithmetic, and the two ways to get it wrong',
      tool: { id: 'dm-virial' },
      body: `Before doing it on the simulated cluster, do it on the real one. This
             instrument holds the actual Coma Cluster: a measured line-of-sight
             velocity spread of about 1000 km/s across a radius of about 1.4 Mpc,
             against the mass of its galaxies and of the hot gas between them.
             \n\nThe virial theorem is the tool:
             \n\n<strong>M = (5/3)·R·⟨v²⟩ / G</strong>
             \n\nThe only difficulty in the whole calculation is the step from a
             measured σ to ⟨v²⟩, and there are two classic ways to get it wrong.
             Both are on the third slider. Try them.`,
      checklist: [
        'Start on "Coma, done right" and read the two bars against each other',
        'Switch to "Forget the factor of 3" and watch the mass fall by exactly three',
        'Switch to "Forget to square it" and watch the discrepancy disappear entirely',
        'Go back to the correct setting and drag the σ slider: notice the mass goes as σ², not σ',
        'Note how much of the visible mass is hot gas rather than galaxies',
      ],
      tip: 'A spectrograph measures one component of a velocity, not three. If the orbits are randomly oriented, each direction carries an equal share, so ⟨v²⟩ = 3σ². That factor of three is the step everyone drops.',
    },
    {
      type: 'measure',
      title: 'Measure the simulated cluster',
      body: `Now the cluster in the simulation. Switch to <strong>simulation
             units</strong> using the Physical units button in the Tools section
             of the rail. That is not cosmetic. In the app's own units the
             gravitational constant G is exactly 1, so the arithmetic below has no
             unit conversions in it at all, and a mass comes out directly in
             simulation mass units.
             \n\nRecord the three numbers.`,
      fields: [
        { id: 'cl_n', label: 'Number of member galaxies', unit: '' },
        {
          id: 'cl_sigma',
          label: 'Speed spread σ',
          unit: 'simulation units per time',
        },
        { id: 'cl_R', label: 'Cluster radius R', unit: 'simulation units' },
        {
          id: 'cl_visible',
          label: 'Visible mass: the galaxies themselves',
          unit: 'M☉',
        },
      ],
      tip: 'One thousand simulation mass units is one solar mass, which is the conversion you will need at the end.',
    },
    {
      type: 'question',
      title: 'Weigh the cluster by its motion',
      kind: 'numeric',
      body: `For any system held together by its own gravity and settled down,
             the kinetic and potential energies are locked in a fixed ratio:
             2K + U = 0. This is the virial theorem, and it is what turns a
             spread of speeds into a mass.
             \n\nWrite the kinetic energy as K = ½·M·⟨v²⟩, and take the potential
             energy of a uniform sphere, U = −(3/5)·G·M²/R. Substitute, cancel one
             factor of M, and rearrange:
             \n\n<strong>M = (5/3)·R·⟨v²⟩ / G</strong>
             \n\nThe simulation is planar, so its velocities are spread over two
             dimensions rather than three, and the spread the panel reports is
             already the full two-dimensional one rather than a line-of-sight
             projection. So ⟨v²⟩ is simply σ², and in simulation units G is 1 and
             drops out. That leaves M = (5/3)·R·σ², which gives a mass in
             simulation units. Divide by 1000 to turn it into solar masses.`,
      tip: 'The uniform-sphere assumption is an approximation and the estimator is only good to a factor of order one. That is enough: the discrepancy you are about to find is far larger than the error in the method, which is exactly why the result survived.',
      prompt:
        'The dynamical mass of the cluster, in solar masses (this is a scale model, so treat the number as the model’s own)',
      unit: 'M☉',
      answer: 1756,
      tolerance: 180,
      because: `σ = 20.46 and R = 2516, so ⟨v²⟩ = 418.7 and
                M = (5/3) × 2516 × 418.7 = 1.76 × 10⁶ simulation mass units,
                which is 1756 solar masses in this model. If you got something a
                thousand times larger you forgot to convert; if you got something
                near 84,000 you used σ rather than σ².`,
    },
    {
      type: 'question',
      title: 'Now compare',
      kind: 'numeric',
      body: `You have weighed the same cluster twice. Once by adding up its
             galaxies, which is the visible mass the panel reports, and once by
             watching how those galaxies move.`,
      prompt: 'Dynamical mass divided by visible mass',
      unit: '×',
      answer: 18.3,
      tolerance: 4,
      because: `About eighteen. The galaxies you can see account for roughly one
                twentieth of the mass needed to hold the cluster together at the
                speeds its members are actually moving. Zwicky's own figure for
                Coma was larger still, partly because the distance scale of the
                universe was wrong in 1933 and partly because he had no way to
                count the hot gas between the galaxies, which turns out to carry
                several times more mass than the galaxies do. The modern figure
                for Coma is around a factor of ten once that gas is included —
                which is the number the instrument two steps back reports.`,
    },

    // --- Part 7: what this does and does not establish ----------------------
    {
      type: 'question',
      title: 'What have you actually shown?',
      kind: 'short',
      body: `You have made three measurements now, in two kinds of system, using
             two different methods: you fitted a galaxy's rotation curve and found
             no arrangement of its stars would do, and you weighed a cluster by
             its motion and found five times more mass than light. Both say the
             same thing.
             \n\nBe careful about what follows from that.`,
      prompt:
        'In two or three sentences: what do these measurements establish, and what do they not establish? Name at least one thing other than a new kind of particle that could in principle explain them.',
      rubric: `They establish a discrepancy between mass inferred from motion and
               mass inferred from light, in systems larger than a planetary
               system. They do not establish what the extra mass is made of, or
               that it is made of anything at all. Credit any of: ordinary matter
               that is simply too faint to count (cold gas, dim stars, black
               holes, free-floating planets - collectively MACHOs), which was the
               leading hypothesis for decades and is now ruled out for most of the
               mass by microlensing surveys and by the abundances of light
               elements from big bang nucleosynthesis; or a modification of
               gravity on large scales, such as MOND, which fits rotation curves
               well and clusters poorly. Strong answers note that the two
               measurements here are independent of each other, which is what
               makes an error in either one an unlikely explanation, and that the
               rotation-curve result is a statement about the <em>shape</em> of the
               missing mass and not only its amount.`,
    },
    {
      type: 'read',
      title: 'How much of the universe is this?',
      tool: { id: 'dm-budget' },
      body: `You have been working on one galaxy and one cluster. It is fair to
             ask what the accounting looks like for everything.
             \n\nStep through the four layers. Each one takes the slice you were
             looking at and asks what it is made of.`,
      tip: 'The last layer is the one to sit with. Every star, nebula and galaxy ever photographed, in every wavelength, is about half a percent of the universe.',
    },
    {
      type: 'read',
      title: 'Where it stands',
      body: `The evidence has grown a great deal since 1933 and since 1970, and
             it no longer rests on rotation curves at all. The pattern of hot and
             cold spots in the cosmic microwave background, the way galaxies are
             distributed across the sky, how gravitational lensing bends light
             around clusters, and the abundances of hydrogen and helium left over
             from the first few minutes all point the same way, and they are
             sensitive to different things. Ordinary matter that happens to be
             dark cannot account for what they show; there has to be something
             that has mass and does not interact with light.
             \n\nWhat that something is, nobody knows. It has never been detected
             in a laboratory, no candidate particle has been found, and searches
             have been running for forty years. The Bullet Cluster, where two
             clusters passed through each other and the mass visibly separated
             from the gas, is the single hardest observation for modified-gravity
             alternatives to accommodate.
             \n\nThat is an honest place to leave it. The measurement is solid and
             has been repeated in a dozen independent ways. The explanation is a
             name for something we have not identified. Those are different kinds
             of statement and it is worth keeping them apart.`,
      tip: 'You fitted a real galaxy and weighed a real cluster. That part is not in doubt, and you did not have to take anyone’s word for it.',
    },
  ],
};

// Order matters: the browser lists them in this order, and the three exoplanet
// lessons form a sequence. Shadows measures a radius, Tug measures a mass and
// turns the pair into a density, and Goldilocks asks what that buys. Each still
// stands alone, but a student working straight down the list meets them in the
// order the inference chain is actually built.
//
// The Missing Mass sits after all of them. It belongs to no sequence, it is
// half the length of the others, and it uses an instrument none of them touch,
// so it reads as what it is: a short, self-contained argument at the end.

// --- 9. Tides ------------------------------------------------------------------

const TIDES_EARTH_MOON = {
  scenario: 'Earth-Moon System',
  seed: 'tides-lab',
  camera: { zoom: 2.2, pan: { x: 0, y: 0 } },
  paused: false,
};

const TIDES_DISRUPTION = {
  scenario: 'Tidal Disruption Event',
  seed: 'tides-lab',
  camera: { zoom: 0.9, pan: { x: 0, y: 0 } },
  paused: false,
};

const TIDES = {
  id: 'tides',
  thumbnail: 'images/scenarios/earth-moon-system.webp',
  title: 'Tides',
  subtitle:
    'Stretch a world, move a moon, and discover why gravity can tear objects apart',
  duration: '35-45 min',
  level: 'Introductory astronomy',
  lock: { placement: true, inspector: true },
  summary:
    'Tides are not caused by strong gravity. They are caused by gravity being unequal across an object, and the whole lesson is built on that one subtraction: take the pull on the centre away from the pull on the near side and the far side, and everything from the two daily high tides to a star being shredded by a black hole falls out of what is left.',
  objectives: [
    'Explain why an extended object feels a different gravitational pull at each point in it',
    'State that a tide is the difference between the local pull and the pull on the centre, and use that to say why there are two ocean bulges rather than one',
    'Measure how tidal strength changes with separation and with the mass of the companion, and state both relationships',
    'Compare the tide a body raises against that body’s own gravity, and predict whether it holds together',
    'Explain why a Roche limit is different for every pair of objects, and say what it does and does not predict',
  ],
  steps: [
    {
      type: 'read',
      title: 'Twice a day, everywhere',
      body: `Stand on almost any coast and the sea comes in and goes out roughly
             twice a day. Not once. Twice.
             \n\nThat "twice" is the whole puzzle. The Moon is on one side of
             the Earth at a time, and the ocean bulges on <em>both</em> sides at
             once: there is a high tide under the Moon and another high tide on
             the opposite face of the planet, twelve thousand kilometres away
             from it. Any explanation that amounts to "the Moon pulls the water
             toward it" predicts one bulge and is therefore wrong.
             \n\nOn screen is the real Earth-Moon system: the Earth at the
             centre and the Moon, <strong>Luna</strong>, on its 27.3 day orbit.
             The simulation is a straightforward Newtonian one, and that turns
             out to be all you need. Nothing in this lesson requires a force
             that is not already in that picture. What it requires is
             subtraction.`,
      tip: 'While a lesson is running, clicking selects an object without opening the inspector card, and placing new objects is switched off so a stray click cannot alter the system you are measuring.',
      setup: TIDES_EARTH_MOON,
      probe: ctx => {
        const moon = ctx.find('Luna');
        const el = moon && ctx.elements(moon);
        return [
          { label: 'Bodies on screen', value: 'Earth, and the Moon' },
          {
            label: 'Moon’s distance now',
            value: el ? ctx.distance(el.r) : 'building the system…',
          },
          { label: 'Real separation', value: '384,400 km, on average' },
        ];
      },
    },

    {
      type: 'predict',
      title: 'Is the pull the same everywhere?',
      body: `The Earth is not a point. It is a ball 12,742 km across, and the
             side facing the Moon is 12,742 km closer to the Moon than the side
             facing away.
             \n\nGravity weakens with distance. Commit to an answer before you
             are shown anything.`,
      prompt: 'The Moon’s gravitational pull on the Earth is…',
      options: [
        'exactly the same strength at every point in the Earth',
        'stronger on the side facing the Moon than on the far side',
        'stronger on the far side, because it has further to reach',
        'only felt at the Earth’s centre, where all the mass is treated as being',
      ],
      answer: 1,
      because:
        'Stronger on the near side. Gravity falls off with distance, and the near side really is closer, so it really is pulled harder. The last option is a genuinely useful half-truth: the Earth’s own gravity can be treated as coming from its centre, and for working out the Earth’s orbit the Moon can be too. But the Earth is being pulled by something outside it, and for that the difference between one part of the Earth and another is the entire story.',
    },

    {
      type: 'read',
      title: 'Three points, three pulls',
      body: `The panel shows the Earth with an arrow leaving three places on it:
             the <strong>near side</strong>, the <strong>centre</strong>, and
             the <strong>far side</strong>. The companion is off to the right,
             so every arrow points right.
             \n\nEach arrow is drawn in true proportion to the others. Look at
             them. At the Moon’s real distance they look identical, and that is
             not a failure of the drawing: the Earth is small compared with
             384,400 km, so the three distances are nearly the same and the
             three pulls are nearly the same.
             \n\nNow read the three numbers underneath the picture. They are not
             the same.`,
      tool: {
        id: 'tide-vectors',
        values: { dist: 1, mass: 1 },
        hide: ['mass'],
        title: 'The pull on three points of the Earth',
        note: 'Distance is in units of the Moon’s real distance. Leave it at 1.00 for now: this is the real Earth-Moon system.',
      },
      tip: 'Slide the distance down toward 0.2 and watch the three arrows stop looking alike. Bring it back to 1.00 before moving on.',
    },

    {
      type: 'question',
      title: 'How different are they?',
      kind: 'choice',
      body: `Read the three accelerations off the panel on the previous screen,
             or set the distance back to 1.00 here and read them again. The near
             side is pulled hardest, the far side least, and the centre sits
             between them.`,
      prompt:
        'At the Moon’s real distance, the pull on the near side is bigger than the pull on the far side by roughly…',
      options: [
        'a factor of two',
        'a factor of ten',
        'about seven percent',
        'nothing measurable: they are identical',
      ],
      answer: 2,
      because:
        'About seven percent. That is a tiny difference, and it is the entire cause of every ocean tide on Earth. Hold on to how small it is: a seven percent variation in a pull that is itself only about a three-hundred-thousandth of the Earth’s own surface gravity. Tides are a small residue of a small quantity, which is why the seas move a few metres rather than being ripped off the planet.',
      tool: {
        id: 'tide-vectors',
        values: { dist: 1, mass: 1 },
        hide: ['mass'],
        title: 'Read the three numbers again',
        note: 'Near side, centre, far side. The last row does the comparison for you.',
      },
    },

    {
      type: 'predict',
      title: 'So why two bulges?',
      body: `Everything you have seen so far points one way: toward the Moon.
             The near side is pulled toward the Moon, the centre is pulled
             toward the Moon, the far side is pulled toward the Moon. Nothing
             anywhere is pulled away from it.
             \n\nAnd yet there is a high tide on the far side of the Earth, at
             the same time as the one underneath the Moon. Commit to an
             explanation.`,
      prompt: 'The far-side bulge exists because…',
      options: [
        'the Moon pushes on the far side of the Earth',
        'centrifugal force from the Earth’s spin throws the water outward there',
        'the far side is pulled toward the Moon less than the Earth as a whole is, so it gets left behind',
        'the water displaced from the near side has to go somewhere',
      ],
      answer: 2,
      because:
        'The far side is left behind. Nobody pushes it: it is pulled toward the Moon like everything else, just less than average, so relative to the Earth as a whole it lags on the far side. That is the answer, and the next screen shows the arithmetic that produces it. The spin option is a common and stubborn story, and it is worth being clear that it is not the cause: the two bulges are there for a non-rotating Earth too, and the Earth’s rotation is what carries you through them twice a day rather than what creates them.',
    },

    {
      type: 'read',
      title: 'Take the centre away',
      body: `Here is the move that makes tides make sense.
             \n\nThe Earth as a whole is in free fall around the Earth-Moon
             centre of mass. It accelerates at whatever rate the pull on its
             <em>centre</em> dictates, and it carries everything on it along at
             that rate: you, the seas, the rocks. What you can feel is not the
             pull. It is the difference between the pull where you are and the
             pull the whole planet is being carried along by.
             \n\nSo subtract the centre’s pull from all three. The panel now
             shows both rows: the raw pulls on top, and underneath what is left
             after the subtraction.
             \n\n<strong>Near side:</strong> pulled harder than average, so what
             is left points toward the Moon.
             \n\n<strong>Centre:</strong> exactly average, so nothing is left. A
             dot.
             \n\n<strong>Far side:</strong> pulled less than average, so what is
             left points <em>away</em> from the Moon.
             \n\nStretched at both ends. Two bulges, from one pull, by
             subtraction.`,
      tool: {
        id: 'tide-vectors',
        values: { dist: 1, mass: 1 },
        hide: ['mass'],
        residual: true,
        title: 'The pulls, and what is left after the centre is taken away',
        note: 'The bottom row is drawn far larger than the top row, and the panel says by how much. Drawn to the same scale it would be invisible, which is exactly why the subtraction has to be done rather than looked at.',
      },
      tip: 'Nothing new has been added between the two rows. The bottom row is the top row minus one number.',
    },

    {
      type: 'question',
      title: 'What the far-side arrow means',
      kind: 'choice',
      body: `On the bottom row, the far-side arrow points away from the Moon.
             That is the thing most worth getting right in this entire lesson,
             so it is worth stating carefully.`,
      prompt: 'The outward-pointing far-side arrow means that…',
      options: [
        'gravity from the Moon reverses direction on the far side of the Earth',
        'the far side is still pulled toward the Moon, but less than the Earth’s centre is',
        'a second force, separate from gravity, acts on the far side',
        'the far side is beyond the Moon’s reach',
      ],
      answer: 1,
      because:
        'Still pulled toward the Moon, just less than average. Gravity never reverses and never switches off; there is no second force. The outward arrow is a bookkeeping result, not a push: it is what is left over after you subtract the acceleration the whole planet shares. If you insist on describing tides without subtracting the centre, you are stuck with one bulge and a coastline that disagrees with you twice a day.',
      tool: {
        id: 'tide-vectors',
        values: { dist: 1, mass: 1 },
        hide: ['mass'],
        residual: true,
        title: 'Both rows again',
        note: 'Compare the far-side arrows on the two rows. On the top it points toward the companion. On the bottom, after the subtraction, it points away.',
      },
    },

    {
      type: 'read',
      title: 'What a tide actually is',
      body: `A definition worth memorising, because it is short and it is the
             whole subject:
             \n\n<strong>A tide is the difference in gravitational acceleration
             across an object.</strong>
             \n\nNot the strength of gravity. The <em>difference</em> in it.
             This distinction does real work. You are, right now, being pulled
             on by the Sun about 180 times harder than by the Moon: the Sun is
             enormously more massive. And yet the Moon raises the bigger ocean
             tide, by more than a factor of two. Strong gravity and strong tides
             are simply not the same thing, and you will measure why in a few
             screens.
             \n\nThe same difference is at work everywhere gravity meets
             something with a size: the seas moving up a beach, a moon kept
             molten by being kneaded, a comet coming apart into a string of
             fragments, and a star being pulled into a stream around a black
             hole. One mechanism, and you have already seen all of it.`,
      quote: {
        text: 'The waters of the sea rise twice and fall twice in the space of a lunar day, and the greatest tides occur at the third hour after the appulse of the luminaries to the meridian of the place.',
        by: 'Isaac Newton, Principia, Book III, 1687',
      },
      tip: 'Newton got the two bulges right in 1687, in the same book that introduced universal gravitation. It was one of the first things his theory explained that no previous one could.',
    },

    {
      type: 'predict',
      title: 'Bring the companion closer',
      body: `You are about to be handed a distance slider, and a graph that
             records what you read off it. Before you touch either, commit.
             \n\nSuppose the Moon moved to half its present distance from the
             Earth, with nothing else changed.`,
      prompt: 'At half the distance, the tide the Moon raises would be…',
      options: [
        'twice as strong',
        'four times as strong',
        'eight times as strong',
        'unchanged, because the Moon’s mass has not changed',
      ],
      answer: 2,
      because:
        'Eight times. Most people say four, reasoning from the inverse-square law, and that reasoning is sound for the pull itself: halve the distance and the pull quadruples. But a tide is a difference between two pulls, and moving in closer makes the near and far distances differ by a larger fraction as well as making both pulls stronger. The two effects compound. You are about to measure it.',
    },

    {
      type: 'measure',
      title: 'Four distances',
      body: `The panel reports the tidal stretch as a multiple of the real lunar
             tide, so the real Moon reads 1.00 and everything else is measured
             against it.
             \n\nSet the slider to each of the four distances in turn and type
             what the panel says. Your points land on the graph as you type, so
             nothing has to be remembered from one row to the next.`,
      fields: [
        { id: 'd1', label: 'Distance 1', unit: '× Moon’s', hint: '2' },
        {
          id: 't1',
          label: 'Tidal stretch there',
          unit: '× lunar tide',
          hint: '0.13',
        },
        { id: 'd2', label: 'Distance 2', unit: '× Moon’s', hint: '1' },
        {
          id: 't2',
          label: 'Tidal stretch there',
          unit: '× lunar tide',
          hint: '1',
        },
        { id: 'd3', label: 'Distance 3', unit: '× Moon’s', hint: '0.5' },
        {
          id: 't3',
          label: 'Tidal stretch there',
          unit: '× lunar tide',
          hint: '8',
        },
        { id: 'd4', label: 'Distance 4', unit: '× Moon’s', hint: '0.25' },
        {
          id: 't4',
          label: 'Tidal stretch there',
          unit: '× lunar tide',
          hint: '64',
        },
      ],
      validate: v => {
        const rows = [
          [v.d1, v.t1],
          [v.d2, v.t2],
          [v.d3, v.t3],
          [v.d4, v.t4],
        ].filter(([d, t]) => Number.isFinite(d) && Number.isFinite(t));
        if (rows.length < 2) return null;
        if (rows.some(([d, t]) => d <= 0 || t <= 0)) {
          return {
            level: 'error',
            message: 'Distances and tidal strengths are both positive numbers.',
          };
        }
        // Every reading should satisfy tide x distance^3 = 1 at unit mass.
        const products = rows.map(([d, t]) => t * d * d * d);
        const mean = products.reduce((a, b) => a + b, 0) / products.length;
        const spread = (Math.max(...products) - Math.min(...products)) / mean;
        if (spread > 0.35) {
          return {
            level: 'warn',
            message:
              'These do not all sit on one relationship. The usual cause is a strength read at a different distance from the one beside it: check each row against the slider position that produced it.',
          };
        }
        return {
          level: 'ok',
          message: `Every one of your readings satisfies stretch × distance × distance × distance = ${mean.toFixed(2)}. Distance appears three times. Nobody told you that; it is in your own numbers.`,
        };
      },
      plot: {
        title: 'Your four readings',
        xLabel: 'distance  (× Moon’s)',
        yLabel: 'stretch  (× lunar tide)',
        height: 200,
        points: v => [
          { x: v.d1, y: v.t1, label: '1' },
          { x: v.d2, y: v.t2, label: '2' },
          { x: v.d3, y: v.t3, label: '3' },
          { x: v.d4, y: v.t4, label: '4' },
        ],
        transform: {
          label: 'Try 1 ÷ distance³',
          xLabel: '1 ÷ distance³',
          yLabel: 'stretch  (× lunar tide)',
          map: p => ({ x: 1 / (p.x * p.x * p.x), y: p.y, label: p.label }),
        },
        note: `Raw, the points climb away from the axis far too steeply for a
               straight line. Press <strong>Try 1 ÷ distance³</strong>: if the
               tide really does go as one over the distance cubed, they will
               drop onto a straight line through the corner. Straightening a
               curve by choosing the right axes is how a relationship gets
               identified rather than guessed.`,
      },
      tool: {
        id: 'tide-strength',
        values: { dist: 2, mass: 1 },
        hide: ['mass'],
        axis: 'distance',
        title: 'Read each distance here',
        note: 'Set the slider to 2, then 1, then 0.5, then 0.25, and type each reading into the boxes. The companion’s mass is held at the Moon’s.',
      },
      tip: 'The four suggested distances are only suggestions. Any four will do, so long as each strength was read at the distance beside it.',
    },

    {
      type: 'question',
      title: 'How steeply does it fall?',
      kind: 'numeric',
      body: `Look at rows 2 and 3 of your own table: you went from 1.00 to 0.50
             times the Moon’s distance, which is half the distance.
             \n\nAn ordinary inverse-square pull would have gone up by four. A
             tide is not an ordinary pull.`,
      prompt:
        'By what factor did the tidal stretch increase when you halved the distance?',
      unit: '×',
      answer: 8,
      tolerance: 0.6,
      because:
        'Eight, which is two cubed. Halving again multiplies by eight again: your fourth reading, at a quarter of the Moon’s distance, should be about 64 times the lunar tide. Distance enters three times over, not twice: the tide goes as one divided by the separation cubed. That is why the transformed plot straightens, and it is why tidal effects are almost always negligible until something gets close, and then suddenly are not.',
      tool: {
        id: 'tide-strength',
        values: { dist: 0.5, mass: 1 },
        hide: ['mass'],
        axis: 'distance',
        title: 'The curve you measured',
        note: 'The dot is your slider. Slide from 1.00 to 0.50 and watch the readout, if you want to check the factor directly.',
      },
    },

    {
      type: 'read',
      title: 'The relationship, written down',
      body: `You have measured it, so here it is in symbols. You are not being
             asked to derive it or to calculate with it, only to recognise the
             three things in it.
             \n\nFor a body of radius <em>R</em> sitting a distance <em>d</em>
             from a companion of mass <em>M</em>, the tidal stretch across it is
             about
             \n\n<strong>2 G M R ÷ d³</strong>
             \n\nRead it as three statements you already believe:
             \n\n<strong>M on top.</strong> A heavier companion stretches you
             harder. You will test this next.
             \n\n<strong>R on top.</strong> A bigger object gets stretched
             harder, because its two ends are further apart and so differ more.
             A pebble feels essentially no tide at all.
             \n\n<strong>d³ underneath.</strong> The one you just measured.
             Distance matters far more than anything else in the expression.
             \n\nOne honest caveat: this is an approximation, good when the
             object is small compared with its distance. It is excellent for the
             Moon on the Earth, and it gets worse as a body closes in on
             something. Later in this lesson, where that matters, the exact
             difference is used instead.`,
      tip: 'The 2 is not important. The three letters and where they sit are.',
    },

    {
      type: 'predict',
      title: 'Now change the companion',
      body: `Put the distance back where it started and change the other thing
             instead. Commit before you measure.
             \n\nSuppose the Moon kept its orbit exactly but was twice as
             massive.`,
      prompt: 'At twice the mass and the same distance, the tide would be…',
      options: [
        'unchanged',
        'twice as strong',
        'four times as strong',
        'eight times as strong',
      ],
      answer: 1,
      because:
        'Twice as strong. Mass enters once, plainly: double it and the tide doubles. This is much less dramatic than the distance relationship, and that contrast is the point of the next few screens. Where a companion sits matters enormously more than how heavy it is.',
    },

    {
      type: 'measure',
      title: 'Three masses',
      body: `The distance is now held at the Moon’s real distance and the mass
             slider is yours. Set it to each value in turn and record what the
             panel reads.
             \n\nThree points are plenty here, because you are looking for a
             straight line and three points either make one or do not.`,
      fields: [
        { id: 'm1', label: 'Mass 1', unit: '× Moon’s', hint: '1' },
        {
          id: 's1',
          label: 'Tidal stretch there',
          unit: '× lunar tide',
          hint: '1',
        },
        { id: 'm2', label: 'Mass 2', unit: '× Moon’s', hint: '2' },
        {
          id: 's2',
          label: 'Tidal stretch there',
          unit: '× lunar tide',
          hint: '2',
        },
        { id: 'm3', label: 'Mass 3', unit: '× Moon’s', hint: '4' },
        {
          id: 's3',
          label: 'Tidal stretch there',
          unit: '× lunar tide',
          hint: '4',
        },
      ],
      validate: v => {
        const rows = [
          [v.m1, v.s1],
          [v.m2, v.s2],
          [v.m3, v.s3],
        ].filter(([m, s]) => Number.isFinite(m) && Number.isFinite(s));
        if (rows.length < 2) return null;
        if (rows.some(([m, s]) => m <= 0 || s <= 0)) {
          return {
            level: 'error',
            message: 'Masses and tidal strengths are both positive numbers.',
          };
        }
        const ratios = rows.map(([m, s]) => s / m);
        const mean = ratios.reduce((a, b) => a + b, 0) / ratios.length;
        const spread = (Math.max(...ratios) - Math.min(...ratios)) / mean;
        if (spread > 0.25) {
          return {
            level: 'warn',
            message:
              'Stretch ÷ mass is not coming out the same for every row. Check that the distance slider stayed put while you changed the mass: moving both at once hides the relationship you are looking for.',
          };
        }
        return {
          level: 'ok',
          message: `Stretch ÷ mass is ${mean.toFixed(2)} for every row you filled in. A constant ratio is what a straight line through the corner looks like in a table.`,
        };
      },
      plot: {
        title: 'Your three readings',
        xLabel: 'companion mass  (× Moon’s)',
        yLabel: 'stretch  (× lunar tide)',
        height: 200,
        points: v => [
          { x: v.m1, y: v.s1, label: '1' },
          { x: v.m2, y: v.s2, label: '2' },
          { x: v.m3, y: v.s3, label: '3' },
        ],
        note: `No transformation offered this time, and none needed: if these
               three land on a straight line through the corner as they are,
               the relationship is as simple as a relationship gets.`,
      },
      tool: {
        id: 'tide-strength',
        values: { dist: 1, mass: 1 },
        hide: ['dist'],
        axis: 'mass',
        title: 'Read each mass here',
        note: 'Set the slider to 1, then 2, then 4 times the Moon’s mass. The distance is held at the Moon’s real distance.',
      },
      tip: 'If your three points make a straight line that goes through the corner of the graph rather than starting partway up an axis, the two quantities are simply proportional.',
    },

    {
      type: 'question',
      title: 'What the mass graph says',
      kind: 'choice',
      body: `Compare the two graphs you have now made. One of them bent away
             from the axis so steeply that it needed re-plotting before it would
             straighten. The other did not need anything.`,
      prompt: 'The tidal stretch a companion raises is…',
      options: [
        'proportional to its mass: double the mass, double the tide',
        'proportional to the square of its mass',
        'proportional to the cube of its mass, like the distance relationship',
        'independent of its mass once it is far enough away',
      ],
      answer: 0,
      because:
        'Simply proportional. Both relationships are now in your own numbers: one power of mass on top, three powers of distance underneath. Which is why the answer to "what raises the biggest tide" is almost never "the heaviest thing nearby".',
    },

    {
      type: 'predict',
      title: 'The Sun against the Moon',
      body: `Two bodies raise measurable tides on the Earth, and they are wildly
             mismatched.
             \n\nThe <strong>Sun</strong> is about 27 million times the Moon’s
             mass, and about 390 times further away.
             \n\nYou now know both relationships. One power of mass, three
             powers of distance. Work it out or guess it, but commit.`,
      prompt: 'The bigger ocean tide on Earth is raised by…',
      options: [
        'the Sun, by an enormous margin, because of its mass',
        'the Sun, but only slightly',
        'the Moon, by about a factor of two',
        'the Moon, by a factor of several hundred',
      ],
      answer: 2,
      because:
        'The Moon, by a bit more than two. The Sun brings 27 million times the mass, which helps it by a factor of 27 million. It is 390 times further away, which costs it 390 cubed, or about 59 million. The distance term wins, and it wins by roughly the factor of two you are about to see measured. This is the cleanest demonstration in astronomy that a tide is not the same thing as a pull: the Sun pulls the Earth about 180 times harder than the Moon does, and raises less than half the tide.',
    },

    {
      type: 'read',
      title: 'Seven real tides on one scale',
      body: `The panel lists seven real pairings, with the tide the first body
             raises on the second. They span fourteen powers of ten, so the bars
             are drawn on a scale where every gridline is ten times the one
             before: bar length counts zeros, not units.
             \n\nMove the highlight slider through them and read each one off.
             \n\n<strong>Moon and Sun on the Earth.</strong> Your prediction,
             measured: the Moon wins by 2.2. When the Sun and Moon line up, at
             new and full moon, the two tides add and you get the unusually
             large <em>spring</em> tides; when they are at right angles the
             solar tide partly cancels the lunar one and you get the small
             <em>neap</em> tides. Coastal tide tables are that sum, plus a great
             deal of local coastline.
             \n\n<strong>The Earth on the Moon.</strong> Same separation, other
             direction, and 22 times stronger, because the Earth is 81 times the
             Moon’s mass. Same physics, read backwards.
             \n\n<strong>Jupiter on Io.</strong> Five thousand times the lunar
             tide. Io is squeezed and released as its slightly non-circular
             orbit carries it in and out, and the friction from that kneading
             keeps its interior molten. It is the most volcanically active body
             in the Solar System, and it is heated by a difference in gravity.`,
      tool: {
        id: 'tide-compare',
        values: { which: 0 },
        title: 'Seven real tides',
        note: 'Slide the highlight through all seven. The bottom two are the same black hole at two different distances, which is the distance relationship doing its work again.',
      },
      tip: 'The last two rows differ only in separation: fifty times closer, and the tide is over a hundred thousand times larger. Fifty cubed is 125,000.',
    },

    {
      type: 'read',
      title: 'Locking, and what this simulation does not do',
      body: `You always see the same face of the Moon. That is not a
             coincidence and not a coincidence of viewing angle: the Moon turns
             on its axis exactly once per orbit. It is <strong>tidally
             locked</strong>.
             \n\nThe mechanism, in outline. The Earth raises a tidal bulge on
             the Moon, as you just measured. If the Moon spins at a rate other
             than its orbital rate, that bulge is dragged slightly out of line
             with the Earth, and the Earth’s pull on the misaligned bulge acts
             as a brake. The braking continues until the spin matches the orbit
             and the bulge sits still, at which point there is nothing left to
             drag. The same thing is happening to the Earth, more slowly: our
             day is lengthening by about 1.7 milliseconds per century, and the
             Moon is receding by 3.8 cm a year.
             \n\n<strong>An honest note about the model.</strong> This is a
             conceptual account, not something happening on your screen.
             Gravitas is a Newtonian N-body simulation: it moves point masses
             under mutual gravity. It does not deform bodies, does not model the
             internal friction that makes tidal braking work, and does not
             evolve rotation from tidal torques. Every tidal number in this
             lesson is computed from the positions and masses in the picture,
             which is legitimate, and the deformation you are shown is drawn
             rather than simulated. That distinction is worth keeping.`,
      tip: 'Tidal locking is the normal outcome, not the exception: most large moons in the Solar System are locked to their planets, and Pluto and Charon are locked to each other.',
    },

    {
      type: 'question',
      title: 'Say it in your own words',
      kind: 'short',
      body: `Halfway. Before the lesson moves from tides that move water to
             tides that destroy things, put the core idea into a sentence of
             your own.`,
      prompt:
        'Why does the Earth have a high tide on the side facing away from the Moon? Answer in one or two sentences, and be careful about what is doing what to what.',
      rubric:
        'The far side is pulled toward the Moon more weakly than the Earth’s centre is, because it is further away. The whole planet is accelerated at the rate its centre feels, so relative to that shared motion the far side lags behind, producing a bulge pointing away from the Moon. Full credit requires the comparison with the centre, or an equivalent statement that a tide is a difference. Common wrong answers to watch for and not credit: that the Moon pushes the far side; that gravity reverses there; that the Earth’s rotation flings the water outward; that the water displaced from the near side has to go somewhere. Partial credit for "the far side is pulled less" without saying less than what.',
    },

    {
      type: 'predict',
      title: 'What holds a moon together?',
      body: `Everything so far has been about stretching. Nothing has broken.
             \n\nIf a tide pulls the two ends of a body in opposite directions,
             something must be resisting, or every moon in the Solar System
             would already have come apart. For a body of any decent size,
             what resists is the body’s own gravity: every part of it pulls on
             every other part, holding it in a ball.
             \n\nSo there are two accelerations at the surface of a moon,
             pointing opposite ways, and which one is bigger decides everything.`,
      prompt: 'A moon will be pulled apart by tides when…',
      options: [
        'the planet’s gravity at the moon exceeds the moon’s own surface gravity',
        'the tidal stretch across the moon exceeds the moon’s own surface gravity',
        'the moon’s orbital speed exceeds its escape speed',
        'the moon passes inside the planet’s atmosphere',
      ],
      answer: 1,
      because:
        'The stretch has to beat the grip. Note carefully what the first option compares: the planet’s pull on the moon is always vastly bigger than the moon’s own surface gravity, for every moon that exists, and none of them are coming apart. It is the pull on the moon that keeps it in orbit; it is the difference across the moon that tries to take it apart. The comparison that matters is the second one, and the next screen draws it as two bars.',
    },

    {
      type: 'explore',
      title: 'Stretch against grip',
      body: `The panel takes a body the size of the Moon and lets you walk it in
             toward the Earth. Two bars, measured at the body’s surface:
             \n\n<strong>Green</strong> is its own gravity, holding it together.
             It does not change as you move the body, because it depends only on
             the body itself.
             \n\n<strong>Red</strong> is the tidal stretch trying to pull its
             ends apart. It grows as one over the distance cubed, so it climbs
             very fast as you bring the body in.
             \n\nSomewhere the red bar catches the green one. Find it.
             \n\nThe Moon really sits at about sixty Earth radii, far off the
             right-hand end of this slider. You are bringing it in to somewhere
             it has never been.`,
      checklist: [
        'Start at 5 Earth radii and note that the green bar dwarfs the red one',
        'Bring the distance slider down slowly and watch only the red bar',
        'Find the distance where the two bars are the same length',
        'Read the verdict line, and the distance the panel reports underneath',
        'Press Comet ice and find the crossing point again',
        'Press Iron and find it a third time',
      ],
      tool: {
        id: 'tide-balance',
        values: { dist: 5, density: 3300 },
        title: 'Its own gravity, against the tide',
        note: 'Green is grip, red is stretch. The marker on the ruler at the bottom is where you have put the body; the tick is where the two become equal.',
      },
      tip: 'The green bar never moves when you change the distance, and the red bar never moves when you change the density. Each control drives exactly one bar, which makes the balance easy to reason about.',
    },

    {
      type: 'question',
      title: 'Where the balance tips',
      kind: 'numeric',
      body: `Set the density back to the Moon’s own, 3 300 kg/m³, and read the
             distance at which the two bars become equal. The panel reports it
             in Earth radii, on the line that says the two are equal.`,
      prompt:
        'For a body of the Moon’s density, the stretch equals the grip at a distance of about…',
      unit: 'Earth radii',
      answer: 1.5,
      tolerance: 0.2,
      because:
        'About 1.5 Earth radii from the Earth’s centre, or roughly 9,500 km, which is only about 3,100 km above the ground. That distance has a name: it is the <strong>Roche limit</strong>, after Édouard Roche, who worked it out in 1848. It is not a coincidence that it came out of a comparison you set up yourself: the Roche limit is defined by exactly that balance, and the textbook formula is nothing more than the algebra of setting those two bars equal to each other.',
      tool: {
        id: 'tide-balance',
        values: { dist: 3, density: 3300 },
        hide: ['density'],
        title: 'Read the crossing distance',
        note: 'The density is held at the Moon’s own for this question. Slide the distance until the two bars match, or just read the line that says where they are equal.',
      },
    },

    {
      type: 'read',
      title: 'The Roche limit, and why there are two of them',
      body: `The picture moves to Saturn, which is where this idea earns its
             keep. The moon you are moving is drawn at the distance your slider
             sets, and two arcs mark two different Roche limits.
             \n\nWhy two? Because a real body does not stay a perfect ball as
             the tide gets hold of it. It stretches, which puts its ends further
             apart, which gives the tide a longer lever, which stretches it
             more. A body with no strength at all, free to deform, therefore
             comes apart <em>further out</em> than a body that keeps its shape
             does. The outer arc is the no-strength limit; the inner one is the
             keeps-its-shape limit. Between them is a genuine grey band, not a
             rounding error.
             \n\nAnd now look at the rings. Saturn’s ring system ends abruptly
             at 136,780 km, and the innermost round moon, Mimas, orbits well
             outside that. Set the density to porous ice, which is what ring
             particles actually are, and compare the outer arc with where the
             rings stop. The rings sit inside the limit; the moons sit outside
             it. Saturn has a hundred thousand kilometres of debris where a moon
             cannot assemble, and a moon at the first distance where one can.`,
      tool: {
        id: 'roche-model',
        values: { dist: 3.2, density: 600 },
        title: 'A moon brought in toward Saturn',
        note: 'Distances are in Saturn radii. The readout gives both limits, the A ring’s outer edge, and Mimas, so you can compare all four numbers directly.',
      },
      tip: 'The drawing of a stretched or shattered moon is exactly that: a drawing of the outcome. Gravitas does not compute fluid flow, and nothing in this panel is a hydrodynamic simulation.',
    },

    {
      type: 'explore',
      title: 'Change what the moon is made of',
      body: `Leave the distance alone for a moment and change the material
             instead. Watch the two arcs move.
             \n\nThis is the point of the screen, and it is the thing most
             often got wrong: <strong>a Roche limit is not one distance.</strong>
             There is no radius around Saturn inside which everything shatters.
             There is a different limit for every body, and it depends on what
             that body is made of and on the mass of what it is falling toward.
             \n\nDenser bodies grip themselves harder for their size, so their
             limits sit closer in. Push the density high enough and the
             inner arc disappears inside Saturn itself, which is the honest
             answer that a dense enough body could orbit inside Saturn’s cloud
             tops without the tide troubling it at all.`,
      checklist: [
        'Press Porous ice and note where the outer arc sits',
        'Press Solid ice and watch both arcs move inward',
        'Press Rock, then Iron, and watch them keep moving inward',
        'Find a density at which the inner arc vanishes inside Saturn',
        'Put the density back to porous ice and bring the distance slider in until the moon comes apart',
      ],
      tool: {
        id: 'roche-model',
        values: { dist: 3.2, density: 600 },
        title: 'Same planet, different moons',
        note: 'Only the density is changing. Saturn’s mass is fixed and so is the moon’s size, and the arcs still move a long way.',
      },
      tip: 'The moon’s size does not appear in the answer at all. A 5 km icy chunk and a 500 km icy moon have the same Roche limit around Saturn, because making the body bigger increases the stretch and its own grip by the same factor.',
    },

    {
      type: 'question',
      title: 'Not one distance',
      kind: 'choice',
      body: `You have now moved the arcs around by changing one property of the
             infalling body, without touching the planet at all.`,
      prompt: 'A Roche limit is set by…',
      options: [
        'the mass of the planet alone, so it is a fixed radius around each planet',
        'the mass of the planet and the density of the body falling in',
        'the size of the body falling in, with bigger bodies breaking further out',
        'the orbital speed of the body falling in',
      ],
      answer: 1,
      because:
        'The planet’s mass and the infalling body’s density. Its size cancels out entirely, which surprises most people: doubling a moon’s radius doubles the stretch across it and also doubles its own surface gravity, so the balance is untouched. A single "the Roche limit of Saturn" is therefore an incomplete statement. It has to be the Roche limit of Saturn for something.',
    },

    {
      type: 'read',
      title: 'What a Roche limit does not tell you',
      body: `Four qualifications, because this is the idea in the lesson most
             likely to be over-applied.
             \n\n<strong>It is about self-gravity, not glue.</strong> The whole
             argument compares the tide against a body’s own gravity. Small
             bodies are held together mostly by material strength instead: a
             one-metre rock is not going to be pulled apart by Saturn at any
             distance, because the forces holding a rock together have nothing
             to do with its gravity. The limit applies to bodies big enough that
             gravity is what is holding them.
             \n\n<strong>Crossing it is not an explosion.</strong> Nothing
             detonates at a radius. A body brought inside its limit loses
             material from its ends first, and disruption takes time: a passage
             through, on an orbit that comes out again, may leave a body
             stretched and cracked rather than destroyed.
             \n\n<strong>Spin and shape matter.</strong> The two limits here
             bracket the real answer for a body that is round and not spinning
             fast. A rapidly rotating or elongated body behaves differently.
             \n\n<strong>Comet Shoemaker-Levy 9 is what it actually looks
             like.</strong> In July 1992 it passed about 40,000 km above
             Jupiter’s cloud tops, inside its Roche limit, and did not vanish.
             It came apart into a line of roughly twenty fragments, strung out
             along its orbit, which then hit Jupiter one after another in 1994.
             A string of pieces, not a puff of dust.`,
      tip: 'Rubble piles are the interesting case: many asteroids are loose aggregates held together by little more than their own gravity, and those really do behave the way this argument predicts.',
    },

    {
      type: 'explore',
      title: 'The extreme case, running live',
      body: `The simulation has switched to a scenario built around a
             supermassive black hole with stars and planets falling past it.
             Watch for a while. Bodies that pass close enough are stripped:
             material is pulled off them and drawn out into streams that wind
             around the hole.
             \n\n<strong>Read what you are seeing carefully.</strong> Gravitas
             moves point masses under Newtonian gravity. When a body passes
             inside a disruption radius the simulation sheds debris particles
             from it and lets those particles orbit on their own, which is a
             reasonable cartoon of tidal stripping and is not a calculation of
             it. There is no fluid in this model, no pressure, no shock heating,
             and no radiation. The stream you see is a plausible picture of the
             geometry, produced by a rule rather than by physics.
             \n\nWhat is real in the picture is the gravity: the orbits, the
             fact that closer passages do more damage, and the fact that the
             debris ends up on a spread of different orbits because different
             parts of the body were at different distances when it came apart.
             That last one is the same subtraction you started the lesson with.`,
      checklist: [
        'Watch one body make a close pass and follow what comes off it',
        'Notice that bodies passing further out are left alone',
        'Follow a debris stream and notice it spreads out along the orbit rather than staying in a clump',
        'Look for material that ends up bound to the hole and material that leaves',
      ],
      setup: TIDES_DISRUPTION,
      tip: 'Debris spreading along the orbit rather than falling in together is a real feature of tidal disruption: the near end of the object was on a slightly tighter orbit than the far end, so the pieces have slightly different periods.',
      probe: ctx => {
        const bodies = ctx.bodies || [];
        return [
          { label: 'Bodies being tracked', value: String(bodies.length) },
          {
            label: 'What is simulated',
            value: 'Newtonian gravity between point masses',
          },
          { label: 'What is not', value: 'Fluid flow, pressure, radiation' },
        ];
      },
    },

    {
      type: 'read',
      title: 'A star, and a black hole that is too big',
      body: `Finish with the extreme case, done properly with numbers instead of
             pictures.
             \n\nDrop a Sun-like star toward a black hole. Two distances matter.
             The <strong>tidal radius</strong> is where the stretch across the
             star beats the star’s own gravity: the same balance you found for
             the Moon, with the same arithmetic. The <strong>event
             horizon</strong> is where the star disappears from view for good.
             \n\nSlide the mass up from ten solar masses and watch the two
             circles close on each other. For a stellar-mass hole the star is
             shredded tens of thousands of horizon radii out. For Sagittarius A*
             at the centre of our galaxy it is still shredded outside, by a
             factor of about eleven, and astronomers do see the resulting
             flares. Keep going and the two meet at around 160 million solar
             masses, and beyond that the tidal radius is <em>inside</em> the
             horizon: the star crosses whole and there is nothing for anyone
             outside to see.
             \n\nThat is a real and slightly perverse result. The most massive
             black holes are the ones least able to tear a star apart where you
             could watch, because horizon size grows in proportion to mass while
             tidal radius grows only as the cube root of it.
             \n\n<strong>The approximation, stated.</strong> Both radii here are
             Newtonian estimates, and the tidal radius uses the same
             self-gravity balance as the rest of the lesson. Real tidal
             disruption events are hydrodynamic: the star is compressed as well
             as stretched, the debris shocks and radiates, and general
             relativity matters near the horizon. None of that is modelled here
             or anywhere in Gravitas. What survives the approximation is the
             comparison of two lengths, and that comparison is the reason the
             flares are seen where they are seen.`,
      tool: {
        id: 'tide-disrupt',
        values: { logm: 1 },
        title: 'Tidal radius against event horizon',
        note: 'The dashed circle is where the star comes apart; the filled disc is the horizon. Both are drawn on a scale that counts zeros, because at ten solar masses they differ by a factor of sixty thousand.',
      },
      tip: 'The three preset buttons take you to a stellar-mass hole, to Sagittarius A*, and to a billion-solar-mass giant where the star is swallowed whole.',
    },

    {
      type: 'question',
      title: 'The whole lesson in three sentences',
      kind: 'short',
      body: `You have gone from a beach to a black hole using one idea and two
             measured relationships. Write it down.`,
      prompt:
        'Explain what causes tides, what makes them stronger, and how they can destroy an object. Three sentences is plenty.',
      rubric:
        'Expect three components. (1) Tides are caused by gravity being unequal across an extended object: the difference between the pull at a point and the pull on the centre, not the strength of gravity itself. (2) They get stronger with the companion’s mass, in proportion, and far more sharply with decreasing separation, as one over separation cubed. (3) A body is destroyed when the tidal stretch across it exceeds its own surface gravity, which happens inside its Roche limit, and that limit depends on the two bodies involved rather than being one universal distance. Credit any correct statement of the inverse-cube relationship however phrased. Do not require a formula. Deduct for "tides are caused by strong gravity", for the far-side bulge being pushed or flung outward, or for a Roche limit described as a fixed radius around a planet.',
    },

    {
      type: 'read',
      title: 'What you worked out',
      body: `<strong>A tide is a difference.</strong> Not a pull. Take the pull
             on the centre away from the pull where you are, and what is left is
             what deforms things. It is the reason there are two bulges and not
             one, and the reason the far side bulges without anything pushing it.
             \n\n<strong>Distance dominates.</strong> One power of mass, three
             powers of separation. This is why the Moon beats the Sun, why the
             last two rows of the comparison chart differ by five orders of
             magnitude, and why tidal effects are usually irrelevant right up
             until they are catastrophic.
             \n\n<strong>Size matters too.</strong> A bigger object has ends
             further apart, so it feels a bigger difference. You feel essentially
             no tide. The Earth feels a few metres of one.
             \n\n<strong>Breaking is a competition.</strong> Stretch against the
             body’s own grip. Inside the Roche limit the stretch wins, and that
             limit is different for every pair of objects, because it depends on
             what is falling in as well as on what it is falling toward.
             \n\n<strong>Same mechanism, fourteen orders of magnitude.</strong>
             The sea coming up a beach, Io kept molten, the Moon showing one
             face, Saturn’s rings ending where they do, a comet strung out into
             fragments, and a star pulled into a stream. One subtraction.
             \n\nAnd one sentence to keep: <em>tides happen because gravity is
             not equally strong across an extended object; the difference grows
             sharply as objects get closer, and in extreme cases it overcomes
             the object’s own gravity and tears it apart.</em>`,
      tip: 'The next time you see a tide table, notice that it lists two highs and two lows per day, and that they are largest around new and full moon. Both of those are things you can now explain.',
    },
  ],
};

const RETROGRADE = {
  id: 'retrograde-motion',
  thumbnail: 'images/scenarios/retrograde-mars.webp',
  title: 'Why Mars Goes Backwards',
  subtitle: 'Change the frame, and fourteen centuries of epicycles fall away',
  duration: '35-45 min',
  level: 'Introductory astronomy',
  lock: { placement: true, inspector: false },
  summary:
    'Twice every three years Mars stops in the sky, reverses, and loops back on itself. Watched from outside, nothing of the sort happens: Earth and Mars both go round the Sun the same way and never turn back. You will measure both orbits, predict what Mars does when seen from Earth, then switch the reference frame and watch the loop draw itself. Nothing in the physics changes when you do. That is the entire point, and it is what took astronomy from Ptolemy to Copernicus.',
  objectives: [
    'Describe retrograde motion as an observation, separately from any explanation of it',
    'Compute a synodic period from two orbital periods and say what it counts',
    'Predict and then verify that a retrograde loop happens at opposition',
    'Explain retrograde motion as a consequence of the observer’s own motion, without invoking anything the planet does',
    'Say what a reference frame is, and what changes and what does not when you switch one',
    'State what the retrograde loop does and does not establish about which body is at the center',
  ],
  steps: [
    {
      type: 'read',
      title: 'The wandering stars',
      body: `Almost everything in the night sky moves together. The stars turn
             overhead as one rigid pattern, night after night, and the patterns
             themselves do not change within a human lifetime.
             \n\nFive points of light do not obey. They drift slowly through the
             fixed stars along their own paths, and the Greeks called them
             <em>planētai</em>, the wanderers. Most of the time each one creeps
             steadily eastward against the stars.
             \n\nAnd then, at intervals, one of them stops. It hangs still for a
             few days, reverses, and travels westward for weeks or months. Then
             it stops again and resumes its eastward march, having traced a loop
             or a zigzag against the background. Mars does this once every 780
             days, and the reversal lasts about ten weeks.
             \n\nThis is not a subtle effect visible only to specialists. Anyone
             who watches Mars for a few months with the naked eye can see it, and
             every civilization that kept sky records noticed it.`,
      quote: {
        text: 'The planets appear sometimes to move forward, sometimes backward, and sometimes to stand still.',
        by: 'Claudius Ptolemy, Almagest, c. 150 CE',
      },
      tip: 'This lesson leaves the inspector switched on: you will need it to read numbers off Earth and Mars. Placing new objects is off, so a stray click cannot alter the system you are measuring.',
      setup: {
        scenario: 'Retrograde Mars',
        seed: 'retrograde-lab',
        camera: { zoom: 1.6, pan: { x: 0, y: 0 } },
        paused: false,
      },
    },
    {
      type: 'read',
      title: 'What you are looking at',
      body: `Three bodies, and nothing else. The <strong>Sun</strong> at the
             center, <strong>Earth</strong> in blue on the inner orbit, and
             <strong>Mars</strong> in orange on the outer one.
             \n\nThe distances are real: Earth at 1.00 AU, Mars at 1.52. The
             masses are real, so the periods are real too, and the whole system
             is running about four hundred thousand times faster than the sky
             does. A year of Earth's takes a few seconds here.
             \n\nWatch for a moment. Both planets go round the Sun the same way,
             counterclockwise, and neither ever slows, stops or turns back. Whatever
             makes Mars appear to reverse, it is not something Mars does.`,
      tip: 'If the trails are not showing, press the reset button beside the progress bar to rebuild the system.',
    },
    {
      type: 'read',
      title: 'Against the fixed stars',
      body: `Before you measure anything, be clear about what the measurement is.
             \n\nAn ancient astronomer had no distances. Nobody knew how far away
             Mars was, and estimates were wrong by orders of magnitude until the
             seventeenth century. What could be measured, and measured well, was
             a <em>direction</em>: which way Mars lay, recorded against the
             pattern of stars behind it.
             \n\nSo retrograde motion is a statement about one number, the
             direction to the planet, changing the wrong way over weeks. The
             loop that appears in a modern diagram is that direction plotted
             against time, not a path anyone ever saw traced out.
             \n\nGravitas gives you the same number and a distance as well, which
             is more than any observer had until radar. The direction is the one
             to watch.`,
    },
    {
      type: 'explore',
      title: 'Watch from outside first',
      body: `Before changing anything, spend a moment on the view you already
             have. This is the God's-eye view no observer has ever had: outside
             the system, looking down on it.
             \n\nWatch both planets go round. Click each one and read its speed.
             Nothing here reverses, hesitates or loops.`,
      checklist: [
        'Earth goes counterclockwise around the Sun, and never turns back',
        'Mars goes counterclockwise too, and never turns back',
        'Earth completes a lap in noticeably less time than Mars does',
        'Watch Earth catch up with Mars and pass it on the inside',
      ],
      probe: ctx => {
        const rows = [];
        for (const name of ['Earth', 'Mars']) {
          const b = ctx.find(name);
          rows.push({
            label: `${name}: speed`,
            value: b ? ctx.speed(Math.hypot(b.vel.x, b.vel.y)) : '-',
          });
        }
        rows.push({ label: 'Day', value: ctx.days().toFixed(0) });
        return rows;
      },
    },
    {
      type: 'measure',
      title: 'The two orbits',
      body: `Click <strong>Earth</strong> and read its orbital period from the
             inspector, then click <strong>Mars</strong> and read its. The
             inspector reports the period of the orbit each body is actually on,
             computed from its live position and velocity.
             \n\nWhile you are there, record how far each one is from the Sun.`,
      fields: [
        { id: 'earth_a', label: 'Earth: distance from the Sun', unit: 'AU' },
        { id: 'mars_a', label: 'Mars: distance from the Sun', unit: 'AU' },
        { id: 'earth_P', label: 'Earth: orbital period', unit: 'days' },
        { id: 'mars_P', label: 'Mars: orbital period', unit: 'days' },
      ],
      probe: ctx => {
        const rows = [];
        for (const name of ['Earth', 'Mars']) {
          const b = ctx.find(name);
          if (!b) {
            rows.push({ label: name, value: 'not found' });
            continue;
          }
          const el = ctx.elements(b);
          rows.push({
            label: `${name}: distance from the Sun`,
            value: el ? ctx.distance(el.semiMajorAxis) : '-',
          });
          rows.push({
            label: `${name}: period`,
            value: el ? ctx.time(el.period) : '-',
          });
        }
        return rows;
      },
    },
    {
      type: 'question',
      title: 'Which one is faster?',
      kind: 'choice',
      body: `You have two periods and two distances. Kepler's third law relates
             them, but you do not need it here: you can read the answer straight
             off the numbers you just wrote down.`,
      prompt: 'Going round the Sun, Earth…',
      options: [
        'completes an orbit in less time than Mars, so it is going round faster',
        'completes an orbit in more time than Mars, because it has further to go',
        'goes round in the same time as Mars, since both orbit the same Sun',
        'goes round faster only when it is closer to Mars',
      ],
      answer: 0,
      because:
        'Earth takes 365 days and Mars 687, so Earth laps the Sun nearly twice for every one lap of Mars. That is the whole mechanism of retrograde motion, and you have already measured it. The inner planet is on a shorter track and it also moves faster along it: both effects run the same way, which is what Kepler’s third law says.',
    },
    {
      type: 'measure',
      title: 'How fast each one goes round',
      body: `A period is awkward to compare directly. Turn each one into an
             angular speed instead: a full lap is 360°, so a planet covers
             360 ÷ P degrees every day.
             \n\nUse the two periods you just measured.`,
      fields: [
        {
          id: 'earth_w',
          label: 'Earth: degrees per day',
          unit: '°/day',
          compute: v => 360 / v.earth_P,
        },
        {
          id: 'mars_w',
          label: 'Mars: degrees per day',
          unit: '°/day',
          compute: v => 360 / v.mars_P,
        },
        {
          id: 'gain_w',
          label: 'Degrees Earth gains on Mars each day',
          unit: '°/day',
          compute: v => 360 / v.earth_P - 360 / v.mars_P,
        },
      ],
      probe: ctx => {
        const rows = [];
        for (const name of ['Earth', 'Mars']) {
          const b = ctx.find(name);
          const el = b ? ctx.elements(b) : null;
          rows.push({
            label: `${name}: period`,
            value: el ? ctx.time(el.period) : '-',
          });
        }
        return rows;
      },
    },
    {
      type: 'read',
      title: 'The synodic period',
      body: `Two runners on a circular track, one faster than the other, meet
             again at intervals. Not once per lap: the faster runner has to gain
             a whole lap on the slower one.
             \n\nFor planets this interval is called the <em>synodic period</em>,
             and it is the time between one alignment of Sun, Earth and Mars and
             the next. Because it counts laps gained rather than laps run, it is
             longer than either planet's own year.
             \n\nIf the faster planet goes round in <em>P</em>₁ and the slower in
             <em>P</em>₂, then in one synodic period <em>S</em> the fast one
             completes exactly one more lap than the slow one:
             \n\n<strong>1/S = 1/P₁ − 1/P₂</strong>
             \n\nThe alignment that matters here is <em>opposition</em>: Earth
             directly between the Sun and Mars, with Mars on the opposite side of
             our sky from the Sun. It is also when Mars is closest to us and
             brightest.`,
    },
    {
      type: 'question',
      title: 'How often does Earth catch up?',
      kind: 'numeric',
      body: `Use your two measured periods in 1/S = 1/P₁ − 1/P₂, with P₁ the
             shorter one. Work in days.
             \n\nWith 365 and 687 the subtraction gives 1/S = 0.00274 − 0.00146 =
             0.00128 per day.`,
      prompt: 'How many days between one opposition of Mars and the next?',
      unit: 'days',
      answer: 780,
      tolerance: 60,
      because:
        'S = 780 days, about two years and seven weeks. That is why Mars is well placed for observing roughly every other year rather than every year: Earth needs 780 days to gain a full lap on it. Venus, being much faster, comes round to the same alignment every 584 days; Jupiter, being much slower, every 399, barely more than an Earth year, because Jupiter has hardly moved while Earth goes round.',
    },
    {
      type: 'question',
      title: 'A lap gained',
      kind: 'numeric',
      body: `You have the rate at which Earth gains on Mars, in degrees per day.
             A full lap gained is 360°.
             \n\nDivide one by the other and you have the synodic period again,
             by a different route. It should agree with what you got from the
             reciprocals.`,
      prompt:
        'At about 0.46° gained per day, how many days to gain a full 360°?',
      unit: 'days',
      answer: 783,
      tolerance: 60,
      because:
        'The same 780 days, reached without touching a reciprocal. This is worth doing twice because the reciprocal formula is easy to apply and hard to feel: what it counts is laps gained, and gaining a lap at half a degree a day takes a little over two years. Every retrograde loop of Mars is one lap gained.',
    },
    {
      type: 'predict',
      title: 'Before you look',
      body: `You are about to change what the view is measured against. Right
             now every position on screen is given relative to the scenario's own
             coordinates, which happen to have the Sun sitting still at the
             middle. You are going to re-express the same simulation with
             <strong>Earth</strong> sitting still instead.
             \n\nNothing about the physics will change. No force is added, no
             orbit is altered, no body is moved. Only the question "measured
             against what?" gets a different answer.
             \n\nCommit to a prediction first.`,
      prompt: 'Seen from Earth, Mars’s path will…',
      options: [
        'still be a circle around the Sun, just drawn off-center',
        'be a loop that doubles back on itself at intervals',
        'be a straight line, since neither planet accelerates much',
        'be unchanged, because changing the frame changes only the labels',
      ],
      answer: 1,
      because:
        'The path doubles back. Mars keeps moving steadily round the Sun the entire time, but Earth is moving too, and faster; near opposition Earth overtakes Mars on the inside and the direction from Earth to Mars swings backwards. The last option is the tempting one and it is half right: a frame change alters no physics. It does, however, change the path, because a path is a set of positions and positions are always measured against something.',
    },
    {
      type: 'read',
      title: 'Reference frames',
      body: `A position is never a property of a body on its own. It is a
             relationship between that body and something else, and the something
             else is the <em>reference frame</em>.
             \n\nYou change frames constantly without noticing. Walking down a
             train carriage you move at about 1 m/s in the frame of the train and
             at 55 m/s in the frame of the track. Both are correct. Neither is
             more true than the other, and no experiment on the train can tell
             you which one you are "really" doing.
             \n\nGravitas lets you pick the frame. In the <strong>Tools</strong>
             section of the right-hand panel there is a control marked
             <strong>Frame</strong>, and the object inspector carries the same
             switch under <strong>Overlays</strong>. Choosing a body puts that
             body at rest and re-expresses everything else, trails included,
             around it.
             \n\nThe trails are the part worth watching. They are not slid across
             the screen; they are redrawn as the path that frame would have seen,
             using where the origin body was at the moment each point was
             recorded.`,
      tip: 'This is not the same as Follow Mode in Settings. Follow Mode moves the camera and leaves the drawing alone. Changing the frame changes the drawing.',
    },
    {
      type: 'read',
      title: 'What the trails are doing',
      body: `One detail matters for trusting what you are about to see.
             \n\nWhen you change the frame, the trails are not slid sideways
             across the screen. Each point in a trail was recorded at a
             particular moment, and each one is re-expressed against where the
             origin body was <em>at that moment</em>. Sliding the whole drawing
             would move it without changing its shape; this changes the shape,
             because that is what a different observer would have drawn.
             \n\nThe difference is exactly why Follow Mode, which does slide the
             camera, never showed you a retrograde loop.
             \n\nA point older than the origin body's own recorded history cannot
             be re-expressed at all, and is not drawn. So a freshly rebuilt
             system has no loop yet: the trail has to grow first.`,
      tip: 'The trail here holds about 110 days of history, which is a little longer than a whole retrograde episode. That is deliberate: much shorter and the loop never closes.',
    },
    {
      type: 'explore',
      title: 'Put yourself on Earth',
      body: `Click <strong>Earth</strong>, then switch its
             <strong>Reference frame</strong> on in the inspector. Or use
             <strong>Tools &gt; Frame</strong> and choose the selected object.
             \n\nGive it half a minute. The trail has to redraw itself over a
             good fraction of the 780 days you calculated before the loop
             appears, and you may need to wait for Earth to come round to
             opposition.`,
      checklist: [
        'Earth is now motionless at the middle of the view',
        'The Sun is no longer at rest: it circles Earth once a year',
        'Mars’s trail is no longer a circle round the Sun',
        'Somewhere on Mars’s trail there is a cusp or a loop where it doubles back',
      ],
      probe: ctx => {
        const frame = ctx.frame ? ctx.frame() : null;
        if (!frame || frame.mode === 'world') {
          return [
            { label: 'Reference frame', value: 'World, not switched yet' },
          ];
        }
        const mars = ctx.find('Mars');
        const seen = mars && ctx.seenFrom ? ctx.seenFrom(mars, 'Earth') : null;
        if (!seen) return [{ label: 'Reference frame', value: 'Earth' }];
        return [
          { label: 'Reference frame', value: 'Earth' },
          {
            label: 'Mars: distance from Earth',
            value: ctx.distance(seen.separation),
          },
          {
            label: 'Mars: direction from Earth',
            value: `${seen.longitude.toFixed(1)}°`,
          },
        ];
      },
    },
    {
      type: 'read',
      title: 'That is the observation',
      body: `The loop on your screen is not a model of anything. It is what the
             recorded positions say, re-expressed against a different origin, and
             it is what people actually see when they watch Mars.
             \n\nEvery point on that trail is a place Mars really was, in a
             simulation where Mars never once slowed down or turned round. The
             reversal is entirely a statement about where the observer was
             standing.
             \n\nNotice what did not change when you flipped the switch. The
             orbital periods are the same. The distances from the Sun are the
             same. Every force is the same. If you switch back to the world frame
             the loop vanishes and the circles return, and switching frames again
             brings it back. Nothing was created or destroyed; the same motion was
             described twice.`,
    },
    {
      type: 'measure',
      title: 'Catch the reversal',
      body: `The picture shows the loop; now put a number on it. With Earth's
             frame still on and Mars selected, the inspector shows
             <strong>Direction from Earth</strong> in degrees. That single number
             is the observable: it is the direction you would point at, and the
             thing an ancient astronomer recorded against the fixed stars.
             \n\nLet it run and watch that number. Most of the time it climbs
             steadily. Record it, wait, record it again, and keep going until you
             catch a reading that is <em>lower</em> than the one before. Press
             <strong>Space</strong> to pause when you want to read carefully.
             \n\nThe day counter is on the timeline at the bottom of the screen.`,
      fields: [
        {
          id: 'lon_a',
          label: 'Direction from Earth, first reading',
          unit: '°',
        },
        { id: 'day_a', label: 'Day of that reading', unit: 'days' },
        {
          id: 'lon_b',
          label: 'Direction, a reading that went backwards',
          unit: '°',
        },
        { id: 'day_b', label: 'Day of that reading', unit: 'days' },
      ],
      probe: ctx => {
        const mars = ctx.find('Mars');
        const seen = mars && ctx.seenFrom ? ctx.seenFrom(mars, 'Earth') : null;
        if (!seen) return [{ label: 'Select Mars', value: '-' }];
        return [
          {
            label: 'Mars: direction from Earth',
            value: `${seen.longitude.toFixed(1)}°`,
          },
          {
            label: 'Mars: distance from Earth',
            value: ctx.distance(seen.separation),
          },
          { label: 'Day', value: ctx.days().toFixed(0) },
        ];
      },
    },
    {
      type: 'measure',
      title: 'Nearest and furthest',
      body: `Keep Mars selected and watch <strong>Distance from Earth</strong>
             instead. Unlike the direction, this one has a clear smallest value
             and a clear largest one.
             \n\nRecord the closest Mars comes to Earth and the furthest it gets.
             You will need to let it run through a good part of a synodic period
             to see both.`,
      fields: [
        { id: 'sep_min', label: 'Closest Mars comes to Earth', unit: 'AU' },
        { id: 'sep_max', label: 'Furthest Mars gets from Earth', unit: 'AU' },
        {
          id: 'sep_ratio',
          label: 'Furthest ÷ closest',
          unit: '',
          compute: v => v.sep_max / v.sep_min,
        },
      ],
      probe: ctx => {
        const mars = ctx.find('Mars');
        const seen = mars && ctx.seenFrom ? ctx.seenFrom(mars, 'Earth') : null;
        if (!seen) return [{ label: 'Select Mars', value: '-' }];
        return [
          {
            label: 'Mars: distance from Earth',
            value: ctx.distance(seen.separation),
          },
        ];
      },
    },
    {
      type: 'question',
      title: 'Bright and backwards together',
      kind: 'choice',
      body: `Your two distances differ by a factor of three or so. Brightness
             falls off as the square of distance, so a factor of three in
             distance is a factor of about nine in brightness.
             \n\nNow recall when the direction ran backwards.`,
      prompt: 'In this simulation, Mars is closest to Earth…',
      options: [
        'at a random point unrelated to the retrograde loop',
        'at the same time as the retrograde loop, because both happen when Earth passes it',
        'when Mars is at the far side of its own orbit from the Sun',
        'twice per retrograde loop, once at each end',
      ],
      answer: 1,
      because:
        'Closest approach and retrograde motion are the same event seen two ways: both happen when Earth passes Mars on the inside. So Mars is at its brightest in our sky precisely while it is moving backwards. In the heliocentric picture that is forced. In an epicyclic one it is an extra fact to be arranged, and Ptolemy did arrange it, by putting the planet at the near side of its epicycle during the loop. It works, but it is another thing the model has to be told rather than something it predicts.',
    },
    {
      type: 'question',
      title: 'When does it reverse?',
      kind: 'choice',
      body: `Compare your two measurements. The direction ran backwards at some
             point, and the distance had a minimum at some point. Think about
             where Earth is relative to Mars when each of those happens.`,
      prompt: 'Mars appears to move backwards…',
      options: [
        'when Mars is furthest from Earth, on the far side of the Sun',
        'when Earth is passing between the Sun and Mars, at their closest',
        'at random intervals, with no relation to the geometry',
        'whenever Mars is at the far point of its own orbit',
      ],
      answer: 1,
      because:
        'The reversal happens at opposition, when Earth overtakes Mars on the inside track. That is also when the two are closest, which is why Mars is at its brightest during a retrograde loop. The coincidence of "brightest" and "moving backwards" was known for two thousand years before anyone had an explanation that tied the two together, and in a geocentric model it is a coincidence: nothing about an epicycle requires the planet to be nearest while it loops.',
    },
    {
      type: 'read',
      title: 'Overtaking on the inside',
      body: `The mechanism is the one you know from a motorway.
             \n\nYou are in the fast lane, overtaking a lorry. As you come up
             behind it, it is ahead of you and drifting slowly forward against
             the hills behind. As you draw level and pass, the lorry slides
             backwards against those hills, even though it is still driving
             forwards at seventy. Once you are well past, it falls behind and
             begins drifting forward again.
             \n\nThe lorry never reversed. You overtook it.
             \n\nEarth does exactly this to Mars every 780 days. Earth is on the
             inside track and moving faster, so around opposition it sweeps past,
             and for those ten weeks Mars slides backwards against the fixed
             stars. Mars is doing nothing unusual for the whole of it.`,
      tip: 'The fixed stars are the hills. Notice that the starfield behind the simulation does not move when you switch frames: objects that far away do not shift when the observer does, which is exactly why they make a good background to measure against.',
    },
    {
      type: 'question',
      title: 'Say it in your own words',
      kind: 'short',
      body: `You have measured both orbits, watched the loop draw itself, and
             seen where in the geometry it happens.`,
      prompt:
        'In two or three sentences, explain why Mars appears to reverse, without saying anything about what Mars does differently during those weeks.',
      rubric:
        'A good answer says that Mars moves steadily throughout, and that the reversal is produced by the observer’s own motion: Earth is on a smaller, faster orbit, and near opposition it overtakes Mars, so the direction from Earth to Mars swings backwards against the distant stars. Credit for naming opposition, for connecting it to Earth passing between the Sun and Mars, and for noting that this also makes Mars closest and brightest at that time. An answer that has Mars slowing down, stopping or being pulled back has missed the point of the lesson.',
    },
    {
      type: 'read',
      title: 'What it cost to explain this',
      body: `In a model where Earth sits still at the center and everything
             circles it, retrograde motion is a genuine puzzle. Planets are
             supposed to move on circles at constant speed. This one stops and
             goes backwards.
             \n\nThe answer, refined over centuries and set down by Ptolemy
             around 150 CE, was the <em>epicycle</em>: the planet rides a small
             circle whose center rides the large one. Get the two sizes and the
             two speeds right and the combined path makes a loop, at the right
             times, of the right size. It worked. It predicted planetary
             positions well enough to be used for fourteen hundred years.
             \n\nIt also needed one epicycle per planet, plus an off-center
             <em>eccentric</em> to fix the timing, plus an <em>equant</em> point
             about which the motion was uniform instead of about the center.
             Three separate devices, tuned per planet, to reproduce something no
             single one of them explained.`,
      quote: {
        text: 'If the Sun be assumed to be the center, the retrogradations of the planets follow of necessity.',
        by: 'Nicolaus Copernicus, De revolutionibus, 1543',
      },
    },
    {
      type: 'question',
      title: 'What the epicycle was really tracking',
      kind: 'choice',
      body: `In Ptolemy's model each planet needs its own epicycle, with its own
             size and its own period. For Mars, Jupiter and Saturn those epicycle
             periods all come out the same as something you have already
             calculated.`,
      prompt:
        'The period of the epicycle for each outer planet turns out to equal…',
      options: [
        'that planet’s own orbital period',
        'one Earth year, for every one of them',
        'the planet’s distance from the Sun, in years',
        'a different number for each, with nothing in common',
      ],
      answer: 1,
      because:
        'Every outer planet’s epicycle takes exactly one year. Ptolemy knew this and recorded it; the model gives no reason for it. In the heliocentric picture the reason is immediate: the epicycle is not the planet’s motion at all, it is Earth’s, reflected onto the planet’s apparent path. Three unrelated planets sharing one period is the sort of coincidence that should make you suspicious of a model, and it is the specific fact Copernicus pointed at.',
    },
    {
      type: 'question',
      title: 'Counting the machinery',
      kind: 'numeric',
      body: `Ptolemy's model needed, for each of the five visible planets, a
             deferent circle, an epicycle riding on it, an eccentric offset for
             the deferent's center, and an equant point for the timing. Four
             devices per planet.
             \n\nCount the devices needed for the five wandering planets alone,
             leaving out the Sun and Moon.`,
      prompt: 'How many separate geometric devices is that, for five planets?',
      unit: 'devices',
      answer: 20,
      tolerance: 1,
      because:
        'Twenty, each tuned separately against observation. None of them is wrong, exactly: the model reproduced the sky to about the accuracy of naked-eye measurement and stayed in use for fourteen centuries. What it never did was explain why the five epicycles should have the periods they have. Heliocentrism replaces all twenty devices with one fact about the observer, and gets the one-year epicycle for nothing.',
    },
    {
      type: 'predict',
      title: 'And what about the Sun?',
      body: `Stay in Earth's frame. You have watched Mars, which loops. Now
             think about what the Sun does when it is measured against Earth.
             \n\nCommit before you look.`,
      prompt: 'Seen from Earth, the Sun’s path is…',
      options: [
        'a loop with a cusp, like Mars’s',
        'a simple closed circle, once a year, with no reversal',
        'a straight line, because the Sun does not orbit anything',
        'stationary, because the Sun is the center of the system',
      ],
      answer: 1,
      because:
        'A clean circle, once a year. The Sun never goes retrograde as seen from Earth, and that is the observational fact that separates the Sun from the planets in every ancient scheme. The reason is that Earth’s orbit is the Sun’s apparent orbit: there is no third motion to interfere with it. The loops belong to bodies whose own motion has to be combined with Earth’s.',
    },
    {
      type: 'explore',
      title: 'Do it for the Sun',
      body: `Keep Earth's frame on and watch the <strong>Sun</strong> instead of
             Mars.
             \n\nIn this frame the Sun goes round Earth once a year, on a
             near-perfect circle. That is not an error and it is not a
             concession: measured against Earth, the Sun really does go round
             once a year, and that is exactly what the sky looks like.`,
      checklist: [
        'The Sun traces a closed circle around Earth once a year',
        'The Sun’s path has no loop and no cusp in it',
        'Switch back to the world frame and the Sun stops moving entirely',
        'Switch to the Sun’s own frame and now Earth is the one going round',
      ],
      probe: ctx => {
        const frame = ctx.frame ? ctx.frame() : null;
        const sun = ctx.find('Sun');
        const seen = sun && ctx.seenFrom ? ctx.seenFrom(sun, 'Earth') : null;
        const rows = [
          {
            label: 'Reference frame',
            value: !frame || frame.mode === 'world' ? 'World' : 'A body',
          },
        ];
        if (seen) {
          rows.push({
            label: 'Sun: distance from Earth',
            value: ctx.distance(seen.separation),
          });
          rows.push({
            label: 'Sun: direction from Earth',
            value: `${seen.longitude.toFixed(1)}°`,
          });
        }
        return rows;
      },
    },
    {
      type: 'question',
      title: 'Which one is moving?',
      kind: 'choice',
      body: `You have now watched the same three bodies in two frames. In one the
             Sun sits still and Earth goes round it. In the other Earth sits
             still and the Sun goes round it. Both pictures came from the same
             simulation, with the same forces, and neither was edited.`,
      prompt: 'Given only what you have seen so far…',
      options: [
        'the heliocentric picture is proved, because the loop disappears in it',
        'the geocentric picture is proved, because that is what we observe',
        'neither is proved: both frames describe the same motion, and the loop only tells you the observer is moving',
        'the question is meaningless, because motion is entirely arbitrary',
      ],
      answer: 2,
      because:
        'The retrograde loop establishes that the observer is moving relative to Mars. It does not, by itself, establish what is at the center. Both descriptions reproduce the observation, which is precisely why the argument lasted so long. What eventually settled it was not this loop: it was that the heliocentric picture explains the one-year epicycle without being told to, gives the planets an ordering by distance that matches their periods, and predicts stellar parallax, which was finally measured in 1838. The last option goes too far the other way: frames are not arbitrary, because only some of them are inertial, and picking the wrong one puts forces in your equations that no object exerts.',
    },
    {
      type: 'read',
      title: 'Frames are not all equal',
      body: `Choosing a frame is free, but not consequence-free.
             \n\nIn Earth's frame the Sun circles Earth once a year. Nothing is
             wrong with that description, but if you now ask what force bends the
             Sun onto that circle, you are stuck: Earth's gravity is nowhere near
             enough to hold a body a third of a million times its mass in orbit.
             To make the equations work in that frame you have to add fictitious
             forces, which are not exerted by anything and exist only to account
             for the frame's own acceleration.
             \n\nIn the Sun's frame you do not need them. That is the real
             argument for heliocentrism, and it is Newton's rather than
             Copernicus's: the frame in which the description is simplest, and in
             which every force can be traced to a mass, is the one worth
             building physics in.
             \n\nStrictly the Sun is not at rest either. It orbits the
             barycenter of the Solar System, which is what the
             <strong>Barycenter</strong> option in the same menu shows you.`,
      tip: 'Try it: switch Frame to Barycenter. For this three-body system the barycenter sits almost exactly on the Sun, because the Sun holds essentially all the mass.',
    },
    {
      type: 'read',
      title: 'What actually settled it',
      body: `If the loop does not decide between the two pictures, what did?
             \n\nCopernicus's own arguments were about economy: one moving Earth
             in place of five epicycles, and an ordering of the planets by
             distance that finally matched their periods. Good reasons, not
             proof, and his model was no more accurate than Ptolemy's because he
             kept the circles.
             \n\nThe decisive prediction was <em>stellar parallax</em>. If Earth
             really swings 2 AU across space every six months, then nearby stars
             must shift very slightly against more distant ones over the year.
             Tycho Brahe looked for exactly this, found nothing, and concluded
             correctly that either Earth does not move or the stars are
             impossibly far away. He chose the first.
             \n\nHe was wrong about which, and right that it was the test. The
             stars are impossibly far away: the largest parallax of any star is
             0.77 arcseconds, about the width of a coin seen from three miles. It
             was finally measured in 1838, three centuries after Copernicus.`,
    },
    {
      type: 'question',
      title: 'Why Tycho found nothing',
      kind: 'choice',
      body: `Tycho's instruments were the best in the world before the telescope,
             good to about one arcminute. The largest stellar parallax is
             0.77 arcseconds, and an arcminute is sixty arcseconds.`,
      prompt: 'Tycho’s failure to detect parallax shows that…',
      options: [
        'Earth does not move, exactly as he concluded',
        'his measurements were careless',
        'the effect was about eighty times smaller than his best precision, so a null result was the only possible outcome',
        'parallax does not exist',
      ],
      answer: 2,
      because:
        'A null result from an instrument eighty times too coarse tells you nothing about the effect. Tycho’s reasoning was sound and his data were excellent; what he lacked was any way to know how far away the stars were, so he could not tell a small effect from an absent one. This is a general hazard worth carrying out of the lesson: a measurement that finds nothing constrains a theory only once you know what the measurement could have detected.',
    },
    {
      type: 'measure',
      title: 'How long does a loop last?',
      body: `One last measurement, and it is a prediction you can check against
             the real sky.
             \n\nWith Earth's frame on and Mars selected, watch
             <strong>Direction from Earth</strong> and record the day the number
             starts falling and the day it starts rising again. The gap between
             them is the length of the retrograde episode.`,
      fields: [
        {
          id: 'retro_start',
          label: 'Day the direction starts falling',
          unit: 'days',
        },
        { id: 'retro_end', label: 'Day it starts rising again', unit: 'days' },
        {
          id: 'retro_len',
          label: 'Length of the retrograde episode',
          unit: 'days',
          compute: v => v.retro_end - v.retro_start,
        },
      ],
      probe: ctx => {
        const mars = ctx.find('Mars');
        const seen = mars && ctx.seenFrom ? ctx.seenFrom(mars, 'Earth') : null;
        if (!seen) return [{ label: 'Select Mars', value: '-' }];
        return [
          {
            label: 'Mars: direction from Earth',
            value: `${seen.longitude.toFixed(1)}°`,
          },
          { label: 'Day', value: ctx.days().toFixed(0) },
        ];
      },
    },
    {
      type: 'question',
      title: 'Mars or Jupiter?',
      kind: 'choice',
      body: `Jupiter is at 5.2 AU and takes 11.9 years to go round. Use the
             synodic formula on Earth and Jupiter: 1/S = 1/365 − 1/4333.`,
      prompt: 'Compared with Mars, Jupiter’s retrograde loops happen…',
      options: [
        'less often, because Jupiter is so much further away',
        'more often, roughly once an Earth year, because Jupiter has barely moved while Earth goes round',
        'at the same interval, since both are outer planets',
        'never: only Mars shows retrograde motion',
      ],
      answer: 1,
      because:
        'Jupiter’s synodic period is 399 days, barely more than an Earth year, so it goes retrograde almost every year. Saturn’s is 378 days and Neptune’s 367. The further out a planet is, the less it moves while Earth laps it, so the synodic period converges on one year: in the limit the loop is purely Earth’s own orbit, reflected. That limit is the same fact as the one-year epicycle two steps back, arrived at from the other direction.',
    },
    {
      type: 'read',
      title: 'What you did',
      body: `You measured two orbital periods and computed a synodic period from
             them. You predicted what a planet would look like from a moving
             observer, then changed the frame and watched the prediction come
             true. You located the reversal at opposition, tied it to the
             overtaking geometry, and found the one-year epicycle that a
             geocentric model has to accept as a coincidence.
             \n\nThe simulation was doing exactly one thing throughout: two
             planets on circular orbits, under an inverse-square force from a
             star. Every loop, cusp and reversal came out of subtracting one
             body's position from another's.
             \n\nThat is worth holding onto beyond this lesson. A great many
             things that look like anomalies in the sky turn out to be statements
             about where the observer is standing, and the first question to ask
             of a strange motion is always: measured against what?`,
    },
  ],
};

export const INVESTIGATIONS = [
  KEPLER,
  RETROGRADE,
  TRANSITS,
  ENERGY,
  WEIGHING,
  BLACK_HOLES,
  RADIAL_VELOCITY,
  GOLDILOCKS,
  DARK_MATTER,
  TIDES,
];

/**
 * Find an investigation by id.
 * @param {string} id - Investigation id
 * @returns {Object|undefined} The investigation
 */
export const getInvestigation = id => INVESTIGATIONS.find(i => i.id === id);

/**
 * Steps in an investigation that ask the student for something.
 * @param {Object} inv - Investigation
 * @returns {Array} Steps carrying student input
 */
export const gradedSteps = inv =>
  (inv?.steps || []).filter(s =>
    ['predict', 'measure', 'question'].includes(s.type)
  );

/**
 * Where a lesson sits in its series, if it belongs to one.
 *
 * Derived rather than stored: the three exoplanet lessons are not adjacent in
 * INVESTIGATIONS, and writing "2 of 3" into the data would go stale the moment
 * a fourth was added or the order changed.
 *
 * @param {Object} inv - Investigation
 * @returns {{label: string, index: number, of: number}|null} Position, or null
 */
export function seriesPosition(inv) {
  if (!inv?.series) return null;
  const siblings = INVESTIGATIONS.filter(i => i.series === inv.series);
  return {
    label: inv.series,
    index: siblings.indexOf(inv) + 1,
    of: siblings.length,
  };
}
