// =============================================================================
// `sdk review`: the mechanical half of a contributed package's review
// -----------------------------------------------------------------------------
// CONTRIBUTING_CONTENT.md lists what a maintainer checks before a package is
// listed in the catalog. Some of that can be decided by a program, and a
// program decides it the same way for every package and for every reviewer.
// This is that part. It runs six checks and prints the rest as a list a person
// has to answer:
//
//   validate     the SDK's own validation, with no errors
//   tests        `sdk test`: the package runs against the public API
//   licenses     every license is one the catalog accepts, every declared file
//                is covered, and authored text is CC-BY-4.0
//   provenance   a data pack cites its sources; any other package says, in its
//                README, who wrote it and where its material came from
//   locales      English and Spanish both, or one language declared and said
//   content      nothing that is not teaching content: no personal data, no
//                secret, no script, and an archive the catalog can install
//
// It decides nothing a person should: whether a claim is true, whether the
// Spanish reads well, whether the package is accessible, or whether the
// reviewer has a conflict of interest. Those are the `human` items.
//
// ACCEPTED_LICENSES lives here and tools/catalog.mjs re-exports it, so the
// catalog and this review can never disagree about a license.
// =============================================================================

import { LOCALES } from './api.mjs';
import { LIMITS } from '../../js/catalog/archive.js';
import { pack } from './archive.mjs';
import {
  extensionType,
  packFiles,
  testExtension,
  validateExtension,
} from './extension.mjs';

/**
 * The licenses a package may carry, and why each is acceptable: a reader must
 * be able to use, share and adapt what they install in a class. Anything else
 * is refused until CATALOG.md says why it belongs.
 */
export const ACCEPTED_LICENSES = Object.freeze([
  {
    match: /^CC-BY-4\.0$/,
    why: "the license of Gravitas's own teaching material",
  },
  { match: /^CC0-1\.0$/, why: 'no conditions at all' },
  { match: /^MIT$/, why: 'the license of Gravitas itself' },
  {
    match: /^public domain \(NASA mission data\)/,
    why: 'NASA mission data carry no copyright; the archive asks for acknowledgment',
  },
]);

export const isAcceptedLicense = license =>
  ACCEPTED_LICENSES.some(l => l.match.test(license));

/** The mechanical checks, in the order they run and are recorded. */
export const REVIEW_CHECKS = Object.freeze([
  'validate',
  'tests',
  'licenses',
  'provenance',
  'locales',
  'content',
]);

const TITLES = {
  validate: 'validates, with no errors',
  tests: 'tests pass',
  licenses: 'licenses are accepted and cover every file',
  provenance: 'provenance is complete',
  locales: 'both languages, or one declared',
  content: 'nothing that is not teaching content',
};

/**
 * What a person must answer, because no program can. `types` limits an item to
 * the package types it applies to.
 */
export const HUMAN_ITEMS = Object.freeze([
  {
    id: 'claims',
    text: "Scientific claims are checked against the model page (/model/) and the package's own cited sources; nothing is stated that Gravitas's model does not support.",
  },
  {
    id: 'rights',
    text: 'The author holds the rights to everything in the package, or each third-party item is covered by the license it lists.',
  },
  {
    id: 'personal',
    text: 'No student, class, school or other person is identifiable beyond the author attribution the author chose to state.',
  },
  {
    id: 'accessibility',
    text: 'Accessibility notes: no meaning carried by color alone, every figure or table described in words, plain language at the stated level.',
    types: ['course-pack', 'investigation-pack', 'scenario-pack', 'capability'],
  },
  {
    id: 'spanish',
    text: 'The Spanish was read by someone who reads Spanish, or the package declares one language and the reviewer accepts that.',
  },
  {
    id: 'interest',
    text: 'Conflict of interest: the reviewer is neither the author nor affiliated with the author, or says so on the pull request and a second maintainer accepts it.',
  },
  {
    id: 'attribution',
    text: "The attribution to be listed (name or organization, in the author's words) is the author's own, and the author agrees to it being archived with the package.",
  },
  {
    id: 'versioning',
    text: 'A changed package has a new version, a change that breaks what names it has a new major version, and its migration note says so.',
  },
]);

/** The words the README must contain, for a package a contributor brings. */
const README_AUTHOR = /\bauthor\b/i;
const README_SOURCES = /\bsources?\b/i;

// --- Forbidden content ---------------------------------------------------------

const EMAIL =
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/;
const PHONE = [
  /(?<![\d.])\(?\d{3}\)?[-. ]\d{3}[-. ]\d{4}(?![\d.])/,
  /(?<![\w.])\+\d{1,3}[ .-]?\(?\d{1,4}\)?[ .-]?\d{3,4}[ .-]?\d{3,4}(?![\d.])/,
];
const NATIONAL_ID = /(?<![\d.-])\d{3}-\d{2}-\d{4}(?![\d.-])/;
const SECRETS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
  /\b(?:api[_-]?key|secret|passw(?:or)?d|token)\s*[:=]\s*['"]?[A-Za-z0-9/+_-]{8,}/i,
];
const ACTIVE = [
  /<\s*(?:script|iframe|object|embed)\b/i,
  /\bjavascript\s*:/i,
  /\bdata\s*:\s*text\/html/i,
  /\bon[a-z]{3,}\s*=\s*["']/i,
];
/** Files that are code, whatever the manifest says they are. */
const CODE_FILE = /\.(?:m?js|cjs|html?|sh|bash|exe|dll|jar|py|php|wasm)$/i;

/** The string values of a JSON document, with where each one is. */
function* stringsOf(value, at = '') {
  if (typeof value === 'string') yield [at || '(value)', value];
  else if (Array.isArray(value))
    for (const [i, v] of value.entries()) yield* stringsOf(v, `${at}[${i}]`);
  else if (value && typeof value === 'object')
    for (const [k, v] of Object.entries(value))
      yield* stringsOf(v, at ? `${at}.${k}` : k);
}

/** Text a file holds, and where each piece is, for a file that is text. */
function textPieces(name, bytes) {
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
  if (!name.endsWith('.json')) return [[name, text]];
  try {
    return [...stringsOf(JSON.parse(text))].map(([at, s]) => [
      `${name} ${at}`,
      s,
    ]);
  } catch {
    return [[name, text]];
  }
}

/**
 * Everything wrong with what a package ships, as messages. Personal data and
 * secrets are looked for in every string, never in a number.
 * @param {Map<string, Buffer>} files - What the archive would hold
 * @returns {string[]}
 */
export function scanContent(files) {
  const problems = [];
  for (const [name, bytes] of files) {
    if (CODE_FILE.test(name))
      problems.push(
        `${name}: a ${name.split('.').pop()} file is code, and a declarative package carries none`
      );
    const pieces = textPieces(name, bytes);
    if (!pieces) continue;
    for (const [where, s] of pieces) {
      const found = [];
      if (EMAIL.test(s)) found.push('an email address');
      if (PHONE.some(re => re.test(s))) found.push('a phone number');
      if (NATIONAL_ID.test(s)) found.push('a national identifier');
      if (SECRETS.some(re => re.test(s))) found.push('a secret or key');
      if (ACTIVE.some(re => re.test(s))) found.push('script or active markup');
      for (const what of found) problems.push(`${where}: contains ${what}`);
    }
  }
  return problems;
}

// --- The checks ----------------------------------------------------------------

function jsonOf(ext, file) {
  try {
    return JSON.parse(ext.files.get(file).toString('utf8'));
  } catch {
    return null;
  }
}

/** The file that carries a package's text, for the types that have one. */
function contentFile(type, m) {
  const p = m.provides || {};
  if (type === 'course-pack') return p.courses?.[0]?.file;
  if (type === 'investigation-pack') return p.investigations?.[0]?.file;
  if (type === 'scenario-pack') return p.scenarios?.[0]?.file;
  return null;
}

/**
 * Review one extension.
 * @param {{files: Map, source: string}} ext - From loadExtension()
 * @param {object} [options]
 * @param {boolean} [options.readme=true] - Require the README's author and
 *   sources lines. The catalog turns it off for packages the maintainers built
 *   themselves, whose provenance is in the pack's own record and the pull
 *   request; a contributed package always carries it.
 * @returns {Promise<{manifest: object|null, id: string|null, version: string|null, type: string|null,
 *   checks: Array, human: Array, passed: boolean, mechanical: string[]}>}
 */
export async function reviewExtension(ext, { readme = true } = {}) {
  const validation = await validateExtension(ext);
  const { manifest: m, type, findings } = validation;
  const errors = findings.filter(f => f.severity === 'error');
  const warnings = findings.filter(f => f.severity === 'warning');
  const checks = [];
  const add = (id, problems, note = '') =>
    checks.push({
      id,
      title: TITLES[id],
      status: problems.length ? 'fail' : 'pass',
      problems,
      note,
    });

  add(
    'validate',
    errors.map(f => `${f.file}: ${f.path ? `${f.path}: ` : ''}${f.message}`),
    `${errors.length} errors, ${warnings.length} warnings`
  );

  if (errors.length || !m || !type) {
    const skip = id =>
      checks.push({
        id,
        title: TITLES[id],
        status: 'fail',
        problems: ['not run, because the package does not validate'],
        note: '',
      });
    for (const id of REVIEW_CHECKS.slice(1)) skip(id);
    return finish({ m, type, checks });
  }

  // tests
  const t = await testExtension(ext, validation);
  add(
    'tests',
    t.failed,
    `${t.passed.length} passed, ${t.failed.length} failed`
  );

  // licenses
  const licenseProblems = [];
  for (const l of m.licenses || []) {
    if (!isAcceptedLicense(l.license))
      licenseProblems.push(
        `${l.scope}: "${l.license}" is not a license the catalog accepts`
      );
    else if (
      type !== 'data-pack' &&
      type !== 'capability' &&
      l.license !== 'CC-BY-4.0'
    )
      licenseProblems.push(
        `${l.scope}: authored text is CC-BY-4.0, not ${l.license}`
      );
  }
  const covering = scope => {
    const re = new RegExp(
      `^${scope
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*\*/g, '\0')
        .replace(/\*/g, '[^/]*')
        .replace(/\0/g, '.*')}$`
    );
    return file => re.test(file);
  };
  const inventory = [];
  for (const a of m.assets || []) {
    const hit = (m.licenses || []).find(l => covering(l.scope)(a.path));
    inventory.push(`${a.path}: ${hit ? hit.license : 'no license'}`);
    if (!hit) licenseProblems.push(`${a.path}: no license covers this file`);
  }
  add('licenses', licenseProblems, inventory.join('; '));

  // provenance
  const provenance = [];
  if (type === 'data-pack') {
    if (!(m.citations || []).length)
      provenance.push('a data pack cites the source of its data');
  } else if (type !== 'capability' && readme) {
    const text = ext.files.get('README.md')?.toString('utf8') || '';
    if (!text.trim())
      provenance.push(
        'README.md is missing: it says who wrote the package and where its material came from'
      );
    else {
      if (!README_AUTHOR.test(text))
        provenance.push('README.md does not say who the author is');
      if (!README_SOURCES.test(text))
        provenance.push(
          'README.md does not say what the package is based on (a "Sources" line, even if it is "original work")'
        );
    }
  }
  add('provenance', provenance, `${(m.citations || []).length} citations`);

  // locales
  const localeProblems = [];
  const file = contentFile(type, m);
  const content = file ? jsonOf(ext, file) : null;
  const titleLocales = Object.keys(m.title || {});
  const declared = Array.isArray(content?.locales)
    ? content.locales
    : titleLocales;
  const both = LOCALES.every(l => declared.includes(l));
  if (both) {
    for (const l of LOCALES)
      if (!(typeof m.title?.[l] === 'string' && m.title[l].trim()))
        localeProblems.push(
          `title.${l} is missing, and the package declares ${declared.join(' and ')}`
        );
  } else if (!declared.length || !declared.every(l => LOCALES.includes(l)))
    localeProblems.push('no language is declared');
  add(
    'locales',
    localeProblems,
    both
      ? `${declared.join(' and ')}`
      : `one language declared: ${declared.join(', ')}`
  );

  // content
  const files = packFiles(ext, m);
  const contentProblems = scanContent(files);
  let archive;
  try {
    archive = pack(files);
  } catch (err) {
    contentProblems.push(`it cannot be packed: ${err.message}`);
  }
  if (archive && archive.length > LIMITS.archiveBytes)
    contentProblems.push(
      `the archive is ${archive.length} bytes; the catalog installs up to ${LIMITS.archiveBytes}`
    );
  if (files.size > LIMITS.entries)
    contentProblems.push(
      `${files.size} files; the catalog installs up to ${LIMITS.entries}`
    );
  add('content', contentProblems, `${files.size} files`);

  return finish({ m, type, checks });
}

function finish({ m, type, checks }) {
  const human = HUMAN_ITEMS.filter(
    h => !h.types || (type && h.types.includes(type))
  );
  return {
    manifest: m ?? null,
    id: m?.id ?? null,
    version: m?.version ?? null,
    type: type ?? (m ? extensionType(m) : null),
    checks,
    human,
    passed: checks.every(c => c.status === 'pass'),
    mechanical: checks.filter(c => c.status === 'pass').map(c => c.id),
  };
}

/** A review as the lines `sdk review` prints. */
export function formatReview(review, source = '') {
  const lines = [
    `review: ${review.id ?? source} ${review.version ?? ''}  ${review.type ?? 'unknown type'}`.trimEnd(),
  ];
  for (const c of review.checks) {
    lines.push(
      `  ${c.status === 'pass' ? 'PASS' : 'FAIL'}  ${c.id.padEnd(10)} ${c.title}${c.note ? `  (${c.note})` : ''}`
    );
    for (const p of c.problems) lines.push(`          - ${p}`);
  }
  lines.push('', 'A person must answer:');
  for (const h of review.human) lines.push(`  [ ] ${h.text}`);
  lines.push(
    '',
    review.passed
      ? `${review.checks.length}/${review.checks.length} mechanical checks passed. The items above are the maintainer's.`
      : `${review.checks.filter(c => c.status === 'fail').length} of ${review.checks.length} mechanical checks failed.`
  );
  return lines.join('\n');
}
