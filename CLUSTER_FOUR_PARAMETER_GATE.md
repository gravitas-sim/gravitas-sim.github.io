# Cluster fitting, Part B: the four-parameter gate

Roadmap III, Prompt 219 Part B (tranche T3, D-R10-207-01). **Verdict: C. Part A stands: age and distance at a stated metallicity and
reddening; metallicity is not fitted, and no three-parameter variant is built.** The prototype is on the spike branch
`spike/cluster-four-parameter-gate` (head 24d7c63a), which is never merged; this document, `tests/fixtures/cluster-gate/` and the register row
D-R10-219-03 land the verdict. The models, ensembles, bounds and the decision rule were committed
(`tests/fixtures/cluster-gate/thresholds.json`, spike commit 2c7d31b9) after Part A's kernel and results were measured and before any spike
code, dataset or result existed.

## What was measured

The membership model (a two-component mixture on radial velocity fitted by expectation-maximisation, the field's color-magnitude density
from the stars with membership below 0.2), a stated binary treatment (fraction 0.30, four mass-ratio nodes), Prompt 154's selection function
(`logisticCompleteness`, 50 percent at g = 19.0, width 0.5, normalised over the window so counts enter), and a four-parameter fit (log age,
distance modulus, reddening, [Fe/H]) by Nelder-Mead with profile intervals at 68.27 percent (each parameter's profile is the minimum over
the other three, from warm starts; an interval that runs into a bound is open). The three-parameter variant profiles [Fe/H] over its stated
prior range [-0.5, 0.0].

| Leg | What | Bound | Measured | Status |
|---|---|---|---|---|
| G1 | 1-sigma coverage of the four parameters, every assumption true (40 seeds) | 0.50 to 0.85 | log age 0.325, modulus 0.375, E 0.325, [Fe/H] 0.45 | **FAIL** |
| G2 | at least 85 percent of seeds with four closed intervals | 0.85 | 0.975 | pass |
| G3 | coverage of E and [Fe/H] with a truth away from the grid (40 seeds) | 0.45 to 0.88 | E 0.275, [Fe/H] 0.35 | **FAIL** |
| G4 | NGC 2420 at four parameters: ranges overlapped, all closed | published ranges | age interval open (lower end 9.551 above the best 9.479), reddening interval not found, [Fe/H] -0.43 to -0.34, modulus 11.63 to 11.69 | **FAIL** |
| G5, G6 | binary fraction half the assumed; selection 0.5 mag off (reported) | none | coverages 0.25 to 0.45 and 0.30 to 0.40; median biases below 0.01 dex and 0.03 mag | reported |
| H1 | three-parameter coverage (40 seeds) | 0.50 to 0.85 | log age 0.125, modulus 0.175, E 0.25 | **FAIL** |
| H2 | three closed intervals on at least 85 percent | 0.85 | 0.85 | pass |
| H3 | NGC 2420 at three parameters | published ranges | age 2.93 Gyr (2.93 to 3.08), modulus 11.80 (11.78 to 11.80), reddening interval open | **FAIL** |

The decision rule: A when G1 to G4 pass; otherwise B when H1 to H3 pass; otherwise C. G1, G3, G4, H1 and H3 failed, so the verdict is C. No bound was moved.

## What the failure is, and what it is not

* The best-fit parameters were right (median biases of 0.001 dex in age, 0.002 mag in modulus, 0.006 in E and 0.02 in [Fe/H] on the well-specified ensemble); the intervals were too narrow, at about a third of the stated coverage, even with every assumption true. That is the one thing an interval that is shown must not do, so none is shown.
* Two causes are possible and were not separated: the statistic (a membership-weighted likelihood with a binary and selection model that is not exactly the one that drew the data) and the profile minimiser (90 Nelder-Mead evaluations per profile point stop early on a ridge, which makes a profile too high and an interval too narrow). A more thorough minimiser or another likelihood is a new gate with its own committed bounds, not a repair of this one.
* **Run 1 was a defect of the spike, recorded:** it used fixed profile grids (0.02 in log age, 0.05 in modulus) far coarser than the profiles (a 0.012 wide age interval), so every profile of age and distance was refused and G1, G2, G3, H1 and H2 failed on that alone. The grids were changed (profiles walked outward from the best fit in geometric steps) before run 2, the run reported above; no bound or leg changed. Run 1's outcome is stated here and its numbers are not used (age and distance intervals were all open).
* NGC 2420's G4 and H3 are with all 463 SEGUE stars with velocities weighted by membership; the three-parameter age (2.9 Gyr) sits above the published 1.74 to 2.2 Gyr and the reddening is driven to its lower bound, which is the same degeneracy Part A's E1 shows at fixed metallicity.

## Consequence

Part A stands unchanged: its panel, guide steps and record state that metallicity is a stated assumption, and the populations guide's advanced path asks the student whether the interval includes it (it does not). A four-parameter fit would need a better-behaved profile and a likelihood that covers on its own synthetic data before it is a feature.
