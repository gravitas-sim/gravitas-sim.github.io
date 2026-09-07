import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  MATERIALS,
  MANIFEST,
  REVISION,
  checkMaterials,
  precachedPaths,
  verifyRelease,
} from '../tools/verify-release.mjs';

// =============================================================================
// The gate between a validated commit and the live site
// -----------------------------------------------------------------------------
// At 521e64f the site deployed while CI was failing, because Pages was serving
// the branch and nothing consulted CI at all. The workflow now gates on it, and
// these cover the checks that run inside that gate - including the one the
// incident is really about: an instructor bundle encrypted with a throwaway key
// must never reach the site, and until now nothing could tell one from a real
// bundle by looking.
// =============================================================================

let root;

/** A minimal tree that passes, which each test then breaks in one way. */
function goodTree() {
  const dir = mkdtempSync(path.join(tmpdir(), 'gravitas-release-'));
  mkdirSync(path.join(dir, 'instructors'), { recursive: true });
  mkdirSync(path.join(dir, 'css'), { recursive: true });
  writeFileSync(path.join(dir, 'index.html'), '<!doctype html>');
  writeFileSync(path.join(dir, 'css', 'page.css'), 'body{}');
  writeFileSync(
    path.join(dir, MATERIALS),
    JSON.stringify({
      v: 1,
      cipher: 'AES-GCM',
      kdf: { name: 'PBKDF2' },
      salt: 'x',
      iv: 'y',
      data: 'z',
    })
  );
  writeFileSync(
    path.join(dir, MANIFEST),
    "self.__GRAVITAS_PRECACHE = [\n  './index.html',\n  './css/page.css',\n];\n"
  );
  writeFileSync(
    path.join(dir, REVISION),
    JSON.stringify({ commit: 'a'.repeat(40), runId: '1', deployedAt: 'now' })
  );
  return dir;
}

beforeEach(() => {
  root = goodTree();
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('a tree that is safe to publish', () => {
  test('passes, and says what it checked', () => {
    const out = verifyRelease(root);
    expect(out.ok).toBe(true);
    expect(out.problems).toEqual([]);
    expect(out.checked.precached).toBe(2);
    expect(out.checked.revision.commit).toMatch(/^[0-9a-f]{40}$/);
  });
});

describe('the instructor materials', () => {
  test('a throwaway bundle is refused, by name', () => {
    // The rule the whole exercise is about. `npm run build:ci` encrypts with a
    // random secret so a fork's pull request can prove the pipeline runs; the
    // output cannot be opened by anyone and must never be published.
    writeFileSync(
      path.join(root, MATERIALS),
      JSON.stringify({
        cipher: 'AES-GCM',
        kdf: {},
        salt: 'x',
        iv: 'y',
        data: 'z',
        unpublishable: true,
      })
    );
    const out = verifyRelease(root);
    expect(out.ok).toBe(false);
    expect(out.problems.join(' ')).toMatch(/throwaway key/i);
    // And it says how to fix it, because the fix is not obvious.
    expect(out.problems.join(' ')).toMatch(/git checkout --/);
  });

  test('a missing bundle is refused rather than quietly shipped', () => {
    rmSync(path.join(root, MATERIALS));
    const out = verifyRelease(root);
    expect(out.ok).toBe(false);
    expect(out.problems.join(' ')).toMatch(/instructor area/i);
  });

  test('an unreadable or incomplete bundle is refused', () => {
    writeFileSync(path.join(root, MATERIALS), 'not json at all');
    expect(verifyRelease(root).ok).toBe(false);

    writeFileSync(
      path.join(root, MATERIALS),
      JSON.stringify({ cipher: 'AES-GCM' })
    );
    const out = verifyRelease(root);
    expect(out.ok).toBe(false);
    expect(out.problems.join(' ')).toMatch(/missing:/);
  });

  test('the marker is what distinguishes the two, since nothing else does', () => {
    const real = {
      cipher: 'AES-GCM',
      kdf: {},
      salt: 'x',
      iv: 'y',
      data: 'z',
    };
    expect(checkMaterials(JSON.stringify(real)).ok).toBe(true);
    expect(
      checkMaterials(JSON.stringify({ ...real, unpublishable: true })).reason
    ).toBe('throwaway');
  });
});

describe('the offline precache', () => {
  test('a precached file that is not in the tree is refused', () => {
    // This is the failure that hits everybody at once: the service worker
    // installs by fetching the whole list, and one missing name fails the
    // install for every visitor rather than degrading for one.
    writeFileSync(
      path.join(root, MANIFEST),
      "self.__GRAVITAS_PRECACHE = [\n  './index.html',\n  './css/gone.css',\n];\n"
    );
    const out = verifyRelease(root);
    expect(out.ok).toBe(false);
    expect(out.checked.missing).toEqual(['css/gone.css']);
    expect(out.problems.join(' ')).toMatch(/offline support/i);
  });

  test('many missing files are counted and sampled rather than all listed', () => {
    const names = Array.from({ length: 9 }, (_, i) => `  './css/x${i}.css',`);
    writeFileSync(
      path.join(root, MANIFEST),
      `self.__GRAVITAS_PRECACHE = [\n${names.join('\n')}\n];\n`
    );
    const out = verifyRelease(root);
    expect(out.checked.missing).toHaveLength(9);
    expect(out.problems.join(' ')).toMatch(/9 precached file/);
    expect(out.problems.join(' ')).toMatch(/and more/);
  });

  test('a missing or empty manifest is refused', () => {
    rmSync(path.join(root, MANIFEST));
    expect(verifyRelease(root).ok).toBe(false);

    writeFileSync(
      path.join(root, MANIFEST),
      'self.__GRAVITAS_PRECACHE = [];\n'
    );
    const out = verifyRelease(root);
    expect(out.ok).toBe(false);
    expect(out.problems.join(' ')).toMatch(/lists no files/);
  });

  test('paths are read whether or not they carry the leading dot-slash', () => {
    expect(
      precachedPaths("__GRAVITAS_PRECACHE = ['./a.js', 'b/c.css']")
    ).toEqual(['a.js', 'b/c.css']);
    // A file that is not a manifest yields nothing rather than throwing.
    expect(precachedPaths('nothing here')).toEqual([]);
    expect(precachedPaths(undefined)).toEqual([]);
  });
});

describe('the revision marker', () => {
  test('a deploy without one is refused', () => {
    // Not pedantry: it is what lets somebody looking at a misbehaving site
    // establish which commit they are looking at.
    rmSync(path.join(root, REVISION));
    const out = verifyRelease(root);
    expect(out.ok).toBe(false);
    expect(out.problems.join(' ')).toMatch(/which commit it is/);
  });

  test('a local check can waive it, because a working tree has none', () => {
    rmSync(path.join(root, REVISION));
    expect(verifyRelease(root, { requireRevision: false }).ok).toBe(true);
  });

  test('a marker that does not name a commit is refused', () => {
    writeFileSync(
      path.join(root, REVISION),
      JSON.stringify({ commit: 'HEAD' })
    );
    expect(verifyRelease(root).ok).toBe(false);
    writeFileSync(path.join(root, REVISION), 'nonsense');
    expect(verifyRelease(root).ok).toBe(false);
  });
});

describe('the entry point', () => {
  test('a tree with no index.html is refused', () => {
    rmSync(path.join(root, 'index.html'));
    const out = verifyRelease(root);
    expect(out.ok).toBe(false);
    expect(out.problems.join(' ')).toMatch(/blank/);
  });
});

describe('the real repository', () => {
  test('the committed tree is publishable, apart from the deploy marker', async () => {
    // The check that this script is calibrated against the thing it guards
    // rather than only against fixtures. The marker is written at deploy time,
    // so it is waived here.
    const out = verifyRelease(process.cwd(), { requireRevision: false });
    expect(out.problems).toEqual([]);
    expect(out.checked.precached).toBeGreaterThan(200);
  });
});
