// =============================================================================
// Integrators in Practice
// -----------------------------------------------------------------------------
// Content only, no imports. The companion of the compute page's notebook
// "integrators-compared" (Roadmap II Prompt 102, COMPUTE.md). There is no
// instrument on this page: the student runs the reviewed notebook at
// /compute/ on the Kepler-16 system the Orbital System Builder saves, and
// types back the numbers the notebook's capsule holds. Every number checked
// here is a declared output of that notebook (js/compute/catalogueData.js),
// and tests/computeInvestigations.test.js holds each one to the notebook's own
// answer (tests/fixtures/compute/integrators-compared.answer.json) and the
// 438-step run to Gravitas's own engine, so a changed notebook or engine fails
// a test, not a student. The runs are deterministic: two students get the
// same digits.
//
// The numbers (Kepler-16, three periods of the widest orbit):
//   500 steps per period, 10,722 steps:  explicit Euler +49.75 %, symplectic
//     Euler -0.002317 %, velocity Verlet +0.001768 %, Runge-Kutta 4 -6.47e-8 %
//   1000 steps, 21,443 steps: Verlet +0.000442 %, RK4 -2.44e-9 %
//   438 steps, 9,392 steps (the application's own step): Verlet +0.002304 %,
//     RK4 -1.22e-7 %; the application's engine gave +0.002299 and -1.217e-7
// =============================================================================

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
    'Show from two step sizes that a second-order method improves about fourfold when the step is halved, and a fourth-order one far more',
    'Compare the notebook’s drift with Gravitas’s own engine at the same step, and say why a symplectic method’s end-of-run drift is a poor number to quote',
  ],
  steps: [
    {
      sid: 'one-system-four-steps',
      type: 'read',
      setup: {
        scenario: 'Circumbinary Planet Lab',
        seed: 'binary',
        paused: true,
      },
      title: 'One system, four ways to take a step',
      body: `An integrator turns forces into a path by taking small steps. Gravitas
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
      body: `Press <strong>Start the runtime</strong>, wait, then
             <strong>Run the notebook</strong>. Read the five numbers it returns and
             enter them here. The page shows them in percent; the last is how many
             steps each method took.`,
      fields: [
        { id: 'euler', label: 'Explicit Euler', unit: '%', hint: '49.75' },
        {
          id: 'symplectic',
          label: 'Symplectic Euler',
          unit: '%',
          hint: '-0.002317',
        },
        {
          id: 'verlet',
          label: 'Velocity Verlet',
          unit: '%',
          hint: '0.001768',
        },
        {
          id: 'rk4',
          label: 'Runge-Kutta 4',
          unit: '%',
          hint: '-6.47e-8',
        },
        { id: 'steps', label: 'Steps taken', unit: '', hint: '10722' },
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
      sid: 'halve-the-step',
      compute: 'integrators-compared',
      type: 'measure',
      title: 'Halve the step',
      body: `On the compute page set <strong>steps</strong> to <strong>1000</strong>,
             leave the periods at 3, and run again; it takes about twice as long. Enter
             the drifts of velocity Verlet and of Runge-Kutta 4 now, and how many
             times smaller each is than before (the old number divided by the new,
             as a positive ratio).`,
      fields: [
        {
          id: 'verlet',
          label: 'Velocity Verlet, 1000 steps',
          unit: '%',
          hint: '0.000442',
        },
        {
          id: 'rk4',
          label: 'Runge-Kutta 4, 1000 steps',
          unit: '%',
          hint: '-2.44e-9',
        },
        {
          id: 'ratioVerlet',
          label: 'Verlet: improvement',
          unit: '',
          hint: '4.0',
        },
        {
          id: 'ratioRk4',
          label: 'Runge-Kutta 4: improvement',
          unit: '',
          hint: '26.5',
        },
      ],
      validate: v => {
        if (
          ![v.verlet, v.rk4, v.ratioVerlet, v.ratioRk4].every(Number.isFinite)
        )
          return null;
        const near = (x, want, rel) =>
          Math.abs(x - want) <= rel * Math.abs(want);
        if (
          near(v.verlet, 0.000442, 0.05) &&
          near(v.rk4, -2.44e-9, 0.05) &&
          near(v.ratioVerlet, 4, 0.1) &&
          near(v.ratioRk4, 26.5, 0.15)
        ) {
          return {
            level: 'ok',
            message:
              'Verlet improved four times, which is a factor of two squared: second order. Runge-Kutta 4 improved by about twenty-six, more than the sixteen a clean fourth-order law gives, because at 500 steps it was still not in the regime where the leading term is all there is.',
          };
        }
        return {
          level: 'error',
          message:
            'Run it again with 1000 steps and 3 periods, read the two drifts, and divide the 500-step drift by the 1000-step drift for each method.',
        };
      },
    },
    {
      sid: 'the-engine',
      compute: 'integrators-compared',
      type: 'measure',
      title: 'Against the application',
      body: `The notebook’s three schemes are the application’s three. Gravitas’s own
             engine, given this system and taking its own step of 0.0278 time units, gave
             <strong>+0.002299 %</strong> for velocity Verlet and
             <strong>&minus;1.217&times;10<sup>&minus;7</sup> %</strong> for Runge-Kutta 4
             over the same three periods. That step is the tightest pair’s period
             divided by about <strong>438</strong>. Set <strong>steps</strong> to
             438 and run again.`,
      fields: [
        {
          id: 'verlet',
          label: 'Velocity Verlet, 438 steps',
          unit: '%',
          hint: '0.002304',
        },
        {
          id: 'rk4',
          label: 'Runge-Kutta 4, 438 steps',
          unit: '%',
          hint: '-1.22e-7',
        },
        {
          id: 'symplectic',
          label: 'Symplectic Euler, 438 steps',
          unit: '%',
          hint: '-0.0001646',
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
              'Velocity Verlet and Runge-Kutta 4 agree with the engine to a fraction of a percent: the same arithmetic. Symplectic Euler’s number is a different matter, and the next question is about why.',
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
      sid: 'what-you-worked-out',
      type: 'read',
      title: 'What you worked out',
      body: `Four integrators, one system, the same ten thousand steps. Explicit Euler
             gained about half the system’s energy; symplectic Euler and velocity
             Verlet kept it to a few thousandths of a percent and let it swing rather than
             grow; Runge-Kutta 4 kept it to a hundred thousand times better. Halving the
             step bought four times for a second-order method and more for a fourth-order
             one, and at the application’s own step the notebook and the engine gave the
             same numbers for the two methods whose end-of-run drift is a property.
             \n\nWhat the numbers do not say: this is one system, one length of run and
             no close encounter. The notebook has no softening, no merging and no
             relativity, which the application can switch on. And a small energy drift
             is not an accurate orbit: a method can keep the energy and still put a body
             in the wrong place along its orbit. The run is yours to keep: its capsule
             records the notebook’s hash and the input’s, so a report can cite it.`,
    },
  ],
};

export default INTEGRATORS_IN_PRACTICE;
