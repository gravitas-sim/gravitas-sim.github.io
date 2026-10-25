# Rings, Roche limits and analytic tides (Prompt 204, part A)

The kernel in `js/kernels/tides/`: closed-form, pure, SI in and SI out, no DOM and no simulation. This
file is the kernel document of section 7.5.8 (equations, limits, assumptions, references, domain, validation
table). It was committed first, with `tests/fixtures/tides/thresholds.json`, before the kernel, the oracle's
script, the validation tool or a test existed.

## What exists and what this adds (the delta table)

| Existing authority | Missing behaviour | Adopter | Duplication removed |
|---|---|---|---|
| `js/tidalPhysics.js`: tidal acceleration, tidal profile, the rigid and fluid Roche limits from masses or densities, the disruption radius, six named systems | tidal bulge height; tidal heating; constant-Q evolution of a moon's orbit and the planet's spin; locking time; ring-gap radii from a resonance and the Toomre criterion; refusals with named codes; an independent oracle and a published tier | the three investigations of this prompt and the ring scenarios; later 205 (tidal locking radius) and 273 | none: the kernel imports the Roche functions and the tidal acceleration from `tidalPhysics.js` and does not repeat them. Its fluid coefficient is that module's 2.44; the exact 2.4553 is a named option, so the 0.6 percent between them is stated and not hidden |
| `js/resonance/` (elements, the Galilean and Pluto systems) | the location of a resonance in a ring, as a radius | the Cassini-division check | the resonance radius is `a_m (q/p)^(2/3)`, one line, with the period ratio checked in the tests |

## Equations

All in SI. `M` the primary's mass, `R` its radius, `m` the perturber's, `a` the orbit's radius, `n = sqrt(G (M + m) / a^3)`.

- Equilibrium bulge, peak to trough: `(3/2) h2 (m/M) (R/d)^3 R`, from the quadrupole potential `G m r^2 P2(cos psi) / d^3` over the surface gravity `G M / R^2`. `h2 = 1` is a fluid body whose own response to the tide is ignored; the solid Earth's `h2` is about 0.6.
- Constant-Q torque on the body raised by the perturber: `N = (3/2) (k2/Q) G m^2 R^5 / a^6`, signed by `sgn(omega - n)`.
- Recession of a circular orbit: `da/dt = 3 (k2/Q) (m/M) (R/a)^5 n a = C a^(-11/2)`, `C = 3 (k2/Q) (m/M) R^5 sqrt(G (M + m))`. Closed form: `a(t)^(13/2) = a0^(13/2) + (13/2) s C t`, `s = sgn(omega - n)`. The time to go from `a0` to `a1` is the inverse of that.
- Spin: `L = mu sqrt(G (M + m) a)`, `mu = M m / (M + m)`; `I d omega / dt = - dL/dt`, `I = alpha M R^2`. `L + I omega` is conserved by construction. Dissipation `N (omega - n)`; the total energy `- G M m / (2 a) + I omega^2 / 2` falls while `omega > n`.
- Heating of a synchronous satellite: `Edot = (21/2) (k2/Q) G M^2 n R^5 e^2 / a^6` (Peale, Cassen and Reynolds 1979), leading order in `e`. Energy per orbit is `Edot` times the period. It is a bound of order of magnitude: the answer is proportional to the unknown `k2/Q`, so the kernel returns the heating over a stated range of `k2/Q` and the `k2/Q` an observed heat flow requires.
- Locking time: `t_lock = I omega / N`, the time for the constant torque to remove the spin. The printed forms of this time differ by a factor 2 through the definition of `Q`; this one is derived from `N` above and is used consistently with the recession.
- Resonance radius: a ring particle inside a moon of radius `a_m` has the period ratio `T_m / T_r = p/q` (`p > q >= 1`) at `a_r = a_m (q/p)^(2/3)`. A point-mass Kepler relation; Saturn's oblateness shifts the real location by about `J2 (R_S/r)^2`, 0.4 to 0.6 percent.
- Toomre: `Q_T = c kappa sigma_v / (3.36 G Sigma)` for a particle disc, `pi` instead of 3.36 for a fluid disc, `kappa = Omega` in a Kepler disc. `Q_T < 1` is unstable to self-gravity.

## Limits and assumptions, stated

Circular orbits and spin aligned with the orbit for the evolution; near-circular for the heating (`e <= 0.1`); a single frequency-independent `Q` (`5 <= Q <= 1e7`: below 5 the lag is no longer small, above 1e7 nothing is known to be that dissipation-free); `0 < k2 <= 3/2` (the homogeneous fluid is the maximum); no obliquity, no libration, no spin-orbit resonance, no eccentricity tide, no atmosphere or ocean. The constant-Q law is a parameterisation, not a measurement of the planet's interior: the same Earth has no single `Q`, and run backward the constant-Q recession puts the Moon in contact with the Earth well inside the age of the Solar System, which the evidence contradicts. The evolution refuses to cross corotation and names the time.

## The validation contract (committed before any output)

`tests/fixtures/tides/thresholds.json` holds every bound. Tiers: (a) the closed forms, against an independent Python oracle (scipy 1.15.3, numpy 2.2.6, astropy 6.1.7, `python -I`, nothing installed) and against exact relations in the tests; (b) the published references: the coefficients, Phobos and Shoemaker-Levy 9 against the Roche limits, the Moon's recession and the day's lengthening against lunar laser ranging and eclipse records, Io's heat flow as an order-of-magnitude bound, the Cassini Division against Mimas's 2:1 resonance, the locked state of the Moon and Io; (c) not applicable, stated: the kernel returns closed-form values with no uncertainty estimator, so there is nothing for an ensemble to cover; (d) out-of-domain inputs refused with named codes. Every published value was typed from the cited source and not re-read in this run (`checked: false`); a disagreement with a source is a defect to be found, not a tolerance to be widened.

Sources typed for tier (b): Roche 1850 (2.44); Chandrasekhar 1969, *Ellipsoidal Figures of Equilibrium* (2.4553); Murray and Dermott 1999, *Solar System Dynamics* (the rigid coefficient, the constant-Q torque); Goldreich and Soter 1966, Icarus 5, 375 (the torque and `Q`); Peale, Cassen and Reynolds 1979, Science 203, 892 (Io's heating); Dickey et al. 1994, Science 265, 482 (3.82 +/- 0.07 cm per year); Stephenson and Morrison 1995, Phil. Trans. R. Soc. A 351, 165 (2.3 ms per century); Veeder et al. 1994, Icarus 109, 1, and Spencer et al. 2000, Science 288, 1198 (Io's heat flow); Porco et al. 2005, Science 307, 1226 (ring edges); Asphaug and Benz 1994, Nature 370, 120 (the comet's density).
