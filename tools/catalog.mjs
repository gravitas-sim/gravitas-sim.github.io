#!/usr/bin/env node
// =============================================================================
// The curated catalog: generated at release time, checked on every change
// -----------------------------------------------------------------------------
//   node tools/catalog.mjs generate   rewrite catalog/catalog.json and pack the
//                                     accepted extensions into catalog/packages/
//   node tools/catalog.mjs check      fail on anything the catalog says that is
//                                     not true of the repository
//   node tools/catalog.mjs provenance rebuild each data pack from its pinned raw
//                                     file (GRAVITAS_PACKS_CACHE) and compare
//
// What a reader browses at /catalog/ (CATALOG.md). Two kinds of entry:
//
//   built-in   a capability package in capabilities/, compiled into Gravitas:
//              listed so a reader can see what is there, what it costs to load
//              and whom to credit. Nothing to download separately.
//   archive    a declarative extension a maintainer accepted into
//              catalog/curation.json: its .gxp archive, packed by the SDK from
//              extensions/<name>/, served from this origin, checksummed, and
//              installed by the page for offline use. Never code: the SDK's
//              declarative walk refuses anything that could execute, and this
//              refuses anything that is not a data pack or a course pack.
//
// `check` holds, for every entry:
//   - the committed archive is the one the catalog names (bytes and SHA-256),
//     and holds exactly the files `sdk pack` takes from the extension today;
//   - the extension still validates and its tests pass (sdk validate, test);
//   - every license is one CATALOG.md accepts, and LICENSES.md covers the
//     extension's directory; a data pack cites its sources;
//   - the platform range accepts this Gravitas, and no public id collides;
//   - catalog/catalog.json is exactly what `generate` writes.
//
// The archives are compared by content, not by gzip bytes: zlib's output is
// not promised to be the same across its versions, and CI runs another Node.
// Deterministic: no clock, entries sorted by id, so a regeneration diffs clean.
// =============================================================================

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { PLATFORM_API } from '../js/platform/manifest.js';
import { satisfies } from '../js/platform/semver.js';
import { readPackages } from './capabilities.mjs';
import { LOCALES, publicIds } from '../sdk/lib/api.mjs';
import { pack, read } from '../sdk/lib/archive.mjs';
import {
  loadExtension,
  packFiles,
  testExtension,
  validateExtension,
} from '../sdk/lib/extension.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CATALOG_DIR = path.join(REPO, 'catalog');
export const CATALOG_FILE = path.join(CATALOG_DIR, 'catalog.json');
export const CURATION_FILE = path.join(CATALOG_DIR, 'curation.json');
export const FORMAT = 'gravitas.catalog';
export const FORMAT_VERSION = 1;

/**
 * The licenses an entry may carry, and why each is acceptable: a reader must be
 * able to use, share and adapt what they install in a class. Anything else is
 * refused until CATALOG.md says why it belongs.
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

const sha256 = b => createHash('sha256').update(b).digest('hex');
const json = v => `${JSON.stringify(v, null, 2)}\n`;
const accepted = license => ACCEPTED_LICENSES.some(l => l.match.test(license));

export function readCuration(file = CURATION_FILE) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

/** What a built-in package costs to load: its assets, by offline class. */
function assetBytes(manifest) {
  let bytes = 0;
  for (const a of manifest.assets || []) {
    const p = path.join(REPO, a.path);
    if (a.role !== 'provenance' && existsSync(p))
      bytes += readFileSync(p).length;
  }
  return bytes;
}

function builtInEntry({ manifest: m }) {
  return {
    id: m.id,
    version: m.version,
    kind: m.kind,
    delivery: 'built-in',
    title: m.title,
    gravitas: m.gravitas,
    provides: m.provides,
    licenses: m.licenses,
    citations: m.citations || [],
    offline: m.offline?.policy ?? 'none',
    bytes: assetBytes(m),
  };
}

/**
 * An accepted extension as a catalog entry and its archive. Throws with every
 * reason when the extension is not fit to publish.
 */
export async function archiveEntry(item) {
  const dir = path.join(REPO, item.path);
  const ext = loadExtension(dir);
  const { type, manifest: m, findings } = await validateExtension(ext);
  const errors = findings.filter(f => f.severity === 'error');
  const problems = errors.map(f => `${item.path}: ${f.message}`);
  if (m && !['data-pack', 'course-pack'].includes(type))
    problems.push(
      `${item.path}: a ${type} runs code; the catalog serves only declarative packs`
    );
  if (!problems.length) {
    const { failed } = await testExtension(ext, { type, manifest: m });
    for (const f of failed) problems.push(`${item.path}: test: ${f}`);
  }
  for (const l of m?.licenses || []) {
    if (!accepted(l.license))
      problems.push(
        `${item.path}: license "${l.license}" is not one CATALOG.md accepts`
      );
  }
  if (type === 'data-pack' && !(m.citations || []).length)
    problems.push(`${item.path}: a data pack cites its sources`);
  if (m && !satisfies(PLATFORM_API, m.gravitas))
    problems.push(
      `${item.path}: needs Gravitas ${m.gravitas}; this is ${PLATFORM_API}`
    );
  if (problems.length) throw new Error(problems.join('\n'));

  const files = packFiles(ext, m);
  const archive = pack(files);
  const name = `${m.id}-${m.version}.gxp`;
  const summary =
    type === 'course-pack'
      ? JSON.parse(files.get(m.provides.courses[0].file)).summary
      : null;
  const record =
    type === 'data-pack'
      ? JSON.parse(files.get(m.provides.dataPacks[0].provenance))
      : null;
  return {
    archive,
    entry: {
      id: m.id,
      version: m.version,
      kind: m.kind,
      type,
      delivery: 'archive',
      title: m.title,
      ...(summary ? { summary } : {}),
      gravitas: m.gravitas,
      provides: m.provides,
      licenses: m.licenses,
      citations: m.citations || [],
      ...(record
        ? {
            object: record.object?.name ?? null,
            facility: record.facility?.observatory ?? null,
          }
        : {}),
      offline: m.offline?.policy ?? 'none',
      archiveFile: `packages/${name}`,
      bytes: archive.length,
      sha256: sha256(archive),
      // In the archive's own order: the manifest, then by path (./archive.mjs).
      files: [...files.entries()]
        .sort(([a], [b]) =>
          a === 'gravitas-extension.json'
            ? -1
            : b === 'gravitas-extension.json'
              ? 1
              : a < b
                ? -1
                : 1
        )
        .map(([p, b]) => ({ path: p, bytes: b.length, sha256: sha256(b) })),
      unpackedBytes: [...files.values()].reduce((a, b) => a + b.length, 0),
      review: item.review,
      source: item.path,
      history: item.history || [],
    },
  };
}

/** The whole catalog, and the archives it names, without writing either. */
export async function buildCatalog(curation = readCuration()) {
  const entries = readPackages().map(builtInEntry);
  const archives = new Map();
  for (const item of curation.extensions) {
    const { entry, archive } = await archiveEntry(item);
    entries.push(entry);
    archives.set(entry.archiveFile, archive);
  }
  const seen = new Set();
  for (const e of entries) {
    if (seen.has(e.id)) throw new Error(`${e.id} is in the catalog twice`);
    seen.add(e.id);
  }
  entries.sort((a, b) => a.id.localeCompare(b.id));
  // The lessons a course may name, with their titles: the page validates an
  // installed course and shows it without loading the lesson manifest.
  const ids = await publicIds();
  const lessons = Object.fromEntries(
    [...ids.lessonTitles.entries()]
      .filter(([id]) => ids.lessons.has(id))
      .sort(([a], [b]) => a.localeCompare(b))
  );
  const catalog = {
    format: FORMAT,
    formatVersion: FORMAT_VERSION,
    catalogVersion: curation.catalogVersion,
    platform: PLATFORM_API,
    locales: [...LOCALES],
    lessons,
    entries,
  };
  return { catalog, text: json(catalog), archives };
}

/** Everything `check` finds wrong, as messages. */
export async function checkCatalog() {
  const problems = [];
  let built;
  try {
    built = await buildCatalog();
  } catch (err) {
    return [err.message];
  }
  const committed = existsSync(CATALOG_FILE)
    ? readFileSync(CATALOG_FILE, 'utf8')
    : null;
  const committedCatalog = committed ? JSON.parse(committed) : null;
  for (const e of built.catalog.entries.filter(x => x.delivery === 'archive')) {
    const was = committedCatalog?.entries.find(x => x.id === e.id);
    const file = path.join(CATALOG_DIR, e.archiveFile);
    if (!existsSync(file)) {
      problems.push(`${e.archiveFile} is missing: run \`npm run catalog\``);
      continue;
    }
    const bytes = readFileSync(file);
    if (!was || was.sha256 !== sha256(bytes) || was.bytes !== bytes.length) {
      problems.push(
        `${e.archiveFile} is not the archive catalog.json names: run \`npm run catalog\``
      );
    }
    let content;
    try {
      content = read(bytes);
    } catch (err) {
      problems.push(`${e.archiveFile}: ${err.message}`);
      continue;
    }
    for (const p of content.problems) problems.push(`${e.archiveFile}: ${p}`);
    const want = new Map(e.files.map(f => [f.path, f.sha256]));
    const have = new Map(
      [...content.files.entries()]
        .filter(([p]) => p !== 'CHECKSUMS')
        .map(([p, b]) => [p, sha256(b)])
    );
    const same =
      want.size === have.size && [...want].every(([p, s]) => have.get(p) === s);
    if (!same)
      problems.push(
        `${e.archiveFile} does not hold what ${e.source} packs to today: run \`npm run catalog\``
      );
  }
  // With each archive judged by its content, the rest of the text must match.
  const normalize = c =>
    c &&
    json({
      ...c,
      entries: c.entries.map(({ bytes, sha256: _s, ...rest }) =>
        rest.delivery === 'archive' ? rest : { ...rest, bytes }
      ),
    });
  if (!committed) problems.push('catalog/catalog.json is missing');
  else if (normalize(committedCatalog) !== normalize(built.catalog))
    problems.push('catalog/catalog.json is out of date: run `npm run catalog`');

  const licenses = readFileSync(path.join(REPO, 'LICENSES.md'), 'utf8');
  if (!licenses.includes('`extensions/**`'))
    problems.push('LICENSES.md does not say how extensions/** is licensed');
  return problems;
}

/**
 * Every accepted extension with a build script, rebuilt from its pinned raw
 * source and compared byte for byte with what is committed. Needs the raw
 * files, so it is a provenance check, as `packs:provenance` is for the built-in
 * packs, and not part of `check`.
 */
export async function checkProvenance(curation = readCuration()) {
  const problems = [];
  let rebuilt = 0;
  for (const item of curation.extensions) {
    const script = path.join(REPO, item.path, 'build.mjs');
    if (!existsSync(script)) continue;
    const { build } = await import(pathToFileURL(script).href);
    let out;
    try {
      out = build();
    } catch (err) {
      problems.push(`${item.path}: ${err.message}`);
      continue;
    }
    for (const [file, text] of Object.entries(out)) {
      if (typeof text !== 'string') continue;
      const committed = readFileSync(path.join(REPO, item.path, file), 'utf8');
      if (committed !== text)
        problems.push(
          `${item.path}/${file} is not what build.mjs makes from the pinned source`
        );
    }
    rebuilt++;
  }
  return { problems, rebuilt };
}

async function main(argv) {
  const cmd = argv[2];
  if (cmd === 'provenance') {
    const { problems, rebuilt } = await checkProvenance();
    if (problems.length) {
      console.error(problems.map(p => `  ${p}`).join('\n'));
      return 1;
    }
    console.log(
      `${rebuilt} extension pack(s) rebuild byte for byte from the pinned raw products.`
    );
    return 0;
  }
  if (cmd === 'generate') {
    const { text, archives } = await buildCatalog();
    mkdirSync(path.join(CATALOG_DIR, 'packages'), { recursive: true });
    for (const [rel, bytes] of archives) {
      const file = path.join(CATALOG_DIR, rel);
      // An archive whose content is unchanged keeps its bytes: a rebuild on
      // another zlib must not publish a new checksum for the same pack.
      if (existsSync(file)) {
        const old = read(readFileSync(file));
        const now = read(bytes);
        const same =
          old.files.size === now.files.size &&
          [...now.files].every(([p, b]) => old.files.get(p)?.equals(b));
        if (same) continue;
      }
      writeFileSync(file, bytes);
    }
    // Record the bytes actually on disk, which may be an unchanged older pack.
    const catalog = JSON.parse(text);
    for (const e of catalog.entries.filter(x => x.delivery === 'archive')) {
      const b = readFileSync(path.join(CATALOG_DIR, e.archiveFile));
      e.bytes = b.length;
      e.sha256 = sha256(b);
    }
    writeFileSync(CATALOG_FILE, json(catalog));
    console.log(
      `catalog/catalog.json: ${catalog.entries.length} entries, ${archives.size} archives`
    );
    return 0;
  }
  if (cmd === 'check') {
    const problems = await checkCatalog();
    if (problems.length) {
      console.error(problems.map(p => `  ${p}`).join('\n'));
      console.error(`\n${problems.length} catalog problem(s).`);
      return 1;
    }
    console.log('The catalog matches the repository.');
    return 0;
  }
  console.error('usage: node tools/catalog.mjs generate|check|provenance');
  return 2;
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  process.exitCode = await main(process.argv);
