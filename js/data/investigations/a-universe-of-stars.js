// =============================================================================
// A universe of stars: size, color, and the H-R diagram
// -----------------------------------------------------------------------------
// Twenty-eight steps on the Stellar Lab (js/stellarWidgets.js, js/stellarLab.js)
// and the eight bundled MIST tracks behind it. No calculus, and no arithmetic
// the readout does not already do.
//
// The line this lesson has to hold
// -----------------------------------------------------------------------------
// Two of the lab's readings look alike and are not the same kind of claim:
//
//   a modelled star      a point on a published evolutionary track, carrying a
//                        mass, an age, a phase and a remaining lifetime
//   a chosen point       a temperature and a luminosity the student put
//                        somewhere, carrying a radius and nothing else
//
// Steps 7 to 11 work entirely in the second mode, and none of them asks for a
// mass, an age or a lifetime, because the diagram does not carry one: at
// 4500 K and 100 solar luminosities six of the eight bundled tracks pass
// close, at ages from ten thousand years to 1.3 billion. Step 21 makes the
// ambiguity the subject rather than a caveat. Nothing here is graded on a
// cursor position.
//
// What the student does rather than reads
// -----------------------------------------------------------------------------
// Five predictions committed before their reveal, nine measurements, four
// comparisons on the pinned stage, two passes over the same synthetic
// population, an open challenge and a written conclusion that is asked to
// disagree with step 1 if the evidence says so. The opening predictions are
// stored under their own step ids and never overwritten, so step 28 can put
// them side by side with what the student now thinks.
//
// Every canvas task has its numbers in the readout beneath the canvas, which
// is what makes the lesson completable without reading the picture. Colour is
// never graded: step 3 asks what changed, not what shade it is.
// =============================================================================

/** A quiet backdrop. Nothing in this lesson is measured off the sandbox. */
const STELLAR_SANDBOX = {
  scenario: 'Stellar Nursery',
  seed: 'a-universe-of-stars',
  camera: { zoom: 1.1, pan: { x: 0, y: 0 } },
  paused: true,
};

/** The lab, in the configuration a step wants it. */
const lab = (extra = {}) => ({ id: 'stellar-lab', ...extra });

/** The comparison stage. */
const stage = (extra = {}) => ({ id: 'stellar-compare', ...extra });

/** The synthetic population. */
const crowd = (extra = {}) => ({ id: 'stellar-population', ...extra });

const A_UNIVERSE_OF_STARS = {
  id: 'a-universe-of-stars',
  thumbnail: 'images/scenarios/stellar-nursery.webp',
  title: 'A Universe of Stars',
  subtitle: 'Size, colour and the H-R diagram, from eight modelled stars',
  duration: '70-90 min',
  level: 'Introductory astronomy',
  tags: ['stars', 'observing'],
  lock: { placement: true, inspector: false, areaSweep: false },
  summary:
    'Three stars, no labels, and a guess about which is biggest. Over twenty-eight steps you separate the four things that get confused with each other - mass, radius, temperature and luminosity - learn to read the diagram that organises them, meet giants and supergiants and white dwarfs where they actually sit on it, work out why the heaviest stars live the shortest lives, and finish by counting a synthetic population twice to see why the stars you can see are not the stars there are.',
  objectives: [
    'Tell mass, radius, temperature, luminosity and apparent brightness apart',
    'Read a position on an H-R diagram, including why temperature runs backwards',
    'Use the relationship between temperature, luminosity and radius in both directions',
    'Say what the main sequence is, and name two kinds of star that are not on it',
    'Explain why a giant is a stage in a life rather than a heavy star',
    'Explain why a star with more fuel can still run out of it sooner',
    'Recognise a selection effect in a sample of stars',
  ],
  steps: [
    // -----------------------------------------------------------------------
    // 1-6: four words that are not synonyms
    // -----------------------------------------------------------------------
    {
      sid: 'three-stars-no-labels',
      type: 'predict',
      title: 'Three stars, no labels',
      body: `Three stars are on the stage, drawn on one common scale, so one
             that looks bigger <em>is</em> bigger. Their numbers are switched
             off for this step.
             \n\nBefore anything is revealed, decide what this picture can
             actually tell you. Commit to an answer; you will be asked about it
             again at the very end.`,
      prompt: 'From this picture alone, which can you be confident about?',
      options: [
        'Which is largest — they are drawn on one scale, so size is readable',
        'Which is most luminous — it will be the brightest on screen',
        'Which has the most mass — the biggest star is the heaviest',
        'All three, because size, brightness and mass go together',
      ],
      answer: 0,
      because:
        'Only the size. The stage uses one scale for all three, so the largest really is the largest. The other two are traps. Brightness on screen is a display choice - the lab draws a star a hundred thousand times fainter than the Sun just as brightly, or you could not see it at all, and the caption under the picture says so. And mass does not follow size: when the numbers come on you will find that star 3, the biggest of the three, has about a fifth of star 2&rsquo;s mass, and star 2 puts out twelve times more light despite being a quarter of the size. Those four words - mass, radius, temperature, luminosity - are four different things, and separating them is what the next twenty-seven steps are for.',
      setup: STELLAR_SANDBOX,
      tool: stage({
        anonymous: true,
        pace: 'phase',
        pins: [
          { track: 'm020' },
          { track: 'm500' },
          { track: 'm100', ageYr: 1.129e10 },
        ],
        hide: ['order', 'sun'],
        note: 'Three modelled stars on one common scale. The numbers are switched off for this step on purpose.',
      }),
      tip: 'Size on this stage is real. Brightness on screen is not — it is chosen so that every star is visible, and the caption says so.',
    },
    {
      sid: 'the-numbers-arrive',
      type: 'measure',
      title: 'Now the numbers',
      body: `Same three stars, labels on. Everything the picture drew is also
             in the list underneath it, which is where the measurements in this
             lesson come from.
             \n\nRead the three surface temperatures and write them down
             coolest first. The unit is the kelvin: the same size as a degree
             Celsius, counted from absolute zero, so a warm room is about
             293&nbsp;K.`,
      fields: [
        { id: 'coolest', label: 'Coolest of the three', unit: 'K' },
        { id: 'middle', label: 'The middle one', unit: 'K' },
        { id: 'hottest', label: 'Hottest of the three', unit: 'K' },
      ],
      validate: v => {
        const all = [v.coolest, v.middle, v.hottest];
        if (all.some(x => !Number.isFinite(x))) {
          return {
            level: 'warn',
            message: 'Three temperatures, from the list under the picture.',
          };
        }
        if (!(v.coolest < v.middle && v.middle < v.hottest)) {
          return {
            level: 'error',
            message: 'Coolest first, hottest last. Put them back in order.',
          };
        }
        if (v.coolest > 4200 || v.hottest < 12000) {
          return {
            level: 'warn',
            message:
              'One of those has come from somewhere else. The three are near 3,400 K, 4,300 K and 16,600 K.',
          };
        }
        return {
          level: 'ok',
          message:
            'Note the order. The hottest is star 2, which is not the largest — and the largest, star 3, is nearly the coolest. Temperature and size are not the same axis.',
        };
      },
      tool: stage({
        pace: 'phase',
        pins: [
          { track: 'm020' },
          { track: 'm500' },
          { track: 'm100', ageYr: 1.129e10 },
        ],
        hide: ['order', 'sun'],
      }),
      tip: 'The list under the picture is the picture&rsquo;s own data. Every measurement in this lesson can be read from it without interpreting the image.',
    },
    {
      sid: 'temperature-makes-colour',
      type: 'explore',
      title: 'What temperature does to colour',
      body: `Switch the lab to a chosen point — the mode button is under the
             diagram — and move the cursor left and right along one horizontal
             line. Left is hotter.
             \n\nYou are changing one thing and watching what follows from it.
             The star drawn beside the diagram is the same star at whatever
             temperature you have selected.`,
      checklist: [
        'Press "Switch mode" until the readout says "A point you chose"',
        'Move the cursor to the far left of the diagram and look at the star beside it',
        'Move it to the far right and look again',
        'Come back to about 6,000 K and stop',
        'Watch the temperature in the list underneath as you move',
        'Read the caption under the star: the colour is the star&rsquo;s, the brightness is not',
      ],
      tool: lab({ mode: 'free', regions: false, compare: false }),
      tip: 'Click or drag on the diagram, use the arrow keys, or type into the two sliders — all three do the same thing. Nothing in this lesson is graded on which shade you see.',
    },
    {
      sid: 'same-temperature-different-light',
      type: 'read',
      title: 'Two stars, one temperature',
      body: `Both stars on the stage have a surface near 4,300&nbsp;K. They are
             the same colour, because colour follows surface temperature and
             nothing else.
             \n\nOne of them puts out about three hundred times as much light
             as the other.
             \n\nThink about what a fixed temperature means. Every square metre
             of a 4,300&nbsp;K surface radiates the same amount per second,
             whichever star it belongs to — that is what a temperature
             <em>is</em>. So the only way one of these can put out three
             hundred times the light is to have far more square metres.`,
      tool: stage({
        pace: 'phase',
        pins: [
          { track: 'm050', at: 1 },
          { track: 'm100', ageYr: 1.129e10 },
        ],
        hide: ['order'],
      }),
      tip: 'Luminosity is the total light a star emits. Apparent brightness is how much of it reaches you, which also depends on distance. This step is about the first.',
    },
    {
      sid: 'predict-which-is-bigger',
      type: 'predict',
      title: 'Which is bigger, and by how much?',
      body: `Same two stars. Same surface temperature. One about three hundred
             times more luminous.
             \n\nCommit before you measure. The reasoning matters more than the
             number: a star&rsquo;s surface area grows as the <em>square</em>
             of its radius.`,
      prompt:
        'Two stars at the same surface temperature, one 300 times more luminous. Its radius is about…',
      options: [
        '300 times larger',
        '17 times larger',
        'the same — luminosity and size are separate properties',
        '90,000 times larger',
      ],
      answer: 1,
      because:
        'About seventeen, because area goes as the square of the radius and the square root of 300 is a little over 17. That is the whole of the relationship between the three quantities: the light a star puts out is its surface area times how hard each patch of that surface radiates, and at a fixed temperature the second factor is the same for both. Double the radius and you quadruple the light.',
      tool: stage({
        pace: 'phase',
        pins: [
          { track: 'm050', at: 1 },
          { track: 'm100', ageYr: 1.129e10 },
        ],
        hide: ['order'],
      }),
      tip: 'Radius, not diameter. Every size in this lesson is a radius, in units of the Sun&rsquo;s radius — 696,000 km.',
    },
    {
      sid: 'measure-the-radius-ratio',
      type: 'measure',
      title: 'Measure it',
      body: `Read both radii off the list and do the division yourself. The
             stage reports the ratio on the second star&rsquo;s line, so you
             can check your answer against it.
             \n\nThen press <strong>Save to notebook</strong>. The entry
             records which models these were and what the lab computed, so the
             comparison is evidence rather than a remembered number.`,
      fields: [
        { id: 'small', label: 'Radius of the smaller', unit: 'R☉' },
        { id: 'large', label: 'Radius of the larger', unit: 'R☉' },
        {
          id: 'ratio',
          label: 'How many times larger',
          unit: '×',
          compute: v => v.large / v.small,
          decimals: 1,
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.small) || !Number.isFinite(v.large)) {
          return { level: 'warn', message: 'Both radii, in solar radii.' };
        }
        if (v.large < v.small) {
          return {
            level: 'error',
            message: 'The larger radius goes in the second box.',
          };
        }
        const ratio = v.large / v.small;
        if (ratio < 11 || ratio > 27) {
          return {
            level: 'warn',
            message:
              'That is not the ratio the stage reports. Check that both radii came from these two stars.',
          };
        }
        return {
          level: 'ok',
          message:
            'About 18.4, and the square root of the luminosity ratio is 18.6. The small gap is because the two temperatures are close rather than identical — 4,272 K against 4,298 K.',
        };
      },
      tool: stage({
        pace: 'phase',
        pins: [
          { track: 'm050', at: 1 },
          { track: 'm100', ageYr: 1.129e10 },
        ],
        hide: ['order'],
        capture: true,
      }),
      tip: 'This shortcut works because the temperatures match. When they do not, both factors move at once — which is what the diagram in the next step is for.',
    },

    // -----------------------------------------------------------------------
    // 7-11: the diagram, and what a point on it does not mean
    // -----------------------------------------------------------------------
    {
      sid: 'the-two-axes',
      type: 'measure',
      title: 'The diagram, and its backwards axis',
      body: `Everything from here on happens on one diagram: temperature along
             the bottom, luminosity up the side, both logarithmic, so a step
             along an axis is a multiplication rather than an addition.
             \n\nOne oddity to get used to now: <strong>temperature increases
             to the left.</strong> Hot on the left, cool on the right. There is
             no good reason for it — the first versions of this diagram were
             drawn against spectral classes that happened to be ordered that
             way, and everyone since has read it backwards. It catches
             everybody once. Both ends of the axis are labelled.
             \n\nPut the cursor as near as you can to 10,000&nbsp;K and 100
             solar luminosities, then record where you actually landed.`,
      fields: [
        { id: 'teff', label: 'Temperature you placed it at', unit: 'K' },
        { id: 'lum', label: 'Luminosity there', unit: 'L☉' },
      ],
      validate: v => {
        if (!Number.isFinite(v.teff) || !Number.isFinite(v.lum)) {
          return { level: 'warn', message: 'Both numbers, off the readout.' };
        }
        if (v.teff < 7000) {
          return {
            level: 'error',
            message:
              'That is cooler than 10,000 K, not hotter. The axis runs backwards: to raise the temperature, move left.',
          };
        }
        if (v.teff > 14000 || v.lum < 40 || v.lum > 250) {
          return {
            level: 'warn',
            message: 'Close. Nudge it with the arrow keys or the two sliders.',
          };
        }
        return {
          level: 'ok',
          message:
            'That is the place. Now notice what the readout does not say: no mass, no age, no lifetime. A point on this diagram does not carry them. The next four steps are about what it does carry.',
        };
      },
      tool: lab({ mode: 'free', regions: true, compare: false }),
      tip: 'Click or drag on the diagram, move it with the arrow keys, or type numbers into the sliders. The sliders are the same instrument.',
    },
    {
      sid: 'where-the-sun-sits',
      type: 'measure',
      title: 'Find the Sun',
      body: `The Sun&rsquo;s surface is at 5,772&nbsp;K and its luminosity is,
             by definition, one solar luminosity. Put the cursor there and read
             off the radius.
             \n\nYou should get about one solar radius. That is not circular:
             the lab is not looking the Sun up. It is computing a radius from
             the temperature and the luminosity you placed, with the same
             relation it uses everywhere else. Getting 1.0 back is a check that
             the relation is doing its job.`,
      fields: [{ id: 'radius', label: 'Radius the lab reports', unit: 'R☉' }],
      validate: v => {
        if (!Number.isFinite(v.radius)) {
          return { level: 'warn', message: 'One number, off the readout.' };
        }
        if (v.radius < 0.85 || v.radius > 1.2) {
          return {
            level: 'warn',
            message:
              'Not on the Sun yet. Set the temperature first — 5,772 K, and remember hotter is to the left — then bring the luminosity to 1.',
          };
        }
        return {
          level: 'ok',
          message:
            'One solar radius, from a temperature and a luminosity alone. This is where the Sun is now. It has not always been here and will not stay.',
        };
      },
      tool: lab({ mode: 'free', regions: true, capture: true, compare: false }),
      tip: 'The Sun is the reference for all three units here — R☉, L☉ and M☉. That is a convenience, not a claim that it is a typical star. Step 24 shows what typical looks like.',
    },
    {
      sid: 'straight-up-the-diagram',
      type: 'measure',
      title: 'Straight up, at one temperature',
      body: `From the Sun&rsquo;s position, move the cursor straight up —
             brighter, same temperature — to 10,000 solar luminosities, and
             read the radius there.
             \n\nYou are repeating the comparison from step 6, but doing it
             yourself and over a much bigger range.`,
      fields: [
        {
          id: 'radius',
          label: 'Radius at 5,772 K and 10,000 L☉',
          unit: 'R☉',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.radius)) {
          return { level: 'warn', message: 'The radius from the readout.' };
        }
        if (v.radius < 70 || v.radius > 130) {
          return {
            level: 'warn',
            message:
              'Check both numbers: the temperature should still read about 5,772 K, and the luminosity 10,000.',
          };
        }
        return {
          level: 'ok',
          message:
            'A hundred solar radii, which is the square root of ten thousand. Four decades up the diagram at one temperature is two decades in radius, every time.',
        };
      },
      tool: lab({ mode: 'free', regions: true, compare: false }),
      tip: 'Watch the size class in the readout change on the way up. It is a label attached to a region of the diagram, not a separate measurement.',
    },
    {
      sid: 'sideways-at-one-luminosity',
      type: 'question',
      title: 'Sideways, at one luminosity',
      kind: 'choice',
      body: `Now move the other way. Put the cursor at 1 solar luminosity and
             travel along that line, from the cool right-hand side to the hot
             left-hand side, watching the radius.
             \n\nAt a fixed luminosity, a hotter surface radiates far harder
             per square metre — as the fourth power of the temperature — so
             the star needs fewer square metres to put out the same light.`,
      prompt:
        'Moving left along a line of constant luminosity, from 3,000 K to 30,000 K, the radius…',
      options: [
        'grows, because hotter stars are bigger',
        'stays the same, because the luminosity is fixed',
        'shrinks by a factor of about 100',
        'shrinks by a factor of about 10',
      ],
      answer: 2,
      because:
        'It shrinks by about a hundred. Ten times the temperature is ten to the fourth - ten thousand times - the output per square metre, and to hold the total light fixed the area must fall by the same ten thousand, which is a hundred in radius. Check it on the diagram: at 1 L(sun) the cool end is about 3.7 solar radii and the hot end about 0.037. That second number is white-dwarf territory, and step 20 comes back to it.',
      tool: lab({ mode: 'free', regions: true, compare: false }),
      tip: 'Both moves - up the diagram and along it - are the same relation used in different directions. Nothing new is being introduced.',
    },
    {
      sid: 'lines-of-constant-radius',
      type: 'measure',
      title: 'Lines of one size',
      body: `Turn on <strong>Constant-radius lines</strong>. Each dashed line
             joins every temperature-and-luminosity pair that gives one radius,
             and on these axes they come out straight.
             \n\nUse the 1&nbsp;R☉ line. Find two points on it with clearly
             different temperatures and record the luminosity at each: two
             stars the same size as the Sun, one hot and one cool.`,
      fields: [
        { id: 'coolT', label: 'Cooler point, temperature', unit: 'K' },
        { id: 'coolL', label: 'Its luminosity', unit: 'L☉' },
        { id: 'hotT', label: 'Hotter point, temperature', unit: 'K' },
        { id: 'hotL', label: 'Its luminosity', unit: 'L☉' },
      ],
      validate: v => {
        const all = [v.coolT, v.coolL, v.hotT, v.hotL];
        if (all.some(x => !Number.isFinite(x) || x <= 0)) {
          return {
            level: 'warn',
            message: 'All four numbers, from the readout.',
          };
        }
        if (v.hotT <= v.coolT) {
          return {
            level: 'error',
            message: 'The hotter of the two goes in the second pair.',
          };
        }
        // Both should imply about one solar radius, whatever pair they chose.
        const r = (L, T) => Math.sqrt(L) / (T / 5772) ** 2;
        const rc = r(v.coolL, v.coolT);
        const rh = r(v.hotL, v.hotT);
        if (rc < 0.6 || rc > 1.7 || rh < 0.6 || rh > 1.7) {
          return {
            level: 'warn',
            message:
              'At least one of those is not on the 1 R☉ line — the radius in the readout should stay near 1.0 at both.',
          };
        }
        if (v.hotT / v.coolT < 1.8) {
          return {
            level: 'warn',
            message:
              'They work, but the two temperatures are close together. Spread them further apart to make the point clearly.',
          };
        }
        return {
          level: 'ok',
          message:
            'Two stars of the same size, and the hotter one is enormously more luminous — the ratio should be close to the fourth power of the temperature ratio. Same size, different star.',
        };
      },
      tool: lab({
        mode: 'free',
        regions: true,
        guides: true,
        capture: true,
        compare: false,
      }),
      tip: 'The lines are straight because log L = 2 log R + 4 log T: at a fixed radius that is a straight line with slope 4. That is why this diagram separates giants from dwarfs so cleanly.',
    },

    // -----------------------------------------------------------------------
    // 12-16: the main sequence, and what it does not cover
    // -----------------------------------------------------------------------
    {
      sid: 'switch-to-modelled-stars',
      type: 'explore',
      title: 'Stars that are actually modelled',
      body: `So far every point has been one you chose. Switch back to
             <strong>A modelled star</strong> and the readout changes
             character: now there is a mass, an age, a phase and a lifetime,
             because a published stellar-evolution calculation put this star
             here and knows how it got there.
             \n\nEight of them are bundled, at 0.2, 0.5, 1, 2, 5, 10, 20 and
             40 solar masses, all with the Sun&rsquo;s composition and no
             rotation. Step through them and watch where each one sits.`,
      checklist: [
        'Press "Switch mode" until the readout says "A modelled star"',
        'Move the "Modelled star" slider from 0.2 M☉ up to 40 M☉, one step at a time',
        'Watch the marker travel up and to the left as the mass rises',
        'Read the mass, the age and the phase in the list at each stop',
        'Notice that the band the markers trace out is the shaded main-sequence region',
      ],
      tool: lab({ mode: 'model', regions: true, compare: false }),
      tip: 'The shaded regions are drawn from these tracks&rsquo; own starting and ending points, so the band and the markers cannot disagree.',
    },
    {
      sid: 'three-on-the-main-sequence',
      type: 'measure',
      title: 'Three main-sequence stars',
      body: `Three stars pinned, all in the middle of their main-sequence
             lives: 0.2, 1 and 20 solar masses.
             \n\nRead the temperature and the luminosity of the smallest and
             the largest, and work out how many times more light the heavy one
             puts out.`,
      fields: [
        { id: 'smallL', label: 'Luminosity of the 0.2 M☉ star', unit: 'L☉' },
        { id: 'bigL', label: 'Luminosity of the 20 M☉ star', unit: 'L☉' },
        {
          id: 'ratio',
          label: 'How many times more light',
          unit: '×',
          compute: v => v.bigL / v.smallL,
          decimals: 0,
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.smallL) || !Number.isFinite(v.bigL)) {
          return { level: 'warn', message: 'Both luminosities, off the list.' };
        }
        const ratio = v.bigL / v.smallL;
        if (ratio < 2e6) {
          return {
            level: 'warn',
            message:
              'That is smaller than the list gives. The faint one is a few thousandths of a solar luminosity and the bright one is tens of thousands.',
          };
        }
        return {
          level: 'ok',
          message:
            'Around nine million. A hundredfold in mass has bought nine million in light — and the radius has only gone from 0.24 to 7.3 solar radii, a factor of 30. Almost all of that light comes from being hot, not from being big.',
        };
      },
      tool: stage({
        pace: 'phase',
        pins: [{ track: 'm020' }, { track: 'm100' }, { track: 'm2000' }],
        capture: true,
      }),
      tip: 'Order the stage by luminosity or by temperature as well as by radius — the three orderings put these stars in the same sequence, which will stop being true in step 17.',
    },
    {
      sid: 'predict-mass-and-light',
      type: 'predict',
      title: 'How steeply?',
      body: `You have two points on the main sequence: 0.2 solar masses giving
             about 0.0066 solar luminosities, and 20 solar masses giving about
             59,000.
             \n\nA hundred times the mass, nine million times the light.
             Commit to the shape of that relationship before checking the
             stars in between.`,
      prompt:
        'Along the main sequence, luminosity rises roughly as mass to the power…',
      options: ['1 — proportional', '2', '3.5', '10'],
      answer: 2,
      because:
        'Roughly the 3.5th power, and this measurement gives 3.5 almost exactly: nine million is a hundred to the power 3.5. It is not a law of nature - it is a summary of what stellar-structure calculations produce for stars supported the way main-sequence stars are - and the exponent is not really constant, running steeper near a solar mass and shallower at the top end. What matters for the rest of this lesson is that it is very steep. A star with ten times the mass does not put out ten times the light; it puts out thousands of times more.',
      tool: stage({
        pace: 'phase',
        pins: [{ track: 'm020' }, { track: 'm100' }, { track: 'm2000' }],
      }),
      tip: 'A hundred to the power 3.5 is ten to the power seven, which is ten million — near enough to nine million for a relationship this rough.',
    },
    {
      sid: 'the-whole-sequence',
      type: 'measure',
      title: 'All eight, in one comparison',
      body: `Check the trend across the whole set rather than at its two ends.
             Go back to the lab, step the mass slider through all eight models,
             and record the luminosity of the 1, 5 and 20 solar-mass stars.
             \n\nThis is a controlled comparison: every star is at the middle
             of its main-sequence life, every model has the same composition
             and no rotation, and the only thing changing is the mass.`,
      fields: [
        { id: 'one', label: '1 M☉', unit: 'L☉' },
        { id: 'five', label: '5 M☉', unit: 'L☉' },
        { id: 'twenty', label: '20 M☉', unit: 'L☉' },
      ],
      validate: v => {
        const all = [v.one, v.five, v.twenty];
        if (all.some(x => !Number.isFinite(x) || x <= 0)) {
          return {
            level: 'warn',
            message: 'Three luminosities, all positive.',
          };
        }
        if (!(v.one < v.five && v.five < v.twenty)) {
          return {
            level: 'error',
            message:
              'They should rise with mass. Check which star each came from.',
          };
        }
        // The slope between the first and last of the three.
        const slope = Math.log(v.twenty / v.one) / Math.log(20);
        if (slope < 3 || slope > 4.2) {
          return {
            level: 'warn',
            message:
              'Those do not give the slope the models do. The 1 M☉ star is near 1.2 L☉, the 5 M☉ near 730 and the 20 M☉ near 59,000.',
          };
        }
        return {
          level: 'ok',
          message:
            'A slope near 3.6 across that range. Notice you have not been asked to apply it to anything off the main sequence — the giant in step 4 was a solar-mass star putting out fifty times what this table says a solar mass should.',
        };
      },
      tool: lab({ mode: 'model', regions: true, capture: true }),
      tip: 'The bench that runs A/B experiments in Gravitas measures orbits, not stars, so this comparison is run on the models directly. The instructor notes say why the two cannot be joined up.',
    },
    {
      sid: 'what-the-trend-covers',
      type: 'question',
      title: 'What the trend does and does not cover',
      kind: 'short',
      body: `You have measured a steep relationship between mass and luminosity
             — and you measured it on eight stars that were all doing the same
             thing: fusing hydrogen in their cores, in the middle of their
             lives.
             \n\nThe giant in step 4 had a mass of almost exactly one solar
             mass and put out 58 solar luminosities, fifty times what the
             main-sequence relation gives for that mass.`,
      prompt:
        'In two or three sentences: what is the main sequence, and why does the mass–luminosity relation you measured not apply to that giant?',
      rubric:
        'Full credit needs two ideas. First, that the main sequence is not a category of star but a stage - the long stretch during which a star fuses hydrogen in its core - and that stars sit in a narrow band on the diagram during it because for that mechanism the mass largely fixes the temperature and the luminosity. Second, that the giant is the same star at a later stage, no longer supported the same way, so a relation fitted to core-hydrogen burning has no reason to hold. Credit an answer that says the giant "has left the main sequence" and shows it understands that means a change of mechanism rather than a change of position. Do NOT credit "the giant is bigger so the relation is different" with no mechanism, and do not credit an answer that treats the main sequence as a class of object that some stars belong to permanently.',
      tool: lab({ mode: 'model', regions: true }),
      tip: 'The word "sequence" is a historical accident too. It is a sequence in mass, not in time: no star travels along it.',
    },

    // -----------------------------------------------------------------------
    // 17-21: everything that is not on the main sequence
    // -----------------------------------------------------------------------
    {
      sid: 'two-red-stars',
      type: 'predict',
      title: 'Two red stars',
      body: `Both stars on the stage have a surface near 3,350&nbsp;K. Both are
             red. Both are classified M.
             \n\nOne is a 0.2 solar-mass star fusing hydrogen in its core. The
             other is a star that began with one solar mass — the Sun&rsquo;s
             mass — and has finished doing that.
             \n\nThe stage is set to <em>true relative sizes</em>. Look at it,
             then commit.`,
      prompt: 'The two stars differ in radius by a factor of about…',
      options: ['4', '40', '400', 'nothing — same temperature means same size'],
      answer: 2,
      because:
        'About four hundred. The little one is 0.24 solar radii, the swollen one is 102. They are the same colour and the same temperature and one would swallow the other two hundred million times over. This is why "red star" is not a useful category on its own, and it is the single clearest demonstration in the lesson that colour tells you about a surface and nothing about a size. The classification that separates them is not colour but luminosity: one is a red dwarf, the other a red giant.',
      setup: STELLAR_SANDBOX,
      tool: stage({
        pace: 'phase',
        pins: [{ track: 'm020' }, { track: 'm100', at: 0.206 }],
        hide: ['order'],
      }),
      tip: 'If the smaller one is drawn as a marker rather than a disc, that is not a rendering failure — the caption says so. At this scale it is genuinely smaller than a pixel.',
    },
    {
      sid: 'measure-the-two-reds',
      type: 'measure',
      title: 'Measure them, and their light',
      body: `Read both radii and both luminosities off the list, and work out
             the two ratios.
             \n\nThen save the comparison to your notebook — this one is the
             centrepiece of the argument you will be asked to write at the end.`,
      fields: [
        { id: 'rSmall', label: 'Radius of the dwarf', unit: 'R☉' },
        { id: 'rBig', label: 'Radius of the giant', unit: 'R☉' },
        { id: 'lSmall', label: 'Luminosity of the dwarf', unit: 'L☉' },
        { id: 'lBig', label: 'Luminosity of the giant', unit: 'L☉' },
        {
          id: 'rRatio',
          label: 'Radius ratio',
          unit: '×',
          compute: v => v.rBig / v.rSmall,
          decimals: 0,
        },
        {
          id: 'lRatio',
          label: 'Luminosity ratio',
          unit: '×',
          compute: v => v.lBig / v.lSmall,
          decimals: 0,
        },
      ],
      validate: v => {
        const all = [v.rSmall, v.rBig, v.lSmall, v.lBig];
        if (all.some(x => !Number.isFinite(x) || x <= 0)) {
          return { level: 'warn', message: 'All four numbers, from the list.' };
        }
        if (v.rBig < v.rSmall || v.lBig < v.lSmall) {
          return {
            level: 'error',
            message: 'The giant goes in the second box of each pair.',
          };
        }
        const rr = v.rBig / v.rSmall;
        const lr = v.lBig / v.lSmall;
        if (rr < 250 || rr > 600) {
          return {
            level: 'warn',
            message:
              'The radius ratio is not what the list gives — check both numbers came from these two stars.',
          };
        }
        const expected = rr * rr;
        if (lr < expected / 3 || lr > expected * 3) {
          return {
            level: 'warn',
            message:
              'The luminosity ratio should be close to the square of the radius ratio, because the temperatures nearly match. One of the four is off.',
          };
        }
        return {
          level: 'ok',
          message:
            'Around 430 in radius and 175,000 in light, and 430 squared is 185,000. The whole difference between these two stars is how much surface they have. Same temperature, same colour, same spectral class.',
        };
      },
      tool: stage({
        pace: 'phase',
        pins: [{ track: 'm020' }, { track: 'm100', at: 0.206 }],
        hide: ['order'],
        capture: true,
      }),
      tip: 'A giant is not a heavy star. This one has 0.97 solar masses — less than the Sun, because it has already blown some away — and the dwarf beside it has 0.2.',
    },
    {
      sid: 'a-supergiant',
      type: 'measure',
      title: 'And now a supergiant',
      body: `A third star joins them: a model that began with twenty solar
             masses, at the end of the track, where MESA stopped following it
             just before its core collapsed.
             \n\nThe Sun is on the stage as a reference, and where a star is
             larger than an orbit of the Solar System, that orbit is drawn as a
             dashed circle for scale. That is a size comparison and nothing
             more — nobody is claiming a planet was ever there.
             \n\nRecord its radius, and how many times the Sun&rsquo;s it is.`,
      fields: [
        { id: 'radius', label: 'Radius of the supergiant', unit: 'R☉' },
        { id: 'mass', label: 'Its mass now', unit: 'M☉' },
      ],
      validate: v => {
        if (!Number.isFinite(v.radius) || !Number.isFinite(v.mass)) {
          return {
            level: 'warn',
            message: 'A radius and a mass, from the list.',
          };
        }
        if (v.radius < 800 || v.radius > 1400) {
          return {
            level: 'warn',
            message: 'The list gives about 1,070 solar radii for this star.',
          };
        }
        if (v.mass > 18) {
          return {
            level: 'warn',
            message:
              'That is the mass it was born with. The list reports both — the one it has now is smaller, and the difference matters.',
          };
        }
        return {
          level: 'ok',
          message:
            'About 1,070 solar radii — five times the radius of Earth&rsquo;s orbit, and just inside Jupiter&rsquo;s. And its mass is about 14, not the 20 it started with: it has blown roughly six solar masses of itself into space, which is most of what the model spends its last few million years doing.',
        };
      },
      tool: stage({
        pace: 'phase',
        pins: [
          { track: 'm100' },
          { track: 'm100', at: 0.206 },
          { track: 'm2000', at: 1 },
        ],
        capture: true,
      }),
      tip: 'Switch the stage to "fit each star" and back. In that mode every star fills its own box and the magnification is printed under each one, because the apparent sizes are no longer comparable.',
    },
    {
      sid: 'hot-and-faint',
      type: 'measure',
      title: 'Hot, and almost invisible',
      body: `Back to the lab, on the one-solar-mass track, with the age slider
             paced by phase rather than by time — otherwise the whole of what
             follows the main sequence is a sliver you cannot land on.
             \n\nDrag the age slider all the way to the right, to the very end
             of the track. What is left is the exposed core of the star: no
             fusion, just a hot cinder cooling down.
             \n\nRead its temperature, its luminosity and its radius.`,
      fields: [
        { id: 'teff', label: 'Temperature', unit: 'K' },
        { id: 'lum', label: 'Luminosity', unit: 'L☉' },
        { id: 'radius', label: 'Radius', unit: 'R☉' },
      ],
      validate: v => {
        const all = [v.teff, v.lum, v.radius];
        if (all.some(x => !Number.isFinite(x) || x <= 0)) {
          return { level: 'warn', message: 'All three, from the list.' };
        }
        if (v.teff < 30000) {
          return {
            level: 'warn',
            message:
              'Not far enough along yet. Drag the age slider to the very end of the track.',
          };
        }
        if (v.radius > 0.1) {
          return {
            level: 'warn',
            message:
              'The radius should be a few hundredths of a solar radius. Check you are reading the end of the track.',
          };
        }
        return {
          level: 'ok',
          message:
            'Around 48,000 K — hotter than any main-sequence star in this set — and yet only about one and a half solar luminosities, because it is 0.018 solar radii across. That is about twice the radius of the Earth, holding about half the mass of the Sun.',
        };
      },
      tool: lab({
        mode: 'model',
        pace: 'phase',
        paceControl: true,
        regions: true,
        capture: true,
      }),
      tip: 'Press "Change what the age slider paces" to switch back to time and watch this whole stretch of the track collapse into the last sliver of the slider. Both are true; they answer different questions.',
    },
    {
      sid: 'classify-from-position',
      type: 'question',
      title: 'Read the diagram',
      kind: 'choice',
      body: `You have now met all four regions. A star is found at
             30,000&nbsp;K and 0.01 solar luminosities.
             \n\nWork out its radius before you answer — you can put the cursor
             there in the free mode if you want to, and the readout will do the
             arithmetic.`,
      prompt: 'A star at 30,000 K and 0.01 L☉ is…',
      options: [
        'a hot main-sequence star, because it is at 30,000 K',
        'a white dwarf, because that temperature and that faintness together force it to be tiny',
        'a red giant, because it is faint',
        'impossible — nothing can be that hot and that faint',
      ],
      answer: 1,
      because:
        'A white dwarf. At 30,000 K each square metre is radiating ferociously, so putting out only a hundredth of a solar luminosity takes a very small surface: the radius works out at about 0.0037 solar radii, well under the size of the Earth. A main-sequence star at 30,000 K would be tens of thousands of solar luminosities, six million times brighter than this. Position on the diagram is enough to classify it, because the two axes fix the radius between them - and that is what the diagram is for.',
      tool: lab({ mode: 'free', regions: true, compare: false }),
      tip: 'The regions on the diagram are drawn as soft blocks with dashed edges on purpose. A star is not a giant because it crossed a line; the shading is a summary of where each kind of star ends up.',
    },

    // -----------------------------------------------------------------------
    // 22-23: why the big ones go first
    // -----------------------------------------------------------------------
    {
      sid: 'predict-who-lives-longer',
      type: 'predict',
      title: 'More fuel, longer life?',
      body: `A twenty solar-mass star has a hundred times as much material as a
             0.2 solar-mass one. A hundred times the fuel.
             \n\nYou also measured, in step 15, that it puts out something like
             nine million times as much light — and light is the fuel leaving.
             \n\nCommit before you look it up.`,
      prompt:
        'The 20 M☉ star&rsquo;s main-sequence life, compared with the 0.2 M☉ star&rsquo;s, is…',
      options: [
        'about a hundred times longer — it has a hundred times the fuel',
        'about the same — the two effects cancel',
        'about a hundred thousand times shorter',
        'about ten times shorter',
      ],
      answer: 2,
      because:
        'Shorter by more than a hundred thousand. This is the single most useful consequence of the steep mass-luminosity relation, and it is worth stating as a ratio: how long the fuel lasts is how much there is divided by how fast it goes. The fuel goes as the mass, and the rate goes as the luminosity, which goes as roughly the mass to the 3.5. So the lifetime goes as mass divided by mass-to-the-3.5, which is one over mass-to-the-2.5. A hundred times the mass is a hundred to the power two and a half - a hundred thousand - times shorter. The next step measures it.',
      setup: STELLAR_SANDBOX,
      tool: lab({ mode: 'model', regions: true, compare: false }),
      tip: 'A car with a bigger tank does not necessarily go further. It depends what the engine does with it.',
    },
    {
      sid: 'measure-the-lifetimes',
      type: 'measure',
      title: 'How long each one lasts',
      body: `The readout gives the total main-sequence lifetime for whichever
             model is selected. Step the mass slider across and record three of
             them.
             \n\nOne of these numbers deserves care. The 0.2 solar-mass model
             gives a main-sequence lifetime of about 1.1&nbsp;<em>trillion</em>
             years. The Universe is about 13.8 billion years old — roughly a
             thousandth of that. So no such star has ever finished its main
             sequence, anywhere. That figure is a prediction made by
             integrating a model forward, not an observed lifetime, and it
             cannot be checked against anything.`,
      fields: [
        { id: 'small', label: '0.2 M☉ main-sequence lifetime', unit: 'Gyr' },
        { id: 'sun', label: '1 M☉', unit: 'Gyr' },
        { id: 'big', label: '20 M☉', unit: 'Gyr' },
      ],
      validate: v => {
        const all = [v.small, v.sun, v.big];
        if (all.some(x => !Number.isFinite(x) || x <= 0)) {
          return {
            level: 'warn',
            message:
              'Three lifetimes, all in billions of years. The readout may give the largest in trillions — 1.1 trillion is 1,100 billion.',
          };
        }
        if (!(v.big < v.sun && v.sun < v.small)) {
          return {
            level: 'error',
            message:
              'They should fall as the mass rises. Check which star each figure came from.',
          };
        }
        if (v.big > 0.1) {
          return {
            level: 'warn',
            message:
              'The 20 M☉ figure is about 8.7 million years, which is 0.0087 billion.',
          };
        }
        return {
          level: 'ok',
          message:
            'About 1,140,000 million years, 9,880 million and 8.7 million: a factor of 130,000 across the set. The heaviest star in this lesson finished its main sequence before the lightest had got started, and the lightest will still be on it when the Universe is a hundred times its present age.',
        };
      },
      tool: lab({ mode: 'model', regions: true, capture: true }),
      tip: 'Use the age slider paced by time here, not by phase. Paced by time, how far the handle has travelled really is how far through the life it is — which is exactly the question this step is asking.',
    },

    // -----------------------------------------------------------------------
    // 24-26: a population, counted twice
    // -----------------------------------------------------------------------
    {
      sid: 'a-population',
      type: 'measure',
      title: 'Four hundred stars',
      body: `A synthetic population: four hundred stars drawn from a published
             distribution of birth masses, spread over the last ten billion
             years, each one placed on the same tracks you have been using —
             the ones between 0.2 and 20 solar masses, which is the range the
             mass function is sampled over. It is reproducible from its seed, and it is not a survey —
             nothing in it was observed and no star in it is real.
             \n\nThe histogram counts them by spectral type: O and B are the
             hot ones, then A, F, G — the Sun is a G — then K and the cool
             M&nbsp;dwarfs.
             \n\nCount the two commonest types.`,
      fields: [
        { id: 'm', label: 'How many are type M', unit: '' },
        { id: 'k', label: 'How many are type K', unit: '' },
        { id: 'g', label: 'How many are type G, like the Sun', unit: '' },
      ],
      validate: v => {
        const all = [v.m, v.k, v.g];
        if (all.some(x => !Number.isFinite(x) || x < 0)) {
          return { level: 'warn', message: 'Three counts, off the histogram.' };
        }
        if (!(v.m > v.k && v.k > v.g)) {
          return {
            level: 'error',
            message:
              'Those are not in the order the histogram shows. M is the tallest bar by a long way.',
          };
        }
        if (v.m < 150) {
          return {
            level: 'warn',
            message:
              'The M bar is the tall one on the right — over two hundred.',
          };
        }
        return {
          level: 'ok',
          message:
            'Two hundred and twenty-seven M dwarfs out of 351 placed — nearly two thirds — and twenty-one stars like the Sun. Not one O star and not one B star survived to be placed: the sample drew a few, and they had already left the main sequence, so they were dropped rather than guessed at. The readout says how many.',
        };
      },
      tool: crowd({ view: 0 }),
      tip: 'The readout lists every count as a number as well as drawing it, and says what the sample leaves out: no dust, no binaries, no composition but the Sun&rsquo;s.',
    },
    {
      sid: 'only-the-bright-ones',
      type: 'measure',
      title: 'Now only the ones you could see',
      body: `Same four hundred stars — the same sample, not a new one. Switch
             the view to the bright subset. Every star is placed at the same
             distance, a hundred parsecs, and only those above a stated
             brightness cut are kept.
             \n\nThis is the crudest possible model of what a survey does, and
             it is enough.
             \n\nCount again.`,
      fields: [
        { id: 'kept', label: 'How many stars are left', unit: '' },
        { id: 'm', label: 'Of those, how many are type M', unit: '' },
        { id: 'f', label: 'How many are type F', unit: '' },
      ],
      validate: v => {
        const all = [v.kept, v.m, v.f];
        if (all.some(x => !Number.isFinite(x) || x < 0)) {
          return { level: 'warn', message: 'Three counts, off the histogram.' };
        }
        if (v.kept > 60) {
          return {
            level: 'warn',
            message:
              'That looks like the whole sample. Switch the view to the bright subset — the readout says how many are kept.',
          };
        }
        if (v.m > 0) {
          return {
            level: 'error',
            message:
              'Look again at the M column in the bright subset. The number there is the point of this step.',
          };
        }
        return {
          level: 'ok',
          message:
            'Sixteen stars left out of 351, and not one of them is an M dwarf — the type that was two thirds of the sample. Half of what is left is type F, which was two per cent of it.',
        };
      },
      tool: crowd({ view: 1, capture: true }),
      tip: 'The threshold slider moves the cut. Raise it and the survivors get rarer and hotter; lower it and the M dwarfs come back. The population underneath never changes.',
    },
    {
      sid: 'what-a-survey-misses',
      type: 'question',
      title: 'What a catalogue of bright stars is a catalogue of',
      kind: 'short',
      body: `Two counts of one population. Two thirds M dwarfs; none at all
             once you keep only the bright ones.
             \n\nEvery star you can see by eye from a dark site is a member of
             the second list. Not one M dwarf is.`,
      prompt:
        'In two or three sentences: why can a list of the brightest stars in the sky give a badly wrong impression of what stars are usually like? Use a number from your two counts.',
      rubric:
        'Full credit needs the mechanism and a number. The mechanism: a brightness cut selects on luminosity, luminosity varies over a far wider range than the numbers of stars do, and so the rare luminous stars are enormously over-represented among the ones that pass the cut - two out of 351 A stars become an eighth of the bright list, while 227 M dwarfs become none of it. Any of those figures counts as the number. Credit an answer that gets the mechanism with a different correct figure. Do NOT credit "the bright ones are closer", which is a different selection effect and is not what this model does - every star here was placed at the same distance, and the instructor notes flag this as the most common wrong answer. Do not credit an answer that simply restates the counts without saying why the cut produces them.',
      tool: crowd({ view: 1 }),
      tip: 'This is a selection effect: a conclusion about a sample that is really a fact about how the sample was chosen. It is not a small correction in astronomy, and it is not confined to astronomy.',
    },

    // -----------------------------------------------------------------------
    // 27-28: the open challenge, and the argument
    // -----------------------------------------------------------------------
    {
      sid: 'find-a-counterexample',
      type: 'measure',
      title: 'Break a rule',
      body: `Two statements that sound reasonable and are both false:
             \n\n<strong>&ldquo;Red stars are small.&rdquo;</strong>
             \n\n<strong>&ldquo;Hotter stars are more luminous.&rdquo;</strong>
             \n\nPick either one and break it with the lab. Any of the eight
             models at any age is fair, and so is the free cursor — though if
             you use the free cursor, remember what it does and does not
             establish: it shows a temperature and a luminosity <em>could</em>
             go together, not that any particular star does.
             \n\nRecord the two stars you used, and save the comparison to your
             notebook as evidence.`,
      fields: [
        { id: 'aT', label: 'Star A temperature', unit: 'K' },
        { id: 'aL', label: 'Star A luminosity', unit: 'L☉' },
        { id: 'bT', label: 'Star B temperature', unit: 'K' },
        { id: 'bL', label: 'Star B luminosity', unit: 'L☉' },
      ],
      validate: v => {
        const all = [v.aT, v.aL, v.bT, v.bL];
        if (all.some(x => !Number.isFinite(x) || x <= 0)) {
          return {
            level: 'warn',
            message:
              'Four numbers: a temperature and a luminosity for each star.',
          };
        }
        const rOf = (L, T) => Math.sqrt(L) / (T / 5772) ** 2;
        const hotter = v.aT > v.bT ? 'a' : 'b';
        const hotL = hotter === 'a' ? v.aL : v.bL;
        const coolL = hotter === 'a' ? v.bL : v.aL;
        const coolR = hotter === 'a' ? rOf(v.bL, v.bT) : rOf(v.aL, v.aT);
        if (hotL < coolL) {
          return {
            level: 'ok',
            message:
              'That breaks the second one: the hotter of your two stars is the fainter. Anything hot and small does it — a white dwarf against almost anything.',
          };
        }
        if (coolR > 10) {
          return {
            level: 'ok',
            message:
              'That breaks the first one: your cooler star works out at more than ten solar radii, so it is red and large. A giant or a supergiant does it.',
          };
        }
        return {
          level: 'warn',
          message:
            'Those two are consistent with both statements — the hotter one is also the brighter, and the cooler one is small. Try an end-of-track star: the far right of the age slider on the 1 M☉ track, or the 20 M☉ track.',
        };
      },
      tool: lab({
        mode: 'model',
        pace: 'phase',
        paceControl: true,
        regions: true,
        guides: true,
        capture: true,
      }),
      tip: 'Both statements are true of main-sequence stars, which is why they sound right. Neither is true of stars in general, and roughly one star in a thousand near the Sun is a counterexample to the second.',
    },
    {
      sid: 'the-argument',
      type: 'question',
      title: 'Back to the three stars',
      kind: 'short',
      body: `In step 1 you were shown three stars with their numbers switched
             off and asked what the picture could tell you. Your answer is
             saved; it has not been overwritten by anything since.
             \n\nThe three were a 0.2 solar-mass main-sequence star, a 5 solar-mass
             main-sequence star, and a red giant that began with one solar
             mass. The giant was the largest of them, at a fifth of the middle
             star&rsquo;s mass and a twelfth of its luminosity.
             \n\nWrite the explanation you would now give.`,
      prompt:
        'Explain how mass, temperature, radius, luminosity and lifetime are related — and where those relationships stop holding. Refer to at least two of your own measurements, and say whether your step 1 answer still stands.',
      rubric:
        'This is the summative question and should be marked on the connections rather than on coverage. Look for: temperature and luminosity together fix the radius, and the student can use that in either direction; along the main sequence mass largely fixes the other three, steeply, so that a hundredfold in mass is millions-fold in light; that steepness is why the heaviest stars live the shortest lives, fuel over burn rate; and every one of those statements is about the main sequence, with the giant and the white dwarf as the counterexamples the student measured. A strong answer says what a position on the diagram does NOT fix - a mass, an age - and cites the 426-fold radius difference between two stars of the same colour, or the white dwarf at 48,000 K putting out 1.6 solar luminosities. Credit an answer that revises the step 1 prediction and credit one that defends it, provided the defence engages with the measurements. Do NOT require the population material here; it is the subject of its own question at step 26.',
      tool: stage({
        pace: 'phase',
        pins: [
          { track: 'm020' },
          { track: 'm500' },
          { track: 'm100', ageYr: 1.129e10 },
        ],
        capture: true,
      }),
      tip: 'Your notebook has the measurements in it, with the model each one came from. Open it in another tab if you want to quote a number exactly.',
    },
  ],
};

export default A_UNIVERSE_OF_STARS;
