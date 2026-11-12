# The angular clustering gate

Roadmap III, Prompt 263, Part B (tranche T5, authorized by Checkpoint V's recorded outcome CONTINUE AS PLANNED, register row D-R10-254-01 and `DECISIONS_2026-11-06.md`; the hard prerequisites 154, 181 and 254 are merged or recorded on `v3`).
Can a two-point angular correlation of a small sample be measured with a Landy-Szalay estimator against a random catalog with the survey's footprint, at what sample size is a signal detectable, and does one pair-count job fit the worker budget? The estimator, the random catalog's construction, the Thomas cluster process with its exact correlation function, the bins, the statistic, the legs and the verdict function were committed before any prototype existed, then measured on a spike. **Verdict by the committed function: B** (the estimator validated and its detectable size measured on a synthetic clustered sample only). The SDSS subset is **not** claimed: the leg that would earn A, a published reference on the strip with its declination and footprint (B9), is NOT RUN, and the strip as the pack stands shows no detectable correlation (B8, B8b, reported). A follow-up (section 8) fetched R4 and R6, searched for R5 and ran the strip again with its declination: the verdict stays B (B9 is still NOT RUN: no published angular correlation of the same sample and limit and no footprint was found). Nothing is built; the consumers rule (Carl, 2026-11-05 and 2026-11-06) holds, so "Clustered or random?" and the link to 253's large-scale structure are not built and **Part B builds nothing in any case**.

The numbers are in `tests/fixtures/crossmatch/` (`clustering-thresholds.json` the contract; `clustering-results.json` the gate stream; `oracle-results.json` the pinned independent calculation, section O4). The prototype (`js/kernels/crossmatch/clustering.js`) and the validator (`tools/clustering-validate.mjs`) are on `spike/angular-clustering-gate` (prototype and validator at `c75dee94`, results at `c12b6e22`), never merged (rule 7.5.4): this pull request is documentation, fixtures and one test. The stream ran on Node 22.23.4 (297 s CPU) and a second run agreed row for row except the cost leg's machine figures (2.8 MB and 5.8 s the second time); the oracle on Python 3.9.6 with numpy 1.26.4, scipy 1.13.1 and astropy 6.0.1 under `python -E`.

## 1. What was committed first, and the order

| Commit | What | Before |
| --- | --- | --- |
| `4111c982` | `clustering-thresholds.json`: the question, A, B and C stated, the estimator, the Thomas process and its exact bin averages, the bins, the strip contract, 11 legs, the verdict function, requests | any prototype, oracle, sample or computation |
| `d6953b8c` | the oracle's first pinned output (Thomas sample, scipy `cKDTree` pair counts, its own randoms, the strip's pair counts) | the prototype |
| `892c1b3c`, `cf0c153a` | amendment AM1 (a reported strip row with randoms over the data's own extent: the oracle's first output had been read and showed w of 0.11 on the strip with a tiny Poisson error, which suggested the footprint mismatch); the oracle again, earlier numbers identical | the prototype |
| `a097c8c8` | amendment AM2 (the error floor `sigma = (1 + max(w, 0)) / sqrt(DD)` and the rule that a bin with fewer than 5 data pairs contributes nothing to T: definitions the statistic needed; no bound moved) | the prototype |
| spike `c75dee94`, `c12b6e22` | the prototype and validator (syntax checked only), then the first run, kept | |

## 2. The decision

**Estimator.** `w_k = (DD/N_DD - 2 DR/N_DR + RR/N_RR) / (RR/N_RR)` with unordered pair counts, `n_R = 10 n_D` randoms uniform in the footprint on the stream `injection` keyed `p263:B:randoms:<index>`, separation by the chord on unit vectors, bins by the dot product (Landy and Szalay 1993, the estimator the roadmap names; bibliographic details are request R6). The statistic `T` sums `(w_k / sigma_k)^2` over the bins with at least 5 data pairs and is compared with the 0.99 quantile of chi-square on that many degrees of freedom.

**Delta table (rule 9).** Existing authority: `js/random/streams.js` (the randoms), `js/kernels/statistics/special.js` (`chi2Quantile`, `chi2Sf`), `js/kernels/crossmatch/geometry.js` (the brute-force check uses its separation). Missing behaviour: a pair counter, the estimator, a jackknife. Adopter: this gate's spike only. Duplication removed: none; `BAO_GATE.md`'s three-dimensional pair counter is on its own spike and is not reused.

## 3. Results

11 rows: **8 pass, 0 fail, 2 reported, 1 not run.**

| Leg | Measured | Bound | Status |
| --- | --- | --- | --- |
| B1 pair counts | brute force on 300 sphere points: identical (261, 966, 3972); the oracle's `cKDTree` counts on the Thomas sample and on the strip: **difference 0 in every bin** | exact; at most max(2, 1e-4 x count) | pass |
| B2 null calibration | **0.015** of 200 null worlds (N = 1000) exceed the 0.99 chi-square quantile (16.81; a calibrated test gives 0.01) | at most 0.03 | pass |
| B2b null bias | mean w per bin within 0.0008 of zero, inside 3 standard errors plus 0.003 | | pass |
| B3 Thomas accuracy | 100 worlds (N about 994): mean w 1.604, 1.484, 1.100, 0.386, 0.011, -0.019 against the exact bin averages 1.552, 1.441, 1.077, 0.373, 0.016, 0 | within max(0.03, 0.1 w) + 3 standard errors | pass |
| B4 detectable size | detection rate 0.82 at N = 100, **1.00 at N = 200**, 400, 800, 1600: **detectable N is 200** | at most 800 | pass |
| B5 cost | one job (DD, DR, RR for 2911 data and 29110 randoms on the strip, 423,681,495 random pairs): **5.6 s CPU, 3.1 MB resident growth** | at most 128,000,000 B and 20 s | pass |
| B6 oracle LS | the prototype's w (its own randoms) against the oracle's (its own, numpy): at most **1.8 sigma** in any bin | at most 4 sigma | pass |
| B7 randoms | two draws identical, all inside the box, 8 x 8 grid chi-square p 0.22 | p at least 0.001 | pass |
| B8 strip | w 0.105, 0.103, 0.077, 0.062, 0.043, 0.013 with jackknife sigma 0.100, 0.095, 0.089, 0.078, 0.059, 0.050; T 4.29 on 6 degrees of freedom (quantile 16.81): **not detected** | reported | reported |
| B8b strip, randoms over the data's own extent (AM1) | w 0.022, 0.026, 0.004, 0.012, -0.008, -0.029 with sigma 0.042 to 0.029; T 1.84: **not detected** | reported | reported |
| B9 published reference | needs the strip with its declination and the footprint (R4) and a published correlation (R5) | required for A | **NOT RUN** |

Reading the rows. The estimator counts pairs exactly and is calibrated well enough: the null false-positive rate is 0.015, above the nominal 0.01 because the Poisson error underestimates the variance of the ratio estimator, inside the committed 0.03. A strong clustered signal (the Thomas process at an amplitude of 1.5 on the smallest scales) is detected in every world from 200 points, and 82 percent of worlds at 100. One job fits the worker budget by a factor of 40 in memory (3 MB against half of the 256 MB low-end aggregate cap) and runs in about 6 s of CPU.

**What the strip says, and does not.** The pack stores right ascension and redshift only, so the strip's correlation is measured with every galaxy and every random at an assumed declination of 0.25 degree, which makes it one-dimensional and limits the bins to 2 to 20 degrees. With randoms over the nominal 120 to 240 degrees the correlation looks like 0.1 at 2 to 3 degrees, but the pack's first right ascension is 130.26 degrees, so the footprint carries an empty 10 degree block and the excess is the footprint mismatch; with the randoms over the data's own extent it is within one jackknife sigma of zero in every bin. Neither is a measurement of the galaxies' clustering: there is no mask, no declination, and no published value to reproduce. A is therefore not earned, and a lesson on this sample would show nothing.

## 4. The verdict, by the function

K = {B1, B2, B2b, B3, B6, B7} and S = {B4, B5} all pass, so the verdict is not C. A needs B9 to pass and the strip detected; B9 is NOT RUN and the strip is not detected, so the verdict is **B**. **What B permits:** a later prompt, if Carl releases the consumers, may build "Clustered or random?" on a **synthetic clustered sample** (the Thomas process or an equivalent, labelled with its truth manifest) with the limits of section 5, and may not present the SDSS strip as a clustering measurement. B builds nothing now. **The link to 253's large-scale structure** stays at counts in cells: nothing here supports it.

## 5. Limits a consumer must state

1. Poisson errors underestimate the ratio estimator's variance; the null test shows a 1.5 percent false-positive rate at a nominal 1 percent, the detection rates are for this design, and the jackknife is the error to show on real data.
2. The detectable size (200) is for a correlation of 1.5 at 0.03 degree in a box of 16 square degrees with `sigma_c` = 0.1 degree; a weaker or larger-scale signal needs more points, and the design is not a model of the galaxies.
3. The flat-sky model (the gnomonic box) differs from the sphere by under 0.3 percent here; the pair counter itself works on the sphere.
4. The footprint of a real survey has holes; a random catalog that does not carry them reads them as clustering (the strip's empty block is the example).

## 6. Requests (R4 and R6 fetched, R5 not found: section 8)

| ID | What | Feeds | Status |
| --- | --- | --- | --- |
| R4 | the strip's galaxies with their declination (the pack's own query re-run with every column it returns, 16247 rows before the strip cut) and the survey's footprint for the strip if one is published, terms read, sha256, into `scratch-data/crossmatch263/` | B9 | **fetched**: the pack's query already returns `dec`, and the file is byte-identical to the pack manifest's raw file (same sha256); no usable footprint was found |
| R5 | a published angular correlation of the SDSS main galaxy sample at the same magnitude limit, source page read, terms | B9 | **not found** (section 8) |
| R6 | the paper that defines the Landy-Szalay estimator, page read | the citation | **read**: Landy and Szalay 1993, ApJ 412, 64-71, DOI 10.1086/172900; the abstract recommends (DD - 2DR + RR)/RR, the form in `estimator.landySzalay` |

## 7. Files and commands

On the spike: `node tools/clustering-validate.mjs [--json] [--write-results]` (about 5 minutes). Here: `tests/fixtures/crossmatch/clustering-thresholds.json`, `clustering-results.json`, the oracle's O4 section, and `tests/crossmatchResults.test.js`, which recomputes the verdict from the rows. The oracle: `python3 -E tools/crossmatch-oracle/oracle.py tests/fixtures/crossmatch/thresholds.json tests/fixtures/crossmatch/oracle-results.json`. The follow-up (section 8): `tests/fixtures/crossmatch/data-legs-thresholds.json` (committed first; B8c, B10, B9), `data-legs-oracle.json` (`python3 -E tools/crossmatch-oracle/oracle_data.py ...`, shared with the crossmatch follow-up), `data-legs-clustering-results.json`, `SOURCES.json`; the script that produced the results is `clustering-strip-dec.mjs` (in `tools/` there) on `spike/angular-clustering-gate` (`50d4cc1e`, pushed, never merged), run with `node tools/clustering-strip-dec.mjs <thresholds> <oracle> <R4 csv> <out>` (about 10 s).

## 8. The data legs (the follow-up, 2026-11-07)

Carl's own words of 2026-11-07, recorded in `DECISIONS_2026-11-07.md`, permit an agent to download public data into `scratch-data/` outside every repository; nothing downloaded was run. The order was the crossmatch follow-up's (`CROSSMATCH.md` section 10): `SOURCES.json`, then `data-legs-thresholds.json` alone (`b4bf0b9b`, every bound set by a stated rule, before any computation on R4), amendment AM1 (a sort clarification of the identity leg, after the first oracle run; no bound moved), the oracle pinned (`6e691648`), the spike script checked for syntax only (`50d4cc1e`), one run.

**R5 and the footprint, not found (B9 stays NOT RUN).** A search of the Landy-Szalay and SDSS galaxy angular-clustering literature on 2026-11-07 found no printed angular correlation function of the spectroscopic main galaxy sample at r < 17.77. The nearest, Wang, Brunner and Dolence 2013 (MNRAS 432, 1961; arXiv:1303.2432), measures the **photometric** DR7 galaxy sample (dereddened model r-band magnitudes) in one-magnitude bins from 17 to 21: a different sample and limit, so a comparison would not be the committed one, and a leg tuned to a mismatched reference would be a new leg; none was added. SkyServer's `Region` table holds 8,060,102 polygons of type POLYGON with no label that identifies a Legacy main-sample mask, so no footprint of the strip was found in usable form. The verdict function reads B8 (measured on an assumed declination, 2 to 20 degrees) and B9; **it stays B**.

**The strip with its declination (B8c, reported; B8c.sampleIdentity and B10 are bound legs and pass).** The R4 rows with 120 <= ra <= 240, 0 <= dec <= 0.5 and z <= 0.12 are the pack's 2911 galaxies (right ascension and redshift equal to half the pack's storage step in every row). With their own declination, the five bins 0.05 to 2 degrees (three times the fibre-collision radius to four times the strip's width), 10 times as many random points, and the delete-one jackknife over 12 blocks of 10 degrees:

| Randoms | w in the five bins | jackknife sigma | T (5 degrees of freedom; 0.99 quantile 15.09) |
| --- | --- | --- | --- |
| F1: the nominal box, right ascension 120 to 240 | 0.848, 0.497, 0.284, 0.211, 0.159 | 0.192, 0.148, 0.112, 0.103, 0.102 | 43.8: detected |
| F2: the data's own right-ascension extent (130.26 to 239.999) | 0.689, 0.366, 0.174, 0.103, 0.071 | 0.105, 0.074, 0.035, 0.027, 0.040 | 109.7: detected |

The data-data pair counts are 2781, 8063, 31743, 45009 and 82837. The pair counter and estimator agree with the independent oracle exactly in every DD count and to at most 1.5 combined Poisson sigmas in w (B10; the oracle's own randoms give T 45.1 and 138.4).

**What this does and does not say.** With the declination the strip shows an excess of close pairs over a uniform box of randoms at 0.05 to 2 degrees under both footprints, decreasing with separation; B8 and B8b, which assumed a declination and could only count 2 to 20 degrees, saw none, and the two are not in conflict (different scales). It is **not a measurement of the galaxies' angular correlation**: there is no mask, so the footprint is the box; the two footprints differ in w by 0.16 at the smallest bin and 0.09 at the largest (the empty block of the first 10 degrees of right ascension in F1 adds a positive offset at every scale), so the amplitude depends on a choice that a real mask would settle; the jackknife statistic with 12 blocks and 5 bins was not calibrated on a null of this geometry (B2 calibrated the Poisson-error statistic on another); the sample is cut at z <= 0.12 where a published sample is not, and there is no published value to reproduce. The verdict function was committed before R4 existed and reads B8; it is not changed by a leg added afterwards, so the verdict is B and whether B8c should count toward A is Carl's decision (the consumers rule holds: "Clustered or random?" and the link to counts in cells are not built).

<!-- Listed in DOCUMENTS.md. -->
