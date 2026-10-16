// =============================================================================
// Whether an assignment's package is the one its lesson comes from now
// -----------------------------------------------------------------------------
// An assignment made from a packaged lesson carries the package and its version
// (`p`, ./assignment.js). Opening it, the bridge (./assignmentBridge.js) asks
// this how that pin stands against what the lesson comes from today
// (./provider.js), and says so when the package has moved on or the link
// predates pinning. Its own module, so the pages that only build assignments -
// the teaching page among them - do not carry it.
// =============================================================================

/** How an assignment's pinned package stands against the lesson as it is now. */
export const PINNING = Object.freeze({
  /** Neither then nor now from a package: nothing to say. */
  NONE: 'none',
  /** The same package at the same version. */
  SAME: 'same',
  /** The same package, a newer or older version of the same major. */
  COMPATIBLE: 'compatible',
  /** The same package, another major version: it may have been rewritten. */
  MAJOR: 'major',
  /** Made from one package, and the lesson now comes from another, or none. */
  MOVED: 'moved',
  /** Made before assignments were pinned; the lesson now comes from a package. */
  UNPINNED: 'unpinned',
});

const major = version => Number(String(version).split('.')[0]);

/**
 * Whether the package an assignment was made with is the one its lesson comes
 * from now. Pure: the caller says what the lesson comes from today
 * (./provider.js lessonProvider()).
 * @param {object} assignment - A validated payload
 * @param {{id: string, version: string}|null} current
 * @returns {{status: string, pinned: object|null, current: object|null}}
 */
export function packageBinding(assignment, current) {
  const pinned = Array.isArray(assignment.p)
    ? { id: assignment.p[0], version: assignment.p[1] }
    : null;
  const out = status => ({ status, pinned, current: current || null });
  if (!pinned) return out(current ? PINNING.UNPINNED : PINNING.NONE);
  if (!current || current.id !== pinned.id) return out(PINNING.MOVED);
  if (current.version === pinned.version) return out(PINNING.SAME);
  return out(
    major(current.version) === major(pinned.version)
      ? PINNING.COMPATIBLE
      : PINNING.MAJOR
  );
}
