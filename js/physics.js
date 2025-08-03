// Import utility functions
import {
  hexToRgb,
  computeDynamicColor,
  getStarColor,
  worldToScreen,
  screenToWorld,
  isOnScreen,
  isOffscreen,
} from './utils.js';

// Import the getRandomName function from ui.js
// import { getRandomName } from './ui.js';

// Local getRandomName function since it's not exported from ui.js
const getRandomName = (type) => {
  const names = {
    planets: [
      'Terra Nova', 'Gaia Minor', 'Eden Prime', 'Cosmic Garden', 'World Alpha', 
      'Planet Hope', 'New Earth', 'Stellar Oasis', 'Cosmic Refuge', 'World Beta',
      'Terra Vista', 'Gaia Prime', 'Eden Alpha', 'Cosmic Haven', 'World Gamma',
      'Planet Serenity', 'New Horizon', 'Stellar Paradise', 'Cosmic Sanctuary', 'World Delta',
      'Terra Magna', 'Gaia Supreme', 'Eden Eternal', 'Cosmic Harmony', 'World Epsilon',
      'Planet Destiny', 'New Genesis', 'Stellar Utopia', 'Cosmic Peace', 'World Zeta',
      'Terra Mystica', 'Gaia Crystal', 'Eden Infinite', 'Cosmic Tranquil', 'World Eta',
      'Planet Elysium', 'New Arcadia', 'Stellar Nirvana', 'Cosmic Bliss', 'World Theta',
      'Terra Wonderland', 'Gaia Magnificent', 'Eden Glorious', 'Cosmic Splendor', 'World Iota'
    ],
    gasGiants: [
      'Storm King', 'Gas Titan', 'Cyclone Prime', 'Atmospheric Giant', 'Wind Walker',
      'Storm Lord', 'Gas Majesty', 'Cyclone Master', 'Atmospheric Titan', 'Wind Ruler',
      'Storm Emperor', 'Gas Sovereign', 'Cyclone Champion', 'Atmospheric King', 'Wind Commander',
      'Storm Deity', 'Gas Noble', 'Cyclone Warrior', 'Atmospheric Lord', 'Wind Guardian',
      'Storm Monarch', 'Gas Regent', 'Cyclone Sovereign', 'Atmospheric Emperor', 'Wind Protector',
      'Storm Supreme', 'Gas Commander', 'Cyclone Overlord', 'Atmospheric Chief', 'Wind Sentinel',
      'Storm Dominator', 'Gas Overlord', 'Cyclone Ruler', 'Atmospheric Supreme', 'Wind Majesty',
      'Storm Colossus', 'Gas Behemoth', 'Cyclone Leviathan', 'Atmospheric Mammoth', 'Wind Goliath',
      'Storm Juggernaut', 'Gas Monster', 'Cyclone Beast', 'Atmospheric Crusher', 'Wind Destroyer'
    ],
    asteroids: [
      'Rock Hopper', 'Space Pebble', 'Cosmic Stone', 'Stellar Fragment', 'Orbit Drifter',
      'Rock Wanderer', 'Space Boulder', 'Cosmic Chunk', 'Stellar Piece', 'Orbit Traveler',
      'Rock Explorer', 'Space Nugget', 'Cosmic Shard', 'Stellar Bit', 'Orbit Voyager',
      'Rock Adventurer', 'Space Cobble', 'Cosmic Sliver', 'Stellar Chip', 'Orbit Nomad',
      'Rock Pioneer', 'Space Gravel', 'Cosmic Splinter', 'Stellar Flake', 'Orbit Roamer',
      'Rock Scout', 'Space Rubble', 'Cosmic Particle', 'Stellar Grain', 'Orbit Wanderer',
      'Rock Ranger', 'Space Debris', 'Cosmic Dust', 'Stellar Speck', 'Orbit Drifter',
      'Rock Hunter', 'Space Cluster', 'Cosmic Meteor', 'Stellar Remnant', 'Orbit Slider',
      'Rock Seeker', 'Space Swarm', 'Cosmic Shower', 'Stellar Storm', 'Orbit Dancer'
    ],
    blackHoles: [
      'Abyss Prime', 'Void Phantom', 'Dark Nexus', 'Shadow Vortex', 'Stellar Grave',
      'Event Horizon', 'Cosmic Drain', 'Infinity Well', 'Quantum Void', 'Gravity Beast',
      'Singularity Alpha', 'The Devourer', 'Omega Point', 'Dark Matter Core', 'Space Ripper',
      'Neutron Crusher', 'Photon Trap', 'Stellar Vacuum', 'Cosmic Whirlpool', 'The Absorber',
      'Graviton Sink', 'Spacetime Tear', 'Quantum Collapse', 'Stellar Tomb', 'Dark Energy Core',
      'Infinity Gate', 'Cosmic Maelstrom', 'The Singularity', 'Void Walker', 'Shadow Realm',
      'Gravity Storm', 'Stellar Phantom', 'Dark Horizon', 'Cosmic Vacuum', 'The Anomaly',
      'Warp Core', 'Stellar Devourer', 'Quantum Abyss', 'Gravity Well X', 'Dark Nexus Prime'
    ],
    stars: [
      'Proxima Flare', 'Stellar Beacon', 'Nova Prime', 'Helios Alpha', 'Fusion Core',
      'Plasma Heart', 'Solar Titan', 'Stellar Phoenix', 'Radiant Crown', 'Cosmic Forge',
      'Stellar Dynamo', 'Fusion Giant', 'Plasma Sphere', 'Solar Majesty', 'Stellar Furnace',
      'Radiant Jewel', 'Cosmic Ember', 'Stellar Warrior', 'Solar Guardian', 'Plasma King',
      'Stellar Empress', 'Fusion Master', 'Solar Deity', 'Stellar Champion', 'Radiant Star',
      'Cosmic Luminary', 'Stellar Sovereign', 'Solar Monarch', 'Plasma Crown', 'Stellar Glory',
      'Radiant Sentinel', 'Cosmic Beacon', 'Solar Majesty', 'Stellar Protector', 'Fusion Lord',
      'Plasma Noble', 'Solar Regent', 'Stellar Ruler', 'Cosmic Sovereign', 'Radiant Emperor',
      'Stellar Dominator', 'Solar Supreme', 'Plasma Overlord', 'Cosmic Commander', 'Stellar Chief'
    ],
    neutronStars: [
      'Pulsar Prime', 'Neutron Beacon', 'Stellar Compass', 'Cosmic Lighthouse', 'Gravity Pulse',
      'Neutron King', 'Pulsar Master', 'Stellar Rhythm', 'Cosmic Metronome', 'Gravity Beat',
      'Neutron Lord', 'Pulsar Champion', 'Stellar Drummer', 'Cosmic Timekeeper', 'Gravity Clock',
      'Neutron Sovereign', 'Pulsar Overlord', 'Stellar Conductor', 'Cosmic Coordinator', 'Gravity Timer',
      'Neutron Emperor', 'Pulsar Supreme', 'Stellar Orchestrator', 'Cosmic Synchronizer', 'Gravity Rhythm',
      'Neutron Deity', 'Pulsar Commander', 'Stellar Maestro', 'Cosmic Harmonizer', 'Gravity Pulse',
      'Neutron Noble', 'Pulsar Regent', 'Stellar Director', 'Cosmic Organizer', 'Gravity Signal',
      'Neutron Majesty', 'Pulsar Guardian', 'Stellar Manager', 'Cosmic Controller', 'Gravity Beacon',
      'Neutron Protector', 'Pulsar Sentinel', 'Stellar Supervisor', 'Cosmic Coordinator', 'Gravity Guide'
    ],
    whiteDwarfs: [
      'Crystal Core', 'Diamond Heart', 'Stellar Gem', 'Cosmic Jewel', 'White Giant',
      'Crystal Star', 'Diamond Sphere', 'Stellar Crystal', 'Cosmic Diamond', 'White Titan',
      'Crystal Crown', 'Diamond King', 'Stellar Treasure', 'Cosmic Brilliant', 'White Sovereign',
      'Crystal Majesty', 'Diamond Lord', 'Stellar Precious', 'Cosmic Radiant', 'White Emperor',
      'Crystal Noble', 'Diamond Regent', 'Stellar Magnificent', 'Cosmic Splendid', 'White Supreme',
      'Crystal Commander', 'Diamond Guardian', 'Stellar Glorious', 'Cosmic Luminous', 'White Overlord',
      'Crystal Protector', 'Diamond Sentinel', 'Stellar Brilliant', 'Cosmic Gleaming', 'White Ruler',
      'Crystal Warrior', 'Diamond Champion', 'Stellar Shining', 'Cosmic Sparkling', 'White Dominator',
      'Crystal Deity', 'Diamond Deity', 'Stellar Dazzling', 'Cosmic Glittering', 'White Colossus'
    ],
    comets: [
      'Tail Blazer', 'Ice Wanderer', 'Cosmic Snowball', 'Stellar Comet', 'Orbit Streaker',
      'Tail Runner', 'Ice Traveler', 'Cosmic Iceball', 'Stellar Visitor', 'Orbit Flasher',
      'Tail Chaser', 'Ice Explorer', 'Cosmic Frozen', 'Stellar Nomad', 'Orbit Glider',
      'Tail Dancer', 'Ice Adventurer', 'Cosmic Glacier', 'Stellar Wanderer', 'Orbit Swooper',
      'Tail Glider', 'Ice Pioneer', 'Cosmic Frost', 'Stellar Drifter', 'Orbit Streamer',
      'Tail Swooper', 'Ice Scout', 'Cosmic Chill', 'Stellar Roamer', 'Orbit Blazer',
      'Tail Streamer', 'Ice Ranger', 'Cosmic Freeze', 'Stellar Voyager', 'Orbit Comet',
      'Tail Hunter', 'Ice Seeker', 'Cosmic Winter', 'Stellar Traveler', 'Orbit Shooter',
      'Tail Finder', 'Ice Discoverer', 'Cosmic Blizzard', 'Stellar Explorer', 'Orbit Rocket'
    ]
  };
  
  const typeNames = names[type] || names.planets;
  return typeNames[Math.floor(Math.random() * typeNames.length)];
};

// Physics constants and utilities
const DT = 0.1;
const SOLAR_MASS_UNIT = 1000;
const EARTH_MASS_UNIT = 3; // Earth mass unit (1 Earth = 3 units, 1 Sun = 1000 units)
const ABSORB_BUFFER = 6;
const MIN_INTERACTION_DISTANCE = 5.0;
const BH_RADIUS_BASE = 8; // Reduced from 15 to make black holes smaller
const PLANET_RADIUS = 5;
const GAS_GIANT_RADIUS = 8; // Reduced from 15 to make gas giants smaller than stars
const ASTEROID_RADIUS = 2;
const STAR_OBJ_RADIUS = 10;
const NEUTRON_STAR_RADIUS = 3;
const WHITE_DWARF_RADIUS = 8;
const DEBRIS_RADIUS = 2;
const MAX_STAR_MASS_BEFORE_BH = 20.0;
const GAS_GIANT_TO_STAR_THRESHOLD = 80.0; // Jupiter masses needed to become a star

const canvas = document.getElementById('simulationCanvas');

// Global state variables
let bh_list = [],
  planets = [],
  stars = [],
  gas_giants = [],
  asteroids = [],
  comets = [],
  debris = [],
  particles = [],
  gwaves = [],
  gravity_ripples = [],
  neutron_stars = [],
  white_dwarfs = [],
  accretion_disk_particles = [];
let PhysicsObject_id_counter = 0;

// Import state from ui.js to ensure single source of truth
let state = null;

// Function to set state reference from ui.js
const setStateReference = stateRef => {
  state = stateRef;
};

// Physics settings that can be updated from UI
let physicsSettings = {
  gravitational_constant: 1.0,
  mutual_gravity: false,
  show_bh_glow: true,
  show_accretion_disk: true,
  realistic_disk_physics: true, // ADDED: This was missing!
  show_bh_jets: false,
  trail_length: 100,
  dynamic_object_properties: true,
  star_base_color: '#ffff00',
  planet_base_color: '#6495ed',
  bh_behavior: 'Static',
  orbit_decay_rate: 0.005,
};

// Function to update physics settings
const updatePhysicsSettings = settings => {
  physicsSettings = { ...physicsSettings, ...settings };
};

// Utility functions
/**
 * Reset the physics object ID counter to 0
 */
const resetPhysicsObjectCounter = () => {
  PhysicsObject_id_counter = 0;
};

/**
 * Set the physics object ID counter to a specific value
 * @param {number} value - The new counter value
 */
const setPhysicsObjectCounter = value => {
  PhysicsObject_id_counter = value;
};

// Coordinate transformation functions (using utils)
/**
 * Convert world coordinates to screen coordinates
 * @param {Object} pos - World position with x, y properties
 * @returns {Object} Screen position with x, y properties
 */
const world_to_screen = pos => {
  if (!state) return { x: 0, y: 0 }; // Fallback if state not set
  return worldToScreen(pos, state, canvas);
};
/**
 * Convert screen coordinates to world coordinates
 * @param {Object} spos - Screen position with x, y properties
 * @returns {Object} World position with x, y properties
 */
const screen_to_world = spos => {
  if (!state) return { x: 0, y: 0 }; // Fallback if state not set
  return screenToWorld(spos, state, canvas);
};
/**
 * Check if a position is offscreen
 * @param {Object} pos - World position with x, y properties
 * @param {number} buffer_factor - Buffer factor for offscreen detection
 * @returns {boolean} True if position is offscreen
 */
const is_offscreen = (pos, buffer_factor = 1.5) => {
  if (!state) return false; // Fallback if state not set
  if (!canvas) return false; // Fallback if canvas not available
  return isOffscreen(pos, state, canvas, buffer_factor);
};

// Color utilities (using utils)
/**
 * Compute dynamic color based on proximity to black holes
 * @param {string} base_color_hex - Base color in hex format
 * @param {Object} pos - Position object with x, y properties
 * @param {Array} bh_list - Array of black hole objects
 * @param {number} threshold - Distance threshold for color change
 * @param {Object} target_color - Target RGB color to blend towards
 * @param {Object} settings - Settings object (optional)
 * @returns {string} RGB color string
 */
const compute_dynamic_color = computeDynamicColor;

// Core physics function
/**
 * Calculate gravitational acceleration at a target position from multiple sources
 * @param {Object} target_pos - Target position with x, y properties
 * @param {Array} sources - Array of gravitational source objects with pos and mass properties
 * @returns {Object} Acceleration vector with ax, ay properties
 */
// Optimized gravitational acceleration with distance caching
const gravitational_acceleration = (target_pos, sources) => {
  let ax = 0.0,
    ay = 0.0;
  const G_val = physicsSettings.gravitational_constant;
  const min_dist_sq = MIN_INTERACTION_DISTANCE ** 2;
  
  for (let i = 0; i < sources.length; i++) {
    const s = sources[i];
    const dx = s.pos.x - target_pos.x;
    const dy = s.pos.y - target_pos.y;
    let r_sq = dx * dx + dy * dy;
    
    if (r_sq < min_dist_sq) r_sq = min_dist_sq;
    if (r_sq === 0) continue;
    
    // Avoid sqrt when possible - use r_sq directly
    const a_mag = (G_val * s.mass) / r_sq;
    const r_inv = 1 / Math.sqrt(r_sq);
    
    ax += a_mag * dx * r_inv;
    ay += a_mag * dy * r_inv;
  }
  return { ax, ay };
};

// Physics optimization: Cache arrays to avoid repeated spread operations
let cachedMajorSources = [];
let cachedAllPhysicsObjects = [];
let lastMutualGravityState = null;
let lastObjectCounts = { bh: 0, stars: 0, gas_giants: 0, planets: 0, asteroids: 0, debris: 0 };

/**
 * Update cached arrays only when object counts change
 */
const updateCachedArrays = () => {
  const currentCounts = {
    bh: bh_list.length,
    stars: stars.length,
    gas_giants: gas_giants.length,
    planets: planets.length,
    asteroids: asteroids.length,
    comets: comets.length,
    debris: debris.length,
    neutron_stars: neutron_stars.length,
    white_dwarfs: white_dwarfs.length
  };
  
  const countsChanged = Object.keys(currentCounts).some(key => 
    currentCounts[key] !== lastObjectCounts[key]
  );
  
  // Debug logging for tests
  // if (countsChanged) {
  //   console.log('Array counts changed:', lastObjectCounts, '->', currentCounts);
  // }
  
  if (countsChanged || lastMutualGravityState !== physicsSettings.mutual_gravity) {
    // Update major sources
    cachedMajorSources.length = 0;
    cachedMajorSources.push(...bh_list, ...stars, ...gas_giants, ...neutron_stars, ...white_dwarfs);
    if (physicsSettings.mutual_gravity) {
      cachedMajorSources.push(...planets, ...asteroids);
    }
    
    // Update all physics objects - include neutron stars and white dwarfs
    cachedAllPhysicsObjects.length = 0;
    cachedAllPhysicsObjects.push(...planets, ...asteroids, ...comets, ...gas_giants, ...debris, ...stars, ...neutron_stars, ...white_dwarfs);
    
    lastObjectCounts = currentCounts;
    lastMutualGravityState = physicsSettings.mutual_gravity;
  }
};

// Physics update function - optimized
/**
 * Update physics simulation for one time step
 * @param {number} dt - Delta time for physics update
 */
const updatePhysics = dt => {
  if (dt <= 0) return;

  // Track frame count (matching original)
  if (state) state.frame_count++;

  // Update cached arrays only when needed
  updateCachedArrays();

  // Update physics for all objects - use cached arrays and for loop for better performance
  for (let i = 0; i < cachedAllPhysicsObjects.length; i++) {
    const obj = cachedAllPhysicsObjects[i];
    if (obj.alive) {
      let effective_sources = cachedMajorSources;
      if (physicsSettings.mutual_gravity) {
        // Only filter if needed - this is still O(n) but unavoidable
        effective_sources = cachedMajorSources.filter(s => s.id !== obj.id);
      }
      obj.update_physics(dt, effective_sources);
      obj.update_trail();
    }
  }

  // Update black hole orbits and effects
  bh_list.forEach(bh => {
    bh.update_orbit(dt, bh_list);
    bh.update_dynamic_effects(dt);
  });

  // Handle tidal disruption and mass loss - improved debris generation matching original
  const new_debris = [];
  stars.forEach(star => {
    if (star.alive && star.intact && star.tidal_mass_loss) {
      const { debris_count, fraction } = star.tidal_mass_loss(bh_list, dt);
      if (debris_count > 0) {
        for (let i = 0; i < debris_count; i++) {
          const eject_speed = (Math.random() * 9 + 1) * (1 + fraction);
          const angle = Math.random() * 2 * Math.PI;
          const dv = {
            x: eject_speed * Math.cos(angle),
            y: eject_speed * Math.sin(angle),
          };
          const spawn_pos = {
            x: star.pos.x + Math.random() * 4 - 2,
            y: star.pos.y + Math.random() * 4 - 2,
          };
          new_debris.push(
            new Debris(spawn_pos, {
              x: star.vel.x * 0.1 + dv.x,
              y: star.vel.y * 0.1 + dv.y,
            })
          );
        }
      }
    }
  });
  debris.push(...new_debris);

  // Handle star merging separately from other collisions
  if (physicsSettings.enable_star_merging) {
    // Use PhysicsObject-like wrappers for black holes
    const merge_candidates = [
      ...stars,
      ...neutron_stars,
      ...white_dwarfs,
      ...bh_list.map(asPhysicsObject)
    ];
    handle_star_merging(merge_candidates);
  }
  
  // Handle collisions between stars and smaller objects (planets, gas giants, asteroids)
  handle_star_object_collisions();
  
  // Handle enhanced rocky planet collisions
  handle_rocky_collisions([...planets, ...asteroids]);
  
  // Handle gas giant merging and collisions
  handle_gas_giant_merging();
  
  // Handle basic collisions for remaining objects (gas giants with each other, etc.)
  handle_collisions([...gas_giants]);
  
  // Check for stellar collapse into black holes
  check_stellar_collapse();

  // Check for absorption by black holes - improved version matching original
  const check_and_absorb = obj_list => {
    return obj_list.filter(obj => {
      if (obj.alive && obj.check_absorption(bh_list)) {
        // Create absorption particles matching original
        for (let i = 0; i < 15; i++) {
          const angle = Math.random() * 2 * Math.PI;
          const speed = Math.random() * 50 + 30;
          const p_vel = {
            x: speed * Math.cos(angle),
            y: speed * Math.sin(angle),
          };
          const baseColor =
            obj.baseColor ||
            physicsSettings[`${obj.obj_type.toLowerCase()}_base_color`] ||
            '#c8c8c8';
          const rgb = hexToRgb(baseColor);
          if (rgb) {
            particlePool.getParticle(
              obj.pos,
              p_vel,
              Math.random() * 0.6 + 0.4,
              5,
              1,
              `rgb(${rgb.r},${rgb.g},${rgb.b})`
            );
          }
        }
        return false;
      }
      return obj.alive;
    });
  };

  // Apply absorption check to all object types
  planets = check_and_absorb(planets);
  stars = check_and_absorb(stars);
  gas_giants = check_and_absorb(gas_giants);
  asteroids = check_and_absorb(asteroids);
  debris = check_and_absorb(debris);
  neutron_stars = check_and_absorb(neutron_stars);
  white_dwarfs = check_and_absorb(white_dwarfs);

  // Update particles using object pool
  particlePool.updateAndCleanup(dt);
  
  // Update legacy particles array for compatibility
  particles = particlePool.getActiveParticles();
  
  // Update accretion disk particles - this was missing!
  for (const particle of accretion_disk_particles) {
    if (particle.alive) {
      particle.update_physics(dt, []);
    }
  }
  
  // Clean up dead accretion disk particles
  accretion_disk_particles = accretion_disk_particles.filter(p => p.alive);

  // Black hole merging logic - enhanced with accretion disk transfer
  let merged_this_step = true;
  while (merged_this_step && bh_list.length > 1) {
    merged_this_step = false;
    for (let i = 0; i < bh_list.length; i++) {
      for (let j = i + 1; j < bh_list.length; j++) {
        const bh1 = bh_list[i],
          bh2 = bh_list[j];
        const dx = bh1.pos.x - bh2.pos.x,
          dy = bh1.pos.y - bh2.pos.y;
        if (dx * dx + dy * dy < (bh1.radius + bh2.radius) ** 2) {
          const m1 = bh1.mass,
            m2 = bh2.mass,
            new_mass = m1 + m2;
          const new_pos = {
            x: (bh1.pos.x * m1 + bh2.pos.x * m2) / new_mass,
            y: (bh1.pos.y * m1 + bh2.pos.y * m2) / new_mass,
          };
          const new_vel = {
            x: (bh1.vel.x * m1 + bh2.vel.x * m2) / new_mass,
            y: (bh1.vel.y * m1 + bh2.vel.y * m2) / new_mass,
          };
          
          // Create new merged black hole
          const new_black_hole = new BlackHole(new_pos, new_mass, new_vel);
          
          // Transfer accretion disk particles from both black holes to the new one
          const combined_disk_particles = [...bh1.disk_particles, ...bh2.disk_particles];
          
          // Clear the old black holes' disk particle arrays
          bh1.disk_particles = [];
          bh2.disk_particles = [];
          
          // Update each particle to orbit the new black hole
          for (const particle of combined_disk_particles) {
            if (particle.alive) {
              // Update particle's parent black hole reference
              particle.parentBlackHole = new_black_hole;
              
              // Recalculate orbital parameters for the new black hole
              const dx_p = particle.pos.x - new_black_hole.pos.x;
              const dy_p = particle.pos.y - new_black_hole.pos.y;
              const distance = Math.sqrt(dx_p * dx_p + dy_p * dy_p);
              
              // Set new orbital velocity around the merged black hole
              const new_orbital_speed = Math.sqrt(new_black_hole.mass / distance) * 0.4;
              const current_angle = Math.atan2(dy_p, dx_p);
              const tangent_angle = current_angle + Math.PI / 2;
              
              // Update velocity to orbit the new black hole
              particle.vel.x = new_orbital_speed * Math.cos(tangent_angle);
              particle.vel.y = new_orbital_speed * Math.sin(tangent_angle);

              // Give a small spiral kick after merger
              particle.spiral_factor = 0.3 + Math.random() * 0.3; // Standard spiral
              const spiral_kick = 0.05 + Math.random() * 0.05;
              particle.vel.x += spiral_kick * Math.cos(current_angle);
              particle.vel.y += spiral_kick * Math.sin(current_angle);
              
              // Add to new black hole's disk particles
              new_black_hole.disk_particles.push(particle);
            }
          }
          
          // Standard merger effects for accretion disk
          new_black_hole.accretion_intensity = Math.min(1.0, 0.5 + (m1 + m2) / (20 * SOLAR_MASS_UNIT));
          new_black_hole.disk_growth = Math.min(1.2, 0.6 + (m1 + m2) / (25 * SOLAR_MASS_UNIT));
          new_black_hole.merger_boost_timer = 25.0; // Standard merger effects
          new_black_hole.merger_particle_boost = 1.2 + (m1 + m2) / (30 * SOLAR_MASS_UNIT);
          
          // Trigger gravitational wave ripple effect at merger location
          gravity_ripples.push({
            x: new_pos.x,
            y: new_pos.y,
            time: Date.now(),
            created: performance.now(),
            duration: 3000, // ms
            mass: new_mass / SOLAR_MASS_UNIT, // Merger mass in solar masses
            gw_strength: 1.0 // Full strength for BH-BH mergers
          });
          
          bh_list.splice(j, 1);
          bh_list.splice(i, 1);
          bh_list.push(new_black_hole);
          merged_this_step = true;
          break;
        }
      }
      if (merged_this_step) break;
    }
  }

  // Clean up offscreen objects - matching original
  // Filter out dead objects and objects that are off-screen, clearing energy history for removed objects
  const filterAndClearEnergy = (objects, filterFn) => {
    const beforeCount = objects.length;
    const filtered = objects.filter(filterFn);
    const afterCount = filtered.length;
    
    // If objects were removed, clear their energy history
    if (afterCount < beforeCount) {
      const removedIds = new Set();
      objects.forEach(obj => {
        if (!filtered.includes(obj) && obj.id) {
          removedIds.add(obj.id);
        }
      });
      
      removedIds.forEach(id => {
        clearEnergyHistory(id);
      });
      
      if (removedIds.size > 0) {
        console.log(`Cleared energy history for ${removedIds.size} removed objects`);
      }
    }
    
    return filtered;
  };
  
  planets = filterAndClearEnergy(planets, p => p.alive && !is_offscreen(p.pos));
  stars = filterAndClearEnergy(stars, s => s.alive && !is_offscreen(s.pos));
  gas_giants = filterAndClearEnergy(gas_giants, g => g.alive && !is_offscreen(g.pos));
  asteroids = filterAndClearEnergy(asteroids, a => a.alive && !is_offscreen(a.pos));
  debris = filterAndClearEnergy(debris, d => d.alive && !is_offscreen(d.pos));
  neutron_stars = filterAndClearEnergy(neutron_stars, ns => ns.alive && !is_offscreen(ns.pos));
  white_dwarfs = filterAndClearEnergy(white_dwarfs, wd => wd.alive && !is_offscreen(wd.pos));
  bh_list = filterAndClearEnergy(bh_list, bh => (bh.alive !== false) && !is_offscreen(bh.pos));
  accretion_disk_particles = filterAndClearEnergy(accretion_disk_particles, ap => ap.alive && !is_offscreen(ap.pos));

  // Follow mode logic - matching original exactly
  let target = null;
  if (physicsSettings.follow_mode !== 'None') {
    const follow_map = {
      BlackHole: bh_list,
      Planet: planets,
      GasGiant: gas_giants,
      Star: stars,
    };
    const target_list = follow_map[physicsSettings.follow_mode];
    if (target_list && target_list.length > 0) {
      if (target_list.length > 1) {
        let totalMass = 0,
          com = { x: 0, y: 0 };
        target_list.forEach(obj => {
          com.x += obj.pos.x * obj.mass;
          com.y += obj.pos.y * obj.mass;
          totalMass += obj.mass;
        });
        if (totalMass > 0)
          target = { pos: { x: com.x / totalMass, y: com.y / totalMass } };
      } else {
        target = target_list[0];
      }
    }
  }
  if (target && state) {
    state.pan.x = -target.pos.x * state.zoom;
    state.pan.y = target.pos.y * state.zoom;
  }
  
  // Update energy history for all objects (sample every 10 frames for performance)
  if (state && state.frame_count % ENERGY_SAMPLE_RATE === 0) {
    updateEnergyHistory();
  }
};

// Base PhysicsObject class
/**
 * Base class for all physics objects in the simulation
 */
class PhysicsObject {
  /**
   * Create a physics object
   * @param {Object} pos - Initial position with x, y properties
   * @param {Object} vel - Initial velocity with x, y properties
   * @param {number} mass - Object mass
   * @param {number} radius - Object radius
   * @param {string} obj_type - Type identifier for the object
   */
  constructor(pos, vel, mass, radius, obj_type = 'object') {
    this.id = PhysicsObject_id_counter++;
    this.pos = { ...pos };
    this.vel = { ...vel };
    this.mass = parseFloat(mass);
    this.radius = parseFloat(radius);
    this.obj_type = obj_type;
    this.trail = [];
    this.alive = true;
  }

  update_physics(dt, gravity_sources) {
    if (!this.alive) return;
    const { ax, ay } = gravitational_acceleration(this.pos, gravity_sources);
    this.vel.x += ax * dt;
    this.vel.y += ay * dt;
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
  }

  update_trail() {
    if (!this.alive) return;
    this.trail.push({
      ...this.pos,
      timestamp: Date.now(),
      velocity: Math.hypot(this.vel.x, this.vel.y),
      age: 0,
    });
    if (this.trail.length > physicsSettings.trail_length) this.trail.shift(); // Changed from SETTINGS.trail_length

    this.trail.forEach(point => (point.age += 1));
  }

  check_absorption(bh_list) {
    if (!this.alive) return false;
    for (const bh of bh_list) {
      const dx = this.pos.x - bh.pos.x;
      const dy = this.pos.y - bh.pos.y;
      if (dx * dx + dy * dy < (bh.radius + ABSORB_BUFFER) ** 2) {
        this.alive = false;
        bh.mass += this.mass || 0;
        bh.updateRadius();
        // Clear energy history for absorbed object
        clearObjectEnergyHistory(this.id);
        return true;
      }
    }
    return false;
  }

  get_state() {
    return {
      id: this.id,
      type: this.obj_type,
      pos: this.pos,
      vel: this.vel,
      mass: this.mass,
      radius: this.radius,
      alive: this.alive,
    };
  }

  set_state(s) {
    Object.assign(this, s);
    this.trail = [];
  }

  draw(_ctx) {}
}

// Planet class
/**
 * Planet physics object with Earth-like properties
 * @extends PhysicsObject
 */
class Planet extends PhysicsObject {
  /**
   * Create a planet object
   * @param {Object} pos - Initial position with x, y properties
   * @param {Object} vel - Initial velocity with x, y properties
   * @param {number|null} massInEarths - Mass in Earth masses (auto-generated if null)
   */
  constructor(pos, vel, massInEarths = null) {
    let finalMassInEarths;
    if (massInEarths !== null) {
      finalMassInEarths = massInEarths;
    } else {
      finalMassInEarths = Math.pow(10, Math.random() * 1.2 - 1.0);
    }

    const radius = PLANET_RADIUS * Math.pow(finalMassInEarths, 0.3);
    const mass = finalMassInEarths;

    super(pos, vel, mass, radius, 'Planet');
    this.massInEarths = finalMassInEarths;
    this.density = this.calculateDensity();
    this.intact = true;
    this.name = getRandomName('planets');
  }

  calculateDensity() {
    if (this.massInEarths > 3.0) {
      return Math.random() > 0.5 ? 'gaseous' : 'icy';
    } else if (this.massInEarths > 0.5) {
      return 'rocky';
    } else {
      return 'rocky';
    }
  }

  draw(ctx) {
    const world_pos = this.pos; // Use direct world coordinates since canvas is already transformed

    // Custom rendering for Earth and Moon
    if (this.isEarth) {
      this.drawEarth(ctx, world_pos);
      return;
    }
    
    if (this.isMoon) {
      this.drawMoon(ctx, world_pos);
      return;
    }

    let baseColor;
    switch (this.density) {
      case 'gaseous':
        baseColor = '#87CEEB';
        break;
      case 'icy':
        baseColor = '#E6E6FA';
        break;
      case 'rocky':
      default:
        baseColor = '#87CEEB'; // Changed from SETTINGS.planet_base_color
        break;
    }

    ctx.fillStyle = compute_dynamic_color(baseColor, this.pos, bh_list);
    ctx.beginPath();
    ctx.arc(world_pos.x, world_pos.y, this.radius, 0, 2 * Math.PI);
    ctx.fill();

    if (this.density === 'gaseous' && this.radius * state.zoom > 3) {
      ctx.fillStyle = 'rgba(135, 206, 235, 0.6)';
      const band_height = Math.max(1 / state.zoom, this.radius * 0.2);
      ctx.fillRect(
        world_pos.x - this.radius,
        world_pos.y - this.radius / 2 - band_height / 2,
        this.radius * 2,
        band_height
      );
      ctx.fillRect(
        world_pos.x - this.radius,
        world_pos.y + this.radius / 2 - band_height / 2,
        this.radius * 2,
        band_height
      );
    }

    if (this.density === 'icy' && this.radius * state.zoom > 3) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      const cap_height = Math.max(1 / state.zoom, this.radius * 0.15);
      ctx.fillRect(
        world_pos.x - this.radius,
        world_pos.y - this.radius - cap_height,
        this.radius * 2,
        cap_height
      );
      ctx.fillRect(
        world_pos.x - this.radius,
        world_pos.y + this.radius,
        this.radius * 2,
        cap_height
      );
    }

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const true_screen_pos = {
      x: world_pos.x * state.zoom + canvas.width / 2 + state.pan.x,
      y: -world_pos.y * state.zoom + canvas.height / 2 + state.pan.y,
    };
    const screen_radius = this.radius * state.zoom;

    if (screen_radius > 4) {
      const label_y_offset = screen_radius + 10;
      ctx.font = '10px Roboto Mono';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'black';
      ctx.shadowBlur = 3;
      
      // Show name for Solar System planets, mass for others
      const displayText = this.isSolarSystemPlanet ? this.name : `${this.massInEarths.toFixed(2)} M⊕`;
      ctx.fillText(
        displayText,
        true_screen_pos.x,
        true_screen_pos.y + label_y_offset
      );
    }
    ctx.restore();
  }

  drawEarth(ctx, world_pos) {
    // Draw Earth with realistic appearance - blue oceans with green continents
    const gradient = ctx.createRadialGradient(
      world_pos.x, world_pos.y, 0,
      world_pos.x, world_pos.y, this.radius
    );
    
    // Base ocean color
    gradient.addColorStop(0, '#4B7BE5'); // Deep blue center
    gradient.addColorStop(0.7, '#5B8BF5'); // Lighter blue
    gradient.addColorStop(1, '#6B9BF5'); // Light blue edge
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(world_pos.x, world_pos.y, this.radius, 0, 2 * Math.PI);
    ctx.fill();
    
    // Add continent-like features (simplified)
    if (this.radius * state.zoom > 8) {
      // Draw some green "continents" as simple shapes
      ctx.fillStyle = '#2D5A2D'; // Dark green for continents
      
      // North America-like shape
      ctx.beginPath();
      ctx.arc(world_pos.x - this.radius * 0.3, world_pos.y - this.radius * 0.4, this.radius * 0.25, 0, 2 * Math.PI);
      ctx.fill();
      
      // Europe/Asia-like shape
      ctx.beginPath();
      ctx.arc(world_pos.x + this.radius * 0.2, world_pos.y - this.radius * 0.3, this.radius * 0.3, 0, 2 * Math.PI);
      ctx.fill();
      
      // Africa-like shape
      ctx.beginPath();
      ctx.arc(world_pos.x + this.radius * 0.1, world_pos.y + this.radius * 0.2, this.radius * 0.2, 0, 2 * Math.PI);
      ctx.fill();
      
      // South America-like shape
      ctx.beginPath();
      ctx.arc(world_pos.x - this.radius * 0.4, world_pos.y + this.radius * 0.3, this.radius * 0.15, 0, 2 * Math.PI);
      ctx.fill();
    }
    
    // Add atmospheric glow
    ctx.strokeStyle = 'rgba(135, 206, 235, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(world_pos.x, world_pos.y, this.radius + 1, 0, 2 * Math.PI);
    ctx.stroke();
  }

  drawMoon(ctx, world_pos) {
    // Draw Moon with realistic gray appearance and mock craters
    const gradient = ctx.createRadialGradient(
      world_pos.x, world_pos.y, 0,
      world_pos.x, world_pos.y, this.radius
    );
    
    // Moon surface gradient
    gradient.addColorStop(0, '#6B6B6B'); // Dark gray center
    gradient.addColorStop(0.5, '#8B8B8B'); // Medium gray
    gradient.addColorStop(1, '#A0A0A0'); // Light gray edge
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(world_pos.x, world_pos.y, this.radius, 0, 2 * Math.PI);
    ctx.fill();
    
    // Add mock craters if zoomed in enough
    if (this.radius * state.zoom > 6) {
      ctx.fillStyle = '#5A5A5A'; // Darker gray for craters
      
      // Draw several craters of different sizes
      const craters = [
        { x: -0.3, y: -0.2, r: 0.15 },
        { x: 0.2, y: 0.3, r: 0.12 },
        { x: 0.4, y: -0.1, r: 0.08 },
        { x: -0.1, y: 0.4, r: 0.1 },
        { x: 0.1, y: -0.4, r: 0.06 },
        { x: -0.4, y: 0.1, r: 0.09 }
      ];
      
      craters.forEach(crater => {
        ctx.beginPath();
        ctx.arc(
          world_pos.x + crater.x * this.radius,
          world_pos.y + crater.y * this.radius,
          crater.r * this.radius,
          0, 2 * Math.PI
        );
        ctx.fill();
      });
    }
    
    // Add subtle surface texture
    if (this.radius * state.zoom > 4) {
      ctx.strokeStyle = 'rgba(100, 100, 100, 0.2)';
      ctx.lineWidth = 0.5;
      
      // Draw some subtle lines to simulate lunar surface features
      for (let i = 0; i < 3; i++) {
        const angle = (i * Math.PI) / 3;
        const x1 = world_pos.x + Math.cos(angle) * this.radius * 0.8;
        const y1 = world_pos.y + Math.sin(angle) * this.radius * 0.8;
        const x2 = world_pos.x + Math.cos(angle) * this.radius;
        const y2 = world_pos.y + Math.sin(angle) * this.radius;
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }
  }

  tidal_mass_loss(bh_list, dt) {
    if (!this.intact || !bh_list || bh_list.length === 0)
      return { debris_count: 0, fraction: 0 };
    let min_dist_sq = Infinity,
      closest_bh = null;
    for (const bh of bh_list) {
      const dx = this.pos.x - bh.pos.x;
      const dy = this.pos.y - bh.pos.y;
      const dist_sq = dx * dx + dy * dy;
      if (dist_sq < min_dist_sq) {
        min_dist_sq = dist_sq;
        closest_bh = bh;
      }
    }
    if (!closest_bh) return { debris_count: 0, fraction: 0 };

    const tidal_threshold_sq = (closest_bh.radius * 3) ** 2;
    if (min_dist_sq < tidal_threshold_sq) {
      const min_dist = Math.sqrt(min_dist_sq);
      const tidal_threshold = Math.sqrt(tidal_threshold_sq);
      const fraction = Math.max(
        0.0,
        (tidal_threshold - min_dist) / tidal_threshold
      );

      this.mass -= this.mass * fraction * 0.05 * dt;
      let debris_count = Math.floor(fraction * 20 * dt);

      if (this.mass <= 0.1) {
        this.intact = false;
        this.alive = false;
        debris_count += 15;
      }
      return { debris_count, fraction };
    }
    return { debris_count: 0, fraction: 0 };
  }

  get_state() {
    const baseState = super.get_state();
    return {
      ...baseState,
      massInEarths: this.massInEarths,
      density: this.density,
    };
  }

  set_state(s) {
    super.set_state(s);
    this.massInEarths = s.massInEarths;
    this.density = s.density;
  }
}

// GasGiant class
class GasGiant extends PhysicsObject {
  constructor(pos, vel, massInJupiters = null) {
    let finalMassInJupiters;
    if (massInJupiters !== null) {
      finalMassInJupiters = massInJupiters;
    } else {
      finalMassInJupiters = Math.pow(10, Math.random() * 1.8 - 0.5);
    }

    const radius = GAS_GIANT_RADIUS * Math.pow(finalMassInJupiters, 0.3);
    const mass = finalMassInJupiters * 50.0;

    super(pos, vel, mass, radius, 'GasGiant');
    this.massInJupiters = finalMassInJupiters;
    this.giantType = this.calculateGiantType();
    this.intact = true;
    this.name = getRandomName('gasGiants');

    // --- Saturn-like rings: 1 in 2 chance ---
    this.hasRings = Math.random() < 0.5;
    if (this.hasRings) {
      // Ring size: inner radius 1.2-1.5x planet, outer 1.7-2.5x planet
      this.ringInnerRadius = this.radius * (1.2 + Math.random() * 0.3);
      this.ringOuterRadius = this.radius * (1.7 + Math.random() * 0.8);
      // Ring orientation: random tilt (within ±30 degrees of equator)
      this.ringAngle = (Math.random() - 0.5) * (Math.PI / 3); // -π/6 to +π/6
      // Ring opacity: varies from planet to planet (0.4 to 0.8) - increased for better visibility
      this.ringOpacity = 0.4 + Math.random() * 0.4;
    }
  }

  calculateGiantType() {
    if (this.massInJupiters > 13) {
      return 'brown_dwarf';
    } else if (this.massInJupiters > 5) {
      return 'super_jupiter';
    } else if (this.massInJupiters > 1) {
      return 'jupiter_like';
    } else if (this.massInJupiters > 0.5) {
      return 'neptune_like';
    } else {
      return 'mini_neptune';
    }
  }

  draw(ctx) {
    const world_pos = this.pos; // Use direct world coordinates since canvas is already transformed

    // Draw rings if present - BACK ARC ONLY FIRST
    if (this.hasRings) {
      ctx.save();
      ctx.translate(world_pos.x, world_pos.y);
      ctx.rotate(this.ringAngle);
      ctx.globalAlpha = this.ringOpacity;

      // The dividing line between front and back is where the Y coordinate in the ring's local frame is zero
      // For an ellipse, this is at angles theta1 = 0 and theta2 = PI
      // But after rotation, these become theta1 = -this.ringAngle and theta2 = PI - this.ringAngle
      // We'll use these as the split points
      const theta1 = -this.ringAngle;
      const theta2 = Math.PI - this.ringAngle;

      // Draw back arc (behind planet): from theta1 to theta2
      ctx.beginPath();
      ctx.ellipse(0, 0, this.ringOuterRadius, this.ringOuterRadius * 0.32, 0, theta1, theta2, false);
      ctx.ellipse(0, 0, this.ringInnerRadius, this.ringInnerRadius * 0.32, 0, theta2, theta1, true);
      ctx.closePath();
      ctx.fillStyle = `rgba(180,200,255,${this.ringOpacity})`;
      ctx.fill('evenodd');
      ctx.globalAlpha = 1.0;
      ctx.restore();
    }

    // Draw the gas giant sphere (this will occlude the back portion of the ring)
    let baseColor;
    switch (this.giantType) {
      case 'brown_dwarf':
        baseColor = '#8B4513';
        break;
      case 'super_jupiter':
        baseColor = '#DAA520';
        break;
      case 'jupiter_like':
        baseColor = '#D2B48C';
        break;
      case 'neptune_like':
        baseColor = '#4169E1';
        break;
      case 'mini_neptune':
      default:
        baseColor = '#87CEEB';
        break;
    }

    ctx.fillStyle = compute_dynamic_color(baseColor, this.pos, bh_list);
    ctx.beginPath();
    ctx.arc(world_pos.x, world_pos.y, this.radius, 0, 2 * Math.PI);
    ctx.fill();

    if (this.radius * state.zoom > 4) {
      let bandColor, highlightColor;
      switch (this.giantType) {
        case 'brown_dwarf':
          bandColor = 'rgba(139, 69, 19, 0.6)';
          highlightColor = 'rgba(160, 82, 45, 0.4)';
          break;
        case 'super_jupiter':
          bandColor = 'rgba(218, 165, 32, 0.5)';
          highlightColor = 'rgba(255, 215, 0, 0.3)';
          break;
        case 'jupiter_like':
          bandColor = 'rgba(160, 82, 45, 0.5)';
          highlightColor = 'rgba(210, 180, 140, 0.3)';
          break;
        case 'neptune_like':
          bandColor = 'rgba(65, 105, 225, 0.5)';
          highlightColor = 'rgba(100, 149, 237, 0.3)';
          break;
        case 'mini_neptune':
        default:
          bandColor = 'rgba(135, 206, 235, 0.5)';
          highlightColor = 'rgba(173, 216, 230, 0.3)';
          break;
      }

      const numBands = this.massInJupiters > 3 ? 4 : 2;
      for (let i = 0; i < numBands; i++) {
        const bandOffset = (i - (numBands - 1) / 2) * (this.radius * 0.4);
        const bandWidth = this.radius * 0.15;

        ctx.fillStyle = bandColor;
        ctx.beginPath();
        ctx.ellipse(
          world_pos.x,
          world_pos.y + bandOffset,
          this.radius * 0.9,
          bandWidth,
          0,
          0,
          2 * Math.PI
        );
        ctx.fill();

        ctx.fillStyle = highlightColor;
        ctx.beginPath();
        ctx.ellipse(
          world_pos.x,
          world_pos.y + bandOffset - bandWidth * 0.3,
          this.radius * 0.85,
          bandWidth * 0.4,
          0,
          0,
          2 * Math.PI
        );
        ctx.fill();
      }

      if (this.massInJupiters > 2) {
        ctx.fillStyle = bandColor;
        ctx.beginPath();
        ctx.ellipse(
          world_pos.x,
          world_pos.y - this.radius * 0.7,
          this.radius * 0.3,
          this.radius * 0.2,
          0,
          0,
          2 * Math.PI
        );
        ctx.ellipse(
          world_pos.x,
          world_pos.y + this.radius * 0.7,
          this.radius * 0.3,
          this.radius * 0.2,
          0,
          0,
          2 * Math.PI
        );
        ctx.fill();
      }
    }

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const true_screen_pos = {
      x: world_pos.x * state.zoom + canvas.width / 2 + state.pan.x,
      y: -world_pos.y * state.zoom + canvas.height / 2 + state.pan.y,
    };
    const screen_radius = this.radius * state.zoom;

    if (screen_radius > 6) {
      const label_y_offset = screen_radius + 12;
      ctx.font = '11px Roboto Mono';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'black';
      ctx.shadowBlur = 3;
      
      // Show name for Solar System gas giants, mass for others
      const massInEarths = this.massInJupiters * 317.8;
      const displayText = this.isSolarSystemPlanet ? this.name : `${Math.round(massInEarths)} M⊕`;
      ctx.fillText(
        displayText,
        true_screen_pos.x,
        true_screen_pos.y + label_y_offset
      );
    }
    ctx.restore();

    // Draw the front arc of the ring AFTER the planet (so it appears in front)
    if (this.hasRings) {
      ctx.save();
      ctx.translate(world_pos.x, world_pos.y);
      ctx.rotate(this.ringAngle);
      ctx.globalAlpha = this.ringOpacity;

      const theta1 = -this.ringAngle;
      const theta2 = Math.PI - this.ringAngle;
      // Draw front arc (in front of planet): from theta2 to theta1
      ctx.beginPath();
      ctx.ellipse(0, 0, this.ringOuterRadius, this.ringOuterRadius * 0.32, 0, theta2, theta1, false);
      ctx.ellipse(0, 0, this.ringInnerRadius, this.ringInnerRadius * 0.32, 0, theta1, theta2, true);
      ctx.closePath();
      ctx.fillStyle = `rgba(180,200,255,${this.ringOpacity})`;
      ctx.fill('evenodd');
      ctx.globalAlpha = 1.0;
      ctx.restore();
    }
  }

  tidal_mass_loss(bh_list, dt) {
    if (!this.intact || !bh_list || bh_list.length === 0)
      return { debris_count: 0, fraction: 0 };
    let min_dist_sq = Infinity,
      closest_bh = null;
    for (const bh of bh_list) {
      const dx = this.pos.x - bh.pos.x;
      const dy = this.pos.y - bh.pos.y;
      const dist_sq = dx * dx + dy * dy;
      if (dist_sq < min_dist_sq) {
        min_dist_sq = dist_sq;
        closest_bh = bh;
      }
    }
    if (!closest_bh) return { debris_count: 0, fraction: 0 };

    const tidal_threshold_sq = (closest_bh.radius * 4) ** 2;
    if (min_dist_sq < tidal_threshold_sq) {
      const min_dist = Math.sqrt(min_dist_sq);
      const tidal_threshold = Math.sqrt(tidal_threshold_sq);
      const fraction = Math.max(
        0.0,
        (tidal_threshold - min_dist) / tidal_threshold
      );

      this.mass -= this.mass * fraction * 0.08 * dt;
      let debris_count = Math.floor(fraction * 35 * dt);

      if (this.mass <= 0.5) {
        this.intact = false;
        this.alive = false;
        debris_count += 20;
      }
      return { debris_count, fraction };
    }
    return { debris_count: 0, fraction: 0 };
  }

  get_state() {
    const baseState = super.get_state();
    return {
      ...baseState,
      massInJupiters: this.massInJupiters,
      giantType: this.giantType,
    };
  }

  set_state(s) {
    super.set_state(s);
    this.massInJupiters = s.massInJupiters;
    this.giantType = s.giantType;
  }
}

// Asteroid class
class Asteroid extends PhysicsObject {
  constructor(pos, vel) {
    super(pos, vel, 0.1, ASTEROID_RADIUS, 'Asteroid');
    this.name = getRandomName('asteroids');
  }

  draw(ctx) {
    const world_pos = this.pos; // Use direct world coordinates since canvas is already transformed
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.arc(world_pos.x, world_pos.y, this.radius, 0, 2 * Math.PI);
    ctx.fill();
  }
}

// Debris class
class Debris extends PhysicsObject {
  constructor(pos, vel) {
    super(pos, vel, 0.01, DEBRIS_RADIUS, 'Debris');
  }

  draw(ctx) {
    const world_pos = this.pos; // Use direct world coordinates since canvas is already transformed
    ctx.fillStyle = compute_dynamic_color('#c8c8c8', this.pos, bh_list, 200.0, {
      r: 255,
      g: 100,
      b: 0,
    });
    ctx.beginPath();
    ctx.arc(world_pos.x, world_pos.y, this.radius, 0, 2 * Math.PI);
    ctx.fill();
  }
}

// AccretionDiskParticle class
/**
 * Represents individual particles in black hole accretion disks
 */
class AccretionDiskParticle extends PhysicsObject {
  constructor(pos, vel, parentBlackHole) {
    const mass = 0.0005; // Even smaller mass for disk particles
    const radius = 0.4; // Much smaller visual radius for more numerous, smaller particles
    super(pos, vel, mass, radius, 'AccretionDiskParticle');
    
    this.parentBlackHole = parentBlackHole;
    this.initial_temperature = 1000 + Math.random() * 4000; // Initial temperature
    this.temperature = this.initial_temperature;
    this.max_temperature = 50000; // Much higher max temperature for dramatic effects
    this.angular_momentum = 0;
    this.disk_radius = Math.hypot(pos.x - parentBlackHole.pos.x, pos.y - parentBlackHole.pos.y);
    this.orbital_velocity = Math.sqrt(parentBlackHole.mass / this.disk_radius) * 0.1; // Standard orbital velocity
    this.lifetime = 60 + Math.random() * 120; // 60-180 seconds - much longer lasting
    this.age = 0;
    this.spiral_factor = 0;
    this.absorbed = false;
    this.heating_intensity = 0; // How much the particle is heating up
    this.brightness_multiplier = 1.0; // Dynamic brightness as it heats up
    this.pulse_phase = Math.random() * Math.PI * 2; // Random phase for pulsing effect
  }

  update_physics(dt, gravity_sources) {
    if (!this.alive || this.absorbed) return;
    
    this.age += dt;
    
    // Age-based decay (much slower now)
    if (this.age > this.lifetime) {
      this.alive = false;
      return;
    }
    
    // Calculate distance to parent black hole
    const dx = this.pos.x - this.parentBlackHole.pos.x;
    const dy = this.pos.y - this.parentBlackHole.pos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Check if particle has crossed the event horizon
    if (distance <= this.parentBlackHole.radius + 2) {
      this.absorbed = true;
      this.alive = false;
      
      // Add mass to black hole and trigger accretion effects
      this.parentBlackHole.mass += this.mass;
      this.parentBlackHole.updateRadius();
      
      // Trigger standard accretion intensity increase
      this.parentBlackHole.accretion_intensity = Math.min(1.0, this.parentBlackHole.accretion_intensity + 0.08);
      this.parentBlackHole.jet_intensity = Math.min(1.0, this.parentBlackHole.jet_intensity + 0.04);
      
      // When a particle is absorbed, slightly boost the remaining particles' orbital motion
      // This ensures the accretion disk maintains net rotation and spiral motion
      for (const particle of this.parentBlackHole.disk_particles) {
        if (particle !== this && particle.alive && !particle.absorbed) {
          // Slightly boost spiral factor to maintain motion
          particle.spiral_factor = Math.max(particle.spiral_factor, 0.2);
          // Slightly increase orbital velocity to maintain rotation
          particle.orbital_velocity *= 1.05;
        }
      }
      
      // Create absorption effect with temperature-based colors
      for (let i = 0; i < 6; i++) {
        const angle = Math.random() * 2 * Math.PI;
        const speed = Math.random() * 60 + 40;
        const p_vel = {
          x: speed * Math.cos(angle),
          y: speed * Math.sin(angle),
        };
        particlePool.getParticle(
          this.pos,
          p_vel,
          Math.random() * 1.2 + 0.8,
          8,
          2,
          this.getTemperatureColor()
        );
      }
      return;
    }
    
    // ENHANCED: Always maintain orbital motion regardless of black hole movement
    // Calculate current angle from black hole center
    const current_angle = Math.atan2(dy, dx);
    
    // Standard orbital velocity for rotation
    // Use the stored orbital velocity or calculate new one with standard speeds
    const base_orbital_v = Math.sqrt(this.parentBlackHole.mass / distance) * 0.3; // Standard rotation speed
    const orbital_v = Math.max(this.orbital_velocity || base_orbital_v, base_orbital_v);
    
    // Standard spiral motion - particles gradually spiral inward
    this.spiral_factor += dt * 0.01; // Standard spiral rate
    const spiral_velocity = this.spiral_factor * 0.2; // Standard spiral velocity
    
    // Calculate tangent direction (perpendicular to radial direction)
    const tangent_angle = current_angle + Math.PI / 2;
    
    // Add some orbital variation for more dynamic motion
    const orbital_variation = Math.sin(this.age * 2) * 0.2; // Small variation in orbital speed
    const final_orbital_v = orbital_v * (1 + orbital_variation);
    
    // Set velocity components:
    // 1. Orbital motion (tangential) - always present for rotation with dramatic speed
    // 2. Gradual spiral inward (radial) - always present for spiral
    this.vel.x = final_orbital_v * Math.cos(tangent_angle) - spiral_velocity * Math.cos(current_angle);
    this.vel.y = final_orbital_v * Math.sin(tangent_angle) - spiral_velocity * Math.sin(current_angle);
    
    // Update position
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    
    // Add small random motion for dynamic appearance
    const random_motion = 0.2; // Small random motion factor
    this.pos.x += (Math.random() - 0.5) * random_motion * dt;
    this.pos.y += (Math.random() - 0.5) * random_motion * dt;
    
    // Enhanced temperature calculations - dramatic heating as particle spirals inward
    const initial_distance = this.disk_radius;
    const distance_ratio = distance / initial_distance;
    const heating_factor = Math.max(0, 1 - distance_ratio); // More heating as it gets closer
    
    // Exponential heating as particle approaches black hole
    const proximity_factor = Math.max(0, 1 - (distance / (this.parentBlackHole.radius * 15)));
    const exponential_heating = Math.pow(proximity_factor, 2);
    
    // Enhanced temperature with dramatic effects
    this.temperature = this.initial_temperature + 
                      (this.max_temperature - this.initial_temperature) * exponential_heating;
    
    // Dynamic brightness based on heating
    this.heating_intensity = exponential_heating;
    this.brightness_multiplier = 1.0 + this.heating_intensity * 1.5; // Up to 2.5x brighter
    
    // Add pulsing effect based on orbital motion and heating
    this.pulse_phase += dt * (1 + this.heating_intensity * 3); // Standard pulsing when hotter
  }

  getTemperatureColor() {
    // Enhanced temperature-based color with dramatic effects
    const temp = this.temperature;
    const brightness = this.brightness_multiplier;
    
    // Pulsing effect
    const pulse_factor = 0.8 + 0.4 * Math.sin(this.pulse_phase);
    const final_brightness = brightness * pulse_factor;
    
    if (temp < 3000) {
      // Deep red-orange
      const intensity = Math.floor(final_brightness * 150);
      return `rgb(${Math.min(255, intensity)}, ${Math.floor(intensity * 0.3)}, 0)`;
    } else if (temp < 8000) {
      // Orange to yellow
      const intensity = Math.floor(final_brightness * 200);
      return `rgb(${Math.min(255, intensity)}, ${Math.floor(intensity * 0.8)}, ${Math.floor(intensity * 0.2)})`;
    } else if (temp < 15000) {
      // Yellow-white
      const intensity = Math.floor(final_brightness * 220);
      return `rgb(${Math.min(255, intensity)}, ${Math.min(255, intensity)}, ${Math.floor(intensity * 0.6)})`;
    } else if (temp < 30000) {
      // White-hot
      const intensity = Math.floor(final_brightness * 240);
      return `rgb(${Math.min(255, intensity)}, ${Math.min(255, intensity)}, ${Math.min(255, intensity)})`;
    } else {
      // Blue-white plasma
      const intensity = Math.floor(final_brightness * 250);
      return `rgb(${Math.floor(intensity * 0.8)}, ${Math.floor(intensity * 0.9)}, ${Math.min(255, intensity)})`;
    }
  }

  draw(ctx) {
    if (!this.alive || this.absorbed) return;
    
    const world_pos = this.pos;
    const color = this.getTemperatureColor();
    
    // Enhanced drawing with glow effect for hot particles
    const glow_radius = this.radius * (1 + this.heating_intensity * 2);
    const core_radius = this.radius * 0.6;
    
    // Draw glow effect for hot particles
    if (this.heating_intensity > 0.1) {
      const glow_alpha = Math.min(0.8, this.heating_intensity * 0.6);
      ctx.globalAlpha = glow_alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(world_pos.x, world_pos.y, glow_radius, 0, 2 * Math.PI);
      ctx.fill();
    }
    
    // Draw core particle
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(world_pos.x, world_pos.y, core_radius, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw bright center for very hot particles
    if (this.heating_intensity > 0.5) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(world_pos.x, world_pos.y, core_radius * 0.4, 0, 2 * Math.PI);
      ctx.fill();
    }
    
    ctx.globalAlpha = 1.0;
  }
}

// BlackHole class
/**
 * Black hole physics object with gravitational effects
 */
class BlackHole {
  /**
   * Create a black hole object
   * @param {Object} pos - Initial position with x, y properties
   * @param {number} mass - Black hole mass
   * @param {Object} vel - Initial velocity with x, y properties
   * @param {boolean} isNewlyCreated - Whether this is a new black hole
   * @param {number} jet_orientation - Angle in radians for jet direction (optional)
   */
  constructor(pos, mass, vel = { x: 0, y: 0 }, isNewlyCreated = false, jet_orientation = null) {
    this.id = PhysicsObject_id_counter++; // Add unique ID for energy tracking
    this.pos = { ...pos };
    this.mass = parseFloat(mass);
    this.vel = { ...vel };
    this.obj_type = 'BlackHole';
    this.alive = true; // Add alive property for deletion support
    this.updateRadius();
    this.name = getRandomName('blackHoles');

    // Track if this black hole is newly created (spawned by user or from merger)
    this.isNewlyCreated = isNewlyCreated;
    this.creationTime = Date.now();
    this.movementGracePeriod = 10.0; // 10 seconds of movement even in static mode

    this.accretion_intensity = 0.0;
    this.jet_intensity = 0.0;
    this.disk_growth = 0.0;
    this.last_mass = this.mass;
    this.time_since_last_accretion = 0.0;
    this.accretion_decay_rate = 0.08; // Much slower decay for longer-lasting effects
    this.jet_decay_rate = 0.06; // Slower jet decay
    this.disk_growth_decay_rate = 0.04; // Very slow disk growth decay
    this.max_disk_growth = 1.2; // Larger maximum disk size
    this.disk_particles = []; // Array to hold accretion disk particles
    this.max_disk_particles = 150; // Much more particles for more dramatic effects
    this.particle_generation_rate = 1.2; // Much higher particle generation rate
    this.time_since_last_particle = 0;
    this.merger_boost_timer = 0; // Timer for enhanced effects after mergers
    this.merger_particle_boost = 1.0; // Multiplier for particle generation after mergers
    // Assign a random jet orientation if not provided
    this.jet_orientation = jet_orientation !== null ? jet_orientation : Math.random() * 2 * Math.PI;
    // Generate initial accretion disk particles for all black holes
    this.generateInitialDiskParticles();
  }

  /**
   * Generate initial accretion disk particles for new black holes
   */
  generateInitialDiskParticles() {
    // Only generate if accretion disk is enabled
    if (!physicsSettings || !physicsSettings.show_accretion_disk) return;
    
    // Generate 30-60 initial particles based on black hole mass
    const massInSuns = this.mass / SOLAR_MASS_UNIT;
    const baseParticles = 30;
    const massBonus = Math.floor(massInSuns * 2); // More particles for more massive black holes
    const totalParticles = Math.min(baseParticles + massBonus, 60);
    
    for (let i = 0; i < totalParticles; i++) {
      this.generateInitialDiskParticle();
    }
    
    // Set initial accretion intensity to show the disk is active
    this.accretion_intensity = 0.2;
    this.disk_growth = 0.3;
  }

  /**
   * Generate a single initial disk particle with slightly different properties
   */
  generateInitialDiskParticle() {
    const disk_radius = this.radius * (1.5 + Math.random() * 3.0); // 1.5-4.5 times radius
    const angle = Math.random() * 2 * Math.PI;
    
    const pos = {
      x: this.pos.x + disk_radius * Math.cos(angle),
      y: this.pos.y + disk_radius * Math.sin(angle)
    };
    
    // Standard orbital velocity for stable disk formation
    const orbital_speed = Math.sqrt(this.mass / disk_radius) * 0.4; // Standard rotation speed
    const tangent_angle = angle + Math.PI / 2;
    const vel = {
      x: orbital_speed * Math.cos(tangent_angle),
      y: orbital_speed * Math.sin(tangent_angle)
    };
    
    const particle = new AccretionDiskParticle(pos, vel, this);
    
    // ENHANCED: Set initial orbital properties to ensure consistent rotation
    particle.orbital_velocity = orbital_speed;
    particle.spiral_factor = Math.random() * 0.2; // Small initial spiral factor
    
    // Give initial particles longer lifetimes and varied temperatures
    particle.initial_temperature = 2000 + Math.random() * 6000; // 2000-8000K
    particle.temperature = particle.initial_temperature;
    particle.lifetime = 90 + Math.random() * 120; // 90-210 seconds
    particle.brightness_multiplier = 0.8 + Math.random() * 0.4; // 0.8-1.2x brightness
    
    this.disk_particles.push(particle);
    accretion_disk_particles.push(particle);
  }

  updateRadius() {
    const mass_scale = Math.max(0.1, this.mass / (1.0 * SOLAR_MASS_UNIT)); // Changed from DEFAULT_SETTINGS.bh_mass
    this.radius = BH_RADIUS_BASE * Math.pow(mass_scale, 0.3); // Changed from 0.5 to 0.3 for more conservative scaling
  }

  update_orbit(dt, other_bhs) {
    // Allow movement for newly created black holes even in static mode
    const timeSinceCreation = (Date.now() - this.creationTime) / 1000;
    const canMove = physicsSettings.bh_behavior === 'Orbiting' || 
                   (this.isNewlyCreated && timeSinceCreation < this.movementGracePeriod);
    
    if (canMove) {
      const { ax, ay } = gravitational_acceleration(
        this.pos,
        other_bhs.filter(bh => bh !== this)
      );
      this.vel.x += ax * dt;
      this.vel.y += ay * dt;
      const decay_factor = 1.0 - physicsSettings.orbit_decay_rate * dt;
      this.vel.x *= decay_factor;
      this.vel.y *= decay_factor;
      this.pos.x += this.vel.x * dt;
      this.pos.y += this.vel.y * dt;
    }
  }

  update_dynamic_effects(dt) {
    if (this.mass > this.last_mass) {
      const mass_gain = this.mass - this.last_mass;
      const mass_ratio = mass_gain / this.mass;

      // Standard accretion effects during mergers
      this.accretion_intensity = Math.min(
        1.0,
        this.accretion_intensity + mass_ratio * 15
      );
      this.jet_intensity = Math.min(1.0, this.jet_intensity + mass_ratio * 8);
      this.disk_growth = Math.min(
        this.max_disk_growth,
        this.disk_growth + mass_ratio * 12
      );
      this.time_since_last_accretion = 0.0;
      
      // Trigger merger boost for enhanced particle generation
      this.merger_boost_timer = 20.0; // 20 seconds of enhanced effects
      this.merger_particle_boost = 1.0 + mass_ratio * 5; // Up to 5x more particles
      
      // Create merger particles - reasonable amount
      const merger_particles = Math.floor(mass_ratio * 200) + 20;
      for (let i = 0; i < merger_particles; i++) {
        this.generateEnhancedMergerParticle();
      }
    }

    this.time_since_last_accretion += dt;
    this.merger_boost_timer = Math.max(0, this.merger_boost_timer - dt);
    
    // Decay merger boost over time
    if (this.merger_boost_timer <= 0) {
      this.merger_particle_boost = Math.max(1.0, this.merger_particle_boost - dt * 0.1);
    }

    this.accretion_intensity = Math.max(
      0.0,
      this.accretion_intensity - this.accretion_decay_rate * dt
    );
    this.jet_intensity = Math.max(
      0.0,
      this.jet_intensity - this.jet_decay_rate * dt
    );
    this.disk_growth = Math.max(
      0.0,
      this.disk_growth - this.disk_growth_decay_rate * dt
    );

    // Update disk particles
    this.updateDiskParticles(dt);

    this.last_mass = this.mass;
  }

  /**
   * Create accretion disk particles around the black hole
   * @param {number} dt - Delta time
   */
  updateDiskParticles(dt) {
    if (!physicsSettings.show_accretion_disk || !physicsSettings.realistic_disk_physics) return;
    
    // Generate new particles with merger boost
    this.time_since_last_particle += dt;
    const effective_generation_rate = this.particle_generation_rate * this.merger_particle_boost;
    
    if (this.time_since_last_particle >= 1.0 / effective_generation_rate && 
        this.disk_particles.length < this.max_disk_particles) {
      
      this.generateDiskParticle();
      this.time_since_last_particle = 0;
    }
    
    // During intense accretion, generate extra particles
    if (this.accretion_intensity > 0.7 && this.disk_particles.length < this.max_disk_particles) {
      if (Math.random() < this.accretion_intensity * dt * 2) {
        this.generateDiskParticle();
      }
    }
    
    // Update existing particles
    for (let i = this.disk_particles.length - 1; i >= 0; i--) {
      const particle = this.disk_particles[i];
      particle.update_physics(dt, []);
      
      // Remove dead particles
      if (!particle.alive) {
        this.disk_particles.splice(i, 1);
      }
    }
  }

  /**
   * Generate a new accretion disk particle
   */
  generateDiskParticle() {
    const disk_radius = this.radius * (1.2 + Math.random() * 2.5); // Much closer to black hole: 1.2-3.7 times radius
    const angle = Math.random() * 2 * Math.PI;
    
    const pos = {
      x: this.pos.x + disk_radius * Math.cos(angle),
      y: this.pos.y + disk_radius * Math.sin(angle)
    };
    
    // Standard orbital motion for disk particles
    const orbital_speed = Math.sqrt(this.mass / disk_radius) * 0.5; // Standard rotation speed
    const tangent_angle = angle + Math.PI / 2;
    const vel = {
      x: orbital_speed * Math.cos(tangent_angle),
      y: orbital_speed * Math.sin(tangent_angle)
    };
    
    const particle = new AccretionDiskParticle(pos, vel, this);
    
    // ENHANCED: Set initial orbital velocity to ensure consistent rotation
    particle.orbital_velocity = orbital_speed;
    particle.spiral_factor = Math.random() * 0.3; // Random initial spiral factor for variety
    
    this.disk_particles.push(particle);
    accretion_disk_particles.push(particle);
  }

  /**
   * Generate enhanced merger particles with more dramatic effects
   */
  generateEnhancedMergerParticle() {
    const disk_radius = this.radius * (0.8 + Math.random() * 2.5); // Even closer to black hole for more dramatic effects
    const angle = Math.random() * 2 * Math.PI;
    
    const pos = {
      x: this.pos.x + disk_radius * Math.cos(angle),
      y: this.pos.y + disk_radius * Math.sin(angle)
    };
    
    // Standard orbital velocity for merger particles
    const orbital_speed = Math.sqrt(this.mass / disk_radius) * 0.6; // Standard rotation speed
    const tangent_angle = angle + Math.PI / 2;
    const vel = {
      x: orbital_speed * Math.cos(tangent_angle),
      y: orbital_speed * Math.sin(tangent_angle)
    };
    
    const particle = new AccretionDiskParticle(pos, vel, this);
    
    // ENHANCED: Set strong initial orbital properties for merger particles
    particle.orbital_velocity = orbital_speed;
    particle.spiral_factor = 0.5 + Math.random() * 0.5; // Higher initial spiral factor for merger particles
    
    // Enhanced properties for merger particles
    particle.initial_temperature = 3000 + Math.random() * 7000; // Start hotter
    particle.temperature = particle.initial_temperature;
    particle.lifetime = 90 + Math.random() * 180; // Even longer lifetime
    particle.brightness_multiplier = 1.5 + Math.random() * 0.5; // Start brighter
    
    this.disk_particles.push(particle);
    accretion_disk_particles.push(particle);
  }

  /**
   * Draw accretion disk particles instead of gradient effect
   */
  drawDiskParticles(ctx) {
    if (!physicsSettings.show_accretion_disk || !physicsSettings.realistic_disk_physics) return;
    
    for (const particle of this.disk_particles) {
      particle.draw(ctx);
    }
  }

  draw(ctx) {
    const world_pos = this.pos; // Use direct world coordinates since canvas is already transformed
    const world_radius = this.radius;

    if (physicsSettings.show_accretion_disk) {
      // Draw disk particles for more realistic disk behavior
      this.drawDiskParticles(ctx);
      
      // Enhanced gradient backdrop with more dramatic effects
      const base_disk_radius = world_radius * 3.0; // Increased from 2.5
      const growth_factor = 1.0 + this.disk_growth * 0.8; // Increased from 0.6
      const disk_radius = base_disk_radius * growth_factor;

      if (disk_radius > world_radius) {
        const base_intensity = physicsSettings.realistic_disk_physics ? 
          (0.15 + this.accretion_intensity * 0.4) : // Increased backdrop intensity
          (0.4 + this.accretion_intensity * 0.8);   // Increased full intensity

        const inner_radius = world_radius * (1.3 + this.disk_growth * 0.4); // Increased from 1.2 and 0.3
        const inner_grad = ctx.createRadialGradient(
          world_pos.x,
          world_pos.y,
          world_radius * 1.1,
          world_pos.x,
          world_pos.y,
          inner_radius
        );
        const inner_intensity =
          base_intensity * (0.9 + this.accretion_intensity * 0.4); // Increased from 0.8 and 0.3
        const opacity_multiplier = physicsSettings.realistic_disk_physics ? 0.6 : 1.0; // Increased from 0.4 and 0.9
        
        // Enhanced color progression with more dramatic heating effects
        inner_grad.addColorStop(
          0,
          `rgba(255, 255, 255, ${inner_intensity * opacity_multiplier * 0.8})` // Brighter white center
        );
        inner_grad.addColorStop(
          0.2,
          `rgba(255, 255, 200, ${inner_intensity * opacity_multiplier})`
        );
        inner_grad.addColorStop(
          0.4,
          `rgba(255, 220, 100, ${inner_intensity * opacity_multiplier * 0.9})`
        );
        inner_grad.addColorStop(
          0.7,
          `rgba(255, 180, 50, ${inner_intensity * opacity_multiplier * 0.7})`
        );
        inner_grad.addColorStop(
          1,
          `rgba(255, 140, 0, ${inner_intensity * opacity_multiplier * 0.4})`
        );
        ctx.fillStyle = inner_grad;
        ctx.beginPath();
        ctx.arc(world_pos.x, world_pos.y, inner_radius, 0, 2 * Math.PI);
        ctx.fill();

        const outer_grad = ctx.createRadialGradient(
          world_pos.x,
          world_pos.y,
          inner_radius,
          world_pos.x,
          world_pos.y,
          disk_radius
        );
        
        // Enhanced outer gradient with more dramatic colors
        outer_grad.addColorStop(
          0,
          `rgba(255, 200, 80, ${base_intensity * opacity_multiplier * 0.7})` // Brighter transition
        );
        outer_grad.addColorStop(
          0.3,
          `rgba(255, 160, 40, ${base_intensity * opacity_multiplier * 0.6})`
        );
        outer_grad.addColorStop(
          0.6,
          `rgba(255, 120, 20, ${base_intensity * opacity_multiplier * 0.4})`
        );
        outer_grad.addColorStop(
          0.9,
          `rgba(255, 80, 0, ${base_intensity * opacity_multiplier * 0.2})`
        );
        outer_grad.addColorStop(1, `rgba(255, 50, 0, 0)`);
        ctx.fillStyle = outer_grad;
        ctx.beginPath();
        ctx.arc(world_pos.x, world_pos.y, disk_radius, 0, 2 * Math.PI);
        ctx.fill();
      }
    }

    if (physicsSettings.show_bh_glow) {
      const glow_radius = world_radius * (2.2 + this.disk_growth * 0.5); // Increased from 1.8 and 0.4
      const glow_intensity = 0.5 + this.accretion_intensity * 0.4; // Increased from 0.4 and 0.3
      const grad = ctx.createRadialGradient(
        world_pos.x,
        world_pos.y,
        world_radius,
        world_pos.x,
        world_pos.y,
        glow_radius
      );
      
      // Enhanced glow colors
      grad.addColorStop(0, `rgba(220, 220, 255, ${glow_intensity * 0.8})`);
      grad.addColorStop(0.5, `rgba(200, 200, 255, ${glow_intensity * 0.4})`);
      grad.addColorStop(1, `rgba(180, 180, 255, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(world_pos.x, world_pos.y, glow_radius, 0, 2 * Math.PI);
      ctx.fill();
    }

    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(world_pos.x, world_pos.y, world_radius, 0, 2 * Math.PI);
    ctx.fill();

    if (physicsSettings.show_bh_jets) {
      // --- Realistic, dynamic jet rendering (many thin lines, volumetric) ---
      const jet_length = world_radius * (11 + this.jet_intensity * 3.5); // Moderately longer jet
      const jet_base_width = Math.max(1.5 / state.zoom, world_radius * (0.18 + this.jet_intensity * 0.12));
      const jet_tip_width = jet_base_width * 2.2;
      const jet_intensity = 0.7 + this.jet_intensity * 0.5;
      const time = Date.now() * 0.001;
      const precession_angle = Math.sin(time * 0.25 + this.pos.x * 0.13) * 0.09;
      const flicker = 0.85 + 0.35 * Math.sin(time * 10 + this.pos.y * 0.3);
      const jet_colors = [
        { stop: 0, color: [255, 255, 200], alpha: 1.0 },
        { stop: 0.15, color: [255, 240, 160], alpha: 0.85 },
        { stop: 0.35, color: [255, 220, 100], alpha: 0.65 },
        { stop: 0.6, color: [200, 200, 255], alpha: 0.35 },
        { stop: 0.85, color: [150, 170, 255], alpha: 0.13 },
        { stop: 1, color: [100, 140, 255], alpha: 0.0 },
      ];
      for (let i = 0; i < 2; i++) {
        const base_angle = this.jet_orientation + i * Math.PI;
        const angle = base_angle + precession_angle;
        // Draw the main jet beam as a polygon with gradient
        ctx.save();
        ctx.beginPath();
        const base_x = world_pos.x + Math.sin(angle) * world_radius;
        const base_y = world_pos.y + Math.cos(angle) * world_radius;
        const tip_x = world_pos.x + Math.sin(angle) * (world_radius + jet_length);
        const tip_y = world_pos.y + Math.cos(angle) * (world_radius + jet_length);
        const perp = { x: Math.cos(angle), y: -Math.sin(angle) };
        ctx.moveTo(base_x - perp.x * jet_base_width, base_y - perp.y * jet_base_width);
        ctx.lineTo(tip_x - perp.x * jet_tip_width, tip_y - perp.y * jet_tip_width);
        ctx.lineTo(tip_x + perp.x * jet_tip_width, tip_y + perp.y * jet_tip_width);
        ctx.lineTo(base_x + perp.x * jet_base_width, base_y + perp.y * jet_base_width);
        ctx.closePath();
        const grad = ctx.createLinearGradient(base_x, base_y, tip_x, tip_y);
        for (const stop of jet_colors) {
          // Use the provided alpha for a more gradual fade
          const alpha = stop.alpha * jet_intensity * flicker;
          grad.addColorStop(stop.stop, `rgba(${stop.color[0]},${stop.color[1]},${stop.color[2]},${alpha})`);
        }
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = grad;
        ctx.filter = 'blur(0.5px)';
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.filter = 'none';
        ctx.restore();
        // --- Jet lines: many, very thin, volumetric, flickering ---
        const numLines = 90;
        for (let i = 0; i < numLines; i++) {
          // t: 0 (base) to 1 (tip), randomize for volumetric fill
          const t = Math.random();
          // Random offset from center axis for volumetric effect
          const width = jet_base_width * (1 - t) + jet_tip_width * t;
          const offset = (Math.random() - 0.5) * width * 1.1;
          // Flicker: only draw if random threshold is met (rapid flutter)
          if (Math.random() > 0.38 + 0.55 * Math.sin(time * 16 + t * 10 + i)) continue;
          // Position along jet, offset from axis
          const px = world_pos.x + Math.sin(angle) * (world_radius + t * jet_length) + perp.x * offset;
          const py = world_pos.y + Math.cos(angle) * (world_radius + t * jet_length) + perp.y * offset;
          // Line direction: mostly along jet, but with small random angular spread
          const angleSpread = angle + (Math.random() - 0.5) * 0.18;
          // Line length tapers and flutters
          const lineLen = width * (1.2 + 0.7 * Math.sin(time * 12 + t * 8 + i));
          // Color: interpolate between stops
          let color = [255, 255, 200];
          if (t > 0.6) color = [180, 200, 255];
          else if (t > 0.25) color = [255, 220, 100];
          // Opacity fades with distance
          const alpha = Math.max(0.03, Math.min(0.18, jet_intensity * (1 - t * 0.4) * flicker));
          ctx.save();
          ctx.strokeStyle = `rgba(${color[0]},${color[1]},${color[2]},${alpha})`;
          ctx.lineWidth = Math.max(0.5, width * 0.09); // much thinner lines
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + Math.sin(angleSpread) * lineLen, py + Math.cos(angleSpread) * lineLen);
          ctx.stroke();
          ctx.restore();
        }
        // Jet tip shock (subtle, fading away gradually)
        const tip_shock_radius = jet_tip_width * (1.2 + 0.3 * Math.sin(time * 2 + i));
        const tip_grad = ctx.createRadialGradient(tip_x, tip_y, 0, tip_x, tip_y, tip_shock_radius);
        tip_grad.addColorStop(0, `rgba(180,200,255,${0.3 * flicker})`);
        tip_grad.addColorStop(0.3, `rgba(120,160,255,${0.15 * flicker})`);
        tip_grad.addColorStop(0.7, `rgba(100,140,255,${0.05 * flicker})`);
        tip_grad.addColorStop(1, `rgba(100,140,255,0)`);
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(tip_x, tip_y, tip_shock_radius, 0, 2 * Math.PI);
        ctx.fillStyle = tip_grad;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    }

    // ... label code ...

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const true_screen_pos = {
      x: world_pos.x * state.zoom + canvas.width / 2 + state.pan.x,
      y: -world_pos.y * state.zoom + canvas.height / 2 + state.pan.y,
    };
    const screen_radius = world_radius * state.zoom;
    let label_y_offset = screen_radius + 15;
    if (physicsSettings.show_bh_jets) {
      label_y_offset = screen_radius * 6 + screen_radius + 10;
    } else if (physicsSettings.show_accretion_disk) {
      label_y_offset = screen_radius * 2.5 + 10;
    } else if (physicsSettings.show_bh_glow) {
      label_y_offset = screen_radius * 1.8 + 10;
    }
    ctx.font = '14px Roboto Mono';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 4;
    // BlackHole label (replace ctx.fillText(`${(this.mass / SOLAR_MASS_UNIT).toFixed(1)} Msun`, ...))
    const massStr = (this.mass / SOLAR_MASS_UNIT).toFixed(1);
    const label = massStr + ' M\u2609'; // M☉
    ctx.fillText(label, true_screen_pos.x, true_screen_pos.y + label_y_offset);
    // (Removed: subscript 'sun' text)
    ctx.restore();
  }

  get_state() {
    return {
      id: this.id,
      type: this.obj_type,
      pos: this.pos,
      vel: this.vel,
      mass: this.mass,
      alive: this.alive,
      name: this.name,
      accretion_intensity: this.accretion_intensity,
      jet_intensity: this.jet_intensity,
      disk_growth: this.disk_growth,
      time_since_last_accretion: this.time_since_last_accretion,
    };
  }

  set_state(s) {
    this.id = s.id || PhysicsObject_id_counter++;
    this.pos = s.pos;
    this.vel = s.vel;
    this.mass = s.mass;
    this.alive = s.alive !== undefined ? s.alive : true;
    this.name = s.name || getRandomName('blackHoles');
    this.accretion_intensity = s.accretion_intensity || 0.0;
    this.jet_intensity = s.jet_intensity || 0.0;
    this.disk_growth = s.disk_growth || 0.0;
    this.time_since_last_accretion = s.time_since_last_accretion || 0.0;
    this.updateRadius();
  }
}

// Star color function is now imported from utils.js

// StarObject class
class StarObject extends PhysicsObject {
  constructor(pos, vel, massInSuns = null) {
    let finalMassInSuns;
    if (massInSuns !== null) {
      finalMassInSuns = massInSuns;
    } else {
      finalMassInSuns = Math.pow(10, Math.random() * 1.5 - 0.7);
    }

    const radius = STAR_OBJ_RADIUS * Math.pow(finalMassInSuns, 0.85);

    super(pos, vel, finalMassInSuns * SOLAR_MASS_UNIT, radius, 'StarObject');
    this.massInSuns = finalMassInSuns;
    this.baseColor = getStarColor(this.massInSuns);
    this.intact = true;
    this.name = getRandomName('stars');
    this.temperature = null; // Will be set for specific stars
    this.spectralType = null; // Will be set for specific stars
    this.age = null; // Will be set for specific stars
  }

  draw(ctx) {
    const world_pos = this.pos; // Use direct world coordinates since canvas is already transformed
    // Use custom baseColor if set, otherwise use computed color
    const starColor = this.baseColor || getStarColor(this.massInSuns);
    ctx.fillStyle = compute_dynamic_color(starColor, this.pos, bh_list, 400.0, {
      r: 255,
      g: 50,
      b: 0,
    });
    ctx.beginPath();
    ctx.arc(world_pos.x, world_pos.y, this.radius, 0, 2 * Math.PI);
    ctx.fill();

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const true_screen_pos = {
      x: world_pos.x * state.zoom + canvas.width / 2 + state.pan.x,
      y: -world_pos.y * state.zoom + canvas.height / 2 + state.pan.y,
    };
    const screen_radius = this.radius * state.zoom;

    if (screen_radius > 5) {
      const label_y_offset = screen_radius + 12;
      ctx.font = '12px Roboto Mono';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'black';
      ctx.shadowBlur = 4;
      
      // Show name for Solar System sun, mass for others
      if (this.isSolarSystemSun) {
        ctx.fillText(this.name, true_screen_pos.x, true_screen_pos.y + label_y_offset);
      } else {
        const starMassStr = this.massInSuns.toFixed(2);
        const starLabel = starMassStr + ' M\u2609'; // M☉
        ctx.fillText(starLabel, true_screen_pos.x, true_screen_pos.y + label_y_offset);
        // Remove subscript 'sun' drawing
      }
    }
    ctx.restore();
  }

  tidal_mass_loss(bh_list, dt) {
    if (!this.intact || !bh_list || bh_list.length === 0)
      return { debris_count: 0, fraction: 0 };
    let min_dist_sq = Infinity,
      closest_bh = null;
    for (const bh of bh_list) {
      const dx = this.pos.x - bh.pos.x;
      const dy = this.pos.y - bh.pos.y;
      const dist_sq = dx * dx + dy * dy;
      if (dist_sq < min_dist_sq) {
        min_dist_sq = dist_sq;
        closest_bh = bh;
      }
    }
    if (!closest_bh) return { debris_count: 0, fraction: 0 };
    const tidal_threshold_sq = (closest_bh.radius * 5) ** 2;
    if (min_dist_sq < tidal_threshold_sq) {
      const min_dist = Math.sqrt(min_dist_sq);
      const tidal_threshold = Math.sqrt(tidal_threshold_sq);
      const fraction = Math.max(
        0.0,
        (tidal_threshold - min_dist) / tidal_threshold
      );
      this.mass -= this.mass * fraction * 0.1 * dt;
      let debris_count = Math.floor(fraction * 50 * dt);
      if (this.mass <= 1.0) {
        this.intact = false;
        this.alive = false;
        debris_count += 30;
      }
      return { debris_count, fraction };
    }
    return { debris_count: 0, fraction: 0 };
  }

  get_state() {
    const baseState = super.get_state();
    return {
      ...baseState,
      massInSuns: this.massInSuns,
      baseColor: this.baseColor,
    };
  }

  set_state(s) {
    super.set_state(s);
    this.massInSuns = s.massInSuns;
    this.baseColor = s.baseColor;
  }
}

// NeutronStar class
class NeutronStar extends PhysicsObject {
  constructor(pos, vel, massInSuns = null, isPulsar = null) {
    let finalMassInSuns;
    if (massInSuns !== null) {
      finalMassInSuns = massInSuns;
    } else {
      finalMassInSuns = 1.4 + Math.random() * 0.6; // 1.4 to 2.0 solar masses
    }

    const radius = NEUTRON_STAR_RADIUS;

    super(pos, vel, finalMassInSuns * SOLAR_MASS_UNIT, radius, 'NeutronStar');
    this.massInSuns = finalMassInSuns;
    this.pulsar_period = 0.1 + Math.random() * 2.0; // 0.1 to 2.1 seconds
    this.pulsar_phase = Math.random() * 2 * Math.PI;
    this.magnetic_field_strength = Math.random() * 0.8 + 0.2; // 0.2 to 1.0
    this.intact = true;
    this.name = getRandomName('neutronStars');
    // Randomly assign pulsar status if not specified
    this.isPulsar = (isPulsar !== null) ? isPulsar : (Math.random() < 0.5);
    this.pulsar = this.isPulsar; // For inspector compatibility
  }

  draw(ctx) {
    const world_pos = this.pos; // Use direct world coordinates since canvas is already transformed

    // Pulsar effect
    this.pulsar_phase += 0.1;
    const pulse_intensity =
      0.5 + 0.5 * Math.sin(this.pulsar_phase / this.pulsar_period);

    // Core
    ctx.fillStyle = compute_dynamic_color('#E6E6FA', this.pos, bh_list, 300.0, {
      r: 255,
      g: 255,
      b: 255,
    });
    ctx.beginPath();
    ctx.arc(world_pos.x, world_pos.y, this.radius, 0, 2 * Math.PI);
    ctx.fill();

    // Magnetic field visualization
    if (this.radius * state.zoom > 2) {
      const field_radius = this.radius * (2 + this.magnetic_field_strength);
      const field_intensity = pulse_intensity * 0.3;

      ctx.strokeStyle = `rgba(0, 255, 255, ${field_intensity})`;
      ctx.lineWidth = 1 / state.zoom;
      ctx.beginPath();
      ctx.arc(world_pos.x, world_pos.y, field_radius, 0, 2 * Math.PI);
      ctx.stroke();
    }

    // Pulsar beams (only if isPulsar)
    if (this.isPulsar && this.radius * state.zoom > 1) {
      const beam_length = this.radius * 8;
      const beam_width = Math.max(0.5 / state.zoom, this.radius * 0.3);

      ctx.strokeStyle = `rgba(255, 255, 255, ${pulse_intensity * 0.8})`;
      ctx.lineWidth = beam_width;
      ctx.lineCap = 'round';

      // Two beams at opposing angles
      for (let i = 0; i < 2; i++) {
        const angle = this.pulsar_phase + i * Math.PI;
        const beam_start_x = world_pos.x + Math.cos(angle) * this.radius;
        const beam_start_y = world_pos.y + Math.sin(angle) * this.radius;
        const beam_end_x = world_pos.x + Math.cos(angle) * beam_length;
        const beam_end_y = world_pos.y + Math.sin(angle) * beam_length;

        ctx.beginPath();
        ctx.moveTo(beam_start_x, beam_start_y);
        ctx.lineTo(beam_end_x, beam_end_y);
        ctx.stroke();
      }
    }

    // Label
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const true_screen_pos = {
      x: world_pos.x * state.zoom + canvas.width / 2 + state.pan.x,
      y: -world_pos.y * state.zoom + canvas.height / 2 + state.pan.y,
    };
    const screen_radius = this.radius * state.zoom;

    if (screen_radius > 2) {
      const label_y_offset = screen_radius * 8 + 12;
      ctx.font = '12px Roboto Mono';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'black';
      ctx.shadowBlur = 4;
      ctx.fillText(
        `${this.massInSuns.toFixed(2)} M☉ NS`,
        true_screen_pos.x,
        true_screen_pos.y + label_y_offset
      );
    }
    ctx.restore();
  }

  get_state() {
    const baseState = super.get_state();
    return {
      ...baseState,
      massInSuns: this.massInSuns,
      pulsar_period: this.pulsar_period,
      pulsar_phase: this.pulsar_phase,
      magnetic_field_strength: this.magnetic_field_strength,
      isPulsar: this.isPulsar,
      pulsar: this.isPulsar,
    };
  }

  set_state(s) {
    super.set_state(s);
    this.massInSuns = s.massInSuns;
    this.pulsar_period = s.pulsar_period || 1.0;
    this.pulsar_phase = s.pulsar_phase || 0;
    this.magnetic_field_strength = s.magnetic_field_strength || 0.5;
    this.isPulsar = s.isPulsar !== undefined ? s.isPulsar : true;
    this.pulsar = this.isPulsar;
  }
}

// WhiteDwarf class
class WhiteDwarf extends PhysicsObject {
  constructor(pos, vel, massInSuns = null) {
    let finalMassInSuns;
    if (massInSuns !== null) {
      finalMassInSuns = massInSuns;
    } else {
      finalMassInSuns = 0.5 + Math.random() * 0.6; // 0.5 to 1.1 solar masses
    }

    const radius = WHITE_DWARF_RADIUS;

    super(pos, vel, finalMassInSuns * SOLAR_MASS_UNIT, radius, 'WhiteDwarf');
    this.massInSuns = finalMassInSuns;
    this.temperature = 5000 + Math.random() * 15000; // 5000K to 20000K
    this.cooling_age = Math.random() * 10; // Billion years
    this.intact = true;
    this.name = getRandomName('whiteDwarfs');
  }

  getTemperatureColor() {
    // Color based on temperature
    if (this.temperature > 15000)
      return '#9BB0FF'; // Blue-white
    else if (this.temperature > 10000)
      return '#CAD7FF'; // White
    else if (this.temperature > 7500)
      return '#F8F7FF'; // Yellow-white
    else return '#FFE4B5'; // Orange-white
  }

  draw(ctx) {
    const world_pos = this.pos; // Use direct world coordinates since canvas is already transformed

    // Core with temperature-based color
    const temp_color = this.getTemperatureColor();
    ctx.fillStyle = compute_dynamic_color(
      temp_color,
      this.pos,
      bh_list,
      200.0,
      { r: 255, g: 255, b: 255 }
    );
    ctx.beginPath();
    ctx.arc(world_pos.x, world_pos.y, this.radius, 0, 2 * Math.PI);
    ctx.fill();

    // Glow effect based on temperature
    if (this.radius * state.zoom > 3) {
      const glow_radius = this.radius * (1.5 + this.temperature / 20000);
      const glow_intensity = (this.temperature / 20000) * 0.4;

      const grad = ctx.createRadialGradient(
        world_pos.x,
        world_pos.y,
        this.radius,
        world_pos.x,
        world_pos.y,
        glow_radius
      );
      grad.addColorStop(0, `rgba(255, 255, 255, ${glow_intensity})`);
      grad.addColorStop(1, `rgba(255, 255, 255, 0)`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(world_pos.x, world_pos.y, glow_radius, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Label
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const true_screen_pos = {
      x: world_pos.x * state.zoom + canvas.width / 2 + state.pan.x,
      y: -world_pos.y * state.zoom + canvas.height / 2 + state.pan.y,
    };
    const screen_radius = this.radius * state.zoom;

    if (screen_radius > 3) {
      const label_y_offset = screen_radius * 2 + 12;
      ctx.font = '12px Roboto Mono';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'black';
      ctx.shadowBlur = 4;
      ctx.fillText(
        `${this.massInSuns.toFixed(2)} M☉ WD`,
        true_screen_pos.x,
        true_screen_pos.y + label_y_offset
      );
    }
    ctx.restore();
  }

  get_state() {
    const baseState = super.get_state();
    return {
      ...baseState,
      massInSuns: this.massInSuns,
      temperature: this.temperature,
      cooling_age: this.cooling_age,
    };
  }

  set_state(s) {
    super.set_state(s);
    this.massInSuns = s.massInSuns;
    this.temperature = s.temperature || 10000;
    this.cooling_age = s.cooling_age || 1;
  }
}

// Particle object pool for memory optimization
class ParticlePool {
  constructor(initialSize = 100) {
    this.pool = [];
    this.activeParticles = [];
    this.maxPoolSize = initialSize;
    
    // Don't pre-allocate particles to avoid initialization issues
    // They will be created as needed and pooled when they die
  }
  
  getParticle(pos, vel, lifetime = 0.8, start_size = 5, end_size = 1, color = 'rgb(255,255,100)') {
    let particle;
    if (this.pool.length > 0) {
      particle = this.pool.pop();
      if (particle.reset) {
        particle.reset(pos, vel, lifetime, start_size, end_size, color);
      } else {
        // Fallback for particles created before reset method was added
        if (!particle.pos) particle.pos = { x: 0, y: 0 };
        if (!particle.vel) particle.vel = { x: 0, y: 0 };
        particle.pos.x = pos.x;
        particle.pos.y = pos.y;
        particle.vel.x = vel.x;
        particle.vel.y = vel.y;
        particle.lifetime = Math.max(0.1, lifetime);
        particle.age = 0;
        particle.start_size = start_size;
        particle.end_size = end_size;
        particle.color = color;
      }
    } else {
      particle = new Particle(pos, vel, lifetime, start_size, end_size, color);
    }
    this.activeParticles.push(particle);
    return particle;
  }
  
  updateAndCleanup(dt) {
    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const particle = this.activeParticles[i];
      particle.update(dt);
      
      if (!particle.is_alive()) {
        // Return to pool if not at max capacity
        this.activeParticles.splice(i, 1);
        if (this.pool.length < this.maxPoolSize) {
          this.pool.push(particle);
        }
        // Otherwise let it be garbage collected
      }
    }
  }
  
  getActiveParticles() {
    return this.activeParticles;
  }
  
  clear() {
    this.pool.push(...this.activeParticles);
    this.activeParticles.length = 0;
  }
}

// Global particle pool - initialize after Particle class is defined
let particlePool;

// Particle class for visual effects - optimized with reset method
class Particle {
  constructor(
    pos,
    vel,
    lifetime = 0.8,
    start_size = 5,
    end_size = 1,
    color = 'rgb(255,255,100)'
  ) {
    this.pos = { x: 0, y: 0 };
    this.vel = { x: 0, y: 0 };
    this.reset(pos, vel, lifetime, start_size, end_size, color);
  }
  
  reset(pos, vel, lifetime, start_size, end_size, color) {
    this.pos.x = pos.x;
    this.pos.y = pos.y;
    this.vel.x = vel.x;
    this.vel.y = vel.y;
    this.lifetime = Math.max(0.1, lifetime);
    this.age = 0;
    this.start_size = start_size;
    this.end_size = end_size;
    this.color = color;
  }

  update(dt) {
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    this.age += dt;
  }

  is_alive() {
    return this.age < this.lifetime;
  }

  draw(ctx) {
    const life_fraction = this.age / this.lifetime;
    const current_size =
      this.start_size * (1 - life_fraction) + this.end_size * life_fraction;
    const alpha = 1 - life_fraction;

    if (current_size < 1 || alpha < 0.05) return;

    const world_pos = this.pos; // Use direct world coordinates since canvas is already transformed
    
    // Special kilonova glow effect
    if (this.kilonova_glow && this.glow_intensity) {
      const glow_size = current_size * 3 * this.glow_intensity;
      const glow_alpha = alpha * 0.3 * this.glow_intensity;
      
      // Draw glow
      ctx.fillStyle = this.color;
      ctx.globalAlpha = glow_alpha;
      ctx.beginPath();
      ctx.arc(
        world_pos.x,
        world_pos.y,
        glow_size / state.zoom,
        0,
        2 * Math.PI
      );
      ctx.fill();
    }
    
    // Draw main particle
    ctx.fillStyle = this.color;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(
      world_pos.x,
      world_pos.y,
      current_size / state.zoom,
      0,
      2 * Math.PI
    );
    ctx.fill();
    ctx.globalAlpha = 1; // Reset alpha
  }
}

// Initialize particle pool after Particle class is defined
particlePool = new ParticlePool(200);

// Add missing utility functions from original
const findObjectAtPosition = (worldPos) => {
  // Check black holes first (they're usually the most important)
  for (const bh of bh_list) {
    const dx = worldPos.x - bh.pos.x;
    const dy = worldPos.y - bh.pos.y;
    const clickRadius = Math.max(bh.radius, 10 / state.zoom); // Use actual radius or minimum clickable size
    if (dx*dx + dy*dy < clickRadius*clickRadius) {
      return { object: bh, type: 'BlackHole' };
    }
  }
  
  // Check stars
  for (const star of stars) {
    if (!star.alive) continue;
    const dx = worldPos.x - star.pos.x;
    const dy = worldPos.y - star.pos.y;
    const clickRadius = Math.max(star.radius, 8 / state.zoom); // Use actual radius or minimum clickable size
    if (dx*dx + dy*dy < clickRadius*clickRadius) {
      return { object: star, type: 'Star' };
    }
  }
  
  // Check neutron stars
  for (const ns of neutron_stars) {
    if (!ns.alive) continue;
    const dx = worldPos.x - ns.pos.x;
    const dy = worldPos.y - ns.pos.y;
    const clickRadius = Math.max(ns.radius, 6 / state.zoom); // Use actual radius or minimum clickable size
    if (dx*dx + dy*dy < clickRadius*clickRadius) {
      return { object: ns, type: 'NeutronStar' };
    }
  }
  
  // Check white dwarfs
  for (const wd of white_dwarfs) {
    if (!wd.alive) continue;
    const dx = worldPos.x - wd.pos.x;
    const dy = worldPos.y - wd.pos.y;
    const clickRadius = Math.max(wd.radius, 6 / state.zoom); // Use actual radius or minimum clickable size
    if (dx*dx + dy*dy < clickRadius*clickRadius) {
      return { object: wd, type: 'WhiteDwarf' };
    }
  }
  
  // Check gas giants
  for (const gasGiant of gas_giants) {
    if (!gasGiant.alive) continue;
    const dx = worldPos.x - gasGiant.pos.x;
    const dy = worldPos.y - gasGiant.pos.y;
    const clickRadius = Math.max(gasGiant.radius, 8 / state.zoom); // Use actual radius or minimum clickable size
    if (dx*dx + dy*dy < clickRadius*clickRadius) {
      return { object: gasGiant, type: 'GasGiant' };
    }
  }
  
  // Check planets
  for (const planet of planets) {
    if (!planet.alive) continue;
    const dx = worldPos.x - planet.pos.x;
    const dy = worldPos.y - planet.pos.y;
    const clickRadius = Math.max(planet.radius, 6 / state.zoom); // Use actual radius or minimum clickable size
    if (dx*dx + dy*dy < clickRadius*clickRadius) {
      return { object: planet, type: 'Planet' };
    }
  }
  
  // Check asteroids (including comets)
  for (const asteroid of asteroids) {
    if (!asteroid.alive) continue;
    const dx = worldPos.x - asteroid.pos.x;
    const dy = worldPos.y - asteroid.pos.y;
    const clickRadius = Math.max(asteroid.radius, 4 / state.zoom); // Use actual radius or minimum clickable size
    if (dx*dx + dy*dy < clickRadius*clickRadius) {
      // Determine if it's a comet or regular asteroid
      if (asteroid instanceof Comet) {
        return { object: asteroid, type: 'Comet' };
      } else {
        return { object: asteroid, type: 'Asteroid' };
      }
    }
  }
  
  return null;
};

// Comet class from original
class Comet extends PhysicsObject {
  constructor(pos, vel, massInComets = null) {
    let finalMassInComets;
    if (massInComets !== null) {
      finalMassInComets = massInComets;
    } else {
      // Comets are typically very small. Range ~0.001 to 0.1 comet masses (Halley's Comet = 1.0)
      finalMassInComets = Math.pow(10, (Math.random() * 2) - 3); 
    }
    
    const radius = ASTEROID_RADIUS * Math.pow(finalMassInComets, 0.4) * 0.8; // Comets are smaller than asteroids
    const mass = finalMassInComets * 0.1; // 0.1 = typical comet mass
    
    super(pos, vel, mass, radius, "Comet");
    this.massInComets = finalMassInComets;
    this.cometType = this.calculateCometType();
    this.tailLength = Math.random() * 50 + 20; // Random tail length
    this.intact = true;
    this.name = getRandomName('comets');
  }
  
  calculateCometType() {
    // Determine comet type based on mass and random factors
    if (this.massInComets > 0.1) {
      return 'periodic'; // Large periodic comets like Halley's
    } else if (this.massInComets > 0.01) {
      return 'long_period'; // Long-period comets
    } else {
      return 'short_period'; // Short-period comets
    }
  }
  
  draw(ctx) {
    const world_pos = world_to_screen(this.pos);
    const true_screen_pos = world_to_screen(this.pos);
    const screen_radius = this.radius * state.zoom;
    
    ctx.save();
    
    // Draw comet tail (opposite to velocity direction)
    if (screen_radius > 1) {
      const speed = Math.hypot(this.vel.x, this.vel.y);
      if (speed > 0.1) {
        const tailDirection = { x: -this.vel.x / speed, y: -this.vel.y / speed };
        const tailLength = Math.min(this.tailLength * state.zoom, 100);
        
        // Draw tail gradient
        const gradient = ctx.createLinearGradient(
          true_screen_pos.x, true_screen_pos.y,
          true_screen_pos.x + tailDirection.x * tailLength,
          true_screen_pos.y + tailDirection.y * tailLength
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.3, 'rgba(200, 255, 255, 0.6)');
        gradient.addColorStop(0.7, 'rgba(150, 200, 255, 0.3)');
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(true_screen_pos.x, true_screen_pos.y, screen_radius * 2, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
    
    // Draw comet nucleus
    ctx.fillStyle = '#f0f0f0';
    ctx.beginPath();
    ctx.arc(true_screen_pos.x, true_screen_pos.y, screen_radius, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw label if large enough
    if (screen_radius > 3) {
      const label_y_offset = screen_radius + 12;
      ctx.font = '10px Roboto Mono';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'black';
      ctx.shadowBlur = 2;
      ctx.fillText(`${this.massInComets.toFixed(3)} C`, true_screen_pos.x, true_screen_pos.y + label_y_offset);
    }
    ctx.restore();
  }
  
  tidal_mass_loss(bh_list, dt) {
    if (!this.intact || !bh_list || bh_list.length === 0) return { debris_count: 0, fraction: 0 };
    let min_dist_sq = Infinity, closest_bh = null;
    for (const bh of bh_list) {
      const dx = this.pos.x - bh.pos.x;
      const dy = this.pos.y - bh.pos.y;
      const dist_sq = dx*dx + dy*dy;
      if (dist_sq < min_dist_sq) {
        min_dist_sq = dist_sq;
        closest_bh = bh;
      }
    }
    if (!closest_bh) return { debris_count: 0, fraction: 0 };
    
    // Comets are easily disrupted
    const tidal_threshold_sq = (closest_bh.radius * 2)**2;
    if (min_dist_sq < tidal_threshold_sq) {
      const min_dist = Math.sqrt(min_dist_sq);
      const tidal_threshold = Math.sqrt(tidal_threshold_sq);
      const fraction = Math.max(0.0, (tidal_threshold - min_dist) / tidal_threshold);
      
      this.mass -= this.mass * fraction * 0.1 * dt;
      let debris_count = Math.floor(fraction * 25 * dt);
      
      if (this.mass <= 0.01) {
        this.intact = false;
        this.alive = false;
        debris_count += 20;
      }
      return { debris_count, fraction };
    }
    return { debris_count: 0, fraction: 0 };
  }
  
  get_state() { 
    const baseState = super.get_state();
    return { ...baseState, massInComets: this.massInComets, cometType: this.cometType, tailLength: this.tailLength };
  }
  set_state(s) {
    super.set_state(s);
    this.massInComets = s.massInComets;
    this.cometType = s.cometType;
    this.tailLength = s.tailLength;
  }
}

// Handle collisions between objects
/**
 * Handle collisions between objects in the simulation
 * @param {Array} objects_list - Array of physics objects to check for collisions
 */
const handle_collisions = objects_list => {
  for (let i = 0; i < objects_list.length; i++) {
    const obj1 = objects_list[i];
    if (!obj1.alive) continue;

    for (let j = i + 1; j < objects_list.length; j++) {
      const obj2 = objects_list[j];
      if (!obj2.alive) continue;

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
  }
};

// Create kilonova explosion effect
/**
 * Create a spectacular kilonova explosion when neutron stars merge
 * @param {Object} pos - Position of the explosion
 * @param {number} mass - Combined mass of the merging neutron stars
 */
const createKilonovaExplosion = (pos, mass) => {
  // Kilonova parameters based on mass
  const massInSuns = mass / SOLAR_MASS_UNIT;
  const explosionIntensity = Math.min(2.0, massInSuns / 2.0); // Scale with mass
  
  // Create massive particle explosion
  const particleCount = Math.floor(200 + massInSuns * 50); // 200-400 particles based on mass
  
  for (let i = 0; i < particleCount; i++) {
    // Random angle and speed for explosion
    const angle = Math.random() * 2 * Math.PI;
    const speed = (Math.random() * 300 + 200) * explosionIntensity; // 200-500 speed units
    
    const vel = {
      x: speed * Math.cos(angle),
      y: speed * Math.sin(angle)
    };
    
    // Random position within explosion radius
    const radius = Math.random() * 50;
    const spawnAngle = Math.random() * 2 * Math.PI;
    const spawnPos = {
      x: pos.x + radius * Math.cos(spawnAngle),
      y: pos.y + radius * Math.sin(spawnAngle)
    };
    
    // Kilonova colors: bright blue-white to orange-red
    const colors = [
      'rgb(255, 255, 255)', // Pure white
      'rgb(255, 255, 200)', // Bright yellow
      'rgb(255, 200, 100)', // Orange
      'rgb(255, 150, 50)',  // Bright orange
      'rgb(255, 100, 0)',   // Red-orange
      'rgb(200, 100, 255)', // Purple (r-process elements)
      'rgb(100, 200, 255)'  // Blue (gamma rays)
    ];
    
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    // Create particle with kilonova properties
    const particle = particlePool.getParticle(
      spawnPos,
      vel,
      Math.random() * 3.0 + 2.0, // 2-5 second lifetime
      Math.random() * 15 + 10,   // 10-25 start size
      Math.random() * 3 + 1,     // 1-4 end size
      color
    );
    
    // Add special kilonova glow effect
    if (particle) {
      particle.kilonova_glow = true;
      particle.glow_intensity = Math.random() * 0.5 + 0.5;
    }
  }
  
  // Create gravitational wave ripple effect
  gravity_ripples.push({
    x: pos.x,
    y: pos.y,
    time: Date.now(),
    created: performance.now(),
    duration: 3000, // 3 seconds - reduced from 5 seconds
    mass: massInSuns,
    gw_strength: 0.4, // Reduced strength from 1.0 to 0.4
    kilonova: true // Special flag for kilonova GW
  });
  
  // Create shockwave effect
  for (let i = 0; i < 50; i++) {
    const angle = (i / 50) * 2 * Math.PI;
    const speed = 150 + Math.random() * 100;
    const vel = {
      x: speed * Math.cos(angle),
      y: speed * Math.sin(angle)
    };
    
    particlePool.getParticle(
      pos,
      vel,
      Math.random() * 2.0 + 1.0, // 1-3 second lifetime
      Math.random() * 8 + 5,     // 5-13 start size
      Math.random() * 2 + 1,     // 1-3 end size
      'rgb(255, 255, 255)'       // White shockwave
    );
  }
};

// Create smaller kilonova explosion for neutron star mergers that don't form black holes
/**
 * Create a smaller kilonova explosion when neutron stars merge but don't form a black hole
 * @param {Object} pos - Position of the explosion
 * @param {number} mass - Combined mass of the merging neutron stars
 */
const createSmallKilonovaExplosion = (pos, mass) => {
  // Kilonova parameters based on mass (reduced intensity)
  const massInSuns = mass / SOLAR_MASS_UNIT;
  const explosionIntensity = Math.min(1.0, massInSuns / 3.0); // Reduced intensity for smaller explosions
  
  // Create smaller particle explosion
  const particleCount = Math.floor(100 + massInSuns * 25); // 100-200 particles (half of full kilonova)
  
  for (let i = 0; i < particleCount; i++) {
    // Random angle and speed for explosion
    const angle = Math.random() * 2 * Math.PI;
    const speed = (Math.random() * 200 + 150) * explosionIntensity; // 150-350 speed units (reduced)
    
    const vel = {
      x: speed * Math.cos(angle),
      y: speed * Math.sin(angle)
    };
    
    // Random position within explosion radius (smaller)
    const radius = Math.random() * 30;
    const spawnAngle = Math.random() * 2 * Math.PI;
    const spawnPos = {
      x: pos.x + radius * Math.cos(spawnAngle),
      y: pos.y + radius * Math.sin(spawnAngle)
    };
    
    // Kilonova colors: bright blue-white to orange-red (same as full kilonova)
    const colors = [
      'rgb(255, 255, 255)', // Pure white
      'rgb(255, 255, 200)', // Bright yellow
      'rgb(255, 200, 100)', // Orange
      'rgb(255, 150, 50)',  // Bright orange
      'rgb(255, 100, 0)',   // Red-orange
      'rgb(200, 100, 255)', // Purple (r-process elements)
      'rgb(100, 200, 255)'  // Blue (gamma rays)
    ];
    
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    // Create particle with kilonova properties (smaller sizes)
    const particle = particlePool.getParticle(
      spawnPos,
      vel,
      Math.random() * 2.0 + 1.5, // 1.5-3.5 second lifetime (shorter)
      Math.random() * 10 + 6,    // 6-16 start size (smaller)
      Math.random() * 2 + 1,     // 1-3 end size (smaller)
      color
    );
    
    // Add special kilonova glow effect (reduced intensity)
    if (particle) {
      particle.kilonova_glow = true;
      particle.glow_intensity = Math.random() * 0.3 + 0.3; // Reduced glow
    }
  }
  
  // Create gravitational wave ripple effect (smaller)
  gravity_ripples.push({
    x: pos.x,
    y: pos.y,
    time: Date.now(),
    created: performance.now(),
    duration: 2000, // 2 seconds (shorter than full kilonova)
    mass: massInSuns,
    gw_strength: 0.2, // Reduced strength
    kilonova: true // Special flag for kilonova GW
  });
  
  // Create smaller shockwave effect
  for (let i = 0; i < 25; i++) { // Half the shockwave particles
    const angle = (i / 25) * 2 * Math.PI;
    const speed = 100 + Math.random() * 75; // Reduced speed
    const vel = {
      x: speed * Math.cos(angle),
      y: speed * Math.sin(angle)
    };
    
    particlePool.getParticle(
      pos,
      vel,
      Math.random() * 1.5 + 0.8, // 0.8-2.3 second lifetime (shorter)
      Math.random() * 6 + 3,     // 3-9 start size (smaller)
      Math.random() * 1.5 + 0.5, // 0.5-2 end size (smaller)
      'rgb(255, 255, 255)'       // White shockwave
    );
  }
};

// Create neutron star-white dwarf merger explosion
/**
 * Create a moderate explosion when neutron star and white dwarf merge
 * @param {Object} pos - Position of the explosion
 * @param {number} mass - Combined mass of the merging objects
 */
const createNSWDExplosion = (pos, mass) => {
  console.log('createNSWDExplosion called!');
  const massInSuns = mass / SOLAR_MASS_UNIT;
  const explosionIntensity = Math.min(1.5, massInSuns / 1.5); // Moderate intensity
  
  // Create moderate particle explosion
  const particleCount = Math.floor(80 + massInSuns * 30); // 80-150 particles
  
  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const speed = (Math.random() * 200 + 150) * explosionIntensity; // 150-350 speed units
    
    const vel = {
      x: speed * Math.cos(angle),
      y: speed * Math.sin(angle)
    };
    
    const radius = Math.random() * 30;
    const spawnAngle = Math.random() * 2 * Math.PI;
    const spawnPos = {
      x: pos.x + radius * Math.cos(spawnAngle),
      y: pos.y + radius * Math.sin(spawnAngle)
    };
    
    // NS-WD colors: white to blue-white
    const colors = [
      'rgb(255, 255, 255)', // Pure white
      'rgb(255, 255, 220)', // Bright white-yellow
      'rgb(220, 255, 255)', // Cyan-white
      'rgb(200, 220, 255)', // Blue-white
      'rgb(255, 220, 200)', // Pink-white
      'rgb(180, 200, 255)'  // Light blue
    ];
    
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    const particle = particlePool.getParticle(
      spawnPos,
      vel,
      Math.random() * 2.0 + 1.5, // 1.5-3.5 second lifetime
      Math.random() * 10 + 6,    // 6-16 start size
      Math.random() * 2 + 1,     // 1-3 end size
      color
    );
    
    // Add moderate glow effect
    if (particle) {
      particle.kilonova_glow = true;
      particle.glow_intensity = Math.random() * 0.3 + 0.3; // Moderate glow
    }
  }
  
  // Create gravitational wave ripple effect
  gravity_ripples.push({
    x: pos.x,
    y: pos.y,
    time: Date.now(),
    created: performance.now(),
    duration: 3000, // 3 seconds
    mass: massInSuns,
    gw_strength: 0.6, // Moderate strength
    nswd_merger: true // Special flag for NS-WD merger
  });
  
  // Create moderate shockwave effect
  for (let i = 0; i < 25; i++) {
    const angle = (i / 25) * 2 * Math.PI;
    const speed = 120 + Math.random() * 80;
    const vel = {
      x: speed * Math.cos(angle),
      y: speed * Math.sin(angle)
    };
    
    particlePool.getParticle(
      pos,
      vel,
      Math.random() * 1.5 + 0.8, // 0.8-2.3 second lifetime
      Math.random() * 6 + 4,     // 4-10 start size
      Math.random() * 2 + 1,     // 1-3 end size
      'rgb(255, 255, 255)'       // White shockwave
    );
  }
};

// Create white dwarf-white dwarf merger explosion (Type Ia supernova precursor)
/**
 * Create a smaller explosion when white dwarfs merge
 * @param {Object} pos - Position of the explosion
 * @param {number} mass - Combined mass of the merging white dwarfs
 */
const createWDWDExplosion = (pos, mass) => {
  const massInSuns = mass / SOLAR_MASS_UNIT;
  const explosionIntensity = Math.min(1.0, massInSuns / 1.0); // Smaller intensity
  
  // Create smaller particle explosion
  const particleCount = Math.floor(40 + massInSuns * 20); // 40-80 particles
  
  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const speed = (Math.random() * 150 + 100) * explosionIntensity; // 100-250 speed units
    
    const vel = {
      x: speed * Math.cos(angle),
      y: speed * Math.sin(angle)
    };
    
    const radius = Math.random() * 20;
    const spawnAngle = Math.random() * 2 * Math.PI;
    const spawnPos = {
      x: pos.x + radius * Math.cos(spawnAngle),
      y: pos.y + radius * Math.sin(spawnAngle)
    };
    
    // WD-WD colors: white to yellow
    const colors = [
      'rgb(255, 255, 255)', // Pure white
      'rgb(255, 255, 240)', // Off-white
      'rgb(255, 250, 220)', // Cream
      'rgb(255, 240, 200)', // Light yellow
      'rgb(255, 230, 180)', // Pale yellow
      'rgb(240, 240, 255)'  // Very light blue
    ];
    
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    const particle = particlePool.getParticle(
      spawnPos,
      vel,
      Math.random() * 1.5 + 1.0, // 1-2.5 second lifetime
      Math.random() * 6 + 4,     // 4-10 start size
      Math.random() * 2 + 1,     // 1-3 end size
      color
    );
    
    // Add subtle glow effect
    if (particle) {
      particle.kilonova_glow = true;
      particle.glow_intensity = Math.random() * 0.2 + 0.2; // Subtle glow
    }
  }
  
  // Create gravitational wave ripple effect
  gravity_ripples.push({
    x: pos.x,
    y: pos.y,
    time: Date.now(),
    created: performance.now(),
    duration: 2000, // 2 seconds
    mass: massInSuns,
    gw_strength: 0.3, // Smaller strength
    wdwd_merger: true // Special flag for WD-WD merger
  });
  
  // Create small shockwave effect
  for (let i = 0; i < 15; i++) {
    const angle = (i / 15) * 2 * Math.PI;
    const speed = 80 + Math.random() * 60;
    const vel = {
      x: speed * Math.cos(angle),
      y: speed * Math.sin(angle)
    };
    
    particlePool.getParticle(
      pos,
      vel,
      Math.random() * 1.0 + 0.5, // 0.5-1.5 second lifetime
      Math.random() * 4 + 3,     // 3-7 start size
      Math.random() * 1 + 1,     // 1-2 end size
      'rgb(255, 255, 255)'       // White shockwave
    );
  }
};

// Handle star merging - stars combining into more massive objects
/**
 * Handle merging between stars, neutron stars, and white dwarfs
 * @param {Array} stars_list - Array of star objects to check for merging
 */
const handle_star_merging = (stars_list) => {
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
        
        const dx = star1.pos.x - star2.pos.x;
        const dy = star1.pos.y - star2.pos.y;
        const dist_sq = dx * dx + dy * dy;
        const min_dist = star1.radius + star2.radius;
        
        if (dist_sq < min_dist ** 2 && dist_sq > 1e-6) {
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
          for (let k = 0; k < 20; k++) {
            const angle = Math.random() * 2 * Math.PI;
            const speed = Math.random() * 40 + 20;
            const p_vel = {
              x: speed * Math.cos(angle),
              y: speed * Math.sin(angle),
            };
            particlePool.getParticle(
              new_pos,
              p_vel,
              Math.random() * 0.8 + 0.6,
              8,
              2,
              'rgb(255, 220, 100)'
            );
          }
          
          // Determine types once per pair
          const star1_type = star1.constructor.name;
          const star2_type = star2.constructor.name;
          // Special handling for black hole merging with regular star or white dwarf
          if ((star1_type === 'BlackHole' && (star2_type === 'StarObject' || star2_type === 'WhiteDwarf' || star2_type === 'NeutronStar')) ||
              (star2_type === 'BlackHole' && (star1_type === 'StarObject' || star1_type === 'WhiteDwarf' || star1_type === 'NeutronStar'))) {
            // Find the real black hole object
            const bh = star1_type === 'BlackHole' ? (star1._bh_ref || star1) : (star2._bh_ref || star2);
            const other = star1_type === 'BlackHole' ? star2 : star1;
            // Add the mass of the other object to the black hole
            const total_mass = bh.mass + other.mass;
            bh.vel.x = (bh.vel.x * bh.mass + other.vel.x * other.mass) / total_mass;
            bh.vel.y = (bh.vel.y * bh.mass + other.vel.y * other.mass) / total_mass;
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
              gw_strength: 0.13
            });
            // Mark only the non-BH as dead
            other.alive = false;
            // Remove the non-BH from its global list
            if (other.constructor.name === 'StarObject') stars = stars.filter(s => s !== other);
            if (other.constructor.name === 'WhiteDwarf') white_dwarfs = white_dwarfs.filter(wd => wd !== other);
            if (other.constructor.name === 'NeutronStar') neutron_stars = neutron_stars.filter(ns => ns !== other);
            // No new black hole is created, and the existing one remains in bh_list
            merged_this_step = true;
            break;
          }
          // Remove the two original stars
          star1.alive = false;
          star2.alive = false;
          
          // Determine what type of object to create based on mass and original types
          let new_object = null;
          
          // Check if either object is a neutron star or white dwarf
          const has_neutron_star = star1_type === 'NeutronStar' || star2_type === 'NeutronStar';
          const has_white_dwarf = star1_type === 'WhiteDwarf' || star2_type === 'WhiteDwarf';
          const has_regular_star = star1_type === 'StarObject' || star2_type === 'StarObject';
          
          if (has_neutron_star) {
            // Neutron star involved in merger
            const is_bh_merger = star1_type === 'BlackHole' || star2_type === 'BlackHole';
            if (is_bh_merger) {
              // NS-BH merger: subtle GW ripple (same as NS-NS)
              new_object = new BlackHole(new_pos, new_mass, new_vel, true);
              bh_list.push(new_object);
              neutron_stars = neutron_stars.filter(ns => ns !== star1 && ns !== star2);
              if (star1_type === 'BlackHole' && star1._bh_ref) { star1._bh_ref.alive = false; bh_list = bh_list.filter(bh => bh !== star1._bh_ref); }
              if (star2_type === 'BlackHole' && star2._bh_ref) { star2._bh_ref.alive = false; bh_list = bh_list.filter(bh => bh !== star2._bh_ref); }
              gravity_ripples.push({
                x: new_pos.x,
                y: new_pos.y,
                time: Date.now(),
                created: performance.now(),
                duration: 1200, // ms, subtle
                mass: Math.max(0.2, (new_mass / SOLAR_MASS_UNIT) * 0.18),
                gw_strength: 0.08 // subtle
              });
            } else if (new_mass_in_suns > 3.0) {
              // Exceeds Tolman-Oppenheimer-Volkoff limit -> black hole
              // Check if this is a neutron star-neutron star merger (kilonova)
              const is_ns_ns_merger = star1_type === 'NeutronStar' && star2_type === 'NeutronStar';
              
              if (is_ns_ns_merger) {
                // Create spectacular kilonova explosion for black hole formation
                createKilonovaExplosion(new_pos, new_mass);
              }
              
              new_object = new BlackHole(new_pos, new_mass, new_vel, true);
              bh_list.push(new_object);
              // Remove merged neutron star from global list
              neutron_stars = neutron_stars.filter(ns => ns !== star1 && ns !== star2);
              
              // Only add regular GW ripple if not a kilonova (kilonova creates its own)
              if (!is_ns_ns_merger) {
                gravity_ripples.push({
                  x: new_pos.x,
                  y: new_pos.y,
                  time: Date.now(),
                  created: performance.now(),
                  duration: 3000, // ms, longer and more visible for NS-BH mergers
                  mass: new_mass / SOLAR_MASS_UNIT,
                  gw_strength: 0.5 // More apparent for NS-BH merger
                });
              }
            } else {
              // Stays as neutron star
              // Check if this is a neutron star-neutron star merger (smaller kilonova)
              const is_ns_ns_merger = star1_type === 'NeutronStar' && star2_type === 'NeutronStar';
              
              if (is_ns_ns_merger) {
                // Create smaller kilonova explosion for neutron star formation
                createSmallKilonovaExplosion(new_pos, new_mass);
              } else {
                // Check if this is a neutron star-white dwarf merger
                const is_ns_wd_merger = (star1_type === 'NeutronStar' && star2_type === 'WhiteDwarf') ||
                                       (star1_type === 'WhiteDwarf' && star2_type === 'NeutronStar');
                
                if (is_ns_wd_merger) {
                  // Create neutron star-white dwarf merger explosion
                  console.log('NS-WD merger detected in neutron star section! Mass:', new_mass_in_suns, 'solar masses');
                  createNSWDExplosion(new_pos, new_mass);
                }
              }
              
              new_object = new NeutronStar(new_pos, new_vel, new_mass_in_suns, null);
              neutron_stars.push(new_object);
            }
          } else if (has_white_dwarf) {
            // White dwarf involved in merger
            if (new_mass_in_suns > 1.4) {
              // Exceeds Chandrasekhar limit -> neutron star
              // Check if this is a neutron star-white dwarf merger
              const is_ns_wd_merger = (star1_type === 'NeutronStar' && star2_type === 'WhiteDwarf') ||
                                     (star1_type === 'WhiteDwarf' && star2_type === 'NeutronStar');
              
              // Check if this is a white dwarf-white dwarf merger
              const is_wd_wd_merger = star1_type === 'WhiteDwarf' && star2_type === 'WhiteDwarf';
              
              if (is_ns_wd_merger) {
                // Create neutron star-white dwarf merger explosion
                console.log('NS-WD merger detected! Mass:', new_mass_in_suns, 'solar masses');
                createNSWDExplosion(new_pos, new_mass);
              } else if (is_wd_wd_merger) {
                // Create white dwarf-white dwarf merger explosion (results in neutron star)
                createWDWDExplosion(new_pos, new_mass);
              }
              
              new_object = new NeutronStar(new_pos, new_vel, new_mass_in_suns, null);
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
                  gw_strength: 0.1 // WD-NS or WD-BH merger
                });
              }
            } else {
              // Stays as white dwarf (rare case when combined mass <= 1.4 solar masses)
              new_object = new WhiteDwarf(new_pos, new_vel, new_mass_in_suns);
              white_dwarfs.push(new_object);
            }
          } else if (has_regular_star) {
            // Regular star merging
            if (new_mass_in_suns > MAX_STAR_MASS_BEFORE_BH) {
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
                gw_strength: 0.08 // subtle
              });
            } else if (new_mass_in_suns > 8.0) {
              // Massive star -> neutron star
              new_object = new NeutronStar(new_pos, new_vel, new_mass_in_suns, null);
              neutron_stars.push(new_object);
              gravity_ripples.push({
                x: new_pos.x,
                y: new_pos.y,
                time: Date.now(),
                created: performance.now(),
                duration: 2200, // ms, shorter for smaller mergers
                mass: new_mass / SOLAR_MASS_UNIT,
                gw_strength: 0.2 // NS-NS or NS-BH merger
              });
            } else {
              // Regular star
              new_object = new StarObject(new_pos, new_vel, new_mass_in_suns);
              stars.push(new_object);
            }
          }
          
          merged_this_step = true;
          break;
        }
      }
      if (merged_this_step) break;
    }
    
    // Filter out dead stars after processing all collisions
    stars_list = stars_list.filter(star => star.alive);
    // After each round, rebuild stars_list from global lists to reflect new state
    stars_list = [...stars, ...neutron_stars, ...white_dwarfs, ...bh_list].filter(obj => obj.alive);
  }
};

// Handle collisions between stars and smaller objects (planets, gas giants, asteroids)
/**
 * Handle stars absorbing planets, gas giants, and asteroids
 */
const handle_star_object_collisions = () => {
  // Collect all stellar objects (stars, neutron stars, white dwarfs)
  const stellar_objects = [
    ...stars.filter(s => s.alive),
    ...neutron_stars.filter(s => s.alive),
    ...white_dwarfs.filter(s => s.alive)
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
        // Star absorbs the planet
        star.mass += planet.mass;
        
        // Update star properties based on type
        if (star.constructor.name === 'NeutronStar') {
          star.massInSuns = star.mass / SOLAR_MASS_UNIT;
        } else if (star.constructor.name === 'WhiteDwarf') {
          star.massInSuns = star.mass / SOLAR_MASS_UNIT;
        } else if (star.constructor.name === 'StarObject') {
          star.massInSuns = star.mass / SOLAR_MASS_UNIT;
          // Update radius for regular stars
          star.radius = STAR_OBJ_RADIUS * Math.pow(star.massInSuns, 0.85);
        }
        
        // Create absorption particles
        for (let k = 0; k < 5; k++) {
          const angle = Math.random() * 2 * Math.PI;
          const speed = Math.random() * 20 + 10;
          const p_vel = {
            x: speed * Math.cos(angle),
            y: speed * Math.sin(angle),
          };
          particlePool.getParticle(
            planet.pos,
            p_vel,
            Math.random() * 0.5 + 0.3,
            4,
            1,
            'rgb(255, 200, 100)'
          );
        }
        
        planet.alive = false;
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
        // Star absorbs the gas giant
        star.mass += gasGiant.mass;
        
        // Update star properties based on type
        if (star.constructor.name === 'NeutronStar') {
          star.massInSuns = star.mass / SOLAR_MASS_UNIT;
        } else if (star.constructor.name === 'WhiteDwarf') {
          star.massInSuns = star.mass / SOLAR_MASS_UNIT;
        } else if (star.constructor.name === 'StarObject') {
          star.massInSuns = star.mass / SOLAR_MASS_UNIT;
          // Update radius for regular stars
          star.radius = STAR_OBJ_RADIUS * Math.pow(star.massInSuns, 0.85);
        }
        
        // Create more dramatic absorption particles for gas giant
        for (let k = 0; k < 8; k++) {
          const angle = Math.random() * 2 * Math.PI;
          const speed = Math.random() * 30 + 15;
          const p_vel = {
            x: speed * Math.cos(angle),
            y: speed * Math.sin(angle),
          };
          particlePool.getParticle(
            gasGiant.pos,
            p_vel,
            Math.random() * 0.6 + 0.4,
            6,
            2,
            'rgb(135, 206, 235)'
          );
        }
        
        gasGiant.alive = false;
      }
    }
    
    // Check with asteroids and comets
    for (let j = 0; j < asteroids.length; j++) {
      const asteroid = asteroids[j];
      if (!asteroid.alive) continue;
      
      const dx = asteroid.pos.x - star.pos.x;
      const dy = asteroid.pos.y - star.pos.y;
      const dist_sq = dx * dx + dy * dy;
      const min_dist = star.radius + asteroid.radius;
      
      if (dist_sq < min_dist ** 2 && dist_sq > 1e-6) {
        // Star absorbs the asteroid/comet
        star.mass += asteroid.mass;
        
        // Update star properties based on type  
        if (star.constructor.name === 'NeutronStar') {
          star.massInSuns = star.mass / SOLAR_MASS_UNIT;
        } else if (star.constructor.name === 'WhiteDwarf') {
          star.massInSuns = star.mass / SOLAR_MASS_UNIT;
        } else if (star.constructor.name === 'StarObject') {
          star.massInSuns = star.mass / SOLAR_MASS_UNIT;
          // Update radius for regular stars
          star.radius = STAR_OBJ_RADIUS * Math.pow(star.massInSuns, 0.85);
        }
        
        // Create small absorption particles
        for (let k = 0; k < 3; k++) {
          const angle = Math.random() * 2 * Math.PI;
          const speed = Math.random() * 15 + 8;
          const p_vel = {
            x: speed * Math.cos(angle),
            y: speed * Math.sin(angle),
          };
          particlePool.getParticle(
            asteroid.pos,
            p_vel,
            Math.random() * 0.4 + 0.2,
            3,
            1,
            'rgb(200, 150, 100)'
          );
        }
        
        asteroid.alive = false;
      }
    }
  }
};

// Enhanced rocky planet collision handling
/**
 * Handle collisions between rocky planets with realistic physics
 * @param {Array} objects_list - Array of physics objects to check for collisions
 */
const handle_rocky_collisions = (objects_list) => {
  // Only handle planets and asteroids for rocky collisions
  const rocky_objects = objects_list.filter(obj => 
    obj.constructor.name === 'Planet' || obj.constructor.name === 'Asteroid'
  );
  
  for (let i = 0; i < rocky_objects.length; i++) {
    const obj1 = rocky_objects[i];
    if (!obj1.alive) continue;

    for (let j = i + 1; j < rocky_objects.length; j++) {
      const obj2 = rocky_objects[j];
      if (!obj2.alive) continue;

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
          
          // Both objects lose mass from collision
          obj1.mass *= 0.9;
          obj2.mass *= 0.9;
          
          // Create collision particles
          for (let k = 0; k < 10; k++) {
            const angle = Math.random() * 2 * Math.PI;
            const speed = Math.random() * 30 + 20;
            const p_vel = {
              x: speed * Math.cos(angle),
              y: speed * Math.sin(angle),
            };
            particlePool.getParticle(
              { x: (obj1.pos.x + obj2.pos.x) * 0.5, y: (obj1.pos.y + obj2.pos.y) * 0.5 },
              p_vel,
              Math.random() * 0.6 + 0.4,
              5,
              1,
              'rgb(255, 100, 50)'
            );
          }
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
  }
};

// Check for stellar collapse into black holes
/**
 * Check if any stars have exceeded the maximum mass and convert them to black holes
 */
const check_stellar_collapse = () => {
  // Check regular stars
  for (let i = stars.length - 1; i >= 0; i--) {
    const star = stars[i];
    if (!star.alive) continue;
    
    const massInSuns = star.mass / SOLAR_MASS_UNIT;
    if (massInSuns > MAX_STAR_MASS_BEFORE_BH) {
      // Convert star to black hole - mark as newly created for proper accretion disk initialization
      const new_bh = new BlackHole(star.pos, star.mass, star.vel, true);
      bh_list.push(new_bh);
      
      // Create collapse particles
      for (let k = 0; k < 30; k++) {
        const angle = Math.random() * 2 * Math.PI;
        const speed = Math.random() * 60 + 40;
        const p_vel = {
          x: speed * Math.cos(angle),
          y: speed * Math.sin(angle),
        };
        particlePool.getParticle(
          star.pos,
          p_vel,
          Math.random() * 1.2 + 0.8,
          12,
          3,
          'rgb(255, 255, 255)'
        );
      }
      
      // Remove the star
      star.alive = false;
      stars.splice(i, 1);
    }
  }
  
  // Check neutron stars for collapse to black holes
  for (let i = neutron_stars.length - 1; i >= 0; i--) {
    const ns = neutron_stars[i];
    if (!ns.alive) continue;
    
    const massInSuns = ns.mass / SOLAR_MASS_UNIT;
    if (massInSuns > 3.0) { // Tolman-Oppenheimer-Volkoff limit
      // Convert neutron star to black hole - mark as newly created for proper accretion disk initialization
      const new_bh = new BlackHole(ns.pos, ns.mass, ns.vel, true);
      bh_list.push(new_bh);
      
      // Create collapse particles
      for (let k = 0; k < 25; k++) {
        const angle = Math.random() * 2 * Math.PI;
        const speed = Math.random() * 80 + 60;
        const p_vel = {
          x: speed * Math.cos(angle),
          y: speed * Math.sin(angle),
        };
        particlePool.getParticle(
          ns.pos,
          p_vel,
          Math.random() * 1.0 + 0.6,
          10,
          2,
          'rgb(200, 200, 255)'
        );
      }
      
      // Remove the neutron star
      ns.alive = false;
      neutron_stars.splice(i, 1);
    }
  }
  
  // Check white dwarfs for collapse to neutron stars
  for (let i = white_dwarfs.length - 1; i >= 0; i--) {
    const wd = white_dwarfs[i];
    if (!wd.alive) continue;
    
    const massInSuns = wd.mass / SOLAR_MASS_UNIT;
    if (massInSuns > 1.4) { // Chandrasekhar limit
      // Convert white dwarf to neutron star
      const new_ns = new NeutronStar(wd.pos, wd.vel, massInSuns, null);
      neutron_stars.push(new_ns);
      
      // Create collapse particles
      for (let k = 0; k < 20; k++) {
        const angle = Math.random() * 2 * Math.PI;
        const speed = Math.random() * 70 + 50;
        const p_vel = {
          x: speed * Math.cos(angle),
          y: speed * Math.sin(angle),
        };
        particlePool.getParticle(
          wd.pos,
          p_vel,
          Math.random() * 0.8 + 0.5,
          8,
          2,
          'rgb(255, 200, 200)'
        );
      }
      
      // Remove the white dwarf
      wd.alive = false;
      white_dwarfs.splice(i, 1);
    }
  }
};

// Handle gas giant merging and collisions
const handle_gas_giant_merging = () => {
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
        
        const dx = gasGiant1.pos.x - gasGiant2.pos.x;
        const dy = gasGiant1.pos.y - gasGiant2.pos.y;
        const dist_sq = dx * dx + dy * dy;
        const min_dist = gasGiant1.radius + gasGiant2.radius;
        
        if (dist_sq < min_dist ** 2 && dist_sq > 1e-6) {
          const m1 = gasGiant1.mass;
          const m2 = gasGiant2.mass;
          const new_mass = m1 + m2;
          const new_mass_in_jupiters = new_mass / 50.0; // Convert to Jupiter masses (50 units = 1 Jupiter mass)
          
          // Calculate center of mass position and velocity
          const new_pos = {
            x: (gasGiant1.pos.x * m1 + gasGiant2.pos.x * m2) / new_mass,
            y: (gasGiant1.pos.y * m1 + gasGiant2.pos.y * m2) / new_mass,
          };
          const new_vel = {
            x: (gasGiant1.vel.x * m1 + gasGiant2.vel.x * m2) / new_mass,
            y: (gasGiant1.vel.y * m1 + gasGiant2.vel.y * m2) / new_mass,
          };
          
          // Create merger particles
          for (let k = 0; k < 15; k++) {
            const angle = Math.random() * 2 * Math.PI;
            const speed = Math.random() * 35 + 15;
            const p_vel = {
              x: speed * Math.cos(angle),
              y: speed * Math.sin(angle),
            };
            particlePool.getParticle(
              new_pos,
              p_vel,
              Math.random() * 0.7 + 0.5,
              6,
              2,
              'rgb(135, 206, 235)'
            );
          }
          
          // Remove the two original gas giants
          gasGiant1.alive = false;
          gasGiant2.alive = false;
          
          // Determine what type of object to create based on mass
          let new_object = null;
          
          if (new_mass_in_jupiters >= GAS_GIANT_TO_STAR_THRESHOLD) {
            // Very massive gas giant becomes a low-mass star
            const star_mass_in_suns = new_mass_in_jupiters / 1047.0; // Convert Jupiter masses to solar masses
            new_object = new StarObject(new_pos, new_vel, star_mass_in_suns);
            new_object.mass = star_mass_in_suns * SOLAR_MASS_UNIT;
            stars.push(new_object);
            
            // Create extra particles for star formation
            for (let k = 0; k < 10; k++) {
              const angle = Math.random() * 2 * Math.PI;
              const speed = Math.random() * 50 + 25;
              const p_vel = {
                x: speed * Math.cos(angle),
                y: speed * Math.sin(angle),
              };
              particlePool.getParticle(
                new_pos,
                p_vel,
                Math.random() * 1.0 + 0.8,
                10,
                3,
                'rgb(255, 255, 0)'
              );
            }
          } else {
            // Create a larger gas giant
            new_object = new GasGiant(new_pos, new_vel, new_mass_in_jupiters);
            gas_giants.push(new_object);
          }
          
          merged_this_step = true;
          break;
        }
      }
      if (merged_this_step) break;
    }
    
    // Filter out dead gas giants after processing all collisions
    gas_giants = gas_giants.filter(gasGiant => gasGiant.alive);
  }
};

// Export classes and functions for use in other modules
export {
  PhysicsObject,
  Planet,
  GasGiant,
  Asteroid,
  Comet,
  Debris,
  BlackHole,
  StarObject,
  NeutronStar,
  WhiteDwarf,
  Particle,
  ParticlePool,
  AccretionDiskParticle,
  particlePool,
  gravitational_acceleration,
  world_to_screen,
  screen_to_world,
  is_offscreen,
  compute_dynamic_color,
  updatePhysics,
  handle_collisions,
  handle_star_merging,
  handle_star_object_collisions,
  handle_rocky_collisions,
  check_stellar_collapse,
  findObjectAtPosition,
  DT,
  SOLAR_MASS_UNIT,
  EARTH_MASS_UNIT,
  ABSORB_BUFFER,
  MIN_INTERACTION_DISTANCE,
  BH_RADIUS_BASE,
  PLANET_RADIUS,
  GAS_GIANT_RADIUS,
  ASTEROID_RADIUS,
  STAR_OBJ_RADIUS,
  NEUTRON_STAR_RADIUS,
  WHITE_DWARF_RADIUS,
  DEBRIS_RADIUS,
  MAX_STAR_MASS_BEFORE_BH,
  GAS_GIANT_TO_STAR_THRESHOLD,
  bh_list,
  planets,
  stars,
  gas_giants,
  asteroids,
  comets,
  debris,
  particles,
  gwaves,
  gravity_ripples,
  neutron_stars,
  white_dwarfs,
  accretion_disk_particles,
  PhysicsObject_id_counter,
  state,
  resetPhysicsObjectCounter,
  setPhysicsObjectCounter,
  updatePhysicsSettings,
  setStateReference,
  // Energy calculation functions
  calculateKineticEnergy,
  calculateGravitationalPotentialEnergy,
  calculateTotalPotentialEnergy,
  calculateObjectEnergy,
  getAllPhysicsObjects,
  updateEnergyHistory,
  getObjectEnergyHistory,
  clearObjectEnergyHistory,
  clearEnergyHistory,
  clearAllEnergyHistory,
  getObjectEnergyStats,
  getEnergySystemMemoryStats,
  trimAllEnergyHistory,
  updateEnergySystemConfig,
};

// Helper: Wrap BlackHole as PhysicsObject-like for merging
function asPhysicsObject(bh) {
  return {
    pos: bh.pos,
    vel: bh.vel,
    mass: bh.mass,
    radius: bh.radius,
    alive: true,
    constructor: { name: 'BlackHole' },
    _bh_ref: bh // Keep reference to real BlackHole
  };
}

// ===== ENERGY SYSTEM =====
// Fresh energy calculation and tracking system

// Energy system configuration
const ENERGY_SAMPLE_RATE = 10; // Sample energy every 10 frames (100ms at 60fps)
const MAX_ENERGY_HISTORY_POINTS = 5000; // Maximum data points per object to prevent memory issues
// Memory management: Uses efficient slice() instead of shift() for O(1) trimming

// Astrophysical constants for realistic energy calculations
// Use the same gravitational constant as the physics simulation for consistency
// The physics simulation uses physicsSettings.gravitational_constant (typically 1.0)
// We need to convert this to SI units for energy calculations
const getGravitationalConstantSI = () => {
  // The physics simulation uses a simplified G value
  // We need to scale it to match the simulation's mass and distance units
  const simulationG = physicsSettings.gravitational_constant;
  const massScale = MASS_UNIT_TO_KG;
  const distanceScale = DISTANCE_UNIT_TO_M;
  const timeScale = 1.0; // Assuming time units are consistent
  
  // G in SI units = simulationG * (massScale * distanceScale^2 / timeScale^2)
  return simulationG * massScale * distanceScale * distanceScale / (timeScale * timeScale);
};
const SOLAR_MASS_KG = 1.989e30; // Solar mass in kg
const EARTH_MASS_KG = 5.972e24; // Earth mass in kg
const AU_METERS = 1.496e11; // Astronomical Unit in meters

// Conversion factors for simulation units to SI units
const MASS_UNIT_TO_KG = SOLAR_MASS_KG / SOLAR_MASS_UNIT; // Convert simulation mass units to kg
const VELOCITY_UNIT_TO_MS = 1000; // Convert simulation velocity units to m/s (estimated)
const DISTANCE_UNIT_TO_M = AU_METERS / 100; // Convert simulation distance units to meters (estimated)

// Energy scaling factor to make displayed values more reasonable
// This scales the energy values to be in a more readable range (e.g., 10^30 J instead of 10^54 J)
const ENERGY_SCALE_FACTOR = 1e-24; // Scale down by 10^24 to get more reasonable numbers

// Energy history storage - Map of object ID to energy history array
const energyHistory = new Map();

/**
 * Calculate kinetic energy for a physics object
 * @param {Object} object - Physics object with mass and velocity
 * @returns {number} Kinetic energy in joules
 */
const calculateKineticEnergy = (object) => {
  if (!object || !object.vel || !object.mass) return 0;
  
  const velocity = Math.sqrt(object.vel.x * object.vel.x + object.vel.y * object.vel.y);
  const massKg = object.mass * MASS_UNIT_TO_KG;
  const velocityMs = velocity * VELOCITY_UNIT_TO_MS;
  
  // Apply scaling factor to make energy values more reasonable for display
  return 0.5 * massKg * velocityMs * velocityMs * ENERGY_SCALE_FACTOR;
};

/**
 * Calculate gravitational potential energy between two objects
 * @param {Object} obj1 - First physics object
 * @param {Object} obj2 - Second physics object
 * @param {number} distance - Distance between objects in simulation units
 * @returns {number} Gravitational potential energy in joules
 */
const calculateGravitationalPotentialEnergy = (obj1, obj2, distance) => {
  if (!obj1 || !obj2 || distance <= 0) return 0;
  
  const mass1Kg = obj1.mass * MASS_UNIT_TO_KG;
  const mass2Kg = obj2.mass * MASS_UNIT_TO_KG;
  const distanceM = distance * DISTANCE_UNIT_TO_M;
  
  // Use the gravitational constant that matches the physics simulation
  const G_si = getGravitationalConstantSI();
  
  // Apply scaling factor to make energy values more reasonable for display
  return -G_si * mass1Kg * mass2Kg / distanceM * ENERGY_SCALE_FACTOR;
};

/**
 * Calculate total gravitational potential energy for an object relative to all other objects
 * @param {Object} object - Physics object to calculate potential energy for
 * @param {Array} allObjects - Array of all physics objects
 * @returns {number} Total gravitational potential energy in joules
 */
const calculateTotalPotentialEnergy = (object, allObjects) => {
  if (!object || !allObjects || allObjects.length === 0) return 0;
  
  let totalPotentialEnergy = 0;
  
  for (const otherObject of allObjects) {
    if (!otherObject || otherObject.id === object.id) continue;
    
    const dx = object.pos.x - otherObject.pos.x;
    const dy = object.pos.y - otherObject.pos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0) {
      totalPotentialEnergy += calculateGravitationalPotentialEnergy(object, otherObject, distance);
    }
  }
  
  return totalPotentialEnergy;
};

/**
 * Calculate total energy (kinetic + potential) for an object
 * @param {Object} object - Physics object
 * @param {number} timestamp - Current timestamp
 * @returns {Object} Energy data object with timestamp, ke, pe, total
 */
const calculateObjectEnergy = (object, timestamp) => {
  if (!object) {
    return {
      timestamp: timestamp || performance.now(),
      ke: 0,
      pe: 0,
      total: 0
    };
  }
  
  const kineticEnergy = calculateKineticEnergy(object);
  const potentialEnergy = calculateTotalPotentialEnergy(object, getAllPhysicsObjects());
  const totalEnergy = kineticEnergy + potentialEnergy;
  
  return {
    timestamp: timestamp || performance.now(),
    ke: kineticEnergy,
    pe: potentialEnergy,
    total: totalEnergy
  };
};

/**
 * Get all physics objects as a flat array, excluding debris and particles
 * @returns {Array} Array of all physics objects
 */
const getAllPhysicsObjects = () => {
  return [
    ...bh_list,
    ...planets,
    ...stars,
    ...gas_giants,
    ...asteroids,
    ...comets,
    ...neutron_stars,
    ...white_dwarfs
  ].filter(obj => obj && obj.alive !== false);
};

/**
 * Update energy history for all objects
 * Called during the physics update loop at specified intervals
 */
const updateEnergyHistory = () => {
  const allObjects = getAllPhysicsObjects();
  
  if (allObjects.length === 0) return;
  
  const timestamp = performance.now();
  
  for (const object of allObjects) {
    if (!object || !object.id) continue;
    
    // Initialize energy history for new objects
    if (!energyHistory.has(object.id)) {
      energyHistory.set(object.id, []);
    }
    
    const history = energyHistory.get(object.id);
    const energy = calculateObjectEnergy(object, timestamp);
    
    // Add new energy data point
    history.push(energy);
    
    // Maintain data size limit - keep only the most recent entries
    if (history.length > MAX_ENERGY_HISTORY_POINTS) {
      // Use slice to keep only the most recent MAX_ENERGY_HISTORY_POINTS entries
      // This is more efficient than shift() for large arrays
      const startIndex = history.length - MAX_ENERGY_HISTORY_POINTS;
      const trimmedHistory = history.slice(startIndex);
      energyHistory.set(object.id, trimmedHistory);
    }
  }
  
  // Debug logging (only every 100 frames to avoid spam)
  if (state && state.frame_count % 100 === 0 && allObjects.length > 0) {
    const firstObject = allObjects[0];
    const firstObjectHistory = energyHistory.get(firstObject.id);
    if (firstObjectHistory && firstObjectHistory.length > 0) {
      const latest = firstObjectHistory[firstObjectHistory.length - 1];
      console.log(`Energy data for object ${firstObject.id}:`, {
        ke: latest.ke.toExponential(2),
        pe: latest.pe.toExponential(2),
        total: latest.total.toExponential(2),
        dataPoints: firstObjectHistory.length
      });
    }
  }
  
  // Periodic memory management (every 1000 frames)
  if (state && state.frame_count % 1000 === 0) {
    const memoryStats = getEnergySystemMemoryStats();
    
    // Log memory usage every 1000 frames
    console.log('Energy system memory usage:', {
      objects: memoryStats.totalObjects,
      dataPoints: memoryStats.totalDataPoints,
      memoryMB: memoryStats.totalMemoryEstimateMB,
      avgPointsPerObject: memoryStats.averageDataPointsPerObject
    });
    
    // If memory usage is high (>50MB), trim all histories
    if (memoryStats.totalMemoryEstimateMB > 50) {
      console.log('High memory usage detected, trimming energy histories...');
      const trimmedCount = trimAllEnergyHistory();
      console.log(`Trimmed ${trimmedCount} energy histories to reduce memory usage`);
    }
  }
};

/**
 * Get energy history for a specific object
 * @param {string|number} objectId - ID of the object
 * @returns {Array} Copy of the energy history array for the object
 */
const getObjectEnergyHistory = (objectId) => {
  if (!objectId) return [];
  const history = energyHistory.get(objectId);
  return history ? [...history] : [];
};

/**
 * Clear energy history for a specific object
 * This function should be called when:
 * - An object's mass changes (energy calculations depend on mass)
 * - An object is removed from the simulation
 * - The simulation is reset
 * - Object transformation occurs (e.g., star to black hole)
 * 
 * @param {string|number} objectId - ID of the object
 */
const clearObjectEnergyHistory = (objectId) => {
  if (objectId) {
    energyHistory.delete(objectId);
  }
};

/**
 * Clear energy history for a specific object (alias for consistency)
 * @param {string|number} objectId - ID of the object
 */
const clearEnergyHistory = (objectId) => {
  clearObjectEnergyHistory(objectId);
};

/**
 * Clear all energy history
 */
const clearAllEnergyHistory = () => {
  energyHistory.clear();
};

/**
 * Get energy statistics for an object
 * @param {string|number} objectId - ID of the object
 * @returns {Object} Energy statistics object
 */
const getObjectEnergyStats = (objectId) => {
  const data = getObjectEnergyHistory(objectId);
  if (data.length === 0) {
    return {
      latest: null,
      average: { ke: 0, pe: 0, total: 0 },
      min: { ke: 0, pe: 0, total: 0 },
      max: { ke: 0, pe: 0, total: 0 },
      dataPoints: 0
    };
  }
  
  const latest = data[data.length - 1];
  const keValues = data.map(d => d.ke);
  const peValues = data.map(d => d.pe);
  const totalValues = data.map(d => d.total);
  
  return {
    latest,
    average: {
      ke: keValues.reduce((a, b) => a + b, 0) / data.length,
      pe: peValues.reduce((a, b) => a + b, 0) / data.length,
      total: totalValues.reduce((a, b) => a + b, 0) / data.length
    },
    min: {
      ke: Math.min(...keValues),
      pe: Math.min(...peValues),
      total: Math.min(...totalValues)
    },
    max: {
      ke: Math.max(...keValues),
      pe: Math.max(...peValues),
      total: Math.max(...totalValues)
    },
    dataPoints: data.length
  };
};

/**
 * Get energy system memory usage statistics
 * @returns {Object} Memory usage statistics
 */
const getEnergySystemMemoryStats = () => {
  const totalObjects = energyHistory.size;
  let totalDataPoints = 0;
  let totalMemoryEstimate = 0;
  
  // Estimate memory usage (rough calculation)
  // Each energy data point contains: timestamp (8 bytes) + ke (8 bytes) + pe (8 bytes) + total (8 bytes) = ~32 bytes
  const bytesPerDataPoint = 32;
  
  for (const [objectId, history] of energyHistory) {
    totalDataPoints += history.length;
  }
  
  totalMemoryEstimate = totalDataPoints * bytesPerDataPoint;
  
  return {
    totalObjects,
    totalDataPoints,
    totalMemoryEstimateBytes: totalMemoryEstimate,
    totalMemoryEstimateKB: Math.round(totalMemoryEstimate / 1024 * 100) / 100,
    totalMemoryEstimateMB: Math.round(totalMemoryEstimate / (1024 * 1024) * 100) / 100,
    averageDataPointsPerObject: totalObjects > 0 ? Math.round(totalDataPoints / totalObjects) : 0,
    maxDataPointsPerObject: MAX_ENERGY_HISTORY_POINTS
  };
};

/**
 * Update energy system configuration
 * @param {Object} config - Configuration object
 * @param {number} config.maxHistoryPoints - Maximum data points per object
 * @param {number} config.sampleRate - Energy sampling rate (frames)
 */
const updateEnergySystemConfig = (config) => {
  if (config.maxHistoryPoints !== undefined) {
    const oldMax = MAX_ENERGY_HISTORY_POINTS;
    // Note: We can't reassign const, so we'll use the new value in trimAllEnergyHistory
    console.log(`Energy history limit changed from ${oldMax} to ${config.maxHistoryPoints} points per object`);
    
    // Trim existing histories to new limit
    if (config.maxHistoryPoints < oldMax) {
      trimAllEnergyHistory(config.maxHistoryPoints);
    }
  }
  
  if (config.sampleRate !== undefined) {
    console.log(`Energy sampling rate changed from ${ENERGY_SAMPLE_RATE} to ${config.sampleRate} frames`);
  }
  
  return {
    maxHistoryPoints: config.maxHistoryPoints || MAX_ENERGY_HISTORY_POINTS,
    sampleRate: config.sampleRate || ENERGY_SAMPLE_RATE
  };
};

/**
 * Trim energy history for all objects to reduce memory usage
 * @param {number} maxPoints - Maximum data points to keep per object (defaults to MAX_ENERGY_HISTORY_POINTS)
 */
const trimAllEnergyHistory = (maxPoints = MAX_ENERGY_HISTORY_POINTS) => {
  let trimmedCount = 0;
  
  for (const [objectId, history] of energyHistory) {
    if (history.length > maxPoints) {
      const startIndex = history.length - maxPoints;
      const trimmedHistory = history.slice(startIndex);
      energyHistory.set(objectId, trimmedHistory);
      trimmedCount++;
    }
  }
  
  if (trimmedCount > 0) {
    console.log(`Trimmed energy history for ${trimmedCount} objects to ${maxPoints} data points each`);
  }
  
  return trimmedCount;
};
