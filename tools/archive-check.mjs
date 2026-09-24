#!/usr/bin/env node
// =============================================================================
// Can somebody who only has the archive rebuild this?
// -----------------------------------------------------------------------------
// A release archive is what a reviewer, a journal, or Zenodo actually receives:
// `git archive` of one commit, with no .git, no node_modules, and none of the
// gitignored files a working copy accumulates. Everything that matters about
// reproducibility is a property of that tarball, and nothing in the repository
// tests it - the gate runs in a working copy where the missing pieces are all
// still lying around.
//
// So this restores the archive into an empty directory and does what its own
// README tells a reader to do: install, build, and check the generated
// artifacts. It is slow, because it is the real thing rather than a model of
// it, and it is the only check here that would notice a file the build needs
// and the archive does not carry.
//
// What it is not: this does not create a release, a tag, or an archive to
// publish. It makes a throwaway copy in a temporary directory and deletes it.
//
//   node tools/archive-check.mjs               HEAD, cleaned up afterwards
//   node tools/archive-check.mjs --keep        leave the directory for a look
//   node tools/archive-check.mjs --commit <r>  some other commit
// =============================================================================

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { excerpt } from './output-excerpt.mjs';

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const has = flag => argv.includes(flag);
const valueOf = flag => {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : null;
};

const COMMIT = valueOf('--commit') || 'HEAD';
const KEEP = has('--keep');

/**
 * Files the archive has to carry for any of this to work.
 *
 * Named rather than inferred, because the failure this catches is a file that
 * stopped being tracked - and an inferred list would stop expecting it at the
 * same moment.
 */
const REQUIRED = [
  // Install and build
  'package.json',
  'package-lock.json',
  'build.js',
  'tools/build-service-worker.mjs',
  'tools/verify-release.mjs',
  // The application itself
  'index.html',
  'js/main.js',
  'css/styles.css',
  'sw.js',
  'sw-manifest.js',
  // The document pages the live site links, and the stylesheet they need.
  // page.css is built on its own rather than folded into app.css, so an
  // archive that dropped it would serve four unstyled pages.
  'css/page.css',
  'model/index.html',
  'instructors/index.html',
  'validation/index.html',
  'teaching/index.html',
  // Instructor materials: the ciphertext and the record of what built it.
  'instructors/materials.enc.json',
  'instructors/materials.manifest.json',
  // What a reader, a reviewer and a journal open first
  'README.md',
  'CHANGELOG.md',
  'RELEASE.md',
  'RELEASING.md',
  'ACCESSIBILITY.md',
  'Gravitas_User_Manual.pdf',
  // Citation and deposit metadata
  'CITATION.cff',
  '.zenodo.json',
  // Licensing, in full: the code license, the content license, the map of
  // which covers what, and the third-party attributions.
  'LICENSE',
  'LICENSE-CC-BY-4.0.md',
  'LICENSES.md',
  'NOTICE',
];

/**
 * Paths that must NOT be in the archive.
 *
 * The passphrase and the plaintext documents are the obvious ones. The test
 * fixture is the less obvious one: it is a bundle of placeholder documents
 * encrypted with a passphrase printed in the source, and the only thing
 * keeping it out of a release is that it is gitignored. That is worth
 * asserting rather than assuming.
 */
const FORBIDDEN = [
  '.git',
  'node_modules',
  'dist',
  '.instructor-password',
  '.instructor-build',
  '.instructor-fixture',
  '.env',
  'test-results',
  'playwright-report',
  'blob-report',
  'coverage',
  '.claude',
];

const problems = [];
const note = line => console.log(line);

function run(cmd, args, cwd, { allowFailure = false } = {}) {
  try {
    return {
      ok: true,
      out: execFileSync(cmd, args, {
        cwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        maxBuffer: 64 * 1024 * 1024,
      }),
    };
  } catch (err) {
    if (!allowFailure) {
      problems.push(
        `\`${cmd} ${args.join(' ')}\` failed in the restored archive:\n` +
          excerpt(err.stderr || err.stdout || err.message, 8)
      );
    }
    return {
      ok: false,
      out: String(err.stdout || '') + String(err.stderr || ''),
    };
  }
}

const started = Date.now();
const dir = mkdtempSync(path.join(tmpdir(), 'gravitas-archive-'));
note(`Restoring ${COMMIT} into ${dir}`);

try {
  // --- restore --------------------------------------------------------------
  const tar = path.join(dir, 'archive.tar');
  run('git', ['archive', '--format=tar', '-o', tar, COMMIT], REPO);
  run('tar', ['-xf', tar, '-C', dir], REPO);
  rmSync(tar, { force: true });

  const missing = REQUIRED.filter(f => !existsSync(path.join(dir, f)));
  if (missing.length) {
    problems.push(`the archive is missing: ${missing.join(', ')}`);
  } else {
    note(`  every one of the ${REQUIRED.length} required files is present`);
  }
  for (const stray of FORBIDDEN) {
    if (existsSync(path.join(dir, stray))) {
      problems.push(`the archive carries ${stray}, which it must not`);
    }
  }

  // And nothing anywhere in it may be a plaintext instructor document or a
  // stray credential file, whatever it is called.
  const strayPdf = execFileSync(
    'find',
    [dir, '-name', '*.pdf', '-not', '-path', '*/node_modules/*'],
    { encoding: 'utf8' }
  )
    .split('\n')
    .filter(Boolean)
    .map(f => path.relative(dir, f))
    .filter(f => f !== 'Gravitas_User_Manual.pdf');
  if (strayPdf.length) {
    problems.push(
      `the archive carries PDFs other than the user manual: ${strayPdf.slice(0, 5).join(', ')}`
    );
  }

  // --- install --------------------------------------------------------------
  note('  npm ci ...');
  const install = run('npm', ['ci', '--no-audit', '--no-fund'], dir);
  if (install.ok) note('    installed from the lockfile');

  // --- the generated artifacts, in the archive ------------------------------
  //
  // A stale generated file is invisible in a working copy, where whatever
  // regenerated it last is still sitting there. In the archive there is only
  // what was committed, so this is where "somebody forgot to commit the
  // regenerated manifest" actually shows up.
  //
  // Before the build, and that ordering is the whole point. `npm run build:ci`
  // regenerates sw-manifest.js, so a check that runs after it compares the
  // rebuilt manifest with itself and passes on any tree at all. This project
  // has already shipped that bug once, in its own gate, and the first draft of
  // this file reproduced it: a commit with a precached file edited and the
  // manifest left alone restored "cleanly".
  if (install.ok) {
    for (const script of [
      'docs:check',
      'sw:check',
      'audit:scene:check',
      'audit:irreversible:check',
      'instructors:check',
      'vendor:check',
      'author:check',
    ]) {
      const res = run('npm', ['run', script], dir, { allowFailure: true });
      note(`  ${script}: ${res.ok ? 'ok' : 'FAILED'}`);
      if (!res.ok) {
        problems.push(
          `${script} fails in the restored archive:\n` + excerpt(res.out, 6)
        );
      }
    }

    // And the archive as it stands must be publishable. The bundle it carries
    // is the real one, encrypted with the real passphrase, so verify-release
    // has to accept it here - if it refuses, the tarball a reviewer receives
    // is one that could not be deployed.
    const shipped = run(
      'node',
      ['tools/verify-release.mjs', '.', '--no-revision'],
      dir,
      { allowFailure: true }
    );
    if (!shipped.ok) {
      problems.push(
        'verify-release refuses the archive as committed:\n' +
          excerpt(shipped.out, 6)
      );
    } else {
      note('  verify-release accepts the archive as committed');
    }

    // --- build ----------------------------------------------------------------
    //
    // `npm run build` is what the README tells a reader to run, and it cannot
    // work here: it regenerates the instructor materials, which needs the
    // passphrase, and the passphrase is deliberately not in the archive. That is
    // correct behavior and a documentation problem, so it is checked both ways -
    // the documented command must fail for the stated reason, and the command a
    // restorer can actually run must succeed.
    if (install.ok) {
      note('  npm run build (expected to refuse: no passphrase) ...');
      const documented = run('npm', ['run', 'build'], dir, {
        allowFailure: true,
      });
      if (documented.ok) {
        problems.push(
          '`npm run build` succeeded in the archive without a passphrase. The ' +
            'instructor materials should have refused to build; check whether ' +
            'this archive would publish an unencrypted or throwaway bundle.'
        );
      } else if (
        !/passphrase|GRAVITAS_INSTRUCTOR_PASSWORD/i.test(documented.out)
      ) {
        problems.push(
          '`npm run build` failed in the archive for a reason other than the ' +
            'missing passphrase:\n' +
            excerpt(documented.out, 8)
        );
      } else {
        note('    refused for the stated reason, as it should');
      }

      note('  npm run build:ci ...');
      const built = run('npm', ['run', 'build:ci'], dir);
      if (built.ok) {
        const index = path.join(dir, 'dist', 'index.html');
        if (!existsSync(index))
          problems.push('the build produced no dist/index.html');
        else note(`    dist/index.html, ${statSync(index).size} bytes`);
      }

      // The throwaway bundle build:ci just wrote must be refused for publication.
      // If this passes, the guard that keeps an undecryptable bundle off the
      // site is not working in the archive.
      const refused = run(
        'node',
        ['tools/verify-release.mjs', '.', '--no-revision'],
        dir,
        { allowFailure: true }
      );
      if (refused.ok) {
        problems.push(
          'verify-release accepted a tree whose instructor bundle was built by ' +
            'build:ci with a throwaway secret. That bundle cannot be opened by ' +
            'anyone and must never be publishable.'
        );
      } else {
        note('  verify-release refuses the throwaway bundle, as it should');
      }
    }
  }
} finally {
  if (KEEP) note(`\nLeft in place: ${dir}`);
  else rmSync(dir, { recursive: true, force: true });
}

const seconds = Math.round((Date.now() - started) / 1000);
console.log('');
if (problems.length) {
  console.error(`The archive does not restore cleanly (${seconds}s):\n`);
  for (const p of problems) console.error(`  - ${p}\n`);
  process.exitCode = 1;
} else {
  console.log(
    `The archive restores, installs, builds and checks out (${seconds}s).`
  );
  console.log('Nothing was tagged, released or published.');
}
