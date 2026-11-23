// =============================================================================
// Orbital energy
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

// --- 3. Orbital energy --------------------------------------------------------

// Held still for the opening. The work of the first half is all in the panel,
// and a simulation moving behind it is only something else to look at.
/**
 * The bodies each scene of this lesson is about, bound by exact name.
 *
 * The prose says "click the orange one", which is fine until somebody clicks
 * the white one and has nothing on screen to correct them with. A binding puts
 * both orbiters and the star in the panel's object list, which is also the only
 * keyboard route to a selection.
 */
const ENERGY_BODIES = {
  star: { name: 'Kepler Star' },
  circular: { name: 'Circular Orbiter' },
  eccentric: { name: 'Eccentric Orbiter' },
};

/** The visitor scene: two bound bodies and one that is not. */
const VISITOR_BODIES = {
  sun: { name: 'Sun' },
  earth: { name: 'Earth' },
  visitor: { name: "1I/'Oumuamua" },
};

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
    // The two turning points, from the orbit the engine is actually on rather
    // than from the shape it was set up with. A student stopping at periapsis
    // can check the distance against this.
    ...(el && el.bound
      ? [
          { label: 'Closest it gets', value: ctx.distance(el.a * (1 - el.e)) },
          { label: 'Furthest it gets', value: ctx.distance(el.a * (1 + el.e)) },
        ]
      : []),
    ...driftRows(ctx),
  ];
};

/**
 * How much the whole world's energy has moved since it was built.
 *
 * The distinction this lesson turns on. A total that changes because something
 * fired an engine is physics; a total that changes because the integrator is
 * approximating is not, and a lesson that shows a wobbling line without saying
 * which it is teaches that energy is only roughly conserved.
 *
 * Shown as a percentage of the world's own energy, so the number means the
 * same thing whatever the scenario. Anything under about a tenth of a percent
 * over a few orbits is the arithmetic, not the physics.
 */
const driftRows = ctx => {
  const c = ctx.conservation();
  if (!c || !Number.isFinite(c.energyDrift)) return [];
  const size = Math.abs(c.energyDrift);
  return [
    {
      label: 'Whole-system energy, since this world was built',
      value:
        size < 0.001
          ? 'unchanged to the precision worth quoting'
          : `${c.energyDrift > 0 ? '+' : ''}${c.energyDrift.toFixed(3)}% — numerical drift, not physics`,
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
  audience: 'intro',
  textbook: { chapter: 3, section: '3.5' },
  courseLevel: 'survey',
  mathematics: 'arithmetic',
  prerequisites: ['keplers-laws'],
  // Subject tags, for the browser's filters. A fixed vocabulary
  // shared across the catalog rather than free text, so a filter can offer
  // the whole set without a second list to keep in step.
  tags: ['orbits', 'gravity'],
  // The equal-area wedges belong to the lesson this scenario was built for,
  // not to this one.
  lock: { placement: true, inspector: true, areaSweep: false },
  retired: {
    'write-down-the-dividing-speed': {
      to: 'bracket-the-dividing-speed',
      release: '3.1',
      was: {
        en: 'Write down the highest speed that still came back and the lowest that left, from an instrument that opened at the dividing speed.',
        es: 'Anotar la velocidad más alta que aún volvía y la más baja que se fue, con un instrumento que se abría en la velocidad divisoria.',
      },
    },
    'where-is-the-line': {
      to: null,
      release: '3.1',
      was: {
        en: 'Choose the dividing speed for a shot from the Earth’s surface from four values, after finding it by hand.',
        es: 'Elegir entre cuatro valores la velocidad divisoria de un disparo desde la superficie terrestre, tras encontrarla a mano.',
      },
    },
  },
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
      sid: 'how-hard-would-you-have',
      bind: ENERGY_BODIES,
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
             which side of it something falls on, is the whole of this investigation.
             \n\nOver the next few steps you will fire Newton's cannon yourself.`,
      tip: 'Nothing needs measuring yet. The panel on the right will appear in a moment with a cannon on it.',
      time: { speed: 5, paused: true },
      setup: ENERGY_LAB,
    },
    {
      sid: 'load-it-lightly',
      bind: ENERGY_BODIES,
      type: 'predict',
      reveal: 'fire-it',
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
      sid: 'fire-it',
      bind: ENERGY_BODIES,
      type: 'explore',
      title: 'Fire it',
      body: `There is the shot. The green path is the cannonball, launched
             sideways from the surface, and it lands a long way round the world.
             \n\nPress <strong>Run</strong> to fire it again, and use the speed
             slider to try a few more. Do not worry about the bars at the bottom
             of the panel yet: you will come back to those.`,
      tool: {
        id: 'launch',
        values: { v: 6 },
        presets: false,
        withhold: ['escape'],
      },
      checklist: [
        'Watch the 6 km/s shot come back down',
        'Try 3 km/s and see how much shorter the flight is',
        'Raise the speed until the ball goes right round without landing',
        'Note roughly the speed at which that first happens',
      ],
      tip: 'Use the speed slider, and read the "Does it come back?" line after each shot. The cannon is 320 km up, which is roughly where the space station flies and safely above the air. That is why rockets tip over and fly sideways rather than straight up: getting high is the easy part, going fast enough sideways is the hard part.',
    },
    {
      sid: 'load-it-heavily',
      bind: ENERGY_BODIES,
      type: 'predict',
      reveal: 'fire-it-again',
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
      sid: 'fire-it-again',
      bind: ENERGY_BODIES,
      type: 'explore',
      title: 'Fire it again',
      body: `The path has changed character. It is not a very big loop, it is
             not a loop at all. The ball goes out and keeps going.
             \n\nNotice that the panel now says the path is <em>open</em>, and
             that the "furthest it gets" line has no answer to give.`,
      tool: {
        id: 'launch',
        values: { v: 14 },
        presets: false,
        withhold: ['escape'],
      },
      checklist: [
        'Watch the 14 km/s shot leave along an open path',
        'Try 16 km/s and confirm it leaves faster and straighter',
        'Go back down to 9 km/s and confirm that one still comes back',
        'Read the "does it come back?" line in each case',
      ],
    },
    {
      sid: 'find-the-dividing-line',
      bind: ENERGY_BODIES,
      type: 'explore',
      title: 'Find the dividing line',
      body: `Somewhere between the 6 km/s shot that came back and the
             14 km/s shot that left, the answer flips from
             <em>yes, it comes back</em> to <em>no, it is gone</em>.
             \n\nMove the slider carefully and find where. It is worth going
             slowly through the last stretch: just below the line, the ball goes
             an absurd distance out and still turns round.`,
      tool: {
        id: 'launch',
        values: { v: 9 },
        presets: false,
        withhold: ['escape'],
      },
      checklist: [
        'Find the lowest speed at which the answer changes to "it leaves for good"',
        'Set the speed just under that and read how far out it gets before turning',
        'Set it just over and confirm the path never closes',
        'Notice that the change is sudden: there is a definite dividing speed',
      ],
      tip: 'Read the "Does it come back?" line and the "Furthest it gets" line after each shot. Two shots on either side of the line look identical for the first stretch of the flight, which is exactly why astronomers want a number rather than a picture.',
    },
    {
      sid: 'bracket-the-dividing-speed',
      bind: ENERGY_BODIES,
      // The lesson's central experiment: the dividing speed as the last speed
      // on each side of it. The instrument opens neutral (`start`), the
      // finding is the student's, and the check never says where the line is
      // until the pair is right.
      requires: ['find-the-dividing-line'],
      type: 'measure',
      title: 'Bracket the dividing speed',
      body: `Pin the dividing speed between two shots you fire yourself: the
             fastest that still comes back, and the slowest that does not.
             \n\nThe speed slider is the only thing to change. The cannon stays
             where it is. Close the gap from both sides, and stop when you judge
             it small enough to trust. Then give the last speed that came back
             and the first speed that left.
             \n\nThe gap between your two speeds is the uncertainty on your
             measurement.`,
      tool: {
        id: 'launch',
        start: { v: 9 },
        presets: false,
        withhold: ['escape'],
      },
      fields: [
        {
          id: 'back',
          label: 'Highest speed that still came back',
          unit: 'km/s',
        },
        { id: 'gone', label: 'Lowest speed that left for good', unit: 'km/s' },
      ],
      validate: v => {
        if (!Number.isFinite(v.back) || !Number.isFinite(v.gone)) {
          return {
            level: 'warn',
            message:
              'Both speeds, in km/s: the fastest shot you saw come back, and the slowest one that did not.',
          };
        }
        if (v.gone <= v.back) {
          return {
            level: 'error',
            message:
              'The speed that left has to be the larger of the two. Check which number went in which box.',
          };
        }
        // The dividing speed from this cannon: the escape speed at 1.05 Earth
        // radii, sqrt(2GM/r) = 10.916 km/s (js/energyWidgets.js; the lesson
        // test pins this to the instrument).
        const line = 10.916;
        if (v.gone <= line) {
          return {
            level: 'error',
            message:
              'Both of those shots still come back, so the line is higher than either. Fire faster than your larger speed and watch the "Does it come back?" line.',
          };
        }
        if (v.back >= line) {
          return {
            level: 'error',
            message:
              'Both of those shots leave for good, so the line is lower than either. Fire slower than your smaller speed and watch the "Does it come back?" line.',
          };
        }
        const gap = v.gone - v.back;
        const mid = (v.back + v.gone) / 2;
        const half = (gap / 2).toFixed(2);
        // The pair brackets the line. A bracket is a measurement whose
        // uncertainty is its width, so a wide one is valid, and says so.
        if (gap > 0.5 + 1e-9) {
          return {
            level: 'warn',
            message: `The line is between your two speeds, but they give an uncertainty of ${half} km/s either way, which is wide. Fire speeds between the two and keep the last that comes back and the first that leaves to close the gap.`,
          };
        }
        return {
          level: 'ok',
          message: `Your dividing speed is ${mid.toFixed(2)} km/s, give or take ${half}. From this height the escape speed is 10.9 km/s, and it sits inside your gap, which is what a measurement with an honest uncertainty looks like.`,
        };
      },
      tip: 'Two numbers and the gap between them is a more honest answer than one number on its own. Nobody finds a threshold exactly; they find the last speed on each side of it.',
    },
    {
      sid: 'what-is-actually-deciding-this',
      bind: ENERGY_BODIES,
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
      sid: 'watch-the-total',
      bind: ENERGY_BODIES,
      type: 'explore',
      title: 'Watch the total',
      body: `The three bars at the bottom of the panel are those energies, with
             a thick line marking <strong>zero</strong>.
             \n\nThe green bar is the energy of motion, above the line. The blue
             bar is the energy of position, below it. The third bar is the total,
             and it is the one to watch.
             \n\nMove the speed slider slowly and watch the total bar move up
             through the line.`,
      tool: { id: 'launch', values: { v: 6 }, presets: false },
      checklist: [
        'At 6 km/s, note that the total bar is below the zero line',
        'At 9 km/s it is still below, but shorter',
        'Find the speed where the total bar disappears into the zero line',
        'Compare that speed with the dividing line you found earlier',
        'Above it, note that the total bar has flipped to the other side',
      ],
      tip: 'Read the "Total energy" row beside the bar, and watch the "Does it come back?" line as you cross the zero line.',
    },
    {
      sid: 'reading-the-sign',
      bind: ENERGY_BODIES,
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
        'traveling faster than escape speed',
      ],
      answer: 0,
      because:
        'Below zero means bound. To get infinitely far away, an object would need a total of at least zero, because that is what the energy of position becomes out there and the energy of motion cannot be negative to make up the difference. Below zero it simply cannot reach, so gravity always wins in the end and turns it round.',
      hints: [
        'Think about what the energy of position becomes infinitely far away.',
        'If the total is less than that, can the object ever get there?',
      ],
      misconceptions: [
        {
          id: 'belowZeroLeaves',
          option: 1,
          say: 'An object that eventually leaves has a total of zero or more. Below zero is the trapped side.',
        },
        {
          id: 'belowZeroFalls',
          option: 2,
          say: 'A planet in a steady orbit has a total below zero and never falls in. The sign says whether it can get away, not whether it will hit.',
        },
        {
          id: 'belowZeroFast',
          option: 3,
          say: 'A speed above the escape speed gives a total above zero, the opposite sign.',
        },
      ],
    },
    {
      sid: 'around-a-real-orbit',
      bind: ENERGY_BODIES,
      type: 'explore',
      title: 'Around a real orbit',
      body: `That was a launch. Now watch a whole orbit.
             \n\nIn the simulation there are two planets going round a star. The
             <strong>orange</strong> one is on a stretched orbit: it swings in
             close and races, then drifts far out and crawls. Click it.
             \n\nThe panel shows its two energies as bars, and plots them over
             time underneath. Watch for a full lap.`,
      time: { speed: 5, paused: false },
      setup: ENERGY_ORBIT,
      tool: { id: 'live-energy' },
      probe: energyProbe,
      allowInspector: true,
      // The two turning points are where the trade is largest and hardest to
      // catch by eye, so the reader can stop the run at one rather than trying
      // to read a bar chart that is moving.
      pauseAt: {
        kind: 'periapsis',
        body: 'Eccentric Orbiter',
        primary: 'Kepler Star',
      },
      checklist: [
        'Select the Eccentric Orbiter, from the canvas or the list below',
        'Watch the green line rise as it swings in close and fast',
        'Watch the blue line fall at the same moment',
        'Confirm the white total line stays flat while the other two move',
        'Arm the event watch and let it stop the run at closest approach',
        'Read the two energies there, then disarm and watch it climb back out',
        'Check that the total stays below the zero line the whole way round',
      ],
      tip: 'This is the trade. Falling inwards converts energy of position into energy of motion, and climbing back out converts it straight back. The last line of the readout is worth watching too: it is how far the whole system’s energy has moved since this world was built, and it is not physics — it is the arithmetic the simulation does between frames. If it stays near zero while the two bars swing wildly, that is the conservation law holding.',
    },
    {
      sid: 'what-stays-put',
      bind: ENERGY_BODIES,
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
      hints: [
        'Watch the energy readout through one whole orbit.',
        'Two of the three trade energy back and forth. What would a trade leave unchanged?',
      ],
      misconceptions: [
        {
          id: 'motionStays',
          option: 0,
          say: 'The energy of motion rose and fell with the speed, and the speed changed by a large factor.',
        },
        {
          id: 'positionStays',
          option: 1,
          say: 'The energy of position moved with the distance, and the distance changed even more.',
        },
        {
          id: 'allChanged',
          option: 3,
          say: 'Look at the white total line against the other two over a whole lap, not only at the other two.',
        },
      ],
    },
    {
      sid: 'escape-speed',
      bind: ENERGY_BODIES,
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
      sid: 'a-common-misunderstanding',
      bind: ENERGY_BODIES,
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
      hints: [
        'Does gravity have a distance beyond which it is zero?',
        'Escape is about whether the slowing ever brings the craft to rest.',
      ],
      misconceptions: [
        {
          id: 'gravityStopsAtEscape',
          option: 0,
          say: 'Gravity has no range limit: it weakens with distance but never reaches zero.',
        },
        {
          id: 'gravityPushesAway',
          option: 2,
          say: 'Gravity only ever pulls toward the mass. Escaping means the pull never wins, not that it reverses.',
        },
      ],
    },
    {
      sid: 'somewhere-else-entirely',
      bind: ENERGY_BODIES,
      type: 'predict',
      reveal: 'more-mass-harder-to-leave',
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
      sid: 'read-the-escape-speeds',
      bind: ENERGY_BODIES,
      type: 'measure',
      title: 'Read the four escape speeds',
      body: `The panel shows the real escape speed of four bodies, for a start
             standing on the surface of each. Set the start distance to
             <strong>1</strong> body radius, and press <strong>Take
             reading</strong> beside each box.
             \n\nYour prediction stays unmarked until the next step.`,
      tool: { id: 'escape-compare', values: { dist: 1 }, presets: false },
      fields: [
        {
          id: 'v_moon',
          label: 'Escape speed from the Moon',
          unit: 'km/s',
          source: { tool: 'moon' },
        },
        {
          id: 'v_earth',
          label: 'Escape speed from Earth',
          unit: 'km/s',
          source: { tool: 'earth' },
        },
        {
          id: 'v_jupiter',
          label: 'Escape speed from Jupiter',
          unit: 'km/s',
          source: { tool: 'jupiter' },
        },
        {
          id: 'v_sun',
          label: 'Escape speed from the Sun',
          unit: 'km/s',
          source: { tool: 'sun' },
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.v_earth)) return null;
        // Earth's escape speed from its surface, sqrt(2GM/R) = 11.19 km/s.
        if (Math.abs(v.v_earth - 11.19) > 0.3) {
          return {
            level: 'warn',
            message:
              'These are for a start further out than the surface. Set the start distance back to 1 body radius and take each reading again.',
          };
        }
        return null;
      },
    },
    {
      sid: 'more-mass-harder-to-leave',
      bind: ENERGY_BODIES,
      type: 'explore',
      evidence: [
        { step: 'read-the-escape-speeds', field: 'v_moon' },
        { step: 'read-the-escape-speeds', field: 'v_earth' },
        { step: 'read-the-escape-speeds', field: 'v_jupiter' },
        { step: 'read-the-escape-speeds', field: 'v_sun' },
      ],
      compare:
        'Mass raises escape speed and radius lowers it, so the biggest mass wins here: the Sun’s is about a thousand times Jupiter’s, and its escape speed about ten times larger.',
      title: 'More mass, harder to leave',
      body: `Here are the four real bodies again, with the speeds you took.
             \n\nThe Sun's bar runs off the end of the chart on purpose. Drawn to
             the same scale as the others it would be ten times longer than the
             panel, which is a fair impression of the situation.`,
      tool: { id: 'escape-compare', values: { dist: 1 } },
      checklist: [
        'Compare Earth with Jupiter and note roughly the factor between them',
        'Note that the Sun is off the scale entirely',
        'Convince yourself the order matches the order of their masses',
      ],
      tip: 'The Moon’s 2.4 km/s is why the Apollo lunar module could be a flimsy foil-covered box with one small engine, while getting the same astronauts off Earth took a 110 meter rocket.',
    },
    {
      sid: 'further-out-easier-to-leave',
      bind: ENERGY_BODIES,
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
      sid: 'starting-further-out',
      bind: ENERGY_BODIES,
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
      hints: [
        'Escape speed depends on where you start, not only on which planet.',
        'Starting higher, how much of the climb out of gravity is left?',
      ],
      misconceptions: [
        {
          id: 'zeroGravityUp',
          option: 3,
          say: 'Gravity is weaker up there, not zero: the space station is still held by Earth’s pull.',
        },
      ],
    },
    {
      sid: 'three-shapes-one-law',
      bind: ENERGY_BODIES,
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
      sid: 'something-that-came-from-outside',
      bind: VISITOR_BODIES,
      type: 'read',
      motion: true,
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
      time: { speed: 0.8, paused: false },
      setup: {
        scenario: 'Interstellar Visitor',
        seed: 'visitor',
        camera: { zoom: 1.1, pan: { x: 0, y: 0 } },
        paused: false,
      },
      tip: 'It was found on its way out, already past the Sun and fading. Nobody has seen it since 2018, and nobody ever will again.',
    },
    {
      sid: 'check-it-yourself',
      bind: VISITOR_BODIES,
      type: 'explore',
      title: 'Check it yourself',
      body: `Do not take anyone's word for it. You have a test now.
             \n\nClick the visitor and read the sign of its total energy. Then
             click Earth and read that one, and compare.`,
      probe: energyProbe,
      allowInspector: true,
      checklist: [
        'Select 1I/ʻOumuamua, from the canvas or the list below',
        'Read the sign of its total energy',
        'Select Earth and read the sign of its total energy',
        'Watch the visitor swing round the Sun and start heading back out',
        'Confirm its path never closes, however long you watch',
      ],
      tip: 'Its path is a hyperbola with an eccentricity of 1.20. Every comet ever recorded before this one had an eccentricity below 1, which is another way of saying every one of them was bound to the Sun.',
    },
    {
      sid: 'will-it-be-back',
      bind: VISITOR_BODIES,
      type: 'question',
      title: 'Will it be back?',
      kind: 'short',
      body: `The visitor has now passed the Sun and is heading out again, still
             slowing down as the Sun pulls on it.`,
      prompt:
        'Will ʻOumuamua eventually slow to a stop, turn round, and come back into orbit around the Sun? Say why or why not, using what you have measured.',
      rubric:
        'No. Its total energy is above zero, so it is unbound: the Sun’s pull keeps slowing it but can never bring it to a halt, and it will still be moving away when it is arbitrarily far off. Credit for noting that its path is open rather than a closed loop, or that its eccentricity is greater than 1. A common wrong answer is that gravity stops acting on it once it is far enough away, which is worth correcting: gravity keeps pulling forever, and the object escapes anyway.',
      rubricCriteria: [
        {
          name: 'Reaches the right answer',
          kind: 'correctness',
          levels: [
            {
              label: 'Full',
              points: 2,
              text: 'No: the total energy is above zero, so the visitor is unbound.',
            },
            {
              label: 'Not yet',
              points: 0,
              text: 'Says it will come back, or gives no answer.',
            },
          ],
        },
        {
          name: 'Uses what was measured',
          kind: 'reasoning',
          levels: [
            {
              label: 'Full',
              points: 1,
              text: 'Cites the measured energy or speed, or that the path is open.',
            },
            {
              label: 'Not yet',
              points: 0,
              text: 'Argues from the Sun’s pull alone.',
            },
          ],
        },
      ],
    },
    {
      sid: 'what-you-worked-out',
      bind: VISITOR_BODIES,
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

export default ENERGY;
