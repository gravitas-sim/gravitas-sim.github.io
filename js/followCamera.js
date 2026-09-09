// =============================================================================
// Follow mode's camera, and the reader's own hand on it
// -----------------------------------------------------------------------------
// Follow mode centres the view on a body every physics step. It did that by
// assigning `state.pan` outright:
//
//     state.pan.x = -(target.pos.x - off.x) * state.zoom;
//
// which is correct for the tracking and wrong for everything else. A reader who
// dragged the view while following had their drag overwritten on the next step,
// tens of times a second, so the picture fought back and then snapped home. The
// same happened to a wheel zoom, which anchors by adjusting the pan.
//
// The behaviour chosen here, of the two the brief allows: Follow mode keeps
// following, and manual camera input becomes an OFFSET from the followed body
// rather than being discarded. Drag the view while following a black hole and
// you stay locked to that black hole, looking off to one side; the offset
// persists until you reset the view, change what is followed, or turn Follow
// off. Nothing silently exits a mode the reader chose, and nothing silently
// throws away an input they made.
//
// How the offset is measured without touching every input site: this remembers
// the pan it last wrote. Anything that differs when it is next called was
// somebody else's doing, and that difference is the reader's input.
// =============================================================================

/**
 * Where the camera should sit this step, and what the offset now is.
 *
 * Pure: it takes the whole world it needs and returns values rather than
 * mutating. See tests/followCamera.test.js.
 *
 * @param {object} args
 * @param {{x: number, y: number}} args.targetPos - The followed body, in world units
 * @param {{x: number, y: number}} args.frameOffset - The reference frame's origin
 * @param {number} args.zoom - Current zoom
 * @param {{x: number, y: number}} args.pan - The pan as it stands right now
 * @param {?{x: number, y: number}} args.lastApplied - The pan this last wrote
 * @param {{x: number, y: number}} args.offset - The accumulated manual offset
 * @returns {{pan: {x: number, y: number}, offset: {x: number, y: number}}} The
 *   pan to apply and the offset to remember
 */
export function followCamera({
  targetPos,
  frameOffset,
  zoom,
  pan,
  lastApplied,
  offset,
}) {
  const off = frameOffset || { x: 0, y: 0 };
  const held = offset || { x: 0, y: 0 };

  // The first step after Follow is switched on has nothing to compare against,
  // so it centres exactly and starts the offset at zero. Treating the existing
  // pan as manual input there would preserve whatever the view happened to be
  // showing, which is the opposite of what "follow this" means.
  const drift = lastApplied
    ? { x: pan.x - lastApplied.x, y: pan.y - lastApplied.y }
    : { x: 0, y: 0 };

  const nextOffset = { x: held.x + drift.x, y: held.y + drift.y };

  // Follow moves the camera; a reference frame moves the coordinates. They
  // compose, so the pan that centres the target is measured in the frame the
  // target is drawn in, not in world coordinates.
  return {
    pan: {
      x: -(targetPos.x - off.x) * zoom + nextOffset.x,
      y: (targetPos.y - off.y) * zoom + nextOffset.y,
    },
    offset: nextOffset,
  };
}

/**
 * Forget the manual offset and the remembered pan.
 *
 * Called when what is being followed changes, when Follow is switched off, and
 * whenever something deliberately commands the camera - Reset view, a clean
 * simulation, a new scenario. Without it, "Reset view" while following would be
 * read as a manual drag and folded straight back into the offset it was meant
 * to clear.
 *
 * @param {object} view - The shared view state
 */
export function resetFollowCamera(view) {
  if (!view) return;
  view.followOffset = { x: 0, y: 0 };
  view.followPan = null;
  view.followTarget = null;
}
