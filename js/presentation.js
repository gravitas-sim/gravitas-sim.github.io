// =============================================================================
// Presentation mode: which shell the simulation is wearing
// -----------------------------------------------------------------------------
// Gravitas has three presentations of one simulation.
//
//   normal    the sandbox: rail, readout, transport, footer, front door
//   embed     an interactive figure inside somebody else's page, with nothing
//             on screen that is not the figure
//   lecture   the same simulation projected on a wall, read from the back of a
//             room, driven from the keyboard
//
// Four concerns are kept apart on purpose, because conflating any two of them
// is how a presentation feature ends up changing an experiment:
//
//   simulation / share state   what is being simulated. js/shareState.js.
//   presentation mode          which shell. This file.
//   theme                      which palette. js/theme.js.
//   locale                     which language. js/i18n/index.js.
//
// Changing the presentation mode must never touch the first of those, and this
// module is deliberately incapable of it: it holds a string, sets a class on
// <body>, and fires an event. It imports nothing from the simulation.
//
// The class is the whole layout mechanism. The application already expresses
// its other modes this way - body.investigation-open, .investigation-split -
// so embed and lecture are `body.presentation-embed` and
// `body.presentation-lecture`, and every layout rule for them is CSS. There is
// no second layout engine and no JavaScript that hides elements one at a time.
// =============================================================================

/** The presentations, as the body class suffix each one uses. */
export const MODES = ['normal', 'embed', 'lecture'];

let mode = 'normal';
const listeners = new Set();

/** @returns {string} The active presentation mode */
export const getPresentationMode = () => mode;

/** @returns {boolean} True in embed mode */
export const isEmbed = () => mode === 'embed';

/** @returns {boolean} True in lecture mode */
export const isLecture = () => mode === 'lecture';

/** @returns {boolean} True in the ordinary sandbox */
export const isNormal = () => mode === 'normal';

/**
 * Switch presentation.
 *
 * @param {string} next - One of MODES; anything else resolves to 'normal'
 * @returns {string} The mode actually applied
 */
export function setPresentationMode(next) {
  const wanted = MODES.includes(next) ? next : 'normal';
  if (wanted === mode) return mode;
  const previous = mode;
  mode = wanted;

  const body = document.body;
  for (const m of MODES) {
    body.classList.toggle(`presentation-${m}`, m === mode && m !== 'normal');
  }
  // A single attribute as well as the classes, because a CSS rule that has to
  // say "not embed and not lecture" is easier to read as [data-presentation]
  // than as a chain of :not().
  body.setAttribute('data-presentation', mode);

  listeners.forEach(fn => {
    try {
      fn(mode, previous);
    } catch (err) {
      console.warn('[presentation] listener failed:', err);
    }
  });
  window.dispatchEvent(
    new CustomEvent('gravitasPresentationChanged', {
      detail: { mode, previous },
    })
  );
  return mode;
}

/**
 * Subscribe to presentation changes.
 * @param {Function} fn - Called with (mode, previousMode)
 * @returns {Function} Unsubscribe
 */
export function onPresentationChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// --- Reading the mode out of the URL ------------------------------------------

/**
 * Whether this page load asked for embed mode.
 *
 * Read from the *query string*, which is what makes embedding compose with
 * sharing for free: a share link puts its payload in the fragment, so
 * `?embed=1` and `#<payload>` occupy different halves of the URL and neither
 * can disturb the other. Any Gravitas link becomes embeddable by adding one
 * parameter, whatever else that link already carries.
 *
 * Accepts the values a hand-written embed is likely to use. `embed=0` and
 * `embed=false` are honoured as "no", so a template that always writes the
 * parameter can turn it off without deleting it.
 *
 * @param {string} [search] - Query string; defaults to the current one
 * @returns {boolean} True when embed mode was requested
 */
export function embedRequested(search) {
  const qs = search ?? (typeof location !== 'undefined' ? location.search : '');
  let value;
  try {
    value = new URLSearchParams(qs).get('embed');
  } catch {
    return false;
  }
  if (value === null) return false;
  const v = value.trim().toLowerCase();
  return v !== '0' && v !== 'false' && v !== 'no';
}

/**
 * Add `embed=1` to a URL, leaving everything else exactly as it was.
 *
 * The composability requirement, in one function. It preserves the fragment -
 * which is where a share payload lives - preserves every existing query
 * parameter and their order, and replaces rather than duplicates an `embed`
 * that is already there.
 *
 * @param {string} url - Any absolute or relative Gravitas URL
 * @param {Object} [opts]
 * @param {boolean} [opts.embed] - Set false to remove the parameter instead
 * @returns {string} The URL with the parameter applied
 */
export function withEmbedParam(url, { embed = true } = {}) {
  // A relative URL needs a base to parse against; the base is discarded again
  // unless the input was already absolute.
  const base =
    typeof location !== 'undefined'
      ? location.href
      : 'https://example.invalid/';
  let parsed;
  try {
    parsed = new URL(url, base);
  } catch {
    return url;
  }
  if (embed) parsed.searchParams.set('embed', '1');
  else parsed.searchParams.delete('embed');

  const absolute = /^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('//');
  return absolute ? parsed.href : parsed.pathname + parsed.search + parsed.hash;
}
