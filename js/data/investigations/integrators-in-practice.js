// =============================================================================
// Integrators in Practice
// Content only, no imports. The student runs the compute page's reviewed
// notebook "integrators-compared" on the Kepler-16 system and types back the
// numbers its capsule holds. tests/computeInvestigations.test.js holds every
// literal here to the notebook's own answer and to the generated runs in
// tests/fixtures/compute/investigation-runs.json (tools/compute-answers.mjs),
// and the 438-step run to the application's own engine.
// `choose-the-second-step` takes a menu choice, so its expected numbers are one
// set per choice (SECOND); a check sees only its own step, so the menu is a
// field of the step and the table lives in this file.
// =============================================================================

/**
 * The drifts (percent) of the 500-step run, and for each second step count the
 * drifts of velocity Verlet and Runge-Kutta 4 and the improvement over the
 * 500-step run (its drift divided by this run's drift).
 */
const FIRST = { verlet: 0.001768, rk4: -6.473e-8 };
const SECOND = {
  250: {
    verlet: 0.007074,
    rk4: -1.856e-6,
    ratioVerlet: 0.2499,
    ratioRk4: 0.03487,
  },
  438: {
    verlet: 0.002304,
    rk4: -1.222e-7,
    ratioVerlet: 0.7673,
    ratioRk4: 0.5295,
  },
  750: { verlet: 0.0007856, rk4: -9.408e-9, ratioVerlet: 2.25, ratioRk4: 6.88 },
  1000: { verlet: 0.0004419, rk4: -2.443e-9, ratioVerlet: 4.0, ratioRk4: 26.5 },
};
/** One field's value for each choice, for the answer key. */
const byChoice = field =>
  Object.fromEntries(Object.entries(SECOND).map(([n, r]) => [n, r[field]]));

const INTEGRATORS_IN_PRACTICE = {
  id: 'integrators-in-practice',
  thumbnail: 'images/scenarios/circumbinary-planet-lab.webp',
  title: 'Integrators in Practice',
  subtitle:
    'Four ways to take a step, compared by the energy each one loses on a real system, in Python on the compute page',
  duration: '30-40 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 3, section: null },
  courseLevel: 'upper',
  mathematics: 'logarithms',
  prerequisites: ['orbital-energy'],
  tags: ['orbits'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Say what the energy drift of a numerical integration is, and why a method that does not conserve energy can still be useful',
    'Run a reviewed Python notebook on a system from the Orbital System Builder and read its four energy drifts',
    'Predict, then measure from two step sizes, how much a smaller step improves a second-order method and a fourth-order one',
    'Compare the notebook’s drift with Gravitas’s own engine at the same step, and say why a symplectic method’s end-of-run drift is a poor number to quote',
  ],
  steps: [
    {
      sid: 'one-system-four-steps',
      type: 'read',
      canvas: 'quiet',
      title: 'One system, four ways to take a step',
      body: `How much energy does each way of taking a step lose on a real system, and what does a smaller step buy back? You will run a reviewed Python notebook on the compute page to find out.
             \n\nAn integrator turns forces into a path by taking small steps. Gravitas
             uses <strong>symplectic Euler</strong> by default and offers
             <strong>velocity Verlet</strong> and <strong>fourth-order
             Runge-Kutta</strong> in the Settings. A fourth method, the plain
             <strong>explicit Euler</strong> that most people write first, is not in
             the application, and the notebook adds it so you can see why.
             \n\nThe measure is the <strong>energy drift</strong>: after the run,
             100 &times; (the total energy now &minus; the total energy at the
             start) over the size of the starting energy, in percent. For a closed system
             the exact answer is zero, so any drift is the method's.
             \n\nThe system is <strong>Kepler-16</strong>, two stars and a planet
             that goes round both, as the Orbital System Builder's template builds
             it. The notebook reads the Builder's saved file, takes a step equal to
             the period of the tightest pair divided by a number you set, and runs
             for three periods of the widest orbit.
             \n\nOpen the compute page at <strong>/compute/</strong> of this site.
             It is online only and downloads about 19 MB of Python the first time,
             when you press the button; nothing is installed. Choose the notebook
             <strong>Four integrators on one system</strong> and keep its example
             input, the Kepler-16 file, and its two settings at 3 periods and 500
             steps. Do not press Run yet.`,
    },
    {
      sid: 'which-loses-most',
      type: 'predict',
      reveal: 'four-drifts',
      title: 'Which loses the most',
      body: `Before you run it: the four methods take the same number of steps,
             about ten thousand, of the same length.`,
      prompt: 'Which method will have the largest energy drift at the end?',
      options: [
        'Explicit Euler, which has no structure that protects the energy',
        'Symplectic Euler, because it is only first order',
        'Velocity Verlet, because it takes the step in two halves',
        'Runge-Kutta 4, because it does the most arithmetic per step',
      ],
      answer: 0,
      because:
        'Explicit Euler pushes every orbit outward a little with each step, in the same direction every time, so the error adds up. The other three are either symplectic, which keeps the error bounded, or of high order, which keeps it tiny.',
    },
    {
      sid: 'four-drifts',
      compute: 'integrators-compared',
      type: 'measure',
      title: 'Run it: the four drifts',
      body: `This is the <strong>baseline run</strong>: every later choice in this
             investigation is compared with it, so keep its settings, 3 periods and 500
             steps. Press <strong>Start the runtime</strong>, wait, then
             <strong>Run the notebook</strong>. Read each method's drift and the number of
             steps it took, and enter them here. The page shows the drifts in percent.`,
      fields: [
        { id: 'euler', label: 'Explicit Euler', unit: '%', want: '49.75' },
        {
          id: 'symplectic',
          label: 'Symplectic Euler',
          unit: '%',
          want: '-0.002317',
        },
        {
          id: 'verlet',
          label: 'Velocity Verlet',
          unit: '%',
          want: '0.001768',
        },
        {
          id: 'rk4',
          label: 'Runge-Kutta 4',
          unit: '%',
          want: '-6.47e-8',
        },
        { id: 'steps', label: 'Steps taken', unit: '', want: '10722' },
      ],
      validate: v => {
        if (
          ![v.euler, v.symplectic, v.verlet, v.rk4, v.steps].every(
            Number.isFinite
          )
        )
          return null;
        const near = (x, want, rel) =>
          Math.abs(x - want) <= rel * Math.abs(want);
        if (
          Math.abs(v.euler - 49.75) <= 0.5 &&
          near(v.symplectic, -0.002317, 0.03) &&
          near(v.verlet, 0.001768, 0.03) &&
          near(v.rk4, -6.47e-8, 0.03) &&
          v.steps === 10722
        ) {
          return {
            level: 'ok',
            message:
              'Explicit Euler has gained energy equal to half the size of the starting energy, which is not a small drift but a different orbit. Symplectic Euler and velocity Verlet are within a few thousandths of a percent, and Runge-Kutta 4 is a hundred thousand times better than either. All four took the same 10,722 steps.',
          };
        }
        if (v.steps !== 10722 && near(v.steps, 10722, 0.1))
          return {
            level: 'warn',
            message:
              'The step count should be 10,722 with 3 periods and 500 steps. If yours is different, check the two settings.',
          };
        return {
          level: 'error',
          message:
            'Check the settings (3 periods, 500 steps) and read the capsule’s numbers in percent: explicit Euler about 50, the others tiny, and the sign of each as the page shows it.',
        };
      },
    },
    {
      sid: 'why-bounded',
      type: 'question',
      kind: 'choice',
      title: 'Why one stays small',
      body: `Open the notebook’s table or its plot. The drift of symplectic Euler and of
             velocity Verlet does not grow; it swings up and down about zero. Explicit
             Euler’s grows without stopping.`,
      prompt: 'Why does the symplectic scheme’s energy error stay bounded?',
      options: [
        'It conserves a slightly different energy exactly, so the real energy only oscillates about it',
        'Its step is smaller than the other methods’',
        'It is more accurate to the fourth power of the step',
        'It happens to be tuned to Kepler orbits',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'smaller-step',
          option: 1,
          say: 'All four took the same step. The difference is in the method, not the step.',
        },
        {
          id: 'fourth-power',
          option: 2,
          say: 'That is Runge-Kutta 4, which has no such structure: its drift is tiny but it does grow, very slowly.',
        },
      ],
      hints: [
        'A symplectic map has a conserved quantity of its own, close to the energy.',
      ],
      because:
        'A symplectic integrator is the exact flow of a nearby Hamiltonian, so it conserves that nearby energy for ever, and the true energy only wanders by the small difference between the two. That is why it is the default for orbits that must run for millions of steps.',
    },
    {
      sid: 'predict-the-halving',
      type: 'predict',
      reveal: 'the-engine',
      title: 'Predict the halving',
      body: `Your next run changes the step count. Before you choose it, think about
             the clearest case: the step made half as long, 1000 steps per period
             instead of 500, still over 3 periods. Velocity Verlet is a second-order
             method and Runge-Kutta 4 a fourth-order one.`,
      prompt:
        'How much smaller will the drift of each of these two methods be after the step is halved?',
      options: [
        'Both about half as large: the step is half as long',
        'Velocity Verlet about four times smaller, and Runge-Kutta 4 smaller by a much larger factor, tens of times',
        'Velocity Verlet and Runge-Kutta 4 both about four times smaller',
        'Neither changes: the size of the drift is set by the method, not by the step',
      ],
      answer: 1,
      because:
        'A method of order p has an error that scales as the step to the power p, so halving the step divides the error by two to the power p: four for a second-order method, and sixteen for a fourth-order one once the step is small enough that the leading term is all there is. At these steps the fourth-order method gains more than that.',
    },
    {
      sid: 'choose-the-second-step',
      canvas: 'scene',
      setup: {
        scenario: 'Circumbinary Planet Lab',
        seed: 'binary',
        paused: true,
      },
      compute: 'integrators-compared',
      type: 'measure',
      title: 'Choose the second step',
      body: `Choose a second step count from the menu: <strong>250</strong>,
             <strong>438</strong>, <strong>750</strong> or <strong>1000</strong> steps per
             period. On the compute page set <strong>steps</strong> to your choice, keep the
             periods at 3, and run again; a run takes longer the more steps it has. 1000 is
             the halved step you just predicted, and 438 is the step the application takes
             itself.
             \n\nEnter your choice, the drifts that run gave for velocity Verlet and
             Runge-Kutta 4, and for each method the 500-step drift of the baseline run
             divided by this run's drift, as a positive ratio. A ratio above one means the
             smaller step helped; below one, it hurt.`,
      fields: [
        {
          id: 'second',
          label: 'Steps per period of your second run',
          unit: '',
          options: [250, 438, 750, 1000],
          want: '1000',
        },
        {
          id: 'verlet',
          label: 'Velocity Verlet, your second run',
          unit: '%',
          want: String(SECOND[1000].verlet),
          by: byChoice('verlet'),
        },
        {
          id: 'rk4',
          label: 'Runge-Kutta 4, your second run',
          unit: '%',
          want: String(SECOND[1000].rk4),
          by: byChoice('rk4'),
        },
        {
          id: 'ratioVerlet',
          label: 'Velocity Verlet: 500-step drift over this drift',
          unit: '',
          want: String(SECOND[1000].ratioVerlet),
          by: byChoice('ratioVerlet'),
        },
        {
          id: 'ratioRk4',
          label: 'Runge-Kutta 4: 500-step drift over this drift',
          unit: '',
          want: String(SECOND[1000].ratioRk4),
          by: byChoice('ratioRk4'),
        },
      ],
      validate: v => {
        const typed = [v.verlet, v.rk4, v.ratioVerlet, v.ratioRk4];
        if (!Number.isFinite(v.second)) {
          return typed.some(Number.isFinite)
            ? {
                level: 'warn',
                message:
                  'Choose the step count you ran from the menu first: what is right depends on it.',
              }
            : null;
        }
        if (!typed.every(Number.isFinite)) return null;
        const near = (x, want, rel) =>
          Math.abs(x - want) <= rel * Math.abs(want);
        const drifts = (x, row) =>
          near(x.verlet, row.verlet, 0.05) && near(x.rk4, row.rk4, 0.05);
        const mine = SECOND[v.second];
        if (!mine) return null;
        if (drifts(v, mine)) {
          if (
            near(v.ratioVerlet, mine.ratioVerlet, 0.1) &&
            near(v.ratioRk4, mine.ratioRk4, 0.15)
          ) {
            const n = v.second;
            return {
              level: 'ok',
              message:
                n === 1000
                  ? 'Velocity Verlet improved four times, which is a factor of two squared: second order. Runge-Kutta 4 improved by about twenty-six, more than the sixteen a clean fourth-order law gives, because at 500 steps it was still not in the regime where the leading term is all there is.'
                  : `The ratio of your step count to the baseline's is ${n / 500}. Velocity Verlet's improvement, ${mine.ratioVerlet}, is that ratio squared, which is what second order means; Runge-Kutta 4's, ${mine.ratioRk4}, is not its fourth power, because at these steps its error is not yet only the leading term.`,
            };
          }
          return {
            level: 'error',
            message: `Your two drifts match the ${v.second}-step run. The improvement is the baseline's 500-step drift divided by this run's drift, for each method: the old number over the new, not the other way round.`,
          };
        }
        for (const [n, row] of Object.entries({ 500: FIRST, ...SECOND })) {
          if (Number(n) !== v.second && drifts(v, row))
            return {
              level: 'error',
              message:
                Number(n) === 500
                  ? `Those are the drifts of the baseline run, 500 steps. You chose ${v.second}: set steps to ${v.second} on the compute page and run again.`
                  : `Those are the drifts of the ${n}-step run. You chose ${v.second}: set steps to ${v.second} on the compute page and run again.`,
            };
        }
        return {
          level: 'error',
          message: `Set steps to ${v.second} with 3 periods, run, and read the drifts of velocity Verlet and Runge-Kutta 4, then divide each baseline drift by the new one.`,
        };
      },
    },
    {
      sid: 'the-engine',
      compute: 'integrators-compared',
      type: 'measure',
      title: 'Against the application',
      evidence: [
        { step: 'choose-the-second-step', field: 'ratioVerlet' },
        { step: 'choose-the-second-step', field: 'ratioRk4' },
      ],
      compare:
        'These are the improvements for the step count you chose. The prediction was about 1000; for velocity Verlet the improvement is the square of the ratio of the step counts at whatever count you chose, and that is the order of the method showing itself.',
      body: `The notebook’s three schemes are the application’s three, so
             Gravitas’s own engine can be set against them. The engine takes its own
             step of 0.0278 time units, which is the tightest pair’s period divided by
             about <strong>438</strong>. Set <strong>steps</strong> to 438, keep the
             periods at 3, and run again; if you chose 438 in the last step, you have
             this run already. Enter the drifts of velocity Verlet, Runge-Kutta 4 and
             symplectic Euler.`,
      fields: [
        {
          id: 'verlet',
          label: 'Velocity Verlet, 438 steps',
          unit: '%',
          want: '0.002304',
        },
        {
          id: 'rk4',
          label: 'Runge-Kutta 4, 438 steps',
          unit: '%',
          want: '-1.22e-7',
        },
        {
          id: 'symplectic',
          label: 'Symplectic Euler, 438 steps',
          unit: '%',
          want: '-0.0001646',
        },
      ],
      validate: v => {
        if (![v.verlet, v.rk4, v.symplectic].every(Number.isFinite))
          return null;
        const near = (x, want, rel) =>
          Math.abs(x - want) <= rel * Math.abs(want);
        if (
          near(v.verlet, 0.002304, 0.05) &&
          near(v.rk4, -1.2225e-7, 0.05) &&
          near(v.symplectic, -0.0001646, 0.1)
        ) {
          return {
            level: 'ok',
            message:
              'Velocity Verlet and Runge-Kutta 4 agree with the engine, which gave +0.002299 % and −1.217×10⁻⁷ % over the same three periods, to a fraction of a percent: the same arithmetic. Symplectic Euler’s number is a different matter, and the next question is about why.',
          };
        }
        return {
          level: 'error',
          message:
            'Set steps to 438, keep the periods at 3, and read velocity Verlet, Runge-Kutta 4 and symplectic Euler.',
        };
      },
    },
    {
      sid: 'phase-luck',
      type: 'question',
      kind: 'choice',
      title: 'A number that is not a property',
      body: `The engine gave &minus;0.0022 % for symplectic Euler at about this step. The
             notebook gave &minus;0.00016 % at 438 steps and &minus;0.0023 % at 500. All
             three are right.`,
      prompt:
        'What does this say about quoting a symplectic method’s drift after one run?',
      options: [
        'It oscillates, so the end-of-run value depends on where in the oscillation the run stopped: quote its largest swing instead',
        'The notebook is wrong at 438 steps',
        'The engine and the notebook use different arithmetic',
        'Symplectic Euler has no drift at all',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'one-must-be-wrong',
          option: 1,
          say: 'Each is a correct value of the drift at that moment. The drift is a curve, and these are three points on it.',
        },
        {
          id: 'no-drift',
          option: 3,
          say: 'It has a drift, but a bounded one: it swings between limits rather than growing.',
        },
      ],
      hints: [
        'Look at the notebook’s table: the column for symplectic Euler goes up and down.',
      ],
      because:
        'The drift of a symplectic method is a bounded oscillation. A single end-of-run reading catches it anywhere in the swing, including close to zero, so the honest number to quote is the largest value over the run, which is in the notebook’s table, and not the last.',
    },
    {
      sid: 'trust-at-six-orbits',
      type: 'question',
      kind: 'choice',
      title: 'Which number to trust at six orbits',
      body: `Run the notebook once more with <strong>periods</strong> set to
             <strong>6</strong> and <strong>steps</strong> back at <strong>500</strong>.
             Set each method’s drift now beside its drift in the baseline run, which
             had 3 periods and the same steps.`,
      prompt:
        'Which method’s six-orbit drift would you still trust as a size of its error?',
      options: [
        'Runge-Kutta 4’s: it is tiny and creeps up steadily with the length of the run, so its end value is a fair size of its error',
        'Velocity Verlet’s: it is smaller than at three orbits, and the smaller the drift the more accurate the method',
        'Symplectic Euler’s: its error is bounded, so its value at the end of any run represents it',
        'Explicit Euler’s: it is the only one that clearly keeps growing, so its number shows the real trend',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'smallest-number-is-accurate',
          option: 1,
          say: 'Its drift did fall, from 0.001768 % at three orbits to 0.0001587 % at six, but a longer run cannot make a method more accurate. Velocity Verlet is symplectic: its drift swings, and this run stopped near the bottom of a swing. A smaller number at one moment is not a more accurate method.',
        },
        {
          id: 'bounded-is-representative',
          option: 2,
          say: 'Bounded is not small or steady. Symplectic Euler’s drift went from −0.002317 % at three orbits to +0.08515 % at six, and changed sign, because its error swings. The end of one run is one point on the swing; its largest swing is the number to quote.',
        },
        {
          id: 'euler-trend',
          option: 3,
          say: 'Explicit Euler’s drift does grow clearly, to about 60 % of the starting energy, but at that size the orbit is already a different one: its number says the method has failed, not how large its error is.',
        },
      ],
      hints: [
        'For each method put the three-orbit and the six-orbit drift side by side, and ask which kind of change each shows: growing, swinging or falling.',
      ],
      because:
        'Runge-Kutta 4’s drift is tiny and grows smoothly with the length of the run, about 6.473×10⁻⁸ % at three orbits and 1.046×10⁻⁷ % at six, so its end value is a fair size of its error at that length. The two symplectic methods keep their error bounded, but their end values are phases of a swing: when the run doubled Verlet’s fell elevenfold and symplectic Euler’s rose thirty-seven-fold, so for them the honest number is the largest swing in the notebook’s table.',
    },
    {
      sid: 'what-you-worked-out',
      type: 'read',
      title: 'What you worked out',
      body: `Four integrators, one system, the same ten thousand steps. Explicit Euler
             gained about half the system’s energy; symplectic Euler and velocity
             Verlet kept it to a few thousandths of a percent and let it swing rather than
             grow; Runge-Kutta 4 kept it to a hundred thousand times better. Changing the
             step moved velocity Verlet’s drift by the square of the ratio of the step
             counts, whichever count you chose, and Runge-Kutta 4’s by more than the
             fourth power; at the application’s own step the notebook and the engine gave
             the same numbers for the two methods whose end-of-run drift is a property.
             Doubling the run to six orbits showed which numbers are sizes and which are
             phases.
             \n\nWhat the drift does not cover: this is one system, a few lengths of run
             and no close encounter. The notebook has no softening, no merging and no
             relativity, which the application can switch on. A small energy drift is not
             an accurate orbit: a method can keep the energy and still put a body in the
             wrong place along its orbit. And the drift of a method that swings is not one
             number, whatever one run ends on. The run is yours to keep: its capsule
             records the notebook’s hash and the input’s, so a report can cite it.`,
    },
  ],
  retired: {
    'halve-the-step': {
      to: 'choose-the-second-step',
      release: '3.1',
      was: {
        en: 'Run the notebook again at 1000 steps and enter the drifts of velocity Verlet and Runge-Kutta 4 and how many times smaller each was than at 500 steps.',
        es: 'Ejecutar de nuevo el cuaderno con 1000 pasos e introducir las derivas del Verlet de velocidad y del Runge-Kutta 4 y cuántas veces menor era cada una que con 500 pasos.',
      },
    },
  },
};

export default INTEGRATORS_IN_PRACTICE;
