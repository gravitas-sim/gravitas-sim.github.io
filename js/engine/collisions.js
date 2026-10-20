// =============================================================================
// Collisions, mergers and the explosions they cause (D-DECOMP-18, slice S6)
// -----------------------------------------------------------------------------
// Moved out of js/physics.js verbatim, in their original order: the bookkeeping
// every merger shares, the broad-phase grid, the collision handlers for each
// kind of pair, and the kilonova and white-dwarf explosion builders they call.
// The explosions draw from Math.random as they go, and the order of the draws is
// part of the model: the effects trace and the seeded-step proof compare it.
// Nothing here is called by anything but js/physics.js's step, and nothing here
// imports js/physics.js.
// =============================================================================

import {
  JUPITER_MASSES_PER_SOLAR_MASS,
  SOLAR_MASS_UNIT,
} from '../constants.js';
import { debugLog } from '../utils.js';
import {
  bh_list,
  planets,
  stars,
  gas_giants,
  asteroids,
  comets,
  debris,
  gravity_ripples,
  neutron_stars,
  white_dwarfs,
  setBodyList,
  particlePool,
  physicsSettings,
} from './state.js';
import { clearObjectEnergyHistory } from './conservation.js';
import {
  broadcastImpact,
  completeMerger,
  mergeAllowed,
  mergedState,
} from './events.js';
import {
  GAS_GIANT_RADIUS,
  STAR_OBJ_RADIUS,
  maxStarMassBeforeBH,
  GAS_GIANT_TO_STAR_THRESHOLD,
  JUPITER_MASS_UNIT,
  burst,
  absorb_into_star,
  GasGiant,
  Debris,
  StarObject,
  NeutronStar,
  WhiteDwarf,
} from './bodies.js';
import { BlackHole } from './blackHole.js';

// =============================================================================
// Uniform spatial hash for broad-phase collision detection
// -----------------------------------------------------------------------------
// The collision handlers each walked their own O(N²) double loop, so a frame
// did five full pairwise sweeps. This narrows every one of them to the pairs
// that actually share a neighborhood. A uniform grid suits this simulation:
// bodies are small relative to their separations, the cell size tracks the
// largest radius present, and one huge object touching every cell is bounded
// by clamping the cell count. (Folded in from js/spatialHash.js, whose only
// importer was this module, so the engine's decomposition costs no request.)
// =============================================================================

const GRID_MIN_CELL = 8;
const GRID_MAX_CELLS = 200_000;

// Reused across frames so the hot path allocates nothing.
const gridBuckets = new Map();
let gridCellSize = 64;

/**
 * Build the grid from a list of bodies.
 * @param {Array} objects - Bodies with pos and radius
 * @returns {number} The chosen cell size
 */
function buildGrid(objects) {
  gridBuckets.clear();
  if (objects.length === 0) return gridCellSize;

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
  if (!isFinite(minX)) return gridCellSize;

  gridCellSize = Math.max(GRID_MIN_CELL, maxRadius * 2);

  // A very sparse, very wide field would otherwise allocate an enormous number
  // of cells; grow the cells instead of the map.
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  const estimate = (spanX / gridCellSize) * (spanY / gridCellSize);
  if (estimate > GRID_MAX_CELLS) {
    gridCellSize *= Math.sqrt(estimate / GRID_MAX_CELLS);
  }

  for (const o of objects) {
    if (!o.alive) continue;
    const key = gridHash(o.pos.x, o.pos.y);
    let cell = gridBuckets.get(key);
    if (!cell) {
      cell = [];
      gridBuckets.set(key, cell);
    }
    cell.push(o);
  }
  return gridCellSize;
}

function gridHash(x, y) {
  const cx = Math.floor(x / gridCellSize);
  const cy = Math.floor(y / gridCellSize);
  // A string key rather than a bit-mixed integer: an integer gridHash can alias two
  // distinct cells into one bucket, and an aliased bucket would hand the same
  // pair to visit() twice: applying a collision impulse or a merge twice.
  return `${cx},${cy}`;
}

/**
 * Visit every candidate pair exactly once.
 *
 * Correctness note: because gridCellSize >= 2 * maxRadius, two touching bodies
 * always land in the same or adjacent cells, so scanning the 3x3 neighborhood
 * cannot miss a contact. Each unordered pair is yielded once: for the same
 * cell by index ordering, and for neighbors by only scanning forward.
 *
 * @param {Array} objects - Bodies with pos, radius and alive
 * @param {Function} visit - Called as visit(a, b)
 */
function forEachCandidatePair(objects, visit) {
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

  buildGrid(objects);

  // Only half of the 3x3 neighborhood is scanned; the mirrored half is
  // covered when the other cell takes its turn.
  const FORWARD = [
    [1, -1],
    [1, 0],
    [1, 1],
    [0, 1],
  ];

  for (const cell of gridBuckets.values()) {
    // Pairs inside this cell
    for (let i = 0; i < cell.length; i++) {
      const a = cell[i];
      if (!a.alive) continue;
      for (let j = i + 1; j < cell.length; j++) {
        const b = cell[j];
        if (!b.alive) continue;
        visit(a, b);
      }
      // Pairs spanning into forward neighbors
      for (const [dx, dy] of FORWARD) {
        const other = gridBuckets.get(
          gridHash(a.pos.x + dx * gridCellSize, a.pos.y + dy * gridCellSize)
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

// Handle collisions between objects
/**
 * Handle collisions between objects in the simulation
 * @param {Array} objects_list - Array of physics objects to check for collisions
 */
export const handle_collisions = objects_list => {
  // Broad phase: only pairs sharing a grid neighborhood reach the contact
  // test, instead of every pair in the list.
  forEachCandidatePair(objects_list, (obj1, obj2) => {
    {
      const dx = obj2.pos.x - obj1.pos.x;
      const dy = obj2.pos.y - obj1.pos.y;
      const dist_sq = dx * dx + dy * dy;
      const min_dist = obj1.radius + obj2.radius;

      if (dist_sq < min_dist ** 2 && dist_sq > 1e-6) {
        const dist = Math.sqrt(dist_sq);
        const overlap = min_dist - dist;
        const nx = dx / dist;
        const ny = dy / dist;

        // Separate objects
        const total_mass = obj1.mass + obj2.mass;
        const move1 = -overlap * (obj2.mass / total_mass);
        const move2 = overlap * (obj1.mass / total_mass);

        obj1.pos.x += move1 * nx;
        obj1.pos.y += move1 * ny;
        obj2.pos.x += move2 * nx;
        obj2.pos.y += move2 * ny;

        // Handle collision response
        const rvx = obj2.vel.x - obj1.vel.x;
        const rvy = obj2.vel.y - obj1.vel.y;
        const vel_normal = rvx * nx + rvy * ny;

        if (vel_normal < 0) {
          const e = 0.8; // Coefficient of restitution
          const j = (-(1 + e) * vel_normal) / (1 / obj1.mass + 1 / obj2.mass);
          const impx = j * nx;
          const impy = j * ny;

          obj1.vel.x -= impx / obj1.mass;
          obj1.vel.y -= impy / obj1.mass;
          obj2.vel.x += impx / obj2.mass;
          obj2.vel.y += impy / obj2.mass;
        }
      }
    }
  });
};

/** Create a spectacular kilonova explosion when neutron stars merge (pos, mass). */
const createKilonovaExplosion = (pos, mass) => {
  // Kilonova parameters based on mass
  const massInSuns = mass / SOLAR_MASS_UNIT;
  const explosionIntensity = Math.min(2.0, massInSuns / 2.0); // Scale with mass

  const particleCount = Math.floor(200 + massInSuns * 50); // 200-400 particles based on mass

  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const speed = (Math.random() * 300 + 200) * explosionIntensity; // 200-500 speed units

    const vel = {
      x: speed * Math.cos(angle),
      y: speed * Math.sin(angle),
    };

    // Random position within explosion radius
    const radius = Math.random() * 50;
    const spawnAngle = Math.random() * 2 * Math.PI;
    const spawnPos = {
      x: pos.x + radius * Math.cos(spawnAngle),
      y: pos.y + radius * Math.sin(spawnAngle),
    };

    // Kilonova colors: bright blue-white to orange-red
    const colors = [
      'rgb(255, 255, 255)', // Pure white
      'rgb(255, 255, 200)', // Bright yellow
      'rgb(255, 200, 100)', // Orange
      'rgb(255, 150, 50)', // Bright orange
      'rgb(255, 100, 0)', // Red-orange
      'rgb(200, 100, 255)', // Purple (r-process elements)
      'rgb(100, 200, 255)', // Blue (gamma rays)
    ];

    const color = colors[Math.floor(Math.random() * colors.length)];

    const particle = particlePool.getParticle(
      spawnPos,
      vel,
      Math.random() * 3.0 + 2.0, // 2-5 second lifetime
      Math.random() * 15 + 10, // 10-25 start size
      Math.random() * 3 + 1, // 1-4 end size
      color
    );

    if (particle) {
      particle.kilonova_glow = true;
      particle.glow_intensity = Math.random() * 0.5 + 0.5;
    }
  }

  gravity_ripples.push({
    x: pos.x,
    y: pos.y,
    time: Date.now(),
    created: performance.now(),
    duration: 3000, // 3 seconds - reduced from 5 seconds
    mass: massInSuns,
    gw_strength: 0.4, // Reduced strength from 1.0 to 0.4
    kilonova: true, // Special flag for kilonova GW
  });

  for (let i = 0; i < 50; i++) {
    const angle = (i / 50) * 2 * Math.PI;
    const speed = 150 + Math.random() * 100;
    const vel = {
      x: speed * Math.cos(angle),
      y: speed * Math.sin(angle),
    };

    particlePool.getParticle(
      pos,
      vel,
      Math.random() * 2.0 + 1.0, // 1-3 second lifetime
      Math.random() * 8 + 5, // 5-13 start size
      Math.random() * 2 + 1, // 1-3 end size
      'rgb(255, 255, 255)' // White shockwave
    );
  }
};

/** Create a smaller kilonova explosion when neutron stars merge but don't form a black hole (pos, mass). */
const createSmallKilonovaExplosion = (pos, mass) => {
  // Kilonova parameters based on mass (reduced intensity)
  const massInSuns = mass / SOLAR_MASS_UNIT;
  const explosionIntensity = Math.min(1.0, massInSuns / 3.0); // Reduced intensity for smaller explosions

  const particleCount = Math.floor(100 + massInSuns * 25); // 100-200 particles (half of full kilonova)

  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const speed = (Math.random() * 200 + 150) * explosionIntensity; // 150-350 speed units (reduced)

    const vel = {
      x: speed * Math.cos(angle),
      y: speed * Math.sin(angle),
    };

    // Random position within explosion radius (smaller)
    const radius = Math.random() * 30;
    const spawnAngle = Math.random() * 2 * Math.PI;
    const spawnPos = {
      x: pos.x + radius * Math.cos(spawnAngle),
      y: pos.y + radius * Math.sin(spawnAngle),
    };

    // Kilonova colors: bright blue-white to orange-red (same as full kilonova)
    const colors = [
      'rgb(255, 255, 255)', // Pure white
      'rgb(255, 255, 200)', // Bright yellow
      'rgb(255, 200, 100)', // Orange
      'rgb(255, 150, 50)', // Bright orange
      'rgb(255, 100, 0)', // Red-orange
      'rgb(200, 100, 255)', // Purple (r-process elements)
      'rgb(100, 200, 255)', // Blue (gamma rays)
    ];

    const color = colors[Math.floor(Math.random() * colors.length)];

    const particle = particlePool.getParticle(
      spawnPos,
      vel,
      Math.random() * 2.0 + 1.5, // 1.5-3.5 second lifetime (shorter)
      Math.random() * 10 + 6, // 6-16 start size (smaller)
      Math.random() * 2 + 1, // 1-3 end size (smaller)
      color
    );

    if (particle) {
      particle.kilonova_glow = true;
      particle.glow_intensity = Math.random() * 0.3 + 0.3; // Reduced glow
    }
  }

  gravity_ripples.push({
    x: pos.x,
    y: pos.y,
    time: Date.now(),
    created: performance.now(),
    duration: 2000, // 2 seconds (shorter than full kilonova)
    mass: massInSuns,
    gw_strength: 0.2, // Reduced strength
    kilonova: true, // Special flag for kilonova GW
  });

  for (let i = 0; i < 25; i++) {
    const angle = (i / 25) * 2 * Math.PI;
    const speed = 100 + Math.random() * 75; // Reduced speed
    const vel = {
      x: speed * Math.cos(angle),
      y: speed * Math.sin(angle),
    };

    particlePool.getParticle(
      pos,
      vel,
      Math.random() * 1.5 + 0.8, // 0.8-2.3 second lifetime (shorter)
      Math.random() * 6 + 3, // 3-9 start size (smaller)
      Math.random() * 1.5 + 0.5, // 0.5-2 end size (smaller)
      'rgb(255, 255, 255)' // White shockwave
    );
  }
};

/** Create a moderate explosion when neutron star and white dwarf merge (pos, mass). */
const createNSWDExplosion = (pos, mass) => {
  const massInSuns = mass / SOLAR_MASS_UNIT;
  const explosionIntensity = Math.min(1.5, massInSuns / 1.5); // Moderate intensity

  const particleCount = Math.floor(80 + massInSuns * 30); // 80-150 particles

  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const speed = (Math.random() * 200 + 150) * explosionIntensity; // 150-350 speed units

    const vel = {
      x: speed * Math.cos(angle),
      y: speed * Math.sin(angle),
    };

    const radius = Math.random() * 30;
    const spawnAngle = Math.random() * 2 * Math.PI;
    const spawnPos = {
      x: pos.x + radius * Math.cos(spawnAngle),
      y: pos.y + radius * Math.sin(spawnAngle),
    };

    // NS-WD colors: white to blue-white
    const colors = [
      'rgb(255, 255, 255)', // Pure white
      'rgb(255, 255, 220)', // Bright white-yellow
      'rgb(220, 255, 255)', // Cyan-white
      'rgb(200, 220, 255)', // Blue-white
      'rgb(255, 220, 200)', // Pink-white
      'rgb(180, 200, 255)', // Light blue
    ];

    const color = colors[Math.floor(Math.random() * colors.length)];

    const particle = particlePool.getParticle(
      spawnPos,
      vel,
      Math.random() * 2.0 + 1.5, // 1.5-3.5 second lifetime
      Math.random() * 10 + 6, // 6-16 start size
      Math.random() * 2 + 1, // 1-3 end size
      color
    );

    if (particle) {
      particle.kilonova_glow = true;
      particle.glow_intensity = Math.random() * 0.3 + 0.3; // Moderate glow
    }
  }

  gravity_ripples.push({
    x: pos.x,
    y: pos.y,
    time: Date.now(),
    created: performance.now(),
    duration: 3000, // 3 seconds
    mass: massInSuns,
    gw_strength: 0.6, // Moderate strength
    nswd_merger: true, // Special flag for NS-WD merger
  });

  for (let i = 0; i < 25; i++) {
    const angle = (i / 25) * 2 * Math.PI;
    const speed = 120 + Math.random() * 80;
    const vel = {
      x: speed * Math.cos(angle),
      y: speed * Math.sin(angle),
    };

    particlePool.getParticle(
      pos,
      vel,
      Math.random() * 1.5 + 0.8, // 0.8-2.3 second lifetime
      Math.random() * 6 + 4, // 4-10 start size
      Math.random() * 2 + 1, // 1-3 end size
      'rgb(255, 255, 255)' // White shockwave
    );
  }
};

/** Create a smaller explosion when white dwarfs merge (pos, mass). */
const createWDWDExplosion = (pos, mass) => {
  const massInSuns = mass / SOLAR_MASS_UNIT;
  const explosionIntensity = Math.min(1.0, massInSuns / 1.0); // Smaller intensity

  const particleCount = Math.floor(40 + massInSuns * 20); // 40-80 particles

  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const speed = (Math.random() * 150 + 100) * explosionIntensity; // 100-250 speed units

    const vel = {
      x: speed * Math.cos(angle),
      y: speed * Math.sin(angle),
    };

    const radius = Math.random() * 20;
    const spawnAngle = Math.random() * 2 * Math.PI;
    const spawnPos = {
      x: pos.x + radius * Math.cos(spawnAngle),
      y: pos.y + radius * Math.sin(spawnAngle),
    };

    // WD-WD colors: white to yellow
    const colors = [
      'rgb(255, 255, 255)', // Pure white
      'rgb(255, 255, 240)', // Off-white
      'rgb(255, 250, 220)', // Cream
      'rgb(255, 240, 200)', // Light yellow
      'rgb(255, 230, 180)', // Pale yellow
      'rgb(240, 240, 255)', // Very light blue
    ];

    const color = colors[Math.floor(Math.random() * colors.length)];

    const particle = particlePool.getParticle(
      spawnPos,
      vel,
      Math.random() * 1.5 + 1.0, // 1-2.5 second lifetime
      Math.random() * 6 + 4, // 4-10 start size
      Math.random() * 2 + 1, // 1-3 end size
      color
    );

    if (particle) {
      particle.kilonova_glow = true;
      particle.glow_intensity = Math.random() * 0.2 + 0.2; // Subtle glow
    }
  }

  gravity_ripples.push({
    x: pos.x,
    y: pos.y,
    time: Date.now(),
    created: performance.now(),
    duration: 2000, // 2 seconds
    mass: massInSuns,
    gw_strength: 0.3, // Smaller strength
    wdwd_merger: true, // Special flag for WD-WD merger
  });

  for (let i = 0; i < 15; i++) {
    const angle = (i / 15) * 2 * Math.PI;
    const speed = 80 + Math.random() * 60;
    const vel = {
      x: speed * Math.cos(angle),
      y: speed * Math.sin(angle),
    };

    particlePool.getParticle(
      pos,
      vel,
      Math.random() * 1.0 + 0.5, // 0.5-1.5 second lifetime
      Math.random() * 4 + 3, // 3-7 start size
      Math.random() * 1 + 1, // 1-2 end size
      'rgb(255, 255, 255)' // White shockwave
    );
  }
};

/**
 * Drop objects that are no longer alive, releasing their energy history.
 * A plain `.filter(o => o.alive)` at a removal site silently orphans the
 * object's entry in the energy history map.
 * @param {Array} list - Array of physics objects
 * @returns {Array} New array containing only living objects
 */
const purgeDead = list =>
  list.filter(o => {
    if (o.alive) return true;
    clearObjectEnergyHistory(o.id);
    return false;
  });

export const className = o =>
  (typeof o?.kind === 'string' && o.kind) || (o ? 'Object' : '');

// Handle star merging - stars combining into more massive objects
/**
 * Handle merging between stars, neutron stars, and white dwarfs
 * @param {Array} stars_list - Array of star objects to check for merging
 */
export const handle_star_merging = stars_list => {
  if (!physicsSettings.enable_star_merging) return;

  let merged_this_step = true;
  while (merged_this_step && stars_list.length > 1) {
    merged_this_step = false;

    for (let i = 0; i < stars_list.length; i++) {
      const star1 = stars_list[i];
      if (!star1.alive) continue;

      for (let j = i + 1; j < stars_list.length; j++) {
        const star2 = stars_list[j];
        if (!star2.alive) continue;
        // Same rule as the black-hole loop above: what a prescribed model owns,
        // the integrator does not merge. The neutron-star pair a lesson stages
        // is the case this catches.
        if (!mergeAllowed(star1, star2)) continue;

        const dx = star1.pos.x - star2.pos.x;
        const dy = star1.pos.y - star2.pos.y;
        const dist_sq = dx * dx + dy * dy;
        const min_dist = star1.radius + star2.radius;

        if (dist_sq < min_dist ** 2 && dist_sq > 1e-6) {
          // By class, never obj_type: a transformed body carries the obj_type
          // of what it became and the class of what it was.
          const star1_type = star1.kind;
          const star2_type = star2.kind;

          // Skip BH-BH pairs here; dedicated BH-BH merger runs separately
          if (star1_type === 'BlackHole' && star2_type === 'BlackHole') {
            continue;
          }

          const m1 = star1.mass;
          const m2 = star2.mass;
          const new_mass = m1 + m2;
          const new_mass_in_suns = new_mass / SOLAR_MASS_UNIT;

          // Calculate center of mass position and velocity
          const new_pos = {
            x: (star1.pos.x * m1 + star2.pos.x * m2) / new_mass,
            y: (star1.pos.y * m1 + star2.pos.y * m2) / new_mass,
          };
          const new_vel = {
            x: (star1.vel.x * m1 + star2.vel.x * m2) / new_mass,
            y: (star1.vel.y * m1 + star2.vel.y * m2) / new_mass,
          };

          // Create merger particles
          burst('starMerge', new_pos);

          // Special handling for black hole merging with regular star or white dwarf
          if (
            (star1_type === 'BlackHole' &&
              (star2_type === 'StarObject' ||
                star2_type === 'WhiteDwarf' ||
                star2_type === 'NeutronStar')) ||
            (star2_type === 'BlackHole' &&
              (star1_type === 'StarObject' ||
                star1_type === 'WhiteDwarf' ||
                star1_type === 'NeutronStar'))
          ) {
            // Find the real black hole object
            const bh =
              star1_type === 'BlackHole'
                ? star1._bh_ref || star1
                : star2._bh_ref || star2;
            const other = star1_type === 'BlackHole' ? star2 : star1;
            // Add the mass of the other object to the black hole
            const total_mass = bh.mass + other.mass;
            bh.vel.x =
              (bh.vel.x * bh.mass + other.vel.x * other.mass) / total_mass;
            bh.vel.y =
              (bh.vel.y * bh.mass + other.vel.y * other.mass) / total_mass;
            bh.mass = total_mass;
            bh.updateRadius();
            // Subtle gravitational wave effect for all such mergers
            gravity_ripples.push({
              x: bh.pos.x,
              y: bh.pos.y,
              time: Date.now(),
              created: performance.now(),
              duration: 1800,
              mass: Math.max(0.2, (total_mass / SOLAR_MASS_UNIT) * 0.25),
              gw_strength: 0.13,
            });
            // Mark only the non-BH as dead
            other.alive = false;
            // Remove the non-BH from its global list
            if (other.kind === 'StarObject')
              setBodyList(
                'stars',
                stars.filter(s => s !== other)
              );
            if (other.kind === 'WhiteDwarf') clearObjectEnergyHistory(other.id);
            setBodyList(
              'white_dwarfs',
              white_dwarfs.filter(wd => wd !== other)
            );
            if (other.kind === 'NeutronStar')
              clearObjectEnergyHistory(other.id);
            setBodyList(
              'neutron_stars',
              neutron_stars.filter(ns => ns !== other)
            );
            // No new black hole is created, and the existing one remains in
            // bh_list - so it is the result. completeMerger declines to retire
            // a progenitor that is also the result, and a reader following the
            // star it consumed is moved onto the hole rather than back to the
            // world origin.
            completeMerger(other, bh, bh);
            merged_this_step = true;
            break;
          }
          // Remove the two original stars
          star1.alive = false;
          star2.alive = false;

          // Determine what type of object to create based on mass and original types
          let new_object = null;

          // Check if either object is a neutron star or white dwarf
          const has_neutron_star =
            star1_type === 'NeutronStar' || star2_type === 'NeutronStar';
          const has_white_dwarf =
            star1_type === 'WhiteDwarf' || star2_type === 'WhiteDwarf';
          const has_regular_star =
            star1_type === 'StarObject' || star2_type === 'StarObject';

          if (has_neutron_star) {
            // Neutron star involved in merger
            const is_bh_merger =
              star1_type === 'BlackHole' || star2_type === 'BlackHole';
            if (is_bh_merger) {
              // NS-BH merger: subtle GW ripple (same as NS-NS)
              new_object = new BlackHole(new_pos, new_mass, new_vel, true);
              bh_list.push(new_object);
              clearObjectEnergyHistory(star1.id);
              clearObjectEnergyHistory(star2.id);
              setBodyList(
                'neutron_stars',
                neutron_stars.filter(ns => ns !== star1 && ns !== star2)
              );
              if (star1_type === 'BlackHole' && star1._bh_ref) {
                star1._bh_ref.alive = false;
                setBodyList(
                  'bh_list',
                  bh_list.filter(bh => bh !== star1._bh_ref)
                );
              }
              if (star2_type === 'BlackHole' && star2._bh_ref) {
                star2._bh_ref.alive = false;
                setBodyList(
                  'bh_list',
                  bh_list.filter(bh => bh !== star2._bh_ref)
                );
              }
              gravity_ripples.push({
                x: new_pos.x,
                y: new_pos.y,
                time: Date.now(),
                created: performance.now(),
                duration: 1200, // ms, subtle
                mass: Math.max(0.2, (new_mass / SOLAR_MASS_UNIT) * 0.18),
                gw_strength: 0.08, // subtle
              });
            } else if (new_mass_in_suns > 3.0) {
              // Exceeds Tolman-Oppenheimer-Volkoff limit -> black hole
              // Check if this is a neutron star-neutron star merger (kilonova)
              const is_ns_ns_merger =
                star1_type === 'NeutronStar' && star2_type === 'NeutronStar';

              if (is_ns_ns_merger) {
                // Create spectacular kilonova explosion for black hole formation
                createKilonovaExplosion(new_pos, new_mass);
              }

              new_object = new BlackHole(new_pos, new_mass, new_vel, true);
              bh_list.push(new_object);
              // Remove merged neutron star from global list
              clearObjectEnergyHistory(star1.id);
              clearObjectEnergyHistory(star2.id);
              setBodyList(
                'neutron_stars',
                neutron_stars.filter(ns => ns !== star1 && ns !== star2)
              );

              // Only add regular GW ripple if not a kilonova (kilonova creates its own)
              if (!is_ns_ns_merger) {
                gravity_ripples.push({
                  x: new_pos.x,
                  y: new_pos.y,
                  time: Date.now(),
                  created: performance.now(),
                  duration: 3000, // ms, longer and more visible for NS-BH mergers
                  mass: new_mass / SOLAR_MASS_UNIT,
                  gw_strength: 0.5, // More apparent for NS-BH merger
                });
              }
            } else {
              // Stays as neutron star
              // Check if this is a neutron star-neutron star merger (smaller kilonova)
              const is_ns_ns_merger =
                star1_type === 'NeutronStar' && star2_type === 'NeutronStar';

              if (is_ns_ns_merger) {
                // Create smaller kilonova explosion for neutron star formation
                createSmallKilonovaExplosion(new_pos, new_mass);
              } else {
                // Check if this is a neutron star-white dwarf merger
                const is_ns_wd_merger =
                  (star1_type === 'NeutronStar' &&
                    star2_type === 'WhiteDwarf') ||
                  (star1_type === 'WhiteDwarf' && star2_type === 'NeutronStar');

                if (is_ns_wd_merger) {
                  // Create neutron star-white dwarf merger explosion
                  debugLog(
                    'NS-WD merger detected in neutron star section! Mass:',
                    new_mass_in_suns,
                    'solar masses'
                  );
                  createNSWDExplosion(new_pos, new_mass);
                }
              }

              new_object = new NeutronStar(
                new_pos,
                new_vel,
                new_mass_in_suns,
                null
              );
              neutron_stars.push(new_object);
            }
          } else if (has_white_dwarf) {
            // White dwarf involved in merger
            if (new_mass_in_suns > 1.4) {
              // Exceeds Chandrasekhar limit -> neutron star
              // Check if this is a neutron star-white dwarf merger
              const is_ns_wd_merger =
                (star1_type === 'NeutronStar' && star2_type === 'WhiteDwarf') ||
                (star1_type === 'WhiteDwarf' && star2_type === 'NeutronStar');

              // Check if this is a white dwarf-white dwarf merger
              const is_wd_wd_merger =
                star1_type === 'WhiteDwarf' && star2_type === 'WhiteDwarf';

              if (is_ns_wd_merger) {
                // Create neutron star-white dwarf merger explosion
                debugLog(
                  'NS-WD merger detected! Mass:',
                  new_mass_in_suns,
                  'solar masses'
                );
                createNSWDExplosion(new_pos, new_mass);
              } else if (is_wd_wd_merger) {
                // Create white dwarf-white dwarf merger explosion (results in neutron star)
                createWDWDExplosion(new_pos, new_mass);
              }

              new_object = new NeutronStar(
                new_pos,
                new_vel,
                new_mass_in_suns,
                null
              );
              neutron_stars.push(new_object);

              // Only add regular GW ripple if not a special merger (explosion creates its own)
              if (!is_ns_wd_merger && !is_wd_wd_merger) {
                gravity_ripples.push({
                  x: new_pos.x,
                  y: new_pos.y,
                  time: Date.now(),
                  created: performance.now(),
                  duration: 1800, // ms, even shorter
                  mass: new_mass / SOLAR_MASS_UNIT,
                  gw_strength: 0.1, // WD-NS or WD-BH merger
                });
              }
            } else {
              // Stays as white dwarf (rare case when combined mass <= 1.4 solar masses)
              new_object = new WhiteDwarf(new_pos, new_vel, new_mass_in_suns);
              white_dwarfs.push(new_object);
            }
          } else if (has_regular_star) {
            // Regular star merging
            if (new_mass_in_suns > maxStarMassBeforeBH()) {
              // Exceeds maximum star mass -> black hole
              new_object = new BlackHole(new_pos, new_mass, new_vel, true);
              bh_list.push(new_object);
              gravity_ripples.push({
                x: new_pos.x,
                y: new_pos.y,
                time: Date.now(),
                created: performance.now(),
                duration: 1200, // ms, subtle
                mass: Math.max(0.2, (new_mass / SOLAR_MASS_UNIT) * 0.18),
                gw_strength: 0.08, // subtle
              });
            } else if (new_mass_in_suns > 8.0) {
              // Massive star -> neutron star
              new_object = new NeutronStar(
                new_pos,
                new_vel,
                new_mass_in_suns,
                null
              );
              neutron_stars.push(new_object);
              gravity_ripples.push({
                x: new_pos.x,
                y: new_pos.y,
                time: Date.now(),
                created: performance.now(),
                duration: 2200, // ms, shorter for smaller mergers
                mass: new_mass / SOLAR_MASS_UNIT,
                gw_strength: 0.2, // NS-NS or NS-BH merger
              });
            } else {
              // Regular star
              new_object = new StarObject(new_pos, new_vel, new_mass_in_suns);
              stars.push(new_object);
            }
          }

          // One call for all nine branches above. Each of them decided what
          // forms - a star, a white dwarf, a neutron star or a black hole -
          // and pushed it into its own collection; this is the bookkeeping
          // every one of them shares, and until now none of them did. A star
          // that merged while the reader was following it announced nothing,
          // so js/ui.js had no result to move the frame and the inspector
          // onto.
          completeMerger(star1, star2, new_object);

          merged_this_step = true;
          break;
        }
      }
      if (merged_this_step) break;
    }

    // Purge dead objects from global arrays so subsequent iterations
    // and later collision handlers never see stale references.
    setBodyList('stars', purgeDead(stars));
    setBodyList('neutron_stars', purgeDead(neutron_stars));
    setBodyList('white_dwarfs', purgeDead(white_dwarfs));

    // Rebuild stars_list from global lists (wrap BHs for consistent _bh_ref access)
    stars_list = [
      ...stars,
      ...neutron_stars,
      ...white_dwarfs,
      ...bh_list.map(asPhysicsObject),
    ].filter(obj => obj.alive);
  }
};

/**
 * A star takes in a smaller body: mass and momentum through absorb_into_star
 * (D-R10-23), then what depends on the new mass, the burst and the event.
 */
const starAbsorbs = (star, body, burstKind) => {
  absorb_into_star(star, body);
  star.massInSuns = star.mass / SOLAR_MASS_UNIT;
  if (star.kind === 'StarObject') {
    star.radius = STAR_OBJ_RADIUS * Math.pow(star.massInSuns, 0.85);
  }
  burst(burstKind, body.pos);
  body.alive = false;
  broadcastImpact(star, body, 'stellar-absorption');
};

// Handle collisions between stars and smaller objects (planets, gas giants, asteroids)
/**
 * Handle stars absorbing planets, gas giants, and asteroids
 */
export const handle_star_object_collisions = () => {
  // Collect all stellar objects (stars, neutron stars, white dwarfs)
  const stellar_objects = [
    ...stars.filter(s => s.alive),
    ...neutron_stars.filter(s => s.alive),
    ...white_dwarfs.filter(s => s.alive),
  ];

  // Check collisions between stellar objects and smaller objects
  for (const star of stellar_objects) {
    // Check with planets
    for (let j = 0; j < planets.length; j++) {
      const planet = planets[j];
      if (!planet.alive) continue;

      const dx = planet.pos.x - star.pos.x;
      const dy = planet.pos.y - star.pos.y;
      const dist_sq = dx * dx + dy * dy;
      const min_dist = star.radius + planet.radius;

      if (dist_sq < min_dist ** 2 && dist_sq > 1e-6) {
        starAbsorbs(star, planet, 'starPlanet');
      }
    }

    // Check with gas giants
    for (let j = 0; j < gas_giants.length; j++) {
      const gasGiant = gas_giants[j];
      if (!gasGiant.alive) continue;

      const dx = gasGiant.pos.x - star.pos.x;
      const dy = gasGiant.pos.y - star.pos.y;
      const dist_sq = dx * dx + dy * dy;
      const min_dist = star.radius + gasGiant.radius;

      if (dist_sq < min_dist ** 2 && dist_sq > 1e-6) {
        starAbsorbs(star, gasGiant, 'starGas');
      }
    }

    // Check with asteroids and comets
    const smallBodies = comets.length ? asteroids.concat(comets) : asteroids;
    for (let j = 0; j < smallBodies.length; j++) {
      const asteroid = smallBodies[j];
      if (!asteroid.alive) continue;

      const dx = asteroid.pos.x - star.pos.x;
      const dy = asteroid.pos.y - star.pos.y;
      const dist_sq = dx * dx + dy * dy;
      const min_dist = star.radius + asteroid.radius;

      if (dist_sq < min_dist ** 2 && dist_sq > 1e-6) {
        starAbsorbs(star, asteroid, 'starAsteroid');
      }
    }
  }
};

// Enhanced rocky planet collision handling
/**
 * Handle collisions between rocky planets with realistic physics
 * @param {Array} objects_list - Array of physics objects to check for collisions
 */
const ROCKY_TYPES = new Set(['Planet', 'Asteroid', 'Comet']);

export const handle_rocky_collisions = objects_list => {
  // Comets are included: they are solid bodies and were previously able to fly
  // straight through planets and asteroids because this filter excluded them.
  const rocky_objects = objects_list.filter(obj => ROCKY_TYPES.has(obj.kind));

  // This is the densest pairwise pass in the frame - the Kuiper Belt scenario
  // alone puts 300+ rocky bodies through it - so it gets the broad phase.
  forEachCandidatePair(rocky_objects, (obj1, obj2) => {
    {
      const dx = obj2.pos.x - obj1.pos.x;
      const dy = obj2.pos.y - obj1.pos.y;
      const dist_sq = dx * dx + dy * dy;
      const min_dist = obj1.radius + obj2.radius;

      if (dist_sq < min_dist ** 2 && dist_sq > 1e-6) {
        const dist = Math.sqrt(dist_sq);
        const overlap = min_dist - dist;
        const nx = dx / dist;
        const ny = dy / dist;

        // Calculate relative velocity
        const rvx = obj2.vel.x - obj1.vel.x;
        const rvy = obj2.vel.y - obj1.vel.y;
        const rel_speed = Math.sqrt(rvx * rvx + rvy * rvy);

        // High-speed collisions create debris
        if (rel_speed > 15) {
          // Create debris from collision
          const debris_count = Math.floor(rel_speed / 8) + 2;
          for (let k = 0; k < debris_count; k++) {
            const angle = Math.random() * 2 * Math.PI;
            const speed = Math.random() * rel_speed * 0.5 + 5;
            const debris_vel = {
              x: speed * Math.cos(angle) + (obj1.vel.x + obj2.vel.x) * 0.5,
              y: speed * Math.sin(angle) + (obj1.vel.y + obj2.vel.y) * 0.5,
            };
            const debris_pos = {
              x: (obj1.pos.x + obj2.pos.x) * 0.5 + (Math.random() - 0.5) * 10,
              y: (obj1.pos.y + obj2.pos.y) * 0.5 + (Math.random() - 0.5) * 10,
            };
            debris.push(new Debris(debris_pos, debris_vel));
          }

          // Both objects lose mass from collision. The reported mass has to
          // follow the simulated one: leaving massInEarths behind is how a body
          // ends up gravitating as one thing and labeled as another.
          for (const obj of [obj1, obj2]) {
            obj.mass *= 0.9;
            if (obj.massInEarths != null) obj.massInEarths *= 0.9;
            if (obj.massInJupiters != null) obj.massInJupiters *= 0.9;
            if (obj.massInSuns != null) obj.massInSuns *= 0.9;
          }

          // Create collision particles
          burst('rocky', {
            x: (obj1.pos.x + obj2.pos.x) * 0.5,
            y: (obj1.pos.y + obj2.pos.y) * 0.5,
          });

          broadcastImpact(obj1, obj2, 'rocky-collision');
        }

        // Separate objects
        const total_mass = obj1.mass + obj2.mass;
        const move1 = -overlap * (obj2.mass / total_mass);
        const move2 = overlap * (obj1.mass / total_mass);

        obj1.pos.x += move1 * nx;
        obj1.pos.y += move1 * ny;
        obj2.pos.x += move2 * nx;
        obj2.pos.y += move2 * ny;

        // Handle collision response with more realistic coefficient
        const vel_normal = rvx * nx + rvy * ny;
        if (vel_normal < 0) {
          const e = 0.3; // Lower restitution for rocky objects
          const j = (-(1 + e) * vel_normal) / (1 / obj1.mass + 1 / obj2.mass);
          const impx = j * nx;
          const impy = j * ny;

          obj1.vel.x -= impx / obj1.mass;
          obj1.vel.y -= impy / obj1.mass;
          obj2.vel.x += impx / obj2.mass;
          obj2.vel.y += impy / obj2.mass;
        }
      }
    }
  });
};

// Check for stellar collapse into black holes
/**
 * Check if any stars have exceeded the maximum mass and convert them to black holes
 */
export const check_stellar_collapse = () => {
  // Check regular stars
  for (let i = stars.length - 1; i >= 0; i--) {
    const star = stars[i];
    if (!star.alive) continue;
    // Not a star a prescribed model owns. "The model owns this" has to mean
    // its evolution as well as its motion, or the sandbox's own rules keep
    // acting on it: a lesson standing a forty-solar-mass track on the canvas
    // had it collapse into a black hole two seconds later, which is the
    // sandbox making a claim about a body it is only being asked to draw.
    if (star.model_owned) continue;

    const massInSuns = star.mass / SOLAR_MASS_UNIT;
    if (massInSuns > maxStarMassBeforeBH()) {
      // Convert star to black hole - mark as newly created for proper accretion disk initialization
      const new_bh = new BlackHole(star.pos, star.mass, star.vel, true);
      bh_list.push(new_bh);

      // Create collapse particles
      burst('collapseStar', star.pos);

      // Remove the star
      star.alive = false;
      clearObjectEnergyHistory(star.id);
      stars.splice(i, 1);
    }
  }

  // Check neutron stars for collapse to black holes
  for (let i = neutron_stars.length - 1; i >= 0; i--) {
    const ns = neutron_stars[i];
    if (!ns.alive) continue;

    const massInSuns = ns.mass / SOLAR_MASS_UNIT;
    if (massInSuns > 3.0) {
      // Tolman-Oppenheimer-Volkoff limit
      // Convert neutron star to black hole - mark as newly created for proper accretion disk initialization
      const new_bh = new BlackHole(ns.pos, ns.mass, ns.vel, true);
      bh_list.push(new_bh);

      // Create collapse particles
      burst('collapseNS', ns.pos);

      // Remove the neutron star
      ns.alive = false;
      clearObjectEnergyHistory(ns.id);
      neutron_stars.splice(i, 1);
    }
  }

  // Check white dwarfs for collapse to neutron stars
  for (let i = white_dwarfs.length - 1; i >= 0; i--) {
    const wd = white_dwarfs[i];
    if (!wd.alive) continue;

    const massInSuns = wd.mass / SOLAR_MASS_UNIT;
    if (massInSuns > 1.4) {
      // Chandrasekhar limit
      // Convert white dwarf to neutron star
      const new_ns = new NeutronStar(wd.pos, wd.vel, massInSuns, null);
      neutron_stars.push(new_ns);

      // Create collapse particles
      burst('collapseWD', wd.pos);

      // Remove the white dwarf
      wd.alive = false;
      clearObjectEnergyHistory(wd.id);
      white_dwarfs.splice(i, 1);
    }
  }
};

/**
 * Gas giants sweeping up smaller bodies.
 *
 * Nothing previously handled gas giant against planet, asteroid or comet, so
 * those bodies passed through a gas giant and sat visibly inside it. A giant is
 * orders of magnitude more massive than anything in this set, so the physical
 * outcome is accretion rather than a bounce: the impactor is absorbed and the
 * giant grows.
 */
export const handle_gas_giant_accretion = () => {
  if (gas_giants.length === 0) return;
  const smallBodies = [planets, asteroids, comets];

  for (const gasGiant of gas_giants) {
    if (!gasGiant.alive) continue;

    for (const list of smallBodies) {
      for (const body of list) {
        if (!body.alive) continue;

        const dx = body.pos.x - gasGiant.pos.x;
        const dy = body.pos.y - gasGiant.pos.y;
        const distSq = dx * dx + dy * dy;
        const contact = gasGiant.radius + body.radius;
        if (distSq >= contact * contact) continue;

        // Momentum is conserved through the accretion
        const total = gasGiant.mass + body.mass;
        if (total > 0) {
          gasGiant.vel.x =
            (gasGiant.vel.x * gasGiant.mass + body.vel.x * body.mass) / total;
          gasGiant.vel.y =
            (gasGiant.vel.y * gasGiant.mass + body.vel.y * body.mass) / total;
        }
        gasGiant.mass = total;
        gasGiant.massInJupiters = gasGiant.mass / JUPITER_MASS_UNIT;
        gasGiant.radius =
          GAS_GIANT_RADIUS *
          Math.pow(Math.max(0.05, gasGiant.massInJupiters), 0.3);

        // Impact plume thrown back along the approach direction
        const approach = Math.atan2(dy, dx);
        burst('gasAccretion', body.pos, undefined, approach);

        body.alive = false;
        clearObjectEnergyHistory(body.id);
        broadcastImpact(gasGiant, body, 'gas-giant-accretion');
      }
    }
  }
};

// Handle gas giant merging and collisions
export const handle_gas_giant_merging = () => {
  // Check for merging between gas giants
  let merged_this_step = true;
  while (merged_this_step && gas_giants.length > 1) {
    merged_this_step = false;

    for (let i = 0; i < gas_giants.length; i++) {
      const gasGiant1 = gas_giants[i];
      if (!gasGiant1.alive) continue;

      for (let j = i + 1; j < gas_giants.length; j++) {
        const gasGiant2 = gas_giants[j];
        if (!gasGiant2.alive) continue;

        // The guard the BH-BH loop has had all along and this one did not.
        // js/lessonStage.js stages gas giants and marks them model_owned, so
        // without this a lesson that stands two of them on the canvas can have
        // the engine merge them out from under it.
        if (!mergeAllowed(gasGiant1, gasGiant2)) continue;

        const dx = gasGiant1.pos.x - gasGiant2.pos.x;
        const dy = gasGiant1.pos.y - gasGiant2.pos.y;
        const dist_sq = dx * dx + dy * dy;
        const min_dist = gasGiant1.radius + gasGiant2.radius;

        if (dist_sq < min_dist ** 2 && dist_sq > 1e-6) {
          // Identical arithmetic to what was written out here.
          const {
            mass: new_mass,
            pos: new_pos,
            vel: new_vel,
          } = mergedState(gasGiant1, gasGiant2);
          const new_mass_in_jupiters = new_mass / JUPITER_MASS_UNIT;

          // Create merger particles
          burst('gasMerge', new_pos);

          // Remove the two original gas giants
          gasGiant1.alive = false;
          gasGiant2.alive = false;

          // Determine what type of object to create based on mass
          let new_object = null;

          if (new_mass_in_jupiters >= GAS_GIANT_TO_STAR_THRESHOLD) {
            // Very massive gas giant becomes a low-mass star
            const star_mass_in_suns =
              new_mass_in_jupiters / JUPITER_MASSES_PER_SOLAR_MASS;
            new_object = new StarObject(new_pos, new_vel, star_mass_in_suns);
            new_object.mass = star_mass_in_suns * SOLAR_MASS_UNIT;
            stars.push(new_object);

            // Create extra particles for star formation
            burst('gasStar', new_pos);
          } else {
            // Create a larger gas giant
            new_object = new GasGiant(new_pos, new_vel, new_mass_in_jupiters);
            gas_giants.push(new_object);
          }

          // Both progenitors are already out of the list and the result is
          // already in its own - stars for an ignition, gas_giants otherwise -
          // which is the order completeMerger needs: js/ui.js looks the result
          // up by id while the dispatch is still on the stack.
          completeMerger(gasGiant1, gasGiant2, new_object);

          merged_this_step = true;
          break;
        }
      }
      if (merged_this_step) break;
    }

    // Filter out dead gas giants after processing all collisions
    setBodyList('gas_giants', purgeDead(gas_giants));
  }
};

// Helper: Wrap BlackHole as PhysicsObject-like for merging
export function asPhysicsObject(bh) {
  return {
    pos: bh.pos,
    vel: bh.vel,
    mass: bh.mass,
    radius: bh.radius,
    alive: true,
    kind: 'BlackHole',
    _bh_ref: bh, // Keep reference to real BlackHole
  };
}
