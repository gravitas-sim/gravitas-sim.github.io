// =============================================================================
// Uniform spatial hash for broad-phase collision detection
// -----------------------------------------------------------------------------
// The collision handlers each walked their own O(N²) double loop, so a frame
// did five full pairwise sweeps. This narrows every one of them to the pairs
// that actually share a neighbourhood.
//
// A uniform grid (rather than a tree) suits this simulation: bodies are small
// relative to their separations, and the cell size can track the largest radius
// present, so the usual failure mode of uniform grids — one huge object
// touching every cell — is bounded by clamping the cell count instead.
// =============================================================================

const MIN_CELL = 8;
const MAX_CELLS = 200_000;

// Reused across frames so the hot path allocates nothing.
const buckets = new Map();
let cellSize = 64;

/**
 * Build the grid from a list of bodies.
 * @param {Array} objects - Bodies with pos and radius
 * @returns {number} The chosen cell size
 */
function build(objects) {
  buckets.clear();
  if (objects.length === 0) return cellSize;

  // Cell size tracks the largest interaction radius so that a pair can never
  // be separated by more than one cell in each axis.
  let maxRadius = 0;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const o of objects) {
    if (!o.alive) continue;
    if (o.radius > maxRadius) maxRadius = o.radius;
    if (o.pos.x < minX) minX = o.pos.x;
    if (o.pos.x > maxX) maxX = o.pos.x;
    if (o.pos.y < minY) minY = o.pos.y;
    if (o.pos.y > maxY) maxY = o.pos.y;
  }
  if (!isFinite(minX)) return cellSize;

  cellSize = Math.max(MIN_CELL, maxRadius * 2);

  // A very sparse, very wide field would otherwise allocate an enormous number
  // of cells; grow the cells instead of the map.
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  const estimate = (spanX / cellSize) * (spanY / cellSize);
  if (estimate > MAX_CELLS) {
    cellSize *= Math.sqrt(estimate / MAX_CELLS);
  }

  for (const o of objects) {
    if (!o.alive) continue;
    const key = hash(o.pos.x, o.pos.y);
    let cell = buckets.get(key);
    if (!cell) {
      cell = [];
      buckets.set(key, cell);
    }
    cell.push(o);
  }
  return cellSize;
}

function hash(x, y) {
  const cx = Math.floor(x / cellSize);
  const cy = Math.floor(y / cellSize);
  // A string key rather than a bit-mixed integer: an integer hash can alias two
  // distinct cells into one bucket, and an aliased bucket would hand the same
  // pair to visit() twice — applying a collision impulse or a merge twice.
  return `${cx},${cy}`;
}

/**
 * Visit every candidate pair exactly once.
 *
 * Correctness note: because cellSize >= 2 * maxRadius, two touching bodies
 * always land in the same or adjacent cells, so scanning the 3x3 neighbourhood
 * cannot miss a contact. Each unordered pair is yielded once — for the same
 * cell by index ordering, and for neighbours by only scanning forward.
 *
 * @param {Array} objects - Bodies with pos, radius and alive
 * @param {Function} visit - Called as visit(a, b)
 */
export function forEachCandidatePair(objects, visit) {
  if (objects.length < 2) return;

  // Below this, the grid's bookkeeping costs more than the pairs it saves.
  if (objects.length < 24) {
    for (let i = 0; i < objects.length; i++) {
      const a = objects[i];
      if (!a.alive) continue;
      for (let j = i + 1; j < objects.length; j++) {
        const b = objects[j];
        if (!b.alive) continue;
        visit(a, b);
      }
    }
    return;
  }

  build(objects);

  // Only half of the 3x3 neighbourhood is scanned; the mirrored half is
  // covered when the other cell takes its turn.
  const FORWARD = [
    [1, -1],
    [1, 0],
    [1, 1],
    [0, 1],
  ];

  for (const cell of buckets.values()) {
    // Pairs inside this cell
    for (let i = 0; i < cell.length; i++) {
      const a = cell[i];
      if (!a.alive) continue;
      for (let j = i + 1; j < cell.length; j++) {
        const b = cell[j];
        if (!b.alive) continue;
        visit(a, b);
      }
      // Pairs spanning into forward neighbours
      for (const [dx, dy] of FORWARD) {
        const other = buckets.get(
          hash(a.pos.x + dx * cellSize, a.pos.y + dy * cellSize)
        );
        if (!other) continue;
        for (const b of other) {
          if (!b.alive || b === a) continue;
          visit(a, b);
        }
      }
    }
  }
}

/** @returns {{cells:number, cellSize:number}} Grid stats, for diagnostics */
export const getGridStats = () => ({ cells: buckets.size, cellSize });
