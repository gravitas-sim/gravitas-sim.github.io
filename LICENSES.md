# Licensing

Gravitas is two kinds of work in one repository, and they carry two licenses.
The software is MIT. The original teaching material — the investigations, the
instructor guides, the manual, the documentation and the original figures — is
CC BY 4.0. Third-party material keeps whatever license it arrived with.

This file says which is which. If a file is not named here, the rule at the top
of its section applies.

---

## MIT — the software

Copyright © 2025 Carl Ziegler. Full text in [`LICENSE`](LICENSE).

Everything executable, and everything that exists to make it run:

| | |
| --- | --- |
| `js/**` | the application, except the content modules named under CC BY below |
| `tools/**` | generators, checkers, the release gate |
| `tests/**`, `e2e/**` | the test suites |
| `css/**` | stylesheets |
| `build.js`, `sw.js`, `sw-manifest.js` | build and service worker |
| `*.config.js`, `package.json` | configuration |
| the markup of `index.html` and the standalone pages | the structure, not the prose |

## CC BY 4.0 — the original teaching material

Copyright © 2025 Carl Ziegler, licensed under
[Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/).
See [`LICENSE-CC-BY-4.0.md`](LICENSE-CC-BY-4.0.md) for the grant and how to
attribute it.

You may use, adapt and redistribute any of this — in a course pack, a lab
manual, a translation, another piece of software — for any purpose including
commercially, provided you give credit.

| | |
| --- | --- |
| `js/data/investigations/**` | every investigation, English and Spanish, and their manifests |
| `js/data/instructorContent.js` | instructor guides, expectations, rubrics and answer keys |
| `js/data/courses/**` | the courses Gravitas ships |
| `js/data/teaching.js`, `js/data/activities.js`, `js/data/activityTeaching.js` | the teaching page and the classroom activities |
| `js/data/welcome.js`, `js/data/scenarioInfo.js`, `js/data/scenarioTags.js`, `js/data/objectNames.js` | scenario descriptions and catalog prose |
| `js/i18n/**` | every user-facing string, in both languages |
| `manual/**`, `Gravitas_User_Manual.pdf` | the user manual |
| `instructors/materials.enc.json` | the instructor bundle, once decrypted |
| the prose of `index.html`, `model/`, `teaching/`, `instructors/`, `validation/` | the words on the standalone pages |
| `images/scenarios/**`, `images/investigations/**` | scenario thumbnails and lesson cards, all generated from this project's own scenes |
| `social-card.png`, `favicon.png`, `favicon.ico` | original artwork |
| every `*.md` in the repository root and in `docs/` | the documentation, including this file |
| `notebooks/**` | the analysis notebooks |

The prose and the markup of the same HTML file are separately licensed. That is
less awkward than it sounds: take the words and CC BY applies, take the markup
or the scripts and MIT does, and taking the page whole means honoring both —
which is one attribution line.

## Third-party material

Not mine to license. Each keeps its own, and the license text ships with it.
[`NOTICE`](NOTICE) carries the full attributions.

| | | |
| --- | --- | --- |
| `vendor/three/**` | three.js | MIT — `vendor/three/LICENSE` |
| `vendor/chartjs/**` | Chart.js | MIT — `vendor/chartjs/LICENSE.md` |
| `vendor/fonts/inter-*` | Inter | SIL OFL 1.1 — `vendor/fonts/inter-LICENSE` |
| `vendor/fonts/poppins-*` | Poppins | SIL OFL 1.1 — `vendor/fonts/poppins-LICENSE` |
| `vendor/fonts/roboto-mono-*` | Roboto Mono | SIL OFL 1.1 — `vendor/fonts/roboto-mono-LICENSE` |
| `images/transit-of-venus-2012.jpg` | photograph by Brocken Inaglory | CC BY 2.5 |
| `js/data/gw/**` | derived from GWOSC released data | CC BY 4.0 |
| `js/data/stellar/**` | derived from the MIST model grids | cite the papers; see NOTICE |
| `js/data/spectra/**` | derived from SDSS DR18 observed spectra | public domain; acknowledge SDSS, see NOTICE |
| `js/data/observations/**` | derived from TESS light curves served by MAST, but the three files below | public domain (NASA); acknowledge TESS and MAST, see NOTICE |
| `js/data/observations/sdssNgc2420Photometry.js` | derived from SDSS DR18 photometry of NGC 2420 | public domain; acknowledge SDSS, see NOTICE |
| `js/data/observations/sdssNgc2420Segue.js` | derived from SDSS DR18 SEGUE stellar parameters of NGC 2420 | public domain; acknowledge SDSS, see NOTICE |
| `js/data/observations/mistSdssIsochrones.js` | derived from the MIST v1.2 isochrones in SDSS ugriz | cite the papers; see NOTICE |
| `js/data/ephemeris/**` | derived from JPL Horizons planetary states (the DE441 ephemeris) | no license stated; credit JPL and cite DE441, see NOTICE |
| `tests/fixtures/fits/*.headers.txt` | the headers of two TESS light curves served by MAST, kept for tests | public domain (NASA); acknowledge TESS and MAST, see NOTICE |
| `tests/fixtures/archive/gaia-epphot-su-dra.vot` | one Gaia DR3 epoch-photometry answer from CDS VizieR, kept for tests | CC BY-NC 3.0 IGO; credit ESA/Gaia/DPAC, see NOTICE |
| `tests/fixtures/archive/sesame-su-dra.xml` | one CDS Sesame answer, kept for tests | a position and names from SIMBAD; acknowledge CDS, see NOTICE |

### Data packs

Every dataset Gravitas shows as coming from outside it is a data pack
(DATA_PACKS.md), and its manifest in `data-packs/` records its licence status
and, where the status is not a licence, the basis for redistributing it. This
table is generated from those manifests (`npm run docs:sync`), so it cannot
say something different from them; NOTICE lists what each one cites.

<!--fact-block:dataPackLicenses-->
| File | Pack | Origin | Status |
| --- | --- | --- | --- |
| `js/data/exoplanetSystems.js` | HD 209458 and the Sun and Jupiter: parameters compiled from the literature (`exoplanet-systems`) | compilation | no license; attribution requested; see NOTICE |
| `js/data/gw/gw150914.js` | GW150914: the published figure data (`gw150914-figure-data`) | observed | CC BY 4.0; see NOTICE |
| `js/data/gw/gwoscEvents.js` | Five gravitational-wave events: whitened GWOSC strain (`gwosc-five-events`) | observed | CC BY 4.0; see NOTICE |
| `js/data/observations/mistSdssIsochrones.js` | MIST v1.2 isochrones in the SDSS bands (a model) (`mist-sdss-isochrones`) | model | no license stated; see NOTICE |
| `js/data/stellar/mistTracks.js` | MIST v1.2 evolutionary tracks: eight model stars at solar metallicity (`mist-v12-tracks`) | model | no license stated; see NOTICE |
| `js/data/ngc3198Synthetic.js` | NGC 3198: a synthetic rotation curve (`ngc3198-synthetic-curve`) | synthetic | CC BY 4.0; see NOTICE |
| `js/data/observations/sdssNgc2420Photometry.js` | NGC 2420: SDSS DR18 photometry (`sdss-dr18-ngc2420-photometry`) | observed | public domain; see NOTICE |
| `js/data/observations/sdssNgc2420Segue.js` | NGC 2420: SEGUE stellar parameters (`sdss-dr18-ngc2420-segue`) | observed | public domain; see NOTICE |
| `js/data/spectra/sdssSpectra.js` | Four observed stellar spectra: SDSS DR18, one each of A, G, K and M (`sdss-dr18-stellar-spectra`) | observed | public domain; see NOTICE |
| `js/data/observations/tessHd209458S56Aperture.js` | HD 209458: TESS sector 56 aperture mask (`tess-hd209458-s56-aperture`) | observed | public domain; see NOTICE |
| `js/data/observations/tessHd209458S56.js` | HD 209458: TESS sector 56 light curve (`tess-hd209458-s56-lc`) | observed | public domain; see NOTICE |
| `js/data/trappist1.js` | TRAPPIST-1: the star and its seven planets, compiled from the literature (`trappist-1-system`) | compilation | no license; attribution requested; see NOTICE |
<!--/fact-block-->

The repository's own licenses (MIT for the code, CC BY 4.0 for the content)
cover only what is Gravitas's to license. The files in the table above keep
theirs wherever the repository goes, its release archives included. The one
non-commercial file among them is the Gaia test fixture: it is in the
repository and its archives, and not on the site, which does not serve
`tests/`. Whether a non-commercial fixture belongs in an archive at all is
the owner's question, in [`OWNER_ACTIONS.md`](OWNER_ACTIONS.md).

## Extensions and the catalog

`extensions/**` holds extensions built with the SDK outside the core, and
`catalog/packages/**` the archives the catalog serves from them. Each
extension states its own licenses in its `gravitas-extension.json`, and
`npm run catalog:check` accepts only those CATALOG.md lists.

| | | |
| --- | --- | --- |
| `extensions/*/build.mjs` | transformation scripts | MIT |
| `extensions/*/course.json`, `README.md` | course text | CC BY 4.0 |
| `extensions/su-dra-tess-s15/*.json` | derived from a TESS light curve served by MAST | public domain (NASA); acknowledge TESS and MAST, see NOTICE |
| `extensions/kepler-13-tess-s14-*/*.json` | derived from a TESS light curve served by MAST | public domain (NASA); acknowledge TESS and MAST, see NOTICE |
| `catalog/**` | the catalog and its archives | as the extension each came from |

## Why the split

MIT is a software license. It is the right license for an integrator and the
wrong one for a lesson plan: an instructor who wants to lift an investigation
into a course pack is not redistributing software, and telling them to preserve
a copyright notice "in all copies or substantial portions of the Software" does
not answer their question. CC BY does, in the vocabulary teaching material is
normally shared in, and it is what the Journal of Open Source Education expects.

Both licenses are permissive and neither is viral, so combining them costs an
adopter one attribution line rather than a decision.
