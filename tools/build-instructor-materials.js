#!/usr/bin/env node
// =============================================================================
// Build the instructor materials, and encrypt them.
// -----------------------------------------------------------------------------
// Gravitas is served from GitHub Pages. There is no server, no request handler
// and nowhere to check a password: anything committed to the repository is
// readable by anyone who asks for the URL. A JavaScript password check on a
// static site is theater, and answer keys sitting in a public folder behind one
// are simply published.
//
// So the materials are not protected by a check at all. They are encrypted.
// This script generates every PDF, packs them into one manifest, and encrypts
// that manifest with a key derived from a shared passphrase. What ships is
// ciphertext plus a salt and an IV. The browser asks for the passphrase,
// derives the same key, and decrypts in memory. A wrong passphrase does not
// fail a comparison; it fails to decrypt, because it cannot produce the key.
//
// The honest limit, stated here and on the login page: the ciphertext is
// public, so its security is exactly the strength of the passphrase against an
// offline attack. PBKDF2 at 600,000 iterations makes each guess expensive; a
// passphrase from a word list would still fall. Choose accordingly.
//
// The passphrase is never written to any file this repository tracks. It comes
// from GRAVITAS_INSTRUCTOR_PASSWORD, or from a gitignored .instructor-password
// file, and the script refuses to run without one.
//
// Except in CI, where --unpublishable substitutes a random throwaway secret.
// Continuous integration has to prove this pipeline still runs - it renders
// every guide and answer key and re-verifies each derived answer against the
// site's own grading function, which is where breakage actually happens - and it
// cannot be given the real passphrase, because a pull request from a fork has no
// access to repository secrets and every external contribution would fail. The
// ciphertext that comes out is undecryptable by anyone, including us, and the
// script says so on every line of its output so that nobody publishes it.
// =============================================================================

import { webcrypto as crypto, createHash } from 'node:crypto';
import { TextEncoder } from 'node:util';
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  readdirSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { INVESTIGATIONS } from '../js/data/investigations.js';
import { verifyKey } from '../js/answerKey.js';
import {
  instructorGuide,
  answerKeyDocument,
  adoptersGuide,
  curriculumMap,
} from '../js/instructorDocs.js';
import { activityGuide, activityWorksheet } from '../js/activityDocs.js';
import { ACTIVITIES } from '../js/data/activities.js';
import { EN_TEACHING } from '../js/i18n/en.teaching.js';
import { plainText as plainTextOf } from '../js/answerKey.js';
import { INSTRUCTOR_CONTENT } from '../js/data/instructorContent.js';
import { checkInstructorCatalog } from '../js/authoring/instructorSchema.js';
import { createDocument } from '../js/pdf.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
/** A path as the repository sees it, for a message. */
const rel = p => p.replace(`${ROOT}/`, '');
const OUT_DIR = join(ROOT, 'instructors');
const OUT_FILE = join(OUT_DIR, 'materials.enc.json');
const PLAIN_DIR = join(ROOT, '.instructor-build');
const MANIFEST_FILE = join(OUT_DIR, 'materials.manifest.json');

// -----------------------------------------------------------------------------
// Freshness, without the passphrase
// -----------------------------------------------------------------------------
// The ciphertext cannot answer "is this current?". Every build derives a fresh
// salt and IV, so two encryptions of identical material differ in every byte -
// which means `git status` reports a change whenever this script runs, and that
// change carries no information at all. A bundle has been committed for that
// reason before now, in a commit about something else entirely.
//
// Nor can the answer come from re-encrypting and comparing: that needs the
// passphrase, which CI does not have and must not have.
//
// So the record is a digest of the inputs, written beside the ciphertext and
// public. Anyone - CI, a reviewer, the release gate - can hash the same files
// and compare, with no secret and no decryption. Sources unchanged means the
// bundle is current; sources changed means it is stale and must be rebuilt.
//
// Keyed on the inputs rather than on the rendered documents, because the
// documents are not stable over time: `versionStamp()` prints the month into
// every footer, so their bytes change on the first of each month with no change
// to anything anybody wrote. A content digest would call the bundle stale
// twelve times a year and be ignored by the second time.
const SOURCE_FILES = [
  'tools/build-instructor-materials.js',
  'js/pdf.js',
  'js/instructorDocs.js',
  'js/activityDocs.js',
  'js/answerKey.js',
  'js/data/activities.js',
  'js/data/investigations.js',
  'js/i18n/en.teaching.js',
];
/** Every lesson module, which is where the answers themselves live. */
const SOURCE_DIRS = ['js/data/investigations'];

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

/** Every input, as repository-relative paths, sorted. @returns {string[]} */
function sourcePaths() {
  const fromDirs = SOURCE_DIRS.flatMap(dir =>
    readdirSync(join(ROOT, dir))
      .filter(name => name.endsWith('.js'))
      .map(name => `${dir}/${name}`)
  );
  return [...SOURCE_FILES, ...fromDirs].sort();
}

/**
 * One digest over every input that decides what the materials say.
 *
 * The path is hashed with the bytes, so moving a lesson to a new file is a
 * change even when its text is identical.
 *
 * @returns {{digest: string, files: number}} The digest and how many files it covers
 */
function sourceDigest() {
  const paths = sourcePaths();
  const lines = paths.map(rel => {
    const full = join(ROOT, rel);
    if (!existsSync(full)) {
      console.error(`Instructor source is missing: ${rel}`);
      process.exit(1);
    }
    return `${rel}:${sha256(readFileSync(full))}`;
  });
  return { digest: sha256(lines.join('\n')), files: paths.length };
}

/**
 * Report whether the committed bundle was built from the sources on disk.
 *
 * Needs no passphrase and renders nothing, so the release gate can afford it.
 *
 * @returns {void} Exits non-zero when the bundle is stale
 */
function checkFreshness() {
  const { digest, files } = sourceDigest();
  if (!existsSync(MANIFEST_FILE)) {
    console.error(
      'No instructors/materials.manifest.json. Run `npm run build:instructors` ' +
        'to build the bundle and write the record of what it was built from.'
    );
    process.exit(1);
  }
  const recorded = JSON.parse(readFileSync(MANIFEST_FILE, 'utf8'));
  if (recorded.sourceDigest !== digest) {
    console.error(
      [
        'The instructor bundle is stale.',
        `  recorded: ${recorded.sourceDigest}`,
        `  on disk:  ${digest}  (${files} source files)`,
        '',
        'Instructional content changed after the bundle was built. Rebuild it',
        'with `npm run build:instructors` - which needs the real passphrase -',
        'and commit the bundle and the manifest together.',
      ].join('\n')
    );
    process.exit(1);
  }
  console.log(
    `Instructor bundle is current: ${files} source files, digest ${digest.slice(0, 12)}, ` +
      `bundle built ${recorded.generated}.`
  );
}

/** PBKDF2 work factor. OWASP's floor for SHA-256; about a second on a phone. */
const ITERATIONS = 600000;

const b64 = bytes => Buffer.from(bytes).toString('base64');

/** A stable version stamp: the month, which is what a document footer wants. */
function versionStamp() {
  const d = new Date();
  return `${d.toLocaleString('en-US', { month: 'long' })} ${d.getFullYear()}`;
}

/**
 * The shared passphrase, from the environment or a gitignored file.
 *
 * @param {boolean} unpublishable - Accept a throwaway secret rather than failing
 * @returns {string} The passphrase to encrypt with
 */
function passphrase(unpublishable) {
  const fromEnv = process.env.GRAVITAS_INSTRUCTOR_PASSWORD;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();
  const file = join(ROOT, '.instructor-password');
  if (existsSync(file)) {
    const value = readFileSync(file, 'utf8').trim();
    if (value) return value;
  }
  if (unpublishable) {
    // 32 random bytes, never printed and never stored. The point is to exercise
    // the pipeline, not to produce something anyone can open.
    return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString(
      'hex'
    );
  }
  console.error(
    [
      '',
      'No instructor passphrase found.',
      '',
      'The materials are encrypted with it, so there is nothing to build without one.',
      'It is never committed. Provide it one of two ways:',
      '',
      '    GRAVITAS_INSTRUCTOR_PASSWORD="your passphrase" npm run build:instructors',
      '',
      'or write it to .instructor-password, which is gitignored:',
      '',
      '    echo "your passphrase" > .instructor-password',
      '',
    ].join('\n')
  );
  process.exit(1);
}

async function encrypt(plaintext, secret) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const base = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  const data = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintext
  );
  return {
    v: 1,
    cipher: 'AES-GCM',
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: ITERATIONS },
    salt: b64(salt),
    iv: b64(iv),
    data: b64(new Uint8Array(data)),
  };
}

/** A filename safe on every platform a faculty member might unzip on. */
/** Whether a real passphrase is available, as opposed to a generated one. */
function hasRealSecret() {
  const fromEnv = process.env.GRAVITAS_INSTRUCTOR_PASSWORD;
  if (fromEnv && fromEnv.trim()) return true;
  const file = join(ROOT, '.instructor-password');
  return existsSync(file) && readFileSync(file, 'utf8').trim().length > 0;
}

const slug = title =>
  title
    .replace(/[’']/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/**
 * Refuse to render content the renderer cannot read.
 *
 * The PDF writer reads `f.text` and `f.name`; a field written under any other
 * key yields `undefined`, which becomes a blank table cell rather than an
 * error. Five guides shipped with a blank table that way, and one shipped at
 * 27 pages because a string reached `bullets()` and was iterated a character
 * at a time. None of it was visible without opening the PDF.
 *
 * So the shapes are checked here, before a single page is drawn, and a
 * mismatch stops the build with the lesson, the field and the fix named.
 */
function requireCanonicalContent() {
  const steps = Object.fromEntries(
    INVESTIGATIONS.map(inv => [inv.id, inv.steps.length])
  );
  const problems = checkInstructorCatalog(INSTRUCTOR_CONTENT, steps);
  if (!problems.length) return;
  console.error(
    [
      '',
      `  Instructor content does not match the schema (${problems.length} problem(s)).`,
      '  js/authoring/instructorSchema.js declares what each field has to be;',
      '  the renderer in js/instructorDocs.js reads those shapes and nothing else.',
      '',
      ...problems.map(p => `    - ${p}`),
      '',
    ].join('\n')
  );
  process.exit(1);
}

/**
 * The passphrase the test fixture is encrypted with.
 *
 * Published on purpose. It is not a secret and must never be one: the bundle
 * it opens contains placeholder pages, it is written to a gitignored path, and
 * it never replaces `instructors/materials.enc.json`. Its whole job is to let
 * e2e/instructorPortal.spec.js drive the real decrypt-and-render path without
 * the production passphrase being anywhere near a test run or a CI log.
 */
export const FIXTURE_PASSPHRASE = 'gravitas-fixture-not-a-secret';

/** Where `--fixture` writes unless told otherwise. Gitignored. */
const FIXTURE_DEFAULT = join(ROOT, '.instructor-fixture', 'materials.enc.json');

/**
 * A one-page PDF standing in for a real document.
 *
 * The fixture exists to exercise the portal, and the portal reads a file's id,
 * name, kind and size - never its contents. Rendering fifty-four real
 * documents to test a download button would put ninety seconds into every run
 * for bytes nothing looks at.
 *
 * @param {string} label - Drawn on the page, so a saved file is identifiable
 * @returns {Uint8Array} A small valid PDF
 */
function stubPdf(label) {
  const doc = createDocument({
    title: label,
    subject: 'Placeholder document for the instructor-portal test fixture.',
    footer: 'Gravitas test fixture - not a real document',
  });
  doc.titleBlock({ kicker: 'Test fixture', title: label });
  doc.paragraph(
    'This is a placeholder generated by `--fixture`. The real document is ' +
      'built by the same tool without that flag.'
  );
  return doc.build();
}

async function main() {
  // Asking whether the bundle is current needs neither the passphrase nor a
  // single rendered page, so it happens before anything else and costs
  // milliseconds. This is the mode the release gate runs.
  if (process.argv.includes('--check')) {
    requireCanonicalContent();
    checkFreshness();
    return;
  }

  requireCanonicalContent();

  // CI cannot be handed the real passphrase, so it asks for a build it is not
  // allowed to publish. Everything else about the run is identical.
  // A fixture is the same inventory with placeholder pages, encrypted with a
  // published test passphrase, written somewhere else. It exists so the portal
  // can be driven end to end without the production secret, and it is built by
  // this tool rather than by a second one so its ids and names cannot drift
  // from the ones the portal looks up.
  const fixtureAt = process.argv.indexOf('--fixture');
  const isFixture = fixtureAt >= 0;
  const fixtureOut =
    isFixture &&
    process.argv[fixtureAt + 1] &&
    !process.argv[fixtureAt + 1].startsWith('--')
      ? resolve(process.argv[fixtureAt + 1])
      : FIXTURE_DEFAULT;
  if (isFixture && resolve(fixtureOut) === resolve(OUT_FILE)) {
    console.error(
      '\n  --fixture refuses to write the production bundle.\n' +
        `  ${OUT_FILE} is the published artifact; a fixture is a placeholder\n` +
        '  set encrypted with a passphrase that is printed in the source.\n'
    );
    process.exit(1);
  }

  const unpublishable = process.argv.includes('--unpublishable');
  const secret = isFixture ? FIXTURE_PASSPHRASE : passphrase(unpublishable);
  const usedThrowaway = unpublishable && !hasRealSecret();
  const version = versionStamp();
  const keepPlain = process.argv.includes('--keep-plaintext');

  if (usedThrowaway) {
    console.log(
      [
        '',
        '  UNPUBLISHABLE BUILD',
        '  No passphrase was available, so a random throwaway secret was used.',
        '  The materials below are real but the ciphertext cannot be opened by',
        '  anyone. This mode exists so CI can prove the pipeline still runs.',
        '  Do not publish the output.',
        '',
      ].join('\n')
    );
  }

  // A key that disagrees with the site is worse than no key, so nothing is
  // built until every derived answer has been re-checked against the site's
  // own grading function.
  const problems = INVESTIGATIONS.flatMap(verifyKey);
  if (problems.length) {
    console.error('Answer keys do not agree with the lessons:');
    for (const p of problems) console.error('  ' + p);
    process.exit(1);
  }

  const files = [];
  const add = (id, name, kind, investigation, bytes) => {
    if (isFixture) bytes = stubPdf(name.replace(/\.pdf$/, ''));
    files.push({
      id,
      name,
      kind,
      investigation,
      size: bytes.length,
      bytes: b64(bytes),
    });
  };

  add(
    'adopters-guide',
    'Teaching with Gravitas - Adopters Guide.pdf',
    'general',
    null,
    adoptersGuide(INVESTIGATIONS, { version })
  );
  add(
    'curriculum-map',
    'Gravitas Investigation Curriculum Map.pdf',
    'general',
    null,
    curriculumMap(INVESTIGATIONS, { version })
  );

  // Classroom activities. One guide per activity covering all three formats,
  // and a worksheet for each format that has students writing something down -
  // generated from the resolved steps, so paper and screen agree on the order
  // and the wording. No separate answer key: the investigation's own covers
  // every question these formats contain, and a second copy would be a second
  // thing to keep correct.
  for (const activity of ACTIVITIES) {
    const lesson = INVESTIGATIONS.find(l => l.id === activity.lesson);
    if (!lesson) continue;
    const name = slug(
      plainTextOf(EN_TEACHING[activity.titleId] || activity.id)
    );
    add(
      `activity-${activity.id}-guide`,
      `${name} - Classroom Activity Guide.pdf`,
      'guide',
      activity.lesson,
      activityGuide(activity, lesson, EN_TEACHING, { version })
    );
    for (const format of activity.formats) {
      // A demonstration is projected and answered aloud; a worksheet for it
      // would be a page of blank boxes nobody fills in.
      if (format.context === 'projection') continue;
      add(
        `activity-${activity.id}-${format.id}-worksheet`,
        `${name} - ${plainTextOf(EN_TEACHING[format.nameId])} Worksheet.pdf`,
        'worksheet',
        activity.lesson,
        activityWorksheet(activity, format, lesson, EN_TEACHING, { version })
      );
    }
  }

  for (const inv of INVESTIGATIONS) {
    const s = slug(inv.title);
    add(
      `${inv.id}-guide`,
      `${s} - Instructor Guide.pdf`,
      'guide',
      inv.id,
      instructorGuide(inv, { version })
    );
    add(
      `${inv.id}-key`,
      `${s} - Answer Key.pdf`,
      'key',
      inv.id,
      answerKeyDocument(inv, { version })
    );
  }

  const manifest = {
    version,
    generated: new Date().toISOString().slice(0, 10),
    files,
  };

  const payload = await encrypt(
    new TextEncoder().encode(JSON.stringify(manifest)),
    secret
  );
  if (isFixture) {
    mkdirSync(dirname(fixtureOut), { recursive: true });
    writeFileSync(fixtureOut, JSON.stringify(payload));
    console.log(
      `\nTest fixture: ${files.length} placeholder documents -> ${rel(fixtureOut)}\n` +
        '  Encrypted with the published fixture passphrase. Not publishable,\n' +
        '  not tracked, and never a replacement for the real bundle.'
    );
    return;
  }

  mkdirSync(OUT_DIR, { recursive: true });
  // A throwaway build says so, in the file.
  //
  // Until now the only sign was a line on stdout, which meant a CI artifact
  // and a publishable one were byte-indistinguishable to anything downstream -
  // and the whole reason this mode exists is that its output must not be
  // published. A release step cannot enforce a rule it cannot check, so the
  // marker goes where the check can see it. It is written only for a throwaway
  // build, so the real artifact is unchanged and no existing copy is
  // invalidated by this.
  writeFileSync(
    OUT_FILE,
    JSON.stringify(
      usedThrowaway ? { ...payload, unpublishable: true } : payload
    )
  );

  // The record of what this bundle was built from, in the clear beside it.
  //
  // Not written by a throwaway build: CI rebuilds on every run and its
  // ciphertext is undecryptable, so letting it stamp a manifest would file a
  // freshness record for an artifact nobody can open.
  if (!usedThrowaway) {
    const { digest, files: sourceCount } = sourceDigest();
    writeFileSync(
      MANIFEST_FILE,
      JSON.stringify(
        {
          version,
          generated: manifest.generated,
          documents: files.length,
          sourceFiles: sourceCount,
          sourceDigest: digest,
          // A hash of the rendered set, for anyone holding the passphrase who
          // wants to confirm the ciphertext matches this record. Not a
          // freshness signal: it moves with the month, which is why the check
          // above reads sourceDigest instead.
          contentDigest: sha256(
            files
              .map(
                f => `${f.id}|${f.kind}|${f.investigation}:${sha256(f.bytes)}`
              )
              .sort()
              .join('|')
          ),
        },
        null,
        2
      ) + '\n'
    );
  }

  const totalPdf = files.reduce((t, f) => t + f.size, 0);
  console.log(
    `Built ${files.length} documents (${Math.round(totalPdf / 1024)} KB of PDF)`
  );
  for (const f of files) {
    console.log(
      `  ${String(Math.round(f.size / 1024)).padStart(4)} KB  ${f.name}`
    );
  }
  console.log(
    `\nEncrypted to instructors/materials.enc.json ` +
      `(${Math.round(JSON.stringify(payload).length / 1024)} KB, PBKDF2 x${ITERATIONS.toLocaleString('en-US')})`
  );

  if (keepPlain) {
    // For inspecting the PDFs during development. Gitignored, never shipped.
    mkdirSync(PLAIN_DIR, { recursive: true });
    for (const f of files) {
      writeFileSync(join(PLAIN_DIR, f.name), Buffer.from(f.bytes, 'base64'));
    }
    console.log(`\nPlaintext copies written to .instructor-build/ for review.`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
