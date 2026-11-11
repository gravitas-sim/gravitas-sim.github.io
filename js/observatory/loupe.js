// =============================================================================
// The loupe a finger gets (DESIGN_SYSTEM.md, "Touch measurement")
// -----------------------------------------------------------------------------
// While a finger is down on a picture, a 3x circle of the same pixels is drawn
// 72 px above the contact (below it near the top edge), with a small square at
// its centre, because the finger hides what it points at. It is a picture of
// the pixels, not a second measurement, and it is for touch only. One module
// for every image task (the marks, the photometry stamp, the pixel selection),
// so a task that takes a finger takes the same loupe (Prompt 283).
// =============================================================================

const SIZE = 96;

/**
 * @param {HTMLElement} stage - Positioned; the loupe is drawn inside it
 * @param {HTMLCanvasElement} source - The canvas whose pixels are magnified
 * @param {HTMLElement} over - What the finger is on (the box the pointer is measured in)
 * @returns {{el: HTMLCanvasElement, show: (e: PointerEvent) => void, hide: () => void}}
 */
export function createLoupe(stage, source, over) {
  const el = document.createElement('canvas');
  el.className = 'im-loupe';
  el.width = SIZE;
  el.height = SIZE;
  el.hidden = true;
  stage.append(el);
  return {
    el,
    show(e) {
      const r = stage.getBoundingClientRect();
      const oc = over.getBoundingClientRect();
      const sx = ((e.clientX - oc.left) / oc.width) * source.width;
      const sy = ((e.clientY - oc.top) / oc.height) * source.height;
      const half = SIZE / 6;
      const g = el.getContext('2d');
      if (!g) return;
      g.clearRect(0, 0, SIZE, SIZE);
      g.imageSmoothingEnabled = false;
      g.drawImage(
        source,
        sx - half,
        sy - half,
        2 * half,
        2 * half,
        0,
        0,
        SIZE,
        SIZE
      );
      g.strokeStyle = '#fff';
      g.strokeRect(46, 46, 4, 4);
      el.hidden = false;
      const y = e.clientY - r.top;
      el.style.left = `${Math.min(r.width - SIZE, Math.max(0, e.clientX - r.left - SIZE / 2))}px`;
      el.style.top = `${y < 168 ? y + 72 : y - 168}px`;
    },
    hide() {
      el.hidden = true;
    },
  };
}
