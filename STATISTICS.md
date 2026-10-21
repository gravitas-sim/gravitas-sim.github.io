# Statistics kernel

`js/kernels/statistics/` is the statistics the fitting workflows of Roadmap III
consume, on top of the fitter that already exists. `js/inference/fit.js` stays
the fitting authority: it supplies the covariance, the profile of chi-square
and the crossing. What it lacks, and this adds (Prompt 154, decision D-R10-31 in
`DECISION_REGISTER.md`), is the statement of what an interval is and how it was
made, resampling and Monte Carlo propagation on named random streams, residual
diagnostics, a comparison of two estimates that share data, the F-test with its
refusals, and the selection function as a first-class object with the Eddington
and Malmquist biases as measured differences.

It is a small library of bounded, deterministic methods. It is not a sampler, it
has no priors beyond a model's bounds, and it does not average models.
D-SAMPLER-01 and D-KERNEL-01..03 stand.

## What each module holds

<!-- statistics-exports:begin -->

| Module | Export | Contract | Consumers |
| --- | --- | --- | --- |
| `special.js` | `lnGamma` | ln Gamma(x) for x > 0, Lanczos; NaN outside | 261 |
| `special.js` | `gammaP`, `gammaQ` | Regularised incomplete gamma P and Q; NaN outside a > 0, x >= 0 | 261 |
| `special.js` | `betaI` | Regularised incomplete beta I_x(a, b); NaN outside 0 <= x <= 1, a, b > 0 | 261 |
| `special.js` | `normalCdf`, `normalSf`, `normalQuantile` | The standard normal CDF, its survival function (a p value keeps its digits at 12 sigma; `1 - CDF` is 0 from 8) and the inverse (bisection); the quantile of 0 and 1 is minus and plus infinity | 190, 261 |
| `special.js` | `chi2Cdf`, `chi2Sf`, `chi2Quantile` | Chi-square on k degrees of freedom | 190, 256, 261 |
| `special.js` | `tCdf`, `tSf`, `tQuantile` | Student t on nu degrees of freedom; `tSf` is the p value without the cancellation | 190, 261 |
| `special.js` | `iterationStats`, `ITERATION_CAP` | The most iterations each series or continued fraction has needed, and the cap (100,000); a guard test holds the first under 2,000 | 261 |
| `special.js` | `fCdf`, `fSf`, `fQuantile` | The F distribution; `fSf` is the p value without the cancellation of 1 minus the CDF | 261 |
| `intervals.js` | `METHODS` | The ids an interval can carry as its label, with their labels and the sentences each assumes | 190, 217, 225 |
| `intervals.js` | `levelOfSigma`, `sigmaOfLevel` | A coverage and the number of sigmas of a central normal interval, erf(k / sqrt 2) and its inverse | 190, 225 |
| `intervals.js` | `covarianceInterval` | value +- z sigma, labelled `covariance`; refused for a sigma that is missing, negative or not finite | 190, 225 |
| `intervals.js` | `profileInterval` | Where a chi-square profile stays within Delta chi-square of its minimum, by fit.js's `crossing`; a coverage sets Delta from chi-square on one degree of freedom, or Delta = 1 sets the coverage (68.27%); a side never reached is open (null) and flagged | 190, 217, 225, 256 |
| `intervals.js` | `studentInterval` | The t interval of a mean | 190, 261 |
| `intervals.js` | `poissonInterval` | A Poisson rate (sum of counts over total exposure, the exact maximum) and its profile-deviance interval | 229, 264 |
| `intervals.js` | `percentileInterval` | The central interval of draws, from at least 20, labelled with the scheme that made them | 190, 217 |
| `resample.js` | `DRAW_BUDGET`, `StatisticsError` | The default (1,000) and maximum (20,000) draws; a draw count over the maximum throws code `budget`, one that is not a whole number code `draws` | 190 |
| `resample.js` | `caseBootstrap` | Resample the rows with replacement, recompute a statistic; draws from the `noise` stream keyed by the seed; the stream's identity is in the result | 190, 217 |
| `resample.js` | `residualBootstrap` | Hold the fit, resample its residuals inflated by sqrt(n / (n - parameters)), refit | 190, 225 |
| `resample.js` | `propagate` | Draw parameters from a normal with the fitted covariance (Cholesky) and push each through a function; a covariance that is missing or not positive definite is refused | 190, 225, 233 |
| `diagnostics.js` | `normalisedResiduals` | (y - fit) / sigma, or scaled by the residuals' own rms and labelled `estimated` | 190, 217 |
| `diagnostics.js` | `runsPmf`, `runsTest` | The exact distribution of the number of runs; the runs test about the median or a value, exact or normal, with one- and two-sided p values; refused when one sign is absent | 190, 261 |
| `diagnostics.js` | `lagOne` | Lag-one autocorrelation and its z against white noise; refused for a constant series or fewer than three values | 190, 261 |
| `diagnostics.js` | `normalProbability` | Sorted values against normal quantiles at Blom positions, the line and its correlation | 190 |
| `compare.js` | `difference` | A minus B with variance Var A + Var B - 2 Cov(A, B), the covariance used recorded; refused for an impossible covariance; `degenerate` when the two are one function of the same data | 229, 252, 264 |
| `compare.js` | `fTest` | The F-test of nested models; refused with a code for a declared searched parameter or boundary alternative, counts that are not whole numbers (`counts`), a non-finite or negative sum of squares (`input`), both sums zero (`zero-rss`), models that are not nested or a full model that fits worse beyond rounding (`not-nested`), or no degrees of freedom (`no-dof`); a full RSS above the reduced one by rounding only (1e-12 relative) is clamped to F = 0 and says `clamped`; the declarations it was given are in `declared` | 261 |
| `selection.js` | `selection`, `all`, `either` | A selection function: a cut and an inclusion probability on an observable; `all` multiplies independent selections, `either` is 1 minus the product of (1 - p); `apply` returns who is in, their probabilities and weights 1/p | 215, 229, 252, 264 |
| `selection.js` | `logisticCompleteness` | The survey suite's logistic completeness curve | 215, 229 |
| `selection.js` | `completenessCorrect` | n / c with its sampling error for a Poisson or a fixed population; a bin below the completeness floor (0.1) is refused, not corrected | 215, 229, 264 |
| `selection.js` | `eddingtonShift`, `malmquistShift`, `malmquistCutShift` | The closed forms of the biases (below) | 215, 252 |
| `selection.js` | `measuredShift`, `binnedMeanShift` | A bias as a measured difference on a synthetic population, with its standard error | 215, 252 |

<!-- statistics-exports:end -->

Dependencies: `js/inference/fit.js` (`crossing`, so the intervals are the
inference core's own), `js/random/streams.js` (the `noise` stream) and
`js/numeric/linalg.js` (`cholesky`). Nothing here reads a clock or
`Math.random`. Units: none; every function works in the caller's units.

## Equations and limits

**Coverage.** A central normal interval of k sigmas covers erf(k / sqrt 2):
1 sigma is 68.27%, not 68%. The profile interval of one parameter is where
Delta chi-square stays below the chi-square quantile of the coverage on one
degree of freedom: 1.000 at 68.27%, 2.706 at 90%, 3.841 at 95%, 6.635 at 99%.
It describes one parameter at a time; a joint region of p parameters uses p
degrees of freedom and is not offered here.

**Assumptions an interval carries** (every record has them in `assumes`):

| Method | Valid when |
| --- | --- |
| `covariance` | the model is linear in the parameters over the interval; the error bars are right, or were scaled by the reduced chi-square |
| `profile` | Delta chi-square follows chi-square on one degree of freedom: a regular model, the truth inside the bounds; a coverage statement about repeated data, never a posterior probability |
| `student-t` | independent normal values of unknown mean and variance |
| `poisson-profile` | independent counts at one rate, about 10 or more for the chi-square limit |
| `case-bootstrap` | independent rows from one population; a smooth statistic (a mean is; a maximum is not); the percentile interval can under-cover at small n (Efron and Tibshirani 1993), and the case allows for it |
| `residual-bootstrap` | the model is right and the residuals exchangeable |
| `propagation` | jointly normal parameters with the covariance given; a linear function is exact, a strongly non-linear one is only as good as the normal |

**Bootstrap and propagation.** Draws come from the `noise` stream keyed by the
caller's seed and a label, so a seed gives the same draws on every engine. The
draw count is fixed by the caller and capped at `DRAW_BUDGET.max`.

**Diagnostics.** Normalised residuals r = (y - fit) / sigma are unit-variance
when the error bars are right. The runs test uses the exact distribution of the
number of runs (Wald and Wolfowitz 1940), mean 2 n1 n2 / n + 1. Lag-one
autocorrelation is r1 = sum (x_i - m)(x_(i+1) - m) / sum (x_i - m)^2, tested
against N(-1/n, 1/n). The probability plot uses Blom positions (i - 3/8) / (n +
1/4).

**Comparison.** Var(A - B) = Var A + Var B - 2 Cov(A, B). Two functions of one
fit are correlated; taking the covariance as zero over- or under-states the
variance (by a factor of 20 for two nearby predictions of a line), and the
record says which was used.

**Which test is valid for which model class.** The F-test: nested models, linear
or regular in the added parameters, Gaussian errors of one variance, the added
parameters free in the interior of their space and not searched. It is refused,
with a code, for: a period (or any parameter) found on a grid, because the best
of many trials is not an F variable (on white noise the naive test of the best of
100 searched periods flags at about 65% of white-noise series, case C5); a null value on the boundary
of the parameter space, such as a zero variance or amplitude (Protassov et al.
2002); models that are not nested. The Wald and profile intervals are valid for
regular models inside their bounds; they say nothing of a multimodal likelihood.

**Selection function and biases.** A selection is S(x) = cut(x) p(x); independent
selections multiply, independent channels combine as 1 - prod (1 - p). The
biases are exact for the models stated:

- Eddington: true values with density proportional to exp(-S / s0) on S >= 0,
  observed with Gaussian noise sigma: the mean true value given the observed one
  is the mean of N(x - sigma^2 / s0, sigma^2) truncated to S >= 0; far from zero
  the shift is -sigma^2 / s0.
- Malmquist: Gaussian absolute magnitudes of scatter sigma and counts growing as
  10^(alpha m): at a fixed apparent magnitude the mean absolute magnitude is
  lower by alpha ln 10 sigma^2 (alpha = 3/5 for uniform density in Euclidean
  space: 1.3816 sigma^2). At a fixed distance a cut at z sigma above the mean
  shifts it by -sigma phi(z) / Phi(z).
- Completeness: n / c; the variance is n / c^2 for a Poisson population and
  n (1 - c) / c^2 for a fixed one. No correction is made below c = 0.1.

These are not claims about a real survey, whose selection and population must be
modelled; they are the checks a real-survey code must reproduce on a population
where the answer is known.

**Not here.** A sampler, priors beyond bounds, model averaging, a joint
confidence region, simulation-calibrated tests for searched or non-regular
alternatives (Roadmap III's R22), Student-t or Poisson regression.

## References

Abramowitz and Stegun (1964), Handbook of Mathematical Functions, 6.1, 6.5,
26.5. Press et al., Numerical Recipes, 6.1-6.4, 15.2-15.6. Efron and Tibshirani
(1993), An Introduction to the Bootstrap. Wald and Wolfowitz (1940), Ann. Math.
Stat. 11, 147. Blom (1958), Statistical Estimates and Transformed Beta Variables.
Cash (1979), ApJ 228, 939. Protassov et al. (2002), ApJ 571, 545. Eddington
(1913), MNRAS 73, 359. Malmquist (1936), Stockholms Obs. Medd. 26. Teerikorpi
(1997), ARA&A 35, 101. Garwood (1936), Biometrika 28, 437. Draper and Smith
(1998), Applied Regression Analysis, 6.1. NIST/SEMATECH e-Handbook of
Statistical Methods, 1.3.6.7.1 (normal CDF), 1.3.6.7.2 (Student t), 1.3.6.7.3 (F) and 1.3.6.7.4 (chi-square). Anscombe (1973), The American Statistician 27, 17 (the paper's residual sum of squares, 13.75, is rounded from 13.76: the cases use R's residual standard error and R-squared and the paper's 0.118).
Student (1908), Biometrika 6, 1.

## Validation

`tools/statistics-cases.mjs` holds the cases; `npm run validate:statistics`
prints them and `tests/statisticsKernel.test.js` runs them in the suite. Every
tolerance was committed before any kernel code existed (commit b6f1e8df); three
errors in the cases themselves, found at their first run, were corrected in a
separate commit with no tolerance changed (a 0/0 in a relative measure at p =
0.5, the sign of a reference below the median, a survey instrument that
detected everything). The five kinds:

- analytic: closed forms for ln Gamma, the incomplete functions, the quantiles,
  the profile ellipse, the Poisson maximum, Var(A - B), F = t^2, the selection
  fraction, both biases;
- oracle: a second method for each special function (an erf series, Simpson
  quadrature, bisection), the Garwood interval, the bootstrap against the t
  interval within the Monte Carlo error, the exact runs distribution against
  enumeration, and the selection-effects suite's own detection flag for flag;
- ensemble: the coverage of every interval at its stated level and the
  false-alarm rates of the tests, in bands of 4 binomial standard errors;
- negative: every refusal named above, and the measured reason for the F-test's;
- authentic: the NIST/SEMATECH critical-value tables, Student's sleep data,
  Anscombe's quartet and Bortkiewicz's horse kicks, with published results the
  kernel was not tuned to.

Tolerances. A rate over N seeded trials is held to 4 binomial standard errors
of its expected value, with no pad, and the expected value is the exact one where
there is one: the false-alarm rate of the runs test is the exact level of the
discrete test (from the exact distribution of the runs, in BigInt), and the
coverage of the completeness correction is the exact binomial coverage of its
own interval (0.746, 0.642, 0.691, 0.696 in the four bins of case B5), not the
nominal 68.27%. The few tolerances that are not that band are in the `TOL`
table at the head of `tools/statistics-cases.mjs`, each with its reason:

| Tolerance | Value | Reason |
| --- | --- | --- |
| `lagOneNullApproximation` | 0.01 added to the 5% band | the lag-one z test uses the large-n null N(-1/n, 1/n), whose level at n = 200 departs from 5% by O(1/n) (Bartlett 1946) |
| `garwood` | 1% | the exact (Garwood) and likelihood intervals differ at O(1/N) |
| `searchedPeriodRate` | 0.64 +- 0.25 | the effective number of independent frequencies of the searched grid is between about 10 and 40: 0.40 to 0.87 |
| `bootstrapPivot` | 2% of one SE | the bootstrap SE is smaller by sqrt((n-1)/n) and z is 1.960 where t is 1.966, plus skewness |
| `normalApproxRuns` | 0.02 | the normal approximation of the runs test against the exact one at n = 60: an empirical regression guard (measured 0.012), not a theorem |
| `bootstrapUnderCoverage` | 0.012, one-sided | the percentile bootstrap of a mean can under-cover at small n (Efron and Tibshirani 1993, ch. 13): the shortfall below 0.95 is allowed 0.012 beyond 4 standard errors, an excess only 4 |
| `deepTailShift` | 1e-6 relative | the Eddington shift at t = -35, -100, -200 is the small difference of numbers near 100; the reference is the asymptotic Mills ratio |
| `rssRounding` | 1e-12 relative | a nested full model's RSS may exceed the reduced one by summation rounding: clamped to F = 0 (the result says `clamped`), more is refused |
| `tailRelative`, `tSfRelative` | 1e-8, 1e-10 | tail probabilities at 7, 9 and 12 sigma (and the lag-one and runs p values at 14 and 35 sigma) against the asymptotic series, and at large t against closed forms |
| `cfIterationBound` | 2,000 iterations | a continued fraction that needs more has lost its convergence (the cap is 100,000) |

The F-test sees only parameter counts and sums of squares, so `searched` and
`boundary` are declarations the CALLER makes and the kernel cannot detect: a
caller must declare `searched` when any added parameter (a period, a position, a
break) was chosen by looking at the data, and `boundary` when the null value of
an added parameter (a variance, an amplitude, a mixing fraction) is on the edge
of its allowed range. An undeclared search is not caught; the result carries the
declarations it was given (`declared`). What the kernel does check is what the
numbers cannot be: whole-number counts with 0 <= p_reduced < p_full < n, finite
sums of squares, not both zero, and a full model that does not fit worse than the
reduced one beyond rounding.

Values in the table are one run on one engine; the bound is what is promised.
Nothing here stores a golden of a value that passes through `log`, `exp`, `pow`,
`cos` or `sin`: they differ in the last bit between Node 20 (CI) and Node 24.

<!-- statistics-validation:begin -->

| Case | Kind | Measure | Value | Bound | |
| --- | --- | --- | --- | --- | --- |
| **S1** ln Gamma at integers and half-integers | analytic | ln Gamma(1) against ln 0! | -9e-16 | 0 ± 1e-12 | pass |
|  |  | ln Gamma(2) against ln 1! | 0 | 0 ± 1e-12 | pass |
|  |  | ln Gamma(3) against ln 2! | 0.6931 | 0.6931 ± 1e-12 | pass |
|  |  | ln Gamma(4) against ln 3! | 1.792 | 1.792 ± 2e-12 | pass |
|  |  | ln Gamma(5) against ln 4! | 3.178 | 3.178 ± 3e-12 | pass |
|  |  | ln Gamma(6) against ln 5! | 4.787 | 4.787 ± 5e-12 | pass |
|  |  | ln Gamma(7) against ln 6! | 6.579 | 6.579 ± 7e-12 | pass |
|  |  | ln Gamma(8) against ln 7! | 8.525 | 8.525 ± 9e-12 | pass |
|  |  | ln Gamma(9) against ln 8! | 10.6 | 10.6 ± 1e-11 | pass |
|  |  | ln Gamma(10) against ln 9! | 12.8 | 12.8 ± 1e-11 | pass |
|  |  | ln Gamma(11) against ln 10! | 15.1 | 15.1 ± 2e-11 | pass |
|  |  | ln Gamma(12) against ln 11! | 17.5 | 17.5 ± 2e-11 | pass |
|  |  | ln Gamma(13) against ln 12! | 19.99 | 19.99 ± 2e-11 | pass |
|  |  | ln Gamma(14) against ln 13! | 22.55 | 22.55 ± 2e-11 | pass |
|  |  | ln Gamma(15) against ln 14! | 25.19 | 25.19 ± 3e-11 | pass |
|  |  | ln Gamma(16) against ln 15! | 27.9 | 27.9 ± 3e-11 | pass |
|  |  | ln Gamma(17) against ln 16! | 30.67 | 30.67 ± 3e-11 | pass |
|  |  | ln Gamma(18) against ln 17! | 33.51 | 33.51 ± 3e-11 | pass |
|  |  | ln Gamma(19) against ln 18! | 36.4 | 36.4 ± 4e-11 | pass |
|  |  | ln Gamma(20) against ln 19! | 39.34 | 39.34 ± 4e-11 | pass |
|  |  | Gamma(1/2) against sqrt(pi) | 1.772 | 1.772 ± 2e-12 | pass |
|  |  | Gamma(3/2) against sqrt(pi)/2 | 0.8862 | 0.8862 ± 2e-12 | pass |
|  |  | Gamma(5/2) against 3 sqrt(pi)/4 | 1.329 | 1.329 ± 2e-12 | pass |
| **S2** The regularised incomplete gamma function in closed form | analytic | P(1, x), largest deviation over 9 x | 7e-16 | 0 ± 1e-12 | pass |
|  |  | P(2, x), largest deviation over 9 x | 2e-16 | 0 ± 1e-12 | pass |
|  |  | P(1/2, x) against the series for erf(sqrt x), largest deviation | 7e-16 | 0 ± 1e-12 | pass |
| **S3** The regularised incomplete beta function in closed form | analytic | I_x(1, b), largest deviation | 1e-15 | 0 ± 1e-12 | pass |
|  |  | I_x(a, 1), largest deviation | 1e-15 | 0 ± 1e-12 | pass |
|  |  | I_x(1/2, 1/2) against the arcsine law, largest deviation | 1e-15 | 0 ± 1e-12 | pass |
|  |  | reflection I_x(a, b) + I_(1-x)(b, a) = 1, largest deviation | 7e-16 | 0 ± 1e-12 | pass |
| **S4** A second method for the normal and gamma distributions | oracle | normal CDF against the erf series, z from -5 to 5, largest deviation | 2e-16 | 0 ± 1e-10 | pass |
|  |  | P(5/2, x) and P(9/2, x) against Simpson, largest deviation | 9e-15 | 0 ± 1e-10 | pass |
| **S5** Quantiles in closed form and by bisection | analytic | chi-square quantile, 2 dof, largest relative deviation | 8e-15 | 0 ± 1e-10 | pass |
|  |  | t quantile, 1 dof, largest relative deviation | 3e-14 | 0 ± 1e-10 | pass |
|  |  | t quantile, 2 dof, largest relative deviation | 3e-14 | 0 ± 1e-10 | pass |
|  |  | normal quantile against bisection on the series, largest deviation | 5e-14 | 0 ± 1e-10 | pass |
| **S6** Critical values from the NIST/SEMATECH tables | authentic | normal, two-sided 95% (z = 1.960) | 1.96 | 1.96 ± 5e-4 | pass |
|  |  | normal, two-sided 99% (z = 2.576) | 2.576 | 2.576 ± 5e-4 | pass |
|  |  | chi-square, 1 dof, 0.95 | 3.841 | 3.841 ± 5e-4 | pass |
|  |  | chi-square, 1 dof, 0.99 | 6.635 | 6.635 ± 5e-4 | pass |
|  |  | chi-square, 2 dof, 0.95 | 5.991 | 5.991 ± 5e-4 | pass |
|  |  | chi-square, 2 dof, 0.99 | 9.21 | 9.21 ± 5e-4 | pass |
|  |  | chi-square, 5 dof, 0.95 | 11.07 | 11.07 ± 5e-4 | pass |
|  |  | chi-square, 10 dof, 0.95 | 18.31 | 18.31 ± 5e-4 | pass |
|  |  | chi-square, 30 dof, 0.95 | 43.77 | 43.77 ± 5e-4 | pass |
|  |  | Student t, 1 dof, 0.975 | 12.71 | 12.71 ± 5e-4 | pass |
|  |  | Student t, 2 dof, 0.975 | 4.303 | 4.303 ± 5e-4 | pass |
|  |  | Student t, 5 dof, 0.975 | 2.571 | 2.571 ± 5e-4 | pass |
|  |  | Student t, 9 dof, 0.975 | 2.262 | 2.262 ± 5e-4 | pass |
|  |  | Student t, 10 dof, 0.975 | 2.228 | 2.228 ± 5e-4 | pass |
|  |  | Student t, 30 dof, 0.975 | 2.042 | 2.042 ± 5e-4 | pass |
|  |  | F, 1 and 10 dof, 0.95 | 4.965 | 4.965 ± 5e-4 | pass |
|  |  | F, 2 and 10 dof, 0.95 | 4.103 | 4.103 ± 5e-4 | pass |
|  |  | F, 5 and 10 dof, 0.95 | 3.326 | 3.326 ± 5e-4 | pass |
|  |  | F, 3 and 20 dof, 0.95 | 3.098 | 3.098 ± 5e-4 | pass |
|  |  | F, 10 and 10 dof, 0.95 | 2.978 | 2.978 ± 5e-4 | pass |
| **S7** Arguments outside the domain are NaN, never a number | negative | gammaP(-1, 1), gammaP(1, -1), gammaP(NaN, 1) are NaN | 3 | = 3 | pass |
|  |  | betaI with x = 1.5, a = 0, b = -2 is NaN | 3 | = 3 | pass |
|  |  | quantile at p = -0.1 and 1.1 is NaN | 3 | = 3 | pass |
|  |  | quantile at p = 0 and p = 1 is the end of the support | 4 | = 4 | pass |
|  |  | CDFs at their support ends are 0 and 1 | 3 | = 3 | pass |
| **I1** A coverage level is a number of sigmas, and back | analytic | level of 1 sigma | 0.6827 | 0.6827 ± 1e-13 | pass |
|  |  | sigma of level 0.6826894921370859 | 1 | 1 ± 1e-9 | pass |
|  |  | level of 2 sigma | 0.9545 | 0.9545 ± 1e-13 | pass |
|  |  | sigma of level 0.9544997361036416 | 2 | 2 ± 1e-9 | pass |
|  |  | level of 3 sigma | 0.9973 | 0.9973 ± 1e-13 | pass |
|  |  | sigma of level 0.9973002039367398 | 3 | 3 ± 1e-9 | pass |
|  |  | covarianceInterval(10, 2) at 2 sigma: low end | 6 | 6 ± 1e-8 | pass |
|  |  | ... high end | 14 | 14 ± 1e-8 | pass |
|  |  | ... the label is its method | 1 | = 1 | pass |
|  |  | ... a Delta chi-square = 1 interval is 68.27%: chi2Cdf(1, 1) | 0.6827 | 0.6827 ± 1e-12 | pass |
| **I2** Linear least squares: the fitter and the closed form agree, and the covariance interval is theirs | analytic | intercept, fit minus closed form, in sigma | -2e-13 | 0 ± 1e-5 | pass |
|  |  | slope, fit minus closed form, in sigma | 1e-13 | 0 ± 1e-5 | pass |
|  |  | chi-square, fit minus closed form, relative | 2e-16 | 0 ± 1e-5 | pass |
|  |  | covariance sigma of the slope against the closed form, relative | -4e-13 | 0 ± 1e-5 | pass |
|  |  | 95% covariance interval of the slope: half-width over z sigma, minus 1 | -4e-13 | 0 ± 1e-5 | pass |
|  |  | ... centred on the fitted slope, in sigma | 1e-13 | 0 ± 1e-5 | pass |
| **I3** A profile interval against the analytic ellipse | analytic | level 0.6827: low end against b0 - z sigma, in sigma | -3e-15 | 0 ± 1e-5 | pass |
|  |  | level 0.6827: high end against b0 + z sigma, in sigma | -3e-15 | 0 ± 1e-5 | pass |
|  |  | level 0.9000: low end against b0 - z sigma, in sigma | 0 | 0 ± 1e-5 | pass |
|  |  | level 0.9000: high end against b0 + z sigma, in sigma | -6e-15 | 0 ± 1e-5 | pass |
|  |  | level 0.9500: low end against b0 - z sigma, in sigma | -3e-15 | 0 ± 1e-5 | pass |
|  |  | level 0.9500: high end against b0 + z sigma, in sigma | -6e-15 | 0 ± 1e-5 | pass |
|  |  | level 0.9900: low end against b0 - z sigma, in sigma | -1e-14 | 0 ± 1e-5 | pass |
|  |  | level 0.9900: high end against b0 + z sigma, in sigma | 6e-15 | 0 ± 1e-5 | pass |
|  |  | deltaChi2 = 1 is labelled with its coverage 0.6827 | 0.6827 | 0.6827 ± 1e-12 | pass |
|  |  | deltaChi2 = 1 gives b0 +- sigma, in sigma | 1 | 1 ± 1e-5 | pass |
|  |  | the label is the method | 1 | = 1 | pass |
| **I4** A Poisson count fit against the analytic maximum, and its profile against a second method | analytic | rate is sum n / sum t (level 0.683) | 2.667 | 2.667 ± 1e-14 | pass |
|  |  | low end against bisection on the deviance (level 0.683), relative | 2e-16 | 0 ± 1e-10 | pass |
|  |  | high end against bisection on the deviance (level 0.683), relative | 2e-16 | 0 ± 1e-10 | pass |
|  |  | rate is sum n / sum t (level 0.950) | 2.667 | 2.667 ± 1e-14 | pass |
|  |  | low end against bisection on the deviance (level 0.950), relative | 2e-16 | 0 ± 1e-10 | pass |
|  |  | high end against bisection on the deviance (level 0.950), relative | -2e-16 | 0 ± 1e-10 | pass |
| **I5** The profile deviance interval against the exact (Garwood) interval for many counts | oracle | N = 196: low end over the Garwood low end, minus 1 | 2e-3 | 0 ± 0.01 | pass |
|  |  | N = 196: high end over the Garwood high end, minus 1 | -3e-3 | 0 ± 0.01 | pass |
|  |  | N = 1000: low end over the Garwood low end, minus 1 | 3e-4 | 0 ± 0.01 | pass |
|  |  | N = 1000: high end over the Garwood high end, minus 1 | -6e-4 | 0 ± 0.01 | pass |
| **I6** The stated interval covers the truth at the stated rate | ensemble | covariance interval, 68.27%: coverage | 0.6993 | 0.6827 ± 0.04807 | pass |
|  |  | profile interval, 68.27%: coverage | 0.6993 | 0.6827 ± 0.04807 | pass |
|  |  | covariance interval, 95%: coverage | 0.956 | 0.95 ± 0.02251 | pass |
|  |  | profile interval, 95%: coverage | 0.956 | 0.95 ± 0.02251 | pass |
|  |  | Student-t interval of a mean, 95%: coverage | 0.946 | 0.95 ± 0.02251 | pass |
| **I7** The bootstrap interval of a Gaussian mean against the t interval, within the Monte Carlo error | oracle | low end, bootstrap minus t, in SE of the mean | 0.01304 | 0 ± 0.1889 | pass |
|  |  | high end, bootstrap minus t, in SE of the mean | 3e-3 | 0 ± 0.1889 | pass |
|  |  | standard deviation of the draws over the exact bootstrap SE, minus 1 | -2e-3 | 0 ± 0.04472 | pass |
|  |  | the estimate is the sample mean | 10.12 | 10.12 ± 1e-12 | pass |
| **I8** Coverage of the bootstrap percentile interval on a fixed ensemble | ensemble | 95% percentile interval of a mean: coverage | 0.96 | 0.95 ± 0.05033 | pass |
| **I9** Monte Carlo propagation of a covariance through a function | ensemble | mean of g | 5.005 | 5 ± 0.01893 | pass |
|  |  | variance of g over the analytic, minus 1 | 6e-3 | 0 ± 0.04 | pass |
|  |  | 95% interval, low end | 3.682 | 3.688 ± 0.05057 | pass |
|  |  | 95% interval, high end | 6.309 | 6.312 ± 0.05057 | pass |
|  |  | sample covariance of the two parameters | 0.01199 | 0.012 ± 2e-3 | pass |
|  |  | the stream that drew is recorded (seed key and id) | 1 | = 1 | pass |
|  |  | the same seed gives the same draws, bit for bit | 1 | = 1 | pass |
| **I10** The residual bootstrap of a fitted slope | ensemble | standard deviation of the bootstrapped slopes over sigma sqrt(C_bb), minus 1 | -0.01157 | 0 ± 0.05164 | pass |
|  |  | the draws are centred on the fitted slope, in SE | 1e-3 | 0 ± 0.07303 | pass |
| **I11** Refusals: no sigma, an open profile, a covariance that is not one, a draw count over the budget | negative | covarianceInterval with sigma NaN is refused | 1 | = 1 | pass |
|  |  | covarianceInterval with sigma < 0 is refused | 1 | = 1 | pass |
|  |  | a profile that never rises by the level has both sides open | 1 | = 1 | pass |
|  |  | ... and it still names its method and level | 1 | = 1 | pass |
|  |  | a covariance that is not positive semidefinite is refused | 1 | = 1 | pass |
|  |  | a missing covariance is refused | 1 | = 1 | pass |
|  |  | a draw count over the budget throws "budget" | 1 | = 1 | pass |
|  |  | a non-integer draw count throws "draws" | 1 | = 1 | pass |
|  |  | a bootstrap of one row is refused | 1 | = 1 | pass |
|  |  | the Student interval of one value is refused | 1 | = 1 | pass |
|  |  | the budget is a fixed number the contract states | 1000 | = 1000 | pass |
| **I12** Student's sleep data: the paired t interval and test | authentic | mean difference | 1.58 | 1.58 ± 1e-9 | pass |
|  |  | degrees of freedom | 9 | = 9 | pass |
|  |  | low end of the 95% interval | 0.7001 | 0.7001 ± 5e-7 | pass |
|  |  | high end of the 95% interval | 2.46 | 2.46 ± 5e-7 | pass |
|  |  | t statistic | 4.062 | 4.062 ± 5e-5 | pass |
|  |  | two-sided p value | 3e-3 | 3e-3 ± 5e-7 | pass |
| **R1** Normalised residuals, lag-one autocorrelation and the runs distribution in closed form | analytic | lag-one of an alternating sequence of 20 | -0.95 | -0.95 ± 1e-14 | pass |
|  |  | normalised residuals: (3-2)/0.5, 0, (8-6)/2 | 0 | 0 ± 1e-15 | pass |
|  |  | runs distribution sums to 1 | 1 | 1 ± 1e-13 | pass |
|  |  | runs distribution: mean against 2 n1 n2 / n + 1 | 8.875 | 8.875 ± 1e-12 | pass |
|  |  | runs distribution: variance against the closed form | 3.609 | 3.609 ± 1e-12 | pass |
|  |  | without error bars the residuals are scaled by their own rms and the result says so | 1 | = 1 | pass |
| **R2** The exact runs distribution against brute-force enumeration, and the normal approximation against it | oracle | exact distribution against enumeration over six splits, largest deviation | 3e-16 | 0 ± 1e-13 | pass |
|  |  | exact against normal two-sided p at n = 60 | 0.01229 | 0 ± 0.03 | pass |
| **R3** A normal-probability plot of exact normal quantiles is a straight line of slope 1 | analytic | correlation of the plot | 1 | 1 ± 1e-9 | pass |
|  |  | slope | 1 | 1 ± 1e-8 | pass |
|  |  | intercept | -5e-17 | 0 ± 1e-8 | pass |
|  |  | theoretical position 1 against the quantile by bisection | -1.964 | -1.964 ± 1e-9 | pass |
| **R4** False-alarm rates of the diagnostics on white noise, and their power | ensemble | runs test about the median, white noise: rate flagged at 5% (the exact level of the discrete test at 50 and 50) | 0.0395 | 0.03436 ± 0.01629 | pass |
|  |  | lag-one test, white noise: rate flagged at 5% | 0.0435 | 0.05 ± 0.02949 | pass |
|  |  | lag-one test on AR(1) phi = 0.6: rate flagged (power) | 1 | 1 ± 0.01 | pass |
|  |  | probability-plot correlation: Gaussian above exponential, fraction of pairs | 1 | 1 ± 0.01 | pass |
| **R5** Diagnostics that cannot be computed say so | negative | runs test of all-positive values is refused | 1 | = 1 | pass |
|  |  | runs test of fewer than 2 values is refused | 1 | = 1 | pass |
|  |  | lag one of a constant series is refused | 1 | = 1 | pass |
|  |  | lag one of 2 values is refused | 1 | = 1 | pass |
|  |  | a probability plot of 2 values is refused | 1 | = 1 | pass |
|  |  | residuals with a zero sigma are refused | 1 | = 1 | pass |
|  |  | residuals of different lengths are refused | 1 | = 1 | pass |
| **R6** Anscombe's quartet: the line of dataset I, and the pattern in the residuals of dataset II | authentic | dataset I: intercept | 3 | 3 ± 5e-3 | pass |
|  |  | dataset I: slope | 0.5001 | 0.5 ± 5e-3 | pass |
|  |  | dataset I: residual sum of squares | 13.76 | 13.75 ± 0.03 | pass |
|  |  | dataset I: standard error of the slope | 0.1179 | 0.118 ± 6e-4 | pass |
|  |  | dataset II: intercept | 3.001 | 3 ± 5e-3 | pass |
|  |  | dataset II: slope | 0.5 | 0.5 ± 5e-3 | pass |
|  |  | dataset II: residual sum of squares | 13.78 | 13.75 ± 0.03 | pass |
|  |  | dataset II: standard error of the slope | 0.118 | 0.118 ± 6e-4 | pass |
|  |  | dataset II: runs test, one-sided p for too few runs is at most 0.05 | 1 | = 1 | pass |
| **C1** Var(A - B) with the covariance, and the case where it matters | analytic | variance with the covariance against Var(b) (x1 - x2)^2 | 9e-3 | 9e-3 ± 1e-12 | pass |
|  |  | value is A - B | -1.5 | -1.5 ± 1e-12 | pass |
|  |  | variance without the covariance (the covariance taken as zero) is larger, and says it assumed zero | 1 | = 1 | pass |
|  |  | an estimate compared with itself has zero variance and no z | 1 | = 1 | pass |
|  |  | the label names the method | 1 | = 1 | pass |
| **C2** The comparison with the covariance has its stated false-alarm rate; ignoring the covariance does not | ensemble | with the covariance: rate of false alarms at 5% | 0.0565 | 0.05 ± 0.01949 | pass |
|  |  | without it: rate of false alarms against the exact value for the wrong variance (about 1e-18: not one in 2,000 trials, with one trial of allowance) | 0 | 2e-16 ± 5e-4 | pass |
|  |  | without it, the stated 5% is not the rate: the rate is below 1% | 1 | = 1 | pass |
| **C3** The F-test of one added parameter is the square of its t test | analytic | F over t^2, minus 1 | 3e-14 | 0 ± 1e-9 | pass |
|  |  | degrees of freedom (1, n - 3) | 1.11 | 1.11 ± 1e-12 | pass |
|  |  | p value against 2 (1 - t CDF) | 0.01991 | 0.01991 ± 1e-9 | pass |
|  |  | p value against 1 - F CDF written as the survival function | 0.01991 | 0.01991 ± 1e-13 | pass |
| **C4** The F-test of nested regular models: its level, and its power | ensemble | rate of rejecting a true line at 5% | 0.05533 | 0.05 ± 0.02251 | pass |
|  |  | rate of rejecting a clearly curved law (power) | 1 | 1 ± 0.02 | pass |
| **C5** The F-test refuses a searched period, a boundary alternative, and models that are not nested | negative | a searched period is refused, code "searched" | 1 | = 1 | pass |
|  |  | a boundary alternative (a variance component at zero) is refused, code "boundary" | 1 | = 1 | pass |
|  |  | models that are not nested (the full one has no more parameters) are refused, code "not-nested" | 1 | = 1 | pass |
|  |  | no degrees of freedom left is refused, code "no-dof" | 1 | = 1 | pass |
|  |  | a worse full model (larger RSS) is refused, code "not-nested" | 1 | = 1 | pass |
|  |  | why: on white noise the naive F-test of the best of 100 searched periods flags at a rate far above 5% (expected order 1 - 0.95^20 = 0.64) | 0.655 | 0.64 ± 0.25 | pass |
|  |  | and at ONE fixed period the same test has its level | 0.04 | 0.05 ± 0.04359 | pass |
| **C6** Anscombe II: the straight line is rejected for the quadratic | authentic | p of line against quadratic on dataset II | 2e-24 | 0 ± 1e-6 | pass |
| **B1** A selection function applied to a population has the analytic inclusion fraction | analytic | included fraction against the integral | 0.4981 | 0.5 ± 0.01 | pass |
|  |  | the sum of the probabilities (the expected count) over N against the integral | 0.4985 | 0.5 ± 0.01 | pass |
|  |  | a cut at m <= 17 includes the fraction (17 - 14) / 6 | 0.5004 | 0.5 ± 0.01 | pass |
|  |  | the weights of the included objects are 1 / p | 0 | 0 ± 1e-15 | pass |
| **B2** Selections compose: independent selections multiply, and the union is 1 - prod (1 - p) | analytic | all(): inclusion against the product, largest deviation | 0 | 0 ± 1e-15 | pass |
|  |  | either(): inclusion against 1 - prod(1 - p), largest deviation | 0 | 0 ± 1e-15 | pass |
|  |  | the observables of a composite are the union | 1 | = 1 | pass |
|  |  | rate included against the mean inclusion | 0.2 | 0.2023 ± 9e-3 | pass |
| **B3** Eddington bias: the exact shift for an exponential population, and the measured difference on a synthetic one | analytic | eddingtonShift against the truncated-Gaussian formula, largest deviation | 6e-17 | 0 ± 1e-12 | pass |
|  |  | far from the cut the shift is -sigma^2 / s0 | -0.16 | -0.16 ± 1e-12 | pass |
|  |  | observed in [0.5, 0.6): mean (true - observed) against the exact shift (n = 20776) | -0.03975 | -0.04082 ± 0.0111 | pass |
|  |  | observed in [0.6, 1): mean (true - observed) against the exact shift (n = 73477) | -0.1054 | -0.1072 ± 6e-3 | pass |
|  |  | observed in [1, 1.1): mean (true - observed) against the exact shift (n = 14977) | -0.1448 | -0.1462 ± 0.01307 | pass |
|  |  | observed in [1.1, 2): mean (true - observed) against the exact shift (n = 85476) | -0.1579 | -0.1578 ± 5e-3 | pass |
|  |  | observed in [2, 2.1): mean (true - observed) against the exact shift (n = 5628) | -0.1615 | -0.16 ± 0.02133 | pass |
|  |  | observed in [2.1, 3): mean (true - observed) against the exact shift (n = 31670) | -0.1623 | -0.16 ± 9e-3 | pass |
|  |  | observed in [3, 3.1): mean (true - observed) against the exact shift (n = 1959) | -0.1662 | -0.16 ± 0.03615 | pass |
| **B4** Malmquist bias: the shift at a fixed apparent magnitude, and the shift of a magnitude cut at a fixed distance | analytic | malmquistShift(sigma = 0.5, 3/5) = -1.3816 sigma^2 | -0.3454 | -0.3454 ± 1e-14 | pass |
|  |  | malmquistShift is -alpha ln10 sigma^2 for another slope (0.4) | -0.2303 | -0.2303 ± 1e-14 | pass |
|  |  | measured <M> - M0 at m in [10, 10.5) against -alpha ln10 sigma^2 (n = 3978) | -0.3435 | -0.3454 ± 0.03146 | pass |
|  |  | malmquistCutShift against the truncated-normal formula | -0.2546 | -0.2546 ± 1e-12 | pass |
|  |  | measured shift of a cut at z = 0.5 (n = 138480) | -0.2551 | -0.2546 ± 4e-3 | pass |
| **B5** The completeness correction recovers the true counts and covers them | ensemble | bin 1 (c = 0.95): mean corrected count against N = 200 | 200 | 200 ± 0.2902 | pass |
|  |  | bin 1: coverage of +-1 sigma against the exact binomial value 0.7464 | 0.751 | 0.7464 ± 0.03892 | pass |
|  |  | bin 2 (c = 0.8): mean corrected count against N = 150 | 150.1 | 150 ± 0.5477 | pass |
|  |  | bin 2: coverage of +-1 sigma against the exact binomial value 0.6418 | 0.619 | 0.6418 ± 0.04288 | pass |
|  |  | bin 3 (c = 0.6): mean corrected count against N = 100 | 99.86 | 100 ± 0.7303 | pass |
|  |  | bin 3: coverage of +-1 sigma against the exact binomial value 0.6908 | 0.684 | 0.6908 ± 0.04134 | pass |
|  |  | bin 4 (c = 0.4): mean corrected count against N = 80 | 79.84 | 80 ± 0.9798 | pass |
|  |  | bin 4: coverage of +-1 sigma against the exact binomial value 0.6956 | 0.701 | 0.6956 ± 0.04116 | pass |
|  |  | Poisson population: variance estimate is n / c^2 | 40 | 40 ± 1e-12 | pass |
| **B6** The object reproduces the selection-effects suite's detection, flag for flag | oracle | stars whose detection flag differs from observe() | 0 | = 0 | pass |
|  |  | count detected | 91 | = 91 | pass |
|  |  | the sample is not trivial (some detected, some missed) | 1 | = 1 | pass |
|  |  | malmquistShift against the suite's malmquistFormula, relative (equal to rounding, not bit for bit: 0.6 ln10 against 3 ln10 / 5) | 0 | 0 ± 1e-15 | pass |
| **B7** Refusals: a probability outside [0, 1], a completeness too low to correct, a scale that is not positive | negative | an inclusion probability above 1 throws "probability" | 1 | = 1 | pass |
|  |  | a NaN probability throws | 1 | = 1 | pass |
|  |  | a bin whose completeness is below the floor (0.1) is refused, not corrected | 1 | = 1 | pass |
|  |  | ... and the bin above it is corrected | 10 | 10 ± 1e-12 | pass |
|  |  | a selection with neither a cut nor a probability includes everything | 1 | = 1 | pass |
|  |  | eddingtonShift with a non-positive scale is NaN | 1 | = 1 | pass |
|  |  | a population of one with a bin of no objects is refused by measuredShift | 1 | = 1 | pass |
| **B8** Bortkiewicz's horse kicks: a count fit and its interval | authentic | corps-years | 280 | = 280 | pass |
|  |  | Poisson mean per corps-year | 0.7 | 0.7 ± 1e-12 | pass |
|  |  | the 95% interval contains the mean, low end below | 1 | = 1 | pass |
|  |  | the 95% interval, high end above | 1 | = 1 | pass |
|  |  | the 95% interval is of relative half-width about 1.96 / sqrt(196) | 0.1401 | 0.14 ± 0.01 | pass |
| **S8** Tail probabilities keep their digits at 7, 9 and 12 sigma, and at large t | analytic | normalSf(7) over the series, minus 1 | -2e-11 | 0 ± 1e-8 | pass |
|  |  | normalCdf(-7) over the series, minus 1 | -2e-11 | 0 ± 1e-8 | pass |
|  |  | chi2Sf(7^2, 1) over 2 Q(7), minus 1 | -2e-11 | 0 ± 1e-8 | pass |
|  |  | difference(): two-sided p of a 7-sigma difference over 2 Q(7), minus 1 | -2e-11 | 0 ± 1e-8 | pass |
|  |  | difference(): the p of a 7-sigma difference is above zero | 1 | = 1 | pass |
|  |  | normalSf(9) over the series, minus 1 | 2e-15 | 0 ± 1e-8 | pass |
|  |  | normalCdf(-9) over the series, minus 1 | 2e-15 | 0 ± 1e-8 | pass |
|  |  | chi2Sf(9^2, 1) over 2 Q(9), minus 1 | 2e-15 | 0 ± 1e-8 | pass |
|  |  | difference(): two-sided p of a 9-sigma difference over 2 Q(9), minus 1 | 2e-15 | 0 ± 1e-8 | pass |
|  |  | difference(): the p of a 9-sigma difference is above zero | 1 | = 1 | pass |
|  |  | normalSf(12) over the series, minus 1 | 7e-15 | 0 ± 1e-8 | pass |
|  |  | normalCdf(-12) over the series, minus 1 | 7e-15 | 0 ± 1e-8 | pass |
|  |  | chi2Sf(12^2, 1) over 2 Q(12), minus 1 | 7e-15 | 0 ± 1e-8 | pass |
|  |  | difference(): two-sided p of a 12-sigma difference over 2 Q(12), minus 1 | 7e-15 | 0 ± 1e-8 | pass |
|  |  | difference(): the p of a 12-sigma difference is above zero | 1 | = 1 | pass |
|  |  | tSf(30, 1) over atan(1/t) / pi, minus 1 | 0 | 0 ± 1e-10 | pass |
|  |  | tSf(30, 2) over the closed form, minus 1 | 2e-15 | 0 ± 1e-10 | pass |
|  |  | tSf(1000, 1) over atan(1/t) / pi, minus 1 | -9e-16 | 0 ± 1e-10 | pass |
|  |  | tSf(1000, 2) over the closed form, minus 1 | 3e-15 | 0 ± 1e-10 | pass |
|  |  | tSf(1000000, 1) over atan(1/t) / pi, minus 1 | -1e-16 | 0 ± 1e-10 | pass |
|  |  | tSf(1000000, 2) over the closed form, minus 1 | 2e-15 | 0 ± 1e-10 | pass |
| **C7** The F-test validates its inputs: counts, zero sums of squares, a worse full model | negative | a non-integer parameter count is refused, code "counts" | 1 | = 1 | pass |
|  |  | a negative reduced parameter count is refused, code "counts" | 1 | = 1 | pass |
|  |  | a non-integer n is refused, code "counts" | 1 | = 1 | pass |
|  |  | a non-finite n or count is refused, code "counts" | 2 | = 2 | pass |
|  |  | a NaN or infinite sum of squares is refused, code "input" | 2 | = 2 | pass |
|  |  | both sums of squares zero (0/0) is refused, code "zero-rss" | 1 | = 1 | pass |
|  |  | a full model that fits perfectly gives F = infinity and p = 0 | 1 | = 1 | pass |
|  |  | a full RSS above the reduced one by rounding (1e-13 relative) is clamped: F = 0, p = 1, and says so | 1 | = 1 | pass |
|  |  | a full RSS above the reduced one by 1e-10 relative is refused, code "not-nested" | 1 | = 1 | pass |
|  |  | equal sums of squares give F = 0 and p = 1 without a clamp | 1 | = 1 | pass |
|  |  | searched and boundary are declarations: undeclared they are not detected (an ok result carries them as false) | 1 | = 1 | pass |

<!-- statistics-validation:end -->

## Costs and waits

The kernel is in the tree and tested and is **not installed**: no shipped module
imports it, `tools/build-service-worker.mjs` lists `js/kernels/statistics/` in
`NEVER_PRECACHED`, and `tests/statisticsKernel.test.js` fails the day a shipped
module imports a file of it without that entry being deleted. The first-visit
precache has 21 bytes of room under its ceiling (5,177,575 of 5,177,596 on Mac
Node 24), and a request ceiling does not rise under the standing approval.

| Adoption | Equivalence proved | Cost measured |
| --- | --- | --- |
| `js/inference/infer.js` profile interval onto `profileInterval` (adds `method` and `level` to the profile result) | `profileInterval` calls the function the core already calls on the same inputs: 300 seeded profiles, bit for bit; on a real transit profile within 1e-12 | intervals.js + special.js: 5.8 KB gzip in the first-visit tier, two more requests on the 5 pages that load infer.js (screen) |
| `js/survey/model.js` detection onto `selection` and `logisticCompleteness` | detection flags equal on 8 universes (4 seeds, 2 instruments), and `malmquistShift` equals `malmquistFormula` to 1e-15 relative | selection.js + resample.js + special.js: about 8.3 KB gzip, three more requests on the 5 pages that load model.js (screen) |

Both are waits for Carl: a first-visit ceiling raise (tools/data-budget.json,
which a session may not edit) and a request decision for those routes.
