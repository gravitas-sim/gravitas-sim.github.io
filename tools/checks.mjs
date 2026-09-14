// =============================================================================
// One list of what has to pass
// -----------------------------------------------------------------------------
// `npm run release:check` and .github/workflows/ci.yml were two lists of the
// same thing, maintained separately, and they drifted. `npm run validate:links`
// was in CI and not in the gate; `npm run validate:scenarios` was in the gate
// and not in CI; `npm run cards:check`, `npm run activities:check`,
// `npm run gw:check`, `npm run stellar:check` and `npm run docs:check -- --full`
// were in neither, which is how ten counts in README.md came to be wrong by a
// thousand tests and a lesson card came to be a picture of a lesson that had
// changed.
//
// So this is the list, and both sides read it. release-check.mjs runs it.
// tests/checkRegistry.test.js reads .github/workflows/ci.yml and fails when a
// step there is missing here, or an entry here claims a CI job it is not in.
// The workflow is still hand-written YAML - GitHub needs it that way - but it
// can no longer quietly disagree with the gate.
//
// Tiers
// -----------------------------------------------------------------------------
//   quick        Seconds. Always run.
//   slow         Minutes. Skipped by --fast, and --fast says so.
//   provenance   Regenerates a scientific dataset from its pinned upstream
//                source and compares byte for byte. Only under --provenance,
//                because it needs 100 MB of cached MIST grid and the GWOSC
//                traces, and it fails rather than passes when they are absent.
//   platform     Needs a browser engine this machine may not have installed.
//                Reported unavailable, never silently skipped.
// =============================================================================

import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Where each data builder keeps its copy of the published source. */
const CACHES = {
  gw: path.join(REPO, '.gw-cache'),
  stellar: path.join(REPO, '.mist-cache'),
};

/**
 * Whether a pinned scientific source is on this machine.
 *
 * Probed rather than discovered by running the check, so that "the data drifted
 * from its source" and "the source is not here to compare against" are two
 * different answers. The first is a failure. The second is a gap in what this
 * run was able to establish, and a release summary that calls it a pass is
 * lying about which.
 *
 * @param {'gw'|'stellar'} which - The dataset
 * @returns {boolean} True when the cache has something in it
 */
export function sourcesCached(which) {
  const dir = CACHES[which];
  if (!dir || !existsSync(dir)) return false;
  try {
    return readdirSync(dir).length > 0;
  } catch {
    return false;
  }
}

/**
 * Whether a Playwright engine is actually installed here.
 *
 * Asked of Playwright rather than of a cache directory, because the version
 * suffix in that path changes with every Playwright release and a check that
 * guesses it reports "unavailable" on a machine that has the browser.
 *
 * @param {string} name - 'chromium', 'firefox' or 'webkit'
 * @returns {Promise<boolean>} True when the binary is on disk
 */
export async function engineInstalled(name) {
  try {
    const pw = await import('playwright');
    const path = pw[name]?.executablePath?.();
    return Boolean(path && existsSync(path));
  } catch {
    return false;
  }
}

// --- What a check can come back as -------------------------------------------
// Five outcomes, because four of them used to be one. A gate that prints `ok`
// for "passed", for "skipped by --fast", for "the engine is not installed" and
// for "passed on the second attempt" is a gate whose summary cannot be quoted.
export const OUTCOMES = Object.freeze({
  PASS: 'pass',
  FAIL: 'fail',
  SKIP: 'skip',
  // The machine cannot do this: no WebKit installed, no cached MIST grid.
  // Distinct from SKIP, which is a choice the caller made.
  UNAVAILABLE: 'unavailable',
  RETRIED: 'retried',
  // A browser that would not start. Distinct from FAIL, because the software
  // under test said nothing - reporting it as a product failure sends somebody
  // looking for a bug that is not there, and reporting it as a pass is worse.
  LAUNCH_FAILED: 'launch-failed',
});

/** Only one of the five means the thing it checked is sound. */
const GREEN = new Set([OUTCOMES.PASS]);

/**
 * Turn a run's results into counts and one sentence that cannot overstate them.
 *
 * Kept here, away from the printing, because the sentence is the part worth a
 * test: "everything passes" is available only when nothing was skipped, nothing
 * was unavailable, nothing was retried and nothing failed.
 *
 * @param {Array<{status: string, label: string, note?: string}>} results - One per check
 * @returns {{counts: object, green: boolean, complete: boolean, headline: string}} Summary
 */
export function summarise(results) {
  const counts = {};
  for (const key of Object.values(OUTCOMES)) {
    counts[key] = results.filter(r => r.status === key).length;
  }
  const total = results.length;
  const ran =
    counts[OUTCOMES.PASS] + counts[OUTCOMES.FAIL] + counts[OUTCOMES.RETRIED];
  const notRun =
    counts[OUTCOMES.SKIP] +
    counts[OUTCOMES.UNAVAILABLE] +
    counts[OUTCOMES.LAUNCH_FAILED];
  // Tests skipped *inside* a check that otherwise passed. A browser suite that
  // exits zero having skipped thirty tests is not the same as one that ran
  // them, and the exit code cannot tell the difference.
  const innerSkipped = results.reduce((n, r) => n + (r.skippedTests || 0), 0);
  const complete = total > 0 && notRun === 0;
  const green = complete && results.every(r => GREEN.has(r.status));

  let headline;
  if (counts[OUTCOMES.FAIL]) {
    headline =
      `${counts[OUTCOMES.FAIL]} check(s) failed. ` +
      'Nothing was tagged, released or minted.';
  } else if (counts[OUTCOMES.RETRIED]) {
    headline =
      `${counts[OUTCOMES.RETRIED]} check(s) passed only on a retry, so this ` +
      'run did not establish that the release is sound.';
  } else if (counts[OUTCOMES.LAUNCH_FAILED]) {
    headline =
      `${counts[OUTCOMES.LAUNCH_FAILED]} check(s) could not launch a browser, ` +
      'so what they cover was not tested either way.';
  } else if (!complete) {
    headline =
      `${counts[OUTCOMES.PASS]} of ${total} checks passed. ${notRun} did not ` +
      'run, so this is not a statement about the release - only about the ' +
      'subset that ran.';
  } else {
    headline = `All ${total} checks passed.`;
  }
  // Green means every check ran and passed outright. Tests skipped inside a
  // passing check do not make it red - they are the suite's own business, and
  // the allowlist in tools/check-test-policy.mjs is what keeps them honest -
  // but they are reported, because "everything passed" reads differently when
  // thirty tests declined to run.
  return { counts, green, complete, ran, notRun, innerSkipped, headline };
}

/**
 * @typedef {object} Check
 * @property {string} id - Stable identifier, used by the drift test
 * @property {string} label - What it checks, in words, for the summary
 * @property {string[]} command - argv
 * @property {'quick'|'slow'|'provenance'|'platform'} tier - When it runs
 * @property {?string} ci - The CI job key it also runs in, or null
 * @property {string} [group] - Heading in the release summary
 * @property {string} [engine] - For platform checks: the engine it needs
 * @property {string} [why] - Why it is gate-only, when ci is null
 */

/** The heading each group prints under. */
export const GROUPS = {
  correctness: 'Correctness',
  generated: 'Generated artifacts are current',
  science: 'Scientific data',
  platform: 'Other engines',
};

/** @type {Check[]} */
export const CHECKS = [
  // --- Correctness -----------------------------------------------------------
  {
    id: 'format',
    label: 'formatting',
    command: ['npm', 'run', 'format:check'],
    tier: 'quick',
    ci: 'checks',
    group: 'correctness',
  },
  {
    id: 'lint',
    label: 'lint',
    command: ['npm', 'run', 'lint'],
    tier: 'quick',
    ci: 'checks',
    group: 'correctness',
  },
  {
    id: 'architecture',
    label: 'module architecture',
    command: ['npm', 'run', 'check:architecture'],
    tier: 'quick',
    ci: 'checks',
    group: 'correctness',
  },
  {
    id: 'author',
    label: 'investigations validate',
    command: ['npm', 'run', 'author:check'],
    tier: 'quick',
    ci: 'checks',
    group: 'correctness',
  },
  {
    id: 'links',
    label: 'internal links and anchors (sources)',
    command: ['npm', 'run', 'validate:links'],
    tier: 'quick',
    ci: 'checks',
    group: 'correctness',
  },
  {
    id: 'test-policy',
    label: 'browser-suite skip policy',
    command: ['npm', 'run', 'test:policy'],
    tier: 'quick',
    ci: null,
    why: 'added with the policy itself; runs in a fraction of a second',
    group: 'correctness',
  },
  {
    id: 'deps',
    label: 'dependency audit',
    command: ['npm', 'run', 'deps:audit'],
    tier: 'quick',
    ci: 'checks',
    group: 'correctness',
  },
  {
    id: 'unit',
    label: 'unit tests',
    command: ['npm', 'test'],
    tier: 'slow',
    ci: 'checks',
    group: 'correctness',
  },
  {
    id: 'physics',
    label: 'physics validation',
    command: ['npm', 'run', 'validate:physics'],
    tier: 'slow',
    ci: 'checks',
    group: 'correctness',
  },
  {
    id: 'scenarios',
    label: 'scenario stability',
    command: ['npm', 'run', 'validate:scenarios'],
    tier: 'slow',
    ci: null,
    why: 'minutes of integration; the browser shards cover the same worlds',
    group: 'correctness',
  },
  // The manifest question comes before the build, and the order matters.
  //
  // `npm run build` regenerates sw-manifest.js as its third step. Asking
  // afterwards whether the committed manifest is current is asking a question
  // the build has already answered: the file on disk is one the generator just
  // wrote, so it always matches and the check always passes. That vacuity is
  // not theoretical - it shipped. The gate came back green on 32 of 32 with a
  // stale committed manifest, and CI caught it only because its lint job runs
  // `npm test` against a clean checkout with nothing built. A stale cache
  // version is not cosmetic: the service worker keeps serving the old app to
  // returning readers until the version changes.
  //
  // This used to be ordered the other way round, on the reasoning that a stale
  // manifest surfacing as a buildIntegrity failure sends you looking in the
  // wrong place. That reasoning was about the diagnostic, and the cure was
  // worse than the complaint - it silenced the finding rather than explaining
  // it. Running the dedicated check first is what fixes the diagnostic: it
  // names the manifest, and tests/buildIntegrity.test.js is no longer the
  // messenger.
  //
  // It sits under correctness rather than with the generated artifacts because
  // that group runs after the build. The artifacts left in it are the ones the
  // build does not rewrite.
  {
    id: 'sw',
    label: 'service-worker precache manifest',
    command: ['npm', 'run', 'sw:check'],
    tier: 'quick',
    ci: 'checks',
    group: 'correctness',
  },
  {
    id: 'build',
    label: 'production build',
    command: ['npm', 'run', 'build'],
    tier: 'slow',
    ci: 'build',
    group: 'correctness',
  },
  {
    id: 'budget',
    label: 'bundle budget',
    command: ['npm', 'run', 'budget:check'],
    tier: 'slow',
    ci: 'build',
    group: 'correctness',
  },
  {
    id: 'composition',
    label: 'start-up bundle composition',
    command: ['npm', 'run', 'budget:composition', '--', '--check'],
    tier: 'slow',
    ci: null,
    why: 'needs an esbuild pass; the gate has one already',
    group: 'correctness',
  },
  {
    id: 'links-dist',
    label: 'internal links and anchors (built site)',
    command: ['npm', 'run', 'validate:links:dist'],
    tier: 'slow',
    ci: 'build',
    group: 'correctness',
  },
  // Two workers, no retries. Not a weaker run than CI's - a stricter one, and a
  // fairer one. `npm run e2e` leaves the worker count to Playwright, which
  // takes half the machine's cores; on a developer laptop that is six browsers,
  // six dev-server clients and six canvases competing for one GPU, and the
  // specs that lose that competition are the long physics ones timing out on a
  // wait that would have resolved. That is contention this harness invented,
  // not a defect in the software being released. CI runs two workers for the
  // same reason. Retries stay at zero here, where CI allows one: a release
  // candidate should pass first time.
  {
    id: 'e2e-sources',
    label: 'browser suite (sources)',
    command: ['npm', 'run', 'e2e:release'],
    tier: 'slow',
    ci: 'e2e',
    group: 'correctness',
  },
  {
    id: 'e2e-dist',
    label: 'browser suite (production build)',
    command: ['npm', 'run', 'e2e:dist', '--', '--retries=0'],
    tier: 'slow',
    ci: 'e2e-build',
    group: 'correctness',
  },

  // --- Generated artifacts ---------------------------------------------------
  {
    id: 'docs',
    label: 'documentation facts, CITATION.cff, .zenodo.json',
    command: ['npm', 'run', 'docs:check'],
    tier: 'quick',
    ci: 'checks',
    group: 'generated',
  },
  {
    id: 'instructors',
    label: 'instructor bundle is built from these sources',
    command: ['npm', 'run', 'instructors:check'],
    tier: 'quick',
    ci: 'checks',
    why: 'hashes the inputs; needs no passphrase and renders nothing',
    group: 'generated',
  },
  {
    id: 'vendor',
    label: 'vendored libraries and fonts',
    command: ['npm', 'run', 'vendor:check'],
    tier: 'quick',
    ci: 'checks',
    group: 'generated',
  },
  {
    id: 'thumbnails',
    label: 'scenario thumbnails',
    command: ['npm', 'run', 'thumbnails:check'],
    tier: 'quick',
    ci: 'checks',
    group: 'generated',
  },
  {
    id: 'manual',
    label: "the user manual's generated tables",
    command: ['npm', 'run', 'manual:check'],
    tier: 'quick',
    ci: 'checks',
    group: 'generated',
  },
  {
    id: 'teaching',
    label: 'teaching demonstrations',
    command: ['npm', 'run', 'teaching:check'],
    tier: 'quick',
    ci: 'checks',
    group: 'generated',
  },
  {
    id: 'activities',
    label: 'activity formats and their step lists',
    command: ['npm', 'run', 'activities:check'],
    tier: 'quick',
    ci: null,
    why: 'added after the workflow was written; runs in seconds',
    group: 'generated',
  },
  {
    id: 'cards',
    label: 'lesson cards',
    command: ['npm', 'run', 'cards:check'],
    tier: 'quick',
    ci: null,
    why: 'added after the workflow was written; runs in seconds',
    group: 'generated',
  },
  // The scene catalogue and the record beside it are generated from the lesson
  // data, and the hand-written acceptance map is checked against them: a
  // central experiment whose object, control, evidence or test has moved fails
  // here rather than being discovered by a teacher.
  {
    id: 'scene',
    label: 'the lesson scene catalogue and acceptance map',
    command: ['npm', 'run', 'audit:scene:check'],
    tier: 'quick',
    ci: null,
    why: 'added after the workflow was written; runs in seconds',
    group: 'generated',
  },
  // The counts that cost a test run to measure: how many jest tests there are,
  // how many browser tests, what a visitor downloads. The comment in
  // docs-facts.mjs said CI paid for these in the job where the commands had
  // already run. CI never did, and by the time anyone looked README.md was
  // claiming 3608 jest tests against 4844 and 579 browser tests against 1061.
  {
    id: 'docs-full',
    label: 'documentation counts that cost a test run',
    command: ['npm', 'run', 'docs:check:full'],
    tier: 'slow',
    ci: null,
    why: 'needs a jest run and a build; the gate has both already',
    group: 'generated',
  },

  // --- Scientific data -------------------------------------------------------
  // Two questions, and conflating them is how a dataset comes to be trusted
  // without being checked. Structural: is the checked-in module complete,
  // self-consistent, and does it say what it claims about its own processing?
  // Provenance: does it regenerate, byte for byte, from the file the
  // collaboration published? The first runs anywhere. The second needs the
  // sources, and under --provenance it fails when they are missing rather than
  // reporting the structural pass as if it were the whole answer.
  {
    id: 'gw-structure',
    label: 'GW150914 data is complete and self-consistent',
    command: ['npm', 'run', 'gw:check'],
    tier: 'quick',
    ci: null,
    why: 'added after the workflow was written; runs in seconds',
    group: 'science',
  },
  {
    id: 'stellar-structure',
    label: 'MIST tracks are complete and self-consistent',
    command: ['npm', 'run', 'stellar:check'],
    tier: 'quick',
    ci: null,
    why: 'added after the workflow was written; runs in seconds',
    group: 'science',
  },
  {
    id: 'gw-provenance',
    sources: 'gw',
    label: 'GW150914 regenerates from the published traces',
    command: ['npm', 'run', 'gw:provenance'],
    tier: 'provenance',
    ci: null,
    why: 'needs the GWOSC sources cached; see --provenance',
    group: 'science',
  },
  {
    id: 'stellar-provenance',
    sources: 'stellar',
    label: 'MIST tracks regenerate from the published grid',
    command: ['npm', 'run', 'stellar:provenance'],
    tier: 'provenance',
    ci: null,
    why: 'needs the 100 MB MIST grid cached; see --provenance',
    group: 'science',
  },

  // --- Other engines ---------------------------------------------------------
  // CI runs these as its own matrix job. They run here too when the engine is
  // installed, and say so plainly when it is not - a release gate that omits
  // WebKit without mentioning it is a gate that has not tested WebKit.
  {
    id: 'firefox',
    label: 'engine compatibility (firefox)',
    command: ['npm', 'run', 'e2e:cross-browser', '--', '--workers=1'],
    env: { GRAVITAS_E2E_BROWSERS: 'firefox' },
    tier: 'platform',
    engine: 'firefox',
    ci: 'cross-browser',
    group: 'platform',
  },
  {
    id: 'webkit',
    label: 'engine compatibility (webkit)',
    command: ['npm', 'run', 'e2e:cross-browser', '--', '--workers=1'],
    env: { GRAVITAS_E2E_BROWSERS: 'webkit' },
    tier: 'platform',
    engine: 'webkit',
    ci: 'cross-browser',
    group: 'platform',
  },
];

// What CI does that is not a check of the software: installing, caching,
// uploading, and the steps that only print. Matched by step name, because
// several of them are multi-line shell blocks whose individual lines are
// plumbing (`echo`, `find`, a comment) rather than commands anybody could run
// as a check.
export const CI_SETUP_STEPS = [
  'Report what a visitor downloads',
  'Resolve the Playwright version',
  // The aggregation job and the deploy job: platform behaviour, covered by
  // GitHub rather than by anything runnable here.
  'Report',
  'Check out the exact commit that was validated',
  'Refuse to publish a superseded commit',
  'Prepare the publishable tree',
  'Confirm the checkout is unmodified',
  'Package the site',
  'Deploy',
  'Say what went live',
  'Say why nothing went live',
];

/** And the commands that are setup wherever they appear. */
export const CI_SETUP_COMMANDS = [
  'npm ci',
  'npx playwright install',
  'npx playwright install-deps',
  'npx playwright merge-reports',
];

// CI steps whose gate equivalent is a different command, or which are covered
// by a check that runs the same specs. Keyed by the CI command.
export const CI_EQUIVALENTS = {
  // CI builds with --unpublishable because the instructor passphrase is not a
  // repository secret; the gate has the passphrase and builds the real thing.
  'npm run build:ci': 'build',
  'npm run budget': 'budget',
  'node tools/check-links.mjs --root dist': 'links-dist',
  'node tools/validate-citation.mjs': 'citation',
  // One npm script in the gate, two lines of a shell block in CI. Same two
  // commands, same thresholds.
  'npm audit --audit-level=moderate': 'deps',
  'npm audit --omit=dev': 'deps',
  // The accessibility job runs two specs that are already inside the full
  // browser suite the gate runs, so `e2e-sources` covers them. Kept as its own
  // CI job because it uploads its own report and can fail independently;
  // recorded here so the equivalence is a decision rather than a gap.
  'npm run a11y:axe': 'e2e-sources',
  'npm run a11y:manual': 'e2e-sources',
  // Sharded in CI, whole in the gate.
  'npx playwright test --shard=${{ matrix.shard }}/6': 'e2e-sources',
  'npm run e2e:dist': 'e2e-dist',
  // One matrix job per engine in CI; one registry entry per engine here, and
  // the engine comes from GRAVITAS_E2E_BROWSERS in both.
  'npm run e2e:cross-browser -- --workers=1': 'firefox',
};
