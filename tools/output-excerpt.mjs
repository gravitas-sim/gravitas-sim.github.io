// =============================================================================
// The part of a failing command's output worth printing
// -----------------------------------------------------------------------------
// A gate that runs twenty commands cannot print each one's whole log, so it
// prints the last few lines, which is where most tools say why they failed.
// Most, not all: the instructor freshness check prints the files that moved -
// sorted, "changed" before "new input" - and then three lines of advice, so a
// tail of six showed the last three of eleven stale inputs. It read as the
// whole list, and was quoted as the whole list, for as long as nobody ran the
// check on its own.
//
// So a drift line is never cut: the excerpt is the tail plus every line that
// names an input that moved, in the order the command printed them.
// =============================================================================

/** A line of tools/instructor-freshness.mjs's describeDrift(). */
const DRIFT_LINE = /^\s+(changed|new input|no longer an input)\s/;

/**
 * The last `tail` non-empty lines of a command's output, and every drift line
 * before them, indented for a problem list.
 *
 * @param {string} text - What the command printed
 * @param {number} tail - How many of its last lines to keep
 * @returns {string} The excerpt, one indented line per line kept
 */
export function excerpt(text, tail) {
  const lines = String(text).split('\n').filter(Boolean);
  const from = Math.max(0, lines.length - tail);
  return lines
    .filter((line, i) => i >= from || DRIFT_LINE.test(line))
    .map(line => `    ${line}`)
    .join('\n');
}
