#!/usr/bin/env node
/**
 * Generate the service worker's precache manifest.
 *
 *   node tools/build-service-worker.mjs           write sw-manifest.js
 *   node tools/build-service-worker.mjs --check   fail if it is out of date
 *
 * Why this is generated rather than written by hand
 * -----------------------------------------------------------------------------
 * Two things have to be true at once and neither survives a hand-maintained
 * list. Every file the application needs offline has to be in it, or a
 * classroom loses a lesson when the wifi drops; and the cache name has to change
 * whenever any of those files changes, or a returning browser serves last
 * week's JavaScript out of its cache forever. Both are mechanical facts about
 * the tree, so the tree is what produces them.
 *
 * What gets precached, and what does not
 * -----------------------------------------------------------------------------
 * Gravitas is published as the repository root. There is no deploy step and
 * `dist/` is gitignored: GitHub Pages serves the unbundled sources, which is why
 * the live site answers for `/js/physics.js`. So this walks the source tree, not
 * the bundle, and the paths below are the paths the browser actually requests.
 *
 * In:
 *   index.html and the stylesheets       the shell
 *   every js/ module except the Spanish  the application, including every
 *     lesson shadows                     English lesson body - see below
 *   the scenario thumbnails              the gallery is unusable without them
 *   the one lesson photograph            a lesson figure, licensed for
 *                                        redistribution and served from here
 *   the two favicons                     small, and their absence is visible
 *
 * Out:
 *   js/data/investigations/es/*.js       runtime-cached; see below
 *   the user manual PDF                  a download, not part of the shell
 *   model/, instructors/,                separate document pages, runtime-cached
 *     validation/, teaching/
 *   notebooks/                           downloads
 *   social-card.png                      only ever fetched by a link unfurler
 *
 * On the lessons
 * -----------------------------------------------------------------------------
 * Each lesson is one dynamically imported file, so the question of which to
 * precache is a real one and the honest answer is not "all of them".
 *
 * Every English body is precached, about a tenth of the payload. The exact
 * figure moves with the lesson set and is not worth writing down here; the
 * generated manifest's own header carries the file count and total bytes it
 * measured, and `npm run sw:check` fails when they have drifted.
 *
 * The failure this whole exercise is about is wifi dropping mid-lesson, and the
 * lesson already open is by definition already fetched - what precaching buys is
 * the teacher who switches lesson *after* the drop, which is exactly the moment
 * a runtime cache has nothing. A tenth of the payload to remove that cliff is
 * worth it, and choosing a favorite subset would be guessing at which lesson a
 * class is about to want.
 *
 * The Spanish shadows are not precached: comparable weight again, only ever
 * fetched when the interface is in Spanish, which is a deliberate choice a
 * minority of readers make. They are runtime-cached on first use like anything
 * else, and js/main.js asks the worker to warm them when the language is
 * switched - so a Spanish classroom is covered from the moment it chooses
 * Spanish rather than from the moment it opens a lesson.
 */

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

import { LOCALES } from '../js/i18n/index.js';

/**
 * Where the translated lesson bodies live, one directory per locale.
 *
 * English is the base and has no shadow directory; every other locale has one
 * named for its id.
 */
const SHADOW_ROOT = 'js/data/investigations';
const SHADOW_LOCALES = LOCALES.map(l => l.id).filter(id => id !== 'en');

const OUT = 'sw-manifest.js';

/**
 * Directories walked whole, with the extensions taken from each.
 *
 * `core` decides what happens when one of them cannot be fetched at install
 * time. A core file is one the application is broken or unrecognisable
 * without: the shell, every module, the stylesheets, the self-hosted fonts and
 * the two vendored libraries. If any of those is missing the install fails and
 * the new worker never activates, because half a build is worse than the old
 * build - it is the mixed revision this whole arrangement exists to prevent.
 *
 * Everything else is a picture. A scenario thumbnail that 404s during install
 * is worth reporting and not worth refusing an entire version over: the reader
 * gets the new application with one missing preview, and the runtime cache
 * picks the picture up the next time it is asked for.
 */
const TREES = [
  { dir: 'js', ext: ['.js'], core: true },
  // The panels' markup, which each family fetches as it mounts. Core for the
  // same reason its modules are: a family that loads offline and cannot find
  // its markup is a family that does not open (INDEX_DECOMPOSITION.md).
  { dir: 'js/fragments', ext: ['.html'], core: true },
  { dir: 'css', ext: ['.css'], core: true },
  // The self-hosted fonts and the two vendored libraries. These used to come
  // from Google and jsdelivr, which meant the interface lost its typography
  // and the 3-D view and the charts stopped working the moment the network
  // did - the precise failure the offline support exists to prevent.
  { dir: 'vendor', ext: ['.woff2', '.js'], core: true },
  { dir: 'images/scenarios', ext: ['.webp'], core: false },
  // The investigation cards the Library, Home and the adoption pages show
  // (D-PERF-02, change 1): optional pictures, so a first offline visit to a
  // card list is not a grid of empty boxes.
  { dir: 'images/investigations', ext: ['.webp'], core: false },
];

/** Individually named files. */
const FILES = [
  { path: 'index.html', core: true },
  // The one document page that is meant to work offline: the observatory
  // opens observations the reader has already been given, and its modules are
  // all under js/, precached with the rest. Optional, so a page that fails to
  // fetch costs this page offline and nothing else. sw.js serves it for its
  // directory URL.
  { path: 'observatory/index.html', core: false },
  // The catalog: the page and its index, so a reader offline can still see and
  // remove what they installed. The archives are not precached: installing one
  // keeps it in IndexedDB, which is what makes it work offline
  // (js/catalog/store.js), and one not installed is not wanted offline.
  { path: 'catalog/index.html', core: false },
  { path: 'catalog/catalog.json', core: false },
  // The Library and its index (LIBRARY.md): optional, as the catalog is. What
  // it links to is precached, or not, by the page that runs it.
  { path: 'library/index.html', core: false },
  { path: 'library/library.json', core: false },
  // My work: the page, to open offline what the student made on this device.
  { path: 'my-work/index.html', core: false },
  // The authoring pages (D-PERF-02, change 1): Scenario Studio, the
  // Investigation Composer and the course builder. Their modules are already
  // core under js/, so these pages are all a first offline visit lacked.
  { path: 'studio/index.html', core: false },
  { path: 'studio/lesson/index.html', core: false },
  { path: 'studio/course/index.html', core: false },
  // The course home: a course link opens offline once Gravitas has been
  // opened, since the pack is in the link and the page's modules are under
  // js/. Optional, as the catalog is. The builder (studio/course/) is not.
  { path: 'course/index.html', core: false },
  // The 3-D lab and its guided investigations (LAB3D_CURRICULUM.md): the
  // page, its modules, three.js and the kernel are all optional, so a class
  // that has opened it once can work offline, and an install that cannot
  // fetch them loses only the lab.
  { path: '3d/index.html', core: false },
  // The mission lab (MISSION_LAB.md): the page, its modules, the ephemeris
  // pack and the solvers, optional as the 3-D lab's are.
  { path: 'mission/lab/index.html', core: false },
  // The Sky Lab and its star table (data-packs/sky-bright-stars.json).
  { path: 'sky/index.html', core: false },
  { path: 'sky/bright-stars.json', core: false },
  { path: 'sky/ephemeris.json', core: false },
  // The galactic tables' rows (data-packs/gaia-dr3-*.json, milky-way-rotation-curve.json).
  { path: 'gaia/solar-neighbourhood.json', core: false },
  { path: 'gaia/ngc2420.json', core: false },
  { path: 'gaia/milky-way-rotation-curve.json', core: false },
  // The variable-star tables' rows (Roadmap II Prompt 96).
  { path: 'variables/tess-su-dra-s15.json', core: false },
  { path: 'variables/tess-eta-aql-s81.json', core: false },
  { path: 'variables/shoes-r22-cepheids.json', core: false },
  { path: 'variables/class-sample.json', core: false },
  // The cosmology tables' rows (Roadmap II Prompt 91).
  { path: 'cosmology/hubble-1929-table1.json', core: false },
  { path: 'cosmology/des-sn5yr-hd.json', core: false },
  { path: 'cosmology/pantheon-plus-hd.json', core: false },
  { path: 'cosmology/sdss-dr18-redshift-slice.json', core: false },
  { path: 'cosmology/coma-cluster-quoted.json', core: false },
  { path: 'favicon.ico', core: false },
  { path: 'favicon.png', core: false },
  { path: 'images/transit-of-venus-2012.jpg', core: false },
];

/**
 * Data only the Observatory opens: the packs tools/build-data-packs.mjs builds
 * with no capability package (`capability: null`), so no package declares
 * their offline class. Optional, like the page that opens them, rather than
 * core as the walk of js/ would make them. Named rather than inferred;
 * tests/dataPacks.test.js fails for a pack left off.
 */
const OBSERVATORY_ONLY = new Set([
  'js/data/observations/sdssNgc2420Photometry.js',
  'js/data/observations/sdssNgc2420Segue.js',
  'js/data/observations/mistSdssIsochrones.js',
  'js/data/observations/gaiaSolarNeighbourhood.js',
  'js/data/observations/gaiaNgc2420.js',
  'js/data/observations/milkyWayRotationCurve.js',
  // The variable-star packs' records (js/variablesData.js); the rows are sidecars.
  'js/data/observations/tessSuDraS15.js',
  'js/data/observations/tessEtaAqlS81.js',
  'js/data/observations/shoesR22Cepheids.js',
  // The cosmology packs' records (js/cosmologyData.js); the rows are sidecars.
  'js/data/observations/hubble1929Table1.js',
  'js/data/observations/desSn5yrHd.js',
  'js/data/observations/pantheonPlusHd.js',
  'js/data/observations/sdssDr18RedshiftSlice.js',
  'js/data/observations/comaClusterQuoted.js',
  // The radiation kernel's data (Roadmap II Prompt 82): loaded on demand by
  // js/kernels/radiation/packs.js, and by no page's start-up.
  'js/data/radiation/bandpasses.js',
  'js/data/radiation/lines.js',
  'js/data/radiation/extinction.js',
  'js/data/radiation/bolometric.js',
  'js/data/radiation/gaiaBandpasses.js',
  // The Sky Lab's star pack (js/kernels/sky/packs.js): the rows are a fetched
  // file, and this module is read only for its hash.
  'js/data/sky/brightStars.js',
]);

/**
 * The physics validation suite and its DOM stand-in, which the /validation/
 * page's live run loads in its Worker on demand. They lived in tools/, which
 * was never precached, until tools/ stopped being published (Roadmap II,
 * Prompt 47); under js/ the walk would make them core, adding 290 KB to every
 * reader's install for a page one reader in many opens. Kept out, as before:
 * the live run needs the network either way.
 */
/**
 * The compute page (COMPUTE.md) is online only and opt-in: its page, its
 * modules, its notebooks and its example inputs are never precached, so no
 * install downloads them and no offline reader is promised them.
 */
export const NEVER_PRECACHED = [
  /^js\/compute\//,
  /^js\/computePage\.js$/,
  /^compute\//,
  /^compute-frame\//,
  // The numerical routines no shipped module imports yet (Prompt 152,
  // NUMERICS.md): no page can fetch one, so an install has no use for it, and
  // the first-visit tier has little room. quadrature.js (flrw.js) and linalg.js
  // (fit.js) are imported and so installed. Each of these three is deleted from
  // this list by its first adopter, and tests/numericRoutines.test.js fails
  // until it is: a module a page imports is installed, and its bytes are that
  // change's to find.
  /^js\/numeric\/(roots|interp|polyfit)\.js$/,
  // The Worker pool (Prompt 153, WORKER_POOL.md): no shipped module imports it
  // yet, so no page can fetch it and an install has no use for it, and the
  // first-visit tier has 49 bytes of room (the adoption is a wait: its
  // measured cost is in D-R10-30). Its first adopter deletes this entry, and
  // tests/workerPoolAdoption.test.js fails until it is deleted.
  /^js\/workers\/pool\.js$/,
  // The data kinds (Prompt 157, DATA_PACKS.md): the image, sequence and grid
  // contracts, the bounded local FITS reader and its Worker. The first adopter
  // is the image marks instrument (Prompt 179), which takes the contract and
  // the limits into the idle group "image measurement" below. The planes, grid
  // and draft files, the FITS reader, its job and its Worker are imported by no
  // shipped module yet, so no page can fetch one and an install has no use for
  // them; the idle tier has no room for them (a data-budget ceiling, not one
  // the standing size approval covers), and the first-visit tier has 18 bytes.
  // The adopters (the sequence and grid consumers) delete their entries, and
  // tests/dataKindsInstall.test.js fails until they do. Local import (Prompt
  // 188) takes the FITS reader, the picture reader and the Worker through the
  // import panel below, which is itself never precached, so these stay out
  // too: the service worker keeps each after its first online use.
  /^js\/dataKinds\/(fits|fitsJob|fitsWorker|raster|rasterJob|planes|grid|draft)\.js$/,
  // The statistics kernel (Prompt 154, STATISTICS.md): no shipped module imports
  // it yet, so no page can fetch it and an install has no use for it, and the
  // first-visit tier has 21 bytes of room (the adoption is a wait: its measured
  // cost is in D-R10-31). Its first adopter deletes this entry, and
  // tests/statisticsKernel.test.js fails until it is deleted.
  /^js\/kernels\/statistics\//,
  // Sky coordinates for an image (Prompt 181, ASTROMETRY.md): the WCS-lite and
  // registration kernel, the calibration record, the panel and its words,
  // fetched when a reader opens the Observatory's sky-coordinates panel on an
  // image. The idle tier has no room under a data-budget ceiling the standing
  // size approval does not cover, so none of the files is installed: the
  // service worker keeps them after their first online use, and until then the
  // panel says it needs the network. D-R10-57.
  /^(js\/measure\/(astrometry|calibrationRecord)\.js|js\/observatory\/imageCalibration\.js|js\/i18n\/(en|es)\.imageCalibration\.js)$/,
  // Photometry on an image (Prompt 180, PHOTOMETRY.md): the adapters, the
  // panel and its words, 21.4 KB gzipped as source, fetched when a reader opens
  // the Observatory's photometry panel on an image. The idle tier has 266 B of
  // room under a data-budget ceiling the standing size approval does not cover
  // (Node 22, after #417) and the first-visit tier a few KB, so none of the
  // files is installed:
  // the service worker keeps them after their first online use, and until then
  // the panel says it needs the network (the marks instrument beside it stays
  // an idle-tier file). D-R10-56.
  /^(js\/measure\/photometry\.js|js\/observatory\/imagePhotometry\.js|js\/i18n\/(en|es)\.imagePhotometry\.js)$/,
  // Sources and the width of the stars (Prompt 183, DETECTION.md): the
  // detection kernel, the panel and its words, fetched when a reader opens the
  // Observatory's sources panel on an image. Same reason as the two above: the
  // idle tier has no room under a data-budget ceiling the standing size
  // approval does not cover, so none of the files is installed and the panel
  // says it needs the network the first time. D-R10-60.
  /^(js\/measure\/detect\.js|js\/observatory\/imageDetect\.js|js\/i18n\/(en|es)\.imageDetect\.js)$/,
  // Completeness by injection (Prompt 184, INJECTION.md): the injection kernel,
  // the panel and its words, fetched when a reader opens the Observatory's
  // completeness panel on an image. Same reason as the three above: the idle
  // tier has no room under a data-budget ceiling the standing size approval does
  // not cover, so none of the files is installed and the panel says it needs the
  // network the first time. D-R10-62.
  /^(js\/measure\/inject\.js|js\/observatory\/imageInject\.js|js\/i18n\/(en|es)\.imageInject\.js)$/,
  // Catalog overlays, blink and compare (Prompt 182, OVERLAYS.md): the overlay
  // kernel, the panel and its words, fetched when a reader opens the
  // Observatory's overlay panel on an image. Same reason as the three above:
  // the idle tier has no room under a data-budget ceiling the standing size
  // approval does not cover, so none of the files is installed and the panel
  // says it needs the network the first time. D-R10-61.
  /^(js\/measure\/overlay\.js|js\/observatory\/imageOverlay\.js|js\/i18n\/(en|es)\.imageOverlay\.js)$/,
  // Frames to a light curve (Prompt 185, FRAME_PIPELINE.md): the pipeline over
  // the calibration lab's reduction, the synthetic sequence it reads, the panel
  // and its words, fetched when a reader opens the Observatory's frame panel.
  // Not installed, for the reason of the four above: the idle tier has no room
  // under a data-budget ceiling the standing size approval does not cover, so the
  // panel says it needs the network the first time. D-R10-63.
  /^(js\/measure\/frameSeries\.js|js\/measure\/frameSource\.js|js\/observatory\/imageSequence\.js|js\/i18n\/(en|es)\.imageSequence\.js)$/,
  // Motion and parallax over time (Prompt 186, ASTROMETRY.md): the astrometric
  // series kernel, the panel and its words, fetched when a reader opens the
  // series disclosure inside the sky-coordinates panel. Same reason as the five
  // above: the idle tier has no room under a data-budget ceiling the standing
  // size approval does not cover, so none of the files is installed and the
  // panel says it needs the network the first time. D-R10-64.
  /^(js\/measure\/astrometric-series\.js|js\/observatory\/imageSeries\.js|js\/i18n\/(en|es)\.imageSeries\.js)$/,
  // The measurement and claim investigations (Prompt 190, MEASUREMENT_CLAIMS.md):
  // three lessons with their Spanish, deeper steps, instructor guides and
  // per-lesson paths, the claim instrument family and its words. Installed, they
  // would take the first-visit tier 28.6 KB over its data-budget ceiling (45.4
  // KB of gzip against 16.8 KB of room, Node 22), a ceiling the standing size
  // approval does not cover, and the idle tier has no room either. So none of
  // the files is installed: the service worker keeps each after its first online
  // use, and until then the three investigations and the pages that import every
  // lesson (the instructors' portal) need the network. D-R10-67.
  /^js\/data\/investigations\/(es\/|depth\/|depth\/es\/)?(measurement-sequence|what-is-a-measurement|what-does-plus-minus-claim|when-the-method-must-refuse)\.js$/,
  /^(js\/claimWidgets\.js|js\/i18n\/(en|es)\.claim\.js)$/,
  // The image investigations (Prompt 191, IMAGE_INVESTIGATIONS.md): three
  // lessons (shared files and per-lesson paths already above and below), the
  // imaging instrument family and its words. Not installed, for the reason the
  // measurement and claim files give: the first-visit tier has about 2.6 KB of
  // room and the idle tier about 466 B, and the standing size approval covers
  // neither. D-R10-72.
  /^js\/data\/investigations\/(es\/|depth\/|depth\/es\/)?(measuring-the-moon|how-far-is-that-star|a-binary-stars-orbit|what-is-in-this-field)\.js$/,
  /^(js\/imagingWidgets\.js|js\/imagingField\.js|js\/i18n\/(en|es)\.imaging\.js)$/,
  // Their three thumbnails (3.5 to 3.8 KB each in gzip): the first-visit tier
  // has about 2.5 KB of room, so the cards show no picture until one online
  // visit has kept them. D-R10-72.
  /^images\/investigations\/(measuring-the-moon|how-far-is-that-star|a-binary-stars-orbit|what-is-in-this-field)\.webp$/,
  // Weighing Jupiter (Prompt 193, SATELLITE_EPHEMERIS.md, D-R10-74): the lesson
  // and its instruments, the satellite kernel, the moons' pack and the
  // thumbnail. The first-visit and idle tiers have a few hundred bytes of room
  // under a data-budget ceiling the standing size approval does not cover, so
  // none is installed: the service worker keeps each after its first online use
  // and the lesson says it needs the network the first time.
  /^js\/data\/investigations\/(es\/|depth\/|depth\/es\/)?(weighing-jupiter|satellite-sequence)\.js$/,
  /^(js\/jovianWidgets\.js|js\/i18n\/(en|es)\.jovian\.js)$/,
  /^js\/satellites\//,
  /^(sky\/galilean-moons\.json|images\/investigations\/weighing-jupiter\.webp)$/,
  // The planetary closeout (Prompt 206, D-R10-206-05): the three connecting
  // investigations of the Planets and the Sun sequence (one shared file, its
  // six one-line stubs and its thumbnail) and the course package that names
  // them. The first-visit and idle tiers are at their data-budget ceilings,
  // which the standing size approval does not cover, so none is installed: the
  // service worker keeps each after its first online use.
  /^js\/data\/investigations\/(es\/)?(planets-sequence|the-scale-of-the-solar-system|moons-of-the-giants|comets-and-the-sun)\.js$/,
  /^js\/data\/courses\/solar-system-and-the-sun\.js$/,
  /^images\/investigations\/moons-of-the-giants\.webp$/,
  // Orbit fitting and moving-object tracks (Prompt 187, ASTROMETRY.md): the two
  // kernels, the panel and its words, fetched when a reader opens the orbit
  // disclosure inside the sky-coordinates panel. Same reason as the series files
  // above: the idle tier has no room under a ceiling the standing size approval
  // does not cover, so none is installed and the panel says it needs the network
  // the first time. D-R10-66.
  /^(js\/measure\/(orbit-fit|mover-track)\.js|js\/observatory\/imageOrbit\.js|js\/i18n\/(en|es)\.imageOrbit\.js)$/,
  // The image import (Prompt 188, IMAGE_IMPORT.md): the panel and its words,
  // fetched when a reader first chooses a FITS image, a PNG or a JPEG in the
  // Observatory's file box. Not installed, for the reason of the photometry
  // files above (the idle tier has no room under a ceiling the standing size
  // approval does not cover); until it has been fetched once the page says the
  // import needs the network. D-R10-59.
  /^(js\/observatory\/imageImport\.js|js\/i18n\/(en|es)\.imageImport\.js)$/,
  // The image packs (Prompt 189, IMAGE_PACKS.md): the four records, the loader
  // that checks and decodes their frames files, fetched when a reader opens
  // one of the four images in the Observatory. The frames files (frames/) are
  // not in any list: they are pictures, fetched at run time and kept by the
  // service worker after their first online use. Nothing here is installed, so
  // no precache tier grows. D-R10-65.
  /^(js\/observatory\/imagePacks\.js|js\/data\/observations\/(tessHd209458S56Frame|sdoHmiContinuum20240510|galileoMoon19921207|hiriseCerberusFossae)\.js)$/,
  // Crater counting (Prompt 195, CRATER_COUNTING.md): the kernel, imported by no
  // page yet (the investigations that will use it wait for the reference regions'
  // data). Listed so that a later panel that imports it installs nothing; the
  // idle tier has no room under a ceiling the standing size approval does not
  // cover. D-R10-76.
  /^js\/measure\/craters\.js$/,
  // The solar kernel (Prompt 194, SUN_KERNEL.md): imported by no page yet (the
  // investigations that will use it wait for the frames and the irradiance series).
  // Listed so that a later panel that imports it installs nothing. D-R10-79.
  /^js\/kernels\/sun\//,
  // The tides kernel (Prompt 204, TIDAL_KERNEL.md): closed forms, imported by no
  // page until the investigations that use it are built. Listed so that a later
  // instrument that imports it installs nothing; the idle tier has no room under
  // a ceiling the standing size approval does not cover. D-R10-78.
  /^js\/kernels\/tides\//,
  // The habitable-zone kernel (Prompt 205, HABITABLE_ZONE_II.md): closed forms,
  // imported by no page until the panel's limits and the lesson's upper depth use
  // it, and then only from their lazy chunks. D-R10-205-01.
  /^js\/kernels\/habitablezone\//,
  // The habitable-zone limit instruments and the Goldilocks upper depth (Prompt 205
  // part B, D-R10-205-03): the family, its words and the lesson's deeper steps and their
  // Spanish are kept by the service worker after the first online use, not installed
  // (the first-visit and idle tiers have no room under data-budget ceilings the
  // standing approval does not cover).
  /^(js\/habitabilityLimitsWidgets\.js|js\/i18n\/(en|es)\.habitablezone\.js)$/,
  /^js\/data\/investigations\/depth\/(es\/)?goldilocks-question\.js$/,
  // The atmospheres kernel and pack (Prompt 200, ATMOSPHERES.md): imported by no
  // page until the instrument family and its lessons are built. D-R10-80.
  /^js\/kernels\/atmospheres\//,
  // The small-body kernel (Prompt 198, SMALL_BODIES.md): the belts, the resonance
  // locations and the light-curve model, imported by no page until the packs and
  // investigations that use them are built. D-R10-198-01.
  /^js\/kernels\/smallbodies\//,
  // The small-body catalog pack (Prompt 198, D-R10-198-02): 294 KB of JPL SBDB
  // elements read by the belt investigations on first use; the data budget has no
  // pack room, so it is fetched when used and kept by the service worker.
  /^js\/data\/smallbodies\//,
  // The atmosphere family and its lessons (Prompt 200, D-R10-81): the instruments,
  // their words, the two lessons and their thumbnails are kept by the service worker
  // after the first online use, not installed (the first-visit and idle tiers have
  // a few hundred bytes of room under a data-budget ceiling this approval does not cover).
  /^(js\/atmosphereWidgets\.js|js\/i18n\/(en|es)\.atmospheres\.js)$/,
  /^js\/data\/investigations\/(es\/|depth\/|depth\/es\/)?(why-venus-is-hot|two-greenhouse-models|how-hot-is-the-day-side|phases-and-albedo|atmosphere-sequence)\.js$/,
  /^images\/investigations\/(why-venus-is-hot|two-greenhouse-models|how-hot-is-the-day-side|phases-and-albedo)\.webp$/,
  // The Sun instruments and investigations (Prompt 194 part 2, D-R10-92): the family
  // and its words, the two lessons' per-lesson paths (their text is appended to the
  // atmosphere files above) and their thumbnails: kept by the service worker after the
  // first online use, not installed. The sidecar and the fourteen pictures (frames/sun*)
  // are in no list: fetched at run time, kept after their first online use.
  /^(js\/sunWidgets\.js|js\/i18n\/(en|es)\.sun\.js)$/,
  /^js\/data\/investigations\/(es\/|depth\/|depth\/es\/)?(the-turning-sun|the-suns-power)\.js$/,
  /^images\/investigations\/(the-turning-sun|the-suns-power)\.webp$/,
  // The instrument library (Prompt 209, INSTRUMENTS.md): the cited table, its validator
  // and its three adapters. No shipped page imports them yet (the exposure planner,
  // Prompt 210, is the first), so an install has no use for them and the first-visit
  // tier has no room. Their first page adopter decides whether any of it is installed.
  /^js\/instruments\//,
  /^js\/data\/instruments\.js$/,
  // The small-body instruments and investigations (Prompt 198 part 3, D-R10-198-04): the
  // family and its words, the two lessons' per-lesson paths (their text is appended to the
  // satellite files) and their thumbnails: kept after the first online use, not installed.
  /^(js\/smallBodiesWidgets\.js|js\/i18n\/(en|es)\.smallbodies\.js)$/,
  /^js\/data\/investigations\/(es\/|depth\/|depth\/es\/)?(the-gaps-in-the-belt|how-fast-does-it-spin)\.js$/,
  /^images\/investigations\/(the-gaps-in-the-belt|how-fast-does-it-spin)\.webp$/,
  // The crater instruments and investigations (Prompt 195, D-R10-85): the family
  // and its words, the three lessons' per-lesson paths (their text is appended to
  // the shared measurement files above) and their thumbnails. Kept by the service
  // worker after the first online use, not installed (the first-visit and idle
  // tiers have no room under data-budget ceilings this approval does not cover).
  /^(js\/craterWidgets\.js|js\/i18n\/(en|es)\.craters\.js)$/,
  /^js\/data\/investigations\/(es\/|depth\/|depth\/es\/)?(which-surface-is-older|craters-by-size|what-a-crater-diameter-is-worth)\.js$/,
  /^images\/investigations\/(which-surface-is-older|craters-by-size|what-a-crater-diameter-is-worth)\.webp$/,
  // The ring and tide kernel, family and lessons (Prompt 204 part 2): imported by no page
  // at start-up, kept by the service worker after the first online use, not installed.
  /^(js\/tidesWidgets\.js|js\/i18n\/(en|es)\.tides\.js)$/,
  /^js\/data\/investigations\/(es\/|depth\/|depth\/es\/)?(why-rings|tides-that-move-the-moon|ios-fire)\.js$/,
  /^images\/investigations\/(why-rings|tides-that-move-the-moon|ios-fire)\.webp$/,
  // The two scenarios' thumbnails: the gallery shows its titled fallback until the first online
  // visit has kept them (13 KB the first-visit tier has no room for under Carl's data-budget ceiling).
  /^images\/scenarios\/(ring-gap|roche-pass)\.webp$/,
  // The validation suite's groups and harness: fetched when the suite runs,
  // like physicsChecks.js itself (ON_DEMAND_ONLY below).
  /^js\/validation\/(groups\/|harness\.js$)/,
  // The interiors kernel and its packs (Prompt 203, INTERIORS.md): imported by no
  // shipped page yet, so no page can fetch them and an install has no use for them.
  /^js\/kernels\/interiors\//,
  // Prompt 208: the telescope instrument, its optics and its one lesson file (D-R10-208-02).
  /^js\/data\/investigations\/(es\/|depth\/|depth\/es\/)?(what-a-telescope-resolves|telescope-sequence)\.js$/,
  /^(js\/telescopeWidgets\.js|js\/telescopeField\.js|js\/i18n\/(en|es)\.telescope\.js)$/,
  /^js\/kernels\/detector\/(optics|telescope)\.js$/,
  // Prompt 211: the detector-effects instrument, its kernel and its one lesson file (D-R10-211-01).
  /^js\/data\/investigations\/(es\/|depth\/|depth\/es\/)?(the-saturated-star|saturated-star-sequence)\.js$/,
  /^(js\/effectsWidgets\.js|js\/effectsField\.js|js\/i18n\/(en|es)\.effects\.js)$/,
  /^js\/kernels\/detector\/(effects|sampling)\.js$/,
];

const ON_DEMAND_ONLY = new Set([
  'js/validation/physicsChecks.js',
  'js/validation/domShim.js',
]);

/**
 * The idle tier (D-PERF-02, change 2; Prompt 147): what is installed after the
 * worker has activated and the page has gone idle, not during the install.
 *
 * The first-visit install is what a reader waits for on a school connection and
 * what decides whether the version activates at all, so it holds only what the
 * shell, the Sandbox and an ordinary lesson need. These are the surfaces a
 * reader reaches after that: the instructor documents, the 3-D view and lab,
 * the mission lab, the Sky Lab, the Library and the data tables the guided
 * investigations open. They are installed in the background, on the next open
 * if this one is cut short, and a file that cannot be fetched costs that
 * surface its offline copy and nothing else. The cost is stated on the page
 * (OFFLINE_AND_LOW_END.md): until the idle tier finishes, those surfaces need
 * the network, which is the trade D-PERF-02 accepted for a smaller install.
 *
 * Idle wins over a core walk or an `offline: core` default for the same file,
 * because it is the later and more specific decision; a capability package
 * that declares one of these `core` is refused, so a package cannot quietly
 * pull its files back into the install.
 */
export const IDLE_TIER = [
  [
    'instructor modules',
    // The review page's own module (Prompt 172, D-R10-38): an instructor
    // surface like the documents, read by no first visit. The class summary
    // (Prompt 173) is js/instructor*.js and its words are one catalog fragment
    // per language, which only that page reads.
    /^(js\/authoring\/instructorSchema\.js|js\/instructor[A-Za-z]*\.js|js\/submissionReview\.js|js\/data\/instructor[A-Za-z.]*\.js|js\/i18n\/(en|es)\.classSummary\.js)$/,
  ],
  ['three.js', /^vendor\/three\//],
  [
    '3-D lab',
    /^(js\/lab3d\/|js\/lab3d[A-Za-z]*\.js$|js\/forward\/system3d\.js$|js\/i18n\/(en|es)\.lab3d[A-Za-z]*\.js$|3d\/index\.html$)/,
  ],
  [
    'mission lab',
    /^(js\/mission\/|js\/mission[A-Za-z]*\.js$|js\/i18n\/(en|es)\.mission[A-Za-z]*\.js$|mission\/lab\/index\.html$|js\/data\/ephemeris\/)/,
  ],
  [
    'Sky Lab',
    /^(js\/kernels\/sky\/|js\/sky\/|js\/sky[A-Za-z]*\.js$|js\/data\/sky\/|sky\/)/,
  ],
  ['Library', /^(js\/library\/|js\/libraryPage\.js$|library\/)/],
  [
    'activity builder',
    // The instructor's half of an assignment (Prompt 175): the builder, the
    // adaptation it checks and the student-side report of what changed under
    // an activity, with their words. Reached from ?assign=<lesson> and from an
    // adapted or out-of-date link, and imported only then; each import is
    // already guarded (a reload prompt for the builder, silence for the
    // report), so until the idle install finishes an offline first visit
    // builds and opens activities as before and without these.
    /^(js\/assignments\/(assignmentBuilder|adapt|adaptText|adapted)\.js|js\/i18n\/(en|es)\.adapt\.js)$/,
  ],
  [
    // The image marks instrument (Prompt 179, IMAGE_MEASUREMENT.md): loaded when
    // a reader opens the Observatory's marks panel on an image, so no first
    // visit needs it. Idle wins over the core walk of js/, which would
    // otherwise carry these files in the install. The kind's other three
    // files (planes, grid, draft) are not here: nothing imports them yet.
    'image measurement',
    /^(js\/dataKinds\/(contract|limits)\.js|js\/measure\/(marks|refine|scale|imageRecord)\.js|js\/observatory\/imageMarks\.js|js\/i18n\/(en|es)\.imageMarks\.js)$/,
  ],
  [
    'data tables',
    /^((cosmology|gaia|variables)\/.*\.json$|js\/data\/(observations|radiation)\/)/,
  ],
];

/** @param {string} p - Repo-relative path @returns {?string} Its idle group, or null */
export const idleGroupOf = p =>
  IDLE_TIER.find(([, re]) => re.test(p))?.[0] ?? null;

/**
 * Paths kept out of the precache. Matched against the repo-relative path.
 *
 * The translated lesson shadows are the deliberate exclusion; see the header.
 *
 * This matches ANY locale-shaped subdirectory rather than the locales that
 * happen to be registered, and that difference is the whole point. The
 * directories are walked by `{ dir: 'js', core: true }` above, so anything not
 * excluded here is precached as CORE - and one 404 among core assets makes
 * sw.js delete the cache and reject the install, for every reader on earth
 * rather than only for readers of that language. A pattern keyed to LOCALES
 * would put an unregistered directory straight into that failure; a pattern
 * keyed to the shape of the path cannot. `assertShadowsMatchLocales()` then
 * refuses the build if the two ever disagree, so neither an unregistered
 * directory nor a registered locale with no directory can pass quietly.
 */
const EXCLUDE = [new RegExp(`^${SHADOW_ROOT}/[a-z]{2}(-[A-Za-z]{2,4})?/`)];

/**
 * Whether a repo-relative path is a translated lesson body.
 *
 * Exported so the property can be asserted directly rather than inferred from
 * a manifest that happens to contain only the locales on disk today.
 *
 * @param {string} p - Repo-relative path
 * @returns {boolean} Whether it is a locale shadow
 */
export const isLocaleShadow = p => EXCLUDE.some(re => re.test(p));

/**
 * Every file under a directory, recursively, with the wanted extensions.
 *
 * @param {string} dir - Directory to walk
 * @param {string[]} ext - Extensions to keep
 * @returns {Promise<string[]>} Repo-relative paths
 */
async function walk(dir, ext) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full, ext)));
    else if (ext.some(e => entry.name.endsWith(e))) out.push(full);
  }
  return out;
}

/**
 * The offline class each capability package declares for its assets.
 *
 * A package says, per file, whether a reader needs it offline to use the
 * capability at all (`core`), whether it is worth having (`optional`), whether
 * it is a translation warmed for readers of that locale (`locale`), or whether
 * it is never cached (`none`). The directory walk above gives every file a
 * default; a declaration overrides it, and one the precache cannot honor - a
 * core file the walk excludes, a `locale` file that is not a lesson shadow -
 * refuses the build rather than shipping a precache that disagrees with the
 * package.
 *
 * @returns {Map<string, string>} Repo-relative path -> offline class
 */
export function capabilityOffline(dir = 'capabilities') {
  const declared = new Map();
  if (!existsSync(dir)) return declared;
  for (const name of readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .sort()) {
    const m = JSON.parse(readFileSync(path.posix.join(dir, name), 'utf8'));
    for (const a of m.assets || []) declared.set(a.path, a.offline);
  }
  return declared;
}

function applyCapabilityOffline(entries) {
  const declared = capabilityOffline();
  const byPath = new Map(entries.map(e => [e.path, e]));
  const problems = [];
  for (const [p, offline] of declared) {
    const shadow = isLocaleShadow(p);
    if (offline === 'locale') {
      if (!shadow)
        problems.push(`${p} is declared locale but is not a lesson shadow`);
      continue;
    }
    if (shadow && offline !== 'none') {
      problems.push(
        `${p} is a lesson shadow, warmed per locale; declare it locale`
      );
      continue;
    }
    if (offline === 'core' && idleGroupOf(p)) {
      problems.push(
        `${p} is declared core but belongs to the idle tier (${idleGroupOf(p)})`
      );
      continue;
    }
    if (offline === 'idle' && !idleGroupOf(p)) {
      problems.push(`${p} is declared idle but matches no idle tier rule`);
      continue;
    }
    if (offline === 'none') {
      byPath.delete(p);
    } else if (byPath.has(p)) {
      byPath.get(p).core = offline === 'core';
    } else if (existsSync(p)) {
      byPath.set(p, { path: p, core: offline === 'core' });
    } else {
      problems.push(`${p} is declared ${offline} but does not exist`);
    }
  }
  if (problems.length) {
    throw new Error(
      'Capability packages declare offline classes the precache cannot honor:\n  ' +
        problems.join('\n  ')
    );
  }
  return [...byPath.values()];
}

/**
 * The three lists a reader's browser caches, as the worker will receive them.
 * @returns {Promise<{core: string[], optional: string[], idle: string[], localeWarm: Map<string, string[]>}>}
 */
export async function precacheLists() {
  const { core, optional, idle } = await buildManifest();
  const onDisk = await shadowsOnDisk();
  const localeWarm = new Map(
    SHADOW_LOCALES.map(id => [id, onDisk.get(id) || []])
  );
  return { core, optional, idle, localeWarm };
}

/**
 * The precache list and the version its contents imply.
 *
 * @returns {Promise<{paths: string[], core: string[], optional: string[], idle: string[], version: string, bytes: number}>} Manifest
 */
export async function buildManifest() {
  const collected = FILES.map(f => ({ path: f.path, core: f.core }));
  for (const { dir, ext, core } of TREES) {
    for (const path_ of await walk(dir, ext))
      collected.push({
        path: path_,
        core: core && !OBSERVATORY_ONLY.has(path_),
      });
  }

  const kept = applyCapabilityOffline(
    collected.filter(
      f =>
        !EXCLUDE.some(re => re.test(f.path)) &&
        !NEVER_PRECACHED.some(re => re.test(f.path)) &&
        !ON_DEMAND_ONLY.has(f.path)
    )
  ).sort((a, b) => a.path.localeCompare(b.path));
  const paths = kept.map(f => f.path);
  const idle = kept.filter(f => idleGroupOf(f.path)).map(f => f.path);
  const core = kept
    .filter(f => f.core && !idleGroupOf(f.path))
    .map(f => f.path);
  const optional = kept
    .filter(f => !f.core && !idleGroupOf(f.path))
    .map(f => f.path);

  // The version is a hash of what is in the files, not of their names or of
  // the clock. Two builds of an unchanged tree produce the same version, so a
  // rebuild does not evict a cache that is still correct; changing one byte of
  // one module produces a new one, so nothing stale can survive.
  const digest = createHash('sha256');
  let bytes = 0;
  for (const p of paths) {
    const body = await readFile(p);
    bytes += body.length;
    digest.update(p);
    digest.update(createHash('sha256').update(body).digest());
  }
  const version = digest.digest('hex').slice(0, 12);

  return { paths, core, optional, idle, version, bytes };
}

/**
 * Render the manifest as the file the worker imports.
 *
 * @param {object} manifest - As buildManifest
 * @param {string[]} localeWarm - Spanish shadows, warmed on demand not at install
 * @returns {string} File contents
 */
export function renderManifest(
  { paths, core, optional, idle = [], version, bytes },
  localeWarm
) {
  // A Map keyed by locale id. Accepts the older array-of-Spanish-paths shape
  // too, so a caller that has not been updated still produces a correct file
  // rather than a silently empty warm list.
  const warm =
    localeWarm instanceof Map
      ? localeWarm
      : new Map([['es', localeWarm || []]]);
  const warmBlock = [...warm.entries()]
    .map(
      ([id, files]) =>
        `  ${id}: [\n${files.map(p => `    './${p}',`).join('\n')}\n  ],`
    )
    .join('\n');
  const kb = Math.round(bytes / 1024);
  return `// Generated by tools/build-service-worker.mjs. Do not edit.
//
// ${paths.length} files, ${kb}KB. The version is a hash of their contents, so
// it changes when they do and only when they do - which is what makes the old
// cache safe to delete on activate and safe to keep otherwise.
//
// Split three ways, and the split is what install enforces. The ${core.length} core
// entries are the shell, the modules, the stylesheets and the self-hosted
// fonts and libraries: if any one of them cannot be fetched the install fails
// and this version never activates, because a half-cached build is the mixed
// revision the whole arrangement exists to prevent. The ${optional.length} optional
// entries are pictures and small pages; a missing one is reported and does not
// cost the reader the version. The ${idle.length} idle entries are installed after
// activation, on idle, by a message from the page (D-PERF-02, change 2): the
// instructor modules, three.js, the 3-D lab, the mission lab, the Sky Lab, the
// Library and the data tables. A missing one costs that surface its offline
// copy, and the next open fetches only what is missing.
self.__GRAVITAS_CACHE_VERSION = 'gravitas-${version}';
self.__GRAVITAS_PRECACHE_BYTES = ${bytes};
self.__GRAVITAS_PRECACHE_CORE = [
${core.map(p => `  './${p}',`).join('\n')}
];
self.__GRAVITAS_PRECACHE_OPTIONAL = [
${optional.map(p => `  './${p}',`).join('\n')}
];
self.__GRAVITAS_PRECACHE_IDLE = [
${idle.map(p => `  './${p}',`).join('\n')}
];
// The union, in one sorted list, for the fetch handler's "is this precached?"
// question and for the diagnostics readout.
self.__GRAVITAS_PRECACHE = [
${paths.map(p => `  './${p}',`).join('\n')}
];

// Not precached: fetched on demand, and warmed deliberately when the interface
// switches to that language. See the header of the generator for why these are
// treated differently from the English bodies - and note that being absent from
// both precache lists is what makes a missing translated lesson unable to fail
// an install.
self.__GRAVITAS_LOCALE_WARM = {
${warmBlock}
};
`;
}

/**
 * The shadow directories actually on disk, locale id -> sorted paths.
 *
 * @returns {Promise<Map<string, string[]>>} What is there
 */
async function shadowsOnDisk() {
  const found = new Map();
  for (const entry of await readdir(SHADOW_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (!/^[a-z]{2}(-[A-Za-z]{2,4})?$/.test(entry.name)) continue;
    const files = (
      await walk(path.posix.join(SHADOW_ROOT, entry.name), ['.js'])
    ).sort((a, b) => a.localeCompare(b));
    found.set(entry.name, files);
  }
  return found;
}

/**
 * Refuse to build when the shadow directories and the locale registry disagree.
 *
 * An unregistered directory is the dangerous half: it would be warmed by
 * nothing and, but for the shape-based exclusion above, precached as core. A
 * registered locale with no directory is the harmless half, and still a bug
 * worth failing on, because the picker would offer a language whose lessons do
 * not exist.
 *
 * @param {Map<string, string[]>} onDisk - From shadowsOnDisk()
 */
function assertShadowsMatchLocales(onDisk) {
  const registered = new Set(SHADOW_LOCALES);
  const orphaned = [...onDisk.keys()].filter(id => !registered.has(id));
  const missing = SHADOW_LOCALES.filter(id => !onDisk.has(id));
  if (!orphaned.length && !missing.length) return;

  const lines = [];
  if (orphaned.length) {
    lines.push(
      `  ${SHADOW_ROOT}/ has ${orphaned.join(', ')} with no entry in LOCALES ` +
        '(js/i18n/index.js). Register the locale, or remove the directory.'
    );
  }
  if (missing.length) {
    lines.push(
      `  LOCALES registers ${missing.join(', ')} with no ${SHADOW_ROOT}/<id>/ ` +
        'directory. Add the shadows, or remove the locale.'
    );
  }
  throw new Error(
    'The lesson shadow directories and the locale registry disagree:\n' +
      lines.join('\n')
  );
}

/** @returns {Promise<string>} What the file should contain right now */
export async function expectedFile() {
  const manifest = await buildManifest();
  const onDisk = await shadowsOnDisk();
  assertShadowsMatchLocales(onDisk);
  // Registry order, not directory order, so the generated file does not change
  // because a filesystem enumerated differently.
  const localeWarm = new Map(
    SHADOW_LOCALES.map(id => [id, onDisk.get(id) || []])
  );
  return renderManifest(manifest, localeWarm);
}

async function main() {
  const check = process.argv.includes('--check');
  const wanted = await expectedFile();
  let current = null;
  try {
    current = await readFile(OUT, 'utf8');
  } catch {
    current = null;
  }

  if (check) {
    if (current === wanted) {
      const { paths, version, bytes } = await buildManifest();
      console.log(
        `${OUT} is current: ${paths.length} files, ${Math.round(bytes / 1024)}KB, version ${version}.`
      );
      return;
    }
    console.error(
      `${OUT} is out of date. Run \`npm run sw:manifest\` and commit the result.`
    );
    process.exitCode = 1;
    return;
  }

  if (current === wanted) {
    console.log(`${OUT} already current.`);
    return;
  }
  await writeFile(OUT, wanted);
  const { paths, version, bytes } = await buildManifest();
  console.log(
    `Wrote ${OUT}: ${paths.length} files, ${Math.round(bytes / 1024)}KB, version ${version}.`
  );
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
