# The 3-D lab's scientific domain and its reference corpus (spike)

Fixed before any kernel code was written, and committed alone so that the
history shows it. The gate (VALIDATED_3D_LAB_GATE.md) reports against these
numbers and does not change them.

## Domain

- **Bodies:** small-N Newtonian point masses, from 2 to 50, and massless test
  particles, which feel the massive bodies and exert nothing. Each body has a
  radius, used for collisions and drawing only; gravity is point-mass and
  unsoftened.
- **Collisions:** perfect merger on contact (centers closer than the sum of
  the radii), conserving mass and momentum; the kinetic energy lost is
  reported. No bouncing, fragmentation or tides.
- **Frames:** an inertial frame in which the input is given. Views and
  observations may use the barycentric frame, a body-centered frame or the
  corotating frame of a chosen pair. Frames are transformations of state,
  never of the integration.
- **Orbital elements:** a, e, i, Ω, ω, M (or true anomaly) of a body about a
  primary or a pair's barycenter, converted to and from state vectors, for
  e < 1 and for hyperbolic e > 1.
- **Integrators:** fixed-step leapfrog (kick-drift-kick, order 2), Yoshida's
  fourth-order symplectic composition, classical RK4, and adaptive
  Dormand-Prince 5(4). The gate compares them; production ships what it
  recommends.
- **Time:** code units with G = 1, or AU, years and solar masses with
  G = 4π². No ephemeris time scales (TDB, TT): an ephemeris is Prompt 39's
  and is a separate question.
- **Excluded:** large-N and cluster dynamics, softening as a model of
  anything, relativity (including 1PN precession), spin, tides, non-spherical
  bodies, drag, radiation, gas and dark matter. None of these are claimed,
  and no benchmark of them is run.

## Reference problems and tolerances

G = 1 throughout. "Orbit" is the problem's reference period. A tolerance is
met by an integrator at some timestep; the gate reports which integrators meet
each tolerance and at what cost.

| # | Problem | Measured | Tolerance |
|---|---|---|---|
| R1 | Two-body Kepler orbit in 3-D: m = 1 and 1e-3, a = 1, e = 0.6, i = 40°, Ω = 30°, ω = 60° | position against the analytic solution after 100 orbits | ≤ 1e-6 a |
| | | largest relative energy error over 1000 orbits | ≤ 1e-8 |
| | | the same over 1000 orbits against over 100 | ratio ≤ 1.5 (bounded, not growing) |
| | | relative change in the angular momentum vector over 1000 orbits | ≤ 1e-12 |
| | | drift of i and Ω over 1000 orbits | ≤ 1e-10 rad |
| R2 | Inclined binary, boosted: equal masses, e = 0.5, i = 60°, whole system moving at v = (0.3, -0.2, 0.5) | barycenter against uniform motion after 100 orbits | ≤ 1e-12, relative to the distance traveled |
| | | relative orbit against the same binary unboosted | ≤ 1e-9 a |
| R3 | Barycentric three-body: masses 1, 1e-3, 3e-4 on near-circular orbits at a = 5.2 and 9.5, inclined 1.3° and 2.5° | total momentum, relative to the largest body momentum | ≤ 1e-13 |
| | | largest relative energy error over 1000 inner orbits | ≤ 1e-9 |
| | | relative change in the angular momentum vector | ≤ 1e-12 |
| R4 | Restricted three-body, μ = 1e-3, circular primaries: a test particle at L4, offset 1e-3 in position and 1e-3 out of the plane | largest distance from L4 over 100 orbits of the primaries | ≤ 0.05 |
| | | relative change in the Jacobi constant | ≤ 1e-9 |
| | The same particle at L1, offset 1e-6 | distance from L1 after 20 orbits | ≥ 0.1 (it leaves) |
| R5 | The figure-eight choreography (Chenciner and Montgomery 2000), three unit masses, rotated into 3-D by a fixed rotation | largest body position error after one period T = 6.32591398 | ≤ 1e-6 |
| | | out-of-plane motion, rotated back | ≤ 1e-12 |
| R6 | Hierarchical secular (Kozai-Lidov): a test particle at a = 1, e = 0.01, i = 65° about m = 1, perturbed by m = 1 on a circular orbit at a = 20 | largest eccentricity over two secular cycles, against the quadrupole prediction √(1 - (5/3) cos² i) = 0.838 | within 0.03 |
| | | variation of √(1 - e²) cos i | ≤ 0.02 |
| R7 | Close approach: a hyperbolic two-body encounter, v∞ = 0.5, pericenter q = 0.01 | deflection against the analytic 2 arcsin(1/e) | ≤ 1e-6 rad |
| | | relative energy error through the encounter | ≤ 1e-8 |
| R8 | Collision: two bodies merging head-on and one grazing | mass and momentum after the merger | exact to 1e-15 relative |
| R9 | Determinism: the same state and integrator, twice, and in Node, Chromium, Firefox and WebKit Workers | the final state's bytes | identical |

R6 is included only if the direct integration is numerically defensible:
both secular cycles resolved, energy error below 1e-8 over the run, and the
test particle never closer than 0.5 to the perturber. If not, it is reported
as not attempted, not as a pass.
