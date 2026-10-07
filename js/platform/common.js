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

/** Keys that reach an object's prototype when a parsed document is merged. */
const PROTOTYPE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * The first reason a parsed value is not plain, bounded data, or null.
 *
 * Plain: objects, arrays, finite numbers, strings, booleans and null, nothing
 * else. Bounded: nested at most `depth` deep, lists of at most `items`, texts
 * of at most `text` characters. And no key that reaches a prototype, even
 * where today's reader does not merge what it parsed (Roadmap II Prompt 67).
 *
 * @param {unknown} value
 * @param {{depth?: number, items?: number, text?: number}} [limits]
 * @param {string} [path] - Where the value sits, for the message
 * @returns {string|null} "path: reason", or null when it is plain
 */
export function plainDataProblem(value, limits = {}, path = '') {
  const { depth = 4, items = 1000, text = 1000 } = limits;
  const at = path || 'the value';
  if (value === null || typeof value === 'boolean') return null;
  if (typeof value === 'number')
    return Number.isFinite(value) ? null : `${at}: not a finite number`;
  if (typeof value === 'string')
    return value.length <= text
      ? null
      : `${at}: longer than ${text} characters`;
  if (typeof value !== 'object') return `${at}: not plain data`;
  if (depth <= 0) return `${at}: nested too deep`;
  const next = { depth: depth - 1, items, text };
  if (Array.isArray(value)) {
    if (value.length > items) return `${at}: more than ${items} items`;
    for (let i = 0; i < value.length; i++) {
      const why = plainDataProblem(value[i], next, `${path}[${i}]`);
      if (why) return why;
    }
    return null;
  }
  if (Object.getPrototypeOf(value) !== Object.prototype)
    return `${at}: not plain data`;
  const keys = Object.keys(value);
  if (keys.length > items) return `${at}: more than ${items} keys`;
  for (const k of keys) {
    if (PROTOTYPE_KEYS.has(k))
      return `${path ? `${path}.` : ''}${k}: a prototype key`;
    const why = plainDataProblem(value[k], next, path ? `${path}.${k}` : k);
    if (why) return why;
  }
  return null;
}

/** What a saved document may be: far above any real one, far below a bomb. */
const DOCUMENT_LIMITS = { depth: 24, items: 200_000, text: 5_000_000 };

/**
 * JSON.parse for a document a student opens, a file or a link: the same
 * errors for the same bad text, and a SyntaxError of its own, code
 * 'notPlainData', for text that parses but is not plain, bounded data with no
 * prototype key (plainDataProblem, at the limits above). Every reader that
 * already catches a parse failure refuses it the same way.
 * @param {string} text
 * @returns {*} The parsed value
 * @throws {SyntaxError} not JSON, or code 'notPlainData' with the path
 */
export function parseDocument(text) {
  const value = JSON.parse(text);
  const why = plainDataProblem(value, DOCUMENT_LIMITS);
  if (why)
    throw Object.assign(new SyntaxError(`not plain data (${why})`), {
      code: 'notPlainData',
    });
  return value;
}

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
