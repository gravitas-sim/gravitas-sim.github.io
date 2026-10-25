# Crater counting: relative ages, size-frequency distributions and diameter uncertainty

Prompt 195 (Roadmap III, R14, production kernel). The kernel in
`js/measure/craters.js`: a circle mark becomes a diameter with an uncertainty
budget, a list of diameters over a stated area becomes the cumulative
size-frequency distribution with Poisson intervals, two lists become a relative age
with an interval, and a list gives the cumulative power-law index with an interval.
No absolute age is computed or reported anywhere: that is Prompt 196's gate.

## The validation contract (committed first)

`tests/fixtures/craters/thresholds.json` fixed every definition, every bound and
every refusal code before `js/measure/craters.js`, the validation tool, the oracle's
inputs, script and results and the tests existed (Roadmap III, 7.5.8). A check
that a measurement crosses is a failed check; only Carl resets a bound.

| Tier | Checks |
| --- | --- |
| (a) analytic | a1 Garwood closed forms and defining equations; a2 a hand-made cumulative table; a3 the diameter budget; a4 foreshortening and the footprint area; a5 the exact density ratio and its Clopper-Pearson ends; a6 the index and its chi-square interval |
| (b) independent oracle | b1 the curve and Garwood ends, b2 twelve ratio intervals, b3 the index and its interval, against scipy (`chi2.ppf`, `beta.ppf`, `pareto.fit`) and numpy on a pinned list; b4 a cited crater-statistics tool's curve: NOT RUN (craterstats is not installed and nothing may be installed or fetched) |
| (c) coverage | c1 Poisson, c2 ratio, c3 index (4,000 trials each), c4 the diameter budget's one-sigma coverage |
| (d) refuse, widen, say "not constrained" | d1 two regions of one density return "no significant difference"; d2 a density ratio of 3 is detected the right way; d3 every refusal code; d4 a roll-off the index fit does not know about is flagged |
| (e) authentic data | e1 the reference regions' published counts: NOT RUN (the regions, their published diameter lists and their frames are not in the repository) |

The model, its limits and the results are below once the kernel exists.
