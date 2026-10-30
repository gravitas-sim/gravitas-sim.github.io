# The transit model delta (Prompt 225)

What the Observatory's transit fit gained, what it was checked against, and what
failed. Prompt 225 of Roadmap III; the contract and the oracle were committed
before any of the code (`tests/fixtures/transit-delta/thresholds.json`).

## What was built

The quadratic transit model of `js/inference/transit.js` is **unchanged**: the same
parameters, the same numbers, bit for bit (a golden file of an HD 209458 fit and of a
seeded synthetic fit is compared in `tests/transitDelta.test.js`). Beside it:

- **A four-coefficient limb-darkening law** (Claret 2000),
  I(mu)/I(1) = 1 - sum over n = 1..4 of c_n (1 - mu^(n/2)), as a second model
  variant, `transit-claret4` 1.0.0 (`family: 'transit'`). It is a new model id, so an
  older build refuses it by name instead of fitting something else. The four
  coefficients are **fixed, never fitted** (they trade against each other and against
  b); the fit loses q1 and q2 and keeps t0, P, k, a/R\*, b and the baseline. The
  occultation is the same annulus integral, with the light inside a radius in closed
  form (total light pi (1 - sum c_n n / (n + 4))).
- **Where the coefficients come from.** The model takes them from the reader, who
  types them and says where they came from ("your table"), or from a table lookup
  (`lookupClaret` in `js/inference/transitDelta.js`: multilinear in Teff, log g and
  [Fe/H], exact at the nodes, a refusal outside the table instead of an
  extrapolation). **No table ships.** The Claret (2017) TESS table (VizieR
  J/A+A/600/A30) was not supplied; see "Data not supplied". A law that is not positive
  and rising to the centre is refused (`claretRefusal`).
- **The star's mean density** from P and a/R\*, rho = 3 pi (a/R\*)^3 / (G P^2), in
  g/cm^3 with its uncertainty, labelled as the **circular-orbit** value. P is read in
  the light curve's own time unit. With an eccentricity and argument of periastron
  stated by the reader, a second row, `rhoStarEcc`, divides by
  Psi = ((1 + e sin omega) / sqrt(1 - e^2))^3 (Kipping 2010) and says it is for the
  stated e and omega. The fit itself stays circular, so the correction is first order.
- **A constraint check** (`result.transit.kb`): whether the radius ratio and the
  impact parameter are fixed by the data. `not-constrained` when b plus its sigma
  reaches 1 - k (a flat-bottomed solution is not excluded, so the V-shape ambiguity is
  open) or when the rank check of the core names k or b; `fixed` when b was held. The
  k-b correlation is reported beside it, and is not a reason (amendment AM2).
- **A residual test** (`result.transit.residual`): the chi-square of the points within
  T14/2 plus half an exposure of every mid-transit against their count, one-sided,
  fails below p = 0.01 or when the core's correlated-noise warning is present.
- **The covariance ellipse** (`confidenceEllipse`, `ellipseOfFit`), for k against b and
  k against q1 (quadratic law), drawn through the plot component with a table beside
  it (semi-axes, angle, correlation), scaled like the stated sigmas; plus the profile
  of the chi-square against k and against b.
- **The panel.** The fit panel's full parameter set sits behind a disclosure
  (`#fitMore`), whose summary keeps what is assumed in view (`#fitDeclared`): the law,
  its coefficients and source, the orbit assumed circular unless stated. English and
  Spanish.
- **The record.** The result is the 150 record of the core (the schema gains the model
  id and the `eccentricity` setting; a test pairs the schema and the validator).
- **The guide.** "Fit the transit" gains an **upper depth** (five steps: the density,
  the eccentric correction, the covariance ellipse, the two laws, the V-shape and the
  grazing transit). The steps of the lower depths are identical to those on v3 and are
  graded identically (`tests/fixtures/transit-delta/exo-fit-steps-v3.json` holds them;
  a test compares). The Observatory's course packs map the upper depth to the advanced
  path.
- **The model page** (`/model/`, section "Transit fitting").

Found and fixed on the way: in Spanish the fit panel prefilled "0.005" in its fields,
which the Spanish reader parses as five, so Run was refused on the first click. The
prefilled numbers now use the reader's decimal separator (`decimal` in
`js/observatory/fitPanel.js`). The bug was on v3 before this prompt.

Not built: a fitted four-coefficient law, an eccentric-orbit model (the correction is
first order and labelled), a mass or a planet density, spot modelling, a new
fitter, a fit of the star's temperature.

## Validation contract

`npm run transit-delta:validate` prints the table; `-- --write-failed` and
`-- --write-results` rewrite `failed-legs.json` and `results.json`, which
`tests/transitDelta.test.js` holds the code to. The oracle
(`tools/transit-delta-oracle/oracle.py`: batman 2.5.1, scipy `least_squares`, numpy; no
Gravitas code) writes its own noise (seed 225) and fits the shipped HD 209458 rows.
Every bound was committed first. A crossed bound is a failed leg, kept failing; only
Carl resets one.

| Leg | What | Result |
| --- | --- | --- |
| A1-A7 | closed forms: the uniform star, c = [0, u, 0, 0] as the quadratic law, total light by an independent integral, a small planet's depth, the Sun's density 1.4098 g/cm^3, Psi against a numerical Kepler orbit, the ellipse | pass (1e-14 to 5e-5 against bounds of 1e-12 to 2e-3) |
| A8 | the table lookup on the supplied table | NOT RUN: no table supplied |
| B0 | forward model against batman, six cases | pass, 5.0e-6 against 1e-5 |
| B1 | fits S1-S3 against the oracle (oracle as first run) | **FAIL**, worst 0.59 sigma against 0.25 |
| B1b | the same, oracle amended (AM1) | pass, worst 0.23 sigma |
| B2 | HD 209458, quadratic, oracle as first run | **FAIL**, q1 2.2 sigma, chi-square 10.8 |
| B2b | the same, oracle amended | **FAIL**, worst 0.61 sigma (q1), chi-square 5.3 |
| B3 | HD 209458, four-coefficient test law, b fixed at 0.43, first oracle | **FAIL**, k 1.16 sigma, chi-square 186 |
| B3b | the same, oracle amended | **FAIL**, k 0.27 sigma against 0.25, chi-square 43 |
| B2c, B3c | the same two fits at 21 samples per exposure (AM3) | pass: every parameter within 0.07 of an oracle sigma, chi-square within 0.02 |
| B4 | an eccentric orbit fitted circular, corrected density, first oracle | **FAIL**, 12.4 percent against 10 |
| B4b | the same, oracle amended | pass, 5.4 percent (uncorrected 88 percent) |
| C1 | median pull per cell, both laws, b = 0 to 0.8 | **FAIL**, worst cell 1.98 (quadratic, b = 0, where b sits on its bound at 0) |
| C2 | median density error per cell | **FAIL**, quadratic 11 to 13 percent against 5 and 12; four-coefficient 2 to 5.6 percent |
| C3 | E1 coverage, four-coefficient, 30 seeds | **FAIL**, 1.96 sigma holds a/R\*, b and the density in 0.83, 0.87, 0.83 against 0.85 |
| C4 | E2 coverage, quadratic | pass |
| C5 | E3 coverage, grazing | pass |
| D1 | grazing seeds flagged not constrained (rule as committed) | pass, 30 of 30 |
| D2 | clean seeds wrongly flagged (rule as committed) | **FAIL**, 30 of 30: see AM2 |
| D1b, D2b | the rule as amended | pass, 30 of 30 and 1 of 30 |
| D3 | a spot crossing fails the residual test | **FAIL**, 7 of 30 against 27 |
| D4 | clean seeds fail the residual test | pass, 0 of 30 |
| E1 | a published TESS solution reproduced | NOT RUN: see below |

18 pass, 11 fail, 2 not run. The failures are in `failed-legs.json` with their
measurements. What each says:

- **The first oracle was wrong, not the kernel (AM1).** B1 to B4 failed as first judged.
  At the oracle's own parameters on HD 209458 Gravitas's model gave chi-square 15,866.6
  for the fixed-b fit and batman's gave 16,009.2 at 21 samples, 15,895.4 at 101 and
  16,795.6 at 5. batman averages its samples at a spacing of exp_time/(ss-1) with both
  ends included, which integrates an exposure ss/(ss-1) times as long as the one it is
  given. Passing exp_time (ss-1)/ss gives 15,866.6 at 21, 15,869.2 at 101 and 15,824.3
  at 5, and Gravitas's value is 15,866.59 to the cent. The oracle was corrected, rerun
  with the same seed, and B1 to B4 re-judged as B1b to B4b with the same bounds, beside
  the first judgement and not in place of it (`oracle-results-first.json` is kept).
- **B2b and B3b are the panel's default of five samples (AM3).** The contract fixed
  Gravitas at the fit panel's default of 5 samples per exposure and the oracle is
  converged at 21. At 21 samples Gravitas gives chi-square 14,962.45 (quadratic) and
  15,865.67 (four-coefficient, b fixed) against the amended oracle's 14,962.45 and
  15,865.65, with every parameter within 0.07 of an oracle sigma (t0 and P; the others
  within 0.01); that is B2c and B3c, which pass with the bounds of B2 and B3. So the
  kernel and the fitter agree with batman and scipy; what B2b and B3b measure is that
  five samples are not converged for a 20-minute exposure (chi-square 15,823 against
  15,866 on the same data, k 0.27 sigma off with b fixed). The default was not changed
  here (it is the panel's for every model); a reader who needs the last fraction of a
  sigma raises it.
- **C1, C2, C3.** Honest statistical weaknesses of the fit, not bugs in a leg: at b = 0
  the impact parameter sits on its lower bound and its pull is not a normal one; the
  quadratic law with q1 and q2 free gives a density good to 11 to 13 percent at these
  cadences, the four-coefficient law (coefficients known) to 2 to 5.6 percent; the
  stated uncertainties cover a/R\*, b and the density 83 to 87 percent of the time
  within 1.96 sigma, a little under nominal.
- **D2 and AM2.** The committed rule also flagged a k-b correlation above 0.95. Every
  clean transit of the ensemble has one (0.98 to 0.99), so the rule said "not
  constrained" for all of them, and D1 passed only because of it. The committed rule is
  still measured (D1 and D2, `constraintKB(fit, { committed: true })`) and still fails
  D2. The panel and the record use the rule without it, measured by D1b and D2b.
- **D3.** The spot is an 800 ppm Gaussian 0.02 d wide, about three 20-minute points at
  3.8 sigma each. The test has little power on it (p between 0.03 and 0.04 for most
  seeds against the bound 0.01). It is a fact about this case, and the leg stays failing.
  A wider or deeper crossing is caught; none is claimed beyond that.

## Data not supplied

- **A8, the Claret table.** Claret (2017), "Limb and gravity-darkening coefficients for
  the TESS satellite", A&A 600, A30, VizieR J/A+A/600/A30. The machine could not reach
  VizieR, and the coordinator fetches such data (URL, terms and expected hash named
  first). Nothing is typed from memory. When a file lands, `lookupClaret` reads it and
  A8 runs; until then the four-coefficient model takes reader-entered coefficients,
  labelled as theirs.
- **E1, an authentic published TESS solution.** The NASA Exoplanet Archive parameter sets
  for HD 209458 b were fetched by the coordinator (a public archive, credited; its terms
  page was not read; 23 sets). None cites TESS data or carries uncertainties for Rp/R\*,
  a/R\* or b, so no TESS-era comparison within a published sigma can be made. The
  literature comparison already in `INFERENCE_CORE.md` (Stassun 2017, Knutson 2007) is
  not this leg. E1 stays NOT RUN until a published solution with uncertainties is
  supplied under a recorded rights decision.

## Where things are

| What | File |
| --- | --- |
| The law, the density, the eccentric factor | `js/inference/transit.js` |
| The model variant, its derived rows and refusals | `js/inference/models.js` |
| The table lookup, the ellipse, the two checks | `js/inference/transitDelta.js` |
| The panel | `js/observatory/fitPanel.js` |
| The guide's upper depth | `js/observatory/guides/exoplanet.js` |
| The contract, the oracle, the results | `tests/fixtures/transit-delta/`, `tools/transit-delta-oracle/`, `tools/transit-delta-validate.mjs` |
| The tests | `tests/transitDelta.test.js`, `e2e/transitDelta.spec.js` |

Reproduce: `python3 tools/transit-delta-oracle/oracle.py > oracle-results.json` (about
ten minutes), then `npm run transit-delta:validate` (about two).
