# Vetting with ambiguity (Prompt 228)

Is it a planet? The tests that say no, and the cases that say "maybe". This document is
written in stages; the validation contract below was committed first.

## Validation contract

`tests/fixtures/vetting/thresholds.json` fixed every definition, every default and every
bound of the checks below before `js/kernels/vetting/`, the oracle script, the validator,
any panel or lesson existed, and before any output of the kernel or the oracle was
inspected. A crossed bound is a failed check, kept failing in
`tests/fixtures/vetting/failed-legs.json`; only Carl resets one. Amendments are appended to
the file's `amendments` list with their reason; the original bound stays failing.

| Leg | What it holds |
| --- | --- |
| a, analytic | noise-free box depths, odd-even differences, a secondary, the dilution identity of a blend, the difference-image centroid at the eclipsed star and the aperture centroid's analytic shift, the summary's truth table |
| b, oracle | an independent implementation (numpy, scipy, batman, its own point-spread rendering) on pinned synthetic cases: a blend, a clean transit, two frame series |
| c, ensembles | false rejection, false acceptance, the power rule (a low-signal candidate never passes) and the coverage of the stated uncertainty, on seeded ensembles; the rates are shown to the student |
| d, refusals | one odd transit, a gap, pure noise, too few frames, invalid inputs, and a summary that never says "planet" |
| e, authentic | HD 209458 and Kepler-13 from the TESS light curves the Observatory ships: no light-curve test rejects a confirmed planet |

No cited vetting package (exovetter, lightkurve, TRICERATOPS) is installed and none was
downloaded: the oracle is an independent implementation of the stated contract, so what it
checks is the code, not the choice of tests. Its limits are stated with its results.
