// =============================================================================
// The return channel
// -----------------------------------------------------------------------------
// Gravitas has five ways to hand work out and, until this, one way to get it
// back: a PDF carrying a completion code that nothing in the repository can
// recompute. The code is an FNV-1a checksum over the answer text - it makes
// tampering visible and is useless for anything else. An instructor holding
// thirty of them cannot tell which question the class got wrong.
//
// A submission token is the same PDF carrying enough to answer that. It is the
// backup js/investigations/progressBackup.js already builds - every response,
// every attempt count, every step fingerprint - plus the three things the
// backup has no reason to know: which assignment this was, which roster the
// student belongs to, and what locale to fall back to for answers stored
// before the per-answer locale sub-key existed.
//
// It rides the same tagged fragment path as everything else: deflate, base64url,
// a letter in front so the kinds cannot be confused. A world fragment starts
// with a digit, an assignment with 'a', a submission with 's'.
//
// What it is not
// -----------------------------------------------------------------------------
// Not authentication. Anything a browser computes, whoever controls the browser
// can forge, and a token that claimed otherwise would be worse than no token.
// It carries no signature and the instructor page verifies answers, not
// identity. What it removes is transcription: the instructor stops reading
// thirty PDFs and starts reading one table.
//
// Size, measured rather than hoped for: a full 30-step lesson with every
// answerable step filled with a sentence of prose comes to about 2,020
// characters. The JSON behind it is 6.4 KB, so deflate is doing most of the
// work, and the figure barely moves between lessons because the step
// fingerprints dominate. See tests/submissionToken.test.js, which fails if a
// realistic lesson crosses the limit below.
// =============================================================================

import { decodeTagged, encodeTagged } from '../shareState.js';
import { LOCALE_SUFFIX } from '../answerParse.js';

/** Kind marker. A world is '', an assignment 'a', a submission 's'. */
export const SUBMISSION_TAG = 's';

/** Schema version of the payload below. */
export const SUBMISSION_SCHEMA = 1;

/**
 * The length past which a token stops being safely pasteable.
 *
 * Not a URL limit - a submission is pasted into a text box rather than
 * followed - but the same order, and the failure is the same: something in the
 * middle truncates and the student finds out at the far end where nobody can
 * fix it. Learning management systems differ wildly and none of them documents
 * this, so the bound is the one this project already uses for links.
 */
export const COMFORTABLE_TOKEN_LENGTH = 8000;

/** @param {string} text - Anything @returns {boolean} Whether it looks like one */
export const isSubmissionToken = text =>
  /^#?s\d+[zr]./.test(String(text || '').trim());

/**
 * Assemble the payload.
 *
 * The backup goes in whole rather than being picked over. It already carries
 * the per-answer locale, because responses include the `:locale` sub-keys
 * js/answerParse.js writes beside each answer, so the instructor page can grade
 * every answer under the convention it was typed under rather than under one
 * locale for the whole submission. `fallbackLocale` is for the answers that
 * predate that sub-key: localeOfAnswer() needs something, and the report and
 * the instructor page have to agree on what.
 *
 * @param {object} args - Inputs
 * @param {object} args.backup - From buildBackup()
 * @param {?string} [args.assignmentId] - The assignment's id, if this is one
 * @param {?string} [args.rosterId] - Whatever the instructor wants to sort by
 * @param {string} [args.fallbackLocale] - For answers with no recorded locale
 * @returns {object} The payload, with short keys because it is a fragment
 */
export function buildSubmission({
  backup,
  assignmentId = null,
  rosterId = null,
  fallbackLocale = 'en',
}) {
  return {
    v: SUBMISSION_SCHEMA,
    a: assignmentId ? String(assignmentId).slice(0, 120) : null,
    r: rosterId ? String(rosterId).slice(0, 120) : null,
    fl: String(fallbackLocale || 'en'),
    b: backup,
  };
}

/**
 * Encode a payload and say whether it is a comfortable size.
 *
 * @param {object} submission - From buildSubmission()
 * @returns {Promise<{token: string, length: number, comfortable: boolean,
 *   limit: number}>} The token and its measurements
 */
export async function encodeSubmission(submission) {
  const token = await encodeTagged(
    SUBMISSION_TAG,
    SUBMISSION_SCHEMA,
    submission
  );
  return {
    token,
    length: token.length,
    comfortable: token.length <= COMFORTABLE_TOKEN_LENGTH,
    limit: COMFORTABLE_TOKEN_LENGTH,
  };
}

/**
 * Whatever came out of a text box, reduced to a token.
 *
 * Whitespace only. A token printed across twenty-six lines of a PDF comes back
 * from a copy with newlines in it, and every other character in base64url is
 * significant - '-' and '_' are alphabet, not punctuation, so a parser that
 * stripped "separators" would corrupt one token in three. A leading '#' is
 * tolerated because somebody will paste a whole fragment.
 *
 * @param {string} text - Pasted text
 * @returns {string} The token, or ''
 */
export const normalizeToken = text =>
  String(text || '')
    .replace(/\s+/g, '')
    .replace(/^#/, '');

/**
 * Read a token back, or say why not.
 *
 * Never throws: everything reaching this is something a person pasted, and a
 * named refusal is what the interface needs.
 *
 * @param {string} text - Pasted text
 * @returns {Promise<{ok: boolean, submission: ?object, reason: ?string}>} Result
 */
export async function readSubmissionToken(text) {
  const token = normalizeToken(text);
  if (!token) return { ok: false, submission: null, reason: 'empty' };
  // Caught before decoding, because the failure has a cause worth naming. A
  // rich-text box with smart punctuation turns "--" into an em dash, and 12 of
  // the 22 shipped lessons produce a token containing "--" - so about half of
  // everything pasted through one arrives corrupted. Repairing it would be
  // guesswork about which editor did what, and a wrong guess decodes to
  // plausible nonsense instead of failing; refusing says what happened and
  // what to do instead.
  if (!/^[A-Za-z0-9_-]+$/.test(token)) {
    return { ok: false, submission: null, reason: 'mangled' };
  }
  let decoded;
  try {
    decoded = await decodeTagged(SUBMISSION_TAG, token, SUBMISSION_SCHEMA);
  } catch (err) {
    // A code, not a sentence. The decode path below decodeTagged throws
    // prose meant for a student who clicked a broken link - "That link is
    // incomplete or was cut short in transit" - and the caller here is an
    // instructor page with its own wording for thirty files at once. Anything
    // not one of the three codes this layer knows about is a mangled payload.
    const known = ['wrongKind', 'newerVersion', 'corrupt'];
    const raw = String(err?.message || '');
    return {
      ok: false,
      submission: null,
      reason: known.includes(raw) ? raw : 'corrupt',
    };
  }
  const check = validateSubmission(decoded.payload);
  if (!check.ok) {
    return { ok: false, submission: null, reason: check.reason };
  }
  return { ok: true, submission: decoded.payload, reason: null };
}

/**
 * Check that a decoded payload really is a submission.
 *
 * Decoding proves it was one of our fragments. This is where a hand-edited or
 * hostile payload is stopped, and it checks shape rather than truth: a forged
 * set of answers is indistinguishable from a real one and always will be.
 *
 * @param {*} payload - Whatever decoded
 * @returns {{ok: true}|{ok: false, reason: string}} The verdict
 */
export function validateSubmission(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, reason: 'notAnObject' };
  }
  if (!Number.isInteger(payload.v) || payload.v < 1) {
    return { ok: false, reason: 'noVersion' };
  }
  if (payload.v > SUBMISSION_SCHEMA) {
    return { ok: false, reason: 'newerVersion' };
  }
  const b = payload.b;
  if (!b || typeof b !== 'object') return { ok: false, reason: 'noBackup' };
  if (!b.lesson || typeof b.lesson.id !== 'string') {
    return { ok: false, reason: 'noLesson' };
  }
  if (!b.progress || typeof b.progress.responses !== 'object') {
    return { ok: false, reason: 'noResponses' };
  }
  if (!Array.isArray(b.steps)) return { ok: false, reason: 'noSteps' };
  return { ok: true };
}

/**
 * The answers in a submission, paired with the locale each was typed under.
 *
 * The `:locale` sub-keys are storage, not answers, so they are filtered out
 * here rather than at every call site - an instructor page that graded them
 * would report a failure rate over twice as many questions as the lesson has.
 *
 * @param {object} submission - A validated payload
 * @returns {Array<{sid: string, value: string, locale: string}>} One per answer
 */
export function answersOf(submission) {
  const responses = submission?.b?.progress?.responses || {};
  const fallback = submission?.fl || 'en';
  const out = [];
  for (const [key, value] of Object.entries(responses)) {
    if (key.endsWith(LOCALE_SUFFIX)) continue;
    out.push({
      sid: key,
      value,
      locale: responses[`${key}${LOCALE_SUFFIX}`] || fallback,
    });
  }
  return out;
}
