# Stellar rotation and flares (Prompt 220)

What a star's light curve says about how fast it spins and how active it is:
the period of the spot modulation with its factor-two alias kept in view, and
the flares with their equivalent durations and their frequency distribution.
Part A (this document) is the kernel, its validation, the packs and the
investigations. Part B (ages from the spin, flare energies in erg) is gated and
is recorded in [ACTIVITY_AGES_GATE.md](ACTIVITY_AGES_GATE.md) once measured;
nothing in Part A converts a period to an age or an equivalent duration to an
energy.

## Validation contract

The bounds are in `tests/fixtures/stellar-activity/thresholds.json`, committed
before the kernel, the oracle, the validator, any pack or any lesson existed.
A crossed bound is a failed check, recorded in
`tests/fixtures/stellar-activity/failed-legs.json` and left failing; only Carl
resets one. The legs follow section 7.5 rule 8:

- **(a) Analytic cases:** a spot at the disc centre against its closed form; a
  hemisphere-sized spot covers the whole disc; a spot behind the limb changes
  nothing and the deficit is continuous through the limb; exact periodicity and
  mirror symmetry; two antipodal equal spots have the half period; differential
  rotation changes the period of a spot to P_eq / (1 - k sin^2 lat); the flare
  template's integral (1.827046 amp t_1/2) and its conservation under exposure
  integration; the equivalent duration of a boxcar; the closed-form
  maximum-likelihood slope and its exact interval.
- **(b) Independent oracle:** `tools/stellar-activity-oracle/oracle.py`, which
  shares no code with the kernel: a brute-force sky-plane pixel integral for the
  spot flux; Astropy's `LombScargle` for the period; and an implementation of
  the flare rule written from its text with `scipy.signal.medfilt`.
- **(c) Ensemble coverage:** the stated 95 per cent interval of the period
  covers the truth on 200 seeded spotted stars; the equivalent-duration interval
  on 300 injected flares; the exact slope interval on 500 draws; injection and
  recovery completeness by amplitude and width.
- **(d) Misspecified and negative cases:** white noise returns "no signal"; a
  baseline under two cycles returns "not constrained"; a double-dip light curve
  returns the factor-two alias as a candidate, never one period; an evolving
  spot widens the interval; spot modulation alone raises no flare.
- **(e) Authentic data:** AU Mic (TESS sector 1) against the period of Gilbert et
  al. (2022) within its stated uncertainty; EK Draconis (sector 16) against the
  span of the literature values, whose disagreement is the differential rotation
  the model states as a limit; the flare rate of AU Mic against the published
  count as an applicability check.

## Kernel, assumptions and limits, results

Filled in as the kernel is built (see the validation table below once the
validator has run).
