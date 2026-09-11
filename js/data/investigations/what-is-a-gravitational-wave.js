// =============================================================================
// What Is a Gravitational Wave?
// -----------------------------------------------------------------------------
// The beginner half of a pair. Listening to Spacetime asks what a signal tells
// you about its source and how a model compares with data; this asks the prior
// question, which that lesson assumes and never answers: what is the thing
// arriving, and why does anything emit one.
//
// What it assumes: that things orbit. Nothing else. No strain, no Fourier
// transform, no chirp mass, no metric. Every number a student is asked for is
// read off a readout, and the only arithmetic is a ratio.
//
// The line this lesson has to hold
// -----------------------------------------------------------------------------
// The same three-way distinction its sequel is built on, introduced here for
// the first time and named on the screen where each one first appears:
//
//   an illustration   the two discs on the canvas, the rings, the marker ring.
//                     Drawn, exaggerated, and labelled as drawn.
//   a model           the waveform, the separation, the frequency. Computed,
//                     in real units, valid over a stated range.
//   an observation    the GW150914 trace on screen 22, and nothing else in
//                     this lesson.
//
// Screens 2, 7, 12 and 22 each say which of the three the reader is looking at
// in the moment it matters. A beginner who leaves able to make that
// distinction has got the most transferable thing here.
//
// Why the canvas rather than the panel
// -----------------------------------------------------------------------------
// The binary is a pair of selectable bodies in the main scene, driven by the
// same timeline the waveform is plotted from - see `source` below. That is not
// decoration. Half of this lesson is about a source being a *thing that moves*
// rather than a curve, and a curve in a panel beside a static backdrop is the
// picture that produces the misconception.
// =============================================================================

/**
 * The two compact objects the lab's parameters describe, on the main canvas.
 *
 * Separation to scale in Schwarzschild radii of the total mass, driven by the
 * waveform's own timeline; the two bodies are fixed-size markers. The scale
 * and the reason for it are in js/lessonStage.js, and screens 2 and 12 say so
 * to the reader.
 */
const source = (kinds, m1, m2, extra = {}) => ({
  binary: { kinds, m1, m2, fit: true, ...extra },
});

/** The pair this lesson follows: the GW150914-like black holes. */
const PAIR = source(['bh', 'bh'], 36, 29);
/** Two neutron stars, for the comparison near the end. */
const NEUTRON_PAIR = source(['ns', 'ns'], 1.4, 1.4);

/**
 * The lab, showing only what the current screen needs.
 *
 * Controls arrive one at a time. A beginner handed six sliders on screen 1
 * spends the lesson discovering the interface instead of the subject, so every
 * screen hides everything it has not asked about yet, and the screen that
 * introduces a control says what it does.
 */
const lab = (extra = {}) => ({
  id: 'gw-lab',
  binary: true,
  presets: false,
  noiseControls: false,
  hide: ['m1', 'm2', 'distance', 'inclination'],
  ...extra,
});

/** Everything hidden, including the playhead: a screen that only looks. */
const ALL_HIDDEN = ['m1', 'm2', 'distance', 'inclination', 'cursor'];

const WHAT_IS_A_GRAVITATIONAL_WAVE = {
  id: 'what-is-a-gravitational-wave',
  // Its own card, drawn from the opening source by
  // tools/generate-lesson-cards.mjs: this lesson names no scenario.
  thumbnail: 'images/investigations/what-is-a-gravitational-wave.webp',
  title: 'What Is a Gravitational Wave?',
  subtitle:
    'A first look at what moves, what travels and what a detector feels',
  duration: '30-40 min',
  level: 'Beginner, no physics background needed',
  tags: ['gravity', 'waves'],
  series: 'Gravitational waves',
  lock: { placement: true, inspector: false, areaSweep: false },
  summary:
    'Two objects circle each other on screen and emit no light at all. Over twenty-four short screens you work out what leaves them, what it does to anything it passes, and how an instrument could notice - and you learn to tell the three kinds of picture apart: the drawing, the calculation and the measurement. No equations, no prior physics, and it can be done with the sound off.',
  objectives: [
    'Say how a gravitational wave differs from light, from sound, and from the gravity that is already there',
    'Say what a source has to be doing: changing, and not the same in every direction',
    'Describe the stretch-and-squeeze a passing wave produces, at right angles to its travel',
    'Connect an orbit to a repeating signal, and a shrinking orbit to a rising one',
    'Explain in ordinary words how an observatory measures a change in length',
    'Tell an illustration, a model and an observation apart on the same screen',
  ],
  steps: [
    // -----------------------------------------------------------------------
    // 1-4: something is out there, and what it has to be doing
    // -----------------------------------------------------------------------
    {
      sid: 'travel-without-shining',
      stage: PAIR,
      type: 'predict',
      title: 'Something can travel without shining',
      body: `Two objects are on the canvas, circling each other. They are
             paused, and they give off no light: no glow, no colour, nothing a
             telescope could photograph.
             \n\nCommit to an answer before going on. You are not expected to
             know this one.`,
      prompt:
        'If these two objects emit no light at all, could we still find out that they are moving?',
      options: [
        'No — with no light there is nothing to detect',
        'Yes — anything with mass bends space, and moving mass can send that bending outwards as a travelling disturbance',
        'Yes — we would hear them, because sound travels through space',
        'Only if something else nearby lit them up',
      ],
      answer: 1,
      because:
        'Yes, and by the second route. Mass curves the space around it, and when the mass moves in the right way that curvature does not simply sit there - a ripple in it travels outwards, at the speed of light, carrying energy. That ripple is a gravitational wave, and it is what the rest of this lesson is about. The two wrong answers worth naming: there is no sound, because sound needs air and there is none between here and there, and nothing has to light the pair up, because what leaves them is not light. Keep the answer you gave; screen 24 asks you about it again.',
      tool: lab({ view: 'source', autoplay: false, hide: ALL_HIDDEN }),
      tip: 'The two discs are a drawing of where the model says the objects are. They are not a photograph, and nothing in this lesson is.',
    },
    {
      sid: 'meet-the-two-objects',
      stage: PAIR,
      type: 'explore',
      title: 'Meet the two objects',
      body: `Before going further, meet them properly.
             \n\nClick each one on the canvas, or use <strong>Objects in this
             activity</strong> below the readout, which does the same from the
             keyboard. The card that opens gives its mass, in units of the
             Sun&rsquo;s.
             \n\nWhat you are looking at is an <strong>illustration</strong>.
             The positions come from a calculation, and the distance between
             the two is drawn to scale; the discs themselves are markers at a
             fixed size, not pictures of anything. There is no photograph of a
             black hole binary, and there never will be one of this kind.`,
      checklist: [
        'Select the first object and read its mass from the card',
        'Select the second and read its mass',
        'Notice that both cards say the same kind of thing: a mass, and a position',
        'Say out loud which is heavier, and by roughly how much',
      ],
      tool: lab({ view: 'source', autoplay: false, hide: ALL_HIDDEN }),
      tip: 'The separation on screen is measured in Schwarzschild radii of the two masses together — one honest unit — and it will shrink as the lesson goes on. The size of each disc is not a measurement of anything.',
    },
    {
      sid: 'gravity-is-already-here',
      stage: source(['bh', 'bh'], 36, 29, { fit: true }),
      type: 'question',
      title: 'Gravity is already here',
      kind: 'choice',
      body: `A single mass, sitting still, already curves the space around it.
             That curvature is why things fall, and it is there whether anybody
             is watching or not.
             \n\nThe important word is <em>sitting still</em>. Nothing about
             that curvature changes. It does not travel. It does not arrive.
             There is no ripple, because there is nothing doing any rippling.`,
      prompt:
        'A single mass that never moves. What reaches a distant observer from it?',
      options: [
        'A steady pull, unchanging — and no travelling wave',
        'A stream of gravitational waves, spreading outwards for ever',
        'Nothing at all, because gravity needs motion',
        'A wave, but only if the observer is moving',
      ],
      answer: 0,
      because:
        'A steady pull, and nothing else. This is the distinction the whole lesson turns on: a gravitational <em>field</em> is what is already there around any mass, and a gravitational <em>wave</em> is a change in it that travels. A star sitting still has the first and produces none of the second. What it takes to produce the second is the subject of the next screen.',
      tool: lab({ view: 'source', autoplay: false, hide: ALL_HIDDEN }),
      tip: 'Compare it with a lamp: the light already in the room is not a radio broadcast. Both are electromagnetic, and only one of them is a signal going somewhere.',
    },
    {
      sid: 'what-has-to-change',
      stage: PAIR,
      type: 'predict',
      title: 'What has to change?',
      body: `Three imaginary sources, all of them massive, all of them
             perfectly ordinary:
             \n\n<strong>A.</strong> A heavy ball, sitting still.
             \n\n<strong>B.</strong> A heavy ball that swells and shrinks -
             bigger, smaller, bigger - staying a perfect sphere the whole time.
             \n\n<strong>C.</strong> Two heavy balls circling each other.
             \n\nOne of these three sends out gravitational waves. Commit
             before reading on.`,
      prompt: 'Which one produces a travelling gravitational wave?',
      options: [
        'A, because it has the most concentrated mass',
        'B, because it is moving and moving mass makes waves',
        'C, because the arrangement of its mass keeps changing shape as seen from outside',
        'All three, because all three have mass',
      ],
      answer: 2,
      because:
        'Only C. B is the interesting wrong answer and it is worth sitting with: the ball is genuinely moving, every part of it accelerating in and out, and it still emits nothing. A perfect sphere looks the same from outside however much it pulses, so from a distance nothing about it changes, and there is nothing to send. So "moving mass makes waves" is not the rule. The rule is that the mass has to be arranged <em>unevenly</em> and that arrangement has to keep <em>changing</em> - which is exactly what two objects going round each other do.',
      tool: lab({ view: 'source', autoplay: false, hide: ALL_HIDDEN }),
      tip: 'A spinning, perfectly round star emits nothing either, for the same reason. Give it a bump on one side and it does.',
    },

    // -----------------------------------------------------------------------
    // 5-7: the source, its rhythm, and something leaving it
    // -----------------------------------------------------------------------
    {
      sid: 'watch-the-pair',
      stage: PAIR,
      type: 'explore',
      title: 'Watch the pair',
      body: `Let it run. Press <strong>Play / pause</strong> and watch the two
             objects go round on the canvas.
             \n\nWatch what happens to the <em>arrangement</em> rather than to
             either object. At one moment the pair is lined up left-to-right;
             a quarter of a turn later it is lined up top-to-bottom. The mass
             is in a different shape as seen from out here, and it keeps
             becoming a different shape, over and over.
             \n\nThat is the source. Everything else in this lesson is a
             consequence of it.`,
      checklist: [
        'Press Play / pause and watch several complete orbits',
        'Pause when the two objects are side by side',
        'Step forward until they are one above the other',
        'Say what is the same about those two moments, and what is different',
      ],
      tool: lab({ view: 'source', autoplay: true, hide: ALL_HIDDEN }),
      tip: 'The motion is a model, not a simulation of these two bodies pulling on each other: the positions come from a published formula for how such a pair spirals in. The panel says so under the picture.',
    },
    {
      sid: 'the-pattern-repeats',
      stage: PAIR,
      type: 'question',
      title: 'The pattern repeats',
      kind: 'choice',
      body: `Pause, and step through the orbit a little at a time with the
             playhead.
             \n\nStart with the pair lined up left-to-right. Keep going until
             the <em>arrangement of the mass</em> looks the same as it did at
             the start. Not until each object is back where it began - until
             the shape is back.
             \n\nFor two equal objects on a circle, that happens sooner than
             you might expect.`,
      prompt:
        'Starting from side by side, how much of a full orbit until the mass is arranged the same way again?',
      options: [
        'A quarter of an orbit',
        'Half an orbit — swapping the two objects leaves the same arrangement',
        'A full orbit',
        'Two full orbits',
      ],
      answer: 1,
      because:
        'Half an orbit. Swap two identical objects and you cannot tell: the pair lined up left-to-right at the start is lined up left-to-right again halfway round, with the two objects exchanged. So the pattern the source presents to the outside world repeats twice per orbit - and the wave it sends out does too. That is why the wave frequency for a pair like this is <em>twice</em> the orbital frequency, a fact screen 16 has you count for yourself. For two objects of different masses it is not quite so clean, which is a complication this lesson leaves alone.',
      tool: lab({ view: 'source', autoplay: false }),
      tip: 'Use the playhead in small steps. The readout gives the orbital phase, so you can check your answer against a number rather than by eye.',
    },
    {
      sid: 'follow-a-disturbance-outward',
      stage: PAIR,
      type: 'explore',
      title: 'Follow a disturbance outward',
      body: `The rings now drawn around the pair are a <strong>schematic</strong>
             of the disturbance leaving it. Each ring marks where one crest of
             the wave would be.
             \n\nPick one ring and follow it outwards as the playhead moves.
             Notice that the rings further out are more widely spaced: they
             left when the orbit was wider and slower.
             \n\nTwo things about the drawing, both deliberate. The real
             disturbance travels at the <strong>speed of light</strong> - the
             display slows it down enormously, or there would be nothing to
             see. And the rings are a marker for a crest, not a picture of
             matter moving outwards. Nothing is being thrown out of the
             binary.`,
      checklist: [
        'Follow one ring from the pair out to the edge of the picture',
        'Notice that the outermost rings are the most widely spaced',
        'Say why: they left earlier, when the orbit was slower',
        'Say what the rings are not: not matter, not light, and not to scale in speed',
      ],
      tool: lab({ view: 'source', autoplay: true, hide: ALL_HIDDEN }),
      tip: 'Rings are the honest minimum here. A picture of the actual distortion of space at this scale would be a smooth field with no visible structure at all, because the effect is a part in 10²¹.',
    },

    // -----------------------------------------------------------------------
    // 8-13: what it does when it arrives
    // -----------------------------------------------------------------------
    {
      sid: 'freely-floating-markers',
      stage: PAIR,
      type: 'read',
      title: 'Meet some freely floating markers',
      body: `The ring of dots in the panel is a thought experiment: a circle of
             small objects, floating freely, a long way from the source, with
             nothing holding them and nothing pushing them.
             \n\nOne thing about how it is drawn matters more than it looks.
             You are seeing that ring <strong>face on to the wave</strong> -
             looking back along the direction the wave is travelling. It is not
             the orbit seen from above, and the dots are not the two objects.
             They are somewhere else entirely, out where the wave has got to.
             \n\nWatch what the wave does to them.`,
      tool: lab({ view: 'both', autoplay: true, hide: ALL_HIDDEN }),
      tip: 'The effect is drawn enormously larger than life. Screen 12 lets you turn the exaggeration down and see what the real size of it would be.',
    },
    {
      sid: 'stretch-one-way',
      stage: PAIR,
      type: 'question',
      title: 'Stretch one way',
      kind: 'choice',
      body: `Pause, and move the playhead slowly until the ring of markers is
             at its widest from <strong>left to right</strong>.
             \n\nNow look at the other direction.`,
      prompt:
        'At the moment the markers are furthest apart horizontally, what has happened vertically?',
      options: [
        'They are further apart vertically too — everything has grown',
        'They are closer together vertically',
        'The vertical spacing has not changed',
        'They have all moved off to one side together',
      ],
      answer: 1,
      because:
        'Closer together. That is the characteristic thing a gravitational wave does, and it is why the ring becomes an oval rather than a bigger circle: it stretches along one direction and squeezes along the direction at right angles, both at once. Nothing has grown overall. And both of those directions are at right angles to the way the wave is travelling, which is why it is called a <em>transverse</em> wave.',
      tool: lab({ view: 'both', autoplay: false }),
      tip: 'Move the playhead in small steps and watch the ring rather than the plot. The oval is easiest to see at its most extreme.',
    },
    {
      sid: 'now-swap',
      stage: PAIR,
      type: 'measure',
      title: 'Now swap',
      body: `From where you are, advance about <strong>half a wave cycle</strong>
             - roughly to the next place the plot crosses its lowest point.
             \n\nThe oval turns over: what was stretched is now squeezed, and
             what was squeezed is now stretched. Then it swings back. That
             alternation, over and over, is the whole of what arrives.`,
      fields: [
        {
          id: 'wide_dir',
          label:
            'At your first stop, which way was the ring widest? (1 = across, 2 = up and down)',
          unit: '',
        },
        {
          id: 'wide_dir_later',
          label: 'Half a cycle later, which way? (1 = across, 2 = up and down)',
          unit: '',
        },
      ],
      validate: v => {
        if (![v.wide_dir, v.wide_dir_later].every(Number.isFinite)) {
          return { level: 'warn', message: 'Two answers, each a 1 or a 2.' };
        }
        if (v.wide_dir === v.wide_dir_later) {
          return {
            level: 'warn',
            message:
              'Those are the same. Half a wave cycle later the two directions have exchanged places — try moving a little further, or a little less far.',
          };
        }
        return {
          level: 'ok',
          message:
            'They exchange. Stretch and squeeze swap over twice in every wave cycle, and in between there is a moment when the ring is a perfect circle again and nothing is happening to it at all.',
        };
      },
      tool: lab({ view: 'both', autoplay: false }),
      tip: 'There is no need to be precise about half a cycle. Anywhere that the oval has clearly turned over will do.',
    },
    {
      sid: 'markers-not-carried-away',
      stage: PAIR,
      type: 'explore',
      title: 'The markers are not carried away',
      body: `A natural thing to think at this point is that the wave is
             pushing the markers outwards - that they are being swept along
             with it, the way a cork is carried by a wave on water.
             \n\nThey are not. Follow one single marker through a complete
             cycle and watch where it ends up. It moves a little, and then it
             comes back. The wave has gone past; the marker has not gone
             anywhere.
             \n\nWhat travels is the disturbance. What changes is the
             <em>distance between</em> things. That distinction is what makes
             a detector possible at all, and it is the last idea you need
             before one makes sense.`,
      checklist: [
        'Pick one marker and keep your eye on it',
        'Step through a whole cycle and watch it return to where it began',
        'Now watch two markers on opposite sides, and notice the gap between them changing',
        'Say in your own words what travels and what only wobbles',
      ],
      tool: lab({ view: 'both', autoplay: true, hide: ALL_HIDDEN }),
      tip: 'A cork on a water wave does the same thing, and this is the one place the water analogy helps rather than misleads: the cork bobs and stays put, and the wave goes on.',
    },
    {
      sid: 'why-drawn-so-large',
      stage: PAIR,
      type: 'read',
      title: 'Why is the effect drawn so large?',
      body: `Because otherwise there would be nothing on the screen.
             \n\nThe ring you have been watching is drawn with the effect
             exaggerated by an enormous factor. The real change in the distance
             between two markers, for a wave like this one, is about
             <strong>one part in 10²¹</strong>.
             \n\nThat number is hard to feel, so here it is another way. If the
             two markers were as far apart as the Earth is from the Sun, the
             wave would change that distance by about the width of an atom.
             At the size of this picture, the real effect would move a marker
             by far less than the width of one pixel - less than the width of
             one atom of your screen.
             \n\nEverything you have seen so far is an <strong>illustration</strong>.
             The next few screens are about what is actually measured.`,
      tool: lab({ view: 'both', autoplay: true, hide: ALL_HIDDEN }),
      tip: 'This is why gravitational waves were predicted in 1916 and first detected in 2015. Nobody doubted the arithmetic; the problem was building something that could see a part in 10²¹.',
    },
    {
      sid: 'measure-a-change-in-length',
      stage: PAIR,
      type: 'measure',
      title: 'Measure a change in length',
      body: `Here is the one piece of vocabulary this lesson needs.
             \n\nWhen a wave passes, a length <em>L</em> changes by a small
             amount. The useful number is not the change itself but the
             <strong>fraction</strong>: how much it changed, divided by how
             long it was. That fraction is called the <strong>strain</strong>.
             \n\nStart with numbers you can hold. A 4-kilometre arm that
             changes by 4 millimetres has a strain of 0.004 divided by 4000,
             which is 0.000001, or one part in a million.
             \n\nNow the real one. Read <strong>Strain amplitude</strong> off
             the readout - the largest fraction this wave reaches - and write
             it down.`,
      fields: [
        {
          id: 'toy',
          label: 'Practice: a 10 m rod that stretches by 1 mm has a strain of…',
          unit: '',
          hint: '0.0001',
        },
        {
          id: 'real',
          label: 'Strain amplitude from the readout',
          unit: '',
        },
      ],
      validate: v => {
        if (Number.isFinite(v.toy)) {
          const want = 1e-4;
          if (Math.abs(v.toy - want) / want > 0.25) {
            return {
              level: 'warn',
              message:
                'Not quite. One millimetre is 0.001 m, and 0.001 divided by 10 is 0.0001. The strain is a fraction, so it has no units.',
            };
          }
        }
        if (!Number.isFinite(v.real)) {
          return {
            level: 'warn',
            message:
              'Read "Strain amplitude" from the list under the plot. It will be a very small number written with a power of ten.',
          };
        }
        if (v.real > 1e-15) {
          return {
            level: 'warn',
            message:
              'That looks far too large for a gravitational wave. The number you want is around 10⁻²¹ — check you have read the amplitude and not the frequency.',
          };
        }
        return {
          level: 'ok',
          message:
            'About a part in 10²¹, against your practice number of a part in ten thousand. Seventeen orders of magnitude smaller, and it is measured routinely now.',
        };
      },
      tool: lab({
        view: 'both',
        autoplay: false,
        capture: true,
        hide: ['m1', 'm2', 'distance', 'inclination'],
      }),
      tip: 'Strain is a fraction, so it has no units — a strain of 10⁻²¹ means the same thing whether the length is a metre or a light year.',
    },
    {
      sid: 'can-space-carry-a-sound',
      stage: PAIR,
      type: 'read',
      title: 'Can space carry a sound?',
      body: `You may have heard a gravitational wave played as a sound. This
             lesson can play you one: press <strong>Listen</strong> if you have
             sound available, and watch the marker cross the plot if you do
             not. Nothing here needs sound, and nothing in this lesson is
             graded on hearing anything.
             \n\nWhat is happening when you press it is worth being exact
             about. The application takes the changing signal and turns it into
             a sound for you. It is a translation, made here, on your machine.
             \n\nA microphone next to the two objects would hear
             <strong>nothing</strong>. Sound is a wave in a material - air,
             water, rock - and there is no material between here and there.
             What arrives is a change in distance, not a change in pressure.
             "Hearing a black hole merger" is a figure of speech.`,
      tool: lab({
        view: 'signal',
        autoplay: false,
        listen: 'peak',
        hide: ALL_HIDDEN,
      }),
      tip: 'The panel prints exactly what it did to make the signal audible — how much it sped it up, and by how much that shifted the pitch. A translation that hides its own workings is not one you can check.',
    },

    // -----------------------------------------------------------------------
    // 15-19: rhythm, shrinking orbits, and where the model stops
    // -----------------------------------------------------------------------
    {
      sid: 'slower-pair-faster-pair',
      stage: PAIR,
      type: 'predict',
      title: 'A slower pair and a faster pair',
      body: `Two objects circling each other far apart go round slowly. The
             same two objects circling closer together go round faster - the
             same reason Mercury goes round the Sun faster than Neptune.
             \n\nThe masses will stay exactly the same. Only the separation
             will change.`,
      prompt: 'A closer pair, with the same two masses, sends out a wave that…',
      options: [
        'has a higher frequency, because the pattern repeats more often',
        'has a lower frequency, because the objects have less far to travel',
        'has the same frequency, because the masses have not changed',
        'has no frequency, because frequency is a property of light',
      ],
      answer: 0,
      because:
        'Higher. The wave repeats when the arrangement repeats, so a pair that gets round its orbit more often sends out crests more often. The rule to carry forward is that the wave frequency follows the <em>orbital</em> frequency, and for a pair like this one it is exactly twice it. Nothing about the masses changed, which is the point of holding them fixed.',
      tool: lab({ view: 'both', autoplay: false }),
      tip: 'You can check this yourself in a moment. Early in the signal the pair is wide and slow; late in it, the same two objects are close and fast.',
    },
    {
      sid: 'count-the-rhythm',
      stage: PAIR,
      type: 'measure',
      title: 'Count the rhythm',
      body: `Now count it, slowly.
             \n\nPark the playhead early in the signal, where everything is
             unhurried. Watch the two objects on the canvas and count
             <strong>one complete orbit</strong> - until the pair is back the
             way it started, with each object where it began.
             \n\nOver that same stretch, count the peaks on the plot.
             \n\nThen save both numbers to your notebook.`,
      fields: [
        { id: 'orbits', label: 'Complete orbits you counted', unit: '' },
        { id: 'peaks', label: 'Wave peaks over the same stretch', unit: '' },
        {
          id: 'ratio',
          label: 'Peaks per orbit',
          unit: '',
          compute: v => (v.orbits > 0 ? v.peaks / v.orbits : NaN),
          decimals: 1,
        },
      ],
      validate: v => {
        if (![v.orbits, v.peaks].every(Number.isFinite)) {
          return { level: 'warn', message: 'Two counts, both whole numbers.' };
        }
        if (v.orbits <= 0) {
          return { level: 'error', message: 'Count at least one whole orbit.' };
        }
        const r = v.peaks / v.orbits;
        if (r > 1.6 && r < 2.4) {
          return {
            level: 'ok',
            message: `About ${r.toFixed(1)} peaks per orbit — two, within counting error. The pattern the source shows the outside world repeats twice per orbit, so the wave does too.`,
          };
        }
        return {
          level: 'warn',
          message: `You have ${r.toFixed(1)} per orbit, and the answer for this pair is 2. Count again over a stretch where the motion is slow, and be careful to count peaks rather than every crossing of the middle line.`,
        };
      },
      tool: lab({
        view: 'both',
        autoplay: false,
        capture: true,
        speed: 0.25,
      }),
      tip: 'Count early in the signal, where the pace is slowest. The playhead can be nudged with the arrow keys once it has focus, which is easier than dragging.',
    },
    {
      sid: 'why-an-orbit-shrinks',
      stage: PAIR,
      type: 'read',
      title: 'Why can an orbit shrink?',
      body: `You have probably noticed that the pair is not staying put. The
             separation shrinks as the signal goes on, and the frequency climbs
             with it.
             \n\nThe reason is the wave itself. Sending out gravitational waves
             costs <strong>energy</strong>, and the only place that energy can
             come from is the orbit. An orbit with less energy is a smaller
             orbit. A smaller orbit is a faster one. A faster one radiates
             harder still.
             \n\nSo it runs away with itself, slowly at first and then very
             quickly indeed - which is the shape you have been looking at all
             along.
             \n\nOne caution about this application. Elsewhere in Gravitas,
             black holes spiral together because the simulation shrinks their
             orbit by a small factor each step - an illustration, chosen to
             look right. That is <em>not</em> what is happening here. The
             motion on this screen comes from the same published inspiral
             formula as the plot beside it.`,
      tool: lab({ view: 'both', autoplay: true, hide: ALL_HIDDEN }),
      tip: 'The energy is not going nowhere. It leaves as gravitational waves, and a detector four hundred megaparsecs away picks up a minuscule share of it.',
    },
    {
      sid: 'the-chirp',
      stage: PAIR,
      type: 'question',
      title: 'The chirp',
      kind: 'short',
      body: `Park the playhead near the <strong>beginning</strong> and read
             three things off the readout: the separation, the orbital speed,
             and the frequency.
             \n\nNow park it near the <strong>end</strong> and read the same
             three.
             \n\nIf you have sound, press <strong>Listen</strong> and hear the
             whole thing go past. If you do not, watch the marker: the peaks
             crowd together in exactly the same way.`,
      prompt:
        'In two or three sentences, and without using any equations, say what a "chirp" is and why this signal is one.',
      rubric:
        'Credit an answer that has the frequency rising as the two objects get closer and go round faster, and that connects the rise to the shrinking orbit rather than treating it as a property the signal simply has. A good answer may also say that it gets louder towards the end. Do not require the word "amplitude" or any mention of energy loss - that was the previous screen and this one is about describing what is heard and seen. Do not credit "it speeds up because it is being pulled harder" with no mention of the separation. Watch also for the overclaim: a rising chirp says two compact objects were spiralling together and does not say what they were made of, which screen 20 comes back to.',
      tool: lab({
        view: 'both',
        autoplay: false,
        listen: 'peak',
        capture: true,
      }),
      tip: 'A bird’s chirp is a note that slides upward in a fraction of a second, which is where the name comes from. It is a description of the sound, not a claim about what made it.',
    },
    {
      sid: 'where-the-calculation-stops',
      stage: PAIR,
      type: 'question',
      title: 'Where our calculation stops',
      kind: 'choice',
      body: `Take the playhead all the way to the end.
             \n\nThe plot stops. It does not fade out, and it does not show the
             two objects merging - it simply ends, and the readout says where
             and why.
             \n\nThat ending is a <strong>boundary on the calculation</strong>,
             not something that happens to the binary. The formula behind this
             plot assumes two objects on a slowly shrinking circular orbit, and
             close to the end that assumption stops being true. Getting the
             last moments right needs an entirely different kind of
             calculation, on a supercomputer, and it took the field about forty
             years to manage it.`,
      prompt: 'The plot ending where it does means…',
      options: [
        'the two objects stopped moving at that moment',
        'the model was switched off there, because past that point it would not be reliable',
        'the wave stopped being emitted',
        'the detector stopped recording',
      ],
      answer: 1,
      because:
        'The model was switched off. Nothing physical happens at that instant; the calculation simply stops being trustworthy, so it stops. There is no merger in this plot and no ringing afterwards, and the last visible cycle is not the last cycle the binary had. A model that says where it stops is more useful than one that carries on regardless - and it is the honest reason the picture ends abruptly rather than tidily.',
      tool: lab({ view: 'both', autoplay: false }),
      tip: 'The readout gives the frequency where it stops. For this pair it is about 68 Hz, and the real event was followed to around 250 Hz — by instruments and calculations well beyond what this lesson uses.',
    },

    // -----------------------------------------------------------------------
    // 20-22: other pairs, distance, and a real measurement
    // -----------------------------------------------------------------------
    {
      sid: 'different-compact-pairs',
      stage: NEUTRON_PAIR,
      type: 'explore',
      title: 'Different compact pairs',
      body: `Black holes are not the only things that do this. Two neutron
             stars can spiral together too, and so can one of each.
             \n\nThe two objects on the canvas are now a pair of neutron stars,
             each about 1.4 times the Sun&rsquo;s mass. Select them and look at
             the card, then compare the signal with the one you have been
             watching.
             \n\nA warning about how far this goes. The model behind these
             plots treats both objects as points with a mass and nothing else.
             It cannot tell you what they are made of, and it says nothing
             about what happens when two neutron stars actually touch - which
             is a rich and violent piece of physics this lesson does not
             attempt.
             \n\nThe two mass controls are open on this screen, and so is the
             distance. Watch all three when you press a preset: each one puts
             its pair at a different distance as well, so the height of the
             trace is not a fair comparison between them. The next screen
             changes distance on its own, which is the way to see what it does.`,
      checklist: [
        'Select each neutron star and read its mass from the card',
        'Compare the frequency at the start with the black-hole pair you had before',
        'Notice that the neutron-star signal lasts much longer in band',
        'Say what the model can tell you here, and what it cannot',
      ],
      // The presets move m1, m2 and distance, so this screen opens all three:
      // a preset that silently shifts a control the reader cannot see is the
      // hidden state change tests/investigationIntegrity.test.js exists to catch.
      tool: lab({
        view: 'both',
        autoplay: false,
        presets: true,
        hide: ['inclination'],
      }),
      tip: 'Lighter objects take far longer to spiral in, so their signal stays in a detector’s range for minutes rather than a fraction of a second. That difference is real, and it is one of the few things the simple model does get right.',
    },
    {
      sid: 'the-same-source-farther-away',
      stage: PAIR,
      type: 'measure',
      title: 'The same source, farther away',
      body: `Back to the black holes, and one controlled change.
             \n\nThe <strong>Distance</strong> control moves the same source
             farther away. Nothing about the two objects changes: same masses,
             same orbit, same everything. Only how far off it is.
             \n\nThe plot scale is fixed for this screen, and so is the sound
             level, so that what you see and hear is a comparison rather than
             an adjustment. Record the strain amplitude at three distances.`,
      fields: [
        { id: 'a400', label: 'Strain amplitude at 400 Mpc', unit: '' },
        { id: 'a800', label: 'Strain amplitude at 800 Mpc', unit: '' },
        { id: 'a1600', label: 'Strain amplitude at 1600 Mpc', unit: '' },
      ],
      validate: v => {
        const all = [v.a400, v.a800, v.a1600];
        if (!all.every(Number.isFinite)) {
          return {
            level: 'warn',
            message:
              'Three readings, from "Strain amplitude". Set the distance, then read it off.',
          };
        }
        if (all.some(x => x <= 0)) {
          return {
            level: 'error',
            message:
              'An amplitude cannot be zero or negative. Read "Strain amplitude", which is the size of the wobble, rather than "Strain now", which passes through zero twice a cycle.',
          };
        }
        const r1 = v.a400 / v.a800;
        const r2 = v.a800 / v.a1600;
        if (Math.abs(r1 - 2) < 0.35 && Math.abs(r2 - 2) < 0.35) {
          return {
            level: 'ok',
            message:
              'Halving each time the distance doubles. The source did not change at all: what changed is the share of it that reaches us. Look at the frequency too — it is identical at all three distances, because that is a property of the source.',
          };
        }
        return {
          level: 'warn',
          message: `Your readings fall by ${r1.toFixed(2)} and then ${r2.toFixed(2)} for each doubling. The expected answer is 2 each time. Check that only the distance changed.`,
        };
      },
      tool: lab({
        view: 'both',
        autoplay: false,
        capture: true,
        fixedPeak: 1.4e-21,
        referenceStrain: 1.4e-21,
        hide: ['m1', 'm2', 'inclination'],
      }),
      tip: 'The model puts the source at a given distance and scales the amplitude by one over that distance. It does not model the stretching of the wave by the expansion of the Universe, which matters for the most distant sources and is left out here.',
    },
    {
      sid: 'an-observatory-measures-a-difference',
      stage: PAIR,
      type: 'explore',
      title: 'An observatory measures a difference',
      body: `Now the instrument. An observatory like LIGO is an
             <strong>L</strong>: two long arms at right angles, four kilometres
             each, with light bouncing along both.
             \n\nYou already know why that shape. A passing wave stretches one
             direction while squeezing the direction at right angles - so it
             makes one arm longer and the other shorter, at the same moment.
             The instrument does not measure a length. It measures the
             <em>difference</em> between two lengths, which is a far easier
             thing to do well.
             \n\nScrub the playhead and watch the marker ring: the two
             perpendicular directions are the two arms.
             \n\nThen press <strong>Next</strong> on the panel&rsquo;s own
             instrument to bring up something different. On 14 September 2015
             two observatories three thousand kilometres apart recorded the
             same thing, seven milliseconds apart, and that recording is what
             appears. Not a drawing and not a calculation: the strain the
             instruments measured, as published.
             \n\nYou are not asked to analyse it. Look at it, and notice that
             it has the shape you have spent twenty screens learning to
             expect - a wobble that speeds up and grows. That is the point. The
             model you have been using is simple enough for a first lesson, and
             the real thing looks like it.`,
      checklist: [
        'Scrub the wave past the marker ring and watch the two perpendicular directions change by different amounts',
        'Say why an L is the right shape for the instrument',
        'Look at the published trace and find where the wobble speeds up',
        'Notice how noisy it is beside the clean model, and say which of the three kinds of picture each one is',
      ],
      tool: { id: 'gw-real' },
      tip: 'Four kilometres changing by a ten-thousandth of the width of a proton. The published data is band-passed and whitened before it is shown, and the panel says so: even a measurement arrives having been handled.',
    },
    {
      sid: 'design-one-small-experiment',
      stage: PAIR,
      type: 'measure',
      title: 'Design one small experiment',
      body: `Your turn. Pick <strong>one</strong> thing to change, and change
             nothing else.
             \n\nThe controls available are the two masses, the distance and
             the viewing angle. Choose one. Write down what you think will
             happen before you touch it, then take a reading with the control
             at setting A and another at setting B, and save both.
             \n\nOne variable. That is the whole method, and it is the reason
             anybody believes the answer afterwards.`,
      fields: [
        {
          id: 'variable',
          label:
            'Which control you changed (1 = a mass, 2 = distance, 3 = viewing angle)',
          unit: '',
        },
        { id: 'a', label: 'Your reading at setting A', unit: '' },
        { id: 'b', label: 'Your reading at setting B', unit: '' },
        {
          id: 'change',
          label: 'How much it changed, B ÷ A',
          unit: '',
          compute: v => (v.a ? v.b / v.a : NaN),
          decimals: 2,
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.variable)) {
          return {
            level: 'warn',
            message: 'Say which control you changed: 1, 2 or 3.',
          };
        }
        if (![v.a, v.b].every(Number.isFinite)) {
          return { level: 'warn', message: 'Two readings, A and B.' };
        }
        if (v.a === v.b) {
          return {
            level: 'warn',
            message:
              'Your two readings are identical. Either the control you moved does not affect the number you read, which is itself a finding worth writing down, or the change was too small to show.',
          };
        }
        return {
          level: 'ok',
          message:
            'Two settings, one variable, and a ratio. Say in the box below what you held fixed — that half of the description is what makes it an experiment rather than an observation.',
        };
      },
      tool: lab({
        view: 'both',
        autoplay: false,
        capture: true,
        presets: true,
        hide: [],
      }),
      tip: 'If dragging a slider is difficult, use the preset buttons: they set the controls to named configurations, and comparing two presets is a perfectly good experiment as long as you say which one thing differs.',
    },
    {
      sid: 'tell-the-story',
      stage: PAIR,
      type: 'question',
      title: 'Tell the story',
      kind: 'short',
      body: `Last screen. Put it together in your own words.
             \n\nYou have a pair of objects circling each other, something
             leaving them and travelling outwards, and an instrument a long way
             off whose two arms change length by different amounts.
             \n\nGo back to screen 1 for a moment. You were asked whether we
             could learn that two dark objects were moving. Look at what you
             answered.`,
      prompt:
        'In four or five sentences, explain how the motion of two objects ends up as a measurement in an instrument on Earth. Then say whether your answer on screen 1 still stands, and what you would change about it.',
      rubric:
        'A full answer has the chain: two objects orbiting means an uneven arrangement of mass that keeps changing; that sends a disturbance outwards at the speed of light; the disturbance stretches and squeezes distances at right angles to its travel; an L-shaped instrument measures the difference between two arms and so notices it. Credit an answer that has four of those five links. Look for, and credit, any mention of the effect being tiny or of the difference between a drawing and a measurement - both are the harder half of this lesson. Do not require any technical vocabulary at all; "the gap between things changes" is a complete answer to the third link. The revisit of screen 1 matters more than its correctness: a student who says "I said no, and I was wrong because I was thinking only about light" has understood the lesson.',
      tool: lab({ view: 'both', autoplay: false, capture: true }),
      tip: 'Next: <strong>Listening to Spacetime</strong> takes the same instrument much further — what a signal reveals about the source that made it, how a model is compared against real data, and why a signal that looks right is not yet a detection.',
    },
  ],
};

export default WHAT_IS_A_GRAVITATIONAL_WAVE;
