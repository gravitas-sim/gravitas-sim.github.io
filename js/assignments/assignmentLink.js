// =============================================================================
// An assignment as a link, and back
// -----------------------------------------------------------------------------
// The same deflate-and-base64url path a world link uses, from js/shareState.js,
// with a tag in front so the two can never be mistaken for one another: a world
// fragment starts with a digit, an assignment with 'a'.
//
// Size is a real constraint rather than a tidiness one. These links are pasted
// into learning management systems, emails and chat windows, several of which
// wrap or truncate somewhere in the low thousands of characters, and a
// truncated link fails at the student's end where nobody can fix it. So the
// length is checked when the link is made and reported to the instructor while
// they can still do something about it - which is why the payload carries ids
// and hashes rather than any of the lesson's own text.
// =============================================================================

import {
  COMFORTABLE_URL_LENGTH,
  decodeTagged,
  encodeTagged,
  shareUrl,
} from '../shareState.js';
import {
  ASSIGNMENT_SCHEMA,
  ASSIGNMENT_TAG,
  validateAssignment,
} from './assignment.js';

/** @param {string} hash - A location hash @returns {boolean} Whether it is one */
export const isAssignmentFragment = hash =>
  /^#?a\d+[zr]./.test(String(hash || ''));

/**
 * Encode an assignment and say whether the link is a comfortable size.
 *
 * @param {object} assignment - A built payload
 * @param {string} [base] - Base URL; defaults to this page
 * @returns {Promise<{fragment: string, url: string, length: number,
 *   comfortable: boolean, limit: number}>} The link and its measurements
 */
export async function assignmentLink(assignment, base) {
  const fragment = await encodeTagged(
    ASSIGNMENT_TAG,
    ASSIGNMENT_SCHEMA,
    assignment
  );
  // A clean base, deliberately. shareUrl() defaults to the current address
  // including its query string, and the builder is reached at
  // ?assign=<lesson> - so the default put that on every link it made, and a
  // student opening one got the builder over the top of their assignment.
  const url = shareUrl(
    fragment,
    base || `${location.origin}${location.pathname}`
  );
  return {
    fragment,
    url,
    length: url.length,
    comfortable: url.length <= COMFORTABLE_URL_LENGTH,
    limit: COMFORTABLE_URL_LENGTH,
  };
}

/**
 * Decode a fragment into an assignment, or say why not.
 *
 * Never throws: every caller here is handling something a student pasted, and
 * a named refusal is what the interface needs.
 *
 * @param {string} fragment - The location hash
 * @returns {Promise<{ok: boolean, assignment: ?object, reason: ?string,
 *   detail: ?object}>} The result
 */
export async function readAssignmentLink(fragment) {
  let decoded;
  try {
    decoded = await decodeTagged(ASSIGNMENT_TAG, fragment, ASSIGNMENT_SCHEMA);
  } catch (err) {
    return {
      ok: false,
      assignment: null,
      reason: String(err?.message || 'corrupt'),
      detail: null,
    };
  }
  // Decoding proves it was a fragment. Validation proves it is an assignment,
  // and is where a hand-edited or hostile payload is stopped.
  const check = validateAssignment(decoded.payload);
  if (!check.ok) {
    return {
      ok: false,
      assignment: null,
      reason: check.reason,
      detail: check.detail,
    };
  }
  return { ok: true, assignment: decoded.payload, reason: null, detail: null };
}

/**
 * Read an assignment out of a downloaded file.
 *
 * Same validation as a link, different failure for unparseable text so the
 * reader is told whether the file was wrong or the contents were.
 *
 * @param {string} text - File contents
 * @returns {{ok: boolean, assignment: ?object, reason: ?string, detail: ?object}}
 */
export function readAssignmentFile(text) {
  let data;
  try {
    data = JSON.parse(String(text || ''));
  } catch {
    return { ok: false, assignment: null, reason: 'notJson', detail: null };
  }
  const check = validateAssignment(data);
  if (!check.ok) {
    return {
      ok: false,
      assignment: null,
      reason: check.reason,
      detail: check.detail,
    };
  }
  return { ok: true, assignment: data, reason: null, detail: null };
}
