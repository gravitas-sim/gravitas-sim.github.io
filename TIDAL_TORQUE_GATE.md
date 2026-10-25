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
