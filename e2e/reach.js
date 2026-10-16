// =============================================================================
// Scrolling to a control the way a reader can
// -----------------------------------------------------------------------------
// Two layout specs ask whether a student can get to a control and press it,
// e2e/viewportMatrix.spec.js and e2e/stellarLayout.spec.js. Both used to answer
// with `el.scrollIntoView()` followed by a hit test, and that has a blind spot
// big enough to lose a lesson in. scrollIntoView() scrolls every ancestor that
// has anywhere to scroll to, including one with `overflow: hidden`, and no
// finger, wheel or trackpad can scroll that. So a control clipped out of an
// unscrollable box was scrolled into view by the test, hit-tested there, and
// passed.
//
// That is how the lesson sheet on a phone lost its Next button. Below 900px
// #investigationPanel was `overflow: hidden` and its contents were taller than
// it. Next sat below the sheet's edge, where nobody could scroll to it, and
// both specs passed at 390px.
//
// So this scrolls only what a reader could scroll. Then it asks every box that
// clips the control whether it is showing it. A box that hides the control and
// cannot be scrolled is the failure, and the failure names it.
// =============================================================================

/**
 * Scroll the first match for `selector` into view as a reader would, and say
 * whether a box nobody can scroll is still hiding it.
 *
 * Runs in the page, so it is self-contained: pass it to `page.evaluate()` with
 * the selector, then hit-test the control. Every box that scrolls is scrolled
 * to put the control at its center, innermost first. A box that does not
 * scroll is never touched, and neither is a page whose body is
 * `overflow: hidden`. Then each box that clips the control, and last the
 * viewport, has to show all of it that the boxes inside it show.
 *
 * Centered rather than minimally scrolled, because a control left flush
 * against a scroller's edge is hit-tested at a point that lands on the
 * scroller. See the note in e2e/viewportMatrix.spec.js.
 *
 * @param {string} selector - CSS selector for the control
 * @returns {string} 'ok', 'missing', or 'clipped in an unscrollable box: <box>'
 */
export function scrollLikeAReader(selector) {
  const node = document.querySelector(selector);
  if (!node) return 'missing';

  const scrolls = value => value === 'auto' || value === 'scroll';
  const hides = value => value === 'hidden' || value === 'clip';
  const name = box =>
    box === window
      ? 'the viewport'
      : box.id
        ? `#${box.id}`
        : [box.tagName.toLowerCase(), ...box.classList].join('.');
  const shown = box => {
    if (box === window) {
      const { clientWidth, clientHeight } = document.documentElement;
      return { top: 0, left: 0, bottom: clientHeight, right: clientWidth };
    }
    const r = box.getBoundingClientRect();
    const top = r.top + box.clientTop;
    const left = r.left + box.clientLeft;
    return {
      top,
      left,
      bottom: top + box.clientHeight,
      right: left + box.clientWidth,
    };
  };

  // The boxes that clip it, innermost first. Not every ancestor does. A fixed
  // box escapes all of them except one that makes itself the containing block,
  // and an absolute box escapes the static ones.
  const containsFixed = style =>
    style.transform !== 'none' ||
    style.perspective !== 'none' ||
    style.filter !== 'none' ||
    /paint|layout|strict|content/.test(style.contain);
  const boxes = [];
  let position = getComputedStyle(node).position;
  for (
    let box = node.parentElement;
    box && box !== document.body;
    box = box.parentElement
  ) {
    const style = getComputedStyle(box);
    if (position === 'fixed' && !containsFixed(style)) continue;
    if (
      position === 'absolute' &&
      style.position === 'static' &&
      !containsFixed(style)
    ) {
      continue;
    }
    position = style.position;
    if (style.overflowX !== 'visible' || style.overflowY !== 'visible') {
      boxes.push({ box, x: style.overflowX, y: style.overflowY });
    }
  }

  // The viewport clips everything, and it takes its overflow from the root,
  // or from the body when the root's is visible. On the viewport "visible"
  // means it scrolls. Scrolling it leaves a fixed box where it was.
  const root = getComputedStyle(document.documentElement);
  const page =
    root.overflowX === 'visible' && root.overflowY === 'visible'
      ? getComputedStyle(document.body)
      : root;
  const pinned = position === 'fixed';
  const viewportScrolls = value => !pinned && !hides(value);
  boxes.push({
    box: window,
    x: viewportScrolls(page.overflowX) ? 'auto' : 'hidden',
    y: viewportScrolls(page.overflowY) ? 'auto' : 'hidden',
  });

  for (const { box, x, y } of boxes) {
    const r = node.getBoundingClientRect();
    const b = shown(box);
    box.scrollBy({
      top: scrolls(y) ? (r.top + r.bottom - b.top - b.bottom) / 2 : 0,
      left: scrolls(x) ? (r.left + r.right - b.left - b.right) / 2 : 0,
      behavior: 'instant',
    });
  }

  // Now what a reader sees: the control, cut down by each box it is in.
  const r = node.getBoundingClientRect();
  const seen = { top: r.top, left: r.left, bottom: r.bottom, right: r.right };
  for (const { box, x, y } of boxes) {
    // Nothing left to hide. The hit test will say what is there instead.
    if (seen.top >= seen.bottom || seen.left >= seen.right) break;
    const b = shown(box);
    const outY = seen.top < b.top - 1 || seen.bottom > b.bottom + 1;
    const outX = seen.left < b.left - 1 || seen.right > b.right + 1;
    if ((outY && hides(y)) || (outX && hides(x))) {
      return `clipped in an unscrollable box: ${name(box)}`;
    }
    if (y !== 'visible') {
      seen.top = Math.max(seen.top, b.top);
      seen.bottom = Math.min(seen.bottom, b.bottom);
    }
    if (x !== 'visible') {
      seen.left = Math.max(seen.left, b.left);
      seen.right = Math.min(seen.right, b.right);
    }
  }
  return 'ok';
}
