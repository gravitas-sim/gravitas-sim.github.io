// =============================================================================
// Is an answer still held? (Prompt 280)
// -----------------------------------------------------------------------------
// A prediction step that names `reveal` keeps its marking until the reader has
// reached the step where the result arrives (js/investigations/stepView.js).
// A description of a curve is the other way an answer leaks: "the values repeat
// every 3.2 days" settles a question about the period before the experiment
// that was to decide it. So the lesson panel marks the step it shows when an
// answer is still held, and the plot component's description reads the mark.
//
// Held means: some step at or before this one names a `reveal` sid that has
// not been visited. Steps before a prediction are not held (it has not been
// asked), the reveal step itself is not (goToStep visits it before it draws),
// and a reader who has not answered yet is held too, because the numbers on
// the screen would answer it for them.
// =============================================================================

/** The attribute the lesson panel carries while an answer is held. */
export const HELD_ATTRIBUTE = 'data-answer-held';

/**
 * Whether an answer is held at `step`.
 * @param {?Array<{reveal?: string}>} steps - The lesson's steps, in order
 * @param {object} step - The step on screen
 * @param {{has: (sid: string) => boolean}} visited - Sids reached so far
 * @returns {boolean}
 */
export function holdsAnswer(steps, step, visited) {
  const at = steps ? steps.indexOf(step) : -1;
  if (at < 0) return false;
  for (let i = 0; i <= at; i++) {
    const r = steps[i].reveal;
    if (r && !visited.has(r)) return true;
  }
  return false;
}

/**
 * Mark the lesson panel as holding an answer, or not, as the step on screen
 * does. Called while a step's markup is written; returns '' so that it can sit
 * in a template without changing the markup, which is what the lesson golden
 * records. The panel is the one element of the lesson that is not part of a
 * step's body.
 * @returns {string} Always ''
 */
export function markHeld(steps, step, visited) {
  if (typeof document !== 'undefined') {
    document
      .getElementById('investigationPanel')
      ?.toggleAttribute(HELD_ATTRIBUTE, holdsAnswer(steps, step, visited));
  }
  return '';
}
