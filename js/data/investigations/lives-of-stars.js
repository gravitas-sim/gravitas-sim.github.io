// =============================================================================
// Lives of stars: from clouds to cosmic remnants
// -----------------------------------------------------------------------------
// Thirty-four steps on the evolutionary playback (js/stellarEvolutionWidgets.js)
// and the eight bundled MIST tracks behind it. A companion to "A Universe of
// Stars", which teaches the diagram this lesson moves across; steps 1 to 7
// recap enough of it that this one stands alone.
//
// The H-R diagram is the spine
// -----------------------------------------------------------------------------
// Every change in how a star looks is tied to where it is on the diagram, with
// three exceptions that are named as exceptions each time they appear: the
// collapsing cloud, which has no photosphere and so no position; an explosion,
// whose brightness is a transient and not a photospheric luminosity; and a
// black hole, which has no temperature to plot at all. Those three are the
// only things in this lesson that happen off the diagram, and each one says so.
//
// What the lesson refuses to do
// -----------------------------------------------------------------------------
// Send every star down the same road. The 0.2 solar-mass model is not given
// the Sun's future; the 20 solar-mass model is not given a confident remnant,
// because the sources do not give it one; and the 40 solar-mass model is not
// given a bright supernova to justify its black hole. Step 31 is about that
// last point and step 23 about the first.
//
// It also refuses to make anything depend on waiting. Every phase is reachable
// with one button, the age is a slider and a number, and no step asks a
// student to watch an animation run to completion.
// =============================================================================

/** A quiet backdrop. Nothing in this lesson is measured off the sandbox. */
const LIFECYCLE_SANDBOX = {
  scenario: 'Stellar Graveyard',
  seed: 'lives-of-stars',
  camera: { zoom: 1.1, pan: { x: 0, y: 0 } },
  paused: true,
};

/** The evolutionary playback, parked where a step wants it. */
const evol = (extra = {}) => ({ id: 'stellar-evolution', ...extra });

/** The lab's diagram, for the recap and the classification steps. */
const lab = (extra = {}) => ({ id: 'stellar-lab', ...extra });

/** The comparison stage. */
const stage = (extra = {}) => ({ id: 'stellar-compare', ...extra });

const LIVES_OF_STARS = {
  id: 'lives-of-stars',
  thumbnail: 'images/scenarios/stellar-graveyard.webp',
  title: 'Lives of Stars',
  subtitle: 'From clouds to cosmic remnants, along eight published tracks',
  duration: '80-100 min',
  level: 'Introductory astronomy',
  tags: ['stars', 'stellar-evolution'],
  lock: { placement: true, inspector: false, areaSweep: false },
  summary:
    'A star is not a thing so much as a process that takes a while. Over thirty-four steps you follow three of them from a contracting cloud to what they leave behind — a solar-mass star to a white dwarf, a ten solar-mass star to a neutron star, and a forty solar-mass star to a black hole — reading every stage off the same diagram and the same published tracks. You will also meet the star that does none of this: a red dwarf that will still be burning hydrogen when the Universe is a hundred times its present age.',
  objectives: [
    'Follow one star across the H-R diagram from before it forms to after it stops',
    'Say what powers a star at each stage, and what it means when a stage ends',
    'Explain why leaving the main sequence means core hydrogen, not all hydrogen',
    'Compare how long phases really last against how long an animation gives them',
    'Explain why the heaviest stars end differently from the Sun, and why not all of them end the same way as each other',
    'Say why a black hole has no place on this diagram',
    'Name a limitation of the models the whole lesson is built on',
  ],
  steps: [
    // -----------------------------------------------------------------------
    // 1-6: before there is a star
    // -----------------------------------------------------------------------
    {
      sid: 'three-futures',
      type: 'predict',
      title: 'Three stars, three futures',
      body: `On the stage: a red dwarf of a fifth of a solar mass, a star like
             the Sun, and a star of twenty solar masses. All three are on their
             main sequences now, fusing hydrogen in their cores.
             \n\nAll three will stop. Commit to what you think happens, and to
             which one gets there first. You are not expected to get this
             right; step 34 asks you to look at your answer again.`,
      prompt: 'Which of these three changes fastest, and how does it end?',
      options: [
        'The red dwarf, because small things burn out quickly. It fades away.',
        'The Sun, because it is in the middle. It explodes.',
        'The 20 M☉ star, because it is losing energy fastest of the three. Its core collapses.',
        'They all take roughly the same time. Stars are stars.',
      ],
      answer: 2,
      because:
        'The heaviest one, by an enormous margin: its main sequence lasts 8.7 million years against the Sun&rsquo;s 9.9 billion and the red dwarf&rsquo;s 1.1 trillion. "Losing energy fastest" is the right reason - it is a hundred thousand times more luminous than the Sun, and light is fuel leaving. The answers about the other two are the two commonest wrong pictures and both get corrected later: the red dwarf does not burn out quickly, it barely changes at all, and the Sun does not explode.',
      setup: LIFECYCLE_SANDBOX,
      tool: stage({
        pace: 'phase',
        pins: [{ track: 'm020' }, { track: 'm100' }, { track: 'm2000' }],
        hide: ['order'],
      }),
      tip: 'If you have done "A Universe of Stars" — the companion lesson, which teaches the diagram this one moves across — the stage will be familiar. If not, the next six steps recap everything from it that this lesson needs.',
    },
    {
      sid: 'the-cloud',
      type: 'explore',
      title: 'Before the star',
      body: `Every star here begins in the same place: a cloud of gas, cold and
             thin and much larger than anything it will become.
             \n\nWhat makes it collapse is its own gravity. Nothing pushes it
             together; every part of it pulls on every other part, and once
             a region is dense enough that its own gravity beats the pressure
             holding it up, it falls inwards and keeps falling.
             \n\nThe panel is showing that as an illustration, and the readout
             is refusing to put numbers on it. Read why.`,
      checklist: [
        'Look at the "the star now" panel: a cloud contracting towards a brightening centre',
        'Read the caption underneath it',
        'Read the two rows in the list: "Stage" and "Why there are no numbers"',
        'Notice that the diagram on the left is empty — nothing is plotted yet',
        'Press "Next phase" once, and watch a point appear on the diagram',
        'Press "Previous phase" to come back to the cloud',
      ],
      tool: evol({ track: 'm100', at: 0.02, autoplay: false, capture: false }),
      tip: 'The diagram is empty on purpose. A cloud has no photosphere, so it has no surface temperature and no luminosity, and putting it somewhere on these axes would be inventing both.',
    },
    {
      sid: 'predict-protostar-power',
      type: 'predict',
      title: 'What is it running on?',
      body: `Press <strong>Next phase</strong> to reach the first point the
             model actually describes: a pre-main-sequence star. It has a
             surface now, so it has a place on the diagram.
             \n\nIt is also very luminous — the model&rsquo;s first sample
             puts it at fifty-six times the Sun&rsquo;s output, from a surface
             at 4,100 K and a radius fifteen times the Sun&rsquo;s. But it is
             not yet doing what the Sun does.
             \n\nBefore you look at the readout, commit.`,
      prompt: 'A pre-main-sequence star shines because…',
      options: [
        'it has started fusing hydrogen in its core, just more slowly',
        'it is still contracting, and releasing gravitational energy as it shrinks',
        'it is reflecting light from the cloud around it',
        'it is hot left over from the Big Bang',
      ],
      answer: 1,
      because:
        'It is falling in on itself, and something falling releases energy. Half of the gravitational energy released by a contracting gas cloud heats it and the other half is radiated away, and that radiated half is what you are seeing. No sustained hydrogen fusion is happening yet. This matters for a reason beyond bookkeeping: a star that shines is not necessarily a star that is fusing, and fusion starting is not the same event as arriving on the main sequence.',
      tool: evol({
        track: 'm100',
        phase: 'pre-main-sequence',
        autoplay: false,
      }),
      tip: 'The readout&rsquo;s "About this phase" row has the full version, including what deuterium does before hydrogen gets going.',
    },
    {
      sid: 'contraction-luminosity',
      type: 'measure',
      title: 'Shrinking, and shining while it does',
      body: `Move the playhead across the pre-main-sequence stage and watch the
             radius. Use the age slider or the arrow keys — nothing here needs
             you to wait for an animation.
             \n\nRecord the radius near the start of the stage and near its
             end, and the age at each.`,
      fields: [
        { id: 'rEarly', label: 'Radius early on', unit: 'R☉' },
        { id: 'rLate', label: 'Radius near the end', unit: 'R☉' },
        { id: 'ageLate', label: 'Age at the later reading', unit: 'Myr' },
      ],
      validate: v => {
        if (![v.rEarly, v.rLate, v.ageLate].every(x => Number.isFinite(x))) {
          return { level: 'warn', message: 'Three numbers, from the readout.' };
        }
        if (v.rLate >= v.rEarly) {
          return {
            level: 'error',
            message:
              'It should be getting smaller, not larger. Check which reading you took first — the earlier age goes in the first box.',
          };
        }
        return {
          level: 'ok',
          message:
            'Contracting the whole time, and shining the whole time. It is not yet on the main sequence: the readout will not call it that until hydrogen fusion in the core is steady enough to hold the star up on its own.',
        };
      },
      tool: evol({ track: 'm100', phase: 'pre-main-sequence', capture: true }),
      tip: 'This stage lasts about 42 million years for a solar-mass star — a fraction of a per cent of its life, and the readout says so on the "This phase" row.',
    },
    {
      sid: 'the-pms-track',
      type: 'question',
      title: 'Which way across the diagram?',
      kind: 'choice',
      body: `Follow the marker along the pre-main-sequence stage and watch
             where it goes on the diagram. The faint grey line is the whole
             track; the bright line is where the star has been so far.
             \n\nRemember the axes: hotter to the left, more luminous upwards.`,
      prompt: 'Across the pre-main-sequence stage, a solar-mass model moves…',
      options: [
        'up and to the right, getting brighter and cooler',
        'down and then left: fainter as it shrinks, then hotter as the core heats',
        'straight down the diagram at constant temperature',
        'nowhere — it sits at one point until fusion starts',
      ],
      answer: 1,
      because:
        'Down first, then left. Shrinking at roughly constant surface temperature makes it fainter, because there is less surface; then as the interior heats up the surface temperature climbs and it moves left. The shape of that path is a real result of the model and not a decoration, and it is one of the places where the diagram is doing work: two quantities you can measure from far away are tracing out what is happening inside something you cannot see.',
      tool: evol({ track: 'm100', phase: 'pre-main-sequence' }),
      tip: 'A common confusion worth settling now: this diagram is not a map of where stars are in space. It is a graph of two properties. Two stars next to each other on it may be nowhere near each other.',
    },
    {
      sid: 'arriving',
      type: 'measure',
      title: 'Arriving',
      body: `Press <strong>Next phase</strong>. The readout&rsquo;s phase
             changes to <em>main sequence</em>: hydrogen fusion in the core is
             now steady, and it is what holds the star up.
             \n\nThis is the zero-age main sequence — the beginning of the long
             part. Record where the star is.`,
      fields: [
        { id: 'teff', label: 'Surface temperature', unit: 'K' },
        { id: 'lum', label: 'Luminosity', unit: 'L☉' },
        { id: 'age', label: 'Age', unit: 'Myr' },
      ],
      validate: v => {
        if (![v.teff, v.lum, v.age].every(x => Number.isFinite(x))) {
          return { level: 'warn', message: 'All three, from the readout.' };
        }
        if (v.teff < 5200 || v.teff > 6300) {
          return {
            level: 'warn',
            message:
              'That is not the arrival point. Press "Next phase" until the readout says Main sequence, and read the first values it shows.',
          };
        }
        return {
          level: 'ok',
          message:
            'About 5,740 K and 0.80 solar luminosities, at 457 million years old. The Sun today is 4.6 billion years old and puts out 1.0 — so it has already brightened by nearly forty per cent since it arrived here. The next step measures that.',
        };
      },
      tool: evol({ track: 'm100', phase: 'main-sequence', capture: true }),
      tip: 'Fusion did not start at this instant — it started earlier and built up. What happens here is that it becomes the thing supporting the star, which is what the main sequence means.',
    },

    // -----------------------------------------------------------------------
    // 7-12: the long part, and its end
    // -----------------------------------------------------------------------
    {
      sid: 'the-sun-today',
      type: 'measure',
      title: 'The Sun, today',
      body: `Set the age to 4.6 billion years — where the Sun is now. You can
             type into the age slider or step it with the arrow keys.
             \n\nRecord the three properties. These are the model&rsquo;s
             values for a solar-mass star of that age, and they are close to
             the measured Sun without having been fitted to it.`,
      fields: [
        { id: 'teff', label: 'Surface temperature', unit: 'K' },
        { id: 'lum', label: 'Luminosity', unit: 'L☉' },
        { id: 'radius', label: 'Radius', unit: 'R☉' },
      ],
      validate: v => {
        if (![v.teff, v.lum, v.radius].every(x => Number.isFinite(x))) {
          return { level: 'warn', message: 'All three, from the readout.' };
        }
        if (v.teff < 5500 || v.teff > 6200 || v.lum < 0.7 || v.lum > 1.8) {
          return {
            level: 'warn',
            message:
              'Not at 4.6 Gyr yet. The readout&rsquo;s Age row is what to steer by.',
          };
        }
        return {
          level: 'ok',
          message:
            'About 5,850 K, 1.11 solar luminosities and 1.03 solar radii. The real Sun is 5,772 K and 1.00 by definition, so the model is within a couple of per cent — which is a check on it, not an input to it.',
        };
      },
      tool: evol({ track: 'm100', phase: 'main-sequence', capture: true }),
      tip: 'Surface temperature, not core temperature. The Sun&rsquo;s core is about 15 million K; its surface is 5,772. Nothing in this lesson ever plots a core temperature.',
    },
    {
      sid: 'across-the-main-sequence',
      type: 'measure',
      title: 'Ten billion years, measured',
      body: `Now run to the end of the main sequence — press
             <strong>Next phase</strong>, or drag the playhead to just before
             the phase changes.
             \n\nRecord where it ends up, and work out how much it brightened
             across its main-sequence life. You measured the arrival point two
             steps ago.`,
      fields: [
        { id: 'lumStart', label: 'Luminosity on arrival', unit: 'L☉' },
        { id: 'lumEnd', label: 'Luminosity at the end', unit: 'L☉' },
        {
          id: 'ratio',
          label: 'How many times brighter',
          unit: '×',
          compute: v => v.lumEnd / v.lumStart,
          decimals: 2,
        },
        { id: 'age', label: 'Age at the end', unit: 'Gyr' },
      ],
      validate: v => {
        if (![v.lumStart, v.lumEnd, v.age].every(x => Number.isFinite(x))) {
          return { level: 'warn', message: 'Three numbers, from the readout.' };
        }
        if (v.lumEnd <= v.lumStart) {
          return {
            level: 'error',
            message: 'It brightens. Check which reading went in which box.',
          };
        }
        if (v.age < 8 || v.age > 12) {
          return {
            level: 'warn',
            message:
              'The end of the main sequence is at about 9.9 billion years for this star. The readout gives the age in Gyr.',
          };
        }
        return {
          level: 'ok',
          message:
            'From 0.80 to 2.28 solar luminosities — nearly three times brighter — over 9.9 billion years, while the surface temperature barely moved. A star does not sit at one point on the diagram for its whole main-sequence life, and it does not slide down the main sequence either: it drifts slowly up and very slightly right.',
        };
      },
      tool: evol({ track: 'm100', phase: 'main-sequence', capture: true }),
      tip: 'The "Moved so far" row in the readout tracks this for you as you go.',
    },
    {
      sid: 'compare-young-and-old',
      type: 'measure',
      title: 'Then and now, side by side',
      body: `Two versions of the same star are on the comparison stage: the
             solar-mass model on arrival, and the same model at the end of its
             main sequence.
             \n\nRead both radii and save the comparison to your notebook. This
             is the smallest change in this whole lesson and it still amounts
             to a star nearly three quarters as big again.`,
      fields: [
        { id: 'rStart', label: 'Radius on arrival', unit: 'R☉' },
        { id: 'rEnd', label: 'Radius at the end', unit: 'R☉' },
      ],
      validate: v => {
        if (![v.rStart, v.rEnd].every(x => Number.isFinite(x))) {
          return { level: 'warn', message: 'Both radii, from the list.' };
        }
        if (v.rEnd <= v.rStart) {
          return {
            level: 'error',
            message: 'The later one is larger. Check the order.',
          };
        }
        return {
          level: 'ok',
          message:
            'About 0.90 to 1.56 solar radii. Hold on to that number: three steps from now the same star is a hundred and seventy times the size of the Sun, and the contrast between those two changes is the point of this part of the lesson.',
        };
      },
      tool: stage({
        pace: 'phase',
        pins: [
          { track: 'm100', ageYr: 4.6e8 },
          { track: 'm100', ageYr: 9.9e9 },
        ],
        hide: ['order'],
        capture: true,
      }),
      tip: 'Both are the same star. Nothing else in this lesson pins one model at two ages, and it is worth noticing that the comparison stage does not mind.',
    },
    {
      sid: 'predict-what-runs-out',
      type: 'predict',
      title: 'What exactly runs out?',
      body: `The main sequence ends. Something has been used up.
             \n\nThink about where fusion is happening before you answer. The
             Sun is 71 per cent hydrogen by mass, and fusion happens only where
             it is hot enough and dense enough.`,
      prompt: 'When a star leaves the main sequence, what has run out?',
      options: [
        'All the hydrogen in the star',
        'The hydrogen in the core, where it was hot enough to fuse',
        'The star&rsquo;s gravity',
        'Its helium, which it had been fusing all along',
      ],
      answer: 1,
      because:
        'Only the core&rsquo;s hydrogen - a few per cent of the star&rsquo;s mass. Most of the hydrogen is still there, sitting in the envelope where it has never been hot enough to fuse and where it is not mixed down into the core. That is why what happens next happens: a shell of that hydrogen, just outside the spent core, is now hot enough to burn, and the star does not go out. It gets very much brighter. This is the single most common misunderstanding about stellar evolution and the next four steps are about it.',
      tool: evol({ track: 'm100', phase: 'main-sequence' }),
      tip: 'A star has no way to stir fresh hydrogen down into its core - not one like the Sun, anyway. The 0.2 solar-mass star in step 22 does, and that is why its life is so different.',
    },
    {
      sid: 'the-interior',
      type: 'explore',
      title: 'What is burning now',
      body: `Turn on the <strong>interior schematic</strong> and step forward
             from the end of the main sequence.
             \n\nBe careful about what this picture is. The bundled tracks are
             surface quantities: a temperature, a luminosity, a mass. They
             contain no radial structure at all, so the sizes of the shells you
             see are chosen to be legible and mean nothing. What the picture
             does carry is which process is releasing the energy, which the
             track&rsquo;s phase does determine.`,
      checklist: [
        'Press "Interior schematic" to turn it on',
        'On the main sequence: a filled core, burning hydrogen',
        'Press "Next phase" to reach the red-giant branch',
        'Now: a ring outside the core, and a core that is no longer the energy source',
        'Read the "The interior" row in the list, which says what the picture is not',
        'Turn the schematic off again and notice nothing else changes',
      ],
      tool: evol({
        track: 'm100',
        phase: 'main-sequence',
        interior: true,
      }),
      tip: 'The core has not stopped mattering — it is contracting and heating, and that is what makes the shell around it hot enough to burn. It has just stopped being where the energy comes from.',
    },
    {
      sid: 'core-in-envelope-out',
      type: 'measure',
      title: 'The core shrinks, the star swells',
      body: `The two things happening at once are the hardest part of this
             story to hold in your head, and they are opposite: the core
             contracts, and the envelope expands enormously.
             \n\nFollow the red-giant branch from its start to its tip, and
             record the star at both ends. Use <strong>Next phase</strong> to
             find the boundaries.`,
      fields: [
        {
          id: 'rStart',
          label: 'Radius at the start of the branch',
          unit: 'R☉',
        },
        { id: 'rTip', label: 'Radius at the tip', unit: 'R☉' },
        { id: 'tTip', label: 'Surface temperature at the tip', unit: 'K' },
      ],
      validate: v => {
        if (![v.rStart, v.rTip, v.tTip].every(x => Number.isFinite(x))) {
          return { level: 'warn', message: 'Three numbers, from the readout.' };
        }
        if (v.rTip < v.rStart * 5) {
          return {
            level: 'warn',
            message:
              'The tip is much larger than that. Drag the playhead to the end of the red-giant branch — the readout&rsquo;s Radius row climbs into the hundreds.',
          };
        }
        if (v.tTip > 4200) {
          return {
            level: 'warn',
            message:
              'The tip is cooler than that. Keep going along the branch: the surface temperature falls as the star swells.',
          };
        }
        return {
          level: 'ok',
          message:
            'From about 1.6 to about 173 solar radii, and the surface cools from 5,700 K to about 3,100 K on the way. A hundredfold in radius, and it got cooler — which is exactly how something can be far more luminous and far redder at the same time.',
        };
      },
      tool: evol({
        track: 'm100',
        phase: 'red-giant-branch',
        interior: true,
        capture: true,
      }),
      tip: 'Its surface is cooler because it is spread over a hundred times the radius — ten thousand times the area. Each square metre is radiating less, and there are so many more of them that the total goes up by a factor of a thousand.',
    },

    // -----------------------------------------------------------------------
    // 13-21: giant, ejection, and the cinder
    // -----------------------------------------------------------------------
    {
      sid: 'predict-direction',
      type: 'predict',
      title: 'Which way does it go?',
      body: `You have the numbers: cooler at the surface, far more luminous
             overall. Before looking at the trace, work out what that means for
             the diagram.
             \n\nHotter is to the left. More luminous is up.`,
      prompt: 'Leaving the main sequence, the star moves…',
      options: [
        'up and to the left — brighter and hotter',
        'up and to the right — brighter and cooler',
        'down and to the right — fainter and cooler',
        'along the main sequence to a lower position',
      ],
      answer: 1,
      because:
        'Up and to the right, and the bright line on the diagram shows it doing exactly that. "Up and right" is a combination the main sequence never contains, which is why the giant region is somewhere else on the diagram rather than an extension of the band. And note what it is not doing: it is not sliding down the main sequence. Nothing does that.',
      tool: evol({ track: 'm100', phase: 'red-giant-branch' }),
      tip: 'You are watching the diagram earn its keep. Two measurable numbers, and the path they trace tells you the star has stopped burning hydrogen in its core.',
    },
    {
      sid: 'measure-the-giant',
      type: 'measure',
      title: 'The giant, measured',
      body: `Park at the tip of the red-giant branch — the largest and coolest
             this star gets on this branch — and record all three properties
             together, plus its mass.
             \n\nSave it to the notebook: step 15 compares it with what you
             measured at step 9.`,
      fields: [
        { id: 'teff', label: 'Surface temperature', unit: 'K' },
        { id: 'lum', label: 'Luminosity', unit: 'L☉' },
        { id: 'radius', label: 'Radius', unit: 'R☉' },
        { id: 'mass', label: 'Mass now', unit: 'M☉' },
      ],
      validate: v => {
        if (![v.teff, v.lum, v.radius, v.mass].every(x => Number.isFinite(x))) {
          return { level: 'warn', message: 'All four, from the readout.' };
        }
        if (v.mass > 1.05 || v.mass < 0.85) {
          return {
            level: 'warn',
            message:
              'The mass should still be close to one solar mass. Almost nothing has been lost yet — that comes later.',
          };
        }
        if (v.radius < 100) {
          return {
            level: 'warn',
            message:
              'Not at the tip yet. Keep going along the branch until the radius stops climbing.',
          };
        }
        return {
          level: 'ok',
          message:
            'About 3,100 K, 2,400 solar luminosities, 173 solar radii — and still 0.95 solar masses. It is enormous and it is very nearly as heavy as it always was. A giant is a stage, not a heavyweight.',
        };
      },
      tool: evol({ track: 'm100', phase: 'red-giant-branch', capture: true }),
      tip: 'Two thousand four hundred times the Sun&rsquo;s output from a surface at half the Sun&rsquo;s temperature. Only the area can do that.',
    },
    {
      sid: 'true-size-then-and-now',
      type: 'explore',
      title: 'To scale',
      body: `Switch the star panel between <strong>true size</strong> and
             <strong>fit the box</strong> and move the playhead back and forth
             across the main sequence and the giant branch.
             \n\nIn true-size mode the whole life is drawn on one scale, set by
             the largest this star ever gets. That is why it is a speck for
             most of its life: it is a speck compared with what it becomes.`,
      checklist: [
        'Set the star panel to true size',
        'Park on the main sequence and note that the star is barely a mark',
        'Read the caption: it gives the fraction of the star&rsquo;s own peak radius',
        'Move to the tip of the red-giant branch and watch the disc fill the panel',
        'Switch to "fit the box" and move back to the main sequence',
        'Read the caption again — it now says the size means nothing',
      ],
      tool: evol({ track: 'm100', phase: 'red-giant-branch' }),
      tip: 'Both pictures are honest and they answer different questions. The one that lies is a picture that changes scale without saying so.',
    },
    {
      sid: 'helium-and-the-loop',
      type: 'question',
      title: 'It does not simply keep swelling',
      kind: 'choice',
      body: `Press <strong>Next phase</strong> past the tip. Helium ignites in
             the core, and then the star burns it for a while.
             \n\nWatch what the marker does. It does not carry on up and to the
             right.`,
      prompt: 'After helium ignites, the model star…',
      options: [
        'continues smoothly to larger and cooler values',
        'drops sharply in luminosity and moves back towards hotter values, then works its way out again',
        'returns to exactly where it was on the main sequence',
        'stops changing until it dies',
      ],
      answer: 1,
      because:
        'It falls and moves left, and then climbs again on the asymptotic giant branch. The core is now supported by burning helium rather than by contracting, and a star supported differently sits somewhere different. The reason this step exists is that "and then it just keeps getting bigger and redder until it dies" is a tidier story than the truth, and this lesson follows each track&rsquo;s actual sequence rather than straightening it. Different masses do different things here; the 5 solar-mass model loops further left than this one does.',
      tool: evol({ track: 'm100', phase: 'core-helium-burning' }),
      tip: 'The helium-ignition stage itself lasts under two million years — the readout&rsquo;s "This phase" row puts it at about 0.02 per cent of the star&rsquo;s life.',
    },
    {
      sid: 'the-agb-and-the-wind',
      type: 'measure',
      title: 'Losing itself',
      body: `Step forward through the asymptotic giant branch. The star swells
             again, and this time something else is happening: it is blowing
             its outer layers away.
             \n\nWatch the <strong>Mass</strong> row. Record what it has left
             at the end of the thermally-pulsing stage, and what it started
             with.`,
      fields: [
        { id: 'born', label: 'Mass at birth', unit: 'M☉' },
        { id: 'now', label: 'Mass at the end of the AGB', unit: 'M☉' },
        {
          id: 'lost',
          label: 'Lost',
          unit: 'M☉',
          compute: v => v.born - v.now,
          decimals: 2,
        },
      ],
      validate: v => {
        if (![v.born, v.now].every(x => Number.isFinite(x))) {
          return { level: 'warn', message: 'Both masses, from the readout.' };
        }
        if (v.now >= v.born) {
          return {
            level: 'error',
            message: 'It is losing mass, not gaining it. Check the order.',
          };
        }
        if (v.now > 0.75) {
          return {
            level: 'warn',
            message:
              'Keep going: most of the loss happens near the end of the asymptotic giant branch. Press "Next phase" until the phase changes to the exposed core.',
          };
        }
        return {
          level: 'ok',
          message:
            'It ends with about 0.54 solar masses of the 1.00 it was born with. Nearly half of the star is now expanding away from it as gas — and that gas is the next step.',
        };
      },
      tool: evol({
        track: 'm100',
        phase: 'thermally-pulsing-agb',
        capture: true,
      }),
      tip: 'The shells drawn around the star in the panel are that lost material, seeded so they are in the same place every run. They are an illustration of an amount the model does record, not a simulation of a wind.',
    },
    {
      sid: 'not-a-supernova',
      type: 'predict',
      title: 'Is that an explosion?',
      body: `Half a star has just come off. That sounds violent.
             \n\nIt is not. Commit before reading on.`,
      prompt:
        'A solar-mass star shedding half its mass at the end of its life is…',
      options: [
        'a supernova — this is how stars like the Sun explode',
        'a slow wind over hundreds of thousands of years, with no explosion at all',
        'a collision with another star',
        'the star collapsing inward, not outward',
      ],
      answer: 1,
      because:
        'A wind. Strong for a star, glacial for an explosion: the material leaves over hundreds of thousands of years at speeds of tens of kilometres per second, not the tens of thousands a supernova reaches. Nothing detonates and nothing collapses. The readout for this track says so where it names the endpoint: "A visible supernova? No. Nothing here explodes." The Sun will not explode, and the step where something does is nineteen steps away.',
      tool: evol({ track: 'm100', phase: 'post-agb-and-cooling' }),
      tip: 'A supernova needs a core massive enough to collapse. The Sun&rsquo;s will end up at about 0.54 solar masses, and electron degeneracy holds that up indefinitely.',
    },
    {
      sid: 'planetary-nebula',
      type: 'read',
      title: 'A planetary nebula, which is not made of planets',
      body: `The envelope has gone. What is left in the middle is the exposed
             core — very hot, because it was the inside of a star — and the gas
             around it glows because that core is lighting it up.
             \n\nThe name is a historical accident. Eighteenth-century
             observers saw small round greenish discs in their telescopes,
             thought they looked like planets, and the name stuck. There are no
             planets involved and never were.
             \n\nTwo things this model does not tell you. When the nebula
             becomes visible is not the instant the envelope left: the gas has
             to be ionised by the central star, which happens as that star
             heats up over thousands of years. And how long it lasts — a few
             tens of thousands of years before it disperses — is not in these
             tracks either. The star is followed; the gas is not.`,
      tool: evol({ track: 'm100', phase: 'post-agb-and-cooling' }),
      tip: 'The exposed core crosses the diagram almost horizontally at this stage: its luminosity barely changes while its surface temperature climbs from about 5,000 K to nearly 100,000 K.',
    },
    {
      sid: 'white-dwarf-cooling',
      type: 'measure',
      title: 'The cinder',
      body: `Run to the end of the track. What is left is a white dwarf: the
             exposed core, no longer fusing anything, cooling.
             \n\nRecord it. Then think about the last row you are about to
             read: it is still putting out more light than the Sun, and there
             is no fusion anywhere in it.`,
      fields: [
        { id: 'teff', label: 'Surface temperature', unit: 'K' },
        { id: 'lum', label: 'Luminosity', unit: 'L☉' },
        { id: 'radius', label: 'Radius', unit: 'R☉' },
      ],
      validate: v => {
        if (![v.teff, v.lum, v.radius].every(x => Number.isFinite(x))) {
          return { level: 'warn', message: 'All three, from the readout.' };
        }
        if (v.radius > 0.1) {
          return {
            level: 'warn',
            message:
              'Not at the end of the track yet. Drag the playhead all the way to the right.',
          };
        }
        return {
          level: 'ok',
          message:
            'About 48,000 K, 1.6 solar luminosities, 0.018 solar radii — roughly twice the size of the Earth, holding 0.54 solar masses. It shines because it is hot, and it is hot because it used to be the inside of a star. Nothing is being burnt. It will cool for longer than the Universe has existed.',
        };
      },
      tool: evol({ track: 'm100', phase: 'end', capture: true }),
      tip: 'A white dwarf is not a small ordinary star. Nothing holds it up against gravity except the resistance of its own electrons to being packed closer, and that does not run out.',
    },
    {
      sid: 'how-long-was-each-part',
      type: 'measure',
      title: 'How long each part really took',
      body: `The playhead has spent about the same amount of screen time on
             each stage. The star did not.
             \n\nThe readout&rsquo;s <strong>This phase</strong> row gives the
             real duration of whichever stage you are parked in, and the share
             of the playback it is getting. Visit two stages and compare.`,
      fields: [
        { id: 'ms', label: 'Main sequence lasts', unit: 'Gyr' },
        { id: 'rgb', label: 'Red-giant branch lasts', unit: 'Gyr' },
        { id: 'agb', label: 'Thermally-pulsing AGB lasts', unit: 'Myr' },
      ],
      validate: v => {
        if (![v.ms, v.rgb, v.agb].every(x => Number.isFinite(x))) {
          return {
            level: 'warn',
            message: 'Three durations, from the readout.',
          };
        }
        if (v.ms < 5 || v.ms > 15) {
          return {
            level: 'warn',
            message:
              'The main sequence is about 9.9 billion years — 9.88 Gyr on the readout.',
          };
        }
        if (v.agb > 100) {
          return {
            level: 'warn',
            message:
              'The thermally-pulsing stage is measured in millions, not billions. The readout gives it in Myr.',
          };
        }
        return {
          level: 'ok',
          message:
            'Roughly 9.9 billion, 1.4 billion, and 1.4 million years. The last of those is a ten-thousandth of the first, and the playback gives it a third of the playhead. Nothing about how long a stage takes on screen means anything, and the readout says so on every stage.',
        };
      },
      tool: evol({ track: 'm100', phase: 'main-sequence', capture: true }),
      tip: 'Press "Change what the playhead paces" to switch to time pacing and watch everything after the main sequence collapse into the last sliver. Both clocks are honest about different things.',
    },

    // -----------------------------------------------------------------------
    // 22-31: the two ends of the mass range
    // -----------------------------------------------------------------------
    {
      sid: 'predict-the-red-dwarf',
      type: 'predict',
      title: 'The star that does none of this',
      body: `Switch to the 0.2 solar-mass model. It is on its main sequence,
             like the Sun.
             \n\nIt is also 13.8 billion years since the Universe began.
             Predict what this star looks like at the Sun&rsquo;s present age,
             and then at the age of the Universe.`,
      prompt: 'A 0.2 M☉ star, between 4.6 and 13.8 billion years old…',
      options: [
        'becomes a red giant, like the Sun will, only sooner',
        'has barely changed at all — a few per cent in luminosity',
        'has already died and left a white dwarf',
        'has burnt out and gone dark',
      ],
      answer: 1,
      because:
        'Almost nothing happens. Between 4.6 and 13.8 billion years its luminosity goes from 0.00478 to 0.00496 solar - under four per cent - and its radius from 0.221 to 0.224 solar radii. It is fully convective, so it can stir fresh hydrogen down into its core rather than being stuck with what is already there, and it burns what it has extraordinarily slowly. Its main sequence lasts 1.1 trillion years. The two wrong answers here are the two ways students are usually taught to think about small stars, and both give them the Sun&rsquo;s future.',
      setup: LIFECYCLE_SANDBOX,
      tool: evol({ track: 'm020', phase: 'main-sequence' }),
      tip: 'Press "Next phase" and notice there is nowhere to go: this track has a pre-main sequence and a main sequence and then it stops.',
    },
    {
      sid: 'the-same-age',
      type: 'measure',
      title: 'The same age, two stars',
      body: `A controlled comparison, and it is worth being clear which kind:
             this is <em>the same age</em>, not the same fraction of a life.
             Both stars are 4.6 billion years old. One is halfway through its
             main sequence and the other has done four thousandths of it.
             \n\nRecord both, and the ratio of their luminosities.`,
      fields: [
        {
          id: 'sun',
          label: 'Sun-like star, luminosity at 4.6 Gyr',
          unit: 'L☉',
        },
        {
          id: 'dwarf',
          label: '0.2 M☉ star, luminosity at 4.6 Gyr',
          unit: 'L☉',
        },
        {
          id: 'ratio',
          label: 'How many times brighter the Sun-like one is',
          unit: '×',
          compute: v => v.sun / v.dwarf,
          decimals: 0,
        },
      ],
      validate: v => {
        if (![v.sun, v.dwarf].every(x => Number.isFinite(x) && x > 0)) {
          return {
            level: 'warn',
            message: 'Both luminosities, from the readout.',
          };
        }
        const r = v.sun / v.dwarf;
        if (r < 100 || r > 500) {
          return {
            level: 'warn',
            message:
              'That is not the ratio the models give. About 1.11 and 0.0048 solar luminosities, both at 4.6 Gyr.',
          };
        }
        return {
          level: 'ok',
          message:
            'About 230 times. And the honest caveat on the trillion-year figure: no 0.2 solar-mass star has ever finished its main sequence, anywhere, because the Universe is a thousandth of that age. It is a model integrated forward, not an observed lifetime, and nothing can check it.',
        };
      },
      tool: stage({
        pace: 'phase',
        pins: [
          { track: 'm020', ageYr: 4.6e9 },
          { track: 'm100', ageYr: 4.6e9 },
        ],
        hide: ['order'],
        capture: true,
      }),
      tip: 'Comparing at the same age and comparing at the same fraction of a life are different experiments and answer different questions. Step 33 asks you to pick one deliberately.',
    },
    {
      sid: 'predict-massive-lifetime',
      type: 'predict',
      title: 'Twenty solar masses',
      body: `Now the other end. Switch to the 20 solar-mass model and look at
             where it sits on the main sequence: about 43,000 solar
             luminosities, at 35,000 K.
             \n\nIt has twenty times the Sun&rsquo;s fuel. Predict how long its
             main sequence lasts.`,
      prompt: 'The main-sequence lifetime of a 20 M☉ star is about…',
      options: [
        '200 billion years — twenty times the Sun&rsquo;s',
        '10 billion years — about the same as the Sun&rsquo;s',
        '9 million years',
        '9 thousand years',
      ],
      answer: 2,
      because:
        'Nine million years: about a thousandth of the Sun&rsquo;s. Twenty times the fuel and forty thousand times the rate of spending it. This is the single most useful consequence of the steep relation between mass and luminosity, and it is why the massive stars in any region of a galaxy are always the young ones - a star like this cannot be old, because nothing that bright lasts.',
      tool: evol({ track: 'm2000', phase: 'main-sequence' }),
      tip: 'The readout gives it as 8.65 Myr on the "This phase" row while you are parked on the main sequence.',
    },
    {
      sid: 'massive-versus-sun',
      type: 'measure',
      title: 'What that costs',
      body: `Put the two numbers side by side: how much more light, and how
             much less time.
             \n\nRead the luminosity from each star&rsquo;s main sequence and
             the main-sequence duration from the "This phase" row.`,
      fields: [
        { id: 'lumSun', label: 'Sun-like, luminosity', unit: 'L☉' },
        { id: 'lumBig', label: '20 M☉, luminosity', unit: 'L☉' },
        { id: 'msSun', label: 'Sun-like, main sequence', unit: 'Gyr' },
        { id: 'msBig', label: '20 M☉, main sequence', unit: 'Myr' },
      ],
      validate: v => {
        const all = [v.lumSun, v.lumBig, v.msSun, v.msBig];
        if (all.some(x => !Number.isFinite(x) || x <= 0)) {
          return { level: 'warn', message: 'Four numbers, all positive.' };
        }
        if (v.lumBig / v.lumSun < 5000) {
          return {
            level: 'warn',
            message:
              'The 20 M☉ figure is in the tens of thousands of solar luminosities.',
          };
        }
        if (v.msBig > 100) {
          return {
            level: 'warn',
            message:
              'Its main sequence is measured in millions of years, not billions. The readout gives it in Myr.',
          };
        }
        return {
          level: 'ok',
          message:
            'Roughly forty thousand times the light for about a thousandth of the time. Multiply those out and the heavy star gets through about forty times as much fuel in total — which it has, being twenty times the mass and burning a larger fraction of it.',
        };
      },
      tool: evol({ track: 'm2000', phase: 'main-sequence', capture: true }),
      tip: 'You can pin the Sun-like track as a ghost with "Keep this track to compare", then switch stars: the dashed line stays on the diagram behind the new one.',
    },
    {
      sid: 'supergiant-and-burning',
      type: 'explore',
      title: 'A supergiant, and what is burning in it',
      body: `Follow the 20 solar-mass model past its main sequence with the
             interior schematic on. It expands to over a thousand solar radii
             — five times the radius of the Earth&rsquo;s orbit — while losing
             nearly six solar masses to its wind.
             \n\nThe schematic changes as the energy source does. Remember what
             it is: a picture of which process is running, not a structure.`,
      checklist: [
        'Turn on the interior schematic',
        'Step through: main sequence, expansion, helium ignition, core helium burning',
        'Watch the Radius row climb past 1,000 solar radii',
        'Watch the Mass row fall from 20 towards 14',
        'Reach "Advanced burning" — the last phase this model has',
        'Read what the readout says about where the track stops',
      ],
      tool: evol({
        track: 'm2000',
        phase: 'core-helium-burning',
        interior: true,
      }),
      tip: 'Six solar masses lost to a wind — more than the entire mass of most stars. Massive stars return most of themselves to space before they do anything dramatic.',
    },
    {
      sid: 'why-iron-stops-it',
      type: 'question',
      title: 'Why it cannot keep going',
      kind: 'short',
      body: `A massive star burns hydrogen to helium, helium to carbon and
             oxygen, and — beyond where these tracks stop — carbon to heavier
             things, in shells, each stage faster than the one before.
             \n\nThe sequence ends at iron. Everything before iron releases
             energy when it fuses; iron does not. Fusing iron takes energy in
             rather than giving it out.
             \n\nThe star has been holding itself up against its own gravity
             with the energy released in its core.`,
      prompt:
        'In two or three sentences: why does an iron core end the star, when a helium core did not?',
      rubric:
        'Full credit needs the link between fusion and support. A star is held up by pressure, and that pressure is maintained by energy released in the core; when core hydrogen ran out the star could contract, heat, and start burning something else, so the support was restored. Iron is where that stops working, because fusing iron absorbs energy rather than releasing it - so contraction no longer buys a new energy source, and there is nothing left to halt it. Credit an answer that gets "iron fusion does not release energy, so there is no new source to restore the pressure". Do NOT credit "the star runs out of fuel", which is the answer for a white dwarf and is wrong here: an iron core is surrounded by plenty of unburnt material. Do not credit an answer that treats iron as simply the last element that exists.',
      tool: evol({ track: 'm2000', phase: 'advanced-burning', interior: true }),
      tip: 'These tracks stop at carbon ignition, before any of that happens. Everything from carbon onwards is described here in words and is not in the model — the readout says where it stopped and with how much mass.',
    },
    {
      sid: 'predict-core-and-envelope',
      type: 'predict',
      title: 'Two different fates in one star',
      body: `The core is about to collapse. The outer layers — most of the
             star&rsquo;s mass — are a long way out and are not, yet, doing
             anything.
             \n\nPredict what happens to each.`,
      prompt: 'When the core collapses, the core and the envelope…',
      options: [
        'both collapse together into the remnant',
        'both are blown away, leaving nothing behind',
        'the core collapses into a compact remnant and the envelope may be blown outwards',
        'the envelope collapses first and crushes the core',
      ],
      answer: 2,
      because:
        'They part company. The core collapses in about a second to something a few tens of kilometres across; whether the envelope is expelled is a separate question with a separate answer, and it is not always yes. Where the explosion succeeds, the ejecta and the remnant are two different objects with two different fates: the ejecta enrich the interstellar medium, the remnant stays. Where it fails, the envelope falls back in and there is no bright supernova at all. Steps 29 and 31 are those two cases.',
      tool: evol({ track: 'm1000', phase: 'advanced-burning' }),
      tip: 'This is a prediction about the model&rsquo;s endpoint prescription, not about the track — the track has already stopped by here, and the readout says so.',
    },
    {
      sid: 'the-neutron-star',
      type: 'measure',
      title: 'A neutron star, and how we know',
      body: `Run the 10 solar-mass model to the end. The track stops at carbon
             ignition with 9.4 solar masses left; what happens after that is
             not in it.
             \n\nThe readout tells you where the answer comes from instead.
             Record what it says, and notice how carefully it is worded.`,
      fields: [
        { id: 'remnant', label: 'Mass of the remnant', unit: 'M☉' },
        { id: 'atStop', label: 'Mass when the track stopped', unit: 'M☉' },
      ],
      validate: v => {
        if (![v.remnant, v.atStop].every(x => Number.isFinite(x))) {
          return { level: 'warn', message: 'Both masses, from the readout.' };
        }
        if (v.remnant > 3) {
          return {
            level: 'warn',
            message:
              'The remnant is far lighter than that — the readout gives it as about 1.4 solar masses, with the sources spanning 1.2 to 1.6.',
          };
        }
        if (v.atStop < 8) {
          return {
            level: 'warn',
            message:
              'The "How this is known" row gives the mass the track still had when it stopped: about 9.4 solar masses.',
          };
        }
        return {
          level: 'ok',
          message:
            'About 1.4 solar masses left from 9.4 — the rest is ejecta. And the crucial line: that 1.4 is not from the track. It is a published result quoted for a star of this mass, and the readout names the paper. Nothing in Gravitas computed it.',
        };
      },
      tool: evol({ track: 'm1000', phase: 'end', capture: true }),
      tip: 'The expanding rings in the panel are an illustration of an event, not a calculation of one, and they are deliberately kept off the diagram — a supernova&rsquo;s brightness is a transient lasting weeks and is not the star&rsquo;s photospheric luminosity.',
    },
    {
      sid: 'neutron-star-scale',
      type: 'question',
      title: 'How small, and why you might never see it',
      kind: 'choice',
      body: `The white dwarf you measured at step 20 was about twice the radius
             of the Earth, holding 0.54 solar masses. This neutron star holds
             about 1.4 solar masses in roughly twenty kilometres across.
             \n\nIt is often said that neutron stars are pulsars. Think about
             what that claim requires.`,
      prompt: 'A neutron star is observed as a pulsar when…',
      options: [
        'always — every neutron star is a pulsar',
        'it is spinning, has a strong magnetic field, and its beam happens to sweep across us',
        'it is close enough to see',
        'it is still inside its supernova remnant',
      ],
      answer: 1,
      because:
        'Three conditions, and the last one is luck. A pulsar is a neutron star whose beam happens to point our way once per rotation; if the geometry is wrong we never see the pulses, however close it is. Many neutron stars are not observed as pulsars at all, and older ones slow down and stop producing detectable pulses regardless of geometry. Nothing in this lab models any of it - the endpoint here is a mass and a kind, and calling it a pulsar would be adding a claim the model does not make.',
      tool: evol({ track: 'm1000', phase: 'end' }),
      tip: 'Twenty kilometres for 1.4 solar masses is about a hundred million tonnes in a teaspoon. It has no photosphere in the ordinary sense, which is why it has no place on the diagram.',
    },
    {
      sid: 'the-black-hole',
      type: 'measure',
      title: 'And one that probably does not explode',
      body: `Switch to the 40 solar-mass model and run it to the end.
             \n\nRead the whole endpoint section carefully. It contains three
             admissions that the neutron-star case did not need, and they are
             the point of this step.`,
      fields: [
        { id: 'atStop', label: 'Mass when the track stopped', unit: 'M☉' },
        { id: 'lo', label: 'Lowest remnant mass the sources give', unit: 'M☉' },
        { id: 'hi', label: 'Highest', unit: 'M☉' },
      ],
      validate: v => {
        if (![v.atStop, v.lo, v.hi].every(x => Number.isFinite(x))) {
          return { level: 'warn', message: 'Three numbers, from the readout.' };
        }
        if (v.hi <= v.lo) {
          return {
            level: 'error',
            message: 'The range runs low to high — check the order.',
          };
        }
        if (v.hi / v.lo < 2) {
          return {
            level: 'warn',
            message:
              'The range the readout gives is wider than that: 10 to 35 solar masses.',
          };
        }
        return {
          level: 'ok',
          message:
            'Three admissions: the track stopped earlier here than for any other massive star — during helium ignition, with 35 of the original 40 solar masses still present; the remnant mass is a range spanning a factor of three and not a number; and a bright supernova is not expected. At this mass the likeliest route to a black hole is a failed explosion, where the envelope is not expelled but falls in.',
        };
      },
      setup: LIFECYCLE_SANDBOX,
      tool: evol({ track: 'm4000', phase: 'end', capture: true }),
      tip: 'Look at the diagram: the bright line stops where the model stops and nothing continues it. A black hole has no photosphere, so it has no temperature or luminosity to plot, and drawing it at log(0) or at an invented point would be a lie about what is known.',
    },

    // -----------------------------------------------------------------------
    // 32-34: reading it back
    // -----------------------------------------------------------------------
    {
      sid: 'read-the-descriptions',
      type: 'question',
      title: 'What is this one?',
      kind: 'choice',
      body: `Four descriptions. No names, no masses.
             \n\n<strong>A.</strong> 3,300&nbsp;K at the surface, 1,100 solar
             luminosities, 100 solar radii.
             \n\n<strong>B.</strong> 48,000&nbsp;K, 1.6 solar luminosities,
             0.018 solar radii.
             \n\n<strong>C.</strong> 3,300&nbsp;K, 0.007 solar luminosities,
             0.24 solar radii.
             \n\n<strong>D.</strong> 4,600&nbsp;K, 0.5 solar luminosities,
             1.1 solar radii.
             \n\nPut any of them on the diagram with the free cursor, and use
             <strong>Find nearby models</strong> to see what passes close.`,
      prompt: 'Which of these four is the hardest to pin down?',
      options: [
        'A — five of the bundled models pass close to it, at four different stages and two different masses',
        'B — hot and faint could be many things',
        'C — small, cool and faint is the vaguest of the four',
        'D — nothing in the bundle is anywhere near it',
      ],
      answer: 0,
      because:
        'A, and not by a little. Five models pass close to that point: a solar-mass star on the red-giant branch, the same star at helium ignition, the same star on the early asymptotic giant branch, the same star during its thermal pulses, and a two solar-mass star on ITS thermal pulses. Four stages and two masses, all producing the same three numbers. B is the opposite - one model passes close, because nothing except a white dwarf is that hot and that faint, and the temperature and the luminosity together force it to be tiny. D is also unambiguous within this bundle: a solar-mass star still contracting, about 15 million years old. C is the interesting middle case: the mass is pinned at 0.2 solar masses because nothing else lives there, but the STAGE is not - it could be on the main sequence or still contracting towards it, and the numbers cannot separate those. "Not enough information" is a real answer and a lesson that never gives it teaches the wrong habit.',
      tool: lab({ mode: 'free', regions: true, compare: false }),
      tip: 'This is why the regions on the diagram are shaded rather than outlined, and why the lab lists every nearby model instead of picking one. A star is not a giant because it crossed a line.',
    },
    {
      sid: 'design-a-comparison',
      type: 'measure',
      title: 'Your own comparison',
      body: `Choose two of the eight models and compare them — but choose
             deliberately <em>which kind</em> of comparison you are making.
             \n\n<strong>Same age</strong> asks what two stars born together
             look like now. <strong>Same fraction of a life</strong> asks what
             two stars look like at the same stage. They are different
             questions and they give different answers; step 23 was the first
             kind.
             \n\nPredict first, then measure, then save the comparison.`,
      fields: [
        { id: 'massA', label: 'First star, mass', unit: 'M☉' },
        { id: 'massB', label: 'Second star, mass', unit: 'M☉' },
        {
          id: 'lumA',
          label: 'First star, luminosity you measured',
          unit: 'L☉',
        },
        { id: 'lumB', label: 'Second star, luminosity', unit: 'L☉' },
      ],
      validate: v => {
        const all = [v.massA, v.massB, v.lumA, v.lumB];
        if (all.some(x => !Number.isFinite(x) || x <= 0)) {
          return { level: 'warn', message: 'Four numbers, all positive.' };
        }
        if (v.massA === v.massB) {
          return {
            level: 'warn',
            message:
              'Two different models, so the comparison has a variable in it.',
          };
        }
        const heavier = v.massA > v.massB ? 'A' : 'B';
        const brighter = v.lumA > v.lumB ? 'A' : 'B';
        if (heavier === brighter) {
          return {
            level: 'ok',
            message:
              'The heavier of your two is the brighter. On the main sequence that is always true and steeply so. If you compared them at the same age rather than the same stage, check whether the heavier one has already left its main sequence — that is where this stops being reliable.',
          };
        }
        return {
          level: 'ok',
          message:
            'Your lighter star is the brighter one — which means you have caught the heavier one somewhere the main-sequence relation does not apply, or the lighter one as a giant. Either is a real result and worth writing down in the notebook entry.',
        };
      },
      tool: evol({ track: 'm100', capture: true, compare: true }),
      tip: 'Use "Keep this track to compare" to leave the first star&rsquo;s path on the diagram as a dashed line while you look at the second.',
    },
    {
      sid: 'the-lifecycle-argument',
      type: 'question',
      title: 'Back to the three stars',
      kind: 'short',
      body: `In step 1 you were shown a red dwarf, a Sun-like star and a
             twenty solar-mass star and asked which changes fastest and how
             each ends. Your answer is saved and nothing has overwritten it.
             \n\nYou have now followed all three, plus a forty solar-mass model
             that ends as a black hole. Write the account you would give now.
             \n\nOne requirement: name a limitation of the models this whole
             lesson rests on. There are several and the readouts have been
             telling you about them throughout.`,
      prompt:
        'Explain what determines how a star lives and how it ends, referring to at least two of your own measurements — and name one thing these models do not tell you.',
      rubric:
        'Mark on the connections and on the limitation, not on coverage. Look for: mass sets the luminosity, steeply, and therefore sets the lifetime, because lifetime is fuel over the rate of spending it; leaving the main sequence is core hydrogen exhaustion and not the end of the star; what happens afterwards depends on mass, with a white dwarf for the Sun-like case, a neutron star for ten solar masses and a black hole for forty; and the red dwarf does none of it on any timescale that has yet elapsed. A strong answer cites the 1.14 trillion against 8.65 million year lifetimes, or the 0.90 to 173 solar radii swing of one star.\\n\\nFor the limitation, accept any of: the tracks are single stars with no companion, so no mass transfer and no merger; they stop before core collapse, so every remnant beyond a white dwarf is a quoted prescription rather than a computed result; they are one composition and no rotation; the endpoint at forty solar masses is a range spanning a factor of three; the 1.1 trillion year lifetime is unverifiable in principle. Do NOT accept "the animation is not to scale in time" alone - that is a property of the display, which the lesson states repeatedly, rather than of the models.\\n\\nCredit an answer that revises the step 1 prediction and credit one that defends it, provided the defence engages with what was measured.',
      tool: stage({
        pace: 'phase',
        pins: [{ track: 'm020' }, { track: 'm100' }, { track: 'm2000' }],
        capture: true,
      }),
      tip: 'Your notebook has every measurement with the model it came from, the stage it was taken at, and — where an endpoint was quoted rather than computed — the paper it was quoted from.',
    },
  ],
};

export default LIVES_OF_STARS;
