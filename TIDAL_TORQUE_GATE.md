# The tidal-torque gate (Prompt 204, part B)

An engine scenario that applies a tidal torque as an extra force needs proofs of conservation and
convergence before it ships. This is the gate that decides whether it does. The contract here and in
`tests/fixtures/tidal-torque-gate/thresholds.json` was committed before the prototype existed. The prototype
lives on the never-merged branch `spike/tidal-torque-gate`; production code is built afterwards, within the
verdict only.

## The seam

The torque enters at `computeAccelerations` in `js/engine/forces.js`, after the gravity sum and the MOND
step. Every integrator (symplectic Euler, Velocity Verlet, RK4) takes its stage accelerations from that
function, so one hook serves all three, and a step with no registered pair pays one length test. The law is a
dissipative acceleration along the azimuthal direction of a pair's separation, equal and opposite in momentum
on the two bodies, with the kernel's constant-Q torque as its size (so the secular change has a closed form to
be tested against) and the planet's spin held as a side variable of the seam (the bodies have none), which sets
the sign and carries the angular-momentum account.

What is conserved: linear momentum exactly; `L_orbit + I omega` to the quadrature of the torque. What is not:
the total energy, which falls by the dissipation while the spin is ahead of the orbit and may never rise. What
is not modelled: the conservative radial part of the tide, eccentricity tides, spin-orbit resonances, a
variable Q. The real ratio of tidal to central acceleration is about 6e-13 for the Earth and the Moon, so the
scenario carries a stated rate multiplier; the harness fixes it at `eps0 = 2e-4`.

## The legs, the decision function and the slices

Every bound is in the fixture: G1 (off is bit-identical, the world golden and seeded steps unchanged), G2 (zero
strength is bit-identical), G3 (the secular change against the closed form), G4 (the order of convergence:
1 for symplectic Euler, 2 for Velocity Verlet, 4 for RK4, each within a stated band, over three step sizes
against an independent DOP853 reference), G5 (momentum), G6 (the account of angular momentum and energy), G7
(dissipation never negative and equal to the closed form), G8 (the empty-registry overhead).

**A** (all pass): the tidally evolving binary ships with its proofs as tests. **B** (G1 and G2 pass, another
leg fails): a precomputed trajectory from the kernel is displayed, no force in the engine. **C** (G1 or G2
fails): no scenario; the kernel's plots stand. The first match from the top. A bound that cannot be measured
fails its leg; only Carl resets a bound; a failed leg is reported and left failing.

## Clarifications committed before the harness first ran

The thresholds fixture is unchanged; these fix the meaning of three words in it, before any spike output
existed.

- **Samples** (G7) are the ends of the 20 orbits, 21 states with the start. The engine's integrators wobble the
  orbital energy within an orbit by far more than the dissipation of one step; what the leg asks is that the
  account falls from orbit to orbit, and a wobble that repeats each orbit does not move the orbit ends.
- **The planet's spin** is advanced by the harness by the trapezoid rule on the step-end torque
  (`omega = omega0 - integral(tau) / I`), after each step; the seam reads it only for the sign. In production the
  spin update belongs to the step function and not to `computeAccelerations`, which a multi-stage scheme calls
  several times a step.
- **The sign** `s = sgn(spin - n_kepler(r))` uses the Kepler rate of the current separation, so the law depends on
  position alone and every stage of every scheme sees the same acceleration. The planet's radius for the harness is
  10 (a tenth of `a0`) and enters only `I`; the kernel's `rate` multiplier is the one that makes `eps0` equal
  `2e-4` for `k2 = 0.3`, `Q = 12` (`tools/tidal-torque-gate-oracle/oracle-inputs.json`, committed before the
  spike).

## The measurement and the verdict: B

Spike `spike/tidal-torque-gate` (commit 7fbad39f, never merged, pushed), on the kernel branch with the seam added
to `js/engine/forces.js` (50 lines, one length test per call when no pair is registered). Harness
`tools/tidal-torque-gate.mjs`, reference `tests/fixtures/tidal-torque-gate/oracle-results.json` (scipy 1.15.3,
DOP853, rtol 1e-13), record `tests/fixtures/tidal-torque-gate/record.json`, held by
`tests/tidalTorqueGate.test.js`. The bounds are the committed ones.

| Leg | Symplectic Euler | Velocity Verlet | RK4 | Bound |
|---|---|---|---|---|
| G1 off is identical | seeded steps of five scenarios byte-identical to base; 1,163 focused tests pass | | | 0 bits |
| G2 zero strength | bit-identical | bit-identical | bit-identical | 0 bits |
| G3 against the closed form | 0.55 percent | **0.118 percent (bound 0.1)** | 0.003 percent | 1, 0.1, 0.1 percent |
| G4 order of convergence | **1.85 (band 0.8 to 1.2)** | 1.95 (1.8 to 2.2) | **5.05 (band 3.5 to 4.5)** | bands |
| G5 momentum | 3e-15 | 9e-15 | 3e-15 | 1e-11 |
| G6 angular momentum, energy | 1e-5, 4.5e-3 | 2e-13, 4.6e-4 | 7.6e-5, 7.6e-5 | 1e-2, 1e-3, 1e-3 |
| G7 rises; dissipation vs closed form | none; 0.93 percent | none; 0.12 percent | none; 0.016 percent | none; 1 percent |
| G8 overhead, minimum of 7 interleaved | +0.37 percent (24,006 to 24,094 ns per call at 50 bodies) | | | 5 percent |

Verdict by the committed function: **B**. G1 and G2 pass, and three legs fail as committed: G4 for symplectic Euler
and for RK4, and G3 for Velocity Verlet. Nothing was moved, restated or widened.

What the three failures are, said plainly, because the verdict follows from bounds that were wrong about
numerical analysis and not from a defect in the seam. (1) Symplectic Euler's error at the end of an orbit
converges at second order here, not first: on a circular orbit `r . v = 0` at every instant, so the first-order
term of the scheme's modified energy vanishes, and the bound expected the generic order. (2) RK4's slope of 5.05 at
24, 48 and 96 steps per orbit is a pre-asymptotic fit above the nominal 4 (errors 3.2e-3, 9.7e-5, 2.9e-6, a factor 33
and 33 per halving). (3) Velocity Verlet at 200 steps per orbit is 0.118 percent from the closed form, 18 percent
over a bound its own measured second-order error (5.4e-5 of `a0`, 1.2e-3 of the change in `a`) makes reachable at 400.
The kernel's closed form itself is within 1.5e-6 of the DOP853 run, so the closed form is not the limit.

**The counterfactual, for Carl**, who alone resets a bound: the same function gives **A** if those three bounds were
reset (symplectic Euler's band to about 1.6 to 2.1, RK4's to 3.5 to 5.5, Velocity Verlet's G3 to 0.2 percent), and
`tests/tidalTorqueGate.test.js` holds that no one reset is enough. If he resets them, the seam in the spike is the
code to build (`js/engine/forces.js`, 50 lines, with the spin update moved into the step function), a
tidally evolving binary is declared through the geometry table with its pair registered by the scenario, and the
proofs above become tests. This PR builds none of that.

## What the B verdict builds

The kernel's `tidalTrajectory` (`js/kernels/tides/tides.js`): the closed form sampled into a table of semi-major axis,
spin, orbital and spin periods, energy and angular momentum, which a plot or a prescribed pair of bodies is drawn from,
with no force in the engine. Where the model ends inside the interval it stops just before and names why and when:
run forward the Earth and the Moon (k2 0.30, Q 12) meet corotation at 15.4 Gyr at 5.54e8 m with a 47-day day; run
back, the constant-Q table reaches contact 1.58 Gyr ago, which the geological record contradicts and which is stated as
the model's limit. `tests/tides.test.js` holds the table against the oracle's integration. The displays that would
draw it (the investigation "Tides that move the Moon" and a prescribed pair of bodies) are not built in this PR.
