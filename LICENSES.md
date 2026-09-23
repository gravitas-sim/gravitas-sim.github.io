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

## Why the split

MIT is a software license. It is the right license for an integrator and the
wrong one for a lesson plan: an instructor who wants to lift an investigation
into a course pack is not redistributing software, and telling them to preserve
a copyright notice "in all copies or substantial portions of the Software" does
not answer their question. CC BY does, in the vocabulary teaching material is
normally shared in, and it is what the Journal of Open Source Education expects.

Both licenses are permissive and neither is viral, so combining them costs an
adopter one attribution line rather than a decision.
