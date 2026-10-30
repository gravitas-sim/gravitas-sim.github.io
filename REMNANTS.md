# Remnants: cooling ages, the initial-final mass relation, probabilistic outcomes (Prompt 222)

What a star leaves behind and how long it has been cooling: the age of a white
dwarf from its mass and its light, the mass of the white dwarf from the mass of
its star, and the odds of a white dwarf, a neutron star or a black hole from
that mass. Everything here is a model with its stated error, and the page says
where the model is and is not checked.

## Validation contract

The bounds are in `tests/fixtures/remnants/thresholds.json`, committed before
the kernel, the oracle, the validator, any panel or lesson existed and before
any output of the kernel or the oracle was inspected. A crossed bound is a
failed check, recorded in `tests/fixtures/remnants/failed-legs.json` and left
failing; only Carl resets one. The amendments in the same file (AM1, AM2) never
move a bound: AM1 fixes how the table is thinned and how the weights and the
percentile are defined, before any residual was computed; AM2 records the two
legs that failed and adds a leg (A9b) beside, not in place of, the one that
failed. The legs follow section 7.5:

- **(a) Analytic cases (A1-A9b):** the exponents of the cooling law; its
  inverse; the cooling ODE integral; the Stefan-Boltzmann temperature; the
  cold-degenerate radius; the continuity of the published initial-final
  relation; the published loss fractions; the outcome probabilities sum to one;
  the published neutron-star masses.
- **(b) Independent oracle (B1-B5):** `tools/remnants-oracle/oracle.py`
  (numpy and scipy, its own parser of the table) recomputes the calibration, the
  model-limited term and the relations; kernel and oracle agree to about 1e-15.
  The law is compared with the table it was calibrated on (B1, B2), and outside
  its domain (B5, report only).
- **(c) Ensemble coverage (C1-C3):** the 95 percent interval of the cooling age
  covers the table's own age on 1166 simulated white dwarfs of 0.7, 0.8 and 0.9
  solar masses the law was not fitted to (0.965 with both terms; 0.856 with the
  observational term alone); the relation's interval covers 2000 simulated draws
  (0.942); the outcome frequencies match the cited ranges.
- **(d) Refusals and negative cases (D1-D4):** outside the mass or luminosity
  domain, above the Chandrasekhar mass, an unusable temperature, an
  out-of-range initial mass: each is refused with a reason code and no number.
- **(e) Authentic applicability (E1):** 78 cluster white dwarfs against the
  relation, rms 0.0609 solar masses against the paper's 0.06. The relation was
  fitted to these rows, so this is an applicability check, not independent
  validation, and it says so in the leg.

### Two legs that failed, and stay failing

- **A6, continuity of the relation.** The published PARSEC pieces, printed to
  three figures, meet at 2.80 solar masses with a gap of 0.00364 against the
  committed bound of 0.002. The kernel states the published coefficients and does
  not smooth them. The MIST joins close.
- **A9, neutron-star masses.** The leg premised that every neutron-star mass is
  below the white-dwarf model's Chandrasekhar mass. The limit is a white dwarf's
  and one pulsar (1.559) is above it. A9b holds the meaningful half and passes;
  A9 stays failing.

## The model

`js/kernels/remnants/` (pure; no DOM, no clock):

- **`cooling.js`:** a Mestel law, t = tau (A_ref / A) (M / M_sun)^(5/7)
  (L / L_sun)^(-5/7), valid for 0.5 to 1.0 solar masses and log10 L/L_sun from
  -4.0 to -1.5, and refused outside it. `tau` is calibrated on the
  0.6 solar mass thick-hydrogen carbon-oxygen sequence of Bedard et al. (2020)
  (`calibration.js`). The law's error against the table over 0.5, 0.6 and 1.0
  solar masses is the model-limited term, the 95th weighted percentile of
  |ln(t_law / t_table)| (0.185 in the logarithm). It is kept apart from the
  observational term, which is propagated to first order from the mass and the
  luminosity (or the temperature, through the cold degenerate radius). The
  interval is the two together, and the record says which one limits it.
- **`ifmr.js`:** the initial-final mass relations of Cummings et al. (2018), the
  MIST (their eqs. 4-6) and PARSEC (eqs. 1-3) forms, with the scatter of 0.06
  solar masses. The coefficient uncertainties are treated as independent, which
  overstates the interval (about 0.27 at 3 solar masses); the page says so.
- **`outcomes.js`:** the odds of a white dwarf, a neutron star and a black hole
  from uniform cited ranges for the thresholds (7.0 to 9.5 and 20 to 40 solar
  masses), with an outcome named only when it has probability 0.9 or more.
  Neutron-star masses are tabulated from Ozel and Freire (2016).

The cooling law, its calibration and the thresholds are models. Nothing here is
an observed white-dwarf table: the Gaia compilations are non-commercial and no
rights decision admits them (D-INTERIOR-01, D-RIGHTS-03), so the cooling law is
checked against model sequences only, and the lessons say so.

## Data and rights

| Data | Source | Basis | In a repository |
|---|---|---|---|
| Cooling sequences, 0.5 to 1.0 solar masses | Bedard et al. (2020), Montreal group | no licence stated, credited (delegated decision, not reviewed by Carl) | a derived pin of 51 rows per mass in `tests/fixtures/remnants/cooling-pin.json`; the raw files in none |
| Cluster white dwarfs | Cummings et al. (2018), Table 1 | no licence stated, credited (delegated decision, not reviewed by Carl) | 80 rows in `tests/fixtures/remnants/cluster-white-dwarfs.json`, a test fixture never shipped to students |

## The panels and the lessons

Two panels in one lazy family (`js/remnantsWidgets.js`, `js/remnantsField.js`,
`js/i18n/{en,es}.remnants.js`; ids `remnant-cooling` and `remnant-outcome`) and
two investigations, How Old Is This White Dwarf? (`how-old-is-this-white-dwarf`)
and From Star to Remnant (`from-star-to-remnant`), at core, quantitative and
advanced depth with their Spanish, deeper steps and instructor material in the
one closure file `js/data/investigations/remnants-sequence.js`. The central
experiments are the cooling age against the luminosity (4.09 and 0.79 billion
years for 0.6 solar masses at a ten-thousandth and a thousandth of the Sun) and
the final mass against the initial mass (0.745 from 3 solar masses, 0.569 from
1). The kernel, the loader and the panels are never precached.

## Checks

- `npm run remnants:validate` (about 26 seconds; `-- --write-results` rewrites
  `results.json`): every leg above; the Jest file `tests/remnants.test.js` pins the
  results to the committed bounds and the failed legs, and recomputes the
  calibration from the pin.
- `tests/remnantsLessons.test.js`: every number a step states, recomputed from
  the panels, and the two languages' structure.
- `e2e/remnantsLesson.spec.js` and the two rows of
  `e2e/centralExperiments.spec.js`: the panels in a browser, axe, control size.

## What it leaves out

White-dwarf atmospheres (hydrogen against helium), crystallisation and the
phase-separation delay, cooling that depends on core composition, mergers and
binary products, the thresholds' dependence on metallicity and rotation, fallback
and the mass gap between neutron stars and black holes, and any age beyond the
validated luminosity range. Spanish text has not been read by a fluent reader.
