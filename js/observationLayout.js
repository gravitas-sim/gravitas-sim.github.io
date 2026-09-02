// =============================================================================
// Keeping the observing panels out of each other's way
// -----------------------------------------------------------------------------
// The light curve has always sat at the bottom left. Radial velocity,
// astrometry and the rotation curve want the same corner, because that is where
// the instruments belong, and four panels claiming one position would simply
// cover each other up.
//
// So they stack. Whichever are open are laid out in a column from the bottom,
// in a fixed order, each one starting where the one below it ends. Nothing is
// docked or reparented: each panel keeps its own `position: fixed`, and this
// only sets `bottom`. That is deliberately the smallest change that solves the
// problem, rather than a workspace rewrite around four panels.
//
// If the stack would run off the top of a short window, the panels shrink their
// chart area instead of overflowing, because a plot pushed off screen is worse
// than a short one.
// =============================================================================

// Bottom to top. The light curve is the instrument students meet first, so it
// keeps the anchored position it has always had.
const PANEL_IDS = [
  'lightCurveContainer',
  'rvContainer',
  'astrometryContainer',
  'rotationCurveContainer',
];

// Clear of the transport bar along the bottom.
const BASE_BOTTOM = 120;
const GAP = 12;

// Leave a margin at the top of the window. The scenario card lives up there
// too, but it is dismissible and the instruments are not, so the panels get the
// room: 40px is enough that a panel never touches the very edge.
const TOP_MARGIN = 40;

// Below this a panel stops being usable, and it is better to run off the
// screen than to present an instrument nobody can read.
const MIN_PANEL_HEIGHT = 210;

let scheduled = false;

// Which panels the user has touched most recently. Four instruments do not fit
// one above another on any ordinary screen, so when the stack runs out of room
// the least recently used ones collapse to their title bar rather than sliding
// off the top. Nothing is lost: a collapsed panel is one click from full size,
// and collapsing it pushes whatever it displaces back into view.
let recency = [];

/**
 * Note that a panel was just opened or brought forward.
 * @param {string} id - Panel element id
 */
export function noteObservationPanelUsed(id) {
  recency = [id, ...recency.filter(other => other !== id)];
}

/**
 * Is this panel on screen?
 *
 * Not via offsetParent: every one of these panels is position: fixed, and a
 * fixed element's offsetParent is null whether it is visible or not, so that
 * test reported all three closed and the stack never formed.
 *
 * @param {HTMLElement|null} el - Candidate panel
 * @returns {boolean} Whether it is displayed and has height
 */
function isOpen(el) {
  if (!el) return false;
  if (getComputedStyle(el).display === 'none') return false;
  return el.offsetHeight > 0;
}

/**
 * Position every open observing panel in a column.
 *
 * Cheap and idempotent: reads a few heights, writes a few `bottom` values.
 */
export function layoutObservationPanels() {
  const open = PANEL_IDS.map(id => document.getElementById(id)).filter(isOpen);
  if (!open.length) return;

  const available = window.innerHeight - BASE_BOTTOM - TOP_MARGIN;
  const totalGaps = GAP * (open.length - 1);

  // Any panel the user has never touched still needs a place in the order.
  for (const el of open) {
    if (!recency.includes(el.id)) recency.push(el.id);
  }

  // Reset every panel to its natural size before measuring, or repeated layouts
  // would ratchet them smaller and smaller.
  for (const el of open) {
    el.style.removeProperty('max-height');
    el.classList.remove('is-collapsed');
  }

  // Collapse from the least recently used end until the stack fits. A collapsed
  // panel keeps its toolbar, so it is still labeled and still one click from
  // coming back.
  const byRecency = [...open].sort(
    (a, b) => recency.indexOf(a.id) - recency.indexOf(b.id)
  );
  const leastRecentFirst = byRecency.reverse();
  let index = 0;
  let total = () =>
    open.reduce((sum, el) => sum + el.offsetHeight, 0) + totalGaps;

  while (total() > available && index < leastRecentFirst.length - 1) {
    leastRecentFirst[index].classList.add('is-collapsed');
    index += 1;
  }

  // Whatever is still expanded shares any remaining shortfall through its own
  // flexible region, so the observer controls stay at full height.
  const shortfall = total() - available;
  if (shortfall > 0) {
    const expanded = open.filter(el => !el.classList.contains('is-collapsed'));
    const perPanel = shortfall / Math.max(1, expanded.length);
    for (const el of expanded) {
      const capped = Math.max(MIN_PANEL_HEIGHT, el.offsetHeight - perPanel);
      el.style.maxHeight = `${Math.round(capped)}px`;
    }
  }

  let cursor = BASE_BOTTOM;
  for (const el of open) {
    el.style.bottom = `${Math.round(cursor)}px`;
    cursor += el.offsetHeight + GAP;
  }
}

/** Lay out on the next frame, coalescing repeated requests. */
export function requestObservationLayout() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    layoutObservationPanels();
  });
}

/** Start watching for the things that change the stack. */
export function initObservationLayout() {
  window.addEventListener('resize', requestObservationLayout);

  // Clicking a collapsed panel's title bar brings it back. The click is caught
  // on the document so it keeps working for panels built after start-up.
  document.addEventListener('click', event => {
    const panel = event.target.closest?.('.obs-panel, .light-curve-container');
    if (!panel || !panel.id) return;
    if (event.target.closest('button, input, label')) return;
    noteObservationPanelUsed(panel.id);
    layoutObservationPanels();
  });

  requestObservationLayout();
}
