# Observing strategy: cadence, aliasing and window functions

Roadmap III, Prompt 214 (tranche T3, D-R10-207-01). Branch `feat/observing-strategy`. The kernel is
`js/kernels/strategy/`; the planner's extension is `js/instruments/strategy.js` (over `js/observingWindow.js` and the instrument
library, both unchanged); the instrument is the `strategy-planner` panel (`js/strategyWidgets.js`); the investigation is
"Why the Period Is Wrong" with an upper depth added to "Design the Schedule". The validation contract below was committed (with
`tests/fixtures/strategy/thresholds.json`) before the kernel, the adapter, the oracle, the panel or any lesson change existed.

## What this adds, and what already existed (the delta table)

| Existing authority | Missing behaviour | Adopter | Duplication removed |
|---|---|---|---|
| `js/rvSchedule.js`: `spectralWindow`, `phaseCoverageDetail` (page-level, clamped, plotted); `js/kernels/variables/period.js`: `periodogram`, `aliasPeriods` (one comb, one frequency); `js/observingWindow.js`: `observingNight`, `observingRun`; `js/instruments/planner.js`: `observingRunAt` | the window of a pattern through the periodogram family; aliases against the sidereal day, the year and the month with each one's height; a verdict (resolved, ambiguous, not constrained) with its alias list; the phase coverage of a period and a cadence; a multi-night plan with its cost in hours; a seeded weather loss | the strategy panel, "Why the Period Is Wrong", the upper depth of "Design the Schedule", Prompt 215's survey design | none removed: the existing functions stay as they are and the kernel's window is tested equal to `spectralWindow` on its grid (A4), its alias positions equal to `aliasPeriods` (A5) |

## Equations, limits, assumptions

1. **The window.** For epochs `t_j` (j = 1..N), `W(f) = (1/N) sum_j exp(-2 pi i f (t_j - tbar))` and the window power is `|W(f)|^2`;
   `W(0) = 1` always. Regular epochs `D` apart give the Dirichlet kernel `[sin(pi N f D) / (N sin(pi f D))]^2`; M samples `d` apart in
   each of K nights `D` apart give the product of two Dirichlet kernels exactly. An evenly spaced pattern has `|W| = 1` at every
   `k / D`: a signal at `f0` and at `f0 + k / D` are the same signal.
2. **What the search sees.** The Lomb-Scargle power with a floating mean (Zechmeister and Kuerster 2009; the `periodogram` of
   `js/kernels/variables/period.js`) of a unit noise-free sinusoid at `f0` sampled at the pattern: 1 at `f0`, and at an alias about
   `|W(f - f0)|^2`. For `f0 T >> 1` the two agree closely; they are not the same function (the floating mean and the negative-frequency
   image), so the panel shows both and A7 holds their difference.
3. **The combs.** One visit a night from one site recurs at the *sidereal* day, not the solar day: the target's window opens
   `0.9972696` days later each night, a comb at `f_s = 1.0027379` cycles per solar day. The year enters because the sidereal day
   is the solar day less one part in 365.2422; a campaign over several seasons has window peaks at `k f_s +/- m / 365.256`; a
   campaign that avoids the Moon has a comb at `1 / 29.5306`. The alias frequencies of `f0` are `|f0 + k f_s + m f_y|`.
4. **The verdict.** For a sinusoid of amplitude `A` in white noise `sigma` the chi-square advantage of the true frequency over an
   alias whose response power is `p_a` is `Delta chi2 = N (A / sigma)^2 (1 - p_a) / 2`. The cadence is **ambiguous** when the
   smallest advantage over the aliases in the searched band is below 9 (a three-sigma preference); it is **resolved** otherwise.
   It is **not constrained** when the baseline is shorter than two periods, and **refused** for fewer than three distinct times, a
   bad period, a non-finite time or a non-positive amplitude to noise. The verdict is a sinusoid's: a sharp eclipse has harmonics
   that the criterion does not read.
5. **The period's uncertainty.** `sigma_f = sigma / (pi A sqrt(2 sum_j (t_j - tbar)^2))`, the Cramer-Rao bound for the frequency of a
   sinusoid (for regular epochs it is the Montgomery and O'Donoghue 1999 form `sqrt(6/N) sigma / (pi T A)`), and `sigma_P = sigma_f P^2`.
6. **Phase coverage.** The phases `frac((t_j - t0) / P)`, the largest circular gap between them and the fraction of `M` phase bins
   holding a point. Epochs `D` apart with `D / P = p / q` in lowest terms visit exactly `q` phases.
7. **The plan.** For each night the planner's usable intervals (target above the airmass limit, Sun below the twilight limit, Moon
   beyond its separation limit); `m` visits a night, each `d = exposure + overhead` long, spread over the window or spaced `s` hours
   apart; a visit that does not fit is dropped and reported. The cost is the requested hours `sum (exposure + overhead)`, the hours
   lost to weather, the hours executed and the window hours available.
8. **The weather.** A two-state Markov chain per night with clear fraction `p` and persistence (lag-1 autocorrelation) `rho`:
   `P(clear | clear) = p + rho (1 - p)`, `P(clear | cloudy) = p (1 - rho)`, the first night drawn from the stationary distribution. It is
   a seeded loss on the `experiments` stream, never a forecast, and says so.

Assumptions: nights are lost whole; no seeing model; the Moon only through the planner's separation limit; the noise is white and
the signal a sinusoid. **Physical domain**: periods from 0.05 to 1000 days; a target must rise above the airmass limit for a plan to
have times.

## Validation contract (committed first)

Seeds: oracle 214; harness 2140001; ensemble prefix `strategy-214`. Bounds are in `tests/fixtures/strategy/thresholds.json`; this
table is its summary and the file wins.

| Id | Leg | What is held |
|---|---|---|
| A1 to A5 | (a) analytic | Dirichlet and nested windows to 1e-12; the comb's exact peaks and nulls; equality with the existing `spectralWindow`; alias positions against the closed form and `aliasPeriods` |
| A6, A7 | (a) analytic | an exact comb is a tie at every alias; an injected period is recovered, and its aliases appear where and as high as predicted |
| A8 to A11 | (a) analytic | rational cadence fills exactly q phases; a hand-worked cost; every visit inside a usable interval; the target's hours against the closed form 2H/15 |
| A12 | (a) analytic | the weather chain's stationary fraction and lag-1 autocorrelation, determinism and fork independence |
| B1, B2 | (b) oracle | Astropy's `LombScargle` 6.0.1 (an independent, cited implementation) and a direct numpy sum, pinned in `oracle-results.json` |
| B3 | (b) oracle | Astropy's highest peaks sit at the true frequency and the predicted aliases, at the predicted heights |
| C1, C2 | (c) coverage | the 1.96 sigma_f interval covers the truth in 0.91 to 0.99 of 300 series; a 'resolved' verdict picks a wrong lobe in at most 3 percent |
| C3 | (c) coverage | a near-exact comb is called ambiguous in at least 95 percent and its alias list covers the wrong peaks in at least 95 percent |
| C4 | (c) coverage | the weather loss's mean executed fraction within 0.02 of the clear fraction |
| D1 to D6 | (d) negative | a perfect comb is ambiguous (tie), a broken comb resolved, five refusal codes, a baseline under two periods, no window, a visit longer than the window |
| E1 | (e) authentic | SU Dra TESS sector 15 (in the repository): sampled once per sidereal day, its top three peaks sit at f0 or a predicted alias |
| P1 | timing | 200 x 4000 window in 250 ms; a 30-night plan in 3000 ms |

A crossed bound is a failed leg, left failing in `tests/fixtures/strategy/failed-legs.json` and labelled; only Carl resets one.

## Results (all 27 legs pass; `failed-legs.json` is empty)

Run with `npm run strategy:validate` (`--json` for the figures). Measured on the Mac, Node 22, seeds as above.

| Id | Measured | Bound |
|---|---|---|
| A1, A2 | Dirichlet and nested windows 3.8e-13 and 1.7e-13 | 1e-12 |
| A3 to A5 | comb peaks and nulls exact; equal to `spectralWindow` to 2e-15; alias positions equal to the closed form and `aliasPeriods` (200 cases) | exact or 1e-12 |
| A6, A7 | exact comb: every alias at power 1 to 2e-16; injected period within 0.016 resolution units, alias heights within 0.003 | 0.25 units, 0.05 |
| A8 to A11 | rational phases to 1e-15; hand-worked cost 0.625 h requested, 0.375 h executed; no second outside a usable interval; target hours within 0.0002 h of 2H/15 | exact or 1e-3 h |
| A12 | clear fraction 0.600 (standard error 0.0027), lag-1 autocorrelation 0.508 against 0.5 | 4 standard errors, 0.05 |
| B1, B2 | Astropy 6.0.1 `LombScargle` 4.9e-11; numpy window 5.0e-11 | 1e-6 |
| B3 | Astropy's three highest peaks at the true frequency or a predicted alias in every pattern, within 0.021 resolution units, heights within 2.3e-11 on the combs | 0.25 units, 0.05 |
| C1, C2 | 1.96 sigma interval covers 0.936 of 300 series; 'resolved' picks a wrong lobe 0.0034 (298 resolved) | 0.91 to 0.99; 0.03 |
| C3 | alias list covers 0.986 of the wrong peaks; every near-exact comb called ambiguous | 0.95 |
| C4 | mean executed fraction 0.598 against a clear fraction of 0.6 | 0.02 |
| D1 to D6 | perfect comb ambiguous at the 4.044 d alias; broken comb resolved (smallest advantage 370); four refusal codes plus the sixth in D5; baseline under two periods not constrained; never-up and all-lost refused; a visit longer than the window dropped | as written |
| E1 | SU Dra TESS sector 15 (the repository's pack): 26 sampled epochs, baseline 25.93 d; the top three peaks within 0.218 resolution units of f0 or a predicted alias | 0.25 units |
| P1 | window 200 x 4000 in 32 to 59 ms; 30-night plan 148 to 354 ms (the larger figures under load) | 250 ms; 3000 ms |

### Findings

1. **The periodogram's sidelobes are not the window's.** The Lomb-Scargle response of a real sinusoid has a negative-frequency image, so at an alias its power is the
   coherent sum of the window at `f - f0` and at `f + f0`, up to `(|W1| + |W2|)^2`; on the random-pattern case (`lcg`) the highest sidelobe is 0.21 where the window's is 0.074.
   Amendment AM3 (below) records the consequence for leg B3: on a random pattern the alias comparison is a weak test (about 30 percent of frequencies fall within the
   tolerance by chance), and that leg's strength is the three nightly patterns. The panel shows the response and the window separately for this reason.
2. **An exact comb is a tie, not a near miss.** On a sidereal nightly pattern every alias has power 1 to within 1e-5, so which of them a search returns is decided by the fifth
   decimal (AM1).

### Amendments (all recorded in `thresholds.json`; no bound moved)

- **AM1** (before the kernel existed): B3's alias set is every integer `k` that puts `|f0 + k f_s|` in the grid, not `k = -2..2`.
- **AM2** (kernel existed, check not yet run): A10's named sites La Silla, Mauna Kea and Haleakala are not in the instrument library and nothing may be typed from memory; the check
  uses the library's Cerro Tololo and McDonald sites. The constraint is unchanged.
- **AM3** (kernel existed): B3 compares against every local maximum of the window, not those of height 0.1 or more (an unstated choice of the harness); the leg passes at 0.237
  of 0.25 on the random pattern. See finding 1.
