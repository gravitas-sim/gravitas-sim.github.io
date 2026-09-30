// =============================================================================
// What every format's validator checks alike, and how every reader reads a
// version
// -----------------------------------------------------------------------------
// The public-id and version patterns were copied into seven validators, and
// twelve readers each wrote their own "refuse a newer version" block. The
// patterns are here once (tests/sharedHelpers.test.js holds the copies to
// them until each is an import), and readVersioned() is the one reader rule:
// the current version is read, an older one migrated step by step, a newer
// one refused with a message a reader can act on.
//
// Pure: no DOM, no imports.
// =============================================================================

/** A public id: lower-case words joined by hyphens. */
export const PUBLIC_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** A package id: dotted, reverse-domain style. */
export const PACKAGE_ID = /^[a-z0-9]+(\.[a-z0-9-]+)+$/;
/** A version: major.minor.patch. */
export const SEMVER = /^\d+\.\d+\.\d+$/;
/** A SHA-256, as lower-case hex. */
export const SHA256 = /^[0-9a-f]{64}$/;
/** A calendar date, as ISO 8601 writes one. */
export const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const isObject = v =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * A problem reporter in the shape every validator returns.
 * @returns {{problems: Array<{path: string, code: string, vars: object,
 *   message: string}>, need: Function}}
 */
export function reporter() {
  const problems = [];
  const need = (ok, path, code, message, vars = {}) => {
    if (!ok) problems.push({ path, code, vars, message });
    return Boolean(ok);
  };
  return { problems, need };
}

/**
 * Read a versioned document: the current version as it is, an older one
 * through each migration in turn, anything else refused with a reason.
 *
 * @param {unknown} doc
 * @param {{format?: string, current: number, min?: number,
 *   migrations?: Record<number, (doc: object) => (object|{doc: object,
 *   notes?: string[]})>, versionField?: string}} rules - `migrations[n]`
 *   turns version n into n + 1; `versionField` names an older field pair's
 *   version (a document without `formatVersion` is read by it)
 * @returns {{ok: true, doc: object, migrated: boolean, notes: string[]}
 *   | {ok: false, reason: string, message: string}}
 */
export function readVersioned(doc, rules) {
  const { format, current, min = current, migrations = {} } = rules;
  const refuse = (reason, message) => ({ ok: false, reason, message });
  if (!isObject(doc)) return refuse('notObject', 'this is not a document');
  if (format !== undefined && doc.format !== format)
    return refuse('format', `this is not a ${format} document`);
  const v =
    doc.formatVersion ?? (rules.versionField && doc[rules.versionField]);
  if (!Number.isInteger(v)) return refuse('version', 'it says no version');
  const name = format ?? 'document';
  if (v > current)
    return refuse(
      'newer',
      `it was made by a newer version of Gravitas (${name}/${v}); this one reads up to /${current}`
    );
  if (v < min)
    return refuse(
      'older',
      `it is ${name}/${v}, older than this version of Gravitas reads (/${min} and later)`
    );
  let out = doc;
  const notes = [];
  for (let k = v; k < current; k++) {
    const step = migrations[k];
    if (!step)
      return refuse('noMigration', `nothing reads ${name}/${k} into /${k + 1}`);
    const r = step(out);
    out = r && isObject(r.doc) ? r.doc : r;
    if (r?.notes) notes.push(...r.notes);
  }
  return { ok: true, doc: out, migrated: v < current, notes };
}
