#!/usr/bin/env node
// =============================================================================
// npm run release:check
// -----------------------------------------------------------------------------
// Everything that has to be true before Gravitas is tagged, in one command.
//
// It does not create a release. It does not tag, deploy, reserve or mint a DOI.
// Those are decisions, and the point of this file is to make sure that when
// somebody makes them, they are making them about a repository whose own
// account of itself is accurate.
//
// Three kinds of question:
//
//   Is it correct?     the full validation battery - tests, physics, lint,
//                      architecture, accessibility, the browser suites
//   Is it consistent?  CITATION.cff and .zenodo.json valid, agreeing with each
//                      other and with package.json
//   Is it current?     every generated artifact regenerated from today's
//                      source: the fact markers, facts.tex, the manifests, the
//                      vendored libraries, the service-worker precache
//
// and then a fourth thing it cannot answer, which it prints instead: the
// decisions that need a human. A version number is a claim about
// compatibility; a release date is a fact about the world; an ORCID and a DOI
// are identifiers somebody else issues. This tool will never guess at any of
// them, and RELEASING.md says where each one goes.
//
//   npm run release:check              everything
//   npm run release:check -- --fast    skip the suites that take minutes
// =============================================================================

import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

import { validateCitationFiles } from './validate-citation.mjs';
import { RELEASE, AUTHORS } from './project-metadata.mjs';
import {
  CHECKS,
  GROUPS,
  OUTCOMES,
  summarise,
  engineInstalled,
  sourcesCached,
} from './checks.mjs';

const argv = process.argv.slice(2);
const fast = argv.includes('--fast');
// Provenance is in the full run when the sources are here, and reported
// unavailable when they are not. --no-provenance is for a machine where the
// 100 MB MIST grid is not worth fetching and the caveat is understood.
const wantProvenance = !fast && !argv.includes('--no-provenance');
const wantPlatform = !fast && !argv.includes('--no-platform');

const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const OFF = '\x1b[0m';
const paint = process.stdout.isTTY && !argv.includes('--no-color');
const c = (code, text) => (paint ? `${code}${text}${OFF}` : text);

// The vocabulary and the summary sentence live in tools/checks.mjs, where
// tests/releaseGate.test.js can reach them without running the gate.
const { PASS, FAIL, SKIP, UNAVAILABLE, RETRIED, LAUNCH_FAILED } = OUTCOMES;

/** How each outcome prints, and whether it counts as the software being sound. */
const OUTCOME = {
  [PASS]: { badge: () => c(GREEN, ' ok '), green: true },
  [FAIL]: { badge: () => c(RED, 'FAIL'), green: false },
  [SKIP]: { badge: () => c(DIM, 'skip'), green: false },
  [UNAVAILABLE]: { badge: () => c(YELLOW, 'n/a '), green: false },
  // Passed, but only after a retry. Not a failure and not a pass: something
  // here is not deterministic, and a release candidate should say so.
  [RETRIED]: { badge: () => c(CYAN, 'FLKY'), green: false },
  // Not FAIL: the software said nothing. Reporting a browser that would not
  // start as a product failure sends somebody looking for a bug that is not
  // there, and reporting it as a pass is worse.
  [LAUNCH_FAILED]: { badge: () => c(YELLOW, 'BOOT'), green: false },
};

/** @type {Array<{id: string, label: string, status: string, note: string}>} */
const results = [];
const failures = [];
const decisions = [];

/**
 * Did a run pass only because something was attempted twice?
 *
 * Playwright prints "N flaky" when a test failed and then passed on a retry.
 * The gate asks for zero retries everywhere, so this should never fire - and
 * if the config or a script ever quietly allows one, the summary says FLKY
 * instead of ok rather than the difference going unnoticed.
 *
 * @param {string} output - Combined stdout and stderr
 * @returns {?string} A description of the retries, or null
 */
function retriedIn(output) {
  const flaky = /^\s*(\d+)\s+flaky\b/m.exec(output);
  if (flaky && Number(flaky[1]) > 0) return `${flaky[1]} flaky test(s)`;
  const retry = /retry\s*#\s*(\d+)/i.exec(output);
  if (retry) return 'at least one test was retried';
  return null;
}

/**
 * Record an outcome and print its line.
 *
 * @param {object} check - An entry from tools/checks.mjs
 * @param {string} status - One of the five outcomes
 * @param {string} [note] - Why, for anything that is not a plain pass
 */
function record(check, status, note = '', skippedTests = 0) {
  results.push({
    id: check.id,
    label: check.label,
    status,
    note,
    skippedTests,
  });
  const suffix = note ? ` ${c(DIM, `(${note})`)}` : '';
  process.stdout.write(
    `  ${OUTCOME[status].badge()}  ${check.label}${suffix}\n`
  );
}

/**
 * Run one check.
 *
 * @param {object} check - An entry from tools/checks.mjs
 * @returns {Promise<void>} When it has been recorded
 */
async function run(check) {
  if (check.tier === 'slow' && fast) {
    record(check, SKIP, 'minutes; --fast');
    return;
  }
  if (check.tier === 'provenance') {
    if (!wantProvenance) {
      record(check, SKIP, fast ? '--fast' : '--no-provenance');
      return;
    }
    if (check.sources && !sourcesCached(check.sources)) {
      record(
        check,
        UNAVAILABLE,
        `the pinned source is not cached; run the data builder once`
      );
      return;
    }
  }
  if (check.tier === 'platform') {
    if (!wantPlatform) {
      record(check, SKIP, fast ? '--fast' : '--no-platform');
      return;
    }
    if (check.engine && !(await engineInstalled(check.engine))) {
      record(
        check,
        UNAVAILABLE,
        `${check.engine} is not installed; npx playwright install ${check.engine}`
      );
      return;
    }
  }

  if (paint) process.stdout.write(`  ....  ${check.label}`);
  const erase = paint ? '\r' : '';
  try {
    const out = execFileSync(check.command[0], check.command.slice(1), {
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env, ...(check.env || {}) },
    }).toString();
    if (erase) process.stdout.write(erase);
    const retried = retriedIn(out);
    if (retried) {
      record(check, RETRIED, retried);
      failures.push(
        `${check.label}\n          passed only on a retry: ${retried}`
      );
      return;
    }
    record(check, PASS);
  } catch (err) {
    if (erase) process.stdout.write(erase);
    const output = `${err.stdout || ''}${err.stderr || ''}`;
    // A browser that would not start is not a failing product.
    if (
      /browserType\.launch|Executable doesn't exist|Failed to launch|browser has been closed/i.test(
        output
      )
    ) {
      record(
        check,
        LAUNCH_FAILED,
        'a browser would not start; nothing was tested either way'
      );
      failures.push(
        `${check.label}\n          could not launch a browser. Run ` +
          '`npx playwright install` and try again.'
      );
      return;
    }
    record(check, FAIL);
    const tail = output
      .trim()
      .split('\n')
      .slice(-8)
      .map(l => `          ${l}`)
      .join('\n');
    failures.push(`${check.label}\n${tail}`);
  }
}

process.stdout.write(`\n${c(BOLD, 'Release check')}\n`);
process.stdout.write(
  c(DIM, 'Nothing here creates a tag, a release or a DOI.\n\n')
);

for (const group of Object.keys(GROUPS)) {
  const members = CHECKS.filter(
    check => (check.group || 'correctness') === group
  );
  if (!members.length) continue;
  process.stdout.write(`${c(BOLD, GROUPS[group])}\n`);
  for (const check of members) await run(check);
  process.stdout.write('\n');
}

// --- Is it consistent? -------------------------------------------------------
process.stdout.write(`\n${c(BOLD, 'Release metadata')}\n`);

const { problems, cff, zenodo } = await validateCitationFiles();
if (problems.length) {
  process.stdout.write(`  ${c(RED, 'FAIL')}  CITATION.cff and .zenodo.json\n`);
  failures.push(
    'CITATION.cff / .zenodo.json\n' +
      problems.map(p => `          ${p}`).join('\n')
  );
} else {
  process.stdout.write(
    `  ${c(GREEN, ' ok ')}  CITATION.cff and .zenodo.json are valid and agree\n`
  );
}

/** package.json's version, which npm requires even when nothing is released. */
const pkg = JSON.parse(await readFile('package.json', 'utf8'));

if (RELEASE.version) {
  if (pkg.version !== RELEASE.version) {
    failures.push(
      `version disagreement\n          package.json says ${pkg.version}, ` +
        `tools/project-metadata.mjs says ${RELEASE.version}`
    );
    process.stdout.write(`  ${c(RED, 'FAIL')}  package.json version agrees\n`);
  } else {
    process.stdout.write(
      `  ${c(GREEN, ' ok ')}  package.json version agrees (${pkg.version})\n`
    );
  }
} else {
  process.stdout.write(
    `  ${c(DIM, 'n/a ')}  no version declared yet ` +
      c(DIM, `(package.json carries npm's default ${pkg.version})`) +
      '\n'
  );
}

// --- Does the claimed release actually exist? --------------------------------
/** Tags in this repository, or null when git is unavailable. */
function tags() {
  try {
    return execFileSync('git', ['tag', '--list'], { encoding: 'utf8' })
      .split('\n')
      .map(t => t.trim())
      .filter(Boolean);
  } catch {
    return null;
  }
}

const allTags = tags();
if (RELEASE.version) {
  const wanted = [`v${RELEASE.version}`, RELEASE.version];
  const found = allTags && wanted.some(t => allTags.includes(t));
  if (!found) {
    // Not a failure: RELEASING.md sets the version *before* tagging, and this
    // command runs between those two steps. It is a reminder of what is left.
    decisions.push(
      `A version (${RELEASE.version}) is declared but no matching tag exists yet.\n` +
        `    Create it after this check passes:  git tag -a v${RELEASE.version} -m "Gravitas ${RELEASE.version}"`
    );
  } else {
    process.stdout.write(
      `  ${c(GREEN, ' ok ')}  tag v${RELEASE.version} exists\n`
    );
  }
} else if (allTags && allTags.length) {
  decisions.push(
    `Tags exist (${allTags.join(', ')}) but tools/project-metadata.mjs declares no version.`
  );
}

// --- What still needs a person -----------------------------------------------
if (!RELEASE.version) {
  decisions.push(
    'No version number. Semantic versioning is a claim about compatibility,\n' +
      '    so it is yours to make. Set RELEASE.version in tools/project-metadata.mjs.\n' +
      `    package.json currently carries npm's default of ${pkg.version}, which is\n` +
      '    not a release claim and is not cited anywhere.'
  );
}
if (!RELEASE.dateReleased) {
  decisions.push(
    'No release date. Set RELEASE.dateReleased to the date of the GitHub\n' +
      '    release, in YYYY-MM-DD - not the day the file was edited.'
  );
}
for (const author of AUTHORS) {
  if (!author.orcid) {
    decisions.push(
      `No ORCID for ${author.givenNames} ${author.familyNames}. Optional, but it is what\n` +
        '    disambiguates an author across institutions. A real URL or nothing.'
    );
  }
}
if (!RELEASE.doi) {
  decisions.push(
    'No DOI. Zenodo mints it when the GitHub release is created, so it is\n' +
      '    recorded afterwards - see step 6 of RELEASING.md. Nothing here reserves one.'
  );
}
if (cff && 'version' in cff !== 'version' in (zenodo || {})) {
  decisions.push(
    'CITATION.cff and .zenodo.json disagree about whether a version exists.'
  );
}
if (!existsSync('CHANGELOG.md')) {
  failures.push('CHANGELOG.md\n          missing');
} else {
  const changelog = await readFile('CHANGELOG.md', 'utf8');
  if (!/##\s*\[Unreleased\]/i.test(changelog)) {
    failures.push(
      'CHANGELOG.md\n          has no [Unreleased] section to collect changes in'
    );
  }
  if (RELEASE.version && !changelog.includes(`[${RELEASE.version}]`)) {
    decisions.push(
      `CHANGELOG.md has no section for ${RELEASE.version}. Move the Unreleased\n` +
        '    entries into a dated section before tagging.'
    );
  }
}

// --- Report ------------------------------------------------------------------
process.stdout.write('\n');
if (failures.length) {
  process.stdout.write(`${c(BOLD, c(RED, 'Failed'))}\n\n`);
  for (const f of failures) process.stdout.write(`  ${f}\n\n`);
}

if (decisions.length) {
  process.stdout.write(`${c(BOLD, 'Needs a human decision')}\n\n`);
  for (const d of decisions) {
    process.stdout.write(`  ${c(YELLOW, '•')} ${d}\n\n`);
  }
}

// --- What this run actually established --------------------------------------
// The tally first, then a sentence that can only say "everything" when the
// tally has nothing in the other four columns. Both come from summarise() in
// tools/checks.mjs, which is where the wording is tested.
const summary = summarise(results);
const byStatus = status => results.filter(r => r.status === status);

process.stdout.write(`${c(BOLD, 'What ran')}\n`);
process.stdout.write(
  `  ${summary.counts[PASS]} passed` +
    `   ${summary.counts[FAIL]} failed` +
    `   ${summary.counts[SKIP]} skipped\n` +
    `  ${summary.counts[UNAVAILABLE]} capability unavailable` +
    `   ${summary.counts[RETRIED]} passed only after retry` +
    `   ${summary.counts[LAUNCH_FAILED]} unable to launch\n` +
    (summary.innerSkipped
      ? c(
          YELLOW,
          `  ${summary.innerSkipped} individual test(s) were skipped inside ` +
            'checks that passed.\n  tools/check-test-policy.mjs lists which ' +
            'skips are allowed, and why.\n'
        )
      : '')
);
for (const [name, status] of [
  ['skipped', SKIP],
  ['unavailable', UNAVAILABLE],
  ['passed only after retry', RETRIED],
  ['unable to launch', LAUNCH_FAILED],
]) {
  for (const r of byStatus(status)) {
    process.stdout.write(
      `  ${c(DIM, name.padEnd(22))} ${r.label}` +
        `${r.note ? c(DIM, ` - ${r.note}`) : ''}\n`
    );
  }
}
process.stdout.write('\n');

if (failures.length) {
  process.stdout.write(
    `${failures.length} check(s) failed. Nothing was tagged, released or minted.\n`
  );
  process.exit(1);
}

process.stdout.write(
  summary.green
    ? c(GREEN, summary.headline) +
        (decisions.length
          ? ` ${decisions.length} decision(s) above are yours to make.\n`
          : '\n')
    : `${c(YELLOW, summary.headline)}\n`
);
if (!summary.complete) {
  process.stdout.write(
    c(DIM, 'Run `npm run release:check` with no flags for the whole gate.\n')
  );
}
process.stdout.write(
  c(
    DIM,
    'No tag, release or DOI was created. See RELEASING.md for those steps.\n'
  )
);
