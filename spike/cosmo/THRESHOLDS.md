# Cosmology and extragalactic data gate: thresholds, fixed before any measurement

Committed to `spike/cosmology-data` before any dataset was downloaded, any
reference distance computed or any prototype written, as Prompt 90 requires.
The git timestamp of this file is the evidence. The verdicts in
COSMOLOGY_GATE.md are these rules applied to what was measured. A threshold is
not moved after a measurement is seen; a rule that turns out badly chosen is
reported as badly chosen and the verdict stays where the rule put it.

## Part 1. A dataset ships only if all six hold

**R1. Rights.** The redistribution terms come from the owner's authoritative
page or the licence text itself, read in full on the day of the gate (URL,
retrieval date, licence, citation requirement recorded). The terms must
explicitly permit copying and redistribution of the data: a licence (CC0,
CC BY, ODbL, MIT/BSD-style), a stated US-government or collaboration
public-domain status, or expired copyright shown by the publication date and
place. Terms that permit use and ask for citation but are silent on
redistribution do not pass. A licence on the paper that does not clearly cover
the table does not pass. Rights that cannot be confirmed are a blocker, C,
and are never assumed.
The columns a source does not release for redistribution are dropped, and the
dropped columns are listed.

**R2. Citation.** A complete reference (authors, journal, volume, page or
article number, year, DOI or ADS bibcode) and the acknowledgement text the
source asks for, recorded verbatim or quoted from its page.

**R3. Pinned raw file.** A raw file from a versioned or permanent location
(commit hash, DOI, release number or dated URL), its SHA-256 and its size,
stored in the spike, and fetched again once to show the pin gives the same
bytes.

**R4. Transform.** A deterministic script from the raw file to the derivative,
run twice with byte-identical output, with every step (selection, cut, unit
conversion, rounding, encoding) written in the script's header and the columns
kept and dropped listed.

**R5. Byte ceiling.** The derivative, as the minified JSON a data-pack runtime
module would hold, is at most:

| Dataset | Raw JSON ceiling | Gzip ceiling |
|---|---|---|
| Hubble 1929 table | 2 KiB | 1 KiB |
| Type Ia supernova Hubble-diagram sample | 32 KiB | 14 KiB |
| SDSS galaxy redshift slice | 48 KiB | 20 KiB |
| Tully-Fisher or Faber-Jackson calibration sample | 12 KiB | 5 KiB |
| Cepheid period-luminosity sample | 8 KiB | 4 KiB |
| Cluster velocity dispersions or member redshifts | 16 KiB | 7 KiB |

All shipped derivatives together stay at or below **96 KiB raw**. KiB is 1024
bytes. A pack loads lazily and never in a route's start-up chunk; the gate
changes no route or bundle ceiling.

**R6. Scientific check.** The derivative reproduces a stated number from the
source: either a number the source's authors print, within the tolerance their
own uncertainty gives, or the offline analysis of the raw file within **1e-9
relative** for a transform-fidelity quantity (a mean, a slope). A derivative
that cannot be compared to either is not A.

**Verdicts for a dataset.**

- **A:** R1 to R6 all hold.
- **B:** R1 to R4 and R6 hold, and R5 or R2's acknowledgement wording fails in
  a way a named, bounded repair fixes (a smaller cut that keeps the teaching
  purpose, a dropped column, a wording decided by Carl). B authorizes only the
  slice it names.
- **C:** R1 fails or is unconfirmed, or R3, R4 or R6 fails, or R5 fails with no
  cut that keeps the teaching purpose. The dataset stays out; its lesson uses
  a labelled-synthetic stand-in or a link the student opens, never bytes in the
  repository.

Synthetic stand-ins are always labelled synthetic.

## Part 2. The FLRW distance kernel

**Models in scope.** Matter plus a cosmological constant, radiation neglected,
dark-energy equation of state fixed at w = -1, with Omega_m, Omega_L and H0:

- flat Lambda-CDM (Omega_L = 1 - Omega_m);
- open Lambda-CDM (Omega_k = 1 - Omega_m - Omega_L > 0, Omega_L >= 0);
- open matter-only (Omega_L = 0, Omega_m < 1);
- Einstein-de Sitter (Omega_m = 1) as the flat special case.

Closed models (Omega_k < 0) are out of scope and the kernel refuses them with a
named error. Quantities: comoving distance D_C, transverse comoving distance
D_M, luminosity distance D_L, angular-diameter distance D_A, lookback time,
scale factor a = 1 / (1 + z), and the distance modulus.

**Parameter ranges taught.** Omega_m in [0.05, 1.0]; Omega_L in [0, 0.95]
subject to Omega_m + Omega_L <= 1; H0 in [50, 90] km/s/Mpc; z in [0.001, 10].

**Test grid (fixed now).** Omega_m in {0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.7, 0.9,
1.0}; the families flat, open Lambda-CDM with Omega_L = (1 - Omega_m) / 2, and
open matter-only (skipping Omega_m = 1 where it is Einstein-de Sitter, already
the flat family); H0 in {50, 70, 90}; z in {0.001, 0.01, 0.05, 0.1, 0.3, 0.5,
1, 1.5, 2, 3, 5, 10}. Every point is a test point.

**References, computed offline and pinned as JSON with their versions.**

- **Tier 1, a library:** astropy.cosmology (FlatLambdaCDM and LambdaCDM,
  Tcmb0 = 0 so radiation is neglected), version recorded. The kernel is within
  **1e-6 relative** of it at every test point for D_C, D_M, D_L, D_A and
  lookback time. This tolerance is set by the reference: astropy integrates
  with SciPy's default relative tolerance of about 1.5e-8, and the gate does
  not claim agreement tighter than the reference.
- **Tier 2, direct quadrature:** the defining integrals evaluated with SciPy's
  QUADPACK at epsrel 1e-13, and the closed forms below, version recorded. The
  kernel is within **1e-9 relative** of it at every test point.
- **Identities:** Einstein-de Sitter D_C = 2c/H0 (1 - 1/sqrt(1+z)) within
  **1e-12**; open matter-only Mattig's D_L closed form within **1e-10**; flat
  Lambda-CDM lookback time closed form (inverse hyperbolic sine) within
  **1e-10**; D_L = (1+z) D_M and D_A = D_M / (1+z) within **1e-14**.

**Closed form or quadrature.** Either is acceptable; the choice is by
measurement. If both are used, they agree to 1e-10 where both apply.

**Cost.** A kernel call evaluating 1,000 luminosity distances takes at most
**5 ms median** in Node on the Mac that measures it, so a fit's many
evaluations stay interactive; the kernel is at most **6 KiB** minified with no
dependencies and no DOM.

**Statable assumptions.** Each model's page paragraph is at most **120 words**
in English and states flatness, radiation neglected, the equation of state
fixed at -1, H0 constant in time, homogeneity and isotropy, and the redshift
range where it holds. The error from neglecting radiation is measured against
astropy with the CMB temperature 2.7255 K and three massless neutrino species;
the page must state it, and the teaching range for the luminosity distance is
the z where it stays at or below **0.5%** (the statement is made from the
measurement, not the other way round).

## Part 3. The Hubble-diagram fit through the inference core

**Linear fit.** For z < 0.1 the inference core's straight-line model
(`POLY_1`) fits distance modulus against log10(cz) or the equivalent, and the
Hubble constant it implies is within **1e-6 relative** of an offline SciPy
least-squares fit of the same rows.

**Full fit.** A kernel-backed model with free Omega_m (flat) and H0, and the
supernova absolute magnitude either fixed or solved as a linear parameter, runs
through `createProblem` and `refine`, and:

- converges from three different starts to the same chi-square within
  **1e-6**;
- gives a covariance that is positive definite and a profile interval for
  Omega_m that is finite inside [0, 1] for the shipped sample;
- recovers Omega_m of a flat Lambda-CDM synthetic sample (truth Omega_m = 0.3,
  N matched to the shipped sample, errors matched) with its profile interval
  covering the truth in **60% to 76%** of 200 seeded draws (68% plus or minus
  roughly three binomial deviations);
- shows the degeneracy: the correlation coefficient between H0 and the
  absolute-magnitude offset is reported, and a profile of chi-square over H0 is
  drawn. If M is fixed, the gate says what that assumes; if it is free, H0 is
  not constrained by supernovae alone and the page says so;
- a full fit of the shipped sample takes at most **250 ms** in Node. Slower
  means it runs in a Worker, and that is stated.

**Agreement with the literature.** The best-fit flat Omega_m of the shipped
sample, with the sample's own statistical errors only, is within **0.08** of
the published supernova-only value for that compilation. Because the full
systematic covariance is not shipped, this is a teaching-grade agreement and
the page says so; it is not a reproduction of the published cosmology.

## Part 4. The redshift-slice wedge plot through the plot component

- It uses `js/plot/plot.js` `createPlot` unchanged (no edit to the plot
  component), driven by a table of Cartesian columns made from (right
  ascension offset, redshift), in jsdom.
- All points drawn, or the decimated count stated by `drawnCount()`, in at most
  **150 ms** for the shipped slice in Node with jsdom.
- The conversion from (RA, dec, z) to wedge coordinates is invertible to
  **1e-12** relative.
- Every axis has a name and a unit, and the figure has a text description.
- The slice shows structure: the variance-to-mean ratio of counts in equal
  cells exceeds **2** (Poisson is 1). The selection limit of the sample (the
  magnitude cut and the fibre-collision effect) is stated on the page.

## Part 5. Verdicts for a model

- **A:** every Part 2 and Part 3 threshold holds, the paragraph fits, and the
  wedge plot threshold holds if the model's lesson uses a slice.
- **B:** thresholds hold for a named sub-family (for example flat only) and
  fail for the rest; only that sub-family ships.
- **C:** the tier 2 tolerance or the cost fails, or the assumptions do not fit
  in one paragraph. The model stays out.

## What stays out whatever the measurements say

Perturbation theory, CMB power spectra, baryon acoustic oscillation templates
beyond quoting a measured scale, anything needing a Boltzmann code, and closed
models. A dataset whose use needs one of these is not part of this gate.

## Budgets

No ceiling raise. No production code: the prototype lives in `spike/cosmo/`
and imports from `js/` read-only; nothing in `js/`, the routes or the budgets
imports from the spike.
