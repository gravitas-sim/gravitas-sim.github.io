// =============================================================================
// The review page: composed reports (Prompt 275, part B)
// -----------------------------------------------------------------------------
// A student can compose one report from marked entries of several
// investigations (js/myWork/composedReport.js). A submission token states that
// report's digest and section count (`cr`); the report is a file the student
// hands in. This is the review page's part: what each submission states, each
// report file read here checked against the digest it states and matched to
// the submissions that state it, and the report written out in the page's
// language.
//
// js/submissionReview.js loads this only when a submission states a composed
// report or a report file is added, and this loads the format's reader only
// when a file is. A match says the file is the one the digest was made from;
// it does not say who made it.
// =============================================================================

/** What each submission states of a composed report (its `cr`), by fingerprint. */
const stated = new Map();
/** The report files read: {label, report, verified, html by language}. */
const files = [];

/** The format's reader and words, or null while they cannot be loaded. */
const format = () => import('./myWork/composedReport.js').catch(() => null);

/** Remember what a submission states. */
export const state = (fingerprint, cr) => void stated.set(fingerprint, cr);

/** Forget everything, as the page does. */
export function clear() {
  stated.clear();
  files.length = 0;
}

/** Each report read here, written out in a language it is not yet in. */
export async function say(lang, esc) {
  if (files.every(f => f.html.has(lang))) return;
  const m = await format();
  if (!m) return;
  const words = await m.loadSay(lang);
  for (const f of files) {
    if (f.html.has(lang)) continue;
    const doc = m.fragment(esc, 3);
    m.fillReport(doc, f.report, words);
    f.html.set(lang, doc.build());
  }
}

/**
 * Read a report file: its shape, and whether it hashes to the digest it
 * states. Which submission states that digest is said when it is shown.
 * @param {string} label - The file's name
 * @param {object} parsed - The parsed file
 * @param {string} lang - The page's language
 * @param {(s: string) => string} esc - The page's HTML escape
 * @returns {Promise<?string>} Null when read, else why not: `load` (the
 *   reader has not been downloaded), `format`, `newer` or `shape`
 */
export async function take(label, parsed, lang, esc) {
  const m = await format();
  if (!m) return 'load';
  const read = m.readComposed(parsed);
  if (!read.ok) return read.reason;
  files.push({
    label,
    report: read.report,
    verified: await m.checkComposed(read.report),
    html: new Map(),
  });
  await say(lang, esc);
  return null;
}

/**
 * The section of the page: a line per submission that states a report, then
 * each file read, open and alarmed when its contents do not hash to its
 * digest.
 * @param {Array<object>} records - The page's annotated records
 * @param {{t: Function, esc: Function, lang: string}} page
 * @returns {string} HTML, or '' when nothing states or holds a report
 */
export function sections(records, { t, esc, lang }) {
  const claims = records.filter(r => stated.has(r.fingerprint));
  if (!claims.length && !files.length) return '';
  const nameOf = r => r.nameAsTyped || t('sub.read.noName');
  const short = d => String(d).slice(0, 16);
  const lines = claims.map(r => {
    const cr = stated.get(r.fingerprint);
    const file = files.find(f => f.report.digest === cr.d);
    return `<li>${esc(
      t(
        !file
          ? 'sub.composed.stated'
          : file.verified
            ? 'sub.composed.matched'
            : 'sub.composed.matchedBad',
        { name: nameOf(r), n: cr.n, digest: short(cr.d), file: file?.label }
      )
    )}</li>`;
  });
  const read = files.map(f => {
    const who = claims
      .filter(r => stated.get(r.fingerprint).d === f.report.digest)
      .map(nameOf);
    const verdict = !f.verified
      ? 'mismatch'
      : who.length
        ? 'verified'
        : 'unclaimed';
    return `<details class="ui-disclosure sr-evidence"${
      verdict === 'mismatch' ? ' open' : ''
    }><summary>${esc(
      t('sub.composed.summary', {
        file: f.label,
        title: f.report.title,
        n: f.report.sections.length,
        state: t(`sub.composed.state.${verdict}`),
      })
    )}</summary><p${
      verdict === 'mismatch' ? ' class="ui-state is-error" role="alert"' : ''
    }>${esc(
      t(`sub.composed.${verdict}`, {
        digest: short(f.report.digest),
        names: who.join(', '),
      })
    )}</p>${f.html.get(lang) ?? ''}</details>`;
  });
  return `<h2>${esc(t('sub.composed.title'))}</h2><p class="ui-note">${esc(
    t('sub.composed.note')
  )}</p>${lines.length ? `<ul class="ui-note">${lines.join('')}</ul>` : ''}${read.join('')}`;
}
