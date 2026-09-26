// =============================================================================
// Installing a catalog entry for offline use, and knowing where each stands
// -----------------------------------------------------------------------------
// statusOf() says what a reader can do with an entry: nothing (it is built
// in), install it, update it, or not use it on this Gravitas at all. install()
// does the installing, and refuses, with a stable `code`, at the first thing
// that is not as the catalog says:
//
//   incompatible   the entry's platform range does not accept this Gravitas
//   notInstallable a built-in package, or anything not declarative
//   network        the archive did not arrive (retryable)
//   archive        the archive failed a check in ./archive.js (its own code
//                  says which: checksum, unsafePath, ...)
//   manifest       the manifest inside is not a valid declarative package,
//                  or is not the package and version the catalog lists
//   content        the data does not decode cleanly, or the course names a
//                  lesson Gravitas does not have
//   storage        the browser would not keep it (retryable)
//
// Nothing is stored until every check has passed, and then in one write, so a
// failure leaves the previous version, if any, installed and untouched.
// =============================================================================

import { MANIFEST_ENTRY, readArchive } from './archive.js';
import { PLATFORM_API, validateManifest } from '../platform/manifest.js';
import { parseVersion, satisfies } from '../platform/semver.js';
import { validateCoursePack } from '../platform/course.js';
import { checkObservation, observationOf } from '../observation.js';

/** An install refused, with why. */
export class InstallError extends Error {
  constructor(code, message, detail = {}) {
    super(message);
    this.name = 'InstallError';
    this.code = code;
    this.detail = detail;
    this.retryable = code === 'network' || code === 'storage';
  }
}

/** -1, 0 or 1 as version a is before, the same as, or after version b. */
export function compare(a, b) {
  const x = parseVersion(a);
  const y = parseVersion(b);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
  return 0;
}

/**
 * Where an entry stands for this reader.
 * @returns {'built-in'|'incompatible'|'available'|'installed'|'update'|'newer'}
 *   `update`: a newer version is in the catalog; `newer`: the installed one is
 *   newer than the catalog's, which a downgrade of the catalog can leave
 */
export function statusOf(entry, installed) {
  if (entry.delivery === 'built-in') return 'built-in';
  if (!satisfies(PLATFORM_API, entry.gravitas)) return 'incompatible';
  if (!installed) return 'available';
  const c = compare(installed.version, entry.version);
  if (c < 0) return 'update';
  if (c > 0) return 'newer';
  return installed.sha256 === entry.sha256 ? 'installed' : 'update';
}

/** Whether an update changes a major version, which may break what uses it. */
export const breaking = (from, to) =>
  Number(String(from).split('.')[0]) !== Number(String(to).split('.')[0]);

const text = bytes => new TextDecoder('utf-8', { fatal: true }).decode(bytes);

/** Check what an archive holds against its entry and the platform. */
function checkContents(entry, files, catalog) {
  let manifest;
  try {
    manifest = JSON.parse(text(files.get(MANIFEST_ENTRY)));
  } catch (err) {
    throw new InstallError(
      'manifest',
      `the manifest is not JSON: ${err.message}`
    );
  }
  const problems = validateManifest(manifest);
  if (problems.length)
    throw new InstallError(
      'manifest',
      `${problems[0].path}: ${problems[0].message}`,
      { problems }
    );
  if (manifest.kind !== 'declarative')
    throw new InstallError('manifest', 'only a declarative package installs');
  if (manifest.id !== entry.id || manifest.version !== entry.version)
    throw new InstallError(
      'manifest',
      `the archive holds ${manifest.id} ${manifest.version}, not ${entry.id} ${entry.version}`
    );
  const out = {};
  for (const [path, bytes] of files) out[path] = text(bytes);
  if (entry.type === 'data-pack') {
    const d = manifest.provides.dataPacks[0];
    try {
      const o = observationOf(JSON.parse(out[d.file]));
      const bad = checkObservation(o);
      if (bad.length) throw new Error(bad[0]);
    } catch (err) {
      throw new InstallError('content', `${d.file}: ${err.message}`);
    }
  } else if (entry.type === 'course-pack') {
    const c = manifest.provides.courses[0];
    let course;
    try {
      course = JSON.parse(out[c.file]);
    } catch (err) {
      throw new InstallError('content', `${c.file}: ${err.message}`);
    }
    const bad = validateCoursePack(course, {
      lessons: new Set(Object.keys(catalog.lessons || {})),
      locales: catalog.locales || ['en'],
    });
    if (bad.length)
      throw new InstallError(
        'content',
        `${c.file}: ${bad[0].path} ${bad[0].message}`
      );
  } else {
    throw new InstallError(
      'notInstallable',
      `a ${entry.type} does not install`
    );
  }
  return { manifest, files: out };
}

/**
 * Install (or update to) a catalog entry.
 * @param {object} entry - From catalog.json
 * @param {{catalog: object, store: object, fetchBytes: Function,
 *   base: string|URL}} ctx - fetchBytes(url) resolves to a Uint8Array
 * @returns {Promise<object>} The stored record
 * @throws {InstallError}
 */
export async function install(entry, { catalog, store, fetchBytes, base }) {
  if (entry.delivery !== 'archive' || entry.kind !== 'declarative')
    throw new InstallError(
      'notInstallable',
      `${entry.id} is built in, not installed`
    );
  if (!satisfies(PLATFORM_API, entry.gravitas))
    throw new InstallError(
      'incompatible',
      `${entry.id} needs Gravitas ${entry.gravitas}; this is ${PLATFORM_API}`,
      { needs: entry.gravitas, platform: PLATFORM_API }
    );
  let bytes;
  try {
    bytes = await fetchBytes(new URL(entry.archiveFile, base));
  } catch (err) {
    throw new InstallError(
      'network',
      `the archive did not arrive: ${err.message}`
    );
  }
  let files;
  try {
    files = await readArchive(bytes, { sha256: entry.sha256 });
  } catch (err) {
    throw new InstallError('archive', err.message, { archive: err.code });
  }
  const { manifest, files: stored } = checkContents(entry, files, catalog);
  const record = {
    id: entry.id,
    version: entry.version,
    type: entry.type,
    sha256: entry.sha256,
    bytes: entry.bytes,
    catalogVersion: catalog.catalogVersion,
    title: entry.title,
    manifest,
    files: stored,
  };
  try {
    await store.put(record);
  } catch (err) {
    throw new InstallError(
      'storage',
      `the browser would not keep it: ${err.message}`
    );
  }
  return record;
}

/** Remove an installed pack. */
export async function uninstall(id, { store }) {
  await store.remove(id);
}

/** An installed data pack's observation, decoded with the platform's reader. */
export function installedObservation(record) {
  const d = record.manifest.provides.dataPacks[0];
  return observationOf(JSON.parse(record.files[d.file]));
}
