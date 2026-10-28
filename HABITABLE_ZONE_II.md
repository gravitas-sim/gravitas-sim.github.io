# Habitable zone II: threshold limits (Prompt 205, part A, the kernel)

The kernel in `js/kernels/habitablezone/`: the habitable-zone limits as stated flux thresholds from a cited
parameterisation, with its own temperature domain enforced as a refusal, the zone's position at chosen ages along
a MIST track, the flux of an eccentric orbit, and the tidal-locking radius from the tides kernel (Prompt 204). Pure,
no DOM and no clock. This file is the kernel document of section 7.5.8 (equations, limits, assumptions, references,
domain, validation table). It was committed first, with `tests/fixtures/habitable-zone-ii/thresholds.json`, before
the kernel, the oracle's script, the validation tool or a test existed.

The review's correction stands: **the thresholds are parameterisations with their simplifications named, and a
climate trajectory is not built.** A planet's climate over time is deferred (D-R10-205-01).

## What exists and what this adds (the delta table)

| Existing authority | Missing behaviour | Adopter | Duplication removed |
|---|---|---|---|
| `js/habitability.js`: the Kopparapu et al. quartic for four limits, the conservative and optimistic edges, the status of a planet, orbit extremes, a sampled fraction of the year in the zone | a refusal outside the fit's temperature range (the module evaluates at the nearest calibrated temperature and flags it); the limits as named flux thresholds with their kind (climate model or empirical) and the simplification stated; the closed-form fraction of the year in a band; the zone at an age along a MIST track; the locking radius against the zone; an independent oracle and a published tier | the habitable-zone panel's limit toggles, locking bar and age selector, and the Goldilocks lesson's upper depth | none: the coefficient table is the same table, and a test holds every flux, edge and extreme equal to `habitability.js` to 1e-14, so a second copy cannot drift |
| `js/kernels/tides/`: the locking time `t = I omega / N` | the radius at which that time equals an age, for a planet around a star | the locking bar | the kernel calls `lockingTime`; it does not repeat the torque |
| `js/stellar/tracks.js`: a star at an age on a MIST track | the zone of that star | the age selector | the kernel reads `stateAtAge`; it does not decode the track |

## Equations

Fluxes in the unit of the flux Earth receives from the Sun (1361 W per square metre, `habitability.js`); distances in AU.

- **Limit flux.** `S_eff(T) = S_sun + a T + b T^2 + c T^3 + d T^4`, `T = Teff - 5780 K`, for each of four limits
  (Kopparapu et al. 2013 with the 2014 erratum, one Earth mass): runaway greenhouse (inner edge of the conservative
  zone), maximum greenhouse (outer edge), recent Venus (inner edge of the optimistic zone) and early Mars (outer
  edge). The first two come from a climate model; the last two from what the history of Venus and Mars rules out.
- **Distance of a limit.** `d = sqrt((L / L_sun) / S_eff)`: the inverse-square law, solved for the distance.
- **Eccentric orbit.** Periapsis `a (1 - e)` and apoapsis `a (1 + e)` give the extremes of the flux `L / r^2`; the
  time mean of `1 / r^2` over an orbit is `1 / (a^2 sqrt(1 - e^2))`, so the mean flux is `L / (a^2 sqrt(1 - e^2))`.
  The fraction of a year with `r` inside a band `[r1, r2]` is `(F(r2) - F(r1))` with
  `F(r) = (E - e sin E) / pi`, `cos E = (1 - r / a) / e`, `E` in `[0, pi]`, and `F = 0` below the periapsis, `1` above
  the apoapsis: Kepler's equation evaluated at the band's ends, so nothing is sampled.
- **Locking radius.** `t_lock = I omega / N`, `N = (3/2) (k2/Q) G M^2 R^5 / a^6`, `I = alpha m R^2`
  (TIDAL_KERNEL.md). `t_lock` is proportional to `a^6`, so `a_lock = a_ref (age / t_lock(a_ref))^(1/6)`
  exactly, with `t_lock(a_ref)` from the tides kernel. A planet inside `a_lock` is despun to synchronous rotation
  within the age in this model. `a_lock` goes as `M^(1/3) age^(1/6) (k2/Q)^(1/6) omega^(-1/6)`.
- **The zone along a track.** `stateAtAge(track, age)` gives `L` and `Teff`; the limits follow.

## Limits and assumptions, stated

The Kopparapu fit is for a one-dimensional, cloud-free radiative-convective model of a planet of **one Earth mass**
with Earth's gravity and a fixed surface pressure: a water-rich planet for the inner limits, a CO2 planet for the
outer. Clouds, rotation and obliquity, ocean heat transport, the planet's size and history, the stellar spectrum
beyond the fitted `Teff` and any atmosphere that is not those two are **not modelled**. It is calibrated for a stellar
effective temperature of **2600 K to 7200 K**; the kernel refuses outside that range, because a quartic run past its
data does not fail gracefully (`habitability.js` clamps and flags for the ring on TRAPPIST-1, 2566 K; the kernel
refuses there and says so). The two empirical limits are not predictions: they are what Venus and Mars did. The zone
is a **band of flux**, not a measurement of any planet, and a planet inside it is not thereby habitable.

The locking radius is the constant-Q model of TIDAL_KERNEL.md: a circular orbit, a spin aligned with it, one
frequency-independent `Q`, no eccentricity tide, no spin-orbit resonance (Mercury's 3:2 is outside the model), no
atmospheric tide (Venus's is), no star's tide on a planet that is not rocky. `k2/Q` of a particular planet is not known to a
factor of ten, which moves the radius by a factor of `10^(1/6)`, 1.47; the kernel returns that range beside the
central value (Q = 100, k2 = 0.3) and the document says "locking within the age", never "locked".

The age is years since the start of the MIST track (an early pre-main-sequence model), not since birth, and the
**1 solar-mass track is a model star, not the Sun**: it is 11 percent brighter than the Sun at 4.57 Gyr, so
Earth's 1 AU is outside the conservative inner edge of the zone read at that age. The kernel says so in the result.

Not built, by decision: the **escape bound** (verdict B of Prompt 199 authorizes Prompt 205 without the escape bar:
D-R10-75; no data were measured or fetched); any **climate trajectory** (the recorded deferral); the **spectra items**
(not authorized: Prompt 201's authorized slice is the eclipse and phase one); the **moist greenhouse**
limit and the 0.1 and 5 Earth-mass columns of the cited table (the panel and the ring use one-Earth-mass limits).

## The validation contract (committed before any output)

`tests/fixtures/habitable-zone-ii/thresholds.json` holds every bound. Tiers: (a) the closed forms against an
independent Python oracle (numpy and scipy, `python -I`, nothing installed), which decodes the MIST pack's int16
columns and interpolates for itself and solves Kepler's equation by root finding; (b) the published references, the
Sun's four edges against the published two-figure values, the equality with the existing authority, the model star's
luminosity against a standard-solar-model fit, and the locking inequalities; (c) not applicable, stated; (d) out-of-domain
inputs refused with named codes, among them a temperature one-thousandth of a kelvin outside the domain.
Every published value was typed from the cited source and not re-read in this run (`checked: false`); a disagreement
with a source is a defect to be found, not a tolerance to be widened. The oracle is the author's own implementation of the
same equations: no external habitable-zone code was available and none is claimed (the cited calculator was not
fetched). The coefficient table in the oracle was typed by the same author from the same source as the kernel's: it
guards against a slip in transcription, not against an error in the source.

Sources typed for tier (b): Kopparapu et al. 2013, ApJ 765, 131 and the erratum, ApJ 787, L29 (the coefficients and the
Sun's edges); Gough 1981, Solar Physics 74, 21 (the solar luminosity's rise); Dotter 2016, ApJS 222, 8 and Choi et al.
2016, ApJ 823, 102 (MIST, through the pack); Ribas et al. 2016, A&A 596, A111 and Barnes et al. 2016, Astrobiology 16, 919
(Proxima b); Gillon et al. 2017, Nature 542, 456 (TRAPPIST-1); Dole 1964, *Habitable Planets for Man*, and Kasting,
Whitmire and Reynolds 1993, Icarus 101, 108 (the habitable zone and tidal locking).

## The validation table

Filled in below once the kernel has been run against the committed bounds (`npm run habitablezone:validate`, held by
`tests/habitableZoneII.test.js`).
