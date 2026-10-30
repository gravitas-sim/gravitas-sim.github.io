# Activity ages gate (Prompt 220, Part B)

Whether Gravitas may hand a student a gyrochronology age and a flare energy in erg:
the relation, its calibration, its scatter and its domain; the bolometric correction
for flare energies and its source. The thresholds are in
`tests/fixtures/activity-ages-gate/thresholds.json`, committed before any prototype
existed; the prototype is on `spike/activity-ages-gate` and is never merged.

## What is committed here, before the measurement

- **The relations**, with their sources read on 2026-10-30: Mamajek & Hillenbrand (2008,
  ApJ 687, 1264) P = a ((B-V)_0 - c)^b t^n with a = 0.407, b = 0.325, c = 0.495, n = 0.566
  (t in Myr), ±0.05 dex precision for coeval binaries and a 15 per cent absolute scale; and
  Barnes (2007, ApJ 669, 1167) with a = 0.7725, b = 0.601, c = 0.4, n = 0.5189 and about 15
  per cent errors. Their calibration samples stop at about 625 Myr (the Hyades), the Sun is the
  only older datum, and the fast C-sequence is excluded.
- **The domain** in which a number would be printed: 0.5 <= (B-V)_0 <= 0.9, 100 to 625 Myr,
  the slow sequence. Everything else (ages up to 4.6 Gyr anchored by the Sun alone, bluer or
  redder colours, M dwarfs, binaries, periods the relation does not reach) is reading only.
- **The flare energy**: E_band = ED x L_star,band, and the bolometric energy
  E_bol = C(T_f) x E_band for a blackbody flare of temperature T_f (Shibayama et al. 2013: 10,000
  K, with 9,000 K giving 66 per cent of the energy), over the contract's range 9000 to 11000 K.
- **Seven legs and the verdict rule** (A, B, C), all in the thresholds file.

## Measurement (spike/activity-ages-gate, c5c56c84; Node 24.4.0, Python 3.9.6, numpy 1.26.4)

| Leg | Measured | Bound | Result |
|---|---|---|---|
| G1 round trip, both relations | 1.3e-15 | 1e-12 | pass |
| G2 independent numpy oracle (40 points) | 1.1e-15 | 1e-10 | pass |
| G3 coverage of the stated interval (2000 draws, 1895 inside the domain) | 0.959 | 0.93 | pass |
| G4 refusal outside the domain (1000 cases) | 1.000 | 1.000 | pass |
| G5 the two relations agree (95th percentile of the age difference, 25 points) | 0.61 dex (median 0.18, largest 0.64) | 0.10 dex | **fail** |
| G6 EK Dra, P 2.6 and 2.77 d, (B-V)_0 0.61: Mamajek 92 and 103 Myr, Barnes 63 and 71 Myr | all in 30 to 125 Myr | 30 to 125 Myr | pass |
| G7a band integral against numpy | 1.6e-5 | 1e-3 | pass |
| G7b ratio of the largest to the smallest bolometric correction over 9000 to 11000 K | 1.41 (C = 5.5 to 7.7) | 1.5 | pass |

G3 was first implemented with a refused draw counted as a miss: coverage 0.909 against 0.93, a failure. The
threshold's text, "the interval contains the true age at the stated rate", can also be read as the coverage of
the *stated* intervals only (a refused draw states none; 5.25 per cent of draws land outside the domain by
scatter), and on that reading the coverage is 0.959 and passes. The first-implemented reading is the committed
one (it was chosen before the result was seen), so **G3 fails** here; the alternative reading and its number are
recorded as the question for Carl's later ruling, and nothing is reinterpreted by the session. The reading flips
the verdict between B and C.

## Verdict: C

By the rule committed with the thresholds: G3 fails, so the verdict is C (G1, G2, G4, G6, G7a and G7b pass;
G5 also fails: the two published calibrations of the same relation differ, for the same colour and period, by a
median of 0.18 dex (a factor 1.5 in age) and by up to 0.64 dex at the red and young corners, against a stated
precision of 0.05 dex, so a single relation's scatter is not the uncertainty of a gyrochronology age and an
interval of 0.1 dex would be false; with the alternative reading of G3 the verdict would be B, because of G5 alone).
EK Draconis agrees with the published span under both relations (92 to 103 Myr and 63 to 71 Myr), which is a
property of one star near the solar-anchored colours.

Consequences, within the verdict (Appendix C: C is "no ages or energies; Part A stands"; the only age content is
a reading step that states why):

- **Built (in the rotation investigation, later):** a reading step that states why there is no age, showing the Mamajek & Hillenbrand relation and
  the Barnes relation side by side as P(t) curves for a chosen colour, the domain (0.5 to 0.9, the slow
  sequence, 100 to 625 Myr with the Sun the only older datum) and the disagreement between the relations,
  and asks the student why a period alone does not give an age; no age and no age range is printed.
- **Not built:** the upper depth "an age from the spin, with its scatter" as a computed number; any flare
  energy in erg or any bolometric correction in the interface. The equivalent duration stays in seconds,
  in the band, as Part A measures it. (G7a and G7b passed, so the correction is available to a later
  prompt: 5.5 to 7.7 for a flare blackbody of 9000 to 11000 K in the TESS band; the verdict rule names no
  energy under B.)
- **Reversal:** Carl's ruling on the reading of G3 (B), or a third calibration set that brings the relations
  within 0.1 dex over the domain (for example a cluster-calibrated relation with a published covariance of its
  coefficients), which would reopen A.
