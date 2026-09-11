// =============================================================================
// Listening to spacetime: discover a merger
// -----------------------------------------------------------------------------
// Twenty-four steps built on one instrument and one dataset. The instrument is
// the gravitational-wave lab (js/gwWidgets.js, js/gwLab.js), which computes a
// leading-order inspiral and says out loud where it stops; the dataset is the
// published GW150914 figure data (js/data/gw/gw150914.js), reproduced and not
// reprocessed.
//
// The line this lesson has to hold
// -----------------------------------------------------------------------------
// Three different things in this application would answer to the phrase
// "gravitational wave", and a student who leaves not knowing which was which
// has learned something false:
//
//   the sandbox behind the panel    a damping constant, chosen so a binary
//                                   merges while somebody is watching
//   the lab in the panel            a computed waveform, valid over a stated
//                                   range and terminated at a stated boundary
//   the GW150914 traces             a measurement
//
// Step 2 names all three, and no later step lets them blur. Where the model
// cannot answer a question the lesson stops asking it rather than extrapolating:
// the merger, the ringdown, and everything a neutron star does after it touches
// are absent here and said to be absent.
//
// What the student does rather than reads
// -----------------------------------------------------------------------------
// Six predictions committed before the reveal, seven measurements, two
// controlled comparisons with one variable each, a real-data alignment they
// find themselves, an open sandbox challenge and a written conclusion. The
// audio is offered at four points and required at none: every task can be
// completed from the plots and the readout, which is checked by
// e2e/gwLesson.spec.js running the whole lesson with the sound off.
// =============================================================================

/** The backdrop. The lab does not use it; step 2 explains what it is. */
// The scene is the source now, and the source is the model's.
//
// It used to be the GW150914 scenario, running, behind the panel: two black
// holes spiralling in because the sandbox multiplies their orbit down every
// step, beside a waveform computed from entirely different numbers. Two
// pictures of two different things, in a lesson whose subject is telling a
// measurement from a model apart.
//
// The synthetic-model screens now stand the binary the lab is describing on
// the canvas, driven by the same timeline the plot is drawn from. It is a
// schematic reconstruction, it says so, and the integrator does not touch it.

/**
 * The two compact objects the lab's parameters describe.
 *
 * Their separation is to scale in Schwarzschild radii of the total mass and
 * tightens as the frequency climbs, because that is what the model says. The
 * two bodies are markers at a fixed size: a horizon and a neutron-star surface
 * are not the same kind of quantity, and drawing them to the separation's
 * scale would put a claim about neutron-star radii into a lesson that has not
 * earned one.
 */
const source = (kinds, m1, m2, extra = {}) => ({
  binary: { kinds, m1, m2, fit: true, ...extra },
});

/** The default pair: the two black holes the whole lesson is built around. */
const BBH = source(['bh', 'bh'], 36, 29);

/** The lab, in the configuration a step wants it. */
const lab = (extra = {}) => ({
  id: 'gw-lab',
  // Every model screen drives the binary on the canvas. See `source` above.
  binary: true,
  ...extra,
});

/** The published traces. */
const real = (extra = {}) => ({ id: 'gw-real', ...extra });

const LISTENING_TO_SPACETIME = {
  id: 'listening-to-spacetime',
  // Its own card, drawn from the lesson's own opening source by
  // tools/generate-lesson-cards.mjs. It used to borrow the GW150914
  // scenario's capture, which was honest while the lesson ran that scenario
  // behind the panel; it stages the model's own binary now and names no
  // scenario at all.
  thumbnail: 'images/investigations/listening-to-spacetime.webp',
  title: 'Listening to Spacetime',
  subtitle: 'Work out what made a signal, then check it against the real thing',
  duration: '60-75 min',
  level: 'Introductory astronomy',
  tags: ['compact-objects', 'gravity', 'observing', 'waves'],
  // The second of the pair. What Is a Gravitational Wave? comes first and
  // answers the question this one assumes; neither requires the other to have
  // been completed, and the catalogue orders them.
  series: 'Gravitational waves',
  // The inspector stays available: nothing in this lesson is measured off the
  // sandbox, and a student who clicks a black hole to see what it is should be
  // allowed to. Placement is locked until the open challenge at step 23.
  lock: { placement: true, inspector: false, areaSweep: false },
  summary:
    'A pattern arrives with no label on it: a wiggle that gets faster and louder and then stops. Over twenty-four steps you work out what could produce it, measure the two relationships that give it away, find out which questions the model can answer and which it cannot, and finish by comparing your answer with what two detectors in Louisiana and Washington actually recorded in September 2015. You can do all of it with the sound off.',
  objectives: [
    'Read a strain-against-time plot and a frequency-against-time plot of the same signal',
    'Explain why the wave frequency is twice the orbital frequency',
    'Say what a chirp is and what makes one rise',
    'Design and run a comparison in which exactly one thing changes',
    'Explain why amplitude alone does not tell you how far away a source is',
    'Say where a leading-order inspiral model stops being trustworthy, and why',
    'Distinguish a measurement, a model and an illustration in the same picture',
    'Explain why a signal that looks and sounds like a chirp is not yet a detection',
  ],
  steps: [
    // -----------------------------------------------------------------------
    // 1-3: an unknown signal, and the three views of it
    // -----------------------------------------------------------------------
    {
      sid: 'an-unlabelled-signal',
      stage: BBH,
      type: 'predict',
      title: 'Something arrived',
      body: `In the panel is a signal. It was generated by a model on your
             machine, just now, and nobody has told you what the model is of.
             That matters and it is said here rather than at the end: this is
             not a recording of an astronomical event, and no conclusion you
             reach in this lesson is evidence that anything happened anywhere.
             What it is good for is the same thing a laboratory standard is
             good for - working out what a signal of that shape would have to
             have come from.
             \n\nThe top plot is the strength of that signal against time, and
             the bottom one is its frequency. Press <strong>Play / pause</strong>
             and watch the marker cross both. If you have sound on, press
             <strong>Listen</strong> as well; if you do not, you will not miss
             anything — everything this lesson asks for can be read off the
             plots.
             \n\nThe pattern speeds up. It gets stronger. Then it stops.
             \n\nBefore you are told anything, commit to an answer. You are not
             expected to get this right.`,
      prompt:
        'Something whose signal gets faster and stronger and then stops is most likely…',
      options: [
        'a single object spinning faster and faster until it breaks apart',
        'two objects circling each other, getting closer and going round faster',
        'an explosion, which is loudest at the moment it happens',
        'a star pulsing in and out, more quickly as it heats up',
      ],
      answer: 1,
      because:
        'Two objects circling each other. Nothing else on that list produces a frequency that climbs smoothly by a factor of three and then stops: an explosion has no reason to have a rising frequency at all, and a spinning or pulsing star has nothing to make it speed up in a fraction of a second. A pair of objects losing energy does, because losing energy means falling closer together, and closer together means going round faster. That is what the rest of this lesson is about. If you chose something else, keep the reason you had - you will be asked at the end whether it still stands.',
      tool: lab({
        view: 'signal',
        preset: 'bbh',
        autoplay: false,
        noiseControls: false,
        hide: ['m1', 'm2', 'distance', 'inclination'],
        presets: false,
        note: 'A model-generated signal, computed here and now. The upper plot is its strength, the lower one its frequency. Nothing here says yet what the model is of.',
      }),
      tip: 'The slider marked "Position in the signal" is a playhead: drag it to move through the signal, or press Play / pause to let it run.',
    },
    {
      sid: 'three-things-called-a-wave',
      stage: BBH,
      type: 'read',
      title: 'Three different things, all called the same thing',
      body: `Here is the source. Two compact objects, circling each other,
             getting closer.
             \n\nThere are now three pictures on your screen and they are three
             different kinds of thing. It is worth being precise about which is
             which, because almost every confusing thing ever written about
             gravitational waves comes from mixing them up.
             \n\n<strong>The animation behind the panel</strong> is the ordinary
             sandbox, and it is two things at once. The <em>motion</em> is a
             real calculation: Newtonian gravity, integrated step by step, the
             same arithmetic every other body in this application gets. The
             <em>spiralling in</em> is not. Newtonian gravity has no
             gravitational waves in it and would keep those two black holes
             circling forever, so the simulation shrinks their orbit by a small
             factor every step to make a merger happen while somebody is
             watching. That constant was chosen to look right, not derived from
             how fast a binary actually radiates, and nothing about the rate you
             see it happen at is a measurement.
             \n\nSo: the orbit is calculated, the decay is an illustration, and
             neither of them produces the waveform in the panel. The plots are
             computed separately, from the masses, by the model described
             below - the sandbox does not feed them and could not.
             \n\n<strong>The left half of the panel</strong> is a schematic. The
             separation between the two bodies is computed - it comes from the
             frequency by Kepler's third law - but the picture is not to scale,
             the bodies are drawn far larger than they are, and the rings are an
             illustration of where wave crests would be. The panel says so on
             itself.
             \n\n<strong>The plots</strong> are the model. A real calculation,
             in real units, of what a detector would record. It is good over a
             stated range and it stops at a stated boundary, and finding both is
             part of this lesson.
             \n\nWhat is arriving at the detector is not a sound, and it is not
             light. It is a change in the distances between things. The ring of
             dots on the right is what a circle of free-floating test masses
             would do as the wave went past: stretched one way, squeezed the
             other, at right angles to the direction the wave is travelling. The
             real effect is about one part in 10²¹, which is why it is drawn
             enormously exaggerated.`,
      tool: lab({
        view: 'both',
        preset: 'bbh',
        autoplay: false,
        noiseControls: false,
        hide: ['m1', 'm2', 'distance', 'inclination'],
        presets: false,
      }),
      tip: 'One part in 10²¹ is the width of a human hair compared with the distance to the nearest star, four times over.',
    },
    {
      sid: 'find-your-way-around',
      stage: BBH,
      type: 'explore',
      title: 'Find your way around',
      body: `Before measuring anything, get the controls under your fingers.
             \n\nThe playhead moves the whole panel at once: the schematic
             source, both plots and the readout are all the same moment, read
             four times. There is no second clock anywhere in here.`,
      checklist: [
        'Press Play / pause and watch the marker cross both plots together',
        'Press it again to stop somewhere in the middle',
        'Drag the "Position in the signal" slider back and forth by hand',
        'Watch the two bodies in the schematic move as you drag',
        'Press Replay to go back to the beginning',
        'Read "At the cursor" in the list under the plots: a frequency and a time before merger',
        'If you have sound: press Listen, and read the line that appears saying what was done to make it audible',
      ],
      tool: lab({
        view: 'both',
        preset: 'bbh',
        autoplay: false,
        noiseControls: false,
        hide: ['m1', 'm2', 'distance', 'inclination'],
        presets: false,
      }),
      tip: 'The panel is deliberately slow: it plays about a tenth of a second of signal for every second on screen, and says so on the last line of the readout. The real thing was over in under a second.',
    },

    // -----------------------------------------------------------------------
    // 4-9: the chirp, measured
    // -----------------------------------------------------------------------
    {
      sid: 'predict-as-it-tightens',
      stage: BBH,
      type: 'predict',
      title: 'As the orbit tightens',
      body: `The two objects are losing energy - that is what the waves carry
             away - so they fall closer together. Think about what that does to
             their orbit before you look.
             \n\nA useful thing to have in mind: a planet close to the Sun goes
             round faster than a distant one. Mercury takes 88 days, Neptune
             takes 165 years.`,
      prompt: 'As the two objects spiral closer, the signal will…',
      options: [
        'get slower and weaker, because they are running out of energy',
        'get faster and stronger',
        'get faster but weaker',
        'stay at the same frequency and just get louder',
      ],
      answer: 1,
      because:
        'Faster and stronger, and for two different reasons. Faster because a tighter orbit is a quicker one, exactly as it is for the planets: fall closer, go round more often. Stronger because the waves a pair of orbiting masses emit get more intense as they get closer and move faster. The first answer is the intuitive one and the trap: they are indeed losing energy, but what they lose is orbital energy, and a binary that loses orbital energy speeds up rather than slowing down. That is genuinely strange and it is worth sitting with.',
      tool: lab({
        view: 'signal',
        preset: 'bbh',
        autoplay: false,
        noiseControls: false,
        hide: ['m1', 'm2', 'distance', 'inclination'],
        presets: false,
      }),
    },
    {
      sid: 'watch-the-waves',
      stage: BBH,
      type: 'explore',
      title: 'Watch the waves leave',
      body: `Switch to the source view and watch several orbits go past.
             \n\nEach ring is one crest of the wave, drawn where it would be now
             after leaving the source. The rings further out left earlier, when
             the binary was turning more slowly, so they are further apart. The
             ones near the middle left just now.
             \n\nThe centre is deliberately blank. The formula that gives these
             amplitudes is a far-field result: it describes the wave a long way
             from the source and it does not describe the region right next to
             it, which is a region about a wavelength across containing two
             black holes. Drawing something there would be drawing something
             nobody computed.`,
      checklist: [
        'Play the signal and watch the ring pattern expand',
        'Notice that the rings are further apart at the edge than near the middle',
        'Stop near the beginning and count roughly how many rings fit across',
        'Move to near the end and count again',
        'Watch the ring of test masses on the right stretch one way and squeeze the other',
        'Confirm that the stretch is across the page, not along the direction the wave came from',
      ],
      tool: lab({
        view: 'source',
        preset: 'bbh',
        autoplay: false,
        noiseControls: false,
        hide: ['m1', 'm2', 'distance', 'inclination'],
        presets: false,
      }),
      tip: 'The test masses are a separate picture, not a detector parked next to the binary. A real detector for this source was about 1.3 billion light years away.',
    },
    {
      sid: 'two-crests-per-orbit',
      stage: BBH,
      type: 'measure',
      title: 'How many waves per orbit?',
      body: `A relationship worth finding for yourself, because it explains a
             factor of two that turns up everywhere in this subject.
             \n\nPark the playhead near the start of the signal, where the orbit
             is changing slowly, and use the schematic source view. Follow one
             of the two bodies - say the smaller one - and count how many times
             it goes round while you count crests on the strain plot.
             \n\nEasiest way to do it: put the playhead at the very start, note
             where the small body is, then step the playhead forward until it
             has come back to the same place. That is one orbit. Then count the
             peaks the strain plot passed through in the same interval.`,
      fields: [
        { id: 'orbits', label: 'Orbits you followed', unit: '' },
        { id: 'crests', label: 'Wave peaks in the same time', unit: '' },
        {
          id: 'ratio',
          label: 'Wave peaks per orbit',
          unit: '',
          compute: v => v.crests / v.orbits,
          decimals: 2,
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.orbits) || v.orbits <= 0) {
          return { level: 'warn', message: 'Count at least one whole orbit.' };
        }
        if (!Number.isFinite(v.crests) || v.crests <= 0) {
          return {
            level: 'warn',
            message:
              'Count the peaks on the strain plot over the same interval.',
          };
        }
        const r = v.crests / v.orbits;
        if (r < 1.5 || r > 2.5) {
          return {
            level: 'warn',
            message: `You have ${r.toFixed(1)} peaks per orbit. Check the interval: the two counts have to cover exactly the same stretch of the playhead.`,
          };
        }
        return null;
      },
      tool: lab({
        view: 'both',
        preset: 'bbh',
        autoplay: false,
        noiseControls: false,
        hide: ['m1', 'm2', 'distance', 'inclination'],
        presets: false,
      }),
      tip: 'Two, and the reason is a symmetry: turn the binary through half a turn and the two bodies have swapped places, which looks exactly like the arrangement you started with. The wave cannot tell the difference either, so it repeats twice per orbit.',
    },
    {
      sid: 'frequency-early-and-late',
      stage: BBH,
      type: 'measure',
      title: 'The frequency, twice',
      body: `Now put numbers on the climb.
             \n\nMove the playhead near the beginning and read the frequency
             from the readout line marked <strong>At the cursor</strong>. Then
             move it near the end and read it again. Record both, along with how
             long before the merger each reading was taken.`,
      fields: [
        { id: 'f_early', label: 'Frequency near the start', unit: 'Hz' },
        { id: 't_early', label: 'Time before merger then', unit: 's' },
        { id: 'f_late', label: 'Frequency near the end', unit: 'Hz' },
        { id: 't_late', label: 'Time before merger then', unit: 's' },
        {
          id: 'factor',
          label: 'How many times higher the frequency got',
          unit: '×',
          compute: v => v.f_late / v.f_early,
          decimals: 2,
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.f_early) || !Number.isFinite(v.f_late)) {
          return { level: 'warn', message: 'Read the frequency at both ends.' };
        }
        if (v.f_late <= v.f_early) {
          return {
            level: 'warn',
            message:
              'The later reading should be the higher one. Check which end of the plot each was taken at.',
          };
        }
        if (!Number.isFinite(v.t_early) || !Number.isFinite(v.t_late)) {
          return {
            level: 'warn',
            message: 'Record the time before merger at each reading too.',
          };
        }
        if (Math.abs(v.t_late) >= Math.abs(v.t_early)) {
          return {
            level: 'warn',
            message:
              'The later reading should be closer to the merger, so its time before merger should be the smaller of the two.',
          };
        }
        return null;
      },
      tool: lab({
        view: 'signal',
        preset: 'bbh',
        autoplay: false,
        noiseControls: false,
        hide: ['m1', 'm2', 'distance', 'inclination'],
        presets: false,
      }),
      tip: 'The frequency plot has a logarithmic vertical axis, which is why a curve that looks gentle at the left is actually climbing steeply. Doubling is the same distance up the axis wherever you are.',
    },
    {
      sid: 'stop-at-a-milestone',
      stage: BBH,
      type: 'measure',
      title: 'Stop at fifty hertz and record it',
      body: `A specific moment, so that everyone in the room has the same one.
             \n\nMove the playhead until the readout says the frequency is as
             close to <strong>50 Hz</strong> as you can get it. Record what the
             readout tells you at that moment.
             \n\nThen press <strong>Save to notebook</strong>. That stores the
             numbers, the settings they were taken under, and the model's own
             limitations alongside them, so that a claim you make later can be
             checked against the reading it came from.`,
      fields: [
        { id: 'f50', label: 'Frequency you stopped at', unit: 'Hz' },
        { id: 't50', label: 'Time before merger there', unit: 's' },
        { id: 'sep50', label: 'Separation there', unit: 'Rs' },
        { id: 'v50', label: 'Orbital speed there', unit: 'v/c' },
      ],
      validate: v => {
        if (!Number.isFinite(v.f50))
          return {
            level: 'warn',
            message: 'Read the frequency you stopped at.',
          };
        if (Math.abs(v.f50 - 50) > 6) {
          return {
            level: 'warn',
            message: `You are at ${v.f50.toFixed(1)} Hz. Nudge the playhead until it reads close to 50.`,
          };
        }
        if (!Number.isFinite(v.sep50) || v.sep50 <= 0) {
          return {
            level: 'warn',
            message:
              'The readout gives the separation in Schwarzschild radii on the line marked Separation.',
          };
        }
        return null;
      },
      tool: lab({
        view: 'signal',
        preset: 'bbh',
        autoplay: false,
        capture: true,
        noiseControls: false,
        hide: ['m1', 'm2', 'distance', 'inclination'],
        presets: false,
      }),
      tip: 'Separation is given in Schwarzschild radii of the combined mass. Under about three of them there is no stable circular orbit left, which is where the model stops — the plot ends there because it is switched off there, not because anything in it merges. "Time before merger" is the model extrapolating its own countdown, not a moment it calculated.',
    },
    {
      sid: 'explain-the-chirp',
      stage: BBH,
      type: 'question',
      title: 'Say what a chirp is',
      kind: 'short',
      body: `You now have three measurements: two peaks per orbit, a frequency
             that climbed by roughly a factor of three, and a separation that
             shrank while it did.
             \n\nPut them together.`,
      prompt:
        'Explain, in two or three sentences, why the signal from two objects spiralling together rises in frequency. Use the word "orbit" and say what happens to the separation.',
      rubric:
        'Full credit needs the chain: the binary radiates energy away, so the separation shrinks; a smaller orbit is a faster orbit, so the orbital frequency rises; and the wave frequency is twice the orbital frequency, so it rises with it. Credit an answer that gets the first two links without the factor of two. Do NOT credit an answer that says the objects speed up because they are being pulled harder without connecting that to the separation, and do not credit "they are running out of energy so they speed up" with no mechanism. Watch for the common inversion: a student who says the frequency rises because the objects are getting heavier has misread the model, whose masses do not change. Separately, do not let a correct chain turn into an overclaim: nothing here shows that this signal was detected, or that the two objects are black holes. A chirp of this shape says "two compact objects spiralling together" and it says their chirp mass; it does not say what they are made of, and a signal on a screen is not an observation.',
      tool: lab({
        view: 'signal',
        preset: 'bbh',
        autoplay: false,
        noiseControls: false,
        hide: ['m1', 'm2', 'distance', 'inclination'],
        presets: false,
      }),
      tip: 'Be careful how far you push the conclusion. A rising chirp is good evidence that whatever produced it was two compact objects spiralling together — but it is not, on its own, a detection of anything, and it does not say what the objects are. Two black holes, two neutron stars and one of each all chirp; step 15 shows you what does distinguish them, and step 20 shows you what a detection actually takes.',
    },

    // -----------------------------------------------------------------------
    // 10-13: mass
    // -----------------------------------------------------------------------
    {
      sid: 'predict-heavier',
      stage: BBH,
      type: 'predict',
      title: 'What would heavier objects do?',
      body: `You are about to be handed the mass controls. Commit first.
             \n\nA detector is only sensitive over a band of frequencies -
             roughly 20 Hz to a few hundred hertz for the ones on the ground.
             Below that the ground itself is shaking too much; above it there is
             not enough signal.
             \n\nSuppose you make both objects heavier, keeping their ratio the
             same. Think about how long the signal stays inside that band.`,
      prompt:
        'A heavier pair, at the same mass ratio, will spend… inside the detector band',
      options: [
        'longer, because there is more mass to radiate',
        'the same time, because the band is what it is',
        'less time',
        'longer, and reach a higher frequency at the end',
      ],
      answer: 2,
      because:
        'Less time, and this one is worth remembering because it is counter-intuitive twice over. A heavier binary radiates more strongly, so it sweeps through any given range of frequencies faster - and it also stops sooner, because the frequency at which two objects run out of stable orbits is lower for a heavier pair. Both effects push the same way. The very heaviest pairs we detect are in band for a fraction of a second; the lightest are in band for minutes.',
      tool: lab({
        view: 'signal',
        preset: 'bbh',
        autoplay: false,
        noiseControls: false,
        hide: ['distance', 'inclination'],
        presets: false,
      }),
    },
    {
      sid: 'change-one-thing',
      stage: BBH,
      type: 'explore',
      title: 'Change one thing',
      body: `A comparison is only worth anything if one thing changed. The panel
             will help you: pin the current settings as <strong>A</strong>, then
             change something, and the readout tells you what is different -
             and says so plainly if more than one thing is.
             \n\nKeep the distance and the viewing angle where they are. Change
             both masses together, in the same proportion, so the mass ratio
             stays at roughly 1.24 to 1.`,
      checklist: [
        'Note the current masses: 36 and 29 solar masses',
        'Press Pin as A',
        'Set the first mass to 18 and the second to 14.4 — half of each',
        'Read the line marked "Against A": it should say one thing changed, or two if you moved both masses',
        'Compare the orange trace (A) with the blue one on the strain plot',
        'Read "Modelled" and "Where it stops" for the lighter pair',
        'Now try 60 and 48 and read the same two lines again',
      ],
      tool: lab({
        view: 'signal',
        preset: 'bbh',
        compare: true,
        autoplay: false,
        noiseControls: false,
        hide: ['distance', 'inclination'],
        presets: false,
        note: 'Pin a configuration as A, then change one thing. The readout says which things changed and which were held.',
      }),
      tip: 'Moving two masses is two changes, and the readout will say so. That is the honest answer: what you are holding fixed is their ratio, not the individual masses, and the comparison is between two systems that differ in total mass.',
    },
    {
      sid: 'measure-time-in-band',
      stage: BBH,
      type: 'measure',
      title: 'Time in band, three ways',
      body: `Record the same two numbers for three total masses at the same
             ratio. Use the readout lines <strong>Modelled</strong> and
             <strong>Where it stops</strong>.
             \n\nFor each pair, set the masses, then read how long the whole
             inspiral from 20 Hz lasts and the frequency at which the model
             ends.`,
      fields: [
        {
          id: 't_light',
          label: '18 + 14.4 M☉: whole inspiral from 20 Hz',
          unit: 's',
        },
        { id: 'f_light', label: '18 + 14.4 M☉: where it stops', unit: 'Hz' },
        {
          id: 't_mid',
          label: '36 + 29 M☉: whole inspiral from 20 Hz',
          unit: 's',
        },
        { id: 'f_mid', label: '36 + 29 M☉: where it stops', unit: 'Hz' },
        {
          id: 't_heavy',
          label: '60 + 48 M☉: whole inspiral from 20 Hz',
          unit: 's',
        },
        { id: 'f_heavy', label: '60 + 48 M☉: where it stops', unit: 'Hz' },
      ],
      validate: v => {
        const all = [
          v.t_light,
          v.f_light,
          v.t_mid,
          v.f_mid,
          v.t_heavy,
          v.f_heavy,
        ];
        if (!all.every(Number.isFinite))
          return { level: 'warn', message: 'Fill in all six readings.' };
        if (!(v.t_light > v.t_mid && v.t_mid > v.t_heavy)) {
          return {
            level: 'warn',
            message:
              'The lighter pair should stay in band longest. Check that each time goes with its own pair of masses.',
          };
        }
        if (!(v.f_light > v.f_mid && v.f_mid > v.f_heavy)) {
          return {
            level: 'warn',
            message:
              'The lighter pair should reach the highest frequency before the model stops. Check the pairing again.',
          };
        }
        return null;
      },
      tool: lab({
        view: 'signal',
        preset: 'bbh',
        compare: true,
        autoplay: false,
        noiseControls: false,
        hide: ['distance', 'inclination'],
        presets: false,
      }),
      tip: 'Both columns run the same way: lighter means longer and higher. A pair of neutron stars, at about a fiftieth of these masses, is in band for over two minutes and gets past a kilohertz.',
    },
    {
      sid: 'the-one-mass-that-matters',
      stage: BBH,
      type: 'measure',
      title: 'Two different binaries, one signal',
      body: `Something strange, and it is the most useful fact in the subject.
             \n\nSet the masses to <strong>36 and 29</strong> and press
             <strong>Pin as A</strong>. Read the chirp mass from the top of the
             readout.
             \n\nNow set them to <strong>50 and 19.4</strong>. Those are very
             different objects - one nearly three times the other - and the
             total mass is not even the same. Read the chirp mass again, and
             then look at the two traces on the strain plot.`,
      fields: [
        { id: 'mc_a', label: 'Chirp mass of 36 + 29', unit: 'M☉' },
        { id: 'mc_b', label: 'Chirp mass of 50 + 19.4', unit: 'M☉' },
        {
          id: 'total_a',
          label: 'Total mass of 36 + 29',
          unit: 'M☉',
          compute: () => 65,
          decimals: 1,
        },
        {
          id: 'total_b',
          label: 'Total mass of 50 + 19.4',
          unit: 'M☉',
          compute: () => 69.4,
          decimals: 1,
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.mc_a) || !Number.isFinite(v.mc_b)) {
          return {
            level: 'warn',
            message:
              'Read the chirp mass for both pairs from the top line of the readout.',
          };
        }
        if (Math.abs(v.mc_a - v.mc_b) > 1.2) {
          return {
            level: 'warn',
            message: `You have ${v.mc_a.toFixed(1)} and ${v.mc_b.toFixed(1)}. Those should come out close to each other — check the masses you entered.`,
          };
        }
        return null;
      },
      tool: lab({
        view: 'signal',
        preset: 'bbh',
        compare: true,
        autoplay: false,
        noiseControls: false,
        hide: ['distance', 'inclination'],
        presets: false,
      }),
      tip: 'The combination that governs the inspiral is not the total mass and not either mass on its own. It is the chirp mass, and two binaries that share one produce almost the same signal - which is why the chirp mass is the first thing a detection reports and the individual masses are much harder to pin down.',
    },

    // -----------------------------------------------------------------------
    // 14-16: distance and inclination
    // -----------------------------------------------------------------------
    {
      sid: 'predict-twice-as-far',
      stage: BBH,
      type: 'predict',
      title: 'Twice as far away',
      body: `Put the masses back to 36 and 29, and think about distance before
             you change it.`,
      prompt: 'Moving the same binary twice as far away will…',
      options: [
        'halve the strain and leave the frequencies alone',
        'quarter the strain and leave the frequencies alone',
        'halve the strain and halve the frequencies too',
        'leave the strain alone: gravity has infinite range',
      ],
      answer: 0,
      because:
        'Halve the strain, and leave the frequencies completely alone. Strain falls as one over distance, not one over distance squared - this is an amplitude, like the height of a water wave, not an intensity like brightness. And the frequency is a property of the source: how fast the two objects are going round has nothing to do with who is watching. That separation between what distance changes and what it does not is what the next step is for.',
      tool: lab({
        view: 'signal',
        preset: 'bbh',
        autoplay: false,
        noiseControls: false,
        hide: ['m1', 'm2', 'inclination'],
        presets: false,
      }),
    },
    {
      sid: 'test-distance',
      stage: BBH,
      type: 'measure',
      title: 'Test it, on one scale',
      body: `This comparison only works if nothing else moves, so the panel has
             pinned the vertical scale of the strain plot: both traces are drawn
             against the same axis, and a quieter signal genuinely looks
             quieter. If you use the sound, it is scaled against one fixed
             reference that does not move when you change the distance, so a
             more distant source really is quieter.
             \n\nRead <strong>Strain amplitude</strong>, not "Strain now". The
             amplitude is the height of the oscillation — always positive, and
             what "peak" means. "Strain now" is where the wave happens to be
             inside that oscillation at this instant, and it passes through
             zero twice a cycle, so it is the wrong number to write down.
             \n\nSet the distance to 400 Mpc and read the amplitude at the end
             of the signal. Then 800. Then 1600. Read the frequency at the end
             each time as well.`,
      fields: [
        { id: 'h_400', label: 'Strain amplitude at 400 Mpc', unit: '' },
        { id: 'h_800', label: 'Strain amplitude at 800 Mpc', unit: '' },
        { id: 'h_1600', label: 'Strain amplitude at 1600 Mpc', unit: '' },
        {
          id: 'ratio_1',
          label: '400 Mpc amplitude ÷ 800 Mpc amplitude',
          unit: '',
          compute: v => v.h_400 / v.h_800,
          decimals: 2,
        },
        { id: 'f_end_400', label: 'Where it stops, at 400 Mpc', unit: 'Hz' },
        { id: 'f_end_1600', label: 'Where it stops, at 1600 Mpc', unit: 'Hz' },
      ],
      validate: v => {
        if (![v.h_400, v.h_800, v.h_1600].every(Number.isFinite)) {
          return {
            level: 'warn',
            message:
              'Read the amplitude at all three distances. The readout gives it on the line marked "Strain amplitude" - not "Strain now", which is the instantaneous signed value and passes through zero twice a cycle.',
          };
        }
        if ([v.h_400, v.h_800, v.h_1600].some(x => x <= 0)) {
          return {
            level: 'error',
            message:
              'An amplitude cannot be zero or negative. That is the signature of having read "Strain now", which is the signed value at one instant: use the "Strain amplitude" line instead.',
          };
        }
        const r = v.h_400 / v.h_800;
        if (!(r > 1.6 && r < 2.4)) {
          return {
            level: 'warn',
            message: `Your ratio is ${r.toFixed(2)}. Doubling the distance should halve the strain, so this should come out near 2.`,
          };
        }
        if (!Number.isFinite(v.f_end_400) || !Number.isFinite(v.f_end_1600)) {
          return {
            level: 'warn',
            message: 'Record where the model stops at each distance too.',
          };
        }
        if (Math.abs(v.f_end_400 - v.f_end_1600) > 1) {
          return {
            level: 'warn',
            message:
              'Those two should be the same number. The frequency at which the model stops depends on the masses, not on how far away you are.',
          };
        }
        return null;
      },
      tool: lab({
        view: 'signal',
        preset: 'bbh',
        compare: true,
        capture: true,
        autoplay: false,
        noiseControls: false,
        fixedPeak: 1.4e-21,
        // One reference for the audio too, pinned for the same reason the
        // plot's axis is: a comparison in which the reference moves with the
        // thing being compared is not a comparison.
        referenceStrain: 1.4e-21,
        hide: ['m1', 'm2', 'inclination'],
        presets: false,
        note: 'The vertical scale is pinned for this step, and so is the loudness reference, so the three distances can be compared on one axis and by ear.',
      }),
      tip: 'Save one of these to the notebook. The entry records the distance, the fixed scale and the model’s limits along with the number, which is what makes it evidence rather than a number you wrote down.',
    },
    {
      sid: 'edge-on',
      stage: BBH,
      type: 'measure',
      title: 'Which way is it facing?',
      body: `Put the distance back to 400 Mpc and turn your attention to the
             viewing angle.
             \n\nA binary seen face-on - looking straight down the axis it spins
             about - produces the strongest signal. Seen edge-on, from in the
             plane of the orbit, it produces the weakest. Measure how much
             weakest is.
             \n\nThen read the line marked <strong>Distance</strong>. It gives
             two numbers: where the source actually is, and where a single
             detector would think it was from the amplitude alone.`,
      fields: [
        { id: 'h_face', label: 'Peak strain at 0° (face-on)', unit: '' },
        { id: 'h_edge', label: 'Peak strain at 90° (edge-on)', unit: '' },
        {
          id: 'weaker',
          label: 'How much weaker edge-on is',
          unit: '×',
          compute: v => v.h_face / v.h_edge,
          decimals: 2,
        },
        {
          id: 'eff_edge',
          label: 'Effective distance at 90°, from the readout',
          unit: 'Mpc',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.h_face) || !Number.isFinite(v.h_edge)) {
          return {
            level: 'warn',
            message: 'Read the peak strain at both angles.',
          };
        }
        const r = v.h_face / v.h_edge;
        if (!(r > 1.6 && r < 2.4)) {
          return {
            level: 'warn',
            message: `Your ratio is ${r.toFixed(2)}. Edge-on should be about half as strong.`,
          };
        }
        if (!Number.isFinite(v.eff_edge)) {
          return {
            level: 'warn',
            message:
              'The Distance line in the readout gives the effective distance. Read it at 90°.',
          };
        }
        if (Math.abs(v.eff_edge - 800) > 90) {
          return {
            level: 'warn',
            message: `The readout should give about 800 Mpc at 90° with the source at 400. You have ${v.eff_edge.toFixed(0)}.`,
          };
        }
        return null;
      },
      tool: lab({
        view: 'signal',
        preset: 'bbh',
        autoplay: false,
        noiseControls: false,
        fixedPeak: 1.4e-21,
        hide: ['m1', 'm2'],
        presets: false,
      }),
      tip: 'A face-on binary at 800 Mpc and an edge-on one at 400 Mpc produce exactly the same signal in one detector. Nothing in a single trace can tell them apart, which is why distances from gravitational waves come with large error bars and why several detectors are better than one.',
    },

    // -----------------------------------------------------------------------
    // 17-18: three kinds of source, and the limits
    // -----------------------------------------------------------------------
    {
      sid: 'three-sources',
      stage: BBH,
      type: 'explore',
      title: 'Three kinds of pair',
      body: `The panel has three presets. They differ in their masses and in
             nothing else: there is no setting anywhere in this model that adds
             a neutron-star feature, because the model has no such feature to
             add. Everything different about the three signals comes out of the
             arithmetic.
             \n\nEach preset models a window ending where its own model ends, and
             the readout says how long the whole inspiral from 20 Hz would be.`,
      checklist: [
        'Press "Two black holes" and read Modelled, Where it stops, and Chirp mass',
        'Press "Two neutron stars" and read the same three lines',
        'Press "Neutron star and black hole" and read them again',
        'Notice that one of the three says it modelled only the last part, and why',
        'Look at the frequency plot for each: the same shape over very different ranges',
        'If you have sound: listen to all three and read the mapping line each time',
      ],
      tool: lab({
        view: 'signal',
        autoplay: false,
        noiseControls: false,
      }),
      tip: 'The neutron-star pair is in band for over two minutes and reaches more than a kilohertz. The lab models the last eight seconds of it and says so, rather than making you wait.',
    },
    {
      sid: 'where-the-model-stops',
      stage: BBH,
      type: 'question',
      title: 'Where this stops working',
      kind: 'choice',
      body: `Look at the readout for the black-hole preset again, at two lines
             in particular.
             \n\n<strong>Where it stops</strong> says 67.6 Hz. Read that as a
             boundary drawn on the model, not as an event: it is the innermost
             stable circular orbit for that combined mass, which is where the
             assumption this whole waveform rests on - two bodies on a slowly
             shrinking circular orbit - stops being true. The plot ends there
             because the model is switched off there. Nothing after that point
             has been calculated: there is no merger in these plots, no
             ringdown, and the last cycle you can see is not the last cycle the
             binary had.
             \n\nThe same goes for the line that says how long until merger. It
             is this model's own estimate of when the separation would reach
             zero if the same approximation kept holding, which it does not. It
             is a countdown printed by the model, not an event it computed.
             \n\n<strong>Orbital speed</strong> says something like v/c = 0.27
             even at the beginning of the band. That number is how fast the
             objects are moving as a fraction of the speed of light, and the
             approximations this model is built on get worse as the square of
             it.
             \n\nGW150914, the real event, was seen from about 35 Hz up to
             around 250 Hz.`,
      prompt: 'Given those two facts, this model of a heavy black-hole binary…',
      options: [
        'describes the whole of what the detectors saw',
        'describes the early part reasonably and stops well before the loudest part',
        'is wrong, and should not be used',
        'is accurate right up to the moment of merger',
      ],
      answer: 1,
      because:
        'It describes the early part and stops well before the end. This is not a flaw that could be fixed by trying harder with the same equations: two black holes about to merge are moving at a third of the speed of light in each other’s strongly curved spacetime, and getting that right took the numerical relativity community about forty years. What this lab does instead of extrapolating is hand over: the merger you will see in step 22 is the collaboration’s own numerical-relativity waveform, not this model pushed past its boundary. A model that says where it stops is more useful than one that does not.',
      tool: lab({
        view: 'signal',
        preset: 'bbh',
        autoplay: false,
        noiseControls: false,
        hide: ['m1', 'm2', 'distance', 'inclination'],
        presets: false,
      }),
    },

    // -----------------------------------------------------------------------
    // 19-20: noise, and what similarity is not
    // -----------------------------------------------------------------------
    {
      sid: 'add-the-noise',
      stage: BBH,
      type: 'explore',
      title: 'Now put it in a detector',
      body: `Everything so far has been a clean signal. A real detector does not
             produce clean signals; it produces a continuous wobble from
             seismic motion, thermal vibration and the quantum behaviour of the
             light in it, and any signal arrives on top of that.
             \n\nPress <strong>Detector noise</strong>. The grey trace is
             simulated noise with the spectrum Advanced LIGO was designed to
             have. It is drawn from a fixed seed and it does <em>not</em> change
             when you change a parameter - if it did, every comparison you made
             would be comparing two things at once.`,
      checklist: [
        'Press Detector noise and look at the upper plot',
        'Look at the close-up plot below it, where individual cycles are resolved',
        'Move the distance out to 1200 Mpc and look again',
        'Move it further, to 2000 Mpc, and try to find the signal by eye',
        'Press New noise to draw a different realization, and see that the picture changes but the signal does not',
        'Put the distance back to 410 Mpc',
      ],
      tool: lab({
        view: 'signal',
        preset: 'bbh',
        noise: true,
        autoplay: false,
        hide: ['m1', 'm2', 'inclination'],
        presets: false,
      }),
      tip: 'This is a design curve, not the noise LIGO actually had in September 2015. Real detector noise also contains glitches, instrument lines and stretches where something in the building was being unhelpful.',
    },
    {
      sid: 'looks-like-is-not-enough',
      stage: BBH,
      type: 'measure',
      title: 'It looks like it. Is that enough?',
      body: `The panel can now compare two signals for you and give a number.
             \n\nPin the current signal as <strong>A</strong>. That is your
             template: a clean model of what you think is there. The similarity
             it reports is a normalised overlap between the template and what
             the detector is showing - a number from 0 to 1, and the same inner
             product a real search is built on.
             \n\nMeasure it three times: with the right template, with a
             template of the wrong chirp mass, and with the signal so far away
             it is buried.`,
      fields: [
        {
          id: 's_right',
          label: 'Similarity with the correct masses',
          unit: '',
        },
        {
          id: 's_wrong',
          label: 'Similarity with 20 + 16 M☉ instead',
          unit: '',
        },
        {
          id: 's_far',
          label: 'Similarity with the correct masses at 2000 Mpc',
          unit: '',
        },
      ],
      validate: v => {
        if (![v.s_right, v.s_wrong, v.s_far].every(Number.isFinite)) {
          return { level: 'warn', message: 'Record all three similarities.' };
        }
        if (v.s_right < 0.5) {
          return {
            level: 'warn',
            message:
              'The matching template should score high. Check that you pinned A with the same masses you are now showing.',
          };
        }
        if (v.s_wrong >= v.s_right) {
          return {
            level: 'warn',
            message:
              'The wrong-mass template should score lower than the right one. Check which is pinned.',
          };
        }
        return null;
      },
      tool: lab({
        view: 'signal',
        preset: 'bbh',
        noise: true,
        compare: true,
        similarity: true,
        capture: true,
        autoplay: false,
        hide: ['inclination'],
        presets: false,
      }),
      tip: 'Notice how high the wrong template still scores, and how well the right one scores even when the signal is buried. A number near one is easy to get. Turning it into "we have detected something" needs a bank of hundreds of thousands of templates, an estimate of how often noise alone produces a score that high, and a count of how many times you looked - none of which is here, which is why this number is called similarity and nothing else.',
    },

    // -----------------------------------------------------------------------
    // 21-22: the real thing
    // -----------------------------------------------------------------------
    {
      sid: 'what-they-actually-recorded',
      type: 'explore',
      title: 'What two detectors actually recorded',
      body: `On 14 September 2015 at 09:50:45 UTC, two instruments three
             thousand kilometres apart both moved.
             \n\nWhat is in the panel now is not a model. It is the data the
             LIGO and Virgo collaborations published with the discovery paper,
             reproduced here and not reprocessed. The only thing done to it
             before publication was a band-pass filter between 35 and 350 Hz and
             notches at the frequencies where the instruments have known lines,
             which is why it looks like a signal rather than like a wall of
             seismic noise.
             \n\nThe two traces do not look alike. Two things are in the way, and
             both are physical. Find them: use the shift control to slide
             Livingston in time, and the sign control to flip it over.`,
      checklist: [
        'Look at the two traces as published: the same event, and they do not match',
        'Drag the shift control and watch the lower trace slide',
        'Find the shift where the big excursions line up',
        'Now flip the sign and look again',
        'Read the line marked "Best match" and compare it with what you found',
        'Press "As published" to put it back, then "Shifted and inverted"',
      ],
      tool: real({ mode: 'detectors', window: [0.29, 0.45] }),
      tip: 'The shift is a light-travel time: the wave crossed the Earth, reaching Livingston about seven milliseconds before Hanford. The sign flip is geometry - the two detectors’ arms are turned relative to each other, so a stretch along one detector’s arm is a squeeze along the other’s. Neither was applied to the stored data; the panel applies what you ask for and records it.',
    },
    {
      sid: 'model-against-measurement',
      type: 'explore',
      title: 'The measurement, the model, and what is left',
      body: `Three traces of the same fifteen hundredths of a second.
             \n\nThe top one is what Hanford measured. The middle one is the
             collaboration's own waveform - a numerical-relativity calculation,
             not this lab's model and not an approximation of it; it is the one
             that covers the merger and the ringing afterwards, which is
             precisely the part your model refused to guess at.
             \n\nThe bottom one is the first minus the second. If the
             reconstruction accounted for what happened, what is left should be
             just the detector: as loud before the signal arrives as after it,
             with no shape to it.`,
      checklist: [
        'Compare the top two traces: where they agree, and where they do not',
        'Find the last few cycles, where the amplitude peaks and then dies away quickly',
        'Look at the bottom trace before the signal arrives, and after it',
        'Confirm that the residual does not get louder when the signal does',
        'Read the "What is left" line in the readout',
      ],
      tool: real({ mode: 'reconstruction', window: [0.29, 0.45] }),
      tip: 'The rapid die-away at the end is the ringdown: a single newly formed black hole settling into shape. Nothing in this lesson’s own model produces it, and nothing in this lesson pretended to.',
    },

    // -----------------------------------------------------------------------
    // 23-24: your own experiment, and the conclusion
    // -----------------------------------------------------------------------
    {
      sid: 'your-own-experiment',
      stage: BBH,
      type: 'explore',
      title: 'Make it harder to see',
      body: `Your turn. Design a comparison and run it.
             \n\nThe question: <strong>what makes a signal harder to pick out of
             the noise?</strong> You have four things you can change - two
             masses, a distance and a viewing angle - and a similarity number
             that says how well a clean template matches what the detector
             sees.
             \n\nThe rules are the ones you have been using. Change one thing.
             Keep the noise seed fixed unless you deliberately want a different
             realization. Record what you changed and what happened, and save at
             least one reading to the notebook: the entry carries the settings
             and the model's limitations with it, which is what makes it
             evidence you can quote later.`,
      checklist: [
        'Decide which single variable you are going to change, and write it down before you start',
        'Set up the "before" case and press Pin as A',
        'Read the similarity, and check the readout says only one thing changed',
        'Change your variable and read the similarity again',
        'Press Save to notebook on the case you think makes the point',
        'Try a second variable and see whether it does the same thing',
        'Find one change that makes the signal easier to see, as well as one that makes it harder',
      ],
      tool: lab({
        view: 'signal',
        preset: 'bbh',
        noise: true,
        compare: true,
        similarity: true,
        capture: true,
        autoplay: false,
      }),
      tip: 'Distance and viewing angle both change the amplitude and nothing else. Mass changes the shape of the signal as well as its strength, so a mass change is two effects at once - worth noticing, and worth saying in your write-up rather than glossing over.',
    },
    {
      sid: 'what-the-signal-tells-you',
      stage: BBH,
      type: 'question',
      title: 'What the signal tells you, and what it does not',
      kind: 'short',
      body: `Back to where you started. In step 1 you were shown a pattern with
             no label and asked what could have made it. You now know a great
             deal more than you did.
             \n\nHere is a new one to think about while you write: a signal
             arrives that stays in a detector's band for ninety seconds and
             climbs past a kilohertz before it disappears. From what you have
             measured, you can already say something about what kind of pair
             that was, and there are things you cannot say however carefully you
             look.
             \n\nWhen you have written your answer, open the notebook and export
             it with the readings you saved. A claim travels with its
             evidence.`,
      prompt:
        'Write a short account of what a chirp signal reveals about its source and what it leaves undetermined. Mention at least one thing you measured, and at least one thing this model cannot tell you. Say whether your prediction in step 1 still stands.',
      rubric:
        'Look for three things. First, at least one measured relationship stated correctly - the wave frequency being twice the orbital frequency, the chirp mass rather than the individual masses governing the inspiral, strain going as one over distance, or lighter pairs staying in band longer. Second, a real limitation, correctly reasoned: the distance-inclination degeneracy (amplitude alone cannot separate a distant face-on source from a nearby edge-on one), the model stopping before the merger, or the chirp mass not determining the two masses separately. Third, an honest revisit of step 1 rather than a claim to have known all along. A student who says the ninety-second signal was a low-mass pair - neutron stars, or something like them - has used the lesson correctly; a student who says it was definitely neutron stars has over-claimed, since the signal constrains the chirp mass and not the composition, and that distinction is worth pointing out in feedback rather than penalising heavily. Do NOT credit "louder means closer" stated without the inclination caveat, or any claim that hearing the sound identifies the source.',
      tool: lab({
        view: 'signal',
        preset: 'bns',
        autoplay: false,
        noiseControls: false,
        capture: true,
        hide: ['m1', 'm2', 'distance', 'inclination'],
        presets: false,
        note: 'The new signal, for the question opposite. Two objects of 1.4 solar masses each, which is where the ninety seconds and the kilohertz come from.',
      }),
      tip: 'Nothing in a gravitational wave says what the objects were made of. It says how heavy they were, how they moved, and how far away they were - and the reason we believe GW170817 was a pair of neutron stars is that a gamma-ray burst went off in the same place two seconds later and a telescope found the galaxy.',
    },
  ],
};

export default LISTENING_TO_SPACETIME;
