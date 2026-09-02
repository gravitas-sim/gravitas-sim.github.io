// =============================================================================
// Kepler's Laws
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

export default KEPLER;
