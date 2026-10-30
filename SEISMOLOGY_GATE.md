# Asteroseismology gate (Prompt 221, Part A)

Whether Gravitas may hand a student a large frequency separation, a frequency of maximum power and a
mass and radius from a red giant's oscillation spectrum: the power-spectrum method and its
normalisation, an independent power-spectrum reference, a background model, the numax and Delta nu
methods, tolerances against a published solution for one public red giant, and what the relations
cannot say. The thresholds are in `tests/fixtures/seismology-gate/thresholds.json`, committed before
any spectrum existed; the prototype is on `spike/seismology-gate` and is never merged.

## What is committed here, before the measurement

- **The power spectrum.** A single-sided power spectral density in ppm^2 per uHz normalised so that
  Parseval holds. An FFT for the evenly sampled cadence grid (a missing cadence zero-filled, the
  spectrum divided by the duty cycle) and a least-squares sinusoid periodogram for gaps, with the same
  units, the same white level (2 sigma^2 dt) and the same sine peak, so the two are comparable.
- **The independent reference.** `astropy.timeseries.LombScargle` and a numpy `rfft` implementation of
  the normalisation, written from the equations in the thresholds file; on one public Kepler light
  curve the astropy spectrum is pinned as a fixture.
- **The background.** Two granulation components of Kallinger et al.'s form attenuated by the
  sampling sinc, plus white noise, fitted by the Whittle likelihood with stated parameter bounds; the
  envelope is a Gaussian added on top.
- **The methods.** numax is the peak of the SNR spectrum smoothed by 2 Delta nu_emp; Delta nu is the
  autocorrelation peak in the envelope, with a shuffle test of the comb; uncertainties from 200
  chi-squared perturbations plus the cited systematic floors; mass and radius by Monte Carlo
  propagation through the scaling relations with the solar references' cited uncertainties and a
  stated relation scatter (10 per cent in mass, 5 per cent in radius; a contract choice between two
  citations).
- **The tolerances.** KIC 10318430 against Yu et al. 2018: numax within 5 per cent, Delta nu within 3
  per cent, mass within 15 per cent, radius within 8 per cent of the published uncorrected 1.31 Msun
  and 5.21 Rsun, on the four-quarter series a student receives and on all 18 quarters.
- **The negatives.** Non-oscillating synthetic spectra, a real active dwarf (EK Draconis) and
  numax outside the domain return "not detected" or no mass.
- **The verdict rule** (A, B, C) is in the thresholds file.

## Three amendments, and when each was made

All three are in `tests/fixtures/seismology-gate/thresholds.json` (`amendments`) with their reasons. None
moved a lower bound, a tolerance against the published solution, or any leg's pass criterion toward the result.

- **AM1** (before any spectrum): the coverage legs F2 and D3 score the formal interval and their upper bound
  became 0.90; G2 and G3, whose interval carries the floors and the relation scatter, 0.95. The perturbation
  method doubles the logarithmic variance of every bin, so a correct implementation over-covers.
- **AM2** (before any spectrum): the gapped sine of A1 is held to 1e-2 against the analytic peak, because the
  committed definition subtracts a mean that is not zero on a gapped sine; the exact comparison with an
  independent fit stays in B2 and B3 at 1e-6.
- **AM3** (after 20 development spectra of a separate seed base, before any gate ensemble): the numax estimator
  subtracts the background instead of dividing by it; the committed ratio estimator is reported beside it and
  fails F1 as well (median 0.034, p90 0.076). The envelope fit also gained a coarse scan of its start values.

## Measurement (spike/seismology-gate, 1ed15f35; Node 24.4.0, numpy 1.26.4, astropy 6.0.1)

| Leg | Measured | Bound | Result |
|---|---|---|---|
| A1 sine, FFT; gapped periodogram | 1.6e-15; 2.0e-7 | 1e-9; 1e-2 | pass |
| A2 Parseval (30 series) | 5.6e-15 | 1e-10 | pass |
| A3 white level (20 series) | 0.49 per cent | 1 per cent | pass |
| A4 FFT and periodogram on gapped white series | 0.46 per cent | 2 per cent | pass |
| B1 numpy rfft oracle | 1.7e-14 | 1e-9 | pass |
| B2 astropy least-squares amplitudes, 500 frequencies | 4.2e-12 | 1e-6 | pass |
| B3 the same on the real Q9 to Q12 series, 400 frequencies | 8.2e-11 | 1e-6 | pass |
| C1 background at the true numax, median and 90th percentile of the relative error | 0.353 and 0.630 | 0.05 and 0.15 | **fail** |
| C2 fits with a parameter on a bound | 0.095 | 0.05 | **fail** |
| F1 numax recovery, median and 90th percentile | 0.0283 and 0.0642 | 0.02 and 0.05 | **fail** |
| D1 Delta nu recovery | 0.00079 and 0.0027 | 0.01 and 0.03 | pass |
| D2 detected (envelope and comb) | 200 of 200 | 0.95 | pass |
| F2 coverage of the formal numax interval | 0.700 | 0.60 to 0.90 | pass |
| D3 coverage of the formal Delta nu interval | 0.985 | 0.60 to 0.90 | **fail** (over-covers) |
| G1 relations on the published numax, Delta nu, Teff | 1.3063 Msun, 5.2098 Rsun | 1.31 and 5.21 within 0.01 | pass |
| G2 coverage of the stated mass interval | 0.775 | 0.60 to 0.95 | pass |
| G3 coverage of the stated radius interval | 0.750 | 0.60 to 0.95 | pass |
| N1 false alarms on 200 non-oscillating spectra | 0 | 0.02 | pass |
| N2 EK Draconis (real dwarf), 2 Delta ln L | not detected (17.9, bar 40) | not detected | pass |
| N3 spectra outside the domain with no mass returned | 0.78 (22 of 50 low-numax spectra returned one) | 1.00 | **fail** |
| E1 KIC 10318430, Q9 to Q12 (12,971 of 18,239 cadences) | numax 156.16 (0.86 per cent), Delta nu 12.965 (0.16), M 1.349 (2.9), R 5.271 (1.2) | 5, 3, 15, 8 per cent | pass |
| E2 KIC 10318430, Q0 to Q17 (50,312 of 71,964) | numax 155.86 (0.66 per cent), Delta nu 12.975 (0.08), M 1.336 (2.0), R 5.252 (0.8) | 5, 3, 15, 8 per cent | pass |

The published solution (Yu et al. 2018): numax 154.84 +- 0.91 uHz, Delta nu 12.985 +- 0.032 uHz, M 1.31 +- 0.08
Msun, R 5.21 +- 0.11 Rsun at Teff 5329 +- 151 K. The real-star legs were run once, after the kernel was frozen
and the thresholds committed; neither the published numbers nor any spectrum of the star was looked at before.

## Verdict: C

By the rule committed with the thresholds: the class **background** (C1, C2),
the class **negatives** (N3), the class **deltaNu** (D3) and the class **numax** (F1) each contain a failing leg, so
the verdict is C: no inference, a reading step on what the oscillations show, and no FFT added to `js/numeric/`.

What the failures say, and what they do not:

- **The spectrum is right and the star is recovered, the ensemble is not.** Every normalisation leg passes to
  rounding against two independent implementations, and on the one authentic red giant both series recover the
  published numax, Delta nu, mass and radius within the committed bounds (within 1, 0.2, 3 and 1.2 per cent for the
  student's year of data). The method fails on what the real star does not test.
- **C1 and C2: the background is not recovered through a 29 per cent gap.** The fitted background at the true numax
  is 25 to 32 per cent too high at every white level and every numax, because the zero-filled gaps (the real
  duty cycle of the quality-flag-zero cadences, 0.71) scatter the comb's power across the spectrum and the
  Gaussian envelope cannot absorb it. A candidate repair, not tested here and not part of any threshold, is to
  fill gaps by interpolation before the transform or to deconvolve the window.
- **F1: numax to 2 per cent is out of reach of a smoothed peak** on three to four radial orders: the median error is
  2.8 per cent whichever estimator (subtracted or ratio) is used.
- **N3: a star outside the domain is not always flagged.** Of 50 spectra with a true numax of 8 to 18 uHz, 22 were
  reported as detected with a numax inside 20 to 226 uHz (some a spurious hump at 160 to 175 uHz) and returned a
  mass; the 50 near the Nyquist frequency were all refused. A rule that refuses an envelope touching the band's
  edges is the repair, again not committed here.
- **D3: the Delta nu interval is far too wide** (median sigma 4.2 times the actual error): the standard deviation over
  perturbations is dominated by occasional jumps of the autocorrelation peak. Under a reading that scores only the
  lower bound D3 would pass, but C1, C2 and N3 fail on either reading, so the verdict is C either way.

Consequences, within the verdict (Appendix C, Prompt 221: C is "none; a reading step on what the oscillations
show; no FFT added to js/numeric/"; Part B runs after a verdict of A or B only):

- **Not built:** the FFT in `js/numeric/`, `js/stellar/seismology.js`, the Kepler pack, the three-depth
  investigation and its instruments. No student sees a numax, a Delta nu, a mass or a radius from a
  spectrum computed here. No consumer is removed (Appendix C: none); Prompt 224's optional enrichment 221 and
  Prompt 248's optional FFT are absent.
- **Built:** this document, the thresholds and results, and a model-page section that says what the oscillations
  show and why nothing is extracted here, with the scaling relations' arithmetic done by hand on the published
  numbers of the one star (which G1 verified).
- **Reversal:** a later gate with its thresholds committed before its prototype, which fills gaps before the
  transform, refuses an envelope at the edges of the band and states an interval that does not over-cover. The
  real-star legs here already pass, and the pinned reference spectrum, the oracle and the ensemble generator in
  `spike/seismology-gate` are reusable by it.
