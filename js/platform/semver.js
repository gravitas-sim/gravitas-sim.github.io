// =============================================================================
// Versions and version ranges, as far as capability packages need them
// -----------------------------------------------------------------------------
// A package states its own version and the range of the Gravitas platform API
// it works with. Only the forms a manifest may use are understood, and anything
// else is an error rather than a guess: `1.2.3`, `^1.2.3`, `~1.2.3`, and a
// space-separated conjunction of `>=`, `>`, `<=`, `<` and `=` bounds.
// =============================================================================

const VERSION = /^(\d+)\.(\d+)\.(\d+)$/;

/** @returns {number[]|null} [major, minor, patch], or null if not a version */
export function parseVersion(text) {
  const m = VERSION.exec(String(text).trim());
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

const compare = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

/**
 * The bounds a range stands for, as [operator, version] pairs, or null if the
 * range is not one this understands.
 * @param {string} range
 * @returns {Array<[string, number[]]>|null}
 */
export function parseRange(range) {
  const parts = String(range).trim().split(/\s+/);
  if (!parts[0]) return null;
  const bounds = [];
  for (const part of parts) {
    const m = /^(\^|~|>=|<=|>|<|=)?(.*)$/.exec(part);
    const v = parseVersion(m[2]);
    if (!v) return null;
    const op = m[1] || '=';
    if (op === '^') {
      bounds.push(['>=', v], ['<', v[0] ? [v[0] + 1, 0, 0] : [0, v[1] + 1, 0]]);
    } else if (op === '~') {
      bounds.push(['>=', v], ['<', [v[0], v[1] + 1, 0]]);
    } else {
      bounds.push([op, v]);
    }
  }
  return bounds;
}

/** Whether a version lies in a range; false for anything unparseable. */
export function satisfies(version, range) {
  const v = parseVersion(version);
  const bounds = parseRange(range);
  if (!v || !bounds) return false;
  return bounds.every(([op, b]) => {
    const c = compare(v, b);
    return op === '>='
      ? c >= 0
      : op === '>'
        ? c > 0
        : op === '<='
          ? c <= 0
          : op === '<'
            ? c < 0
            : c === 0;
  });
}
