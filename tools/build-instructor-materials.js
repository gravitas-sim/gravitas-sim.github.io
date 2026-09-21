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
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  checkFreshnessAt,
  sourceDigestFor,
  sourcePathsFor,
} from './instructor-freshness.mjs';

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
//
// Which inputs, and why nobody lists them by hand any more
// -----------------------------------------------------------------------------
// This was a list of eight files and one directory - thirty-nine paths - and it
// was wrong by fifteen. The build evaluates forty-odd modules, and among the
// ones the list did not name were `js/data/instructorContent.js`, which holds
// the prose of every instructor guide, `js/data/activityTeaching.js`, which
// holds the teaching notes on every activity, and `js/authoring/
// instructorSchema.js`, which decides what a guide is allowed to contain.
// Rewriting any of them changed every document in the bundle and left the
// recorded digest byte-identical, so `instructors:check` reported a stale
// bundle as current - which is the one thing it exists not to do.
//
// A hand-written list beside a machine-maintained import graph drifts, and the
// drift is silent by construction: nothing fails when a new import is added,
// and it only surfaces as a release that shipped last month's answer keys. So
// the list is derived from the graph instead, in tools/instructor-freshness.mjs
// - which is also where the deploy gate reads it, so the question "is this
// bundle current?" has one answer rather than two.

/** @returns {string[]} Every input, as repository-relative paths, sorted */
export function sourcePaths() {
  return sourcePathsFor(ROOT);
}

/** @returns {{digest: string, files: number, sources: object}} The record */
export function sourceDigest() {
  return sourceDigestFor(ROOT);
}

/**
 * Report whether the committed bundle was built from the sources on disk.
 *
 * Needs no passphrase and renders nothing, so the release gate can afford it.
 *
 * This is the RELEASE question. It compares the working tree against the
 * production ciphertext that only Carl's passphrase can produce, so a branch
 * that edits a lesson fails it until the bundle is rebuilt - which is correct
 * for a release and wrong for a pull request. `--validate` is the question a
 * pull request should be asked; see main().
 *
 * @returns {void} Exits non-zero when the bundle is stale
 */
function checkFreshness() {
  const verdict = checkFreshnessAt(ROOT);
  if (!verdict.ok) {
    for (const problem of verdict.problems) console.error(problem);
    process.exit(1);
  }
  console.log(
    `Instructor bundle is current: ${verdict.files} source files, digest ` +
      `${verdict.digest.slice(0, 12)}, bundle built ${verdict.recorded.generated}.`
  );
}

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

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

/**
 * Every document the bundle contains, rendered.
 *
 * Pulled out of main() because three callers want it: the build, the fixture,
 * and `--restamp`, which re-renders in order to prove the plaintext has not
 * moved. Rendering needs no passphrase - only encrypting does - which is what
 * makes that proof available without the secret.
 *
 * @param {string} version - The stamp printed in every footer
 * @param {object} [options] - `stub` to substitute placeholder pages
 * @returns {Array<object>} One entry per document, with base64 bytes
 */
function renderDocuments(version, { stub = false } = {}) {
  const files = [];
  const add = (id, name, kind, investigation, bytes) => {
    if (stub) bytes = stubPdf(name.replace(/\.pdf$/, ''));
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

  return files;
}

/**
 * A hash of the rendered set, independent of how it was encrypted.
 *
 * Not a freshness signal - it moves with the month, because `versionStamp()`
 * prints the month into every footer and js/pdf.js stamps it into every
 * document's creation date. It is an identity: two renders with the same
 * version stamp agree here if and only if they produced the same documents.
 *
 * @param {Array<object>} files - From renderDocuments()
 * @returns {string} The digest recorded in the manifest
 */
function contentDigestOf(files) {
  return sha256(
    files
      .map(f => `${f.id}|${f.kind}|${f.investigation}:${sha256(f.bytes)}`)
      .sort()
      .join('|')
  );
}

/**
 * Build, check or render a fixture, according to the flags.
 *
 * Takes its arguments rather than reading `process.argv` directly so that
 * tools/instructor-digest-audit.mjs can drive a real build in-process and watch
 * which modules Node loads to do it. Nothing else passes them.
 *
 * @param {string[]} [args] - Flags, defaulting to this process's own
 * @returns {Promise<void>} Resolves when the run is finished
 */
export async function main(args) {
  const argv = args ?? process.argv.slice(2);
  // Asking whether the bundle is current needs neither the passphrase nor a
  // single rendered page, so it happens before anything else and costs
  // milliseconds. This is the mode the release gate runs.
  if (argv.includes('--check')) {
    requireCanonicalContent();
    checkFreshness();
    return;
  }

  // Re-state the freshness record without re-encrypting anything.
  //
  // The digest's covered set can change without a single document changing -
  // it did when the set stopped being a hand-written list - and so can the
  // builder's own bytes, which are an input because this file decides which
  // documents exist. Either marks the bundle stale, and the only remedy used
  // to be a rebuild with the real passphrase: a secret one person holds, a
  // fresh salt and IV, four megabytes of new ciphertext, and a merge conflict
  // with every other branch that did the same.
  //
  // None of that is necessary when the plaintext has not moved, and whether it
  // has moved is a question anybody can answer. Rendering needs no passphrase;
  // only encrypting does. So this re-renders every document at the version the
  // manifest records and compares the result against the contentDigest the
  // manifest already carries. Equal means the committed ciphertext holds
  // exactly these documents, and the record may be re-stated for the inputs
  // that actually produced it.
  //
  // It refuses otherwise, and the refusal is the safety property: nothing here
  // can make a stale bundle look current, because a stale bundle is precisely
  // one whose documents differ, which is what is being compared.
  //
  // The one thing it cannot see through: js/pdf.js stamps a month-granular
  // creation date, so re-rendering in a later month produces different bytes
  // for identical content and the comparison fails honestly rather than
  // silently. Outside the month of the build, a rebuild is the only route.
  if (argv.includes('--restamp')) {
    requireCanonicalContent();
    if (!existsSync(MANIFEST_FILE)) {
      console.error(
        `No ${rel(MANIFEST_FILE)} to re-state. Run \`npm run build:instructors\`.`
      );
      process.exit(1);
    }
    const recorded = JSON.parse(readFileSync(MANIFEST_FILE, 'utf8'));
    const rendered = renderDocuments(recorded.version);
    const contentDigest = contentDigestOf(rendered);
    if (contentDigest !== recorded.contentDigest) {
      console.error(
        [
          'The documents have changed, so the record cannot be re-stated.',
          `  recorded content digest: ${recorded.contentDigest}`,
          `  rendered now:            ${contentDigest}`,
          '',
          'Either instructional content really did move since the bundle was',
          `built, or this is a different month from ${recorded.version} and the`,
          'month-granular creation date in js/pdf.js has shifted every file.',
          'Both need `npm run build:instructors` and the real passphrase.',
        ].join('\n')
      );
      process.exit(1);
    }
    const { digest, files: sourceCount, sources } = sourceDigest();
    if (digest === recorded.sourceDigest) {
      console.log('The record already matches these inputs. Nothing to do.');
      return;
    }
    writeFileSync(
      MANIFEST_FILE,
      JSON.stringify(
        {
          ...recorded,
          sourceFiles: sourceCount,
          sourceDigest: digest,
          sources,
        },
        null,
        2
      ) + '\n'
    );
    console.log(
      [
        `Re-stated ${rel(MANIFEST_FILE)} for ${sourceCount} inputs.`,
        `  content digest unchanged: ${contentDigest.slice(0, 12)}`,
        `  source digest  ${recorded.sourceDigest.slice(0, 12)} -> ${digest.slice(0, 12)}`,
        '',
        `${rel(OUT_FILE)} was not touched: the ${rendered.length} documents it`,
        'holds are the documents these sources render, which is what the',
        'content digest above establishes.',
      ].join('\n')
    );
    return;
  }

  // The other question, and the one a pull request should be asked.
  //
  // `--check` compares the tree against the production ciphertext, which only
  // the real passphrase can produce. On a long-lived integration branch with a
  // dozen parallel lesson branches that is the wrong question: every one of
  // them edits instructional content, every one of them therefore goes red,
  // and the only way to green is for one person to rebuild an encrypted file
  // that then conflicts with every other branch doing the same. Three of the
  // open v1.1 pull requests were red on exactly this and on nothing else.
  //
  // What a pull request needs established is that the pipeline still works:
  // that the content matches its schema, that every derived answer still agrees
  // with the site's own grading function, and that all fifty-four documents
  // render. That is this mode. It builds everything, with a throwaway key, and
  // writes nothing at all - so it can run on any branch, in any fork, with no
  // secret and no encrypted file to conflict over.
  //
  // It is not a substitute for `--check`, and nothing here lets it become one:
  // the release path runs both, and tests/releaseGate.test.js fails if the two
  // ever collapse into one.
  const validate = argv.includes('--validate');

  requireCanonicalContent();

  // CI cannot be handed the real passphrase, so it asks for a build it is not
  // allowed to publish. Everything else about the run is identical.
  // A fixture is the same inventory with placeholder pages, encrypted with a
  // published test passphrase, written somewhere else. It exists so the portal
  // can be driven end to end without the production secret, and it is built by
  // this tool rather than by a second one so its ids and names cannot drift
  // from the ones the portal looks up.
  const fixtureAt = argv.indexOf('--fixture');
  const isFixture = fixtureAt >= 0;
  const fixtureOut =
    isFixture && argv[fixtureAt + 1] && !argv[fixtureAt + 1].startsWith('--')
      ? resolve(argv[fixtureAt + 1])
      : FIXTURE_DEFAULT;
  if (isFixture && resolve(fixtureOut) === resolve(OUT_FILE)) {
    console.error(
      '\n  --fixture refuses to write the production bundle.\n' +
        `  ${OUT_FILE} is the published artifact; a fixture is a placeholder\n` +
        '  set encrypted with a passphrase that is printed in the source.\n'
    );
    process.exit(1);
  }

  const unpublishable = validate || argv.includes('--unpublishable');
  const secret = isFixture ? FIXTURE_PASSPHRASE : passphrase(unpublishable);
  const usedThrowaway = unpublishable && !hasRealSecret();
  const version = versionStamp();
  const keepPlain = argv.includes('--keep-plaintext');

  if (validate) {
    console.log(
      [
        '',
        '  VALIDATION BUILD',
        '  Every document is rendered and every answer key re-checked against',
        '  the grading function, with a throwaway key and no file written.',
        '  Nothing here says whether the committed bundle is current; that is',
        '  `--check`, and it is a release question.',
        '',
      ].join('\n')
    );
  } else if (usedThrowaway) {
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

  const files = renderDocuments(version, { stub: isFixture });

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

  if (validate) {
    const total = files.reduce((t, f) => t + f.size, 0);
    console.log(
      `Rendered ${files.length} documents (${Math.round(total / 1024)} KB of ` +
        'PDF) and encrypted them. Nothing was written.'
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
    const { digest, files: sourceCount, sources } = sourceDigest();
    writeFileSync(
      MANIFEST_FILE,
      JSON.stringify(
        {
          version,
          generated: manifest.generated,
          documents: files.length,
          sourceFiles: sourceCount,
          sourceDigest: digest,
          // Every input by name, with its own hash. The digest above is what
          // the check compares; this is what lets it say which file moved, and
          // what makes the covered set reviewable in a diff rather than only by
          // reading tools/source-closure.mjs.
          sources,
          // A hash of the rendered set, for anyone holding the passphrase who
          // wants to confirm the ciphertext matches this record. Not a
          // freshness signal: it moves with the month, which is why the check
          // above reads sourceDigest instead.
          contentDigest: contentDigestOf(files),
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

// Run only when this file is the program, so a test or the digest audit can
// import it without setting a build going. The same guard tools/docs-facts.mjs
// uses.
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
