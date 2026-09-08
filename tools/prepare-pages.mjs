// =============================================================================
// Assemble the tree that gets published
// -----------------------------------------------------------------------------
// The deploy job used to stamp the commit into index.html, model/index.html and
// instructors/index.html, regenerate sw-manifest.js over the stamped bytes, and
// then run `git status` and refuse to publish because the checkout had been
// modified. It was refusing its own intended changes: the four edits it had
// just made were exactly the four it then called contamination. The guard was
// not wrong to exist - it is what stops a throwaway instructor bundle or a
// stray regenerated file reaching the site - it was pointed at the wrong tree.
//
// So the publishable tree is built somewhere else. `git archive HEAD` gives the
// committed tree and nothing but the committed tree: no untracked files, no
// build output, no node_modules, and no way for anything the runner did to the
// working copy to be published. The stamping, the re-sealing and the revision
// marker all happen in there, the checkout is never touched, and the guard now
// asks the question that matters - whether the tree about to be published
// differs from the commit in any way that was not asked for.
//
// The whole sequence lives here rather than in YAML so that it can be run,
// end to end, outside Actions. tests/deployRehearsal.test.js does exactly that,
// including the case where something has modified a file it should not have.
// A test of the stamping function alone would have passed throughout the period
// when this job could not deploy at all.
// =============================================================================

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyRelease } from './verify-release.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');

/** The pages a reader can load, and therefore the pages worth stamping. */
export const STAMPED_PAGES = Object.freeze([
  'index.html',
  'model/index.html',
  'instructors/index.html',
]);

/**
 * Everything the deploy is allowed to change, relative to the commit.
 *
 * Anything else differing is the failure this guards against: a regenerated
 * instructor bundle, a stray build artefact, a file some step rewrote by
 * accident. The list is short on purpose and every entry is accounted for
 * below.
 */
export const ALLOWED_CHANGES = Object.freeze([
  ...STAMPED_PAGES,
  'sw-manifest.js',
  'deployed-revision.json',
]);

/** Run a command, returning its stdout, and throw with its output on failure. */
function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...opts,
  });
}

/**
 * Export a commit's tree into a directory.
 *
 * @param {string} commit - What to export
 * @param {string} into - Where to put it, created if absent
 * @param {string} [repo] - Repository to read from
 * @returns {void}
 */
export function exportTree(commit, into, repo = REPO) {
  mkdirSync(into, { recursive: true });
  const tar = path.join(into, '.tree.tar');
  run('git', ['archive', '--format=tar', '-o', tar, commit], { cwd: repo });
  run('tar', ['-xf', tar, '-C', into]);
  rmSync(tar, { force: true });
}

/**
 * Write the revision meta tag into a page.
 *
 * Read from the document rather than fetched: the marker file below does not
 * exist on a development server, and asking the network for it there logged a
 * 404 on every load.
 *
 * @param {string} file - Absolute path to the HTML
 * @param {string} commit - The commit to stamp
 * @returns {boolean} Whether the page was there to stamp
 */
export function stampPage(file, commit) {
  if (!existsSync(file)) return false;
  const tag = `<meta name="gravitas-revision" content="${commit}" />`;
  let html = readFileSync(file, 'utf8');
  html = /name="gravitas-revision"/.test(html)
    ? html.replace(/<meta name="gravitas-revision"[^>]*\/?>/, tag)
    : html.replace('</head>', `    ${tag}\n  </head>`);
  writeFileSync(file, html);
  return true;
}

/** @returns {?string} The commit a stamped page names, or null */
export function stampedCommit(file) {
  if (!existsSync(file)) return null;
  const m = readFileSync(file, 'utf8').match(
    /name="gravitas-revision" content="([^"]*)"/
  );
  return m ? m[1] : null;
}

/** Every file in a directory, as paths relative to it. */
function filesUnder(root, prefix = '') {
  const out = [];
  for (const entry of readdirSync(path.join(root, prefix), {
    withFileTypes: true,
  })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...filesUnder(root, rel));
    else out.push(rel);
  }
  return out;
}

/**
 * How the staged tree differs from the commit it was exported from.
 *
 * @param {string} staged - The tree about to be published
 * @param {string} pristine - A clean export of the same commit
 * @returns {{changed: Array<string>, added: Array<string>, removed: Array<string>}}
 */
export function treeDifference(staged, pristine) {
  const a = new Set(filesUnder(pristine));
  const b = new Set(filesUnder(staged));
  const changed = [];
  const added = [];
  const removed = [];
  for (const rel of b) {
    if (!a.has(rel)) {
      added.push(rel);
      continue;
    }
    const x = readFileSync(path.join(pristine, rel));
    const y = readFileSync(path.join(staged, rel));
    if (!x.equals(y)) changed.push(rel);
  }
  for (const rel of a) if (!b.has(rel)) removed.push(rel);
  return {
    changed: changed.sort(),
    added: added.sort(),
    removed: removed.sort(),
  };
}

/**
 * Build the publishable tree and check it.
 *
 * @param {object} opts - commit, out, ref, runId, runAttempt, workflow, repo
 * @returns {{ok: boolean, problems: Array<string>, out: string, changed: Array<string>}}
 */
export function preparePages(opts = {}) {
  const repo = opts.repo || REPO;
  const commit =
    opts.commit || run('git', ['rev-parse', 'HEAD'], { cwd: repo }).trim();
  const out = path.resolve(opts.out || path.join(repo, '_site'));
  const problems = [];

  rmSync(out, { recursive: true, force: true });
  exportTree(commit, out, repo);

  // A second, untouched copy of the same commit, so the guard at the end is a
  // comparison against what was validated rather than against a description of
  // it.
  const pristine = mkdtempSync(path.join(tmpdir(), 'gravitas-pristine-'));
  exportTree(commit, pristine, repo);

  try {
    for (const page of STAMPED_PAGES) stampPage(path.join(out, page), commit);

    // The manifest's version is a sha256 over the CONTENTS of everything it
    // precaches, index.html included. Stamping changes those bytes, so the
    // committed manifest stops describing what is about to be served and has
    // to be regenerated over the staged tree - which is why this runs with the
    // staging directory as its working directory and the script by absolute
    // path.
    const builder = path.join(HERE, 'build-service-worker.mjs');
    run(process.execPath, [builder], { cwd: out });
    run(process.execPath, [builder, '--check'], { cwd: out });

    writeFileSync(
      path.join(out, 'deployed-revision.json'),
      `${JSON.stringify(
        {
          commit,
          ref: opts.ref ?? null,
          runId: opts.runId ?? null,
          runAttempt: opts.runAttempt ?? null,
          deployedAt: new Date().toISOString(),
          workflow: opts.workflow ?? null,
        },
        null,
        2
      )}\n`
    );

    const release = verifyRelease(out);
    problems.push(...release.problems);

    // Only the changes this job is supposed to make.
    const diff = treeDifference(out, pristine);
    const unexpected = diff.changed.filter(f => !ALLOWED_CHANGES.includes(f));
    const strays = diff.added.filter(f => !ALLOWED_CHANGES.includes(f));
    if (unexpected.length) {
      problems.push(
        `these files differ from the commit and should not: ${unexpected.join(', ')}`
      );
    }
    if (strays.length) {
      problems.push(`these files are not in the commit: ${strays.join(', ')}`);
    }
    if (diff.removed.length) {
      problems.push(`these files went missing: ${diff.removed.join(', ')}`);
    }

    // And the four artefacts have to describe ONE candidate.
    for (const page of STAMPED_PAGES) {
      const file = path.join(out, page);
      if (!existsSync(file)) continue;
      const found = stampedCommit(file);
      if (found !== commit) {
        problems.push(
          `${page} is stamped ${found ?? 'not at all'}, not ${commit}`
        );
      }
    }
    const rev = JSON.parse(
      readFileSync(path.join(out, 'deployed-revision.json'), 'utf8')
    );
    if (rev.commit !== commit) {
      problems.push(
        `deployed-revision.json names ${rev.commit}, not ${commit}`
      );
    }

    return {
      ok: problems.length === 0,
      problems,
      out,
      commit,
      changed: diff.changed,
    };
  } finally {
    rmSync(pristine, { recursive: true, force: true });
  }
}

/** @returns {object} Command-line options */
function parseArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const [key, inline] = argv[i].split('=');
    if (!key.startsWith('--')) continue;
    const name = key.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    opts[name] = inline ?? argv[++i];
  }
  return opts;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const result = preparePages(opts);
  const files = statSync(result.out).isDirectory()
    ? filesUnder(result.out).length
    : 0;
  console.log(`Staged ${files} files in ${result.out} for ${result.commit}.`);
  console.log(
    `Changed by the deploy: ${result.changed.join(', ') || 'nothing'}`
  );
  if (!result.ok) {
    for (const p of result.problems) console.error(`::error::${p}`);
    process.exitCode = 1;
    return;
  }
  console.log('Safe to publish.');
}

if (import.meta.url === `file://${process.argv[1]}`) main();

export { filesUnder };
