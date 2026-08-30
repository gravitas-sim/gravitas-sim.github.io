#!/usr/bin/env node
// =============================================================================
// Build the instructor materials, and encrypt them.
// -----------------------------------------------------------------------------
// Gravitas is served from GitHub Pages. There is no server, no request handler
// and nowhere to check a password: anything committed to the repository is
// readable by anyone who asks for the URL. A JavaScript password check on a
// static site is theatre, and answer keys sitting in a public folder behind one
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
// =============================================================================

import { webcrypto as crypto } from 'node:crypto';
import { TextEncoder } from 'node:util';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { INVESTIGATIONS } from '../js/data/investigations.js';
import { verifyKey } from '../js/answerKey.js';
import {
  instructorGuide,
  answerKeyDocument,
  adoptersGuide,
  curriculumMap,
} from '../js/instructorDocs.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'instructors');
const OUT_FILE = join(OUT_DIR, 'materials.enc.json');
const PLAIN_DIR = join(ROOT, '.instructor-build');

/** PBKDF2 work factor. OWASP's floor for SHA-256; about a second on a phone. */
const ITERATIONS = 600000;

const b64 = bytes => Buffer.from(bytes).toString('base64');

/** A stable version stamp: the month, which is what a document footer wants. */
function versionStamp() {
  const d = new Date();
  return `${d.toLocaleString('en-US', { month: 'long' })} ${d.getFullYear()}`;
}

/** The shared passphrase, from the environment or a gitignored file. */
function passphrase() {
  const fromEnv = process.env.GRAVITAS_INSTRUCTOR_PASSWORD;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();
  const file = join(ROOT, '.instructor-password');
  if (existsSync(file)) {
    const value = readFileSync(file, 'utf8').trim();
    if (value) return value;
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
const slug = title =>
  title
    .replace(/[’']/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

async function main() {
  const secret = passphrase();
  const version = versionStamp();
  const keepPlain = process.argv.includes('--keep-plaintext');

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
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(payload));

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
