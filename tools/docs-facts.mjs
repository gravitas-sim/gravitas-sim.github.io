#!/usr/bin/env node
// =============================================================================
// Documentation facts: derive the numbers, then hold the docs to them
// -----------------------------------------------------------------------------
// Every count in the documentation is a copy of something the application
// already knows: how many scenarios are in the catalog, how many steps are in
// the lessons, how many checks the physics suite runs. A copy somebody has to
// remember to update is a copy that goes stale, and a README that says "43
// scenarios" over a catalog of 48 is worse than one that says nothing, because
// a reader who catches it stops trusting the rest of the page.
//
// So the numbers are computed here and written into the docs between markers:
//
//     **<!--fact:scenarios-->48<!--/fact--> built-in scenarios**
//
// The marker is an HTML comment, so it is invisible wherever Markdown is
// rendered, and the text between the markers is the only part this tool
// rewrites.
//
//   node tools/docs-facts.mjs              print the facts
//   node tools/docs-facts.mjs --json       the same, as JSON
//   npm run docs:sync                      rewrite the marked spans
//   npm run docs:check                     fail if any of them is stale
//   npm run docs:check -- --full           include the facts that cost a test run
//
// Cheap and expensive facts
// -----------------------------------------------------------------------------
// Most facts are read straight out of the source modules and cost milliseconds,
// so `--check` verifies them on every run and in the fast CI job. The rest - the
// Jest counts, the browser-suite count, the physics-check count and the build
// sizes - can only be had by running something that takes minutes.
//
// That comment used to say those were gathered under `--full`, "which CI runs
// in the job where those commands have already been paid for". CI never ran it.
// Its "Documentation counts and links" step ran the cheap check, which reports
// the expensive facts as *not measured* and then prints "Documentation matches
// the source" - so a pull request could move the test count and go green over a
// README that now said something untrue. It did, repeatedly: README.md claimed
// 3608 jest tests against 4844 and 579 browser tests against 1061, and at the
// time of writing three open pull requests were each carrying stale counts
// behind a green tick.
//
// The fix is not to run the whole suite twice. It is to notice that the facts
// differ in WHAT they cost, and that CI has already paid for most of it:
//
//   tests   The jest counts, the browser-suite listing and the physics total.
//           CI's `checks` job already runs jest and the physics suite, so it
//           writes their reports to a cache directory and this reads them back
//           instead of running them again. What is left is the playwright
//           listing, which takes four seconds.
//
//   build   The bundle sizes, read from dist/build-summary.json. Only the
//           `build` job has a dist/, and it has one already - so that job
//           checks them, rather than `checks` waiting for a build it does not
//           otherwise need.
//
// Between them the two groups cover every deferred fact, and
// tests/releaseGate.test.js fails if they ever stop doing so. `--full` still
// means all of them, so `npm run docs:check:full` and the release gate are
// unchanged and remain the strictest form.
// =============================================================================

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

import {
  BLOCK_MARKER,
  citationCff,
  generatedBlocks,
  zenodoJson,
} from './generated-blocks.mjs';
import { RELEASE } from './project-metadata.mjs';
import { CHECKS } from './checks.mjs';
import {
  catalogLayout,
  completeCatalogs,
  registeredLocales,
} from './i18n-catalog.mjs';
import { inOwnTransformCache } from './playwright-cache.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rel = p => relative(REPO, p) || '.';

/**
 * Every message-catalog file, by the one rule tools/i18n-catalog.mjs applies.
 *
 * Both of this tool's catalog readers used to list files by hand: the document
 * list named four of the ten, and `uiStrings` counted two, so README.md
 * published 3691 strings over a catalog of 4017 - every id in the activities,
 * teaching and placement fragments was missing from the count.
 */
const CATALOG_FILES = catalogLayout({
  locales: await registeredLocales(),
}).files.map(f => `js/i18n/${f.file}`);

/** The merged catalogs, loaded once however many facts and checks ask. */
let catalogs;
const loadCatalogs = () => (catalogs ??= completeCatalogs());

// The documents this tool is responsible for. A file not listed here can still
// carry markers; it just will not be found by --sync or --check.
const DOCS = [
  'README.md',
  'CONTRIBUTING.md',
  'DARK_MATTER.md',
  'EXOPLANET_OBSERVING.md',
  'REFERENCE_FRAMES.md',
  'SANDBOX_INSTRUMENTS.md',
  'SCENARIO_GALLERY.md',
  'PHYSICS_VALIDATION.md',
  'MASS_UNITS.md',
  'NUMBER_TYPOGRAPHY.md',
  'OBJECT_INSPECTOR.md',
  'PERFORMANCE_PROFILING_GUIDE.md',
  'PERFORMANCE_OPTIMIZATIONS_SUMMARY.md',
  'SCENARIO_FIXES.md',
  'UI_PERFORMANCE_AUDIT.md',
  'manual/README.md',
  'e2e/README.md',
  'tools/README-thumbnails.md',
  // The standalone document pages. The marker is an HTML comment, so it works
  // in HTML exactly as it does in Markdown - these were simply never listed,
  // which is why /model/ was still claiming 135 physics checks and 48
  // scenarios long after both numbers had moved.
  'index.html',
  'model/index.html',
  // The locale catalogs make the same claim the pages do, in two languages,
  // and were the last place still saying 135 when the suite had reached 243.
  // A marker cannot go in a translated string - it would be rendered to the
  // reader - so these are matched by pattern below instead. Every fragment,
  // not the four that were listed here, so a claim written into the teaching
  // or placement catalog is held to the source like any other.
  ...CATALOG_FILES,
  'validation/index.html',
  'instructors/index.html',
  'CHANGELOG.md',
  'RELEASING.md',
  'ACCESSIBILITY.md',
  'OFFLINE_AND_LOW_END.md',
  // The paper. Typeset by pandoc, so it carries no `<!--fact:-->` markers - a
  // comment would either reach the PDF or need another tool to strip it - and
  // is matched by pattern in ATTRIBUTE_FACTS instead. It was not listed here at
  // all, so the two suite sizes it quotes were transcribed once and checked by
  // nobody.
  'paper.md',
];

const MARKER = /<!--fact:([a-zA-Z0-9_:.-]+)-->([\s\S]*?)<!--\/fact-->/g;

/**
 * Counts that live somewhere a marker cannot go.
 *
 * An HTML comment is invalid inside an attribute value, so the numbers in a
 * page's <meta name="description"> and its Open Graph tags cannot be wrapped
 * the way body text can. They are still copies of a fact and still go stale -
 * the validation page's description advertised 135 physics checks to search
 * engines and social cards long after the suite had grown to 218.
 *
 * Each rule names the file, a pattern whose second group is the number, and the
 * fact it must equal. Deliberately explicit rather than a general "find numbers
 * near the word checks" sweep: a rule that guesses would eventually rewrite a
 * number that was not a count.
 */
const ATTRIBUTE_FACTS = [
  // The paper. It is typeset by pandoc, so a `<!--fact:-->` marker would either
  // reach the PDF or have to be stripped by another tool; a pattern keeps the
  // source readable and the number generated. Both of these were transcribed by
  // hand and both describe suites that grow.
  {
    file: 'paper.md',
    key: 'physicsChecks',
    pattern: /(A physics validation suite runs )(\d+)( checks)/,
  },
  {
    file: 'paper.md',
    key: 'releaseChecks',
    pattern: /(A release gate runs )(\d+)( checks)/,
  },
  {
    file: 'validation/index.html',
    key: 'physicsChecks',
    pattern: /(Gravitas: )(\d+)( checks of the physics engine)/,
  },
  {
    file: 'validation/index.html',
    key: 'physicsChecks',
    pattern: /(content=")(\d+)( physics checks with measured error)/,
  },
  {
    file: 'index.html',
    key: 'physicsChecks',
    pattern: /(has been checked against: )(\d+)( checks with measured error)/,
  },
  {
    file: 'js/i18n/en.js',
    key: 'physicsChecks',
    pattern: /(has been checked against: )(\d+)( checks with measured error)/,
  },
  {
    file: 'js/i18n/es.js',
    key: 'physicsChecks',
    pattern: /(comprobado el motor físico: )(\d+)( verificaciones)/,
  },
  // The welcome screen's card for instructors. It said "Six guided
  // investigations" over a manifest of twenty-two, in both languages, for as
  // long as the lesson set had been growing - the first thing an instructor
  // reads about the project, understating it by sixteen lessons.
  {
    file: 'js/i18n/en.deferred.js',
    key: 'investigations',
    pattern: /(')(\d+)( guided investigations for introductory)/,
  },
  {
    file: 'js/i18n/es.deferred.js',
    key: 'investigations',
    pattern: /(')(\d+)( investigaciones guiadas para astronomía)/,
  },
];

// --- gathering ---------------------------------------------------------------

/**
 * How many scenarios tools/scenario-stability.mjs audits.
 *
 * Counted from its DEFAULT_SCENARIOS list by reading the source, because
 * importing the module would start a browser.
 *
 * @returns {number} The number of scenarios in the audit's list
 */
function stabilityScenarioCount() {
  const path = join(REPO, 'tools', 'scenario-stability.mjs');
  if (!existsSync(path)) return 0;
  const text = readFileSync(path, 'utf8');
  const start = text.indexOf('const DEFAULT_SCENARIOS = [');
  if (start < 0) return 0;
  const body = text.slice(start, text.indexOf('];', start));
  return (body.match(/^\s*'[^']+',/gm) || []).length;
}

/**
 * How many documents the instructor bundle carries, and how many are activities.
 *
 * Read from instructors/materials.manifest.json, which the build writes, rather
 * than counted from the catalog: the manifest is what the portal downloads and
 * what the ZIP contains, so it is the number a reader can check. README said
 * "22 PDFs" of a bundle that held fifty-four.
 *
 * @returns {{documents: number, activityDocuments: number}} The counts
 */
function instructorBundle() {
  const path = join(REPO, 'instructors', 'materials.manifest.json');
  if (!existsSync(path)) return { documents: 0 };
  try {
    const manifest = JSON.parse(readFileSync(path, 'utf8'));
    return { documents: Number(manifest.documents) || 0 };
  } catch {
    return { documents: 0 };
  }
}

/**
 * How many of those documents belong to the classroom activities.
 *
 * Counted the way the build counts them - one guide per activity, one
 * worksheet per format that is not projected - rather than read from the
 * manifest, which records a total and not a breakdown.
 *
 * @param {Array<object>} activities - ACTIVITIES
 * @returns {number} Guides plus worksheets
 */
function activityDocumentCount(activities) {
  return activities.reduce(
    (n, a) => n + 1 + a.formats.filter(f => f.context !== 'projection').length,
    0
  );
}

/**
 * The shape of the axe sweep: surfaces, locales, themes, and their product.
 *
 * Read out of e2e/accessibility.spec.js rather than imported, because the spec
 * pulls in Playwright and the test fixtures and importing it here would start
 * a browser to answer a question about an array length.
 *
 * ACCESSIBILITY.md carried three different answers to this at once - "14
 * surfaces ... 56 runs" in the table, "52 clean axe runs" in the prose, and
 * "all 52 combinations" in the commands - over an array of fifteen. None of
 * the three was right, which is what a hand-copied count does when the array
 * grows twice and nobody is counting.
 *
 * @returns {{surfaces: number, locales: number, themes: number, runs: number}}
 *   The matrix, or zeroes if the spec cannot be read
 */
function axeMatrix() {
  const path = join(REPO, 'e2e', 'accessibility.spec.js');
  const empty = { surfaces: 0, locales: 0, themes: 0, runs: 0 };
  if (!existsSync(path)) return empty;
  const text = readFileSync(path, 'utf8');
  /** Entries in a top-level `const NAME = [ ... ];` array of objects. */
  const lengthOf = (name, key) => {
    const start = text.indexOf(`const ${name} = [`);
    if (start < 0) return 0;
    const end = text.indexOf('\n];', start);
    if (end < 0) return 0;
    const body = text.slice(start, end);
    return (body.match(new RegExp(`^\\s{2,4}\\{?\\s*${key}: `, 'gm')) || [])
      .length;
  };
  const surfaces = lengthOf('SURFACES', 'name');
  const locales = lengthOf('LOCALES', 'id');
  const themes = lengthOf('THEMES', 'id');
  return { surfaces, locales, themes, runs: surfaces * locales * themes };
}

/**
 * How many scenarios carry small bodies.
 *
 * @returns {Promise<number>} Scenarios whose preset asks for asteroids or comets
 */
async function smallBodyScenarioCount() {
  const { SCENARIO_INFO } = await import(
    new URL('../js/data/scenarioInfo.js', import.meta.url)
  );
  const { applyPreset } = await import(
    new URL('../js/scenarios.js', import.meta.url)
  );
  const { DEFAULT_SETTINGS } = await import(
    new URL('../js/appState.js', import.meta.url)
  );
  let count = 0;
  for (const name of Object.keys(SCENARIO_INFO)) {
    const settings = {
      ...JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
      preset_scenario: name,
    };
    try {
      applyPreset(settings, DEFAULT_SETTINGS, {});
    } catch {
      continue;
    }
    const asteroids =
      settings.enable_asteroids !== false && (settings.num_asteroids || 0) > 0;
    const comets = (settings.num_comets || 0) > 0;
    if (asteroids || comets) count++;
  }
  return count;
}

/** Facts that come from importing the application's own modules. */
async function cheapFacts() {
  const { SCENARIO_INFO } = await import(
    new URL('../js/data/scenarioInfo.js', import.meta.url)
  );
  const { MANIFEST } = await import(
    new URL('../js/data/investigations/manifest.js', import.meta.url)
  );
  const { LOCALES } = await import(
    new URL('../js/i18n/index.js', import.meta.url)
  );
  // The whole catalog of the source locale, every fragment merged. Read here
  // rather than at the top of the file so that a failure to read it is a
  // failure of this fact and not of the whole tool.
  const { catalogs: byLocale } = await loadCatalogs();
  const sourceCatalog = byLocale.get(LOCALES[0].id).merged;
  const { INVESTIGATIONS } = await import(
    new URL('../js/data/investigations.js', import.meta.url)
  );
  const { TRACK_IDS } = await import(
    new URL('../js/stellar/tracks.js', import.meta.url)
  );
  const { ACTIVITIES } = await import(
    new URL('../js/data/activities.js', import.meta.url)
  );
  const lessons = Object.values(INVESTIGATIONS);
  const stepsOf = lesson => (lesson.steps ? lesson.steps.length : 0);
  const axe = axeMatrix();
  const bundle = instructorBundle();

  const facts = {
    // The archived identifiers, from the same constant the citation files are
    // generated from. Written as facts rather than typed into the README
    // because a DOI quoted in prose is a second copy, and the version DOI
    // changes at every release while the concept DOI never does - exactly the
    // pair a reader would never notice going stale.
    version: RELEASE.version ?? '',
    doi: RELEASE.doi ?? '',
    conceptDoi: RELEASE.conceptDoi ?? '',
    scenarios: Object.keys(SCENARIO_INFO).length,
    investigations: MANIFEST.length,
    // From the manifest rather than by walking the lessons: the manifest is
    // itself generated from them and is what the lesson browser draws, so a
    // number quoted from here is the number a reader sees on the cards.
    investigationSteps: MANIFEST.reduce((sum, l) => sum + l.stepCount, 0),
    gradedSteps: MANIFEST.reduce((sum, l) => sum + l.gradedCount, 0),
    objectives: MANIFEST.reduce((sum, l) => sum + l.objectiveCount, 0),
    locales: LOCALES.length,
    localeNames: LOCALES.map(l => l.endonym).join(', '),
    // Every fragment of the source locale's catalog, each id counted once.
    //
    // This counted the base catalog alone, so every string moved out of the
    // start-up path to keep the download budget silently left the total: the
    // widget and panel families that went deferred took the reported figure
    // from 1620 down to 1295 while the application gained strings. The fix
    // then named the deferred half, and the same thing happened again three
    // splits later: activities, teaching and placement were 326 strings the
    // count could not see. The fragments now come from the directory, an id
    // that a fragment only passes on (teaching re-exports activities) is
    // counted where it is defined, and an id defined twice is a failure of
    // checkCatalogs() below rather than something a Set quietly absorbs.
    uiStrings: Object.keys(sourceCatalog).length,
    // How many scenarios the stability audit actually covers. Read out of the
    // tool's own list rather than assumed to be all of them: /model/ claimed
    // the audit ran over "all 48 shipped scenarios" when it runs over twelve
    // chosen ones, which overstated the evidence rather than merely
    // miscounting it.
    stabilityScenarios: stabilityScenarioCount(),
    // Scenarios whose preset asks for asteroids or comets. Derived by applying
    // each preset to a fresh settings object, which is what the world builder
    // does, so the number cannot drift from the catalog.
    smallBodyScenarios: await smallBodyScenarioCount(),
    // The accessibility sweep, counted from the spec's own arrays.
    // The instructor bundle, from the manifest the build writes.
    instructorDocuments: bundle.documents,
    activityDocuments: activityDocumentCount(ACTIVITIES),
    activities: ACTIVITIES.length,
    axeSurfaces: axe.surfaces,
    axeThemes: axe.themes,
    axeRuns: axe.runs,
    // How many MIST evolutionary tracks are bundled, counted from the grid
    // itself. /model/ said "Seven tracks are bundled" directly above a list of
    // eight of them: the 40 solar-mass track was added and the sentence was
    // not. A count nobody derives is a count that drifts the moment the thing
    // it counts changes.
    stellarTracks: TRACK_IDS.length,
    // How many checks the release gate runs, from the registry that runs them.
    // paper.md quoted this by hand, which is a number that goes stale the first
    // time anyone adds a step.
    releaseChecks: CHECKS.length,
  };

  // Per-lesson step counts and durations, for the topic documents that name a
  // single lesson: `<!--fact:steps:tides-->30<!--/fact-->`.
  for (const lesson of lessons) {
    if (!lesson.id) continue;
    facts[`steps:${lesson.id}`] = stepsOf(lesson);
    if (lesson.duration) facts[`duration:${lesson.id}`] = lesson.duration;
  }
  return facts;
}

/**
 * A report an earlier CI step already produced, if it left one.
 *
 * GRAVITAS_FACTS_CACHE names a directory; a file in it stands in for running
 * the command that would have produced it. The point is not speed for its own
 * sake - it is that the `checks` job runs jest and the physics suite anyway,
 * and asking it to run them a second time so the documentation can be checked
 * is how "CI runs the full facts check" came to be a comment rather than a
 * step.
 *
 * Only CI sets it, and CI writes the files in the same job, from the same
 * commands, moments earlier. A cache that were somehow stale would make this
 * check agree with a run that did not happen, so nothing sets it by default and
 * the tool says when it used one.
 *
 * @param {string} name - File name inside the cache directory
 * @param {string[]} report - Notes, appended to when a cache is used
 * @returns {string|null} The file's contents, or null
 */
function cached(name, report) {
  const dir = process.env.GRAVITAS_FACTS_CACHE;
  if (!dir) return null;
  const at = join(dir, name);
  if (!existsSync(at)) return null;
  report.push(`reused ${rel(at)} rather than running it again`);
  return readFileSync(at, 'utf8');
}

/** Run a command and return its stdout, or null if it fails. */
function run(cmd, args, opts = {}) {
  try {
    return execFileSync(cmd, args, {
      cwd: REPO,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 64 * 1024 * 1024,
      ...opts,
    });
  } catch (err) {
    // Jest exits non-zero on a failing test but still writes its report; the
    // caller decides whether the output it produced is usable.
    return err.stdout || null;
  }
}

/**
 * The facts in the `tests` group: what a run of the suites counts.
 *
 * @param {string[]} report - Notes about anything that could not be measured
 * @param {object|null} physics - A physics report, when one has been read already
 * @returns {object} Facts
 */
function testFacts(report, physics) {
  const facts = {};

  // Jest, via its own JSON report rather than by parsing a summary line.
  const fromCache = cached('jest.json', report);
  let jestJson = fromCache;
  if (!jestJson) {
    const out = join(tmpdir(), `gravitas-jest-${process.pid}.json`);
    run('npx', ['jest', '--json', `--outputFile=${out}`, '--silent'], {
      env: { ...process.env, NODE_OPTIONS: '--experimental-vm-modules' },
    });
    if (existsSync(out)) jestJson = readFileSync(out, 'utf8');
  }
  if (jestJson) {
    const jest = JSON.parse(jestJson);
    facts.jestTests = jest.numTotalTests;
    facts.jestSuites = jest.numTotalTestSuites;
    if (jest.numFailedTests) {
      report.push(`jest reported ${jest.numFailedTests} failing test(s)`);
    }
  } else {
    report.push('could not read a Jest report');
  }

  // The browser suite, listed rather than run: the count is what the docs
  // quote, and listing takes a second where running takes minutes. In a
  // transform cache of its own, because under Jest this runs beside
  // tests/shardInventory.test.js's listings and a shared one lets either of
  // them delete a source map the other is about to read.
  const list = inOwnTransformCache(cacheEnv =>
    run('npx', ['playwright', 'test', '--list', '--reporter=list'], {
      env: { ...process.env, GRAVITAS_E2E_PORT: '4399', ...cacheEnv },
    })
  );
  const listed =
    list && list.match(/Total:\s+(\d+)\s+tests?\s+in\s+(\d+)\s+file/);
  if (listed) {
    facts.e2eTests = Number(listed[1]);
    facts.e2eFiles = Number(listed[2]);
  } else {
    report.push('could not list the browser suite');
  }

  // The physics total, taken from the same JSON report the coverage block is
  // built from rather than by parsing the human table. It used to be both: one
  // run of tools/validate-physics.mjs for the total and a second, with --json,
  // for the inventory. Two runs of a two-minute suite for two views of one
  // answer, every time, and nobody had reason to notice because nothing ran
  // this in CI.
  if (physics) {
    facts.physicsChecks = (physics.checks || []).length;
    const failing = (physics.checks || []).filter(c => c.pass === false).length;
    if (failing) report.push(`${failing} physics check(s) failing`);
  } else {
    report.push('could not read the physics validation totals');
  }

  return facts;
}

/**
 * Build sizes, from the metafile the production build leaves behind.
 *
 * Read rather than measured: `npm run build` already computes these and the
 * numbers in the README are quotations of its output.
 */
function buildFacts(report) {
  // From the cache first, for the same reason as the other two: a job that has
  // already measured this should not be asked to build again. It also makes
  // tests/docsFactsScope.test.js hermetic - it used to pass on a machine that
  // happened to have a dist/ lying around and fail in CI's `checks` job, which
  // has none, which is precisely the kind of check this file exists to stop.
  const fromCache = cached('build-summary.json', report);
  const summary = join(REPO, 'dist', 'build-summary.json');
  if (!fromCache && !existsSync(summary)) {
    report.push(
      'no dist/build-summary.json - run `npm run build` for build sizes'
    );
    return {};
  }
  const built = JSON.parse(fromCache || readFileSync(summary, 'utf8'));
  return {
    buildCss: built.cssKB,
    buildStartupJs: built.startupKB,
    buildStartupFiles: built.startupFiles,
    buildDeferredJs: built.deferredKB,
    buildDeferredChunks: built.deferredChunks,
    buildInitialDownload: built.initialKB,
  };
}

/**
 * Facts this tool knows how to produce but has not gathered in this mode.
 *
 * A document may cite any of these; a check that has not gathered one reports
 * it as skipped rather than as a typo. Build sizes are here because they move
 * with every code change, and failing the fast check on a stale `dist/` would
 * train people to ignore it.
 */
/**
 * Blocks only a `--full` run can produce.
 *
 * The coverage table is the physics suite's own inventory, and getting it means
 * running the suite - nearly two minutes. Without this, a cheap `docs:check`
 * would call the block unknown, which reads as "somebody wrote a marker nobody
 * generates" rather than "not measured on this run".
 */
const DEFERRED_BLOCKS_LEGACY = ['physicsCoverage'];

/**
 * The facts that cost something, grouped by what they cost.
 *
 * A group is the unit CI can afford in one job: everything in `tests` comes
 * from commands the `checks` job already runs, everything in `build` comes from
 * the artifact the `build` job already produces. Nothing may be in neither -
 * tests/releaseGate.test.js checks that the groups CI runs cover every key and
 * block this tool knows how to produce, which is the property that was missing
 * when "full" was a single flag nobody ran.
 */
export const FACT_GROUPS = Object.freeze({
  tests: Object.freeze({
    keys: Object.freeze([
      'jestTests',
      'jestSuites',
      'e2eTests',
      'e2eFiles',
      'physicsChecks',
    ]),
    blocks: Object.freeze(['physicsCoverage']),
    // CITATION.cff and .zenodo.json quote physicsChecks in their abstract, so
    // they can be judged exactly when that group has been gathered and not
    // before. A cheap run that rewrote them replaced the check total with a
    // placeholder, silently, in the two artifacts a DOI is minted from.
    generated: true,
  }),
  build: Object.freeze({
    keys: Object.freeze([
      'buildCss',
      'buildStartupJs',
      'buildStartupFiles',
      'buildDeferredJs',
      'buildDeferredChunks',
      'buildInitialDownload',
    ]),
    blocks: Object.freeze([]),
    generated: false,
  }),
});

/** Every group name, which is what `--full` means. */
export const ALL_GROUPS = Object.freeze(Object.keys(FACT_GROUPS));

const DEFERRED_KEYS = ALL_GROUPS.flatMap(g => [...FACT_GROUPS[g].keys]);
const DEFERRED_BLOCKS = ALL_GROUPS.flatMap(g => [...FACT_GROUPS[g].blocks]);

// The list this replaced, kept only to fail loudly if a block is ever added to
// a group and forgotten here. Two lists of the same thing is how this file's
// predecessor drifted.
if (DEFERRED_BLOCKS_LEGACY.some(b => !DEFERRED_BLOCKS.includes(b))) {
  throw new Error('a deferred block belongs to no fact group');
}

/**
 * Which groups a run gathers, from its flags.
 *
 * @param {string[]} argv - Command-line arguments
 * @returns {Set<string>} Group names
 */
export function groupsFrom(argv) {
  if (argv.includes('--full')) return new Set(ALL_GROUPS);
  const flag = argv.find(a => a.startsWith('--groups='));
  if (!flag) return new Set();
  const asked = flag
    .slice('--groups='.length)
    .split(',')
    .map(g => g.trim())
    .filter(Boolean);
  const unknown = asked.filter(g => !ALL_GROUPS.includes(g));
  if (unknown.length) {
    throw new Error(
      `Unknown fact group(s): ${unknown.join(', ')}. ` +
        `Known groups: ${ALL_GROUPS.join(', ')}.`
    );
  }
  return new Set(asked);
}

/**
 * The generated regions, from the same modules the application uses.
 *
 * Separate from gatherFacts() because a block is a rendered fragment rather
 * than a value, and because only the sync/check path needs them.
 *
 * @returns {Promise<Object<string, string>>} Marker name -> replacement text
 */
export async function gatherBlocks({ physics = null } = {}) {
  const { MANIFEST } = await import(
    new URL('../js/data/investigations/manifest.js', import.meta.url)
  );
  const { INSTRUCTOR_CONTENT } = await import(
    new URL('../js/data/instructorContent.js', import.meta.url)
  );
  const { IRREVERSIBLE } = await import(
    new URL('../js/data/irreversible.js', import.meta.url)
  );
  return generatedBlocks({
    manifest: MANIFEST,
    instructor: INSTRUCTOR_CONTENT,
    physics: physics ? physicsInventory(physics) : null,
    // Cheap: reading a generated data module, not running anything. The audit
    // it comes from is itself checked by `npm run audit:irreversible -- --check`.
    irreversible: IRREVERSIBLE,
  });
}

/**
 * The physics suite's report, run once or read from what CI already ran.
 *
 * @param {string[]} report - Notes, for a run that could not be read
 * @returns {object|null} The parsed report
 */
function physicsReport(report) {
  const out =
    cached('physics.json', report) ||
    run('node', ['tools/validate-physics.mjs', '--json']);
  if (!out) {
    report.push('could not run the physics validation suite');
    return null;
  }
  try {
    return JSON.parse(out);
  } catch {
    report.push('the physics validation report was not readable JSON');
    return null;
  }
}

/**
 * The physics suite's own count of itself, by group and by kind.
 *
 * Takes the report rather than producing one, so the total and the inventory
 * come from a single run of a two-minute suite instead of two.
 *
 * @param {object} report - A parsed `validate-physics.mjs --json` report
 * @returns {{total: number, byKind: object, groups: Array}|null} The inventory
 */
function physicsInventory(report) {
  if (!report) return null;
  const byKind = {};
  const groups = [];
  const index = new Map();
  for (const check of report.checks || []) {
    byKind[check.kind] = (byKind[check.kind] || 0) + 1;
    if (!index.has(check.group)) {
      index.set(check.group, { group: check.group, checks: 0, kinds: {} });
      groups.push(index.get(check.group));
    }
    const g = index.get(check.group);
    g.checks++;
    g.kinds[check.kind] = (g.kinds[check.kind] || 0) + 1;
  }
  return { total: (report.checks || []).length, byKind, groups };
}

/**
 * Everything the asked-for groups can produce.
 *
 * Returns the physics report alongside the facts so the caller can build the
 * coverage block from the same run rather than paying for a second one.
 *
 * @param {object} [options] - `groups`, a Set of group names
 * @returns {Promise<{facts: object, notes: string[], physics: object|null}>} The facts
 */
export async function gatherFacts({ groups = new Set() } = {}) {
  const notes = [];
  const physics = groups.has('tests') ? physicsReport(notes) : null;
  const facts = {
    ...(await cheapFacts()),
    ...(groups.has('build') ? buildFacts(notes) : {}),
    ...(groups.has('tests') ? testFacts(notes, physics) : {}),
  };
  return { facts, notes, physics };
}

// --- documents ---------------------------------------------------------------

/**
 * Rewrite or verify the marked spans in one file.
 * @returns {{path: string, stale: Array, unknown: Array, skipped: Array,
 *   text: string}} Outcome
 */
function applyToText(path, text, facts, blocks = {}) {
  const stale = [];
  const unknown = [];
  const skipped = [];
  let next = text.replace(MARKER, (whole, key, current) => {
    if (!(key in facts)) {
      if (DEFERRED_KEYS.includes(key)) skipped.push(key);
      else unknown.push(key);
      return whole;
    }
    const wanted = String(facts[key]);
    if (current !== wanted) stale.push({ key, current, wanted });
    return `<!--fact:${key}-->${wanted}<!--/fact-->`;
  });

  // Generated regions, the block-level form. Same idea, but the replacement is
  // many lines rather than a number - a table generated from the lessons, for
  // instance. Reported as one stale entry rather than a diff: the point is
  // that it is out of date, and `npm run docs:sync` is the fix either way.
  next = next.replace(BLOCK_MARKER, (whole, name, current) => {
    if (!(name in blocks)) {
      if (DEFERRED_BLOCKS.includes(name)) skipped.push(`block:${name}`);
      else unknown.push(`block:${name}`);
      return whole;
    }
    const wanted = blocks[name];
    if (current !== wanted) {
      // Name the first line that differs, not just the line counts. A block
      // whose total is right and whose categories are wrong has the same
      // number of lines as the one it should be, and "28 line(s), the source
      // says 28 line(s)" tells a reader only that something, somewhere, moved.
      const was = current.trim().split('\n');
      const now = wanted.trim().split('\n');
      const at = was.findIndex((line, i) => line !== now[i]);
      const differs = at >= 0 && at < now.length;
      // Window the excerpt on the difference. Truncating from the start of the
      // line shows two identical prefixes and hides the one character that
      // moved, which is worse than printing nothing.
      const window = line => {
        if (!differs) return '';
        const a = was[at];
        const b = now[at];
        let i = 0;
        while (i < a.length && i < b.length && a[i] === b[i]) i++;
        const from = Math.max(0, i - 24);
        return (from ? '…' : '') + line.slice(from, from + 72).trim();
      };
      stale.push({
        key: `block:${name}`,
        current: differs
          ? `line ${at + 1}: ${window(was[at])}`
          : `${was.length} line(s)`,
        wanted: differs
          ? window(now[at])
          : `${now.length} line(s), regenerated`,
      });
    }
    return `<!--fact-block:${name}-->${wanted}<!--/fact-block-->`;
  });

  for (const rule of ATTRIBUTE_FACTS) {
    if (rule.file !== path) continue;
    if (!(rule.key in facts)) {
      if (DEFERRED_KEYS.includes(rule.key)) skipped.push(rule.key);
      else unknown.push(rule.key);
      continue;
    }
    const wanted = String(facts[rule.key]);
    const found = rule.pattern.exec(next);
    if (!found) {
      unknown.push(`attribute:${rule.key}`);
      continue;
    }
    if (found[2] !== wanted) {
      stale.push({ key: `${rule.key} (attribute)`, current: found[2], wanted });
    }
    next = next.replace(rule.pattern, `$1${wanted}$3`);
  }

  return { path, stale, unknown, skipped, text: next };
}

/** Markdown links to files and headings inside this repository. */
async function checkDocLinks(files) {
  const broken = [];
  const slug = heading =>
    heading
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');

  const headings = new Map();
  for (const file of files) {
    const text = await readFile(join(REPO, file), 'utf8');
    headings.set(
      file,
      new Set([...text.matchAll(/^#{1,6}\s+(.+?)\s*$/gm)].map(m => slug(m[1])))
    );
  }

  for (const file of files) {
    const text = await readFile(join(REPO, file), 'utf8');
    for (const m of text.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      const target = m[1];
      if (/^(https?:|mailto:|#!)/.test(target)) continue;
      const [pathPart, anchor] = target.split('#');
      const onFile = pathPart
        ? resolve(REPO, dirname(join(REPO, file)), pathPart)
        : join(REPO, file);
      if (pathPart && !existsSync(onFile)) {
        broken.push(`${file}: link to ${target} (no such file)`);
        continue;
      }
      if (!anchor) continue;
      const key = rel(onFile);
      if (!key.endsWith('.md')) continue;
      const known =
        headings.get(key) ??
        new Set(
          [
            ...(await readFile(onFile, 'utf8')).matchAll(
              /^#{1,6}\s+(.+?)\s*$/gm
            ),
          ].map(h => slug(h[1]))
        );
      if (!known.has(anchor))
        broken.push(`${file}: ${target} (no such heading)`);
    }
  }
  return broken;
}

/**
 * Commands and repository paths the documentation tells a reader to use.
 *
 * The counts are not the only thing that rots. An `npm run` that was renamed,
 * or a module that moved, sends a reader to a dead end just as effectively as
 * a wrong number, and neither shows up in a spell check.
 *
 * @param {Array<string>} files - Documents to scan
 * @returns {Promise<Array<string>>} Human-readable problems
 */
/**
 * Markers have to sit inside a line, never start one.
 *
 * Prettier treats an HTML comment that begins a line as a block-level node and
 * puts blank lines around it, which silently splits one paragraph into three.
 * The damage is invisible in the diff that causes it and obvious on the
 * rendered page, so it is worth a rule.
 *
 * @param {Array<string>} files - Documents to scan
 * @returns {Promise<Array<string>>} Human-readable problems
 */
async function checkMarkerPlacement(files) {
  const problems = [];
  for (const file of files) {
    const lines = (await readFile(join(REPO, file), 'utf8')).split('\n');
    lines.forEach((line, i) => {
      if (line.startsWith('<!--fact:')) {
        problems.push(
          `${file}:${i + 1}: a fact marker starts the line; Prettier will break ` +
            'the paragraph around it. Put a word in front of it.'
        );
      }
    });
  }
  return problems;
}

/**
 * Every browser spec is described in e2e/README.md.
 *
 * That table is the only index of what the browser suite covers, and a spec
 * added without a row in it is a spec nobody knows exists. Cheap to check, and
 * it has already been wrong once.
 *
 * @returns {Promise<Array<string>>} Human-readable problems
 */
/**
 * The counts in the citation metadata.
 *
 * CITATION.cff and .zenodo.json each carry a prose abstract that states how
 * many scenarios and investigations Gravitas ships. Neither is markdown, so
 * neither can carry a `<!--fact:-->` marker, and for that reason neither was
 * checked by anything: both sat at "43 configurable scenarios" and "six guided
 * investigations" while the real figures reached 53 and 12.
 *
 * These two files are the ones a citation is minted from, so a stale number in
 * them outlives the repository. Rather than invent a marker syntax for YAML and
 * JSON, this reads the two counts straight out of the prose and compares them.
 * The abstracts must therefore write both as digits; a spelled-out number is
 * reported as missing, which is the failure a reader would want.
 *
 * @param {Object} facts - The computed facts
 * @returns {Promise<Array<string>>} Problems, empty when the metadata agrees
 */
async function checkCitationMetadata(facts) {
  const problems = [];
  const wanted = [
    ['scenarios', /(\d+)\s+configurable scenarios/, 'configurable scenarios'],
    [
      'investigations',
      /(\d+)\s+guided investigations/,
      'guided investigations',
    ],
  ];
  for (const file of ['CITATION.cff', '.zenodo.json']) {
    const path = join(REPO, file);
    if (!existsSync(path)) continue;
    // Newline-insensitive: the CFF abstract is a folded block and wraps.
    const text = (await readFile(path, 'utf8')).replace(/\s+/g, ' ');
    for (const [key, pattern, label] of wanted) {
      const found = pattern.exec(text);
      if (!found) {
        problems.push(
          `${file}: no "<n> ${label}" count found; write the number as digits so it can be checked`
        );
        continue;
      }
      if (Number(found[1]) !== Number(facts[key])) {
        problems.push(
          `${file}: "${label}" says ${found[1]}, the source says ${facts[key]}`
        );
      }
    }
  }
  return problems;
}

/**
 * Claims about the physics suite made inside the lesson metadata.
 *
 * `modelNotes` is authoritative prose - it is printed in the instructor guide
 * and, since this pass, generated into /model/ as well - so a number in it
 * reaches two documents. One of them said "Thirty-six checks in the Orbital
 * resonance group" over a group of thirty-two, which is the kind of claim that
 * is only ever checked by someone who already doubts it.
 *
 * Spelled-out numbers are read as well as digits, because that is how the
 * prose is written and rewriting it as digits to make it checkable would be
 * letting the tool dictate the prose.
 *
 * @returns {Promise<string[]>} Problems
 */
async function checkModelNoteClaims() {
  const problems = [];
  const checksPath = join(REPO, 'tools', 'physics-checks.mjs');
  if (!existsSync(checksPath)) return problems;

  const source = readFileSync(checksPath, 'utf8');
  const groups = new Map();
  for (const m of source.matchAll(/group:\s*'([^']+)'/g)) {
    groups.set(m[1], (groups.get(m[1]) || 0) + 1);
  }

  const WORDS = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eleven: 11,
    twelve: 12,
    thirteen: 13,
    fourteen: 14,
    fifteen: 15,
    sixteen: 16,
    seventeen: 17,
    eighteen: 18,
    nineteen: 19,
    twenty: 20,
    'twenty-one': 21,
    'twenty-two': 22,
    'twenty-three': 23,
    'twenty-four': 24,
    'twenty-five': 25,
    'twenty-six': 26,
    'twenty-seven': 27,
    'twenty-eight': 28,
    'twenty-nine': 29,
    thirty: 30,
    'thirty-one': 31,
    'thirty-two': 32,
    'thirty-three': 33,
    'thirty-four': 34,
    'thirty-five': 35,
    'thirty-six': 36,
    forty: 40,
  };

  const { INSTRUCTOR_CONTENT } = await import(
    new URL('../js/data/instructorContent.js', import.meta.url)
  );
  for (const [id, content] of Object.entries(INSTRUCTOR_CONTENT)) {
    const notes = content.modelNotes || '';
    const claim =
      /([A-Za-z-]+|\d+)\s+checks?\s+in\s+the\s+.?([^.'"\u201c\u201d]+?).?\s+group/gi;
    for (const m of notes.matchAll(claim)) {
      const raw = m[1].toLowerCase();
      const claimed = raw in WORDS ? WORDS[raw] : Number(raw);
      if (!Number.isFinite(claimed)) continue;
      const group = m[2].replace(/['"\u201c\u201d]/g, '').trim();
      const actual = groups.get(group);
      if (actual === undefined) {
        problems.push(
          `js/data/instructorContent.js (${id}): modelNotes names a physics-check group "${group}" that does not exist`
        );
      } else if (actual !== claimed) {
        problems.push(
          `js/data/instructorContent.js (${id}): modelNotes says ${m[1]} checks in "${group}", the suite has ${actual}`
        );
      }
    }
  }
  return problems;
}

/**
 * Whether the catalog `uiStrings` counts is one catalog at all.
 *
 * A fragment in one language only, an id defined in two fragments or a
 * fragment that exports under the wrong name each make the count describe
 * something other than what a reader can load, so a count taken over a broken
 * layout is a failure here rather than a number written into README.md.
 * tools/i18n-audit.mjs reports the same problems; this is the half that stops
 * `docs:sync` from publishing over them.
 *
 * @returns {Promise<string[]>} Problems, prefixed with where they are
 */
async function checkCatalogs() {
  const { problems } = await loadCatalogs();
  return problems.map(p => `js/i18n: ${p}`);
}

async function checkSpecIndex() {
  const readme = join(REPO, 'e2e', 'README.md');
  if (!existsSync(readme)) return [];
  const text = await readFile(readme, 'utf8');
  const { readdirSync } = await import('node:fs');
  return readdirSync(join(REPO, 'e2e'))
    .filter(f => f.endsWith('.spec.js'))
    .filter(f => !text.includes(f))
    .map(f => `e2e/README.md: ${f} is not in the "What is here" table`);
}

async function checkReferences(files) {
  const scripts = new Set(
    Object.keys(
      JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8')).scripts
    )
  );
  const DIRS =
    '(?:js|tools|tests|e2e|css|model|instructors|notebooks|manual|validation)';
  const problems = [];
  for (const file of files) {
    const text = await readFile(join(REPO, file), 'utf8');
    for (const m of text.matchAll(/npm run ([a-zA-Z0-9:_-]+)/g)) {
      if (!scripts.has(m[1])) {
        problems.push(`${file}: \`npm run ${m[1]}\` is not a script`);
      }
    }
    for (const m of text.matchAll(
      new RegExp(`\`(${DIRS}/[A-Za-z0-9_./-]+)\``, 'g')
    )) {
      const path = m[1].replace(/\.$/, '');
      if (!existsSync(join(REPO, path))) {
        problems.push(`${file}: \`${path}\` does not exist`);
      }
    }
  }
  return problems;
}

// --- LaTeX -------------------------------------------------------------------

/**
 * The same facts as macros, for the user manual.
 *
 * The manual is built from LaTeX in manual/, and hard-coding a scenario count
 * into a PDF is the easiest number in the project to forget. `\GravScenarios`
 * cannot go stale without this file changing, and this file is regenerated by
 * the same command that syncs the Markdown.
 */
function factsTex(facts, existing = '') {
  // LaTeX control sequences are letters only, so `e2eTests` has to lose its
  // digit rather than silently become `EeTests`: digits are spelled out.
  const DIGITS = [
    'Zero',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
  ];
  const macro = key =>
    'Grav' +
    key
      .replace(/[:_-]([a-z0-9])/g, (_, c) => c.toUpperCase())
      .replace(/^([a-z])/, (_, c) => c.toUpperCase())
      .replace(/[0-9]/g, d => DIGITS[Number(d)])
      .replace(/[^A-Za-z]/g, '');
  // A fact this run could not measure keeps whatever the file already had.
  // Only `--full` can produce the test and build counts, and a cheap sync that
  // dropped their macros would leave the manual unbuildable rather than
  // slightly out of date.
  const kept = new Map();
  for (const m of existing.matchAll(/\\newcommand\{\\(\w+)\}\{([^}]*)\}/g)) {
    kept.set(m[1], m[2]);
  }
  for (const [key, value] of Object.entries(facts)) {
    kept.set(macro(key), String(value));
  }

  const lines = [
    '% Generated by tools/docs-facts.mjs - do not edit.',
    '% Regenerate with: npm run docs:sync (add --full for the test counts).',
    '',
  ];
  for (const [name, value] of [...kept.entries()].sort()) {
    lines.push(`\\newcommand{\\${name}}{${value}}`);
  }
  return lines.join('\n') + '\n';
}

// --- entry point -------------------------------------------------------------

async function main() {
  const argv = process.argv.slice(2);
  const has = flag => argv.includes(flag);
  const mode = has('--sync') ? 'sync' : has('--check') ? 'check' : 'print';
  let groups;
  try {
    groups = groupsFrom(argv);
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    return 2;
  }
  const { facts, notes, physics } = await gatherFacts({ groups });

  if (has('--json')) {
    process.stdout.write(JSON.stringify(facts, null, 2) + '\n');
    return 0;
  }

  if (mode === 'print') {
    const width = Math.max(...Object.keys(facts).map(k => k.length));
    for (const [key, value] of Object.entries(facts)) {
      process.stdout.write(`${key.padEnd(width)}  ${value}\n`);
    }
    for (const note of notes) process.stdout.write(`note: ${note}\n`);
    return 0;
  }

  const blocks = await gatherBlocks({ physics });
  const present = DOCS.filter(d => existsSync(join(REPO, d)));
  const results = [];
  for (const doc of present) {
    const text = await readFile(join(REPO, doc), 'utf8');
    const outcome = applyToText(doc, text, facts, blocks);
    results.push(outcome);
    if (mode === 'sync' && outcome.text !== text) {
      await writeFile(join(REPO, doc), outcome.text);
    }
  }

  // The citation pair, generated together from tools/project-metadata.mjs so
  // they cannot disagree. Zenodo prefers .zenodo.json when both are present,
  // which is precisely why a stale one is dangerous rather than merely untidy.
  //
  // Only `--full` may touch them. Their abstract quotes physicsChecks, which a
  // cheap run does not measure, so a cheap run cannot tell a correct file from
  // a stale one and must not rewrite it: doing so replaced the check total
  // with a placeholder in both files, silently, in the two artifacts a DOI is
  // minted from. Without --full they are neither written nor judged, and the
  // skipped note says so.
  const generatedStale = [];
  const generatedSkipped = [];
  if (groups.has('tests')) {
    for (const [name, wanted] of [
      ['CITATION.cff', citationCff(facts)],
      ['.zenodo.json', zenodoJson(facts)],
    ]) {
      const path = join(REPO, name);
      const current = existsSync(path) ? readFileSync(path, 'utf8') : '';
      if (current !== wanted) {
        generatedStale.push(name);
        if (mode === 'sync') await writeFile(path, wanted);
      }
    }
  } else {
    generatedSkipped.push('CITATION.cff', '.zenodo.json');
  }

  const texPath = join(REPO, 'manual', 'facts.tex');
  let texStale = false;
  if (existsSync(join(REPO, 'manual'))) {
    const current = existsSync(texPath) ? readFileSync(texPath, 'utf8') : '';
    const wanted = factsTex(facts, current);
    texStale = current !== wanted;
    if (mode === 'sync' && texStale) await writeFile(texPath, wanted);
  }

  const broken = [
    ...(await checkDocLinks(present)),
    ...(await checkReferences(present)),
    ...(await checkMarkerPlacement(present)),
    ...(await checkSpecIndex()),
    ...(await checkCitationMetadata(facts)),
    ...(await checkModelNoteClaims()),
    ...(await checkCatalogs()),
  ];
  const stale = results.flatMap(r => r.stale.map(s => ({ ...s, doc: r.path })));
  const unknown = results.flatMap(r =>
    r.unknown.map(k => ({ key: k, doc: r.path }))
  );

  if (mode === 'sync') {
    const changed = results.filter(r => r.stale.length);
    for (const r of changed) {
      process.stdout.write(
        `${r.path}: updated ${r.stale.map(s => s.key).join(', ')}\n`
      );
    }
    if (texStale) process.stdout.write('manual/facts.tex: regenerated\n');
    for (const name of generatedStale) {
      process.stdout.write(`${name}: regenerated\n`);
    }
    if (!changed.length && !texStale && !generatedStale.length) {
      process.stdout.write(
        'Every documented count already matches the source.\n'
      );
    }
    if (generatedSkipped.length) {
      process.stdout.write(
        `note: not regenerated without --groups=tests: ${generatedSkipped.join(', ')}\n`
      );
    }
    for (const u of unknown) {
      process.stderr.write(`${u.doc}: unknown fact "${u.key}"\n`);
    }
    for (const b of broken) process.stderr.write(`${b}\n`);
    return unknown.length || broken.length ? 1 : 0;
  }

  // check
  for (const s of stale) {
    process.stderr.write(
      `${s.doc}: "${s.key}" says ${s.current}, the source says ${s.wanted}\n`
    );
  }
  for (const u of unknown) {
    process.stderr.write(`${u.doc}: unknown fact "${u.key}"\n`);
  }
  if (texStale) process.stderr.write('manual/facts.tex is out of date\n');
  for (const name of generatedStale) {
    process.stderr.write(
      `${name} is out of date; it is generated from tools/project-metadata.mjs ` +
        'by `npm run docs:sync -- --full` (a cheap sync will not write it)\n'
    );
  }
  for (const b of broken) process.stderr.write(`${b}\n`);
  for (const note of notes) process.stdout.write(`note: ${note}\n`);
  if (generatedSkipped.length) {
    process.stdout.write(
      `note: needs --groups=tests or --full: ${generatedSkipped.join(', ')}\n`
    );
  }
  const skipped = [...new Set(results.flatMap(r => r.skipped))];
  if (skipped.length) {
    // Name the group that would have measured each one, so a reader of a green
    // run can see what this run did not establish and what to pass to get it.
    const byGroup = new Map();
    for (const key of skipped) {
      const bare = key.replace(/^block:/, '');
      const group =
        ALL_GROUPS.find(
          g =>
            FACT_GROUPS[g].keys.includes(bare) ||
            FACT_GROUPS[g].blocks.includes(bare)
        ) || 'unknown';
      if (!byGroup.has(group)) byGroup.set(group, []);
      byGroup.get(group).push(key);
    }
    for (const [group, keys] of [...byGroup].sort()) {
      process.stdout.write(
        `note: needs --groups=${group}: ${keys.join(', ')}\n`
      );
    }
  }

  const bad =
    stale.length +
    unknown.length +
    broken.length +
    (texStale ? 1 : 0) +
    generatedStale.length;
  if (bad) {
    process.stderr.write(
      `\n${bad} documentation problem(s). Run \`npm run docs:sync\`.\n`
    );
    return 1;
  }
  process.stdout.write(
    `Documentation matches the source (${present.length} files).\n`
  );
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().then(code => process.exit(code));
}
