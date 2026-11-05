// =============================================================================
// Readers for the authentic files of the multi-messenger kernel (Prompt 244)
// -----------------------------------------------------------------------------
// The authentic data Carl supplies live in tests/fixtures/multimessenger/authentic/. Nothing in the repository is typed
// from memory: these readers only parse the shapes MULTIMESSENGER.md asks for, and tools/multimessenger-validate.mjs
// runs the legs that need them (B2, B4, E1, E3), each NOT RUN while its file is absent.
//
//   leap-seconds.list        the IERS / NIST / IANA plain-text list: comment lines, then one line per entry
//                            "<NTP seconds since 1900-01-01> <TAI - UTC seconds> # <date>", with "#$" (last update)
//                            and "#@" (expiry) lines giving NTP times
//   published-bound.json     the external reference paper's delay, distance, emission-delay interval and printed bound
//   grb-trigger.json         the burst's instrument trigger time from the archive, with its system and header keys
//   kilonova-photometry.csv  one paper's table: mjd_utc,band,ab_mag,ab_mag_err,reference
//   SOURCES.json             per file: the source, the terms as read, the retrieval date
// =============================================================================

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const NTP_EPOCH_MS = Date.UTC(1900, 0, 1);

/**
 * Parse a leap-seconds.list text.
 * @param {string} text
 * @returns {{entries: {from: string, taiMinusUtc: number}[], expiryNtp: number|null, lastUpdateNtp: number|null}}
 */
export function parseLeapSecondsList(text) {
  const entries = [];
  let expiryNtp = null;
  let lastUpdateNtp = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#@')) {
      expiryNtp = Number(line.slice(2).trim());
      continue;
    }
    if (line.startsWith('#$')) {
      lastUpdateNtp = Number(line.slice(2).trim());
      continue;
    }
    if (line.startsWith('#')) continue;
    const m = /^(\d+)\s+(\d+)/.exec(line);
    if (!m) continue;
    const date = new Date(NTP_EPOCH_MS + Number(m[1]) * 1000);
    entries.push({
      from: date.toISOString().slice(0, 10),
      taiMinusUtc: Number(m[2]),
      ntp: Number(m[1]),
    });
  }
  return { entries, expiryNtp, lastUpdateNtp };
}

/** Does a parsed list satisfy its own consistency rules (first of a month, integers, ascending, GPS definition)? */
export function checkLeapList(list, retrieved) {
  const problems = [];
  const e = list.entries;
  if (e.length < 2) problems.push('fewer than two entries');
  for (let i = 0; i < e.length; i++) {
    if (!/-(01)$/.test(e[i].from))
      problems.push(`${e[i].from} is not the first of a month`);
    if (!Number.isInteger(e[i].taiMinusUtc))
      problems.push(`entry ${i} is not an integer`);
    if (
      i &&
      !(e[i].ntp > e[i - 1].ntp && e[i].taiMinusUtc > e[i - 1].taiMinusUtc)
    )
      problems.push(`entry ${i} does not ascend`);
  }
  if (e[0] && (e[0].from !== '1972-01-01' || e[0].taiMinusUtc !== 10))
    problems.push('the list does not start at 1972-01-01 with 10 s');
  const atGps = [...e].reverse().find(x => x.from <= '1980-01-06');
  if (!atGps || atGps.taiMinusUtc !== 19)
    problems.push('TAI - UTC is not 19 s at 1980-01-06');
  if (list.expiryNtp != null && retrieved) {
    const expiry = new Date(NTP_EPOCH_MS + list.expiryNtp * 1000)
      .toISOString()
      .slice(0, 10);
    if (!(expiry > retrieved))
      problems.push(`the list expired on ${expiry}, before ${retrieved}`);
  }
  return problems;
}

/** Read a JSON file under the authentic directory, or null if it is not there. */
export function readAuthenticJson(dir, name) {
  const p = path.join(dir, name);
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null;
}

/**
 * Parse the photometry CSV (mjd_utc,band,ab_mag,ab_mag_err,reference).
 * @param {string} text
 */
export function parsePhotometryCsv(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim() && !l.startsWith('#'));
  const head = lines[0].split(',').map(s => s.trim());
  const need = ['mjd_utc', 'band', 'ab_mag', 'ab_mag_err'];
  for (const k of need)
    if (!head.includes(k)) throw new Error(`photometry csv lacks ${k}`);
  return lines.slice(1).map(l => {
    const cells = l.split(',').map(s => s.trim());
    const r = Object.fromEntries(head.map((k, i) => [k, cells[i]]));
    return {
      mjd: Number(r.mjd_utc),
      band: r.band,
      mag: Number(r.ab_mag),
      sigma: Number(r.ab_mag_err),
      reference: r.reference ?? null,
    };
  });
}
