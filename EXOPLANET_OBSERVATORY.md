# The Exoplanet Observatory: from photons to a planet

Five guides, done in the Observatory with real TESS light curves
and the page's own tools. Open `/observatory/`, then **Guided investigations**,
or link straight to one: `/observatory/?guide=exo-fit&path=advanced`.

| # | Investigation | The question | Data | Tools | Intro | Advanced |
|---|---|---|---|---|---|---|
| 1 | `exo-star`, Whose light is it? | What a light curve records: quality flags, the summed pixels, and a second star in them | HD 209458 light curve and aperture; Kepler-13 SAP | aperture tool, computed panels | 9 steps, ~15 min | 10, ~20 |
| 2 | `exo-find`, Find the transit | A box search, a period, an epoch and a fold | HD 209458 | box search, fold | 6, ~15 | 8, ~25 |
| 3 | `exo-fit`, Fit the transit | The radius ratio, what the data cannot separate, the planet's radius from an adopted star's | HD 209458 | transit fit | 6, ~20 | 9, ~35 |
| 4 | `exo-dilution`, A star that is not alone | How a companion's light hides a transit, and why the light curve cannot say whose planet it is | Kepler-13 SAP and PDCSAP | transit fit, computed panels | 11, ~20 | 12, ~35 |
| 5 | `exo-planet`, Is it a planet? | Odd and even transits, a secondary eclipse, a blend, the simulation's version, what a transit cannot weigh | HD 209458 | computed panels | 8, ~20 | 9, ~25 |

The durations are estimates from what each step asks. None has been timed with
a class.

## What the roadmap asked for, and where it is

| Asked for | Where |
|---|---|
| Target context and contamination | 1: quality flags, the aperture's 23 pixels, CROWDSAP, and a share of light from catalog magnitudes |
| Transit detection; period and epoch | 2: the measurement panel's box search at its default range, the period against Stassun et al. 2017, the fold |
| Transit fitting | 3: the fit panel's transit model, k, and which parameters trade (b with a/R*) |
| Stellar-radius dependence | 3: Rp with R* = 1.19 +/- 0.02 (Stassun et al. 2017) carried through; the same k with Torres et al. 2008's 1.155 |
| Residuals | 3, advanced: the correlated-noise factor beta, and which uncertainty to quote |
| False-positive reasoning | 5: odd and even depths, a dip half an orbit later, and (advanced) the deepest dip any cataloged neighbor could make |
| Comparison with a simulated system | 5: the Transit Lab's HD 209458 (js/data/exoplanetSystems.js), linked, against the fit |
| Radial-velocity fitting, mass, density | Deferred. No authentic radial velocities of a transiting star ship with Gravitas: the only candidate the data-pack gate graded, HARPS velocities of HD 75289, got a B and is not a star Gravitas has a light curve of (DATA_PACKS.md). So 5 teaches the transit-only limit instead |
| A clean system | HD 209458: CROWDSAP 0.998 |
| A contaminated, diluted system | Kepler-13: CROWDSAP 0.549, with SAP and PDCSAP flux side by side |
| Data that do not support the tempting conclusion | Kepler-13 again: the light curve cannot say which of the two stars is the host, and one planet has published radii from 1.41 to 2.30 Jupiter radii |
| Introductory and advanced paths, without duplicating the science | One set of steps and answers per investigation; the advanced path only adds steps (tests/exoplanetGuides.test.js holds this) |
| Instructor guides, answer keys, assignments | Two documents in the encrypted instructor bundle (below) |
| Report evidence | At the last step, the answers go to the notebook as an Observatory entry |
| English and Spanish | js/i18n/{en,es}.guides.js, id for id |
| Offline | The page and the guides are precached; the Kepler-13 packs stay in the browser once installed |

## Decisions made under delegation

Carl was away; each of these was decided on the recommendation below.

1. **In the Observatory, not in the lesson registry.** The data, the
   measurement pipeline, the fit panel and the model comparison are already in
   `/observatory/`. The application's deferred budget had about 2 KB left, and
   a registry lesson costs about 33 KB with its Spanish shadow; the contract
   forbids raising a budget. The Observatory's lazy chunks are outside that
   budget, and its route ceiling counts only what loads at start-up. The cost
   is that the guides are not registry lessons: they are not in the activity
   formats or the assignment builder, and are assigned by link.
2. **Kepler-13 from the catalog, as two extensions.** A built-in pack would
   count against the application's deferred budget through
   `js/platform/builtins.js`. `community.kepler-13-tess-s14-sap` and
   `-pdcsap` are built with the SDK alone, like SU Draconis, and a guide
   installs them the first time a step opens one (about 9 KB each).
3. **SDK 1.3.0, not a new transform.** `binTessLightCurve` gained
   `flux: 'SAP'` and `crowding: true`, and `foldedDepth` is exported. Without
   either option a pack is byte for byte what it was, so `TRANSFORM_VERSION`
   stays 1.0.0, and `npm run packs:provenance` still rebuilds every pack.
4. **HD 209458's CROWDSAP adopted from its header, not added to its pack.**
   Adding it would change a built-in pack's bytes, and the pack is reachable
   from the application. The value is the pinned raw file's own header
   (0.99778908); a test reads it from the committed header fixture.
5. **The transit-only limit.** No mass or density is measured. The last
   investigation says why, and names the published mass as the literature's.

## How every number is produced

A step checks one of four kinds of number, and says which:

- **The reader's own measurement or fit.** A `do` step's check reads the
  measurement panel's nodes and the fit panel's recorded fits
  (`evaluateCheck` in js/observatory/guidePanel.js); a later answer is
  checked against what that reader found, not against a stored number.
- **Computed on the page** by js/observatory/guides/science.js, from the light
  curve on screen:
  - `boxDepth`: the weighted mean flux within a quarter of the box's length
    of mid-transit, against the mean more than one box length from it and
    from phase 0.5. Its error is the larger of the white-noise error and a
    correlated-noise one: the scatter of box-length means laid end to end
    outside the transits (Pont, Zucker and Queloz 2006's time-averaged noise),
    over the cycles the box holds.
  - `bestEpoch`: the box slid across one cycle in steps of a 32nd of its
    length, at a period taken as given.
  - `oddEven`, `secondary`: the same depth for odd and even cycles, and at
    phase 0.5. A difference counts from three of its standard errors.
  - `lightFraction`: 1 / (1 + 10^(-0.4 dm)).
- **From the pack's own record:** QUALITY's dropped cadences, and CROWDSAP and
  FLFRCSAP where a pack records them.
- **Adopted, and named as adopted,** with the source beside it (`ADOPTED` in
  js/observatory/guides/exoplanet.js):

| Value | Used for | Source |
|---|---|---|
| HD 209458 CROWDSAP 0.99778908 | the crowding comparison, the blend limit | SPOC, the pinned raw file's header |
| HD 209458 b period 3.52474859 +/- 3.8e-7 d | how close one sector gets; the computed panels' period | Stassun et al. 2017, AJ 153, 136 |
| HD 209458 R* 1.19 +/- 0.02 R_sun | Rp | Stassun et al. 2017 |
| HD 209458 R* 1.155 R_sun | Rp's dependence on the star | Torres, Winn and Holman 2008, ApJ 677, 1324 |
| HD 209458 b Rp 1.39 +/- 0.02 RJ, M 0.73 +/- 0.04 MJ | comparison; the mass the transit cannot give | Stassun et al. 2017 |
| Kepler-13 A and B TESS magnitudes 10.2306 and 10.4852 | A's share of the pair's light | TESS Input Catalog v8 (Stassun et al. 2019), TIC 158324245 and 1717079066 |
| Kepler-13Ab period 1.763588 d | the computed panels' period | Esteves et al. 2015, ApJ 804, 150 |
| Published k, R* and Rp for Kepler-13Ab | the range one planet has been given | NASA Exoplanet Archive, Planetary Systems table, retrieved 2026-09-26: Shporer et al. 2014; Esteves et al. 2015; Kepler DR24 and DR25 KOI tables |
| The simulation's HD 209458: R* 1.155 R_sun, Rp 1.38 RJ | the comparison with a simulated system | js/data/exoplanetSystems.js (a test holds them equal) |

## The reference run, and the literature

`npm run guides:key` (tools/exoplanet-reference.mjs) does in Node what a reader
does, with each panel's default settings: the aperture tool at bit 2, the box
search at its default range, the fold its result offers, and four fits with the
fit panel's default bounds. It then works every answer out with the guides' own
functions and checks every `do` step against the results. Every check passes.
tests/exoplanetGuides.test.js runs it and holds it to the literature:

| Quantity | Reference run | Literature | Test tolerance |
|---|---|---|---|
| HD 209458 optimal-aperture pixels | 23 | NPIXSAP 23 | exact |
| HD 209458 cadences flagged | 1288 | the pack's record | exact |
| Box search period | 3.52399 d, 1.09 min short | 3.52474859 d (Stassun et al. 2017) | under 2 min |
| k, HD 209458 b | 0.11926 +/- 0.0016 | 0.12086 (Torres et al. 2008) | 3 sigma (scaled) |
| Rp with R* 1.19 +/- 0.02 | 1.381 +/- 0.030 RJ | 1.39 +/- 0.02 (Stassun et al. 2017) | 3 sigma, both combined |
| b with a/R* | correlation -0.987 | the strongest pair | below -0.9 |
| beta, HD 209458 fit | 1.66 | | (reported) |
| Kepler-13A's share of the pair's light | 0.558 | CROWDSAP 0.549 | within 0.02, and above it |
| SAP depth / PDCSAP depth | 0.568 | CROWDSAP 0.549 | within 0.035 (about 2 sigma of the ratio) |
| k, Kepler-13 SAP, undiluted | 0.0657 | 0.0647 (DR25 KOI table) | (reported) |
| k, Kepler-13 SAP, dilution 1 - CROWDSAP | 0.0868 +/- 0.005 | 0.087373 (Esteves et al. 2015) | 3 sigma |
| undiluted k / diluted k | 0.758 | sqrt(CROWDSAP) = 0.741 | 1 decimal |
| k if the host were B (a lower bound) | 0.099 | | above A's k, below 0.12 |
| HD 209458 odd/even difference | 0.9 sigma | | "equal" |
| HD 209458 depth at phase 0.5 | 1.3 sigma | | "none" |
| The simulation's k | 0.1228 | the fit's 0.1193 | within 0.005 |

The synthetic tests make box transits with known depths and epochs, an
alternating eclipsing binary, a secondary eclipse and correlated noise, and
hold science.js to each.

## The runner

js/observatory/guidePanel.js, lazily loaded when a reader opens the panel or
arrives with `?guide=`. It imports nothing the page starts with; the page lends
it `open`, `status`, its state, the fixtures' openers, the measurement panel's
nodes and a way to open a panel. A step is `read`, `do`, `answer` or `choose`:

- a `do` step's button opens its observation (installing it first, if it is a
  catalog pack) and the panel it needs, and the step passes when the workspace
  holds what it asks for; the measurement and fit panels tell the guide when
  they finish;
- an `answer` is checked to its stated tolerance, with a decimal point or
  comma; after a wrong one the answer can be shown, and the step then says it
  was shown;
- a `choose` step is checked against an option, against one computed from the
  data, or, for a prediction, recorded for a later step to answer.

A reader may move on without passing a step. Progress is kept in this browser
(localStorage, `gravitas_guides`, per guide). A floating link returns to the
current step from the measurement and fit panels. At the last step, **Add my
answers to the notebook** writes a `gravitas.observed` notebook entry
(js/notebook/observed.js): each answer as a measured quantity, noted as checked,
not yet right, or typed after the answer was shown, and each step's state as a
row. The link at the last step is the assignment link.

## For instructors

The encrypted bundle gains two documents, rendered by
tools/build-instructor-materials.js from js/exoplanetGuideDocs.js:

- **The Exoplanet Observatory - Instructor Guide:** the curriculum map, the
  data and their licenses, each investigation's steps with its path, teaching
  notes and an assignment sheet, and the approximations below.
- **The Exoplanet Observatory - Answer Key:** every step on the advanced path,
  answered from the reference run, with the reasoning the page gives.

Rebuilding the bundle needs the passphrase, so the committed ciphertext does
not hold them yet and `npm run instructors:check` reports it stale until
`npm run build:instructors` is run with it. `npm run instructors:validate`
renders both without it.

## Data and licenses

| Data | Files | Checksum (raw) | Terms |
|---|---|---|---|
| HD 209458, TESS sector 56 light curve (SPOC, 20-minute bins) | built in: `tess-hd209458-s56-lc` 1.0.0 | `tess2022244194134-s0056-0000000420814525-0243-s_lc.fits`, sha256 `1b76b4a4...ce99e9` | public domain (NASA mission data, MAST) |
| HD 209458, TESS sector 56 aperture image | built in: `tess-hd209458-s56-aperture` 1.0.0 | the same file | public domain |
| Kepler-13 (TIC 158324245), TESS sector 14, SAP flux | catalog: `community.kepler-13-tess-s14-sap` 1.0.0, 1865 bins | `tess2019198215352-s0014-0000000158324245-0150-s_lc.fits`, 1,964,160 bytes, sha256 `06ce86a5...35ed342` | public domain |
| Kepler-13, TESS sector 14, PDCSAP flux | catalog: `community.kepler-13-tess-s14-pdcsap` 1.0.0 | the same file | public domain |
| Literature values | not redistributed; cited where used | | cited |

The Kepler-13 packs record CROWDSAP 0.5492385 and FLFRCSAP 0.92097801 from the
same header, and state a folded-depth check each: the PDCSAP depth, and the SAP
depth expected as the PDCSAP depth times CROWDSAP. `npm run catalog:check` and
`npm run packs:provenance` hold both to the raw file.

## What remains an educational approximation

- The computed panels' depths are box means: honest and reproducible, not a
  model depth. Limb darkening makes them deeper than k squared.
- The ratio were the planet B's ignores limb darkening, and gives B all the
  light that is not A's, the most B could have: it is the smallest ratio B's
  planet could have, not an estimate of it.
- CROWDSAP is SPOC's model of the aperture, and the TESS Input Catalog
  magnitudes are catalog values. Both are adopted.
- The transit model assumes a circular orbit and quadratic limb darkening, and
  holds the dilution fixed at the value given.
- The stellar radii are adopted; nothing here tests them.
- The binary tests use three standard errors, with uncertainties that include
  correlated noise measured outside the transits. Another threshold or noise
  model can change a marginal case.
- One sector's period is known to about a minute, and the fit's formal period
  uncertainty is smaller than its real one (INFERENCE_CORE.md measures by how
  much).
- The blend limit covers the cataloged stars only; a star the catalog does not
  list is not ruled out.
- The simulation's HD 209458 is built from rounded published values.
- No mass, and so no density, is measured.

## Budgets

- **The application:** unchanged, 818.9 of 830 KB at start-up and 4177.8 of
  4180 KB deferred. Nothing the guides need is reachable from js/main.js.
- **`/observatory/`:** 89 KB in 3 requests from the build and 170.8 KB in 17
  from the sources, within their ceilings (97.2 KB and 3; 189.6 KB and 19).
  At start-up the page carries only the guides' loader, the panel's title and
  its styles; the guides load when opened, as one lazy chunk of 113 KB, most
  of it the two languages' text.
- **The two archives:** 8.5 and 8.7 KB.

## Tests

- **tests/exoplanetGuides.test.js:** the guides as data (every step well
  formed, every word in both languages, the advanced path a superset of the
  introductory one, every answer reading only earlier steps, every adopted
  value naming its source, HD 209458's CROWDSAP equal to its header, the
  simulation's values equal to the simulation's); science.js on synthetic
  transits; the reference run against the literature (above); the runner's
  checks and answer parsing, and one guide walked in the DOM.
- **e2e/exoplanetGuides.spec.js,** against the sources and dist/: a guide
  opened by link; an observation opened by a step; a wrong answer, the right
  one, and progress kept over a reload; a box search and its fold passing the
  steps that wait for them; Kepler-13 installed from the catalog by a step;
  the notebook entry; Spanish; no axe violations in either language.
- **tests/catalog.test.js:** the Kepler-13 SAP pack's 1865 bins and its
  crowding record.
