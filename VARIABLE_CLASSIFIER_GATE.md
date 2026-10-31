# The variable-star classifier gate (Prompt 223 Part B)

**Verdict: B.** The shipped nearest-neighbour classifier, with the refusal of Part A, is
fit to be offered as a **suggestion** with the ambiguous cases left unresolved and its
measured confusion matrix shown. It is not fit to be shipped as a classifier that names
variables (A), and a classifier whose error rate was measured only on synthetic curves is
not what is measured here: the labelled set is Gaia's, not Gravitas's.

## What was committed first

`tests/fixtures/variable-classifier-gate/thresholds.json` (848dc942) fixed the labelled
set, the classes, the classifier, the sources of its feature ranges, every bound and the
verdict rule before the classifier was run on the set. Only file headers, the column
definitions and the counts of empty cells were read beforehand. The measurement is on a
spike branch (`spike/variable-classifier-gate`, d5734959, never merged); this branch is
documentation, fixtures and the register row only.

## The labelled set and its rights

Gaia DR3 specific-object-study tables `gaiadr3.vari_rrlyrae` and `gaiadr3.vari_cepheid`,
through the ESA Gaia archive TAP service, fetched by the coordinator on 2026-10-30: the
first 100 RRab, 100 RRc and 100 classical Cepheids (DCEP) by ascending `source_id`, and 50
Type II Cepheids (T2CEP), no other filter. The labels are Gaia's own classification, so
agreement with them is an upper bound on agreement with the truth and partly measures
agreement between two feature-based methods; the set is independent of Gravitas, which
neither generated nor tuned to it. Rights: Gaia data are distributed under CC BY-NC 3.0 IGO
(the ESA licence page, retrieved 2026-10-30); the existing status of D-GAIA-01 for derived
subsets with credit, non-commercial; a new product, hence a new row (D-R10-223-05).
`labelled-set.json` holds the used columns of the 350 rows as a derived fixture; the raw
files and their queries are not in the repository (their checksums are in the thresholds).

Limits stated up front: the first rows by source id sit in one region of the sky; Gaia
epochs are sparse; 65 of the 100 DCEP rows are first-overtone pulsators whose periods
overlap the RR Lyrae stars'; R21 is empty in 33 rows. Delta Scuti, eclipsing binaries and
other classes are outside the gate.

## The classifier under test

The vote of `js/kernels/variables/classify.js` (five neighbours, features standardised on
the synthetic exercise sample) on `logP` and `logAmp` (the listed period in days, `pf` else
`p1_o`; the Gaia G-band peak-to-peak amplitude), a class given only if four of five agree.
Its feature ranges are the kernel's own templates, stylised from Soszynski et al. (2008,
2009) and Graham et al. (2013) as the kernel cites them; those papers were not re-read in
this session and the gate does not depend on them. The synthetic amplitude is a
TESS-like band's and Gaia's is the G band's: a stated passband difference, not corrected.
Nothing was trained, tuned or chosen on the set.

## Results

| Leg | Bound | Measured | |
|---|---|---|---|
| G1 coverage | at least 0.60 | 259 of 300 called, 0.863 | pass |
| G2 accuracy among the called | at least 0.90 | 200 of 259, **0.772** | **fail** |
| G3 per class | precision at least 0.80, recall at least 0.50 | RRab 1.00 / 0.60; RRc 0.81 / 0.83; Cepheid 1.00 / 0.57 | pass |
| G4 T2CEP not called RR Lyrae | at most 0.10 | 1 of 50 (0.02); 35 called Cepheid, 10 left open | pass |
| G5 shape set (report) | none | R21 present in 277 rows; accuracy among the called 0.827 | report |
| G6 bootstrap lower end | at least 0.85 | 95 percent interval 0.718 to 0.822 | **fail** |
| O1 independent recomputation | 0 cells differ | numpy 1.26.4, 0 cells differ | pass |

The confusion matrix (rows the label, columns the call):

| | RRab | RRc | Cepheid | left open |
|---|---:|---:|---:|---:|
| RRab (100) | 60 | 20 | 0 | 20 |
| RRc (100) | 0 | 83 | 0 | 17 |
| DCEP (100) | 0 | 0 | 57 | 43 |

G2 and G6 crossed their bounds and stay failing and labelled (`failed-legs.json`); no bound
was moved. The classifier never calls a classical Cepheid anything else, and never calls an
RR Lyrae star a Cepheid; its errors are RRab stars called RRc (20) and what it declines to
name (80 of 300). Adding R21 does not change the picture (0.827 among the called).

## The verdict by the committed rule

A needed G1, G2, G3, G4 and G6 to pass; G2 and G6 did not. B needs the accuracy among the
called to be at least 0.75 and G4 to pass: 0.772 and 0.02, so **B**. A B verdict never
authorizes the A scope. The classifier may be offered only as a suggestion, with the
ambiguous cases left unresolved and the matrix on the screen; "A catalog of variables"
(classify a small catalogue, find the Cepheids, build a distance) is built within that and
within the rights of the data it uses, and it is not built by this documentation PR.

## What would change the verdict

A larger, randomly drawn labelled set (the first rows by source id are not), an
independent literature label, the same set in the same band, or a classifier trained on
labelled real variables would each be a new gate with its own committed thresholds. The
verdict is about this classifier on this set.
