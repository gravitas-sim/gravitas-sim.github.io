# Cosmology and extragalactic data: gate

**Status: decided under delegation, not reviewed.** Carl asked for the roadmap
to run in order, with each gate decided on its recommendation. These verdicts
are evidence, not a signed decision; each names the evidence it rests on and
what would reverse it. The register rows are DELEGATED until Carl reviews
them.

**Base:** `v2` at `f043db5b`. **Thresholds:** [`spike/cosmo/THRESHOLDS.md`][thr],
committed at `60b985b7` on 2026-10-09 14:02:59 -0500, before any dataset was
downloaded, any reference computed or any prototype written (the later commits
on the branch are the evidence of that order). **Prototype and evidence:**
branch `spike/cosmology-data` at `ed39a743`, in [`spike/cosmo/`][spike]. It is
disposable and will not merge. This PR is the decision record and the register
rows only.

[thr]: https://github.com/gravitas-sim/gravitas-sim.github.io/blob/60b985b7/spike/cosmo/THRESHOLDS.md
[spike]: https://github.com/gravitas-sim/gravitas-sim.github.io/tree/ed39a7439a04151585656150587d9f7a1004f9dc/spike/cosmo

## Verdicts

| Piece | Verdict | One line |
|---|---|---|
| **Hubble 1929 table** (24 nebulae) | **A** | United States public domain by publication date; 741 bytes |
| **Type Ia supernova diagram, DES-SN5YR** (1,829 SNe) | **A** | CC BY 4.0 on the Zenodo record; 28.6 KiB, byte-exact |
| **Type Ia supernovae, Pantheon+** | **C** | the data release has no license or redistribution statement; the paper's CC BY does not cover the 1,701-row file |
| **SDSS galaxy redshift slice** | **A** | public domain; 2,911 galaxies, 34.1 KiB; z kept byte-exact |
| **Tully-Fisher, SPARC** | **C** | the site asks for citation and states no license; the paper is not open access |
| **Faber-Jackson, from SDSS** | **C** | rights are clear (public domain) but the exponent misses the published one: 0.307 against 0.25 +- 0.012 |
| **Cepheid period-luminosity, SH0ES Table 2** | **A** | the paper is CC BY 4.0; a 515-star extract, 6.6 KiB |
| **Cluster velocity dispersion, Coma from SDSS** | **C** | rights clear, but sigma = 973 km/s misses the published 1038 +- 60; the VizieR route is licensed non-commercial |
| **FLRW kernel: flat and open Lambda-CDM** | **A** | 1.8e-12 from astropy, 9e-16 from quadrature; 2.1 ms per 1,000 distances; 1.6 KB minified |
| **FLRW kernel: open matter-only** | **B** | the kernel is exact (5e-16 from a 60-digit evaluation) but one identity check misses its bar by the closed form's own rounding; see below |
| **Hubble-diagram fit through the inference core** | **A** | converges from three starts to 1.6e-12; 69.5% coverage; 60-90 ms per fit |
| **Redshift-slice wedge through the plot component** | **A** | `createPlot` unchanged; 64 ms for 2,911 points; variance-to-mean 9.8 |

Shipped bytes if every A ships: 70.0 KiB raw against the 96 KiB total ceiling.
No ceiling is raised, and no production code is written.

The rest of this record is the evidence, then the slices the verdicts authorize.

---

## 1. The rights findings

A dataset passes R1 only when its owner's authoritative terms permit
redistribution, read on 2026-10-09. The terms that were read are kept in
`spike/cosmo/sources/rights/`.

| Dataset | Source and URL | License as read | Citation asked | Passes |
|---|---|---|---|---|
| Hubble 1929, Table 1 | PNAS 15, 168 (PMC522427, page scans); US Copyright Office Circular 15A | Published in the United States in 1929. The circular says every work published in the United States before 1 January 1931 is in the public domain | Hubble, E. 1929, PNAS 15, 168, doi:10.1073/pnas.15.3.168 | yes |
| DES-SN5YR Hubble diagram | Zenodo doi:10.5281/zenodo.12720778, `DES-SN5YR-1.2.zip`, file `4_DISTANCES_COVMAT/DES-SN5YR_HD.csv` | CC BY 4.0, from the record's metadata; the legal code's Share clause permits reproducing and sharing the material | The record asks for both Sanchez et al. 2024 (arXiv:2406.05046) and DES Collaboration 2024, ApJL 973, L14 | yes |
| Pantheon+ | github.com/PantheonPlusSH0ES/DataRelease (`Pantheon+SH0ES.dat`, commit `c447f0f`); pantheonplussh0es.github.io | The repository has no license file, and no page says what may be redistributed. The papers (ApJ 938, 110 and 113) are CC BY 4.0, but the data file is not printed in them. The SNANA Zenodo record (CC BY 4.0) predates Pantheon+ | "Please cite papers individually" | **no** |
| SDSS DR18 spectroscopy (the slice, FJ and Coma queries) | skyserver.sdss.org/dr18; sdss.org/collaboration/image-use-policy | "All SDSS data released in our public data releases are considered in the public domain" | Acknowledgement by phase (SDSS-I/II for the Legacy main sample) and Almeida et al. 2023, ApJS 267, 44; Strauss et al. 2002, AJ 124, 1810 | yes |
| SPARC (Tully-Fisher) | astroweb.cwru.edu/SPARC; Lelli et al. 2016, AJ 152, 157 | The site asks for citation of the master paper and states no license. The AJ paper is under the publisher's copyright. The same table on VizieR carries VizieR's rule for AAS journals: CC BY-NC-ND | Lelli et al. 2016 | **no** |
| VizieR copies of tables (Colless and Dunn 1996 and others) | cds.unistra.fr/vizier-org/licences_vizier.html | AAS-journal tables are CC BY-NC-ND; A&A tables are "free for a scientific usage". Neither permits redistribution under CC BY 4.0 or MIT | the original authors and publisher | **no** |
| SH0ES Cepheids, Table 2 | Riess et al. 2022, ApJL 934, L7 (doi:10.3847/2041-8213/ac5c5b); the table as held at `SH0ES_Data/table2.tex`, commit `c447f0f` | The publisher's page says original content may be used under CC BY 4.0 (Crossref records the same). The repository copy has no license of its own; the gate relies on the paper's | Riess et al. 2022; Reid et al. 2019 and Pietrzynski et al. 2019 for the anchors | yes, by the paper's license |

Notes that bear on the verdicts:

- **Pantheon+ is a blocker, not a judgment.** Nothing says the 1,701-row table
  may be copied into a repository. The compilation's license would have to be
  stated by the Pantheon+ team; asking is the way to reach A. DES-SN5YR does
  the same teaching job under a clear license.
- **SH0ES carries a caution the pack must repeat.** The table's own note says
  its errors do not include the covariance, and that a new selection needs new
  artificial-star tests. It is a teaching extract of a published table, not a
  refit of the distance ladder.
- **The VizieR route is closed for shipping.** That includes the Coma
  catalogue of Colless and Dunn (1996). The SDSS Coma sample below is the
  public-domain substitute.
- **BAO and CMB.** No BAO or Planck data are evaluated: the prompt names none,
  and the next section keeps them out. A single published number (a
  parameter value with its uncertainty) may be quoted with its citation; the
  Planck 2018 paper is under the publisher's copyright, so nothing from its
  files ships.

## 2. The datasets, one by one

Ceilings are in THRESHOLDS.md Part 1. "Exact" means the digits of the raw file
are kept, so any statistic of the shipped file equals the raw statistic to
rounding (measured below).

| Dataset | Raw ceiling | Shipped (raw, gzip) | Gzip ceiling | R6: the check against the source |
|---|---|---|---|---|
| Hubble 1929 | 2 KiB | 741 B, 340 B | 1 KiB | all 24 printed M_t recomputed from m_t and r: 21 within rounding, three (NGC 5457, 3031, 4826) differ by 0.066 to 0.071 mag, which is the paper's own arithmetic; the printed mean -15.5 is reproduced as -15.483 |
| DES-SN5YR | 32 KiB | 29,334 B (28.6 KiB), 11,743 B | 14 KiB | mean z and mean MU of the shipped file equal the raw file's to 6e-16 and 1.2e-15; the fit below gives Omega_m = 0.361 against the published 0.352 +- 0.017 |
| SDSS slice | 48 KiB | 34,893 B (34.1 KiB), 16,933 B | 20 KiB | mean z equals the raw selection's to 2.4e-15 |
| SH0ES Cepheids | 8 KiB | 6,739 B (6.6 KiB), 2,744 B | 4 KiB | LMC slope -3.290 +- 0.019 against the paper's -3.284 +- 0.017: inside the paper's uncertainty |
| FJ sample | 12 KiB | 7,918 B, 3,031 B | 5 KiB | **fails**: exponent 0.307 +- 0.011 against 0.25 +- 0.012 |
| Coma members | 16 KiB | 13,641 B, 6,397 B | 7 KiB | **fails**: sigma_cz = 972.6 km/s against 1038 +- 60 |

Each derivative was rebuilt twice with byte-identical output
(`results/reproduce.log`); the SDSS answers and the DES file were fetched a
second time and gave the same bytes (`results/verify-sdss.log`,
`results/verify-des.log`).

### Hubble 1929: A

Twenty-four rows typed from the page image, with every row checked against the
paper's printed absolute-magnitude column. Distances are in megaparsecs (the
paper's unit is 10^6 pc) and velocities in km/s. The least-squares slope is
454 +- 75 km/s/Mpc with an intercept (424 through the origin), against the
paper's 465 +- 50 for its solar-motion solution and its round 500. The solar
motion solution cannot be reproduced because the table carries no positions;
the lesson should say so and show what the plain slope gives. The result is
not the modern Hubble constant, and the page must say why (the distances were
about seven times too small).

### DES-SN5YR: A, with three notes

- The file gives MU on a scale fixed to H0 = 70 and the survey's absolute
  magnitude, with MUERR_FINAL including the intrinsic scatter. **H0 is not
  measured by supernovae alone**; the next section shows the degeneracy.
- 75 of the 1,829 rows have MUERR_FINAL above 1 mag (largest 450). They are the
  survey's down-weighted candidates and carry almost no weight. The pack keeps
  them, as the release does, or drops them with a stated rule; it never
  silently edits the file.
- The covariance matrices are not shipped (the statistical one is all zeros,
  and the other is 16 MB compressed). The pack is statistical-only and the page
  says that the published cosmology uses the full systematic covariance.

### SDSS redshift slice: A

The first of six cuts declared in advance that fits both ceilings is: dec 0 to
0.5 degrees, RA 120 to 240, z up to 0.12, 2,911 galaxies (cuts A and B were
over the ceilings). RA is rounded to 1e-4 degrees (0.18 arcsecond, a stated
step); z keeps its eight digits. The selection is the Legacy main sample
(r < 17.77, fiber-limited, with fiber collisions); the page must state it,
because a flux limit thins the slice with distance.

### Tully-Fisher: C

SPARC has the rotation curves and Spitzer photometry, but no redistribution
terms. The alternative is an HI line-width sample under a clear license; none
was found, so the Tully-Fisher lesson stays on the synthetic rotation curve
the pack `ngc3198-synthetic-curve` already labels synthetic, or links out.

### Faber-Jackson from SDSS: C

The sample is public domain and 7.9 KiB. The measurement misses its published
number: with the volume-limited cut declared in advance (z 0.02 to 0.07,
M_r < -19.5, 718 early types), the regression of log sigma on M_r gives sigma
proportional to L^0.307 +- 0.011, against Bernardi et al.'s 0.25 +- 0.012. The
rule is the rule. The probable causes (no K-correction, no aperture
correction, a direct regression in a sample that still has selection effects)
are exactly the work a later prompt would have to do; none was tried after the
number was seen. It stays out.

### Cepheids: A

The extract is the whole LMC (339 Cepheids), every fourth NGC 4258 row (111)
and every fourth M101 row (65), as Wesenheit magnitudes with R = 0.386, the
value the paper adopts. Its slopes are -3.290 +- 0.019 (LMC), -3.46 +- 0.16
(NGC 4258) and -2.85 +- 0.27 (M101): each within about two standard errors of the paper's -3.3, which is
the point of the comparison. These are HST-only measurements, so
the LMC slope is not the paper's (which leans on ground data); that it falls
within the paper's uncertainty is the check, and a small sample could miss it
by chance.

### Coma from SDSS: C

The declared procedure (1.5 degrees of Abell 1656, cz 4000 to 10000 km/s,
iterative 3-sigma clipping, 711 members) gives a mean cz of 6,980 km/s and
sigma_cz of 972.6 km/s, 65 km/s below the 1038 +- 60 Colless and Dunn
printed. The difference is 5 km/s past the bar. The shallower SDSS sample
(r < 17.77, no dwarfs, fewer galaxies near the core) is a plausible cause. The
Coma scenario and instrument keep their quoted dispersion of 1,000 km/s, which
sits inside both numbers; nothing in them changes.

## 3. The FLRW distance kernel

**Prototype:** `flrw.mjs`, composite 16-point Gauss-Legendre in ln(1+z), no
dependencies. Comoving, transverse comoving, luminosity and angular-diameter
distances, lookback time, scale factor, distance modulus; Omega_k < 0 is
refused with a named error.

The references are astropy 6.0.1 (Tcmb0 = 0) and SciPy 1.13.1 QUADPACK at
epsrel 1e-13, over the 900 points of the grid fixed in THRESHOLDS.md.

| Check | Bar | Measured |
|---|---|---|
| against astropy, all five quantities | 1e-6 | **1.8e-12** (worst: D_A, flat, Omega_m 0.5, z 0.001) |
| against quadrature | 1e-9 | **9.1e-16** |
| Einstein-de Sitter comoving distance | 1e-12 | 2.6e-14 |
| D_L = (1+z) D_M and D_A = D_M/(1+z) | 1e-14 | 0 |
| flat Lambda-CDM lookback closed form | 1e-10 | 1.8e-13 |
| open matter-only, Mattig's D_L closed form | 1e-10 | **1.5e-10: fails** |
| closed model refused | yes | yes |
| 1,000 luminosity distances, median of 31 | 5 ms | 2.1 ms |
| minified size | 6 KiB | 1,664 B |

**The one miss.** Mattig's closed form, evaluated in double precision, is
1.5e-10 from the kernel at three points of the grid (the worst Omega_m = 0.05,
z = 0.001). The cause is the formula's cancellation at small Omega_m z, not
the kernel: evaluated again in 60-digit decimal arithmetic the kernel is
within 5e-16 and the double-precision formula is 1.5e-10 away
(`results/mattig-check.json`). The bar was not moved. The verdict ladder puts
the open matter-only family at B on the literal reading, because its identity
check fails while the other families' hold. **The recommendation for Carl:**
restate the identity against a 60-digit evaluation, with the same 1e-10 bar,
which the kernel passes at 5e-16; the family becomes A the moment the
restated check is adopted. The flat and open Lambda-CDM families are the same
code and measure at the same accuracy, and are A.

**Radiation, neglected.** Against astropy with the CMB at 2.7255 K and three
massless neutrino species, the relative error in D_L is at most 0.012% at
z = 0.5, 0.035% at z = 1, 0.100% at z = 2, 0.175% at z = 3, 0.306% at z = 5 and
0.539% at z = 10. The 0.5% bar holds up to z = 5 on the grid, so the teaching
range for the luminosity distance is **z up to 5**.

**Model paragraphs** (each under 120 words, to sit on the model page):

> *Flat Lambda-CDM (95 words).* This model describes a spatially flat universe
> filled with matter (Omega_m) and a cosmological constant (Omega_L = 1 -
> Omega_m), with H0 constant today. It assumes the universe is homogeneous and
> isotropic on large scales, that dark energy has a fixed equation of state w
> = -1, and that radiation (light and neutrinos) is neglected. Neglecting
> radiation changes luminosity distances by less than 0.5% up to redshift 5
> (0.54% at redshift 10), so use it for z up to 5. It does not model galaxy
> clustering, peculiar velocities, CMB fluctuations or the growth of
> structure.

> *Open models (96 words).* This model describes a spatially open universe
> (negative curvature, Omega_k = 1 - Omega_m - Omega_L > 0) with matter and,
> optionally, a cosmological constant, and with H0 constant today. It assumes
> homogeneity and isotropy, a dark-energy equation of state fixed at w = -1,
> and no radiation. Neglecting radiation changes luminosity distances by less
> than 0.5% up to redshift 5. Closed universes (Omega_k < 0) are refused. It
> does not model clustering, peculiar velocities, CMB fluctuations or the
> growth of structure, and the observed Universe is consistent with flatness,
> so open models are for comparison.

## 4. The Hubble-diagram fit through the inference core

All on the DES-SN5YR file, with the core's own `createProblem`, `refine`,
`covarianceAt`, `profile` and `crossing` (`hubble-fit.mjs`).

| Check | Bar | Measured |
|---|---|---|
| low-z straight line (197 SNe, z < 0.1): H0 against SciPy's weighted fit | 1e-6 | 2e-15 (66.60 km/s/Mpc; the free slope is 5.139) |
| three starts reach the same chi-square | 1e-6 | 1.6e-12 |
| covariance positive definite | yes | yes; Omega_m and H0 correlate at -0.87 |
| Omega_m profile interval finite inside [0, 1] | yes | 0.349 to 0.372 around 0.3607 |
| coverage of the 68% interval, 200 seeded draws | 60% to 76% | **69.5%** (139 of 200); bias +0.0016 |
| Omega_m against the published flat value | 0.08 | 0.361 against 0.352 +- 0.017, difference 0.009 |
| one full fit | 250 ms | 60 to 88 ms |

**The degeneracy is shown, and it is complete.** With the absolute magnitude
fixed (the release's convention, H0 = 70), the fit moves H0 to 69.1 +- 0.2 and
Omega_m to 0.361. With an offset solved for beside H0, chi-square over H0 from
50 to 90 is flat to 3e-12: the offset is 5 log10(H0/70) and the data cannot
tell them apart. The lesson draws that profile, and says that supernovae alone
fix the shape of the curve, not H0; the Cepheid ladder gives the scale.

Two facts about the core that the production prompt should know:

- `crossing()` interpolates correctly only when the best fit is one of the
  profile's grid values (the first run, which left it out, gave a wrong upper
  edge of 0.355). The prototype adds it; production does the same.
- The straight-line model fits `mu - 5 log10(cz)` as a constant. It does not
  need a new model.

## 5. The wedge plot

`createPlot` from `js/plot/plot.js`, unchanged, drawing a table of Cartesian
columns made from (RA offset, comoving distance) at Omega_m 0.3, H0 70, in
jsdom.

| Check | Bar | Measured |
|---|---|---|
| draw time, 2,911 points | 150 ms | 64 ms median |
| points drawn | all, or the count stated | 2,911 of 2,911 |
| conversion (RA, z) to wedge and back | 1e-12 | 6.4e-16 in z; RA exact |
| both axes named with a unit | yes | "Across the line of sight (Mpc)", "Distance along the line of sight (Mpc)" |
| structure: counts-in-cell variance to mean | above 2 | 9.8 (24 sectors of 5 degrees in 25 Mpc shells, 100 to 400 Mpc) |

The text description is the caller's caption plus the data table, as the
Observatory's other plots do; the prototype composes the caption and does not
exercise the table component, so production must. A wedge needs a distance, so
the page names the cosmology it used for the conversion.

## 6. What this authorizes: the exact production slices

The following is the whole of what Prompt 91 and later prompts may rely on.
A and B are per the table at the top; C items are not built.

**Datasets (data packs under the existing observation contract, lazy, none in a start-up chunk):**

1. `hubble-1929-table1`: 24 rows, 741 B, derived from the page image, credit
   as in section 1, license "public domain (US, published 1929)".
2. `des-sn5yr-hd`: 1,829 rows, 28.6 KiB, built by `build-des-sn.mjs`; both
   papers cited; license CC BY 4.0; the page states the statistical-only
   errors, the H0 = 70 scale and the 75 down-weighted rows.
3. `sdss-dr18-redshift-slice`: 2,911 rows, 34.1 KiB, license "public domain";
   the SDSS-I/II acknowledgement and the DR18 citation; the selection stated.
4. `shoes-r22-cepheids`: 515 stars in three hosts, 6.6 KiB, license CC BY 4.0
   on the paper, with the table's covariance and selection caution.

The four together are 70.0 KiB raw against the 96 KiB total; no route or
bundle ceiling is touched, and the packs load lazily.

**Kernel:** `js/cosmology/flrw.js` from the prototype's `flrw.mjs`, the flat
and open Lambda-CDM families, with the closed-model refusal; the
matter-only family ships with them as soon as Carl adopts the restated identity
(it is the same code at ΩΛ = 0 and measures the same). Validation tests pin
the 900-point reference file (`refs.json`, 302 KB: kept in `tests/fixtures/`,
not in a runtime chunk) at the two tolerances. Distances are in Mpc, times in
Gyr; the teaching range for luminosity distance is z up to 5.

**Fit:** one new inference model, flat Lambda-CDM supernova, with Omega_m and H0
fitted and the offset solved, using the core as it is.

**Plot:** the wedge through the unchanged plot component.

## 7. What stays out

- Pantheon+, until its team states a license; SPARC and any VizieR copy of an
  AAS or A&A table; Zwicky's 1933 data; any Tully-Fisher sample without terms.
- Faber-Jackson and Coma dispersions from SDSS, until a measurement that meets
  the published number is done: not by relaxing the bar.
- Full systematic covariance matrices (16 MB), and any covariance-aware
  supernova cosmology.
- Perturbation theory, CMB power spectra, BAO templates beyond quoting a
  published scale with its citation, closed models, evolving dark energy,
  anything that needs a Boltzmann code.

## 8. Blockers and open items for Carl

1. **Pantheon+ rights (C):** a statement from the Pantheon+ team would turn it
   into an A candidate; DES-SN5YR already covers the lesson.
2. **Open matter-only (B):** adopt a restated Mattig identity (decimal
   reference, the same 1e-10 bar), or leave the family out.
3. **Tully-Fisher:** no license-clear sample was found; the lesson keeps the
   synthetic curve.
4. **The Cepheid pack rests on the paper's CC BY 4.0** and not on a license in
   the data repository; a statement from the SH0ES team would remove the
   dependence.
5. **Reference generation needs PyYAML.** This Mac lacks it, so an import-only
   stub was placed on `PYTHONPATH` to let astropy load; the cosmology calls
   never touch it, and the results agree with the independent quadrature to
   1e-15, but a CI rebuild of `refs.json` should install it.
6. The SH0ES table's HST-only slopes are not the paper's; that is stated, not
   corrected.

## 9. What would reverse these verdicts

| Verdict | Reverses if |
|---|---|
| A datasets | the owner withdraws or changes the license (DES, the SH0ES paper) or the pin changes bytes |
| Pantheon+ C | the team states a license that permits redistribution |
| SPARC C | a license is stated |
| FJ and Coma C | a procedure fixed in advance meets the published number within its uncertainty |
| Open matter-only B | Carl adopts the restated identity |
| Kernel A | a grid point is found where the kernel is outside 1e-9 of quadrature |
