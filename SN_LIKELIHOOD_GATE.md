# The supernova likelihood gate

Roadmap III, Prompt 256, Part A (tranche T5, authorized by Checkpoint V's recorded outcome CONTINUE AS PLANNED). One covariance
decision for a browser likelihood on the Pantheon+ rows already in the tree, its size against the data budget, its conditioning, the
solver, the nuisance treatment, the planes and their delta levels, an independent calculation and the tolerances, all committed before
any code, then measured on a spike. **Verdict by the committed function: A, which here means a narrow thing** (section 5): the
two-parameter contours of the decided covariance, a covariance this gate chose and stated, agree with an independent implementation to
1e-9 in chi-square and cover the truth at the stated rates. Nothing compares them with the published contour (that leg is NOT RUN,
section 7), nothing is built, and the consumers rule (Carl, 2026-11-05) holds every panel, lesson, viewer and contour. **Part B is not
begun and is declined in this session**: the execution contract forbids starting the next part, and no consumer may be built on this
kernel until the published-contour leg has run and passed. The record is decision-register rows D-R10-256-01 to D-R10-256-05.

The numbers are in `tests/fixtures/supernova-likelihood/` (`thresholds.json` the contract and its three amendments; `oracle-results.json`
the pinned independent calculation; `results.json` the gate stream; `failed-legs.json`, empty: no leg failed). The prototype
(`js/kernels/cosmology/likelihood/snLikelihood.js`), the validator (`tools/sn-likelihood-validate.mjs`) and the oracle
(`tools/sn-likelihood-oracle/oracle.py`) are on `spike/supernova-likelihood-gate` (bc9d5844), never merged (rule 7.5.4): this PR is
documentation and fixtures only. The gate stream ran on Node 22.23.4 (about 270 s on a loaded Mac); the oracle on Python 3.9.6 with
numpy 1.26.4, scipy 1.13.1 and astropy 6.0.1 (about 300 s). Two complete runs agree row for row (only the CPU timings differ).

## 1. What was committed first, and the order

| Commit | What | Before |
| --- | --- | --- |
| `4f298510` | `thresholds.json`: the decision, the model, the 40 legs with their bounds, the ensembles and their coverage bounds, the verdict function, the four external requests | any code, oracle, run or statistic of the rows |
| `b8b5fdb5` | AM1 (a node on the bounce boundary, and a node whose astropy distances are not finite, are refused by both implementations) and AM2 (the condition estimate iterates to convergence, not a fixed 100) | any prototype code or validator run |
| `dd30dfa0`, spike `b31e60f5` | the oracle (no Gravitas code) and its pinned output | the prototype was written |
| `025845be` | AM3 (the registered random stream is `noise`: `js/random/streams.js` allows six ids) | any leg result |
| `47ae82e5` | the oracle's output run again against the file that carries AM1 to AM3 (numbers unchanged, only the thresholds sha256 it records) | the prototype was run |
| spike `758bfd35`, `bc9d5844` | the prototype and the validator; the stream run twice from the final spike commit | |
| `7b3ab574` | `results.json` and `failed-legs.json` (run 2, spike `bc9d5844`) | |

What had been seen before the thresholds were committed, and only that: the Pantheon+ pack's record (1,701 light curves, 77 calibrators,
the columns, the raw checksum, and its recorded diagonal-only fit, Om 0.351 and chi-square 745.4 for 1,699 dof, against a published value an earlier
session typed there), the raw file's header and first four rows, the Prompt 255 kernel and its failed legs, `js/numeric/linalg.js` and
`js/kernels/statistics/`. Nothing of any distribution. After the commit and before the oracle, one throwaway line printed the sample's
count after the cuts (1,580), its largest redshift, its smallest error and that the decided covariance is positive definite; after the oracle and before
the prototype, its output was read (best fits, the open contours of the 12-row set, the one synthetic set whose best fit lies four sigma from its truth, a rare draw by a 300-draw check of the oracle's generator and not a fault,
section 5). None changed a bound; the three amendments are mechanical (a crash and two method details) and were recorded first. **Nothing was fetched and
no published number, licence term or covariance value was typed from memory.**

## 2. The decision

The release's full systematic covariance is tens of megabytes; the pack carries none of it. `mu_err` is the diagonal of that covariance,
so it already holds the systematic variances: adding systematic terms to it in quadrature would count them twice. The three options of the
prompt, against the tree:

| Option | Needs | Size (32-bit floats) | This gate |
| --- | --- | --- | --- |
| T1, a subset with its covariance block | the release's covariance file | 4 n (n + 1) / 2: 4,995,960 B for n = 1,580; 180,600 B for 300; 20,200 B for 100 | NOT RUN (request X3) |
| T2, a low-rank projection with its retained variance | the same file | 4 (k n + n): 69,520 B for k = 10, 195,920 for 30, 638,320 for 100 at n = 1,580 | NOT RUN (request X3) |
| T3, the statistical diagonal with named systematic terms | nothing beyond the pack | 0 B added | **decided, in the split form below** |

**Decided: T3, split form.** C has the pack's `mu_err` squared on the diagonal, unchanged (no variance added, none removed), and
tau^2 between every pair of rows of one survey (the pack's survey code, a survey with at least two rows in the sample): a named term,
"survey-coherent zero point", of tau = 0.02 mag. tau is a stated design size, **not a published systematic**: nothing here claims to
reproduce the release's covariance, and a contour drawn on it is a contour of this covariance. The matrix is positive definite exactly when
every error in a multi-row survey exceeds tau, and otherwise the likelihood refuses ('not-positive-definite'). A common offset of all rows (the
supernova absolute magnitude together with 5 log10 H0) is not in C: it is the nuisance. Rejected: diagonal plus tau^2 on the diagonal
(double counts the pack's diagonal), shipping the release's matrix (the packs' raw and gzip ceilings, 355,282 and 111,422 B, are at their limits, 0 B of room;
`S2.alternatives` reports the sizes and the full lower triangle at 5,790,204 B, which can only be an opt-in download into the 209,715,200 B
IndexedDB-plus-cache allowance and is not recommended). The diagonal likelihood is the fall-back slice (verdict B) and is measured as the DIAG treatment in
every leg.

**Sample.** The rows with no Cepheid calibrator and z at least 0.01 (a stated design cut: below it the peculiar-velocity term, carried only on the diagonal,
dominates): 1,580 rows of the pack's 1,701, largest z 2.26137, smallest error 0.1148 mag, twenty surveys, the smallest with 6 rows (every survey has a coherent block).
**Observable:** the pack's `mu` (MU_SH0ES) with `mu_err`.
**Model:** the distance modulus of Prompt 255's FLRW (Om, Ode, w; radiation neglected, H0 = 70 as a reference that the offset absorbs: leg A4).
**Nuisance:** one additive offset with a flat prior, marginalised analytically: chi2 = r^T C^-1 r - (1^T C^-1 r)^2 / (1^T C^-1 1), equal to the profile; the marginal
likelihood differs by the theta-independent factor sqrt(2 pi / 1^T C^-1 1) (A11, 5e-13). **Flat universe:** Ode = 1 - Om, in the one-parameter profile L1 and in the plane P2.
**Planes:** L1 (flat Lambda-CDM, Om in 0 to 1, 201 points), P1 (Om 0 to 1 by 0.02, Ode 0 to 1.5 by 0.03, w = -1; 74 of 2,601 nodes refused: 73 by the Prompt 255 kernel, a bounce or beyond the antipode, and one marginal node
on the bounce boundary, AM1), P2 (flat constant w, Om 0 to 1, w -3 to 0 by 0.06; none refused).
**Delta levels** (computed, not typed): for 2 free parameters -2 ln(1 - p) at p = erf(k / sqrt 2), 2.2957, 6.1801 and 11.8292 (68.27, 95.45 and 99.73 percent);
1 parameter k^2. **Solver:** Prompt 152's `cholesky`, unchanged, once per sample, then one forward substitution per node (O(N^2)). **Conditioning:**
cond(C) = 42.1 (the DIAG matrix 41.1), from eigenvalues 0.0129 to 0.5414; a bound of 1e6 was committed. **Tolerances:** chi-square 1e-6 absolute, edge
fractions 1e-4, slice crossings 1e-6, distances 1e-8 mag.

## 3. Results

58 rows: **50 pass, 0 fail, 5 reported, 3 not run** (a leg with both treatments is two rows, a diag row and a cov row). Rows with a set in group diag
(25) and in group cov (25) all pass.

| Tier | Legs | Bound | Measured (worst of the rows) | Status |
| --- | --- | --- | --- | --- |
| data | M0.data: pack decode equals the raw file; raw sha256 equals the pack record's | the pack's rounding steps | 7e-15 mag, 4e-16 in z; sha256 1cb0fc37... both; N 1,580 | pass |
| (a) analytic | A1 Einstein-de Sitter closed form, 40 z | 1e-10 | 2.6e-14 | pass |
| | A2 prototype against the Prompt 255 kernel, 6 parameter sets, every z | 1e-9 mag | 1.4e-14 | pass |
| | A3 marginalisation against a golden-section minimum, 10 theta, both treatments | 1e-9 | 4.5e-15 | pass |
| | A4 shift invariance (0.5 mag, H0 70 to 73) | 1e-10 | 3.4e-14 | pass |
| | A5 noise-free data: chi2 at the truth, at Om 0.35 | 1e-9; at least 1 | 6e-12; 2.71 (DIAG), 1.94 (cov) | pass |
| | A6 delta levels against closed forms and scipy | 1e-9 | 5.9e-15 | pass |
| | A7 Cholesky, `invertSpd` and Woodbury agree (n = 30) | 1e-10 | 5.9e-16 | pass |
| | A8 Cholesky against Woodbury at the sample's N | 1e-9 | 3.8e-15 | pass |
| | A9 C positive definite; L L^T reproduces C on 200 rows | 1e-12 | 1.4e-16 | pass |
| | A10 condition estimate against eigvalsh; at most 1e6 | 1 percent | 1.7e-9; 42.1 | pass |
| | A11 marginalisation constant | 1e-8 | 5.1e-13 | pass |
| | A12 152's `cholesky` factors the 1,580 x 1,580 matrix | 30 CPU s | 1.0 to 1.6 s | pass |
| (b) oracle | B1 distances against astropy, 6 sets, every z | 1e-8 mag | 5.0e-11 | pass |
| | B2 chi-square at 5,329 accepted nodes (L1, P1, P2), both treatments | 1e-6 | 1.0e-9 | pass |
| | B3 the kernel's accepted set equals the brute-force set | 0 disagreements | 0 (one marginal node excluded and counted) | pass |
| | B4 refined minima (L1, P1, P2) | 1e-6 | 5.5e-10 | pass |
| | B5 edge-crossing sets of 3 levels per plane, 2 for L1 | same edges, f to 1e-4 | same; 1.8e-10 | pass |
| | B6 exact slice crossings (4 slices, 2 levels) | 1e-6 | 7.7e-13 | pass |
| | B7 L1 best fit and the 1 and 2 sigma interval endpoints | 1e-6 | 5.8e-13 | pass |
| | B8 three pinned synthetic sets (300 rows each), B2 to B6 | as above | 9.3e-10 chi-square, 9.3e-7 edge fraction (DIAG, set c) | pass |
| (c) coverage | C1 L1, 200 draws, Om 0.30, 68.27 and 95.45 percent | 0.58 to 0.78; 0.90 to 0.99 | DIAG 0.615, 0.945; cov 0.685, 0.955 | pass |
| | C2 P1, 100 draws, (0.30, 0.70) | 0.55 to 0.81; 0.88 to 1.00 | DIAG 0.63, 0.93; cov 0.70, 0.93 | pass |
| | C3 P2, 100 draws, (0.30, -1.0) | same | DIAG 0.72, 0.95; cov 0.61, 0.91 | pass |
| | C4 the oracle's own numpy ensembles (L1, P1) | as C1, C2 | L1 0.755, 0.96 and 0.685, 0.935; P1 0.71, 0.96 and 0.69, 0.92 | pass |
| (d) refusals | D1 12 rows: L1 and P1 95.45 percent contours open ("not constrained") in both implementations | statuses equal | open in both, both treatments; the 300-row set agrees to 6e-13 | pass |
| | D2 closure statuses, three data sets, three levels | 0 disagreements | 0 | pass |
| | D3 goodness-of-fit flag: false alarms; detections at errors 1.5 times too small | at most 0.01; at least 0.99 | 0 and 1.00 (both treatments) | pass |
| | D4 a non-positive-definite covariance is refused with no number | exact | refused 'not-positive-definite'; tau 0.02 accepted | pass |
| | D5 non-finite, mismatched, too few, non-positive sigma | exact | all four refused with their codes | pass |
| (e) authentic | E1 the sample constrains L1 (95.45 percent interval closed) and P1 (68.27 percent contour closed) in both implementations | closed | closed; P1 closed at all three levels | pass |
| size | S1 the decided treatment adds 0 data bytes | 0 B | 0 B, 2 constants (tau and the rule) | pass |
| reported | E2, E4, E5, S2, P1.time | | section 4 | REPORTED |
| not run | B10.cited, E3.published, X3.fullCovariance | | section 7 | NOT RUN |

## 4. What the real sample says (REPORTED, not a verdict)

| | DIAG | decided covariance |
| --- | --- | --- |
| L1 best fit Om | 0.3491 | 0.3470 |
| 68.27 percent interval | 0.3304 to 0.3684 | 0.3238 to 0.3710 |
| 95.45 percent interval | 0.3120 to 0.3880 | 0.3014 to 0.3957 |
| interval width, cov over DIAG | | 1.24 |
| chi-square at the best fit, per degree of freedom (1,578) | 681.3, 0.432 | 684.2, 0.434 |
| P1 best fit (Om, Ode) | (0.304, 0.588) | (0.303, 0.584) |
| P2 best fit (Om, w) | (0.298, -0.881) | (0.295, -0.872) |
| P2 closed at 68.27, 95.45, 99.73 percent | yes, yes, no | yes, no, no |

* **The diagonal is not the scatter.** chi-square per degree of freedom is 0.43 in both treatments: the release's diagonal carries systematic and
  peculiar-velocity variance that is not scatter, so a likelihood that treats it as independent noise is conservative, and its contour is wider than the scatter
  alone supports. The coherent term of the decided covariance widens the Om interval by 24 percent, because a survey's rows then share their offset.
* **Duplicates.** The 1,580 light curves are 1,466 distinct supernovae (the pack has no identifier; the raw file's CID column was used for this report only).
  Keeping each supernova once moves the best fit by +0.0034 (DIAG) and +0.0039 (cov), 0.18 and 0.17 of a half width: small against the interval, and
  both treatments treat repeated light curves as independent.
* **The pack's recorded published value** (Om 0.334, "Brout et al. 2022, ApJ 938, 110", as an earlier session typed it into the pack's validation block; this gate did not
  verify it and read it from the file) lies 0.80 (DIAG) and 0.55 (cov) half widths below the best fit. This is a report, not leg E3.
* **Cost.** 152's `cholesky` factors the 1,580 x 1,580 matrix in 1.0 to 1.6 CPU seconds; a node costs 4 ms (DIAG) or 6 ms (cov) with the single factor, about 45 and 36 CPU
  seconds for the three planes. These are Mac figures under Node 22, not browser claims; a low-end device is not measured.

## 5. What verdict A does and does not say

* It says the likelihood of this covariance is computed correctly (closed forms, the Prompt 255 kernel, astropy, an independently written scipy implementation, 1e-9),
  its contours are reproduced edge for edge by that implementation, the intervals cover at the stated rates when the data are drawn from the same covariance, the
  method refuses what it should (a small subset, a non-positive-definite matrix, bad input) and the solver is well-conditioned (42) and factors the matrix in about a second in Node (a Worker is not measured).
* It does **not** say the decided covariance resembles the release's. tau is a stated size. Coverage is self-consistent by construction (the ensembles are drawn
  from the covariance being analysed), and the goodness-of-fit legs are easy to pass (0 false alarms, all detections). The oracle and the prototype were written by the
  same hand from the same text; the one outside implementation of the distances is astropy's.
* The pinned set SYN300a happens to be a four-sigma draw: its flat best fit (Om about 0.10) is far from its truth (0.30), which does not matter to any
  agreement leg (the truth is not an input to one) and is the reason no leg uses a single draw for coverage.
* The contours are contours of the decided covariance and carry no claim about the published ones. Until E3.published and B10.cited have run, no lesson may cite
  them, and the consumers rule holds.

## 6. What Part B would be, and why it is not begun

After A or B, branch `feat/supernova-cosmology`: the kernel (the Prompt 255 distance modulus with the offset; the marginalised chi-square; the profile over Om and Ode;
the contours; w as the upper axis), its validation group, the Hubble-diagram panel's likelihood view, "The accelerating universe" and the model-page section.
Not begun: the execution contract forbids starting the next part, and the consumers rule holds every panel, lesson, viewer and contour for a kernel whose published-contour
leg has not run. Of the kernel alone: it would add code to the lazy tier (NEVER_PRECACHED) against 110 B of deferred room (a raise of exactly the measured overrun under the standing
approval, with a register row), and no data; its size is not measured here. The existing line fit and `flat-lcdm-sn` model are untouched by this gate.

## 7. Files requested from Carl (nothing fetched, nothing typed)

1. **B10.cited.** A cosmology-fitting package's contour on this sample and treatment (no such package is installed): Carl names one and installs it for a session, or
   runs it and supplies the output and settings.
2. **E3.published.** The published flat-case matter-density value and 1 sigma of the Pantheon+ supernova-only analysis, read from the paper the pack cites, with the
   table or sentence and a retrieval date, as `tests/fixtures/supernova-likelihood/authentic/published-flat.json`. The leg passes when the cov treatment's best fit lies
   within one published sigma.
3. **X3.fullCovariance (T1 and T2).** The release's full statistical-plus-systematic covariance, from the release folder that holds `Pantheon+SH0ES.dat` (the pack's URL names
   the path and commit), the exact file named by Carl from the release page, with sha256, size and the terms as read from a saved copy; held outside every repository. With it: T1's
   chi-square against the full matrix on a subset, T2's retained variance, and how far the decided covariance is from the release's.
4. **X4.** Rights for any number derived from the full covariance and shown (7.5.4: per source and per form). The pack's basis, "no licence stated, credited" (D-RIGHTS-04), is not inherited by another file.

## 8. Questions for Carl

1. **The decision.** Is T3 in the split form (the pack's diagonal kept, a named survey-coherent tau of 0.02 mag) the covariance you want a browser likelihood to use,
   given that it cannot be validated against the release without request 3? Recommendation: yes as a labelled design, no consumer until E3 and request 3 run.
2. **tau.** It is a stated size. If you prefer another (or one per survey from the release), it enters as NEW legs with thresholds committed first; the stream
   passes at 0.02 and the cost of a change is one oracle run.
3. **The fetches** (1 to 3 above), in the order that unblocks most: the published value (cheap), the full covariance (decides T1, T2 and the size of tau), a fitting package (the cited contour).
4. **Part B.** Wait for E3 and request 3, then run Part B once with every tier, or build the kernel now with no consumer? Recommendation: wait.
5. **The reported 0.43 chi-square per degree of freedom.** Should a lesson say "the released errors are not independent scatter" (a reading step, no new kernel)?

## 9. Reproduce

`node tools/sn-likelihood-validate.mjs <outdir>` on the spike branch (the oracle: `python3 tools/sn-likelihood-oracle/oracle.py <out.json>` with an import-only
PyYAML stand-in on `PYTHONPATH` outside the tree, as in Prompt 255; astropy's import needs it and nothing was installed). The validator reads every bound from `thresholds.json`.

## 10. Follow-up: the published value and the release's covariance (Prompt 256 follow-up)

Sections 1 to 9 above are the merged gate and are not edited. This section is the follow-up Carl's session made possible by fetching the files section 7 listed
(requests X2, X3 and X4; X1, a fitting package, was not fetched and downloading or running code is not authorised, so **X1 stays NOT RUN**). A documentation PR into v3 (labels
invisible + documentation); the oracle is on `spike/supernova-likelihood-followup` (from `spike/supernova-likelihood-gate`), never merged. **Verdict by the committed function: FC**
(I2, I4a and I4b fail, so the committed base for the reference is not met); the reading under AM1: FC'; the reading under AM2 (proposed, not ratified): FB''. The merged
gate's verdict A keeps its narrow meaning and is not touched. The decided split form **does not pass** its adequacy test against the release's covariance. Part B is not begun
and is declined in this session; the consumers rule holds every panel, lesson, viewer and contour.

The numbers are in `tests/fixtures/supernova-likelihood/`: `followup-thresholds.json` (the contract and its two amendments), `followup-run1.json` and `followup-run2.json` (the two
runs that stopped, kept), `followup-oracle-results.json` (derived numbers of the stream), `followup-results.json`, `followup-failed-legs.json` and `authentic/published-flat.json`
(the printed value, as Carl's session read it). The covariance file is **not** in the repository and no fixture could hold it: derived numbers only, and its sha256. The
oracle (`tools/sn-likelihood-oracle/followup.py`, with `followup_judge.py`) runs about 3 minutes on a Mac under Python 3.9.6 with numpy 1.26.4, scipy 1.13.1 and astropy 6.0.1.

### 10.1 What was committed first, and the order

| Commit | What | Before |
| --- | --- | --- |
| `19f5f7e6` | `followup-thresholds.json`: 55 rows (integrity, the published comparison, adequacy of the split form and of the low-rank forms, the subset forms), the verdict function, the stated difference of samples | the covariance file was opened, parsed or summed |
| spike `f639a221`, `0e79cd97` | the oracle and judge; a dry run on a synthetic covariance written from the raw errors (outside the repository, deleted afterwards) | the real file was opened |
| run 1 | the file's integrity only: stopped at I4a by the committed rule | `6bb95a10` kept it (`followup-run1.json`) and recorded AM1 |
| `6bb95a10` | AM1: two new mapping legs (I4c, I4d) by permutation test, a report of the diagonal (R9), a second reading of the verdict | any other leg was computed |
| run 2 | the mapping tests: I4c passes, I4d fails its bound; stopped by AM1's rule | `2f78ddd0`, `7a02d99c` kept it (`followup-run2.json`) and recorded AM2 |
| `2f78ddd0`, `7a02d99c` | AM2, PROPOSED: I4c alone gates the later legs; the recommendation and its reasons, written before they ran | any downstream leg (E, Q, U, V, W, I5, I6, R1 to R8) was computed |
| spike `909673f2`, run 3 | the stream (183 s), then the judge on its numbers (spike `7e724b78`) | |

What had been seen before the contract was committed, and only that: the merged gate (including the REPORTED real-sample numbers of its section 4, so **legs E3b, E3e and I6 restate
numbers already seen and are not blind**), the data directory's README, retrieval record and `published-flat.json` (the printed flat-case value 0.334 with sigma 0.018, also stated in
the brief). Nothing of the covariance's contents, and nothing of the paper beyond that file; the transcription was checked against the paper's text (three places: the abstract, the
conclusions and the table row) after the contract was committed. The adequacy rules (0.25 of the diagonal interval, a width band of 0.80 to 1.25, a Jaccard index of 0.70) were
written without any number derived from the covariance.

### 10.2 The data and the terms as read

The file is `Pantheon+SH0ES_STAT+SYS.cov` of the release's `4_DISTANCES_AND_COVAR` folder at the commit the pack pins: 33,284,960 bytes, sha256 `abf806d9...a0fdc` (full value in
the contract), 1,701 x 1,701, first line 1701, then the matrix one value per line. Terms as the fetching session read them (the repository has no licence file; the release page asks that
papers be cited individually and says details on data release usage will be added upon journal acceptance): cite Brout et al. 2022 (arXiv:2202.04077) and Scolnic et al. 2022 wherever
a number derived from it appears; do not redistribute the file; derived numbers only. The fixtures hold nothing of the matrix beyond its summary numbers, region masks on the gate's
own parameter grids, and the leading eigenvalues; every number here derived from it is Brout et al. 2022 and Scolnic et al. 2022's release, analysed by this gate. **X4**: nothing
stronger than these terms exists to cite; the derived numbers are used under them and nothing is redistributed.

### 10.3 Results

58 rows: **31 pass, 17 fail, 9 reported, 1 not run** (a run under the committed rule would have stopped at I4a, and again at I4d; the later legs ran under AM2 and are labelled so in
`results.mappingGate`).

| Group | Legs | Measured | Status |
| --- | --- | --- | --- |
| integrity | I1 the file is the recorded one (sha256, size, shape) | exact | pass |
| | I2 symmetric as printed (bound 1e-9) | 3.0e-8; the committed remedy (C + C^T)/2 is used | **fail** |
| | I3 positive definite, Cholesky | smallest eigenvalue 0.00080 (1,701 rows), 0.0052 (1,580), condition 460 | pass |
| | I4a rank correlation of sqrt(C_ii) with the pack's errors, bound 0.99 | 0.932 | **fail** |
| | I4b the pack's errors are the file's diagonal (bound 1e-5 mag) | largest difference 1.34 mag; sqrt(C_ii) / error: median 0.713, 0.118 to 1.008 | **fail** |
| | I4c same-supernova pairs correlate (AM1) | 191 pairs, mean correlation 0.421 against 0.0003 (sd 0.0031, largest 0.0130) over 2,000 row permutations, z = 134.7 | pass |
| | I4d survey blocks hold more off-diagonal energy than chance (AM1), bound z of 10 | share 0.138 against 0.106 (sd 0.0058), above all 2,000, z = 5.5 | **fail** |
| | I5 Cholesky and eigendecomposition agree at 30 nodes | 1.9e-15 relative; residual 2e-14 | pass |
| | I6 this oracle reproduces the merged gate's pinned DIAG and split numbers | 0 | pass |
| published | E3a FULL's flat best fit within one printed sigma | 0.3316 against 0.334, minus 0.13 sigma | pass |
| | E3b the decided split covariance within one printed sigma (the old committed rule; not blind) | 0.3470, plus 0.72 sigma | pass |
| | E3d FULL's 68.27 percent half-width within [2/3, 3/2] of the printed sigma | 0.01821, ratio 1.01 | pass |
| | E3e the same for the split form (not blind) | 0.02357, ratio 1.31 | pass |
| adequacy of the split form against FULL | Q1 best fit within 0.25 of the diagonal interval | 0.0154, 0.81 of it | **fail** |
| | Q2 widths in [0.80, 1.25] | 1.294 and 1.294 | **fail** |
| | Q3 plane best fits within 0.25 of the diagonal region's half-extents | P1 Ode 0.0367 against 0.135 x 0.25; P2 w 0.0362 against 0.24 x 0.25 | **fail** |
| | Q4 region overlap at least 0.70 | Jaccard 0.50, 0.53 (P1), 0.42, 0.52 (P2) | **fail** |
| | Q5 at least as close to FULL as DIAG | width log-ratio 0.258 against DIAG's 0.042; P1 overlap 0.50 against 0.47 | **fail** |
| T2, rank k | Q1 to Q5 for k = 10, 30, 100; V0 construction | k = 10: Q1, Q3 pass, Q2, Q4, Q5 fail; k = 30: Q2, Q3 pass, Q1, Q4, Q5 fail; k = 100: Q1 to Q4 pass, Q5 fails (0.067 against 0.042); V0 pass for all | no rank passes whole |
| T1, n rows | U1 to U3 the full-sample best fit lies in the subset's own 95.45 percent regions; W1 width at most twice FULL's | n = 100: U pass, W1 fails (2.99); n = 300: all pass (W1 1.954); n = 800: all pass (1.321) | n = 300 and 800 pass whole |
| not run | X1 a fitting package | not fetched, no code run | NOT RUN |

Failing rows (17), all left failing: I2, I4a, I4b, I4d, Q1 to Q5 of SPLIT, Q2, Q4, Q5 of T2 k = 10, Q1, Q4, Q5 of T2 k = 30, Q5 of T2 k = 100, W1 of T1 n = 100.

### 10.4 What the release's covariance says (REPORTED and measured)

| Flat Lambda-CDM, 1,580 rows | best Om | 68.27 percent half-width | P1 best fit (Om, Ode) | P2 best fit (Om, w) |
| --- | --- | --- | --- | --- |
| the paper's printed value (all 1,701 rows, SH0ES calibrators in the sample) | 0.334 | 0.018 | | |
| FULL, the release's covariance | 0.3316 | 0.01821 | (0.300, 0.620) | (0.295, -0.908) |
| DIAG, the pack's errors | 0.3491 | 0.01899 | (0.304, 0.588) | (0.298, -0.881) |
| SPLIT, the decided covariance (tau 0.02) | 0.3470 | 0.02357 | (0.303, 0.584) | (0.295, -0.872) |
| T2 k = 10, 30, 100 | 0.3332, 0.3479, 0.3280 | 0.01348, 0.01599, 0.01703 | | |
| T1 n = 100, 300, 800 (exact blocks of FULL) | 0.2789, 0.3356, 0.3456 | 0.0545, 0.0356, 0.0240 | | |

* **The reference reproduces the published value.** FULL on the 1,580 Hubble-flow rows gives Om 0.3316, 0.13 of the printed sigma from 0.334, and a half-width of 0.01821 against the printed 0.018.
  This is the first comparison of this gate's pipeline with a published number, and it holds for the release's covariance, not for the decided one. The stated difference of samples
  and analyses stands: the paper uses all 1,701 light curves with the calibrators and its own sampler, this gate 1,580 rows and a profile over a grid. **REPORTED R1**, the nearest the
  oracle comes to the paper's sample (all 1,701 rows, one free offset, which is not the paper's treatment of the calibrators): FULL 0.3612 (1.5 printed sigma from 0.334), DIAG 0.3508, half-widths 0.0187: that
  comparison is not a leg and its treatment of the calibrators is not the paper's, so it says only that the stated difference of samples is not negligible.
* **The pack's errors are not the file's diagonal.** sqrt(C_ii) is below the pack's `mu_err` on all but one row, with median ratio 0.713 (a variance ratio of 0.51, close to one half), the same
  to within 0.71 to 0.72 on every redshift band above z = 0.01 and on every survey with a dozen rows or more, and lower for the 77 calibrators (median 0.449) and below z = 0.01 (0.564). One row
  has C_ii above its error squared, by 6.4e-4 mag^2. The pack's column description already says the error is "for plotting only, the release's own warning"; the premise of section 2, that
  `mu_err` is this covariance's diagonal, so that keeping it adds no systematic twice, is **false by these amounts**, and the pack's description of the column should say so (question 4). This PR
  does not explain the near-constant ratio.
* **The covariance moves the best fit; it does not widen it.** FULL's best fit is 0.0175 below the diagonal treatment's and its half-width is 4 percent smaller; the split form widens by 24 percent
  and moves the best fit by 0.002. R3: at tau tending to 0 the split form's half-width is 0.0189, already above FULL's 0.0182, and it rises to 0.0277 at the positive-definite limit: **no tau
  makes this form reproduce FULL's width**.
* **Structure (R2, R8).** The split form carries 0.7 percent of the off-diagonal squared energy of FULL (0.047 of 6.54); 15 percent of FULL's off-diagonal energy lies between rows of one survey
  (the mean within-survey entry 5.7e-4 mag^2 is of the order of tau^2 = 4e-4), the rest does not: half of the entries are negative, the leading eigenvalue 2.39 carries 5 percent of the trace, rank 10 11
  percent, rank 100 27 percent. Eigenvalues at ranks 1, 2, 5, 10, 30, 100, 300, 1,580: 2.39, 0.917, 0.256, 0.165, 0.101, 0.0617, 0.0381, 0.0052.
* **Does the block matter at the subset size (R7)?** On the n = 300 rows: the exact block gives 0.3356 (half-width 0.0356), the diagonal 0.3524 (0.0450), the split form 0.3516 (0.0480).
* **Sizes (R5)**, float32 and zlib level 9: T1 n = 100, 300, 800, 1,580: 20,200 (18,942), 180,600 (167,614), 1,281,600 (1,189,344), 4,995,960 (4,627,746) bytes; T2 k = 10, 30, 100: 69,520 (65,253),
  195,920 (184,008), 638,320 (599,295) bytes. The packs' raw and gzip ceilings are at their limits (0 B of room) and the deferred room is 110 B (section 6): every one of these is a
  data-budget decision of its own.
* **A stated expectation that did not hold.** The contract said that by the sqrt(N / n) rule only n = 800 could pass W1 (2.0, 2.3 and 4.0 expected). Measured widths against FULL's are 1.32, 1.95 and 2.99: the exact
  block does better than information per row alone predicts, and n = 300 passes by 2.3 percent of the bound.

### 10.5 The verdicts, by the function

* **The committed function: FC.** FA needs I1 to I6 (I2, I4a and I4b included) and the Q rows of SPLIT to pass; FB needs I1 to I4a, I5, I6, E3a, E3d and a passing alternative. I2 and I4a fail, so the base is
  not met whatever the later legs show. The split form's own reading by the committed words: **INADEQUATE** (Q1 fails: its best fit is 0.81 of the diagonal interval from FULL's, against 0.92 for DIAG itself).
* **The reading under AM1: FC'** (the same function with I4a replaced by I4c and I4d, I2 not required): I4d fails its bound.
* **The reading under AM2 (proposed, not ratified): FB''**: I1, I3, I4c, I5, I6, E3a and E3d pass, the split form does not, and two alternatives pass whole, T1 n = 300 (180,600 bytes) and n = 800
  (1,281,600); the recommended one is the cheaper, **T1 n = 300**. If Carl does not ratify AM2 the later rows are unratified evidence and the verdict is FC.

### 10.6 What the verdict permits (and does not)

* **Part B is not begun.** What it may now do, if Carl goes ahead: a kernel and its contract, in which the likelihood takes a covariance as an input (the diagonal as the fall-back), validated
  as the merged gate's prototype was. **Nothing may call SPLIT or DIAG a stand-in for the release's covariance**: the first moves the best fit by 0.81 of the diagonal interval and widens it by 29 percent against FULL; the second
  by 0.92 of it. A compact release-grade form (T1 n = 300 or T2 k = 100) is a data decision (sizes above; the T2 k = 100 form fails only Q5, narrowly, and the T1 n = 300 form passes W1 by 2.3 percent) that waits for AM2 and for Carl.
* **The consumers rule holds.** No lesson, panel, viewer or contour: the old productClause needs X1 (a fitting package's contour) to have run, and it has not. The one thing this follow-up changes about it
  is that the published-value leg has now run and passed (E3a for FULL, E3b for the decided covariance).
* The decided split form (D-R10-256-01) stays on record as the labelled design it was; it is not revoked, and it is not supported as a stand-in. No reading step "the released errors are not independent scatter"
  is authorized by this follow-up either: the finding is more specific (the pack's errors exceed the file's diagonal by a near-constant factor).

### 10.7 Requests of section 7, and what is still owed

| Request | State |
| --- | --- |
| X1 a fitting package's contour (B10.cited) | NOT RUN, not fetched; code is not downloaded or run without Carl's separate permission |
| X2 the published flat-case value and sigma | read, transcribed, verified against the paper's text; legs E3a, E3b, E3d, E3e |
| X3 the release's full covariance | fetched (sha256, size, terms recorded); T1 and T2 run as legs U, V, W, Q |
| X4 rights for derived numbers | the terms as read are all the release states; derived numbers only, with the citation; the file is not redistributed |

### 10.8 Questions for Carl

1. **AM2.** Take I4c alone (191 same-supernova pairs, z = 134.7, above all 2,000 permutations) as the proof of the row order, and keep I4d, I4a, I4b and I2 failing on record? The recommendation was written before the later legs ran. Yes ratifies FB'' and the rows; no leaves FC and discards them as unratified.
2. **The split form.** Keep D-R10-256-01 as a labelled design with no consumer, or mark it superseded by a release-grade form? Recommendation: keep, with this section beside it.
3. **A compact form.** Is a lazily loaded subset-with-block data file (T1 n = 300, 180,600 bytes float32, 167,614 zlib; or T2 k = 100, 638,320 bytes) acceptable as a data decision of its own (the packs have 0 B of room), or should the kernel take the full covariance as an opt-in download (about 4.6 MB zlib)? Recommendation: T1 n = 300 if AM2 is ratified, noting its 2.3 percent margin on W1.
4. **The pack's description of `mu_err`.** The column description says "the diagonal of the full covariance: for plotting only"; the release's covariance has a lower diagonal by a near-constant factor. Correct the pack record in a separate pack-record prompt (nothing is changed here)? Recommendation: yes.
5. **X1.** Name a fitting package and permit running it (the last leg of the old productClause), or leave the consumers rule held on this kernel?
6. **Part B.** Wait for 1 to 3 and then run the kernel-and-contract part once, or not at all? Recommendation: wait.

### 10.9 Reproduce

`STUBS=<dir with the import-only PyYAML stand-in> python3 -E tools/sn-likelihood-oracle/followup.py followup-thresholds.json <covariance file> published-flat.json <outdir>`, then
`python3 -E tools/sn-likelihood-oracle/followup_judge.py followup-thresholds.json <outdir>/followup-oracle-results.json published-flat.json <outdir> <spike commit>` on the spike branch, with the covariance
file from the release at the pack's commit (sha256 in the contract). The judge's rules are re-implemented in JavaScript by `tests/supernovaLikelihoodFollowup.test.js`, which recomputes every status and both
verdicts from the pinned oracle numbers.

<!-- Listed in DOCUMENTS.md. -->
