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
import { helpStages, helpTaken } from '../answerFeedback.js';

/** Kind marker. A world is '', an assignment 'a', a submission 's'. */
export const SUBMISSION_TAG = 's';

/**
 * Schema version of the payload below. 2 added `ev`, the evidence ledger's
 * digest, envelope ids and table (./ledgerDigest.js); a version 1 token is read
 * as it was, with no evidence to check.
 */
export const SUBMISSION_SCHEMA = 2;

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

/** How many evidence rows a token carries; the digest covers them all. */
export const TOKEN_ROWS = 40;

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
 * @param {?{ids: string[], rows: Array<Array<*>>, total: number}} [args.record]
 *   - The ledger record the report printed (notebook/ledger.js ledgerRecord())
 * @param {?string} [args.digest] - Its digest
 * @param {?string} [args.depth] - core, quantitative or advanced, if offered
 * @returns {object} The payload, with short keys because it is a fragment
 */
export function buildSubmission({
  backup,
  assignmentId = null,
  rosterId = null,
  fallbackLocale = 'en',
  record = null,
  digest = null,
  depth = null,
}) {
  return {
    v: SUBMISSION_SCHEMA,
    // The depth it was read at, when the investigation has more than one.
    ...(depth ? { dp: depth } : {}),
    ...(record && digest
      ? {
          ev: {
            d: digest,
            i: record.ids,
            n: record.total,
            r: record.rows.slice(0, TOKEN_ROWS),
          },
        }
      : {}),
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
  const ev = payload.ev;
  if (
    ev !== undefined &&
    !(
      ev &&
      typeof ev === 'object' &&
      typeof ev.d === 'string' &&
      Array.isArray(ev.i) &&
      Array.isArray(ev.r) &&
      ev.r.every(Array.isArray)
    )
  )
    return { ok: false, reason: 'badEvidence' };
  return { ok: true };
}

/**
 * Which step a stored key belongs to, and what hangs off it.
 *
 * The lesson engine keeps a step's answer under `<lesson>:<sid>` - stepKey() in
 * js/investigations/progressSchema.js - and everything else about the step one
 * colon further on: `:locale`, `:first`, `:shown`, `:help`, `:e`, `:tool:<id>`,
 * `:check:<n>`, and a measure step's fields as `:<fieldId>`. A sid may not
 * contain a colon, so the first one after the lesson's prefix is where a
 * sub-key starts. Attempts are keyed the same way, with nothing hanging off.
 *
 * A key without the prefix is read as a bare sid. The engine has never written
 * one, but test fixtures and hand-made files have, and where both spellings are
 * present the engine's wins.
 *
 * Nothing exports the reverse of stepKey(), so this is written out, as it is in
 * readProgress() and restoreProgress(). The tests build their responses with
 * stepKey() itself, so the two cannot drift apart unnoticed.
 *
 * @param {string} key - A response or attempt key
 * @param {string} lessonId - The lesson the submission names
 * @returns {{sid: string, sub: string, bare: boolean}} The step's sid, the
 *   sub-key ('' for the step's own key), and whether the prefix was missing
 */
function splitResponseKey(key, lessonId) {
  const prefix = `${lessonId}:`;
  const bare = !key.startsWith(prefix);
  const rest = bare ? key : key.slice(prefix.length);
  const cut = rest.indexOf(':');
  return cut === -1
    ? { sid: rest, sub: '', bare }
    : { sid: rest.slice(0, cut), sub: rest.slice(cut + 1), bare };
}

/**
 * Everything stored under each step, by sid.
 *
 * @param {object} table - Responses or attempts, as the engine keys them
 * @param {string} lessonId - The lesson the submission names
 * @returns {Map<string, {key: ?string, value: *, sub: Object<string, *>}>} Per
 *   step: the key its own value was found under, that value, and its sub-keys
 */
function byStep(table, lessonId) {
  const parsed = Object.entries(table || {}).map(([key, value]) => ({
    key,
    value,
    ...splitResponseKey(key, lessonId),
  }));
  // Bare keys first, so the engine's spelling overwrites them wherever both
  // are present. The sort is stable, so the order is otherwise the stored one.
  parsed.sort((a, b) => Number(!a.bare) - Number(!b.bare));
  const steps = new Map();
  for (const { key, value, sid, sub } of parsed) {
    let entry = steps.get(sid);
    if (!entry) {
      entry = { key: null, value: undefined, sub: {} };
      steps.set(sid, entry);
    }
    if (sub === '') {
      entry.key = key;
      entry.value = value;
    } else {
      entry.sub[sub] = value;
    }
  }
  return steps;
}

/** @param {*} v - A stored value @returns {boolean} Whether it says anything */
const filled = v => v !== undefined && v !== null && String(v).trim() !== '';

/**
 * The answers in a submission, one per answered step, each paired with the
 * locale it was typed under.
 *
 * Most of what the engine stores is not an answer - the locale, the first
 * number tried, whether the model answer was shown, which hints were taken,
 * where a slider was left - and none of it is reported as one: a page that
 * graded the sub-keys would count several questions for every one the lesson
 * asks. Two things are answers. A step's own key holds a chosen option, a
 * number or a sentence. A measure step has no key of its own; its answer is its
 * fields, reported together as `id=value` pairs in the lesson's order.
 *
 * Which sub-keys are fields only the lesson can say, which is why it is passed
 * in. They are picked by the ids the step declares rather than by leaving out
 * the names known to mean something else, because a field can be called
 * anything: goldilocks-question has one called `e`, which is also where the
 * ellipse step keeps its slider.
 *
 * @param {object} submission - A validated payload
 * @param {?object} [lesson] - The lesson it names. Without it a measure step's
 *   fields are not recognized, and only answers under a step's own key are
 *   returned.
 * @returns {Array<{sid: string, value: *, locale: string}>} One per answer
 */
export function answersOf(submission, lesson = null) {
  const responses = submission?.b?.progress?.responses || {};
  const fallback = submission?.fl || 'en';
  const fieldsOf = new Map(
    (Array.isArray(lesson?.steps) ? lesson.steps : [])
      .filter(s => s?.type === 'measure' && Array.isArray(s.fields))
      .map(s => [s.sid, s.fields.map(f => f?.id).filter(Boolean)])
  );
  const out = [];
  for (const [sid, entry] of byStep(responses, submission?.b?.lesson?.id)) {
    const ids = fieldsOf.get(sid);
    const typed = ids ? ids.filter(id => filled(entry.sub[id])) : [];
    if (typed.length) {
      out.push({
        sid,
        value: typed
          .map(id => `${id}=${String(entry.sub[id]).trim()}`)
          .join('; '),
        // Fields record the convention they were typed in, as a checked
        // number does; a report from before they did falls back.
        locale: entry.sub[`${typed[0]}${LOCALE_SUFFIX}`] || fallback,
      });
    } else if (entry.key !== null) {
      out.push({
        sid,
        value: entry.value,
        locale: responses[`${entry.key}${LOCALE_SUFFIX}`] || fallback,
      });
    }
  }
  return out;
}

/**
 * How many times each step was answered, by sid: a choice clicked or a number
 * checked.
 *
 * @param {object} submission - A validated payload
 * @returns {Map<string, number>} Attempt counts
 */
export function attemptsOf(submission) {
  const steps = byStep(
    submission?.b?.progress?.attempts,
    submission?.b?.lesson?.id
  );
  const out = new Map();
  for (const [sid, entry] of steps) {
    if (entry.key !== null) out.set(sid, entry.value);
  }
  return out;
}

/**
 * How much help was taken at each step, by sid: the number of hints and
 * whether the worked answer was shown. Read from the `:help` sub-key the
 * engine keeps beside each answer, so a report from before hints existed has
 * none and says so by having no entry. A fact beside the answer, never a mark.
 *
 * @param {object} submission - A validated payload
 * @returns {Map<string, {hints: number, revealed: boolean}>} Steps that took any
 */
export function helpOf(submission) {
  const steps = byStep(
    submission?.b?.progress?.responses,
    submission?.b?.lesson?.id
  );
  const out = new Map();
  for (const [sid, entry] of steps) {
    const taken = helpTaken(helpStages(entry.sub.help));
    if (taken.stages.length)
      out.set(sid, { hints: taken.hints, revealed: taken.revealed });
  }
  return out;
}
