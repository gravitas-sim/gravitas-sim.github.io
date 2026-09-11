// =============================================================================
// Standing stars on the canvas, in a known order
// -----------------------------------------------------------------------------
// A comparison lesson needs the objects it is comparing to be *there*, on the
// main canvas, selectable, and in the same places every time anybody opens the
// step. That is what a stage is: a declarative list of stars, laid out by
// arithmetic, with no random numbers and no dependence on the order a scenario
// happened to build things in.
//
// This half is the arithmetic - where each star goes, and how big to draw it.
// It is pure, so it imports nothing, touches no DOM and reads no clock, and a
// test can check a layout with three object literals. js/lessonStage.js is the
// half that knows about the stellar model and the body classes.
//
// Three radii, and keeping them apart
// -----------------------------------------------------------------------------
// A star on this stage has three sizes and confusing any two of them is how a
// comparison lesson teaches something false.
//
//   The physical radius     is what the model says, in solar radii. It is the
//                           number in the readout and in the inspector, it is
//                           what a measurement is made of, and nothing here
//                           changes it.
//
//   The display radius      is how big it is drawn, in world units. Under
//                           TRUE scale it is proportional to the physical
//                           radius, so a supergiant beside a red dwarf is
//                           honest and the dwarf is a speck. Under DISPLAY
//                           scale it is compressed by a power law, so both are
//                           visible and the ordering is preserved but the
//                           ratio is not. Which one is in force is stated on
//                           screen, always.
//
//   The visibility floor    is js/bodyVisuals.js's, applied at draw time in
//                           screen pixels, and it is the reason a speck is
//                           still a speck you can see. It is not a size: two
//                           stars both held at the floor are not the same
//                           size, they are both too small to draw, and the
//                           readout says so rather than letting the picture
//                           imply they match.
//
// Under true scale the smallest stars come out below the floor and are
// therefore not distinguishable by eye or reachable by click. That is the
// honest picture, and it is why every staged step also lists its stars in the
// lesson panel: the list is how you select what you cannot see.
// =============================================================================

/** How a stage sizes its stars. */
export const SCALE = Object.freeze({
  /**
   * Drawn in proportion to the physical radius. Honest, and unusable on its
   * own: the eight bundled tracks span a factor of about two thousand in
   * radius, so putting them on one screen at true scale means seven specks and
   * one disc.
   */
  TRUE: 'true',
  /**
   * Drawn compressed by a power law. Every star is visible and the ordering by
   * size survives, but the ratio on screen is not the ratio in the model, and
   * anything measured off the picture would be wrong. The exponent is stated
   * below and printed in the readout.
   */
  DISPLAY: 'display',
});

/**
 * The compression exponent for DISPLAY scale.
 *
 * A quarter power. It maps the 0.01-to-1000 solar-radius span the lesson uses
 * onto about a factor of ten on screen, which fits a row of eight without the
 * largest leaving the viewport or the smallest vanishing. It is a display
 * choice with no physics in it, which is why the number lives here with a name
 * rather than inline at a call site.
 */
export const DISPLAY_EXPONENT = 0.25;

/** World units a one-solar-radius star is drawn at, before compression. */
export const UNIT_RADIUS = 9;

/**
 * How big to draw a star, in world units.
 *
 * @param {number} radiusSun - The physical radius the model gives
 * @param {string} scale - One of SCALE
 * @returns {number} A world-unit radius, never zero
 */
export function displayRadius(radiusSun, scale = SCALE.DISPLAY) {
  const r = Number.isFinite(radiusSun) && radiusSun > 0 ? radiusSun : 1;
  if (scale === SCALE.TRUE) return UNIT_RADIUS * r;
  return UNIT_RADIUS * r ** DISPLAY_EXPONENT;
}

/**
 * Whether a star at this size is being held up by the visibility floor.
 *
 * Reported so the readout can say "smaller than this picture can show" instead
 * of letting two specks look like a match. The floor itself is applied by the
 * renderer in screen pixels, so the check needs the zoom.
 *
 * @param {number} worldRadius - From displayRadius
 * @param {number} zoom - The view's zoom
 * @param {number} floorPx - The renderer's floor, in screen pixels
 * @returns {boolean} True when the drawing is a marker rather than a size
 */
export const atVisibilityFloor = (worldRadius, zoom, floorPx) =>
  worldRadius * zoom < floorPx;

/**
 * Where each star on a stage goes, in world units.
 *
 * A row, centred on the origin, evenly spaced. Deterministic by construction:
 * the same list of stars gives the same positions on every machine and every
 * reload, which is what lets a lesson say "the third one from the left" and a
 * screenshot in a worksheet still be right a year later.
 *
 * Spacing is measured in world units and does not depend on how big the stars
 * are drawn, so switching between true and display scale moves nothing. That
 * matters more than it sounds: a layout that reflowed when the scale changed
 * would make the two pictures impossible to compare, which is the one thing
 * the scale switch exists for.
 *
 * @param {number} count - How many stars
 * @param {object} [opts] - Options
 * @param {number} [opts.spacing] - World units between centres
 * @param {number} [opts.y] - Row height
 * @param {number} [opts.perRow] - Wrap to a grid after this many
 * @returns {Array<{x: number, y: number}>} One position per star, in order
 */
export function rowLayout(count, { spacing = 90, y = 0, perRow = 0 } = {}) {
  const n = Math.max(0, Math.floor(count));
  if (!n) return [];
  const columns = perRow > 0 ? Math.min(perRow, n) : n;
  const rows = Math.ceil(n / columns);
  const out = [];
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / columns);
    const inRow = i % columns;
    const wide = Math.min(columns, n - row * columns);
    out.push({
      x: (inRow - (wide - 1) / 2) * spacing,
      y: y + (row - (rows - 1) / 2) * spacing,
    });
  }
  return out;
}

/**
 * A viewport that holds every staged star, with a margin.
 *
 * Returned rather than applied: what "put the camera here" means belongs to
 * whatever owns the camera. The zoom is capped so that a stage of one star
 * does not fill the screen with it.
 *
 * The lesson panel and the instrument sit over the canvas, so fitting to the
 * viewport puts the stage underneath them - which is what happened the first
 * time, and it makes the whole idea of a workspace pointless. `inset` is the
 * region they leave clear, in screen pixels, and the stage is centred in that
 * rather than in the window.
 *
 * @param {Array<{x: number, y: number, radius: number}>} placed - The stage
 * @param {object} view - {width, height} in screen pixels
 * @param {object} [opts] - Options
 * @param {number} [opts.margin] - Fraction of the clear region to leave empty
 * @param {number} [opts.maxZoom] - Never zoom in past this
 * @param {object} [opts.inset] - {left, right, top, bottom} pixels covered
 * @returns {?{zoom: number, pan: {x: number, y: number}}} A camera, or null
 */
export function fitCamera(
  placed,
  view,
  { margin = 0.22, maxZoom = 3, inset = {} } = {}
) {
  if (!placed?.length || !view?.width || !view?.height) return null;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of placed) {
    const r = Math.max(p.radius || 0, 1);
    minX = Math.min(minX, p.x - r);
    maxX = Math.max(maxX, p.x + r);
    minY = Math.min(minY, p.y - r);
    maxY = Math.max(maxY, p.y + r);
  }
  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);
  const left = Math.max(0, inset.left || 0);
  const right = Math.max(0, inset.right || 0);
  const top = Math.max(0, inset.top || 0);
  const bottom = Math.max(0, inset.bottom || 0);
  const clearW = Math.max(120, view.width - left - right);
  const clearH = Math.max(120, view.height - top - bottom);
  const usable = 1 - Math.min(0.8, Math.max(0, margin));
  const zoom = Math.min(
    maxZoom,
    (clearW * usable) / spanX,
    (clearH * usable) / spanY
  );
  // The view puts world point p at viewportCentre + p * zoom + pan, so to land
  // the stage's centre in the middle of the clear region the pan is the offset
  // between the two centres, less the stage's own centre scaled.
  const clearCentreX = left + clearW / 2;
  const clearCentreY = top + clearH / 2;
  return {
    zoom,
    pan: {
      x: clearCentreX - view.width / 2 - ((minX + maxX) / 2) * zoom,
      y: clearCentreY - view.height / 2 - ((minY + maxY) / 2) * zoom,
    },
  };
}
