# One spectral energy distribution: the contract and the gate (Prompt 245, Part A)

Status: kernel, contract and gate only (invisible + documentation). No catalogue was retrieved, no catalogue terms page
was saved and read in this session, and nothing was fetched, so every catalogue row is rights basis C and nothing of it
ships; the labelled synthetic star is the only path that exists. The kernel and its table are in `SED.md`.

## What was committed first, and when

| Commit | What |
|---|---|
| `38d074ed` | `tests/fixtures/sed/thresholds.json`: the contract, the legs and their bounds, the verdict function and the consumers rule, before `js/kernels/sed/`, the validator, the oracle or any result existed |
| `5a1f66af` | AM1 and AM2, **before any validator run** and before any oracle output: AM1 hands the oracle the kernel's own pivot wavelengths for the chord leg B4 (the two quadratures differ in the pivot by up to 6.5e-7, found by a scratch comparison run only to set that note), AM2 moves B2's bound from 1e-6 to 5e-6 and adds a pivot bound of 2e-6 from the same estimate |
| this PR | AM3, **after the first partial run of legs A and B**: A2's box was built from two nodes (the radiation kernel's pivot integrates on a band's own nodes), A2's committed list of exponents wrongly named -2 (for f_nu proportional to lambda^2 the pivot is by definition where f_nu equals the mean, so the difference is zero by construction), and the oracle converted AB through astropy's 48.60-mag definition for B3 and B4 where the committed rule says 3631 Jy. Kernel code and every bound untouched by AM3; B1 keeps astropy's definition on purpose |

The first partial run printed A1 to A5 and B1 to B4 with the oracle's AB route; B3 and B4 failed on that route and passed
after AM3(b); B1 and B2 failed then and fail now. AM2's estimate of the quadrature difference was wrong for the pivot
(it assumed the kernel's pivot was computed on a refined band; it is computed on the band's own nodes, 4.5e-5 off), and
the bound was left as committed.

## The contract (as committed)

Point: `{id, kind, band | lambdaNm, convention, value, sigma, epoch}`; `kind` is `band-integrated` (the photon-weighted
mean f_nu through a band of the pack) or `monochromatic`; `convention` is `ab-mag`, `vega-mag` or a registry flux unit;
a band-integrated point's wavelength is its pivot; every refusal has a code. The fit is in log flux with the scale
profiled out, the temperature interval by profile of chi-square, nonsimultaneity widens a flagged point's log-flux
sigma in quadrature by a stated allowance with no default, the model is labelled extrapolated outside the points'
range, the integrated SED returns data only unless tails are requested and labels them, and a blackbody with two points
or an open profile is `not-constrained`. The full text is the `contract`, `rules` and `checks` of the thresholds file.

## The verdict function (committed in the thresholds)

- Kernel **A**: every leg of the conversion, fit and luminosity groups passes. **B**: every conversion leg passes and not
  every other leg does (the conversions and the band-integrated versus monochromatic distinction stand, and a claim that
  depends on a failed group does not). **C**: a conversion leg fails (nothing built on the kernel ships).
- Conversion legs A1, A2, B1, B2, D2, D6. Fit legs A4, B3, C1, C3, D1, D3, D4. Luminosity legs A3, A5, B4, C2, D5.
- Product: ESTABLISHED only when E1 passes and every row it uses is basis A or B.

## What was measured (Node 22.23.4; oracle Python 3.9.22, numpy 1.26.4, scipy 1.13.1, astropy 6.0.1)

24 legs: 14 pass, 4 FAIL left failing, 2 reported, 4 NOT RUN (`SED.md` has the table; `tests/fixtures/sed/results.json`).

| Group | Legs | Status |
|---|---|---|
| Conversion | A1 pass, A2 pass, **B1 FAIL**, **B2 FAIL**, D2 pass, D6 pass | not claimable |
| Fit | A4, B3, C1, C3, D1, D4 pass; **D3 FAIL** | not claimable |
| Luminosity | A3, A5, B4, D5 pass; **C2 FAIL** | not claimable |

**Kernel verdict: C by the committed function**, from B1 and B2. Read it as stated, not as a physics failure: B1 fails
by 6.0e-5 of the flux because the tree's AB is 3631 Jy and astropy's is 48.60 mag (3630.78 Jy), while the f_lambda to f_nu
routes agree to 2e-16; B2 fails by 1.8e-5 (bound 5e-6) on the mean and 4.5e-5 (bound 2e-6) on the pivot because the
radiation kernel integrates a band by a 1 nm trapezoid and the pivot on unrefined nodes. Everything the kernel does on
top of those numbers passes against an independent fit (B3: 8.5e-7 in T) and an independent chord and tail
integration (B4: 7e-16, 5e-15), and the nonsimultaneity rule is what it needs to be (C3 covers 0.68 and 0.95; without
the rule 0.28 and 0.56).

The three other failures are real and are not tuned: **C2** (the integrated SED is low by about 2 percent for the
committed stars from the chords and the band points at their pivots, and its interval is 0.7 to 0.9 percent, so it
covers 3 and 22 percent), **D3** (four Rayleigh-Jeans points from 12 to 100 micron at 5 percent closed the interval in 28
percent of realisations of a 20000 K star; the committed 98 percent refusal share was my estimate, not a derivation).

## The candidate catalogue products: NOT RUN

| Id | Product | Rights basis here | Why |
|---|---|---|---|
| R1 | one star's 2MASS point-source row (J H Ks), NASA/IPAC Infrared Science Archive | C, not shipped | no terms page saved and read |
| R2 | the same star's AllWISE row (W1 to W4) | C, not shipped | likewise; the pack has no WISE response curves either |
| R3 | the same star's GALEX FUV and NUV row, MAST | C, not shipped | likewise; no GALEX response curves in the pack |
| R4 | the same star's SDSS DR18 ugriz row | C, not shipped | the SDSS spectra pack records a public-domain statement read on 2026-10-01 for that pack's products; no saved copy was read for this product |
| R5 | a published distance and effective temperature of the same star, as an independent comparison only | C, not shipped | not retrieved; a Gaia distance would fall under the recorded D-GAIA-01 mechanism (CC BY-NC 3.0 IGO, labelled), which is not re-decided here |

## The consumers rule (committed in the thresholds)

Synthetic SED view and a survey-depth investigation on synthetic stars: kernel A, or B with the temperature claimable.
**Not met (kernel C).** A pack, a real star's SED view or any sentence about a real star's temperature or luminosity:
product ESTABLISHED. **Not met.** A bolometric luminosity a student sees: the luminosity claim claimable. **Not met.** An
upper-depth investigation on conventions and nonsimultaneity: the conversion legs pass. **Not met (B1, B2).** Whatever
the verdict, nothing visible is built before Carl confirms.

## Rights decisions, per source and per redistribution form (7.5, rule 4)

Recorded in `DECISION_REGISTER.md` as D-R10-245-02 (DELEGATED). Carl's delegation names public-domain NASA sources as the
preferred catalogue sources and allows basis A or B only for a source whose terms were read from a saved copy; nothing was
retrieved or saved here, so no source has a basis A or B, and the existing SDSS spectra pack (public-domain statement
recorded in its manifest) is used only as it already ships. The fallback is the labelled synthetic star; the affected
lessons are the survey, majors and upper investigations of the SED, none built.

## Files requested from Carl

Put each under `tests/fixtures/sed/authentic/` and add an entry to `SOURCES.json` there for every file: `{file, source
URL, the product as the service names it, retrieval date, the terms page saved with it, rights basis}`. Nothing is fetched
by a session; the legs read what arrives.

1. **The object: the SDSS G star of the pack.** SDSS DR18 specObjID 3521863916999254016, plate 3128, MJD 54776, fibre 178,
   RA 340.01167, Dec +13.415657 (J2000, from the pack's records), spectral class G2 by the SDSS pipeline. Its spectrum is
   already a pack, so one star then has a spectrum and its catalogue photometry on the same workspace. If you prefer
   another star say so; the criteria are a catalogue magnitude in at least five of the services below, unsaturated.
2. **Photometry rows for it, as the services print them, one cone search of radius 3 arcsec each, saved as the service
   returns them (CSV or VOTable):** (a) SDSS DR18 `PhotoObj` or `Star` view: `psfMag_u,g,r,i,z`, their errors, `mjd`, the
   `flags` and `clean` columns (SkyServer, the same service the NGC 2420 pack used); (b) the 2MASS Point Source Catalog
   via IRSA: `j_m, j_msigcom, h_m, h_msigcom, k_m, k_msigcom`, `ph_qual`, `rd_flg`, `cc_flg`, `gal_contam`, `jdate`; (c)
   AllWISE Source Catalog via IRSA: `w1mpro..w4mpro`, `w1sigmpro..w4sigmpro`, `ph_qual`, `cc_flags`, `ext_flg`, `w1sat..w4sat`,
   `mjd`; (d) GALEX (MAST): `FUVmag, NUVmag` and errors and the observation time, if the star is in it (record
   absence if it is not). Upper limits and saturated values are kept and flagged, not dropped. The column names are as I remember them and are
   only a pointer: the service's own documentation decides them.
3. **For each service, its page that states the magnitude system and its zero point or reference wavelength** (AB or Vega,
   the zero-magnitude flux density in Jy or the isophotal wavelength), and **the band's relative spectral response** as
   the service publishes it (for WISE and GALEX the pack holds none, so without it those points can only be monochromatic
   at the service's stated reference wavelength). Save the pages; the gate reads the saved copy.
4. **The terms pages, saved with the retrieval date:** the data-use and acknowledgement policy of each service (SkyServer
   or SDSS data policy, IRSA's, MAST's) and, for 2MASS and WISE, the mission's own citation requirement.
5. **`star.json`**, for E1: the points exactly as the files give them, `{"points": [ {id, kind, band | lambdaNm, convention,
   value, sigma, epoch, flags} ], "referenceEpoch": <the SDSS imaging epoch>, "published": {"temperature": {"value", "sigma"}, "distancePc": {"value", "sigma"}, "source": {...}}}`;
   the published values only from a source whose terms were read (item 4) and **not used to choose which points are in**.
6. **`star-sdss-row.json`**, for E3: the SDSS ugriz row alone, as printed.
7. **`tool-fit.json`**, for B5 (optional, the roadmap's leg (b)): the output of one independent SED-fitting tool that you
   ran yourself on the points of `star.json`: `{"tool": {"name", "version", "command", "citation"}, "points": [...],
   "temperature": {"value", "sigma"}}`. The kernel must agree within three combined sigma.

## Follow-up (2026-11-05): the new legs and the verdict beside the first

The follow-up thresholds (`tests/fixtures/sed/followup/thresholds.json`, 0af41d8f) were committed before any follow-up code
or run; no first-gate bound moved and D3 has no new leg (Carl, `DECISIONS_2026-11-05.md`). Results: B1b **FAIL** (one
sub-check of the zero-point agreement, 1.2e-12 against a 1e-12 bound on a 6.6e-5 quantity; the conversions themselves agree to
5.6e-16 and 1.9e-16), B2b pass, C2b pass (coverage 0.587 and 0.947), E1b reported, the authentic row NOT RUN.

| Group | Legs | Status |
|---|---|---|
| Conversion | A1, A2, D2, D6 pass; B2b pass; **B1b FAIL** | not claimable |
| Fit | A4, B3, C1, C3, D1, D4 pass; **D3 FAIL** | not claimable |
| Luminosity | A3, A5, B4, C2b, D5 pass | claimable only with the fit group (the committed rule) |

**Follow-up kernel verdict: C**, from B1b. If the zero-point agreement sub-check is judged absolutely the verdict becomes B,
and D3 alone then holds the fit and luminosity groups. The first gate's verdict (C) is unchanged. The consumers rule is
unchanged: nothing visible is built before Carl confirms.

## Questions for Carl

1. **The verdict.** B1 and B2 fail on conventions and quadrature, not on physics, and the committed function makes the
   kernel C. Reset them (B1 against 3631 Jy with the 48.60 difference reported, B2 at 5e-5 on the mean and the pivot) or
   hold C; I moved nothing. If you reset them the verdict becomes B (the fit and luminosity groups still have D3 and C2).
2. **C2.** The luminosity interval should carry the chords' bias. A model-interpolated integral (the fitted blackbody between
   the points, scaled to them) or a stated systematic would fix it, as a new decision with its own leg.
3. **D3.** Reset the 98 percent bound to a measured share, or choose a star and points the Rayleigh-Jeans side really cannot
   constrain (a hotter star or longer wavelengths).
4. **E1's criterion.** As committed, E1 passes only if the blackbody colour temperature is within three combined sigma of a
   published temperature. E2 shows a real G star's colour temperature (7144 K) is far from its pipeline effective
   temperature (5625 K), so E1 would fail for a physical reason. A reported leg plus the adequacy flag would be the honest
   contract; I did not change it.
5. **The files above** (the star, the services, the saved pages), and a go-ahead for a labelled synthetic SED view, which
   the consumers rule does not yet permit.
6. **Follow-up: B1b's third sub-check.** It compares two routes to a 6.6e-5 quantity at 1e-12 relative, which is below the
   arithmetic of double precision (1.2e-12 measured). It stays failing. Judging that sub-check by the absolute difference in
   magnitude (1e-15) would pass it and make the follow-up verdict B; I did not move it.

<!-- Listed in DOCUMENTS.md. -->
