// =============================================================================
// Undo and redo, over the workspace's list of changes
// -----------------------------------------------------------------------------
// The list of changes (./transforms.js) is the whole of what a reader did to
// an observation, so undo and redo are that list and a position in it. A new
// change after an undo discards what was ahead of it, as every editor does,
// and the list is bounded, so a long session cannot hold unbounded state.
// Selections are not changes: moving a selection is looking, not editing, and
// undo does not step through it.
// =============================================================================

/**
 * @param {{limit?: number}} [opts]
 * @returns {{push: Function, undo: Function, redo: Function, changes: Function,
 *   canUndo: Function, canRedo: Function, reset: Function}}
 */
export function createHistory({ limit = 200 } = {}) {
  let list = [];
  let at = 0;
  return {
    /** Add a change after the current position, dropping any redo. */
    push(change) {
      list = list.slice(0, at);
      list.push(change);
      if (list.length > limit) list.shift();
      at = list.length;
    },
    /** @returns {object|null} The change undone */
    undo() {
      if (!at) return null;
      at--;
      return list[at];
    },
    /** @returns {object|null} The change redone */
    redo() {
      if (at === list.length) return null;
      return list[at++];
    },
    /** The changes in force, in order. */
    changes: () => list.slice(0, at),
    canUndo: () => at > 0,
    canRedo: () => at < list.length,
    /** Start again, optionally from a saved list of changes. */
    reset(changes = []) {
      list = changes.slice(-limit);
      at = list.length;
    },
  };
}
