// =============================================================================
// The bottom dock: the transport bar and the footer, sharing one edge
// -----------------------------------------------------------------------------
// Both live along the bottom of the window, and neither used to know the other
// was there. The bar centred itself in the band left of the control rail; the
// footer sat in the right-hand corner and was as wide as its contents happened
// to make it. Whether they collided was a coincidence of window width and
// footer length - and the footer had been getting longer: a theme picker, then
// a language picker, on top of the copyright, the licence, the validation link
// and the repository link. On a wide window the scrubber ran straight across
// the copyright line.
//
// A media query cannot settle this, because the widths that matter are measured
// rather than declared: how wide the footer renders depends on the language and
// on which fonts loaded, and how far down the rail reaches depends on which
// section is open. So this module measures them and publishes what it finds as
// custom properties, and css/chrome.css lays the two out from those.
//
// What it publishes:
//
//   --attribution-width    the footer's rendered width
//   --attribution-height   its height, for the narrow layout where it wraps
//                          onto a row of its own beneath the bar
//   --rail-footer-inset    how far the footer must sit from the right edge to
//                          clear the control rail, which is usually not at all
//   --transport-max        the widest a window-centred bar may be and still
//                          stop short of the footer
//
// and the body class `dock-banded`, which says that centring the bar on the
// window would squeeze it past usefulness and it should centre in the room to
// the left of the footer instead.
//
// Measured with a ResizeObserver rather than on resize: the footer changes size
// when the language changes and when a font finishes loading, and the rail
// changes height when a section is opened, none of which is a window resize.
// =============================================================================

/* global ResizeObserver */

/** The gap kept between the bar and the footer, and between footer and rail. */
const GAP = 16;

/**
 * The narrowest transport bar still worth having.
 *
 * Three buttons, a slider and a clock. Below this the slider is too short to
 * scrub with, at which point centring the bar has cost more than it bought and
 * the layout falls back to centring it in the space that is actually free.
 */
const MIN_BAR = 420;

let observer = null;

/**
 * Measure the footer and the rail, and publish what the layout needs.
 *
 * @param {HTMLElement} footer - The attribution line
 * @param {HTMLElement|null} rail - The control rail, if this page has one
 */
function publish(footer, rail) {
  const root = document.documentElement;
  const set = (name, value) => root.style.setProperty(name, value);

  const first = footer.getBoundingClientRect();
  // A hidden footer reserves nothing. It fades in after the splash, and until
  // then the bar should have the whole window.
  const visible = first.width > 0 && first.height > 0;
  const footerHeight = visible ? Math.ceil(first.height) : 0;

  set('--attribution-width', visible ? `${Math.ceil(first.width)}px` : '0px');
  set('--attribution-height', `${footerHeight ? footerHeight + GAP : 0}px`);

  // --- Does the footer have to step aside for the rail? --------------------
  // The rail is anchored to the top and grows downward, so on most windows it
  // stops well above the footer and the corner is free. On a short window with
  // a section open it can reach the bottom, and then a footer flush in the
  // corner would sit underneath it. Reserving the rail's width unconditionally
  // - which is what a fixed inset did - pushed the footer a quarter of the way
  // across the window on every screen to solve a problem most of them do not
  // have.
  const footerTop = window.innerHeight - footerHeight;
  let railInset = 0;
  if (rail) {
    const r = rail.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && r.bottom > footerTop - GAP) {
      railInset = Math.ceil(r.width) + GAP;
    }
  }
  set('--rail-footer-inset', `${railInset}px`);

  // --- How much room is left for the bar? ----------------------------------
  // Measured after the inset above has been applied, not calculated from the
  // design tokens. Reading the rect a second time forces the browser to settle
  // the layout first, so this is where the footer actually is - and it costs
  // nothing to be right, because the alternative is arithmetic on token values
  // that are declared in rem and would have to be converted by hand. (They were,
  // once, and `0.75rem` parsed as 0.75 pixels: the reserve came out eleven
  // pixels short and the bar sat that much closer to the footer than intended.)
  const f = visible ? footer.getBoundingClientRect() : first;
  const footerLeftFromRight = visible
    ? Math.ceil(window.innerWidth - f.left)
    : 0;

  // A window-centred bar overruns the footer once half of it reaches the
  // footer's left edge, so the room it has is symmetric: what it gives up on
  // the right it also gives up on the left.
  const centredMax = Math.max(
    0,
    Math.floor(window.innerWidth - 2 * (footerLeftFromRight + GAP))
  );
  set('--transport-max', `${centredMax}px`);
  set('--footer-reserve', `${footerLeftFromRight + GAP}px`);

  document.body.classList.toggle('dock-banded', centredMax < MIN_BAR);
}

/**
 * Start watching the bottom edge. Safe to call once, from init.
 *
 * @returns {boolean} True if there was a footer to watch
 */
export function initBottomDock() {
  const footer = document.getElementById('attribution');
  if (!footer) return false;
  const rail = document.getElementById('mainControls');

  const measure = () => publish(footer, rail);
  measure();

  if (typeof ResizeObserver === 'function') {
    observer?.disconnect();
    observer = new ResizeObserver(measure);
    observer.observe(footer);
    observer.observe(document.documentElement);
    // The rail changes height when a section opens, which can bring its foot
    // down into the footer's corner.
    if (rail) observer.observe(rail);
  } else {
    // No ResizeObserver is a browser old enough that a resize listener is the
    // best available approximation. It misses a language change, so that is
    // covered separately below.
    window.addEventListener('resize', measure);
  }

  // A language change rewrites every word in the footer, and Spanish is
  // reliably longer than English. The observer catches it, but only after the
  // browser has laid the new text out; asking again on the next frame makes the
  // bar move in the same paint as the words it is moving for.
  window.addEventListener('gravitasLocaleChanged', () => {
    requestAnimationFrame(measure);
  });

  return true;
}
