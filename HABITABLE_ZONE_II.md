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

`npm run habitablezone:validate`, held by `tests/habitableZoneII.test.js`. 60 rows, 58 pass, none fails, two are
stated not applicable (tier c and the escape row). Bounds are the committed ones. No leg failed, so there is no
`failed-legs.json`.

| Tier | Result |
|---|---|
| (a1) the limit fluxes | 25 stellar temperatures from 2600 K to 7200 K, four limits, against the oracle's numpy polynomial: worst relative difference 2.2e-16 (bound 1e-12); at 5780 K every limit equals its constant term exactly |
| (a2) the edges | 12 stars, four limits: 2.1e-16 against the oracle; the inverse-square round trip 3.6e-16; four times the luminosity doubles an edge exactly; the optimistic zone contains the conservative zone for every star |
| (a3) the orbit | periapsis, apoapsis and time-mean flux for six orbits against the oracle (exact), the mean against quadrature over 200,001 points of mean anomaly (4e-16), the fraction of the year in a band against the oracle's closed form (exact) and against its sampling of Kepler's equation (8.7e-6 absolute, bound 1e-4), and against the 4,000-sample estimate in `js/habitability.js` (4.3e-4 absolute, bound 5e-4: the sampler's own resolution) |
| (a4) the locking radius | six star-planet pairs against the oracle's independent inversion (1.5e-15); the tides kernel's `lockingTime` at the returned radius is the age (6.3e-16); the exponents 1/3 (star mass), 1/6 (age, k2) and -1/6 (spin rate) to 6e-17; the range over Q is 10^(1/6) either way |
| (a5) the zone along a MIST track | the 1 solar-mass track at 1.0, 4.57 and 8.0 Gyr against the oracle, which decodes the pack's columns itself: 0 in luminosity and temperature, 1.4e-16 in the four edges (bound 1e-9); the 0.2 and 0.5 solar-mass tracks the same; the last stored age of the 0.2 solar-mass track is accepted and an age 1e-12 beyond it refused |
| (b1) the Sun against the published edges | 0.7503 AU against 0.75 (0.04 percent), 0.9813 against 0.99 (0.88 percent), 1.6886 against 1.70 (0.67 percent), 1.7658 against 1.77 (0.24 percent); bound 1.5 percent |
| (b2) the existing authority | 41 temperatures, six stars in both zone models and six orbits: identical to `js/habitability.js` to the last bit |
| (b3) the model star | luminosity 0.7475 and 1.4541 of its 4.57 Gyr value at 1 and 8 Gyr against the analytic solar-model fit's 0.7619 and 1.4290 (1.9 and 1.8 percent, bound 5); ZAMS 0.746 against 0.714 (4.4 percent, bound 10); **the track's luminosity at 4.57 Gyr is 1.108, 10.8 percent above the Sun's (bound 15)**; the conservative zone moves outward: inner edge 0.895, 1.029, 1.239 AU, outer edge 1.541, 1.767, 2.128 AU |
| (b4) locking | Earth-like planet (k2 0.3, Q 100, 10-hour initial spin): the locking radius is 0.474 AU at 4.5 Gyr around the Sun (the Earth at 1 AU is outside), 0.238 AU around Proxima Centauri against b at 0.0485 AU (inside), 0.231 AU around TRAPPIST-1 against h at 0.0619 AU (inside); the inner edge of the 0.2 solar-mass track's zone at 5 Gyr (0.074 AU) is inside its locking radius (0.282 AU) and that of the 1 solar-mass track at 4.57 Gyr (1.029 AU) is outside its radius (0.475 AU) |
| (b5) the escape bound | not applicable, stated: not built (Prompt 199 verdict B, D-R10-75) |
| (c) | not applicable, stated: no uncertainty estimator to cover |
| (d) | 63 hostile or out-of-domain inputs refused with their codes, among them 2599.999 K and 7200.001 K (and 2600 K and 7200 K accepted), TRAPPIST-1's 2566 K, a 2 solar-mass star at 0.1 Gyr (9,400 K), a band with its edges reversed, an unknown limit, track or age, and a Q the tides kernel refuses |

Things the contract did not settle, decided before the kernel was judged and recorded here so nobody reads them as a
bound that was moved:

- The kernel's first run failed two a3 rows (a band whose edge equals a circular orbit's radius was half-open in
  the kernel and in the oracle's closed form, while the oracle's sampling and `js/habitability.js` include both ends).
  The kernel's rule became "a band includes both its ends" and the oracle's closed form was corrected and its results
  regenerated (one number changed; the correction is in `oracle-provenance.json`). No bound moved.
- `thresholds.json` carries an amendment: "one second past a track's last age" cannot be tested (a second is below the
  spacing of a double at that age); the row uses 1e-12 of the age.
- The three bounds of (b3) were set with the track's values in view, as `thresholds.json` says. The 15 percent bound on the
  model star's luminosity at 4.57 Gyr is the weakest: it is wide enough to hold the measured 10.8 percent, and its only
  purpose is to make the kernel carry the statement that this star is not the Sun.
- Tier (b4) is inequalities typed from expectations in the literature, not values; the constant-Q model fixes the
  locking radius to a factor 2 or so through k2/Q, which the range returned beside it states, and every inequality here
  holds by more than that factor (the nearest, Earth at 1 AU against 0.474 AU, by 2.1; the 0.2 solar-mass zone against 0.282 AU, by 3.8).

## What is not built (the rest of Prompt 205)

The kernel, its validation and the document are here. Not built in this part: the panel's limit toggles, locking
bar and age selector (an instrument change to `js/habitabilityWidgets.js` and the deferred catalogues, English and
Spanish), the Goldilocks lesson's upper depth (limits, locking, the zone at three ages), and the reading step on why a
climate trajectory is not built. The escape bar is dropped by verdict B. A majors investigation, "A planet's climate
over time", is deferred, not built: it would resume only with a vetted evolving-climate model (D-R10-205-01).
