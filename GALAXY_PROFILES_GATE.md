# The galaxy-profiles gate: PSF-convolved fits, two components and Tully-Fisher (Prompt 249, Part B)

This is the Part B gate of Prompt 249, in the form 247's Part B took: the thresholds and the verdict function are
committed, nothing is measured. **No leg of this gate has run and there is no verdict.** The prompt's Part B says to
commit the PSF-convolved Sersic and exponential-plus-de Vaucouleurs models, the degeneracy statement, the independent
fit pinned as the oracle, the Tully-Fisher data requirement and the tolerances, then measure and give a verdict A, B or
C. The commitment is done, in [`tests/fixtures/morphology/gate-thresholds.json`](tests/fixtures/morphology/gate-thresholds.json),
in the same commit as Part A's contract (41dd0363) and before any kernel, oracle output or image of Prompt 249 existed. The
measurement is not done: it needs a PSF-convolved two-dimensional fitter, which does not exist, and the roadmap's rule
(7.5, rule 4) keeps a gate's prototype on a spike branch that is never merged. That branch, the fitter and the
measurements are a separate session; this pull request carries the documentation and the committed thresholds only.

Part A, the kernel and its validation, is in [GALAXY_MORPHOLOGY.md](GALAXY_MORPHOLOGY.md). Nothing here fits a profile
without the PSF, and nothing here claims Tully-Fisher without the widths.

## The models the gate commits

- **PSF-convolved Sersic.** The elliptical Sersic of Part A's synthetic worlds, rendered with the same sub-pixel rule and
  convolved with the declared Gaussian PSF before it is compared with the data. Parameters: centre (2), n, R_e, q, position
  angle, total flux and a sky offset. The likelihood is the Gaussian chi-square with the frame's true variance map.
- **Exponential plus de Vaucouleurs.** An n = 1 and an n = 4 component sharing a centre, each with its own R_e, q, angle and
  flux; the bulge-to-total fraction is flux_4 over the sum. A one-component and a two-component fit compete by the
  difference in the Bayesian information criterion; the two-component model is preferred only when it lowers BIC by 10.
- **The degeneracy statement.** n and R_e are strongly and positively correlated for a single Sersic fitted to a noisy image: a larger
  n with a larger R_e fits nearly as well. A fit must report the profile-likelihood intervals of n and of R_e and the
  correlation of their estimates, and must return not-constrained for n when its 68 percent interval is wider than 1.5. A
  bulge fraction is degenerate with the disk's scale length when the bulge radius is below the PSF FWHM, and the fit must say so.

## The legs (all NOT RUN)

| Leg | What it asks | Status |
|---|---|---|
| G1 | The single-Sersic fit recovers 18 galaxies (n 1, 2, 4; q 0.45, 0.75, 0.95): at flux 200000, R_e within 3 percent, n within 0.3, q within 0.03, centre within 0.05 px; at flux 20000, R_e within 8 percent, n within 0.8 or not-constrained, q within 0.05 | NOT RUN |
| G2 | An independent fit (scipy least_squares, no Gravitas code, pinned with its environment) on 6 pinned noisy 96 by 96 images agrees: R_e within 1 percent, n within 0.05, q within 0.01, flux within 1 percent | NOT RUN |
| G3 | On 100 noisy galaxies at flux 20000 the R_e profile interval covers 0.543 to 0.823 of them, the n-R_e correlation is at least 0.8 in at least 90 of them, and a galaxy at flux 3000 returns not-constrained for n in 80 percent | NOT RUN |
| G4 | Exponential-plus-de Vaucouleurs: B/T within 0.1 at 0.2, 0.5, 0.8; the BIC rule keeps one component for pure n = 1 and n = 4 in 90 percent of 50 seeds; a bulge of 0.5 FWHM returns the degeneracy flag | NOT RUN |
| G5 | A PSF FWHM wrong by 20 percent biases R_e by at most 10 percent for R_e over FWHM of 3 or more | NOT RUN |
| G6 | Tully-Fisher data: matched extragalactic HI widths for at least 20 galaxies that also have images and magnitudes, under a recorded per-source rights decision | **unmet by data** (below) |
| G7 | The fitter's deferred cost, lazy and NEVER_PRECACHED | NOT RUN |

## The verdict function (committed)

A: G1 to G5 pass and G6 has data: the two-component fit with its degeneracy statement and Tully-Fisher with the widths.
B: G1, G2 and G3 pass (G4 and G5 may fail or not run, and then the two-component part is skipped) and G6 has no data: the
PSF-convolved single-Sersic fit only. C: any of G1, G2, G3 fails or is NOT RUN: neither, and Part A stands. The first rule
that holds applies; a leg not run holds nothing. **Current state: no verdict; at most B is reachable**, because G6 has no
data and no rights decision (D-R10-249-04), so Tully-Fisher is not built whatever the fits do.

## The Tully-Fisher data requirement, recorded as unmet

A Tully-Fisher relation needs, per galaxy, a rotation-speed measure (an HI line width, corrected for inclination and
instrumental broadening), a distance independent of the relation, and a total magnitude in a stated band; the scatter and the
slope are the lesson and neither can be shown without all three. The repository holds no extragalactic HI line width of any
galaxy and no rights decision for one, so the requirement is **none: recorded**, which is the prompt's own alternative. The
width-bearing data it would take, and how to supply it, are in the request below.

## What Carl would supply, and what a Part B session would then do

1. **Rule on whether Part B runs now.** It is a spike-branch session (the fitter, G1 to G5) with a documentation pull request, and
   its value is the upper depth of "Shapes of galaxies" ("the two-component fit and its degeneracy"). With the consumers rule
   unmet for Part A, the recommendation is to run it only after Carl rules on Part A's consumers.
2. **Tully-Fisher data (optional).** A table of at least 20 galaxies with an HI line width (the width measure named, with its
   inclination and broadening corrections and the paper or catalogue they come from), a redshift-independent distance or a
   stated flow model, a total magnitude and band, and the terms of the table's source, read and saved with a retrieval date. A
   public-domain or CC BY table is the only basis the roadmap accepts without its own recorded decision. Without it G6 stays unmet and
   the relations lesson is not built.

## Rights

Nothing was fetched and no licence term was typed. The SDSS image terms are not confirmed (D-R10-249-02).

<!-- Listed in DOCUMENTS.md. -->
