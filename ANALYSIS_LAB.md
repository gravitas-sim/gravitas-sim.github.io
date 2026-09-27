# The analysis laboratory

Reading a result closely, as a scientist would: how strongly a measurement
follows a setting, where its uncertainty comes from, which of a few models
the data prefer, and what the result cannot tell you. It lives in two places,
each a lazy chunk that loads only when it is opened:

- **Analyze** on the experiment runner (`/experiments/`,
  `js/experiments/analysisPanel.js`) reads an experiment's result, from the
  run just made or from a saved one.
- **Compare the fits** in the Observatory's fit panel
  (`js/observatory/fitPanel.js`) compares fits of named models to one
  observation.

The mathematics is in `js/analysis/`, three modules with no DOM and no clock:
`stats.js`, `sweepAnalysis.js` and `modelCompare.js`. The tests are
`tests/analysis.test.js`, `e2e/analysisLab.spec.js` and
`e2e/modelCompare.spec.js`, and `npm run analysis:validate` prints the tables
below.

Two rules run through all of it:

- **Nothing here is a posterior probability, and nothing says so.** The
  intervals are frequentist 95% confidence intervals, and the model weights
  are relative support among the models compared, not the chance that one is
  true. The laboratory has no Markov-chain sampler, on purpose
  ([INFERENCE_CORE.md](INFERENCE_CORE.md) keeps one for later work, against
  its validation).
- **Every chart has its numbers beside it.** The trials' plot is linked to a
  table of every trial, and the histogram is followed by its counts. Each
  table is a real table, with a caption and headers, reachable by keyboard.

## An experiment's result

A result (`gravitas.experiment-result/1`, [EXPERIMENTS.md](EXPERIMENTS.md))
answers four questions, each with its caveats.

**1. At each setting, what did the trials give?** For each setting:

- the mean, with a Student t interval;
- the median, with a percentile bootstrap interval (Efron and Tibshirani
  1993), given only for five or more finished trials;
- the 16th to 84th percentiles;
- how many trials did not finish, and why.

**2. How strongly does the measurement follow the setting?**

- **Local slopes:** finite differences of the means, central inside the range
  and one-sided at its ends. Their errors are the two means' errors in
  quadrature. A slope is *resolved* when it is more than twice its error.
- **Elasticity:** the percentage change of the measurement for a 1% change of
  the setting.
- **The trend:** an ordinary least-squares line through the means. Its error
  comes from their scatter about the line, not from the cells' own errors;
  weighting by estimated errors was measured to bias the slope and understate
  its error (below).
- **Rank correlation:** Spearman's rho over every finished trial, with a
  bootstrap interval.

**3. How much of the scatter is the setting, and how much the seed?**

- **The share:** eta² of a one-way analysis of variance.
- **The test:** a permutation test of "the setting makes no difference", with
  p = (1 + k) / (1 + B), which is never zero (Phipson and Smyth 2010).
- **A grid of two settings:** the share splits between each setting, their
  interaction and the seeds.

**4. What should a reader not conclude?** The warnings, each with the numbers
it rests on:

| Warning | When | What it means |
|---|---|---|
| `deterministic` | every seed gave the same value at every setting | there is no scatter, so no interval and no test is given; the uncertainty that matters is the integration step's |
| `oneSeed` | one trial at each setting | no scatter was measured at all |
| `fewTrials` | a setting has two to four finished trials | its intervals are wide and lean on normality |
| `emptyCells`, `survivors` | trials did not finish | nothing is known where none did; where some did, their numbers are a survivors' sample |
| `notResolved` | the permutation test's p is above 0.05 | the experiment cannot tell whether the setting matters over this range |
| `seedsDominate` | the seeds hold most of the scatter | settings differ less than repeats of one setting |
| `nonMonotonic` | the means rise and fall, beyond their errors | one measured value comes from more than one setting: **the setting cannot be read back from the measurement** |
| `flat` | three or more slopes in a row are unresolved | **the setting is not identifiable** there from this measurement |
| `edgeMax`, `edgeMin` | a peak or trough at an end of the range, with the other extreme inside | the extremum may lie beyond the range |
| `noTrend` | a sampled design's rank-correlation interval includes zero | no trend is resolved |
| `stepSensitive` | the same experiment at another step moves a value by more than 1% | numerical error of that size is in every number |
| `unbalanced`, `wideRange` | an incomplete grid; values spanning a factor over 100 | the shares add up only approximately; the median says more than the mean |

### The laboratory scenarios ignore their seed

In the scenarios the experiment runner can sweep, the seed changes nothing
about the setup (EXPERIMENTS.md), so every seed gives the same number at every
setting. That shaped the laboratory. Intervals from seed-to-seed scatter would
have width zero there, and a test against it would call any difference real.

So the analysis measures the scatter first:

- **Seeds identical:** it gives no interval and runs no test, and says why.
- **Some real scatter:** only then are the intervals and the test computed.

A deterministic simulation still has one uncertainty: the integration's. Run
the same experiment at another step, which the form now offers (1/120, 1/60 or
1/30 s), and the laboratory compares the two run by run:

- **Each setting:** how much its value moves when the step changes;
- **Each slope:** judged resolved only against the slope of that difference.

The difference is the scale of the numerical error, not a bound on it. Real
ensembles come from the other new option in the form: settings drawn **at
random** (a seeded uniform sample, EXPERIMENTS.md). The analysis then reads
the trend by rank and in bins of equal size.

### The work, priced and refusable

An analysis is priced before it runs:

- **The unit:** random draws. A bootstrap of n values costs n a resample, and
  a permutation of n values costs n.
- **The forecast:** a time for this device, from a burst of the same work timed
  when the panel opens.
- **The limits:** resampling is held to 200 to 10,000 resamples and 199 to
  9,999 permutations. A request past 5 million draws (a low-end device) or 20
  million (a desktop) is refused, with its reason, before it starts.
- **Cancel:** the analysis yields to the page every 12 ms, so Cancel is heard,
  and a canceled analysis leaves nothing behind.

The experiment runner's own refusals, of grids too large for the device, are
unchanged.

### Saved

**Save the analysis (JSON)** writes a `gravitas.analysis/1` of kind `sweep`,
holding:

- its tool and version, its options and seed;
- every number above, and the warnings;
- the methods in words;
- the result's source whole: its format, hash, **manifest**, engine and
  environment, so anyone can rerun the experiment it analyzed.

**Save the settings table (CSV)** writes the per-setting numbers, with two
comment lines naming the analysis, the result and the options. Every random
draw comes from one stream seeded by the analysis's seed, so the same result
and seed give the same file, bit for bit.

## Comparing named models

Each fit the Observatory's fit panel makes is listed under **Compare the
fits**. A fit is named by its model and whichever parameters it held fixed,
for example "a transit with the limb darkening fixed", or "an orbit with √e
cos ω = √e sin ω = 0", which is a circular orbit. Two or more are compared,
with a **constant** always among them: a weighted mean for each instrument,
the "nothing here" a signal has to beat.

| Number | How |
|---|---|
| −2 ln L | from the fit's own residuals and the data's uncertainties, Σ r²/v + Σ ln 2πv, v = σ² + jitter²; for data without uncertainties, n ln(2π RSS/n) + n, the noise level one more fitted number |
| k | the values the fit chose: its rows less its degrees of freedom |
| AIC, AICc | −2 ln L + 2k (Akaike 1974); the small-sample correction (Hurvich and Tsai 1989) |
| BIC | −2 ln L + k ln n (Schwarz 1978) |
| Akaike weights, strength | Burnham and Anderson (2002): within 2 of the best, both have substantial support; 4 to 7, considerably less; above 10, essentially none |
| nested test | for a model that is another with parameters fixed, the likelihood-ratio statistic against chi-square (Wilks 1938) |

Beside the numbers, the residuals of each model:

- their scatter in units of the uncertainties;
- the share beyond three;
- a runs test of their signs;
- their lag-one autocorrelation;
- the fit's red-noise β.

The panel also shows each fit's parameter correlations. A correlation near
±1 marks parameters the data constrain only together, which is the
identifiability question for a fit.

What the comparison refuses and warns of:

- **Refused:** fits to other rows (another mask, another observation), whose
  likelihoods are of other data; a fit that did not finish.
- **Boundary:** where the simpler model fixes a parameter at the edge of the
  fuller one's range, the chi-square p is conservative (Self and Liang 1987).
  A constant is every model with its signal at zero, which is always that
  edge. A circular orbit is not: √e cos ω = 0 is inside its range.
- **Criteria disagree:** when AIC and BIC prefer different models.
- **Rescaled uncertainties:** a fit that rescaled its uncertainties makes the
  criteria favor extra parameters.
- **A poor best:** the preferred model leaves a reduced χ² above 2, or its
  residuals have structure.
- **Degenerate or at a bound:** a fit is degenerate, or ended at a bound.

**Save the comparison (JSON)** writes a `gravitas.analysis/1` of kind
`models`. It holds every number above and the methods in words. It also holds
each compared fit's own `gravitas.inference/1` document, its **manifest**
included: the data pack, the model and its version, the bounds and the
algorithm.

## Validation

`npm run analysis:validate` prints these tables. The seeds are fixed, so
every machine prints the same numbers. `tests/analysis.test.js` holds smaller
versions of the same cases to tolerances.

### Intervals: how often the truth is inside

| Sample | n | Student t, mean | trials | Bootstrap, median | trials |
|---|---:|---:|---:|---:|---:|
| normal | 3 | 95.3% | 2000 | — | — |
| normal | 5 | 95.0% | 2000 | 92.7% | 1000 |
| normal | 10 | 95.3% | 2000 | 94.1% | 1000 |
| normal | 20 | 94.8% | 2000 | 92.4% | 1000 |
| lognormal | 3 | 83.5% | 2000 | — | — |
| lognormal | 5 | 81.8% | 2000 | 92.3% | 1000 |
| lognormal | 10 | 83.9% | 2000 | 92.2% | 1000 |
| lognormal | 20 | 86.9% | 2000 | 93.1% | 1000 |

Nominal: 95.0%.

### Tests: how often they reject, at 5%

| Test | Case | Rate | trials |
|---|---|---:|---:|
| permutation, 8 settings x 4 seeds | no effect (size) | 6.0% | 1000 |
| permutation, 8 settings x 4 seeds | slope 0.1 sd a step (power) | 10.6% | 1000 |
| permutation, 8 settings x 4 seeds | slope 0.3 sd a step (power) | 66.0% | 1000 |
| rank-correlation interval, 30 sampled settings | no trend (excludes zero) | 4.8% | 500 |

### Slopes: pulls against a known line (mean 0, spread 1 when the errors are right)

| Case | trials | Local pull mean | Local pull spread | Trend pull mean | Trend pull spread |
|---|---:|---:|---:|---:|---:|
| 8 settings, 3 seeds, noise 0.3 | 400 | -0.031 | 1.286 | -0.090 | 1.358 |
| 8 settings, 6 seeds, noise 0.3 | 400 | -0.007 | 1.057 | -0.090 | 1.223 |
| 8 settings, 6 seeds, noise 1 | 400 | -0.009 | 1.112 | -0.036 | 1.280 |

### Models: circular against eccentric orbits, 40 epochs, K = 25 m/s, sigma = 5 m/s

| Case | trials | Likelihood ratio rejects circular at 5% | AIC picks the truth | BIC picks the truth | A fit ends at a bound |
|---|---:|---:|---:|---:|---:|
| circular truth (size) | 300 | 5.0% | 88.0% | 96.7% | 0.0% |
| eccentric truth, e = 0.1 | 300 | 52.7% | 72.7% | 44.0% | 0.0% |
| eccentric truth, e = 0.3 | 300 | 100.0% | 100.0% | 100.0% | 0.0% |
| circular truth, uncertainty understated by 1.5x | 300 | 25.3% | 56.7% | 82.7% | 0.0% |
| circular truth, period range 4.1 to 4.2 d | 300 | 6.0% | 88.7% | 96.3% | 95.3% |

### The integration step: Binary Planet Lab, mean distance to the primary (AU), 10,000 time units

| Planet orbit (separations) | 1/30 s | 1/60 s | 1/120 s | 1/30 to 1/60 | 1/60 to 1/120 | Energy drift at 1/60 s |
|---:|---:|---:|---:|---:|---:|---:|
| 0.05 | 0.503540 | 0.500760 | 0.500723 | 5.6e-3 | 7.5e-5 | 0.0000799% |
| 0.1 | 0.996345 | 0.995692 | 0.995688 | 6.6e-4 | 3.4e-6 | 0.0000798% |
| 0.2 | 1.87207 | 1.87126 | 1.87113 | 4.3e-4 | 7.3e-5 | 0.0000798% |
| 0.3 | 6.44029 | 2.98249 | 2.97258 | 1.2e+0 | 3.3e-3 | 0.0000798% |

### What the tables say, and the failure cases they record

**The intervals.**
- **The Student t interval of a mean holds its 95% on normal samples,** even
  of three.
- **On skewed ones it does not:** 82 to 87% for a lognormal sample of 3 to 20,
  and never 95%.
- **The median's bootstrap interval runs a little short,** 92 to 94%, as the
  percentile bootstrap does for a median at these sizes. It is the better
  choice for a skewed measurement, and the laboratory says so when the values
  span more than a factor of 100.

**The tests.**
- **The permutation test's size is about 5%:** 6.0% ± 0.7% in 1,000 trials.
- **Its power:** it finds a slope of 0.3 standard deviations a step two times
  in three with four seeds a setting, and a slope of 0.1 about one time in
  ten.
- **The rank-correlation interval** excludes zero under no trend 4.8% of the
  time.

**The slopes.**
- **The pulls are centered:** their means are within a tenth of zero.
- **They are wider than 1 by design:** an error estimated from few seeds is
  Student's t, not normal. The local slopes' spread is 1.29 with three seeds
  and 1.06 with six. The trend's is 1.22 to 1.36, where Student's t with the
  line's six degrees of freedom has 1.22.
- **The first design of the trend was worse:** weighted by the cells' own
  estimated errors, it gave pulls with a mean of 0.2 and a spread up to 1.95.
  So the trend is ordinary least squares.

**The models.**
- **The nested test holds its size:** the likelihood ratio between a circular
  and an eccentric orbit rejects the circular truth 5.0% of the time.
- **AIC picks a circular truth 88% of the time,** which is the theory: P(χ²₂
  < 4) = 86.5%.
- **BIC is stricter,** so it finds a small eccentricity (e = 0.1) less often:
  44% against AIC's 73% and the test's 53%.
- **Understated uncertainties are a failure case.** Uncertainties understated
  by 1.5× give the test a false detection one time in four, and AIC one time
  in two. The residual table is where it shows: a scatter in units of the
  uncertainty well above 1 says the uncertainties are too small.
- **So are bounds that exclude the truth.** A period range that excludes the
  truth leaves both models equally wrong, so the comparison between them still
  looks healthy. What catches it is the fits' own warning: in 95% of trials
  one of them ended at a bound, and the comparison repeats that warning.

**The integration step.** In the real engine, the Binary Planet Lab's mean
distance at 0.05 to 0.2 star separations moves by less than 10⁻⁴ when the
step halves from 1/60 to 1/120 s, and by up to 6 × 10⁻³ from 1/30 to 1/60 s.
At 0.3 separations, near where the binary sheds its planet, the 1/30 s run
comes out a different orbit: its mean distance is twice the others'. A step fine enough elsewhere is not
fine enough next to an instability. The step comparison is how a student
finds that out.

## Cost

Both hosts load the laboratory only when it is opened:

| Route | Before | After | Ceiling |
|---|---:|---:|---:|
| `/experiments/`, sources | 1,103.5 KB, 46 requests | 1,101.2 KB, 46 requests | 1,109.0 KB, 47 |
| `/experiments/`, build | 323.6 KB, 2 requests | 318.7 KB, 3 requests | 325.2 KB, 3 |
| `/observatory/`, sources | 168.9 KB, 17 requests | 168.9 KB, 17 requests | 189.6 KB, 19 |
| `/observatory/`, build | 87.8 KB, 3 requests | 87.8 KB, 3 requests | 97.2 KB, 3 |

On the Experiments page:

- **What grew:** the form's second setting, its random spacing and its step,
  their strings, and the lazy import.
- **What paid for it:** Spanish (8 KB), which the page now fetches only when
  it is chosen. An English reader downloads 4.9 KB less than before on the
  build, and 2.3 KB less on the sources, laboratory and all. A Spanish reader
  downloads the same bytes as before, as one more request.
- **The one new request:** a 95-byte chunk holding esbuild's `__name` helper,
  which the page and its first lazy chunk share. The Observatory already
  carries the same one.

The laboratory chunk itself is 70 KB, fetched when Analyze is opened. It
imports nothing the page loads at start: the page's own modules reach it
through its context, as they reach the Observatory's panels. On the
Observatory, the comparison and the correlations live inside the fit panel's
own chunk.
