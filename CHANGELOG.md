# Changelog

Notable changes to Gravitas. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

`main` deploys straight to <https://gravitas-sim.online>, so the live site can
be ahead of the newest tag; `deployed-revision.json` there names the commit it
was built from. `CITATION.cff` and `.zenodo.json` carry the version and the
release date and are generated from `tools/project-metadata.mjs` — see
[RELEASING.md](RELEASING.md), which also explains why the DOI is recorded after
the release rather than in the tag.

## [Unreleased]

### Added

- **Platform baseline and stewardship** (Roadmap II Prompt 111). A supported-browser
  statement in SUPPORT.md and on the Teach hub, generated from
  `playwright.config.js` and the locked Playwright's browser builds
  (`npm run support:sync`), with a feature-detection inventory held to the code in
  both directions; TOOLCHAIN.md (Node, exact pins, ranges, the quarterly
  checkpoint); CONTINUITY.md (the archive, hosting a copy, adding a
  co-maintainer, what a fork keeps); a bus-factor checklist and the repository
  settings' current status in OWNER_ACTIONS.md. `esbuild` is now an exact pin
  (it was `^0.28.2`; the lockfile already held 0.28.2).
- **Every width designed** (Roadmap II Prompt 55, PLATFORM_MODEL.md "As
  built (Prompt 55)"). One breakpoint scale of four tiers replaces twenty
  media-query widths, and a test refuses any other (DESIGN_SYSTEM.md,
  "Breakpoints").
  - A lesson on a laptop shows one docked panel at a time, as tabs; on a
    tablet the step and its instrument share a sheet across the bottom; on
    a phone the instrument is a second sheet on the step's. The canvas keeps
    a third of the window in every arrangement, Next and Back never need
    scrolling, and no panel covers the transport bar.
  - The footer's links no longer run under the elapsed time at 1024 px, and
    without a lesson the scenario card leaves the top corners to the readout
    and the Menu button.
  - On a touch screen every control is at least 44 px, and the canvas keeps
    a two-finger zoom for itself while the page stays zoomable.
  - The Studio pages are read-only on a phone, and say so.
  - The browser suite runs the investigation walker and a layout spec at
    the phone and a tablet size as well as on a desktop.
- **The Library** (Roadmap II Prompt 54, [LIBRARY.md](LIBRARY.md)). One
  index of everything a student or instructor can open, at `/library/`: the
  lessons and the guided investigations of the Observatory, the 3-D lab and
  the mission lab, the classroom activities, the scenarios, the datasets,
  the courses and the experiments, 125 entries with the same fields.
  - `library/library.json` (`gravitas.library/1`, with a schema) is
    generated from the sources that own each thing, checked fresh by the
    gate, and every route it emits is resolved by `validate:links`. A field
    a source does not declare is left empty and counted per kind.
  - The page searches and filters it with the lesson browser's own
    functions, plus kind, format and level; groups it by subject, course
    level or sequence; keeps its filters in the address; shows the progress
    each surface saved; and gives every kind one card that links to the
    page that runs it.
  - Every guide now declares its level and subjects, and every Observatory
    observation its subjects.
  - Home leads into it: a "continue where you left off" strip for lessons
    started and not finished, and a card per kind of thing in the Library.
    Its sections became a fragment of markup, which paid for both.
  - Every page's Learn group, and the lesson browser, link it.
- **Home** (Roadmap II Prompt 50, item 3). The front door is a page of
  the shell now, not a layer over it: it opens below the bar, and the bar
  stays live, with its navigation, switches and Tab order, while it is up.
  Every page's GRAVITAS link opens it by name (`/#home`), for a returning
  visitor too. Leaving it lands in the sandbox and takes `#home` out of the
  address, and a deep link still goes straight to what it names. Its
  content is the front door's own, the three ways in and the featured
  scenarios and investigations, until Prompt 73 redesigns onboarding.
- **The shared shell, on the application** (Roadmap II Prompt 50, Part 3).
  The simulation at `/` carries the same header as every other page, fixed
  over its full-bleed canvas: the navigation to every surface, and the
  language and theme switches.
  - The readout, the control rail, the lesson panel, the inspector and the
    scenario title move down by the bar's height (`--shell-height`). The
    canvas does not move.
  - The bar is gone in an embedded figure and in lecture mode, where the
    readout moves back up into the room it left.
  - The footer's theme and language menus are gone: the shell's switches
    are the application's own `setTheme` and `setLocale`, so a theme change
    still repaints the canvas and a language change still translates in
    place. The rail's Learn section keeps About Gravitas and the manual; its
    links to the model and instructor pages are in the navigation now.
- **The shared shell, on the tool pages** (Roadmap II Prompt 50, Part 2).
  The Observatory, the catalog, the experiment runner, the figure builder,
  the Scenario Studio, the Investigation Composer, the course builder, the
  course home, both 3-D pages, both mission pages and submission review
  carry the shell. Every page now has the whole navigation, and no page
  has a "Back to Gravitas" link.
  - Five routes pay for the module and use the shell's switches, the
    language one re-translating the page in place: the Observatory, the
    experiment runner, the figure builder, the course builder and
    submission review. Submission review was a dead end with no links out.
  - The other eight carry the markup without the module and keep their own
    language switch until their routes can pay.
  - The stored theme now reaches all thirteen pages. That exposed text,
    rules and fields written for Midnight only, which now use the theme's
    tokens. The course builder's link-table links are at least 24 pixels
    tall (WCAG 2.2, 2.5.8).
- **The shared shell, on the document pages** (PLATFORM_MODEL.md, Roadmap
  II Prompt 50, Part 1). /model/, /validation/, /teaching/, /instructors/
  and /evaluation/ share one header, five navigation groups, a language and
  a theme switch, and one footer, stamped from `tools/shell.mjs`.
  - The navigation is native disclosure (`<details>`), so it works with no
    script at all; `js/shell.js` adds one group open at a time, Escape, the
    two switches and the phone Menu.
  - Every label is written in both languages and the page's language picks
    one, so the shell costs a route no catalog: 3.2 KB of script where the
    prototype needed 8.3.
  - The stored theme now applies on all five pages before the first paint;
    on /evaluation/ it exposed hint text and rules that were legible only in
    Midnight, now drawn with the theme's tokens.
  - /evaluation/ and /instructors/ carry the shell without its module, which
    their routes cannot yet pay for: the navigation works and the theme
    applies, and the two switches wait.
- **Course packs** (COURSE_PACKS.md). `gravitas.course-pack/2` orders a
  course's lessons, assignments cut from them, scenarios, datasets and
  readings in units, with objectives, prerequisites, time, optional
  introductory and advanced paths, and notes in English and Spanish.
  - **The builder,** at `/studio/course/`, picks content from this build and
    the catalog. It checks what the course depends on, its licenses and its
    translations, configures assignments, and makes the course's links,
    embeds, a machine-readable manifest and a printable syllabus.
  - **Pins:** every lesson is pinned to a digest of its steps and its
    package. A course is exact (an archive: any change waits for review) or
    compatible (only what can break waits). The reviewed upgrade re-pins
    what an instructor has looked at, re-issues an assignment whose steps
    moved, and raises the course's version.
  - **The course home,** at `/course/`, is what students open: from a link, a
    file, or a course Gravitas ships. It filters by path, prints as a
    syllabus, reads in English or Spanish, and opens offline once Gravitas
    has been opened.
  - **Introductory astronomy,** a four-unit course from existing content, is
    the first course Gravitas ships.
  - A /1 course migrates. The Observatory opens a built-in observation by
    `?open=<id>`.
- **The mission lab** (`/mission/lab/`, MISSION_LAB.md): a mission to Mars on
  JPL's DE441 ephemeris, in three guided parts.
  - **The ephemeris pack** (`gravitas.ephemeris-pack` 1): Venus, the Earth,
    Mars and the Jupiter system barycenter, 2025 to 2045.
    - Chebyshev fits to daily JPL Horizons states, within 4.2 km and
      7.3e-5 km/s of held-out states; 107 KB.
    - Built reproducibly by `tools/build-ephemeris.mjs`, every request and
      answer pinned. It is checked offline in CI (`ephemeris:check`) and
      rebuilt byte for byte from the pinned answers
      (`ephemeris:provenance`).
  - **The mission:**
    - a rendezvous with a depot in Earth orbit;
    - the 2026 window on the real positions, in three dimensions, with four
      ways to choose;
    - the patched-conic design against the same spacecraft flown directly
      by the 3-D kernel under the Sun and the planets;
    - a correction burn found by aiming again;
    - delta-v and propellant by the rocket equation.
  - **The page:** a maneuver editor, an interactive timeline, three geometry
    views with every number in tables, and plan and report files.
  - **The guides:** checked against the reader's own lab, with a measured
    diagnosis of why the design misses Mars and an explanation students
    write.
  - **Around it:** instructor guide and answer key; English and Spanish;
    offline; ten reference cases.

- **The mission-design core** (`/mission/`, MISSION.md): educational
  astrodynamics on the 3-D engine, as a diagnostic page.
  - **Solvers:** impulsive Hohmann and bi-elliptic transfers; plane changes
    and their best split; rendezvous and phasing; Lambert's problem (zero
    revolutions, either branch, bracketed and bounded); patched-conic
    departures and captures; transfer windows; planar unpowered flybys.
  - **Refusals, not plausible numbers:** every solver returns its
    convergence or a coded refusal. Lambert's answers are confirmed by an
    independent propagation, and near-antipodal, unconfirmable and too-fast
    cases are refused.
  - **Validated** against textbook examples (Curtis, Vallado), closed-form
    constants, and the 3-D kernel flying each answer, with fixed tolerances
    (`npm run validate:mission`, a CI step).
  - **Runs in a Worker,** with cancellation, a wall-clock limit and bounded
    windows. Delta-v budgets, event timelines, a transfer-window plot with
    a CSV, and a plan file (`gravitas.mission-plan` 1) that keeps inputs,
    model and results apart, in English and Spanish.
  - **Not operational mission design or navigation,** and every page, table
    and file says so.

- **Orbits in three dimensions** (LAB3D_CURRICULUM.md): four guides in the
  3-D lab.
  - **The four:** an orbit's plane (inclination and nodes); seen from
    outside (an eclipse lost to half a degree, and a drawn size that lies);
    two orbits' planes (equal inclinations that are not one plane, and when
    a flat model of a planetary system is good enough); and a distant third
    body (the Kozai-Lidov cycle, with √(1 − e²) cos i held while e and i
    trade).
  - **Every guide:** a prediction, a manipulation and a measurement, a 2-D
    comparison and the model's limits. Answers are checked against the
    lab's own numbers.
  - **Runs** on introductory and advanced paths, in English and Spanish,
    from the tables with no WebGL, and offline.
  - **Reports:** a deterministic report file.
  - **For instructors:** an instructor guide and answer key.
  - **The key:** a reference run (`npm run lab3d:key`).
  - **The lab gained** two instruments (on the sky, and between two orbits),
    sessions that continue by themselves, and Spanish loaded only for
    Spanish readers. In the build the guide panel is a bundle of its own.

- **The 3-D lab** (`/3d/`, LAB3D.md): small systems in three dimensions,
  played by the 3-D kernel in a Worker and drawn in WebGL, without touching
  the 2-D renderer.
  - **Snapshots:** the page draws from versioned snapshots, interpolating
    between their every-tick rows, and reads every number from a snapshot
    as it is. Playing faster asks for more whole intervals, never a longer
    step, so no number depends on the speed. API
    1.1.0 adds live sessions.
  - **The view:** looks face-on and edge-on to an orbit or the reference
    plane, perspective or orthographic, orbit, pan, zoom and follow.
    Frames: barycentric, body-centered and rotating with a pair.
  - **Honest scale:** a legend states the scale bar, the body size (equal
    markers, radius × 10 or true), the trails' span, the grid, the height
    lines and the arrows' time scale.
  - **Instruments** measure from the numbers: distance, angle, relative
    velocity and orbital elements about a body's primary.
  - **Tables:** the hierarchy, positions and speeds, elements, conserved
    errors and events, with no WebGL needed.
  - **Access:** keyboard throughout, reduced motion, low quality, recovery
    from a lost WebGL context, and Spanish.
  - **Its own three.js build** (`vendor/three/lab3d.module.js`), so the
    application's 3-D view and budgets do not move.

- **A 3-D small-N dynamics kernel** (LAB3D.md), the accepted design of
  VALIDATED_3D_LAB_GATE.md. It runs only in disposable Worker realms, with
  nothing from the 2-D engine.
  - **Integrators:** compensated fourth-order Yoshida by default, with
    leapfrog, Yoshida and RK4, and adaptive Dormand-Prince 5(4) for close
    approaches.
  - **Physics:** mergers, orbital elements (elliptic and hyperbolic) and
    frames.
  - **Reproducible to the byte:** no engine-dependent arithmetic, so the
    same numbers give the same bytes in every browser.
  - **`gravitas.system3d/1`:** code or solar units with a dimensional check.
    It refuses ambiguous input and migrates the 2-D Orbital System Builder's
    files.
  - **Runs:** limits, cancellation, events, residuals and warnings.
  - **Integration:** a versioned capability API, and 3-D experiments through
    the experiment scheduler.
  - **Validation:** the gate's reference problems, permanent in
    `npm run validate:lab3d` and the check registry.
  - **Diagnostics:** the page `/lab3d/`.

- **The Investigation Composer** (COMPOSER.md). A page at `/studio/lesson/`
  composes a guided investigation as data, `gravitas.investigation-pack/1`,
  judged by the same lesson checker as every built-in lesson.
  - **Steps:** read, predict (marked at a later step), explore, measure and
    question, each binding a scenario, a seed word and an instrument, as
    collapsible cards.
  - **Remediation:** a step shown only to students whose answer to an
    earlier graded step is wrong (or right), one level deep. The engine's
    Next and Previous honor it and `js/authoring/rules.js` checks it.
  - **A question bank** (`gravitas.question-bank/1`): versioned questions
    with explicit points and attempt rules, accessibility metadata, and
    variants, either shuffled options or inputs from a vetted relation
    Gravitas computes (Kepler's third law, orbital and escape speed,
    inverse square, transit depth). A recorded seed picks the variant, so
    the same seed builds the same investigation.
  - **Translation:** English and Spanish side by side, each text marked
    translated, missing or out of date from a digest of the English it was
    written from.
  - **Around it:** an estimate of the work fitted to the built-in lessons, an
    answer key, a sample lab report as a PDF, a preview in the real lesson
    engine as a student or with the author bar, drafts, undo, a raw JSON
    view, import conflicts, bank merging, and the lesson files a maintainer
    vendors.
  - A hostile file is refused before any rule reads it: no prototype keys,
    functions, markup, links, or files larger or deeper than any pack.

- **The Scenario Studio** (STUDIO.md). A page at `/studio/` makes a scenario
  as data rather than code, and writes a `gravitas.scenario-pack/1` file or a
  link the application opens.
  - **What it holds:** any of 47 settings, a seed, bodies as an orbital
    system (as the Orbital System Builder takes it) or as typed positions and
    velocities (as precise placement takes them), the panels and tools it
    opens with, and a title and summary in English and Spanish. Units are on
    every field, and nothing is converted.
  - **Checks:** every problem is shown on its own field and blocks saving.
    Cautions never block: the builder's checks, an overlap, a step longer
    than the system needs, and a typed body faster than the escape speed from
    the rest, said as the two-body estimate it is.
  - **Editing:** undo and redo from the buttons or the keys, a draft saved in
    the browser after every edit, a raw JSON view that refuses what does not
    parse, an import that asks before replacing a different draft, and the
    fields changed since it was opened or saved.
  - **Like a built-in:** a pack made from any of the 22 built-ins whose world
    is generated from their settings builds that world body for body under
    the same seed. Its link opens with the panels and tools it names already
    out, and Refresh Scenario builds it again.
  - Start from a built-in or from an Orbital System Builder file, preview it
    as the embedded application, and read it in English or Spanish.
- **SDK 1.5.0: the `scenario-pack` extension type.** `init scenario-pack`,
  `init --from <file>` for a file the Studio saved, `validate` with the
  Studio's checks and cautions, a `test` that builds the world under its
  seed, steps it and builds it again, and `sdk/schemas/scenario-pack-1.schema.json`.
  The figure-eight choreography (Chenciner and Montgomery 2000) is the
  example.
- **A link can name the instruments it opens with.** A scenario pack's link
  carries its panels and tools, and opening it presses each on the rail, as
  a reader's click would.

- **The Orbital System Builder** (ORBITAL_SYSTEM_BUILDER.md). A form in the
  Scenario section, beside Blank Simulation, builds a two-dimensional
  hierarchical system from orbital elements, with no conversion to positions
  and velocities by hand.
  - **What you enter:** for each companion, what it orbits, its type, mass
    and contact radius, and its semi-major axis, eccentricity, argument of
    periapsis, starting mean anomaly and direction.
  - **How it is built:** companions are added innermost first, each around
    the barycenter of everything inside its orbit. The finished system has
    its barycenter at rest at the origin by construction. Every orbit reads
    back from the starting state to a part in 10¹².
  - **What it shows:** a preview, Keplerian periods, barycenter offsets, and
    checks for overlap, contact at periapsis, the Hill sphere, crossing
    orbits, Holman–Wiegert, Mardling–Aarseth and Gladman spacing. It says
    plainly that the elements are osculating and that no check proves
    stability.
  - **Like any other world:** a built system can be selected, edited,
    shared, rebuilt by Refresh Scenario and restored by the experiment bench.
    It saves as a versioned `gravitas.orbital-system` JSON file,
    independently of URL length.
  - **Six templates:** a star and a planet; the Sun, Earth and Moon; the
    Sun, Jupiter and Saturn; Kepler-16; Alpha Centauri; and a hierarchical
    triple star.
- **Stars and their populations: spectra, clusters and variables**
  (STELLAR_POPULATIONS.md). A second suite of five guides in `/observatory/`,
  on introductory and advanced paths, run by the same runner as the
  Exoplanet Observatory.
  - **What they cover:** what a spectrum says, from H-alpha and TiO5 to an
    A-type star whose gravity says it is no dwarf; NGC 2420's
    color–magnitude diagram and what SDSS left out of it (the crowded core,
    the saturated giants, the field); membership by SEGUE's velocities, and
    three published metallicities that disagree; ages from MIST's isochrones,
    and how metallicity and reddening trade against age and distance; and SU
    Draconis's period, light curve and distance as a standard candle, with a
    period search a transit fools.
  - **Three new data packs:** NGC 2420's SDSS DR18 photometry and SEGUE
    parameters, and MIST v1.2's SDSS isochrones, as the new `catalog` data
    type in the `table-columns/1` encoding, pinned and rebuilt byte for byte
    by `npm run packs:provenance`.
  - **New measurement tools, for any observation:** a band index (TiO5,
    CaH2), a comparison with model curves that draws its best curve over the
    points, a column summary (count, median, mean, spread), and derived
    columns: a sum of columns with its errors in quadrature, and the distance
    on the sky from a position.
  - **The guide runner is a platform:** suites are registered and load when
    chosen; the checks, the answer key and the instructor documents are
    shared, and the exoplanet suite shrank by 206 lines moving onto them.
  - **For instructors:** a guide and an answer key in the portal
    (`npm run guides:populations-key`); English and Spanish; offline.
  - **SDK 1.4.0:** the `catalog` data type in the manifest schema.
- **The Exoplanet Observatory: from photons to a planet**
  (EXOPLANET_OBSERVATORY.md). Five guides in `/observatory/` that take a
  reader through real TESS light curves, each on an introductory and an
  advanced path.
  - **What they cover:** whose light a light curve holds (quality flags, the
    aperture, crowding); finding a transit with the box search and folding
    it; fitting it, what the data cannot separate, and the planet's radius
    from an adopted star's; Kepler-13, where a companion's light hides much
    of the transit and the light curve cannot say which star is the host;
    and whether the dip is a planet at all, ending on what a transit cannot
    weigh.
  - **Every checked number from the data:** a step is checked against the
    reader's own measurement or fit, against a number computed from the light
    curve on screen by a stated method, or against a cited value named as
    adopted.
  - **Kepler-13 from the catalog:** two new catalog packs, its collected (SAP)
    and corrected (PDCSAP) light curves with the pipeline's crowding estimate,
    installed the first time a step opens one.
  - **Evidence and teaching:** progress kept in the browser; the answers go to
    the notebook; an instructor guide with the curriculum map, teaching notes
    and assignment sheets, and an answer key from a reference run
    (`npm run guides:key`); English and Spanish; offline.
  - **The fit panel** takes an adopted stellar radius and its uncertainty, and
    derives the planet's radius with both.
  - **SDK 1.3.0:** `binTessLightCurve` reads SAP flux and records CROWDSAP and
    FLFRCSAP when asked; `foldedDepth` is exported.
- **An analysis laboratory for experiments and fits** (ANALYSIS_LAB.md).
  - **Analyze, on the experiment runner:** for a result, run here or saved,
    each setting's numbers with 95% intervals; local slopes, elasticities, a
    trend and a rank correlation; the share of the scatter that is the
    setting, with a permutation test; the distribution, as a histogram with its
    counts; and warnings of what the result cannot tell, such as a measurement
    that cannot be read back to one setting, or a stretch where the setting is
    not identifiable.
  - **Honest about deterministic scenarios:** the laboratory scenarios ignore
    their seed, so identical repeats get no interval and no test. The same
    experiment run at another integration step gives the numerical
    uncertainty instead, and the slopes are judged against it.
  - **A plot and a table of every trial, linked:** a drag or the keyboard
    selects trials in either, and a summary of the selection follows.
  - **The experiment form:** a second setting (a grid), settings drawn at
    random (a seeded sample), and a choice of integration step.
  - **Compare the fits, in the Observatory:** AIC, AICc, BIC and Akaike
    weights for fits of named models and a constant; likelihood-ratio tests
    between nested ones, flagged on a boundary; residual diagnostics; each
    fit's parameter correlations. Fits to other rows are refused by name.
  - **Priced, refusable and cancelable:** the work is forecast for the device
    and refused past its limit.
  - **Saved whole:** a `gravitas.analysis/1` holding the experiment's manifest
    or every fit's inference document.
  - **Validated over many seeds** (`npm run analysis:validate`), with the
    failure cases recorded: a skewed sample's t interval, understated
    uncertainties, a period range that excludes the truth, and a step too
    coarse next to an instability.
  - **Cost:** the experiment runner now fetches Spanish only when it is
    chosen, which more than pays for the form. Its route is 4.9 KB lighter than
    before on the build.
- **A measurement pipeline in the Observatory** (MEASUREMENT_PIPELINE.md).
  - **What it is:** a versioned, inspectable record of what was done to an
    observation and what it gave. Its nodes are the source, every change, each
    measurement and each fit, in the order they happened.
  - **The tools, each bounded to teaching size:**
    - a period search (generalized Lomb-Scargle, with a Baluev false-alarm
      probability);
    - a transit search (box least squares);
    - a spectral line (continuum, equivalent width, center, velocity);
    - an aperture on an image (flux and centroid, or a flag's pixels and
      their sky position);
    - filtering table rows;
    - a cross-match with a second table.
  - **What every result records:** each number is measured, derived or
    assumed, and each uncertainty too. A node keeps its tool's version, its
    parameters and a checksum of the data it saw. Undo what it depended on and
    it says it is stale.
  - **Working with results:** a result can become a change (fold at its
    period, mask what a filter failed). There is undo and redo for the
    measurements, a methods summary with a citation for every method, and CSV
    of the results and the periodogram.
  - **Saving and reading back:** the pipeline saves as JSON and reads back,
    replayed and recomputed, node by node, to the numbers it saved. An older
    Observatory save opens as a pipeline too.
  - **The notebook:** a result goes into the evidence notebook and its PDF
    report with where its data came from, instead of a simulation's
    conditions, and a period search brings its periodogram as the figure.
  - **Validated two ways (`npm run measure:validate`):**
    - on seeded synthetic truth, where every stated error is the spread of
      its answers;
    - against cited values on the shipped data: SU Dra's period from Gaia
      within 0.5 sigma of Monson et al. 2017, HD 209458 b's from TESS within
      50 s of Knutson et al. 2007, SDSS Balmer velocities within 0.2 sigma of
      SDSS's own redshifts, and the TESS aperture's 23 pixels.
- **The Observatory loads its file reader when a file is first chosen,** not
  on every visit: 10 KB off the page's opening download.

- **The Observatory can import a star's Gaia DR3 epoch photometry live, from
  CDS, by name** (ARCHIVE_IMPORT.md).
  - **What it is:** the slice VO_ARCHIVE_GATE.md accepted, and nothing more.
    It uses CDS Sesame for the name, and CDS VizieR TAP for the Gaia DR3 cone
    and the epochs. It is opt-in and loaded only when opened, and it never
    touches a lesson.
  - **Before anything is used,** the reader reviews every field and its unit
    or "not stated", the rows, the service's status, both checksums, the
    license and what the conversion will do. Then the observation opens in the
    workspace like any other.
  - **Converted honestly:** a curated descriptor supplies what VizieR does not
    say. Times are barycentric TCB, converted to TDB by IAU 2006 B3; the flux
    is in e⁻/s, which gives the G errors. A unit the service states that the
    descriptor does not expect stops the conversion. The id is the content's
    digest, the query and both checksums travel with it, and so does its
    license, CC BY-NC 3.0 IGO.
  - **Bounded:** two origins, held by a meta Content-Security-Policy as well
    as the code. There is no cookie and no referrer. Limits are 64 KB and
    512 KB counted as they stream, 20 s per request, and a row limit on every
    query.
  - **Named failures:** each failure is named in English and Spanish:
    blocked, timeout, rate-limited, unavailable, too large, not a table, a
    service error, a wrong unit, canceled.
  - **Offline:** answers are kept on the device, so a star imported before
    opens offline, marked stale with its age once it is a week old.
  - **Checks:** `npm run archive:live` checks, on demand, that CDS still
    answers this way.
- **Magnitude axes are drawn brighter-up** in the Observatory's plot.

- **A curated catalog, `/catalog/`: data, courses and instruments, each
  reviewed before it is listed, and installable for offline use**
  (CATALOG.md).
  - **What it lists:** `catalog/catalog.json` (`gravitas.catalog/1`),
    generated at release time and checked on every change (`npm run
    catalog:check`, in CI). It lists the four built-in capability packages
    and two extensions built outside the core with only the SDK.
  - **What each entry shows:** what it is and provides, its download and
    installed size, which Gravitas it works with, its license and citations,
    and its review.
  - **Installing** a data pack or a course fetches its archive from this site
    and checks the catalog's checksum before decompressing a byte. The reader
    refuses every archive the SDK would not write: traversal, links,
    duplicates, a gzip bomb, a bad checksum. The content must pass the
    platform's own checks, and only then is the pack stored, in one write, in
    IndexedDB. Each failure is named beside its entry, in English or Spanish,
    with a retry.
  - **Using it:** an installed data pack opens in the observatory, and an
    installed course opens as its units with a link into each lesson.
    Updates, downgrades and new major versions are told apart.
  - **Assignments pin their package:** a link made from a lesson a package
    provides carries that package and its version (assignment schema 2).
    Opening one made with another major version, or before pinning, says so.
  - **Rules for accepting an entry,** and what the SDK lacked: CATALOG.md.
- **SU Draconis, an RR Lyrae star, from TESS** (`extensions/su-dra-tess-s15`):
  26 days of its light, installable from the catalog. A 20-harmonic series
  gives its period as 0.660408 d, against 0.66042001 d published. RR Lyrae
  itself was the first choice; its TESS light curve is unusable, because the
  input catalog lists the star nine magnitudes too faint. The pack's record
  says so.
- **A pulsating-stars course** (`extensions/pulsating-stars`): three lessons,
  in English and Spanish, ending on that light curve.
- **SDK 1.2.0:** `readFits()` and `binTessLightCurve()` in the public API; the
  `binned-relative-flux/2` encoding, for a star that varies by more than 3.3%;
  and the `harmonic-period` check.

- **An inference core: transit and radial-velocity fits in the browser,
  shown to be honest before they are used** (INFERENCE_CORE.md).
  - **What it fits:** a quadratic limb-darkened transit (`transit-quadratic`
    1.0.0) and a Keplerian orbit with a zero point per instrument and a
    jitter (`rv-keplerian` 1.0.0), each a small named parameter set with
    physical bounds. Every parameter is fitted, fixed or derived, and a
    result never mixes them up.
  - **How:** weighted least squares, a bounded grid and then bounded
    Levenberg–Marquardt, with linear parameters solved exactly. No MCMC and
    no black-box optimizer. Deterministic, cancellable, with progress.
  - **Uncertainty, kept apart:** the covariance's sigma, sigma scaled by the
    reduced chi-square, a correlated-noise sigma, a Δχ² = 1 profile interval
    and a slice. None is called a confidence region; how often each holds
    the truth is measured over 100 seeded injections per case.
  - **What it tracks and what it does not claim:** time format and scale,
    exposure smearing, the baseline, RV zero points and jitter, missing
    error bars, a fixed dilution, and the star's radius uncertainty. No mass
    or density from a transit: no radial-velocity data for HD 209458 ships
    with Gravitas, so the real-data fit is transit-only.
  - **Where it runs:** disposable Workers through the experiment runner's
    scheduler, with no world, no network and nothing on the page. A request
    too large for the device is refused before it starts, with the reason.
  - **A manifest,** `gravitas.inference/1`: the data pack and its version,
    the model and its version, the parameters, the bounds, the algorithm,
    the engine's fingerprint and the results.
  - **A diagnostic panel** on `/observatory/`, loaded only when opened, and
    `npm run validate:inference` and `npm run bench:inference`.
- **The observatory starts smaller:** 97.9 KB of JavaScript in the build
  where it was 119.4. It loaded its data packs through the capability
  resolver, which installs every packaged lesson's loaders on import and
  brought the investigations manifest with it; it now loads them from the
  reviewed builtin list directly.
- **An Extension SDK for contributors** (sdk/README.md).
  - **Commands:** `npm run sdk -- init`, `validate`, `test`, `pack` and
    `inspect`, for the three kinds of extension. An observation data pack
    and a course pack are declarative; an instrument family is executable,
    so it is reviewed and vendored rather than installed.
  - **Checks:** the format, the declarative boundary, platform and package
    compatibility, public-id collisions, licences and provenance,
    localization, offline classes and validation references. Every
    finding is reported by file, line and field.
  - **Archives:** a pack is one deterministic `.gxp` archive, and the same
    files always give the same bytes.
  - **Examples:** one of each kind: a single TESS transit of HD 209458 cut
    from the built-in pack, a five-lesson exoplanet course in English and
    Spanish, and a Kepler's-third-law instrument.
  - **Also:** JSON Schemas, TypeScript declarations, fixtures, a contract
    suite that goes through the public API only, a compatibility matrix and
    a deprecation policy.
  - **Platform change:** `gravitas.capability-package/1` can now provide
    `courses`.
  - **Not yet:** Gravitas does not install extensions at run time. The guide
    lists what still stands in an outside author's way.
- **An observatory, `/observatory/`: real observations and a reader's own
  files, as a plot, a table and an image at once** (OBSERVATORY_WORKSPACE_DESIGN.md).
  - **What it opens:** four kinds, each an authentic dataset Gravitas already
    ships. They are HD 209458's TESS light curve (a time series); four SDSS
    DR18 stellar spectra; five GWOSC events' catalog values with their 90%
    intervals (a table); and the same TESS light curve's aperture mask (an
    image), a new data pack. It also opens a reader's CSV or JSON, through a
    preview and a mapping in which every unit is chosen and none is guessed.
  - **One shape for all of them,** `gravitas.observation/1`: units from a
    registry that converts only within a dimension, one-sigma and interval
    uncertainties, missing values kept as missing, masks, bit-field flags,
    time formats and scales, spectral media and frames, and the source's
    provenance.
  - **Linked views:** a selection made by dragging or with the keyboard in the
    plot, the image or the table is the selection in all three, and the
    focused row or pixel is described in words. The table is an accessible
    grid of every row, a page at a time.
  - **Changes, all undoable:** crop, mask, note, convert a unit, change a time
    format, divide by the median, fold, bin, and shift a spectrum to its rest
    frame. Each is refused, with the reason, where it cannot apply.
  - **Honest about what it shows:** "What you are seeing" lists what was done
    to the data before it arrived, every change made here, how many points
    the plot drew of how many, masked and missing rows, and whether there is
    an uncertainty at all.
  - **Saves:** JSON that reads back as the whole session (the observation as
    opened, and the changes made again), the same bytes every time; and CSV
    with units in the header and text disarmed.
  - Works offline once Gravitas has been opened, in English and Spanish, and
    within budgets for a desktop and a throttled phone (`npm run
    bench:observatory`).
- **An image data pack** (`tess-hd209458-s56-aperture`), and the FITS tool
  reads two-dimensional images. Image packs are a new `dataType`, and SDK
  1.1.0 adds two optional runtime fields (`reductions`, `image`) without
  refusing a pack written for 1.0.0.
- **An experiment runner, `/experiments/`.** It is the bench's parameter
  sweep, stated completely enough to run in the background and to run again.
  - **What it runs:** a `gravitas.experiment/1` manifest (EXPERIMENTS.md).
    That is a laboratory scenario; one or two of its variables, as values, a
    range or a seeded uniform draw; a seed set; the bench's metrics; a stop
    duration and events; fixed numerics; and limits.
  - **Where it runs:** every trial runs in its own disposable Worker. The
    engine is evaluated fresh there, so no trial inherits another's state.
    Several run at once, and results are reported in planned order.
  - **Before a run:** one trial is built, and its Worker times its own
    start-up and a short burst of the world, so the experiment is priced on
    this device rather than from a figure per class of device. An experiment
    likely to freeze or exhaust it is refused with the reason, and so is one
    whose trials would all stop at the sample limit and be averaged into
    nothing.
  - **During a run:** cancel, per-trial and total time limits, a result-size
    cap, and reports of corrupt answers and failed Workers. Resume re-runs
    only what did not finish.
  - **The result:** a summary table, the trials and a plot. It downloads as
    JSON with an engine fingerprint, and a saved result can be checked for
    whether it still reproduces here and, if not, why.
  - In English and Spanish.

- **Observation data packs, and the first one: TESS's light curve of HD 209458.**
  A pack is observed data with its record of where it came from and what was
  done to it (DATA_PACKS.md). The record covers the archive and its citation,
  the rights, a pinned checksum of the raw product, every transformation step
  with the tool's version, units, the time system, the quality mask and the
  scientific check the data passed. The first pack is TESS sector 56, with
  18,791 good cadences in 1,882 twenty-minute bins. Folding it on the
  published period finds the transit at its published depth. It loads through
  its capability package, decodes with one shared decoder, and is precached
  for offline use. No lesson uses it yet. `npm run packs:check` verifies it
  without the raw file, and `npm run packs:provenance` rebuilds it byte for
  byte. Start-up is unchanged, and the deferred build grows by 9.0 KB with no
  ceiling raised.

- **An interactive figure builder, and a contract for embedding.** `/figure/`
  turns a Gravitas state - brought from Share with a new "Build a figure" link,
  or a scenario and a seed - into a figure for a course page: whether it opens
  running or paused, its language, theme and shape, its play controls, reduced
  motion, low-cost rendering, what Reset returns to, a title, a caption and a
  link to the figure, with a live preview and markup to copy. Nothing typed can
  become markup. Behind it is gravitas-embed/1 (EMBEDDING.md): `?embed=1&ev=1`
  and a closed list of options, and a small, versioned message contract - ping,
  play, pause, reset, load - that a figure obeys only from the one parent
  origin its URL names, answering nobody else. Plain `?embed=1` links behave as
  they always did. In English and Spanish.

- **A new investigation, _Twelve Nights_.** A 40-to-50-minute lesson in which
  students write a radial-velocity schedule themselves, under the constraint a
  real time allocation imposes: twelve nights on HD 209458 from La Silla, one
  measurement a night, for a target that culminates at 41.9° and is above
  airmass 2 for only part of each night. The window is tied to the target's
  hour angle, so it opens about four minutes earlier every night and the epochs
  fall on a comb spaced by one sidereal day whatever the student does; of the
  two plans they commit to the spectrograph, one returns the planet at an alias
  period. The observing planner shows the windows and the spectral window and
  never a period or a velocity. The first screen says that the sky is real and
  the star is simulated, and that only the list of times crosses between them;
  the last works out why a second site at another longitude removes the alias
  and more nights from the same site do not. In English and Spanish.
- **Observing windows computed from the sky, and checked against published
  values.** `js/observingWindow.js` gives altitude and airmass, astronomical
  twilight, lunar phase and separation, and the intervals in which all three
  allow a measurement. Time is always an argument and never read from a clock,
  so the same night computed on two machines on two different days is the same
  window. A new _Observing windows_ group on `/validation/` checks it against
  published sidereal time, solar positions, equinox and solstice, airmass fits,
  new and full moons and two total lunar eclipses; the largest residual, from
  using UT where TT is meant, is written into the check rather than absorbed
  into its tolerance.
- **A new investigation, _What If Gravity Were Not Inverse Square?_** A
  45-to-60-minute lesson in which students move the exponent of gravity between
  1.5 and 2.9 and measure what depended on it: whether an orbit closes, how the
  period scales with distance, and which conservation laws survive. The law is
  anchored at a reference radius of 1 AU, where the pull is Newtonian for every
  exponent, so moving the exponent changes the shape of the field rather than
  its strength — which a change to G alone cannot imitate. Every number is
  measured by running the model when the step opens: an ellipse that turns
  backwards below 2 and forwards above it, a precession that holds still when
  the timestep is refined, the slope of period against radius, and energy
  conserved only with the potential that belongs to the force. The instruments
  integrate their own orbits in `js/powerLawGravity.js` and never touch the
  engine, so the scenario on screen stays Newtonian; `/model/` says so, and says
  this is a controlled experiment rather than a theory of gravity. In Spanish
  the lesson text is translated but the instruments' own labels are still
  English.
- **Four real stellar spectra in _A Universe of Stars_.** New screens near the
  end of the lesson, before its closing question, put four spectra observed by
  SDSS (DR18) — one star each of type A, G, K and M — behind two instruments: a
  comparison of all four, and one unlabeled spectrum to identify from its
  absorption features. The curves are deliberately not drawn in the colors of
  their stars, every readout opens by saying these are observations and not
  models, and each measured feature depth is given as text with the windows it
  was measured in and the archive record it came from. The lesson says that
  four stars are four examples and not a sample; the selection rule, and why
  the archive's highest-signal M dwarf is not among them, are recorded with the
  data. The flux is not part of the initial download. `npm run spectra:check`
  verifies the committed data offline, and `npm run spectra:provenance`
  regenerates it byte for byte from the archive CSVs once they are cached. No
  class has used these screens yet. In English and Spanish.
- **Five real mergers in _Listening to Spacetime_.** Seven new screens, after
  the published GW150914 traces, put thirty-two seconds of GWOSC strain from
  one LIGO detector each for GW150914, GW170817, GW190412, GW190521 and
  GW190814 behind one instrument: a constant-Q map whitened by each detector's
  own noise, the last instant anything clears a threshold set by the number of
  pixels searched, and the loudest frequency at fixed times before it. The
  readout keeps what the detector recorded, what Gravitas measured from it,
  GWOSC's catalog values and the model under four separate headings; catalog
  values are held back until asked for, so a student ranks the events by chirp
  mass from a measured frequency before any mass is on screen. No chirp mass is
  measured - one was built and rejected as unstable - and nothing is a
  template, fit or detection statistic. The strain is fetched only when the
  lesson reaches it, and `npm run gwosc:provenance` regenerates it byte for byte
  from the archive once it is cached. In English and Spanish.
- **A body can be placed by typing it.** _Precise placement_, beside Add
  object, takes a type, a position, a velocity and a mass as numbers, with the
  unit named on every field, each error attached to the field it is about and
  focus moved to the first one. It calls the same `placeBody()` a click does, so
  a typed body lands in the same list, is undone by the same button and
  serializes into the same share link. Leave the mass blank and one is chosen as
  a click would choose it; a white dwarf above 1.44 solar masses is refused.
  Building an arbitrary system no longer needs a pointer or aiming at the
  canvas; dragging to feel how fast a throw is still has no keyboard
  equivalent.
- **Every exported series can be read as a table.** Each series in the export
  dialog offers **View as table** before **Download CSV**. The table is rendered
  from the bytes the CSV exporter writes, so the table, the file and the plot
  cannot be three derivations that disagree, and a long series is evenly
  sampled with the sampling stated in the caption. The rotation curve, which had
  no export at all, now has one. The shape of a curve is still not narrated.
- **The sound panel prints what the tones stand for.** It lists each voiced
  body with its orbital period, and its ratio and interval in cents to the
  highest voice. This is not a description of the sound, which is compressed
  and quantized onto a five-note scale and cannot be inverted, but of the
  quantity the sound is computed from, read from the same array the oscillators
  follow so the two cannot drift apart. It is plain content rather than a live
  region, so a screen reader is not interrupted as the voices change. A separate
  period-to-cents law, `js/sonify/law.js`, is checked on `/validation/` against
  the cent values of the octave, the just fifth and the just major sixth, and
  for exact invertibility; it is not what the speakers play. None of the
  sonification, and none of the accessibility work above, has been tested with
  a screen reader or a blind user, and [ACCESSIBILITY.md](ACCESSIBILITY.md)
  says so.
- **A lab report an instructor can read back.** The PDF lab report now carries
  a submission token — the student's answers, attempt counts, step fingerprints
  and whatever name they typed, with the assignment and an optional roster id
  taken from `?roster=` on the assignment link — printed on its last page and
  embedded in the PDF's metadata, because the two survive different mishandling.
  `/instructors/submissions/` takes a pile of those PDFs, JSON progress backups
  or pasted tokens and returns one table of per-question failure rates, hardest
  first. Each answer is graded under the language it was typed in, and written
  answers are counted as unmarkable rather than wrong. What it reads can be
  downloaded (below); there is no roster or gradebook, nothing survives a
  reload, and nothing leaves the browser. It verifies answers, not identity: a
  token computed in a browser can be forged. The page needs no passphrase, is in
  English and Spanish, and is reached by its address; nothing links to it yet.
- **The submission page's reading can be downloaded.** A summary CSV with one
  row per report - roster and assignment ids when the link supplied them, the
  name exactly as the student typed it, the lesson and its version, completion,
  and counts of correct, incorrect, unmarked, incomplete and stale answers - a
  question-level CSV with one row per graded step, and a versioned JSON document
  with everything, including what was refused and why. All three and the
  on-screen table come from one graded record per report. Nothing is merged or
  chosen: an exact duplicate is kept and marked, repeated attempts are grouped
  only by roster id and numbered by when they were saved, and without a roster
  id nothing is grouped at all. Students' written answers are left out of both
  exports unless the instructor ticks a labeled box.
- **A classroom evidence kit at `/evaluation/`.** Printable instruments for an
  instructor who wants to evaluate a section: an implementation and fidelity
  checklist, a pilot pre/post concept assessment written against _Kepler's
  Laws_, _Bound, Unbound and Escape_ and _Weighing the Stars_, a usability
  questionnaire, participant codes drawn from a word list so sheets can be
  paired without names, and de-identified CSV and JSON templates with a
  versioned schema. Every item is in the static HTML, so the forms print with
  scripts blocked. `npm run evaluation:summary` reads the exports back and
  prints counts, missing data, per-item before and after, and paired change,
  with a bootstrap interval labeled as describing this sample only — and no
  p-value, no verdict and no "gain". The page asks for no name, email address
  or institution and transmits nothing, and a test searches the built bundle for
  network calls. The assessment is project-developed and unvalidated, and no
  evaluation of Gravitas has been run. The teaching page and the instructor
  portal link to it; it is in English only.
- **A public account of what the simulation cannot undo.** A new section of
  `/model/`, _What cannot be undone_, separates two reasons a run does not come
  back. The default integrator, symplectic Euler, is not time-symmetric, while
  velocity Verlet returns to the floating-point floor. And some operations
  delete information whatever the integrator: mergers, collapse to a black
  hole, bodies culled after leaving the view, damping, and collision fragments
  scattered by an unseeded random draw. That table is generated by scanning
  `js/physics.js` (`npm run audit:irreversible`) and the release gate refuses it
  when it falls behind the engine. A third reason, chaos using up double
  precision, is stated with them. `npm run probe:reversibility` is the
  measurement, and taking it meant fixing two latent engine bugs that no
  control could reach: a negative step is now substepped like a positive one,
  and a non-finite step is refused instead of being added to every position in
  the scene. No control in the application runs the simulation backwards.
- **The engine and the world builder load in a Web Worker.** Two unguarded DOM
  accesses stopped `js/physics.js` and `js/world/build.js` from evaluating
  without a document; both are guarded, and a browser test builds and
  integrates a scenario inside a real module Worker.
  [MULTI_WORLD_DECISION.md](MULTI_WORLD_DECISION.md) records the decision this
  enables: a second, isolated world is a Worker realm, not a refactor of the
  engine into instances, and the synchronous world-swapping prototype built to
  test the idea was removed rather than kept without a consumer. Nothing in the
  application uses a Worker world yet, and the probe pages under
  `spike/lyapunov/` are not part of the build.

- **Capabilities described by versioned packages, starting with three.** The
  power-law gravity instruments, the four SDSS spectra and the lesson that uses
  the instruments are each described by a `gravitas.capability-package/1`
  manifest in `capabilities/`, and reach the application through one runtime
  (`js/platform/`): dependencies resolved in order with the platform version
  checked, each module loaded once and fetched again after a failure, and a
  package's renames of its own identifiers applied to saved answers as they are
  read. Code is named only through a reviewed registry; a package that is
  content alone may name none, and hashed build chunks never appear in a
  manifest, a link or saved work. `npm run capabilities:check` holds every
  manifest to the repository in CI, and the service-worker precache takes each
  file's offline class from its package. Nothing a reader sees changes, and
  every identifier, link and saved answer is what it was. The other
  capabilities stay built in until each is moved in its own step;
  `CAPABILITY_RUNTIME.md` lists the order.

### Changed

- **CI runs what the release gate runs.**
  - Ten quick checks that only `release:check` ran now run in CI. The SDK
    extensions, the classroom activities, the scene catalog, the
    irreversible-operations audit and the five dataset structure checks run in
    the checks job. The lesson cards run in the accessibility job, which has a
    browser. The bundle-composition check now runs in the build job.
  - A quick check may stay out of CI only if it says what in CI covers it.
  - On the first of each month, the datasets are checked against their pinned
    sources, with the sources cached between runs.
  - On Mondays, the e2e timings are refreshed and offered as a pull request,
    and the Observatory's interaction budgets are reported, report-only.
  - Each scheduled job can be dry-run from `workflow_dispatch`.
  - `waitForTimeout` is held per file to today's count (218 calls, in 52
    files), and the count can only fall.
  - A flaky test can be quarantined by its title, with an owner and an expiry
    date; it still runs.
  - The browser install is one composite action instead of four copies.
  - `npm run packs:data` also fetches the catalog's extension packs' raw
    files (`node tools/catalog.mjs fetch`), from the pins their `build.mjs`
    files export.
  - The MIST tracks now regenerate byte for byte on Node 20 as well as
    Node 24. Their stage ages keep twelve significant digits, because the two
    disagree in the last bit of `10 ** x`.

- **The checker every declarative format shares has a module of its own**
  (`js/platform/checker.js`). Course packs and 3-D systems had reached it
  through `js/platform/investigation.js`, which brought the investigation
  format, the question bank and the vetted relations with it. The course
  pages now download about 41 KB less from the sources, and `/lab3d/` about
  as much. Their route ceilings were lowered to match; the composer, which
  uses all of them, is unchanged.
- **The English catalog no longer repeats the sentences lessons compute.**
  Each of its 139 `lessonFn.*` entries was keyed on its own text, and
  `js/i18n/lesson.js` already returns the sentence when a locale has no
  entry, so English reads exactly as before. Dropping them took 13.6 KB off
  the deferred bundle and every lesson's download; the Spanish translations
  keep their ids.
- **The Orbital System Builder points to the Scenario Studio,** which opens
  the file it saves.
- **The vendored three.js is 475 KB instead of 660.** It now holds only
  what the 3-D view uses, which takes 47.7 KB off the 3-D view's download
  and the deferred bundle. `tests/vendoredThree.test.js` holds the view to
  the names the file exports.
- **The observatory starts lighter again:** the pack decoder arrives with the
  first observation opened. That is 188.7 KB from the sources, where it was
  193.7, and the ceilings are lowered to keep it.
- **A lesson loads only the instruments its current step needs.** Thirteen of
  the seventeen instrument families were still part of the lesson engine, so
  every lesson downloaded and ran all of them before its first step. Every
  family is now fetched when a step first names one of its instruments: before
  its first step a lesson loads 738 to 811 KB less JavaScript from the published
  site and makes 23 to 25 fewer requests, and 269 to 293 KB less in a bundled
  build, and is usable about 40 ms sooner from the published site. Start-up,
  the front door and the document pages are unchanged. A family that is on its
  way or could not be fetched says so in the instrument panel, including when
  it is the lesson's first screen, and a lesson whose files are cached still
  draws its instruments offline. The service worker still
  precaches every family on a first visit, so the total a first visit downloads
  is not smaller for this (LAZY_CAPABILITIES.md).
- **Charts load 32 KB less.** The vendored Chart.js registers only the line and
  scatter charts, axes and plugins Gravitas draws with, instead of the whole
  library.
- **The simulation canvas draws at the display's pixel density.** It had never
  consulted `devicePixelRatio`, so on HiDPI laptops and projectors the
  most-viewed surface rendered at about half linear resolution while smaller
  panels were sharp. The backing store now follows the display, under a pixel
  budget per quality tier so that a large HiDPI window cannot multiply its fill
  cost without limit. The low tier, which is chosen because a machine is already
  struggling, takes none of the extra pixels and renders exactly as before, and
  so does any display at a ratio of 1. `npm run perf -- --dpr 2` emulates a
  HiDPI display for measuring it.
- **Adding a language can no longer break offline install for every reader.**
  Translated lesson bodies are kept out of the offline precache by the shape of
  their directory rather than by a pattern naming Spanish, and the build refuses
  a locale directory that is not registered or a registered locale that has
  none. Before, a third language's lessons would have been precached as core
  files, and one of them failing to download would have stopped the new service
  worker installing for everyone. `npm run i18n:check`, which checks the message
  catalogs against the source that asks for them, now passes and runs in CI.
- **The deferred-download ceiling is raised; the initial-download ceiling is
  not.** The new investigations, the spectra, precise placement and the data
  tables are all loaded on demand, and the deferred ceiling in
  `tools/bundle-budget.mjs` rises from 3880 KB to 4080 KB, with every raise
  itemized in its `reason`. What a first visit downloads is still held to
  830 KB. The lesson-manifest size test is now a bound per entry rather than a
  flat total, which no further lesson could have fitted under.
- **Only a release asks whether the instructor bundle is current.** Every
  branch and fork runs `npm run instructors:validate`, which renders every
  document and re-checks every answer key against the grading function under a
  throwaway key and writes nothing, and `npm run instructors:audit`, which
  confirms the freshness digest covers every module the build actually loads.
  `npm run instructors:check`, which asks whether the committed ciphertext was
  built from these sources, runs on pushes to `main` and pull requests into it,
  so a branch that edits lesson content no longer goes red elsewhere until the
  passphrase holder rebuilds; `tools/verify-release.mjs` now asks it again, with
  no condition, on the tree about to be published. `npm run instructors:restamp`
  re-states the record without the passphrase when the covered files changed
  but the documents did not, and refuses when they did.
- **CI measures what it used to report as unmeasured.** The documentation check
  compares the documented test counts with the suites the `checks` job has just
  run (`npm run docs:check:tests`) and the build facts with the build it has
  just made (`npm run docs:check:build`); before, it passed while listing those
  counts as not measured. The physics suite writes one report that both the
  table and the documentation check read, instead of running twice. The
  browser-suite skip policy, `npm run test:policy`, runs on every push and pull
  request and tells a skip conditioned on the build target from one conditioned
  on what the page happened to render, and the registry drift test now also
  fails when a check marked gate-only is in fact run by CI.
- **The accessibility and sonification claims are checked against the
  production build.** The keyboard-placement, data-table and printed-voices
  tests now work only through what a reader can see and press, and run against
  `dist/` as well as the sources. The tests that compare against internal
  state, such as exact typed coordinates, the plotted arrays and the live voice
  list, stay on the sources, and their headers say why.
- **A lesson no longer downloads instruments it does not use.** Every lesson
  loaded all sixteen instrument families before its first screen. The transit,
  power-law and both gravitational-wave families are now fetched when a step
  reaches them, which takes 242 KB and fourteen requests off every lesson's
  first screen as the site is published, and 85 KB and two requests in the
  build. While a family is on its way the tool panel says so to a screen
  reader; if it cannot be fetched the panel says that too and offers **Try
  again**, or **Reload the page** when a retry cannot work, and the reader's
  answers are kept. Offline, a lesson opened once still draws them. Start-up
  requests do not change in either configuration. `npm run budget:routes`
  measures what a fresh visitor downloads for nine routes, sources and build,
  against ceilings every lesson route's old download exceeds. Thirteen families
  are still loaded with every lesson; `LAZY_CAPABILITIES.md` lists them and the
  order they move in.

- **The pull-request check takes about twelve minutes, not twenty-five to
  thirty.** The source browser suite ran as six shards of equal test count, and
  because the heavy spec files sort first, the first shard took 24 to 29
  minutes while the last took 15; every run waited for the first. It now runs as
  twelve shards of equal duration, planned by `tools/e2e-shards.mjs` from
  Playwright's own listing and each test's median CI duration in
  `tools/e2e-timings.json`. Every test still runs, at the same two workers per
  runner, with the same retries and timeouts; a new required job fails the
  check unless the merged results contain every listed test exactly once. The
  first run on the change finished in 12.1 minutes. Running twelve shards
  means two overlapping runs can briefly wait for runners.

### Fixed

- **The validation report** had three serious accessibility defects, found
  when axe was extended to it.
  - Each of the margin chart's 280 or so dots was a focusable
    `role="button"` that did nothing, inside a chart that is one labeled
    image. The dots are drawn now, with the check's name on hover, and the
    table's "Used" column says its percentage in text as well as in a bar.
  - The Published, Approximation and Empirical hues were too light for the
    Daylight theme (pink was 2.4:1). They are darker there.
- **axe now covers the figure builder, the evaluation kit and the validation
  report**, in both languages and both themes. They were the three pages it
  did not reach.

- **A physics Worker that died stopped gravity, silently.** Its busy flag
  stayed set, so no job was scheduled again, and every body kept the last
  pull the Worker had computed. An error, an unreadable answer or ten seconds
  without one now ends the Worker; gravity is summed on the main thread, and
  the status region says so. The chart Worker falls back to drawing directly,
  and a 3-D lab Worker that sends nothing for thirty seconds, or an
  unreadable answer, is ended with a reason. An uncaught error or unhandled
  rejection is also said in the status region; nothing is swallowed, and the
  browser reports it as before. Commented-out code in `js/preview.js` and
  `js/physics.js` was removed to keep the front door within its budget.

- **The way back to the instructor was hard to find, and half-read.**
  - `/instructors/submissions/` is linked from the instructor portal's public
    section and from the adopters guide. The guide also no longer says three
    things that stopped being true: that there is no instructor-side
    gradebook (there is still none, but the review page reads the reports
    back), that a student who changes machines starts again (a progress file
    carries the work), and that units typed with a number are ignored (they
    are read, converted or refused).
  - The assignment builder takes an optional class or roster code, which it
    adds to the link as `?roster=` - where the submission token has always
    read it - and to the printed instructions.
  - The review page shows each submission's written answers beside the
    rubric their step has, in a disclosure. They were read, counted as
    unmarkable, and never shown.
  - The exports count points: what each question is worth (one, or what the
    step declares) and what it earned, with the totals in the summary and
    the written answers' points reported as unmarked rather than as zero.
    `gravitas.submission-results` is version 2; `readResults()` reads a
    version 1 file, with the points it never had as null. The screen grades
    as it did.
- **Lesson cards can say what a lesson teaches.** A card's objectives open
  under it, fetched with the lesson only when asked for. Every lesson now
  declares its audience, the mathematics it asks for and the lessons it
  builds on, generated into `js/data/investigations/discovery.js` for the
  course-planning views (the lesson browser does not show them yet).

- **What a Spanish student handed in was partly English, and partly wrong.**
  - A measurement typed the Spanish way ("1,52") was NaN to the step's own
    check, so derived columns stayed blank and nothing was checked. Fields
    now record the convention they were typed in, as a checked number does.
  - The finish dialog, the model-answer controls, "worked out for you", the
    wedge readout and every heading and result in the lab report were
    literal English. They are translated, and the report is written in the
    language the student worked in.
- **The submission token could only be handed in as a PDF.** The finish
  dialog now shows it in a read-only field with Copy and a .txt download,
  for a learning management system that takes a text box, and offers a
  progress file beside the report.
- **A choice was final on the first click.** A graded choice now has Change
  answer, as a number can be re-checked: the first answer and the count of
  tries are kept, and the report says how many tries it took. A prediction
  can be changed only until the step that shows its verdict.
- **A re-issued assignment link lost the work done on it.** Progress was
  kept under the assignment's id, which starts with the day it was made, so
  the same worksheet handed out again on another day opened empty. It is
  now kept under the lesson, the steps and the title; work under the old
  key moves across the first time it is read. A new title is a new activity
  and starts afresh, on purpose.

- **An assignment link made on `v2` could not be opened by the deployed
  build.** Every link was written as version 2, which the site `main` serves
  refuses as "made by a newer version", and a browser still running its
  cached copy after an upgrade refuses it too. A link is version 2 only when
  it carries a package pin, the one thing version 2 added; every other link
  is version 1 again. `tests/assignment.test.js` opens both kinds with the
  reader archived from the deployed commit.
- **The deploy published directories no page uses.** `spike/`, `tests/`,
  `e2e/` and `tools/` are dropped from the staged tree after it has been
  verified. The physics suite `/validation/` runs live moved from `tools/` to
  `js/validation/` first, and `tests/spikeNotShipped.test.js` checks that no
  page, and nothing the service worker lists, points into a dropped
  directory. The spike stays in the repository and its archives.

- **The numeric test suites ran 8 to 25 times slower under Jest than in
  Node, and timed out on a loaded machine.**
  - **What it did:** Jest runs every module in a `vm` context, where each
    read of a free global such as `Math` or `Float64Array` goes through the
    context's global lookup instead of a cached property. The transit model,
    the fitter, the period and box searches and the curve comparison read
    `Math` millions of times a run. `tests/inference.test.js` took 299 s, one
    profile test 101 s of it, and the searches in `tests/measure.test.js` and
    `tests/stellarTools.test.js`, which yield to the page and so can time
    out, were the ones that did.
  - **What it does now:** the seven modules that measured a difference
    (`js/inference/transit.js`, `fit.js`, `infer.js` and `rv.js`,
    `js/measure/periodogram.js` and `curveCompare.js`, and
    `js/analysis/stats.js`) bind the globals they use once, at module scope:
    `const { Math, Number, Float64Array } = globalThis;`. They are the same
    objects, so every result is bit-identical. The eight numeric suites take
    20 s of CPU instead of 325 s, `inference.test.js` 12 s instead of 299 s,
    which is plain Node's speed. At a load average of 64 to 127, the
    sinusoid pulls take 8 to 10 s of their 60 s (26 to 38 s before) and the
    TESS reference case 2 s of its 120 s (13 to 20 s before). The other
    numeric modules (`aperture.js`, `bandIndex.js`, `spectrumLine.js`,
    `pipeline.js`, `js/observatory/*` and the rest of `js/inference` and
    `js/analysis`) measured no difference and are unchanged.
  - **Tests:** unchanged, and so is what they assert, their explicit
    timeouts included. The outputs of all seven modules on seventeen
    workloads (fits, profiles, searches on the TESS light curve, the curve
    comparison, the resampling statistics) are byte-for-byte the same as
    before, 1.0 MB of them.
  - **Cost:** nothing. The minifier shortens the local name, so the built
    Observatory, experiments and inference-worker chunks are 724 bytes
    smaller; the app's deferred bundle is unchanged.
- **A pull request could go over a route budget with green CI.**
  - **What it did:** `npm run budget:routes` ran only in the local release
    gate. Its registry entry said no CI job had both the sources and a
    build, but `e2e-build` has had both since before the check existed.
    #97 took the published front door and sandbox 317 bytes over their
    ceilings, and only a later local gate run found it.
  - **What it does now:** `e2e-build` runs the check before its specs,
    against its checkout and the `dist/` artifact, with a five-minute step
    timeout. It takes about a minute, and that job finishes well before the
    slowest sources shard. `tools/route-budget.mjs` now waits for its static
    server to answer instead of sleeping 800 ms, which under load let the
    first route be refused.
  - **Cost:** no ceiling moved, and nothing in the application changed.
- **A remediation step could tell a student whether a held prediction was
  right** before the experiment did (COMPOSER.md).
  - **What it did:** a pack could put a remediation step (`when`) on a held
    prediction (`reveal`) before the step where the prediction is marked.
    The lesson panel held the verdict on screen, but Next showed that step
    to students who predicted one way and passed over it for the rest. Where Next went was the verdict, so the answer key, not
    the experiment, settled the prediction.
  - **What it does now:** the composer refuses such a step as `whenHeld`, on
    its "Shown to" field, in English and Spanish, and that list no longer
    offers a prediction before it is marked. `js/authoring/rules.js` refuses
    the same thing as `interaction/when` in any lesson. The engine also
    treats a held prediction as unanswered until its reveal step is reached,
    as the panel already did. So a preview staged by an older composer passes
    over the step for every student, and shows it on the way back once the
    prediction is marked.
  - **Tests:** `tests/investigationPack.test.js` refuses remediation before
    the reveal, answered either way or with the reveal moved past it, and
    accepts it after. `tests/composer.test.js` does the same through the
    lesson checker and the whole verdict. `e2e/composer.spec.js` checks the
    list and the refusal on the page. It also stages the old shape in the
    preview and presses Next after a right and after a wrong prediction:
    both land on the same step.
  - **Cost:** deferred JavaScript is 178 bytes larger, inside its 4180 KB.
    No route or request ceiling moved.
- **A saved answer with a double quote in it broke out of its box.**
  - **What it did:** the lesson panel wrote a saved numeric answer and a
    saved measure field back into `value="…"` with `escape()`, which is
    `escapeHtml()` from `js/lessonMarkup.js`. That is for element text and
    leaves `"` alone. A student who typed a quote got back only what came
    before it, and the rest was read as more attributes of the box. Saved
    answers are also restored from progress backups, which accept any string,
    so an edited backup could put an `onfocus` on the lesson page and run it.
  - **What it does now:** both use `attr()`, which `js/investigations.js`
    already had for its other attributes. Nothing else in `js/` writes typed
    or imported text into an attribute that way: the other panels' own
    escapers already escape the quote.
  - **Tests:** `e2e/answerEntry.spec.js` types a breakout string into the
    numeric box of Kepler's Laws, and restores one from a crafted backup into
    a measure field. Each step is reopened from storage in a fresh page, and
    must hold the whole string, with no attribute added and nothing run when
    it is focused.
- **Fifteen expected observations reached no document.**
  - **What it did:** the answer key leaves out a step that only asks students
    to read or watch, and it left that step's expectation out with it. The
    authoring rule `instructor/expectations` accepts an expectation on any
    step, and its comment said the key printed one against every entry; for a
    reading step it did not, and the instructor guide prints no expectations,
    so 15 of the 238 were in neither. They were the balance point in Weighing
    the Stars, both horizon screens of Black Holes by the Numbers, five
    screens of Tides, three of What Is a Gravitational Wave?, and one each in
    The Goldilocks Question, Can You Detect This Planet?, Listening to
    Spacetime and A Universe of Stars.
  - **What it does now:** a reading step with an expectation is printed in
    the key like any other entry: its heading, "Reading", and the expected
    observation. A reading step without one is still left out, and the key's
    opening note says which. The expectations were kept rather than refused or
    moved, because each describes its own screen (the numbers on its readout,
    what to say aloud about it) and five of the steps beside them have one of
    their own. The rule's comment now says what the key does, and its summary
    no longer says an expectation must point at a step that grades.
  - **Tests:** `tests/instructorMaterials.test.js` finds every expectation's
    opening words under its own step's heading in its lesson's key, so one
    printed against the wrong step fails as well as a missing one. Before
    this change it failed the eight lessons above, and an expectation looked
    up one step off fails all 24. "Reading-only steps are left out of the
    key" now checks both halves on Black Holes by the Numbers, which has
    both kinds.
  - **Cost:** nothing in the browser; the keys are built in Node. The
    published keys change when the encrypted instructor bundle is next
    rebuilt, which needs the passphrase.
- **A screen reader heard a repeated announcement once, and then never.**
  - **What it did:** `announce()` in `js/notify.js` returned early when a
    message was the one it had last written to `#srStatus`, and nothing
    reset that. The lesson panel announces nothing between steps, so a
    student who answered two graded choices right in a row heard "Correct."
    for the first and silence for the second (Black Holes by the Numbers,
    "What did doubling do?" then "Read the graph"). With held predictions
    announcing their note, the two in a row in Lagrange Points that name the
    same reveal step would have said it once. A toast repeated for a second
    click was silent too.
  - **What it does now:** a repeat is announced again. Writing the words the
    region already holds is not a change a screen reader reads, so a repeat
    gains or drops a trailing no-break space, which is not heard. The dedupe
    had one real use, and it stays there: every world build announces
    "Scenario loaded", and a parameter sweep builds the same world once per
    trial, and a lesson stage whose scene was replaced rebuilds it from a
    timer. That caller passes `again` false and says a scenario once until
    something else is said. No other caller of `announce()` or `toast()`
    fires on a timer or per frame.
  - **Tests:** `tests/notify.test.js` announces a message, waits a frame and
    announces it again, and checks the region changed each time and reads
    the same words; `again` false says a repeat once. In
    `e2e/investigations.spec.js`, a student resumed at "What did doubling
    do?" answers it and the next step right, and a MutationObserver on
    `#srStatus` must see "Correct." twice. `e2e/accessibilityManual.spec.js`
    builds Solar System five times and allows one "Scenario loaded" at most.
    The first two fail on v2, and the last fails without the caller's
    `again` false.
  - **Cost:** 29 bytes of start-up JavaScript and none deferred, and no
    request. `js/notify.js` loads on every route, so in the sources, where
    comments count, it is 321 bytes on the front door, the sandbox, every
    lesson and the figure page. The front door and the sandbox have 109
    bytes of their sources ceiling left. No ceiling moved.
- **A screen reader was told how a held prediction did before the
  experiment.**
  - **What it did:** a prediction that names `reveal` shows no verdict and no
    explanation until the student reaches that step, only the note that the
    answer is recorded. The choice handler graded it anyway and announced the
    result in `#srStatus`: "Correct." for a right answer, and "Recorded."
    followed by the whole `because` for a wrong one. A screen-reader user
    heard the answer key at the moment of commitment, in every lesson, while
    a sighted student was told nothing.
  - **What it does now:** a held prediction announces the note under its
    options, read from the page, so it names the step that will settle it in
    the same words, English or Spanish. A graded choice, and a prediction
    whose reveal step has already been reached, still announce the verdict
    at once.
  - **Tests:** `e2e/predictionLoops.spec.js` now checks the announcement in
    each of its sixteen loops, which commit a wrong answer: it must equal the
    note and contain no sentence of the explanation. A new test commits a
    right answer and checks "Correct." is not announced. Two more check that
    a graded choice still announces "Correct." or "Recorded." with its
    explanation. The held tests fail on v2.
  - **Cost:** 46 bytes of deferred JavaScript, which is on every lesson
    route, and no request.
- **An instructor guide printed lesson markup as text.**
  - **What it did:** `js/instructorDocs.js` put the prose in
    `js/data/instructorContent.js` on the page as written, and Listening to
    Spacetime's guide said `the black holes' <em>motion</em>` and
    `<em>inspiral</em>` in two of its misconceptions. Its expected observation
    for step 2 has the same tags, but the answer key leaves out reading steps,
    so it never printed. Lesson titles, durations and levels, and each PDF's
    `/Title`, were not flattened either, though none holds markup today. The
    same prose is written in template literals, so its lines also broke
    wherever the source line wrapped, and 70 of its 86 paragraph breaks
    printed as two blank lines rather than one.
  - **What it does now:** each document converts a lesson's instructor
    content whole, so a field added later is covered too. Every string goes
    through `plainText()`, one paragraph at a time: tags come out, entities
    are decoded by the table in `js/lessonMarkup.js`, a wrapped source line
    folds into a space, and a blank line stays one paragraph break. The
    answer key's step titles, its lesson title, subtitle, duration and
    level, and the activity guides' prior knowledge go through
    `plainText()` too.
  - **The angstrom sign:** `&#8491;` decodes to U+212B, which WinAnsi has no
    code for, so `js/pdf.js` would have printed "?". It now prints Å
    (U+00C5), the letter it normalizes to. Only step bodies in A Universe of
    Stars use it, and no PDF prints a step body, so no document had shown it
    yet.
  - **Tests:** `tests/instructorMaterials.test.js` now fails any inline tag
    (`<em>`, `<strong>`, `<sub>`, `<sup>`) as well as any entity, in the text
    and the `/Title` and `/Subject` of every lesson's guide and key, and in
    the adopter guide and curriculum map. A new test per lesson checks that
    the overview prints the paragraphs it was written in, and that no line
    is broken while it has room for the next word. `tests/pdf.test.js`
    checks the angstrom sign. On v2 these fail 21 times: the tags in one
    lesson, the source line breaks in 19 overviews, and the "?".
  - **Cost:** 32 bytes of deferred JavaScript, which is 14 in the lab
    report's chunk and 18 in the authoring chunk. On each lesson route that
    is 14 bytes in the build and 176 in the sources. No ceiling moved.
  - **Not yet in the published bundle:** the encrypted instructor materials
    still hold the old PDFs until they are rebuilt with the passphrase
    (`npm run build:instructors`).
- **Refresh Scenario emptied a world a link had brought its own bodies to.**
  A link with bodies and no scenario, such as a shared Blank Simulation
  world, now rebuilds those bodies, as it already did for a built system.
- **A Composer pack's step id could add attributes to the lesson panel.**
  - **What it did:** a step's `sid` only had to be 1 to 80 characters, with
    no colon and not only digits, in the pack format
    (`js/platform/investigation.js`) and in the lesson checker
    (`js/investigations/progressSchema.js`). The panel writes
    `<lesson>:<sid>` into attributes without escaping it, and since the
    Investigation Composer (#98) opens a pack from a file, a sid is text
    someone else may have written. A quote in one ended `data-field="…"` on a
    measure step's input, and the rest of the sid became attributes of it: a
    preview of such a pack gave the field an `autofocus` and an `onfocus`
    handler, and focusing it ran the handler on the lesson page.
  - **What it does now:** a sid is lowercase letters, digits and single
    hyphens, like every other public id in a pack, and still not only digits.
    Both copies of the rule say so, and so does the Composer's message on the
    field. Every sid in the built-in lessons, their Spanish and the capability
    packages already had that form. The lesson panel refuses to open a lesson
    with any other sid, which covers a preview an earlier Composer staged, and
    it escapes the step key with `attr()` in every attribute it is written
    into (the checklist, the written and numeric answers and their buttons,
    and the measure fields), and with `CSS.escape()` in the measure-field
    lookup.
  - **Tests:** `tests/investigationPack.test.js` and
    `tests/authoring.test.js` refuse a sid with a quote in a pack and in a
    lesson, and `tests/progressIdentity.test.js` holds both copies of the rule
    to one table. `e2e/composer.spec.js` opens a crafted pack file, which the
    Composer now marks and will not preview, and a crafted preview left in
    storage, which the panel now refuses, with no attribute added and nothing
    run.
- **Lesson prose showed its HTML entities as text** (STUDIO_ROUNDTRIP_GATE.md,
  bugs the audit found).
  - **What it did:** `prose()` escaped every `&` before it let its four tags
    back in, so an entity reached the screen as its name. Twelve Nights
    opened on "HD&nbsp;209458, from La&nbsp;Silla", and six lessons on the
    public site, and their Spanish, showed `&rsquo;`, `&deg;`, `&mdash;`,
    `&lt;` and `&amp;` the same way. It also reached the verdict on a held
    prediction ("You predicted: The star&rsquo;s gravity"), the screen-reader
    announcement after a choice, and the choice group's accessible name. The
    student lab report had its own `plain()`, which decoded nothing, so a
    student who chose such an option handed in a PDF that said so.
  - **What it does now:** `js/lessonMarkup.js` holds `prose()` and one entity
    table, read by the lesson panel, the lab report and the answer keys, so
    screen and paper cannot disagree. `prose()` decodes after it escapes and
    escapes what it decodes, so `&lt;` is only ever text. The table lists the
    15 names lessons use (it gained `&beta;`), as the characters HTML gives
    them: `&nbsp;` is a no-break space on screen, and the PDFs still fold it
    to a space. The choice group is now named by the prompt on screen
    (`aria-labelledby`), which also ends names cut short at a `"`. What a
    student wrote is printed as typed, because the completion code is
    computed over it.
  - **Tests:** `tests/lessonMarkup.test.js` renders through the real
    `prose()` into a DOM, checks each table entry against jsdom's HTML
    parser, fails any lesson, English or Spanish, that uses an unlisted
    entity, and prints a lab report for every lesson. The lesson walk
    (`e2e/authorWalk.spec.js`) now fails a step that shows an entity by name,
    and `e2e/investigations.spec.js` reads Twelve Nights and a held
    prediction in Chromium.
  - **Cost:** on each lesson route, 726 bytes and no request in the build,
    and 3,088 bytes and one request in the sources. The module shares the
    chunk `js/answerCheck.js` is in, and the lab report is handed the decoder
    as it is handed `checkAnswer`, so it stays there. #79 to #81 had used the
    lesson routes' room first, so their four ceilings in
    `tools/route-budgets.json` rise by exactly that, 0.8 KB and 3.1 KB. No
    request ceiling moved, and deferred JavaScript is 81 bytes larger, inside
    its 4180 KB.
- **A full link, or a saved state, measured drift against the wrong world.**
  The conservation baseline was taken over the world the restore then
  replaced.
- **A link made from a world with no scenario behind it opened differently
  in different tabs.** Such a world comes from Blank Simulation or the
  builder. The link rebuilt on top of whatever scenario the reader's tab had
  open; it now rebuilds from the defaults its settings were measured
  against.
- **A gas giant restored from a link had no mass in Jupiter masses and no
  giant type.** Share links now carry both, and carry `persistent`, so a
  wide system keeps its outer bodies when someone zooms in.
- **Blank Simulation left the energy history of the bodies it deleted.** It
  now clears the world with `clearWorld()`, not a hand-written copy of it.
- **A FITS header can no longer make the data-pack reader allocate or loop**
  (VO_ARCHIVE_GATE.md, finding 4).
  - **What it did:** `readFits()` in `tools/data-packs/fits.mjs` (and in the
    SDK) used header numbers before it checked them against the file. From a
    2,880-byte file, `NAXIS = 50000000` took 32 s and 421 MB, and
    `NAXIS = 2000000000` ran out of heap. A negative `PCOUNT` stepped the walk
    back onto the same header, and the reader never returned.
  - **What it does now:** it walks every header first. It refuses the file,
    naming the card and its value, when `NAXIS` is outside 0 to 999, an axis
    length or `PCOUNT` is not a whole number, `BITPIX` is not one of the six
    FITS defines, `TFIELDS` is outside 0 to 999, a `BINTABLE` does not have
    two axes, or the product of the axes passes the file's length. It also
    refuses a data unit that runs past the end, a header that goes 100 blocks
    without an `END`, and more units than `maxUnits` (16). Only then does it
    decode anything.
  - **Real files are unaffected.** The three TESS light curves in the pack
    cache read exactly as before, and every pack rebuilds byte for byte. The
    tests run on the real headers of the two light curves the packs use,
    kept in `tests/fixtures/fits/`.
  - This was harmless while the reader saw only pinned maintainer downloads.
    It had to be fixed before any browser reads FITS.
- **The Experiments bench's energy and angular momentum drift were not drifts.**
  Since the bench shipped in 1.0.0, both were the system's total energy and
  angular momentum times a hundred, labeled "%". On Binary Planet Lab that was
  −25001.44 "%" for a real drift of 0.00017%. `sampleFrame()` read the
  engine's `energy` and `angular` fields as fractions, and those fields are
  the totals. It now reads the percentages the engine computes, and a baseline
  too close to zero stays a gap rather than becoming a perfect 0. The
  reliability check no longer judges a drift as a conclusion, because halving
  the step is meant to move it. The old rows said "unchanged" only because
  both runs had recorded the same total. Saved experiments (schema 3) open
  with the old drift values removed, and say so. They cannot be converted,
  because the record does not hold the baseline they would be measured from,
  but the captured start is kept, so recording the runs again measures them.
  CSV files and manifests exported before this fix carry the wrong figures in
  their `energy_drift_pct` and `angular_drift_pct` columns and drift results.
- **A recorded drift is measured at the sample it sits in.** The bench read
  its drift from the engine's readout cache, which refreshes at most every
  100 ms, while it measured the total energy fresh in every sample. At 60 fps
  about five samples in six carried a drift from an earlier frame than their
  own energy. Measured in Chromium on a 60 fps clock, Binary Planet Lab
  repeated its energy drift on 199 of 240 samples, and Kepler's 2nd Law on 200
  of 240. Kepler's final drift was 0.01524% where the world at that instant
  gave 0.01504%. Recorded runs, sweeps and the reliability check now measure
  the totals once per sample and derive the drift from them, so each sample's
  drift is exactly its own total's. This adds no work, and a sweep or check
  that selects no conserved quantity no longer computes the O(N²) totals at
  all.
- **Links on the figure builder were the browser's default blue on a
  near-black page, 2.2:1 against the 4.5:1 required.** They now use the
  document pages' accent colour, and the page's own landmark is labelled
  apart from the one in its preview frame.

- **The play button speaks the reader's language.** Once the simulation had
  been paused or resumed, its label and tooltip were set to English literals,
  so a Spanish screen reader heard "Play simulation" over a Spanish interface.
- **A corrupt share link no longer leaves an uncaught error.** Decoding one
  failed correctly, but the decompressor's write was never awaited, and its
  rejection surfaced as an unhandled "invalid block type" beside the message.

- A CSV cell that starts like a spreadsheet formula was wrapped in quotes and
  treated as safe, but a spreadsheet strips the quotes and runs what is inside.
  Every export now prefixes such a cell with an apostrophe, so it opens as text,
  and looks for the formula behind leading spaces, control characters and
  full-width look-alikes; plain numbers are unchanged. The classroom evidence
  kit, which had its own writer with no protection at all, uses the shared one.
- At 900 px wide and below, a lesson with an instrument docked showed no
  question, no answer boxes and no Next button: the bottom sheet was capped in
  height with `overflow: hidden`, and the step body was the only part allowed to
  shrink. The whole sheet now scrolls, Back and Next stay pinned to its bottom
  edge, and each step opens at its heading. The two layout specs that should
  have caught it scrolled boxes no reader can scroll; they now scroll only what
  a finger or a wheel could, and name the box that clips a control. The
  phone-width lesson walk runs in Firefox and WebKit as well.
- The MOND fit in _The Missing Mass_ labeled its horizontal axis with its own
  translation id, `dmW.radiusKpc`, in both languages, because the string was in
  neither catalog.
- Keyboard placement began its aim off the center of the view at the low
  quality tier, because it used a CSS-pixel half-width as a canvas coordinate.
- The Pluto–Neptune 3:2 check on `/validation/` was labeled a published value
  while measuring periods the integrator produced. It is an integration check
  now, renamed to say what it measures, with its value and tolerance unchanged.
  A run that produced no conjunctions would have made the whole suite report
  that it could not run; that case now costs one failed row.
- `npm run instructors:check` could report a stale instructor bundle as current.
  Its digest named a fixed list of files and missed several the build reads,
  including the prose of every instructor guide, the activity teaching notes and
  the instructor schema, so rewriting any of them left the recorded digest
  unchanged. The covered set is now derived from the builder's import graph,
  and the manifest records each input's own hash, so a failure names the file.
- `npm run author:new` appended the new lesson's import to the end of the
  previous line of `js/data/investigations.js`, so a freshly scaffolded lesson
  failed `format:check` and `lint` in a file its author never opened.
- Four statements in the public documentation that the code contradicted.
  `paper.md` named velocity Verlet as the integrator where symplectic Euler is
  the default, and said the whole browser suite runs in Firefox and WebKit where
  only a tagged subset does; `PERFORMANCE_OPTIMIZATIONS_SUMMARY.md` said physics
  is handed to the Barnes–Hut worker when the body count justifies it, where
  only an opt-in setting turns it on; and `/model/` said seven stellar tracks
  above a list of eight. The track count is now generated, and
  `tests/truthSurface.test.js` holds the prose claims to the code.
- The published size of the message catalog counted two of its five
  fragments per language. `README.md` and the manual said the interface ships
  from a catalog of 3691 strings when it held 4017: the activities, teaching and
  placement strings split off for download size were invisible to the count,
  and two tests that sweep the catalogs had each missed a different file. Every
  reader of the catalog now finds its fragments by one rule, and a fragment
  added for one language only, an id defined in two fragments, or a translation
  filed in a different fragment from its original fails `npm run i18n:check`.
- The browser test of the signed-in instructor portal reused the first fixture
  a checkout ever built, so after a lesson was added it went on testing an
  inventory the sources no longer described. The fixture now carries a stamp of
  every input that decides what it says and is rebuilt when any of them moves;
  the real instructor bundle and its release check are unchanged.
- Counts the documentation had stopped keeping true. `README.md` and
  `LICENSES.md` said "the 22 investigations" over a catalog of 24, and the
  summary of `paper.md` said 22 investigations, 636 steps and 243 physics
  checks. The license lines now cover every investigation without a count; the
  paper's counts are generated and held to the source by `npm run docs:check`;
  and a test sweeps the documents that describe the current software for any
  investigation count that disagrees with the catalog.
- `EXOPLANET_OBSERVING.md` still warned that the Jupiter mass unit was wrong by
  a factor of 52.4 across the application. It had already been fixed, derived
  from the solar mass and checked on `/validation/`; the note now says so.
- The contributor instructions told a contributor to run `npm run build`, which
  needs the instructor passphrase and stops without it - including in the
  command for running the browser suite against the build, in `README.md` and
  `e2e/README.md`. They now name `npm run build:ci`, the same build with a
  throwaway key and the one CI runs. The README also said Firefox and WebKit
  run only on pushes to `main` and weekly; they run on every push to `main` and
  `v2`, weekly and on a manual run, and never on a pull request.
- `npm run archive:check` printed only the last few lines of a failing step, so
  the instructor bundle's list of stale inputs came out as its last three
  entries and read as the whole list. Every input that moved is now printed;
  the tail of any other failure is unchanged.
- The gravity-assist comparison could refuse to start, saying only
  "duration", if the world was paused in the moment after _Run_ was pressed.
  The runner first watches ten frames to see how fast the world really
  advances, and it averaged over all ten, so a world paused after one of them
  read as running at a tenth of its speed; the comparison was then sized ten
  times too long and refused for exceeding the sweep's limit. The rate is now
  taken over the frames that actually advanced, which is also what the
  runner's budget counts. The binary laboratories' sweeps share the
  measurement and were exposed the same way. The browser test that freezes the
  world under the comparison hit this intermittently, and then waited eight
  minutes for a report that could not come; a refused run now fails it at
  once, with the reason and the duration it was sized at.

## [1.0.0] - 2026-09-16

The first tagged release. Everything below was developed before v1.0.0 and is
listed here because this is the release that first carries it.

### Added

- **An instructor portal that explains itself.** `/instructors/` states what is
  behind the passphrase before asking for it, says plainly what client-side
  encryption on a static host can and cannot promise, and presents the
  <!--fact:instructorDocuments-->66<!--/fact--> documents grouped by investigation
  with their kind and size. A wrong passphrase and a missing bundle now report
  as the different problems they are.
- **Dual licensing.** The code is MIT; the original educational material is
  CC BY 4.0 ([LICENSE-CC-BY-4.0.md](LICENSE-CC-BY-4.0.md)); third-party
  material keeps its own terms ([NOTICE](NOTICE)). [LICENSES.md](LICENSES.md)
  says which covers which files.
- **A paper.** `paper.md` and `paper.bib`, for submission to JOSE.
- **A schema for instructor content.** `js/authoring/instructorSchema.js`
  declares what every field has to be, including the minimum length of a
  record's label and of its body separately, and the bundle will not build
  without it.
- **Community and security files.** `CODE_OF_CONDUCT.md`, `SECURITY.md`,
  `SUPPORT.md`, and `.nvmrc` pinning Node 20.

- **Controlled A/B activities in two more investigations.** _The Butterfly
  Effect in Space_ replaces nine manual bench steps with one action that
  captures the start, selects the bodies and metrics, records Run A, returns,
  applies the 1,500 km nudge and records Run B — both arms over the same
  simulated interval, with the perturbation named as the only difference. Its
  numerical controls now halve the step the engine was **measured** taking
  rather than the playback speed, which in this laboratory changed nothing at
  all, and a repeat that did not change the arithmetic is refused as evidence.
  _Where Can It Get To?_ gains a short controlled pair: one tracer, one place,
  one rotating-frame speed, two directions — so the Jacobi constant and the
  whole accessible region are identical by construction and the trajectory is
  the only thing that can differ. One direction crosses the L1 neck a tenth of
  a period in; the other never comes near it in two binary periods, and the
  panel says that "did not cross during this run" is not "can never cross".
  Both activities keep the student's prediction whether or not it was right,
  refuse to overwrite an experiment somebody else recorded, and restore the
  world and every setting after a cancellation.
- **Parameter sweeps in two investigations, replacing what was repetitive
  rather than what was instructive.** In _Planets in Binary Stars_, five
  starting radii over the same twenty-period window, each watched by the
  binary watcher and reported as a physical outcome - still there, ejected,
  hit a star, window not finished - with periods done against periods asked
  on every row, and one trial re-runnable at half the step. In _Where Does a
  Gravity Assist Get Its Speed?_, both sides of the planet run as one retained
  A/B comparison so the two results sit on screen together, and an optional
  five-value sweep of the impact parameter on the gaining side. Both are built
  on the A/B bench: the world is captured before the first trial and restored
  after the last, cancellation keeps what it measured, and each trial is read
  by the same recorder that reads a hand-flown pass, so a mean speed is never
  offered as evidence about an encounter. In each lesson the hand-run examples
  stay and come first, the prediction is a prerequisite of the run, the plots
  are points with no curve through them, and results go into the notebook with
  the seed and the settings they actually ran at.
- **A new investigation, "Can You Detect This Planet?"** A 15-to-20-minute
  lesson about observational design rather than about physics: students plan two
  radial-velocity runs of the same star, with the same instrument and the same
  twelve measurements, and find that one detects a hot Jupiter unambiguously
  while the other - eleven times the baseline, not one measurement fewer -
  cannot say anything, because its cadence matches the orbital period. It closes
  on what a marginal result licenses and on the limits of a nondetection.
- **A synthetic observing mode in the radial-velocity panel.** Opt-in. Given a
  cadence in simulated days, a baseline and a Gaussian uncertainty in m/s, it
  keeps only the measurements that schedule would have produced and records
  nothing between them. The noise comes from a generator of its own, seeded by
  name, so a run is reproducible without touching the world's own random stream
  or its dynamics; measurements are scheduled on the simulation clock, so they
  do not depend on the frame rate. The continuous curve stays available behind
  them as a labeled teaching overlay. Runs export through **Export data ->
  Radial velocity measurements**: one row per measurement, carrying the
  uncertainty, the target and the observing configuration.
- **Offline support.** A service worker precaches the application shell, the
  <!--fact:scenarios-->59<!--/fact--> scenario thumbnails and all
  <!--fact:investigations-->24<!--/fact--> English lessons, so a class keeps
  working when the room's wifi drops. The cache name is a content hash, so a
  build invalidates it. See [OFFLINE_AND_LOW_END.md](OFFLINE_AND_LOW_END.md).
- **A measured low-end quality tier.** Chosen from the frame rate the machine
  is actually achieving rather than from a user-agent string: reduced body
  counts, a capped resolution and the expensive full-screen effects switched
  off.
- **An investigation authoring toolchain.** `npm run author:check` validates
  every lesson and every one of the
  <!--fact:investigationSteps-->683<!--/fact--> steps; `npm run author:new`
  scaffolds a lesson with its translation shadow and instructor stub;
  `?author=<lesson>&step=<n>` opens any step with diagnostics without touching
  a student's saved progress; and a browser walker exercises every step of
  every lesson.
- **An architecture check.** `npm run check:architecture` fails on an import
  cycle or on a low-level module importing a coordinator.
- **A bundle budget.** `npm run budget` holds the initial download to a written
  ceiling; raising it means saying why in the same commit.
- **Accessibility checks in CI.** axe-core over <!--fact:axeSurfaces-->34<!--/fact--> surfaces in both
  languages and both themes, plus keyboard, focus-trap, reflow and reduced-motion tests.
  See [ACCESSIBILITY.md](ACCESSIBILITY.md).

### Changed

- **The instructor guides carry teaching content**, not a restatement of the
  lesson a student already has.
- **`css/page.css` is no longer part of `app.css`.** Four documentation pages
  load it and the sandbox never does, so it was download the first visit did
  not need: the initial download falls from 832.3 KB to 811.0 KB.

- **The build is self-contained.** three.js, Chart.js and the three font
  families were fetched from jsdelivr and Google Fonts at runtime; they are now
  pinned, bundled into `vendor/` and served from this origin. The application
  makes no third-party network request during normal use.
- **The module graph.** Shared state moved out of `js/ui.js` into
  `js/appState.js`, removing eleven import cycles.
- **Contrast, landmarks and focus management** across the interface, to meet
  WCAG 2.2 AA.

### Fixed

- Five instructor guides shipped with a table that rendered blank, because the
  renderer was handed rows it could not lay out and said nothing rather than
  refusing. One shipped with 590 bullets from a list built at the wrong level
  of nesting.
- Five investigations ended on a step that dropped its instrument, leaving a
  wall of text as the last thing a student saw. They close on the instrument
  they were built around, in both languages.
- A family of spelling corruptions from an old find-and-replace - `realiztic`,
  `characteriztic`, `optimiztic`, `centerd` - across the interface strings, the
  scenario descriptions and the code comments. Two translation keys were
  corrupted with them and are renamed at every use.
- `npm run author:check` warned about every staged value that did not land on a
  slider tick. It now accepts an off-grid value when a preset of the same
  widget sets that control to exactly it, which is what a student presses to
  get back.

- A widget in the radial-velocity lesson that had never drawn: its `draw`
  shadowed the imported translation function with the color palette, so the
  first row threw and the canvas stayed blank.
- Three computed fields in Why Mars Goes Backwards that could only ever be
  empty, because they read a value measured on an earlier step.
- Escape did not dismiss a dialog when focus was in a text field, which made
  the share dialog and the scenario gallery keyboard traps in practice.
- Three modal dialogs declared `aria-modal="true"` without trapping focus.
- Stale counts across the documentation: `/model/` claimed 135 physics checks
  against a suite of <!--fact:physicsChecks-->286<!--/fact-->, and 48 scenarios
  against a catalog of <!--fact:scenarios-->59<!--/fact-->.

### Removed

- The runtime import map and the injected Chart.js script tag.
- `aria-hidden="true"` from the 3-D viewport, which had been hiding two
  focusable buttons from assistive technology.

[Unreleased]: https://github.com/gravitas-sim/gravitas-sim.github.io/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/gravitas-sim/gravitas-sim.github.io/releases/tag/v1.0.0
