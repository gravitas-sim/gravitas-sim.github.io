// =============================================================================
// Whether a written answer is a written answer
// -----------------------------------------------------------------------------
// Its own module, and pure, because js/investigations.js reaches js/render.js
// and cannot be imported by a unit test without a canvas. A validator that can
// only be exercised through a browser is a validator nobody exercises.
// =============================================================================

/**
 * Whether a written answer is a written answer.
 *
 * Deliberately weak. This is not marking: a reader who writes something short
 * and wrong has answered, and telling them their phrasing is unscientific is
 * not this function's business. What it refuses is the null response - an empty
 * box, a space, a full stop, "..." - because the step is a prompt to say
 * something and those say nothing, and recording them as an answer puts an
 * empty field into a report a teacher will read.
 *
 * @param {string} value - What the reader typed
 * @returns {boolean} True when there is something there
 */
export function isWrittenAnswer(value) {
  const text = String(value ?? '').trim();
  if (!text) return false;
  // Two letters or digits anywhere, in any script - not two in a row. A run of
  // two would reject "a = 1.5", which is terse but is an answer: a reader who
  // writes down the number they measured has said something. Any script,
  // because a Spanish reader's answer and a Greek symbol are both content.
  const content = text.match(/[\p{L}\p{N}]/gu);
  return (content?.length ?? 0) >= 2;
}
