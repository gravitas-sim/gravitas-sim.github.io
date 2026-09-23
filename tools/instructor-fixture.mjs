#!/usr/bin/env node
// =============================================================================
// Is the disposable instructor fixture the one these sources would build?
// -----------------------------------------------------------------------------
// e2e/instructorPortal.spec.js drives the signed-in portal against a fixture:
// the real inventory of instructor documents, each replaced by a placeholder
// page and encrypted with a passphrase printed in the source, written by
// `build-instructor-materials.js --fixture` to the gitignored
// .instructor-fixture/. It is disposable by design and never published.
//
// It was built "on demand the first time a worker needs it", which in practice
// meant the first time on a given checkout, ever. The spec rebuilt it only if
// the file did not exist, so a fixture built before a lesson was added went on
// being served after it: the portal under test showed an inventory the sources
// no longer describe, and a check written against the new lesson either failed
// for a reason that had nothing to do with the portal or - worse - passed
// against documents that were not there. CI never saw it, because CI starts
// from an empty checkout. A working copy did: one on this machine was holding
// a fixture from before two of the current lessons existed.
//
// So the fixture carries a stamp, written beside it in the clear:
//
//   sourceDigest   The digest tools/instructor-freshness.mjs computes over the
//                  builder's complete static import graph - every template,
//                  schema, lesson, catalog string and generator that decides
//                  what the documents say, including the builder itself, the
//                  placeholder renderer and the fixture passphrase. The same
//                  closure the release gate trusts for the real bundle, and the
//                  one tests/instructorDigest.test.js proves complete against
//                  what Node actually loads during a --fixture build.
//   stamper        A hash of this file, so a change to the rules below retires
//                  every stamp written under the old ones.
//   fixtureSha256  A hash of the fixture's own bytes, so a truncated or edited
//                  file is not mistaken for the one the stamp describes.
//
// Any of them missing, unreadable or different means the fixture is rebuilt,
// with the published fixture passphrase, before anything reads it. There is no
// state in which an old fixture is used: a stamp that cannot be read is a
// rebuild, not a pass.
//
// What this is not
// -----------------------------------------------------------------------------
// It is not the release question and it cannot become one. `instructors:check`
// compares the tracked, really-encrypted instructors/materials.enc.json against
// its own manifest, has no local cache to go stale, and is untouched here;
// verify-release.mjs still refuses a throwaway bundle. Nothing in this file can
// write to instructors/, and the builder refuses a --fixture path that is the
// production bundle.
//
// Deliberately not imported by the builder: anything the builder imports joins
// the production digest's closure, and a stamping rule is not something the
// real bundle's freshness should depend on.
//
//   node tools/instructor-fixture.mjs            report; exit 1 unless fresh
//   node tools/instructor-fixture.mjs --ensure   rebuild if it is not fresh
// =============================================================================

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describeDrift, sourceDigestFor } from './instructor-freshness.mjs';

const HERE = fileURLToPath(import.meta.url);
const REPO = path.resolve(path.dirname(HERE), '..');

/** Where the portal spec reads the fixture from. Gitignored. */
export const FIXTURE_PATH = path.join(
  REPO,
  '.instructor-fixture',
  'materials.enc.json'
);

/** Where the real bundle lives. No fixture is ever written inside it. */
const PUBLISHED = path.join(REPO, 'instructors');

/** The builder, which is the only thing that writes a fixture's bytes. */
const BUILDER = path.join(REPO, 'tools', 'build-instructor-materials.js');

/** Fields every bundle the builder encrypts carries, fixture or not. */
const PAYLOAD_FIELDS = ['v', 'cipher', 'kdf', 'salt', 'iv', 'data'];

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

/**
 * Where a fixture's stamp lives: beside it, named after it.
 *
 * @param {string} fixture - Fixture path
 * @returns {string} Stamp path
 */
export const stampPathFor = fixture =>
  fixture.replace(/\.json$/, '') + '.stamp.json';

/**
 * What a fixture built from this tree now would be stamped with.
 *
 * Everything in it is deterministic: the same tree gives the same record,
 * whichever directory it is run from and however often.
 *
 * @param {string} [root] - Repository root
 * @returns {{sourceDigest: string, sourceFiles: number,
 *   sources: Record<string, string>, stamper: string}} The expected record
 */
export function expectedStamp(root = REPO) {
  const { digest, files, sources } = sourceDigestFor(root);
  return {
    sourceDigest: digest,
    sourceFiles: files,
    sources,
    stamper: sha256(readFileSync(HERE)),
  };
}

/**
 * Whether a file's text is shaped like an encrypted bundle at all.
 *
 * @param {string} text - File contents
 * @returns {string|null} What is wrong, or null
 */
function payloadProblem(text) {
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    return 'it is not JSON (an interrupted write leaves exactly this)';
  }
  if (!payload || typeof payload !== 'object') return 'it is not an object';
  const absent = PAYLOAD_FIELDS.filter(k => !(k in payload));
  if (absent.length) return `it has no ${absent.join(', ')}`;
  return null;
}

/**
 * The state of a fixture, and why.
 *
 * @param {object} [options] - What to judge
 * @param {string} [options.root] - Repository root whose sources it must match
 * @param {string} [options.fixture] - Fixture path
 * @returns {{state: 'fresh'|'missing'|'unstamped'|'corrupt'|'stale',
 *   reasons: string[], bytes?: string}} The verdict; `bytes` is the fixture
 *   text when it is fresh, so the caller serves exactly what was judged
 */
export function fixtureState({ root = REPO, fixture = FIXTURE_PATH } = {}) {
  if (!existsSync(fixture)) {
    return { state: 'missing', reasons: [`${fixture} does not exist`] };
  }
  const stampPath = stampPathFor(fixture);
  if (!existsSync(stampPath)) {
    return {
      state: 'unstamped',
      reasons: [
        `${stampPath} does not exist, so nothing records what the fixture ` +
          'was built from (a fixture from before stamping, or one written by ' +
          'running the builder directly)',
      ],
    };
  }

  let stamp;
  try {
    stamp = JSON.parse(readFileSync(stampPath, 'utf8'));
  } catch {
    return { state: 'corrupt', reasons: [`${stampPath} is not JSON`] };
  }
  const fields = ['sourceDigest', 'stamper', 'fixtureSha256'];
  if (
    !stamp ||
    typeof stamp !== 'object' ||
    fields.some(k => typeof stamp[k] !== 'string')
  ) {
    return {
      state: 'corrupt',
      reasons: [`${stampPath} does not carry ${fields.join(', ')}`],
    };
  }

  const bytes = readFileSync(fixture, 'utf8');
  if (sha256(bytes) !== stamp.fixtureSha256) {
    return {
      state: 'corrupt',
      reasons: [
        'the fixture is not the file its stamp describes (truncated, edited, ' +
          'or replaced after it was stamped)',
      ],
    };
  }
  const shape = payloadProblem(bytes);
  if (shape) {
    return {
      state: 'corrupt',
      reasons: [`the fixture is unreadable: ${shape}`],
    };
  }

  const expected = expectedStamp(root);
  const reasons = [];
  if (stamp.stamper !== expected.stamper) {
    reasons.push('the stamping rules in tools/instructor-fixture.mjs changed');
  }
  if (stamp.sourceDigest !== expected.sourceDigest) {
    const drift = describeDrift(stamp.sources, expected.sources);
    reasons.push(
      'the instructor sources changed since it was built' +
        (drift.length ? `:\n${drift.join('\n')}` : '')
    );
  }
  if (reasons.length) return { state: 'stale', reasons };
  return { state: 'fresh', reasons: [], bytes };
}

/**
 * Write a file by writing a sibling and renaming it over, so a reader sees
 * the old file or the new one and never half of either.
 *
 * @param {string} file - Destination
 * @param {string} text - Contents
 */
function writeAtomically(file, text) {
  const temp = `${file}.${process.pid}.tmp`;
  writeFileSync(temp, text);
  renameSync(temp, file);
}

/**
 * The fixture, rebuilt first unless it is fresh.
 *
 * Parallel Playwright workers may each find it missing and each rebuild; every
 * write is atomic, so each of them serves a complete fixture it built or
 * verified. If their renames interleave, the stamp left behind describes the
 * other worker's bytes, and the next run reads that as corrupt and rebuilds -
 * the race can cost a rebuild, never a stale pass.
 *
 * Always judged against, and built from, this repository: the builder renders
 * from its own tree, so a stamp computed against any other would describe
 * sources the fixture was not built from.
 *
 * @param {object} [options] - What to ensure
 * @param {string} [options.fixture] - Fixture path
 * @returns {{state: string, reasons: string[], rebuilt: boolean,
 *   bytes: string}} What was found, whether it was rebuilt, and the fixture
 */
export function ensureFixture({ fixture = FIXTURE_PATH } = {}) {
  // The builder refuses a --fixture path that IS the production bundle, but it
  // is handed a temporary sibling here, and the rename afterwards is this
  // file's own. So the boundary is enforced here too, for the whole directory.
  const target = path.resolve(fixture);
  if (target === PUBLISHED || target.startsWith(PUBLISHED + path.sep)) {
    throw new Error(
      `Refusing to write a fixture into ${path.relative(REPO, PUBLISHED)}/: ` +
        'that directory holds the published, really-encrypted bundle and its ' +
        'manifest, and a fixture is a placeholder set with a public passphrase.'
    );
  }
  const found = fixtureState({ fixture });
  if (found.state === 'fresh') {
    return { ...found, rebuilt: false, bytes: found.bytes };
  }

  mkdirSync(path.dirname(fixture), { recursive: true });
  const built = `${fixture}.${process.pid}.build.json`;
  try {
    execFileSync(process.execPath, [BUILDER, '--fixture', built], {
      cwd: REPO,
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    const bytes = readFileSync(built, 'utf8');
    const shape = payloadProblem(bytes);
    if (shape) throw new Error(`The builder wrote a fixture that ${shape}.`);
    const stamp = {
      note:
        'Freshness record for the disposable instructor fixture beside it. ' +
        'Written by tools/instructor-fixture.mjs; not a secret, not tracked.',
      ...expectedStamp(),
      fixtureSha256: sha256(bytes),
    };
    renameSync(built, fixture);
    writeAtomically(
      stampPathFor(fixture),
      JSON.stringify(stamp, null, 2) + '\n'
    );
    return { ...found, rebuilt: true, bytes };
  } finally {
    rmSync(built, { force: true });
  }
}

async function main() {
  const ensure = process.argv.includes('--ensure');
  const rel = p => path.relative(REPO, p) || '.';
  if (!ensure) {
    const { state, reasons } = fixtureState();
    console.log(`${rel(FIXTURE_PATH)}: ${state}`);
    for (const r of reasons) console.log(`  ${r}`);
    return state === 'fresh' ? 0 : 1;
  }
  const { state, reasons, rebuilt } = ensureFixture();
  if (!rebuilt) {
    console.log(`${rel(FIXTURE_PATH)}: fresh, not rebuilt`);
    return 0;
  }
  console.log(`${rel(FIXTURE_PATH)}: was ${state}, rebuilt`);
  for (const r of reasons) console.log(`  ${r}`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === HERE) {
  main().then(code => process.exit(code));
}
