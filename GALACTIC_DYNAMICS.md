# Galactic dynamics with Gaia (Roadmap II Prompt 92)

What is built, what is measured, and what is not yet. Status: **built**. The kernel, the three data
packs and their tests, the three investigations, the authentic Milky Way option in The Missing Mass and
the Observatory's proper-motion and Galactic-projection plots landed in #245 and #246 (see "Not built").

## Rights (the gate)

ESA's Gaia data licence page (https://www.cosmos.esa.int/web/gaia-users/license, read 2026-10-10): "Gaia
data are distributed under the CC BY-NC 3.0 IGO license." That permits copying, redistribution and
adaptation, which includes a compact derived subset, with attribution and not for commercial purposes. The
gate is passed. The two Gaia packs carry `license.status: cc-by-nc-3.0-igo`, `license.nonCommercial: true`,
the credit "ESA/Gaia/DPAC" and the Gaia DR3 citations; they are separate packs so no other data is covered;
they must not be bundled into a commercial redistribution. D-GAIA-01 (DELEGATED) records that this extends
D-RAD-01, which Carl limited to the passbands pack, and is his to confirm or reverse. The existing Gaia
passbands pack's status is unchanged.

## The packs (`DATA_PACKS.md` lists them)

| Pack | Rows | What | Licence |
|---|---|---|---|
| `gaia-dr3-solar-neighbourhood` | 1,570 | Gaia DR3 stars with RUWE < 1.4, a radial velocity and parallax/error > 10: 540 within 100 pc and 1,030 from 100 pc to 1 kpc, random subsets chosen by `random_index` | CC BY-NC 3.0 IGO |
| `gaia-dr3-ngc2420` | 993 | Gaia DR3 stars with G < 17.5 and RUWE < 1.4 within 14.14 arcmin of the SDSS packs' center | CC BY-NC 3.0 IGO |
| `milky-way-rotation-curve` | 151 | Bhattacharjee, Chaudhury and Kundu 2014 Table 2: three sets of (R0, V0), cited by region (D-GAIA-02) | published table, credited |

Limits the manifests state: no parallax zero-point correction (about -0.017 mas); Gaia radial velocities
exist only for bright stars (G_RVS below about 14), so the sample is not volume-complete; positions are
rounded to 22 and 14 arcsec in the solar sample (good for Galactic coordinates to 0.01 degree, not for a
cross-match); the near stratum is over-sampled on purpose.

## The kernel (`js/kernels/galactic/`, pure)

| Module | What |
|---|---|
| `coords.js` | ICRS to Galactic (the Hipparcos/Gaia matrix), proper motions in l and b, space velocity U V W, Hammer-Aitoff projection |
| `motion.js` | solar motion and apex, velocity dispersions with errors, asymmetric-drift (Stromberg) LSR correction and its extrapolation fit, Oort constants A and B from proper motions |
| `rotation.js` | bulge + disk + halo rotation curve (js/darkMatter.js's model, reused), chi-square, deterministic Nelder-Mead fit with physical disk bounds |
| `membership.js` | two-component mixture over proper motion and parallax; membership is a probability |

## Measured against published values (tests/galacticKernel.test.js, 21 tests)

- l and b of eight Gaia archive positions: agree to 1e-6 degree.
- The Galactic pole and centre, and Sgr A* (Reid and Brunthaler 2004): l = 359.9442, b = -0.0462, proper
  motion (-6.376, -0.200) against their (-6.379, -0.202) mas/yr.
- The Sun's U and W from stars within 100 pc: U = 10.5, W = 9.1 km/s against Schonrich et al. 2010's 11.1 and
  7.25 (both within the 3 km/s the pack check allows; W is 1.9 km/s above the published value, and the
  tolerance was fixed before the number was seen, not tuned to it).
- Oort constants from all 1,570 stars, weighted by 1/parallax^2 and fitted with the factor cos b (the velocity
  along l of a rotating disk is d cos b (A cos 2l + B), d cos b the distance within the plane): A = 14.5 +/- 2.6,
  B = -15.2 +/- 1.8 km/s/kpc, a circular speed (A - B) x 8.3 kpc of 247 +/- 26 km/s. Against Bovy 2017's 15.3 and
  -11.9, A is 0.3 and B 1.8 of its errors away; the sample does not recover B inside its interval and is not
  claimed to (see the correction below). An unweighted fit fails (A = -1.9 +/- 13.2, B = -7.9 +/- 9.3), because
  the nearest stars carry the largest scatter in proper-motion units; the kernel defaults to the weighted fit
  and says why.
  Correction (found in Prompt 235, `KINEMATICS_GATE.md`, which recorded the defect and left the kernel and the
  lesson unchanged; corrected by the change that followed, D-R10-235-05): the fit had been the in-plane form and
  left out cos b, so its A and B were low in magnitude by about the sample's mean cos b (0.85; 15 percent for a
  noise-free disk, A 12.6 and B -10.5 for a disk of 14.75 and -12.75). On these stars the planar form read
  A = 13.5 +/- 2.4 and B = -13.7 +/- 1.7 and a speed of 226 km/s: A 7, B 10 and the speed 8 percent low. The
  kernel keeps that form as the option `planar: true`, only to show the difference. The gate also found that
  this sample cannot recover the circular-orbit constants within its own interval, because the asymmetric
  drift of its older stars shifts A by about 2 km/s/kpc (a synthetic diagnostic, not a leg); the constants are
  those of the sample's own mean streaming. The independent check is `tools/oort-oracle/oracle.py` (numpy
  lstsq on astropy proper motions), pinned in `tests/fixtures/oort-cosb/oracle-results.json`: the kernel
  agrees to 1e-5 km/s/kpc, absolute.
- The solar V relative to the sample is 21.9 km/s; after the Stromberg lag (sigma_U^2 / 80 = 18.1) the LSR
  value is 3.8 km/s, the old Dehnen and Binney 1998 value (5.2), not Schonrich et al. 2010's 12.2, which
  needs the metallicity-gradient argument. The drift fit across colour bins gives 12.3 +/- 6.7: too noisy to
  choose between them, and the kernel does not.
- Rotation curve, set (8.3, 244), r from 2 to 25 kpc, errors floored at 3 km/s: with a halo reduced
  chi-square 4.8; without one, with the disk held below 8e10 solar masses, 50. Without bounds a disk
  alone fits as well as a halo, which is why the bounds are in `FREE`.

## Not built (honest scope)

Nothing from the original list. The three investigations (The Sun's motion; The rotating disk; Cluster
membership by motion) with their bilingual lessons, depth variants, instructor materials, widgets and e2e,
the authentic Milky Way option in The Missing Mass (a depth step), and the Observatory's proper-motion
vector plots and Galactic-coordinate projections (`js/observatory/skyPanel.js`) landed in #246. The
synthetic NGC 3198 curve stays in The Missing Mass, labelled.

<!-- Listed in DOCUMENTS.md. -->
