# The galactic kinematics gate

Roadmap III, Prompt 235, Part A. Four kinematic methods, each run on the sample it would run on in a lesson with
the selection that sample carries stated, each tested on a synthetic sample with a known truth that has the same
selection, each given a verdict by a function committed before any result existed. **All four verdicts are C: no
kinematics kernel, panel, lesson or closure file is built, and the steps that would have used them are reading
steps.** The record is decision-register rows D-R10-235-01 to D-R10-235-04 and D-R10-235-90.

The numbers are in `tests/fixtures/kinematics/` (`thresholds.json` the contract and its two amendments,
`results.json` the one gate run, `failed-legs.json` the failed legs, each labelled, `ensembles.json` the truth
manifests, `oracle-results.json` the pinned output of the independent oracle). The kernel
(`js/kernels/galactic/kinematics.js`, `kinematicsSynthetic.js`), the validator (`tools/kinematics-validate.mjs`),
the oracle (`tools/kinematics-oracle/oracle.py`) and its pinned inputs are on `spike/kinematics-gate`, never merged
(Prompt 235's rule 7.5.4: the prototype stays on a spike branch; this PR is documentation only). The gate stream
ran on Node 22.23.4 in about ten seconds; the oracle on Python 3.9.22 with numpy 1.26.4, scipy 1.13.1 and astropy
6.0.1.

## What was committed first

`thresholds.json` (`1eb1c923` here, `271452ca` on the spike) fixed, before any kernel, generator, validator or
oracle existed: the four methods and the sample each runs on; the selection each carries, as 154's selection
objects; the synthetic truth of every test (a disk with a straight rotation curve, R0 8 kpc, V0 220 km/s, slope
-2 km/s/kpc, so A 14.75 and B -12.75 km/s/kpc; a Sun with a peculiar motion; two populations with the stated lag
sigma_U^2 / 80; three metallicity-bin populations); the analysis contract of each method; 32 legs, each with a set
(S the synthetic recovery under the selection, R the real sample, none for a REPORTED leg) and its bound; and the
verdict function.

| Verdict | Condition (committed) |
| --- | --- |
| A | every S leg and every R leg passes: the method runs on the sample, shown with its interval and selection statement beside the literature as a discussion |
| B | every S leg passes and an R leg fails: the method on the synthetic sample only; the real sample shown without a fit |
| C | an S leg fails or is NOT RUN: a reading step |

What had been seen before committing, and only that: the packs' columns and manifests, the SEGUE pack's row counts
per [Fe/H] bin and the inner stars' median velocity and [Fe/H] (to set the exclusion and the bins), the
neighbourhood pack's counts, and, from earlier prompts' documents, the neighbourhood Oort fit (A 13.5 +/- 2.4, B
-13.7 +/- 1.7) and the drift fit (12.3 +/- 6.7). No dispersion by bin, no synthetic result and no output of the new
kernel was seen.

## The four methods

| Method | Sample and its selection | Synthetic test (same selection) | Criterion |
| --- | --- | --- | --- |
| **O** Oort constants, first-order local expansion | the neighbourhood pack, 1,570 Gaia DR3 stars with RUWE below 1.4, parallax over error above 10 and a radial velocity (cuts upstream of the pack), in two random strata (about 1 in 273 above 10 mas, 1 in 9,065 from 1 to 10 mas) | the real rows' sky positions, parallaxes, errors and colours, with velocities from the synthetic disk, observed with those errors and the pack's 0.02 mas rounding; 200 realizations | recovery within half the median error, 68 percent coverage 0.60 to 0.76 and 95 percent at least 0.90, "not constrained" when the gradient is removed; a ladder of distance limits (1, 0.5, 0.25 kpc) fixed in advance |
| **D** dispersions by [Fe/H] bin | the SEGUE pack near NGC 2420, 517 spectra, the cluster excluded (inside 10 arcmin, then within 5 km/s and 0.4 dex of the inner medians: 286 survive) with the hole that leaves handled by the likelihood; line of sight only | the 286 survivors as the design, each star's velocity drawn from its bin's population conditional on its window | the same bands, per bin of at least 15 stars; refusal of a small bin and of a bin whose true sigma is 0 |
| **T** Toomre diagram and disk-halo separation | the neighbourhood pack (three-dimensional velocities, no metallicity) | a three-population mixture under the pack's selection | halo recall at least 0.80 and purity at least 0.50 with **thresholds from a cited source** |
| **S** asymmetric drift as a stated relation | the neighbourhood pack in six BP-RP groups of equal count | the same synthetic disk with two populations of known dispersion and lag | recovery and coverage of V_sun and k; "no lever" with one population; both candidate LSR values reported, neither chosen (D-GAIA-03) |

## Amendments (both before the gate stream, neither moving a bound)

**AM1.** The first run of the analytic leg `O.A1.exact` (a noise-free, zero-dispersion disk at 0.02 kpc) returned A
12.52 and B -10.79 against 14.75 and -12.75. The committed model, `4.74047 mu_l* = A cos 2l + B + ...`, is the
in-plane form: the velocity along l of a rotating disk is `d cos b (A cos 2l + B)`, and the neighbourhood pack
covers the whole sky, so the planar fit is low by about the sky's mean cos b (about 0.86). `fitOortConstants` in
`js/kernels/galactic/motion.js` has the same omission (leg `O.A2` shows the planar form equals it to 1.5e-16). The
fix is a second form, with the factor; every O leg is measured for both. **The verdict that binds is the committed
(planar) form's**, which fails `O.A1.exact`; the latitude-corrected form's verdict is a proposal for Carl to
ratify. The existing Oort values of The Rotating Disk (A 13.5, B -13.7) are from the planar form and are about 15
percent low in magnitude; the lesson is not changed here (the lesson goldens stay identical; Part B owns the
lessons).

**AM2.** The drift fit weighs each group by the error of its mean V alone and takes the group's sigma_U^2 as exact.
A group of 260 stars has a sample variance with a relative error of about 9 percent, which at a slope of 1/80 is
about 1.5 km/s of scatter in V per group, comparable with the stated error (the kernel's own text said so; the
design run showed one-sigma coverage of 0.56). The second form is the effective-variance line (the slope's share
of each group's sigma_U^2 error in its weight, from the group's fourth moment). As for AM1, the committed form's
verdict binds and the second form's is a proposal.

A single design realization (a seed that is not a gate seed) and one run of the validator at the design seed
preceded the amendments; no gate seed (235001 to 235004) was run until both were recorded. The dispersion
estimator (a sandwich covariance), the ladder, the constrained rules and every band are as committed.

## Results

66 rows: 37 pass, 22 fail, 4 REPORTED, 3 NOT RUN. The 22 failures are in `failed-legs.json` and stay failing.

**O, Oort constants: C.** Committed (planar) form: `O.A1.exact` fails (A 12.64, B -10.46 against 14.75 and -12.75),
and at O1 (all stars, 1,566 of 1,570 in the ensembles) A is recovered 3.0 km/s/kpc low (1.43 median errors, bound
0.5) with 68 percent coverage of 0.335; O2 and O3 are constrained in 2 and 0 percent of realizations (their
intervals are 6 to 20 km/s/kpc). Corrected (AM1) form: `O.A1.exact` passes (A 14.743, B -12.757), the oracle agrees
to 7e-7 (planar) and **1.05e-6 (corrected: the bound is 1e-6, so `O.B1.oracle.am1` fails, a difference of 1e-7 in
relative terms that is astropy's frame transformation against the Hipparcos matrix)**, but at O1 A is recovered
1.80 km/s/kpc low (0.77 median errors, bound 0.5; coverage 0.55 and 0.91) and B is within bounds; O2 and O3 fail as
before. The real sample (every R leg passes at O1): planar A 13.52 +/- 2.35, B -13.72 +/- 1.65; corrected A 14.47
+/- 2.59, B -15.24 +/- 1.81; two random halves agree within 1.9 and 0.5 sigma. Beside the values GALACTIC_DYNAMICS.md
records from Bovy (2017), 15.3 and -11.9, as a discussion and no more: A is 0.3 and B 1.8 of the corrected fit's
errors from them.

*Cause (a diagnostic after the result, not a leg):* noise-free and cold on the pack's own distances the corrected
fit returns A 14.78 and B -12.79, so the first-order truncation is not the cause at 1 kpc. Over 100 realizations at
a design seed the ensemble mean is A 15.09 and B -12.43 when the synthetic stars have no lag and A 13.06 and B
-12.83 with the asymmetric drift of the two populations (mean lag about 15 km/s): the lag of the older stars shifts
A by about -2 km/s/kpc, 0.8 of its error. The constants a population with asymmetric drift shows are those of its
own mean streaming field, not of the circular orbits, which is the review's point: this sample cannot recover the
constants it is asked for within its own interval.

**D, dispersions by [Fe/H] bin: C.** The closed forms, the independent oracle (sigma to 2e-8, its error to 2e-6)
and the recovery pass (bias 0.24, 0.14 and 0.16 median errors in the bins of 24, 105 and 157 stars); two legs fail,
both through the 24-star bin: `D.S2.coverage` (that bin's 68 percent coverage is 0.61 and its 95 percent 0.855 against
0.90; the other two bins 0.675 and 0.69, 0.94 and 0.93) and `D.D1.refusals` (a true sigma of 0 is called "not constrained" in
0.88, 0.97 and 0.95 of realizations against 0.90). The small-sample sandwich interval is the likely cause; the
committed bin size (15) admitted the bin. The real sample, reported and not a fit that ships: line-of-sight sigma
98.2 +/- 15.2, 42.3 +/- 4.0 and 33.3 +/- 1.6 km/s (the window correction moves the middle bin from 42.6 to 42.3);
the 70/30 mixture leg reports a Gaussian estimate of 110.7 against a pooled truth of 118.0, which is what a bin of
a real sample is.

**T, Toomre diagram and disk-halo separation: C, NOT RUN** (superseded for leg T by the addendum at the end of this file, which gives the run; the verdict is still C). The thresholds a cited separation needs are not in the
repository and no value is typed from memory: `tests/fixtures/kinematics/disk-halo-source.json` was not supplied,
so legs T1 to T3 are NOT RUN and the committed function gives C. (Under C no Toomre kernel is built.)

**S, asymmetric drift: C.** The closed forms, the oracle (under 2e-7), the recovery (0.07 median errors), the no-lever
refusal (0.995) and the two-option LSR report pass. Committed form: `S.S2.coverage` fails (V_sun one-sigma coverage
0.56; k 0.61 and 0.91) and `S.R1.useful` fails (real V_sun -4.9 +/- 5.3 km/s against a half-width bound of 4.2; the
slope is constrained at 5.2 sigma, k 59). Effective-variance form (AM2): coverage swings to 0.73 and 0.965 for V_sun
and 0.81 and 0.98 for k (the k band is 0.60 to 0.76, so it now over-covers and fails), and the real slope is
constrained at only 2.4 sigma with V_sun -3.8 +/- 11.0. The two candidate values for the Sun's V against the LSR
are reported and neither is chosen: 2.64 km/s from this sample's Stromberg correction on all 1,570 stars (D-GAIA-03's
3.77 is from the 489 stars within 100 pc) and 12.24 km/s.

## What this means for Part B

Nothing of Part B runs. "The Rotating Disk" gains no Oort-method depth, "Disk and halo" is not built as a method
lesson, there is no kinematics panel and no model-page section; the Oort steps stay as they are until Carl rules on
AM1 and the shipped values are corrected (a visible change to a scientific number, so a small separate PR).
Reading steps may say what the sample cannot do and why: the Oort constants of a population with asymmetric drift,
the line-of-sight-only dispersion of one sight line, the cluster's hole, and that a Toomre separation needs
thresholds somebody published. No closure file, ceiling or budget changes, so there is no size figure to approve.

## What to fetch

(Done on 2026-11-04: see the addendum at the end.)

For the Toomre diagram and disk-halo separation (leg T) one file, supplied by Carl, `tests/fixtures/kinematics/disk-halo-source.json`:
for each class (thin disk, thick disk, halo) the published criterion in total space velocity or Toomre-diagram
coordinates, with the paper, its identifier, the table or equation and the retrieval date, transcribed from the
paper and not from memory. The two references usually cited for kinematic classification are Venn et al. (2004,
AJ 128, 1177) and Bensby, Feltzing and Oey (2014, A&A 562, A71); this session has not read either, and their
identifiers are named here only so the fetcher can check them. With that file the legs run against the bounds
already committed; no bound is touched.

## Questions for Carl

1. **AM1.** Ratify the latitude-corrected Oort estimator? It does not change the Oort verdict by itself: the
   corrected form also fails (A's recovery and coverage at 1 kpc, from the asymmetric drift, and the oracle
   agreement by 5 percent over its bound).
2. **AM2.** Ratify the effective-variance drift fit? It fails too (over-coverage of k, a real slope at 2.4 sigma).
3. **The 24-star bin.** Both D failures are in the bin of 24 stars. A re-gate with a larger minimum bin (30, say)
   would judge the other two bins; changing it after the result is Carl's, not this gate's.
4. **The oracle bound.** `O.B1.oracle.am1` crossed 1e-6 by 5 percent (1.05e-6, the frame matrices); only Carl resets it.
5. **The thresholds source** (above), and whether to correct the shipped Oort values (A 13.5, B -13.7) and the
   lesson text now that the planar form is known to be low.
6. **The next prompts.** 236's run condition (after 235 and 154) is met by this documentation-only landing.

## Reproduction

On `spike/kinematics-gate`: `node tools/kinematics-validate.mjs` (Node 22), `--write-oracle-inputs` then
`/usr/local/bin/python3.9 tools/kinematics-oracle/oracle.py` for the oracle (the first `python3` on this machine
lacks PyYAML, which astropy.coordinates imports), `KIN_DESIGN=1` for the design stream, which writes nothing.
The run is reproducible: two runs give byte-identical `results.json`.

## References

Binney and Tremaine (2008), Galactic Dynamics, section 4.8.2 (the stated lag relation, as already used in
`js/kernels/galactic/motion.js`); Bovy (2017) as GALACTIC_DYNAMICS.md records it; Schonrich, Binney and Dehnen (2010)
as D-GAIA-03 records it; Gaia DR3 (CC BY-NC 3.0 IGO, D-GAIA-01) and SDSS DR18 SEGUE (public domain) through the
packs already in the tree. Nothing was fetched for this prompt.

## Addendum, 2026-11-04: the T legs run

**What changed.** The thresholds source the gate lacked is now in the tree: `tests/fixtures/kinematics/disk-halo-source.json`,
transcribed by Carl from two papers (Venn et al. 2004, Table 3; Bensby et al. 2014, Section 2 and Table A.1) and checked
here against the extracted text of both PDFs (the check and its two additions are in the file's `verification` block).
Legs T1 to T3 are therefore no longer NOT RUN; their results are below. **The verdicts of methods O, D and S are
unchanged and no bound, threshold, tolerance or the verdict function was touched**: `thresholds.json` is byte-identical
(sha256 4abb971f...), so `results.json` still names it. The Part A verdicts above stay as they were written; this
addendum supersedes only the paragraph "T ... C, NOT RUN" and the sentence "All four verdicts are C" is replaced by the
verdict stated in the Results subsection of this addendum.

**Retrieval facts** (2026-11-04, by Carl, from arXiv; the PDFs are not committed). Venn et al. 2004, AJ 128, 1177,
arXiv:astro-ph/0406120v1, `https://arxiv.org/pdf/astro-ph/0406120`, sha256
`4b2228f22d7a55e86cfd6db7efc53fa13fa5606a3f5f312347443285d11554c9`. Bensby, Feltzing and Oey 2014, A&A 562, A71,
arXiv:1309.2631v2, `https://arxiv.org/pdf/1309.2631`, sha256
`fcea82d7e24559d713157cfe3d0e77cf7b0d0840d08d455f3c25018605635d42`.

**How the committed legs are evaluated (written and committed before any T leg was run).** The committed legs say
"the cited rule", and the file cites two rules in two velocity frames, so the procedure below was fixed first. It adds
no bound: the bounds are the committed ones (T1 maxAbs 1e-9; T2 halo recall at least 0.80 and purity at least 0.50 over
200 realizations; T3 none).

- *Rule V (Venn Table 3).* In the Galactic rest frame (the Sun at the paper's (9, 232, 7) km/s) a star goes to the
  class with the largest product of three independent normal densities, centres and sigmas from Table 3, under a
  uniform prior (the paper's stated prior). The paper's extreme-retrograde and extreme-Toomre flags are not used (the
  file says the table is the criterion). Toomre coordinates: V and T = sqrt(U^2 + W^2).
- *Rule B (Bensby Eq. A.1 to A.3).* In the LSR frame (the Sun at the paper's (11.10, 12.24, 7.25) km/s) each class
  has the Gaussian of Eq. A.1 centred on (Uasym, Vasym, 0) with its sigmas, weighted by its fraction X; the ratios
  TD/D and TD/H are those of Eq. A.3. Halo is TD/H < 1 as the file states it (the paper's 36 halo stars are a
  subset of its TD/D > 2 stars; the count of stars where the two readings differ is reported); thick TD/D > 2 and not
  halo; thin TD/D < 0.5; otherwise in between. A rule is applied only in its own frame.
- *T1* (exact, set S): noise-free stars on the neighbourhood pack's geometry (all 1,570 rows) with velocities drawn
  from the committed three-population truth, each star's constructed velocity recorded; observables are formed, the
  space velocity recovered by the kernel's `spaceVelocity` and referred to each frame with the constructed Sun; the
  leg passes if the Toomre coordinates (V, T) in both frames differ from the constructed ones by at most 1e-9 km/s.
- *T2* (ensemble, set S): 200 realizations of the same sample with the pack's own astrometric and radial-velocity
  errors, each star one of thin, thick or halo with the committed fractions; each rule applied in its own frame with
  its paper's Sun; halo recall and purity pooled over the 200 realizations. The leg passes only if **every** cited
  rule meets both bounds (a crossed bound is a failed leg; there is no choosing between the two rules after the
  fact). The per-rule numbers are reported either way.
- *T3* (authentic, set R, no bound in the contract): the same two rules on the real neighbourhood pack, the count of each
  class and its Poisson (Garwood) interval at one sigma and at 95 percent; rule B is also run with D-GAIA-03's other
  candidate for the Sun's V (the sample's Stromberg value) and neither is chosen. With no bound committed, the only
  criterion the definition contains is that it runs and the counts account for every star, which is what a pass means
  here.
- *Verdict.* The committed function: C if any S leg fails or is NOT RUN, B if the S legs pass and an R leg fails,
  A otherwise.

**Results.** One gate stream, re-run on Node 22.23.4 in about twelve seconds, on `spike/kinematics-gate-t-legs`
(`4d6ab8a4`, never merged; it adds `js/kernels/galactic/toomre.js`, the generator `syntheticToomre` and the T block of
`tools/kinematics-validate.mjs`, all committed before the run, and nothing else). Two runs give byte-identical
`results.json`. The file now holds **66 rows: 39 pass, 23 fail, 4 REPORTED, 0 NOT RUN**; the 63 rows of methods O, D
and S are byte-identical to the Part A run, and so are their verdicts.

| Leg | Status | Measured |
|---|---|---|
| T1 Toomre coordinates of constructed stars exact (S) | pass | largest difference 8.5e-14 km/s over 1,570 stars, both frames, against 1e-9 |
| T2 halo recall at least 0.80 and purity at least 0.50, 200 realizations (S) | **fail** | rule V (Venn, rest frame): recall 0.921, **purity 0.300** (1,451 true halo found, 3,392 thick-disk stars called halo); rule B (Bensby, LSR frame): **recall 0.7968**, purity 0.858 (1,255 found of 1,575, 207 false) |
| T3 the rules on the real pack, with Poisson intervals (R, no bound) | pass (reported) | rule V: thin 1,213, thick 351, halo 6 (one sigma 3.6 to 9.6); rule B with the paper's Sun: thin 1,392, thick 95, between 80, halo 3 (1.4 to 5.9); with the sample's Stromberg V (2.64 km/s): thin 1,365, thick 125, between 76, halo 4 (2.1 to 7.2) |

**The verdict for method T is C by the committed function** (`failedS`: `T.T2.classification`; nothing NOT RUN). It
stays C however the two rules are weighed, because neither meets both bounds, so the "every cited rule" reading
fixed beforehand decided nothing here. `T.T2.classification` is in `failed-legs.json` (now 23 legs) and stays failing
and labelled; no bound moved and only Carl resets one. The verdicts of O, D and S are those of the Part A text, so
all four methods remain C and Part B still builds nothing: no Toomre kernel, panel or lesson. The steps that would
have used one stay reading steps; the one change to say is that a Toomre separation now has a tested reason it
cannot ship as a method (below), not only a missing source.

**What the numbers say, after the result and not a leg.** Rule V's purity fails because its prior is uniform (the
paper's own choice, for samples it describes as chosen to enhance the less populous components) while the committed
synthetic sample has 29 thick-disk stars for each halo star; rule V finds nearly every halo star and calls 3,392
thick-disk stars halo with it. Rule B weights by the paper's fractions and calls few thick-disk stars halo, but
misses 0.0032 of the bound on recall: 1,255 of 1,575 halo stars where 1,260 would pass. The sample has about eight
halo stars per realization (1,570 stars at a fraction of 0.005), and the real pack's 3 to 6 halo stars carry 95 percent Poisson
intervals that run from 0.6 to 13: a counted halo fraction from this pack would be reported with an interval
wider than its value. The nested reading of rule B's halo (TD/H below 1 and TD/D above 2, the paper's own
nesting) differs from the one used in no star of the 200 realizations.

**Questions for Carl (new, none acted on).** (1) Whether to open a re-gate for method T judged on the single rule that
nearly passes (rule B, recall 0.797 against 0.80); that moves a bound or the rule, so it is his, and as
committed the leg fails. (2) Whether the 29-to-1 thick-to-halo ratio of the committed synthetic fractions is the
sample a lesson would use; it was committed before the result and is not changed here. (3) Nothing about O, D or S
changes: AM1, AM2, the 24-star bin and the oracle bound stand as in Questions for Carl above.

**What the data files carry.** Reading Table 3 and Table A.1 against the extracted text found no transcription error: every
number matched. The file as supplied omitted the solar motion each paper states (Venn's footnote 3 to Section 2,
(9, 232, 7) km/s in the Galactic frame; Bensby's Section 3, (11.10, 12.24, 7.25) km/s from the LSR), which is what
fixes each rule's frame, and it did not note that Bensby prints 89 stars in between in the text and 88 in a caption
(the paper's text counts sum to 715 for a 714-star sample). Both are recorded in the file's `verification` block with
their locations, as additions and not changes to any transcribed value.

<!-- Listed in DOCUMENTS.md. -->
