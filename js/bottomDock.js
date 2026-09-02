// =============================================================================
// The bottom dock: keeping the transport bar off the footer
// -----------------------------------------------------------------------------
// The transport bar and the footer both live along the bottom edge of the
// window, and neither used to know the other was there. The bar centred itself
// in the band left of the control rail; the footer sat in the right-hand
// corner and was as wide as its contents happened to make it. Whether the two
// collided was therefore a coincidence of window width and footer length - and
// the footer had been getting longer: a theme picker, then a language picker,
// on top of the copyright, the licence, the validation link and the repository
// link. On a wide window the scrubber ran straight across the copyright line.
//
// A media query cannot fix this, because the width that matters is the footer's
// own rendered width, which depends on the language, the fonts that loaded, and
// what the footer currently contains. So it is measured and published as a
// custom property, and css/chrome.css pins the transport bar's right edge short
// of it. Both ends of the bar are then fixed and it centres itself in whatever
// room is left, which means the two cannot overlap at any width in any
// language.
//
// Measured with a ResizeObserver rather than on resize: the footer changes size
// when the language changes and when a font finishes loading, neither of which
// is a window resize.
// =============================================================================

/* global ResizeObserver */

/** The gap the bar keeps from the footer, in pixels, on top of the CSS inset. */
const CLEARANCE = 8;

let observer = null;

/**
 * Publish the footer's size as --attribution-width / --attribution-height.
 *
 * @param {HTMLElement} el - The footer
 */
function publish(el) {
  const r = el.getBoundingClientRect();
  const root = document.documentElement;
  // A hidden footer reserves nothing. It fades in after the splash, and until
  // then the bar should have the whole band.
  const visible = r.width > 0 && r.height > 0;
  root.style.setProperty(
    '--attribution-width',
    visible ? `${Math.ceil(r.width) + CLEARANCE}px` : '0px'
  );
  root.style.setProperty(
    '--attribution-height',
    visible ? `${Math.ceil(r.height) + CLEARANCE}px` : '0px'
  );
}

/**
 * Start watching the footer. Safe to call once, from init.
 *
 * @returns {boolean} True if there was a footer to watch
 */
export function initBottomDock() {
  const el = document.getElementById('attribution');
  if (!el) return false;

  publish(el);

  if (typeof ResizeObserver === 'function') {
    observer?.disconnect();
    observer = new ResizeObserver(() => publish(el));
    observer.observe(el);
  } else {
    // No ResizeObserver is a browser old enough that a resize listener is the
    // best available approximation. It misses a language change, so that is
    // covered separately below.
    window.addEventListener('resize', () => publish(el));
  }

  // A language change rewrites every word in the footer, and Spanish is
  // reliably longer than English. The observer catches it, but only after the
  // browser has laid the new text out; asking again on the next frame makes the
  // bar move in the same paint as the words it is moving for.
  window.addEventListener('gravitasLocaleChanged', () => {
    requestAnimationFrame(() => publish(el));
  });

  return true;
}
