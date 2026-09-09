// =============================================================================
// Whether the front door opens, without opening it
// -----------------------------------------------------------------------------
// Four small functions and a storage key, lifted out of js/welcome.js so that
// deciding whether to show the front door does not mean downloading it.
//
// js/welcome.js is eleven kilobytes of layer: the entry cards, the featured
// scenarios, the audience copy, the focus trap, the resource links. A visitor
// who has been here before sees none of it, and before this split every one of
// them downloaded it anyway - to run isWelcomeSeen(), which reads one key out
// of localStorage. js/main.js now imports this module at start-up and the
// layer itself only when it is about to be shown.
//
// js/welcome.js re-exports everything here, so its own callers and its tests
// are unaffected by where the code lives.
// =============================================================================

// Versioned on purpose. Bumping it shows the front door once more to everyone
// who has already dismissed it, which is right for a genuine redesign and wrong
// for a copy edit. Do not bump it for wording.
export const WELCOME_SEEN_KEY = 'gravitas_welcome_seen_v1';

// --- Storage -----------------------------------------------------------------
//
// Every access is guarded. Safari in private mode throws on setItem, some
// embedded browsers throw on the getter itself, and a visitor with storage
// disabled must still get a working simulator. The fallback everywhere is the
// behavior of a first-time visitor: show the door, let them dismiss it, and
// accept that the dismissal will not survive the reload.

/** @returns {boolean} True if this browser has recorded the door as seen */
export function isWelcomeSeen() {
  try {
    return window.localStorage.getItem(WELCOME_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

/** Record that the visitor has been through the front door. */
export function markWelcomeSeen() {
  try {
    window.localStorage.setItem(WELCOME_SEEN_KEY, '1');
  } catch {
    /* the visit still works; the preference just will not persist */
  }
}

/** Forget the front door, so the next ordinary visit shows it again. */
export function resetWelcomePreference() {
  try {
    window.localStorage.removeItem(WELCOME_SEEN_KEY);
    return true;
  } catch {
    return false;
  }
}

// --- Should it open? ---------------------------------------------------------

/**
 * Does this URL name something the visitor specifically asked for?
 *
 * Both forms are matched against the actual link architecture rather than an
 * invented query string: share.js writes `#<n><z|r><payload>` and
 * investigations.js reads `#investigation=<id>`. Someone opening an
 * instructor's assignment must not have it covered by an introduction.
 *
 * @param {string} [hash] - Defaults to the current fragment
 * @returns {boolean} True if the URL encodes an intentional destination
 */
export function hasDeepLinkDestination(hash) {
  const h = hash === undefined ? window.location?.hash || '' : hash || '';
  // Kept in step with hasSharedLink() in share.js and investigationFromHash()
  // in investigations.js. Duplicated rather than imported because this runs
  // during start-up coordination, before either module is needed.
  return /^#\d+[zr]./.test(h) || /^#investigation=[\w-]+$/.test(h);
}

/**
 * Should the front door open by itself on this load?
 *
 * @param {Object} [opts]
 * @param {string} [opts.hash] - Fragment to test, for tests
 * @param {boolean} [opts.seen] - Override the stored preference, for tests
 * @returns {boolean} True to present the welcome layer automatically
 */
export function shouldShowWelcome(opts = {}) {
  const hash = opts.hash === undefined ? undefined : opts.hash;
  if (hasDeepLinkDestination(hash)) return false;
  const seen = opts.seen === undefined ? isWelcomeSeen() : opts.seen;
  return !seen;
}
