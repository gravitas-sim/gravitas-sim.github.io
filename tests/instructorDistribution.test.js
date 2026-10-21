// =============================================================================
// Who gets the passphrase, and how (Prompt 170): the parts a test can hold
// -----------------------------------------------------------------------------
// The policy is prose (INSTRUCTOR_MATERIALS.md, "Who gets the passphrase, and
// how"), and most of it is a person's judgment. Two things in it are not, and
// are tested here:
//
//   1. The department route. A bundle a department builds under its own
//      passphrase opens with that passphrase and not with the project's, and
//      the project's does not open the department's. The project's passphrase
//      is a secret no test may hold, so the published fixture passphrase
//      (FIXTURE_PASSPHRASE, printed in the builder's source because it is not a
//      secret) stands in for it. The key is derived the way the portal derives
//      it (js/instructorPortal.js deriveKey and decrypt), from the parameters
//      the bundle carries.
//   2. That the policy names the parts the roadmap asks for, points from
//      SUPPORT.md, CONTINUITY.md and OWNER_ACTIONS.md to one place, records the
//      second holder as UNKNOWN until the owner confirms, and carries no
//      passphrase.
//
// The builder runs in a private copy of its own sources, so a checkout that holds
// the real `.instructor-password` cannot make "no passphrase" a different test,
// and nothing here can reach the real bundle.
// =============================================================================

import { execFile } from 'node:child_process';
import { webcrypto } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

import { describe, test, expect, afterAll } from '@jest/globals';

import { sourcePathsFor } from '../tools/instructor-freshness.mjs';
import { FIXTURE_PASSPHRASE } from '../tools/build-instructor-materials.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = promisify(execFile);
const scratch = [];

function tempDir() {
  const dir = mkdtempSync(path.join(tmpdir(), 'gravitas-dept-'));
  scratch.push(dir);
  return dir;
}
afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

/** A private copy of the builder's closure, with a package.json, at a new root. */
function sandboxRoot() {
  const root = tempDir();
  for (const file of [...sourcePathsFor(REPO), 'package.json']) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    copyFileSync(path.join(REPO, file), path.join(root, file));
  }
  return root;
}
const SANDBOX = sandboxRoot();

/** The environment a child gets: no instructor passphrase unless it is given one. */
const envWith = secret => {
  const env = { ...process.env };
  delete env.GRAVITAS_INSTRUCTOR_PASSWORD;
  if (secret !== undefined) env.GRAVITAS_INSTRUCTOR_PASSWORD = secret;
  return env;
};

/** The builder, in the sandbox; resolves to {code, stdout, stderr} and never rejects. */
async function builder(args, secret) {
  try {
    const { stdout, stderr } = await run(
      process.execPath,
      ['tools/build-instructor-materials.js', ...args],
      { cwd: SANDBOX, env: envWith(secret), maxBuffer: 64 * 1024 * 1024 }
    );
    return { code: 0, stdout, stderr };
  } catch (e) {
    return { code: e.code, stdout: e.stdout ?? '', stderr: e.stderr ?? '' };
  }
}

const b64 = s => Uint8Array.from(Buffer.from(s, 'base64'));

/** What the portal does with a passphrase: derive the key, decrypt, gunzip. */
async function open(payload, phrase) {
  const base = await webcrypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(phrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  const key = await webcrypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: b64(payload.salt),
      iterations: payload.kdf.iterations,
      hash: payload.kdf.hash,
    },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  try {
    const plain = await webcrypto.subtle.decrypt(
      { name: 'AES-GCM', iv: b64(payload.iv) },
      key,
      b64(payload.data)
    );
    const bytes =
      payload.compress === 'gzip' ? gunzipSync(Buffer.from(plain)) : plain;
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null; // a wrong passphrase fails to decrypt; it is not compared
  }
}

const DEPARTMENT = 'a department chose these words for itself 2026';
const OTHER = 'another department, other words, 2027';

describe('a bundle under another passphrase opens with it and not with the project’s', () => {
  const dir = tempDir();
  const departmentFile = path.join(dir, 'department.enc.json');
  const projectFile = path.join(dir, 'project.enc.json');
  let department;
  let project;

  test('the rehearsal builds under the department’s passphrase, and the fixture under the published one', async () => {
    const d = await builder(['--rehearse', departmentFile], DEPARTMENT);
    expect({ code: d.code, err: d.stderr }).toEqual({ code: 0, err: '' });
    const p = await builder(['--fixture', projectFile]);
    expect({ code: p.code, err: p.stderr }).toEqual({ code: 0, err: '' });
    department = JSON.parse(readFileSync(departmentFile, 'utf8'));
    project = JSON.parse(readFileSync(projectFile, 'utf8'));
    // Neither says anything about its own key, and neither carries it.
    expect(JSON.stringify(department)).not.toContain(DEPARTMENT);
    expect(d.stdout).not.toContain(DEPARTMENT);
  }, 60000);

  test('the department’s bundle opens with the department’s passphrase', async () => {
    const manifest = await open(department, DEPARTMENT);
    expect(manifest).not.toBeNull();
    expect(manifest.files.length).toBeGreaterThan(500);
    expect(manifest.files.some(f => f.id.endsWith('-notes-es'))).toBe(true);
  }, 60000);

  test('and not with the project’s, or any other', async () => {
    expect(await open(department, FIXTURE_PASSPHRASE)).toBeNull();
    expect(await open(department, OTHER)).toBeNull();
    expect(await open(department, DEPARTMENT + ' ')).toBeNull();
  }, 60000);

  test('the project’s bundle opens with the project’s and not with the department’s', async () => {
    expect(await open(project, FIXTURE_PASSPHRASE)).not.toBeNull();
    expect(await open(project, DEPARTMENT)).toBeNull();
  }, 60000);

  test('two departments’ bundles are not interchangeable', async () => {
    const otherFile = path.join(dir, 'other.enc.json');
    const o = await builder(['--rehearse', otherFile], OTHER);
    expect(o.code).toBe(0);
    const other = JSON.parse(readFileSync(otherFile, 'utf8'));
    expect(await open(other, OTHER)).not.toBeNull();
    expect(await open(other, DEPARTMENT)).toBeNull();
    expect(await open(department, OTHER)).toBeNull();
    // A fresh salt and IV every time: the same passphrase twice is two bundles.
    expect(other.salt).not.toBe(department.salt);
  }, 60000);
});

describe('the rehearsal refuses what would make it unsafe', () => {
  test('without a passphrase it does nothing', async () => {
    const out = path.join(tempDir(), 'none.enc.json');
    const r = await builder(['--rehearse', out]);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/none was found/);
    expect(existsSync(out)).toBe(false);
  });

  test('the published fixture passphrase is refused, because it opens for everyone', async () => {
    const out = path.join(tempDir(), 'open.enc.json');
    const r = await builder(['--rehearse', out], FIXTURE_PASSPHRASE);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/refuses the published fixture passphrase/);
    expect(existsSync(out)).toBe(false);
  });

  test('it never writes over the production bundle or its manifest', async () => {
    const production = path.join(SANDBOX, 'instructors', 'materials.enc.json');
    const r = await builder(['--rehearse', production], DEPARTMENT);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/refuses to write the production bundle/);
    expect(existsSync(production)).toBe(false);
    expect(
      existsSync(path.join(SANDBOX, 'instructors', 'materials.manifest.json'))
    ).toBe(false);
  });

  test('its default place is gitignored', () => {
    expect(readFileSync(path.join(REPO, '.gitignore'), 'utf8')).toMatch(
      /^\.instructor-rehearsal\/$/m
    );
  });
});

describe('the policy is written, in one place, and holds no secret', () => {
  const read = f => readFileSync(path.join(REPO, f), 'utf8');
  const policy = read('INSTRUCTOR_MATERIALS.md');

  test('it names every part the roadmap asks for', () => {
    for (const heading of [
      '## Who gets the passphrase, and how (Prompt 170)',
      '### The request',
      '### Rotation',
      "### A department's own passphrase and bundle",
      '### The second holder',
    ])
      expect(policy).toContain(heading);
    // The form of words, what is verified, the reply and the turnaround.
    expect(policy).toMatch(/form of words/);
    expect(policy).toMatch(/What Carl verifies/);
    expect(policy).toMatch(/\*\*The reply\.\*\*/);
    expect(policy).toMatch(/\*\*Turnaround\.\*\*/);
    // Rotation: a suspected leak, a term boundary, and that it is a rebuild.
    expect(policy).toMatch(/On a suspected leak/);
    expect(policy).toMatch(/At a term boundary, if Carl chooses/);
    expect(policy).toMatch(/A rotation is a rebuild/);
    // The department route is numbered and ends in the test.
    expect(policy).toMatch(/--rehearse/);
    expect(policy).toMatch(/tests\/instructorDistribution\.test\.js/);
  });

  test('the second holder is UNKNOWN, who and never what', () => {
    const section = policy.slice(policy.indexOf('### The second holder'));
    expect(section).toMatch(/\*\*UNKNOWN\*\*/);
    expect(section).toMatch(/never the passphrase and never where it is kept/);
  });

  test('SUPPORT, CONTINUITY and OWNER_ACTIONS point to it', () => {
    expect(read('SUPPORT.md')).toContain('INSTRUCTOR_MATERIALS.md');
    expect(read('CONTINUITY.md')).toContain('INSTRUCTOR_MATERIALS.md');
    const owner = read('OWNER_ACTIONS.md');
    expect(owner).toContain('INSTRUCTOR_MATERIALS.md');
    expect(owner).toContain('D-R10-43');
  });

  test('no document puts a value after the passphrase variable or file', () => {
    for (const f of [
      'INSTRUCTOR_MATERIALS.md',
      'SUPPORT.md',
      'CONTINUITY.md',
      'OWNER_ACTIONS.md',
      'DECISION_REGISTER.md',
    ])
      expect({
        f,
        hit: /GRAVITAS_INSTRUCTOR_PASSWORD\s*=\s*["']?\S/.test(read(f)),
      }).toEqual({ f, hit: false });
  });

  test('the request route keeps the portal free of a personal address', () => {
    const portal = read('instructors/index.html');
    expect(portal).not.toMatch(/mailto:/);
    expect(policy).toMatch(/Instructor access request/);
  });
});
