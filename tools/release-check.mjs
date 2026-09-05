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

const argv = process.argv.slice(2);
const fast = argv.includes('--fast');

const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const OFF = '\x1b[0m';
const paint = process.stdout.isTTY && !argv.includes('--no-color');
const c = (code, text) => (paint ? `${code}${text}${OFF}` : text);

const failures = [];
const decisions = [];

/**
 * Run a command, reporting pass or fail.
 *
 * @param {string} label - What it checks, in words
 * @param {string[]} command - argv
 * @param {object} [opts]
 * @param {boolean} [opts.slow] - Skipped under --fast
 * @returns {boolean} True when it passed or was skipped
 */
function step(label, command, { slow = false } = {}) {
  if (slow && fast) {
    process.stdout.write(
      `  ${c(DIM, 'skip')}  ${label} ${c(DIM, '(--fast)')}\n`
    );
    return true;
  }
  // The in-progress line is only worth drawing on a terminal that can erase
  // it. Piped into a file or a CI log, \r leaves both halves on one line.
  if (paint) process.stdout.write(`  ....  ${label}`);
  const erase = paint ? '\r' : '';
  try {
    execFileSync(command[0], command.slice(1), {
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024,
    });
    process.stdout.write(`${erase}  ${c(GREEN, ' ok ')}  ${label}\n`);
    return true;
  } catch (err) {
    process.stdout.write(`${erase}  ${c(RED, 'FAIL')}  ${label}\n`);
    const output = `${err.stdout || ''}${err.stderr || ''}`
      .trim()
      .split('\n')
      .slice(-6)
      .map(l => `          ${l}`)
      .join('\n');
    failures.push(`${label}\n${output}`);
    return false;
  }
}

process.stdout.write(`\n${c(BOLD, 'Release check')}\n`);
process.stdout.write(
  c(DIM, 'Nothing here creates a tag, a release or a DOI.\n\n')
);

// --- Is it correct? ----------------------------------------------------------
process.stdout.write(`${c(BOLD, 'Correctness')}\n`);
step('formatting', ['npm', 'run', 'format:check']);
step('lint', ['npm', 'run', 'lint']);
step('module architecture', ['npm', 'run', 'check:architecture']);
step('investigations validate', ['npm', 'run', 'author:check']);
// The build comes first, and the order matters. `npm run build` regenerates
// sw-manifest.js, and tests/buildIntegrity.test.js asserts that the committed
// manifest is what the generator would write today. Running the tests before
// the build meant that any edit since the last build failed that test - a real
// staleness, but reported as a unit-test failure, which sends you looking in
// the wrong place entirely.
step('production build', ['npm', 'run', 'build'], { slow: true });
step('unit tests', ['npm', 'test'], { slow: true });
step('physics validation', ['npm', 'run', 'validate:physics'], { slow: true });
step('scenario stability', ['npm', 'run', 'validate:scenarios'], {
  slow: true,
});
step('bundle budget', ['npm', 'run', 'budget:check'], { slow: true });
step('browser suite (sources)', ['npm', 'run', 'e2e'], { slow: true });
step('browser suite (production build)', ['npm', 'run', 'e2e:dist'], {
  slow: true,
});

// --- Is it current? ----------------------------------------------------------
process.stdout.write(`\n${c(BOLD, 'Generated artifacts are current')}\n`);
step('documentation facts, CITATION.cff, .zenodo.json', [
  'npm',
  'run',
  'docs:check',
]);
step('vendored libraries and fonts', ['npm', 'run', 'vendor:check']);
step('service-worker precache manifest', ['npm', 'run', 'sw:check']);
step('scenario thumbnails', ['npm', 'run', 'thumbnails:check']);
step("the user manual's generated tables", ['npm', 'run', 'manual:check']);

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

if (failures.length) {
  process.stdout.write(
    `${failures.length} check(s) failed. Nothing was tagged, released or minted.\n`
  );
  process.exit(1);
}

process.stdout.write(
  c(GREEN, 'Everything checkable passes.') +
    (decisions.length
      ? ` ${decisions.length} decision(s) above are yours to make.\n`
      : '\n')
);
process.stdout.write(
  c(
    DIM,
    'No tag, release or DOI was created. See RELEASING.md for those steps.\n'
  )
);
