# X-ray counts: kernel and validation (Prompt 243)

Rates, hardness, outbursts and periods from a series of counts, with the contract that makes them claims. This is the kernel
part of Prompt 243 (an invisible pull request: no page, no panel, no lesson, no pack, no instructor material, nothing a student
sees). It adds `js/kernels/xray/`, its validator `tools/xray-validate.mjs` and scenes `tools/xray-scenes.mjs`, an independent
oracle `tools/xray-oracle/`, a validation group of six checks, and the fixtures under `tests/fixtures/xray/`. The contract,
the gate, the verdicts and the files requested from Carl are in `X_RAY_COUNTS_GATE.md`. The light-curve workspace's counts mode,
the investigations ("A star that eats", "Spin of a neutron star") and the model-page section are a separate pull request that
waits for Carl's go-ahead and for the consumers rule of the gate.

The validation contract was committed first, in `tests/fixtures/xray/thresholds.json`, before any kernel, oracle output, series
or result existed. This document was written after it. A crossed bound is a failed leg and stays failing; only Carl resets one.
**The recorded run has four failing legs (A4, B6, C3, C5), explained below and left failing.**

## What is built and what is not

Built: (1) the counts-series contract and its refusals by code; (2) the Poisson rate with its exact interval, and the net rate
with a background region (a profile interval); (3) binning by counts that conserves counts and exposure and never crosses a
gap; (4) the hardness ratio with an exact interval on source-region counts and a profile interval for the background-subtracted
form; (5) hardness-intensity points; (6) outburst detection by a stated rule with a refusal; (7) the period search on unevenly
sampled counts with gaps, significance by simulation, a period interval by a parametric bootstrap, the alias flag and the
periodic-background flag; (8) a labelled synthetic generator with a truth manifest and an exact Poisson sampler.

Not built, on purpose: any real product, pack or catalogue subset (none supplied, nothing fetched); the period change of a
pulsar; pulse-profile or epoch-folding estimators; event-list input (the contract is for binned counts); a response-weighted
hardness or a flux; a classification of an X-ray binary's state; a mass function or a compact-object mass; any lesson, panel or
model-page section; the instructor materials. The kernel is `NEVER_PRECACHED`: no shipped module imports it and the idle
precache has no room (checkpoint IV, term 2).

## Delta table (7.5, rule 9)

| Existing authority | Missing behaviour | Adopter | Duplication removed |
| --- | --- | --- | --- |
| `js/kernels/statistics/` (`poissonInterval` Garwood, `chi2Quantile`, `betaI`, `lnGamma`) | an exact interval at every count (the default switches to a profile interval at 100 counts), a net rate with a background region, a hardness interval | this kernel | none: the exact interval is the statistics kernel's own function with `method: 'garwood'` |
| `js/measure/periodogram.js` (GLS, its grid, its refinement) | Poisson weights from a null model, a significance by simulation, a fast path for thousands of simulations | `searchPeriod` here | none: the statistic and the grid are the module's, and B3 holds the kernel's power and peak to it and to astropy |
| `js/random/streams.js` (`stream('noise', ...)`) | an exact Poisson sampler (the detector kernel's sampler is Gaussian above 30) | `poissonDraw` here | none |
| `js/inference/fit.js`, `js/kernels/statistics/` selection | not needed by this kernel | none | none |

## The Poisson rate and the net rate

`rate` returns, per live bin and pooled, `counts / exposure` with the exact Garwood interval at level 0.6827 unless stated
(`method: 'poisson-garwood'`). At no counts the interval is `[0, -ln(alpha) / T]`, not a point. `netRate` models `N_s ~
Poisson(T (S + r B))`, `N_b ~ Poisson(T_b B)` with `S >= 0` and returns the constrained estimate `max(0, N_s / T - r N_b / T_b)`
and the set where the profile deviance, the background maximised, is at most the chi-square quantile on one degree of freedom.
That interval is **not exact**: C3 measures its coverage at level 0.95 on a grid of net rates and backgrounds, 0.872 at S = 2,
B = 1 against a floor of 0.92 (mean 0.951). Until Carl rules, a background-subtracted rate or hardness is not claimed; the
total-count forms are.

## Hardness

`HR = (H - S) / (H + S)` of the source-region counts in two bands, in [-1, 1]. It is a statement about counts: the detector's
response in each band is not modelled and the ratio is not a flux ratio. Total form: conditional on `N = H + S`, `H` is
binomial with `p = H / N`; the interval is the Clopper-Pearson interval of `p` mapped by `HR = 2 p - 1`, exact at every count
(no hard counts gives `[-1, upper]`), with exact coverage at least the level (C1; the mean excess over 0.95 and 0.6827 across
the grid is 0.099, so it is conservative). Net form: the total net rate and both backgrounds profiled out, not exact; C3b
measures coverage 0.913 to 0.946 at level 0.95, above its 0.90 floor, and B6 holds five of its six cases to the independent
oracle (1.1e-8; the sixth has no net counts, below).

## Binning by counts and the hardness-intensity points

Consecutive live bins are merged until the chosen bands' source-region counts reach `minCounts`; no group joins bins whose gap
exceeds `maxGap` (default: the median bin width, so none crosses a good-time gap); counts and exposure are conserved exactly;
the last group of a run that falls short is kept and flagged `short`. A group's exposure is the sum of its members', and its
dead-time statement is `in-exposure`. `hardnessIntensity` bins on the two bands' counts and returns, in time order, each
point's total rate with its Garwood interval and its hardness with its interval. It draws no track and names no state.

## Outbursts

The rule: `q` is the lower quartile of the live bins' rates (AM1: with the median as first committed, "more than half
elevated" is unreachable); a bin is elevated when the Garwood lower bound at level 0.9973 exceeds 3 `q`; a run is three or more
consecutive elevated bins with gaps at most `maxGap`; if more than half of the live bins are elevated the search is refused
(`noQuietLevel`), because a source bright most of the time does not "outburst" by this rule. A6 recovers a fast-rise exponential
decay (start exact, stop within 838 s of an analytic end of 18,437.75 s, bound 1000 s), reports no run in 20 constant series
and refuses a series bright for 71 percent of its length.

## The period search

The statistic, grid and refinement are those of `js/measure/periodogram.js` (B3: the power agrees with astropy's generalized
Lomb-Scargle to 5.1e-15, the grid and the peak with the module's). What changes is the noise model: a bin's rate has variance
`lambda / exposure` under the constant-rate null, so the weights are proportional to exposure and fixed before the data are
looked at. **Significance by simulation**: `p = (1 + #{simulated grid maxima >= observed}) / (nSim + 1)`, each simulation
Poisson counts at the same times, gaps and exposures; the whole grid is the trials, so `p` is global; the smallest `p` is
`1 / (nSim + 1)` and is returned as `smallestP`. The asymptotic formula of the existing module is not used and the result
carries no `falseAlarm` field (A4, D4). B4 compares the kernel's `p` (999 simulations) with an independent implementation (its
own generator, 19,999 simulations) on six series: all inside four binomial standard errors. C4: 200 constant series, 4 percent
reach p <= 0.05 and none reaches p <= 0.01.

The fast path stores `cos` and `sin` of every (bin, frequency) once, because the weights are fixed, and a simulation costs two
dot products per frequency. The product of bins and frequencies is capped at three million (`tooLarge`).

`periodInterval` is a parametric bootstrap: the best sinusoid plus a constant is the model, 200 Poisson series are drawn from
it at the observed times and exposures, each is searched within two frequency resolutions of the best frequency, and the
interval is the central percentile range of the periods. C5 measures its coverage on 100 orbit-scene series at level 0.6827:
0.54, just below the committed band 0.55 to 0.82 (below).

**Alias.** The sampling has its own frequencies, the peaks of the window `|sum w exp(2 pi i f t)|^2` of at least 0.25. A
candidate within `1/T` of one is flagged `atSampling`; a candidate with another strong peak (at least 0.8 of the top) such that
their difference or sum is within `1/T` of a sampling frequency is flagged `aliasPair`, with its partner. D5 shows both on a
once-per-100-s sampling and no flag on 20 jittered series. **The rule's weakness, measured:** with the orbit scene's eight
identical gap cycles the alias at 553.7 s was 0.932 of the true peak's height at seed 243100 and was not flagged, because the
committed 0.8 is the only cutoff; A4 fails there and C5 is affected. A lower cutoff, or no cutoff for a gapped design, would
flag it; that is Carl's to set (the bound is committed).

**Background.** The same search (199 simulations) on the background region's counts; flagged `backgroundPeriodic` when `p <=
0.01` and the best frequency is within two resolutions of the source's. D6: 5 of 5 periodic-background series flagged, 0 of 5
periodic-source controls.

**Barycentric times.** The contract requires `barycentric` stated; a period search on times that are not stated barycentric is
refused (D3), and the message names the correction.

## Synthetic data

`makeSyntheticSeries` draws exact Poisson counts of stated rates at the bin midpoint (a constant net rate per band, a sinusoidal
modulation with a seeded phase, a fast-rise exponential-decay outburst, a step, a background region with its own modulation),
with invented good-time intervals, exposure, dead time and bands, and returns the truth beside the series. Its label begins
`SYNTHETIC COUNT SERIES`, and every record the kernel returns from it carries `synthetic: true` and the label (D7). The same
counts with `synthetic: false` return no flag; that is a leg's control, not a way to launder a series.

## Validation contract and measured table

Node 22.23.4. Oracle: Python 3.9.22 (`/usr/local/bin/python3.9 -I`), numpy 1.25.2, scipy 1.13.1, astropy 5.3.2 (pinned in
`oracle-results.json`). `npm run xray:validate` is about 40 s of CPU.

| Leg | What | Result |
| --- | --- | --- |
| A1 | Garwood closed forms (`[0, ln 40 / 10]`, `-ln 0.975`), refusals, label | pass (worst 1.1e-5 of its bound) |
| A2 | hardness closed forms, mirror, refusal at no counts | pass (mirror 6.7e-16) |
| A3 | binning conserves counts and exposure, gaps, greedy minimality | pass (78 groups, 6 short) |
| A4 | period recovery, 20 seeds, simulated significance | **FAIL**: 19 of 20; seed 243100 at the alias, unflagged, true peak 0.932 of top |
| A5 | hardness recovery at 3000 counts | pass (5 of 5 inside at 0.9973, half-width 0.055) |
| A6 | outburst start, stop, no false run, refusal | pass |
| B1 | Garwood against scipy chi-square, 1818 intervals | pass (1.8e-14) |
| B2 | Clopper-Pearson against scipy beta, 180 intervals | pass (7.1e-15) |
| B3 | GLS power against astropy, grid and peak against `periodogram.js` | pass (5.1e-15; peak 3e-8 of a step) |
| B4 | simulated significance against 19,999 independent simulations | pass (6 of 6) |
| B5 | net-rate profile against scipy, 24 intervals | pass (1.2e-14) |
| B6 | net hardness against scipy | **FAIL**: the sixth case has no net counts (kernel refuses; oracle returns noise); the other five 1.1e-8 |
| B7 | pinned period and hardness from a cited timing package on a product | NOT RUN (no file) |
| C1, C1b, C2 | exact coverage of hardness and rate intervals; end to end | pass (min slack 8.6e-3 and 4.1e-4; 0.983, 0.9655, 0.955) |
| C3 | net-rate profile coverage, floor 0.92 | **FAIL**: 0.872 at S = 2, B = 1; mean 0.951 |
| C3b | net-hardness coverage, floor 0.90 | pass (0.913 to 0.946) |
| C4 | significance calibration under the null | pass (0.04, 0) |
| C5 | period-interval coverage, band 0.55 to 0.82 | **FAIL**: 0.54 |
| D1 to D7 | refusals, flags, label | pass |
| E0, E1, E2 | authentic products, the pulsar's catalogue value, the transient | NOT RUN (nothing supplied) |
| P1 | CPU time recorded | 38.6 s |

Mutations were not run for this kernel; the legs that would catch a dropped weighting or a Gaussian interval are B1 to B4 and A1.

## Open questions for Carl

See `X_RAY_COUNTS_GATE.md`, "Questions for Carl": the alias cutoff and the orbit scene (A4, C5), the degenerate B6 case, the
net-rate interval's coverage (C3), the files, and the go-ahead for a synthetic hardness-and-outburst lesson.

## Inherited limits to state in claims built on this kernel

Every series is synthetic; the authentic tier is NOT RUN; the kernel verdict is B (no period claims) and the net forms are not
claimable; hardness is a statement about counts, not flux; the period search finds sinusoidal variation and is ambiguous at an
alias where the sampling has a strong window; the period interval is a bootstrap percentile interval whose coverage is just
under its band; no state classification, mass or distance is built or implied.

## References

Garwood, F. 1936, Biometrika 28, 437 (the exact Poisson interval, as `js/kernels/statistics/intervals.js` cites it). Clopper, C.
J. and Pearson, E. S. 1934, Biometrika 26, 404 (the exact binomial interval). Zechmeister, M. and Kuerster, M. 2009, A&A 496,
577 (the generalized Lomb-Scargle, as `js/measure/periodogram.js` cites it).

<!-- Listed in DOCUMENTS.md. -->
