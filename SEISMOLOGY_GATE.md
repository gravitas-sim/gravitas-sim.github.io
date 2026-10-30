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

## Verdict, measurement and consequences

Recorded below once the spike has run.
