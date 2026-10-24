# Image packs for the first slice

Prompt 189 (Roadmap III, R13, production data). Four real images the
Observatory opens as image observations, each with its rights decision, its
contract and its provenance in this repository. One is quantitative: a single
authentic TESS frame whose pixel contract the archive's documentation completes.
Three are display-only pictures, and say so.

## What is in the box

| Pack | Opens as | Use | What it is |
| --- | --- | --- | --- |
| `tess-hd209458-s56-frame` | `tess-frame` | quantitative | HD 209458, TESS sector 56, one 2-minute cadence (11 by 13 pixels of 21 arcseconds): calibrated flux and its error, electron/s |
| `sdo-hmi-continuum-20240510` | `sdo-hmi-sun` | display-only | the Sun in HMI continuum light, 10 May 2024 (a browse image) |
| `galileo-moon-19921207` | `galileo-moon` | display-only | the Moon from Galileo, 7 December 1992, enhanced colour (PIA00405) |
| `hirise-cerberus-fossae` | `hirise-cerberus-fossae` | display-only | Mars from HiRISE, Cerberus Fossae and a lava flow (ESP_069637_1915) |

A pack is two files. The record, `data-packs/<id>.json` (the manifest, which the
browser never loads) and `js/data/observations/<name>.js` (PACK, the credit,
rights and sidecar contract, and SIDECAR, the size and SHA-256 of the pixels),
and the pixels as base64 planes in `frames/<id>.json`. The frames file is not
JavaScript, so no budget that counts JavaScript counts a picture. The
Observatory fetches it only when the image is opened and
`js/observatory/imagePacks.js` refuses a file that is not the one the module
records (size, SHA-256, format, id and dimensions) before reading one pixel.

Nothing here is installed: the four modules, the loader and the frames are in
no precache tier (`NEVER_PRECACHED` in `tools/build-service-worker.mjs`; the
frames are in no list and are copied by `build.js`). The service worker keeps
each after its first online use. The manifests say `offline: none`.

## Rights, one decision per source

The terms were read on 2026-10-24, before each download, and are quoted in each
manifest's `license.statement`. Only public domain or CC BY content is admitted.
Honest note on order: the decision was made and written into
`tools/data-packs/image-packs.mjs` before the transform ran, but it reached the
repository in the same commit as the pack (8bb9b930), not in an earlier one.

| Source | URL (pinned in the manifest) | Bytes | SHA-256 of the raw file | Terms | Decision |
| --- | --- | --- | --- | --- | --- |
| TESS target pixel file, sector 56, TIC 420814525 (three byte ranges: header 0-25919, row 8016, aperture extension) | `https://stpubdata.s3.amazonaws.com/tess/public/tid/s0056/0000/0004/2081/4525/tess2022244194134-s0056-0000000420814525-0243-s_tp.fits` | 25,920 + 2,888 + 11,520 | `1faeffc2d65d4b82b4367a8093b8083f33b73e9e9cdfa79c5980add3d3a6b11f`, `82c026a7a7cd4440773251c29f719895ebdca87723e1a37ce53c0dadf9abcb15`, `ac1f2429174ad7ea9c3ffafc3e73feffb8a7937ff4c78e6b10c1bb8dd4f70aac` | MAST data-use policy: most data are in the public domain; acknowledge the mission and STScI | admitted, public domain |
| SDO HMI continuum browse image | `https://sdo.gsfc.nasa.gov/assets/img/browse/2024/05/10/20240510_120000_1024_HMIIC.jpg` | 216,427 | `8623c25e7dae624efdabf635823ef602182641548315422dc50b9f24f4f3feb9` | SDO data rules: not copyrighted unless noted; browse products are not for science analysis | admitted, public domain, display-only |
| Galileo Moon, PIA00405 | `https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia00/pia00405/PIA00405.jpg` | 403,335 | `e13ec17cfd0b6e952ebe1cb15a941d6195da0d691122ffe4bb9579d162bcadf4` | NASA Images and Media Usage Guidelines: generally not subject to copyright; credit NASA/JPL/USGS | admitted, public domain, display-only |
| HiRISE ESP_069637_1915 | `https://static.uahirise.org/hipod/ESP_069637_1915.jpg` | 1,904,465 | `0c7f3f4794fa8a7eae4ebf338c90c41cc0d3c8be9c05c4e65235789fe16595ea` | HiRISE usage policy: no copyright restriction, public domain; credit where possible | admitted, public domain, display-only |

The frames files (the transform's output, which the modules' `SIDECAR` pin):

| Frames file | Bytes | SHA-256 |
| --- | --- | --- |
| `frames/galileo-moon-19921207.json` | 328,187 | `0e2a1fe20d1e5435c7bebf1ad43e88b285a8658292bb1a980a9df19dfa7cc4d0` |
| `frames/hirise-cerberus-fossae.json` | 409,764 | `c75c11f765e394216d972ec79486258732dc298a70ecedfb3045f6683e533aa6` |
| `frames/sdo-hmi-continuum-20240510.json` | 338,772 | `683c9c23d608a9e133032d42253075f3dd40bff31a890482d9e7aa6b39df95be` |
| `frames/tess-hd209458-s56-frame.json` | 1,745 | `6c33072c982e8db07bb4ac3c55cfbc648dd622c63a02b5a259b35e8677a904fa` |

The TESS file is read from STScI's public dataset on AWS, which mirrors MAST's
TESS products; the host (`stpubdata.s3.amazonaws.com`) is not literally on the list
of archives Carl named. Carl ruled on it: asked whether to accept the stpubdata AWS
bucket (STScI's public MAST mirror) as the TESS source, he chose "Accept, it is
MAST (Recommended)" = "stpubdata is MAST's own public AWS mirror of TESS products; the rights decision (public domain) and URL, size and SHA-256 are recorded." (Carl, chat 2026-10-24).

### Sources dropped, and why

| Source | Why it was dropped |
| --- | --- |
| SDSS image cutouts, Pan-STARRS cutouts, the MAST API, IRSA, NASA SkyView | each is reached through a query service (a generated cutout or a search API), not a static file; with the permission's limits (a few small requests, respect robots.txt, nothing generated by a server query) none could be fetched, so no authentic multi-star field with a catalogue was obtained |
| HST data by discovery | finding a frame needs the MAST API above |
| SDO AIA and HMI science FITS | an export request, not a file: not permitted by the same limits |
| Synthetic packs (a star field with a catalogue, a Galilean sequence, a parallax series, a variable-star sequence) | never fabricated as authentic; the first would not be authentic and the pack ceilings have 368 B of gzip room, and the last two depend on unmerged PRs (#433, #434) |

## What each contract says, and from what

The TESS pack's pixel contract (`gravitas.image`, `use: quantitative`) is
complete, with every field from the archive's documentation:

| Field | Value and source |
| --- | --- |
| unit | electron/s (the `FLUX` column of the SPOC target pixel file) |
| linearity | corrected, limit 101,010 electron/s: SPOC applies a linearity model (TESS Data Release Notes, Sector 10, DR14, section 3.2); the two models differ by 1 to 2 percent near saturation |
| saturation | 101,010 electron/s, from a full well of about 200,000 electrons over 1.98 s (Fausnaugh et al. 2021, citing Vanderspek et al. 2018) |
| noise | a variance plane, `FLUX_ERR` squared; gain 5.19 e-/adu and read noise 9.5496 e- from the header |
| time | mid-exposure, TDB, BJD-based JD 2459836.3902936; 95.04 s effective exposure |
| world coordinates | TAN, 19.42 arcsec per pixel, from the file's own WCS cards |
| calibration | calibrated and background-subtracted by SPOC (spoc-5.0.96) |

The frame was chosen from the light curve before it was read: the first
out-of-transit cadence with QUALITY 0 within 0.01 d of the middle of the sector.
The one number read before the analysis contract was committed was its peak
pixel (42,971 electron/s, to check it is below saturation) and the cadence's
`SAP_FLUX` (214,537.7 electron/s).

The three display packs carry `use: display-only`, `pixels.unit: display`, and a
history of decode, re-encode, crop, resample (not flux conserving) and flip. A
picture permits marking and refuses photometry and astrometry in the contract's
own words. No pack ships the aperture bits as a mask plane (the photometry
adapter reads a nonzero mask entry as a bad pixel).

## The authentic-frame legs

`tests/fixtures/imagePacks/analysis-contract.json` fixed the analysis, and the
bounds (by reference to the earlier prompts' committed thresholds files, never
restated), in commit 33e2a8c5, before any leg ran. `npm run imagepacks:validate`
runs them against the production modules; `tests/imagePacks.test.js` asserts
every row. The oracle is photutils 2.0.2 with astropy 6.1.7, numpy 2.2.6 and
scipy 1.15.3 (`tools/image-packs-oracle/`, `python -I`, run offline; its inputs
and results are `oracle-inputs.json` and `oracle-results.json`).

| Leg | Result |
| --- | --- |
| `pack.integrity` | pass: the sum of FLUX over the 23 optimal-aperture pixels equals SAP_FLUX of the same cadence to 5.8e-8 (bound 1e-5); peak 42,971 below 101,010; both `permits(photometry)` and `permits(astrometry)` are ok |
| `photometry.e2` (Prompt 180) | pass (all rows in electrons, see below): exact aperture sum, annulus mean and scatter, source variance, and the flux-weighted centroid each equal photutils to the bounds of Prompt 180's `thresholds.json` (b1, b2, b5, b4); net 20,457,316 +/- 4,830 electrons (215,249.5 electron/s over the 95.04 s exposure) is 0.33 percent above SAP_FLUX (bound 10 percent); the instrumental magnitude -13.3324 equals photutils' to 1e-9 |
| `detection.e2` (Prompt 183) | pass: background mesh, smoothed image, one source with the same segmentation pixels, area, moments, peak and flux as photutils; Gaussian FWHM 1.7741 pixels against `fit_fwhm`, relative 3.9e-6 (bound 3e-4). One source found: a 143-pixel frame has one dominant star |
| `injection.g1` (Prompt 184) | the kernel refuses, with the stable code `no-room`: a margin of 3 FWHM from the border cannot be placed in an 11 by 13 frame. (Before the rate-unit fix below it refused with `unit`, because the frame was measured in electron/s.) A refusal is the result the contract names; no completeness was measured |
| `import.hostilePng` (Prompt 188) | 14 of 17 variants as the contract says. THREE differ, each recorded in `failed-legs.json` with its cause, none moved: (1) a PNG with bytes after IEND, which the contract said is read and Prompt 188's structural reader refuses (`png-malformed`); (2) and (3) the IDAT that inflates past the declared size and the IDAT of zeros that inflates to 64 MiB, which the contract said are refused and Chromium's decoder READS as the intact picture (it stops after the image's rows), in time and holding nothing. Pixel-stage variants are judged in the page by `e2e/imagePacks.spec.js`; Carl rules (D-R10-65) |
| `astrometry.b4.pack` (Prompt 181, contract part 2) | pass: the pack's WCS read by `fromHeader` against astropy.wcs `all_pix2world` on all 143 pixels, largest separation 1.1e-13 degree (bound 1e-9 degree, read from 181's `b4.oracleAuthenticHeader`) |
| `astrometry.e1.single` (181) | pass: the archive's own reference position of the target (CRVAL) lands 0.167 pixel (3.25 arcseconds) from the star's measured centroid (bound 0.5 pixel, stated in part 2 with its derivation). CRVAL is not an independent catalogue, so this is the WCS against the star's light, not a fit |
| `astrometry.b5.fit` (181) | NOT RUN: a fit needs three or more catalogue stars matched to measured centroids; the frame has one source above the detection threshold and the repository holds no catalogue of its neighbours (request R2) |
| `overlay.b5.pack` (Prompt 182) | pass: the 37 bright-star-pack stars within 25 degrees of the field centre go through `pixelOf` to 1.1e-11 pixel of astropy.wcs `all_world2pix` (bound 1e-6 pixel, read from 182's `b4.oracleSkyMap`); the list of pack stars in the frame is empty and equals astropy's (the target is V 7.6, the pack stops at V 4.5). An empty list is the result; it is not a positive catalogue match |
| `overlay.e1.pair` (182) | NOT RUN: an authentic calibrated pair with a moving object needs two authentic frames of one field |
| `framepipeline.g1.refusal` (Prompt 185) | pass: the frame as a sequence of one is refused with `too-few-frames` (used 1, need 5), with the measured star as the target and every other parameter at its default (the first run refused with `bad-parameter` `target`, because the harness gave no target: a harness defect, fixed; no bound moved) |
| `framepipeline.g1.cosmic` (185) | pass: the one-frame stage (`reduceOne`, electrons) flags none of the 23 optimal-aperture pixels as cosmic rays (0 of 143 pixels flagged in all) |
| `framepipeline.g1.sequence` (185) | NOT RUN: five authentic frames of one field are the least it accepts, and it needs three comparison candidates and three matched stars to register; a sequence of this field's own cadences would be refused for want of comparison stars (request R1) |
| `series.b6.refusal` (Prompt 186) | pass: the one authentic epoch (the centroid carried to the sky, at the frame's TDB time) is refused by `fitMotion` with `too-few-epochs` (n 1, min 2) |
| `series.b6.series` (186) | NOT RUN: an authentic series needs two epochs for a motion and eight over nearly a year for a parallax; the packs hold one (request R3) |
| calibration (the detector lab, Prompt 179 onward) | NOT RUN: the TESS frame is calibrated by the archive and no bias, dark or flat frame of it is in the packs, so there is nothing authentic for the lab's `calibrate` to reduce (D-CALIB-01 stands) |

These rows are part 2 of the contract, `tests/fixtures/imagePacks/analysis-contract-2.json`, committed (b277b1a2) after Prompts 185 and 186 reached v3 and before any of them ran; the oracle for the sky rows is astropy.wcs, pinned in `oracle-results.json` under `astrometry`, run on the pack's own header values and on `sky/bright-stars.json` (SHA-256 recorded). The four part 1 placeholders for 181, 182, 185 and 186 remain in the first contract as committed and are marked superseded in the output.

### Authentic data for the legs that were NOT RUN (Carl, chat 2026-10-24: "Yes go ahead with the four requests, R1 to R4")

The four requests below were granted under Carl's earlier ruling (rights-checked public archive files only; the STScI mirror accepted as MAST). The data is a set of TEST FIXTURES in `tests/fixtures/imagePacks/authentic/`, not an app pack: a pack's manifest counts against the data budget, which has about 781 B of gzip room, and the idle tier has 18 B. Nothing is added to the precache, `tools/data-budget.json` is not edited, no closure file changes. `provenance.json` records each source's URL, byte ranges, size, SHA-256, the terms quoted on 2026-10-24 and the decision.

| Request | Data | Terms and decision |
| --- | --- | --- |
| R1 (185), R2 (181, 182) | 84 consecutive TESS 200 s calibrated full-frame images (ffic, sector 56, camera 1 CCD 2, 04:15 to 08:52 UTC on 2022-09-04, the transit of HD 209458 b), an 81 by 81 cutout of each, 2,204,496 B committed (`ffi-cutout-s56-1-2.f32`, SHA-256 6b2111ad...); 59.3 MB of byte ranges were read, nothing else kept | MAST data use policy: public domain, acknowledge MAST and TESS; committed |
| R2 (181, 182) | Gaia DR3 sources of the field through CDS VizieR TAP (I/355/gaiadr3, G < 17, 541 rows, 75,165 B, not committed); the 222 rows with G 16 or brighter in the cutout are committed | ESA Gaia licence CC BY-NC 3.0 IGO: redistribution allowed with credit, non-commercially. Committed flagged non-commercial; the NC owner question in `OWNER_ACTIONS.md` now covers it |
| R3 (186) | the Hipparcos new reduction row of HD 209458 (VizieR I/311/hip2, 278 B) | ESA terms, CC BY-NC 3.0 IGO; committed flagged non-commercial |
| R4 (182) | JPL small-body identification (`sb_ident`) answers for the field at three times; SkyBoT (IMCCE) answered 403 and 502 and was not retried | the API page carries no licence text (a US Government product), so the answers are NOT in the repository (Carl, chat 2026-10-24: "Go with your recommendation on each"); `provenance.json` keeps the URL pattern, the retrieval date, the SHA-256 and the negative-search note |

The frames carry no sky WCS (only a physical one). The anchor is the pack's own WCS shifted by the offset found by cross-correlating the pack frame with the stripe (0.998), used only to match stars and never as a solution. Contract parts 3 to 6 (`analysis-contract-3.json` to `-6.json`) were each committed before the legs they govern ran; parts 4 to 6 are variants that were committed after the earlier part's result had been read, each saying what was read first, and none replaces the legs before it. `tools/image-packs-authentic.mjs` runs them, `tools/image-packs-oracle/oracle-authentic.py` is the offline oracle (astropy `fit_wcs_from_points`, `apply_space_motion`, `all_world2pix`, photutils exact apertures with the sigma-clipped annulus, `SkyCoord.separation`; `python -I`), and no bound was moved.

| Leg | Committed rule (part 3) | Variant v2 (part 4) | Variant v3 (part 5) | Variant v4 (part 6) |
| --- | --- | --- | --- | --- |
| `astrometry.b5.fit` (181) | FAIL: 1 star matched | FAIL: 3 matched | pass: 17 stars, 1.8e-4 px from astropy (bound 0.01) | |
| `astrometry.e1.frame` (181) | FAIL: no fit | FAIL | pass: rms 0.038 px (0.2), consistent | |
| `overlay.b5.gaia` (182) | FAIL: no solution | FAIL | pass: 214 Gaia stars listed, 2.1e-11 px from astropy (1e-5) | |
| `framepipeline.g1.complete` (185) | FAIL: refused `no-marks` | FAIL: 2 comparison stars (3 asked) | FAIL: 2 of 16 (14 flagged unstable) | pass: 5 named |
| `framepipeline.g1.oracle` (185) | FAIL: no light curve | pass: 1.2e-14 | FAIL: 7.4e-4 in one of 252 star-frames (bound 1e-9) | pass: 8.6e-16 |
| `framepipeline.g1.transit` (185) | FAIL: no light curve | FAIL: depth 1.705 percent against SPOC's 1.566 | pass: 1.578 percent, 0.37 min | pass: 1.511 percent, 0.39 min (bound: depth 0.001, centre 8 min) |
| `framepipeline.g1.noise` (185) | FAIL: no light curve | FAIL: ratio 4.4 | pass: 1.07 | pass: 1.94 (bound 0.5 to 2) |
| `series.b6.motion` (186) | pass: Hipparcos 1991.25 and Gaia 2016.0 give the proper motion of HD 209458 within 0.040 mas/yr of Gaia's, the separation within 1.1e-10 arcsec of astropy's, with the label | | | |
| `overlay.e1.pair` (182) | NOT RUN: the JPL search (answers not kept, only their SHA-256 and the result in `provenance.json`) found no object in the field and SkyBoT was unreachable; nothing was simulated | | | |
| `series.b6.series` (186) | NOT RUN: a parallax needs eight positions over a year; Gaia's epoch astrometry is one-dimensional along-scan and is not a set of 2-D positions | | | |
| `calibration.authentic` | NOT RUN: the images are SPOC-calibrated, no bias, dark or flat is public with them | | | |

The failures are recorded in `failed-legs.json` with their causes, and `tests/imagePacks.test.js` asserts each still fails. What they say is about the modules on this field, not about the data:

- `detectIn` at 4 sigma on a 21-arcsecond pixel field segments each bright star with its wings and neighbours (areas to 239 pixels), so detected centroids are blends and the `crowded` flag removes most of them. The matching rule that uses the detector's own centroids keeps one star. Real reductions place the catalogue stars and measure there; v3 does that through `photometry.measure` with `recentre`, and the fit, the frame check and the overlay then pass.
- Prompt 185's stability test (a chi-square against a constant at alpha 0.001) assumes white noise. Real 200 s photometry of a crowded field has correlated noise, so 14 of 16 candidates are flagged. The module's own override (naming the comparison stars) is v4; its noise ratio of 1.94 is inside the bound by 0.06.
- The v3 oracle failure is the annulus clip. Prompt 180's clip (`js/measure/photometry.js`) is monotone: a pixel once cut stays out. astropy's `sigma_clip` re-tests every pixel against the refitted bounds at each round, so a pixel at 3.00 sigma can come back, the rounds alternate (152, 153, 152, 153 of 199) and `maxiters=4` stops on 153. One pixel changes the sky by 9 electrons per pixel and that one star-frame by 7.4e-4; the other 251 agree to 1e-15. The two MAD constants (1.4826 and astropy's) give the same pixels here, so the constant, which differs in the detector kernel, is not the cause. Either Prompt 180's clip changes (a change to committed code) or the oracle is the monotone one; Carl rules (D-R10-68).

The Gaia and Hipparcos files are non-commercial, as the owner question already covers. Carl ruled on this section (chat 2026-10-24, "Go with your recommendation on each"): the 15 failures stay failing and labelled, the clip finding stays a documented finding, the Gaia and Hipparcos fixtures stay (flagged non-commercial, test-only), and the JPL answers left the repository. No student-facing string was added in this part, so there is no new Spanish; the earlier Spanish of the packs stays unread by a fluent reader.

### Requests to Carl (all four were granted on 2026-10-24; the results are in the section above)

The legs that cannot run need authentic files this PR does not hold. Each is a rights-checked public archive file; none was fetched until Carl said so (2026-10-24).

- R1 (`framepipeline.g1.sequence`): a frame sequence needs a field with at least five stars bright enough to measure, observed at five or more epochs. The cadences of the same TPF (`https://stpubdata.s3.amazonaws.com/tess/public/tid/s0056/0000/0004/2081/4525/tess2022244194134-s0056-0000000420814525-0243-s_tp.fits`, public domain as MAST data) would add only more frames of the same field, which has one dominant star, so the pipeline would still refuse it. What would run it is a larger field: a TESS full-frame calibrated image (MAST `ffic`, public domain; I have not measured the size, expect tens of megabytes each, five or more needed) or a TESScut cube of about 30 by 30 pixels over a few hundred cadences (a MAST service answer, a few megabytes; I have not checked that its output may be redistributed unchanged). Which one, and which field, is Carl's choice.
- R2 (`astrometry.b5.fit`, `overlay.b5`): three or more catalogue stars with positions in the frame's field, from the Gaia DR3 catalogue through CDS VizieR (a cone of 0.1 degree about 330.795, +18.884, a few kilobytes; ESA's Gaia terms to be read before the download), plus a frame where three of them are measurable (the frame of R1 would do; this 11 by 13 frame has one star above four sigma).
- R3 (`series.b6.series`): one authentic astrometric series: Gaia DR3 epoch astrometry for one source that has it, from ESA's Gaia archive (CC BY-SA 3.0 IGO to be confirmed), or published positions of one nearby star at dated epochs from a CDS table. I have not verified that a given source has either; Carl or a later session names the source first.
- R4 (`overlay.e1.pair`): two calibrated authentic frames of one field with a known moving object, such as a minor planet with an ephemeris: two TESS full-frame images of one sector in which one is known to pass would be enough; the object and the pair need choosing, and this PR has none.

Carl ruled on the three differing variants: asked how #436 should proceed on those three legs, he chose "Leave failing, labelled (Recommended)" = "Keep the committed contract, record the three as known failed legs with their causes (tests pin them), take #436 out of draft and merge once the other items are settled; no threshold moved." (Carl, chat 2026-10-24). The three stay recorded in `failed-legs.json`, pinned by tests; no bound moved.

## A defect the frame found, and fixed

The quantitative frame is in a rate (`electron/s`). On the variance route
`js/measure/photometry.js` `adapt()` kept that unit while `measure()` divides the
net by the exposure for the magnitude, and the panel says "electrons": a student
would read net light 215,100 "electrons" and magnitude -8.387, where the rate
magnitude is -13.33. `adapt()` now converts a rate to electrons as the CCD route
does (pixels times the exposure, variance times its square). No committed
threshold or result of Prompt 180 moved; the legs above compare Gravitas in
electrons with the oracle's rate times the exposure, exactly. See `PHOTOMETRY.md`
and `tests/imagePacks.test.js`. #433 and #434 have since landed in v3, and the
legs of Prompts 181, 182, 185 and 186 that this one frame can run are in the
table above (contract part 2).

## Budgets

The four manifests are the whole of the data plane's growth: 321,298 of 325,632
raw bytes and 101,008 of 101,376 gzip bytes in `data-budget.json` (left
untouched). The synthetic packs the roadmap names do not fit those ceilings; a
decision to raise `packGzipBytes` is Carl's.
