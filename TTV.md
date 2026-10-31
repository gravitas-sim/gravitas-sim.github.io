# Transit timing variations (Prompt 226)

What the O-C diagram of a transiting planet shows, how a transit time is measured, what sets the
length of the wave a second planet writes in it, and what an amplitude can and cannot say about a
mass. Prompt 226 of Roadmap III; the contract and the oracle were committed before any of the kernel
(`tests/fixtures/ttv/thresholds.json`), and the mass question is its own gate
(`TTV_MASS_GATE.md`, `docs/ttv-mass-gate`).

## What was built

- **A transit time from a light curve** (`js/kernels/ttv/measure.js`): a template fit per transit,
  by the inference core's fitter (`js/inference/fit.js`, Prompt 150). The shape of the transit (radius
  ratio, a/R\*, impact parameter, limb darkening) is the true one and fixed; only the mid-time and
  the baseline are fitted, and the time's one-sigma is the core's covariance. The fit says when its
  premise fails (the chi-square of the window against its degrees of freedom, flagged below p =
  0.01) and when its error bar cannot be read as an interval (`regime`: `low-snr` when the fitted
  sigma exceeds half the cadence; see AM1).
- **The linear ephemeris and the O-C diagram** (`ephemeris.js`): the weighted straight line
  T0 + nP and the residuals; a verdict (`signal`, `no-signal`) from the chi-square of the residuals
  at p = 0.01.
- **The super-period and the amplitudes** (`superperiod.js`): `P_super = 1 / |j/P2 - (j-1)/P1|`
  and the first-order amplitudes of Lithwick, Xie and Wu (2012, ApJ 761, 122), equations 1, 8 and 9,
  with the Laplace-coefficient combinations f and g of Murray and Dermott (1999), and the domain
  outside which the relation refuses: more than 0.1 from a first-order resonance, or inside its
  width (|Delta| below (mu1 + mu2)^(2/3)).
- **A sinusoid fit and its verdicts** (`analysis.js`): a line plus one sinusoid, scanned over the
  period (the period is the only non-linear parameter), with the period's one-sigma (the span within
  delta chi-square 1, scaled by the reduced chi-square when the sinusoid is not a perfect model) and
  the statements a panel needs: no signal above noise, or a signal the record is too short to
  resolve (fewer than 1.5 cycles of the reported or expected period).
- **The engine as the forward model** (`forward.js`): two planets and a star integrated by
  `js/physics.js` (Velocity Verlet, 2000 steps per inner period), the transit read as the moment the
  planet is in front of the star. The engine is injected, so the kernel stays pure.
- **Synthetic windows** (`synthetic.js`) with the seeded `noise` stream of Prompt 149 and their
  truth manifest.
- **A mass from an amplitude, under a stated assumption** (`mass.js`; the gate's verdict B): only for
  a pair assumed circular, labeled as that assumption, with the measurement and the first-order
  relation's committed accuracy in its edges. `amplitudeSpread` shows how far the same masses'
  amplitude moves for a given free eccentricity. The degeneracy interval for a declared bound on the
  eccentricity is not a bound the kernel gives.
- **Two panels** (`js/ttvWidgets.js` over `js/ttvField.js`): one transit's window and fit, and the
  O-C diagram with the fitted sinusoid, the cited relation and the mass view.
- **The investigation The Clock That Drifts** (`js/data/investigations/ttv-sequence.js`, the one
  closure file the prompt adds, D-R10-226-05): eight core steps (a transit time and its error bar,
  a steady clock, a prediction, the wave read from the panel, a pair that writes none), four
  quantitative (the beat of two clocks, a three-to-two pair, which planet swings more, a record too
  short) and four advanced (a mass if the orbits are circular, what an eccentricity does, the other
  planet, what an amplitude cannot say), in English and Spanish.
- **The model page** (`/model/`, section "Transit timing variations").

Not built: TTVs inside the resonance width, three or more planets, a third body, light-travel time or
apsidal precession; a fit of masses and eccentricities to the full complex amplitudes of both planets
(published analyses do that); a three-dimensional geometry (the engine is planar, so a light curve's
impact parameter is an input of the template, not a result of the orbit); the degeneracy interval as a
bound; a **new sandbox scenario**. The roadmap asks for "the sandbox scenario linked": the lesson's
systems are made by the engine's own two-planet run and shipped as pinned transit times, and the
Sandbox's existing scenarios either switch mutual gravity off (TRAPPIST-1) or are exactly resonant
(Pluto and Neptune); a new preset touches about twenty shared files and the world golden, and is left
as a separate decision (D-R10-226-02).

## Data

Everything is **synthetic**. The three systems of `thresholds.json` (S1 near 2:1, S2 near 3:2, S3 far
from resonance; both planets circular at the start, masses 10 and 15 Earth masses around a star of one
solar mass) are integrated by the engine; each transit gets a seeded window of light curve at 100 parts
per million per two-minute point and the kernel's template fit measures it. `js/data/ttvPack.js` holds,
per transit, the engine's true time, the measured time and its one-sigma, and is **generated** by
`tools/ttv-pack.mjs` (`--check` fails if it is not what the engine makes). No star was observed.

Leg **E1**, a published Kepler system's O-C from its published transit times, was **not run**: the
times of Kepler-9 b and c (Holczer et al. 2016, ApJS 225, 9, VizieR J/ApJS/225/9) were requested of
the coordinator, whose fetch failed (the VizieR hosts could not be reached) and the NASA Exoplanet
Archive has no TTV table; nothing was typed from memory and nothing was simulated in its place.

## Units

One time unit is called one day, G = 1 and the star is 1000 mass units; by Newtonian scale invariance
only the period ratio, the mass ratios mu = m / M\* and the phases matter, so the engine and the oracle
agree in these units and a mass is turned into Earth masses for a star **stated** to be one solar mass.

## Validation contract

`npm run ttv:validate` prints the table; `-- --write-failed` and `-- --write-results` rewrite
`failed-legs.json` and `results.json`, which `tests/ttv.test.js` holds the code to (the quick legs A
and B run live in a child process; the ensemble legs take about 25 CPU minutes and are pinned). The
oracle (`tools/ttv-oracle/oracle.py`: numpy and scipy `solve_ivp` DOP853 at rtol 1e-12; no Gravitas code)
integrated the same three systems and pinned its transit times and its own implementation of the two
relations in `oracle-results.json` **before the kernel existed**. Every bound was committed first. One
exploratory probe preceded the contract and is disclosed in it.

| Leg | Verdict | Measured |
| --- | --- | --- |
| A1 | PASS | `{"fitted":346.3,"cited":346.2,"relativeError":0.0001232,"status":"ok"}` |
| A2 | PASS | `{"fitted":174,"cited":173.8,"relativeError":0.0007951,"status":"ok"}` |
| A3 | PASS | `{"inner":346.3,"outer":346.8,"relativeError":0.001595}` |
| A4 | PASS | `{"S1":{"innerFormula_d":0.003424,"innerMeasured_d":0.003267,"innerError":0.04805,"outerFormula_d":0.001308,"outerMeasured_d":0.001124,"outerError":...` |
| A5 | PASS | `{"2:1":{"f":-1.19049,"g":0.42839,"relativeError":3.335e-05},"3:2":{"f":-2.02522,"g":2.48401,"relativeError":3.407e-07}}` |
| B1 | PASS | `{"maxAbsDiff_d":6.111e-06,"perPlanet":{"S1.inner":5.321e-06,"S1.outer":1.931e-06,"S2.inner":6.087e-06,"S2.outer":6.111e-06}}` |
| B2 | PASS | `{"maxAbsDiff_d":9.382e-08}` |
| B3 | PASS | `{"worstRelative":6.861e-14,"perSystem":{"S1":{"superPeriod":4.774e-15,"inner":4.33e-15,"outer":4.441e-15},"S2":{"superPeriod":5.795e-14,"inner":6.5...` |
| B4 | PASS | `{"maxAbsDiff":7.648e-13}` |
| C1 | PASS | `{"n":3240,"coverage1":0.633}` |
| C1b | PASS | `{"n":3240,"coverage1":0.6846}` |
| C2 | FAIL | `{"n":3240,"coverage2":0.8759}` |
| C2b | PASS | `{"n":3240,"coverage2":0.9472}` |
| C3 | FAIL | `{"mean":0.03481,"sd":1.397}` |
| C3b | PASS | `{"mean":0.01501,"sd":1.023}` |
| D1 | FAIL | `{"noSignal":24,"of":80}` |
| D1b | PASS | `{"noSignal":76,"of":80}` |
| D2 | FAIL | `{"signal":68,"of":80}` |
| D2b | PASS | `{"signal":80,"of":80}` |
| D3 | PASS | `{"flaggedFraction":1,"n":100}` |
| D4 | PASS | `{"status":"unresolved","cycles":0.6651,"baseline_d":230}` |
| D5 | PASS | `{"status":"refused","reason":"far-from-resonance","delta":0.3497}` |
| D6 | PASS | `{"reason":"inside-resonance-width","delta":0.0005,"width":0.001533}` |
| E1 | NOT-RUN | Kepler-9 transit times (Holczer et al. 2016, VizieR J/ApJS/225/9) were requested of the coordinator, whose fetch failed (VizieR hosts unreachable);... |
| R1 | PASS | `{"n":6480,"lowSnrFraction":1}` |
| R1b | PASS | `{"n":6480,"lowSnrFraction":0}` |

21 pass, 4 fail, 1 not run.

## Failed legs, and the amendment

Four legs crossed a committed bound and **stay failing and labelled** in `tests/fixtures/ttv/failed-legs.json`
(only Carl resets a bound): C2 (two-sigma coverage 0.876 against 0.9545 +/- 0.03), C3 (normalized-error
sd 1.397 against 1 +/- 0.1), D1 (the flat O-C called a signal in 56 of 80 trials at 400 ppm, bound 0.95 clean) and D2
(signal found in 68 of 80, bound 0.95). The cause is one: at 400 ppm the template fit's curvature error bar is
as long as the 2-minute spacing, and the estimator scatters 1.4 times wider than it says, with heavy tails
(C1 passed narrowly, 0.633).

**Amendment AM1**, committed to `thresholds.json` before any 100 ppm run, adds the legs C1b, C2b, C3b, D1b, D2b
at 100 ppm with the same bounds, and R1, a regime flag (`low-snr` when sigma exceeds half the cadence). It
does not move any bound and does not replace an original, which stays failing. All six amended legs pass (C1b 0.685, C2b 0.947,
C3b sd 1.023, D1b 76 of 80, D2b 80 of 80, R1 1.00 and R1b 0.00 low-snr fractions). The lesson's pack and panels
default to 100 ppm and the panel says when a bar is only a lower bound. **E1** (the published Kepler-9
O-C, bound 10 percent) is **NOT RUN**: Holczer et al. (2016, VizieR J/ApJS/225/9) was requested and could not be
supplied, so the kernel is validated against the engine and an independent integrator only, never against a
star.

## What the numbers say

- **The engine and the relations agree.** The engine's O-C periods agree with the cited super-period to
  0.01 percent (S1) and 0.08 percent (S2); the first-order amplitudes agree with the engine's to 5 and 16
  percent (S1 inner and outer) and to 1 and 6 percent (S2), the outer planet's worse because its g
  coefficient is small and the free eccentricity that a circular start leaves matters more.
- **The engine and the oracle agree** to 6 microdays on the O-C (the budget was 250), so the forward
  model's second-order integrator is not what limits anything here.
- **Transit-time intervals are calibrated only when the timing precision is a fraction of the
  cadence.** At 400 ppm the fitted sigma (0.0014 d, the analytic Cramer-Rao value) is as long as one
  2-minute cadence and the estimator's actual scatter is 1.37 times larger with heavy tails: the legs
  fail and stay failing. At 100 ppm they cover. The kernel therefore marks a window whose sigma exceeds
  half the cadence as `low-snr`, and the panel tells the reader the bar is then a lower bound.
- **A signal verdict inherits the error bars.** With understated errors a flat O-C is called a signal;
  the legs D1 and D2 show it at 400 ppm and pass at 100 ppm.
- **Refusals.** A record under 1.5 cycles gives no period; a pair far from resonance or inside its
  width gets no relation.

## Part B: a mass from an amplitude

`TTV_MASS_GATE.md` (verdict **B**): the committed degeneracy interval covers but its edges were 4.19
times apart against a bound of 4, so only the circular mass ships, labeled. The upper depth of the
investigation teaches the degeneracy by showing how far the amplitude moves, for the same masses, for an
eccentricity combination |Z| (45 percent either way at 0.01 for the inner planet, -73 to +127 for the
outer).

## Files

`js/kernels/ttv/`, `js/ttvField.js`, `js/ttvWidgets.js`, `js/i18n/{en,es}.ttv.js`, `js/data/ttvPack.js`
(generated), `js/data/investigations/ttv-sequence.js` and its one-line loader files,
`tools/ttv-validate.mjs`, `tools/ttv-pack.mjs`, `tools/ttv-oracle/oracle.py`, `tests/ttv.test.js`,
`tests/ttvLessons.test.js`, `tests/fixtures/ttv/`, `e2e/ttvLesson.spec.js`.
