// =============================================================================
// Last term's reports, kept as one file
// -----------------------------------------------------------------------------
// Roadmap III Prompt 168. The review page holds what an instructor drops on it
// in the page's memory and nowhere else, so "archiving a term" is: write the
// reports, the names they were grouped under and the marks entered, as one
// file the instructor keeps; then clear the page. Opening that file on the
// review page brings the same reports back, through the same readers.
//
// The file holds each report as it was handed in (a token pasted or read out
// of a PDF, or a progress backup), never a graded copy: grading is done again
// on opening, against the lessons as this build has them, as it is for any
// report. Nothing leaves the browser, and nothing but the page's memory is
// cleared. A student's own records are not touched: they are in the student's
// browser, where this page cannot reach.
//
// An older page (2.0.0) given this file reads it as a progress backup and
// refuses it in words (tests/instructorArchive.test.js runs that reader).
// =============================================================================

export const ARCHIVE_FORMAT = 'gravitas.submission-archive';
export const ARCHIVE_VERSION = 1;
/** More reports than a class has; a bound so a hostile file cannot be a flood. */
export const MAX_REPORTS = 2000;
const MAX_LABEL = 200;
const MAX_NAMED = 40;

const KINDS = new Set(['token', 'pdf', 'backup']);
const isObject = v => v && typeof v === 'object' && !Array.isArray(v);

/** Whether text looks like an archive, before it is parsed. */
export const isArchiveText = text =>
  /"format"\s*:\s*"gravitas\.submission-archive"/.test(
    String(text).slice(0, 400)
  );

/**
 * The file's text.
 * @param {{reports: Array<{label: string, kind: string, thing: string|object}>,
 *   named: Array<{label: string, text: string}>, marks?: ?string,
 *   term?: ?string, now?: Date}} parts - What the review page holds
 * @returns {string} JSON
 */
export function buildArchive({
  reports,
  named = [],
  marks = null,
  term = null,
  now = new Date(),
}) {
  return `${JSON.stringify(
    {
      format: ARCHIVE_FORMAT,
      formatVersion: ARCHIVE_VERSION,
      savedAt: now.toISOString(),
      ...(term ? { term } : {}),
      reports: reports.map(r => ({
        label: String(r.label).slice(0, MAX_LABEL),
        kind: r.kind,
        ...(r.kind === 'backup' ? { backup: r.thing } : { token: r.thing }),
      })),
      named: named.map(n => ({
        label: String(n.label).slice(0, MAX_LABEL),
        text: n.text,
      })),
      ...(marks ? { marks } : {}),
    },
    null,
    1
  )}\n`;
}

/**
 * What an archive holds, or why it cannot be opened.
 * @param {string} text - The file's text
 * @returns {{ok: true, archive: object}|{ok: false, reason: string}} reason is
 *   one of notJson, wrongFormat, newer, shape, tooMany
 */
export function readArchive(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'notJson' };
  }
  if (!isObject(data) || data.format !== ARCHIVE_FORMAT)
    return { ok: false, reason: 'wrongFormat' };
  if (!Number.isInteger(data.formatVersion) || data.formatVersion < 1)
    return { ok: false, reason: 'shape' };
  if (data.formatVersion > ARCHIVE_VERSION)
    return { ok: false, reason: 'newer' };
  if (!Array.isArray(data.reports)) return { ok: false, reason: 'shape' };
  if (data.reports.length > MAX_REPORTS)
    return { ok: false, reason: 'tooMany' };
  const reports = [];
  for (const r of data.reports) {
    if (!isObject(r) || !KINDS.has(r.kind) || typeof r.label !== 'string')
      return { ok: false, reason: 'shape' };
    const thing = r.kind === 'backup' ? r.backup : r.token;
    if (r.kind === 'backup' ? !isObject(thing) : typeof thing !== 'string')
      return { ok: false, reason: 'shape' };
    reports.push({ label: r.label.slice(0, MAX_LABEL), kind: r.kind, thing });
  }
  const named = [];
  for (const n of Array.isArray(data.named)
    ? data.named.slice(0, MAX_NAMED)
    : []) {
    if (!isObject(n) || typeof n.text !== 'string')
      return { ok: false, reason: 'shape' };
    named.push({
      label: typeof n.label === 'string' ? n.label.slice(0, MAX_LABEL) : '',
      text: n.text,
    });
  }
  return {
    ok: true,
    archive: {
      savedAt: typeof data.savedAt === 'string' ? data.savedAt : null,
      term: typeof data.term === 'string' ? data.term : null,
      reports,
      named,
      marks: typeof data.marks === 'string' ? data.marks : null,
    },
  };
}

/** A file name: the term in lower-case words joined by hyphens, and the day. */
export function archiveName(term, day) {
  const slug = String(term || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);
  return `gravitas-archive-${slug ? `${slug}-` : ''}${day}.json`;
}
