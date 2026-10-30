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

## Verdict, measurement and consequences

Recorded below once the spike has run.
