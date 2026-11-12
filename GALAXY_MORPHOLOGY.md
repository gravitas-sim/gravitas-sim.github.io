# The galaxy-morphology kernel: shapes, sizes, magnitudes and colours on an image (Prompt 249, Part A)

What shape is that galaxy, how big is it, how bright and what colour, and is that size a measurement or the PSF? This is the
kernel part of Prompt 249 Part A (an invisible pull request: no image-panel tool, no investigation, no instructor material,
no pack, nothing a student sees). It adds `js/kernels/galaxy/morphology/` (seven modules), its validator
`tools/morphology-validate.mjs`, an independent oracle `tools/morphology-oracle/`, a validation group of six checks, and the
fixtures under `tests/fixtures/morphology/`. The image panel's galaxy tools (isophote overlays, the profile plot), "Shapes of
galaxies", the model-page section and the SDSS image packs are a separate instructional pull request that waits for Carl's
go-ahead; **the consumers rule is unmet** (none was committed beforehand, and the kernel's authentic legs did not run), so
none of it is built. Part B (PSF-convolved and two-component fits, Tully-Fisher) is a gate whose thresholds are committed and
whose legs are not run: see [GALAXY_PROFILES_GATE.md](GALAXY_PROFILES_GATE.md).

The validation contract was committed first, in `tests/fixtures/morphology/thresholds.json` (commit 41dd0363), before any
kernel, oracle output, image or result existed; this document was written after it. A crossed bound is a failed leg and
stays failing; only Carl resets one. Four amendments are in the file with their reasons; none moves a bound. **The recorded
run has six failing legs** (A2, A4, A7, B2, C1, D1b, below), listed in `failed-legs.json`; the counts are in the table.

## What is built and what is not

Built: (1) an image check and a **sky from the frame's rim** (a clipped mean, a flatness test between the four strips); (2) a
start from the connected region of the smoothed image above a stated level; (3) the **Petrosian radius** (mean surface
brightness in the elliptical annulus 0.8 a to 1.25 a over the mean inside a, first crossing of 0.2) in elliptical apertures
whose centre, axis ratio and position angle are the **fixed point of the second moments** inside 2 r_P; (4) **isophotes by
annuli**; (5) the **surface-brightness profile** in 14 log-spaced elliptical annuli with a sigma and a labelled interval from
the statistics kernel; (6) the **curve of growth**: the total flux inside 2 r_P, the half-light radius, r_20 and r_80;
(7) the **total magnitude** with a caller's zero point (instrumental, flagged, when none) and the **colour** by the same
aperture on a second band; (8) **concentration** C = 5 log10(r_80 / r_20) and the 180-degree **asymmetry** A with its
background term; (9) **uncertainties** for every number by seeded noise injection through the whole rule; (10) the refusals
by code and the status **unresolved**; (11) a **classification function** that takes a rule the caller supplies, with a
source string and no default; (12) a labelled synthetic image generator with analytic truths.

Not built, on purpose: the image panel's galaxy tools, "Shapes of galaxies", the model section, instructor materials, Spanish
strings and any pack (packs have 0 B of room and no SDSS image is in the tree); any **published classification boundary** (the
kernel holds none; the stand-in rule of the validation is invented and labelled so); a PSF-convolved fit, two components and
Tully-Fisher (Part B); any PSF correction of a size. **A measured size is a size in the image as observed, PSF included.**

## The rule (MORPH-RULE-1, `thresholds.json` analysisRule)

Input: a frame `{width, height, values, variance}` (the true variance of independent pixel noise) and the PSF FWHM in pixels.
Pixel (0, 0) is the centre of the first pixel; a position angle is counter-clockwise from +x in array coordinates.

- **S1 sky.** A rim of max(8, 7.5 percent of the short side) pixels, clipped five times at 3 sigma, mean and error from the
  variance; four strips compared pairwise at 4 sigma (`sky-not-flat`).
- **S2 start.** Smoothed frame above 3 smoothed-noise units, the connected region holding the brightest pixel of the central box;
  its moments seed the shape.
- **S3 to S5.** Sub-pixel (3 by 3) accumulation in 0.05 pixel bins of the elliptical radius; Petrosian radius on the grid
  0.25 FWHM times 1.05^k (amendment AM1); second moments inside 2 r_P give the next centre, axis ratio and angle; repeat to
  |dq| < 0.001, |dpa| < 0.1 degree, centre < 0.01 pixel.
- **S6 totals.** F_T = F(< 2 r_P); R50, r_20, r_80 at 0.5, 0.2, 0.8 of F_T; `low-signal` below F_T / sigma of 10.
- **S9 magnitude and colour.** m = zero point - 2.5 log10(F_T / exposure); colour = m_1 - m_2 with the first band's aperture
  (so a fainter second band has a negative colour; AM4).
- **S10 concentration and asymmetry.** A = sum |I - I_180| / sum |I| in a circle of radius 2 r_P sqrt(q), about the centre that
  minimises it, minus the same sum on a corner patch of the frame that does not overlap the galaxy's circle; a frame too small for
  a patch gives A `not-constrained` (`no-background-patch`) and everything else stands.
- **S11 unresolved.** R50 sqrt(q) < 1.25 times the PSF's half-light radius (FWHM / 2) plus the sigma: no size claim, an upper limit.
- **S12 uncertainties.** 40 noise draws re-run the whole rule from the observed solution; fewer than 36 completing sets sigma
  to NaN and the flag `unstable-uncertainty`.

Assumptions the validation prices: independent pixel noise with the variance given (a survey frame has correlated noise and
the kernel's sigmas are then too small by a factor it does not know); a round Gaussian PSF of the declared FWHM, never
deconvolved; concentric similar isophotes inside 2 r_P; a rim that is sky; and **the "total" is the Petrosian flux inside 2 r_P**, a
fraction of the Sersic total that falls with n (R2: 0.993, 0.943, 0.817 and 0.705 of the total for n = 1, 2, 4, 6, i.e. the
magnitude is too faint by 0.007, 0.064, 0.22 and 0.38 mag). The Petrosian level 0.2 and the 2 r_P total are options this
contract chose; they are not values taken from a survey pipeline.

## The synthetic worlds

SYNTHETIC GALAXY IMAGES: every parameter is invented, every image has a truth manifest, none models a real galaxy. 160 by 160
pixels, a constant sky of 100 electrons, read noise 5, an effective Gaussian PSF of FWHM 3 pixels, an invented zero point of
25.0, elliptical Sersic (b_n from the incomplete gamma function, not tabulated) or Gaussian profiles with an optional clump,
pixel means over 5 by 5 sub-pixels (15 by 15 near the centre), convolved, with Gaussian noise of the true variance. The generator
is `generateGalaxyImage` in `synthetic.js`; the closed forms are in `analytic.js`.

## Validation contract and measured table

Run on Node 22.23.4 (`npm run morphology:validate`; the oracle is Python 3.9.6, numpy 1.26.4, scipy 1.13.1, no Gravitas code).

| Leg | What | Result |
|---|---|---|
| A1 | noise-free PSF-free Gaussian galaxy against closed forms | pass (q to 7e-4, radii to 0.2 percent, magnitude 1.4e-5 mag) |
| A2 | noise-free Sersic n = 1, 2, 4 against the analytic cumulative flux | **FAIL** (C of n = 4: 0.097 against 0.05) |
| A3 | noisy n = 1, 4, 12 seeds each | pass (12 of 12; worst R50 error 1.6 percent) |
| A4 | magnitude and colour arithmetic | **FAIL** (sign of the colour in the committed sentence) |
| A4b | the same with the sign stated | pass (colour -0.5 to better than 1e-6) |
| A5 | asymmetry: symmetric image, noisy mean, clump ordering | pass (0.006; 0.0026; 0.007 < 0.21 < 0.41 < 0.51) |
| A6 | exponential profile against the analytic annulus means | pass (worst 0.8 percent) |
| A7 | isophote annuli of a noise-free n = 2 galaxy | **FAIL** (q 0.0135 against 0.01) |
| B1 | the oracle's forward model against the generator | pass (agreement 1e-12 of peak or better, 8 cases) |
| B2 | the oracle's measurements against the kernel's | **FAIL** (r_20 of one case 1.15 percent against 1; profile of two cases 2.5 and 2.6 percent against 2; everything else 1e-3 or better) |
| C1 | R50 interval coverage, 100 galaxies | **FAIL** (mean normalised error -0.381 against 0.35; coverage 0.586 on the 87 with a sigma) |
| C2 | total magnitude coverage | pass (coverage 0.66, mean 0.13, sd 1.05) |
| C3 | colour coverage | pass (0.77, 0.04, 0.83) |
| D1a | point sources unresolved | pass (50 of 50) |
| D1b | galaxies of 0.25 FWHM unresolved | **FAIL** (32 of 50; all n = 1, 7 of 25 n = 4) |
| D1c | galaxies of 2 FWHM not unresolved | pass (0 of 50) |
| D2 | low signal refused | pass (50 of 50 refused) |
| D3 | galaxy too big for the frame | pass (20 of 20 `frame-too-small`) |
| D4, D4b | sky gradient refused; no-gradient control | pass (40 of 40; 0 of 40) |
| D5 | classification ambiguity and missing rule | pass |
| E1 to E3 | authentic SDSS profile, cited classification, quantitative contract | **NOT RUN** (nothing fetched) |
| R1 to R3 | PSF bias, total fraction, stand-in classification (synthetic) | reported |
| G1 to G7 | Part B | **NOT RUN** (see the gate document) |

The pinned numbers, per leg, are in `tests/fixtures/morphology/results.json`; each failing leg has its reason in
`failed-legs.json`. The pass, fail and not-run counts of the recorded run are in the pull request.

## The failing legs, and what they mean

- **A2, A7, B2** are discretisation limits of the first version of the kernel, at small radii, where the 3 by 3 binned growth,
  the pixel-centre annulus moments and the cusp of an n = 4 profile cost a few percent: concentration of an n = 4 galaxy is
  low by 0.1 in C even with no PSF and no noise (the oracle, which sorts 5 by 5, agrees with the kernel to 0.025 in C or better in all 8 cases). They are not
  bugs of the definitions: the independent oracle agrees with the kernel to 1e-3 on shape, centre, r_P, R50 and flux.
- **A4** is a sign slip in the committed sentence (A4b, committed first by AM4, passes).
- **C1:** the half-light radius is on average 0.38 sigma too small, and 13 of 100 galaxies (the faint ones) return no sigma
  because too many noise draws fall under the signal-to-noise floor. The magnitude and colour intervals cover.
- **D1b:** a de Vaucouleurs galaxy of half-light radius a quarter of the PSF FWHM measures about 2.4 percent above the rule's
  margin of 1.25 times the PSF's own half-light radius and is called resolved; n = 1 is called unresolved every time. The
  margin is not changed.

## Rights and the authentic legs (7.5 rule 4)

Nothing was fetched and no SDSS image, catalogue value, class, zero point or licence term was typed. **The Run condition's
rights clause (the SDSS image terms confirmed specifically and recorded) is not met**: no SDSS page was read in this session, so the
imaging has the status "no basis recorded" (D-R10-249-02), and no pack was built. What is needed to run E1 to E3 and what the
instructional pull request would need, each a request for Carl to fetch (names marked "from memory" are unverified and Carl
may choose others; this session cannot name real objects):

1. **SDSS images (E1, the packs).** For each of three to six galaxies Carl chooses (at least one elliptical, one spiral
   seen at moderate inclination, one compact or small, and one that is clearly interacting): the g and r frames of the survey's
   imaging from one named data release (the release name and number, recorded), as the survey distributes them (the frame
   file with its header and, if the frame is not in physical units, the calibration the documentation says converts it), and
   the survey's image-data-model documentation page saved with its retrieval date (pixel units, gain, dark variance, any bias
   or soft-bias offset, the sky treatment, saturation). The terms: the survey's data-use or acknowledgement page, read and saved with
   its date, and the sentence that says whether images may be redistributed in a repository and under what attribution. Only then
   is the rights basis decided (per source and redistribution form, 7.5 rule 4), by Carl.
2. **The survey's own measurements for the same objects (E1's oracle).** From that release's photometric catalogue, for each
   chosen object: the object identifier and the field coordinates, and, in g and r, the Petrosian half-light radius, the
   Petrosian magnitude and its error, the exponential and de Vaucouleurs fit axis ratios and position angles, and the PSF
   width of the field; the column names from memory are `petroR50_r`, `petroR90_r`, `petroMag_r`, `petroMag_g`, `expAB_r`,
   `expPhi_r`, `deVAB_r`, `deVPhi_r` and a field PSF width (unverified: save the schema page that defines them, with the
   definition of the Petrosian radius and aperture the pipeline uses). E1 compares, never tunes: the kernel's eta of 0.2 and 2 r_P
   total are this contract's options, and a disagreement is reported with the definitions side by side.
3. **A classification catalogue with classes (E2).** A published morphological classification of the same objects whose terms
   allow use (for example a citizen-science classification's published vote fractions, or an expert catalogue; from memory,
   unverified), its table for the chosen objects, the paper that defines the classes, and its terms. E2 also needs **a cited
   classification rule** (the concentration and asymmetry boundaries of a published paper, entered by Carl from the paper, with
   the page); the kernel holds none. The error rate on real galaxies is the measured disagreement of that rule with that
   catalogue, and the stand-in's synthetic confusion matrix (R3) is not a substitute.
4. **Packs.** Packs have 0 B of room, raw and gzip. Image pixels as sidecar files that no precache tier reads, counting only the manifest,
   is the Prompt 220 pattern; a manifest that does not fit is a pack decision for Carl.

## Open questions for Carl

1. **The consumers rule.** May the instructional pull request ("Shapes of galaxies", the panel tools, the model section) proceed on this kernel,
   and which of the requests above lands first? On synthetic galaxies alone it could teach the profile, the half-light radius, concentration
   and asymmetry, the PSF's cost (R1) and the unresolved refusal, labelled synthetic; the "classify by eye, then by the rule, with the rule's
   error rate shown" lesson needs the cited rule and the catalogue (request 3), and without them it would show only the invented stand-in's synthetic confusion matrix,
   which the prompt does not allow as the error rate.
2. **D1b.** A new leg with a different unresolved margin (for example 1.5 times the PSF's half-light radius, or a margin that depends on the
   fitted profile's wings), thresholds committed first, with D1b left failing? The alternative of moving the 1.25 factor in the committed rule is not taken.
3. **A2, A7, B2.** New legs with a finer growth binning and fractional-pixel annulus weights (a kernel change committed after thresholds), the
   failing ones left on record?
4. **C1.** Whether a bias of 0.38 sigma in R50 is acceptable for the lessons' purpose, or a follow-up looks for its cause (the Petrosian radius' noise
   bias is the first candidate); and whether a galaxy with no sigma should count as answered.
5. **Part B** now, or after the consumers rule (GALAXY_PROFILES_GATE.md)?

## Inherited limits to state in claims built on this kernel

Every image here is synthetic with an invented PSF, sky and zero point; the authentic legs (E1 to E3) did not run, so nothing says how the
kernel behaves on a real galaxy, with correlated noise, a neighbour, a bar or a ring. The "total" is a Petrosian flux and is too faint by
0.22 mag for n = 4. The concentration is PSF-dependent: R1 shows it low by 0.36 at R_e of one PSF FWHM and by 0.07 at three. Asymmetry is
`not-constrained` for large round galaxies in a 160-pixel frame (the background patch does not fit). The coverage of the half-light radius
fails its bias bound. No classification rule is held, and no published error rate is stated.

## References

The Petrosian radius, the concentration index and the rotational asymmetry are the standard definitions of the galaxy-morphology literature (Petrosian 1976;
Bershady, Jangren and Conselice 2000; Conselice 2003; from memory, not checked here: the kernel takes definitions, not numbers, from them, and holds none of their
boundaries). The Sersic profile is Sersic 1963 with b_n defined by the incomplete gamma function. `DECISION_REGISTER.md` D-R10-249-01 to -05.

<!-- Listed in DOCUMENTS.md. -->
