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
// so `--check` verifies them on every run and in the fast CI job. Four of them -
// the Jest counts, the browser-suite count, the physics-check count and the
// build sizes - can only be had by running something that takes minutes. Those
// are gathered only under `--full`, which CI runs in the job where those
// commands have already been paid for. A `--check` without `--full` reports the
// ones it skipped rather than passing silently over them.
// =============================================================================

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rel = p => relative(REPO, p) || '.';

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
];

const MARKER = /<!--fact:([a-zA-Z0-9_:.-]+)-->([\s\S]*?)<!--\/fact-->/g;

// --- gathering ---------------------------------------------------------------

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
  const { EN } = await import(new URL('../js/i18n/en.js', import.meta.url));
  const { INVESTIGATIONS } = await import(
    new URL('../js/data/investigations.js', import.meta.url)
  );
  const lessons = Object.values(INVESTIGATIONS);
  const stepsOf = lesson => (lesson.steps ? lesson.steps.length : 0);

  const facts = {
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
    uiStrings: Object.keys(EN).length,
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

/** Facts that cost a full run of something. */
function fullFacts(report) {
  const facts = {};

  // Jest, via its own JSON report rather than by parsing a summary line.
  const out = join(tmpdir(), `gravitas-jest-${process.pid}.json`);
  run('npx', ['jest', '--json', `--outputFile=${out}`, '--silent'], {
    env: { ...process.env, NODE_OPTIONS: '--experimental-vm-modules' },
  });
  if (existsSync(out)) {
    const jest = JSON.parse(readFileSync(out, 'utf8'));
    facts.jestTests = jest.numTotalTests;
    facts.jestSuites = jest.numTotalTestSuites;
    if (jest.numFailedTests) {
      report.push(`jest reported ${jest.numFailedTests} failing test(s)`);
    }
  } else {
    report.push('could not read a Jest report');
  }

  // The browser suite, listed rather than run: the count is what the docs
  // quote, and listing takes a second where running takes minutes.
  const list = run('npx', ['playwright', 'test', '--list', '--reporter=list'], {
    env: { ...process.env, GRAVITAS_E2E_PORT: '4399' },
  });
  const listed =
    list && list.match(/Total:\s+(\d+)\s+tests?\s+in\s+(\d+)\s+file/);
  if (listed) {
    facts.e2eTests = Number(listed[1]);
    facts.e2eFiles = Number(listed[2]);
  } else {
    report.push('could not list the browser suite');
  }

  // The physics validation table prints its own totals.
  const physics = run('node', ['tools/validate-physics.mjs']);
  const checks =
    physics &&
    physics.match(/(\d+)\s+checks:\s+(\d+)\s+passed,\s+(\d+)\s+failed/);
  if (checks) {
    facts.physicsChecks = Number(checks[1]);
    if (Number(checks[3])) {
      report.push(`${checks[3]} physics check(s) failing`);
    }
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
  const summary = join(REPO, 'dist', 'build-summary.json');
  if (!existsSync(summary)) {
    report.push(
      'no dist/build-summary.json - run `npm run build` for build sizes'
    );
    return {};
  }
  const built = JSON.parse(readFileSync(summary, 'utf8'));
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
const DEFERRED_KEYS = [
  'jestTests',
  'jestSuites',
  'e2eTests',
  'e2eFiles',
  'physicsChecks',
  'buildCss',
  'buildStartupJs',
  'buildStartupFiles',
  'buildDeferredJs',
  'buildDeferredChunks',
  'buildInitialDownload',
];

/** Everything, according to the flags. */
export async function gatherFacts({ full = false } = {}) {
  const notes = [];
  const facts = {
    ...(await cheapFacts()),
    ...(full ? { ...buildFacts(notes), ...fullFacts(notes) } : {}),
  };
  return { facts, notes };
}

// --- documents ---------------------------------------------------------------

/**
 * Rewrite or verify the marked spans in one file.
 * @returns {{path: string, stale: Array, unknown: Array, skipped: Array,
 *   text: string}} Outcome
 */
function applyToText(path, text, facts) {
  const stale = [];
  const unknown = [];
  const skipped = [];
  const next = text.replace(MARKER, (whole, key, current) => {
    if (!(key in facts)) {
      if (DEFERRED_KEYS.includes(key)) skipped.push(key);
      else unknown.push(key);
      return whole;
    }
    const wanted = String(facts[key]);
    if (current !== wanted) stale.push({ key, current, wanted });
    return `<!--fact:${key}-->${wanted}<!--/fact-->`;
  });
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
  const { facts, notes } = await gatherFacts({ full: has('--full') });

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

  const present = DOCS.filter(d => existsSync(join(REPO, d)));
  const results = [];
  for (const doc of present) {
    const text = await readFile(join(REPO, doc), 'utf8');
    const outcome = applyToText(doc, text, facts);
    results.push(outcome);
    if (mode === 'sync' && outcome.text !== text) {
      await writeFile(join(REPO, doc), outcome.text);
    }
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
    if (!changed.length && !texStale) {
      process.stdout.write(
        'Every documented count already matches the source.\n'
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
  for (const b of broken) process.stderr.write(`${b}\n`);
  for (const note of notes) process.stdout.write(`note: ${note}\n`);
  const skipped = [...new Set(results.flatMap(r => r.skipped))];
  if (skipped.length) {
    process.stdout.write(
      `note: not checked without --full: ${skipped.join(', ')}\n`
    );
  }

  const bad =
    stale.length + unknown.length + broken.length + (texStale ? 1 : 0);
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
