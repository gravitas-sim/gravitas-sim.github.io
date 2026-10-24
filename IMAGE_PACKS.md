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
| astrometry (Prompt 181), overlay (182) | NOT RUN: no authentic frame with three or more catalogued stars and a redistributable catalogue was obtained; the TESS frame holds one catalogued star |
| frame pipeline (185), series (186) | NOT RUN: their modules are in PRs #433 and #434, not in v3; the pack holds one cadence |

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
and `tests/imagePacks.test.js`. Prompts 185 and 186's authentic legs stay NOT RUN
until #433 and #434 land in v3.

## Budgets

The four manifests are the whole of the data plane's growth: 321,298 of 325,632
raw bytes and 101,008 of 101,376 gzip bytes in `data-budget.json` (left
untouched). The synthetic packs the roadmap names do not fit those ceilings; a
decision to raise `packGzipBytes` is Carl's.
