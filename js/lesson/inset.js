// The inset a stack of panels leaves, as arithmetic over boxes (the page's
// panels are measured in js/lessonFrame.js, which is where the window is).

/** Up to this width the panels are sheets, and the scene is framed above them. */
export const SHEET_MAX_WIDTH = 900;

/**
 * The largest clear rectangle left when each box is cut away by one of its four
 * sides, taking the cut that leaves the most room.
 *
 * @param {Array<{left: number, top: number, right: number, bottom: number}>} boxes
 * @param {{width: number, height: number}} view - The window, CSS pixels
 * @returns {{left: number, right: number, top: number, bottom: number}}
 */
export function insetFromBoxes(boxes, view) {
  const inset = { left: 0, right: 0, top: 0, bottom: 0 };
  const area = i =>
    Math.max(0, view.width - i.left - i.right) *
    Math.max(0, view.height - i.top - i.bottom);
  const sorted = [...boxes].sort(
    (a, b) =>
      (b.right - b.left) * (b.bottom - b.top) -
      (a.right - a.left) * (a.bottom - a.top)
  );
  for (const b of sorted) {
    const clear =
      b.right > inset.left &&
      b.left < view.width - inset.right &&
      b.bottom > inset.top &&
      b.top < view.height - inset.bottom;
    if (!clear) continue;
    const cuts = [
      { ...inset, left: Math.max(inset.left, b.right) },
      { ...inset, right: Math.max(inset.right, view.width - b.left) },
      { ...inset, top: Math.max(inset.top, b.bottom) },
      { ...inset, bottom: Math.max(inset.bottom, view.height - b.top) },
    ];
    Object.assign(
      inset,
      cuts.reduce((best, c) => (area(c) > area(best) ? c : best))
    );
  }
  return inset;
}
