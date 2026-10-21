// =============================================================================
// The translation-freshness ledger: what a translation was written against
// -----------------------------------------------------------------------------
// A translation goes out of date the moment the English it was written from
// moves, and nothing in a catalog says what that English was. The portable
// formats solved this inside the file: every pack text is {en, es, esOf}, and
// `esOf` is the digest of the English the Spanish was written from
// (js/composer/compile.js digest, js/course/review.js translationState). That
// field is the freshness mechanism for packs and this file does not replace it.
//
// The message catalogs, the lesson shadows and the document pages have no such
// field, and cannot be given one here: the catalogs under js/i18n and the lesson
// shadows are inputs of the instructor bundle's source digest, so a field added
// to them is a rebuild by the owner. The same fact is recorded outside them,
// by a tool, in tools/i18n-freshness.json, with the same digest function:
//
//   row   <english digest>[,<english digest>...]:<translation digest>[@date]
//
// The English digest is the English the translation stood against when it was
// last written or confirmed. The translation digest says which translation that
// was. Three consequences make the ledger honest rather than ceremonial:
//
//   * English changes, translation does not  -> the entry is STALE. Writing the
//     ledger never clears it: it records the date the staleness was first seen
//     (`@date`) and leaves the digests alone.
//   * The translation changes                -> the translator has read the new
//     English, so the entry is re-stamped against it (this is what writing the
//     ledger does with an edited translation).
//   * English changed, the meaning did not   -> `--confirm <key>` re-stamps the
//     English digest on purpose, in a diff a reviewer reads.
//
// A stale entry is allowed GRACE_DAYS from the day it was first recorded and
// is reported after that, and fails only a release-time check run with
// --fail-on-age (never required CI: age is the calendar's). The date is an
// argument, never read from a clock inside the pure functions, so a test can
// say what day it is.
//
// Pure: no file reads, no clock. tools/i18n-freshness.mjs reads and writes.
// =============================================================================

import { digest } from '../js/composer/compile.js';

export { digest };

/** Days a stale entry may stand, from the day it was first recorded as stale. */
export const GRACE_DAYS = 14;

/** The file format name, bumped when a row's shape changes. */
export const LEDGER_FORMAT = 'gravitas.i18n-freshness/1';

const ROW =
  /^([0-9a-f]{8}(?:,[0-9a-f]{8})*):([0-9a-f]{8})(?:@(\d{4}-\d{2}-\d{2}))?$/;

/**
 * Read one ledger row.
 *
 * @param {string} text - `en[,en]:es[@date]`
 * @returns {{en: string[], es: string, since: ?string}|null} The row, or null
 */
export function parseRow(text) {
  const m = ROW.exec(String(text));
  return m ? { en: m[1].split(','), es: m[2], since: m[3] ?? null } : null;
}

/**
 * Write one ledger row.
 *
 * @param {{en: string[], es: string, since?: ?string}} row - The row
 * @returns {string} `en[,en]:es[@date]`, English digests sorted
 */
export function formatRow({ en, es, since }) {
  return `${[...new Set(en)].sort().join(',')}:${es}${since ? `@${since}` : ''}`;
}

/** Whole days from one ISO date to another; the later minus the earlier. */
export function daysBetween(from, to) {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 864e5
  );
}

/** The ISO date of a Date, in UTC, so CI and a laptop agree. */
export const isoDate = (d = new Date()) => d.toISOString().slice(0, 10);

/**
 * Group current rows by the key the ledger holds them under.
 *
 * A key normally names one translation. A source whose keys are not unique by
 * nature (the document pages key a pair by its Spanish digest) can name
 * several English texts under one key; the ledger holds their digests as a set.
 *
 * @param {Array<{key: string, en: string, es: string}>} rows - Current pairs
 * @returns {Map<string, {en: Set<string>, es: string, samples: object[]}>}
 */
function grouped(rows) {
  const out = new Map();
  for (const r of rows) {
    const g = out.get(r.key) ?? {
      en: new Set(),
      es: digest(r.es),
      samples: [],
    };
    g.en.add(digest(r.en));
    g.samples.push(r);
    out.set(r.key, g);
  }
  return out;
}

/**
 * Judge every entry of one source against its ledger rows.
 *
 * States:
 *   fresh       the English is the one the translation was stamped against
 *   stale       the English moved and the translation did not; `since` is when
 *               that was first recorded (null: not recorded yet)
 *   expired     stale for longer than the grace period
 *   unrecorded  a translation the ledger has no row for, or whose translation
 *               changed since its row was written: `--write` stamps it
 *   orphan      a ledger row for an entry that no longer exists: `--write`
 *               drops it
 *
 * @param {Array<{key: string, en: string, es: string}>} rows - Current pairs
 * @param {Object<string,string>} ledger - Key to row text
 * @param {string} today - ISO date
 * @param {number} [grace] - Days
 * @returns {{fresh: string[], stale: object[], expired: object[],
 *   unrecorded: string[], orphan: string[], bad: string[]}} Keys by state
 */
export function evaluate(rows, ledger, today, grace = GRACE_DAYS) {
  const out = {
    fresh: [],
    stale: [],
    expired: [],
    unrecorded: [],
    orphan: [],
    bad: [],
  };
  const now = grouped(rows);
  for (const [key, g] of now) {
    const text = ledger[key];
    if (text === undefined) {
      out.unrecorded.push(key);
      continue;
    }
    const row = parseRow(text);
    if (!row) {
      out.bad.push(key);
      continue;
    }
    if (row.es !== g.es) {
      out.unrecorded.push(key);
      continue;
    }
    if ([...g.en].every(d => row.en.includes(d))) {
      out.fresh.push(key);
      continue;
    }
    const item = { key, since: row.since, sample: g.samples[0] };
    if (row.since && daysBetween(row.since, today) > grace)
      out.expired.push(item);
    else out.stale.push(item);
  }
  for (const key of Object.keys(ledger))
    if (!now.has(key)) out.orphan.push(key);
  return out;
}

/**
 * The ledger as `--write` would leave it.
 *
 * New entries and edited translations are stamped against the English that
 * stands today. A stale entry is left exactly as it was, with the date it was
 * first seen. `confirm` names keys whose English change is declared harmless:
 * those are re-stamped against today's English.
 *
 * @param {Array<{key: string, en: string, es: string}>} rows - Current pairs
 * @param {Object<string,string>} ledger - The ledger now
 * @param {string} today - ISO date
 * @param {Iterable<string>} [confirm] - Keys whose English change is harmless
 * @returns {Object<string,string>} Key to row text, keys sorted
 */
export function plan(rows, ledger, today, confirm = []) {
  const confirmed = new Set(confirm);
  const next = {};
  for (const [key, g] of grouped(rows)) {
    const row = ledger[key] === undefined ? null : parseRow(ledger[key]);
    const en = [...g.en];
    if (!row || row.es !== g.es || confirmed.has(key)) {
      next[key] = formatRow({ en, es: g.es });
    } else if (en.every(d => row.en.includes(d))) {
      next[key] = formatRow({ en: row.en, es: row.es });
    } else {
      next[key] = formatRow({
        en: row.en,
        es: row.es,
        since: row.since ?? today,
      });
    }
  }
  return Object.fromEntries(
    Object.entries(next).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  );
}

/**
 * Whether a source's ledger is exactly what `--write` would leave.
 *
 * @param {Object<string,string>} ledger - The ledger now
 * @param {Object<string,string>} planned - From plan()
 * @returns {string[]} Keys whose rows differ, in either direction
 */
export function drift(ledger, planned) {
  const keys = new Set([...Object.keys(ledger), ...Object.keys(planned)]);
  return [...keys].filter(k => ledger[k] !== planned[k]).sort();
}
