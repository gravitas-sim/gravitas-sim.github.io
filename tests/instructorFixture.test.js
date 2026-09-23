// =============================================================================
// A stale instructor fixture is rebuilt, never served
// -----------------------------------------------------------------------------
// e2e/instructorPortal.spec.js rebuilt its fixture only when the file was
// missing, so a checkout kept the first one it ever built. These tests hold
// tools/instructor-fixture.mjs to the property that replaced that: every state
// other than "fresh, and stamped for exactly these sources" is a rebuild.
//
// Every fixture here is written to a temporary directory. The real
// .instructor-fixture/ belongs to whichever Playwright run is using it.
// A fixture build takes well under a second, so these run the real builder
// rather than a model of it.
// =============================================================================

import { createHash } from 'node:crypto';
import {
  appendFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ensureFixture,
  expectedStamp,
  fixtureState,
  stampPathFor,
} from '../tools/instructor-fixture.mjs';
import { sourcePathsFor } from '../tools/instructor-freshness.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scratch = [];
const sha = file =>
  createHash('sha256').update(readFileSync(file)).digest('hex');

function tempDir() {
  const dir = mkdtempSync(path.join(tmpdir(), 'gravitas-fixture-'));
  scratch.push(dir);
  return dir;
}

/** A fixture path in its own directory, not yet built. */
const freshPath = () => path.join(tempDir(), 'materials.enc.json');

/** A fixture that has been built and stamped. */
function builtFixture() {
  const fixture = freshPath();
  ensureFixture({ fixture });
  return fixture;
}

/** Rewrite a stamp's fields. */
function editStamp(fixture, change) {
  const at = stampPathFor(fixture);
  const stamp = JSON.parse(readFileSync(at, 'utf8'));
  writeFileSync(at, JSON.stringify({ ...stamp, ...change(stamp) }));
}

/** A copy of just the files the builder's closure covers, at a new root. */
function copyOfClosure() {
  const root = tempDir();
  for (const file of sourcePathsFor(REPO)) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    copyFileSync(path.join(REPO, file), path.join(root, file));
  }
  return root;
}

afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

describe('each state', () => {
  test('missing: built, stamped, and then fresh', () => {
    const fixture = freshPath();
    expect(fixtureState({ fixture }).state).toBe('missing');
    const result = ensureFixture({ fixture });
    expect(result).toMatchObject({ state: 'missing', rebuilt: true });
    expect(existsSync(stampPathFor(fixture))).toBe(true);
    expect(result.bytes).toBe(readFileSync(fixture, 'utf8'));
    expect(fixtureState({ fixture }).state).toBe('fresh');
  });

  test('fresh: served as it is, not rebuilt', () => {
    const fixture = builtFixture();
    const before = sha(fixture);
    const result = ensureFixture({ fixture });
    expect(result).toMatchObject({ state: 'fresh', rebuilt: false });
    // Ciphertext has a fresh salt every build, so equal bytes prove no rebuild.
    expect(sha(fixture)).toBe(before);
    expect(result.bytes).toBe(readFileSync(fixture, 'utf8'));
  });

  test('stale: rebuilt, and the file that moved is named', () => {
    const fixture = builtFixture();
    const input = 'js/data/instructorContent.js';
    editStamp(fixture, s => ({
      sourceDigest: 'not-the-digest',
      sources: { ...s.sources, [input]: 'an-older-hash' },
    }));
    const found = fixtureState({ fixture });
    expect(found.state).toBe('stale');
    expect(found.reasons.join('\n')).toContain(`changed     ${input}`);
    const before = sha(fixture);
    expect(ensureFixture({ fixture })).toMatchObject({ rebuilt: true });
    expect(sha(fixture)).not.toBe(before);
    expect(fixtureState({ fixture }).state).toBe('fresh');
  });

  test('stale when the stamping rules themselves changed', () => {
    const fixture = builtFixture();
    editStamp(fixture, () => ({ stamper: 'an-older-rule' }));
    expect(fixtureState({ fixture }).state).toBe('stale');
  });

  test('unstamped: a fixture from before stamping is rebuilt, not trusted', () => {
    const fixture = builtFixture();
    rmSync(stampPathFor(fixture));
    expect(fixtureState({ fixture }).state).toBe('unstamped');
    expect(ensureFixture({ fixture })).toMatchObject({ rebuilt: true });
    expect(fixtureState({ fixture }).state).toBe('fresh');
  });

  test('corrupt fixture: a truncated file is rebuilt', () => {
    const fixture = builtFixture();
    const text = readFileSync(fixture, 'utf8');
    writeFileSync(fixture, text.slice(0, text.length / 2));
    expect(fixtureState({ fixture }).state).toBe('corrupt');
    expect(ensureFixture({ fixture })).toMatchObject({ rebuilt: true });
    expect(fixtureState({ fixture }).state).toBe('fresh');
  });

  test('corrupt fixture: well-formed JSON that is not a bundle is rebuilt', () => {
    const fixture = builtFixture();
    writeFileSync(fixture, '{"hello":"world"}');
    // Re-stamp the bytes so only the shape is wrong.
    editStamp(fixture, () => ({ fixtureSha256: sha(fixture) }));
    const found = fixtureState({ fixture });
    expect(found.state).toBe('corrupt');
    expect(found.reasons.join('\n')).toMatch(/has no v, cipher/);
  });

  test('corrupt stamp: unreadable or incomplete is a rebuild, not a pass', () => {
    const garbage = builtFixture();
    writeFileSync(stampPathFor(garbage), 'not json');
    expect(fixtureState({ fixture: garbage }).state).toBe('corrupt');

    const partial = builtFixture();
    writeFileSync(stampPathFor(partial), JSON.stringify({ sourceDigest: 'x' }));
    expect(fixtureState({ fixture: partial }).state).toBe('corrupt');
    expect(ensureFixture({ fixture: partial })).toMatchObject({
      rebuilt: true,
    });
  });
});

describe('the digest the stamp records', () => {
  test('covers exactly the closure the release digest covers', () => {
    // tests/instructorDigest.test.js proves that closure equals what Node
    // loads during a --fixture build, so equality here is completeness.
    expect(Object.keys(expectedStamp().sources).sort()).toEqual(
      sourcePathsFor(REPO)
    );
  });

  test('is stable: the same tree gives the same stamp from anywhere', () => {
    const a = expectedStamp();
    const b = expectedStamp();
    const copy = expectedStamp(copyOfClosure());
    expect(b).toEqual(a);
    expect(copy.sourceDigest).toBe(a.sourceDigest);
    expect(copy.sources).toEqual(a.sources);
  });

  test('omits no input: changing any covered file makes the fixture stale', () => {
    const fixture = builtFixture();
    const root = copyOfClosure();
    // Judged against an identical copy of the sources, it is fresh...
    expect(fixtureState({ root, fixture }).state).toBe('fresh');
    // ...and a one-byte change to any one of them, each in turn, is noticed.
    const baseline = expectedStamp(root).sourceDigest;
    const unnoticed = [];
    for (const file of sourcePathsFor(REPO)) {
      const at = path.join(root, file);
      const original = readFileSync(at);
      appendFileSync(at, '\n');
      if (expectedStamp(root).sourceDigest === baseline) unnoticed.push(file);
      writeFileSync(at, original);
    }
    expect(unnoticed).toEqual([]);
    appendFileSync(path.join(root, 'js/data/instructorContent.js'), '\n');
    const found = fixtureState({ root, fixture });
    expect(found.state).toBe('stale');
    expect(found.reasons.join('\n')).toContain('js/data/instructorContent.js');
  });
});

describe('the boundary with the real bundle', () => {
  const published = path.join(REPO, 'instructors', 'materials.enc.json');
  const manifest = path.join(REPO, 'instructors', 'materials.manifest.json');

  test('ensuring a fixture never touches the published bundle or its record', () => {
    const before = [sha(published), sha(manifest)];
    ensureFixture({ fixture: freshPath() });
    expect([sha(published), sha(manifest)]).toEqual(before);
  });

  test('a fixture path inside instructors/ is refused before anything is built', () => {
    const before = sha(published);
    expect(() => ensureFixture({ fixture: published })).toThrow(/Refusing/);
    expect(() =>
      ensureFixture({ fixture: path.join(REPO, 'instructors', 'x', 'f.json') })
    ).toThrow(/Refusing/);
    expect(sha(published)).toBe(before);
  });

  test('the stamp names no secret: only digests and paths', () => {
    const fixture = builtFixture();
    const stamp = readFileSync(stampPathFor(fixture), 'utf8');
    expect(stamp).not.toMatch(/gravitas-fixture-not-a-secret/);
    expect(Object.keys(JSON.parse(stamp)).sort()).toEqual(
      [
        'fixtureSha256',
        'note',
        'sourceDigest',
        'sourceFiles',
        'sources',
        'stamper',
      ].sort()
    );
  });
});
