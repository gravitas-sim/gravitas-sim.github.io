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
// =============================================================================

/** Format a number for display in a probe row. */
const fixed = (v, n = 3) => (Number.isFinite(v) ? v.toFixed(n) : '-');

// --- 1. Kepler's Laws ---------------------------------------------------------

const KEPLER = {
  id: 'keplers-laws',
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
        'exactly cancelled by its speed',
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
             produced in a laboratory. The one labelled "the microwave
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

export const INVESTIGATIONS = [
  KEPLER,
  TRANSITS,
  ENERGY,
  WEIGHING,
  BLACK_HOLES,
  GOLDILOCKS,
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
