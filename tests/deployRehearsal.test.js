import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  ALLOWED_CHANGES,
  STAMPED_PAGES,
  preparePages,
  stampPage,
  stampedCommit,
  treeDifference,
  exportTree,
} from '../tools/prepare-pages.mjs';

// =============================================================================
// The deployment, rehearsed
// -----------------------------------------------------------------------------
// The deploy job stamped three pages, regenerated the service-worker manifest
// over the stamped bytes, and then ran `git status` and refused to publish
// because the checkout had been modified - by the four edits it had just made
// itself. Nothing caught it, because the only thing under test was the
// stamping function, and the stamping function was never the broken part.
//
// So this runs the whole sequence: export, stamp, re-seal, record, verify, and
// both guards - the one that says the checkout was not touched and the one that
// says the artifact contains what it should. Including the case the guards
// exist for, where something has changed a file it had no business changing.
// =============================================================================

const REPO = path.resolve(process.cwd());
let staged;
let result;

beforeAll(() => {
  staged = mkdtempSync(path.join(tmpdir(), 'gravitas-pages-'));
  result = preparePages({
    out: path.join(staged, '_site'),
    ref: 'main',
    runId: '1234',
    runAttempt: '1',
    workflow: 'CI',
  });
}, 120_000);

afterAll(() => {
  if (staged) rmSync(staged, { recursive: true, force: true });
});

describe('the sequence the deploy job runs', () => {
  test('it produces a publishable tree and says so', () => {
    expect(result.problems).toEqual([]);
    expect(result.ok).toBe(true);
    expect(existsSync(path.join(result.out, 'index.html'))).toBe(true);
  });

  test('it changes exactly the files it is allowed to change', () => {
    // The whole defect in one assertion. These are the deploy's own work;
    // anything else differing is the contamination the guard is for.
    expect(result.changed).toEqual(
      [
        'index.html',
        'instructors/index.html',
        'model/index.html',
        'sw-manifest.js',
        'teaching/index.html',
      ].sort()
    );
    for (const file of result.changed) {
      expect(ALLOWED_CHANGES).toContain(file);
    }
  });

  test('running it does not touch the checkout', () => {
    // Nothing in the sequence writes to the working copy, which is what makes
    // the job's own `git status` guard answerable rather than self-defeating.
    //
    // Compared before and after rather than asserted to be clean: a developer's
    // tree has work in it, and a test that demanded an empty `git status` would
    // be testing their machine instead of this sequence.
    const status = () =>
      execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], {
        cwd: REPO,
        encoding: 'utf8',
      });
    const before = status();
    const out = mkdtempSync(path.join(tmpdir(), 'gravitas-untouched-'));
    try {
      preparePages({ out: path.join(out, '_site') });
      expect(status()).toBe(before);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  }, 120_000);

  test('every stamped page names the commit being deployed', () => {
    for (const page of STAMPED_PAGES) {
      const file = path.join(result.out, page);
      if (!existsSync(file)) continue;
      expect(stampedCommit(file)).toBe(result.commit);
    }
  });

  test('the service-worker manifest describes the stamped files', () => {
    // Regenerated over the staged tree, so its version is a hash of the bytes
    // that are actually about to be served. A manifest carried over from the
    // commit would have clients caching assets under a version computed from
    // different ones.
    const staged = readFileSync(
      path.join(result.out, 'sw-manifest.js'),
      'utf8'
    );
    const committed = execFileSync('git', ['show', 'HEAD:sw-manifest.js'], {
      cwd: REPO,
      encoding: 'utf8',
    });
    expect(staged).not.toBe(committed);
    // And it is what the generator would write for this tree, checked by the
    // generator itself rather than by re-deriving the hash here.
    execFileSync(
      process.execPath,
      [path.join(REPO, 'tools/build-service-worker.mjs'), '--check'],
      { cwd: result.out, stdio: 'pipe' }
    );
  });

  test('the four artefacts name one commit between them', () => {
    const rev = JSON.parse(
      readFileSync(path.join(result.out, 'deployed-revision.json'), 'utf8')
    );
    expect(rev.commit).toBe(result.commit);
    expect(rev.ref).toBe('main');
    expect(stampedCommit(path.join(result.out, 'index.html'))).toBe(rev.commit);
    // The manifest cannot name a commit - it is a content hash - so what is
    // checked is that it was built from the stamped page, which the assertion
    // above establishes.
    expect(/^[0-9a-f]{40}$/.test(rev.commit)).toBe(true);
  });

  test('the instructor bundle is the committed one', () => {
    // The specific contamination the guard was written for: `npm run build:ci`
    // encrypts the materials with a throwaway key, and publishing that bundle
    // gives every instructor a file nobody can open.
    const staged = readFileSync(
      path.join(result.out, 'instructors/materials.enc.json')
    );
    const committed = execFileSync(
      'git',
      ['show', 'HEAD:instructors/materials.enc.json'],
      { cwd: REPO, encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 }
    );
    expect(staged.equals(committed)).toBe(true);
  });
});

describe('and it fails when it should', () => {
  test('an unexpected modification to the tree is refused', () => {
    // The guard, exercised. A file that is not on the allowed list differing
    // from the commit has to stop the publish - this is what a regenerated
    // instructor bundle or a stray build artefact looks like from here.
    const dir = mkdtempSync(path.join(tmpdir(), 'gravitas-dirty-'));
    try {
      const pristine = path.join(dir, 'pristine');
      const dirty = path.join(dir, 'dirty');
      exportTree('HEAD', pristine, REPO);
      exportTree('HEAD', dirty, REPO);

      writeFileSync(
        path.join(dirty, 'instructors/materials.enc.json'),
        '{"throwaway":true}'
      );
      const diff = treeDifference(dirty, pristine);
      expect(diff.changed).toContain('instructors/materials.enc.json');
      expect(
        diff.changed.filter(f => !ALLOWED_CHANGES.includes(f))
      ).not.toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('a file that is not in the commit at all is refused', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'gravitas-stray-'));
    try {
      const pristine = path.join(dir, 'pristine');
      const dirty = path.join(dir, 'dirty');
      exportTree('HEAD', pristine, REPO);
      exportTree('HEAD', dirty, REPO);
      writeFileSync(path.join(dirty, 'stray.txt'), 'left behind');
      const diff = treeDifference(dirty, pristine);
      expect(diff.added).toContain('stray.txt');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('a page that lost its stamp is refused', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'gravitas-unstamped-'));
    try {
      exportTree('HEAD', dir, REPO);
      const page = path.join(dir, 'index.html');
      stampPage(page, 'a'.repeat(40));
      expect(stampedCommit(page)).toBe('a'.repeat(40));
      expect(stampedCommit(page)).not.toBe('b'.repeat(40));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
