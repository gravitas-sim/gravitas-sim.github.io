// =============================================================================
// The public colour tokens for an extension instrument
// -----------------------------------------------------------------------------
// The theme custom properties an instrument may read while it draws, so it
// follows the reader's theme. The list is the promise: css/tokens.css defines
// every one under every theme (tests/sdkInstrumentApi.test.js), and a name not
// listed here may be renamed in any release. Imported as
// `gravitas:instrument/tokens`.
// =============================================================================

/** Names an instrument may read, with the meaning each has. */
export const COLOR_TOKENS = Object.freeze({
  '--text-primary': 'text and the main line of a figure',
  '--text-secondary': 'secondary text',
  '--text-muted': 'axes, ticks and captions',
  '--border-subtle': 'gridlines',
  '--border': 'frames',
  '--accent': 'the one highlighted series',
  '--success': 'a good or confirmed state',
  '--warning': 'a caution',
  '--danger': 'an error or a limit exceeded',
  '--surface-1': 'a panel behind the figure',
  '--hue-star': 'a star',
  '--hue-planet': 'a planet',
  '--hue-blackhole': 'a black hole',
});

/**
 * Read a token's current value, or the fallback outside a page.
 * @param {string} name - One of COLOR_TOKENS
 * @param {string} fallback
 * @returns {string} A CSS color
 */
export function colorToken(name, fallback) {
  if (!Object.hasOwn(COLOR_TOKENS, name))
    throw new RangeError(`${name} is not a public colour token`);
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
}
