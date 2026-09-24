// =============================================================================
// What an embed's URL may ask of it: gravitas-embed/1
// -----------------------------------------------------------------------------
// `?embed=1` alone is an embed exactly as it always was. `ev=1` beside it opts
// into this contract, and only then are the options below read - so a link
// written before the contract existed, or by a later version this build does
// not know, still opens as the plain embed it used to be.
//
// Every option is a closed list of values. Nothing here is text a page could
// have written into the figure: no title, no caption, no style, no URL other
// than the parent origin, which is checked to be an origin and nothing more.
// A value outside its list is ignored and the default stands. Whether the
// figure starts paused, and the world it shows, are the share payload's to say
// (its `p` and its fragment), not the query string's.
//
//   lang      en | es              the figure's language, not remembered
//   theme     midnight | deep | observatory | daylight, not remembered
//   controls  transport | none     the transport bar, or none
//   motion    reduced              reduced motion, whatever the reader's setting
//   quality   low | full           the rendering tier, instead of measuring
//   reset     authored | scenario  what Reset returns to
//   parent    an origin            the one page whose messages are obeyed
//
// EMBEDDING.md is the public description of this, and of the messages
// js/embedBridge.js answers.
// =============================================================================

export const EMBED_VERSION = 1;

const CHOICES = {
  lang: ['en', 'es'],
  theme: ['midnight', 'deep', 'observatory', 'daylight'],
  controls: ['transport', 'none'],
  motion: ['reduced'],
  quality: ['low', 'full'],
  reset: ['authored', 'scenario'],
};

/** What an embed does with an option nobody set. */
export const EMBED_DEFAULTS = Object.freeze({
  lang: null,
  theme: null,
  controls: 'transport',
  motion: null,
  quality: null,
  reset: 'scenario',
  parent: null,
});

/** The order an embed URL writes its options in, which the builder keeps. */
const ORDER = ['lang', 'theme', 'controls', 'motion', 'quality', 'reset'];

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

/**
 * An origin a page can be trusted to be, or null.
 *
 * Exactly `scheme://host[:port]`: https, or plain http only on this machine,
 * for development. No path, query, fragment or credentials, and never an
 * opaque origin - a sandboxed page's origin is the string "null", and every
 * sandboxed page in the world shares it, so it can never identify one.
 *
 * @param {string} value - What the URL or the builder was given
 * @returns {string|null} The normalized origin
 */
export function parentOrigin(value) {
  if (typeof value !== 'string' || !value || value.length > 200) return null;
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  const local = LOCAL_HOSTS.includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) {
    return null;
  }
  if (url.origin === 'null' || url.username || url.password) return null;
  return value.replace(/\/$/, '') === url.origin ? url.origin : null;
}

/**
 * The options an embed URL asks for.
 *
 * @param {string|URLSearchParams} [search] - Defaults to this page's query
 * @returns {{version: number, options: Object, ignored: string[]}} version is
 *   0 for a plain `?embed=1`; ignored names each value that was not accepted
 */
export function readEmbedOptions(search) {
  const params =
    search instanceof URLSearchParams
      ? search
      : new URLSearchParams(
          search ?? (typeof location !== 'undefined' ? location.search : '')
        );
  const options = { ...EMBED_DEFAULTS };
  const ignored = [];
  if (params.get('ev') !== String(EMBED_VERSION)) {
    return { version: 0, options, ignored };
  }
  for (const [name, list] of Object.entries(CHOICES)) {
    const value = params.get(name);
    if (value === null) continue;
    if (list.includes(value)) options[name] = value;
    else ignored.push(name);
  }
  const parent = params.get('parent');
  if (parent !== null) {
    options.parent = parentOrigin(parent);
    if (!options.parent) ignored.push('parent');
  }
  return { version: EMBED_VERSION, options, ignored };
}

/**
 * The query parameters for a set of options, defaults left out.
 *
 * @param {Object} options - As readEmbedOptions returns them
 * @returns {Array<[string, string]>} Name and value, in a fixed order,
 *   starting with embed=1 and ev
 */
export function embedParams(options = {}) {
  const out = [
    ['embed', '1'],
    ['ev', String(EMBED_VERSION)],
  ];
  for (const name of ORDER) {
    const value = options[name];
    if (
      value &&
      value !== EMBED_DEFAULTS[name] &&
      CHOICES[name].includes(value)
    ) {
      out.push([name, value]);
    }
  }
  const parent = options.parent && parentOrigin(options.parent);
  if (parent) out.push(['parent', parent]);
  return out;
}

/** The closed lists, for the builder's controls and for tests. */
export const EMBED_CHOICES = Object.freeze(
  Object.fromEntries(
    Object.entries(CHOICES).map(([k, v]) => [k, Object.freeze([...v])])
  )
);
