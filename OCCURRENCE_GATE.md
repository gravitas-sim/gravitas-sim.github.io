# Occurrence rates: the gate (Prompt 229, Part A)

Documentation only. The prototype is the spike branch `spike/occurrence-gate` (never merged; the commit that
first held the kernel and the validator, 573d89a9). The thresholds were committed before any occurrence code
existed (`tests/fixtures/occurrence/thresholds.json` on `feat/occurrence-rates`, commit 6d96f48d), the oracle's
results were pinned before any kernel row was judged (`tests/fixtures/occurrence/oracle-results.json`, numpy,
scipy and batman 2.5.1, no Gravitas code), and the verdict rule was written with them.

## What was committed

- **The searched population:** a synthetic survey of 2000 stars (radius log-normal, noise log-normal per 30-minute
  cadence, three spans of 90, 365 and 1460 days) with planets in 40 bins (eight period octaves from 1 d, five radius
  octaves from 0.5 Earth radii); circular orbits.
- **The per-target completeness:** the geometric probability R*/a times the recovery of an injected transit, the
  number of epochs of the span entering the signal; recovery is the matched filter at the injected ephemeris, with a
  threshold of 7.1 and at least 3 epochs; its analytic form is Phi(S - threshold).
- **Reliability:** a stated false fraction per period bin, an input; the rate is n r / E.
- **The rate:** the expected number of planets per star in a bin, which may exceed one. **The likelihood:** Poisson in
  each bin with the completeness summed over the targets (the selected-population likelihood of Prompt 154's object).
  **Zero bins** are one-sided upper limits at 95 percent; a bin whose summed completeness is below 5 is not constrained.
- **The interval:** Prompt 154's Poisson procedure. **The coverage test:** 400 populations on the 2000 stars at 0.6827
  and 0.95. **Smoothing:** none is offered; any would be a regularisation and not a posterior.
- **Verdicts:** A rates with intervals; B rates only in bins with at least 10 listings; C completeness maps only.

## Result (Node 24.4, `npm run occurrence:validate`)

| Leg | What | Result |
| --- | --- | --- |
| A1 to A7 | geometry, epoch counts, S_true against batman, the efficiency against Phi(S - threshold), one draw against a draw at every point, AR(1) closed form, the Poisson rate and interval against scipy | **pass** (A3 worst 1.7 percent of 2; A4 worst 0.009 of 0.03; A7 to 3e-13) |
| A8 | one bin at 1.5 planets per star recovered over 100 populations | **pass** (mean 1.498, every population above one) |
| B1 | the completeness sum against the oracle's batman quadrature, 39 bins | **pass** (worst 1.3 percent where the sum is at least 20, 3.6 percent from 3 to 20) |
| B2, B4 | the rate and the interval of 15 bins against the oracle's, on the oracle's own detections | **pass** (worst 0.9 percent) |
| B3 | the rate within 4 sigma of the oracle's truth in the rich bins | **pass** (4 bins, worst 2.6 sigma) |
| C1 to C4 | coverage over 400 populations | **pass** (4 rich bins: worst 0.75, pooled 0.766 at 0.6827 and 0.959 at 0.95; 21 sparse bins: worst 0.65; mean rate within 1.1 sigma of the truth) |
| D1 to D3, R1 | the limit, the floor, the refusals, reproducibility by seed | **pass** |
| D4 | pooled coverage with the reliability misstated, rich bins at 32 d or more | **FAIL, unmeasurable**: no such bin holds 10 expected listings |
| D4b (AM1) | the same bound over the bins at 32 d or more with at least 3 expected listings | **FAIL**: 3 bins, 0.79 (stated 0.82) |
| E1 | an authentic survey under a fixed contract | **NOT RUN**: none supplied |

D4 and D4b are a demonstration of the reliability term, not a bound on the method; both stay failing and labelled in
`failed-legs.json`. A misstated reliability scales every rate in the bin by the same factor; at the few listings of
this survey the Garwood interval is wide enough to hide it, which the lesson does not claim otherwise.

## Verdict: A

Rates with intervals in every bin that is not under the floor, limits for bins with none, refusals for bins the
survey could hardly see, under these stated limits: the search is the matched filter at the known ephemeris (so
completeness is optimistic), the interval carries counting error only, the rich bins number four (the coverage
evidence there is thin; the sparse bins carry the rest), the authentic leg is not run, and nothing here says anything
about a real survey. Part B builds the workbench panels and the lessons within this verdict.
